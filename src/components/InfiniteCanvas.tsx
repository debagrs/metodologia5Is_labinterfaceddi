import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ZoomIn, ZoomOut, Maximize, Plus, Trash2, CheckCircle2, 
  HelpCircle, Compass, Sparkles, BookOpen, User, CornerDownRight, Check, MessageCircle, Paperclip,
  ImagePlus, Link2, Loader2, MoveDiagonal2, X, Pencil
} from 'lucide-react';
import { ThoughtNode, Project, Phase, UserProfile, CollaborationPermission, DrawingDocument } from '../types';
import NodeCollaborationPanel from './NodeCollaborationPanel';
import MediatorSticker from './MediatorSticker';
import DrawingStudio, { DrawingPreview } from './DrawingStudio';
import { readStoredTursoSession } from '../lib/turso';

export interface InfiniteCanvasHandle {
  getCenteredCardPosition: (cardWidth?: number, cardHeight?: number) => { x: number; y: number };
  focusNode: (nodeId: string, openCollaboration?: boolean) => void;
}

interface InfiniteCanvasProps {
  project: Project;
  nodes: ThoughtNode[];
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
  const [newDrawing, setNewDrawing] = useState<DrawingDocument | null>(null);
  const [uploadingCanvasImage, setUploadingCanvasImage] = useState(false);
  const [canvasImageError, setCanvasImageError] = useState('');
  const canvasImageInputRef = useRef<HTMLInputElement>(null);
  const canEditCanvas = !collaborationPermission || collaborationPermission === 'edit';

  const getNodeDimensions = (node: ThoughtNode) => {
    const compactCanvas = typeof window !== 'undefined' && window.innerWidth < 640;
    if (node.type === 'canvas-image') {
      return { width: node.width || (compactCanvas ? 280 : 320), height: node.height || (compactCanvas ? 210 : 240) };
    }
    if (node.type === 'drawing-sheet') {
      return { width: node.width || (compactCanvas ? 300 : 380), height: node.height || (compactCanvas ? 200 : 255) };
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

  const uploadCanvasImage = async (file: File) => {
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
      onAddNode({
        type: 'canvas-image',
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
      });
    } catch (error: any) {
      setCanvasImageError(error?.message || 'Não foi possível adicionar a imagem ao canvas.');
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

    const isVisualNode = node.type === 'canvas-image' || node.type === 'drawing-sheet';
    const minWidth = isVisualNode ? 100 : 240;
    const minHeight = isVisualNode ? 80 : 150;
    const maxWidth = isVisualNode ? 1400 : 820;
    const maxHeight = isVisualNode ? 1400 : 900;

    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

    const move = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;

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
    setZoom(prev => Math.min(Math.max(prev + factor, 0.5), 1.5));
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

  // Pan unificado do canvas com mouse, caneta ou um dedo no celular.
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.thought-card') || target.closest('.canvas-control')) return;
    e.preventDefault();

    const pointerId = e.pointerId;
    const viewport = e.currentTarget as HTMLElement;
    viewport.setPointerCapture?.(pointerId);
    const startX = e.clientX - panOffset.x;
    const startY = e.clientY - panOffset.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
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
      const dx = (moveEvent.clientX - startX) / zoom;
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
      onPointerDown={handleCanvasPointerDown}
      onDoubleClick={handleDoubleClick}
      style={{ touchAction: 'none' }}
      className="relative flex-1 h-full overflow-hidden bg-[#FDFDFB] select-none cursor-grab active:cursor-grabbing"
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
            const isSelected = selectedNodeId === node.id;
            const isActive = node.phase === activePhase;
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
                    : isActive 
                      ? '#E0E0DE' 
                      : '#F0F0EE',
                  boxShadow: isDragDropTarget
                    ? '0 0 0 5px rgba(59, 130, 246, 0.35), 0 12px 30px -5px rgba(0, 0, 0, 0.15)'
                    : isConnectionSource || isSelected 
                    ? '0 12px 30px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' 
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)'
                }}
                className="absolute thought-card pointer-events-auto rounded-2xl border bg-white text-neutral-800 overflow-hidden transition-all duration-200 cursor-default"
                style={{
                  left: node.x,
                  top: node.y,
                  width: dimensions.width,
                  height: node.height || undefined,
                  minWidth: isCore ? 320 : 240,
                  opacity: isActive ? 1 : 0.65
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
                  style={{ touchAction: 'none' }}
                  className={`px-4 py-3.5 sm:py-3 flex items-center justify-between cursor-grab active:cursor-grabbing border-b select-none ${
                    isCore 
                      ? 'bg-[#1A1A1A] border-black text-white' 
                      : isQuestion 
                        ? 'bg-[#F5F5F3] border-[#E0E0DE] text-neutral-700 font-mono text-[10px]'
                        : 'bg-stone-50 border-[#E0E0DE] text-neutral-700 font-mono text-[10px]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCore ? (
                      <span className="text-[10px] tracking-widest font-mono text-white/65 uppercase font-bold">Âncora Central do Projeto</span>
                    ) : (
                      <>
                        <span className={`w-2 h-2 rounded-full ${
                          isActive ? 'bg-black animate-pulse' : 'bg-gray-300'
                        }`} />
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
                      <textarea
                        placeholder="Escreva uma reflexão livre, insight de campo, ou ideia..."
                        value={node.content}
                        rows={3}
                        onChange={(e) => onUpdateNodeContent(node.id, e.target.value)}
                        className="w-full flex-1 min-h-[72px] text-xs font-light text-neutral-800 placeholder:text-gray-400 border-none outline-none resize-none bg-transparent p-0"
                      />
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
      <div id="canvas-actions-panel" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 sm:left-6 sm:translate-x-0 z-20 flex flex-col gap-2 sm:gap-3 canvas-control max-w-[calc(100vw-2rem)]">
        
        {/* Double-click hint */}
        <div className="bg-white/85 backdrop-blur-md border border-[#E0E0DE] rounded-full px-4 py-2 text-[12px] font-mono text-neutral-500 hidden sm:flex items-center gap-1.5 shadow-sm max-w-[calc(100vw-3rem)]">
          <HelpCircle size={12} className="text-black shrink-0" />
          <span className="truncate">Dica: arraste a alça de conexão entre itens; toque numa seta para inverter ou reposicionar suas pontas</span>
        </div>

        {canvasImageError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700 shadow-sm flex items-center justify-between gap-2">
            <span>{canvasImageError}</span>
            <button type="button" onClick={() => setCanvasImageError('')} className="p-1 cursor-pointer" aria-label="Fechar aviso"><X size={12} /></button>
          </div>
        )}

        {/* Action button bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 bg-white/90 backdrop-blur-md border border-[#E0E0DE] rounded-xl p-1.5 shadow-lg">
          <button 
            onClick={() => handleZoom(0.1)} 
            className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Aumentar zoom"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={() => handleZoom(-0.1)} 
            className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Diminuir zoom"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-px h-5 bg-[#E0E0DE] mx-1" />
          <button 
            onClick={handleResetView} 
            className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Centralizar âncora do projeto"
          >
            <Maximize size={15} />
          </button>
          {canEditCanvas && (
            <>
              <div className="w-px h-5 bg-[#E0E0DE] mx-1" />
              <input
                ref={canvasImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadCanvasImage(file);
                }}
              />
              <button
                type="button"
                onClick={() => canvasImageInputRef.current?.click()}
                disabled={uploadingCanvasImage}
                className="px-2.5 sm:px-3 h-8 rounded-lg border border-[#E0E0DE] bg-white hover:border-black disabled:opacity-50 flex items-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Adicionar imagem solta ao canvas"
              >
                {uploadingCanvasImage ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}
                <span className="hidden sm:inline">IMAGEM</span>
              </button>
              <button
                type="button"
                onClick={() => setNewDrawing(blankDrawing())}
                className="px-2.5 sm:px-3 h-8 rounded-lg border border-[#E0E0DE] bg-white hover:border-black flex items-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Abrir uma folha branca para desenhar"
              >
                <Pencil size={14} />
                <span className="hidden sm:inline">DESENHO</span>
              </button>
              <button 
                onClick={() => {
                  const rect = containerRef.current?.getBoundingClientRect();
                  if (!rect) return;
                  onAddCustomThought(
                    Math.max(0, (rect.width / 2 - panOffset.x) / zoom - 180),
                    Math.max(0, (rect.height / 2 - panOffset.y) / zoom - 100)
                  );
                }} 
                className="px-2.5 sm:px-3 h-8 rounded-lg bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer"
                title="Criar bloco de notas"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">NOTAS</span>
              </button>
            </>
          )}
        </div>

      </div>

      {collaborationNodeId && (()=>{ const active=nodes.find(n=>n.id===collaborationNodeId); return active ? <NodeCollaborationPanel node={active} user={currentUser} onClose={()=>setCollaborationNodeId(null)} onChange={onUpdateNode} allowAttachments={!collaborationPermission || collaborationPermission === 'edit'}/> : null; })()}

      {newDrawing && (
        <DrawingStudio
          key="new-drawing"
          drawing={newDrawing}
          title="Novo desenho"
          canEdit={canEditCanvas}
          allDrawings={nodes.filter((item) => item.type === 'drawing-sheet' && item.drawing).map((item) => ({
            id: item.id,
            name: item.drawingName || item.title || `desenho-${item.id.slice(-4)}`,
            drawing: item.drawing!,
          }))}
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
            key={drawingNode.id}
            drawing={drawingNode.drawing || blankDrawing()}
            title={drawingNode.drawingName || drawingNode.title || 'Folha de desenho'}
            canEdit={canEditCanvas}
            allDrawings={nodes.filter((item) => item.type === 'drawing-sheet' && item.drawing).map((item) => ({
              id: item.id,
              name: item.drawingName || item.title || `desenho-${item.id.slice(-4)}`,
              drawing: item.drawing!,
            }))}
            onSave={(drawing) => onUpdateNode({
              ...drawingNode,
              drawing,
              aspectRatio: drawing.width / drawing.height,
            })}
            onClose={() => setDrawingEditorNodeId(null)}
          />
        );
      })()}
    </div>
  );
});

export default InfiniteCanvas;
