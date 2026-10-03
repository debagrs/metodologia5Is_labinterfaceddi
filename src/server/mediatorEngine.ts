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
  engine?: 'p5' | 'three' | 'gsap' | 'anime' | 'matter' | 'svg' | string;
  interactionMode?: 'auto' | 'pointer' | 'hover' | 'scroll' | string;
  effectPreset?: 'network' | 'breathe' | 'draw' | 'wave' | 'explode' | 'drift' | string;
  intensity?: 'subtle' | 'medium' | 'strong' | string;
  preserveBrand?: boolean;
  asset?: { url?: string; name?: string; contentType?: string; kind?: string; profile?: { palette?: string[]; counts?: Record<string, number>; sourceType?: string } } | null;
  currentTitle?: string;
  currentCode?: string;
  prompt?: string;
  implementationPlan?: any;
  requestedFiles?: Array<{ path: string; purpose?: string }>;
  wireframeSource?: { kind?: 'image' | 'drawing' | string; name?: string; url?: string; svg?: string; width?: number; height?: number };
  wireframeOptions?: { device?: 'auto' | 'mobile' | 'tablet' | 'desktop' | string; fidelity?: 'structure' | 'balanced' | 'faithful' | string };
  uxWriting?: { action?: string; sourceText?: string; originalText?: string; context?: string; screen?: string; tone?: string; sourceLocale?: string; targetLocale?: string; prompt?: string; glossary?: string[] };
  video?: any;
  character?: any;
  existingApis?: any[];
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
  divulgacao: 'Philip Kotler e Kevin Lane Keller; Kotler, Kartajaya e Setiawan (Marketing 4.0, 5.0 e 6.0); Byron Sharp e Ehrenberg-Bass; Les Binet e Peter Field; Robert Cialdini; Jonah Berger; Dave Chaffey e Fiona Ellis-Chadwick; Tracy Tuten e Michael Solomon; Simon Kingsnorth; Joe Pulizzi; Ann Handley; Avinash Kaushik; Sean Ellis e Morgan Brown; April Dunford. Proposta de valor; posicionamento; marca; canais próprios/conquistados/pagos; conteúdo; social media; SEO/ASO; comunidades; creators; imprensa; parcerias; aquisição, ativação, retenção, indicação; analytics; experimentação; monetização.',
  cosmotecnica: 'Gilbert Simondon; Yuk Hui; individuação técnica; concretização; tecnodiversidade; cosmotécnica; relação tecnologia-cultura; repertórios hi-low; apropriação crítica de tecnologias antigas, intermediárias e emergentes.',
  futuros: 'Referência prioritária: HARTMANN HINDRICHSON, Patricia. Memórias do Futuro: uma tecnologia para projetar por cenários. Tese (Doutorado em Design), UFRGS, 2022. Conceitos centrais: projetar por cenários como prática dinâmica, social, participativa e iterativa; deslocamento do problema para possibilidades; memórias do futuro; construção retrospectiva; cenários articulando atores, trama, trajetória, evidências e espaço-tempo. Referências mobilizadas na tese, conforme pertinência: Nigel Cross; Herbert Simon; Donald Schön; Rittel e Webber; Richard Buchanan; Sanders e Stappers; Kensing e Blomberg; Krippendorff; Ezio Manzini; François Jégou; Celaschi e Deserti; Paulo Reyes; Manuela Celi; Carlo Franzato; Herman Kahn e Anthony Wiener; Michel Godet; Peter Schwartz; Kees van der Heijden; Ute von Reibnitz; Pieter Desmet; Marc Hassenzahl; Anna Pohlmeyer; Roberto Verganti; David Ingvar; Michel Thiollent; Laurence Bardin. Complementares do Mago: André Coutinho e Anderson Penha; Anthony Dunne e Fiona Raby; speculative design; futures thinking; sinais e tendências; contratendências; futuros prováveis, possíveis e desejáveis; design fiction; props; narrativas; participatory futures; backcasting.'
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
  if (value.includes('marketing') || value.includes('divul') || value.includes('monetiza') || value.includes('circul')) return REFERENCES.divulgacao;
  if (value.includes('implement')) return REFERENCES.implementacao;
  return REFERENCES.ux;
}

function buildMessages(body: MediatorRequestBody) {
  const thoughts = body.existingThoughts?.length
    ? body.existingThoughts.slice(-18).map((item) => `- [${item.phase}] ${item.title}: ${item.content}`).join('\n')
    : 'Ainda não há registros no canvas.';

  const divulgaRule = body.mediator.id === 'agent-divulga'
    ? ' Para DIVULGA: seja direto e generoso em possibilidades. Entregue o plano antes de fazer perguntas. Traga marketing forte, lançamento, formatos, canais, creators, imprensa, comunidade, SEO/ASO, conteúdo, growth, métricas e monetização. Use Kotler/Keller, Marketing 4.0–6.0, Byron Sharp/Ehrenberg-Bass, Binet & Field, Cialdini, Berger, Chaffey, Tuten & Solomon, Kingsnorth, Pulizzi, Handley, Kaushik, Ellis/Brown e Dunford conforme pertinência. Relacione ideias a público, mensagem, formato, canal/ferramenta e métrica. Só não invente audiência/receita/resultados nem sugira spam, fraude ou dark patterns.'
    : '';
  const system = `Você integra a Metodologia 5I’s: Ideação, Inambulação, Instauração, Inspeção e Implementação.
Você é ${body.mediator.name}, agente de ${body.mediator.role}. ${body.mediator.bio}
Base conceitual: ${referenceFor(body.mediator.role)}
Regras: não substitua a autoria; não entregue solução acabada; questione premissas; relacione à fase ${body.phase}; não invente autores, normas ou dados; use português do Brasil; retorne somente JSON válido no formato {"title":"...","question":"...","provocations":["...","..."],"scientificContext":"..."}.${divulgaRule}`;

  const user = `PROJETO
Nome: ${body.project.name}
Tipo: ${body.project.projectType}
Problema: ${body.project.problem}
Comunidade: ${body.project.community}
ODS: ${body.project.ods}
Fase: ${body.phase}

REGISTROS
${thoughts}

${body.mode === 'chat' ? `CONVERSA RECENTE
${(body.conversation || []).slice(-12).map((item) => `${item.role}: ${item.text}`).join('\n\n')}

MENSAGEM ATUAL
${body.message || ''}

Responda à mensagem atual de forma prática e contextualizada.` : 'Crie uma reflexão inédita. Título com até seis palavras, uma pergunta central e duas ou três ações investigativas curtas.'}`;

  return { system, user };
}

function buildPublicationMessages(body: MediatorRequestBody) {
  const records = Array.isArray(body.existingThoughts) ? body.existingThoughts : [];
  const conversations = Array.isArray(body.conversations) ? body.conversations : [];

  const compactRecords = records.slice(0, 180).map((item: any) => ({
    id: item.id,
    type: item.type,
    phase: item.phase,
    title: clipProjectText(item.title, 240),
    content: clipProjectText(item.content, 1600),
    scientificContext: clipProjectText(item.scientificContext, 700),
    provocations: Array.isArray(item.provocations) ? item.provocations.slice(0, 5).map((value: unknown) => clipProjectText(value, 320)) : [],
    connections: Array.isArray(item.connections) ? item.connections.slice(0, 20) : [],
    imageName: item.imageName || '',
    drawingName: item.drawingName || '',
    attachments: Array.isArray(item.attachments) ? item.attachments.slice(0, 12).map((attachment: any) => ({
      name: clipProjectText(attachment?.name, 220),
      type: clipProjectText(attachment?.type, 120),
    })) : [],
  }));

  const compactConversations = conversations.slice(0, 24).map((conversation: any) => ({
    mediatorId: conversation.mediatorId,
    mediatorName: conversation.mediatorName,
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.slice(-18).map((message: any) => ({
          role: message.role,
          text: clipProjectText(message.text, 1000),
          createdAt: message.createdAt,
        }))
      : [],
  }));

  const system = `Você é Publica, agente editorial da Metodologia 5I’s de Design de Interfaces.
Sua tarefa é transformar documentação de projeto em um relato científico consistente, rastreável e pronto para revisão/submissão editorial.

REGRAS INEGOCIÁVEIS
- Leia todos os registros fornecidos das cinco fases: Ideação, Inambulação, Instauração, Inspeção e Implementação.
- Considere também as conversas com os agentes como diário reflexivo do processo.
- Não invente número de participantes, dados, resultados, testes, datas, referências bibliográficas, autores ou conclusões não documentadas.
- Quando faltar uma evidência necessária, escreva a lacuna de modo editorialmente útil e registre-a em editorialNotes.
- Preserve a autoria humana: a IA organiza, sintetiza e redige, mas não reivindica autoria do projeto.
- Diferencie claramente decisão de projeto, evidência observada, interpretação e reflexão metodológica.
- Produza português acadêmico brasileiro claro, sem inflar o texto com jargão.
- O artigo é um RELATO DE PROJETO/RELATO DE EXPERIÊNCIA em design, não um experimento inventado.
- Use a Metodologia 5I’s como eixo metodológico do percurso.
- Seja completo, mas conciso o suficiente para caber integralmente na resposta: prefira 2 a 4 parágrafos por seção.
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

CARDS, NOTAS, CONEXÕES E REGISTROS DO CANVAS — CONTEÚDO COMPACTADO SEM AS IMAGENS BINÁRIAS
${JSON.stringify(compactRecords, null, 2)}

CONVERSAS SALVAS COM OS AGENTES — TRECHOS MAIS RECENTES
${JSON.stringify(compactConversations, null, 2)}

Redija o relato científico usando todo o material pertinente. Reconstrua decisões, deslocamentos, métodos, protótipos, inspeções e implementação conforme o que realmente está registrado. Não transforme ausência de registro em resultado.`;
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
  const system = `Você é Forja, arquiteta de implementação da Metodologia 5I’s. Nesta etapa NÃO gere o código completo. Leia a documentação compactada do projeto e produza um PLANO DE IMPLEMENTAÇÃO detalhado para que os arquivos sejam gerados em lotes curtos e coerentes. Preserve requisitos, público, conteúdo, decisões visuais, acessibilidade e referências. Não invente funcionalidades; marque inferências em assumptions. Stack padrão React + Vite + TypeScript, Supabase somente quando necessário e Vercel. Liste entre 8 e 20 arquivos e descreva em purpose seus exports/imports/contratos. Sempre inclua package.json, tsconfig.json, tsconfig.node.json, index.html, src/main.tsx, src/App.tsx, src/index.css, README.md e .env.example. Retorne SOMENTE JSON: {"plan":{"projectName":"...","summary":"...","architectureSummary":"...","implementationBrief":"...","stack":["..."],"routes":[{"path":"/","purpose":"..."}],"dataModel":[{"name":"...","purpose":"...","fields":["..."]}],"designSystem":{"direction":"...","tokens":["..."],"responsive":"...","accessibility":"..."},"files":[{"path":"src/App.tsx","purpose":"..."}],"assumptions":["..."],"postGenerationChecks":["..."]}}.`;
  return { system, user: `${compactProjectContext(body)}\n\nCrie o plano técnico. Não escreva ainda o conteúdo integral dos arquivos.` };
}

function buildImplementationFilesMessages(body: MediatorRequestBody) {
  const system = `Você é Forja, agente full stack da Metodologia 5I’s. Gere SOMENTE os arquivos solicitados neste lote, seguindo estritamente o plano. Código funcional, React + Vite + TypeScript, Supabase somente se previsto, mobile-first, acessível e sem segredos no cliente. Não crie imports para arquivos fora do plano. Não use TODO nas funções principais. .env.example sem valores reais. Para package.json use build = "vite build" e mantenha a checagem TypeScript separada em typecheck = "tsc --noEmit"; não use "tsc && vite build". Se o lote incluir tsconfig.json ou tsconfig.node.json, gere configurações válidas para Vite + React + TypeScript. Retorne SOMENTE JSON: {"files":[{"path":"caminho/exato","content":"conteúdo integral"}]}.`;
  const user = `PLANO TÉCNICO\n${JSON.stringify(body.implementationPlan || {}, null, 2)}\n\nARQUIVOS DESTE LOTE\n${JSON.stringify(body.requestedFiles || [], null, 2)}\n\nGere exatamente esses arquivos.`;
  return { system, user };
}

function buildInteractiveCodeMessages(body: MediatorRequestBody) {
  const allowedEngines = ['p5', 'three', 'gsap', 'anime', 'matter', 'svg'] as const;
  type Engine = (typeof allowedEngines)[number];
  const engine: Engine = allowedEngines.includes(body.engine as Engine) ? body.engine as Engine : 'p5';
  const interactionMode = ['auto', 'pointer', 'hover', 'scroll'].includes(String(body.interactionMode)) ? String(body.interactionMode) : 'pointer';
  const effectPreset = ['network', 'breathe', 'draw', 'wave', 'explode', 'drift'].includes(String(body.effectPreset)) ? String(body.effectPreset) : '';
  const intensity = ['subtle', 'medium', 'strong'].includes(String(body.intensity)) ? String(body.intensity) : 'subtle';
  const preserveBrand = body.preserveBrand !== false;
  const asset = body.asset && typeof body.asset === 'object' && body.asset.url
    ? {
        url: String(body.asset.url),
        name: String(body.asset.name || 'asset'),
        contentType: String(body.asset.contentType || ''),
        kind: body.asset.kind === 'svg' ? 'svg' : 'image',
        profile: body.asset.profile && typeof body.asset.profile === 'object' ? {
          palette: Array.isArray(body.asset.profile.palette) ? body.asset.profile.palette.slice(0, 12).map(String) : [],
          counts: body.asset.profile.counts && typeof body.asset.profile.counts === 'object' ? body.asset.profile.counts : {},
          sourceType: 'svg',
        } : undefined,
      }
    : null;

  const engineRules: Record<Engine, string> = {
    p5: `p5.js já está carregado em modo global. NÃO escreva HTML, imports ou tags <script>. Declare setup(), draw() e handlers necessários. Use const canvas = createCanvas(windowWidth, windowHeight); canvas.parent(STAGE); e resizeCanvas no resize.`,
    three: `O código roda em <script type="module"> depois de import * as THREE. NÃO escreva imports adicionais, HTML ou tags <script>. Use THREE, renderer, scene, camera, requestAnimationFrame e resize; anexe renderer.domElement ao STAGE.`,
    gsap: `GSAP já está carregado globalmente na variável gsap. NÃO escreva imports, HTML ou tags <script>. Crie os elementos DOM/SVG necessários dentro de STAGE e anime com timelines/tweens do gsap.`,
    anime: `Anime.js 3.x já está carregado globalmente na função anime. NÃO escreva imports, HTML ou tags <script>. Crie os elementos DOM/SVG dentro de STAGE e anime com anime({...}).`,
    matter: `Matter.js já está carregado globalmente na variável Matter. NÃO escreva imports, HTML ou tags <script>. Use Engine, Runner/Render ou desenho próprio em canvas, mantenha a física leve e dimensione ao STAGE.`,
    svg: `SVG.js já está carregado globalmente na função SVG e GSAP também está disponível em gsap. NÃO escreva imports, HTML ou tags <script>. Crie o SVG dentro de STAGE. Para um SVG enviado, você pode usar await window.loadInteractiveSvg() dentro de uma função async/IIFE e inserir/manipular seus grupos e paths.`,
  };

  const assetRules = asset
    ? `Há um asset fornecido pelo usuário e ele deve ser tratado como parte central da interação quando o prompt pedir isso.
ASSET já existe no runtime: ${JSON.stringify(asset)}
Helpers disponíveis:
- STAGE: elemento DOM que ocupa 100% da prévia.
- ASSET: metadados do arquivo enviado (url, name, contentType, kind).
- window.createInteractiveImage(options): cria uma <img> do asset dentro de STAGE e retorna o elemento.
- window.loadInteractiveSvg(): retorna o texto do SVG remoto; use somente quando ASSET.kind === 'svg'.
Não substitua o asset por desenhos inventados se o pedido for animar a marca/imagem enviada.
Se ASSET.kind === 'svg', monte e manipule o SVG ORIGINAL usando window.loadInteractiveSvg(); nunca redesenhe uma aproximação da marca.`
    : `Não há asset enviado. Se o prompt pedir uma marca/imagem específica, trabalhe apenas com formas geradas até que o usuário envie o arquivo; não invente URL externa.`;

  const modeRules: Record<string, string> = {
    auto: 'A interação principal deve funcionar automaticamente em loop; ainda respeite resize e prefers-reduced-motion quando viável.',
    pointer: 'A interação principal deve responder tanto a mouse quanto a toque/pointer, sem depender apenas de hover.',
    hover: 'A interação deve responder a hover/foco no desktop e oferecer comportamento equivalente por toque no mobile.',
    scroll: 'A interação deve responder ao scroll quando inserida na página; como a prévia pode não rolar, inclua também fallback por wheel/pointer para ser testável.',
  };

  const system = `Você é Forja em modo laboratório de interação da Metodologia 5I’s. Gere um experimento visual executável, expressivo e performático para ser salvo como uma camada reutilizável do canvas.

MOTOR: ${engine}
${engineRules[engine]}

RUNTIME COMUM
- STAGE ocupa toda a área da prévia e já existe.
- ASSET contém o arquivo enviado ou null.
- MODE contém o modo de interação escolhido.
${assetRules}
${modeRules[interactionMode] || modeRules.pointer}

EFEITO PRÉ-SELECIONADO: ${effectPreset || 'nenhum'}
INTENSIDADE: ${intensity}
PROTEÇÃO DA MARCA: ${preserveBrand ? 'ATIVA' : 'desativada'}
${preserveBrand && asset?.kind === 'svg' ? `REGRAS DE FIDELIDADE OBRIGATÓRIAS:
- O SVG enviado é a fonte visual final. NÃO recrie, redesenhe ou substitua seus elementos.
- NÃO altere fill, stroke, gradientes, viewBox, proporções, tipografia ou ordem visual dos elementos.
- Preserve exatamente as cores detectadas: ${JSON.stringify(asset.profile?.palette || [])}.
- Para animar, prefira transform, opacity, strokeDasharray/strokeDashoffset e elementos auxiliares sobrepostos que não modifiquem a arte original.
- Se adicionar linhas de rede, use uma cor já existente na paleta do SVG e baixa opacidade.
- Ao terminar a animação/interação, os elementos devem poder retornar à composição original.` : ''}

REGRAS
- Responda a desktop e mobile/touch.
- O resultado precisa caber e se adaptar ao container, não a uma resolução fixa.
- Limite partículas/corpos/objetos para bom desempenho em celular.
- Não acesse cookies, localStorage, parent window ou APIs privadas.
- Não faça novas requisições de rede, exceto window.loadInteractiveSvg() para o asset fornecido.
- Não carregue bibliotecas adicionais: use somente o motor escolhido e os helpers já disponíveis.
- Evite áudio automático.
- Respeite a identidade visual e a intenção conceitual descritas no prompt.
- Se CÓDIGO ATUAL for fornecido, trate o pedido como uma revisão: preserve o que já funciona e devolva o CÓDIGO COMPLETO atualizado, nunca apenas um patch.
- Evite vazamentos: ao recriar a cena, não acumule listeners, loops ou canvases duplicados desnecessariamente.

IMPORTANTE: NÃO devolva JSON. Responda exatamente neste protocolo textual:
TITLE: nome curto da interação
ENGINE: ${engine}
<<<CODE>>>
JavaScript puro aqui
<<<END_CODE>>>

Não escreva explicações fora desse protocolo. Não use cercas Markdown se puder evitar.`;

  const context = body.existingThoughts?.slice(-30).map((item) => `[${item.phase}] ${item.title}: ${item.content}`).join('\n') || '';
  const user = `PROJETO: ${body.project.name}
PROBLEMA: ${body.project.problem}
FASE: ${body.phase}
MOTOR ESCOLHIDO: ${engine}
MODO DE INTERAÇÃO: ${interactionMode}
EFEITO PRÉ-SELECIONADO: ${effectPreset || 'nenhum'}
INTENSIDADE: ${intensity}
PROTEÇÃO DA MARCA: ${preserveBrand ? 'ativa' : 'desativada'}
PALETA DETECTADA: ${asset?.profile?.palette?.length ? asset.profile.palette.join(', ') : 'não disponível'}
ASSET: ${asset ? `${asset.name} (${asset.kind}) — ${asset.url}` : 'nenhum'}

CONTEXTO DO CANVAS:
${context}

CÓDIGO ATUAL (se houver, revise a partir dele):
${String(body.currentCode || '').slice(0, 14000) || 'nenhum'}

PEDIDO / NOVA INSTRUÇÃO:
${body.prompt || ''}

Gere o experimento completo usando ${engine}.`;
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
    ['package.json', 'Dependências e scripts dev/build/preview do projeto Vite; build deve ser vite build e typecheck deve ser tsc --noEmit.'], ['tsconfig.json', 'Configuração TypeScript do código React em src.'], ['tsconfig.node.json', 'Configuração TypeScript para arquivos de configuração do Vite.'], ['index.html', 'Documento HTML de entrada do Vite.'],
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

function cleanInteractiveResponse(text: string, fallbackEngine: string = 'p5') {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('A interação retornou sem conteúdo.');
  const allowedEngines = ['p5', 'three', 'gsap', 'anime', 'matter', 'svg'];
  const normalizeEngine = (value: unknown) => allowedEngines.includes(String(value)) ? String(value) : (allowedEngines.includes(fallbackEngine) ? fallbackEngine : 'p5');

  try {
    const data = parseJsonObject(raw, '');
    if (data?.interactive?.code) {
      return {
        title: String(data.interactive.title || 'Interação'),
        engine: normalizeEngine(data.interactive.engine),
        code: String(data.interactive.code),
      };
    }
  } catch {
    // Compatibilidade: o protocolo principal não depende de JSON.
  }

  const titleMatch = raw.match(/^TITLE:\s*(.+)$/im);
  const engineMatch = raw.match(/^ENGINE:\s*(p5|three|gsap|anime|matter|svg)$/im);
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
    engine: normalizeEngine(engineMatch?.[1]),
    code,
  };
}


function cleanWireframeInterpretationJson(text: string) {
  const stripped = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A interpretação do wireframe não retornou JSON válido.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  const frame = data?.frame;
  if (!frame || !Array.isArray(frame.blocks)) throw new Error('A interpretação do wireframe veio incompleta.');
  const allowedTypes = new Set(['text','button','input','image','card','navbar','list-item','spacer']);
  const cleanColor = (value: any, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
  return {
    frame: {
      name: String(frame.name || 'Interface interpretada'),
      preset: ['mobile','tablet','desktop','watch','custom'].includes(frame.preset) ? frame.preset : 'custom',
      width: Math.max(120, Math.min(2400, Number(frame.width) || 393)),
      height: Math.max(120, Math.min(4000, Number(frame.height) || 852)),
      direction: frame.direction === 'row' ? 'row' : 'column',
      gap: Math.max(0, Math.min(120, Number(frame.gap) || 12)),
      padding: Math.max(0, Math.min(160, Number(frame.padding) || 20)),
      align: ['start','center','end','stretch'].includes(frame.align) ? frame.align : 'stretch',
      background: cleanColor(frame.background, '#FFFFFF'),
      blocks: frame.blocks.slice(0, 40).map((block: any) => ({
        type: allowedTypes.has(block?.type) ? block.type : 'card', label: String(block?.label || 'Elemento').slice(0, 180),
        width: block?.width === 'hug' || block?.width === 'fill' || Number.isFinite(Number(block?.width)) ? block.width : 'fill',
        height: block?.height === 'hug' || Number.isFinite(Number(block?.height)) ? block.height : 'hug',
        padding: Math.max(0, Math.min(80, Number(block?.padding) || 0)), radius: Math.max(0, Math.min(999, Number(block?.radius) || 0)),
        background: cleanColor(block?.background, '#F4F4F2'), color: cleanColor(block?.color, '#111111'),
      }))
    },
    notes: Array.isArray(data?.notes) ? data.notes.slice(0, 6).map(String) : [],
    uncertainties: Array.isArray(data?.uncertainties) ? data.uncertainties.slice(0, 6).map(String) : [],
  };
}

function buildWireframeInterpretationMessages(body: MediatorRequestBody) {
  const source = body.wireframeSource || {};
  const device = ['auto','mobile','tablet','desktop'].includes(String(body.wireframeOptions?.device)) ? String(body.wireframeOptions?.device) : 'auto';
  const fidelity = ['structure','balanced','faithful'].includes(String(body.wireframeOptions?.fidelity)) ? String(body.wireframeOptions?.fidelity) : 'balanced';
  const system = `Converta rabiscos, screenshots e desenhos vetoriais em uma interface EDITÁVEL. Reconheça navbar, texto, botão, input, imagem, card, item de lista e spacer. Não produza imagem final. Fidelidade: ${fidelity}. Dispositivo: ${device}. Retorne somente JSON: {"frame":{"name":"...","preset":"mobile|tablet|desktop|watch|custom","width":393,"height":852,"direction":"column|row","gap":16,"padding":24,"align":"start|center|end|stretch","background":"#FFFFFF","blocks":[{"type":"navbar|text|button|input|image|card|list-item|spacer","label":"...","width":"fill|hug ou número","height":"hug ou número","padding":12,"radius":12,"background":"#F4F4F2","color":"#111111"}]},"notes":["..."],"uncertainties":["..."]}. Cores somente em HEX de 6 dígitos.`;
  const user = `Origem: ${source.name || 'esboço'}. Tipo: ${source.kind || 'image'}. Converta a estrutura visual em blocos editáveis. Quando houver dúvida, gere a hipótese mais útil e registre-a em uncertainties.`;
  return { system, user };
}

async function callGeminiWireframe(system: string, user: string, source: any, maxOutputTokens = 3600, timeoutMs = 45000) {
  if (source?.kind !== 'image' || !source?.url) {
    return callGeminiStructured(system, `${user}\n\nSVG DO DESENHO:\n${String(source?.svg || '').slice(0, 70000)}`, maxOutputTokens, timeoutMs, 0.12);
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY ausente.');
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
  const imageResponse = await fetchWithTimeout(String(source.url), {}, 12000);
  if (!imageResponse.ok) throw new Error('Não foi possível ler a imagem do esboço.');
  const mimeType = String(imageResponse.headers.get('content-type') || 'image/png').split(';')[0];
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (bytes.length > 4 * 1024 * 1024) throw new Error('A imagem é grande demais para interpretação.');
  const response = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }, { inlineData: { mimeType, data: bytes.toString('base64') } }] }],
      generationConfig: { temperature: 0.12, responseMimeType: 'application/json', maxOutputTokens }
    })
  }, timeoutMs);
  const data = await parseResponse(response);
  if (!response.ok) throw new Error(data?.error?.message || `Falha Gemini HTTP ${response.status}.`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('').trim() || '';
  if (!text) throw new Error('O Gemini não devolveu a estrutura do wireframe.');
  return { text, provider: 'Gemini', model };
}

function cleanUXWritingJson(text: string) {
  const stripped = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('O assistente de UX Writing não retornou JSON válido.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  if (!String(data?.text || '').trim()) throw new Error('O assistente de UX Writing não devolveu texto.');
  return {
    text: String(data.text).trim(),
    alternatives: Array.isArray(data.alternatives) ? data.alternatives.slice(0, 5).map(String) : [],
    notes: Array.isArray(data.notes) ? data.notes.slice(0, 5).map(String) : []
  };
}

function buildUXWritingMessages(body: MediatorRequestBody) {
  const ux = body.uxWriting || {};
  const action = String(ux.action || 'rewrite');
  const tone = String(ux.tone || 'clear');
  const glossary = Array.isArray(ux.glossary) && ux.glossary.length ? ux.glossary.join('; ') : 'sem glossário adicional';
  let task = 'reescreva o microtexto segundo o pedido adicional, preservando intenção, fatos e limites';
  if (action === 'accessible') task = 'reescreva em linguagem simples e acessível: frases curtas, voz ativa, palavras concretas, instrução explícita, sem infantilizar nem perder informação';
  if (action === 'translate') task = `traduza para ${String(ux.targetLocale || 'en-US')}, preservando tom, significado, nomes próprios, termos de produto e clareza de interface`;
  if (action === 'libras') task = 'produza um ROTEIRO/GLOSA INDICATIVA de apoio à produção em Libras, organizado de forma visual e concisa. Não afirme que é tradução final; sinalize escolhas que precisam de validação por pessoa tradutora/intérprete de Libras';
  if (action === 'variants') task = 'crie uma versão principal e até cinco alternativas curtas de microcopy';
  const system = `Você é especialista em UX Writing, linguagem simples, conteúdo acessível e localização de interfaces. ${task}. Tom desejado: ${tone}. Idioma de origem: ${String(ux.sourceLocale || 'pt-BR')}. Glossário: ${glossary}. Não invente funcionalidades, resultados ou informações ausentes. Para mensagens de erro, explique o problema e a próxima ação quando isso estiver no contexto. Para Libras, trate o resultado apenas como roteiro/glosa de apoio e inclua nota de validação humana. Retorne SOMENTE JSON válido: {"text":"...","alternatives":["..."],"notes":["..."]}.`;
  const user = `PROJETO: ${body.project?.name || 'Projeto 5I’s'}\nTELA: ${String(ux.screen || 'não informada')}\nCONTEXTO: ${String(ux.context || 'não informado')}\nTEXTO ORIGINAL: ${String(ux.originalText || ux.sourceText || '')}\nTEXTO DE TRABALHO: ${String(ux.sourceText || '')}\nPEDIDO ADICIONAL: ${String(ux.prompt || '')}`;
  return { system, user };
}


function cleanVideoPlanJson(text: string) {
  const stripped = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A IA de vídeo não retornou JSON válido.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  const allowedFormats = new Set(['reel','story','tiktok','square','feed','youtube','facebook','linkedin','custom']);
  const allowedTransitions = new Set(['cut','fade','slide','zoom']);
  const allowedMotions = new Set(['none','pan-left','pan-right','zoom-in','zoom-out','float','pulse','rotate']);
  const timeline = Array.isArray(data?.timeline) ? data.timeline.slice(0, 24).map((item: any) => ({
    mediaId: String(item?.mediaId || ''),
    name: String(item?.name || ''),
    duration: Math.max(0.5, Math.min(12, Number(item?.duration) || 2.5)),
    transition: allowedTransitions.has(String(item?.transition)) ? String(item.transition) : 'fade',
    fit: item?.fit === 'contain' ? 'contain' : 'cover',
    caption: String(item?.caption || '').slice(0, 240),
    overlayText: String(item?.overlayText || '').slice(0, 160),
    motion: allowedMotions.has(String(item?.motion)) ? String(item.motion) : 'none',
  })).filter((item: any) => item.mediaId || item.name) : [];
  return {
    title: String(data?.title || '').slice(0, 160),
    subtitle: String(data?.subtitle || '').slice(0, 260),
    format: allowedFormats.has(String(data?.format)) ? String(data.format) : undefined,
    timeline,
    notes: Array.isArray(data?.notes) ? data.notes.slice(0, 8).map(String) : [],
  };
}

function buildVideoPlanMessages(body: MediatorRequestBody) {
  const video = (body as any)?.video || {};
  const media = Array.isArray(video.media) ? video.media.slice(0, 60) : [];
  const system = `Você é montador(a), diretor(a) de motion e estrategista de conteúdo audiovisual dentro do Ateliê 5I’s. Sua tarefa é transformar a instrução do usuário e a mídia DISPONÍVEL em uma timeline editável — nunca inventar arquivos inexistentes. Priorize ritmo, clareza, legibilidade mobile, acessibilidade e coerência com o formato social escolhido. Use apenas mediaId/name presentes na lista. Retorne SOMENTE JSON válido com este formato: {"title":"...","subtitle":"...","format":"reel|story|tiktok|square|feed|youtube|facebook|linkedin|custom","timeline":[{"mediaId":"id existente","name":"nome existente","duration":2.5,"transition":"cut|fade|slide|zoom","fit":"cover|contain","motion":"none|pan-left|pan-right|zoom-in|zoom-out|float|pulse|rotate","overlayText":"texto curto opcional","caption":"texto opcional"}],"notes":["decisão de montagem"]}. Se houver pouca mídia, monte uma versão curta com o que existe em vez de inventar cenas.`;
  const user = `PEDIDO: ${String((body as any)?.prompt || '')}\nFORMATO ATUAL: ${String(video.format || '')}\nTÍTULO ATUAL: ${String(video.title || '')}\nSUBTÍTULO ATUAL: ${String(video.subtitle || '')}\nMÍDIA DISPONÍVEL:\n${media.map((m:any)=>`- ${m.id} | ${m.kind} | ${m.name}`).join('\n') || 'nenhuma mídia'}`;
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
  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const timeoutMs = Number(process.env.AI_PUBLICATION_TIMEOUT_MS || 50_000);
  const startedAt = Date.now();
  const totalBudgetMs = Math.min(54_000, Math.max(20_000, timeoutMs));
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const requestPublication = async (retry = false, attemptTimeoutMs = timeoutMs): Promise<{ text: string; finishReason?: string }> => {
    const response = await fetchWithTimeout(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{
          role: 'user',
          parts: [{ text: retry
            ? `${user}\n\nIMPORTANTE: a tentativa anterior foi interrompida ou produziu JSON inválido. Gere novamente em versão mais concisa. Mantenha todas as cinco seções, limite cada seção a no máximo 3 parágrafos e feche obrigatoriamente o objeto JSON.`
            : user }]
        }],
        generationConfig: {
          temperature: retry ? 0.15 : 0.22,
          responseMimeType: 'application/json',
          maxOutputTokens: 7000
        }
      })
    }, attemptTimeoutMs);

    const data = await parseResponse(response);
    if (!response.ok) throw new Error(data?.error?.message || `Falha Gemini HTTP ${response.status}.`);
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) throw new Error(`O Gemini bloqueou a publicação: ${blockReason}.`);

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason;
    if (finishReason && /SAFETY|RECITATION|PROHIBITED/i.test(String(finishReason))) {
      throw new Error(`O Gemini interrompeu a publicação (${finishReason}).`);
    }
    const text = candidate?.content?.parts?.map((part: any) => part?.text || '').join('').trim() || '';
    if (!text) throw new Error(`O Gemini não devolveu conteúdo para a publicação${finishReason ? ` (${finishReason})` : ''}.`);
    return { text, finishReason };
  };

  const firstAttemptTimeout = Math.min(42_000, totalBudgetMs - 8_000);
  const first = await requestPublication(false, firstAttemptTimeout);
  try {
    return { article: cleanPublicationJson(first.text), provider: 'Gemini', model };
  } catch (firstError) {
    if (first.finishReason && !/MAX_TOKENS|STOP/i.test(String(first.finishReason))) throw firstError;
    const remainingMs = totalBudgetMs - (Date.now() - startedAt) - 1_500;
    if (remainingMs < 12_000) throw firstError;
    const second = await requestPublication(true, Math.min(26_000, remainingMs));
    return { article: cleanPublicationJson(second.text), provider: 'Gemini', model };
  }
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


function cleanCharacterSvgJsonLocal(text: string) {
  const stripped = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{'); const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A IA de personagem não retornou JSON válido.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  let svg = String(data?.svg || '').trim().replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/i, '');
  const a = svg.indexOf('<svg'), b = svg.lastIndexOf('</svg>'); if (a < 0 || b < a) throw new Error('A IA não devolveu um SVG completo.');
  svg = svg.slice(a, b + 6).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/\son\w+\s*=\s*(["']).*?\1/gi, '').replace(/javascript:/gi, '');
  return { svg, description:String(data?.description||''), concept:data?.concept||{} };
}
function buildCharacterSvgMessagesLocal(body: any) {
  const c=body?.character||{};
  const system=`Você é concept artist e designer de personagens para interfaces, jogos e narrativas interativas. Gere um PERSONAGEM VETORIAL ORIGINAL em SVG, não uma imagem raster. O SVG deve ser simples, legível, responsivo, sem scripts, sem links externos, sem filtros pesados e com grupos semânticos quando possível (head, face, hair, torso, arms, legs, outfit, accessory). Preserve consistência de silhueta, paleta e proporções informadas. Não imite personagem protegido ou estilo de artista vivo específico.

Princípios de projeto: silhueta clara, shape language coerente, proporção cabeça/corpo consciente, leitura em tamanho pequeno, poses futuras possíveis e acessibilidade cromática. Forma não determina personalidade de modo universal; explique a intenção visual sem estereotipar corpo, gênero, raça, deficiência ou idade.

Retorne SOMENTE JSON válido neste formato: {"svg":"<svg ...>...</svg>","description":"...","concept":{"role":"...","archetype":"...","ageImpression":"...","personality":["..."],"keywords":["..."],"backstory":"...","silhouetteIntent":"...","shapeLanguage":"...","colorIntent":"...","movementNotes":"...","accessibilityNotes":"...","designRationale":"..."}}.`;
  const user=`NOME: ${String(c.name||'Personagem')}
DESCRIÇÃO ATUAL: ${String(c.description||'')}
PEDIDO: ${String(body?.prompt||'')}
TAMANHO DE REFERÊNCIA: ${Number(c.width)||360}x${Number(c.height)||520}
CONSTRUTOR MANUAL: ${JSON.stringify(c.builder||{})}
FICHA EXISTENTE: ${JSON.stringify(c.concept||{})}

Use as escolhas manuais como âncora. Se o pedido conflitá-las, preserve primeiro identidade, proporção e paleta e faça a mudança apenas quando explicitamente solicitada.`; return {system,user};
}
function cleanApiDefinitionJsonLocal(text:string){const stripped=String(text||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/i,'');const a=stripped.indexOf('{'),b=stripped.lastIndexOf('}');if(a<0||b<a)throw new Error('O arquiteto de API não retornou JSON válido.');const d=JSON.parse(stripped.slice(a,b+1));return {id:`custom-api-${Date.now()}`,name:String(d?.name||'API do projeto'),summary:String(d?.summary||''),basePath:String(d?.basePath||'/api'),endpoints:Array.isArray(d?.endpoints)?d.endpoints.slice(0,12):[],env:Array.isArray(d?.env)?d.env.slice(0,12):[],files:Array.isArray(d?.files)?d.files.slice(0,12):[],notes:Array.isArray(d?.notes)?d.notes.slice(0,12):[]};}
function buildApiAssistantMessagesLocal(body:any){const system=`Você é arquiteto de APIs do Ateliê 5I's. Reutilize APIs disponíveis antes de criar outra. Prefira sem chave, open source ou free tier quando adequado. Nunca exponha segredos no frontend. Retorne SOMENTE JSON válido com {"name":"...","summary":"...","basePath":"/api/...","endpoints":[{"method":"GET|POST|PUT|PATCH|DELETE","path":"/api/...","purpose":"..."}],"env":["VAR_NAME"],"files":[{"path":"api/x.ts","purpose":"..."}],"notes":["..."]}.`;const user=`PROJETO: ${String(body?.project?.name||'Projeto 5I')}\nPEDIDO: ${String(body?.prompt||'')}\nAPIS DISPONÍVEIS: ${JSON.stringify(body?.existingApis||[])}`;return {system,user};}

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
  if (body?.mode === 'character-svg') { const {system,user}=buildCharacterSvgMessagesLocal(body); const result=await callGeminiStructured(system,user,5200,Number(process.env.AI_CHARACTER_TIMEOUT_MS||45000),0.28); return {character:cleanCharacterSvgJsonLocal(result.text),provider:result.provider,model:result.model}; }
  if (body?.mode === 'api-assistant') { const {system,user}=buildApiAssistantMessagesLocal(body); const result=await callGeminiStructured(system,user,3800,Number(process.env.AI_API_ARCHITECT_TIMEOUT_MS||35000),0.16); return {apiDefinition:cleanApiDefinitionJsonLocal(result.text),provider:result.provider,model:result.model}; }
  if (body?.mode === 'wireframe-interpret') {
    if (!body.wireframeSource) throw new Error('Escolha um desenho ou imagem para interpretar.');
    const { system, user } = buildWireframeInterpretationMessages(body);
    const result = await callGeminiWireframe(system, user, body.wireframeSource, 3600, Number(process.env.AI_WIREFRAME_TIMEOUT_MS || 45000));
    return { wireframeInterpretation: cleanWireframeInterpretationJson(result.text), provider: result.provider, model: result.model };
  }
  if (body?.mode === 'video-compose') {
    if (!String(body?.prompt || '').trim()) throw new Error('Descreva o vídeo que deseja montar.');
    const { system, user } = buildVideoPlanMessages(body);
    const result = await callGeminiStructured(system, user, 3600, Number(process.env.AI_VIDEO_TIMEOUT_MS || 35000), 0.22);
    return { videoPlan: cleanVideoPlanJson(result.text), provider: result.provider, model: result.model };
  }

  if (body?.mode === 'ux-writing') {
    if (!String(body?.uxWriting?.sourceText || '').trim()) throw new Error('Escreva o texto que deseja trabalhar.');
    const { system, user } = buildUXWritingMessages(body);
    const result = await callGeminiStructured(system, user, 2400, Number(process.env.AI_UX_WRITING_TIMEOUT_MS || 30000), 0.18);
    return { uxWriting: cleanUXWritingJson(result.text), provider: result.provider, model: result.model };
  }

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
    const allowedEngines = ['p5', 'three', 'gsap', 'anime', 'matter', 'svg'];
    const engine = allowedEngines.includes(String(body.engine)) ? String(body.engine) : 'p5';
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

