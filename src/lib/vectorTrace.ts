export type TraceMode = 'mono' | 'color';

export interface VectorTraceOptions {
  mode: TraceMode;
  colors: number;
  threshold: number;
  detail: number;
  smoothing: number;
  removeBackground: boolean;
  maxDimension?: number;
}

export interface VectorTraceResult {
  svg: string;
  width: number;
  height: number;
  colors: string[];
  pathCount: number;
}

type RGB = { r: number; g: number; b: number };
type Point = { x: number; y: number };
type Edge = { a: Point; b: Point; used?: boolean };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const rgbHex = ({ r, g, b }: RGB) => `#${[r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
const dist2 = (a: RGB, b: RGB) => (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2;
const lum = (c: RGB) => c.r * 0.2126 + c.g * 0.7152 + c.b * 0.0722;
const pointKey = (p: Point) => `${p.x},${p.y}`;

async function fileToImage(file: File): Promise<HTMLImageElement> {
  const src = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem para vetorizar.'));
    image.src = src;
  });
}

function nearestCluster(pixel: RGB, centers: RGB[]) {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (let index = 0; index < centers.length; index += 1) {
    const d = dist2(pixel, centers[index]);
    if (d < bestDistance) { bestDistance = d; best = index; }
  }
  return best;
}

function kMeans(pixels: RGB[], count: number) {
  const requested = clamp(Math.round(count), 2, 12);
  if (!pixels.length) return [{ r: 0, g: 0, b: 0 }];
  const sorted = [...pixels].sort((a, b) => lum(a) - lum(b));
  let centers: RGB[] = Array.from({ length: requested }, (_, index) => ({ ...sorted[Math.floor((index + 0.5) * sorted.length / requested)] }));
  for (let iteration = 0; iteration < 7; iteration += 1) {
    const sums = centers.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
    for (const pixel of pixels) {
      const index = nearestCluster(pixel, centers);
      const sum = sums[index];
      sum.r += pixel.r; sum.g += pixel.g; sum.b += pixel.b; sum.n += 1;
    }
    centers = centers.map((center, index) => sums[index].n ? ({ r: sums[index].r / sums[index].n, g: sums[index].g / sums[index].n, b: sums[index].b / sums[index].n }) : center);
  }
  return centers;
}

function perpendicularDistance(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dx === 0 && dy === 0) return Math.hypot(point.x - start.x, point.y - start.y);
  const t = ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy);
  const projX = start.x + t * dx;
  const projY = start.y + t * dy;
  return Math.hypot(point.x - projX, point.y - projY);
}

function rdp(points: Point[], epsilon: number): Point[] {
  if (points.length <= 3 || epsilon <= 0) return points;
  let maxDistance = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i += 1) {
    const distance = perpendicularDistance(points[i], start, end);
    if (distance > maxDistance) { maxDistance = distance; index = i; }
  }
  if (maxDistance > epsilon) {
    const left = rdp(points.slice(0, index + 1), epsilon);
    const right = rdp(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [start, end];
}

function removeCollinear(points: Point[]) {
  if (points.length < 4) return points;
  const result: Point[] = [];
  for (let i = 0; i < points.length; i += 1) {
    const prev = points[(i - 1 + points.length) % points.length];
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    const cross = (curr.x - prev.x) * (next.y - curr.y) - (curr.y - prev.y) * (next.x - curr.x);
    if (Math.abs(cross) > 0.001 || i === 0) result.push(curr);
  }
  return result;
}

function boundaryEdges(mask: Uint8Array, width: number, height: number) {
  const edges: Edge[] = [];
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < width && y < height && mask[y * width + x] === 1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1)) edges.push({ a: { x, y }, b: { x: x + 1, y } });
      if (!on(x + 1, y)) edges.push({ a: { x: x + 1, y }, b: { x: x + 1, y: y + 1 } });
      if (!on(x, y + 1)) edges.push({ a: { x: x + 1, y: y + 1 }, b: { x, y: y + 1 } });
      if (!on(x - 1, y)) edges.push({ a: { x, y: y + 1 }, b: { x, y } });
    }
  }
  return edges;
}

function chooseNext(current: Edge, candidates: number[], edges: Edge[]) {
  if (candidates.length <= 1) return candidates[0];
  const vx = current.b.x - current.a.x;
  const vy = current.b.y - current.a.y;
  let best = candidates[0];
  let bestScore = Number.NEGATIVE_INFINITY;
  for (const index of candidates) {
    const edge = edges[index];
    const wx = edge.b.x - edge.a.x;
    const wy = edge.b.y - edge.a.y;
    const cross = vx * wy - vy * wx;
    const dot = vx * wx + vy * wy;
    const score = cross * 10 + dot;
    if (score > bestScore) { bestScore = score; best = index; }
  }
  return best;
}

function traceLoops(mask: Uint8Array, width: number, height: number, simplify: number) {
  const edges = boundaryEdges(mask, width, height);
  const starts = new Map<string, number[]>();
  edges.forEach((edge, index) => {
    const key = pointKey(edge.a);
    const list = starts.get(key) || [];
    list.push(index);
    starts.set(key, list);
  });
  const loops: Point[][] = [];
  for (let i = 0; i < edges.length; i += 1) {
    if (edges[i].used) continue;
    const first = edges[i];
    first.used = true;
    const points: Point[] = [first.a, first.b];
    let current = first;
    let guard = 0;
    while (guard++ < edges.length + 10) {
      const endKey = pointKey(current.b);
      if (endKey === pointKey(first.a)) break;
      const candidates = (starts.get(endKey) || []).filter((index) => !edges[index].used);
      if (!candidates.length) break;
      const nextIndex = chooseNext(current, candidates, edges);
      const next = edges[nextIndex];
      next.used = true;
      points.push(next.b);
      current = next;
    }
    if (points.length >= 4 && pointKey(points[points.length - 1]) === pointKey(points[0])) {
      const open = removeCollinear(points.slice(0, -1));
      if (open.length >= 3) {
        const closed = [...open, open[0]];
        const simplified = rdp(closed, simplify);
        loops.push(simplified.length >= 4 ? simplified : closed);
      }
    }
  }
  return loops;
}

function loopsToPath(loops: Point[][], sx: number, sy: number) {
  return loops.map((loop) => {
    if (!loop.length) return '';
    const [first, ...rest] = loop;
    return `M${(first.x * sx).toFixed(2)} ${(first.y * sy).toFixed(2)}${rest.map((point) => `L${(point.x * sx).toFixed(2)} ${(point.y * sy).toFixed(2)}`).join('')}Z`;
  }).join('');
}

export async function traceImageFile(file: File, options: VectorTraceOptions): Promise<VectorTraceResult> {
  const image = await fileToImage(file);
  const targetMax = clamp(options.maxDimension || Math.round(90 + options.detail * 2.6), 96, 360);
  const scale = Math.min(1, targetMax / Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height));
  const width = Math.max(2, Math.round((image.naturalWidth || image.width) * scale));
  const height = Math.max(2, Math.round((image.naturalHeight || image.height) * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Seu navegador não disponibilizou o canvas necessário para vetorizar.');
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const data = ctx.getImageData(0, 0, width, height).data;
  const rgbPixels: RGB[] = [];
  const alpha = new Uint8Array(width * height);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    alpha[p] = data[i + 3];
    if (data[i + 3] > 20) rgbPixels.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
  }

  const outputWidth = image.naturalWidth || image.width || width;
  const outputHeight = image.naturalHeight || image.height || height;
  const sx = outputWidth / width;
  const sy = outputHeight / height;
  const simplify = clamp(options.smoothing, 0, 8) * 0.45;
  let colors: RGB[] = [];
  let labels = new Uint8Array(width * height);

  if (options.mode === 'mono') {
    colors = [{ r: 20, g: 20, b: 20 }, { r: 255, g: 255, b: 255 }];
    const threshold = clamp(options.threshold, 0, 255);
    for (let p = 0, i = 0; p < labels.length; p += 1, i += 4) {
      if (alpha[p] <= 20) { labels[p] = 1; continue; }
      const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };
      labels[p] = lum(pixel) < threshold ? 0 : 1;
    }
  } else {
    const sampleStep = Math.max(1, Math.floor(Math.sqrt((width * height) / 16000)));
    const samples: RGB[] = [];
    for (let y = 0; y < height; y += sampleStep) {
      for (let x = 0; x < width; x += sampleStep) {
        const p = y * width + x;
        if (alpha[p] <= 20) continue;
        const i = p * 4;
        samples.push({ r: data[i], g: data[i + 1], b: data[i + 2] });
      }
    }
    colors = kMeans(samples, options.colors);
    for (let p = 0, i = 0; p < labels.length; p += 1, i += 4) {
      if (alpha[p] <= 20) { labels[p] = 255; continue; }
      labels[p] = nearestCluster({ r: data[i], g: data[i + 1], b: data[i + 2] }, colors);
    }
  }

  let backgroundCluster = -1;
  if (options.removeBackground) {
    const cornerLabels = [labels[0], labels[width - 1], labels[(height - 1) * width], labels[height * width - 1]].filter((v) => v !== 255);
    const counts = new Map<number, number>();
    cornerLabels.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
    backgroundCluster = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
  }

  const paths: string[] = [];
  let pathCount = 0;
  const clusterCount = options.mode === 'mono' ? 1 : colors.length;
  for (let cluster = 0; cluster < clusterCount; cluster += 1) {
    if (cluster === backgroundCluster) continue;
    const mask = new Uint8Array(width * height);
    let any = false;
    for (let p = 0; p < labels.length; p += 1) {
      if (labels[p] === cluster && alpha[p] > 20) { mask[p] = 1; any = true; }
    }
    if (!any) continue;
    const loops = traceLoops(mask, width, height, simplify);
    if (!loops.length) continue;
    pathCount += loops.length;
    const d = loopsToPath(loops, sx, sy);
    const color = options.mode === 'mono' ? '#151515' : rgbHex(colors[cluster]);
    paths.push(`<path d="${d}" fill="${color}" fill-rule="evenodd"/>`);
  }

  if (!paths.length) throw new Error('O trace não encontrou áreas vetorizáveis. Tente outro limiar ou aumente o detalhe.');
  const palette = (options.mode === 'mono' ? ['#151515'] : colors.map(rgbHex)).filter((_, index) => index !== backgroundCluster);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outputWidth} ${outputHeight}" width="${outputWidth}" height="${outputHeight}"><title>Trace vetorial</title><desc>Vetor gerado localmente a partir de imagem raster. Elementos permanecem editáveis.</desc>${paths.join('')}</svg>`;
  return { svg, width: outputWidth, height: outputHeight, colors: palette, pathCount };
}
