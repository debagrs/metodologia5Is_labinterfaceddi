// @ts-nocheck
import crypto from 'node:crypto';

const DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
const RECIPIENT_SEPARATOR = '___5IS_RECIPIENT___';

function httpUrl() {
  if (!DATABASE_URL) throw new Error('TURSO_DATABASE_URL não configurada.');
  return DATABASE_URL.replace(/^libsql:|^turso:/, 'https:').replace(/\/$/, '');
}
function arg(value: any) {
  if (value === null || value === undefined) return { type: 'null' };
  if (typeof value === 'number') return { type: Number.isInteger(value) ? 'integer' : 'float', value: String(value) };
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
function cell(value: any) {
  if (!value || value.type === 'null') return null;
  if (value.type === 'integer' || value.type === 'float') return Number(value.value);
  return value.value ?? null;
}
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
function readBody(req: any) {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}
function normalizedIds(value: any) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || '').trim()).filter(Boolean))].slice(0, 500);
}
async function ensureDatabase() {
  await pipeline([
    { sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role TEXT NOT NULL,
      partner_type TEXT, classroom_id TEXT, institution TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS shared_classrooms (
      id TEXT PRIMARY KEY NOT NULL, advisor_id TEXT NOT NULL, name TEXT NOT NULL,
      code TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS classroom_members (
      classroom_id TEXT NOT NULL, user_id TEXT NOT NULL,
      joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (classroom_id, user_id)
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS agenda_events (
      id TEXT PRIMARY KEY NOT NULL,
      creator_id TEXT NOT NULL,
      classroom_id TEXT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_at TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'entrega',
      project_id TEXT,
      project_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_agenda_due_at ON agenda_events(due_at)` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_agenda_classroom ON agenda_events(classroom_id)` },
    { sql: `CREATE TABLE IF NOT EXISTS agenda_completions (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (event_id, user_id)
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS agenda_event_recipients (
      event_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (event_id, user_id)
    )` },
    { sql: `CREATE INDEX IF NOT EXISTS idx_agenda_recipient_user ON agenda_event_recipients(user_id)` },
  ]);
}
async function getUser(userId: string) {
  const [result] = await pipeline([{
    sql: `SELECT id, name, role, classroom_id FROM users WHERE id = ? LIMIT 1`,
    args: [arg(userId)],
  }]);
  const row = result?.rows?.[0];
  return row ? {
    id: String(cell(row[0])),
    name: String(cell(row[1]) || ''),
    role: String(cell(row[2]) || '').toLowerCase(),
    classroomId: cell(row[3]) ? String(cell(row[3])) : null,
  } : null;
}
function isAdvisor(role: string) {
  return ['advisor', 'teacher', 'professor'].includes(String(role || '').toLowerCase());
}
async function getAccessibleClassrooms(user: any) {
  if (isAdvisor(user.role)) {
    const [result] = await pipeline([{
      sql: `SELECT id, name, code FROM shared_classrooms WHERE advisor_id = ? ORDER BY name`,
      args: [arg(user.id)],
    }]);
    return (result?.rows || []).map((row: any[]) => ({ id: String(cell(row[0])), name: String(cell(row[1])), code: String(cell(row[2])) }));
  }
  const [result] = await pipeline([{
    sql: `SELECT DISTINCT c.id, c.name, c.code
      FROM shared_classrooms c
      LEFT JOIN classroom_members m ON m.classroom_id = c.id AND m.user_id = ?
      WHERE m.user_id IS NOT NULL OR c.id = ?
      ORDER BY c.name`,
    args: [arg(user.id), arg(user.classroomId)],
  }]);
  return (result?.rows || []).map((row: any[]) => ({ id: String(cell(row[0])), name: String(cell(row[1])), code: String(cell(row[2])) }));
}
async function getAdvisorStudents(advisorId: string) {
  const [result] = await pipeline([{
    sql: `SELECT user_id, user_name, email, classroom_id, classroom_name FROM (
      SELECT u.id AS user_id, u.name AS user_name, u.email AS email,
        c.id AS classroom_id, c.name AS classroom_name
      FROM shared_classrooms c
      JOIN classroom_members m ON m.classroom_id = c.id
      JOIN users u ON u.id = m.user_id
      WHERE c.advisor_id = ? AND u.id <> ?
      UNION
      SELECT u.id AS user_id, u.name AS user_name, u.email AS email,
        c.id AS classroom_id, c.name AS classroom_name
      FROM shared_classrooms c
      JOIN users u ON u.classroom_id = c.id
      WHERE c.advisor_id = ? AND u.id <> ?
    ) ORDER BY classroom_name, user_name`,
    args: [arg(advisorId), arg(advisorId), arg(advisorId), arg(advisorId)],
  }]);
  return (result?.rows || []).map((row: any[]) => ({
    id: String(cell(row[0])),
    name: String(cell(row[1]) || 'Estudante'),
    email: String(cell(row[2]) || ''),
    classroomId: String(cell(row[3]) || ''),
    classroomName: String(cell(row[4]) || 'Turma'),
  }));
}
async function canSeeEvent(user: any, eventId: string) {
  const classrooms = await getAccessibleClassrooms(user);
  const ids = classrooms.map((item: any) => item.id);
  const placeholders = ids.map(() => '?').join(', ');
  const classroomClause = ids.length ? ` OR e.classroom_id IN (${placeholders})` : '';
  const [result] = await pipeline([{
    sql: `SELECT e.id FROM agenda_events e
      WHERE e.id = ? AND (
        e.creator_id = ?
        OR EXISTS (SELECT 1 FROM agenda_event_recipients r WHERE r.event_id = e.id AND r.user_id = ?)
        ${classroomClause}
      ) LIMIT 1`,
    args: [arg(eventId), arg(user.id), arg(user.id), ...ids.map(arg)],
  }]);
  return Boolean(result?.rows?.length);
}
function splitRecipients(value: any) {
  const raw = cell(value);
  if (!raw) return [];
  return String(raw).split(RECIPIENT_SEPARATOR).map((item) => item.trim()).filter(Boolean);
}
function mapEvent(row: any[], requesterId: string) {
  return {
    id: String(cell(row[0])),
    creatorId: String(cell(row[1])),
    creatorName: String(cell(row[2]) || ''),
    classroomId: cell(row[3]) ? String(cell(row[3])) : null,
    classroomName: cell(row[4]) ? String(cell(row[4])) : null,
    title: String(cell(row[5]) || ''),
    description: String(cell(row[6]) || ''),
    dueAt: String(cell(row[7]) || ''),
    eventType: String(cell(row[8]) || 'entrega'),
    projectId: cell(row[9]) ? String(cell(row[9])) : null,
    projectName: cell(row[10]) ? String(cell(row[10])) : null,
    createdAt: String(cell(row[11]) || ''),
    updatedAt: String(cell(row[12]) || ''),
    completedAt: cell(row[13]) ? String(cell(row[13])) : null,
    completed: Boolean(cell(row[13])),
    recipientUserIds: splitRecipients(row[14]),
    recipientNames: splitRecipients(row[15]),
    canEdit: String(cell(row[1])) === requesterId,
  };
}
async function validateTargets(user: any, classrooms: any[], classroomIdRaw: any, recipientIdsRaw: any) {
  let classroomId = classroomIdRaw ? String(classroomIdRaw).trim() : null;
  const recipientUserIds = normalizedIds(recipientIdsRaw);

  if (!isAdvisor(user.role)) return { classroomId: null, recipientUserIds: [] };
  if (classroomId && recipientUserIds.length) {
    const error: any = new Error('Escolha uma turma inteira ou alunos específicos, não os dois ao mesmo tempo.');
    error.statusCode = 400;
    throw error;
  }
  if (classroomId && !classrooms.some((item: any) => item.id === classroomId)) {
    const error: any = new Error('Esta turma não pertence à sua conta.');
    error.statusCode = 403;
    throw error;
  }
  if (recipientUserIds.length) {
    const students = await getAdvisorStudents(user.id);
    const allowed = new Set(students.map((student: any) => student.id));
    const invalid = recipientUserIds.filter((id) => !allowed.has(id));
    if (invalid.length) {
      const error: any = new Error('Um ou mais alunos selecionados não pertencem às suas turmas. Atualize a agenda e tente novamente.');
      error.statusCode = 403;
      throw error;
    }
  }
  return { classroomId: classroomId || null, recipientUserIds };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const requesterId = validateSessionToken(req.headers.authorization);
    if (!requesterId) return res.status(401).json({ error: 'Sessão inválida ou ausente.' });
    await ensureDatabase();
    const user = await getUser(requesterId);
    if (!user) return res.status(404).json({ error: 'Conta não encontrada.' });
    const classrooms = await getAccessibleClassrooms(user);

    if (req.method === 'GET') {
      const ids = classrooms.map((item: any) => item.id);
      const placeholders = ids.map(() => '?').join(', ');
      const classroomClause = ids.length ? ` OR e.classroom_id IN (${placeholders})` : '';
      const [result] = await pipeline([{
        sql: `SELECT e.id, e.creator_id, u.name, e.classroom_id, c.name,
          e.title, e.description, e.due_at, e.event_type, e.project_id, e.project_name,
          e.created_at, e.updated_at, ac.completed_at,
          (SELECT GROUP_CONCAT(r.user_id, '${RECIPIENT_SEPARATOR}')
            FROM agenda_event_recipients r WHERE r.event_id = e.id) AS recipient_ids,
          (SELECT GROUP_CONCAT(ru.name, '${RECIPIENT_SEPARATOR}')
            FROM agenda_event_recipients r2
            JOIN users ru ON ru.id = r2.user_id
            WHERE r2.event_id = e.id) AS recipient_names
          FROM agenda_events e
          JOIN users u ON u.id = e.creator_id
          LEFT JOIN shared_classrooms c ON c.id = e.classroom_id
          LEFT JOIN agenda_completions ac ON ac.event_id = e.id AND ac.user_id = ?
          WHERE e.creator_id = ?
            OR EXISTS (SELECT 1 FROM agenda_event_recipients myr WHERE myr.event_id = e.id AND myr.user_id = ?)
            ${classroomClause}
          ORDER BY e.due_at ASC`,
        args: [arg(requesterId), arg(requesterId), arg(requesterId), ...ids.map(arg)],
      }]);
      const students = isAdvisor(user.role) ? await getAdvisorStudents(user.id) : [];
      return res.status(200).json({
        events: (result?.rows || []).map((row: any[]) => mapEvent(row, requesterId)),
        classrooms,
        students,
        user: { id: user.id, role: user.role, classroomId: user.classroomId },
      });
    }

    const body = readBody(req);

    if (req.method === 'POST' && body?.action === 'toggleCompletion') {
      const eventId = String(body?.eventId || '').trim();
      const completed = Boolean(body?.completed);
      if (!eventId) return res.status(400).json({ error: 'Evento não informado.' });
      if (!(await canSeeEvent(user, eventId))) return res.status(403).json({ error: 'Você não tem acesso a esta entrega.' });
      if (completed) {
        await pipeline([{
          sql: `INSERT INTO agenda_completions (event_id, user_id, completed_at)
            VALUES (?, ?, datetime('now'))
            ON CONFLICT(event_id, user_id) DO UPDATE SET completed_at = datetime('now')`,
          args: [arg(eventId), arg(requesterId)],
        }]);
      } else {
        await pipeline([{ sql: `DELETE FROM agenda_completions WHERE event_id = ? AND user_id = ?`, args: [arg(eventId), arg(requesterId)] }]);
      }
      return res.status(200).json({ ok: true, completed });
    }

    if (req.method === 'POST') {
      const title = String(body?.title || '').trim();
      const description = String(body?.description || '').trim().slice(0, 4000);
      const dueAt = String(body?.dueAt || '').trim();
      const eventType = ['entrega', 'tarefa', 'lembrete', 'encontro'].includes(String(body?.eventType)) ? String(body.eventType) : 'entrega';
      const projectId = body?.projectId ? String(body.projectId).trim() : null;
      const projectName = body?.projectName ? String(body.projectName).trim().slice(0, 200) : null;
      if (!title) return res.status(400).json({ error: 'Dê um título à entrega ou tarefa.' });
      if (!dueAt || Number.isNaN(new Date(dueAt).getTime())) return res.status(400).json({ error: 'Informe uma data válida.' });

      const targets = await validateTargets(user, classrooms, body?.classroomId, body?.recipientUserIds);
      const id = `agenda-${crypto.randomUUID()}`;
      const statements: any[] = [{
        sql: `INSERT INTO agenda_events
          (id, creator_id, classroom_id, title, description, due_at, event_type, project_id, project_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        args: [arg(id), arg(requesterId), arg(targets.classroomId), arg(title.slice(0, 240)), arg(description), arg(dueAt), arg(eventType), arg(projectId), arg(projectName)],
      }];
      targets.recipientUserIds.forEach((studentId: string) => statements.push({
        sql: `INSERT OR IGNORE INTO agenda_event_recipients (event_id, user_id, created_at) VALUES (?, ?, datetime('now'))`,
        args: [arg(id), arg(studentId)],
      }));
      await pipeline(statements);
      return res.status(201).json({ ok: true, id, saved: true, recipientCount: targets.recipientUserIds.length });
    }

    if (req.method === 'PATCH') {
      const id = String(body?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Evento não informado.' });
      const [ownerResult] = await pipeline([{ sql: `SELECT creator_id FROM agenda_events WHERE id = ? LIMIT 1`, args: [arg(id)] }]);
      if (!ownerResult?.rows?.length) return res.status(404).json({ error: 'Evento não encontrado.' });
      if (String(cell(ownerResult.rows[0][0])) !== requesterId) return res.status(403).json({ error: 'Somente quem criou pode editar esta entrega.' });

      const title = String(body?.title || '').trim();
      const description = String(body?.description || '').trim().slice(0, 4000);
      const dueAt = String(body?.dueAt || '').trim();
      const eventType = ['entrega', 'tarefa', 'lembrete', 'encontro'].includes(String(body?.eventType)) ? String(body.eventType) : 'entrega';
      if (!title || !dueAt || Number.isNaN(new Date(dueAt).getTime())) return res.status(400).json({ error: 'Título e data são obrigatórios.' });

      const targets = await validateTargets(user, classrooms, body?.classroomId, body?.recipientUserIds);
      const statements: any[] = [
        {
          sql: `UPDATE agenda_events SET classroom_id = ?, title = ?, description = ?, due_at = ?, event_type = ?, updated_at = datetime('now') WHERE id = ?`,
          args: [arg(targets.classroomId), arg(title.slice(0, 240)), arg(description), arg(dueAt), arg(eventType), arg(id)],
        },
        { sql: `DELETE FROM agenda_event_recipients WHERE event_id = ?`, args: [arg(id)] },
      ];
      targets.recipientUserIds.forEach((studentId: string) => statements.push({
        sql: `INSERT OR IGNORE INTO agenda_event_recipients (event_id, user_id, created_at) VALUES (?, ?, datetime('now'))`,
        args: [arg(id), arg(studentId)],
      }));
      await pipeline(statements);
      return res.status(200).json({ ok: true, saved: true, recipientCount: targets.recipientUserIds.length });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Evento não informado.' });
      const [ownerResult] = await pipeline([{ sql: `SELECT creator_id FROM agenda_events WHERE id = ? LIMIT 1`, args: [arg(id)] }]);
      if (!ownerResult?.rows?.length) return res.status(404).json({ error: 'Evento não encontrado.' });
      if (String(cell(ownerResult.rows[0][0])) !== requesterId) return res.status(403).json({ error: 'Somente quem criou pode excluir esta entrega.' });
      await pipeline([
        { sql: `DELETE FROM agenda_completions WHERE event_id = ?`, args: [arg(id)] },
        { sql: `DELETE FROM agenda_event_recipients WHERE event_id = ?`, args: [arg(id)] },
        { sql: `DELETE FROM agenda_events WHERE id = ?`, args: [arg(id)] },
      ]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[5I API /api/agenda]', error);
    const status = Number(error?.statusCode) || 500;
    return res.status(status).json({ error: error?.message || 'Erro ao acessar a agenda.' });
  }
}
