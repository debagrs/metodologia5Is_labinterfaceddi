import { characterImageForAI } from '../lib/characterAI';
import { CHARACTER_STYLE_FAMILIES, applyStyleVariant, defaultStyleVariant, selectedStyleVariant, styleVariantsForFamily } from '../lib/characterStyles';
import { CHARACTER_CONTROLS, ACCESSORY_CATALOG, characterAccessories, normalizeAppearance, metric } from '../lib/characterControls';
import { illustrateCharacter } from '../lib/characterArt';
import { renderPixelCharacterSvg, renderVoxelCharacterSvg } from '../lib/characterPixelVoxel';
import { StudioWorkspace } from './StudioWorkspace';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, CircleUserRound, Eye, Scissors, Shirt, Palette, Shapes, PawPrint, Dna, SlidersHorizontal, Download, Info, Loader2, Pause, Play, Plus, Save, Sparkles, Trash2, Upload, WandSparkles, X } from 'lucide-react';
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

const IDENTITY_REPRESENTATIONS: Option<NonNullable<CharacterAppearance['identityRepresentation']>>[] = [
  { id: 'woman', label: 'Feminino' },
  { id: 'man', label: 'Masculino' },
  { id: 'open', label: 'Prefiro não limitar' },
];
const IDENTITY_LABELS: Record<NonNullable<CharacterAppearance['identityRepresentation']>, string> = {
  man: 'Masculino', woman: 'Feminino', lgbtqia: 'Prefiro não limitar', open: 'Prefiro não limitar',
};
const IDENTITY_START_PATCHES: Record<'man' | 'woman', Partial<CharacterAppearance>> = {
  man: {
    headShape: 'square', faceShape: 'angular', browStyle: 'straight', hairStyle: 'short', mouthStyle: 'line',
    shoulderWidth: 1.08, bodyWidth: 1.0, waistWidth: 1.02, headWidth: 0.98, eyeSize: 0.95,
  },
  woman: {
    headShape: 'oval', faceShape: 'soft', browStyle: 'soft', hairStyle: 'bob', mouthStyle: 'bow',
    shoulderWidth: 0.9, bodyWidth: 0.96, waistWidth: 0.88, headWidth: 0.97, eyeSize: 1.02,
  },
};

const AGE_GROUPS: Option<NonNullable<CharacterAppearance['ageGroup']>>[] = [
  { id: 'baby', label: 'Bebê' },
  { id: 'child', label: 'Criança' },
  { id: 'teen', label: 'Adolescente' },
  { id: 'adult', label: 'Adulto' },
  { id: 'older-adult', label: 'Pessoa idosa' },
];
const AGE_LABELS: Record<NonNullable<CharacterAppearance['ageGroup']>, string> = {
  baby: 'Bebê', child: 'Criança', teen: 'Adolescente', adult: 'Adulto', 'older-adult': 'Pessoa idosa',
};
const AGE_PATCHES: Record<NonNullable<CharacterAppearance['ageGroup']>, Partial<CharacterAppearance>> = {
  baby: {
    headToBodyRatio: 1.95, limbLength: .36, shoulderWidth: .55, bodyWidth: .8, waistWidth: 1.12,
    legStyle: 'short', armStyle: 'thin', headShape: 'round', faceShape: 'soft', eyeSize: 1.46,
    eyeSpacing: 1.12, noseStyle: 'small', mouthStyle: 'small', stature: 'very-short', handSize: .58, footSize: .62,
    headWidth: 1.16, headHeight: 1.17, torsoShape: 'round', browStyle: 'soft', mouthSize: .82, noseSize: .72,
  },
  child: {
    headToBodyRatio: 2.85, limbLength: .58, shoulderWidth: .7, bodyWidth: .86, waistWidth: 1.0,
    legStyle: 'short', armStyle: 'regular', headShape: 'round', faceShape: 'soft', eyeSize: 1.28,
    eyeSpacing: 1.07, noseStyle: 'small', mouthStyle: 'small', stature: 'short', handSize: .72, footSize: .77,
    headWidth: 1.08, headHeight: 1.08, torsoShape: 'rectangle', mouthSize: .9, noseSize: .82,
  },
  teen: {
    headToBodyRatio: 4.45, limbLength: .98, shoulderWidth: .86, bodyWidth: .9, waistWidth: .88,
    legStyle: 'long', armStyle: 'regular', headShape: 'oval', eyeSize: 1.06, stature: 'average', handSize: .91, footSize: .94,
    torsoShape: 'rectangle', headWidth: .99, headHeight: 1.01,
  },
  adult: {
    headToBodyRatio: 5.7, limbLength: 1.03, shoulderWidth: 1, bodyWidth: 1, waistWidth: 1,
    legStyle: 'regular', armStyle: 'regular', eyeSize: 1, stature: 'average', handSize: 1, footSize: 1,
    headWidth: 1, headHeight: 1,
  },
  'older-adult': {
    headToBodyRatio: 5.15, limbLength: .82, shoulderWidth: .86, bodyWidth: 1.02, waistWidth: 1.08,
    legStyle: 'short', armStyle: 'regular', headShape: 'oval', faceShape: 'soft', eyeSize: .9,
    stature: 'short', handSize: .93, footSize: .93, torsoShape: 'round', headHeight: .96, headWidth: .97,
    browStyle: 'soft', mouthSize: .94, noseSize: 1.06,
  },
};

const FEATURE_PROFILES: Option<NonNullable<CharacterAppearance['featureProfile']>>[] = [
  { id: 'neutral', label: 'Neutro / livre' },
  { id: 'afrodiasporic', label: 'Afrodiaspórico' },
  { id: 'indigenous', label: 'Indígena ameríndio' },
  { id: 'aboriginal', label: 'Aborígene / povos originários da Oceania' },
  { id: 'east-asian', label: 'Leste asiático' },
  { id: 'south-asian', label: 'Sul-asiático / indiano' },
  { id: 'west-asian', label: 'Oeste asiático / árabe' },
  { id: 'latine', label: 'Latino / mestiço' },
  { id: 'european', label: 'Europeu' },
  { id: 'mixed', label: 'Misturado / híbrido humano' },
];

const FEATURE_PROFILE_PATCHES: Record<NonNullable<CharacterAppearance['featureProfile']>, Partial<CharacterAppearance>> = {
  neutral: {},
  afrodiasporic: { featureProfile:'afrodiasporic', eyeStyle:'almond', noseStyle:'broad', mouthStyle:'full', hairStyle:'coily', skinColor:'#8B5A3C', surfaceColor:'#8B5A3C', hairColor:'#2F211C', eyeColor:'#442C1E' },
  indigenous: { featureProfile:'indigenous', eyeStyle:'almond', noseStyle:'straight', mouthStyle:'wide', hairStyle:'long', skinColor:'#B57D55', surfaceColor:'#B57D55', hairColor:'#1B1514', eyeColor:'#2E211E' },
  aboriginal: { featureProfile:'aboriginal', eyeStyle:'almond', noseStyle:'broad', mouthStyle:'wide', hairStyle:'curly', skinColor:'#7A5038', surfaceColor:'#7A5038', hairColor:'#241A17', eyeColor:'#3B261D' },
  'east-asian': { featureProfile:'east-asian', eyeStyle:'monolid', noseStyle:'small', mouthStyle:'small', hairStyle:'blunt', skinColor:'#E7C5A5', surfaceColor:'#E7C5A5', hairColor:'#1F1715', eyeColor:'#31231E' },
  'south-asian': { featureProfile:'south-asian', eyeStyle:'almond', noseStyle:'aquiline', mouthStyle:'full', hairStyle:'wavy', skinColor:'#A36844', surfaceColor:'#A36844', hairColor:'#211815', eyeColor:'#3A281F' },
  'west-asian': { featureProfile:'west-asian', eyeStyle:'almond', noseStyle:'aquiline', mouthStyle:'wide', hairStyle:'wavy', skinColor:'#C68D66', surfaceColor:'#C68D66', hairColor:'#2B1E19', eyeColor:'#3E281F' },
  latine: { featureProfile:'latine', eyeStyle:'almond', noseStyle:'button', mouthStyle:'full', hairStyle:'wavy', skinColor:'#D5A27C', surfaceColor:'#D5A27C', hairColor:'#2E221D', eyeColor:'#4A3228' },
  european: { featureProfile:'european', eyeStyle:'round', noseStyle:'straight', mouthStyle:'bow', hairStyle:'bob', skinColor:'#F1D2B9', surfaceColor:'#F1D2B9', hairColor:'#5D4335', eyeColor:'#5E463B' },
  mixed: { featureProfile:'mixed', eyeStyle:'almond', noseStyle:'button', mouthStyle:'full', hairStyle:'curly', skinColor:'#C1906D', surfaceColor:'#C1906D', hairColor:'#34251F', eyeColor:'#4B3328' },
};

const HEADS = [
  { id: 'round', label: 'Redonda' }, { id: 'oval', label: 'Oval' }, { id: 'square', label: 'Quadrada' },
  { id: 'heart', label: 'Coração' }, { id: 'triangle', label: 'Triangular' }, { id: 'wide', label: 'Larga' },
] as Option<CharacterAppearance['headShape']>[];
const FACES = [
  { id: 'soft', label: 'Suave' }, { id: 'angular', label: 'Angular' }, { id: 'long', label: 'Longo' }, { id: 'wide', label: 'Largo' },
] as Option<CharacterAppearance['faceShape']>[];
const EYES = [
  { id: 'round', label: 'Redondos' }, { id: 'almond', label: 'Amendoados' }, { id: 'narrow', label: 'Estreitos' }, { id: 'dot', label: 'Pontos' }, { id: 'large', label: 'Grandes' }, { id: 'hooded', label: 'Pálpebra marcada' }, { id: 'monolid', label: 'Monopálpebra' }, { id: 'upturned', label: 'Ascendentes' }, { id: 'downturned', label: 'Descendentes' },
] as Option<CharacterAppearance['eyeStyle']>[];
const BROWS = [
  { id: 'none', label: 'Nenhuma' }, { id: 'soft', label: 'Suave' }, { id: 'straight', label: 'Reta' }, { id: 'arched', label: 'Arqueada' }, { id: 'bold', label: 'Marcada' },
] as Option<CharacterAppearance['browStyle']>[];
const NOSES = [
  { id: 'none', label: 'Nenhum' }, { id: 'small', label: 'Pequeno' }, { id: 'button', label: 'Arrebitado' }, { id: 'straight', label: 'Reto' }, { id: 'wide', label: 'Largo' }, { id: 'broad', label: 'Base larga' }, { id: 'aquiline', label: 'Aquilino' },
] as Option<CharacterAppearance['noseStyle']>[];
const MOUTHS = [
  { id: 'line', label: 'Linha' }, { id: 'smile', label: 'Sorriso' }, { id: 'full', label: 'Cheia' }, { id: 'small', label: 'Pequena' }, { id: 'wide', label: 'Larga' }, { id: 'bow', label: 'Arco' },
] as Option<CharacterAppearance['mouthStyle']>[];
const EARS = [
  { id: 'none', label: 'Nenhuma' }, { id: 'simple', label: 'Simples' }, { id: 'round', label: 'Redonda' }, { id: 'pointed', label: 'Pontuda' },
  { id: 'long', label: 'Longa' }, { id: 'floppy', label: 'Caída' }, { id: 'large', label: 'Grande' }, { id: 'fin', label: 'Barbatana' },
] as Option<CharacterAppearance['earStyle']>[];
const HAIR = [
  { id: 'none', label: 'Nenhum' }, { id: 'buzz', label: 'Raspado' }, { id: 'short', label: 'Curto' }, { id: 'pixie', label: 'Pixie' }, { id: 'undercut', label: 'Undercut' },
  { id: 'bob', label: 'Bob' }, { id: 'blunt', label: 'Bob reto' }, { id: 'lob', label: 'Long bob' },
  { id: 'long', label: 'Longo' }, { id: 'extra-long', label: 'Extra longo' }, { id: 'layered-long', label: 'Longo em camadas' },
  { id: 'wavy', label: 'Ondulado' }, { id: 'curly', label: 'Cacheado' }, { id: 'coily', label: 'Crespo / coily' }, { id: 'afro', label: 'Afro volumoso' },
  { id: 'locs', label: 'Locs médios' }, { id: 'locs-long', label: 'Locs longos' }, { id: 'braids', label: 'Tranças' }, { id: 'box-braids', label: 'Box braids' }, { id: 'cornrows', label: 'Cornrows' },
  { id: 'ponytail', label: 'Rabo de cavalo' }, { id: 'high-ponytail', label: 'Rabo alto' }, { id: 'pigtails', label: 'Maria-chiquinha' }, { id: 'half-up', label: 'Meio preso' },
  { id: 'bun', label: 'Coque' }, { id: 'double-bun', label: 'Coque duplo' }, { id: 'spiky', label: 'Espetado' },
] as Option<CharacterAppearance['hairStyle']>[];
const ANIMAL_PERSONALITIES: Option<NonNullable<CharacterAppearance['animalPersonality']>>[] = [
  {id:'neutral',label:'Neutra'}, {id:'gentle',label:'Dócil'}, {id:'curious',label:'Curiosa'}, {id:'brave',label:'Valente'},
  {id:'shy',label:'Tímida'}, {id:'ferocious',label:'Feroz'}, {id:'playful',label:'Brincalhona'}, {id:'mysterious',label:'Misteriosa'},
];
const AQUATIC_BASES = [
  {id:'fish',label:'Peixe clássico'}, {id:'shark',label:'Tubarão'}, {id:'puffer',label:'Baiacu'}, {id:'ray',label:'Raia'}, {id:'seahorse',label:'Cavalo-marinho'},
] as const;
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
  { id: 'very-slim', label: 'Bem magrinho' }, { id: 'slim', label: 'Esguio' }, { id: 'average', label: 'Equilibrado' }, { id: 'athletic', label: 'Atlético' }, { id: 'stocky', label: 'Robusto' }, { id: 'plus-size', label: 'Mais corpulento' }, { id: 'chibi', label: 'Chibi / compacto' },
] as Option<CharacterAppearance['bodyShape']>[];
const STATURES = [
  { id: 'very-short', label: 'Muito baixo' }, { id: 'short', label: 'Baixo' }, { id: 'average', label: 'Médio' }, { id: 'tall', label: 'Alto' }, { id: 'giant', label: 'Gigante' },
] as Option<NonNullable<CharacterAppearance['stature']>>[];
const REPRESENTATION_PROFILES = [
  { id: 'none', label: 'Sem preset' },
  { id: 'down-syndrome', label: 'Representação de síndrome de Down' },
] as Option<NonNullable<CharacterAppearance['representationProfile']>>[];
const MOBILITY_AIDS = [
  { id: 'none', label: 'Sem apoio' }, { id: 'wheelchair', label: 'Cadeira de rodas' }, { id: 'crutch', label: 'Muleta' }, { id: 'prosthesis-leg', label: 'Prótese na perna' },
] as Option<NonNullable<CharacterAppearance['mobilityAid']>>[];
const WHEELCHAIR_STYLES = [
  { id: 'manual', label: 'Manual clássica' },
  { id: 'active', label: 'Ativa / compacta' },
  { id: 'sport', label: 'Esportiva' },
] as Option<NonNullable<CharacterAppearance['wheelchairStyle']>>[];
const VISION_AIDS = [
  { id: 'none', label: 'Nenhum' }, { id: 'cane', label: 'Bengala' }, { id: 'dark-glasses', label: 'Óculos escuros' },
] as Option<NonNullable<CharacterAppearance['visionAid']>>[];
const TORSOS = [
  { id: 'rectangle', label: 'Retângulo' }, { id: 'trapezoid', label: 'Trapézio' }, { id: 'round', label: 'Redondo' }, { id: 'triangle', label: 'Triângulo' },
] as Option<CharacterAppearance['torsoShape']>[];
const ARMS = [{ id: 'thin', label: 'Finos' }, { id: 'regular', label: 'Regulares' }, { id: 'strong', label: 'Fortes' }] as Option<CharacterAppearance['armStyle']>[];
const LEGS = [{ id: 'short', label: 'Curtas' }, { id: 'regular', label: 'Regulares' }, { id: 'long', label: 'Longas' }] as Option<CharacterAppearance['legStyle']>[];
const HANDS = [{ id: 'mitten', label: 'Luva / simples' }, { id: 'simple', label: 'Simples' }, { id: 'defined', label: 'Definidas' }] as Option<CharacterAppearance['handStyle']>[];
const OUTFITS = [
  { id: 'none', label: 'Sem roupa' }, { id: 'basic', label: 'Básico' }, { id: 'casual', label: 'Casual' }, { id: 'sport', label: 'Esportivo' },
  { id: 'formal', label: 'Formal' }, { id: 'elegant', label: 'Editorial / elegante' }, { id: 'school', label: 'Uniforme escolar' }, { id: 'kawaii', label: 'Kawaii' },
  { id: 'street', label: 'Streetwear' }, { id: 'punk', label: 'Punk' }, { id: 'historical', label: 'Histórico' }, { id: 'steampunk', label: 'Steampunk' },
  { id: 'fantasy', label: 'Fantasia' }, { id: 'adventure', label: 'Aventura' }, { id: 'workwear', label: 'Utilitário / workwear' }, { id: 'tech', label: 'Tech' }, { id: 'scifi', label: 'Sci-fi' },
] as Option<CharacterAppearance['outfitStyle']>[];
const ACCESSORIES = [
  { id: 'none', label: 'Nenhum' }, { id: 'glasses', label: 'Óculos' }, { id: 'hat', label: 'Chapéu' }, { id: 'scarf', label: 'Cachecol' }, { id: 'backpack', label: 'Mochila' }, { id: 'headphones', label: 'Fones' },
] as Option<CharacterAppearance['accessory']>[];

const EXPRESSIONS: CharacterExpression[] = ['neutral', 'happy', 'sad', 'angry', 'surprised', 'determined', 'winking', 'laughing', 'worried', 'calm'];
const EXPRESSION_LABELS: Record<CharacterExpression, string> = { neutral:'Neutra', happy:'Feliz', sad:'Triste', angry:'Irritada', surprised:'Surpresa', determined:'Determinada', winking:'Piscando', laughing:'Rindo', worried:'Preocupada', calm:'Serena' };
const VIEWS: CharacterView[] = ['front', 'three-quarter', 'side', 'back'];
const POSES: Array<{ kind: CharacterPoseKind; label: string }> = [
  { kind: 'neutral', label: 'Neutra' }, { kind: 'wave', label: 'Aceno' }, { kind: 'walk', label: 'Caminhada' }, { kind: 'run', label: 'Corrida' },
  { kind: 'jump', label: 'Salto' }, { kind: 'sit', label: 'Sentado' }, { kind: 'action', label: 'Ação' }, { kind: 'swim', label: 'Nado' },
  { kind: 'glide', label: 'Planar' }, { kind: 'slither', label: 'Rastejar sinuoso' }, { kind: 'crawl', label: 'Rastejar' },
];
const POSE_VIEW_HINTS: Partial<Record<CharacterPoseKind, CharacterView>> = {
  walk: 'side', run: 'side', swim: 'side', glide: 'side', slither: 'side', crawl: 'side',
};
const MOTIONS: Option<SpriteMotionPreset>[] = [
  { id: 'none', label: 'Sem motion' }, { id: 'bob', label: 'Flutuar' }, { id: 'bounce', label: 'Bounce' }, { id: 'shake', label: 'Tremer' }, { id: 'pulse', label: 'Pulsar' }, { id: 'squash', label: 'Squash & stretch' },
];
const ANIMATION_KINDS: Option<SpriteAnimationKind>[] = [
  { id: 'idle', label: 'Idle' }, { id: 'walk', label: 'Andar' }, { id: 'run', label: 'Correr' }, { id: 'jump', label: 'Pular' }, { id: 'attack', label: 'Ação' }, { id: 'hurt', label: 'Reação' },
  { id: 'swim', label: 'Nadar' }, { id: 'glide', label: 'Planar' }, { id: 'slither', label: 'Deslizar' }, { id: 'crawl', label: 'Rastejar' }, { id: 'flutter', label: 'Bater asas' }, { id: 'custom', label: 'Custom' },
];
const POSE_ADJUSTMENT_FIELDS = [
  { key:'al',label:'Braço esquerdo' },{key:'ar',label:'Braço direito'},{key:'el',label:'Cotovelo esquerdo'},{key:'er',label:'Cotovelo direito'},{key:'ll',label:'Coxa esquerda'},{key:'lr',label:'Coxa direita'},{key:'kl',label:'Joelho esquerdo'},{key:'kr',label:'Joelho direito'},{key:'lean',label:'Inclinação do corpo'},{key:'headTilt',label:'Inclinação da cabeça'}
] as const;

// Estado zero editorial anônimo. A base é uma mulher adulta contemporânea,
// sem nome, preset pessoal ou qualquer indicação de que represente alguém específico.
// Ela continua 100% editável: estilo, anatomia, cores, espécie, roupas e acessórios.
const DEFAULT_APPEARANCE: CharacterAppearance = {
  artStyle: 'illustrated',
  styleVariant: 'illustrated-soft',
  species: 'human',
  featureProfile: 'neutral',
  bodyPlan: 'biped',
  speciesPreset: 'human',
  hybridPrimaryPreset: 'human',
  hybridSecondaryPreset: 'cat',
  hybridBlend: 50,

  headShape: 'oval',
  faceShape: 'soft',
  eyeStyle: 'almond',
  browStyle: 'arched',
  noseStyle: 'small',
  mouthStyle: 'small',
  earStyle: 'simple',
  hairStyle: 'bob',

  muzzleStyle: 'none',
  tailStyle: 'none',
  wingStyle: 'none',
  hornStyle: 'none',
  surfaceStyle: 'skin',
  footStyle: 'feet',
  whiskers: false,

  bodyShape: 'average',
  torsoShape: 'trapezoid',
  armStyle: 'regular',
  legStyle: 'regular',
  handStyle: 'simple',
  outfitStyle: 'casual',
  accessory: 'none',
  accessories: [],
  stature: 'average',
  representationProfile: 'none',
  identityRepresentation: 'open',
  ageGroup: 'adult',
  mobilityAid: 'none',
  wheelchairStyle: 'active',
  wheelchairColor: '#4C5968',
  visionAid: 'none',

  // Proporções adultas e menos masculinizadas que o antigo estado zero.
  headToBodyRatio: 5.6,
  shoulderWidth: 0.9,
  limbLength: 1.03,
  bodyWidth: 0.96,
  waistWidth: 0.9,
  armWidth: 0.9,
  legWidth: 0.92,
  handSize: 0.9,
  footSize: 0.92,
  headWidth: 0.97,
  headHeight: 1.02,
  eyeSize: 0.98,
  eyeSpacing: 1.02,
  irisScale: 0.95,
  browSize: 0.9,
  noseSize: 0.9,
  mouthSize: 0.92,
  earSize: 0.9,
  hairVolume: 1.04,
  strokeWidth: 1.6,

  // Paleta inicial sóbria/editorial: pele clara quente, castanhos e verde-azulado.
  skinColor: '#F0CFB5',
  surfaceColor: '#F0CFB5',
  hairColor: '#3B2A24',
  eyeColor: '#5B3B2F',
  outfitPrimary: '#2F8F88',
  outfitSecondary: '#3A3A3A',
  lineColor: '#493730',
};

const DEFAULT_PROFILE: CharacterProfile = {
  role: '', ageBand: '', personality: '', motivation: '', backstory: '', keywords: [], silhouetteIntent: '', shapeLanguageRationale: '', proportionRationale: '', colorRationale: '', costumeRationale: '',
};

const DEFAULT_POSES: CharacterPoseReference[] = POSES.map((pose) => ({ id: `pose-${pose.kind}`, name: pose.label, kind: pose.kind, view: POSE_VIEW_HINTS[pose.kind] || 'three-quarter' }));

const PRESETS: Array<{ id: string; label: string; description: string; patch: Partial<CharacterAppearance> }> = [
  { id: 'human', label: 'Humano', description: 'Base bípede humana.', patch: { species: 'human', bodyPlan: 'biped', speciesPreset: 'human', earStyle: 'simple', muzzleStyle: 'none', tailStyle: 'none', wingStyle: 'none', hornStyle: 'none', surfaceStyle: 'skin', footStyle: 'feet', browStyle: 'soft', whiskers: false } },
  { id: 'cat', label: 'Gato', description: 'Quadrúpede felino.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'cat', earStyle: 'pointed', muzzleStyle: 'short', tailStyle: 'long', surfaceStyle: 'fur-short', footStyle: 'paws', browStyle: 'none', noseStyle: 'small', hairStyle: 'none', whiskers: true, bodyShape: 'slim' } },
  { id: 'dog', label: 'Cão', description: 'Quadrúpede canino.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'dog', earStyle: 'floppy', muzzleStyle: 'long', tailStyle: 'curled', surfaceStyle: 'fur-short', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: false, bodyShape: 'average' } },
  { id: 'rabbit', label: 'Coelho', description: 'Orelhas longas e corpo compacto.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'rabbit', earStyle: 'long', muzzleStyle: 'short', tailStyle: 'short', surfaceStyle: 'fur-short', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: true, bodyShape: 'chibi', headToBodyRatio: 3.6 } },
  { id: 'fox', label: 'Raposa', description: 'Silhueta triangular e cauda forte.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'fox', earStyle: 'pointed', muzzleStyle: 'long', tailStyle: 'fluffy', surfaceStyle: 'fur-long', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: true, bodyShape: 'slim' } },
  { id: 'bear', label: 'Urso', description: 'Massas redondas e corpo robusto.', patch: { species: 'quadruped', bodyPlan: 'quadruped', speciesPreset: 'bear', earStyle: 'round', muzzleStyle: 'round', tailStyle: 'short', surfaceStyle: 'fur-long', footStyle: 'paws', browStyle: 'none', hairStyle: 'none', whiskers: false, bodyShape: 'stocky', bodyWidth: 1.2 } },
  { id: 'bird', label: 'Ave', description: 'Bico, asas e plumagem.', patch: { species: 'bird', bodyPlan: 'avian', speciesPreset: 'bird', earStyle: 'none', muzzleStyle: 'beak-small', tailStyle: 'long', wingStyle: 'feather', surfaceStyle: 'feathers', footStyle: 'talons', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'reptile', label: 'Lagarto', description: 'Escamas, garras e cauda reptiliana.', patch: { species: 'reptile', bodyPlan: 'quadruped', speciesPreset: 'lizard', earStyle: 'none', muzzleStyle: 'long', tailStyle: 'reptile', surfaceStyle: 'scales', footStyle: 'claws', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'fish', label: 'Peixe', description: 'Plano aquático e nadadeiras.', patch: { species: 'fish', bodyPlan: 'aquatic', speciesPreset: 'fish', earStyle: 'none', muzzleStyle: 'none', tailStyle: 'fish', wingStyle: 'fin', surfaceStyle: 'scales', footStyle: 'fins', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'insect', label: 'Inseto', description: 'Seis membros e antenas.', patch: { species: 'arthropod', bodyPlan: 'six-limbed', speciesPreset: 'insect', earStyle: 'none', muzzleStyle: 'none', tailStyle: 'none', hornStyle: 'antennae', surfaceStyle: 'chitin', footStyle: 'claws', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'spider', label: 'Aranha', description: 'Oito membros e corpo segmentado.', patch: { species: 'arthropod', bodyPlan: 'eight-limbed', speciesPreset: 'spider', earStyle: 'none', muzzleStyle: 'none', tailStyle: 'none', hornStyle: 'none', surfaceStyle: 'chitin', footStyle: 'claws', browStyle: 'none', noseStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
  { id: 'dragon', label: 'Dragão', description: 'Híbrido fantástico com asas e chifres.', patch: { species: 'fantasy', bodyPlan: 'quadruped', speciesPreset: 'dragon', earStyle: 'pointed', muzzleStyle: 'long', tailStyle: 'reptile', wingStyle: 'bat', hornStyle: 'long', surfaceStyle: 'scales', footStyle: 'claws', browStyle: 'none', hairStyle: 'none', outfitStyle: 'none' } },
];

PRESETS.push({ id: 'wolf', label: 'Lobo', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'fox')!.patch, surfaceColor: '#83919A', earStyle: 'pointed', tailStyle: 'fluffy', bodyShape: 'athletic', speciesPreset: 'wolf' } });
PRESETS.push({ id: 'lion', label: 'Leão', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'cat')!.patch, surfaceColor: '#D7A34E', bodyShape: 'stocky', headShape: 'wide', surfaceStyle: 'fur-long', tailStyle: 'long', speciesPreset: 'lion' } });
PRESETS.push({ id: 'horse', label: 'Cavalo', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'dog')!.patch, surfaceColor: '#9E6446', earStyle: 'pointed', footStyle: 'hooves', bodyShape: 'slim', limbLength: 1.3, muzzleStyle: 'long', tailStyle: 'long', speciesPreset: 'horse' } });
PRESETS.push({ id: 'deer', label: 'Cervo', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'dog')!.patch, surfaceColor: '#BA8E66', earStyle: 'pointed', footStyle: 'hooves', hornStyle: 'antlers', bodyShape: 'slim', limbLength: 1.2, tailStyle: 'short', speciesPreset: 'deer' } });
PRESETS.push({ id: 'elephant', label: 'Elefante', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'bear')!.patch, surfaceColor: '#A5ACB5', earStyle: 'large', muzzleStyle: 'long', bodyWidth: 1.35, headShape: 'wide', tailStyle: 'short', speciesPreset: 'elephant' } });
PRESETS.push({ id: 'bat', label: 'Morcego', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'cat')!.patch, species: 'fantasy', bodyPlan: 'biped', surfaceColor: '#82728E', wingStyle: 'bat', tailStyle: 'none', outfitStyle: 'none', speciesPreset: 'bat' } });
PRESETS.push({ id: 'owl', label: 'Coruja', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'bird')!.patch, surfaceColor: '#9F7860', headShape: 'wide', eyeStyle: 'large', bodyShape: 'stocky', muzzleStyle: 'beak-hooked', speciesPreset: 'owl' } });
PRESETS.push({ id: 'parrot', label: 'Papagaio', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'bird')!.patch, surfaceColor: '#7DA96B', muzzleStyle: 'beak-hooked', tailStyle: 'long', speciesPreset: 'parrot' } });
PRESETS.push({ id: 'frog', label: 'Sapo', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'reptile')!.patch, species: 'amphibian', surfaceColor: '#94B476', headShape: 'wide', eyeStyle: 'large', muzzleStyle: 'none', tailStyle: 'none', surfaceStyle: 'skin', bodyShape: 'chibi', speciesPreset: 'frog' } });
PRESETS.push({ id: 'turtle', label: 'Tartaruga', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'reptile')!.patch, surfaceColor: '#859764', surfaceStyle: 'shell', bodyShape: 'stocky', muzzleStyle: 'short', tailStyle: 'short', limbLength: 0.7, speciesPreset: 'turtle' } });
PRESETS.push({ id: 'snake', label: 'Serpente', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'reptile')!.patch, bodyPlan: 'serpentine', surfaceColor: '#7B9A75', muzzleStyle: 'none', tailStyle: 'reptile', speciesPreset: 'snake' } });
PRESETS.push({ id: 'butterfly', label: 'Borboleta', description: 'Base anatômica editável.', patch: { ...PRESETS.find(p => p.id === 'insect')!.patch, surfaceColor: '#CE8AA4', wingStyle: 'bat', bodyShape: 'slim', speciesPreset: 'butterfly' } });

const PRESET_GROUPS: Record<CharacterSpecies, string[]> = {
  human: ['human'],
  anthropomorphic: ['cat','dog','rabbit','fox','bear','bird','reptile','fish','wolf','lion','horse','deer','elephant','bat','owl','parrot','frog','turtle','snake','butterfly'],
  quadruped: ['cat','dog','rabbit','fox','bear','wolf','lion','horse','deer','elephant'],
  bird: ['bird','owl','parrot'],
  reptile: ['reptile','turtle','snake'],
  amphibian: ['frog'],
  fish: ['fish'],
  arthropod: ['insect','spider','butterfly'],
  fantasy: ['dragon','bat'],
  hybrid: [],
};

function filteredPresets(appearance: CharacterAppearance) {
  const species = appearance.species || 'human';
  const ids = PRESET_GROUPS[species as CharacterSpecies] || [];
  if (!ids.length) return PRESETS;
  return PRESETS.filter((preset) => ids.includes(preset.id));
}

function motionProfileForAppearance(appearance: CharacterAppearance) {
  const bodyPlan = appearance.bodyPlan || 'biped';
  const preset = appearance.speciesPreset || '';
  const species = appearance.species || 'human';
  if (appearance.mobilityAid === 'wheelchair' && bodyPlan === 'biped') {
    return { poses: ['neutral','wave','sit','action'] as CharacterPoseKind[], animations: ['idle','attack','hurt','custom'] as SpriteAnimationKind[], adjustments: ['al','ar','el','er','lean','headTilt'] as Array<(typeof POSE_ADJUSTMENT_FIELDS)[number]['key']>, note:'Na cadeira de rodas, a base permanece sentada e estável. As variações atuam principalmente no tronco, cabeça, braços e contato com os aros; caminhada, corrida e salto não aparecem.' };
  }
  if (species === 'fish' || bodyPlan === 'aquatic' || preset === 'fish') {
    return { poses: ['neutral','swim','action'] as CharacterPoseKind[], animations: ['idle','swim','attack','hurt','custom'] as SpriteAnimationKind[], adjustments: ['lean','headTilt'] as Array<(typeof POSE_ADJUSTMENT_FIELDS)[number]['key']>, note:'Peixes usam nado, impulso e virada do corpo. Não exibimos braços/pernas porque esse ser não os possui.' };
  }
  if (bodyPlan === 'serpentine' || preset === 'snake') {
    return { poses: ['neutral','slither','action'] as CharacterPoseKind[], animations: ['idle','slither','attack','hurt','custom'] as SpriteAnimationKind[], adjustments: ['ll','lr','kl','kr','lean','headTilt'] as Array<(typeof POSE_ADJUSTMENT_FIELDS)[number]['key']>, note:'Seres serpentinos controlam curvatura, avanço e inclinação da cabeça.' };
  }
  if (bodyPlan === 'avian' || species === 'bird' || ['bird','owl','parrot'].includes(preset)) {
    return { poses: ['neutral','glide','jump','action'] as CharacterPoseKind[], animations: ['idle','glide','flutter','jump','attack','hurt','custom'] as SpriteAnimationKind[], adjustments: ['al','ar','el','er','ll','lr','kl','kr','lean','headTilt'] as Array<(typeof POSE_ADJUSTMENT_FIELDS)[number]['key']>, note:'Aves controlam abertura das asas, salto e planeio.' };
  }
  if (bodyPlan === 'six-limbed' || bodyPlan === 'eight-limbed' || species === 'arthropod') {
    return { poses: ['neutral','crawl','run','action'] as CharacterPoseKind[], animations: ['idle','crawl','run','attack','hurt','custom'] as SpriteAnimationKind[], adjustments: ['ll','lr','kl','kr','lean','headTilt'] as Array<(typeof POSE_ADJUSTMENT_FIELDS)[number]['key']>, note:'Insetos e aracnídeos usam deslocamento rastejante e ataque rápido.' };
  }
  if (bodyPlan === 'quadruped' && species !== 'anthropomorphic') {
    return { poses: ['neutral','walk','run','sit','action'] as CharacterPoseKind[], animations: ['idle','walk','run','attack','hurt','custom'] as SpriteAnimationKind[], adjustments: ['al','ar','el','er','ll','lr','kl','kr','lean','headTilt'] as Array<(typeof POSE_ADJUSTMENT_FIELDS)[number]['key']>, note:'Quadrúpedes usam passo, corrida, descanso e ações de impulso.' };
  }
  return { poses: ['neutral','wave','walk','run','jump','sit','action'] as CharacterPoseKind[], animations: ['idle','walk','run','jump','attack','hurt','custom'] as SpriteAnimationKind[], adjustments: POSE_ADJUSTMENT_FIELDS.map(item=>item.key), note:'Personagens bípedes e antropomórficos usam repertório completo de braços, pernas e gestos.' };
}

function anthropomorphicAppearance(current: CharacterAppearance, primaryId: string, secondaryId?: string, blend = 58): CharacterAppearance {
  const animalPrimary = { ...DEFAULT_APPEARANCE, ...presetPatch(primaryId) } as CharacterAppearance;
  const animalSecondary = secondaryId ? { ...DEFAULT_APPEARANCE, ...presetPatch(secondaryId) } as CharacterAppearance : null;
  const mergedAnimal = animalSecondary ? hybridAppearance({ ...current }, primaryId, secondaryId, blend) : { ...current, ...animalPrimary, hybridPrimaryPreset: primaryId, hybridSecondaryPreset: secondaryId || 'human', hybridBlend: blend };
  return {
    ...current,
    ...mergedAnimal,
    species: 'anthropomorphic',
    speciesPreset: primaryId,
    bodyPlan: 'biped',
    outfitStyle: current.outfitStyle === 'none' ? 'casual' : (current.outfitStyle || 'casual'),
    footStyle: ['hooves','paws','claws','talons'].includes(String(mergedAnimal.footStyle || '')) ? (mergedAnimal.footStyle as CharacterAppearance['footStyle']) : 'feet',
    handStyle: current.handStyle || 'simple',
    armStyle: current.armStyle || 'regular',
    legStyle: current.legStyle || 'regular',
    mobilityAid: current.mobilityAid || 'none',
  };
}

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
  if(t === 0 || t === 1) return {...current, ...(t === 0 ? primary : secondary), species:'hybrid',speciesPreset:'hybrid',hybridPrimaryPreset:primaryId,hybridSecondaryPreset:secondaryId,hybridBlend:blend};
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
  id: id('anim'), name: ANIMATION_KINDS.find((item) => item.id === kind)?.label || 'Animação', kind, fps: kind === 'run' ? 24 : kind === 'walk' || kind === 'swim' || kind === 'slither' ? 16 : 12, loop: !['jump', 'attack', 'hurt'].includes(kind), motion: kind === 'idle' ? 'bob' : kind === 'swim' ? 'pulse' : 'none', frames: [],
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
    appearance: normalizeAppearance({ ...DEFAULT_APPEARANCE, ...(document.appearance || {}) }),
    profile: { ...DEFAULT_PROFILE, ...(document.profile || {}) },
    poses: document.poses?.length ? document.poses.map((pose) => ({ ...pose })) : base.poses,
    expressions: document.expressions?.length ? [...document.expressions] : base.expressions,
    animations: document.animations?.length ? document.animations.map((animation) => ({ ...animation, frames: (animation.frames || []).map((frame) => ({ ...frame })) })) : base.animations,
  };
}

export function buildCharacterSvg(document: CharacterSpriteDocument, view: CharacterView = 'front', expression: CharacterExpression = 'neutral', pose: CharacterPoseKind = 'neutral') {
  const merged = { ...document, appearance: { ...DEFAULT_APPEARANCE, ...document.appearance } };
  const style = merged.appearance.artStyle || 'illustrated';
  if (style === 'pixel-art') return renderPixelCharacterSvg(merged, view, expression, pose);
  if (style === 'voxel') return renderVoxelCharacterSvg(merged);
  return illustrateCharacter(merged, view, expression, pose, document.posePhase ?? (pose === 'walk' || pose === 'run' ? .125 : pose === 'jump' ? .5 : 0));
}

export function SpriteCharacterPreview({ document, className = '' }: { document: CharacterSpriteDocument; className?: string }) {
  const svg = document.generatedSvg || buildCharacterSvg(document, document.activeView || 'front', document.activeExpression || 'neutral', document.activePose || 'neutral');
  return <div className={`w-full h-full flex items-center justify-center overflow-hidden bg-neutral-50 ${className}`}><img src={svgDataUrl(svg)} alt={document.characterName} className="max-w-full max-h-full object-contain" style={{ imageRendering: document.pixelated ? 'pixelated' : 'auto' }} /></div>;
}

function InfoTip({ children }: { children: string }) {
  const [open, setOpen] = useState(false);
  return <span className="relative inline-flex ml-1 align-middle"><button type="button" onClick={(event) => { event.preventDefault(); event.stopPropagation(); setOpen((value) => !value); }} onBlur={() => setTimeout(() => setOpen(false), 120)} className="h-6 w-6 rounded-full inline-flex items-center justify-center hover:bg-black/5" aria-label="Explicação"><Info size={13} /></button>{open ? <span className="absolute z-[200] left-1/2 bottom-full mb-2 w-64 max-w-[75vw] -translate-x-1/2 rounded-xl bg-black text-white p-3 text-[10px] leading-relaxed shadow-xl">{children}</span> : null}</span>;
}

const VisualCharacterContext = createContext<CharacterSpriteDocument | null>(null);
const VISUAL_FIELDS: Record<string, keyof CharacterAppearance> = { 'Tipo':'species', 'Plano corporal':'bodyPlan', 'Cabeça':'headShape','Rosto':'faceShape','Olhos':'eyeStyle','Sobrancelha':'browStyle','Nariz':'noseStyle','Boca':'mouthStyle','Orelha':'earStyle','Cabelo':'hairStyle','Focinho / bico':'muzzleStyle','Corpo':'bodyShape','Estatura':'stature','Torso':'torsoShape','Braços':'armStyle','Pernas':'legStyle','Mãos':'handStyle','Pés / patas':'footStyle','Perfil inclusivo':'representationProfile','Apoio de mobilidade':'mobilityAid','Cadeira':'wheelchairStyle','Apoio visual':'visionAid','Superfície':'surfaceStyle','Cauda':'tailStyle','Asas':'wingStyle','Chifres / antenas':'hornStyle','Roupa':'outfitStyle','Acessório':'accessory' };
function candidateThumbnail(document: CharacterSpriteDocument, patch: Partial<CharacterAppearance>, portrait = false) {
 const appearance = { ...DEFAULT_APPEARANCE, ...document.appearance, ...patch };
 const candidate = { ...document, generatedSvg: undefined, appearance };
 if (appearance.artStyle === 'pixel-art') return svgDataUrl(renderPixelCharacterSvg(candidate, 'front', 'neutral', 'neutral'));
 if (appearance.artStyle === 'voxel') return svgDataUrl(renderVoxelCharacterSvg(candidate));
 return svgDataUrl(illustrateCharacter(candidate, 'front', 'neutral', 'neutral', 0, portrait));
}
function SelectField<T extends string>({ label, value, options, onChange, tip }: { label: string; value: T; options: Option<T>[]; onChange: (value: T) => void; tip?: string }) {
 const document = useContext(VisualCharacterContext); const field = VISUAL_FIELDS[label];
 const portrait = ['Cabeça','Rosto','Olhos','Sobrancelha','Nariz','Boca','Orelha','Cabelo','Focinho / bico'].includes(label);
 return <div className="character-option-group"><span className="character-option-label">{label}{tip ? <InfoTip>{tip}</InfoTip> : null}</span><div className={field && document ? 'character-options' : 'flex gap-2 flex-wrap'}>{options.map(item => <button key={item.id} type="button" aria-label={`${label}: ${item.label}`} aria-pressed={item.id === value} onClick={() => onChange(item.id)} className={`character-choice ${item.id === value ? 'is-selected' : ''}`}>
 {field === 'species' ? <AnimalMark kind={item.id}/> : field && document ? <img loading="lazy" alt="" src={candidateThumbnail(document, { [field]:item.id }, portrait)}/> : null}<span>{item.label}</span></button>)}</div></div>;
}
function AnimalMark({ kind }: { kind:string }) {
 const paths:Record<string,string> = {
 human:'M32 8a10 10 0 1 1 0 20a10 10 0 0 1 0-20M14 56v-10q0-15 18-15t18 15v10Z',
 cat:'M14 26 12 8 25 19Q32 15 39 19L52 8 50 26Q57 43 46 52Q32 61 18 52Q7 43 14 26Z',
 dog:'M20 19Q32 11 44 19L55 24 52 47 43 36Q44 56 32 57Q20 56 21 36L12 47 9 24Z',
 rabbit:'M21 28Q5 0 18 5Q27 8 29 28L35 28Q37 8 46 5Q59 0 43 28Q56 38 47 52Q32 63 17 52Q8 38 21 28Z',
 fox:'M10 9 29 24 35 24 54 9 48 36 32 57 16 36Z',
 bear:'M17 19a9 9 0 1 1 8-8Q32 8 39 11a9 9 0 1 1 8 8Q59 40 45 53Q32 61 19 53Q5 40 17 19Z',
 bird:'M18 32Q6 22 17 12Q31 4 42 16L58 23 43 28Q46 48 26 53L10 58 13 44Q28 46 35 28Q24 40 18 32Z',
 fish:'M8 32Q26 8 46 24L59 13V51L46 40Q26 56 8 32Z',
 reptile:'M8 20 25 26 37 22 52 7 55 12 44 30 56 37 50 42 39 35 24 41 15 56 10 53 17 38 6 30Z',
 snake:'M12 51Q52 59 49 36Q46 22 30 29Q18 34 17 21Q16 8 33 8L44 17 34 21Q28 14 25 22Q32 20 44 27Q64 55 13 59Z',
 insect:'M22 25Q17 5 32 9Q47 5 42 25Q54 39 42 55Q32 63 22 55Q10 39 22 25ZM18 30 5 23M17 40 3 40M20 50 7 58M46 30 59 23M47 40 61 40M44 50 57 58',
 spider:'M22 22Q32 13 42 22L43 39Q32 55 21 39ZM21 25 7 12 4 25M20 30 4 29 2 40M21 36 6 44 4 55M23 41 13 51 14 61M43 25 57 12 60 25M44 30 60 29 62 40M43 36 58 44 60 55M41 41 51 51 50 61',
 horse:'M16 54 18 36 6 31 13 14 31 18 40 8 42 22Q54 39 47 57L30 57 32 37 23 42 23 54Z',
 deer:'M19 24 32 19 45 24 44 44 32 56 20 44ZM23 23 17 10 10 5M17 10 22 2M41 23 47 10 54 5M47 10 42 2',
 elephant:'M24 15Q32 9 40 15Q61 9 59 34Q55 47 43 38L42 53Q42 64 31 58L32 47 30 28 24 37Q10 47 5 34Q3 9 24 15Z',
 bat:'M27 25 24 14 32 20 40 14 37 25Q53 7 62 34L52 30 48 44 39 38 32 55 25 38 16 44 12 30 2 34Q11 7 27 25Z',
 owl:'M15 9 26 18 38 18 49 9 50 36Q49 57 32 60Q15 57 14 36ZM21 28a7 7 0 1 0 0 .1M43 28a7 7 0 1 0 0 .1M28 38 32 45 36 38',
 frog:'M15 22a9 9 0 1 1 16-5a9 9 0 1 1 18 5Q59 35 48 46L57 55 42 56 32 49 22 56 7 55 16 46Q5 35 15 22Z',
 turtle:'M18 22Q32 10 46 22L55 18 59 25 51 30Q54 41 46 48L50 56 42 58 36 51 28 51 22 58 14 56 18 48Q10 34 18 22Z',
 butterfly:'M30 27Q8-2 4 21Q3 34 22 36Q7 38 13 56Q24 62 32 39Q40 62 51 56Q57 38 42 36Q61 34 60 21Q56-2 34 27ZM30 24 27 9M34 24 37 9',
 dragon:'M13 52 19 38 9 22 25 28 28 12 34 19 42 9 44 24 58 28 48 33 44 45 57 52 39 54 31 46 24 54Z',
 };
 const aliases:Record<string,string>={wolf:'fox',lion:'cat',parrot:'bird',anthropomorphic:'human',quadruped:'cat',avian:'bird',aquatic:'fish','six-limbed':'insect','eight-limbed':'spider',serpentine:'snake',biped:'human',amphibian:'frog',arthropod:'insect',fantasy:'dragon',hybrid:'dragon'};
 return <svg aria-hidden="true" viewBox="0 0 64 64" className="animal-mark"><path d={paths[kind] || paths[aliases[kind]] || paths.cat} fill="currentColor" fillOpacity=".12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function RangeField({ label, value, min, max, step, onChange, tip }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; tip?: string }) {
  return <label className="block rounded-xl border p-3"><div className="flex items-center justify-between text-[10px] font-mono uppercase"><span>{label}{tip ? <InfoTip>{tip}</InfoTip> : null}</span><b>{value.toFixed(step < 1 ? 1 : 0)}</b></div><input type="range" min={min} max={max} step={step} value={value} aria-label={label} onChange={(event) => onChange(Number(event.target.value))} className="mt-2 w-full" /></label>;
}

function HexField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
 const colors=label.includes('Pele') ? ['#FFF0E4','#F5D5BF','#E8B99A','#D4AD80','#C68B68','#B57D55','#A36B4D','#8B5A3C','#724831','#4A3026','#E7C5A5','#C1906D','#95B6A0','#B7A1C8'] : ['#F5EEE6','#DBAB79','#997358','#403133','#191B26','#7EA7A0','#73B7D8','#98A970','#DB9698','#C1A1CF','#0F0F14','#A0522D','#D7C2F0'];
 return <div className="character-color-field"><span className="character-option-label">{label}</span><div className="character-swatches">{colors.map(color=><button key={color} type="button" aria-label={`${label}: ${color}`} aria-pressed={normalizeHex(value)===color} onClick={()=>onChange(color)} style={{background:color}}/>)}</div><div className="flex gap-2 mt-2"><input type="color" aria-label={`${label}: seletor de cor`} value={normalizeHex(value)} onChange={e=>onChange(e.target.value)} className="w-10 h-10 rounded-lg border"/><input aria-label={`${label}: hexadecimal`} value={value} onChange={e=>onChange(e.target.value)} className="min-w-0 flex-1 h-10 border rounded-lg px-2 font-mono"/></div></div>;
}

function animationMotionProps(motionPreset: SpriteMotionPreset, playing: boolean) {
  if (!playing || motionPreset === 'none') return { animate: { x: 0, y: 0, scaleX: 1, scaleY: 1, scale: 1 }, transition: { duration: .2 } };
  if (motionPreset === 'bob') return { animate: { y: [0, -9, 0] }, transition: { duration: 1.1, repeat: Infinity, ease: 'easeInOut' as const } };
  if (motionPreset === 'bounce') return { animate: { y: [0, -18, 0] }, transition: { duration: .75, repeat: Infinity, ease: 'easeInOut' as const } };
  if (motionPreset === 'shake') return { animate: { x: [0, -5, 5, -3, 3, 0] }, transition: { duration: .36, repeat: Infinity } };
  if (motionPreset === 'pulse') return { animate: { scale: [1, 1.04, 1] }, transition: { duration: .9, repeat: Infinity } };
  return { animate: { scaleX: [1, 1.07, 1], scaleY: [1, .93, 1] }, transition: { duration: .72, repeat: Infinity } };
}

export default function SpriteStudio({ document, title = 'Novo personagem & criaturas', canEdit = true, availableAssets = [], onSave, onClose }: Props) {
  const [builderSection, setBuilderSection] = useState('style');
  const [portraitMode, setPortraitMode] = useState(false);
  const [posePlaying,setPosePlaying]=useState(false);
  useEffect(()=>{if(!posePlaying)return;const timer=window.setInterval(()=>setDraft(current=>({...current,posePhase:((current.posePhase || 0)+.04)%1,generatedSvg:undefined})),50);return()=>window.clearInterval(timer);},[posePlaying]);
  const [draft, setDraft] = useState<CharacterSpriteDocument>(() => mergeDocument(document));
  const [tab, setTab] = useState<Tab>('builder');
  const [busy, setBusy] = useState(false);
  const [sheetBusy, setSheetBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const referenceFileRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(true);
  const [selectedAnimationId, setSelectedAnimationId] = useState(() => document.activeAnimationId || document.animations?.[0]?.id || '');
  const [frameIndex, setFrameIndex] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const appearance = { ...DEFAULT_APPEARANCE, ...(draft.appearance || {}) };
  const profile = { ...DEFAULT_PROFILE, ...(draft.profile || {}) };
  const activeStyleVariant = selectedStyleVariant(appearance);
  const currentStyleVariants = styleVariantsForFamily(appearance.artStyle || 'illustrated');
  const recommendedOutfits = activeStyleVariant.recommendedOutfits || [];
  const styleAccessoryCatalog = [...ACCESSORY_CATALOG].sort((a,b) => {
    const score = (item: typeof ACCESSORY_CATALOG[number]) => item.styles?.some(tag => [appearance.artStyle, appearance.styleVariant, appearance.outfitStyle].includes(tag as any)) ? 1 : 0;
    return score(b) - score(a);
  });
  const activeAnimation = draft.animations.find((animation) => animation.id === selectedAnimationId) || draft.animations[0] || blankAnimation('idle');
  const motionProfile = useMemo(() => motionProfileForAppearance(appearance), [appearance]);
  const availablePoses = useMemo(() => POSES.filter((pose) => motionProfile.poses.includes(pose.kind)), [motionProfile]);
  const availableAnimationKinds = useMemo(() => ANIMATION_KINDS.filter((item) => motionProfile.animations.includes(item.id) || item.id === 'custom'), [motionProfile]);
  const availableMotions = useMemo(() => {
    if (appearance.bodyPlan === 'aquatic') return MOTIONS.filter(item => ['none','pulse','bob'].includes(item.id));
    if (appearance.bodyPlan === 'serpentine') return MOTIONS.filter(item => ['none','shake','pulse'].includes(item.id));
    return MOTIONS;
  }, [appearance.bodyPlan]);
  const visiblePoseAdjustmentFields = useMemo(() => POSE_ADJUSTMENT_FIELDS.filter(item => motionProfile.adjustments.includes(item.key)), [motionProfile]);
  const presetChoices = useMemo(() => filteredPresets(appearance), [appearance]);
  const manualSvg = useMemo(() => buildCharacterSvg(draft, draft.activeView || 'front', draft.activeExpression || 'neutral', draft.activePose || 'neutral'), [draft]);
  const previewUrl = tab === 'animate' && activeAnimation.frames?.length ? activeAnimation.frames[frameIndex % activeAnimation.frames.length].url : svgDataUrl(draft.generatedSvg || manualSvg);

  useEffect(() => {
    if (tab !== 'animate' || !playing || !activeAnimation.frames?.length || activeAnimation.frames.length < 2) return;
    const duration = activeAnimation.frames[frameIndex]?.durationMs || Math.max(16, Math.round(1000 / Math.max(1, activeAnimation.fps || 8)));
    const timer = window.setTimeout(() => { if (frameIndex + 1 >= activeAnimation.frames.length && !activeAnimation.loop) { setPlaying(false); return; } setFrameIndex((value) => (value + 1) % activeAnimation.frames.length); }, duration);
    return () => window.clearTimeout(timer);
  }, [tab, playing, activeAnimation.id, activeAnimation.frames, activeAnimation.fps, activeAnimation.loop, frameIndex]);

  useEffect(() => {
    if (!availablePoses.some(item => item.kind === (draft.activePose || 'neutral'))) {
      setDraft(current => ({ ...current, activePose: availablePoses[0]?.kind || 'neutral', generatedSvg: undefined }));
    }
  }, [availablePoses, draft.activePose]);

  useEffect(() => {
    if (activeAnimation && !availableAnimationKinds.some(item => item.id === activeAnimation.kind)) {
      const fallback = blankAnimation(availableAnimationKinds[0]?.id || 'idle');
      setDraft(current => ({
        ...current,
        animations: current.animations.map(animation => animation.id === activeAnimation.id ? { ...fallback, id: animation.id, frames: animation.frames } : animation),
      }));
    }
  }, [availableAnimationKinds, activeAnimation?.id, activeAnimation?.kind]);

  const patchAppearance = (partial: Partial<CharacterAppearance>, keepGenerated = false) => setDraft((current) => ({ ...current, appearance: normalizeAppearance({ ...DEFAULT_APPEARANCE, ...(current.appearance || {}), ...partial }), generatedSvg: keepGenerated ? current.generatedSvg : undefined, animations: current.animations.map(animation => animation.generatedFromCharacter || (animation.generatedFromCharacter === undefined && animation.frames.length > 0 && animation.frames.every(frame=>frame.url.startsWith('data:image/svg+xml'))) ? { ...animation, frames: [] } : animation), updatedAt: new Date().toISOString() }));
  const applyGraphicStyle = (variantId: string) => {
    const next = applyStyleVariant(appearance, variantId);
    setDraft((current) => ({
      ...current,
      pixelated: next.artStyle === 'pixel-art',
      appearance: normalizeAppearance({ ...DEFAULT_APPEARANCE, ...(current.appearance || {}), ...next }),
      generatedSvg: undefined,
      animations: current.animations.map(animation => animation.generatedFromCharacter || (animation.generatedFromCharacter === undefined && animation.frames.length > 0 && animation.frames.every(frame=>frame.url.startsWith('data:image/svg+xml'))) ? { ...animation, frames: [] } : animation),
      updatedAt: new Date().toISOString(),
    }));
  };
  const surpriseWithinStyle = () => {
    const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];
    const variant = pick(currentStyleVariants.length ? currentStyleVariants : [activeStyleVariant]);
    let next = applyStyleVariant(appearance, variant.id);
    const humanLike = ['biped','custom'].includes(next.bodyPlan || '') || ['human','anthropomorphic','fantasy','hybrid'].includes(next.species || '');
    if (humanLike) {
      const hairs = HAIR.filter(item => item.id !== 'none').map(item => item.id);
      const outfits = (variant.recommendedOutfits?.length ? variant.recommendedOutfits : ['casual','street','formal','fantasy'] as CharacterAppearance['outfitStyle'][]);
      next = { ...next, hairStyle: pick(hairs), outfitStyle: pick(outfits) };
    }
    const compatible = ACCESSORY_CATALOG.filter(item => !item.styles?.length || item.styles.some(tag => [variant.family, variant.id, next.outfitStyle].includes(tag as any)));
    const count = Math.min(3, Math.max(1, compatible.length ? 1 + Math.floor(Math.random()*3) : 0));
    const shuffled = [...compatible].sort(() => Math.random() - .5).slice(0,count);
    next = { ...next, accessories: shuffled.map((item,index) => ({ id:`style-${Date.now()}-${index}`, kind:item.kind, color:item.color, scale:1, x:0, y:0 })), accessory:'none' };
    patchAppearance(next);
  };
  const patchProfile = (partial: Partial<CharacterProfile>) => setDraft((current) => ({ ...current, profile: { ...DEFAULT_PROFILE, ...(current.profile || {}), ...partial }, updatedAt: new Date().toISOString() }));
  const patchAnimation = (partial: Partial<SpriteAnimation>) => setDraft((current) => ({ ...current, animations: current.animations.map((animation) => animation.id === activeAnimation.id ? { ...animation, ...partial } : animation), activeAnimationId: activeAnimation.id, updatedAt: new Date().toISOString() }));

  const refinementSliders=(section:string)=><div className="character-refinement"><div className="character-option-label">Ajuste fino · em tempo real</div>{CHARACTER_CONTROLS.filter(control=>control.section===section && !(control.key==='hairVolume' && (appearance.hairStyle==='none'||appearance.bodyPlan!=='biped')) && !(control.key==='whiskerLength' && !appearance.whiskers) && !(control.key==='noseSize'||control.key==='noseHeight' ? appearance.noseStyle==='none' : false) && !(control.key==='tailSize'&&appearance.tailStyle==='none') && !(control.key==='wingSize'&&appearance.wingStyle==='none') && !(control.key==='hornSize'&&appearance.hornStyle==='none') && !(section==='body' && ['aquatic','serpentine','avian'].includes(appearance.bodyPlan||'') && ['armLength','armWidth','handSize','legLength','legWidth','footSize','waistWidth'].includes(control.key))).map(control=><RangeField key={control.key} label={control.label} min={control.min} max={control.max} step={control.step} value={metric(appearance,control.key,control.defaultValue)} onChange={value=>patchAppearance({[control.key]:value})}/>)}</div>;
  const accessoryItems=characterAccessories(appearance);
  const updateAccessory=(accessoryId:string,patch:Partial<NonNullable<CharacterAppearance['accessories']>[number]>)=>patchAppearance({accessories:accessoryItems.map(item=>item.id===accessoryId?{...item,...patch}:item),accessory:'none'});
  const toggleAccessory=(kind:NonNullable<CharacterAppearance['accessories']>[number]['kind'])=>{const existing=accessoryItems.some(item=>item.kind===kind),catalog=ACCESSORY_CATALOG.find(item=>item.kind===kind)!;patchAppearance({accessory:'none',accessories:existing?accessoryItems.filter(item=>item.kind!==kind):[...accessoryItems,{id:id('accessory'),kind,color:catalog.color,scale:1,x:0,y:0}]});};
  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find((item) => item.id === presetId);
    if (!preset) return;

    // Trocar espécie não deve apagar o estilo gráfico escolhido. Partimos do estado
    // zero anônimo, reaplicamos a família/subestilo atual e só então a anatomia do preset.
    const currentVariantId = appearance.styleVariant || defaultStyleVariant(appearance.artStyle || 'illustrated').id;
    const styledBase = applyStyleVariant(
      {
        ...DEFAULT_APPEARANCE,
        artStyle: appearance.artStyle || DEFAULT_APPEARANCE.artStyle,
        styleVariant: currentVariantId,
      },
      currentVariantId,
    );
    const isHuman = preset.id === 'human';
    const agePatch = AGE_PATCHES[appearance.ageGroup || 'adult'] || {};

    patchAppearance({
      ...styledBase,
      ...preset.patch,
      ...agePatch,
      artStyle: appearance.artStyle || styledBase.artStyle,
      styleVariant: currentVariantId,
      speciesPreset: preset.id,
      skinColor: isHuman ? DEFAULT_APPEARANCE.skinColor : (preset.patch.surfaceColor || '#D4AD80'),
      surfaceColor: isHuman ? DEFAULT_APPEARANCE.surfaceColor : (preset.patch.surfaceColor || '#D4AD80'),
      hairColor: isHuman ? DEFAULT_APPEARANCE.hairColor : styledBase.hairColor,
      eyeColor: isHuman ? DEFAULT_APPEARANCE.eyeColor : styledBase.eyeColor,
      outfitPrimary: isHuman ? DEFAULT_APPEARANCE.outfitPrimary : styledBase.outfitPrimary,
      outfitSecondary: isHuman ? DEFAULT_APPEARANCE.outfitSecondary : styledBase.outfitSecondary,
      outfitStyle: isHuman ? styledBase.outfitStyle : 'none',
      wingStyle: preset.patch.wingStyle || 'none',
      hornStyle: preset.patch.hornStyle || 'none',
      identityRepresentation: appearance.identityRepresentation || 'open',
      ageGroup: appearance.ageGroup || 'adult',
    });
  };

  const applyHybridMix = (primaryId = appearance.hybridPrimaryPreset || 'human', secondaryId = appearance.hybridSecondaryPreset || 'cat', blend = appearance.hybridBlend ?? 50) => {
    const next = hybridAppearance(appearance, primaryId, secondaryId, blend);
    patchAppearance(next);
  };

  const chooseSpecies = (value: CharacterSpecies) => {
    if (value === 'hybrid') {
      applyHybridMix(appearance.hybridPrimaryPreset || (PRESETS.some(p => p.id === appearance.speciesPreset) ? appearance.speciesPreset! : 'human'), appearance.hybridSecondaryPreset || 'cat', appearance.hybridBlend ?? 50);
      return;
    }
    if (value === 'human') { applyPreset('human'); return; }
    if (value === 'anthropomorphic') {
      patchAppearance(anthropomorphicAppearance(appearance, appearance.hybridPrimaryPreset || (appearance.speciesPreset !== 'human' ? appearance.speciesPreset || 'cat' : 'cat'), appearance.hybridSecondaryPreset && appearance.hybridSecondaryPreset !== 'human' ? appearance.hybridSecondaryPreset : undefined, appearance.hybridBlend ?? 58));
      return;
    }
    const plans:Partial<Record<CharacterSpecies,CharacterBodyPlan>> = {anthropomorphic:'biped',quadruped:'quadruped',bird:'avian',reptile:'quadruped',amphibian:'quadruped',fish:'aquatic',arthropod:'six-limbed',fantasy:'biped'};
    const presetId = (PRESET_GROUPS[value] || [])[0];
    if (presetId) { applyPreset(presetId); return; }
    patchAppearance({ species: value, bodyPlan:plans[value] || 'biped' });
  };

  const applyFeatureProfile = (profileId: NonNullable<CharacterAppearance['featureProfile']>) => {
    const patch = FEATURE_PROFILE_PATCHES[profileId] || {};
    patchAppearance({
      ...patch,
      featureProfile: profileId,
      species: 'human',
      bodyPlan: 'biped',
      speciesPreset: 'human',
      muzzleStyle: 'none',
      tailStyle: 'none',
      wingStyle: 'none',
      hornStyle: 'none',
      surfaceStyle: 'skin',
      footStyle: 'feet',
      whiskers: false,
    });
  };

  const applyStature = (stature: NonNullable<CharacterAppearance['stature']>) => {
    const presets: Record<NonNullable<CharacterAppearance['stature']>, Partial<CharacterAppearance>> = {
      'very-short': { stature, limbLength: 0.72, headToBodyRatio: 4.3, legStyle: 'short' },
      short: { stature, limbLength: 0.84, headToBodyRatio: 4.8, legStyle: 'short' },
      average: { stature, limbLength: 1.03, headToBodyRatio: 5.6, legStyle: 'regular' },
      tall: { stature, limbLength: 1.18, headToBodyRatio: 6.2, legStyle: 'long' },
      giant: { stature, limbLength: 1.34, headToBodyRatio: 6.8, legStyle: 'long', bodyWidth: Math.max(appearance.bodyWidth || 1, 1.04) },
    };
    patchAppearance(presets[stature]);
  };

  const applyIdentityRepresentation = (identity: NonNullable<CharacterAppearance['identityRepresentation']>) => {
    if (identity === 'open' || identity === 'lgbtqia') {
      patchAppearance({ identityRepresentation: 'open' });
      return;
    }
    patchAppearance({ ...IDENTITY_START_PATCHES[identity], identityRepresentation: identity });
  };

  const applyAgeGroup = (ageGroup: NonNullable<CharacterAppearance['ageGroup']>) => {
    const patch = AGE_PATCHES[ageGroup] || AGE_PATCHES.adult;
    const extra: Partial<CharacterAppearance> = {};
    if (ageGroup === 'older-adult' && (!appearance.hairColor || appearance.hairColor === DEFAULT_APPEARANCE.hairColor)) {
      extra.hairColor = '#837C77';
    }
    if (ageGroup !== 'older-adult' && appearance.hairColor === '#837C77') {
      extra.hairColor = DEFAULT_APPEARANCE.hairColor;
    }
    patchAppearance({ ...patch, ...extra, ageGroup });
    patchProfile({ ageBand: AGE_LABELS[ageGroup] });
  };

  const applyRepresentationProfile = (profile: NonNullable<CharacterAppearance['representationProfile']>) => {
    if (profile === 'down-syndrome') {
      patchAppearance({
        representationProfile: profile,
        species: 'human',
        bodyPlan: 'biped',
        speciesPreset: 'human',
        headShape: 'round',
        faceShape: 'soft',
        eyeStyle: 'upturned',
        noseStyle: 'small',
        mouthStyle: 'full',
        earStyle: 'simple',
        bodyShape: appearance.bodyShape === 'very-slim' ? 'average' : appearance.bodyShape,
      });
      return;
    }
    patchAppearance({ representationProfile: 'none' });
  };

  const applyMobilityAid = (mobilityAid: NonNullable<CharacterAppearance['mobilityAid']>) => {
    patchAppearance({ mobilityAid, ...(mobilityAid === 'wheelchair' ? { wheelchairStyle: appearance.wheelchairStyle || 'active', wheelchairColor: appearance.wheelchairColor || '#4C5968' } : {}) });
    setDraft((current) => ({
      ...current,
      activePose: mobilityAid === 'wheelchair' ? 'sit' : current.activePose === 'sit' ? 'neutral' : current.activePose,
      generatedSvg: undefined,
    }));
  };

  const applyVisionAid = (visionAid: NonNullable<CharacterAppearance['visionAid']>) => {
    patchAppearance({ visionAid, accessory: visionAid === 'dark-glasses' ? 'glasses' : appearance.accessory });
  };

  const addAnimation = (kind: SpriteAnimationKind) => {
    const next = blankAnimation(kind);
    setDraft((current) => ({ ...current, animations: [...current.animations, next], activeAnimationId: next.id }));
    setSelectedAnimationId(next.id);
    setFrameIndex(0);
  };

  const generatedFrameSequence = (kind: SpriteAnimationKind) => {
    const pose: CharacterPoseKind = kind === 'walk' || kind === 'run' || kind === 'jump' || kind === 'swim' || kind === 'glide' || kind === 'slither' || kind === 'crawl' ? kind : kind === 'flutter' ? 'glide' : kind === 'attack' || kind === 'hurt' ? 'action' : 'neutral';
    const suggestedView = POSE_VIEW_HINTS[pose] || (draft.activeView || 'front');
    return Array.from({ length: 16 }, (_, index) => ({ view: suggestedView as CharacterView, pose, expression: draft.activeExpression || 'neutral', phase: index / 16 }));
  };

  const createFrames = () => {
    if (draft.generatedSvg) return setError('O SVG da IA não possui articulações do construtor. Para animá-lo, importe frames próprios ou use-o na área de efeitos. Volte ao construtor modular para gerar poses articuladas.');
    const sequence = generatedFrameSequence(activeAnimation.kind);
    const frames: SpriteFrame[] = sequence.map((frame, index) => ({ id: id('frame'), name: `${activeAnimation.name} ${index + 1}`, url: svgDataUrl(buildCharacterSvg({ ...draft, posePhase: frame.phase, generatedSvg: undefined }, frame.view, frame.expression, frame.pose)), durationMs: Math.max(16, Math.round(1000 / Math.max(1, activeAnimation.fps || 8))) }));
    patchAnimation({ frames, generatedFromCharacter: true });
    setFrameIndex(0);
    setPlaying(true);
  };

  const addAssetFrame = (asset: SpriteAssetOption) => patchAnimation({ generatedFromCharacter: false, frames: [...activeAnimation.frames, { id: id('frame'), name: asset.name, url: asset.url, sourceNodeId: asset.id, durationMs: 125 }] });

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

  const uploadAiReference = async (file: File) => {
    if (!canEdit || busy || uploading) return;
    if ((draft.aiReferences || []).length >= 3) return setError('Use até três referências por personagem.');
    if (!file.type.startsWith('image/') && !/\.svg$/i.test(file.name)) return setError('Escolha uma imagem ou SVG.');
    if (file.size > 20 * 1024 * 1024) return setError('Use uma imagem de até 20 MB.');
    setUploading(true); setError('');
    const local = URL.createObjectURL(file);
    try {
      const prepared = await characterImageForAI(local);
      const bytes = Uint8Array.from(atob(prepared.data), ch => ch.charCodeAt(0));
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/upload', { method:'POST', headers: { 'Content-Type':'image/jpeg', 'X-File-Name':encodeURIComponent(file.name.replace(/\.[^.]+$/, '')+'.jpg'), ...(session?.token ? { Authorization:`Bearer ${session.token}` } : {}) }, body:new Blob([bytes], {type:'image/jpeg'}) });
      const data = await response.json().catch(()=>({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível guardar a referência.');
      setDraft(current => ({ ...current, aiSourceMode:'reference', aiReferences:[...(current.aiReferences || []), {id:id('reference'),name:file.name,url:data.url}] }));
    } catch (e:any) { setError(e.message || 'Falha ao preparar a referência.'); }
    finally { URL.revokeObjectURL(local); setUploading(false); }
  };

  const generateDesignAi = async () => {
    if (!String(draft.prompt || '').trim()) return setError('Descreva o que deseja criar ou refinar.');
    if (!canEdit || busy || uploading) return;
    const sourceMode = draft.aiSourceMode || 'refine';
    const refs = draft.aiReferences || [];
    if (sourceMode === 'reference' && !refs.length) return setError('Escolha ou envie um desenho como referência.');
    setBusy(true); setError('');
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 58000);
    try {
      const visualReferences = sourceMode === 'new' ? [] : await Promise.all(refs.slice(0,3).map(ref => characterImageForAI(ref.url)));
      if (sourceMode === 'refine') visualReferences.unshift(await characterImageForAI(svgDataUrl(manualSvg)));
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', { method: 'POST', signal:controller.signal, headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}) }, body: JSON.stringify({ mode: 'character-design', prompt: draft.prompt, characterSourceMode:sourceMode, visualReferences, referenceNames:refs.map(ref=>ref.name), character: { name: draft.characterName, description: draft.description, appearance, profile: draft.profile, view: draft.activeView, expression: draft.activeExpression, pose: draft.activePose } }) });
      const data = await response.json().catch(() => ({}));
      const result = data?.characterDesign || data?.result?.characterDesign || data?.data?.characterDesign || (data?.appearance ? data : null);
      if (!response.ok) throw new Error(data?.error || data?.message || 'Falha ao consultar a IA de personagem.');
      if (!result || typeof result !== 'object') throw new Error(data?.error || 'A IA respondeu, mas o formato retornado não pôde ser aplicado ao construtor. Tente reformular o pedido como aparência, anatomia, figurino, estilo ou proporções.');
      if (!result.appearance || typeof result.appearance !== 'object') result.appearance = {};
      setPortraitMode(false);
      setDraft((current) => ({
        ...current,
        description: result.description || current.description,
        appearance: normalizeAppearance({ ...DEFAULT_APPEARANCE, ...(current.appearance || {}), ...result.appearance }),
        profile: result.profile ? { ...DEFAULT_PROFILE, ...(current.profile || {}), ...result.profile } : current.profile,
        generatedSvg: undefined,
        generatedNotes: Array.isArray(result.notes) ? result.notes : current.generatedNotes,
        animations: current.animations.map(animation => animation.generatedFromCharacter || (animation.generatedFromCharacter === undefined && animation.frames.length > 0 && animation.frames.every(frame=>frame.url.startsWith('data:image/svg+xml'))) ? { ...animation, frames: [] } : animation),
        updatedAt: new Date().toISOString(),
      }));
    } catch (e: any) { setError(e?.name === 'AbortError' ? 'A análise demorou demais. O personagem anterior foi preservado; tente novamente.' : e?.message || 'Falha ao aplicar a IA ao personagem.'); }
    finally { clearTimeout(timeout); setBusy(false); }
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

    <VisualCharacterContext.Provider value={draft}><StudioWorkspace split="default" tools={<div>      <div className="flex gap-2 overflow-x-auto pb-2">{tabs.map((item) => <button key={item.id} onClick={() => { setTab(item.id); setPlaying(false); if (item.id === 'animate') setPortraitMode(false); }} className={`shrink-0 h-11 px-4 rounded-xl border-2 border-black text-xs font-bold ${tab === item.id ? 'bg-black text-white' : 'bg-white'}`}>{item.label}</button>)}</div><section className="bg-white border-r p-4 sm:p-5 space-y-4 xl:overflow-y-auto">
        {tab === 'builder' && <><div className="character-category-bar" aria-label="Partes do personagem">{[
 {id:'style',label:'Estilo',Icon:Shirt},{id:'base',label:'Seres',Icon:PawPrint},{id:'face',label:'Rosto',Icon:CircleUserRound},{id:'body',label:'Corpo',Icon:Shapes},{id:'details',label:'Anatomia',Icon:Dna},{id:'colors',label:'Cores',Icon:Palette},{id:'identity',label:'Ficha',Icon:BookOpen}
].map(({id,label,Icon}) => <button key={id} type="button" aria-pressed={builderSection === id} onClick={() => setBuilderSection(id)} className={builderSection === id ? 'is-selected' : ''}><Icon size={22}/><span>{label}</span></button>)}</div><div className="character-maker-principles"><div><b>ATELIÊ MODULAR</b><span> escolha peças visualmente · refine por cor · ajuste proporções sem perder o preview</span></div><div className="character-maker-principles__modes"><span><Shapes size={13}/> peças</span><span><Palette size={13}/> cor</span><span><SlidersHorizontal size={13}/> ajuste</span></div></div>{builderSection === 'base' && <>          <div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-2"><div><b className="text-lg">Tipo de ser</b><div className="text-xs text-neutral-500">Humano, animal, criatura ou híbrido.</div></div><InfoTip>O tipo de ser define quais estruturas anatômicas fazem sentido. O plano corporal pode ser alterado independentemente para criar híbridos.</InfoTip></div><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Tipo" value={appearance.species || 'human'} options={SPECIES} onChange={chooseSpecies}/><SelectField label="Plano corporal" value={appearance.bodyPlan || 'biped'} options={BODY_PLANS} onChange={(value) => patchAppearance({ bodyPlan: value })}/></div>{appearance.species === 'fish' || appearance.bodyPlan === 'aquatic' ? <div className="mt-4"><div className="text-[9px] font-mono uppercase text-neutral-500 mb-2">MORFOLOGIA AQUÁTICA</div><div className="grid grid-cols-3 gap-2">{AQUATIC_BASES.map((item)=><button key={item.id} type="button" onClick={()=>patchAppearance({species:'fish',bodyPlan:'aquatic',speciesPreset:item.id})} className={`rounded-xl border p-2 text-[10px] font-bold ${appearance.speciesPreset===item.id?'bg-black text-white':'bg-white'}`}>{item.label}</button>)}</div></div>:null}
            {appearance.species === 'hybrid' ? <div className="mt-4 rounded-2xl border-2 border-black p-3 space-y-3">
              <div className="flex items-start justify-between gap-2"><div><b className="text-sm">Misturador de híbridos</b><div className="text-[10px] text-neutral-500">Escolha duas bases. A prévia muda imediatamente enquanto você mistura e depois pode refinar cada parte abaixo.</div></div><InfoTip>Híbridos mais legíveis costumam preservar poucos sinais fortes de cada origem: silhueta, cabeça, superfície, cauda, asas ou locomoção. Não é preciso somar todas as partes.</InfoTip></div>
              <div><div className="text-[9px] font-mono uppercase text-neutral-500 mb-1">BASE A · estrutura</div><div className="flex gap-2 overflow-x-auto pb-1">{HYBRID_BASES.map((preset) => <button key={`a-${preset.id}`} type="button" onClick={() => applyHybridMix(preset.id, appearance.hybridSecondaryPreset || 'cat', appearance.hybridBlend ?? 50)} className={`shrink-0 w-24 rounded-xl border p-2 text-left ${appearance.hybridPrimaryPreset === preset.id ? 'bg-black text-white' : 'bg-white'}`}><AnimalMark kind={preset.id}/><div className="text-[10px] font-bold">{preset.label}</div></button>)}</div></div>
              <div><div className="text-[9px] font-mono uppercase text-neutral-500 mb-1">BASE B · traços adicionados</div><div className="flex gap-2 overflow-x-auto pb-1">{HYBRID_BASES.map((preset) => <button key={`b-${preset.id}`} type="button" onClick={() => applyHybridMix(appearance.hybridPrimaryPreset || 'human', preset.id, appearance.hybridBlend ?? 50)} className={`shrink-0 w-24 rounded-xl border p-2 text-left ${appearance.hybridSecondaryPreset === preset.id ? 'bg-black text-white' : 'bg-white'}`}><AnimalMark kind={preset.id}/><div className="text-[10px] font-bold">{preset.label}</div></button>)}</div></div>
              <label className="block rounded-xl bg-neutral-50 p-3"><div className="flex justify-between gap-2 text-[9px] font-mono uppercase"><span>{PRESETS.find((p) => p.id === appearance.hybridPrimaryPreset)?.label || 'Base A'}</span><b>{appearance.hybridBlend ?? 50}% mistura</b><span>{PRESETS.find((p) => p.id === appearance.hybridSecondaryPreset)?.label || 'Base B'}</span></div><input type="range" min={0} max={100} step={1} value={appearance.hybridBlend ?? 50} onChange={(event) => applyHybridMix(appearance.hybridPrimaryPreset || 'human', appearance.hybridSecondaryPreset || 'cat', Number(event.target.value))} className="mt-2 w-full"/></label>
              <div className="character-hybrid-examples">{HYBRID_QUICK.map((quick) => <button key={quick.label} type="button" onClick={() => applyHybridMix(quick.a, quick.b, quick.blend)} className="character-choice"><img loading="lazy" alt="" src={candidateThumbnail(draft, hybridAppearance(appearance, quick.a, quick.b, quick.blend))}/><span>{quick.label}</span></button>)}</div>
              <div className="grid grid-cols-3 gap-1 text-[9px]"><div className="rounded-lg bg-neutral-100 p-2"><b>Silhueta</b><div>{BODY_PLANS.find((item) => item.id === appearance.bodyPlan)?.label}</div></div><div className="rounded-lg bg-neutral-100 p-2"><b>Superfície</b><div>{SURFACES.find((item) => item.id === appearance.surfaceStyle)?.label}</div></div><div className="rounded-lg bg-neutral-100 p-2"><b>Traço forte</b><div>{appearance.wingStyle !== 'none' ? 'Asas' : appearance.tailStyle !== 'none' ? 'Cauda' : appearance.hornStyle !== 'none' ? 'Chifres' : appearance.muzzleStyle !== 'none' ? 'Focinho/bico' : 'Forma'}</div></div></div>
            </div> : appearance.species === 'anthropomorphic' ? <div className="mt-4 rounded-2xl border-2 border-black p-3 space-y-3">
              <div className="flex items-start justify-between gap-2"><div><b className="text-sm">Antropomorfo</b><div className="text-[10px] text-neutral-500">Base humana com traços animais. Aqui você pode combinar mais de um ser; se escolher apenas um, só ele aparece.</div></div><InfoTip>A estrutura permanece bípede, mas você pode mesclar focinho, orelhas, cauda, asas, texturas e outros sinais de até duas espécies animais.</InfoTip></div>
              <div><div className="text-[9px] font-mono uppercase text-neutral-500 mb-1">Base animal principal</div><div className="flex gap-2 overflow-x-auto pb-1">{presetChoices.map((preset) => <button key={`anthro-a-${preset.id}`} type="button" onClick={() => patchAppearance(anthropomorphicAppearance(appearance, preset.id, appearance.hybridSecondaryPreset && appearance.hybridSecondaryPreset !== 'human' ? appearance.hybridSecondaryPreset : undefined, appearance.hybridBlend ?? 58))} className={`shrink-0 w-24 rounded-xl border p-2 text-left ${(appearance.hybridPrimaryPreset || appearance.speciesPreset) === preset.id ? 'bg-black text-white' : 'bg-white'}`}><AnimalMark kind={preset.id}/><div className="text-[10px] font-bold">{preset.label}</div></button>)}</div></div>
              <div><div className="text-[9px] font-mono uppercase text-neutral-500 mb-1">Traço secundário · opcional</div><div className="flex gap-2 overflow-x-auto pb-1"><button type="button" onClick={() => patchAppearance(anthropomorphicAppearance(appearance, appearance.hybridPrimaryPreset || appearance.speciesPreset || 'cat', undefined, appearance.hybridBlend ?? 58))} className={`shrink-0 w-24 rounded-xl border p-2 text-left ${!appearance.hybridSecondaryPreset || appearance.hybridSecondaryPreset === 'human' ? 'bg-black text-white' : 'bg-white'}`}><div className="text-[10px] font-bold">Só 1 ser</div></button>{presetChoices.filter(preset => preset.id !== (appearance.hybridPrimaryPreset || appearance.speciesPreset)).map((preset) => <button key={`anthro-b-${preset.id}`} type="button" onClick={() => patchAppearance(anthropomorphicAppearance(appearance, appearance.hybridPrimaryPreset || appearance.speciesPreset || 'cat', preset.id, appearance.hybridBlend ?? 58))} className={`shrink-0 w-24 rounded-xl border p-2 text-left ${appearance.hybridSecondaryPreset === preset.id ? 'bg-black text-white' : 'bg-white'}`}><AnimalMark kind={preset.id}/><div className="text-[10px] font-bold">{preset.label}</div></button>)}</div></div>
              <label className="block rounded-xl bg-neutral-50 p-3"><div className="flex justify-between gap-2 text-[9px] font-mono uppercase"><span>{PRESETS.find((p) => p.id === (appearance.hybridPrimaryPreset || appearance.speciesPreset))?.label || 'Base principal'}</span><b>{appearance.hybridBlend ?? 58}%</b><span>{appearance.hybridSecondaryPreset && appearance.hybridSecondaryPreset !== 'human' ? PRESETS.find((p) => p.id === appearance.hybridSecondaryPreset)?.label : 'sem traço extra'}</span></div><input type="range" min={0} max={100} step={1} value={appearance.hybridBlend ?? 58} onChange={(event) => patchAppearance(anthropomorphicAppearance(appearance, appearance.hybridPrimaryPreset || appearance.speciesPreset || 'cat', appearance.hybridSecondaryPreset && appearance.hybridSecondaryPreset !== 'human' ? appearance.hybridSecondaryPreset : undefined, Number(event.target.value)))} className="mt-2 w-full"/></label>
              <div className="rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-600">{motionProfile.note}</div>
            </div> : <><div className="character-preset-grid mt-3 grid grid-cols-3 gap-2">{presetChoices.map((preset) => <button key={preset.id} onClick={() => applyPreset(preset.id)} className={`rounded-xl border p-2 text-left hover:border-black ${appearance.speciesPreset === preset.id ? 'bg-black text-white' : ''}`}><div className="character-preset-preview"><img loading="lazy" alt="" src={candidateThumbnail(draft, { ...DEFAULT_APPEARANCE, ...preset.patch, surfaceColor:preset.patch.surfaceColor || '#D4AD80', outfitStyle:preset.id === 'human' ? DEFAULT_APPEARANCE.outfitStyle : 'none' })}/><AnimalMark kind={preset.id}/></div><b className="text-[11px]">{preset.label}</b><div className={`text-[9px] leading-tight mt-1 ${appearance.speciesPreset === preset.id ? 'text-white/70' : 'text-neutral-500'}`}>{preset.description}</div></button>)}</div><div className="mt-3 rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-600">{motionProfile.note}</div></>}</div>

</>}{builderSection === 'face' && <>
          <div className="rounded-2xl border p-4">
            <div className="flex items-center justify-between"><b className="text-lg">{appearance.species === 'human' ? 'Cabeça e rosto' : 'Rosto e cabeça do animal'}</b><span className="text-[9px] font-mono text-neutral-400">FORMA ≠ PERSONALIDADE</span></div>
            {appearance.species === 'human' ? <div className="mt-3 rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-600">Use <b>matrizes de traços</b> apenas como ponto de partida visual. Depois refine livremente cabelo, olhos, nariz, boca e pele para construir diversidade real sem estereótipos rígidos.</div> : <div className="mt-3 rounded-xl bg-teal-50 p-3 text-[11px] text-teal-950"><b>Rosto animal também é modular.</b><div className="mt-1">Olhos, distância entre olhos, focinho/bico, tamanho do focinho, boca, orelhas e bigodes alteram a prévia real. Você não fica preso ao preset da espécie.</div></div>}
            <div className="mt-3 grid grid-cols-2 gap-3">
              {appearance.species === 'human' ? <SelectField label="Matriz de traços" value={appearance.featureProfile || 'neutral'} options={FEATURE_PROFILES} onChange={applyFeatureProfile} tip="Presets inclusivos para iniciar personagens negros, indígenas, aborígenes, orientais, indianos, latinos, europeus e mistos. Tudo permanece totalmente editável."/> : null}
              <SelectField label="Cabeça" value={appearance.headShape} options={HEADS} onChange={(value) => patchAppearance({ headShape: value })}/>
              <SelectField label="Rosto" value={appearance.faceShape} options={FACES} onChange={(value) => patchAppearance({ faceShape: value })}/>
              <SelectField label="Olhos" value={appearance.eyeStyle} options={EYES} onChange={(value) => patchAppearance({ eyeStyle: value })}/>
              {appearance.species === 'human' ? <SelectField label="Sobrancelha" value={appearance.browStyle} options={BROWS} onChange={(value) => patchAppearance({ browStyle: value })} tip="Pode ser nenhuma."/> : null}
              <SelectField label={appearance.species === 'human' ? 'Nariz' : 'Nariz / trufa'} value={appearance.noseStyle} options={NOSES} onChange={(value) => patchAppearance({ noseStyle: value })}/>
              <SelectField label="Boca" value={appearance.mouthStyle} options={MOUTHS} onChange={(value) => patchAppearance({ mouthStyle: value })}/>
              <SelectField label="Orelha" value={appearance.earStyle} options={EARS} onChange={(value) => patchAppearance({ earStyle: value })}/>
              {appearance.species === 'human' || appearance.species === 'anthropomorphic' ? <SelectField label="Cabelo" value={appearance.hairStyle} options={HAIR} onChange={(value) => patchAppearance({ hairStyle: value })}/> : null}
              <SelectField label="Focinho / bico" value={appearance.muzzleStyle || 'none'} options={MUZZLES} onChange={(value) => patchAppearance({ muzzleStyle: value })}/>
              <label className="block text-[10px] font-mono text-neutral-500 uppercase"><span className="flex items-center gap-1">Bigodes <InfoTip>Bigodes podem ser um traço anatômico ou estilização. Em felinos e roedores ajudam a reconhecer a espécie.</InfoTip></span><button type="button" onClick={() => patchAppearance({ whiskers: !appearance.whiskers })} className={`mt-1 h-11 w-full rounded-xl border text-sm ${appearance.whiskers ? 'bg-black text-white' : 'bg-white'}`}>{appearance.whiskers ? 'SIM' : 'NÃO'}</button></label>
            </div>
            {appearance.species !== 'human' ? <div className="mt-4 space-y-3"><SelectField label="Personalidade visual" value={appearance.animalPersonality || 'neutral'} options={ANIMAL_PERSONALITIES} onChange={(value) => patchAppearance({ animalPersonality:value })} tip="A personalidade visual altera expressão e postura de forma leve. Não define comportamento real da espécie."/><div className="grid gap-2"><RangeField label="Escala da cabeça" value={appearance.animalHeadScale || 1} min={.65} max={1.65} step={.05} onChange={(value) => patchAppearance({ animalHeadScale:value })}/><RangeField label="Tamanho dos olhos" value={appearance.animalEyeScale || appearance.eyeSize || 1} min={.45} max={1.9} step={.05} onChange={(value) => patchAppearance({ animalEyeScale:value, eyeSize:value })}/><RangeField label="Distância entre olhos" value={appearance.eyeSpacing || 1} min={.55} max={1.6} step={.05} onChange={(value) => patchAppearance({ eyeSpacing: value })}/><RangeField label="Tamanho do focinho / bico" value={appearance.muzzleSize || 1} min={.45} max={1.9} step={.05} onChange={(value) => patchAppearance({ muzzleSize: value })}/><RangeField label="Altura do focinho / bico" value={appearance.muzzleHeight || 1} min={.65} max={1.45} step={.05} onChange={(value) => patchAppearance({ muzzleHeight: value })}/><RangeField label="Tamanho da boca" value={appearance.animalMouthScale || appearance.mouthSize || 1} min={.4} max={1.8} step={.05} onChange={(value) => patchAppearance({ animalMouthScale:value, mouthSize:value })}/></div></div> : null}
          </div>

{refinementSliders('face')}</>}{builderSection === 'body' && <>          <div className="rounded-2xl border p-4"><b className="text-lg">Corpo e proporção</b><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Corpo" value={appearance.bodyShape} options={BODY_SHAPES} onChange={(value) => patchAppearance({ bodyShape: value })}/><SelectField label="Estatura" value={appearance.stature || 'average'} options={STATURES} onChange={applyStature}/><SelectField label="Torso" value={appearance.torsoShape} options={TORSOS} onChange={(value) => patchAppearance({ torsoShape: value })}/><SelectField label="Braços" value={appearance.armStyle} options={ARMS} onChange={(value) => patchAppearance({ armStyle: value })}/><SelectField label="Pernas" value={appearance.legStyle} options={LEGS} onChange={(value) => patchAppearance({ legStyle: value })}/><SelectField label="Mãos" value={appearance.handStyle} options={HANDS} onChange={(value) => patchAppearance({ handStyle: value })}/><SelectField label="Pés / patas" value={appearance.footStyle || 'feet'} options={FEET} onChange={(value) => patchAppearance({ footStyle: value })}/><SelectField label="Perfil inclusivo" value={appearance.representationProfile || 'none'} options={REPRESENTATION_PROFILES} onChange={applyRepresentationProfile} tip="Use como ponto de partida e depois refine livremente. A ideia é ampliar repertórios, não padronizar corpos."/><SelectField label="Apoio de mobilidade" value={appearance.mobilityAid || 'none'} options={MOBILITY_AIDS} onChange={applyMobilityAid}/><SelectField label="Apoio visual" value={appearance.visionAid || 'none'} options={VISION_AIDS} onChange={applyVisionAid}/></div>{appearance.mobilityAid === 'wheelchair' ? <div className="mt-4 rounded-2xl border-2 border-black bg-[#F7F7F4] p-3"><div className="flex items-start justify-between gap-3"><div><b className="text-sm">Cadeira integrada à anatomia</b><div className="mt-1 text-[10px] text-neutral-500">A cadeira muda a pose, o centro de gravidade e a silhueta do personagem. Não é um ícone colado no corpo.</div></div><InfoTip>O render usa um rig sentado próprio: quadril apoiado no assento, joelhos flexionados, pés na região do apoio e braços coerentes com o aro/colo.</InfoTip></div><div className="mt-3"><SelectField label="Cadeira" value={appearance.wheelchairStyle || 'active'} options={WHEELCHAIR_STYLES} onChange={(value) => patchAppearance({ wheelchairStyle: value })}/></div><HexField label="Cor da cadeira" value={appearance.wheelchairColor || '#4C5968'} onChange={(value) => patchAppearance({ wheelchairColor: value })}/></div> : null}<div className="mt-3 rounded-2xl bg-neutral-50 p-3 text-[11px] text-neutral-600"><b>Diversidade corporal e acessibilidade</b><div className="mt-1">Combine corpos bem magrinhos ou corpulentos, diferentes estaturas e tecnologias assistivas. Os controles continuam livres para evitar que deficiência, corpo ou identidade virem um único estereótipo visual.</div></div><div className="mt-3 grid gap-2"><RangeField label="Proporção cabeça × corpo" value={appearance.headToBodyRatio} min={2.8} max={7} step={.1} onChange={(value) => patchAppearance({ headToBodyRatio: value })} tip="Números menores aumentam a cabeça em relação ao corpo. É uma convenção de estilização, não um indicador de idade ou personalidade por si só."/><RangeField label="Largura corporal" value={appearance.bodyWidth} min={.65} max={1.45} step={.05} onChange={(value) => patchAppearance({ bodyWidth: value })}/><RangeField label="Ombros" value={appearance.shoulderWidth} min={.65} max={1.45} step={.05} onChange={(value) => patchAppearance({ shoulderWidth: value })}/><RangeField label="Comprimento dos membros" value={appearance.limbLength} min={.65} max={1.45} step={.05} onChange={(value) => patchAppearance({ limbLength: value })}/></div></div>

{refinementSliders('body')}</>}{builderSection === 'details' && <>          <div className="rounded-2xl border p-4"><b className="text-lg">Anatomia especial</b><div className="mt-3 grid grid-cols-2 gap-3"><SelectField label="Superfície" value={appearance.surfaceStyle || 'skin'} options={SURFACES} onChange={(value) => patchAppearance({ surfaceStyle: value })}/><SelectField label="Cauda" value={appearance.tailStyle || 'none'} options={TAILS} onChange={(value) => patchAppearance({ tailStyle: value })}/><SelectField label="Asas" value={appearance.wingStyle || 'none'} options={WINGS} onChange={(value) => patchAppearance({ wingStyle: value })}/><SelectField label="Chifres / antenas" value={appearance.hornStyle || 'none'} options={HORNS} onChange={(value) => patchAppearance({ hornStyle: value })}/></div></div>

{refinementSliders('details')}</>}{builderSection === 'style' && <>
          <div className="rounded-2xl border-2 border-black p-4">
            <div className="flex items-center gap-2"><div><div className="text-[9px] font-mono uppercase tracking-wider text-teal-700">PASSO 1 · quem é a personagem?</div><b className="text-xl">Representação e fase da vida</b></div><InfoTip>Escolha um ponto de partida visual e a fase da vida. Gênero feminino e gênero masculino aplicam apenas um preset inicial totalmente editável; “Prefiro não limitar” não impõe aparência. Bebê, criança, adolescente, adulto e pessoa idosa recebem proporções etárias diferentes, mas todos os controles continuam livres.</InfoTip></div>
            {['human','anthropomorphic','hybrid','fantasy'].includes(appearance.species || 'human') ? <><div className="mt-4"><div className="text-[9px] font-mono uppercase text-neutral-500 mb-2">Identidade / representação</div><div className="grid grid-cols-3 gap-2">{IDENTITY_REPRESENTATIONS.map(item=>{const selectedIdentity=(appearance.identityRepresentation==='lgbtqia'?'open':(appearance.identityRepresentation || 'open'));return <button key={item.id} type="button" aria-pressed={selectedIdentity===item.id} onClick={()=>applyIdentityRepresentation(item.id)} className={`min-h-12 rounded-xl border px-2 py-2 text-[10px] font-bold leading-tight ${selectedIdentity===item.id?'border-teal-700 bg-teal-50 text-teal-900 ring-1 ring-teal-700':'bg-white hover:border-black'}`}>{item.label}</button>})}</div></div><div className="mt-4"><div className="text-[9px] font-mono uppercase text-neutral-500 mb-2">Faixa etária</div><div className="grid grid-cols-3 gap-2">{AGE_GROUPS.map(item=>{const selected=(appearance.ageGroup || 'adult')===item.id; const previewAppearance={...appearance,...AGE_PATCHES[item.id],ageGroup:item.id}; return <button key={item.id} type="button" aria-pressed={selected} onClick={()=>applyAgeGroup(item.id)} className={`rounded-xl border-2 p-1.5 text-left ${selected?'border-teal-700 bg-teal-50 ring-1 ring-teal-700':'border-neutral-200 bg-white hover:border-black'}`}><img alt={`${item.label}`} loading="lazy" src={candidateThumbnail(draft, previewAppearance, false)} className="w-full aspect-[4/3] object-contain rounded-lg bg-[#f7f5f1]"/><b className="block text-[10px] leading-tight mt-1.5">{item.label}</b></button>})}</div></div></> : <div className="mt-4"><div className="text-[9px] font-mono uppercase text-neutral-500 mb-2">Faixa etária</div><div className="grid grid-cols-3 gap-2">{AGE_GROUPS.map(item=><button key={item.id} type="button" onClick={()=>applyAgeGroup(item.id)} className={`min-h-11 rounded-xl border px-2 py-2 text-[10px] font-bold ${(appearance.ageGroup || 'adult')===item.id?'border-teal-700 bg-teal-50 ring-1 ring-teal-700':'bg-white'}`}>{item.label}</button>)}</div></div>}
          </div>
          <div className="rounded-2xl border-2 border-black p-4">
            <div className="flex items-center gap-2"><div><div className="text-[9px] font-mono uppercase tracking-wider text-teal-700">PASSO 2 · escolha a linguagem gráfica</div><b className="text-xl">Estilo comanda o personagem</b></div><InfoTip>A família visual define traço, proporção, acabamento e recomendações iniciais. É um preset, não uma trava: todos os controles permanecem disponíveis.</InfoTip></div>
            <div className="grid grid-cols-3 gap-2 mt-4">{CHARACTER_STYLE_FAMILIES.map(style => { const variant=defaultStyleVariant(style.id); const selected=(appearance.artStyle || 'illustrated')===style.id; const previewAppearance=applyStyleVariant(appearance,variant.id); return <button type="button" key={style.id} aria-pressed={selected} onClick={() => applyGraphicStyle(variant.id)} className={`min-w-0 rounded-xl border-2 p-1.5 text-left transition ${selected ? 'border-teal-700 bg-teal-50 ring-1 ring-teal-700' : 'border-neutral-200 bg-white hover:border-black'}`}><img alt={`${style.label} aplicado ao personagem`} loading="lazy" src={candidateThumbnail(draft, previewAppearance, false)} className="w-full aspect-[4/3] object-contain rounded-lg bg-[#f7f5f1]"/><b className="block text-[11px] leading-tight mt-1.5">{style.label}</b></button>; })}</div>
            {(() => { const family=CHARACTER_STYLE_FAMILIES.find(item=>item.id===(appearance.artStyle || 'illustrated')); return family ? <div className="mt-3 rounded-xl bg-neutral-50 p-3"><div className="text-[9px] font-mono uppercase text-teal-700">Estilo selecionado</div><b className="text-sm">{family.label}</b><p className="mt-1 text-[11px] leading-relaxed text-neutral-600">{family.description}</p><p className="mt-1 text-[9px] font-mono uppercase text-neutral-400">Usos: {family.market}</p></div> : null; })()}
          </div>
          <div className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-lg">Subestilo · {CHARACTER_STYLE_FAMILIES.find(item=>item.id===appearance.artStyle)?.label}</b><p className="text-xs text-neutral-500 mt-1">Escolha uma linguagem específica. A prévia muda imediatamente.</p></div><button type="button" onClick={surpriseWithinStyle} className="shrink-0 min-h-10 rounded-xl bg-black px-3 text-[10px] font-bold text-white flex items-center gap-1"><Sparkles size={13}/> SURPREENDA-ME</button></div><div className="grid grid-cols-3 gap-3 mt-3">{currentStyleVariants.map(variant => { const selected=activeStyleVariant.id===variant.id; const previewAppearance=applyStyleVariant(appearance,variant.id); return <button type="button" key={variant.id} aria-pressed={selected} onClick={()=>applyGraphicStyle(variant.id)} className={`rounded-xl border-2 p-2 text-left ${selected?'border-teal-700 bg-teal-50':'border-neutral-200'}`}><img alt="" loading="lazy" src={candidateThumbnail(draft, previewAppearance, false)} className="aspect-square w-full rounded-lg bg-[#f7f5f1] object-contain"/><b className="block mt-2 text-sm">{variant.label}</b><span className="block mt-1 text-[10px] leading-snug text-neutral-600">{variant.description}</span><span className="mt-2 flex flex-wrap gap-1">{variant.tags.slice(0,3).map(tag=><span key={tag} className="rounded-full bg-neutral-100 px-2 py-1 text-[8px] uppercase">{tag}</span>)}</span></button>; })}</div></div>
          {appearance.artStyle === 'pixel-art' ? <div className="rounded-2xl border-2 border-black p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-lg">Pixel Art Lab · 2D</b><p className="mt-1 text-xs text-neutral-500">O personagem passa a ser construído em blocos/pixels reais, adequado para sprite sheets e jogos 2D. Não é apenas um filtro sobre a ilustração.</p></div><span className="rounded-full bg-teal-50 px-2 py-1 text-[9px] font-bold text-teal-800">LOCAL · SEM API</span></div><div className="mt-3 grid grid-cols-3 gap-3"><SelectField label="Resolução" value={String(appearance.pixelResolution || 32) as any} options={[{id:'16',label:'16×16'},{id:'24',label:'24×24'},{id:'32',label:'32×32'},{id:'48',label:'48×48'},{id:'64',label:'64×64'},{id:'96',label:'96×96'}] as any} onChange={(value:any)=>patchAppearance({pixelResolution:Number(value) as any})}/><SelectField label="Paleta" value={String(appearance.pixelPaletteSize || 16) as any} options={[{id:'4',label:'4 cores'},{id:'8',label:'8 cores'},{id:'16',label:'16 cores'},{id:'24',label:'24 cores'},{id:'32',label:'32 cores'}] as any} onChange={(value:any)=>patchAppearance({pixelPaletteSize:Number(value) as any})}/><label className="character-option-group"><span className="character-option-label">Contorno</span><button type="button" onClick={()=>patchAppearance({pixelOutline:!(appearance.pixelOutline ?? true)})} className={`character-choice ${(appearance.pixelOutline ?? true)?'is-selected':''}`}><span>{(appearance.pixelOutline ?? true)?'Ligado':'Desligado'}</span></button></label></div><div className="mt-3 rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-600"><b>Exportação:</b> o SVG continua editável e pode ser rasterizado depois mantendo bordas duras. Para animação, use a aba <b>SPRITES</b> e gere os frames do estado.</div></div> : null}
          {appearance.artStyle === 'voxel' ? <div className="rounded-2xl border-2 border-black p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-lg">Voxel Lab · 3D</b><p className="mt-1 text-xs text-neutral-500">Volume cúbico projetado em 3D diretamente no navegador. Rotacione a câmera e use o mesmo personagem como base de avatar em blocos.</p></div><span className="rounded-full bg-teal-50 px-2 py-1 text-[9px] font-bold text-teal-800">3D LOCAL · SEM API</span></div><div className="mt-3 grid gap-2"><RangeField label="Volume dos blocos" value={appearance.voxelVolume ?? 1} min={.4} max={2} step={.05} onChange={value=>patchAppearance({voxelVolume:value})}/><RangeField label="Altura do tronco" value={appearance.voxelTorsoHeight ?? 1} min={.5} max={1.8} step={.05} onChange={value=>patchAppearance({voxelTorsoHeight:value})}/><RangeField label="Rotação 360°" value={appearance.voxelYaw ?? 28} min={-180} max={180} step={1} onChange={(value)=>patchAppearance({voxelYaw:value})}/><RangeField label="Inclinação da câmera" value={appearance.voxelPitch ?? 18} min={-35} max={35} step={1} onChange={(value)=>patchAppearance({voxelPitch:value})}/><RangeField label="Zoom da câmera" value={appearance.voxelDepth ?? 1} min={.7} max={1.45} step={.05} onChange={(value)=>patchAppearance({voxelDepth:value})}/></div><div className="mt-3 rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-600"><b>Personalize nas abas:</b> ajuste proporções, rosto, cabelo, orelhas, focinho, cauda, asas, chifres e superfície. As miniaturas e a prévia mostram cada mudança.</div></div> : null}
          <div className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-3"><div><b className="text-lg">Figurino dentro do estilo</b><p className="text-xs text-neutral-500 mt-1">Primeiro aparecem os figurinos mais coerentes com o subestilo; a biblioteca completa continua disponível.</p></div></div>{recommendedOutfits.length ? <div className="grid grid-cols-3 gap-2 mt-3">{recommendedOutfits.map(outfit=>{const option=OUTFITS.find(item=>item.id===outfit);return <button type="button" key={outfit} aria-pressed={appearance.outfitStyle===outfit} onClick={()=>patchAppearance({outfitStyle:outfit})} className={`rounded-xl border p-2 ${appearance.outfitStyle===outfit?'ring-2 ring-teal-700 bg-teal-50':''}`}><img alt="" loading="lazy" src={candidateThumbnail(draft,{outfitStyle:outfit})} className="aspect-square w-full object-contain rounded-lg bg-[#f7f5f1]"/><span className="block text-[9px] font-bold mt-1">{option?.label || outfit}</span></button>})}</div>:null}<div className="mt-3"><SelectField label="Todos os figurinos" value={appearance.outfitStyle} options={OUTFITS} onChange={(value)=>patchAppearance({outfitStyle:value})}/></div></div>
          <div className="character-accessories"><div className="flex items-start justify-between gap-3"><div><b>Acessórios combináveis</b><p>Biblioteca ampliada: rosto, cabeça, pescoço, corpo e mãos. Ative vários itens e ajuste cor, tamanho e posição.</p></div><span className="rounded-full bg-teal-50 px-2 py-1 text-[9px] font-bold text-teal-800">{ACCESSORY_CATALOG.length} opções</span></div><div className="character-accessory-grid">{styleAccessoryCatalog.map(item=><button type="button" key={item.kind} aria-pressed={accessoryItems.some(selected=>selected.kind===item.kind)} onClick={()=>toggleAccessory(item.kind)}><img alt="" loading="lazy" src={candidateThumbnail(draft,{accessories:[{id:'preview',kind:item.kind,color:item.color,scale:1,x:0,y:0}],accessory:'none'},!['backpack','cape','satchel','scarf','necklace','brooch','belt','pouch','bracelet','watch','shoulderpad'].includes(item.kind))}/><span>{item.label}</span><small className="block text-[8px] text-neutral-400">{item.category}</small></button>)}</div>{accessoryItems.map(item=><details key={item.id} open className="character-accessory-card"><summary>{ACCESSORY_CATALOG.find(option=>option.kind===item.kind)?.label}</summary><HexField label={`Cor de ${ACCESSORY_CATALOG.find(option=>option.kind===item.kind)?.label}`} value={item.color} onChange={value=>updateAccessory(item.id,{color:value})}/><RangeField label={`Tamanho de ${ACCESSORY_CATALOG.find(option=>option.kind===item.kind)?.label}`} value={item.scale} min={.5} max={1.5} step={.01} onChange={value=>updateAccessory(item.id,{scale:value})}/><RangeField label={`Posição horizontal de ${ACCESSORY_CATALOG.find(option=>option.kind===item.kind)?.label}`} value={item.x} min={-25} max={25} step={1} onChange={value=>updateAccessory(item.id,{x:value})}/><RangeField label={`Posição vertical de ${ACCESSORY_CATALOG.find(option=>option.kind===item.kind)?.label}`} value={item.y} min={-25} max={25} step={1} onChange={value=>updateAccessory(item.id,{y:value})}/><button type="button" aria-label={`Remover ${item.kind}`} onClick={()=>toggleAccessory(item.kind)}>Remover acessório</button></details>)}</div></>}{builderSection === 'colors'  && <>          <div className="rounded-2xl border p-4"><b className="text-lg">Cores</b><div className="mt-3 grid grid-cols-2 gap-3"><HexField label="Pele / base" value={appearance.skinColor} onChange={(value) => patchAppearance({ skinColor: value, surfaceColor:value })}/><HexField label="Superfície" value={appearance.surfaceColor || appearance.skinColor} onChange={(value) => patchAppearance({ surfaceColor: value })}/><HexField label="Cabelo" value={appearance.hairColor} onChange={(value) => patchAppearance({ hairColor: value })}/><HexField label="Olhos" value={appearance.eyeColor} onChange={(value) => patchAppearance({ eyeColor: value })}/><HexField label="Roupa 1" value={appearance.outfitPrimary} onChange={(value) => patchAppearance({ outfitPrimary: value })}/><HexField label="Roupa 2" value={appearance.outfitSecondary} onChange={(value) => patchAppearance({ outfitSecondary: value })}/><HexField label="Linha" value={appearance.lineColor} onChange={(value) => patchAppearance({ lineColor: value })}/></div></div>
<div className="rounded-2xl border bg-white p-3 space-y-3"><div className="flex items-center justify-between gap-3"><div><b className="text-sm">Contorno global</b><div className="text-[10px] text-neutral-500">Vale para todos os estilos, inclusive line art minimalista.</div></div><button type="button" onClick={()=>patchAppearance({strokeEnabled:appearance.strokeEnabled===false?true:false})} className={`h-9 px-3 rounded-xl border text-[10px] font-bold ${appearance.strokeEnabled===false?'bg-white':'bg-black text-white'}`}>{appearance.strokeEnabled===false?'SEM CONTORNO':'COM CONTORNO'}</button></div>{appearance.strokeEnabled!==false?<RangeField label="Espessura do contorno" value={appearance.strokeWidth || 1.6} min={.25} max={6} step={.05} onChange={(value)=>patchAppearance({strokeWidth:value})}/>:null}</div><div className="character-part-colors">{([{key:'noseColor',label:'Nariz / bico',fallback:'#E9B459'},{key:'mouthColor',label:'Lábios',fallback:'#C9767E'},{key:'earColor',label:'Orelhas',fallback:appearance.skinColor},{key:'wingColor',label:'Asas',fallback:appearance.surfaceColor || appearance.skinColor},{key:'tailColor',label:'Cauda',fallback:appearance.surfaceColor || appearance.skinColor},{key:'hornColor',label:'Chifres / antenas',fallback:'#E6CC9B'}] as const).map(item=><HexField key={item.key} label={item.label} value={appearance[item.key] || item.fallback} onChange={value=>patchAppearance({[item.key]:value})}/>)}</div>{refinementSliders('colors')}</>}{builderSection === 'identity'  && <>          <div className="rounded-2xl border p-4 space-y-3"><div><b className="text-lg">Identidade visual do ser</b><div className="text-xs text-neutral-500">Comece pelo tipo de ser e pelo plano corporal. Depois refine partes e proporções.</div></div><label className="block text-[10px] font-mono text-neutral-500 uppercase">Nome<input value={draft.characterName} onChange={(event) => setDraft((current) => ({ ...current, characterName: event.target.value }))} className="mt-1 h-11 w-full rounded-xl border px-3 text-sm text-black"/></label><label className="block text-[10px] font-mono text-neutral-500 uppercase">Descrição<textarea value={draft.description || ''} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} className="mt-1 min-h-20 w-full rounded-xl border p-3 text-sm text-black" placeholder="Quem é, universo, referências, comportamento..."/></label></div></>}</>}

        {tab === 'profile' && <><div className="rounded-2xl border p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><b className="text-lg">Ficha do personagem</b><div className="text-xs text-neutral-500">Registre intenção e contexto, não “psicologia da forma”.</div></div><button onClick={() => void generateSheetAi()} disabled={sheetBusy} className="h-9 px-3 rounded-xl bg-black text-white text-[10px] font-bold flex items-center gap-2">{sheetBusy ? <Loader2 size={13} className="animate-spin"/> : <Sparkles size={13}/>} COMPLETAR COM IA</button></div>{[['Papel / função','role'],['Faixa etária / estágio de vida','ageBand'],['Personalidade','personality'],['Motivação','motivation'],['História','backstory'],['Intenção de silhueta','silhouetteIntent'],['Justificativa de shape language','shapeLanguageRationale'],['Justificativa das proporções','proportionRationale'],['Justificativa de cor','colorRationale'],['Justificativa de figurino','costumeRationale']].map(([label,key]) => <label key={key} className="block text-[10px] font-mono text-neutral-500 uppercase">{label}<textarea value={(profile as any)[key] || ''} onChange={(event) => patchProfile({ [key]: event.target.value } as Partial<CharacterProfile>)} className="mt-1 min-h-16 w-full rounded-xl border p-3 text-sm text-black"/></label>)}</div><div className="rounded-2xl border p-4"><b>Referências de concept art</b><div className="mt-2 space-y-2">{REFERENCES.map((reference) => <div key={reference} className="text-[10px] leading-relaxed text-neutral-600">• {reference}</div>)}</div></div></>}

        {tab === 'poses' && <div className="space-y-4"><div className="character-pose-editor"><b>Direção da pose</b><button type="button" aria-pressed={posePlaying} onClick={()=>setPosePlaying(value=>!value)}>{posePlaying?'Pausar movimento':'Reproduzir movimento'}</button><RangeField label="Fase do movimento" value={draft.posePhase ?? .125} min={0} max={1} step={.01} onChange={value=>{setPosePlaying(false);setDraft(current=>({...current,posePhase:value,generatedSvg:undefined}));}}/>{visiblePoseAdjustmentFields.map(item=><RangeField key={item.key} label={item.label} value={draft.poseAdjustments?.[draft.activePose || 'neutral']?.[item.key] || 0} min={item.key==='lean'||item.key==='headTilt'?-30:-90} max={item.key==='lean'||item.key==='headTilt'?30:90} step={1} onChange={value=>setDraft(current=>({...current,poseAdjustments:{...current.poseAdjustments,[current.activePose || 'neutral']:{...current.poseAdjustments?.[current.activePose || 'neutral'],[item.key]:value}},generatedSvg:undefined}))}/>) }<button type="button" onClick={()=>setDraft(current=>({...current,poseAdjustments:{...current.poseAdjustments,[current.activePose || 'neutral']:{}},generatedSvg:undefined}))}>Restaurar articulações desta pose</button></div><div className="rounded-2xl border p-4"><b className="text-lg">Turnaround</b><div className="mt-1 text-xs text-neutral-500">Frente, 3/4, perfil e costas. Para animais, a leitura se adapta ao plano corporal.</div><div className="mt-3 grid grid-cols-3 gap-2">{VIEWS.map((view) => <button key={view} onClick={() => setDraft((current) => ({ ...current, activeView: view, generatedSvg: undefined }))} className={`rounded-xl border p-2 ${draft.activeView === view ? 'ring-2 ring-black' : ''}`}><div className="aspect-[3/4] bg-neutral-50 rounded-lg overflow-hidden"><img src={svgDataUrl(buildCharacterSvg(draft, view, draft.activeExpression || 'neutral', 'neutral'))} className="w-full h-full object-contain"/></div><div className="mt-1 text-[10px] font-bold uppercase">{view === 'front' ? 'Frente' : view === 'three-quarter' ? '3/4' : view === 'side' ? 'Perfil' : 'Costas'}</div></button>)}</div></div><div className="rounded-2xl border p-4"><b className="text-lg">Expressões</b><div className="mt-3 grid grid-cols-3 gap-2">{EXPRESSIONS.map((expression) => <button key={expression} onClick={() => setDraft((current) => ({ ...current, activeExpression: expression, generatedSvg: undefined }))} className={`rounded-xl border p-2 ${draft.activeExpression === expression ? 'ring-2 ring-black' : ''}`}><div className="aspect-square bg-neutral-50 rounded-full overflow-hidden"><img src={svgDataUrl(buildCharacterSvg({ ...draft, generatedSvg: undefined }, 'front', expression, 'neutral'))} className="w-full h-full object-contain"/></div><div className="mt-1 text-[9px] font-bold uppercase">{EXPRESSION_LABELS[expression]}</div></button>)}</div></div><div className="rounded-2xl border p-4"><b className="text-lg">Poses articuladas</b><div className="mt-2 rounded-xl bg-neutral-50 p-3 text-[11px] text-neutral-600">{motionProfile.note}</div><div className="mt-3 grid grid-cols-3 gap-2">{availablePoses.map((pose) => <button key={pose.kind} onClick={() => { setPlaying(false); setPortraitMode(false); setFrameIndex(0); setDraft((current) => ({ ...current, activePose: pose.kind, posePhase:pose.kind==='jump'?.5:.125, generatedSvg: undefined })); }} className={`rounded-xl border p-2 ${draft.activePose === pose.kind ? 'ring-2 ring-black' : ''}`}><div className="aspect-[4/3] bg-neutral-50 rounded-lg overflow-hidden"><img src={svgDataUrl(buildCharacterSvg(draft, POSE_VIEW_HINTS[pose.kind] || 'three-quarter', draft.activeExpression || 'neutral', pose.kind))} className="w-full h-full object-contain"/></div><div className="mt-1 text-[10px] font-bold">{pose.label}</div></button>)}</div></div></div>}

        {tab === 'animate' && <><div className="rounded-2xl border p-4"><div className="flex items-start justify-between gap-2"><div><b className="text-lg">Animações locais / sprites</b><div className="text-xs text-neutral-500">Estados para jogos, microinterações e personagens do projeto.</div></div><select defaultValue="" onChange={(event) => { if (event.target.value) addAnimation(event.target.value as SpriteAnimationKind); event.currentTarget.value = ''; }} className="h-9 rounded-xl border px-2 text-xs"><option value="" disabled>+ ESTADO</option>{availableAnimationKinds.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div><div className="mt-3 flex gap-2 overflow-x-auto">{draft.animations.map((animation) => <button key={animation.id} onClick={() => { setSelectedAnimationId(animation.id); setFrameIndex(0); }} className={`shrink-0 h-9 px-3 rounded-xl border text-[10px] font-bold ${animation.id === activeAnimation.id ? 'bg-black text-white' : ''}`}>{animation.name}</button>)}</div><div className="mt-3 grid grid-cols-3 gap-2"><label className="text-[9px] font-mono uppercase text-neutral-500">FPS<input type="number" min={1} max={30} value={activeAnimation.fps} onChange={(event) => patchAnimation({ fps: Number(event.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2 text-sm"/></label><label className="text-[9px] font-mono uppercase text-neutral-500">Loop<select value={activeAnimation.loop ? 'yes' : 'no'} onChange={(event) => patchAnimation({ loop: event.target.value === 'yes' })} className="mt-1 h-9 w-full rounded-lg border"><option value="yes">Sim</option><option value="no">Não</option></select></label><SelectField label="Motion" value={activeAnimation.motion} options={availableMotions} onChange={(value) => patchAnimation({ motion: value })}/></div><button onClick={createFrames} className="mt-3 h-11 w-full rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-2"><Sparkles size={14}/> GERAR FRAMES DO ESTADO</button></div><div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-2"><div><b>Frames próprios</b><div className="text-xs text-neutral-500">Use imagens do projeto ou envie arquivos.</div></div><button onClick={() => fileRef.current?.click()} className="h-9 px-3 rounded-xl border text-[10px] font-bold flex items-center gap-1"><Upload size={13}/> UPLOAD</button></div><input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { if (event.target.files) void uploadFrames(event.target.files); }}/><div className="mt-3 grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">{availableAssets.map((asset) => <button key={asset.id} onClick={() => addAssetFrame(asset)} className="rounded-xl border overflow-hidden text-left"><div className="aspect-square bg-neutral-100"><img src={asset.url} className="w-full h-full object-contain"/></div><div className="p-2 text-[9px] font-bold truncate">+ {asset.name}</div></button>)}</div>{uploading ? <div className="mt-2 text-xs">Enviando...</div> : null}</div><div className="rounded-2xl border p-4"><b>Timeline</b><div className="mt-3 space-y-2">{activeAnimation.frames.map((frame, index) => <div key={frame.id} className="flex items-center gap-2 rounded-xl border p-2"><button onClick={() => { setFrameIndex(index); setPlaying(false); }} className={`h-14 w-14 rounded-lg overflow-hidden border ${frameIndex === index ? 'ring-2 ring-black' : ''}`}><img src={frame.url} className="w-full h-full object-contain"/></button><div className="min-w-0 flex-1"><div className="text-[10px] font-bold truncate">{index + 1}. {frame.name}</div><input type="number" min={30} max={5000} value={frame.durationMs || 125} onChange={(event) => patchAnimation({ frames: activeAnimation.frames.map((item) => item.id === frame.id ? { ...item, durationMs: Number(event.target.value) } : item) })} className="mt-1 h-7 w-24 rounded border px-1 text-[10px]"/></div><button onClick={() => patchAnimation({ frames: activeAnimation.frames.filter((item) => item.id !== frame.id) })} className="h-8 w-8 rounded-lg border text-red-600"><Trash2 size={13} className="mx-auto"/></button></div>)}{!activeAnimation.frames.length ? <div className="rounded-xl border border-dashed p-4 text-center text-xs text-neutral-400">Clique em GERAR FRAMES DO ESTADO para testar a animação imediatamente.</div> : null}</div></div></>}

        {tab === 'ai' && <div className="rounded-2xl border-2 border-black p-4 space-y-3"><div className="flex items-center gap-2"><WandSparkles size={16}/><b className="text-lg">IA de direção de arte</b></div><div className="rounded-xl bg-teal-50 p-3 text-sm text-teal-950"><b>Agora a IA não desenha um SVG solto.</b><div className="mt-1 text-xs">Ela interpreta seu pedido e suas referências, escolhe estilo, anatomia, proporções, figurino, acessórios e cores; o renderizador modular produz a prévia e o mesmo SVG que será exportado. Isso evita o erro “SVG inválido”.</div></div><label className="block text-sm">O que a IA deve fazer<select aria-label="Modo de criação com IA" value={draft.aiSourceMode || 'refine'} disabled={busy || uploading} onChange={e=>setDraft(current=>({...current,aiSourceMode:e.target.value as 'refine'|'reference'|'new'}))} className="mt-1 w-full min-w-0 rounded-xl border p-3"><option value="refine">Refinar o personagem atual</option><option value="reference">Interpretar meus desenhos como referência</option><option value="new">Criar uma direção de arte do zero</option></select></label><div className="rounded-xl border p-3 space-y-3"><b className="text-sm">Referências visuais · até 3</b><input ref={referenceFileRef} type="file" accept="image/*,.svg" className="hidden" onChange={e=>{const file=e.target.files?.[0];if(file)void uploadAiReference(file);e.target.value='';}}/><button disabled={!canEdit || busy || uploading || (draft.aiReferences || []).length >= 3} onClick={()=>referenceFileRef.current?.click()} className="w-full min-h-11 rounded-xl border text-sm">{uploading ? 'Preparando desenho…' : 'Enviar desenho ou imagem'}</button><div className="grid grid-cols-3 gap-2">{(draft.aiReferences || []).map(ref=><div key={ref.id} className="min-w-0 rounded-lg border p-1"><img alt={ref.name} src={ref.url} className="aspect-square w-full object-contain"/><span className="block truncate text-xs">{ref.name}</span><button aria-label={`Remover referência ${ref.name}`} disabled={busy || uploading} onClick={()=>setDraft(current=>({...current,aiReferences:current.aiReferences?.filter(item=>item.id!==ref.id)}))} className="min-h-9 w-full text-xs">Remover</button></div>)}</div>{availableAssets.length > 0 && <label className="block text-sm">Usar desenho do projeto<select aria-label="Referência do projeto" value="" disabled={busy || uploading || (draft.aiReferences || []).length >= 3} className="mt-1 w-full min-w-0 rounded-xl border p-2" onChange={e=>{const asset=availableAssets.find(a=>a.id===e.target.value);if(asset)setDraft(current=>({...current,aiSourceMode:'reference',aiReferences:[...(current.aiReferences || []).filter(r=>r.id!==asset.id),{id:asset.id,name:asset.name,url:asset.url}].slice(0,3)}));}}><option value="">Selecionar imagem ou desenho…</option>{availableAssets.map(asset=><option key={asset.id} value={asset.id}>{asset.name}</option>)}</select></label>}</div><div className="flex gap-2 items-start"><textarea value={draft.prompt || ''} onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))} className="min-h-32 min-w-0 flex-1 rounded-xl border p-3 text-sm" placeholder="Ex.: mangá shoujo editorial, olhos grandes mas não infantis, cabelos longos fluidos, figurino de moda contemporânea, acessórios delicados; mantenha a anatomia atual e gere variação coerente dentro do estilo..."/><VoiceDictationButton onText={(text) => setDraft((current) => ({ ...current, prompt: `${current.prompt || ''}${current.prompt ? ' ' : ''}${text}` }))}/></div><button onClick={() => void generateDesignAi()} disabled={busy || uploading || !canEdit} className="h-12 w-full rounded-xl bg-black text-white text-xs font-bold flex items-center justify-center gap-2">{busy ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14}/>} APLICAR IA AO CONSTRUTOR</button>{draft.generatedNotes?.length ? <div className="rounded-xl bg-neutral-50 p-3"><b className="text-xs">Decisões aplicadas</b>{draft.generatedNotes.map((note) => <div key={note} className="text-[10px] text-neutral-600 mt-1">• {note}</div>)}</div> : null}</div>}

        {error ? <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</div> : null}
      </section></div>}>

      <section className="character-live-preview min-h-[55vh] xl:min-h-0 overflow-auto p-3 sm:p-5 flex flex-col items-stretch gap-4">
        <div className="w-full flex items-center justify-between gap-3"><div><div className="text-[9px] font-mono uppercase text-neutral-500">Prévia viva · {activeStyleVariant.label} · {SPECIES.find((item) => item.id === appearance.species)?.label || 'Ser'} · {BODY_PLANS.find((item) => item.id === appearance.bodyPlan)?.label || 'plano corporal'}{appearance.identityRepresentation && appearance.identityRepresentation !== 'open' ? ` · ${IDENTITY_LABELS[appearance.identityRepresentation]}` : ''}{appearance.ageGroup ? ` · ${AGE_LABELS[appearance.ageGroup]}` : ''}</div><b className="text-xl">{draft.characterName}</b></div><div className="flex gap-2">{tab === 'animate' && <button onClick={() => setPlaying((value) => !value)} className="h-10 px-3 rounded-xl bg-black text-white text-[10px] font-bold flex items-center gap-2">{playing ? <Pause size={14}/> : <Play size={14}/>} {playing ? 'PAUSAR' : 'PLAY'}</button>}<button onClick={downloadSvg} className="h-10 px-3 rounded-xl border bg-white text-[10px] font-bold flex items-center gap-2"><Download size={14}/> SVG</button></div></div>
        <div className="character-view-options"><button type="button" aria-pressed={!portraitMode} onClick={() => setPortraitMode(false)}>Corpo inteiro</button>{appearance.bodyPlan === 'biped' && !['pixel-art','voxel'].includes(appearance.artStyle || '') && <button type="button" aria-pressed={portraitMode} onClick={() => setPortraitMode(true)}>Retrato</button>}</div>
        <div className="character-stage w-full rounded-3xl border bg-white flex items-center justify-center p-4 sm:p-6" style={{ background: draft.background }}><motion.div {...animationMotionProps(activeAnimation.frames.length ? 'none' : activeAnimation.motion, tab === 'animate' && playing)} className="flex items-center justify-center max-w-full max-h-full"><img src={portraitMode && !draft.generatedSvg && appearance.bodyPlan === 'biped' && !['pixel-art','voxel'].includes(appearance.artStyle || '') ? svgDataUrl(illustrateCharacter({ ...draft, appearance }, draft.activeView, draft.activeExpression, 'neutral', 0, true)) : previewUrl} alt={draft.characterName} className="max-w-full max-h-[520px] object-contain" style={{ imageRendering: draft.pixelated || appearance.artStyle === 'pixel-art' ? 'pixelated' : 'auto' }}/></motion.div></div>
        {tab === 'animate' && activeAnimation.frames.length ? <div className="w-full rounded-2xl border bg-white p-3"><div className="flex items-center gap-2"><b className="text-sm">{activeAnimation.name}</b><span className="text-[10px] text-neutral-500">· {activeAnimation.frames.length} frames · {activeAnimation.fps} fps</span></div><div className="mt-2 flex gap-1 overflow-x-auto">{activeAnimation.frames.map((frame, index) => <button key={frame.id} onClick={() => { setFrameIndex(index); setPlaying(false); }} className={`shrink-0 h-16 w-16 rounded-lg border overflow-hidden ${index === frameIndex ? 'ring-2 ring-black' : ''}`}><img src={frame.url} className="w-full h-full object-contain"/></button>)}</div></div> : null}
      </section>
    </StudioWorkspace></VisualCharacterContext.Provider>
  </div>;
}

