import React, { useMemo, useState } from 'react';
import { Check, Code2, Copy, Loader2, Play, Save, Sparkles, X } from 'lucide-react';
import { InteractiveDocument, Project, ThoughtNode } from '../types';
import { ensureTursoSession } from '../lib/turso';

interface InteractiveStudioProps {
  document: InteractiveDocument;
  project: Project;
  nodes: ThoughtNode[];
  title?: string;
  canEdit?: boolean;
  onSave: (document: InteractiveDocument) => void;
  onClose: () => void;
}

const escapeScript = (code: string) => String(code || '').replace(/<\/script/gi, '<\\/script');

export const blankInteractiveDocument = (engine: 'p5' | 'three' = 'p5'): InteractiveDocument => ({
  engine,
  title: engine === 'p5' ? 'Experimento p5.js' : 'Experimento Three.js',
  prompt: '',
  code: '',
});

export const interactiveToSrcDoc = (document: InteractiveDocument) => {
  const code = escapeScript(document.code);
  const baseStyle = `html,body{width:100%;height:100%;margin:0;overflow:hidden;background:#f8f7f3}canvas{display:block;touch-action:none}`;

  if (document.engine === 'three') {
    return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${baseStyle}</style></head><body><script type="module">import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';\n${code}</script></body></html>`;
  }

  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${baseStyle}</style><script src="https://cdn.jsdelivr.net/npm/p5@1.11.11/lib/p5.min.js"></script></head><body><script>${code}</script></body></html>`;
};

export function InteractivePreview({
  document,
  className = '',
  interactive = true,
}: {
  document: InteractiveDocument;
  className?: string;
  interactive?: boolean;
}) {
  const hasCode = Boolean(document.code?.trim());
  const srcDoc = useMemo(() => interactiveToSrcDoc(document), [document]);

  if (!hasCode) {
    return (
      <div className={`bg-[#F8F7F3] flex items-center justify-center p-6 ${className}`}>
        <div className="max-w-sm text-center">
          <Sparkles size={24} className="mx-auto mb-3 text-neutral-400" />
          <div className="text-sm font-bold text-neutral-700">Sua interação começa pelo que você imaginar.</div>
          <div className="mt-2 text-xs leading-relaxed text-neutral-500">Descreva ao lado o comportamento, a aparência e como mouse ou toque devem participar. Depois toque em GERAR POR PROMPT.</div>
        </div>
      </div>
    );
  }

  return (
    <iframe
      title={document.title || 'Experimento interativo'}
      srcDoc={srcDoc}
      sandbox="allow-scripts"
      className={`border-0 bg-[#F8F7F3] ${className}`}
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    />
  );
}

export default function InteractiveStudio({
  document,
  project,
  nodes,
  title = 'Laboratório interativo',
  canEdit = true,
  onSave,
  onClose,
}: InteractiveStudioProps) {
  const [draft, setDraft] = useState<InteractiveDocument>({ ...document });
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);

  const setEngine = (engine: 'p5' | 'three') => {
    if (engine === draft.engine) return;
    const next = blankInteractiveDocument(engine);
    setDraft({ ...next, prompt: draft.prompt, title: draft.title || next.title });
    setPreviewKey((value) => value + 1);
  };

  const generateFromPrompt = async () => {
    if (!draft.prompt.trim() || !canEdit) return;
    setIsGenerating(true);
    setError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        },
        body: JSON.stringify({
          mode: 'interactive-code',
          engine: draft.engine,
          prompt: draft.prompt,
          project: {
            name: project.name,
            projectType: project.projectType,
            problem: project.problem,
            community: project.community,
            ods: project.ods,
          },
          phase: project.activePhase,
          mediator: {
            id: 'agent-forja',
            name: 'Forja',
            role: 'Implementação, prototipação computacional e sistemas funcionais',
            bio: 'Transforma decisões projetuais em protótipos e sistemas executáveis.',
          },
          existingThoughts: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            content: node.content,
            phase: node.phase,
            scientificContext: node.scientificContext || '',
            provocations: node.provocations || [],
          })),
        }),
      });
      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`Resposta inválida da IA (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(data.error || `Não foi possível gerar a interação (HTTP ${response.status}).`);
      if (!data.interactive?.code) throw new Error('A IA não devolveu código executável.');
      setDraft((current) => ({
        ...current,
        title: data.interactive.title || current.title,
        code: data.interactive.code,
      }));
      setPreviewKey((value) => value + 1);
    } catch (err: any) {
      setError(err?.message || 'Não foi possível gerar a interação.');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(draft.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Não foi possível copiar o código neste navegador.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-[#F4F3EF] flex flex-col select-text"
      style={{ touchAction: 'auto' }}
      onPointerDown={(event) => event.stopPropagation()}
      onPointerMove={(event) => event.stopPropagation()}
      onPointerUp={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <header className="shrink-0 border-b border-[#D8D7D2] bg-white px-3 sm:px-5 py-3 flex items-center gap-3">
        <button type="button" onClick={onClose} className="h-10 w-10 rounded-xl hover:bg-black/5 flex items-center justify-center cursor-pointer" aria-label="Fechar laboratório"><X size={20} /></button>
        <div className="min-w-0 flex-1">
          <div className="text-sm sm:text-base font-bold text-[#1A1A1A] truncate">{title}</div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">camada interativa · p5.js / three.js</div>
        </div>
        <button
          type="button"
          disabled={!canEdit}
          onClick={() => onSave(draft)}
          className="h-10 px-3 sm:px-4 rounded-xl bg-black text-white disabled:opacity-40 flex items-center gap-2 text-xs font-bold cursor-pointer"
        >
          <Save size={15} /><span className="hidden sm:inline">SALVAR NO CANVAS</span>
        </button>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[390px_minmax(0,1fr)]">
        <section className="min-h-0 lg:border-r border-[#D8D7D2] bg-white overflow-y-auto p-4 sm:p-5 space-y-4">
          <div>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">motor</span>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <button type="button" onClick={() => setEngine('p5')} className={`h-11 rounded-xl border text-xs font-bold cursor-pointer ${draft.engine === 'p5' ? 'bg-black text-white border-black' : 'bg-white border-[#D8D7D2]'}`}>p5.js · 2D</button>
              <button type="button" onClick={() => setEngine('three')} className={`h-11 rounded-xl border text-xs font-bold cursor-pointer ${draft.engine === 'three' ? 'bg-black text-white border-black' : 'bg-white border-[#D8D7D2]'}`}>Three.js · 3D</button>
            </div>
          </div>

          <label className="block">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">nome da camada</span>
            <input
              value={draft.title}
              onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              disabled={!canEdit}
              className="mt-2 w-full h-11 rounded-xl border border-[#D8D7D2] px-3 text-sm outline-none focus:border-black disabled:bg-neutral-100 select-text" style={{ touchAction: 'manipulation' }}
            />
          </label>

          <label className="block">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.18em] text-neutral-500">descreva a interação</span>
            <textarea
              value={draft.prompt}
              onChange={(event) => setDraft((current) => ({ ...current, prompt: event.target.value }))}
              disabled={!canEdit}
              placeholder="Ex.: partículas que se aproximam do toque e formam constelações; no mobile responder ao arraste do dedo..."
              className="mt-2 w-full min-h-[150px] rounded-xl border border-[#D8D7D2] p-3 text-sm leading-relaxed outline-none focus:border-black resize-y disabled:bg-neutral-100 select-text" style={{ touchAction: 'manipulation' }}
            />
          </label>

          <button
            type="button"
            onClick={generateFromPrompt}
            disabled={!canEdit || isGenerating || !draft.prompt.trim()}
            className="w-full min-h-12 rounded-xl bg-black text-white disabled:bg-neutral-300 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isGenerating ? 'GERANDO INTERAÇÃO…' : 'GERAR / RECRIAR POR PROMPT'}
          </button>

          {error && <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

          <div className="border border-[#D8D7D2] rounded-xl overflow-hidden">
            <div className="h-10 px-3 bg-[#F7F7F4] border-b border-[#D8D7D2] flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase flex items-center gap-1.5"><Code2 size={13} /> código</span>
              <button type="button" onClick={copyCode} className="h-8 px-2 rounded-lg hover:bg-black/5 flex items-center gap-1 text-[10px] font-mono cursor-pointer">{copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'COPIADO' : 'COPIAR'}</button>
            </div>
            <textarea
              value={draft.code}
              onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
              disabled={!canEdit}
              spellCheck={false}
              className="w-full min-h-[300px] p-3 font-mono text-[11px] leading-relaxed outline-none resize-y bg-[#101010] text-[#F5F5F5] disabled:opacity-70 select-text" style={{ touchAction: 'manipulation' }}
            />
          </div>
        </section>

        <section className="min-h-[48vh] lg:min-h-0 flex flex-col bg-[#ECEBE7]">
          <div className="h-11 px-4 border-b border-[#D8D7D2] bg-white/90 flex items-center justify-between shrink-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-2"><Play size={13} /> prévia em tempo real</span>
            <button type="button" onClick={() => setPreviewKey((value) => value + 1)} className="h-8 px-3 rounded-lg border border-[#D8D7D2] bg-white hover:border-black text-[10px] font-mono font-bold cursor-pointer">REINICIAR</button>
          </div>
          <div className="flex-1 min-h-0 p-3 sm:p-5">
            <div className="h-full min-h-[360px] rounded-2xl overflow-hidden border border-[#D0CFCB] bg-white shadow-sm">
              <InteractivePreview key={previewKey} document={draft} className="w-full h-full" interactive />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
