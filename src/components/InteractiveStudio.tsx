import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  FileImage,
  ImagePlus,
  Link2,
  Loader2,
  Play,
  Save,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
} from 'lucide-react';
import {
  InteractiveAsset,
  InteractiveDocument,
  InteractiveEngine,
  InteractiveMode,
  Project,
  ThoughtNode,
} from '../types';
import { ensureTursoSession } from '../lib/turso';

interface InteractiveStudioProps {
  document: InteractiveDocument;
  project: Project;
  nodes: ThoughtNode[];
  title?: string;
  canEdit?: boolean;
  onSave: (document: InteractiveDocument) => void;
  onClose: () => void;
}

const ENGINE_META: Array<{ id: InteractiveEngine; name: string; tag: string; description: string }> = [
  { id: 'p5', name: 'p5.js', tag: '2D', description: 'partículas, desenho generativo e toque' },
  { id: 'three', name: 'Three.js', tag: '3D', description: 'profundidade, cenas e partículas 3D' },
  { id: 'gsap', name: 'GSAP', tag: 'Motion', description: 'logos, UI, timelines e movimentos suaves' },
  { id: 'anime', name: 'Anime.js', tag: 'Motion', description: 'SVG, transformações e microinterações' },
  { id: 'matter', name: 'Matter.js', tag: 'Física', description: 'bolas, colisões, gravidade e explosões' },
  { id: 'svg', name: 'SVG.js', tag: 'Vetor', description: 'traços, formas, conexões e SVG vivo' },
];

const MODE_META: Array<{ id: InteractiveMode; label: string; hint: string }> = [
  { id: 'pointer', label: 'Mouse + toque', hint: 'reage ao cursor e ao dedo' },
  { id: 'auto', label: 'Automática', hint: 'anima em loop sem interação' },
  { id: 'hover', label: 'Hover / foco', hint: 'reage à aproximação e ao foco' },
  { id: 'scroll', label: 'Scroll', hint: 'responde ao deslocamento da página' },
];

const PRESETS: Array<{ title: string; engine: InteractiveEngine; prompt: string }> = [
  {
    title: 'Rede de pontos',
    engine: 'p5',
    prompt: 'Crie uma rede orgânica de pontos que flutuam e se conectam por linhas quando se aproximam. Mouse e toque devem atrair ou reorganizar suavemente a rede.',
  },
  {
    title: 'Estouro de bolhas',
    engine: 'matter',
    prompt: 'Crie bolas com física leve. Ao clicar ou tocar, provoque uma explosão radial com colisões e desaceleração; depois as bolas devem voltar ou se recompor de forma suave.',
  },
  {
    title: 'Marca viva',
    engine: 'gsap',
    prompt: 'Use a marca/imagem enviada como elemento principal. Faça uma animação elegante de entrada, pulsação sutil e reação ao ponteiro ou toque, preservando a legibilidade da marca.',
  },
  {
    title: 'Desenhar SVG',
    engine: 'svg',
    prompt: 'Use o SVG enviado. Anime os traços como se fossem desenhados, faça os elementos aparecerem em sequência e acrescente uma pulsação delicada no final.',
  },
  {
    title: 'Morph e pulsação',
    engine: 'anime',
    prompt: 'Crie uma animação vetorial delicada com escala, rotação, opacidade e deslocamentos orgânicos. Se houver SVG, use seus grupos/formas como partes independentes da composição.',
  },
  {
    title: 'Profundidade 3D',
    engine: 'three',
    prompt: 'Crie uma cena 3D leve com partículas e profundidade. Use a imagem enviada como textura ou referência central quando houver asset e responda a mouse e toque.',
  },
];

const ENGINE_LABELS: Record<InteractiveEngine, string> = {
  p5: 'p5.js · 2D',
  three: 'Three.js · 3D',
  gsap: 'GSAP · Motion',
  anime: 'Anime.js · Motion',
  matter: 'Matter.js · Física',
  svg: 'SVG.js · Vetor',
};

const escapeScript = (code: string) => String(code || '').replace(/<\/script/gi, '<\\/script');
const escapeJsonForScript = (value: unknown) => JSON.stringify(value ?? null).replace(/</g, '\\u003c');

const runtimePrelude = (document: InteractiveDocument) => {
  const asset = document.asset || null;
  const mode = document.interactionMode || 'pointer';
  return `
<script>
window.INTERACTIVE_ASSET = ${escapeJsonForScript(asset)};
window.INTERACTION_MODE = ${escapeJsonForScript(mode)};
window.INTERACTIVE_STAGE = document.getElementById('stage');
window.createInteractiveImage = function(options){
  var asset = window.INTERACTIVE_ASSET;
  if (!asset || !asset.url) return null;
  var opts = options || {};
  var img = document.createElement('img');
  img.src = asset.url;
  img.alt = asset.name || 'asset da interação';
  img.style.position = opts.position || 'absolute';
  img.style.left = opts.left || '50%';
  img.style.top = opts.top || '50%';
  img.style.width = opts.width || 'min(62vw, 420px)';
  img.style.height = opts.height || 'auto';
  img.style.maxWidth = opts.maxWidth || '82%';
  img.style.transform = opts.transform || 'translate(-50%, -50%)';
  img.style.transformOrigin = 'center';
  img.style.userSelect = 'none';
  img.style.pointerEvents = opts.pointerEvents || 'none';
  window.INTERACTIVE_STAGE.appendChild(img);
  return img;
};
window.loadInteractiveSvg = async function(){
  var asset = window.INTERACTIVE_ASSET;
  if (!asset || !asset.url) return '';
  var response = await fetch(asset.url, { mode: 'cors' });
  if (!response.ok) throw new Error('Não foi possível carregar o SVG enviado.');
  return await response.text();
};
</script>`;
};

export const blankInteractiveDocument = (engine: InteractiveEngine = 'p5'): InteractiveDocument => ({
  engine,
  title: engine === 'p5' ? 'Experimento p5.js' : `Experimento ${ENGINE_META.find((item) => item.id === engine)?.name || 'interativo'}`,
  prompt: '',
  code: '',
  interactionMode: 'pointer',
});

export const interactiveToSrcDoc = (document: InteractiveDocument) => {
  const code = escapeScript(document.code);
  const baseStyle = `html,body,#stage{width:100%;height:100%;margin:0;overflow:hidden}body{background:#f8f7f3;font-family:Arial,sans-serif}#stage{position:relative;isolation:isolate}canvas,svg{display:block;touch-action:none}img{max-width:100%}`;
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${baseStyle}</style>`;
  const bodyOpen = `<body><div id="stage"></div>${runtimePrelude(document)}`;

  if (document.engine === 'three') {
    return `<!doctype html><html><head>${head}</head>${bodyOpen}<script type="module">import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';\nconst ASSET = window.INTERACTIVE_ASSET; const STAGE = window.INTERACTIVE_STAGE; const MODE = window.INTERACTION_MODE;\n${code}</script></body></html>`;
  }

  const libraries: Record<Exclude<InteractiveEngine, 'three'>, string> = {
    p5: `<script src="https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/p5.min.js"></script>`,
    gsap: `<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>`,
    anime: `<script src="https://cdn.jsdelivr.net/npm/animejs@3.2.2/lib/anime.min.js"></script>`,
    matter: `<script src="https://cdn.jsdelivr.net/npm/matter-js@0.20.0/build/matter.min.js"></script>`,
    svg: `<script src="https://cdn.jsdelivr.net/npm/@svgdotjs/svg.js@3.2.5/dist/svg.min.js"></script><script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js"></script>`,
  };

  const library = libraries[document.engine as Exclude<InteractiveEngine, 'three'>] || libraries.p5;
  return `<!doctype html><html><head>${head}${library}</head>${bodyOpen}<script>const ASSET = window.INTERACTIVE_ASSET; const STAGE = window.INTERACTIVE_STAGE; const MODE = window.INTERACTION_MODE;\n${code}</script></body></html>`;
};

export function InteractivePreview({
  document,
  className = '',
  interactive = true,
}: {
  document: InteractiveDocument;
  className?: string;
  interactive?: boolean;
}) {
  const hasCode = Boolean(document.code?.trim());
  const srcDoc = useMemo(() => interactiveToSrcDoc(document), [document]);

  if (!hasCode) {
    return (
      <div className={`bg-[#F8F7F3] flex items-center justify-center p-6 ${className}`}>
        <div className="max-w-sm text-center">
          <Sparkles size={24} className="mx-auto mb-3 text-neutral-400" />
          <div className="text-sm font-bold text-neutral-700">Sua interação começa pelo que você imaginar.</div>
          <div className="mt-2 text-xs leading-relaxed text-neutral-500">
            Envie uma marca, imagem ou SVG, escolha um motor e descreva o comportamento. A prévia será executada aqui.
          </div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title={document.title || 'Experimento interativo'}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className={`border-0 bg-[#F8F7F3] ${className}`}
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    />
  );
}

function inferAssetKind(nameOrUrl: string, contentType = ''): InteractiveAsset['kind'] {
  return contentType.includes('svg') || /\.svg(?:$|[?#])/i.test(nameOrUrl) ? 'svg' : 'image';
}

export default function InteractiveStudio({
  document,
  project,
  nodes,
  title = 'Laboratório interativo',
  canEdit = true,
  onSave,
  onClose,
}: InteractiveStudioProps) {
  const [draft, setDraft] = useState<InteractiveDocument>({ interactionMode: 'pointer', ...document });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [assetUrl, setAssetUrl] = useState(document.asset?.url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const setEngine = (engine: InteractiveEngine) => {
    if (engine === draft.engine) return;
    setDraft((current) => ({
      ...current,
      engine,
      title: current.title || blankInteractiveDocument(engine).title,
      code: '',
    }));
    setPreviewKey((value) => value + 1);
  };

  const setMode = (interactionMode: InteractiveMode) => {
    setDraft((current) => ({ ...current, interactionMode }));
  };

  const setAsset = (asset?: InteractiveAsset) => {
    setDraft((current) => ({ ...current, asset }));
    setAssetUrl(asset?.url || '');
    setPreviewKey((value) => value + 1);
  };

  const uploadAsset = async (file: File) => {
    if (!canEdit) return;
    const isSvg = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name);
    const isImage = file.type.startsWith('image/') || isSvg;
    if (!isImage) {
      setError('Escolha uma imagem ou SVG.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError('Escolha um arquivo de até 4 MB.');
      return;
    }

    setIsUploading(true);
    setError('');
    try {
      const session = await ensureTursoSession();
      if (!session?.token) throw new Error('Sua sessão expirou. Saia e entre novamente.');
      const contentType = file.type || (isSvg ? 'image/svg+xml' : 'application/octet-stream');
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': contentType,
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });
      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* mensagem genérica abaixo */ }
      if (!response.ok || !data.url) throw new Error(data.error || `Não foi possível enviar o arquivo (HTTP ${response.status}).`);
      setAsset({
        url: String(data.url),
        name: String(data.name || file.name),
        contentType: String(data.contentType || contentType),
        kind: inferAssetKind(file.name, data.contentType || contentType),
      });
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o asset.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const applyAssetUrl = () => {
    const url = assetUrl.trim();
    if (!url) {
      setAsset(undefined);
      return;
    }
    try {
      new URL(url);
    } catch {
      setError('Informe uma URL completa, começando por http:// ou https://.');
      return;
    }
    const name = url.split('/').pop()?.split(/[?#]/)[0] || 'asset-remoto';
    setError('');
    setAsset({
      url,
      name,
      contentType: inferAssetKind(url) === 'svg' ? 'image/svg+xml' : 'image/*',
      kind: inferAssetKind(url),
    });
  };

  const applyPreset = (preset: (typeof PRESETS)[number]) => {
    setDraft((current) => ({
      ...current,
      engine: preset.engine,
      prompt: current.prompt.trim() ? `${current.prompt.trim()}\n\n${preset.prompt}` : preset.prompt,
      code: current.engine === preset.engine ? current.code : '',
    }));
    setPreviewKey((value) => value + 1);
  };

  const generateFromPrompt = async () => {
    if (!draft.prompt.trim() || !canEdit) return;
    setIsGenerating(true);
    setError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'interactive-code',
          engine: draft.engine,
          prompt: draft.prompt,
          currentTitle: draft.title,
          currentCode: draft.code || '',
          asset: draft.asset || null,
          interactionMode: draft.interactionMode || 'pointer',
          project: {
            name: project.name,
            projectType: project.projectType,
            problem: project.problem,
            community: project.community,
            ods: project.ods,
          },
          phase: project.activePhase,
          mediator: {
            id: 'agent-forja',
            name: 'Forja',
            role: 'Implementação, prototipação computacional e sistemas funcionais',
            bio: 'Transforma decisões projetuais em protótipos e sistemas executáveis.',
          },
          existingThoughts: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            content: node.content,
            phase: node.phase,
            scientificContext: node.scientificContext || '',
            provocations: node.provocations || [],
          })),
        }),
      });
      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`Resposta inválida da IA (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(data.error || `Não foi possível gerar a interação (HTTP ${response.status}).`);
      if (!data.interactive?.code) throw new Error('A IA não devolveu código executável.');
      setDraft((current) => ({
        ...current,
        title: data.interactive.title || current.title,
        engine: data.interactive.engine || current.engine,
        code: data.interactive.code,
      }));
      setPreviewKey((value) => value + 1);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível gerar a interação.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(draft.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Não foi possível copiar o código neste navegador.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-[#F4F3EF] flex flex-col select-text"
      style={{ touchAction: 'auto' }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <header className="shrink-0 border-b border-[#D8D7D2] bg-white px-3 sm:px-5 py-3 flex items-center gap-3">
        <button type="button" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Fechar laboratório"><X size={20} /></button>
        <div className="min-w-0 flex-1">
          <div className="text-sm sm:text-base font-bold text-[#1A1A1A] truncate">{title}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">camada interativa · imagem + SVG + motion + física + 3D</div>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onSave(draft)}
          className="h-10 px-3 sm:px-4 rounded-xl bg-black text-white disabled:opacity-40 flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          <Save size={15} /><span className="hidden sm:inline">SALVAR NO CANVAS</span>
        </button>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[430px_minmax(0,1fr)]">
        <section className="min-h-0 xl:border-r border-[#D8D7D2] bg-white overflow-y-auto p-4 sm:p-5 space-y-5">
          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">motor da interação</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {ENGINE_META.map((engine) => (
                <button
                  key={engine.id}
                  type="button"
                  onClick={() => setEngine(engine.id)}
                  className={`min-h-[66px] rounded-xl border px-3 py-2 text-left cursor-pointer transition ${draft.engine === engine.id ? 'bg-black text-white border-black' : 'bg-white border-[#D8D7D2] hover:border-black'}`}
                >
                  <div className="text-xs font-bold">{engine.name} · {engine.tag}</div>
                  <div className={`mt-1 text-[10px] leading-snug ${draft.engine === engine.id ? 'text-white/70' : 'text-neutral-500'}`}>{engine.description}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">como a pessoa participa</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {MODE_META.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setMode(mode.id)}
                  className={`rounded-xl border px-3 py-2 text-left cursor-pointer ${draft.interactionMode === mode.id ? 'border-black bg-[#F1F0EC]' : 'border-[#D8D7D2] bg-white'}`}
                >
                  <div className="text-[11px] font-bold">{mode.label}</div>
                  <div className="text-[9px] text-neutral-500 mt-0.5">{mode.hint}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D8D7D2] p-3.5 bg-[#FBFBF8]">
            <div className="flex items-center gap-2">
              <FileImage size={15} />
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-600">marca, imagem ou SVG</span>
            </div>

            {draft.asset ? (
              <div className="mt-3 rounded-xl border border-[#D8D7D2] bg-white p-2 flex items-center gap-3">
                <div className="h-16 w-16 shrink-0 rounded-lg bg-[#F4F3EF] overflow-hidden border border-black/5 flex items-center justify-center">
                  <img src={draft.asset.url} alt={draft.asset.name} className="max-h-full max-w-full object-contain" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{draft.asset.name}</div>
                  <div className="text-[10px] text-neutral-500 mt-1">{draft.asset.kind === 'svg' ? 'SVG vetorial' : 'Imagem'} · disponível para a IA</div>
                </div>
                <button type="button" onClick={() => setAsset(undefined)} className="h-9 w-9 rounded-lg border border-red-200 text-red-600 flex items-center justify-center cursor-pointer" aria-label="Remover asset"><Trash2 size={14} /></button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl border border-dashed border-[#C9C8C3] p-4 text-center text-[11px] text-neutral-500">
                Envie uma identidade visual para animá-la ou use uma URL pública.
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.svg,image/svg+xml"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadAsset(file);
              }}
            />
            <button
              type="button"
              disabled={!canEdit || isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="mt-3 w-full h-10 rounded-xl border border-black bg-white text-[10px] font-mono font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
              {isUploading ? 'ENVIANDO…' : 'UPLOAD DE IMAGEM / SVG'}
            </button>

            <div className="mt-2 flex gap-2">
              <div className="relative flex-1">
                <Link2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
                <input
                  value={assetUrl}
                  onChange={(event) => setAssetUrl(event.target.value)}
                  onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); applyAssetUrl(); } }}
                  placeholder="https://.../marca.svg"
                  className="w-full h-10 rounded-xl border border-[#D8D7D2] pl-8 pr-2 text-[11px] outline-none focus:border-black"
                />
              </div>
              <button type="button" onClick={applyAssetUrl} className="h-10 px-3 rounded-xl border border-[#D8D7D2] bg-white text-[10px] font-bold cursor-pointer">USAR URL</button>
            </div>
          </div>

          <label className="block">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">nome da camada</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              disabled={!canEdit}
              className="mt-2 w-full h-11 rounded-xl border border-[#D8D7D2] px-3 text-sm outline-none focus:border-black disabled:bg-neutral-100 select-text"
              style={{ touchAction: 'manipulation' }}
            />
          </label>

          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">atalhos de criação</span>
              <WandSparkles size={14} className="text-neutral-400" />
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="rounded-full border border-[#D8D7D2] bg-white px-3 py-1.5 text-[10px] font-bold hover:border-black cursor-pointer"
                  title={`Usar ${ENGINE_LABELS[preset.engine]}`}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">descreva a interação / converse com a Forja</span>
            <textarea
              value={draft.prompt}
              onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
              disabled={!canEdit}
              placeholder="Ex.: use a marca enviada; faça as bolinhas se conectarem por linhas suaves e responderem ao toque. No clique, algumas partículas devem se desprender e voltar à marca..."
              className="mt-2 w-full min-h-[165px] rounded-xl border border-[#D8D7D2] p-3 text-sm leading-relaxed outline-none focus:border-black resize-y disabled:bg-neutral-100 select-text"
              style={{ touchAction: 'manipulation' }}
            />
          </label>

          <button
            type="button"
            onClick={generateFromPrompt}
            disabled={!canEdit || isGenerating || !draft.prompt.trim()}
            className="w-full min-h-12 rounded-xl bg-black text-white disabled:bg-neutral-300 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'GERANDO INTERAÇÃO…' : 'GERAR / RECRIAR POR PROMPT'}
          </button>

          {draft.asset && (
            <div className="rounded-xl bg-[#F3F2EE] px-3 py-2.5 text-[10px] leading-relaxed text-neutral-600 flex gap-2">
              <ImagePlus size={14} className="shrink-0 mt-0.5" />
              A IA recebe a URL e o tipo do asset e pode usá-lo no código. Para SVG, também existe um helper para carregar o vetor como texto e animar seus elementos.
            </div>
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

          <div className="border border-[#D8D7D2] rounded-xl overflow-hidden">
            <div className="h-10 px-3 bg-[#F7F7F4] border-b border-[#D8D7D2] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase flex items-center gap-1.5"><Code2 size={13} /> código · {ENGINE_LABELS[draft.engine]}</span>
              <button type="button" onClick={copyCode} className="h-8 px-2 rounded-lg hover:bg-black/5 flex items-center gap-1 text-[10px] font-mono cursor-pointer">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'COPIADO' : 'COPIAR'}</button>
            </div>
            <textarea
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              disabled={!canEdit}
              spellCheck={false}
              className="w-full min-h-[300px] p-3 font-mono text-[11px] leading-relaxed outline-none resize-y bg-[#101010] text-[#F5F5F5] disabled:opacity-70 select-text"
              style={{ touchAction: 'manipulation' }}
            />
          </div>
        </section>

        <section className="min-h-[48vh] xl:min-h-0 flex flex-col bg-[#ECEBE7]">
          <div className="h-11 px-4 border-b border-[#D8D7D2] bg-white/90 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2"><Play size={13} /> prévia em tempo real · {ENGINE_LABELS[draft.engine]}</span>
            <button type="button" onClick={() => setPreviewKey((value) => value + 1)} className="h-8 px-3 rounded-lg border border-[#D8D7D2] bg-white hover:border-black text-[10px] font-mono font-bold cursor-pointer">REINICIAR</button>
          </div>
          <div className="flex-1 min-h-0 p-3 sm:p-5">
            <div className="h-full min-h-[360px] rounded-2xl overflow-hidden border border-[#D0CFCB] bg-white shadow-sm">
              <InteractivePreview key={previewKey} document={draft} className="w-full h-full" interactive />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
