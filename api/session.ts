import { createAnonymousSession, ensureDatabase } from '../src/server/turso';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }
  try {
    await ensureDatabase();
    return res.status(201).json(createAnonymousSession());
  } catch (error: any) {
    console.error('[5I API /api/session]', error);
    return res.status(500).json({ error: error?.message || 'Erro ao criar sessão.' });
  }
}
