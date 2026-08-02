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

export type ThoughtType = 'core' | 'question' | 'user-thought' | 'insight';

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
