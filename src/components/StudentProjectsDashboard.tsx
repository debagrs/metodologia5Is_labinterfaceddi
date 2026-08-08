import { ArrowLeft, FolderOpen, Plus, Trash2, CalendarDays, Layers3, Users, RefreshCw } from 'lucide-react';
import BrandMark from './BrandMark';
import type { ProjectWorkspace, UserProfile, SharedProjectSummary } from '../types';

interface Props {
  user: UserProfile;
  classroomName?: string;
  projects: ProjectWorkspace[];
  onOpen: (projectId: string) => void;
  onCreate?: () => void;
  onDelete?: (projectId: string) => void;
  onLogout?: () => void;
  onBack?: () => void;
  readOnly?: boolean;
  title?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  sharedProjects?: SharedProjectSummary[];
  sharedProjectsLoading?: boolean;
  onOpenShared?: (project: SharedProjectSummary) => void;
  onRefreshShared?: () => void;
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(value));
  } catch {
    return 'Data indisponível';
  }
}

export default function StudentProjectsDashboard({
  user,
  classroomName,
  projects,
  onOpen,
  onCreate,
  onDelete,
  onLogout,
  onBack,
  readOnly = false,
  title,
  emptyTitle = 'Você ainda não possui projetos',
  emptyDescription = 'Crie sua primeira mesa para começar a percorrer Ideação, Inambulação, Instauração, Inspeção e Implementação.',
  sharedProjects = [],
  sharedProjectsLoading = false,
  onOpenShared,
  onRefreshShared,
}: Props) {
  const ordered = [...projects].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  const handleHeaderAction = onBack || onLogout;

  return (
    <div className="min-h-[100dvh] bg-[#FDFDFB] text-neutral-950">
      <header className="sticky top-0 z-20 border-b border-[#E8E8E5] bg-[#FDFDFB]/95 backdrop-blur px-4 sm:px-8 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark compact priority className="w-[38px] h-[33px] shrink-0" />
            <div className="min-w-0">
              <span className="block text-[9px] font-bold uppercase tracking-[0.18em] text-black/40">
                {readOnly ? "Projetos do aluno" : "Meus projetos 5I's"}
              </span>
              <h1 className="text-base sm:text-lg font-bold truncate">
                {readOnly ? user.name : `Olá, ${user.name}`}
              </h1>
              {classroomName && <p className="text-xs text-neutral-500 truncate">{classroomName}</p>}
            </div>
          </div>
          {handleHeaderAction && (
            <button onClick={handleHeaderAction} className="shrink-0 p-2 sm:px-3 sm:py-2 rounded-xl border border-[#DDD] bg-white text-neutral-700 flex items-center gap-2 text-xs font-mono font-bold uppercase cursor-pointer">
              <ArrowLeft size={15} /><span className="hidden sm:inline">{onBack ? 'Voltar' : 'Sair'}</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-[calc(2rem+env(safe-area-inset-bottom))]">
        <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">Mesa de projetos</span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1">{title || 'Escolha onde continuar'}</h2>
            <p className="text-sm text-neutral-500 mt-1">
              {readOnly ? 'Escolha um projeto para visualizar a mesma mesa do aluno.' : 'Abra um projeto existente ou inicie uma nova investigação.'}
            </p>
          </div>
          {!readOnly && onCreate && (
            <button onClick={onCreate} className="w-full sm:w-auto px-5 py-3.5 rounded-xl bg-black text-white flex items-center justify-center gap-2 font-mono text-sm font-bold uppercase tracking-wider shadow-sm cursor-pointer">
              <Plus size={18} /> Novo projeto
            </button>
          )}
        </section>

        {ordered.length === 0 ? (
          <section className="min-h-[360px] border-2 border-dashed border-[#DDD] rounded-3xl flex flex-col items-center justify-center text-center p-8 bg-white">
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center mb-4"><FolderOpen size={30} /></div>
            <h3 className="text-xl font-bold">{emptyTitle}</h3>
            <p className="text-sm text-neutral-500 max-w-md mt-2">{emptyDescription}</p>
            {!readOnly && onCreate && (
              <button onClick={onCreate} className="mt-6 px-5 py-3 rounded-xl bg-black text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer">Criar primeiro projeto</button>
            )}
          </section>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {ordered.map(({ project, nodes, updatedAt }) => (
              <article key={project.id} className="group bg-white border border-[#DFDFDC] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col min-h-[270px]">
                <div className="flex items-start justify-between gap-3">
                  <div className="w-11 h-11 rounded-xl bg-black text-white flex items-center justify-center"><FolderOpen size={21} /></div>
                  {!readOnly && onDelete && (
                    <button onClick={() => onDelete(project.id)} aria-label={`Excluir ${project.name}`} className="p-2 rounded-lg text-neutral-400 hover:text-red-700 hover:bg-red-50 cursor-pointer"><Trash2 size={17} /></button>
                  )}
                </div>
                <div className="mt-5 flex-1">
                  <span className="inline-flex px-2.5 py-1 rounded-full bg-neutral-100 text-[10px] font-mono font-bold uppercase tracking-wide">{project.activePhase}</span>
                  <h3 className="text-xl font-bold leading-tight mt-3 line-clamp-2">{project.name}</h3>
                  <p className="text-sm text-neutral-500 mt-2 line-clamp-3">{project.problem}</p>
                </div>
                <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-[#EEE] text-xs text-neutral-500">
                  <span className="flex items-center gap-1.5"><Layers3 size={14} /> {nodes.length} cards</span>
                  <span className="flex items-center gap-1.5"><CalendarDays size={14} /> {formatDate(updatedAt)}</span>
                </div>
                <button onClick={() => onOpen(project.id)} className="mt-4 w-full py-3 rounded-xl bg-black text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer">Abrir projeto</button>
              </article>
            ))}
          </div>
        )}

        {!readOnly && onOpenShared && (
          <section className="mt-10 pt-8 border-t border-[#E8E8E5]">
            <div className="flex items-start sm:items-center justify-between gap-3 mb-5">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-neutral-400">Colaboração</span>
                <h2 className="text-2xl font-bold mt-1 flex items-center gap-2"><Users size={22}/> Compartilhados comigo</h2>
                <p className="text-sm text-neutral-500 mt-1">Projetos de outras pessoas em que você pode visualizar, comentar ou editar.</p>
              </div>
              {onRefreshShared && <button onClick={onRefreshShared} className="p-2.5 rounded-xl border border-[#DDD] bg-white cursor-pointer" title="Atualizar compartilhados"><RefreshCw size={16} className={sharedProjectsLoading ? 'animate-spin' : ''}/></button>}
            </div>
            {sharedProjectsLoading && sharedProjects.length === 0 ? (
              <div className="border border-dashed border-[#DDD] rounded-2xl p-6 text-sm text-neutral-500 text-center">Carregando projetos compartilhados...</div>
            ) : sharedProjects.length === 0 ? (
              <div className="border border-dashed border-[#DDD] rounded-2xl p-6 text-sm text-neutral-500 text-center">Quando alguém convidar você, o projeto aparecerá aqui automaticamente.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sharedProjects.map((shared) => (
                  <article key={shared.collaborationId} className="bg-white border border-[#DFDFDC] rounded-2xl p-5 shadow-sm flex flex-col min-h-[270px]">
                    <div className="flex items-start justify-between gap-3"><div className="w-11 h-11 rounded-xl bg-emerald-950 text-white flex items-center justify-center"><Users size={21}/></div><span className="text-[10px] font-mono font-bold uppercase px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800">{shared.permission === 'edit' ? 'Pode editar' : shared.permission === 'comment' ? 'Pode comentar' : 'Visualizar'}</span></div>
                    <div className="mt-5 flex-1"><span className="text-[10px] font-mono uppercase text-neutral-400">de {shared.ownerName}</span><h3 className="text-xl font-bold leading-tight mt-2 line-clamp-2">{shared.projectName}</h3><p className="text-sm text-neutral-500 mt-2 line-clamp-3">{shared.projectProblem}</p></div>
                    <div className="flex items-center justify-between gap-3 pt-4 mt-4 border-t border-[#EEE] text-xs text-neutral-500"><span className="flex items-center gap-1.5"><Layers3 size={14}/> {shared.nodeCount} cards</span><span>{shared.activePhase}</span></div>
                    <button onClick={() => onOpenShared(shared)} className="mt-4 w-full py-3 rounded-xl bg-emerald-950 text-white font-mono text-xs font-bold uppercase tracking-wider cursor-pointer">Abrir colaboração</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}
