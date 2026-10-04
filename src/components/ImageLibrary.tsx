import React, { useEffect, useRef, useState } from "react";
import { Search, X, Loader2, ImagePlus } from "lucide-react";
import {
  searchOpenImages,
  type OpenImage,
  type ImageProvider,
} from "../lib/openImages";
export default function ImageLibrary({
  onChoose,
  onClose,
}: {
  onChoose: (image: OpenImage) => Promise<void> | void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(""),
    [provider, setProvider] = useState<ImageProvider>("commons"),
    [items, setItems] = useState<OpenImage[]>([]),
    [busy, setBusy] = useState(false),
    [adding, setAdding] = useState(""),
    [error, setError] = useState(""),
    [more, setMore] = useState(false),
    [page, setPage] = useState(1),
    [searched, setSearched] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const search = async (nextPage = 1) => {
    if (!query.trim()) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setError("");
    setSearched(true);
    try {
      const result = await searchOpenImages(
        provider,
        query,
        nextPage,
        controller.signal,
      );
      setItems((current) =>
        nextPage === 1
          ? result.images
          : [
              ...current,
              ...result.images.filter(
                (item) => !current.some((old) => old.id === item.id),
              ),
            ],
      );
      setMore(result.more);
      setPage(nextPage);
    } catch (error: any) {
      if (error.name !== "AbortError") setError(error.message);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const choose = async (image: OpenImage) => {
    setAdding(image.id);
    setError("");
    try {
      await onChoose(image);
    } catch (error: any) {
      setError(error.message || "Não foi possível importar a imagem.");
    } finally {
      setAdding("");
    }
  };
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Pesquisar imagens livres"
      className="open-image-dialog"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header>
        <div>
          <b>Pesquisar imagens livres</b>
          <p>Autoria e licença acompanham a imagem no projeto.</p>
        </div>
        <button
          type="button"
          aria-label="Fechar busca de imagens"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <label>
          Biblioteca
          <select
            aria-label="Biblioteca de imagens"
            value={provider}
            onChange={(event) => {
              abort.current?.abort();
              setBusy(false);
              setProvider(event.target.value as ImageProvider);
              setItems([]);
              setMore(false);
              setSearched(false);
            }}
          >
            <option value="commons">Wikimedia Commons</option>
            <option value="openverse">Openverse</option>
          </select>
        </label>
        <label>
          O que você procura?
          <input
            autoFocus
            aria-label="Buscar imagens"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Gatos, texturas, arquitetura..."
          />
        </label>
        <button type="submit" disabled={busy || !query.trim()}>
          {busy ? <Loader2 className="animate-spin" /> : <Search />}Pesquisar
        </button>
      </form>
      <p className="open-image-note">
        Resultados em domínio público, CC0, CC BY ou CC BY-SA. Confira a fonte e
        preserve os créditos e as condições de compartilhamento da licença.
      </p>
      {error && (
        <p role="alert" className="open-image-error">
          {error}
        </p>
      )}
      <div className="open-image-results">
        {items.map((image) => (
          <article key={image.id}>
            <img
              src={image.thumbnail}
              loading="lazy"
              alt={image.title}
              onError={(event) =>
                (event.currentTarget.style.visibility = "hidden")
              }
            />
            <div>
              <b>{image.title}</b>
              <p>{image.author}</p>
              <a href={image.licenseUrl} target="_blank" rel="noreferrer">
                {image.license}
              </a>
              <a href={image.sourceUrl} target="_blank" rel="noreferrer">
                Ver fonte ↗
              </a>
              <button
                type="button"
                disabled={!!adding}
                onClick={() => void choose(image)}
              >
                {adding === image.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ImagePlus />
                )}
                Usar imagem
              </button>
            </div>
          </article>
        ))}
        {!busy && searched && !items.length && !error && (
          <p>
            Nenhuma imagem com as licenças selecionadas foi encontrada. Tente
            outro termo ou outra biblioteca.
          </p>
        )}
      </div>
      {more && (
        <button
          type="button"
          className="open-image-more"
          disabled={busy}
          onClick={() => void search(page + 1)}
        >
          {busy ? "Buscando…" : "Carregar mais imagens"}
        </button>
      )}
    </section>
  );
}

