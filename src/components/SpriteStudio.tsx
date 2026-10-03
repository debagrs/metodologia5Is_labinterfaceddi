import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, ArrowRight, Copy, ImagePlus, Pause, Play, Plus, Save, Trash2, Upload, User, X } from 'lucide-react';
import { CharacterSpriteDocument, SpriteAnimation, SpriteAnimationKind, SpriteFrame, SpriteMotionPreset } from '../types';
import { ensureTursoSession } from '../lib/turso';

export interface SpriteAssetOption {
  id: string;
  name: string;
  url: string;
  source: 'project' | 'upload';
}

interface Props {
  document: CharacterSpriteDocument;
  title?: string;
  canEdit?: boolean;
  availableAssets?: SpriteAssetOption[];
  onSave: (document: CharacterSpriteDocument) => void;
  onClose: () => void;
}

const makeId = (prefix = 'sprite') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const KINDS: Array<{ id: SpriteAnimationKind; label: string }> = [
  { id: 'idle', label: 'Idle' },
  { id: 'walk', label: 'Andar' },
  { id: 'run', label: 'Correr' },
  { id: 'jump', label: 'Pular' },
  { id: 'attack', label: 'Ação' },
  { id: 'hurt', label: 'Reação' },
  { id: 'custom', label: 'Custom' },
];
const MOTIONS: Array<{ id: SpriteMotionPreset; label: string }> = [
  { id: 'none', label: 'Sem movimento extra' },
  { id: 'bob', label: 'Flutuar' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'shake', label: 'Tremer' },
  { id: 'pulse', label: 'Pulsar' },
  { id: 'squash', label: 'Squash & stretch' },
];

const blankAnimation = (kind: SpriteAnimationKind = 'idle'): SpriteAnimation => ({
  id: makeId('anim'),
  name: kind === 'custom' ? 'Animação' : KINDS.find((item) => item.id === kind)?.label || 'Animação',
  kind,
  fps: 8,
  loop: true,
  motion: kind === 'idle' ? 'bob' : 'none',
  frames: [],
});

export const blankSpriteCharacter = (): CharacterSpriteDocument => {
  const idle = blankAnimation('idle');
  return {
    title: 'Personagem do projeto',
    characterName: 'Personagem',
    description: '',
    width: 128,
    height: 128,
    background: '#F4F4F2',
    pixelated: false,
    animations: [idle],
    activeAnimationId: idle.id,
    palette: [],
  };
};

function getMotionProps(preset: SpriteMotionPreset): any {
  switch (preset) {
    case 'bob': return { animate: { y: [0, -8, 0] }, transition: { duration: 1.6, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'bounce': return { animate: { y: [0, -18, 0], scaleY: [1, 0.94, 1] }, transition: { duration: 0.8, repeat: Infinity, ease: 'easeOut' as const } };
    case 'shake': return { animate: { x: [0, -5, 5, -3, 3, 0] }, transition: { duration: 0.45, repeat: Infinity, repeatDelay: 0.7 } };
    case 'pulse': return { animate: { scale: [1, 1.06, 1] }, transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' as const } };
    case 'squash': return { animate: { scaleX: [1, 1.08, 0.96, 1], scaleY: [1, 0.92, 1.06, 1] }, transition: { duration: 0.75, repeat: Infinity, repeatDelay: 0.35 } };
    default: return { animate: {}, transition: {} };
  }
}

export function SpriteCharacterPreview({ document, className = '' }: { document: CharacterSpriteDocument; className?: string }) {
  const animation = document.animations.find((item) => item.id === document.activeAnimationId) || document.animations[0];
  const frame = animation?.frames?.[0];
  return <div className={`relative overflow-hidden flex items-center justify-center ${className}`} style={{ background: document.background || '#F4F4F2' }}>
    {frame?.url ? <img src={frame.url} alt="" className="max-w-[78%] max-h-[78%] object-contain" style={{ imageRendering: document.pixelated ? 'pixelated' : 'auto' }} /> : <User size={42} className="opacity-25" />}
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-3 text-white">
      <b className="text-xs">{document.characterName || document.title}</b>
      <div className="text-[9px] opacity-70">{document.animations.length} animações · {animation?.frames?.length || 0} frames</div>
    </div>
  </div>;
}

export default function SpriteStudio({ document, title = 'Personagem & Sprites', canEdit = true, availableAssets = [], onSave, onClose }: Props) {
  const initial = JSON.parse(JSON.stringify(document)) as CharacterSpriteDocument;
  initial.animations ||= [blankAnimation('idle')];
  if (!initial.activeAnimationId) initial.activeAnimationId = initial.animations[0]?.id;
  const [draft, setDraft] = useState(initial);
  const [selectedAnimationId, setSelectedAnimationId] = useState(initial.activeAnimationId || initial.animations[0]?.id || '');
  const [playing, setPlaying] = useState(true);
  const [frameIndex, setFrameIndex] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const animation = useMemo(() => draft.animations.find((item) => item.id === selectedAnimationId) || draft.animations[0], [draft.animations, selectedAnimationId]);
  const currentFrame = animation?.frames?.[Math.min(frameIndex, Math.max(0, (animation.frames?.length || 1) - 1))];

  useEffect(() => { setFrameIndex(0); }, [selectedAnimationId, animation?.frames?.length]);
  useEffect(() => {
    if (!playing || !animation?.frames?.length || animation.frames.length < 2) return;
    const frame = animation.frames[frameIndex % animation.frames.length];
    const fallback = Math.max(50, Math.round(1000 / Math.max(1, animation.fps || 8)));
    const timeout = window.setTimeout(() => {
      setFrameIndex((index) => {
        const next = index + 1;
        if (next >= animation.frames.length) return animation.loop ? 0 : index;
        return next;
      });
    }, frame?.durationMs || fallback);
    return () => window.clearTimeout(timeout);
  }, [playing, animation, frameIndex]);

  const patchAnimation = (patch: Partial<SpriteAnimation>) => setDraft((current) => ({
    ...current,
    animations: current.animations.map((item) => item.id === animation?.id ? { ...item, ...patch } : item),
  }));

  const addAnimation = (kind: SpriteAnimationKind) => {
    const next = blankAnimation(kind);
    setDraft((current) => ({ ...current, animations: [...current.animations, next], activeAnimationId: next.id }));
    setSelectedAnimationId(next.id);
  };

  const addFrame = (asset: SpriteAssetOption) => {
    if (!animation) return;
    const frame: SpriteFrame = { id: makeId('frame'), name: asset.name, url: asset.url, sourceNodeId: asset.source === 'project' ? asset.id : undefined, durationMs: Math.max(50, Math.round(1000 / Math.max(1, animation.fps || 8))) };
    patchAnimation({ frames: [...animation.frames, frame] });
  };

  const uploadFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (!list.length) return setError('Escolha imagens para os frames do sprite.');
    setUploading(true); setError('');
    try {
      const session = await ensureTursoSession().catch(() => null);
      for (const file of list) {
        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': file.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(file.name),
            ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
          },
          body: file,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.url) throw new Error(data.error || `Falha ao enviar ${file.name}.`);
        addFrame({ id: makeId('upload'), name: file.name, url: data.url, source: 'upload' });
      }
    } catch (e: any) { setError(e?.message || 'Falha ao enviar os frames.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const patchFrame = (frameId: string, patch: Partial<SpriteFrame>) => {
    if (!animation) return;
    patchAnimation({ frames: animation.frames.map((item) => item.id === frameId ? { ...item, ...patch } : item) });
  };
  const removeFrame = (frameId: string) => animation && patchAnimation({ frames: animation.frames.filter((item) => item.id !== frameId) });
  const moveFrame = (frameId: string, dir: -1 | 1) => {
    if (!animation) return;
    const frames = [...animation.frames]; const index = frames.findIndex((item) => item.id === frameId); const target = index + dir;
    if (index < 0 || target < 0 || target >= frames.length) return;
    [frames[index], frames[target]] = [frames[target], frames[index]]; patchAnimation({ frames });
  };
  const duplicateFrame = (frame: SpriteFrame) => animation && patchAnimation({ frames: [...animation.frames, { ...frame, id: makeId('frame'), name: `${frame.name} cópia` }] });
  const deleteAnimation = () => {
    if (!animation || draft.animations.length <= 1) return;
    const animations = draft.animations.filter((item) => item.id !== animation.id);
    setDraft((current) => ({ ...current, animations, activeAnimationId: animations[0]?.id }));
    setSelectedAnimationId(animations[0]?.id || '');
  };

  const motionProps = getMotionProps(animation?.motion || 'none');
  return <div className="fixed inset-0 z-[128] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={(e) => e.stopPropagation()}>
    <header className="shrink-0 min-h-16 bg-white border-b px-3 sm:px-5 flex items-center gap-3" style={{ paddingTop: 'max(.35rem, env(safe-area-inset-top))' }}>
      <button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={19} /></button>
      <div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[10px] font-mono text-neutral-500 uppercase">personagem · sprites · estados · animações locais</div></div>
      <button disabled={!canEdit} onClick={() => onSave({ ...draft, activeAnimationId: selectedAnimationId, updatedAt: new Date().toISOString() })} className="h-11 px-4 rounded-xl bg-black text-white text-xs font-bold flex gap-2 items-center disabled:opacity-40"><Save size={15} /> SALVAR</button>
    </header>

    <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[430px_minmax(0,1fr)] overflow-y-auto xl:overflow-hidden">
      <section className="bg-white border-r p-4 space-y-5 xl:overflow-y-auto">
        <div className="rounded-2xl border p-4 space-y-3">
          <b className="text-sm">Personagem</b>
          <label className="block text-[9px] font-mono text-neutral-500">NOME<input value={draft.characterName} onChange={(e) => setDraft({ ...draft, characterName: e.target.value, title: e.target.value || draft.title })} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm" /></label>
          <label className="block text-[9px] font-mono text-neutral-500">DESCRIÇÃO<textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="mt-1 min-h-16 w-full rounded-xl border p-3 text-sm" placeholder="Quem é, como se move, papel no jogo..." /></label>
          <div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono text-neutral-500">LARGURA<input type="number" min={16} max={1024} value={draft.width} onChange={(e) => setDraft({ ...draft, width: +e.target.value })} className="mt-1 h-10 w-full rounded-xl border px-2" /></label><label className="text-[9px] font-mono text-neutral-500">ALTURA<input type="number" min={16} max={1024} value={draft.height} onChange={(e) => setDraft({ ...draft, height: +e.target.value })} className="mt-1 h-10 w-full rounded-xl border px-2" /></label></div>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={draft.pixelated} onChange={(e) => setDraft({ ...draft, pixelated: e.target.checked })} /> Pixel art / bordas nítidas</label>
        </div>

        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between gap-2"><div><b className="text-sm">Estados / animações</b><div className="text-[10px] text-neutral-500">Crie idle, andar, correr, pular, ação e reações.</div></div><select onChange={(e) => { if (e.target.value) addAnimation(e.target.value as SpriteAnimationKind); e.currentTarget.value = ''; }} defaultValue="" className="h-9 rounded-xl border px-2 text-[9px]"><option value="" disabled>+ ANIMAÇÃO</option>{KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">{draft.animations.map((item) => <button key={item.id} onClick={() => { setSelectedAnimationId(item.id); setDraft((current) => ({ ...current, activeAnimationId: item.id })); }} className={`shrink-0 h-10 px-3 rounded-xl border text-[10px] font-bold ${item.id === selectedAnimationId ? 'bg-black text-white border-black' : 'bg-white'}`}>{item.name}</button>)}</div>
          {animation && <div className="mt-3 space-y-3">
            <div className="flex gap-2"><input value={animation.name} onChange={(e) => patchAnimation({ name: e.target.value })} className="h-10 min-w-0 flex-1 rounded-xl border px-3 font-bold text-sm" /><button disabled={draft.animations.length <= 1} onClick={deleteAnimation} className="h-10 w-10 rounded-xl border border-red-200 text-red-600 flex items-center justify-center disabled:opacity-30"><Trash2 size={15} /></button></div>
            <div className="grid grid-cols-3 gap-2"><label className="text-[9px] font-mono text-neutral-500">FPS<input type="number" min={1} max={30} value={animation.fps} onChange={(e) => patchAnimation({ fps: Math.max(1, Math.min(30, +e.target.value || 1)) })} className="mt-1 h-9 w-full rounded-lg border px-2" /></label><label className="text-[9px] font-mono text-neutral-500">LOOP<select value={animation.loop ? 'yes' : 'no'} onChange={(e) => patchAnimation({ loop: e.target.value === 'yes' })} className="mt-1 h-9 w-full rounded-lg border px-2"><option value="yes">Sim</option><option value="no">Não</option></select></label><label className="text-[9px] font-mono text-neutral-500">MOVIMENTO<select value={animation.motion} onChange={(e) => patchAnimation({ motion: e.target.value as SpriteMotionPreset })} className="mt-1 h-9 w-full rounded-lg border px-2">{MOTIONS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label></div>
          </div>}
        </div>

        <div className="rounded-2xl border p-4">
          <div className="flex items-center justify-between"><div><b className="text-sm">Frames</b><div className="text-[10px] text-neutral-500">Cada imagem vira um quadro da animação.</div></div><button onClick={() => fileRef.current?.click()} className="h-9 px-3 rounded-xl bg-black text-white text-[9px] font-bold flex items-center gap-1"><Upload size={13} /> UPLOAD</button></div>
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { if (e.target.files) void uploadFiles(e.target.files); }} />
          <div className="mt-3 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">{availableAssets.map((asset) => <button key={asset.id} onClick={() => addFrame(asset)} className="rounded-xl border overflow-hidden text-left"><div className="aspect-square bg-neutral-100 overflow-hidden"><img src={asset.url} alt="" className="w-full h-full object-contain" /></div><div className="p-2 text-[9px] font-bold truncate flex items-center gap-1"><Plus size={11} /> {asset.name}</div></button>)}</div>
          {uploading && <div className="mt-2 text-[10px] text-neutral-500">Enviando frames...</div>}
          {error && <div className="mt-2 rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</div>}
        </div>

        {animation && <div className="rounded-2xl border p-4"><b className="text-sm">Timeline de frames</b><div className="mt-3 space-y-2">{animation.frames.map((frame, index) => <div key={frame.id} className="rounded-xl border p-2 flex items-center gap-2"><div className="h-14 w-14 rounded-lg bg-neutral-100 overflow-hidden"><img src={frame.url} alt="" className="w-full h-full object-contain" /></div><div className="min-w-0 flex-1"><div className="text-[9px] font-bold truncate">{index + 1}. {frame.name}</div><label className="text-[8px] font-mono text-neutral-500">DURAÇÃO MS<input type="number" min={30} max={5000} value={frame.durationMs || 125} onChange={(e) => patchFrame(frame.id, { durationMs: +e.target.value })} className="ml-2 h-7 w-20 rounded border px-1" /></label></div><div className="grid grid-cols-2 gap-1"><button onClick={() => moveFrame(frame.id, -1)} className="h-7 w-7 rounded border flex items-center justify-center"><ArrowLeft size={12} /></button><button onClick={() => moveFrame(frame.id, 1)} className="h-7 w-7 rounded border flex items-center justify-center"><ArrowRight size={12} /></button><button onClick={() => duplicateFrame(frame)} className="h-7 w-7 rounded border flex items-center justify-center"><Copy size={12} /></button><button onClick={() => removeFrame(frame.id)} className="h-7 w-7 rounded border border-red-200 text-red-600 flex items-center justify-center"><Trash2 size={12} /></button></div></div>)}{!animation.frames.length && <div className="rounded-xl border border-dashed p-4 text-center text-[10px] text-neutral-400">Adicione imagens do projeto ou faça upload de frames.</div>}</div></div>}
      </section>

      <section className="min-h-[58vh] xl:min-h-0 overflow-auto p-5 sm:p-8 flex flex-col items-center justify-start gap-5">
        <div className="w-full max-w-3xl flex items-center justify-between gap-3"><div><div className="text-[9px] font-mono text-neutral-500 uppercase">Prévia da animação</div><b className="text-xl">{draft.characterName}</b></div><button onClick={() => setPlaying((value) => !value)} className="h-10 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-[10px] font-bold">{playing ? <Pause size={14} /> : <Play size={14} />}{playing ? 'PAUSAR' : 'REPRODUZIR'}</button></div>
        <div className="w-full max-w-3xl rounded-3xl border bg-white min-h-[420px] flex items-center justify-center p-8" style={{ background: draft.background || '#F4F4F2' }}>
          <motion.div {...motionProps} className="flex items-center justify-center" style={{ width: Math.min(420, draft.width * 2), height: Math.min(420, draft.height * 2) }}>
            {currentFrame?.url ? <img src={currentFrame.url} alt={draft.characterName} className="max-w-full max-h-full object-contain" style={{ imageRendering: draft.pixelated ? 'pixelated' : 'auto' }} /> : <div className="text-center text-neutral-400"><ImagePlus size={52} className="mx-auto" /><div className="mt-3 text-sm">Adicione frames para ver a animação.</div></div>}
          </motion.div>
        </div>
        {animation && <div className="w-full max-w-3xl rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-center gap-2"><span className="text-[9px] font-mono text-neutral-500">ESTADO</span><b className="text-sm">{animation.name}</b><span className="text-[9px] text-neutral-400">· {animation.frames.length} frames · {animation.fps} fps · {animation.loop ? 'loop' : '1x'}</span></div><div className="mt-2 flex gap-1 overflow-x-auto">{animation.frames.map((frame, index) => <button key={frame.id} onClick={() => { setFrameIndex(index); setPlaying(false); }} className={`shrink-0 h-12 w-12 rounded-lg border overflow-hidden ${index === frameIndex ? 'ring-2 ring-black' : ''}`}><img src={frame.url} alt="" className="w-full h-full object-contain" /></button>)}</div></div>}
      </section>
    </main>
  </div>;
}
