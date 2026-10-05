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
  { id: 'app-tshirt', type: 'tshirt', title: 'Camiseta' },
  { id: 'app-mug', type: 'mug', title: 'Caneca' },
  { id: 'app-pencil', type: 'pencil', title: 'Lápis / material de apoio' },
  { id: 'app-notebook', type: 'notebook', title: 'Caderno' },
  { id: 'app-tote', type: 'tote', title: 'Ecobag' },
  { id: 'app-pack', type: 'packaging', title: 'Embalagem / rótulo' },
  { id: 'app-sign', type: 'signage', title: 'Sinalização' },
  { id: 'app-interface', type: 'interface', title: 'Interface digital' },
];

const dsRole = (ds: DesignSystemDocument | undefined, role: string, fallback: string) => ds?.colors.find((color) => color.role === role)?.value || fallback;

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
  tshirt: 'CAMISETA', mug: 'CANECA', pencil: 'LÁPIS', stationery: 'PAPELARIA', letterhead: 'PAPEL TIMBRADO', notebook: 'CADERNO', tote: 'ECOBAG',
};

const APPLICATION_TYPES: Array<{ id: VisualIdentityApplication['type']; label: string }> = [
  { id:'social', label:'Social' }, { id:'poster', label:'Cartaz' }, { id:'card', label:'Cartão' }, { id:'stationery', label:'Papelaria' },
  { id:'letterhead', label:'Papel timbrado' }, { id:'tshirt', label:'Camiseta' }, { id:'mug', label:'Caneca' }, { id:'pencil', label:'Lápis' },
  { id:'notebook', label:'Caderno' }, { id:'tote', label:'Ecobag' }, { id:'packaging', label:'Embalagem' }, { id:'signage', label:'Sinalização' }, { id:'interface', label:'Interface' },
];

function Mark({ document, compact = false, inverse = false }: { document: VisualIdentityDocument; compact?: boolean; inverse?: boolean }) {
  const primary = document.palette[0]?.color || '#267F77';
  const secondary = document.palette[1]?.color || '#FF4F9A';
  const monogram = (document.logo.monogram || document.brandName.slice(0, 2) || 'ID').slice(0, 3).toUpperCase();
  const shape = document.logo.symbolStyle;
  if (document.logo.assetUrl && document.logo.useUploadedAsset !== false) {
    return <img src={document.logo.assetUrl} alt={document.logo.assetName || `Marca ${document.brandName}`} className={`${compact ? 'max-h-10 max-w-28' : 'max-h-24 max-w-64'} object-contain`} />;
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
  return <div className={`scale-[.72] origin-center ${uploaded && inverse ? 'rounded-lg bg-white/90 p-1.5 shadow-sm' : ''}`}><Mark document={document} compact inverse={inverse && !uploaded} /></div>;
}

function ApplicationPreview({ document, app }: { document: VisualIdentityDocument; app: VisualIdentityApplication }) {
  const p = document.palette;
  const primary = p[0]?.color || '#267F77';
  const support = p[1]?.color || '#FF4F9A';
  const paper = p[2]?.color || '#F4F2ED';
  const ink = p[3]?.color || '#161616';
  const label = <div className="absolute left-3 bottom-3 z-20"><div className="text-[7px] font-mono opacity-45">{applicationLabels[app.type]}</div><b className="block text-[10px] leading-tight" style={{ fontFamily: document.typography.display }}>{app.title}</b></div>;

  if (app.type === 'tshirt') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#E9E7E1] text-[#111]">
    <div className="absolute inset-0 flex items-center justify-center pb-5"><svg viewBox="0 0 220 170" className="w-[76%] h-[76%]"><path d="M72 24 93 13h34l21 11 37 15-19 38-24-10v83H78V67L54 77 35 39Z" fill={paper} stroke={ink} strokeWidth="3"/><path d="M93 13q17 22 34 0" fill="none" stroke={ink} strokeWidth="3"/></svg></div>
    <div className="absolute left-1/2 top-[43%] -translate-x-1/2 -translate-y-1/2"><BrandBadge document={document}/></div>{label}
  </div>;

  if (app.type === 'mug') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#ECE9E3] text-[#111]">
    <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 w-[58%] h-[48%]"><div className="absolute inset-y-0 left-0 right-[18%] rounded-b-[28px] rounded-t-md border-2 shadow-sm" style={{background:paper,borderColor:ink}}/><div className="absolute right-0 top-[18%] h-[56%] w-[31%] rounded-r-full border-[10px] bg-transparent" style={{borderColor:paper, outline:`2px solid ${ink}`}}/><div className="absolute left-[15%] top-[28%]"><BrandBadge document={document}/></div></div>{label}
  </div>;

  if (app.type === 'pencil') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#EFEDE8] text-[#111]">
    <div className="absolute left-[13%] right-[8%] top-[40%] rotate-[-8deg] h-8 rounded-sm shadow-sm flex items-center" style={{background:primary}}><div className="h-full w-8 bg-[#E7C49B]" style={{clipPath:'polygon(0 50%,100% 0,100% 100%)'}}/><div className="ml-3 text-[8px] font-bold text-white truncate" style={{fontFamily:document.typography.display}}>{document.brandName}</div><div className="ml-auto h-full w-8 bg-[#D9B7B7] border-l border-black/20"/></div>{label}
  </div>;

  if (app.type === 'stationery') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#DAD8D1] text-[#111]">
    <div className="absolute left-[9%] top-[10%] h-[72%] w-[52%] rotate-[-3deg] bg-white shadow-md border p-3"><div className="scale-[.58] origin-top-left"><Mark document={document} compact/></div><div className="mt-2 h-1 w-3/4" style={{background:primary}}/><div className="mt-2 space-y-1">{[1,2,3,4].map(i=><div key={i} className="h-1 bg-black/10" style={{width:`${82-i*7}%`}}/>)}</div></div>
    <div className="absolute right-[7%] bottom-[14%] h-[38%] w-[46%] rotate-[5deg] shadow-md border p-2" style={{background:paper}}><div className="scale-[.62] origin-top-left"><Mark document={document} compact/></div><div className="absolute inset-x-0 bottom-0 h-2" style={{background:support}}/></div>{label}
  </div>;

  if (app.type === 'letterhead') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#DDDAD3] text-[#111]">
    <div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2 h-[78%] w-[55%] bg-white shadow-md p-3"><div className="scale-[.58] origin-top-left"><Mark document={document} compact/></div><div className="mt-2 border-t" style={{borderColor:primary}}/><div className="mt-4 space-y-1.5">{[90,76,84,65,72].map((w,i)=><div key={i} className="h-1 bg-black/10" style={{width:`${w}%`}}/>)}</div><div className="absolute inset-x-3 bottom-3 h-1" style={{background:primary}}/></div>{label}
  </div>;

  if (app.type === 'notebook') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#E6E3DC] text-[#111]">
    <div className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 h-[67%] w-[48%] rounded-r-lg border shadow-md" style={{background:primary,borderColor:ink}}><div className="absolute -left-1 top-2 bottom-2 w-2 flex flex-col justify-around">{Array.from({length:7},(_,i)=><span key={i} className="h-1.5 w-3 rounded-full bg-black/40"/>)}</div><div className="absolute inset-0 flex items-center justify-center"><BrandBadge document={document} inverse/></div></div>{label}
  </div>;

  if (app.type === 'tote') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#E4E1DA] text-[#111]">
    <div className="absolute left-1/2 top-[48%] -translate-x-1/2 -translate-y-1/2 h-[58%] w-[52%] border-2 shadow-sm" style={{background:paper,borderColor:ink}}><div className="absolute left-[22%] right-[22%] -top-[26%] h-[34%] rounded-t-full border-[7px] border-b-0" style={{borderColor:ink}}/><div className="absolute inset-0 flex items-center justify-center"><BrandBadge document={document}/></div></div>{label}
  </div>;

  if (app.type === 'packaging') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#E8E5DE] text-[#111]">
    <div className="absolute left-[23%] top-[17%] h-[62%] w-[53%] rotate-[-2deg] shadow-md border rounded-sm" style={{background:paper,borderColor:ink}}><div className="absolute inset-x-0 top-0 h-[17%]" style={{background:primary}}/><div className="absolute left-1/2 top-[45%] -translate-x-1/2 -translate-y-1/2"><BrandBadge document={document}/></div><div className="absolute inset-x-3 bottom-4 h-7 rounded-full" style={{background:support}}/></div>{label}
  </div>;

  if (app.type === 'signage') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#D7D6D0] text-[#111]">
    <div className="absolute left-[12%] right-[12%] top-[18%] h-[48%] rounded-md shadow-lg flex items-center px-4" style={{background:primary}}><Mark document={document} compact inverse/><div className="ml-auto text-white text-lg">→</div></div><div className="absolute left-[22%] top-[66%] h-[22%] w-2 bg-neutral-700"/>{label}
  </div>;

  if (app.type === 'interface') return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative bg-[#DFDDD7] text-[#111]">
    <div className="absolute left-[9%] right-[9%] top-[12%] bottom-[18%] rounded-lg bg-white border shadow-md overflow-hidden"><div className="h-[18%] flex items-center px-2 border-b"><Mark document={document} compact/><div className="ml-auto flex gap-1"><span className="h-2 w-7 rounded-full bg-black/10"/><span className="h-2 w-5 rounded-full bg-black/10"/></div></div><div className="p-3"><div className="h-5 w-2/3 rounded" style={{background:primary}}/><div className="mt-2 h-2 w-5/6 bg-black/10"/><div className="mt-1 h-2 w-3/5 bg-black/10"/><div className="mt-3 h-7 w-20 rounded" style={{background:support}}/></div></div>{label}
  </div>;

  return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative" style={{ background: paper, color: ink }}>
    <div className="absolute inset-x-0 top-0 h-2" style={{ background: primary }} />
    <div className="absolute right-3 top-4 h-12 w-12 rounded-full opacity-90" style={{ background: support }} />
    <div className="absolute left-3 top-5 scale-[.72] origin-top-left"><Mark document={document} compact /></div>
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
      const session = await ensureTursoSession();
      const response = await fetch('/api/upload', { method:'POST', headers:{ 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), ...(session?.token ? { Authorization:`Bearer ${session.token}` } : {}) }, body:file });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Falha no upload da marca.');
      setDraft((current) => ({ ...current, logo:{ ...current.logo, assetUrl:data.url, assetName:file.name, useUploadedAsset:true }, updatedAt:new Date().toISOString() }));
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
          <div className="grid grid-cols-1 min-[430px]:grid-cols-2 gap-2">{draft.applications.map((app) => <div key={app.id} className="rounded-xl border bg-white p-2"><ApplicationPreview document={draft} app={app} /><div className="mt-2 grid grid-cols-[1fr_auto] gap-2"><select value={app.type} onChange={(e)=>patch({applications:draft.applications.map((a)=>a.id===app.id?{...a,type:e.target.value as VisualIdentityApplication['type'],title:APPLICATION_TYPES.find(x=>x.id===e.target.value)?.label||a.title}:a)})} className="h-8 min-w-0 rounded-lg border px-2 text-[9px]">{APPLICATION_TYPES.map(type=><option key={type.id} value={type.id}>{type.label}</option>)}</select><button disabled={draft.applications.length<=1} onClick={()=>patch({applications:draft.applications.filter(a=>a.id!==app.id)})} className="h-8 w-8 rounded-lg border text-red-600 disabled:opacity-20"><Trash2 size={13} className="mx-auto"/></button></div><input value={app.title} onChange={(e) => patch({ applications: draft.applications.map((a) => a.id === app.id ? { ...a, title: e.target.value } : a) })} className="mt-2 h-8 w-full rounded-lg border px-2 text-[10px]" /></div>)}</div>
          <button onClick={() => patch({ applications: [...draft.applications, { id: uid('app'), type: 'tshirt', title: 'Nova aplicação' }] })} className="h-10 w-full rounded-xl border border-dashed bg-white text-[10px] font-bold flex items-center justify-center gap-2"><Plus size={14} /> NOVA APLICAÇÃO</button>
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
