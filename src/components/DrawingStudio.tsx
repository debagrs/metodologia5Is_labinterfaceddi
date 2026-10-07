import {useGraphicFonts} from '../lib/graphicFonts';
import ImageLibrary from './ImageLibrary';
import PhotopeaEditor from './PhotopeaEditor';
import {imageCredit,type OpenImage} from '../lib/openImages';
import {ImagePlus,Layers,Eye,EyeOff,ArrowUp,ArrowDown} from 'lucide-react';
import { StudioWorkspace } from './StudioWorkspace';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  WandSparkles,
  PanelsTopLeft,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { DrawingDocument, DrawingElement, DrawingElementType, DrawingPoint, DrawingBrushKind, DrawingSymmetry } from '../types';

type DrawingTool = DrawingElementType | 'select';
type ExportFormat = 'svg' | 'png' | 'jpg';

export interface DrawingExportItem {
  id: string;
  name: string;
  drawing: DrawingDocument;
}

interface DrawingStudioProps {
  defaultFontFamily?: string;
  drawing: DrawingDocument;
  title?: string;
  canEdit?: boolean;
  allDrawings?: DrawingExportItem[];
  onSave: (drawing: DrawingDocument) => void;
  onAnimate?: (drawing: DrawingDocument) => void;
  onWireframe?: (drawing: DrawingDocument) => void;
  onClose: () => void;
}

const PALETTE = ['#111111', '#6B7280', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#8B5CF6', '#EC4899', '#FFFFFF'];
const BRUSH_PRESETS: Array<{id:DrawingBrushKind; label:string; width:number; opacity:number; note:string}> = [
  {id:'round',label:'Redondo',width:8,opacity:1,note:'Traço limpo e uniforme'},
  {id:'pencil',label:'Lápis',width:3,opacity:.72,note:'Leve e sensível à pressão'},
  {id:'ink',label:'Nanquim',width:7,opacity:1,note:'Contorno firme'},
  {id:'marker',label:'Marcador',width:18,opacity:.82,note:'Ponta plana'},
  {id:'calligraphy',label:'Caligráfico',width:14,opacity:1,note:'Ponta oblíqua'},
  {id:'dry',label:'Pincel seco',width:20,opacity:.72,note:'Falhas e textura'},
  {id:'chalk',label:'Giz',width:16,opacity:.68,note:'Textura granulada'},
  {id:'spray',label:'Spray',width:34,opacity:.5,note:'Partículas espalhadas'},
  {id:'stipple',label:'Pontilhismo',width:20,opacity:.78,note:'Pontos controlados'},
  {id:'stain',label:'Mancha',width:42,opacity:.5,note:'Mancha gráfica orgânica'},
];
const SYMMETRY_OPTIONS: Array<{id:DrawingSymmetry;label:string}> = [
  {id:'none',label:'Sem simetria'},{id:'vertical',label:'Vertical'},{id:'horizontal',label:'Horizontal'},{id:'both',label:'Dupla'},
];

const FALLBACK_FONTS = [
  'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Nunito', 'Raleway',
  'Merriweather', 'Playfair Display', 'Source Sans 3', 'Source Serif 4', 'IBM Plex Sans',
  'IBM Plex Mono', 'Space Grotesk', 'DM Sans', 'DM Serif Display', 'Work Sans', 'Ubuntu',
  'Oswald', 'Bebas Neue', 'Libre Baskerville', 'Crimson Text', 'Fira Sans', 'Fira Mono'
];

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
  if(element.hidden)return null;
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
    case 'image':return <image href={element.imageUrl} x={bounds.minX} y={bounds.minY} width={bounds.width} height={bounds.height} opacity={opacity} preserveAspectRatio="xMidYMid meet" style={selectionStyle}/>;
    case 'brush': {
      const points = element.points || [];
      const kind = element.brushKind || 'round';
      const flow = Math.max(.08, Math.min(1, element.brushFlow ?? opacity));
      const jitter = Math.max(0, element.brushJitter ?? 0);
      if (kind === 'spray' || kind === 'stipple' || kind === 'stain') {
        const every = kind === 'spray' ? 2 : kind === 'stipple' ? 4 : 7;
        return <g opacity={flow} style={selectionStyle}>{points.filter((_,i)=>i%every===0).flatMap((point,index)=>{
          const count = kind === 'spray' ? 7 : kind === 'stipple' ? 3 : 2;
          return Array.from({length:count},(_,k)=>{
            const seed=(index+1)*(k+3)*12.9898;
            const dx=Math.sin(seed)*strokeWidth*(kind==='spray'?1.8:.55+jitter*.03);
            const dy=Math.cos(seed*.77)*strokeWidth*(kind==='spray'?1.8:.55+jitter*.03);
            const r=kind==='stain' ? strokeWidth*(.35+.18*((index+k)%3)) : Math.max(1,strokeWidth*(kind==='spray'?.05:.11)*(1+((index+k)%3)*.35));
            return <circle key={`${index}-${k}`} cx={point.x+dx} cy={point.y+dy} r={r} fill={stroke} opacity={kind==='stain'?.34+.12*((index+k)%3):.75}/>;
          });
        })}</g>;
      }
      const hasPressure = points.some((point) => typeof point.pressure === 'number');
      if (hasPressure && points.length > 1 && !['dry','chalk'].includes(kind)) {
        return <g opacity={flow} style={selectionStyle}>{points.slice(1).map((point, index) => {
          const previous = points[index];
          const pressure = Math.max(0.08, Math.min(1, ((previous.pressure ?? .55) + (point.pressure ?? .55)) / 2));
          const multiplier = kind === 'pencil' ? .6 : kind === 'calligraphy' ? 1.15 : 1;
          const width = strokeWidth * (.4 + pressure) * multiplier;
          return <line key={index} x1={previous.x} y1={previous.y} x2={point.x} y2={point.y} stroke={stroke} strokeWidth={width} strokeLinecap={kind==='marker'||kind==='calligraphy'?'square':'round'} vectorEffect="non-scaling-stroke" opacity={kind==='pencil'?.72:1}/>;
        })}</g>;
      }
      return <path d={pointsToPath(points)} fill="none" stroke={stroke} strokeWidth={kind==='marker'?strokeWidth*1.15:strokeWidth} strokeLinecap={kind==='marker'||kind==='calligraphy'?'square':'round'} strokeLinejoin="round" opacity={kind==='pencil'?flow*.72:flow} strokeDasharray={kind==='dry'?'14 5 3 7':kind==='chalk'?'5 3':undefined} vectorEffect="non-scaling-stroke" style={selectionStyle} />;
    }
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
    case 'text': {
      const size = element.fontSize || 32;
      const lines = (element.text || '').split('\n');
      return (
        <text x={x} y={y} fill={stroke} fontSize={size} fontFamily={element.fontFamily || 'Inter'} opacity={opacity} style={selectionStyle}>
          {lines.map((line, index) => (
            <tspan key={`${element.id}-line-${index}`} x={x} dy={index === 0 ? 0 : size * 1.2}>{line || ' '}</tspan>
          ))}
        </text>
      );
    }
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
  if(element.hidden)return '';
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
    case 'image':return `<image href="${escapeXml(element.imageUrl || '')}" x="${bounds.minX}" y="${bounds.minY}" width="${bounds.width}" height="${bounds.height}" opacity="${opacity}" preserveAspectRatio="xMidYMid meet"/>`;
    case 'brush': {
      const pts = element.points || [];
      const kind = element.brushKind || 'round';
      const flow = Math.max(.08,Math.min(1,element.brushFlow ?? opacity));
      if (kind === 'spray' || kind === 'stipple' || kind === 'stain') {
        const every=kind==='spray'?2:kind==='stipple'?4:7;
        return `<g opacity="${flow}">${pts.filter((_,i)=>i%every===0).flatMap((point,index)=>Array.from({length:kind==='spray'?7:kind==='stipple'?3:2},(_,k)=>{const seed=(index+1)*(k+3)*12.9898;const dx=Math.sin(seed)*strokeWidth*(kind==='spray'?1.8:.55);const dy=Math.cos(seed*.77)*strokeWidth*(kind==='spray'?1.8:.55);const r=kind==='stain'?strokeWidth*(.35+.18*((index+k)%3)):Math.max(1,strokeWidth*(kind==='spray'?.05:.11));return `<circle cx="${point.x+dx}" cy="${point.y+dy}" r="${r}" fill="${escapeXml(stroke)}" opacity="${kind==='stain'?.4:.78}"/>`;}).join('')).join('')}</g>`;
      }
      const pressured = pts.some((point) => typeof point.pressure === 'number');
      if (pressured && pts.length > 1 && !['dry','chalk'].includes(kind)) return `<g opacity="${flow}">${pts.slice(1).map((point,index)=>{ const prev=pts[index]; const pressure=Math.max(.08,Math.min(1,((prev.pressure??.55)+(point.pressure??.55))/2)); const width=strokeWidth*(.4+pressure)*(kind==='pencil'?.6:kind==='calligraphy'?1.15:1); return `<line x1="${prev.x}" y1="${prev.y}" x2="${point.x}" y2="${point.y}" stroke="${escapeXml(stroke)}" stroke-width="${width}" stroke-linecap="${kind==='marker'||kind==='calligraphy'?'square':'round'}"/>`; }).join('')}</g>`;
      const dash=kind==='dry'?' stroke-dasharray="14 5 3 7"':kind==='chalk'?' stroke-dasharray="5 3"':'';
      return `<path d="${pointsToPath(pts)}" fill="none" stroke="${escapeXml(stroke)}" stroke-width="${strokeWidth}" stroke-linecap="${kind==='marker'||kind==='calligraphy'?'square':'round'}" stroke-linejoin="round" opacity="${flow}"${dash}/>`;
    }
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
    case 'text': {
      const size = element.fontSize || 32;
      const lines = (element.text || '').split('\n');
      const tspans = lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : size * 1.2}">${escapeXml(line || ' ')}</tspan>`).join('');
      return `<text x="${x}" y="${y}" fill="${escapeXml(stroke)}" font-size="${size}" font-family="${escapeXml(element.fontFamily || 'Inter')}" opacity="${opacity}">${tspans}</text>`;
    }
    default: return '';
  }
};

export const drawingToSvgString = (drawing: DrawingDocument) => {
  const body = drawing.elements.map(elementToSvgString).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${drawing.width}" height="${drawing.height}" viewBox="0 0 ${drawing.width} ${drawing.height}"><rect width="100%" height="100%" fill="${escapeXml(drawing.background || '#FFFFFF')}"/>${body}</svg>`;
};

const trimmedDrawings = new WeakMap<DrawingDocument,string>();
// Video uses the artwork's bounds, without changing the saved drawing sheet.
export function drawingToVideoSvg(drawing:DrawingDocument){
 if(trimmedDrawings.has(drawing))return trimmedDrawings.get(drawing)!;
 if(typeof document==='undefined')return drawingToSvgString(drawing);
 const visible=drawing.elements.filter(e=>!e.hidden);if(!visible.length)return drawingToSvgString(drawing);
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('width',String(drawing.width));svg.setAttribute('height',String(drawing.height));svg.style.cssText='position:fixed;left:-100000px;top:0;visibility:hidden;pointer-events:none';
 const group=document.createElementNS('http://www.w3.org/2000/svg','g');group.innerHTML=visible.map(elementToSvgString).join('');svg.appendChild(group);document.body.appendChild(svg);
 try{const b=group.getBBox();if(!b.width||!b.height)return drawingToSvgString(drawing);const pad=Math.max(8,...visible.map(e=>(e.strokeWidth||1)*2));const x=b.x-pad,y=b.y-pad,w=b.width+2*pad,h=b.height+2*pad;const result=`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet">${group.innerHTML}</svg>`;trimmedDrawings.set(drawing,result);return result;}finally{svg.remove()}
}

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

const shapeIcon = (tool: DrawingTool) => {
  if (tool === 'line' || tool === 'arrow') return <Minus size={18} />;
  if (tool === 'ellipse' || tool === 'sphere') return <Circle size={18} />;
  if (tool === 'triangle' || tool === 'cone' || tool === 'pyramid') return <Triangle size={18} />;
  if (tool === 'star') return <Star size={18} />;
  return <Square size={18} />;
};

const isShapeTool = (tool: DrawingTool) => SHAPE_TOOLS.some((item) => item.tool === tool);

type MobilePanel = 'style' | 'shapes' | 'export' | null;

type TextEditorState = {
  x: number;
  y: number;
  left: number;
  top: number;
  value: string;
};

export default function DrawingStudio({ drawing, defaultFontFamily = 'Inter', title = 'Folha de desenho', canEdit = true, allDrawings = [], onSave, onAnimate, onWireframe, onClose }: DrawingStudioProps) {
  const initial = useMemo(() => cloneDrawing(drawing), [drawing]);
  const [history, setHistory] = useState<DrawingDocument[]>([initial]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [tool, setTool] = useState<DrawingTool>('brush');
  const [strokeColor, setStrokeColor] = useState('#111111');
  const [fillColor, setFillColor] = useState('#FFFFFF');
  const [useFill, setUseFill] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(44);
  const [fontFamily, setFontFamily] = useState(defaultFontFamily);
  const [stabilization, setStabilization] = useState(36);
  const [pressureEnabled, setPressureEnabled] = useState(true);
  const [brushKind, setBrushKind] = useState<DrawingBrushKind>('round');
  const [brushOpacity, setBrushOpacity] = useState(1);
  const [brushFlow, setBrushFlow] = useState(1);
  const [brushSpacing, setBrushSpacing] = useState(8);
  const [brushJitter, setBrushJitter] = useState(0);
  const [symmetry, setSymmetry] = useState<DrawingSymmetry>('none');
  const [fontFamilies, setFontFamilies] = useState<string[]>(FALLBACK_FONTS);
  const [fontSearch, setFontSearch] = useState('');
  const [draft, setDraft] = useState<DrawingElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [desktopShapesOpen, setDesktopShapesOpen] = useState(false);
  const [textEditor, setTextEditor] = useState<TextEditorState | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const paperRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLTextAreaElement>(null);
  const [imageLibraryOpen,setImageLibraryOpen]=useState(false),[photopeaOpen,setPhotopeaOpen]=useState(false),[imageError,setImageError]=useState('');
  const imageInput=useRef<HTMLInputElement>(null);
  const current = history[historyIndex];

  useEffect(()=>{let alive=true;fetch('/api/google-fonts').then(r=>r.json()).then(d=>{if(alive && Array.isArray(d.items))setFontFamilies(d.items.map((i:any)=>i.family))}).catch(()=>{});return()=>{alive=false}},[]);
  useGraphicFonts([fontFamily,...current.elements.map(e=>e.fontFamily)]);

  useEffect(() => {
    if (textEditor) {
      requestAnimationFrame(() => textInputRef.current?.focus());
    }
  }, [textEditor]);

  const commit = (next: DrawingDocument) => {
    const truncated = history.slice(0, historyIndex + 1);
    const nextHistory = [...truncated, cloneDrawing(next)].slice(-60);
    setHistory(nextHistory);
    setHistoryIndex(nextHistory.length - 1);
  };

  const addImageFile=async(file:File,credit?:DrawingElement['imageCredit'],replaceId?:string)=>{
    if(!canEdit)return;if(file.size>4*1024*1024)throw new Error('Use uma imagem de até 4 MB.');
    const url=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Não foi possível ler a imagem.'));reader.readAsDataURL(file);});
    const image=new Image();await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error('A imagem não pôde ser aberta.'));image.src=url;});
    const scale=Math.min(current.width*.8/image.naturalWidth,current.height*.8/image.naturalHeight,1),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
    const existing=replaceId?current.elements.find(item=>item.id===replaceId):undefined;
    const element:DrawingElement=existing?{...existing,imageUrl:url,imageName:file.name}:{id:`image-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,type:'image',stroke:'none',strokeWidth:0,imageUrl:url,imageName:file.name,x:(current.width-w)/2,y:(current.height-h)/2,x2:(current.width+w)/2,y2:(current.height+h)/2,opacity:1,imageCredit:credit};
    commit({...current,elements:existing?current.elements.map(item=>item.id===existing.id?element:item):[...current.elements,element]});setSelectedElementId(element.id);chooseTool('select');
  };
  const addLibraryImage=async(item:OpenImage)=>{const response=await fetch(item.url);if(!response.ok)throw new Error('A fonte não permitiu baixar a imagem. Escolha outra imagem ou envie o arquivo.');const blob=await response.blob();await addImageFile(new File([blob],item.title,{type:blob.type}),imageCredit(item));setImageLibraryOpen(false);};
  const moveLayer=(elementId:string,offset:number)=>{const elements=[...current.elements],from=elements.findIndex(item=>item.id===elementId),to=from+offset;if(to<0 || to>=elements.length)return;[elements[from],elements[to]]=[elements[to],elements[from]];commit({...current,elements});};
  const getSvgPointFromClient = (clientX: number, clientY: number, pressure = .55, t = performance.now()): DrawingPoint => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0, pressure, t };
    const point = svg.createSVGPoint();
    point.x = clientX;
    point.y = clientY;
    const matrix = svg.getScreenCTM();
    if (!matrix) return { x: 0, y: 0, pressure, t };
    const transformed = point.matrixTransform(matrix.inverse());
    return {
      x: clamp(transformed.x, 0, current.width),
      y: clamp(transformed.y, 0, current.height),
      pressure: pressureEnabled ? Math.max(.08, Math.min(1, pressure || .55)) : .55,
      t,
    };
  };

  const getSvgPoint = (event: React.PointerEvent<SVGSVGElement>) =>
    getSvgPointFromClient(event.clientX, event.clientY, event.pointerType === 'pen' ? event.pressure : .55, event.timeStamp);

  const drawingWithPendingText = () => {
    if (!textEditor || !textEditor.value.trim()) return current;
    const element: DrawingElement = {
      id: makeElementId(),
      type: 'text',
      stroke: strokeColor,
      strokeWidth,
      x: textEditor.x,
      y: textEditor.y,
      text: textEditor.value.trimEnd(),
      fontSize,
      fontFamily,
    };
    return { ...current, elements: [...current.elements, element] };
  };

  const commitTextEditor = () => {
    if (!textEditor) return;
    const next = drawingWithPendingText();
    if (next !== current) commit(next);
    setTextEditor(null);
  };

  const saveDrawing = () => {
    const next = drawingWithPendingText();
    if (next !== current) {
      commit(next);
      setTextEditor(null);
    }
    onSave(next);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!canEdit) return;
    event.preventDefault();
    event.stopPropagation();
    const point = getSvgPoint(event);
    const target = event.target as SVGElement;
    const hitId = target.closest('[data-drawing-element-id]')?.getAttribute('data-drawing-element-id') || null;

    if (tool === 'select') {
      setSelectedElementId(hitId);
      return;
    }

    if (tool === 'text') {
      const paperRect = paperRef.current?.getBoundingClientRect();
      setTextEditor({
        x: point.x,
        y: point.y,
        left: paperRect ? event.clientX - paperRect.left : 0,
        top: paperRect ? event.clientY - paperRect.top : 0,
        value: '',
      });
      setSelectedElementId(null);
      return;
    }

    event.currentTarget.setPointerCapture?.(event.pointerId);
    setSelectedElementId(null);

    if (tool === 'brush') {
      setDraft({
        id: makeElementId(),
        type: 'brush',
        stroke: strokeColor,
        strokeWidth,
        fill: 'none',
        opacity: brushOpacity,
        brushKind,
        brushFlow,
        brushSpacing,
        brushJitter,
        symmetry,
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
    if (draft.type === 'brush') {
      const native = event.nativeEvent as PointerEvent;
      const coalesced = typeof native.getCoalescedEvents === 'function' ? native.getCoalescedEvents() : [native];
      const nextPoints = [...(draft.points || [])];
      for (const sample of coalesced) {
        const raw = getSvgPointFromClient(sample.clientX, sample.clientY, sample.pointerType === 'pen' ? sample.pressure : .55, sample.timeStamp);
        const previous = nextPoints[nextPoints.length - 1];
        if (!previous) { nextPoints.push(raw); continue; }
        const smoothing = Math.max(0, Math.min(.88, stabilization / 100 * .88));
        const point: DrawingPoint = {
          x: previous.x * smoothing + raw.x * (1 - smoothing),
          y: previous.y * smoothing + raw.y * (1 - smoothing),
          pressure: raw.pressure,
          t: raw.t,
        };
        if (Math.hypot(point.x - previous.x, point.y - previous.y) < .35) continue;
        nextPoints.push(point);
      }
      setDraft({ ...draft, points: nextPoints.slice(-2400) });
      return;
    }
    const point = getSvgPoint(event);
    setDraft({ ...draft, x2: point.x, y2: point.y });
  };

  const defaultSizedElement = (element: DrawingElement) => {
    const x = element.x ?? 0;
    const y = element.y ?? 0;
    const horizontalOnly = element.type === 'line' || element.type === 'arrow';
    const desiredX = x + 180 <= current.width ? x + 180 : Math.max(0, x - 180);
    const desiredY = horizontalOnly ? y : y + 120 <= current.height ? y + 120 : Math.max(0, y - 120);
    return { ...element, x2: desiredX, y2: desiredY };
  };

  const finishDraft = (event?: React.PointerEvent<SVGSVGElement>) => {
    if (event) {
      try { event.currentTarget.releasePointerCapture?.(event.pointerId); } catch { /* pointer may already be released */ }
    }
    if (!draft) return;
    if (draft.type === 'brush') {
      if ((draft.points?.length || 0) > 1) {
        const copies: DrawingElement[] = [draft];
        const mirror = (axis:'vertical'|'horizontal'|'both', suffix:string):DrawingElement => ({
          ...draft,
          id: `${draft.id}-${suffix}`,
          symmetry:'none',
          points:(draft.points||[]).map((point)=>({
            ...point,
            x: axis==='vertical'||axis==='both' ? current.width-point.x : point.x,
            y: axis==='horizontal'||axis==='both' ? current.height-point.y : point.y,
          })),
        });
        if (draft.symmetry === 'vertical' || draft.symmetry === 'both') copies.push(mirror('vertical','mv'));
        if (draft.symmetry === 'horizontal' || draft.symmetry === 'both') copies.push(mirror('horizontal','mh'));
        if (draft.symmetry === 'both') copies.push(mirror('both','mb'));
        commit({ ...current, elements: [...current.elements, ...copies] });
      }
      setDraft(null);
      return;
    }

    const distance = Math.abs((draft.x2 ?? 0) - (draft.x ?? 0)) + Math.abs((draft.y2 ?? 0) - (draft.y ?? 0));
    const finished = distance > 4 ? draft : defaultSizedElement(draft);
    commit({ ...current, elements: [...current.elements, finished] });
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

  const chooseTool = (nextTool: DrawingTool) => {
    setTool(nextTool);
    setDraft(null);
    setTextEditor(null);
    if (nextTool !== 'select') setSelectedElementId(null);
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      if (nextTool === 'brush' || nextTool === 'text' || isShapeTool(nextTool)) setMobilePanel('style');
      else setMobilePanel(null);
    }
  };

  const activeShape = SHAPE_TOOLS.find((item) => item.tool === tool);

  return (
    <div className="studio-editor fixed inset-0 z-[100] bg-[#ECECEA] flex flex-col canvas-control" onPointerDown={(event) => event.stopPropagation()}>
      {imageLibraryOpen && <ImageLibrary onChoose={addLibraryImage} onClose={()=>setImageLibraryOpen(false)}/>}
      {photopeaOpen && <PhotopeaEditor url={current.elements.find(item=>item.id===selectedElementId && item.type==='image')?.imageUrl || 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(drawingToSvgString(current))} name={title} onSave={file=>addImageFile(file,undefined,current.elements.find(item=>item.id===selectedElementId && item.type==='image')?.id)} onClose={()=>setPhotopeaOpen(false)}/>}
      <header className="shrink-0 bg-white border-b border-black/10 px-2 sm:px-4 py-2 flex items-center gap-2 justify-between" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="min-w-0 flex items-center gap-2">
          <button type="button" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Fechar folha"><X size={18} /></button>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{title}</div>
            <div className="text-[10px] font-mono text-neutral-500">{current.width} × {current.height}px · {current.elements.length} elementos</div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button type="button" disabled={!canEdit || historyIndex <= 0} onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)} className="h-10 w-10 rounded-xl border border-black/10 bg-white disabled:opacity-30 flex items-center justify-center cursor-pointer" title="Desfazer"><Undo2 size={16} /></button>
          <button type="button" disabled={!canEdit || historyIndex >= history.length - 1} onClick={() => historyIndex < history.length - 1 && setHistoryIndex(historyIndex + 1)} className="h-10 w-10 rounded-xl border border-black/10 bg-white disabled:opacity-30 flex items-center justify-center cursor-pointer" title="Refazer"><Redo2 size={16} /></button>
          <button type="button" onClick={() => setMobilePanel(mobilePanel === 'export' ? null : 'export')} className="hidden h-10 w-10 rounded-xl border border-black/10 bg-white flex items-center justify-center" aria-label="Exportar desenho"><Download size={16} /></button>
          {onWireframe && <button type="button" disabled={!canEdit} onClick={() => onWireframe(drawingWithPendingText())} className="h-10 px-3 rounded-xl border border-black bg-white flex items-center gap-1.5 text-[10px] font-mono font-bold disabled:opacity-40" title="Transformar este desenho em wireframe editável"><PanelsTopLeft size={15}/><span className="hidden sm:inline">WIREFRAME</span></button>}
          {onAnimate && <button type="button" disabled={!canEdit} onClick={() => onAnimate(drawingWithPendingText())} className="h-10 px-3 rounded-xl border border-black bg-white flex items-center gap-1.5 text-[10px] font-mono font-bold disabled:opacity-40" title="Animar este desenho na Camada Interativa"><WandSparkles size={15}/><span className="hidden sm:inline">ANIMAR</span></button>}
          <button type="button" onClick={saveDrawing} className="h-10 px-3 rounded-xl bg-black text-white flex items-center gap-1.5 text-xs font-mono cursor-pointer"><Save size={15} /><span className="hidden sm:inline">SALVAR</span></button>
        </div>
      </header>

<StudioWorkspace tools={<div><div className="image-integration-actions"><input type="file" accept="image/*" ref={imageInput} hidden onChange={async event=>{const file=event.target.files?.[0];if(file)try{await addImageFile(file);setImageError('');}catch(error:any){setImageError(error.message);}event.target.value='';}}/><button type="button" disabled={!canEdit} onClick={()=>imageInput.current?.click()}><ImagePlus size={16}/>Adicionar imagem como camada</button><button type="button" disabled={!canEdit} onClick={()=>setImageLibraryOpen(true)}><ImagePlus size={16}/>Pesquisar imagens livres</button><button type="button" disabled={!canEdit} onClick={()=>setPhotopeaOpen(true)}><Layers size={16}/>Editar no Photopea</button><p>Selecione uma imagem para editá-la. Sem seleção, a folha retorna como uma nova camada de imagem.</p>{imageError && <p role="alert">{imageError}</p>}</div><details className="drawing-layer-list" open><summary>Camadas · {current.elements.length}</summary>{[...current.elements].reverse().map((element,index)=><div key={element.id}><button type="button" aria-label={`Selecionar camada ${index+1}`} aria-pressed={element.id===selectedElementId} onClick={()=>{setSelectedElementId(element.id);chooseTool('select');}}>{element.imageName || element.text || element.type}</button><button type="button" disabled={!canEdit} aria-label={`Visibilidade da camada ${index+1}`} aria-pressed={!element.hidden} onClick={()=>commit({...current,elements:current.elements.map(item=>item.id===element.id?{...item,hidden:!item.hidden}:item)})}>{element.hidden?<EyeOff size={16}/>:<Eye size={16}/>}</button><button type="button" disabled={!canEdit} aria-label={`Subir camada ${index+1}`} onClick={()=>moveLayer(element.id,1)}><ArrowUp size={16}/></button><button type="button" disabled={!canEdit} aria-label={`Descer camada ${index+1}`} onClick={()=>moveLayer(element.id,-1)}><ArrowDown size={16}/></button>{element.imageCredit && <a href={element.imageCredit.sourceUrl} target="_blank" rel="noreferrer" title={`${element.imageCredit.author} · ${element.imageCredit.license}`}>Créditos</a>}</div>)}</details>      {/* Painel desktop estruturado: sem rolagem horizontal e com propriedades contextuais. */}
      <div className="flex shrink-0 bg-white border-b border-black/10 flex-col">
        <div className="px-3 lg:px-4 py-2 flex flex-wrap items-center gap-2 border-b border-black/5">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolButton active={tool === 'select'} onClick={() => { chooseTool('select'); setDesktopShapesOpen(false); }} label="Selecionar"><ArrowLeftRight size={15} /></ToolButton>
            <ToolButton active={tool === 'brush'} onClick={() => { chooseTool('brush'); setDesktopShapesOpen(false); }} label="Pincel"><Pencil size={15} /></ToolButton>
            <ToolButton active={tool === 'text'} onClick={() => { chooseTool('text'); setDesktopShapesOpen(false); }} label="Texto"><Type size={15} /></ToolButton>
            <ToolButton active={tool === 'line'} onClick={() => { chooseTool('line'); setDesktopShapesOpen(false); }} label="Linha"><Minus size={15} /></ToolButton>
            <ToolButton active={tool === 'arrow'} onClick={() => { chooseTool('arrow'); setDesktopShapesOpen(false); }} label="Seta"><Minus size={15} /></ToolButton>
            <button
              type="button"
              onClick={() => setDesktopShapesOpen((open) => !open)}
              className={`h-8 px-2.5 rounded-lg border flex items-center gap-1.5 text-[10px] font-mono uppercase cursor-pointer ${desktopShapesOpen || (isShapeTool(tool) && tool !== 'line' && tool !== 'arrow') ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-black/10 hover:border-black/30'}`}
              title="Abrir paleta de formas"
            >
              <Square size={15} />
              <span>{activeShape && tool !== 'line' && tool !== 'arrow' ? activeShape.label : 'Formas'}</span>
            </button>
          </div>

          <div className="h-6 w-px bg-black/10 mx-1" />

          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" disabled={!canEdit || !selectedElementId} onClick={deleteSelected} className="h-8 px-2.5 rounded-lg border border-black/10 text-[10px] font-mono uppercase flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"><Trash2 size={14} /> Excluir</button>
            <button type="button" disabled={!canEdit || current.elements.length === 0} onClick={eraseLast} className="h-8 px-2.5 rounded-lg border border-black/10 text-[10px] font-mono uppercase flex items-center gap-1.5 disabled:opacity-30 cursor-pointer"><Eraser size={14} /> Último</button>
            <button type="button" disabled={!canEdit || current.elements.length === 0} onClick={() => commit({ ...current, elements: [] })} className="h-8 px-2.5 rounded-lg border border-red-200 text-red-700 text-[10px] font-mono uppercase disabled:opacity-30 cursor-pointer">Limpar folha</button>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-1">
            <span className="text-[9px] font-mono text-neutral-400 uppercase mr-1">Exportar</span>
            {(['svg', 'png', 'jpg'] as ExportFormat[]).map((format) => (
              <button key={format} type="button" disabled={exporting} onClick={() => void handleExport(format)} className="h-8 px-2.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-[10px] font-mono uppercase flex items-center gap-1 disabled:opacity-50 cursor-pointer"><Download size={13} /> {format}</button>
            ))}
            {allDrawings.length > 1 && (['svg', 'png', 'jpg'] as ExportFormat[]).map((format) => (
              <button key={`all-${format}`} type="button" disabled={exporting} onClick={() => void handleExport(format, 'all')} className="h-8 px-2.5 rounded-lg border border-black text-[9px] font-mono uppercase disabled:opacity-50 cursor-pointer">TODAS {format}</button>
            ))}
          </div>
        </div>

        {desktopShapesOpen && (
          <div className="px-3 lg:px-4 py-2 border-b border-black/5 bg-[#FAFAF8]">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">Formas 2D e 3D</span>
              <span className="text-[9px] text-neutral-400">Escolha uma forma e desenhe diretamente na folha.</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SHAPE_TOOLS.filter((item) => item.tool !== 'line' && item.tool !== 'arrow').map((item) => (
                <button
                  key={item.tool}
                  type="button"
                  onClick={() => { chooseTool(item.tool); setDesktopShapesOpen(false); }}
                  className={`min-h-10 rounded-lg border px-2 flex items-center justify-center gap-1.5 text-[9px] font-mono uppercase ${tool === item.tool ? 'bg-black text-white border-black' : 'bg-white border-black/10 hover:border-black/30'}`}
                  title={item.label}
                >
                  {shapeIcon(item.tool)} <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-3 lg:px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 bg-white">
          <div className="flex items-center gap-2 min-w-fit">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500">{tool === 'select' ? 'Seleção' : tool === 'brush' ? 'Pincel' : tool === 'text' ? 'Texto' : activeShape?.label || 'Ferramenta'}</span>
          </div>

          {tool !== 'select' && (
            <>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[9px] font-mono text-neutral-400 uppercase mr-1">Traço</span>
                {PALETTE.map((color) => (
                  <button key={color} type="button" onClick={() => setStrokeColor(color)} className={`h-6 w-6 rounded-full border cursor-pointer ${strokeColor === color ? 'ring-2 ring-black ring-offset-1' : 'border-black/20'}`} style={{ backgroundColor: color }} aria-label={`Cor ${color}`} />
                ))}
                <input type="color" value={strokeColor} onChange={(event) => setStrokeColor(event.target.value)} className="h-7 w-8 rounded border border-black/15 bg-white" title="Cor personalizada" />
              </div>

              {tool !== 'text' && (
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-neutral-400 uppercase">Espessura</span>
                  <input type="range" min="1" max="40" value={strokeWidth} onChange={(event) => setStrokeWidth(Number(event.target.value))} className="w-24 lg:w-32" />
                  <span className="text-[10px] font-mono w-8">{strokeWidth}px</span>
                </div>
              )}

              {tool === 'brush' && (
                <div className="w-full rounded-xl bg-neutral-50 p-2 space-y-2">
                  <div className="grid grid-cols-5 gap-1.5">{BRUSH_PRESETS.map((preset)=><button key={preset.id} type="button" onClick={()=>{setBrushKind(preset.id);setStrokeWidth(preset.width);setBrushOpacity(preset.opacity);setBrushFlow(preset.opacity)}} className={`min-h-12 rounded-lg border px-2 py-1 text-[9px] font-mono ${brushKind===preset.id?'bg-black text-white border-black':'bg-white border-black/10'}`} title={preset.note}><span className="block font-bold">{preset.label}</span><span className={`block text-[8px] ${brushKind===preset.id?'text-white/65':'text-neutral-400'}`}>{preset.note}</span></button>)}</div>
                  <div className="flex flex-wrap items-center gap-3">
                    <SlidersHorizontal size={13} className="text-neutral-400"/>
                    <label className="text-[9px] font-mono uppercase flex items-center gap-1.5">Estabilização <input type="range" min="0" max="90" value={stabilization} onChange={(event)=>setStabilization(Number(event.target.value))} className="w-20"/><b>{stabilization}%</b></label>
                    <label className="text-[9px] font-mono uppercase flex items-center gap-1.5">Fluxo <input type="range" min=".1" max="1" step=".05" value={brushFlow} onChange={(event)=>setBrushFlow(Number(event.target.value))} className="w-20"/><b>{Math.round(brushFlow*100)}%</b></label>
                    <label className="text-[9px] font-mono uppercase flex items-center gap-1.5">Opacidade <input type="range" min=".1" max="1" step=".05" value={brushOpacity} onChange={(event)=>setBrushOpacity(Number(event.target.value))} className="w-20"/><b>{Math.round(brushOpacity*100)}%</b></label>
                    <label className="text-[9px] font-mono uppercase flex items-center gap-1.5">Jitter <input type="range" min="0" max="30" value={brushJitter} onChange={(event)=>setBrushJitter(Number(event.target.value))} className="w-20"/></label>
                    <label className="text-[9px] font-mono uppercase flex items-center gap-1 cursor-pointer"><input type="checkbox" checked={pressureEnabled} onChange={(event)=>setPressureEnabled(event.target.checked)}/> Pressão</label>
                    <select value={symmetry} onChange={(event)=>setSymmetry(event.target.value as DrawingSymmetry)} className="h-8 rounded-lg border bg-white px-2 text-[9px] font-mono uppercase">{SYMMETRY_OPTIONS.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</select>
                  </div>
                </div>
              )}
            </>
          )}

          {tool === 'text' && (
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <span className="text-[9px] font-mono text-neutral-400 uppercase">Tipografia</span>
              <select value={fontFamily} onChange={(event) => setFontFamily(event.target.value)} className="h-8 w-[180px] lg:w-[220px] rounded-lg border border-black/10 bg-white px-2 text-[10px]" style={{ fontFamily }}>
                {fontFamilies.map((family) => <option key={family} value={family}>{family}</option>)}
              </select>
              <input type="range" min="12" max="180" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} className="w-28" />
              <span className="text-[10px] font-mono w-10">{fontSize}px</span>
            </div>
          )}

          {isShapeTool(tool) && tool !== 'line' && tool !== 'arrow' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="text-[9px] font-mono uppercase flex items-center gap-1.5 cursor-pointer"><input type="checkbox" checked={useFill} onChange={(event) => setUseFill(event.target.checked)} /> Preenchimento</label>
              {useFill && (
                <>
                  <span className="h-6 w-px bg-black/10" />
                  {PALETTE.map((color) => (
                    <button key={`desktop-fill-${color}`} type="button" onClick={() => setFillColor(color)} className={`h-6 w-6 rounded-full border cursor-pointer ${fillColor === color ? 'ring-2 ring-black ring-offset-1' : 'border-black/20'}`} style={{ backgroundColor: color }} aria-label={`Preenchimento ${color}`} />
                  ))}
                  <input type="color" value={fillColor} onChange={(event) => setFillColor(event.target.value)} className="h-7 w-8 rounded border border-black/15 bg-white" title="Cor de preenchimento" />
                </>
              )}
            </div>
          )}

          {tool === 'select' && (
            <span className="text-[10px] text-neutral-500">Selecione um elemento na folha para mover ou excluir.</span>
          )}
        </div>
      </div>

</div>}>      <main className="flex-1 min-h-0 p-2 md:p-5 pb-5 overflow-auto flex items-start justify-center bg-[#ECECEA]">
        <div ref={paperRef} className="relative w-full max-w-[1400px] min-w-[280px] flex justify-center">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${current.width} ${current.height}`}
            preserveAspectRatio="xMidYMid meet"
            className="block w-full h-auto max-h-[calc(100dvh-145px)] md:max-h-[calc(100dvh-150px)] bg-white shadow-2xl border border-black/10"
            style={{ touchAction: 'none', cursor: tool === 'select' ? 'default' : tool === 'text' ? 'text' : 'crosshair' }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDraft}
            onPointerCancel={finishDraft}
          >
            <rect width={current.width} height={current.height} fill={current.background || '#FFFFFF'} />
            {current.elements.map((element) => (
              <g key={element.id} data-drawing-element-id={element.id}>
                {renderDrawingElement(element, selectedElementId === element.id)}
              </g>
            ))}
            {draft && <g opacity={0.85}>{renderDrawingElement(draft)}</g>}
          </svg>

          {textEditor && (
            <textarea
              ref={textInputRef}
              value={textEditor.value}
              onChange={(event) => setTextEditor({ ...textEditor, value: event.target.value })}
              onBlur={commitTextEditor}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  event.preventDefault();
                  setTextEditor(null);
                }
                if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  commitTextEditor();
                }
              }}
              placeholder="Digite aqui…"
              className="absolute z-20 min-w-[120px] max-w-[min(78vw,520px)] min-h-[48px] border-0 bg-transparent p-0 outline-none resize-none overflow-hidden"
              style={{
                left: textEditor.left,
                top: textEditor.top,
                color: strokeColor,
                fontSize: `${Math.max(16, Math.min(42, fontSize * 0.62))}px`,
                fontFamily,
                lineHeight: 1.15,
                caretColor: strokeColor,
                transform: 'translateY(-0.15em)',
                touchAction: 'manipulation',
              }}
              aria-label="Texto do desenho"
            />
          )}
        </div>
      </main></StudioWorkspace>

      <footer className="hidden md:flex shrink-0 bg-white border-t border-black/10 px-3 py-1.5 text-[10px] font-mono text-neutral-500 items-center justify-between gap-3">
        <span className="truncate">Caneta/touch: desenhe diretamente. Formas: toque e arraste ou apenas toque para inserir. Texto: escolha T e toque na folha.</span>
        <span className="shrink-0">SVG vetorial · PNG/JPG raster</span>
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

function MobileToolButton({ active, onClick, label, children }: { active: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 px-1 text-[9px] font-mono leading-none ${active ? 'bg-black text-white' : 'bg-white text-neutral-700'}`}
      title={label}
      style={{ touchAction: 'manipulation' }}
    >
      {children}
      <span className="max-w-full truncate">{label}</span>
    </button>
  );
}
