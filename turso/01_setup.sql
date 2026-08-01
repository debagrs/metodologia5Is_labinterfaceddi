-- METODOLOGIA 5I'S — TURSO / LIBSQL
-- O aplicativo cria estas tabelas automaticamente no primeiro acesso.
-- Este arquivo existe apenas para inspeção ou criação manual no shell do Turso.

CREATE TABLE IF NOT EXISTS workspace_snapshots (
  owner_id TEXT PRIMARY KEY NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ai_daily_usage (
  owner_id TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (owner_id, usage_date)
);
