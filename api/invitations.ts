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
      const [classResult, membersResult] = await pipeline([
        { sql: 'SELECT id FROM shared_classrooms WHERE id = ? AND advisor_id = ? LIMIT 1', args: [arg(classroomId), arg(advisorId)] },
        { sql: `SELECT u.id, u.name, u.email, m.joined_at
          FROM classroom_members m JOIN users u ON u.id = m.user_id
          WHERE m.classroom_id = ? ORDER BY m.joined_at DESC`, args: [arg(classroomId)] },
      ]);
      if (!classResult?.rows?.length) return res.status(200).json({ members: [] });
      const members = (membersResult?.rows || []).map((row: any[]) => ({
        id: String(cell(row[0])), name: String(cell(row[1])), email: String(cell(row[2])), joinedAt: String(cell(row[3]))
      }));
      return res.status(200).json({ members });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[5I API /api/invitations]', error);
    return res.status(500).json({ error: error?.message || 'Falha nos convites.' });
  }
}
