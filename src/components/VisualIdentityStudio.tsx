import React, { useMemo, useState } from 'react';
import {
  BookOpen, Check, FileText, Image as ImageIcon, Info, LayoutGrid, Palette,
  Plus, Save, Sparkles, Trash2, Type, X
} from 'lucide-react';
import { StudioWorkspace } from './StudioWorkspace';
import { VisualIdentityApplication, VisualIdentityDocument } from '../types';
import { useGraphicFonts } from '../lib/graphicFonts';

interface Props {
  document: VisualIdentityDocument;
  title?: string;
  canEdit?: boolean;
  onSave: (document: VisualIdentityDocument) => void;
  onClose: () => void;
  onAddToNotes?: (title: string, content: string) => void;
}

const uid = (prefix = 'brand') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const REFERENCES = [
  { author: 'Alina Wheeler', work: 'Design de Identidade da Marca', note: 'Processo: pesquisa, estratégia, criação, pontos de contato e governança da marca.' },
  { author: 'David Airey', work: 'Logo Design Love', note: 'Logo memorável, pertinente, simples o suficiente para funcionar em escalas e contextos diversos.' },
  { author: 'Cecília Consolo', work: 'Marcas — Design Estratégico', note: 'A identidade como sistema estratégico: marca, repertório, cultura, gestão e coerência.' },
  { author: 'Alexandre Wollner', work: 'Sistemas de identidade visual', note: 'Rigor construtivo, síntese, modulação, legibilidade e consistência do sistema.' },
  { author: 'Aloísio Magalhães', work: 'Design e identidade cultural brasileira', note: 'Identidade como construção cultural situada, capaz de evitar soluções genéricas e importadas.' },
];

const DEFAULT_APPLICATIONS: VisualIdentityApplication[] = [
  { id: 'app-social', type: 'social', title: 'Post / capa social' },
  { id: 'app-poster', type: 'poster', title: 'Cartaz' },
  { id: 'app-card', type: 'card', title: 'Cartão / assinatura' },
  { id: 'app-pack', type: 'packaging', title: 'Embalagem / rótulo' },
  { id: 'app-sign', type: 'signage', title: 'Sinalização' },
  { id: 'app-interface', type: 'interface', title: 'Interface digital' },
];

export const blankVisualIdentity = (): VisualIdentityDocument => ({
  title: 'Identidade visual do projeto',
  brandName: 'Nome da marca',
  tagline: 'Uma frase curta que orienta a presença da marca',
  essence: 'Qual é a ideia central que esta marca precisa tornar visível?',
  audience: 'Para quem esta marca existe e em qual contexto ela será encontrada?',
  positioning: 'O que torna esta proposta específica, reconhecível e diferente?',
  personality: ['clara', 'autoral', 'contemporânea'],
  logo: { kind: 'combination', symbolStyle: 'geometric', monogram: 'NM', lockup: 'horizontal' },
  palette: [
    { id: 'c1', name: 'Principal', role: 'Reconhecimento', color: '#267F77' },
    { id: 'c2', name: 'Apoio', role: 'Contraste', color: '#FF4F9A' },
    { id: 'c3', name: 'Claro', role: 'Fundo', color: '#F4F2ED' },
    { id: 'c4', name: 'Escuro', role: 'Texto', color: '#161616' },
    { id: 'c5', name: 'Acento', role: 'Destaque', color: '#D7FF38' },
  ],
  typography: { display: 'Space Grotesk', text: 'Inter', accent: 'IBM Plex Mono' },
  graphicLanguage: 'Defina formas, ritmo, grid, ilustrações, ícones, texturas e comportamento dos elementos gráficos.',
  photoBrief: 'Descreva luz, enquadramento, pessoas/objetos, profundidade, tratamento de cor, o que evitar e o grau de espontaneidade das imagens.',
  logoRules: 'Preservar contraste, área de proteção e legibilidade. Não distorcer, inclinar, alterar proporções ou usar sobre fundos sem contraste.',
  applications: DEFAULT_APPLICATIONS,
  manualNotes: 'Registre aqui regras de consistência, exceções, acessibilidade, arquivos-mestre e orientações de implementação.',
});

const applicationLabels: Record<VisualIdentityApplication['type'], string> = {
  social: 'SOCIAL', poster: 'CARTAZ', card: 'CARTÃO', packaging: 'EMBALAGEM', signage: 'SINALIZAÇÃO', interface: 'INTERFACE',
};

function Mark({ document, compact = false }: { document: VisualIdentityDocument; compact?: boolean }) {
  const primary = document.palette[0]?.color || '#267F77';
  const secondary = document.palette[1]?.color || '#FF4F9A';
  const monogram = (document.logo.monogram || document.brandName.slice(0, 2) || 'ID').slice(0, 3).toUpperCase();
  const shape = document.logo.symbolStyle;
  const symbol = <div className={`${compact ? 'h-10 w-10' : 'h-16 w-16'} shrink-0 relative flex items-center justify-center overflow-hidden`} style={{ color: primary }}>
    {shape === 'geometric' && <div className="absolute inset-1 rotate-12 border-[5px] rounded-[28%]" style={{ borderColor: primary }} />}
    {shape === 'organic' && <div className="absolute inset-1 rounded-[58%_42%_62%_38%/42%_56%_44%_58%]" style={{ background: primary }} />}
    {shape === 'seal' && <div className="absolute inset-1 rounded-full border-[5px]" style={{ borderColor: primary }} />}
    {shape === 'abstract' && <><div className="absolute left-1 top-2 h-8 w-8 rounded-full" style={{ background: primary }} /><div className="absolute right-1 bottom-2 h-8 w-8 rotate-45" style={{ background: secondary }} /></>}
    <b className={`relative z-10 ${shape === 'organic' || shape === 'abstract' ? 'text-white' : ''} ${compact ? 'text-[10px]' : 'text-sm'}`}>{monogram}</b>
  </div>;
  if (document.logo.lockup === 'symbol-only') return symbol;
  if (document.logo.lockup === 'stacked') return <div className="flex flex-col items-center text-center gap-2">{symbol}<div><b className={compact ? 'text-xs' : 'text-xl'} style={{ fontFamily: document.typography.display }}>{document.brandName}</b>{!compact && <div className="text-[9px] opacity-60">{document.tagline}</div>}</div></div>;
  return <div className="flex items-center gap-3">{document.logo.kind !== 'wordmark' && symbol}<div><b className={compact ? 'text-xs' : 'text-xl'} style={{ fontFamily: document.typography.display }}>{document.brandName}</b>{!compact && <div className="text-[9px] opacity-60">{document.tagline}</div>}</div></div>;
}

function ApplicationPreview({ document, app }: { document: VisualIdentityDocument; app: VisualIdentityApplication }) {
  const p = document.palette;
  const primary = p[0]?.color || '#267F77';
  const support = p[1]?.color || '#FF4F9A';
  const paper = p[2]?.color || '#F4F2ED';
  const ink = p[3]?.color || '#161616';
  return <div className="aspect-[4/3] rounded-xl overflow-hidden border relative" style={{ background: paper, color: ink }}>
    <div className="absolute inset-x-0 top-0 h-2" style={{ background: primary }} />
    <div className="absolute right-3 top-4 h-12 w-12 rounded-full opacity-90" style={{ background: support }} />
    <div className="absolute left-3 top-5 scale-[.72] origin-top-left"><Mark document={document} compact /></div>
    <div className="absolute left-4 right-4 bottom-4">
      <div className="text-[7px] font-mono opacity-45">{applicationLabels[app.type]}</div>
      <b className="block text-[11px] leading-tight" style={{ fontFamily: document.typography.display }}>{app.title}</b>
      <div className="mt-1 h-1.5 w-16 rounded-full" style={{ background: primary }} />
    </div>
  </div>;
}

export function VisualIdentityPreview({ document, className = '' }: { document: VisualIdentityDocument; className?: string }) {
  return <div className={`bg-[#F4F2ED] p-4 overflow-hidden ${className}`}>
    <div className="flex items-center justify-between gap-3"><Mark document={document} compact /><div className="flex -space-x-1">{document.palette.slice(0, 5).map((color) => <span key={color.id} className="h-5 w-5 rounded-full border border-white" style={{ background: color.color }} />)}</div></div>
    <div className="mt-4 grid grid-cols-3 gap-2">{document.applications.slice(0, 3).map((app) => <ApplicationPreview key={app.id} document={document} app={app} />)}</div>
  </div>;
}

export default function VisualIdentityStudio({ document, title = 'Identidade visual', canEdit = true, onSave, onClose, onAddToNotes }: Props) {
  const [draft, setDraft] = useState<VisualIdentityDocument>(() => JSON.parse(JSON.stringify(document)));
  const [tab, setTab] = useState<'strategy' | 'brand' | 'system' | 'applications' | 'manual'>('strategy');
  const [guideOpen, setGuideOpen] = useState(false);
  const [noteDone, setNoteDone] = useState(false);
  useGraphicFonts([draft.typography.display, draft.typography.text, draft.typography.accent]);

  const noteSummary = useMemo(() => [
    `IDENTIDADE VISUAL — ${draft.brandName}`,
    draft.tagline ? `Tagline: ${draft.tagline}` : '',
    `Essência: ${draft.essence}`,
    `Público/contexto: ${draft.audience}`,
    `Posicionamento: ${draft.positioning}`,
    `Personalidade: ${draft.personality.join(', ')}`,
    `Paleta: ${draft.palette.map((c) => `${c.name} ${c.color}`).join(' · ')}`,
    `Tipografia: ${draft.typography.display} / ${draft.typography.text} / ${draft.typography.accent}`,
    `Linguagem gráfica: ${draft.graphicLanguage}`,
    `Photobrief: ${draft.photoBrief}`,
    `Regras da marca: ${draft.logoRules}`,
  ].filter(Boolean).join('\n'), [draft]);

  const patch = (next: Partial<VisualIdentityDocument>) => setDraft((current) => ({ ...current, ...next }));
  const tabs = [
    ['strategy', 'ESSÊNCIA'], ['brand', 'MARCA'], ['system', 'SISTEMA'], ['applications', 'APLICAÇÕES'], ['manual', 'MANUAL'],
  ] as const;

  return <div className="studio-editor fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={(e) => e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
      <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={19} /></button>
      <div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[10px] font-mono text-neutral-500 uppercase">marca · símbolo · cor · tipografia · aplicações · manual</div></div>
      <button onClick={() => setGuideOpen(true)} className="h-11 w-11 rounded-xl border flex items-center justify-center" title="Dicas e referências"><Info size={17} /></button>
      <button disabled={!canEdit} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15} /> SALVAR</button>
    </header>

    <StudioWorkspace tools={<div>
      <div className="sticky top-0 z-10 bg-white border-b p-2 flex gap-2 overflow-x-auto">{tabs.map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`h-10 px-3 rounded-xl border text-[9px] font-bold shrink-0 ${tab === id ? 'bg-black text-white border-black' : 'bg-white'}`}>{label}</button>)}</div>
      <div className="p-4 space-y-4">
        {tab === 'strategy' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><Sparkles size={15} /> Estratégia antes da forma</b><p className="mt-1 text-[10px] text-neutral-500">A identidade não começa pelo logo. Defina o que precisa ser reconhecido e só depois construa o sistema visual.</p></div>
          <label className="block text-[9px] font-mono">NOME DA MARCA<input value={draft.brandName} onChange={(e) => patch({ brandName: e.target.value })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">TAGLINE<input value={draft.tagline} onChange={(e) => patch({ tagline: e.target.value })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">ESSÊNCIA<textarea value={draft.essence} onChange={(e) => patch({ essence: e.target.value })} className="mt-1 min-h-24 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">PÚBLICO / CONTEXTO<textarea value={draft.audience} onChange={(e) => patch({ audience: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">POSICIONAMENTO<textarea value={draft.positioning} onChange={(e) => patch({ positioning: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">PERSONALIDADE — SEPARE POR VÍRGULAS<input value={draft.personality.join(', ')} onChange={(e) => patch({ personality: e.target.value.split(',').map((x) => x.trim()).filter(Boolean) })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm" /></label>
        </>}

        {tab === 'brand' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><LayoutGrid size={15} /> Marca e assinatura</b><p className="mt-1 text-[10px] text-neutral-500">Comece por um sistema simples e verificável. O símbolo abaixo é paramétrico e serve como estudo, não como solução automática final.</p></div>
          <label className="block text-[9px] font-mono">TIPO DE MARCA<select value={draft.logo.kind} onChange={(e) => patch({ logo: { ...draft.logo, kind: e.target.value as VisualIdentityDocument['logo']['kind'] } })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="wordmark">Logotipo / wordmark</option><option value="monogram">Monograma</option><option value="symbol">Símbolo</option><option value="combination">Símbolo + logotipo</option></select></label>
          <label className="block text-[9px] font-mono">LINGUAGEM DO SÍMBOLO<select value={draft.logo.symbolStyle} onChange={(e) => patch({ logo: { ...draft.logo, symbolStyle: e.target.value as VisualIdentityDocument['logo']['symbolStyle'] } })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="geometric">Geométrica</option><option value="organic">Orgânica</option><option value="seal">Selo / estrutura circular</option><option value="abstract">Abstrata</option></select></label>
          <label className="block text-[9px] font-mono">MONOGRAMA<input value={draft.logo.monogram} maxLength={3} onChange={(e) => patch({ logo: { ...draft.logo, monogram: e.target.value.toUpperCase() } })} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm uppercase" /></label>
          <label className="block text-[9px] font-mono">COMPOSIÇÃO<select value={draft.logo.lockup} onChange={(e) => patch({ logo: { ...draft.logo, lockup: e.target.value as VisualIdentityDocument['logo']['lockup'] } })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="horizontal">Horizontal</option><option value="stacked">Vertical</option><option value="symbol-only">Somente símbolo</option></select></label>
          <label className="block text-[9px] font-mono">REGRAS DE USO<textarea value={draft.logoRules} onChange={(e) => patch({ logoRules: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm" /></label>
        </>}

        {tab === 'system' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><Palette size={15} /> Código visual</b><p className="mt-1 text-[10px] text-neutral-500">A paleta e a tipografia devem funcionar como sistema, não como escolhas isoladas.</p></div>
          <div className="space-y-2">{draft.palette.map((color, index) => <div key={color.id} className="grid grid-cols-[44px_minmax(0,1fr)] gap-2 rounded-xl border bg-white p-2"><input type="color" value={color.color} onChange={(e) => patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, color: e.target.value } : c) })} className="h-11 w-11 rounded-lg border p-0.5" /><div className="grid grid-cols-2 gap-1"><input value={color.name} onChange={(e) => patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, name: e.target.value } : c) })} className="h-8 rounded-lg border px-2 text-xs" /><input value={color.color.toUpperCase()} onChange={(e) => /^#[0-9a-f]{6}$/i.test(e.target.value) && patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, color: e.target.value } : c) })} className="h-8 rounded-lg border px-2 text-[10px] font-mono" /><input value={color.role} onChange={(e) => patch({ palette: draft.palette.map((c) => c.id === color.id ? { ...c, role: e.target.value } : c) })} className="col-span-2 h-8 rounded-lg border px-2 text-xs" /></div></div>)}</div>
          <div className="rounded-2xl border bg-white p-4 space-y-3"><b className="flex items-center gap-2"><Type size={15} /> Tipografia</b>{(['display', 'text', 'accent'] as const).map((key) => <label key={key} className="block text-[9px] font-mono uppercase">{key}<input value={draft.typography[key]} onChange={(e) => patch({ typography: { ...draft.typography, [key]: e.target.value } })} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" /></label>)}</div>
          <label className="block text-[9px] font-mono">LINGUAGEM GRÁFICA<textarea value={draft.graphicLanguage} onChange={(e) => patch({ graphicLanguage: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm" /></label>
          <label className="block text-[9px] font-mono">PHOTOBRIEF<textarea value={draft.photoBrief} onChange={(e) => patch({ photoBrief: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm" /></label>
        </>}

        {tab === 'applications' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><ImageIcon size={15} /> Pontos de contato</b><p className="mt-1 text-[10px] text-neutral-500">Teste a identidade em situações diferentes antes de considerá-la resolvida.</p></div>
          <div className="grid grid-cols-2 gap-2">{draft.applications.map((app) => <div key={app.id} className="rounded-xl border bg-white p-2"><ApplicationPreview document={draft} app={app} /><input value={app.title} onChange={(e) => patch({ applications: draft.applications.map((a) => a.id === app.id ? { ...a, title: e.target.value } : a) })} className="mt-2 h-8 w-full rounded-lg border px-2 text-[10px]" /></div>)}</div>
          <button onClick={() => patch({ applications: [...draft.applications, { id: uid('app'), type: 'social', title: 'Nova aplicação' }] })} className="h-10 w-full rounded-xl border border-dashed bg-white text-[10px] font-bold flex items-center justify-center gap-2"><Plus size={14} /> NOVA APLICAÇÃO</button>
        </>}

        {tab === 'manual' && <>
          <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><BookOpen size={15} /> Manual vivo</b><p className="mt-1 text-[10px] text-neutral-500">Registre decisões para que a marca continue coerente quando outras pessoas produzirem peças.</p></div>
          <label className="block text-[9px] font-mono">OBSERVAÇÕES DO MANUAL<textarea value={draft.manualNotes} onChange={(e) => patch({ manualNotes: e.target.value })} className="mt-1 min-h-44 w-full rounded-xl border p-3 text-sm" /></label>
          {onAddToNotes && <button onClick={() => { onAddToNotes(`Identidade visual — ${draft.brandName}`, noteSummary); setNoteDone(true); window.setTimeout(() => setNoteDone(false), 1800); }} className="h-11 w-full rounded-xl bg-black text-white text-[10px] font-bold flex items-center justify-center gap-2">{noteDone ? <Check size={15} /> : <FileText size={15} />}{noteDone ? 'ADICIONADO ÀS NOTAS' : 'ADICIONAR RESUMO ÀS NOTAS'}</button>}
        </>}
      </div>
    </div>}>
      <div className="max-w-5xl mx-auto w-full space-y-4">
        <section className="rounded-3xl border bg-white p-5 sm:p-8 min-h-[280px] flex items-center justify-center"><Mark document={draft} /></section>
        <section className="rounded-2xl border bg-white p-4"><div className="flex items-center justify-between"><div><div className="text-[9px] font-mono text-neutral-400">PALETA</div><b className="text-sm">Sistema cromático</b></div><div className="flex -space-x-1">{draft.palette.map((c) => <span key={c.id} title={`${c.name} ${c.color}`} className="h-9 w-9 rounded-full border-2 border-white" style={{ background: c.color }} />)}</div></div><div className="mt-4"><div className="text-3xl leading-tight" style={{ fontFamily: draft.typography.display }}>Aa — {draft.brandName}</div><p className="mt-2 text-sm" style={{ fontFamily: draft.typography.text }}>{draft.essence}</p><code className="mt-3 block text-[10px]" style={{ fontFamily: draft.typography.accent }}>{draft.typography.display} · {draft.typography.text} · {draft.typography.accent}</code></div></section>
        <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">{draft.applications.map((app) => <ApplicationPreview key={app.id} document={draft} app={app} />)}</section>
      </div>
    </StudioWorkspace>

    {guideOpen && <div className="fixed inset-0 z-[180] bg-black/50 p-3 sm:p-8 flex items-end sm:items-center justify-center" onClick={() => setGuideOpen(false)}><div className="w-full max-w-3xl max-h-[88vh] overflow-auto rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-7" onClick={(e) => e.stopPropagation()}><div className="flex items-start gap-3"><div className="flex-1"><div className="text-[9px] font-mono text-neutral-400">DICAS · REFERÊNCIAS</div><b className="text-xl">O que uma identidade visual precisa resolver?</b></div><button onClick={() => setGuideOpen(false)} className="h-10 w-10 rounded-xl border flex items-center justify-center"><X size={16} /></button></div><div className="mt-4 grid sm:grid-cols-2 gap-3"><div className="rounded-2xl bg-[#111] text-white p-4"><b>Pontos essenciais</b><ul className="mt-3 space-y-2 text-xs text-white/75"><li>• Estratégia e posicionamento antes da estética.</li><li>• Logotipo e símbolo reconhecíveis em diferentes escalas.</li><li>• Paleta com função definida, contraste e acessibilidade.</li><li>• Tipografia com papéis claros e hierarquia.</li><li>• Linguagem gráfica: grid, formas, ícones, ilustrações e texturas.</li><li>• Photobrief consistente.</li><li>• Aplicações reais e manual de uso.</li></ul></div><div className="space-y-2">{REFERENCES.map((ref) => <div key={ref.author} className="rounded-xl border p-3"><b className="text-xs">{ref.author}</b><div className="text-[10px] font-mono text-neutral-500">{ref.work}</div><p className="mt-1 text-[10px] text-neutral-600">{ref.note}</p></div>)}</div></div></div></div>}
  </div>;
}
