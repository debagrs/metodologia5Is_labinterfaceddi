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
function readBody(req: any) {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
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
async function ensureDatabase() {
  await pipeline([
    { sql: `CREATE TABLE IF NOT EXISTS advisor_resource_settings (
      advisor_id TEXT PRIMARY KEY NOT NULL,
      show_interface_lessons INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
  ]);
}
async function getUser(userId: string) {
  const [result] = await pipeline([{
    sql: `SELECT id, role, classroom_id FROM users WHERE id = ? LIMIT 1`,
    args: [arg(userId)],
  }]);
  const row = result?.rows?.[0];
  return row ? { id: String(cell(row[0])), role: String(cell(row[1]) || '').toLowerCase(), classroomId: cell(row[2]) ? String(cell(row[2])) : null } : null;
}
function isAdvisor(role: string) {
  return ['advisor', 'teacher', 'professor'].includes(String(role || '').toLowerCase());
}
async function resolveAdvisorId(user: any) {
  if (isAdvisor(user.role)) return user.id;
  if (!user.classroomId) return null;
  const [result] = await pipeline([{
    sql: `SELECT advisor_id FROM shared_classrooms WHERE id = ? LIMIT 1`,
    args: [arg(user.classroomId)],
  }]);
  const row = result?.rows?.[0];
  return row ? String(cell(row[0]) || '') : null;
}
async function readSetting(advisorId: string | null) {
  if (!advisorId) return false;
  const [result] = await pipeline([{
    sql: `SELECT show_interface_lessons FROM advisor_resource_settings WHERE advisor_id = ? LIMIT 1`,
    args: [arg(advisorId)],
  }]);
  return Number(cell(result?.rows?.[0]?.[0]) || 0) === 1;
}

export default async function handler(req: any, res: any) {
  try {
    if (!['GET', 'POST'].includes(req.method)) return res.status(405).json({ error: 'Método não permitido.' });
    const userId = validateSessionToken(req.headers.authorization);
    if (!userId) return res.status(401).json({ error: 'Sessão inválida.' });
    await ensureDatabase();
    const user = await getUser(userId);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    if (req.method === 'POST') {
      if (!isAdvisor(user.role)) return res.status(403).json({ error: 'Apenas professores podem alterar os materiais das turmas.' });
      const body = readBody(req);
      const enabled = Boolean(body?.showInterfaceLessons);
      await pipeline([{
        sql: `INSERT INTO advisor_resource_settings (advisor_id, show_interface_lessons, updated_at)
          VALUES (?, ?, datetime('now'))
          ON CONFLICT(advisor_id) DO UPDATE SET
            show_interface_lessons = excluded.show_interface_lessons,
            updated_at = datetime('now')`,
        args: [arg(user.id), arg(enabled ? 1 : 0)],
      }]);
      return res.status(200).json({ manualLab: true, showInterfaceLessons: enabled });
    }

    const advisorId = await resolveAdvisorId(user);
    const showInterfaceLessons = await readSetting(advisorId);
    return res.status(200).json({ manualLab: true, showInterfaceLessons });
  } catch (error: any) {
    console.error('[5I API /api/course-resources]', error);
    return res.status(500).json({ error: error?.message || 'Não foi possível carregar os materiais da disciplina.' });
  }
}
