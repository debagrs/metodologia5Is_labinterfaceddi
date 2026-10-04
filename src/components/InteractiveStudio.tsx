import ImageLibrary from './ImageLibrary';
import PhotopeaEditor from './PhotopeaEditor';
import {imageCredit} from '../lib/openImages';
import { EFFECT_CATALOG, LIBRARY_DOCS, buildLibraryEffect } from '../lib/interactiveEffects';
import { normalizeSketchCode, character3DHelper, characterSceneCode } from '../lib/interactiveRuntime';
import { buildCharacterSvg } from './SpriteStudio';
import { StudioWorkspace } from './StudioWorkspace';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Code2,
  Copy,
  FileImage,
  ImagePlus,
  Link2,
  Loader2,
  Palette,
  Play,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  X,
} from 'lucide-react';
import {
  InteractiveAsset,
  InteractiveAssetProfile,
  InteractiveDocument,
  InteractiveEffect,
  InteractiveEngine,
  InteractiveIntensity,
  InteractiveMode,
  Project,
  ThoughtNode,
} from '../types';
import { ensureTursoSession } from '../lib/turso';
import VoiceDictationButton from './VoiceDictationButton';

interface InteractiveStudioProps {
  document: InteractiveDocument;
  project: Project;
  nodes: ThoughtNode[];
  title?: string;
  canEdit?: boolean;
  onSave: (document: InteractiveDocument) => void;
  onClose: () => void;
}

const ENGINE_META: Array<{ id: InteractiveEngine; name: string; tag: string; description: string; guide: string }> = [
  { id: 'p5', name: 'p5.js', tag: '2D', description: 'partículas, desenho generativo e toque', guide: 'Use quando a experiência nasce de pontos, linhas, ruído, desenho algorítmico, partículas ou interação 2D. É excelente para experimentação visual e interfaces generativas.' },
  { id: 'three', name: 'Three.js', tag: '3D', description: 'profundidade, cenas e partículas 3D', guide: 'Use para objetos e cenas tridimensionais, câmeras, luzes, materiais, profundidade, partículas 3D e experiências espaciais. É a escolha principal quando o elemento precisa existir em um espaço 3D.' },
  { id: 'gsap', name: 'GSAP', tag: 'Motion', description: 'logos, UI, timelines e movimentos suaves', guide: 'Use para motion de interface com controle fino de tempo: entradas, saídas, sequências, timelines, scroll, microinterações e animações de marca muito suaves.' },
  { id: 'anime', name: 'Anime.js', tag: 'Motion', description: 'SVG, transformações e microinterações', guide: 'Use para animações leves de DOM e SVG, transformações, opacidade, escala, rotação e sequências simples. É ótimo para motion vetorial sem montar uma cena 3D.' },
  { id: 'matter', name: 'Matter.js', tag: 'Física', description: 'bolas, colisões, gravidade e explosões', guide: 'Use quando o movimento precisa obedecer a física: gravidade, colisão, impulso, queda, bouncing, explosões e objetos que se empurram ou se acumulam.' },
  { id: 'svg', name: 'SVG.js', tag: 'Vetor', description: 'traços, formas, conexões e SVG vivo', guide: 'Use para animar desenhos vetoriais preservando seus elementos: paths, círculos, linhas, ícones e marcas. É o caminho mais direto para transformar um desenho do próprio canvas em uma animação editável.' },
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



const SVG_EFFECTS: Array<{ id: InteractiveEffect; label: string; hint: string }> = [
  { id: 'network', label: 'Rede viva', hint: 'nós se movem e novas conexões acompanham os círculos' },
  { id: 'breathe', label: 'Respiração', hint: 'pulsação lenta e delicada sem desmontar a marca' },
  { id: 'draw', label: 'Desenho de linhas', hint: 'traçados aparecem em sequência e retornam à composição original' },
  { id: 'wave', label: 'Onda', hint: 'movimento sequencial atravessa os elementos da esquerda para a direita' },
  { id: 'explode', label: 'Explosão ao toque', hint: 'os nós se afastam no toque e voltam elasticamente' },
  { id: 'drift', label: 'Deriva suave', hint: 'microdeslocamentos orgânicos contínuos preservando a forma geral' },
];

const INTENSITIES: Array<{ id: InteractiveIntensity; label: string }> = [
  { id: 'subtle', label: 'Sutil' },
  { id: 'medium', label: 'Média' },
  { id: 'strong', label: 'Forte' },
];

function normalizeSvgColor(value: string) {
  const cleaned = value.trim().replace(/[;"']/g, '');
  if (!cleaned || /^(none|transparent|currentcolor|inherit|url\()/i.test(cleaned)) return '';
  return cleaned;
}

function analyzeSvgSource(source: string): InteractiveAssetProfile {
  const palette: string[] = [];
  const seen = new Set<string>();
  const colorRegex = /(?:fill|stroke)\s*(?:=|:)\s*["']?\s*(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|[a-zA-Z]+)["']?/g;
  let match: RegExpExecArray | null;
  while ((match = colorRegex.exec(source))) {
    const color = normalizeSvgColor(match[1]);
    const key = color.toLowerCase();
    if (color && !seen.has(key)) {
      seen.add(key);
      palette.push(color);
      if (palette.length >= 12) break;
    }
  }
  const counts: Record<string, number> = {};
  for (const tag of ['circle', 'ellipse', 'line', 'path', 'polyline', 'polygon', 'rect', 'g']) {
    counts[tag] = (source.match(new RegExp(`<${tag}\\b`, 'gi')) || []).length;
  }
  return { palette, counts, sourceType: 'svg' };
}

export function buildSvgPresetCode(effect: InteractiveEffect, intensity: InteractiveIntensity, profile?: InteractiveAssetProfile) {
  const amp = intensity === 'subtle' ? 5 : intensity === 'strong' ? 16 : 10;
  const scale = intensity === 'subtle' ? 1.035 : intensity === 'strong' ? 1.11 : 1.065;
  const palette = profile?.palette?.length ? profile.palette : ['#9500FF', '#FF13F0'];
  const primary = JSON.stringify(palette.find((c) => /^#|^rgb/i.test(c)) || '#9500FF');
  const effectBody: Record<InteractiveEffect, string> = {
    network: `
      const nodes = pickNodes(32);
      nodes.forEach((el, i) => {
        gsap.to(el, { x: rand(-AMP, AMP), y: rand(-AMP, AMP), duration: rand(3.4, 6.8), delay: i * 0.035, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      });
      const overlay = document.createElementNS(NS, 'svg');
      overlay.setAttribute('aria-hidden', 'true');
      Object.assign(overlay.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', pointerEvents: 'none', overflow: 'visible' });
      STAGE.appendChild(overlay);
      const lines = [];
      const maxPairs = Math.min(180, (nodes.length * (nodes.length - 1)) / 2);
      for (let i = 0; i < maxPairs; i++) {
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('stroke', ${primary});
        line.setAttribute('stroke-width', '1.25');
        line.setAttribute('stroke-linecap', 'round');
        line.style.opacity = '0';
        overlay.appendChild(line); lines.push(line);
      }
      function redraw(){
        const sr = STAGE.getBoundingClientRect();
        overlay.setAttribute('viewBox', '0 0 ' + Math.max(1, sr.width) + ' ' + Math.max(1, sr.height));
        const pts = nodes.map(el => { const r = el.getBoundingClientRect(); return { x:r.left + r.width/2 - sr.left, y:r.top + r.height/2 - sr.top }; });
        let cursor = 0; const threshold = Math.max(90, Math.min(sr.width, sr.height) * 0.22);
        for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length && cursor < lines.length; b++) {
          const dx=pts[a].x-pts[b].x, dy=pts[a].y-pts[b].y, d=Math.hypot(dx,dy);
          if (d < threshold) { const l=lines[cursor++]; l.setAttribute('x1', String(pts[a].x)); l.setAttribute('y1', String(pts[a].y)); l.setAttribute('x2', String(pts[b].x)); l.setAttribute('y2', String(pts[b].y)); l.style.opacity=String((1-d/threshold)*0.5); }
        }
        for (; cursor < lines.length; cursor++) lines[cursor].style.opacity='0';
        requestAnimationFrame(redraw);
      }
      redraw();
      const reactive = (ev) => { const x=ev.clientX, y=ev.clientY; nodes.forEach(el => { const r=el.getBoundingClientRect(); const dx=(r.left+r.width/2)-x, dy=(r.top+r.height/2)-y, d=Math.hypot(dx,dy); if(d<130){ gsap.to(el,{x:'+='+(dx/(d||1))*AMP*1.2,y:'+='+(dy/(d||1))*AMP*1.2,duration:.35,ease:'power2.out',overwrite:'auto'}); }}); };
      STAGE.addEventListener('pointermove', reactive, { passive:true });
    `,
    breathe: `
      const nodes = pickNodes(48); const accents = pickAccents(24);
      nodes.forEach((el,i)=>gsap.to(el,{scale:SCALE,transformOrigin:'center',duration:rand(1.8,3.4),delay:i*.025,repeat:-1,yoyo:true,ease:'sine.inOut'}));
      accents.forEach((el,i)=>gsap.to(el,{opacity:.72,duration:rand(2.2,4.2),delay:i*.04,repeat:-1,yoyo:true,ease:'sine.inOut'}));
    `,
    draw: `
      const paths = visible.filter(el => typeof el.getTotalLength === 'function').slice(0,80);
      paths.forEach((el,i)=>{ try { const len=el.getTotalLength(); if(!len) return; const originalFill=getComputedStyle(el).fill; const originalStroke=getComputedStyle(el).stroke; if(originalStroke==='none'||originalStroke==='rgba(0, 0, 0, 0)'){ el.style.stroke=originalFill; el.style.strokeWidth='1.2'; } el.style.strokeDasharray=String(len); el.style.strokeDashoffset=String(len); gsap.to(el,{strokeDashoffset:0,duration:1.4+Math.min(2.4,len/900),delay:i*.018,ease:'power2.inOut'}); } catch {} });
    `,
    wave: `
      const items = visible.slice(0,90).sort((a,b)=>a.getBoundingClientRect().left-b.getBoundingClientRect().left);
      items.forEach((el,i)=>gsap.to(el,{y:-AMP*.65,scale:1+(SCALE-1)*.45,transformOrigin:'center',duration:1.2,delay:i*.018,repeat:-1,yoyo:true,ease:'sine.inOut'}));
    `,
    explode: `
      const nodes=pickNodes(40); nodes.forEach(el=>gsap.set(el,{transformOrigin:'center'}));
      const burst=(ev)=>{ const sr=STAGE.getBoundingClientRect(); const x=ev.clientX??sr.left+sr.width/2, y=ev.clientY??sr.top+sr.height/2; nodes.forEach(el=>{ const r=el.getBoundingClientRect(); const dx=(r.left+r.width/2)-x, dy=(r.top+r.height/2)-y, d=Math.hypot(dx,dy)||1; const force=Math.max(22,AMP*5)*(1+Math.max(0,180-d)/180); gsap.timeline({overwrite:true}).to(el,{x:(dx/d)*force,y:(dy/d)*force,rotation:rand(-18,18),duration:.28,ease:'power3.out'}).to(el,{x:0,y:0,rotation:0,duration:1.1,ease:'elastic.out(1,.45)'}); }); };
      STAGE.addEventListener('pointerdown', burst);
    `,
    drift: `
      const nodes=pickNodes(50); const accents=pickAccents(40);
      nodes.forEach((el,i)=>gsap.to(el,{x:rand(-AMP,AMP),y:rand(-AMP,AMP),rotation:rand(-2.2,2.2),duration:rand(4.2,8),delay:i*.02,repeat:-1,yoyo:true,ease:'sine.inOut'}));
      accents.forEach((el,i)=>gsap.to(el,{opacity:.82,duration:rand(3,6),delay:i*.025,repeat:-1,yoyo:true,ease:'sine.inOut'}));
    `,
  };
  return `(async()=>{
    const raw = await window.loadInteractiveSvg();
    if(!raw) throw new Error('Envie um SVG para aplicar este efeito.');
    STAGE.innerHTML = raw;
    const svg = STAGE.querySelector('svg');
    if(!svg) throw new Error('O arquivo enviado não contém um SVG válido.');
    Object.assign(svg.style,{width:'100%',height:'100%',display:'block',overflow:'visible'});
    svg.removeAttribute('width'); svg.removeAttribute('height'); svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    const NS='http://www.w3.org/2000/svg', AMP=${amp}, SCALE=${scale};
    const rand=(a,b)=>a+Math.random()*(b-a);
    const visible=[...svg.querySelectorAll('circle,ellipse,path,line,polyline,polygon,rect')].filter(el=>!el.closest('defs') && getComputedStyle(el).display!=='none' && getComputedStyle(el).visibility!=='hidden');
    const isNode=(el)=>{ if(el.matches('circle,ellipse')) return true; try { const b=el.getBBox(); const ratio=b.width&&b.height?Math.max(b.width,b.height)/Math.max(1,Math.min(b.width,b.height)):99; const vb=svg.viewBox?.baseVal; const maxDim=Math.max(vb?.width||svg.clientWidth||1000,vb?.height||svg.clientHeight||1000); return ratio<1.35 && Math.max(b.width,b.height)<maxDim*.14; } catch { return false; } };
    const pickNodes=(limit)=>{ const exact=visible.filter(el=>el.matches('circle,ellipse')); const rest=visible.filter(el=>!exact.includes(el)&&isNode(el)); return [...exact,...rest].slice(0,limit); };
    const pickAccents=(limit)=>visible.filter(el=>!isNode(el)).slice(0,limit);
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){ return; }
    ${effectBody[effect]}
  })();`;
}

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
window.addEventListener('error', function(event){ parent.postMessage({type:'sketch-error',message:event.message || 'Falha ao carregar uma biblioteca do sketch.'}, '*'); });
window.addEventListener('unhandledrejection', function(event){ parent.postMessage({type:'sketch-error',message:String(event.reason?.message || event.reason || 'Falha na execução')}, '*'); });
window.setTimeout(function(){ if (!window.INTERACTIVE_STAGE?.childElementCount) parent.postMessage({type:'sketch-error',message:'O código executou sem criar uma cena visível. Peça à IA para montar o sketch dentro de STAGE.'}, '*'); }, 8000);
window.INTERACTIVE_CHARACTER = ${escapeJsonForScript(document.characterReference || null)};
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
  effectPreset: 'network',
  intensity: 'subtle',
  preserveBrand: true,
});

export const interactiveToSrcDoc = (document: InteractiveDocument) => {
  let normalized = '';
  try { normalized = normalizeSketchCode(document.code); } catch (error) { normalized = `throw new Error(${JSON.stringify(String(error))});`; }
  const code = escapeScript(normalized);
  const baseStyle = `html,body,#stage{width:100%;height:100%;margin:0;overflow:hidden}body{background:#f8f7f3;font-family:Arial,sans-serif}#stage{position:relative;isolation:isolate}canvas,svg{display:block;touch-action:none}img{max-width:100%}`;
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${baseStyle}</style>`;
  const bodyOpen = `<body><div id="stage"></div>${runtimePrelude(document)}`;

  if (document.engine === 'three') {
    return `<!doctype html><html><head>${head}</head>${bodyOpen}<script type="module">try { const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js').catch(()=>import('https://unpkg.com/three@0.180.0/build/three.module.js'));\nconst ASSET = window.INTERACTIVE_ASSET; const STAGE = window.INTERACTIVE_STAGE; const MODE = window.INTERACTION_MODE; const CHARACTER = window.INTERACTIVE_CHARACTER;\n${character3DHelper}\n${code}\n} catch(error) { parent.postMessage({type:'sketch-error',message:String(error?.message || error)}, '*'); }</script></body></html>`;
  }

  const libraries:Record<string,string[]>={p5:['p5@1.11.11/lib/p5.min.js'],gsap:['gsap@3.13.0/dist/gsap.min.js'],anime:['animejs@3.2.2/lib/anime.min.js'],matter:['matter-js@0.20.0/build/matter.min.js'],svg:['@svgdotjs/svg.js@3.2.5/dist/svg.min.js','gsap@3.13.0/dist/gsap.min.js']};
  const packages=libraries[document.engine]||libraries.p5;
  // Load dependencies before inserting user code; a second CDN handles transient failures.
  const loader=`async function dependency(path){for(const host of ['https://cdn.jsdelivr.net/npm/','https://unpkg.com/']){try{await new Promise((resolve,reject)=>{const s=document.createElement('script');const timer=setTimeout(()=>{s.remove();reject(Error('tempo de carregamento excedido'))},10000);s.src=host+path;s.onload=()=>{clearTimeout(timer);resolve()};s.onerror=()=>{clearTimeout(timer);s.remove();reject(Error('falha no CDN'))};document.head.appendChild(s)});return}catch(e){}}throw Error('Não foi possível carregar a biblioteca. Verifique sua conexão e execute novamente.')} (async()=>{try{for(const path of ${JSON.stringify(packages)})await dependency(path);const script=document.createElement('script');script.textContent=${escapeScript(JSON.stringify('const ASSET = window.INTERACTIVE_ASSET; const STAGE = window.INTERACTIVE_STAGE; const MODE = window.INTERACTION_MODE;\n'+normalized))};document.body.appendChild(script);if(${JSON.stringify(document.engine)}==='p5' && !p5.instance && (typeof window.setup==='function'||typeof window.draw==='function'))new p5();}catch(error){parent.postMessage({type:'sketch-error',message:String(error.message||error)},'*')}})();`;
  return `<!doctype html><html><head>${head}</head>${bodyOpen}<script>${loader}</script></body></html>`;
};

export function InteractivePreview({
  document,
  className = '',
  interactive = true,
  onRuntimeError,
}: {
  document: InteractiveDocument;
  className?: string;
  interactive?: boolean;
  onRuntimeError?: (message: string) => void;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    const receive = (event: MessageEvent) => { if (event.source === frameRef.current?.contentWindow && event.data?.type === 'sketch-error') onRuntimeError?.(String(event.data.message).slice(0, 1200)); };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [onRuntimeError]);
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
    <iframe ref={frameRef}
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
  const [draft, setDraft] = useState<InteractiveDocument>({ interactionMode: 'pointer', effectPreset: 'network', intensity: 'subtle', preserveBrand: true, ...document });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [imageLibraryOpen,setImageLibraryOpen]=useState(false);
  const [photoEditorOpen,setPhotoEditorOpen]=useState(false);
  const [developerMode, setDeveloperMode] = useState(false);
  const [runtimeError, setRuntimeError] = useState('');
  const [previewCode, setPreviewCode] = useState(document.code);
  const chatRef = useRef<HTMLDivElement>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const [assetUrl, setAssetUrl] = useState(document.asset?.url || '');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [engineTourIndex, setEngineTourIndex] = useState<number | null>(null);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem('5is-interaction-engine-tour-v1')) setEngineTourIndex(0);
    } catch { /* armazenamento pode estar indisponível */ }
  }, []);

  const finishEngineTour = () => {
    try { window.localStorage.setItem('5is-interaction-engine-tour-v1', 'done'); } catch { /* ignore */ }
    setEngineTourIndex(null);
  };

  const setEngine = (engine: InteractiveEngine) => {
    if (engine === draft.engine) return;
    setDraft((current) => ({
      ...current,
      engine,
      title: current.title || blankInteractiveDocument(engine).title,
      code: '',
    }));
    setPreviewCode(''); setRuntimeError('');
    setPreviewKey((value) => value + 1);
  };

  const setMode = (interactionMode: InteractiveMode) => {
    setDraft((current) => ({ ...current, interactionMode }));
  };

  const setAsset = (asset?: InteractiveAsset) => {
    setDraft((current) => ({ ...current, asset, characterReference: undefined }));
    setAssetUrl(asset?.url || '');
    setPreviewKey((value) => value + 1);
  };

  const chooseCharacter = (node: ThoughtNode) => {
    if (!node.sprite) return;
    const sprite = node.sprite;
    const views = ['front', 'three-quarter', 'side', 'back'] as const;
    const images = sprite.generatedSvg ? [{ view: 'front' as const, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(sprite.generatedSvg) }] : views.map(view => ({ view, url: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(buildCharacterSvg(sprite, view, 'neutral', 'neutral')) }));
    setDraft(current => ({ ...current, characterReference: { nodeId: node.id, name: sprite.characterName, appearance: sprite.appearance, views: images }, asset: { url: images[0].url, name: sprite.characterName, kind: 'image', contentType: 'image/svg+xml' }, preserveBrand: false, prompt: current.prompt || 'Crie uma versão 3D deste personagem a partir das quatro vistas. Preserve rosto, proporções, cabelo e roupa; use luz suave e permita girar a câmera por toque.' }));
  };

  const imageForAI = async (url: string) => {
    const image = new Image(); image.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => { const timer = window.setTimeout(() => reject(new Error('A referência demorou demais para carregar. Tente novamente.')), 12000); image.onload = () => { window.clearTimeout(timer); resolve(); }; image.onerror = () => { window.clearTimeout(timer); reject(new Error('Não foi possível ler a referência visual. Envie a imagem novamente.')); }; image.src = url; });
    const canvas = window.document.createElement('canvas');
    const scale = Math.min(1, 640 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d'); if (!context) throw new Error('A referência visual não pôde ser preparada.');
    context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(image, 0, 0, canvas.width, canvas.height);
    try { return { mimeType: 'image/jpeg', data: canvas.toDataURL('image/jpeg', .82).split(',')[1] }; } catch { throw new Error('Essa URL não permite ler a imagem. Use o upload para enviá-la como referência à IA.'); }
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
      const svgProfile = isSvg ? analyzeSvgSource(await file.text()) : undefined;
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
        profile: svgProfile,
        credit:draft.asset?.credit,
      });
      return true;
    } catch (err: any) {
      setError(err?.message || 'Não foi possível enviar o asset.');
      return false;
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

  const applySelectedEffect = () => {
    if (draft.asset?.kind !== 'svg') {
      setError('Para estes efeitos controlados, envie primeiro um arquivo SVG.');
      return;
    }
    const effect = draft.effectPreset || 'network';
    const intensity = draft.intensity || 'subtle';
    setError('');
    setDraft((current) => ({
      ...current,
      engine: 'svg',
      code: buildSvgPresetCode(effect, intensity, current.asset?.profile),
    }));
    setPreviewCode(buildSvgPresetCode(effect,intensity,draft.asset?.profile));
    setPreviewKey((value) => value + 1);
  };

  const selectedLibraryEffect=EFFECT_CATALOG[draft.engine].find(item=>item.id===draft.libraryEffect) || EFFECT_CATALOG[draft.engine][0];
  const applyLibraryEffect=()=>{
    if(!canEdit)return;
    try {
      const code=draft.engine==='svg'?buildSvgPresetCode(selectedLibraryEffect.id as InteractiveEffect,draft.intensity || 'subtle',draft.asset?.profile):draft.engine==='three' && selectedLibraryEffect.id==='character'?characterSceneCode:buildLibraryEffect(draft.engine,selectedLibraryEffect.id);
      if(draft.engine==='svg' && draft.asset?.kind!=='svg')throw new Error('Escolha um arquivo SVG para animar seus elementos.');
      if(draft.engine==='three' && selectedLibraryEffect.id==='character' && !draft.characterReference)throw new Error('Selecione um personagem do projeto para criar o modelo 3D.');
      setDraft(current=>({...current,code,effectPreset:draft.engine==='svg'?selectedLibraryEffect.id as InteractiveEffect:current.effectPreset,revisions:[...(current.revisions || []).slice(-9),{code:current.code,title:current.title,engine:current.engine}]}));setPreviewCode(code);setRuntimeError('');setError('');setPreviewKey(value=>value+1);
    }catch(error:any){setError(error.message);}
  };
  const generateFromPrompt = async (repair = false) => {
    const requestPrompt = repair ? `Corrija este erro do sketch e devolva o código completo: ${runtimeError}` : draft.prompt.trim();
    if (!requestPrompt || !canEdit || isGenerating) return;
    setIsGenerating(true);
    setError('');
    try {
      const images = draft.characterReference?.views?.length ? draft.characterReference.views.slice(0,4) : draft.asset ? [{url:draft.asset.url}] : [];
      const visualReferences = await Promise.all(images.map(image => imageForAI(image.url)));
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
          prompt: requestPrompt,
          visualReferences,
          characterReference: draft.characterReference ? { ...draft.characterReference, views: draft.characterReference.views.map(view => ({ view: view.view })) } : null,
          conversation: (draft.messages || []).slice(-8),
          runtimeError,
          currentTitle: draft.title,
          currentCode: draft.code || '',
          asset: draft.asset || null,
          interactionMode: draft.interactionMode || 'pointer',
          effectPreset: draft.effectPreset || null,
          intensity: draft.intensity || 'subtle',
          preserveBrand: draft.preserveBrand !== false,
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
      if (data.interactive.engine && data.interactive.engine !== draft.engine) throw new Error('A IA respondeu com outro motor. Tente gerar novamente com o motor escolhido.');
      const nextCode = normalizeSketchCode(data.interactive.code);
      setDraft((current) => ({
        ...current,
        revisions: [...(current.revisions || []), { code: current.code, title: current.title, engine: current.engine }].slice(-10),
        messages: [...(current.messages || []), { role: 'user' as const, content: requestPrompt }, { role: 'assistant' as const, content: `Sketch atualizado: ${data.interactive.title || current.title}. Você pode testar e pedir novos ajustes.` }].slice(-40),
        prompt: '',
        title: data.interactive.title || current.title,
        engine: data.interactive.engine || current.engine,
        code: nextCode,
      }));
      setPreviewCode(nextCode); setRuntimeError('');
      setPreviewKey((value) => value + 1);
      requestAnimationFrame(() => chatRef.current?.scrollIntoView({ block: 'nearest' }));
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
      className="studio-editor fixed inset-0 z-[120] bg-[#F4F3EF] flex flex-col select-text"
      style={{ touchAction: 'auto' }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {imageLibraryOpen && <ImageLibrary onChoose={image=>{setAsset({url:image.url,name:image.title,kind:'image',contentType:'image/*',credit:imageCredit(image)});setImageLibraryOpen(false);}} onClose={()=>setImageLibraryOpen(false)}/>}
      {photoEditorOpen && <PhotopeaEditor url={draft.asset?.url} name={draft.asset?.name || 'Novo projeto'} onSave={async file=>{if(!await uploadAsset(file))throw new Error('Não foi possível salvar esta imagem. Verifique sua sessão e o tamanho do arquivo.');}} onClose={()=>setPhotoEditorOpen(false)}/>}
      <header className="shrink-0 border-b border-[#D8D7D2] bg-white px-3 sm:px-5 py-3 flex items-center gap-3">
        <button type="button" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Fechar laboratório"><X size={20} /></button>
        <div className="min-w-0 flex-1">
          <div className="text-sm sm:text-base font-bold text-[#1A1A1A] truncate">{title}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">camada interativa · imagem + SVG + motion + física + 3D</div>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          aria-label="Salvar interação" onClick={() => onSave(draft)}
          className="h-10 px-3 sm:px-4 rounded-xl bg-black text-white disabled:opacity-40 flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          <Save size={15} /><span className="hidden sm:inline">SALVAR NO CANVAS</span>
        </button>
      </header>

      <StudioWorkspace tools={<section className="min-h-0 xl:border-r border-[#D8D7D2] bg-white overflow-y-auto p-4 sm:p-5 space-y-5">
          <div className="image-integration-actions"><button type="button" disabled={!canEdit} onClick={()=>setImageLibraryOpen(true)}><ImagePlus size={16}/>Pesquisar imagens livres</button><button type="button" disabled={!canEdit} onClick={()=>setPhotoEditorOpen(true)}><Palette size={16}/>Editar imagem com camadas</button>{draft.asset?.credit && <a href={draft.asset.credit.sourceUrl} target="_blank" rel="noreferrer">{draft.asset.credit.author} · {draft.asset.credit.license} ↗</a>}</div>
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
            <div className="mt-2 rounded-xl border border-[#D8D7D2] bg-[#F7F7F4] px-3 py-2.5 text-[10px] leading-relaxed text-neutral-600 flex gap-2">
              <CircleHelp size={14} className="shrink-0 mt-0.5"/>
              <span><strong className="text-black">{ENGINE_META.find((item)=>item.id===draft.engine)?.name}:</strong> {ENGINE_META.find((item)=>item.id===draft.engine)?.guide}</span>
            </div>
            <div className="interactive-effect-catalog"><label>Efeitos de {ENGINE_LABELS[draft.engine]}<select aria-label="Efeito da biblioteca" value={selectedLibraryEffect.id} onChange={event=>setDraft(current=>({...current,libraryEffect:event.target.value}))}>{[...new Set(EFFECT_CATALOG[draft.engine].map(item=>item.category))].map(category=><optgroup key={category} label={category}>{EFFECT_CATALOG[draft.engine].filter(item=>item.category===category).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>)}</select></label><p>{selectedLibraryEffect.hint}</p><button type="button" disabled={!canEdit} onClick={applyLibraryEffect}><Play size={16}/>Aplicar efeito</button><a href={LIBRARY_DOCS[draft.engine]} target="_blank" rel="noreferrer">Referência completa da biblioteca ↗</a><p>Escolha um efeito pronto ou descreva outra combinação à IA. O código fica disponível em Dev.</p></div>
            {engineTourIndex !== null && ENGINE_META[engineTourIndex] && (
              <div className="mt-3 rounded-2xl border-2 border-black bg-white p-3 shadow-lg">
                <div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Primeira visita · {engineTourIndex + 1}/{ENGINE_META.length}</div>
                <div className="mt-1 text-sm font-bold">{ENGINE_META[engineTourIndex].name} · {ENGINE_META[engineTourIndex].tag}</div>
                <div className="mt-1 text-[11px] leading-relaxed text-neutral-600">{ENGINE_META[engineTourIndex].guide}</div>
                <div className="mt-3 flex items-center gap-2">
                  <button type="button" disabled={engineTourIndex===0} onClick={()=>setEngineTourIndex(Math.max(0,engineTourIndex-1))} className="h-9 px-3 rounded-lg border border-black/10 disabled:opacity-30 flex items-center gap-1 text-[10px] font-mono"><ChevronLeft size={13}/> VOLTAR</button>
                  <button type="button" onClick={()=>engineTourIndex >= ENGINE_META.length-1 ? finishEngineTour() : setEngineTourIndex(engineTourIndex+1)} className="h-9 px-3 rounded-lg bg-black text-white flex items-center gap-1 text-[10px] font-mono font-bold">{engineTourIndex >= ENGINE_META.length-1 ? 'ENTENDI' : 'PRÓXIMO'}<ChevronRight size={13}/></button>
                  <button type="button" onClick={finishEngineTour} className="ml-auto h-9 px-2 text-[9px] font-mono text-neutral-500">FECHAR</button>
                </div>
              </div>
            )}
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

          {nodes.some(node=>node.sprite) && <div className="rounded-xl border p-3"><b>Personagens do projeto</b><p className="text-sm text-neutral-500 mt-1">Selecione um personagem para enviar suas referências à IA.</p><div className="mt-2 grid grid-cols-2 gap-2">{nodes.filter(node=>node.sprite).map(node=><button key={node.id} type="button" aria-pressed={draft.characterReference?.nodeId === node.id} onClick={()=>chooseCharacter(node)} className="rounded-xl border p-2 text-left"><img className="h-24 w-full object-contain" alt="" src={'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(buildCharacterSvg(node.sprite!))}/><span>{node.sprite!.characterName || node.title}</span></button>)}</div></div>}
          {draft.characterReference && <div className="rounded-xl border bg-teal-50 p-3 text-sm"><b>{draft.characterReference.name} · {draft.characterReference.views.length} {draft.characterReference.views.length === 1 ? 'referência' : 'vistas'}</b><div className="flex mt-2">{draft.characterReference.views.map(view=><img key={view.view} alt={view.view} src={view.url} className="w-1/4 h-20 object-contain"/>)}</div><p className="mt-2">A IA interpreta as referências para construir uma cena volumétrica em Three.js. As vistas 2D orientam a forma; não são uma malha 3D pronta.</p>{draft.engine === 'three' && (!draft.characterReference.appearance?.bodyPlan || draft.characterReference.appearance.bodyPlan === 'biped') && <button type="button" onClick={() => { setDraft(current=>({...current,code:characterSceneCode})); setPreviewCode(characterSceneCode); setRuntimeError(''); setPreviewKey(value=>value+1); }} className="mt-2 border rounded-lg p-2 bg-white">Testar base 3D articulada</button>}</div>}

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

          {draft.asset?.kind === 'svg' && (
            <div className="rounded-2xl border-2 border-black p-3.5 bg-white space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center shrink-0"><ShieldCheck size={17} /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-[0.16em]">Animar o SVG original</div>
                  <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">Escolha primeiro o comportamento. O sistema usa os elementos reais do arquivo, sem redesenhar a marca.</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDraft((current) => ({ ...current, preserveBrand: current.preserveBrand === false }))}
                className={`w-full rounded-xl border px-3 py-2.5 flex items-center justify-between gap-3 text-left cursor-pointer ${draft.preserveBrand !== false ? 'border-black bg-[#F3F2EE]' : 'border-[#D8D7D2] bg-white'}`}
              >
                <div>
                  <div className="text-[11px] font-bold">Marca protegida</div>
                  <div className="text-[9px] text-neutral-500 mt-0.5">preserva cores, proporções, viewBox e desenho original</div>
                </div>
                <div className={`h-6 w-11 rounded-full p-0.5 transition ${draft.preserveBrand !== false ? 'bg-black' : 'bg-neutral-300'}`}><div className={`h-5 w-5 rounded-full bg-white transition-transform ${draft.preserveBrand !== false ? 'translate-x-5' : ''}`} /></div>
              </button>

              {draft.asset.profile?.palette?.length ? (
                <div>
                  <div className="flex items-center gap-2 text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-neutral-500"><Palette size={13} /> cores encontradas no arquivo</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {draft.asset.profile.palette.map((color) => (
                      <div key={color} className="flex items-center gap-1.5 rounded-full border border-[#D8D7D2] bg-white pr-2 py-1 pl-1">
                        <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: color }} />
                        <span className="text-[9px] font-mono">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              <div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-neutral-500">1. escolha o efeito</div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {SVG_EFFECTS.map((effect) => (
                    <button
                      key={effect.id}
                      type="button"
                      onClick={() => setDraft((current) => ({ ...current, effectPreset: effect.id, engine: 'svg' }))}
                      className={`rounded-xl border px-3 py-2.5 text-left cursor-pointer ${draft.effectPreset === effect.id ? 'border-black bg-black text-white' : 'border-[#D8D7D2] bg-white'}`}
                    >
                      <div className="text-[11px] font-bold">{effect.label}</div>
                      <div className={`text-[9px] leading-snug mt-1 ${draft.effectPreset === effect.id ? 'text-white/70' : 'text-neutral-500'}`}>{effect.hint}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[9px] font-mono font-bold uppercase tracking-[0.15em] text-neutral-500">2. intensidade</div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {INTENSITIES.map((item) => (
                    <button key={item.id} type="button" onClick={() => setDraft((current) => ({ ...current, intensity: item.id }))} className={`h-9 rounded-xl border text-[10px] font-bold cursor-pointer ${draft.intensity === item.id ? 'border-black bg-[#F1F0EC]' : 'border-[#D8D7D2] bg-white'}`}>{item.label}</button>
                  ))}
                </div>
              </div>

              <button type="button" onClick={applySelectedEffect} className="w-full min-h-11 rounded-xl bg-black text-white flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider cursor-pointer">
                <Play size={15} /> APLICAR EFEITO À MARCA
              </button>
            </div>
          )}

          {!draft.asset || draft.asset.kind !== 'svg' ? (
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">atalhos de criação livre</span>
                <WandSparkles size={14} className="text-neutral-400" />
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {PRESETS.map((preset) => (
                  <button key={preset.title} type="button" onClick={() => applyPreset(preset)} className="rounded-full border border-[#D8D7D2] bg-white px-3 py-1.5 text-[10px] font-bold hover:border-black cursor-pointer" title={`Usar ${ENGINE_LABELS[preset.engine]}`}>{preset.title}</button>
                ))}
              </div>
            </div>
          ) : null}

          {(draft.messages || []).length > 0 && <div aria-label="Conversa com a IA" className="interactive-chat-history">{draft.messages!.map((message,index)=><div key={index} className={`interactive-chat-message ${message.role}`}><b>{message.role === 'user' ? 'Você' : 'Forja'}</b><p>{message.content}</p></div>)}<div ref={chatRef}/></div>}
          {(draft.revisions || []).length > 0 && <button type="button" onClick={() => { const revision = draft.revisions![draft.revisions!.length-1]; setDraft(current=>({...current,...revision,revisions:current.revisions!.slice(0,-1)})); setPreviewCode(revision.code); setRuntimeError(''); }} className="w-full border rounded-xl p-2 text-sm">Restaurar versão anterior</button>}
          <label className="block">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">{draft.asset?.kind === 'svg' ? '3. refinar o efeito com a Forja (opcional)' : 'descreva a interação / converse com a Forja'}</span>
              <VoiceDictationButton
                disabled={!canEdit || isGenerating}
                onText={(text) => setDraft((current) => ({ ...current, prompt: `${current.prompt}${current.prompt && !current.prompt.endsWith(' ') ? ' ' : ''}${text}` }))}
                title="Ditar comando de animação"
              />
            </div>
            <textarea
              value={draft.prompt}
              onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
              disabled={!canEdit}
              placeholder={draft.asset?.kind === 'svg' ? 'Ex.: deixe o movimento mais lento; conecte somente círculos próximos; faça as linhas reagirem ao toque. A marca e suas cores devem permanecer intactas.' : 'Ex.: crie partículas que respondam ao toque...'}
              className="mt-2 w-full min-h-[120px] rounded-xl border border-[#D8D7D2] p-3 text-sm leading-relaxed outline-none focus:border-black resize-y disabled:bg-neutral-100 select-text"
              style={{ touchAction: 'manipulation' }}
            />
          </label>

          <button
            type="button"
            onClick={() => void generateFromPrompt()}
            disabled={!canEdit || isGenerating || !draft.prompt.trim()}
            className="w-full min-h-12 rounded-xl bg-black text-white disabled:bg-neutral-300 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'REFINANDO INTERAÇÃO…' : draft.asset?.kind === 'svg' ? 'REFINAR EFEITO COM IA' : 'GERAR / RECRIAR POR PROMPT'}
          </button>

          {draft.asset?.kind === 'svg' && draft.engine !== 'three' && (
            <div className="rounded-xl bg-[#F3F2EE] px-3 py-2.5 text-[10px] leading-relaxed text-neutral-600 flex gap-2">
              <ImagePlus size={14} className="shrink-0 mt-0.5" />
              Para SVG, o efeito controlado monta o arquivo original e anima seus próprios elementos. A IA entra apenas como refinamento do comportamento; com Marca protegida ligada, não deve trocar cores nem redesenhar a composição.
            </div>
          )}

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}


        </section>}>

        <section className="interactive-workbench min-h-0 flex flex-col bg-[#ECEBE7]">
          <div className="interactive-sketch-toolbar px-3 py-2 gap-2 flex-wrap border-b border-[#D8D7D2] bg-white/90 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2"><Play size={13} /> prévia em tempo real · {ENGINE_LABELS[draft.engine]}</span>
            <button type="button" aria-pressed={developerMode} aria-label="Modo desenvolvedor" onClick={() => setDeveloperMode(value => !value)} className="h-9 px-3 rounded-lg border flex items-center gap-2"><Code2 size={16}/><span>Dev</span></button>
            <button type="button" onClick={() => { setPreviewCode(draft.code); setRuntimeError(''); setPreviewKey((value) => value + 1); }} className="h-8 px-3 rounded-lg border border-[#D8D7D2] bg-white hover:border-black text-[10px] font-mono font-bold cursor-pointer">EXECUTAR</button>
          </div>
          {developerMode && <div className="interactive-code-editor">
            <div className="h-10 px-3 bg-[#F7F7F4] border-b border-[#D8D7D2] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase flex items-center gap-1.5"><Code2 size={13} /> código · {ENGINE_LABELS[draft.engine]}</span>
              <button type="button" onClick={copyCode} className="h-8 px-2 rounded-lg hover:bg-black/5 flex items-center gap-1 text-[10px] font-mono cursor-pointer">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'COPIADO' : 'COPIAR'}</button>
            </div>
            <textarea
              aria-label="Código do efeito" value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              disabled={!canEdit}
              spellCheck={false}
              onKeyDown={event=>{if(event.key==='Tab'){event.preventDefault();const input=event.currentTarget,start=input.selectionStart,end=input.selectionEnd;setDraft(current=>({...current,code:current.code.slice(0,start)+'  '+current.code.slice(end)}));requestAnimationFrame(()=>{input.selectionStart=input.selectionEnd=start+2;});}if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();setPreviewCode(draft.code);setRuntimeError('');setPreviewKey(value=>value+1);}}}
              className="interactive-code-input"
              style={{ touchAction: 'manipulation' }}
            />
          </div>}
          {runtimeError && <div role="alert" className="m-3 p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm"><b>O sketch encontrou um erro</b><p className="break-words mt-1">{runtimeError}</p><button type="button" disabled={isGenerating || !canEdit} onClick={() => void generateFromPrompt(true)} className="mt-2 border rounded-lg px-3 py-2 disabled:opacity-50">{isGenerating ? 'Corrigindo…' : 'Corrigir com IA'}</button></div>}
          <div className="interactive-sketch-container flex-1 min-h-0 p-3 sm:p-5">
            <div className="interactive-sketch-surface h-full rounded-2xl overflow-hidden border border-[#D0CFCB] bg-white shadow-sm">
              <InteractivePreview key={previewKey} document={{ ...draft, code: previewCode }} className="w-full h-full" interactive onRuntimeError={setRuntimeError} />
            </div>
          </div>
        </section>
      </StudioWorkspace>
    </div>
  );
}
