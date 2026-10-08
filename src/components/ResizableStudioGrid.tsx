import React, { useMemo, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';

type StudioGridMode = 'ratio' | 'balanced' | 'sidebar' | 'three-pane';

type Props = {
  children: React.ReactNode;
  storageKey: string;
  defaults?: number[];
  className?: string;
  mode?: StudioGridMode;
  sidebarPixels?: number[];
};

const clamp = (value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));

/**
 * Shared resizable split for studio editors.
 *
 * Desktop presets intentionally avoid percentage-based sidebars for authoring tools:
 * - sidebar: compact tool rail + flexible canvas
 * - three-pane: compact library + flexible canvas + compact inspector
 * - balanced/ratio: proportional panes for genuinely symmetric workspaces
 *
 * On smaller screens the panes remain stacked/toggled by each studio's own mobile UI.
 */
export default function ResizableStudioGrid({
  children,
  storageKey,
  defaults = [26, 48, 26],
  className = '',
  mode = 'ratio',
  sidebarPixels,
}: Props) {
  const panes = React.Children.toArray(children);
  const root = useRef<HTMLDivElement>(null);
  const isThree = mode === 'three-pane' && panes.length === 3;
  const isSidebar = mode === 'sidebar' && panes.length === 2;
  const pixelDefaults = useMemo(() => {
    if (isThree) return sidebarPixels?.length === 2 ? sidebarPixels : [320, 340];
    if (isSidebar) return sidebarPixels?.length ? [sidebarPixels[0]] : [360];
    return [];
  }, [isThree, isSidebar, sidebarPixels]);

  const [sizes, setSizes] = useState<number[]>(() => {
    try {
      const value = JSON.parse(localStorage.getItem(`${storageKey}:v2`) || 'null');
      if (Array.isArray(value)) {
        if ((isThree && value.length === 2) || (isSidebar && value.length === 1)) return value.map(Number);
        if (!isThree && !isSidebar && value.length === defaults.length && value.every(n => Number.isFinite(n) && n >= 12) && Math.abs(value.reduce((a,b)=>a+b,0)-100)<1) return value;
      }
    } catch { /* local persistence is optional */ }
    return (isThree || isSidebar) ? pixelDefaults : defaults;
  });

  const persist = (next:number[]) => {
    setSizes(next);
    try { localStorage.setItem(`${storageKey}:v2`, JSON.stringify(next)); } catch { /* optional */ }
  };

  const columns = useMemo(() => {
    if (panes.length === 1) return 'minmax(0,1fr)';
    if (isThree) {
      const left = clamp(Number(sizes[0]) || pixelDefaults[0], 260, 440);
      const right = clamp(Number(sizes[1]) || pixelDefaults[1], 300, 460);
      return `${left}px 14px minmax(360px,1fr) 14px ${right}px`;
    }
    if (isSidebar) {
      const left = clamp(Number(sizes[0]) || pixelDefaults[0], 280, 520);
      return `${left}px 14px minmax(360px,1fr)`;
    }
    return sizes.map(n=>`minmax(0,${n}fr)`).join(' 14px ');
  }, [panes.length, isThree, isSidebar, sizes, pixelDefaults]);

  const updateRatio = (index:number, delta:number, initial = sizes) => {
    const next = [...initial];
    const change = Math.max(12-next[index], Math.min(next[index+1]-12, delta));
    next[index] += change; next[index+1] -= change; persist(next);
  };

  const updatePixels = (dividerIndex:number, deltaPx:number, initial = sizes) => {
    if (isThree) {
      const next = [...initial];
      if (dividerIndex === 0) next[0] = clamp((initial[0] || pixelDefaults[0]) + deltaPx, 260, 440);
      else next[1] = clamp((initial[1] || pixelDefaults[1]) - deltaPx, 300, 460);
      persist(next);
      return;
    }
    if (isSidebar) persist([clamp((initial[0] || pixelDefaults[0]) + deltaPx, 280, 520)]);
  };

  const reset = () => {
    const next = (isThree || isSidebar) ? pixelDefaults : defaults;
    setSizes(next);
    try { localStorage.removeItem(`${storageKey}:v2`); } catch { /* optional */ }
  };

  return <div
    ref={root}
    className={`resizable-studio-grid ${className}`}
    data-grid-mode={isThree ? 'three-pane' : isSidebar ? 'sidebar' : mode}
    style={{'--studio-columns': columns} as React.CSSProperties}
  >
    <button type="button" className="studio-grid-ai-image-button" onClick={()=>window.dispatchEvent(new CustomEvent('5is:open-ai-image'))} title="Gerar imagem com IA e salvar na Biblioteca do Projeto"><Sparkles size={14}/><span>IA IMAGEM</span></button>
    {panes.map((pane,index)=><React.Fragment key={index}>{pane}{index < panes.length-1 && <div
      className="studio-grid-divider studio-resize-handle"
      role="separator"
      tabIndex={0}
      aria-label="Arraste para redimensionar o painel"
      aria-orientation="vertical"
      onDoubleClick={reset}
      onKeyDown={e=>{
        if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight') return;
        e.preventDefault();
        const delta = e.key==='ArrowLeft' ? -20 : 20;
        if (isThree || isSidebar) updatePixels(index, delta);
        else updateRatio(index, delta/10);
      }}
      onPointerDown={e=>{
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const start=e.clientX, initial=[...sizes], width=root.current?.clientWidth||1, el=e.currentTarget;
        document.body.classList.add('studio-is-resizing');
        const move=(ev:PointerEvent)=>{
          if (isThree || isSidebar) updatePixels(index, ev.clientX-start, initial);
          else updateRatio(index,(ev.clientX-start)/width*100,initial);
        };
        const end=()=>{
          document.body.classList.remove('studio-is-resizing');
          el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);
        };
        el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
      }}
    ><span/></div>}</React.Fragment>)}
  </div>;
}
