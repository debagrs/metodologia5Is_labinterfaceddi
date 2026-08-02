// @ts-nocheck
import crypto from 'node:crypto';

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
  'agent-passeio': 'Priorize Inambulação. Use cartografia, pesquisa participante, etnografia de interfaces, Latour e Costanza-Chock. Sempre devolva a pessoa ao território e à escuta.',
  'agent-instaura': 'Priorize Instauração. Use Norman, Preece/Rogers/Sharp, Gestalt, Heller, semiótica, arquitetura da informação e prototipação. Evite figmarismo e respostas visuais genéricas.',
  'agent-inspetor': 'Priorize Inspeção. Use Nielsen, Norman, ergonomia cognitiva, testes, WCAG/e-MAG e evidências observáveis. Diferencie opinião de problema documentado.',
  'agent-rede': 'Leia o projeto como rede sociotécnica com Latour, Simondon e Haraway: humanos, não humanos, instituições, dados, dispositivos, plataformas e infraestruturas.',
  'agent-ativista': 'Atue por bioética, design justice e educação humanitária com Potter, Haraway, Costanza-Chock e Zuboff. Pergunte sobre poder, participação, extração, sustentabilidade e impactos humanos e não humanos.',
  'agent-responsa': 'Converta responsabilidade em requisitos verificáveis: WCAG, e-MAG, desenho universal, linguagem simples, LGPD, segurança, transparência e possibilidade de recusa.',
  'agent-implementa': 'Priorize Implementação como experimentação contínua: design systems, tokens, componentes, documentação, critérios de aceite, testes, publicação e manutenção.'
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

    if (ownerId) {
      try {
        remainingToday = await consumeAiQuota(ownerId, Number(process.env.AI_DAILY_LIMIT || 20));
      } catch (quotaError: any) {
        const message = quotaError?.message || 'Falha ao consultar a cota diária.';
        if (/Limite diário/i.test(message)) return res.status(429).json({ error: message, stage: 'quota' });
        console.error('[5I API] Turso/cota indisponível:', quotaError);
        warnings.push('A IA respondeu, mas o controle de cota do Turso não pôde ser atualizado.');
      }
    } else {
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
