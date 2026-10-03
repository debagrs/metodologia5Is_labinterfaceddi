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

export type ThoughtType = 'core' | 'question' | 'user-thought' | 'insight' | 'canvas-image' | 'drawing-sheet' | 'interactive-lab' | 'wireframe-board' | 'design-system' | 'video-board' | 'ux-writing' | 'sound-board' | 'hardware-board' | 'sprite-character' | 'game-design' | 'api-connections';

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
  | 'text';


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
}

export interface InteractiveDocument {
  engine: InteractiveEngine;
  title: string;
  prompt: string;
  code: string;
  asset?: InteractiveAsset;
  interactionMode?: InteractiveMode;
  effectPreset?: InteractiveEffect;
  intensity?: InteractiveIntensity;
  preserveBrand?: boolean;
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
  kind: VideoMediaKind;
  url: string;
  name: string;
  duration: number;
  transition?: VideoTransition;
  fit?: 'cover' | 'contain';
  caption?: string;
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
export type CharacterExpression = 'neutral' | 'happy' | 'sad' | 'angry' | 'surprised' | 'determined';
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
}

export interface CharacterAppearance {
  headShape: 'round' | 'oval' | 'square' | 'heart' | 'triangle' | 'wide';
  faceShape: 'soft' | 'angular' | 'long' | 'wide';
  eyeStyle: 'round' | 'almond' | 'narrow' | 'dot' | 'large';
  browStyle: 'soft' | 'straight' | 'arched' | 'bold';
  noseStyle: 'none' | 'small' | 'straight' | 'wide';
  mouthStyle: 'line' | 'smile' | 'full' | 'small';
  earStyle: 'simple' | 'round' | 'pointed';
  hairStyle: 'none' | 'short' | 'bob' | 'long' | 'curly' | 'spiky' | 'bun';
  bodyShape: 'slim' | 'average' | 'athletic' | 'stocky' | 'chibi';
  torsoShape: 'rectangle' | 'trapezoid' | 'round' | 'triangle';
  armStyle: 'thin' | 'regular' | 'strong';
  legStyle: 'short' | 'regular' | 'long';
  handStyle: 'mitten' | 'simple' | 'defined';
  outfitStyle: 'basic' | 'sport' | 'formal' | 'fantasy' | 'tech' | 'street';
  accessory: 'none' | 'glasses' | 'hat' | 'scarf' | 'backpack' | 'headphones';
  headToBodyRatio: number;
  shoulderWidth: number;
  limbLength: number;
  bodyWidth: number;
  skinColor: string;
  hairColor: string;
  eyeColor: string;
  outfitPrimary: string;
  outfitSecondary: string;
  lineColor: string;
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
  updatedAt?: string;
}

export type GameSceneType = 'menu' | 'level' | 'boss' | 'cutscene' | 'result';
export type GameSprintStatus = 'todo' | 'doing' | 'done';

export interface GameScene {
  id: string;
  name: string;
  type: GameSceneType;
  objective: string;
  mechanics: string[];
  background: string;
  nextSceneId?: string;
  spriteIds?: string[];
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
  scenes: GameScene[];
  sprints: GameSprintItem[];
  jam?: GameJamState;
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
  aspectRatio?: number;
  drawing?: DrawingDocument;
  drawingName?: string;
  interactive?: InteractiveDocument;
  interactiveName?: string;
  wireframe?: WireframeDocument;
  wireframeName?: string;
  designSystem?: DesignSystemDocument;
  designSystemName?: string;
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
