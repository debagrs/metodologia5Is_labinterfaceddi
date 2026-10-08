import { StudioWorkspace } from './StudioWorkspace';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ChevronDown, ChevronRight, ChevronUp, Clock3, FileText, Gamepad2, Info, Link2,
  Pause, Play, Plus, RotateCcw, Save, Sparkles, Trash2, Users, X
} from 'lucide-react';
import {
  GameActionVerb, GameCharacterAction, GameDesignDocument, GameJamAsset, GameJamMember,
  GameProgramBlock, GameProgramBlockKind, GameScene, GameSceneType
} from '../types';

interface GameAssetOption { id: string; name: string; type: string; url?: string; }
interface Props {
  document: GameDesignDocument;
  title?: string;
  canEdit?: boolean;
  availableAssets?: GameAssetOption[];
  onSave: (document: GameDesignDocument) => void;
  onClose: () => void;
}

type StudioTab = 'script' | 'design' | 'blocks' | 'production';
type BlockCategory = 'event' | 'motion' | 'looks' | 'control' | 'data';

const id = (prefix = 'game') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const MECHANICS = ['movimento', 'toque', 'coleta', 'pontuação', 'timer', 'diálogo', 'escolhas', 'inventário', 'física', 'quiz', 'combate', 'exploração', 'cooperação', 'narrativa'];
const ACTIONS: Array<{ id: GameActionVerb; label: string }> = [
  { id: 'entrar', label: 'Entrar' }, { id: 'andar', label: 'Mover' }, { id: 'falar', label: 'Falar' },
  { id: 'coletar', label: 'Coletar' }, { id: 'pular', label: 'Pular' }, { id: 'esperar', label: 'Esperar' },
  { id: 'girar', label: 'Girar' }, { id: 'redimensionar', label: 'Tamanho' }, { id: 'mostrar', label: 'Mostrar' },
  { id: 'esconder', label: 'Esconder' }, { id: 'sair', label: 'Sair' },
];
const SCENE_TYPES: Array<{ id: GameSceneType; label: string }> = [
  { id: 'menu', label: 'Menu' }, { id: 'level', label: 'Fase' }, { id: 'boss', label: 'Desafio' },
  { id: 'cutscene', label: 'Narrativa' }, { id: 'result', label: 'Resultado' },
];
const BLOCK_CATEGORY: Record<BlockCategory, { label: string; color: string; text: string }> = {
  event: { label: 'INÍCIO', color: '#F7C948', text: '#111111' },
  motion: { label: 'MOVIMENTO', color: '#55C878', text: '#082B12' },
  looks: { label: 'FALA / VISUAL', color: '#6288FF', text: '#FFFFFF' },
  control: { label: 'CONTROLE', color: '#F59B45', text: '#311400' },
  data: { label: 'DADOS', color: '#42C8D7', text: '#06282D' },
};
const BLOCKS: Array<{ kind: GameProgramBlockKind; label: string; category: BlockCategory }> = [
  { kind: 'when-play', label: 'quando iniciar', category: 'event' },
  { kind: 'when-tap', label: 'quando tocar no ator', category: 'event' },
  { kind: 'when-scene', label: 'quando entrar na cena', category: 'event' },
  { kind: 'when-message', label: 'quando receber mensagem', category: 'event' },
  { kind: 'move', label: 'mova para X / Y', category: 'motion' },
  { kind: 'jump', label: 'pule', category: 'motion' },
  { kind: 'go-to', label: 'vá para ator', category: 'motion' },
  { kind: 'rotate', label: 'gire', category: 'motion' },
  { kind: 'say', label: 'diga', category: 'looks' },
  { kind: 'show', label: 'mostre', category: 'looks' },
  { kind: 'hide', label: 'esconda', category: 'looks' },
  { kind: 'set-size', label: 'defina tamanho', category: 'looks' },
  { kind: 'wait', label: 'espere', category: 'control' },
  { kind: 'repeat', label: 'repita o bloco anterior', category: 'control' },
  { kind: 'if-touching', label: 'se encostar em', category: 'control' },
  { kind: 'broadcast', label: 'transmita mensagem', category: 'control' },
  { kind: 'set-variable', label: 'defina variável', category: 'data' },
  { kind: 'change-variable', label: 'mude variável', category: 'data' },
  { kind: 'random', label: 'número aleatório', category: 'data' },
];
const defaultChecklist = () => ['Tema interpretado', 'Core loop jogável', 'Personagens e sprites revisados', 'Tela inicial', 'Áudio revisado', 'Controles explicados', 'Playtest rápido', 'Build final', 'Créditos e licenças'].map((label) => ({ id: id('check'), label, done: false }));

const isVisualAsset = (asset: GameAssetOption) => {
  if (!asset.url) return false;
  return !/(?:sound|audio|video)/i.test(asset.type || '');
};

function createBlock(kind: GameProgramBlockKind, actorId?: string): GameProgramBlock {
  return {
    id: id('block'), kind, actorId,
    text: kind === 'say' ? 'Olá!' : '',
    message: kind === 'broadcast' || kind === 'when-message' ? 'mensagem-1' : '',
    variable: kind === 'set-variable' || kind === 'change-variable' ? 'pontos' : '',
    value: kind === 'rotate' ? 45 : kind === 'set-size' ? 100 : kind === 'wait' ? 1 : kind === 'set-variable' || kind === 'change-variable' ? 1 : 0,
    value2: kind === 'random' ? 10 : undefined,
    x: 50, y: 70, durationMs: kind === 'wait' ? 1000 : 700, repeat: 3,
  };
}

function compileBlocks(scene: GameScene): GameCharacterAction[] {
  const actions: GameCharacterAction[] = [];
  const actorFallback = scene.spriteIds?.[0] || '';
  for (const block of scene.blocks || []) {
    const actorId = block.actorId || actorFallback;
    if (!actorId && !['broadcast', 'set-variable', 'change-variable', 'random'].includes(block.kind)) continue;
    const base = { id: `compiled-${block.id}`, spriteId: actorId, durationMs: block.durationMs || 700 };
    if (block.kind === 'move') actions.push({ ...base, verb: 'andar', x: block.x ?? 50, y: block.y ?? 70 });
    else if (block.kind === 'go-to') { const targetHistory = [...(scene.actions || []), ...actions].filter((a) => a.spriteId === block.targetActorId && (Number.isFinite(a.x) || Number.isFinite(a.y))); const target = targetHistory[targetHistory.length - 1]; actions.push({ ...base, verb: 'andar', x: target?.x ?? block.x ?? 50, y: target?.y ?? block.y ?? 70 }); }
    else if (block.kind === 'jump') actions.push({ ...base, verb: 'pular', x: block.x, y: block.y });
    else if (block.kind === 'rotate') actions.push({ ...base, verb: 'girar', rotation: block.value ?? 45 });
    else if (block.kind === 'say') actions.push({ ...base, verb: 'falar', text: block.text || 'Olá!' });
    else if (block.kind === 'show') actions.push({ ...base, verb: 'mostrar' });
    else if (block.kind === 'hide') actions.push({ ...base, verb: 'esconder' });
    else if (block.kind === 'set-size') actions.push({ ...base, verb: 'redimensionar', scale: Math.max(.1, (block.value ?? 100) / 100) });
    else if (block.kind === 'wait') actions.push({ ...base, verb: 'esperar', durationMs: Math.max(100, block.durationMs || (block.value || 1) * 1000) });
    else if (block.kind === 'repeat' && actions.length) {
      const last = actions[actions.length - 1];
      for (let i = 1; i < Math.max(1, Math.min(12, block.repeat || 2)); i++) actions.push({ ...last, id: `${last.id}-repeat-${i}` });
    }
  }
  return actions;
}

export const blankGameDesign = (): GameDesignDocument => {
  const first = id('scene'); const second = id('scene');
  return {
    title: 'Game Design do projeto', genre: 'Experiência interativa', coreLoop: 'Explorar → agir → receber feedback → avançar', playerGoal: 'Defina o que a pessoa tenta alcançar.',
    gddScript: 'Escreva aqui o roteiro macro do jogo: premissa, progressão, viradas, regras do mundo e como as fases se conectam.', previewEngine: 'local',
    scenes: [
      { id: first, name: 'Início', type: 'menu', objective: 'Apresentar a experiência', mechanics: ['toque'], background: '#111111', nextSceneId: second, spriteIds: [], script: 'Apresente o mundo e convide a pessoa jogadora a começar.', actions: [], blocks: [createBlock('when-play')] },
      { id: second, name: 'Fase 1', type: 'level', objective: 'Primeiro desafio jogável', mechanics: ['movimento', 'coleta'], background: '#E7E4DC', spriteIds: [], script: 'Descreva o que acontece nesta fase e quais personagens entram em ação.', actions: [], blocks: [createBlock('when-scene')] },
    ],
    sprints: [], jam: { enabled: false, name: 'Produção do jogo', theme: '', constraints: '', durationHours: 48, team: [], assets: [], checklist: defaultChecklist() },
  };
};

export function GameDesignPreview({ document, className = '' }: { document: GameDesignDocument; className?: string }) {
  const actorCount = new Set(document.scenes.flatMap((scene) => scene.spriteIds || [])).size;
  const actionCount = document.scenes.reduce((sum, scene) => sum + (scene.actions?.length || 0) + (scene.blocks?.length || 0), 0);
  return <div className={`bg-[#171717] text-white p-4 overflow-hidden ${className}`}>
    <div className="text-xs font-bold flex gap-2"><Gamepad2 size={15} />{document.title}</div>
    <div className="mt-3 flex gap-1 overflow-hidden">{document.scenes.slice(0, 4).map((scene, index) => <React.Fragment key={scene.id}><div className="shrink-0 rounded-lg border border-white/20 px-2 py-2 text-[9px] max-w-24 truncate">{scene.name}</div>{index < Math.min(3, document.scenes.length - 1) && <ChevronRight size={12} className="opacity-40" />}</React.Fragment>)}</div>
    <div className="mt-3 text-[9px] opacity-60">{document.scenes.length} cenas · {actorCount} atores/assets · {actionCount} ações/blocos</div>
  </div>;
}

export default function GameDesignStudio({ document, title = 'Game Design', canEdit = true, availableAssets = [], onSave, onClose }: Props) {
  const initial = JSON.parse(JSON.stringify(document)) as GameDesignDocument;
  initial.sprints ||= []; initial.gddScript ||= ''; initial.previewEngine ||= 'local';
  initial.scenes = (initial.scenes || []).map((scene) => ({ ...scene, spriteIds: scene.spriteIds || [], script: scene.script || '', actions: scene.actions || [], blocks: scene.blocks || [] }));
  initial.jam ||= { enabled: false, name: 'Produção do jogo', theme: '', constraints: '', durationHours: 48, team: [], assets: [], checklist: defaultChecklist() };
  initial.jam.team ||= []; initial.jam.assets ||= []; initial.jam.checklist ||= defaultChecklist();

  const [draft, setDraft] = useState(initial);
  const [selectedSceneId, setSelectedSceneId] = useState(initial.scenes[0]?.id || '');
  const [playSceneId, setPlaySceneId] = useState(initial.scenes[0]?.id || '');
  const [playActionIndex, setPlayActionIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [tab, setTab] = useState<StudioTab>('script');
  const [now, setNow] = useState(Date.now());

  const scene = useMemo(() => draft.scenes.find((item) => item.id === selectedSceneId) || draft.scenes[0], [draft.scenes, selectedSceneId]);
  const playScene = draft.scenes.find((item) => item.id === playSceneId) || draft.scenes[0];
  const production = draft.jam!;
  const visualAssets = useMemo(() => availableAssets.filter(isVisualAsset), [availableAssets]);
  const playActions = useMemo(() => playScene ? [...(playScene.actions || []), ...compileBlocks(playScene)] : [], [playScene]);
  const currentAction = playActions[playActionIndex];

  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    if (!playing) return;
    if (!playActions.length) { setPlaying(false); return; }
    const current = playActions[Math.max(0, playActionIndex)];
    const delay = Math.max(180, current?.durationMs || 700);
    const timer = window.setTimeout(() => setPlayActionIndex((index) => {
      if (index >= playActions.length - 1) { setPlaying(false); return playActions.length - 1; }
      return index + 1;
    }), delay);
    return () => window.clearTimeout(timer);
  }, [playing, playActionIndex, playActions]);

  const patchScene = (patch: Partial<GameScene>) => scene && setDraft((current) => ({ ...current, scenes: current.scenes.map((item) => item.id === scene.id ? { ...item, ...patch } : item) }));
  const addScene = () => {
    const next: GameScene = { id: id('scene'), name: `Fase ${draft.scenes.length}`, type: 'level', objective: 'Novo objetivo', mechanics: ['toque'], background: '#FFFFFF', spriteIds: [], script: '', actions: [], blocks: [createBlock('when-scene')] };
    setDraft((current) => ({ ...current, scenes: [...current.scenes, next] })); setSelectedSceneId(next.id); setPlaySceneId(next.id); setPlayActionIndex(-1);
  };
  const patchProduction = (patch: any) => setDraft((current) => ({ ...current, jam: { ...current.jam!, ...patch } }));
  const addAssetToScene = (sceneId: string, assetId: string, x?: number, y?: number, createEntryAction = true) => {
    const assetIndex = Math.max(0, visualAssets.findIndex((asset) => asset.id === assetId));
    setDraft((current) => ({ ...current, scenes: current.scenes.map((target) => {
      if (target.id !== sceneId) return target;
      const ids = target.spriteIds?.includes(assetId) ? target.spriteIds : [...(target.spriteIds || []), assetId];
      if (!createEntryAction || (target.actions || []).some((a) => a.spriteId === assetId)) return { ...target, spriteIds: ids };
      const next: GameCharacterAction = { id: id('action'), spriteId: assetId, verb: 'entrar', text: '', x: Math.max(5, Math.min(95, x ?? (20 + (assetIndex % 4) * 20))), y: Math.max(20, Math.min(92, y ?? 70)), durationMs: 600 };
      return { ...target, spriteIds: ids, actions: [...(target.actions || []), next] };
    }) }));
  };
  const syncAllVisualAssets = () => {
    if (!scene) return;
    visualAssets.forEach((asset, index) => addAssetToScene(scene.id, asset.id, 14 + (index % 4) * 23, 58 + (Math.floor(index / 4) % 2) * 25, false));
  };
  const removeAssetFromScene = (assetId: string) => {
    if (!scene) return;
    patchScene({ spriteIds: (scene.spriteIds || []).filter((x) => x !== assetId), actions: (scene.actions || []).filter((a) => a.spriteId !== assetId), blocks: (scene.blocks || []).map((b) => b.actorId === assetId ? { ...b, actorId: undefined } : b) });
  };
  const addAction = (assetId: string) => scene && addAssetToScene(scene.id, assetId);
  const dragAsset = (event: React.DragEvent, assetId: string) => { event.dataTransfer.effectAllowed = 'copy'; event.dataTransfer.setData('application/x-5is-game-asset', assetId); event.dataTransfer.setData('text/plain', assetId); };
  const dropAssetOnScene = (event: React.DragEvent<HTMLDivElement>, targetSceneId: string) => {
    event.preventDefault(); const assetId = event.dataTransfer.getData('application/x-5is-game-asset') || event.dataTransfer.getData('text/plain');
    if (!assetId || !visualAssets.some((asset) => asset.id === assetId)) return;
    const rect = event.currentTarget.getBoundingClientRect(); const x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 100; const y = ((event.clientY - rect.top) / Math.max(1, rect.height)) * 100;
    setSelectedSceneId(targetSceneId); setPlaySceneId(targetSceneId); setPlayActionIndex(-1); addAssetToScene(targetSceneId, assetId, x, y);
  };
  const patchAction = (actionId: string, patch: Partial<GameCharacterAction>) => patchScene({ actions: (scene?.actions || []).map((action) => action.id === actionId ? { ...action, ...patch } : action) });
  const removeAction = (actionId: string) => patchScene({ actions: (scene?.actions || []).filter((action) => action.id !== actionId) });
  const addBlock = (kind: GameProgramBlockKind) => { if (!scene) return; patchScene({ blocks: [...(scene.blocks || []), createBlock(kind, scene.spriteIds?.[0] || visualAssets[0]?.id)] }); };
  const patchBlock = (blockId: string, patch: Partial<GameProgramBlock>) => patchScene({ blocks: (scene?.blocks || []).map((block) => block.id === blockId ? { ...block, ...patch } : block) });
  const removeBlock = (blockId: string) => patchScene({ blocks: (scene?.blocks || []).filter((block) => block.id !== blockId) });
  const moveBlock = (blockId: string, delta: number) => {
    const blocks = [...(scene?.blocks || [])]; const index = blocks.findIndex((b) => b.id === blockId); const next = index + delta; if (index < 0 || next < 0 || next >= blocks.length) return;
    [blocks[index], blocks[next]] = [blocks[next], blocks[index]]; patchScene({ blocks });
  };
  const dropBlock = (event: React.DragEvent) => { event.preventDefault(); const kind = event.dataTransfer.getData('application/x-5is-game-block') as GameProgramBlockKind; if (BLOCKS.some((b) => b.kind === kind)) addBlock(kind); };
  const toggleAsset = (asset: GameAssetOption) => { const exists = production.assets.find((item) => item.nodeId === asset.id); const assets = exists ? production.assets.filter((item) => item.nodeId !== asset.id) : [...production.assets, { id: id('asset'), nodeId: asset.id, name: asset.name, type: asset.type, url: asset.url, selected: true } as GameJamAsset]; patchProduction({ assets }); };
  const remaining = production.deadline ? Math.max(0, new Date(production.deadline).getTime() - now) : 0;
  const remainingText = production.deadline ? `${Math.floor(remaining / 3600000)}h ${Math.floor((remaining % 3600000) / 60000)}m ${Math.floor((remaining % 60000) / 1000)}s` : 'defina o prazo';
  const startProduction = () => { const start = new Date(); const end = new Date(start.getTime() + (production.durationHours || 48) * 3600000); patchProduction({ enabled: true, startAt: start.toISOString(), deadline: end.toISOString() }); setTab('production'); };
  const resetPreview = (sceneId = draft.scenes[0]?.id || '') => { setPlaySceneId(sceneId); setPlayActionIndex(-1); setPlaying(false); };
  const runPreview = () => { if (!playScene || !playActions.length) return; if (playing) { setPlaying(false); return; } setPlayActionIndex((index) => index < 0 || index >= playActions.length - 1 ? 0 : index); setPlaying(true); };
  const nextScene = () => { if (!playScene?.nextSceneId) return; resetPreview(playScene.nextSceneId); };

  const renderActor = (asset: GameAssetOption, index: number) => {
    const lastActionIndex = Math.min(playActionIndex, playActions.length - 1);
    const past = lastActionIndex >= 0 ? playActions.slice(0, lastActionIndex + 1).filter((action) => action.spriteId === asset.id) : [];
    const last = past[past.length - 1];
    const visibilityActions = past.filter((a) => ['mostrar', 'esconder', 'entrar', 'sair'].includes(a.verb));
    const visible = !visibilityActions.length || !['esconder', 'sair'].includes(visibilityActions[visibilityActions.length - 1].verb);
    const position = [...past].reverse().find((a) => Number.isFinite(a.x) || Number.isFinite(a.y));
    const rotation = [...past].reverse().find((a) => a.verb === 'girar')?.rotation || 0;
    const scale = [...past].reverse().find((a) => a.verb === 'redimensionar')?.scale || 1;
    const x = position?.x ?? 20 + (index % 4) * 20; const y = position?.y ?? 72;
    const jump = currentAction?.spriteId === asset.id && currentAction.verb === 'pular' ? -24 : 0;
    if (!visible) return null;
    return <div key={asset.id} className="absolute -translate-x-1/2 -translate-y-full transition-all duration-500" style={{ left: `${x}%`, top: `calc(${y}% + ${jump}px)`, transform: `translate(-50%,-100%) rotate(${rotation}deg) scale(${scale})` }}>
      {currentAction?.spriteId === asset.id && currentAction.verb === 'falar' && currentAction.text && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-28 max-w-48 rounded-xl bg-white text-black p-2 text-[10px] shadow-xl">{currentAction.text}</div>}
      {currentAction?.spriteId === asset.id && currentAction.verb === 'coletar' && <div className="absolute -top-5 left-1/2 -translate-x-1/2 rounded-full bg-amber-300 text-black px-2 py-0.5 text-[8px] font-bold">+ COLETA</div>}
      {asset.url ? <img src={asset.url} alt={asset.name} className="h-20 w-20 sm:h-24 sm:w-24 object-contain drop-shadow-md" /> : <div className="h-16 w-16 rounded-full bg-black text-white flex items-center justify-center text-[8px]">{asset.name}</div>}
      <div className="mt-1 rounded-full bg-black/65 px-2 py-1 text-[7px] text-white text-center max-w-24 truncate">{asset.name}</div>
    </div>;
  };

  const assetPicker = <div className="rounded-2xl border bg-white p-4">
    <div className="flex items-start justify-between gap-2"><div><b className="text-sm">Atores e elementos do projeto</b><p className="mt-1 text-[10px] text-neutral-500">Personagens, desenhos, imagens, grafismos, marcas e outros assets visuais entram na cena com um toque ou por arrastar.</p></div><button type="button" onClick={syncAllVisualAssets} disabled={!visualAssets.length} className="shrink-0 h-9 rounded-xl bg-black px-3 text-[9px] font-bold text-white disabled:opacity-30">INSERIR TODOS</button></div>
    <div className="mt-3 grid grid-cols-2 gap-2">{visualAssets.map((asset) => { const active = scene?.spriteIds?.includes(asset.id); return <button type="button" key={asset.id} draggable onDragStart={(event) => dragAsset(event, asset.id)} onClick={() => active ? removeAssetFromScene(asset.id) : addAction(asset.id)} className={`rounded-xl border overflow-hidden text-left cursor-grab active:cursor-grabbing ${active ? 'ring-2 ring-black' : 'bg-white'}`}><div className="h-24 bg-neutral-100 flex items-center justify-center overflow-hidden">{asset.url ? <img src={asset.url} alt="" className="h-full w-full object-contain" /> : <Gamepad2 className="text-neutral-300" />}</div><div className="p-2 text-[9px] font-bold flex items-center justify-between gap-1"><span className="truncate">{active ? '✓ ' : ''}{asset.name}</span><Plus size={12} /></div><div className="px-2 pb-2 text-[8px] text-neutral-400 uppercase truncate">{asset.type}</div></button>; })}{!visualAssets.length && <div className="col-span-2 rounded-xl border border-dashed p-4 text-[10px] text-neutral-500">Crie personagens, imagens, desenhos ou grafismos no projeto. Eles aparecerão automaticamente aqui.</div>}</div>
  </div>;

  return <div className="studio-editor fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={(e) => e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
      <button type="button" onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={19} /></button>
      <div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[10px] font-mono text-neutral-500 uppercase">GDD · cenas · assets · blocos · playtest · produção</div></div>
      <button type="button" disabled={!canEdit} onClick={() => onSave({ ...draft, updatedAt: new Date().toISOString() })} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15} /> SALVAR</button>
    </header>

    <StudioWorkspace tools={<div>
      <div className="shrink-0 bg-white border-b p-2 flex gap-1.5 overflow-x-auto [scrollbar-width:thin]">
        {([['script','ROTEIRO'],['design','FASES'],['blocks','BLOCOS'],['production','PRODUÇÃO']] as Array<[StudioTab,string]>).map(([key,label]) => <button type="button" key={key} onClick={() => setTab(key)} className={`h-10 min-w-[92px] shrink-0 px-3 rounded-xl border text-[9px] font-bold whitespace-nowrap ${tab === key ? 'bg-black text-white border-black' : 'bg-white'}`}>{label}</button>)}
      </div>

      {tab === 'script' && <div className="p-4 space-y-4">
        <div className="rounded-2xl border bg-white p-4"><b className="flex items-center gap-2"><FileText size={16} /> Roteiro do GDD</b><p className="mt-1 text-[10px] text-neutral-500">Escreva a progressão e conecte atores/assets às ações da cena. A programação visual fica na aba BLOCOS.</p></div>
        <label className="block text-[9px] font-mono">ROTEIRO MACRO<textarea value={draft.gddScript || ''} onChange={(e) => setDraft({ ...draft, gddScript: e.target.value })} className="mt-1 min-h-36 w-full rounded-xl border p-3 text-sm" placeholder="Premissa → conflito → progressão → virada → conclusão..." /></label>
        <label className="block text-[9px] font-mono">CENA<select value={scene?.id || ''} onChange={(e) => { setSelectedSceneId(e.target.value); resetPreview(e.target.value); }} className="mt-1 h-11 w-full rounded-xl border px-3 bg-white">{draft.scenes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        {scene && <><label className="block text-[9px] font-mono">ROTEIRO DA CENA<textarea value={scene.script || ''} onChange={(e) => patchScene({ script: e.target.value })} className="mt-1 min-h-28 w-full rounded-xl border p-3 text-sm" /></label>{assetPicker}<div className="space-y-3">{(scene.actions || []).map((action, index) => { const asset = visualAssets.find((item) => item.id === action.spriteId); return <div key={action.id} className="rounded-2xl border bg-white p-3"><div className="flex items-center gap-2"><span className="h-6 w-6 rounded-full bg-black text-white text-[9px] flex items-center justify-center">{index + 1}</span><b className="min-w-0 flex-1 truncate text-xs">{asset?.name || 'Ator / elemento'}</b><button type="button" onClick={() => removeAction(action.id)} className="h-8 w-8 rounded-lg text-red-600 grid place-items-center"><Trash2 size={14} /></button></div><div className="mt-2 grid grid-cols-2 gap-2"><label className="text-[8px] font-mono">AÇÃO<select value={action.verb} onChange={(e) => patchAction(action.id, { verb: e.target.value as GameActionVerb })} className="mt-1 h-9 w-full rounded-lg border px-2 text-xs bg-white">{ACTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><label className="text-[8px] font-mono">DURAÇÃO<input type="number" min={100} step={100} value={action.durationMs || 700} onChange={(e) => patchAction(action.id, { durationMs: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2 text-xs" /></label></div>{action.verb === 'falar' && <input value={action.text || ''} onChange={(e) => patchAction(action.id, { text: e.target.value })} placeholder="Fala / balão" className="mt-2 h-9 w-full rounded-lg border px-2 text-xs" />}{action.verb === 'girar' && <input type="number" value={action.rotation || 0} onChange={(e) => patchAction(action.id, { rotation: Number(e.target.value) })} className="mt-2 h-9 w-full rounded-lg border px-2 text-xs" placeholder="Graus" />}{action.verb === 'redimensionar' && <input type="number" min={10} max={300} value={Math.round((action.scale || 1) * 100)} onChange={(e) => patchAction(action.id, { scale: Number(e.target.value) / 100 })} className="mt-2 h-9 w-full rounded-lg border px-2 text-xs" placeholder="Tamanho %" />}<div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[8px] font-mono">X · {Math.round(action.x ?? 50)}<input type="range" min={5} max={95} value={action.x ?? 50} onChange={(e) => patchAction(action.id, { x: Number(e.target.value) })} className="w-full" /></label><label className="text-[8px] font-mono">Y · {Math.round(action.y ?? 70)}<input type="range" min={20} max={92} value={action.y ?? 70} onChange={(e) => patchAction(action.id, { y: Number(e.target.value) })} className="w-full" /></label></div></div>; })}</div></>}
        <label className="block text-[9px] font-mono">MOTOR ALVO<select value={draft.previewEngine || 'local'} onChange={(e) => setDraft({ ...draft, previewEngine: e.target.value as GameDesignDocument['previewEngine'] })} className="mt-1 h-11 w-full rounded-xl border px-3 bg-white"><option value="local">Preview local / protótipo</option><option value="phaser">Phaser · jogo 2D web</option><option value="pixi">PixiJS · renderização 2D</option></select></label>
      </div>}

      {tab === 'design' && <div className="p-4 space-y-4">
        <div className="rounded-2xl bg-white border p-4"><div className="flex justify-between items-center"><b className="flex gap-2"><Gamepad2 size={16} /> Fases / cenas</b><button type="button" onClick={addScene} className="h-9 w-9 rounded-xl bg-black text-white grid place-items-center"><Plus size={15} /></button></div><div className="mt-3 space-y-2">{draft.scenes.map((item) => <button type="button" key={item.id} onClick={() => { setSelectedSceneId(item.id); resetPreview(item.id); }} className={`w-full rounded-xl border p-3 text-left ${scene?.id === item.id ? 'border-black bg-[#F3F2EE]' : ''}`}><div className="text-[9px] font-mono text-neutral-400">{SCENE_TYPES.find((type) => type.id === item.type)?.label}</div><b className="text-xs">{item.name}</b></button>)}</div></div>
        {scene && <div className="rounded-2xl border bg-white p-4 space-y-3"><label className="text-[9px] font-mono">NOME<input value={scene.name} onChange={(e) => patchScene({ name: e.target.value })} className="mt-1 h-10 w-full rounded-xl border px-3" /></label><label className="text-[9px] font-mono">TIPO<select value={scene.type} onChange={(e) => patchScene({ type: e.target.value as GameSceneType })} className="mt-1 h-10 w-full rounded-xl border px-3 bg-white">{SCENE_TYPES.map((type) => <option key={type.id} value={type.id}>{type.label}</option>)}</select></label><label className="block text-[9px] font-mono">OBJETIVO<textarea value={scene.objective} onChange={(e) => patchScene({ objective: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label><label className="block text-[9px] font-mono">FUNDO<input type="color" value={scene.background} onChange={(e) => patchScene({ background: e.target.value })} className="mt-1 h-10 w-full rounded-xl border p-1" /></label><div><div className="text-[9px] font-mono">MECÂNICAS</div><div className="mt-2 flex flex-wrap gap-1.5">{MECHANICS.map((mechanic) => <button type="button" key={mechanic} onClick={() => patchScene({ mechanics: scene.mechanics.includes(mechanic) ? scene.mechanics.filter((m) => m !== mechanic) : [...scene.mechanics, mechanic] })} className={`h-8 px-2 rounded-lg border text-[9px] ${scene.mechanics.includes(mechanic) ? 'bg-black text-white' : ''}`}>{mechanic}</button>)}</div></div></div>}
        {assetPicker}
        <div className="rounded-2xl border bg-white p-4"><label className="text-[9px] font-mono">GÊNERO / FORMATO<input value={draft.genre} onChange={(e) => setDraft({ ...draft, genre: e.target.value })} className="mt-1 h-11 w-full rounded-xl border px-3" /></label><label className="mt-3 block text-[9px] font-mono">CORE LOOP<textarea value={draft.coreLoop} onChange={(e) => setDraft({ ...draft, coreLoop: e.target.value })} className="mt-1 min-h-20 w-full rounded-xl border p-3" /></label><label className="mt-3 block text-[9px] font-mono">OBJETIVO DA PESSOA JOGADORA<textarea value={draft.playerGoal} onChange={(e) => setDraft({ ...draft, playerGoal: e.target.value })} className="mt-1 min-h-16 w-full rounded-xl border p-3" /></label></div>
      </div>}

      {tab === 'blocks' && <div className="p-4 space-y-4">
        <div className="rounded-2xl border-2 border-black bg-white p-4"><b className="flex items-center gap-2"><Gamepad2 size={16} /> Programação visual em blocos</b><p className="mt-1 text-[10px] leading-relaxed text-neutral-600">Monte o comportamento da cena por blocos: início, movimento, fala/visual, controle e dados. Clique ou arraste um bloco para o programa.</p><label className="mt-3 block text-[9px] font-mono">CENA<select value={scene?.id || ''} onChange={(e) => { setSelectedSceneId(e.target.value); resetPreview(e.target.value); }} className="mt-1 h-10 w-full rounded-xl border px-3 bg-white">{draft.scenes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div>
        <div className="rounded-2xl border bg-white p-3"><div className="text-[9px] font-mono text-neutral-500">BIBLIOTECA DE BLOCOS</div><div className="mt-2 grid grid-cols-2 gap-2">{BLOCKS.map((block) => { const c = BLOCK_CATEGORY[block.category]; return <button type="button" draggable key={block.kind} onDragStart={(e) => { e.dataTransfer.setData('application/x-5is-game-block', block.kind); e.dataTransfer.effectAllowed = 'copy'; }} onClick={() => addBlock(block.kind)} className="min-h-11 rounded-xl px-3 py-2 text-left text-[10px] font-bold shadow-sm" style={{ background: c.color, color: c.text }}><span className="block text-[7px] font-mono opacity-70">{c.label}</span>{block.label}</button>; })}</div></div>
        <div onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }} onDrop={dropBlock} className="rounded-2xl border-2 border-dashed border-neutral-400 bg-white/60 p-3 min-h-40"><div className="text-[9px] font-mono text-neutral-500">PROGRAMA DA CENA · ARRASTE AQUI</div><div className="mt-3 space-y-2">{(scene?.blocks || []).map((block, index) => { const meta = BLOCKS.find((b) => b.kind === block.kind)!; const c = BLOCK_CATEGORY[meta.category]; const needsActor = !['when-play','when-scene','broadcast','set-variable','change-variable','random'].includes(block.kind); return <div key={block.id} className="rounded-xl border bg-white overflow-hidden"><div className="flex items-center gap-2 px-3 py-2" style={{ background: c.color, color: c.text }}><span className="h-6 w-6 rounded-full bg-white/70 text-black grid place-items-center text-[9px] font-bold">{index + 1}</span><b className="min-w-0 flex-1 text-[10px]">{meta.label}</b><button type="button" onClick={() => moveBlock(block.id, -1)} className="h-7 w-7 grid place-items-center rounded-lg bg-white/60 text-black"><ChevronUp size={13}/></button><button type="button" onClick={() => moveBlock(block.id, 1)} className="h-7 w-7 grid place-items-center rounded-lg bg-white/60 text-black"><ChevronDown size={13}/></button><button type="button" onClick={() => removeBlock(block.id)} className="h-7 w-7 grid place-items-center rounded-lg bg-white/60 text-red-700"><Trash2 size={13}/></button></div><div className="p-3 grid grid-cols-2 gap-2">{needsActor && <label className="col-span-2 text-[8px] font-mono">ATOR / ELEMENTO<select value={block.actorId || ''} onChange={(e) => patchBlock(block.id, { actorId: e.target.value })} className="mt-1 h-9 w-full rounded-lg border px-2 bg-white"><option value="">Escolha…</option>{visualAssets.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}{block.kind === 'say' && <label className="col-span-2 text-[8px] font-mono">TEXTO<input value={block.text || ''} onChange={(e) => patchBlock(block.id, { text: e.target.value })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label>}{['move'].includes(block.kind) && <><label className="text-[8px] font-mono">X<input type="number" min={0} max={100} value={block.x ?? 50} onChange={(e) => patchBlock(block.id, { x: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label><label className="text-[8px] font-mono">Y<input type="number" min={0} max={100} value={block.y ?? 70} onChange={(e) => patchBlock(block.id, { y: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label></>}{block.kind === 'go-to' && <label className="col-span-2 text-[8px] font-mono">IR PARA<select value={block.targetActorId || ''} onChange={(e) => patchBlock(block.id, { targetActorId: e.target.value })} className="mt-1 h-9 w-full rounded-lg border px-2 bg-white"><option value="">Ator…</option>{visualAssets.filter(a => a.id !== block.actorId).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></label>}{block.kind === 'rotate' && <label className="col-span-2 text-[8px] font-mono">GRAUS<input type="number" value={block.value ?? 45} onChange={(e) => patchBlock(block.id, { value: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label>}{block.kind === 'set-size' && <label className="col-span-2 text-[8px] font-mono">TAMANHO %<input type="number" min={10} max={300} value={block.value ?? 100} onChange={(e) => patchBlock(block.id, { value: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label>}{block.kind === 'wait' && <label className="col-span-2 text-[8px] font-mono">SEGUNDOS<input type="number" min={.1} step={.1} value={Math.max(.1,(block.durationMs || 1000)/1000)} onChange={(e) => patchBlock(block.id, { durationMs: Number(e.target.value) * 1000 })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label>}{block.kind === 'repeat' && <label className="col-span-2 text-[8px] font-mono">VEZES<input type="number" min={2} max={12} value={block.repeat || 3} onChange={(e) => patchBlock(block.id, { repeat: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label>}{['broadcast','when-message'].includes(block.kind) && <label className="col-span-2 text-[8px] font-mono">MENSAGEM<input value={block.message || ''} onChange={(e) => patchBlock(block.id, { message: e.target.value })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label>}{['set-variable','change-variable'].includes(block.kind) && <><label className="text-[8px] font-mono">VARIÁVEL<input value={block.variable || ''} onChange={(e) => patchBlock(block.id, { variable: e.target.value })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label><label className="text-[8px] font-mono">VALOR<input type="number" value={block.value || 0} onChange={(e) => patchBlock(block.id, { value: Number(e.target.value) })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label></>}</div></div>; })}{!(scene?.blocks || []).length && <div className="rounded-xl bg-neutral-100 p-5 text-center text-[10px] text-neutral-500">Comece com <b>quando iniciar</b> e encaixe ações abaixo.</div>}</div></div>
      </div>}

      {tab === 'production' && <div className="p-4 space-y-4">
        <div className="rounded-3xl bg-[#111] text-white p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[10px] font-mono text-white/50">GAME DESIGN · PRODUÇÃO</div><input value={production.name} onChange={(e) => patchProduction({ name: e.target.value })} className="mt-1 bg-transparent text-2xl font-bold outline-none max-w-full" /><div className="mt-2 flex items-center gap-2 text-sm"><Clock3 size={16} /><b>{remainingText}</b></div></div>{!production.enabled ? <button type="button" onClick={startProduction} className="h-12 px-5 rounded-xl bg-white text-black font-bold text-xs">INICIAR · {production.durationHours}H</button> : <span className="rounded-full border border-white/20 px-3 py-2 text-[10px]">PRODUÇÃO ATIVA</span>}</div><div className="mt-4 grid grid-cols-1 gap-3"><label className="text-[9px] font-mono text-white/50">TEMA<input value={production.theme} onChange={(e) => patchProduction({ theme: e.target.value })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label><label className="text-[9px] font-mono text-white/50">DURAÇÃO (HORAS)<input type="number" value={production.durationHours} onChange={(e) => patchProduction({ durationHours: +e.target.value })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label><label className="text-[9px] font-mono text-white/50">PRAZO<input type="datetime-local" value={production.deadline ? new Date(production.deadline).toISOString().slice(0, 16) : ''} onChange={(e) => patchProduction({ deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })} className="mt-1 h-11 w-full rounded-xl bg-white text-black px-3" /></label></div></div>
        <div className="rounded-2xl bg-white border p-4"><div className="flex justify-between"><b className="flex gap-2"><Users size={16} /> Equipe e papéis</b><button type="button" onClick={() => patchProduction({ team: [...production.team, { id: id('member'), name: 'Pessoa', role: 'Design / código / arte' } as GameJamMember] })} className="h-9 w-9 rounded-lg bg-black text-white grid place-items-center"><Plus size={14} /></button></div>{production.team.map((member) => <div key={member.id} className="mt-2 flex gap-2"><input value={member.name} onChange={(e) => patchProduction({ team: production.team.map((item) => item.id === member.id ? { ...item, name: e.target.value } : item) })} className="h-10 min-w-0 flex-1 border rounded-lg px-2" /><input value={member.role} onChange={(e) => patchProduction({ team: production.team.map((item) => item.id === member.id ? { ...item, role: e.target.value } : item) })} className="h-10 min-w-0 flex-1 border rounded-lg px-2" /></div>)}</div>
        <div className="rounded-2xl bg-white border p-4"><b className="flex gap-2"><Sparkles size={16} /> Assets do projeto</b><div className="mt-3 grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">{availableAssets.map((asset) => { const active = production.assets.some((item) => item.nodeId === asset.id); return <button type="button" key={asset.id} onClick={() => toggleAsset(asset)} className={`rounded-xl border p-3 text-left ${active ? 'bg-black text-white' : ''}`}><div className="text-[9px] font-mono opacity-60">{asset.type}</div><b className="text-[10px] line-clamp-2">{asset.name}</b></button>; })}</div></div>
        <div className="rounded-2xl bg-white border p-4"><b>Checklist de produção</b><div className="mt-3 grid grid-cols-1 gap-2">{production.checklist.map((check) => <label key={check.id} className="flex gap-2 items-center rounded-xl border p-3 text-xs"><input type="checkbox" checked={check.done} onChange={(e) => patchProduction({ checklist: production.checklist.map((item) => item.id === check.id ? { ...item, done: e.target.checked } : item) })} /><input value={check.label} onChange={(e) => patchProduction({ checklist: production.checklist.map((item) => item.id === check.id ? { ...item, label: e.target.value } : item) })} className="min-w-0 flex-1" /></label>)}</div></div>
        <div className="rounded-2xl bg-white border p-4"><b className="flex gap-2"><Link2 size={16} /> Build e publicação</b><div className="mt-3 grid grid-cols-1 gap-3"><input value={production.buildUrl || ''} onChange={(e) => patchProduction({ buildUrl: e.target.value })} placeholder="URL do build jogável" className="h-11 rounded-xl border px-3" /><input value={production.submissionUrl || ''} onChange={(e) => patchProduction({ submissionUrl: e.target.value })} placeholder="URL de publicação" className="h-11 rounded-xl border px-3" /></div></div>
      </div>}
    </div>}>
      <section className="max-w-7xl mx-auto rounded-2xl bg-[#111] text-white p-4 sm:p-5 w-full">
        <div className="flex flex-wrap justify-between gap-3"><div><b className="flex gap-2"><Play size={16} /> Preview jogável</b><div className="text-[10px] text-white/50 mt-1">Ações manuais + programa em blocos são executados diretamente no navegador.</div></div><div className="flex gap-2"><button type="button" onClick={() => resetPreview(playScene?.id || draft.scenes[0]?.id || '')} className="h-10 w-10 bg-white text-black rounded-xl grid place-items-center"><RotateCcw size={15} /></button><button type="button" onClick={runPreview} className="h-10 px-4 bg-white text-black rounded-xl text-[10px] font-bold flex items-center gap-2">{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'PAUSAR' : 'RODAR'}</button></div></div>
        {playScene && <div className="mt-4 rounded-2xl overflow-hidden border border-white/20"><div className="h-9 bg-[#252525] border-b border-white/10 px-3 flex items-center gap-2 overflow-x-auto">{draft.scenes.map((item) => <button type="button" key={item.id} onClick={() => resetPreview(item.id)} className={`h-6 px-2 rounded-md text-[8px] shrink-0 ${playScene.id === item.id ? 'bg-white text-black' : 'bg-white/10'}`}>{item.name}</button>)}</div><div className="relative min-h-[360px] overflow-hidden" onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }} onDrop={(event) => dropAssetOnScene(event, playScene.id)} style={{ backgroundColor: playScene.background, backgroundImage: 'linear-gradient(rgba(255,255,255,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.12) 1px, transparent 1px)', backgroundSize: '32px 32px' }}><div className="absolute left-3 top-3 z-10 rounded-lg bg-black/60 px-3 py-2 text-left"><div className="text-[8px] font-mono opacity-60">{SCENE_TYPES.find((type) => type.id === playScene.type)?.label}</div><b className="text-sm">{playScene.name}</b><div className="text-[9px] opacity-65 max-w-64">{playScene.objective}</div></div>{visualAssets.filter((asset) => playScene.spriteIds?.includes(asset.id)).map(renderActor)}{!playScene.spriteIds?.length && <div className="absolute inset-0 flex items-center justify-center text-center p-6"><div><Gamepad2 className="mx-auto opacity-25" size={48} /><div className="mt-2 text-sm opacity-50">Insira personagens ou elementos gráficos com um toque.</div><div className="mt-1 text-[9px] opacity-35">Também dá para arrastar qualquer asset visual da coluna de ferramentas para a cena.</div></div></div>}<div className="absolute left-3 right-3 bottom-3 rounded-xl bg-black/70 p-3 backdrop-blur-sm"><div className="text-[8px] font-mono opacity-50">EVENTO {Math.max(0, playActionIndex + 1)} / {playActions.length}</div><div className="mt-1 min-h-5 text-xs">{currentAction ? `${visualAssets.find((a) => a.id === currentAction.spriteId)?.name || 'Ator'} · ${ACTIONS.find((a) => a.id === currentAction.verb)?.label || currentAction.verb}${currentAction.text ? ` — ${currentAction.text}` : ''}` : 'Pronto para iniciar a sequência.'}</div></div></div><div className="bg-[#1D1D1D] p-3 flex items-center justify-between gap-3"><div className="text-[9px] text-white/50 truncate">{playScene.script || 'Sem roteiro de cena.'}</div>{playScene.nextSceneId && <button type="button" onClick={nextScene} className="h-9 px-3 rounded-xl border border-white/30 text-[9px] shrink-0">PRÓXIMA CENA</button>}</div></div>}
      </section>
    </StudioWorkspace>
  </div>;
}
