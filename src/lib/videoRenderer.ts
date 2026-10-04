import type {
  VideoDocument,
  VideoTextLayer,
  VideoTimelineItem,
} from "../types";
import { bounded, sceneAt, videoDuration } from "./videoComposition";
export interface VideoAssets {
  visuals: Map<string, HTMLImageElement | HTMLVideoElement>;
  audio: Map<string, HTMLAudioElement>;
}
const safeColor = (value: string | undefined, fallback: string) =>
  /^#[\da-f]{3,8}$/i.test(value || "") ? value! : fallback;
export async function loadVideoAssets(
  video: VideoDocument,
  signal?: AbortSignal,
): Promise<VideoAssets> {
  const assets: VideoAssets = { visuals: new Map(), audio: new Map() };
  const entries = [
    ...(video.timeline || [])
      .filter((c) => c.kind !== "color" && c.url)
      .map((c) => ({ id: c.id, url: c.url, kind: c.kind })),
    ...(video.overlays || []).map((o) => ({
      id: o.id,
      url: o.url,
      kind: "image",
    })),
    ...(video.audioTracks || []).map((a) => ({
      id: a.id,
      url: a.url,
      kind: "audio",
    })),
  ];
  try {
    await Promise.all(
      entries.map(
        (item) =>
          new Promise<void>((resolve, reject) => {
            const el =
              item.kind === "image"
                ? new Image()
                : window.document.createElement(
                    item.kind === "audio" ? "audio" : "video",
                  );
            el.crossOrigin = "anonymous";
            if (el instanceof HTMLVideoElement) {
              el.playsInline = true;
              el.muted = true;
              el.preload = "auto";
            }
            const clean = () => {
              clearTimeout(timer);
              signal?.removeEventListener("abort", abort);
            };
            const abort = () => {
              clean();
              reject(new DOMException("Exportação cancelada", "AbortError"));
            };
            const timer = window.setTimeout(() => {
              clean();
              reject(
                new Error(
                  "Uma mídia demorou demais para carregar. Verifique o arquivo ou sua conexão.",
                ),
              );
            }, 15000);
            const ready = () => {
              clean();
              if (item.kind === "audio")
                assets.audio.set(item.id, el as HTMLAudioElement);
              else
                assets.visuals.set(
                  item.id,
                  el as HTMLImageElement | HTMLVideoElement,
                );
              resolve();
            };
            el.onerror = () => {
              clean();
              reject(
                new Error(
                  "Não foi possível carregar uma mídia da montagem. Reenvie o arquivo ou use uma URL com permissão de acesso.",
                ),
              );
            };
            if (el instanceof HTMLImageElement) el.onload = ready;
            else el.onloadeddata = ready;
            signal?.addEventListener("abort", abort, { once: true });
            if (signal?.aborted) {
              abort();
              return;
            }
            el.src = item.url;
          }),
      ),
    );
    return assets;
  } catch (error) {
    releaseVideoAssets(assets);
    throw error;
  }
}
export function releaseVideoAssets(assets: VideoAssets) {
  for (const el of [...assets.visuals.values(), ...assets.audio.values()])
    if (el instanceof HTMLMediaElement) {
      el.pause();
      el.removeAttribute("src");
      el.load();
    }
  assets.visuals.clear();
  assets.audio.clear();
}
export function syncVideoAssets(
  video: VideoDocument,
  assets: VideoAssets,
  time: number,
  playing: boolean,
  audioExport = false,
) {
  const selected = sceneAt(video, time);
  const activeIds = new Set<string>();
  if (selected) {
    activeIds.add(selected.clip.id);
    if (
      selected.index > 0 &&
      selected.local <
        Math.min(
          selected.clip.transitionDuration || 0.5,
          selected.clip.duration / 2,
        ) &&
      selected.clip.transition !== "cut"
    )
      activeIds.add(video.timeline![selected.index - 1].id);
  }
  for (const clip of video.timeline || []) {
    const el = assets.visuals.get(clip.id);
    if (!(el instanceof HTMLVideoElement)) continue;
    if (!activeIds.has(clip.id)) {
      el.pause();
      continue;
    }
    const local =
      selected?.clip.id === clip.id ? selected.local : clip.duration;
    const target = Math.min(
      (clip.trimStart || 0) + local,
      Number.isFinite(el.duration)
        ? Math.max(0, el.duration - 0.035)
        : (clip.trimStart || 0) + local,
    );
    if (Math.abs(el.currentTime - target) > (playing ? 0.3 : 0.035))
      try {
        el.currentTime = target;
      } catch {}
    if (!audioExport) {
      el.muted = clip.muted !== false;
      el.volume = bounded(clip.volume, 0, 1, 1);
    }
    if (playing && selected?.clip.id === clip.id)
      void el.play().catch(() => {});
    else el.pause();
  }
  for (const track of video.audioTracks || []) {
    const el = assets.audio.get(track.id);
    if (!el) continue;
    const active = time >= track.start && time < track.end;
    el.volume = audioExport ? 1 : bounded(track.volume, 0, 1, 0.7);
    if (!active) {
      el.pause();
      continue;
    }
    const target = (track.offset || 0) + time - track.start;
    if (Number.isFinite(el.duration) && target >= el.duration) {
      el.pause();
      continue;
    }
    if (Math.abs(el.currentTime - target) > (playing ? 0.3 : 0.035))
      el.currentTime = target;
    if (playing) void el.play().catch(() => {});
    else el.pause();
  }
}
function fit(
  ctx: CanvasRenderingContext2D,
  el: HTMLImageElement | HTMLVideoElement,
  mode: string,
  w: number,
  h: number,
) {
  const sw = el instanceof HTMLVideoElement ? el.videoWidth : el.naturalWidth,
    sh = el instanceof HTMLVideoElement ? el.videoHeight : el.naturalHeight;
  if (!sw || !sh) return;
  const scale =
    mode === "contain" ? Math.min(w / sw, h / sh) : Math.max(w / sw, h / sh);
  ctx.drawImage(
    el,
    (w - sw * scale) / 2,
    (h - sh * scale) / 2,
    sw * scale,
    sh * scale,
  );
}
function drawScene(
  ctx: CanvasRenderingContext2D,
  video: VideoDocument,
  clip: VideoTimelineItem,
  assets: VideoAssets,
  local: number,
  w: number,
  h: number,
) {
  ctx.fillStyle = safeColor(clip.background, video.background || "#111111");
  ctx.fillRect(0, 0, w, h);
  if (
    clip.backgroundStyle === "gradient" ||
    clip.backgroundStyle === "particles"
  ) {
    const gradient = ctx.createRadialGradient(
      w * 0.45,
      h * 0.4,
      0,
      w * 0.5,
      h * 0.5,
      Math.max(w, h) * 0.8,
    );
    gradient.addColorStop(0, safeColor(video.accent, "#1b6c64"));
    gradient.addColorStop(
      1,
      safeColor(clip.background, video.background || "#111111"),
    );
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }
  if (clip.backgroundStyle === "particles") {
    ctx.save();
    for (let i = 0; i < 35; i++) {
      const x =
          (((i * 137.3 + Math.sin(local * 0.5 + i) * 30) % 1000) / 1000) * w,
        y = (((i * 193 + local * 16 * ((i % 3) + 1)) % 1000) / 1000) * h;
      ctx.globalAlpha = 0.15 + (i % 5) * 0.08;
      ctx.fillStyle = i % 4 ? "#FFFFFF" : safeColor(video.accent, "#7ce8dd");
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, w * (0.003 + (i % 4) * 0.002)), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const el = assets.visuals.get(clip.id);
  if (!el) return;
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const progress = Math.min(1, local / clip.duration);
  let scale = 1,
    dx = 0,
    dy = 0;
  if (clip.motion === "zoom-in") scale = 1 + progress * 0.15;
  if (clip.motion === "zoom-out") scale = 1.15 - progress * 0.15;
  if (clip.motion === "pan-left" || clip.motion === "pan-right") {
    scale = 1.15;
    dx = (progress - 0.5) * w * 0.1 * (clip.motion === "pan-left" ? -1 : 1);
  }
  if (clip.motion === "float") dy = Math.sin(local * 2) * h * 0.012;
  if (clip.motion === "pulse") scale = 1 + Math.sin(local * 3) * 0.025;
  if (clip.motion === "rotate") ctx.rotate(Math.sin(local) * 0.03);
  ctx.translate(dx, dy);
  ctx.scale(scale, scale);
  ctx.translate(-w / 2, -h / 2);
  ctx.filter =
    clip.effect === "grayscale"
      ? "grayscale(1)"
      : clip.effect === "warm"
        ? "sepia(.35) saturate(1.2)"
        : clip.effect === "cool"
          ? "hue-rotate(20deg) saturate(.8)"
          : clip.effect === "contrast"
            ? "contrast(1.4)"
            : clip.effect === "blur"
              ? "blur(4px)"
              : "none";
  fit(ctx, el, clip.fit || "cover", w, h);
  ctx.restore();
}
export function wrappedLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  width: number,
) {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      const next = line ? `${line} ${word}` : word;
      if (ctx.measureText(next).width > width && line) {
        lines.push(line);
        line = word;
      } else line = next;
    }
    lines.push(line);
  }
  return lines;
}
function drawText(
  ctx: CanvasRenderingContext2D,
  layer: VideoTextLayer,
  time: number,
  w: number,
  h: number,
) {
  if (time < layer.start || time >= layer.end || !layer.text) return;
  const local = time - layer.start;
  ctx.save();
  ctx.translate((w * layer.x) / 100, (h * layer.y) / 100);
  if (layer.animation === "fade")
    ctx.globalAlpha = Math.min(
      1,
      local / 0.25,
      Math.max(0, (layer.end - time) / 0.25),
    );
  if (layer.animation === "pop") {
    const scale = Math.min(1, 0.5 + local * 2);
    ctx.scale(scale, scale);
  }
  if (layer.animation === "float")
    ctx.translate(0, Math.sin(local * 2) * h * 0.008);
  const size = (w * layer.fontSize) / 100;
  ctx.font = `${layer.bold ? "700" : "400"} ${size}px "${layer.fontFamily.replace(/["\\]/g, "")}", sans-serif`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = "middle";
  const width = (w * layer.width) / 100,
    lines = wrappedLines(ctx, layer.text, width),
    lineHeight = size * 1.2;
  if (layer.background && layer.background !== "transparent") {
    ctx.fillStyle = layer.background;
    ctx.fillRect(
      -width / 2,
      (-lines.length * lineHeight) / 2 - size * 0.25,
      width,
      lines.length * lineHeight + size * 0.5,
    );
  }
  ctx.fillStyle = layer.color;
  ctx.shadowColor = "rgba(0,0,0,.5)";
  ctx.shadowBlur = size * 0.18;
  ctx.shadowOffsetY = size * 0.05;
  const x =
    layer.align === "left"
      ? -width / 2
      : layer.align === "right"
        ? width / 2
        : 0;
  lines.forEach((line, index) =>
    ctx.fillText(line, x, (index - (lines.length - 1) / 2) * lineHeight),
  );
  ctx.restore();
}
export function renderVideoFrame(
  ctx: CanvasRenderingContext2D,
  video: VideoDocument,
  assets: VideoAssets,
  time: number,
  w: number,
  h: number,
) {
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  const at = sceneAt(
    video,
    Math.min(time, Math.max(0, videoDuration(video) - 0.001)),
  );
  ctx.fillStyle = video.background || "#111111";
  ctx.fillRect(0, 0, w, h);
  if (at) {
    const transition = Math.min(
        at.clip.transitionDuration ?? 0.5,
        at.clip.duration / 2,
      ),
      progress = transition ? Math.min(1, at.local / transition) : 1;
    if (at.index > 0 && at.clip.transition !== "cut" && progress < 1) {
      drawScene(
        ctx,
        video,
        video.timeline![at.index - 1],
        assets,
        video.timeline![at.index - 1].duration,
        w,
        h,
      );
      ctx.save();
      if (at.clip.transition === "fade") ctx.globalAlpha = progress;
      if (at.clip.transition === "slide") ctx.translate(w * (1 - progress), 0);
      if (at.clip.transition === "zoom") {
        ctx.globalAlpha = progress;
        ctx.translate(w / 2, h / 2);
        ctx.scale(0.75 + progress * 0.25, 0.75 + progress * 0.25);
        ctx.translate(-w / 2, -h / 2);
      }
      drawScene(ctx, video, at.clip, assets, at.local, w, h);
      ctx.restore();
    } else drawScene(ctx, video, at.clip, assets, at.local, w, h);
  }
  for (const layer of video.overlays || []) {
    if (time < layer.start || time >= layer.end) continue;
    const el = assets.visuals.get(layer.id);
    if (!(el instanceof HTMLImageElement)) continue;
    ctx.save();
    const local = time - layer.start;
    ctx.globalAlpha =
      layer.opacity *
      (layer.animation === "fade"
        ? Math.min(1, local / 0.3, (layer.end - time) / 0.3)
        : 1);
    const scale =
        layer.animation === "pop" ? Math.min(1, 0.4 + local * 2.4) : 1,
      iw = ((w * layer.width) / 100) * scale,
      ih = (iw * el.naturalHeight) / el.naturalWidth;
    ctx.translate(
      (w * layer.x) / 100,
      (h * layer.y) / 100 +
        (layer.animation === "float" ? Math.sin(local * 2) * h * 0.012 : 0),
    );
    if (layer.animation === "spin") ctx.rotate(local * 1.6);
    ctx.drawImage(el, -iw / 2, -ih / 2, iw, ih);
    ctx.restore();
  }
  for (const layer of video.texts || []) drawText(ctx, layer, time, w, h);
  ctx.restore();
}
export async function exportVideo(
  video: VideoDocument,
  {
    signal,
    onProgress,
  }: { signal?: AbortSignal; onProgress?: (progress: number) => void } = {},
): Promise<Blob> {
  if (typeof MediaRecorder === "undefined")
    throw new Error(
      "Este navegador não oferece gravação. Use Chrome, Edge ou outro navegador com MediaRecorder.",
    );
  const duration = videoDuration(video);
  if (!duration) throw new Error("Adicione cenas antes de exportar.");
  const canvas = window.document.createElement("canvas");
  canvas.width =
    video.exportWidth || (video.width >= video.height ? 1280 : 720);
  canvas.height = Math.round((canvas.width * video.height) / video.width);
  const ctx = canvas.getContext("2d");
  if (!ctx || !canvas.captureStream)
    throw new Error(
      "A exportação por canvas não está disponível neste navegador.",
    );
  let assets: VideoAssets | undefined,
    stream: MediaStream | undefined,
    recorder: MediaRecorder | undefined,
    context: AudioContext | undefined,
    raf = 0;
  try {
    const hasAudio =
      (video.audioTracks || []).length ||
      (video.timeline || []).some(
        (c) => c.kind === "video" && c.muted === false,
      );
    if (hasAudio) {
      context = new AudioContext();
      await context.resume();
    }
    assets = await loadVideoAssets(video, signal);
    await window.document.fonts.ready;
    if (signal?.aborted)
      throw new DOMException("Exportação cancelada", "AbortError");
    stream = canvas.captureStream(30);
    const gainNodes = new Map<string, GainNode>();
    if (context) {
      const destination = context.createMediaStreamDestination();
      for (const [id, el] of [
        ...assets.visuals.entries(),
        ...assets.audio.entries(),
      ])
        if (el instanceof HTMLMediaElement) {
          const gain = context.createGain();
          gain.gain.value = 0;
          context.createMediaElementSource(el).connect(gain);
          gain.connect(destination);
          gainNodes.set(id, gain);
          el.muted = false;
        }
      for (const track of destination.stream.getAudioTracks())
        stream.addTrack(track);
    }
    const mime = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4",
    ].find((type) => MediaRecorder.isTypeSupported(type));
    if (!mime)
      throw new Error("Nenhum formato de gravação compatível foi encontrado.");
    recorder = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 5_000_000,
    });
    const chunks: BlobPart[] = [];
    const finished = new Promise<void>((resolve, reject) => {
      recorder!.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };
      recorder!.onstop = () => resolve();
      recorder!.onerror = () =>
        reject(new Error("O navegador interrompeu a gravação."));
    });
    renderVideoFrame(ctx, video, assets, 0, canvas.width, canvas.height);
    recorder.start(200);
    const start = performance.now();
    await new Promise<void>((resolve, reject) => {
      const draw = (now: number) => {
        try {
          if (signal?.aborted)
            throw new DOMException("Exportação cancelada", "AbortError");
          const time = Math.min(duration, (now - start) / 1000);
          syncVideoAssets(video, assets!, time, true, !!context);
          for (const clip of video.timeline || [])
            gainNodes
              .get(clip.id)
              ?.gain.setValueAtTime(
                clip.muted === false &&
                  sceneAt(video, time)?.clip.id === clip.id
                  ? bounded(clip.volume, 0, 1, 1)
                  : 0,
                context!.currentTime,
              );
          for (const track of video.audioTracks || [])
            gainNodes
              .get(track.id)
              ?.gain.setValueAtTime(
                time >= track.start && time < track.end
                  ? bounded(track.volume, 0, 1, 0.7)
                  : 0,
                context!.currentTime,
              );
          renderVideoFrame(
            ctx,
            video,
            assets!,
            time,
            canvas.width,
            canvas.height,
          );
          onProgress?.(time / duration);
          if (time >= duration) {
            resolve();
            return;
          }
          raf = requestAnimationFrame(draw);
        } catch (error) {
          reject(error);
        }
      };
      raf = requestAnimationFrame(draw);
    });
    recorder.stop();
    await finished;
    return new Blob(chunks, { type: mime.split(";")[0] });
  } finally {
    cancelAnimationFrame(raf);
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((track) => track.stop());
    if (assets) releaseVideoAssets(assets);
    if (context) await context.close();
  }
}
