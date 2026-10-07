import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, HelpCircle, X } from 'lucide-react';

type TutorialScope = 'advisor' | 'projects' | 'workspace';

type TutorialStep = {
  selector: string;
  title: string;
  description: string;
};

const STEPS: Record<TutorialScope, TutorialStep[]> = {
  advisor: [
    { selector: '[data-tour="advisor-header"]', title: 'Seu painel de orientação', description: 'Aqui ficam as funções da conta de professor(a): turmas, projetos próprios, agenda, administração e colaborações recebidas.' },
    { selector: '[data-tour="advisor-agenda"]', title: 'Agenda 5I’s', description: 'Crie entregas, lembretes e encontros. Você pode compartilhar itens com turmas inteiras ou alunos específicos.' },
    { selector: '[data-tour="advisor-classes"]', title: 'Turmas', description: 'Crie e selecione turmas, convide estudantes e acompanhe as contas que realmente entraram na plataforma.' },
    { selector: '[data-tour="advisor-own-projects"]', title: 'Seus próprios projetos', description: 'Professor(a) também pode criar e desenvolver projetos completos com a Metodologia 5I’s.' },
    { selector: '[data-tour="advisor-shared"]', title: 'Compartilhados comigo', description: 'Convites para comentar, visualizar ou editar aparecem aqui automaticamente. Não é necessário criar uma turma para acessar um projeto compartilhado.' },
  ],
  projects: [
    { selector: '[data-tour="projects-header"]', title: 'Mesa de projetos', description: 'Este é o ponto de entrada para seus projetos, materiais, agenda e colaborações recebidas.' },
    { selector: '[data-tour="projects-resources"]', title: 'Materiais da disciplina', description: 'Acesse rapidamente o Manual do Lab e, quando habilitado pela professora, as interfaces das aulas.' },
    { selector: '[data-tour="projects-create"]', title: 'Novo projeto', description: 'Crie uma nova investigação e comece pela Ideação. Cada projeto mantém seu próprio canvas e histórico.' },
    { selector: '[data-tour="projects-shared"]', title: 'Projetos compartilhados', description: 'Projetos que outras pessoas compartilharam com seu e-mail aparecem aqui, com a permissão recebida: visualizar, comentar ou editar.' },
  ],
  workspace: [
    { selector: '#workspace-top-bar', title: 'Barra principal', description: 'Aqui você volta ao dashboard, abre a agenda, comentários, colaboradores e os painéis da metodologia e dos agentes.' },
    { selector: '#canvas-viewport', title: 'Canvas infinito', description: 'Organize notas, imagens, desenhos e interações. No touch, use dois dedos para aplicar zoom por pinça e navegar pelo espaço.' },
    { selector: '#canvas-actions-panel', title: 'Notas e registros', description: 'Crie notas para registrar decisões, observações, ideias e evidências diretamente no canvas.' },
    { selector: '#canvas-actions-panel', title: 'Ateliê do Projeto', description: 'No mesmo canvas você pode inserir imagens, desenhar com precisão, transformar desenhos em animação, criar wireframes e componentes, organizar o Design System, montar formatos para mídia/impressão, vídeo, texto, som, hardware, personagens/sprites e jogos.' },
    { selector: '[data-tour="atelier-uxwriting"]', title: 'UX Writing', description: 'Centralize todos os textos da interface, crie versões em linguagem simples, traduza para outros idiomas e prepare roteiro/glosa de apoio para produção em Libras, sempre com validação humana.' },
    { selector: '[data-tour="atelier-sound"]', title: 'Sonoridade', description: 'Crie pequenos efeitos de feedback, teste presets, envie áudios próprios e organize os gatilhos sonoros do projeto. O som deve sempre ter alternativa visual ou textual.' },
    { selector: '[data-tour="atelier-hardware"]', title: 'Hardware e sensores', description: 'Teste giroscópio e movimento do dispositivo, conecte microcontroladores compatíveis por Web Serial e mapeie dados físicos para comportamentos da interface.' },
    { selector: '[data-tour="atelier-sprite"]', title: 'Personagens e sprites', description: 'Construa o personagem por partes: cabeça, rosto, olhos, corpo, proporções, roupa e paleta. Gere ficha, turnaround, expressões e poses, crie SVG por prompt e depois anime estados como idle, andar, correr, pular e ação.' },
    { selector: '[data-tour="atelier-game"]', title: 'Game Design', description: 'Estruture GDD, fases, mecânicas, personagens/sprites, fluxo entre cenas, produção e um playtest simples antes de partir para implementação.' },
    { selector: '[data-tour="atelier-api"]', title: 'APIs & Conexões', description: 'Explore integrações gratuitas ou free tier, veja requisitos e variáveis de ambiente, incorpore APIs ao projeto ou peça ao Arquiteto de API para gerar um endpoint TypeScript. As integrações salvas seguem com o projeto para o PUBLICA/Forja.' },
    { selector: '[data-tour="note-formatting"]', title: 'Formatação das notas', description: 'Ao editar uma nota, use estes controles para negrito, itálico, sublinhado, tipografia, tamanho e cor. Os botões possuem área de toque ampliada para acessibilidade.' },
    { selector: '[data-tour="workspace-phases"]', title: 'Fases 5I’s', description: 'Abra a estrutura da Metodologia 5I’s, consulte procedimentos e avance pelas cinco fases sem perder o percurso do projeto.' },
    { selector: '[data-tour="workspace-agents"]', title: 'Agentes 5I’s', description: 'Converse com os agentes especializados. Na Implementação, o DIVULGA ajuda a transformar o projeto em circulação, formatos, canais, experimentos de marketing e caminhos de monetização. O histórico das conversas fica associado ao projeto.' },
    { selector: '[data-tour="workspace-comments"]', title: 'Comentários', description: 'Veja todos os comentários do projeto e navegue diretamente até o card onde cada comentário foi feito.' },
    { selector: '[data-tour="workspace-collaborators"]', title: 'Colaboração', description: 'Convide pessoas por e-mail para visualizar, comentar ou editar. O acesso aparece diretamente no dashboard delas, independentemente de turma.' },
  ],
};

interface Props {
  scope: TutorialScope;
  userId?: string;
  className?: string;
}

export default function TutorialCoach({ scope, userId = 'local', className = '' }: Props) {
  const storageKey = `5is:tutorial:${scope}:v2:${userId}`;
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [, forcePosition] = useState(0);

  const availableSteps = useMemo(() => STEPS[scope].filter((step) => typeof document !== 'undefined' && document.querySelector(step.selector)), [scope, open]);
  const step = availableSteps[index] || availableSteps[0];

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) {
        const timer = window.setTimeout(() => { setIndex(0); setOpen(true); }, 700);
        return () => window.clearTimeout(timer);
      }
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const reposition = () => forcePosition((n) => n + 1);
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, true);
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !step) return;
    const target = document.querySelector(step.selector) as HTMLElement | null;
    target?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
  }, [open, index, step?.selector]);

  const close = () => {
    setOpen(false);
    try { localStorage.setItem(storageKey, 'seen'); } catch {}
  };

  const restart = () => {
    setIndex(0);
    setOpen(true);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{scope?: TutorialScope}>).detail;
      if (detail?.scope && detail.scope !== scope) return;
      restart();
    };
    window.addEventListener('5is:open-tutorial', handler as EventListener);
    return () => window.removeEventListener('5is:open-tutorial', handler as EventListener);
  }, [scope]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const sync = () => { if (body.classList.contains('atelier-open')) setOpen(false); };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(body, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const target = open && step ? document.querySelector(step.selector) as HTMLElement | null : null;
  const rect = target?.getBoundingClientRect();
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 768;
  const width = Math.min(360, Math.max(260, viewportWidth - 32));
  const tooltipLeft = rect
    ? Math.min(viewportWidth - width - 16, Math.max(16, rect.left + rect.width / 2 - width / 2))
    : Math.max(16, (viewportWidth - width) / 2);
  const preferBelow = !rect || rect.bottom + 220 < viewportHeight;
  const tooltipTop = rect
    ? preferBelow ? Math.min(viewportHeight - 220, rect.bottom + 14) : Math.max(16, rect.top - 214)
    : Math.max(24, viewportHeight / 2 - 100);

  return <>
    <style>{`body.atelier-open .tutorial-coach-launcher{display:none!important}`}</style>
    <button
      type="button"
      onClick={restart}
      aria-label="Abrir tutorial da plataforma"
      title="Tutorial"
      className={`tutorial-coach-launcher hidden sm:flex fixed z-[180] right-4 bottom-[max(1rem,env(safe-area-inset-bottom))] w-11 h-11 rounded-full bg-black text-white shadow-xl border-2 border-white flex items-center justify-center cursor-pointer ${className}`}
    >
      <HelpCircle size={21} />
    </button>

    {open && step && <div className="fixed inset-0 z-[200] pointer-events-none" aria-live="polite">
      <div className="absolute inset-0 bg-black/30" />
      {rect && <div
        className="fixed rounded-2xl border-2 border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.12)] transition-all duration-200"
        style={{ left: Math.max(6, rect.left - 6), top: Math.max(6, rect.top - 6), width: Math.min(window.innerWidth - 12, rect.width + 12), height: Math.min(window.innerHeight - 12, rect.height + 12) }}
      />}
      <section
        role="dialog"
        aria-label={`Tutorial: ${step.title}`}
        className="fixed pointer-events-auto rounded-2xl border border-black bg-[#FDFDFB] shadow-2xl p-4"
        style={{ left: tooltipLeft, top: tooltipTop, width }}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-neutral-400">Tutorial 5I’s · {index + 1}/{availableSteps.length}</span>
            <h3 className="font-bold text-base mt-1">{step.title}</h3>
          </div>
          <button type="button" onClick={close} className="w-9 h-9 rounded-xl border border-[#DDD] bg-white flex items-center justify-center cursor-pointer" aria-label="Fechar tutorial"><X size={17}/></button>
        </div>
        <p className="text-sm leading-relaxed text-neutral-600 mt-3">{step.description}</p>
        <div className="flex items-center justify-between gap-2 mt-4">
          <button type="button" disabled={index === 0} onClick={() => setIndex((i) => Math.max(0, i - 1))} className="px-3 py-2 rounded-xl border border-[#DDD] text-xs font-mono font-bold uppercase flex items-center gap-1 disabled:opacity-30 cursor-pointer"><ChevronLeft size={14}/> Voltar</button>
          {index < availableSteps.length - 1 ? <button type="button" onClick={() => setIndex((i) => Math.min(availableSteps.length - 1, i + 1))} className="px-4 py-2 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase flex items-center gap-1 cursor-pointer">Próximo <ChevronRight size={14}/></button> : <button type="button" onClick={close} className="px-4 py-2 rounded-xl bg-black text-white text-xs font-mono font-bold uppercase cursor-pointer">Concluir</button>}
        </div>
      </section>
    </div>}
  </>;
}
