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
function cellValue(cell: any) {
  if (!cell || cell.type === 'null') return null;
  if (cell.type === 'integer' || cell.type === 'float') return Number(cell.value);
  return cell.value ?? null;
}
function requireSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 24) throw new Error('SESSION_SECRET ausente ou muito curta.');
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
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? ownerId : null;
}
async function ensureDatabase() {
  await pipeline([
    { sql: `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL, password_salt TEXT NOT NULL, role TEXT NOT NULL,
      partner_type TEXT, classroom_id TEXT, institution TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS workspace_snapshots (
      owner_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS project_collaborators (
      id TEXT PRIMARY KEY NOT NULL,
      owner_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      collaborator_id TEXT,
      collaborator_email TEXT NOT NULL,
      permission TEXT NOT NULL DEFAULT 'comment',
      label TEXT NOT NULL DEFAULT 'colega',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      accepted_at TEXT,
      UNIQUE(owner_id, project_id, collaborator_email)
    )` },
  ]);
}
function normalizeEmail(v: any) { return String(v || '').trim().toLowerCase(); }
function safePermission(v: any) { return ['view','comment','edit'].includes(String(v)) ? String(v) : 'comment'; }
function safeLabel(v: any) { return ['colega','comunidade','cliente','especialista','outro'].includes(String(v)) ? String(v) : 'colega'; }

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const requesterId = validateSessionToken(req.headers.authorization);
    if (!requesterId) return res.status(401).json({ error: 'Sessão inválida ou ausente.' });
    await ensureDatabase();

    const [meResult] = await pipeline([{ sql: 'SELECT name, email FROM users WHERE id = ? LIMIT 1', args: [arg(requesterId)] }]);
    const meRow = meResult?.rows?.[0];
    const requesterEmail = normalizeEmail(cellValue(meRow?.[1]));

    // Convites pendentes são aceitos automaticamente quando a pessoa entra com o e-mail convidado.
    if (requesterEmail) {
      await pipeline([{ sql: `UPDATE project_collaborators
        SET collaborator_id = ?, status = 'accepted', accepted_at = COALESCE(accepted_at, datetime('now'))
        WHERE lower(collaborator_email) = ? AND (collaborator_id IS NULL OR collaborator_id = ?)`,
        args: [arg(requesterId), arg(requesterEmail), arg(requesterId)] }]);
    }

    if (req.method === 'GET') {
      const action = String(req.query?.action || 'project');
      if (action === 'mine') {
        const [result] = await pipeline([{ sql: `SELECT
          pc.id, pc.owner_id, COALESCE(u.name, 'Pessoa'), pc.project_id,
          pc.permission, pc.label, pc.status, pc.created_at,
          w.payload, w.updated_at
          FROM project_collaborators pc
          LEFT JOIN users u ON u.id = pc.owner_id
          LEFT JOIN workspace_snapshots w ON w.owner_id = pc.owner_id
          WHERE pc.collaborator_id = ? AND pc.status = 'accepted'
          ORDER BY pc.created_at DESC`, args: [arg(requesterId)] }]);
        const projects = (result?.rows || []).map((row: any[]) => {
          let snapshot: any = {};
          try { snapshot = JSON.parse(String(cellValue(row[8]) || '{}')); } catch {}
          const workspaces = Array.isArray(snapshot.projectWorkspaces) ? snapshot.projectWorkspaces : [];
          const ws = workspaces.find((x: any) => x?.project?.id === String(cellValue(row[3]))) ||
            (snapshot.soloProject?.id === String(cellValue(row[3])) ? { project: snapshot.soloProject, nodes: snapshot.soloNodes || [], updatedAt: cellValue(row[9]) } : null);
          if (!ws?.project) return null;
          return {
            collaborationId: String(cellValue(row[0])), ownerId: String(cellValue(row[1])), ownerName: String(cellValue(row[2])),
            projectId: String(cellValue(row[3])), projectName: ws.project.name || 'Projeto compartilhado',
            projectProblem: ws.project.problem || '', activePhase: ws.project.activePhase || 'Ideação',
            permission: String(cellValue(row[4]) || 'comment'), label: String(cellValue(row[5]) || 'colega'),
            updatedAt: ws.updatedAt || String(cellValue(row[9]) || new Date().toISOString()), nodeCount: Array.isArray(ws.nodes) ? ws.nodes.length : 0,
          };
        }).filter(Boolean);
        return res.status(200).json({ projects });
      }

      const projectId = String(req.query?.projectId || '').trim();
      if (!projectId) return res.status(400).json({ error: 'projectId é obrigatório.' });
      const [result] = await pipeline([{ sql: `SELECT pc.id, pc.owner_id, pc.project_id, pc.collaborator_id,
        pc.collaborator_email, COALESCE(u.name, ''), pc.permission, pc.label, pc.status, pc.created_at
        FROM project_collaborators pc LEFT JOIN users u ON u.id = pc.collaborator_id
        WHERE pc.owner_id = ? AND pc.project_id = ? ORDER BY pc.created_at DESC`, args: [arg(requesterId), arg(projectId)] }]);
      const collaborators = (result?.rows || []).map((r: any[]) => ({
        id: String(cellValue(r[0])), ownerId: String(cellValue(r[1])), projectId: String(cellValue(r[2])),
        collaboratorId: cellValue(r[3]) ? String(cellValue(r[3])) : undefined,
        collaboratorEmail: String(cellValue(r[4])), collaboratorName: String(cellValue(r[5]) || '') || undefined,
        permission: String(cellValue(r[6]) || 'comment'), label: String(cellValue(r[7]) || 'colega'),
        status: String(cellValue(r[8]) || 'pending'), createdAt: String(cellValue(r[9]) || ''),
      }));
      return res.status(200).json({ collaborators });
    }

    if (req.method === 'POST') {
      const projectId = String(req.body?.projectId || '').trim();
      const email = normalizeEmail(req.body?.email);
      const permission = safePermission(req.body?.permission);
      const label = safeLabel(req.body?.label);
      if (!projectId || !email || !email.includes('@')) return res.status(400).json({ error: 'Informe projeto e e-mail válidos.' });
      if (email === requesterEmail) return res.status(400).json({ error: 'Você já é a pessoa proprietária deste projeto.' });

      const [workspaceResult, userResult] = await pipeline([
        { sql: 'SELECT payload FROM workspace_snapshots WHERE owner_id = ? LIMIT 1', args: [arg(requesterId)] },
        { sql: 'SELECT id FROM users WHERE lower(email) = ? LIMIT 1', args: [arg(email)] },
      ]);
      let snapshot: any = {};
      try { snapshot = JSON.parse(String(cellValue(workspaceResult?.rows?.[0]?.[0]) || '{}')); } catch {}
      const exists = (Array.isArray(snapshot.projectWorkspaces) && snapshot.projectWorkspaces.some((x: any) => x?.project?.id === projectId)) || snapshot.soloProject?.id === projectId;
      if (!exists) return res.status(404).json({ error: 'Projeto não encontrado na sua conta.' });

      const collaboratorId = cellValue(userResult?.rows?.[0]?.[0]);
      const id = crypto.randomUUID();
      await pipeline([{ sql: `INSERT INTO project_collaborators
        (id, owner_id, project_id, collaborator_id, collaborator_email, permission, label, status, created_at, accepted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)
        ON CONFLICT(owner_id, project_id, collaborator_email) DO UPDATE SET
          collaborator_id = excluded.collaborator_id, permission = excluded.permission, label = excluded.label,
          status = excluded.status, accepted_at = excluded.accepted_at`, args: [
          arg(id), arg(requesterId), arg(projectId), arg(collaboratorId), arg(email), arg(permission), arg(label),
          arg(collaboratorId ? 'accepted' : 'pending'), collaboratorId ? arg(new Date().toISOString()) : arg(null),
        ] }]);
      return res.status(201).json({ ok: true, status: collaboratorId ? 'accepted' : 'pending' });
    }

    if (req.method === 'PATCH') {
      const id = String(req.body?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Convite inválido.' });
      await pipeline([{ sql: `UPDATE project_collaborators SET permission = ?, label = ? WHERE id = ? AND owner_id = ?`,
        args: [arg(safePermission(req.body?.permission)), arg(safeLabel(req.body?.label)), arg(id), arg(requesterId)] }]);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query?.id || '').trim();
      if (!id) return res.status(400).json({ error: 'Convite inválido.' });
      await pipeline([{ sql: 'DELETE FROM project_collaborators WHERE id = ? AND owner_id = ?', args: [arg(id), arg(requesterId)] }]);
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PATCH, DELETE');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[5I API /api/project-collaborators]', error);
    return res.status(500).json({ error: error?.message || 'Erro ao gerenciar colaboração.' });
  }
}
