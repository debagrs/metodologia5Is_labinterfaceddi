// @ts-nocheck
import crypto from 'node:crypto';

const DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

function httpUrl() {
  if (!DATABASE_URL) throw new Error('TURSO_DATABASE_URL não configurada.');
  return DATABASE_URL.replace(/^libsql:|^turso:/, 'https:').replace(/\/$/, '');
}
function arg(value: any) {
  if (value === null || value === undefined) return { type: 'null' };
  return { type: 'text', value: String(value) };
}
async function pipeline(statements: any[]) {
  if (!AUTH_TOKEN) throw new Error('TURSO_AUTH_TOKEN não configurado.');
  const response = await fetch(`${httpUrl()}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AUTH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [...statements.map((stmt) => ({ type: 'execute', stmt })), { type: 'close' }] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Falha no Turso (${response.status}).`);
  const results = data?.results?.slice(0, statements.length) || [];
  for (const result of results) if (result?.type === 'error') throw new Error(result?.error?.message || 'Erro SQL no Turso.');
  return results.map((item: any) => item?.response?.result || {});
}
function cell(value: any) { return !value || value.type === 'null' ? null : value.value; }
function validateSessionToken(rawHeader: string | undefined) {
  if (!rawHeader?.startsWith('Bearer ')) return null;
  const token = rawHeader.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0 || !SESSION_SECRET) return null;
  const ownerId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(ownerId).digest('base64url');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? ownerId : null;
}
async function ensureDatabase() {
  await pipeline([
    { sql: `CREATE TABLE IF NOT EXISTS shared_classrooms (
      id TEXT PRIMARY KEY NOT NULL, advisor_id TEXT NOT NULL, name TEXT NOT NULL,
      code TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS classroom_invitations (
      token TEXT PRIMARY KEY NOT NULL, classroom_id TEXT NOT NULL, advisor_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL,
      accepted_by TEXT, accepted_at TEXT
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS classroom_members (
      classroom_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (classroom_id, user_id)
    )` },
  ]);
}
function baseUrl(req: any) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    await ensureDatabase();

    if (req.method === 'GET' && req.query?.token) {
      const token = String(req.query.token);
      const [result] = await pipeline([{ sql: `SELECT i.token, i.expires_at, i.accepted_by, c.id, c.name, c.code
        FROM classroom_invitations i JOIN shared_classrooms c ON c.id = i.classroom_id
        WHERE i.token = ? LIMIT 1`, args: [arg(token)] }]);
      const row = result?.rows?.[0];
      if (!row) return res.status(404).json({ error: 'Convite não encontrado.' });
      if (cell(row[2])) return res.status(410).json({ error: 'Este convite já foi utilizado.' });
      if (new Date(String(cell(row[1]))).getTime() < Date.now()) return res.status(410).json({ error: 'Este convite expirou.' });
      return res.status(200).json({
        token: cell(row[0]), classroom: { id: cell(row[3]), name: cell(row[4]), code: cell(row[5]) }
      });
    }

    const advisorId = validateSessionToken(req.headers.authorization);
    if (!advisorId) return res.status(401).json({ error: 'Sessão inválida.' });

    if (req.method === 'POST') {
      const classroom = req.body?.classroom;
      if (!classroom?.id || !classroom?.name || !classroom?.code) return res.status(400).json({ error: 'Turma inválida.' });
      const token = crypto.randomBytes(24).toString('base64url');
      await pipeline([
        { sql: `INSERT INTO shared_classrooms (id, advisor_id, name, code, created_at)
          VALUES (?, ?, ?, ?, datetime('now'))
          ON CONFLICT(id) DO UPDATE SET advisor_id=excluded.advisor_id, name=excluded.name, code=excluded.code`,
          args: [arg(classroom.id), arg(advisorId), arg(classroom.name), arg(classroom.code)] },
        { sql: `INSERT INTO classroom_invitations (token, classroom_id, advisor_id, expires_at)
          VALUES (?, ?, ?, datetime('now', '+30 days'))`, args: [arg(token), arg(classroom.id), arg(advisorId)] },
      ]);
      const url = `${baseUrl(req)}/?invite=${encodeURIComponent(token)}`;
      return res.status(201).json({ token, url, expiresInDays: 30 });
    }

    if (req.method === 'GET' && req.query?.classroomId) {
      const classroomId = String(req.query.classroomId);

      // Confirma que a turma realmente pertence à professora logada.
      const [classResult] = await pipeline([
        { sql: 'SELECT id FROM shared_classrooms WHERE id = ? AND advisor_id = ? LIMIT 1', args: [arg(classroomId), arg(advisorId)] },
      ]);
      if (!classResult?.rows?.length) {
        return res.status(200).json({ members: [], repaired: 0 });
      }

      // Reparação automática: versões anteriores permitiam que a própria conta
      // da professora aceitasse um convite e fosse convertida em estudante.
      // Removemos esse vínculo incorreto e restauramos o papel da orientadora.
      await pipeline([
        { sql: `DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?`, args: [arg(classroomId), arg(advisorId)] },
        { sql: `UPDATE users SET role = 'advisor', classroom_id = NULL WHERE id = ?`, args: [arg(advisorId)] },
      ]);

      // Recupera alunos por DUAS vias:
      // 1) vínculo normal em classroom_members;
      // 2) fallback pelo classroom_id salvo na conta do usuário.
      // Esse fallback corrige contas que aceitaram o convite, mas ficaram sem a linha de vínculo.
      const [membersResult] = await pipeline([
        { sql: `SELECT DISTINCT
            u.id,
            u.name,
            u.email,
            COALESCE(m.joined_at, u.created_at) AS joined_at,
            w.payload
          FROM users u
          LEFT JOIN classroom_members m
            ON m.user_id = u.id AND m.classroom_id = ?
          LEFT JOIN workspace_snapshots w
            ON w.owner_id = u.id
          WHERE u.role = 'student'
            AND u.id <> ?
            AND (m.classroom_id = ? OR u.classroom_id = ?)
          ORDER BY joined_at DESC`,
          args: [arg(classroomId), arg(advisorId), arg(classroomId), arg(classroomId)] },
      ]);

      const rows = membersResult?.rows || [];

      // Repara automaticamente os vínculos antigos que estiverem faltando.
      if (rows.length > 0) {
        await pipeline(rows.map((row: any[]) => ({
          sql: `INSERT OR IGNORE INTO classroom_members (classroom_id, user_id, joined_at)
            VALUES (?, ?, datetime('now'))`,
          args: [arg(classroomId), arg(cell(row[0]))],
        })));
      }

      const members = rows.map((row: any[]) => {
        let snapshot = null;
        const rawPayload = cell(row[4]);
        if (typeof rawPayload === 'string') {
          try { snapshot = JSON.parse(rawPayload); } catch { snapshot = null; }
        }
        return {
          id: String(cell(row[0])),
          name: String(cell(row[1])),
          email: String(cell(row[2])),
          joinedAt: String(cell(row[3])),
          snapshot,
        };
      });

      return res.status(200).json({ members, repaired: rows.length });
    }

    if (req.method === 'PUT') {
      const action = String(req.body?.action || '');
      if (action !== 'saveMemberWorkspace') {
        return res.status(400).json({ error: 'Ação de atualização inválida.' });
      }

      const classroomId = String(req.body?.classroomId || '');
      const userId = String(req.body?.userId || '');
      const project = req.body?.project ?? null;
      const nodes = Array.isArray(req.body?.nodes) ? req.body.nodes : [];
      if (!classroomId || !userId) {
        return res.status(400).json({ error: 'Aluno ou turma não informado.' });
      }

      const [permissionResult, workspaceResult, userResult] = await pipeline([
        { sql: `SELECT m.user_id FROM classroom_members m
          JOIN shared_classrooms c ON c.id = m.classroom_id
          WHERE m.classroom_id = ? AND m.user_id = ? AND c.advisor_id = ? LIMIT 1`,
          args: [arg(classroomId), arg(userId), arg(advisorId)] },
        { sql: 'SELECT payload FROM workspace_snapshots WHERE owner_id = ? LIMIT 1', args: [arg(userId)] },
        { sql: 'SELECT name FROM users WHERE id = ? LIMIT 1', args: [arg(userId)] },
      ]);

      if (!permissionResult?.rows?.length) {
        return res.status(403).json({ error: 'Você não pode editar o projeto deste aluno.' });
      }

      let snapshot: any = {};
      const raw = workspaceResult?.rows?.[0]?.[0] ? cell(workspaceResult.rows[0][0]) : null;
      if (typeof raw === 'string') {
        try { snapshot = JSON.parse(raw); } catch { snapshot = {}; }
      }

      const studentName = String(cell(userResult?.rows?.[0]?.[0]) || 'Estudante');
      const existingStudents = Array.isArray(snapshot.students) ? snapshot.students : [];
      const normalizedName = studentName.trim().toLowerCase();
      let found = false;
      const nextStudents = existingStudents.map((student: any) => {
        const sameClass = student?.classroomId === classroomId;
        const sameName = String(student?.name || '').trim().toLowerCase() === normalizedName;
        if (sameClass && sameName) {
          found = true;
          return { ...student, project: project || undefined, nodes };
        }
        return student;
      });
      if (!found) {
        nextStudents.push({
          id: `student-${userId}`,
          name: studentName,
          classroomId,
          project: project || undefined,
          nodes,
        });
      }

      const nextSnapshot = {
        ...snapshot,
        students: nextStudents,
        soloProject: project,
        soloNodes: nodes,
      };
      const serialized = JSON.stringify(nextSnapshot);
      if (Buffer.byteLength(serialized, 'utf8') > 1_500_000) {
        return res.status(413).json({ error: 'O projeto do aluno ultrapassou o limite de 1,5 MB.' });
      }

      await pipeline([{
        sql: `INSERT INTO workspace_snapshots (owner_id, payload, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(owner_id) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')`,
        args: [arg(userId), arg(serialized)],
      }]);
      return res.status(200).json({ ok: true, snapshot: nextSnapshot });
    }


    if (req.method === 'GET' && req.query?.admin) {
      const [membersResult, invitationsResult] = await pipeline([
        { sql: `SELECT u.id, u.name, u.email, m.classroom_id, c.name, m.joined_at
          FROM classroom_members m
          JOIN users u ON u.id = m.user_id
          JOIN shared_classrooms c ON c.id = m.classroom_id
          WHERE c.advisor_id = ?
          ORDER BY c.name, u.name`, args: [arg(advisorId)] },
        { sql: `SELECT i.token, i.classroom_id, c.name, i.created_at, i.expires_at, i.accepted_by
          FROM classroom_invitations i
          JOIN shared_classrooms c ON c.id = i.classroom_id
          WHERE i.advisor_id = ?
          ORDER BY i.created_at DESC`, args: [arg(advisorId)] },
      ]);

      const members = (membersResult?.rows || []).map((row: any[]) => ({
        id: String(cell(row[0])),
        name: String(cell(row[1])),
        email: String(cell(row[2])),
        classroomId: String(cell(row[3])),
        classroomName: String(cell(row[4])),
        joinedAt: String(cell(row[5])),
      }));
      const invitations = (invitationsResult?.rows || []).map((row: any[]) => ({
        token: String(cell(row[0])),
        classroomId: String(cell(row[1])),
        classroomName: String(cell(row[2])),
        createdAt: String(cell(row[3])),
        expiresAt: String(cell(row[4])),
        acceptedBy: cell(row[5]),
      }));
      return res.status(200).json({ members, invitations });
    }

    if (req.method === 'DELETE') {
      const action = String(req.body?.action || '');

      if (action === 'deleteClassroom') {
        const classroomId = String(req.body?.classroomId || '');
        if (!classroomId) return res.status(400).json({ error: 'Turma não informada.' });
        const [ownerResult] = await pipeline([
          { sql: 'SELECT id FROM shared_classrooms WHERE id = ? AND advisor_id = ? LIMIT 1', args: [arg(classroomId), arg(advisorId)] },
        ]);
        if (!ownerResult?.rows?.length) return res.status(404).json({ error: 'Turma compartilhada não encontrada.' });
        await pipeline([
          { sql: 'DELETE FROM classroom_members WHERE classroom_id = ?', args: [arg(classroomId)] },
          { sql: 'DELETE FROM classroom_invitations WHERE classroom_id = ? AND advisor_id = ?', args: [arg(classroomId), arg(advisorId)] },
          { sql: 'DELETE FROM shared_classrooms WHERE id = ? AND advisor_id = ?', args: [arg(classroomId), arg(advisorId)] },
        ]);
        return res.status(200).json({ ok: true });
      }

      if (action === 'removeMember') {
        const classroomId = String(req.body?.classroomId || '');
        const userId = String(req.body?.userId || '');
        if (!classroomId || !userId) return res.status(400).json({ error: 'Participante ou turma não informado.' });
        const [ownerResult] = await pipeline([
          { sql: 'SELECT id FROM shared_classrooms WHERE id = ? AND advisor_id = ? LIMIT 1', args: [arg(classroomId), arg(advisorId)] },
        ]);
        if (!ownerResult?.rows?.length) return res.status(403).json({ error: 'Você não administra esta turma.' });
        await pipeline([
          { sql: 'DELETE FROM classroom_members WHERE classroom_id = ? AND user_id = ?', args: [arg(classroomId), arg(userId)] },
        ]);
        return res.status(200).json({ ok: true });
      }

      if (action === 'cancelInvitation') {
        const token = String(req.body?.token || '');
        if (!token) return res.status(400).json({ error: 'Convite não informado.' });
        await pipeline([
          { sql: 'DELETE FROM classroom_invitations WHERE token = ? AND advisor_id = ? AND accepted_by IS NULL', args: [arg(token), arg(advisorId)] },
        ]);
        return res.status(200).json({ ok: true });
      }

      return res.status(400).json({ error: 'Ação administrativa inválida.' });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[5I API /api/invitations]', error);
    return res.status(500).json({ error: error?.message || 'Falha nos convites.' });
  }
}
