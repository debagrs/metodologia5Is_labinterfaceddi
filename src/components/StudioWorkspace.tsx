import React, { useId, useRef, useState } from 'react';
import { ChevronLeft, PanelLeftOpen } from 'lucide-react';

/** Shared editor layout. Collapsing keeps controls mounted and preserves their state. */
export function StudioWorkspace({
  tools,
  children,
  split = 'default',
}: {
  tools: React.ReactNode;
  children: React.ReactNode;
  split?: 'default' | 'equal';
}) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches);
  const [ratio, setRatio] = useState(50);
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (split !== 'equal' || !open || window.matchMedia('(max-width: 1023px)').matches) return;
    event.preventDefault();
    const box = rootRef.current?.getBoundingClientRect();
    if (!box) return;
    const move = (ev: PointerEvent) => {
      const next = ((ev.clientX - box.left) / box.width) * 100;
      setRatio(Math.max(28, Math.min(72, next)));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const nudge = (delta: number) => setRatio(value => Math.max(28, Math.min(72, value + delta)));

  return <div ref={rootRef} className={`studio-workspace ${open ? 'is-open' : ''} ${split === 'equal' ? 'studio-workspace--equal' : ''}`} style={split === 'equal' ? ({ '--studio-tools-ratio': `${ratio}%` } as React.CSSProperties) : undefined}>
    <aside className="studio-sidebar" aria-label="Ferramentas e edição">
      <button type="button" className="studio-panel-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} title={open ? 'Recolher ferramentas' : 'Abrir ferramentas'}>
        {open ? <ChevronLeft size={18}/> : <PanelLeftOpen size={18}/>}<span>{open ? 'Ferramentas e edição' : 'Ferramentas'}</span>
      </button>
      <div id={panelId} className="studio-tools" hidden={!open}>{tools}</div>
    </aside>
    {split === 'equal' && open ? <div className="studio-resize-handle" role="separator" aria-orientation="vertical" aria-label="Redimensionar ferramentas e visual" tabIndex={0} onPointerDown={beginResize} onKeyDown={(event) => { if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(-4); } if (event.key === 'ArrowRight') { event.preventDefault(); nudge(4); } }} title="Arraste para ajustar ferramentas e visual"><span/></div> : null}
    <div className="studio-preview">{children}</div>
  </div>;
}
