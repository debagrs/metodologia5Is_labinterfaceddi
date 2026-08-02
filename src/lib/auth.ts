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
function cell(cell: any) {
  if (!cell || cell.type === 'null') return null;
  return cell.value ?? null;
}
async function ensureDatabase() {
  await pipeline([
    { sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL,
      partner_type TEXT,
      classroom_id TEXT,
      institution TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS workspace_snapshots (
      owner_id TEXT PRIMARY KEY NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS shared_classrooms (
      id TEXT PRIMARY KEY NOT NULL, advisor_id TEXT NOT NULL, name TEXT NOT NULL, code TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS classroom_invitations (
      token TEXT PRIMARY KEY NOT NULL, classroom_id TEXT NOT NULL, advisor_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL, accepted_by TEXT, accepted_at TEXT
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS classroom_members (
      classroom_id TEXT NOT NULL, user_id TEXT NOT NULL, joined_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (classroom_id, user_id)
    )` },
  ]);
}
function requireSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 24) throw new Error('SESSION_SECRET ausente ou muito curta.');
  return SESSION_SECRET;
}
function sign(ownerId: string) {
  return crypto.createHmac('sha256', requireSecret()).update(ownerId).digest('base64url');
}
function hashPassword(password: string, salt: string) {
  return crypto.pbkdf2Sync(password, salt, 210000, 32, 'sha256').toString('hex');
}
function normalizeEmail(email: string) { return email.trim().toLowerCase(); }
function publicUser(row: any[]) {
  return {
    id: String(cell(row[0])), name: String(cell(row[1])), email: String(cell(row[2])),
    role: String(cell(row[3])), partnerType: cell(row[4]) || undefined,
    classroomId: cell(row[5]) || undefined, institution: cell(row[6]) || undefined,
  };
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    await ensureDatabase();
    const action = String(req.body?.action || 'login');
    const email = normalizeEmail(String(req.body?.email || ''));
    const password = String(req.body?.password || '');
    const inviteToken = String(req.body?.inviteToken || '').trim();
    let invitedClassroom: any = null;
    if (inviteToken) {
      const [inviteResult] = await pipeline([{ sql: `SELECT i.classroom_id, i.expires_at, i.accepted_by, c.name, c.code
        FROM classroom_invitations i JOIN shared_classrooms c ON c.id = i.classroom_id
        WHERE i.token = ? LIMIT 1`, args: [arg(inviteToken)] }]);
      const inviteRow = inviteResult?.rows?.[0];
      if (!inviteRow) return res.status(404).json({ error: 'Convite não encontrado.' });
      if (cell(inviteRow[2])) return res.status(410).json({ error: 'Este convite já foi utilizado.' });
      if (new Date(String(cell(inviteRow[1]))).getTime() < Date.now()) return res.status(410).json({ error: 'Este convite expirou.' });
      invitedClassroom = { id: String(cell(inviteRow[0])), name: String(cell(inviteRow[3])), code: String(cell(inviteRow[4])), createdAt: new Date().toISOString(), studentIds: [] };
    }
    if (!email || !email.includes('@')) return res.status(400).json({ error: 'Informe um e-mail válido.' });
    if (password.length < 6) return res.status(400).json({ error: 'A senha precisa ter pelo menos 6 caracteres.' });

    if (action === 'register') {
      const name = String(req.body?.name || '').trim();
      const role = invitedClassroom ? 'student' : String(req.body?.role || 'individual');
      if (!name) return res.status(400).json({ error: 'Informe seu nome.' });
      const [existing] = await pipeline([{ sql: 'SELECT id FROM users WHERE email = ? LIMIT 1', args: [arg(email)] }]);
      if (existing?.rows?.length) return res.status(409).json({ error: 'Já existe uma conta com este e-mail.' });
      const id = crypto.randomUUID();
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword(password, salt);
      await pipeline([{ sql: `INSERT INTO users (id,name,email,password_hash,password_salt,role,partner_type,classroom_id,institution)
        VALUES (?,?,?,?,?,?,?,?,?)`, args: [arg(id),arg(name),arg(email),arg(passwordHash),arg(salt),arg(role),arg(req.body?.partnerType),arg(invitedClassroom?.id || req.body?.classroomId),arg(req.body?.institution)] }]);
      if (invitedClassroom) {
        await pipeline([
          { sql: `INSERT OR IGNORE INTO classroom_members (classroom_id, user_id, joined_at) VALUES (?, ?, datetime('now'))`, args: [arg(invitedClassroom.id), arg(id)] },
          { sql: `UPDATE classroom_invitations SET accepted_by = ?, accepted_at = datetime('now') WHERE token = ?`, args: [arg(id), arg(inviteToken)] },
        ]);
      }
      const user = { id, name, email, role, partnerType: req.body?.partnerType || undefined, classroomId: invitedClassroom?.id || req.body?.classroomId || undefined, institution: req.body?.institution || undefined, invitedClassroom: invitedClassroom || undefined };
      return res.status(201).json({ user, ownerId: id, token: `${id}.${sign(id)}` });
    }

    const [result] = await pipeline([{ sql: 'SELECT id,name,email,role,partner_type,classroom_id,institution,password_hash,password_salt FROM users WHERE email = ? LIMIT 1', args: [arg(email)] }]);
    const row = result?.rows?.[0];
    if (!row) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    const expected = String(cell(row[7]));
    const salt = String(cell(row[8]));
    const actual = hashPassword(password, salt);
    const ok = expected.length === actual.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
    if (!ok) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    const user = publicUser(row);
    if (invitedClassroom) {
      // Uma conta de professora/orientadora não pode virar aluna ao abrir um link
      // de convite. Isso evita que a própria professora apareça na lista da turma.
      if (user.role === 'advisor' || user.role === 'professor' || user.role === 'teacher') {
        return res.status(409).json({
          error: 'Este convite é destinado a estudantes. Saia da conta de professora e use outro e-mail para criar a conta da aluna.'
        });
      }

      await pipeline([
        { sql: `UPDATE users SET role = 'student', classroom_id = ? WHERE id = ?`, args: [arg(invitedClassroom.id), arg(user.id)] },
        { sql: `INSERT OR IGNORE INTO classroom_members (classroom_id, user_id, joined_at) VALUES (?, ?, datetime('now'))`, args: [arg(invitedClassroom.id), arg(user.id)] },
        { sql: `UPDATE classroom_invitations SET accepted_by = ?, accepted_at = datetime('now') WHERE token = ?`, args: [arg(user.id), arg(inviteToken)] },
      ]);
      user.role = 'student';
      user.classroomId = invitedClassroom.id;
      user.invitedClassroom = invitedClassroom;
    }
    return res.status(200).json({ user, ownerId: user.id, token: `${user.id}.${sign(user.id)}` });
  } catch (error: any) {
    console.error('[5I API /api/auth]', error);
    return res.status(500).json({ error: error?.message || 'Falha na autenticação.' });
  }
}
