// @ts-nocheck
import crypto from 'node:crypto';

const DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

function httpUrl() {
  if (!DATABASE_URL) throw new Error('TURSO_DATABASE_URL não configurada.');
  return DATABASE_URL.replace(/^libsql:|^turso:/, 'https:').replace(/\/$/, '');
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
  if (!response.ok) {
    throw new Error(data?.error?.message || `Falha no Turso (${response.status}).`);
  }

  for (const result of data?.results || []) {
    if (result?.type === 'error') {
      throw new Error(result?.error?.message || 'Erro SQL no Turso.');
    }
  }
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
      sql: `CREATE TABLE IF NOT EXISTS ai_daily_usage (
        owner_id TEXT NOT NULL,
        usage_date TEXT NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        PRIMARY KEY (owner_id, usage_date)
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

function sign(ownerId: string) {
  return crypto.createHmac('sha256', requireSecret()).update(ownerId).digest('base64url');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    await ensureDatabase();
    const ownerId = crypto.randomUUID();
    return res.status(201).json({ ownerId, token: `${ownerId}.${sign(ownerId)}` });
  } catch (error: any) {
    console.error('[5I API /api/session]', error);
    return res.status(500).json({
      error: error?.message || 'Erro ao criar sessão.',
      stage: 'session',
    });
  }
}
