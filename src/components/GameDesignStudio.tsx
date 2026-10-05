import { StudioWorkspace } from './StudioWorkspace';
import StudioAreaGuide from './StudioAreaGuide';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, Clock3, FileText, Gamepad2, Info, Link2, Pause, Play, Plus,
  RotateCcw, Save, Sparkles, Trash2, Users, X
} from 'lucide-react';
import {
  GameActionVerb, GameCharacterAction, GameDesignDocument, GameJamAsset, GameJamMember,
  GameScene, GameSceneType
} from '../types';

interface GameAssetOption { id: string; name: string; type: string; url?: string; }
interface Props { document: GameDesignDocument; title?: string; canEdit?: boolean; availableAssets?: GameAssetOption[]; onSave: (document: GameDesignDocument) => void; onClose: () => void; }

const id = (prefix = 'game') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const MECHANICS = ['movimento', 'toque', 'coleta', 'pontuação', 'timer', 'diálogo', 'escolhas', 'inventário', 'física', 'quiz', 'combate', 'exploração', 'cooperação', 'narrativa'];
const ACTIONS: Array<{ id: GameActionVerb; label: string }> = [
  { id: 'entrar', label: 'Entrar' }, { id: 'andar', label: 'Mover' }, { id: 'falar', label: 'Falar' },
  { id: 'coletar', label: 'Coletar' }, { id: 'pular', label: 'Pular' }, { id: 'esperar', label: 'Esperar' }, { id: 'sair', label: 'Sair' },
];
const SCENE_TYPES: Array<{ id: GameSceneType; label: string }> = [
  { id: 'menu', label: 'Menu' }, { id: 'level', label: 'Fase' }, { id: 'boss', label: 'Desafio' }, { id: 'cutscene', label: 'Narrativa' }, { id: 'result', label: 'Resultado' },
];
const defaultChecklist = () => ['Tema interpretado', 'Core loop jogável', 'Personagens e sprites revisados', 'Tela inicial', 'Áudio revisado', 'Controles explicados', 'Playtest rápido', 'Build final', 'Créditos e licenças'].map((label) => ({ id: id('check'), label, done: false }));

export const blankGameDesign = (): GameDesignDocument => {
  const first = id('scene'); const second = id('scene');
  return {
    title: 'Game Design do projeto', genre: 'Experiência interativa', coreLoop: 'Explorar → agir → receber feedback → avançar', playerGoal: 'Defina o que a pessoa tenta alcançar.',
    gddScript: 'Escreva aqui o roteiro macro do jogo: premissa, progressão, viradas, regras do mundo e como as fases se conectam.',
    previewEngine: 'local',
    scenes: [
      { id: first, name: 'Início', type: 'menu', objective: 'Apresentar a experiência', mechanics: ['toque'], background: '#111111', nextSceneId: second, spriteIds: [], script: 'Apresente o mundo e convide a pessoa jogadora a começar.', actions: [] },
      { id: second, name: 'Fase 1', type: 'level', objective: 'Primeiro desafio jogável', mechanics: ['movimento', 'coleta'], background: '#E7E4DC', spriteIds: [], script: 'Descreva o que acontece nesta fase e quais personagens entram em ação.', actions: [] },
    ],
    sprints: [],
    jam: { enabled: false, name: 'Produção do jogo', theme: '', constraints: '', durationHours: 48, team: [], assets: [], checklist: defaultChecklist() },
  };
};

export function GameDesignPreview({ document, className = '' }: { document: GameDesignDocument; className?: string }) {
  const spriteCount = new Set(document.scenes.flatMap((scene) => scene.spriteIds || [])).size;
  const actionCount = document.scenes.reduce((sum, scene) => sum + (scene.actions?.length || 0), 0);
  return <div className={`bg-[#171717] text-white p-4 overflow-hidden ${className}`}>
    <div className="text-xs font-bold flex gap-2"><Gamepad2 size={15} />{document.title}</div>
    <div className="mt-3 flex gap-1 overflow-hidden">{document.scenes.slice(0, 4).map((scene, index) => <React.Fragment key={scene.id}><div className="shrink-0 rounded-lg border border-white/20 px-2 py-2 text-[9px] max-w-24 truncate">{scene.name}</div>{index < Math.min(3, document.scenes.length - 1) && <ChevronRight size={12} className="opacity-40" />}</React.Fragment>)}</div>
    <div className="mt-3 text-[9px] opacity-60">{document.scenes.length} cenas · {spriteCount} personagens · {actionCount} ações</div>
  </div>;
}

export default function GameDesignStudio({ document, title = 'Game Design', canEdit = true, availableAssets = [], onSave, onClose }: Props) {
  const initial = JSON.parse(JSON.stringify(document)) as GameDesignDocument;
  initial.sprints ||= [];
  initial.gddScript ||= '';
  initial.previewEngine ||= 'local';
  initial.scenes = (initial.scenes || []).map((scene) => ({ ...scene, spriteIds: scene.spriteIds || [], script: scene.script || '', actions: scene.actions || [] }));
  initial.jam ||= { enabled: false, name: 'Produção do jogo', theme: '', constraints: '', durationHours: 48, team: [], assets: [], checklist: defaultChecklist() };
  initial.jam.team ||= []; initial.jam.assets ||= []; initial.jam.checklist ||= defaultChecklist();

  const [draft, setDraft] = useState(initial);
  const [selectedSceneId, setSelectedSceneId] = useState(initial.scenes[0]?.id || '');
  const [playSceneId, setPlaySceneId] = useState(initial.scenes[0]?.id || '');
  const [playActionIndex, setPlayActionIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<'script' | 'design' | 'production'>('script');
  const [now, setNow] = useState(Date.now());

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!playing) return;
    const active = draft.scenes.find((item) => item.id === playSceneId) || draft.scenes[0];
    const actions = active?.actions || [];
    if (!actions.length) { setPlaying(false); return; }
    const timer = window.setInterval(() => setPlayActionIndex((index) => {
      if (index >= actions.length - 1) { setPlaying(false); return actions.length - 1; }
      return index + 1;
    }), 850);
    return () => window.clearInterval(timer);
  }, [playing, playSceneId, draft.scenes]);

  const scene = useMemo(() => draft.scenes.find((item) => item.id === selectedSceneId) || draft.scenes[0], [draft.scenes, selectedSceneId]);
  const playScene = draft.scenes.find((item) => item.id === playSceneId) || draft.scenes[0];
  const production = draft.jam!;
  const spriteAssets = availableAssets.filter((asset) => asset.type === 'sprite-character');
  const sceneSprites = spriteAssets.filter((asset) => scene?.spriteIds?.includes(asset.id));
  const currentAction = playScene?.actions?.[playActionIndex];

  const patchScene = (patch: Partial<GameScene>) => scene && setDraft((current) => ({ ...current, scenes: current.scenes.map((item) => item.id === scene.id ? { ...item, ...patch } : item) }));
  const addScene = () => { const next: GameScene = { id: id('scene'), name: `Fase ${draft.scenes.length}`, type: 'level', objective: 'Novo objetivo', mechanics: ['toque'], background: '#FFFFFF', spriteIds: [], script: '', actions: [] }; setDraft((current) => ({ ...current, scenes: [...current.scenes, next] })); setSelectedSceneId(next.id); setPlaySceneId(next.id); setPlayActionIndex(-1); };
  const patchProduction = (patch: any) => setDraft((current) => ({ ...current, jam: { ...current.jam!, ...patch } }));
  const toggleSceneSprite = (assetId: string) => { if (!scene) return; const ids = scene.spriteIds || []; const active = ids.includes(assetId); patchScene({ spriteIds: active ? ids.filter((item) => item !== assetId) : [...ids, assetId], actions: active ? (scene.actions || []).filter((action) => action.spriteId !== assetId) : scene.actions }); };
  const addAction = (spriteId: string) => {
    if (!scene) return;
    const assetIndex = Math.max(0, spriteAssets.findIndex((asset) => asset.id === spriteId));
    const next: GameCharacterAction = { id: id('action'), spriteId, verb: 'entrar', text: '', x: 20 + (assetIndex % 4) * 20, y: 70, durationMs: 900 };
    patchScene({ spriteIds: scene.spriteIds?.includes(spriteId) ? scene.spriteIds : [...(scene.spriteIds || []), spriteId], actions: [...(scene.actions || []), next] });
  };
  const patchAction = (actionId: string, patch: Partial<GameCharacterAction>) => patchScene({ actions: (scene?.actions || []).map((action) => action.id === actionId ? { ...action, ...patch } : action) });
  const removeAction = (actionId: string) => patchScene({ actions: (scene?.actions || []).filter((action) => action.id !== actionId) });
  const toggleAsset = (asset: GameAssetOption) => { const exists = production.assets.find((item) => item.nodeId === asset.id); const assets = exists ? production.assets.filter((item) => item.nodeId !== asset.id) : [...production.assets, { id: id('asset'), nodeId: asset.id, name: asset.name, type: asset.type, url: asset.url, selected: true } as GameJamAsset]; patchProduction({ assets }); };
  const remaining = production.deadline ? Math.max(0, new Date(production.deadline).getTime() - now) : 0;
  const remainingText = production.deadline ? `${Math.floor(remaining / 3600000)}h ${Math.floor((remaining % 3600000) / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s` : 'defina o prazo';
  const startProduction = () => { const start = new Date(); const end = new Date(start.getTime() + (production.durationHours || 48) * 3600000); patchProduction({ enabled: true, startAt: start.toISOString(), deadline: end.toISOString() }); setTab('production'); };
  const resetPreview = (sceneId = draft.scenes[0]?.id || '') => { setPlaySceneId(sceneId); setPlayActionIndex(-1); setPlaying(false); };
  const nextScene = () => { if (!playScene?.nextSceneId) return; setPlaySceneId(playScene.nextSceneId); setPlayActionIndex(-1); setPlaying(false); };

  const renderSprite = (asset: GameAssetOption, index: number) => {
    const actions = playScene?.actions || [];
    const lastActionIndex = Math.min(playActionIndex, actions.length - 1);
    const past = lastActionIndex >= 0 ? actions.slice(0, lastActionIndex + 1).filter((action) => action.spriteId === asset.id) : [];
    const last = past[past.length - 1];
    const visible = !last || last.verb !== 'sair';
    const x = last?.x ?? 20 + (index % 4) * 20;
    const y = last?.y ?? 72;
    const jump = currentAction?.spriteId === asset.id && currentAction.verb === 'pular' ? -24 : 0;
    if (!visible) return null;
    return <div key={asset.id} className="absolute -translate-x-1/2 -translate-y-full transition-all duration-500" style={{ left: `${x}%`, top: `calc(${y}% + ${jump}px)` }}>
      {currentAction?.spriteId === asset.id && currentAction.verb === 'falar' && currentAction.text && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-28 max-w-48 rounded-xl bg-white text-black p-2 text-[10px] shadow-xl">{currentAction.text}</div>}
      {currentAction?.spriteId === asset.id && currentAction.verb === 'coletar' && <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 text-black px-2 py-0.5 text-[8px] font-bold">+ COLETA</div>}
      {asset.url ? <img src={asset.url} alt={asset.name} className="h-20 w-20 sm:h-24 sm:w-24 object-contain drop-shadow-md" /> : <div className="h-16 w-16 rounded-full bg-black text-white flex items-center justify-center text-[8px]">{asset.name}</div>}
      <div className="mt-1 rounded-full bg-black/65 px-2 py-1 text-[7px] text-white text-center max-w-24 truncate">{asset.name}</div>
    </div>;
  };

  return <div className="studio-editor fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={(e) => e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
      <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={19} /></button>
      <div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[10px] font-mono text-neutral-500 uppercase">GDD · roteiro · personagens · ações · playtest · produção</div></div>
      <StudioAreaGuide area="game-design" />
      <button disabled={!canEdit} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15} /> SALVAR</button>
    </header>

    <StudioWorkspace tools={<div>
      <div className="shrink-0 bg-white border-b p-2 grid grid-cols-3 gap-1.5">
        <button onClick={() => setTab('script')} className={`h-10 px-2 rounded-xl border text-[9px] font-bold ${tab === 'script' ? 'bg-black text-white border-black' : ''}`}>ROTEIRO GDD</button>
        <button onClick={() => setTab('design')} className={`h-10 px-2 rounded-xl border text-[9px] font-bold ${tab === 'design' ? 'bg-black text-white border-black' : ''}`}>FASES</button>
        <button onClick={() => setTab('production')} className={`h-10 px-2 rounded-xl border text-[9px] font-bold ${tab === 'production' ? 'bg-black text-white border-black' : ''}`}>PRODUÇÃO</button>
      </div>

      {tab === 'script' && <div className="p-4 space-y-4">
        <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><FileText size={16} /> Roteiro do GDD</b><p className="mt-1 text-[10px] text-neutral-500">Escreva a progressão do jogo e, abaixo, transforme o roteiro de cada cena em ações executáveis pelos personagens do projeto.</p></div>
        <label className="block text-[9px] font-mono">ROTEIRO MACRO<textarea value={draft.gddScript || ''} onChange={(e) => setDraft({ ...draft, gddScript: e.target.value })} className="mt-1 min-h-40 w-full rounded-xl border p-3 text-sm" placeholder="Premissa → conflito → progressão → virada → conclusão..." /></label>
        <div className="grid grid-cols-1 gap-2"><label className="text-[9px] font-mono">CENA<select value={scene?.id || ''} onChange={(e) => { setSelectedSceneId(e.target.value); resetPreview(e.target.value); }} className="mt-1 h-11 w-full rounded-xl border px-3">{draft.scenes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        {scene && <>
          <label className="block text-[9px] font-mono">ROTEIRO DA CENA<textarea value={scene.script || ''} onChange={(e) => patchScene({ script: e.target.value })} className="mt-1 min-h-32 w-full rounded-xl border p-3 text-sm" placeholder="Ex.: Lia entra pela esquerda. A árvore fala. Lia coleta a fruta e caminha até a saída." /></label>
          <div className="rounded-2xl border bg-white p-4"><div className="flex items-start justify-between gap-2"><div><b className="text-sm">Puxar personagem para a ação</b><p className="mt-1 text-[10px] text-neutral-500">Toque em um personagem para criar uma ação. Depois defina verbo, fala e posição como num editor de eventos.</p></div><Info size={16} className="text-neutral-400" /></div><div className="mt-3 grid grid-cols-2 gap-2">{spriteAssets.map((asset) => <button key={asset.id} onClick={() => addAction(asset.id)} className="rounded-xl border bg-white overflow-hidden text-left"><div className="h-24 bg-neutral-100 flex items-center justify-center">{asset.url ? <img src={asset.url} alt="" className="h-full w-full object-contain" /> : <Gamepad2 className="text-neutral-300" />}</div><div className="p-2 text-[9px] font-bold flex items-center justify-between gap-1"><span className="truncate">{asset.name}</span><Plus size={12} /></div></button>)}{!spriteAssets.length && <div className="col-span-2 rounded-xl border border-dashed p-4 text-[10px] text-neutral-400">Crie personagens em PERSONAGENS. Eles aparecerão automaticamente aqui.</div>}</div></div>
          <div className="space-y-3">{(scene.actions || []).map((action, index) => { const asset = spriteAssets.find((item) => item.id === action.spriteId); return <div key={action.id} className="rounded-2xl border bg-white p-3"><div className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-black text-white text-[9px] flex items-center justify-center shrink-0">{index + 1}</span><b className="min-w-0 flex-1 truncate text-xs">{asset?.name || 'Personagem'}</b><button onClick={() => removeAction(action.id)} className="h-8 w-8 rounded-lg text-red-600 flex items-center justify-center"><Trash2 size={14} /></button></div><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[8px] font-mono">AÇÃO<select value={action.verb} onChange={(e) => patchAction(action.id, { verb: e.target.value as GameActionVerb })} className="mt-1 h-9 w-full rounded-lg border px-2 text-xs">{ACTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-[8px] font-mono">DURAÇÃO<input type="number" min={100} step={100} value={action.durationMs || 900} onChange={(e) => patchAction(action.id, { durationMs: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2 text-xs" /></label></div>{(action.verb === 'falar' || action.verb === 'coletar') && <input value={action.text || ''} onChange={(e) => patchAction(action.id, { text: e.target.value })} placeholder={action.verb === 'falar' ? 'Fala / balão de diálogo' : 'Objeto ou feedback da coleta'} className="mt-2 h-9 w-full rounded-lg border px-2 text-xs" />}<div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[8px] font-mono">X · {Math.round(action.x ?? 50)}<input type="range" min={5} max={95} value={action.x ?? 50} onChange={(e) => patchAction(action.id, { x: Number(e.target.value) })} className="w-full" /></label><label className="text-[8px] font-mono">Y · {Math.round(action.y ?? 70)}<input type="range" min={25} max={92} value={action.y ?? 70} onChange={(e) => patchAction(action.id, { y: Number(e.target.value) })} className="w-full" /></label></div></div>; })}</div>
        </>}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-[10px] text-emerald-950"><b>Motor gratuito recomendado:</b> o preview desta ferramenta roda localmente, sem API. Para implementação web 2D, use Phaser (MIT, gratuito). PixiJS também é excelente quando o foco é renderização 2D; Matter.js é uma opção gratuita para física. Escolha abaixo o alvo de produção, sem adicionar custo ou função serverless.</div>
        <label className="block text-[9px] font-mono">MOTOR ALVO<select value={draft.previewEngine || 'local'} onChange={(e) => setDraft({ ...draft, previewEngine: e.target.value as GameDesignDocument['previewEngine'] })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="local">Preview local / protótipo</option><option value="phaser">Phaser · jogo 2D web</option><option value="pixi">PixiJS · renderização 2D</option></select></label>
      </div>}

      {tab === 'design' && <div className="p-4">
        <section className="max-w-7xl mx-auto grid grid-cols-1 gap-4">
          <aside className="rounded-2xl bg-white border p-4"><div className="flex justify-between"><b className="flex gap-2"><Gamepad2 size={16} /> Fases / cenas</b><button onClick={addScene} className="h-9 w-9 rounded-xl bg-black text-white flex items-center justify-center"><Plus size={15} /></button></div><div className="mt-3 space-y-2">{draft.scenes.map((item) => <button key={item.id} onClick={() => { setSelectedSceneId(item.id); resetPreview(item.id); }} className={`w-full rounded-xl border p-3 text-left ${scene?.id === item.id ? 'border-black bg-[#F3F2EE]' : ''}`}><div className="text-[9px] font-mono text-neutral-400">{SCENE_TYPES.find((type) => type.id === item.type)?.label}</div><b className="text-xs">{item.name}</b><div className="text-[9px] text-neutral-500 line-clamp-2">{item.objective}</div></button>)}</div></aside>
          <section className="space-y-4">
            {scene && <div className="rounded-2xl border-2 border-black bg-white p-5"><div className="flex gap-2"><input value={scene.name} onChange={(e) => patchScene({ name: e.target.value })} className="h-11 flex-1 rounded-xl border px-3 font-bold" /><button disabled={draft.scenes.length <= 1} onClick={() => { const next = draft.scenes.filter((item) => item.id !== scene.id); setDraft({ ...draft, scenes: next }); setSelectedSceneId(next[0]?.id || ''); resetPreview(next[0]?.id || ''); }} className="h-11 w-11 rounded-xl border border-red-200 text-red-700 flex items-center justify-center disabled:opacity-30"><Trash2 size={15} /></button></div><div className="mt-3 grid grid-cols-1 gap-3"><label className="text-[9px] font-mono">TIPO<select value={scene.type} onChange={(e) => patchScene({ type: e.target.value as GameSceneType })} className="mt-1 h-11 w-full rounded-xl border px-3">{SCENE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label><label className="text-[9px] font-mono">PRÓXIMA CENA<select value={scene.nextSceneId || ''} onChange={(e) => patchScene({ nextSceneId: e.target.value || undefined })} className="mt-1 h-11 w-full rounded-xl border px-3"><option value="">Fim</option>{draft.scenes.filter((item) => item.id !== scene.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="text-[9px] font-mono">COR / CENÁRIO<input type="color" value={scene.background} onChange={(e) => patchScene({ background: e.target.value })} className="mt-1 h-11 w-full rounded-xl border p-1" /></label></div><textarea value={scene.objective} onChange={(e) => patchScene({ objective: e.target.value })} className="mt-3 min-h-20 w-full rounded-xl border p-3" placeholder="Objetivo desta fase/cena" /><div className="mt-3 flex flex-wrap gap-2">{MECHANICS.map((mechanic) => <button key={mechanic} onClick={() => patchScene({ mechanics: scene.mechanics.includes(mechanic) ? scene.mechanics.filter((item) => item !== mechanic) : [...scene.mechanics, mechanic] })} className={`h-9 px-3 rounded-full border text-[10px] ${scene.mechanics.includes(mechanic) ? 'bg-black text-white' : ''}`}>{mechanic}</button>)}</div></div>}
            <div className="rounded-2xl border bg-white p-5"><b className="text-sm">Personagens e sprites da cena</b><div className="text-[10px] text-neutral-500 mt-1">Escolha quem existe nesta cena. No modo ROTEIRO GDD você define o que cada personagem faz.</div><div className="mt-3 grid grid-cols-2 gap-2">{spriteAssets.map((asset) => { const active = scene?.spriteIds?.includes(asset.id); return <button key={asset.id} onClick={() => toggleSceneSprite(asset.id)} className={`rounded-xl border overflow-hidden text-left ${active ? 'ring-2 ring-black bg-black text-white' : 'bg-white'}`}><div className="aspect-video bg-neutral-100 flex items-center justify-center overflow-hidden">{asset.url ? <img src={asset.url} alt="" className="w-full h-full object-contain" /> : <Gamepad2 className="text-neutral-300" />}</div><div className="p-2 text-[9px] font-bold truncate">{active ? '✓ ' : ''}{asset.name}</div></button>; })}{!spriteAssets.length && <div className="sm:col-span-2 xl:col-span-3 rounded-xl border border-dashed p-4 text-[10px] text-neutral-400">Nenhum personagem criado ainda.</div>}</div></div>
            <div className="rounded-2xl border bg-white p-5"><label className="text-[9px] font-mono text-neutral-500">GÊNERO / FORMATO<input value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="mt-3 block text-[9px] font-mono text-neutral-500">CORE LOOP<textarea value={draft.coreLoop} onChange={(e) => setDraft({ ...draft, coreLoop: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label><label className="mt-3 block text-[9px] font-mono text-neutral-500">OBJETIVO DA PESSOA JOGADORA<textarea value={draft.playerGoal} onChange={(e) => setDraft({ ...draft, playerGoal: e.target.value })} className="mt-1 min-h-16 w-full rounded-xl border p-3" /></label></div>
          </section>
        </section>
      </div>}

      {tab === 'production' && <div className="p-4"><section className="max-w-7xl mx-auto space-y-5"><div className="rounded-3xl bg-[#111] text-white p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-mono text-white/50">GAME DESIGN · PRODUÇÃO</div><input value={production.name} onChange={(e) => patchProduction({ name: e.target.value })} className="mt-1 bg-transparent text-3xl font-bold outline-none max-w-full" /><div className="mt-2 flex items-center gap-2 text-sm"><Clock3 size={16} /><b>{remainingText}</b></div></div>{!production.enabled ? <button onClick={startProduction} className="h-12 px-5 rounded-xl bg-white text-black font-bold text-xs">INICIAR PRODUÇÃO · {production.durationHours}H</button> : <span className="rounded-full border border-white/20 px-3 py-2 text-[10px]">PRODUÇÃO ATIVA</span>}</div><div className="mt-5 grid grid-cols-1 gap-3"><label className="text-[9px] font-mono text-white/50">TEMA<input value={production.theme} onChange={(e) => patchProduction({ theme: e.target.value })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label><label className="text-[9px] font-mono text-white/50">DURAÇÃO (HORAS)<input type="number" value={production.durationHours} onChange={(e) => patchProduction({ durationHours: +e.target.value })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label><label className="text-[9px] font-mono text-white/50">PRAZO<input type="datetime-local" value={production.deadline ? new Date(production.deadline).toISOString().slice(0, 16) : ''} onChange={(e) => patchProduction({ deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label></div><label className="mt-3 block text-[9px] font-mono text-white/50">RESTRIÇÕES / BRIEF<textarea value={production.constraints} onChange={(e) => patchProduction({ constraints: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl bg-white text-black p-3" /></label></div><div className="grid grid-cols-1 gap-4"><div className="rounded-2xl bg-white border p-5"><div className="flex justify-between"><b className="flex gap-2"><Users size={16} /> Equipe e papéis</b><button onClick={() => patchProduction({ team: [...production.team, { id: id('member'), name: 'Pessoa', role: 'Design / código / arte' } as GameJamMember] })} className="h-9 w-9 rounded-lg bg-black text-white flex items-center justify-center"><Plus size={14} /></button></div>{production.team.map((member) => <div key={member.id} className="mt-2 flex gap-2"><input value={member.name} onChange={(e) => patchProduction({ team: production.team.map((item) => item.id === member.id ? { ...item, name: e.target.value } : item) })} className="h-10 min-w-0 flex-1 border rounded-lg px-2" /><input value={member.role} onChange={(e) => patchProduction({ team: production.team.map((item) => item.id === member.id ? { ...item, role: e.target.value } : item) })} className="h-10 min-w-0 flex-1 border rounded-lg px-2" /></div>)}</div><div className="rounded-2xl bg-white border p-5"><b className="flex gap-2"><Sparkles size={16} /> Assets do projeto</b><div className="text-[10px] text-neutral-500 mt-1">Puxe personagens/sprites, desenhos, imagens, som, vídeo, wireframes e interações direto do Ateliê.</div><div className="mt-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">{availableAssets.map((asset) => { const active = production.assets.some((item) => item.nodeId === asset.id); return <button key={asset.id} onClick={() => toggleAsset(asset)} className={`rounded-xl border p-3 text-left ${active ? 'bg-black text-white' : ''}`}><div className="text-[9px] font-mono opacity-60">{asset.type}</div><b className="text-[10px] line-clamp-2">{asset.name}</b></button>; })}</div></div></div><div className="rounded-2xl bg-white border p-5"><b>Checklist de produção</b><div className="mt-3 grid grid-cols-1 gap-2">{production.checklist.map((check) => <label key={check.id} className="flex gap-2 items-center rounded-xl border p-3 text-xs"><input type="checkbox" checked={check.done} onChange={(e) => patchProduction({ checklist: production.checklist.map((item) => item.id === check.id ? { ...item, done: e.target.checked } : item) })} /><input value={check.label} onChange={(e) => patchProduction({ checklist: production.checklist.map((item) => item.id === check.id ? { ...item, label: e.target.value } : item) })} className="min-w-0 flex-1" /></label>)}</div></div><div className="rounded-2xl bg-white border p-5"><b className="flex gap-2"><Link2 size={16} /> Build e publicação</b><div className="mt-3 grid grid-cols-1 gap-3"><input value={production.buildUrl || ''} onChange={(e) => patchProduction({ buildUrl: e.target.value })} placeholder="URL do build jogável" className="h-11 rounded-xl border px-3" /><input value={production.submissionUrl || ''} onChange={(e) => patchProduction({ submissionUrl: e.target.value })} placeholder="URL da página de publicação/submissão" className="h-11 rounded-xl border px-3" /></div></div></section></div>}
    </div>}>
      <section className="max-w-7xl mx-auto rounded-2xl bg-[#111] text-white p-4 sm:p-5 w-full">
        <div className="flex flex-wrap justify-between gap-3"><div><b className="flex gap-2"><Play size={16} /> Preview jogável · estilo Construct</b><div className="text-[10px] text-white/50 mt-1">Sem API externa: teste cena, posição, personagem, fala e sequência de ações diretamente no navegador.</div></div><div className="flex gap-2"><button onClick={() => resetPreview(playScene?.id || draft.scenes[0]?.id || '')} className="h-10 w-10 bg-white text-black rounded-xl flex items-center justify-center"><RotateCcw size={15} /></button><button onClick={() => setPlaying((value) => !value)} className="h-10 px-4 bg-white text-black rounded-xl text-[10px] font-bold flex items-center gap-2">{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'PAUSAR' : 'RODAR'}</button></div></div>
        {playScene && <div className="mt-4 rounded-2xl overflow-hidden border border-white/20"><div className="h-9 bg-[#252525] border-b border-white/10 px-3 flex items-center gap-2 overflow-x-auto">{draft.scenes.map((item) => <button key={item.id} onClick={() => resetPreview(item.id)} className={`h-6 px-2 rounded-md text-[8px] shrink-0 ${playScene.id === item.id ? 'bg-white text-black' : 'bg-white/10'}`}>{item.name}</button>)}</div><div className="relative min-h-[330px] overflow-hidden" style={{ backgroundColor: playScene.background, backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)', backgroundSize: '32px 32px' }}><div className="absolute left-3 top-3 rounded-lg bg-black/60 px-3 py-2 text-left"><div className="text-[8px] font-mono opacity-60">{SCENE_TYPES.find((type) => type.id === playScene.type)?.label}</div><b className="text-sm">{playScene.name}</b><div className="text-[9px] opacity-65 max-w-64">{playScene.objective}</div></div>{spriteAssets.filter((asset) => playScene.spriteIds?.includes(asset.id)).map(renderSprite)}{!playScene.spriteIds?.length && <div className="absolute inset-0 flex items-center justify-center text-center p-6"><div><Gamepad2 className="mx-auto opacity-25" size={48} /><div className="mt-2 text-sm opacity-50">Puxe personagens para esta cena.</div></div></div>}<div className="absolute left-3 right-3 bottom-3 rounded-xl bg-black/65 p-3 backdrop-blur-sm"><div className="text-[8px] font-mono opacity-50">EVENTO {Math.max(0, playActionIndex + 1)} / {playScene.actions?.length || 0}</div><div className="mt-1 min-h-5 text-xs">{currentAction ? `${spriteAssets.find((a) => a.id === currentAction.spriteId)?.name || 'Personagem'} · ${ACTIONS.find((a) => a.id === currentAction.verb)?.label}${currentAction.text ? ` — ${currentAction.text}` : ''}` : 'Pronto para iniciar a sequência.'}</div></div></div><div className="bg-[#1D1D1D] p-3 flex items-center justify-between gap-3"><div className="text-[9px] text-white/50 truncate">{playScene.script || 'Sem roteiro de cena.'}</div>{playScene.nextSceneId && <button onClick={nextScene} className="h-9 px-3 rounded-xl border border-white/30 text-[9px] shrink-0">PRÓXIMA CENA</button>}</div></div>}
      </section>
    </StudioWorkspace>
  </div>;
}
