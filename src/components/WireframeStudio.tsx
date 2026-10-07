import ResizableStudioGrid from './ResizableStudioGrid';
import { FontPicker, useGraphicFonts } from '../lib/graphicFonts';
import StudioAreaGuide from './StudioAreaGuide';
import React, { useMemo, useRef, useState } from 'react';
import {
  AlignCenter, AlignLeft, AlignRight, AppWindow, ArrowLeft, CheckSquare, ChevronLeft, ChevronRight,
  CircleUserRound, Columns3, Copy, Frame, GripVertical, Image as ImageIcon, ImagePlus, LayoutGrid,
  Link2, List, Loader2, Menu, Monitor, MousePointerClick, PanelLeft, PanelRight, Play, Plus, Radio,
  Rows3, Save, Search, SlidersHorizontal, Smartphone, Square, Table2, Tablet, ToggleLeft, Trash2,
  Type, Upload, Watch, X
} from 'lucide-react';
import {
  DesignSystemDocument, DrawingDocument, WireframeAlign, WireframeBlock, WireframeBlockType,
  WireframeDevicePreset, WireframeDocument, WireframeFrame
} from '../types';
import { drawingToSvgString } from './DrawingStudio';
import { ensureTursoSession } from '../lib/turso';

export type WireframeImportSource =
  | { kind: 'drawing'; name: string; drawing: DrawingDocument }
  | { kind: 'image'; name: string; url: string };

interface Props {
  document: WireframeDocument;
  designSystem?: DesignSystemDocument;
  title?: string;
  canEdit?: boolean;
  availableDrawings?: Array<{ id: string; name: string; drawing: DrawingDocument }>;
  initialSource?: WireframeImportSource | null;
  onSave: (document: WireframeDocument) => void;
  onClose: () => void;
}

type PaletteItem = { type: WireframeBlockType; label: string; icon: React.ElementType; group: 'layout' | 'basic' | 'input' | 'navigation' | 'data' };
type DragPayload = { kind: 'palette'; type: WireframeBlockType } | { kind: 'block'; id: string } | { kind: 'component'; id: string };
type MobilePane = 'library' | 'canvas' | 'inspector';

const uid = (p: string) => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const isContainer = (b: WireframeBlock) => ['container', 'row', 'column', 'stack', 'section', 'wrap', 'form', 'list-view', 'grid-view', 'drawer', 'page-view'].includes(b.type);
const blockChildren = (b: WireframeBlock) => b.children || [];

const PRESETS: Array<{ id: string; preset: WireframeDevicePreset; label: string; width: number; height: number; icon: React.ElementType }> = [
  { id: 'mobile', preset: 'mobile', label: 'Mobile', width: 393, height: 852, icon: Smartphone },
  { id: 'tablet', preset: 'tablet', label: 'Tablet', width: 768, height: 1024, icon: Tablet },
  { id: 'desktop', preset: 'desktop', label: 'Desktop', width: 1440, height: 1024, icon: Monitor },
  { id: 'watch', preset: 'watch', label: 'Watch', width: 205, height: 251, icon: Watch },
  { id: 'instagram', preset: 'custom', label: 'Instagram 1:1', width: 1080, height: 1080, icon: Frame },
  { id: 'story', preset: 'custom', label: 'Story / Reel', width: 1080, height: 1920, icon: Frame },
  { id: 'a4', preset: 'custom', label: 'A4', width: 2480, height: 3508, icon: Frame },
];

const BLOCKS: PaletteItem[] = [
  { type: 'column', label: 'Column', icon: Rows3, group: 'layout' },
  { type: 'row', label: 'Row', icon: Columns3, group: 'layout' },
  { type: 'container', label: 'Container', icon: Square, group: 'layout' },
  { type: 'stack', label: 'Stack', icon: LayoutGrid, group: 'layout' },
  { type: 'wrap', label: 'Wrap', icon: LayoutGrid, group: 'layout' },
  { type: 'section', label: 'Seção', icon: Frame, group: 'layout' },
  { type: 'form', label: 'Form', icon: Rows3, group: 'layout' },
  { type: 'list-view', label: 'ListView', icon: List, group: 'layout' },
  { type: 'grid-view', label: 'GridView', icon: LayoutGrid, group: 'layout' },
  { type: 'page-view', label: 'PageView', icon: Columns3, group: 'layout' },
  { type: 'text', label: 'Texto', icon: Type, group: 'basic' },
  { type: 'heading', label: 'Título', icon: Type, group: 'basic' },
  { type: 'button', label: 'Botão', icon: MousePointerClick, group: 'basic' },
  { type: 'icon-button', label: 'Icon button', icon: MousePointerClick, group: 'basic' },
  { type: 'fab', label: 'Floating action', icon: Plus, group: 'basic' },
  { type: 'image', label: 'Imagem', icon: ImageIcon, group: 'basic' },
  { type: 'video', label: 'Vídeo', icon: ImageIcon, group: 'basic' },
  { type: 'map', label: 'Mapa', icon: LayoutGrid, group: 'basic' },
  { type: 'webview', label: 'WebView', icon: AppWindow, group: 'basic' },
  { type: 'icon', label: 'Ícone', icon: Square, group: 'basic' },
  { type: 'avatar', label: 'Avatar', icon: CircleUserRound, group: 'basic' },
  { type: 'badge', label: 'Badge', icon: Square, group: 'basic' },
  { type: 'divider', label: 'Divisor', icon: Square, group: 'basic' },
  { type: 'spacer', label: 'Espaço', icon: Rows3, group: 'basic' },
  { type: 'input', label: 'Campo', icon: Square, group: 'input' },
  { type: 'search', label: 'Busca', icon: Search, group: 'input' },
  { type: 'textarea', label: 'Texto longo', icon: Type, group: 'input' },
  { type: 'select', label: 'Select', icon: List, group: 'input' },
  { type: 'date-picker', label: 'Data', icon: Square, group: 'input' },
  { type: 'time-picker', label: 'Hora', icon: Square, group: 'input' },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, group: 'input' },
  { type: 'radio', label: 'Radio', icon: Radio, group: 'input' },
  { type: 'toggle', label: 'Toggle', icon: ToggleLeft, group: 'input' },
  { type: 'slider', label: 'Slider', icon: SlidersHorizontal, group: 'input' },
  { type: 'navbar', label: 'Navbar', icon: Menu, group: 'navigation' },
  { type: 'side-nav', label: 'Side nav', icon: PanelLeft, group: 'navigation' },
  { type: 'drawer', label: 'Drawer', icon: PanelLeft, group: 'navigation' },
  { type: 'appbar', label: 'App bar', icon: AppWindow, group: 'navigation' },
  { type: 'bottom-nav', label: 'Bottom nav', icon: Menu, group: 'navigation' },
  { type: 'tabs', label: 'Tabs', icon: Columns3, group: 'navigation' },
  { type: 'breadcrumb', label: 'Breadcrumb', icon: Link2, group: 'navigation' },
  { type: 'pagination', label: 'Paginação', icon: Columns3, group: 'navigation' },
  { type: 'nav-item', label: 'Item navegação', icon: Link2, group: 'navigation' },
  { type: 'list-item', label: 'Item de lista', icon: List, group: 'data' },
  { type: 'card', label: 'Card', icon: Frame, group: 'data' },
  { type: 'accordion', label: 'Accordion', icon: Rows3, group: 'data' },
  { type: 'carousel', label: 'Carousel', icon: Columns3, group: 'data' },
  { type: 'chip', label: 'Chip', icon: Square, group: 'data' },
  { type: 'progress', label: 'Progresso', icon: SlidersHorizontal, group: 'data' },
  { type: 'table', label: 'Tabela', icon: Table2, group: 'data' },
];

const surface = (ds?: DesignSystemDocument) => ds?.colors.find(c => c.role === 'surface')?.value || '#FFFFFF';
const textColor = (ds?: DesignSystemDocument) => ds?.colors.find(c => c.role === 'text')?.value || '#111111';
const brand = (ds?: DesignSystemDocument) => ds?.colors.find(c => c.role === 'brand')?.value || '#111111';
const font = (ds?: DesignSystemDocument, role: 'display' | 'text' | 'notes' = 'text') => ds?.fontFamilies?.[role] || ds?.primaryFont || 'Inter';

const blockDefault = (type: WireframeBlockType, ds?: DesignSystemDocument): WireframeBlock => {
  const label = BLOCKS.find(x => x.type === type)?.label || 'Elemento';
  const container = ['container', 'row', 'column', 'stack', 'section', 'wrap', 'form', 'list-view', 'grid-view', 'drawer', 'page-view'].includes(type);
  return {
    id: uid('block'),
    type,
    label,
    width: type === 'chip' || type === 'avatar' || type === 'icon' ? 'hug' : 'fill',
    height: ['image','video','map','webview','card','section','carousel','page-view'].includes(type) ? 160 : ['navbar','appbar','bottom-nav','side-nav'].includes(type) ? 64 : type === 'spacer' ? 32 : type === 'divider' ? 1 : type === 'textarea' ? 92 : type === 'table' ? 180 : container ? 'hug' : 48,
    padding: type === 'divider' || type === 'spacer' ? 0 : container ? 12 : 12,
    margin: 0,
    gap: 10,
    radius: type === 'button' || type === 'input' || type === 'card' || type === 'chip' || container ? 12 : 0,
    background: ['button','fab'].includes(type) ? brand(ds) : ['text', 'heading', 'spacer', 'divider', 'nav-item','breadcrumb'].includes(type) ? 'transparent' : '#F4F4F2',
    color: ['button','fab'].includes(type) ? '#FFFFFF' : textColor(ds),
    items: type === 'navbar' || type === 'side-nav' || type === 'drawer' ? ['Início', 'Projeto', 'Sobre'] : type === 'tabs' ? ['Resumo', 'Detalhes', 'Dados'] : type === 'bottom-nav' ? ['Home', 'Buscar', 'Perfil'] : type === 'breadcrumb' ? ['Home','Página','Atual'] : type === 'pagination' ? ['1','2','3'] : undefined,
    interaction: 'none',
    gridColumnSpan: 1,
    alignSelf: 'stretch',
    children: container ? [] : undefined,
    direction: ['row','wrap'].includes(type) ? 'row' : 'column',
    align: 'stretch',
    justify: 'start',
    layoutMode: type === 'stack' ? 'stack' : type === 'grid-view' ? 'grid' : 'flex',
    wrap: type === 'row' || type === 'wrap',
  };
};

export const blankWireframe = (ds?: DesignSystemDocument): WireframeDocument => ({
  activeFrameId: 'frame-1',
  componentLibrary: [],
  frames: [{
    id: 'frame-1', name: 'Wireframe 1', preset: 'mobile', width: 393, height: 852,
    direction: 'column', gap: 16, padding: 24, margin: 0, align: 'stretch', justify: 'start',
    layoutMode: 'flex', gridColumns: 4, columnGap: 16, rowGap: 16, background: surface(ds), wrap: false,
    blocks: [
      { ...blockDefault('navbar', ds), label: 'Logo · Menu' },
      { ...blockDefault('heading', ds), label: 'Título principal', height: 'hug' },
      { ...blockDefault('text', ds), label: 'Texto de apoio da interface', height: 'hug' },
      { ...blockDefault('button', ds), label: 'Ação principal' },
      { ...blockDefault('card', ds), label: 'Conteúdo em destaque' },
    ]
  }]
});

const flattenBlocks = (blocks: WireframeBlock[]): WireframeBlock[] => blocks.flatMap(b => [b, ...flattenBlocks(blockChildren(b))]);
const findBlock = (blocks: WireframeBlock[], blockId: string): WireframeBlock | null => {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    const child = findBlock(blockChildren(block), blockId);
    if (child) return child;
  }
  return null;
};
const updateBlockDeep = (blocks: WireframeBlock[], blockId: string, patch: Partial<WireframeBlock>): WireframeBlock[] => blocks.map(block => block.id === blockId ? { ...block, ...patch } : { ...block, children: block.children ? updateBlockDeep(block.children, blockId, patch) : block.children });
const removeBlockDeep = (blocks: WireframeBlock[], blockId: string): { blocks: WireframeBlock[]; removed: WireframeBlock | null } => {
  let removed: WireframeBlock | null = null;
  const next: WireframeBlock[] = [];
  for (const block of blocks) {
    if (block.id === blockId) { removed = block; continue; }
    if (block.children?.length) {
      const childResult = removeBlockDeep(block.children, blockId);
      if (childResult.removed) removed = childResult.removed;
      next.push({ ...block, children: childResult.blocks });
    } else next.push(block);
  }
  return { blocks: next, removed };
};
const findBlockLocation = (blocks: WireframeBlock[], blockId: string, parentId: string | null = null): { parentId: string | null; index: number } | null => {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.id === blockId) return { parentId, index };
    const child = findBlockLocation(blockChildren(block), blockId, block.id);
    if (child) return child;
  }
  return null;
};
const reorderAtLocation = (blocks: WireframeBlock[], parentId: string | null, from: number, to: number): WireframeBlock[] => {
  if (!parentId) {
    const next = [...blocks];
    const [item] = next.splice(from, 1);
    if (!item) return blocks;
    next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
    return next;
  }
  return blocks.map(block => block.id === parentId
    ? { ...block, children: reorderAtLocation(blockChildren(block), null, from, to) }
    : { ...block, children: block.children ? reorderAtLocation(block.children, parentId, from, to) : block.children });
};
const insertBlockDeep = (blocks: WireframeBlock[], parentId: string | null, index: number, item: WireframeBlock): WireframeBlock[] => {
  if (!parentId) {
    const next = [...blocks];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, item);
    return next;
  }
  return blocks.map(block => block.id === parentId
    ? { ...block, children: insertBlockDeep(blockChildren(block), null, index, item) }
    : { ...block, children: block.children ? insertBlockDeep(block.children, parentId, index, item) : block.children });
};
const cloneBlock = (block: WireframeBlock): WireframeBlock => ({ ...block, id: uid('block'), children: block.children?.map(cloneBlock) });

function LeafPreview({ b, ds }: { b: WireframeBlock; ds?: DesignSystemDocument }) {
  const style: React.CSSProperties = {
    width: b.width === 'fill' ? '100%' : b.width === 'hug' ? 'auto' : b.width,
    minHeight: typeof b.height === 'number' ? b.height : undefined,
    padding: b.padding,
    margin: b.margin,
    borderRadius: b.radius,
    background: b.background === 'transparent' ? 'transparent' : b.background,
    color: b.color,
    fontFamily: b.fontFamily || font(ds, 'text'),
    fontSize: b.fontSize,
    fontWeight: b.fontWeight,
    opacity: b.opacity ?? 1,
  };
  if (b.type === 'spacer') return <div style={{ height: typeof b.height === 'number' ? b.height : 24 }} />;
  if (b.type === 'divider') return <div style={{ height: 1, background: b.color || '#CCC', width: '100%', margin: b.margin }} />;
  if (b.type === 'image') return <div style={style} className="border border-dashed border-black/20 flex items-center justify-center text-[10px] text-neutral-400"><ImageIcon size={18} /></div>;
  if (b.type === 'video') return <div style={style} className="border border-dashed border-black/20 flex items-center justify-center gap-2 text-[10px] text-neutral-400"><Play size={18} /> vídeo</div>;
  if (b.type === 'map') return <div style={style} className="border border-black/10 relative overflow-hidden text-[10px] text-neutral-400 flex items-center justify-center"><div className="absolute inset-0 opacity-40" style={{backgroundImage:'linear-gradient(#bbb 1px,transparent 1px),linear-gradient(90deg,#bbb 1px,transparent 1px)',backgroundSize:'18px 18px'}}/><span className="relative rounded-full bg-white px-2 py-1 border">Mapa / localização</span></div>;
  if (b.type === 'webview') return <div style={style} className="border border-black/10 overflow-hidden"><div className="h-7 border-b bg-white flex items-center px-2 text-[9px] text-neutral-400">https://…</div><div className="h-24 flex items-center justify-center text-[10px] text-neutral-400">WebView</div></div>;
  if (b.type === 'navbar' || b.type === 'appbar' || b.type === 'bottom-nav') return <div style={style} className="border border-black/10 flex items-center justify-between gap-3 text-[10px]"><strong>{b.type === 'bottom-nav' ? '' : 'LOGO'}</strong><div className="flex flex-1 justify-around gap-3">{(b.items || ['Menu']).map(x => <span key={x}>{x}</span>)}</div></div>;
  if (b.type === 'side-nav' || b.type === 'drawer') return <div style={{...style,minHeight:180}} className="border border-black/10 flex flex-col gap-2 text-[10px]"><strong className="mb-2">MENU</strong>{(b.items || ['Início','Projeto','Sobre']).map(x => <span key={x} className="rounded-md bg-white/60 px-2 py-2">{x}</span>)}</div>;
  if (b.type === 'tabs') return <div style={style} className="flex gap-1 border-b border-black/10">{(b.items || []).map((x, i) => <span key={x} className={`px-3 py-2 ${i === 0 ? 'border-b-2 border-black font-bold' : ''}`}>{x}</span>)}</div>;
  if (b.type === 'nav-item') return <div style={style} className="text-[11px] font-semibold">{b.label}</div>;
  if (b.type === 'input' || b.type === 'select' || b.type === 'textarea') return <div style={style} className="border border-black/15 text-[11px] text-neutral-400 flex items-center">{b.label}{b.type === 'select' ? <span className="ml-auto">⌄</span> : null}</div>;
  if (b.type === 'button') return <div style={style} className="flex items-center justify-center text-[11px] font-bold">{b.label}</div>;
  if (b.type === 'icon-button') return <div style={{...style,width:48,height:48,borderRadius:12}} className="flex items-center justify-center border border-black/10"><MousePointerClick size={18}/></div>;
  if (b.type === 'fab') return <div style={{...style,width:56,height:56,borderRadius:999}} className="flex items-center justify-center shadow-sm"><Plus size={20}/></div>;
  if (b.type === 'search') return <div style={style} className="border border-black/15 text-[11px] text-neutral-400 flex items-center gap-2"><Search size={14}/> Buscar…</div>;
  if (b.type === 'date-picker' || b.type === 'time-picker') return <div style={style} className="border border-black/15 text-[11px] text-neutral-500 flex items-center justify-between"><span>{b.type === 'date-picker' ? 'dd/mm/aaaa' : '00:00'}</span><Square size={13}/></div>;
  if (b.type === 'card') return <div style={style} className="border border-black/10"><div className="h-12 rounded-lg bg-black/5 mb-2" /><strong className="text-[11px]">{b.label}</strong></div>;
  if (b.type === 'list-item') return <div style={style} className="border border-black/10 flex items-center gap-2"><span className="h-7 w-7 rounded-full bg-black/10" /><span className="text-[11px]">{b.label}</span></div>;
  if (b.type === 'avatar') return <div style={{ ...style, width: 48, height: 48, borderRadius: 999 }} className="border border-black/10 flex items-center justify-center"><CircleUserRound size={24} /></div>;
  if (b.type === 'checkbox' || b.type === 'radio') return <div style={style} className="flex items-center gap-2"><span className={`h-5 w-5 border border-black ${b.type === 'radio' ? 'rounded-full' : 'rounded'}`} />{b.label}</div>;
  if (b.type === 'toggle') return <div style={style} className="flex items-center gap-2"><span className="h-5 w-9 rounded-full bg-black/20 p-0.5"><span className="block h-4 w-4 rounded-full bg-white" /></span>{b.label}</div>;
  if (b.type === 'slider') return <div style={style} className="flex items-center gap-2"><div className="h-1.5 flex-1 bg-black/15 rounded-full"><div className="w-2/5 h-full bg-black rounded-full" /></div></div>;
  if (b.type === 'progress') return <div style={style}><div className="h-2 bg-black/10 rounded-full"><div className="w-2/3 h-full bg-black rounded-full" /></div></div>;
  if (b.type === 'chip') return <div style={style} className="border border-black/15 text-[10px] font-semibold inline-flex items-center">{b.label}</div>;
  if (b.type === 'badge') return <div style={{...style,width:'auto',minHeight:24,padding:'4px 8px'}} className="border border-black/15 rounded-full text-[9px] font-bold inline-flex items-center">{b.label}</div>;
  if (b.type === 'breadcrumb') return <div style={style} className="flex items-center gap-1 text-[10px]">{(b.items || []).map((x,i)=><React.Fragment key={x}><span>{x}</span>{i < (b.items || []).length-1 ? <span className="opacity-40">/</span> : null}</React.Fragment>)}</div>;
  if (b.type === 'pagination') return <div style={style} className="flex items-center gap-1 text-[10px]">{(b.items || ['1','2','3']).map((x,i)=><span key={x} className={`h-7 min-w-7 rounded border flex items-center justify-center ${i===0?'bg-black text-white':''}`}>{x}</span>)}</div>;
  if (b.type === 'accordion') return <div style={style} className="border border-black/10"><div className="flex justify-between items-center font-bold text-[10px]"><span>{b.label}</span><span>⌄</span></div><div className="mt-2 text-[9px] text-neutral-400">Conteúdo expansível</div></div>;
  if (b.type === 'carousel') return <div style={style} className="border border-black/10 flex gap-2 overflow-hidden">{[1,2,3].map(x=><div key={x} className="min-w-[72%] rounded-lg bg-black/5 flex items-center justify-center text-[9px]">slide {x}</div>)}</div>;
  if (b.type === 'table') return <div style={style} className="border border-black/15 grid grid-cols-3 text-[9px]">{Array.from({ length: 9 }).map((_, i) => <span key={i} className="border-r border-b border-black/10 p-2">{i < 3 ? `Coluna ${i + 1}` : 'Dado'}</span>)}</div>;
  if (b.type === 'icon') return <div style={style} className="flex items-center justify-center"><Square size={20} /></div>;
  return <div style={{ ...style, fontFamily: b.fontFamily || font(ds, b.type === 'heading' ? 'display' : 'text') }} className={b.type === 'heading' ? 'text-xl font-bold' : 'text-sm font-semibold'}>{b.label}</div>;
}

function DropZone({ onDrop }: { onDrop: (payload: DragPayload) => void }) {
  const [active, setActive] = useState(false);
  return <div
    className={`wireframe-drop-slot ${active ? 'is-over' : ''}`}
    onDragEnter={e => { e.preventDefault(); setActive(true); }}
    onDragOver={e => { e.preventDefault(); setActive(true); }}
    onDragLeave={() => setActive(false)}
    onDrop={e => { e.preventDefault(); e.stopPropagation(); setActive(false); try { onDrop(JSON.parse(e.dataTransfer.getData('text/plain'))); } catch { /* noop */ } }}
  />;
}

function MiniFrame({ frame, ds }: { frame: WireframeFrame; ds?: DesignSystemDocument }) {
  const scale = Math.min(0.22, 86 / frame.width, 110 / frame.height);
  return <div className="w-[92px] h-[116px] bg-[#E9E8E3] rounded-lg flex items-center justify-center overflow-hidden border border-black/10">
    <div style={{ width: frame.width * scale, height: frame.height * scale, background: frame.background, padding: frame.padding * scale, gap: Math.max(2, frame.gap * scale), display: frame.layoutMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: frame.layoutMode === 'grid' ? `repeat(${frame.gridColumns || 4},1fr)` : undefined, flexDirection: frame.direction, overflow: 'hidden' }}>
      {frame.blocks.slice(0, 8).map(b => <div key={b.id} style={{ minHeight: 3, background: b.background === 'transparent' ? '#D7D7D2' : b.background, borderRadius: 2, opacity: .82 }} />)}
    </div>
  </div>;
}

function CanvasBlock({
  block, ds, selectedId, prototype, onSelect, onDrop, onRun, parentId = null, index = 0, direction = 'column',
}: {
  parentId?: string | null; index?: number; direction?: string;
  block: WireframeBlock; ds?: DesignSystemDocument; selectedId: string | null; prototype: boolean;
  onSelect: (id: string) => void; onDrop: (parentId: string | null, index: number, payload: DragPayload) => void; onRun: (block: WireframeBlock) => void;
}) {
  const [over, setOver] = useState('');
  const targetAt = (element: HTMLElement, x: number, y: number) => {
    const rect = element.getBoundingClientRect();
    const horizontal = element.dataset.direction === 'row';
    const fraction = horizontal ? (x-rect.left)/rect.width : (y-rect.top)/rect.height;
    const inside = element.dataset.container === 'true' && fraction > .25 && fraction < .75;
    return {parent: inside ? element.dataset.blockId! : element.dataset.parent || null, index: inside ? Number(element.dataset.children) : Number(element.dataset.index)+(fraction>.5?1:0), hint: inside?'inside':fraction>.5?'after':'before'};
  };
  const selected = selectedId === block.id;
  const children = blockChildren(block);
  const containerStyle: React.CSSProperties = {
    width: block.width === 'fill' ? '100%' : block.width === 'hug' ? 'auto' : block.width,
    minHeight: typeof block.height === 'number' ? block.height : 72,
    padding: block.padding,
    margin: block.margin,
    borderRadius: block.radius,
    background: block.background === 'transparent' ? 'transparent' : block.background,
    color: block.color,
    display: block.layoutMode === 'stack' || block.layoutMode === 'grid' ? 'grid' : 'flex',
    gridTemplateColumns: block.layoutMode === 'grid' ? 'repeat(2, minmax(0, 1fr))' : undefined,
    flexDirection: block.direction || (block.type === 'row' ? 'row' : 'column'),
    flexWrap: block.wrap ? 'wrap' : 'nowrap',
    alignItems: block.align === 'start' ? 'flex-start' : block.align === 'center' ? 'center' : block.align === 'end' ? 'flex-end' : 'stretch',
    justifyContent: block.justify === 'center' ? 'center' : block.justify === 'end' ? 'flex-end' : block.justify === 'between' ? 'space-between' : 'flex-start',
    gap: block.gap,
    position: 'relative',
  };
  return <div
    data-block-id={block.id} data-parent={parentId || ''} data-index={index} data-direction={direction} data-container={isContainer(block)} data-children={children.length} data-drop={over}
    onDragOver={e=>{if(prototype)return;e.preventDefault();e.stopPropagation();setOver(targetAt(e.currentTarget,e.clientX,e.clientY).hint);}}
    onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setOver('');}}
    onDrop={e=>{if(prototype)return;e.preventDefault();e.stopPropagation();const target=targetAt(e.currentTarget,e.clientX,e.clientY);setOver('');try{onDrop(target.parent,target.index,JSON.parse(e.dataTransfer.getData('text/plain')));}catch{}}}
    draggable={!prototype}
    onDragStart={e => { if (prototype) return; e.stopPropagation(); e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'block', id: block.id } satisfies DragPayload)); e.dataTransfer.effectAllowed = 'move'; }}
    onClick={e => { e.stopPropagation(); prototype ? onRun(block) : onSelect(block.id); }}
    className={`wireframe-block relative group ${selected && !prototype ? 'outline outline-2 outline-[#20867C] outline-offset-2 rounded-md' : ''} ${prototype && block.interaction && block.interaction !== 'none' ? 'cursor-pointer' : ''}`}
    style={{ alignSelf: block.alignSelf === 'auto' ? undefined : block.alignSelf as any, gridColumn: `span ${Math.max(1, block.gridColumnSpan || 1)}` }}
  >
    {!prototype && <button type="button" aria-label={`Arrastar ${block.label}`} title="Arraste para reordenar; solte no centro de um grupo para inserir" className="absolute -left-7 top-0 z-10 w-7 h-9 flex items-center justify-center rounded bg-white/90 border border-teal-200 cursor-grab text-teal-800 touch-none"
      onPointerDown={e=>{e.stopPropagation();e.preventDefault();const el=e.currentTarget;el.setPointerCapture(e.pointerId);onSelect(block.id);let target:ReturnType<typeof targetAt>|null=null;let highlighted:HTMLElement|null=null;
        const move=(ev:PointerEvent)=>{const node=window.document.elementFromPoint(ev.clientX,ev.clientY)?.closest<HTMLElement>('[data-block-id]');if(highlighted)highlighted.removeAttribute('data-drop');target=null;if(node && node.dataset.blockId!==block.id){target=targetAt(node,ev.clientX,ev.clientY);node.dataset.drop=target.hint;highlighted=node;}const scroller=node?.closest('section');if(scroller){const r=scroller.getBoundingClientRect();if(ev.clientY>r.bottom-50)scroller.scrollTop+=18;if(ev.clientY<r.top+50)scroller.scrollTop-=18;}};
        const end=(ev:PointerEvent)=>{if(highlighted)highlighted.removeAttribute('data-drop');if(ev.type==='pointerup'&&target)onDrop(target.parent,target.index,{kind:'block',id:block.id});el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);};
        el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
      }}><GripVertical size={18}/></button>}
    {isContainer(block) ? <div style={containerStyle} className="border border-dashed border-black/15 min-w-[80px]">
      {children.length === 0 ? <div className="min-h-14 flex items-center justify-center text-[10px] text-neutral-400">Solte elementos aqui</div> : null}
      {children.map((child, index) => <React.Fragment key={child.id}>
        
        <CanvasBlock parentId={block.id} index={index} direction={block.direction} block={child} ds={ds} selectedId={selectedId} prototype={prototype} onSelect={onSelect} onDrop={onDrop} onRun={onRun} />
      </React.Fragment>)}
      
    </div> : <LeafPreview b={block} ds={ds} />}
    {prototype && block.interaction && block.interaction !== 'none' ? <span className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-[#20867C] text-white flex items-center justify-center"><MousePointerClick size={11} /></span> : null}
  </div>;
}

export function WireframePreview({ document, designSystem, className = '' }: { document: WireframeDocument; designSystem?: DesignSystemDocument; className?: string }) {
  useGraphicFonts([...Object.values(designSystem?.fontFamilies || {}), designSystem?.primaryFont, ...document.frames.flatMap(f => flattenBlocks(f.blocks).map(b => b.fontFamily))]);
  const f = document.frames.find(x => x.id === document.activeFrameId) || document.frames[0];
  if (!f) return <div className={className} />;
  const scale = Math.min(1, 300 / f.width, 230 / f.height);
  return <div className={`bg-[#ECEBE7] p-3 flex items-center justify-center overflow-hidden ${className}`}>
    <div style={{ width: f.width * scale, height: f.height * scale, background: f.background, padding: f.padding * scale, gap: Math.max(2, f.gap * scale), display: f.layoutMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: f.layoutMode === 'grid' ? `repeat(${f.gridColumns || 4},1fr)` : undefined, flexDirection: f.direction, overflow: 'hidden', borderRadius: 10 }}>
      {f.blocks.map(b => <div key={b.id} style={{ minHeight: 4, background: b.background === 'transparent' ? '#D8D8D4' : b.background, borderRadius: 2 }} />)}
    </div>
  </div>;
}

const drawingUrl = (d: DrawingDocument) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(drawingToSvgString(d))}`;

export default function WireframeStudio({ document, designSystem, title = 'Wireframes', canEdit = true, availableDrawings = [], initialSource = null, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<WireframeDocument>(() => {
    const cloned = JSON.parse(JSON.stringify(document || blankWireframe(designSystem))) as WireframeDocument;
    if (!cloned.frames?.length) return blankWireframe(designSystem);
    cloned.frames = cloned.frames.map((frame, index) => ({
      ...frame,
      name: !frame.name || /^(mobile · home|novo frame|frame)$/i.test(frame.name.trim()) ? `Wireframe ${index + 1}` : frame.name,
      wrap: frame.wrap ?? false,
    }));
    return cloned;
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [widgetQuery, setWidgetQuery] = useState('');
  const [targetQuery, setTargetQuery] = useState('');
  const [prototypeMode, setPrototypeMode] = useState(false);
  const [prototypeFrameId, setPrototypeFrameId] = useState<string | null>(null);
  const [prototypeHistory, setPrototypeHistory] = useState<string[]>([]);
  const [prototypeNotice, setPrototypeNotice] = useState('');
  const [zoom, setZoom] = useState(80);
  const [mobilePane, setMobilePane] = useState<MobilePane>('canvas');
  const [source, setSource] = useState<WireframeImportSource | null>(initialSource);
  const [fidelity, setFidelity] = useState<'structure' | 'balanced' | 'faithful'>('balanced');
  const [targetDevice, setTargetDevice] = useState<'auto' | 'mobile' | 'tablet' | 'desktop'>('auto');
  const [isUploading, setIsUploading] = useState(false);
  const [isInterpreting, setIsInterpreting] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  const [uncertainties, setUncertainties] = useState<string[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const activeFrame = useMemo(() => draft.frames.find(x => x.id === draft.activeFrameId) || draft.frames[0], [draft]);
  const frame = prototypeMode ? draft.frames.find(x => x.id === (prototypeFrameId || draft.activeFrameId)) || activeFrame : activeFrame;
  const selected = activeFrame ? findBlock(activeFrame.blocks, selectedId || '') : null;
  const allFonts = draft.frames.flatMap(f => flattenBlocks(f.blocks).map(b => b.fontFamily));
  useGraphicFonts([...Object.values(designSystem?.fontFamilies || {}), designSystem?.primaryFont, ...allFonts]);

  const patchActiveFrame = (patch: Partial<WireframeFrame>) => setDraft(d => ({ ...d, frames: d.frames.map(f => f.id === d.activeFrameId ? { ...f, ...patch } : f) }));
  const patchBlock = (blockId: string, patch: Partial<WireframeBlock>) => setDraft(d => ({ ...d, frames: d.frames.map(f => f.id === d.activeFrameId ? { ...f, blocks: updateBlockDeep(f.blocks, blockId, patch) } : f) }));
  const nextWireframeName = () => {
    const used = draft.frames.map(frame => {
      const match = /^Wireframe\s+(\d+)$/i.exec((frame.name || '').trim());
      return match ? Number(match[1]) : 0;
    });
    return `Wireframe ${Math.max(0, ...used) + 1}`;
  };

  const addFrame = (preset = PRESETS[0]) => {
    const next: WireframeFrame = {
      id: uid('frame'), name: nextWireframeName(), preset: preset.preset, width: preset.width, height: preset.height,
      direction: 'column', gap: 16, padding: preset.preset === 'desktop' ? 32 : 20, margin: 0, align: 'stretch', justify: 'start',
      layoutMode: 'flex', gridColumns: preset.preset === 'desktop' ? 12 : preset.preset === 'tablet' ? 8 : 4,
      columnGap: 16, rowGap: 16, background: surface(designSystem), wrap: false, blocks: [],
    };
    setDraft(d => ({ ...d, frames: [...d.frames, next], activeFrameId: next.id }));
    setSelectedId(null);
    setPrototypeMode(false);
  };

  const createLinkedFrame = (name?: string) => {
    const preset = PRESETS.find(p => p.preset === activeFrame?.preset && p.width === activeFrame?.width) || PRESETS[0];
    const next: WireframeFrame = {
      id: uid('frame'), name: (name || '').trim() || nextWireframeName(), preset: activeFrame?.preset || preset.preset,
      width: activeFrame?.width || preset.width, height: activeFrame?.height || preset.height,
      direction: 'column', gap: 16, padding: activeFrame?.padding ?? 20, margin: 0, align: 'stretch', justify: 'start',
      layoutMode: 'flex', gridColumns: activeFrame?.gridColumns || 4, columnGap: 16, rowGap: 16,
      background: surface(designSystem), wrap: false, blocks: [],
    };
    setDraft(d => ({ ...d, frames: [...d.frames, next] }));
    return next;
  };

  const duplicateFrame = (sourceFrame: WireframeFrame) => {
    const copy: WireframeFrame = { ...JSON.parse(JSON.stringify(sourceFrame)), id: uid('frame'), name: nextWireframeName(), blocks: sourceFrame.blocks.map(cloneBlock) };
    setDraft(d => ({ ...d, frames: [...d.frames, copy], activeFrameId: copy.id }));
    setSelectedId(null);
  };

  const deleteFrame = (frameId: string) => {
    if (draft.frames.length <= 1) return;
    const next = draft.frames.filter(f => f.id !== frameId);
    setDraft(d => ({ ...d, frames: next, activeFrameId: d.activeFrameId === frameId ? next[0].id : d.activeFrameId }));
    setSelectedId(null);
  };

  const addBlock = (type: WireframeBlockType, parentId: string | null = null) => {
    if (!activeFrame) return;
    const newBlock = blockDefault(type, designSystem);
    const blocks = insertBlockDeep(activeFrame.blocks, parentId, parentId ? blockChildren(findBlock(activeFrame.blocks, parentId) || newBlock).length : activeFrame.blocks.length, newBlock);
    patchActiveFrame({ blocks });
    setSelectedId(newBlock.id);
    setMobilePane('inspector');
  };

  const dropBlock = (parentId: string | null, index: number, payload: DragPayload) => {
    if (!activeFrame || prototypeMode) return;
    let moving: WireframeBlock | null = null;
    let blocks = activeFrame.blocks;
    if (payload.kind === 'palette') moving = blockDefault(payload.type, designSystem);
    else if (payload.kind === 'component') {
      const component = draft.componentLibrary?.find(item => item.id === payload.id);
      moving = component ? cloneBlock(component) : null;
    } else {
      const source = findBlock(blocks, payload.id);
      if (!source || parentId === payload.id || (parentId && findBlock(blockChildren(source), parentId))) return;
      const location = findBlockLocation(blocks, payload.id);
      if (location?.parentId === parentId && location.index < index) index -= 1;
      const removed = removeBlockDeep(blocks, payload.id);
      blocks = removed.blocks;
      moving = removed.removed;
    }
    if (!moving) return;
    if (parentId === moving.id) return;
    const parent = parentId ? findBlock(blocks, parentId) : null;
    if (parentId && (!parent || !isContainer(parent))) return;
    blocks = insertBlockDeep(blocks, parentId, index, moving);
    patchActiveFrame({ blocks });
    setSelectedId(moving.id);
  };

  const removeSelected = () => {
    if (!activeFrame || !selectedId) return;
    patchActiveFrame({ blocks: removeBlockDeep(activeFrame.blocks, selectedId).blocks });
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    if (!activeFrame || !selected) return;
    patchActiveFrame({ blocks: [...activeFrame.blocks, cloneBlock(selected)] });
  };

  const moveSelectedSibling = (delta: number) => {
    if (!activeFrame || !selectedId) return;
    const loc = findBlockLocation(activeFrame.blocks, selectedId);
    if (!loc) return;
    const siblings = loc.parentId ? blockChildren(findBlock(activeFrame.blocks, loc.parentId) || ({ children: [] } as any)) : activeFrame.blocks;
    const target = Math.max(0, Math.min(siblings.length - 1, loc.index + delta));
    if (target === loc.index) return;
    patchActiveFrame({ blocks: reorderAtLocation(activeFrame.blocks, loc.parentId, loc.index, target) });
  };

  const moveSelectedToEdge = (edge: 'start' | 'end') => {
    if (!activeFrame || !selectedId) return;
    const loc = findBlockLocation(activeFrame.blocks, selectedId);
    if (!loc) return;
    const siblings = loc.parentId ? blockChildren(findBlock(activeFrame.blocks, loc.parentId) || ({ children: [] } as any)) : activeFrame.blocks;
    const target = edge === 'start' ? 0 : Math.max(0, siblings.length - 1);
    if (target === loc.index) return;
    patchActiveFrame({ blocks: reorderAtLocation(activeFrame.blocks, loc.parentId, loc.index, target) });
  };

  const wrapSelected = (kind: 'row' | 'column' | 'stack') => {
    if (!activeFrame || !selectedId || !selected) return;
    const loc = findBlockLocation(activeFrame.blocks, selectedId);
    if (!loc) return;
    const removed = removeBlockDeep(activeFrame.blocks, selectedId);
    const wrapper = blockDefault(kind, designSystem);
    wrapper.label = kind === 'row' ? 'Row' : kind === 'column' ? 'Column' : 'Stack';
    wrapper.width = selected.width === 'hug' ? 'hug' : 'fill';
    wrapper.children = [removed.removed || selected];
    wrapper.padding = 0;
    wrapper.background = 'transparent';
    wrapper.gap = 12;
    const blocks = insertBlockDeep(removed.blocks, loc.parentId, loc.index, wrapper);
    patchActiveFrame({ blocks });
    setSelectedId(wrapper.id);
  };

  const makeSidebarLayout = () => {
    if (!activeFrame) return;
    const navIndex = activeFrame.blocks.findIndex(block => ['navbar','side-nav','drawer'].includes(block.type));
    if (navIndex < 0) return;
    const nav = { ...activeFrame.blocks[navIndex], type: 'side-nav' as WireframeBlockType, width: 220, height: 'hug' as const, direction: 'column' as const };
    const rest = activeFrame.blocks.filter((_, index) => index !== navIndex);
    const content = blockDefault('column', designSystem);
    content.label = 'Conteúdo principal';
    content.width = 'fill';
    content.padding = 0;
    content.background = 'transparent';
    content.children = rest;
    patchActiveFrame({ direction: 'row', layoutMode: 'flex', wrap: false, align: 'stretch', blocks: [nav, content] });
    setSelectedId(nav.id);
  };

  const makeTopNavigationLayout = () => {
    if (!activeFrame) return;
    const flat = activeFrame.blocks.length === 1 && isContainer(activeFrame.blocks[0]) ? blockChildren(activeFrame.blocks[0]) : activeFrame.blocks;
    const navIndex = flat.findIndex(block => ['navbar','side-nav','drawer','appbar'].includes(block.type));
    if (navIndex < 0) return;
    const nav = { ...flat[navIndex], type: 'navbar' as WireframeBlockType, width: 'fill' as const, height: 64, direction: 'row' as const };
    const rest = flat.filter((_, index) => index !== navIndex);
    patchActiveFrame({ direction: 'column', layoutMode: 'flex', wrap: false, align: 'stretch', blocks: [nav, ...rest] });
    setSelectedId(nav.id);
  };

  const runInteraction = (block: WireframeBlock) => {
    if (!prototypeMode || !block.interaction || block.interaction === 'none') return;
    if (block.interaction === 'navigate') {
      const target = draft.frames.find(f => f.id === block.interactionTarget || f.name.toLowerCase() === (block.interactionTarget || '').toLowerCase());
      if (!target) return setPrototypeNotice('A tela de destino ainda não foi definida.');
      if (frame) setPrototypeHistory(h => [...h, frame.id]);
      setPrototypeFrameId(target.id);
      setPrototypeNotice(`Navegou para ${target.name}`);
    } else if (block.interaction === 'modal') setPrototypeNotice(`Modal: ${block.interactionTarget || block.label}`);
    else if (block.interaction === 'toggle') setPrototypeNotice(`Estado alternado em “${block.label}”.`);
    else if (block.interaction === 'link') setPrototypeNotice(`Link: ${block.href || block.interactionTarget || 'sem URL'}`);
  };

  const startPrototype = () => {
    setPrototypeMode(true);
    setPrototypeFrameId(draft.activeFrameId || draft.frames[0]?.id || null);
    setPrototypeHistory([]);
    setSelectedId(null);
    setPrototypeNotice('Clique em elementos com o ícone de interação para testar o fluxo.');
    setMobilePane('canvas');
  };

  const upload = async (file: File) => {
    if (!file.type.startsWith('image/')) return setError('Escolha uma imagem, foto ou screenshot.');
    if (file.size > 4 * 1024 * 1024) return setError('A imagem precisa ter até 4 MB.');
    setIsUploading(true); setError('');
    try {
      const session = await ensureTursoSession();
      const response = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': file.type, 'X-File-Name': encodeURIComponent(file.name), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: file });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Falha no upload');
      setSource({ kind: 'image', name: file.name, url: data.url });
    } catch (e: any) { setError(e.message || 'Falha no upload'); }
    finally { setIsUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const interpret = async () => {
    if (!source) return;
    setIsInterpreting(true); setError(''); setNotes([]); setUncertainties([]);
    try {
      const session = await ensureTursoSession().catch(() => null);
      const wireframeSource = source.kind === 'drawing'
        ? { kind: 'drawing', name: source.name, svg: drawingToSvgString(source.drawing).slice(0, 70000), width: source.drawing.width, height: source.drawing.height }
        : { kind: 'image', name: source.name, url: source.url };
      const response = await fetch('/api/mediators/think', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify({ mode: 'wireframe-interpret', wireframeSource, wireframeOptions: { device: targetDevice, fidelity } }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.wireframeInterpretation?.frame) throw new Error(data.error || 'A IA não conseguiu interpretar o esboço.');
      const raw = data.wireframeInterpretation.frame;
      const blocks = (raw.blocks || []).map((b: any) => ({ ...blockDefault(BLOCKS.some(x => x.type === b.type) ? b.type : 'card', designSystem), ...b, id: uid('block') }));
      const nf: WireframeFrame = {
        id: uid('frame'), name: nextWireframeName(), preset: ['mobile', 'tablet', 'desktop', 'watch', 'custom'].includes(raw.preset) ? raw.preset : 'custom',
        width: Number(raw.width) || 393, height: Number(raw.height) || 852, direction: raw.direction === 'row' ? 'row' : 'column', gap: Number(raw.gap) || 12,
        padding: Number(raw.padding) || 20, margin: 0, align: ['start', 'center', 'end', 'stretch'].includes(raw.align) ? raw.align : 'stretch', justify: 'start', layoutMode: 'flex',
        gridColumns: raw.preset === 'desktop' ? 12 : raw.preset === 'tablet' ? 8 : 4, columnGap: 16, rowGap: 16, background: raw.background || '#FFFFFF', wrap: false, blocks,
      };
      setDraft(cur => ({ ...cur, frames: [...cur.frames, nf], activeFrameId: nf.id }));
      setNotes(data.wireframeInterpretation.notes || []); setUncertainties(data.wireframeInterpretation.uncertainties || []); setSelectedId(null);
    } catch (e: any) { setError(e.message || 'Não foi possível interpretar'); }
    finally { setIsInterpreting(false); }
  };

  const targetSuggestions = useMemo(() => {
    const q = targetQuery.trim().toLowerCase();
    return draft.frames
      .filter(f => f.id !== activeFrame?.id)
      .filter(f => !q || f.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (!q) return a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
        const ap = a.name.toLowerCase().startsWith(q) ? 0 : 1;
        const bp = b.name.toLowerCase().startsWith(q) ? 0 : 1;
        return ap - bp || a.name.localeCompare(b.name, 'pt-BR', { numeric: true });
      })
      .slice(0, 8);
  }, [draft.frames, targetQuery, activeFrame?.id]);

  const filteredWidgets = useMemo(() => {
    const q = widgetQuery.trim().toLowerCase();
    return BLOCKS.filter(item => !q || item.label.toLowerCase().includes(q) || item.type.includes(q));
  }, [widgetQuery]);

  const renderedScale = Math.max(.25, Math.min(1.4, zoom / 100));
  const frameDisplayW = frame ? frame.width * renderedScale : 0;
  const frameDisplayH = frame ? frame.height * renderedScale : 0;

  const LibraryPane = <aside className="h-full bg-white border-r border-black/10 overflow-y-auto p-3 space-y-4">
    <section>
      <div className="flex items-center justify-between"><div className="text-[10px] font-mono font-bold uppercase tracking-wider">Páginas</div><button onClick={() => addFrame(PRESETS[0])} className="h-8 w-8 rounded-lg bg-black text-white flex items-center justify-center" title="Nova página"><Plus size={15} /></button></div>
      <div className="mt-2 space-y-2">{draft.frames.map((f, idx) => <div key={f.id} className={`rounded-xl border p-2 ${f.id === draft.activeFrameId && !prototypeMode ? 'border-black bg-[#F4F3EF]' : 'border-black/10'}`}>
        <button className="w-full flex gap-2 text-left" onClick={() => { setDraft(d => ({ ...d, activeFrameId: f.id })); setSelectedId(null); setPrototypeMode(false); setMobilePane('canvas'); }}>
          <MiniFrame frame={f} ds={designSystem} />
          <span className="min-w-0 flex-1"><b className="text-[11px] block truncate">{f.name || `Wireframe ${idx + 1}`}</b><span className="text-[9px] font-mono text-neutral-500">{f.width}×{f.height}</span><span className="block mt-2 text-[9px] text-neutral-400">{flattenBlocks(f.blocks).length} itens</span></span>
        </button>
        <div className="mt-2 flex gap-1"><button onClick={() => duplicateFrame(f)} className="h-7 px-2 rounded border text-[9px] flex items-center gap-1"><Copy size={11} /> duplicar</button><button disabled={draft.frames.length <= 1} onClick={() => deleteFrame(f.id)} className="h-7 w-7 rounded border border-red-200 text-red-600 flex items-center justify-center disabled:opacity-30"><Trash2 size={11} /></button></div>
      </div>)}</div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">{PRESETS.slice(0, 4).map(p => { const I = p.icon; return <button key={p.id} onClick={() => addFrame(p)} className="rounded-lg border border-black/10 p-2 text-left text-[9px] flex items-center gap-2"><I size={13} /><span><b>{p.label}</b><small className="block text-neutral-400">{p.width}×{p.height}</small></span></button>; })}</div>
    </section>

    <section className="border-t pt-3">
      <div className="text-[10px] font-mono font-bold uppercase tracking-wider">Itens</div>
      <div className="mt-2 relative"><Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" /><input value={widgetQuery} onChange={e => setWidgetQuery(e.target.value)} placeholder="Buscar widget…" className="h-9 w-full rounded-lg border border-black/10 pl-8 pr-2 text-[10px]" /></div>
      {(['layout', 'basic', 'input', 'navigation', 'data'] as const).map(group => {
        const items = filteredWidgets.filter(item => item.group === group); if (!items.length) return null;
        const labels = { layout: 'Layout', basic: 'Básicos', input: 'Formulários', navigation: 'Navegação', data: 'Conteúdo / dados' };
        return <div key={group} className="mt-3"><div className="text-[9px] font-mono uppercase text-neutral-400 mb-1.5">{labels[group]}</div><div className="grid grid-cols-2 gap-1.5">{items.map(item => { const I = item.icon; return <button key={item.type} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'palette', type: item.type } satisfies DragPayload)); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => addBlock(item.type)} className="min-h-11 rounded-lg border border-black/10 px-2 flex items-center gap-2 text-[9px] text-left hover:border-black cursor-grab active:cursor-grabbing"><I size={13} />{item.label}</button>; })}</div></div>;
      })}
    </section>

    {!!draft.componentLibrary?.length && <section className="border-t pt-3">
      <div className="text-[10px] font-mono font-bold uppercase tracking-wider">Componentes salvos</div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">{draft.componentLibrary.map(component => <button key={component.id} draggable onDragStart={e => { e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'component', id: component.id } satisfies DragPayload)); }} onClick={() => { if (!activeFrame) return; const clone = cloneBlock(component); patchActiveFrame({ blocks: [...activeFrame.blocks, clone] }); setSelectedId(clone.id); }} className="min-h-10 rounded-lg border border-black/10 p-2 text-[9px] text-left hover:border-black"><b className="block truncate">{component.componentName || component.label}</b><small className="text-neutral-400">{component.type}</small></button>)}</div>
    </section>}

    <section className="border-t pt-3">
      <div className="text-[10px] font-mono font-bold uppercase tracking-wider">Árvore</div>
      <div className="mt-2 space-y-1">{activeFrame?.blocks.map((b, index) => <TreeItem key={b.id} block={b} depth={0} parentId={null} selectedId={selectedId} onSelect={id => { setSelectedId(id); setMobilePane('inspector'); }} onDropAt={dropBlock} index={index} />)}</div>
    </section>

    <section className="border-t pt-3">
      <div className="rounded-2xl border-2 border-black p-3 bg-[#FAFAF8]">
        <div className="font-bold text-[11px] flex items-center gap-2"><ImagePlus size={15} /> Transformar desenho em interface</div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); }} />
        <button onClick={() => fileRef.current?.click()} className="mt-2 w-full h-10 rounded-xl border border-black flex items-center justify-center gap-2 text-[9px] font-bold">{isUploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} IMAGEM / SCREENSHOT</button>
        {availableDrawings.length > 0 && <select onChange={e => { const d = availableDrawings.find(x => x.id === e.target.value); if (d) setSource({ kind: 'drawing', name: d.name, drawing: d.drawing }); }} className="mt-2 h-10 w-full rounded-xl border border-black/10 px-2 text-[10px]"><option value="">Desenho do canvas…</option>{availableDrawings.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
        {source && <img src={source.kind === 'drawing' ? drawingUrl(source.drawing) : source.url} className="mt-2 w-full max-h-28 object-contain rounded-lg bg-white border" />}
        <div className="mt-2 grid grid-cols-2 gap-2"><select value={fidelity} onChange={e => setFidelity(e.target.value as any)} className="h-9 rounded-lg border border-black/10 text-[9px]"><option value="structure">Estrutura</option><option value="balanced">Equilibrada</option><option value="faithful">Muito fiel</option></select><select value={targetDevice} onChange={e => setTargetDevice(e.target.value as any)} className="h-9 rounded-lg border border-black/10 text-[9px]"><option value="auto">Automático</option><option value="mobile">Mobile</option><option value="tablet">Tablet</option><option value="desktop">Desktop</option></select></div>
        <button onClick={() => void interpret()} disabled={!source || isInterpreting} className="mt-2 w-full h-11 rounded-xl bg-black text-white text-[9px] font-bold flex items-center justify-center gap-2">{isInterpreting ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />} GERAR EDITÁVEL</button>
        {notes.map((n, i) => <div key={i} className="mt-1 text-[9px] text-emerald-700">✓ {n}</div>)}{uncertainties.map((n, i) => <div key={i} className="mt-1 text-[9px] text-amber-700">? {n}</div>)}{error && <div className="mt-2 text-[9px] text-red-700">{error}</div>}
      </div>
    </section>
  </aside>;

  const InspectorPane = <aside className="h-full bg-white border-l border-black/10 overflow-y-auto p-3 space-y-4">
    <div className="flex items-center justify-between"><div><div className="text-[10px] font-mono font-bold uppercase tracking-wider">Propriedades</div><div className="text-[10px] text-neutral-500">{selected ? selected.label : activeFrame?.name}</div></div>{selected ? <div className="flex gap-1"><button onClick={duplicateSelected} className="h-8 w-8 border rounded-lg flex items-center justify-center"><Copy size={13} /></button><button onClick={removeSelected} className="h-8 w-8 border border-red-200 text-red-600 rounded-lg flex items-center justify-center"><Trash2 size={13} /></button></div> : null}</div>

    {!selected && activeFrame ? <>
      <label className="block text-[9px] font-mono">NOME DA TELA<input value={activeFrame.name} onChange={e => patchActiveFrame({ name: e.target.value })} className="mt-1 h-10 w-full rounded-lg border px-2 text-[11px] font-sans" /></label>
      <div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono">LARGURA<input type="number" value={activeFrame.width} onChange={e => patchActiveFrame({ width: Math.max(120, +e.target.value) })} className="mt-1 h-9 w-full border rounded-lg px-2" /></label><label className="text-[9px] font-mono">ALTURA<input type="number" value={activeFrame.height} onChange={e => patchActiveFrame({ height: Math.max(120, +e.target.value) })} className="mt-1 h-9 w-full border rounded-lg px-2" /></label></div>
      <section className="rounded-xl border p-3 space-y-3"><div className="flex items-center justify-between gap-2"><b className="text-[10px]">Auto layout da página</b><span className="text-[8px] font-mono text-neutral-400">tipo FlutterFlow</span></div><div className="grid grid-cols-2 gap-2"><button onClick={() => patchActiveFrame({ layoutMode: 'flex' })} className={`h-9 rounded-lg border text-[9px] ${activeFrame.layoutMode !== 'grid' ? 'bg-black text-white' : ''}`}>AUTO LAYOUT</button><button onClick={() => patchActiveFrame({ layoutMode: 'grid' })} className={`h-9 rounded-lg border text-[9px] ${activeFrame.layoutMode === 'grid' ? 'bg-black text-white' : ''}`}>GRID</button></div><div className="grid grid-cols-2 gap-2"><button onClick={makeTopNavigationLayout} className="h-9 rounded-lg border text-[9px] font-bold">NAV NO TOPO</button><button onClick={makeSidebarLayout} className="h-9 rounded-lg border text-[9px] font-bold">NAV LATERAL</button></div><p className="text-[9px] leading-relaxed text-neutral-500">Arraste Row, Column, Stack ou outros containers para o canvas e depois solte qualquer item dentro deles. Você pode testar a navbar no topo, na lateral ou aninhada sem recriar a tela.</p>
      {activeFrame.layoutMode === 'grid' ? <div className="grid grid-cols-3 gap-2"><NumberField label="COLUNAS" value={activeFrame.gridColumns || 4} onChange={v => patchActiveFrame({ gridColumns: v })} /><NumberField label="GAP X" value={activeFrame.columnGap || 0} onChange={v => patchActiveFrame({ columnGap: v })} /><NumberField label="GAP Y" value={activeFrame.rowGap || 0} onChange={v => patchActiveFrame({ rowGap: v })} /></div> : <><div className="grid grid-cols-2 gap-2"><button onClick={() => patchActiveFrame({ direction: 'column' })} className={`h-9 rounded-lg border text-[9px] ${activeFrame.direction === 'column' ? 'bg-black text-white' : ''}`}>VERTICAL</button><button onClick={() => patchActiveFrame({ direction: 'row' })} className={`h-9 rounded-lg border text-[9px] ${activeFrame.direction === 'row' ? 'bg-black text-white' : ''}`}>HORIZONTAL</button></div><label className="flex items-center justify-between text-[9px] font-mono">QUEBRAR LINHA <input type="checkbox" checked={!!activeFrame.wrap} onChange={e => patchActiveFrame({ wrap: e.target.checked })} /></label><NumberField label="GAP" value={activeFrame.gap} onChange={v => patchActiveFrame({ gap: v })} /></>}
      <div className="grid grid-cols-2 gap-2"><NumberField label="PADDING" value={activeFrame.padding} onChange={v => patchActiveFrame({ padding: v })} /><NumberField label="MARGEM" value={activeFrame.margin || 0} onChange={v => patchActiveFrame({ margin: v })} /></div>
      <div className="grid grid-cols-4 gap-1">{([['start', AlignLeft], ['center', AlignCenter], ['end', AlignRight], ['stretch', LayoutGrid]] as [WireframeAlign, React.ElementType][]).map(([value, I]) => <button key={value} onClick={() => patchActiveFrame({ align: value })} className={`h-9 rounded-lg border flex items-center justify-center ${activeFrame.align === value ? 'bg-black text-white' : ''}`}><I size={14} /></button>)}</div><label className="text-[9px] font-mono block">DISTRIBUIÇÃO<select value={activeFrame.justify || 'start'} onChange={e => patchActiveFrame({ justify: e.target.value as any })} className="mt-1 h-9 w-full border rounded-lg px-2"><option value="start">Início</option><option value="center">Centro</option><option value="end">Fim</option><option value="between">Espaçar</option></select></label></section>
    </> : null}

    {selected ? <>
      <label className="block text-[9px] font-mono">NOME / CONTEÚDO<input value={selected.label} onChange={e => patchBlock(selected.id, { label: e.target.value })} className="mt-1 h-10 w-full border rounded-lg px-2 text-[11px] font-sans" /></label>
      <section className="rounded-xl border-2 border-[#20867C]/30 bg-[#F4FBF9] p-3 space-y-2"><div className="flex items-center justify-between"><b className="text-[10px]">Mover / Auto Layout</b><span className="text-[8px] font-mono text-[#20867C]">ARRASTÁVEL</span></div><div className="grid grid-cols-4 gap-1"><button onClick={() => moveSelectedToEdge('start')} className="h-8 rounded-lg border bg-white text-[9px]" title="Mover para o início">⇤</button><button onClick={() => moveSelectedSibling(-1)} className="h-8 rounded-lg border bg-white text-[9px]" title="Subir / voltar uma posição">↑</button><button onClick={() => moveSelectedSibling(1)} className="h-8 rounded-lg border bg-white text-[9px]" title="Descer / avançar uma posição">↓</button><button onClick={() => moveSelectedToEdge('end')} className="h-8 rounded-lg border bg-white text-[9px]" title="Mover para o final">⇥</button></div><div className="grid grid-cols-3 gap-1"><button onClick={() => wrapSelected('row')} className="h-9 rounded-lg border bg-white text-[9px] font-bold">+ ROW</button><button onClick={() => wrapSelected('column')} className="h-9 rounded-lg border bg-white text-[9px] font-bold">+ COLUMN</button><button onClick={() => wrapSelected('stack')} className="h-9 rounded-lg border bg-white text-[9px] font-bold">+ STACK</button></div><p className="text-[9px] text-neutral-500">Os botões criam um Auto Layout ao redor do item selecionado. Depois arraste outros widgets para dentro dele pela tela ou pela árvore à esquerda.</p></section>
      <label className="text-[9px] font-mono block">FONTE · GOOGLE + FONTSHARE<FontPicker value={selected.fontFamily || font(designSystem, 'text')} onChange={fontFamily => patchBlock(selected.id, { fontFamily })} preferred={Object.values(designSystem?.fontFamilies || {})} /></label>
      <section className="rounded-xl border p-3 space-y-3"><b className="text-[10px]">Tamanho e posição</b><div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono">LARGURA<select value={selected.width === 'fill' ? 'fill' : selected.width === 'hug' ? 'hug' : 'fixed'} onChange={e => patchBlock(selected.id, { width: e.target.value === 'fill' ? 'fill' : e.target.value === 'hug' ? 'hug' : 160 })} className="mt-1 h-9 w-full border rounded-lg px-2"><option value="fill">Preencher</option><option value="hug">Abraçar</option><option value="fixed">Fixa</option></select></label>{typeof selected.width === 'number' ? <NumberField label="PX" value={selected.width} onChange={v => patchBlock(selected.id, { width: v })} /> : null}<NumberField label="ALTURA" value={typeof selected.height === 'number' ? selected.height : 48} onChange={v => patchBlock(selected.id, { height: v })} /><label className="text-[9px] font-mono">ALINHAR<select value={selected.alignSelf || 'stretch'} onChange={e => patchBlock(selected.id, { alignSelf: e.target.value as any })} className="mt-1 h-9 w-full border rounded-lg px-2"><option value="stretch">Esticar</option><option value="start">Início</option><option value="center">Centro</option><option value="end">Fim</option><option value="auto">Auto</option></select></label>{activeFrame?.layoutMode === 'grid' ? <NumberField label="COLUNAS" value={selected.gridColumnSpan || 1} onChange={v => patchBlock(selected.id, { gridColumnSpan: Math.max(1, Math.min(activeFrame.gridColumns || 12, v)) })} /> : null}</div></section>
      <section className="rounded-xl border p-3 space-y-3"><b className="text-[10px]">Aparência</b><div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono">FUNDO<input value={selected.background || '#FFFFFF'} onChange={e => patchBlock(selected.id, { background: e.target.value })} className="mt-1 h-9 w-full border rounded-lg px-2 font-mono uppercase" /></label><label className="text-[9px] font-mono">TEXTO / TRAÇO<input value={selected.color || '#111111'} onChange={e => patchBlock(selected.id, { color: e.target.value })} className="mt-1 h-9 w-full border rounded-lg px-2 font-mono uppercase" /></label><NumberField label="PADDING" value={selected.padding || 0} onChange={v => patchBlock(selected.id, { padding: v })} /><NumberField label="MARGEM" value={selected.margin || 0} onChange={v => patchBlock(selected.id, { margin: v })} /><NumberField label="RAIO" value={selected.radius || 0} onChange={v => patchBlock(selected.id, { radius: v })} /></div></section>
      {isContainer(selected) ? <section className="rounded-xl border p-3 space-y-3"><b className="text-[10px]">Auto layout interno</b><div className="grid grid-cols-2 gap-2"><button onClick={() => patchBlock(selected.id, { direction: 'column', layoutMode: 'flex' })} className={`h-9 rounded-lg border text-[9px] ${selected.direction !== 'row' && selected.layoutMode === 'flex' ? 'bg-black text-white' : ''}`}>VERTICAL</button><button onClick={() => patchBlock(selected.id, { direction: 'row', layoutMode: 'flex' })} className={`h-9 rounded-lg border text-[9px] ${selected.direction === 'row' && selected.layoutMode === 'flex' ? 'bg-black text-white' : ''}`}>HORIZONTAL</button><button onClick={() => patchBlock(selected.id, { layoutMode: 'grid' })} className={`h-9 rounded-lg border text-[9px] ${selected.layoutMode === 'grid' ? 'bg-black text-white' : ''}`}>GRID 2 COL</button><button onClick={() => patchBlock(selected.id, { layoutMode: 'stack' })} className={`h-9 rounded-lg border text-[9px] ${selected.layoutMode === 'stack' ? 'bg-black text-white' : ''}`}>STACK</button></div><label className="flex items-center justify-between text-[9px] font-mono">QUEBRAR LINHA <input type="checkbox" checked={!!selected.wrap} onChange={e => patchBlock(selected.id, { wrap: e.target.checked })} /></label><NumberField label="GAP" value={selected.gap || 0} onChange={v => patchBlock(selected.id, { gap: v })} /></section> : null}
      {selected.type === 'navbar' || selected.type === 'tabs' || selected.type === 'bottom-nav' ? <label className="block text-[9px] font-mono">ITENS<input value={(selected.items || []).join(', ')} onChange={e => patchBlock(selected.id, { items: e.target.value.split(',').map(x => x.trim()).filter(Boolean) })} className="mt-1 h-10 w-full border rounded-lg px-2 text-[11px] font-sans" /></label> : null}
      <section className="rounded-xl border-2 border-black p-3 space-y-2"><div className="flex items-center gap-2"><MousePointerClick size={14} /><b className="text-[10px]">Interação / protótipo</b></div><select value={selected.interaction || 'none'} onChange={e => { patchBlock(selected.id, { interaction: e.target.value as any, interactionTarget: e.target.value === 'none' ? '' : selected.interactionTarget }); setTargetQuery(''); }} className="h-10 w-full border rounded-lg px-2 text-[10px]"><option value="none">Nenhuma</option><option value="navigate">Navegar para tela</option><option value="modal">Abrir modal</option><option value="toggle">Alternar estado</option><option value="link">Abrir link</option></select>
      {selected.interaction === 'navigate' ? <div><div className="flex items-center justify-between gap-2"><label className="text-[9px] font-mono">TELA DE DESTINO</label><span className="text-[8px] text-neutral-400">pré-seleção visual</span></div><div className="relative mt-1"><Search size={13} className="absolute left-2.5 top-3 text-neutral-400" /><input value={targetQuery || (draft.frames.find(f => f.id === selected.interactionTarget)?.name || '')} onFocus={() => { if (!targetQuery && selected.interactionTarget) setTargetQuery(draft.frames.find(f => f.id === selected.interactionTarget)?.name || ''); }} onChange={e => { setTargetQuery(e.target.value); if (selected.interactionTarget) patchBlock(selected.id, { interactionTarget: '' }); }} placeholder="Digite: Wireframe 2, Login, Perfil…" className="h-10 w-full border rounded-lg pl-8 pr-2 text-[10px]" /></div><div className="mt-2 text-[8px] font-mono uppercase text-neutral-400">Telas disponíveis</div><div className="mt-1 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">{targetSuggestions.map(target => <button key={target.id} onClick={() => { patchBlock(selected.id, { interactionTarget: target.id }); setTargetQuery(target.name); }} className={`rounded-xl border p-2 text-left ${selected.interactionTarget === target.id ? 'border-[#20867C] bg-[#E9F7F4] ring-1 ring-[#20867C]' : 'border-black/10 hover:border-black'}`}><MiniFrame frame={target} ds={designSystem} /><b className="mt-1 block text-[9px] truncate">{target.name}</b><span className="text-[8px] text-neutral-400">{target.width}×{target.height}</span></button>)}</div>{targetQuery.trim() && !targetSuggestions.length ? <button onClick={() => { const next = createLinkedFrame(targetQuery.trim()); patchBlock(selected.id, { interactionTarget: next.id }); setTargetQuery(next.name); }} className="mt-2 h-10 w-full rounded-lg border-2 border-dashed border-[#20867C] bg-[#F3FBF9] text-[9px] font-bold text-[#165F57]">+ CRIAR “{targetQuery.trim()}” E CONECTAR</button> : null}{selected.interactionTarget ? <div className="mt-2 rounded-lg bg-[#E9F7F4] p-2 text-[9px] flex items-center justify-between gap-2"><span>Destino: <b>{draft.frames.find(f => f.id === selected.interactionTarget)?.name || selected.interactionTarget}</b></span><button onClick={() => { const target = draft.frames.find(f => f.id === selected.interactionTarget); if (!target) return; setDraft(d => ({ ...d, activeFrameId: target.id })); setSelectedId(null); setMobilePane('canvas'); }} className="rounded-md bg-white border px-2 py-1 font-bold">ABRIR</button></div> : null}</div> : selected.interaction && selected.interaction !== 'none' ? <input value={selected.interactionTarget || selected.href || ''} onChange={e => patchBlock(selected.id, { interactionTarget: e.target.value, href: selected.interaction === 'link' ? e.target.value : selected.href })} placeholder={selected.interaction === 'link' ? 'https://…' : 'Nome / estado'} className="h-10 w-full border rounded-lg px-2 text-[10px]" /> : null}
      <button onClick={startPrototype} className="h-10 w-full rounded-lg bg-black text-white flex items-center justify-center gap-2 text-[9px] font-bold"><Play size={13} /> TESTAR FLUXO</button></section>
      <button onClick={() => setDraft(d => ({ ...d, componentLibrary: [...(d.componentLibrary || []), { ...cloneBlock(selected), id: uid('component'), isComponent: true, componentName: selected.label }] }))} className="w-full h-10 rounded-xl border border-black text-[9px] font-bold">SALVAR COMO COMPONENTE</button>
    </> : null}
  </aside>;

  return <div className="studio-editor fixed inset-0 z-[125] bg-[#EDECE8] flex flex-col canvas-control atelier-studio" onPointerDown={e => e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b border-black/10 px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
      <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={19} /></button>
      <div className="min-w-0 flex-1"><div className="font-bold truncate">{title}</div><div className="text-[10px] font-mono text-neutral-500 uppercase">páginas · widgets · auto layout · protótipo · componentes</div></div>
      <StudioAreaGuide area="wireframe" />
      <button onClick={startPrototype} className={`hidden sm:flex h-11 px-3 rounded-xl border items-center gap-2 text-[10px] font-bold ${prototypeMode ? 'bg-[#20867C] text-white border-[#20867C]' : 'bg-white'}`}><Play size={14} /> {prototypeMode ? 'PROTÓTIPO' : 'TESTAR'}</button>
      <button onClick={() => onSave(draft)} disabled={!canEdit} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold"><Save size={15} /> SALVAR</button>
    </header>

    <div className="lg:hidden shrink-0 h-12 bg-white border-b flex p-1.5 gap-1.5">
      <button onClick={() => setMobilePane('library')} className={`flex-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${mobilePane === 'library' ? 'bg-black text-white' : 'bg-[#F3F2EE]'}`}><PanelLeft size={13} /> PÁGINAS / ITENS</button>
      <button onClick={() => setMobilePane('canvas')} className={`flex-1 rounded-lg text-[10px] font-bold ${mobilePane === 'canvas' ? 'bg-black text-white' : 'bg-[#F3F2EE]'}`}>CANVAS</button>
      <button onClick={() => setMobilePane('inspector')} className={`flex-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 ${mobilePane === 'inspector' ? 'bg-black text-white' : 'bg-[#F3F2EE]'}`}><PanelRight size={13} /> EDIÇÃO</button>
    </div>

    <ResizableStudioGrid storageKey="wireframe:panels" defaults={[23, 51, 26]}>
      <div className={`${mobilePane === 'library' ? 'block' : 'hidden'} lg:block h-full min-h-0`}>{LibraryPane}</div>
      <main className={`${mobilePane === 'canvas' ? 'flex' : 'hidden'} lg:flex h-full min-h-0 flex-col bg-[#E7E5E0] overflow-hidden`}>
        <div className="shrink-0 min-h-12 bg-white/90 border-b px-3 flex items-center gap-2 overflow-x-auto">
          {prototypeMode ? <><button onClick={() => { const prev = prototypeHistory[prototypeHistory.length - 1]; if (!prev) return; setPrototypeHistory(h => h.slice(0, -1)); setPrototypeFrameId(prev); }} disabled={!prototypeHistory.length} className="h-8 px-2 rounded-lg border flex items-center gap-1 text-[9px] disabled:opacity-30"><ArrowLeft size={12} /> VOLTAR</button><span className="text-[10px] font-mono">Protótipo · {frame?.name}</span><button onClick={() => { setPrototypeMode(false); setPrototypeNotice(''); }} className="h-8 px-2 rounded-lg bg-black text-white text-[9px]">SAIR DO TESTE</button></> : <><button onClick={() => setZoom(z => Math.max(25, z - 10))} className="h-8 w-8 rounded-lg border">−</button><span className="text-[9px] font-mono min-w-10 text-center">{zoom}%</span><button onClick={() => setZoom(z => Math.min(140, z + 10))} className="h-8 w-8 rounded-lg border">+</button><span className="text-[9px] font-mono text-neutral-500 ml-2">Arraste widgets e reordene dentro do Auto Layout</span></>}
        </div>
        {prototypeNotice ? <div className="shrink-0 px-3 py-2 bg-[#E9F7F4] text-[#165F57] text-[10px] border-b border-[#B7E4DB]">{prototypeNotice}</div> : null}
        <section className="flex-1 min-h-0 overflow-auto p-8 flex items-start justify-center">
          {frame ? <div className="relative shrink-0 mt-6" style={{ width: frameDisplayW, height: frameDisplayH }}>
            <div className="absolute -top-6 left-0 text-[9px] font-mono text-neutral-500">{frame.name} · {frame.width}×{frame.height}</div>
            <div
              onDragOver={e => { if (!prototypeMode) e.preventDefault(); }}
              onDrop={e => { if (prototypeMode) return; e.preventDefault(); try { dropBlock(null, frame.blocks.length, JSON.parse(e.dataTransfer.getData('text/plain'))); } catch { /* noop */ } }}
              onClick={() => !prototypeMode && setSelectedId(null)}
              style={{
                width: frame.width, minHeight: frame.height, transform: `scale(${renderedScale})`, transformOrigin: 'top left', background: frame.background, padding: frame.padding,
                gap: frame.layoutMode === 'grid' ? undefined : frame.gap, display: frame.layoutMode === 'grid' ? 'grid' : 'flex',
                gridTemplateColumns: frame.layoutMode === 'grid' ? `repeat(${Math.max(1, frame.gridColumns || 4)}, minmax(0,1fr))` : undefined,
                columnGap: frame.columnGap || frame.gap, rowGap: frame.rowGap || frame.gap, flexDirection: frame.direction,
                flexWrap: frame.wrap ? 'wrap' : 'nowrap', alignItems: frame.align === 'stretch' ? 'stretch' : frame.align === 'start' ? 'flex-start' : frame.align === 'end' ? 'flex-end' : 'center',
                justifyContent: frame.justify === 'center' ? 'center' : frame.justify === 'end' ? 'flex-end' : frame.justify === 'between' ? 'space-between' : 'flex-start',
                fontFamily: font(designSystem, 'text'), boxShadow: '0 12px 50px rgba(0,0,0,.14)', borderRadius: frame.preset === 'watch' ? 42 : 18, overflow: 'auto',
              }}
            >
              {frame.blocks.map((b, index) => <React.Fragment key={b.id}>
                
                <CanvasBlock index={index} direction={frame.direction} block={b} ds={designSystem} selectedId={selectedId} prototype={prototypeMode} onSelect={id => { setSelectedId(id); setMobilePane('inspector'); }} onDrop={dropBlock} onRun={runInteraction} />
              </React.Fragment>)}
              
              {!prototypeMode && !frame.blocks.length ? <div className="min-h-32 flex flex-col items-center justify-center text-neutral-400 text-[11px]"><GripVertical size={24} /><span className="mt-2">Arraste um item da lateral esquerda</span></div> : null}
            </div>
          </div> : null}
        </section>
      </main>
      <div className={`${mobilePane === 'inspector' ? 'block' : 'hidden'} lg:block h-full min-h-0`}>{InspectorPane}</div>
    </ResizableStudioGrid>
  </div>;
}

function TreeItem({ block, depth, parentId, selectedId, onSelect, onDropAt, index }: { block: WireframeBlock; depth: number; parentId: string | null; selectedId: string | null; onSelect: (id: string) => void; onDropAt: (parentId: string | null, index: number, payload: DragPayload) => void; index: number }) {
  const [over, setOver] = useState(false);
  return <div>
    <button
      draggable
      onDragStart={e => { e.stopPropagation(); e.dataTransfer.setData('text/plain', JSON.stringify({ kind: 'block', id: block.id } satisfies DragPayload)); e.dataTransfer.effectAllowed = 'move'; }}
      onDragOver={e => { e.preventDefault(); e.stopPropagation(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); e.stopPropagation(); setOver(false); try { const payload = JSON.parse(e.dataTransfer.getData('text/plain')) as DragPayload; const rect=e.currentTarget.getBoundingClientRect(); const fraction=(e.clientY-rect.top)/rect.height; const inside=isContainer(block)&&fraction>.25&&fraction<.75; onDropAt(inside ? block.id : parentId, inside ? blockChildren(block).length : index+(fraction>.5?1:0), payload); } catch { /* noop */ } }}
      onClick={() => onSelect(block.id)}
      className={`w-full rounded-lg min-h-8 px-2 flex items-center gap-2 text-left text-[9px] transition ${selectedId === block.id ? 'bg-black text-white' : over ? 'bg-[#DDF4EF] outline outline-1 outline-[#20867C]' : 'hover:bg-neutral-100'}`}
      style={{ paddingLeft: 8 + depth * 14 }}
      title={isContainer(block) ? 'Solte aqui para mover o item para dentro deste Auto Layout' : 'Arraste para reordenar'}
    ><GripVertical size={11} className="opacity-50 cursor-grab" /><span className="font-mono opacity-50">{index + 1}</span><span className="truncate">{block.label}</span><small className="ml-auto opacity-50">{block.type}</small></button>
    {block.children?.map((child, childIndex) => <TreeItem key={child.id} block={child} depth={depth + 1} parentId={block.id} selectedId={selectedId} onSelect={onSelect} onDropAt={onDropAt} index={childIndex} />)}
  </div>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <label className="text-[9px] font-mono">{label}<input type="number" value={Number.isFinite(value) ? value : 0} onChange={e => onChange(Number(e.target.value) || 0)} className="mt-1 h-9 w-full border rounded-lg px-2" /></label>;
}
