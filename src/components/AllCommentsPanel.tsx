import React from 'react';
import { MessageCircle, X, UserRound, ArrowRight, Inbox } from 'lucide-react';
import { ThoughtNode } from '../types';

interface Props {
  nodes: ThoughtNode[];
  onClose: () => void;
  onOpenNode: (nodeId: string) => void;
}

export default function AllCommentsPanel({ nodes, onClose, onOpenNode }: Props) {
  const items = nodes.flatMap((node) =>
    (node.comments || []).map((comment) => ({ node, comment }))
  ).sort((a, b) => new Date(b.comment.createdAt).getTime() - new Date(a.comment.createdAt).getTime());

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/35" onClick={onClose}>
      <section className="h-full w-full max-w-[480px] bg-[#FDFDFB] shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="h-16 px-4 sm:px-5 border-b border-[#E0E0DE] flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-black text-white flex items-center justify-center"><MessageCircle size={17}/></div>
            <div><h2 className="text-sm font-bold">Todos os comentários</h2><p className="text-[10px] font-mono text-neutral-500">{items.length} comentário(s) no canvas</p></div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5" aria-label="Fechar comentários"><X size={18}/></button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-neutral-400 px-8"><Inbox size={32}/><p className="mt-3 text-sm font-semibold text-neutral-600">Ainda não há comentários</p><p className="text-xs mt-1">Abra um card para iniciar uma orientação.</p></div>
          ) : items.map(({ node, comment }) => (
            <button key={comment.id} onClick={() => onOpenNode(node.id)} className="w-full text-left bg-white border border-[#E0E0DE] rounded-2xl p-4 hover:border-black hover:shadow-sm transition-all">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[9px] uppercase tracking-wider font-mono text-neutral-400 block truncate">Card: {node.title || node.phase}</span>
                  <div className="flex items-center gap-1.5 mt-1"><UserRound size={12}/><strong className="text-xs truncate">{comment.authorName}</strong><span className="text-[9px] font-mono text-neutral-400">{new Date(comment.createdAt).toLocaleString('pt-BR')}</span></div>
                </div>
                <ArrowRight size={15} className="shrink-0 mt-1"/>
              </div>
              <p className="text-xs leading-relaxed text-neutral-700 mt-3 whitespace-pre-wrap">{comment.text}</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
