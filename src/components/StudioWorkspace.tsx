import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, PanelLeftOpen } from 'lucide-react';

const clampRatio = (value: number) => Math.max(24, Math.min(76, value));
const readStoredRatio = (key: string, fallback: number) => {
  if (typeof window === 'undefined') return fallback;
  const raw = Number(window.localStorage.getItem(key));
  return Number.isFinite(raw) ? clampRatio(raw) : fallback;
};

/**
 * Shared editor layout.
 * - Desktop: ferramentas e visual podem ser redimensionados horizontalmente.
 * - Mobile/tablet: ferramentas e visual podem ser redimensionados verticalmente.
 * - O painel pode ser recolhido sem desmontar os controles, preservando o estado.
 */
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
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches);
  const [desktopRatio, setDesktopRatio] = useState(() => readStoredRatio('studio-workspace:desktop-ratio', 50));
  const [mobileRatio, setMobileRatio] = useState(() => readStoredRatio('studio-workspace:mobile-ratio', 42));
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobile(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('studio-workspace:desktop-ratio', String(desktopRatio));
  }, [desktopRatio]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('studio-workspace:mobile-ratio', String(mobileRatio));
  }, [mobileRatio]);

  const setActiveRatio = (value: number) => {
    if (isMobile) setMobileRatio(clampRatio(value));
    else setDesktopRatio(clampRatio(value));
  };

  const beginResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (split !== 'equal' || !open) return;
    event.preventDefault();
    const box = rootRef.current?.getBoundingClientRect();
    if (!box) return;
    const mobileNow = window.matchMedia('(max-width: 1023px)').matches;
    const move = (ev: PointerEvent) => {
      const next = mobileNow
        ? ((ev.clientY - box.top) / box.height) * 100
        : ((ev.clientX - box.left) / box.width) * 100;
      if (mobileNow) setMobileRatio(clampRatio(next));
      else setDesktopRatio(clampRatio(next));
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('studio-is-resizing');
    };
    document.body.classList.add('studio-is-resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const nudge = (delta: number) => setActiveRatio((isMobile ? mobileRatio : desktopRatio) + delta);
  const resetRatio = () => setActiveRatio(isMobile ? 42 : 50);

  return <div
    ref={rootRef}
    className={`studio-workspace ${open ? 'is-open' : ''} ${split === 'equal' ? 'studio-workspace--equal' : ''}`}
    style={split === 'equal' ? ({
      '--studio-tools-ratio-desktop': `${desktopRatio}%`,
      '--studio-tools-ratio-mobile': `${mobileRatio}%`,
    } as React.CSSProperties) : undefined}
  >
    <aside className="studio-sidebar" aria-label="Ferramentas e edição">
      <button
        type="button"
        className="studio-panel-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        title={open ? 'Recolher ferramentas' : 'Abrir ferramentas'}
      >
        {open ? <ChevronLeft size={18}/> : <PanelLeftOpen size={18}/>}<span>{open ? 'Ferramentas e edição' : 'Ferramentas'}</span>
      </button>
      <div id={panelId} className="studio-tools" hidden={!open}>{tools}</div>
    </aside>

    {split === 'equal' && open ? <div
      className="studio-resize-handle"
      role="separator"
      aria-orientation={isMobile ? 'horizontal' : 'vertical'}
      aria-label="Redimensionar ferramentas e visual"
      aria-valuemin={24}
      aria-valuemax={76}
      aria-valuenow={Math.round(isMobile ? mobileRatio : desktopRatio)}
      tabIndex={0}
      onPointerDown={beginResize}
      onDoubleClick={resetRatio}
      onKeyDown={(event) => {
        if ((!isMobile && event.key === 'ArrowLeft') || (isMobile && event.key === 'ArrowUp')) { event.preventDefault(); nudge(-4); }
        if ((!isMobile && event.key === 'ArrowRight') || (isMobile && event.key === 'ArrowDown')) { event.preventDefault(); nudge(4); }
        if (event.key === 'Home') { event.preventDefault(); setActiveRatio(24); }
        if (event.key === 'End') { event.preventDefault(); setActiveRatio(76); }
      }}
      title="Arraste para ajustar. Duplo clique restaura a proporção inicial."
    ><span/><i>arraste</i></div> : null}

    <div className="studio-preview">{children}</div>
  </div>;
}

