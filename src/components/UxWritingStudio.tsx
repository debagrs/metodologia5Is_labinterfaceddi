import React, { useMemo, useState } from 'react';
import { Accessibility, Copy, Languages, Plus, Save, Sparkles, Trash2, X, Hand, Download, Check } from 'lucide-react';
import { Project, UXWritingDocument, UXWritingEntry, UXWritingTone, WireframeDocument } from '../types';
import { ensureTursoSession } from '../lib/turso';
import VoiceDictationButton from './VoiceDictationButton';

interface Props {
  document: UXWritingDocument;
  project: Project;
  title?: string;
  canEdit?: boolean;
  availableWireframes?: Array<{ id: string; name: string; wireframe: WireframeDocument }>;
  onSave: (document: UXWritingDocument) => void;
  onClose: () => void;
}

const makeId = () => `ux-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const LANGUAGE_PRESETS = [
  ['en-US', 'English'], ['es-ES', 'Español'], ['fr-FR', 'Français'], ['de-DE', 'Deutsch'], ['it-IT', 'Italiano'], ['ja-JP', '日本語'], ['zh-CN', '中文']
];
const TONES: Array<{ id: UXWritingTone; label: string }> = [
  { id: 'clear', label: 'Clara' }, { id: 'warm', label: 'Acolhedora' }, { id: 'direct', label: 'Direta' }, { id: 'institutional', label: 'Institucional' }, { id: 'playful', label: 'Lúdica' },
];

export const blankUXWriting = (): UXWritingDocument => ({
  title: 'UX Writing do projeto',
  sourceLocale: 'pt-BR',
  targetLocales: ['en-US', 'es-ES'],
  glossary: [],
  entries: [{
    id: makeId(), key: 'home.title', screen: 'Home', context: 'Título principal da interface', sourceText: 'Escreva aqui o texto da interface.', tone: 'clear', translations: [],
  }],
});

export function UXWritingPreview({ document, className = '' }: { document: UXWritingDocument; className?: string }) {
  const items = document.entries.slice(0, 5);
  return <div className={`bg-white p-4 overflow-hidden ${className}`}>
    <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">UX WRITING · {document.entries.length} textos</div>
    <div className="mt-3 space-y-2">{items.map((entry)=><div key={entry.id} className="rounded-xl border border-black/10 p-2.5"><div className="text-[9px] font-mono text-neutral-400">{entry.key}</div><div className="text-xs font-semibold mt-1 line-clamp-2">{entry.accessibleText || entry.sourceText}</div></div>)}</div>
  </div>;
}

function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }

export default function UXWritingStudio({ document, project, title = 'UX Writing', canEdit = true, availableWireframes = [], onSave, onClose }: Props) {
  const [draft, setDraft] = useState<UXWritingDocument>(() => clone(document));
  const [selectedId, setSelectedId] = useState(draft.entries[0]?.id || '');
  const [targetLocale, setTargetLocale] = useState('en-US');
  const [customLocale, setCustomLocale] = useState('');
  const [assistantPrompt, setAssistantPrompt] = useState('');
  const [loading, setLoading] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const selected = useMemo(() => draft.entries.find((item)=>item.id===selectedId) || draft.entries[0], [draft, selectedId]);

  const patchEntry = (patch: Partial<UXWritingEntry>) => {
    if (!selected) return;
    setDraft((current)=>({...current, entries: current.entries.map((item)=>item.id===selected.id?{...item,...patch}:item), updatedAt:new Date().toISOString()}));
  };
  const addEntry = () => {
    const entry: UXWritingEntry = { id: makeId(), key:`text.${draft.entries.length+1}`, screen:'Nova tela', context:'', sourceText:'', tone:'clear', translations:[] };
    setDraft((current)=>({...current,entries:[...current.entries,entry]})); setSelectedId(entry.id);
  };
  const removeEntry = () => {
    if (!selected || draft.entries.length <= 1) return;
    const next = draft.entries.filter((item)=>item.id!==selected.id); setDraft({...draft,entries:next}); setSelectedId(next[0]?.id||'');
  };

  const importWireframeTexts = () => {
    const existing = new Set(draft.entries.map((entry)=>`${entry.screen}::${entry.sourceText}`.toLowerCase()));
    const imported: UXWritingEntry[] = [];
    availableWireframes.forEach((source) => source.wireframe.frames.forEach((frame) => frame.blocks.forEach((block, index) => {
      const text = String(block.label || '').trim();
      if (!text || block.type === 'image' || block.type === 'spacer') return;
      const signature = `${frame.name}::${text}`.toLowerCase();
      if (existing.has(signature)) return;
      existing.add(signature);
      imported.push({ id: makeId(), key: `${frame.name}.${block.type}.${index + 1}`.toLowerCase().replace(/[^a-z0-9.]+/g, '-'), screen: frame.name, context: `${block.type} importado de ${source.name}`, sourceText: text, tone: 'clear', translations: [] });
    })));
    if (!imported.length) { setError('Não encontrei novos textos nos wireframes do projeto.'); return; }
    setDraft((current)=>({...current, entries:[...current.entries,...imported], updatedAt:new Date().toISOString()}));
    setSelectedId(imported[0].id);
  };

  const runAssistant = async (action: 'accessible'|'translate'|'libras'|'variants'|'rewrite') => {
    if (!selected) return;
    const base = selected.accessibleText || selected.sourceText;
    if (!base.trim()) { setError('Escreva primeiro o texto que será trabalhado.'); return; }
    setLoading(action); setError('');
    try {
      const session = await ensureTursoSession().catch(()=>null);
      const locale = action === 'translate' ? (customLocale.trim() || targetLocale) : '';
      const response = await fetch('/api/mediators/think', {
        method:'POST', headers:{'Content-Type':'application/json',...(session?.token?{Authorization:`Bearer ${session.token}`}:{})},
        body:JSON.stringify({
          mode:'ux-writing', project, phase:project.activePhase,
          uxWriting:{ action, sourceText:base, originalText:selected.sourceText, context:selected.context, screen:selected.screen, tone:selected.tone, sourceLocale:draft.sourceLocale, targetLocale:locale, prompt:assistantPrompt, glossary:draft.glossary }
        })
      });
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.uxWriting?.text) throw new Error(data.error || 'A IA não devolveu o texto.');
      const text = String(data.uxWriting.text);
      if (action === 'accessible') patchEntry({accessibleText:text});
      else if (action === 'libras') patchEntry({librasGuide:text, notes:[selected.notes, ...(data.uxWriting.notes||[])].filter(Boolean).join('\n')});
      else if (action === 'translate') {
        const label = LANGUAGE_PRESETS.find(([id])=>id===locale)?.[1] || locale;
        patchEntry({translations:[...selected.translations.filter((item)=>item.locale!==locale),{locale,label,text,status:'draft'}]});
        setDraft((current)=>({...current,targetLocales:Array.from(new Set([...current.targetLocales,locale]))}));
      } else patchEntry({sourceText:text});
    } catch (cause:any) { setError(cause?.message || 'Não foi possível trabalhar o texto.'); }
    finally { setLoading(''); }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=window.document.createElement('a'); a.href=url; a.download='ux-writing-5is.json'; a.click(); URL.revokeObjectURL(url);
  };
  const copyText = async () => { if(!selected)return; await navigator.clipboard.writeText(selected.accessibleText||selected.sourceText); setCopied(true); setTimeout(()=>setCopied(false),1200); };

  return <div className="fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col canvas-control" onPointerDown={(e)=>e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b border-black/10 px-3 sm:px-5 flex items-center gap-3" style={{paddingTop:'max(.35rem,env(safe-area-inset-top))'}}>
      <button type="button" onClick={onClose} className="h-11 w-11 rounded-xl hover:bg-black/5 flex items-center justify-center" aria-label="Fechar UX Writing"><X size={19}/></button>
      <div className="min-w-0 flex-1"><div className="font-bold truncate">{title}</div><div className="text-[10px] font-mono text-neutral-500 uppercase">microcopy · linguagem simples · idiomas · apoio para Libras</div></div>
      <button type="button" onClick={exportJson} className="hidden sm:flex h-11 px-3 rounded-xl border border-black/10 items-center gap-2 text-[10px] font-mono"><Download size={14}/> JSON</button>
      <button type="button" disabled={!canEdit} onClick={()=>onSave({...draft,updatedAt:new Date().toISOString()})} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15}/> SALVAR</button>
    </header>
    <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[270px_minmax(0,1fr)_360px]">
      <aside className="min-h-0 overflow-y-auto bg-white border-b lg:border-b-0 lg:border-r border-black/10 p-3">
        <button type="button" onClick={addEntry} disabled={!canEdit} className="w-full h-11 rounded-xl bg-black text-white flex items-center justify-center gap-2 text-xs font-bold"><Plus size={15}/> NOVO TEXTO</button>
        {availableWireframes.length>0&&<button type="button" onClick={importWireframeTexts} disabled={!canEdit} className="mt-2 w-full min-h-10 rounded-xl border border-black flex items-center justify-center gap-2 px-2 text-[9px] font-mono font-bold"><Sparkles size={13}/> IMPORTAR TEXTOS DOS WIREFRAMES</button>}
        <div className="mt-3 space-y-2">{draft.entries.map((entry)=><button key={entry.id} type="button" onClick={()=>setSelectedId(entry.id)} className={`w-full rounded-xl border p-3 text-left ${selected?.id===entry.id?'border-black bg-[#F4F4F1]':'border-black/10 bg-white'}`}><div className="text-[9px] font-mono text-neutral-400 truncate">{entry.screen} · {entry.key}</div><div className="mt-1 text-xs font-semibold line-clamp-2">{entry.sourceText||'Texto vazio'}</div></button>)}</div>
      </aside>
      <section className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
        {selected && <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="text-[9px] font-mono text-neutral-500">CHAVE<input value={selected.key} onChange={(e)=>patchEntry({key:e.target.value})} className="mt-1 h-11 w-full rounded-xl border border-black/10 px-3 text-sm"/></label><label className="text-[9px] font-mono text-neutral-500">TELA / CONTEXTO<input value={selected.screen} onChange={(e)=>patchEntry({screen:e.target.value})} className="mt-1 h-11 w-full rounded-xl border border-black/10 px-3 text-sm"/></label></div>
          <label className="block text-[9px] font-mono text-neutral-500">ONDE / QUANDO ESTE TEXTO APARECE<textarea value={selected.context} onChange={(e)=>patchEntry({context:e.target.value})} className="mt-1 min-h-20 w-full rounded-xl border border-black/10 p-3 text-sm"/></label>
          <div className="rounded-2xl border-2 border-black bg-white p-4"><div className="flex items-center justify-between gap-2"><div className="text-sm font-bold">Texto da interface</div><VoiceDictationButton disabled={!canEdit} locale={draft.sourceLocale} onText={(text)=>patchEntry({sourceText:`${selected.sourceText}${selected.sourceText&&!selected.sourceText.endsWith(' ')?' ':''}${text}`})}/></div><textarea value={selected.sourceText} onChange={(e)=>patchEntry({sourceText:e.target.value})} className="mt-2 min-h-32 w-full rounded-xl border border-black/10 p-3 text-base" placeholder="Ex.: Não encontramos resultados. Tente outro termo."/><div className="mt-3 flex flex-wrap gap-2">{TONES.map((tone)=><button key={tone.id} type="button" onClick={()=>patchEntry({tone:tone.id})} className={`h-9 px-3 rounded-full border text-[10px] font-bold ${selected.tone===tone.id?'bg-black text-white border-black':'border-black/10'}`}>{tone.label}</button>)}</div></div>
          <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="flex items-center justify-between"><div className="font-bold text-sm flex items-center gap-2"><Accessibility size={16}/> Linguagem acessível</div><button type="button" disabled={!!loading} onClick={()=>void runAssistant('accessible')} className="h-9 px-3 rounded-xl bg-black text-white text-[10px] font-bold">{loading==='accessible'?'REESCREVENDO…':'SIMPLIFICAR'}</button></div><textarea value={selected.accessibleText||''} onChange={(e)=>patchEntry({accessibleText:e.target.value})} placeholder="Versão em linguagem simples…" className="mt-3 min-h-24 w-full rounded-xl border border-black/10 p-3 text-sm"/><button type="button" onClick={copyText} className="mt-2 h-9 px-3 rounded-xl border border-black/10 text-[10px] font-mono flex items-center gap-2">{copied?<Check size={13}/>:<Copy size={13}/>} {copied?'COPIADO':'COPIAR'}</button></div>
          <div className="rounded-2xl border border-black/10 bg-white p-4"><div className="font-bold text-sm flex items-center gap-2"><Languages size={16}/> Traduções</div><div className="mt-3 flex gap-2"><select value={targetLocale} onChange={(e)=>setTargetLocale(e.target.value)} className="h-10 rounded-xl border border-black/10 px-3 text-xs">{LANGUAGE_PRESETS.map(([id,label])=><option key={id} value={id}>{label}</option>)}</select><input value={customLocale} onChange={(e)=>setCustomLocale(e.target.value)} placeholder="ou locale: pt-PT" className="h-10 min-w-0 flex-1 rounded-xl border border-black/10 px-3 text-xs"/><button type="button" disabled={!!loading} onClick={()=>void runAssistant('translate')} className="h-10 px-3 rounded-xl bg-black text-white text-[10px] font-bold">TRADUZIR</button></div><div className="mt-3 space-y-2">{selected.translations.map((item)=><label key={item.locale} className="block text-[9px] font-mono text-neutral-500">{item.label} · {item.locale}<textarea value={item.text} onChange={(e)=>patchEntry({translations:selected.translations.map((tr)=>tr.locale===item.locale?{...tr,text:e.target.value}:tr)})} className="mt-1 min-h-20 w-full rounded-xl border border-black/10 p-3 text-sm font-sans"/></label>)}</div></div>
          <div className="rounded-2xl border border-[#9A65D6]/40 bg-[#F7F0FF] p-4"><div className="flex items-center justify-between gap-2"><div className="font-bold text-sm flex items-center gap-2"><Hand size={16}/> Apoio para Libras</div><button type="button" disabled={!!loading} onClick={()=>void runAssistant('libras')} className="h-9 px-3 rounded-xl bg-black text-white text-[10px] font-bold">GERAR ROTEIRO</button></div><p className="mt-2 text-[10px] leading-relaxed text-neutral-600">Gera um roteiro/glosa indicativa para apoiar produção em Libras. Não é tradução final: valide com pessoa tradutora/intérprete de Libras ou motor especializado.</p><textarea value={selected.librasGuide||''} onChange={(e)=>patchEntry({librasGuide:e.target.value})} className="mt-3 min-h-28 w-full rounded-xl border border-black/10 bg-white p-3 text-sm" placeholder="Roteiro/glosa de apoio…"/><input value={selected.librasVideoUrl||''} onChange={(e)=>patchEntry({librasVideoUrl:e.target.value})} placeholder="URL do vídeo/versão validada em Libras" className="mt-2 h-10 w-full rounded-xl border border-black/10 bg-white px-3 text-xs"/></div>
          <button type="button" disabled={!canEdit||draft.entries.length<=1} onClick={removeEntry} className="h-10 px-3 rounded-xl border border-red-200 text-red-700 flex items-center gap-2 text-xs"><Trash2 size={14}/> Excluir este texto</button>
        </>}
      </section>
      <aside className="min-h-0 overflow-y-auto bg-white border-t lg:border-t-0 lg:border-l border-black/10 p-4">
        <div className="font-bold flex items-center gap-2"><Sparkles size={16}/> Assistente de UX Writing</div><p className="mt-2 text-[11px] leading-relaxed text-neutral-500">Peça variações, ajuste de tom, CTA, mensagens de erro, estados vazios ou microcopy. A voz funciona aqui também.</p><div className="mt-3 flex items-start gap-2"><textarea value={assistantPrompt} onChange={(e)=>setAssistantPrompt(e.target.value)} className="min-h-28 flex-1 rounded-xl border border-black/10 p-3 text-sm" placeholder="Ex.: deixe mais acolhedor sem infantilizar; crie um CTA mais curto…"/><VoiceDictationButton locale={draft.sourceLocale} onText={(text)=>setAssistantPrompt((current)=>`${current}${current&&!current.endsWith(' ')?' ':''}${text}`)}/></div><button type="button" disabled={!assistantPrompt.trim()||!!loading} onClick={()=>void runAssistant('rewrite')} className="mt-2 w-full h-11 rounded-xl bg-black text-white text-xs font-bold">REESCREVER TEXTO</button>
        {error&&<div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        <div className="mt-5 border-t border-black/10 pt-4"><div className="text-[9px] font-mono font-bold uppercase text-neutral-500">Glossário do projeto</div><textarea value={draft.glossary.join('\n')} onChange={(e)=>setDraft({...draft,glossary:e.target.value.split('\n').map((v)=>v.trim()).filter(Boolean)})} placeholder={'Metodologia 5I’s\nNome da marca\nTermos que não devem ser traduzidos'} className="mt-2 min-h-32 w-full rounded-xl border border-black/10 p-3 text-xs"/></div>
      </aside>
    </main>
  </div>;
}
