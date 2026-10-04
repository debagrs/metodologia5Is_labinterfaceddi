import { StudioWorkspace } from './StudioWorkspace';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Download, Info, Loader2, Pause, Play, Plus, Save, Sparkles, Trash2, Upload, WandSparkles, X } from 'lucide-react';
import type {
  CharacterAppearance,
  CharacterBodyPlan,
  CharacterExpression,
  CharacterFootStyle,
  CharacterHornStyle,
  CharacterMuzzleStyle,
  CharacterPoseKind,
  CharacterPoseReference,
  CharacterProfile,
  CharacterSpecies,
  CharacterSpriteDocument,
  CharacterSurfaceStyle,
  CharacterTailStyle,
  CharacterView,
  CharacterWingStyle,
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

type Tab = 'builder' | 'profile' | 'poses' | 'animate' | 'ai';

type Option<T extends string> = { id: T; label: string; tip?: string };

const id = (prefix = 'char') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const esc = (value: string) => String(value || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m] as string));
const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const normalizeHex = (value: string, fallback = '#111111') => {
  const clean = String(value || '').trim().replace(/^#/, '').toUpperCase();
  if (/^[0-9A-F]{3}$/.test(clean)) return `#${clean.split('').map((x) => x + x).join('')}`;
  if (/^[0-9A-F]{6}$/.test(clean)) return `#${clean}`;
  return fallback;
};

const SPECIES: Option<CharacterSpecies>[] = [
  { id: 'human', label: 'Humano' },
  { id: 'anthropomorphic', label: 'Antropomorfo' },
  { id: 'quadruped', label: 'Animal quadrúpede' },
  { id: 'bird', label: 'Ave' },
  { id: 'reptile', label: 'Réptil' },
  { id: 'amphibian', label: 'Anfíbio' },
  { id: 'fish', label: 'Peixe / aquático' },
  { id: 'arthropod', label: 'Artrópode' },
  { id: 'fantasy', label: 'Fantástico' },
  { id: 'hybrid', label: 'Híbrido' },
];

const BODY_PLANS: Option<CharacterBodyPlan>[] = [
  { id: 'biped', label: 'Bípede' },
  { id: 'quadruped', label: 'Quadrúpede' },
  { id: 'avian', label: 'Alado / ave' },
  { id: 'serpentine', label: 'Serpentino' },
  { id: 'aquatic', label: 'Aquático' },
  { id: 'six-limbed', label: '6 membros' },
  { id: 'eight-limbed', label: '8 membros' },
  { id: 'custom', label: 'Personalizado' },
];

const HEADS = [
  { id: 'round', label: 'Redonda' }, { id: 'oval', label: 'Oval' }, { id: 'square', label: 'Quadrada' },
  { id: 'heart', label: 'Coração' }, { id: 'triangle', label: 'Triangular' }, { id: 'wide', label: 'Larga' },
] as Option<CharacterAppearance['headShape']>[];
const FACES = [
  { id: 'soft', label: 'Suave' }, { id: 'angular', label: 'Angular' }, { id: 'long', label: 'Longo' }, { id: 'wide', label: 'Largo' },
] as Option<CharacterAppearance['faceShape']>[];
const EYES = [
  { id: 'round', label: 'Redondos' }, { id: 'almond', label: 'Amendoados' }, { id: 'narrow', label: 'Estreitos' }, { id: 'dot', label: 'Pontos' }, { id: 'large', label: 'Grandes' },
] as Option<CharacterAppearance['eyeStyle']>[];
const BROWS = [
  { id: 'none', label: 'Nenhuma' }, { id: 'soft', label: 'Suave' }, { id: 'straight', label: 'Reta' }, { id: 'arched', label: 'Arqueada' }, { id: 'bold', label: 'Marcada' },
] as Option<CharacterAppearance['browStyle']>[];
const NOSES = [
  { id: 'none', label: 'Nenhum' }, { id: 'small', label: 'Pequeno' }, { id: 'straight', label: 'Reto' }, { id: 'wide', label: 'Largo' },
] as Option<CharacterAppearance['noseStyle']>[];
const MOUTHS = [
  { id: 'line', label: 'Linha' }, { id: 'smile', label: 'Sorriso' }, { id: 'full', label: 'Cheia' }, { id: 'small', label: 'Pequena' },
] as Option<CharacterAppearance['mouthStyle']>[];
const EARS = [
  { id: 'none', label: 'Nenhuma' }, { id: 'simple', label: 'Simples' }, { id: 'round', label: 'Redonda' }, { id: 'pointed', label: 'Pontuda' },
  { id: 'long', label: 'Longa' }, { id: 'floppy', label: 'Caída' }, { id: 'large', label: 'Grande' }, { id: 'fin', label: 'Barbatana' },
] as Option<CharacterAppearance['earStyle']>[];
const HAIR = [
  { id: 'none', label: 'Nenhum' }, { id: 'short', label: 'Curto' }, { id: 'bob', label: 'Bob' }, { id: 'long', label: 'Longo' },
  { id: 'curly', label: 'Cacheado' }, { id: 'spiky', label: 'Espetado' }, { id: 'bun', label: 'Coque' },
] as Option<CharacterAppearance['hairStyle']>[];
const MUZZLES: Option<CharacterMuzzleStyle>[] = [
  { id: 'none', label: 'Nenhum' }, { id: 'short', label: 'Focinho curto' }, { id: 'round', label: 'Focinho redondo' }, { id: 'long', label: 'Focinho longo' },
  { id: 'beak-small', label: 'Bico curto' }, { id: 'beak-long', label: 'Bico longo' }, { id: 'beak-hooked', label: 'Bico curvo' },
];
const TAILS: Option<CharacterTailStyle>[] = [
  { id: 'none', label: 'Nenhuma' }, { id: 'short', label: 'Curta' }, { id: 'long', label: 'Longa' }, { id: 'fluffy', label: 'Peluda' },
  { id: 'curled', label: 'Enrolada' }, { id: 'reptile', label: 'Réptil' }, { id: 'fish', label: 'Cauda de peixe' },
];
const WINGS: Option<CharacterWingStyle>[] = [
  { id: 'none', label: 'Nenhuma' }, { id: 'feather', label: 'Penas' }, { id: 'bat', label: 'Membrana' }, { id: 'fin', label: 'Barbatana' },
];
const HORNS: Option<CharacterHornStyle>[] = [
  { id: 'none', label: 'Nenhum' }, { id: 'short', label: 'Curtos' }, { id: 'long', label: 'Longos' }, { id: 'antlers', label: 'Galhadas' }, { id: 'antennae', label: 'Antenas' },
];
const SURFACES: Option<CharacterSurfaceStyle>[] = [
  { id: 'skin', label: 'Pele' }, { id: 'fur-short', label: 'Pelo curto' }, { id: 'fur-long', label: 'Pelo longo' }, { id: 'feathers', label: 'Plumas' },
  { id: 'scales', label: 'Escamas' }, { id: 'shell', label: 'Casco / carapaça' }, { id: 'chitin', label: 'Quitina' },
];
const FEET: Option<CharacterFootStyle>[] = [
  { id: 'feet', label: 'Pés' }, { id: 'paws', label: 'Patas' }, { id: 'hooves', label: 'Cascos' }, { id: 'claws', label: 'Garras' }, { id: 'talons', label: 'Talões' }, { id: 'fins', label: 'Nadadeiras' },
];
const BODY_SHAPES = [
  { id: 'slim', label: 'Esguio' }, { id: 'average', label: 'Equilibrado' }, { id: 'athletic', label: 'Atlético' }, { id: 'stocky', label: 'Robusto' }, { id: 'chibi', label: 'Chibi / compacto' },
] as Option<CharacterAppearance['bodyShape']>[];
const TORSOS = [
  { id: 'rectangle', label: 'Retângulo' }, { id: 'trapezoid', label: 'Trapézio' }, { id: 'round', label: 'Redondo' }, { id: 'triangle', label: 'Triângulo' },
] as Option<CharacterAppearance['torsoShape']>[];
const ARMS = [{ id: 'thin', label: 'Finos' }, { id: 'regular', label: 'Regulares' }, { id: 'strong', label: 'Fortes' }] as Option<CharacterAppearance['armStyle']>[];
const LEGS = [{ id: 'short', label: 'Curtas' }, { id: 'regular', label: 'Regulares' }, { id: 'long', label: 'Longas' }] as Option<CharacterAppearance['legStyle']>[];
const HANDS = [{ id: 'mitten', label: 'Luva / simples' }, { id: 'simple', label: 'Simples' }, { id: 'defined', label: 'Definidas' }] as Option<CharacterAppearance['handStyle']>[];
const OUTFITS = [
  { id: 'none', label: 'Nenhum' }, { id: 'basic', label: 'Básico' }, { id: 'sport', label: 'Esportivo' }, { id: 'formal', label: 'Formal' },
  { id: 'fantasy', label: 'Fantasia' }, { id: 'tech', label: 'Tech' }, { id: 'street', label: 'Street' },
] as Option<CharacterAppearance['outfitStyle']>[];
const ACCESSORIES = [
  { id: 'none', label: 'Nenhum' }, { id: 'glasses', label: 'Óculos' }, { id: 'hat', label: 'Chapéu' }, { id: 'scarf', label: 'Cachecol' }, { id: 'backpack', label: 'Mochila' }, { id: 'headphones', label: 'Fones' },
] as Option<CharacterAppearance['accessory']>[];

const EXPRESSIONS: CharacterExpression[] = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'determined'];
const VIEWS: CharacterView[] = ['front', 'three-quarter', 'side', 'back'];
const POSES: Array<{ kind: CharacterPoseKind; label: string }> = [
  { kind: 'neutral', label: 'Neutra' }, { kind: 'wave', label: 'Aceno' }, { kind: 'walk', label: 'Caminhada' }, { kind: 'run', label: 'Corrida' },
  { kind: 'jump', label: 'Salto' }, { kind: 'sit', label: 'Sentado' }, { kind: 'action', label: 'Ação' },
];
const MOTIONS: Option<SpriteMotionPreset>[] = [
  { id: 'none', label: 'Sem motion' }, { id: 'bob', label: 'Flutuar' }, { id: 'bounce', label: 'Bounce' }, { id: 'shake', label: 'Tremer' }, { id: 'pulse', label: 'Pulsar' }, { id: 'squash', label: 'Squash & stretch' },
];
const ANIMATION_KINDS: Option<SpriteAnimationKind>[] = [
  { id: 'idle', label: 'Idle' }, { id: 'walk', label: 'Andar' }, { id: 'run', label: 'Correr' }, { id: 'jump', label: 'Pular' }, { id: 'attack', label: 'Ação' }, { id: 'hurt', label: 'Reação' }, { id: 'custom', label: 'Custom' },
];

const DEFAULT_APPEARANCE: CharacterAppearance = {
  species: 'human', bodyPlan: 'biped', speciesPreset: 'human', hybridPrimaryPreset: 'human', hybridSecondaryPreset: 'cat', hybridBlend: 50, headShape: 'oval', faceShape: 'soft', eyeStyle: 'dot', browStyle: 'soft', noseStyle: 'small', mouthStyle: 'line', earStyle: 'simple', hairStyle: 'short',
  muzzleStyle: 'none', tailStyle: 'none', wingStyle: 'none', hornStyle: 'none', surfaceStyle: 'skin', footStyle: 'feet', whiskers: false,
  bodyShape: 'average', torsoShape: 'rectangle', armStyle: 'regular', legStyle: 'regular', handStyle: 'simple', outfitStyle: 'basic', accessory: 'none',
  headToBodyRatio: 4.8, shoulderWidth: 1, limbLength: 1, bodyWidth: 1,
  skinColor: '#F1C7A5', surfaceColor: '#F1C7A5', hairColor: '#2B2118', eyeColor: '#111111', outfitPrimary: '#4FD9D3', outfitSecondary: '#FFFFFF', lineColor: '#111111',
};

const DEFAULT_PROFILE: CharacterProfile = {
  role: '', ageBand: '', personality: '', motivation: '', backstory: '', keywords: [], silhouetteIntent: '', shapeLanguageRationale: '', proportionRationale: '', colorRationale: '', costumeRationale: '',
};

const DEFAULT_POSES: CharacterPoseReference[] = POSES.map((pose) => ({ id: `pose-${pose.kind}`, name: pose.label, kind: pose.kind, view: pose.kind === 'walk' || pose.kind === 'run' ? 'side' : 'three-quarter' }));

const PRESETS: Array<{ id: string; label: string; icon: string; description: string; patch: Partial<CharacterAppearance> }> = [
  { id: 'human', label: 'Humano', icon: '🙂', description: 'Base bípede humana.', patch: { species: 'human', bodyPlan: 'biped', speciesPreset: 'human', earStyle: 'simple', muzzleStyle: 'none', tailStyle: 'none', wingStyle: 'none', hornStyle: 'none', surfaceStyle: 'skin', footStyle: 'feet', browStyle: 'soft', whiskers: false } },
  { id: 'cat', label: 'Gato', icon: '🐈', description: 'Quadrúpede felino.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'cat', earStyle: 'pointed', muzzleStyle: 'short', tailStyle: 'long', surfaceStyle: 'fur-short', footStyle: 'paws', browStyle: 'none', noseStyle: 'small', hairStyle: 'none', whiskers: true, bodyShape: 'slim' } },
  { id: 'dog', label: 'Cão', icon: '🐕', description: 'Quadrúpede canino.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'dog', earStyle: 'floppy', muzzleStyle: 'long', tailStyle: 'curled', surfaceStyle: 'fur-short', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: false, bodyShape: 'average' } },
  { id: 'rabbit', label: 'Coelho', icon: '🐇', description: 'Orelhas longas e corpo compacto.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'rabbit', earStyle: 'long', muzzleStyle: 'short', tailStyle: 'short', surfaceStyle: 'fur-short', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: true, bodyShape: 'chibi', headToBodyRatio: 3.6 } },
  { id: 'fox', label: 'Raposa', icon: '🦊', description: 'Silhueta triangular e cauda forte.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'fox', earStyle: 'pointed', muzzleStyle: 'long', tailStyle: 'fluffy', surfaceStyle: 'fur-long', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: true, bodyShape: 'slim' } },
  { id: 'bear', label: 'Urso', icon: '🐻', description: 'Massas redondas e corpo robusto.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'bear', earStyle: 'round', muzzleStyle: 'round', tailStyle: 'short', surfaceStyle: 'fur-long', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: false, bodyShape: 'stocky', bodyWidth: 1.2 } },
  { id: 'bird', label: 'Ave', icon: '🐦', description: 'Bico, asas e plumagem.', patch: { species: 'bird', bodyPlan: 'avian', speciesPreset: 'bird', earStyle: 'none', muzzleStyle: 'beak-small', tailStyle: 'long', wingStyle: 'feather', surfaceStyle: 'feathers', footStyle: 'talons', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'reptile', label: 'Lagarto', icon: '🦎', description: 'Escamas, garras e cauda reptiliana.', patch: { species: 'reptile', bodyPlan: 'quadruped', speciesPreset: 'lizard', earStyle: 'none', muzzleStyle: 'long', tailStyle: 'reptile', surfaceStyle: 'scales', footStyle: 'claws', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'fish', label: 'Peixe', icon: '🐟', description: 'Plano aquático e nadadeiras.', patch: { species: 'fish', bodyPlan: 'aquatic', speciesPreset: 'fish', earStyle: 'none', muzzleStyle: 'none', tailStyle: 'fish', wingStyle: 'fin', surfaceStyle: 'scales', footStyle: 'fins', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'insect', label: 'Inseto', icon: '🪲', description: 'Seis membros e antenas.', patch: { species: 'arthropod', bodyPlan: 'six-limbed', speciesPreset: 'insect', earStyle: 'none', muzzleStyle: 'none', tailStyle: 'none', hornStyle: 'antennae', surfaceStyle: 'chitin', footStyle: 'claws', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'spider', label: 'Aranha', icon: '🕷️', description: 'Oito membros e corpo segmentado.', patch: { species: 'arthropod', bodyPlan: 'eight-limbed', speciesPreset: 'spider', earStyle: 'none', muzzleStyle: 'none', tailStyle: 'none', hornStyle: 'none', surfaceStyle: 'chitin', footStyle: 'claws', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'dragon', label: 'Dragão', icon: '🐉', description: 'Híbrido fantástico com asas e chifres.', patch: { species: 'fantasy', bodyPlan: 'quadruped', speciesPreset: 'dragon', earStyle: 'pointed', muzzleStyle: 'long', tailStyle: 'reptile', wingStyle: 'bat', hornStyle: 'long', surfaceStyle: 'scales', footStyle: 'claws', browStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
];

const HYBRID_BASES = PRESETS.filter((preset) => !['dragon'].includes(preset.id));
const HYBRID_QUICK = [
  { label: 'Humano + ave', a: 'human', b: 'bird', blend: 48 },
  { label: 'Gato + ave', a: 'cat', b: 'bird', blend: 55 },
  { label: 'Raposa + réptil', a: 'fox', b: 'reptile', blend: 52 },
  { label: 'Urso + inseto', a: 'bear', b: 'insect', blend: 42 },
  { label: 'Peixe + ave', a: 'fish', b: 'bird', blend: 50 },
  { label: 'Humano + raposa', a: 'human', b: 'fox', blend: 45 },
];

function presetPatch(presetId?: string): Partial<CharacterAppearance> {
  return PRESETS.find((preset) => preset.id === presetId)?.patch || {};
}

function nonNone<T extends string | undefined>(a: T, b: T, preferB: boolean, noneValue = 'none'): T {
  const av = a as string | undefined;
  const bv = b as string | undefined;
  if (preferB && bv && bv !== noneValue) return b;
  if (av && av !== noneValue) return a;
  return (b || a) as T;
}

function hybridAppearance(current: CharacterAppearance, primaryId: string, secondaryId: string, blend: number): CharacterAppearance {
  const primary = { ...DEFAULT_APPEARANCE, ...presetPatch(primaryId) } as CharacterAppearance;
  const secondary = { ...DEFAULT_APPEARANCE, ...presetPatch(secondaryId) } as CharacterAppearance;
  const t = clamp(blend / 100, 0, 1);
  const preferB = t >= .5;
  const mix = (a: number, b: number) => Number((a + (b - a) * t).toFixed(2));
  const bodyPlan = t < .68 ? primary.bodyPlan : secondary.bodyPlan;
  const surfaceStyle = t < .55 ? primary.surfaceStyle : secondary.surfaceStyle;
  return {
    ...current,
    species: 'hybrid',
    speciesPreset: 'hybrid',
    hybridPrimaryPreset: primaryId,
    hybridSecondaryPreset: secondaryId,
    hybridBlend: Math.round(blend),
    bodyPlan,
    headShape: preferB ? secondary.headShape : primary.headShape,
    faceShape: preferB ? secondary.faceShape : primary.faceShape,
    eyeStyle: t > .62 ? secondary.eyeStyle : primary.eyeStyle,
    browStyle: nonNone(primary.browStyle, secondary.browStyle, preferB),
    noseStyle: nonNone(primary.noseStyle, secondary.noseStyle, preferB),
    mouthStyle: preferB ? secondary.mouthStyle : primary.mouthStyle,
    earStyle: nonNone(primary.earStyle, secondary.earStyle, t > .42),
    hairStyle: nonNone(primary.hairStyle, secondary.hairStyle, t > .62),
    muzzleStyle: nonNone(primary.muzzleStyle, secondary.muzzleStyle, t > .38),
    tailStyle: nonNone(primary.tailStyle, secondary.tailStyle, t > .28),
    wingStyle: nonNone(primary.wingStyle, secondary.wingStyle, t > .25),
    hornStyle: nonNone(primary.hornStyle, secondary.hornStyle, t > .3),
    surfaceStyle,
    footStyle: t < .55 ? primary.footStyle : secondary.footStyle,
    whiskers: t < .5 ? !!primary.whiskers : !!secondary.whiskers,
    bodyShape: preferB ? secondary.bodyShape : primary.bodyShape,
    torsoShape: t > .65 ? secondary.torsoShape : primary.torsoShape,
    armStyle: preferB ? secondary.armStyle : primary.armStyle,
    legStyle: preferB ? secondary.legStyle : primary.legStyle,
    handStyle: t > .6 ? secondary.handStyle : primary.handStyle,
    outfitStyle: primary.outfitStyle !== 'none' && t < .65 ? primary.outfitStyle : secondary.outfitStyle,
    accessory: current.accessory,
    headToBodyRatio: mix(primary.headToBodyRatio, secondary.headToBodyRatio),
    shoulderWidth: mix(primary.shoulderWidth, secondary.shoulderWidth),
    limbLength: mix(primary.limbLength, secondary.limbLength),
    bodyWidth: mix(primary.bodyWidth, secondary.bodyWidth),
  };
}

const REFERENCES = [
  'Tom Bancroft — Creating Characters with Personality: silhueta, contraste e apelo.',
  'Stephen Silver — The Silver Way: iteração, clareza e consistência de model sheet.',
  'Bryan Tillman — Creative Character Design: shape language contextualizada.',
  'Preston Blair — Cartoon Animation: pose, line of action e leitura de movimento.',
  'Richard Williams — The Animator’s Survival Kit: timing, spacing e ciclos.',
  'Model sheet, turnaround, expression sheet e pose sheet: documentação visual para manter consistência.',
  'Para animais e criaturas, observar anatomia, locomoção e centro de massa reais antes de estilizar.',
];

const blankAnimation = (kind: SpriteAnimationKind = 'idle'): SpriteAnimation => ({
  id: id('anim'), name: ANIMATION_KINDS.find((item) => item.id === kind)?.label || 'Animação', kind, fps: kind === 'run' ? 12 : 8, loop: !['jump', 'attack', 'hurt'].includes(kind), motion: kind === 'idle' ? 'bob' : 'none', frames: [],
});

export const blankSpriteCharacter = (): CharacterSpriteDocument => ({
  title: 'Personagem', characterName: 'Novo personagem', description: '', width: 360, height: 520, background: '#F4F4F2', pixelated: false,
  appearance: { ...DEFAULT_APPEARANCE }, profile: { ...DEFAULT_PROFILE }, prompt: '', generatedNotes: [], poses: DEFAULT_POSES.map((pose) => ({ ...pose })), expressions: [...EXPRESSIONS],
  activeView: 'front', activeExpression: 'neutral', activePose: 'neutral', animations: [blankAnimation('idle')], updatedAt: new Date().toISOString(),
});

function mergeDocument(document: CharacterSpriteDocument): CharacterSpriteDocument {
  const base = blankSpriteCharacter();
  return {
    ...base,
    ...document,
    appearance: { ...DEFAULT_APPEARANCE, ...(document.appearance || {}) },
    profile: { ...DEFAULT_PROFILE, ...(document.profile || {}) },
    poses: document.poses?.length ? document.poses.map((pose) => ({ ...pose })) : base.poses,
    expressions: document.expressions?.length ? [...document.expressions] : base.expressions,
    animations: document.animations?.length ? document.animations.map((animation) => ({ ...animation, frames: (animation.frames || []).map((frame) => ({ ...frame })) })) : base.animations,
  };
}

function headShapeMarkup(a: CharacterAppearance, cx: number, cy: number, w: number, h: number, fill: string) {
  const common = `fill="${fill}"`;
  if (a.headShape === 'square') return `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="${w * 0.12}" ${common}/>`;
  if (a.headShape === 'heart') return `<path d="M ${cx} ${cy + h * .46} C ${cx - w * .55} ${cy + h * .08}, ${cx - w * .56} ${cy - h * .38}, ${cx} ${cy - h * .2} C ${cx + w * .56} ${cy - h * .38}, ${cx + w * .55} ${cy + h * .08}, ${cx} ${cy + h * .46} Z" ${common}/>`;
  if (a.headShape === 'triangle') return `<path d="M ${cx} ${cy + h * .48} L ${cx - w * .48} ${cy - h * .34} Q ${cx} ${cy - h * .58} ${cx + w * .48} ${cy - h * .34} Z" ${common}/>`;
  if (a.headShape === 'wide') return `<ellipse cx="${cx}" cy="${cy}" rx="${w * .58}" ry="${h * .43}" ${common}/>`;
  if (a.headShape === 'round') return `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * .5}" ${common}/>`;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${w * .46}" ry="${h * .54}" ${common}/>`;
}

function earsMarkup(a: CharacterAppearance, cx: number, cy: number, w: number, h: number, fill: string) {
  if (a.earStyle === 'none') return '';
  if (a.earStyle === 'pointed') return `<path d="M ${cx - w * .42} ${cy - h * .3} L ${cx - w * .22} ${cy - h * .78} L ${cx - w * .08} ${cy - h * .28} Z" fill="${fill}"/><path d="M ${cx + w * .42} ${cy - h * .3} L ${cx + w * .22} ${cy - h * .78} L ${cx + w * .08} ${cy - h * .28} Z" fill="${fill}"/>`;
  if (a.earStyle === 'long') return `<ellipse cx="${cx - w * .22}" cy="${cy - h * .64}" rx="${w * .11}" ry="${h * .42}" fill="${fill}" transform="rotate(-8 ${cx - w * .22} ${cy - h * .64})"/><ellipse cx="${cx + w * .22}" cy="${cy - h * .64}" rx="${w * .11}" ry="${h * .42}" fill="${fill}" transform="rotate(8 ${cx + w * .22} ${cy - h * .64})"/>`;
  if (a.earStyle === 'floppy') return `<ellipse cx="${cx - w * .45}" cy="${cy + h * .05}" rx="${w * .16}" ry="${h * .32}" fill="${fill}" transform="rotate(18 ${cx - w * .45} ${cy + h * .05})"/><ellipse cx="${cx + w * .45}" cy="${cy + h * .05}" rx="${w * .16}" ry="${h * .32}" fill="${fill}" transform="rotate(-18 ${cx + w * .45} ${cy + h * .05})"/>`;
  if (a.earStyle === 'large') return `<ellipse cx="${cx - w * .48}" cy="${cy}" rx="${w * .22}" ry="${h * .32}" fill="${fill}"/><ellipse cx="${cx + w * .48}" cy="${cy}" rx="${w * .22}" ry="${h * .32}" fill="${fill}"/>`;
  if (a.earStyle === 'fin') return `<path d="M ${cx - w * .45} ${cy - h * .05} L ${cx - w * .8} ${cy - h * .28} L ${cx - w * .68} ${cy + h * .16} Z" fill="${fill}"/><path d="M ${cx + w * .45} ${cy - h * .05} L ${cx + w * .8} ${cy - h * .28} L ${cx + w * .68} ${cy + h * .16} Z" fill="${fill}"/>`;
  if (a.earStyle === 'round') return `<circle cx="${cx - w * .45}" cy="${cy - h * .05}" r="${w * .16}" fill="${fill}"/><circle cx="${cx + w * .45}" cy="${cy - h * .05}" r="${w * .16}" fill="${fill}"/>`;
  return `<ellipse cx="${cx - w * .46}" cy="${cy}" rx="${w * .12}" ry="${h * .18}" fill="${fill}"/><ellipse cx="${cx + w * .46}" cy="${cy}" rx="${w * .12}" ry="${h * .18}" fill="${fill}"/>`;
}

function hornsMarkup(a: CharacterAppearance, cx: number, cy: number, w: number, h: number, line: string) {
  if (!a.hornStyle || a.hornStyle === 'none') return '';
  if (a.hornStyle === 'antennae') return `<path d="M ${cx - w * .2} ${cy - h * .42} Q ${cx - w * .42} ${cy - h * .82} ${cx - w * .58} ${cy - h * .92}" fill="none" stroke="${line}"/><circle cx="${cx - w * .58}" cy="${cy - h * .92}" r="5" fill="${line}"/><path d="M ${cx + w * .2} ${cy - h * .42} Q ${cx + w * .42} ${cy - h * .82} ${cx + w * .58} ${cy - h * .92}" fill="none" stroke="${line}"/><circle cx="${cx + w * .58}" cy="${cy - h * .92}" r="5" fill="${line}"/>`;
  if (a.hornStyle === 'antlers') return `<path d="M ${cx - w * .25} ${cy - h * .42} q -18 -34 -26 -58 m 10 22 l -20 -18 m 28 2 l 12 -24 M ${cx + w * .25} ${cy - h * .42} q 18 -34 26 -58 m -10 22 l 20 -18 m -28 2 l -12 -24" fill="none" stroke="${line}" stroke-width="5" stroke-linecap="round"/>`;
  const len = a.hornStyle === 'long' ? h * .5 : h * .28;
  return `<path d="M ${cx - w * .25} ${cy - h * .38} l -${w * .12} -${len} l ${w * .25} ${len * .75} Z" fill="${line}"/><path d="M ${cx + w * .25} ${cy - h * .38} l ${w * .12} -${len} l -${w * .25} ${len * .75} Z" fill="${line}"/>`;
}

function muzzleMarkup(a: CharacterAppearance, cx: number, cy: number, scale: number, body: string, line: string) {
  const style = a.muzzleStyle || 'none';
  if (style === 'none') return '';
  if (style.startsWith('beak')) {
    const length = style === 'beak-long' ? 46 : style === 'beak-hooked' ? 34 : 24;
    const hook = style === 'beak-hooked' ? 12 : 0;
    return `<path d="M ${cx - 4} ${cy + 7} L ${cx + length} ${cy + 15} L ${cx + 6} ${cy + 27 + hook} Z" fill="${a.outfitSecondary}" stroke="${line}"/>`;
  }
  const w = style === 'long' ? 48 : style === 'round' ? 40 : 32;
  const h = style === 'long' ? 30 : 26;
  return `<ellipse cx="${cx}" cy="${cy + 24 * scale}" rx="${w * scale}" ry="${h * scale}" fill="${body}" stroke="${line}"/><ellipse cx="${cx}" cy="${cy + 14 * scale}" rx="${8 * scale}" ry="${5 * scale}" fill="${line}"/>`;
}

function faceMarkup(a: CharacterAppearance, cx: number, cy: number, scale: number, expression: CharacterExpression, body: string, line: string) {
  const eyeY = cy - 5 * scale;
  const spread = 17 * scale;
  const eyeSize = a.eyeStyle === 'large' ? 8 : a.eyeStyle === 'round' ? 6 : a.eyeStyle === 'dot' ? 2.5 : 5;
  let eyes = '';
  if (a.eyeStyle === 'narrow') eyes = `<path d="M ${cx - spread - 7} ${eyeY} q 7 -4 14 0 M ${cx + spread - 7} ${eyeY} q 7 -4 14 0" fill="none"/>`;
  else if (a.eyeStyle === 'almond') eyes = `<path d="M ${cx - spread - 7} ${eyeY} q 7 -6 14 0 q -7 6 -14 0 Z M ${cx + spread - 7} ${eyeY} q 7 -6 14 0 q -7 6 -14 0 Z" fill="#fff"/><circle cx="${cx - spread}" cy="${eyeY}" r="2.5" fill="${a.eyeColor}"/><circle cx="${cx + spread}" cy="${eyeY}" r="2.5" fill="${a.eyeColor}"/>`;
  else eyes = `<circle cx="${cx - spread}" cy="${eyeY}" r="${eyeSize}" fill="${a.eyeStyle === 'dot' ? a.eyeColor : '#fff'}"/>${a.eyeStyle === 'dot' ? '' : `<circle cx="${cx - spread}" cy="${eyeY}" r="2.5" fill="${a.eyeColor}"/>`}<circle cx="${cx + spread}" cy="${eyeY}" r="${eyeSize}" fill="${a.eyeStyle === 'dot' ? a.eyeColor : '#fff'}"/>${a.eyeStyle === 'dot' ? '' : `<circle cx="${cx + spread}" cy="${eyeY}" r="2.5" fill="${a.eyeColor}"/>`}`;

  let brows = '';
  if (a.browStyle !== 'none') {
    const y = eyeY - 13 * scale;
    const width = a.browStyle === 'bold' ? 5 : 3;
    const arch = a.browStyle === 'arched' ? -6 : a.browStyle === 'straight' ? 0 : -2;
    brows = `<path d="M ${cx - spread - 8} ${y} q 8 ${arch} 16 0 M ${cx + spread - 8} ${y} q 8 ${arch} 16 0" fill="none" stroke-width="${width}"/>`;
  }

  let nose = '';
  if (a.noseStyle === 'small') nose = `<path d="M ${cx} ${cy + 4} q 3 8 0 12" fill="none"/>`;
  else if (a.noseStyle === 'straight') nose = `<path d="M ${cx} ${cy + 1} v 16" fill="none"/>`;
  else if (a.noseStyle === 'wide') nose = `<path d="M ${cx - 8} ${cy + 14} q 8 6 16 0" fill="none"/>`;

  const mouthY = cy + 30 * scale;
  let mouth = `<path d="M ${cx - 10} ${mouthY} h 20" fill="none"/>`;
  if (expression === 'happy' || a.mouthStyle === 'smile') mouth = `<path d="M ${cx - 12} ${mouthY - 2} q 12 12 24 0" fill="none"/>`;
  if (expression === 'sad') mouth = `<path d="M ${cx - 12} ${mouthY + 5} q 12 -10 24 0" fill="none"/>`;
  if (expression === 'surprised') mouth = `<ellipse cx="${cx}" cy="${mouthY}" rx="6" ry="9" fill="none"/>`;
  if (expression === 'angry' || expression === 'determined') brows += `<path d="M ${cx - spread - 8} ${eyeY - 14} l 16 5 M ${cx + spread - 8} ${eyeY - 9} l 16 -5" fill="none" stroke-width="4"/>`;

  const muzzle = muzzleMarkup(a, cx, cy, scale, body, line);
  const whiskers = a.whiskers ? `<path d="M ${cx - 14} ${cy + 25} l -42 -8 M ${cx - 14} ${cy + 31} l -44 5 M ${cx + 14} ${cy + 25} l 42 -8 M ${cx + 14} ${cy + 31} l 44 5" fill="none" stroke-width="2"/>` : '';
  return `${eyes}${brows}${nose}${muzzle}${mouth}${whiskers}`;
}

function tailMarkup(a: CharacterAppearance, x: number, y: number, line: string, fill: string) {
  const style = a.tailStyle || 'none';
  if (style === 'none') return '';
  if (style === 'short') return `<path d="M ${x} ${y} q 24 -18 30 2" fill="none" stroke="${line}" stroke-width="12" stroke-linecap="round"/>`;
  if (style === 'fluffy') return `<path d="M ${x} ${y} C ${x + 28} ${y - 18}, ${x + 68} ${y - 65}, ${x + 88} ${y - 24} C ${x + 105} ${y + 10}, ${x + 57} ${y + 24}, ${x + 24} ${y + 12} Z" fill="${fill}" stroke="${line}"/>`;
  if (style === 'curled') return `<path d="M ${x} ${y} C ${x + 60} ${y - 10}, ${x + 80} ${y - 80}, ${x + 30} ${y - 88} C ${x - 2} ${y - 92}, ${x + 4} ${y - 56}, ${x + 28} ${y - 60}" fill="none" stroke="${line}" stroke-width="13" stroke-linecap="round"/>`;
  if (style === 'fish') return `<path d="M ${x} ${y} L ${x + 70} ${y - 45} L ${x + 58} ${y} L ${x + 70} ${y + 45} Z" fill="${fill}" stroke="${line}"/>`;
  const width = style === 'reptile' ? 18 : 12;
  return `<path d="M ${x} ${y} q 52 5 82 ${style === 'reptile' ? 42 : 24}" fill="none" stroke="${line}" stroke-width="${width}" stroke-linecap="round"/>`;
}

function wingsMarkup(a: CharacterAppearance, cx: number, cy: number, line: string, fill: string) {
  const style = a.wingStyle || 'none';
  if (style === 'none') return '';
  if (style === 'bat') return `<path d="M ${cx - 28} ${cy} C ${cx - 90} ${cy - 60}, ${cx - 125} ${cy - 8}, ${cx - 112} ${cy + 48} L ${cx - 72} ${cy + 20} L ${cx - 44} ${cy + 54} Z" fill="${fill}" stroke="${line}"/><path d="M ${cx + 28} ${cy} C ${cx + 90} ${cy - 60}, ${cx + 125} ${cy - 8}, ${cx + 112} ${cy + 48} L ${cx + 72} ${cy + 20} L ${cx + 44} ${cy + 54} Z" fill="${fill}" stroke="${line}"/>`;
  if (style === 'fin') return `<path d="M ${cx - 36} ${cy} L ${cx - 92} ${cy - 25} L ${cx - 80} ${cy + 28} Z M ${cx + 36} ${cy} L ${cx + 92} ${cy - 25} L ${cx + 80} ${cy + 28} Z" fill="${fill}" stroke="${line}"/>`;
  return `<path d="M ${cx - 24} ${cy} C ${cx - 86} ${cy - 66}, ${cx - 128} ${cy - 12}, ${cx - 102} ${cy + 56} C ${cx - 72} ${cy + 30}, ${cx - 52} ${cy + 24}, ${cx - 30} ${cy + 48} Z" fill="${fill}" stroke="${line}"/><path d="M ${cx + 24} ${cy} C ${cx + 86} ${cy - 66}, ${cx + 128} ${cy - 12}, ${cx + 102} ${cy + 56} C ${cx + 72} ${cy + 30}, ${cx + 52} ${cy + 24}, ${cx + 30} ${cy + 48} Z" fill="${fill}" stroke="${line}"/>`;
}

function footMarkup(style: CharacterFootStyle | undefined, x: number, y: number, line: string, fill: string) {
  if (style === 'hooves') return `<path d="M ${x - 9} ${y} q 9 8 18 0 v 10 q -9 7 -18 0 Z" fill="${fill}" stroke="${line}"/>`;
  if (style === 'claws' || style === 'talons') return `<path d="M ${x - 12} ${y} h 24 M ${x - 8} ${y} l -6 7 M ${x} ${y} l -2 8 M ${x + 8} ${y} l 6 7" fill="none" stroke="${line}" stroke-linecap="round"/>`;
  if (style === 'fins') return `<path d="M ${x - 18} ${y} L ${x + 20} ${y - 8} L ${x + 8} ${y + 12} Z" fill="${fill}" stroke="${line}"/>`;
  if (style === 'paws') return `<ellipse cx="${x}" cy="${y + 3}" rx="14" ry="9" fill="${fill}" stroke="${line}"/>`;
  return `<path d="M ${x - 12} ${y} q 12 8 26 0" fill="none" stroke="${line}" stroke-width="5" stroke-linecap="round"/>`;
}

function poseOffsets(pose: CharacterPoseKind) {
  if (pose === 'walk') return { armL: 22, armR: -22, legL: -18, legR: 18, tilt: 2, lift: 0 };
  if (pose === 'run') return { armL: 42, armR: -42, legL: -32, legR: 32, tilt: 8, lift: -6 };
  if (pose === 'jump') return { armL: -55, armR: 55, legL: -20, legR: 20, tilt: 0, lift: -30 };
  if (pose === 'wave') return { armL: -65, armR: 5, legL: 0, legR: 0, tilt: 0, lift: 0 };
  if (pose === 'action') return { armL: -48, armR: 34, legL: -18, legR: 22, tilt: -6, lift: 0 };
  if (pose === 'sit') return { armL: 4, armR: -4, legL: 62, legR: -62, tilt: 0, lift: 22 };
  return { armL: -5, armR: 5, legL: 0, legR: 0, tilt: 0, lift: 0 };
}

function surfacePattern(a: CharacterAppearance, line: string) {
  const surface = a.surfaceStyle || 'skin';
  if (surface === 'scales') return `<pattern id="surface" width="14" height="12" patternUnits="userSpaceOnUse"><path d="M 0 6 Q 7 0 14 6 Q 7 12 0 6" fill="none" stroke="${line}" stroke-opacity=".16" stroke-width="1"/></pattern>`;
  if (surface === 'feathers') return `<pattern id="surface" width="14" height="16" patternUnits="userSpaceOnUse"><path d="M 7 0 Q 13 8 7 16 Q 1 8 7 0" fill="none" stroke="${line}" stroke-opacity=".13" stroke-width="1"/></pattern>`;
  if (surface === 'chitin') return `<pattern id="surface" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M 9 0 L 18 5 L 18 13 L 9 18 L 0 13 L 0 5 Z" fill="none" stroke="${line}" stroke-opacity=".1" stroke-width="1"/></pattern>`;
  if (surface === 'fur-short' || surface === 'fur-long') return `<pattern id="surface" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M 2 10 l 3 -5 M 7 11 l 3 -6" stroke="${line}" stroke-opacity=".11" stroke-width="1"/></pattern>`;
  return '';
}

function buildBiped(document: CharacterSpriteDocument, a: CharacterAppearance, view: CharacterView, expression: CharacterExpression, pose: CharacterPoseKind) {
  const line = normalizeHex(a.lineColor, '#111111');
  const body = normalizeHex(a.surfaceColor || a.skinColor, '#F1C7A5');
  const outfit = normalizeHex(a.outfitPrimary, '#4FD9D3');
  const second = normalizeHex(a.outfitSecondary, '#FFFFFF');
  const p = poseOffsets(pose);
  const cx = 180;
  const headRatio = clamp(a.headToBodyRatio || 4.8, 2.8, 7);
  const headH = clamp(360 / headRatio, 58, 124);
  const headW = headH * (a.faceShape === 'wide' ? 1.1 : a.faceShape === 'long' ? .82 : .94);
  const headY = 94 + p.lift;
  const torsoY = headY + headH * .52 + 18;
  const torsoH = a.bodyShape === 'chibi' ? 92 : a.bodyShape === 'stocky' ? 118 : 110;
  const bodyW = 78 * (a.bodyWidth || 1) * (a.bodyShape === 'stocky' ? 1.18 : a.bodyShape === 'slim' ? .84 : 1);
  const shoulder = bodyW * .5 * (a.shoulderWidth || 1);
  const limb = 86 * (a.limbLength || 1);
  const viewScale = view === 'side' ? .72 : view === 'three-quarter' ? .9 : 1;
  const faceVisible = view !== 'back';
  const headCx = cx + (view === 'side' ? 14 : view === 'three-quarter' ? 8 : 0);

  const leftArmEnd = { x: cx - shoulder + Math.sin((p.armL * Math.PI) / 180) * limb, y: torsoY + 22 + Math.cos((p.armL * Math.PI) / 180) * limb };
  const rightArmEnd = { x: cx + shoulder + Math.sin((p.armR * Math.PI) / 180) * limb, y: torsoY + 22 + Math.cos((p.armR * Math.PI) / 180) * limb };
  const pelvisY = torsoY + torsoH;
  const legLength = 108 * (a.legStyle === 'long' ? 1.16 : a.legStyle === 'short' ? .84 : 1) * (a.limbLength || 1);
  const legSpread = bodyW * .2;
  const leftFoot = { x: cx - legSpread + Math.sin((p.legL * Math.PI) / 180) * legLength, y: pelvisY + Math.cos((p.legL * Math.PI) / 180) * legLength };
  const rightFoot = { x: cx + legSpread + Math.sin((p.legR * Math.PI) / 180) * legLength, y: pelvisY + Math.cos((p.legR * Math.PI) / 180) * legLength };
  const ears = earsMarkup(a, headCx, headY, headW, headH, body);
  const horns = hornsMarkup(a, headCx, headY, headW, headH, line);
  const tail = tailMarkup(a, cx + bodyW * .42, torsoY + torsoH * .72, line, body);
  const wings = wingsMarkup(a, cx, torsoY + torsoH * .35, line, body);
  const head = headShapeMarkup(a, headCx, headY, headW, headH, body);
  const face = faceVisible ? faceMarkup(a, headCx, headY, headH / 100, expression, body, line) : '';
  const clothing = a.outfitStyle === 'none' ? '' : `<path d="M ${cx - bodyW * .46} ${torsoY + 8} Q ${cx} ${torsoY - 6} ${cx + bodyW * .46} ${torsoY + 8} L ${cx + bodyW * .4} ${pelvisY} L ${cx - bodyW * .4} ${pelvisY} Z" fill="${outfit}" stroke="${line}"/><path d="M ${cx - bodyW * .18} ${torsoY + 12} V ${pelvisY - 8} M ${cx + bodyW * .18} ${torsoY + 12} V ${pelvisY - 8}" stroke="${second}" stroke-width="4" opacity=".45"/>`;
  const torso = a.torsoShape === 'round'
    ? `<ellipse cx="${cx}" cy="${torsoY + torsoH / 2}" rx="${bodyW * .48}" ry="${torsoH * .52}" fill="${body}"/>`
    : a.torsoShape === 'triangle'
      ? `<path d="M ${cx - bodyW * .28} ${torsoY} L ${cx + bodyW * .28} ${torsoY} L ${cx + bodyW * .48} ${pelvisY} L ${cx - bodyW * .48} ${pelvisY} Z" fill="${body}"/>`
      : a.torsoShape === 'trapezoid'
        ? `<path d="M ${cx - bodyW * .44} ${torsoY} L ${cx + bodyW * .44} ${torsoY} L ${cx + bodyW * .34} ${pelvisY} L ${cx - bodyW * .34} ${pelvisY} Z" fill="${body}"/>`
        : `<rect x="${cx - bodyW * .43}" y="${torsoY}" width="${bodyW * .86}" height="${torsoH}" rx="18" fill="${body}"/>`;

  return `${surfacePattern(a, line)}<g stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="scale(${viewScale} 1) translate(${viewScale < 1 ? (180 / viewScale - 180) : 0} 0)">${wings}${tail}<path d="M ${cx - shoulder} ${torsoY + 22} L ${leftArmEnd.x} ${leftArmEnd.y} M ${cx + shoulder} ${torsoY + 22} L ${rightArmEnd.x} ${rightArmEnd.y}" fill="none" stroke-width="${a.armStyle === 'strong' ? 12 : a.armStyle === 'thin' ? 6 : 9}"/><circle cx="${leftArmEnd.x}" cy="${leftArmEnd.y}" r="${a.handStyle === 'defined' ? 8 : 6}" fill="${body}"/><circle cx="${rightArmEnd.x}" cy="${rightArmEnd.y}" r="${a.handStyle === 'defined' ? 8 : 6}" fill="${body}"/>${torso}<rect x="${cx - bodyW * .43}" y="${torsoY}" width="${bodyW * .86}" height="${torsoH}" rx="18" fill="url(#surface)" stroke="none"/>${clothing}<path d="M ${cx - legSpread} ${pelvisY} L ${leftFoot.x} ${leftFoot.y} M ${cx + legSpread} ${pelvisY} L ${rightFoot.x} ${rightFoot.y}" fill="none" stroke-width="10"/>${footMarkup(a.footStyle, leftFoot.x, leftFoot.y, line, body)}${footMarkup(a.footStyle, rightFoot.x, rightFoot.y, line, body)}${ears}${horns}${head}<path d="M ${headCx - headW * .42} ${headY - headH * .3} Q ${headCx} ${headY - headH * .7} ${headCx + headW * .42} ${headY - headH * .3}" fill="${a.hairStyle === 'none' ? 'none' : a.hairColor}" stroke="${a.hairStyle === 'none' ? 'none' : line}"/>${face}</g>`;
}

function buildQuadruped(document: CharacterSpriteDocument, a: CharacterAppearance, view: CharacterView, expression: CharacterExpression, pose: CharacterPoseKind) {
  const line = normalizeHex(a.lineColor, '#111111');
  const body = normalizeHex(a.surfaceColor || a.skinColor, '#C78D5B');
  const p = poseOffsets(pose);
  const side = view === 'side' || view === 'three-quarter';
  const bodyCx = side ? 195 : 180;
  const bodyCy = 300 + p.lift;
  const bodyW = 150 * (a.bodyWidth || 1) * (a.bodyShape === 'stocky' ? 1.18 : a.bodyShape === 'slim' ? .88 : 1);
  const bodyH = a.bodyShape === 'chibi' ? 80 : 92;
  const headW = a.headShape === 'wide' ? 100 : 82;
  const headH = a.faceShape === 'long' ? 98 : 82;
  const headCx = side ? bodyCx - bodyW * .55 : 180;
  const headCy = side ? bodyCy - 56 : bodyCy - bodyH * .72;
  const legY = bodyCy + bodyH * .3;
  const legLen = 92 * (a.legStyle === 'long' ? 1.15 : a.legStyle === 'short' ? .82 : 1) * (a.limbLength || 1);
  const legXs = side ? [bodyCx - bodyW * .32, bodyCx - bodyW * .12, bodyCx + bodyW * .2, bodyCx + bodyW * .36] : [140, 166, 194, 220];
  const gait = pose === 'run' ? [-25, 22, 28, -22] : pose === 'walk' ? [-14, 10, 12, -10] : [0, 0, 0, 0];
  const legs = legXs.map((x, index) => {
    const ex = x + Math.sin((gait[index] * Math.PI) / 180) * legLen;
    const ey = legY + Math.cos((gait[index] * Math.PI) / 180) * legLen;
    return `<path d="M ${x} ${legY} L ${ex} ${ey}" fill="none" stroke-width="10"/>${footMarkup(a.footStyle, ex, ey, line, body)}`;
  }).join('');
  const tail = tailMarkup(a, bodyCx + bodyW * .48, bodyCy - 6, line, body);
  const wings = wingsMarkup(a, bodyCx, bodyCy - 12, line, body);
  const ears = earsMarkup(a, headCx, headCy, headW, headH, body);
  const horns = hornsMarkup(a, headCx, headCy, headW, headH, line);
  const face = view !== 'back' ? faceMarkup(a, headCx, headCy, .9, expression, body, line) : '';
  return `${surfacePattern(a, line)}<g stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${tail}${wings}<ellipse cx="${bodyCx}" cy="${bodyCy}" rx="${bodyW / 2}" ry="${bodyH / 2}" fill="${body}"/><ellipse cx="${bodyCx}" cy="${bodyCy}" rx="${bodyW / 2}" ry="${bodyH / 2}" fill="url(#surface)" stroke="none"/>${legs}${ears}${horns}${headShapeMarkup(a, headCx, headCy, headW, headH, body)}${face}</g>`;
}

function buildAvian(document: CharacterSpriteDocument, a: CharacterAppearance, view: CharacterView, expression: CharacterExpression, pose: CharacterPoseKind) {
  const line = normalizeHex(a.lineColor, '#111111');
  const body = normalizeHex(a.surfaceColor || a.skinColor, '#73B7D8');
  const cx = 180, cy = 270;
  const jump = pose === 'jump' ? -32 : 0;
  const headY = 150 + jump;
  const wingOpen = pose === 'action' || pose === 'jump' || pose === 'run';
  const wings = wingOpen ? wingsMarkup({ ...a, wingStyle: a.wingStyle === 'none' ? 'feather' : a.wingStyle }, cx, cy - 10 + jump, line, body) : `<path d="M 150 ${cy - 20 + jump} q -44 42 0 92 q 22 -36 8 -80 Z M 210 ${cy - 20 + jump} q 44 42 0 92 q -22 -36 -8 -80 Z" fill="${body}" stroke="${line}"/>`;
  const beakAppearance = { ...a, muzzleStyle: (a.muzzleStyle && a.muzzleStyle !== 'none' ? a.muzzleStyle : 'beak-small') as CharacterMuzzleStyle };
  return `${surfacePattern({ ...a, surfaceStyle: a.surfaceStyle || 'feathers' }, line)}<g stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="${cx}" cy="${cy + jump}" rx="62" ry="96" fill="${body}"/><ellipse cx="${cx}" cy="${cy + jump}" rx="62" ry="96" fill="url(#surface)" stroke="none"/>${wings}${tailMarkup({ ...a, tailStyle: a.tailStyle === 'none' ? 'long' : a.tailStyle }, cx, cy + 62 + jump, line, body)}${earsMarkup(a, cx, headY, 76, 76, body)}${hornsMarkup(a, cx, headY, 76, 76, line)}${headShapeMarkup(a, cx, headY, 76, 76, body)}${view !== 'back' ? faceMarkup(beakAppearance, cx, headY, .82, expression, body, line) : ''}<path d="M 164 ${cy + 80 + jump} v 65 M 196 ${cy + 80 + jump} v 65" fill="none" stroke-width="7"/>${footMarkup(a.footStyle || 'talons', 164, cy + 148 + jump, line, body)}${footMarkup(a.footStyle || 'talons', 196, cy + 148 + jump, line, body)}</g>`;
}

function buildAquatic(document: CharacterSpriteDocument, a: CharacterAppearance, view: CharacterView, expression: CharacterExpression, pose: CharacterPoseKind) {
  const line = normalizeHex(a.lineColor, '#111111');
  const body = normalizeHex(a.surfaceColor || a.skinColor, '#69BFD0');
  const cx = 180, cy = 270;
  const tail = tailMarkup({ ...a, tailStyle: 'fish' }, cx + 92, cy, line, body);
  const headCx = 132;
  return `${surfacePattern({ ...a, surfaceStyle: a.surfaceStyle || 'scales' }, line)}<g stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${tail}<ellipse cx="${cx}" cy="${cy}" rx="105" ry="62" fill="${body}"/><ellipse cx="${cx}" cy="${cy}" rx="105" ry="62" fill="url(#surface)" stroke="none"/><path d="M 170 220 L 205 174 L 218 224 Z M 170 320 L 205 366 L 218 316 Z" fill="${body}"/>${view !== 'back' ? faceMarkup({ ...a, muzzleStyle: 'none', browStyle: a.browStyle || 'none' }, headCx, cy - 4, .8, expression, body, line) : ''}<path d="M 218 258 L 274 228 L 254 274 Z" fill="${body}" stroke="${line}"/></g>`;
}

function buildSerpentine(document: CharacterSpriteDocument, a: CharacterAppearance, view: CharacterView, expression: CharacterExpression, pose: CharacterPoseKind) {
  const line = normalizeHex(a.lineColor, '#111111');
  const body = normalizeHex(a.surfaceColor || a.skinColor, '#6DBA74');
  const headCx = 132, headCy = 166;
  return `${surfacePattern({ ...a, surfaceStyle: a.surfaceStyle || 'scales' }, line)}<g stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M 154 205 C 110 250, 120 314, 196 322 C 280 332, 288 395, 214 422 C 160 440, 124 420, 108 400" fill="none" stroke="${body}" stroke-width="42"/><path d="M 154 205 C 110 250, 120 314, 196 322 C 280 332, 288 395, 214 422 C 160 440, 124 420, 108 400" fill="none" stroke="url(#surface)" stroke-width="42"/>${earsMarkup(a, headCx, headCy, 86, 78, body)}${hornsMarkup(a, headCx, headCy, 86, 78, line)}${headShapeMarkup(a, headCx, headCy, 86, 78, body)}${view !== 'back' ? faceMarkup(a, headCx, headCy, .82, expression, body, line) : ''}</g>`;
}

function buildArthropod(document: CharacterSpriteDocument, a: CharacterAppearance, view: CharacterView, expression: CharacterExpression, pose: CharacterPoseKind) {
  const line = normalizeHex(a.lineColor, '#111111');
  const body = normalizeHex(a.surfaceColor || a.skinColor, '#6A645C');
  const legs = a.bodyPlan === 'eight-limbed' ? 8 : 6;
  const cx = 180, cy = 280;
  const legMarkup = Array.from({ length: legs }).map((_, index) => {
    const side = index % 2 === 0 ? -1 : 1;
    const row = Math.floor(index / 2);
    const y = cy - 42 + row * (84 / Math.max(1, Math.ceil(legs / 2) - 1));
    const outerX = cx + side * (96 + row * 7);
    return `<path d="M ${cx + side * 36} ${y} Q ${cx + side * 70} ${y - 18} ${outerX} ${y + (row - 1.5) * 22}" fill="none" stroke-width="8"/>`;
  }).join('');
  return `${surfacePattern({ ...a, surfaceStyle: 'chitin' }, line)}<g stroke="${line}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${legMarkup}<ellipse cx="${cx}" cy="${cy + 50}" rx="70" ry="82" fill="${body}"/><ellipse cx="${cx}" cy="${cy + 50}" rx="70" ry="82" fill="url(#surface)" stroke="none"/><ellipse cx="${cx}" cy="${cy - 40}" rx="52" ry="50" fill="${body}"/>${hornsMarkup({ ...a, hornStyle: a.hornStyle === 'none' ? 'antennae' : a.hornStyle }, cx, cy - 40, 80, 70, line)}${view !== 'back' ? faceMarkup({ ...a, browStyle: 'none', noseStyle: 'none', muzzleStyle: 'none' }, cx, cy - 40, .76, expression, body, line) : ''}</g>`;
}

export function buildCharacterSvg(document: CharacterSpriteDocument, view: CharacterView = 'front', expression: CharacterExpression = 'neutral', pose: CharacterPoseKind = 'neutral') {
  const a: CharacterAppearance = { ...DEFAULT_APPEARANCE, ...(document.appearance || {}) };
  const bodyPlan = a.bodyPlan || (a.species === 'quadruped' || a.species === 'reptile' ? 'quadruped' : a.species === 'bird' ? 'avian' : a.species === 'fish' ? 'aquatic' : a.species === 'arthropod' ? 'six-limbed' : 'biped');
  let content = '';
  if (bodyPlan === 'quadruped') content = buildQuadruped(document, a, view, expression, pose);
  else if (bodyPlan === 'avian') content = buildAvian(document, a, view, expression, pose);
  else if (bodyPlan === 'aquatic') content = buildAquatic(document, a, view, expression, pose);
  else if (bodyPlan === 'serpentine') content = buildSerpentine(document, a, view, expression, pose);
  else if (bodyPlan === 'six-limbed' || bodyPlan === 'eight-limbed') content = buildArthropod(document, a, view, expression, pose);
  else content = buildBiped(document, a, view, expression, pose);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="0 0 360 520"><rect width="360" height="520" fill="transparent"/>${content}</svg>`;
}

export function SpriteCharacterPreview({ document, className = '' }: { document: CharacterSpriteDocument; className?: string }) {
  const svg = document.generatedSvg || buildCharacterSvg(document, document.activeView || 'front', document.activeExpression || 'neutral', document.activePose || 'neutral');
  return <div className={`w-full h-full flex items-center justify-center overflow-hidden bg-neutral-50 ${className}`}><img src={svgDataUrl(svg)} alt={document.characterName} className="max-w-full max-h-full object-contain" style={{ imageRendering: document.pixelated ? 'pixelated' : 'auto' }} /></div>;
}

function InfoTip({ children }: { children: string }) {
  const [open, setOpen] = useState(false);
  return <span className="relative inline-flex ml-1 align-middle"><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value); }} onBlur={() => setTimeout(() => setOpen(false), 120)} className="h-6 w-6 rounded-full inline-flex items-center justify-center hover:bg-black/5" aria-label="Explicação"><Info size={13} /></button>{open ? <span className="absolute z-[200] left-1/2 bottom-full mb-2 w-64 max-w-[75vw] -translate-x-1/2 rounded-xl bg-black text-white p-3 text-[10px] leading-relaxed shadow-xl">{children}</span> : null}</span>;
}

function SelectField<T extends string>({ label, value, options, onChange, tip }: { label: string; value: T; options: Option<T>[]; onChange: (value: T) => void; tip?: string }) {
  return <div className="min-w-0 text-[10px] font-mono text-neutral-500 uppercase"><span className="flex items-center gap-1">{label}{tip ? <InfoTip>{tip}</InfoTip> : null}</span><div className="mt-1 flex gap-1.5 overflow-x-auto pb-1 snap-x">{options.map((item) => <button key={item.id} type="button" aria-pressed={item.id === value} onClick={() => onChange(item.id)} className={`shrink-0 snap-start min-h-10 rounded-xl border px-3 py-2 text-[11px] font-semibold normal-case font-sans transition-colors ${item.id === value ? 'bg-black text-white border-black' : 'bg-white text-black border-black/20 hover:border-black'}`}>{item.label}</button>)}</div></div>;
}

function RangeField({ label, value, min, max, step, onChange, tip }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; tip?: string }) {
  return <label className="block rounded-xl border p-3"><div className="flex items-center justify-between text-[10px] font-mono uppercase"><span>{label}{tip ? <InfoTip>{tip}</InfoTip> : null}</span><b>{value.toFixed(step < 1 ? 1 : 0)}</b></div><input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full" /></label>;
}

function HexField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const safe = normalizeHex(value);
  return <label className="block text-[10px] font-mono text-neutral-500 uppercase">{label}<div className="mt-1 flex gap-2"><input type="color" value={safe} onChange={(event) => onChange(event.target.value.toUpperCase())} className="h-11 w-12 rounded-xl border p-1 bg-white"/><input value={value} onChange={(event) => onChange(event.target.value)} onBlur={(event) => onChange(normalizeHex(event.target.value, safe))} className="h-11 flex-1 rounded-xl border px-3 font-mono text-xs uppercase" /></div></label>;
}

function animationMotionProps(motionPreset: SpriteMotionPreset, playing: boolean) {
  if (!playing || motionPreset === 'none') return { animate: { x: 0, y: 0, scaleX: 1, scaleY: 1, scale: 1 }, transition: { duration: .2 } };
  if (motionPreset === 'bob') return { animate: { y: [0, -9, 0] }, transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' } };
  if (motionPreset === 'bounce') return { animate: { y: [0, -18, 0] }, transition: { duration: .75, repeat: Infinity, ease: 'easeInOut' } };
  if (motionPreset === 'shake') return { animate: { x: [0, -5, 5, -3, 3, 0] }, transition: { duration: .36, repeat: Infinity } };
  if (motionPreset === 'pulse') return { animate: { scale: [1, 1.04, 1] }, transition: { duration: .9, repeat: Infinity } };
  return { animate: { scaleX: [1, 1.07, 1], scaleY: [1, .93, 1] }, transition: { duration: .72, repeat: Infinity } };
}

export default function SpriteStudio({ document, title = 'Novo personagem & criaturas', canEdit = true, availableAssets = [], onSave, onClose }: Props) {
  const [draft, setDraft] = useState<CharacterSpriteDocument>(() => mergeDocument(document));
  const [tab, setTab] = useState<Tab>('builder');
  const [busy, setBusy] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(true);
  const [selectedAnimationId, setSelectedAnimationId] = useState(() => document.activeAnimationId || document.animations?.[0]?.id || '');
  const [frameIndex, setFrameIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const appearance = { ...DEFAULT_APPEARANCE, ...(draft.appearance || {}) };
  const profile = { ...DEFAULT_PROFILE, ...(draft.profile || {}) };
  const activeAnimation = draft.animations.find((animation) => animation.id === selectedAnimationId) || draft.animations[0] || blankAnimation('idle');
  const manualSvg = useMemo(() => buildCharacterSvg(draft, draft.activeView || 'front', draft.activeExpression || 'neutral', draft.activePose || 'neutral'), [draft]);
  const previewUrl = activeAnimation.frames?.[frameIndex]?.url || svgDataUrl(draft.generatedSvg || manualSvg);

  useEffect(() => {
    if (!playing || !activeAnimation.frames?.length || activeAnimation.frames.length < 2) return;
    const duration = activeAnimation.frames[frameIndex]?.durationMs || Math.max(70, Math.round(1000 / Math.max(1, activeAnimation.fps || 8)));
    const timer = window.setTimeout(() => setFrameIndex((value) => (value + 1) % activeAnimation.frames.length), duration);
    return () => window.clearTimeout(timer);
  }, [playing, activeAnimation.id, activeAnimation.frames, activeAnimation.fps, frameIndex]);

  const patchAppearance = (partial: Partial<CharacterAppearance>, keepGenerated = false) => setDraft((current) => ({ ...current, appearance: { ...DEFAULT_APPEARANCE, ...(current.appearance || {}), ...partial }, generatedSvg: keepGenerated ? current.generatedSvg : undefined, updatedAt: new Date().toISOString() }));
  const patchProfile = (partial: Partial<CharacterProfile>) => setDraft((current) => ({ ...current, profile: { ...DEFAULT_PROFILE, ...(current.profile || {}), ...partial }, updatedAt: new Date().toISOString() }));
  const patchAnimation = (partial: Partial<SpriteAnimation>) => setDraft((current) => ({ ...current, animations: current.animations.map((animation) => animation.id === activeAnimation.id ? { ...animation, ...partial } : animation), activeAnimationId: activeAnimation.id, updatedAt: new Date().toISOString() }));

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    patchAppearance({ ...preset.patch, speciesPreset: preset.id });
  };

  const applyHybridMix = (primaryId = appearance.hybridPrimaryPreset || 'human', secondaryId = appearance.hybridSecondaryPreset || 'cat', blend = appearance.hybridBlend ?? 50) => {
    const next = hybridAppearance(appearance, primaryId, secondaryId, blend);
    patchAppearance(next);
  };

  const chooseSpecies = (value: CharacterSpecies) => {
    if (value === 'hybrid') {
      applyHybridMix(appearance.hybridPrimaryPreset || 'human', appearance.hybridSecondaryPreset || 'cat', appearance.hybridBlend ?? 50);
      return;
    }
    patchAppearance({ species: value, speciesPreset: value });
  };

  const addAnimation = (kind: SpriteAnimationKind) => {
    const next = blankAnimation(kind);
    setDraft((current) => ({ ...current, animations: [...current.animations, next], activeAnimationId: next.id }));
    setSelectedAnimationId(next.id);
    setFrameIndex(0);
  };

  const generatedFrameSequence = (kind: SpriteAnimationKind): Array<{ view: CharacterView; pose: CharacterPoseKind; expression: CharacterExpression }> => {
    if (kind === 'walk') return [{ view: 'side', pose: 'walk', expression: 'neutral' }, { view: 'side', pose: 'neutral', expression: 'neutral' }, { view: 'side', pose: 'walk', expression: 'neutral' }, { view: 'side', pose: 'neutral', expression: 'neutral' }];
    if (kind === 'run') return [{ view: 'side', pose: 'run', expression: 'determined' }, { view: 'side', pose: 'action', expression: 'determined' }, { view: 'side', pose: 'run', expression: 'determined' }, { view: 'side', pose: 'action', expression: 'determined' }];
    if (kind === 'jump') return [{ view: 'three-quarter', pose: 'neutral', expression: 'neutral' }, { view: 'three-quarter', pose: 'jump', expression: 'surprised' }, { view: 'three-quarter', pose: 'neutral', expression: 'happy' }];
    if (kind === 'attack') return [{ view: 'three-quarter', pose: 'neutral', expression: 'determined' }, { view: 'three-quarter', pose: 'action', expression: 'angry' }, { view: 'three-quarter', pose: 'neutral', expression: 'determined' }];
    if (kind === 'hurt') return [{ view: 'front', pose: 'neutral', expression: 'neutral' }, { view: 'front', pose: 'action', expression: 'sad' }, { view: 'front', pose: 'neutral', expression: 'neutral' }];
    return [{ view: 'front', pose: 'neutral', expression: 'neutral' }, { view: 'three-quarter', pose: 'neutral', expression: 'happy' }];
  };

  const createFrames = () => {
    const sequence = generatedFrameSequence(activeAnimation.kind);
    const frames: SpriteFrame[] = sequence.map((frame, index) => ({ id: id('frame'), name: `${activeAnimation.name} ${index + 1}`, url: svgDataUrl(buildCharacterSvg(draft, frame.view, frame.expression, frame.pose)), durationMs: Math.max(70, Math.round(1000 / Math.max(1, activeAnimation.fps || 8))) }));
    patchAnimation({ frames });
    setFrameIndex(0);
    setPlaying(true);
  };

  const addAssetFrame = (asset: SpriteAssetOption) => patchAnimation({ frames: [...activeAnimation.frames, { id: id('frame'), name: asset.name, url: asset.url, sourceNodeId: asset.id, durationMs: 125 }] });

  const uploadFrames = async (files: FileList) => {
    setUploading(true); setError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const newFrames: SpriteFrame[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) continue;
        const response = await fetch('/api/upload', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name), ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: file });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) throw new Error(data.error || `Falha no upload de ${file.name}`);
        newFrames.push({ id: id('frame'), name: file.name, url: data.url, durationMs: 125 });
      }
      patchAnimation({ frames: [...activeAnimation.frames, ...newFrames] });
    } catch (e: any) { setError(e?.message || 'Falha no upload.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const generateSvgAi = async () => {
    if (!String(draft.prompt || '').trim()) return setError('Descreva o personagem ou criatura que deseja gerar/refinar.');
    setBusy(true); setError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify({ mode: 'character-svg', prompt: draft.prompt, character: { name: draft.characterName, description: draft.description, appearance: draft.appearance, profile: draft.profile, view: draft.activeView, expression: draft.activeExpression, pose: draft.activePose } }) });
      const data = await response.json().catch(() => ({}));
      const result = data.characterSvg || data.character;
      if (!response.ok || !result?.svg) throw new Error(data.error || 'A IA não retornou SVG válido.');
      setDraft((current) => ({ ...current, generatedSvg: result.svg, generatedNotes: Array.isArray(result.notes) ? result.notes : current.generatedNotes, updatedAt: new Date().toISOString() }));
    } catch (e: any) { setError(e?.message || 'Falha na geração do personagem.'); }
    finally { setBusy(false); }
  };

  const generateSheetAi = async () => {
    setSheetBusy(true); setError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify({ mode: 'character-sheet', prompt: 'Complete a ficha respeitando as escolhas do autor.', character: { name: draft.characterName, description: draft.description, appearance: draft.appearance, profile: draft.profile } }) });
      const data = await response.json().catch(() => ({}));
      const result = data.characterSheet;
      if (!response.ok || !result?.profile) throw new Error(data.error || 'A IA não retornou a ficha.');
      setDraft((current) => ({ ...current, description: result.description || current.description, profile: { ...DEFAULT_PROFILE, ...(current.profile || {}), ...result.profile }, generatedNotes: result.notes || current.generatedNotes, updatedAt: new Date().toISOString() }));
    } catch (e: any) { setError(e?.message || 'Falha na geração da ficha.'); }
    finally { setSheetBusy(false); }
  };

  const downloadSvg = () => {
    const svg = draft.generatedSvg || manualSvg;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = globalThis.document.createElement('a');
    anchor.href = url; anchor.download = `${(draft.characterName || 'personagem').replace(/\s+/g, '-').toLowerCase()}.svg`; anchor.click(); URL.revokeObjectURL(url);
  };

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'builder', label: 'CONSTRUIR' }, { id: 'profile', label: 'FICHA' }, { id: 'poses', label: 'POSES' }, { id: 'animate', label: 'ANIMAR' }, { id: 'ai', label: 'IA + SVG' },
  ];

  return <div className="studio-editor fixed inset-0 z-[126] bg-[#F2F1ED] flex flex-col canvas-control atelier-studio" onPointerDown={(event) => event.stopPropagation()}>
    <header className="shrink-0 bg-white border-b px-3 sm:px-5 pt-[max(.35rem,env(safe-area-inset-top))]">
      <div className="min-h-16 flex items-center gap-3"><button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={20}/></button><div className="min-w-0 flex-1"><b className="block truncate text-lg">{title}</b><div className="text-[10px] font-mono tracking-wider text-neutral-500 uppercase">concept art · seres · anatomia modular · ficha · poses · sprites · svg</div></div><button disabled={!canEdit} onClick={() => onSave({ ...draft, activeAnimationId: activeAnimation.id })} className="h-11 px-4 rounded-xl bg-black text-white font-bold flex items-center gap-2 disabled:opacity-40"><Save size={15}/> SALVAR</button></div>

    </header>

    <StudioWorkspace tools={<div>      <div className="flex gap-2 overflow-x-auto pb-2">{tabs.map((item) => <button key={item.id} onClick={() => setTab(item.id)} className={`shrink-0 h-11 px-4 rounded-xl border-2 border-black text-xs font-bold ${tab === item.id ? 'bg-black text-white' : 'bg-white'}`}>{item.label}</button>)}</div><section className="bg-white border-r p-4 sm:p-5 space-y-4 xl:overflow-y-auto">
        {tab === 'builder' && <>
          <div className="rounded-2xl border p-4 space-y-3"><div><b className="text-lg">Identidade visual do ser</b><div className="text-xs text-neutral-500">Comece pelo tipo de ser e pelo plano corporal. Depois refine partes e proporções.</div></div><label className="block text-[10px] font-mono text-neutral-500 uppercase">Nome<input value={draft.characterName} onChange={(event) => setDraft((current) => ({ ...current, characterName: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm text-black"/></label><label className="block text-[10px] font-mono text-neutral-500 uppercase">Descrição<textarea value={draft.description || ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm text-black" placeholder="Quem é, universo, referências, comportamento..."/></label></div>

          <div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-2"><div><b className="text-lg">Tipo de ser</b><div className="text-xs text-neutral-500">Humano, animal, criatura ou híbrido.</div></div><InfoTip>O tipo de ser define quais estruturas anatômicas fazem sentido. O plano corporal pode ser alterado independentemente para criar híbridos.</InfoTip></div><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Tipo" value={appearance.species || 'human'} options={SPECIES} onChange={chooseSpecies}/><SelectField label="Plano corporal" value={appearance.bodyPlan || 'biped'} options={BODY_PLANS} onChange={(value) => patchAppearance({ bodyPlan: value })}/></div>
            {appearance.species === 'hybrid' ? <div className="mt-4 rounded-2xl border-2 border-black p-3 space-y-3">
              <div className="flex items-start justify-between gap-2"><div><b className="text-sm">Misturador de híbridos</b><div className="text-[10px] text-neutral-500">Escolha duas bases. A prévia muda imediatamente enquanto você mistura e depois pode refinar cada parte abaixo.</div></div><InfoTip>Híbridos mais legíveis costumam preservar poucos sinais fortes de cada origem: silhueta, cabeça, superfície, cauda, asas ou locomoção. Não é preciso somar todas as partes.</InfoTip></div>
              <div><div className="text-[9px] font-mono uppercase text-neutral-500 mb-1">BASE A · estrutura</div><div className="flex gap-2 overflow-x-auto pb-1">{HYBRID_BASES.map((preset) => <button key={`a-${preset.id}`} type="button" onClick={() => applyHybridMix(preset.id, appearance.hybridSecondaryPreset || 'cat', appearance.hybridBlend ?? 50)} className={`shrink-0 w-24 rounded-xl border p-2 text-left ${appearance.hybridPrimaryPreset === preset.id ? 'bg-black text-white' : 'bg-white'}`}><div className="text-xl">{preset.icon}</div><div className="text-[10px] font-bold">{preset.label}</div></button>)}</div></div>
              <div><div className="text-[9px] font-mono uppercase text-neutral-500 mb-1">BASE B · traços adicionados</div><div className="flex gap-2 overflow-x-auto pb-1">{HYBRID_BASES.map((preset) => <button key={`b-${preset.id}`} type="button" onClick={() => applyHybridMix(appearance.hybridPrimaryPreset || 'human', preset.id, appearance.hybridBlend ?? 50)} className={`shrink-0 w-24 rounded-xl border p-2 text-left ${appearance.hybridSecondaryPreset === preset.id ? 'bg-black text-white' : 'bg-white'}`}><div className="text-xl">{preset.icon}</div><div className="text-[10px] font-bold">{preset.label}</div></button>)}</div></div>
              <label className="block rounded-xl bg-neutral-50 p-3"><div className="flex justify-between gap-2 text-[9px] font-mono uppercase"><span>{PRESETS.find((p) => p.id === appearance.hybridPrimaryPreset)?.label || 'Base A'}</span><b>{appearance.hybridBlend ?? 50}% mistura</b><span>{PRESETS.find((p) => p.id === appearance.hybridSecondaryPreset)?.label || 'Base B'}</span></div><input type="range" min={0} max={100} step={1} value={appearance.hybridBlend ?? 50} onChange={(event) => applyHybridMix(appearance.hybridPrimaryPreset || 'human', appearance.hybridSecondaryPreset || 'cat', Number(event.target.value))} className="mt-2 w-full"/></label>
              <div className="flex gap-2 overflow-x-auto">{HYBRID_QUICK.map((quick) => <button key={quick.label} type="button" onClick={() => applyHybridMix(quick.a, quick.b, quick.blend)} className="shrink-0 rounded-full border px-3 py-1.5 text-[9px] font-bold">{quick.label}</button>)}</div>
              <div className="grid grid-cols-3 gap-1 text-[9px]"><div className="rounded-lg bg-neutral-100 p-2"><b>Silhueta</b><div>{BODY_PLANS.find((item) => item.id === appearance.bodyPlan)?.label}</div></div><div className="rounded-lg bg-neutral-100 p-2"><b>Superfície</b><div>{SURFACES.find((item) => item.id === appearance.surfaceStyle)?.label}</div></div><div className="rounded-lg bg-neutral-100 p-2"><b>Traço forte</b><div>{appearance.wingStyle !== 'none' ? 'Asas' : appearance.tailStyle !== 'none' ? 'Cauda' : appearance.hornStyle !== 'none' ? 'Chifres' : appearance.muzzleStyle !== 'none' ? 'Focinho/bico' : 'Forma'}</div></div></div>
            </div> : <div className="mt-3 grid grid-cols-3 gap-2">{PRESETS.map((preset) => <button key={preset.id} onClick={() => applyPreset(preset.id)} className={`rounded-xl border p-2 text-left hover:border-black ${appearance.speciesPreset === preset.id ? 'bg-black text-white' : ''}`}><div className="text-xl">{preset.icon}</div><b className="text-[11px]">{preset.label}</b><div className={`text-[9px] leading-tight mt-1 ${appearance.speciesPreset === preset.id ? 'text-white/70' : 'text-neutral-500'}`}>{preset.description}</div></button>)}</div>}</div>

          <div className="rounded-2xl border p-4"><div className="flex items-center justify-between"><b className="text-lg">Cabeça e rosto</b><span className="text-[9px] font-mono text-neutral-400">FORMA ≠ PERSONALIDADE</span></div><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Cabeça" value={appearance.headShape} options={HEADS} onChange={(value) => patchAppearance({ headShape: value })}/><SelectField label="Rosto" value={appearance.faceShape} options={FACES} onChange={(value) => patchAppearance({ faceShape: value })}/><SelectField label="Olhos" value={appearance.eyeStyle} options={EYES} onChange={(value) => patchAppearance({ eyeStyle: value })}/><SelectField label="Sobrancelha" value={appearance.browStyle} options={BROWS} onChange={(value) => patchAppearance({ browStyle: value })} tip="Pode ser nenhuma. Em animais, sobrancelha anatômica muitas vezes não faz sentido; a expressão pode vir de pálpebras, orelhas, postura e focinho."/><SelectField label="Nariz" value={appearance.noseStyle} options={NOSES} onChange={(value) => patchAppearance({ noseStyle: value })}/><SelectField label="Boca" value={appearance.mouthStyle} options={MOUTHS} onChange={(value) => patchAppearance({ mouthStyle: value })}/><SelectField label="Orelha" value={appearance.earStyle} options={EARS} onChange={(value) => patchAppearance({ earStyle: value })}/><SelectField label="Cabelo" value={appearance.hairStyle} options={HAIR} onChange={(value) => patchAppearance({ hairStyle: value })}/><SelectField label="Focinho / bico" value={appearance.muzzleStyle || 'none'} options={MUZZLES} onChange={(value) => patchAppearance({ muzzleStyle: value })}/><label className="block text-[10px] font-mono text-neutral-500 uppercase"><span className="flex items-center gap-1">Bigodes <InfoTip>Bigodes podem ser um traço anatômico ou estilização. Em felinos e roedores ajudam a reconhecer a espécie.</InfoTip></span><button type="button" onClick={() => patchAppearance({ whiskers: !appearance.whiskers })} className={`mt-1 h-11 w-full rounded-xl border text-sm ${appearance.whiskers ? 'bg-black text-white' : 'bg-white'}`}>{appearance.whiskers ? 'SIM' : 'NÃO'}</button></label></div></div>

          <div className="rounded-2xl border p-4"><b className="text-lg">Corpo e proporção</b><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Corpo" value={appearance.bodyShape} options={BODY_SHAPES} onChange={(value) => patchAppearance({ bodyShape: value })}/><SelectField label="Torso" value={appearance.torsoShape} options={TORSOS} onChange={(value) => patchAppearance({ torsoShape: value })}/><SelectField label="Braços" value={appearance.armStyle} options={ARMS} onChange={(value) => patchAppearance({ armStyle: value })}/><SelectField label="Pernas" value={appearance.legStyle} options={LEGS} onChange={(value) => patchAppearance({ legStyle: value })}/><SelectField label="Mãos" value={appearance.handStyle} options={HANDS} onChange={(value) => patchAppearance({ handStyle: value })}/><SelectField label="Pés / patas" value={appearance.footStyle || 'feet'} options={FEET} onChange={(value) => patchAppearance({ footStyle: value })}/></div><div className="mt-3 grid gap-2"><RangeField label="Proporção cabeça × corpo" value={appearance.headToBodyRatio} min={2.8} max={7} step={.1} onChange={(value) => patchAppearance({ headToBodyRatio: value })} tip="Números menores aumentam a cabeça em relação ao corpo. É uma convenção de estilização, não um indicador de idade ou personalidade por si só."/><RangeField label="Largura corporal" value={appearance.bodyWidth} min={.65} max={1.45} step={.05} onChange={(value) => patchAppearance({ bodyWidth: value })}/><RangeField label="Ombros" value={appearance.shoulderWidth} min={.65} max={1.45} step={.05} onChange={(value) => patchAppearance({ shoulderWidth: value })}/><RangeField label="Comprimento dos membros" value={appearance.limbLength} min={.65} max={1.45} step={.05} onChange={(value) => patchAppearance({ limbLength: value })}/></div></div>

          <div className="rounded-2xl border p-4"><b className="text-lg">Anatomia especial</b><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Superfície" value={appearance.surfaceStyle || 'skin'} options={SURFACES} onChange={(value) => patchAppearance({ surfaceStyle: value })}/><SelectField label="Cauda" value={appearance.tailStyle || 'none'} options={TAILS} onChange={(value) => patchAppearance({ tailStyle: value })}/><SelectField label="Asas" value={appearance.wingStyle || 'none'} options={WINGS} onChange={(value) => patchAppearance({ wingStyle: value })}/><SelectField label="Chifres / antenas" value={appearance.hornStyle || 'none'} options={HORNS} onChange={(value) => patchAppearance({ hornStyle: value })}/></div></div>

          <div className="rounded-2xl border p-4"><b className="text-lg">Roupa e acessórios</b><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Roupa" value={appearance.outfitStyle} options={OUTFITS} onChange={(value) => patchAppearance({ outfitStyle: value })}/><SelectField label="Acessório" value={appearance.accessory} options={ACCESSORIES} onChange={(value) => patchAppearance({ accessory: value })}/></div></div>

          <div className="rounded-2xl border p-4"><b className="text-lg">Cores</b><div className="mt-3 grid grid-cols-2 gap-3"><HexField label="Pele / base" value={appearance.skinColor} onChange={(value) => patchAppearance({ skinColor: value })}/><HexField label="Superfície" value={appearance.surfaceColor || appearance.skinColor} onChange={(value) => patchAppearance({ surfaceColor: value })}/><HexField label="Cabelo" value={appearance.hairColor} onChange={(value) => patchAppearance({ hairColor: value })}/><HexField label="Olhos" value={appearance.eyeColor} onChange={(value) => patchAppearance({ eyeColor: value })}/><HexField label="Roupa 1" value={appearance.outfitPrimary} onChange={(value) => patchAppearance({ outfitPrimary: value })}/><HexField label="Roupa 2" value={appearance.outfitSecondary} onChange={(value) => patchAppearance({ outfitSecondary: value })}/><HexField label="Linha" value={appearance.lineColor} onChange={(value) => patchAppearance({ lineColor: value })}/></div></div>
        </>}

        {tab === 'profile' && <><div className="rounded-2xl border p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><b className="text-lg">Ficha do personagem</b><div className="text-xs text-neutral-500">Registre intenção e contexto, não “psicologia da forma”.</div></div><button onClick={() => void generateSheetAi()} disabled={sheetBusy} className="h-9 px-3 rounded-xl bg-black text-white text-[10px] font-bold flex items-center gap-2">{sheetBusy ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>} COMPLETAR COM IA</button></div>{[['Papel / função','role'],['Faixa etária / estágio de vida','ageBand'],['Personalidade','personality'],['Motivação','motivation'],['História','backstory'],['Intenção de silhueta','silhouetteIntent'],['Justificativa de shape language','shapeLanguageRationale'],['Justificativa das proporções','proportionRationale'],['Justificativa de cor','colorRationale'],['Justificativa de figurino','costumeRationale']].map(([label,key]) => <label key={key} className="block text-[10px] font-mono text-neutral-500 uppercase">{label}<textarea value={(profile as any)[key] || ''} onChange={(event) => patchProfile({ [key]: event.target.value } as Partial<CharacterProfile>)} className="mt-1 min-h-16 w-full rounded-xl border p-3 text-sm text-black"/></label>)}</div><div className="rounded-2xl border p-4"><b>Referências de concept art</b><div className="mt-2 space-y-2">{REFERENCES.map((reference) => <div key={reference} className="text-[10px] leading-relaxed text-neutral-600">• {reference}</div>)}</div></div></>}

        {tab === 'poses' && <div className="space-y-4"><div className="rounded-2xl border p-4"><b className="text-lg">Turnaround</b><div className="mt-1 text-xs text-neutral-500">Frente, 3/4, perfil e costas. Para animais, a leitura se adapta ao plano corporal.</div><div className="mt-3 grid grid-cols-2 gap-2">{VIEWS.map((view) => <button key={view} onClick={() => setDraft((current) => ({ ...current, activeView: view, generatedSvg: undefined }))} className={`rounded-xl border p-2 ${draft.activeView === view ? 'ring-2 ring-black' : ''}`}><div className="aspect-[3/4] bg-neutral-50 rounded-lg overflow-hidden"><img src={svgDataUrl(buildCharacterSvg(draft, view, draft.activeExpression || 'neutral', 'neutral'))} className="w-full h-full object-contain"/></div><div className="mt-1 text-[10px] font-bold uppercase">{view === 'front' ? 'Frente' : view === 'three-quarter' ? '3/4' : view === 'side' ? 'Perfil' : 'Costas'}</div></button>)}</div></div><div className="rounded-2xl border p-4"><b className="text-lg">Expression sheet</b><div className="mt-3 grid grid-cols-3 gap-2">{EXPRESSIONS.map((expression) => <button key={expression} onClick={() => setDraft((current) => ({ ...current, activeExpression: expression, generatedSvg: undefined }))} className={`rounded-xl border p-2 ${draft.activeExpression === expression ? 'ring-2 ring-black' : ''}`}><div className="aspect-square bg-neutral-50 rounded-full overflow-hidden"><img src={svgDataUrl(buildCharacterSvg(draft, 'front', expression, 'neutral'))} className="w-full h-full object-contain scale-[1.9]"/></div><div className="mt-1 text-[9px] font-bold uppercase">{expression}</div></button>)}</div></div><div className="rounded-2xl border p-4"><b className="text-lg">Pose sheet</b><div className="mt-3 grid grid-cols-2 gap-2">{POSES.map((pose) => <button key={pose.kind} onClick={() => setDraft((current) => ({ ...current, activePose: pose.kind, generatedSvg: undefined }))} className={`rounded-xl border p-2 ${draft.activePose === pose.kind ? 'ring-2 ring-black' : ''}`}><div className="aspect-[4/3] bg-neutral-50 rounded-lg overflow-hidden"><img src={svgDataUrl(buildCharacterSvg(draft, pose.kind === 'walk' || pose.kind === 'run' ? 'side' : 'three-quarter', draft.activeExpression || 'neutral', pose.kind))} className="w-full h-full object-contain"/></div><div className="mt-1 text-[10px] font-bold">{pose.label}</div></button>)}</div></div></div>}

        {tab === 'animate' && <><div className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-2"><div><b className="text-lg">Animações locais / sprites</b><div className="text-xs text-neutral-500">Estados para jogos, microinterações e personagens do projeto.</div></div><select defaultValue="" onChange={(event) => { if (event.target.value) addAnimation(event.target.value as SpriteAnimationKind); event.currentTarget.value = ''; }} className="h-9 rounded-xl border px-2 text-xs"><option value="" disabled>+ ESTADO</option>{ANIMATION_KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><div className="mt-3 flex gap-2 overflow-x-auto">{draft.animations.map((animation) => <button key={animation.id} onClick={() => { setSelectedAnimationId(animation.id); setFrameIndex(0); }} className={`shrink-0 h-9 px-3 rounded-xl border text-[10px] font-bold ${animation.id === activeAnimation.id ? 'bg-black text-white' : ''}`}>{animation.name}</button>)}</div><div className="mt-3 grid grid-cols-3 gap-2"><label className="text-[9px] font-mono uppercase text-neutral-500">FPS<input type="number" min={1} max={30} value={activeAnimation.fps} onChange={(event) => patchAnimation({ fps: Number(event.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm"/></label><label className="text-[9px] font-mono uppercase text-neutral-500">Loop<select value={activeAnimation.loop ? 'yes' : 'no'} onChange={(event) => patchAnimation({ loop: event.target.value === 'yes' })} className="mt-1 h-9 w-full rounded-lg border"><option value="yes">Sim</option><option value="no">Não</option></select></label><SelectField label="Motion" value={activeAnimation.motion} options={MOTIONS} onChange={(value) => patchAnimation({ motion: value })}/></div><button onClick={createFrames} className="mt-3 h-11 w-full rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-2"><Sparkles size={14}/> GERAR FRAMES DO ESTADO</button></div><div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-2"><div><b>Frames próprios</b><div className="text-xs text-neutral-500">Use imagens do projeto ou envie arquivos.</div></div><button onClick={() => fileRef.current?.click()} className="h-9 px-3 rounded-xl border text-[10px] font-bold flex items-center gap-1"><Upload size={13}/> UPLOAD</button></div><input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { if (event.target.files) void uploadFrames(event.target.files); }}/><div className="mt-3 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">{availableAssets.map((asset) => <button key={asset.id} onClick={() => addAssetFrame(asset)} className="rounded-xl border overflow-hidden text-left"><div className="aspect-square bg-neutral-100"><img src={asset.url} className="w-full h-full object-contain"/></div><div className="p-2 text-[9px] font-bold truncate">+ {asset.name}</div></button>)}</div>{uploading ? <div className="mt-2 text-xs">Enviando...</div> : null}</div><div className="rounded-2xl border p-4"><b>Timeline</b><div className="mt-3 space-y-2">{activeAnimation.frames.map((frame, index) => <div key={frame.id} className="flex items-center gap-2 rounded-xl border p-2"><button onClick={() => { setFrameIndex(index); setPlaying(false); }} className={`h-14 w-14 rounded-lg overflow-hidden border ${frameIndex === index ? 'ring-2 ring-black' : ''}`}><img src={frame.url} className="w-full h-full object-contain"/></button><div className="min-w-0 flex-1"><div className="text-[10px] font-bold truncate">{index + 1}. {frame.name}</div><input type="number" min={30} max={5000} value={frame.durationMs || 125} onChange={(event) => patchAnimation({ frames: activeAnimation.frames.map((item) => item.id === frame.id ? { ...item, durationMs: Number(event.target.value) } : item) })} className="mt-1 h-7 w-24 rounded border px-1 text-[10px]"/></div><button onClick={() => patchAnimation({ frames: activeAnimation.frames.filter((item) => item.id !== frame.id) })} className="h-8 w-8 rounded-lg border text-red-600"><Trash2 size={13} className="mx-auto"/></button></div>)}{!activeAnimation.frames.length ? <div className="rounded-xl border border-dashed p-4 text-center text-xs text-neutral-400">Clique em GERAR FRAMES DO ESTADO para testar a animação imediatamente.</div> : null}</div></div></>}

        {tab === 'ai' && <div className="rounded-2xl border-2 border-black p-4 space-y-3"><div className="flex items-center gap-2"><WandSparkles size={16}/><b className="text-lg">IA + SVG</b></div><div className="text-xs text-neutral-500">A IA recebe tipo de ser, plano corporal, partes opcionais, ficha, pose e expressão. Pode gerar humano, animal, criatura ou híbrido em SVG.</div><div className="flex gap-2 items-start"><textarea value={draft.prompt || ''} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} className="min-h-32 min-w-0 flex-1 rounded-xl border p-3 text-sm" placeholder="Ex.: crie um híbrido entre raposa e ave: corpo quadrúpede, asas pequenas, cauda volumosa, focinho alongado, sem sobrancelhas e silhueta simples para sprite..."/><VoiceDictationButton onText={(text) => setDraft((current) => ({ ...current, prompt: `${current.prompt || ''}${current.prompt ? ' ' : ''}${text}` }))}/></div><button onClick={() => void generateSvgAi()} disabled={busy} className="h-11 w-full rounded-xl bg-black text-white text-xs font-bold flex items-center justify-center gap-2">{busy ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} GERAR / REFINAR SVG</button>{draft.generatedSvg ? <button onClick={() => setDraft((current) => ({ ...current, generatedSvg: undefined }))} className="h-10 w-full rounded-xl border text-xs font-bold">VOLTAR AO CONSTRUTOR MODULAR</button> : null}{draft.generatedNotes?.length ? <div className="rounded-xl bg-neutral-50 p-3">{draft.generatedNotes.map((note) => <div key={note} className="text-[10px] text-neutral-600">• {note}</div>)}</div> : null}</div>}

        {error ? <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</div> : null}
      </section></div>}>

      <section className="min-h-[55vh] xl:min-h-0 overflow-auto p-4 sm:p-7 flex flex-col items-center gap-4">
        <div className="w-full max-w-4xl flex items-center justify-between gap-3"><div><div className="text-[9px] font-mono uppercase text-neutral-500">Prévia viva · {SPECIES.find((item) => item.id === appearance.species)?.label || 'Ser'} · {BODY_PLANS.find((item) => item.id === appearance.bodyPlan)?.label || 'plano corporal'}</div><b className="text-xl">{draft.characterName}</b></div><div className="flex gap-2"><button onClick={() => setPlaying((value) => !value)} className="h-10 px-3 rounded-xl bg-black text-white text-[10px] font-bold flex items-center gap-2">{playing ? <Pause size={14}/> : <Play size={14}/>} {playing ? 'PAUSAR' : 'PLAY'}</button><button onClick={downloadSvg} className="h-10 px-3 rounded-xl border bg-white text-[10px] font-bold flex items-center gap-2"><Download size={14}/> SVG</button></div></div>
        <div className="w-full max-w-4xl rounded-3xl border bg-white min-h-[560px] flex items-center justify-center p-6" style={{ background: draft.background }}><motion.div {...animationMotionProps(activeAnimation.motion, playing)} className="flex items-center justify-center max-w-full max-h-full"><img src={previewUrl} alt={draft.characterName} className="max-w-full max-h-[520px] object-contain" style={{ imageRendering: draft.pixelated ? 'pixelated' : 'auto' }}/></motion.div></div>
        {activeAnimation.frames.length ? <div className="w-full max-w-4xl rounded-2xl border bg-white p-3"><div className="flex items-center gap-2"><b className="text-sm">{activeAnimation.name}</b><span className="text-[10px] text-neutral-500">· {activeAnimation.frames.length} frames · {activeAnimation.fps} fps</span></div><div className="mt-2 flex gap-1 overflow-x-auto">{activeAnimation.frames.map((frame, index) => <button key={frame.id} onClick={() => { setFrameIndex(index); setPlaying(false); }} className={`shrink-0 h-16 w-16 rounded-lg border overflow-hidden ${index === frameIndex ? 'ring-2 ring-black' : ''}`}><img src={frame.url} className="w-full h-full object-contain"/></button>)}</div></div> : null}
      </section>
    </StudioWorkspace>
  </div>;
}
