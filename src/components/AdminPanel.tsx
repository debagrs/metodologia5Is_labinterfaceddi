import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Settings, BookOpen, Users, Trash2, RefreshCw, Mail,
  AlertTriangle, UserMinus, Loader2
} from 'lucide-react';
import type { Classroom, StudentProfile } from '../types';
import { readAuthSession } from '../lib/auth';

type CloudMember = {
  id: string;
  name: string;
  email: string;
  classroomId: string;
  classroomName: string;
  joinedAt: string;
};

type CloudInvitation = {
  token: string;
  classroomId: string;
  classroomName: string;
  createdAt: string;
  expiresAt: string;
  acceptedBy?: string | null;
};

interface AdminPanelProps {
  classrooms: Classroom[];
  students: StudentProfile[];
  onClose: () => void;
  onDeleteClassroom: (classroomId: string) => void;
  onDeleteStudent: (studentId: string) => void;
}

export default function AdminPanel({
  classrooms,
  students,
  onClose,
  onDeleteClassroom,
  onDeleteStudent,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'turmas' | 'alunos' | 'convites'>('turmas');
  const [cloudMembers, setCloudMembers] = useState<CloudMember[]>([]);
  const [cloudInvitations, setCloudInvitations] = useState<CloudInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const auth = readAuthSession();

  const loadCloudData = async () => {
    if (!auth?.token) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/invitations?admin=1', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Não foi possível carregar a administração.');
      setCloudMembers(Array.isArray(data.members) ? data.members : []);
      setCloudInvitations(Array.isArray(data.invitations) ? data.invitations : []);
    } catch (error: any) {
      setMessage(error?.message || 'Falha ao carregar os dados da administração.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCloudData(); }, []);

  const localStudentsByClass = useMemo(() => {
    const map = new Map<string, StudentProfile[]>();
    for (const student of students) {
      const list = map.get(student.classroomId) || [];
      list.push(student);
      map.set(student.classroomId, list);
    }
    return map;
  }, [students]);

  const confirmTyped = (label: string, expected: string) => {
    const typed = window.prompt(`${label}\n\nDigite ${expected} para confirmar:`);
    return typed?.trim().toUpperCase() === expected;
  };

  const deleteClassroom = async (classroom: Classroom) => {
    if (!confirmTyped(
      `Excluir a turma “${classroom.name}”? Os alunos locais, convites e vínculos dessa turma também serão removidos.`,
      'EXCLUIR'
    )) return;

    try {
      if (auth?.token) {
        const response = await fetch('/api/invitations', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${auth.token}`,
          },
          body: JSON.stringify({ action: 'deleteClassroom', classroomId: classroom.id }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok && response.status !== 404) {
          throw new Error(data?.error || 'Falha ao excluir a turma no Turso.');
        }
      }
      onDeleteClassroom(classroom.id);
      setMessage('Turma excluída.');
      await loadCloudData();
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível excluir a turma.');
    }
  };

  const deleteLocalStudent = (student: StudentProfile) => {
    if (!confirmTyped(`Remover “${student.name}” desta turma? A conta da pessoa não será apagada.`, 'REMOVER')) return;
    onDeleteStudent(student.id);
    setMessage('Aluno removido da lista local.');
  };

  const removeCloudMember = async (member: CloudMember) => {
    if (!auth?.token) return;
    if (!confirmTyped(`Remover “${member.name}” da turma “${member.classroomName}”?`, 'REMOVER')) return;
    setLoading(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          action: 'removeMember',
          classroomId: member.classroomId,
          userId: member.id,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Falha ao remover o participante.');
      setMessage('Participante removido da turma.');
      await loadCloudData();
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível remover o participante.');
    } finally {
      setLoading(false);
    }
  };

  const cancelInvitation = async (invitation: CloudInvitation) => {
    if (!auth?.token) return;
    if (!window.confirm(`Cancelar o convite da turma “${invitation.classroomName}”?`)) return;
    setLoading(true);
    try {
      const response = await fetch('/api/invitations', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ action: 'cancelInvitation', token: invitation.token }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Falha ao cancelar o convite.');
      setMessage('Convite cancelado.');
      await loadCloudData();
    } catch (error: any) {
      setMessage(error?.message || 'Não foi possível cancelar o convite.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/45 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <section className="w-full max-w-5xl max-h-[92vh] bg-[#FDFDFB] border border-black/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        <header className="px-5 py-4 border-b border-[#E0E0DE] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center"><Settings size={19} /></div>
            <div>
              <span className="text-[9px] uppercase tracking-widest font-bold text-neutral-400">Painel de administração</span>
              <h2 className="text-lg font-bold text-neutral-950">Turmas, alunos e convites</h2>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl border border-[#E0E0DE] hover:bg-neutral-100 cursor-pointer" aria-label="Fechar administração"><X size={18} /></button>
        </header>

        <div className="px-4 sm:px-5 py-3 border-b border-[#E0E0DE] bg-white flex flex-wrap items-center gap-2">
          {([
            ['turmas', BookOpen, `Turmas (${classrooms.length})`],
            ['alunos', Users, `Alunos (${students.length + cloudMembers.length})`],
            ['convites', Mail, `Convites (${cloudInvitations.length})`],
          ] as const).map(([id, Icon, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`px-3.5 py-2 rounded-xl border text-xs font-mono font-bold uppercase flex items-center gap-2 cursor-pointer ${tab === id ? 'bg-black text-white border-black' : 'bg-white text-neutral-700 border-[#E0E0DE] hover:border-black'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
          <button onClick={loadCloudData} disabled={loading} className="ml-auto p-2 rounded-xl border border-[#E0E0DE] hover:border-black cursor-pointer disabled:opacity-50" title="Atualizar dados do Turso">
            {loading ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
          </button>
        </div>

        {message && <div className="mx-5 mt-4 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">{message}</div>}

        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {tab === 'turmas' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex gap-2 text-xs text-red-800"><AlertTriangle size={16} className="shrink-0" /><span>Excluir uma turma remove a turma da sua lista, os alunos locais, os convites e os vínculos no Turso. A confirmação exige digitar EXCLUIR.</span></div>
              {classrooms.map((classroom) => {
                const count = localStudentsByClass.get(classroom.id)?.length || 0;
                const cloudCount = cloudMembers.filter((m) => m.classroomId === classroom.id).length;
                return (
                  <article key={classroom.id} className="p-4 bg-white border border-[#E0E0DE] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-sm text-neutral-950">{classroom.name}</h3>
                      <p className="text-[10px] font-mono text-neutral-500 mt-1">Código {classroom.code} · {count} locais · {cloudCount} por convite</p>
                    </div>
                    <button onClick={() => deleteClassroom(classroom)} className="px-3 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-mono font-bold uppercase flex items-center justify-center gap-2 cursor-pointer"><Trash2 size={14} /> Excluir turma</button>
                  </article>
                );
              })}
              {classrooms.length === 0 && <p className="text-center text-sm text-neutral-400 py-10">Nenhuma turma cadastrada.</p>}
            </div>
          )}

          {tab === 'alunos' && (
            <div className="space-y-5">
              <section>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 mb-2">Alunos da lista do projeto</h3>
                <div className="space-y-2">
                  {students.map((student) => {
                    const classroom = classrooms.find((c) => c.id === student.classroomId);
                    return (
                      <article key={student.id} className="p-3.5 bg-white border border-[#E0E0DE] rounded-xl flex items-center justify-between gap-3">
                        <div><strong className="text-sm block">{student.name}</strong><span className="text-[10px] text-neutral-500 font-mono">{classroom?.name || 'Turma não encontrada'}</span></div>
                        <button onClick={() => deleteLocalStudent(student)} className="p-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer" title="Remover aluno"><UserMinus size={16} /></button>
                      </article>
                    );
                  })}
                  {students.length === 0 && <p className="text-xs text-neutral-400">Nenhum aluno local.</p>}
                </div>
              </section>

              <section>
                <h3 className="text-[10px] font-mono font-bold uppercase tracking-widest text-neutral-400 mb-2">Contas que entraram por convite</h3>
                <div className="space-y-2">
                  {cloudMembers.map((member) => (
                    <article key={`${member.classroomId}-${member.id}`} className="p-3.5 bg-white border border-[#E0E0DE] rounded-xl flex items-center justify-between gap-3">
                      <div><strong className="text-sm block">{member.name}</strong><span className="text-[10px] text-neutral-500 font-mono">{member.email} · {member.classroomName}</span></div>
                      <button onClick={() => removeCloudMember(member)} className="p-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 cursor-pointer" title="Remover da turma"><UserMinus size={16} /></button>
                    </article>
                  ))}
                  {cloudMembers.length === 0 && <p className="text-xs text-neutral-400">Nenhuma conta entrou por convite ainda.</p>}
                </div>
              </section>
            </div>
          )}

          {tab === 'convites' && (
            <div className="space-y-2">
              {cloudInvitations.map((invitation) => {
                const used = Boolean(invitation.acceptedBy);
                const expired = new Date(invitation.expiresAt).getTime() < Date.now();
                return (
                  <article key={invitation.token} className="p-3.5 bg-white border border-[#E0E0DE] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <strong className="text-sm block">{invitation.classroomName}</strong>
                      <span className="text-[10px] font-mono text-neutral-500">{used ? 'Utilizado' : expired ? 'Expirado' : 'Ativo'} · expira em {new Date(invitation.expiresAt).toLocaleDateString('pt-BR')}</span>
                    </div>
                    {!used && <button onClick={() => cancelInvitation(invitation)} className="px-3 py-2 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-mono font-bold uppercase flex items-center gap-2 cursor-pointer"><Trash2 size={14} /> Cancelar</button>}
                  </article>
                );
              })}
              {cloudInvitations.length === 0 && <p className="text-center text-sm text-neutral-400 py-10">Nenhum convite criado.</p>}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
