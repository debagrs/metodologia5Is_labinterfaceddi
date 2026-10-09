// @ts-nocheck
import crypto from 'node:crypto';

const DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';
let initialized = null;


function httpUrl() {
  if (!DATABASE_URL) throw new Error('TURSO_DATABASE_URL não configurada.');
  return DATABASE_URL.replace(/^libsql:|^turso:/, 'https:').replace(/\/$/, '');
}

function arg(value) {
  if (value === null) return { type: 'null' };
  if (typeof value === 'number') {
    return Number.isInteger(value)
      ? { type: 'integer', value: String(value) }
      : { type: 'float', value: String(value) };
  }
  return { type: 'text', value };
}

async function pipeline(statements) {
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
  return results.map((item) => item?.response?.result || {});
}

function cellValue(cell) {
  if (!cell || cell.type === 'null') return null;
  if (cell.type === 'integer' || cell.type === 'float') return Number(cell.value);
  return cell.value ?? null;
}

export async function ensureDatabase() {
  if (!initialized) {
    initialized = pipeline([
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
    ]).then(() => undefined);
  }
  await initialized;
}

function requireSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 24) {
    throw new Error('SESSION_SECRET ausente ou muito curta. Use pelo menos 24 caracteres.');
  }
  return SESSION_SECRET;
}

function sign(ownerId) {
  return crypto.createHmac('sha256', requireSecret()).update(ownerId).digest('base64url');
}

export function createAnonymousSession() {
  const ownerId = crypto.randomUUID();
  return { ownerId, token: `${ownerId}.${sign(ownerId)}` };
}

export function validateSessionToken(rawHeader) {
  if (!rawHeader?.startsWith('Bearer ')) return null;
  const token = rawHeader.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const ownerId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(ownerId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer) ? ownerId : null;
}

export async function readWorkspace(ownerId) {
  await ensureDatabase();
  const [result] = await pipeline([{
    sql: 'SELECT payload FROM workspace_snapshots WHERE owner_id = ? LIMIT 1',
    args: [arg(ownerId)],
  }]);
  const payload = cellValue(result?.rows?.[0]?.[0]);
  if (typeof payload !== 'string') return null;
  try { return JSON.parse(payload); } catch { return null; }
}

export async function saveWorkspace(ownerId, payload) {
  await ensureDatabase();
  const serialized = JSON.stringify(payload ?? {});
  if (Buffer.byteLength(serialized, 'utf8') > 1_500_000) {
    throw new Error('O workspace ultrapassou o limite de 1,5 MB.');
  }
  await pipeline([{
    sql: `INSERT INTO workspace_snapshots (owner_id, payload, created_at, updated_at)
          VALUES (?, ?, datetime('now'), datetime('now'))
          ON CONFLICT(owner_id) DO UPDATE SET
            payload = excluded.payload,
            updated_at = datetime('now')`,
    args: [arg(ownerId), arg(serialized)],
  }]);
}

export async function consumeAiQuota(ownerId, dailyLimit) {
  await ensureDatabase();
  const limit = Math.max(1, Math.min(100, Math.trunc(dailyLimit || 20)));
  const usageDate = new Date().toISOString().slice(0, 10);
  const [result] = await pipeline([{
    sql: `INSERT INTO ai_daily_usage (owner_id, usage_date, request_count, updated_at)
          VALUES (?, ?, 1, datetime('now'))
          ON CONFLICT(owner_id, usage_date) DO UPDATE SET
            request_count = request_count + 1,
            updated_at = datetime('now')
          RETURNING request_count`,
    args: [arg(ownerId), arg(usageDate)],
  }]);
  const count = Number(cellValue(result?.rows?.[0]?.[0]) || 0);
  if (count > limit) {
    await pipeline([{
      sql: `UPDATE ai_daily_usage SET request_count = ?, updated_at = datetime('now')
            WHERE owner_id = ? AND usage_date = ?`,
      args: [arg(limit), arg(ownerId), arg(usageDate)],
    }]);
    throw new Error('Limite diário de mediações atingido. Tente novamente amanhã.');
  }
  return Math.max(0, limit - count);
}
