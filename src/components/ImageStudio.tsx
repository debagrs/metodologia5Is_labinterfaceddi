import React, { useEffect, useRef, useState } from 'react';
import { ImagePlus, Search, Pencil, Sparkles, Upload, X, Loader2, ExternalLink, WandSparkles } from 'lucide-react';
import { ensureTursoSession } from '../lib/turso';
import { imageCredit, searchOpenImages, type ImageProvider, type OpenImage } from '../lib/openImages';

type Tab = 'upload' | 'search' | 'edit' | 'generate';

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
  const inputRef = useRef<HTMLInputElement>(null);
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

  const generate = async () => {
    if (!prompt.trim()) return;
    setBusy(true);
    setError('');
    setGeneratedSvg('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({ mode: 'image-svg', prompt: prompt.trim() }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.generatedImage?.svg) {
        throw new Error(data?.error || 'A IA não conseguiu gerar a imagem.');
      }
      setGeneratedSvg(String(data.generatedImage.svg));
      const safeName = String(data.generatedImage.name || 'imagem-gerada')
        .replace(/[^a-z0-9-_]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'imagem-gerada';
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
    } finally {
      setBusy(false);
    }
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode; hint: string }> = [
    { id: 'upload', label: 'UPAR', icon: <Upload size={17}/>, hint: 'PNG, JPG, WEBP ou SVG do seu computador.' },
    { id: 'search', label: 'BUSCAR', icon: <Search size={17}/>, hint: 'Wikimedia Commons e Openverse, com licença visível.' },
    { id: 'edit', label: 'EDITAR', icon: <Pencil size={17}/>, hint: 'Photopea com camadas, máscara, texto, seleção e filtros.' },
    { id: 'generate', label: 'GERAR', icon: <Sparkles size={17}/>, hint: 'Gere uma ilustração vetorial SVG editável com IA.' },
  ];

  return (
    <div className="fixed inset-0 z-[190] bg-[#F4F3EE] flex flex-col" onPointerDown={(event) => event.stopPropagation()}>
      <header className="h-auto min-h-[70px] border-b border-black/15 bg-white px-4 sm:px-6 py-3 flex items-center gap-3">
        <button type="button" aria-label="Fechar imagens" onClick={onClose} className="h-10 w-10 shrink-0 rounded-xl hover:bg-black/5 flex items-center justify-center"><X size={20}/></button>
        <div className="min-w-0">
          <b className="block text-lg leading-tight">Imagem</b>
          <div className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.14em] text-neutral-500">UPAR · BUSCAR LIVRE · EDITAR · GERAR</div>
        </div>
      </header>

      <div className="border-b bg-white px-3 sm:px-6 py-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
        {tabs.map((item) => (
          <button key={item.id} type="button" onClick={() => { setTab(item.id); setError(''); }} className={`min-h-11 rounded-xl border px-3 flex items-center justify-center gap-2 text-xs font-bold ${tab === item.id ? 'bg-black text-white border-black' : 'bg-white hover:border-black'}`} title={item.hint}>
            {item.icon}<span>{item.label}</span>
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-auto p-4 sm:p-6">
        <div className="mx-auto w-full max-w-6xl">
          {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

          {tab === 'upload' && (
            <section className="grid lg:grid-cols-[1fr_1fr] gap-5 items-stretch">
              <div className="rounded-3xl border bg-white p-6 sm:p-8 flex flex-col justify-center min-h-[360px]">
                <ImagePlus size={34}/>
                <h2 className="mt-5 text-2xl font-bold">Adicionar imagem ao projeto</h2>
                <p className="mt-2 text-sm text-neutral-600 max-w-xl">Use imagens próprias, fotografias, ilustrações, mapas exportados, SVGs ou screenshots. O arquivo entra como elemento visual no canvas e depois pode ser aberto no Photopea.</p>
                <input ref={inputRef} type="file" accept="image/*,.svg" className="hidden" onChange={(event) => void chooseUpload(event.target.files?.[0])}/>
                <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="mt-6 h-12 rounded-xl bg-black text-white px-5 font-bold flex items-center justify-center gap-2 disabled:opacity-50">
                  {busy ? <Loader2 size={18} className="animate-spin"/> : <Upload size={18}/>} ESCOLHER ARQUIVO
                </button>
              </div>
              <div className="rounded-3xl border bg-[#EEECE5] p-6 sm:p-8 min-h-[360px] flex flex-col justify-center">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-500">FLUXO RECOMENDADO</div>
                <div className="mt-4 grid gap-3 text-sm">
                  <div className="rounded-2xl bg-white p-4 border"><b>1 · Upar</b><p className="text-neutral-600 mt-1">Insira o arquivo original, sem perder a autoria.</p></div>
                  <div className="rounded-2xl bg-white p-4 border"><b>2 · Editar</b><p className="text-neutral-600 mt-1">Abra o item no Photopea para recorte, máscara, texto, camadas e filtros.</p></div>
                  <div className="rounded-2xl bg-white p-4 border"><b>3 · Salvar no canvas</b><p className="text-neutral-600 mt-1">A versão editada volta para o projeto como imagem reutilizável.</p></div>
                </div>
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
                <p className="mt-3 text-xs text-neutral-500">A autoria, a fonte e a licença acompanham a imagem. Se o Openverse estiver temporariamente indisponível, a busca tenta o Wikimedia Commons automaticamente.</p>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map((image) => (
                  <article key={image.id} className="rounded-2xl overflow-hidden border bg-white flex flex-col min-h-[310px]">
                    <div className="aspect-[4/3] bg-neutral-100 overflow-hidden"><img src={image.thumbnail} alt={image.title} loading="lazy" className="w-full h-full object-cover"/></div>
                    <div className="p-3 flex flex-col flex-1">
                      <b className="text-sm line-clamp-2">{image.title}</b>
                      <div className="mt-1 text-[11px] text-neutral-500 line-clamp-1">{image.author}</div>
                      <div className="mt-1 text-[10px] font-mono uppercase text-neutral-500">{image.license}</div>
                      <div className="mt-auto pt-3 flex gap-2">
                        <a href={image.sourceUrl} target="_blank" rel="noreferrer" className="h-9 w-9 border rounded-lg flex items-center justify-center" title="Ver fonte"><ExternalLink size={14}/></a>
                        <button type="button" disabled={!!adding} onClick={() => void chooseOpenImage(image)} className="h-9 flex-1 rounded-lg bg-black text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50">{adding === image.id ? <Loader2 size={14} className="animate-spin"/> : <ImagePlus size={14}/>}USAR</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              {!busy && searched && !items.length && !error && <div className="mt-5 rounded-2xl border border-dashed p-8 text-center text-sm text-neutral-500">Nenhuma imagem encontrada. Tente outro termo ou troque a biblioteca.</div>}
              {more && <button type="button" disabled={busy} onClick={() => void doSearch(page + 1)} className="mt-5 h-11 rounded-xl border bg-white px-5 font-bold">{busy ? 'BUSCANDO…' : 'CARREGAR MAIS'}</button>}
            </section>
          )}

          {tab === 'edit' && (
            <section className="grid lg:grid-cols-[1fr_1fr] gap-5">
              <div className="rounded-3xl border bg-white p-6 sm:p-8 min-h-[360px] flex flex-col justify-center">
                <Pencil size={34}/>
                <h2 className="mt-5 text-2xl font-bold">Editar com Photopea</h2>
                <p className="mt-2 text-sm text-neutral-600">Editor com camadas dentro do fluxo do projeto: seleção, máscara, recorte, tipografia, filtros, ajuste de cor e exportação. Você também pode abrir qualquer imagem já inserida no canvas pelo ícone de editar do próprio card.</p>
                <button type="button" onClick={onOpenEditor} className="mt-6 h-12 rounded-xl bg-black text-white px-5 font-bold flex items-center justify-center gap-2"><Pencil size={18}/>ABRIR PHOTOPEA</button>
              </div>
              <div className="rounded-3xl border bg-neutral-950 text-white p-6 sm:p-8 min-h-[360px]">
                <div className="text-[10px] font-mono uppercase tracking-[0.14em] text-white/50">EDIÇÃO NÃO DESTRUTIVA</div>
                <h3 className="mt-4 text-xl font-bold">Mantenha o original e salve uma nova versão.</h3>
                <div className="mt-5 space-y-3 text-sm text-white/70"><p>• Trabalhe com camadas e máscaras antes de apagar pixels.</p><p>• Preserve proporção e resolução quando o material for editorial.</p><p>• Use SVG para vetores; PNG quando precisar de transparência; JPG para fotografia sem transparência.</p></div>
              </div>
            </section>
          )}

          {tab === 'generate' && (
            <section className="grid lg:grid-cols-[minmax(320px,0.8fr)_minmax(420px,1.2fr)] gap-5">
              <div className="rounded-3xl border bg-white p-5 sm:p-6">
                <WandSparkles size={30}/>
                <h2 className="mt-4 text-xl font-bold">Gerar imagem vetorial</h2>
                <p className="mt-2 text-sm text-neutral-600">A IA gera SVG editável, útil para ilustração, ícone, composição gráfica, esquema ou elemento visual. Depois você pode abrir o resultado no editor.</p>
                <label className="block mt-5 text-xs font-bold">Descreva o que deseja</label>
                <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} rows={8} placeholder="Ex.: ilustração botânica de uma araucária, line art minimalista, fundo transparente, composição vertical..." className="mt-2 w-full rounded-xl border p-3 resize-y"/>
                <button type="button" onClick={() => void generate()} disabled={busy || !prompt.trim()} className="mt-4 h-12 w-full rounded-xl bg-black text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">{busy ? <Loader2 size={18} className="animate-spin"/> : <Sparkles size={18}/>}GERAR SVG</button>
              </div>
              <div className="rounded-3xl border bg-[#EEECE5] min-h-[480px] p-5 sm:p-6 flex flex-col">
                <div className="flex items-center justify-between gap-3"><div><div className="text-[10px] font-mono uppercase tracking-[0.14em] text-neutral-500">PRÉVIA</div><b className="text-sm">Imagem gerada</b></div>{generatedSvg && <button type="button" onClick={() => void saveGenerated()} disabled={busy} className="h-10 rounded-xl bg-[#27877D] text-white px-4 text-xs font-bold flex items-center gap-2"><ImagePlus size={15}/>USAR NO CANVAS</button>}</div>
                <div className="mt-4 flex-1 min-h-[360px] rounded-2xl border bg-white flex items-center justify-center overflow-hidden p-5">
                  {generatedSvg ? <img alt="Imagem gerada" src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(generatedSvg)}`} className="max-h-[520px] max-w-full object-contain"/> : <div className="max-w-sm text-center text-sm text-neutral-400">A prévia aparecerá aqui. O resultado é SVG para poder continuar sendo trabalhado como material de design.</div>}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
