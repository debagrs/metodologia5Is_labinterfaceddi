import { readWorkspace, saveWorkspace, validateSessionToken } from '../src/server/turso';

export default async function handler(req: any, res: any) {
  const ownerId = validateSessionToken(req.headers.authorization);
  if (!ownerId) return res.status(401).json({ error: 'Sessão inválida ou ausente.' });

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ payload: await readWorkspace(ownerId) });
    }
    if (req.method === 'PUT') {
      await saveWorkspace(ownerId, req.body?.payload);
      return res.status(200).json({ ok: true });
    }
    res.setHeader('Allow', 'GET, PUT');
    return res.status(405).json({ error: 'Método não permitido.' });
  } catch (error: any) {
    console.error('[5I API /api/workspace]', error);
    return res.status(500).json({ error: error?.message || 'Erro no workspace.' });
  }
}
