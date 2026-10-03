// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft, ArrowRight, Copy, Download, ImagePlus, Info, Loader2, Pause, Play,
  Plus, RotateCcw, Save, Sparkles, Trash2, Upload, WandSparkles, X
} from 'lucide-react';
import {
  CharacterAppearance, CharacterExpression, CharacterPoseKind, CharacterProfile,
  CharacterSpriteDocument, CharacterView, SpriteAnimation, SpriteAnimationKind,
  SpriteFrame, SpriteMotionPreset
} from '../types';
import VoiceDictationButton from './VoiceDictationButton';
import { ensureTursoSession } from '../lib/turso';

export interface SpriteAssetOption { id: string; name: string; url: string; source: 'project' | 'upload'; }
interface Props {
  document: CharacterSpriteDocument;
  availableAssets?: SpriteAssetOption[];
  title?: string;
  canEdit?: boolean;
  onSave: (document: CharacterSpriteDocument) => void;
  onClose: () => void;
}

const uid = (prefix = 'id') => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const KINDS: Array<{ id: SpriteAnimationKind; label: string }> = [
  { id: 'idle', label: 'Idle' }, { id: 'walk', label: 'Andar' }, { id: 'run', label: 'Correr' },
  { id: 'jump', label: 'Pular' }, { id: 'attack', label: 'Ação' }, { id: 'hurt', label: 'Reação' }, { id: 'custom', label: 'Custom' }
];
const MOTIONS: Array<{ id: SpriteMotionPreset; label: string }> = [
  { id: 'none', label: 'Sem movimento extra' }, { id: 'bob', label: 'Flutuar' }, { id: 'bounce', label: 'Bounce' },
  { id: 'shake', label: 'Tremer' }, { id: 'pulse', label: 'Pulsar' }, { id: 'squash', label: 'Squash & stretch' }
];
const VIEWS: Array<{id:CharacterView;label:string}> = [
  {id:'front',label:'Frente'},{id:'three-quarter',label:'3/4'},{id:'side',label:'Lateral'},{id:'back',label:'Costas'}
];
const EXPRESSIONS: Array<{id:CharacterExpression;label:string}> = [
  {id:'neutral',label:'Neutro'},{id:'happy',label:'Feliz'},{id:'sad',label:'Triste'},
  {id:'angry',label:'Bravo'},{id:'surprised',label:'Surpreso'},{id:'determined',label:'Determinado'}
];
const POSES: Array<{id:CharacterPoseKind;label:string}> = [
  {id:'neutral',label:'Neutra'},{id:'wave',label:'Acenando'},{id:'walk',label:'Andando'},
  {id:'run',label:'Correndo'},{id:'jump',label:'Pulando'},{id:'sit',label:'Sentado'},{id:'action',label:'Ação'}
];

const DEFAULT_APPEARANCE: CharacterAppearance = {
  headShape:'oval', faceShape:'soft', eyeStyle:'round', browStyle:'soft', noseStyle:'small', mouthStyle:'line',
  earStyle:'simple', hairStyle:'short', bodyShape:'average', torsoShape:'trapezoid', armStyle:'regular', legStyle:'regular',
  handStyle:'simple', outfitStyle:'basic', accessory:'none', headToBodyRatio:6, shoulderWidth:1, limbLength:1, bodyWidth:1,
  skinColor:'#D9A47E', hairColor:'#222222', eyeColor:'#111111', outfitPrimary:'#4DDBD2', outfitSecondary:'#111111', lineColor:'#111111'
};
const DEFAULT_PROFILE: CharacterProfile = {
  role:'', ageBand:'', personality:'', motivation:'', backstory:'', keywords:[], silhouetteIntent:'',
  shapeLanguageRationale:'', proportionRationale:'', colorRationale:'', costumeRationale:''
};

export const blankSpriteCharacter = (): CharacterSpriteDocument => {
  const animation: SpriteAnimation = { id: uid('anim'), name: 'Idle', kind: 'idle', fps: 8, loop: true, motion: 'bob', frames: [] };
  return {
    title:'Personagem', characterName:'Novo personagem', description:'', width:256, height:384, background:'#F4F4F2', pixelated:false,
    appearance:{...DEFAULT_APPEARANCE}, profile:{...DEFAULT_PROFILE}, animations:[animation], activeAnimationId:animation.id,
    poses:POSES.slice(0,4).map(p=>({id:uid('pose'),name:p.label,kind:p.id})), expressions:EXPRESSIONS.map(e=>e.id),
    activeView:'front', activeExpression:'neutral', activePose:'neutral', palette:['#4DDBD2','#111111','#D9A47E','#FFFFFF'], generatedNotes:[]
  };
};

const esc = (value:any) => String(value ?? '').replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m] || m));
const hex = (v:string, fallback='#111111') => /^#[0-9a-f]{6}$/i.test(String(v||'')) ? v : fallback;

function headPath(shape: CharacterAppearance['headShape'], cx:number, cy:number, w:number, h:number) {
  if (shape === 'square') return `<rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="${w*.18}"/>`;
  if (shape === 'heart') return `<path d="M ${cx} ${cy+h*.48} C ${cx-w*.58} ${cy+h*.12}, ${cx-w*.58} ${cy-h*.36}, ${cx-w*.20} ${cy-h*.43} C ${cx} ${cy-h*.5}, ${cx} ${cy-h*.25}, ${cx} ${cy-h*.18} C ${cx} ${cy-h*.25}, ${cx} ${cy-h*.5}, ${cx+w*.2} ${cy-h*.43} C ${cx+w*.58} ${cy-h*.36}, ${cx+w*.58} ${cy+h*.12}, ${cx} ${cy+h*.48} Z"/>`;
  if (shape === 'triangle') return `<path d="M ${cx} ${cy+h*.5} Q ${cx-w*.52} ${cy+h*.12} ${cx-w*.42} ${cy-h*.3} Q ${cx} ${cy-h*.62} ${cx+w*.42} ${cy-h*.3} Q ${cx+w*.52} ${cy+h*.12} ${cx} ${cy+h*.5} Z"/>`;
  const rx = shape === 'wide' ? w*.55 : shape === 'round' ? w*.48 : w*.43;
  const ry = shape === 'round' ? h*.46 : h*.52;
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/>`;
}

function eyeSvg(style:CharacterAppearance['eyeStyle'], x:number, y:number, color:string, scale=1) {
  if (style === 'dot') return `<circle cx="${x}" cy="${y}" r="${2.8*scale}" fill="${color}"/>`;
  if (style === 'narrow') return `<path d="M ${x-9*scale} ${y} Q ${x} ${y+3*scale} ${x+9*scale} ${y}" fill="none" stroke="${color}" stroke-width="${2.5*scale}" stroke-linecap="round"/>`;
  if (style === 'almond') return `<path d="M ${x-9*scale} ${y} Q ${x} ${y-7*scale} ${x+9*scale} ${y} Q ${x} ${y+7*scale} ${x-9*scale} ${y} Z" fill="#fff" stroke="${color}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${3.4*scale}" fill="${color}"/>`;
  const r = style === 'large' ? 7 : 5;
  return `<circle cx="${x}" cy="${y}" r="${r*scale}" fill="#fff" stroke="${color}" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="${Math.max(2,r*.45)*scale}" fill="${color}"/>`;
}

function expressionMouth(expression:CharacterExpression, mouthStyle:CharacterAppearance['mouthStyle'], cx:number, y:number, line:string) {
  if (expression === 'happy' || mouthStyle === 'smile') return `<path d="M ${cx-12} ${y-2} Q ${cx} ${y+13} ${cx+12} ${y-2}" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round"/>`;
  if (expression === 'sad') return `<path d="M ${cx-12} ${y+7} Q ${cx} ${y-7} ${cx+12} ${y+7}" fill="none" stroke="${line}" stroke-width="3" stroke-linecap="round"/>`;
  if (expression === 'surprised') return `<ellipse cx="${cx}" cy="${y+2}" rx="6" ry="9" fill="none" stroke="${line}" stroke-width="2.5"/>`;
  if (mouthStyle === 'full') return `<path d="M ${cx-12} ${y} Q ${cx} ${y-6} ${cx+12} ${y} Q ${cx} ${y+9} ${cx-12} ${y} Z" fill="#C76070" stroke="${line}" stroke-width="1.5"/>`;
  if (mouthStyle === 'small') return `<path d="M ${cx-6} ${y} Q ${cx} ${y+3} ${cx+6} ${y}" fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round"/>`;
  return `<path d="M ${cx-10} ${y} L ${cx+10} ${y}" stroke="${line}" stroke-width="2.5" stroke-linecap="round"/>`;
}

function hairSvg(style:CharacterAppearance['hairStyle'], cx:number, cy:number, w:number, h:number, color:string) {
  if (style === 'none') return '';
  if (style === 'bun') return `<circle cx="${cx+w*.28}" cy="${cy-h*.48}" r="${w*.19}" fill="${color}"/><path d="M ${cx-w*.42} ${cy-h*.24} Q ${cx} ${cy-h*.62} ${cx+w*.42} ${cy-h*.24} L ${cx+w*.34} ${cy-h*.42} Q ${cx} ${cy-h*.7} ${cx-w*.34} ${cy-h*.42} Z" fill="${color}"/>`;
  if (style === 'spiky') return `<path d="M ${cx-w*.48} ${cy-h*.16} L ${cx-w*.38} ${cy-h*.58} L ${cx-w*.16} ${cy-h*.43} L ${cx} ${cy-h*.7} L ${cx+w*.14} ${cy-h*.44} L ${cx+w*.38} ${cy-h*.62} L ${cx+w*.48} ${cy-h*.12} Q ${cx} ${cy-h*.48} ${cx-w*.48} ${cy-h*.16} Z" fill="${color}"/>`;
  if (style === 'long') return `<path d="M ${cx-w*.48} ${cy-h*.18} Q ${cx} ${cy-h*.68} ${cx+w*.48} ${cy-h*.18} L ${cx+w*.48} ${cy+h*.62} Q ${cx+w*.2} ${cy+h*.3} ${cx} ${cy+h*.52} Q ${cx-w*.2} ${cy+h*.3} ${cx-w*.48} ${cy+h*.62} Z" fill="${color}" opacity=".95"/>`;
  if (style === 'curly') return Array.from({length:7}).map((_,i)=>`<circle cx="${cx-w*.38+i*w*.125}" cy="${cy-h*.38+(i%2)*6}" r="${w*.16}" fill="${color}"/>`).join('');
  if (style === 'bob') return `<path d="M ${cx-w*.48} ${cy-h*.18} Q ${cx} ${cy-h*.62} ${cx+w*.48} ${cy-h*.18} L ${cx+w*.4} ${cy+h*.28} Q ${cx} ${cy+h*.05} ${cx-w*.4} ${cy+h*.28} Z" fill="${color}"/>`;
  return `<path d="M ${cx-w*.46} ${cy-h*.18} Q ${cx} ${cy-h*.62} ${cx+w*.46} ${cy-h*.18} Q ${cx+w*.2} ${cy-h*.32} ${cx} ${cy-h*.16} Q ${cx-w*.18} ${cy-h*.34} ${cx-w*.46} ${cy-h*.18} Z" fill="${color}"/>`;
}

function poseAngles(pose:CharacterPoseKind, phase=0) {
  const flip = phase % 2 === 0 ? 1 : -1;
  if (pose === 'wave') return {la:-18,ra:-125,ll:4,rl:-4, body:0, y:0};
  if (pose === 'walk') return {la:18*flip,ra:-18*flip,ll:-22*flip,rl:22*flip,body:0,y:0};
  if (pose === 'run') return {la:38*flip,ra:-38*flip,ll:-42*flip,rl:42*flip,body:-8*flip,y:-4};
  if (pose === 'jump') return {la:-55,ra:55,ll:28,rl:-28,body:0,y:-20};
  if (pose === 'sit') return {la:5,ra:-5,ll:70,rl:-70,body:0,y:42};
  if (pose === 'action') return {la:-70,ra:35,ll:-18,rl:24,body:-10,y:0};
  return {la:5,ra:-5,ll:2,rl:-2,body:0,y:0};
}

export function buildCharacterSvg(document: CharacterSpriteDocument, view: CharacterView = 'front', expression: CharacterExpression = 'neutral', pose: CharacterPoseKind = 'neutral', phase = 0) {
  const a = {...DEFAULT_APPEARANCE, ...(document.appearance || {})};
  const line = hex(a.lineColor); const skin=hex(a.skinColor,'#D9A47E'); const primary=hex(a.outfitPrimary,'#4DDBD2'); const secondary=hex(a.outfitSecondary,'#111111');
  const ratio = Math.max(2.5, Math.min(8.5, Number(a.headToBodyRatio)||6));
  const headH = 430 / ratio; const headW = headH * (a.headShape==='wide'?1.25:a.headShape==='square'?1.05:.92);
  const headY = 65 + headH/2; const bodyTop = headY + headH*.52; const legBottom = 485;
  const torsoH = Math.max(90, (legBottom-bodyTop)*.44); const torsoWBase = 78 * (Number(a.bodyWidth)||1) * (a.bodyShape==='stocky'?1.28:a.bodyShape==='slim'?.78:a.bodyShape==='chibi'?1.12:1);
  const shoulder = torsoWBase * (1.05*(Number(a.shoulderWidth)||1)); const limb = Number(a.limbLength)||1;
  const sideFactor = view==='side' ? .56 : view==='three-quarter' ? .82 : 1;
  const faceVisible = view !== 'back'; const angles = poseAngles(pose, phase);
  const cx=180; const torsoY=bodyTop+torsoH/2+angles.y;
  const armLen=105*limb, legLen=Math.max(100,(legBottom-(bodyTop+torsoH))*.9)*limb;
  const limbStroke = a.armStyle==='strong'?18:a.armStyle==='thin'?10:14;
  const legStroke = a.legStyle==='long'?16:18;
  const torsoPath = a.torsoShape==='round'
    ? `<rect x="${cx-torsoWBase*.52}" y="${bodyTop}" width="${torsoWBase*1.04}" height="${torsoH}" rx="${torsoWBase*.46}"/>`
    : a.torsoShape==='triangle'
      ? `<path d="M ${cx-shoulder/2} ${bodyTop} L ${cx+shoulder/2} ${bodyTop} L ${cx+torsoWBase*.34} ${bodyTop+torsoH} L ${cx-torsoWBase*.34} ${bodyTop+torsoH} Z"/>`
      : a.torsoShape==='rectangle'
        ? `<rect x="${cx-torsoWBase/2}" y="${bodyTop}" width="${torsoWBase}" height="${torsoH}" rx="16"/>`
        : `<path d="M ${cx-shoulder/2} ${bodyTop} L ${cx+shoulder/2} ${bodyTop} L ${cx+torsoWBase*.56} ${bodyTop+torsoH} L ${cx-torsoWBase*.56} ${bodyTop+torsoH} Z"/>`;
  const arm = (side:number,angle:number) => {
    const sx=cx+side*shoulder*.48*sideFactor, sy=bodyTop+24; const rad=(angle*Math.PI)/180; const ex=sx+Math.sin(rad)*armLen*side, ey=sy+Math.cos(rad)*armLen;
    return `<g><line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${line}" stroke-width="${limbStroke+4}" stroke-linecap="round"/><line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${skin}" stroke-width="${limbStroke}" stroke-linecap="round"/><circle cx="${ex}" cy="${ey}" r="${a.handStyle==='defined'?9:7}" fill="${skin}" stroke="${line}" stroke-width="3"/></g>`;
  };
  const leg = (side:number,angle:number) => {
    const sx=cx+side*torsoWBase*.27, sy=bodyTop+torsoH-3; const rad=(angle*Math.PI)/180; const ex=sx+Math.sin(rad)*legLen*side, ey=sy+Math.cos(rad)*legLen;
    return `<g><line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${line}" stroke-width="${legStroke+5}" stroke-linecap="round"/><line x1="${sx}" y1="${sy}" x2="${ex}" y2="${ey}" stroke="${secondary}" stroke-width="${legStroke}" stroke-linecap="round"/><path d="M ${ex-8} ${ey} Q ${ex+side*18} ${ey+3} ${ex+side*24} ${ey+10} L ${ex-8} ${ey+10} Z" fill="${secondary}" stroke="${line}" stroke-width="2"/></g>`;
  };
  const eyeOffset = headW*.19*sideFactor; const faceShift=view==='side'?headW*.12:view==='three-quarter'?headW*.07:0;
  const eyes = !faceVisible?'':view==='side'
    ? eyeSvg(a.eyeStyle,cx+faceShift+headW*.12,headY-headH*.04,hex(a.eyeColor),.9)
    : `${eyeSvg(a.eyeStyle,cx-eyeOffset+faceShift,headY-headH*.04,hex(a.eyeColor),.9)}${eyeSvg(a.eyeStyle,cx+eyeOffset+faceShift,headY-headH*.04,hex(a.eyeColor),.9)}`;
  const browY=headY-headH*.18; const brows=!faceVisible?'':`<path d="M ${cx-eyeOffset-8+faceShift} ${browY} L ${cx-eyeOffset+8+faceShift} ${browY+(expression==='angry'?5:expression==='sad'?-3:0)} M ${cx+eyeOffset-8+faceShift} ${browY+(expression==='angry'?5:expression==='sad'?-3:0)} L ${cx+eyeOffset+8+faceShift} ${browY}" stroke="${line}" stroke-width="${a.browStyle==='bold'?4:2.5}" stroke-linecap="round"/>`;
  const nose=!faceVisible||a.noseStyle==='none'?'':`<path d="M ${cx+faceShift} ${headY} q ${a.noseStyle==='wide'?10:5} ${headH*.10} ${a.noseStyle==='wide'?15:8} ${headH*.02}" fill="none" stroke="${line}" stroke-width="2" stroke-linecap="round"/>`;
  const mouth=!faceVisible?'':expressionMouth(expression,a.mouthStyle,cx+faceShift,headY+headH*.22,line);
  const accessory = a.accessory==='glasses'&&faceVisible ? `<g fill="none" stroke="${line}" stroke-width="2"><circle cx="${cx-eyeOffset+faceShift}" cy="${headY-headH*.04}" r="12"/><circle cx="${cx+eyeOffset+faceShift}" cy="${headY-headH*.04}" r="12"/><path d="M ${cx-eyeOffset+12+faceShift} ${headY-headH*.04} L ${cx+eyeOffset-12+faceShift} ${headY-headH*.04}"/></g>` : a.accessory==='hat' ? `<path d="M ${cx-headW*.5} ${headY-headH*.42} Q ${cx} ${headY-headH*.8} ${cx+headW*.42} ${headY-headH*.42} L ${cx+headW*.6} ${headY-headH*.35} L ${cx-headW*.62} ${headY-headH*.35} Z" fill="${secondary}" stroke="${line}" stroke-width="3"/>` : '';
  const outfitDetail = a.outfitStyle==='tech' ? `<path d="M ${cx-20} ${bodyTop+25} h40 v22 h-40z" fill="${secondary}" opacity=".8"/><circle cx="${cx}" cy="${bodyTop+36}" r="5" fill="${primary}"/>` : a.outfitStyle==='formal' ? `<path d="M ${cx} ${bodyTop+12} l-15 26 15 18 15-18z" fill="${secondary}"/>` : a.outfitStyle==='sport' ? `<path d="M ${cx-torsoWBase*.44} ${bodyTop+26} h${torsoWBase*.88}" stroke="${secondary}" stroke-width="8"/>` : '';
  const bodyGroup = `<g transform="rotate(${angles.body} ${cx} ${torsoY})">${leg(-1,angles.ll)}${leg(1,angles.rl)}${arm(-1,angles.la)}${arm(1,angles.ra)}<g fill="${primary}" stroke="${line}" stroke-width="4">${torsoPath}</g>${outfitDetail}</g>`;
  const head = `<g fill="${skin}" stroke="${line}" stroke-width="4">${headPath(a.headShape,cx,headY,headW*sideFactor,headH)}</g>${hairSvg(a.hairStyle,cx,headY,headW*sideFactor,headH,hex(a.hairColor))}${eyes}${brows}${nose}${mouth}${accessory}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 520" role="img" aria-label="${esc(document.characterName || 'Personagem')}"><rect width="360" height="520" fill="transparent"/><g>${bodyGroup}${head}</g></svg>`;
}

function sanitizeSvg(svg:string) {
  return String(svg||'')
    .replace(/<script[\s\S]*?<\/script>/gi,'')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi,'')
    .replace(/\son\w+\s*=\s*(["']).*?\1/gi,'')
    .replace(/javascript:/gi,'');
}

function Tip({title,children}:{title:string;children:React.ReactNode}) {
  return <details className="group rounded-xl border border-black/10 bg-[#F7F7F5] px-3 py-2"><summary className="cursor-pointer list-none flex items-center gap-2 text-[10px] font-bold"><Info size={13}/>{title}<span className="ml-auto text-neutral-400 group-open:rotate-180">⌄</span></summary><div className="pt-2 text-[10px] leading-relaxed text-neutral-600">{children}</div></details>;
}
function SelectField({label,value,onChange,options}:{label:string;value:string;onChange:(v:any)=>void;options:Array<[string,string]>}) {
  return <label className="text-[9px] font-mono text-neutral-500">{label}<select value={value} onChange={e=>onChange(e.target.value)} className="mt-1 h-10 w-full rounded-xl border px-2 text-xs bg-white">{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>;
}
function HexField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}) {
  return <label className="text-[9px] font-mono text-neutral-500">{label}<div className="mt-1 flex gap-2"><input type="color" value={hex(value)} onChange={e=>onChange(e.target.value.toUpperCase())} className="h-10 w-11 rounded-lg border p-1"/><input value={value} onChange={e=>onChange(e.target.value)} onBlur={e=>onChange(hex(e.target.value,value))} className="h-10 min-w-0 flex-1 rounded-xl border px-2 font-mono text-xs uppercase"/></div></label>;
}

export function SpriteCharacterPreview({ document, className = '' }: { document: CharacterSpriteDocument; className?: string }) {
  const svg = document.generatedSvg || buildCharacterSvg(document, document.activeView||'front', document.activeExpression||'neutral', document.activePose||'neutral');
  return <div className={`flex items-center justify-center overflow-hidden ${className}`} style={{background:document.background||'#F4F4F2'}}><div className="w-full h-full p-3 [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{__html:sanitizeSvg(svg)}}/></div>;
}

export default function SpriteStudio({ document, availableAssets = [], title = 'Personagens', canEdit = true, onSave, onClose }: Props) {
  const base = blankSpriteCharacter();
  const initial: CharacterSpriteDocument = {
    ...base, ...JSON.parse(JSON.stringify(document)),
    appearance:{...DEFAULT_APPEARANCE,...(document.appearance||{})}, profile:{...DEFAULT_PROFILE,...(document.profile||{})},
    animations:(document.animations?.length?document.animations:base.animations), poses:document.poses?.length?document.poses:base.poses,
    expressions:document.expressions?.length?document.expressions:base.expressions
  };
  const [draft,setDraft]=useState(initial); const [tab,setTab]=useState<'build'|'sheet'|'poses'|'animate'|'ai'>('build');
  const [selectedAnimationId,setSelectedAnimationId]=useState(initial.activeAnimationId||initial.animations[0]?.id||'');
  const [frameIndex,setFrameIndex]=useState(0); const [playing,setPlaying]=useState(true); const [proceduralPhase,setProceduralPhase]=useState(0);
  const [uploading,setUploading]=useState(false); const [error,setError]=useState(''); const [aiBusy,setAiBusy]=useState(false);
  const fileRef=useRef<HTMLInputElement>(null);
  const animation=draft.animations.find(a=>a.id===selectedAnimationId)||draft.animations[0];
  const currentFrame=animation?.frames?.[frameIndex];
  const appearance={...DEFAULT_APPEARANCE,...(draft.appearance||{})}; const profile={...DEFAULT_PROFILE,...(draft.profile||{})};
  const currentPose:CharacterPoseKind = animation?.kind==='walk'?'walk':animation?.kind==='run'?'run':animation?.kind==='jump'?'jump':animation?.kind==='attack'?'action':draft.activePose||'neutral';
  const localSvg=useMemo(()=>buildCharacterSvg({...draft,appearance},draft.activeView||'front',draft.activeExpression||'neutral',currentPose,proceduralPhase),[draft.characterName,draft.activeView,draft.activeExpression,currentPose,proceduralPhase,JSON.stringify(appearance)]);
  const visibleSvg=draft.generatedSvg||localSvg;

  useEffect(()=>{if(!playing)return;const ms=animation?.frames?.length ? Math.max(40,1000/Math.max(1,animation.fps||8)) : Math.max(120,1000/Math.max(1,animation?.fps||6));const t=window.setInterval(()=>{if(animation?.frames?.length)setFrameIndex(i=>(i+1)%animation.frames.length);else setProceduralPhase(i=>(i+1)%2)},ms);return()=>window.clearInterval(t)},[playing,animation?.id,animation?.fps,animation?.frames?.length]);
  useEffect(()=>setFrameIndex(0),[selectedAnimationId]);

  const patchAppearance=(patch:Partial<CharacterAppearance>)=>setDraft(d=>({...d,appearance:{...DEFAULT_APPEARANCE,...(d.appearance||{}),...patch}}));
  const patchProfile=(patch:Partial<CharacterProfile>)=>setDraft(d=>({...d,profile:{...DEFAULT_PROFILE,...(d.profile||{}),...patch}}));
  const patchAnimation=(patch:Partial<SpriteAnimation>)=>setDraft(d=>({...d,animations:d.animations.map(a=>a.id===animation?.id?{...a,...patch}:a)}));
  const addAnimation=(kind:SpriteAnimationKind)=>{const item:SpriteAnimation={id:uid('anim'),name:KINDS.find(k=>k.id===kind)?.label||'Animação',kind,fps:kind==='run'?12:8,loop:kind!=='attack'&&kind!=='hurt',motion:kind==='idle'?'bob':kind==='jump'?'bounce':'none',frames:[]};setDraft(d=>({...d,animations:[...d.animations,item],activeAnimationId:item.id}));setSelectedAnimationId(item.id)};
  const addFrame=(asset:SpriteAssetOption)=>{if(!animation)return;const frame:SpriteFrame={id:uid('frame'),name:asset.name,url:asset.url,sourceNodeId:asset.source==='project'?asset.id:undefined,durationMs:125};patchAnimation({frames:[...animation.frames,frame]})};
  const patchFrame=(id:string,patch:Partial<SpriteFrame>)=>animation&&patchAnimation({frames:animation.frames.map(f=>f.id===id?{...f,...patch}:f)});
  const removeFrame=(id:string)=>animation&&patchAnimation({frames:animation.frames.filter(f=>f.id!==id)});
  const moveFrame=(id:string,dir:number)=>{if(!animation)return;const arr=[...animation.frames],i=arr.findIndex(f=>f.id===id),j=i+dir;if(i<0||j<0||j>=arr.length)return;[arr[i],arr[j]]=[arr[j],arr[i]];patchAnimation({frames:arr})};
  const duplicateFrame=(frame:SpriteFrame)=>animation&&patchAnimation({frames:[...animation.frames,{...frame,id:uid('frame'),name:`${frame.name} cópia`}]});
  const uploadFiles=async(files:FileList)=>{setUploading(true);setError('');try{for(const file of Array.from(files)){const fd=new FormData();fd.append('file',file);const session=await ensureTursoSession().catch(()=>null);const r=await fetch('/api/upload',{method:'POST',headers:{...(session?.token?{Authorization:`Bearer ${session.token}`}:{})},body:fd});const data=await r.json().catch(()=>({}));if(!r.ok||!data.url)throw new Error(data.error||`Falha no upload de ${file.name}`);addFrame({id:uid('upload'),name:file.name,url:data.url,source:'upload'})}}catch(e:any){setError(e.message||'Falha no upload')}finally{setUploading(false);if(fileRef.current)fileRef.current.value=''}};

  const callCharacterAI=async(mode:'character-svg'|'character-sheet')=>{setAiBusy(true);setError('');try{const session=await ensureTursoSession().catch(()=>null);const r=await fetch('/api/mediators/think',{method:'POST',headers:{'Content-Type':'application/json',...(session?.token?{Authorization:`Bearer ${session.token}`}:{})},body:JSON.stringify({mode,prompt:draft.prompt,character:{name:draft.characterName,description:draft.description,appearance,profile,view:draft.activeView,expression:draft.activeExpression,pose:draft.activePose}})});const data=await r.json().catch(()=>({}));if(!r.ok)throw new Error(data.error||'Não foi possível gerar o personagem.');if(mode==='character-svg'){if(!data.characterSvg?.svg)throw new Error('A IA não devolveu um SVG válido.');setDraft(d=>({...d,generatedSvg:sanitizeSvg(data.characterSvg.svg),generatedNotes:data.characterSvg.notes||d.generatedNotes}))}else{const sheet=data.characterSheet;if(!sheet)throw new Error('A IA não devolveu a ficha.');setDraft(d=>({...d,description:sheet.description||d.description,profile:{...DEFAULT_PROFILE,...d.profile,...sheet.profile,keywords:Array.isArray(sheet.profile?.keywords)?sheet.profile.keywords:d.profile?.keywords},generatedNotes:sheet.notes||d.generatedNotes}))}}catch(e:any){setError(e.message||'Falha na IA de personagens')}finally{setAiBusy(false)}};
  const resetToModular=()=>setDraft(d=>({...d,generatedSvg:undefined}));
  const exportSvg=()=>{const svg=sanitizeSvg(draft.generatedSvg||buildCharacterSvg(draft,draft.activeView||'front',draft.activeExpression||'neutral',draft.activePose||'neutral'));const blob=new Blob([svg],{type:'image/svg+xml'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`${(draft.characterName||'personagem').replace(/[^a-z0-9-_]+/gi,'-')}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};

  const motionProps = animation?.motion==='bob'?{animate:{y:[0,-7,0]},transition:{repeat:Infinity,duration:1.8}}:animation?.motion==='bounce'?{animate:{y:[0,-18,0]},transition:{repeat:Infinity,duration:.75}}:animation?.motion==='shake'?{animate:{x:[0,-5,5,-3,3,0]},transition:{repeat:Infinity,duration:.65}}:animation?.motion==='pulse'?{animate:{scale:[1,1.06,1]},transition:{repeat:Infinity,duration:1.1}}:animation?.motion==='squash'?{animate:{scaleX:[1,1.08,.94,1],scaleY:[1,.92,1.06,1]},transition:{repeat:Infinity,duration:.8}}:{};
  const tabs=[['build','CONSTRUIR'],['sheet','FICHA'],['poses','POSES'],['animate','ANIMAR'],['ai','IA / SVG']] as const;
  return <div className="fixed inset-0 z-[126] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={e=>e.stopPropagation()}>
    <header className="shrink-0 bg-white border-b px-3 sm:px-5 pt-[max(.35rem,env(safe-area-inset-top))] pb-2"><div className="flex items-center gap-3"><button onClick={onClose} className="h-11 w-11 rounded-xl flex items-center justify-center"><X size={20}/></button><div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[9px] font-mono text-neutral-500 uppercase">concept art · construção modular · ficha · poses · sprites · SVG</div></div><button disabled={!canEdit} onClick={()=>onSave({...draft,updatedAt:new Date().toISOString()})} className="h-11 px-4 rounded-xl bg-black text-white text-xs font-bold flex gap-2 items-center disabled:opacity-40"><Save size={15}/> SALVAR</button></div><div className="mt-2 flex gap-2 overflow-x-auto">{tabs.map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`shrink-0 h-9 px-3 rounded-xl border text-[9px] font-bold ${tab===id?'bg-black text-white border-black':'bg-white'}`}>{label}</button>)}</div></header>
    <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[470px_minmax(0,1fr)] overflow-y-auto xl:overflow-hidden">
      <section className="bg-white border-r p-4 space-y-4 xl:overflow-y-auto">
        {tab==='build'&&<>
          <div className="rounded-2xl border p-4 space-y-3"><b className="text-sm">Identidade visual do personagem</b><label className="block text-[9px] font-mono text-neutral-500">NOME<input value={draft.characterName} onChange={e=>setDraft({...draft,characterName:e.target.value,title:e.target.value||draft.title})} className="mt-1 h-10 w-full rounded-xl border px-3 text-sm"/></label><label className="block text-[9px] font-mono text-neutral-500">DESCRIÇÃO<textarea value={draft.description||''} onChange={e=>setDraft({...draft,description:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-3 text-sm" placeholder="Quem é, função narrativa, universo, referências..."/></label></div>
          <div className="rounded-2xl border p-4 space-y-3"><div className="flex items-center justify-between"><b className="text-sm">Cabeça e rosto</b><span className="text-[9px] font-mono text-neutral-400">FORMA ≠ PERSONALIDADE</span></div><div className="grid grid-cols-2 gap-2"><SelectField label="CABEÇA" value={appearance.headShape} onChange={v=>patchAppearance({headShape:v})} options={[["round","Redonda"],["oval","Oval"],["square","Quadrada"],["heart","Coração"],["triangle","Triangular"],["wide","Larga"]]}/><SelectField label="ROSTO" value={appearance.faceShape} onChange={v=>patchAppearance({faceShape:v})} options={[["soft","Suave"],["angular","Angular"],["long","Longo"],["wide","Largo"]]}/><SelectField label="OLHOS" value={appearance.eyeStyle} onChange={v=>patchAppearance({eyeStyle:v})} options={[["round","Redondos"],["almond","Amendoados"],["narrow","Estreitos"],["dot","Pontos"],["large","Grandes"]]}/><SelectField label="SOBRANCELHA" value={appearance.browStyle} onChange={v=>patchAppearance({browStyle:v})} options={[["soft","Suave"],["straight","Reta"],["arched","Arqueada"],["bold","Marcada"]]}/><SelectField label="NARIZ" value={appearance.noseStyle} onChange={v=>patchAppearance({noseStyle:v})} options={[["none","Sem nariz"],["small","Pequeno"],["straight","Reto"],["wide","Largo"]]}/><SelectField label="BOCA" value={appearance.mouthStyle} onChange={v=>patchAppearance({mouthStyle:v})} options={[["line","Linha"],["smile","Sorriso"],["full","Cheia"],["small","Pequena"]]}/><SelectField label="CABELO" value={appearance.hairStyle} onChange={v=>patchAppearance({hairStyle:v})} options={[["none","Sem cabelo"],["short","Curto"],["bob","Bob"],["long","Longo"],["curly","Cacheado"],["spiky","Espigado"],["bun","Coque"]]}/><SelectField label="ACESSÓRIO" value={appearance.accessory} onChange={v=>patchAppearance({accessory:v})} options={[["none","Nenhum"],["glasses","Óculos"],["hat","Chapéu"],["scarf","Cachecol"],["backpack","Mochila"],["headphones","Fones"]]}/></div><Tip title="Como interpretar formas de cabeça e rosto?">Formas são convenções de leitura visual, não diagnósticos de personalidade. Círculos costumam produzir uma silhueta mais suave; quadrados podem sugerir solidez; triângulos criam direção e tensão. O contexto cultural, a pose e a narrativa podem inverter essas leituras. Justifique pelo efeito visual desejado.</Tip><label className="block text-[9px] font-mono">JUSTIFICATIVA DE SHAPE LANGUAGE<textarea value={profile.shapeLanguageRationale} onChange={e=>patchProfile({shapeLanguageRationale:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-2 text-xs" placeholder="Por que estas formas servem ao personagem?"/></label></div>
          <div className="rounded-2xl border p-4 space-y-3"><b className="text-sm">Corpo e proporção</b><div className="grid grid-cols-2 gap-2"><SelectField label="CORPO" value={appearance.bodyShape} onChange={v=>patchAppearance({bodyShape:v})} options={[["slim","Esguio"],["average","Médio"],["athletic","Atlético"],["stocky","Robusto"],["chibi","Chibi / SD"]]}/><SelectField label="TRONCO" value={appearance.torsoShape} onChange={v=>patchAppearance({torsoShape:v})} options={[["rectangle","Retângulo"],["trapezoid","Trapézio"],["round","Arredondado"],["triangle","Triângulo"]]}/><SelectField label="BRAÇOS" value={appearance.armStyle} onChange={v=>patchAppearance({armStyle:v})} options={[["thin","Finos"],["regular","Regulares"],["strong","Fortes"]]}/><SelectField label="PERNAS" value={appearance.legStyle} onChange={v=>patchAppearance({legStyle:v})} options={[["short","Curtas"],["regular","Regulares"],["long","Longas"]]}/><SelectField label="MÃOS" value={appearance.handStyle} onChange={v=>patchAppearance({handStyle:v})} options={[["mitten","Mitten/cartoon"],["simple","Simples"],["defined","Definidas"]]}/><SelectField label="ROUPA" value={appearance.outfitStyle} onChange={v=>patchAppearance({outfitStyle:v})} options={[["basic","Básica"],["sport","Esportiva"],["formal","Formal"],["fantasy","Fantasia"],["tech","Tech"],["street","Street"]]}/></div><label className="block text-[9px] font-mono">PROPORÇÃO CABEÇA × CORPO · {Number(appearance.headToBodyRatio).toFixed(1)} cabeças<input type="range" min="2.5" max="8.5" step="0.25" value={appearance.headToBodyRatio} onChange={e=>patchAppearance({headToBodyRatio:+e.target.value})} className="w-full"/></label><div className="grid grid-cols-3 gap-2"><label className="text-[9px] font-mono">OMBROS<input type="range" min=".7" max="1.35" step=".05" value={appearance.shoulderWidth} onChange={e=>patchAppearance({shoulderWidth:+e.target.value})} className="w-full"/></label><label className="text-[9px] font-mono">MEMBROS<input type="range" min=".75" max="1.25" step=".05" value={appearance.limbLength} onChange={e=>patchAppearance({limbLength:+e.target.value})} className="w-full"/></label><label className="text-[9px] font-mono">LARGURA<input type="range" min=".7" max="1.35" step=".05" value={appearance.bodyWidth} onChange={e=>patchAppearance({bodyWidth:+e.target.value})} className="w-full"/></label></div><Tip title="O que a proporção cabeça × corpo muda?">Proporções menores, como 2–4 cabeças, aproximam o design de chibi/cartoon e da leitura infantilizada. Proporções de 7–8 cabeças se aproximam do adulto naturalista e podem alongar a silhueta. Uma cabeça relativamente pequena em um corpo alto enfatiza escala e alongamento; isso não determina caráter moral ou psicológico.</Tip><label className="block text-[9px] font-mono">JUSTIFICATIVA DE PROPORÇÃO<textarea value={profile.proportionRationale} onChange={e=>patchProfile({proportionRationale:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-2 text-xs"/></label></div>
          <div className="rounded-2xl border p-4 space-y-3"><b className="text-sm">Paleta</b><div className="grid grid-cols-2 gap-2"><HexField label="PELE" value={appearance.skinColor} onChange={v=>patchAppearance({skinColor:v})}/><HexField label="CABELO" value={appearance.hairColor} onChange={v=>patchAppearance({hairColor:v})}/><HexField label="OLHOS" value={appearance.eyeColor} onChange={v=>patchAppearance({eyeColor:v})}/><HexField label="ROUPA 1" value={appearance.outfitPrimary} onChange={v=>patchAppearance({outfitPrimary:v})}/><HexField label="ROUPA 2" value={appearance.outfitSecondary} onChange={v=>patchAppearance({outfitSecondary:v})}/><HexField label="TRAÇO" value={appearance.lineColor} onChange={v=>patchAppearance({lineColor:v})}/></div><label className="block text-[9px] font-mono">JUSTIFICATIVA CROMÁTICA<textarea value={profile.colorRationale} onChange={e=>patchProfile({colorRationale:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-2 text-xs"/></label></div>
        </>}
        {tab==='sheet'&&<><div className="rounded-2xl border p-4 space-y-3"><b className="text-sm">Ficha do personagem</b><div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono">PAPEL<input value={profile.role} onChange={e=>patchProfile({role:e.target.value})} className="mt-1 h-10 w-full rounded-xl border px-2"/></label><label className="text-[9px] font-mono">FAIXA ETÁRIA<input value={profile.ageBand} onChange={e=>patchProfile({ageBand:e.target.value})} className="mt-1 h-10 w-full rounded-xl border px-2"/></label></div><label className="block text-[9px] font-mono">PERSONALIDADE<textarea value={profile.personality} onChange={e=>patchProfile({personality:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-2"/></label><label className="block text-[9px] font-mono">MOTIVAÇÃO<textarea value={profile.motivation} onChange={e=>patchProfile({motivation:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-2"/></label><label className="block text-[9px] font-mono">HISTÓRIA / CONTEXTO<textarea value={profile.backstory} onChange={e=>patchProfile({backstory:e.target.value})} className="mt-1 min-h-24 w-full rounded-xl border p-2"/></label><label className="block text-[9px] font-mono">PALAVRAS-CHAVE<input value={(profile.keywords||[]).join(', ')} onChange={e=>patchProfile({keywords:e.target.value.split(',').map(x=>x.trim()).filter(Boolean)})} className="mt-1 h-10 w-full rounded-xl border px-2"/></label><label className="block text-[9px] font-mono">INTENÇÃO DA SILHUETA<textarea value={profile.silhouetteIntent} onChange={e=>patchProfile({silhouetteIntent:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-2"/></label><label className="block text-[9px] font-mono">ROUPA E ACESSÓRIOS<textarea value={profile.costumeRationale} onChange={e=>patchProfile({costumeRationale:e.target.value})} className="mt-1 min-h-16 w-full rounded-xl border p-2"/></label><button onClick={()=>void callCharacterAI('character-sheet')} disabled={aiBusy} className="h-11 w-full rounded-xl bg-black text-white text-[10px] font-bold flex items-center justify-center gap-2">{aiBusy?<Loader2 className="animate-spin" size={14}/>:<Sparkles size={14}/>} COMPLETAR FICHA COM IA</button></div><div className="space-y-2"><Tip title="Silhueta primeiro">Antes dos detalhes, reduza o personagem a uma massa escura. Se a pose, função e diferença para outros personagens ainda forem legíveis, a silhueta está fazendo trabalho narrativo.</Tip><Tip title="Model sheet / turnaround">Frente, 3/4, lateral e costas ajudam a manter volumes, roupa e proporções consistentes quando o personagem é redesenhado, animado ou modelado.</Tip><Tip title="Expression sheet">Expressões devem preservar os traços que tornam o personagem reconhecível. Mude sobrancelhas, olhos, boca e postura sem transformar o rosto em outra pessoa.</Tip><Tip title="Referências de concept art">Use como repertório: Bryan Tillman (Creative Character Design), Tom Bancroft (Creating Characters with Personality), Mike Mattesi (FORCE), Andrew Loomis (proporção), Preston Blair e Walt Stanchfield (animação/desenho). Trate shape language e proporção como convenções visuais contextualizadas, não regras psicológicas universais.</Tip><a href="https://charactergen.app/pt/character-design-sheet" target="_blank" rel="noreferrer" className="block rounded-2xl border p-3 text-[10px] underline underline-offset-2">Referência contemporânea · CharacterGen — ficha, turnaround, expressões e poses ↗</a></div></>}
        {tab==='poses'&&<><div className="rounded-2xl border p-4"><b className="text-sm">Turnaround</b><div className="mt-3 grid grid-cols-2 gap-2">{VIEWS.map(v=><button key={v.id} onClick={()=>setDraft(d=>({...d,activeView:v.id}))} className={`rounded-xl border p-2 ${draft.activeView===v.id?'ring-2 ring-black':''}`}><div className="aspect-[3/4] [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{__html:buildCharacterSvg(draft,v.id,draft.activeExpression||'neutral','neutral')}}/><b className="text-[9px]">{v.label}</b></button>)}</div></div><div className="rounded-2xl border p-4"><b className="text-sm">Expressões</b><div className="mt-3 grid grid-cols-3 gap-2">{EXPRESSIONS.map(ex=><button key={ex.id} onClick={()=>setDraft(d=>({...d,activeExpression:ex.id}))} className={`rounded-xl border p-2 ${draft.activeExpression===ex.id?'ring-2 ring-black':''}`}><div className="aspect-square overflow-hidden [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{__html:buildCharacterSvg(draft,'front',ex.id,'neutral')}}/><div className="text-[8px] font-bold">{ex.label}</div></button>)}</div></div><div className="rounded-2xl border p-4"><b className="text-sm">Poses</b><div className="mt-3 grid grid-cols-2 gap-2">{POSES.map(p=><button key={p.id} onClick={()=>setDraft(d=>({...d,activePose:p.id}))} className={`rounded-xl border p-2 ${draft.activePose===p.id?'ring-2 ring-black':''}`}><div className="aspect-[3/4] [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{__html:buildCharacterSvg(draft,'front',draft.activeExpression||'neutral',p.id)}}/><div className="text-[8px] font-bold">{p.label}</div></button>)}</div><Tip title="Linha de ação e pose">A pose ganha clareza quando há uma direção dominante no corpo. Em ação, evite simetria rígida; distribua peso, inclinação e contraposição de braços/pernas para tornar intenção e movimento legíveis.</Tip></div></>}
        {tab==='animate'&&<><div className="rounded-2xl border p-4"><div className="flex items-center justify-between gap-2"><div><b className="text-sm">Estados / animações</b><div className="text-[10px] text-neutral-500">Funcionam mesmo sem frames: o personagem modular recebe movimento procedural. Frames enviados substituem a animação modular.</div></div><select onChange={e=>{if(e.target.value)addAnimation(e.target.value as SpriteAnimationKind);e.currentTarget.value=''}} defaultValue="" className="h-9 rounded-xl border px-2 text-[9px]"><option value="" disabled>+ ANIMAÇÃO</option>{KINDS.map(i=><option key={i.id} value={i.id}>{i.label}</option>)}</select></div><div className="mt-3 flex gap-2 overflow-x-auto">{draft.animations.map(a=><button key={a.id} onClick={()=>{setSelectedAnimationId(a.id);setDraft(d=>({...d,activeAnimationId:a.id}))}} className={`shrink-0 h-10 px-3 rounded-xl border text-[10px] font-bold ${a.id===selectedAnimationId?'bg-black text-white':''}`}>{a.name}</button>)}</div>{animation&&<div className="mt-3 grid grid-cols-3 gap-2"><label className="text-[9px] font-mono">FPS<input type="number" min="1" max="30" value={animation.fps} onChange={e=>patchAnimation({fps:+e.target.value})} className="mt-1 h-9 w-full rounded-lg border px-2"/></label><label className="text-[9px] font-mono">LOOP<select value={animation.loop?'yes':'no'} onChange={e=>patchAnimation({loop:e.target.value==='yes'})} className="mt-1 h-9 w-full rounded-lg border"><option value="yes">Sim</option><option value="no">Não</option></select></label><label className="text-[9px] font-mono">MOVIMENTO<select value={animation.motion} onChange={e=>patchAnimation({motion:e.target.value as SpriteMotionPreset})} className="mt-1 h-9 w-full rounded-lg border">{MOTIONS.map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</select></label></div>}</div><div className="rounded-2xl border p-4"><div className="flex items-center justify-between"><div><b className="text-sm">Frames opcionais</b><div className="text-[10px] text-neutral-500">Use desenhos do projeto ou uploads para sprite frame-by-frame.</div></div><button onClick={()=>fileRef.current?.click()} className="h-9 px-3 rounded-xl bg-black text-white text-[9px] font-bold flex gap-1 items-center"><Upload size={13}/> UPLOAD</button></div><input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e=>e.target.files&&void uploadFiles(e.target.files)}/><div className="mt-3 grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">{availableAssets.map(asset=><button key={asset.id} onClick={()=>addFrame(asset)} className="rounded-xl border overflow-hidden text-left"><div className="aspect-square bg-neutral-100"><img src={asset.url} className="w-full h-full object-contain"/></div><div className="p-2 text-[9px] font-bold flex gap-1"><Plus size={11}/>{asset.name}</div></button>)}</div>{uploading&&<div className="text-[10px] mt-2">Enviando...</div>}</div>{animation&&animation.frames.length>0&&<div className="rounded-2xl border p-4"><b className="text-sm">Timeline</b><div className="mt-3 space-y-2">{animation.frames.map((f,i)=><div key={f.id} className="flex gap-2 items-center border rounded-xl p-2"><img src={f.url} className="h-14 w-14 object-contain bg-neutral-100 rounded-lg"/><div className="min-w-0 flex-1"><b className="text-[9px] block truncate">{i+1}. {f.name}</b><input type="number" min="30" max="5000" value={f.durationMs||125} onChange={e=>patchFrame(f.id,{durationMs:+e.target.value})} className="h-7 w-20 border rounded px-1 text-[8px]"/></div><div className="grid grid-cols-2 gap-1"><button onClick={()=>moveFrame(f.id,-1)} className="h-7 w-7 border rounded"><ArrowLeft size={12}/></button><button onClick={()=>moveFrame(f.id,1)} className="h-7 w-7 border rounded"><ArrowRight size={12}/></button><button onClick={()=>duplicateFrame(f)} className="h-7 w-7 border rounded"><Copy size={12}/></button><button onClick={()=>removeFrame(f.id)} className="h-7 w-7 border border-red-200 text-red-600 rounded"><Trash2 size={12}/></button></div></div>)}</div></div>}</>}
        {tab==='ai'&&<><div className="rounded-2xl border-2 border-black p-4"><div className="flex items-center gap-2"><WandSparkles size={16}/><b className="text-sm">Criar / refinar SVG por prompt</b></div><p className="mt-1 text-[10px] text-neutral-500">A IA recebe as escolhas modulares e deve preservar um SVG editável. Peça mudanças concretas de silhueta, roupa, acessórios ou estilo. O resultado não substitui a ficha: revise consistência entre vistas e poses.</p><div className="mt-3 flex gap-2 items-start"><textarea value={draft.prompt||''} onChange={e=>setDraft({...draft,prompt:e.target.value})} className="min-h-28 min-w-0 flex-1 rounded-xl border p-3 text-sm" placeholder="Ex.: transforme este personagem em uma pesquisadora de campo futurista, preserve a proporção 6 cabeças, mochila compacta, formas arredondadas e paleta atual..."/><VoiceDictationButton onText={t=>setDraft(d=>({...d,prompt:`${d.prompt||''}${d.prompt?' ':''}${t}`}))}/></div><button onClick={()=>void callCharacterAI('character-svg')} disabled={aiBusy||!draft.prompt?.trim()} className="mt-3 h-11 w-full rounded-xl bg-black text-white text-[10px] font-bold flex items-center justify-center gap-2">{aiBusy?<Loader2 size={14} className="animate-spin"/>:<Sparkles size={14}/>} GERAR SVG</button>{draft.generatedSvg&&<button onClick={resetToModular} className="mt-2 h-10 w-full rounded-xl border text-[9px] font-bold flex items-center justify-center gap-2"><RotateCcw size={13}/> VOLTAR À CONSTRUÇÃO MODULAR</button>}</div>{draft.generatedNotes?.length>0&&<div className="rounded-2xl border p-4"><b className="text-sm">Notas da IA</b>{draft.generatedNotes.map((n,i)=><div key={i} className="mt-2 text-[10px]">• {n}</div>)}</div>}</>}
        {error&&<div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-700">{error}</div>}
      </section>
      <section className="min-h-[58vh] xl:min-h-0 overflow-auto p-5 sm:p-8 flex flex-col items-center gap-4"><div className="w-full max-w-3xl flex items-center justify-between"><div><div className="text-[9px] font-mono text-neutral-500">PRÉVIA VIVA</div><b className="text-xl">{draft.characterName}</b></div><div className="flex gap-2"><button onClick={exportSvg} className="h-10 px-3 rounded-xl border bg-white flex items-center gap-2 text-[9px] font-bold"><Download size={13}/> SVG</button><button onClick={()=>setPlaying(v=>!v)} className="h-10 px-3 rounded-xl bg-black text-white flex items-center gap-2 text-[9px] font-bold">{playing?<Pause size={13}/>:<Play size={13}/>} {playing?'PAUSAR':'REPRODUZIR'}</button></div></div><div className="w-full max-w-3xl min-h-[460px] rounded-3xl border bg-white flex items-center justify-center p-6 overflow-hidden" style={{background:draft.background||'#F4F4F2'}}><motion.div {...motionProps} className="w-full h-[430px] flex items-center justify-center">{currentFrame?.url?<img src={currentFrame.url} className="max-w-full max-h-full object-contain" style={{imageRendering:draft.pixelated?'pixelated':'auto'}}/>:<div className="w-full h-full [&>svg]:w-full [&>svg]:h-full" dangerouslySetInnerHTML={{__html:sanitizeSvg(draft.generatedSvg||localSvg)}}/>}</motion.div></div><div className="w-full max-w-3xl grid grid-cols-3 gap-2"><div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-mono text-neutral-500">PROPORÇÃO</div><b className="text-sm">{appearance.headToBodyRatio} cabeças</b></div><div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-mono text-neutral-500">VISTA</div><b className="text-sm">{VIEWS.find(v=>v.id===draft.activeView)?.label||'Frente'}</b></div><div className="rounded-xl border bg-white p-3"><div className="text-[8px] font-mono text-neutral-500">ESTADO</div><b className="text-sm">{animation?.name||'—'}</b></div></div></section>
    </main>
  </div>;
}
