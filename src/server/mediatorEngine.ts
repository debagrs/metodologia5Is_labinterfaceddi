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
  engine?: 'p5' | 'three' | string;
  prompt?: string;
  implementationPlan?: any;
  requestedFiles?: Array<{ path: string; purpose?: string }>;
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

function clipProjectText(value: unknown, limit = 1600) {
  const text = String(value ?? '').trim();
  return text.length > limit ? `${text.slice(0, limit)}\n[… conteúdo abreviado para geração técnica …]` : text;
}

function compactProjectContext(body: MediatorRequestBody) {
  const records = Array.isArray(body.existingThoughts) ? body.existingThoughts : [];
  const conversations = Array.isArray(body.conversations) ? body.conversations : [];
  const compactRecords = records.slice(0, 140).map((item: any) => ({
    id: item.id, type: item.type, phase: item.phase,
    title: clipProjectText(item.title, 220),
    content: clipProjectText(item.content, 1800),
    scientificContext: clipProjectText(item.scientificContext, 700),
    provocations: Array.isArray(item.provocations) ? item.provocations.slice(0, 5).map((value: unknown) => clipProjectText(value, 320)) : [],
    connections: Array.isArray(item.connections) ? item.connections.slice(0, 20) : [],
    imageName: item.imageName || '', imageUrl: clipProjectText(item.imageUrl, 700),
    drawingName: item.drawingName || '',
    interactiveName: item.interactiveName || '',
    interactive: item.interactive ? { engine: item.interactive.engine, title: clipProjectText(item.interactive.title, 180), prompt: clipProjectText(item.interactive.prompt, 900), code: clipProjectText(item.interactive.code, 2600) } : undefined,
    attachments: Array.isArray(item.attachments) ? item.attachments.slice(0, 12).map((attachment: any) => ({ name: clipProjectText(attachment?.name, 220), type: clipProjectText(attachment?.type, 120), url: clipProjectText(attachment?.url, 700) })) : [],
  }));
  const compactConversations = conversations.slice(0, 20).map((conversation: any) => ({
    mediatorId: conversation.mediatorId, mediatorName: conversation.mediatorName,
    messages: Array.isArray(conversation.messages) ? conversation.messages.slice(-16).map((message: any) => ({ role: message.role, text: clipProjectText(message.text, 900) })) : [],
  }));
  return `PROJETO\n${JSON.stringify(body.project, null, 2)}\n\nFASE ATIVA\n${body.phase}\n\nREGISTROS DO CANVAS — CONTEXTO TÉCNICO COMPACTADO\n${JSON.stringify(compactRecords, null, 2)}\n\nCONVERSAS DOS AGENTES — TRECHOS MAIS RECENTES\n${JSON.stringify(compactConversations, null, 2)}`;
}

function buildImplementationPromptMessages(body: MediatorRequestBody) {
  const system = `Você é Forja, agente de Implementação da Metodologia 5I’s. Converta a documentação real do projeto em ENGENHARIA DE PROMPT para uma IA de desenvolvimento. Preserve requisitos, público, contexto, decisões visuais, funcionalidades, acessibilidade e referências. Não invente conteúdo ausente: marque hipóteses. Solicite React + Vite + TypeScript, Supabase quando houver persistência/autenticação/storage, Vercel, .env.example, RLS, mobile-first, acessibilidade, estados de erro/loading e documentação. Retorne somente JSON válido: {"promptEngineering":"...","architectureSummary":"...","stack":["..."],"assumptions":["..."],"acceptanceCriteria":["..."]}.`;
  return { system, user: `${compactProjectContext(body)}\n\nCrie um superprompt técnico autocontido que permita reconstruir o projeto sem acesso ao canvas original.` };
}

function buildImplementationPlanMessages(body: MediatorRequestBody) {
  const system = `Você é Forja, arquiteta de implementação da Metodologia 5I’s. Nesta etapa NÃO gere o código completo. Leia a documentação compactada do projeto e produza um PLANO DE IMPLEMENTAÇÃO detalhado para que os arquivos sejam gerados em lotes curtos e coerentes. Preserve requisitos, público, conteúdo, decisões visuais, acessibilidade e referências. Não invente funcionalidades; marque inferências em assumptions. Stack padrão React + Vite + TypeScript, Supabase somente quando necessário e Vercel. Liste entre 8 e 20 arquivos e descreva em purpose seus exports/imports/contratos. Sempre inclua package.json, index.html, src/main.tsx, src/App.tsx, src/index.css, README.md e .env.example. Retorne SOMENTE JSON: {"plan":{"projectName":"...","summary":"...","architectureSummary":"...","implementationBrief":"...","stack":["..."],"routes":[{"path":"/","purpose":"..."}],"dataModel":[{"name":"...","purpose":"...","fields":["..."]}],"designSystem":{"direction":"...","tokens":["..."],"responsive":"...","accessibility":"..."},"files":[{"path":"src/App.tsx","purpose":"..."}],"assumptions":["..."],"postGenerationChecks":["..."]}}.`;
  return { system, user: `${compactProjectContext(body)}\n\nCrie o plano técnico. Não escreva ainda o conteúdo integral dos arquivos.` };
}

function buildImplementationFilesMessages(body: MediatorRequestBody) {
  const system = `Você é Forja, agente full stack da Metodologia 5I’s. Gere SOMENTE os arquivos solicitados neste lote, seguindo estritamente o plano. Código funcional, React + Vite + TypeScript, Supabase somente se previsto, mobile-first, acessível e sem segredos no cliente. Não crie imports para arquivos fora do plano. Não use TODO nas funções principais. .env.example sem valores reais. Retorne SOMENTE JSON: {"files":[{"path":"caminho/exato","content":"conteúdo integral"}]}.`;
  const user = `PLANO TÉCNICO\n${JSON.stringify(body.implementationPlan || {}, null, 2)}\n\nARQUIVOS DESTE LOTE\n${JSON.stringify(body.requestedFiles || [], null, 2)}\n\nGere exatamente esses arquivos.`;
  return { system, user };
}

function buildInteractiveCodeMessages(body: MediatorRequestBody) {
  const engine = body.engine === 'three' ? 'three' : 'p5';
  const engineRules = engine === 'three'
    ? `O código será executado em módulo depois de import * as THREE. Não escreva imports, HTML ou tags script. Use THREE, renderer, scene, camera, requestAnimationFrame e resize.`
    : `O código será executado depois de carregar p5.js global. Não escreva HTML/imports/tags script. Declare setup(), draw() e handlers necessários, usando createCanvas(windowWidth, windowHeight) e resizeCanvas.`;
  const system = `Você é Forja em modo laboratório interativo. Gere JavaScript performático, responsivo a mouse e touch, sem bibliotecas extras nem acesso a parent/localStorage. ${engineRules}

IMPORTANTE: NÃO devolva JSON. JavaScript dentro de JSON é frágil por causa de aspas e quebras de linha. Responda exatamente neste protocolo textual:
TITLE: nome curto da interação
ENGINE: ${engine}
<<<CODE>>>
JavaScript puro aqui
<<<END_CODE>>>

Não escreva explicações fora desse protocolo. Não use cercas Markdown se puder evitá-las.`;
  const context = body.existingThoughts?.slice(-30).map((item) => `[${item.phase}] ${item.title}: ${item.content}`).join('\n') || '';
  const user = `PROJETO: ${body.project.name}
PROBLEMA: ${body.project.problem}
CONTEXTO:
${context}

PROMPT: ${body.prompt || ''}`;
  return { system, user };
}

function parseJsonObject(text: string, errorMessage: string) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error(errorMessage);
  return JSON.parse(stripped.slice(start, end + 1));
}

function cleanImplementationPromptJson(text: string) {
  const data = parseJsonObject(text, 'A Forja não retornou JSON válido para a engenharia de prompt.');
  if (!data.promptEngineering) throw new Error('A engenharia de prompt retornou vazia.');
  return {
    promptEngineering: String(data.promptEngineering),
    architectureSummary: String(data.architectureSummary || ''),
    stack: Array.isArray(data.stack) ? data.stack.map(String) : [],
    assumptions: Array.isArray(data.assumptions) ? data.assumptions.map(String) : [],
    acceptanceCriteria: Array.isArray(data.acceptanceCriteria) ? data.acceptanceCriteria.map(String) : [],
  };
}

function cleanImplementationPlanJson(text: string) {
  const data = parseJsonObject(text, 'A Forja não retornou JSON válido para o plano técnico.');
  const plan = data.plan;
  if (!plan || !Array.isArray(plan.files) || plan.files.length < 5) throw new Error('O plano técnico da Forja veio incompleto.');
  const plannedFiles = plan.files.filter((file: any) => file?.path).slice(0, 22).map((file: any) => ({ path: String(file.path), purpose: String(file.purpose || '') }));
  const requiredFiles = [
    ['package.json', 'Dependências e scripts dev/build/preview do projeto Vite.'], ['index.html', 'Documento HTML de entrada do Vite.'],
    ['src/main.tsx', 'Bootstrap React e importação dos estilos globais.'], ['src/App.tsx', 'Composição principal da aplicação.'],
    ['src/index.css', 'Estilos globais, responsividade e acessibilidade.'], ['README.md', 'Documentação do projeto.'], ['.env.example', 'Variáveis públicas necessárias, sem valores reais.']
  ];
  const seen = new Set(plannedFiles.map((file: any) => file.path));
  for (const [path, purpose] of requiredFiles) if (!seen.has(path)) plannedFiles.push({ path, purpose });
  return { projectName: String(plan.projectName || 'projeto-5is'), summary: String(plan.summary || ''), architectureSummary: String(plan.architectureSummary || ''), implementationBrief: String(plan.implementationBrief || ''), stack: Array.isArray(plan.stack) ? plan.stack.map(String) : [], routes: Array.isArray(plan.routes) ? plan.routes.slice(0, 30) : [], dataModel: Array.isArray(plan.dataModel) ? plan.dataModel.slice(0, 30) : [], designSystem: plan.designSystem && typeof plan.designSystem === 'object' ? plan.designSystem : {}, files: plannedFiles.slice(0, 24), assumptions: Array.isArray(plan.assumptions) ? plan.assumptions.map(String) : [], postGenerationChecks: Array.isArray(plan.postGenerationChecks) ? plan.postGenerationChecks.map(String) : [] };
}

function cleanImplementationFilesJson(text: string, requestedFiles: Array<{ path: string; purpose?: string }> = []) {
  const data = parseJsonObject(text, 'A Forja não retornou JSON válido para este lote.');
  const requested = new Set(requestedFiles.map((file) => String(file.path)));
  const files = Array.isArray(data.files) ? data.files.filter((file: any) => file?.path && typeof file.content === 'string' && requested.has(String(file.path))).map((file: any) => ({ path: String(file.path), content: String(file.content) })) : [];
  if (!files.length) throw new Error('A Forja não devolveu os arquivos solicitados neste lote.');
  return files;
}

function cleanInteractiveResponse(text: string, fallbackEngine: 'p5' | 'three' = 'p5') {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('A interação retornou sem conteúdo.');

  try {
    const data = parseJsonObject(raw, '');
    if (data?.interactive?.code) {
      return {
        title: String(data.interactive.title || 'Interação'),
        engine: data.interactive.engine === 'three' ? 'three' : 'p5',
        code: String(data.interactive.code),
      };
    }
  } catch {
    // Compatibilidade: o novo protocolo não depende de JSON.
  }

  const titleMatch = raw.match(/^TITLE:\s*(.+)$/im);
  const engineMatch = raw.match(/^ENGINE:\s*(p5|three)$/im);
  const markerStart = raw.indexOf('<<<CODE>>>');
  const markerEnd = raw.lastIndexOf('<<<END_CODE>>>');
  let code = '';

  if (markerStart >= 0) {
    const start = markerStart + '<<<CODE>>>'.length;
    code = raw.slice(start, markerEnd > start ? markerEnd : undefined).trim();
  }
  if (!code) {
    const fenced = raw.match(/```(?:javascript|js)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) code = fenced[1].trim();
  }
  if (!code) {
    code = raw
      .replace(/^TITLE:\s*.*$/im, '')
      .replace(/^ENGINE:\s*.*$/im, '')
      .replace(/<<<CODE>>>/g, '')
      .replace(/<<<END_CODE>>>/g, '')
      .trim();
  }
  code = code
    .replace(/^```(?:javascript|js)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .replace(/^<script(?:\s[^>]*)?>\s*/i, '')
    .replace(/\s*<\/script>$/i, '')
    .trim();

  if (!code) throw new Error('A interação retornou sem código executável. Tente gerar novamente.');
  return {
    title: String(titleMatch?.[1]?.trim() || 'Interação'),
    engine: engineMatch?.[1] === 'three' ? 'three' : fallbackEngine,
    code,
  };
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

async function callGeminiStructured(system: string, user: string, maxOutputTokens = 6000, timeoutMs = 45000, temperature = 0.2) {
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
        generationConfig: { temperature, responseMimeType: 'application/json', maxOutputTokens }
      })
    },
    timeoutMs
  );
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data?.error?.message || `Falha Gemini HTTP ${response.status}.`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('').trim() || '';
  if (!text) throw new Error('O Gemini não devolveu conteúdo estruturado.');
  return { text, provider: 'Gemini', model };
}

async function callGeminiInteractive(system: string, user: string, maxOutputTokens = 5000, timeoutMs = 35000, temperature = 0.35) {
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
        generationConfig: { temperature, maxOutputTokens }
      })
    },
    timeoutMs
  );
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data?.error?.message || `Falha Gemini HTTP ${response.status}.`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('').trim() || '';
  if (!text) throw new Error('O Gemini não devolveu código para a interação.');
  return { text, provider: 'Gemini', model };
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

export async function generateMediatorInsight(body: MediatorRequestBody): Promise<any> {
  if (!body?.project || !body?.mediator || !body?.phase) {
    throw new Error('Parâmetros obrigatórios ausentes.');
  }

  if (body.mode === 'implementation-prompt') {
    const { system, user } = buildImplementationPromptMessages(body);
    const result = await callGeminiStructured(system, user, 7000, Number(process.env.AI_IMPLEMENTATION_TIMEOUT_MS || 60000), 0.18);
    return { ...cleanImplementationPromptJson(result.text), provider: result.provider, model: result.model };
  }

  if (body.mode === 'implementation-plan') {
    const { system, user } = buildImplementationPlanMessages(body);
    const result = await callGeminiStructured(system, user, 5000, Number(process.env.AI_IMPLEMENTATION_PLAN_TIMEOUT_MS || 32000), 0.15);
    return { plan: cleanImplementationPlanJson(result.text), provider: result.provider, model: result.model };
  }

  if (body.mode === 'implementation-files') {
    if (!body.implementationPlan || !Array.isArray(body.requestedFiles) || !body.requestedFiles.length) throw new Error('Plano técnico ou lote de arquivos ausente.');
    const { system, user } = buildImplementationFilesMessages(body);
    const result = await callGeminiStructured(system, user, 7000, Number(process.env.AI_IMPLEMENTATION_BATCH_TIMEOUT_MS || 38000), 0.12);
    return { files: cleanImplementationFilesJson(result.text, body.requestedFiles), provider: result.provider, model: result.model };
  }

  if (body.mode === 'interactive-code') {
    if (!String(body.prompt || '').trim()) throw new Error('Descreva a interação que deseja criar.');
    const { system, user } = buildInteractiveCodeMessages(body);
    const engine = body.engine === 'three' ? 'three' : 'p5';
    const result = await callGeminiInteractive(system, user, 5000, Number(process.env.AI_INTERACTIVE_TIMEOUT_MS || 35000), 0.35);
    return { interactive: cleanInteractiveResponse(result.text, engine), provider: result.provider, model: result.model };
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
