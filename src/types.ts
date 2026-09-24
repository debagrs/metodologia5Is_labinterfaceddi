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

export type ThoughtType = 'core' | 'question' | 'user-thought' | 'insight' | 'canvas-image' | 'drawing-sheet' | 'interactive-lab';

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


export type InteractiveEngine = 'p5' | 'three';

export interface InteractiveDocument {
  engine: InteractiveEngine;
  title: string;
  prompt: string;
  code: string;
}

export interface DrawingPoint {
  x: number;
  y: number;
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
