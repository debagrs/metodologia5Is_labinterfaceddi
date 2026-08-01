import { generateMediatorInsight } from '../_lib/mediatorEngine.js';
import { consumeAiQuota, validateSessionToken } from '../_lib/turso.js';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const ownerId = validateSessionToken(req.headers.authorization);
    let remainingToday: number | null = null;
    const warnings: string[] = [];

    if (ownerId) {
      try {
        remainingToday = await consumeAiQuota(
          ownerId,
          Number(process.env.AI_DAILY_LIMIT || 20),
        );
      } catch (quotaError: any) {
        const message = quotaError?.message || 'Falha ao consultar a cota diária.';
        if (/Limite diário/i.test(message)) {
          return res.status(429).json({ error: message, stage: 'quota' });
        }
        console.error('[5I API] Turso/cota indisponível:', quotaError);
        warnings.push('A mediação funcionou, mas o controle de cota do Turso não pôde ser atualizado.');
      }
    } else {
      warnings.push('Sessão de nuvem indisponível; a mediação foi executada sem contabilizar a cota.');
    }

    const insight = await generateMediatorInsight(req.body);
    return res.status(200).json({
      ...insight,
      remainingToday,
      warnings: [...warnings, ...(insight.warnings || [])],
    });
  } catch (error: any) {
    console.error('[5I API /api/mediators/think]', error);
    return res.status(500).json({
      error: error?.message || 'Erro interno na mediação.',
      stage: 'mediator',
    });
  }
}
