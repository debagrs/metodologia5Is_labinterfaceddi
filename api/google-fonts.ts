// @ts-nocheck
const FALLBACK = [
  'Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Nunito','Raleway','Merriweather','Playfair Display',
  'Source Sans 3','Source Serif 4','IBM Plex Sans','IBM Plex Serif','IBM Plex Mono','Space Grotesk','DM Sans','DM Serif Display',
  'Work Sans','Ubuntu','Oswald','Bebas Neue','Libre Baskerville','Crimson Text','Fira Sans','Fira Mono','Noto Sans','Noto Serif',
  'Manrope','Mulish','Archivo','Archivo Black','Barlow','Cabin','Karla','Rubik','Quicksand','Josefin Sans','PT Sans','PT Serif'
];

let cache = { at: 0, items: [] };
const CACHE_MS = 6 * 60 * 60 * 1000;

function filterItems(items, q) {
  const query = String(q || '').trim().toLowerCase();
  if (!query) return items;
  return items.filter((item) => String(item.family || '').toLowerCase().includes(query));
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=21600, stale-while-revalidate=86400');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  const q = req.query?.q || '';
  const key = process.env.GOOGLE_FONTS_API_KEY || '';

  if (!key) {
    return res.status(200).json({
      source: 'fallback',
      needsApiKey: true,
      items: filterItems(FALLBACK.map((family) => ({ family, variants: ['regular'], subsets: ['latin'] })), q),
    });
  }

  try {
    if (!cache.items.length || Date.now() - cache.at > CACHE_MS) {
      const url = `https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=${encodeURIComponent(key)}`;
      const response = await fetch(url);
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.items)) throw new Error(data.error?.message || 'Falha no Google Fonts Developer API.');
      cache = {
        at: Date.now(),
        items: data.items.map((item) => ({
          family: item.family,
          category: item.category,
          variants: item.variants || [],
          subsets: item.subsets || [],
          lastModified: item.lastModified,
        })),
      };
    }
    return res.status(200).json({ source: 'google-fonts-api', needsApiKey: false, items: filterItems(cache.items, q) });
  } catch (error) {
    console.error('[5I API /api/google-fonts]', error);
    return res.status(200).json({
      source: 'fallback',
      needsApiKey: true,
      warning: String(error?.message || 'Google Fonts indisponível.'),
      items: filterItems(FALLBACK.map((family) => ({ family, variants: ['regular'], subsets: ['latin'] })), q),
    });
  }
}
