import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Compass, Activity, Heart, UserCheck, Layout, BookOpen, 
  ChevronRight, ArrowLeft, Loader2, PlayCircle, Globe, Milestone, Check, RefreshCw,
  Menu, X, ShieldCheck, Code2
} from 'lucide-react';
import { Project, Phase, ThoughtNode, Mediator, UserProfile } from '../types';
import InfiniteCanvas, { InfiniteCanvasHandle } from './InfiniteCanvas';
import MediatorSticker from './MediatorSticker';
import BrandMark from './BrandMark';
import { ensureTursoSession } from '../lib/turso';

interface WorkspaceProps {
  project: Project;
  nodes: ThoughtNode[];
  onUpdateNodeCoords: (id: string, x: number, y: number) => void;
  onAddCustomThought: (x: number, y: number) => void;
  onUpdateNodeContent: (id: string, text: string, completed?: boolean) => void;
  onDeleteNode: (id: string) => void;
  onAddNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => void;
  onUpdatePhase: (phase: Phase) => void;
  onExit: () => void;
  currentUser?: UserProfile | null;
  studentName?: string;
}

const MEDIATORS: Mediator[] = [
  {
    id: 'med-pesquisa',
    name: 'Prof. Dra. Helena Mendes',
    role: 'Etnografia de Campo & Pesquisa Científica',
    description: 'Aprofunda o contexto social, triangulação e amostragem.',
    bio: 'Pós-doutora em Antropologia Digital. Defensora do design participativo real, Helena instiga o questionamento de campo para evitar suposições vazias e obter saturação empírica.',
    iconName: 'Compass',
    themeColor: 'amber',
    greeting: 'Que premissas nós tomamos como verdades sem antes ouvir os silêncios da comunidade?'
  },
  {
    id: 'med-ux',
    name: 'Dr. Théo Vasconcelos',
    role: 'Ergonomia Cognitiva & Arquitetura UX',
    description: 'Analisa modelos mentais e minimiza carga cognitiva.',
    bio: 'Pesquisador sênior de interações humano-computador. Théo avalia a interface sob o filtro das limitações do processamento de informação humana, carga visual e fluxo de tarefas.',
    iconName: 'Activity',
    themeColor: 'emerald',
    greeting: 'Como o fluxo projetado se conecta com a rotina e os esquemas mentais que o usuário já domina?'
  },
  {
    id: 'med-bioetico',
    name: 'Filósofa Mariana Solis',
    role: 'Design de Justiça & Impacto Bioético',
    description: 'Sintoniza valores sociais e impede dark patterns.',
    bio: 'Escritora e ativista em ética tecnológica. Mariana examina as ramificações de poder, justiça social e sustentabilidade, garantindo alinhamento genuíno com os ODS ecológicos e sociais.',
    iconName: 'Heart',
    themeColor: 'rose',
    greeting: 'Quem é excluído quando este sistema funciona exatamente como foi planejado?'
  },
  {
    id: 'med-acessibilidade',
    name: 'Pesquisador Jonas Ramos',
    role: 'Acessibilidade Universal & Inclusão WCAG',
    description: 'Valida conformidade sensorial e motora universal.',
    bio: 'Auditor líder de acessibilidade digital. Jonas guia o design focado na diversidade funcional humana (visual, motora, cognitiva, auditiva), garantindo que a interface seja operável por todos.',
    iconName: 'UserCheck',
    themeColor: 'indigo',
    greeting: 'Como alguém que interage exclusivamente por teclado ou leitor de telas reconstrói esta experiência na mente?'
  },
  {
    id: 'med-visual',
    name: 'Mestre Cláudio Gropius',
    role: 'Semiótica Sintática & Design Visual',
    description: 'Refina Gestalt, tipografia vernacular e ritmos.',
    bio: 'Especialista em design de sistemas visuais com influência Bauhaus-Ulm. Cláudio investiga se a estética comunica a função de forma intuitiva, avaliando semiótica e ritmos de espaçamento.',
    iconName: 'Layout',
    themeColor: 'violet',
    greeting: 'As relações de contraste, pesos e silêncios tipográficos direcionam a atenção ou geram ruído visual?'
  },
  {
    id: 'med-documentacao',
    name: 'Engenheira Beatriz Lin',
    role: 'Sistemas de Design, Handoff & ADRs',
    description: 'Estrutura taxonomia de tokens e decisões.',
    bio: 'Engenheira de computação e especialista em Design Operations. Beatriz assegura que as tomadas de decisão de design sejam catalogáveis e traduzíveis em código limpo com impacto de governança.',
    iconName: 'BookOpen',
    themeColor: 'sky',
    greeting: 'Como podemos modularizar este pensamento em regras e especificações que resistam ao tempo?'
  },
  {
    id: 'med-heuristicas',
    name: 'Analista Lina Nielsen',
    role: 'Heurísticas de Usabilidade & 101 UX Rules',
    description: 'Inspeciona consistência, feedback, erros e esforço cognitivo.',
    bio: 'Especialista em inspeção sistemática de interfaces. Lina cruza as heurísticas de Nielsen, princípios de Norman e regras práticas de UX sem transformar listas em respostas automáticas.',
    iconName: 'ShieldCheck',
    themeColor: 'emerald',
    greeting: 'Qual violação observável impede a pessoa de compreender, prever ou recuperar-se nesta interação?'
  },
  {
    id: 'med-implementacao',
    name: 'Arquiteta Ada Torres',
    role: 'Implementação, Requisitos & Qualidade Técnica',
    description: 'Traduz decisões em critérios verificáveis e arquitetura segura.',
    bio: 'Arquiteta de software orientada a produto. Ada relaciona decisões projetuais a requisitos, critérios de aceite, desempenho, segurança, LGPD e estratégias de teste.',
    iconName: 'Code2',
    themeColor: 'sky',
    greeting: 'Que requisito verificável preserva esta decisão quando ela deixa o canvas e entra no código?'
  }
];

const PHASES_METADATA: { phase: Phase; description: string; scientificContext: string }[] = [
  { 
    phase: 'Ideação', 
    description: 'Definição do escopo conceitual e tempestade de conexões.',
    scientificContext: 'Mapeamento Semântico & Conexões Latentes'
  },
  { 
    phase: 'Inambulação', 
    description: 'Caminhar no contexto. Imersão profunda no ambiente social.',
    scientificContext: 'Etnografia de Interfaces & Empatia Vernacular'
  },
  { 
    phase: 'Instauração', 
    description: 'Estabelecer os pilares, layout e grids estruturais.',
    scientificContext: 'Semiótica Aplicada & Modularidade Espacial'
  },
  { 
    phase: 'Inspeção', 
    description: 'Avaliação crítica baseada em usabilidade e bioética.',
    scientificContext: 'Carga Cognitiva & Heurísticas Adaptadas'
  },
  { 
    phase: 'Implementação', 
    description: 'Preparação sistêmica para tradução tecnológica.',
    scientificContext: 'Tokenização Semântica & Handoff Científico'
  },
];

export default function Workspace({
  project,
  nodes,
  onUpdateNodeCoords,
  onAddCustomThought,
  onUpdateNodeContent,
  onDeleteNode,
  onAddNode,
  onUpdatePhase,
  onExit,
  currentUser,
  studentName
}: WorkspaceProps) {
  const [selectedMediatorId, setSelectedMediatorId] = useState<string>('med-pesquisa');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string>('');
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(false);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(false);
  const canvasRef = useRef<InfiniteCanvasHandle>(null);

  const activeMediator = MEDIATORS.find(m => m.id === selectedMediatorId) || MEDIATORS[0];

  // Helper to resolve icon React node
  const getMediatorIcon = (iconName: string, size = 16, className = "") => {
    switch(iconName) {
      case 'Compass': return <Compass size={size} className={className} />;
      case 'Activity': return <Activity size={size} className={className} />;
      case 'Heart': return <Heart size={size} className={className} />;
      case 'UserCheck': return <UserCheck size={size} className={className} />;
      case 'Layout': return <Layout size={size} className={className} />;
      case 'BookOpen': return <BookOpen size={size} className={className} />;
      case 'ShieldCheck': return <ShieldCheck size={size} className={className} />;
      case 'Code2': return <Code2 size={size} className={className} />;
      default: return <Compass size={size} className={className} />;
    }
  };

  const getMediatorColorClass = (color: string) => {
    switch(color) {
      case 'amber': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'emerald': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'rose': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'indigo': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'violet': return 'text-violet-600 bg-violet-50 border-violet-200';
      case 'sky': return 'text-sky-600 bg-sky-50 border-sky-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleTriggerMediator = async () => {
    setIsGenerating(true);
    setGenError('');

    try {
      const coreNode = nodes.find(n => n.type === 'core');
      const coreNodeId = coreNode ? coreNode.id : 'node-core';

      // O novo questionamento nasce no centro da área do canvas que a pessoa
      // está vendo agora, respeitando pan e zoom. Antes, ele era calculado em
      // torno da âncora central e podia aparecer muito abaixo ou fora da tela.
      const centeredPosition = canvasRef.current?.getCenteredCardPosition(360, 460);
      const spawnX = centeredPosition?.x ?? coreNode?.x ?? 1000;
      const spawnY = centeredPosition?.y ?? coreNode?.y ?? 1000;

      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({
          project: {
            name: project.name,
            projectType: project.projectType,
            problem: project.problem,
            community: project.community,
            ods: project.ods
          },
          mediator: {
            name: activeMediator.name,
            role: activeMediator.role,
            bio: activeMediator.bio
          },
          phase: project.activePhase,
          existingThoughts: nodes.map(n => ({
            type: n.type,
            title: n.title,
            content: n.content,
            phase: n.phase
          }))
        })
      });

      const rawResponse = await response.text();
      let insight: any = {};

      try {
        insight = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        throw new Error(
          response.ok
            ? 'A IA devolveu uma resposta em formato inválido.'
            : `A função de IA falhou na Vercel (HTTP ${response.status}). Consulte os logs do deploy.`
        );
      }

      if (!response.ok) {
        throw new Error(insight.error || `Falha ao buscar insights do Mediador (HTTP ${response.status}).`);
      }

      if (!insight.question || !Array.isArray(insight.provocations)) {
        throw new Error('A resposta da IA veio incompleta. Tente novamente.');
      }

      // Add the generated thought node to the infinite canvas
      onAddNode({
        type: 'question',
        title: activeMediator.name,
        content: insight.question,
        phase: project.activePhase,
        x: spawnX,
        y: spawnY,
        mediatorId: activeMediator.id,
        scientificContext: insight.scientificContext,
        provocations: insight.provocations,
        connections: [coreNodeId], // automatic link to project central anchor
        isCompleted: false
      });

    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'Erro inesperado na Inteligência de Mediação.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="project-workspace" className="h-screen flex flex-col bg-brand-beige font-sans select-none overflow-hidden">
      
      {/* Role Banner notifications */}
      {currentUser && currentUser.role === 'advisor' && (
        <div className="bg-neutral-900 text-white text-xs py-2 px-4 flex items-center justify-between font-mono gap-2 shrink-0 z-30 shadow-sm border-b border-black">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">Modo Orientador(a) — Visualizando mesa de: <strong>{studentName || 'Estudante'}</strong></span>
          </span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 hidden sm:inline">Visualização & Feedback</span>
        </div>
      )}

      {currentUser && currentUser.role === 'partner' && (
        <div className="bg-black text-white text-xs py-2 px-4 flex items-center justify-between font-mono gap-2 shrink-0 z-30 shadow-sm border-b border-neutral-900">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="truncate">Parceiro(a) do Território — Ator: <strong>{currentUser.name}</strong> ({currentUser.partnerType ? currentUser.partnerType.toUpperCase() : 'Stakeholder'})</span>
          </span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 hidden sm:inline">{currentUser.institution || 'Ecossistema'}</span>
        </div>
      )}

      {currentUser && currentUser.role === 'student' && (
        <div className="bg-[#F5F5F3] text-neutral-800 text-[11px] py-1.5 px-4 flex items-center justify-between font-mono gap-2 border-b border-[#E0E0DE] shrink-0 z-30">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Estudante: <strong>{currentUser.name}</strong></span>
          </span>
          {studentName && (
            <span className="text-[10px] font-semibold text-neutral-500 bg-[#E0E0DE]/50 px-2 py-0.5 rounded shrink-0">
              Turma: {studentName}
            </span>
          )}
        </div>
      )}

      {/* Top Bar Navigation & Status */}
      <header id="workspace-top-bar" className="h-16 bg-[#FDFDFB]/80 backdrop-blur-md border-b border-[#F0F0EE] px-4 sm:px-8 flex items-center justify-between z-30">
        <div className="flex items-center gap-3 sm:gap-4">
          <button 
            onClick={onExit}
            className="p-2 rounded-xl hover:bg-black/5 text-neutral-500 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5"
            title="Voltar ao início"
          >
            <ArrowLeft size={15} />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase hidden sm:inline">SAIR</span>
          </button>
          
          <div className="h-4 w-[1px] bg-[#E0E0DE]" />
          
          <div className="flex items-center gap-2.5 sm:gap-3">
            <BrandMark compact priority className="w-[38px] h-[33px] flex-shrink-0" />
            <div className="h-4 w-[1px] bg-[#E0E0DE] hidden sm:block" />
            <div className="flex flex-col text-left">
              <span className="text-[9px] font-bold uppercase tracking-widest text-black/40 hidden sm:block">Laboratório de Inteligência Projetual</span>
              <span className="text-xs font-semibold text-neutral-900 leading-tight truncate max-w-[120px] sm:max-w-[200px]">{project.name}</span>
            </div>
          </div>
        </div>

        {/* Mid bar sustainability badge */}
        <div id="workspace-sustainability-indicator" className="hidden lg:flex items-center gap-2 bg-[#F5F5F3] border border-[#E0E0DE] px-3 py-1 rounded-full text-[10px] font-mono text-[#70706E]">
          <Globe size={11} className="text-neutral-500" />
          <span className="font-semibold uppercase tracking-wide opacity-60">Regido por:</span>
          <span className="truncate max-w-xs font-medium">{project.ods}</span>
        </div>

        {/* Current status telemetry & Mobile Panel toggles */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          <div className="flex items-center gap-1.5 lg:hidden">
            <button
              onClick={() => {
                setIsLeftSidebarOpen(!isLeftSidebarOpen);
                setIsRightSidebarOpen(false);
              }}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                isLeftSidebarOpen 
                  ? 'bg-black text-white border-black shadow-sm' 
                  : 'bg-[#F5F5F3] text-neutral-600 border-[#E0E0DE] hover:bg-neutral-100'
              }`}
              title="Metodologia 5I’s"
            >
              <Compass size={14} />
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase hidden sm:inline">Metodologia</span>
            </button>
            
            <button
              onClick={() => {
                setIsRightSidebarOpen(!isRightSidebarOpen);
                setIsLeftSidebarOpen(false);
              }}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                isRightSidebarOpen 
                  ? 'bg-black text-white border-black shadow-sm' 
                  : 'bg-[#F5F5F3] text-neutral-600 border-[#E0E0DE] hover:bg-neutral-100'
              }`}
              title="Mediadores Inteligentes"
            >
              <Sparkles size={14} />
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase hidden sm:inline">Mediadores</span>
            </button>
          </div>

          <span className="text-[9px] font-mono text-[#70706E] bg-[#F5F5F3] border border-[#E0E0DE] rounded-full px-3 py-1 font-semibold uppercase tracking-wider hidden md:block">
            Draft: {project.projectType}
          </span>
        </div>
      </header>

      {/* Main workspace layout content splits */}
      <div id="workspace-body" className="flex-1 flex relative overflow-hidden">
        
        {/* Backdrops for mobile drawers */}
        {isLeftSidebarOpen && (
          <div 
            className="fixed inset-0 top-16 bg-black/30 z-30 lg:hidden" 
            onClick={() => setIsLeftSidebarOpen(false)}
          />
        )}
        {isRightSidebarOpen && (
          <div 
            className="fixed inset-0 top-16 bg-black/30 z-30 lg:hidden" 
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Metodologia 5I’s organism tracker */}
        <aside 
          id="left-sidebar-methodology" 
          className={`fixed lg:relative top-16 lg:top-0 left-0 h-[calc(100vh-4rem)] lg:h-full w-72 max-w-[85vw] bg-white border-r border-[#F0F0EE] flex flex-col justify-between z-40 lg:z-20 transition-transform duration-300 ${
            isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Mobile close button inside Left Sidebar header */}
          <button 
            onClick={() => setIsLeftSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 text-neutral-500 hover:text-black absolute top-4 right-4 z-50 cursor-pointer"
            title="Fechar menu"
          >
            <X size={15} />
          </button>
          
          {/* Header section */}
          <div className="p-5 border-b border-[#F0F0EE]">
            <span className="text-[9px] font-mono font-bold tracking-widest text-[#70706E] uppercase block mb-1">
              METODOLOGIA INTEGRADA
            </span>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">Metodologia 5I’s</h3>
            <p className="text-[11px] text-[#70706E] mt-1 font-light leading-relaxed">
              O projeto se move como um ecossistema. Selecione um eixo para focar o canvas e focar o debate.
            </p>
          </div>

          {/* Phase living map (list) - Beautiful Organic Connection Line & Dot Grid */}
          <div id="phases-living-list" className="flex-1 py-6 overflow-y-auto px-6 relative flex flex-col gap-6">
            {/* The Organic Connection Line */}
            <div className="absolute left-[38px] top-10 bottom-10 w-[1px] bg-gradient-to-b from-black via-[#E0E0DE] to-[#F0F0EE]" />

            {PHASES_METADATA.map((meta, idx) => {
              const isActive = project.activePhase === meta.phase;
              const completedNodesOfPhase = nodes.filter(n => n.phase === meta.phase && n.isCompleted).length;
              const totalNodesOfPhase = nodes.filter(n => n.phase === meta.phase).length;
              
              return (
                <button
                  key={meta.phase}
                  onClick={() => onUpdatePhase(meta.phase)}
                  className={`w-full text-left flex items-start gap-4 transition-all duration-200 relative group cursor-pointer outline-none ${
                    isActive ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                  }`}
                >
                  {/* Circle Indicator on the Organic Line */}
                  <div className="relative z-10 flex-shrink-0 mt-1">
                    {isActive ? (
                      <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center border-4 border-white shadow-md transition-all scale-110">
                        <div className="w-1.5 h-1.5 bg-white rounded-full" />
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-[#E0E0DE] flex items-center justify-center border-4 border-white transition-all">
                        <div className="w-1.5 h-1.5 bg-[#80807E] rounded-full" />
                      </div>
                    )}
                  </div>

                  {/* Content block */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between">
                      <span className={`text-[12px] tracking-tight uppercase font-bold text-[#1A1A1A]`}>
                        {meta.phase}
                      </span>
                      {/* Progress Badge */}
                      <span className="text-[8px] font-mono font-bold uppercase tracking-wider text-black/50 bg-[#F5F5F3] border border-[#E0E0DE] px-1.5 py-0.5 rounded-full">
                        {completedNodesOfPhase}/{totalNodesOfPhase}
                      </span>
                    </div>
                    <span className="text-[10px] text-black/40 font-medium leading-tight">
                      {meta.description}
                    </span>
                    
                    {/* Scientific context */}
                    <span className="text-[9px] font-mono text-[#70706E] tracking-tighter mt-1 italic block truncate max-w-[170px]">
                      {meta.scientificContext}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Core metadata footer summary with Poetic Quote Box */}
          <div className="p-5 border-t border-[#F0F0EE] bg-white space-y-4">
            <div className="p-4 rounded-2xl bg-[#F5F5F3] border border-[#E0E0DE]">
              <p className="text-[10px] leading-relaxed text-[#70706E] italic">
                "A forma segue o pensamento, mas o projeto segue a vida."
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-[9px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                <span>Estado Ecossistema:</span>
                <span className="text-neutral-700 font-bold flex items-center gap-1">
                  {Math.round((nodes.filter(n => n.isCompleted).length / Math.max(nodes.filter(n => n.type === 'question').length, 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#F0F0EE] rounded-full h-1 mt-1.5 overflow-hidden">
                <div 
                  className="bg-black h-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.round((nodes.filter(n => n.isCompleted).length / Math.max(nodes.filter(n => n.type === 'question').length, 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>

        </aside>

        {/* Center Section: Infinite Canvas Board */}
        <InfiniteCanvas
          ref={canvasRef}
          project={project}
          nodes={nodes}
          activePhase={project.activePhase}
          onUpdateNodeCoords={onUpdateNodeCoords}
          onAddCustomThought={onAddCustomThought}
          onUpdateNodeContent={onUpdateNodeContent}
          onDeleteNode={onDeleteNode}
        />

        {/* Right Sidebar: Intelligent Mediators Panel */}
        <aside 
          id="right-sidebar-mediators" 
          className={`fixed lg:relative top-16 lg:top-0 right-0 h-[calc(100vh-4rem)] lg:h-full w-[330px] max-w-[85vw] bg-white border-l border-[#F0F0EE] flex flex-col justify-between z-40 lg:z-20 transition-transform duration-300 ${
            isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
          }`}
        >
          {/* Mobile close button inside Right Sidebar header */}
          <button 
            onClick={() => setIsRightSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-black/5 text-neutral-500 hover:text-black absolute top-4 right-4 z-50 cursor-pointer"
            title="Fechar menu"
          >
            <X size={15} />
          </button>
          
          {/* Top section: selection of mediators */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 border-b border-[#F0F0EE]">
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#70706E] uppercase block mb-1">
                INTELIGÊNCIA PROJETUAL
              </span>
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Mediadores Inteligentes</h3>
              <p className="text-[11px] text-[#70706E] mt-1 font-light leading-relaxed">
                Nossos mediadores não escrevem soluções para você. Eles provocam reflexões científicas e metodológicas profundas.
              </p>
            </div>

            {/* Micro grid select of Mediators */}
            <div className="p-4 border-b border-[#F0F0EE]">
              <span className="text-[9px] font-mono text-[#70706E] uppercase tracking-wider block mb-3 font-semibold">CONVOCAR MEDIADOR DE OUTRO EIXO</span>
              <div className="grid grid-cols-3 gap-1.5">
                {MEDIATORS.map((m) => {
                  const isSelected = m.id === selectedMediatorId;
                  const colorStyle = getMediatorColorClass(m.themeColor);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMediatorId(m.id)}
                      className={`mediator-picker py-2.5 px-1 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer text-center group ${
                        isSelected 
                          ? 'border-black bg-white text-black shadow-[0_7px_0_#1A1A1A] -translate-y-1' 
                          : 'border-[#F0F0EE] hover:border-[#1A1A1A] bg-[#FDFDFB] text-[#1A1A1A]/70'
                      }`}
                      title={`${m.name} - ${m.role}`}
                    >
                      <MediatorSticker
                        mediatorId={m.id}
                        size={42}
                        state={isSelected ? 'selected' : 'idle'}
                        label={`Sticker de ${m.name}`}
                      />
                      <span className="text-[9px] font-mono font-bold truncate max-w-[85px]">{m.name.split(' ').slice(-1)[0]}</span>
                      <span className={`h-1 w-1 rounded-full transition-all ${isSelected ? 'bg-black scale-100' : 'bg-transparent scale-0'}`} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Selected Mediator Details Card */}
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <MediatorSticker
                  mediatorId={activeMediator.id}
                  size={68}
                  state={isGenerating ? 'thinking' : 'selected'}
                  label={`Mediador ativo: ${activeMediator.name}`}
                />
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono font-bold text-[#70706E] uppercase">MEDIADOR ATIVO</span>
                  <h4 className="text-sm font-bold text-neutral-900 leading-snug">{activeMediator.name}</h4>
                  <span className="text-[10px] text-black font-mono tracking-wider font-semibold leading-none mt-0.5">{activeMediator.role}</span>
                </div>
              </div>

              {/* Bio description */}
              <div className="bg-[#F9F9F8] rounded-2xl p-4 border border-[#F0F0EE] flex flex-col gap-3">
                <p className="text-[11px] text-[#50504E] leading-relaxed font-light">
                  {activeMediator.bio}
                </p>
                <div className="w-full h-px bg-[#F0F0EE]" />
                
                {/* Embedded Dialectic Greeting */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-[#70706E] uppercase tracking-wider font-semibold">Tópico de Dialética</span>
                  <p className="text-xs text-neutral-900 font-medium italic leading-relaxed">
                    "{activeMediator.greeting}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer: Button to trigger generator on canvas */}
          <div className="p-4 bg-[#FDFDFB] border-t border-[#F0F0EE] space-y-3">
            
            {genError && (
              <p className="text-[10px] font-mono text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {genError}
              </p>
            )}

            <motion.button
              onClick={handleTriggerMediator}
              disabled={isGenerating}
              whileHover={{ scale: isGenerating ? 1 : 1.02 }}
              whileTap={{ scale: isGenerating ? 1 : 0.98 }}
              className="w-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors py-4 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.15em] cursor-pointer shadow-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin text-white" />
                  <span className="font-mono text-[10px] tracking-wider uppercase">Sintetizando...</span>
                </>
              ) : (
                <>
                  <span>PROVOCAR DIALÉTICA</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </>
              )}
            </motion.button>
            
            <div className="text-center">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">
                O questionamento será integrado ao canvas ativo
              </span>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
