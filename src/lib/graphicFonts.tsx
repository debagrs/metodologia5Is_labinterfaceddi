import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

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
  "Arial", "Georgia", "Verdana", "Times New Roman", "Trebuchet MS", "Courier New",
  "sans-serif", "serif", "monospace",
]);

const SYSTEM_FONTS = ["Arial", "Georgia", "Verdana", "Times New Roman", "Trebuchet MS", "Courier New"];

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

const fontStack = (family: string) => {
  const safe = String(family || "Inter").replace(/["\\]/g, "");
  if (safe === "serif" || safe === "sans-serif" || safe === "monospace") return safe;
  return `"${safe}", sans-serif`;
};

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

    const googleUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
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

/**
 * Renders any label/sample in the real family and lazy-loads that family when
 * it approaches the viewport. This is intentionally reusable outside the
 * picker so catalogue cards and previews behave the same way on desktop/mobile.
 */
export function FontPreview({
  family,
  children,
  className = "",
  style,
}: {
  family: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!family || !node) return;
    if (!("IntersectionObserver" in window)) {
      void loadGraphicFont(family).catch(() => {});
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        void loadGraphicFont(family).catch(() => {});
        observer.disconnect();
      }
    }, { rootMargin: "240px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [family]);

  return <span ref={ref} className={className} style={{ ...style, fontFamily: fontStack(family) }}>{children}</span>;
}

export function FontPicker({
  value,
  onChange,
  preferred = [],
  previewText = "Aa Bb Cc 0123 · Design para projetos",
  compact = false,
}: {
  value: string;
  onChange: (family: string) => void;
  preferred?: string[];
  previewText?: string;
  compact?: boolean;
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [families, setFamilies] = useState([...GOOGLE_FALLBACK, ...FONTSHARE_FALLBACK]);
  const [fontshareNames, setFontshareNames] = useState<Set<string>>(new Set(FONTSHARE_FALLBACK));
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});

  useGraphicFonts([value]);

  useEffect(() => {
    let alive = true;
    void Promise.all([getGoogleFontFamilies(), getFontshareFamilies()]).then(([google, fontshare]) => {
      if (!alive) return;
      setFontshareNames(new Set(fontshare.map((item) => item.family)));
      setFamilies([...new Set([...fontshare.map((item) => item.family), ...google])].sort((a, b) => a.localeCompare(b)));
    });
    return () => { alive = false; };
  }, []);

  const allFamilies = useMemo(
    () => [...new Set([...preferred, value, ...families, ...SYSTEM_FONTS])].filter(Boolean),
    [preferred, value, families],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = q ? allFamilies.filter((family) => family.toLowerCase().includes(q)) : allFamilies;
    return base.slice(0, 80);
  }, [allFamilies, query]);

  const exactQuery = query.trim() && allFamilies.some((family) => family.toLowerCase() === query.trim().toLowerCase());

  const updatePosition = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const margin = 8;
    const width = Math.min(Math.max(rect.width, 310), window.innerWidth - margin * 2);
    const maxHeight = Math.min(430, window.innerHeight - margin * 2);
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const placeAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
    const left = Math.min(Math.max(margin, rect.left), Math.max(margin, window.innerWidth - width - margin));
    const top = placeAbove
      ? Math.max(margin, rect.top - Math.min(maxHeight, spaceAbove) - 6)
      : Math.min(window.innerHeight - margin - Math.min(maxHeight, Math.max(220, spaceBelow)), rect.bottom + 6);
    setPanelStyle({ left, top, width, maxHeight: placeAbove ? Math.min(maxHeight, spaceAbove) : Math.min(maxHeight, Math.max(220, spaceBelow)) });
  };

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = window.requestAnimationFrame(() => searchRef.current?.focus());
    const onWindowChange = () => updatePosition();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return;
      setOpen(false);
    };
    window.addEventListener("resize", onWindowChange);
    window.addEventListener("scroll", onWindowChange, true);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onWindowChange);
      window.removeEventListener("scroll", onWindowChange, true);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const choose = (family: string) => {
    const next = family.trim();
    if (!next) return;
    onChange(next);
    void loadGraphicFont(next).catch(() => {});
    setOpen(false);
    setQuery("");
  };

  return (
    <div className={`font-picker ${compact ? "font-picker--compact" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="font-picker__trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => { setOpen((current) => !current); setQuery(""); }}
        title={`Fonte: ${value}`}
      >
        <span className="font-picker__selected">
          <FontPreview family={value} className="font-picker__selected-name">{value}</FontPreview>
          {!compact && <FontPreview family={value} className="font-picker__selected-sample">Aa Bb Cc 0123</FontPreview>}
        </span>
        <span className="font-picker__chevron" aria-hidden="true">▾</span>
      </button>

      {!compact && (
        <FontPreview family={value} className="font-picker__live-preview">
          {previewText}
        </FontPreview>
      )}

      {open && typeof document !== "undefined" ? createPortal(
        <div ref={panelRef} className="font-picker__popover" style={panelStyle} role="dialog" aria-label="Escolher tipografia">
          <div className="font-picker__search-wrap">
            <span aria-hidden="true">⌕</span>
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar Google Fonts + Fontshare…"
              aria-label="Buscar tipografia"
            />
          </div>
          <div className="font-picker__list" role="listbox" aria-label="Famílias tipográficas">
            {query.trim() && !exactQuery && (
              <button type="button" className="font-picker__custom" onClick={() => choose(query)}>
                Usar “{query.trim()}”
                <span>fonte instalada ou família personalizada</span>
              </button>
            )}
            {filtered.map((family) => {
              const active = family === value;
              return (
                <button
                  key={family}
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`font-picker__option ${active ? "is-active" : ""}`}
                  onClick={() => choose(family)}
                  onPointerEnter={() => { void loadGraphicFont(family).catch(() => {}); }}
                  onFocus={() => { void loadGraphicFont(family).catch(() => {}); }}
                >
                  <span className="font-picker__option-main">
                    <FontPreview family={family} className="font-picker__option-name">{family}</FontPreview>
                    <span className="font-picker__provider">{fontshareNames.has(family) ? "FONTSHARE" : SYSTEM.has(family) ? "SISTEMA" : "GOOGLE"}</span>
                  </span>
                  <FontPreview family={family} className="font-picker__option-sample">Aa Bb Cc 0123456789</FontPreview>
                </button>
              );
            })}
            {!filtered.length && <div className="font-picker__empty">Nenhuma família encontrada.</div>}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
