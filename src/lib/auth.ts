import type { UserProfile } from '../types';

const AUTH_KEY = '5is_email_auth_session';
const LEGACY_SESSION_KEY = '5is_turso_anonymous_session';

export interface AuthSession {
  ownerId: string;
  token: string;
  user: UserProfile;
}

export function readAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<AuthSession> | null;
    if (!parsed?.ownerId || !parsed?.token || !parsed?.user) return null;

    return {
      ownerId: String(parsed.ownerId),
      token: String(parsed.token),
      user: parsed.user as UserProfile,
    };
  } catch {
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));

  // Não sobrescreva a sessão anônima antiga aqui.
  // Ela pode conter um canvas criado antes do login e será migrada automaticamente.
}

export function clearAuthSession(): void {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(LEGACY_SESSION_KEY);
}

export async function authenticate(
  payload: Record<string, unknown>,
): Promise<AuthSession> {
  const response = await fetch('/api/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json().catch(() => ({}))
    : { error: await response.text().catch(() => '') };

  if (!response.ok) {
    throw new Error(
      typeof data?.error === 'string' && data.error.trim()
        ? data.error
        : 'Não foi possível entrar.',
    );
  }

  if (!data?.ownerId || !data?.token || !data?.user) {
    throw new Error('A autenticação respondeu sem os dados da sessão.');
  }

  const session: AuthSession = {
    ownerId: String(data.ownerId),
    token: String(data.token),
    user: data.user as UserProfile,
  };

  saveAuthSession(session);
  return session;
}
