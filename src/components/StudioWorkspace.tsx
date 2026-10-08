import React, { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, PanelLeftOpen, Sparkles } from 'lucide-react';

const clampWidth = (value:number, split:'default'|'equal') => split === 'equal'
  ? Math.max(320, Math.min(620, value))
  : Math.max(280, Math.min(500, value));
const clampMobile = (value:number)=>Math.max(24,Math.min(72,value));

/** Shared editor shell: compact/resizable tools + canvas that always receives the remainder. */
export function StudioWorkspace({ tools, children, split = 'default' }: {
  tools: React.ReactNode;
  children: React.ReactNode;
  split?: 'default' | 'equal';
}) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches);
  const [desktopWidth, setDesktopWidth] = useState(() => {
    if (typeof window === 'undefined') return split === 'equal' ? 420 : 360;
    const raw=Number(window.localStorage.getItem(`studio-workspace:${split}:desktop-width:v2`));
    return Number.isFinite(raw)&&raw>0 ? clampWidth(raw,split) : (split === 'equal' ? 420 : 360);
  });
  const [mobileRatio, setMobileRatio] = useState(() => {
    if (typeof window === 'undefined') return 42;
    const raw=Number(window.localStorage.getItem('studio-workspace:mobile-ratio:v2'));
    return Number.isFinite(raw)&&raw>0 ? clampMobile(raw) : 42;
  });
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobile(media.matches);
    sync(); media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);
  useEffect(()=>{ try{window.localStorage.setItem(`studio-workspace:${split}:desktop-width:v2`,String(desktopWidth));}catch{} },[desktopWidth,split]);
  useEffect(()=>{ try{window.localStorage.setItem('studio-workspace:mobile-ratio:v2',String(mobileRatio));}catch{} },[mobileRatio]);

  const beginResize=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(!open)return; event.preventDefault();
    const box=rootRef.current?.getBoundingClientRect(); if(!box)return;
    const mobileNow=window.matchMedia('(max-width: 1023px)').matches;
    document.body.classList.add('studio-is-resizing');
    const move=(ev:PointerEvent)=> mobileNow
      ? setMobileRatio(clampMobile(((ev.clientY-box.top)/box.height)*100))
      : setDesktopWidth(clampWidth(ev.clientX-box.left,split));
    const up=()=>{document.body.classList.remove('studio-is-resizing');window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up)};
    window.addEventListener('pointermove',move);window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);
  };
  const reset=()=> isMobile ? setMobileRatio(42) : setDesktopWidth(split==='equal'?420:360);

  return <div ref={rootRef} className={`studio-workspace ${open?'is-open':''} studio-workspace--${split}`} style={{'--studio-tools-width':`${desktopWidth}px`,'--studio-tools-ratio-mobile':`${mobileRatio}%`} as React.CSSProperties}>
    <aside className="studio-sidebar" aria-label="Ferramentas e edição">
      <div className="studio-sidebar-toolbar">
        <button type="button" className="studio-panel-toggle" aria-expanded={open} aria-controls={panelId} onClick={()=>setOpen(!open)} title={open?'Recolher ferramentas':'Abrir ferramentas'}>
          {open?<ChevronLeft size={18}/>:<PanelLeftOpen size={18}/>}<span>{open?'Ferramentas e edição':'Ferramentas'}</span>
        </button>
        <button type="button" className="studio-ai-image-button" onClick={()=>window.dispatchEvent(new CustomEvent('5is:open-ai-image'))} title="Gerar imagem com IA e salvar na Biblioteca do Projeto"><Sparkles size={15}/><span>IA IMAGEM</span></button>
      </div>
      <div id={panelId} className="studio-tools" hidden={!open}>{tools}</div>
    </aside>
    {open?<div className="studio-resize-handle" role="separator" aria-orientation={isMobile?'horizontal':'vertical'} aria-label="Redimensionar ferramentas e visual" tabIndex={0} onPointerDown={beginResize} onDoubleClick={reset} onKeyDown={e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();
      if(isMobile)setMobileRatio(v=>clampMobile(v+(e.key==='ArrowDown'||e.key==='ArrowRight'?4:-4)));
      else setDesktopWidth(v=>clampWidth(v+(e.key==='ArrowRight'||e.key==='ArrowDown'?24:-24),split));
    }} title="Arraste para ajustar. Duplo clique restaura a largura."><span/><i>arraste</i></div>:null}
    <div className="studio-preview">{children}</div>
  </div>;
}
