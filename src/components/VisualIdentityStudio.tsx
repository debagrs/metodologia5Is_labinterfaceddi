import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen, Check, FileText, Image as ImageIcon, Info, LayoutGrid, Loader2, Palette,
  Plus, RefreshCw, Save, Sparkles, Trash2, Type, Upload, X
} from 'lucide-react';
import { StudioWorkspace } from './StudioWorkspace';
import { DesignSystemDocument, VisualIdentityApplication, VisualIdentityDocument } from '../types';
import { useGraphicFonts } from '../lib/graphicFonts';
import { ensureTursoSession } from '../lib/turso';

interface Props {
  document: VisualIdentityDocument;
  title?: string;
  canEdit?: boolean;
  onSave: (document: VisualIdentityDocument) => void;
  onClose: () => void;
  onAddToNotes?: (title: string, content: string) => void;
  designSystem?: DesignSystemDocument;
}

const uid = (prefix = 'brand') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const REFERENCES = [
  { author: 'Alina Wheeler', work: 'Design de Identidade da Marca', note: 'Processo: pesquisa, estratégia, criação, pontos de contato e governança da marca.' },
  { author: 'David Airey', work: 'Logo Design Love', note: 'Logo memorável, pertinente, simples o suficiente para funcionar em escalas e contextos diversos.' },
  { author: 'Cecília Consolo', work: 'Marcas — Design Estratégico', note: 'A identidade como sistema estratégico: marca, repertório, cultura, gestão e coerência.' },
  { author: 'Alexandre Wollner', work: 'Sistemas de identidade visual', note: 'Rigor construtivo, síntese, modulação, legibilidade e consistência do sistema.' },
  { author: 'Aloísio Magalhães', work: 'Design e identidade cultural brasileira', note: 'Identidade como construção cultural situada, capaz de evitar soluções genéricas e importadas.' },
];

const DEFAULT_APPLICATIONS: VisualIdentityApplication[] = [
  { id: 'app-social', type: 'social', title: 'Post / capa social' },
  { id: 'app-poster', type: 'poster', title: 'Cartaz' },
  { id: 'app-card', type: 'card', title: 'Cartão / assinatura' },
  { id: 'app-stationery', type: 'stationery', title: 'Papelaria institucional' },
  { id: 'app-letterhead', type: 'letterhead', title: 'Papel timbrado' },
  { id: 'app-tshirt', type: 'tshirt', title: 'Camiseta', productColor: '#F7F7F4', material: 'fabric', scene: 'studio', artworkScale: 1 },
  { id: 'app-hoodie', type: 'hoodie', title: 'Moletom / hoodie', productColor: '#EFEFED', material: 'fabric', scene: 'studio', artworkScale: .9 },
  { id: 'app-mug', type: 'mug', title: 'Caneca', productColor: '#FFFFFF', material: 'glossy', scene: 'studio', artworkScale: .9 },
  { id: 'app-bottle', type: 'bottle', title: 'Garrafa', productColor: '#F4F4F2', material: 'matte', scene: 'studio', artworkScale: .82 },
  { id: 'app-can', type: 'can', title: 'Lata', productColor: '#F5F5F2', material: 'glossy', scene: 'studio', artworkScale: .86 },
  { id: 'app-box', type: 'box', title: 'Caixa', productColor: '#F4F0E8', material: 'kraft', scene: 'studio', artworkScale: .78 },
  { id: 'app-phone', type: 'phone', title: 'Tela de celular', productColor: '#171717', material: 'glossy', scene: 'dark', artworkScale: .9 },
  { id: 'app-book', type: 'book', title: 'Livro / publicação', productColor: '#F7F7F3', material: 'matte', scene: 'studio', artworkScale: .85 },
  { id: 'app-pencil', type: 'pencil', title: 'Lápis / material de apoio' },
  { id: 'app-notebook', type: 'notebook', title: 'Caderno' },
  { id: 'app-tote', type: 'tote', title: 'Ecobag' },
  { id: 'app-pack', type: 'packaging', title: 'Embalagem / rótulo' },
  { id: 'app-sign', type: 'signage', title: 'Sinalização' },
  { id: 'app-interface', type: 'interface', title: 'Interface digital' },
];

const dsRole = (ds: DesignSystemDocument | undefined, role: string, fallback: string) => ds?.colors.find((color) => color.role === role)?.value || fallback;

const normalizeHex = (value: string, fallback = '#000000') => {
  const clean = String(value || '').trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{3}$/.test(clean)) return `#${clean.split('').map((x) => x + x).join('')}`;
  if (/^[0-9A-F]{6}$/.test(clean)) return `#${clean}`;
  return fallback;
};
const rgbToHex = (r: number, g: number, b: number) => `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const hexToRgb = (hex: string) => {
  const safe = normalizeHex(hex);
  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16),
  };
};
const mixHex = (a: string, b: string, amount = 0.5) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  const t = Math.max(0, Math.min(1, amount));
  return rgbToHex(x.r + (y.r - x.r) * t, x.g + (y.g - x.g) * t, x.b + (y.b - x.b) * t);
};
const colorDistance = (a: string, b: string) => {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
};
const isNearGray = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return Math.abs(r - g) < 10 && Math.abs(g - b) < 10;
};
async function extractPaletteFromImageFile(file: File): Promise<string[]> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Falha ao ler arquivo da marca.'));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Falha ao analisar a imagem enviada.'));
    image.src = dataUrl;
  });
  const canvas = document.createElement('canvas');
  const size = 72;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map<string, number>();
  for (let i = 0; i < data.length; i += 16) {
    const alpha = data[i + 3];
    if (alpha < 120) continue;
    const r = Math.round(data[i] / 16) * 16;
    const g = Math.round(data[i + 1] / 16) * 16;
    const b = Math.round(data[i + 2] / 16) * 16;
    const hex = rgbToHex(r, g, b);
    if (hex === '#FFFFFF' || hex === '#000000') continue;
    buckets.set(hex, (buckets.get(hex) || 0) + 1);
  }
  const sorted = [...buckets.entries()].sort((a, b) => b[1] - a[1]).map(([hex]) => hex);
  const chosen: string[] = [];
  for (const hex of sorted) {
    if (!chosen.some((existing) => colorDistance(existing, hex) < 42)) chosen.push(hex);
    if (chosen.length >= 6) break;
  }
  const neutrals = sorted.filter((hex) => isNearGray(hex) || colorDistance(hex, '#FFFFFF') < 28 || colorDistance(hex, '#111111') < 28).slice(0, 2);
  return [...chosen, ...neutrals].slice(0, 6);
}
function applyExtractedPalette(document: VisualIdentityDocument, colors: string[]): VisualIdentityDocument {
  if (!colors.length) return document;
  const roles = [
    ['Principal', 'Reconhecimento'],
    ['Apoio', 'Contraste'],
    ['Claro', 'Fundo'],
    ['Escuro', 'Texto'],
    ['Acento', 'Destaque'],
    ['Neutro', 'Apoio'],
  ] as const;
  const fallback = document.palette.map((item) => item.color);
  const preferred = [
    colors.find((hex) => !isNearGray(hex)) || colors[0] || fallback[0] || '#267F77',
    colors.find((hex, index) => index > 0 && !isNearGray(hex) && colorDistance(hex, colors[0] || '#267F77') > 55) || colors[1] || fallback[1] || '#FF4F9A',
    colors.find((hex) => colorDistance(hex, '#FFFFFF') < 90) || fallback[2] || '#F4F2ED',
    colors.find((hex) => colorDistance(hex, '#000000') < 120 || isNearGray(hex)) || fallback[3] || '#161616',
    colors[2] || fallback[4] || '#D7FF38',
    colors[3] || fallback[5] || mixHex(fallback[0] || '#267F77', '#FFFFFF', 0.72),
  ];
  return {
    ...document,
    palette: preferred.map((hex, index) => ({
      id: document.palette[index]?.id || `upload-${index}`,
      name: document.palette[index]?.name || roles[index]?.[0] || `Cor ${index + 1}`,
      role: document.palette[index]?.role || roles[index]?.[1] || 'Apoio',
      color: normalizeHex(hex, document.palette[index]?.color || '#000000'),
    })),
  };
}


export function mergeIdentityWithDesignSystem(document: VisualIdentityDocument, ds?: DesignSystemDocument): VisualIdentityDocument {
  if (!ds) return document;
  const display = ds.fontFamilies?.display || ds.typography.find((item) => item.familyRole === 'display')?.family || ds.primaryFont || document.typography.display;
  const textFont = ds.fontFamilies?.text || ds.typography.find((item) => item.familyRole === 'text')?.family || ds.primaryFont || document.typography.text;
  const notes = ds.fontFamilies?.notes || ds.typography.find((item) => item.familyRole === 'notes')?.family || document.typography.accent;
  const mapped = [
    { id: 'c1', name: 'Principal', role: 'Reconhecimento', color: dsRole(ds, 'brand', document.palette[0]?.color || '#267F77') },
    { id: 'c2', name: 'Apoio', role: 'Contraste', color: dsRole(ds, 'accent', document.palette[1]?.color || '#FF4F9A') },
    { id: 'c3', name: 'Claro', role: 'Fundo', color: dsRole(ds, 'surface', document.palette[2]?.color || '#F4F2ED') },
    { id: 'c4', name: 'Escuro', role: 'Texto', color: dsRole(ds, 'text', document.palette[3]?.color || '#161616') },
  ];
  const extra = ds.colors.filter((c) => !['brand','accent','surface','text'].includes(c.role || '')).slice(0, 3).map((c, index) => ({ id: `ds-${index}`, name: c.name || 'Acento', role: c.role || 'Apoio', color: c.value }));
  return {
    ...document,
    palette: [...mapped, ...extra],
    typography: { display, text: textFont, accent: notes },
    sourceDesignSystemUpdatedAt: ds.updatedAt || new Date().toISOString(),
  };
}

export const blankVisualIdentity = (ds?: DesignSystemDocument): VisualIdentityDocument => mergeIdentityWithDesignSystem({
  title: 'Identidade visual do projeto',
  brandName: 'Nome da marca',
  tagline: 'Uma frase curta que orienta a presença da marca',
  essence: 'Qual é a ideia central que esta marca precisa tornar visível?',
  audience: 'Para quem esta marca existe e em qual contexto ela será encontrada?',
  positioning: 'O que torna esta proposta específica, reconhecível e diferente?',
  personality: ['clara', 'autoral', 'contemporânea'],
  logo: { kind: 'combination', symbolStyle: 'geometric', monogram: 'NM', lockup: 'horizontal' },
  palette: [
    { id: 'c1', name: 'Principal', role: 'Reconhecimento', color: '#267F77' },
    { id: 'c2', name: 'Apoio', role: 'Contraste', color: '#FF4F9A' },
    { id: 'c3', name: 'Claro', role: 'Fundo', color: '#F4F2ED' },
    { id: 'c4', name: 'Escuro', role: 'Texto', color: '#161616' },
    { id: 'c5', name: 'Acento', role: 'Destaque', color: '#D7FF38' },
  ],
  typography: { display: 'Space Grotesk', text: 'Inter', accent: 'IBM Plex Mono' },
  graphicLanguage: 'Defina formas, ritmo, grid, ilustrações, ícones, texturas e comportamento dos elementos gráficos.',
  photoBrief: 'Descreva luz, enquadramento, pessoas/objetos, profundidade, tratamento de cor, o que evitar e o grau de espontaneidade das imagens.',
  logoRules: 'Preservar contraste, área de proteção e legibilidade. Não distorcer, inclinar, alterar proporções ou usar sobre fundos sem contraste.',
  applications: DEFAULT_APPLICATIONS,
  manualNotes: 'Registre aqui regras de consistência, exceções, acessibilidade, arquivos-mestre e orientações de implementação.',
}, ds);

const applicationLabels: Record<VisualIdentityApplication['type'], string> = {
  social: 'SOCIAL', poster: 'CARTAZ', card: 'CARTÃO', packaging: 'EMBALAGEM', signage: 'SINALIZAÇÃO', interface: 'INTERFACE',
  tshirt: 'CAMISETA', hoodie: 'HOODIE', mug: 'CANECA', bottle: 'GARRAFA', can: 'LATA', box: 'CAIXA', phone: 'CELULAR', book: 'LIVRO', pencil: 'LÁPIS', stationery: 'PAPELARIA', letterhead: 'PAPEL TIMBRADO', notebook: 'CADERNO', tote: 'ECOBAG',
};

const APPLICATION_TYPES: Array<{ id: VisualIdentityApplication['type']; label: string }> = [
  { id:'social', label:'Social' }, { id:'poster', label:'Cartaz' }, { id:'card', label:'Cartão' }, { id:'stationery', label:'Papelaria' },
  { id:'letterhead', label:'Papel timbrado' }, { id:'tshirt', label:'Camiseta' }, { id:'hoodie', label:'Hoodie' }, { id:'mug', label:'Caneca' }, { id:'bottle', label:'Garrafa' }, { id:'can', label:'Lata' }, { id:'box', label:'Caixa' }, { id:'phone', label:'Celular' }, { id:'book', label:'Livro' }, { id:'pencil', label:'Lápis' },
  { id:'notebook', label:'Caderno' }, { id:'tote', label:'Ecobag' }, { id:'packaging', label:'Embalagem' }, { id:'signage', label:'Sinalização' }, { id:'interface', label:'Interface' },
];

function Mark({ document, compact = false, inverse = false }: { document: VisualIdentityDocument; compact?: boolean; inverse?: boolean }) {
  const primary = document.palette[0]?.color || '#267F77';
  const secondary = document.palette[1]?.color || '#FF4F9A';
  const monogram = (document.logo.monogram || document.brandName.slice(0, 2) || 'ID').slice(0, 3).toUpperCase();
  const shape = document.logo.symbolStyle;
  if (document.logo.assetUrl && document.logo.useUploadedAsset !== false) {
    return <img src={document.logo.assetUrl} alt={document.logo.assetName || `Marca ${document.brandName}`} className={`${compact ? 'max-h-12 max-w-36' : 'max-h-32 max-w-[24rem]'} object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.14)]`} />;
  }
  const symbol = <div className={`${compact ? 'h-10 w-10' : 'h-16 w-16'} shrink-0 relative flex items-center justify-center overflow-hidden`} style={{ color: inverse ? '#FFFFFF' : primary }}>
    {shape === 'geometric' && <div className="absolute inset-1 rotate-12 border-[5px] rounded-[28%]" style={{ borderColor: primary }} />}
    {shape === 'organic' && <div className="absolute inset-1 rounded-[58%_42%_62%_38%/42%_56%_44%_58%]" style={{ background: primary }} />}
    {shape === 'seal' && <div className="absolute inset-1 rounded-full border-[5px]" style={{ borderColor: primary }} />}
    {shape === 'abstract' && <><div className="absolute left-1 top-2 h-8 w-8 rounded-full" style={{ background: primary }} /><div className="absolute right-1 bottom-2 h-8 w-8 rotate-45" style={{ background: secondary }} /></>}
    <b className={`relative z-10 ${shape === 'organic' || shape === 'abstract' ? 'text-white' : ''} ${compact ? 'text-[10px]' : 'text-sm'}`}>{monogram}</b>
  </div>;
  if (document.logo.lockup === 'symbol-only') return symbol;
  if (document.logo.lockup === 'stacked') return <div className="flex flex-col items-center text-center gap-2">{symbol}<div><b className={compact ? 'text-xs' : 'text-xl'} style={{ fontFamily: document.typography.display, color: inverse ? '#FFFFFF' : undefined }}>{document.brandName}</b>{!compact && <div className="text-[9px] opacity-60">{document.tagline}</div>}</div></div>;
  return <div className="flex items-center gap-3">{document.logo.kind !== 'wordmark' && symbol}<div><b className={compact ? 'text-xs' : 'text-xl'} style={{ fontFamily: document.typography.display, color: inverse ? '#FFFFFF' : undefined }}>{document.brandName}</b>{!compact && <div className="text-[9px] opacity-60">{document.tagline}</div>}</div></div>;
}

function BrandBadge({ document, inverse = false }: { document: VisualIdentityDocument; inverse?: boolean }) {
  const uploaded = Boolean(document.logo.assetUrl && document.logo.useUploadedAsset !== false);
  return <div className={`origin-center ${uploaded ? 'scale-[.86]' : 'scale-[.78]'} ${uploaded && inverse ? 'rounded-xl bg-white/92 p-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)]' : ''}`}><Mark document={document} compact inverse={inverse && !uploaded} /></div>;
}

function ApplicationPreview({ document, app }: { document: VisualIdentityDocument; app: VisualIdentityApplication }) {
  const primary = document.palette[0]?.color || '#267F77';
  const support = document.palette[1]?.color || '#FF4F9A';
  const paper = document.palette[2]?.color || '#F4F2ED';
  const ink = document.palette[3]?.color || '#151515';
  const accent = document.palette[4]?.color || '#D7FF38';
  const productColor = app.productColor || paper;
  const artworkScale = app.artworkScale ?? 1;
  const artworkX = app.artworkX ?? 0;
  const artworkY = app.artworkY ?? 0;
  const angle = app.angle ?? 0;
  const material = app.material || (['tshirt','hoodie','tote'].includes(app.type) ? 'fabric' : 'matte');
  const scene = app.scene || 'studio';
  const sceneBackground = scene === 'dark'
    ? 'radial-gradient(circle at 50% 18%, #4B4B4B 0, #222 46%, #0D0D0D 100%)'
    : scene === 'warm'
      ? 'linear-gradient(180deg, #E9DED0 0, #CFC0AE 100%)'
      : scene === 'paper'
        ? 'linear-gradient(180deg, #F2EEE6 0, #E3DDD3 100%)'
        : 'linear-gradient(180deg, #ECECE9 0, #D8D8D4 100%)';
  const shadow = '0 20px 46px rgba(12, 12, 12, 0.18)';
  const artTransform = `translate(${artworkX}px, ${artworkY}px) scale(${artworkScale}) rotate(${angle}deg)`;
  const artLayer = (inverse = false, size: 'sm' | 'md' | 'lg' = 'md', className = '') => <div className={className} style={{ transform: artTransform, transformOrigin: 'center' }}>{brandPlate(inverse, size)}</div>;
  const label = (
    <div className="absolute inset-x-3 bottom-3 z-20 rounded-xl bg-white/92 backdrop-blur px-2.5 py-2 shadow-sm ring-1 ring-black/5">
      <div className="text-[8px] font-mono tracking-[0.16em] text-neutral-400">{applicationLabels[app.type]}</div>
      <b className="block text-[11px] leading-tight" style={{ fontFamily: document.typography.display }}>{app.title}</b>
    </div>
  );
  const brandPlate = (inverse = false, size: 'sm' | 'md' | 'lg' = 'md') => (
    <div
      className={`rounded-2xl ${inverse ? 'bg-[#111]/85' : 'bg-white/92'} border border-black/5 backdrop-blur`}
      style={{
        boxShadow: '0 10px 28px rgba(15, 15, 15, 0.14)',
        padding: size === 'lg' ? '14px 18px' : size === 'sm' ? '8px 10px' : '10px 14px',
      }}
    >
      <Mark document={document} compact={size === 'sm'} inverse={inverse} />
    </div>
  );
  const cardBase = 'aspect-[4/3] rounded-[22px] overflow-hidden border border-black/10 relative';

  if (app.type === 'social') return <div className={cardBase} style={{ background: `linear-gradient(145deg, ${mixHex(primary, '#FFFFFF', 0.86)}, ${mixHex(support, '#FFFFFF', 0.8)})` }}>
    <div className="absolute inset-0 opacity-70" style={{ background: `radial-gradient(circle at 18% 18%, ${mixHex(accent, '#FFFFFF', 0.38)} 0, transparent 22%), radial-gradient(circle at 82% 20%, ${mixHex(support, '#FFFFFF', 0.4)} 0, transparent 18%), linear-gradient(120deg, transparent 0, rgba(255,255,255,0.5) 46%, transparent 75%)` }} />
    <div className="absolute left-4 top-4">{brandPlate(false, 'sm')}</div>
    <div className="absolute left-4 right-4 bottom-16 rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${mixHex(primary, '#000000', 0.12)}, ${mixHex(support, '#000000', 0.1)})`, boxShadow: shadow }}>
      <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/75">Campanha / social</div>
      <div className="mt-2 text-xl leading-tight" style={{ fontFamily: document.typography.display }}>{document.brandName}</div>
      <p className="mt-2 text-[11px] text-white/80 line-clamp-2" style={{ fontFamily: document.typography.text }}>{document.tagline}</p>
      <div className="mt-3 h-2 w-20 rounded-full" style={{ background: accent }} />
    </div>
    {label}
  </div>;

  if (app.type === 'poster') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #D9D5CC 0, #ECE9E1 100%)' }}>
    <div className="absolute left-1/2 top-[50%] h-[78%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border bg-white p-4" style={{ boxShadow: shadow }}>
      <div className="flex justify-between items-start gap-2"><div>{brandPlate(false, 'sm')}</div><div className="h-10 w-10 rounded-full" style={{ background: support }} /></div>
      <div className="mt-4 text-[26px] leading-none" style={{ fontFamily: document.typography.display, color: ink }}>{document.brandName}</div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400">cartaz institucional</div>
      <div className="mt-4 h-2 rounded-full" style={{ background: primary }} />
      <div className="mt-3 space-y-2">{[92, 84, 72].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-black/10" style={{ width: `${w}%` }} />)}</div>
      <div className="absolute inset-x-4 bottom-4 flex gap-2">{document.palette.slice(0, 4).map((c) => <span key={c.id} className="h-6 flex-1 rounded-full" style={{ background: c.color }} />)}</div>
    </div>
    {label}
  </div>;

  if (app.type === 'card') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #E8E3DA 0, #F2EFE9 100%)' }}>
    <div className="absolute left-[8%] right-[8%] top-[18%] bottom-[22%] rounded-[20px] border overflow-hidden" style={{ boxShadow: shadow, background: `linear-gradient(135deg, ${mixHex(primary, '#FFFFFF', 0.9)}, #FFFFFF 65%)` }}>
      <div className="absolute inset-x-0 top-0 h-2" style={{ background: primary }} />
      <div className="absolute left-4 top-4">{brandPlate(false, 'sm')}</div>
      <div className="absolute right-4 top-4 h-12 w-12 rounded-full" style={{ background: support }} />
      <div className="absolute left-4 right-4 bottom-5">
        <div className="text-[11px] font-mono uppercase tracking-[0.18em] text-neutral-400">assinatura</div>
        <div className="mt-2 text-lg" style={{ fontFamily: document.typography.display }}>{document.brandName}</div>
        <div className="mt-1 text-[10px] text-neutral-500" style={{ fontFamily: document.typography.text }}>{document.tagline}</div>
      </div>
    </div>
    {label}
  </div>;

  if (app.type === 'tshirt') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_22%,rgba(255,255,255,.82),transparent_42%)]" />
    <div className="absolute inset-x-[9%] top-[4%] bottom-[12%] flex items-center justify-center">
      <svg viewBox="0 0 300 250" className="h-full w-full drop-shadow-[0_24px_28px_rgba(0,0,0,0.24)]">
        <defs>
          <linearGradient id={`shirt-${app.id}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={mixHex(productColor, '#FFFFFF', .34)} /><stop offset="42%" stopColor={productColor} /><stop offset="100%" stopColor={mixHex(productColor, '#000000', .14)} /></linearGradient>
          <filter id={`fabric-${app.id}`}><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="7" result="noise"/><feBlend in="SourceGraphic" in2="noise" mode="soft-light"/></filter>
        </defs>
        <path d="M92 30l29-16h58l29 16 57 28-23 52-38-18v129H96V92L58 110 35 58Z" fill={`url(#shirt-${app.id})`} stroke={mixHex(productColor, '#000000', .28)} strokeWidth="2.5" filter={material==='fabric'?`url(#fabric-${app.id})`:undefined}/>
        <path d="M122 15c8 23 48 23 56 0" fill="none" stroke={mixHex(productColor, '#000000', .28)} strokeWidth="3"/>
        <path d="M101 92q18 15 37 2M202 91q-20 15-39 2M112 36q20 12 38 8M188 36q-20 12-38 8" fill="none" stroke="rgba(60,60,60,.14)" strokeWidth="2"/>
        <path d="M123 52q-7 74-5 151M176 52q7 74 5 151M101 121q25 13 48 2M199 121q-25 13-48 2" fill="none" stroke="rgba(255,255,255,.34)" strokeWidth="2"/>
      </svg>
      {artLayer(false, 'sm', 'absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2 scale-[.9]')}
    </div>
    {label}
  </div>;

  if (app.type === 'hoodie') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.72),transparent_40%)]" />
    <div className="absolute inset-x-[8%] top-[2%] bottom-[11%] flex items-center justify-center">
      <svg viewBox="0 0 310 260" className="h-full w-full drop-shadow-[0_25px_30px_rgba(0,0,0,.24)]">
        <defs><linearGradient id={`hood-${app.id}`} x1="0" x2="1" y1="0" y2="1"><stop stopColor={mixHex(productColor,'#FFFFFF',.28)}/><stop offset=".5" stopColor={productColor}/><stop offset="1" stopColor={mixHex(productColor,'#000000',.16)}/></linearGradient></defs>
        <path d="M116 31q39-33 78 0l22 20 54 30-25 49-35-17v123H100V113l-35 17-25-49 54-30Z" fill={`url(#hood-${app.id})`} stroke={mixHex(productColor,'#000000',.3)} strokeWidth="2.5"/>
        <path d="M117 30q38 47 76 0q18 18 8 47q-49 24-96 0q-8-30 12-47Z" fill={mixHex(productColor,'#000000',.08)} stroke="rgba(0,0,0,.16)" strokeWidth="2"/>
        <path d="M145 67v50M165 67v50" stroke="rgba(0,0,0,.28)" strokeWidth="2"/><circle cx="145" cy="117" r="3" fill="rgba(0,0,0,.35)"/><circle cx="165" cy="117" r="3" fill="rgba(0,0,0,.35)"/>
        <path d="M122 176q33 17 66 0v36h-66Z" fill={mixHex(productColor,'#000000',.05)} stroke="rgba(0,0,0,.15)"/>
        <path d="M110 112q18 10 30 6M200 112q-18 10-30 6M121 46q33 11 66 0" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="2"/>
      </svg>
      {artLayer(false, 'sm', 'absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 scale-[.88]')}
    </div>
    {label}
  </div>;

  if (app.type === 'mug') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_28%,rgba(255,255,255,.82),transparent_36%)]" />
    <div className="absolute left-1/2 top-[47%] h-[52%] w-[60%] -translate-x-1/2 -translate-y-1/2">
      <div className="absolute inset-y-0 left-0 right-[17%] rounded-[24px] border" style={{ background: `linear-gradient(90deg, ${mixHex(productColor,'#000000',.1)} 0%, ${mixHex(productColor,'#FFFFFF',.5)} 24%, ${productColor} 56%, ${mixHex(productColor,'#000000',.09)} 100%)`, boxShadow: shadow }} />
      <div className="absolute right-0 top-[18%] h-[58%] w-[30%] rounded-r-full border-[12px]" style={{ borderColor: mixHex(productColor, '#000000', .04), boxShadow: 'inset -6px 0 10px rgba(0,0,0,.09)' }} />
      <div className="absolute left-[8%] right-[24%] top-[8%] h-[14%] rounded-full bg-white/35 blur-[1px]" />
      {artLayer(false, 'sm', 'absolute left-[13%] top-[30%] scale-[.82]')}
    </div>
    {label}
  </div>;

  if (app.type === 'bottle') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_48%_18%,rgba(255,255,255,.84),transparent_38%)]" />
    <div className="absolute left-1/2 top-[48%] h-[70%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-[26%_26%_18%_18%/12%_12%_16%_16%] border" style={{ background:`linear-gradient(90deg,${mixHex(productColor,'#000000',.12)},${mixHex(productColor,'#FFFFFF',.42)} 24%,${productColor} 56%,${mixHex(productColor,'#000000',.12)})`, boxShadow:shadow }}>
      <div className="absolute left-[24%] right-[24%] -top-[8%] h-[13%] rounded-t-xl border" style={{ background:mixHex(productColor,'#000000',.14) }} />
      <div className="absolute left-[14%] right-[14%] top-[28%] bottom-[18%] rounded-xl border bg-white/88 shadow-inner" />
      {artLayer(false, 'sm', 'absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 scale-[.72]')}
      <div className="absolute left-[14%] top-[7%] h-[75%] w-[8%] rounded-full bg-white/24 blur-[1px]" />
    </div>
    {label}
  </div>;

  if (app.type === 'can') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,.8),transparent_40%)]" />
    <div className="absolute left-1/2 top-[47%] h-[66%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[18%/8%] border" style={{ background:`linear-gradient(90deg,${mixHex(productColor,'#000000',.15)},${mixHex(productColor,'#FFFFFF',.52)} 22%,${productColor} 52%,${mixHex(productColor,'#000000',.18)})`, boxShadow:shadow }}>
      <div className="absolute inset-x-[-2%] top-[-2%] h-[7%] rounded-full border bg-[#C9C9C9] shadow-inner" />
      <div className="absolute inset-x-[-2%] bottom-[-2%] h-[7%] rounded-full border bg-[#C7C7C7] shadow-inner" />
      <div className="absolute inset-x-[8%] top-[24%] bottom-[18%] rounded-xl bg-white/92 border" />
      {artLayer(false, 'sm', 'absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 scale-[.72]')}
      <div className="absolute left-[12%] top-[8%] h-[78%] w-[7%] rounded-full bg-white/28" />
    </div>
    {label}
  </div>;

  if (app.type === 'box') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute left-1/2 top-[48%] h-[58%] w-[62%] -translate-x-1/2 -translate-y-1/2" style={{ perspective:'900px' }}>
      <div className="absolute inset-[6%] rounded-[8px] border" style={{ background:productColor, boxShadow:shadow, transform:'rotateY(-16deg) rotateX(4deg)', transformStyle:'preserve-3d' }}>
        <div className="absolute inset-y-0 right-[-18%] w-[18%] origin-left border" style={{ background:mixHex(productColor,'#000000',.12), transform:'rotateY(82deg)' }} />
        <div className="absolute inset-x-0 top-[-18%] h-[18%] origin-bottom border" style={{ background:mixHex(productColor,'#FFFFFF',.18), transform:'rotateX(82deg)' }} />
        <div className="absolute left-[10%] right-[10%] top-[20%] bottom-[20%] rounded-xl bg-white/88 border shadow-sm" />
        {artLayer(false, 'sm', 'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 scale-[.82]')}
      </div>
    </div>
    {label}
  </div>;

  if (app.type === 'phone') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute left-1/2 top-[48%] h-[70%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[28px] border-[5px] border-black bg-black" style={{ boxShadow:shadow, transform:`translate(-50%,-50%) rotate(${angle}deg)` }}>
      <div className="absolute inset-[4px] rounded-[21px] overflow-hidden" style={{ background:`linear-gradient(150deg,${mixHex(primary,'#FFFFFF',.82)},${mixHex(support,'#FFFFFF',.7)})` }}>
        <div className="absolute inset-x-4 top-5">{artLayer(false,'sm')}</div>
        <div className="absolute left-4 right-4 top-[42%] rounded-2xl bg-white/88 p-3 shadow-lg"><div className="h-3 w-2/3 rounded-full" style={{ background:primary }}/><div className="mt-2 h-2 w-full rounded bg-black/10"/><div className="mt-1 h-2 w-4/5 rounded bg-black/10"/></div>
      </div>
      <div className="absolute left-1/2 top-[3px] h-3 w-12 -translate-x-1/2 rounded-b-xl bg-black" />
    </div>
    {label}
  </div>;

  if (app.type === 'book') return <div className={cardBase} style={{ background: sceneBackground }}>
    <div className="absolute left-[20%] right-[17%] top-[12%] bottom-[16%]" style={{ perspective:'900px' }}>
      <div className="absolute inset-0 rounded-r-[12px] border" style={{ background:productColor, boxShadow:shadow, transform:'rotateY(-14deg) rotateZ(-2deg)', transformOrigin:'left center' }}>
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-black/8 border-r" />
        <div className="absolute inset-x-[10%] top-[16%] bottom-[18%] rounded-xl bg-white/84 border" />
        {artLayer(false,'sm','absolute left-1/2 top-[42%] -translate-x-1/2 -translate-y-1/2 scale-[.8]')}
        <div className="absolute left-[12%] right-[12%] bottom-[12%] h-2 rounded-full" style={{ background:primary }} />
      </div>
    </div>
    {label}
  </div>;

  if (app.type === 'pencil') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #EAE6DF 0, #F3F0E9 100%)' }}>
    <div className="absolute left-[10%] right-[8%] top-[41%] h-9 rotate-[-7deg] rounded-sm flex items-center overflow-hidden" style={{ background: primary, boxShadow: shadow }}>
      <div className="h-full w-8" style={{ background: '#E4C091', clipPath: 'polygon(0 50%,100% 0,100% 100%)' }} />
      <div className="ml-3 text-[10px] font-bold text-white truncate" style={{ fontFamily: document.typography.display }}>{document.brandName}</div>
      <div className="ml-auto h-full w-8 border-l border-black/10" style={{ background: '#E6C7D2' }} />
    </div>
    {label}
  </div>;

  if (app.type === 'stationery') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #DCD8D0 0, #ECE8E1 100%)' }}>
    <div className="absolute left-[8%] top-[10%] h-[72%] w-[48%] rotate-[-4deg] rounded-[18px] border bg-white p-3" style={{ boxShadow: shadow }}>
      {brandPlate(false, 'sm')}
      <div className="mt-3 h-1.5 rounded-full" style={{ background: primary }} />
      <div className="mt-3 space-y-1.5">{[88, 82, 76, 65].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-black/10" style={{ width: `${w}%` }} />)}</div>
    </div>
    <div className="absolute right-[8%] bottom-[15%] h-[40%] w-[44%] rotate-[5deg] rounded-[18px] border p-3" style={{ background: paper, boxShadow: shadow }}>
      {brandPlate(false, 'sm')}
      <div className="absolute inset-x-0 bottom-0 h-3 rounded-b-[18px]" style={{ background: support }} />
    </div>
    {label}
  </div>;

  if (app.type === 'letterhead') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #DCD7CF 0, #ECE8E1 100%)' }}>
    <div className="absolute left-1/2 top-[50%] h-[78%] w-[56%] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border bg-white p-4" style={{ boxShadow: shadow }}>
      {brandPlate(false, 'sm')}
      <div className="mt-3 h-1" style={{ background: primary }} />
      <div className="mt-5 space-y-1.5">{[94, 88, 84, 70, 78, 62].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-black/10" style={{ width: `${w}%` }} />)}</div>
      <div className="absolute inset-x-4 bottom-4 h-1.5 rounded-full" style={{ background: primary }} />
    </div>
    {label}
  </div>;

  if (app.type === 'notebook') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #E1DDD5 0, #F0EDE5 100%)' }}>
    <div className="absolute left-1/2 top-[48%] h-[66%] w-[48%] -translate-x-1/2 -translate-y-1/2 rounded-r-[22px] border" style={{ background: `linear-gradient(180deg, ${mixHex(primary, '#FFFFFF', 0.1)}, ${mixHex(primary, '#000000', 0.12)})`, boxShadow: shadow }}>
      <div className="absolute -left-2 top-3 bottom-3 w-3 flex flex-col justify-around">{Array.from({ length: 8 }, (_, i) => <span key={i} className="h-2 w-4 rounded-full bg-black/25" />)}</div>
      <div className="absolute inset-0 flex items-center justify-center">{brandPlate(true, 'sm')}</div>
    </div>
    {label}
  </div>;

  if (app.type === 'tote') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #E0DBD1 0, #F1EEE6 100%)' }}>
    <div className="absolute left-1/2 top-[52%] h-[56%] w-[52%] -translate-x-1/2 -translate-y-1/2 rounded-[8px] border-2" style={{ background: mixHex(paper, '#FFFFFF', 0.2), boxShadow: shadow, borderColor: mixHex(ink, '#FFFFFF', 0.45) }}>
      <div className="absolute left-[20%] right-[20%] -top-[26%] h-[35%] rounded-t-full border-[7px] border-b-0" style={{ borderColor: mixHex(ink, '#FFFFFF', 0.38) }} />
      <div className="absolute inset-0 flex items-center justify-center">{brandPlate(false, 'sm')}</div>
    </div>
    {label}
  </div>;

  if (app.type === 'packaging') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #E1DDD5 0, #F0ECE4 100%)' }}>
    <div className="absolute left-[24%] top-[16%] h-[62%] w-[52%] rotate-[-3deg] rounded-[12px] border" style={{ background: `linear-gradient(180deg, #FFFFFF 0, ${mixHex(paper, '#FFFFFF', 0.25)} 100%)`, boxShadow: shadow }}>
      <div className="absolute inset-x-0 top-0 h-[18%] rounded-t-[12px]" style={{ background: primary }} />
      <div className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2">{brandPlate(false, 'sm')}</div>
      <div className="absolute inset-x-4 bottom-4 h-8 rounded-full" style={{ background: accent }} />
    </div>
    {label}
  </div>;

  if (app.type === 'signage') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #D5D2CC 0, #ECE8E1 100%)' }}>
    <div className="absolute left-[10%] right-[10%] top-[16%] h-[46%] rounded-[18px] px-4 flex items-center" style={{ background: `linear-gradient(135deg, ${primary}, ${mixHex(primary, support, 0.3)})`, boxShadow: shadow }}>
      {brandPlate(true, 'sm')}
      <div className="ml-auto text-2xl text-white">→</div>
    </div>
    <div className="absolute left-1/2 top-[62%] h-[22%] w-2 -translate-x-1/2 bg-neutral-700/80" />
    {label}
  </div>;

  if (app.type === 'interface') return <div className={cardBase} style={{ background: 'linear-gradient(180deg, #DDD9D1 0, #EEEAE3 100%)' }}>
    <div className="absolute left-[8%] right-[8%] top-[12%] bottom-[18%] rounded-[18px] border bg-white overflow-hidden" style={{ boxShadow: shadow }}>
      <div className="h-[18%] border-b px-3 flex items-center gap-3" style={{ background: mixHex(primary, '#FFFFFF', 0.88) }}>
        {brandPlate(false, 'sm')}
        <div className="ml-auto flex gap-1">{[0,1,2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-black/15" />)}</div>
      </div>
      <div className="p-4">
        <div className="h-6 w-2/3 rounded-lg" style={{ background: primary }} />
        <div className="mt-3 space-y-2">{[94, 82, 76].map((w, i) => <div key={i} className="h-2 rounded-full bg-black/10" style={{ width: `${w}%` }} />)}</div>
        <div className="mt-4 grid grid-cols-2 gap-2">{[primary, support, paper, accent].map((c, i) => <div key={i} className="h-12 rounded-xl" style={{ background: i === 2 ? mixHex(c, '#000000', 0.08) : c }} />)}</div>
      </div>
    </div>
    {label}
  </div>;

  return <div className={cardBase} style={{ background: paper, color: ink }}>
    <div className="absolute inset-x-0 top-0 h-3" style={{ background: primary }} />
    <div className="absolute right-4 top-4 h-14 w-14 rounded-full opacity-90" style={{ background: support }} />
    <div className="absolute left-4 top-5">{brandPlate(false, 'sm')}</div>
    {label}
  </div>;
}

export function VisualIdentityPreview({ document, className = '' }: { document: VisualIdentityDocument; className?: string }) {
  return <div className={`bg-[#F4F2ED] p-4 overflow-hidden ${className}`}>
    <div className="flex items-center justify-between gap-3"><Mark document={document} compact /><div className="flex -space-x-1">{document.palette.slice(0, 5).map((color) => <span key={color.id} className="h-5 w-5 rounded-full border border-white" style={{ background: color.color }} />)}</div></div>
    <div className="mt-4 grid grid-cols-3 gap-2">{document.applications.slice(0, 3).map((app) => <ApplicationPreview key={app.id} document={document} app={app} />)}</div>
  </div>;
}



function SketchCanvas({ value, onChange }: { value?: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111111';
    ctx.lineWidth = 3;
    if (value) {
      const img = new Image();
      img.onload = () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = value;
    }
  }, [value]);

  const point = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / rect.width) * event.currentTarget.width,
      y: ((event.clientY - rect.top) / rect.height) * event.currentTarget.height,
    };
  };

  const start = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = true;
    lastPointRef.current = point(event);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !drawingRef.current) return;
    const current = point(event);
    const last = lastPointRef.current || current;
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    lastPointRef.current = current;
  };
  const end = (event: React.PointerEvent<HTMLCanvasElement>) => {
    drawingRef.current = false;
    lastPointRef.current = null;
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };
  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL('image/png'));
  };
  const save = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onChange(canvas.toDataURL('image/png'));
  };

  return <div className="rounded-2xl border bg-[#FAFAF7] p-3">
    <canvas ref={canvasRef} width={720} height={420} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className="w-full rounded-xl border bg-white touch-none" style={{ aspectRatio: '12 / 7' }} />
    <div className="mt-3 grid grid-cols-2 gap-2">
      <button type="button" onClick={clear} className="h-10 rounded-xl border text-[10px] font-bold">LIMPAR</button>
      <button type="button" onClick={save} className="h-10 rounded-xl bg-black text-white text-[10px] font-bold">SALVAR ESBOÇO</button>
    </div>
  </div>;
}

export default function VisualIdentityStudio({ document, title = 'Identidade visual', canEdit = true, onSave, onClose, onAddToNotes, designSystem }: Props) {
  const [draft, setDraft] = useState<VisualIdentityDocument>(() => { const initial = JSON.parse(JSON.stringify(document)) as VisualIdentityDocument; return designSystem && !initial.sourceDesignSystemUpdatedAt ? mergeIdentityWithDesignSystem(initial, designSystem) : initial; });
  const [tab, setTab] = useState<'strategy' | 'brand' | 'system' | 'applications' | 'manual'>('strategy');
  const [guideOpen, setGuideOpen] = useState(false);
  const [noteDone, setNoteDone] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState('');
  const [refiningLogo, setRefiningLogo] = useState(false);
  const [refineError, setRefineError] = useState('');
  const logoFileRef = useRef<HTMLInputElement>(null);
  useGraphicFonts([draft.typography.display, draft.typography.text, draft.typography.accent]);

  const noteSummary = useMemo(() => [
    `IDENTIDADE VISUAL — ${draft.brandName}`,
    draft.tagline ? `Tagline: ${draft.tagline}` : '',
    `Essência: ${draft.essence}`,
    `Público/contexto: ${draft.audience}`,
    `Posicionamento: ${draft.positioning}`,
    `Personalidade: ${draft.personality.join(', ')}`,
    `Paleta: ${draft.palette.map((c) => `${c.name} ${c.color}`).join(' · ')}`,
    `Tipografia: ${draft.typography.display} / ${draft.typography.text} / ${draft.typography.accent}`,
    `Linguagem gráfica: ${draft.graphicLanguage}`,
    `Photobrief: ${draft.photoBrief}`,
    `Regras da marca: ${draft.logoRules}`,
  ].filter(Boolean).join('\n'), [draft]);

  const patch = (next: Partial<VisualIdentityDocument>) => setDraft((current) => ({ ...current, ...next }));
  const syncFromDesignSystem = () => {
    if (!designSystem) return;
    setDraft((current) => mergeIdentityWithDesignSystem(current, designSystem));
  };
  const uploadLogo = async (file: File) => {
    if (!file.type.startsWith('image/') && file.type !== 'image/svg+xml') return setLogoError('Envie PNG, JPG, WEBP ou SVG.');
    if (file.size > 4 * 1024 * 1024) return setLogoError('A marca precisa ter até 4 MB.');
    setUploadingLogo(true); setLogoError('');
    try {
      const extracted = await extractPaletteFromImageFile(file).catch(() => [] as string[]);
      const session = await ensureTursoSession();
      const response = await fetch('/api/upload', { method:'POST', headers:{ 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), ...(session?.token ? { Authorization:`Bearer ${session.token}` } : {}) }, body:file });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Falha no upload da marca.');
      setDraft((current) => {
        const next = applyExtractedPalette({
          ...current,
          logo:{ ...current.logo, assetUrl:data.url, assetName:file.name, useUploadedAsset:true },
          updatedAt:new Date().toISOString(),
        }, extracted);
        return { ...next, updatedAt: new Date().toISOString() };
      });
    } catch (error:any) { setLogoError(error?.message || 'Falha no upload da marca.'); }
    finally { setUploadingLogo(false); if (logoFileRef.current) logoFileRef.current.value=''; }
  };

  const applyRefinementAlternative = (alternativeId: string) => {
    setDraft((current) => {
      const alternative = current.logo.refinementAlternatives?.find((item) => item.id === alternativeId);
      if (!alternative) return current;
      return {
        ...current,
        logo: { ...current.logo, ...alternative.logo, activeRefinementId: alternativeId, useUploadedAsset: false },
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const requestLogoRefinement = async () => {
    if (refiningLogo) return;
    setRefiningLogo(true);
    setRefineError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
        body: JSON.stringify({
          mode: 'brand-refine',
          brand: {
            name: draft.brandName,
            tagline: draft.tagline,
            essence: draft.essence,
            audience: draft.audience,
            positioning: draft.positioning,
            personality: draft.personality,
            palette: draft.palette,
            logo: draft.logo,
            graphicLanguage: draft.graphicLanguage,
            photoBrief: draft.photoBrief,
            sketchDataUrl: draft.logo.sketchSvg,
            sketchNote: draft.logo.sketchNote,
          },
          prompt: draft.logo.refinementPrompt || 'Refine o esboço preservando clareza, síntese, contraste e escalabilidade.',
        }),
      });
      const data = await response.json().catch(() => ({}));
      const alternatives = Array.isArray(data.brandRefinement?.alternatives) ? data.brandRefinement.alternatives : [];
      if (!response.ok || !alternatives.length) throw new Error(data.error || 'A IA não retornou alternativas válidas.');
      setDraft((current) => ({
        ...current,
        logo: {
          ...current.logo,
          refinementAlternatives: alternatives,
          activeRefinementId: current.logo.activeRefinementId || alternatives[0]?.id,
        },
        updatedAt: new Date().toISOString(),
      }));
    } catch (error: any) {
      setRefineError(error?.message || 'Falha ao refinar a marca.');
    } finally {
      setRefiningLogo(false);
    }
  };
  const tabs = [
    ['strategy', 'ESSÊNCIA'], ['brand', 'MARCA'], ['system', 'SISTEMA'], ['applications', 'APLICAÇÕES'], ['manual', 'MANUAL'],
  ] as const;

  return <div className="studio-editor fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={(e) => e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
      <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={19} /></button>
      <div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[10px] font-mono text-neutral-500 uppercase">marca · símbolo · cor · tipografia · aplicações · manual</div></div>
      <button onClick={() => setGuideOpen(true)} className="h-11 w-11 rounded-xl border flex items-center justify-center" title="Dicas e referências"><Info size={17} /></button>
      <button disabled={!canEdit} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15} /> SALVAR</button>
    </header>

    <StudioWorkspace tools={<div>
      <div className="sticky top-0 z-10 bg-white border-b p-2 flex gap-2 overflow-x-auto">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`h-10 px-3 rounded-xl border text-[9px] font-bold shrink-0 ${tab === id ? 'bg-black text-white border-black' : 'bg-white'}`}>{label}</button>)}</div>
      <div className="p-4 space-y-4">
        {tab === 'strategy' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><Sparkles size={15} /> Estratégia antes da forma</b><p className="mt-1 text-[10px] text-neutral-500">A identidade não começa pelo logo. Defina o que precisa ser reconhecido e só depois construa o sistema visual.</p></div>
          <label className="block text-[9px] font-mono">NOME DA MARCA<input value={draft.brandName} onChange={(e) => patch({ brandName: e.target.value })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">TAGLINE<input value={draft.tagline} onChange={(e) => patch({ tagline: e.target.value })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">ESSÊNCIA<textarea value={draft.essence} onChange={(e) => patch({ essence: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">PÚBLICO / CONTEXTO<textarea value={draft.audience} onChange={(e) => patch({ audience: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">POSICIONAMENTO<textarea value={draft.positioning} onChange={(e) => patch({ positioning: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">PERSONALIDADE — SEPARE POR VÍRGULAS<input value={draft.personality.join(', ')} onChange={(e) => patch({ personality: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
        </>}

        {tab === 'brand' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><LayoutGrid size={15} /> Marca e assinatura</b><p className="mt-1 text-[10px] text-neutral-500">Comece por um sistema simples e verificável. Se a marca já existir, faça upload e use o arquivo real em todas as aplicações e mockups.</p></div>
          <div className="rounded-2xl border bg-white p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><b className="flex items-center gap-2"><Upload size={15}/> Marca existente</b><p className="mt-1 text-[10px] text-neutral-500">PNG, JPG, WEBP ou SVG · até 4 MB. O arquivo enviado passa a ser usado na prévia e nos mockups.</p></div>{draft.logo.assetUrl && <span className="text-[9px] font-mono rounded-full bg-emerald-50 text-emerald-700 px-2 py-1">ARQUIVO ATIVO</span>}</div><input ref={logoFileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e)=>{const file=e.target.files?.[0];if(file)void uploadLogo(file)}}/><button disabled={!canEdit || uploadingLogo} onClick={()=>logoFileRef.current?.click()} className="h-11 w-full rounded-xl border border-dashed flex items-center justify-center gap-2 text-xs font-bold">{uploadingLogo?<Loader2 size={15} className="animate-spin"/>:<Upload size={15}/>} {draft.logo.assetUrl?'SUBSTITUIR MARCA':'FAZER UPLOAD DA MARCA'}</button>{draft.logo.assetUrl && <div className="grid grid-cols-2 gap-2"><button onClick={()=>patch({logo:{...draft.logo,useUploadedAsset:true}})} className={`h-10 rounded-xl border text-[10px] font-bold ${draft.logo.useUploadedAsset!==false?'bg-black text-white':'bg-white'}`}>USAR ARQUIVO</button><button onClick={()=>patch({logo:{...draft.logo,useUploadedAsset:false}})} className={`h-10 rounded-xl border text-[10px] font-bold ${draft.logo.useUploadedAsset===false?'bg-black text-white':'bg-white'}`}>USAR ESTUDO PARAMÉTRICO</button></div>}{logoError&&<div className="text-[10px] text-red-600">{logoError}</div>}</div>
          <div className="rounded-2xl border bg-white p-4 space-y-3"><div><b className="flex items-center gap-2"><LayoutGrid size={15} /> Esboço livre da marca</b><p className="mt-1 text-[10px] text-neutral-500">Rabisque a forma que você imagina. O esboço e o estudo refinado ficam salvos no mesmo documento.</p></div><SketchCanvas value={draft.logo.sketchSvg} onChange={(dataUrl) => patch({ logo: { ...draft.logo, sketchSvg: dataUrl } })} /><label className="block text-[9px] font-mono">NOTAS DO ESBOÇO<textarea value={draft.logo.sketchNote || ''} onChange={(e) => patch({ logo: { ...draft.logo, sketchNote: e.target.value } })} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm" placeholder="O que esse rascunho quer resolver? Ex.: síntese, movimento, delicadeza, força, institucionalidade..." /></label></div>
          <div className="rounded-2xl border-2 border-black bg-white p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><b className="flex items-center gap-2"><Sparkles size={15} /> IA de refino</b><p className="mt-1 text-[10px] text-neutral-500">A IA lê estratégia, paleta e esboço para sugerir caminhos de marca, sem apagar o seu estudo inicial.</p></div></div><label className="block text-[9px] font-mono">PEDIDO DE REFINO<textarea value={draft.logo.refinementPrompt || ''} onChange={(e) => patch({ logo: { ...draft.logo, refinementPrompt: e.target.value } })} className="mt-1 min-h-24 w-full rounded-xl border p-3 text-sm" placeholder="Ex.: preservar meu esboço, simplificar curvas, deixar mais editorial, reforçar contraste e funcionar bem em avatar e cartaz." /></label><button disabled={refiningLogo} onClick={() => void requestLogoRefinement()} className="h-11 w-full rounded-xl bg-black text-white text-[10px] font-bold flex items-center justify-center gap-2 disabled:opacity-50">{refiningLogo ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />} {refiningLogo ? 'REFINANDO...' : 'GERAR CAMINHOS DE REFINO'}</button>{refineError ? <div className="text-[10px] text-red-600">{refineError}</div> : null}{draft.logo.refinementAlternatives?.length ? <div className="space-y-2">{draft.logo.refinementAlternatives.map((alternative) => <div key={alternative.id} className={`rounded-xl border p-3 ${draft.logo.activeRefinementId === alternative.id ? 'border-black bg-neutral-50' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><b className="text-sm">{alternative.label}</b><p className="mt-1 text-[10px] text-neutral-600">{alternative.rationale}</p><div className="mt-2 text-[9px] font-mono text-neutral-500 uppercase">{alternative.logo.kind} · {alternative.logo.symbolStyle} · {alternative.logo.lockup}</div></div><button type="button" onClick={() => applyRefinementAlternative(alternative.id)} className="h-9 shrink-0 rounded-xl border px-3 text-[10px] font-bold">APLICAR</button></div></div>)}</div> : null}</div>
          <label className="block text-[9px] font-mono">TIPO DE MARCA<select value={draft.logo.kind} onChange={(e) => patch({ logo: { ...draft.logo, kind: e.target.value as VisualIdentityDocument['logo']['kind'] } })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="wordmark">Logotipo / wordmark</option><option value="monogram">Monograma</option><option value="symbol">Símbolo</option><option value="combination">Símbolo + logotipo</option></select></label>
          <label className="block text-[9px] font-mono">LINGUAGEM DO SÍMBOLO<select value={draft.logo.symbolStyle} onChange={(e) => patch({ logo: { ...draft.logo, symbolStyle: e.target.value as VisualIdentityDocument['logo']['symbolStyle'] } })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="geometric">Geométrica</option><option value="organic">Orgânica</option><option value="seal">Selo / estrutura circular</option><option value="abstract">Abstrata</option></select></label>
          <label className="block text-[9px] font-mono">MONOGRAMA<input value={draft.logo.monogram} maxLength={3} onChange={(e) => patch({ logo: { ...draft.logo, monogram: e.target.value.toUpperCase() } })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm uppercase" /></label>
          <label className="block text-[9px] font-mono">COMPOSIÇÃO<select value={draft.logo.lockup} onChange={(e) => patch({ logo: { ...draft.logo, lockup: e.target.value as VisualIdentityDocument['logo']['lockup'] } })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="horizontal">Horizontal</option><option value="stacked">Vertical</option><option value="symbol-only">Somente símbolo</option></select></label>
          <label className="block text-[9px] font-mono">REGRAS DE USO<textarea value={draft.logoRules} onChange={(e) => patch({ logoRules: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm" /></label>
        </>}

        {tab === 'system' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><Palette size={15} /> Código visual</b><p className="mt-1 text-[10px] text-neutral-500">A paleta e a tipografia devem funcionar como sistema, não como escolhas isoladas.</p></div>
          {designSystem && <div className="rounded-2xl border-2 border-teal-700 bg-teal-50 p-4"><div className="flex items-start gap-3"><RefreshCw size={17} className="mt-0.5 text-teal-800"/><div className="min-w-0 flex-1"><b className="text-sm">Design System do projeto encontrado</b><p className="mt-1 text-[10px] text-teal-950/70">Paleta e famílias tipográficas podem ser sincronizadas daqui. Em uma identidade nova isso já acontece automaticamente; aqui você pode reaplicar caso o Design System tenha mudado.</p></div></div><button onClick={syncFromDesignSystem} className="mt-3 h-10 w-full rounded-xl bg-teal-800 text-white text-[10px] font-bold">SINCRONIZAR DESIGN SYSTEM → IDENTIDADE</button></div>}
          <div className="space-y-2">{draft.palette.map((color, index) => <div key={color.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 rounded-xl border bg-white p-2"><input type="color" value={color.color} onChange={(e) => patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, color: e.target.value } : c) })} className="h-11 w-11 rounded-lg border p-0.5" /><div className="grid grid-cols-2 gap-1"><input value={color.name} onChange={(e) => patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, name: e.target.value } : c) })} className="h-8 rounded-lg border px-2 text-xs" /><input value={color.color.toUpperCase()} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, color: e.target.value } : c) })} className="h-8 rounded-lg border px-2 text-[10px] font-mono" /><input value={color.role} onChange={(e) => patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, role: e.target.value } : c) })} className="col-span-2 h-8 rounded-lg border px-2 text-xs" /></div></div>)}</div>
          <div className="rounded-2xl border bg-white p-4 space-y-3"><b className="flex items-center gap-2"><Type size={15} /> Tipografia</b>{(['display', 'text', 'accent'] as const).map((key) => <label key={key} className="block text-[9px] font-mono uppercase">{key}<input value={draft.typography[key]} onChange={(e) => patch({ typography: { ...draft.typography, [key]: e.target.value } })} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" /></label>)}</div>
          <label className="block text-[9px] font-mono">LINGUAGEM GRÁFICA<textarea value={draft.graphicLanguage} onChange={(e) => patch({ graphicLanguage: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">PHOTOBRIEF<textarea value={draft.photoBrief} onChange={(e) => patch({ photoBrief: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm" /></label>
        </>}

        {tab === 'applications' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><ImageIcon size={15} /> Mockups e pontos de contato</b><p className="mt-1 text-[10px] text-neutral-500">A mesma marca, paleta e tipografia são aplicadas automaticamente em peças físicas e digitais. Use os mockups para testar escala, contraste e consistência.</p></div>
          <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-3">{draft.applications.map((app) => {
            const updateApplication = (next: Partial<VisualIdentityApplication>) => patch({ applications: draft.applications.map((a) => a.id === app.id ? { ...a, ...next } : a) });
            return <div key={app.id} className="rounded-2xl border bg-white p-2.5 shadow-sm"><ApplicationPreview document={draft} app={app} /><div className="mt-2 grid grid-cols-[1fr_auto] gap-2"><select value={app.type} onChange={(e)=>updateApplication({ type:e.target.value as VisualIdentityApplication['type'], title:APPLICATION_TYPES.find(x=>x.id===e.target.value)?.label||app.title })} className="h-8 min-w-0 rounded-lg border px-2 text-[9px]">{APPLICATION_TYPES.map(type=><option key={type.id} value={type.id}>{type.label}</option>)}</select><button disabled={draft.applications.length<=1} onClick={()=>patch({applications:draft.applications.filter(a=>a.id!==app.id)})} className="h-8 w-8 rounded-lg border text-red-600 disabled:opacity-20"><Trash2 size={13} className="mx-auto"/></button></div><input value={app.title} onChange={(e) => updateApplication({ title:e.target.value })} className="mt-2 h-8 w-full rounded-lg border px-2 text-[10px]" />
            <div className="mt-2 rounded-xl bg-neutral-50 p-2 space-y-2">
              <div className="grid grid-cols-3 gap-1.5"><label className="text-[8px] font-mono text-neutral-500">PRODUTO<input type="color" value={app.productColor || '#F4F2ED'} onChange={(e)=>updateApplication({productColor:e.target.value})} className="mt-1 h-8 w-full rounded-md border bg-white p-1"/></label><label className="text-[8px] font-mono text-neutral-500">CENA<select value={app.scene || 'studio'} onChange={(e)=>updateApplication({scene:e.target.value as VisualIdentityApplication['scene']})} className="mt-1 h-8 w-full rounded-md border bg-white px-1 text-[9px]"><option value="studio">Estúdio</option><option value="warm">Quente</option><option value="dark">Escura</option><option value="paper">Papel</option></select></label><label className="text-[8px] font-mono text-neutral-500">MATERIAL<select value={app.material || 'matte'} onChange={(e)=>updateApplication({material:e.target.value as VisualIdentityApplication['material']})} className="mt-1 h-8 w-full rounded-md border bg-white px-1 text-[9px]"><option value="matte">Fosco</option><option value="glossy">Brilho</option><option value="fabric">Tecido</option><option value="kraft">Kraft</option></select></label></div>
              <label className="block text-[8px] font-mono text-neutral-500">ESCALA DA MARCA <span className="float-right">{Math.round((app.artworkScale ?? 1)*100)}%</span><input type="range" min="0.45" max="1.55" step="0.05" value={app.artworkScale ?? 1} onChange={(e)=>updateApplication({artworkScale:Number(e.target.value)})} className="mt-1 w-full"/></label>
              <div className="grid grid-cols-3 gap-2"><label className="block text-[8px] font-mono text-neutral-500">POSIÇÃO X<input type="range" min="-40" max="40" step="1" value={app.artworkX ?? 0} onChange={(e)=>updateApplication({artworkX:Number(e.target.value)})} className="mt-1 w-full"/></label><label className="block text-[8px] font-mono text-neutral-500">POSIÇÃO Y<input type="range" min="-40" max="40" step="1" value={app.artworkY ?? 0} onChange={(e)=>updateApplication({artworkY:Number(e.target.value)})} className="mt-1 w-full"/></label><label className="block text-[8px] font-mono text-neutral-500">ROTAÇÃO<input type="range" min="-18" max="18" step="1" value={app.angle ?? 0} onChange={(e)=>updateApplication({angle:Number(e.target.value)})} className="mt-1 w-full"/></label></div>
            </div>
          </div>})}</div>
          <button onClick={() => patch({ applications: [...draft.applications, { id: uid('app'), type: 'tshirt', title: 'Nova aplicação', productColor:'#F7F7F4', scene:'studio', material:'fabric', artworkScale:1 }] })} className="h-10 w-full rounded-xl border border-dashed bg-white text-[10px] font-bold flex items-center justify-center gap-2"><Plus size={14} /> NOVA APLICAÇÃO</button>
        </>}

        {tab === 'manual' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><BookOpen size={15} /> Manual vivo</b><p className="mt-1 text-[10px] text-neutral-500">Registre decisões para que a marca continue coerente quando outras pessoas produzirem peças.</p></div>
          <label className="block text-[9px] font-mono">OBSERVAÇÕES DO MANUAL<textarea value={draft.manualNotes} onChange={(e) => patch({ manualNotes: e.target.value })} className="mt-1 min-h-44 w-full rounded-xl border p-3 text-sm" /></label>
          {onAddToNotes && <button onClick={() => { onAddToNotes(`Identidade visual — ${draft.brandName}`, noteSummary); setNoteDone(true); window.setTimeout(() => setNoteDone(false), 1800); }} className="h-11 w-full rounded-xl bg-black text-white text-[10px] font-bold flex items-center justify-center gap-2">{noteDone ? <Check size={15} /> : <FileText size={15} />}{noteDone ? 'ADICIONADO ÀS NOTAS' : 'ADICIONAR RESUMO ÀS NOTAS'}</button>}
        </>}
      </div>
    </div>}>
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <section className="rounded-3xl border bg-white p-5 sm:p-8 min-h-[280px] flex items-center justify-center"><Mark document={draft} /></section>
        <section className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-mono text-neutral-400">PALETA</div><b className="text-sm">Sistema cromático</b></div><div className="flex -space-x-1">{draft.palette.map((c) => <span key={c.id} title={`${c.name} ${c.color}`} className="h-9 w-9 rounded-full border-2 border-white" style={{ background: c.color }} />)}</div></div><div className="mt-4"><div className="text-3xl leading-tight" style={{ fontFamily: draft.typography.display }}>Aa — {draft.brandName}</div><p className="mt-2 text-sm" style={{ fontFamily: draft.typography.text }}>{draft.essence}</p><code className="mt-3 block text-[10px]" style={{ fontFamily: draft.typography.accent }}>{draft.typography.display} · {draft.typography.text} · {draft.typography.accent}</code></div></section>
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">{draft.applications.map((app) => <ApplicationPreview key={app.id} document={draft} app={app} />)}</section>
      </div>
    </StudioWorkspace>

    {guideOpen && <div className="fixed inset-0 z-[180] bg-black/50 p-3 sm:p-8 flex items-end sm:items-center justify-center" onClick={() => setGuideOpen(false)}><div className="w-full max-w-3xl max-h-[88vh] overflow-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-7" onClick={(e) => e.stopPropagation()}><div className="flex items-start gap-3"><div className="flex-1"><div className="text-[9px] font-mono text-neutral-400">DICAS · REFERÊNCIAS</div><b className="text-xl">O que uma identidade visual precisa resolver?</b></div><button onClick={() => setGuideOpen(false)} className="h-10 w-10 rounded-xl border flex items-center justify-center"><X size={16} /></button></div><div className="mt-4 grid sm:grid-cols-2 gap-3"><div className="rounded-2xl bg-[#111] text-white p-4"><b>Pontos essenciais</b><ul className="mt-3 space-y-2 text-xs text-white/75"><li>• Estratégia e posicionamento antes da estética.</li><li>• Logotipo e símbolo reconhecíveis em diferentes escalas.</li><li>• Paleta com função definida, contraste e acessibilidade.</li><li>• Tipografia com papéis claros e hierarquia.</li><li>• Linguagem gráfica: grid, formas, ícones, ilustrações e texturas.</li><li>• Photobrief consistente.</li><li>• Aplicações reais e manual de uso.</li></ul></div><div className="space-y-2">{REFERENCES.map((ref) => <div key={ref.author} className="rounded-xl border p-3"><b className="text-xs">{ref.author}</b><div className="text-[10px] font-mono text-neutral-500">{ref.work}</div><p className="mt-1 text-[10px] text-neutral-600">{ref.note}</p></div>)}</div></div></div></div>}
  </div>;
}
