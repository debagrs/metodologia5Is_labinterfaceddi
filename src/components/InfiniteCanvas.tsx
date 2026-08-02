import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { 
  ZoomIn, ZoomOut, Maximize, Plus, Trash2, CheckCircle2, 
  HelpCircle, Compass, Sparkles, BookOpen, User, CornerDownRight, Check, MessageCircle, Paperclip
} from 'lucide-react';
import { ThoughtNode, Project, Phase, UserProfile } from '../types';
import NodeCollaborationPanel from './NodeCollaborationPanel';
import MediatorSticker from './MediatorSticker';

export interface InfiniteCanvasHandle {
  getCenteredCardPosition: (cardWidth?: number, cardHeight?: number) => { x: number; y: number };
}

interface InfiniteCanvasProps {
  project: Project;
  nodes: ThoughtNode[];
  activePhase: Phase;
  onUpdateNodeCoords: (id: string, x: number, y: number) => void;
  onAddCustomThought: (x: number, y: number) => void;
  onUpdateNodeContent: (id: string, text: string, completed?: boolean) => void;
  onDeleteNode: (id: string) => void;
  onUpdateNode: (node: ThoughtNode) => void;
  currentUser: UserProfile;
}

const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(function InfiniteCanvas({
  project,
  nodes,
  activePhase,
  onUpdateNodeCoords,
  onAddCustomThought,
  onUpdateNodeContent,
  onDeleteNode,
  onUpdateNode,
  currentUser
}, ref) {
  const [panOffset, setPanOffset] = useState({ x: 50, y: 50 });
  const [zoom, setZoom] = useState(0.9);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [answerTexts, setAnswerTexts] = useState<Record<string, string>>({});
  const [collaborationNodeId, setCollaborationNodeId] = useState<string | null>(null);

  useImperativeHandle(ref, () => ({
    getCenteredCardPosition: (cardWidth = 360, cardHeight = 460) => {
      const rect = containerRef.current?.getBoundingClientRect();

      if (!rect) {
        return { x: 1000, y: 1000 };
      }

      // Converte o centro visível do viewport para coordenadas reais do canvas.
      // A metade do tamanho estimado do card é descontada para que o card,
      // e não apenas seu canto superior esquerdo, nasça centralizado.
      const centerCanvasX = (rect.width / 2 - panOffset.x) / zoom;
      const centerCanvasY = (rect.height / 2 - panOffset.y) / zoom;

      return {
        x: Math.max(0, centerCanvasX - cardWidth / 2),
        y: Math.max(0, centerCanvasY - cardHeight / 2),
      };
    },
  }), [panOffset.x, panOffset.y, zoom]);

  // Center on project core node on mount
  useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2 - 250; // Half of core card width approximately
      const centerY = rect.height / 2 - 150;
      setPanOffset({ x: centerX, y: centerY });
    }
  }, [project.id]);

  // Handle zooming
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.min(Math.max(prev + factor, 0.5), 1.5));
  };

  const handleResetView = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setPanOffset({ x: rect.width / 2 - 250, y: rect.height / 2 - 150 });
      setZoom(0.9);
    }
  };

  // Handle background panning
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on background grid
    const target = e.target as HTMLElement;
    if (target.closest('.thought-card') || target.closest('.canvas-control')) return;

    const startX = e.clientX - panOffset.x;
    const startY = e.clientY - panOffset.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      setPanOffset({
        x: moveEvent.clientX - startX,
        y: moveEvent.clientY - startY
      });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Handle double click to spawn notes
  const handleDoubleClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.thought-card') || target.closest('.canvas-control')) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left - panOffset.x;
    const clickY = e.clientY - rect.top - panOffset.y;

    const canvasX = clickX / zoom;
    const canvasY = clickY / zoom;

    onAddCustomThought(canvasX, canvasY);
  };

  // Handle dragging nodes
  const handleNodeDragStart = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const node = nodes.find(n => n.id === id);
    if (!node) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = node.x;
    const initialY = node.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = (moveEvent.clientX - startX) / zoom;
      const dy = (moveEvent.clientY - startY) / zoom;
      onUpdateNodeCoords(id, initialX + dx, initialY + dy);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSaveAnswer = (nodeId: string) => {
    const text = answerTexts[nodeId];
    if (!text?.trim()) return;

    onUpdateNodeContent(nodeId, text, true);
    setEditingNodeId(null);
  };

  // Find coordinates of target node for connections
  const findNodeCoords = (id: string) => {
    const node = nodes.find(n => n.id === id);
    if (!node) return null;
    return { x: node.x, y: node.y };
  };

  return (
    <div 
      id="canvas-viewport"
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      className="relative flex-1 h-full overflow-hidden bg-[#FDFDFB] select-none cursor-grab active:cursor-grabbing"
    >
      {/* Absolute floating guide */}
      <div className="absolute top-4 left-4 z-20 bg-white/80 backdrop-blur-md border border-[#E0E0DE] rounded-full px-4 py-1.5 text-xs font-mono text-neutral-600 hidden sm:flex items-center gap-2 pointer-events-none shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-black animate-pulse" />
        <span>Mesa de Projeto: {project.name}</span>
        <span className="text-gray-300">|</span>
        <span>Fase: {activePhase}</span>
      </div>

      {/* Grid Canvas Wrapper with Pan/Zoom transforms */}
      <div 
        className="absolute inset-0 bg-dot-grid canvas-grid"
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          width: '5000px',
          height: '5000px'
        }}
      >
        {/* Connection paths layer */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" style={{ zIndex: 1 }}>
          {nodes.map(node => {
            return node.connections.map(targetId => {
              const targetCoords = findNodeCoords(targetId);
              if (!targetCoords) return null;

              // Calculate start and end positions centered on cards
              // Approximating node widths (Core is wider, custom smaller)
              const startWidth = node.type === 'core' ? 240 : 180;
              const startHeight = node.type === 'core' ? 120 : 100;
              const endWidth = nodes.find(n => n.id === targetId)?.type === 'core' ? 240 : 180;
              const endHeight = nodes.find(n => n.id === targetId)?.type === 'core' ? 120 : 100;

              const x1 = node.x + startWidth;
              const y1 = node.y + startHeight / 2;
              const x2 = targetCoords.x;
              const y2 = targetCoords.y + endHeight / 2;

              // Control points for a beautiful organic Bezier curve
              const dx = Math.abs(x2 - x1) * 0.5;
              const cx1 = x1 + dx;
              const cy1 = y1;
              const cx2 = x2 - dx;
              const cy2 = y2;

              const isActiveLink = node.phase === activePhase;

              return (
                <g key={`${node.id}-${targetId}`}>
                  {/* Outer glow link */}
                  <path
                    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isActiveLink ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.02)"}
                    strokeWidth={isActiveLink ? "5" : "3"}
                    className="transition-all duration-300"
                  />
                  {/* Direct vector link */}
                  <path
                    d={`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`}
                    fill="none"
                    stroke={isActiveLink ? "#1A1A1A" : "#E2E2E2"}
                    strokeWidth="1.5"
                    strokeDasharray={node.type === 'user-thought' ? "3 3" : undefined}
                    className="transition-all duration-300"
                  />
                </g>
              );
            });
          })}
        </svg>

        {/* Nodes Layer */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 2 }}>
          {nodes.map((node) => {
            const isCore = node.type === 'core';
            const isQuestion = node.type === 'question';
            const isUserThought = node.type === 'user-thought';
            const isSelected = selectedNodeId === node.id;
            const isActive = node.phase === activePhase;

            return (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1,
                  borderColor: isSelected 
                    ? '#1A1A1A' 
                    : isActive 
                      ? '#E0E0DE' 
                      : '#F0F0EE',
                  boxShadow: isSelected 
                    ? '0 12px 30px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.05)' 
                    : '0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -1px rgba(0, 0, 0, 0.01)'
                }}
                className={`absolute thought-card pointer-events-auto rounded-2xl border bg-white text-neutral-800 overflow-hidden transition-all duration-200 cursor-default ${
                  isCore 
                    ? 'w-[480px] max-w-[calc(100vw-2rem)]' 
                    : 'w-[360px] max-w-[calc(100vw-2rem)]'
                }`}
                style={{
                  left: node.x,
                  top: node.y,
                  opacity: isActive ? 1 : 0.65
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedNodeId(node.id);
                }}
              >
                
                {/* Drag Handle Bar */}
                <div 
                  onMouseDown={(e) => handleNodeDragStart(e, node.id)}
                  className={`px-4 py-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing border-b ${
                    isCore 
                      ? 'bg-[#1A1A1A] border-black text-white' 
                      : isQuestion 
                        ? 'bg-[#F5F5F3] border-[#E0E0DE] text-neutral-700 font-mono text-[10px]'
                        : 'bg-stone-50 border-[#E0E0DE] text-neutral-700 font-mono text-[10px]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isCore ? (
                      <span className="text-[10px] tracking-widest font-mono text-white/65 uppercase font-bold">Âncora Central do Projeto</span>
                    ) : (
                      <>
                        <span className={`w-2 h-2 rounded-full ${
                          isActive ? 'bg-black animate-pulse' : 'bg-gray-300'
                        }`} />
                        <span className="uppercase tracking-wider font-semibold font-mono">{node.phase}</span>
                      </>
                    )}
                  </div>
                  
                  {/* Right side telemetry */}
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] font-mono opacity-50">
                      X: {Math.round(node.x)} Y: {Math.round(node.y)}
                    </span>
                    <button onClick={(e)=>{e.stopPropagation();setCollaborationNodeId(node.id)}} className="opacity-60 hover:opacity-100 transition-colors cursor-pointer flex items-center gap-1" title="Comentários e arquivos"><MessageCircle size={12}/><span className="text-[9px]">{node.comments?.length||0}</span><Paperclip size={11}/><span className="text-[9px]">{node.attachments?.length||0}</span></button>
                    {!isCore && (<button onClick={(e)=>{e.stopPropagation();onDeleteNode(node.id)}} className="opacity-40 hover:opacity-100 hover:text-red-600 transition-colors cursor-pointer" title="Remover card"><Trash2 size={12}/></button>)}
                  </div>
                </div>

                {/* Card Content body */}
                <div className="p-5 flex flex-col gap-4">
                  
                  {isCore ? (
                    // Core Node content representation
                    <div className="flex flex-col gap-3">
                      <div>
                        <h3 className="text-xl font-bold tracking-tight text-neutral-900">{project.name}</h3>
                        <span className="text-xs text-neutral-500 font-mono block mt-1">{project.projectType}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-3.5 pt-3 border-t border-[#E0E0DE]">
                        <div>
                          <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">Problema a Transformar</span>
                          <p className="text-xs text-neutral-800 mt-1 leading-relaxed font-light">{project.problem}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">Comunidade Afetada</span>
                            <span className="text-xs text-neutral-800 font-medium block mt-0.5">{project.community}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase tracking-wider block">ODS Diretora</span>
                            <span className="text-[11px] text-black font-semibold block mt-0.5 truncate" title={project.ods}>
                              {project.ods.split(' - ')[0]}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                  ) : isQuestion ? (
                    // Question node (spawner by a mediator)
                    <div className="flex flex-col gap-4">
                      
                      {/* Mediator Signature */}
                      <div className="mediator-card-signature flex items-center gap-2.5 bg-[#F5F5F3] p-2.5 rounded-2xl border-2 border-[#1A1A1A] shadow-[3px_4px_0_#1A1A1A]">
                        <MediatorSticker
                          mediatorId={node.mediatorId}
                          size={46}
                          state={node.isCompleted ? 'celebrating' : 'idle'}
                          label={`Sticker do mediador ${node.title}`}
                        />
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-[#1A1A1A] leading-none">Aprovado por: {node.title}</span>
                        </div>
                      </div>

                      {/* Main Question Text */}
                      <div className="flex flex-col gap-1">
                        <span className="text-[9px] font-mono font-bold text-[#70706E] uppercase tracking-widest">Questionamento Dialético</span>
                        <p className="text-sm font-semibold text-neutral-900 leading-snug">{node.content}</p>
                      </div>

                      {/* Provocations */}
                      {node.provocations && node.provocations.length > 0 && (
                        <div className="flex flex-col gap-1.5 p-3 bg-[#F9F9F8] rounded-xl border border-[#E0E0DE]">
                          <span className="text-[9px] font-mono text-neutral-500 uppercase tracking-wider flex items-center gap-1">
                            <Compass size={10} /> Direcionadores de Reflexão:
                          </span>
                          <ul className="space-y-1">
                            {node.provocations.map((p, idx) => (
                              <li key={idx} className="text-xs text-neutral-700 flex items-start gap-1.5">
                                <span className="text-black font-bold mt-0.5">•</span>
                                <span className="font-light">{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Scientific Context */}
                      {node.scientificContext && (
                        <div className="text-[10px] text-neutral-700 bg-[#F5F5F3] border border-[#E0E0DE] p-2.5 rounded-xl flex items-start gap-1.5 font-light">
                          <BookOpen size={12} className="shrink-0 text-neutral-500 mt-0.5" />
                          <span>
                            <strong>Enquadramento:</strong> {node.scientificContext}
                          </span>
                        </div>
                      )}

                      {/* Action response section */}
                      <div className="pt-2 border-t border-[#E0E0DE]">
                        {node.isCompleted ? (
                          <div className="bg-[#F5F5F3] border border-[#E0E0DE] rounded-xl p-3 text-xs text-neutral-900">
                            <div className="flex items-center gap-1.5 font-semibold mb-1">
                              <CheckCircle2 size={14} className="text-neutral-800" />
                              <span>Pensamento Integrado</span>
                            </div>
                            <p className="font-light italic mt-1 leading-relaxed text-neutral-600">
                              "{answerTexts[node.id] || "Interação integrada na mesa de projeto."}"
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {editingNodeId === node.id ? (
                              <>
                                <textarea
                                  placeholder="Digite seu pensamento reflexivo aqui..."
                                  rows={4}
                                  value={answerTexts[node.id] || ''}
                                  onChange={(e) => setAnswerTexts({ ...answerTexts, [node.id]: e.target.value })}
                                  className="w-full bg-[#FDFDFB] border border-[#E0E0DE] focus:border-black focus:ring-1 focus:ring-black rounded-lg p-2 text-xs outline-none"
                                />
                                <div className="flex items-center gap-1.5 justify-end">
                                  <button
                                    onClick={() => setEditingNodeId(null)}
                                    className="px-2.5 py-1 rounded hover:bg-black/5 text-[10px] font-mono uppercase text-gray-500 cursor-pointer"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleSaveAnswer(node.id)}
                                    disabled={!(answerTexts[node.id]?.trim())}
                                    className="px-3 py-1 rounded bg-black text-white hover:bg-neutral-800 disabled:opacity-50 text-[10px] font-mono uppercase tracking-wider cursor-pointer"
                                  >
                                    Registrar
                                  </button>
                                </div>
                              </>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingNodeId(node.id);
                                  if (!answerTexts[node.id]) {
                                    setAnswerTexts({ ...answerTexts, [node.id]: '' });
                                  }
                                }}
                                className="w-full border border-[#E0E0DE] border-dashed hover:border-black text-neutral-500 hover:text-black rounded-xl py-2 text-xs font-mono font-semibold tracking-wide text-center transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Sparkles size={12} />
                                <span>REGISTRAR PENSAMENTO</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                    </div>

                  ) : (
                    // Simple Custom thought or note card (Double click to spawn)
                    <div className="flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <span className="text-[9px] font-mono text-black font-semibold tracking-wider uppercase">Bloco de Notas</span>
                        <span className="text-[10px] text-gray-400 font-mono">#{node.id.substring(0, 4)}</span>
                      </div>
                      <textarea
                        placeholder="Escreva uma reflexão livre, insight de campo, ou ideia..."
                        value={node.content}
                        rows={3}
                        onChange={(e) => onUpdateNodeContent(node.id, e.target.value)}
                        className="w-full text-xs font-light text-neutral-800 placeholder:text-gray-400 border-none outline-none resize-none bg-transparent p-0"
                      />
                    </div>
                  )}

                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Floating Canvas Controls (Zoom / Recenter / Spawn guide) */}
      <div id="canvas-actions-panel" className="absolute bottom-6 left-6 z-20 flex flex-col gap-3 canvas-control">
        
        {/* Double-click hint */}
        <div className="bg-white/85 backdrop-blur-md border border-[#E0E0DE] rounded-full px-4 py-2 text-[10px] font-mono text-neutral-500 flex items-center gap-1.5 shadow-sm max-w-[calc(100vw-3rem)]">
          <HelpCircle size={12} className="text-black shrink-0" />
          <span className="truncate">Dica: Clique duplo para criar nota ou use o botão abaixo</span>
        </div>

        {/* Action button bar */}
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md border border-[#E0E0DE] rounded-xl p-1.5 shadow-lg">
          <button 
            onClick={() => handleZoom(0.1)} 
            className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Aumentar zoom"
          >
            <ZoomIn size={16} />
          </button>
          <button 
            onClick={() => handleZoom(-0.1)} 
            className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Diminuir zoom"
          >
            <ZoomOut size={16} />
          </button>
          <div className="w-px h-5 bg-[#E0E0DE] mx-1" />
          <button 
            onClick={handleResetView} 
            className="w-8 h-8 rounded-lg hover:bg-black/5 flex items-center justify-center text-neutral-700 hover:text-black transition-colors cursor-pointer"
            title="Centralizar âncora do projeto"
          >
            <Maximize size={15} />
          </button>
          <div className="w-px h-5 bg-[#E0E0DE] mx-1" />
          <button 
            onClick={() => {
              if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                onAddCustomThought(rect.width / 2 - panOffset.x, rect.height / 2 - panOffset.y);
              }
            }} 
            className="px-3 h-8 rounded-lg bg-black text-white hover:bg-neutral-800 flex items-center gap-1.5 text-xs font-mono font-medium transition-colors cursor-pointer"
            title="Criar bloco de notas"
          >
            <Plus size={14} />
            <span>NOTAS</span>
          </button>
        </div>

      </div>

      {collaborationNodeId && (()=>{ const active=nodes.find(n=>n.id===collaborationNodeId); return active ? <NodeCollaborationPanel node={active} user={currentUser} onClose={()=>setCollaborationNodeId(null)} onChange={onUpdateNode}/> : null; })()}
    </div>
  );
});

export default InfiniteCanvas;
