import { generateMediatorInsight } from '../../src/server/mediatorEngine';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }

  try {
    const insight = await generateMediatorInsight(req.body);
    return res.status(200).json(insight);
  } catch (error: any) {
    console.error('[5I API /api/mediators/think]', error);
    return res.status(500).json({
      error: error?.message || 'Erro interno na mediação.',
    });
  }
}
