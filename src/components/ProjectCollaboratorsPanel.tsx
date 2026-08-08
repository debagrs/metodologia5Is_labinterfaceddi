import { useEffect, useMemo, useState } from 'react';
import { Copy, Mail, Trash2, UserPlus, X } from 'lucide-react';
import type { CollaborationPermission, CollaboratorLabel, Project, ProjectCollaborator } from '../types';
import { readAuthSession } from '../lib/auth';

interface Props {
  project: Project;
  onClose: () => void;
}

const permissionLabels: Record<CollaborationPermission, string> = {
  view: 'Pode visualizar',
  comment: 'Pode comentar',
  edit: 'Pode editar',
};
const relationLabels: Record<CollaboratorLabel, string> = {
  colega: 'Colega', comunidade: 'Comunidade', cliente: 'Cliente', especialista: 'Especialista', outro: 'Outro',
};

export default function ProjectCollaboratorsPanel({ project, onClose }: Props) {
  const [items, setItems] = useState<ProjectCollaborator[]>([]);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<CollaborationPermission>('comment');
  const [label, setLabel] = useState<CollaboratorLabel>('colega');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const session = readAuthSession();

  const loginLink = useMemo(() => `${window.location.origin}/`, []);

  const request = async (url: string, init?: RequestInit) => {
    if (!session?.token) throw new Error('Sua sessão expirou. Entre novamente.');
    const response = await fetch(url, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.token}`, ...(init?.headers || {}) },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data?.error || 'Não foi possível concluir esta ação.');
    return data;
  };

  const load = async () => {
    setLoading(true); setMessage('');
    try {
      const data = await request(`/api/project-collaborators?projectId=${encodeURIComponent(project.id)}`);
      setItems(Array.isArray(data.collaborators) ? data.collaborators : []);
    } catch (error: any) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [project.id]);

  const invite = async () => {
    if (!email.trim()) return;
    setLoading(true); setMessage('');
    try {
      const data = await request('/api/project-collaborators', {
        method: 'POST', body: JSON.stringify({ projectId: project.id, email, permission, label }),
      });
      setMessage(data.status === 'accepted'
        ? 'Convite ativado. Essa pessoa já possui conta e o projeto aparecerá em “Compartilhados comigo”.'
        : 'Convite criado. A pessoa deve entrar ou criar conta usando exatamente esse e-mail.');
      setEmail(''); await load();
    } catch (error: any) { setMessage(error.message); }
    finally { setLoading(false); }
  };

  const update = async (item: ProjectCollaborator, nextPermission: CollaborationPermission, nextLabel = item.label) => {
    try {
      await request('/api/project-collaborators', { method: 'PATCH', body: JSON.stringify({ id: item.id, permission: nextPermission, label: nextLabel }) });
      await load();
    } catch (error: any) { setMessage(error.message); }
  };

  const remove = async (id: string) => {
    if (!confirm('Remover o acesso desta pessoa ao projeto?')) return;
    try { await request(`/api/project-collaborators?id=${encodeURIComponent(id)}`, { method: 'DELETE' }); await load(); }
    catch (error: any) { setMessage(error.message); }
  };

  const copyInvitation = async (targetEmail: string) => {
    const text = `Você foi convidado(a) para colaborar no projeto “${project.name}” na Metodologia 5I's. Entre ou crie sua conta usando o e-mail ${targetEmail}: ${loginLink}`;
    await navigator.clipboard.writeText(text);
    setMessage('Texto do convite copiado.');
  };

  const mailInvitation = (targetEmail: string) => {
    const subject = encodeURIComponent(`Convite para colaborar no projeto ${project.name}`);
    const body = encodeURIComponent(`Olá!\n\nVocê foi convidado(a) para colaborar no projeto “${project.name}” na plataforma Metodologia 5I's.\n\nEntre ou crie sua conta usando este mesmo e-mail (${targetEmail}):\n${loginLink}\n\nDepois do login, o projeto aparecerá em “Compartilhados comigo”.`);
    window.location.href = `mailto:${encodeURIComponent(targetEmail)}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/35 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4" onMouseDown={onClose}>
      <div className="w-full sm:max-w-2xl max-h-[90dvh] overflow-y-auto bg-[#FDFDFB] rounded-t-3xl sm:rounded-3xl border border-[#DDD] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#FDFDFB]/95 backdrop-blur border-b border-[#EEE] p-5 flex items-start justify-between gap-4 z-10">
          <div><span className="text-[9px] font-mono font-bold tracking-[0.18em] uppercase text-neutral-400">Colaboração</span><h2 className="text-xl font-bold">Colaboradores do projeto</h2><p className="text-xs text-neutral-500 mt-1">{project.name}</p></div>
          <button onClick={onClose} className="p-2 rounded-xl border border-[#DDD] bg-white cursor-pointer"><X size={18}/></button>
        </div>

        <div className="p-5 space-y-6">
          <section className="rounded-2xl border border-[#DDD] bg-white p-4">
            <h3 className="font-bold flex items-center gap-2"><UserPlus size={17}/> Convidar pessoa</h3>
            <p className="text-xs text-neutral-500 mt-1">O convite fica vinculado ao e-mail. Se a pessoa ainda não tiver conta, basta criar uma com o mesmo endereço.</p>
            <div className="grid sm:grid-cols-[1fr_150px_150px] gap-2 mt-4">
              <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" placeholder="pessoa@email.com" className="border border-[#DDD] rounded-xl px-3 py-3 text-sm outline-none focus:border-black" />
              <select value={permission} onChange={(e)=>setPermission(e.target.value as CollaborationPermission)} className="border border-[#DDD] rounded-xl px-3 py-3 text-sm bg-white">
                <option value="comment">Pode comentar</option><option value="view">Só visualizar</option><option value="edit">Pode editar</option>
              </select>
              <select value={label} onChange={(e)=>setLabel(e.target.value as CollaboratorLabel)} className="border border-[#DDD] rounded-xl px-3 py-3 text-sm bg-white">
                {Object.entries(relationLabels).map(([k,v])=><option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <button onClick={invite} disabled={loading || !email.trim()} className="mt-3 w-full sm:w-auto px-5 py-3 rounded-xl bg-black text-white font-mono text-xs font-bold uppercase tracking-wider disabled:opacity-40 cursor-pointer">Criar convite</button>
          </section>

          {message && <div className="rounded-xl bg-neutral-100 border border-[#DDD] px-4 py-3 text-sm">{message}</div>}

          <section>
            <div className="flex items-center justify-between mb-3"><h3 className="font-bold">Pessoas convidadas</h3><span className="text-xs text-neutral-400">{items.length}</span></div>
            {loading && items.length === 0 ? <p className="text-sm text-neutral-500">Carregando...</p> : items.length === 0 ? <p className="text-sm text-neutral-500 border border-dashed border-[#DDD] rounded-2xl p-6 text-center">Ainda não há colaboradores neste projeto.</p> : (
              <div className="space-y-3">{items.map((item)=><div key={item.id} className="border border-[#DDD] rounded-2xl bg-white p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0"><div className="font-bold truncate">{item.collaboratorName || item.collaboratorEmail}</div><div className="text-xs text-neutral-500 truncate">{item.collaboratorEmail}</div><div className="mt-2 flex gap-2 flex-wrap"><span className="text-[10px] px-2 py-1 rounded-full bg-neutral-100 font-mono uppercase">{relationLabels[item.label]}</span><span className={`text-[10px] px-2 py-1 rounded-full font-mono uppercase ${item.status==='accepted'?'bg-emerald-50 text-emerald-700':'bg-amber-50 text-amber-700'}`}>{item.status==='accepted'?'Conta conectada':'Aguardando conta'}</span></div></div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select value={item.permission} onChange={(e)=>update(item, e.target.value as CollaborationPermission)} className="border border-[#DDD] rounded-xl px-3 py-2 text-xs bg-white">
                      <option value="view">Só visualizar</option><option value="comment">Pode comentar</option><option value="edit">Pode editar</option>
                    </select>
                    <button onClick={()=>copyInvitation(item.collaboratorEmail)} title="Copiar convite" className="p-2 rounded-xl border border-[#DDD] cursor-pointer"><Copy size={15}/></button>
                    <button onClick={()=>mailInvitation(item.collaboratorEmail)} title="Enviar por e-mail" className="p-2 rounded-xl border border-[#DDD] cursor-pointer"><Mail size={15}/></button>
                    <button onClick={()=>remove(item.id)} title="Remover" className="p-2 rounded-xl border border-red-100 text-red-700 hover:bg-red-50 cursor-pointer"><Trash2 size={15}/></button>
                  </div>
                </div>
              </div>)}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
