import { useEffect, useId, useState, useRef } from "react";

const GOOGLE_FALLBACK = [
  "Inter", "Roboto", "Open Sans", "Montserrat", "Poppins", "Lato", "Nunito", "Raleway",
  "Merriweather", "Playfair Display", "IBM Plex Mono", "Space Grotesk", "DM Sans", "Oswald",
  "Bebas Neue", "Manrope", "Source Sans 3", "Noto Sans",
];

/**
 * Curated fallback only. The live catalogue is fetched from Fontshare's public,
 * unauthenticated JSON endpoint whenever it is available.
 */
export const FONTSHARE_FALLBACK = [
  "Satoshi", "General Sans", "Switzer", "Clash Display", "Clash Grotesk", "Cabinet Grotesk",
  "Sentient", "Zodiak", "Supreme", "Chillax", "Author", "Ranade", "Plein", "Stardom",
  "Bespoke Sans", "Bespoke Serif", "Boska", "Melodrama", "Gambetta", "Technor",
];

const SYSTEM = new Set([
  "Arial", "Georgia", "Verdana", "Times New Roman", "sans-serif", "serif", "monospace",
]);

type FontshareFamily = { family: string; slug: string };
let googleCatalog: Promise<string[]> | undefined;
let fontshareCatalog: Promise<FontshareFamily[]> | undefined;
const loading = new Map<string, Promise<void>>();

const slugifyFontshare = (family: string) => family
  .trim()
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "");

function findArray(value: any, depth = 0): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object" || depth > 3) return [];
  for (const key of ["data", "fonts", "items", "results", "families"]) {
    const direct = value[key];
    if (Array.isArray(direct)) return direct;
    const nested = findArray(direct, depth + 1);
    if (nested.length) return nested;
  }
  for (const child of Object.values(value)) {
    const nested = findArray(child, depth + 1);
    if (nested.length) return nested;
  }
  return [];
}

export function getFontshareFamilies(): Promise<FontshareFamily[]> {
  if (fontshareCatalog) return fontshareCatalog;
  fontshareCatalog = fetch("https://api.fontshare.com/v2/fonts?limit=100&offset=0")
    .then((response) => {
      if (!response.ok) throw new Error("Fontshare indisponível");
      return response.json();
    })
    .then((payload) => {
      const items = findArray(payload);
      const parsed = items.map((item: any) => {
        const family = String(item?.name || item?.family || item?.font_name || item?.display_name || "").trim();
        const slug = String(item?.slug || item?.url_slug || slugifyFontshare(family)).trim();
        return family ? { family, slug: slugifyFontshare(slug) || slugifyFontshare(family) } : null;
      }).filter(Boolean) as FontshareFamily[];
      if (!parsed.length) throw new Error("Catálogo Fontshare vazio");
      return parsed;
    })
    .catch(() => FONTSHARE_FALLBACK.map((family) => ({ family, slug: slugifyFontshare(family) })));
  return fontshareCatalog;
}

export async function getGoogleFontFamilies(): Promise<string[]> {
  if (!googleCatalog) {
    googleCatalog = fetch("/api/google-fonts")
      .then((response) => {
        if (!response.ok) throw new Error("Google Fonts indisponível");
        return response.json();
      })
      .then((data) => Array.isArray(data.items) ? data.items.map((item: any) => String(item.family)).filter(Boolean) : GOOGLE_FALLBACK)
      .catch(() => {
        googleCatalog = undefined;
        return GOOGLE_FALLBACK;
      });
  }
  return googleCatalog;
}

function appendStylesheet(key: string, href: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[data-graphic-font-key="${CSS.escape(key)}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") resolve();
      else {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("Falha ao carregar fonte")), { once: true });
      }
      return;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.dataset.graphicFontKey = key;
    link.href = href;
    const timer = window.setTimeout(() => reject(new Error("Timeout de fonte")), 15000);
    link.onload = () => { clearTimeout(timer); link.dataset.loaded = "true"; resolve(); };
    link.onerror = () => { clearTimeout(timer); reject(new Error("Falha ao carregar fonte")); };
    document.head.appendChild(link);
  });
}

async function fontshareInfo(family: string): Promise<FontshareFamily | undefined> {
  const list = await getFontshareFamilies();
  const needle = family.trim().toLowerCase();
  return list.find((item) => item.family.toLowerCase() === needle);
}

/**
 * Loads a family from Fontshare when the family exists there; otherwise falls
 * back to Google Fonts. This lets old project documents keep storing only the
 * family name while still working after Fontshare is enabled.
 */
export function loadGraphicFont(family: string) {
  if (!family || SYSTEM.has(family)) return Promise.resolve();
  const key = family.trim().toLowerCase();
  if (loading.has(key)) return loading.get(key)!;

  const promise = (async () => {
    const fs = await fontshareInfo(family).catch(() => undefined);
    if (fs) {
      const urls = [
        `https://api.fontshare.com/v2/css?f[]=${encodeURIComponent(fs.slug)}@400,500,600,700&display=swap`,
        `https://api.fontshare.com/v2/css?f[]=${encodeURIComponent(fs.slug)}@400&display=swap`,
      ];
      for (let index = 0; index < urls.length; index += 1) {
        try {
          await appendStylesheet(`fontshare:${fs.slug}:${index}`, urls[index]);
          await document.fonts.load(`400 24px "${family.replace(/["\\]/g, "")}"`);
          return;
        } catch {
          // Some Fontshare families expose a different set of static weights.
          // Retry with regular-only before falling back to a same-name Google family.
        }
      }
    }

    const googleUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;700&display=swap`;
    await appendStylesheet(`google:${key}`, googleUrl);
    await document.fonts.load(`400 24px "${family.replace(/["\\]/g, "")}"`);
    await document.fonts.load(`700 24px "${family.replace(/["\\]/g, "")}"`);
  })().catch((error) => {
    loading.delete(key);
    throw error;
  });

  loading.set(key, promise);
  return promise;
}

export async function ensureGraphicFonts(families: Array<string | undefined>) {
  await Promise.all([...new Set(families.filter(Boolean) as string[])].map(loadGraphicFont));
}

export function useGraphicFonts(families: Array<string | undefined>) {
  const key = JSON.stringify([...new Set(families.filter(Boolean))].sort());
  useEffect(() => { void ensureGraphicFonts(JSON.parse(key)).catch(() => {}); }, [key]);
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
  const [families, setFamilies] = useState([...GOOGLE_FALLBACK, ...FONTSHARE_FALLBACK]);
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
    void Promise.all([getGoogleFontFamilies(), getFontshareFamilies()]).then(([google, fontshare]) => {
      if (!alive) return;
      setFamilies([...new Set([...fontshare.map((item) => item.family), ...google])]);
    });
    return () => { alive = false; };
  }, []);

  return (
    <>
      <input
        aria-label="Fonte Google Fonts ou Fontshare"
        list={listId}
        value={query}
        onChange={(e) => {
          typed.current = e.target.value;
          setQuery(e.target.value);
          if ([...families, ...preferred, "Arial", "Georgia"].includes(e.target.value)) {
            committed.current = e.target.value;
            onChange(e.target.value);
            void loadGraphicFont(e.target.value).catch(() => {});
          }
        }}
        onBlur={() => {
          if (typed.current.trim() && typed.current.trim() !== committed.current) {
            committed.current = typed.current.trim();
            onChange(typed.current.trim());
            void loadGraphicFont(typed.current.trim()).catch(() => {});
          } else setQuery(value);
        }}
        placeholder="Pesquisar Google Fonts + Fontshare…"
      />
      <datalist id={listId}>
        {[...new Set([...preferred, value, ...families, "Arial", "Georgia"])].filter(Boolean).map((font) => (
          <option key={font} value={font} />
        ))}
      </datalist>
    </>
  );
}
