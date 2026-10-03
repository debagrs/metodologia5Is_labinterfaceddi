import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Copy, Download, Info, Loader2, Pause, Play, Plus, RotateCcw, Save, Sparkles, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import {
  CharacterAccessory,
  CharacterBodyShape,
  CharacterBuilderConfig,
  CharacterConceptSheet,
  CharacterExpression,
  CharacterEyeStyle,
  CharacterHairStyle,
  CharacterHeadShape,
  CharacterMouthStyle,
  CharacterNoseStyle,
  CharacterOutfitStyle,
  CharacterPose,
  CharacterSpriteDocument,
  SpriteAnimation,
  SpriteAnimationKind,
  SpriteFrame,
  SpriteMotionPreset,
} from '../types';
import { ensureTursoSession } from '../lib/turso';
import VoiceDictationButton from './VoiceDictationButton';

export interface SpriteAssetOption {
  id: string;
  name: string;
  url: string;
  source: 'project' | 'upload';
}

interface Props {
  document: CharacterSpriteDocument;
  title?: string;
  canEdit?: boolean;
  availableAssets?: SpriteAssetOption[];
  onSave: (document: CharacterSpriteDocument) => void;
  onClose: () => void;
}

type Tab = 'builder' | 'concept' | 'poses' | 'animation' | 'ai';

const makeId = (prefix = 'sprite') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const esc = (s: string) => String(s || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string));
const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const normalizeHex = (value: string, fallback = '#111111') => {
  const cleaned = String(value || '').trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{3}$/.test(cleaned)) return `#${cleaned.split('').map((x) => x + x).join('')}`;
  if (/^[0-9A-F]{6}$/.test(cleaned)) return `#${cleaned}`;
  return fallback;
};
const deepClone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const KINDS: Array<{ id: SpriteAnimationKind; label: string }> = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Andar' },
  { id: 'run', label: 'Correr' },
  { id: 'jump', label: 'Pular' },
  { id: 'attack', label: 'Ação' },
  { id: 'hurt', label: 'Reação' },
  { id: 'custom', label: 'Custom' },
];

const MOTIONS: Array<{ id: SpriteMotionPreset; label: string }> = [
  { id: 'none', label: 'Sem movimento extra' },
  { id: 'bob', label: 'Flutuar' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'shake', label: 'Tremer' },
  { id: 'pulse', label: 'Pulsar' },
  { id: 'squash', label: 'Squash & stretch' },
];

const BODY: Array<{ id: CharacterBodyShape; label: string; tip: string }> = [
  { id: 'slim', label: 'Esguio', tip: 'Silhueta estreita pode sugerir leveza ou agilidade em algumas convenções gráficas.' },
  { id: 'average', label: 'Equilibrado', tip: 'Boa base neutra para deixar pose, rosto e figurino assumirem mais protagonismo.' },
  { id: 'athletic', label: 'Atlético', tip: 'Membros mais marcados podem reforçar energia, potência ou aventura.' },
  { id: 'round', label: 'Arredondado', tip: 'Formas circulares costumam passar acolhimento e suavidade visual.' },
  { id: 'triangle', label: 'Triangular', tip: 'Triângulos criam direção e tensão visual, úteis em personagens inquietos ou rápidos.' },
  { id: 'square', label: 'Quadrado', tip: 'Retângulos e quadrados costumam comunicar estabilidade, robustez e peso.' },
];

const HEAD: Array<{ id: CharacterHeadShape; label: string; tip: string }> = [
  { id: 'round', label: 'Redonda', tip: 'Muito usada para personagens amigáveis, jovens ou mascotes.' },
  { id: 'oval', label: 'Oval', tip: 'Versátil para estilos entre cartoon e semirrealista.' },
  { id: 'square', label: 'Quadrada', tip: 'Valoriza planos, estrutura e leitura mais firme.' },
  { id: 'heart', label: 'Coração', tip: 'Cria foco no rosto com leitura mais delicada.' },
  { id: 'triangle', label: 'Triangular', tip: 'Acentua direção e contraste; pode ficar mais excêntrica.' },
  { id: 'long', label: 'Alongada', tip: 'Ajuda a diferenciar idade, ritmo e caráter visual.' },
];

const EYES: Array<{ id: CharacterEyeStyle; label: string }> = [
  { id: 'dot', label: 'Pontos' },
  { id: 'round', label: 'Redondos' },
  { id: 'almond', label: 'Amendoados' },
  { id: 'large', label: 'Grandes' },
  { id: 'narrow', label: 'Estreitos' },
  { id: 'closed', label: 'Fechados' },
];

const NOSES: Array<{ id: CharacterNoseStyle; label: string }> = [
  { id: 'dot', label: 'Ponto' },
  { id: 'small', label: 'Pequeno' },
  { id: 'straight', label: 'Reto' },
  { id: 'round', label: 'Arredondado' },
  { id: 'none', label: 'Sem nariz' },
];

const MOUTHS: Array<{ id: CharacterMouthStyle; label: string }> = [
  { id: 'smile', label: 'Sorriso' },
  { id: 'neutral', label: 'Neutra' },
  { id: 'open', label: 'Aberta' },
  { id: 'small', label: 'Pequena' },
  { id: 'frown', label: 'Tensa' },
];

const HAIR: Array<{ id: CharacterHairStyle; label: string }> = [
  { id: 'none', label: 'Sem cabelo' },
  { id: 'short', label: 'Curto' },
  { id: 'bob', label: 'Bob' },
  { id: 'curly', label: 'Cacheado' },
  { id: 'long', label: 'Longo' },
  { id: 'mohawk', label: 'Moicano' },
];

const OUTFITS: Array<{ id: CharacterOutfitStyle; label: string }> = [
  { id: 'basic', label: 'Básico' },
  { id: 'shirt', label: 'Camiseta' },
  { id: 'jacket', label: 'Jaqueta' },
  { id: 'dress', label: 'Vestido' },
  { id: 'overalls', label: 'Jardineira' },
  { id: 'armor', label: 'Armadura' },
];

const ACCESSORIES: Array<{ id: CharacterAccessory; label: string }> = [
  { id: 'none', label: 'Nenhum' },
  { id: 'glasses', label: 'Óculos' },
  { id: 'hat', label: 'Chapéu' },
  { id: 'cap', label: 'Boné' },
  { id: 'scarf', label: 'Cachecol' },
  { id: 'bag', label: 'Bolsa' },
];

const REFERENCES = [
  'Tom Bancroft — Creating Characters with Personality.',
  'Stephen Silver — The Silver Way.',
  'Bryan Tillman — Creative Character Design.',
  'Preston Blair — Cartoon Animation.',
  'Richard Williams — The Animator’s Survival Kit.',
  'Andrew Loomis — construção e proporção de figura.',
  'Model sheet / turnaround / expression sheet / pose sheet como convenções de concept art e animação.',
];

const defaultBuilder: CharacterBuilderConfig = {
  bodyShape: 'average',
  headShape: 'round',
  eyeStyle: 'dot',
  noseStyle: 'small',
  mouthStyle: 'smile',
  hairStyle: 'short',
  outfitStyle: 'shirt',
  accessory: 'none',
  headToBodyRatio: 4.5,
  shoulderWidth: 1,
  torsoLength: 1,
  limbLength: 1,
  handScale: 1,
  footScale: 1,
  skinColor: '#F1C7A5',
  hairColor: '#2B2118',
  outfitColor: '#4FD9D3',
  accentColor: '#FF13F0',
  strokeColor: '#111111',
  strokeWidth: 3,
};

const defaultConcept: CharacterConceptSheet = {
  role: '',
  archetype: '',
  ageImpression: '',
  personality: [],
  keywords: [],
  backstory: '',
  silhouetteIntent: '',
  shapeLanguage: '',
  colorIntent: '',
  movementNotes: '',
  accessibilityNotes: '',
  designRationale: '',
};

const defaultExpressions: CharacterExpression[] = [
  { id: 'exp-neutral', name: 'Neutro', mouth: 'neutral', eyes: 'dot' },
  { id: 'exp-happy', name: 'Alegria', mouth: 'smile', eyes: 'round' },
  { id: 'exp-surprise', name: 'Surpresa', mouth: 'open', eyes: 'large' },
  { id: 'exp-tension', name: 'Tensão', mouth: 'frown', eyes: 'narrow' },
];

const defaultPoses: CharacterPose[] = [
  { id: 'pose-front', name: 'Frente', kind: 'front' },
  { id: 'pose-side', name: 'Perfil', kind: 'side' },
  { id: 'pose-back', name: 'Costas', kind: 'back' },
  { id: 'pose-three', name: '3/4', kind: 'three-quarter' },
  { id: 'pose-idle', name: 'Idle', kind: 'idle' },
  { id: 'pose-walk', name: 'Caminhada', kind: 'walk' },
  { id: 'pose-run', name: 'Corrida', kind: 'run' },
  { id: 'pose-action', name: 'Ação', kind: 'action' },
];

const blankAnimation = (kind: SpriteAnimationKind = 'idle'): SpriteAnimation => ({
  id: makeId('anim'),
  name: kind === 'custom' ? 'Animação' : KINDS.find((item) => item.id === kind)?.label || 'Animação',
  kind,
  fps: kind === 'run' ? 12 : 8,
  loop: kind !== 'jump' && kind !== 'attack' && kind !== 'hurt',
  motion: kind === 'idle' ? 'bob' : 'none',
  frames: [],
});

const PRESETS: Array<{ id: string; label: string; description: string; builder: Partial<CharacterBuilderConfig>; concept: Partial<CharacterConceptSheet> }> = [
  {
    id: 'kid-explorer',
    label: 'Exploradora',
    description: 'Cabeça maior, corpo curto e leitura acolhedora.',
    builder: { headShape: 'round', bodyShape: 'average', outfitStyle: 'overalls', hairStyle: 'bob', headToBodyRatio: 3.9, limbLength: 0.9, shoulderWidth: 0.92, outfitColor: '#5FA7FF', accentColor: '#F7D46E' },
    concept: { archetype: 'curiosa', silhouetteIntent: 'compacta e amigável', shapeLanguage: 'círculos e ovais', movementNotes: 'saltitante e curiosa' },
  },
  {
    id: 'wizard-companion',
    label: 'Mago',
    description: 'Leitura de companion fantástico, inspirado em model sheets.',
    builder: { headShape: 'oval', bodyShape: 'triangle', outfitStyle: 'armor', accessory: 'hat', hairStyle: 'short', headToBodyRatio: 5.2, torsoLength: 1.1, limbLength: 1.05, outfitColor: '#B55E63', accentColor: '#EAC15A' },
    concept: { archetype: 'mentor', silhouetteIntent: 'capa + chapéu reconhecíveis', shapeLanguage: 'triângulos suaves', movementNotes: 'calmo, mas expressivo' },
  },
  {
    id: 'sprite-rpg',
    label: 'Sprite RPG',
    description: 'Pensado para virar sprite sheet local.',
    builder: { headShape: 'round', bodyShape: 'athletic', outfitStyle: 'jacket', hairStyle: 'mohawk', headToBodyRatio: 4.2, limbLength: 0.95, strokeWidth: 3.5, outfitColor: '#B8743C', accentColor: '#F6E27A' },
    concept: { archetype: 'jogável', silhouetteIntent: 'silhueta legível em miniatura', shapeLanguage: 'formas simples com contraste', movementNotes: 'frames claros e repetíveis' },
  },
  {
    id: 'mascot',
    label: 'Mascote',
    description: 'Leitura fofa e síntese visual forte.',
    builder: { headShape: 'round', bodyShape: 'round', eyeStyle: 'large', mouthStyle: 'smile', hairStyle: 'none', accessory: 'scarf', headToBodyRatio: 3.2, handScale: 1.1, footScale: 1.05, outfitColor: '#61DDD7', accentColor: '#FF84C1' },
    concept: { archetype: 'mascote', silhouetteIntent: 'massas arredondadas e memoráveis', shapeLanguage: 'círculos', movementNotes: 'gestos abertos' },
  },
];

export const blankSpriteCharacter = (): CharacterSpriteDocument => ({
  title: 'Personagem',
  characterName: 'Novo personagem',
  description: '',
  width: 360,
  height: 520,
  background: '#F4F4F2',
  pixelated: false,
  animations: [blankAnimation('idle')],
  builder: { ...defaultBuilder },
  concept: { ...defaultConcept },
  poses: defaultPoses.map((item) => ({ ...item })),
  expressions: defaultExpressions.map((item) => ({ ...item })),
  palette: ['#F1C7A5', '#2B2118', '#4FD9D3', '#FF13F0', '#111111'],
  updatedAt: new Date().toISOString(),
});

function InfoTip({ children }: { children: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex ml-1 align-middle">
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        className="h-6 w-6 rounded-full inline-flex items-center justify-center hover:bg-black/5 focus:outline-none focus:ring-2 focus:ring-black"
        aria-label="Explicar escolha"
      >
        <Info size={13} className="text-neutral-500" />
      </button>
      {open && (
        <span className="absolute z-[180] left-1/2 bottom-full mb-2 w-64 max-w-[75vw] -translate-x-1/2 rounded-xl bg-black text-white p-3 text-[10px] leading-relaxed shadow-xl">
          {children}
        </span>
      )}
    </span>
  );
}

function headPath(shape: CharacterHeadShape, cx: number, cy: number, w: number, h: number) {
  if (shape === 'square') return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${w * 0.14}"/>`;
  if (shape === 'heart') return `<path d="M ${cx} ${cy + h * 0.48} C ${cx - w * 0.55} ${cy + h * 0.05}, ${cx - w * 0.58} ${cy - h * 0.42}, ${cx} ${cy - h * 0.18} C ${cx + w * 0.58} ${cy - h * 0.42}, ${cx + w * 0.55} ${cy + h * 0.05}, ${cx} ${cy + h * 0.48} Z"/>`;
  if (shape === 'triangle') return `<path d="M ${cx} ${cy + h * 0.48} L ${cx - w * 0.44} ${cy - h * 0.32} Q ${cx} ${cy - h * 0.64} ${cx + w * 0.44} ${cy - h * 0.32} Z"/>`;
  if (shape === 'long') return `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.38}" ry="${h * 0.6}"/>`;
  if (shape === 'oval') return `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.48}" ry="${h * 0.56}"/>`;
  return `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.5}"/>`;
}

function hairPath(style: CharacterHairStyle, cx: number, cy: number, w: number, h: number) {
  if (style === 'none') return '';
  if (style === 'short') return `<path d="M ${cx - w * 0.44} ${cy - h * 0.12} Q ${cx - w * 0.32} ${cy - h * 0.6} ${cx} ${cy - h * 0.58} Q ${cx + w * 0.32} ${cy - h * 0.6} ${cx + w * 0.44} ${cy - h * 0.12} L ${cx + w * 0.32} ${cy + h * 0.12} Q ${cx} ${cy - h * 0.02} ${cx - w * 0.32} ${cy + h * 0.12} Z"/>`;
  if (style === 'bob') return `<path d="M ${cx - w * 0.46} ${cy - h * 0.1} Q ${cx - w * 0.42} ${cy - h * 0.62} ${cx} ${cy - h * 0.58} Q ${cx + w * 0.42} ${cy - h * 0.62} ${cx + w * 0.46} ${cy - h * 0.1} L ${cx + w * 0.36} ${cy + h * 0.36} Q ${cx} ${cy + h * 0.46} ${cx - w * 0.36} ${cy + h * 0.36} Z"/>`;
  if (style === 'curly') return `<path d="M ${cx - w * 0.4} ${cy - h * 0.02} C ${cx - w * 0.58} ${cy - h * 0.22}, ${cx - w * 0.52} ${cy - h * 0.6}, ${cx - w * 0.18} ${cy - h * 0.58} C ${cx - w * 0.08} ${cy - h * 0.75}, ${cx + w * 0.16} ${cy - h * 0.75}, ${cx + w * 0.18} ${cy - h * 0.56} C ${cx + w * 0.5} ${cy - h * 0.58}, ${cx + w * 0.58} ${cy - h * 0.2}, ${cx + w * 0.4} ${cy - h * 0.02} C ${cx + w * 0.52} ${cy + h * 0.12}, ${cx + w * 0.3} ${cy + h * 0.4}, ${cx} ${cy + h * 0.42} C ${cx - w * 0.3} ${cy + h * 0.4}, ${cx - w * 0.52} ${cy + h * 0.12}, ${cx - w * 0.4} ${cy - h * 0.02} Z"/>`;
  if (style === 'long') return `<path d="M ${cx - w * 0.44} ${cy - h * 0.08} Q ${cx - w * 0.38} ${cy - h * 0.62} ${cx} ${cy - h * 0.58} Q ${cx + w * 0.38} ${cy - h * 0.62} ${cx + w * 0.44} ${cy - h * 0.08} L ${cx + w * 0.34} ${cy + h * 0.62} Q ${cx} ${cy + h * 0.52} ${cx - w * 0.34} ${cy + h * 0.62} Z"/>`;
  return `<path d="M ${cx - w * 0.12} ${cy - h * 0.6} L ${cx + w * 0.12} ${cy - h * 0.6} L ${cx + w * 0.2} ${cy - h * 1.02} L ${cx} ${cy - h * 1.2} L ${cx - w * 0.2} ${cy - h * 1.02} Z"/>`;
}

function faceElements(builder: CharacterBuilderConfig, cx: number, cy: number, scale: number, expression?: CharacterExpression, facing = 0) {
  const eye = expression?.eyes || builder.eyeStyle;
  const mouth = expression?.mouth || builder.mouthStyle;
  const s = scale;
  const eyeY = cy - 8 * s;
  const ex = 18 * s;
  const facingOffset = facing * 5 * s;

  let eyes = '';
  if (eye === 'closed') eyes = `<path d="M ${cx - ex - 6 * s + facingOffset} ${eyeY} q ${6 * s} ${5 * s} ${12 * s} 0 M ${cx + ex - 6 * s + facingOffset} ${eyeY} q ${6 * s} ${5 * s} ${12 * s} 0" fill="none"/>`;
  else if (eye === 'dot') eyes = `<circle cx="${cx - ex + facingOffset}" cy="${eyeY}" r="${2.2 * s}"/><circle cx="${cx + ex + facingOffset}" cy="${eyeY}" r="${2.2 * s}"/>`;
  else if (eye === 'round') eyes = `<circle cx="${cx - ex + facingOffset}" cy="${eyeY}" r="${5.4 * s}" fill="#fff"/><circle cx="${cx + ex + facingOffset}" cy="${eyeY}" r="${5.4 * s}" fill="#fff"/><circle cx="${cx - ex + facingOffset}" cy="${eyeY}" r="${2.4 * s}"/><circle cx="${cx + ex + facingOffset}" cy="${eyeY}" r="${2.4 * s}"/>`;
  else if (eye === 'large') eyes = `<ellipse cx="${cx - ex + facingOffset}" cy="${eyeY}" rx="${8.2 * s}" ry="${6.6 * s}" fill="#fff"/><ellipse cx="${cx + ex + facingOffset}" cy="${eyeY}" rx="${8.2 * s}" ry="${6.6 * s}" fill="#fff"/><circle cx="${cx - ex + facingOffset}" cy="${eyeY}" r="${3.2 * s}"/><circle cx="${cx + ex + facingOffset}" cy="${eyeY}" r="${3.2 * s}"/>`;
  else if (eye === 'narrow') eyes = `<path d="M ${cx - ex - 8 * s + facingOffset} ${eyeY} q ${8 * s} ${-5 * s} ${16 * s} 0 M ${cx + ex - 8 * s + facingOffset} ${eyeY} q ${8 * s} ${-5 * s} ${16 * s} 0" fill="none"/>`;
  else eyes = `<path d="M ${cx - ex - 8 * s + facingOffset} ${eyeY} q ${8 * s} ${-3 * s} ${16 * s} 0 q ${-8 * s} ${6 * s} ${-16 * s} 0 Z M ${cx + ex - 8 * s + facingOffset} ${eyeY} q ${8 * s} ${-3 * s} ${16 * s} 0 q ${-8 * s} ${6 * s} ${-16 * s} 0 Z" fill="#fff"/><circle cx="${cx - ex + facingOffset}" cy="${eyeY}" r="${2 * s}"/><circle cx="${cx + ex + facingOffset}" cy="${eyeY}" r="${2 * s}"/>`;

  let nose = '';
  if (builder.noseStyle === 'dot') nose = `<circle cx="${cx + facingOffset * 0.5}" cy="${cy + 6 * s}" r="${1.8 * s}"/>`;
  else if (builder.noseStyle === 'small') nose = `<path d="M ${cx + facingOffset * 0.5} ${cy + 2 * s} q ${3 * s} ${7 * s} 0 ${12 * s}" fill="none"/>`;
  else if (builder.noseStyle === 'straight') nose = `<path d="M ${cx + facingOffset * 0.2} ${cy - 2 * s} l 0 ${14 * s}" fill="none"/>`;
  else if (builder.noseStyle === 'round') nose = `<ellipse cx="${cx + facingOffset * 0.3}" cy="${cy + 8 * s}" rx="${4 * s}" ry="${3 * s}" fill="none"/>`;

  let mouthMarkup = '';
  if (mouth === 'smile') mouthMarkup = `<path d="M ${cx - 12 * s + facingOffset * 0.4} ${cy + 24 * s} q ${12 * s} ${10 * s} ${24 * s} 0" fill="none"/>`;
  else if (mouth === 'neutral') mouthMarkup = `<path d="M ${cx - 10 * s + facingOffset * 0.4} ${cy + 24 * s} h ${20 * s}" fill="none"/>`;
  else if (mouth === 'open') mouthMarkup = `<ellipse cx="${cx + facingOffset * 0.5}" cy="${cy + 24 * s}" rx="${8 * s}" ry="${6 * s}" fill="none"/>`;
  else if (mouth === 'small') mouthMarkup = `<path d="M ${cx - 6 * s + facingOffset * 0.4} ${cy + 23 * s} q ${6 * s} ${4 * s} ${12 * s} 0" fill="none"/>`;
  else mouthMarkup = `<path d="M ${cx - 12 * s + facingOffset * 0.4} ${cy + 28 * s} q ${12 * s} ${-8 * s} ${24 * s} 0" fill="none"/>`;

  return `<g stroke-linecap="round" stroke-linejoin="round">${eyes}${nose}${mouthMarkup}</g>`;
}

function outfitMarkup(kind: CharacterOutfitStyle, x: number, y: number, w: number, h: number, accent: string) {
  if (kind === 'basic') return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.28}"/>`;
  if (kind === 'shirt') return `<path d="M ${x + w * 0.1} ${y + h * 0.14} L ${x + w * 0.28} ${y} L ${x + w * 0.72} ${y} L ${x + w * 0.9} ${y + h * 0.14} L ${x + w * 0.82} ${y + h} L ${x + w * 0.18} ${y + h} Z"/>`;
  if (kind === 'jacket') return `<path d="M ${x + w * 0.08} ${y + h * 0.12} L ${x + w * 0.28} ${y} L ${x + w * 0.72} ${y} L ${x + w * 0.92} ${y + h * 0.12} L ${x + w * 0.82} ${y + h} L ${x + w * 0.18} ${y + h} Z"/><path d="M ${x + w * 0.5} ${y + h * 0.1} V ${y + h}" fill="none"/><path d="M ${x + w * 0.36} ${y + h * 0.08} L ${x + w * 0.5} ${y + h * 0.26} L ${x + w * 0.64} ${y + h * 0.08}" fill="none"/>`;
  if (kind === 'dress') return `<path d="M ${x + w * 0.36} ${y} L ${x + w * 0.64} ${y} L ${x + w * 0.92} ${y + h} L ${x + w * 0.08} ${y + h} Z"/>`;
  if (kind === 'overalls') return `<path d="M ${x + w * 0.12} ${y + h * 0.14} L ${x + w * 0.88} ${y + h * 0.14} L ${x + w * 0.8} ${y + h} L ${x + w * 0.2} ${y + h} Z"/><rect x="${x + w * 0.34}" y="${y + h * 0.18}" width="${w * 0.32}" height="${h * 0.26}" fill="${accent}" opacity=".2"/><path d="M ${x + w * 0.3} ${y + h * 0.14} L ${x + w * 0.22} ${y - h * 0.08} M ${x + w * 0.7} ${y + h * 0.14} L ${x + w * 0.78} ${y - h * 0.08}" fill="none"/>`;
  return `<path d="M ${x + w * 0.1} ${y + h * 0.16} L ${x + w * 0.25} ${y} L ${x + w * 0.75} ${y} L ${x + w * 0.9} ${y + h * 0.16} L ${x + w * 0.82} ${y + h} L ${x + w * 0.18} ${y + h} Z"/><path d="M ${x + w * 0.18} ${y + h * 0.28} H ${x + w * 0.82} M ${x + w * 0.2} ${y + h * 0.52} H ${x + w * 0.8}" fill="none"/>`;
}

function accessoryMarkup(kind: CharacterAccessory, cx: number, cy: number, headW: number, headH: number, accent: string) {
  if (kind === 'none') return '';
  if (kind === 'glasses') return `<g fill="none"><circle cx="${cx - headW * 0.18}" cy="${cy - headH * 0.08}" r="${headW * 0.11}"/><circle cx="${cx + headW * 0.18}" cy="${cy - headH * 0.08}" r="${headW * 0.11}"/><path d="M ${cx - headW * 0.07} ${cy - headH * 0.08} H ${cx + headW * 0.07}"/></g>`;
  if (kind === 'hat') return `<g><path d="M ${cx - headW * 0.2} ${cy - headH * 0.54} L ${cx + headW * 0.2} ${cy - headH * 0.54} L ${cx + headW * 0.3} ${cy - headH * 0.96} L ${cx - headW * 0.08} ${cy - headH * 1.28} L ${cx - headW * 0.28} ${cy - headH * 0.96} Z" fill="${accent}"/><ellipse cx="${cx}" cy="${cy - headH * 0.52}" rx="${headW * 0.42}" ry="${headH * 0.09}" fill="${accent}"/></g>`;
  if (kind === 'cap') return `<g><path d="M ${cx - headW * 0.22} ${cy - headH * 0.42} Q ${cx} ${cy - headH * 0.72} ${cx + headW * 0.24} ${cy - headH * 0.42} Z" fill="${accent}"/><path d="M ${cx + headW * 0.05} ${cy - headH * 0.38} q ${headW * 0.18} ${headH * 0.04} ${headW * 0.26} ${headH * 0.13}" fill="none"/></g>`;
  if (kind === 'scarf') return `<g><path d="M ${cx - headW * 0.18} ${cy + headH * 0.62} H ${cx + headW * 0.18} q ${headW * 0.08} 0 ${headW * 0.08} ${headH * 0.08} q 0 ${headH * 0.08} -${headW * 0.08} ${headH * 0.08} H ${cx - headW * 0.18} q -${headW * 0.08} 0 -${headW * 0.08} -${headH * 0.08} q 0 -${headH * 0.08} ${headW * 0.08} -${headH * 0.08} Z" fill="${accent}"/><path d="M ${cx + headW * 0.06} ${cy + headH * 0.77} v ${headH * 0.34}" fill="none"/></g>`;
  return `<g><path d="M ${cx + headW * 0.22} ${cy + headH * 0.56} q ${headW * 0.18} ${headH * 0.06} ${headW * 0.18} ${headH * 0.26} q 0 ${headH * 0.22} -${headW * 0.18} ${headH * 0.24} q -${headW * 0.18} -${headH * 0.02} -${headW * 0.18} -${headH * 0.24} q 0 -${headH * 0.2} ${headW * 0.18} -${headH * 0.26} Z" fill="${accent}"/></g>`;
}

function bodyMeasurements(bodyShape: CharacterBodyShape) {
  if (bodyShape === 'slim') return { torsoW: 72, hips: 68, arm: 88, leg: 108 };
  if (bodyShape === 'athletic') return { torsoW: 96, hips: 78, arm: 94, leg: 116 };
  if (bodyShape === 'round') return { torsoW: 100, hips: 96, arm: 80, leg: 96 };
  if (bodyShape === 'triangle') return { torsoW: 96, hips: 62, arm: 92, leg: 110 };
  if (bodyShape === 'square') return { torsoW: 98, hips: 90, arm: 88, leg: 104 };
  return { torsoW: 84, hips: 76, arm: 86, leg: 104 };
}

function poseConfig(kind: CharacterPose['kind']) {
  if (kind === 'side') return { facing: 1, headTurn: 1, leftArm: -8, rightArm: 10, leftLeg: 6, rightLeg: -2, bodyTilt: 4 };
  if (kind === 'back') return { facing: 0, headTurn: 0, leftArm: -10, rightArm: 10, leftLeg: 3, rightLeg: -3, bodyTilt: 0, back: true };
  if (kind === 'three-quarter') return { facing: 0.55, headTurn: 0.55, leftArm: -16, rightArm: 8, leftLeg: 3, rightLeg: -4, bodyTilt: 2 };
  if (kind === 'walk') return { facing: 0.25, headTurn: 0.25, leftArm: -28, rightArm: 28, leftLeg: 22, rightLeg: -18, bodyTilt: 3 };
  if (kind === 'run') return { facing: 0.35, headTurn: 0.35, leftArm: -46, rightArm: 40, leftLeg: 36, rightLeg: -30, bodyTilt: 8 };
  if (kind === 'jump') return { facing: 0.2, headTurn: 0.2, leftArm: -54, rightArm: 54, leftLeg: 24, rightLeg: -24, bodyTilt: -2, raise: -12 };
  if (kind === 'action') return { facing: 0.25, headTurn: 0.25, leftArm: -62, rightArm: 22, leftLeg: 12, rightLeg: -20, bodyTilt: -8 };
  if (kind === 'idle') return { facing: 0.1, headTurn: 0.1, leftArm: -6, rightArm: 6, leftLeg: 2, rightLeg: -2, bodyTilt: 1 };
  return { facing: 0, headTurn: 0, leftArm: -8, rightArm: 8, leftLeg: 0, rightLeg: 0, bodyTilt: 0 };
}

function limb(x1: number, y1: number, length: number, angleDeg: number, strokeWidth: number) {
  const a = (angleDeg * Math.PI) / 180;
  const x2 = x1 + Math.sin(a) * length;
  const y2 = y1 + Math.cos(a) * length;
  return { x2, y2, markup: `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="round"/>` };
}

function buildCharacterSvg(builder: CharacterBuilderConfig, poseKind: CharacterPose['kind'], expression?: CharacterExpression, width = 360, height = 520) {
  const b = {
    ...defaultBuilder,
    ...builder,
    skinColor: normalizeHex(builder.skinColor, defaultBuilder.skinColor),
    hairColor: normalizeHex(builder.hairColor, defaultBuilder.hairColor),
    outfitColor: normalizeHex(builder.outfitColor, defaultBuilder.outfitColor),
    accentColor: normalizeHex(builder.accentColor, defaultBuilder.accentColor),
    strokeColor: normalizeHex(builder.strokeColor, defaultBuilder.strokeColor),
  };

  const pose = poseConfig(poseKind);
  const stroke = Math.max(2, b.strokeWidth || 3);
  const cx = width / 2;
  const baseY = height - 74 - (pose.raise || 0);
  const totalHeight = clamp(height - 110, 260, 430);
  const headH = clamp(totalHeight / clamp(b.headToBodyRatio, 2.8, 6.4), 58, 132);
  const headW = headH * (b.headShape === 'long' ? 0.78 : 0.92);
  const headCx = cx + pose.facing * 12;
  const headCy = 92;
  const measures = bodyMeasurements(b.bodyShape);
  const torsoW = measures.torsoW * b.shoulderWidth;
  const hipW = measures.hips * Math.max(0.82, b.shoulderWidth * 0.88);
  const torsoH = 88 * b.torsoLength;
  const armLength = measures.arm * b.limbLength;
  const legLength = measures.leg * b.limbLength;
  const neckY = headCy + headH * 0.55;
  const torsoY = neckY + 8;
  const pelvisY = torsoY + torsoH;
  const shoulderY = torsoY + 14;
  const leftShoulderX = cx - torsoW * 0.38 + pose.facing * 6;
  const rightShoulderX = cx + torsoW * 0.38 + pose.facing * 6;
  const leftHipX = cx - hipW * 0.2 + pose.facing * 4;
  const rightHipX = cx + hipW * 0.2 + pose.facing * 4;
  const armStroke = stroke * 0.92;
  const legStroke = stroke * 1.02;
  const leftArm = limb(leftShoulderX, shoulderY, armLength, 180 + pose.leftArm + pose.bodyTilt, armStroke);
  const rightArm = limb(rightShoulderX, shoulderY, armLength, pose.rightArm + pose.bodyTilt, armStroke);
  const leftLeg = limb(leftHipX, pelvisY, legLength, 180 + pose.leftLeg, legStroke);
  const rightLeg = limb(rightHipX, pelvisY, legLength, pose.rightLeg, legStroke);
  const handRadius = 6 * b.handScale;
  const footW = 22 * b.footScale;
  const bodyFill = b.outfitColor;
  const accent = b.accentColor;
  const hair = hairPath(b.hairStyle, headCx, headCy, headW, headH);
  const accessory = accessoryMarkup(b.accessory, headCx, headCy, headW, headH, accent);
  const bodyShell = b.bodyShape === 'round'
    ? `<ellipse cx="${cx}" cy="${torsoY + torsoH * 0.48}" rx="${torsoW * 0.48}" ry="${torsoH * 0.54}"/>`
    : b.bodyShape === 'triangle'
      ? `<path d="M ${cx - torsoW * 0.32} ${torsoY} L ${cx + torsoW * 0.32} ${torsoY} L ${cx + hipW * 0.5} ${pelvisY} L ${cx - hipW * 0.5} ${pelvisY} Z"/>`
      : b.bodyShape === 'square'
        ? `<rect x="${cx - torsoW * 0.46}" y="${torsoY}" width="${torsoW * 0.92}" height="${torsoH}" rx="${torsoW * 0.08}"/>`
        : `<path d="M ${cx - torsoW * 0.38} ${torsoY} Q ${cx} ${torsoY - 4} ${cx + torsoW * 0.38} ${torsoY} L ${cx + hipW * 0.42} ${pelvisY} Q ${cx} ${pelvisY + 8} ${cx - hipW * 0.42} ${pelvisY} Z"/>`;
  const clothing = outfitMarkup(b.outfitStyle, cx - torsoW * 0.46, torsoY + 8, torsoW * 0.92, torsoH * 0.96, accent);
  const bodyTiltTransform = pose.bodyTilt ? ` transform="rotate(${pose.bodyTilt} ${cx} ${torsoY + torsoH * 0.5})"` : '';

  const backDetails = pose.back ? `<path d="M ${cx - torsoW * 0.18} ${torsoY + torsoH * 0.12} V ${torsoY + torsoH * 0.84}" fill="none"/><path d="M ${cx - torsoW * 0.26} ${torsoY + torsoH * 0.18} q ${torsoW * 0.26} ${torsoH * 0.1} ${torsoW * 0.52} 0" fill="none"/>` : '';
  const headFace = pose.back ? '' : faceElements(b, headCx, headCy, headH / 100, expression, pose.headTurn || 0);
  const ear = !pose.back ? `<circle cx="${headCx + (pose.headTurn > 0 ? headW * 0.34 : -headW * 0.34)}" cy="${headCy + 2}" r="${headW * 0.08}" fill="${b.skinColor}"/>` : '';

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="100%" height="100%" fill="transparent"/>
    <g stroke="${b.strokeColor}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">
      <g${bodyTiltTransform}>
        ${leftArm.markup}
        ${rightArm.markup}
        <circle cx="${leftArm.x2}" cy="${leftArm.y2}" r="${handRadius}" fill="${b.skinColor}"/>
        <circle cx="${rightArm.x2}" cy="${rightArm.y2}" r="${handRadius}" fill="${b.skinColor}"/>
        <g fill="${bodyFill}">${bodyShell}${clothing}</g>
        ${backDetails}
      </g>
      <path d="M ${cx - 8} ${neckY} L ${cx - 4} ${torsoY} M ${cx + 8} ${neckY} L ${cx + 4} ${torsoY}" fill="none"/>
      ${leftLeg.markup}
      ${rightLeg.markup}
      <path d="M ${leftLeg.x2 - footW * 0.46} ${leftLeg.y2} h ${footW}" fill="none"/>
      <path d="M ${rightLeg.x2 - footW * 0.46} ${rightLeg.y2} h ${footW}" fill="none"/>
      <g fill="${b.skinColor}">${headPath(b.headShape, headCx, headCy, headW, headH)}${ear}</g>
      ${hair ? `<g fill="${b.hairColor}">${hair}</g>` : ''}
      ${accessory}
      ${headFace}
    </g>
  </svg>`;
}

function motionProps(motion: SpriteMotionPreset, playing: boolean) {
  if (!playing || motion === 'none') return { animate: { x: 0, y: 0, scaleX: 1, scaleY: 1, rotate: 0 }, transition: { duration: 0.2 } };
  if (motion === 'bob') return { animate: { y: [0, -8, 0] }, transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' } };
  if (motion === 'bounce') return { animate: { y: [0, -16, 0] }, transition: { duration: 0.8, repeat: Infinity, ease: 'easeInOut' } };
  if (motion === 'shake') return { animate: { x: [0, -4, 4, -3, 0] }, transition: { duration: 0.35, repeat: Infinity, ease: 'linear' } };
  if (motion === 'pulse') return { animate: { scale: [1, 1.03, 1] }, transition: { duration: 0.85, repeat: Infinity, ease: 'easeInOut' } };
  return { animate: { scaleX: [1, 1.06, 1], scaleY: [1, 0.94, 1] }, transition: { duration: 0.7, repeat: Infinity, ease: 'easeInOut' } };
}

export function SpriteCharacterPreview({ document, className = '' }: { document: CharacterSpriteDocument; className?: string }) {
  const builder = document.builder || defaultBuilder;
  const svg = document.aiSvg || buildCharacterSvg(builder, 'idle', document.expressions?.[0], document.width, document.height);
  return (
    <div className={`w-full h-full flex items-center justify-center bg-neutral-50 overflow-hidden ${className}`}>
      <img src={svgDataUrl(svg)} alt={document.characterName} className="max-w-full max-h-full object-contain" style={{ imageRendering: document.pixelated ? 'pixelated' : 'auto' }} />
    </div>
  );
}

function HexField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = normalizeHex(value);
  return (
    <label className="text-[9px] font-mono text-neutral-500 uppercase">
      {label}
      <div className="mt-1 flex gap-2">
        <input type="color" value={safe} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-10 w-11 rounded-lg border bg-white p-1" />
        <input value={value} onChange={(event) => onChange(event.target.value)} onBlur={(event) => onChange(normalizeHex(event.target.value, safe))} className="h-10 flex-1 rounded-xl border px-3 font-mono text-xs uppercase" />
      </div>
    </label>
  );
}

function Picker<T extends string>({ label, tip, options, value, onChange }: { label: string; tip?: string; options: Array<{ id: T; label: string; tip?: string }>; value: T; onChange: (value: T) => void }) {
  return (
    <div className="rounded-2xl border p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 uppercase mb-2">
        <span>{label}</span>
        {tip ? <InfoTip>{tip}</InfoTip> : null}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${value === option.id ? 'bg-black text-white border-black' : 'bg-white hover:border-black'}`}
            title={option.tip || option.label}
          >
            <div className="font-semibold text-xs sm:text-sm">{option.label}</div>
            {option.tip ? <div className={`mt-1 text-[10px] leading-relaxed ${value === option.id ? 'text-white/70' : 'text-neutral-500'}`}>{option.tip}</div> : null}
          </button>
        ))}
      </div>
    </div>
  );
}

function SliderField({ label, value, min, max, step = 0.1, onChange, tip }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void; tip?: string }) {
  return (
    <label className="block rounded-2xl border p-3">
      <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase text-neutral-500">
        <span>{label}</span>
        {tip ? <InfoTip>{tip}</InfoTip> : null}
        <span className="text-black">{value.toFixed(step < 1 ? 1 : 0)}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full" />
    </label>
  );
}

function SheetCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-white p-3 shadow-sm">
      <div className="text-[10px] font-mono uppercase tracking-[0.24em] text-neutral-500 mb-2">{label}</div>
      {children}
    </div>
  );
}

export default function SpriteStudio({ document, title = 'Novo personagem', canEdit = true, availableAssets = [], onSave, onClose }: Props) {
  const mergedDocument: CharacterSpriteDocument = {
    ...blankSpriteCharacter(),
    ...deepClone(document),
    builder: { ...defaultBuilder, ...(document.builder || {}) },
    concept: { ...defaultConcept, ...(document.concept || {}) },
    poses: (document.poses && document.poses.length ? document.poses : defaultPoses).map((item) => ({ ...item })),
    expressions: (document.expressions && document.expressions.length ? document.expressions : defaultExpressions).map((item) => ({ ...item })),
    animations: (document.animations && document.animations.length ? document.animations : [blankAnimation('idle')]).map((item) => ({ ...item, frames: (item.frames || []).map((frame) => ({ ...frame })) })),
  };

  const [draft, setDraft] = useState<CharacterSpriteDocument>(mergedDocument);
  const [tab, setTab] = useState<Tab>('builder');
  const [selectedAnimationId, setSelectedAnimationId] = useState<string>(mergedDocument.activeAnimationId || mergedDocument.animations[0]?.id || '');
  const [frameIndex, setFrameIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [error, setError] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const builder = { ...defaultBuilder, ...(draft.builder || {}) };
  const expressions = draft.expressions?.length ? draft.expressions : defaultExpressions;
  const activeExpression = expressions[0];
  const poses = draft.poses?.length ? draft.poses : defaultPoses;
  const animation = (draft.animations || []).find((item) => item.id === selectedAnimationId) || draft.animations?.[0] || blankAnimation('idle');
  const manualSvg = useMemo(() => buildCharacterSvg(builder, 'front', activeExpression, draft.width, draft.height), [builder, activeExpression, draft.width, draft.height]);
  const mainPreviewUrl = useMemo(() => {
    const frame = animation?.frames?.[frameIndex];
    if (frame?.url) return frame.url;
    return svgDataUrl(draft.aiSvg || manualSvg);
  }, [animation?.frames, frameIndex, draft.aiSvg, manualSvg]);

  useEffect(() => {
    if (!animation?.frames?.length) return;
    if (frameIndex >= animation.frames.length) setFrameIndex(0);
  }, [animation?.frames?.length, frameIndex]);

  useEffect(() => {
    if (!playing || !animation?.frames?.length || animation.frames.length < 2) return;
    const duration = animation.frames[frameIndex]?.durationMs || Math.max(70, Math.round(1000 / Math.max(1, animation.fps || 8)));
    const timer = window.setTimeout(() => {
      setFrameIndex((value) => ((value + 1) % animation.frames.length));
    }, duration);
    return () => window.clearTimeout(timer);
  }, [playing, animation?.id, animation?.frames, animation?.fps, frameIndex]);

  const patchBuilder = (partial: Partial<CharacterBuilderConfig>) => setDraft((current) => ({ ...current, builder: { ...builder, ...partial }, updatedAt: new Date().toISOString() }));
  const patchConcept = (partial: Partial<CharacterConceptSheet>) => setDraft((current) => ({ ...current, concept: { ...defaultConcept, ...(current.concept || {}), ...partial }, updatedAt: new Date().toISOString() }));

  const patchAnimation = (partial: Partial<SpriteAnimation>) => {
    setDraft((current) => ({
      ...current,
      animations: (current.animations || []).map((item) => (item.id === animation.id ? { ...item, ...partial } : item)),
      activeAnimationId: animation.id,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateExpressions = (next: CharacterExpression[]) => setDraft((current) => ({ ...current, expressions: next, updatedAt: new Date().toISOString() }));
  const updatePoses = (next: CharacterPose[]) => setDraft((current) => ({ ...current, poses: next, updatedAt: new Date().toISOString() }));

  const downloadSvg = (svg: string, name: string) => {
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement('a');
    anchor.href = url;
    anchor.download = `${(name || 'personagem').replace(/\s+/g, '-').toLowerCase()}.svg`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    setDraft((current) => ({
      ...current,
      builder: { ...builder, ...preset.builder },
      concept: { ...defaultConcept, ...(current.concept || {}), ...preset.concept },
      updatedAt: new Date().toISOString(),
    }));
  };

  const randomizeCharacter = () => {
    const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];
    patchBuilder({
      bodyShape: pick(BODY).id,
      headShape: pick(HEAD).id,
      eyeStyle: pick(EYES).id,
      noseStyle: pick(NOSES).id,
      mouthStyle: pick(MOUTHS).id,
      hairStyle: pick(HAIR).id,
      outfitStyle: pick(OUTFITS).id,
      accessory: pick(ACCESSORIES).id,
      headToBodyRatio: Number((3.2 + Math.random() * 2.4).toFixed(1)),
      shoulderWidth: Number((0.82 + Math.random() * 0.45).toFixed(2)),
      torsoLength: Number((0.82 + Math.random() * 0.45).toFixed(2)),
      limbLength: Number((0.82 + Math.random() * 0.45).toFixed(2)),
      handScale: Number((0.8 + Math.random() * 0.45).toFixed(2)),
      footScale: Number((0.8 + Math.random() * 0.45).toFixed(2)),
    });
  };

  const generatePose = (pose: CharacterPose) => {
    const svg = buildCharacterSvg(builder, pose.kind, activeExpression, draft.width, draft.height);
    updatePoses(poses.map((item) => (item.id === pose.id ? { ...item, svg } : item)));
  };

  const addAnimation = (kind: SpriteAnimationKind) => {
    const next = blankAnimation(kind);
    setDraft((current) => ({ ...current, animations: [...(current.animations || []), next], activeAnimationId: next.id, updatedAt: new Date().toISOString() }));
    setSelectedAnimationId(next.id);
    setFrameIndex(0);
  };

  const addAssetFrame = (asset: SpriteAssetOption) => {
    const next: SpriteFrame = { id: makeId('frame'), name: asset.name, url: asset.url, durationMs: 125 };
    patchAnimation({ frames: [...(animation.frames || []), next] });
  };

  const makeGeneratedFrames = () => {
    const kindsByAnimation: Record<SpriteAnimationKind, CharacterPose['kind'][]> = {
      idle: ['idle', 'idle', 'idle', 'idle'],
      walk: ['walk', 'front', 'walk', 'front'],
      run: ['run', 'three-quarter', 'run', 'three-quarter'],
      jump: ['jump', 'jump', 'idle'],
      attack: ['action', 'three-quarter', 'front'],
      hurt: ['front', 'idle', 'front'],
      custom: ['front', 'three-quarter', 'walk'],
    };
    const list = kindsByAnimation[animation.kind] || ['front', 'idle'];
    const nextFrames = list.map((kind, index) => ({
      id: makeId('frame'),
      name: `${animation.name} ${index + 1}`,
      url: svgDataUrl(buildCharacterSvg(builder, kind, activeExpression, draft.width, draft.height)),
      durationMs: Math.max(70, Math.round(1000 / Math.max(1, animation.fps || 8))),
    }));
    patchAnimation({ frames: nextFrames });
    setFrameIndex(0);
  };

  const uploadFiles = async (files: FileList) => {
    setUploading(true);
    setError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const added: SpriteFrame[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
          body: file,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) throw new Error(data.error || `Falha no upload de ${file.name}`);
        added.push({ id: makeId('frame'), name: file.name, url: data.url, durationMs: 125 });
      }
      patchAnimation({ frames: [...(animation.frames || []), ...added] });
    } catch (e: any) {
      setError(e?.message || 'Falha no upload');
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const askAi = async () => {
    if (!String(draft.aiPrompt || '').trim()) {
      setError('Descreva o personagem que deseja gerar ou refinar.');
      return;
    }
    setAiBusy(true);
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
          mode: 'character-svg',
          prompt: draft.aiPrompt,
          character: {
            name: draft.characterName,
            description: draft.description,
            builder: draft.builder,
            concept: draft.concept,
            width: draft.width,
            height: draft.height,
          },
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.character) throw new Error(data.error || 'A IA não conseguiu gerar o personagem.');
      setDraft((current) => ({
        ...current,
        aiSvg: data.character.svg || current.aiSvg,
        concept: { ...defaultConcept, ...(current.concept || {}), ...(data.character.concept || {}) },
        description: data.character.description || current.description,
        updatedAt: new Date().toISOString(),
      }));
      setTab('poses');
    } catch (e: any) {
      setError(e?.message || 'Falha na geração do personagem');
    } finally {
      setAiBusy(false);
    }
  };

  const resetAi = () => setDraft((current) => ({ ...current, aiSvg: undefined }));

  const copyPromptTemplate = () => {
    const template = `Crie um personagem original em SVG. Papel: ${draft.concept?.role || 'protagonista'}. Arquétipo: ${draft.concept?.archetype || 'curioso'}. Silhueta: ${draft.concept?.silhouetteIntent || 'legível e memorável'}. Shape language: ${draft.concept?.shapeLanguage || 'círculos e triângulos suaves'}. Movimento: ${draft.concept?.movementNotes || 'expressivo'}. Preserve paleta, proporção cabeça/corpo e leitura amigável.`;
    setDraft((current) => ({ ...current, aiPrompt: template }));
    navigator.clipboard?.writeText(template).catch(() => null);
  };

  const quickPrompts = [
    'Gere uma folha conceitual com personagem amigável, turnaround claro e expressões fortes.',
    'Refine para sprite de jogo 2D, simplificando silhueta e contraste para leitura em miniatura.',
    'Crie uma companheira mágica com adereços reconhecíveis e poses abertas.',
  ];

  const turnaroundKinds: CharacterPose['kind'][] = ['front', 'three-quarter', 'side', 'back'];
  const previewExpressions = expressions.slice(0, 4);
  const previewPoses = poses.slice(4, 8);

  return (
    <div className="fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col" onPointerDown={(event) => event.stopPropagation()}>
      <header className="shrink-0 min-h-16 bg-white border-b px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
        <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center">
          <X size={19} />
        </button>
        <div className="min-w-0 flex-1">
          <b className="block truncate">{title}</b>
          <div className="text-[10px] font-mono text-neutral-500 uppercase">personagens · concept art · turnaround · expressões · sprites · IA</div>
        </div>
        <button disabled={!canEdit} onClick={() => onSave({ ...draft, activeAnimationId: animation.id })} className="h-11 px-4 rounded-xl bg-black text-white text-xs font-bold flex items-center gap-2 disabled:opacity-40">
          <Save size={15} /> SALVAR
        </button>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[500px_minmax(0,1fr)] overflow-y-auto xl:overflow-hidden">
        <section className="bg-white border-r p-4 space-y-4 xl:overflow-y-auto">
          <div className="rounded-2xl border p-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {[
                ['builder', 'Montagem'],
                ['concept', 'Ficha'],
                ['poses', 'Pranchas'],
                ['animation', 'Sprites'],
                ['ai', 'IA + SVG'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id as Tab)}
                  className={`rounded-xl border px-3 py-2 text-xs font-semibold ${tab === id ? 'bg-black text-white border-black' : 'hover:border-black'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {tab === 'builder' && (
            <>
              <div className="rounded-2xl border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-neutral-500">Começo rápido</div>
                    <b className="text-sm">Presets conceituais</b>
                    <div className="text-[10px] text-neutral-500 mt-1">Uma mistura entre model sheet, gerador modular e base para sprite.</div>
                  </div>
                  <button type="button" onClick={randomizeCharacter} className="h-9 px-3 rounded-xl border text-[10px] font-bold">
                    RANDOMIZAR
                  </button>
                </div>
                <div className="mt-3 grid sm:grid-cols-2 gap-2">
                  {PRESETS.map((preset) => (
                    <button key={preset.id} type="button" onClick={() => applyPreset(preset.id)} className="rounded-2xl border p-3 text-left hover:border-black">
                      <div className="font-semibold text-sm">{preset.label}</div>
                      <div className="text-[11px] text-neutral-500 mt-1">{preset.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border p-4 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <label className="text-[9px] font-mono text-neutral-500 uppercase">Nome do personagem<input value={draft.characterName} onChange={(event) => setDraft((current) => ({ ...current, characterName: event.target.value }))} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm text-black" /></label>
                  <label className="text-[9px] font-mono text-neutral-500 uppercase">Descrição curta<textarea value={draft.description || ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 min-h-10 w-full rounded-xl border p-3 text-sm text-black" /></label>
                </div>
              </div>

              <Picker label="Cabeça" options={HEAD} value={builder.headShape} onChange={(value) => patchBuilder({ headShape: value })} tip="Formato da cabeça, um dos sinais mais fortes de leitura de personagem." />
              <Picker label="Corpo" options={BODY} value={builder.bodyShape} onChange={(value) => patchBuilder({ bodyShape: value })} tip="A silhueta ajuda a diferenciar personagens antes mesmo dos detalhes internos." />
              <Picker label="Olhos" options={EYES} value={builder.eyeStyle} onChange={(value) => patchBuilder({ eyeStyle: value })} />
              <Picker label="Nariz" options={NOSES} value={builder.noseStyle} onChange={(value) => patchBuilder({ noseStyle: value })} />
              <Picker label="Boca" options={MOUTHS} value={builder.mouthStyle} onChange={(value) => patchBuilder({ mouthStyle: value })} />
              <Picker label="Cabelo" options={HAIR} value={builder.hairStyle} onChange={(value) => patchBuilder({ hairStyle: value })} />
              <Picker label="Roupa" options={OUTFITS} value={builder.outfitStyle} onChange={(value) => patchBuilder({ outfitStyle: value })} />
              <Picker label="Acessório" options={ACCESSORIES} value={builder.accessory} onChange={(value) => patchBuilder({ accessory: value })} />

              <div className="grid sm:grid-cols-2 gap-3">
                <SliderField label="Cabeça × corpo" value={builder.headToBodyRatio} min={3} max={6.5} step={0.1} onChange={(value) => patchBuilder({ headToBodyRatio: value })} tip="Relação menor = cabeça maior e leitura mais cartunesca." />
                <SliderField label="Ombros" value={builder.shoulderWidth} min={0.7} max={1.35} step={0.01} onChange={(value) => patchBuilder({ shoulderWidth: value })} />
                <SliderField label="Tronco" value={builder.torsoLength} min={0.7} max={1.35} step={0.01} onChange={(value) => patchBuilder({ torsoLength: value })} />
                <SliderField label="Braços e pernas" value={builder.limbLength} min={0.7} max={1.35} step={0.01} onChange={(value) => patchBuilder({ limbLength: value })} />
                <SliderField label="Mãos" value={builder.handScale} min={0.6} max={1.5} step={0.01} onChange={(value) => patchBuilder({ handScale: value })} />
                <SliderField label="Pés" value={builder.footScale} min={0.6} max={1.5} step={0.01} onChange={(value) => patchBuilder({ footScale: value })} />
              </div>

              <div className="rounded-2xl border p-4">
                <div className="text-[10px] font-mono uppercase text-neutral-500 mb-3">Paleta do personagem</div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <HexField label="Pele" value={builder.skinColor} onChange={(value) => patchBuilder({ skinColor: value })} />
                  <HexField label="Cabelo" value={builder.hairColor} onChange={(value) => patchBuilder({ hairColor: value })} />
                  <HexField label="Roupa" value={builder.outfitColor} onChange={(value) => patchBuilder({ outfitColor: value })} />
                  <HexField label="Acento" value={builder.accentColor} onChange={(value) => patchBuilder({ accentColor: value })} />
                  <HexField label="Contorno" value={builder.strokeColor} onChange={(value) => patchBuilder({ strokeColor: value })} />
                </div>
              </div>
            </>
          )}

          {tab === 'concept' && (
            <>
              <div className="rounded-2xl border p-4 space-y-3">
                <div className="flex items-center gap-2"><BookOpen size={16} /><b className="text-sm">Ficha de personagem</b></div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="text-[9px] font-mono text-neutral-500 uppercase">Papel<input value={draft.concept?.role || ''} onChange={(event) => patchConcept({ role: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-2 text-sm" /></label>
                  <label className="text-[9px] font-mono text-neutral-500 uppercase">Arquétipo<input value={draft.concept?.archetype || ''} onChange={(event) => patchConcept({ archetype: event.target.value })} className="mt-1 h-10 w-full rounded-xl border px-2 text-sm" /></label>
                </div>
                {[
                  ['Backstory', 'backstory'],
                  ['Intenção de silhueta', 'silhouetteIntent'],
                  ['Shape language', 'shapeLanguage'],
                  ['Intenção de cor', 'colorIntent'],
                  ['Movimento', 'movementNotes'],
                  ['Acessibilidade / representação', 'accessibilityNotes'],
                  ['Justificativa visual', 'designRationale'],
                ].map(([label, key]) => (
                  <label key={key} className="block text-[9px] font-mono text-neutral-500 uppercase">
                    {label}
                    <textarea value={(draft.concept as any)?.[key] || ''} onChange={(event) => patchConcept({ [key]: event.target.value } as any)} className="mt-1 min-h-20 w-full rounded-xl border p-2 text-sm text-black" />
                  </label>
                ))}
              </div>
              <div className="rounded-2xl border p-4">
                <b className="text-sm">Referências para aula</b>
                <div className="mt-2 space-y-2">
                  {REFERENCES.map((reference) => <div key={reference} className="text-[10px] leading-relaxed text-neutral-600">• {reference}</div>)}
                </div>
                <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-[10px]">
                  As tooltips tratam proporção, shape language e cor como convenções de leitura visual, não como essências psicológicas. A ideia é justificar escolhas com clareza, sem estereótipos.
                </div>
              </div>
            </>
          )}

          {tab === 'poses' && (
            <div className="rounded-2xl border p-4 space-y-4">
              <div>
                <b className="text-sm">Pranchas</b>
                <div className="text-[10px] text-neutral-500">Turnaround, expressões e pose sheet, como nos exemplos clássicos de concept art.</div>
              </div>
              <div className="grid sm:grid-cols-2 gap-2">
                {poses.map((pose) => {
                  const svg = pose.svg || buildCharacterSvg(builder, pose.kind, activeExpression, draft.width, draft.height);
                  return (
                    <div key={pose.id} className="rounded-xl border p-3">
                      <div className="aspect-[3/4] bg-neutral-50 rounded-lg overflow-hidden"><img src={svgDataUrl(svg)} className="w-full h-full object-contain" /></div>
                      <div className="mt-2 flex gap-2">
                        <input value={pose.name} onChange={(event) => updatePoses(poses.map((item) => item.id === pose.id ? { ...item, name: event.target.value } : item))} className="h-8 flex-1 rounded-lg border px-2 text-xs" />
                        <button onClick={() => generatePose(pose)} className="h-8 px-3 rounded-lg border text-[9px] font-bold">ATUALIZAR</button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => downloadSvg(draft.aiSvg || manualSvg, draft.characterName)} className="h-10 w-full rounded-xl border flex items-center justify-center gap-2 text-[10px] font-bold"><Download size={13} /> BAIXAR SVG ATUAL</button>
            </div>
          )}

          {tab === 'animation' && (
            <>
              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <b className="text-sm">Sprites e pequenas animações</b>
                    <div className="text-[10px] text-neutral-500">Monte estados locais, upload de frames e sprite sheet rápida.</div>
                  </div>
                  <select onChange={(event) => { if (event.target.value) addAnimation(event.target.value as SpriteAnimationKind); event.currentTarget.value = ''; }} defaultValue="" className="h-9 rounded-xl border px-2 text-[10px]">
                    <option value="" disabled>+ ESTADO</option>
                    {KINDS.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
                  </select>
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {draft.animations.map((item) => (
                    <button key={item.id} onClick={() => { setSelectedAnimationId(item.id); setFrameIndex(0); }} className={`shrink-0 h-9 px-3 rounded-xl border text-[10px] font-bold ${item.id === animation.id ? 'bg-black text-white' : ''}`}>
                      {item.name}
                    </button>
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <label className="text-[9px] font-mono text-neutral-500 uppercase">FPS<input type="number" min={1} max={30} value={animation.fps} onChange={(event) => patchAnimation({ fps: Number(event.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm" /></label>
                  <label className="text-[9px] font-mono text-neutral-500 uppercase">Loop<select value={animation.loop ? 'yes' : 'no'} onChange={(event) => patchAnimation({ loop: event.target.value === 'yes' })} className="mt-1 h-9 w-full rounded-lg border text-sm"><option value="yes">Sim</option><option value="no">Não</option></select></label>
                  <label className="text-[9px] font-mono text-neutral-500 uppercase">Motion<select value={animation.motion} onChange={(event) => patchAnimation({ motion: event.target.value as SpriteMotionPreset })} className="mt-1 h-9 w-full rounded-lg border text-sm">{MOTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
                </div>
                <button onClick={makeGeneratedFrames} className="mt-3 h-10 w-full rounded-xl bg-black text-white text-[10px] font-bold flex items-center justify-center gap-2"><Sparkles size={13} /> GERAR FRAMES A PARTIR DO PERSONAGEM</button>
              </div>

              <div className="rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <b className="text-sm">Frames próprios</b>
                    <div className="text-[10px] text-neutral-500">Use ativos do projeto, desenhos ou uploads externos.</div>
                  </div>
                  <button onClick={() => fileRef.current?.click()} className="h-9 px-3 rounded-xl border text-[10px] font-bold"><Upload size={13} className="inline mr-1" />UPLOAD</button>
                </div>
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { if (event.target.files) void uploadFiles(event.target.files); }} />
                <div className="mt-3 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                  {availableAssets.map((asset) => (
                    <button key={asset.id} onClick={() => addAssetFrame(asset)} className="rounded-xl border overflow-hidden text-left hover:border-black">
                      <div className="aspect-square bg-neutral-100"><img src={asset.url} className="w-full h-full object-contain" /></div>
                      <div className="p-2 text-[9px] font-bold truncate">+ {asset.name}</div>
                    </button>
                  ))}
                </div>
                {uploading ? <div className="mt-2 text-[10px]">Enviando...</div> : null}
              </div>

              <div className="rounded-2xl border p-4">
                <b className="text-sm">Timeline do estado</b>
                <div className="mt-3 space-y-2">
                  {(animation.frames || []).map((frame, index) => (
                    <div key={frame.id} className="flex items-center gap-2 rounded-xl border p-2">
                      <img src={frame.url} className="h-12 w-12 object-contain bg-neutral-50 rounded" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-bold truncate">{index + 1}. {frame.name}</div>
                        <input type="number" min={30} max={5000} value={frame.durationMs || 125} onChange={(event) => patchAnimation({ frames: animation.frames.map((item) => item.id === frame.id ? { ...item, durationMs: Number(event.target.value) } : item) })} className="mt-1 h-7 w-24 border rounded px-1 text-[10px]" />
                      </div>
                      <button onClick={() => patchAnimation({ frames: animation.frames.filter((item) => item.id !== frame.id) })} className="h-8 w-8 rounded-lg border text-red-600"><Trash2 size={13} className="mx-auto" /></button>
                    </div>
                  ))}
                  {!animation.frames.length ? <div className="rounded-xl border border-dashed p-4 text-center text-[10px] text-neutral-400">Ainda não há frames neste estado.</div> : null}
                </div>
              </div>
            </>
          )}

          {tab === 'ai' && (
            <div className="rounded-2xl border-2 border-black p-4 space-y-3">
              <div className="flex items-center gap-2"><WandSparkles size={16} /><b className="text-sm">Gerar ou refinar por IA</b></div>
              <div className="text-[10px] text-neutral-500">A IA parte da ficha e do construtor para propor um SVG original. O foco é sair com algo utilizável e consistente para model sheet, sprite ou personagem de interface.</div>
              <div className="flex flex-wrap gap-2">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => setDraft((current) => ({ ...current, aiPrompt: prompt }))} className="rounded-full border px-3 py-1.5 text-[10px] hover:border-black">
                    {prompt}
                  </button>
                ))}
                <button type="button" onClick={copyPromptTemplate} className="rounded-full border px-3 py-1.5 text-[10px] hover:border-black flex items-center gap-1"><Copy size={12} /> TEMPLATE</button>
              </div>
              <div className="flex gap-2 items-start">
                <textarea value={draft.aiPrompt || ''} onChange={(event) => setDraft((current) => ({ ...current, aiPrompt: event.target.value }))} placeholder="Ex.: crie uma personagem pesquisadora, modular, amigável, com turnaround legível, pronta para sprite 2D, mantendo cabeça maior, jardineira azul e paleta reduzida..." className="min-h-28 min-w-0 flex-1 rounded-xl border p-3 text-sm" />
                <VoiceDictationButton onText={(text) => setDraft((current) => ({ ...current, aiPrompt: `${current.aiPrompt || ''}${current.aiPrompt ? ' ' : ''}${text}` }))} />
              </div>
              <button onClick={() => void askAi()} disabled={aiBusy} className="h-11 w-full rounded-xl bg-black text-white text-[10px] font-bold flex items-center justify-center gap-2">{aiBusy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} GERAR PERSONAGEM SVG + FICHA</button>
              {draft.aiSvg ? <button onClick={resetAi} className="h-9 w-full rounded-xl border text-[10px] flex items-center justify-center gap-2"><RotateCcw size={12} /> VOLTAR AO CONSTRUTOR MANUAL</button> : null}
            </div>
          )}

          {error ? <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</div> : null}
        </section>

        <section className="min-h-[55vh] xl:min-h-0 overflow-auto p-5 sm:p-8 flex flex-col items-center gap-5">
          <div className="w-full max-w-5xl flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-mono text-neutral-500 uppercase">Prancha viva</div>
              <b className="text-xl">{draft.characterName}</b>
              <div className="text-sm text-neutral-500">Mistura entre gerador modular, model sheet e base para sprite.</div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setPlaying((value) => !value)} className="h-10 px-4 rounded-xl bg-black text-white text-[10px] font-bold flex items-center gap-2">{playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'PAUSAR' : 'REPRODUZIR'}</button>
              <button onClick={() => downloadSvg(draft.aiSvg || manualSvg, draft.characterName)} className="h-10 px-4 rounded-xl border text-[10px] font-bold flex items-center gap-2"><Download size={14} /> SVG</button>
            </div>
          </div>

          <div className="w-full max-w-5xl grid xl:grid-cols-[1.3fr_.95fr] gap-4">
            <SheetCard label="Prancha principal">
              <div className="rounded-3xl border bg-white min-h-[540px] flex items-center justify-center p-8" style={{ background: draft.background }}>
                <motion.div {...motionProps(animation?.motion || 'none', playing)} className="flex items-center justify-center max-w-full max-h-full">
                  <img src={mainPreviewUrl} alt={draft.characterName} className="max-w-full max-h-[500px] object-contain" style={{ imageRendering: draft.pixelated ? 'pixelated' : 'auto' }} />
                </motion.div>
              </div>
            </SheetCard>

            <div className="grid gap-4">
              <SheetCard label="Proportion settings">
                <div className="grid grid-cols-[92px_1fr] gap-3 items-center">
                  <div className="aspect-[3/4] rounded-xl bg-neutral-50 border overflow-hidden flex items-center justify-center">
                    <img src={svgDataUrl(buildCharacterSvg(builder, 'front', activeExpression, 160, 220))} className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{builder.headToBodyRatio.toFixed(1)} cabeças</div>
                    <div className="mt-2 h-2 rounded-full bg-neutral-200 overflow-hidden"><div className="h-full bg-black rounded-full" style={{ width: `%` }} /></div>
                    <div className="mt-2 text-[11px] text-neutral-500">O corpo responde a proporção cabeça × corpo, largura de ombros, tronco e comprimento de membros.</div>
                  </div>
                </div>
              </SheetCard>

              <SheetCard label="Turnarounds">
                <div className="grid grid-cols-4 gap-2">
                  {turnaroundKinds.map((kind) => (
                    <div key={kind} className="rounded-xl border bg-neutral-50 p-2">
                      <div className="aspect-[3/4] overflow-hidden rounded-lg"><img src={svgDataUrl(buildCharacterSvg(builder, kind, activeExpression, 120, 150))} className="w-full h-full object-contain" /></div>
                      <div className="mt-1 text-center text-[10px] font-medium text-neutral-600">{kind === 'front' ? 'Frente' : kind === 'three-quarter' ? '3/4' : kind === 'side' ? 'Perfil' : 'Costas'}</div>
                    </div>
                  ))}
                </div>
              </SheetCard>

              <SheetCard label="Expression sheet">
                <div className="grid grid-cols-4 gap-2">
                  {previewExpressions.map((expression) => (
                    <div key={expression.id} className="rounded-xl border bg-neutral-50 p-2">
                      <div className="aspect-square rounded-full overflow-hidden border bg-white flex items-center justify-center">
                        <img src={svgDataUrl(buildCharacterSvg(builder, 'front', expression, 140, 140))} className="w-full h-full object-contain" />
                      </div>
                      <input value={expression.name} onChange={(event) => updateExpressions(expressions.map((item) => item.id === expression.id ? { ...item, name: event.target.value } : item))} className="mt-2 h-7 w-full rounded-lg border px-2 text-[10px]" />
                    </div>
                  ))}
                </div>
              </SheetCard>

              <SheetCard label="Pose sheet">
                <div className="grid grid-cols-2 gap-2">
                  {previewPoses.map((pose) => (
                    <div key={pose.id} className="rounded-xl border bg-neutral-50 p-2">
                      <div className="aspect-[4/3] overflow-hidden rounded-lg"><img src={svgDataUrl(buildCharacterSvg(builder, pose.kind, activeExpression, 180, 140))} className="w-full h-full object-contain" /></div>
                      <div className="mt-1 text-center text-[10px] font-medium text-neutral-600">{pose.name}</div>
                    </div>
                  ))}
                </div>
              </SheetCard>
            </div>
          </div>

          {animation && animation.frames.length ? (
            <div className="w-full max-w-5xl rounded-2xl bg-white border p-4">
              <div className="flex items-center gap-2"><b className="text-sm">{animation.name}</b><span className="text-[9px] text-neutral-500">· {animation.frames.length} frames · {animation.fps} fps</span></div>
              <div className="mt-2 flex gap-1 overflow-x-auto">
                {animation.frames.map((frame, index) => (
                  <button key={frame.id} onClick={() => { setFrameIndex(index); setPlaying(false); }} className={`shrink-0 h-14 w-14 rounded-lg border overflow-hidden ${index === frameIndex ? 'ring-2 ring-black' : ''}`}>
                    <img src={frame.url} className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
