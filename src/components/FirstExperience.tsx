import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Sparkles, Globe, HeartHandshake, Box, Milestone, Compass } from 'lucide-react';
import { Project } from '../types';
import BrandMark from './BrandMark';

interface FirstExperienceProps {
  onStart: (project: Omit<Project, 'id' | 'createdAt' | 'activePhase'>) => void;
}

const ODS_LIST = [
  { id: 'ods-2', label: 'ODS 2 - Fome Zero e Agricultura Sustentável', color: 'border-amber-500 text-amber-800 bg-amber-50/50' },
  { id: 'ods-3', label: 'ODS 3 - Saúde e Bem-Estar', color: 'border-emerald-500 text-emerald-800 bg-emerald-50/50' },
  { id: 'ods-4', label: 'ODS 4 - Educação de Qualidade', color: 'border-blue-500 text-blue-800 bg-blue-50/50' },
  { id: 'ods-5', label: 'ODS 5 - Igualdade de Gênero', color: 'border-orange-500 text-orange-800 bg-orange-50/50' },
  { id: 'ods-10', label: 'ODS 10 - Redução das Desigualdades', color: 'border-rose-500 text-rose-800 bg-rose-50/50' },
  { id: 'ods-11', label: 'ODS 11 - Cidades e Comunidades Sustentáveis', color: 'border-yellow-600 text-yellow-900 bg-yellow-50/50' },
  { id: 'ods-12', label: 'ODS 12 - Consumo e Produção Responsáveis', color: 'border-teal-500 text-teal-800 bg-teal-50/50' },
  { id: 'ods-13', label: 'ODS 13 - Ação Contra a Mudança Global do Clima', color: 'border-green-600 text-green-900 bg-green-50/50' },
];

const PROJECT_TYPES = [
  'Aplicativo Móvel Comunitário',
  'Plataforma de Economia Circular',
  'Interface de Governança Pública',
  'Iniciativa de Design Regenerativo',
  'Sistema Web de Monitoramento de Impacto',
  'Dispositivo / Interface Assistiva',
  'Outro (Especificar)'
];

export default function FirstExperience({ onStart }: FirstExperienceProps) {
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');
  const [community, setCommunity] = useState('');
  const [ods, setOds] = useState('');
  const [projectType, setProjectType] = useState('');
  const [customProjectType, setCustomProjectType] = useState('');

  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !problem.trim() || !community.trim() || !ods || !projectType) {
      setError('Por favor, preencha todos os campos do questionário projetual.');
      return;
    }
    setError('');
    
    onStart({
      name: name.trim(),
      problem: problem.trim(),
      community: community.trim(),
      ods: ods,
      projectType: projectType === 'Outro (Especificar)' ? customProjectType : projectType,
    });
  };

  return (
    <div id="first-experience-container" className="min-h-screen bg-brand-beige flex flex-col md:flex-row font-sans overflow-hidden">
      
      {/* Left side: Premium Methodology Laboratory Context */}
      <div id="left-sidebar" className="md:w-[42%] bg-brand-charcoal text-white p-8 md:p-16 flex flex-col justify-between border-b md:border-b-0 md:border-r border-white/10 relative overflow-hidden">
        
        {/* Abstract organism glow in left side background */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-brand-accent/15 blur-3xl animate-pulse pointer-events-none" />
        <div className="absolute -bottom-32 -right-12 w-[400px] h-[400px] rounded-full bg-brand-green/10 blur-3xl animate-pulse pointer-events-none" />

        {/* Top Header */}
        <div id="header-brand" className="z-10">
          <div className="flex items-center gap-3">
            <BrandMark compact priority className="w-[46px] h-[40px]" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-wide font-mono uppercase text-gray-100">Metodologia 5I’s</span>
              <span className="text-[10px] text-gray-400 font-mono">LABORATÓRIO DE INTELIGÊNCIA PROJETUAL</span>
            </div>
          </div>
        </div>

        {/* Central Concept: Living Organism of the 5Is */}
        <div id="methodology-concept" className="my-12 md:my-0 z-10 flex flex-col gap-8 max-w-md">
          <div>
            <span className="text-xs font-mono text-brand-accent uppercase tracking-widest block mb-2">Metodologia Científica</span>
            <h1 className="text-3xl md:text-4xl font-light tracking-tight text-white leading-tight">
              Pensar interfaces como <span className="font-medium italic text-brand-accent-light text-neutral-100">ecossistemas vivos</span>.
            </h1>
          </div>

          <p className="text-sm text-neutral-400 leading-relaxed font-light">
            A Inteligência Projetual não gera telas aleatórias. Ela conecta cinco eixos simbióticos para fundamentar soluções que transformam realidades vulneráveis.
          </p>

          {/* Connected Steps SVG representing Living Organism */}
          <div id="organism-map" className="py-6 border-y border-white/10 relative">
            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block mb-4">Mapeamento Simbiótico das Fases</span>
            <div className="relative h-28 flex items-center justify-between px-2">
              
              {/* Connecting line SVG / Gradient matching Artistic Flair */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <path 
                  d="M 20 56 Q 80 15, 140 56 T 260 56 T 380 56" 
                  fill="none" 
                  stroke="rgba(255, 255, 255, 0.15)" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4"
                />
                <path 
                  d="M 20 56 Q 80 15, 140 56 T 260 56 T 380 56" 
                  fill="none" 
                  stroke="url(#accent-gradient)" 
                  strokeWidth="2.5" 
                />
                <defs>
                  <linearGradient id="accent-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#80807E" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#F0F0EE" stopOpacity="0.1" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Step 1 */}
              <div className="flex flex-col items-center gap-2 z-10">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-mono text-black font-bold border-4 border-[#E0E0DE] shadow-lg">
                  I1
                </div>
                <span className="text-[10px] font-mono text-gray-400">Ideação</span>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center gap-2 z-10 opacity-50">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-gray-400">
                  I2
                </div>
                <span className="text-[10px] font-mono text-gray-400">Inambulação</span>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center gap-2 z-10 opacity-50">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-gray-400">
                  I3
                </div>
                <span className="text-[10px] font-mono text-gray-400">Instauração</span>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col items-center gap-2 z-10 opacity-50">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-gray-400">
                  I4
                </div>
                <span className="text-[10px] font-mono text-gray-400">Inspeção</span>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col items-center gap-2 z-10 opacity-50">
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-mono text-gray-400">
                  I5
                </div>
                <span className="text-[10px] font-mono text-gray-400">Implementação</span>
              </div>

            </div>
          </div>
        </div>

        {/* Footer Brand Credit */}
        <div id="footer-credits" className="z-10 pt-4 border-t border-white/5">
          <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
            AESTHETIC SPECIFICATION: ALABASTER CANVAS 1.0
          </p>
          <p className="text-[11px] text-gray-400 mt-1 font-light">
            Inspirado por sistemas integrados, design vernacular e ciência de interfaces.
          </p>
        </div>

      </div>

      {/* Right side: Elegant Display Questionnaire Form */}
      <div id="onboarding-form-section" className="md:w-[58%] px-6 py-12 md:p-20 flex flex-col justify-center overflow-y-auto">
        
        <div className="max-w-xl mx-auto w-full">
          
          {/* Main Question Accentuated */}
          <div className="mb-12 text-center">
            <span className="text-[10px] font-bold font-mono tracking-widest text-[#70706E] uppercase block mb-4">
              LABORATÓRIO DE INTELIGÊNCIA PROJETUAL
            </span>
            <h2 className="text-4xl font-light italic tracking-tight text-[#1A1A1A] mb-4">
              O que você deseja transformar?
            </h2>
            <div className="h-0.5 w-12 bg-black mx-auto"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Project Name Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-name" className="text-xs font-mono font-bold text-brand-charcoal/40 uppercase tracking-wider flex items-center gap-2">
                <Box size={14} className="text-black" /> Nome do Projeto
              </label>
              <input 
                id="project-name"
                type="text"
                placeholder="Ex: EcoFila / MaréViva / Banco do Futuro"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm text-brand-charcoal placeholder:text-gray-400 font-sans outline-none transition-all duration-200"
                required
              />
            </div>

            {/* Problem Statement Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-problem" className="text-xs font-mono font-bold text-brand-charcoal/40 uppercase tracking-wider flex items-center gap-2">
                <Compass size={14} className="text-black" /> Qual é o problema real que sua comunidade enfrenta?
              </label>
              <textarea 
                id="project-problem"
                rows={3}
                placeholder="Ex: O desperdício sistemático de alimentos orgânicos em feiras livres devido a gargalos na distribuição de fim de feira..."
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                className="w-full bg-white border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm text-brand-charcoal placeholder:text-gray-400 font-sans outline-none transition-all duration-200 resize-none"
                required
              />
            </div>

            {/* Community Affected Field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="project-community" className="text-xs font-mono font-bold text-brand-charcoal/40 uppercase tracking-wider flex items-center gap-2">
                <HeartHandshake size={14} className="text-black" /> Comunidade envolvida ou vulnerabilidade atendida
              </label>
              <input 
                id="project-community"
                type="text"
                placeholder="Ex: Feirantes autônomos e famílias de baixa renda residentes no entorno"
                value={community}
                onChange={(e) => setCommunity(e.target.value)}
                className="w-full bg-white border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm text-brand-charcoal placeholder:text-gray-400 font-sans outline-none transition-all duration-200"
                required
              />
            </div>

            {/* ODS Select field (Prefilled visual badges + select behavior) */}
            <div className="flex flex-col gap-2.5">
              <label className="text-xs font-mono font-bold text-brand-charcoal/40 uppercase tracking-wider flex items-center gap-2">
                <Globe size={14} className="text-black" /> Qual ODS da ONU rege este projeto?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 border border-[#E0E0DE] rounded-xl p-2 bg-[#F9F9F8]">
                {ODS_LIST.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOds(item.label)}
                    className={`text-left p-2.5 rounded-lg text-xs font-medium border transition-all duration-150 flex items-center justify-between ${
                      ods === item.label 
                        ? 'border-black bg-black text-white shadow-sm' 
                        : 'border-[#E0E0DE] bg-white text-gray-700 hover:border-[#1A1A1A]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {ods === item.label && (
                      <span className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </button>
                ))}
              </div>
              <input 
                type="hidden" 
                value={ods} 
                required 
              />
            </div>

            {/* Project Type Field (Drop-down + specified text field) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="project-type" className="text-xs font-mono font-bold text-brand-charcoal/40 uppercase tracking-wider flex items-center gap-2">
                  <Milestone size={14} className="text-black" /> Tipo do Projeto
                </label>
                <select
                  id="project-type"
                  value={projectType}
                  onChange={(e) => {
                    setProjectType(e.target.value);
                    if (e.target.value !== 'Outro (Especificar)') {
                      setCustomProjectType('');
                    }
                  }}
                  className="w-full bg-white border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm text-brand-charcoal font-sans outline-none transition-all duration-200"
                  required
                >
                  <option value="" disabled>Selecione uma tipologia...</option>
                  {PROJECT_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {projectType === 'Outro (Especificar)' && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="custom-project-type" className="text-xs font-mono font-bold text-brand-charcoal/40 uppercase tracking-wider flex items-center gap-2">
                    Especificar Tipologia
                  </label>
                  <input 
                    id="custom-project-type"
                    type="text"
                    placeholder="Ex: Plataforma de Leilão Reverso Inverso"
                    value={customProjectType}
                    onChange={(e) => setCustomProjectType(e.target.value)}
                    className="w-full bg-white border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-xl p-3 text-sm text-brand-charcoal placeholder:text-gray-400 font-sans outline-none transition-all duration-200"
                    required
                  />
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs font-mono text-red-600 bg-red-50 p-3 rounded border border-red-200">
                {error}
              </p>
            )}

            {/* Start Button */}
            <div className="pt-4 flex flex-col items-center">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                className="px-10 py-4 bg-black text-white text-xs uppercase tracking-[0.2em] font-bold rounded-full shadow-2xl transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <span>Iniciar Ideação</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </motion.button>
              <span className="text-[10px] text-gray-400 font-mono text-center block mt-4 tracking-wider uppercase">
                A mesa de projeto será instaurada logo em seguida
              </span>
            </div>

          </form>

        </div>

      </div>

    </div>
  );
}
