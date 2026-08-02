const TOKEN_KEY = '5is_turso_anonymous_session';

export interface StoredTursoSession {
  ownerId: string;
  token: string;
}

export const isTursoConfigured = true;

export function readStoredTursoSession(): StoredTursoSession | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    const data = raw ? JSON.parse(raw) : null;
    return data?.ownerId && data?.token ? data : null;
  } catch {
    return null;
  }
}

function storeSession(session: StoredTursoSession) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

export async function ensureTursoSession(): Promise<StoredTursoSession> {
  const stored = readStoredTursoSession();
  if (stored) return stored;

  const response = await fetch('/api/session', { method: 'POST' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ownerId || !data?.token) {
    throw new Error(data?.error || 'Não foi possível criar a sessão anônima.');
  }
  const session = { ownerId: String(data.ownerId), token: String(data.token) };
  storeSession(session);
  return session;
}

export async function readWorkspace(token: string, ownerId?: string) {
  const query = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
  const response = await fetch(`/api/workspace${query}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Falha ao carregar o workspace.');
  return data?.payload ?? null;
}

export async function saveWorkspace(token: string, payload: unknown, ownerId?: string) {
  const query = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
  const response = await fetch(`/api/workspace${query}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ payload }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.error || 'Falha ao salvar o workspace.');
  }
}
