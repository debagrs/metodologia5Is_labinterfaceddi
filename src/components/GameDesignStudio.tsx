import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Clock3, Gamepad2, Link2, Play, Plus, Save, Sparkles, Trash2, Users, X } from 'lucide-react';
import { GameDesignDocument, GameJamAsset, GameJamMember, GameScene, GameSceneType } from '../types';

interface GameAssetOption { id: string; name: string; type: string; url?: string; }
interface Props { document: GameDesignDocument; title?: string; canEdit?: boolean; availableAssets?: GameAssetOption[]; onSave: (document: GameDesignDocument) => void; onClose: () => void; }

const id = (prefix = 'game') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const MECHANICS = ['movimento', 'toque', 'coleta', 'pontuação', 'timer', 'diálogo', 'escolhas', 'inventário', 'física', 'quiz', 'combate', 'exploração', 'cooperação', 'narrativa'];
const SCENE_TYPES: Array<{ id: GameSceneType; label: string }> = [
  { id: 'menu', label: 'Menu' }, { id: 'level', label: 'Fase' }, { id: 'boss', label: 'Desafio' }, { id: 'cutscene', label: 'Narrativa' }, { id: 'result', label: 'Resultado' },
];
const defaultChecklist = () => ['Tema interpretado', 'Core loop jogável', 'Personagens e sprites revisados', 'Tela inicial', 'Áudio revisado', 'Controles explicados', 'Playtest rápido', 'Build final', 'Créditos e licenças'].map((label) => ({ id: id('check'), label, done: false }));

export const blankGameDesign = (): GameDesignDocument => {
  const first = id('scene'); const second = id('scene');
  return {
    title: 'Game Design do projeto', genre: 'Experiência interativa', coreLoop: 'Explorar → agir → receber feedback → avançar', playerGoal: 'Defina o que a pessoa tenta alcançar.',
    scenes: [
      { id: first, name: 'Início', type: 'menu', objective: 'Apresentar a experiência', mechanics: ['toque'], background: '#111111', nextSceneId: second, spriteIds: [] },
      { id: second, name: 'Fase 1', type: 'level', objective: 'Primeiro desafio jogável', mechanics: ['movimento', 'coleta'], background: '#F4F4F2', spriteIds: [] },
    ],
    sprints: [],
    jam: { enabled: false, name: 'Produção do jogo', theme: '', constraints: '', durationHours: 48, team: [], assets: [], checklist: defaultChecklist() },
  };
};

export function GameDesignPreview({ document, className = '' }: { document: GameDesignDocument; className?: string }) {
  const spriteCount = new Set(document.scenes.flatMap((scene) => scene.spriteIds || [])).size;
  return <div className={`bg-[#171717] text-white p-4 overflow-hidden ${className}`}>
    <div className="text-xs font-bold flex gap-2"><Gamepad2 size={15} />{document.title}</div>
    <div className="mt-3 flex gap-1 overflow-hidden">{document.scenes.slice(0, 4).map((scene, index) => <React.Fragment key={scene.id}><div className="shrink-0 rounded-lg border border-white/20 px-2 py-2 text-[9px] max-w-24 truncate">{scene.name}</div>{index < Math.min(3, document.scenes.length - 1) && <ChevronRight size={12} className="opacity-40" />}</React.Fragment>)}</div>
    <div className="mt-3 text-[9px] opacity-60">{document.scenes.length} cenas · {spriteCount} personagens/sprites</div>
  </div>;
}

export default function GameDesignStudio({ document, title = 'Game Design', canEdit = true, availableAssets = [], onSave, onClose }: Props) {
  const initial = JSON.parse(JSON.stringify(document)) as GameDesignDocument;
  initial.sprints ||= [];
  initial.scenes = (initial.scenes || []).map((scene) => ({ ...scene, spriteIds: scene.spriteIds || [] }));
  initial.jam ||= { enabled: false, name: 'Produção do jogo', theme: '', constraints: '', durationHours: 48, team: [], assets: [], checklist: defaultChecklist() };
  initial.jam.team ||= []; initial.jam.assets ||= []; initial.jam.checklist ||= defaultChecklist();
  const [draft, setDraft] = useState(initial);
  const [selectedSceneId, setSelectedSceneId] = useState(initial.scenes[0]?.id || '');
  const [playSceneId, setPlaySceneId] = useState('');
  const [tab, setTab] = useState<'design' | 'production'>(initial.jam?.enabled ? 'production' : 'design');
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);

  const scene = useMemo(() => draft.scenes.find((item) => item.id === selectedSceneId) || draft.scenes[0], [draft.scenes, selectedSceneId]);
  const playScene = draft.scenes.find((item) => item.id === playSceneId) || draft.scenes[0];
  const production = draft.jam!;
  const spriteAssets = availableAssets.filter((asset) => asset.type === 'sprite-character');
  const sceneSprites = spriteAssets.filter((asset) => scene?.spriteIds?.includes(asset.id));

  const patchScene = (patch: Partial<GameScene>) => scene && setDraft((current) => ({ ...current, scenes: current.scenes.map((item) => item.id === scene.id ? { ...item, ...patch } : item) }));
  const addScene = () => { const next: GameScene = { id: id('scene'), name: `Fase ${draft.scenes.length}`, type: 'level', objective: 'Novo objetivo', mechanics: ['toque'], background: '#FFFFFF', spriteIds: [] }; setDraft((current) => ({ ...current, scenes: [...current.scenes, next] })); setSelectedSceneId(next.id); };
  const patchProduction = (patch: any) => setDraft((current) => ({ ...current, jam: { ...current.jam!, ...patch } }));
  const toggleSceneSprite = (assetId: string) => { if (!scene) return; const ids = scene.spriteIds || []; patchScene({ spriteIds: ids.includes(assetId) ? ids.filter((item) => item !== assetId) : [...ids, assetId] }); };
  const toggleAsset = (asset: GameAssetOption) => { const exists = production.assets.find((item) => item.nodeId === asset.id); const assets = exists ? production.assets.filter((item) => item.nodeId !== asset.id) : [...production.assets, { id: id('asset'), nodeId: asset.id, name: asset.name, type: asset.type, url: asset.url, selected: true } as GameJamAsset]; patchProduction({ assets }); };
  const remaining = production.deadline ? Math.max(0, new Date(production.deadline).getTime() - now) : 0;
  const remainingText = production.deadline ? `${Math.floor(remaining / 3600000)}h ${Math.floor((remaining % 3600000) / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s` : 'defina o prazo';
  const startProduction = () => { const start = new Date(); const end = new Date(start.getTime() + (production.durationHours || 48) * 3600000); patchProduction({ enabled: true, startAt: start.toISOString(), deadline: end.toISOString() }); setTab('production'); };

  return <div className="fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={(e) => e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
      <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={19} /></button>
      <div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[10px] font-mono text-neutral-500 uppercase">GDD · fases · sprites · playtest · produção</div></div>
      <button disabled={!canEdit} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15} /> SALVAR</button>
    </header>

    <div className="shrink-0 bg-white border-b p-2 flex gap-2 overflow-x-auto">
      <button onClick={() => setTab('design')} className={`h-10 px-4 rounded-xl border text-[10px] font-bold shrink-0 ${tab === 'design' ? 'bg-black text-white border-black' : ''}`}>GAME DESIGN</button>
      <button onClick={() => setTab('production')} className={`h-10 px-4 rounded-xl border text-[10px] font-bold shrink-0 ${tab === 'production' ? 'bg-black text-white border-black' : ''}`}>⚡ PRODUÇÃO INTENSIVA</button>
    </div>

    {tab === 'design' ? <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-5">
      <section className="max-w-7xl mx-auto grid lg:grid-cols-[300px_minmax(0,1fr)] gap-4">
        <aside className="rounded-2xl bg-white border p-4"><div className="flex justify-between"><b className="flex gap-2"><Gamepad2 size={16} /> Fases / cenas</b><button onClick={addScene} className="h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center"><Plus size={15} /></button></div><div className="mt-3 space-y-2">{draft.scenes.map((item) => <button key={item.id} onClick={() => setSelectedSceneId(item.id)} className={`w-full rounded-xl border p-3 text-left ${scene?.id === item.id ? 'border-black bg-[#F3F2EE]' : ''}`}><div className="text-[9px] font-mono text-neutral-400">{SCENE_TYPES.find((type) => type.id === item.type)?.label}</div><b className="text-xs">{item.name}</b><div className="text-[9px] text-neutral-500 line-clamp-2">{item.objective}</div></button>)}</div></aside>
        <section className="space-y-4">
          {scene && <div className="rounded-2xl border-2 border-black bg-white p-5">
            <div className="flex gap-2"><input value={scene.name} onChange={(e) => patchScene({ name: e.target.value })} className="h-11 flex-1 rounded-xl border px-3 font-bold" /><button disabled={draft.scenes.length <= 1} onClick={() => { const next = draft.scenes.filter((item) => item.id !== scene.id); setDraft({ ...draft, scenes: next }); setSelectedSceneId(next[0]?.id || ''); }} className="h-11 w-11 rounded-xl border border-red-200 text-red-700 flex items-center justify-center disabled:opacity-30"><Trash2 size={15} /></button></div>
            <div className="mt-3 grid sm:grid-cols-2 gap-3"><label className="text-[9px] font-mono">TIPO<select value={scene.type} onChange={(e) => patchScene({ type: e.target.value as GameSceneType })} className="mt-1 h-11 w-full rounded-xl border px-3">{SCENE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label><label className="text-[9px] font-mono">PRÓXIMA CENA<select value={scene.nextSceneId || ''} onChange={(e) => patchScene({ nextSceneId: e.target.value || undefined })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">Fim</option>{draft.scenes.filter((item) => item.id !== scene.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
            <textarea value={scene.objective} onChange={(e) => patchScene({ objective: e.target.value })} className="mt-3 min-h-20 w-full rounded-xl border p-3" placeholder="Objetivo desta fase/cena" />
            <div className="mt-3 flex flex-wrap gap-2">{MECHANICS.map((mechanic) => <button key={mechanic} onClick={() => patchScene({ mechanics: scene.mechanics.includes(mechanic) ? scene.mechanics.filter((item) => item !== mechanic) : [...scene.mechanics, mechanic] })} className={`h-9 px-3 rounded-full border text-[10px] ${scene.mechanics.includes(mechanic) ? 'bg-black text-white' : ''}`}>{mechanic}</button>)}</div>
          </div>}

          <div className="rounded-2xl border bg-white p-5"><b className="text-sm">Personagens e sprites da cena</b><div className="text-[10px] text-neutral-500 mt-1">Crie os personagens no módulo PERSONAGENS da barra do Ateliê e escolha aqui quais participam desta fase.</div><div className="mt-3 grid sm:grid-cols-2 xl:grid-cols-3 gap-2">{spriteAssets.map((asset) => { const active = scene?.spriteIds?.includes(asset.id); return <button key={asset.id} onClick={() => toggleSceneSprite(asset.id)} className={`rounded-xl border overflow-hidden text-left ${active ? 'ring-2 ring-black bg-black text-white' : 'bg-white'}`}><div className="aspect-video bg-neutral-100 flex items-center justify-center overflow-hidden">{asset.url ? <img src={asset.url} alt="" className="w-full h-full object-contain" /> : <Gamepad2 className="text-neutral-300" />}</div><div className="p-2 text-[9px] font-bold truncate">{active ? '✓ ' : ''}{asset.name}</div></button>; })}{!spriteAssets.length && <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-dashed p-4 text-[10px] text-neutral-400">Nenhum personagem criado ainda. Use PERSONAGENS no Ateliê para montar sprites e animações locais.</div>}</div></div>

          <div className="rounded-2xl border bg-white p-5"><label className="text-[9px] font-mono text-neutral-500">GÊNERO / FORMATO<input value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="mt-3 block text-[9px] font-mono text-neutral-500">CORE LOOP<textarea value={draft.coreLoop} onChange={(e) => setDraft({ ...draft, coreLoop: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label><label className="mt-3 block text-[9px] font-mono text-neutral-500">OBJETIVO DA PESSOA JOGADORA<textarea value={draft.playerGoal} onChange={(e) => setDraft({ ...draft, playerGoal: e.target.value })} className="mt-1 min-h-16 w-full rounded-xl border p-3" /></label></div>
        </section>
      </section>

      <section className="max-w-7xl mx-auto rounded-2xl bg-[#111] text-white p-5"><div className="flex justify-between"><div><b className="flex gap-2"><Play size={16} /> Playtest de fluxo</b><div className="text-[10px] text-white/50 mt-1">Valide sequência, personagens e passagem entre cenas antes de implementar.</div></div><button onClick={() => setPlaySceneId(draft.scenes[0]?.id || '')} className="h-10 px-3 bg-white text-black rounded-xl text-[10px]">REINICIAR</button></div>{playScene && <div className="mt-4 rounded-2xl min-h-60 flex flex-col items-center justify-center text-center p-6 relative overflow-hidden" style={{ background: playScene.background, color: '#fff' }}><div className="flex items-end justify-center gap-2 min-h-24 mb-3">{spriteAssets.filter((asset) => playScene.spriteIds?.includes(asset.id)).slice(0, 5).map((asset) => asset.url ? <img key={asset.id} src={asset.url} alt="" className="h-20 w-20 object-contain" /> : null)}</div><b className="text-2xl">{playScene.name}</b><p className="mt-2 text-sm opacity-70">{playScene.objective}</p>{playScene.nextSceneId && <button onClick={() => setPlaySceneId(playScene.nextSceneId!)} className="mt-4 h-10 px-4 rounded-xl bg-black border text-xs">AVANÇAR</button>}</div>}</section>
    </main> : <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6"><section className="max-w-7xl mx-auto space-y-5">
      <div className="rounded-3xl bg-[#111] text-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-mono text-white/50">GAME DESIGN · PRODUÇÃO INTENSIVA</div><input value={production.name} onChange={(e) => patchProduction({ name: e.target.value })} className="mt-1 bg-transparent text-3xl font-bold outline-none max-w-full" /><div className="mt-2 flex items-center gap-2 text-sm"><Clock3 size={16} /><b>{remainingText}</b></div></div>{!production.enabled ? <button onClick={startProduction} className="h-12 px-5 rounded-xl bg-white text-black font-bold text-xs">INICIAR PRODUÇÃO · {production.durationHours}H</button> : <span className="rounded-full border border-white/20 px-3 py-2 text-[10px]">PRODUÇÃO ATIVA</span>}</div><div className="mt-5 grid sm:grid-cols-3 gap-3"><label className="text-[9px] font-mono text-white/50">TEMA<input value={production.theme} onChange={(e) => patchProduction({ theme: e.target.value })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label><label className="text-[9px] font-mono text-white/50">DURAÇÃO (HORAS)<input type="number" value={production.durationHours} onChange={(e) => patchProduction({ durationHours: +e.target.value })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label><label className="text-[9px] font-mono text-white/50">PRAZO<input type="datetime-local" value={production.deadline ? new Date(production.deadline).toISOString().slice(0, 16) : ''} onChange={(e) => patchProduction({ deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label></div><label className="mt-3 block text-[9px] font-mono text-white/50">RESTRIÇÕES / BRIEF<textarea value={production.constraints} onChange={(e) => patchProduction({ constraints: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl bg-white text-black p-3" /></label></div>
      <div className="grid lg:grid-cols-2 gap-4"><div className="rounded-2xl bg-white border p-5"><div className="flex justify-between"><b className="flex gap-2"><Users size={16} /> Equipe e papéis</b><button onClick={() => patchProduction({ team: [...production.team, { id: id('member'), name: 'Pessoa', role: 'Design / código / arte' } as GameJamMember] })} className="h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center"><Plus size={14} /></button></div>{production.team.map((member) => <div key={member.id} className="mt-2 flex gap-2"><input value={member.name} onChange={(e) => patchProduction({ team: production.team.map((item) => item.id === member.id ? { ...item, name: e.target.value } : item) })} className="h-10 min-w-0 flex-1 border rounded-lg px-2" /><input value={member.role} onChange={(e) => patchProduction({ team: production.team.map((item) => item.id === member.id ? { ...item, role: e.target.value } : item) })} className="h-10 min-w-0 flex-1 border rounded-lg px-2" /></div>)}</div><div className="rounded-2xl bg-white border p-5"><b className="flex gap-2"><Sparkles size={16} /> Assets do projeto</b><div className="text-[10px] text-neutral-500 mt-1">Puxe personagens/sprites, desenhos, imagens, som, vídeo, wireframes e interações direto do Ateliê.</div><div className="mt-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">{availableAssets.map((asset) => { const active = production.assets.some((item) => item.nodeId === asset.id); return <button key={asset.id} onClick={() => toggleAsset(asset)} className={`rounded-xl border p-3 text-left ${active ? 'bg-black text-white' : ''}`}><div className="text-[9px] font-mono opacity-60">{asset.type}</div><b className="text-[10px] line-clamp-2">{asset.name}</b></button>; })}</div></div></div>
      <div className="rounded-2xl bg-white border p-5"><b>Checklist de produção</b><div className="mt-3 grid md:grid-cols-2 gap-2">{production.checklist.map((check) => <label key={check.id} className="flex gap-2 items-center rounded-xl border p-3 text-xs"><input type="checkbox" checked={check.done} onChange={(e) => patchProduction({ checklist: production.checklist.map((item) => item.id === check.id ? { ...item, done: e.target.checked } : item) })} /><input value={check.label} onChange={(e) => patchProduction({ checklist: production.checklist.map((item) => item.id === check.id ? { ...item, label: e.target.value } : item) })} className="min-w-0 flex-1" /></label>)}</div></div>
      <div className="rounded-2xl bg-white border p-5"><b className="flex gap-2"><Link2 size={16} /> Build e publicação</b><div className="mt-3 grid md:grid-cols-2 gap-3"><input value={production.buildUrl || ''} onChange={(e) => patchProduction({ buildUrl: e.target.value })} placeholder="URL do build jogável" className="h-11 rounded-xl border px-3" /><input value={production.submissionUrl || ''} onChange={(e) => patchProduction({ submissionUrl: e.target.value })} placeholder="URL da página de publicação/submissão" className="h-11 rounded-xl border px-3" /></div></div>
    </section></main>}
  </div>;
}

