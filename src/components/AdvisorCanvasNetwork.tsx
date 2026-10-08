import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BookOpen, Check, ChevronDown, CircleDot, FolderOpen,
  GraduationCap, Link2, Network, Plus, RefreshCw, Search, Sparkles,
  Users, X, MessageCircle, Eye, Handshake, School, BarChart3, UserRound,
  Copy, Mail, Trash2, UserPlus,
} from 'lucide-react';
import BrandMark from './BrandMark';
import type {
  Classroom,
  CollaborationPermission,
  CollaboratorLabel,
  ProjectWorkspace,
  SharedProjectSummary,
  StudentProfile,
  UserProfile,
} from '../types';
import { readAuthSession } from '../lib/auth';

interface AdvisorCanvasNetworkProps {
  advisor: UserProfile;
  classrooms: Classroom[];
  selectedClassId: string | null;
  onSelectClass: (classroomId: string) => void;
  students: StudentProfile[];
  advisorProjects: ProjectWorkspace[];
  sharedProjects: SharedProjectSummary[];
  sharedProjectsLoading?: boolean;
  onViewStudentProject: (student: StudentProfile) => void;
  onOpenAdvisorProject?: (projectId: string) => void;
  onOpenOwnProjects?: () => void;
  onOpenShared?: (project: SharedProjectSummary) => void;
  onRefreshShared?: () => void;
  onRefreshStudents?: () => void;
  onUpdateClassroomLinks: (classroomId: string, patch: Partial<Classroom>) => void;
  onOpenManagement: () => void;
}

type Selection =
  | { kind: 'general' }
  | { kind: 'student'; student: StudentProfile }
  | { kind: 'advisor'; workspace: ProjectWorkspace }
  | { kind: 'community'; shared: SharedProjectSummary };

type PickerKind = 'advisor' | 'community' | null;

interface NetworkCollaborator {
  id: string;
  projectId: string;
  projectName: string;
  collaboratorId?: string;
  collaboratorEmail: string;
  collaboratorName?: string;
  permission: CollaborationPermission;
  label: CollaboratorLabel;
  status: 'pending' | 'accepted';
  createdAt: string;
}

const PHASES = [
  { name: 'Ideação', caption: 'Abrir possibilidades', body: '#FFF9E8', header: '#FFF0B8', border: '#E7C75C', dot: '#E4AC16' },
  { name: 'Inambulação', caption: 'Pesquisar e escutar', body: '#EEF5FF', header: '#DCEBFF', border: '#8BB9F6', dot: '#3B82F6' },
  { name: 'Instauração', caption: 'Materializar relações', body: '#EFF9F2', header: '#DDF3E4', border: '#8BC9A3', dot: '#43B581' },
  { name: 'Inspeção', caption: 'Testar e evidenciar', body: '#F7F0FF', header: '#EBDDFF', border: '#BE9BE8', dot: '#9A65D6' },
  { name: 'Implementação', caption: 'Publicar e sustentar', body: '#FFF1F2', header: '#FFDDE1', border: '#EE9BA4', dot: '#E85D6A' },
] as const;

const phaseStyle = (phase?: string) => PHASES.find((item) => item.name === phase) || PHASES[0];

const communityRef = (shared: SharedProjectSummary) => `${shared.ownerId}:${shared.projectId}`;

const permissionLabel = (permission: SharedProjectSummary['permission']) => (
  permission === 'edit' ? 'Pode editar' : permission === 'comment' ? 'Pode comentar' : 'Visualização'
);

const collaboratorLabel = (label: SharedProjectSummary['label']) => {
  if (label === 'comunidade') return 'Comunidade';
  if (label === 'cliente') return 'Cliente';
  if (label === 'especialista') return 'Especialista';
  if (label === 'colega') return 'Colega';
  return 'Parceiro';
};

function studentProjectCount(student: StudentProfile) {
  const snapshot = student.remoteSnapshot as any;
  if (Array.isArray(snapshot?.projectWorkspaces)) return snapshot.projectWorkspaces.length;
  return student.project ? 1 : 0;
}

function MiniBoard({ phase, dense = false }: { phase?: string; dense?: boolean }) {
  const active = phaseStyle(phase);
  return (
    <div className={`rounded-xl border border-black/10 bg-white overflow-hidden ${dense ? 'h-14' : 'h-20'}`}>
      <div className="grid grid-cols-5 h-full">
        {PHASES.map((item, index) => (
          <div key={item.name} className="border-r last:border-r-0 border-black/5 p-1.5" style={{ background: item.body }}>
            <span className="block w-2 h-2 rounded-full mb-1" style={{ background: phase === item.name ? item.dot : `${item.dot}66` }} />
            <span className="block h-1.5 rounded bg-black/10 mb-1" />
            <span className="block h-1 rounded bg-black/5 mb-1" />
            {(!dense || index % 2 === 0) && <span className="block h-2.5 rounded" style={{ background: `${item.header}` }} />}
          </div>
        ))}
      </div>
      <span className="sr-only">Prévia do canvas na fase {active.name}</span>
    </div>
  );
}

function PanelTitle({ icon, title, count, action }: { icon: React.ReactNode; title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold leading-tight truncate">{title}</h3>
          {typeof count === 'number' && <span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">{count} {count === 1 ? 'canvas' : 'canvases'}</span>}
        </div>
      </div>
      {action}
    </div>
  );
}

export default function AdvisorCanvasNetwork({
  advisor,
  classrooms,
  selectedClassId,
  onSelectClass,
  students,
  advisorProjects,
  sharedProjects,
  sharedProjectsLoading = false,
  onViewStudentProject,
  onOpenAdvisorProject,
  onOpenOwnProjects,
  onOpenShared,
  onRefreshShared,
  onRefreshStudents,
  onUpdateClassroomLinks,
  onOpenManagement,
}: AdvisorCanvasNetworkProps) {
  const activeClassroom = classrooms.find((item) => item.id === selectedClassId) || classrooms[0] || null;
  const [selection, setSelection] = useState<Selection>({ kind: 'general' });
  const [picker, setPicker] = useState<PickerKind>(null);
  const [query, setQuery] = useState('');
  const [peopleOpen, setPeopleOpen] = useState(false);
  const [networkCollaborators, setNetworkCollaborators] = useState<NetworkCollaborator[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityMessage, setCommunityMessage] = useState('');
  const [communityEmail, setCommunityEmail] = useState('');
  const [communityProjectId, setCommunityProjectId] = useState(advisorProjects[0]?.project.id || '');
  const [communityPermission, setCommunityPermission] = useState<CollaborationPermission>('comment');
  const [communityLabel, setCommunityLabel] = useState<CollaboratorLabel>('comunidade');

  useEffect(() => {
    if (communityProjectId && advisorProjects.some((item) => item.project.id === communityProjectId)) return;
    setCommunityProjectId(advisorProjects[0]?.project.id || '');
  }, [advisorProjects, communityProjectId]);

  const communityRequest = async (url: string, init?: RequestInit) => {
    const auth = readAuthSession();
    if (!auth?.token) throw new Error('Sua sessão expirou. Saia e entre novamente.');
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`,
        ...(init?.headers || {}),
      },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Não foi possível concluir esta ação.');
    return data;
  };

  const loadNetworkCollaborators = async () => {
    setCommunityLoading(true);
    try {
      const data = await communityRequest('/api/project-collaborators?action=network');
      setNetworkCollaborators(Array.isArray(data.collaborators) ? data.collaborators : []);
    } catch (error: any) {
      setCommunityMessage(error?.message || 'Não foi possível carregar pessoas e e-mails da rede.');
      setNetworkCollaborators([]);
    } finally {
      setCommunityLoading(false);
    }
  };

  useEffect(() => {
    void loadNetworkCollaborators();
  }, [advisor.id]);

  const inviteCommunityPerson = async () => {
    const email = communityEmail.trim().toLowerCase();
    if (!communityProjectId) {
      setCommunityMessage('Escolha um projeto da professora para receber esta pessoa.');
      return;
    }
    if (!email || !email.includes('@')) {
      setCommunityMessage('Digite um e-mail válido.');
      return;
    }
    setCommunityLoading(true);
    setCommunityMessage('');
    try {
      const data = await communityRequest('/api/project-collaborators', {
        method: 'POST',
        body: JSON.stringify({
          projectId: communityProjectId,
          email,
          permission: communityPermission,
          label: communityLabel,
        }),
      });
      setCommunityEmail('');
      setCommunityMessage(data.status === 'accepted'
        ? 'Pessoa conectada: a conta com este e-mail já existe.'
        : 'Convite registrado. Quando a pessoa criar ou acessar a conta com este e-mail, a conexão será ativada.');
      await loadNetworkCollaborators();
    } catch (error: any) {
      setCommunityMessage(error?.message || 'Não foi possível criar o convite.');
    } finally {
      setCommunityLoading(false);
    }
  };

  const updateCommunityPerson = async (item: NetworkCollaborator, patch: Partial<Pick<NetworkCollaborator, 'permission' | 'label'>>) => {
    setCommunityMessage('');
    try {
      await communityRequest('/api/project-collaborators', {
        method: 'PATCH',
        body: JSON.stringify({ id: item.id, permission: patch.permission || item.permission, label: patch.label || item.label }),
      });
      await loadNetworkCollaborators();
    } catch (error: any) {
      setCommunityMessage(error?.message || 'Não foi possível atualizar esta pessoa.');
    }
  };

  const removeCommunityPerson = async (item: NetworkCollaborator) => {
    if (!window.confirm(`Remover ${item.collaboratorName || item.collaboratorEmail} deste projeto?`)) return;
    setCommunityMessage('');
    try {
      await communityRequest(`/api/project-collaborators?id=${encodeURIComponent(item.id)}`, { method: 'DELETE' });
      await loadNetworkCollaborators();
    } catch (error: any) {
      setCommunityMessage(error?.message || 'Não foi possível remover esta pessoa.');
    }
  };

  const copyCommunityInvitation = async (item: NetworkCollaborator) => {
    const loginLink = `${window.location.origin}/`;
    const text = `Você foi convidado(a) para colaborar no projeto “${item.projectName}” na Metodologia 5I's. Entre ou crie sua conta usando o e-mail ${item.collaboratorEmail}: ${loginLink}`;
    await navigator.clipboard.writeText(text);
    setCommunityMessage('Texto do convite copiado.');
  };

  const mailCommunityInvitation = (item: NetworkCollaborator) => {
    const subject = encodeURIComponent(`Convite para colaborar no projeto ${item.projectName}`);
    const body = encodeURIComponent(`Olá!\n\nVocê foi convidado(a) para colaborar no projeto “${item.projectName}” na plataforma Metodologia 5I's.\n\nEntre ou crie sua conta usando este mesmo e-mail (${item.collaboratorEmail}):\n${window.location.origin}/`);
    window.location.href = `mailto:${encodeURIComponent(item.collaboratorEmail)}?subject=${subject}&body=${body}`;
  };

  const linkedAdvisorIds = activeClassroom?.linkedAdvisorProjectIds || [];
  const linkedCommunityRefs = activeClassroom?.linkedCommunityProjectRefs || [];

  const linkedAdvisor = useMemo(
    () => advisorProjects.filter((item) => linkedAdvisorIds.includes(item.project.id)),
    [advisorProjects, linkedAdvisorIds],
  );
  const linkedCommunity = useMemo(
    () => sharedProjects.filter((item) => linkedCommunityRefs.includes(communityRef(item))),
    [sharedProjects, linkedCommunityRefs],
  );

  const activeStudents = useMemo(() => {
    if (!activeClassroom) return [];
    return students.filter((student) => student.classroomId === activeClassroom.id);
  }, [students, activeClassroom?.id]);

  const projectStudents = activeStudents.filter((student) => student.project || studentProjectCount(student) > 0);
  const totalStudentCanvases = activeStudents.reduce((total, student) => total + studentProjectCount(student), 0);
  const totalConnections = totalStudentCanvases + linkedAdvisor.length + linkedCommunity.length;
  const activePhases = new Set(projectStudents.map((student) => student.project?.activePhase).filter(Boolean));
  const networkPeople = useMemo(() => {
    const byEmail = new Map<string, NetworkCollaborator>();
    for (const item of networkCollaborators) byEmail.set(item.collaboratorEmail.toLowerCase(), item);
    return [...byEmail.values()];
  }, [networkCollaborators]);

  const updateLinks = (kind: Exclude<PickerKind, null>, id: string) => {
    if (!activeClassroom) return;
    if (kind === 'advisor') {
      const next = linkedAdvisorIds.includes(id)
        ? linkedAdvisorIds.filter((value) => value !== id)
        : [...linkedAdvisorIds, id];
      onUpdateClassroomLinks(activeClassroom.id, { linkedAdvisorProjectIds: next });
      return;
    }
    const next = linkedCommunityRefs.includes(id)
      ? linkedCommunityRefs.filter((value) => value !== id)
      : [...linkedCommunityRefs, id];
    onUpdateClassroomLinks(activeClassroom.id, { linkedCommunityProjectRefs: next });
  };

  const openSelection = () => {
    if (selection.kind === 'student') onViewStudentProject(selection.student);
    if (selection.kind === 'advisor') onOpenAdvisorProject?.(selection.workspace.project.id);
    if (selection.kind === 'community') onOpenShared?.(selection.shared);
  };

  const selectionTitle = selection.kind === 'general'
    ? activeClassroom?.name || 'Rede de canvases'
    : selection.kind === 'student'
      ? selection.student.project?.name || `Canvas de ${selection.student.name}`
      : selection.kind === 'advisor'
        ? selection.workspace.project.name
        : selection.shared.projectName;

  const selectionDescription = selection.kind === 'general'
    ? `Visão integrada dos canvases da turma, dos projetos da professora e das contribuições da comunidade. Os vínculos ficam salvos na própria turma.`
    : selection.kind === 'student'
      ? selection.student.project?.problem || 'A conta está vinculada à turma, mas ainda não há um projeto ativo neste resumo.'
      : selection.kind === 'advisor'
        ? selection.workspace.project.problem
        : selection.shared.projectProblem;

  const filteredAdvisor = advisorProjects.filter(({ project }) => project.name.toLowerCase().includes(query.toLowerCase()));
  const filteredShared = sharedProjects.filter((shared) => `${shared.ownerName} ${shared.projectName}`.toLowerCase().includes(query.toLowerCase()));

  if (!activeClassroom) {
    return (
      <section className="rounded-3xl border border-dashed border-[#D8D8D4] bg-white min-h-[420px] flex flex-col items-center justify-center text-center p-8">
        <div className="w-16 h-16 rounded-2xl bg-[#FFF0B8] flex items-center justify-center mb-4"><Network size={28} /></div>
        <h2 className="text-xl font-bold">Crie uma turma para montar a rede</h2>
        <p className="text-sm text-neutral-500 max-w-lg mt-2">A rede integra os canvases dos estudantes, seus projetos de disciplina e os projetos compartilhados pela comunidade.</p>
        <button onClick={onOpenManagement} className="mt-5 px-5 py-3 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase tracking-wide cursor-pointer">Ir para gestão de turmas</button>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <section className="rounded-3xl border border-[#E0E0DE] bg-white shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#EEEEEB] flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark compact priority className="w-[42px] h-[36px] shrink-0" />
            <div className="min-w-0">
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-400">Orquestração da turma</span>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight truncate">Nossa rede de canvases</h2>
              <p className="text-xs sm:text-sm text-neutral-500 mt-1">Professora, estudantes e comunidade no mesmo ecossistema visual.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative">
              <select
                value={activeClassroom.id}
                onChange={(event) => { onSelectClass(event.target.value); setSelection({ kind: 'general' }); }}
                className="appearance-none h-10 pl-3 pr-9 rounded-xl border border-[#DCDCD8] bg-[#FAFAF8] text-xs font-semibold outline-none focus:border-black cursor-pointer"
              >
                {classrooms.map((classroom) => <option key={classroom.id} value={classroom.id}>{classroom.name}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400" />
            </label>
            <button onClick={() => { onRefreshStudents?.(); onRefreshShared?.(); }} className="h-10 px-3 rounded-xl border border-[#DCDCD8] bg-white text-xs font-mono font-bold uppercase flex items-center gap-2 cursor-pointer"><RefreshCw size={14} className={sharedProjectsLoading ? 'animate-spin' : ''}/> Atualizar</button>
            <button onClick={onOpenOwnProjects} className="h-10 px-4 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase flex items-center gap-2 cursor-pointer"><Plus size={15}/> Novo / meus canvases</button>
          </div>
        </div>

        <div className="px-4 sm:px-5 py-3 flex gap-2 overflow-x-auto border-b border-[#EEEEEB] bg-[#FDFDFB]">
          <span className="shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 flex items-center mr-1">Metodologia 5I’s</span>
          {PHASES.map((phase) => (
            <div key={phase.name} className="shrink-0 min-w-[138px] rounded-xl border px-3 py-2 flex items-center gap-2" style={{ background: phase.body, borderColor: phase.border }}>
              <span className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: phase.header }}><CircleDot size={14} style={{ color: phase.dot }}/></span>
              <span><strong className="block text-[10px]">{phase.name}</strong><span className="block text-[8px] text-neutral-500 mt-0.5">{phase.caption}</span></span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_330px] gap-4 items-start">
        <section className="relative rounded-3xl border border-[#E0E0DE] bg-[#FAFAF8] shadow-sm p-3 sm:p-4 overflow-hidden min-h-[700px]">
          <div className="absolute inset-0 bg-dot-grid opacity-70 pointer-events-none" />
          <svg className="hidden xl:block absolute inset-0 w-full h-full pointer-events-none opacity-70" viewBox="0 0 1200 760" preserveAspectRatio="none" aria-hidden="true">
            <path d="M350 220 C470 220 455 330 565 340" fill="none" stroke="#43B581" strokeWidth="3" />
            <path d="M340 560 C470 560 470 475 570 460" fill="none" stroke="#E85D6A" strokeWidth="3" />
            <path d="M850 225 C745 225 755 330 655 340" fill="none" stroke="#9A65D6" strokeWidth="3" />
            <path d="M600 200 C600 245 600 250 600 286" fill="none" stroke="#E4AC16" strokeWidth="3" />
            <circle cx="350" cy="220" r="6" fill="#43B581"/><circle cx="340" cy="560" r="6" fill="#E85D6A"/><circle cx="850" cy="225" r="6" fill="#9A65D6"/><circle cx="600" cy="286" r="6" fill="#E4AC16"/>
          </svg>

          <div className="relative grid grid-cols-1 xl:grid-cols-[minmax(230px,.9fr)_minmax(310px,1.2fr)_minmax(230px,.9fr)] gap-3 xl:gap-5 items-start">
            <div className="space-y-3">
              <article className="rounded-2xl border p-3.5 shadow-sm" style={{ background: '#EFF9F2', borderColor: '#8BC9A3' }}>
                <PanelTitle icon={<GraduationCap size={16}/>} title="Canvas dos estudantes" count={totalStudentCanvases || activeStudents.length} action={<button onClick={onOpenManagement} className="text-[9px] font-mono font-bold uppercase underline underline-offset-2 cursor-pointer">Gerir</button>} />
                <div className="space-y-2 max-h-[310px] overflow-y-auto pr-1">
                  {activeStudents.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[#8BC9A3] bg-white/70 p-4 text-center text-xs text-neutral-500">Nenhum estudante conectado a esta turma ainda.</div>
                  ) : activeStudents.map((student) => {
                    const phase = phaseStyle(student.project?.activePhase);
                    return (
                      <button key={`${student.id}-${student.remoteOwnerId || 'local'}`} onClick={() => setSelection({ kind: 'student', student })} className="w-full text-left rounded-xl border border-white/80 bg-white p-2.5 shadow-sm hover:border-black/30 transition-colors cursor-pointer">
                        <div className="flex items-start gap-2.5">
                          <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0"><MiniBoard phase={student.project?.activePhase} dense /></div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-2"><strong className="text-xs leading-tight truncate">{student.project?.name || student.name}</strong><ArrowRight size={13} className="text-neutral-400 shrink-0"/></div>
                            <span className="text-[9px] text-neutral-500 block truncate mt-0.5">{student.project ? student.name : 'Projeto ainda não iniciado'}</span>
                            <div className="flex items-center gap-2 mt-1.5 text-[8px] font-mono text-neutral-500"><span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full" style={{ background: phase.dot }}/>{student.project?.activePhase || 'Sem fase'}</span><span>{studentProjectCount(student)} canvas</span></div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={onOpenManagement} className="mt-2 w-full min-h-10 rounded-xl border border-[#8BC9A3] bg-white/70 text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"><Plus size={13}/> Relacionar estudantes</button>
              </article>

              <article className="rounded-2xl border p-3.5 shadow-sm" style={{ background: '#FFF1F2', borderColor: '#EE9BA4' }}>
                <PanelTitle icon={<Handshake size={16}/>} title="Comunidade" count={linkedCommunity.length} action={<button onClick={() => setPicker('community')} className="text-[9px] font-mono font-bold uppercase underline underline-offset-2 cursor-pointer">Vincular</button>} />
                <div className="space-y-2">
                  {linkedCommunity.length === 0 ? (
                    <button onClick={() => setPicker('community')} className="w-full rounded-xl border border-dashed border-[#EE9BA4] bg-white/70 p-4 text-center cursor-pointer"><Plus size={16} className="mx-auto mb-1 text-neutral-500"/><span className="text-xs font-semibold block">Adicionar canvas da comunidade</span><span className="text-[9px] text-neutral-500">Escolha entre os projetos compartilhados com você</span></button>
                  ) : linkedCommunity.slice(0, 4).map((shared) => (
                    <button key={shared.collaborationId} onClick={() => setSelection({ kind: 'community', shared })} className="w-full text-left rounded-xl border border-white bg-white p-2.5 shadow-sm hover:border-black/30 cursor-pointer">
                      <div className="flex items-start gap-2.5"><span className="w-9 h-9 rounded-xl bg-[#FFDDE1] flex items-center justify-center shrink-0"><Users size={15}/></span><span className="min-w-0 flex-1"><strong className="text-xs block truncate">{shared.projectName}</strong><span className="text-[9px] text-neutral-500 block truncate">{shared.ownerName} · {collaboratorLabel(shared.label)}</span>{shared.ownerEmail && <span className="text-[8px] text-neutral-400 block truncate mt-0.5">{shared.ownerEmail}</span>}<span className="text-[8px] font-mono text-neutral-400 mt-1 block">{permissionLabel(shared.permission)}</span></span></div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-[#EE9BA4]/40">
                  <div className="flex items-center justify-between gap-2 mb-2"><span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-500">Pessoas e e-mails</span><span className="text-[9px] font-mono text-neutral-400">{networkPeople.length}</span></div>
                  {networkPeople.length > 0 && <div className="space-y-1.5 mb-2">{networkPeople.slice(0, 2).map((person) => <div key={person.collaboratorEmail} className="rounded-xl bg-white/70 border border-white p-2 flex items-center gap-2"><span className="w-7 h-7 rounded-lg bg-[#FFDDE1] flex items-center justify-center shrink-0"><Mail size={12}/></span><span className="min-w-0 flex-1"><strong className="text-[10px] block truncate">{person.collaboratorName || person.collaboratorEmail}</strong><span className="text-[8px] text-neutral-500 block truncate">{person.collaboratorEmail}</span></span><span className={`w-2 h-2 rounded-full shrink-0 ${person.status === 'accepted' ? 'bg-emerald-500' : 'bg-amber-400'}`} /></div>)}</div>}
                  <button onClick={() => { setPeopleOpen(true); setCommunityMessage(''); }} className="w-full min-h-10 rounded-xl border border-[#EE9BA4] bg-white/80 text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"><UserPlus size={13}/> Gerenciar pessoas e e-mails</button>
                </div>
              </article>
            </div>

            <div className="space-y-4 xl:pt-1">
              <article className="rounded-2xl border-2 border-[#E7C75C] bg-[#FFF9E8] p-4 shadow-md">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shrink-0"><Sparkles size={21}/></span>
                  <div className="min-w-0 flex-1"><span className="text-[9px] font-mono uppercase tracking-wider text-neutral-500">Coordenação e mediação</span><h3 className="font-bold text-sm truncate">{advisor.name}</h3><p className="text-[10px] text-neutral-500 mt-0.5 truncate">{advisor.institution || 'Professora'} · conecta pessoas, ideias e contextos</p></div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <span className="rounded-xl bg-white/70 border border-[#E7C75C]/50 p-2 text-[9px] font-semibold flex items-center gap-1.5"><Eye size={12}/> Acompanha processos</span>
                  <span className="rounded-xl bg-white/70 border border-[#E7C75C]/50 p-2 text-[9px] font-semibold flex items-center gap-1.5"><MessageCircle size={12}/> Orienta e comenta</span>
                  <span className="rounded-xl bg-white/70 border border-[#E7C75C]/50 p-2 text-[9px] font-semibold flex items-center gap-1.5"><Link2 size={12}/> Conecta canvases</span>
                  <span className="rounded-xl bg-white/70 border border-[#E7C75C]/50 p-2 text-[9px] font-semibold flex items-center gap-1.5"><Users size={12}/> Articula comunidade</span>
                </div>
              </article>

              <button onClick={() => setSelection({ kind: 'general' })} className="w-full text-left rounded-3xl border-2 border-black bg-white p-4 shadow-lg hover:-translate-y-0.5 transition-transform cursor-pointer">
                <div className="flex items-start justify-between gap-3 mb-3"><div className="flex items-center gap-2.5 min-w-0"><span className="w-11 h-11 rounded-2xl bg-black text-white flex items-center justify-center shrink-0"><Network size={20}/></span><div className="min-w-0"><span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">Canvas geral da turma</span><h3 className="text-lg font-bold leading-tight truncate">{activeClassroom.name}</h3></div></div><span className="text-[9px] font-mono px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">Em rede</span></div>
                <p className="text-xs text-neutral-600 mb-3">Reúne sem fundir: cada autoria continua no seu canvas, mas a professora visualiza e articula as relações em uma única mesa.</p>
                <MiniBoard phase={projectStudents[0]?.project?.activePhase} />
                <div className="grid grid-cols-3 gap-2 mt-3">
                  <span className="rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] p-2 text-center"><strong className="text-base block">{activeStudents.length}</strong><span className="text-[8px] font-mono uppercase text-neutral-400">pessoas</span></span>
                  <span className="rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] p-2 text-center"><strong className="text-base block">{totalConnections}</strong><span className="text-[8px] font-mono uppercase text-neutral-400">canvases</span></span>
                  <span className="rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] p-2 text-center"><strong className="text-base block">{activePhases.size}</strong><span className="text-[8px] font-mono uppercase text-neutral-400">fases ativas</span></span>
                </div>
              </button>
            </div>

            <div className="space-y-3">
              <article className="rounded-2xl border p-3.5 shadow-sm" style={{ background: '#F7F0FF', borderColor: '#BE9BE8' }}>
                <PanelTitle icon={<BookOpen size={16}/>} title="Canvas da disciplina" count={linkedAdvisor.length} action={<button onClick={() => setPicker('advisor')} className="text-[9px] font-mono font-bold uppercase underline underline-offset-2 cursor-pointer">Vincular</button>} />
                <p className="text-[10px] text-neutral-600 -mt-1 mb-2.5">Use seus projetos como canvas transversal da disciplina — por exemplo, “Disciplina Acessível”.</p>
                <div className="space-y-2">
                  {linkedAdvisor.length === 0 ? (
                    <button onClick={() => setPicker('advisor')} className="w-full rounded-xl border border-dashed border-[#BE9BE8] bg-white/70 p-4 text-center cursor-pointer"><Plus size={16} className="mx-auto mb-1 text-neutral-500"/><span className="text-xs font-semibold block">Adicionar canvas da disciplina</span><span className="text-[9px] text-neutral-500">Vincule um projeto que você já criou</span></button>
                  ) : linkedAdvisor.slice(0, 4).map((workspace) => {
                    const phase = phaseStyle(workspace.project.activePhase);
                    return (
                      <button key={workspace.project.id} onClick={() => setSelection({ kind: 'advisor', workspace })} className="w-full text-left rounded-xl border border-white bg-white p-2.5 shadow-sm hover:border-black/30 cursor-pointer">
                        <MiniBoard phase={workspace.project.activePhase} dense />
                        <div className="mt-2 flex items-start justify-between gap-2"><span className="min-w-0"><strong className="text-xs block truncate">{workspace.project.name}</strong><span className="text-[9px] text-neutral-500 block truncate">{workspace.nodes.length} cards · {workspace.project.projectType}</span></span><span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: phase.dot }}/></div>
                      </button>
                    );
                  })}
                </div>
                <button onClick={onOpenOwnProjects} className="mt-2 w-full min-h-10 rounded-xl border border-[#BE9BE8] bg-white/70 text-[10px] font-mono font-bold uppercase cursor-pointer flex items-center justify-center gap-1.5"><FolderOpen size={13}/> Meus projetos</button>
              </article>

              <article className="rounded-2xl border border-[#DCEBFF] bg-[#EEF5FF] p-3.5 shadow-sm">
                <PanelTitle icon={<BarChart3 size={16}/>} title="Leitura da rede" />
                <div className="space-y-2 text-[10px]">
                  <div className="flex items-center justify-between rounded-xl bg-white/70 border border-white p-2"><span className="text-neutral-600">Estudantes conectados</span><strong>{activeStudents.length}</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-white/70 border border-white p-2"><span className="text-neutral-600">Canvases da disciplina</span><strong>{linkedAdvisor.length}</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-white/70 border border-white p-2"><span className="text-neutral-600">Canvases da comunidade</span><strong>{linkedCommunity.length}</strong></div>
                  <div className="flex items-center justify-between rounded-xl bg-white/70 border border-white p-2"><span className="text-neutral-600">Fases 5I’s em atividade</span><strong>{activePhases.size}/5</strong></div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <aside className="2xl:sticky 2xl:top-4 rounded-3xl border border-[#E0E0DE] bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#EEEEEB] flex items-center justify-between gap-3"><div><span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">Canvas selecionado</span><h3 className="font-bold text-sm mt-0.5 line-clamp-2">{selectionTitle}</h3></div><button onClick={() => setSelection({ kind: 'general' })} className="w-8 h-8 rounded-xl border border-[#E0E0DE] flex items-center justify-center cursor-pointer" aria-label="Voltar para visão geral"><X size={14}/></button></div>
          <div className="p-4 space-y-4">
            <MiniBoard phase={selection.kind === 'student' ? selection.student.project?.activePhase : selection.kind === 'advisor' ? selection.workspace.project.activePhase : selection.kind === 'community' ? selection.shared.activePhase : projectStudents[0]?.project?.activePhase} />
            <div><span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400">Descrição</span><p className="text-xs text-neutral-600 leading-relaxed mt-1.5">{selectionDescription}</p></div>

            {selection.kind === 'general' ? (
              <>
                <div><span className="text-[9px] font-mono font-bold uppercase tracking-wider text-neutral-400">Relações persistentes</span><div className="mt-2 space-y-2">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFF9F2] border border-[#8BC9A3]/50"><span className="text-[10px] flex items-center gap-1.5"><GraduationCap size={12}/> Estudantes</span><strong className="text-xs">{activeStudents.length}</strong></div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7F0FF] border border-[#BE9BE8]/50"><span className="text-[10px] flex items-center gap-1.5"><BookOpen size={12}/> Disciplina</span><strong className="text-xs">{linkedAdvisor.length}</strong></div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFF1F2] border border-[#EE9BA4]/50"><span className="text-[10px] flex items-center gap-1.5"><Handshake size={12}/> Canvases da comunidade</span><strong className="text-xs">{linkedCommunity.length}</strong></div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#FFF1F2] border border-[#EE9BA4]/50"><span className="text-[10px] flex items-center gap-1.5"><Mail size={12}/> Pessoas / e-mails</span><strong className="text-xs">{networkPeople.length}</strong></div>
                </div></div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={() => setPicker('advisor')} className="w-full min-h-11 rounded-xl bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2"><Link2 size={14}/> Relacionar outro canvas</button>
                  <button onClick={() => { setPeopleOpen(true); setCommunityMessage(''); }} className="w-full min-h-10 rounded-xl border border-[#DCDCD8] bg-white text-[10px] font-mono font-bold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2"><UserPlus size={14}/> Gerenciar pessoas e e-mails</button>
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] p-2.5"><span className="text-[8px] font-mono uppercase text-neutral-400 block">Origem</span><strong className="text-[10px] block mt-1">{selection.kind === 'student' ? 'Estudante' : selection.kind === 'advisor' ? 'Professora' : collaboratorLabel(selection.shared.label)}</strong></div>
                  <div className="rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] p-2.5"><span className="text-[8px] font-mono uppercase text-neutral-400 block">Fase</span><strong className="text-[10px] block mt-1">{selection.kind === 'student' ? selection.student.project?.activePhase || '—' : selection.kind === 'advisor' ? selection.workspace.project.activePhase : selection.shared.activePhase}</strong></div>
                </div>
                {selection.kind === 'student' && selection.student.email && <a href={`mailto:${selection.student.email}`} className="w-full rounded-xl bg-[#EFF9F2] border border-[#8BC9A3]/50 p-3 flex items-center gap-2.5 cursor-pointer"><span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0"><Mail size={14}/></span><span className="min-w-0"><span className="text-[8px] font-mono uppercase text-neutral-400 block">E-mail do estudante</span><strong className="text-[10px] block truncate mt-0.5">{selection.student.email}</strong></span></a>}
                {selection.kind === 'community' && selection.shared.ownerEmail && <a href={`mailto:${selection.shared.ownerEmail}`} className="w-full rounded-xl bg-[#FFF1F2] border border-[#EE9BA4]/50 p-3 flex items-center gap-2.5 cursor-pointer"><span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shrink-0"><Mail size={14}/></span><span className="min-w-0"><span className="text-[8px] font-mono uppercase text-neutral-400 block">E-mail da comunidade</span><strong className="text-[10px] block truncate mt-0.5">{selection.shared.ownerEmail}</strong></span></a>}
                <button onClick={openSelection} className="w-full min-h-11 rounded-xl bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wide cursor-pointer flex items-center justify-center gap-2">Abrir canvas <ArrowRight size={14}/></button>
                {selection.kind === 'advisor' && <button onClick={() => updateLinks('advisor', selection.workspace.project.id)} className="w-full min-h-10 rounded-xl border border-[#DCDCD8] text-[10px] font-mono font-bold uppercase cursor-pointer">Desvincular desta turma</button>}
                {selection.kind === 'community' && <button onClick={() => updateLinks('community', communityRef(selection.shared))} className="w-full min-h-10 rounded-xl border border-[#DCDCD8] text-[10px] font-mono font-bold uppercase cursor-pointer">Desvincular desta turma</button>}
              </>
            )}

            <div className="pt-3 border-t border-[#EEEEEB]"><button onClick={onOpenManagement} className="w-full text-left rounded-xl bg-[#FAFAF8] border border-[#E7E7E3] p-3 flex items-center gap-3 cursor-pointer"><span className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center"><School size={15}/></span><span className="min-w-0"><strong className="text-xs block">Gestão de turmas</strong><span className="text-[9px] text-neutral-500 block">Convites, exclusões, materiais e administração continuam disponíveis.</span></span></button></div>
          </div>
        </aside>
      </div>

      {picker && (
        <div className="fixed inset-0 z-[220] bg-black/45 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="w-full max-w-2xl max-h-[82vh] overflow-hidden rounded-3xl bg-[#FDFDFB] border border-black/10 shadow-2xl flex flex-col">
            <header className="p-5 border-b border-[#E0E0DE] flex items-start justify-between gap-4"><div><span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">Relacionar à turma</span><h2 className="text-xl font-bold mt-1">{picker === 'advisor' ? 'Canvas da professora / disciplina' : 'Canvas da comunidade'}</h2><p className="text-xs text-neutral-500 mt-1">{activeClassroom.name} · marque quantos canvases quiser. A relação será salva no workspace.</p></div><button onClick={() => { setPicker(null); setQuery(''); }} className="w-9 h-9 rounded-xl border border-[#DCDCD8] flex items-center justify-center cursor-pointer"><X size={16}/></button></header>
            <div className="p-4 border-b border-[#EEEEEB]"><label className="relative block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar canvas..." className="w-full h-11 pl-9 pr-3 rounded-xl border border-[#DCDCD8] bg-white text-sm outline-none focus:border-black"/></label></div>
            <div className="p-4 overflow-y-auto space-y-2">
              {picker === 'advisor' ? (
                filteredAdvisor.length ? filteredAdvisor.map((workspace) => {
                  const linked = linkedAdvisorIds.includes(workspace.project.id);
                  const phase = phaseStyle(workspace.project.activePhase);
                  return <button key={workspace.project.id} onClick={() => updateLinks('advisor', workspace.project.id)} className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 cursor-pointer ${linked ? 'border-black bg-white shadow-sm' : 'border-[#E0E0DE] bg-[#FAFAF8]'}`}><span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: phase.header }}><FolderOpen size={18}/></span><span className="min-w-0 flex-1"><strong className="text-sm block truncate">{workspace.project.name}</strong><span className="text-[10px] text-neutral-500 block truncate">{workspace.project.activePhase} · {workspace.nodes.length} cards · {workspace.project.projectType}</span></span><span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${linked ? 'bg-black border-black text-white' : 'border-[#CFCFCA] bg-white text-transparent'}`}><Check size={14}/></span></button>;
                }) : <div className="p-8 text-center"><FolderOpen size={28} className="mx-auto text-neutral-300 mb-2"/><p className="text-sm font-semibold">Nenhum projeto próprio encontrado</p><p className="text-xs text-neutral-500 mt-1">Crie um projeto da professora e depois vincule-o aqui.</p><button onClick={onOpenOwnProjects} className="mt-4 px-4 py-2.5 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase">Abrir meus projetos</button></div>
              ) : (
                filteredShared.length ? filteredShared.map((shared) => {
                  const ref = communityRef(shared); const linked = linkedCommunityRefs.includes(ref);
                  return <button key={shared.collaborationId} onClick={() => updateLinks('community', ref)} className={`w-full text-left rounded-2xl border p-3 flex items-center gap-3 cursor-pointer ${linked ? 'border-black bg-white shadow-sm' : 'border-[#E0E0DE] bg-[#FAFAF8]'}`}><span className="w-11 h-11 rounded-xl bg-[#FFDDE1] flex items-center justify-center shrink-0"><UserRound size={18}/></span><span className="min-w-0 flex-1"><strong className="text-sm block truncate">{shared.projectName}</strong><span className="text-[10px] text-neutral-500 block truncate">{shared.ownerName} · {collaboratorLabel(shared.label)} · {permissionLabel(shared.permission)}</span></span><span className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 ${linked ? 'bg-black border-black text-white' : 'border-[#CFCFCA] bg-white text-transparent'}`}><Check size={14}/></span></button>;
                }) : <div className="p-8 text-center"><Users size={28} className="mx-auto text-neutral-300 mb-2"/><p className="text-sm font-semibold">Nenhum canvas compartilhado encontrado</p><p className="text-xs text-neutral-500 mt-1">Quando um membro da comunidade compartilhar um projeto com você, ele poderá ser relacionado à turma aqui.</p>{onRefreshShared && <button onClick={onRefreshShared} className="mt-4 px-4 py-2.5 rounded-xl border border-[#DCDCD8] bg-white text-xs font-mono font-bold uppercase">Atualizar compartilhados</button>}</div>
              )}
            </div>
            <footer className="p-4 border-t border-[#E0E0DE] flex items-center justify-between gap-3"><span className="text-[10px] text-neutral-500">{picker === 'advisor' ? linkedAdvisorIds.length : linkedCommunityRefs.length} selecionado(s)</span><button onClick={() => { setPicker(null); setQuery(''); }} className="px-5 py-2.5 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase cursor-pointer">Concluir</button></footer>
          </div>
        </div>
      )}

      {peopleOpen && (
        <div className="fixed inset-0 z-[230] bg-black/45 p-3 sm:p-5 flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Gerenciar pessoas e e-mails da rede">
          <div className="w-full max-w-5xl max-h-[92dvh] overflow-hidden rounded-t-3xl sm:rounded-3xl bg-[#FDFDFB] border border-black/10 shadow-2xl flex flex-col">
            <header className="p-4 sm:p-5 border-b border-[#E0E0DE] flex items-start justify-between gap-4 bg-[#FDFDFB]">
              <div className="min-w-0"><span className="text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-400">Rede da professora</span><h2 className="text-xl sm:text-2xl font-bold mt-1">Pessoas, comunidade e e-mails</h2><p className="text-xs text-neutral-500 mt-1 max-w-2xl">Convide e gerencie colaboradores sem criar uma segunda base de usuários. Cada pessoa continua vinculada aos projetos reais da plataforma; se já tiver conta, a conexão é ativada automaticamente.</p></div>
              <button onClick={() => setPeopleOpen(false)} className="w-9 h-9 rounded-xl border border-[#DCDCD8] bg-white flex items-center justify-center cursor-pointer shrink-0" aria-label="Fechar"><X size={16}/></button>
            </header>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
              <section className="rounded-2xl border border-[#EE9BA4] bg-[#FFF1F2] p-4">
                <div className="flex items-start gap-3"><span className="w-10 h-10 rounded-xl bg-[#FFDDE1] flex items-center justify-center shrink-0"><UserPlus size={17}/></span><div><h3 className="font-bold text-sm">Convidar pessoa para um projeto</h3><p className="text-[10px] text-neutral-600 mt-0.5">Use comunidade, cliente, especialista, colega ou outro. O convite fica associado ao e-mail e ao projeto escolhido.</p></div></div>
                {advisorProjects.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-dashed border-[#EE9BA4] bg-white/70 p-4 text-center"><p className="text-xs text-neutral-600">Você precisa ter ao menos um projeto próprio para convidar colaboradores.</p><button onClick={() => { setPeopleOpen(false); onOpenOwnProjects?.(); }} className="mt-3 px-4 py-2.5 rounded-xl bg-black text-white text-[10px] font-mono font-bold uppercase cursor-pointer">Abrir meus projetos</button></div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.4fr_.8fr_.8fr_auto] gap-2 mt-4">
                    <select value={communityProjectId} onChange={(event) => setCommunityProjectId(event.target.value)} className="min-h-11 rounded-xl border border-[#DCDCD8] bg-white px-3 text-sm outline-none focus:border-black">
                      {advisorProjects.map((workspace) => <option key={workspace.project.id} value={workspace.project.id}>{workspace.project.name}</option>)}
                    </select>
                    <input type="email" value={communityEmail} onChange={(event) => setCommunityEmail(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void inviteCommunityPerson(); }} placeholder="pessoa@email.com" className="min-h-11 rounded-xl border border-[#DCDCD8] bg-white px-3 text-sm outline-none focus:border-black" />
                    <select value={communityLabel} onChange={(event) => setCommunityLabel(event.target.value as CollaboratorLabel)} className="min-h-11 rounded-xl border border-[#DCDCD8] bg-white px-3 text-sm">
                      <option value="comunidade">Comunidade</option><option value="cliente">Cliente</option><option value="especialista">Especialista</option><option value="colega">Colega</option><option value="outro">Outro</option>
                    </select>
                    <select value={communityPermission} onChange={(event) => setCommunityPermission(event.target.value as CollaborationPermission)} className="min-h-11 rounded-xl border border-[#DCDCD8] bg-white px-3 text-sm">
                      <option value="comment">Comentar</option><option value="view">Visualizar</option><option value="edit">Editar</option>
                    </select>
                    <button onClick={() => void inviteCommunityPerson()} disabled={communityLoading || !communityEmail.trim()} className="min-h-11 px-4 rounded-xl bg-black text-white text-[10px] font-mono font-bold uppercase tracking-wide cursor-pointer disabled:opacity-40 flex items-center justify-center gap-2"><Mail size={14}/> Convidar</button>
                  </div>
                )}
              </section>

              {communityMessage && <div className="rounded-xl border border-[#DCDCD8] bg-white px-4 py-3 text-xs text-neutral-700">{communityMessage}</div>}

              <section className="rounded-2xl border border-[#E0E0DE] bg-white p-4">
                <div className="flex items-center justify-between gap-3 mb-3"><div><span className="text-[9px] font-mono uppercase tracking-wider text-neutral-400">Colaborações dos seus projetos</span><h3 className="font-bold text-base mt-0.5">{networkCollaborators.length} vínculo(s) · {networkPeople.length} pessoa(s)</h3></div><button onClick={() => void loadNetworkCollaborators()} className="w-9 h-9 rounded-xl border border-[#DCDCD8] bg-white flex items-center justify-center cursor-pointer" title="Atualizar"><RefreshCw size={15} className={communityLoading ? 'animate-spin' : ''}/></button></div>
                {communityLoading && networkCollaborators.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#DCDCD8] p-6 text-center text-xs text-neutral-500">Carregando pessoas da rede...</div>
                ) : networkCollaborators.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#DCDCD8] p-6 text-center"><Mail size={24} className="mx-auto text-neutral-300 mb-2"/><p className="text-xs text-neutral-500">Ainda não há convites ou colaboradores nos seus projetos.</p></div>
                ) : (
                  <div className="space-y-2.5">{networkCollaborators.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-[#E7E7E3] bg-[#FAFAF8] p-3">
                      <div className="flex flex-col xl:flex-row xl:items-center gap-3">
                        <div className="min-w-0 flex-1 flex items-start gap-3"><span className="w-10 h-10 rounded-xl bg-[#FFDDE1] flex items-center justify-center shrink-0"><UserRound size={16}/></span><span className="min-w-0"><strong className="text-sm block truncate">{item.collaboratorName || item.collaboratorEmail}</strong><span className="text-[10px] text-neutral-500 block truncate">{item.collaboratorEmail}</span><span className="text-[9px] text-neutral-400 block truncate mt-1">Projeto: {item.projectName}</span><span className={`inline-flex mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-mono font-bold uppercase ${item.status === 'accepted' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>{item.status === 'accepted' ? 'Conta conectada' : 'Aguardando conta'}</span></span></div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select value={item.label} onChange={(event) => void updateCommunityPerson(item, { label: event.target.value as CollaboratorLabel })} className="min-h-9 rounded-xl border border-[#DCDCD8] bg-white px-2.5 text-xs"><option value="comunidade">Comunidade</option><option value="cliente">Cliente</option><option value="especialista">Especialista</option><option value="colega">Colega</option><option value="outro">Outro</option></select>
                          <select value={item.permission} onChange={(event) => void updateCommunityPerson(item, { permission: event.target.value as CollaborationPermission })} className="min-h-9 rounded-xl border border-[#DCDCD8] bg-white px-2.5 text-xs"><option value="view">Visualizar</option><option value="comment">Comentar</option><option value="edit">Editar</option></select>
                          <button onClick={() => void copyCommunityInvitation(item)} className="w-9 h-9 rounded-xl border border-[#DCDCD8] bg-white flex items-center justify-center cursor-pointer" title="Copiar convite"><Copy size={14}/></button>
                          <button onClick={() => mailCommunityInvitation(item)} className="w-9 h-9 rounded-xl border border-[#DCDCD8] bg-white flex items-center justify-center cursor-pointer" title="Enviar e-mail"><Mail size={14}/></button>
                          <button onClick={() => void removeCommunityPerson(item)} className="w-9 h-9 rounded-xl border border-red-100 bg-white text-red-600 flex items-center justify-center cursor-pointer" title="Remover"><Trash2 size={14}/></button>
                        </div>
                      </div>
                    </div>
                  ))}</div>
                )}
              </section>

              <section className="rounded-2xl border border-[#BE9BE8] bg-[#F7F0FF] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div><h3 className="text-sm font-bold">Quando a comunidade tiver seu próprio canvas</h3><p className="text-[10px] text-neutral-600 mt-1">O projeto compartilhado pela pessoa aparece separadamente em “Canvas da comunidade”. Você pode então vinculá-lo visualmente a qualquer turma sem mudar a autoria.</p></div>
                <button onClick={() => { setPeopleOpen(false); setPicker('community'); }} className="min-h-10 px-4 rounded-xl bg-white border border-[#BE9BE8] text-[10px] font-mono font-bold uppercase cursor-pointer shrink-0 flex items-center justify-center gap-2"><Link2 size={13}/> Vincular canvas recebido</button>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
