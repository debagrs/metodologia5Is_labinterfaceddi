import { generateMediatorInsight } from '../../src/server/mediatorEngine.js';

async function consumeQuota(authorization: string | null): Promise<number | null> {
  const url = process.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key || !authorization?.startsWith('Bearer ')) return null;
  const dailyLimit = Math.max(1, Math.min(100, Number(process.env.AI_DAILY_LIMIT || 20)));
  const response = await fetch(`${url}/rest/v1/rpc/consume_ai_quota`, {
    method:'POST',
    headers:{ apikey:key, Authorization:authorization, 'Content-Type':'application/json' },
    body:JSON.stringify({ p_daily_limit:dailyLimit })
  });
  const data = await response.json().catch(()=>null);
  if (response.status === 429 || data?.code === 'P0001') throw new Error(`Limite pedagógico diário atingido (${dailyLimit} mediações). Continue com os roteiros offline e retome amanhã.`);
  if (!response.ok) throw new Error(data?.message || 'Não foi possível validar a cota diária.');
  return typeof data === 'number' ? Math.max(0, dailyLimit-data) : null;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return Response.json({error:'Método não permitido.'},{status:405,headers:{Allow:'POST'}});
  try {
    const remainingToday = await consumeQuota(request.headers.get('authorization'));
    const body = await request.json();
    const insight = await generateMediatorInsight(body);
    return Response.json({...insight,remainingToday},{status:200});
  } catch (error:any) {
    const message=error?.message || 'Erro interno na mediação.';
    const status=message.includes('Limite pedagógico') ? 429 : 500;
    return Response.json({error:message},{status});
  }
}
