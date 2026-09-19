// @ts-nocheck
import crypto from 'node:crypto';

export const maxDuration = 60;

const DATABASE_URL = process.env.TURSO_DATABASE_URL || '';
const AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN || '';
const SESSION_SECRET = process.env.SESSION_SECRET || '';

function tursoHttpUrl() {
  if (!DATABASE_URL) throw new Error('TURSO_DATABASE_URL não configurada.');
  return DATABASE_URL.replace(/^libsql:|^turso:/, 'https:').replace(/\/$/, '');
}

function tursoArg(value: any) {
  if (value === null) return { type: 'null' };
  if (typeof value === 'number') return Number.isInteger(value)
    ? { type: 'integer', value: String(value) }
    : { type: 'float', value: String(value) };
  return { type: 'text', value: String(value) };
}

async function tursoPipeline(statements: any[]) {
  if (!AUTH_TOKEN) throw new Error('TURSO_AUTH_TOKEN não configurado.');
  const response = await fetch(`${tursoHttpUrl()}/v2/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${AUTH_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ requests: [...statements.map((stmt) => ({ type: 'execute', stmt })), { type: 'close' }] }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Falha no Turso (${response.status}).`);
  const results = data?.results?.slice(0, statements.length) || [];
  for (const result of results) if (result?.type === 'error') throw new Error(result?.error?.message || 'Erro SQL no Turso.');
  return results.map((item: any) => item?.response?.result || {});
}

function tursoCellValue(cell: any) {
  if (!cell || cell.type === 'null') return null;
  if (cell.type === 'integer' || cell.type === 'float') return Number(cell.value);
  return cell.value ?? null;
}

function requireSecret() {
  if (!SESSION_SECRET || SESSION_SECRET.length < 24) throw new Error('SESSION_SECRET ausente ou muito curta.');
  return SESSION_SECRET;
}

function validateSessionToken(rawHeader: string | undefined) {
  if (!rawHeader?.startsWith('Bearer ')) return null;
  const token = rawHeader.slice(7).trim();
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const ownerId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = crypto.createHmac('sha256', requireSecret()).update(ownerId).digest('base64url');
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  return crypto.timingSafeEqual(actualBuffer, expectedBuffer) ? ownerId : null;
}

async function consumeAiQuota(ownerId: string, dailyLimit: number) {
  await tursoPipeline([{
    sql: `CREATE TABLE IF NOT EXISTS ai_daily_usage (
      owner_id TEXT NOT NULL,
      usage_date TEXT NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (owner_id, usage_date)
    )`,
  }]);
  const limit = Math.max(1, Math.min(100, Math.trunc(dailyLimit || 20)));
  const usageDate = new Date().toISOString().slice(0, 10);
  const [result] = await tursoPipeline([{
    sql: `INSERT INTO ai_daily_usage (owner_id, usage_date, request_count, updated_at)
          VALUES (?, ?, 1, datetime('now'))
          ON CONFLICT(owner_id, usage_date) DO UPDATE SET
            request_count = request_count + 1,
            updated_at = datetime('now')
          RETURNING request_count`,
    args: [tursoArg(ownerId), tursoArg(usageDate)],
  }]);
  const count = Number(tursoCellValue(result?.rows?.[0]?.[0]) || 0);
  if (count > limit) throw new Error('Limite diário de mediações atingido. Tente novamente amanhã.');
  return Math.max(0, limit - count);
}

const METHODOLOGY = {
  Ideação: {
    purpose: 'abrir o problema, organizar repertórios, produzir conexões, hipóteses e perguntas sem fechar a solução',
    practices: 'mapas mentais, levantamento inicial, repertório visual, referências, personas provisórias, problematização, delimitação do escopo',
    cautions: 'evitar solucionismo, homogeneização algorítmica, persona inventada e fechamento precoce'
  },
  Inambulação: {
    purpose: 'caminhar no contexto, observar, escutar e compreender o ecossistema real do projeto',
    practices: 'pesquisa de campo, cartografia, entrevistas, observação, pesquisa participante, benchmarking crítico, análise de similares e decisões tecnológicas situadas',
    cautions: 'não substituir campo por síntese de IA; não confundir benchmarking com cópia; registrar vozes, fricções, territorialidades e ausências'
  },
  Instauração: {
    purpose: 'materializar relações em estruturas, fluxos e protótipos experimentáveis',
    practices: 'arquitetura da informação, jornadas, rabiscoframes, wireframes, fluxos, linguagem visual, semiótica, design system e protótipos funcionais',
    cautions: 'não cair no figmarismo, no template universal ou na estética sem contexto; preservar diferença, autoria e vínculo com a pesquisa'
  },
  Inspeção: {
    purpose: 'avaliar continuamente escolhas, usos, barreiras, riscos e diferenças entre intenção e experiência observada',
    practices: 'testes com participantes, heurísticas, acessibilidade, ergonomia cognitiva, mapas de calor usados criticamente, severidade, feedback e iteração',
    cautions: 'não tratar dados comportamentais como neutros; respeitar privacidade, consentimento, LGPD e limites do capitalismo de vigilância'
  },
  Implementação: {
    purpose: 'transformar decisões em sistema funcional, documentado, testável e passível de continuidade',
    practices: 'componentes, tokens, critérios de aceite, requisitos, código, testes, segurança, desempenho, publicação, documentação e manutenção',
    cautions: 'não entender implementação como fim linear; preservar rastreabilidade, acessibilidade, bioética, contexto e possibilidade de revisão'
  }
};

const AGENT_GUIDES = {
  'agent-idea': 'Priorize Ideação. Use Gasparetto, Santaella, Manovich e Flusser para ampliar repertório, subjetividade, cultura visual e imaginação crítica.',
  'agent-mago': `Priorize Ideação por cenários futuros. Você NÃO prevê o futuro como certeza; você ajuda a projetar possibilidades e a usar futuros para questionar decisões do presente.
BASE: design estratégico a partir do futuro de André Coutinho e Anderson Penha, difundido por Patricia Hartmann; speculative design de Anthony Dunne e Fiona Raby; narrativas de futuros, everyday things, time travelling, participatory futures e create your own narrative. Mantenha também a lente ética e social trabalhada no laboratório com Sasha Costanza-Chock, Mike Monteiro, Critical Design Lab e Guto Requena.
MÉTODO DE CONVERSA: (1) formular uma pergunta de futuro; (2) identificar sinais, tendências, contratendências e incertezas críticas; (3) distinguir futuro provável, possível/plausível e desejável; (4) construir 2 a 4 cenários contrastantes, nunca uma única previsão; (5) perguntar quem se beneficia, quem é excluído e quais impactos humanos, não humanos, sociais e ambientais surgem; (6) quando útil, materializar o cenário como narrativa, artefato/prop, interface, notícia, objeto cotidiano ou pequeno design fiction; (7) fazer backcasting do futuro desejável para uma decisão ou experimento no presente.
Evite futurismo tecnológico automático, determinismo, hype e solução mágica. Explicite sempre o que é evidência presente, hipótese, incerteza e especulação.`,
  'agent-passeio': 'Priorize Inambulação. Use cartografia, pesquisa participante, etnografia de interfaces, Latour e Costanza-Chock. Sempre devolva a pessoa ao território e à escuta.',
  'agent-instaura': 'Priorize Instauração. Use Norman, Preece/Rogers/Sharp, Gestalt, Heller, semiótica, arquitetura da informação e prototipação. Evite figmarismo e respostas visuais genéricas.',
  'agent-inspetor': 'Priorize Inspeção. Use Nielsen, Norman, ergonomia cognitiva, testes, WCAG/e-MAG e evidências observáveis. Diferencie opinião de problema documentado.',
  'agent-rede': 'Leia o projeto como rede sociotécnica com Latour, Simondon e Haraway: humanos, não humanos, instituições, dados, dispositivos, plataformas e infraestruturas.',
  'agent-ativista': 'Atue por bioética, design justice e educação humanitária com Potter, Haraway, Costanza-Chock e Zuboff. Pergunte sobre poder, participação, extração, sustentabilidade e impactos humanos e não humanos.',
  'agent-responsa': 'Converta responsabilidade em requisitos verificáveis: WCAG, e-MAG, desenho universal, linguagem simples, LGPD, segurança, transparência e possibilidade de recusa.',
  'agent-implementa': 'Priorize Implementação como experimentação contínua: design systems, tokens, componentes, documentação, critérios de aceite, testes, publicação e manutenção.',
  'agent-forja': 'Atue na Implementação como arquiteto e desenvolvedor full stack orientado pela documentação do projeto. Leia cards, referências, requisitos, imagens e relações antes de propor tecnologia. Gere código rastreável às decisões do projeto, com React/Vite/TypeScript no front-end, Supabase como backend quando pertinente e Vercel como alvo de deploy. Nunca exponha chaves secretas no cliente; use RLS no Supabase; preserve acessibilidade, responsividade e critérios registrados.',
  'agent-publica': 'Atue como agente editorial científico da Metodologia 5I’s. Reconstrua o percurso a partir das evidências registradas, preserve rastreabilidade, diferencie dado, decisão e interpretação, e jamais invente resultados, participantes ou referências.'
};

function phaseGuide(phase) {
  return METHODOLOGY[phase] || METHODOLOGY.Ideação;
}

function agentGuide(mediator) {
  return AGENT_GUIDES[mediator?.id] || mediator?.bio || 'Atue como mediador crítico da Metodologia 5I’s.';
}

function canvasSummary(body) {
  return body.existingThoughts?.length
    ? body.existingThoughts.slice(-18).map((item) => `- [${item.phase}] ${item.title}: ${item.content}`).join('\n')
    : 'Ainda não há registros no canvas.';
}

function baseSystem(body) {
  const guide = phaseGuide(body.phase);
  return `Você integra o 5I’s Design Intelligence Lab, baseado na Metodologia 5I’s de Débora Aita Gasparetto: Ideação, Inambulação, Instauração, Inspeção e Implementação.

Você é ${body.mediator.name}, um agente artificial de ${body.mediator.role}.
IDENTIDADE DO AGENTE: ${agentGuide(body.mediator)}

FASE ATIVA — ${body.phase}
Objetivo: ${guide.purpose}.
Práticas esperadas: ${guide.practices}.
Cuidados críticos: ${guide.cautions}.

ORIENTAÇÃO EPISTEMOLÓGICA
- A IA é mediação sociotécnica e extensão de co-criação, não autora soberana nem resposta automática.
- Não substitua campo, escuta, participação, decisão humana ou autoria do estudante.
- Questione solucionismo, padronização, figmarismo, desigualdades, opacidade, extração de dados e impactos ambientais.
- Preserve subjetividade, diferença, territorialidade, acessibilidade, bioética e participação.
- Só cite autores, normas ou conceitos quando forem pertinentes. Nunca invente referência, dado, lei ou resultado de pesquisa.
- Fale em português do Brasil, com linguagem direta, crítica, afetiva e metodologicamente exigente.
- Não elogie de forma vazia. Mostre o que está forte, o que falta e qual próximo movimento é coerente com a fase.`;
}

function buildMessages(body) {
  const system = `${baseSystem(body)}
Para esta tarefa, retorne somente JSON válido no formato {"title":"...","question":"...","provocations":["...","..."],"scientificContext":"..."}.`;

  const user = `PROJETO
Nome: ${body.project.name}
Tipo: ${body.project.projectType}
Problema: ${body.project.problem}
Comunidade: ${body.project.community}
ODS: ${body.project.ods}
Fase: ${body.phase}

REGISTROS DO CANVAS
${canvasSummary(body)}

Crie uma reflexão inédita. Título com até seis palavras, uma pergunta central e duas ou três ações investigativas curtas. O contexto científico deve explicar por que essas ações pertencem à fase ativa e ao eixo do agente.`;

  return { system, user };
}

function buildChatMessages(body) {
  const history = Array.isArray(body.conversation)
    ? body.conversation.slice(-12).map((item) => `${item.role === 'assistant' ? body.mediator.name : 'Pessoa'}: ${item.text}`).join('\n\n')
    : '';

  const system = `${baseSystem(body)}
Você está em uma conversa. Responda de modo dialógico, em até 260 palavras.
Estruture naturalmente a resposta com:
1) uma leitura do que a pessoa trouxe;
2) uma tensão ou pergunta que faça avançar;
3) um próximo movimento concreto compatível com a fase;
4) uma referência teórica ou metodológica apenas quando realmente ajudar.
Você pode discordar com cuidado. Não entregue solução fechada. Não retorne JSON dentro do campo reply.`;

  const user = `PROJETO
Nome: ${body.project.name}
Tipo: ${body.project.projectType}
Problema: ${body.project.problem}
Comunidade: ${body.project.community}
ODS: ${body.project.ods}
Fase: ${body.phase}

REGISTROS DO CANVAS
${canvasSummary(body)}

CONVERSA RECENTE
${history || 'Início da conversa.'}

MENSAGEM ATUAL
${body.message}`;

  return { system, user };
}

function buildPublicationMessages(body) {
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

function clipText(value, limit = 1600) {
  const text = String(value || '').trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}\n[… conteúdo abreviado para geração técnica …]`;
}

function compactProjectContext(body) {
  const records = Array.isArray(body.existingThoughts) ? body.existingThoughts : [];
  const conversations = Array.isArray(body.conversations) ? body.conversations : [];

  const compactRecords = records.slice(0, 140).map((item) => ({
    id: item.id,
    type: item.type,
    phase: item.phase,
    title: clipText(item.title, 220),
    content: clipText(item.content, 1800),
    scientificContext: clipText(item.scientificContext, 700),
    provocations: Array.isArray(item.provocations) ? item.provocations.slice(0, 5).map((value) => clipText(value, 320)) : [],
    connections: Array.isArray(item.connections) ? item.connections.slice(0, 20) : [],
    imageName: item.imageName || '',
    imageUrl: clipText(item.imageUrl, 700),
    drawingName: item.drawingName || '',
    interactiveName: item.interactiveName || '',
    interactive: item.interactive ? {
      engine: item.interactive.engine,
      title: clipText(item.interactive.title, 180),
      prompt: clipText(item.interactive.prompt, 900),
      code: clipText(item.interactive.code, 2600),
    } : undefined,
    attachments: Array.isArray(item.attachments)
      ? item.attachments.slice(0, 12).map((attachment) => ({
          name: clipText(attachment?.name, 220),
          type: clipText(attachment?.type, 120),
          url: clipText(attachment?.url, 700),
        }))
      : [],
  }));

  const compactConversations = conversations.slice(0, 20).map((conversation) => ({
    mediatorId: conversation.mediatorId,
    mediatorName: conversation.mediatorName,
    messages: Array.isArray(conversation.messages)
      ? conversation.messages.slice(-16).map((message) => ({
          role: message.role,
          text: clipText(message.text, 900),
        }))
      : [],
  }));

  return `PROJETO\n${JSON.stringify(body.project, null, 2)}\n\nFASE ATIVA\n${body.phase}\n\nREGISTROS DO CANVAS — CONTEXTO TÉCNICO COMPACTADO\n${JSON.stringify(compactRecords, null, 2)}\n\nCONVERSAS DOS AGENTES — TRECHOS MAIS RECENTES\n${JSON.stringify(compactConversations, null, 2)}`;
}

function buildImplementationPromptMessages(body) {
  const system = `Você é Forja, agente de Implementação da Metodologia 5I’s. Sua tarefa é converter documentação real de um projeto em ENGENHARIA DE PROMPT para outra IA de desenvolvimento.

REGRAS
- Leia todo o material fornecido antes de escrever o prompt.
- Preserve requisitos, público, contexto, decisões visuais, funcionalidades, acessibilidade, sustentabilidade e referências registradas.
- Não invente features, dados, pesquisas, personas, identidade visual ou integrações ausentes; quando precisar assumir algo, marque explicitamente como HIPÓTESE A VALIDAR.
- O prompt final deve solicitar uma aplicação full stack responsiva e acessível, preferencialmente React + Vite + TypeScript no front-end, Supabase no backend/banco/autenticação quando necessário e Vercel no deploy.
- Exija variáveis de ambiente, .env.example, políticas RLS, nenhum segredo no front-end, tratamento de erros, estados vazios/loading, mobile-first e documentação de implantação.
- Inclua instruções para gerar supabase/schema.sql, README e estrutura pronta para GitHub/Vercel.
- Não reduza o projeto a um template genérico: faça a IA respeitar a documentação do canvas.

Retorne SOMENTE JSON válido no formato:
{"promptEngineering":"prompt completo e autocontido em markdown","architectureSummary":"resumo da arquitetura proposta","stack":["..."],"assumptions":["..."],"acceptanceCriteria":["..."]}`;
  const user = `${compactProjectContext(body)}\n\nTransforme este material em um superprompt técnico autocontido para implementação. O prompt deve ser suficientemente detalhado para que outra IA consiga reconstruir o projeto sem ter acesso ao canvas original.`;
  return { system, user };
}

function buildImplementationPlanMessages(body) {
  const system = `Você é Forja, arquiteta de implementação da Metodologia 5I’s. Nesta etapa NÃO gere o código completo. Leia a documentação compactada do projeto e produza um PLANO DE IMPLEMENTAÇÃO suficientemente detalhado para que os arquivos possam ser gerados em lotes curtos e coerentes.

REGRAS
- Preserve requisitos, público, conteúdo, decisões visuais, acessibilidade, relações e referências registradas.
- Não invente funcionalidades; qualquer inferência necessária deve ir para assumptions.
- Stack padrão: React + Vite + TypeScript; Supabase somente quando houver necessidade de persistência, autenticação, storage ou backend; deploy Vercel.
- O plano deve explicitar rotas/telas, modelo de dados, componentes, identidade visual, comportamento responsivo, acessibilidade e contratos entre arquivos.
- Liste entre 8 e 20 arquivos de texto. Sempre inclua package.json, tsconfig.json, tsconfig.node.json, index.html, src/main.tsx, src/App.tsx, src/index.css, README.md e .env.example. Quando houver Supabase, inclua src/lib/supabase.ts e supabase/schema.sql.
- Descreva em purpose o que cada arquivo deve exportar, importar e fazer, para que lotes independentes permaneçam compatíveis.
- Retorne SOMENTE JSON válido, sem markdown externo.

FORMATO
{
  "plan": {
    "projectName":"slug-do-projeto",
    "summary":"...",
    "architectureSummary":"...",
    "implementationBrief":"especificação técnica autocontida e objetiva",
    "stack":["..."],
    "routes":[{"path":"/","purpose":"..."}],
    "dataModel":[{"name":"...","purpose":"...","fields":["..."]}],
    "designSystem":{"direction":"...","tokens":["..."],"responsive":"...","accessibility":"..."},
    "files":[{"path":"src/App.tsx","purpose":"responsabilidade, exports, imports e contratos"}],
    "assumptions":["..."],
    "postGenerationChecks":["..."]
  }
}`;
  const user = `${compactProjectContext(body)}\n\nCrie o plano técnico de implementação. Esta etapa deve ser curta o suficiente para uma função serverless: não escreva o conteúdo integral dos arquivos ainda.`;
  return { system, user };
}

function buildImplementationFilesMessages(body) {
  const plan = body.implementationPlan || {};
  const requestedFiles = Array.isArray(body.requestedFiles) ? body.requestedFiles : [];
  const system = `Você é Forja, agente full stack da Metodologia 5I’s. Gere SOMENTE os arquivos solicitados neste lote, obedecendo estritamente ao plano técnico recebido.

REGRAS
- Produza código funcional e consistente com os contratos do plano.
- React + Vite + TypeScript no front-end. Supabase somente se estiver previsto no plano.
- Mobile-first, responsivo, semântico e acessível.
- Nunca exponha service role, senhas ou segredos no cliente.
- Use VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY e RLS quando previsto.
- Não crie imports para arquivos que não estejam listados no plano.
- Não use TODO nas funções principais.
- package.json precisa de scripts dev/build/preview válidos. Para Vite, use obrigatoriamente build = "vite build"; coloque a checagem TypeScript separada em typecheck = "tsc --noEmit". NÃO use "tsc && vite build" como script de build.
- .env.example nunca contém valores reais.
- Para supabase/schema.sql, gere SQL idempotente quando possível, habilite RLS e políticas coerentes com o plano.
- Preserve conteúdo e linguagem do projeto descritos em implementationBrief.
- Retorne SOMENTE JSON válido.

FORMATO
{"files":[{"path":"caminho/exato","content":"conteúdo integral"}]}`;
  const user = `PLANO TÉCNICO\n${JSON.stringify(plan, null, 2)}\n\nARQUIVOS DESTE LOTE\n${JSON.stringify(requestedFiles, null, 2)}\n\nGere exatamente esses arquivos. Não gere arquivos de outros lotes.`;
  return { system, user };
}

function buildInteractiveCodeMessages(body) {
  const engine = body.engine === 'three' ? 'three' : 'p5';
  const engineRules = engine === 'three'
    ? `O código será executado dentro de <script type="module"> após a linha: import * as THREE from 'three.module.js'. Portanto NÃO escreva imports, HTML ou tags <script>. Use a variável THREE já disponível. Crie renderer, scene, camera, animação e resize. O canvas deve preencher window.innerWidth/window.innerHeight e responder a mouse e touch quando pertinente.`
    : `O código será executado depois de carregar p5.js em modo global. Portanto NÃO escreva HTML, imports ou tags <script>. Declare setup(), draw() e, quando pertinente, mouse/touch handlers e windowResized(). Use createCanvas(windowWidth, windowHeight) e resizeCanvas.`;
  const system = `Você é Forja em modo laboratório de interação. Gere um pequeno experimento visual executável e performático para ser salvo como camada do canvas da Metodologia 5I’s.
${engineRules}
- Responda a desktop e mobile/touch.
- Evite bibliotecas extras, rede, áudio automático e assets externos não fornecidos.
- Limite loops/partículas para manter desempenho em celular.
- Não acesse cookies, localStorage, parent window ou APIs privadas.
- Preserve a intenção estética e conceitual do prompt.

IMPORTANTE: NÃO devolva JSON. JavaScript dentro de JSON é frágil por causa de aspas e quebras de linha. Responda exatamente neste protocolo textual:
TITLE: nome curto da interação
ENGINE: ${engine}
<<<CODE>>>
JavaScript puro aqui
<<<END_CODE>>>

Não escreva explicações fora desse protocolo. Não use cercas Markdown se puder evitá-las.`;
  const context = Array.isArray(body.existingThoughts)
    ? body.existingThoughts.slice(-30).map((item) => `[${item.phase}] ${item.title}: ${item.content}`).join('\n')
    : '';
  const user = `PROJETO: ${body.project?.name || ''}
PROBLEMA: ${body.project?.problem || ''}
CONTEXTO DO CANVAS:
${context}

PROMPT DA INTERAÇÃO:
${String(body.prompt || '')}

Gere o experimento em ${engine === 'three' ? 'Three.js' : 'p5.js'}.`;
  return { system, user };
}

function cleanImplementationPromptJson(text) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A Forja não retornou JSON válido para a engenharia de prompt.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  if (!data.promptEngineering) throw new Error('A engenharia de prompt retornou vazia.');
  return {
    promptEngineering: String(data.promptEngineering),
    architectureSummary: String(data.architectureSummary || ''),
    stack: Array.isArray(data.stack) ? data.stack.map(String) : [],
    assumptions: Array.isArray(data.assumptions) ? data.assumptions.map(String) : [],
    acceptanceCriteria: Array.isArray(data.acceptanceCriteria) ? data.acceptanceCriteria.map(String) : [],
  };
}

function cleanImplementationPlanJson(text) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A Forja não retornou JSON válido para o plano técnico.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  const plan = data.plan;
  if (!plan || !Array.isArray(plan.files) || plan.files.length < 5) throw new Error('O plano técnico da Forja veio incompleto.');
  const plannedFiles = plan.files
    .filter((file) => file?.path)
    .slice(0, 22)
    .map((file) => ({ path: String(file.path), purpose: String(file.purpose || '') }));
  const requiredFiles = [
    ['package.json', 'Dependências e scripts dev/build/preview do projeto Vite; build deve ser vite build e typecheck deve ser tsc --noEmit.'],
    ['tsconfig.json', 'Configuração TypeScript do código React em src.'],
    ['tsconfig.node.json', 'Configuração TypeScript para arquivos de configuração do Vite.'],
    ['index.html', 'Documento HTML de entrada do Vite.'],
    ['src/main.tsx', 'Bootstrap React e importação dos estilos globais.'],
    ['src/App.tsx', 'Composição principal da aplicação, rotas/telas e fluxo central.'],
    ['src/index.css', 'Estilos globais, tokens visuais, responsividade e acessibilidade.'],
    ['README.md', 'Documentação do projeto, execução local e decisões principais.'],
    ['.env.example', 'Variáveis de ambiente públicas necessárias, sem valores reais.'],
  ];
  const seen = new Set(plannedFiles.map((file) => file.path));
  for (const [path, purpose] of requiredFiles) {
    if (!seen.has(path)) {
      plannedFiles.push({ path, purpose });
      seen.add(path);
    }
  }
  return {
    projectName: String(plan.projectName || 'projeto-5is'),
    summary: String(plan.summary || ''),
    architectureSummary: String(plan.architectureSummary || ''),
    implementationBrief: String(plan.implementationBrief || ''),
    stack: Array.isArray(plan.stack) ? plan.stack.map(String) : [],
    routes: Array.isArray(plan.routes) ? plan.routes.slice(0, 30) : [],
    dataModel: Array.isArray(plan.dataModel) ? plan.dataModel.slice(0, 30) : [],
    designSystem: plan.designSystem && typeof plan.designSystem === 'object' ? plan.designSystem : {},
    files: plannedFiles.slice(0, 24),
    assumptions: Array.isArray(plan.assumptions) ? plan.assumptions.map(String) : [],
    postGenerationChecks: Array.isArray(plan.postGenerationChecks) ? plan.postGenerationChecks.map(String) : [],
  };
}

function cleanImplementationFilesJson(text, requestedFiles) {
  const stripped = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A Forja não retornou JSON válido para este lote de arquivos.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  const requestedPaths = new Set((requestedFiles || []).map((file) => String(file.path || file)));
  const files = Array.isArray(data.files)
    ? data.files
        .filter((file) => file?.path && typeof file.content === 'string' && requestedPaths.has(String(file.path)))
        .map((file) => ({ path: String(file.path), content: String(file.content) }))
    : [];
  if (!files.length) throw new Error('A Forja não devolveu os arquivos solicitados neste lote.');
  return files;
}

function cleanInteractiveResponse(text, fallbackEngine = 'p5') {
  const raw = String(text || '').trim();
  if (!raw) throw new Error('A interação retornou sem conteúdo.');

  try {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const data = JSON.parse(stripped.slice(start, end + 1));
      if (data?.interactive?.code) {
        return {
          title: String(data.interactive.title || 'Interação'),
          engine: data.interactive.engine === 'three' ? 'three' : 'p5',
          code: String(data.interactive.code),
        };
      }
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

function cleanPublicationJson(text) {
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
    sections: data.sections.filter((section) => section?.heading && section?.body).map((section) => ({
      heading: String(section.heading),
      body: String(section.body)
    })),
    references: Array.isArray(data.references) ? data.references.map(String) : [],
    editorialNotes: Array.isArray(data.editorialNotes) ? data.editorialNotes.map(String) : []
  };
}

function cleanJson(text) {
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

async function fetchWithTimeout(url, init, timeoutMs = 18_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error(`Tempo limite de ${Math.round(timeoutMs / 1000)} segundos excedido.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function parseResponse(response) {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`O provedor devolveu uma resposta inválida (${response.status}).`);
  }
}

async function callGemini(system, user) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');
  }

  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 25000);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetchWithTimeout(
    endpoint,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: system }]
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: user }]
          }
        ],
        generationConfig: {
          temperature: 0.35,
          responseMimeType: 'application/json',
          maxOutputTokens: 1000
        }
      })
    },
    timeoutMs
  );

  const raw = await response.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    throw new Error(`O Gemini devolveu uma resposta não JSON (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const providerMessage = data?.error?.message || data?.message || `HTTP ${response.status}`;
    throw new Error(`Gemini ${model}: ${providerMessage}`);
  }

  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`O Gemini bloqueou a solicitação: ${blockReason}.`);
  }

  const candidate = data?.candidates?.[0];
  const finishReason = candidate?.finishReason;
  const text = candidate?.content?.parts
    ?.map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim();

  if (!text) {
    throw new Error(
      `O Gemini não devolveu conteúdo${finishReason ? ` (motivo: ${finishReason})` : ''}.`
    );
  }

  return {
    ...cleanJson(text),
    provider: 'Gemini',
    model
  };
}


async function callGeminiChat(system, user) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');

  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 25000);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature: 0.55, maxOutputTokens: 900 }
    })
  }, timeoutMs);

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`O Gemini devolveu uma resposta não JSON (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Gemini ${model}: ${data?.error?.message || `HTTP ${response.status}`}`);

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim();

  if (!text) throw new Error('O Gemini não devolveu conteúdo para a conversa.');
  return { reply: text, provider: 'Gemini', model };
}

async function callGeminiPublication(system, user) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');

  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const timeoutMs = Number(process.env.AI_PUBLICATION_TIMEOUT_MS || 45000);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;

  const response = await fetchWithTimeout(endpoint, {
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
  }, timeoutMs);

  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`O Gemini devolveu uma resposta não JSON (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Gemini ${model}: ${data?.error?.message || `HTTP ${response.status}`}`);

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => typeof part?.text === 'string' ? part.text : '')
    .join('')
    .trim();
  if (!text) throw new Error('O Gemini não devolveu conteúdo para a publicação.');

  return { article: cleanPublicationJson(text), provider: 'Gemini', model };
}

async function callGeminiStructured(system, user, maxOutputTokens = 6000, timeoutMs = 45000, temperature = 0.2) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');
  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature, responseMimeType: 'application/json', maxOutputTokens }
    })
  }, timeoutMs);
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`O Gemini devolveu uma resposta não JSON (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Gemini ${model}: ${data?.error?.message || `HTTP ${response.status}`}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => typeof part?.text === 'string' ? part.text : '').join('').trim();
  if (!text) throw new Error('O Gemini não devolveu conteúdo estruturado.');
  return { text, provider: 'Gemini', model };
}

async function callGeminiInteractive(system, user, maxOutputTokens = 5000, timeoutMs = 35000, temperature = 0.35) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');
  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }] }],
      generationConfig: { temperature, maxOutputTokens }
    })
  }, timeoutMs);
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`O Gemini devolveu uma resposta de transporte inválida (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Gemini ${model}: ${data?.error?.message || `HTTP ${response.status}`}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => typeof part?.text === 'string' ? part.text : '').join('').trim();
  if (!text) throw new Error('O Gemini não devolveu código para a interação.');
  return { text, provider: 'Gemini', model };
}

function offlineInsight(body) {
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

async function generateMediatorInsight(body) {
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
    if (!body.implementationPlan || !Array.isArray(body.requestedFiles) || !body.requestedFiles.length) {
      throw new Error('Plano técnico ou lote de arquivos ausente.');
    }
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

  if (body.mode === 'chat') {
    if (!String(body.message || '').trim()) throw new Error('Escreva uma mensagem para conversar com o agente.');
    const { system, user } = buildChatMessages(body);
    return callGeminiChat(system, user);
  }

  const { system, user } = buildMessages(body);
  return callGemini(system, user);
}

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

    const shouldCountQuota = req.body?.mode !== 'implementation-files';
    if (ownerId && shouldCountQuota) {
      try {
        remainingToday = await consumeAiQuota(ownerId, Number(process.env.AI_DAILY_LIMIT || 20));
      } catch (quotaError: any) {
        const message = quotaError?.message || 'Falha ao consultar a cota diária.';
        if (/Limite diário/i.test(message)) return res.status(429).json({ error: message, stage: 'quota' });
        console.error('[5I API] Turso/cota indisponível:', quotaError);
        warnings.push('A IA respondeu, mas o controle de cota do Turso não pôde ser atualizado.');
      }
    } else if (!ownerId) {
      warnings.push('Sessão de nuvem indisponível; a IA foi executada sem contabilizar a cota.');
    }

    const insight = await generateMediatorInsight(req.body);
    return res.status(200).json({
      ...insight,
      remainingToday,
      warnings: [...warnings, ...(insight.warnings || [])],
    });
  } catch (error: any) {
    console.error('[5I API /api/mediators/think]', error);
    return res.status(502).json({
      error: error?.message || 'O Gemini não conseguiu gerar a mediação.',
      stage: 'gemini',
      provider: 'Gemini',
      model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
    });
  }
}
