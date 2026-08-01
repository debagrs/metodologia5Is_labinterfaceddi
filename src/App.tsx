import React, { useState, useEffect } from 'react';
import FirstExperience from './components/FirstExperience';
import BrandMark from './components/BrandMark';
import Workspace from './components/Workspace';
import LoginScreen from './components/LoginScreen';
import AdvisorDashboard from './components/AdvisorDashboard';
import { Project, ThoughtNode, Phase, UserProfile, Classroom, StudentProfile } from './types';
import { Users, Sparkles, LogOut, ArrowLeft, GraduationCap, Globe, Building } from 'lucide-react';
import { useCloudWorkspace, WorkspaceSnapshot } from './lib/useCloudWorkspace';

const STORAGE_PROFILE_KEY = "5is_platform_active_profile";
const STORAGE_CLASSROOMS_KEY = "5is_platform_classrooms";
const STORAGE_STUDENTS_KEY = "5is_platform_students";
const STORAGE_PROJECT_KEY = "5is_platform_active_project";
const STORAGE_NODES_KEY = "5is_platform_canvas_nodes";

// Pre-loaded sustainable design classrooms
const DEFAULT_CLASSROOMS: Classroom[] = [
  {
    id: 'class-1',
    name: 'Turma A - Engenharia Sustentável',
    code: 'SUST-2026',
    createdAt: new Date().toISOString(),
    studentIds: ['student-1', 'student-2']
  },
  {
    id: 'class-2',
    name: 'Turma B - Design Social e ODS 11',
    code: 'ODS11-2026',
    createdAt: new Date().toISOString(),
    studentIds: ['student-3']
  }
];

// Pre-loaded student project tables
const DEFAULT_STUDENTS: StudentProfile[] = [
  {
    id: 'student-1',
    name: 'Gabriel Santos',
    classroomId: 'class-1',
    project: {
      id: 'proj-gabriel',
      name: 'Hortas Urbanas Verticais',
      problem: 'Falta de áreas verdes e alimentos saudáveis de baixo custo em periferias densas.',
      community: 'Moradores de Paraisópolis',
      ods: '11 - Cidades e Comunidades Sustentáveis',
      projectType: 'Design de Intervenção Urbana',
      createdAt: new Date().toISOString(),
      activePhase: 'Ideação'
    },
    nodes: [
      {
        id: 'node-core',
        type: 'core',
        title: 'Hortas Urbanas Verticais',
        content: 'Falta de áreas verdes e alimentos saudáveis de baixo custo em periferias densas.',
        phase: 'Ideação',
        x: 1000,
        y: 1000,
        connections: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'node-dial-1',
        type: 'question',
        title: 'Mediador Dr. Helena Souza',
        content: 'Como garantir a autogestão da horta comunitária sem depender de assistência técnica governamental constante?',
        phase: 'Ideação',
        x: 1000,
        y: 1250,
        connections: ['node-core'],
        createdAt: new Date().toISOString(),
        isCompleted: true,
        scientificContext: 'A sustentabilidade institucional de bens comuns requer arranjos claros de governança local, conforme Elinor Ostrom.'
      },
      {
        id: 'node-dial-2',
        type: 'question',
        title: 'Mediador Prof. Marcos Silva',
        content: 'Quais materiais recicláveis locais podem ser mapeados para reduzir o custo de implantação da horta vertical?',
        phase: 'Ideação',
        x: 1400,
        y: 1000,
        connections: ['node-core'],
        createdAt: new Date().toISOString(),
        isCompleted: false,
        scientificContext: 'Mapeamento de fluxos de resíduos sólidos urbanos (metabolismo industrial) reduz a pegada ecológica de novos projetos.'
      }
    ]
  },
  {
    id: 'student-2',
    name: 'Isabela Souza',
    classroomId: 'class-1',
    project: {
      id: 'proj-isabela',
      name: 'Logística Reversa de Vidros',
      problem: 'Descarte incorreto de embalagens de vidro em bares e restaurantes locais causando riscos e poluição.',
      community: 'Restaurantes e Cooperativas da Vila Madalena',
      ods: '12 - Consumo e Produção Responsáveis',
      projectType: 'Sistema de Economia Circular',
      createdAt: new Date().toISOString(),
      activePhase: 'Inambulação'
    },
    nodes: [
      {
        id: 'node-core',
        type: 'core',
        title: 'Logística Reversa de Vidros',
        content: 'Descarte incorreto de embalagens de vidro em bares e restaurantes locais causando riscos e poluição.',
        phase: 'Inambulação',
        x: 1000,
        y: 1000,
        connections: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'node-dial-isabela-1',
        type: 'question',
        title: 'Mediador Dr. Helena Souza',
        content: 'Como estruturar um modelo de remuneração justa para os catadores de vidro na rota estabelecida?',
        phase: 'Inambulação',
        x: 1000,
        y: 1250,
        connections: ['node-core'],
        createdAt: new Date().toISOString(),
        isCompleted: true,
        scientificContext: 'Cadeias reversas inclusivas dependem do reconhecimento e da remuneração condigna do trabalho dos catadores autônomos.'
      }
    ]
  },
  {
    id: 'student-3',
    name: 'Marcos Oliveira',
    classroomId: 'class-2'
    // No project started yet (waiting for onboarding)
  }
];

export default function App() {
  const [activeProfile, setActiveProfile] = useState<UserProfile | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  
  // Inspecting student project (for advisor/partner modes)
  const [viewingStudent, setViewingStudent] = useState<StudentProfile | null>(null);

  // Solo project states
  const [soloProject, setSoloProject] = useState<Project | null>(null);
  const [soloNodes, setSoloNodes] = useState<ThoughtNode[]>([]);
  const [localLoaded, setLocalLoaded] = useState(false);

  const applyCloudSnapshot = (snapshot: WorkspaceSnapshot) => {
    setActiveProfile(snapshot.activeProfile || null);
    setClassrooms(snapshot.classrooms?.length ? snapshot.classrooms : DEFAULT_CLASSROOMS);
    setStudents(snapshot.students?.length ? snapshot.students : DEFAULT_STUDENTS);
    setSoloProject(snapshot.soloProject || null);
    setSoloNodes(snapshot.soloNodes || []);

    if (snapshot.activeProfile) localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(snapshot.activeProfile));
    if (snapshot.classrooms) localStorage.setItem(STORAGE_CLASSROOMS_KEY, JSON.stringify(snapshot.classrooms));
    if (snapshot.students) localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(snapshot.students));
    if (snapshot.soloProject) localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(snapshot.soloProject));
    if (snapshot.soloNodes) localStorage.setItem(STORAGE_NODES_KEY, JSON.stringify(snapshot.soloNodes));
  };

  const cloudState = useCloudWorkspace({
    activeProfile, classrooms, students, soloProject, soloNodes, localLoaded,
    applySnapshot: applyCloudSnapshot
  });

  // Load from localStorage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem(STORAGE_PROFILE_KEY);
    const savedClassrooms = localStorage.getItem(STORAGE_CLASSROOMS_KEY);
    const savedStudents = localStorage.getItem(STORAGE_STUDENTS_KEY);
    const savedSoloProject = localStorage.getItem(STORAGE_PROJECT_KEY);
    const savedSoloNodes = localStorage.getItem(STORAGE_NODES_KEY);

    if (savedProfile) {
      try { setActiveProfile(JSON.parse(savedProfile)); } catch(e) {}
    }

    if (savedClassrooms) {
      try { setClassrooms(JSON.parse(savedClassrooms)); } catch(e) { setClassrooms(DEFAULT_CLASSROOMS); }
    } else {
      setClassrooms(DEFAULT_CLASSROOMS);
      localStorage.setItem(STORAGE_CLASSROOMS_KEY, JSON.stringify(DEFAULT_CLASSROOMS));
    }

    if (savedStudents) {
      try { setStudents(JSON.parse(savedStudents)); } catch(e) { setStudents(DEFAULT_STUDENTS); }
    } else {
      setStudents(DEFAULT_STUDENTS);
      localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(DEFAULT_STUDENTS));
    }

    if (savedSoloProject) {
      try { setSoloProject(JSON.parse(savedSoloProject)); } catch(e) {}
    }

    if (savedSoloNodes) {
      try { setSoloNodes(JSON.parse(savedSoloNodes)); } catch(e) {}
    }

    setLocalLoaded(true);
  }, []);

  // Handle Login and create Student Profile if it doesn't exist
  const handleLogin = (profile: UserProfile) => {
    setActiveProfile(profile);
    localStorage.setItem(STORAGE_PROFILE_KEY, JSON.stringify(profile));

    if (profile.role === 'student') {
      const studentNameNorm = profile.name.trim().toLowerCase();
      const existingStudent = students.find(s => 
        s.classroomId === profile.classroomId && 
        s.name.trim().toLowerCase() === studentNameNorm
      );

      if (!existingStudent) {
        // Automatically create a new student entry under the classroom
        const newStudent: StudentProfile = {
          id: `student-${Date.now()}`,
          name: profile.name,
          classroomId: profile.classroomId!
        };
        const updatedStudents = [...students, newStudent];
        setStudents(updatedStudents);
        localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(updatedStudents));
      }
    }
  };

  const handleLogout = () => {
    setActiveProfile(null);
    setViewingStudent(null);
    setSoloProject(null);
    setSoloNodes([]);
    localStorage.removeItem(STORAGE_PROFILE_KEY);
  };

  // Advisor / Professor Actions
  const handleAddClassroom = (name: string) => {
    const newClass: Classroom = {
      id: `class-${Date.now()}`,
      name,
      code: `${name.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      studentIds: []
    };
    const updatedClassrooms = [...classrooms, newClass];
    setClassrooms(updatedClassrooms);
    localStorage.setItem(STORAGE_CLASSROOMS_KEY, JSON.stringify(updatedClassrooms));
  };

  const handleAddStudent = (classroomId: string, name: string) => {
    const newStudent: StudentProfile = {
      id: `student-${Date.now()}`,
      name,
      classroomId
    };
    const updatedStudents = [...students, newStudent];
    setStudents(updatedStudents);
    localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(updatedStudents));
  };

  const handleViewStudentProject = (student: StudentProfile) => {
    setViewingStudent(student);
  };

  // Helper to retrieve the current active project & nodes
  const getActiveData = (): { project: Project | null; nodes: ThoughtNode[] } => {
    if (viewingStudent) {
      return {
        project: viewingStudent.project || null,
        nodes: viewingStudent.nodes || []
      };
    }

    if (activeProfile?.role === 'student') {
      const studentNameNorm = activeProfile.name.trim().toLowerCase();
      const currentStudent = students.find(s => 
        s.classroomId === activeProfile.classroomId && 
        s.name.trim().toLowerCase() === studentNameNorm
      );
      return {
        project: currentStudent?.project || null,
        nodes: currentStudent?.nodes || []
      };
    }

    return {
      project: soloProject,
      nodes: soloNodes
    };
  };

  const { project, nodes } = getActiveData();

  // Helper to persist edits back to their respective sources
  const saveActiveProjectAndNodes = (updatedProject: Project | null, updatedNodes: ThoughtNode[]) => {
    if (viewingStudent) {
      const updatedStudents = students.map(s => 
        s.id === viewingStudent.id 
          ? { ...s, project: updatedProject || undefined, nodes: updatedNodes } 
          : s
      );
      setStudents(updatedStudents);
      localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(updatedStudents));
      setViewingStudent(prev => prev ? { ...prev, project: updatedProject || undefined, nodes: updatedNodes } : null);
    } else if (activeProfile?.role === 'student') {
      const studentNameNorm = activeProfile.name.trim().toLowerCase();
      const updatedStudents = students.map(s => {
        const isMatch = s.classroomId === activeProfile.classroomId && 
                        s.name.trim().toLowerCase() === studentNameNorm;
        if (isMatch) {
          return { ...s, project: updatedProject || undefined, nodes: updatedNodes };
        }
        return s;
      });
      setStudents(updatedStudents);
      localStorage.setItem(STORAGE_STUDENTS_KEY, JSON.stringify(updatedStudents));
    } else {
      setSoloProject(updatedProject);
      setSoloNodes(updatedNodes);
      if (updatedProject) {
        localStorage.setItem(STORAGE_PROJECT_KEY, JSON.stringify(updatedProject));
      } else {
        localStorage.removeItem(STORAGE_PROJECT_KEY);
      }
      localStorage.setItem(STORAGE_NODES_KEY, JSON.stringify(updatedNodes));
    }
  };

  // Workspace callback event triggers
  const handleStartProject = (projectDetails: Omit<Project, 'id' | 'createdAt' | 'activePhase'>) => {
    const newProject: Project = {
      ...projectDetails,
      id: `project-${Date.now()}`,
      createdAt: new Date().toISOString(),
      activePhase: 'Ideação'
    };

    const coreNode: ThoughtNode = {
      id: 'node-core',
      type: 'core',
      title: newProject.name,
      content: newProject.problem,
      phase: 'Ideação',
      x: 1000,
      y: 1000,
      connections: [],
      createdAt: new Date().toISOString()
    };

    const welcomeNode: ThoughtNode = {
      id: 'node-welcome',
      type: 'user-thought',
      title: 'Mesa de Trabalho',
      content: 'Bem-vindo ao seu laboratório de Inteligência Projetual 5I\'s!\n\nNo painel da direita, convoque os "Mediadores Inteligentes" para provocar debates científicos e registrar reflexões.\n\n• Dê duplo clique no grid para criar blocos de notas livres.\n• Arraste os cards pelas barras de cabeçalho para organizar sua mesa.',
      phase: 'Ideação',
      x: 1000,
      y: 1250,
      connections: ['node-core'],
      createdAt: new Date().toISOString()
    };

    saveActiveProjectAndNodes(newProject, [coreNode, welcomeNode]);
  };

  const handleUpdateNodeCoords = (id: string, x: number, y: number) => {
    const updated = nodes.map(n => n.id === id ? { ...n, x, y } : n);
    saveActiveProjectAndNodes(project, updated);
  };

  const handleAddCustomThought = (x: number, y: number) => {
    if (!project) return;
    
    const newNote: ThoughtNode = {
      id: `custom-note-${Date.now()}`,
      type: 'user-thought',
      title: 'Bloco de Notas',
      content: '',
      phase: project.activePhase,
      x,
      y,
      connections: ['node-core'],
      createdAt: new Date().toISOString()
    };

    saveActiveProjectAndNodes(project, [...nodes, newNote]);
  };

  const handleUpdateNodeContent = (id: string, content: string, completed = false) => {
    const updated = nodes.map(n => {
      if (n.id === id) {
        return { ...n, content, isCompleted: completed };
      }
      return n;
    });
    saveActiveProjectAndNodes(project, updated);
  };

  const handleDeleteNode = (id: string) => {
    const updated = nodes
      .filter(n => n.id !== id)
      .map(n => ({
        ...n,
        connections: n.connections.filter(cId => cId !== id)
      }));
    saveActiveProjectAndNodes(project, updated);
  };

  const handleAddNode = (newNodeDetails: Omit<ThoughtNode, 'id' | 'createdAt'>) => {
    const newNode: ThoughtNode = {
      ...newNodeDetails,
      id: `node-insight-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    saveActiveProjectAndNodes(project, [...nodes, newNode]);
  };

  const handleUpdatePhase = (phase: Phase) => {
    if (!project) return;
    const updatedProject = { ...project, activePhase: phase };
    saveActiveProjectAndNodes(updatedProject, nodes);
  };

  const handleExit = () => {
    if (viewingStudent) {
      // Exit student workspace back to advisor/partner dashboard
      setViewingStudent(null);
    } else if (activeProfile?.role === 'student') {
      if (confirm("Deseja fechar a sua mesa de projeto? Suas respostas foram salvas na turma.")) {
        handleLogout();
      }
    } else {
      if (confirm("Deseja fechar a sua mesa de projeto? Seus dados locais continuam salvos.")) {
        setSoloProject(null);
        setSoloNodes([]);
      }
    }
  };

  // RENDER SELECTION DECISION
  if (!activeProfile) {
    return <LoginScreen classrooms={classrooms} onLogin={handleLogin} />;
  }

  // ADVISOR ROLE VIEW
  if (activeProfile.role === 'advisor') {
    if (viewingStudent) {
      if (!project) {
        return (
          <div className="min-h-screen bg-[#FDFDFB] flex flex-col items-center justify-center p-6 text-center">
            <GraduationCap size={40} className="text-neutral-400 mb-2" />
            <h2 className="text-lg font-bold text-neutral-900">Mesa Não Iniciada</h2>
            <p className="text-xs text-neutral-500 max-w-sm mt-1">
              O aluno <strong>{viewingStudent.name}</strong> ainda não iniciou as fases de modelagem científica do projeto.
            </p>
            <button 
              onClick={() => setViewingStudent(null)}
              className="mt-4 px-4 py-2 bg-black text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={13} /> Voltar ao Painel
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-brand-beige">
          <Workspace
            project={project}
            nodes={nodes}
            onUpdateNodeCoords={handleUpdateNodeCoords}
            onAddCustomThought={handleAddCustomThought}
            onUpdateNodeContent={handleUpdateNodeContent}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onUpdatePhase={handleUpdatePhase}
            onExit={handleExit}
            currentUser={activeProfile}
            studentName={viewingStudent.name}
          />
        </div>
      );
    }

    return (
      <AdvisorDashboard
        advisor={activeProfile}
        classrooms={classrooms}
        students={students}
        onAddClassroom={handleAddClassroom}
        onAddStudent={handleAddStudent}
        onViewStudentProject={handleViewStudentProject}
        onLogout={handleLogout}
      />
    );
  }

  // PARTNER ROLE VIEW
  if (activeProfile.role === 'partner') {
    if (viewingStudent) {
      if (!project) {
        return (
          <div className="min-h-screen bg-[#FDFDFB] flex flex-col items-center justify-center p-6 text-center">
            <Users size={40} className="text-neutral-400 mb-2" />
            <h2 className="text-lg font-bold text-neutral-900">Mesa Não Iniciada</h2>
            <p className="text-xs text-neutral-500 max-w-sm mt-1">
              Este aluno ainda não configurou uma mesa de projeto ativa para co-desenho.
            </p>
            <button 
              onClick={() => setViewingStudent(null)}
              className="mt-4 px-4 py-2 bg-black text-white rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft size={13} /> Voltar ao Painel
            </button>
          </div>
        );
      }

      return (
        <div className="min-h-screen bg-brand-beige">
          <Workspace
            project={project}
            nodes={nodes}
            onUpdateNodeCoords={handleUpdateNodeCoords}
            onAddCustomThought={handleAddCustomThought}
            onUpdateNodeContent={handleUpdateNodeContent}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onUpdatePhase={handleUpdatePhase}
            onExit={handleExit}
            currentUser={activeProfile}
            studentName={viewingStudent.name}
          />
        </div>
      );
    }

    if (project) {
      return (
        <div className="min-h-screen bg-brand-beige">
          <Workspace
            project={project}
            nodes={nodes}
            onUpdateNodeCoords={handleUpdateNodeCoords}
            onAddCustomThought={handleAddCustomThought}
            onUpdateNodeContent={handleUpdateNodeContent}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onUpdatePhase={handleUpdatePhase}
            onExit={handleExit}
            currentUser={activeProfile}
            studentName={activeProfile.institution || 'Parceiro'}
          />
        </div>
      );
    }

    // PARTNER DASHBOARD (PORTAL DE COPRODUÇÃO)
    return (
      <div className="min-h-screen bg-[#FDFDFB] p-4 sm:p-8 font-sans select-none">
        <div className="max-w-5xl mx-auto space-y-6">
          
          {/* HEADER */}
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-[#E0E0DE] pb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 flex items-center justify-center bg-black rounded-xl text-white shadow-md">
                <Users size={20} />
              </div>
              <div>
                <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">Portal do Ecossistema</span>
                <h1 className="text-xl font-bold text-neutral-900 leading-tight">{activeProfile.name}</h1>
                <p className="text-xs text-neutral-500 font-mono mt-0.5">
                  Representando: <span className="font-bold text-black uppercase">{activeProfile.partnerType}</span> 
                  {activeProfile.institution && ` — ${activeProfile.institution}`}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-[#E0E0DE] text-neutral-600 hover:text-black hover:bg-neutral-50 rounded-xl text-xs font-mono font-bold tracking-wide transition-all flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <LogOut size={13} />
              <span>Sair do Portal</span>
            </button>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            
            {/* COLLABORATIVE PROPOSAL */}
            <div className="md:col-span-4 bg-white border border-[#E0E0DE] rounded-2xl p-5 space-y-4 shadow-sm h-full">
              <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                <Sparkles size={15} />
                <span>Co-Design</span>
              </h2>
              <p className="text-xs text-neutral-500 font-light leading-relaxed">
                Inicie uma mesa de proposição direta e independente, conectando as demandas do seu território (comunidade, empresa ou governo) aos ODS.
              </p>
              <button
                onClick={() => {
                  // Setup temporary mock project details
                  handleStartProject({
                    name: 'Proposta Territorial ' + (activeProfile.institution || activeProfile.name),
                    problem: 'Descreva aqui as demandas e problemas reais do território para co-modelagem dialética.',
                    community: activeProfile.institution || 'Comunidade local',
                    ods: '11 - Cidades e Comunidades Sustentáveis',
                    projectType: 'Inovação Social e Co-Design'
                  });
                }}
                className="w-full py-3 bg-black hover:bg-neutral-800 text-white rounded-xl text-xs font-mono font-bold uppercase tracking-widest transition-all cursor-pointer shadow-sm"
              >
                Nova Mesa Co-Design
              </button>
            </div>

            {/* CLASS PROJECTS TO LEAVE FEEDBACK */}
            <div className="md:col-span-8 bg-white border border-[#E0E0DE] rounded-2xl p-5 space-y-4 shadow-sm min-h-[300px]">
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-800 flex items-center gap-2">
                  <Globe size={15} />
                  <span>Colaboração em Projetos Universitários</span>
                </h2>
                <span className="text-xs text-neutral-400 font-light block mt-0.5">
                  Explore as mesas de projeto criadas por estudantes e colabore como um ator real do território deixado pareceres de viabilidade social e de mercado.
                </span>
              </div>

              {/* CLASSROOM ITERATIONS */}
              <div className="space-y-4 mt-2">
                {classrooms.map(c => {
                  const classStudents = students.filter(s => s.classroomId === c.id && s.project);
                  if (classStudents.length === 0) return null;

                  return (
                    <div key={c.id} className="border-t border-[#F0F0EE] pt-3.5 space-y-2">
                      <h3 className="font-bold text-xs text-neutral-400 uppercase tracking-wider font-mono">{c.name}</h3>
                      <div className="grid grid-cols-1 gap-2.5">
                        {classStudents.map(s => (
                          <div key={s.id} className="p-3 bg-[#F9F9F8] border border-[#E0E0DE] rounded-xl flex justify-between items-center gap-4">
                            <div className="space-y-0.5">
                              <span className="text-xs font-bold text-neutral-950">{s.name}</span>
                              <span className="text-[11px] text-neutral-500 block leading-none italic font-light">"{s.project?.name}"</span>
                            </div>
                            <button
                              onClick={() => handleViewStudentProject(s)}
                              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-black text-white rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                            >
                              Colaborar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {students.filter(s => s.project).length === 0 && (
                  <p className="text-center text-xs text-neutral-400 py-8 italic font-light">
                    Nenhum projeto de estudante ativo para feedback no momento.
                  </p>
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  }

  // STUDENT ROLE VIEW
  if (activeProfile.role === 'student') {
    const studentNameNorm = activeProfile.name.trim().toLowerCase();
    const currentStudent = students.find(s => 
      s.classroomId === activeProfile.classroomId && 
      s.name.trim().toLowerCase() === studentNameNorm
    );
    const activeClassroom = classrooms.find(c => c.id === activeProfile.classroomId);

    if (project) {
      return (
        <div className="min-h-screen bg-brand-beige">
          <Workspace
            project={project}
            nodes={nodes}
            onUpdateNodeCoords={handleUpdateNodeCoords}
            onAddCustomThought={handleAddCustomThought}
            onUpdateNodeContent={handleUpdateNodeContent}
            onDeleteNode={handleDeleteNode}
            onAddNode={handleAddNode}
            onUpdatePhase={handleUpdatePhase}
            onExit={handleExit}
            currentUser={activeProfile}
            studentName={activeClassroom?.name || 'Sua Turma'}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#FDFDFB] flex flex-col justify-between">
        
        {/* STUDENT WELCOME ONBOARDING */}
        <header className="h-16 border-b border-[#F0F0EE] px-4 sm:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark compact priority className="w-[38px] h-[33px]" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">Ambiente de Aprendizagem</span>
              <span className="text-xs font-semibold text-neutral-900 leading-tight">Olá, {activeProfile.name}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="p-1.5 rounded-xl border border-[#E0E0DE] text-neutral-600 hover:text-black hover:bg-neutral-50 flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
          >
            <ArrowLeft size={13} />
            <span>Trocar Perfil</span>
          </button>
        </header>

        <div className="flex-1 flex items-center justify-center py-6">
          <FirstExperience 
            onStart={handleStartProject} 
          />
        </div>

      </div>
    );
  }

  // SOLO / INDIVIDUAL WORK VIEW
  if (project) {
    return (
      <div className="min-h-screen bg-brand-beige">
        <Workspace
          project={project}
          nodes={nodes}
          onUpdateNodeCoords={handleUpdateNodeCoords}
          onAddCustomThought={handleAddCustomThought}
          onUpdateNodeContent={handleUpdateNodeContent}
          onDeleteNode={handleDeleteNode}
          onAddNode={handleAddNode}
          onUpdatePhase={handleUpdatePhase}
          onExit={handleExit}
          currentUser={activeProfile}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] flex flex-col justify-between">
      <header className="h-16 border-b border-[#F0F0EE] px-4 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrandMark compact priority className="w-[38px] h-[33px]" />
          <div className="flex flex-col text-left">
            <span className="text-[9px] font-bold uppercase tracking-widest text-black/40">Projeto Individual</span>
            <span className="text-xs font-semibold text-neutral-900 leading-tight">{activeProfile.name}</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="p-1.5 rounded-xl border border-[#E0E0DE] text-neutral-600 hover:text-black hover:bg-neutral-50 flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft size={13} />
          <span>Trocar Perfil</span>
        </button>
      </header>

      <div className="flex-1 flex items-center justify-center py-6">
        <FirstExperience onStart={handleStartProject} />
      </div>
    </div>
  );
}
