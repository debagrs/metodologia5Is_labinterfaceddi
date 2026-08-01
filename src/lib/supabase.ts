const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.replace(/\/$/, '');
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const TOKEN_KEY = '5is_supabase_anonymous_session';

interface StoredSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: { id: string };
}

export const isSupabaseConfigured = Boolean(url && anonKey);

function headers(accessToken?: string) {
  return {
    apikey: anonKey || '',
    Authorization: `Bearer ${accessToken || anonKey || ''}`,
    'Content-Type': 'application/json'
  };
}

export function readStoredSupabaseSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeSession(session: StoredSession) {
  localStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

async function refreshSession(session: StoredSession): Promise<StoredSession> {
  if (!session.refresh_token) return session;
  const response = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refresh_token: session.refresh_token })
  });
  if (!response.ok) throw new Error('Não foi possível renovar a sessão do Supabase.');
  const data = await response.json();
  const refreshed = {
    ...data,
    expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
  } as StoredSession;
  storeSession(refreshed);
  return refreshed;
}

export async function ensureSupabaseSession(): Promise<StoredSession | null> {
  if (!isSupabaseConfigured) return null;
  let session = readStoredSupabaseSession();
  const now = Math.floor(Date.now() / 1000);
  if (session?.access_token && (!session.expires_at || session.expires_at > now + 60)) return session;
  if (session?.refresh_token) {
    try { return await refreshSession(session); } catch { localStorage.removeItem(TOKEN_KEY); }
  }

  const response = await fetch(`${url}/auth/v1/signup`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({})
  });
  const data = await response.json();
  if (!response.ok || !data.access_token || !data.user?.id) {
    throw new Error(data?.msg || data?.message || 'Ative Anonymous Sign-Ins no Supabase.');
  }
  session = {
    ...data,
    expires_at: Math.floor(Date.now() / 1000) + Number(data.expires_in || 3600)
  };
  storeSession(session);
  return session;
}

export async function readWorkspace(ownerId: string, accessToken: string) {
  const response = await fetch(`${url}/rest/v1/workspace_snapshots?owner_id=eq.${encodeURIComponent(ownerId)}&select=payload`, {
    headers: headers(accessToken)
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.message || 'Falha ao carregar o workspace.');
  return Array.isArray(data) && data[0]?.payload ? data[0].payload : null;
}

export async function saveWorkspace(ownerId: string, accessToken: string, payload: unknown) {
  const response = await fetch(`${url}/rest/v1/workspace_snapshots?on_conflict=owner_id`, {
    method: 'POST',
    headers: {
      ...headers(accessToken),
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({ owner_id: ownerId, payload, updated_at: new Date().toISOString() })
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data?.message || 'Falha ao salvar o workspace.');
  }
}
