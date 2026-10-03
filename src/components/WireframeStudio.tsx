import React, { useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy, Frame, ImagePlus,
  LayoutGrid, Loader2, Monitor, Plus, Save, ScanLine, Smartphone, Sparkles, Tablet,
  Trash2, Upload, Watch, X
} from 'lucide-react';
import {
  DesignSystemDocument, DrawingDocument, WireframeAlign, WireframeBlock,
  WireframeBlockType, WireframeDevicePreset, WireframeDocument, WireframeFrame
} from '../types';
import { drawingToSvgString } from './DrawingStudio';
import { ensureTursoSession } from '../lib/turso';

export type WireframeImportSource =
  | { kind: 'drawing'; name: string; drawing: DrawingDocument }
  | { kind: 'image'; name: string; url: string };

interface WireframeStudioProps {
  document: WireframeDocument;
  designSystem?: DesignSystemDocument;
  title?: string;
  canEdit?: boolean;
  availableDrawings?: Array<{ id: string; name: string; drawing: DrawingDocument }>;
  initialSource?: WireframeImportSource | null;
  onSave: (document: WireframeDocument) => void;
  onClose: () => void;
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const DEVICE_PRESETS: Array<{ id: string; preset: WireframeDevicePreset; label: string; width: number; height: number; icon: React.ElementType }> = [
  { id: 'mobile', preset: 'mobile', label: 'Mobile', width: 393, height: 852, icon: Smartphone },
  { id: 'tablet', preset: 'tablet', label: 'Tablet', width: 768, height: 1024, icon: Tablet },
  { id: 'desktop', preset: 'desktop', label: 'Desktop', width: 1440, height: 1024, icon: Monitor },
  { id: 'watch', preset: 'watch', label: 'Watch', width: 205, height: 251, icon: Watch },
  { id: 'instagram-post', preset: 'custom', label: 'Instagram 1:1', width: 1080, height: 1080, icon: Frame },
  { id: 'instagram-feed', preset: 'custom', label: 'Instagram 4:5', width: 1080, height: 1350, icon: Frame },
  { id: 'story', preset: 'custom', label: 'Story / Reel', width: 1080, height: 1920, icon: Frame },
  { id: 'tiktok', preset: 'custom', label: 'TikTok', width: 1080, height: 1920, icon: Frame },
  { id: 'facebook', preset: 'custom', label: 'Facebook', width: 1200, height: 630, icon: Frame },
  { id: 'snapchat', preset: 'custom', label: 'Snapchat', width: 1080, height: 1920, icon: Frame },
  { id: 'youtube', preset: 'custom', label: 'YouTube', width: 1920, height: 1080, icon: Frame },
  { id: 'a4', preset: 'custom', label: 'A4 impressão', width: 2480, height: 3508, icon: Frame },
  { id: 'a3', preset: 'custom', label: 'A3 impressão', width: 3508, height: 4961, icon: Frame },
];

const BLOCKS: Array<{ type: WireframeBlockType; label: string }> = [
  { type: 'text', label: 'Texto' }, { type: 'button', label: 'Botão' }, { type: 'input', label: 'Campo' },
  { type: 'image', label: 'Imagem' }, { type: 'card', label: 'Card' }, { type: 'navbar', label: 'Navbar' },
  { type: 'list-item', label: 'Item de lista' }, { type: 'spacer', label: 'Espaço' },
];

export const blankWireframe = (designSystem?: DesignSystemDocument): WireframeDocument => ({
  activeFrameId: 'frame-1', componentLibrary: [], frames: [{
    id: 'frame-1', name: 'Mobile · Home', preset: 'mobile', width: 393, height: 852,
    direction: 'column', gap: 16, padding: 24, align: 'stretch',
    background: designSystem?.colors.find((item) => item.role === 'surface')?.value || '#FFFFFF',
    blocks: [
      { id: makeId('block'), type: 'navbar', label: 'Logo · Menu', width: 'fill', height: 56 },
      { id: makeId('block'), type: 'text', label: 'Título principal', width: 'fill', height: 'hug' },
      { id: makeId('block'), type: 'text', label: 'Texto de apoio para explicar a proposta.', width: 'fill', height: 'hug' },
      { id: makeId('block'), type: 'button', label: 'Ação principal', width: 'fill', height: 48 },
      { id: makeId('block'), type: 'card', label: 'Conteúdo em destaque', width: 'fill', height: 160 },
    ],
  }],
});

const blockDefaults = (type: WireframeBlockType, designSystem?: DesignSystemDocument): WireframeBlock => ({
  id: makeId('block'), type, label: BLOCKS.find((item) => item.type === type)?.label || 'Elemento', width: 'fill',
  height: type === 'image' || type === 'card' ? 160 : type === 'navbar' ? 56 : type === 'button' || type === 'input' ? 48 : type === 'spacer' ? 32 : 'hug',
  padding: 12, radius: designSystem?.radii?.find((value) => value >= 8 && value < 999) || 12,
  background: type === 'button' ? (designSystem?.colors.find((item) => item.role === 'brand')?.value || '#111111') : '#F4F4F2',
  color: type === 'button' ? '#FFFFFF' : (designSystem?.colors.find((item) => item.role === 'text')?.value || '#111111'),
});

function BlockPreview({ block, fontFamily = 'Inter', compact = false }: { block: WireframeBlock; fontFamily?: string; compact?: boolean }) {
  const common: React.CSSProperties = {
    borderRadius: block.radius ?? 10,
    minHeight: typeof block.height === 'number' ? Math.max(compact ? block.height * .45 : block.height, compact ? 18 : 28) : undefined,
    width: block.width === 'fill' ? '100%' : typeof block.width === 'number' ? block.width : 'auto',
    background: block.type === 'text' || block.type === 'spacer' ? 'transparent' : block.background || '#F4F4F2',
    color: block.color || '#111111', fontFamily,
  };
  if (block.type === 'spacer') return <div style={{ height: compact ? 12 : (typeof block.height === 'number' ? block.height : 24) }} />;
  if (block.type === 'image') return <div style={common} className="border border-dashed border-black/25 flex items-center justify-center text-[9px] font-mono text-neutral-500">IMAGEM</div>;
  if (block.type === 'input') return <div style={common} className="border border-black/15 px-3 flex items-center text-[10px] text-neutral-400">{block.label || 'Campo'}</div>;
  if (block.type === 'navbar') return <div style={common} className="border border-black/10 px-3 flex items-center justify-between text-[9px] font-mono"><strong>LOGO</strong><span>MENU</span></div>;
  if (block.type === 'card') return <div style={common} className="border border-black/10 p-3 flex flex-col justify-end"><div className="h-1/2 rounded-lg bg-black/5 mb-2"/><strong className="text-[10px]">{block.label}</strong></div>;
  if (block.type === 'button') return <div style={common} className="px-3 flex items-center justify-center text-[10px] font-bold">{block.label}</div>;
  if (block.type === 'list-item') return <div style={common} className="border border-black/10 px-3 flex items-center gap-2"><span className="h-7 w-7 rounded-full bg-black/10"/><span className="text-[10px] font-medium">{block.label}</span></div>;
  return <div style={common} className={block.type === 'text' ? 'text-sm font-semibold' : ''}>{block.label}</div>;
}

export function WireframePreview({ document, designSystem, className = '' }: { document: WireframeDocument; designSystem?: DesignSystemDocument; className?: string }) {
  const frame = document.frames.find((item) => item.id === document.activeFrameId) || document.frames[0];
  if (!frame) return <div className={className}/>;
  const scale = Math.min(1, 300 / Math.max(frame.width, 1), 230 / Math.max(frame.height, 1));
  return <div className={`bg-[#ECEBE7] p-3 flex items-center justify-center overflow-hidden ${className}`}>
    <div style={{ width: frame.width * scale, height: frame.height * scale, background: frame.background, padding: frame.padding * scale, gap: Math.max(2, frame.gap * scale), display: 'flex', flexDirection: frame.direction, borderRadius: 10, boxShadow: '0 5px 24px rgba(0,0,0,.10)', overflow: 'hidden' }}>
      {frame.blocks.map((block) => <BlockPreview key={block.id} block={{...block, height: typeof block.height === 'number' ? block.height * scale : block.height }} fontFamily={designSystem?.primaryFont || 'Inter'} compact />)}
    </div>
  </div>;
}

const imageFromDrawing = (drawing: DrawingDocument) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawingToSvgString(drawing))}`;

export default function WireframeStudio({ document, designSystem, title = 'Wireframes', canEdit = true, availableDrawings = [], initialSource = null, onSave, onClose }: WireframeStudioProps) {
  const [draft, setDraft] = useState<WireframeDocument>(() => JSON.parse(JSON.stringify(document)));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [source, setSource] = useState<WireframeImportSource | null>(initialSource);
  const [fidelity, setFidelity] = useState<'structure' | 'balanced' | 'faithful'>('balanced');
  const [targetDevice, setTargetDevice] = useState<'auto' | 'mobile' | 'tablet' | 'desktop'>('auto');
  const [isUploading, setIsUploading] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [interpretationNotes, setInterpretationNotes] = useState<string[]>([]);
  const [uncertainties, setUncertainties] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const frame = useMemo(() => draft.frames.find((item) => item.id === draft.activeFrameId) || draft.frames[0], [draft]);
  const fontFamily = designSystem?.primaryFont || 'Inter';

  const patchFrame = (patch: Partial<WireframeFrame>) => { if (!frame) return; setDraft((current) => ({ ...current, frames: current.frames.map((item) => item.id === frame.id ? { ...item, ...patch } : item) })); };
  const patchBlock = (id: string, patch: Partial<WireframeBlock>) => patchFrame({ blocks: frame.blocks.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const addBlock = (type: WireframeBlockType) => { const block = blockDefaults(type, designSystem); patchFrame({ blocks: [...frame.blocks, block] }); setSelectedBlockId(block.id); };
  const moveBlock = (id: string, direction: -1 | 1) => { const index = frame.blocks.findIndex((item) => item.id === id); const target = index + direction; if (index < 0 || target < 0 || target >= frame.blocks.length) return; const blocks = [...frame.blocks]; [blocks[index], blocks[target]] = [blocks[target], blocks[index]]; patchFrame({ blocks }); };
  const addFrame = (preset = DEVICE_PRESETS[0]) => { const id = makeId('frame'); const next: WireframeFrame = { id, name: `${preset.label} · Nova tela`, preset: preset.preset, width: preset.width, height: preset.height, direction: 'column', gap: 16, padding: 24, align: 'stretch', background: designSystem?.colors.find((item) => item.role === 'surface')?.value || '#FFFFFF', blocks: [] }; setDraft((current) => ({ ...current, frames: [...current.frames, next], activeFrameId: id })); setSelectedBlockId(null); };
  const duplicateFrame = () => { const id = makeId('frame'); const copy: WireframeFrame = { ...JSON.parse(JSON.stringify(frame)), id, name: `${frame.name} · cópia`, blocks: frame.blocks.map((block) => ({ ...block, id: makeId('block') })) }; setDraft((current) => ({ ...current, frames: [...current.frames, copy], activeFrameId: id })); };

  const uploadSourceImage = async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Escolha uma imagem, foto ou screenshot.'); return; }
    if (file.size > 4 * 1024 * 1024) { setError('A imagem precisa ter até 4 MB.'); return; }
    setIsUploading(true); setError('');
    try {
      const session = await ensureTursoSession();
      const response = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: file });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível enviar a imagem.');
      setSource({ kind: 'image', name: file.name, url: data.url });
    } catch (err: any) { setError(err?.message || 'Falha no upload.'); }
    finally { setIsUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const interpretSource = async () => {
    if (!source || !canEdit) return;
    setIsInterpreting(true); setError(''); setInterpretationNotes([]); setUncertainties([]);
    try {
      const session = await ensureTursoSession().catch(() => null);
      const wireframeSource = source.kind === 'drawing'
        ? { kind: 'drawing', name: source.name, svg: drawingToSvgString(source.drawing).slice(0, 70000), width: source.drawing.width, height: source.drawing.height }
        : { kind: 'image', name: source.name, url: source.url };
      const response = await fetch('/api/mediators/think', {
        method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) },
        body: JSON.stringify({ mode: 'wireframe-interpret', wireframeSource, wireframeOptions: { device: targetDevice, fidelity } }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.wireframeInterpretation?.frame) throw new Error(data.error || 'A IA não conseguiu interpretar o esboço.');
      const raw = data.wireframeInterpretation.frame;
      const blocks: WireframeBlock[] = (Array.isArray(raw.blocks) ? raw.blocks : []).map((block: any) => ({
        ...blockDefaults(BLOCKS.some((item) => item.type === block.type) ? block.type : 'card', designSystem),
        ...block,
        id: makeId('block'),
        width: block.width === 'hug' || block.width === 'fill' || typeof block.width === 'number' ? block.width : 'fill',
        height: block.height === 'hug' || typeof block.height === 'number' ? block.height : 'hug',
      }));
      const newFrame: WireframeFrame = {
        id: makeId('frame'), name: String(raw.name || `${source.name} · interpretado`),
        preset: ['mobile', 'tablet', 'desktop', 'watch', 'custom'].includes(raw.preset) ? raw.preset : 'custom',
        width: Math.max(120, Number(raw.width) || 393), height: Math.max(120, Number(raw.height) || 852),
        direction: raw.direction === 'row' ? 'row' : 'column', gap: Math.max(0, Number(raw.gap) || 12),
        padding: Math.max(0, Number(raw.padding) || 20),
        align: ['start', 'center', 'end', 'stretch'].includes(raw.align) ? raw.align : 'stretch',
        background: /^#[0-9a-f]{6}$/i.test(String(raw.background || '')) ? raw.background : '#FFFFFF', blocks,
      };
      setDraft((current) => ({ ...current, frames: [...current.frames, newFrame], activeFrameId: newFrame.id }));
      setSelectedBlockId(null);
      setInterpretationNotes(Array.isArray(data.wireframeInterpretation.notes) ? data.wireframeInterpretation.notes.slice(0, 6) : []);
      setUncertainties(Array.isArray(data.wireframeInterpretation.uncertainties) ? data.wireframeInterpretation.uncertainties.slice(0, 6) : []);
    } catch (err: any) { setError(err?.message || 'Não foi possível transformar o esboço em wireframe.'); }
    finally { setIsInterpreting(false); }
  };

  const selected = frame?.blocks.find((item) => item.id === selectedBlockId) || null;
  const previewScale = frame ? Math.min(1, 720 / frame.width, 690 / frame.height) : 1;
  const sourcePreview = source?.kind === 'drawing' ? imageFromDrawing(source.drawing) : source?.url;

  return <div className="fixed inset-0 z-[125] bg-[#EDECE8] flex flex-col canvas-control" onPointerDown={(event)=>event.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b border-black/10 px-3 sm:px-5 flex items-center gap-3" style={{paddingTop:'max(.35rem, env(safe-area-inset-top))'}}>
      <button type="button" onClick={onClose} className="h-11 w-11 rounded-xl hover:bg-black/5 flex items-center justify-center" aria-label="Fechar Wireframes"><X size={19}/></button>
      <div className="min-w-0 flex-1"><div className="font-bold truncate">{title}</div><div className="text-[10px] font-mono text-neutral-500 uppercase">frames · auto layout · componentes · desenho → interface</div></div>
      <button type="button" disabled={!canEdit} onClick={()=>onSave(draft)} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15}/> SALVAR</button>
    </header>

    <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)_290px]">
      <aside className="min-h-0 overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-black/10 p-3 space-y-4">
        <div className="rounded-2xl border-2 border-black p-3 bg-[#FAFAF8]">
          <div className="flex items-center gap-2"><Sparkles size={16}/><div><div className="text-[11px] font-bold">Transformar desenho em interface</div><div className="text-[9px] text-neutral-500">Foto, screenshot ou desenho do próprio canvas viram blocos editáveis.</div></div></div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e)=>{const file=e.target.files?.[0]; if(file) void uploadSourceImage(file)}}/>
          <button type="button" disabled={isUploading || !canEdit} onClick={()=>fileRef.current?.click()} className="mt-3 h-10 w-full rounded-xl border border-black flex items-center justify-center gap-2 text-[10px] font-mono font-bold disabled:opacity-50">{isUploading?<Loader2 size={14} className="animate-spin"/>:<Upload size={14}/>} ENVIAR IMAGEM</button>
          {!!availableDrawings.length && <div className="mt-3"><div className="text-[9px] font-mono text-neutral-500 mb-1">OU USE UM DESENHO DO CANVAS</div><div className="max-h-32 overflow-auto space-y-1">{availableDrawings.map((item)=><button key={item.id} type="button" onClick={()=>setSource({kind:'drawing',name:item.name,drawing:item.drawing})} className="w-full min-h-9 rounded-lg border border-black/10 px-2 flex items-center gap-2 text-left text-[9px]"><ScanLine size={13}/><span className="truncate">{item.name}</span></button>)}</div></div>}
          {source && <div className="mt-3 rounded-xl overflow-hidden border border-black/10 bg-white"><img src={sourcePreview} alt={`Origem ${source.name}`} className="w-full max-h-40 object-contain bg-white"/><div className="px-2 py-1.5 text-[9px] font-mono truncate">{source.name}</div></div>}
          <div className="mt-3 grid grid-cols-3 gap-1">{(['structure','balanced','faithful'] as const).map((value)=><button key={value} type="button" onClick={()=>setFidelity(value)} className={`h-9 rounded-lg border text-[8px] font-mono ${fidelity===value?'bg-black text-white border-black':'border-black/10'}`}>{value==='structure'?'ESTRUTURA':value==='balanced'?'EQUILIBRADA':'MUITO FIEL'}</button>)}</div>
          <select value={targetDevice} onChange={(e)=>setTargetDevice(e.target.value as any)} className="mt-2 h-10 w-full rounded-xl border border-black/10 px-2 text-[10px] bg-white"><option value="auto">Tela automática</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option></select>
          <button type="button" disabled={!source || isInterpreting || !canEdit} onClick={()=>void interpretSource()} className="mt-2 min-h-11 w-full rounded-xl bg-black text-white flex items-center justify-center gap-2 text-[10px] font-bold disabled:opacity-40">{isInterpreting?<Loader2 size={15} className="animate-spin"/>:<ImagePlus size={15}/>} {isInterpreting?'INTERPRETANDO…':'GERAR WIREFRAME EDITÁVEL'}</button>
          {!!interpretationNotes.length && <div className="mt-2 text-[9px] text-neutral-600 space-y-1">{interpretationNotes.map((note,index)=><div key={index}>✓ {note}</div>)}</div>}
          {!!uncertainties.length && <div className="mt-2 rounded-lg bg-amber-50 border border-amber-200 p-2 text-[9px] text-amber-800">{uncertainties.map((note,index)=><div key={index}>? {note}</div>)}</div>}
          {error && <div className="mt-2 rounded-lg bg-red-50 border border-red-200 p-2 text-[9px] text-red-700">{error}</div>}
        </div>

        <div><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Frames e formatos</div><div className="mt-2 grid grid-cols-2 lg:grid-cols-1 gap-2">{DEVICE_PRESETS.map((preset)=>{const Icon=preset.icon;return <button key={preset.id} type="button" onClick={()=>addFrame(preset)} className="min-h-12 rounded-xl border border-black/10 px-3 flex items-center gap-3 text-left hover:border-black"><Icon size={17}/><span><strong className="block text-[11px]">{preset.label}</strong><span className="text-[9px] font-mono text-neutral-400">{preset.width}×{preset.height}</span></span></button>})}</div></div>
        <div><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Telas do projeto</div><div className="mt-2 space-y-1.5">{draft.frames.map((item)=><button key={item.id} type="button" onClick={()=>{setDraft({...draft,activeFrameId:item.id});setSelectedBlockId(null)}} className={`w-full rounded-xl border px-3 py-2 text-left ${item.id===frame?.id?'bg-black text-white border-black':'border-black/10'}`}><div className="text-[10px] font-bold truncate">{item.name}</div><div className={`text-[9px] font-mono ${item.id===frame?.id?'text-white/60':'text-neutral-400'}`}>{item.width}×{item.height}</div></button>)}</div></div>
        <div><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Componentes</div><div className="mt-2 grid grid-cols-2 gap-1.5">{BLOCKS.map((item)=><button key={item.type} type="button" disabled={!canEdit} onClick={()=>addBlock(item.type)} className="min-h-10 rounded-lg border border-black/10 bg-white hover:border-black text-[9px] font-mono">+ {item.label}</button>)}</div></div>
        {!!draft.componentLibrary?.length && <div><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Biblioteca do projeto</div><div className="mt-2 space-y-1.5">{draft.componentLibrary.map((component)=><button key={component.id} type="button" onClick={()=>{const copy={...component,id:makeId('block'),isComponent:false};patchFrame({blocks:[...frame.blocks,copy]})}} className="w-full min-h-10 rounded-lg border border-black/10 px-2 text-left text-[10px]">{component.componentName || component.label}</button>)}</div></div>}
      </aside>

      <section className="min-h-[50vh] lg:min-h-0 overflow-auto p-4 sm:p-7 flex items-start justify-center">
        {frame && <div className="relative shrink-0" style={{width:frame.width*previewScale,height:frame.height*previewScale}}>
          <div style={{width:frame.width,height:frame.height,transform:`scale(${previewScale})`,transformOrigin:'top left',background:frame.background,padding:frame.padding,gap:frame.gap,display:'flex',flexDirection:frame.direction,alignItems:frame.align==='stretch'?'stretch':frame.align==='start'?'flex-start':frame.align==='end'?'flex-end':'center',boxShadow:'0 12px 50px rgba(0,0,0,.14)',fontFamily,borderRadius:frame.preset==='watch'?42:18,overflow:'hidden'}}>
            {frame.blocks.map((block)=><button key={block.id} type="button" onClick={()=>setSelectedBlockId(block.id)} className={`text-left shrink-0 ${selectedBlockId===block.id?'outline outline-2 outline-blue-500 outline-offset-2':''}`} style={{width:block.width==='fill'?'100%':block.width==='hug'?'auto':block.width}}><BlockPreview block={block} fontFamily={fontFamily}/></button>)}
          </div>
          <div className="absolute -top-6 left-0 text-[9px] font-mono text-neutral-500">{frame.name} · {frame.width}×{frame.height}</div>
        </div>}
      </section>

      <aside className="min-h-0 overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-black/10 p-3 space-y-4">
        {frame && <>
          <div className="flex items-center justify-between"><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Frame</div><button type="button" onClick={duplicateFrame} className="h-9 px-2 rounded-lg border border-black/10 flex items-center gap-1 text-[9px] font-mono"><Copy size={13}/> DUPLICAR</button></div>
          <input value={frame.name} onChange={(e)=>patchFrame({name:e.target.value})} className="h-10 w-full rounded-xl border border-black/10 px-3 text-xs font-bold"/>
          <div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono text-neutral-500">LARGURA<input type="number" value={frame.width} onChange={(e)=>patchFrame({width:Math.max(120,Number(e.target.value))})} className="mt-1 h-10 w-full rounded-lg border border-black/10 px-2 text-black"/></label><label className="text-[9px] font-mono text-neutral-500">ALTURA<input type="number" value={frame.height} onChange={(e)=>patchFrame({height:Math.max(120,Number(e.target.value))})} className="mt-1 h-10 w-full rounded-lg border border-black/10 px-2 text-black"/></label></div>
          <div><div className="text-[9px] font-mono text-neutral-500 mb-1">AUTO LAYOUT</div><div className="grid grid-cols-2 gap-2"><button onClick={()=>patchFrame({direction:'column'})} className={`h-10 rounded-lg border text-[10px] ${frame.direction==='column'?'bg-black text-white border-black':'border-black/10'}`}>VERTICAL</button><button onClick={()=>patchFrame({direction:'row'})} className={`h-10 rounded-lg border text-[10px] ${frame.direction==='row'?'bg-black text-white border-black':'border-black/10'}`}>HORIZONTAL</button></div></div>
          <div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono text-neutral-500">GAP<input type="number" min={0} value={frame.gap} onChange={(e)=>patchFrame({gap:Number(e.target.value)})} className="mt-1 h-10 w-full rounded-lg border border-black/10 px-2 text-black"/></label><label className="text-[9px] font-mono text-neutral-500">PADDING<input type="number" min={0} value={frame.padding} onChange={(e)=>patchFrame({padding:Number(e.target.value)})} className="mt-1 h-10 w-full rounded-lg border border-black/10 px-2 text-black"/></label></div>
          <div><div className="text-[9px] font-mono text-neutral-500 mb-1">ALINHAMENTO</div><div className="grid grid-cols-4 gap-1">{([['start',AlignLeft],['center',AlignCenter],['end',AlignRight],['stretch',LayoutGrid]] as [WireframeAlign,React.ElementType][]).map(([value,Icon])=><button key={value} onClick={()=>patchFrame({align:value})} className={`h-10 rounded-lg border flex items-center justify-center ${frame.align===value?'bg-black text-white border-black':'border-black/10'}`} title={value}><Icon size={15}/></button>)}</div></div>
        </>}

        {selected && <div className="pt-4 border-t border-black/10 space-y-3"><div className="flex items-center justify-between"><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Elemento</div><div className="flex gap-1"><button onClick={()=>moveBlock(selected.id,-1)} className="h-8 w-8 border border-black/10 rounded-lg flex items-center justify-center"><ArrowUp size={13}/></button><button onClick={()=>moveBlock(selected.id,1)} className="h-8 w-8 border border-black/10 rounded-lg flex items-center justify-center"><ArrowDown size={13}/></button><button onClick={()=>{patchFrame({blocks:frame.blocks.filter((item)=>item.id!==selected.id)});setSelectedBlockId(null)}} className="h-8 w-8 border border-red-200 text-red-600 rounded-lg flex items-center justify-center"><Trash2 size={13}/></button></div></div>
          <label className="text-[9px] font-mono text-neutral-500">CONTEÚDO<input value={selected.label} onChange={(e)=>patchBlock(selected.id,{label:e.target.value})} className="mt-1 h-10 w-full rounded-lg border border-black/10 px-2 text-black"/></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono text-neutral-500">ALTURA<input type="number" value={typeof selected.height==='number'?selected.height:44} onChange={(e)=>patchBlock(selected.id,{height:Number(e.target.value)})} className="mt-1 h-10 w-full rounded-lg border border-black/10 px-2 text-black"/></label><label className="text-[9px] font-mono text-neutral-500">RAIO<input type="number" value={selected.radius||0} onChange={(e)=>patchBlock(selected.id,{radius:Number(e.target.value)})} className="mt-1 h-10 w-full rounded-lg border border-black/10 px-2 text-black"/></label></div>
          <button type="button" onClick={()=>setDraft((current)=>({...current,componentLibrary:[...(current.componentLibrary||[]),{...selected,id:makeId('component'),isComponent:true,componentName:selected.componentName||selected.label}]}))} className="w-full h-10 rounded-xl border border-black flex items-center justify-center gap-2 text-[10px] font-mono font-bold"><Frame size={14}/> SALVAR COMO COMPONENTE</button>
        </div>}
      </aside>
    </main>
  </div>;
}
