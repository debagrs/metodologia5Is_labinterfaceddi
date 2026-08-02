import type { UserProfile } from '../types';

const AUTH_KEY = '5is_email_auth_session';
export interface AuthSession { ownerId: string; token: string; user: UserProfile; }

export function readAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return parsed?.token && parsed?.user ? parsed : null;
  } catch { return null; }
}
export function saveAuthSession(session: AuthSession) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  localStorage.setItem('5is_turso_anonymous_session', JSON.stringify({ ownerId: session.ownerId, token: session.token }));
}
export function clearAuthSession() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem('5is_turso_anonymous_session');
}
export async function authenticate(payload: Record<string, unknown>): Promise<AuthSession> {
  const response = await fetch('/api/auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Não foi possível entrar.');
  const session = { ownerId: String(data.ownerId), token: String(data.token), user: data.user as UserProfile };
  saveAuthSession(session);
  return session;
}
