import { readAuthSession } from './auth';

const LEGACY_TOKEN_KEY = '5is_turso_anonymous_session';

export interface StoredTursoSession {
  ownerId: string;
  token: string;
}

export const isTursoConfigured = true;

export function readAuthenticatedTursoSession(): StoredTursoSession | null {
  const authenticated = readAuthSession();
  if (!authenticated?.ownerId || !authenticated?.token) return null;
  return {
    ownerId: authenticated.ownerId,
    token: authenticated.token,
  };
}

export function readLegacyTursoSession(): StoredTursoSession | null {
  try {
    const raw = localStorage.getItem(LEGACY_TOKEN_KEY);
    const data = raw ? JSON.parse(raw) : null;
    if (!data?.ownerId || !data?.token) return null;

    const authenticated = readAuthenticatedTursoSession();
    if (
      authenticated &&
      authenticated.ownerId === String(data.ownerId) &&
      authenticated.token === String(data.token)
    ) {
      return null;
    }

    return {
      ownerId: String(data.ownerId),
      token: String(data.token),
    };
  } catch {
    return null;
  }
}

export function readStoredTursoSession(): StoredTursoSession | null {
  return readAuthenticatedTursoSession() || readLegacyTursoSession();
}

function storeLegacySession(session: StoredTursoSession) {
  localStorage.setItem(LEGACY_TOKEN_KEY, JSON.stringify(session));
}

export function clearLegacyTursoSession() {
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

export async function ensureTursoSession(): Promise<StoredTursoSession> {
  const authenticated = readAuthenticatedTursoSession();
  if (authenticated) return authenticated;

  const legacy = readLegacyTursoSession();
  if (legacy) return legacy;

  const response = await fetch('/api/session', { method: 'POST' });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.ownerId || !data?.token) {
    throw new Error(data?.error || 'Não foi possível criar a sessão.');
  }

  const session = {
    ownerId: String(data.ownerId),
    token: String(data.token),
  };
  storeLegacySession(session);
  return session;
}

export async function readWorkspace(token: string, ownerId?: string) {
  const suffix = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
  const response = await fetch(`/api/workspace${suffix}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Falha ao carregar o workspace.');
  return data?.payload ?? null;
}

export async function saveWorkspace(token: string, payload: unknown, ownerId?: string) {
  const suffix = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
  const response = await fetch(`/api/workspace${suffix}`, {
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
