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
    method: 'POST', headers: { Authorization: `Bearer ${AUTH_TOKEN}`, 'Content-Type': 'application/json' },
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
async function ensureDatabase() {
  await pipeline([
    { sql: `CREATE TABLE IF NOT EXISTS workspace_snapshots (
      owner_id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )` },
    { sql: `CREATE TABLE IF NOT EXISTS project_collaborators (
      id TEXT PRIMARY KEY NOT NULL, owner_id TEXT NOT NULL, project_id TEXT NOT NULL,
      collaborator_id TEXT, collaborator_email TEXT NOT NULL, permission TEXT NOT NULL DEFAULT 'comment',
      label TEXT NOT NULL DEFAULT 'colega', status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')), accepted_at TEXT,
      UNIQUE(owner_id, project_id, collaborator_email)
    )` },
  ]);
}
function requireSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 24) throw new Error('SESSION_SECRET ausente ou muito curta. Use pelo menos 24 caracteres.');
  return SESSION_SECRET;
}
function validateSessionToken(rawHeader: string | undefined) {
  if (!rawHeader?.startsWith('Bearer ')) return null;
  const token = rawHeader.slice(7).trim(); const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const ownerId = token.slice(0, separator); const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', requireSecret()).update(ownerId).digest('base64url');
  const a = Buffer.from(signature); const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? ownerId : null;
}
async function canAccessStudentWorkspace(advisorId: string, studentId: string) {
  const [permission] = await pipeline([{ sql: `SELECT 1 FROM shared_classrooms c
    LEFT JOIN classroom_members m ON m.classroom_id = c.id AND m.user_id = ?
    LEFT JOIN users u ON u.id = ?
    LEFT JOIN classroom_invitations i ON i.classroom_id = c.id AND i.accepted_by = ?
    WHERE c.advisor_id = ? AND (m.user_id IS NOT NULL OR (u.classroom_id = c.id AND u.role = 'student') OR i.accepted_by IS NOT NULL) LIMIT 1`,
    args: [arg(studentId), arg(studentId), arg(studentId), arg(advisorId)] }]);
  return Boolean(permission?.rows?.length);
}
async function getCollaboration(requesterId: string, ownerId: string, projectId: string) {
  if (!projectId) return null;
  const [result] = await pipeline([{ sql: `SELECT permission, label FROM project_collaborators
    WHERE owner_id = ? AND project_id = ? AND collaborator_id = ? AND status = 'accepted' LIMIT 1`,
    args: [arg(ownerId), arg(projectId), arg(requesterId)] }]);
  const row = result?.rows?.[0];
  return row ? { permission: String(cellValue(row[0]) || 'view'), label: String(cellValue(row[1]) || 'colega') } : null;
}
function readSnapshot(payload: any) {
  if (typeof payload !== 'string') return {};
  try { return JSON.parse(payload); } catch { return {}; }
}
function findWorkspace(snapshot: any, projectId: string) {
  const list = Array.isArray(snapshot.projectWorkspaces) ? snapshot.projectWorkspaces : [];
  return list.find((x: any) => x?.project?.id === projectId) ||
    (snapshot.soloProject?.id === projectId ? { project: snapshot.soloProject, nodes: Array.isArray(snapshot.soloNodes) ? snapshot.soloNodes : [], updatedAt: new Date().toISOString() } : null);
}
function filteredSnapshot(snapshot: any, projectId: string) {
  const ws = findWorkspace(snapshot, projectId);
  if (!ws) return { activeProfile: null, classrooms: [], students: [], soloProject: null, soloNodes: [], projectWorkspaces: [], activeProjectId: null };
  return { activeProfile: null, classrooms: [], students: [], soloProject: ws.project, soloNodes: ws.nodes || [], projectWorkspaces: [ws], activeProjectId: projectId };
}
function mergeProject(original: any, incoming: any, projectId: string, commentsOnly = false, requesterId = '') {
  const oldWs = findWorkspace(original, projectId);
  const newWs = findWorkspace(incoming, projectId);
  if (!oldWs || !newWs) return original;
  let mergedWs = newWs;
  if (commentsOnly) {
    const incomingById = new Map((newWs.nodes || []).map((n: any) => [n.id, n]));
    mergedWs = {
      ...oldWs,
      nodes: (oldWs.nodes || []).map((oldNode: any) => {
        const candidate: any = incomingById.get(oldNode.id);
        if (!candidate) return oldNode;
        const oldComments = Array.isArray(oldNode.comments) ? oldNode.comments : [];
        const candidateComments = Array.isArray(candidate.comments) ? candidate.comments : oldComments;
        const otherPeople = oldComments.filter((c: any) => c?.authorId !== requesterId);
        const mine = candidateComments.filter((c: any) => c?.authorId === requesterId);
        return { ...oldNode, comments: [...otherPeople, ...mine] };
      }),
      updatedAt: new Date().toISOString(),
    };
  }
  const list = Array.isArray(original.projectWorkspaces) ? original.projectWorkspaces : [];
  const nextList = list.some((x: any) => x?.project?.id === projectId)
    ? list.map((x: any) => x?.project?.id === projectId ? mergedWs : x)
    : [...list, mergedWs];
  const result = { ...original, projectWorkspaces: nextList };
  if (original.soloProject?.id === projectId) { result.soloProject = mergedWs.project; result.soloNodes = mergedWs.nodes || []; }
  return result;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  try {
    const requesterId = validateSessionToken(req.headers.authorization);
    if (!requesterId) return res.status(401).json({ error: 'Sessão inválida ou ausente.', stage: 'auth' });
    await ensureDatabase();
    const requestedOwnerId = String(req.query?.ownerId || requesterId).trim();
    const projectId = String(req.query?.projectId || '').trim();

    let advisorAllowed = false; let collaboration: any = null;
    if (requestedOwnerId !== requesterId) {
      advisorAllowed = await canAccessStudentWorkspace(requesterId, requestedOwnerId).catch(() => false);
      if (!advisorAllowed) collaboration = await getCollaboration(requesterId, requestedOwnerId, projectId);
      if (!advisorAllowed && !collaboration) return res.status(403).json({ error: 'Você não tem permissão para acessar este workspace.', stage: 'permission' });
    }

    if (req.method === 'GET') {
      const [result] = await pipeline([{ sql: 'SELECT payload, updated_at FROM workspace_snapshots WHERE owner_id = ? LIMIT 1', args: [arg(requestedOwnerId)] }]);
      const payload = cellValue(result?.rows?.[0]?.[0]); const updatedAt = cellValue(result?.rows?.[0]?.[1]);
      if (typeof payload !== 'string') return res.status(200).json({ payload: null, ownerId: requestedOwnerId, updatedAt: null, permission: collaboration?.permission });
      const snapshot = readSnapshot(payload);
      const responsePayload = requestedOwnerId !== requesterId && collaboration ? filteredSnapshot(snapshot, projectId) : snapshot;
      return res.status(200).json({ payload: responsePayload, ownerId: requestedOwnerId, updatedAt, permission: collaboration?.permission, collaborationLabel: collaboration?.label });
    }

    if (req.method === 'PUT') {
      const incoming = req.body?.payload ?? {};
      let payloadToSave = incoming;
      if (requestedOwnerId !== requesterId && collaboration) {
        if (collaboration.permission === 'view') return res.status(403).json({ error: 'Este convite permite apenas visualizar.' });
        const [currentResult] = await pipeline([{ sql: 'SELECT payload FROM workspace_snapshots WHERE owner_id = ? LIMIT 1', args: [arg(requestedOwnerId)] }]);
        const current = readSnapshot(cellValue(currentResult?.rows?.[0]?.[0]));
        payloadToSave = mergeProject(current, incoming, projectId, collaboration.permission === 'comment', requesterId);
      }
      const serialized = JSON.stringify(payloadToSave);
      if (Buffer.byteLength(serialized, 'utf8') > 1_500_000) return res.status(413).json({ error: 'O workspace ultrapassou o limite de 1,5 MB.' });
      await pipeline([{ sql: `INSERT INTO workspace_snapshots (owner_id, payload, created_at, updated_at)
        VALUES (?, ?, datetime('now'), datetime('now')) ON CONFLICT(owner_id) DO UPDATE SET payload = excluded.payload, updated_at = datetime('now')`,
        args: [arg(requestedOwnerId), arg(serialized)] }]);
      return res.status(200).json({ ok: true, ownerId: requestedOwnerId, permission: collaboration?.permission });
    }

    res.setHeader('Allow', 'GET, PUT'); return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[5I API /api/workspace]', error);
    return res.status(500).json({ error: error?.message || 'Erro no workspace.', stage: 'workspace' });
  }
}
