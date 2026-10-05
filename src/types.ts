export type Phase = 'Ideação' | 'Inambulação' | 'Instauração' | 'Inspeção' | 'Implementação';

export interface Project {
  id: string;
  name: string;
  problem: string;
  community: string;
  ods: string;
  projectType: string;
  createdAt: string;
  activePhase: Phase;
}

export interface ProjectWorkspace {
  project: Project;
  nodes: ThoughtNode[];
  updatedAt: string;
}

export type CollaborationPermission = 'view' | 'comment' | 'edit';

export type CollaboratorLabel = 'colega' | 'comunidade' | 'cliente' | 'especialista' | 'outro';

export interface ProjectCollaborator {
  id: string;
  ownerId: string;
  projectId: string;
  collaboratorId?: string;
  collaboratorEmail: string;
  collaboratorName?: string;
  permission: CollaborationPermission;
  label: CollaboratorLabel;
  status: 'pending' | 'accepted';
  createdAt: string;
}

export interface SharedProjectSummary {
  collaborationId: string;
  ownerId: string;
  ownerName: string;
  projectId: string;
  projectName: string;
  projectProblem: string;
  activePhase: Phase;
  permission: CollaborationPermission;
  label: CollaboratorLabel;
  updatedAt: string;
  nodeCount: number;
}

export interface AdminProjectSummary {
  ownerId: string;
  ownerName: string;
  ownerRole: 'advisor' | 'partner';
  partnerType?: PartnerType;
  institution?: string;
  projectId: string;
  projectName: string;
  projectProblem: string;
  activePhase: Phase;
  updatedAt: string;
  nodeCount: number;
}

export type ThoughtType = 'core' | 'question' | 'user-thought' | 'insight' | 'canvas-image' | 'drawing-sheet' | 'interactive-lab' | 'wireframe-board' | 'design-system' | 'visual-identity' | 'video-board' | 'ux-writing' | 'sound-board' | 'hardware-board' | 'sprite-character' | 'game-design' | 'api-connections' | 'data-story';

export type DrawingElementType =
  | 'brush'
  | 'line'
  | 'rectangle'
  | 'rounded-rectangle'
  | 'ellipse'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star'
  | 'arrow'
  | 'cube'
  | 'sphere'
  | 'cylinder'
  | 'cone'
  | 'pyramid'
  | 'text'
  | 'image';


export type InteractiveEngine = 'p5' | 'three' | 'gsap' | 'anime' | 'matter' | 'svg';

export type InteractiveMode = 'auto' | 'pointer' | 'hover' | 'scroll';

export type InteractiveEffect = 'network' | 'breathe' | 'draw' | 'wave' | 'explode' | 'drift';

export type InteractiveIntensity = 'subtle' | 'medium' | 'strong';

export interface InteractiveAssetProfile {
  palette: string[];
  counts: Record<string, number>;
  sourceType: 'svg' | 'image';
}

export interface InteractiveAsset {
  url: string;
  name: string;
  contentType: string;
  kind: 'image' | 'svg';
  profile?: InteractiveAssetProfile;
  credit?: {title:string; author:string; license:string; licenseUrl:string; sourceUrl:string; provider:string};
}

export interface InteractiveDocument {
  engine: InteractiveEngine;
  title: string;
  prompt: string;
  code: string;
  asset?: InteractiveAsset;
  interactionMode?: InteractiveMode;
  effectPreset?: InteractiveEffect;
  libraryEffect?:string;
  intensity?: InteractiveIntensity;
  preserveBrand?: boolean;
  characterReference?: { nodeId: string; name: string; appearance?: CharacterAppearance; views: Array<{view: CharacterView; url: string}> };
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>;
  revisions?: Array<{ code: string; title: string; engine: InteractiveEngine }>;
}

export interface DrawingPoint {
  x: number;
  y: number;
  /** Pressão normalizada do stylus/ponteiro (0–1). */
  pressure?: number;
  /** Timestamp do ponto para suavização e futuras animações. */
  t?: number;
}

export interface DrawingElement {
  imageUrl?:string; imageName?:string; hidden?:boolean;
  imageCredit?: {title:string; author:string; license:string; licenseUrl:string; sourceUrl:string; provider:string};
  id: string;
  type: DrawingElementType;
  stroke: string;
  fill?: string;
  strokeWidth: number;
  opacity?: number;
  points?: DrawingPoint[];
  x?: number;
  y?: number;
  x2?: number;
  y2?: number;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
}

export interface DrawingDocument {
  width: number;
  height: number;
  background: string;
  elements: DrawingElement[];
}


export type WireframeDevicePreset = 'mobile' | 'tablet' | 'desktop' | 'watch' | 'custom';
export type WireframeDirection = 'column' | 'row';
export type WireframeAlign = 'start' | 'center' | 'end' | 'stretch';
export type WireframeBlockType = 'text' | 'button' | 'input' | 'image' | 'card' | 'navbar' | 'nav-item' | 'list-item' | 'icon' | 'avatar' | 'checkbox' | 'toggle' | 'divider' | 'section' | 'spacer';

export interface WireframeBlock {
  fontFamily?: string; fontSize?: number; fontWeight?: number;
  id: string;
  type: WireframeBlockType;
  label: string;
  width?: 'fill' | 'hug' | number;
  height?: 'hug' | number;
  padding?: number;
  radius?: number;
  background?: string;
  color?: string;
  componentName?: string;
  isComponent?: boolean;
  margin?: number;
  gap?: number;
  items?: string[];
  href?: string;
  interaction?: 'none' | 'navigate' | 'modal' | 'toggle' | 'link';
  interactionTarget?: string;
  gridColumnSpan?: number;
  alignSelf?: 'auto' | 'start' | 'center' | 'end' | 'stretch';
}


export interface WireframeFrame {
  id: string;
  name: string;
  preset: WireframeDevicePreset;
  width: number;
  height: number;
  direction: WireframeDirection;
  gap: number;
  padding: number;
  align: WireframeAlign;
  justify?: 'start' | 'center' | 'end' | 'between';
  layoutMode?: 'flex' | 'grid';
  gridColumns?: number;
  columnGap?: number;
  rowGap?: number;
  margin?: number;
  background: string;
  blocks: WireframeBlock[];
}

export interface WireframeDocument {
  frames: WireframeFrame[];
  activeFrameId?: string;
  componentLibrary?: WireframeBlock[];
}

export interface DesignColorToken {
  id: string;
  name: string;
  value: string;
  role?: 'brand' | 'accent' | 'surface' | 'text' | 'success' | 'warning' | 'danger' | 'custom';
}

export interface DesignTypeToken {
  id: string;
  name: string;
  family: string;
  size: number;
  weight: number;
  lineHeight: number;
  letterSpacing?: number;
  wordSpacing?: number;
  familyRole?: 'display' | 'text' | 'notes';
}


export interface DesignFontFamilies {
  display: string;
  text: string;
  notes: string;
}

export interface DesignLayoutSpacing {
  pagePadding: number;
  sectionGap: number;
  componentGap: number;
  controlHeight: number;
}

export interface DesignSystemDocument {
  name: string;
  colors: DesignColorToken[];
  typography: DesignTypeToken[];
  spacing: number[];
  radii: number[];
  primaryFont: string;
  fontFamilies?: DesignFontFamilies;
  layoutSpacing?: DesignLayoutSpacing;
  updatedAt?: string;
}

export type VideoFormatPreset = 'reel' | 'story' | 'tiktok' | 'square' | 'feed' | 'youtube' | 'facebook' | 'linkedin' | 'custom';

export type VideoMediaKind = 'image' | 'video';
export type VideoTransition = 'cut' | 'fade' | 'slide' | 'zoom';

export interface VideoMediaItem {
  id: string;
  kind: VideoMediaKind;
  url: string;
  name: string;
  source?: 'project' | 'upload' | 'url';
  duration?: number;
  thumbnailUrl?: string;
}

export interface VideoTimelineItem {
  id: string;
  mediaId: string;
  kind: VideoMediaKind | 'color';
  url: string;
  name: string;
  duration: number;
  transition?: VideoTransition;
  fit?: 'cover' | 'contain';
  scale?: number; x?: number; y?: number;
  caption?: string;
  transitionDuration?: number;
  trimStart?: number;
  muted?: boolean;
  volume?: number;
  background?: string;
  backgroundStyle?: 'plain' | 'gradient' | 'particles';
  motion?: 'none' | 'pan-left' | 'pan-right' | 'zoom-in' | 'zoom-out' | 'float' | 'pulse' | 'rotate';
  effect?: 'none' | 'grayscale' | 'warm' | 'cool' | 'contrast' | 'blur';
}

export interface VideoTextLayer {
  id: string; text: string; x: number; y: number; width: number;
  fontSize: number; fontFamily: string; color: string; background?: string;
  align: 'left' | 'center' | 'right'; bold: boolean; start: number; end: number;
  animation?: 'none' | 'fade' | 'pop' | 'float';
}

export interface VideoAudioTrack {
  id: string; url: string; name: string; start: number; end: number; offset: number; volume: number;
}

export interface VideoOverlay {
  id: string;
  mediaId: string;
  kind: 'image';
  url: string;
  name: string;
  x: number;
  y: number;
  width: number;
  opacity: number;
  start: number;
  end: number;
  animation?: 'none' | 'fade' | 'pop' | 'float' | 'spin';
}

export interface VideoDocument {
  defaultFontFamily?: string;
  title: string;
  subtitle?: string;
  format: VideoFormatPreset;
  width: number;
  height: number;
  duration: number;
  background: string;
  accent: string;
  textColor?: string;
  sourceUrl?: string;
  sourceName?: string;
  generatedUrl?: string;
  prompt?: string;
  media?: VideoMediaItem[];
  timeline?: VideoTimelineItem[];
  aiPlan?: string[];
  overlays?: VideoOverlay[];
  texts?: VideoTextLayer[];
  audioTracks?: VideoAudioTrack[];
  exportWidth?: number;
}


export type UXWritingTone = 'clear' | 'warm' | 'direct' | 'institutional' | 'playful';

export interface UXWritingTranslation {
  locale: string;
  label: string;
  text: string;
  status?: 'draft' | 'reviewed';
}

export interface UXWritingEntry {
  id: string;
  key: string;
  screen: string;
  context: string;
  sourceText: string;
  accessibleText?: string;
  librasGuide?: string;
  librasVideoUrl?: string;
  tone: UXWritingTone;
  translations: UXWritingTranslation[];
  notes?: string;
}

export interface UXWritingDocument {
  title: string;
  sourceLocale: string;
  targetLocales: string[];
  entries: UXWritingEntry[];
  glossary: string[];
  updatedAt?: string;
}

export type SoundPreset = 'click' | 'pop' | 'success' | 'error' | 'whoosh' | 'notification';

export interface SoundCue {
  id: string;
  name: string;
  source: 'synth' | 'upload' | 'url';
  preset?: SoundPreset;
  url?: string;
  trigger?: string;
  volume: number;
  duration: number;
  frequency: number;
}

export interface SoundDocument {
  title: string;
  cues: SoundCue[];
  masterVolume: number;
  updatedAt?: string;
}

export type HardwareSource = 'gyro-alpha' | 'gyro-beta' | 'gyro-gamma' | 'motion-x' | 'motion-y' | 'motion-z' | 'serial';
export type HardwareTarget = 'rotate' | 'move-x' | 'move-y' | 'scale' | 'opacity' | 'trigger';

export interface HardwareMapping {
  id: string;
  name: string;
  source: HardwareSource;
  target: HardwareTarget;
  targetNodeId?: string;
  inputMin: number;
  inputMax: number;
  outputMin: number;
  outputMax: number;
  invert?: boolean;
}

export interface HardwareDocument {
  title: string;
  baudRate: number;
  protocol: 'device-sensors' | 'serial' | 'mixed';
  mappings: HardwareMapping[];
  notes?: string;
  updatedAt?: string;
}


export type SpriteAnimationKind = 'idle' | 'walk' | 'run' | 'jump' | 'attack' | 'hurt' | 'custom';
export type SpriteMotionPreset = 'none' | 'bob' | 'bounce' | 'shake' | 'pulse' | 'squash';
export type CharacterView = 'front' | 'three-quarter' | 'side' | 'back';
export type CharacterExpression = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'determined' | 'winking' | 'laughing' | 'worried' | 'calm';
export type CharacterPoseKind = 'neutral' | 'wave' | 'walk' | 'run' | 'jump' | 'sit' | 'action';

export interface SpriteFrame {
  id: string;
  name: string;
  url: string;
  sourceNodeId?: string;
  durationMs?: number;
}

export interface SpriteAnimation {
  id: string;
  name: string;
  kind: SpriteAnimationKind;
  fps: number;
  loop: boolean;
  motion: SpriteMotionPreset;
  frames: SpriteFrame[];
  generatedFromCharacter?: boolean;
}

export type CharacterSpecies = 'human' | 'anthropomorphic' | 'quadruped' | 'bird' | 'reptile' | 'amphibian' | 'fish' | 'arthropod' | 'fantasy' | 'hybrid';
export type CharacterBodyPlan = 'biped' | 'quadruped' | 'avian' | 'serpentine' | 'aquatic' | 'six-limbed' | 'eight-limbed' | 'custom';
export type CharacterMuzzleStyle = 'none' | 'short' | 'long' | 'round' | 'beak-small' | 'beak-long' | 'beak-hooked';
export type CharacterTailStyle = 'none' | 'short' | 'long' | 'fluffy' | 'curled' | 'reptile' | 'fish';
export type CharacterWingStyle = 'none' | 'feather' | 'bat' | 'fin';
export type CharacterHornStyle = 'none' | 'short' | 'long' | 'antlers' | 'antennae';
export type CharacterSurfaceStyle = 'skin' | 'fur-short' | 'fur-long' | 'feathers' | 'scales' | 'shell' | 'chitin';
export type CharacterFootStyle = 'feet' | 'paws' | 'hooves' | 'claws' | 'talons' | 'fins';

export type CharacterAccessoryKind = 'glasses' | 'sunglasses' | 'goggles' | 'monocle' | 'hat' | 'cap' | 'beanie' | 'hood' | 'bandana' | 'headband' | 'hairclip' | 'flower' | 'tiara' | 'scarf' | 'cape' | 'backpack' | 'satchel' | 'headphones' | 'earrings' | 'necklace' | 'brooch' | 'bow' | 'crown' | 'bracelet' | 'watch' | 'belt' | 'pouch' | 'shoulderpad' | 'mask';
export interface CharacterAccessory { id:string; kind:CharacterAccessoryKind; color:string; scale:number; x:number; y:number; }
export interface CharacterPoseAdjustment { al?:number; ar?:number; el?:number; er?:number; ll?:number; lr?:number; kl?:number; kr?:number; lean?:number; headTilt?:number; }
export interface CharacterAppearance {
  artStyle?: 'illustrated' | 'cartoon' | 'anime' | 'manga' | 'comic' | 'storybook' | 'watercolor' | 'pencil' | 'ink' | 'chibi' | 'engraving' | 'lineart' | 'realism' | 'psychedelic' | 'steampunk';
  /** Variação dentro da família visual. Ex.: manga-shoujo, engraving-woodcut. */
  styleVariant?: string;
  accessories?: CharacterAccessory[];
  headWidth?:number; headHeight?:number; eyeSize?:number; eyeSpacing?:number; eyeHeight?:number; irisScale?:number;
  browSize?:number; browHeight?:number; noseSize?:number; noseHeight?:number; mouthSize?:number; mouthHeight?:number;
  earSize?:number; earAngle?:number; hairVolume?:number; muzzleSize?:number; muzzleHeight?:number;
  armLength?:number; armWidth?:number; legLength?:number; legWidth?:number; handSize?:number; footSize?:number; waistWidth?:number;
  tailSize?:number; wingSize?:number; hornSize?:number; whiskerLength?:number; strokeWidth?:number;
  noseColor?:string; mouthColor?:string; earColor?:string; wingColor?:string; tailColor?:string; hornColor?:string;

  species?: CharacterSpecies;
  bodyPlan?: CharacterBodyPlan;
  speciesPreset?: string;
  hybridPrimaryPreset?: string;
  hybridSecondaryPreset?: string;
  hybridBlend?: number;
  headShape: 'round' | 'oval' | 'square' | 'heart' | 'triangle' | 'wide';
  faceShape: 'soft' | 'angular' | 'long' | 'wide';
  eyeStyle: 'round' | 'almond' | 'narrow' | 'dot' | 'large' | 'hooded' | 'monolid' | 'upturned' | 'downturned';
  browStyle: 'none' | 'soft' | 'straight' | 'arched' | 'bold';
  featureProfile?: 'neutral' | 'afrodiasporic' | 'indigenous' | 'aboriginal' | 'east-asian' | 'south-asian' | 'west-asian' | 'latine' | 'european' | 'mixed';
  noseStyle: 'none' | 'small' | 'straight' | 'wide' | 'button' | 'broad' | 'aquiline';
  mouthStyle: 'line' | 'smile' | 'full' | 'small' | 'wide' | 'bow';
  earStyle: 'none' | 'simple' | 'round' | 'pointed' | 'long' | 'floppy' | 'large' | 'fin';
  hairStyle: 'none' | 'short' | 'bob' | 'long' | 'curly' | 'spiky' | 'bun' | 'wavy' | 'afro' | 'coily' | 'locs' | 'braids' | 'pixie' | 'buzz' | 'ponytail' | 'undercut' | 'blunt';
  muzzleStyle?: CharacterMuzzleStyle;
  tailStyle?: CharacterTailStyle;
  wingStyle?: CharacterWingStyle;
  hornStyle?: CharacterHornStyle;
  surfaceStyle?: CharacterSurfaceStyle;
  footStyle?: CharacterFootStyle;
  whiskers?: boolean;
  bodyShape: 'slim' | 'very-slim' | 'average' | 'athletic' | 'stocky' | 'plus-size' | 'chibi';
  torsoShape: 'rectangle' | 'trapezoid' | 'round' | 'triangle';
  armStyle: 'thin' | 'regular' | 'strong';
  legStyle: 'short' | 'regular' | 'long';
  handStyle: 'mitten' | 'simple' | 'defined';
  outfitStyle: 'none' | 'basic' | 'casual' | 'sport' | 'formal' | 'fantasy' | 'tech' | 'street' | 'school' | 'kawaii' | 'punk' | 'steampunk' | 'historical' | 'scifi' | 'workwear' | 'elegant' | 'adventure';
  accessory: 'none' | 'glasses' | 'hat' | 'scarf' | 'backpack' | 'headphones';
  headToBodyRatio: number;
  shoulderWidth: number;
  limbLength: number;
  bodyWidth: number;
  skinColor: string;
  surfaceColor?: string;
  hairColor: string;
  eyeColor: string;
  outfitPrimary: string;
  outfitSecondary: string;
  lineColor: string;
  stature?: 'very-short' | 'short' | 'average' | 'tall' | 'giant';
  representationProfile?: 'none' | 'down-syndrome';
  mobilityAid?: 'none' | 'wheelchair' | 'crutch' | 'prosthesis-leg';
  wheelchairStyle?: 'manual' | 'active' | 'sport';
  wheelchairColor?: string;
  visionAid?: 'none' | 'cane' | 'dark-glasses';
}

export interface CharacterProfile {
  role: string;
  ageBand: string;
  personality: string;
  motivation: string;
  backstory: string;
  keywords: string[];
  silhouetteIntent: string;
  shapeLanguageRationale: string;
  proportionRationale: string;
  colorRationale: string;
  costumeRationale: string;
}

export interface CharacterPoseReference {
  id: string;
  name: string;
  kind: CharacterPoseKind;
  view?: CharacterView;
  notes?: string;
}

export interface CharacterSpriteDocument {
  aiReferences?: Array<{ id: string; name: string; url: string }>;
  aiSourceMode?: 'refine' | 'reference' | 'new';
  title: string;
  characterName: string;
  description?: string;
  width: number;
  height: number;
  background: string;
  pixelated: boolean;
  animations: SpriteAnimation[];
  activeAnimationId?: string;
  palette?: string[];
  appearance?: CharacterAppearance;
  profile?: CharacterProfile;
  prompt?: string;
  generatedSvg?: string;
  generatedNotes?: string[];
  poses?: CharacterPoseReference[];
  expressions?: CharacterExpression[];
  activeView?: CharacterView;
  activeExpression?: CharacterExpression;
  activePose?: CharacterPoseKind;
  posePhase?:number;
  poseAdjustments?: Partial<Record<CharacterPoseKind, CharacterPoseAdjustment>>;
  updatedAt?: string;
}

export type GameSceneType = 'menu' | 'level' | 'boss' | 'cutscene' | 'result';
export type GameSprintStatus = 'todo' | 'doing' | 'done';

export type GameActionVerb = 'entrar' | 'andar' | 'falar' | 'coletar' | 'pular' | 'esperar' | 'sair';

export interface GameCharacterAction {
  id: string;
  spriteId: string;
  verb: GameActionVerb;
  text?: string;
  x?: number;
  y?: number;
  durationMs?: number;
}

export interface GameScene {
  id: string;
  name: string;
  type: GameSceneType;
  objective: string;
  mechanics: string[];
  background: string;
  nextSceneId?: string;
  spriteIds?: string[];
  script?: string;
  actions?: GameCharacterAction[];
}

export interface GameSprintItem {
  id: string;
  title: string;
  status: GameSprintStatus;
  effort: 1 | 2 | 3 | 5 | 8;
  notes?: string;
}

export interface GameJamMember {
  id: string;
  name: string;
  role: string;
}

export interface GameJamAsset {
  id: string;
  nodeId?: string;
  name: string;
  type: string;
  url?: string;
  selected?: boolean;
}

export interface GameJamState {
  enabled: boolean;
  name: string;
  theme: string;
  constraints: string;
  startAt?: string;
  deadline?: string;
  durationHours: number;
  team: GameJamMember[];
  assets: GameJamAsset[];
  buildUrl?: string;
  submissionUrl?: string;
  checklist: Array<{ id: string; label: string; done: boolean }>;
}

export interface GameDesignDocument {
  title: string;
  genre: string;
  coreLoop: string;
  playerGoal: string;
  gddScript?: string;
  previewEngine?: 'local' | 'phaser' | 'pixi';
  scenes: GameScene[];
  sprints: GameSprintItem[];
  jam?: GameJamState;
  updatedAt?: string;
}

export interface VisualIdentityColor {
  id: string;
  name: string;
  role: string;
  color: string;
}

export interface VisualIdentityApplication {
  id: string;
  type: 'social' | 'poster' | 'card' | 'packaging' | 'signage' | 'interface' | 'tshirt' | 'mug' | 'pencil' | 'stationery' | 'letterhead' | 'notebook' | 'tote';
  title: string;
  notes?: string;
}

export interface VisualIdentityDocument {
  title: string;
  brandName: string;
  tagline: string;
  essence: string;
  audience: string;
  positioning: string;
  personality: string[];
  logo: {
    kind: 'wordmark' | 'monogram' | 'symbol' | 'combination';
    symbolStyle: 'geometric' | 'organic' | 'seal' | 'abstract';
    monogram: string;
    lockup: 'horizontal' | 'stacked' | 'symbol-only';
    assetUrl?: string;
    assetName?: string;
    useUploadedAsset?: boolean;
    sketchSvg?: string;
    sketchNote?: string;
    refinementPrompt?: string;
    refinementAlternatives?: Array<{
      id: string;
      label: string;
      rationale: string;
      logo: {
        kind: 'wordmark' | 'monogram' | 'symbol' | 'combination';
        symbolStyle: 'geometric' | 'organic' | 'seal' | 'abstract';
        monogram: string;
        lockup: 'horizontal' | 'stacked' | 'symbol-only';
      };
    }>;
    activeRefinementId?: string;
  };
  palette: VisualIdentityColor[];
  typography: { display: string; text: string; accent: string };
  graphicLanguage: string;
  photoBrief: string;
  logoRules: string;
  applications: VisualIdentityApplication[];
  manualNotes: string;
  sourceDesignSystemUpdatedAt?: string;
  updatedAt?: string;
}


export type DataChartType = 'bar' | 'horizontal-bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'bubble' | 'stacked' | 'timeline' | 'radar' | 'pictogram' | 'gauge' | 'lollipop' | 'funnel' | 'heatmap' | 'treemap';
export type DataInfographicFormat = 'vertical' | 'social' | 'square' | 'slide';

export interface DataStoryQuestion {
  id: string;
  prompt: string;
  answer?: string;
}

export interface DataStoryElement {
  id: string;
  kind: 'text' | 'stat' | 'chart' | 'shape' | 'divider';
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
  color?: string;
  background?: string;
  fontSize?: number;
  chartType?: DataChartType;
}

export interface DataStoryDocument {
  title: string;
  goal: string;
  rawData: string;
  chartType: DataChartType;
  xField?: string;
  yField?: string;
  groupField?: string;
  palette: string[];
  questions: DataStoryQuestion[];
  insight?: string;
  mapGeoJson?: string;
  mapValueProperty?: string;
  geoApiPath?: string;
  metabaseUrl?: string;
  infographicFormat: DataInfographicFormat;
  infographicElements: DataStoryElement[];
  aiPrompt?: string;
  aiNotes?: string[];
  updatedAt?: string;
}

export type ApiCostModel = 'no-key' | 'free-tier' | 'open-self-hosted';
export type ApiConnectionStatus = 'available' | 'configured' | 'needs-config' | 'error';

export interface ApiConnectionItem {
  id: string;
  catalogId?: string;
  name: string;
  category: string;
  summary: string;
  costModel: ApiCostModel;
  auth: string;
  docsUrl: string;
  envVars: string[];
  capabilities: string[];
  status: ApiConnectionStatus;
  notes?: string;
  customSpec?: {
    endpoints: Array<{ method: string; path: string; purpose: string }>;
    code?: string;
    fileName?: string;
  };
}

export interface ApiConnectionsDocument {
  title: string;
  connections: ApiConnectionItem[];
  builderPrompt?: string;
  updatedAt?: string;
}

export interface NodeComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: UserRole;
  text: string;
  createdAt: string;
}

export interface NodeAttachment {
  id: string;
  url: string;
  name: string;
  type: 'image' | 'video';
  contentType?: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface ThoughtNode {
  id: string;
  type: ThoughtType;
  title: string;
  content: string;
  phase: Phase;
  x: number;
  y: number;
  width?: number;
  height?: number;
  imageUrl?: string;
  imageName?: string;
  imageContentType?: string;
  imageCredit?: {title:string; author:string; license:string; licenseUrl:string; sourceUrl:string; provider:string};
  aspectRatio?: number;
  drawing?: DrawingDocument;
  drawingName?: string;
  interactive?: InteractiveDocument;
  interactiveName?: string;
  wireframe?: WireframeDocument;
  wireframeName?: string;
  designSystem?: DesignSystemDocument;
  designSystemName?: string;
  visualIdentity?: VisualIdentityDocument;
  visualIdentityName?: string;
  video?: VideoDocument;
  videoName?: string;
  uxWriting?: UXWritingDocument;
  uxWritingName?: string;
  sound?: SoundDocument;
  soundName?: string;
  hardware?: HardwareDocument;
  hardwareName?: string;
  sprite?: CharacterSpriteDocument;
  spriteName?: string;
  gameDesign?: GameDesignDocument;
  gameDesignName?: string;
  apiConnections?: ApiConnectionsDocument;
  apiConnectionsName?: string;
  dataStory?: DataStoryDocument;
  dataStoryName?: string;
  mediatorId?: string;
  scientificContext?: string;
  provocations?: string[];
  connections: string[]; // IDs of other thought nodes connected to this one
  createdAt: string;
  isCompleted?: boolean;
  comments?: NodeComment[];
  attachments?: NodeAttachment[];
}


export interface Mediator {
  id: string;
  name: string;
  role: string;
  phase?: Phase | 'Transversal';
  description: string;
  bio: string;
  iconName: string; // Lucide icon identifier
  themeColor: string; // e.g., 'emerald', 'amber', 'sky', 'rose', 'indigo', 'violet'
  greeting: string;
}

export type UserRole = 'advisor' | 'individual' | 'student' | 'partner';

export type PartnerType = 'comunidade' | 'empresa' | 'governo' | 'cliente';

export interface UserProfile {
  id: string;
  name: string;
  email?: string;
  role: UserRole;
  partnerType?: PartnerType;
  classroomId?: string;
  institution?: string;
  invitedClassroom?: Classroom;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  studentIds: string[];
}

export interface StudentProfile {
  id: string;
  name: string;
  classroomId: string;
  email?: string;
  /** ID real da conta no Turso quando o aluno entrou por convite. */
  remoteOwnerId?: string;
  /** Snapshot completo da conta, usado para a professora editar o mesmo canvas. */
  remoteSnapshot?: Record<string, unknown>;
  project?: Project;
  nodes?: ThoughtNode[];
}
