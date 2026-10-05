import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Search, Pencil, Sparkles, Upload, X, Loader2, ExternalLink, WandSparkles } from 'lucide-react';
import { ensureTursoSession } from '../lib/turso';
import { searchOpenImages, type ImageProvider, type OpenImage } from '../lib/openImages';
import { traceImageFile, type TraceMode } from '../lib/vectorTrace';

type Tab = 'upload' | 'search' | 'edit' | 'trace' | 'generate';
type AiImageAction = 'create' | 'recreate' | 'adapt' | 'refine';

async function imagePreview(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

async function prepareVisualReference(file: File): Promise<{ mimeType: string; data: string }> {
  const source = await imagePreview(file);
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível preparar a referência visual.'));
    img.src = source;
  });
  let max = 820;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const ratio = Math.min(1, max / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
    const width = Math.max(1, Math.round((image.naturalWidth || image.width) * ratio));
    const height = Math.max(1, Math.round((image.naturalHeight || image.height) * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Seu navegador não disponibilizou o canvas necessário.');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', Math.max(.45, .82 - attempt * .08));
    const data = dataUrl.split(',')[1] || '';
    if (data.length <= 430000) return { mimeType: 'image/jpeg', data };
    max = Math.round(max * .74);
  }
  throw new Error('A referência ficou grande demais. Use uma imagem menor ou mais simples.');
}

export default function ImageStudio({
  onUpload,
  onChooseOpenImage,
  onOpenEditor,
  onGeneratedFile,
  onClose,
}: {
  onUpload: (file: File) => Promise<void> | void;
  onChooseOpenImage: (image: OpenImage) => Promise<void> | void;
  onOpenEditor: () => void;
  onGeneratedFile: (file: File) => Promise<void> | void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('upload');
  const [query, setQuery] = useState('');
  const [provider, setProvider] = useState<ImageProvider>('commons');
  const [items, setItems] = useState<OpenImage[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const [more, setMore] = useState(false);
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState('');

  const [prompt, setPrompt] = useState('');
  const [generatedSvg, setGeneratedSvg] = useState('');
  const [generatedName, setGeneratedName] = useState('imagem-gerada.svg');
  const [generatedNotes, setGeneratedNotes] = useState<string[]>([]);
  const [aiAction, setAiAction] = useState<AiImageAction>('create');
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [referencePreview, setReferencePreview] = useState('');
  const [preserveComposition, setPreserveComposition] = useState(true);
  const [preservePalette, setPreservePalette] = useState(true);
  const [preserveSilhouette, setPreserveSilhouette] = useState(true);

  const [traceFile, setTraceFile] = useState<File | null>(null);
  const [tracePreview, setTracePreview] = useState('');
  const [traceSvg, setTraceSvg] = useState('');
  const [traceName, setTraceName] = useState('trace-vetorial.svg');
  const [traceMode, setTraceMode] = useState<TraceMode>('color');
  const [traceColors, setTraceColors] = useState(5);
  const [traceThreshold, setTraceThreshold] = useState(145);
  const [traceDetail, setTraceDetail] = useState(68);
  const [traceSmoothing, setTraceSmoothing] = useState(2);
  const [traceRemoveBackground, setTraceRemoveBackground] = useState(true);
  const [traceMeta, setTraceMeta] = useState<{ pathCount: number; colors: string[] } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);
  const traceRef = useRef<HTMLInputElement>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

  const doSearch = async (nextPage = 1) => {
    if (!query.trim()) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError('');
    setSearched(true);
    try {
      const result = await searchOpenImages(provider, query.trim(), nextPage, controller.signal);
      setItems((current) => nextPage === 1 ? result.images : [
        ...current,
        ...result.images.filter((item) => !current.some((old) => old.id === item.id)),
      ]);
      setMore(result.more);
      setPage(nextPage);
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Não foi possível pesquisar as bibliotecas.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const chooseOpenImage = async (image: OpenImage) => {
    setAdding(image.id);
    setError('');
    try {
      await onChooseOpenImage(image);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Não foi possível adicionar a imagem ao canvas.');
    } finally {
      setAdding('');
    }
  };

  const chooseUpload = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      await onUpload(file);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Não foi possível enviar a imagem.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const chooseReference = async (file?: File) => {
    if (!file) return;
    setReferenceFile(file);
    setGeneratedSvg('');
    setGeneratedNotes([]);
    setError('');
    try { setReferencePreview(await imagePreview(file)); }
    catch (e: any) { setError(e?.message || 'Não foi possível abrir a referência.'); }
    if (referenceRef.current) referenceRef.current.value = '';
  };

  const generate = async () => {
    if (!prompt.trim()) return;
    if (aiAction !== 'create' && !referenceFile) {
      setError('Escolha uma imagem de referência para recriar, adaptar ou refinar.');
      return;
    }
    setBusy(true);
    setError('');
    setGeneratedSvg('');
    setGeneratedNotes([]);
    try {
      const visualReferences = referenceFile ? [await prepareVisualReference(referenceFile)] : [];
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'image-svg',
          prompt: prompt.trim(),
          imageAction: aiAction,
          preserve: {
            composition: preserveComposition,
            palette: preservePalette,
            silhouette: preserveSilhouette,
          },
          referenceNames: referenceFile ? [referenceFile.name] : [],
          visualReferences,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.generatedImage?.svg) throw new Error(data?.error || 'A IA não conseguiu gerar a imagem.');
      setGeneratedSvg(String(data.generatedImage.svg));
      setGeneratedNotes(Array.isArray(data.generatedImage.notes) ? data.generatedImage.notes.map(String) : []);
      const safeName = String(data.generatedImage.name || 'imagem-gerada').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'imagem-gerada';
      setGeneratedName(`${safeName}.svg`);
    } catch (e: any) {
      setError(e?.message || 'Falha ao gerar imagem.');
    } finally {
      setBusy(false);
    }
  };

  const saveGenerated = async () => {
    if (!generatedSvg) return;
    setBusy(true);
    setError('');
    try {
      const file = new File([generatedSvg], generatedName, { type: 'image/svg+xml' });
      await onGeneratedFile(file);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Não foi possível salvar a imagem gerada.');
    } finally { setBusy(false); }
  };

  const chooseTrace = async (file?: File) => {
    if (!file) return;
    setTraceFile(file);
    setTraceSvg('');
    setTraceMeta(null);
    setError('');
    try {
      setTracePreview(await imagePreview(file));
      setTraceName(`${file.name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-') || 'trace'}-vetorial.svg`);
    } catch (e: any) { setError(e?.message || 'Não foi possível abrir a imagem.'); }
    if (traceRef.current) traceRef.current.value = '';
  };

  const runTrace = async () => {
    if (!traceFile) return setError('Escolha primeiro uma imagem raster para vetorizar.');
    setBusy(true);
    setError('');
    try {
      const result = await traceImageFile(traceFile, {
        mode: traceMode,
        colors: traceColors,
        threshold: traceThreshold,
        detail: traceDetail,
        smoothing: traceSmoothing,
        removeBackground: traceRemoveBackground,
      });
      setTraceSvg(result.svg);
      setTraceMeta({ pathCount: result.pathCount, colors: result.colors });
    } catch (e: any) { setError(e?.message || 'Não foi possível vetorizar a imagem.'); }
    finally { setBusy(false); }
  };

  const saveTrace = async () => {
    if (!traceSvg) return;
    setBusy(true);
    setError('');
    try {
      await onGeneratedFile(new File([traceSvg], traceName, { type: 'image/svg+xml' }));
      onClose();
    } catch (e: any) { setError(e?.message || 'Não foi possível salvar o vetor.'); }
    finally { setBusy(false); }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; hint: string }> = [
    { id: 'upload', label: 'UPAR', icon: <Upload size={17}/>, hint: 'PNG, JPG, WEBP ou SVG do seu computador.' },
    { id: 'search', label: 'BUSCAR', icon: <Search size={17}/>, hint: 'Wikimedia Commons e Openverse, com licença visível.' },
    { id: 'edit', label: 'EDITAR', icon: <Pencil size={17}/>, hint: 'Photopea com camadas, máscara, texto, seleção e filtros.' },
    { id: 'trace', label: 'VETORIZAR', icon: <WandSparkles size={17}/>, hint: 'Trace local de raster para SVG editável, sem API.' },
    { id: 'generate', label: '+ IA', icon: <Sparkles size={17}/>, hint: 'Crie ou trabalhe sobre uma referência com IA e devolva SVG editável.' },
  ];

  return (
    <div className="fixed inset-0 z-[190] bg-[#F4F3EE] flex flex-col" onPointerDown={(event) => event.stopPropagation()}>
      <header className="h-auto min-h-[70px] border-b border-black/15 bg-white px-4 sm:px-6 py-3 flex items-center gap-3">
        <button type="button" aria-label="Fechar imagens" onClick={onClose} className="h-10 w-10 shrink-0 rounded-xl hover:bg-black/5 flex items-center justify-center"><X size={20}/></button>
        <div className="min-w-0">
          <b className="block text-lg leading-tight">Imagem</b>
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500">UPAR · BUSCAR LIVRE · EDITAR · VETORIZAR · IA</div>
        </div>
      </header>

      <div className="border-b bg-white px-3 sm:px-6 py-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
        {tabs.map((item) => (
          <button key={item.id} type="button" onClick={() => { setTab(item.id); setError(''); }} className={`min-h-11 rounded-xl border px-3 flex items-center justify-center gap-2 text-xs font-bold ${tab === item.id ? 'bg-black text-white border-black' : 'bg-white hover:border-black'}`} title={item.hint}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-7xl">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {tab === 'upload' && (
            <section className="grid lg:grid-cols-[1fr_1fr] gap-5 items-stretch">
              <div className="rounded-3xl border bg-white p-6 sm:p-8 flex flex-col justify-center min-h-[360px]">
                <ImagePlus size={34}/><h2 className="mt-5 text-2xl font-bold">Adicionar imagem ao projeto</h2>
                <p className="mt-2 text-sm text-neutral-600 max-w-xl">Use imagens próprias, fotografias, ilustrações, mapas exportados, SVGs ou screenshots. O arquivo entra como elemento visual no canvas.</p>
                <input ref={inputRef} type="file" accept="image/*,.svg" className="hidden" onChange={(event) => void chooseUpload(event.target.files?.[0])}/>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="mt-6 h-12 rounded-xl bg-black text-white px-5 font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>} ESCOLHER ARQUIVO</button>
              </div>
              <div className="rounded-3xl border bg-[#EEECE5] p-6 sm:p-8 min-h-[360px] flex flex-col justify-center">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-500">FLUXO DE DESIGN</div>
                <div className="mt-4 grid gap-3 text-sm"><div className="rounded-2xl bg-white p-4 border"><b>1 · Upar ou buscar</b><p className="text-neutral-600 mt-1">Comece com seu material ou uma fonte livre licenciada.</p></div><div className="rounded-2xl bg-white p-4 border"><b>2 · Vetorizar ou editar</b><p className="text-neutral-600 mt-1">Transforme raster em SVG editável ou trate a imagem no Photopea.</p></div><div className="rounded-2xl bg-white p-4 border"><b>3 · IA como assistente</b><p className="text-neutral-600 mt-1">Peça para recriar, adaptar ou refinar sem abandonar a referência.</p></div></div>
              </div>
            </section>
          )}

          {tab === 'search' && (
            <section>
              <div className="rounded-2xl border bg-white p-4">
                <form onSubmit={(event) => { event.preventDefault(); void doSearch(1); }} className="grid gap-3 sm:grid-cols-[220px_1fr_auto] items-end">
                  <label className="text-xs"><span className="block mb-1 font-bold">Biblioteca</span><select value={provider} onChange={(event) => { setProvider(event.target.value as ImageProvider); setItems([]); setSearched(false); setMore(false); }} className="w-full h-11 rounded-xl border px-3 bg-white"><option value="commons">Wikimedia Commons</option><option value="openverse">Openverse</option></select></label>
                  <label className="text-xs"><span className="block mb-1 font-bold">O que você procura?</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="gato, cartografia, textura, arquitetura..." className="w-full h-11 rounded-xl border px-3"/></label>
                  <button type="submit" disabled={busy || !query.trim()} className="h-11 rounded-xl bg-[#27877D] text-white px-5 font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={17} className="animate-spin"/> : <Search size={17}/>}PESQUISAR</button>
                </form>
                <p className="mt-3 text-xs text-neutral-500">A autoria, a fonte e a licença acompanham a imagem.</p>
              </div>
              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((image) => <article key={image.id} className="rounded-2xl overflow-hidden border bg-white flex flex-col min-h-[310px]"><div className="aspect-[4/3] bg-neutral-100 overflow-hidden"><img src={image.thumbnail} alt={image.title} loading="lazy" className="w-full h-full object-cover"/></div><div className="p-3 flex flex-col flex-1"><b className="text-sm line-clamp-2">{image.title}</b><div className="mt-1 text-[11px] text-neutral-500 line-clamp-1">{image.author}</div><div className="mt-1 text-[10px] font-mono uppercase text-neutral-500">{image.license}</div><div className="mt-auto pt-3 flex gap-2"><a href={image.sourceUrl} target="_blank" rel="noreferrer" className="h-9 w-9 border rounded-lg flex items-center justify-center" title="Ver fonte"><ExternalLink size={14}/></a><button type="button" disabled={!!adding} onClick={() => void chooseOpenImage(image)} className="h-9 flex-1 rounded-lg bg-black text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">{adding === image.id ? <Loader2 size={14} className="animate-spin"/> : <ImagePlus size={14}/>}USAR</button></div></div></article>)}
              </div>
              {!busy && searched && !items.length && !error && <div className="mt-5 rounded-2xl border border-dashed p-8 text-center text-sm text-neutral-500">Nenhuma imagem encontrada. Tente outro termo ou troque a biblioteca.</div>}
              {more && <button type="button" disabled={busy} onClick={() => void doSearch(page + 1)} className="mt-5 h-11 rounded-xl border bg-white px-5 font-bold">{busy ? 'BUSCANDO…' : 'CARREGAR MAIS'}</button>}
            </section>
          )}

          {tab === 'edit' && (
            <section className="grid lg:grid-cols-[1fr_1fr] gap-5">
              <div className="rounded-3xl border bg-white p-6 sm:p-8 min-h-[360px] flex flex-col justify-center"><Pencil size={34}/><h2 className="mt-5 text-2xl font-bold">Editar com Photopea</h2><p className="mt-2 text-sm text-neutral-600">Seleção, máscara, recorte, tipografia, filtros, ajuste de cor e camadas. Para converter uma imagem raster em vetores, use a aba VETORIZAR.</p><button type="button" onClick={onOpenEditor} className="mt-6 h-12 rounded-xl bg-black text-white px-5 font-bold flex items-center justify-center gap-2"><Pencil size={18}/>ABRIR PHOTOPEA</button></div>
              <div className="rounded-3xl border bg-neutral-950 text-white p-6 sm:p-8 min-h-[360px]"><div className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/50">EDIÇÃO NÃO DESTRUTIVA</div><h3 className="mt-4 text-xl font-bold">Edite sem achatar o processo.</h3><div className="mt-5 space-y-3 text-sm text-white/70"><p>• Preserve o original e crie versões.</p><p>• Use máscaras e camadas antes de apagar pixels.</p><p>• Quando precisar de formas manipuláveis, vetorize para SVG.</p></div></div>
            </section>
          )}

          {tab === 'trace' && (
            <section className="grid xl:grid-cols-[360px_minmax(0,1fr)] gap-5 items-start">
              <aside className="rounded-3xl border bg-white p-5 sticky top-0">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-500">TRACE · RASTER → VETOR</div>
                <h2 className="mt-2 text-xl font-bold">Vetorizar imagem</h2>
                <p className="mt-2 text-sm text-neutral-600">Fluxo semelhante ao Image Trace do Illustrator/Corel: escolha o nível de detalhe, quantidade de cores, suavização e fundo. O processamento acontece no navegador, sem consumir IA.</p>
                <input ref={traceRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void chooseTrace(event.target.files?.[0])}/>
                <button onClick={() => traceRef.current?.click()} className="mt-4 h-11 w-full rounded-xl border-2 border-black font-bold text-xs flex items-center justify-center gap-2"><Upload size={15}/>{traceFile ? 'TROCAR IMAGEM' : 'ESCOLHER RASTER'}</button>
                {traceFile && <div className="mt-2 text-[10px] text-neutral-500 truncate">{traceFile.name}</div>}
                <div className="mt-5 grid grid-cols-2 gap-2"><button onClick={() => setTraceMode('color')} className={`h-10 rounded-xl border text-xs font-bold ${traceMode === 'color' ? 'bg-black text-white' : ''}`}>CORES</button><button onClick={() => setTraceMode('mono')} className={`h-10 rounded-xl border text-xs font-bold ${traceMode === 'mono' ? 'bg-black text-white' : ''}`}>P&B / LINE ART</button></div>
                {traceMode === 'color' ? <label className="mt-4 block text-[10px] font-mono">NÚMERO DE CORES · {traceColors}<input type="range" min={2} max={10} value={traceColors} onChange={(e) => setTraceColors(Number(e.target.value))} className="mt-2 w-full"/></label> : <label className="mt-4 block text-[10px] font-mono">LIMIAR P&B · {traceThreshold}<input type="range" min={20} max={235} value={traceThreshold} onChange={(e) => setTraceThreshold(Number(e.target.value))} className="mt-2 w-full"/></label>}
                <label className="mt-4 block text-[10px] font-mono">DETALHE · {traceDetail}%<input type="range" min={15} max={100} value={traceDetail} onChange={(e) => setTraceDetail(Number(e.target.value))} className="mt-2 w-full"/></label>
                <label className="mt-4 block text-[10px] font-mono">SUAVIZAÇÃO · {traceSmoothing}<input type="range" min={0} max={8} value={traceSmoothing} onChange={(e) => setTraceSmoothing(Number(e.target.value))} className="mt-2 w-full"/></label>
                <label className="mt-4 flex items-center gap-2 text-xs"><input type="checkbox" checked={traceRemoveBackground} onChange={(e) => setTraceRemoveBackground(e.target.checked)}/>Remover fundo dominante</label>
                <button onClick={() => void runTrace()} disabled={busy || !traceFile} className="mt-5 h-12 w-full rounded-xl bg-black text-white font-bold text-xs disabled:opacity-40 flex items-center justify-center gap-2">{busy ? <Loader2 size={16} className="animate-spin"/> : <WandSparkles size={16}/>}VETORIZAR</button>
                {traceMeta && <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-[10px] text-neutral-600"><b>{traceMeta.pathCount} contornos</b><div className="mt-2 flex gap-1 flex-wrap">{traceMeta.colors.map((color) => <span key={color} title={color} className="h-6 w-6 rounded-full border" style={{ background: color }}/>)}</div></div>}
              </aside>
              <div className="grid lg:grid-cols-2 gap-4 min-h-[560px]">
                <div className="rounded-3xl border bg-[#E9E7E0] p-4 flex flex-col"><div className="text-[10px] font-mono text-neutral-500">ORIGINAL RASTER</div><div className="mt-3 flex-1 min-h-[430px] rounded-2xl border bg-white flex items-center justify-center overflow-hidden p-4">{tracePreview ? <img src={tracePreview} alt="Original" className="max-h-[620px] max-w-full object-contain"/> : <div className="text-sm text-neutral-400 text-center max-w-xs">Escolha uma fotografia, logo JPG/PNG, desenho escaneado ou ilustração raster.</div>}</div></div>
                <div className="rounded-3xl border bg-[#E9E7E0] p-4 flex flex-col"><div className="flex justify-between gap-3 items-center"><div className="text-[10px] font-mono text-neutral-500">SVG EDITÁVEL</div>{traceSvg && <button onClick={() => void saveTrace()} className="h-9 rounded-xl bg-[#27877D] text-white px-3 text-[10px] font-bold">USAR NO CANVAS</button>}</div><div className="mt-3 flex-1 min-h-[430px] rounded-2xl border bg-white flex items-center justify-center overflow-hidden p-4" style={{ backgroundImage: 'linear-gradient(45deg,#f5f5f5 25%,transparent 25%),linear-gradient(-45deg,#f5f5f5 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#f5f5f5 75%),linear-gradient(-45deg,transparent 75%,#f5f5f5 75%)', backgroundSize: '20px 20px', backgroundPosition: '0 0,0 10px,10px -10px,-10px 0px' }}>{traceSvg ? <img alt="Trace vetorial" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(traceSvg)}`} className="max-h-[620px] max-w-full object-contain"/> : <div className="text-sm text-neutral-400 text-center max-w-xs">O resultado vetorial aparece aqui. Ajuste detalhe, suavização e cores até chegar à forma desejada.</div>}</div></div>
              </div>
            </section>
          )}

          {tab === 'generate' && (
            <section className="grid xl:grid-cols-[420px_minmax(0,1fr)] gap-5">
              <div className="rounded-3xl border bg-white p-5 sm:p-6">
                <WandSparkles size={30}/><h2 className="mt-4 text-xl font-bold">Assistente visual por IA</h2>
                <p className="mt-2 text-sm text-neutral-600">Em vez de apenas “gerar uma imagem”, o fluxo lê a referência, entende o que você quer preservar e atua sobre ela. A saída continua sendo SVG editável.</p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {([
                    ['create','CRIAR NOVO'],['recreate','RECRIAR EM VETOR'],['adapt','ADAPTAR'],['refine','REFINAR'],
                  ] as Array<[AiImageAction,string]>).map(([value,label]) => <button key={value} onClick={() => setAiAction(value)} className={`min-h-10 rounded-xl border px-2 text-[10px] font-bold ${aiAction === value ? 'bg-black text-white' : ''}`}>{label}</button>)}
                </div>
                {aiAction !== 'create' && <div className="mt-4 rounded-2xl border bg-neutral-50 p-3"><input ref={referenceRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void chooseReference(event.target.files?.[0])}/><button onClick={() => referenceRef.current?.click()} className="h-10 w-full rounded-xl border bg-white text-xs font-bold flex items-center justify-center gap-2"><Upload size={14}/>{referenceFile ? 'TROCAR REFERÊNCIA' : 'ESCOLHER REFERÊNCIA'}</button>{referencePreview && <div className="mt-3 h-36 rounded-xl overflow-hidden bg-white border flex items-center justify-center"><img src={referencePreview} alt="Referência" className="w-full h-full object-contain"/></div>}<div className="mt-3 text-[9px] font-mono text-neutral-500">PRESERVAR</div><div className="mt-2 grid gap-2 text-xs"><label className="flex gap-2"><input type="checkbox" checked={preserveComposition} onChange={(e) => setPreserveComposition(e.target.checked)}/>Composição</label><label className="flex gap-2"><input type="checkbox" checked={preservePalette} onChange={(e) => setPreservePalette(e.target.checked)}/>Paleta</label><label className="flex gap-2"><input type="checkbox" checked={preserveSilhouette} onChange={(e) => setPreserveSilhouette(e.target.checked)}/>Silhueta / estrutura</label></div></div>}
                <label className="block mt-5 text-xs font-bold">Diga o trabalho, não só o resultado</label>
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={8} placeholder={aiAction === 'create' ? 'Ex.: crie uma ilustração botânica de araucária, line art minimalista, fundo transparente...' : 'Ex.: mantenha a composição, simplifique em 4 cores, transforme em line art editorial e preserve a silhueta principal...'} className="mt-2 w-full rounded-xl border p-3 resize-y"/>
                <button type="button" onClick={() => void generate()} disabled={busy || !prompt.trim()} className="mt-4 h-12 w-full rounded-xl bg-black text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}EXECUTAR COM IA</button>
                <div className="mt-4 rounded-xl bg-[#E6F6F2] border border-[#A8DED4] p-3 text-[11px] text-[#174C46]"><b>Fluxo de produção:</b> a IA recebe sua instrução e, quando houver referência, a imagem junto. Ela devolve vetor editável, não uma camada raster achatada.</div>
              </div>
              <div className="rounded-3xl border bg-[#EEECE5] min-h-[560px] p-5 sm:p-6 flex flex-col">
                <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-500">RESULTADO EDITÁVEL</div><b className="text-sm">SVG produzido pela IA</b></div>{generatedSvg && <button type="button" onClick={() => void saveGenerated()} disabled={busy} className="h-10 rounded-xl bg-[#27877D] text-white px-4 text-xs font-bold flex items-center gap-2"><ImagePlus size={15}/>USAR NO CANVAS</button>}</div>
                <div className="mt-4 flex-1 min-h-[420px] rounded-2xl border bg-white flex items-center justify-center overflow-hidden p-5">{generatedSvg ? <img alt="Imagem gerada" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(generatedSvg)}`} className="max-h-[620px] max-w-full object-contain"/> : <div className="max-w-md text-center text-sm text-neutral-400">A prévia aparecerá aqui. Nos modos de referência, a IA primeiro recebe a imagem e as regras do que deve preservar; depois recria, adapta ou refina.</div>}</div>
                {!!generatedNotes.length && <div className="mt-4 rounded-2xl bg-white border p-4"><div className="text-[9px] font-mono text-neutral-500">O QUE FOI FEITO</div><ul className="mt-2 space-y-1 text-xs text-neutral-700">{generatedNotes.map((note,index) => <li key={index}>• {note}</li>)}</ul></div>}
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
