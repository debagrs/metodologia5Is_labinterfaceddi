import { generateMediatorInsight } from '../../src/server/mediatorEngine';
import { consumeAiQuota, validateSessionToken } from '../../src/server/turso';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  const ownerId = validateSessionToken(req.headers.authorization);
  if (!ownerId) return res.status(401).json({ error: 'Sessão inválida ou ausente.' });

  try {
    const remainingToday = await consumeAiQuota(ownerId, Number(process.env.AI_DAILY_LIMIT || 20));
    const insight = await generateMediatorInsight(req.body);
    return res.status(200).json({ ...insight, remainingToday });
  } catch (error: any) {
    console.error('[5I API /api/mediators/think]', error);
    const status = /Limite diário/i.test(error?.message || '') ? 429 : 500;
    return res.status(status).json({ error: error?.message || 'Erro interno na mediação.' });
  }
}
