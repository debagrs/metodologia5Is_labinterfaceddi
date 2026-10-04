import type {
  VideoDocument,
  VideoMediaItem,
  VideoTextLayer,
  VideoTimelineItem,
} from "../types";
const uid = (p: string) =>
  `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export const bounded = (
  value: unknown,
  min: number,
  max: number,
  fallback: number,
) =>
  Number.isFinite(Number(value))
    ? Math.max(min, Math.min(max, Number(value)))
    : fallback;
export const videoDuration = (video: VideoDocument) =>
  (video.timeline || []).reduce(
    (sum, clip) => sum + bounded(clip.duration, 0.25, 600, 3),
    0,
  );
export function sceneAt(video: VideoDocument, time: number) {
  const clips = video.timeline || [];
  let start = 0;
  for (let index = 0; index < clips.length; index++) {
    const clip = clips[index];
    if (time < start + clip.duration || index === clips.length - 1)
      return { clip, index, start, local: Math.max(0, time - start) };
    start += clip.duration;
  }
  return null;
}
export function textLayer(
  text: string,
  start: number,
  end: number,
  video: VideoDocument,
  patch: Partial<VideoTextLayer> = {},
): VideoTextLayer {
  return {
    id: uid("text"),
    text,
    x: 50,
    y: 50,
    width: 84,
    fontSize: 6,
    fontFamily: "Arial",
    color: video.textColor || "#FFFFFF",
    align: "center",
    bold: true,
    start,
    end,
    animation: "fade",
    ...patch,
  };
}
export function migrateVideo(video: VideoDocument): VideoDocument {
  const duration = videoDuration(video) || video.duration || 6;
  return {
    ...video,
    aiPlan: video.aiPlan || [],
    media: video.media || [],
    timeline: video.timeline || [],
    overlays: video.overlays || [],
    audioTracks: video.audioTracks || [],
    texts: video.texts || [
      textLayer(video.title, 0, duration, video, { y: 18 }),
      ...(video.subtitle
        ? [
            textLayer(video.subtitle, 0, duration, video, {
              y: 80,
              fontSize: 3.5,
              bold: false,
            }),
          ]
        : []),
      ...(video.timeline || []).flatMap((clip, index) => {
        const start = (video.timeline || [])
          .slice(0, index)
          .reduce((sum, c) => sum + c.duration, 0);
        return clip.caption
          ? [
              textLayer(clip.caption, start, start + clip.duration, video, {
                y: 88,
                fontSize: 3.5,
                bold: false,
              }),
            ]
          : [];
      }),
    ],
  };
}
export function parseVideoComposition(text: string) {
  const raw = String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const first = raw.indexOf("{"),
    last = raw.lastIndexOf("}");
  if (first < 0 || last < first)
    throw new Error("A IA não devolveu uma composição válida.");
  const data = JSON.parse(raw.slice(first, last + 1));
  if (!Array.isArray(data.timeline) || !data.timeline.length)
    throw new Error(
      "A IA não criou cenas. Peça uma montagem com duração e sequência.",
    );
  const transitions = ["cut", "fade", "slide", "zoom"],
    motions = [
      "none",
      "pan-left",
      "pan-right",
      "zoom-in",
      "zoom-out",
      "float",
      "pulse",
      "rotate",
    ];
  return {
    ...data,
    title: String(data.title || "").slice(0, 160),
    subtitle: String(data.subtitle || "").slice(0, 260),
    timeline: data.timeline
      .slice(0, 40)
      .map((clip: any) => ({
        ...clip,
        mediaId: String(clip.mediaId || ""),
        name: String(clip.name || "Cena"),
        duration: bounded(clip.duration, 0.5, 60, 3),
        transition: transitions.includes(clip.transition)
          ? clip.transition
          : "fade",
        transitionDuration: bounded(clip.transitionDuration, 0, 2, 0.5),
        fit: clip.fit === "contain" ? "contain" : "cover",
        motion: motions.includes(clip.motion) ? clip.motion : "none",
        overlayText: String(clip.overlayText || "").slice(0, 500),
        caption: String(clip.caption || "").slice(0, 500),
      })),
    notes: Array.isArray(data.notes) ? data.notes.slice(0, 8).map(String) : [],
  };
}
export function applyVideoComposition(
  video: VideoDocument,
  plan: any,
  library: VideoMediaItem[],
): VideoDocument {
  const timeline: VideoTimelineItem[] = [],
    texts: VideoTextLayer[] = [],
    overlays: NonNullable<VideoDocument["overlays"]> = [];
  let cursor = 0;
  for (const item of plan.timeline || []) {
    const media =
      library.find((m) => m.id === item.mediaId) ||
      library.find((m) => m.name === item.name);
    if (item.mediaId && !media)
      throw new Error(
        `A IA pediu uma mídia indisponível: ${item.mediaId}. Sua montagem anterior foi preservada.`,
      );
    const duration = bounded(item.duration, 0.5, 60, 3);
    timeline.push({
      id: uid("clip"),
      mediaId: media?.id || "",
      kind: media?.kind || "color",
      url: media?.url || "",
      name: item.name || media?.name || "Cena gráfica",
      duration,
      transition: item.transition || "fade",
      transitionDuration: bounded(item.transitionDuration, 0, 2, 0.5),
      fit: item.fit === "contain" ? "contain" : "cover",
      motion: item.motion || "none",
      background: item.background || video.background,
      backgroundStyle: ["gradient", "particles"].includes(item.backgroundStyle)
        ? item.backgroundStyle
        : "plain",
      effect: item.effect || "none",
      muted: true,
      trimStart: bounded(item.trimStart, 0, 600, 0),
    });
    if (item.overlayText)
      texts.push(
        textLayer(String(item.overlayText), cursor, cursor + duration, video, {
          x: bounded(item.textX, 5, 95, 50),
          y: bounded(item.textY, 5, 95, 50),
          fontSize: bounded(item.fontSize, 2, 12, 6),
          animation: item.textAnimation || "fade",
        }),
      );
    if (item.caption)
      texts.push(
        textLayer(String(item.caption), cursor, cursor + duration, video, {
          y: 88,
          fontSize: 3.5,
          bold: false,
        }),
      );
    for (const overlay of item.overlays || []) {
      const asset = library.find(
        (m) => m.id === overlay.mediaId && m.kind === "image",
      );
      if (!asset)
        throw new Error(
          "Uma camada solicitada pela IA não existe na biblioteca.",
        );
      overlays.push({
        id: uid("overlay"),
        mediaId: asset.id,
        url: asset.url,
        name: asset.name,
        kind: "image",
        x: bounded(overlay.x, 0, 100, 50),
        y: bounded(overlay.y, 0, 100, 50),
        width: bounded(overlay.width, 5, 100, 30),
        opacity: 1,
        start: cursor,
        end: cursor + duration,
        animation: overlay.animation || "fade",
      });
    }
    cursor += duration;
  }
  if (!timeline.length) throw new Error("A IA não criou cenas executáveis.");
  return {
    ...video,
    title: plan.title || video.title,
    subtitle: plan.subtitle || "",
    timeline,
    texts,
    overlays,
    duration: cursor,
    aiPlan: plan.notes || [],
    generatedUrl: undefined,
  };
}
export const videoCompositionRules = `Você é diretor(a) de montagem e motion designer do Ateliê 5I's. Converta o roteiro em uma composição EXECUTÁVEL pelo editor: cenas com duração, transições, movimentos, textos posicionados e camadas. O editor renderiza e exporta automaticamente após receber o JSON. Use somente mediaId presentes na biblioteca; NUNCA invente URLs ou imagens. Quando não houver mídia, ou o roteiro pedir motion graphics, crie cenas gráficas com mediaId vazio, background e backgroundStyle plain, gradient ou particles. Não prometa filmagem fotorrealista sem mídia. Não transforme tudo em notas: coloque cada ação em timeline. Texto principal em overlayText, legenda em caption, posições textX/textY em porcentagem. Uma imagem do projeto pode ser sobreposta em overlays. O roteiro deve ter início, desenvolvimento e fechamento, ritmo e textos legíveis no celular. Respeite o tempo total pedido e o formato. Se CURRENT_TIMELINE existir, mantenha o que o usuário não pediu para mudar. Retorne SOMENTE JSON: {"title":"...","format":"reel|story|tiktok|square|feed|youtube|facebook|linkedin|custom","timeline":[{"mediaId":"id real ou vazio","name":"nome da cena","duration":3,"transition":"cut|fade|slide|zoom","transitionDuration":0.5,"fit":"cover|contain","motion":"none|pan-left|pan-right|zoom-in|zoom-out|float|pulse|rotate","background":"#111111","backgroundStyle":"plain|gradient|particles","overlayText":"texto principal","textX":50,"textY":50,"fontSize":6,"textAnimation":"none|fade|pop|float","caption":"legenda opcional","overlays":[{"mediaId":"id de imagem real","x":50,"y":50,"width":28,"animation":"none|fade|pop|float|spin"}]}],"notes":["decisão curta"]}.`;
