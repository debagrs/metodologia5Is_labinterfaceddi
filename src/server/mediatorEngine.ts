export type AiProvider = 'groq' | 'gemini' | 'offline';

export interface MediatorRequestBody {
  project: { name: string; projectType: string; problem: string; community: string; ods: string };
  mediator: { id?: string; name: string; role: string; bio: string };
  phase: string;
  mode?: 'chat' | 'publication' | string;
  message?: string;
  conversation?: Array<{ role: string; text: string }>;
  conversations?: Array<{ mediatorId: string; mediatorName: string; messages: Array<{ role: string; text: string; createdAt?: string }> }>;
  existingThoughts?: Array<{ type: string; title: string; content: string; phase: string; [key: string]: any }>;
}

export interface MediatorInsight {
  title: string;
  question: string;
  provocations: string[];
  scientificContext: string;
  provider?: string;
  model?: string;
  remainingToday?: number | null;
  warnings?: string[];
}

export interface PublicationArticle {
  title: string;
  subtitle?: string;
  abstract: string;
  keywords: string[];
  sections: Array<{ heading: string; body: string }>;
  references?: string[];
  editorialNotes?: string[];
}

export interface PublicationResult {
  article: PublicationArticle;
  provider?: string;
  model?: string;
  warnings?: string[];
}

const REFERENCES: Record<string, string> = {
  pesquisa: 'Triangulação metodológica; etnografia de design; pesquisa participante; saturação teórica; cartografia; métodos mistos.',
  ux: 'Don Norman; Preece, Rogers e Sharp; Jakob Nielsen; John Sweller; teoria da atividade; modelos mentais; 101 UX Principles.',
  bioetica: 'Van Rensselaer Potter; bioética; educação humanitária; justiça de design; alteridade; prevenção de dark patterns; impactos humanos e não humanos.',
  acessibilidade: 'WCAG; e-MAG; desenho universal; modelo social da deficiência; tecnologias assistivas; multimodalidade; linguagem simples.',
  visual: 'Gestalt; semiótica; Josef Albers; Eva Heller; Itten; Müller-Brockmann; tipografia; hierarquia e ritmo visual.',
  documentacao: 'Design tokens; documentação de decisões; ADRs; handoff; rastreabilidade; requisitos; critérios de aceite.',
  heuristicas: 'Dez heurísticas de Jakob Nielsen; leis de UX; consistência; prevenção de erros; reconhecimento em vez de memorização.',
  implementacao: 'Arquitetura de informação; requisitos funcionais e não funcionais; segurança; LGPD; desempenho; testes; critérios de aceite.',
  cosmotecnica: 'Gilbert Simondon; Yuk Hui; individuação técnica; concretização; tecnodiversidade; cosmotécnica; relação tecnologia-cultura; repertórios hi-low; apropriação crítica de tecnologias antigas, intermediárias e emergentes.',
  futuros: 'André Coutinho e Anderson Penha; Patricia Hartmann; Anthony Dunne e Fiona Raby; design estratégico a partir do futuro; speculative design; futures thinking; sinais e tendências; contratendências; futuros prováveis, possíveis e desejáveis; cenários; design fiction; props; narrativas; participatory futures; backcasting.'
};

function referenceFor(role: string): string {
  const value = role.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (value.includes('pesquisa')) return REFERENCES.pesquisa;
  if (value.includes('bio')) return REFERENCES.bioetica;
  if (value.includes('acess')) return REFERENCES.acessibilidade;
  if (value.includes('visual')) return REFERENCES.visual;
  if (value.includes('document') || value.includes('public') || value.includes('cient')) return REFERENCES.documentacao;
  if (value.includes('heur')) return REFERENCES.heuristicas;
  if (value.includes('futuro') || value.includes('cenario') || value.includes('especul') || value.includes('foresight')) return REFERENCES.futuros;
  if (value.includes('cosmot') || value.includes('tecnolog') || value.includes('hi-low') || value.includes('hi low')) return REFERENCES.cosmotecnica;
  if (value.includes('implement')) return REFERENCES.implementacao;
  return REFERENCES.ux;
}

function buildMessages(body: MediatorRequestBody) {
  const thoughts = body.existingThoughts?.length
    ? body.existingThoughts.slice(-18).map((item) => `- [${item.phase}] ${item.title}: ${item.content}`).join('\n')
    : 'Ainda não há registros no canvas.';

  const system = `Você integra a Metodologia 5I’s: Ideação, Inambulação, Instauração, Inspeção e Implementação.
Você é ${body.mediator.name}, agente de ${body.mediator.role}. ${body.mediator.bio}
Base conceitual: ${referenceFor(body.mediator.role)}
Regras: não substitua a autoria; não entregue solução acabada; questione premissas; relacione à fase ${body.phase}; não invente autores, normas ou dados; use português do Brasil; retorne somente JSON válido no formato {"title":"...","question":"...","provocations":["...","..."],"scientificContext":"..."}.`;

  const user = `PROJETO
Nome: ${body.project.name}
Tipo: ${body.project.projectType}
Problema: ${body.project.problem}
Comunidade: ${body.project.community}
ODS: ${body.project.ods}
Fase: ${body.phase}

REGISTROS
${thoughts}

Crie uma reflexão inédita. Título com até seis palavras, uma pergunta central e duas ou três ações investigativas curtas.`;

  return { system, user };
}

function buildPublicationMessages(body: MediatorRequestBody) {
  const records = Array.isArray(body.existingThoughts) ? body.existingThoughts : [];
  const conversations = Array.isArray(body.conversations) ? body.conversations : [];
  const system = `Você é Publica, agente editorial da Metodologia 5I’s de Design de Interfaces.
Sua tarefa é transformar documentação de projeto em um relato científico consistente, rastreável e pronto para revisão/submissão editorial.

REGRAS INEGOCIÁVEIS
- Leia todos os registros fornecidos das cinco fases: Ideação, Inambulação, Instauração, Inspeção e Implementação.
- Considere também as conversas completas com os agentes como diário reflexivo do processo.
- Não invente número de participantes, dados, resultados, testes, datas, referências bibliográficas, autores ou conclusões não documentadas.
- Quando faltar uma evidência necessária, escreva a lacuna de modo editorialmente útil e registre-a em editorialNotes.
- Preserve a autoria humana: a IA organiza, sintetiza e redige, mas não reivindica autoria do projeto.
- Diferencie claramente decisão de projeto, evidência observada, interpretação e reflexão metodológica.
- Produza português acadêmico brasileiro claro, sem inflar o texto com jargão.
- O artigo é um RELATO DE PROJETO/RELATO DE EXPERIÊNCIA em design, não um experimento inventado.
- Use a Metodologia 5I’s como eixo metodológico do percurso.
- Retorne somente JSON válido, sem markdown externo.

FORMATO OBRIGATÓRIO
{
  "title":"...",
  "subtitle":"...",
  "abstract":"150 a 250 palavras",
  "keywords":["4 a 6 termos"],
  "sections":[
    {"heading":"Introdução","body":"..."},
    {"heading":"Metodologia e percurso projetual","body":"..."},
    {"heading":"Desenvolvimento do projeto","body":"..."},
    {"heading":"Resultados e discussão","body":"..."},
    {"heading":"Considerações finais","body":"..."}
  ],
  "references":["somente referências bibliográficas explicitamente identificáveis nos registros; se não houver dados suficientes, deixe vazio"],
  "editorialNotes":["lacunas factuais ou bibliográficas que precisam ser conferidas antes da submissão"]
}`;

  const user = `PROJETO
${JSON.stringify(body.project, null, 2)}

FASE ATIVA NO MOMENTO DA EXPORTAÇÃO
${body.phase}

CARDS, NOTAS, CONEXÕES E REGISTROS DO CANVAS
${JSON.stringify(records, null, 2)}

CONVERSAS SALVAS COM OS AGENTES
${JSON.stringify(conversations, null, 2)}

Redija um artigo científico de relato de projeto usando todo o material pertinente. A narrativa deve reconstruir decisões, deslocamentos, métodos, protótipos, inspeções e implementação conforme o que realmente está registrado. Não transforme ausência de registro em resultado.`;
  return { system, user };
}

function cleanPublicationJson(text: string): PublicationArticle {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('O Publica não retornou JSON válido.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  if (!data.title || !data.abstract || !Array.isArray(data.keywords) || !Array.isArray(data.sections)) {
    throw new Error('O artigo retornado pelo Publica veio incompleto.');
  }
  return {
    title: String(data.title),
    subtitle: data.subtitle ? String(data.subtitle) : undefined,
    abstract: String(data.abstract),
    keywords: data.keywords.slice(0, 8).map(String),
    sections: data.sections
      .filter((section: any) => section?.heading && section?.body)
      .map((section: any) => ({ heading: String(section.heading), body: String(section.body) })),
    references: Array.isArray(data.references) ? data.references.map(String) : [],
    editorialNotes: Array.isArray(data.editorialNotes) ? data.editorialNotes.map(String) : []
  };
}

function cleanJson(text: string): MediatorInsight {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('O modelo não retornou JSON válido.');

  const data = JSON.parse(stripped.slice(start, end + 1));
  if (!data.title || !data.question || !data.scientificContext || !Array.isArray(data.provocations)) {
    throw new Error('A resposta da IA veio incompleta.');
  }

  return {
    title: String(data.title),
    question: String(data.question),
    provocations: data.provocations.slice(0, 3).map(String),
    scientificContext: String(data.scientificContext)
  };
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs = 18_000): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error: any) {
    if (error?.name === 'AbortError') throw new Error(`Tempo limite de ${Math.round(timeoutMs / 1000)} segundos excedido.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse(response: Response): Promise<any> {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`O provedor devolveu uma resposta inválida (${response.status}).`);
  }
}

async function callGroq(system: string, user: string, deep: boolean): Promise<MediatorInsight> {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new Error('GROQ_API_KEY ausente.');

  const model = deep
    ? (process.env.GROQ_DEEP_MODEL || 'qwen/qwen3.6-27b')
    : (process.env.GROQ_FAST_MODEL || 'llama-3.1-8b-instant');

  const response = await fetchWithTimeout(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ],
        temperature: 0.35,
        max_completion_tokens: 700,
        response_format: { type: 'json_object' }
      })
    },
    Number(process.env.AI_TIMEOUT_MS || 18_000)
  );

  const data = await parseResponse(response);
  if (!response.ok) {
    throw new Error(data?.error?.message || data?.message || `Falha Groq HTTP ${response.status}.`);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  return {
    ...cleanJson(text),
    provider: 'Groq',
    model: data?.model || model
  };
}

async function callGemini(system: string, user: string): Promise<MediatorInsight> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY ausente.');

  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
          maxOutputTokens: 700
        }
      })
    },
    Number(process.env.AI_TIMEOUT_MS || 18_000)
  );

  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data?.error?.message || `Falha Gemini HTTP ${response.status}.`);

  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '';
  return {
    ...cleanJson(text),
    provider: 'Gemini',
    model
  };
}

async function callGeminiPublication(system: string, user: string): Promise<PublicationResult> {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY ausente.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: {
          temperature: 0.25,
          responseMimeType: 'application/json',
          maxOutputTokens: 7000
        }
      })
    },
    Number(process.env.AI_PUBLICATION_TIMEOUT_MS || 45_000)
  );
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data?.error?.message || `Falha Gemini HTTP ${response.status}.`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('') || '';
  if (!text.trim()) throw new Error('O Gemini não devolveu conteúdo para a publicação.');
  return { article: cleanPublicationJson(text), provider: 'Gemini', model };
}

function offlineInsight(body: MediatorRequestBody): MediatorInsight {
  const role = body.mediator.role.toLowerCase();
  const phase = body.phase;
  let question = `Que evidência ainda falta para sustentar a principal decisão deste projeto na fase de ${phase}?`;
  let provocations = [
    'Identifique uma suposição ainda não verificada.',
    'Registre uma evidência observável que poderia confirmá-la ou refutá-la.',
    'Defina quem precisa participar dessa verificação.'
  ];

  if (role.includes('acess')) {
    question = 'Que barreira impede uma pessoa com diferentes modos de percepção ou ação de concluir a tarefa?';
    provocations = ['Teste somente com teclado.', 'Revise rótulos, foco e contraste.', 'Descreva uma alternativa multimodal.'];
  } else if (role.includes('bio')) {
    question = 'Quem recebe os benefícios e quem assume os riscos desta decisão de design?';
    provocations = ['Mapeie humanos e não humanos afetados.', 'Procure coerção, exclusão ou dark patterns.', 'Registre uma salvaguarda verificável.'];
  } else if (role.includes('visual')) {
    question = 'A hierarquia visual revela a prioridade real da tarefa ou apenas a preferência estética?';
    provocations = ['Liste os três primeiros elementos percebidos.', 'Compare contraste, proximidade e alinhamento.', 'Remova um ruído e teste novamente.'];
  } else if (role.includes('heur')) {
    question = 'Qual falha observável reduz previsibilidade, controle ou recuperação durante a interação?';
    provocations = ['Escolha uma heurística.', 'Registre evidência concreta.', 'Defina gravidade e critério de correção.'];
  } else if (role.includes('futuro') || role.includes('cenario') || role.includes('especul')) {
    question = 'Que futuro este projeto ajuda a tornar mais provável — e que futuro desejável ainda precisa ser deliberadamente projetado?';
    provocations = [
      'Liste um sinal fraco, uma tendência e uma contratendência já observáveis.',
      'Construa cenários contrastantes: provável, possível e desejável, explicitando a principal incerteza de cada um.',
      'Escolha o cenário desejável e faça backcasting: qual experimento pequeno pode começar agora?'
    ];
  } else if (role.includes('implement')) {
    question = 'Que critério de aceite permite verificar no código que esta decisão foi preservada?';
    provocations = ['Escreva o requisito em linguagem testável.', 'Defina estado de sucesso e falha.', 'Inclua acessibilidade, privacidade e desempenho.'];
  }

  return {
    title: 'Roteiro pedagógico offline',
    question,
    provocations,
    scientificContext: `Modo pedagógico sem API. Use como roteiro de investigação na fase ${phase}; valide depois com evidências e referências.`,
    provider: 'Modo pedagógico',
    model: 'offline'
  };
}

export async function generateMediatorInsight(body: MediatorRequestBody): Promise<MediatorInsight | PublicationResult> {
  if (!body?.project || !body?.mediator || !body?.phase) {
    throw new Error('Parâmetros obrigatórios ausentes.');
  }

  if (body.mode === 'publication') {
    const { system, user } = buildPublicationMessages(body);
    return callGeminiPublication(system, user);
  }

  const { system, user } = buildMessages(body);
  const requested = (process.env.AI_PROVIDER || 'groq').toLowerCase() as AiProvider;
  const order = (process.env.AI_FALLBACK_ORDER || 'groq,gemini,offline')
    .split(',')
    .map((value) => value.trim())
    .filter((value): value is AiProvider => ['groq', 'gemini', 'offline'].includes(value));
  const providers = [requested, ...order.filter((provider) => provider !== requested)]
    .filter((provider, index, array) => array.indexOf(provider) === index);

  const deep = /bio|heur|implement|document/i.test(body.mediator.role)
    || body.phase === 'Inspeção'
    || body.phase === 'Implementação';

  const errors: string[] = [];
  for (const provider of providers) {
    try {
      if (provider === 'groq') return await callGroq(system, user, deep);
      if (provider === 'gemini') return await callGemini(system, user);
      if (provider === 'offline') {
        return { ...offlineInsight(body), warnings: errors.length ? errors : undefined };
      }
    } catch (error: any) {
      const message = error?.message || 'erro desconhecido';
      console.error(`[5I IA] ${provider}:`, message);
      errors.push(`${provider}: ${message}`);
    }
  }

  return { ...offlineInsight(body), warnings: errors };
}
