// @ts-nocheck
import crypto from 'node:crypto';
import { put } from '@vercel/blob';

export const config = { api: { bodyParser: false } };
const SESSION_SECRET = process.env.SESSION_SECRET || '';
function validate(rawHeader: string | undefined) {
  if (!rawHeader?.startsWith('Bearer ') || SESSION_SECRET.length < 24) return null;
  const token = rawHeader.slice(7).trim();
  const i = token.lastIndexOf('.');
  if (i <= 0) return null;
  const ownerId = token.slice(0, i), signature = token.slice(i + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(ownerId).digest('base64url');
  const a = Buffer.from(signature), b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? ownerId : null;
}
async function readBody(req: any, limit = 4 * 1024 * 1024) {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) throw new Error('Arquivo maior que 4 MB.'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido.' });
  try {
    const ownerId = validate(req.headers.authorization);
    if (!ownerId) return res.status(401).json({ error: 'Faça login novamente.' });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN não configurado na Vercel.' });
    const filename = decodeURIComponent(String(req.headers['x-file-name'] || 'arquivo'));
    const contentType = String(req.headers['content-type'] || 'application/octet-stream');
    if (!contentType.startsWith('image/') && !contentType.startsWith('video/')) return res.status(400).json({ error: 'Envie apenas imagem ou vídeo.' });
    const body = await readBody(req);
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '-');
    const blob = await put(`5is/${ownerId}/${Date.now()}-${safe}`, body, { access: 'public', contentType, token: process.env.BLOB_READ_WRITE_TOKEN });
    return res.status(201).json({ url: blob.url, pathname: blob.pathname, contentType, name: filename, size: body.length });
  } catch (error: any) {
    console.error('[5I API /api/upload]', error);
    return res.status(500).json({ error: error?.message || 'Falha no upload.' });
  }
}
