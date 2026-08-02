import React, { useState } from 'react';
import { 
  Users, Plus, GraduationCap, ChevronRight, BookOpen, 
  Trash2, ArrowLeft, LogOut, CheckCircle, Clock, Sparkles, Send, Settings
} from 'lucide-react';
import { Classroom, StudentProfile, Project, UserProfile } from '../types';
import InviteClassroomPanel from './InviteClassroomPanel';
import AdminPanel from './AdminPanel';

interface AdvisorDashboardProps {
  advisor: UserProfile;
  classrooms: Classroom[];
  students: StudentProfile[];
  onAddClassroom: (name: string) => void;
  onAddStudent: (classroomId: string, name: string) => void;
  onViewStudentProject: (student: StudentProfile) => void;
  onDeleteClassroom: (classroomId: string) => void;
  onDeleteStudent: (studentId: string) => void;
  onLogout: () => void;
}

export default function AdvisorDashboard({
  advisor,
  classrooms,
  students,
  onAddClassroom,
  onAddStudent,
  onViewStudentProject,
  onDeleteClassroom,
  onDeleteStudent,
  onLogout
}: AdvisorDashboardProps) {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(
    classrooms.length > 0 ? classrooms[0].id : null
  );
  const [newClassName, setNewClassName] = useState('');
  const [newStudentName, setNewStudentName] = useState('');
  const [showAddClassForm, setShowAddClassForm] = useState(false);
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [errorClass, setErrorClass] = useState('');
  const [errorStudent, setErrorStudent] = useState('');
  const [inviteClassroom, setInviteClassroom] = useState<Classroom | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const activeClassroom = classrooms.find(c => c.id === selectedClassId);
  const activeClassStudents = students.filter(s => s.classroomId === selectedClassId);

  const handleCreateClassroom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      setErrorClass('Por favor, digite o nome da turma.');
      return;
    }
    onAddClassroom(newClassName.trim());
    setNewClassName('');
    setShowAddClassForm(false);
    setErrorClass('');
    
    // Automatically select the newly created class
    setTimeout(() => {
      if (classrooms.length > 0) {
        setSelectedClassId(classrooms[classrooms.length - 1].id);
      }
    }, 50);
  };

  const handleAddStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;
    if (!newStudentName.trim()) {
      setErrorStudent('Por favor, digite o nome do aluno.');
      return;
    }
    onAddStudent(selectedClassId, newStudentName.trim());
    setNewStudentName('');
    setShowAddStudentForm(false);
    setErrorStudent('');
  };

  // Set first class as selected if nothing is selected yet
  if (!selectedClassId && classrooms.length > 0) {
    setSelectedClassId(classrooms[0].id);
  }

  // Get project analytics
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'Ideação': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Inambulação': return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Instauração': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Inspeção': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Implementação': return 'bg-rose-50 text-rose-700 border-rose-200';
      default: return 'bg-neutral-50 text-neutral-500 border-neutral-200';
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFB] font-sans p-4 sm:p-8 select-none">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* HEADER */}
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E0E0DE] pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 flex items-center justify-center bg-black rounded-xl text-white shadow-md">
              <GraduationCap size={22} />
            </div>
            <div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Painel do(a) Orientador(a)</span>
              <h1 className="text-xl font-bold text-neutral-900 leading-tight">Olá, {advisor.name}</h1>
              {advisor.institution && (
                <p className="text-xs text-neutral-500 font-mono mt-0.5">{advisor.institution}</p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAdmin(true)}
              className="px-4 py-2 border border-[#E0E0DE] hover:border-black text-neutral-700 hover:text-black hover:bg-white rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Settings size={13} />
              <span>Administração</span>
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-[#E0E0DE] hover:border-red-200 text-neutral-600 hover:text-red-600 hover:bg-red-50/50 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut size={13} />
              <span>Sair do Painel</span>
            </button>
          </div>
        </header>

        {/* METRICS ROW */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <Users size={18} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Total de Turmas</span>
              <span className="text-xl font-bold text-neutral-900">{classrooms.length}</span>
            </div>
          </div>

          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <GraduationCap size={18} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Total de Alunos</span>
              <span className="text-xl font-bold text-neutral-900">{students.length}</span>
            </div>
          </div>

          <div className="bg-white border border-[#E0E0DE] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-800">
              <CheckCircle size={18} />
            </div>
            <div>
              <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-wider block">Projetos Ativos</span>
              <span className="text-xl font-bold text-neutral-900">
                {students.filter(s => s.project).length}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN SPLIT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT PANEL: LIST OF CLASSES */}
          <div className="lg:col-span-4 bg-white border border-[#E0E0DE] rounded-2xl p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                <BookOpen size={15} />
                <span>Turmas</span>
              </h2>
              
              <button
                onClick={() => setShowAddClassForm(!showAddClassForm)}
                className="p-1.5 rounded-lg border border-[#E0E0DE] hover:border-black bg-[#F9F9F8] hover:bg-white text-neutral-700 hover:text-black transition-colors flex items-center gap-1 cursor-pointer"
                title="Formar nova turma"
              >
                <Plus size={14} />
                <span className="text-[10px] font-mono font-bold uppercase">Formar</span>
              </button>
            </div>

            {/* CREATE CLASSROOM FORM */}
            {showAddClassForm && (
              <form onSubmit={handleCreateClassroom} className="p-3 bg-[#F9F9F8] rounded-xl border border-[#E0E0DE] space-y-2.5">
                <span className="text-[9px] font-mono font-bold text-neutral-400 uppercase tracking-wide block">Formar Nova Turma</span>
                <input
                  type="text"
                  placeholder="Ex: Engenharia Reversa 2A"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="w-full bg-white border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-lg p-2 text-xs outline-none"
                  autoFocus
                />
                {errorClass && <p className="text-[10px] text-red-600 font-bold">{errorClass}</p>}
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setShowAddClassForm(false)}
                    className="px-2 py-1 border border-[#E0E0DE] text-neutral-500 rounded text-[10px] font-mono cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-black text-white rounded text-[10px] font-mono font-bold uppercase cursor-pointer"
                  >
                    Registrar
                  </button>
                </div>
              </form>
            )}

            {/* CLASSROOM ITEMS */}
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {classrooms.length > 0 ? (
                classrooms.map((c) => {
                  const classStudentCount = students.filter(s => s.classroomId === c.id).length;
                  const isSelected = selectedClassId === c.id;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setSelectedClassId(c.id);
                        setShowAddStudentForm(false);
                      }}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                        isSelected 
                          ? 'bg-black text-white border-black shadow-md' 
                          : 'bg-[#F9F9F8] border-[#E0E0DE] text-neutral-800 hover:bg-neutral-100'
                      }`}
                    >
                      <div className="flex flex-col">
                        <span className="font-bold text-sm leading-tight">{c.name}</span>
                        <span className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-white/60' : 'text-neutral-400'}`}>
                          Código: {c.code}
                        </span>
                      </div>
                      <span className={`text-xs font-semibold font-mono rounded-full px-2.5 py-0.5 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-neutral-200 text-neutral-700'
                      }`}>
                        {classStudentCount} {classStudentCount === 1 ? 'aluno' : 'alunos'}
                      </span>
                    </button>
                  );
                })
              ) : (
                <p className="text-xs text-neutral-400 font-light text-center py-6">
                  Nenhuma turma formada. Use o botão "Formar" acima.
                </p>
              )}
            </div>

          </div>

          {/* RIGHT PANEL: LIST OF STUDENTS IN SELECTED CLASS */}
          <div className="lg:col-span-8 bg-white border border-[#E0E0DE] rounded-2xl p-5 space-y-4 shadow-sm min-h-[400px]">
            {activeClassroom ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0F0EE]">
                  <div>
                    <h2 className="text-base font-bold text-neutral-900 leading-tight">
                      Alunos de: <span className="underline decoration-black decoration-2">{activeClassroom.name}</span>
                    </h2>
                    <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">Código da Turma: {activeClassroom.code}</span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setInviteClassroom(activeClassroom)}
                      className="sm:self-center px-3.5 py-1.5 rounded-xl border border-black bg-white text-black hover:bg-neutral-100 transition-colors flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wide cursor-pointer shadow-sm"
                    >
                      <Send size={14} />
                      <span>Convidar</span>
                    </button>
                    <button
                      onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                      className="sm:self-center px-3.5 py-1.5 rounded-xl bg-black text-white hover:bg-neutral-800 transition-colors flex items-center gap-1 text-xs font-mono font-bold uppercase tracking-wide cursor-pointer shadow-sm"
                    >
                      <Plus size={14} />
                      <span>Incluir Manualmente</span>
                    </button>
                  </div>
                </div>

                {/* ADD STUDENT FORM */}
                {showAddStudentForm && (
                  <form onSubmit={handleAddStudentSubmit} className="p-4 bg-[#F5F5F3] rounded-xl border border-[#E0E0DE] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-wide block">Incluir Aluno na Turma</span>
                      <button
                        type="button"
                        onClick={() => setShowAddStudentForm(false)}
                        className="text-[10px] text-neutral-400 hover:text-black font-mono cursor-pointer"
                      >
                        Fechar
                      </button>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="Nome completo do aluno"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="flex-1 bg-white border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-lg p-2 text-xs outline-none"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-black text-white rounded-lg text-xs font-mono font-bold uppercase cursor-pointer hover:bg-neutral-800"
                      >
                        Registrar
                      </button>
                    </div>
                    {errorStudent && <p className="text-xs text-red-600 font-semibold">{errorStudent}</p>}
                  </form>
                )}

                {/* STUDENTS TABLE */}
                <div className="space-y-3">
                  {activeClassStudents.length > 0 ? (
                    activeClassStudents.map((s) => {
                      const answeredCount = s.nodes ? s.nodes.filter(n => n.type === 'question' && n.isCompleted).length : 0;
                      const totalQuestions = s.nodes ? s.nodes.filter(n => n.type === 'question').length : 0;
                      const hasProject = !!s.project;

                      return (
                        <div 
                          key={s.id}
                          className="p-4 bg-[#FDFDFB] border border-[#E0E0DE] rounded-xl hover:border-neutral-400 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <h3 className="font-bold text-neutral-900 text-sm">{s.name}</h3>
                            {hasProject ? (
                              <div className="flex flex-col gap-0.5">
                                <span className="text-xs text-neutral-700 font-medium block">
                                  Projeto: <span className="italic">"{s.project!.name}"</span>
                                </span>
                                <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-mono mt-1 text-neutral-500">
                                  <span className={`px-2 py-0.5 rounded border ${getPhaseColor(s.project!.activePhase)}`}>
                                    Fase: {s.project!.activePhase}
                                  </span>
                                  <span>•</span>
                                  <span>ODS {s.project!.ods.split(' - ')[0]}</span>
                                  {totalQuestions > 0 && (
                                    <>
                                      <span>•</span>
                                      <span className="flex items-center gap-1">
                                        <Clock size={10} />
                                        Questões: {answeredCount}/{totalQuestions}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-neutral-400 italic block">Sem projeto iniciado</span>
                            )}
                          </div>

                          <button
                            onClick={() => onViewStudentProject(s)}
                            className="w-full sm:w-auto px-4 py-2 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-mono font-bold uppercase tracking-wide transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          >
                            <Sparkles size={13} />
                            <span>Acessar Canvas</span>
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 border-2 border-dashed border-[#E0E0DE] rounded-2xl">
                      <Users size={28} className="mx-auto text-neutral-300 mb-2" />
                      <p className="text-xs text-neutral-400 font-light max-w-sm mx-auto">
                        Nenhum aluno incluído nesta turma ainda. Use o botão "Incluir Aluno" acima para matricular seu primeiro estudante.
                      </p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <BookOpen size={32} className="text-neutral-300 mb-2" />
                <p className="text-xs text-neutral-400 font-light">
                  Selecione uma de suas turmas no painel esquerdo para visualizar a listagem de alunos e seus respectivos projetos.
                </p>
              </div>
            )}
          </div>

        </div>

      </div>
      {inviteClassroom && (
        <InviteClassroomPanel
          classroom={inviteClassroom}
          onClose={() => setInviteClassroom(null)}
        />
      )}
      {showAdmin && (
        <AdminPanel
          classrooms={classrooms}
          students={students}
          onDeleteClassroom={onDeleteClassroom}
          onDeleteStudent={onDeleteStudent}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}
