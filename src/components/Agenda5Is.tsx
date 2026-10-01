import React, { useEffect, useMemo, useState } from 'react';
import {
  Bell, BellRing, CalendarCheck2, CalendarDays, Check, CheckCircle2,
  ChevronRight, Clock3, ExternalLink, Loader2, Pencil, Plus, RefreshCw,
  Trash2, X
} from 'lucide-react';
import type { Project, UserProfile } from '../types';
import { readAuthSession } from '../lib/auth';

type AgendaEvent = {
  id: string;
  creatorId: string;
  creatorName: string;
  classroomId: string | null;
  classroomName: string | null;
  title: string;
  description: string;
  dueAt: string;
  eventType: 'entrega' | 'tarefa' | 'lembrete' | 'encontro';
  projectId: string | null;
  projectName: string | null;
  completedAt: string | null;
  completed: boolean;
  canEdit: boolean;
};

type AgendaClassroom = { id: string; name: string; code: string };
type Filter = 'pendentes' | 'hoje' | 'semana' | 'concluidas' | 'todas';

const NOTIFY_PREF_KEY = '5is_agenda_daily_notifications';

function authHeaders(json = false) {
  const auth = readAuthSession();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(auth?.token ? { Authorization: `Bearer ${auth.token}` } : {}),
  };
}

function localDayKey(value: Date | string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStatus(event: AgendaEvent) {
  if (event.completed) return 'concluida' as const;
  const now = new Date();
  const due = new Date(event.dueAt);
  const today = startOfToday();
  const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);
  const afterTomorrow = new Date(tomorrow); afterTomorrow.setDate(afterTomorrow.getDate() + 1);
  if (due.getTime() < now.getTime()) return 'atrasada' as const;
  if (due >= today && due < tomorrow) return 'hoje' as const;
  if (due >= tomorrow && due < afterTomorrow) return 'amanha' as const;
  return 'proxima' as const;
}

function formatDue(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  }).format(date);
}

function toDateTimeLocal(value?: string) {
  const date = value ? new Date(value) : new Date(Date.now() + 24 * 60 * 60 * 1000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

function googleCalendarUrl(event: AgendaEvent) {
  const start = new Date(event.dueAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const gdate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const details = [
    event.description,
    event.projectName ? `Projeto 5I's: ${event.projectName}` : '',
    event.classroomName ? `Turma: ${event.classroomName}` : '',
    'Criado na Agenda 5I’s.'
  ].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: event.title,
    dates: `${gdate(start)}/${gdate(end)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function statusLabel(status: ReturnType<typeof getStatus>) {
  if (status === 'atrasada') return 'Atrasada';
  if (status === 'hoje') return 'Hoje';
  if (status === 'amanha') return 'Amanhã';
  if (status === 'concluida') return 'Concluída';
  return 'Próxima';
}

function statusClass(status: ReturnType<typeof getStatus>) {
  if (status === 'atrasada') return 'bg-red-50 text-red-700 border-red-200';
  if (status === 'hoje') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (status === 'amanha') return 'bg-sky-50 text-sky-800 border-sky-200';
  if (status === 'concluida') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return 'bg-neutral-50 text-neutral-600 border-neutral-200';
}

async function fetchAgenda() {
  const response = await fetch('/api/agenda', { headers: authHeaders() });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || 'Não foi possível carregar a agenda.');
  return data as { events: AgendaEvent[]; classrooms: AgendaClassroom[]; user: { role: string } };
}

function shouldNotifyToday(events: AgendaEvent[]) {
  return events.filter((event) => {
    const status = getStatus(event);
    return !event.completed && (status === 'hoje' || status === 'atrasada');
  });
}

interface LauncherProps {
  currentUser?: UserProfile | null;
  project?: Project | null;
  className?: string;
  textClassName?: string;
  compact?: boolean;
  label?: string;
}

export function AgendaLauncher({
  currentUser,
  project,
  className = '',
  textClassName = '',
  compact = false,
  label = 'Agenda',
}: LauncherProps) {
  const [open, setOpen] = useState(false);
  const [dueCount, setDueCount] = useState(0);

  const refreshBadge = async () => {
    try {
      const data = await fetchAgenda();
      const actionable = shouldNotifyToday(data.events || []);
      setDueCount(actionable.length);

      if (
        localStorage.getItem(NOTIFY_PREF_KEY) === '1' &&
        typeof Notification !== 'undefined' && Notification.permission === 'granted' &&
        actionable.length > 0
      ) {
        const auth = readAuthSession();
        const today = localDayKey(new Date());
        const key = `5is_agenda_notified_${auth?.ownerId || 'user'}_${today}`;
        if (localStorage.getItem(key) !== '1') {
          new Notification('Agenda 5I’s', {
            body: actionable.length === 1
              ? `Você tem 1 entrega ou tarefa para acompanhar hoje.`
              : `Você tem ${actionable.length} entregas ou tarefas para acompanhar hoje.`,
          });
          localStorage.setItem(key, '1');
        }
      }
    } catch {
      setDueCount(0);
    }
  };

  useEffect(() => { void refreshBadge(); }, [currentUser?.id]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`relative flex items-center justify-center gap-2 cursor-pointer ${className}`}
        title="Agenda 5I’s — entregas, tarefas e Google Agenda"
      >
        <CalendarDays size={compact ? 15 : 16} />
        {!compact && <span className={textClassName}>{label}</span>}
        {dueCount > 0 && (
          <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center shadow-sm">
            {dueCount > 9 ? '9+' : dueCount}
          </span>
        )}
      </button>
      {open && (
        <AgendaPanel
          currentUser={currentUser}
          project={project}
          onClose={() => { setOpen(false); void refreshBadge(); }}
        />
      )}
    </>
  );
}

interface PanelProps {
  currentUser?: UserProfile | null;
  project?: Project | null;
  onClose: () => void;
}

export default function AgendaPanel({ currentUser, project, onClose }: PanelProps) {
  const [events, setEvents] = useState<AgendaEvent[]>([]);
  const [classrooms, setClassrooms] = useState<AgendaClassroom[]>([]);
  const [role, setRole] = useState(currentUser?.role || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('pendentes');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtLocal, setDueAtLocal] = useState(toDateTimeLocal());
  const [eventType, setEventType] = useState<AgendaEvent['eventType']>('entrega');
  const [classroomId, setClassroomId] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(() => localStorage.getItem(NOTIFY_PREF_KEY) === '1');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchAgenda();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setClassrooms(Array.isArray(data.classrooms) ? data.classrooms : []);
      setRole(data.user?.role || currentUser?.role || '');
    } catch (err: any) {
      setError(err?.message || 'Não foi possível carregar a agenda.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const isAdvisor = ['advisor', 'teacher', 'professor'].includes(String(role).toLowerCase());
  const stats = useMemo(() => {
    let today = 0, overdue = 0, upcoming = 0, completed = 0;
    events.forEach((event) => {
      const status = getStatus(event);
      if (status === 'hoje') today += 1;
      else if (status === 'atrasada') overdue += 1;
      else if (status === 'concluida') completed += 1;
      else upcoming += 1;
    });
    return { today, overdue, upcoming, completed };
  }, [events]);

  const visibleEvents = useMemo(() => {
    const today = startOfToday();
    const inSeven = new Date(today); inSeven.setDate(inSeven.getDate() + 7);
    return [...events]
      .filter((event) => {
        const due = new Date(event.dueAt);
        const status = getStatus(event);
        if (filter === 'pendentes') return !event.completed;
        if (filter === 'hoje') return status === 'hoje' || status === 'atrasada';
        if (filter === 'semana') return !event.completed && due >= today && due < inSeven;
        if (filter === 'concluidas') return event.completed;
        return true;
      })
      .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  }, [events, filter]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setDueAtLocal(toDateTimeLocal());
    setEventType('entrega');
    setClassroomId('');
  };

  const startEdit = (event: AgendaEvent) => {
    setEditing(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setDueAtLocal(toDateTimeLocal(event.dueAt));
    setEventType(event.eventType);
    setClassroomId(event.classroomId || '');
    setShowForm(true);
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAtLocal) return;
    setSaving(true); setError('');
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        title: title.trim(), description: description.trim(),
        dueAt: new Date(dueAtLocal).toISOString(), eventType,
        classroomId: isAdvisor ? classroomId || null : null,
        projectId: project?.id || editing?.projectId || null,
        projectName: project?.name || editing?.projectName || null,
      };
      const response = await fetch('/api/agenda', {
        method: editing ? 'PATCH' : 'POST',
        headers: authHeaders(true), body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Não foi possível salvar.');
      setShowForm(false); resetForm(); await load();
    } catch (err: any) { setError(err?.message || 'Não foi possível salvar.'); }
    finally { setSaving(false); }
  };

  const toggleComplete = async (event: AgendaEvent) => {
    const next = !event.completed;
    setEvents((prev) => prev.map((item) => item.id === event.id ? { ...item, completed: next } : item));
    try {
      const response = await fetch('/api/agenda', {
        method: 'POST', headers: authHeaders(true),
        body: JSON.stringify({ action: 'toggleCompletion', eventId: event.id, completed: next }),
      });
      if (!response.ok) throw new Error('Falha');
    } catch { await load(); }
  };

  const deleteEvent = async (event: AgendaEvent) => {
    if (!window.confirm(`Excluir “${event.title}”?`)) return;
    try {
      const response = await fetch(`/api/agenda?id=${encodeURIComponent(event.id)}`, { method: 'DELETE', headers: authHeaders() });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Não foi possível excluir.');
      setEvents((prev) => prev.filter((item) => item.id !== event.id));
    } catch (err: any) { setError(err?.message || 'Não foi possível excluir.'); }
  };

  const toggleNotifications = async () => {
    if (notifyEnabled) {
      localStorage.setItem(NOTIFY_PREF_KEY, '0');
      setNotifyEnabled(false);
      return;
    }
    if (typeof Notification === 'undefined') {
      setError('Este navegador não oferece notificações do sistema. A agenda continuará mostrando os lembretes dentro da plataforma.');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      localStorage.setItem(NOTIFY_PREF_KEY, '1');
      setNotifyEnabled(true);
    } else {
      setError('As notificações não foram autorizadas no navegador.');
    }
  };

  return (
    <div className="fixed inset-0 z-[180] bg-black/45 backdrop-blur-[2px] flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="w-full h-[96dvh] sm:h-[92dvh] sm:max-w-6xl bg-[#FDFDFB] sm:rounded-[28px] shadow-2xl border border-black/10 overflow-hidden flex flex-col">
        <header className="px-4 sm:px-6 py-4 border-b border-[#E8E8E5] bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shrink-0"><CalendarCheck2 size={20} /></span>
            <div className="min-w-0">
              <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-black/40">Organização do projeto</span>
              <h2 className="text-lg sm:text-xl font-bold truncate">Agenda 5I’s</h2>
              <p className="text-[11px] text-neutral-500 truncate">Entregas da turma + tarefas pessoais + Google Agenda</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={toggleNotifications} className={`h-10 px-3 rounded-xl border flex items-center gap-2 text-[10px] font-mono font-bold uppercase cursor-pointer ${notifyEnabled ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-[#DDD] text-neutral-600'}`} title="Lembrete diário neste dispositivo">
              {notifyEnabled ? <BellRing size={15} /> : <Bell size={15} />}<span className="hidden md:inline">{notifyEnabled ? 'Lembretes ativos' : 'Ativar lembretes'}</span>
            </button>
            <button type="button" onClick={onClose} className="h-10 w-10 rounded-xl border border-[#DDD] bg-white flex items-center justify-center cursor-pointer"><X size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
              <button onClick={() => setFilter('hoje')} className="text-left p-4 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer"><span className="text-[10px] uppercase font-mono font-bold text-amber-800">Hoje</span><strong className="block text-2xl mt-1">{stats.today}</strong></button>
              <button onClick={() => setFilter('hoje')} className="text-left p-4 rounded-2xl bg-red-50 border border-red-200 cursor-pointer"><span className="text-[10px] uppercase font-mono font-bold text-red-700">Atrasadas</span><strong className="block text-2xl mt-1">{stats.overdue}</strong></button>
              <button onClick={() => setFilter('semana')} className="text-left p-4 rounded-2xl bg-sky-50 border border-sky-200 cursor-pointer"><span className="text-[10px] uppercase font-mono font-bold text-sky-800">Próximas</span><strong className="block text-2xl mt-1">{stats.upcoming}</strong></button>
              <button onClick={() => setFilter('concluidas')} className="text-left p-4 rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer"><span className="text-[10px] uppercase font-mono font-bold text-emerald-800">Concluídas</span><strong className="block text-2xl mt-1">{stats.completed}</strong></button>
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {([
                  ['pendentes', 'Pendentes'], ['hoje', 'Hoje'], ['semana', '7 dias'], ['concluidas', 'Concluídas'], ['todas', 'Todas']
                ] as Array<[Filter, string]>).map(([value, text]) => (
                  <button key={value} onClick={() => setFilter(value)} className={`shrink-0 px-3 py-2 rounded-full border text-[10px] font-mono font-bold uppercase cursor-pointer ${filter === value ? 'bg-black border-black text-white' : 'bg-white border-[#DDD] text-neutral-600'}`}>{text}</button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => void load()} className="h-10 w-10 rounded-xl border border-[#DDD] bg-white flex items-center justify-center cursor-pointer" title="Atualizar"><RefreshCw size={15} /></button>
                <button type="button" onClick={() => { resetForm(); setShowForm(true); }} className="h-10 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-mono font-bold uppercase cursor-pointer"><Plus size={16} /> Nova entrega/tarefa</button>
              </div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

            {loading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-neutral-500"><Loader2 className="animate-spin" size={18} /> Carregando agenda...</div>
            ) : visibleEvents.length === 0 ? (
              <div className="py-16 border-2 border-dashed border-[#DDD] rounded-3xl bg-white text-center px-6">
                <CalendarDays size={34} className="mx-auto text-neutral-300 mb-3" />
                <h3 className="font-bold">Nenhum item neste filtro</h3>
                <p className="text-sm text-neutral-500 mt-1">Crie uma entrega, tarefa, lembrete ou encontro para começar.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleEvents.map((event) => {
                  const status = getStatus(event);
                  return (
                    <article key={event.id} className={`rounded-2xl border bg-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${event.completed ? 'opacity-65' : 'border-[#E0E0DE]'}`}>
                      <button onClick={() => void toggleComplete(event)} className={`w-9 h-9 rounded-xl border-2 shrink-0 flex items-center justify-center cursor-pointer ${event.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 hover:border-black'}`} title={event.completed ? 'Marcar como pendente' : 'Marcar como concluída'}>
                        {event.completed && <Check size={17} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase ${statusClass(status)}`}>{statusLabel(status)}</span>
                          <span className="text-[9px] font-mono uppercase font-bold text-neutral-400">{event.eventType}</span>
                          {event.classroomName && <span className="text-[9px] font-mono uppercase bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">Turma · {event.classroomName}</span>}
                          {!event.classroomName && <span className="text-[9px] font-mono uppercase bg-neutral-50 text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5">Pessoal</span>}
                        </div>
                        <h3 className={`font-bold text-sm sm:text-base ${event.completed ? 'line-through' : ''}`}>{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1"><Clock3 size={12} /> {formatDue(event.dueAt)}</span>
                          {event.projectName && <span>Projeto: {event.projectName}</span>}
                          {event.creatorName && event.classroomName && <span>por {event.creatorName}</span>}
                        </div>
                        {event.description && <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{event.description}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 sm:self-center">
                        <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-xl border border-[#DDD] hover:border-black bg-white flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase" title="Adicionar ao Google Agenda"><ExternalLink size={13} /> <span className="hidden lg:inline">Google Agenda</span></a>
                        {event.canEdit && <button onClick={() => startEdit(event)} className="h-9 w-9 rounded-xl border border-[#DDD] bg-white flex items-center justify-center cursor-pointer" title="Editar"><Pencil size={13} /></button>}
                        {event.canEdit && <button onClick={() => void deleteEvent(event)} className="h-9 w-9 rounded-xl border border-red-200 bg-red-50 text-red-700 flex items-center justify-center cursor-pointer" title="Excluir"><Trash2 size={13} /></button>}
                        <ChevronRight size={14} className="text-neutral-300 hidden sm:block" />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {showForm && (
        <div className="fixed inset-0 z-[190] bg-black/35 flex items-end sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) { setShowForm(false); resetForm(); } }}>
          <form onSubmit={saveEvent} className="w-full sm:max-w-xl bg-white sm:rounded-3xl shadow-2xl border border-black/10 p-5 sm:p-6 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-5">
              <div><span className="text-[9px] uppercase tracking-widest font-bold text-black/40">Agenda 5I’s</span><h3 className="text-xl font-bold">{editing ? 'Editar item' : 'Nova entrega ou tarefa'}</h3></div>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="h-9 w-9 rounded-xl border border-[#DDD] flex items-center justify-center cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Título</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Entrega da pesquisa com usuários" className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] outline-none focus:border-black" /></label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Data e hora</span><input type="datetime-local" value={dueAtLocal} onChange={(e) => setDueAtLocal(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] outline-none focus:border-black" /></label>
                <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Tipo</span><select value={eventType} onChange={(e) => setEventType(e.target.value as AgendaEvent['eventType'])} className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] bg-white outline-none focus:border-black"><option value="entrega">Entrega</option><option value="tarefa">Tarefa</option><option value="lembrete">Lembrete</option><option value="encontro">Encontro</option></select></label>
              </div>
              {isAdvisor && (
                <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Quem recebe</span><select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] bg-white outline-none focus:border-black"><option value="">Só eu · agenda pessoal</option>{classrooms.map((room) => <option key={room.id} value={room.id}>Turma · {room.name}</option>)}</select><span className="text-[10px] text-neutral-400 mt-1 block">Itens de turma aparecem automaticamente na agenda dos alunos vinculados.</span></label>
              )}
              {!isAdvisor && <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">Esta será uma tarefa pessoal. As entregas publicadas pela professora aparecem automaticamente na sua agenda.</div>}
              {project && <div className="p-3 rounded-xl bg-[#F7F7F5] border border-[#E0E0DE] text-xs"><strong>Vinculada ao projeto:</strong> {project.name}</div>}
              <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Descrição / orientação</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="O que precisa ser entregue? Links, critérios, observações..." className="mt-1.5 w-full p-3 rounded-xl border border-[#CCC] outline-none focus:border-black resize-y" /></label>
            </div>
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="h-11 px-4 rounded-xl border border-[#CCC] text-xs font-mono font-bold uppercase cursor-pointer">Cancelar</button>
              <button disabled={saving || !title.trim() || !dueAtLocal} type="submit" className="h-11 flex-1 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer">{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{editing ? 'Salvar alterações' : 'Criar na agenda'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
