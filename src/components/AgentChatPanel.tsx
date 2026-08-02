import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, Loader2, PlusCircle, Trash2, Sparkles } from 'lucide-react';
import { Mediator, Project, ThoughtNode } from '../types';
import MediatorSticker from './MediatorSticker';
import { ensureTursoSession } from '../lib/turso';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
};

interface AgentChatPanelProps {
  project: Project;
  nodes: ThoughtNode[];
  mediator: Mediator;
  onClose: () => void;
  onAddToCanvas: (message: string) => void;
}

export default function AgentChatPanel({ project, nodes, mediator, onClose, onAddToCanvas }: AgentChatPanelProps) {
  const storageKey = useMemo(() => `5is_agent_chat_${project.id}_${mediator.id}`, [project.id, mediator.id]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setMessages(JSON.parse(saved));
      } else {
        setMessages([{
          id: crypto.randomUUID(),
          role: 'assistant',
          text: `${mediator.greeting}\n\nEstou aqui para pensar com você na fase de ${project.activePhase}. Não vou substituir sua autoria: vou fazer perguntas, indicar ações e tensionar decisões.`,
          createdAt: new Date().toISOString()
        }]);
      }
    } catch {
      setMessages([]);
    }
  }, [storageKey, mediator.greeting, project.activePhase]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, storageKey]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      createdAt: new Date().toISOString()
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setError('');
    setIsSending(true);

    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({
          mode: 'chat',
          project: {
            name: project.name,
            projectType: project.projectType,
            problem: project.problem,
            community: project.community,
            ods: project.ods
          },
          mediator: {
            id: mediator.id,
            name: mediator.name,
            role: mediator.role,
            bio: mediator.bio
          },
          phase: project.activePhase,
          message: text,
          conversation: nextMessages.slice(-12).map(({ role, text }) => ({ role, text })),
          existingThoughts: nodes.slice(-18).map((node) => ({
            type: node.type,
            title: node.title,
            content: node.content,
            phase: node.phase
          }))
        })
      });

      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`Resposta inválida da IA (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(data.error || `A conversa falhou (HTTP ${response.status}).`);
      if (!data.reply) throw new Error('A IA não devolveu uma resposta conversacional.');

      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: String(data.reply),
        createdAt: new Date().toISOString()
      }]);
    } catch (cause: any) {
      setError(cause?.message || 'Não foi possível conversar com o agente.');
    } finally {
      setIsSending(false);
    }
  }

  function clearConversation() {
    if (!window.confirm(`Apagar a conversa com ${mediator.name}?`)) return;
    localStorage.removeItem(storageKey);
    setMessages([{
      id: crypto.randomUUID(),
      role: 'assistant',
      text: mediator.greeting,
      createdAt: new Date().toISOString()
    }]);
  }

  return (
    <div className="fixed inset-0 z-[80] bg-black/35 backdrop-blur-[2px] flex justify-end" role="dialog" aria-modal="true" aria-label={`Conversa com ${mediator.name}`}>
      <section className="h-full w-full sm:w-[480px] bg-[#FDFDFB] border-l border-black/10 shadow-2xl flex flex-col">
        <header className="p-4 border-b border-[#E0E0DE] bg-white flex items-center gap-3">
          <MediatorSticker mediatorId={mediator.id} size={54} state={isSending ? 'thinking' : 'selected'} />
          <div className="min-w-0 flex-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">Agente 5I’s em conversa</span>
            <h2 className="font-bold text-lg leading-tight">{mediator.name}</h2>
            <p className="text-[10px] text-neutral-600 truncate">{mediator.role}</p>
          </div>
          <button onClick={clearConversation} className="p-2 rounded-xl hover:bg-red-50 text-neutral-500 hover:text-red-700" title="Apagar conversa"><Trash2 size={17} /></button>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-black/5" title="Fechar"><X size={19} /></button>
        </header>

        <div className="px-4 py-2 border-b border-[#E0E0DE] bg-[#F5F5F3] text-[10px] leading-relaxed text-neutral-600">
          Fase ativa: <strong>{project.activePhase}</strong>. O agente usa a Metodologia 5I’s, os registros do canvas e referências teóricas coerentes com seu eixo.
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 select-text">
          {messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${message.role === 'user' ? 'bg-black text-white rounded-br-md' : 'bg-white border border-[#E0E0DE] text-neutral-900 rounded-bl-md shadow-sm'}`}>
                {message.role === 'assistant' && <Sparkles size={13} className="inline mr-1.5 -mt-0.5" />}
                {message.text}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => onAddToCanvas(message.text)}
                    className="mt-3 w-full border-t border-black/10 pt-2 text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 hover:font-bold"
                  >
                    <PlusCircle size={13} /> Registrar no canvas
                  </button>
                )}
              </div>
            </div>
          ))}
          {isSending && (
            <div className="flex justify-start">
              <div className="bg-white border border-[#E0E0DE] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2 text-xs text-neutral-600">
                <Loader2 size={15} className="animate-spin" /> {mediator.name} está pensando com a metodologia…
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-[#E0E0DE] bg-white">
          {error && <p className="mb-2 text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>}
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              rows={3}
              placeholder={`Converse com ${mediator.name} sobre seu projeto…`}
              className="flex-1 resize-none rounded-2xl border-2 border-black px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-black/10"
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              className="h-12 w-12 shrink-0 rounded-full bg-black text-white flex items-center justify-center disabled:opacity-40"
              title="Enviar"
            >
              {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </div>
          <p className="mt-2 text-[9px] font-mono uppercase tracking-wider text-neutral-400">Enter envia · Shift + Enter pula linha</p>
        </form>
      </section>
    </div>
  );
}
