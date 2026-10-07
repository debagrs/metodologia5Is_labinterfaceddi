import React, { useRef, useState } from 'react';

/** Shared split for editors with two or three independent panes. */
export default function ResizableStudioGrid({children, storageKey, defaults = [26, 48, 26], className = ''}: {children: React.ReactNode; storageKey: string; defaults?: number[]; className?: string}) {
  const panes = React.Children.toArray(children);
  const root = useRef<HTMLDivElement>(null);
  const [sizes, setSizes] = useState<number[]>(() => {
    try { const value = JSON.parse(localStorage.getItem(storageKey) || 'null'); if (Array.isArray(value) && value.length === defaults.length && value.every(n => Number.isFinite(n) && n >= 12) && Math.abs(value.reduce((a,b)=>a+b,0)-100)<1) return value; } catch { /* local persistence is optional */ }
    return defaults;
  });
  const update = (index: number, delta: number, initial = sizes) => {
    const next = [...initial]; const change = Math.max(12-next[index], Math.min(next[index+1]-12, delta));
    next[index] += change; next[index+1] -= change; setSizes(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* optional */ }
  };
  return <div ref={root} className={`resizable-studio-grid ${className}`} style={{'--studio-columns': panes.length === 1 ? 'minmax(0,1fr)' : sizes.map(n=>`minmax(0,${n}fr)`).join(' 14px ')} as React.CSSProperties}>
    {panes.map((pane,index)=><React.Fragment key={index}>{pane}{index < panes.length-1 && <div className="studio-grid-divider studio-resize-handle" role="separator" tabIndex={0} aria-label="Arraste para redimensionar o painel" aria-orientation="vertical" aria-valuemin={12} aria-valuemax={sizes[index]+sizes[index+1]-12} aria-valuenow={Math.round(sizes[index])}
      onDoubleClick={()=>{setSizes(defaults);try {localStorage.removeItem(storageKey);}catch{}}}
      onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();update(index,e.key==='ArrowLeft'?-2:2);}}}
      onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId); const start=e.clientX, initial=[...sizes], width=root.current?.clientWidth||1; const el=e.currentTarget;
        const move=(ev:PointerEvent)=>update(index,(ev.clientX-start)/width*100,initial);
        const end=()=>{el.removeEventListener('pointermove',move);el.removeEventListener('pointerup',end);el.removeEventListener('pointercancel',end);};
        el.addEventListener('pointermove',move);el.addEventListener('pointerup',end);el.addEventListener('pointercancel',end);
      }}><span/></div>}</React.Fragment>)}
  </div>;
}
