import React, { useId, useState } from 'react';
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
  const panelId = useId();
  return <div className={`studio-workspace ${open ? 'is-open' : ''} ${split === 'equal' ? 'studio-workspace--equal' : ''}`}>
    <aside className="studio-sidebar" aria-label="Ferramentas e edição">
      <button type="button" className="studio-panel-toggle" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen(!open)} title={open ? 'Recolher ferramentas' : 'Abrir ferramentas'}>
        {open ? <ChevronLeft size={18}/> : <PanelLeftOpen size={18}/>}<span>{open ? 'Ferramentas e edição' : 'Ferramentas'}</span>
      </button>
      <div id={panelId} className="studio-tools" hidden={!open}>{tools}</div>
    </aside>
    <div className="studio-preview">{children}</div>
  </div>;
}
