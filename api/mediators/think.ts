// @ts-nocheck
import { parseVideoComposition, videoCompositionRules } from '../../src/lib/videoComposition';
import { sketchVisualParts, sketchContext, threeSketchRules } from '../../src/lib/interactiveAI';
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

REFERÊNCIA CENTRAL — PATRICIA HARTMANN HINDRICHSON:
HARTMANN HINDRICHSON, Patricia. Memórias do Futuro: uma tecnologia para projetar por cenários. 2022. 318 f. Tese (Doutorado em Design) — Universidade Federal do Rio Grande do Sul, Porto Alegre, 2022. Trate esta tese como referência prioritária do Mago sempre que a conversa envolver cenários, futuros, cocriação de possibilidades, narrativas futuras, retrospectiva a partir do futuro ou artefatos de cenário.
A tecnologia proposta por Hartmann desloca a ênfase do problema no passado/presente para a exploração de possibilidades em um futuro próximo e entende o projetar por cenários como prática dinâmica, social, participativa e iterativa que pode atravessar o processo de projeto. Ao construir cenários, considere articuladamente: ATORES (quem participa, com atitudes, valores e emoções), TRAMA (a narrativa e o encadeamento dos acontecimentos), TRAJETÓRIA (o que acontece ao longo do tempo), EVIDÊNCIAS (artefatos, pontos de contato e impactos tangíveis) e o ESPAÇO-TEMPO em transformação. Estimule a produção de narrativas e artefatos físicos/digitais para pensar e compartilhar futuros, a construção retrospectiva desde um futuro próximo e a criação de "memórias do futuro" compartilhadas.

REFERÊNCIAS TEÓRICAS MOBILIZADAS NA TESE DE HARTMANN — use somente quando forem pertinentes ao ponto discutido e sem atribuir a Hartmann conceitos que pertencem aos autores originais:
- projeto e pensamento em design: Nigel Cross; Herbert Simon; Donald Schön; Horst Rittel e Melvin Webber; Richard Buchanan; Ezio Manzini; Francesco Zurlo; Vijay Kumar; Design Council; IDEO; d.school;
- práticas participativas e codesign: Elizabeth Sanders e Pieter Jan Stappers; Finn Kensing e Jeanette Blomberg; Klaus Krippendorff; Ezio Manzini;
- possibilidades e positive design: Pieter Desmet; Marc Hassenzahl; Anna Pohlmeyer;
- cenários e planejamento: Herman Kahn e Anthony Wiener; Michel Godet; Peter Schwartz; Kees van der Heijden; Ute von Reibnitz;
- cenários no design estratégico: Ezio Manzini e François Jégou; Francesco Celaschi e Alessandro Deserti; Paulo Reyes; Manuela Celi; Carlo Franzato; Patricia Hartmann Hindrichson;
- inovação dirigida pelo design e novos significados: Roberto Verganti; Tim Brown; Kyffin e Gardien; Vijay Kumar;
- memória, antecipação e narrativa futura: David Ingvar e Kees van der Heijden;
- pesquisa-ação e análise qualitativa usadas na tese: Michel Thiollent e Laurence Bardin.

BASE COMPLEMENTAR: design estratégico a partir do futuro de André Coutinho e Anderson Penha; speculative design de Anthony Dunne e Fiona Raby; narrativas de futuros, everyday things, time travelling, participatory futures e create your own narrative. Mantenha também a lente ética e social trabalhada no laboratório com Sasha Costanza-Chock, Mike Monteiro, Critical Design Lab e Guto Requena.

MÉTODO DE CONVERSA: (1) formular uma pergunta de futuro; (2) identificar sinais, tendências, contratendências e incertezas críticas; (3) distinguir futuro provável, possível/plausível e desejável; (4) construir 2 a 4 cenários contrastantes, nunca uma única previsão; (5) quando trabalhar à maneira de Hartmann, estruturar cada cenário por atores, trama, trajetória, evidências e espaço-tempo; (6) perguntar quem se beneficia, quem é excluído e quais impactos humanos, não humanos, sociais e ambientais surgem; (7) quando útil, materializar o cenário como narrativa, artefato/prop, interface, notícia, objeto cotidiano ou pequeno design fiction; (8) fazer backcasting do futuro desejável para uma decisão ou experimento no presente.

REGRA DE CITAÇÃO DO MAGO: em respostas cujo núcleo seja cenário/projetar por cenários, cite explicitamente Hartmann Hindrichson (2022) no contexto científico e, quando útil, relacione-a aos autores acima. Não cite a autora apenas de passagem como "difusora" de Coutinho e Penha. Diferencie com clareza o que é proposição de Hartmann, o que ela mobiliza de outros autores e o que é repertório complementar do laboratório.
Evite futurismo tecnológico automático, determinismo, hype e solução mágica. Explicite sempre o que é evidência presente, hipótese, incerteza e especulação.`,
  'agent-passeio': 'Priorize Inambulação. Use cartografia, pesquisa participante, etnografia de interfaces, Latour e Costanza-Chock. Sempre devolva a pessoa ao território e à escuta.',
  'agent-instaura': 'Priorize Instauração. Use Norman, Preece/Rogers/Sharp, Gestalt, Heller, semiótica, arquitetura da informação e prototipação. Evite figmarismo e respostas visuais genéricas.',
  'agent-inspetor': 'Priorize Inspeção. Use Nielsen, Norman, ergonomia cognitiva, testes, WCAG/e-MAG e evidências observáveis. Diferencie opinião de problema documentado.',
  'agent-rede': 'Leia o projeto como rede sociotécnica com Latour, Simondon e Haraway: humanos, não humanos, instituições, dados, dispositivos, plataformas e infraestruturas.',
  'agent-ativista': 'Atue por bioética, design justice e educação humanitária com Potter, Haraway, Costanza-Chock e Zuboff. Pergunte sobre poder, participação, extração, sustentabilidade e impactos humanos e não humanos.',
  'agent-responsa': 'Converta responsabilidade em requisitos verificáveis: WCAG, e-MAG, desenho universal, linguagem simples, LGPD, segurança, transparência e possibilidade de recusa.',
  'agent-implementa': 'Priorize Implementação como experimentação contínua: design systems, tokens, componentes, documentação, critérios de aceite, testes, publicação e manutenção.',
  'agent-forja': 'Atue na Implementação como arquiteto e desenvolvedor full stack orientado pela documentação do projeto. Leia cards, referências, requisitos, imagens e relações antes de propor tecnologia. Gere código rastreável às decisões do projeto, com React/Vite/TypeScript no front-end, Supabase como backend quando pertinente e Vercel como alvo de deploy. Nunca exponha chaves secretas no cliente; use RLS no Supabase; preserve acessibilidade, responsividade e critérios registrados.',
  'agent-divulga': `Atue na Implementação como estrategista de marketing, circulação, crescimento e sustentabilidade econômica. Seja prático, generoso em possibilidades e orientado a lançamento: não transforme cada resposta numa sabatina. Leia o produto e proponha caminhos executáveis de posicionamento, proposta de valor, marca, canais próprios/conquistados/pagos, SEO/ASO, imprensa, comunidades, creators/influenciadores, parcerias, conteúdo por plataforma, funil, aquisição, ativação, retenção, indicação, métricas e monetização. Base conceitual prioritária, conforme pertinência: Philip Kotler e Kevin Lane Keller (Marketing Management); Philip Kotler, Hermawan Kartajaya e Iwan Setiawan (Marketing 4.0, 5.0 e 6.0); Byron Sharp e Ehrenberg-Bass (How Brands Grow, disponibilidade mental e física); Les Binet e Peter Field (eficácia, construção de marca e ativação); Robert Cialdini (Influence); Jonah Berger (Contagious); Dave Chaffey e Fiona Ellis-Chadwick (Digital Marketing); Tracy Tuten e Michael Solomon (Social Media Marketing); Simon Kingsnorth (Digital Marketing Strategy); Joe Pulizzi e Ann Handley (conteúdo); Avinash Kaushik (analytics); Sean Ellis e Morgan Brown (growth); April Dunford (posicionamento). Use referências para sustentar decisões, não para encher a resposta de citações. Pode sugerir estratégias ousadas e marketing forte; apenas não invente tração, receita ou resultados, nem incentive spam, fraude, compra de engajamento ou dark patterns. Quando houver informação suficiente, entregue o plano primeiro e deixe perguntas somente para lacunas realmente decisivas.`,
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

  const system = body.mediator?.id === 'agent-divulga'
    ? `${baseSystem(body)}
Você está em uma conversa de IMPLEMENTAÇÃO. Seja direto, energético e útil. Não obrigue a pessoa a responder perguntas antes de receber ideias. Quando houver contexto suficiente, entregue possibilidades concretas de campanha, formatos, canais, ferramentas, calendário, monetização e métricas. Dê exemplos de posts, lançamentos, parcerias, imprensa, comunidade, SEO/ASO e distribuição quando fizer sentido. Traga Kotler/Keller e a bibliografia contemporânea indicada na identidade do agente apenas quando ela ajuda a justificar uma escolha. Prefira blocos acionáveis como "ideia / canal / formato / ferramenta / métrica / teste". Pergunte algo somente se a lacuna impedir uma recomendação minimamente responsável. Não retorne JSON dentro do campo reply.`
    : `${baseSystem(body)}
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
    wireframeName: item.wireframeName || '',
    wireframe: clipText(item.wireframe, 4200),
    designSystemName: item.designSystemName || '',
    designSystem: clipText(item.designSystem, 3500),
    uxWritingName: item.uxWritingName || '',
    uxWriting: clipText(item.uxWriting, 3500),
    spriteName: item.spriteName || '',
    sprite: clipText(item.sprite, 4200),
    apiConnectionsName: item.apiConnectionsName || '',
    apiConnections: clipText(item.apiConnections, 5200),
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
  const allowedEngines = ['p5', 'three', 'gsap', 'anime', 'matter', 'svg'];
  const engine = allowedEngines.includes(body.engine) ? body.engine : 'p5';
  const interactionMode = ['auto', 'pointer', 'hover', 'scroll'].includes(body.interactionMode) ? body.interactionMode : 'pointer';
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

  const engineRules = {
    p5: `p5.js já está carregado em modo global. NÃO escreva HTML, imports ou tags <script>. Declare setup(), draw() e handlers necessários. Use const canvas = createCanvas(windowWidth, windowHeight); canvas.parent(STAGE); e resizeCanvas no resize.`,
    three: `O código roda em <script type="module"> depois de import * as THREE. NÃO escreva imports adicionais, HTML ou tags <script>. Use THREE, renderer, scene, camera, requestAnimationFrame e resize; anexe renderer.domElement ao STAGE.`,
    gsap: `GSAP já está carregado globalmente na variável gsap. NÃO escreva imports, HTML ou tags <script>. Crie os elementos DOM/SVG necessários dentro de STAGE e anime com timelines/tweens do gsap.`,
    anime: `Anime.js 3.x já está carregado globalmente na função anime. NÃO escreva imports, HTML ou tags <script>. Crie os elementos DOM/SVG dentro de STAGE e anime com anime({...}).`,
    matter: `Matter.js já está carregado globalmente na variável Matter. NÃO escreva imports, HTML ou tags <script>. Use Engine, Runner/Render ou desenho próprio em canvas, mantenha a física leve e dimensione ao STAGE.`,
    svg: `SVG.js já está carregado globalmente na função SVG e GSAP também está disponível em gsap. NÃO escreva imports, HTML ou tags <script>. Crie o SVG dentro de STAGE. Para um SVG enviado, você pode usar await window.loadInteractiveSvg() dentro de uma função async/IIFE e inserir/manipular seus grupos e paths.`,
  }[engine];

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

  const modeRules = {
    auto: 'A interação principal deve funcionar automaticamente em loop; ainda respeite resize e prefers-reduced-motion quando viável.',
    pointer: 'A interação principal deve responder tanto a mouse quanto a toque/pointer, sem depender apenas de hover.',
    hover: 'A interação deve responder a hover/foco no desktop e oferecer comportamento equivalente por toque no mobile.',
    scroll: 'A interação deve responder ao scroll quando inserida na página; como a prévia pode não rolar, inclua também fallback por wheel/pointer para ser testável.',
  }[interactionMode];

  const system = `Você é Forja em modo laboratório de interação da Metodologia 5I’s. Gere um experimento visual executável, expressivo e performático para ser salvo como uma camada reutilizável do canvas.

MOTOR: ${engine}
${engineRules}
${engine === 'three' ? threeSketchRules : ''}

RUNTIME COMUM
- STAGE ocupa toda a área da prévia e já existe.
- ASSET contém o arquivo enviado ou null.
- MODE contém o modo de interação escolhido.
${assetRules}
${modeRules}

EFEITO PRÉ-SELECIONADO: ${effectPreset || 'nenhum'}
INTENSIDADE: ${intensity}
PROTEÇÃO DA MARCA: ${preserveBrand ? 'ATIVA' : 'desativada'}
${preserveBrand && asset?.kind === 'svg' && engine !== 'three' ? `REGRAS DE FIDELIDADE OBRIGATÓRIAS:
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

  const context = Array.isArray(body.existingThoughts)
    ? body.existingThoughts.slice(-30).map((item) => `[${item.phase}] ${item.title}: ${item.content}`).join('\n')
    : '';
  const user = `PROJETO: ${body.project?.name || ''}
PROBLEMA: ${body.project?.problem || ''}
FASE: ${body.phase || ''}
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
${String(body.prompt || '')}

Gere o experimento completo usando ${engine}.`;
  return { system, user: user + sketchContext(body) };
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
  const allowedEngines = ['p5', 'three', 'gsap', 'anime', 'matter', 'svg'];
  const normalizeEngine = (value) => allowedEngines.includes(value) ? value : (allowedEngines.includes(fallbackEngine) ? fallbackEngine : 'p5');

  try {
    const stripped = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
    const start = stripped.indexOf('{');
    const end = stripped.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const data = JSON.parse(stripped.slice(start, end + 1));
      if (data?.interactive?.code) {
        return {
          title: String(data.interactive.title || 'Interação'),
          engine: normalizeEngine(data.interactive.engine),
          code: String(data.interactive.code),
        };
      }
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


function cleanVideoPlanJson(text) { return parseVideoComposition(text); }

function buildVideoPlanMessages(body) {
  const video = body?.video || {};
  const media = Array.isArray(video.media) ? video.media.slice(0, 60) : [];
  const system = videoCompositionRules;
  const user = `PEDIDO: ${String(body?.prompt || '')}\nFORMATO ATUAL: ${String(video.format || '')}\nTÍTULO ATUAL: ${String(video.title || '')}\nSUBTÍTULO ATUAL: ${String(video.subtitle || '')}\nMÍDIA DISPONÍVEL:\n${media.map((m)=>`- ${m.id} | ${m.kind} | ${m.name}${m.fitHint==='contain'?' | preserve a arte inteira com fit contain':''}`).join('\n') || 'nenhuma mídia'}`;
  return { system, user: user + `\nCURRENT_TIMELINE: ${JSON.stringify(video.currentTimeline || [])}` };
}


function extractJsonObject(text) {
  const stripped = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{'); const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A IA não retornou JSON válido.');
  return JSON.parse(stripped.slice(start, end + 1));
}
function sanitizeCharacterSvg(svg) {
  const clean = String(svg || '').trim().replace(/^<\?xml[^>]*>\s*/i, '');
  if (clean.length > 160000) throw new Error('O SVG excedeu o tamanho permitido. Gere uma versão mais leve.');
  if (!/^<svg[\s>]/i.test(clean) || !/<\/svg>\s*$/i.test(clean)) throw new Error('A IA não devolveu um SVG completo.');
  if (/<(?:script|foreignObject|image|iframe|object|embed|audio|video)\b|<!DOCTYPE|<!ENTITY|\son[a-z]+\s*=|javascript:|@import/i.test(clean)) throw new Error('O SVG contém conteúdo não permitido.');
  for (const match of clean.matchAll(/\b(?:href|xlink:href)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
    if (!String(match[1] ?? match[2] ?? match[3]).startsWith('#')) throw new Error('O SVG deve ser autocontido, sem recursos externos.');
  }
  for (const match of clean.matchAll(/url\(([^)]*)\)/gi)) {
    if (!match[1].trim().replace(/^["']|["']$/g,'').startsWith('#')) throw new Error('O SVG deve ser autocontido, sem recursos externos.');
  }
  if (!/<(?:path|ellipse|circle|rect|polygon|polyline|line)\b/i.test(clean)) throw new Error('A IA devolveu uma ilustração vazia.');
  return clean;
}
function cleanCharacterSvgJson(text) {
  const data = extractJsonObject(text);
  return { svg: sanitizeCharacterSvg(data.svg), notes: Array.isArray(data.notes) ? data.notes.slice(0, 8).map(String) : [] };
}
function buildCharacterSvgMessages(body) {
  const c = body?.character || {};
  const system = `Você é concept artist, designer de personagens e ilustrador vetorial. Gere um SVG EDITÁVEL, autocontido, sem scripts, sem foreignObject e sem imagens externas. O ser pode ser HUMANO, ANIMAL, CRIATURA, MASCOTE ou HÍBRIDO. Quando species="hybrid", trate hybridPrimaryPreset, hybridSecondaryPreset e hybridBlend como um DNA visual explícito: preserve sinais reconhecíveis das duas bases sem simplesmente somar todas as partes. Respeite rigorosamente species, bodyPlan e partes opcionais recebidas: se browStyle, earStyle, muzzleStyle, tailStyle, wingStyle ou hornStyle forem "none", NÃO desenhe essa parte. Não force anatomia humana em quadrúpedes, aves, peixes, répteis, artrópodes ou seres serpentinos. Preserve locomoção, centro de massa e silhueta compatíveis com o plano corporal. Para animais estilizados, use anatomia observável como base antes de simplificar. Em híbridos, priorize silhueta coerente, centro de massa plausível e 2–4 traços fortes de cada origem; o valor hybridBlend indica qual base domina a morfologia.

O campo artStyle define a linguagem visual: illustrated=realismo ilustrado com volume e íris detalhada; cartoon=cartoon expressivo; anime=anime com cel shading; manga=mangá monocromático; comic=quadrinhos; storybook=livro ilustrado; watercolor=aquarela vetorial; pencil=lápis/hachuras; ink=nanquim; chibi=proporções compactas. Não entregue apenas figuras geométricas: use curvas anatômicas, articulações contínuas, mãos/patas coerentes, conexão do pescoço e cabelo com o rosto e acabamento consistente. Se houver bico, não desenhe nariz humano.
Quando modo=refine, edite o SVG atual e preserve identidade, paleta, acessórios e partes não mencionadas no pedido. Quando modo=reference, as imagens enviadas são a fonte principal: preserve seus traços identificadores, silhueta e intenção autoral; a aparência modular é secundária. Quando modo=new, crie a partir do prompt e estilo selecionado. Nunca diga que leu uma imagem quando nenhuma foi enviada. O resultado é uma ilustração SVG, não uma reconstrução ou rig de animação automático.
Princípios de projeto: silhueta clara, shape language coerente, leitura em tamanho pequeno, model sheet consistente, pose compatível com a espécie e acessibilidade cromática. Forma não determina personalidade de modo universal e não deve ser usada para estereotipar corpo, gênero, raça, deficiência, idade ou espécie. Use viewBox 0 0 360 520. Retorne SOMENTE JSON válido: {"svg":"<svg ...>...</svg>","notes":["decisão visual"]}.`;
  const user = `PEDIDO: ${String(body?.prompt || '')}
NOME: ${String(c.name || '')}
DESCRIÇÃO: ${String(c.description || '')}
VISTA: ${String(c.view || 'front')}
EXPRESSÃO: ${String(c.expression || 'neutral')}
POSE: ${String(c.pose || 'neutral')}
APARÊNCIA MODULAR: ${JSON.stringify(c.appearance || {})}
FICHA/INTENÇÃO: ${JSON.stringify(c.profile || {})}
MODO: ${String(body.characterSourceMode || 'refine')}
REFERÊNCIAS VISUAIS: ${JSON.stringify(body.referenceNames || [])}
SVG ATUAL PARA EDITAR (somente modo refine): ${body.characterSourceMode !== 'new' && body.characterSourceMode !== 'reference' && body.currentSvg ? sanitizeCharacterSvg(body.currentSvg) : 'não enviado'}`;
  return { system, user };
}

const CHARACTER_DESIGN_ENUMS = {
  artStyle:['illustrated','cartoon','anime','manga','comic','storybook','watercolor','pencil','ink','chibi','engraving','lineart','realism','psychedelic','steampunk'],
  styleVariant:['manga-shounen','manga-shoujo','manga-seinen','manga-chibi','manga-fashion','engraving-copper','engraving-woodcut','engraving-lino','lineart-ornamental','lineart-botanical','lineart-tattoo','realism-editorial','realism-concept','realism-scientific','psychedelic-70s','psychedelic-neon','psychedelic-surreal','steampunk-victorian','steampunk-diesel','steampunk-clockwork','comic-western','comic-noir','comic-indie','storybook-gouache','storybook-pencil','storybook-paper','anime-modern','anime-soft','cartoon-editorial','cartoon-rubber','illustrated-soft','watercolor-soft','pencil-graphite','ink-brush','chibi-kawaii'],
  species:['human','anthropomorphic','quadruped','bird','reptile','amphibian','fish','arthropod','fantasy','hybrid'],
  bodyPlan:['biped','quadruped','avian','serpentine','aquatic','six-limbed','eight-limbed','custom'],
  headShape:['round','oval','square','heart','triangle','wide'], faceShape:['soft','angular','long','wide'], eyeStyle:['round','almond','narrow','dot','large','hooded','monolid','upturned','downturned'], browStyle:['none','soft','straight','arched','bold'], noseStyle:['none','small','straight','wide'], mouthStyle:['line','smile','full','small'], earStyle:['none','simple','round','pointed','long','floppy','large','fin'], hairStyle:['none','short','bob','long','curly','spiky','bun'],
  muzzleStyle:['none','short','long','round','beak-small','beak-long','beak-hooked'], tailStyle:['none','short','long','fluffy','curled','reptile','fish'], wingStyle:['none','feather','bat','fin'], hornStyle:['none','short','long','antlers','antennae'], surfaceStyle:['skin','fur-short','fur-long','feathers','scales','shell','chitin'], footStyle:['feet','paws','hooves','claws','talons','fins'], bodyShape:['slim','average','athletic','stocky','chibi'], torsoShape:['rectangle','trapezoid','round','triangle'], armStyle:['thin','regular','strong'], legStyle:['short','regular','long'], handStyle:['mitten','simple','defined'],
  outfitStyle:['none','basic','casual','sport','formal','fantasy','tech','street','school','kawaii','punk','steampunk','historical','scifi','workwear','elegant','adventure']
};
const CHARACTER_ACCESSORIES = new Set(['glasses','sunglasses','goggles','monocle','hat','cap','beanie','hood','bandana','headband','hairclip','flower','tiara','scarf','cape','backpack','satchel','headphones','earrings','necklace','brooch','bow','crown','bracelet','watch','belt','pouch','shoulderpad','mask']);
const CHARACTER_NUMERIC_KEYS = new Set(['hybridBlend','headToBodyRatio','shoulderWidth','limbLength','bodyWidth','headWidth','headHeight','eyeSize','eyeSpacing','eyeHeight','irisScale','browSize','browHeight','noseSize','noseHeight','mouthSize','mouthHeight','earSize','earAngle','hairVolume','muzzleSize','muzzleHeight','armLength','armWidth','legLength','legWidth','handSize','footSize','waistWidth','tailSize','wingSize','hornSize','whiskerLength','strokeWidth']);
const CHARACTER_COLOR_KEYS = new Set(['skinColor','surfaceColor','hairColor','eyeColor','outfitPrimary','outfitSecondary','lineColor','noseColor','mouthColor','earColor','wingColor','tailColor','hornColor']);
function cleanCharacterDesignJson(text) {
  const data=extractJsonObject(text); const src=data.appearance || {}; const appearance={};
  for (const [key,allowed] of Object.entries(CHARACTER_DESIGN_ENUMS)) if (allowed.includes(String(src[key]||''))) appearance[key]=String(src[key]);
  for (const key of CHARACTER_NUMERIC_KEYS) { const n=Number(src[key]); if(Number.isFinite(n)) appearance[key]=Math.max(-180,Math.min(180,n)); }
  for (const key of CHARACTER_COLOR_KEYS) if(/^#[0-9a-f]{6}$/i.test(String(src[key]||''))) appearance[key]=String(src[key]);
  for (const key of ['speciesPreset','hybridPrimaryPreset','hybridSecondaryPreset']) if(src[key] != null) appearance[key]=String(src[key]).slice(0,80);
  if(typeof src.whiskers==='boolean') appearance.whiskers=src.whiskers;
  if(Array.isArray(src.accessories)) appearance.accessories=src.accessories.slice(0,8).filter(x=>CHARACTER_ACCESSORIES.has(String(x?.kind))).map((x,i)=>({id:`ai-${String(x.kind)}-${i}`,kind:String(x.kind),color:/^#[0-9a-f]{6}$/i.test(String(x.color||''))?String(x.color):'#6D5B79',scale:Math.max(.5,Math.min(1.5,Number(x.scale)||1)),x:Math.max(-25,Math.min(25,Number(x.x)||0)),y:Math.max(-25,Math.min(25,Number(x.y)||0))}));
  const profile=data.profile && typeof data.profile==='object' ? Object.fromEntries(Object.entries(data.profile).filter(([key])=>['role','ageBand','personality','motivation','backstory','silhouetteIntent','shapeLanguageRationale','proportionRationale','colorRationale','costumeRationale'].includes(key)).map(([key,value])=>[key,String(value||'').slice(0,1400)])) : undefined;
  return { appearance, description:String(data.description||'').slice(0,1200), profile, notes:Array.isArray(data.notes)?data.notes.slice(0,10).map(v=>String(v).slice(0,400)):[] };
}
function buildCharacterDesignMessages(body) {
  const c=body?.character||{};
  const system=`Você é diretor(a) de arte, concept artist e especialista em character design modular. NÃO gere SVG. Seu trabalho é traduzir o pedido em decisões estruturadas que o renderizador determinístico da aplicação vai desenhar.

A ordem é STYLE-FIRST: escolha primeiro a família visual e um subestilo coerente; depois refine espécie/plano corporal, rosto, proporções, figurino, acessórios e paleta. O estilo selecionado deve ser perceptível imediatamente e afetar características mínimas do personagem. Preserve anatomia e locomoção coerentes: não transforme ave, peixe, réptil, artrópode ou quadrúpede em humano com partes coladas. Híbridos devem ter uma base estrutural dominante e poucos sinais fortes da segunda base.

Famílias/subestilos disponíveis: manga (manga-shounen, manga-shoujo, manga-seinen, manga-chibi, manga-fashion); engraving (engraving-copper, engraving-woodcut, engraving-lino); lineart (lineart-ornamental, lineart-botanical, lineart-tattoo); realism (realism-editorial, realism-concept, realism-scientific); psychedelic (psychedelic-70s, psychedelic-neon, psychedelic-surreal); steampunk (steampunk-victorian, steampunk-diesel, steampunk-clockwork); comic (comic-western, comic-noir, comic-indie); storybook (storybook-gouache, storybook-pencil, storybook-paper); anime (anime-modern, anime-soft); cartoon (cartoon-editorial, cartoon-rubber); illustrated (illustrated-soft); watercolor (watercolor-soft); pencil (pencil-graphite); ink (ink-brush); chibi (chibi-kawaii).

Figurinos disponíveis: none, basic, casual, sport, formal, fantasy, tech, street, school, kawaii, punk, steampunk, historical, scifi, workwear, elegant, adventure.
Acessórios combináveis: glasses, sunglasses, goggles, monocle, hat, cap, beanie, hood, bandana, headband, hairclip, flower, tiara, scarf, cape, backpack, satchel, headphones, earrings, necklace, brooch, bow, crown, bracelet, watch, belt, pouch, shoulderpad, mask.

Quando modo=refine, preserve tudo que o pedido não manda mudar. Quando modo=reference, use as imagens como direção visual principal, mas converta-as para parâmetros do construtor. Quando modo=new, você pode propor a configuração completa. Retorne SOMENTE JSON válido no formato {"appearance":{...},"description":"...","profile":{... opcional},"notes":["decisão aplicada"]}. Use apenas chaves já presentes em APARÊNCIA ATUAL e styleVariant; acessórios devem ser array de objetos {"kind":"...","color":"#RRGGBB","scale":1,"x":0,"y":0}.`;
  const user=`PEDIDO: ${String(body?.prompt||'')}
MODO: ${String(body.characterSourceMode||'refine')}
NOME: ${String(c.name||'')}
DESCRIÇÃO ATUAL: ${String(c.description||'')}
APARÊNCIA ATUAL: ${JSON.stringify(c.appearance||{})}
FICHA ATUAL: ${JSON.stringify(c.profile||{})}
VISTA/EXPRESSÃO/POSE: ${String(c.view||'front')} / ${String(c.expression||'neutral')} / ${String(c.pose||'neutral')}
REFERÊNCIAS VISUAIS: ${JSON.stringify(body.referenceNames||[])}`;
  return {system,user};
}

function cleanCharacterSheetJson(text) {
  const data = extractJsonObject(text); const p = data.profile || {};
  return { description:String(data.description || '').slice(0,1200), profile:{ role:String(p.role||'').slice(0,220), ageBand:String(p.ageBand||'').slice(0,160), personality:String(p.personality||'').slice(0,900), motivation:String(p.motivation||'').slice(0,900), backstory:String(p.backstory||'').slice(0,1400), keywords:Array.isArray(p.keywords)?p.keywords.slice(0,12).map(String):[], silhouetteIntent:String(p.silhouetteIntent||'').slice(0,900), shapeLanguageRationale:String(p.shapeLanguageRationale||'').slice(0,900), proportionRationale:String(p.proportionRationale||'').slice(0,900), colorRationale:String(p.colorRationale||'').slice(0,900), costumeRationale:String(p.costumeRationale||'').slice(0,900)}, notes:Array.isArray(data.notes)?data.notes.slice(0,8).map(String):[] };
}
function buildCharacterSheetMessages(body) {
  const c=body?.character||{};
  const system=`Você é concept artist e pesquisador(a) de character design de humanos, animais e criaturas. Complete uma ficha utilizável por equipe de design/animação/jogos. Fundamente em silhueta, proporção, anatomia ou plano corporal, locomoção, line of action, model sheet, expression sheet, superfície, acessórios, paleta e consistência. Para animais, considere anatomia/locomoção da espécie antes da estilização. Para híbridos, explicite quais sinais vêm de cada base, qual plano corporal organiza o centro de massa e por que a mistura continua legível como uma única criatura. Shape language é convenção visual contextualizada, não psicologia universal. Não invente estereótipos sobre gênero, raça, deficiência, corpo ou espécie. Retorne SOMENTE JSON: {"description":"...","profile":{"role":"...","ageBand":"...","personality":"...","motivation":"...","backstory":"...","keywords":["..."],"silhouetteIntent":"...","shapeLanguageRationale":"...","proportionRationale":"...","colorRationale":"...","costumeRationale":"..."},"notes":["..."]}.`;
  const user=`SER: ${String(c.name||'')}
DESCRIÇÃO ATUAL: ${String(c.description||'')}
PEDIDO: ${String(body?.prompt||'Complete a ficha sem apagar a autoria do usuário.')}
APARÊNCIA: ${JSON.stringify(c.appearance||{})}
FICHA ATUAL: ${JSON.stringify(c.profile||{})}`;
  return {system,user};
}
function cleanApiBuilderJson(text) {
  const data=extractJsonObject(text); const allowedMethods=new Set(['GET','POST','PUT','PATCH','DELETE']);
  return { name:String(data.name||'API criada no projeto').slice(0,160), summary:String(data.summary||'').slice(0,900), auth:String(data.auth||'Sem autenticação').slice(0,240), envVars:Array.isArray(data.envVars)?data.envVars.slice(0,12).map(String):[], capabilities:Array.isArray(data.capabilities)?data.capabilities.slice(0,16).map(String):[], fileName:String(data.fileName||'api/custom.ts').replace(/[^a-zA-Z0-9_./-]/g,'').slice(0,180), endpoints:Array.isArray(data.endpoints)?data.endpoints.slice(0,12).map((e)=>({method:allowedMethods.has(String(e?.method).toUpperCase())?String(e.method).toUpperCase():'GET',path:String(e?.path||'/api/custom').slice(0,220),purpose:String(e?.purpose||'').slice(0,500)})):[], code:String(data.code||'').slice(0,30000) };
}
function buildApiBuilderMessages(body) {
  const existing=Array.isArray(body?.existingApis)?body.existingApis.slice(0,30):[];
  const system=`Você é arquiteto(a) de APIs para projetos web React/Vite/Vercel. Primeiro reutilize as integrações existentes quando elas atendem ao pedido; quando for preciso criar um endpoint, gere uma função TypeScript em /api compatível com Vercel. Nunca exponha secrets no frontend: use process.env no servidor. Prefira APIs públicas, no-key, open source ou free tier já mencionadas pelo usuário. Gere tratamento de erro, timeout e JSON estável. Retorne SOMENTE JSON válido: {"name":"...","summary":"...","auth":"...","envVars":["..."],"capabilities":["..."],"fileName":"api/nome.ts","endpoints":[{"method":"GET","path":"/api/...","purpose":"..."}],"code":"código TypeScript completo"}.`;
  const user=`PEDIDO: ${String(body?.prompt||'')}\nAPIs JÁ INCORPORADAS AO PROJETO: ${JSON.stringify(existing)}`;
  return {system,user};
}

function cleanDataStoryJson(text) {
  const data=extractJsonObject(text);
  const allowed=new Set(['bar','horizontal-bar','line','area','pie','donut','scatter','bubble','stacked','timeline','radar','pictogram','gauge','lollipop','funnel','heatmap','treemap']);
  return {
    headline:String(data.headline||'').slice(0,180),
    insight:String(data.insight||'').slice(0,700),
    recommendedChart:allowed.has(String(data.recommendedChart))?String(data.recommendedChart):'bar',
    why:String(data.why||'').slice(0,900),
    questions:Array.isArray(data.questions)?data.questions.slice(0,8).map((x)=>String(x).slice(0,320)):[],
    annotations:Array.isArray(data.annotations)?data.annotations.slice(0,8).map((x)=>String(x).slice(0,320)):[],
    infographicSequence:Array.isArray(data.infographicSequence)?data.infographicSequence.slice(0,8).map((x)=>String(x).slice(0,420)):[],
  };
}
function buildDataStoryMessages(body) {
  const rows=Array.isArray(body?.rows)?body.rows.slice(0,80):[];
  const questions=Array.isArray(body?.questions)?body.questions.slice(0,10):[];
  const system=`Você é especialista em information design, visualização e storytelling de dados. Sua função é ajudar uma pessoa designer a formular perguntas, escolher uma codificação visual adequada e construir uma narrativa verificável — não decorar números nem forçar conclusões.
PRINCÍPIOS: compare antes de ornamentar; explicite unidade, período, fonte e denominador; não sugira causalidade a partir de correlação; destaque incerteza e ausência; mapas coropléticos devem preferir taxas/percentuais, enquanto valores absolutos podem pedir símbolos proporcionais; pizza/rosca somente com poucas categorias de um todo; linha para mudança temporal; barras para comparação; dispersão para relação entre variáveis; pictogramas para proporções simples. Preserve autoria humana e critique vieses.
Retorne SOMENTE JSON válido: {"headline":"...","insight":"...","recommendedChart":"bar|horizontal-bar|line|area|pie|donut|scatter|bubble|stacked|timeline|radar|pictogram|gauge|lollipop|funnel|heatmap|treemap","why":"...","questions":["..."],"annotations":["..."],"infographicSequence":["..."]}.`;
  const user=`OBJETIVO: ${String(body?.goal||'')}
PEDIDO: ${String(body?.prompt||'')}
GRÁFICO ATUAL: ${String(body?.chartType||'bar')}
COLUNAS: ${JSON.stringify(body?.columns||[])}
AMOSTRA DOS DADOS: ${JSON.stringify(rows)}
PERGUNTAS/RESPOSTAS DO AUTOR: ${JSON.stringify(questions)}`;
  return {system,user};
}



function cleanGraphicExperimentJson(text) {
  const data=extractJsonObject(text);
  const allowedKinds=new Set(['text','shape']);
  const allowedShapes=new Set(['circle','square','star','blob']);
  const allowedWarps=new Set(['none','arc','wave','flag','circle']);
  return {
    elements:Array.isArray(data.elements)?data.elements.slice(0,18).map((item,index)=>({
      kind:allowedKinds.has(String(item?.kind))?String(item.kind):'shape',
      text:String(item?.text||'GRAFISMO').slice(0,140),
      fontFamily:String(item?.fontFamily||'Space Grotesk').slice(0,120),
      fontSize:Math.max(18,Math.min(220,Number(item?.fontSize)||72)),
      fontWeight:Math.max(100,Math.min(900,Number(item?.fontWeight)||700)),
      tracking:Math.max(-8,Math.min(36,Number(item?.tracking)||0)),
      warp:allowedWarps.has(String(item?.warp))?String(item.warp):'none',
      shape:allowedShapes.has(String(item?.shape))?String(item.shape):'blob',
      x:Math.max(0,Number(item?.x)||80+index*24), y:Math.max(0,Number(item?.y)||100+index*20),
      w:Math.max(40,Math.min(620,Number(item?.w)||220)), h:Math.max(40,Math.min(420,Number(item?.h)||180)),
      rotation:Math.max(-180,Math.min(180,Number(item?.rotation)||0)),
      color:/^#[0-9a-f]{6}$/i.test(String(item?.color||''))?String(item.color):'#111111',
    })):[],
    notes:Array.isArray(data.notes)?data.notes.slice(0,8).map((x)=>String(x).slice(0,360)):[],
  };
}
function buildGraphicExperimentMessages(body) {
  const system=`Você é designer gráfico experimental especializado em tipografia, gestualidade, sistemas modulares, padrões e rapports. Proponha uma composição editável, não uma imagem final fechada. Evite imitar marcas/artistas específicos. Trabalhe com relações entre texto, forma, ritmo, repetição, contraste e gesto. Retorne SOMENTE JSON válido no formato {"elements":[{"kind":"text|shape","text":"...","fontFamily":"Space Grotesk","fontSize":72,"fontWeight":700,"tracking":0,"warp":"none|arc|wave|flag|circle","shape":"circle|square|star|blob","x":80,"y":120,"w":240,"h":160,"rotation":0,"color":"#111111"}],"notes":["..."]}. Gere entre 4 e 12 elementos, usando apenas as cores fornecidas quando possível.`;
  const user=`PEDIDO: ${String(body?.prompt||'')}\nPALETA: ${JSON.stringify(body?.palette||[])}\nÁREA: ${Number(body?.width)||900} × ${Number(body?.height)||900}`;
  return {system,user};
}

function cleanBrandRefinementJson(text) {
  const data = extractJsonObject(text);
  const allowedKinds = new Set(['wordmark','monogram','symbol','combination']);
  const allowedSymbols = new Set(['geometric','organic','seal','abstract']);
  const allowedLockups = new Set(['horizontal','stacked','symbol-only']);
  return {
    alternatives: Array.isArray(data.alternatives) ? data.alternatives.slice(0,4).map((item:any, index:number) => ({
      id: String(item?.id || `alt-${index+1}`),
      label: String(item?.label || `Alternativa ${index+1}`).slice(0,120),
      rationale: String(item?.rationale || '').slice(0,600),
      logo: {
        kind: allowedKinds.has(String(item?.logo?.kind)) ? String(item.logo.kind) as any : 'combination',
        symbolStyle: allowedSymbols.has(String(item?.logo?.symbolStyle)) ? String(item.logo.symbolStyle) as any : 'geometric',
        monogram: String(item?.logo?.monogram || '').slice(0,3).toUpperCase(),
        lockup: allowedLockups.has(String(item?.logo?.lockup)) ? String(item.logo.lockup) as any : 'horizontal',
      }
    })) : [],
    notes: Array.isArray(data.notes) ? data.notes.slice(0,8).map(String) : [],
  };
}
function buildBrandRefinementMessages(body) {
  const b = body?.brand || {};
  const system = `Você é designer de identidade visual. Sua tarefa é refinar uma ideia de marca sem apagar a autoria do esboço. Considere síntese formal, escalabilidade, contraste, memorabilidade, sistema visual e coerência com essência, público e posicionamento. Não produza discurso vazio. Retorne SOMENTE JSON válido no formato {"alternatives":[{"id":"alt-1","label":"...","rationale":"...","logo":{"kind":"wordmark|monogram|symbol|combination","symbolStyle":"geometric|organic|seal|abstract","monogram":"..","lockup":"horizontal|stacked|symbol-only"}}],"notes":["..."]}. Gere de 2 a 4 alternativas.`;
  const user = `MARCA: ${String(b.name || '')}
TAGLINE: ${String(b.tagline || '')}
ESSÊNCIA: ${String(b.essence || '')}
PÚBLICO/CONTEXTO: ${String(b.audience || '')}
POSICIONAMENTO: ${String(b.positioning || '')}
PERSONALIDADE: ${JSON.stringify(b.personality || [])}
PALETA: ${JSON.stringify(b.palette || [])}
LOGO ATUAL: ${JSON.stringify(b.logo || {})}
LINGUAGEM GRÁFICA: ${String(b.graphicLanguage || '')}
PHOTOBRIEF: ${String(b.photoBrief || '')}
NOTAS DO ESBOÇO: ${String(b.sketchNote || '')}
ESBOÇO PRESENTE: ${b.sketchDataUrl ? 'sim' : 'não'}
PEDIDO DE REFINO: ${String(body?.prompt || '')}`;
  return { system, user };
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


function cleanWireframeInterpretationJson(text) {
  const stripped = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('A interpretação do wireframe não retornou JSON válido.');
  const data = JSON.parse(stripped.slice(start, end + 1));
  const frame = data?.frame;
  if (!frame || !Array.isArray(frame.blocks)) throw new Error('A interpretação do wireframe veio incompleta.');
  const allowedTypes = new Set(['text','button','input','image','card','navbar','list-item','spacer']);
  const allowedPresets = new Set(['mobile','tablet','desktop','watch','custom']);
  const allowedAlign = new Set(['start','center','end','stretch']);
  const cleanColor = (value, fallback) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value).toUpperCase() : fallback;
  return {
    frame: {
      name: String(frame.name || 'Interface interpretada'),
      preset: allowedPresets.has(frame.preset) ? frame.preset : 'custom',
      width: Math.max(120, Math.min(2400, Number(frame.width) || 393)),
      height: Math.max(120, Math.min(4000, Number(frame.height) || 852)),
      direction: frame.direction === 'row' ? 'row' : 'column',
      gap: Math.max(0, Math.min(120, Number(frame.gap) || 12)),
      padding: Math.max(0, Math.min(160, Number(frame.padding) || 20)),
      align: allowedAlign.has(frame.align) ? frame.align : 'stretch',
      background: cleanColor(frame.background, '#FFFFFF'),
      blocks: frame.blocks.slice(0, 40).map((block) => ({
        type: allowedTypes.has(block?.type) ? block.type : 'card',
        label: String(block?.label || 'Elemento').slice(0, 180),
        width: block?.width === 'hug' || block?.width === 'fill' || Number.isFinite(Number(block?.width)) ? block.width : 'fill',
        height: block?.height === 'hug' || Number.isFinite(Number(block?.height)) ? block.height : 'hug',
        padding: Math.max(0, Math.min(80, Number(block?.padding) || 0)),
        radius: Math.max(0, Math.min(999, Number(block?.radius) || 0)),
        background: cleanColor(block?.background, '#F4F4F2'),
        color: cleanColor(block?.color, '#111111'),
      })),
    },
    notes: Array.isArray(data?.notes) ? data.notes.slice(0, 6).map(String) : [],
    uncertainties: Array.isArray(data?.uncertainties) ? data.uncertainties.slice(0, 6).map(String) : [],
  };
}

function buildWireframeInterpretationMessages(body) {
  const source = body?.wireframeSource || {};
  const options = body?.wireframeOptions || {};
  const device = ['auto','mobile','tablet','desktop'].includes(String(options.device)) ? String(options.device) : 'auto';
  const fidelity = ['structure','balanced','faithful'].includes(String(options.fidelity)) ? String(options.fidelity) : 'balanced';
  const deviceRule = device === 'mobile' ? '393x852 mobile' : device === 'tablet' ? '768x1024 tablet' : device === 'desktop' ? '1440x1024 desktop' : 'deduza o tipo de tela pelo esboço';
  const fidelityRule = fidelity === 'structure' ? 'priorize hierarquia e fluxo, simplificando detalhes' : fidelity === 'faithful' ? 'preserve o máximo possível da posição relativa, quantidade e proporções sugeridas' : 'equilibre fidelidade visual e uma estrutura de interface coerente';
  const system = `Você interpreta rabiscos, wireframes de papel, screenshots e desenhos vetoriais e os converte em uma interface EDITÁVEL, não em uma imagem. Reconheça intenção estrutural: navbar, títulos, textos, botões, inputs, imagens, cards, itens de lista e espaços. Não invente conteúdo específico que não esteja legível; use rótulos neutros. ${fidelityRule}. Alvo: ${deviceRule}. Retorne somente JSON válido no formato {"frame":{"name":"...","preset":"mobile|tablet|desktop|watch|custom","width":393,"height":852,"direction":"column|row","gap":16,"padding":24,"align":"start|center|end|stretch","background":"#FFFFFF","blocks":[{"type":"navbar|text|button|input|image|card|list-item|spacer","label":"...","width":"fill|hug ou número","height":"hug ou número","padding":12,"radius":12,"background":"#F4F4F2","color":"#111111"}]},"notes":["..."],"uncertainties":["..."]}. Use apenas HEX de 6 dígitos nas cores.`;
  const user = `Origem: ${String(source.name || 'esboço')}\nTipo: ${String(source.kind || 'image')}\nConverta os traços e regiões percebidas em blocos editáveis. Ordene os blocos na sequência visual mais provável. Se algo estiver ambíguo, ainda gere uma estrutura útil e registre a dúvida em uncertainties.`;
  return { system, user };
}

async function callGeminiWireframe(system, user, source, maxOutputTokens = 3600, timeoutMs = 45000) {
  if (source?.kind !== 'image' || !source?.url) {
    const svg = String(source?.svg || '').slice(0, 70000);
    return callGeminiStructured(system, `${user}\n\nSVG DO DESENHO VETORIAL:\n${svg}`, maxOutputTokens, timeoutMs, 0.12);
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');
  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const imageResponse = await fetchWithTimeout(String(source.url), {}, 12000);
  if (!imageResponse.ok) throw new Error('Não foi possível ler a imagem enviada para interpretar o wireframe.');
  const mimeType = String(imageResponse.headers.get('content-type') || 'image/png').split(';')[0];
  if (!mimeType.startsWith('image/')) throw new Error('A origem enviada não é uma imagem válida.');
  const bytes = Buffer.from(await imageResponse.arrayBuffer());
  if (bytes.length > 4 * 1024 * 1024) throw new Error('A imagem é grande demais para interpretação. Use até 4 MB.');
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }, { inlineData: { mimeType, data: bytes.toString('base64') } }] }],
      generationConfig: { temperature: 0.12, responseMimeType: 'application/json', maxOutputTokens }
    })
  }, timeoutMs);
  const raw = await response.text();
  let data = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`O Gemini devolveu resposta inválida (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(`Gemini ${model}: ${data?.error?.message || `HTTP ${response.status}`}`);
  const text = data?.candidates?.[0]?.content?.parts?.map((part) => typeof part?.text === 'string' ? part.text : '').join('').trim();
  if (!text) throw new Error('O Gemini não devolveu a estrutura do wireframe.');
  return { text, provider: 'Gemini', model };
}

function cleanUXWritingJson(text) {
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

function buildUXWritingMessages(body) {
  const ux = body?.uxWriting || {};
  const action = String(ux.action || 'rewrite');
  const tone = String(ux.tone || 'clear');
  const glossary = Array.isArray(ux.glossary) && ux.glossary.length ? ux.glossary.join('; ') : 'sem glossário adicional';
  let task = 'reescreva o microtexto segundo o pedido adicional, preservando intenção, fatos e limites';
  if (action === 'accessible') task = 'reescreva em linguagem simples e acessível: frases curtas, voz ativa, palavras concretas, instrução explícita, sem infantilizar nem perder informação';
  if (action === 'translate') task = `traduza para ${String(ux.targetLocale || 'en-US')}, preservando tom, significado, nomes próprios, termos de produto e clareza de interface`;
  if (action === 'libras') task = 'produza um ROTEIRO/GLOSA INDICATIVA de apoio à produção em Libras, organizado de forma visual e concisa. Não afirme que é tradução final; sinalize escolhas que precisam de validação por pessoa tradutora/intérprete de Libras';
  if (action === 'variants') task = 'crie uma versão principal e até cinco alternativas curtas de microcopy';
  const system = `Você é especialista em UX Writing, linguagem simples, conteúdo acessível e localização de interfaces. ${task}. Tom desejado: ${tone}. Idioma de origem: ${String(ux.sourceLocale || 'pt-BR')}. Glossário: ${glossary}. Não invente funcionalidades, resultados ou informações ausentes. Para mensagens de erro, explique o problema e a próxima ação quando isso estiver no contexto. Para Libras, trate o resultado apenas como roteiro/glosa de apoio e inclua nota de validação humana. Retorne SOMENTE JSON válido: {"text":"...","alternatives":["..."],"notes":["..."]}.`;
  const user = `PROJETO: ${body?.project?.name || 'Projeto 5I’s'}\nTELA: ${String(ux.screen || 'não informada')}\nCONTEXTO: ${String(ux.context || 'não informado')}\nTEXTO ORIGINAL: ${String(ux.originalText || ux.sourceText || '')}\nTEXTO DE TRABALHO: ${String(ux.sourceText || '')}\nPEDIDO ADICIONAL: ${String(ux.prompt || '')}`;
  return { system, user };
}

function ensureMagoHartmannReference(result, body) {
  if (body?.mediator?.id !== 'agent-mago' || !result || typeof result !== 'object') return result;

  const shortReference = 'Hartmann Hindrichson (2022), Memórias do Futuro: uma tecnologia para projetar por cenários (Tese de Doutorado em Design, UFRGS).';
  const fullReference = 'Referência central: HARTMANN HINDRICHSON, Patricia. Memórias do Futuro: uma tecnologia para projetar por cenários. 2022. 318 f. Tese (Doutorado em Design) — UFRGS, Porto Alegre, 2022.';

  if (typeof result.scientificContext === 'string' && !/hartmann/i.test(result.scientificContext)) {
    result.scientificContext = `${result.scientificContext.trim()} ${fullReference}`;
  }

  if (typeof result.reply === 'string' && !/hartmann/i.test(result.reply)) {
    const futureTopic = /cen[aá]rio|futur|possibil|mem[oó]ria|antecip|trajet[oó]ria|trama|evid[eê]ncia|backcast|design especulativo/i.test(result.reply);
    if (futureTopic) result.reply = `${result.reply.trim()}

Referência: ${shortReference}`;
  }

  return result;
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

async function callGeminiStructured(system, user, maxOutputTokens = 6000, timeoutMs = 45000, temperature = 0.2, visualReferences = []) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');
  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }, ...sketchVisualParts(visualReferences)] }],
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

async function callGeminiInteractive(system, user, maxOutputTokens = 5000, timeoutMs = 35000, temperature = 0.35, visualReferences = []) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');
  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
  const response = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: user }, ...sketchVisualParts(visualReferences)] }],
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
  let scientificContext = `Modo pedagógico sem API. Use como roteiro de investigação na fase ${phase}; valide depois com evidências e referências.`;
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
  } else if (role.includes('futuro') || role.includes('cenario') || role.includes('cenário') || role.includes('especul')) {
    question = 'Quem participa deste futuro, que trama se desenrola, qual trajetória o produz e que evidências tornariam esse cenário experienciável?';
    provocations = ['Construa dois cenários contrastantes, sem tratá-los como previsão.', 'Organize cada cenário por atores, trama, trajetória, evidências e espaço-tempo.', 'Volte retrospectivamente do futuro desejável para uma decisão que possa ser testada agora.'];
    scientificContext = 'Hartmann Hindrichson (2022), em Memórias do Futuro: uma tecnologia para projetar por cenários (Tese de Doutorado em Design, UFRGS), propõe o projetar por cenários como prática dinâmica, social, participativa e iterativa, articulando atores, trama, trajetória, evidências e espaço-tempo.';
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
    scientificContext,
    provider: 'Modo pedagógico',
    model: 'offline'
  };
}

async function generateMediatorInsight(body) {
  if (body?.mode === 'wireframe-interpret') {
    if (!body?.wireframeSource) throw new Error('Escolha um desenho ou imagem para interpretar.');
    const { system, user } = buildWireframeInterpretationMessages(body);
    const result = await callGeminiWireframe(system, user, body.wireframeSource, 3600, Number(process.env.AI_WIREFRAME_TIMEOUT_MS || 45000));
    return { wireframeInterpretation: cleanWireframeInterpretationJson(result.text), provider: result.provider, model: result.model };
  }

  if (body?.mode === 'video-compose') {
    if (!String(body?.prompt || '').trim()) throw new Error('Descreva o vídeo que deseja montar.');
    const { system, user } = buildVideoPlanMessages(body);
    const startedAt=Date.now();
    const timeout = Math.min(35000,Math.max(5000,Number(process.env.AI_VIDEO_TIMEOUT_MS || 35000)));
    let result = await callGeminiStructured(system, user, 3600, timeout, 0.22);
    try {
      const plan = cleanVideoPlanJson(result.text);
      if (!plan.timeline.length) throw new Error('timeline vazia');
      return { videoPlan: plan, provider: result.provider, model: result.model };
    } catch {
      result = await callGeminiStructured(system, `${user}

CORREÇÃO OBRIGATÓRIA: devolva JSON puro, sem markdown, e crie pelo menos uma cena executável. Use mediaId EXATAMENTE como listado quando houver mídia; para cenas gráficas ou biblioteca vazia, use mediaId vazio.`, 2600, Math.max(2000,Math.min(timeout,52000-(Date.now()-startedAt))), 0.12);
      return { videoPlan: cleanVideoPlanJson(result.text), provider: result.provider, model: result.model };
    }
  }

  if (body?.mode === 'character-design') {
    if (!String(body?.prompt || '').trim()) throw new Error('Descreva como deseja criar ou refinar o personagem.');
    const { system, user } = buildCharacterDesignMessages(body);
    const refs = body.visualReferences || [];
    if (body.characterSourceMode === 'reference' && !refs.length) throw new Error('Escolha ou envie um desenho como referência.');
    sketchVisualParts(refs);
    const result = await callGeminiStructured(system, user, 5200, Number(process.env.AI_CHARACTER_TIMEOUT_MS || 45000), 0.16, refs);
    return { characterDesign: cleanCharacterDesignJson(result.text), provider: result.provider, model: result.model };
  }

  if (body?.mode === 'character-svg') {
    if (!String(body?.prompt || '').trim()) throw new Error('Descreva como deseja criar ou refinar o personagem.');
    const { system, user } = buildCharacterSvgMessages(body);
    const refs = body.visualReferences || [];
    if (body.characterSourceMode === 'reference' && !refs.length) throw new Error('Escolha ou envie um desenho como referência.');
    sketchVisualParts(refs);
    const startedAt = Date.now();
    const timeout = Math.min(45000, Math.max(2000, Number(process.env.AI_CHARACTER_TIMEOUT_MS || 45000)));
    let result = await callGeminiStructured(system, user, 10000, timeout, 0.22, refs);
    let characterSvg;
    try { characterSvg = cleanCharacterSvgJson(result.text); }
    catch (error) {
      const remaining = 52000 - (Date.now() - startedAt);
      if (remaining < 3000) throw error;
      result = await callGeminiStructured(system, user + '\nCORREÇÃO: retorne JSON puro com svg completo, autocontido, não vazio, sem scripts ou imagens externas. Não corte o SVG.', 10000, Math.min(timeout, remaining), 0.15, refs);
      characterSvg = cleanCharacterSvgJson(result.text);
    }
    return { characterSvg, provider: result.provider, model: result.model };
  }
  if (body?.mode === 'character-sheet') {
    const { system, user } = buildCharacterSheetMessages(body);
    const result = await callGeminiStructured(system, user, 4200, Number(process.env.AI_CHARACTER_TIMEOUT_MS || 40000), 0.2);
    return { characterSheet: cleanCharacterSheetJson(result.text), provider: result.provider, model: result.model };
  }
  if (body?.mode === 'data-story') {
    if (!String(body?.prompt || '').trim()) throw new Error('Diga o que você quer descobrir ou comunicar com os dados.');
    const { system, user } = buildDataStoryMessages(body);
    const result = await callGeminiStructured(system, user, 3200, Number(process.env.AI_DATA_STORY_TIMEOUT_MS || 35000), 0.18);
    return { dataStory: cleanDataStoryJson(result.text), provider: result.provider, model: result.model };
  }

  if (body?.mode === 'graphic-experiment') {
    if (!String(body?.prompt || '').trim()) throw new Error('Descreva o experimento gráfico que deseja gerar.');
    const { system, user } = buildGraphicExperimentMessages(body);
    const result = await callGeminiStructured(system, user, 3600, Number(process.env.AI_GRAPHICS_TIMEOUT_MS || 35000), 0.24);
    return { graphicExperiment: cleanGraphicExperimentJson(result.text), provider: result.provider, model: result.model };
  }

  if (body?.mode === 'brand-refine') {
    const { system, user } = buildBrandRefinementMessages(body);
    const result = await callGeminiStructured(system, user, 2400, Number(process.env.AI_BRAND_TIMEOUT_MS || 35000), 0.18);
    return { brandRefinement: cleanBrandRefinementJson(result.text), provider: result.provider, model: result.model };
  }

  if (body?.mode === 'api-builder') {
    if (!String(body?.prompt || '').trim()) throw new Error('Descreva a API que deseja criar.');
    const { system, user } = buildApiBuilderMessages(body);
    const result = await callGeminiStructured(system, user, 7000, Number(process.env.AI_API_BUILDER_TIMEOUT_MS || 50000), 0.14);
    return { apiSpec: cleanApiBuilderJson(result.text), provider: result.provider, model: result.model };
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
    const allowedEngines = ['p5', 'three', 'gsap', 'anime', 'matter', 'svg'];
    const engine = allowedEngines.includes(body.engine) ? body.engine : 'p5';
    const result = await callGeminiInteractive(system, user, 5000, Number(process.env.AI_INTERACTIVE_TIMEOUT_MS || 35000), 0.35, body.visualReferences || []);
    return { interactive: cleanInteractiveResponse(result.text, engine), provider: result.provider, model: result.model };
  }

  if (body.mode === 'publication') {
    const { system, user } = buildPublicationMessages(body);
    return callGeminiPublication(system, user);
  }

  if (body.mode === 'chat') {
    if (!String(body.message || '').trim()) throw new Error('Escreva uma mensagem para conversar com o agente.');
    const { system, user } = buildChatMessages(body);
    return ensureMagoHartmannReference(await callGeminiChat(system, user), body);
  }

  const { system, user } = buildMessages(body);
  return ensureMagoHartmannReference(await callGemini(system, user), body);
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

