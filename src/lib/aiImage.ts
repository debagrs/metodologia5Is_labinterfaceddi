import { ensureTursoSession } from './turso';

export type AiImageAction = 'create' | 'recreate' | 'adapt' | 'refine';
export type AiImageReference = { mimeType: string; data: string; name?: string };
export type AiGeneratedImage = {
  url?: string | null;
  data?: string | null;
  mimeType: string;
  name: string;
  size?: number;
  aspectRatio: string;
  model?: string;
};

const readDataUrl = (file: File) => new Promise<string>((resolve,reject)=>{
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a imagem.'));
  reader.readAsDataURL(file);
});

export async function prepareAiImageReference(file: File): Promise<AiImageReference> {
  const source = await readDataUrl(file);
  const image = await new Promise<HTMLImageElement>((resolve,reject)=>{
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível preparar a referência visual.'));
    img.src = source;
  });
  let max = 900;
  for (let attempt=0; attempt<6; attempt+=1) {
    const ratio = Math.min(1, max / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não disponibilizou o canvas necessário.');
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,width,height); ctx.drawImage(image,0,0,width,height);
    const dataUrl = canvas.toDataURL('image/jpeg', Math.max(.42,.84-attempt*.08));
    const data = dataUrl.split(',')[1] || '';
    if (data.length <= 520000) return { mimeType:'image/jpeg', data, name:file.name };
    max = Math.round(max*.74);
  }
  throw new Error('A referência ficou grande demais. Use uma imagem menor ou mais simples.');
}

export async function urlToAiReference(url: string, name = 'referência'): Promise<AiImageReference> {
  const response = await fetch(url);
  if (!response.ok) throw new Error('Não foi possível carregar a imagem do projeto como referência.');
  const blob = await response.blob();
  return prepareAiImageReference(new File([blob], name, { type: blob.type || 'image/png' }));
}

export async function generateAiImage(input: {
  prompt: string;
  action?: AiImageAction;
  aspectRatio?: string;
  preserve?: { composition?: boolean; palette?: boolean; silhouette?: boolean };
  visualReferences?: AiImageReference[];
  name?: string;
}) {
  const session = await ensureTursoSession();
  const response = await fetch('/api/generate-image', {
    method:'POST',
    headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${session.token}` },
    body:JSON.stringify({
      prompt:input.prompt,
      action:input.action || 'create',
      aspectRatio:input.aspectRatio || '1:1',
      preserve:input.preserve || {},
      visualReferences:(input.visualReferences || []).slice(0,3),
      name:input.name,
    }),
  });
  const raw = await response.text();
  let data:any = {};
  try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`A geração de imagem devolveu uma resposta inválida (HTTP ${response.status}).`); }
  if (!response.ok || !data?.image) throw new Error(data?.error || 'A IA não conseguiu gerar a imagem.');
  return { image:data.image as AiGeneratedImage, notes:Array.isArray(data.notes)?data.notes.map(String):[] };
}

export async function generatedImageToFile(image: AiGeneratedImage): Promise<File> {
  if (image.data) {
    const binary = atob(image.data);
    const bytes = new Uint8Array(binary.length);
    for (let i=0;i<binary.length;i+=1) bytes[i] = binary.charCodeAt(i);
    return new File([bytes], image.name || 'imagem-ia.png', { type:image.mimeType || 'image/png' });
  }
  if (image.url) {
    const response = await fetch(image.url);
    if (!response.ok) throw new Error('Não foi possível recuperar a imagem gerada.');
    const blob = await response.blob();
    return new File([blob], image.name || 'imagem-ia.png', { type:image.mimeType || blob.type || 'image/png' });
  }
  throw new Error('A imagem gerada não tem arquivo nem URL utilizável.');
}

export function generatedImagePreviewUrl(image: AiGeneratedImage | null) {
  if (!image) return '';
  if (image.url) return image.url;
  if (image.data) return `data:${image.mimeType || 'image/png'};base64,${image.data}`;
  return '';
}
