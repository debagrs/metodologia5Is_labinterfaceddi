export type AiProvider = 'groq' | 'openrouter' | 'gemini' | 'offline';

export interface MediatorRequestBody {
  project: { name: string; projectType: string; problem: string; community: string; ods: string };
  mediator: { name: string; role: string; bio: string };
  phase: string;
  existingThoughts?: Array<{ type: string; title: string; content: string; phase: string }>;
}

export interface MediatorInsight {
  title: string;
  question: string;
  provocations: string[];
  scientificContext: string;
  provider?: string;
  model?: string;
  remainingToday?: number | null;
}

const REFERENCES: Record<string, string> = {
  pesquisa: 'Triangulação metodológica; etnografia de design; pesquisa participante; saturação teórica; cartografia; métodos mistos.',
  ux: 'Don Norman; Preece, Rogers e Sharp; Jakob Nielsen; John Sweller; teoria da atividade; modelos mentais; 101 UX Principles.',
  bioetica: 'Van Rensselaer Potter; bioética; educação humanitária; justiça de design; alteridade; prevenção de dark patterns; impactos humanos e não humanos.',
  acessibilidade: 'WCAG; e-MAG; desenho universal; modelo social da deficiência; tecnologias assistivas; multimodalidade; linguagem simples.',
  visual: 'Gestalt; semiótica; Josef Albers; Eva Heller; Itten; Müller-Brockmann; tipografia; hierarquia e ritmo visual.',
  documentacao: 'Design tokens; documentação de decisões; ADRs; handoff; rastreabilidade; requisitos; critérios de aceite.',
  heuristicas: 'Dez heurísticas de Jakob Nielsen; leis de UX; consistência; prevenção de erros; reconhecimento em vez de memorização.',
  implementacao: 'Arquitetura de informação; requisitos funcionais e não funcionais; segurança; LGPD; desempenho; testes; critérios de aceite.'
};

function referenceFor(role: string): string {
  const value = role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (value.includes('pesquisa')) return REFERENCES.pesquisa;
  if (value.includes('bio')) return REFERENCES.bioetica;
  if (value.includes('acess')) return REFERENCES.acessibilidade;
  if (value.includes('visual')) return REFERENCES.visual;
  if (value.includes('document')) return REFERENCES.documentacao;
  if (value.includes('heur')) return REFERENCES.heuristicas;
  if (value.includes('implement')) return REFERENCES.implementacao;
  return REFERENCES.ux;
}

function buildMessages(body: MediatorRequestBody) {
  const thoughts = body.existingThoughts?.length
    ? body.existingThoughts.slice(-18).map((item) => `- [${item.phase}] ${item.title}: ${item.content}`).join('\n')
    : 'Ainda não há registros no canvas.';
  const system = `Você integra a Metodologia 5I’s: Ideação, Inambulação, Instauração, Inspeção e Implementação.\nVocê é ${body.mediator.name}, agente de ${body.mediator.role}. ${body.mediator.bio}\nBase conceitual: ${referenceFor(body.mediator.role)}\nRegras: não substitua a autoria; não entregue solução acabada; questione premissas; relacione à fase ${body.phase}; não invente autores, normas ou dados; use português do Brasil; retorne somente JSON válido no formato {"title":"...","question":"...","provocations":["...","..."],"scientificContext":"..."}.`;
  const user = `PROJETO\nNome: ${body.project.name}\nTipo: ${body.project.projectType}\nProblema: ${body.project.problem}\nComunidade: ${body.project.community}\nODS: ${body.project.ods}\nFase: ${body.phase}\n\nREGISTROS\n${thoughts}\n\nCrie uma reflexão inédita. Título com até seis palavras, uma pergunta central e duas ou três ações investigativas curtas.`;
  return { system, user };
}

function cleanJson(text: string): MediatorInsight {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('O modelo não retornou JSON válido.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  if (!data.title || !data.question || !data.scientificContext || !Array.isArray(data.provocations)) throw new Error('Resposta incompleta.');
  return { title: String(data.title), question: String(data.question), provocations: data.provocations.slice(0,3).map(String), scientificContext: String(data.scientificContext) };
}

async function chatCompletion(url: string, key: string, model: string, system: string, user: string, extraHeaders: Record<string,string> = {}) {
  const response = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json', Authorization:`Bearer ${key}`, ...extraHeaders }, body: JSON.stringify({ model, messages:[{role:'system',content:system},{role:'user',content:user}], temperature:0.35, max_completion_tokens:700, response_format:{type:'json_object'} }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || data?.message || `Falha HTTP ${response.status}.`);
  return { insight: cleanJson(data?.choices?.[0]?.message?.content || ''), model: data?.model || model };
}

async function callGroq(system: string, user: string, deep: boolean): Promise<MediatorInsight> {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error('GROQ_API_KEY ausente.');
  const model = deep ? (process.env.GROQ_DEEP_MODEL || 'qwen/qwen3.6-27b') : (process.env.GROQ_FAST_MODEL || 'openai/gpt-oss-20b');
  const result = await chatCompletion('https://api.groq.com/openai/v1/chat/completions', key, model, system, user);
  return { ...result.insight, provider:'Groq', model:result.model };
}

async function callOpenRouter(system: string, user: string): Promise<MediatorInsight> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY ausente.');
  const model = process.env.OPENROUTER_MODEL || 'openrouter/free';
  const result = await chatCompletion('https://openrouter.ai/api/v1/chat/completions', key, model, system, user, { 'HTTP-Referer':process.env.APP_URL || 'http://localhost:3000', 'X-Title':"Metodologia 5I’s" });
  return { ...result.insight, provider:'OpenRouter', model:result.model };
}

async function callGemini(system: string, user: string): Promise<MediatorInsight> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY ausente.');
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ systemInstruction:{parts:[{text:system}]}, contents:[{role:'user',parts:[{text:user}]}], generationConfig:{temperature:0.35,responseMimeType:'application/json',maxOutputTokens:700} }) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || 'Falha no Gemini.');
  const text = data?.candidates?.[0]?.content?.parts?.map((p:any)=>p.text||'').join('') || '';
  return { ...cleanJson(text), provider:'Gemini', model };
}

function offlineInsight(body: MediatorRequestBody): MediatorInsight {
  const role = body.mediator.role.toLowerCase();
  const phase = body.phase;
  let question = `Que evidência ainda falta para sustentar a principal decisão deste projeto na fase de ${phase}?`;
  let provocations = ['Identifique uma suposição ainda não verificada.', 'Registre uma evidência observável que poderia confirmá-la ou refutá-la.', 'Defina quem precisa participar dessa verificação.'];
  if (role.includes('acess')) { question = 'Que barreira impede uma pessoa com diferentes modos de percepção ou ação de concluir a tarefa?'; provocations = ['Teste somente com teclado.', 'Revise rótulos, foco e contraste.', 'Descreva uma alternativa multimodal.']; }
  else if (role.includes('bio')) { question = 'Quem recebe os benefícios e quem assume os riscos desta decisão de design?'; provocations = ['Mapeie humanos e não humanos afetados.', 'Procure coerção, exclusão ou dark patterns.', 'Registre uma salvaguarda verificável.']; }
  else if (role.includes('visual')) { question = 'A hierarquia visual revela a prioridade real da tarefa ou apenas a preferência estética?'; provocations = ['Liste os três primeiros elementos percebidos.', 'Compare contraste, proximidade e alinhamento.', 'Remova um ruído e teste novamente.']; }
  else if (role.includes('heur')) { question = 'Qual falha observável reduz previsibilidade, controle ou recuperação durante a interação?'; provocations = ['Escolha uma heurística.', 'Registre evidência concreta.', 'Defina gravidade e critério de correção.']; }
  else if (role.includes('implement')) { question = 'Que critério de aceite permite verificar no código que esta decisão foi preservada?'; provocations = ['Escreva o requisito em linguagem testável.', 'Defina estado de sucesso e falha.', 'Inclua acessibilidade, privacidade e desempenho.']; }
  return { title:'Roteiro pedagógico offline', question, provocations, scientificContext:`Modo sem API. Use como roteiro de investigação na fase ${phase}; valide depois com evidências e referências.`, provider:'Modo pedagógico', model:'offline' };
}

export async function generateMediatorInsight(body: MediatorRequestBody): Promise<MediatorInsight> {
  if (!body?.project || !body?.mediator || !body?.phase) throw new Error('Parâmetros obrigatórios ausentes.');
  const { system, user } = buildMessages(body);
  const requested = (process.env.AI_PROVIDER || 'groq').toLowerCase() as AiProvider;
  const order = (process.env.AI_FALLBACK_ORDER || 'groq,openrouter,gemini,offline').split(',').map(v=>v.trim()).filter(Boolean) as AiProvider[];
  const providers = [requested, ...order.filter(v=>v!==requested)];
  const deep = /bio|heur|implement|document/i.test(body.mediator.role) || body.phase === 'Inspeção' || body.phase === 'Implementação';
  const errors:string[]=[];
  for (const provider of providers) {
    try {
      if (provider === 'groq') return await callGroq(system,user,deep);
      if (provider === 'openrouter') return await callOpenRouter(system,user);
      if (provider === 'gemini') return await callGemini(system,user);
      if (provider === 'offline') return offlineInsight(body);
    } catch (error:any) { errors.push(`${provider}: ${error?.message || 'erro'}`); }
  }
  const fallback = offlineInsight(body);
  return { ...fallback, scientificContext:`${fallback.scientificContext} Provedores indisponíveis: ${errors.join(' | ')}` };
}
