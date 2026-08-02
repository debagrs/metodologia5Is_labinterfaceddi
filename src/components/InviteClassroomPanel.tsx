import React, { useEffect, useState } from 'react';
import { Check, Copy, Link2, Loader2, Mail, MessageCircle, RefreshCw, Send, X } from 'lucide-react';
import type { Classroom } from '../types';
import { readAuthSession } from '../lib/auth';

interface JoinedMember { id: string; name: string; email: string; joinedAt: string; }
interface Props { classroom: Classroom; onClose: () => void; }

export default function InviteClassroomPanel({ classroom, onClose }: Props) {
  const [inviteUrl, setInviteUrl] = useState('');
  const [members, setMembers] = useState<JoinedMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const session = readAuthSession();

  async function loadMembers() {
    if (!session?.token) return;
    setLoadingMembers(true);
    try {
      const response = await fetch(`/api/invitations?classroomId=${encodeURIComponent(classroom.id)}`, {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Não foi possível carregar os participantes.');
      setMembers(Array.isArray(data.members) ? data.members : []);
    } catch (err: any) { setError(err.message || 'Falha ao carregar participantes.'); }
    finally { setLoadingMembers(false); }
  }

  useEffect(() => { loadMembers(); }, [classroom.id]);

  async function createInvite() {
    if (!session?.token) return setError('Sua sessão expirou. Entre novamente.');
    setLoading(true); setError(''); setCopied(false);
    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}` },
        body: JSON.stringify({ classroom }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error || 'Não foi possível criar o convite.');
      setInviteUrl(String(data.url));
    } catch (err: any) { setError(err.message || 'Falha ao criar convite.'); }
    finally { setLoading(false); }
  }

  async function copyInvite() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  const message = `Olá! Você foi convidado(a) para participar da turma “${classroom.name}” no Laboratório da Metodologia 5I’s. Abra este link para criar sua conta e entrar na turma: ${inviteUrl}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const mailUrl = `mailto:?subject=${encodeURIComponent(`Convite — ${classroom.name}`)}&body=${encodeURIComponent(message)}`;

  return <div className="fixed inset-0 z-[120] bg-black/45 p-3 sm:p-6 flex items-end sm:items-center justify-center" onMouseDown={(event)=>{ if(event.target===event.currentTarget) onClose(); }}>
    <div className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white border border-[#E0E0DE] shadow-2xl">
      <header className="sticky top-0 z-10 bg-white border-b border-[#E0E0DE] p-5 flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-400">Convidar estudantes</p><h2 className="font-bold text-lg mt-1">{classroom.name}</h2><p className="text-xs text-neutral-500 mt-1">Código: {classroom.code}</p></div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-neutral-100 cursor-pointer" aria-label="Fechar"><X size={18}/></button>
      </header>

      <div className="p-5 space-y-5">
        <section className="rounded-2xl border border-[#E0E0DE] bg-[#F9F9F8] p-4">
          <div className="flex items-center gap-2"><Link2 size={17}/><h3 className="text-sm font-bold">Link de entrada da turma</h3></div>
          <p className="text-xs text-neutral-500 mt-2 leading-relaxed">Cada link pode ser usado por uma pessoa e expira em 30 dias. Para vários estudantes, gere um novo link para cada aluno.</p>
          {!inviteUrl ? <button onClick={createInvite} disabled={loading} className="mt-4 w-full bg-black text-white rounded-full py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">
            {loading ? <><Loader2 size={15} className="animate-spin"/>Gerando...</> : <><Send size={15}/>Gerar convite</>}
          </button> : <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-[#D8D8D5] bg-white p-3 text-[11px] font-mono break-all select-text">{inviteUrl}</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button onClick={copyInvite} className="rounded-xl border border-[#D8D8D5] p-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:border-black">{copied?<Check size={14}/>:<Copy size={14}/>} {copied?'Copiado':'Copiar'}</button>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-xl border border-[#D8D8D5] p-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-black"><MessageCircle size={14}/>WhatsApp</a>
              <a href={mailUrl} className="rounded-xl border border-[#D8D8D5] p-2.5 text-xs font-bold flex items-center justify-center gap-1.5 hover:border-black"><Mail size={14}/>E-mail</a>
              <button onClick={createInvite} disabled={loading} className="rounded-xl border border-[#D8D8D5] p-2.5 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer hover:border-black"><RefreshCw size={14}/>Novo</button>
            </div>
          </div>}
        </section>

        {error && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}

        <section>
          <div className="flex items-center justify-between"><div><h3 className="text-sm font-bold">Contas que já entraram</h3><p className="text-[11px] text-neutral-500 mt-1">Atualize depois que os alunos abrirem os convites.</p></div><button onClick={loadMembers} disabled={loadingMembers} className="p-2 rounded-full border border-[#E0E0DE] cursor-pointer"><RefreshCw size={14} className={loadingMembers?'animate-spin':''}/></button></div>
          <div className="mt-3 space-y-2">
            {members.length ? members.map(member=><div key={member.id} className="rounded-xl border border-[#E0E0DE] p-3 flex items-center justify-between gap-3"><div><strong className="text-sm block">{member.name}</strong><span className="text-[11px] text-neutral-500">{member.email}</span></div><span className="text-[9px] font-mono text-neutral-400 uppercase">Entrou</span></div>) : <div className="rounded-xl border border-dashed border-[#D8D8D5] p-5 text-center text-xs text-neutral-400">Nenhum estudante entrou por convite ainda.</div>}
          </div>
        </section>
      </div>
    </div>
  </div>;
}
