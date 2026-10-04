import { useEffect, useId, useState, useRef } from "react";
const FALLBACK = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Lato",
  "Nunito",
  "Raleway",
  "Merriweather",
  "Playfair Display",
  "IBM Plex Mono",
  "Space Grotesk",
  "DM Sans",
  "Oswald",
  "Bebas Neue",
  "Manrope",
  "Source Sans 3",
  "Noto Sans",
];
const SYSTEM = new Set([
  "Arial",
  "Georgia",
  "Verdana",
  "Times New Roman",
  "sans-serif",
  "serif",
  "monospace",
]);
let catalog: Promise<string[]> | undefined;
const loading = new Map<string, Promise<void>>();
export function loadGraphicFont(family: string) {
  if (!family || SYSTEM.has(family)) return Promise.resolve();
  if (loading.has(family)) return loading.get(family)!;
  const promise = new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.graphicFont = family;
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`;
    const timer = window.setTimeout(
      () =>
        reject(
          new Error(
            `A fonte ${family} não carregou. Verifique sua conexão antes de exportar.`,
          ),
        ),
      15000,
    );
    link.onload = () => {
      clearTimeout(timer);
      resolve();
    };
    let fallback = false;
    link.onerror = () => {
      if (!fallback) {
        fallback = true;
        link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}&display=swap`;
        return;
      }
      clearTimeout(timer);
      reject(new Error(`Não foi possível carregar a fonte ${family}.`));
    };
    document.head.appendChild(link);
  })
    .then(async () => {
      await document.fonts.load(`400 24px "${family.replace(/["\\]/g, "")}"`);
      await document.fonts.load(`700 24px "${family.replace(/["\\]/g, "")}"`);
    })
    .catch((e) => {
      loading.delete(family);
      throw e;
    });
  loading.set(family, promise);
  return promise;
}
export async function ensureGraphicFonts(families: Array<string | undefined>) {
  await Promise.all(
    [...new Set(families.filter(Boolean) as string[])].map(loadGraphicFont),
  );
}
export function useGraphicFonts(families: Array<string | undefined>) {
  const key = JSON.stringify([...new Set(families.filter(Boolean))].sort());
  useEffect(() => {
    void ensureGraphicFonts(JSON.parse(key)).catch(() => {});
  }, [key]);
}
export function FontPicker({
  value,
  onChange,
  preferred = [],
}: {
  value: string;
  onChange: (family: string) => void;
  preferred?: string[];
}) {
  const listId = useId();
  const [families, setFamilies] = useState(FALLBACK);
  const [query, setQuery] = useState(value);
  const committed = useRef(value);
  const typed = useRef(value);
  useEffect(() => {
    setQuery(value);
    committed.current = value;
    typed.current = value;
  }, [value]);
  useEffect(() => {
    let alive = true;
    catalog ||= fetch("/api/google-fonts")
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((d) =>
        Array.isArray(d.items)
          ? d.items.map((i: any) => String(i.family))
          : FALLBACK,
      )
      .catch(() => {
        catalog = undefined;
        return FALLBACK;
      });
    catalog.then((items) => {
      if (alive) setFamilies(items);
    });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <>
      <input
        aria-label="Fonte Google Fonts"
        list={listId}
        value={query}
        onChange={(e) => {
          typed.current = e.target.value;
          setQuery(e.target.value);
          if (
            [...families, ...preferred, "Arial", "Georgia"].includes(
              e.target.value,
            )
          ) {
            committed.current = e.target.value;
            onChange(e.target.value);
          }
        }}
        onBlur={() => {
          if (
            typed.current.trim() &&
            typed.current.trim() !== committed.current
          ) {
            committed.current = typed.current.trim();
            onChange(typed.current.trim());
          } else setQuery(value);
        }}
        placeholder="Pesquisar Google Fonts…"
      />
      <datalist id={listId}>
        {[...new Set([...preferred, value, ...families, "Arial", "Georgia"])]
          .filter(Boolean)
          .map((f) => (
            <option key={f} value={f} />
          ))}
      </datalist>
    </>
  );
}
