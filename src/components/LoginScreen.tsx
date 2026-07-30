import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  GraduationCap, User, Users, Briefcase, ChevronRight, 
  ArrowLeft, Check, Sparkles, HelpCircle, Shield, Building
} from 'lucide-react';
import { UserRole, PartnerType, UserProfile, Classroom } from '../types';
import BrandMark from './BrandMark';

interface LoginScreenProps {
  classrooms: Classroom[];
  onLogin: (profile: UserProfile) => void;
}

export default function LoginScreen({ classrooms, onLogin }: LoginScreenProps) {
  const [role, setRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [partnerType, setPartnerType] = useState<PartnerType>('comunidade');
  const [institution, setInstitution] = useState('');
  const [error, setError] = useState('');

  const handleRoleSelect = (selectedRole: UserRole) => {
    setRole(selectedRole);
    setError('');
    // Autofill defaults if empty
    if (selectedRole === 'student' && classrooms.length > 0) {
      setClassroomId(classrooms[0].id);
    }
  };

  const handleBack = () => {
    setRole(null);
    setName('');
    setClassroomId('');
    setInstitution('');
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Por favor, informe seu nome.');
      return;
    }

    if (role === 'student' && !classroomId) {
      setError('Por favor, selecione uma turma.');
      return;
    }

    const profile: UserProfile = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      role: role!,
      partnerType: role === 'partner' ? partnerType : undefined,
      classroomId: role === 'student' ? classroomId : undefined,
      institution: institution.trim() || undefined,
    };

    onLogin(profile);
  };

  const getPartnerLabel = (type: PartnerType) => {
    switch (type) {
      case 'comunidade': return 'Comunidade / Sociedade Civil';
      case 'empresa': return 'Empresa / Setor Privado';
      case 'governo': return 'Governo / Gestão Pública';
      case 'cliente': return 'Cliente / Beneficiário Final';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFB] p-4 font-sans select-none overflow-y-auto">
      <div className="w-full max-w-xl bg-white border border-[#E0E0DE] rounded-3xl shadow-xl overflow-hidden p-6 sm:p-10 transition-all duration-300">
        
        {/* LOGO AREA */}
        <div className="flex flex-col items-center text-center mb-8">
          <BrandMark compact priority className="w-[58px] h-[50px] mb-3" />
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900">Metodologia 5I’s</h1>
          <p className="text-xs text-neutral-500 font-mono mt-1.5 uppercase tracking-wider">Laboratório de Inteligência Projetual</p>
        </div>

        {!role ? (
          /* STEP 1: ROLE SELECTION */
          <div>
            <h2 className="text-sm font-semibold font-mono text-neutral-400 uppercase tracking-widest text-center mb-6">
              Selecione o seu Perfil de Acesso
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* PROFESSOR / ADVISOR */}
              <button
                onClick={() => handleRoleSelect('advisor')}
                className="group p-5 border border-[#E0E0DE] hover:border-black rounded-2xl text-left transition-all duration-200 bg-[#F9F9F8] hover:bg-white flex flex-col justify-between h-44 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-black/5 group-hover:bg-black group-hover:text-white flex items-center justify-center text-neutral-700 transition-colors">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm group-hover:text-black">Orientador(a) / Professor(a)</h3>
                  <p className="text-[11px] text-neutral-500 font-light leading-relaxed mt-1">
                    Crie turmas, inclua alunos, oriente projetos e acompanhe o progresso das reflexões.
                  </p>
                </div>
              </button>

              {/* STUDENT */}
              <button
                onClick={() => handleRoleSelect('student')}
                className="group p-5 border border-[#E0E0DE] hover:border-black rounded-2xl text-left transition-all duration-200 bg-[#F9F9F8] hover:bg-white flex flex-col justify-between h-44 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-black/5 group-hover:bg-black group-hover:text-white flex items-center justify-center text-neutral-700 transition-colors">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm group-hover:text-black">Aluno(a) / Estudante</h3>
                  <p className="text-[11px] text-neutral-500 font-light leading-relaxed mt-1">
                    Conecte-se à sua turma, formule problemas, interaja com mediadores e registre pensamentos.
                  </p>
                </div>
              </button>

              {/* INDIVIDUAL WORK */}
              <button
                onClick={() => handleRoleSelect('individual')}
                className="group p-5 border border-[#E0E0DE] hover:border-black rounded-2xl text-left transition-all duration-200 bg-[#F9F9F8] hover:bg-white flex flex-col justify-between h-44 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-black/5 group-hover:bg-black group-hover:text-white flex items-center justify-center text-neutral-700 transition-colors">
                  <Check size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm group-hover:text-black">Trabalho Individual / Só eu</h3>
                  <p className="text-[11px] text-neutral-500 font-light leading-relaxed mt-1">
                    Desenvolva seu projeto autônomo, desenhe sua âncora central e use os mediadores livremente.
                  </p>
                </div>
              </button>

              {/* ECOSYSTEM PARTNERS */}
              <button
                onClick={() => handleRoleSelect('partner')}
                className="group p-5 border border-[#E0E0DE] hover:border-black rounded-2xl text-left transition-all duration-200 bg-[#F9F9F8] hover:bg-white flex flex-col justify-between h-44 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-black/5 group-hover:bg-black group-hover:text-white flex items-center justify-center text-neutral-700 transition-colors">
                  <Users size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-neutral-900 text-sm group-hover:text-black">Atores do Território</h3>
                  <p className="text-[11px] text-neutral-500 font-light leading-relaxed mt-1">
                    Comunidades, empresas, órgãos governamentais ou clientes atuando no ecossistema de inovação.
                  </p>
                </div>
              </button>

            </div>

            <div className="mt-8 text-center text-[10px] text-neutral-400 font-mono">
              Para todos os atores engajados na transformação sustentável e ODS.
            </div>
          </div>
        ) : (
          /* STEP 2: PROFILE DETAILS FORM */
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <div className="flex items-center gap-2 text-neutral-500 mb-2">
              <button 
                type="button" 
                onClick={handleBack}
                className="p-1.5 rounded-lg hover:bg-black/5 text-neutral-600 transition-colors cursor-pointer flex items-center gap-1 text-xs font-mono font-bold"
              >
                <ArrowLeft size={14} /> Voltar
              </button>
              <div className="h-3 w-[1px] bg-[#E0E0DE]" />
              <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-neutral-400">
                {role === 'advisor' && 'Orientador(a)'}
                {role === 'student' && 'Estudante'}
                {role === 'individual' && 'Trabalho Solo'}
                {role === 'partner' && 'Ator do Território'}
              </span>
            </div>

            {/* FORM FIELD: NAME */}
            <div className="space-y-1.5">
              <label htmlFor="user-name" className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                Seu Nome Completo
              </label>
              <input
                id="user-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Dra. Helena Souza ou Lucas Silva"
                className="w-full bg-[#FDFDFB] border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm outline-none transition-colors"
                autoFocus
              />
            </div>

            {/* FORM FIELD: INSTITUTION (OPTIONAL FOR ADVISOR/INDIVIDUAL) */}
            {(role === 'advisor' || role === 'individual') && (
              <div className="space-y-1.5">
                <label htmlFor="user-institution" className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Instituição / Universidade (Opcional)
                </label>
                <input
                  id="user-institution"
                  type="text"
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="Ex: Universidade Federal ou Instituto de Inovação"
                  className="w-full bg-[#FDFDFB] border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm outline-none transition-colors"
                />
              </div>
            )}

            {/* FORM FIELD: STUDENT - CLASSROOM SELECT */}
            {role === 'student' && (
              <div className="space-y-1.5">
                <label htmlFor="user-classroom" className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Selecione sua Turma de Projeto
                </label>
                {classrooms.length > 0 ? (
                  <select
                    id="user-classroom"
                    value={classroomId}
                    onChange={(e) => setClassroomId(e.target.value)}
                    className="w-full bg-[#FDFDFB] border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm outline-none transition-colors"
                  >
                    {classrooms.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} (Código: {c.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-xl p-3 font-light leading-relaxed">
                    Nenhuma turma cadastrada no sistema. Cadastre-se primeiro como Orientador para formar uma turma, ou acesse no modo "Trabalho Individual".
                  </div>
                )}
              </div>
            )}

            {/* FORM FIELD: PARTNER - CATEGORY & ENTITY */}
            {role === 'partner' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                    Categoria de Ator de Território
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['comunidade', 'empresa', 'governo', 'cliente'] as PartnerType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setPartnerType(type)}
                        className={`p-3 rounded-xl border text-xs font-medium text-left transition-all ${
                          partnerType === type 
                            ? 'bg-black text-white border-black shadow-sm' 
                            : 'bg-[#F9F9F8] border-[#E0E0DE] text-neutral-700 hover:bg-neutral-100'
                        }`}
                      >
                        {getPartnerLabel(type)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="user-entity" className="text-[11px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                    Nome da Empresa, Entidade ou Comunidade representados
                  </label>
                  <input
                    id="user-entity"
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    placeholder="Ex: Associação de Moradores do Bairro X ou Empresa TecSustentável"
                    className="w-full bg-[#FDFDFB] border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm outline-none transition-colors"
                  />
                </div>
              </>
            )}

            {error && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={role === 'student' && classrooms.length === 0}
              className="w-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-xs font-mono font-bold uppercase tracking-widest py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer mt-2"
            >
              <span>Acessar Laboratório</span>
              <ChevronRight size={14} />
            </button>

          </form>
        )}

      </div>
    </div>
  );
}
