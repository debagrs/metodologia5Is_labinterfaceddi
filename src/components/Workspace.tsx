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

    if (req.method === 'GET') {
      const requestedOwnerId = String(req.query?.ownerId || ownerId).trim();

      if (requestedOwnerId !== ownerId) {
        const [permission] = await pipeline([{
          sql: `SELECT 1
            FROM shared_classrooms c
            JOIN classroom_members m ON m.classroom_id = c.id
            LEFT JOIN users u ON u.id = m.user_id
            WHERE c.advisor_id = ?
              AND m.user_id = ?
              AND (u.role = 'student' OR u.role IS NULL)
            LIMIT 1`,
          args: [arg(ownerId), arg(requestedOwnerId)],
        }]);

        if (!permission?.rows?.length) {
          const [fallbackPermission] = await pipeline([{
            sql: `SELECT 1
              FROM shared_classrooms c
              JOIN users u ON u.classroom_id = c.id
              WHERE c.advisor_id = ?
                AND u.id = ?
                AND u.role = 'student'
              LIMIT 1`,
            args: [arg(ownerId), arg(requestedOwnerId)],
          }]);

          if (!fallbackPermission?.rows?.length) {
            return res.status(403).json({
              error: 'Você não tem permissão para visualizar este workspace.',
              stage: 'permission',
            });
          }
        }
      }

      const [result] = await pipeline([{
        sql: 'SELECT payload, updated_at FROM workspace_snapshots WHERE owner_id = ? LIMIT 1',
        args: [arg(requestedOwnerId)],
      }]);

      const payload = cellValue(result?.rows?.[0]?.[0]);
      const updatedAt = cellValue(result?.rows?.[0]?.[1]);

      if (typeof payload !== 'string') {
        return res.status(200).json({ payload: null, ownerId: requestedOwnerId, updatedAt: null });
      }

      try {
        return res.status(200).json({
          payload: JSON.parse(payload),
          ownerId: requestedOwnerId,
          updatedAt,
        });
      } catch {
        return res.status(200).json({ payload: null, ownerId: requestedOwnerId, updatedAt });
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
        args: [arg(ownerId), arg(serialized)],
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
