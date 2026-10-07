import {useGraphicFonts} from '../lib/graphicFonts';
import ImageStudio from './ImageStudio';
import {Search as ImageSearch} from 'lucide-react';
import ImageLibrary from './ImageLibrary';
import PhotopeaEditor from './PhotopeaEditor';
import { imageCredit, type OpenImage } from '../lib/openImages';
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ZoomIn, ZoomOut, Maximize, Plus, Trash2, CheckCircle2, 
  HelpCircle, Compass, Sparkles, BookOpen, User, CornerDownRight, Check, MessageCircle, Paperclip,
  ImagePlus, Link2, Loader2, MoveDiagonal2, X, Pencil, Code2, Play, Pause, PanelsTopLeft, Palette, Film, WandSparkles, Languages, Volume2, Cpu, Gamepad2, ChevronUp, ChevronDown, Plug, Fingerprint
} from 'lucide-react';
import { ThoughtNode, Project, Phase, UserProfile, CollaborationPermission, DrawingDocument, InteractiveDocument, WireframeDocument, DesignSystemDocument, VideoDocument, UXWritingDocument, SoundDocument, HardwareDocument, CharacterSpriteDocument, GameDesignDocument, ApiConnectionsDocument, VisualIdentityDocument, DataStoryDocument, GraphicSystemDocument, TextStudioDocument } from '../types';
import NodeCollaborationPanel from './NodeCollaborationPanel';
import MediatorSticker from './MediatorSticker';
import RichNote from './RichNote';
import DrawingStudio, { DrawingPreview, drawingToSvgString, drawingToVideoSvg } from './DrawingStudio';
import InteractiveStudio, { InteractivePreview, blankInteractiveDocument } from './InteractiveStudio';
import WireframeStudio, { WireframePreview, blankWireframe, WireframeImportSource } from './WireframeStudio';
import DesignSystemStudio, { DesignSystemPreview, blankDesignSystem } from './DesignSystemStudio';
import VideoStudio, { VideoPreview, blankVideo } from './VideoStudio';
import UXWritingStudio, { UXWritingPreview, blankUXWriting } from './UXWritingStudio';
import SoundStudio, { SoundPreview, blankSound } from './SoundStudio';
import HardwareStudio, { HardwarePreview, blankHardware } from './HardwareStudio';
import SpriteStudio, { SpriteCharacterPreview, blankSpriteCharacter, buildCharacterSvg } from './SpriteStudio';
import type { SpriteAssetOption } from './SpriteStudio';
import GameDesignStudio, { GameDesignPreview, blankGameDesign } from './GameDesignStudio';
import ApiConnectionsStudio, { ApiConnectionsPreview, blankApiConnections } from './ApiConnectionsStudio';
import VisualIdentityStudio, { VisualIdentityPreview, blankVisualIdentity } from './VisualIdentityStudio';
import DataStoryStudio, { DataStoryPreview, blankDataStory } from './DataStoryStudio';
import GraphicsStudio, { GraphicsPreview, blankGraphicSystem } from './GraphicsStudio';
import TextStudio, { TextStudioPreview, blankTextStudio } from './TextStudio';
import { readStoredTursoSession } from '../lib/turso';

export interface InfiniteCanvasHandle {
  getCenteredCardPosition: (cardWidth?: number, cardHeight?: number) => { x: number; y: number };
  focusNode: (nodeId: string, openCollaboration?: boolean) => void;
}


const PHASE_NOTE_PALETTE: Record<Phase, { body: string; header: string; border: string; dot: string }> = {
  'Ideação': { body: '#FFF9E8', header: '#FFF0B8', border: '#E7C75C', dot: '#E4AC16' },
  'Inambulação': { body: '#EEF5FF', header: '#DCEBFF', border: '#8BB9F6', dot: '#3B82F6' },
  'Instauração': { body: '#EFF9F2', header: '#DDF3E4', border: '#8BC9A3', dot: '#43B581' },
  'Inspeção': { body: '#F7F0FF', header: '#EBDDFF', border: '#BE9BE8', dot: '#9A65D6' },
  'Implementação': { body: '#FFF1F2', header: '#FFDDE1', border: '#EE9BA4', dot: '#E85D6A' },
};

const xmlEscape = (value: any) => String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));
const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
function wireframeToSvgString(document: WireframeDocument, defaultFont="Inter") {
  const frame = document.frames.find((item) => item.id === document.activeFrameId) || document.frames[0];
  if (!frame) return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><rect width="400" height="600" fill="#fff"/></svg>';
  const w = Math.max(240, frame.width || 393), h = Math.max(320, frame.height || 852);
  const scale = Math.min(1, 720 / h, 520 / w); const outW = w * scale, outH = h * scale;
  let y = (frame.padding || 20) * scale; const pad = (frame.padding || 20) * scale; const gap = (frame.gap || 12) * scale;
  const pieces = (frame.blocks || []).map((block) => {
    const bh = (typeof block.height === 'number' ? block.height : block.type === 'navbar' ? 60 : block.type === 'card' || block.type === 'section' ? 120 : block.type === 'image' ? 140 : 48) * scale;
    const bw = outW - pad * 2; const x = pad; const r = Math.min(16, Number(block.radius ?? 10)) * scale;
    const bg = block.background || (block.type === 'button' || block.type === 'navbar' ? '#111111' : '#F1F1EF'); const fg = block.color || (block.type === 'button' || block.type === 'navbar' ? '#FFFFFF' : '#111111');
    const label = xmlEscape(block.label || block.type);
    let body = `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="${r}" fill="${bg}" stroke="#D8D8D4" stroke-width="1"/>`;
    if (block.type === 'image') body += `<path d="M ${x+bw*.18} ${y+bh*.68} L ${x+bw*.4} ${y+bh*.42} L ${x+bw*.52} ${y+bh*.56} L ${x+bw*.7} ${y+bh*.32} L ${x+bw*.84} ${y+bh*.68} Z" fill="#CFCFCA"/>`;
    else if (block.type === 'divider') body = `<line x1="${x}" y1="${y+bh/2}" x2="${x+bw}" y2="${y+bh/2}" stroke="#333"/>`;
    else body += `<text x="${x+12*scale}" y="${y+bh/2+4*scale}" font-family="${xmlEscape(block.fontFamily || defaultFont)}" font-size="${Math.max(9,(block.fontSize || 14)*scale)}" fill="${fg}">${label}</text>`;
    y += bh + gap; return body;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${outW} ${outH}"><rect width="${outW}" height="${outH}" fill="${frame.background || '#FFFFFF'}"/>${pieces}</svg>`;
}


interface InfiniteCanvasProps {
  project: Project;
  nodes: ThoughtNode[];
  /** Todos os assets do projeto, inclusive os que estão em outras páginas. */
  allProjectNodes?: ThoughtNode[];
  activePhase: Phase;
  onUpdateNodeCoords: (id: string, x: number, y: number) => void;
  onAddCustomThought: (x: number, y: number) => void;
  onUpdateNodeContent: (id: string, text: string, completed?: boolean) => void;
  onDeleteNode: (id: string) => void;
  onUpdateNode: (node: ThoughtNode) => void;
  onUpdateNodes: (nodes: ThoughtNode[]) => void;
  onAddNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => void;
  currentUser: UserProfile;
  collaborationPermission?: CollaborationPermission | null;
}

const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(function InfiniteCanvas({
  project,
  nodes,
  allProjectNodes,
  activePhase,
  onUpdateNodeCoords,
  onAddCustomThought,
  onUpdateNodeContent,
  onDeleteNode,
  onUpdateNode,
  onUpdateNodes,
  onAddNode,
  currentUser,
  collaborationPermission = null
}, ref) {
  const [panOffset, setPanOffset] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(0.9);
  const containerRef = useRef<HTMLDivElement>(null);
  const MIN_ZOOM = 0.35;
  const MAX_ZOOM = 1.8;
  const touchPointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchStateRef = useRef<null | {
    startDistance: number;
    startZoom: number;
    anchorCanvasX: number;
    anchorCanvasY: number;
  }>(null);
  const pinchActiveRef = useRef(false);
  const panOffsetRef = useRef(panOffset);
  const zoomRef = useRef(zoom);

  useEffect(() => { panOffsetRef.current = panOffset; }, [panOffset]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [collaborationNodeId, setCollaborationNodeId] = useState<string | null>(null);
  const [connectingFromId, setConnectingFromId] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<{ sourceId: string; targetId: string } | null>(null);
  const [connectionHoverNodeId, setConnectionHoverNodeId] = useState<string | null>(null);
  const [connectionDrag, setConnectionDrag] = useState<{
    mode: 'new' | 'relink-source' | 'relink-target';
    sourceId: string;
    targetId?: string;
    fixedX: number;
    fixedY: number;
    currentX: number;
    currentY: number;
  } | null>(null);
  const [drawingEditorNodeId, setDrawingEditorNodeId] = useState<string | null>(null);
  const [imageStudioOpen,setImageStudioOpen]=useState(false);
  const [imageLibraryOpen,setImageLibraryOpen]=useState(false);
  const [photoEditor,setPhotoEditor]=useState<{url?:string;name:string;nodeId?:string}|null>(null);
  const [newDrawing, setNewDrawing] = useState<DrawingDocument | null>(null);
  const [interactiveEditorNodeId, setInteractiveEditorNodeId] = useState<string | null>(null);
  const [newInteractive, setNewInteractive] = useState<InteractiveDocument | null>(null);
  const [activeInteractiveNodeId, setActiveInteractiveNodeId] = useState<string | null>(null);
  const [wireframeEditorNodeId, setWireframeEditorNodeId] = useState<string | null>(null);
  const [newWireframe, setNewWireframe] = useState<WireframeDocument | null>(null);
  const [newWireframeSource, setNewWireframeSource] = useState<WireframeImportSource | null>(null);
  const [designSystemEditorNodeId, setDesignSystemEditorNodeId] = useState<string | null>(null);
  const [newDesignSystem, setNewDesignSystem] = useState<DesignSystemDocument | null>(null);
  const [visualIdentityEditorNodeId, setVisualIdentityEditorNodeId] = useState<string | null>(null);
  const [newVisualIdentity, setNewVisualIdentity] = useState<VisualIdentityDocument | null>(null);
  const [videoEditorNodeId, setVideoEditorNodeId] = useState<string | null>(null);
  const [newVideo, setNewVideo] = useState<VideoDocument | null>(null);
  const [uxWritingEditorNodeId, setUXWritingEditorNodeId] = useState<string | null>(null);
  const [newUXWriting, setNewUXWriting] = useState<UXWritingDocument | null>(null);
  const [soundEditorNodeId, setSoundEditorNodeId] = useState<string | null>(null);
  const [newSound, setNewSound] = useState<SoundDocument | null>(null);
  const [hardwareEditorNodeId, setHardwareEditorNodeId] = useState<string | null>(null);
  const [newHardware, setNewHardware] = useState<HardwareDocument | null>(null);
  const [spriteEditorNodeId, setSpriteEditorNodeId] = useState<string | null>(null);
  const [newSprite, setNewSprite] = useState<CharacterSpriteDocument | null>(null);
  const [gameEditorNodeId, setGameEditorNodeId] = useState<string | null>(null);
  const [newGame, setNewGame] = useState<GameDesignDocument | null>(null);
  const [apiEditorNodeId, setApiEditorNodeId] = useState<string | null>(null);
  const [newApiConnections, setNewApiConnections] = useState<ApiConnectionsDocument | null>(null);
  const [dataStoryEditorNodeId, setDataStoryEditorNodeId] = useState<string | null>(null);
  const [newDataStory, setNewDataStory] = useState<DataStoryDocument | null>(null);
  const [graphicEditorNodeId, setGraphicEditorNodeId] = useState<string | null>(null);
  const [newGraphicSystem, setNewGraphicSystem] = useState<GraphicSystemDocument | null>(null);
  const [textEditorNodeId, setTextEditorNodeId] = useState<string | null>(null);
  const [newTextStudio, setNewTextStudio] = useState<TextStudioDocument | null>(null);
  const [projectLibraryOpen, setProjectLibraryOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      const stored = window.localStorage.getItem('canvas-tools-open');
      if (stored === '1') return true;
      if (stored === '0') return false;
    } catch {}
    return window.matchMedia('(min-width: 640px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try { window.localStorage.setItem('canvas-tools-open', mobileToolsOpen ? '1' : '0'); } catch {}
  }, [mobileToolsOpen]);
  const [uploadingCanvasImage, setUploadingCanvasImage] = useState(false);
  const [canvasImageError, setCanvasImageError] = useState('');
  const canvasImageInputRef = useRef<HTMLInputElement>(null);
  const canEditCanvas = !collaborationPermission || collaborationPermission === 'edit';
  const projectNodes = allProjectNodes || nodes;
  const projectDesignSystem = [...projectNodes].reverse().find((item) => item.type === 'design-system' && item.designSystem)?.designSystem;
  const projectVisualIdentity = [...projectNodes].reverse().find((item) => item.type === 'visual-identity' && item.visualIdentity)?.visualIdentity;

  const atelierOpen = Boolean(newTextStudio || textEditorNodeId || newDrawing || drawingEditorNodeId || newInteractive || interactiveEditorNodeId || newWireframe || wireframeEditorNodeId || newDesignSystem || designSystemEditorNodeId || newVisualIdentity || visualIdentityEditorNodeId || newVideo || videoEditorNodeId || newUXWriting || uxWritingEditorNodeId || newSound || soundEditorNodeId || newHardware || hardwareEditorNodeId || newSprite || spriteEditorNodeId || newGame || gameEditorNodeId || newApiConnections || apiEditorNodeId || newDataStory || dataStoryEditorNodeId || newGraphicSystem || graphicEditorNodeId);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.classList.toggle('atelier-open', atelierOpen);
    return () => document.body.classList.remove('atelier-open');
  }, [atelierOpen]);

  useGraphicFonts([projectDesignSystem?.primaryFont,...Object.values(projectDesignSystem?.fontFamilies || {})]);
  const projectVideoMedia = projectNodes.flatMap((item) => {
    const media: Array<{ id: string; kind: 'image' | 'video'; url: string; name: string; source: 'project' }> = [];
    if (item.type === 'canvas-image' && item.imageUrl) media.push({ id: item.id, kind: 'image', url: item.imageUrl, name: item.imageName || item.title || 'Imagem do projeto', source: 'project' });
    if (item.type === 'drawing-sheet' && item.drawing) media.push({ id: item.id, kind: 'image', url: svgDataUrl(drawingToVideoSvg(item.drawing)), name: item.drawingName || item.title || 'Desenho do projeto', source: 'project' });
    if (item.type === 'wireframe-board' && item.wireframe) media.push({ id: item.id, kind: 'image', url: svgDataUrl(wireframeToSvgString(item.wireframe, projectDesignSystem?.fontFamilies?.text || projectDesignSystem?.primaryFont)), name: item.wireframeName || item.title || 'Wireframe do projeto', source: 'project' });
    if (item.type === 'interactive-lab' && item.interactive?.asset?.url) media.push({ id: item.id, kind: 'image', url: item.interactive.asset.url, name: item.interactiveName || item.title || 'Asset da interação', source: 'project' });
    if (item.type === 'sprite-character' && item.sprite) media.push({ id: item.id, kind: 'image', url: svgDataUrl(item.sprite.generatedSvg || buildCharacterSvg(item.sprite, item.sprite.activeView || 'front', item.sprite.activeExpression || 'neutral', item.sprite.activePose || 'neutral')), name: item.spriteName || item.title || 'Personagem do projeto', source: 'project' });
    if (item.type === 'video-board' && item.video) { const url = item.video.generatedUrl || item.video.sourceUrl; if (url) media.push({ id: item.id, kind: 'video', url, name: item.videoName || item.video.title || 'Vídeo do projeto', source: 'project' }); (item.video.media || []).forEach((m) => { if (m.url) media.push({ ...m, id: `${item.id}:${m.id}`, source: 'project' }); }); }
    (item.attachments || []).forEach((attachment) => { if (attachment.url && (attachment.type === 'image' || attachment.type === 'video')) media.push({ id: `${item.id}:${attachment.id}`, kind: attachment.type, url: attachment.url, name: attachment.name || `Mídia de ${item.title}`, source: 'project' }); });
    return media;
  });

  const projectSpriteAssets: SpriteAssetOption[] = projectNodes.flatMap((item) => {
    if (item.type === 'canvas-image' && item.imageUrl) return [{ id: item.id, name: item.imageName || item.title || 'Imagem do projeto', url: item.imageUrl, source: 'project' as const }];
    if (item.type === 'drawing-sheet' && item.drawing) return [{ id: item.id, name: item.drawingName || item.title || 'Desenho do projeto', url: svgDataUrl(drawingToSvgString(item.drawing)), source: 'project' as const }];
    return [];
  });

  const projectGameAssets = projectNodes.filter((item) => ['canvas-image','drawing-sheet','interactive-lab','wireframe-board','sound-board','video-board','design-system','sprite-character'].includes(item.type)).map((item) => {
    const spriteAnimation = item.sprite?.animations?.find((animation) => animation.id === item.sprite?.activeAnimationId) || item.sprite?.animations?.[0];
    const spriteUrl = spriteAnimation?.frames?.[0]?.url || (item.sprite ? svgDataUrl(item.sprite.generatedSvg || buildCharacterSvg(item.sprite, item.sprite.activeView || 'front', item.sprite.activeExpression || 'neutral', item.sprite.activePose || 'neutral')) : undefined);
    return {
      id: item.id,
      name: item.imageName || item.drawingName || item.interactiveName || item.wireframeName || item.soundName || item.videoName || item.designSystemName || item.spriteName || item.title,
      type: item.type,
      url: item.imageUrl || item.video?.generatedUrl || item.video?.sourceUrl || spriteUrl || undefined,
    };
  });

  const getNodeDimensions = (node: ThoughtNode) => {
    const compactCanvas = typeof window !== 'undefined' && window.innerWidth < 640;
    if (node.type === 'canvas-image') {
      return { width: node.width || (compactCanvas ? 280 : 320), height: node.height || (compactCanvas ? 210 : 240) };
    }
    if (node.type === 'text-system') {
      return { width: node.width || (compactCanvas ? 300 : 380), height: node.height || (compactCanvas ? 220 : 280) };
    }
    if (node.type === 'drawing-sheet') {
      return { width: node.width || (compactCanvas ? 300 : 380), height: node.height || (compactCanvas ? 200 : 255) };
    }
    if (node.type === 'interactive-lab') {
      return { width: node.width || (compactCanvas ? 320 : 440), height: node.height || (compactCanvas ? 240 : 320) };
    }
    if (node.type === 'wireframe-board') {
      return { width: node.width || (compactCanvas ? 320 : 420), height: node.height || (compactCanvas ? 260 : 320) };
    }
    if (node.type === 'design-system') {
      return { width: node.width || (compactCanvas ? 320 : 400), height: node.height || (compactCanvas ? 250 : 300) };
    }
    if (node.type === 'visual-identity') {
      return { width: node.width || (compactCanvas ? 320 : 410), height: node.height || (compactCanvas ? 260 : 310) };
    }
    if (node.type === 'video-board') {
      return { width: node.width || (compactCanvas ? 300 : 380), height: node.height || (compactCanvas ? 360 : 430) };
    }
    if (node.type === 'ux-writing') {
      return { width: node.width || (compactCanvas ? 320 : 400), height: node.height || (compactCanvas ? 280 : 330) };
    }
    if (node.type === 'sound-board') {
      return { width: node.width || (compactCanvas ? 300 : 380), height: node.height || (compactCanvas ? 220 : 270) };
    }
    if (node.type === 'hardware-board') {
      return { width: node.width || (compactCanvas ? 320 : 400), height: node.height || (compactCanvas ? 250 : 300) };
    }
    if (node.type === 'sprite-character') {
      return { width: node.width || (compactCanvas ? 280 : 340), height: node.height || (compactCanvas ? 280 : 340) };
    }
    if (node.type === 'game-design') {
      return { width: node.width || (compactCanvas ? 320 : 420), height: node.height || (compactCanvas ? 260 : 320) };
    }
    if (node.type === 'api-connections') {
      return { width: node.width || (compactCanvas ? 320 : 410), height: node.height || (compactCanvas ? 240 : 290) };
    }
    if (node.type === 'data-story') {
      return { width: node.width || (compactCanvas ? 320 : 430), height: node.height || (compactCanvas ? 260 : 320) };
    }
    if (node.type === 'graphic-system') {
      return { width: node.width || (compactCanvas ? 300 : 380), height: node.height || (compactCanvas ? 300 : 380) };
    }
    if (node.type === 'core') {
      return { width: node.width || (compactCanvas ? 360 : 480), height: node.height || 320 };
    }
    return {
      width: node.width || (compactCanvas ? 340 : 360),
      height: node.height || (node.type === 'question' ? 460 : 200),
    };
  };

  const getDefaultZoom = () => {
    if (typeof window === 'undefined') return 0.9;
    if (window.innerWidth < 420) return 0.86;
    if (window.innerWidth < 768) return 0.9;
    return 0.9;
  };

  const getCenteredPosition = (width: number, height: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 1000, y: 1000 };
    return {
      x: Math.max(0, (rect.width / 2 - panOffset.x) / zoom - width / 2),
      y: Math.max(0, (rect.height / 2 - panOffset.y) / zoom - height / 2),
    };
  };

  const readApiResponse = async (response: Response) => {
    const raw = await response.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return { error: raw };
    }
  };

  const getImageSize = (file: File) => new Promise<{ width: number; height: number }>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const width = image.naturalWidth || 1;
      const height = image.naturalHeight || 1;
      URL.revokeObjectURL(url);
      resolve({ width, height });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler as dimensões da imagem.'));
    };
    image.src = url;
  });

  const addOpenImage=async(image:OpenImage)=>{if(!canEditCanvas)return;const ratio=(image.width || 640)/Math.max(1,image.height || 480),width=ratio>=1?320:Math.max(100,320*ratio),height=width/ratio,position=getCenteredPosition(width,height);onAddNode({type:'canvas-image',title:image.title,content:'',phase:activePhase,x:position.x,y:position.y,width,height,imageUrl:image.url,imageName:image.title,imageContentType:'image/*',aspectRatio:ratio,imageCredit:imageCredit(image),connections:[]});setImageLibraryOpen(false);setImageStudioOpen(false);};
  const uploadCanvasImage = async (file: File,replaceNodeId?:string) => {
    if (!canEditCanvas) return;
    if (!file.type.startsWith('image/')) {
      setCanvasImageError('Escolha um arquivo de imagem.');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setCanvasImageError('Escolha uma imagem de até 4 MB.');
      return;
    }

    setUploadingCanvasImage(true);
    setCanvasImageError('');

    try {
      const session = readStoredTursoSession();
      if (!session?.token) throw new Error('Sua sessão expirou. Saia e entre novamente.');

      const sourceSize = await getImageSize(file);
      const aspectRatio = sourceSize.width / Math.max(sourceSize.height, 1);
      const maxInitialSide = typeof window !== 'undefined' && window.innerWidth < 640 ? 300 : 420;
      let startWidth: number;
      let startHeight: number;
      if (aspectRatio >= 1) {
        startWidth = Math.min(maxInitialSide, Math.max(220, sourceSize.width));
        startHeight = startWidth / aspectRatio;
      } else {
        startHeight = Math.min(maxInitialSide, Math.max(220, sourceSize.height));
        startWidth = startHeight * aspectRatio;
      }
      startWidth = Math.max(100, startWidth);
      startHeight = Math.max(80, startHeight);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.token}`,
          'Content-Type': file.type || 'application/octet-stream',
          'X-File-Name': encodeURIComponent(file.name),
        },
        body: file,
      });
      const data: any = await readApiResponse(response);
      if (!response.ok || !data.url) {
        throw new Error(data.error || `O upload falhou na Vercel (HTTP ${response.status}).`);
      }

      const position = getCenteredPosition(startWidth, startHeight);
      const existing=replaceNodeId?nodes.find(item=>item.id===replaceNodeId):undefined;
      const imageNode={
        type: 'canvas-image' as const,
        title: data.name || file.name,
        content: '',
        phase: activePhase,
        x: position.x,
        y: position.y,
        width: startWidth,
        height: startHeight,
        imageUrl: data.url,
        imageName: data.name || file.name,
        imageContentType: data.contentType || file.type,
        aspectRatio,
        connections: [],
      };
      if(existing)onUpdateNode({...existing,imageUrl:data.url,imageName:data.name || file.name,imageContentType:data.contentType || file.type,aspectRatio,height:existing.width/aspectRatio});else onAddNode(imageNode);
      return true;
    } catch (error: any) {
      setCanvasImageError(error?.message || 'Não foi possível adicionar a imagem ao canvas.');
      return false;
    } finally {
      setUploadingCanvasImage(false);
      if (canvasImageInputRef.current) canvasImageInputRef.current.value = '';
    }
  };

  const handleResizePointerDown = (
    event: React.PointerEvent,
    node: ThoughtNode,
    axis: 'x' | 'y' | 'both',
    lockAspect = false,
  ) => {
    if (!canEditCanvas) return;
    event.stopPropagation();
    event.preventDefault();

    const handle = event.currentTarget as HTMLElement;
    const card = handle.closest('.thought-card') as HTMLElement | null;
    if (!card) return;

    const pointerId = event.pointerId;
    handle.setPointerCapture?.(pointerId);
    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = card.offsetWidth;
    const startHeight = card.offsetHeight;
    const aspectRatio = node.aspectRatio || startWidth / Math.max(startHeight, 1);
    let finalWidth = startWidth;
    let finalHeight = startHeight;

    const isVisualNode = node.type === 'canvas-image' || node.type === 'drawing-sheet' || node.type === 'interactive-lab' || node.type === 'wireframe-board' || node.type === 'design-system' || node.type === 'visual-identity' || node.type === 'video-board' || node.type === 'ux-writing' || node.type === 'sound-board' || node.type === 'hardware-board' || node.type === 'sprite-character' || node.type === 'game-design' || node.type === 'api-connections' || node.type === 'data-story' || node.type === 'graphic-system';
    const minWidth = isVisualNode ? 100 : 240;
    const minHeight = isVisualNode ? 80 : 150;
    const maxWidth = isVisualNode ? 1400 : 820;
    const maxHeight = isVisualNode ? 1400 : 900;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoomRef.current;

      if (lockAspect) {
        if (axis === 'y') {
          finalHeight = clamp(startHeight + dy, minHeight, maxHeight);
          finalWidth = clamp(finalHeight * aspectRatio, minWidth, maxWidth);
          finalHeight = finalWidth / aspectRatio;
        } else {
          const delta = axis === 'both' && Math.abs(dy) > Math.abs(dx) ? dy * aspectRatio : dx;
          finalWidth = clamp(startWidth + delta, minWidth, maxWidth);
          finalHeight = finalWidth / aspectRatio;
          if (finalHeight > maxHeight) {
            finalHeight = maxHeight;
            finalWidth = finalHeight * aspectRatio;
          }
        }
      } else {
        finalWidth = axis === 'y' ? startWidth : clamp(startWidth + dx, minWidth, maxWidth);
        finalHeight = axis === 'x' ? startHeight : clamp(startHeight + dy, minHeight, maxHeight);
      }

      card.style.width = `${finalWidth}px`;
      card.style.height = `${finalHeight}px`;
    };

    const finish = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      handle.releasePointerCapture?.(pointerId);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      onUpdateNode({ ...node, width: Math.round(finalWidth), height: Math.round(finalHeight) });
    };

    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  const toggleConnection = (targetId: string) => {
    if (!connectingFromId || connectingFromId === targetId || !canEditCanvas) return;
    const source = nodes.find((item) => item.id === connectingFromId);
    if (!source) return;
    const exists = source.connections.includes(targetId);
    const nextNodes = nodes.map((item) => item.id === source.id ? {
      ...item,
      connections: exists ? item.connections.filter((id) => id !== targetId) : [...item.connections, targetId],
    } : item);
    onUpdateNodes(nextNodes);
    setSelectedNodeId(targetId);
    setSelectedConnection(exists ? null : { sourceId: source.id, targetId });
  };

  const getConnectionGeometry = (source: ThoughtNode, target: ThoughtNode) => {
    const sourceSize = getNodeDimensions(source);
    const targetSize = getNodeDimensions(target);
    const sourceCenter = { x: source.x + sourceSize.width / 2, y: source.y + sourceSize.height / 2 };
    const targetCenter = { x: target.x + targetSize.width / 2, y: target.y + targetSize.height / 2 };
    const deltaX = targetCenter.x - sourceCenter.x;
    const deltaY = targetCenter.y - sourceCenter.y;
    let x1 = sourceCenter.x;
    let y1 = sourceCenter.y;
    let x2 = targetCenter.x;
    let y2 = targetCenter.y;

    if (Math.abs(deltaX) >= Math.abs(deltaY)) {
      const direction = deltaX >= 0 ? 1 : -1;
      x1 += direction * sourceSize.width / 2;
      x2 -= direction * targetSize.width / 2;
    } else {
      const direction = deltaY >= 0 ? 1 : -1;
      y1 += direction * sourceSize.height / 2;
      y2 -= direction * targetSize.height / 2;
    }

    const horizontal = Math.abs(x2 - x1) >= Math.abs(y2 - y1);
    const bend = horizontal ? Math.max(40, Math.abs(x2 - x1) * 0.45) : Math.max(40, Math.abs(y2 - y1) * 0.45);
    const cx1 = horizontal ? x1 + Math.sign(x2 - x1 || 1) * bend : x1;
    const cy1 = horizontal ? y1 : y1 + Math.sign(y2 - y1 || 1) * bend;
    const cx2 = horizontal ? x2 - Math.sign(x2 - x1 || 1) * bend : x2;
    const cy2 = horizontal ? y2 : y2 - Math.sign(y2 - y1 || 1) * bend;
    const midpoint = {
      x: (x1 + 3 * cx1 + 3 * cx2 + x2) / 8,
      y: (y1 + 3 * cy1 + 3 * cy2 + y2) / 8,
    };
    return {
      x1,
      y1,
      x2,
      y2,
      cx1,
      cy1,
      cx2,
      cy2,
      midpoint,
      path: `M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`,
    };
  };

  const addDirectedConnection = (sourceId: string, targetId: string) => {
    if (!canEditCanvas || sourceId === targetId) return;
    const source = nodes.find((item) => item.id === sourceId);
    const target = nodes.find((item) => item.id === targetId);
    if (!source || !target) return;
    if (!source.connections.includes(targetId)) {
      onUpdateNodes(nodes.map((item) => item.id === sourceId ? { ...item, connections: [...item.connections, targetId] } : item));
    }
    setSelectedConnection({ sourceId, targetId });
    setSelectedNodeId(targetId);
  };

  const removeDirectedConnection = (sourceId: string, targetId: string) => {
    if (!canEditCanvas) return;
    onUpdateNodes(nodes.map((item) => item.id === sourceId ? { ...item, connections: item.connections.filter((id) => id !== targetId) } : item));
    setSelectedConnection(null);
  };

  const reverseDirectedConnection = (sourceId: string, targetId: string) => {
    if (!canEditCanvas || sourceId === targetId) return;
    const nextNodes = nodes.map((item) => {
      if (item.id === sourceId) return { ...item, connections: item.connections.filter((id) => id !== targetId) };
      if (item.id === targetId) return { ...item, connections: item.connections.includes(sourceId) ? item.connections : [...item.connections, sourceId] };
      return item;
    });
    onUpdateNodes(nextNodes);
    setSelectedConnection({ sourceId: targetId, targetId: sourceId });
  };

  const relinkConnection = (sourceId: string, targetId: string, endpoint: 'source' | 'target', replacementId: string) => {
    if (!canEditCanvas) return;
    if (endpoint === 'target') {
      if (replacementId === sourceId || replacementId === targetId) return;
      const nextNodes = nodes.map((item) => item.id === sourceId ? {
        ...item,
        connections: Array.from(new Set([...item.connections.filter((id) => id !== targetId), replacementId])),
      } : item);
      onUpdateNodes(nextNodes);
      setSelectedConnection({ sourceId, targetId: replacementId });
      return;
    }

    if (replacementId === targetId || replacementId === sourceId) return;
    const nextNodes = nodes.map((item) => {
      if (item.id === sourceId) return { ...item, connections: item.connections.filter((id) => id !== targetId) };
      if (item.id === replacementId) return { ...item, connections: item.connections.includes(targetId) ? item.connections : [...item.connections, targetId] };
      return item;
    });
    onUpdateNodes(nextNodes);
    setSelectedConnection({ sourceId: replacementId, targetId });
  };

  const canvasPointFromClient = (clientX: number, clientY: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - panOffset.x) / zoom,
      y: (clientY - rect.top - panOffset.y) / zoom,
    };
  };

  const getNodeAtClientPoint = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    return element?.closest('[data-node-id]')?.getAttribute('data-node-id') || null;
  };

  const beginConnectionDrag = (
    event: React.PointerEvent,
    mode: 'new' | 'relink-source' | 'relink-target',
    sourceId: string,
    targetId?: string,
  ) => {
    if (!canEditCanvas) return;
    event.stopPropagation();
    event.preventDefault();
    const source = nodes.find((item) => item.id === sourceId);
    const target = targetId ? nodes.find((item) => item.id === targetId) : undefined;
    if (!source) return;

    let fixedX = source.x + getNodeDimensions(source).width / 2;
    let fixedY = source.y + getNodeDimensions(source).height / 2;
    if (target) {
      const geometry = getConnectionGeometry(source, target);
      if (mode === 'relink-source') {
        fixedX = geometry.x2;
        fixedY = geometry.y2;
      } else {
        fixedX = geometry.x1;
        fixedY = geometry.y1;
      }
    }
    const point = canvasPointFromClient(event.clientX, event.clientY);
    setConnectionDrag({ mode, sourceId, targetId, fixedX, fixedY, currentX: point.x, currentY: point.y });
    setConnectionHoverNodeId(null);

    const pointerId = event.pointerId;
    const handle = event.currentTarget as HTMLElement;
    handle.setPointerCapture?.(pointerId);

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      const nextPoint = canvasPointFromClient(moveEvent.clientX, moveEvent.clientY);
      setConnectionDrag((current) => current ? { ...current, currentX: nextPoint.x, currentY: nextPoint.y } : current);
      setConnectionHoverNodeId(getNodeAtClientPoint(moveEvent.clientX, moveEvent.clientY));
    };

    const finish = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      handle.releasePointerCapture?.(pointerId);
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
      const replacementId = getNodeAtClientPoint(upEvent.clientX, upEvent.clientY);
      if (replacementId) {
        if (mode === 'new') addDirectedConnection(sourceId, replacementId);
        if (mode === 'relink-target' && targetId) relinkConnection(sourceId, targetId, 'target', replacementId);
        if (mode === 'relink-source' && targetId) relinkConnection(sourceId, targetId, 'source', replacementId);
      }
      setConnectionDrag(null);
      setConnectionHoverNodeId(null);
    };

    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  const interactiveFromDrawing = (drawing: DrawingDocument, name = 'Desenho animado'): InteractiveDocument => {
    const svg = drawingToSvgString(drawing);
    return {
      ...blankInteractiveDocument('svg'),
      engine: 'svg',
      title: name,
      prompt: 'Anime os elementos vetoriais deste desenho preservando sua composição. Use o chat para definir movimento, loop, sequência e resposta ao toque.',
      asset: {
        url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
        name: `${name.replace(/\s+/g, '-').toLowerCase()}.svg`,
        contentType: 'image/svg+xml',
        kind: 'svg',
      },
      preserveBrand: true,
      effectPreset: 'drift',
      interactionMode: 'pointer',
    };
  };

  const blankDrawing = (): DrawingDocument => ({
    width: 1200,
    height: 800,
    background: '#FFFFFF',
    elements: [],
  });

  useImperativeHandle(ref, () => ({
    getCenteredCardPosition: (cardWidth = 360, cardHeight = 460) => {
      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) {
        return { x: 1000, y: 1000 };
      }

      // Converte o centro visível do viewport para coordenadas reais do canvas.
      // A metade do tamanho estimado do card é descontada para que o card,
      // e não apenas seu canto superior esquerdo, nasça centralizado.
      const centerCanvasX = (rect.width / 2 - panOffset.x) / zoom;
      const centerCanvasY = (rect.height / 2 - panOffset.y) / zoom;

      return {
        x: Math.max(0, centerCanvasX - cardWidth / 2),
        y: Math.max(0, centerCanvasY - cardHeight / 2),
      };
    },
    focusNode: (nodeId: string, openCollaboration = false) => {
      const node = nodes.find((item) => item.id === nodeId);
      const rect = containerRef.current?.getBoundingClientRect();
      if (!node || !rect) return;
      const dimensions = getNodeDimensions(node);
      setPanOffset({
        x: rect.width / 2 - (node.x + dimensions.width / 2) * zoom,
        y: rect.height / 2 - (node.y + dimensions.height / 2) * zoom,
      });
      setSelectedNodeId(nodeId);
      if (openCollaboration) setCollaborationNodeId(nodeId);
    },
  }), [nodes, panOffset.x, panOffset.y, zoom]);

  // Center on project core node on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const core = nodes.find((node) => node.type === 'core');
      const coreDimensions = core ? getNodeDimensions(core) : { width: 480, height: 320 };
      const nextZoom = getDefaultZoom();
      setZoom(nextZoom);
      const coreX = core?.x ?? 1000;
      const coreY = core?.y ?? 1000;
      setPanOffset({
        x: rect.width / 2 - (coreX + coreDimensions.width / 2) * nextZoom,
        y: rect.height / 2 - (coreY + coreDimensions.height / 2) * nextZoom,
      });
    }
  }, [project.id]);

  // Handle zooming
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(prev + factor, MIN_ZOOM), MAX_ZOOM));
  };

  const handleResetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const core = nodes.find((node) => node.type === 'core');
      const dimensions = core ? getNodeDimensions(core) : { width: 480, height: 320 };
      const nextZoom = getDefaultZoom();
      const coreX = core?.x ?? 1000;
      const coreY = core?.y ?? 1000;
      setPanOffset({
        x: rect.width / 2 - (coreX + dimensions.width / 2) * nextZoom,
        y: rect.height / 2 - (coreY + dimensions.height / 2) * nextZoom,
      });
      setZoom(nextZoom);
    }
  };

  // Roda do mouse e trackpad deslocam a mesa sem alterar a arquitetura de pan/zoom.
  // Shift + roda faz deslocamento horizontal; trackpads usam deltaX naturalmente.
  const handleCanvasWheel = (e: React.WheelEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.thought-card') || target.closest('.canvas-control')) return;
    if (e.ctrlKey || e.metaKey) return;

    e.preventDefault();
    const horizontalDelta = e.deltaX || (e.shiftKey ? e.deltaY : 0);
    const verticalDelta = e.shiftKey ? 0 : e.deltaY;
    setPanOffset((current) => ({
      x: current.x - horizontalDelta,
      y: current.y - verticalDelta,
    }));
  };

  // Setas do teclado funcionam como navegação da viewport quando o fundo do canvas está em foco.
  const handleCanvasKeyDown = (e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.matches('input, textarea, select, [contenteditable="true"]')) return;

    const step = e.shiftKey ? 140 : 60;
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = step;
    else if (e.key === 'ArrowRight') dx = -step;
    else if (e.key === 'ArrowUp') dy = step;
    else if (e.key === 'ArrowDown') dy = -step;
    else return;

    e.preventDefault();
    setPanOffset((current) => ({ x: current.x + dx, y: current.y + dy }));
  };

  // Pinça em telas touch: dois dedos aproximam/afastam o canvas mantendo
  // o ponto central do gesto sob os dedos. O gesto também pode deslocar a mesa.
  const handleTouchPointerDownCapture = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (touchPointersRef.current.size === 2 && containerRef.current) {
      const [first, second] = [...touchPointersRef.current.values()];
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = (first.x + second.x) / 2 - rect.left;
      const centerY = (first.y + second.y) / 2 - rect.top;
      const currentZoom = zoomRef.current;
      const currentPan = panOffsetRef.current;

      pinchStateRef.current = {
        startDistance: distance,
        startZoom: currentZoom,
        anchorCanvasX: (centerX - currentPan.x) / currentZoom,
        anchorCanvasY: (centerY - currentPan.y) / currentZoom,
      };
      pinchActiveRef.current = true;
    }
  };

  const handleTouchPointerMoveCapture = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch' || !touchPointersRef.current.has(e.pointerId)) return;
    touchPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pinch = pinchStateRef.current;
    if (!pinch || touchPointersRef.current.size < 2 || !containerRef.current) return;

    e.preventDefault();
    const [first, second] = [...touchPointersRef.current.values()];
    const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
    const nextZoom = Math.min(Math.max(pinch.startZoom * (distance / pinch.startDistance), MIN_ZOOM), MAX_ZOOM);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = (first.x + second.x) / 2 - rect.left;
    const centerY = (first.y + second.y) / 2 - rect.top;
    const nextPan = {
      x: centerX - pinch.anchorCanvasX * nextZoom,
      y: centerY - pinch.anchorCanvasY * nextZoom,
    };

    zoomRef.current = nextZoom;
    panOffsetRef.current = nextPan;
    setZoom(nextZoom);
    setPanOffset(nextPan);
  };

  const handleTouchPointerEndCapture = (e: React.PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    touchPointersRef.current.delete(e.pointerId);
    if (touchPointersRef.current.size < 2) pinchStateRef.current = null;
    // Mantém o arraste de um dedo suspenso até todos os dedos do gesto saírem,
    // evitando um salto brusco ao terminar a pinça com um dedo ainda na tela.
    if (touchPointersRef.current.size === 0) pinchActiveRef.current = false;
  };

  // Pan unificado do canvas com mouse, caneta ou um dedo no celular.
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.thought-card') || target.closest('.canvas-control')) return;
    if (e.pointerType === 'touch' && pinchActiveRef.current) return;
    e.preventDefault();

    const pointerId = e.pointerId;
    const viewport = e.currentTarget as HTMLElement;
    viewport.focus({ preventScroll: true });
    viewport.setPointerCapture?.(pointerId);
    const startX = e.clientX - panOffset.x;
    const startY = e.clientY - panOffset.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (moveEvent.pointerType === 'touch' && pinchActiveRef.current) return;
      moveEvent.preventDefault();
      setPanOffset({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY,
      });
    };

    const finish = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      viewport.releasePointerCapture?.(pointerId);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  // Handle double click to spawn notes
  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.thought-card') || target.closest('.canvas-control')) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - panOffset.x;
    const clickY = e.clientY - rect.top - panOffset.y;

    const canvasX = clickX / zoom;
    const canvasY = clickY / zoom;

    onAddCustomThought(canvasX, canvasY);
  };

  // Arraste unificado para mouse, caneta e toque. O cabeçalho inteiro funciona
  // como uma alça grande, facilitando o uso no celular.
  const handleNodePointerDown = (e: React.PointerEvent, id: string) => {
    if (!canEditCanvas) return;
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input, textarea, select, .resize-handle')) return;
    e.stopPropagation();
    e.preventDefault();

    const node = nodes.find((item) => item.id === id);
    if (!node) return;

    const pointerId = e.pointerId;
    const handle = e.currentTarget as HTMLElement;
    handle.setPointerCapture?.(pointerId);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = node.x;
    const initialY = node.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      if (moveEvent.pointerType === 'touch' && pinchActiveRef.current) return;
      const dx = (moveEvent.clientX - startX) / zoomRef.current;
      const dy = (moveEvent.clientY - startY) / zoom;
      onUpdateNodeCoords(id, initialX + dx, initialY + dy);
    };

    const finish = (upEvent: PointerEvent) => {
      if (upEvent.pointerId !== pointerId) return;
      handle.releasePointerCapture?.(pointerId);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', finish);
      document.removeEventListener('pointercancel', finish);
    };

    document.addEventListener('pointermove', handlePointerMove, { passive: false });
    document.addEventListener('pointerup', finish);
    document.addEventListener('pointercancel', finish);
  };

  const handleSaveAnswer = (nodeId: string) => {
    const text = answerTexts[nodeId];
    if (!text?.trim()) return;

    onUpdateNodeContent(nodeId, text, true);
    setEditingNodeId(null);
  };

  // Find coordinates of target node for connections
  const findNodeCoords = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return null;
    return { x: node.x, y: node.y };
  };

  return (
    <div 
      id="canvas-viewport"
      ref={containerRef}
      onPointerDownCapture={handleTouchPointerDownCapture}
      onPointerMoveCapture={handleTouchPointerMoveCapture}
      onPointerUpCapture={handleTouchPointerEndCapture}
      onPointerCancelCapture={handleTouchPointerEndCapture}
      onPointerDown={handleCanvasPointerDown}
      onDoubleClick={handleDoubleClick}
      onWheel={handleCanvasWheel}
      onKeyDown={handleCanvasKeyDown}
      tabIndex={0}
      aria-label="Canvas de projeto. Arraste o fundo, use pinça com dois dedos para aproximar ou afastar, roda ou trackpad e as setas do teclado para navegar."
      style={{ touchAction: 'none' }}
      className="relative flex-1 h-full overflow-hidden bg-[#FDFDFB] select-none cursor-grab active:cursor-grabbing outline-none"
    >
      {/* Absolute floating guide */}
      <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-md border border-[#E0E0DE] rounded-full px-4 py-1.5 text-xs font-mono text-neutral-600 hidden sm:flex items-center gap-2 pointer-events-none shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
        <span>Mesa de Projeto: {project.name}</span>
        <span className="text-gray-300">|</span>
        <span>Fase: {activePhase}</span>
      </div>

      {/* Grid Canvas Wrapper with Pan/Zoom transforms */}
      <div 
        className="absolute inset-0 bg-dot-grid canvas-grid"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '5000px',
          height: '5000px'
        }}
      >
        {/* Connection paths layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 1 }}>
          <defs>
            <marker id="arrow-active" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#1A1A1A" />
            </marker>
            <marker id="arrow-muted" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#CFCFCD" />
            </marker>
            <marker id="arrow-drag" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto" markerUnits="strokeWidth">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#111111" />
            </marker>
          </defs>
          {nodes.map((node) => node.connections.map((targetId) => {
            const target = nodes.find((item) => item.id === targetId);
            if (!target) return null;
            const geometry = getConnectionGeometry(node, target);
            const isActiveLink = node.phase === activePhase || target.phase === activePhase;
            const isSelectedLink = selectedConnection?.sourceId === node.id && selectedConnection?.targetId === targetId;

            return (
              <g key={`${node.id}-${targetId}`}>
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={isSelectedLink ? 'rgba(0, 0, 0, 0.14)' : isActiveLink ? 'rgba(0, 0, 0, 0.08)' : 'rgba(0, 0, 0, 0.025)'}
                  strokeWidth={isSelectedLink ? '8' : isActiveLink ? '5' : '3'}
                  className="transition-all duration-200"
                />
                <path
                  d={geometry.path}
                  fill="none"
                  stroke={isSelectedLink ? '#000000' : isActiveLink ? '#1A1A1A' : '#CFCFCD'}
                  strokeWidth={isSelectedLink ? '2.4' : '1.5'}
                  strokeDasharray={node.type === 'user-thought' ? '3 3' : undefined}
                  markerEnd={isSelectedLink || isActiveLink ? 'url(#arrow-active)' : 'url(#arrow-muted)'}
                  className="transition-all duration-200"
                />
                <path
                  d={geometry.path}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="28"
                  style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                  onPointerDown={(event) => {
                    event.stopPropagation();
                    setSelectedConnection({ sourceId: node.id, targetId });
                    setSelectedNodeId(null);
                  }}
                  aria-label="Selecionar conexão"
                />
              </g>
            );
          }))}
          {connectionDrag && (
            <path
              d={`M ${connectionDrag.fixedX} ${connectionDrag.fixedY} L ${connectionDrag.currentX} ${connectionDrag.currentY}`}
              fill="none"
              stroke="#111111"
              strokeWidth="2"
              strokeDasharray="8 6"
              markerEnd="url(#arrow-drag)"
            />
          )}
        </svg>

        {selectedConnection && (() => {
          const source = nodes.find((item) => item.id === selectedConnection.sourceId);
          const target = nodes.find((item) => item.id === selectedConnection.targetId);
          if (!source || !target || !source.connections.includes(target.id)) return null;
          const geometry = getConnectionGeometry(source, target);
          return (
            <>
              <div
                className="absolute z-[6] pointer-events-auto canvas-control -translate-x-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 rounded-xl border border-black bg-white/95 p-1 shadow-xl"
                style={{ left: geometry.midpoint.x, top: geometry.midpoint.y }}
              >
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); reverseDirectedConnection(source.id, target.id); }}
                  className="h-9 px-2.5 rounded-lg hover:bg-black/5 text-[10px] font-mono font-semibold cursor-pointer"
                  title="Inverter direção da seta"
                >
                  INVERTER
                </button>
                <button
                  type="button"
                  onClick={(event) => { event.stopPropagation(); removeDirectedConnection(source.id, target.id); }}
                  className="h-9 w-9 rounded-lg hover:bg-red-50 text-red-600 flex items-center justify-center cursor-pointer"
                  title="Excluir seta"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <button
                type="button"
                className="absolute z-[6] pointer-events-auto canvas-control h-14 w-14 sm:h-8 sm:w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-lg touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
                style={{ left: geometry.x1, top: geometry.y1 }}
                onPointerDown={(event) => beginConnectionDrag(event, 'relink-source', source.id, target.id)}
                title="Arraste para mudar a origem da seta"
                aria-label="Mudar origem da seta"
              >
                <span className="sm:hidden text-[10px] font-mono font-bold pointer-events-none">O</span>
              </button>
              <button
                type="button"
                className="absolute z-[6] pointer-events-auto canvas-control h-14 w-14 sm:h-8 sm:w-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-lg touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
                style={{ left: geometry.x2, top: geometry.y2 }}
                onPointerDown={(event) => beginConnectionDrag(event, 'relink-target', source.id, target.id)}
                title="Arraste para mudar o destino da seta"
                aria-label="Mudar destino da seta"
              >
                <span className="sm:hidden text-[10px] font-mono font-bold pointer-events-none">D</span>
              </button>
            </>
          );
        })()}

        {/* Nodes Layer */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          {nodes.map((node) => {
            const isCore = node.type === 'core';
            const isQuestion = node.type === 'question';
            const isUserThought = node.type === 'user-thought';
            const isCanvasImage = node.type === 'canvas-image';
            const isDrawingSheet = node.type === 'drawing-sheet';
            const isTextSystem = node.type === 'text-system';
            const isInteractiveLab = node.type === 'interactive-lab';
            const isWireframeBoard = node.type === 'wireframe-board';
            const isDesignSystem = node.type === 'design-system';
            const isVisualIdentity = node.type === 'visual-identity';
            const isVideoBoard = node.type === 'video-board';
            const isUXWriting = node.type === 'ux-writing';
            const isSoundBoard = node.type === 'sound-board';
            const isHardwareBoard = node.type === 'hardware-board';
            const isSpriteCharacter = node.type === 'sprite-character';
            const isGameDesign = node.type === 'game-design';
            const isApiConnections = node.type === 'api-connections';
            const isDataStory = node.type === 'data-story';
            const isGraphicSystem = node.type === 'graphic-system';
            const isSelected = selectedNodeId === node.id;
            const isActive = node.phase === activePhase;
            const phasePalette = PHASE_NOTE_PALETTE[node.phase];
            const dimensions = getNodeDimensions(node);
            const isConnectionSource = connectingFromId === node.id;
            const isConnectionTarget = Boolean(connectingFromId && connectingFromId !== node.id);
            const isDragDropTarget = Boolean(connectionDrag && connectionHoverNodeId === node.id);

            if (isCanvasImage) {
              return (
                <motion.div
                  key={node.id}
                  data-node-id={node.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute thought-card canvas-image-node pointer-events-auto rounded-xl bg-white shadow-md select-none ${
                    isDragDropTarget ? 'ring-4 ring-blue-500/70' : isConnectionSource ? 'ring-4 ring-black/20' : isSelected ? 'ring-2 ring-black' : 'ring-1 ring-black/10'
                  }`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: dimensions.width,
                    height: dimensions.height,
                    touchAction: 'none',
                  }}
                  onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isConnectionTarget) {
                      toggleConnection(node.id);
                      return;
                    }
                    setSelectedNodeId(node.id);
                    setSelectedConnection(null);
                  }}
                >
                  {node.imageUrl ? (
                    <img
                      src={node.imageUrl}
                      alt={node.imageName || node.title || 'Imagem no canvas'}
                      draggable={false}
                      className="h-full w-full rounded-xl object-contain bg-white pointer-events-none"
                    />
                  ) : (
                    <div className="h-full w-full rounded-xl bg-[#F5F5F3] flex items-center justify-center text-xs text-neutral-400">Imagem indisponível</div>
                  )}

                  {isConnectionTarget && (
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); toggleConnection(node.id); }}
                      className="absolute inset-0 z-20 rounded-xl border-2 border-dashed border-black bg-white/20 cursor-crosshair"
                      aria-label={`Conectar com ${node.imageName || 'imagem'}`}
                    />
                  )}

                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && (
                    <div className="absolute -top-11 right-0 z-30 flex items-center gap-1 rounded-xl border border-[#E0E0DE] bg-white/95 p-1 shadow-lg canvas-control">
                      <button type="button" aria-label="Editar imagem" title="Editar imagem: camadas, recorte, máscaras, texto e filtros" onClick={event=>{event.stopPropagation();setPhotoEditor({url:node.imageUrl,name:node.imageName || 'imagem',nodeId:node.id});}} className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-black/5"><Pencil size={14}/></button>
                      {node.imageCredit && <a href={node.imageCredit.sourceUrl} target="_blank" rel="noreferrer" title={`${node.imageCredit.author} · ${node.imageCredit.license}`} aria-label="Créditos e licença da imagem" className="h-8 w-8 rounded-lg flex items-center justify-center" onClick={event=>event.stopPropagation()}><BookOpen size={14}/></a>}
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setConnectingFromId(isConnectionSource ? null : node.id);
                        }}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer ${isConnectionSource ? 'bg-black text-white' : 'hover:bg-black/5 text-neutral-700'}`}
                        title={isConnectionSource ? 'Cancelar conexão' : 'Criar conexão a partir desta imagem'}
                      >
                        {isConnectionSource ? <X size={14} /> : <Link2 size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); onDeleteNode(node.id); }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Remover imagem do canvas"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && (
                    <button
                      type="button"
                      className="absolute -left-4 top-1/2 z-40 h-8 w-8 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-lg flex items-center justify-center touch-none cursor-crosshair canvas-control"
                      onPointerDown={(event) => beginConnectionDrag(event, 'new', node.id)}
                      title="Arraste para outro card ou imagem para criar uma seta"
                      aria-label="Arrastar nova conexão"
                    >
                      <Link2 size={13} />
                    </button>
                  )}

                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && (
                    <>
                      <div
                        className="resize-handle absolute right-[-7px] top-1/2 z-30 h-11 w-4 -translate-y-1/2 rounded-full border border-black/20 bg-white shadow cursor-ew-resize"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'x', true)}
                        title="Redimensionar proporcionalmente"
                      />
                      <div
                        className="resize-handle absolute bottom-[-7px] left-1/2 z-30 h-4 w-11 -translate-x-1/2 rounded-full border border-black/20 bg-white shadow cursor-ns-resize"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'y', true)}
                        title="Redimensionar proporcionalmente"
                      />
                      <div
                        className="resize-handle absolute bottom-[-7px] right-[-7px] z-30 h-6 w-6 rounded-full border border-black/30 bg-white shadow cursor-nwse-resize flex items-center justify-center"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'both', true)}
                        title="Redimensionar proporcionalmente"
                      >
                        <MoveDiagonal2 size={9} />
                      </div>
                    </>
                  )}
                </motion.div>
              );
            }

            if (isTextSystem) {
              const textDocument = node.textStudio || blankTextStudio(projectDesignSystem);
              return (
                <motion.div key={node.id} data-node-id={node.id} initial={{opacity:0,scale:.96}} animate={{opacity:1,scale:1}}
                  className={`absolute thought-card pointer-events-auto rounded-xl bg-white shadow-lg select-none overflow-visible ${isSelected?'ring-2 ring-black':'ring-1 ring-black/10'}`}
                  style={{left:node.x,top:node.y,width:dimensions.width,height:dimensions.height,touchAction:'none'}}
                  onPointerDown={(event)=>handleNodePointerDown(event,node.id)} onClick={(event)=>{event.stopPropagation();setSelectedNodeId(node.id);setSelectedConnection(null);}}>
                  <div className="absolute inset-0 rounded-xl overflow-hidden"><TextStudioPreview document={textDocument}/></div>
                  <div className="absolute left-2 top-2 z-20 rounded-lg bg-white/90 border border-black/10 px-2 py-1 text-[9px] font-mono font-bold uppercase">TEXTOS · {textDocument.mode}</div>
                  {isSelected && canEditCanvas && <div className="absolute -top-11 right-0 z-40 flex gap-1 rounded-xl border bg-white p-1 shadow-lg canvas-control"><button className="h-8 px-2 rounded-lg hover:bg-black/5 text-[9px] font-mono font-bold" onClick={(e)=>{e.stopPropagation();setTextEditorNodeId(node.id)}}>EDITAR</button><button className="h-8 w-8 rounded-lg text-red-600 hover:bg-red-50 flex items-center justify-center" onClick={(e)=>{e.stopPropagation();onDeleteNode(node.id)}}><Trash2 size={14}/></button></div>}
                </motion.div>
              );
            }

            if (isInteractiveLab) {
              const interactiveDocument = node.interactive || blankInteractiveDocument('p5');
              const isLive = activeInteractiveNodeId === node.id;
              return (
                <motion.div
                  key={node.id}
                  data-node-id={node.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute thought-card pointer-events-auto rounded-xl bg-white shadow-lg select-none overflow-visible ${
                    isDragDropTarget ? 'ring-4 ring-blue-500/70' : isConnectionSource ? 'ring-4 ring-black/20' : isSelected ? 'ring-2 ring-black' : 'ring-1 ring-black/10'
                  }`}
                  style={{
                    left: node.x,
                    top: node.y,
                    width: dimensions.width,
                    height: dimensions.height,
                    touchAction: isLive ? 'auto' : 'none',
                  }}
                  onPointerDown={(event) => { if (!isLive) handleNodePointerDown(event, node.id); }}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isConnectionTarget) {
                      toggleConnection(node.id);
                      return;
                    }
                    if (!isLive) {
                      setSelectedNodeId(node.id);
                      setSelectedConnection(null);
                    }
                  }}
                >
                  <div className="absolute inset-0 rounded-xl overflow-hidden bg-[#F8F7F3]">
                    <InteractivePreview document={interactiveDocument} className="w-full h-full" interactive={isLive} />
                  </div>

                  <div className="absolute left-2 top-2 z-20 flex items-center gap-1.5 rounded-lg border border-black/10 bg-white/90 px-2 py-1 shadow-sm pointer-events-none">
                    <Code2 size={11} />
                    <span className="text-[9px] font-mono font-bold uppercase tracking-wide">{interactiveDocument.engine === 'three' ? 'THREE.JS' : 'P5.JS'}</span>
                  </div>

                  {isConnectionTarget && (
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); toggleConnection(node.id); }}
                      className="absolute inset-0 z-30 rounded-xl border-2 border-dashed border-black bg-white/20 cursor-crosshair"
                      aria-label={`Conectar com ${node.interactiveName || 'interação'}`}
                    />
                  )}

                  {(isSelected || isConnectionSource || isLive) && canEditCanvas && !isConnectionTarget && (
                    <div className="absolute -top-11 right-0 z-40 flex items-center gap-1 rounded-xl border border-[#E0E0DE] bg-white/95 p-1 shadow-lg canvas-control">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setActiveInteractiveNodeId(isLive ? null : node.id);
                          setSelectedNodeId(node.id);
                        }}
                        className={`h-8 px-2 rounded-lg flex items-center gap-1 text-[9px] font-mono font-bold cursor-pointer ${isLive ? 'bg-black text-white' : 'hover:bg-black/5 text-neutral-700'}`}
                        title={isLive ? 'Sair do modo de interação' : 'Interagir em tempo real'}
                      >
                        {isLive ? <Pause size={13} /> : <Play size={13} />}
                        {isLive ? 'SAIR' : 'INTERAGIR'}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setActiveInteractiveNodeId(null); setInteractiveEditorNodeId(node.id); }}
                        className="h-8 px-2 rounded-lg hover:bg-black/5 text-[9px] font-mono font-bold flex items-center gap-1 cursor-pointer"
                        title="Editar prompt e código"
                      >
                        <Code2 size={13} /> EDITAR
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setConnectingFromId(isConnectionSource ? null : node.id); }}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer ${isConnectionSource ? 'bg-black text-white' : 'hover:bg-black/5 text-neutral-700'}`}
                        title="Criar conexão a partir desta interação"
                      >
                        {isConnectionSource ? <X size={14} /> : <Link2 size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setActiveInteractiveNodeId(null); onDeleteNode(node.id); }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Remover interação do canvas"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && !isLive && (
                    <>
                      <button
                        type="button"
                        className="absolute -left-4 top-1/2 z-40 h-8 w-8 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-lg flex items-center justify-center touch-none cursor-crosshair canvas-control"
                        onPointerDown={(event) => beginConnectionDrag(event, 'new', node.id)}
                        title="Arraste para criar uma seta"
                        aria-label="Arrastar nova conexão"
                      >
                        <Link2 size={13} />
                      </button>
                      <div
                        className="resize-handle absolute right-[-7px] top-1/2 z-30 h-11 w-4 -translate-y-1/2 rounded-full border border-black/20 bg-white shadow cursor-ew-resize"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'x', true)}
                        title="Redimensionar proporcionalmente"
                      />
                      <div
                        className="resize-handle absolute bottom-[-7px] left-1/2 z-30 h-4 w-11 -translate-x-1/2 rounded-full border border-black/20 bg-white shadow cursor-ns-resize"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'y', true)}
                        title="Redimensionar proporcionalmente"
                      />
                      <div
                        className="resize-handle absolute bottom-[-7px] right-[-7px] z-30 h-6 w-6 rounded-full border border-black/30 bg-white shadow cursor-nwse-resize flex items-center justify-center"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'both', true)}
                        title="Redimensionar proporcionalmente"
                      >
                        <MoveDiagonal2 size={9} />
                      </div>
                    </>
                  )}
                </motion.div>
              );
            }

            if (isDrawingSheet) {
              const drawing = node.drawing || blankDrawing();
              return (
                <motion.div
                  key={node.id}
                  data-node-id={node.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute thought-card pointer-events-auto rounded-xl bg-white shadow-lg select-none overflow-visible ${
                    isDragDropTarget ? 'ring-4 ring-blue-500/70' : isConnectionSource ? 'ring-4 ring-black/20' : isSelected ? 'ring-2 ring-black' : 'ring-1 ring-black/10'
                  }`}
                  style={{ left: node.x, top: node.y, width: dimensions.width, height: dimensions.height, touchAction: 'none' }}
                  onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isConnectionTarget) {
                      toggleConnection(node.id);
                      return;
                    }
                    setSelectedNodeId(node.id);
                    setSelectedConnection(null);
                  }}
                  onDoubleClick={(event) => {
                    event.stopPropagation();
                    setDrawingEditorNodeId(node.id);
                  }}
                >
                  <DrawingPreview drawing={drawing} className="h-full w-full rounded-xl bg-white pointer-events-none" />
                  <div className="absolute left-2 bottom-2 rounded-lg bg-black/75 text-white px-2 py-1 text-[9px] font-mono pointer-events-none">
                    {node.drawingName || node.title || 'Folha de desenho'}
                  </div>

                  {isConnectionTarget && (
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); toggleConnection(node.id); }}
                      className="absolute inset-0 z-20 rounded-xl border-2 border-dashed border-black bg-white/20 cursor-crosshair"
                      aria-label={`Conectar com ${node.drawingName || 'desenho'}`}
                    />
                  )}

                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && (
                    <div className="absolute -top-11 right-0 z-30 flex items-center gap-1 rounded-xl border border-[#E0E0DE] bg-white/95 p-1 shadow-lg canvas-control">
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setDrawingEditorNodeId(node.id); }}
                        className="h-8 px-2 rounded-lg flex items-center gap-1 hover:bg-black/5 text-[10px] font-mono cursor-pointer"
                        title="Abrir folha de desenho"
                      >
                        <Pencil size={13} /> EDITAR
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); setConnectingFromId(isConnectionSource ? null : node.id); }}
                        className={`h-8 w-8 rounded-lg flex items-center justify-center cursor-pointer ${isConnectionSource ? 'bg-black text-white' : 'hover:bg-black/5 text-neutral-700'}`}
                        title={isConnectionSource ? 'Cancelar conexão' : 'Relacionar esta folha com vários itens'}
                      >
                        {isConnectionSource ? <X size={14} /> : <Link2 size={14} />}
                      </button>
                      <button
                        type="button"
                        onClick={(event) => { event.stopPropagation(); onDeleteNode(node.id); }}
                        className="h-8 w-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50 cursor-pointer"
                        title="Remover folha de desenho"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && (
                    <>
                      <button
                        type="button"
                        className="absolute -left-4 top-1/2 z-40 h-8 w-8 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-lg flex items-center justify-center touch-none cursor-crosshair canvas-control"
                        onPointerDown={(event) => beginConnectionDrag(event, 'new', node.id)}
                        title="Arraste para criar uma seta"
                        aria-label="Arrastar nova conexão"
                      >
                        <Link2 size={13} />
                      </button>
                      <div
                        className="resize-handle absolute right-[-7px] top-1/2 z-30 h-11 w-4 -translate-y-1/2 rounded-full border border-black/20 bg-white shadow cursor-ew-resize"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'x', true)}
                        title="Redimensionar proporcionalmente"
                      />
                      <div
                        className="resize-handle absolute bottom-[-7px] left-1/2 z-30 h-4 w-11 -translate-x-1/2 rounded-full border border-black/20 bg-white shadow cursor-ns-resize"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'y', true)}
                        title="Redimensionar proporcionalmente"
                      />
                      <div
                        className="resize-handle absolute bottom-[-7px] right-[-7px] z-30 h-6 w-6 rounded-full border border-black/30 bg-white shadow cursor-nwse-resize flex items-center justify-center"
                        onPointerDown={(event) => handleResizePointerDown(event, node, 'both', true)}
                        title="Redimensionar proporcionalmente"
                      >
                        <MoveDiagonal2 size={9} />
                      </div>
                    </>
                  )}
                </motion.div>
              );
            }


            if (isWireframeBoard || isDesignSystem || isVisualIdentity || isVideoBoard || isUXWriting || isSoundBoard || isHardwareBoard || isSpriteCharacter || isGameDesign || isApiConnections || isDataStory || isGraphicSystem) {
              const label = isWireframeBoard ? (node.wireframeName || 'Wireframes')
                : isDesignSystem ? (node.designSystemName || 'Design System')
                : isVisualIdentity ? (node.visualIdentityName || 'Identidade visual')
                : isVideoBoard ? (node.videoName || 'Vídeo')
                : isUXWriting ? (node.uxWritingName || 'UX Writing')
                : isSoundBoard ? (node.soundName || 'Sonoridade')
                : isHardwareBoard ? (node.hardwareName || 'Hardware')
                : isSpriteCharacter ? (node.spriteName || 'Personagem')
                : isGameDesign ? (node.gameDesignName || 'Game Design')
                : isApiConnections ? (node.apiConnectionsName || 'APIs & Conexões')
                : isDataStory ? (node.dataStoryName || 'Infodesign & Dados')
                : (node.graphicSystemName || 'Grafismos');
              const edit = () => {
                if (isWireframeBoard) setWireframeEditorNodeId(node.id);
                else if (isDesignSystem) setDesignSystemEditorNodeId(node.id);
                else if (isVisualIdentity) setVisualIdentityEditorNodeId(node.id);
                else if (isVideoBoard) setVideoEditorNodeId(node.id);
                else if (isUXWriting) setUXWritingEditorNodeId(node.id);
                else if (isSoundBoard) setSoundEditorNodeId(node.id);
                else if (isHardwareBoard) setHardwareEditorNodeId(node.id);
                else if (isSpriteCharacter) setSpriteEditorNodeId(node.id);
                else if (isGameDesign) setGameEditorNodeId(node.id);
                else if (isApiConnections) setApiEditorNodeId(node.id);
                else if (isDataStory) setDataStoryEditorNodeId(node.id);
                else setGraphicEditorNodeId(node.id);
              };
              return (
                <motion.div
                  key={node.id}
                  data-node-id={node.id}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`absolute thought-card pointer-events-auto rounded-xl bg-white shadow-lg select-none overflow-visible ${
                    isDragDropTarget ? 'ring-4 ring-blue-500/70' : isConnectionSource ? 'ring-4 ring-black/20' : isSelected ? 'ring-2 ring-black' : 'ring-1 ring-black/10'
                  }`}
                  style={{ left: node.x, top: node.y, width: dimensions.width, height: dimensions.height, touchAction: 'none' }}
                  onPointerDown={(event) => handleNodePointerDown(event, node.id)}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (isConnectionTarget) { toggleConnection(node.id); return; }
                    setSelectedNodeId(node.id); setSelectedConnection(null);
                  }}
                  onDoubleClick={(event) => { event.stopPropagation(); edit(); }}
                >
                  <div className="h-full w-full rounded-xl overflow-hidden bg-white pointer-events-none">
                    {isWireframeBoard && node.wireframe && <WireframePreview document={node.wireframe} designSystem={projectDesignSystem} className="h-full w-full" />}
                    {isDesignSystem && node.designSystem && <DesignSystemPreview document={node.designSystem} className="h-full w-full" />}
                    {isVisualIdentity && node.visualIdentity && <VisualIdentityPreview document={node.visualIdentity} className="h-full w-full" />}
                    {isVideoBoard && node.video && <VideoPreview document={node.video} className="h-full w-full" />}
                    {isUXWriting && node.uxWriting && <UXWritingPreview document={node.uxWriting} className="h-full w-full" />}
                    {isSoundBoard && node.sound && <SoundPreview document={node.sound} className="h-full w-full" />}
                    {isHardwareBoard && node.hardware && <HardwarePreview document={node.hardware} className="h-full w-full" />}
                    {isSpriteCharacter && node.sprite && <SpriteCharacterPreview document={node.sprite} className="h-full w-full" />}
                    {isGameDesign && node.gameDesign && <GameDesignPreview document={node.gameDesign} className="h-full w-full" />}
                    {isApiConnections && node.apiConnections && <ApiConnectionsPreview document={node.apiConnections} className="h-full w-full" />}
                    {isDataStory && node.dataStory && <DataStoryPreview document={node.dataStory} className="h-full w-full" />}
                    {isGraphicSystem && node.graphicSystem && <GraphicsPreview document={node.graphicSystem} />}
                  </div>
                  <div className="absolute left-2 bottom-2 rounded-lg bg-black/75 text-white px-2 py-1 text-[9px] font-mono pointer-events-none">{label}</div>
                  {isConnectionTarget && <button type="button" onClick={(event)=>{event.stopPropagation();toggleConnection(node.id)}} className="absolute inset-0 z-20 rounded-xl border-2 border-dashed border-black bg-white/20 cursor-crosshair" aria-label={`Conectar com ${label}`} />}
                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && <div className="absolute -top-11 right-0 z-30 flex items-center gap-1 rounded-xl border border-[#E0E0DE] bg-white/95 p-1 shadow-lg canvas-control">
                    <button type="button" onClick={(event)=>{event.stopPropagation();edit()}} className="h-8 px-2 rounded-lg flex items-center gap-1 hover:bg-black/5 text-[10px] font-mono"><Pencil size={13}/> EDITAR</button>
                    <button type="button" onClick={(event)=>{event.stopPropagation();setConnectingFromId(isConnectionSource?null:node.id)}} className={`h-8 w-8 rounded-lg flex items-center justify-center ${isConnectionSource?'bg-black text-white':'hover:bg-black/5'}`}>{isConnectionSource?<X size={14}/>:<Link2 size={14}/>}</button>
                    <button type="button" onClick={(event)=>{event.stopPropagation();onDeleteNode(node.id)}} className="h-8 w-8 rounded-lg flex items-center justify-center text-red-600 hover:bg-red-50"><Trash2 size={14}/></button>
                  </div>}
                  {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && <>
                    <button type="button" className="absolute -left-4 top-1/2 z-40 h-8 w-8 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-lg flex items-center justify-center touch-none canvas-control" onPointerDown={(event)=>beginConnectionDrag(event,'new',node.id)}><Link2 size={13}/></button>
                    <div className="resize-handle absolute right-[-7px] top-1/2 z-30 h-11 w-4 -translate-y-1/2 rounded-full border border-black/20 bg-white shadow cursor-ew-resize" onPointerDown={(event)=>handleResizePointerDown(event,node,'x',false)} />
                    <div className="resize-handle absolute bottom-[-7px] left-1/2 z-30 h-4 w-11 -translate-x-1/2 rounded-full border border-black/20 bg-white shadow cursor-ns-resize" onPointerDown={(event)=>handleResizePointerDown(event,node,'y',false)} />
                    <div className="resize-handle absolute bottom-[-7px] right-[-7px] z-30 h-6 w-6 rounded-full border border-black/30 bg-white shadow cursor-nwse-resize flex items-center justify-center" onPointerDown={(event)=>handleResizePointerDown(event,node,'both',false)}><MoveDiagonal2 size={9}/></div>
                  </>}
                </motion.div>
              );
            }

            return (
              <motion.div
                key={node.id}
                data-node-id={node.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  borderColor: isDragDropTarget || isConnectionSource || isSelected 
                    ? '#1A1A1A' 
                    : phasePalette.border,
                  boxShadow: isDragDropTarget
                    ? '0 0 0 5px rgba(59, 130, 246, 0.35), 0 12px 30px -5px rgba(0, 0, 0, 0.15)'
                    : isConnectionSource || isSelected 
                    ? '0 12px 30px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' 
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)'
                }}
                className="absolute thought-card pointer-events-auto rounded-2xl border text-neutral-800 overflow-hidden transition-all duration-200 cursor-default"
                style={{
                  left: node.x,
                  top: node.y,
                  width: dimensions.width,
                  height: node.height || undefined,
                  minWidth: isCore ? 320 : 240,
                  opacity: isActive ? 1 : 0.65,
                  backgroundColor: isCore ? '#FFFFFF' : phasePalette.body
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isConnectionTarget) {
                    toggleConnection(node.id);
                    return;
                  }
                  setSelectedNodeId(node.id);
                  setSelectedConnection(null);
                }}
              >
                
                {/* Drag Handle Bar */}
                <div 
                  onPointerDown={(e) => handleNodePointerDown(e, node.id)}
                  style={{
                    touchAction: 'none',
                    backgroundColor: isCore ? '#1A1A1A' : phasePalette.header,
                    borderColor: isCore ? '#000000' : phasePalette.border,
                  }}
                  className={`px-4 py-3.5 sm:py-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b select-none ${
                    isCore 
                      ? 'text-white' 
                      : 'text-neutral-700 font-mono text-[10px]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCore ? (
                      <span className="text-[10px] tracking-widest font-mono text-white/65 uppercase font-bold">Âncora Central do Projeto</span>
                    ) : (
                      <>
                        <span
                          className={`w-2 h-2 rounded-full ${isActive ? 'animate-pulse' : 'opacity-55'}`}
                          style={{ backgroundColor: phasePalette.dot }}
                        />
                        <span className="uppercase tracking-wider font-semibold font-mono">{node.phase}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Right side telemetry */}
                  <div className="flex items-center gap-1.5 sm:gap-2.5">
                    <span className="text-[9px] font-mono opacity-50 hidden md:inline">
                      X: {Math.round(node.x)} Y: {Math.round(node.y)}
                    </span>
                    {canEditCanvas && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConnectingFromId(isConnectionSource ? null : node.id);
                        }}
                        className={`h-7 w-7 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${isConnectionSource ? 'bg-black text-white' : 'opacity-60 hover:opacity-100 hover:bg-black/5'}`}
                        title={isConnectionSource ? 'Cancelar conexão' : 'Criar seta a partir deste card'}
                      >
                        {isConnectionSource ? <X size={12} /> : <Link2 size={12} />}
                      </button>
                    )}
                    <button onClick={(e)=>{e.stopPropagation();setCollaborationNodeId(node.id)}} className="opacity-60 hover:opacity-100 transition-colors cursor-pointer flex items-center gap-1" title="Comentários e arquivos"><MessageCircle size={12}/><span className="text-[9px] hidden sm:inline">{node.comments?.length||0}</span><Paperclip size={11}/><span className="text-[9px] hidden sm:inline">{node.attachments?.length||0}</span></button>
                    {!isCore && canEditCanvas && (<button onClick={(e)=>{e.stopPropagation();onDeleteNode(node.id)}} className="opacity-40 hover:opacity-100 hover:text-red-600 transition-colors cursor-pointer" title="Remover card"><Trash2 size={12}/></button>)}
                  </div>
                </div>

                {/* Card Content body */}
                <div className="p-4 sm:p-5 flex flex-col gap-4" style={{ height: node.height ? Math.max(90, node.height - 48) : undefined, overflowY: node.height ? 'auto' : undefined }}>
                  
                  {isCore ? (
                    // Core Node content representation
                    <div className="flex flex-col gap-3">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-neutral-900">{project.name}</h3>
                        <span className="text-xs text-neutral-500 font-mono block mt-1">{project.projectType || 'Tipologia a definir'}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3.5 pt-3 border-t border-[#E0E0DE]">
                        <div>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">Problema a Transformar</span>
                          <p className="text-xs text-neutral-800 mt-1 leading-relaxed font-light">{project.problem || 'A desenvolver durante a Ideação.'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">Comunidade Afetada</span>
                            <span className="text-xs text-neutral-800 font-medium block mt-0.5">{project.community || 'A mapear'}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">ODS Diretora</span>
                            <span className="text-[11px] text-black font-semibold block mt-0.5 line-clamp-2" title={project.ods || 'A definir'}>
                              {project.ods || 'A definir'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  ) : isQuestion ? (
                    // Question node (spawner by a mediator)
                    <div className="flex flex-col gap-4">
                      
                      {/* Mediator Signature */}
                      <div className="mediator-card-signature flex items-center gap-2.5 bg-[#F5F5F3] p-2.5 rounded-2xl border-2 border-[#1A1A1A] shadow-[3px_4px_0_#1A1A1A]">
                        <MediatorSticker
                          mediatorId={node.mediatorId}
                          size={46}
                          state={node.isCompleted ? 'celebrating' : 'idle'}
                          label={`Sticker do mediador ${node.title}`}
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#1A1A1A] leading-none">Aprovado por: {node.title}</span>
                        </div>
                      </div>

                      {/* Main Question Text */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-[#70706E] uppercase tracking-widest">Questionamento Dialético</span>
                        <p className="text-sm font-semibold text-neutral-900 leading-snug">{node.content}</p>
                      </div>

                      {/* Provocations */}
                      {node.provocations && node.provocations.length > 0 && (
                        <div className="flex flex-col gap-1.5 p-3 bg-[#F9F9F8] rounded-xl border border-[#E0E0DE]">
                          <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Compass size={10} /> Direcionadores de Reflexão:
                          </span>
                          <ul className="space-y-1">
                            {node.provocations.map((p, idx) => (
                              <li key={idx} className="text-sm text-neutral-700 flex items-start gap-1.5">
                                <span className="text-black font-bold mt-0.5">•</span>
                                <span className="font-light">{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Scientific Context */}
                      {node.scientificContext && (
                        <div className="text-[12px] text-neutral-700 bg-[#F5F5F3] border border-[#E0E0DE] p-2.5 rounded-xl flex items-start gap-1.5 font-light">
                          <BookOpen size={12} className="shrink-0 text-neutral-500 mt-0.5" />
                          <span>
                            <strong>Enquadramento:</strong> {node.scientificContext}
                          </span>
                        </div>
                      )}

                      {/* Action response section */}
                      <div className="pt-2 border-t border-[#E0E0DE]">
                        {node.isCompleted ? (
                          <div className="bg-[#F5F5F3] border border-[#E0E0DE] rounded-xl p-3 text-xs text-neutral-900">
                            <div className="flex items-center gap-1.5 font-semibold mb-1">
                              <CheckCircle2 size={14} className="text-neutral-800" />
                              <span>Pensamento Integrado</span>
                            </div>
                            <p className="font-light italic mt-1 leading-relaxed text-neutral-600">
                              "{answerTexts[node.id] || "Interação integrada na mesa de projeto."}"
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {editingNodeId === node.id ? (
                              <>
                                <textarea
                                  placeholder="Digite seu pensamento reflexivo aqui..."
                                  rows={4}
                                  value={answerTexts[node.id] || ''}
                                  onChange={(e) => setAnswerTexts({ ...answerTexts, [node.id]: e.target.value })}
                                  className="w-full bg-[#FDFDFB] border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-lg p-2 text-xs outline-none"
                                />
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    onClick={() => setEditingNodeId(null)}
                                    className="px-2.5 py-1 rounded hover:bg-black/5 text-[10px] font-mono uppercase text-gray-500 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleSaveAnswer(node.id)}
                                    disabled={!(answerTexts[node.id]?.trim())}
                                    className="px-3 py-1 rounded bg-black text-white hover:bg-neutral-800 disabled:opacity-50 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                                  >
                                    Registrar
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingNodeId(node.id);
                                  if (!answerTexts[node.id]) {
                                    setAnswerTexts({ ...answerTexts, [node.id]: '' });
                                  }
                                }}
                                className="w-full border border-[#E0E0DE] border-dashed hover:border-black text-neutral-500 hover:text-black rounded-xl py-2 text-xs font-mono font-semibold tracking-wide text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles size={12} />
                                <span>REGISTRAR PENSAMENTO</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                  ) : (
                    // Simple Custom thought or note card (Double click to spawn)
                    <div className="flex h-full min-h-0 flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono text-black font-semibold tracking-wider uppercase">Bloco de Notas</span>
                        <span className="text-[10px] text-gray-400 font-mono">#{node.id.substring(0, 4)}</span>
                      </div>
                      <RichNote defaultFontFamily={projectDesignSystem?.fontFamilies?.notes || projectDesignSystem?.primaryFont} content={node.content} onChange={(value) => onUpdateNodeContent(node.id, value)} disabled={!canEditCanvas} />
                    </div>
                  )}

                </div>

                {isConnectionTarget && (
                  <button
                    type="button"
                    onClick={(event) => { event.stopPropagation(); toggleConnection(node.id); }}
                    className="absolute inset-0 z-30 rounded-2xl border-2 border-dashed border-black bg-white/10 cursor-crosshair"
                    aria-label={`Conectar com ${node.title || 'card'}`}
                    title={nodes.find((item) => item.id === connectingFromId)?.connections.includes(node.id) ? 'Clique para remover esta conexão' : 'Clique para criar a conexão'}
                  />
                )}

                {(isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && (
                  <button
                    type="button"
                    className="absolute left-1 top-1/2 z-40 h-8 w-8 -translate-y-1/2 rounded-full border-2 border-black bg-white shadow-lg flex items-center justify-center touch-none cursor-crosshair canvas-control"
                    onPointerDown={(event) => beginConnectionDrag(event, 'new', node.id)}
                    title="Arraste para outro card, imagem ou desenho para criar uma seta"
                    aria-label="Arrastar nova conexão"
                  >
                    <Link2 size={13} />
                  </button>
                )}

                {!isCore && (isSelected || isConnectionSource) && canEditCanvas && !isConnectionTarget && (
                  <>
                    <div
                      className="resize-handle absolute right-[2px] top-1/2 z-40 h-11 w-4 -translate-y-1/2 rounded-full border border-black/20 bg-white shadow cursor-ew-resize"
                      onPointerDown={(event) => handleResizePointerDown(event, node, 'x')}
                      title="Ajustar largura"
                    />
                    <div
                      className="resize-handle absolute bottom-[2px] left-1/2 z-40 h-4 w-11 -translate-x-1/2 rounded-full border border-black/20 bg-white shadow cursor-ns-resize"
                      onPointerDown={(event) => handleResizePointerDown(event, node, 'y')}
                      title="Ajustar altura"
                    />
                    <div
                      className="resize-handle absolute bottom-[2px] right-[2px] z-40 h-6 w-6 rounded-full border border-black/30 bg-white shadow cursor-nwse-resize flex items-center justify-center"
                      onPointerDown={(event) => handleResizePointerDown(event, node, 'both')}
                      title="Ajustar largura e altura"
                    >
                      <MoveDiagonal2 size={9} />
                    </div>
                  </>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {selectedConnection && (() => {
        const source = nodes.find((item) => item.id === selectedConnection.sourceId);
        const target = nodes.find((item) => item.id === selectedConnection.targetId);
        if (!source || !target || !source.connections.includes(target.id)) return null;
        return (
          <div
            className="sm:hidden absolute top-[max(0.75rem,env(safe-area-inset-top))] left-1/2 z-[70] -translate-x-1/2 canvas-control w-[min(94vw,430px)] rounded-2xl border border-black bg-white/95 p-2 shadow-2xl"
            style={{ touchAction: 'manipulation' }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="px-1 pb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[10px] font-mono font-bold uppercase tracking-wide">Seta selecionada</div>
                <div className="text-[9px] font-mono text-neutral-500 truncate">Arraste O (origem) ou D (destino) para outro card, imagem ou desenho.</div>
              </div>
              <button
                type="button"
                className="h-9 w-9 shrink-0 rounded-xl border border-black/10 flex items-center justify-center"
                onPointerUp={(event) => { event.stopPropagation(); setSelectedConnection(null); }}
                aria-label="Fechar controles da seta"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className="h-12 rounded-xl bg-black text-white text-[11px] font-mono font-bold uppercase tracking-wide active:scale-[0.98]"
                onPointerDown={(event) => { event.stopPropagation(); event.preventDefault(); }}
                onPointerUp={(event) => { event.stopPropagation(); event.preventDefault(); reverseDirectedConnection(source.id, target.id); }}
              >
                Inverter sentido
              </button>
              <button
                type="button"
                className="h-12 rounded-xl border border-red-300 bg-red-50 text-red-700 text-[11px] font-mono font-bold uppercase tracking-wide flex items-center justify-center gap-2 active:scale-[0.98]"
                onPointerDown={(event) => { event.stopPropagation(); event.preventDefault(); }}
                onPointerUp={(event) => { event.stopPropagation(); event.preventDefault(); removeDirectedConnection(source.id, target.id); }}
              >
                <Trash2 size={16} /> Excluir
              </button>
            </div>
          </div>
        );
      })()}

      {connectingFromId && (
        <div className="absolute top-3 left-1/2 z-30 -translate-x-1/2 canvas-control max-w-[calc(100vw-1.5rem)] rounded-2xl border border-black bg-white/95 px-3 py-2 shadow-lg flex items-center gap-2 text-[11px] font-mono">
          <Link2 size={13} className="shrink-0" />
          <span className="truncate">Modo múltiplo: toque em vários cards, imagens ou desenhos para relacioná-los a partir deste item.</span>
          <button
            type="button"
            onClick={() => setConnectingFromId(null)}
            className="shrink-0 rounded-lg p-1 hover:bg-black/5 cursor-pointer"
            aria-label="Cancelar conexão"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Floating Canvas Controls (Zoom / Recenter / Spawn guide) */}
      <div id="canvas-actions-panel" className="fixed bottom-[max(.55rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-30 flex w-[calc(100vw-1rem)] max-w-[1680px] flex-col items-center gap-2 canvas-control pointer-events-none">
        
        {/* Double-click hint */}
        {mobileToolsOpen && <div className="pointer-events-auto bg-white/90 backdrop-blur-md border border-[#E0E0DE] rounded-full px-4 py-2 text-[11px] font-mono text-neutral-500 hidden sm:flex items-center gap-1.5 shadow-sm max-w-[min(100%,980px)]">
          <HelpCircle size={12} className="text-black shrink-0" />
          <span className="truncate">Dica: arraste a alça de conexão entre itens; toque numa seta para inverter ou reposicionar suas pontas</span>
        </div>}

        {canvasImageError && (
          <div className="pointer-events-auto rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 shadow-sm flex items-center justify-between gap-2">
            <span>{canvasImageError}</span>
            <button type="button" onClick={() => setCanvasImageError('')} className="p-1 cursor-pointer" aria-label="Fechar aviso"><X size={12} /></button>
          </div>
        )}

        {/* Collapsible Ateliê dock: same control on mobile and desktop. */}
        <button type="button" onClick={() => setMobileToolsOpen((open) => !open)} className="canvas-tools-toggle pointer-events-auto self-center h-10 min-w-16 rounded-2xl border border-black bg-black text-white px-4 shadow-lg flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors" aria-label={mobileToolsOpen ? 'Recolher barra de ferramentas' : 'Abrir barra de ferramentas'} title={mobileToolsOpen ? 'Recolher ferramentas' : 'Abrir ferramentas'}>{mobileToolsOpen ? <ChevronDown size={20}/> : <ChevronUp size={20}/>}<span className="text-[9px] font-mono font-bold uppercase tracking-[.12em] sm:hidden">{mobileToolsOpen?'Fechar':'Ferramentas'}</span></button>

        {/* Action button bar */}
        <div className={`${mobileToolsOpen ? 'grid' : 'hidden'} canvas-bottom-tools pointer-events-auto w-full bg-white/97 backdrop-blur-md border border-[#E0E0DE] rounded-3xl p-3 shadow-2xl`}>
          <button 
            onClick={() => handleZoom(0.1)} 
            className="canvas-tool-button canvas-tool-button--utility rounded-2xl hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Aumentar zoom"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={() => handleZoom(-0.1)} 
            className="canvas-tool-button canvas-tool-button--utility rounded-2xl hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Diminuir zoom"
          >
            <ZoomOut size={16} />
          </button>
          <div className="canvas-tool-separator w-px h-5 bg-[#E0E0DE] mx-1" />
          <button 
            onClick={handleResetView} 
            className="canvas-tool-button canvas-tool-button--utility rounded-2xl hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Centralizar âncora do projeto"
          >
            <Maximize size={15} />
          </button>
          {canEditCanvas && (
            <>
              <div className="canvas-tool-separator w-px h-5 bg-[#E0E0DE] mx-1" />
              <button type="button" onClick={() => setImageStudioOpen(true)} disabled={uploadingCanvasImage} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black disabled:opacity-50 flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Imagem · upar, buscar Creative Commons, vetorizar, editar com Photopea ou gerar com IA">{uploadingCanvasImage ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}<span>IMAGEM</span></button>
              <button type="button" data-tour="atelier-texts" onClick={() => setNewTextStudio(blankTextStudio(projectDesignSystem))} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Textos · caligrafia, lettering, tipografia e design de tipos"><Languages size={14}/><span className="canvas-tool-label">TEXTOS</span></button>
              <button
                type="button"
                onClick={() => setNewDrawing(blankDrawing())}
                className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Abrir uma folha branca para desenhar"
              >
                <Pencil size={14} />
                <span className="canvas-tool-label">DESENHO</span>
              </button>
              <button
                type="button"
                onClick={() => setNewInteractive(blankInteractiveDocument('p5'))}
                className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Criar uma camada interativa com p5.js ou Three.js por prompt"
              >
                <Code2 size={14} />
                <span className="canvas-tool-label">INTERAÇÃO</span>
              </button>
              <button type="button" onClick={() => { setNewWireframeSource(null); setNewWireframe(blankWireframe(projectDesignSystem)); }} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · criar telas, auto layout e componentes"><PanelsTopLeft size={14}/><span className="canvas-tool-label">WIREFRAME</span></button>
              <button type="button" onClick={() => setNewDesignSystem(blankDesignSystem(projectVisualIdentity))} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · tipografia, paleta, tokens e acessibilidade"><Palette size={14}/><span className="canvas-tool-label">DESIGN SYSTEM</span></button>
              <button type="button" data-tour="atelier-identity" onClick={() => setNewVisualIdentity(blankVisualIdentity(projectDesignSystem))} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · estratégia de marca, logo, cor, tipografia, photobrief e aplicações"><Fingerprint size={14}/><span className="canvas-tool-label">IDENTIDADE</span></button>
              <button type="button" data-tour="atelier-video" onClick={() => setNewVideo(blankVideo(projectDesignSystem))} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · inserir e gerar motion para vídeo e redes"><Film size={14}/><span className="canvas-tool-label">VÍDEO</span></button>
              <button type="button" data-tour="atelier-uxwriting" onClick={() => setNewUXWriting(blankUXWriting())} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · microcopy, linguagem simples, tradução e apoio para Libras"><Languages size={14}/><span className="canvas-tool-label">UX WRITING</span></button>
              <button type="button" data-tour="atelier-sound" onClick={() => setNewSound(blankSound())} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · pequenos efeitos e identidade sonora"><Volume2 size={14}/><span className="canvas-tool-label">SOM</span></button>
              <button type="button" data-tour="atelier-hardware" onClick={() => setNewHardware(blankHardware())} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · giroscópio, sensores e microcontroladores"><Cpu size={14}/><span className="canvas-tool-label">HARDWARE</span></button>
              <button type="button" data-tour="atelier-sprite" onClick={() => setNewSprite(blankSpriteCharacter())} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · personagens, sprites, estados e pequenas animações locais"><User size={14}/><span className="canvas-tool-label">PERSONAGENS</span></button>
              <button type="button" data-tour="atelier-game" onClick={() => setNewGame(blankGameDesign())} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · GDD, fases, sprites, mecânicas e playtest"><Gamepad2 size={14}/><span className="canvas-tool-label">GAME DESIGN</span></button>
              <button type="button" data-tour="atelier-api" onClick={() => setNewApiConnections(blankApiConnections())} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · explorar, incorporar e criar APIs"><Plug size={14}/><span className="canvas-tool-label">APIs</span></button>
              <button type="button" data-tour="atelier-data-story" onClick={() => setNewDataStory(blankDataStory(projectDesignSystem, projectVisualIdentity))} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Ateliê · storytelling de dados, gráficos, mapas e infográficos livres"><PanelsTopLeft size={14}/><span className="canvas-tool-label">INFODESIGN</span></button>
              <button type="button" data-tour="atelier-graphics" onClick={() => setNewGraphicSystem(blankGraphicSystem())} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Grafismos · tipografia experimental, pincéis, sprays, padrões e rapports"><WandSparkles size={14}/><span className="canvas-tool-label">GRAFISMOS</span></button>
              <button type="button" data-tour="atelier-library" onClick={() => setProjectLibraryOpen(true)} className="canvas-tool-button rounded-2xl border border-[#E0E0DE] bg-white hover:border-black flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer" title="Biblioteca do projeto · reutilize tudo o que já foi criado"><BookOpen size={14}/><span className="canvas-tool-label">BIBLIOTECA</span></button>
              <button 
                onClick={() => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  onAddCustomThought(
                    Math.max(0, (rect.width / 2 - panOffset.x) / zoom - 180),
                    Math.max(0, (rect.height / 2 - panOffset.y) / zoom - 100)
                  );
                }} 
                className="canvas-tool-button rounded-2xl bg-black text-white hover:bg-neutral-800 flex items-center justify-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Criar bloco de notas"
              >
                <Plus size={14} />
                <span className="canvas-tool-label">NOTAS</span>
              </button>
            </>
          )}
        </div>

      </div>

      {collaborationNodeId && (()=>{ const active=nodes.find(n=>n.id===collaborationNodeId); return active ? <NodeCollaborationPanel node={active} user={currentUser} onClose={()=>setCollaborationNodeId(null)} onChange={onUpdateNode} allowAttachments={!collaborationPermission || collaborationPermission === 'edit'}/> : null; })()}

      {imageStudioOpen && <ImageStudio onUpload={async(file)=>{const ok=await uploadCanvasImage(file);if(!ok)throw new Error('Não foi possível adicionar a imagem ao canvas.');}} onChooseOpenImage={addOpenImage} onOpenEditor={()=>{setImageStudioOpen(false);setPhotoEditor({name:'Novo projeto'});}} onGeneratedFile={async(file)=>{const ok=await uploadCanvasImage(file);if(!ok)throw new Error('Não foi possível salvar a imagem gerada.');}} onClose={()=>setImageStudioOpen(false)}/>}
      {imageLibraryOpen && <ImageLibrary onChoose={addOpenImage} onClose={()=>setImageLibraryOpen(false)}/>}
      {photoEditor && <PhotopeaEditor key={photoEditor.nodeId || photoEditor.name} url={photoEditor.url} name={photoEditor.name} onSave={async file=>{const result=await uploadCanvasImage(file,photoEditor.nodeId);if(!result)throw new Error('Não foi possível salvar a imagem. Verifique sua sessão e envie uma versão PNG de até 4 MB.');}} onClose={()=>setPhotoEditor(null)}/>}
      {newDrawing && (
        <DrawingStudio
          defaultFontFamily={projectDesignSystem?.fontFamilies?.text || projectDesignSystem?.primaryFont}
          key="new-drawing"
          drawing={newDrawing}
          title="Novo desenho"
          canEdit={canEditCanvas}
          allDrawings={nodes.filter((item) => item.type === 'drawing-sheet' && item.drawing).map((item) => ({
            id: item.id,
            name: item.drawingName || item.title || `desenho-${item.id.slice(-4)}`,
            drawing: item.drawing!,
          }))}
          onWireframe={(drawing) => { setNewWireframeSource({ kind: 'drawing', name: 'Desenho do canvas', drawing }); setNewWireframe(blankWireframe(projectDesignSystem)); setNewDrawing(null); }}
          onAnimate={(drawing) => { setNewInteractive(interactiveFromDrawing(drawing, 'Desenho animado')); setNewDrawing(null); }}
          onSave={(drawing) => {
            const startWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 300 : 420;
            const startHeight = startWidth / (drawing.width / drawing.height);
            const position = getCenteredPosition(startWidth, startHeight);
            onAddNode({
              type: 'drawing-sheet',
              title: 'Folha de desenho',
              drawingName: `Desenho ${nodes.filter((item) => item.type === 'drawing-sheet').length + 1}`,
              content: '',
              phase: activePhase,
              x: position.x,
              y: position.y,
              width: startWidth,
              height: startHeight,
              aspectRatio: drawing.width / drawing.height,
              drawing,
              connections: [],
            });
            setNewDrawing(null);
          }}
          onClose={() => setNewDrawing(null)}
        />
      )}

      {drawingEditorNodeId && (() => {
        const drawingNode = nodes.find((item) => item.id === drawingEditorNodeId && item.type === 'drawing-sheet');
        if (!drawingNode) return null;
        return (
          <DrawingStudio
          defaultFontFamily={projectDesignSystem?.fontFamilies?.text || projectDesignSystem?.primaryFont}
            key={drawingNode.id}
            drawing={drawingNode.drawing || blankDrawing()}
            title={drawingNode.drawingName || drawingNode.title || 'Folha de desenho'}
            canEdit={canEditCanvas}
            allDrawings={nodes.filter((item) => item.type === 'drawing-sheet' && item.drawing).map((item) => ({
              id: item.id,
              name: item.drawingName || item.title || `desenho-${item.id.slice(-4)}`,
              drawing: item.drawing!,
            }))}
            onWireframe={(drawing) => { setNewWireframeSource({ kind: 'drawing', name: drawingNode.drawingName || drawingNode.title || 'Desenho do canvas', drawing }); setNewWireframe(blankWireframe(projectDesignSystem)); setDrawingEditorNodeId(null); }}
            onAnimate={(drawing) => { setNewInteractive(interactiveFromDrawing(drawing, `${drawingNode.drawingName || 'Desenho'} · animação`)); setDrawingEditorNodeId(null); }}
            onSave={(drawing) => onUpdateNode({
              ...drawingNode,
              drawing,
              aspectRatio: drawing.width / drawing.height,
            })}
            onClose={() => setDrawingEditorNodeId(null)}
          />
        );
      })()}

      {newInteractive && (
        <InteractiveStudio
          key="new-interactive"
          document={newInteractive}
          project={project}
          nodes={nodes}
          title="Nova camada interativa"
          canEdit={canEditCanvas}
          onSave={(interactive) => {
            const startWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 320 : 440;
            const startHeight = typeof window !== 'undefined' && window.innerWidth < 640 ? 240 : 320;
            const position = getCenteredPosition(startWidth, startHeight);
            onAddNode({
              type: 'interactive-lab',
              title: interactive.title || 'Interação',
              interactiveName: interactive.title || `Interação ${nodes.filter((item) => item.type === 'interactive-lab').length + 1}`,
              content: interactive.prompt || '',
              phase: activePhase,
              x: position.x,
              y: position.y,
              width: startWidth,
              height: startHeight,
              aspectRatio: startWidth / startHeight,
              interactive,
              connections: [],
            });
            setNewInteractive(null);
          }}
          onClose={() => setNewInteractive(null)}
        />
      )}

      {interactiveEditorNodeId && (() => {
        const interactiveNode = nodes.find((item) => item.id === interactiveEditorNodeId && item.type === 'interactive-lab');
        if (!interactiveNode) return null;
        return (
          <InteractiveStudio
            key={interactiveNode.id}
            document={interactiveNode.interactive || blankInteractiveDocument('p5')}
            project={project}
            nodes={nodes}
            title={interactiveNode.interactiveName || interactiveNode.title || 'Camada interativa'}
            canEdit={canEditCanvas}
            onSave={(interactive) => onUpdateNode({
              ...interactiveNode,
              title: interactive.title || interactiveNode.title,
              interactiveName: interactive.title || interactiveNode.interactiveName,
              content: interactive.prompt || interactiveNode.content,
              interactive,
            })}
            onClose={() => setInteractiveEditorNodeId(null)}
          />
        );
      })()}

      {newWireframe && <WireframeStudio
        document={newWireframe}
        designSystem={projectDesignSystem}
        title="Novo wireframe"
        canEdit={canEditCanvas}
        initialSource={newWireframeSource}
        availableDrawings={nodes.filter((item)=>item.type==='drawing-sheet'&&item.drawing).map((item)=>({id:item.id,name:item.drawingName||item.title||'Desenho',drawing:item.drawing!}))}
        onSave={(wireframe)=>{
          const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:420; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?260:320; const position=getCenteredPosition(startWidth,startHeight);
          onAddNode({type:'wireframe-board',title:'Wireframes',wireframeName:`Wireframes ${nodes.filter((item)=>item.type==='wireframe-board').length+1}`,content:'Frames, auto layout e componentes do projeto.',phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,wireframe,connections:[]}); setNewWireframe(null); setNewWireframeSource(null);
        }}
        onClose={()=>{setNewWireframe(null);setNewWireframeSource(null)}}
      />} 

      {wireframeEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===wireframeEditorNodeId&&item.type==='wireframe-board'); if(!node)return null; return <WireframeStudio key={node.id} document={node.wireframe||blankWireframe(projectDesignSystem)} designSystem={projectDesignSystem} title={node.wireframeName||'Wireframes'} canEdit={canEditCanvas} availableDrawings={nodes.filter((item)=>item.type==='drawing-sheet'&&item.drawing).map((item)=>({id:item.id,name:item.drawingName||item.title||'Desenho',drawing:item.drawing!}))} onSave={(wireframe)=>onUpdateNode({...node,wireframe})} onClose={()=>setWireframeEditorNodeId(null)}/>})()}

      {newDesignSystem && <DesignSystemStudio document={newDesignSystem} visualIdentitySuggestion={projectVisualIdentity} title="Novo Design System" canEdit={canEditCanvas} onSave={(designSystem)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:400; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?250:300; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'design-system',title:'Design System',designSystemName:designSystem.name||`Design System ${nodes.filter((item)=>item.type==='design-system').length+1}`,content:'Paleta, tipografia, tokens e critérios de acessibilidade.',phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,designSystem,connections:[]}); setNewDesignSystem(null);
      }} onClose={()=>setNewDesignSystem(null)}/>} 

      {designSystemEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===designSystemEditorNodeId&&item.type==='design-system'); if(!node)return null; return <DesignSystemStudio key={node.id} document={node.designSystem||blankDesignSystem(projectVisualIdentity)} visualIdentitySuggestion={projectVisualIdentity} title={node.designSystemName||'Design System'} canEdit={canEditCanvas} onSave={(designSystem)=>onUpdateNode({...node,designSystem,designSystemName:designSystem.name||node.designSystemName})} onClose={()=>setDesignSystemEditorNodeId(null)}/>})()}

      {newVisualIdentity && <VisualIdentityStudio document={newVisualIdentity} designSystem={projectDesignSystem} title="Nova identidade visual" canEdit={canEditCanvas} onSave={(visualIdentity)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:410; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?260:310; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'visual-identity',title:visualIdentity.brandName||'Identidade visual',visualIdentityName:visualIdentity.brandName||`Identidade visual ${nodes.filter((item)=>item.type==='visual-identity').length+1}`,content:`${visualIdentity.personality.join(', ')} · ${visualIdentity.palette.map((c)=>c.color).join(' ')}`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,visualIdentity,connections:[]}); setNewVisualIdentity(null);
      }} onAddToNotes={(noteTitle,noteContent)=>{const position=getCenteredPosition(340,220);onAddNode({type:'user-thought',title:noteTitle,content:noteContent,phase:activePhase,x:position.x+36,y:position.y+36,width:340,height:220,connections:[]})}} onClose={()=>setNewVisualIdentity(null)}/>}

      {visualIdentityEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===visualIdentityEditorNodeId&&item.type==='visual-identity'); if(!node)return null; return <VisualIdentityStudio key={node.id} document={node.visualIdentity||blankVisualIdentity(projectDesignSystem)} designSystem={projectDesignSystem} title={node.visualIdentityName||'Identidade visual'} canEdit={canEditCanvas} onSave={(visualIdentity)=>onUpdateNode({...node,visualIdentity,visualIdentityName:visualIdentity.brandName||node.visualIdentityName,title:visualIdentity.brandName||node.title,content:`${visualIdentity.personality.join(', ')} · ${visualIdentity.palette.map((c)=>c.color).join(' ')}`})} onAddToNotes={(noteTitle,noteContent)=>{const position=getCenteredPosition(340,220);onAddNode({type:'user-thought',title:noteTitle,content:noteContent,phase:activePhase,x:position.x+36,y:position.y+36,width:340,height:220,connections:[]})}} onClose={()=>setVisualIdentityEditorNodeId(null)}/>})()}

      {newVideo && <VideoStudio document={newVideo} designSystem={projectDesignSystem} availableMedia={projectVideoMedia} title="Novo vídeo" canEdit={canEditCanvas} onSave={(video)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?300:380; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?360:430; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'video-board',title:video.title||'Vídeo',videoName:video.title||`Vídeo ${nodes.filter((item)=>item.type==='video-board').length+1}`,content:video.prompt||video.subtitle||'',phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,video,connections:[]}); setNewVideo(null);
      }} onClose={()=>setNewVideo(null)}/>} 

      {videoEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===videoEditorNodeId&&item.type==='video-board'); if(!node)return null; return <VideoStudio key={node.id} document={node.video||blankVideo(projectDesignSystem)} designSystem={projectDesignSystem} availableMedia={projectVideoMedia.filter((m)=>m.id!==node.id)} title={node.videoName||'Vídeo'} canEdit={canEditCanvas} onSave={(video)=>onUpdateNode({...node,video,videoName:video.title||node.videoName,title:video.title||node.title,content:video.prompt||video.subtitle||node.content})} onClose={()=>setVideoEditorNodeId(null)}/>})()}

      {newUXWriting && <UXWritingStudio document={newUXWriting} project={project} availableWireframes={nodes.filter((item)=>item.type==='wireframe-board'&&item.wireframe).map((item)=>({id:item.id,name:item.wireframeName||item.title||'Wireframe',wireframe:item.wireframe!}))} title="Novo UX Writing" canEdit={canEditCanvas} onSave={(uxWriting)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:400; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?280:330; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'ux-writing',title:uxWriting.title||'UX Writing',uxWritingName:uxWriting.title||`UX Writing ${nodes.filter((item)=>item.type==='ux-writing').length+1}`,content:`${uxWriting.entries.length} textos de interface`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,uxWriting,connections:[]}); setNewUXWriting(null);
      }} onClose={()=>setNewUXWriting(null)}/>}

      {uxWritingEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===uxWritingEditorNodeId&&item.type==='ux-writing'); if(!node)return null; return <UXWritingStudio key={node.id} document={node.uxWriting||blankUXWriting()} project={project} availableWireframes={nodes.filter((item)=>item.type==='wireframe-board'&&item.wireframe).map((item)=>({id:item.id,name:item.wireframeName||item.title||'Wireframe',wireframe:item.wireframe!}))} title={node.uxWritingName||'UX Writing'} canEdit={canEditCanvas} onSave={(uxWriting)=>onUpdateNode({...node,uxWriting,uxWritingName:uxWriting.title||node.uxWritingName,title:uxWriting.title||node.title,content:`${uxWriting.entries.length} textos de interface`})} onClose={()=>setUXWritingEditorNodeId(null)}/>})()}

      {newSound && <SoundStudio document={newSound} title="Nova sonoridade" canEdit={canEditCanvas} onSave={(sound)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?300:380; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?220:270; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'sound-board',title:sound.title||'Sonoridade',soundName:sound.title||`Sonoridade ${nodes.filter((item)=>item.type==='sound-board').length+1}`,content:`${sound.cues.length} efeitos sonoros`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,sound,connections:[]}); setNewSound(null);
      }} onClose={()=>setNewSound(null)}/>}

      {soundEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===soundEditorNodeId&&item.type==='sound-board'); if(!node)return null; return <SoundStudio key={node.id} document={node.sound||blankSound()} title={node.soundName||'Sonoridade'} canEdit={canEditCanvas} onSave={(sound)=>onUpdateNode({...node,sound,soundName:sound.title||node.soundName,title:sound.title||node.title,content:`${sound.cues.length} efeitos sonoros`})} onClose={()=>setSoundEditorNodeId(null)}/>})()}

      {newHardware && <HardwareStudio document={newHardware} targets={nodes.filter((item)=>item.type==='interactive-lab'||item.type==='wireframe-board'||item.type==='drawing-sheet').map((item)=>({id:item.id,name:item.interactiveName||item.wireframeName||item.drawingName||item.title,type:item.type}))} title="Novo hardware" canEdit={canEditCanvas} onSave={(hardware)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:400; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?250:300; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'hardware-board',title:hardware.title||'Hardware',hardwareName:hardware.title||`Hardware ${nodes.filter((item)=>item.type==='hardware-board').length+1}`,content:`${hardware.mappings.length} mapeamentos físicos`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,hardware,connections:[]}); setNewHardware(null);
      }} onClose={()=>setNewHardware(null)}/>}

      {hardwareEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===hardwareEditorNodeId&&item.type==='hardware-board'); if(!node)return null; return <HardwareStudio key={node.id} document={node.hardware||blankHardware()} targets={nodes.filter((item)=>item.type==='interactive-lab'||item.type==='wireframe-board'||item.type==='drawing-sheet').map((item)=>({id:item.id,name:item.interactiveName||item.wireframeName||item.drawingName||item.title,type:item.type}))} title={node.hardwareName||'Hardware'} canEdit={canEditCanvas} onSave={(hardware)=>onUpdateNode({...node,hardware,hardwareName:hardware.title||node.hardwareName,title:hardware.title||node.title,content:`${hardware.mappings.length} mapeamentos físicos`})} onClose={()=>setHardwareEditorNodeId(null)}/>})()}

      {newSprite && <SpriteStudio document={newSprite} availableAssets={projectSpriteAssets} title="Novo personagem & sprites" canEdit={canEditCanvas} onSave={(sprite)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?280:340; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?280:340; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'sprite-character',title:sprite.characterName||'Personagem',spriteName:sprite.characterName||`Personagem ${nodes.filter((item)=>item.type==='sprite-character').length+1}`,content:`${sprite.animations.length} animações · ${sprite.animations.reduce((sum,item)=>sum+item.frames.length,0)} frames`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,sprite,connections:[]}); setNewSprite(null);
      }} onClose={()=>setNewSprite(null)}/>}

      {spriteEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===spriteEditorNodeId&&item.type==='sprite-character'); if(!node)return null; return <SpriteStudio key={node.id} document={node.sprite||blankSpriteCharacter()} availableAssets={projectSpriteAssets.filter((asset)=>asset.id!==node.id)} title={node.spriteName||'Personagem & Sprites'} canEdit={canEditCanvas} onSave={(sprite)=>onUpdateNode({...node,sprite,spriteName:sprite.characterName||node.spriteName,title:sprite.characterName||node.title,content:`${sprite.animations.length} animações · ${sprite.animations.reduce((sum,item)=>sum+item.frames.length,0)} frames`})} onClose={()=>setSpriteEditorNodeId(null)}/>})()}

      {newGame && <GameDesignStudio document={newGame} availableAssets={projectGameAssets} title="Novo Game Design" canEdit={canEditCanvas} onSave={(gameDesign)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:420; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?260:320; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'game-design',title:gameDesign.title||'Game Design',gameDesignName:gameDesign.title||`Game Design ${nodes.filter((item)=>item.type==='game-design').length+1}`,content:`${gameDesign.scenes.length} cenas · ${new Set(gameDesign.scenes.flatMap((scene)=>scene.spriteIds||[])).size} sprites`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,gameDesign,connections:[]}); setNewGame(null);
      }} onClose={()=>setNewGame(null)}/>}

      {gameEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===gameEditorNodeId&&item.type==='game-design'); if(!node)return null; return <GameDesignStudio key={node.id} document={node.gameDesign||blankGameDesign()} availableAssets={projectGameAssets.filter((a)=>a.id!==node.id)} title={node.gameDesignName||'Game Design'} canEdit={canEditCanvas} onSave={(gameDesign)=>onUpdateNode({...node,gameDesign,gameDesignName:gameDesign.title||node.gameDesignName,title:gameDesign.title||node.title,content:`${gameDesign.scenes.length} cenas · ${new Set(gameDesign.scenes.flatMap((scene)=>scene.spriteIds||[])).size} sprites`})} onClose={()=>setGameEditorNodeId(null)}/>})()}

      {newApiConnections && <ApiConnectionsStudio document={newApiConnections} title="APIs & Conexões" canEdit={canEditCanvas} onSave={(apiConnections)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:410; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?240:290; const position=getCenteredPosition(startWidth,startHeight);
        const summary=apiConnections.connections.map((c)=>`${c.name} [${c.status}]${c.envVars.length?` env:${c.envVars.join(',')}`:''}`).join(' · ');
        onAddNode({type:'api-connections',title:apiConnections.title||'APIs & Conexões',apiConnectionsName:apiConnections.title||'APIs & Conexões',content:summary||'Catálogo e integrações de API do projeto',phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,apiConnections,connections:[]}); setNewApiConnections(null);
      }} onClose={()=>setNewApiConnections(null)}/>} 

      {apiEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===apiEditorNodeId&&item.type==='api-connections'); if(!node)return null; return <ApiConnectionsStudio key={node.id} document={node.apiConnections||blankApiConnections()} title={node.apiConnectionsName||'APIs & Conexões'} canEdit={canEditCanvas} onSave={(apiConnections)=>onUpdateNode({...node,apiConnections,apiConnectionsName:apiConnections.title||node.apiConnectionsName,title:apiConnections.title||node.title,content:apiConnections.connections.map((c)=>`${c.name} [${c.status}]${c.envVars.length?` env:${c.envVars.join(',')}`:''}`).join(' · ')||node.content})} onClose={()=>setApiEditorNodeId(null)}/>})()}

      {newDataStory && <DataStoryStudio document={newDataStory} designSystem={projectDesignSystem} visualIdentity={projectVisualIdentity} title="Novo Infodesign & Dados" canEdit={canEditCanvas} onSave={(dataStory)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?320:430; const startHeight=typeof window!=='undefined'&&window.innerWidth<640?260:320; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'data-story',title:dataStory.title||'Infodesign & Dados',dataStoryName:dataStory.title||`Infodesign ${nodes.filter((item)=>item.type==='data-story').length+1}`,content:`${dataStory.chartType} · ${dataStory.insight||dataStory.goal}`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,dataStory,connections:[]}); setNewDataStory(null);
      }} onClose={()=>setNewDataStory(null)}/>}

      {dataStoryEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===dataStoryEditorNodeId&&item.type==='data-story'); if(!node)return null; return <DataStoryStudio key={node.id} document={node.dataStory||blankDataStory(projectDesignSystem,projectVisualIdentity)} designSystem={projectDesignSystem} visualIdentity={projectVisualIdentity} title={node.dataStoryName||'Infodesign & Dados'} canEdit={canEditCanvas} onSave={(dataStory)=>onUpdateNode({...node,dataStory,dataStoryName:dataStory.title||node.dataStoryName,title:dataStory.title||node.title,content:`${dataStory.chartType} · ${dataStory.insight||dataStory.goal}`})} onClose={()=>setDataStoryEditorNodeId(null)}/>})()}

      {newTextStudio && <TextStudio document={newTextStudio} title="Novo texto" canEdit={canEditCanvas} onSave={(textStudio)=>{ const startWidth=380,startHeight=280,position=getCenteredPosition(startWidth,startHeight); onAddNode({type:'text-system',title:textStudio.title||'Textos',textStudioName:textStudio.title||'Textos',content:`${textStudio.mode} · ${textStudio.text}`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,textStudio,connections:[]}); setNewTextStudio(null); }} onClose={()=>setNewTextStudio(null)}/>}
      {textEditorNodeId && (()=>{const node=nodes.find(item=>item.id===textEditorNodeId&&item.type==='text-system'); if(!node)return null; return <TextStudio key={node.id} document={node.textStudio||blankTextStudio(projectDesignSystem)} title={node.textStudioName||'Textos'} canEdit={canEditCanvas} onSave={(textStudio)=>onUpdateNode({...node,textStudio,textStudioName:textStudio.title||node.textStudioName,title:textStudio.title||node.title,content:`${textStudio.mode} · ${textStudio.text}`})} onClose={()=>setTextEditorNodeId(null)}/>})()}

      {projectLibraryOpen && <div className="project-library-overlay" onClick={()=>setProjectLibraryOpen(false)}><section className="project-library" onClick={e=>e.stopPropagation()}><header><div><b>Biblioteca do projeto</b><small>Assets criados neste projeto · disponíveis em qualquer página</small></div><button onClick={()=>setProjectLibraryOpen(false)}><X/></button></header><div className="project-library-grid">{projectNodes.filter(n=>n.type!=='core'&&n.type!=='question'&&n.type!=='user-thought').map(n=><button key={n.id} onClick={()=>{const pos=getCenteredPosition(n.width||340,n.height||260);onAddNode({...n,id:undefined as never,createdAt:undefined as never,x:pos.x,y:pos.y,title:`${n.title} · cópia`,connections:[]} as any);setProjectLibraryOpen(false)}}><span>{n.type.replaceAll('-',' ')}</span><b>{n.title}</b><small>Inserir nesta página</small></button>)}{!projectNodes.some(n=>!['core','question','user-thought'].includes(n.type))&&<p>A biblioteca será preenchida conforme você criar imagens, textos, marcas, wireframes, vídeos, personagens e experimentos.</p>}</div></section></div>}

      {newGraphicSystem && <GraphicsStudio document={newGraphicSystem} title="Novo sistema de grafismos" canEdit={canEditCanvas} onSave={(graphicSystem)=>{
        const startWidth=typeof window!=='undefined'&&window.innerWidth<640?300:380; const startHeight=startWidth; const position=getCenteredPosition(startWidth,startHeight);
        onAddNode({type:'graphic-system',title:graphicSystem.title||'Grafismos',graphicSystemName:graphicSystem.title||`Grafismos ${nodes.filter((item)=>item.type==='graphic-system').length+1}`,content:`${graphicSystem.elements.length} elementos · ${graphicSystem.repeatMode}`,phase:activePhase,x:position.x,y:position.y,width:startWidth,height:startHeight,graphicSystem,connections:[]}); setNewGraphicSystem(null);
      }} onClose={()=>setNewGraphicSystem(null)}/>}

      {graphicEditorNodeId && (()=>{const node=nodes.find((item)=>item.id===graphicEditorNodeId&&item.type==='graphic-system'); if(!node)return null; return <GraphicsStudio key={node.id} document={node.graphicSystem||blankGraphicSystem()} title={node.graphicSystemName||'Grafismos'} canEdit={canEditCanvas} onSave={(graphicSystem)=>onUpdateNode({...node,graphicSystem,graphicSystemName:graphicSystem.title||node.graphicSystemName,title:graphicSystem.title||node.title,content:`${graphicSystem.elements.length} elementos · ${graphicSystem.repeatMode}`})} onClose={()=>setGraphicEditorNodeId(null)}/>})()}

    </div>
  );
});

export default InfiniteCanvas;
