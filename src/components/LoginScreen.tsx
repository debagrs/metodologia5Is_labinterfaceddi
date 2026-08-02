import React, { useEffect, useState } from 'react';
import { ArrowLeft, GraduationCap, User, Users, Check, Mail, Lock, Loader2, TicketCheck } from 'lucide-react';
import { UserRole, PartnerType, UserProfile, Classroom } from '../types';
import BrandMark from './BrandMark';
import { authenticate } from '../lib/auth';

interface LoginScreenProps { classrooms: Classroom[]; onLogin: (profile: UserProfile) => void; }

export default function LoginScreen({ classrooms, onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [classroomId, setClassroomId] = useState(classrooms[0]?.id || '');
  const [partnerType, setPartnerType] = useState<PartnerType>('comunidade');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteToken, setInviteToken] = useState('');
  const [invitedClassroom, setInvitedClassroom] = useState<Classroom | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('invite') || '';
    if (!token) return;
    setCheckingInvite(true);
    fetch(`/api/invitations?token=${encodeURIComponent(token)}`)
      .then(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data?.error || 'Convite inválido.');
        setInviteToken(token);
        setInvitedClassroom(data.classroom);
        setClassroomId(data.classroom.id);
        setRole('student');
        setMode('register');
      })
      .catch((err) => setError(err.message || 'Não foi possível abrir o convite.'))
      .finally(() => setCheckingInvite(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    if (mode === 'register' && !role) return setError('Escolha seu perfil.');
    setLoading(true);
    try {
      const session = await authenticate({
        action: mode, name, email, password, role,
        classroomId: role === 'student' ? classroomId : undefined,
        partnerType: role === 'partner' ? partnerType : undefined,
        institution, inviteToken: inviteToken || undefined,
      });
      if (inviteToken) window.history.replaceState({}, '', window.location.pathname);
      onLogin(session.user);
    } catch (err: any) { setError(err.message || 'Não foi possível entrar.'); }
    finally { setLoading(false); }
  }

  const roles: {id:UserRole; title:string; desc:string; icon:React.ReactNode}[] = [
    {id:'advisor',title:'Professor(a) / Orientador(a)',desc:'Acompanhe turmas e projetos.',icon:<GraduationCap size={20}/>},
    {id:'student',title:'Estudante',desc:'Entre na turma e desenvolva seu projeto.',icon:<User size={20}/>},
    {id:'individual',title:'Trabalho individual',desc:'Use sua própria mesa de projeto.',icon:<Check size={20}/>},
    {id:'partner',title:'Ator do território',desc:'Participe do processo de codesign.',icon:<Users size={20}/>},
  ];

  return <div className="min-h-screen flex items-center justify-center bg-[#FDFDFB] p-4">
    <div className="w-full max-w-xl bg-white border border-[#E0E0DE] rounded-3xl shadow-xl p-6 sm:p-10">
      <div className="flex flex-col items-center text-center mb-7"><BrandMark compact priority className="w-[58px] h-[50px] mb-3"/><h1 className="text-2xl font-bold">Metodologia 5I’s</h1><p className="text-xs text-neutral-500 font-mono mt-1 uppercase tracking-wider">Laboratório de Inteligência Projetual</p></div>

      {checkingInvite && <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-[#E0E0DE] bg-[#F9F9F8] p-4 text-xs"><Loader2 size={15} className="animate-spin"/> Abrindo o convite...</div>}
      {invitedClassroom && <div className="mb-5 rounded-2xl border-2 border-black bg-[#FFF8D9] p-4">
        <div className="flex items-start gap-3"><TicketCheck size={22}/><div><p className="text-[10px] font-mono font-bold uppercase tracking-wider">Convite para participar</p><h2 className="font-bold mt-1">{invitedClassroom.name}</h2><p className="text-xs text-neutral-600 mt-1">Código: {invitedClassroom.code}</p><p className="text-[11px] text-neutral-500 mt-2">Crie sua conta ou entre com uma conta existente. A turma será vinculada automaticamente.</p></div></div>
      </div>}

      <div className="grid grid-cols-2 bg-[#F3F3F1] p-1 rounded-xl mb-6">
        <button onClick={()=>{setMode('login'); if(!inviteToken)setRole(null); setError('')}} className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${mode==='login'?'bg-white shadow-sm':'text-neutral-500'}`}>ENTRAR</button>
        <button onClick={()=>{setMode('register'); if(inviteToken)setRole('student'); setError('')}} className={`py-2 rounded-lg text-xs font-bold cursor-pointer ${mode==='register'?'bg-white shadow-sm':'text-neutral-500'}`}>CRIAR CONTA</button>
      </div>

      {mode==='register' && !role ? <div>
        <p className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 text-center mb-4">Escolha seu perfil</p>
        <div className="grid sm:grid-cols-2 gap-3">{roles.map(r=><button key={r.id} onClick={()=>setRole(r.id)} className="p-4 border border-[#E0E0DE] hover:border-black rounded-2xl text-left bg-[#F9F9F8] cursor-pointer"><div className="w-9 h-9 rounded-xl bg-black/5 flex items-center justify-center mb-4">{r.icon}</div><strong className="text-sm block">{r.title}</strong><span className="text-[11px] text-neutral-500">{r.desc}</span></button>)}</div>
      </div> : <form onSubmit={submit} className="space-y-4">
        {mode==='register' && !inviteToken && <button type="button" onClick={()=>setRole(null)} className="text-xs font-bold flex items-center gap-1 text-neutral-500 cursor-pointer"><ArrowLeft size={14}/> Trocar perfil</button>}
        {mode==='register' && <label className="block"><span className="text-[11px] font-mono font-bold uppercase text-neutral-500">Nome completo</span><input value={name} onChange={e=>setName(e.target.value)} className="mt-1 w-full border border-[#E0E0DE] rounded-xl p-3 text-sm outline-none focus:border-black" required/></label>}
        <label className="block"><span className="text-[11px] font-mono font-bold uppercase text-neutral-500">E-mail</span><div className="relative mt-1"><Mail size={16} className="absolute left-3 top-3.5 text-neutral-400"/><input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="w-full border border-[#E0E0DE] rounded-xl p-3 pl-10 text-sm outline-none focus:border-black" required/></div></label>
        <label className="block"><span className="text-[11px] font-mono font-bold uppercase text-neutral-500">Senha</span><div className="relative mt-1"><Lock size={16} className="absolute left-3 top-3.5 text-neutral-400"/><input type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} className="w-full border border-[#E0E0DE] rounded-xl p-3 pl-10 text-sm outline-none focus:border-black" required/></div><span className="text-[10px] text-neutral-400">Mínimo de 6 caracteres.</span></label>
        {mode==='register' && role==='student' && !invitedClassroom && <label className="block"><span className="text-[11px] font-mono font-bold uppercase text-neutral-500">Turma</span><select value={classroomId} onChange={e=>setClassroomId(e.target.value)} className="mt-1 w-full border border-[#E0E0DE] rounded-xl p-3 text-sm">{classrooms.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
        {mode==='register' && (role==='advisor'||role==='individual') && <label className="block"><span className="text-[11px] font-mono font-bold uppercase text-neutral-500">Instituição (opcional)</span><input value={institution} onChange={e=>setInstitution(e.target.value)} className="mt-1 w-full border border-[#E0E0DE] rounded-xl p-3 text-sm"/></label>}
        {mode==='register' && role==='partner' && <label className="block"><span className="text-[11px] font-mono font-bold uppercase text-neutral-500">Tipo de participação</span><select value={partnerType} onChange={e=>setPartnerType(e.target.value as PartnerType)} className="mt-1 w-full border border-[#E0E0DE] rounded-xl p-3 text-sm"><option value="comunidade">Comunidade</option><option value="empresa">Empresa</option><option value="governo">Governo</option><option value="cliente">Cliente</option></select></label>}
        {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">{error}</p>}
        <button disabled={loading || checkingInvite} className="w-full bg-black text-white rounded-full py-3.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60">{loading?<><Loader2 size={15} className="animate-spin"/>Aguarde...</>:mode==='login'?'Entrar com e-mail':'Criar minha conta'}</button>
      </form>}
    </div>
  </div>
}
