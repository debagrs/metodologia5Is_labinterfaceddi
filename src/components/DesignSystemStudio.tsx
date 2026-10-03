import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Plus, Save, Search, ShieldCheck, Trash2, Type, X } from 'lucide-react';
import { DesignColorToken, DesignSystemDocument, DesignTypeToken } from '../types';

interface DesignSystemStudioProps {
  document: DesignSystemDocument;
  title?: string;
  canEdit?: boolean;
  onSave: (document: DesignSystemDocument) => void;
  onClose: () => void;
}

const FALLBACK_FONTS = [
  'Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Nunito','Raleway','Merriweather','Playfair Display',
  'Source Sans 3','Source Serif 4','IBM Plex Sans','IBM Plex Serif','IBM Plex Mono','Space Grotesk','DM Sans','DM Serif Display',
  'Work Sans','Ubuntu','Oswald','Bebas Neue','Libre Baskerville','Crimson Text','Fira Sans','Fira Mono','Noto Sans','Noto Serif',
  'Manrope','Mulish','Archivo','Archivo Black','Barlow','Cabin','Karla','Rubik','Quicksand','Josefin Sans','PT Sans','PT Serif'
];

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const hslToHex = (h: number, s: number, l: number) => {
  const saturation = s / 100;
  const lightness = l / 100;
  const c = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lightness - c / 2;
  let r = 0; let g = 0; let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const part = (value: number) => Math.round((value + m) * 255).toString(16).padStart(2, '0');
  return `#${part(r)}${part(g)}${part(b)}`.toUpperCase();
};

// Biblioteca cromática ampla, gerada localmente: não adiciona dependências nem limita a escolha do input nativo.
const COLOR_LIBRARY = [
  ...Array.from({ length: 24 }, (_, hueIndex) => hueIndex * 15).flatMap((hue) =>
    [24, 34, 44, 54, 64, 74, 84].map((lightness) => hslToHex(hue, 82, lightness))
  ),
  ...Array.from({ length: 13 }, (_, index) => {
    const value = Math.round((index / 12) * 255).toString(16).padStart(2, '0');
    return `#${value}${value}${value}`.toUpperCase();
  }),
];

export const blankDesignSystem = (): DesignSystemDocument => ({
  name: 'Design System do projeto',
  primaryFont: 'Inter',
  colors: [
    { id: makeId('color'), name: 'Brand', value: '#111111', role: 'brand' },
    { id: makeId('color'), name: 'Accent', value: '#7C3AED', role: 'accent' },
    { id: makeId('color'), name: 'Surface', value: '#FFFFFF', role: 'surface' },
    { id: makeId('color'), name: 'Text', value: '#111111', role: 'text' },
  ],
  typography: [
    { id: makeId('type'), name: 'Display', family: 'Inter', size: 48, weight: 700, lineHeight: 1.05 },
    { id: makeId('type'), name: 'Heading', family: 'Inter', size: 28, weight: 700, lineHeight: 1.15 },
    { id: makeId('type'), name: 'Body', family: 'Inter', size: 16, weight: 400, lineHeight: 1.5 },
    { id: makeId('type'), name: 'Caption', family: 'Inter', size: 12, weight: 500, lineHeight: 1.35 },
  ],
  spacing: [4, 8, 12, 16, 24, 32, 48, 64],
  radii: [0, 4, 8, 12, 16, 24, 999],
  updatedAt: new Date().toISOString(),
});

const luminance = (hex: string) => {
  const clean = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(clean)) return 0;
  const rgb = [0, 2, 4].map((index) => parseInt(clean.slice(index, index + 2), 16) / 255).map((value) => value <= 0.03928 ? value / 12.92 : Math.pow((value + 0.055) / 1.055, 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};

const contrastRatio = (a: string, b: string) => {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const loadGoogleFont = (family: string) => {
  if (typeof document === 'undefined' || !family) return;
  const id = `gf-${family.replace(/[^a-z0-9]/gi, '-').toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, '+')}:wght@300;400;500;600;700;800&display=swap`;
  document.head.appendChild(link);
};

export function DesignSystemPreview({ document, className = '' }: { document: DesignSystemDocument; className?: string }) {
  const colors = document.colors.slice(0, 7);
  useEffect(() => { loadGoogleFont(document.primaryFont); }, [document.primaryFont]);
  return (
    <div className={`bg-white p-4 overflow-hidden ${className}`} style={{ fontFamily: document.primaryFont }}>
      <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-400">Design System</div>
      <div className="mt-1 text-lg font-bold truncate">{document.name}</div>
      <div className="mt-4 flex gap-1.5 flex-wrap">
        {colors.map((color) => <span key={color.id} className="h-8 w-8 rounded-lg border border-black/10" style={{ background: color.value }} title={`${color.name}: ${color.value}`} />)}
      </div>
      <div className="mt-4">
        <div className="text-xl font-bold" style={{ fontFamily: document.primaryFont }}>{document.primaryFont}</div>
        <div className="text-xs text-neutral-500 mt-1">Aa Bb Cc · 0123456789</div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">{document.spacing.slice(0, 6).map((value) => <span key={value} className="rounded-full bg-neutral-100 px-2 py-1 text-[9px] font-mono">{value}px</span>)}</div>
    </div>
  );
}

export default function DesignSystemStudio({ document, title = 'Design System', canEdit = true, onSave, onClose }: DesignSystemStudioProps) {
  const [draft, setDraft] = useState<DesignSystemDocument>(() => JSON.parse(JSON.stringify(document)));
  const [fontSearch, setFontSearch] = useState('');
  const [fonts, setFonts] = useState<string[]>(FALLBACK_FONTS);
  const [fontStatus, setFontStatus] = useState<'idle'|'loading'|'api'|'fallback'>('idle');
  const [fg, setFg] = useState(draft.colors.find((item) => item.role === 'text')?.value || '#111111');
  const [bg, setBg] = useState(draft.colors.find((item) => item.role === 'surface')?.value || '#FFFFFF');

  const ratio = useMemo(() => contrastRatio(fg, bg), [fg, bg]);

  useEffect(() => { loadGoogleFont(draft.primaryFont); }, [draft.primaryFont]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setFontStatus('loading');
      try {
        const response = await fetch(`/api/google-fonts?q=${encodeURIComponent(fontSearch.trim())}`);
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error || 'Falha na lista de fontes');
        if (!cancelled) {
          setFonts(data.items.map((item: any) => String(item.family)).filter(Boolean));
          setFontStatus(data.source === 'google-fonts-api' ? 'api' : 'fallback');
        }
      } catch {
        if (!cancelled) {
          const query = fontSearch.trim().toLowerCase();
          setFonts(FALLBACK_FONTS.filter((font) => !query || font.toLowerCase().includes(query)));
          setFontStatus('fallback');
        }
      }
    }, 260);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [fontSearch]);

  const patchColor = (id: string, patch: Partial<DesignColorToken>) => setDraft((current) => ({ ...current, colors: current.colors.map((item) => item.id === id ? { ...item, ...patch } : item) }));
  const patchType = (id: string, patch: Partial<DesignTypeToken>) => setDraft((current) => ({ ...current, typography: current.typography.map((item) => item.id === id ? { ...item, ...patch } : item) }));

  const selectPrimaryFont = (family: string) => {
    loadGoogleFont(family);
    setDraft((current) => ({
      ...current,
      primaryFont: family,
      typography: current.typography.map((item) => ({ ...item, family })),
    }));
  };

  return (
    <div className="fixed inset-0 z-[125] bg-[#F2F1ED] flex flex-col canvas-control" onPointerDown={(event) => event.stopPropagation()}>
      <header className="shrink-0 min-h-16 bg-white border-b border-black/10 px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
        <button type="button" onClick={onClose} className="h-11 w-11 rounded-xl hover:bg-black/5 flex items-center justify-center" aria-label="Fechar Design System"><X size={19}/></button>
        <div className="min-w-0 flex-1"><div className="font-bold truncate">{title}</div><div className="text-[10px] font-mono text-neutral-500 uppercase">tokens · tipografia · paleta · acessibilidade</div></div>
        <button type="button" disabled={!canEdit} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })} className="h-11 px-4 rounded-xl bg-black text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40"><Save size={15}/> SALVAR</button>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-h-0 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <label className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Nome do sistema</label>
            <input value={draft.name} disabled={!canEdit} onChange={(e)=>setDraft({...draft,name:e.target.value})} className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 font-semibold outline-none focus:border-black"/>
          </div>

          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <div className="flex items-center justify-between gap-3"><div><div className="text-sm font-bold">Paleta de cores</div><div className="text-[10px] text-neutral-500">Crie tokens semânticos e use-os depois em wireframes e peças.</div></div><button type="button" disabled={!canEdit} onClick={()=>setDraft((current)=>({...current,colors:[...current.colors,{id:makeId('color'),name:'Nova cor',value:'#7C3AED',role:'custom'}]}))} className="h-10 px-3 rounded-xl border border-black flex items-center gap-2 text-[10px] font-mono font-bold"><Plus size={14}/> COR</button></div>
            <div className="mt-4 rounded-xl border border-black/10 bg-[#F7F6F2] p-3">
              <div className="flex items-center justify-between gap-3">
                <div><div className="text-[10px] font-mono font-bold uppercase tracking-widest">Biblioteca cromática</div><div className="text-[9px] text-neutral-500 mt-0.5">{COLOR_LIBRARY.length} amostras + seletor livre de milhões de cores. Toque numa cor para adicioná-la aos tokens.</div></div>
                <span className="shrink-0 rounded-full bg-white border border-black/10 px-2 py-1 text-[9px] font-mono">{COLOR_LIBRARY.length} CORES</span>
              </div>
              <div className="mt-3 max-h-44 overflow-y-auto grid grid-cols-10 sm:grid-cols-14 md:grid-cols-18 lg:grid-cols-20 gap-1.5 pr-1">
                {COLOR_LIBRARY.map((value, index) => (
                  <button key={`${value}-${index}`} type="button" disabled={!canEdit} onClick={()=>setDraft((current)=>({...current,colors:[...current.colors,{id:makeId('color'),name:`Cor ${current.colors.length + 1}`,value,role:'custom'}]}))} className="aspect-square min-h-6 rounded-md border border-black/10 shadow-sm hover:scale-110 hover:z-10 transition-transform disabled:opacity-50" style={{background:value}} title={`Adicionar ${value}`} aria-label={`Adicionar cor ${value}`}/>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
              {draft.colors.map((color) => (
                <div key={color.id} className="rounded-xl border border-black/10 p-3 flex items-center gap-3">
                  <input type="color" value={color.value} disabled={!canEdit} onChange={(e)=>patchColor(color.id,{value:e.target.value})} className="h-12 w-12 rounded-lg border-0 bg-transparent"/>
                  <div className="min-w-0 flex-1 space-y-1">
                    <input value={color.name} disabled={!canEdit} onChange={(e)=>patchColor(color.id,{name:e.target.value})} className="w-full text-xs font-bold outline-none"/>
                    <div className="text-[10px] font-mono text-neutral-500">{color.value.toUpperCase()}</div>
                  </div>
                  <button type="button" disabled={!canEdit || draft.colors.length<=2} onClick={()=>setDraft((current)=>({...current,colors:current.colors.filter((item)=>item.id!==color.id)}))} className="h-9 w-9 rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center disabled:opacity-20"><Trash2 size={14}/></button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <div className="flex items-start justify-between gap-3"><div><div className="text-sm font-bold flex items-center gap-2"><Type size={15}/> Google Fonts</div><div className="text-[10px] text-neutral-500">Pesquise a biblioteca completa quando GOOGLE_FONTS_API_KEY estiver configurada; sem chave, o sistema mantém uma seleção de fallback.</div></div><span className={`rounded-full px-2 py-1 text-[9px] font-mono ${fontStatus==='api'?'bg-emerald-50 text-emerald-700':'bg-neutral-100 text-neutral-500'}`}>{fontStatus==='api'?'API COMPLETA':fontStatus==='loading'?'BUSCANDO…':'FALLBACK'}</span></div>
            <div className="mt-3 relative"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input value={fontSearch} onChange={(e)=>setFontSearch(e.target.value)} placeholder="Buscar fonte…" className="h-11 w-full rounded-xl border border-black/10 pl-9 pr-3 outline-none focus:border-black"/></div>
            <div className="mt-3 max-h-64 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2 pr-1">
              {fonts.slice(0, 250).map((family) => (
                <button key={family} type="button" onClick={()=>selectPrimaryFont(family)} className={`min-h-12 rounded-xl border px-3 text-left ${draft.primaryFont===family?'border-black bg-black text-white':'border-black/10 hover:border-black'}`} onMouseEnter={()=>loadGoogleFont(family)}>
                  <div className="text-sm" style={{fontFamily:family}}>{family}</div><div className={`text-[9px] font-mono ${draft.primaryFont===family?'text-white/60':'text-neutral-400'}`}>Aa Bb Cc 0123</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <div className="text-sm font-bold">Escala tipográfica</div>
            <div className="mt-3 space-y-3">
              {draft.typography.map((token)=>(
                <div key={token.id} className="rounded-xl border border-black/10 p-3 grid grid-cols-1 md:grid-cols-[1fr_90px_90px_90px] gap-2 items-center">
                  <div><input value={token.name} disabled={!canEdit} onChange={(e)=>patchType(token.id,{name:e.target.value})} className="w-full text-[10px] font-mono uppercase text-neutral-500 outline-none"/><div className="mt-1 truncate" style={{fontFamily:token.family,fontSize:Math.min(token.size,34),fontWeight:token.weight,lineHeight:token.lineHeight}}>Design que pensa e faz</div></div>
                  <label className="text-[9px] font-mono text-neutral-500">TAMANHO<input type="number" min={8} max={160} value={token.size} onChange={(e)=>patchType(token.id,{size:Number(e.target.value)})} className="mt-1 h-9 w-full rounded-lg border border-black/10 px-2 text-xs text-black"/></label>
                  <label className="text-[9px] font-mono text-neutral-500">PESO<select value={token.weight} onChange={(e)=>patchType(token.id,{weight:Number(e.target.value)})} className="mt-1 h-9 w-full rounded-lg border border-black/10 px-2 text-xs text-black bg-white">{[300,400,500,600,700,800,900].map((w)=><option key={w} value={w}>{w}</option>)}</select></label>
                  <label className="text-[9px] font-mono text-neutral-500">ENTRELINHA<input type="number" min={0.8} max={2.4} step={0.05} value={token.lineHeight} onChange={(e)=>patchType(token.id,{lineHeight:Number(e.target.value)})} className="mt-1 h-9 w-full rounded-lg border border-black/10 px-2 text-xs text-black"/></label>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-black/10 p-4">
            <div className="text-sm font-bold">Escalas do sistema</div>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <label className="text-[10px] font-mono text-neutral-500">ESPAÇAMENTO<input value={draft.spacing.join(', ')} onChange={(e)=>setDraft({...draft,spacing:e.target.value.split(',').map(Number).filter((n)=>Number.isFinite(n)&&n>=0)})} className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 text-black"/><span className="block mt-1">Valores em px separados por vírgula.</span></label>
              <label className="text-[10px] font-mono text-neutral-500">RAIOS<input value={draft.radii.join(', ')} onChange={(e)=>setDraft({...draft,radii:e.target.value.split(',').map(Number).filter((n)=>Number.isFinite(n)&&n>=0)})} className="mt-2 h-11 w-full rounded-xl border border-black/10 px-3 text-black"/><span className="block mt-1">Inclua 999 para pills.</span></label>
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-y-auto border-t xl:border-t-0 xl:border-l border-black/10 bg-white p-4 space-y-5">
          <div><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">prévia viva</div><div className="mt-3 rounded-2xl border border-black/10 overflow-hidden"><DesignSystemPreview document={draft} className="min-h-64"/></div></div>
          <div className="rounded-2xl border border-black/10 p-4">
            <div className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={16}/> Contraste e acessibilidade</div>
            <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[9px] font-mono">TEXTO<input type="color" value={fg} onChange={(e)=>setFg(e.target.value)} className="mt-1 h-11 w-full"/></label><label className="text-[9px] font-mono">FUNDO<input type="color" value={bg} onChange={(e)=>setBg(e.target.value)} className="mt-1 h-11 w-full"/></label></div>
            <div className="mt-3 rounded-xl p-4 border" style={{background:bg,color:fg}}><div className="text-lg font-bold" style={{fontFamily:draft.primaryFont}}>Texto de teste</div><div className="text-sm mt-1">Legibilidade também é uma decisão de projeto.</div></div>
            <div className="mt-3 flex items-center justify-between"><span className="text-[10px] font-mono text-neutral-500">CONTRASTE</span><strong>{ratio.toFixed(2)}:1</strong></div>
            <div className="mt-2 grid grid-cols-3 gap-1 text-[9px] font-mono text-center"><span className={`rounded-lg py-2 ${ratio>=4.5?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>AA texto {ratio>=4.5?'✓':'×'}</span><span className={`rounded-lg py-2 ${ratio>=3?'bg-emerald-50 text-emerald-700':'bg-red-50 text-red-700'}`}>AA grande {ratio>=3?'✓':'×'}</span><span className={`rounded-lg py-2 ${ratio>=7?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>AAA {ratio>=7?'✓':'—'}</span></div>
          </div>
          <div className="rounded-2xl bg-[#F4F3EF] p-4 text-[10px] leading-relaxed text-neutral-600"><CheckCircle2 size={15} className="mb-2"/>O Design System fica salvo como um artefato do projeto. Os novos wireframes usam automaticamente a fonte primária e os primeiros tokens de cor como ponto de partida.</div>
        </aside>
      </main>
    </div>
  );
}
