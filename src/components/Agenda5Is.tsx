import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Bell, BellRing, CalendarCheck2, CalendarDays, Check, CheckCircle2,
  ChevronRight, Clock3, Download, ExternalLink, Loader2, Pencil, Plus,
  RefreshCw, Search, Trash2, Users, X
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
  recipientUserIds: string[];
  recipientNames: string[];
  canEdit: boolean;
};

type AgendaClassroom = { id: string; name: string; code: string };
type AgendaStudent = { id: string; name: string; email: string; classroomId: string; classroomName: string };
type Filter = 'pendentes' | 'hoje' | 'semana' | 'concluidas' | 'todas';
type TargetMode = 'personal' | 'classroom' | 'students';

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
    event.recipientNames?.length ? `Compartilhado com: ${event.recipientNames.join(', ')}` : '',
    'Criado na Agenda 5I’s.'
  ].filter(Boolean).join('\n\n');
  const params = new URLSearchParams({
    action: 'TEMPLATE', text: event.title,
    dates: `${gdate(start)}/${gdate(end)}`,
    details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function icsEscape(value: string) {
  return String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function icsDate(date: Date) {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function downloadIcsWithOneDayReminder(event: AgendaEvent) {
  const start = new Date(event.dueAt);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const description = [
    event.description,
    event.projectName ? `Projeto 5I's: ${event.projectName}` : '',
    event.classroomName ? `Turma: ${event.classroomName}` : '',
    'Agenda 5I’s · lembrete programado para 1 dia antes.'
  ].filter(Boolean).join('\n\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'PRODID:-//Metodologia 5Is//Agenda 5Is//PT-BR',
    'BEGIN:VEVENT',
    `UID:${icsEscape(event.id)}@metodologia5is`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(start)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsEscape(event.title)}`,
    `DESCRIPTION:${icsEscape(description)}`,
    `CATEGORIES:${icsEscape(event.eventType.toUpperCase())}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(`Amanhã: ${event.title}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 60) || 'agenda-5is'}.ics`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
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
  if (!response.ok) throw new Error(data?.error || `Não foi possível carregar a agenda (HTTP ${response.status}).`);
  return data as {
    events: AgendaEvent[];
    classrooms: AgendaClassroom[];
    students: AgendaStudent[];
    user: { id: string; role: string };
  };
}

function shouldNotifyToday(events: AgendaEvent[]) {
  return events.filter((event) => {
    const status = getStatus(event);
    return !event.completed && (status === 'hoje' || status === 'atrasada' || status === 'amanha');
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
          const tomorrowCount = actionable.filter((event) => getStatus(event) === 'amanha').length;
          const todayCount = actionable.length - tomorrowCount;
          const parts = [
            todayCount ? `${todayCount} para hoje/atrasada${todayCount === 1 ? '' : 's'}` : '',
            tomorrowCount ? `${tomorrowCount} para amanhã` : '',
          ].filter(Boolean);
          new Notification('Agenda 5I’s', { body: `Você tem ${parts.join(' e ')}.` });
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
  const [students, setStudents] = useState<AgendaStudent[]>([]);
  const [role, setRole] = useState(currentUser?.role || '');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [filter, setFilter] = useState<Filter>('pendentes');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AgendaEvent | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueAtLocal, setDueAtLocal] = useState(toDateTimeLocal());
  const [eventType, setEventType] = useState<AgendaEvent['eventType']>('entrega');
  const [targetMode, setTargetMode] = useState<TargetMode>('personal');
  const [classroomId, setClassroomId] = useState('');
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [notifyEnabled, setNotifyEnabled] = useState(() => localStorage.getItem(NOTIFY_PREF_KEY) === '1');

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await fetchAgenda();
      setEvents(Array.isArray(data.events) ? data.events : []);
      setClassrooms(Array.isArray(data.classrooms) ? data.classrooms : []);
      setStudents(Array.isArray(data.students) ? data.students : []);
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

  const filteredStudents = useMemo(() => {
    const q = studentSearch.trim().toLocaleLowerCase('pt-BR');
    if (!q) return students;
    return students.filter((student) =>
      [student.name, student.email, student.classroomName]
        .some((value) => String(value || '').toLocaleLowerCase('pt-BR').includes(q))
    );
  }, [students, studentSearch]);

  const studentGroups = useMemo(() => classrooms.map((room) => ({
    room,
    students: filteredStudents.filter((student) => student.classroomId === room.id),
  })).filter((group) => group.students.length > 0), [classrooms, filteredStudents]);

  const resetForm = () => {
    setEditing(null);
    setTitle('');
    setDescription('');
    setDueAtLocal(toDateTimeLocal());
    setEventType('entrega');
    setTargetMode('personal');
    setClassroomId('');
    setSelectedRecipientIds([]);
    setStudentSearch('');
  };

  const startEdit = (event: AgendaEvent) => {
    setEditing(event);
    setTitle(event.title);
    setDescription(event.description || '');
    setDueAtLocal(toDateTimeLocal(event.dueAt));
    setEventType(event.eventType);
    setClassroomId(event.classroomId || '');
    setSelectedRecipientIds(Array.isArray(event.recipientUserIds) ? event.recipientUserIds : []);
    setTargetMode(event.recipientUserIds?.length ? 'students' : event.classroomId ? 'classroom' : 'personal');
    setStudentSearch('');
    setShowForm(true);
  };

  const toggleStudent = (id: string) => {
    setSelectedRecipientIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]);
  };

  const toggleWholeGroup = (groupStudents: AgendaStudent[]) => {
    const ids = [...new Set(groupStudents.map((student) => student.id))];
    const allSelected = ids.every((id) => selectedRecipientIds.includes(id));
    setSelectedRecipientIds((prev) => {
      if (allSelected) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const saveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !dueAtLocal) return;
    if (isAdvisor && targetMode === 'classroom' && !classroomId) {
      setError('Escolha a turma que deve receber esta entrega.');
      return;
    }
    if (isAdvisor && targetMode === 'students' && selectedRecipientIds.length === 0) {
      setError('Escolha pelo menos um aluno para compartilhar esta agenda.');
      return;
    }

    setSaving(true); setError(''); setNotice('');
    try {
      const payload = {
        ...(editing ? { id: editing.id } : {}),
        title: title.trim(), description: description.trim(),
        dueAt: new Date(dueAtLocal).toISOString(), eventType,
        classroomId: isAdvisor && targetMode === 'classroom' ? classroomId : null,
        recipientUserIds: isAdvisor && targetMode === 'students' ? selectedRecipientIds : [],
        projectId: project?.id || editing?.projectId || null,
        projectName: project?.name || editing?.projectName || null,
      };
      const response = await fetch('/api/agenda', {
        method: editing ? 'PATCH' : 'POST',
        headers: authHeaders(true), body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || `Não foi possível salvar (HTTP ${response.status}).`);
      setShowForm(false);
      const successText = editing
        ? 'Alterações salvas na agenda.'
        : targetMode === 'students'
          ? `Agenda salva e compartilhada com ${selectedRecipientIds.length} aluno${selectedRecipientIds.length === 1 ? '' : 's'}.`
          : targetMode === 'classroom'
            ? 'Agenda salva e compartilhada com a turma.'
            : 'Tarefa salva na sua agenda.';
      resetForm();
      await load();
      setNotice(successText);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível salvar.');
    } finally { setSaving(false); }
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
      setNotice('Item excluído da agenda.');
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
      setNotice('Lembretes ativados neste dispositivo. A agenda também avisará sobre atividades do dia seguinte.');
    } else {
      setError('As notificações não foram autorizadas no navegador.');
    }
  };

  const exportWithReminder = (event: AgendaEvent) => {
    downloadIcsWithOneDayReminder(event);
    setNotice('Arquivo de calendário criado com lembrete para 1 dia antes. Abra o arquivo .ics e adicione-o ao Google Agenda.');
  };

  return createPortal((
    <div className="fixed inset-0 z-[9999] bg-black/45 backdrop-blur-[2px] flex items-stretch sm:items-center justify-center sm:p-4 overscroll-none" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section className="w-full h-[100dvh] sm:h-[92dvh] sm:max-w-6xl bg-[#FDFDFB] sm:rounded-[28px] shadow-2xl border-0 sm:border border-black/10 overflow-hidden flex flex-col">
        <header className="px-3 sm:px-6 py-2.5 sm:py-4 border-b border-[#E8E8E5] bg-white flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <span className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-black text-white flex items-center justify-center shrink-0"><CalendarCheck2 size={18} /></span>
            <div className="min-w-0">
              <span className="hidden sm:block text-[9px] uppercase tracking-[0.2em] font-bold text-black/40">Organização do projeto</span>
              <h2 className="text-base sm:text-xl font-bold truncate">Agenda 5I’s</h2>
              <p className="hidden sm:block text-[11px] text-neutral-500 truncate">Entregas compartilhadas + tarefas pessoais + Google Agenda</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button type="button" onClick={toggleNotifications} className={`h-9 sm:h-10 w-9 sm:w-auto sm:px-3 rounded-xl border flex items-center justify-center sm:gap-2 text-[10px] font-mono font-bold uppercase cursor-pointer ${notifyEnabled ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-[#DDD] text-neutral-600'}`} title="Lembretes neste dispositivo">
              {notifyEnabled ? <BellRing size={15} /> : <Bell size={15} />}<span className="hidden md:inline">{notifyEnabled ? 'Lembretes ativos' : 'Ativar lembretes'}</span>
            </button>
            <button type="button" onClick={onClose} className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl border border-[#DDD] bg-white flex items-center justify-center cursor-pointer"><X size={18} /></button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-3 sm:space-y-5">
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2.5">
              <button onClick={() => setFilter('hoje')} className="min-w-0 text-left px-2 py-2 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer"><span className="block truncate text-[8px] sm:text-[10px] uppercase font-mono font-bold text-amber-800">Hoje</span><strong className="block text-lg sm:text-2xl leading-none mt-1">{stats.today}</strong></button>
              <button onClick={() => setFilter('hoje')} className="min-w-0 text-left px-2 py-2 sm:p-4 rounded-xl sm:rounded-2xl bg-red-50 border border-red-200 cursor-pointer"><span className="block truncate text-[8px] sm:text-[10px] uppercase font-mono font-bold text-red-700">Atrasadas</span><strong className="block text-lg sm:text-2xl leading-none mt-1">{stats.overdue}</strong></button>
              <button onClick={() => setFilter('pendentes')} className="min-w-0 text-left px-2 py-2 sm:p-4 rounded-xl sm:rounded-2xl bg-sky-50 border border-sky-200 cursor-pointer"><span className="block truncate text-[8px] sm:text-[10px] uppercase font-mono font-bold text-sky-800">Próximas</span><strong className="block text-lg sm:text-2xl leading-none mt-1">{stats.upcoming}</strong></button>
              <button onClick={() => setFilter('concluidas')} className="min-w-0 text-left px-2 py-2 sm:p-4 rounded-xl sm:rounded-2xl bg-emerald-50 border border-emerald-200 cursor-pointer"><span className="block truncate text-[8px] sm:text-[10px] uppercase font-mono font-bold text-emerald-800">Concluídas</span><strong className="block text-lg sm:text-2xl leading-none mt-1">{stats.completed}</strong></button>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 sm:gap-3">
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                {([
                  ['pendentes', 'Pendentes'], ['hoje', 'Hoje'], ['semana', '7 dias'], ['concluidas', 'Concluídas'], ['todas', 'Todas']
                ] as [Filter, string][]).map(([value, label]) => (
                  <button key={value} onClick={() => setFilter(value)} className={`h-8 sm:h-10 px-2.5 sm:px-4 whitespace-nowrap rounded-lg sm:rounded-xl border text-[10px] sm:text-xs font-mono font-bold uppercase cursor-pointer ${filter === value ? 'bg-black border-black text-white' : 'bg-white border-[#DDD] text-neutral-600'}`}>{label}</button>
                ))}
              </div>
              <div className="grid grid-cols-[40px_1fr] sm:flex gap-2">
                <button type="button" onClick={() => void load()} className="h-10 w-10 rounded-xl border border-[#DDD] bg-white flex items-center justify-center cursor-pointer" title="Atualizar"><RefreshCw size={15} /></button>
                <button type="button" onClick={() => { resetForm(); setError(''); setNotice(''); setShowForm(true); }} className="h-10 w-full sm:w-auto px-3 sm:px-4 rounded-xl bg-black text-white flex items-center justify-center gap-2 text-[10px] sm:text-xs font-mono font-bold uppercase cursor-pointer"><Plus size={16} /> Nova entrega/tarefa</button>
              </div>
            </div>

            {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            {notice && <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">{notice}</div>}

            {loading ? (
              <div className="py-16 flex items-center justify-center gap-2 text-neutral-500"><Loader2 className="animate-spin" size={18} /> Carregando agenda...</div>
            ) : visibleEvents.length === 0 ? (
              <div className="py-8 sm:py-16 border-2 border-dashed border-[#DDD] rounded-3xl bg-white text-center px-6">
                <CalendarDays size={34} className="mx-auto text-neutral-300 mb-3" />
                <h3 className="font-bold">Nenhum item neste filtro</h3>
                <p className="text-sm text-neutral-500 mt-1">Crie uma entrega, tarefa, lembrete ou encontro para começar.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {visibleEvents.map((event) => {
                  const status = getStatus(event);
                  const directRecipients = Array.isArray(event.recipientNames) ? event.recipientNames : [];
                  return (
                    <article key={event.id} className={`rounded-2xl border bg-white p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${event.completed ? 'opacity-65' : 'border-[#E0E0DE]'}`}>
                      <button onClick={() => void toggleComplete(event)} className={`w-9 h-9 rounded-xl border-2 shrink-0 flex items-center justify-center cursor-pointer ${event.completed ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-neutral-300 hover:border-black'}`} title={event.completed ? 'Marcar como pendente' : 'Marcar como concluída'}>
                        {event.completed && <Check size={17} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full border text-[9px] font-mono font-bold uppercase ${statusClass(status)}`}>{statusLabel(status)}</span>
                          <span className="text-[9px] font-mono uppercase font-bold text-neutral-400">{event.eventType}</span>
                          {directRecipients.length > 0 ? (
                            <span className="text-[9px] font-mono uppercase bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">Compartilhada · {directRecipients.length} aluno{directRecipients.length === 1 ? '' : 's'}</span>
                          ) : event.classroomName ? (
                            <span className="text-[9px] font-mono uppercase bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">Turma · {event.classroomName}</span>
                          ) : (
                            <span className="text-[9px] font-mono uppercase bg-neutral-50 text-neutral-500 border border-neutral-200 rounded-full px-2 py-0.5">Pessoal</span>
                          )}
                        </div>
                        <h3 className={`font-bold text-sm sm:text-base ${event.completed ? 'line-through' : ''}`}>{event.title}</h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-neutral-500">
                          <span className="flex items-center gap-1"><Clock3 size={12} /> {formatDue(event.dueAt)}</span>
                          {event.projectName && <span>Projeto: {event.projectName}</span>}
                          {event.creatorName && (event.classroomName || directRecipients.length > 0) && <span>por {event.creatorName}</span>}
                        </div>
                        {event.canEdit && directRecipients.length > 0 && <p className="text-[11px] text-violet-700 mt-1.5 line-clamp-2"><strong>Para:</strong> {directRecipients.join(', ')}</p>}
                        {event.description && <p className="text-xs text-neutral-600 mt-2 line-clamp-2">{event.description}</p>}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 sm:self-center">
                        <button type="button" onClick={() => exportWithReminder(event)} className="h-9 px-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase cursor-pointer" title="Criar arquivo para Google Agenda com lembrete 1 dia antes"><Download size={13} /> <span>Google + 1 dia</span></button>
                        <a href={googleCalendarUrl(event)} target="_blank" rel="noreferrer" className="h-9 px-3 rounded-xl border border-[#DDD] hover:border-black bg-white flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase" title="Abrir no Google Agenda"><ExternalLink size={13} /> <span className="hidden lg:inline">Abrir Google</span></a>
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
        <div className="fixed inset-0 z-[10010] bg-black/35 flex items-stretch sm:items-center justify-center sm:p-4" onMouseDown={(e) => { if (e.target === e.currentTarget && !saving) { setShowForm(false); resetForm(); } }}>
          <form onSubmit={saveEvent} className="w-full h-[100dvh] sm:h-auto sm:max-w-2xl bg-white sm:rounded-3xl shadow-2xl border-0 sm:border border-black/10 p-4 sm:p-6 sm:max-h-[92dvh] overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-10 -mx-4 -mt-4 sm:mx-0 sm:mt-0 px-4 sm:px-0 pt-3 sm:pt-0 pb-3 sm:pb-0 bg-white flex items-start justify-between gap-3 mb-4 sm:mb-5 border-b sm:border-b-0 border-[#EEE]">
              <div><span className="text-[9px] uppercase tracking-widest font-bold text-black/40">Agenda 5I’s</span><h3 className="text-xl font-bold">{editing ? 'Editar item' : 'Nova entrega ou tarefa'}</h3></div>
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="h-9 w-9 rounded-xl border border-[#DDD] flex items-center justify-center cursor-pointer"><X size={16} /></button>
            </div>
            <div className="space-y-4">
              <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Título</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Entrega da pesquisa com usuários" className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] outline-none focus:border-black" /></label>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Data e hora</span><input type="datetime-local" value={dueAtLocal} onChange={(e) => setDueAtLocal(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] outline-none focus:border-black" /></label>
                <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Tipo</span><select value={eventType} onChange={(e) => setEventType(e.target.value as AgendaEvent['eventType'])} className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] bg-white outline-none focus:border-black"><option value="entrega">Entrega</option><option value="tarefa">Tarefa</option><option value="lembrete">Lembrete</option><option value="encontro">Encontro</option></select></label>
              </div>

              {isAdvisor ? (
                <div className="space-y-3 rounded-2xl border border-[#DDD] p-4 bg-[#FCFCFA]">
                  <div className="flex items-center gap-2"><Users size={16} /><div><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Quem recebe</span><p className="text-xs text-neutral-500">Pode misturar alunos de turmas diferentes na mesma agenda.</p></div></div>
                  <select value={targetMode} onChange={(e) => { const mode = e.target.value as TargetMode; setTargetMode(mode); if (mode !== 'classroom') setClassroomId(''); if (mode !== 'students') setSelectedRecipientIds([]); }} className="w-full h-11 px-3 rounded-xl border border-[#CCC] bg-white outline-none focus:border-black">
                    <option value="personal">Só eu · agenda pessoal</option>
                    <option value="classroom">Uma turma inteira</option>
                    <option value="students">Escolher alunos · inclusive de turmas diferentes</option>
                  </select>

                  {targetMode === 'classroom' && (
                    <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Turma</span><select value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className="mt-1.5 w-full h-11 px-3 rounded-xl border border-[#CCC] bg-white outline-none focus:border-black"><option value="">Escolha uma turma</option>{classrooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select><span className="text-[10px] text-neutral-400 mt-1 block">A entrega aparece para os integrantes vinculados a esta turma.</span></label>
                  )}

                  {targetMode === 'students' && (
                    <div className="space-y-3">
                      <div className="flex flex-col sm:flex-row gap-2 sm:items-center justify-between">
                        <div className="relative flex-1"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"/><input value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)} placeholder="Buscar aluno, e-mail ou turma" className="w-full h-10 pl-9 pr-3 rounded-xl border border-[#CCC] bg-white outline-none focus:border-black text-sm" /></div>
                        <span className="shrink-0 px-3 py-2 rounded-xl bg-violet-50 border border-violet-200 text-violet-800 text-xs font-bold">{selectedRecipientIds.length} selecionado{selectedRecipientIds.length === 1 ? '' : 's'}</span>
                      </div>
                      <div className="max-h-64 overflow-y-auto space-y-3 pr-1">
                        {studentGroups.length === 0 ? (
                          <div className="p-4 border border-dashed border-[#CCC] rounded-xl text-center text-xs text-neutral-500">Nenhum aluno cadastrado foi encontrado.</div>
                        ) : studentGroups.map(({ room, students: groupStudents }) => {
                          const uniqueIds = [...new Set(groupStudents.map((student) => student.id))];
                          const allSelected = uniqueIds.length > 0 && uniqueIds.every((id) => selectedRecipientIds.includes(id));
                          return (
                            <section key={room.id} className="rounded-xl border border-[#E4E4E0] bg-white overflow-hidden">
                              <div className="px-3 py-2 bg-neutral-50 border-b border-[#E8E8E5] flex items-center justify-between gap-2"><strong className="text-xs">{room.name}</strong><button type="button" onClick={() => toggleWholeGroup(groupStudents)} className="text-[10px] font-mono font-bold uppercase underline underline-offset-2 cursor-pointer">{allSelected ? 'Limpar turma' : 'Selecionar turma'}</button></div>
                              <div className="divide-y divide-[#EEE]">
                                {groupStudents.map((student) => (
                                  <label key={`${room.id}-${student.id}`} className="px-3 py-2.5 flex items-center gap-3 cursor-pointer hover:bg-neutral-50">
                                    <input type="checkbox" checked={selectedRecipientIds.includes(student.id)} onChange={() => toggleStudent(student.id)} className="w-4 h-4 accent-black" />
                                    <div className="min-w-0"><span className="block text-sm font-semibold truncate">{student.name}</span>{student.email && <span className="block text-[10px] text-neutral-400 truncate">{student.email}</span>}</div>
                                  </label>
                                ))}
                              </div>
                            </section>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200 text-xs text-neutral-600">Esta será uma tarefa pessoal. As entregas que a professora compartilhar diretamente com você ou com sua turma aparecem automaticamente aqui.</div>
              )}

              {project && <div className="p-3 rounded-xl bg-[#F7F7F5] border border-[#E0E0DE] text-xs"><strong>Vinculada ao projeto:</strong> {project.name}</div>}
              <label className="block"><span className="text-[10px] font-mono font-bold uppercase text-neutral-500">Descrição / orientação</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="O que precisa ser entregue? Links, critérios, observações..." className="mt-1.5 w-full p-3 rounded-xl border border-[#CCC] outline-none focus:border-black resize-y" /></label>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900"><strong>Google Agenda:</strong> depois de salvar, use <strong>Google + 1 dia</strong>. O arquivo de calendário leva um alerta programado para 24 horas antes da entrega.</div>
            </div>
            {error && <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <div className="flex gap-2 mt-6">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="h-11 px-4 rounded-xl border border-[#CCC] text-xs font-mono font-bold uppercase cursor-pointer">Cancelar</button>
              <button disabled={saving || !title.trim() || !dueAtLocal} type="submit" className="h-11 flex-1 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer">{saving ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{editing ? 'Salvar alterações' : 'Criar na agenda'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  ), document.body);
}
