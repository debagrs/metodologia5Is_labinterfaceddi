import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Circle,
  Download,
  Eraser,
  Minus,
  Pencil,
  Redo2,
  Save,
  Square,
  Star,
  Trash2,
  Triangle,
  Type,
  Undo2,
  X,
} from 'lucide-react';
import { DrawingDocument, DrawingElement, DrawingElementType, DrawingPoint } from '../types';

type DrawingTool = DrawingElementType | 'select';
type ExportFormat = 'svg' | 'png' | 'jpg';

export interface DrawingExportItem {
  id: string;
  name: string;
  drawing: DrawingDocument;
}

interface DrawingStudioProps {
  drawing: DrawingDocument;
  title?: string;
  canEdit?: boolean;
  allDrawings?: DrawingExportItem[];
  onSave: (drawing: DrawingDocument) => void;
  onClose: () => void;
}

const PALETTE = ['#111111', '#6B7280', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'];

const SHAPE_TOOLS: { tool: DrawingTool; label: string }[] = [
  { tool: 'line', label: 'Linha' },
  { tool: 'arrow', label: 'Seta' },
  { tool: 'rectangle', label: 'Retângulo' },
  { tool: 'rounded-rectangle', label: 'Ret. arred.' },
  { tool: 'ellipse', label: 'Círculo/Elipse' },
  { tool: 'triangle', label: 'Triângulo' },
  { tool: 'diamond', label: 'Losango' },
  { tool: 'pentagon', label: 'Pentágono' },
  { tool: 'hexagon', label: 'Hexágono' },
  { tool: 'star', label: 'Estrela' },
  { tool: 'cube', label: 'Cubo 3D' },
  { tool: 'sphere', label: 'Esfera 3D' },
  { tool: 'cylinder', label: 'Cilindro 3D' },
  { tool: 'cone', label: 'Cone 3D' },
  { tool: 'pyramid', label: 'Pirâmide 3D' },
];

const cloneDrawing = (drawing: DrawingDocument): DrawingDocument => JSON.parse(JSON.stringify(drawing));

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const pointsToPath = (points: DrawingPoint[] = []) => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.01} ${points[0].y + 0.01}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;
    path += ` Q ${current.x} ${current.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;
  return path;
};

const regularPolygonPoints = (x: number, y: number, x2: number, y2: number, sides: number, rotation = -Math.PI / 2) => {
  const minX = Math.min(x, x2);
  const maxX = Math.max(x, x2);
  const minY = Math.min(y, y2);
  const maxY = Math.max(y, y2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = Math.max((maxX - minX) / 2, 1);
  const ry = Math.max((maxY - minY) / 2, 1);
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index * Math.PI * 2) / sides;
    return `${cx + Math.cos(angle) * rx},${cy + Math.sin(angle) * ry}`;
  }).join(' ');
};

const starPoints = (x: number, y: number, x2: number, y2: number) => {
  const minX = Math.min(x, x2);
  const maxX = Math.max(x, x2);
  const minY = Math.min(y, y2);
  const maxY = Math.max(y, y2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const outerX = Math.max((maxX - minX) / 2, 1);
  const outerY = Math.max((maxY - minY) / 2, 1);
  const innerX = outerX * 0.45;
  const innerY = outerY * 0.45;
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const rx = index % 2 === 0 ? outerX : innerX;
    const ry = index % 2 === 0 ? outerY : innerY;
    return `${cx + Math.cos(angle) * rx},${cy + Math.sin(angle) * ry}`;
  }).join(' ');
};

const getBounds = (element: DrawingElement) => {
  const x = element.x ?? 0;
  const y = element.y ?? 0;
  const x2 = element.x2 ?? x;
  const y2 = element.y2 ?? y;
  return {
    minX: Math.min(x, x2),
    maxX: Math.max(x, x2),
    minY: Math.min(y, y2),
    maxY: Math.max(y, y2),
    width: Math.abs(x2 - x),
    height: Math.abs(y2 - y),
    cx: (x + x2) / 2,
    cy: (y + y2) / 2,
  };
};

const arrowHead = (x1: number, y1: number, x2: number, y2: number, size: number) => {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const left = {
    x: x2 - Math.cos(angle - Math.PI / 6) * size,
    y: y2 - Math.sin(angle - Math.PI / 6) * size,
  };
  const right = {
    x: x2 - Math.cos(angle + Math.PI / 6) * size,
    y: y2 - Math.sin(angle + Math.PI / 6) * size,
  };
  return `${left.x},${left.y} ${x2},${y2} ${right.x},${right.y}`;
};

const renderDrawingElement = (element: DrawingElement, selected = false) => {
  const stroke = element.stroke || '#111111';
  const fill = element.fill || 'none';
  const strokeWidth = element.strokeWidth || 2;
  const opacity = element.opacity ?? 1;
  const x = element.x ?? 0;
  const y = element.y ?? 0;
  const x2 = element.x2 ?? x;
  const y2 = element.y2 ?? y;
  const bounds = getBounds(element);
  const selectionStyle = selected ? { filter: 'drop-shadow(0 0 3px rgba(59,130,246,.9))' } : undefined;
  const common = { stroke, strokeWidth, opacity, fill, vectorEffect: 'non-scaling-stroke' as const, style: selectionStyle };

  switch (element.type) {
    case 'brush':
      return <path d={pointsToPath(element.points)} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" opacity={opacity} vectorEffect="non-scaling-stroke" style={selectionStyle} />;
    case 'line':
      return <line x1={x} y1={y} x2={x2} y2={y2} {...common} fill="none" strokeLinecap="round" />;
    case 'arrow':
      return (
        <g style={selectionStyle} opacity={opacity}>
          <line x1={x} y1={y} x2={x2} y2={y2} stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <polyline points={arrowHead(x, y, x2, y2, Math.max(12, strokeWidth * 4))} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        </g>
      );
    case 'rectangle':
      return <rect x={bounds.minX} y={bounds.minY} width={Math.max(bounds.width, 1)} height={Math.max(bounds.height, 1)} {...common} />;
    case 'rounded-rectangle':
      return <rect x={bounds.minX} y={bounds.minY} width={Math.max(bounds.width, 1)} height={Math.max(bounds.height, 1)} rx={Math.min(32, Math.max(8, Math.min(bounds.width, bounds.height) * 0.12))} {...common} />;
    case 'ellipse':
      return <ellipse cx={bounds.cx} cy={bounds.cy} rx={Math.max(bounds.width / 2, 1)} ry={Math.max(bounds.height / 2, 1)} {...common} />;
    case 'triangle':
      return <polygon points={`${bounds.cx},${bounds.minY} ${bounds.maxX},${bounds.maxY} ${bounds.minX},${bounds.maxY}`} {...common} />;
    case 'diamond':
      return <polygon points={`${bounds.cx},${bounds.minY} ${bounds.maxX},${bounds.cy} ${bounds.cx},${bounds.maxY} ${bounds.minX},${bounds.cy}`} {...common} />;
    case 'pentagon':
      return <polygon points={regularPolygonPoints(x, y, x2, y2, 5)} {...common} />;
    case 'hexagon':
      return <polygon points={regularPolygonPoints(x, y, x2, y2, 6, 0)} {...common} />;
    case 'star':
      return <polygon points={starPoints(x, y, x2, y2)} {...common} />;
    case 'cube': {
      const depth = Math.max(12, Math.min(bounds.width, bounds.height) * 0.22);
      const fx = bounds.minX;
      const fy = bounds.minY + depth;
      const fw = Math.max(bounds.width - depth, 1);
      const fh = Math.max(bounds.height - depth, 1);
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} vectorEffect="non-scaling-stroke" style={selectionStyle}>
          <rect x={fx} y={fy} width={fw} height={fh} />
          <polyline points={`${fx},${fy} ${fx + depth},${bounds.minY} ${bounds.maxX},${bounds.minY} ${fx + fw},${fy}`} fill={fill} />
          <polyline points={`${fx + fw},${fy} ${bounds.maxX},${bounds.minY} ${bounds.maxX},${bounds.maxY - depth} ${fx + fw},${fy + fh}`} fill={fill} />
          <line x1={fx + depth} y1={bounds.minY} x2={fx + depth} y2={fy + fh - depth} />
        </g>
      );
    }
    case 'sphere':
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} vectorEffect="non-scaling-stroke" style={selectionStyle}>
          <ellipse cx={bounds.cx} cy={bounds.cy} rx={Math.max(bounds.width / 2, 1)} ry={Math.max(bounds.height / 2, 1)} />
          <ellipse cx={bounds.cx} cy={bounds.cy} rx={Math.max(bounds.width / 5, 1)} ry={Math.max(bounds.height / 2, 1)} fill="none" />
          <ellipse cx={bounds.cx} cy={bounds.cy} rx={Math.max(bounds.width / 2, 1)} ry={Math.max(bounds.height / 5, 1)} fill="none" />
        </g>
      );
    case 'cylinder': {
      const ry = Math.max(bounds.height * 0.12, 4);
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} vectorEffect="non-scaling-stroke" style={selectionStyle}>
          <path d={`M ${bounds.minX} ${bounds.minY + ry} L ${bounds.minX} ${bounds.maxY - ry} A ${bounds.width / 2} ${ry} 0 0 0 ${bounds.maxX} ${bounds.maxY - ry} L ${bounds.maxX} ${bounds.minY + ry}`} />
          <ellipse cx={bounds.cx} cy={bounds.minY + ry} rx={Math.max(bounds.width / 2, 1)} ry={ry} />
          <ellipse cx={bounds.cx} cy={bounds.maxY - ry} rx={Math.max(bounds.width / 2, 1)} ry={ry} fill="none" />
        </g>
      );
    }
    case 'cone': {
      const baseRy = Math.max(bounds.height * 0.09, 4);
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} vectorEffect="non-scaling-stroke" style={selectionStyle}>
          <path d={`M ${bounds.cx} ${bounds.minY} L ${bounds.maxX} ${bounds.maxY - baseRy} A ${bounds.width / 2} ${baseRy} 0 0 1 ${bounds.minX} ${bounds.maxY - baseRy} Z`} />
          <ellipse cx={bounds.cx} cy={bounds.maxY - baseRy} rx={Math.max(bounds.width / 2, 1)} ry={baseRy} fill="none" />
        </g>
      );
    }
    case 'pyramid':
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} opacity={opacity} vectorEffect="non-scaling-stroke" style={selectionStyle}>
          <polygon points={`${bounds.cx},${bounds.minY} ${bounds.maxX},${bounds.maxY - bounds.height * 0.18} ${bounds.cx},${bounds.maxY} ${bounds.minX},${bounds.maxY - bounds.height * 0.18}`} />
          <line x1={bounds.cx} y1={bounds.minY} x2={bounds.cx} y2={bounds.maxY} />
          <line x1={bounds.cx} y1={bounds.minY} x2={bounds.minX} y2={bounds.maxY - bounds.height * 0.18} />
          <line x1={bounds.cx} y1={bounds.minY} x2={bounds.maxX} y2={bounds.maxY - bounds.height * 0.18} />
        </g>
      );
    case 'text':
      return (
        <text x={x} y={y} fill={stroke} fontSize={element.fontSize || 32} fontFamily="Arial, Helvetica, sans-serif" opacity={opacity} style={selectionStyle}>
          {element.text || ''}
        </text>
      );
    default:
      return null;
  }
};

export function DrawingPreview({ drawing, className = '' }: { drawing: DrawingDocument; className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${drawing.width} ${drawing.height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label="Pré-visualização da folha de desenho"
    >
      <rect width={drawing.width} height={drawing.height} fill={drawing.background || '#FFFFFF'} />
      {drawing.elements.map((element) => <g key={element.id}>{renderDrawingElement(element)}</g>)}
    </svg>
  );
}

const escapeXml = (value: string) => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

const elementToSvgString = (element: DrawingElement) => {
  const stroke = element.stroke || '#111111';
  const fill = element.fill || 'none';
  const strokeWidth = element.strokeWidth || 2;
  const opacity = element.opacity ?? 1;
  const x = element.x ?? 0;
  const y = element.y ?? 0;
  const x2 = element.x2 ?? x;
  const y2 = element.y2 ?? y;
  const bounds = getBounds(element);
  const attrs = `stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" fill="${escapeXml(fill)}" opacity="${opacity}" vector-effect="non-scaling-stroke"`;

  switch (element.type) {
    case 'brush': return `<path d="${pointsToPath(element.points)}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" opacity="${opacity}"/>`;
    case 'line': return `<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" ${attrs} fill="none" stroke-linecap="round"/>`;
    case 'arrow': return `<g opacity="${opacity}"><line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round"/><polyline points="${arrowHead(x, y, x2, y2, Math.max(12, strokeWidth * 4))}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></g>`;
    case 'rectangle': return `<rect x="${bounds.minX}" y="${bounds.minY}" width="${Math.max(bounds.width, 1)}" height="${Math.max(bounds.height, 1)}" ${attrs}/>`;
    case 'rounded-rectangle': return `<rect x="${bounds.minX}" y="${bounds.minY}" width="${Math.max(bounds.width, 1)}" height="${Math.max(bounds.height, 1)}" rx="${Math.min(32, Math.max(8, Math.min(bounds.width, bounds.height) * 0.12))}" ${attrs}/>`;
    case 'ellipse': return `<ellipse cx="${bounds.cx}" cy="${bounds.cy}" rx="${Math.max(bounds.width / 2, 1)}" ry="${Math.max(bounds.height / 2, 1)}" ${attrs}/>`;
    case 'triangle': return `<polygon points="${bounds.cx},${bounds.minY} ${bounds.maxX},${bounds.maxY} ${bounds.minX},${bounds.maxY}" ${attrs}/>`;
    case 'diamond': return `<polygon points="${bounds.cx},${bounds.minY} ${bounds.maxX},${bounds.cy} ${bounds.cx},${bounds.maxY} ${bounds.minX},${bounds.cy}" ${attrs}/>`;
    case 'pentagon': return `<polygon points="${regularPolygonPoints(x, y, x2, y2, 5)}" ${attrs}/>`;
    case 'hexagon': return `<polygon points="${regularPolygonPoints(x, y, x2, y2, 6, 0)}" ${attrs}/>`;
    case 'star': return `<polygon points="${starPoints(x, y, x2, y2)}" ${attrs}/>`;
    case 'cube': {
      const depth = Math.max(12, Math.min(bounds.width, bounds.height) * 0.22);
      const fx = bounds.minX;
      const fy = bounds.minY + depth;
      const fw = Math.max(bounds.width - depth, 1);
      const fh = Math.max(bounds.height - depth, 1);
      return `<g ${attrs}><rect x="${fx}" y="${fy}" width="${fw}" height="${fh}"/><polyline points="${fx},${fy} ${fx + depth},${bounds.minY} ${bounds.maxX},${bounds.minY} ${fx + fw},${fy}"/><polyline points="${fx + fw},${fy} ${bounds.maxX},${bounds.minY} ${bounds.maxX},${bounds.maxY - depth} ${fx + fw},${fy + fh}"/><line x1="${fx + depth}" y1="${bounds.minY}" x2="${fx + depth}" y2="${fy + fh - depth}"/></g>`;
    }
    case 'sphere': return `<g ${attrs}><ellipse cx="${bounds.cx}" cy="${bounds.cy}" rx="${Math.max(bounds.width / 2, 1)}" ry="${Math.max(bounds.height / 2, 1)}"/><ellipse cx="${bounds.cx}" cy="${bounds.cy}" rx="${Math.max(bounds.width / 5, 1)}" ry="${Math.max(bounds.height / 2, 1)}" fill="none"/><ellipse cx="${bounds.cx}" cy="${bounds.cy}" rx="${Math.max(bounds.width / 2, 1)}" ry="${Math.max(bounds.height / 5, 1)}" fill="none"/></g>`;
    case 'cylinder': {
      const ry = Math.max(bounds.height * 0.12, 4);
      return `<g ${attrs}><path d="M ${bounds.minX} ${bounds.minY + ry} L ${bounds.minX} ${bounds.maxY - ry} A ${bounds.width / 2} ${ry} 0 0 0 ${bounds.maxX} ${bounds.maxY - ry} L ${bounds.maxX} ${bounds.minY + ry}"/><ellipse cx="${bounds.cx}" cy="${bounds.minY + ry}" rx="${Math.max(bounds.width / 2, 1)}" ry="${ry}"/><ellipse cx="${bounds.cx}" cy="${bounds.maxY - ry}" rx="${Math.max(bounds.width / 2, 1)}" ry="${ry}" fill="none"/></g>`;
    }
    case 'cone': {
      const baseRy = Math.max(bounds.height * 0.09, 4);
      return `<g ${attrs}><path d="M ${bounds.cx} ${bounds.minY} L ${bounds.maxX} ${bounds.maxY - baseRy} A ${bounds.width / 2} ${baseRy} 0 0 1 ${bounds.minX} ${bounds.maxY - baseRy} Z"/><ellipse cx="${bounds.cx}" cy="${bounds.maxY - baseRy}" rx="${Math.max(bounds.width / 2, 1)}" ry="${baseRy}" fill="none"/></g>`;
    }
    case 'pyramid': return `<g ${attrs}><polygon points="${bounds.cx},${bounds.minY} ${bounds.maxX},${bounds.maxY - bounds.height * 0.18} ${bounds.cx},${bounds.maxY} ${bounds.minX},${bounds.maxY - bounds.height * 0.18}"/><line x1="${bounds.cx}" y1="${bounds.minY}" x2="${bounds.cx}" y2="${bounds.maxY}"/><line x1="${bounds.cx}" y1="${bounds.minY}" x2="${bounds.minX}" y2="${bounds.maxY - bounds.height * 0.18}"/><line x1="${bounds.cx}" y1="${bounds.minY}" x2="${bounds.maxX}" y2="${bounds.maxY - bounds.height * 0.18}"/></g>`;
    case 'text': return `<text x="${x}" y="${y}" fill="${escapeXml(stroke)}" font-size="${element.fontSize || 32}" font-family="Arial, Helvetica, sans-serif" opacity="${opacity}">${escapeXml(element.text || '')}</text>`;
    default: return '';
  }
};

export const drawingToSvgString = (drawing: DrawingDocument) => {
  const body = drawing.elements.map(elementToSvgString).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${drawing.width}" height="${drawing.height}" viewBox="0 0 ${drawing.width} ${drawing.height}"><rect width="100%" height="100%" fill="${escapeXml(drawing.background || '#FFFFFF')}"/>${body}</svg>`;
};

const sanitizeName = (name: string) => name.trim().replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '-').replace(/^-+|-+$/g, '') || 'desenho';

const triggerBlobDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const exportDrawing = async (drawing: DrawingDocument, format: ExportFormat, name = 'desenho') => {
  const svg = drawingToSvgString(drawing);
  const safeName = sanitizeName(name);
  if (format === 'svg') {
    triggerBlobDownload(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }), `${safeName}.svg`);
    return;
  }

  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Não foi possível rasterizar o desenho.'));
      img.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = drawing.width;
    canvas.height = drawing.height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas de exportação indisponível.');
    context.fillStyle = drawing.background || '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, drawing.width, drawing.height);
    const mime = format === 'png' ? 'image/png' : 'image/jpeg';
    const extension = format === 'png' ? 'png' : 'jpg';
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Falha ao gerar imagem.')), mime, format === 'jpg' ? 0.94 : undefined);
    });
    triggerBlobDownload(blob, `${safeName}.${extension}`);
  } finally {
    URL.revokeObjectURL(url);
  }
};

const makeElementId = () => `draw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export default function DrawingStudio({ drawing, title = 'Folha de desenho', canEdit = true, allDrawings = [], onSave, onClose }: DrawingStudioProps) {
  const initial = useMemo(() => cloneDrawing(drawing), [drawing]);
  const [history, setHistory] = useState<DrawingDocument[]>([initial]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [tool, setTool] = useState<DrawingTool>('brush');
  const [strokeColor, setStrokeColor] = useState('#111111');
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [useFill, setUseFill] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(44);
  const [draft, setDraft] = useState<DrawingElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const current = history[historyIndex];

  const commit = (next: DrawingDocument) => {
    const truncated = history.slice(0, historyIndex + 1);
    const nextHistory = [...truncated, cloneDrawing(next)].slice(-60);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const getSvgPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const transformed = point.matrixTransform(matrix.inverse());
    return {
      x: clamp(transformed.x, 0, current.width),
      y: clamp(transformed.y, 0, current.height),
    };
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!canEdit) return;
    event.preventDefault();
    const point = getSvgPoint(event);
    const target = event.target as SVGElement;
    const hitId = target.closest('[data-drawing-element-id]')?.getAttribute('data-drawing-element-id') || null;

    if (tool === 'select') {
      setSelectedElementId(hitId);
      return;
    }

    if (tool === 'text') {
      const text = window.prompt('Digite o texto que deseja inserir:');
      if (!text?.trim()) return;
      const element: DrawingElement = {
        id: makeElementId(),
        type: 'text',
        stroke: strokeColor,
        strokeWidth,
        x: point.x,
        y: point.y,
        text: text.trim(),
        fontSize,
      };
      commit({ ...current, elements: [...current.elements, element] });
      return;
    }

    if (tool === 'brush') {
      setDraft({
        id: makeElementId(),
        type: 'brush',
        stroke: strokeColor,
        strokeWidth,
        fill: 'none',
        points: [point],
      });
      return;
    }

    const element: DrawingElement = {
      id: makeElementId(),
      type: tool,
      stroke: strokeColor,
      fill: useFill ? fillColor : 'none',
      strokeWidth,
      x: point.x,
      y: point.y,
      x2: point.x,
      y2: point.y,
    };
    setDraft(element);
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draft || !canEdit) return;
    event.preventDefault();
    const point = getSvgPoint(event);
    if (draft.type === 'brush') {
      const points = draft.points || [];
      const previous = points[points.length - 1];
      if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < 1.4) return;
      setDraft({ ...draft, points: [...points, point] });
      return;
    }
    setDraft({ ...draft, x2: point.x, y2: point.y });
  };

  const finishDraft = () => {
    if (!draft) return;
    const shouldKeep = draft.type === 'brush'
      ? (draft.points?.length || 0) > 1
      : Math.abs((draft.x2 ?? 0) - (draft.x ?? 0)) + Math.abs((draft.y2 ?? 0) - (draft.y ?? 0)) > 4;
    if (shouldKeep) commit({ ...current, elements: [...current.elements, draft] });
    setDraft(null);
  };

  const deleteSelected = () => {
    if (!selectedElementId) return;
    commit({ ...current, elements: current.elements.filter((element) => element.id !== selectedElementId) });
    setSelectedElementId(null);
  };

  const eraseLast = () => {
    if (current.elements.length === 0) return;
    commit({ ...current, elements: current.elements.slice(0, -1) });
    setSelectedElementId(null);
  };

  const handleExport = async (format: ExportFormat, scope: 'current' | 'all' = 'current') => {
    setExporting(true);
    try {
      if (scope === 'all' && allDrawings.length > 0) {
        for (const item of allDrawings) {
          await exportDrawing(item.drawing, format, item.name);
          await new Promise((resolve) => setTimeout(resolve, 120));
        }
      } else {
        await exportDrawing(current, format, title);
      }
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#ECECEA] flex flex-col canvas-control" onPointerDown={(event) => event.stopPropagation()}>
      <header className="shrink-0 bg-white border-b border-black/10 px-2 sm:px-4 py-2 flex items-center gap-2 justify-between">
        <div className="min-w-0 flex items-center gap-2">
          <button type="button" onClick={onClose} className="h-9 w-9 rounded-lg hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Fechar folha"><X size={18} /></button>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{title}</div>
            <div className="text-[10px] font-mono text-neutral-500">{current.width} × {current.height}px · {current.elements.length} elementos</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" disabled={!canEdit} onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} className="h-9 w-9 rounded-lg border border-black/10 bg-white disabled:opacity-30 flex items-center justify-center cursor-pointer" title="Desfazer"><Undo2 size={16} /></button>
          <button type="button" disabled={!canEdit} onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} className="h-9 w-9 rounded-lg border border-black/10 bg-white disabled:opacity-30 flex items-center justify-center cursor-pointer" title="Refazer"><Redo2 size={16} /></button>
          <button type="button" onClick={() => onSave(current)} className="h-9 px-3 rounded-lg bg-black text-white flex items-center gap-1.5 text-xs font-mono cursor-pointer"><Save size={15} /><span className="hidden sm:inline">SALVAR</span></button>
        </div>
      </header>

      <div className="shrink-0 bg-white border-b border-black/10 overflow-x-auto overscroll-x-contain">
        <div className="min-w-max px-2 sm:px-4 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1 pr-2 border-r border-black/10">
            <ToolButton active={tool === 'select'} onClick={() => setTool('select')} label="Selecionar"><ArrowLeftRight size={15} /></ToolButton>
            <ToolButton active={tool === 'brush'} onClick={() => setTool('brush')} label="Pincel"><Pencil size={15} /></ToolButton>
            <ToolButton active={tool === 'text'} onClick={() => setTool('text')} label="Texto"><Type size={15} /></ToolButton>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-black/10">
            {SHAPE_TOOLS.map((item) => (
              <ToolButton key={item.tool} active={tool === item.tool} onClick={() => setTool(item.tool)} label={item.label} compact>
                {item.tool === 'line' || item.tool === 'arrow' ? <Minus size={14} /> : item.tool === 'ellipse' || item.tool === 'sphere' ? <Circle size={14} /> : item.tool === 'triangle' || item.tool === 'cone' || item.tool === 'pyramid' ? <Triangle size={14} /> : item.tool === 'star' ? <Star size={14} /> : <Square size={14} />}
              </ToolButton>
            ))}
          </div>

          <div className="flex items-center gap-1.5 pr-2 border-r border-black/10">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Traço</span>
            {PALETTE.map((color) => (
              <button key={color} type="button" onClick={() => setStrokeColor(color)} className={`h-7 w-7 rounded-full border cursor-pointer ${strokeColor === color ? 'ring-2 ring-black ring-offset-1' : 'border-black/20'}`} style={{ backgroundColor: color }} aria-label={`Cor ${color}`} />
            ))}
            <input type="color" value={strokeColor} onChange={(event) => setStrokeColor(event.target.value)} className="h-7 w-8 rounded border border-black/15 bg-white" title="Cor personalizada" />
          </div>

          <div className="flex items-center gap-2 pr-2 border-r border-black/10">
            <span className="text-[10px] font-mono text-neutral-500 uppercase">Pincel</span>
            <input type="range" min="1" max="40" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} className="w-28" />
            <span className="text-[10px] font-mono w-7 text-right">{strokeWidth}</span>
          </div>

          <div className="flex items-center gap-2 pr-2 border-r border-black/10">
            <label className="text-[10px] font-mono flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={useFill} onChange={(event) => setUseFill(event.target.checked)} /> PREENCHER</label>
            <input type="color" value={fillColor} onChange={(event) => setFillColor(event.target.value)} className="h-7 w-8 rounded border border-black/15 bg-white" title="Cor de preenchimento" />
            <span className="text-[10px] font-mono text-neutral-500">Texto</span>
            <input type="range" min="12" max="140" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="w-24" />
            <span className="text-[10px] font-mono w-8">{fontSize}px</span>
          </div>

          <div className="flex items-center gap-1 pr-2 border-r border-black/10">
            <button type="button" disabled={!canEdit || !selectedElementId} onClick={deleteSelected} className="h-8 px-2 rounded-lg border border-black/10 text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"><Trash2 size={14} /> Selecionado</button>
            <button type="button" disabled={!canEdit || current.elements.length === 0} onClick={eraseLast} className="h-8 px-2 rounded-lg border border-black/10 text-xs flex items-center gap-1 disabled:opacity-30 cursor-pointer"><Eraser size={14} /> Último</button>
            <button type="button" disabled={!canEdit || current.elements.length === 0} onClick={() => commit({ ...current, elements: [] })} className="h-8 px-2 rounded-lg border border-red-200 text-red-700 text-xs disabled:opacity-30 cursor-pointer">Limpar folha</button>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-neutral-500 uppercase mr-1">Exportar</span>
            {(['svg', 'png', 'jpg'] as ExportFormat[]).map((format) => (
              <button key={format} type="button" disabled={exporting} onClick={() => void handleExport(format)} className="h-8 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[10px] font-mono uppercase flex items-center gap-1 disabled:opacity-50 cursor-pointer"><Download size={13} /> {format}</button>
            ))}
            {allDrawings.length > 1 && (['svg', 'png', 'jpg'] as ExportFormat[]).map((format) => (
              <button key={`all-${format}`} type="button" disabled={exporting} onClick={() => void handleExport(format, 'all')} className="h-8 px-2.5 rounded-lg border border-black text-[10px] font-mono uppercase disabled:opacity-50 cursor-pointer">TODAS {format}</button>
            ))}
          </div>
        </div>
      </div>

      <main className="flex-1 min-h-0 p-2 sm:p-5 overflow-auto flex items-start justify-center bg-[#ECECEA]">
        <div className="w-full max-w-[1400px] min-w-[280px] flex justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${current.width} ${current.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full h-auto max-h-[calc(100dvh-150px)] bg-white shadow-2xl border border-black/10"
            style={{ touchAction: 'none', cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDraft}
            onPointerCancel={finishDraft}
            onPointerLeave={(event) => { if (event.buttons === 0) finishDraft(); }}
          >
            <rect width={current.width} height={current.height} fill={current.background || '#FFFFFF'} />
            {current.elements.map((element) => (
              <g key={element.id} data-drawing-element-id={element.id}>
                {renderDrawingElement(element, selectedElementId === element.id)}
              </g>
            ))}
            {draft && <g opacity={0.85}>{renderDrawingElement(draft)}</g>}
          </svg>
        </div>
      </main>

      <footer className="shrink-0 bg-white border-t border-black/10 px-3 py-1.5 text-[10px] font-mono text-neutral-500 flex items-center justify-between gap-3">
        <span className="truncate">Caneta/touch: desenhe diretamente. Formas: toque e arraste. Texto: toque na folha e digite.</span>
        <span className="hidden sm:inline shrink-0">SVG vetorial · PNG/JPG raster</span>
      </footer>
    </div>
  );
}

function ToolButton({ active, onClick, label, compact = false, children }: { active: boolean; onClick: () => void; label: string; compact?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${compact ? 'h-8 px-2' : 'h-8 px-2.5'} rounded-lg border flex items-center gap-1.5 text-[10px] font-mono uppercase cursor-pointer ${active ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-black/10 hover:border-black/30'}`}
      title={label}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
