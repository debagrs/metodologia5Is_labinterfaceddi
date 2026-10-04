import { upload as uploadToBlob } from "@vercel/blob/client";
import {
  FontPicker,
  useGraphicFonts,
  ensureGraphicFonts,
} from "../lib/graphicFonts";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Download,
  Film,
  ImagePlus,
  Layers3,
  Loader2,
  Music2,
  Pause,
  Play,
  Plus,
  Redo2,
  Save,
  Scissors,
  Settings2,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Upload,
  WandSparkles,
  X,
} from "lucide-react";
import type {
  DesignSystemDocument,
  VideoDocument,
  VideoFormatPreset,
  VideoMediaItem,
  VideoTextLayer,
  VideoTimelineItem,
  VideoTransition,
} from "../types";
import {
  applyVideoComposition,
  bounded,
  migrateVideo,
  sceneAt,
  textLayer,
  videoDuration,
} from "../lib/videoComposition";
import {
  exportVideo,
  loadVideoAssets,
  releaseVideoAssets,
  renderVideoFrame,
  syncVideoAssets,
  type VideoAssets,
} from "../lib/videoRenderer";
import { ensureTursoSession } from "../lib/turso";
import VoiceDictationButton from "./VoiceDictationButton";
interface Props {
  document: VideoDocument;
  designSystem?: DesignSystemDocument;
  title?: string;
  canEdit?: boolean;
  availableMedia?: VideoMediaItem[];
  onSave: (document: VideoDocument) => void;
  onClose: () => void;
}
const uid = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const FORMATS = [
  { id: "reel", label: "Vertical 9:16", width: 1080, height: 1920 },
  { id: "feed", label: "Feed 4:5", width: 1080, height: 1350 },
  { id: "square", label: "Quadrado", width: 1080, height: 1080 },
  { id: "youtube", label: "Horizontal 16:9", width: 1920, height: 1080 },
];
const TOOLS = [
  { id: "media", label: "Mídia", icon: ImagePlus },
  { id: "edit", label: "Editar", icon: Scissors },
  { id: "text", label: "Texto", icon: Type },
  { id: "transitions", label: "Transições", icon: Film },
  { id: "effects", label: "Efeitos", icon: Sparkles },
  { id: "layers", label: "Camadas", icon: Layers3 },
  { id: "audio", label: "Áudio", icon: Music2 },
  { id: "ai", label: "Montar com IA", icon: WandSparkles },
  { id: "format", label: "Formato", icon: Settings2 },
] as const;
type Tool = (typeof TOOLS)[number]["id"];
export const blankVideo = (ds?: DesignSystemDocument): VideoDocument => ({
  title: "Vídeo do projeto",
  defaultFontFamily: ds?.fontFamilies?.display || ds?.primaryFont || "Inter",
  subtitle: "",
  format: "reel",
  width: 1080,
  height: 1920,
  duration: 6,
  background:
    ds?.colors.find((color) => color.role === "brand")?.value || "#102328",
  accent:
    ds?.colors.find((color) => color.role === "accent")?.value || "#37D4C6",
  textColor: "#FFFFFF",
  media: [],
  timeline: [],
  overlays: [],
  texts: [],
  audioTracks: [],
  aiPlan: [],
});
const clock = (time: number) =>
  `${Math.floor(time / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(time % 60)
    .toString()
    .padStart(2, "0")}.${Math.floor((time % 1) * 10)}`;
const color = (value: string | undefined) =>
  /^#[0-9a-f]{6}$/i.test(value || "") ? value! : "#111111";

function CompositionCanvas({
  document,
  time = 0,
  playing = false,
  onError,
}: {
  document: VideoDocument;
  time?: number;
  playing?: boolean;
  onError?: (message: string) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null),
    assets = useRef<VideoAssets>({ visuals: new Map(), audio: new Map() }),
    latest = useRef({ document, time, playing });
  latest.current = { document, time, playing };
  const sourceKey = JSON.stringify([
    document.timeline?.map((clip) => [clip.id, clip.url, clip.kind]),
    document.overlays?.map((layer) => [layer.id, layer.url]),
    document.audioTracks?.map((track) => [track.id, track.url]),
  ]);
  const draw = () => {
    const canvas = ref.current;
    if (!canvas) return;
    const current = latest.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    syncVideoAssets(
      current.document,
      assets.current,
      current.time,
      current.playing,
    );
    renderVideoFrame(
      ctx,
      current.document,
      assets.current,
      current.time,
      canvas.width,
      canvas.height,
    );
  };
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    void loadVideoAssets(latest.current.document, controller.signal)
      .then((result) => {
        if (disposed) {
          releaseVideoAssets(result);
          return;
        }
        releaseVideoAssets(assets.current);
        assets.current = result;
        for (const el of result.visuals.values())
          if (el instanceof HTMLVideoElement) el.onseeked = draw;
        draw();
      })
      .catch((error) => {
        if (!disposed && error.name !== "AbortError") onError?.(error.message);
      });
    return () => {
      disposed = true;
      controller.abort();
      releaseVideoAssets(assets.current);
    };
  }, [sourceKey]);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = Math.min(960, document.width);
    canvas.height = Math.round(
      (canvas.width * document.height) / document.width,
    );
    draw();
  }, [document, time, playing]);
  return (
    <canvas
      ref={ref}
      aria-label={`Prévia do vídeo em ${clock(time)}`}
      className="video-composition-canvas"
    />
  );
}
export function VideoPreview({
  document,
  className = "",
}: {
  document: VideoDocument;
  className?: string;
}) {
  useGraphicFonts((document.texts || []).map((t) => t.fontFamily));
  const video = useMemo(() => migrateVideo(document), [document]);
  return (
    <div className={`video-card-preview ${className}`}>
      <CompositionCanvas document={video} />
    </div>
  );
}
function FrameThumbnail({
  clip,
  index = 0,
}: {
  clip: VideoTimelineItem;
  index?: number;
}) {
  const [url, setUrl] = useState(clip.kind === "image" ? clip.url : "");
  useEffect(() => {
    if (clip.kind !== "video") return;
    let disposed = false;
    const video = window.document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.preload = "auto";
    video.onloadeddata = () => {
      video.currentTime = Math.min(
        (clip.trimStart || 0) + (clip.duration * index) / 3,
        Math.max(0, video.duration - 0.05),
      );
    };
    video.onseeked = () => {
      if (disposed) return;
      try {
        const canvas = window.document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 90;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(video, 0, 0, 160, 90);
        setUrl(canvas.toDataURL("image/jpeg", 0.65));
      } catch {}
    };
    video.src = clip.url;
    return () => {
      disposed = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [clip.url, clip.trimStart, clip.duration, index]);
  return url ? (
    <img src={url} alt="" />
  ) : (
    <div
      className="video-frame-placeholder"
      style={{ background: clip.background || "#173B40" }}
    >
      {clip.kind === "color" ? <Type size={18} /> : <Film size={18} />}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="video-field">
      <span>{label}</span>
      {React.Children.map(children, (child) =>
        React.isValidElement(child) &&
        ["input", "select", "textarea"].includes(String(child.type))
          ? React.cloneElement(child as React.ReactElement<any>, {
              "aria-label": label,
            })
          : child,
      )}
    </label>
  );
}

export default function VideoStudio({
  document,
  designSystem,
  title = "Editor de vídeo",
  canEdit = true,
  availableMedia = [],
  onSave,
  onClose,
}: Props) {
  const [draft, setDraft] = useState<VideoDocument>(() =>
    migrateVideo(JSON.parse(JSON.stringify(document))),
  );
  const [library, setLibrary] = useState<VideoMediaItem[]>(() => [
    ...new Map(
      [
        ...availableMedia,
        ...(document.media || []),
        ...(document.sourceUrl
          ? [
              {
                id: uid("media"),
                url: document.sourceUrl,
                name: document.sourceName || "Vídeo",
                kind: "video" as const,
                source: "project" as const,
              },
            ]
          : []),
      ].map((item) => [item.url, item]),
    ).values(),
  ]);
  const [tool, setTool] = useState<Tool>("media"),
    [panelOpen, setPanelOpen] = useState(false),
    [playhead, setPlayhead] = useState(0),
    [playing, setPlaying] = useState(false),
    [selectedClipId, setSelectedClipId] = useState(
      document.timeline?.[0]?.id || "",
    ),
    [selectedTextId, setSelectedTextId] = useState(""),
    [selectedLayerId, setSelectedLayerId] = useState("");
  const [error, setError] = useState(""),
    [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [progress, setProgress] = useState(0),
    [downloadUrl, setDownloadUrl] = useState(""),
    [downloadMime, setDownloadMime] = useState("video/webm"),
    [history, setHistory] = useState<VideoDocument[]>([]),
    [future, setFuture] = useState<VideoDocument[]>([]),
    [timelineZoom, setTimelineZoom] = useState(72);
  const [stageSize, setStageSize] = useState({ width: 200, height: 300 });
  const previewZoneRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null),
    abortRef = useRef<AbortController | null>(null),
    stageRef = useRef<HTMLDivElement>(null),
    timelineRef = useRef<HTMLDivElement>(null),
    dragRef = useRef<{ kind: "text" | "layer"; id: string } | null>(null),
    mounted = useRef(true);
  const duration = videoDuration(draft),
    selectedClip =
      draft.timeline?.find((clip) => clip.id === selectedClipId) ||
      sceneAt(draft, playhead)?.clip,
    selectedText = draft.texts?.find((text) => text.id === selectedTextId),
    selectedLayer = draft.overlays?.find(
      (layer) => layer.id === selectedLayerId,
    );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      abortRef.current?.abort();
    };
  }, []);
  useEffect(
    () => () => {
      if (downloadUrl.startsWith("blob:")) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );
  useEffect(() => {
    if (!playing) return;
    const initial = playhead,
      start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const next = initial + (now - start) / 1000;
      if (next >= duration) {
        setPlayhead(duration);
        setPlaying(false);
        return;
      }
      setPlayhead(next);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, duration]);
  useEffect(() => {
    setPlayhead((value) => Math.min(value, duration));
  }, [duration]);
  useEffect(() => {
    const zone = previewZoneRef.current;
    if (!zone) return;
    const measure = () => {
      const style = getComputedStyle(zone),
        width = Math.max(
          1,
          zone.clientWidth -
            parseFloat(style.paddingLeft) -
            parseFloat(style.paddingRight),
        ),
        height = Math.max(
          1,
          zone.clientHeight -
            parseFloat(style.paddingTop) -
            parseFloat(style.paddingBottom),
        ),
        scale = Math.min(width / draft.width, height / draft.height);
      setStageSize({
        width: draft.width * scale,
        height: draft.height * scale,
      });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(zone);
    measure();
    return () => observer.disconnect();
  }, [draft.width, draft.height]);
  const change = (
    update: (video: VideoDocument) => VideoDocument,
    record = true,
  ) => {
    if (!canEdit || busy) return;
    setDraft((current) => {
      if (record) {
        setHistory((previous) => [...previous, current].slice(-40));
        setFuture([]);
      }
      return { ...update(current), generatedUrl: undefined };
    });
    setDownloadUrl("");
  };
  const patchClip = (patch: Partial<VideoTimelineItem>) => {
    if (selectedClip)
      change((video) => ({
        ...video,
        timeline: video.timeline!.map((clip) =>
          clip.id === selectedClip.id ? { ...clip, ...patch } : clip,
        ),
      }));
  };
  const patchText = (patch: Partial<VideoTextLayer>, record = true) => {
    if (selectedTextId)
      change(
        (video) => ({
          ...video,
          texts: video.texts!.map((text) =>
            text.id === selectedTextId ? { ...text, ...patch } : text,
          ),
        }),
        record,
      );
  };
  const selectTool = (next: Tool) => {
    setTool(next);
    setPanelOpen(true);
    setPlaying(false);
  };
  const selectClip = (clip: VideoTimelineItem, index: number) => {
    setSelectedClipId(clip.id);
    setPlayhead(
      draft
        .timeline!.slice(0, index)
        .reduce((sum, item) => sum + item.duration, 0),
    );
    setPlaying(false);
  };
  const addScene = (media?: VideoMediaItem) => {
    const clip: VideoTimelineItem = {
      id: uid("clip"),
      mediaId: media?.id || "",
      kind: media?.kind || "color",
      url: media?.url || "",
      name: media?.name || "Cena gráfica",
      duration: media?.duration || 3,
      transition: "fade",
      transitionDuration: 0.5,
      fit:
        media?.url.startsWith("data:image/svg") ||
        /\.svg(?:[?#]|$)/i.test(media?.url || "") ||
        /\.svg$/i.test(media?.name || "")
          ? "contain"
          : "cover",
      background: draft.background,
      backgroundStyle: "gradient",
      motion: media?.kind === "image" ? "zoom-in" : "none",
      muted: true,
    };
    const index = draft.timeline?.length || 0;
    change((video) => ({
      ...video,
      timeline: [...(video.timeline || []), clip],
    }));
    setSelectedClipId(clip.id);
    setPlayhead(duration);
    setPlaying(false);
    return { clip, index };
  };
  const addText = () => {
    let video = draft;
    if (!duration) {
      const clip: VideoTimelineItem = {
        id: uid("clip"),
        mediaId: "",
        kind: "color",
        url: "",
        name: "Cena gráfica",
        duration: 3,
        background: draft.background,
        backgroundStyle: "gradient",
        transition: "cut",
      };
      video = { ...video, timeline: [clip] };
      setSelectedClipId(clip.id);
    }
    const at = sceneAt(video, playhead);
    const text = textLayer(
      "Seu texto aqui",
      at?.start || 0,
      (at?.start || 0) + (at?.clip.duration || 3),
      video,
      {
        fontFamily:
          designSystem?.fontFamilies?.display ||
          designSystem?.primaryFont ||
          "Arial",
      },
    );
    change(() => ({ ...video, texts: [...(video.texts || []), text] }));
    setSelectedTextId(text.id);
    setPlayhead(text.start + 0.3);
    selectTool("text");
  };
  const moveScene = (direction: number) => {
    if (!selectedClip) return;
    change((video) => {
      const clips = [...video.timeline!],
        index = clips.findIndex((clip) => clip.id === selectedClip.id),
        target = index + direction;
      if (target < 0 || target >= clips.length) return video;
      [clips[index], clips[target]] = [clips[target], clips[index]];
      return { ...video, timeline: clips };
    });
  };
  const split = () => {
    const at = sceneAt(draft, playhead);
    if (!at || at.local < 0.25 || at.clip.duration - at.local < 0.25)
      return setError(
        "Posicione o cursor dentro da cena, afastado das bordas, para dividi-la.",
      );
    change((video) => {
      const clips = [...video.timeline!];
      clips.splice(
        at.index,
        1,
        { ...at.clip, duration: at.local },
        {
          ...at.clip,
          id: uid("clip"),
          trimStart: (at.clip.trimStart || 0) + at.local,
          duration: at.clip.duration - at.local,
          transition: "cut",
        },
      );
      return { ...video, timeline: clips };
    });
  };
  useGraphicFonts([
    designSystem?.primaryFont,
    ...Object.values(designSystem?.fontFamilies || {}),
    ...(draft.texts || []).map((t) => t.fontFamily),
  ]);
  const uploadBlob = async (blob: Blob, name: string) => {
    const session = await ensureTursoSession().catch(() => null);
    if (blob.size > 100 * 1024 * 1024)
      throw new Error("Envie arquivos de até 100 MB.");
    if (blob.size > 3 * 1024 * 1024) {
      if (!session?.token)
        throw new Error("Entre novamente para enviar arquivos maiores.");
      const safeName = name.replace(/[^a-zA-Z0-9._-]/g, "-");
      const result = await uploadToBlob(
        `5is/${session.ownerId}/${Date.now()}-${safeName}`,
        blob,
        {
          access: "public",
          handleUploadUrl: "/api/upload-client",
          contentType: blob.type,
          headers: { Authorization: `Bearer ${session.token}` },
          multipart: true,
        },
      );
      return result.url;
    }
    const response = await fetch("/api/upload", {
      method: "POST",
      headers: {
        "Content-Type": blob.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(name),
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
      },
      body: blob,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.url)
      throw new Error(
        result.error || "Não foi possível salvar o arquivo na nuvem.",
      );
    return String(result.url);
  };
  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setError("");
    try {
      for (const file of Array.from(files)) {
        if (!/^(image|video|audio)\//.test(file.type))
          throw new Error("Envie imagens, vídeos ou arquivos de áudio.");
        const url = await uploadBlob(file, file.name);
        if (file.type.startsWith("audio/")) {
          change((video) => ({
            ...video,
            audioTracks: [
              ...(video.audioTracks || []),
              {
                id: uid("audio"),
                url,
                name: file.name,
                start: 0,
                end: duration || 6,
                offset: 0,
                volume: 0.7,
              },
            ],
          }));
          selectTool("audio");
        } else {
          const item: VideoMediaItem = {
            id: uid("media"),
            kind: file.type.startsWith("video/") ? "video" : "image",
            url,
            name: file.name,
            source: "upload",
          };
          setLibrary((items) => [item, ...items]);
          change((video) => ({
            ...video,
            media: [...(video.media || []), item],
          }));
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  const renderAndSave = async (
    video: VideoDocument,
    controller: AbortController,
  ) => {
    setStatus("Renderizando a montagem…");
    setProgress(0);
    await ensureGraphicFonts((video.texts || []).map((t) => t.fontFamily));
    const blob = await exportVideo(video, {
      signal: controller.signal,
      onProgress: (value) => {
        if (mounted.current) setProgress(value);
      },
    });
    if (!mounted.current || controller.signal.aborted) return;
    setDownloadMime(blob.type);
    setDownloadUrl(URL.createObjectURL(blob));
    setStatus("Vídeo pronto para baixar.");
    try {
      const url = await uploadBlob(
        blob,
        `video-5is-${Date.now()}.${blob.type.includes("mp4") ? "mp4" : "webm"}`,
      );
      if (mounted.current)
        setDraft((current) => ({ ...current, generatedUrl: url }));
    } catch (err: any) {
      if (mounted.current)
        setStatus(`Vídeo pronto para baixar. ${err.message}`);
    }
  };
  const runExport = async () => {
    if (busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setPlaying(false);
    setError("");
    try {
      await renderAndSave(draft, controller);
    } catch (err: any) {
      setError(
        err.name === "AbortError"
          ? "Exportação cancelada. Sua edição foi preservada."
          : err.message,
      );
    } finally {
      if (mounted.current) {
        setBusy(false);
        abortRef.current = null;
      }
    }
  };
  const executeAI = async () => {
    if (!draft.prompt?.trim())
      return setError("Descreva o vídeo ou cole o roteiro.");
    if (busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setPlaying(false);
    setError("");
    setStatus("A IA está montando as cenas…");
    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch("/api/mediators/think", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(session?.token
            ? { Authorization: `Bearer ${session.token}` }
            : {}),
        },
        body: JSON.stringify({
          mode: "video-compose",
          prompt: draft.prompt,
          video: {
            title: draft.title,
            format: draft.format,
            width: draft.width,
            height: draft.height,
            currentTimeline: draft.timeline?.map(({ url, ...scene }) => scene),
            media: library.map((item) => ({
              id: item.id,
              name: item.name,
              kind: item.kind,
              fitHint:
                item.url.startsWith("data:image/svg") ||
                /\.svg(?:[?#]|$)/i.test(item.url) ||
                /\.svg$/i.test(item.name)
                  ? "contain"
                  : undefined,
            })),
          },
          project: { name: title },
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.videoPlan)
        throw new Error(result.error || "A IA não devolveu cenas executáveis.");
      let next = applyVideoComposition(
        {
          ...draft,
          defaultFontFamily:
            designSystem?.fontFamilies?.display ||
            designSystem?.primaryFont ||
            draft.defaultFontFamily ||
            "Inter",
        },
        result.videoPlan,
        library,
      );
      const format = FORMATS.find(
        (item) => item.id === result.videoPlan.format,
      );
      if (format)
        next = {
          ...next,
          format: format.id as VideoFormatPreset,
          width: format.width,
          height: format.height,
          exportWidth: format.width > format.height ? 1280 : 720,
        };
      setHistory((previous) => [...previous, draft].slice(-40));
      setFuture([]);
      setDraft(next);
      setSelectedClipId(next.timeline![0].id);
      setPlayhead(0.3);
      await renderAndSave(next, controller);
    } catch (err: any) {
      setError(
        err.name === "AbortError"
          ? "Execução cancelada. As cenas já montadas continuam editáveis."
          : err.message,
      );
    } finally {
      if (mounted.current) {
        setBusy(false);
        abortRef.current = null;
      }
    }
  };
  const dragPosition = (event: React.PointerEvent) => {
    const drag = dragRef.current,
      rect = stageRef.current?.getBoundingClientRect();
    if (!drag || !rect) return;
    const x = bounded(
        ((event.clientX - rect.left) / rect.width) * 100,
        2,
        98,
        50,
      ),
      y = bounded(((event.clientY - rect.top) / rect.height) * 100, 2, 98, 50);
    change(
      (video) =>
        drag.kind === "text"
          ? {
              ...video,
              texts: video.texts!.map((layer) =>
                layer.id === drag.id ? { ...layer, x, y } : layer,
              ),
            }
          : {
              ...video,
              overlays: video.overlays!.map((layer) =>
                layer.id === drag.id ? { ...layer, x, y } : layer,
              ),
            },
      false,
    );
  };
  const undo = () => {
    if (!history.length || busy) return;
    const previous = history[history.length - 1];
    setFuture((items) => [draft, ...items]);
    setHistory((items) => items.slice(0, -1));
    setDraft(previous);
    setDownloadUrl("");
  };
  const redo = () => {
    if (!future.length || busy) return;
    setHistory((items) => [...items, draft]);
    setDraft(future[0]);
    setFuture((items) => items.slice(1));
    setDownloadUrl("");
  };
  const trackWidth = Math.max(420, duration * timelineZoom),
    currentTool = TOOLS.find((item) => item.id === tool)!;
  const timelineSeek = (event: React.PointerEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPlayhead(
      bounded((event.clientX - rect.left) / timelineZoom, 0, duration, 0),
    );
    setPlaying(false);
  };
  return (
    <div
      className="studio-editor video-editor fixed inset-0 z-[125]"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header className="video-editor-header">
        <button
          type="button"
          aria-label="Fechar editor de vídeo"
          onClick={onClose}
        >
          <X />
        </button>
        <div className="video-editor-title">
          <b>{title}</b>
          <span>
            {draft.width} × {draft.height} · {clock(duration)}
          </span>
        </div>
        <button
          type="button"
          disabled={!canEdit || busy}
          onClick={() => onSave({ ...draft, media: library, duration })}
          aria-label="Salvar edição"
        >
          <Save />
          <span>Salvar</span>
        </button>
        <button
          type="button"
          className="video-primary-action"
          disabled={!canEdit || busy || !duration}
          onClick={() => void runExport()}
        >
          <Download />
          <span>Exportar</span>
        </button>
      </header>
      <div className={`video-workspace ${panelOpen ? "has-panel" : ""}`}>
        <main className="video-main">
          <div className="video-preview-zone" ref={previewZoneRef}>
            <div
              className="video-stage"
              ref={stageRef}
              style={{ width: stageSize.width, height: stageSize.height }}
            >
              <CompositionCanvas
                document={draft}
                time={playhead}
                playing={playing}
                onError={setError}
              />
              {selectedText &&
                playhead >= selectedText.start &&
                playhead < selectedText.end && (
                  <button
                    type="button"
                    className="video-position-handle"
                    aria-label={`Mover texto: ${selectedText.text}`}
                    style={{
                      left: `${selectedText.x}%`,
                      top: `${selectedText.y}%`,
                      width: `${selectedText.width}%`,
                    }}
                    onPointerDown={(event) => {
                      if (!canEdit || busy) return;
                      setHistory((items) => [...items, draft].slice(-40));
                      setFuture([]);
                      dragRef.current = { id: selectedText.id, kind: "text" };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={dragPosition}
                    onPointerUp={() => (dragRef.current = null)}
                    onPointerCancel={() => (dragRef.current = null)}
                    onKeyDown={(event) => {
                      const offset = event.shiftKey ? 5 : 1;
                      if (
                        [
                          "ArrowLeft",
                          "ArrowRight",
                          "ArrowUp",
                          "ArrowDown",
                        ].includes(event.key)
                      ) {
                        event.preventDefault();
                        patchText({
                          x: bounded(
                            selectedText.x +
                              (event.key === "ArrowRight"
                                ? offset
                                : event.key === "ArrowLeft"
                                  ? -offset
                                  : 0),
                            2,
                            98,
                            50,
                          ),
                          y: bounded(
                            selectedText.y +
                              (event.key === "ArrowDown"
                                ? offset
                                : event.key === "ArrowUp"
                                  ? -offset
                                  : 0),
                            2,
                            98,
                            50,
                          ),
                        });
                      }
                    }}
                  >
                    <span>Mover texto</span>
                  </button>
                )}
              {selectedLayer &&
                playhead >= selectedLayer.start &&
                playhead < selectedLayer.end && (
                  <button
                    type="button"
                    className="video-position-handle"
                    aria-label={`Mover camada: ${selectedLayer.name}`}
                    style={{
                      left: `${selectedLayer.x}%`,
                      top: `${selectedLayer.y}%`,
                      width: `${selectedLayer.width}%`,
                    }}
                    onPointerDown={(event) => {
                      if (!canEdit || busy) return;
                      setHistory((items) => [...items, draft].slice(-40));
                      dragRef.current = { id: selectedLayer.id, kind: "layer" };
                      event.currentTarget.setPointerCapture(event.pointerId);
                    }}
                    onPointerMove={dragPosition}
                    onPointerUp={() => (dragRef.current = null)}
                    onPointerCancel={() => (dragRef.current = null)}
                  >
                    <span>Mover camada</span>
                  </button>
                )}
            </div>
          </div>
          <div className="video-playback-bar">
            <span>
              {clock(playhead)} / {clock(duration)}
            </span>
            <button
              type="button"
              aria-label={playing ? "Pausar vídeo" : "Reproduzir vídeo"}
              disabled={!duration || busy}
              onClick={() => {
                if (playhead >= duration) setPlayhead(0);
                setPlaying((value) => !value);
              }}
            >
              {playing ? <Pause /> : <Play />}
            </button>
            <button
              type="button"
              aria-label="Desfazer edição"
              disabled={!history.length || busy || !canEdit}
              onClick={undo}
            >
              <Undo2 />
            </button>
            <button
              type="button"
              aria-label="Refazer edição"
              disabled={!future.length || busy || !canEdit}
              onClick={redo}
            >
              <Redo2 />
            </button>
            <button
              type="button"
              aria-label="Dividir cena no cursor"
              disabled={!duration || busy || !canEdit}
              onClick={split}
            >
              <Scissors />
            </button>
          </div>
          <div className="video-timeline-header">
            <b>Sequência de cenas</b>
            <label>
              Zoom
              <input
                aria-label="Zoom da timeline"
                type="range"
                min={20}
                max={90}
                value={timelineZoom}
                onChange={(event) => setTimelineZoom(+event.target.value)}
              />
            </label>
          </div>
          <div
            ref={timelineRef}
            className="video-timeline-scroll"
            aria-label="Timeline do vídeo"
          >
            <div className="video-tracks" style={{ width: trackWidth }}>
              <div className="video-time-ruler" onPointerDown={timelineSeek}>
                {Array.from({ length: Math.ceil(duration) + 1 }, (_, index) => (
                  <span key={index} style={{ left: index * timelineZoom }}>
                    {clock(index)}
                  </span>
                ))}
              </div>
              <div className="video-scene-track">
                {draft.timeline!.map((clip, index) => (
                  <React.Fragment key={clip.id}>
                    <button
                      type="button"
                      className={`video-clip ${selectedClip?.id === clip.id ? "is-selected" : ""}`}
                      aria-label={`Selecionar cena ${index + 1}: ${clip.name}`}
                      aria-pressed={selectedClip?.id === clip.id}
                      style={{ width: clip.duration * timelineZoom }}
                      onClick={() => selectClip(clip, index)}
                      draggable={canEdit && !busy}
                      onDragStart={(event) =>
                        event.dataTransfer.setData("text/plain", clip.id)
                      }
                      onDragOver={(event) => event.preventDefault()}
                      onDrop={(event) => {
                        event.preventDefault();
                        const id = event.dataTransfer.getData("text/plain");
                        change((video) => {
                          const clips = [...video.timeline!],
                            from = clips.findIndex((item) => item.id === id);
                          if (from < 0) return video;
                          const [moving] = clips.splice(from, 1);
                          clips.splice(index, 0, moving);
                          return { ...video, timeline: clips };
                        });
                      }}
                    >
                      <div className="video-filmstrip">
                        {[0, 1, 2].map((sample) => (
                          <FrameThumbnail
                            key={sample}
                            clip={clip}
                            index={sample}
                          />
                        ))}
                      </div>
                      <span>
                        {index + 1} · {clip.name}
                      </span>
                      <small>{clip.duration.toFixed(1)}s</small>
                    </button>
                    {index < draft.timeline!.length - 1 && (
                      <button
                        type="button"
                        className="video-transition-marker"
                        style={{
                          left:
                            draft
                              .timeline!.slice(0, index + 1)
                              .reduce((sum, item) => sum + item.duration, 0) *
                              timelineZoom -
                            22,
                        }}
                        aria-label={`Editar transição entre cenas ${index + 1} e ${index + 2}`}
                        onClick={() => {
                          setSelectedClipId(draft.timeline![index + 1].id);
                          setPlayhead(
                            draft
                              .timeline!.slice(0, index + 1)
                              .reduce((sum, item) => sum + item.duration, 0) +
                              0.2,
                          );
                          selectTool("transitions");
                        }}
                      >
                        <Film size={12} />
                      </button>
                    )}
                  </React.Fragment>
                ))}
                <button
                  type="button"
                  className="video-add-scene"
                  onClick={() => selectTool("media")}
                  aria-label="Adicionar cena"
                >
                  <Plus />
                </button>
              </div>
              <div className="video-layer-track">
                {draft.texts!.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    style={{
                      left: layer.start * timelineZoom,
                      width: Math.max(
                        32,
                        (layer.end - layer.start) * timelineZoom,
                      ),
                    }}
                    onClick={() => {
                      setSelectedTextId(layer.id);
                      setSelectedLayerId("");
                      setPlayhead(layer.start + 0.3);
                      selectTool("text");
                    }}
                    aria-label={`Editar texto: ${layer.text}`}
                  >
                    <Type size={12} />
                    {layer.text}
                  </button>
                ))}
              </div>
              <div className="video-audio-track">
                {draft.audioTracks!.map((track) => (
                  <button
                    key={track.id}
                    type="button"
                    style={{
                      left: track.start * timelineZoom,
                      width: Math.max(
                        32,
                        (track.end - track.start) * timelineZoom,
                      ),
                    }}
                    onClick={() => selectTool("audio")}
                  >
                    <Music2 size={12} />
                    {track.name}
                  </button>
                ))}
              </div>
              <div
                className="video-playhead"
                style={{ left: playhead * timelineZoom }}
              />
            </div>
          </div>
        </main>
        {panelOpen && (
          <aside
            className="video-tool-panel"
            aria-label={`Ferramentas de ${currentTool.label}`}
          >
            <div className="video-panel-heading">
              <b>
                <currentTool.icon size={18} />
                {currentTool.label}
              </b>
              <button
                type="button"
                aria-label="Recolher ferramentas"
                onClick={() => setPanelOpen(false)}
              >
                <ChevronDown />
              </button>
            </div>
            <div className="video-panel-content">
              <fieldset disabled={!canEdit || busy}>
                {tool === "media" && (
                  <>
                    <button
                      type="button"
                      className="video-action"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload />
                      {uploading ? "Enviando…" : "Adicionar mídia"}
                    </button>
                    <button
                      type="button"
                      className="video-action"
                      onClick={() => addScene()}
                    >
                      <Plus />
                      Cena gráfica sem mídia
                    </button>
                    <div className="video-media-grid">
                      {library.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          aria-label={`Adicionar cena: ${item.name}`}
                          onClick={() => addScene(item)}
                        >
                          {item.kind === "image" ? (
                            <img src={item.url} alt="" />
                          ) : (
                            <video src={item.url} muted playsInline />
                          )}
                          <span>{item.name}</span>
                          <Plus size={16} />
                        </button>
                      ))}
                    </div>
                    {!library.length && (
                      <p>
                        Envie imagens ou vídeos, ou monte cenas gráficas com
                        textos e movimento.
                      </p>
                    )}
                  </>
                )}
                {tool === "edit" &&
                  (selectedClip ? (
                    <>
                      <h3>{selectedClip.name}</h3>
                      <div className="video-field-grid">
                        <Field label="Duração (s)">
                          <input
                            type="number"
                            min={0.25}
                            max={600}
                            step={0.25}
                            value={selectedClip.duration}
                            onChange={(event) =>
                              patchClip({
                                duration: bounded(
                                  event.target.value,
                                  0.25,
                                  600,
                                  3,
                                ),
                              })
                            }
                          />
                        </Field>
                        <Field label="Início no arquivo (s)">
                          <input
                            type="number"
                            min={0}
                            step={0.1}
                            value={selectedClip.trimStart || 0}
                            onChange={(event) =>
                              patchClip({
                                trimStart: bounded(
                                  event.target.value,
                                  0,
                                  600,
                                  0,
                                ),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Field label="Enquadramento">
                        <select
                          value={selectedClip.fit || "cover"}
                          onChange={(event) =>
                            patchClip({
                              fit: event.target.value as "cover" | "contain",
                            })
                          }
                        >
                          <option value="cover">Preencher quadro</option>
                          <option value="contain">Mostrar mídia inteira</option>
                        </select>
                      </Field>
                      <Field label="Escala proporcional">
                        <input
                          aria-label="Escala da mídia"
                          type="range"
                          min="0.25"
                          max="3"
                          step="0.01"
                          value={selectedClip.scale || 1}
                          onChange={(e) =>
                            patchClip({ scale: +e.target.value })
                          }
                        />
                        <span>
                          {Math.round((selectedClip.scale || 1) * 100)}%
                        </span>
                      </Field>
                      <div className="video-field-grid">
                        {(["x", "y"] as const).map((axis) => (
                          <Field
                            key={axis}
                            label={
                              axis === "x"
                                ? "Posição horizontal"
                                : "Posição vertical"
                            }
                          >
                            <input
                              aria-label={`Posição ${axis} da mídia`}
                              type="range"
                              min="0"
                              max="100"
                              value={selectedClip[axis] ?? 50}
                              onChange={(e) =>
                                patchClip({ [axis]: +e.target.value })
                              }
                            />
                          </Field>
                        ))}
                      </div>
                      <div className="video-button-row">
                        <button type="button" onClick={() => moveScene(-1)}>
                          <ArrowLeft />
                          Antes
                        </button>
                        <button type="button" onClick={() => moveScene(1)}>
                          Depois
                          <ArrowRight />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="video-action"
                        onClick={split}
                      >
                        <Scissors />
                        Dividir no cursor
                      </button>
                      <button
                        type="button"
                        className="video-action video-danger"
                        onClick={() =>
                          change((video) => ({
                            ...video,
                            timeline: video.timeline!.filter(
                              (clip) => clip.id !== selectedClip.id,
                            ),
                          }))
                        }
                      >
                        <Trash2 />
                        Remover cena
                      </button>
                    </>
                  ) : (
                    <p>Selecione uma cena na timeline.</p>
                  ))}
                {tool === "text" && (
                  <>
                    <button
                      type="button"
                      className="video-action"
                      onClick={addText}
                    >
                      <Plus />
                      Adicionar texto
                    </button>
                    <div className="video-text-list">
                      {draft.texts!.map((layer) => (
                        <button
                          type="button"
                          key={layer.id}
                          aria-pressed={selectedTextId === layer.id}
                          onClick={() => {
                            setSelectedTextId(layer.id);
                            setSelectedLayerId("");
                            setPlayhead(layer.start + 0.3);
                          }}
                        >
                          {layer.text}
                        </button>
                      ))}
                    </div>
                    {selectedText && (
                      <>
                        <Field label="Texto">
                          <textarea
                            value={selectedText.text}
                            onChange={(event) =>
                              patchText({ text: event.target.value })
                            }
                          />
                        </Field>
                        <p>
                          Arraste a caixa na prévia. Com o teclado, use as
                          setas; Shift move em passos maiores.
                        </p>
                        <div className="video-position-grid">
                          {[15, 50, 85].flatMap((y) =>
                            [15, 50, 85].map((x) => (
                              <button
                                key={`${x}-${y}`}
                                type="button"
                                aria-label={`Posição do texto ${x}% horizontal, ${y}% vertical`}
                                aria-pressed={
                                  selectedText.x === x && selectedText.y === y
                                }
                                onClick={() =>
                                  patchText({
                                    x,
                                    y,
                                    width:
                                      x === 50
                                        ? selectedText.width
                                        : Math.min(selectedText.width, 28),
                                  })
                                }
                              >
                                <span />
                              </button>
                            )),
                          )}
                        </div>
                        <div className="video-field-grid">
                          <Field label="X (%)">
                            <input
                              type="number"
                              min={2}
                              max={98}
                              value={selectedText.x}
                              onChange={(event) =>
                                patchText({
                                  x: bounded(event.target.value, 2, 98, 50),
                                })
                              }
                            />
                          </Field>
                          <Field label="Y (%)">
                            <input
                              type="number"
                              min={2}
                              max={98}
                              value={selectedText.y}
                              onChange={(event) =>
                                patchText({
                                  y: bounded(event.target.value, 2, 98, 50),
                                })
                              }
                            />
                          </Field>
                          <Field label="Tamanho (% da largura)">
                            <input
                              type="number"
                              min={2}
                              max={16}
                              step={0.25}
                              value={selectedText.fontSize}
                              onChange={(event) =>
                                patchText({
                                  fontSize: bounded(
                                    event.target.value,
                                    2,
                                    16,
                                    6,
                                  ),
                                })
                              }
                            />
                          </Field>
                          <Field label="Largura (%)">
                            <input
                              type="number"
                              min={10}
                              max={95}
                              value={selectedText.width}
                              onChange={(event) =>
                                patchText({
                                  width: bounded(
                                    event.target.value,
                                    10,
                                    95,
                                    84,
                                  ),
                                })
                              }
                            />
                          </Field>
                          <Field label="Início (s)">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={selectedText.start}
                              onChange={(event) =>
                                patchText({
                                  start: bounded(
                                    event.target.value,
                                    0,
                                    selectedText.end - 0.1,
                                    0,
                                  ),
                                })
                              }
                            />
                          </Field>
                          <Field label="Fim (s)">
                            <input
                              type="number"
                              min={selectedText.start + 0.1}
                              step={0.1}
                              value={selectedText.end}
                              onChange={(event) =>
                                patchText({
                                  end: bounded(
                                    event.target.value,
                                    selectedText.start + 0.1,
                                    Math.max(
                                      duration,
                                      selectedText.start + 0.1,
                                    ),
                                    duration,
                                  ),
                                })
                              }
                            />
                          </Field>
                        </div>
                        <Field label="Fonte">
                          <FontPicker
                            value={selectedText.fontFamily}
                            onChange={(fontFamily) => patchText({ fontFamily })}
                            preferred={Object.values(
                              designSystem?.fontFamilies || {},
                            )}
                          />
                        </Field>
                        <div className="video-field-grid">
                          <Field label="Cor do texto">
                            <input
                              type="color"
                              value={color(selectedText.color)}
                              onChange={(event) =>
                                patchText({ color: event.target.value })
                              }
                            />
                          </Field>
                          <Field label="Alinhamento">
                            <select
                              value={selectedText.align}
                              onChange={(event) =>
                                patchText({
                                  align: event.target
                                    .value as VideoTextLayer["align"],
                                })
                              }
                            >
                              <option value="left">Esquerda</option>
                              <option value="center">Centro</option>
                              <option value="right">Direita</option>
                            </select>
                          </Field>
                        </div>
                        <button
                          type="button"
                          className="video-action"
                          aria-pressed={selectedText.bold}
                          onClick={() =>
                            patchText({ bold: !selectedText.bold })
                          }
                        >
                          Negrito
                        </button>
                        <Field label="Animação do texto">
                          <select
                            value={selectedText.animation || "none"}
                            onChange={(event) =>
                              patchText({
                                animation: event.target
                                  .value as VideoTextLayer["animation"],
                              })
                            }
                          >
                            <option value="none">Sem animação</option>
                            <option value="fade">Aparecer suavemente</option>
                            <option value="pop">Aproximar</option>
                            <option value="float">Flutuar</option>
                          </select>
                        </Field>
                        <button
                          type="button"
                          className="video-action video-danger"
                          onClick={() => {
                            change((video) => ({
                              ...video,
                              texts: video.texts!.filter(
                                (layer) => layer.id !== selectedTextId,
                              ),
                            }));
                            setSelectedTextId("");
                          }}
                        >
                          <Trash2 />
                          Remover texto
                        </button>
                      </>
                    )}
                  </>
                )}
                {tool === "transitions" &&
                  (selectedClip ? (
                    <>
                      <p>
                        A transição acontece na entrada da cena selecionada.
                        Toque no ícone entre duas cenas para editar.
                      </p>
                      <div className="video-transition-grid">
                        {[
                          { id: "cut", label: "Corte" },
                          { id: "fade", label: "Dissolver" },
                          { id: "slide", label: "Deslizar" },
                          { id: "zoom", label: "Aproximar" },
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            aria-pressed={selectedClip.transition === item.id}
                            onClick={() =>
                              patchClip({
                                transition: item.id as VideoTransition,
                              })
                            }
                          >
                            <span
                              className={`video-transition-sample ${item.id}`}
                            >
                              <i />
                              <i />
                            </span>
                            {item.label}
                          </button>
                        ))}
                      </div>
                      <Field label="Tempo da transição (s)">
                        <input
                          type="range"
                          min={0}
                          max={Math.min(2, selectedClip.duration / 2)}
                          step={0.1}
                          value={selectedClip.transitionDuration ?? 0.5}
                          onChange={(event) =>
                            patchClip({
                              transitionDuration: +event.target.value,
                            })
                          }
                        />
                        <output>
                          {selectedClip.transitionDuration ?? 0.5}s
                        </output>
                      </Field>
                    </>
                  ) : (
                    <p>Adicione cenas para escolher uma transição.</p>
                  ))}
                {tool === "effects" &&
                  (selectedClip ? (
                    <>
                      <Field label="Movimento da cena">
                        <select
                          value={selectedClip.motion || "none"}
                          onChange={(event) =>
                            patchClip({
                              motion: event.target
                                .value as VideoTimelineItem["motion"],
                            })
                          }
                        >
                          <option value="none">Sem movimento</option>
                          <option value="zoom-in">Aproximar lentamente</option>
                          <option value="zoom-out">Afastar lentamente</option>
                          <option value="pan-left">Mover à esquerda</option>
                          <option value="pan-right">Mover à direita</option>
                          <option value="float">Flutuar</option>
                          <option value="pulse">Pulsar</option>
                          <option value="rotate">Oscilar rotação</option>
                        </select>
                      </Field>
                      <Field label="Tratamento da imagem">
                        <select
                          value={selectedClip.effect || "none"}
                          onChange={(event) =>
                            patchClip({
                              effect: event.target
                                .value as VideoTimelineItem["effect"],
                            })
                          }
                        >
                          <option value="none">Original</option>
                          <option value="grayscale">Preto e branco</option>
                          <option value="warm">Quente</option>
                          <option value="cool">Frio</option>
                          <option value="contrast">Contraste</option>
                          <option value="blur">Desfocar</option>
                        </select>
                      </Field>
                      {selectedClip.kind === "color" && (
                        <>
                          <Field label="Fundo da cena">
                            <select
                              value={selectedClip.backgroundStyle || "plain"}
                              onChange={(event) =>
                                patchClip({
                                  backgroundStyle: event.target
                                    .value as VideoTimelineItem["backgroundStyle"],
                                })
                              }
                            >
                              <option value="plain">Cor sólida</option>
                              <option value="gradient">Gradiente</option>
                              <option value="particles">
                                Partículas em movimento
                              </option>
                            </select>
                          </Field>
                          <Field label="Cor da cena">
                            <input
                              type="color"
                              value={color(
                                selectedClip.background || draft.background,
                              )}
                              onChange={(event) =>
                                patchClip({ background: event.target.value })
                              }
                            />
                          </Field>
                        </>
                      )}
                    </>
                  ) : (
                    <p>Selecione uma cena.</p>
                  ))}
                {tool === "layers" && (
                  <>
                    <p>Escolha uma imagem para colocar sobre as cenas.</p>
                    <div className="video-media-grid">
                      {library
                        .filter((item) => item.kind === "image")
                        .map((item) => (
                          <button
                            type="button"
                            key={item.id}
                            onClick={() => {
                              const layer = {
                                id: uid("layer"),
                                mediaId: item.id,
                                url: item.url,
                                name: item.name,
                                kind: "image" as const,
                                x: 50,
                                y: 50,
                                width: 35,
                                opacity: 1,
                                start: 0,
                                end: duration || 3,
                                animation: "fade" as const,
                              };
                              change((video) => ({
                                ...video,
                                overlays: [...video.overlays!, layer],
                              }));
                              setSelectedLayerId(layer.id);
                              setSelectedTextId("");
                            }}
                          >
                            <img alt="" src={item.url} />
                            <span>{item.name}</span>
                          </button>
                        ))}
                    </div>
                    {draft.overlays!.map((layer) => (
                      <button
                        type="button"
                        className="video-action"
                        key={layer.id}
                        onClick={() => {
                          setSelectedLayerId(layer.id);
                          setSelectedTextId("");
                          setPlayhead(layer.start + 0.3);
                        }}
                      >
                        {layer.name}
                      </button>
                    ))}
                    {selectedLayer && (
                      <>
                        <Field label="Largura da camada (%)">
                          <input
                            type="range"
                            min={5}
                            max={100}
                            value={selectedLayer.width}
                            onChange={(event) =>
                              change((video) => ({
                                ...video,
                                overlays: video.overlays!.map((layer) =>
                                  layer.id === selectedLayer.id
                                    ? { ...layer, width: +event.target.value }
                                    : layer,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <Field label="Animação da camada">
                          <select
                            value={selectedLayer.animation}
                            onChange={(event) =>
                              change((video) => ({
                                ...video,
                                overlays: video.overlays!.map((layer) =>
                                  layer.id === selectedLayer.id
                                    ? {
                                        ...layer,
                                        animation: event.target.value as any,
                                      }
                                    : layer,
                                ),
                              }))
                            }
                          >
                            <option value="none">Sem animação</option>
                            <option value="fade">Aparecer</option>
                            <option value="pop">Aproximar</option>
                            <option value="float">Flutuar</option>
                            <option value="spin">Girar</option>
                          </select>
                        </Field>
                        <button
                          type="button"
                          className="video-action video-danger"
                          onClick={() =>
                            change((video) => ({
                              ...video,
                              overlays: video.overlays!.filter(
                                (layer) => layer.id !== selectedLayer.id,
                              ),
                            }))
                          }
                        >
                          <Trash2 />
                          Remover camada
                        </button>
                      </>
                    )}
                  </>
                )}
                {tool === "audio" && (
                  <>
                    <button
                      type="button"
                      className="video-action"
                      onClick={() => fileRef.current?.click()}
                    >
                      <Upload />
                      Adicionar áudio
                    </button>
                    {selectedClip?.kind === "video" && (
                      <button
                        type="button"
                        className="video-action"
                        aria-pressed={selectedClip.muted !== false}
                        onClick={() =>
                          patchClip({ muted: selectedClip.muted === false })
                        }
                      >
                        <Music2 />
                        {selectedClip.muted === false
                          ? "Silenciar cena"
                          : "Ativar áudio da cena"}
                      </button>
                    )}
                    {draft.audioTracks!.map((track) => (
                      <div key={track.id} className="video-audio-settings">
                        <b>{track.name}</b>
                        <Field label="Volume">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.05}
                            value={track.volume}
                            onChange={(event) =>
                              change((video) => ({
                                ...video,
                                audioTracks: video.audioTracks!.map((item) =>
                                  item.id === track.id
                                    ? { ...item, volume: +event.target.value }
                                    : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <div className="video-field-grid">
                          <Field label="Início (s)">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={track.start}
                              onChange={(event) =>
                                change((video) => ({
                                  ...video,
                                  audioTracks: video.audioTracks!.map((item) =>
                                    item.id === track.id
                                      ? {
                                          ...item,
                                          start: bounded(
                                            event.target.value,
                                            0,
                                            track.end - 0.1,
                                            0,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                          </Field>
                          <Field label="Fim (s)">
                            <input
                              type="number"
                              min={track.start + 0.1}
                              step={0.1}
                              value={track.end}
                              onChange={(event) =>
                                change((video) => ({
                                  ...video,
                                  audioTracks: video.audioTracks!.map((item) =>
                                    item.id === track.id
                                      ? {
                                          ...item,
                                          end: bounded(
                                            event.target.value,
                                            track.start + 0.1,
                                            Math.max(
                                              duration,
                                              track.start + 0.1,
                                            ),
                                            duration,
                                          ),
                                        }
                                      : item,
                                  ),
                                }))
                              }
                            />
                          </Field>
                        </div>
                        <button
                          type="button"
                          aria-label={`Remover áudio: ${track.name}`}
                          onClick={() =>
                            change((video) => ({
                              ...video,
                              audioTracks: video.audioTracks!.filter(
                                (item) => item.id !== track.id,
                              ),
                            }))
                          }
                        >
                          <Trash2 />
                        </button>
                      </div>
                    ))}
                  </>
                )}
                {tool === "ai" && (
                  <>
                    <p>
                      Cole seu roteiro ou descreva o resultado. A IA monta
                      cenas, textos, posições, movimentos e transições; em
                      seguida o editor renderiza o vídeo automaticamente.
                    </p>
                    <Field label="Roteiro / instrução para a IA">
                      <textarea
                        value={draft.prompt || ""}
                        placeholder="Ex.: vídeo vertical de 12 segundos sobre meu projeto. Abertura com uma pergunta no centro, depois apresente a solução; feche com uma chamada. Fundo com partículas, textos curtos e transições suaves."
                        onChange={(event) =>
                          change((video) => ({
                            ...video,
                            prompt: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <VoiceDictationButton
                      onText={(text) =>
                        change((video) => ({
                          ...video,
                          prompt: `${video.prompt || ""} ${text}`,
                        }))
                      }
                    />
                    <button
                      type="button"
                      className="video-action video-primary-action"
                      onClick={() => void executeAI()}
                    >
                      <WandSparkles />
                      Executar roteiro e gerar vídeo
                    </button>
                    <p>
                      Com mídia do projeto, a IA faz a montagem. Sem mídia, cria
                      cenas gráficas com texto e movimento.
                    </p>
                    {draft.aiPlan!.map((note, index) => (
                      <p key={index}>{note}</p>
                    ))}
                  </>
                )}
                {tool === "format" && (
                  <>
                    <Field label="Nome do vídeo">
                      <input
                        value={draft.title}
                        onChange={(event) =>
                          change((video) => ({
                            ...video,
                            title: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <div className="video-transition-grid">
                      {FORMATS.map((format) => (
                        <button
                          type="button"
                          key={format.id}
                          aria-pressed={draft.format === format.id}
                          onClick={() =>
                            change((video) => ({
                              ...video,
                              format: format.id as VideoFormatPreset,
                              width: format.width,
                              height: format.height,
                              exportWidth:
                                format.width > format.height ? 1280 : 720,
                            }))
                          }
                        >
                          {format.label}
                        </button>
                      ))}
                    </div>
                    <Field label="Fundo geral">
                      <input
                        type="color"
                        value={color(draft.background)}
                        onChange={(event) =>
                          change((video) => ({
                            ...video,
                            background: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Cor de destaque">
                      <input
                        type="color"
                        value={color(draft.accent)}
                        onChange={(event) =>
                          change((video) => ({
                            ...video,
                            accent: event.target.value,
                          }))
                        }
                      />
                    </Field>
                    <Field label="Resolução de exportação">
                      <select
                        value={
                          draft.exportWidth ||
                          (draft.width > draft.height ? 1280 : 720)
                        }
                        onChange={(event) =>
                          change((video) => ({
                            ...video,
                            exportWidth: +event.target.value,
                          }))
                        }
                      >
                        {(draft.width > draft.height
                          ? [960, 1280, 1920]
                          : [540, 720, 1080]
                        ).map((width) => (
                          <option key={width} value={width}>
                            {width} ×{" "}
                            {Math.round((width * draft.height) / draft.width)}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </>
                )}
              </fieldset>
            </div>
          </aside>
        )}
      </div>
      {(busy || error || status || downloadUrl || draft.generatedUrl) && (
        <div className="video-status" aria-live="polite">
          {busy ? (
            <>
              <Loader2 className="animate-spin" />
              <span>
                {status} {Math.round(progress * 100)}%
              </span>
              <button type="button" onClick={() => abortRef.current?.abort()}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <span className={error ? "video-error" : ""}>
                {error || status}
              </span>
              {(downloadUrl || draft.generatedUrl) && (
                <a
                  href={downloadUrl || draft.generatedUrl}
                  download={`video-5is.${downloadMime.includes("mp4") ? "mp4" : "webm"}`}
                >
                  <Download size={16} />
                  Baixar vídeo
                </a>
              )}
            </>
          )}
        </div>
      )}
      <nav
        className="video-tool-dock"
        aria-label="Ferramentas de edição de vídeo"
      >
        <button
          type="button"
          className="video-dock-expand"
          aria-label={
            panelOpen
              ? "Recolher menu de ferramentas"
              : "Expandir menu de ferramentas"
          }
          aria-expanded={panelOpen}
          onClick={() => setPanelOpen((value) => !value)}
        >
          {panelOpen ? <ChevronDown /> : <ChevronUp />}
          <span>{panelOpen ? "Recolher" : "Expandir"}</span>
        </button>
        <div className="video-dock-scroll">
          {TOOLS.map((item) => (
            <button
              type="button"
              key={item.id}
              aria-pressed={tool === item.id && panelOpen}
              onClick={() => selectTool(item.id)}
            >
              <item.icon />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>
      <input
        type="file"
        ref={fileRef}
        className="hidden"
        accept={tool === "audio" ? "audio/*" : "image/*,video/*,audio/*,.svg"}
        multiple
        onChange={(event) =>
          event.target.files && void uploadFiles(event.target.files)
        }
      />
    </div>
  );
}
