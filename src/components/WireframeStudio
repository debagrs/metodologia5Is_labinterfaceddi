import React, { useMemo, useState } from 'react';
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy, Frame, LayoutGrid, Plus, Save, Smartphone, Tablet, Monitor, Watch, Trash2, X } from 'lucide-react';
import { DesignSystemDocument, WireframeAlign, WireframeBlock, WireframeBlockType, WireframeDevicePreset, WireframeDocument, WireframeFrame } from '../types';

interface WireframeStudioProps {
  document: WireframeDocument;
  designSystem?: DesignSystemDocument;
  title?: string;
  canEdit?: boolean;
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
  { type: 'text', label: 'Texto' },
  { type: 'button', label: 'Botão' },
  { type: 'input', label: 'Campo' },
  { type: 'image', label: 'Imagem' },
  { type: 'card', label: 'Card' },
  { type: 'navbar', label: 'Navbar' },
  { type: 'list-item', label: 'Item de lista' },
  { type: 'spacer', label: 'Espaço' },
];

export const blankWireframe = (designSystem?: DesignSystemDocument): WireframeDocument => ({
  activeFrameId: 'frame-1',
  componentLibrary: [],
  frames: [{
    id: 'frame-1',
    name: 'Mobile · Home',
    preset: 'mobile',
    width: 393,
    height: 852,
    direction: 'column',
    gap: 16,
    padding: 24,
    align: 'stretch',
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
  id: makeId('block'),
  type,
  label: BLOCKS.find((item) => item.type === type)?.label || 'Elemento',
  width: 'fill',
  height: type === 'image' || type === 'card' ? 160 : type === 'navbar' ? 56 : type === 'button' || type === 'input' ? 48 : type === 'spacer' ? 32 : 'hug',
  padding: 12,
  radius: designSystem?.radii?.find((value) => value >= 8 && value < 999) || 12,
  background: type === 'button' ? (designSystem?.colors.find((item) => item.role === 'brand')?.value || '#111111') : '#F4F4F2',
  color: type === 'button' ? '#FFFFFF' : (designSystem?.colors.find((item) => item.role === 'text')?.value || '#111111'),
});

function BlockPreview({ block, fontFamily = 'Inter', compact = false }: { block: WireframeBlock; fontFamily?: string; compact?: boolean }) {
  const common: React.CSSProperties = {
    borderRadius: block.radius ?? 10,
    minHeight: typeof block.height === 'number' ? Math.max(compact ? block.height * .45 : block.height, compact ? 18 : 28) : undefined,
    width: block.width === 'fill' ? '100%' : typeof block.width === 'number' ? block.width : 'auto',
    background: block.type === 'text' || block.type === 'spacer' ? 'transparent' : block.background || '#F4F4F2',
    color: block.color || '#111111',
    fontFamily,
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
  return (
    <div className={`bg-[#ECEBE7] p-3 flex items-center justify-center overflow-hidden ${className}`}>
      <div style={{ width: frame.width * scale, height: frame.height * scale, background: frame.background, padding: frame.padding * scale, gap: Math.max(2, frame.gap * scale), display: 'flex', flexDirection: frame.direction, borderRadius: 10, boxShadow: '0 5px 24px rgba(0,0,0,.10)', overflow: 'hidden' }}>
        {frame.blocks.map((block) => <BlockPreview key={block.id} block={{...block, height: typeof block.height === 'number' ? block.height * scale : block.height }} fontFamily={designSystem?.primaryFont || 'Inter'} compact />)}
      </div>
    </div>
  );
}

export default function WireframeStudio({ document, designSystem, title = 'Wireframes', canEdit = true, onSave, onClose }: WireframeStudioProps) {
  const [draft, setDraft] = useState<WireframeDocument>(() => JSON.parse(JSON.stringify(document)));
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const frame = useMemo(() => draft.frames.find((item) => item.id === draft.activeFrameId) || draft.frames[0], [draft]);
  const fontFamily = designSystem?.primaryFont || 'Inter';

  const patchFrame = (patch: Partial<WireframeFrame>) => {
    if (!frame) return;
    setDraft((current) => ({ ...current, frames: current.frames.map((item) => item.id === frame.id ? { ...item, ...patch } : item) }));
  };
  const patchBlock = (id: string, patch: Partial<WireframeBlock>) => patchFrame({ blocks: frame.blocks.map((item) => item.id === id ? { ...item, ...patch } : item) });
  const addBlock = (type: WireframeBlockType) => {
    const block = blockDefaults(type, designSystem);
    patchFrame({ blocks: [...frame.blocks, block] });
    setSelectedBlockId(block.id);
  };
  const moveBlock = (id: string, direction: -1 | 1) => {
    const index = frame.blocks.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= frame.blocks.length) return;
    const blocks = [...frame.blocks];
    [blocks[index], blocks[target]] = [blocks[target], blocks[index]];
    patchFrame({ blocks });
  };
  const addFrame = (preset = DEVICE_PRESETS[0]) => {
    const id = makeId('frame');
    const next: WireframeFrame = { id, name: `${preset.label} · Nova tela`, preset: preset.preset, width: preset.width, height: preset.height, direction: 'column', gap: 16, padding: 24, align: 'stretch', background: designSystem?.colors.find((item) => item.role === 'surface')?.value || '#FFFFFF', blocks: [] };
    setDraft((current) => ({ ...current, frames: [...current.frames, next], activeFrameId: id }));
    setSelectedBlockId(null);
  };
  const duplicateFrame = () => {
    const id = makeId('frame');
    const copy: WireframeFrame = { ...JSON.parse(JSON.stringify(frame)), id, name: `${frame.name} · cópia`, blocks: frame.blocks.map((block) => ({ ...block, id: makeId('block') })) };
    setDraft((current) => ({ ...current, frames: [...current.frames, copy], activeFrameId: id }));
  };

  const selected = frame?.blocks.find((item) => item.id === selectedBlockId) || null;
  const previewScale = frame ? Math.min(1, 720 / frame.width, 690 / frame.height) : 1;

  return (
    <div className="fixed inset-0 z-[125] bg-[#EDECE8] flex flex-col canvas-control" onPointerDown={(event)=>event.stopPropagation()}>
      <header className="shrink-0 min-h-16 bg-white border-b border-black/10 px-3 sm:px-5 flex items-center gap-3" style={{paddingTop:'max(.35rem, env(safe-area-inset-top))'}}>
        <button type="button" onClick={onClose} className="h-11 w-11 rounded-xl hover:bg-black/5 flex items-center justify-center" aria-label="Fechar Wireframes"><X size={19}/></button>
        <div className="min-w-0 flex-1"><div className="font-bold truncate">{title}</div><div className="text-[10px] font-mono text-neutral-500 uppercase">frames · auto layout · componentes · responsividade</div></div>
        <button type="button" disabled={!canEdit} onClick={()=>onSave(draft)} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15}/> SALVAR</button>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)_290px]">
        <aside className="min-h-0 overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-black/10 p-3 space-y-4">
          <div><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Frames e formatos</div><div className="mt-1 text-[9px] text-neutral-400">Interfaces, cards sociais e formatos impressos no mesmo espaço.</div><div className="mt-2 grid grid-cols-2 lg:grid-cols-1 gap-2">{DEVICE_PRESETS.map((preset)=>{const Icon=preset.icon;return <button key={preset.id} type="button" onClick={()=>addFrame(preset)} className="min-h-12 rounded-xl border border-black/10 px-3 flex items-center gap-3 text-left hover:border-black"><Icon size={17}/><span><strong className="block text-[11px]">{preset.label}</strong><span className="text-[9px] font-mono text-neutral-400">{preset.width}×{preset.height}</span></span></button>})}</div></div>
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
    </div>
  );
}
