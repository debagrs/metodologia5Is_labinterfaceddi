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
  if (value === null) return { type: 'null' };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { type: 'integer', value: String(value) }
      : { type: 'float', value: String(value) };
  }
  return { type: 'text', value: String(value) };
}

async function pipeline(statements: any[]) {
  if (!AUTH_TOKEN) throw new Error('TURSO_AUTH_TOKEN não configurado.');
  const response = await fetch(`${httpUrl()}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AUTH_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        ...statements.map((stmt) => ({ type: 'execute', stmt })),
        { type: 'close' },
      ],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Falha no Turso (${response.status}).`);

  const results = data?.results?.slice(0, statements.length) || [];
  for (const result of results) {
    if (result?.type === 'error') throw new Error(result?.error?.message || 'Erro SQL no Turso.');
  }
  return results.map((item: any) => item?.response?.result || {});
}

function cellValue(cell: any) {
  if (!cell || cell.type === 'null') return null;
  if (cell.type === 'integer' || cell.type === 'float') return Number(cell.value);
  return cell.value ?? null;
}

async function ensureDatabase() {
  await pipeline([
    {
      sql: `CREATE TABLE IF NOT EXISTS workspace_snapshots (
        owner_id TEXT PRIMARY KEY NOT NULL,
        payload TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role TEXT NOT NULL,
        partner_type TEXT, classroom_id TEXT, institution TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS shared_classrooms (
        id TEXT PRIMARY KEY NOT NULL, advisor_id TEXT NOT NULL, name TEXT NOT NULL,
        code TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS classroom_members (
        classroom_id TEXT NOT NULL, user_id TEXT NOT NULL,
        joined_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (classroom_id, user_id)
      )`,
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS classroom_invitations (
        token TEXT PRIMARY KEY NOT NULL, classroom_id TEXT NOT NULL, advisor_id TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')), expires_at TEXT NOT NULL,
        accepted_by TEXT, accepted_at TEXT
      )`,
    },
  ]);
}

function requireSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 24) {
    throw new Error('SESSION_SECRET ausente ou muito curta. Use pelo menos 24 caracteres.');
  }
  return SESSION_SECRET;
}

function validateSessionToken(rawHeader: string | undefined) {
  if (!rawHeader?.startsWith('Bearer ')) return null;
  const token = rawHeader.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;

  const ownerId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', requireSecret()).update(ownerId).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer) ? ownerId : null;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  try {
    const ownerId = validateSessionToken(req.headers.authorization);
    if (!ownerId) {
      return res.status(401).json({ error: 'Sessão inválida ou ausente.', stage: 'auth' });
    }

    await ensureDatabase();

    const requestedOwnerId = String(req.query?.ownerId || req.body?.ownerId || ownerId).trim();
    const targetOwnerId = requestedOwnerId || ownerId;

    if (targetOwnerId !== ownerId) {
      const [permission] = await pipeline([{
        sql: `SELECT 1
          FROM shared_classrooms c
          LEFT JOIN classroom_members m
            ON m.classroom_id = c.id AND m.user_id = ?
          LEFT JOIN classroom_invitations i
            ON i.classroom_id = c.id AND i.accepted_by = ?
          LEFT JOIN users u
            ON u.id = ? AND u.classroom_id = c.id
          WHERE c.advisor_id = ?
            AND (m.user_id IS NOT NULL OR i.accepted_by IS NOT NULL OR u.id IS NOT NULL)
          LIMIT 1`,
        args: [arg(targetOwnerId), arg(targetOwnerId), arg(targetOwnerId), arg(ownerId)],
      }]);
      if (!permission?.rows?.length) {
        return res.status(403).json({ error: 'Você não tem acesso ao workspace deste estudante.', stage: 'permission' });
      }
    }

    if (req.method === 'GET') {
      const [result] = await pipeline([{
        sql: 'SELECT payload FROM workspace_snapshots WHERE owner_id = ? LIMIT 1',
        args: [arg(targetOwnerId)],
      }]);
      const payload = cellValue(result?.rows?.[0]?.[0]);
      if (typeof payload !== 'string') return res.status(200).json({ payload: null });
      try {
        return res.status(200).json({ payload: JSON.parse(payload) });
      } catch {
        return res.status(200).json({ payload: null });
      }
    }

    if (req.method === 'PUT') {
      const serialized = JSON.stringify(req.body?.payload ?? {});
      if (Buffer.byteLength(serialized, 'utf8') > 1_500_000) {
        return res.status(413).json({ error: 'O workspace ultrapassou o limite de 1,5 MB.' });
      }

      await pipeline([{
        sql: `INSERT INTO workspace_snapshots (owner_id, payload, created_at, updated_at)
              VALUES (?, ?, datetime('now'), datetime('now'))
              ON CONFLICT(owner_id) DO UPDATE SET
                payload = excluded.payload,
                updated_at = datetime('now')`,
        args: [arg(targetOwnerId), arg(serialized)],
      }]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[5I API /api/workspace]', error);
    return res.status(500).json({
      error: error?.message || 'Erro no workspace.',
      stage: 'workspace',
    });
  }
}
