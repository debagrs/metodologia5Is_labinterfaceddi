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

const REFERENCES = {
  pesquisa: 'Triangulação metodológica; etnografia de design; pesquisa participante; saturação teórica; cartografia; métodos mistos.',
  ux: 'Don Norman; Preece, Rogers e Sharp; Jakob Nielsen; John Sweller; teoria da atividade; modelos mentais; 101 UX Principles.',
  bioetica: 'Van Rensselaer Potter; bioética; educação humanitária; justiça de design; alteridade; prevenção de dark patterns; impactos humanos e não humanos.',
  acessibilidade: 'WCAG; e-MAG; desenho universal; modelo social da deficiência; tecnologias assistivas; multimodalidade; linguagem simples.',
  visual: 'Gestalt; semiótica; Josef Albers; Eva Heller; Itten; Müller-Brockmann; tipografia; hierarquia e ritmo visual.',
  documentacao: 'Design tokens; documentação de decisões; ADRs; handoff; rastreabilidade; requisitos; critérios de aceite.',
  heuristicas: 'Dez heurísticas de Jakob Nielsen; leis de UX; consistência; prevenção de erros; reconhecimento em vez de memorização.',
  implementacao: 'Arquitetura de informação; requisitos funcionais e não funcionais; segurança; LGPD; desempenho; testes; critérios de aceite.'
};

function referenceFor(role) {
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

function buildMessages(body) {
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
