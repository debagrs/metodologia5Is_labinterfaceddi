export interface OpenImage {
  id: string;
  title: string;
  url: string;
  thumbnail: string;
  width: number;
  height: number;
  author: string;
  license: string;
  licenseUrl: string;
  sourceUrl: string;
  provider: string;
}
export type ImageProvider = "commons" | "openverse";
const plain = (value: unknown) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
const https = (value: unknown) => {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};
export function permittedLicense(value: string) {
  const normalized = value.toLowerCase();
  return (
    !/\bnc\b|\bnd\b|noncommercial|no.?derivatives/.test(normalized) &&
    /public domain|cc0|\bcc[- ]?by(?:[- ]sa)?\b|\bpdm\b/.test(normalized)
  );
}
async function fetchProviderImages(
  provider: ImageProvider,
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<{ images: OpenImage[]; more: boolean }> {
  let url: string;
  if (provider === "commons")
    url =
      "https://commons.wikimedia.org/w/api.php?" +
      new URLSearchParams({
        action: "query",
        generator: "search",
        gsrsearch: query.trim(),
        gsrnamespace: "6",
        gsrlimit: "24",
        gsroffset: String((page - 1) * 24),
        prop: "imageinfo",
        iiprop: "url|size|mime|extmetadata",
        iiurlwidth: "640",
        format: "json",
        origin: "*",
      });
  else
    url =
      "https://api.openverse.org/v1/images/?" +
      new URLSearchParams({
        q: query.trim(),
        page: String(page),
        page_size: "24",
        license: "cc0,pdm,by,by-sa",
        license_type: "commercial,modification",
      });

  const response = await fetch(url, {
    signal,
    headers: provider === 'openverse' ? { Accept: 'application/json' } : undefined,
  });
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "A biblioteca atingiu o limite temporário de buscas."
        : `A biblioteca respondeu com erro ${response.status}.`,
    );
  const data = await response.json();
  if (data.error)
    throw new Error(data.error.info || "A biblioteca não respondeu à busca.");
  let images: OpenImage[] = [];
  if (provider === "commons")
    images = Object.values(data.query?.pages || {}).flatMap((page: any) => {
      const info = page.imageinfo?.[0],
        meta = info?.extmetadata || {},
        license = plain(meta.LicenseShortName?.value || meta.UsageTerms?.value);
      if (!info?.mime?.startsWith("image/") || !permittedLicense(license))
        return [];
      return [
        {
          id: String(page.pageid),
          title: plain(page.title).replace(/^File:/, ""),
          url: https(info.thumburl || info.url),
          thumbnail: https(info.thumburl || info.url),
          width: info.thumbwidth || info.width,
          height: info.thumbheight || info.height,
          author: plain(
            meta.Artist?.value || meta.Credit?.value || "Autoria na fonte",
          ),
          license,
          licenseUrl:
            https(meta.LicenseUrl?.value) ||
            "https://commons.wikimedia.org/wiki/Commons:Licensing",
          sourceUrl: https(info.descriptionurl),
          provider: "Wikimedia Commons",
        },
      ];
    });
  else
    images = (data.results || [])
      .filter((item: any) => permittedLicense(item.license || ""))
      .map((item: any) => ({
        id: String(item.id),
        title: plain(item.title || "Imagem"),
        url: https(item.url),
        thumbnail: https(item.thumbnail || item.url),
        width: item.width || 0,
        height: item.height || 0,
        author: plain(item.creator || "Autoria na fonte"),
        license:
          String(item.license).toUpperCase() +
          (item.license_version ? " " + item.license_version : ""),
        licenseUrl: https(item.license_url),
        sourceUrl: https(item.foreign_landing_url),
        provider: "Openverse · " + plain(item.source || item.provider),
      }));
  return {
    images: images.filter((item) => item.url && item.sourceUrl),
    more:
      provider === "commons" ? !!data.continue : page < (data.page_count || 1),
  };
}

export async function searchOpenImages(
  provider: ImageProvider,
  query: string,
  page = 1,
  signal?: AbortSignal,
): Promise<{ images: OpenImage[]; more: boolean }> {
  if (!query.trim()) return { images: [], more: false };
  try {
    return await fetchProviderImages(provider, query, page, signal);
  } catch (error: any) {
    if (error?.name === 'AbortError') throw error;
    if (provider === 'openverse') {
      try {
        return await fetchProviderImages('commons', query, page, signal);
      } catch (fallbackError: any) {
        if (fallbackError?.name === 'AbortError') throw fallbackError;
      }
    }
    throw new Error(
      provider === 'openverse'
        ? 'Openverse e Wikimedia Commons não responderam agora. Tente novamente em alguns instantes.'
        : 'Não foi possível consultar a biblioteca. Tente novamente ou use outra fonte.',
    );
  }
}
export function imageCredit(image: OpenImage) {
  return {
    title: image.title,
    author: image.author,
    license: image.license,
    licenseUrl: image.licenseUrl,
    sourceUrl: image.sourceUrl,
    provider: image.provider,
  };
}
export const creditText = (image: ReturnType<typeof imageCredit>) =>
  `${image.title} — ${image.author}. ${image.license}. ${image.sourceUrl}`;
