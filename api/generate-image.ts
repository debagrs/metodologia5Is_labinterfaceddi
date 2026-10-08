// @ts-nocheck
import crypto from 'node:crypto';
import { put } from '@vercel/blob';

export const maxDuration = 60;

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const MAX_REFERENCE_BYTES = 1_600_000;
const MAX_REFERENCES = 3;
const ALLOWED_ASPECTS = new Set(['1:1','2:3','3:2','3:4','4:3','4:5','5:4','9:16','16:9','21:9']);

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
  const actual = Buffer.from(signature);
  const wanted = Buffer.from(expected);
  if (actual.length !== wanted.length) return null;
  return crypto.timingSafeEqual(actual, wanted) ? ownerId : null;
}

function sanitizeName(value: string) {
  const name = String(value || 'imagem-ia')
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^a-zA-Z0-9._-]/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'');
  return name || 'imagem-ia';
}

function actionInstruction(action: string, preserve: any) {
  const keep = [
    preserve?.composition ? 'composição e enquadramento' : '',
    preserve?.palette ? 'paleta e relações cromáticas' : '',
    preserve?.silhouette ? 'silhueta e proporções principais' : '',
  ].filter(Boolean).join(', ');
  const suffix = keep ? ` Preserve ${keep}.` : '';
  if (action === 'recreate') return `Recrie a referência visual segundo o pedido, mantendo sua identidade visual essencial.${suffix}`;
  if (action === 'adapt') return `Adapte a referência ao novo contexto descrito, sem apagar os elementos reconhecíveis que devem permanecer.${suffix}`;
  if (action === 'refine') return `Refine a imagem existente: melhore acabamento, coerência, legibilidade e qualidade visual sem descaracterizá-la.${suffix}`;
  return 'Crie uma imagem original a partir do pedido. Não inclua marcas d\'água, UI falsa ou texto ilegível desnecessário.';
}

function parseGeneratedImage(data: any) {
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((part: any) => part?.inlineData?.data && String(part?.inlineData?.mimeType || '').startsWith('image/'));
  if (!imagePart) {
    const reason = data?.candidates?.[0]?.finishReason || data?.promptFeedback?.blockReason;
    throw new Error(reason ? `O modelo não devolveu imagem (${reason}).` : 'O modelo não devolveu dados de imagem.');
  }
  const mimeType = String(imagePart.inlineData.mimeType || 'image/png');
  const buffer = Buffer.from(String(imagePart.inlineData.data), 'base64');
  if (!buffer.length) throw new Error('A imagem gerada veio vazia.');
  const notes = parts.filter((part: any) => typeof part?.text === 'string').map((part: any) => part.text.trim()).filter(Boolean).slice(0,3);
  return { buffer, mimeType, notes };
}

async function callImageModel(model: string, body: any) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) throw new Error('GEMINI_API_KEY não foi encontrada nas variáveis da Vercel.');
  const aspectRatio = ALLOWED_ASPECTS.has(String(body.aspectRatio)) ? String(body.aspectRatio) : '1:1';
  const parts: any[] = [{ text: `${actionInstruction(body.action, body.preserve)}\n\nPEDIDO DA PESSOA:\n${String(body.prompt || '').trim()}\n\nProduza somente uma imagem final coerente com o pedido.` }];
  const references = Array.isArray(body.visualReferences) ? body.visualReferences.slice(0, MAX_REFERENCES) : [];
  let total = 0;
  for (const ref of references) {
    const data = String(ref?.data || '');
    const mimeType = String(ref?.mimeType || 'image/jpeg');
    const approx = Math.ceil(data.length * 0.75);
    total += approx;
    if (total > MAX_REFERENCE_BYTES) throw new Error('As referências visuais juntas ficaram grandes demais. Use imagens menores.');
    if (data && mimeType.startsWith('image/')) parts.push({ inlineData: { mimeType, data } });
  }
  // REST GenerateContent usa imageConfig para proporção/tamanho. O antigo
  // responseFormat enviado aqui era aceito por SDKs mais novos, mas não por este endpoint REST.
  const generationConfig: any = {
    responseModalities: ['IMAGE'],
    imageConfig: { aspectRatio },
  };
  if (!model.includes('2.5-flash-image')) generationConfig.imageConfig.imageSize = '1K';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig }),
  });
  const raw = await response.text();
  let data: any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`O serviço de imagem devolveu uma resposta inválida (HTTP ${response.status}).`); }
  if (!response.ok) throw new Error(data?.error?.message || `Falha no modelo de imagem (HTTP ${response.status}).`);
  return parseGeneratedImage(data);
}

async function generateWithFallback(body: any) {
  const preferred = String(process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image').trim();
  const models = Array.from(new Set([preferred, 'gemini-3.1-flash-image', 'gemini-nano-banana-2.1', 'gemini-2.5-flash-image'])).filter(Boolean);
  const errors: string[] = [];
  for (const model of models) {
    try { return { ...(await callImageModel(model, body)), model }; }
    catch (error: any) {
      const message = String(error?.message || error);
      errors.push(`${model}: ${message}`);
      if (/quota|billing|safety|blocked/i.test(message)) break;
    }
  }
  throw new Error(errors[0] || 'Nenhum modelo de imagem respondeu.');
}

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método não permitido. Use POST.' });
  }
  try {
    const ownerId = validateSessionToken(req.headers.authorization);
    if (!ownerId) return res.status(401).json({ error: 'Sua sessão expirou. Saia e entre novamente.', stage: 'session' });
    const body = req.body || {};
    if (!String(body.prompt || '').trim()) return res.status(400).json({ error: 'Descreva a imagem que deseja gerar.' });
    const generated = await generateWithFallback(body);
    const ext = generated.mimeType.includes('jpeg') ? 'jpg' : generated.mimeType.includes('webp') ? 'webp' : 'png';
    const base = sanitizeName(body.name || String(body.prompt || '').split(/\s+/).slice(0,6).join('-'));
    const filename = `${base}.${ext}`;
    let url = '';
    let downloadUrl = '';
    try {
      const blob = await put(`5is/${ownerId}/ai/${Date.now()}-${filename}`, generated.buffer, {
        access: 'public', contentType: generated.mimeType, addRandomSuffix: true,
      });
      url = blob.url;
      downloadUrl = blob.downloadUrl;
    } catch (blobError: any) {
      console.error('[5I API /api/generate-image] blob fallback', blobError);
    }
    return res.status(200).json({
      image: {
        url: url || null,
        downloadUrl: downloadUrl || null,
        data: url ? null : generated.buffer.toString('base64'),
        mimeType: generated.mimeType,
        name: filename,
        size: generated.buffer.length,
        aspectRatio: ALLOWED_ASPECTS.has(String(body.aspectRatio)) ? String(body.aspectRatio) : '1:1',
        model: generated.model,
      },
      notes: generated.notes,
    });
  } catch (error: any) {
    console.error('[5I API /api/generate-image]', error);
    return res.status(502).json({
      error: error?.message || 'Não foi possível gerar a imagem.',
      stage: 'image-generation',
      provider: 'Gemini',
      model: process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image',
    });
  }
}
