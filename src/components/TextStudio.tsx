import React, { useMemo, useState } from 'react';
import { X, Save, PenTool, Type, Baseline, Grid3X3, Sparkles } from 'lucide-react';
import type { DesignSystemDocument, TextPracticeMode, TextStudioDocument } from '../types';
import { StudioWorkspace } from './StudioWorkspace';
import { FontPicker, useGraphicFonts } from '../lib/graphicFonts';

export const blankTextStudio = (ds?: DesignSystemDocument): TextStudioDocument => ({
  title: 'Estudo de texto', mode: 'calligraphy', text: 'Forma, gesto e voz',
  fontFamily: ds?.fontFamilies?.display || ds?.primaryFont || 'Inter', fontSize: 72, fontWeight: 500,
  lineHeight: 1.05, letterSpacing: 0, color: '#111111', background: '#F7F5F0', align: 'center',
  tool: 'broad-nib', nibAngle: 35, pressure: 70, slant: 8, guides: true, notes: ''
});

const modes: Array<{id:TextPracticeMode;label:string;hint:string}> = [
  {id:'calligraphy',label:'Caligrafia',hint:'gesto + instrumento'},
  {id:'lettering',label:'Lettering',hint:'letra desenhada'},
  {id:'typography',label:'Tipografia',hint:'famílias + sistema'},
  {id:'type-design',label:'Design de tipos',hint:'glifos + métricas'},
];

export function TextStudioPreview({document}:{document:TextStudioDocument}){
  const style = useMemo(()=>({fontFamily:document.fontFamily,fontSize:`${Math.max(18,Math.min(72,document.fontSize*.55))}px`,fontWeight:document.fontWeight,lineHeight:document.lineHeight,letterSpacing:`${document.letterSpacing}px`,color:document.color,textAlign:document.align as any,transform:`skewX(${-document.slant*.15}deg)`}),[document]);
  return <div className="w-full h-full flex items-center justify-center overflow-hidden p-4" style={{background:document.background}}><div className="max-w-full break-words" style={style}>{document.text}</div></div>;
}

export default function TextStudio({document,title,canEdit,onSave,onClose}:{document:TextStudioDocument;title:string;canEdit:boolean;onSave:(d:TextStudioDocument)=>void;onClose:()=>void}){
  const [d,setD]=useState(document); const patch=(x:Partial<TextStudioDocument>)=>setD(v=>({...v,...x}));
  useGraphicFonts([d.fontFamily]);
  return <div className="fixed inset-0 z-[150] bg-[#F4F2ED] atelier-shell flex flex-col" role="dialog" aria-modal="true" aria-label="Ateliê de textos">
    <header className="atelier-header"><button onClick={onClose} aria-label="Fechar"><X/></button><div><b>{title}</b><small>CALIGRAFIA · LETTERING · TIPOGRAFIA · DESIGN DE TIPOS</small></div><button className="studio-save" disabled={!canEdit} onClick={()=>{onSave({...d,updatedAt:new Date().toISOString()});onClose();}}><Save size={16}/> SALVAR</button></header>
    <StudioWorkspace tools={<div className="text-studio-panel text-studio-panel--embedded">
        <h3>Textos</h3><p>Do gesto caligráfico ao sistema tipográfico. O que for criado aqui pode ser reutilizado no projeto.</p>
        <div className="text-mode-grid">{modes.map(m=><button key={m.id} className={d.mode===m.id?'active':''} onClick={()=>patch({mode:m.id})}><span>{m.id==='calligraphy'?<PenTool/>:m.id==='typography'?<Type/>:m.id==='type-design'?<Grid3X3/>:<Baseline/>}</span><b>{m.label}</b><small>{m.hint}</small></button>)}</div>
        <label>TEXTO<textarea value={d.text} onChange={e=>patch({text:e.target.value})}/></label>
        <label>FAMÍLIA<div className="mt-1"><FontPicker value={d.fontFamily} onChange={fontFamily=>patch({fontFamily})} previewText={d.text || 'Aa Bb Cc 0123 · Forma, gesto e voz'} /></div></label>
        <div className="studio-two"><label>TAMANHO<input type="number" min="8" max="240" value={d.fontSize} onChange={e=>patch({fontSize:+e.target.value})}/></label><label>PESO<input type="number" min="100" max="900" step="100" value={d.fontWeight} onChange={e=>patch({fontWeight:+e.target.value})}/></label></div>
        <div className="studio-two"><label>COR<input type="color" value={d.color} onChange={e=>patch({color:e.target.value})}/></label><label>FUNDO<input type="color" value={d.background} onChange={e=>patch({background:e.target.value})}/></label></div>
        {(d.mode==='calligraphy'||d.mode==='lettering')&&<><label>INSTRUMENTO<select value={d.tool} onChange={e=>patch({tool:e.target.value as any})}><option value="broad-nib">Pena chata</option><option value="pointed-pen">Pena pontuda</option><option value="brush">Brush pen</option><option value="monoline">Monolinear</option><option value="pencil">Lápis</option></select></label><label>ÂNGULO DA PENA · {d.nibAngle}°<input type="range" min="0" max="90" value={d.nibAngle} onChange={e=>patch({nibAngle:+e.target.value})}/></label><label>PRESSÃO · {d.pressure}%<input type="range" min="0" max="100" value={d.pressure} onChange={e=>patch({pressure:+e.target.value})}/></label><label>INCLINAÇÃO · {d.slant}°<input type="range" min="-25" max="25" value={d.slant} onChange={e=>patch({slant:+e.target.value})}/></label></>}
        <button className="text-ai-button"><Sparkles size={15}/> + IA · explorar variações</button>
      </div>}>
      <main className="text-studio-canvas" style={{background:d.background}}>
        {d.guides&&<div className="calligraphy-guides"/>}<div className="text-live-preview" style={{fontFamily:d.fontFamily,fontSize:`clamp(36px,7vw,${d.fontSize}px)`,fontWeight:d.fontWeight,lineHeight:d.lineHeight,letterSpacing:d.letterSpacing,color:d.color,textAlign:d.align,transform:`skewX(${-d.slant*.15}deg)`}}>{d.text}</div>
      </main>
    </StudioWorkspace>
  </div>
}
