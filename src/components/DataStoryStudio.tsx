import React, { useMemo, useRef, useState } from 'react';
import {
  BookOpen, Database, Info, Layers3, Link2, Loader2, Map, MoveDiagonal2,
  Plus, Save, Sparkles, Trash2, Type, X
} from 'lucide-react';
import type {
  DataChartType, DataInfographicFormat, DataStoryDocument, DataStoryElement,
  DataStoryQuestion, DesignSystemDocument, VisualIdentityDocument
} from '../types';
import { StudioWorkspace } from './StudioWorkspace';
import VoiceDictationButton from './VoiceDictationButton';
import { ensureTursoSession } from '../lib/turso';

type Row = Record<string, string | number>;
type Tab = 'data' | 'charts' | 'maps' | 'infographic' | 'ai';

interface Props {
  document: DataStoryDocument;
  title?: string;
  canEdit?: boolean;
  designSystem?: DesignSystemDocument;
  visualIdentity?: VisualIdentityDocument;
  onSave: (document: DataStoryDocument) => void;
  onClose: () => void;
}

const uid=(p='id')=>`${p}-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;
const DEFAULT_DATA=`Categoria,Valor\nPesquisa,72\nPrototipação,58\nConteúdo,44\nAcessibilidade,63\nImplementação,51`;
const DEFAULT_QUESTIONS:DataStoryQuestion[]=[
  {id:'q-1',prompt:'Qual é a pergunta que estes dados realmente conseguem responder?'},
  {id:'q-2',prompt:'Comparado a quê este número é alto, baixo ou relevante?'},
  {id:'q-3',prompt:'Quem ou o que está ausente do conjunto de dados?'},
  {id:'q-4',prompt:'Há denominador, escala, período ou unidade que precisa aparecer?'},
  {id:'q-5',prompt:'Existe tendência, exceção, outlier ou mudança no tempo que merece destaque?'},
  {id:'q-6',prompt:'A visualização sugere causalidade quando os dados mostram apenas associação?'},
];

function paletteFrom(designSystem?:DesignSystemDocument, visualIdentity?:VisualIdentityDocument){
  const identity=(visualIdentity?.palette||[]).map(c=>c.color).filter(Boolean);
  const system=(designSystem?.colors||[]).map(c=>c.value).filter(Boolean);
  const base=identity.length?identity:system;
  return [...base,'#1E7F78','#FF4F9A','#F3C64D','#377CF6','#28252B','#F2F1ED'].slice(0,8);
}

export function blankDataStory(designSystem?:DesignSystemDocument, visualIdentity?:VisualIdentityDocument):DataStoryDocument{
  return {
    title:'Storytelling de dados',
    goal:'Transformar dados em uma narrativa visual clara, verificável e autoral.',
    rawData:DEFAULT_DATA,
    chartType:'bar',
    xField:'Categoria',
    yField:'Valor',
    palette:paletteFrom(designSystem,visualIdentity),
    questions:DEFAULT_QUESTIONS,
    mapGeoJson:'',
    mapValueProperty:'',
    geoApiPath:'https://geoapi.com.br/geo/states/RS',
    metabaseUrl:'',
    infographicFormat:'vertical',
    infographicElements:[],
    aiPrompt:'',
    aiNotes:[],
  };
}

function parseData(raw:string):Row[]{
  const source=String(raw||'').trim();
  if(!source)return [];
  if(source.startsWith('[')||source.startsWith('{')){
    try{
      const parsed=JSON.parse(source);
      const rows=Array.isArray(parsed)?parsed:Array.isArray(parsed?.data)?parsed.data:Array.isArray(parsed?.rows)?parsed.rows:[];
      return rows.filter((x:any)=>x&&typeof x==='object').map((x:any)=>Object.fromEntries(Object.entries(x).map(([k,v])=>[k,typeof v==='number'?v:String(v??'')])));
    }catch{return []}
  }
  const lines=source.split(/\r?\n/).filter(Boolean);
  if(lines.length<2)return [];
  const probe=lines[0];
  const delimiter=(probe.match(/\t/g)||[]).length?("\t"):(probe.match(/;/g)||[]).length>(probe.match(/,/g)||[]).length?';':',';
  const split=(line:string)=>line.split(delimiter).map(x=>x.trim().replace(/^"|"$/g,''));
  const headers=split(lines[0]);
  return lines.slice(1).map(line=>{
    const cells=split(line); const row:Row={};
    headers.forEach((h,i)=>{const v=cells[i]??'';const normalized=v.replace(',','.');const n=Number(normalized);row[h]=v!==''&&Number.isFinite(n)?n:v;});
    return row;
  });
}
const num=(v:any)=>Number.isFinite(Number(v))?Number(v):0;
const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]||m));

function ChartSvg({rows,type,xField,yField,palette,compact=false}:{rows:Row[];type:DataChartType;xField?:string;yField?:string;palette:string[];compact?:boolean}){
  const W=compact?360:720,H=compact?220:430,pad=compact?34:58;
  const keys=rows[0]?Object.keys(rows[0]):[];
  const x=xField&&keys.includes(xField)?xField:keys[0];
  const numeric=keys.filter(k=>rows.some(r=>typeof r[k]==='number'||Number.isFinite(Number(r[k]))));
  const y=yField&&keys.includes(yField)?yField:(numeric.find(k=>k!==x)||numeric[0]||keys[1]);
  if(!rows.length||!x||!y)return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/><text x={W/2} y={H/2} textAnchor="middle" fill="#999" fontSize="14">Cole dados para visualizar</text></svg>;
  const values=rows.map(r=>num(r[y])); const max=Math.max(1,...values.map(Math.abs)); const innerW=W-pad*2,innerH=H-pad*2;
  const axis=<g stroke="#D6D6D2" strokeWidth="1"><line x1={pad} y1={H-pad} x2={W-pad} y2={H-pad}/><line x1={pad} y1={pad} x2={pad} y2={H-pad}/></g>;
  if(type==='pie'||type==='donut'){
    const total=Math.max(1,values.reduce((a,b)=>a+Math.max(0,b),0));let a=-Math.PI/2;const cx=W*.43,cy=H*.5,r=Math.min(innerH,innerW)*.36;
    const arcs=rows.map((row,i)=>{const v=Math.max(0,values[i]);const da=(v/total)*Math.PI*2;const a2=a+da;const p1=[cx+Math.cos(a)*r,cy+Math.sin(a)*r],p2=[cx+Math.cos(a2)*r,cy+Math.sin(a2)*r];const large=da>Math.PI?1:0;const d=`M ${cx} ${cy} L ${p1[0]} ${p1[1]} A ${r} ${r} 0 ${large} 1 ${p2[0]} ${p2[1]} Z`;a=a2;return <path key={i} d={d} fill={palette[i%palette.length]||'#111'} stroke="#fff" strokeWidth="2"/>});
    return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{arcs}{type==='donut'&&<circle cx={cx} cy={cy} r={r*.56} fill="#fff"/>}<g>{rows.slice(0,8).map((row,i)=><g key={i} transform={`translate(${W*.72} ${pad+i*24})`}><rect width="11" height="11" rx="2" fill={palette[i%palette.length]}/><text x="18" y="10" fontSize="11" fill="#333">{esc(row[x])} · {values[i]}</text></g>)}</g></svg>;
  }
  if(type==='stacked'){
    const series=numeric.filter(k=>k!==x).slice(0,5);
    const sums=rows.map(r=>series.reduce((acc,k)=>acc+Math.max(0,num(r[k])),0));const maxSum=Math.max(1,...sums);const barN=Math.max(1,rows.length),gap=compact?5:9,bw=(innerW-gap*(barN-1))/barN;
    return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{axis}{rows.map((r,i)=>{let yy=H-pad;return <g key={i}>{series.map((k,si)=>{const hh=Math.max(0,num(r[k]))/maxSum*innerH;yy-=hh;return <rect key={k} x={pad+i*(bw+gap)} y={yy} width={bw} height={hh} fill={palette[si%palette.length]} stroke="#fff" strokeWidth="1"/>})}{!compact&&<text x={pad+i*(bw+gap)+bw/2} y={H-pad+16} textAnchor="middle" fontSize="9">{String(r[x]).slice(0,10)}</text>}</g>})}</svg>;
  }
  if(type==='line'||type==='area'||type==='timeline'){
    const pts=rows.map((r,i)=>[pad+(rows.length<=1?innerW/2:i*innerW/(rows.length-1)),H-pad-(num(r[y])/max)*innerH]);
    const path=pts.map((p,i)=>`${i?'L':'M'} ${p[0]} ${p[1]}`).join(' ');
    const area=`M ${pad} ${H-pad} ${path.replace(/^M /,'L ')} L ${W-pad} ${H-pad} Z`;
    return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{axis}{type==='area'&&<path d={area} fill={palette[0]||'#1E7F78'} opacity=".18"/>}<path d={path} fill="none" stroke={palette[0]||'#1E7F78'} strokeWidth={compact?3:4}/>{pts.map((p,i)=><g key={i}><circle cx={p[0]} cy={p[1]} r={compact?3:5} fill={palette[(i+1)%palette.length]||'#FF4F9A'}/>{!compact&&<text x={p[0]} y={H-pad+18} textAnchor="middle" fontSize="9" fill="#555">{String(rows[i][x]).slice(0,12)}</text>}</g>)}</svg>;
  }
  if(type==='scatter'||type==='bubble'){
    const xNum=rows.map(r=>num(r[x])); const maxX=Math.max(1,...xNum.map(Math.abs));
    return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{axis}{rows.map((r,i)=>{const cx=pad+(xNum[i]/maxX)*innerW,cy=H-pad-(values[i]/max)*innerH,rr=type==='bubble'?Math.max(4,Math.min(24,8+Math.abs(values[i])/max*16)):5;return <circle key={i} cx={cx} cy={cy} r={rr} fill={palette[i%palette.length]} opacity=".78"/>})}</svg>;
  }
  if(type==='radar'){
    const cx=W/2,cy=H/2,r=Math.min(innerW,innerH)*.38,n=Math.max(3,Math.min(rows.length,10)); const pts=rows.slice(0,n).map((row,i)=>{const a=-Math.PI/2+i*Math.PI*2/n;const rr=r*(num(row[y])/max);return [cx+Math.cos(a)*rr,cy+Math.sin(a)*rr]});
    const grid=[.25,.5,.75,1].map(level=><polygon key={level} points={Array.from({length:n},(_,i)=>{const a=-Math.PI/2+i*Math.PI*2/n;return `${cx+Math.cos(a)*r*level},${cy+Math.sin(a)*r*level}`}).join(' ')} fill="none" stroke="#ddd"/>);
    return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{grid}<polygon points={pts.map(p=>p.join(',')).join(' ')} fill={palette[0]} opacity=".28" stroke={palette[0]} strokeWidth="3"/></svg>;
  }
  if(type==='pictogram'){
    const first=Math.max(0,Math.min(100,values[0]||0));const count=Math.round(first/5);
    return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/><text x={pad} y={pad+10} fontSize="15" fontWeight="700">{esc(rows[0]?.[x])}: {values[0]}</text>{Array.from({length:20},(_,i)=><circle key={i} cx={pad+18+(i%10)*30} cy={pad+55+Math.floor(i/10)*34} r="10" fill={i<count?palette[0]:'#E5E5E2'}/>)}</svg>;
  }
  if(type==='gauge'){
    const v=Math.max(0,values[0]||0);const ceiling=v<=100?100:max;const pct=Math.max(0,Math.min(1,v/Math.max(1,ceiling)));const cx=W/2,cy=H*.72,r=Math.min(W,H)*.3;const start=Math.PI,end=0,a=start+(end-start)*pct;const polar=(ang:number)=>[cx+Math.cos(ang)*r,cy+Math.sin(ang)*r];const p1=polar(start),p2=polar(a);const large=pct>.5?1:0;return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/><path d={`M ${p1[0]} ${p1[1]} A ${r} ${r} 0 0 1 ${cx+r} ${cy}`} fill="none" stroke="#E7E7E4" strokeWidth={compact?18:28} strokeLinecap="round"/><path d={`M ${p1[0]} ${p1[1]} A ${r} ${r} 0 ${large} 1 ${p2[0]} ${p2[1]}`} fill="none" stroke={palette[0]} strokeWidth={compact?18:28} strokeLinecap="round"/><text x={cx} y={cy-8} textAnchor="middle" fontSize={compact?28:44} fontWeight="800">{v}</text><text x={cx} y={cy+18} textAnchor="middle" fontSize="11" fill="#666">{esc(rows[0]?.[x])}</text></svg>;
  }
  if(type==='lollipop'){
    const bh=innerH/Math.max(1,rows.length);return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{rows.map((r,i)=>{const yy=pad+bh*(i+.5),xx=pad+(Math.abs(values[i])/max)*innerW;return <g key={i}><line x1={pad} y1={yy} x2={xx} y2={yy} stroke="#D9D9D5" strokeWidth="3"/><circle cx={xx} cy={yy} r={compact?6:9} fill={palette[i%palette.length]}/>{!compact&&<text x={pad} y={yy-8} fontSize="10">{esc(r[x])} · {values[i]}</text>}</g>})}</svg>;
  }
  if(type==='funnel'){
    const sorted=rows.map((r,i)=>({r,v:Math.max(0,values[i]),i})).sort((a,b)=>b.v-a.v);const n=Math.max(1,sorted.length),hh=innerH/n;return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{sorted.map((it,i)=>{const ratio=it.v/max;const w=innerW*(.28+.72*ratio);const next=i===n-1?w:innerW*(.28+.72*((sorted[i+1]?.v||0)/max));const yy=pad+i*hh;return <g key={i}><path d={`M ${W/2-w/2} ${yy} L ${W/2+w/2} ${yy} L ${W/2+next/2} ${yy+hh-3} L ${W/2-next/2} ${yy+hh-3} Z`} fill={palette[i%palette.length]} opacity=".9"/>{!compact&&<text x={W/2} y={yy+hh/2+4} textAnchor="middle" fontSize="10" fill="#111">{esc(it.r[x])} · {it.v}</text>}</g>})}</svg>;
  }
  if(type==='treemap'){
    const positive=values.map(v=>Math.max(0,v));const total=Math.max(1,positive.reduce((a,b)=>a+b,0));let xx=pad;return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{rows.map((r,i)=>{const ww=innerW*(positive[i]/total);const x0=xx;xx+=ww;return <g key={i}><rect x={x0} y={pad} width={Math.max(1,ww)} height={innerH} fill={palette[i%palette.length]} stroke="#fff" strokeWidth="2"/>{!compact&&ww>55&&<text x={x0+8} y={pad+20} fontSize="10">{esc(r[x])}</text>}</g>})}</svg>;
  }
  if(type==='heatmap'){
    const nums=numeric.length?numeric:[y];const cellW=innerW/Math.max(1,nums.length),cellH=innerH/Math.max(1,rows.length);const vals=rows.flatMap(r=>nums.map(k=>Math.abs(num(r[k]))));const mm=Math.max(1,...vals);return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{rows.map((r,ri)=>nums.map((k,ci)=>{const t=Math.abs(num(r[k]))/mm;return <rect key={`${ri}-${ci}`} x={pad+ci*cellW} y={pad+ri*cellH} width={cellW-2} height={cellH-2} rx="3" fill={palette[Math.min(palette.length-1,Math.floor(t*(palette.length-1)))]} opacity={.25+.75*t}/> }))}</svg>;
  }
  const horizontal=type==='horizontal-bar'; const barN=Math.max(1,rows.length);const gap=compact?6:10;
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full"><rect width={W} height={H} fill="#fff"/>{axis}{rows.map((r,i)=>{
    if(horizontal){const bh=(innerH-gap*(barN-1))/barN;const yy=pad+i*(bh+gap);const bw=(Math.abs(values[i])/max)*innerW;return <g key={i}><rect x={pad} y={yy} width={bw} height={bh} rx="5" fill={palette[i%palette.length]}/>{!compact&&<text x={pad+6} y={yy+bh/2+4} fontSize="10" fill="#111">{String(r[x]).slice(0,15)} · {values[i]}</text>}</g>}
    const bw=(innerW-gap*(barN-1))/barN;const xx=pad+i*(bw+gap);const bh=(Math.abs(values[i])/max)*innerH;return <g key={i}><rect x={xx} y={H-pad-bh} width={bw} height={bh} rx="5" fill={palette[i%palette.length]}/>{!compact&&<text x={xx+bw/2} y={H-pad+16} textAnchor="middle" fontSize="9" fill="#555">{String(r[x]).slice(0,10)}</text>}</g>
  })}</svg>;
}

function parseGeoJson(raw:string):any|null{try{const j=JSON.parse(raw);return j?.type==='FeatureCollection'?j:null}catch{return null}}
function allCoords(geometry:any):number[][]{if(!geometry)return[];const c=geometry.coordinates||[];if(geometry.type==='Polygon')return c.flat(1);if(geometry.type==='MultiPolygon')return c.flat(2);return[]}
function GeoPreview({raw,palette,valueProperty}:{raw:string;palette:string[];valueProperty?:string}){
  const geo=parseGeoJson(raw); if(!geo)return <div className="h-full min-h-72 grid place-items-center bg-[linear-gradient(#eee_1px,transparent_1px),linear-gradient(90deg,#eee_1px,transparent_1px)] bg-[size:24px_24px] text-center p-6 text-sm text-neutral-500">Cole GeoJSON ou consulte a GeoAPI para desenhar polígonos aqui.</div>;
  const coords=geo.features.flatMap((f:any)=>allCoords(f.geometry)); if(!coords.length)return <div className="p-6">GeoJSON sem Polygon/MultiPolygon.</div>;
  const xs=coords.map((p:any)=>Number(p[0])),ys=coords.map((p:any)=>Number(p[1]));const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const W=720,H=430,p=28;
  const project=(pt:any)=>[p+(Number(pt[0])-minX)/Math.max(.00001,maxX-minX)*(W-p*2),H-p-(Number(pt[1])-minY)/Math.max(.00001,maxY-minY)*(H-p*2)];
  const vals=geo.features.map((f:any)=>num(f.properties?.[valueProperty||''])); const vmax=Math.max(1,...vals.map(Math.abs));
  const paths=geo.features.flatMap((f:any,fi:number)=>{const polygons=f.geometry?.type==='Polygon'?[f.geometry.coordinates]:f.geometry?.type==='MultiPolygon'?f.geometry.coordinates:[];return polygons.map((poly:any,pi:number)=>{const rings=poly.map((ring:any)=>ring.map((pt:any,i:number)=>`${i?'L':'M'} ${project(pt)[0]} ${project(pt)[1]}`).join(' ')+' Z').join(' ');const index=valueProperty?Math.min(palette.length-1,Math.floor((Math.abs(vals[fi])/vmax)*(palette.length-1))):fi%palette.length;return <path key={`${fi}-${pi}`} d={rings} fill={palette[index]||'#1E7F78'} stroke="#fff" strokeWidth="1.5" opacity=".9"><title>{String(f.properties?.name||f.properties?.nome||f.properties?.NM_MUN||`Área ${fi+1}`)}</title></path>})});
  return <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-full bg-white">{paths}</svg>;
}

function formatRatio(format:DataInfographicFormat){return format==='vertical'?'9/16':format==='social'?'4/5':format==='slide'?'16/9':'1/1'}
function miniElement(el:DataStoryElement, rows:Row[], palette:string[], xField?:string,yField?:string){
  if(el.kind==='chart')return <ChartSvg rows={rows} type={el.chartType||'bar'} xField={xField} yField={yField} palette={palette} compact/>;
  if(el.kind==='divider')return <div className="w-full h-full grid place-items-center"><div className="w-full border-t-2" style={{borderColor:el.color||'#111'}}/></div>;
  if(el.kind==='shape')return <div className="w-full h-full rounded-2xl" style={{background:el.background||palette[0]}}/>;
  return <div className="w-full h-full whitespace-pre-wrap overflow-hidden" style={{fontSize:el.fontSize||18,color:el.color||'#111',background:el.background||'transparent',fontWeight:el.kind==='stat'?800:500,padding:4}}>{el.text|| (el.kind==='stat'?'42%':'Texto')}</div>
}

const CHARTS:{id:DataChartType;label:string;when:string}[]=[
  {id:'bar',label:'Barras',when:'comparar categorias'}, {id:'horizontal-bar',label:'Barras horizontais',when:'rótulos longos / ranking'},
  {id:'line',label:'Linha',when:'evolução no tempo'}, {id:'area',label:'Área',when:'volume ao longo do tempo'},
  {id:'pie',label:'Pizza',when:'partes de um todo com poucas categorias'}, {id:'donut',label:'Rosca',when:'proporções simples'},
  {id:'scatter',label:'Dispersão',when:'relação entre duas variáveis'}, {id:'bubble',label:'Bolhas',when:'relação + magnitude'},
  {id:'stacked',label:'Empilhado',when:'composição entre categorias'}, {id:'timeline',label:'Linha do tempo',when:'sequência cronológica'},
  {id:'radar',label:'Radar',when:'perfil multivariável'}, {id:'pictogram',label:'Pictograma',when:'proporções fáceis de ler'},
  {id:'gauge',label:'Gauge',when:'uma métrica contra uma meta'}, {id:'lollipop',label:'Lollipop',when:'ranking com menos peso visual'},
  {id:'funnel',label:'Funil',when:'etapas e perda entre estágios'}, {id:'heatmap',label:'Heatmap',when:'intensidade em matriz'}, {id:'treemap',label:'Treemap',when:'partes de um todo com muitas categorias'},
];

export function DataStoryPreview({document,className=''}:{document:DataStoryDocument;className?:string}){
  const rows=parseData(document.rawData);return <div className={`bg-white p-3 overflow-hidden ${className}`}><div className="text-[8px] font-mono text-neutral-500 uppercase">INFO DESIGN · STORYTELLING</div><b className="block text-sm mt-1 truncate">{document.title}</b><div className="mt-2 h-[calc(100%-2.5rem)]"><ChartSvg rows={rows} type={document.chartType} xField={document.xField} yField={document.yField} palette={document.palette} compact/></div></div>
}

export default function DataStoryStudio({document,title='Infodesign & Dados',canEdit=true,designSystem,visualIdentity,onSave,onClose}:Props){
  const base=blankDataStory(designSystem,visualIdentity);
  const [draft,setDraft]=useState<DataStoryDocument>({...base,...JSON.parse(JSON.stringify(document)),palette:document.palette?.length?document.palette:base.palette,questions:document.questions?.length?document.questions:base.questions,infographicElements:document.infographicElements||[]});
  const [tab,setTab]=useState<Tab>('data'); const [tipsOpen,setTipsOpen]=useState(false); const [error,setError]=useState(''); const [busy,setBusy]=useState(false); const [geoKey,setGeoKey]=useState(''); const [selectedEl,setSelectedEl]=useState<string|null>(null);
  const artboardRef=useRef<HTMLDivElement>(null);
  const rows=useMemo(()=>parseData(draft.rawData),[draft.rawData]); const columns=rows[0]?Object.keys(rows[0]):[];const numericColumns=columns.filter(k=>rows.some(r=>typeof r[k]==='number'||Number.isFinite(Number(r[k]))));
  const patch=(p:Partial<DataStoryDocument>)=>setDraft(d=>({...d,...p,updatedAt:new Date().toISOString()}));
  const addQuestion=()=>patch({questions:[...draft.questions,{id:uid('q'),prompt:'Nova pergunta sobre os dados',answer:''}]});
  const addElement=(kind:DataStoryElement['kind'])=>{const el:DataStoryElement={id:uid('el'),kind,x:8,y:8+draft.infographicElements.length*5,w:kind==='divider'?84:kind==='chart'?84:55,h:kind==='chart'?28:kind==='shape'?16:kind==='divider'?4:12,text:kind==='text'?'Título ou argumento':kind==='stat'?'42%':'',fontSize:kind==='stat'?32:18,color:'#171717',background:kind==='shape'?draft.palette[0]:'#ffffff',chartType:draft.chartType};patch({infographicElements:[...draft.infographicElements,el]});setSelectedEl(el.id)};
  const patchEl=(id:string,p:Partial<DataStoryElement>)=>patch({infographicElements:draft.infographicElements.map(el=>el.id===id?{...el,...p}:el)});
  const removeEl=(id:string)=>{patch({infographicElements:draft.infographicElements.filter(el=>el.id!==id)});setSelectedEl(null)};
  const startDrag=(e:React.PointerEvent,id:string)=>{if(!canEdit)return;const el=draft.infographicElements.find(x=>x.id===id);const box=artboardRef.current?.getBoundingClientRect();if(!el||!box)return;e.preventDefault();e.stopPropagation();setSelectedEl(id);const sx=e.clientX,sy=e.clientY,ox=el.x,oy=el.y;const move=(ev:PointerEvent)=>patchEl(id,{x:Math.max(0,Math.min(100-el.w,ox+(ev.clientX-sx)/box.width*100)),y:Math.max(0,Math.min(100-el.h,oy+(ev.clientY-sy)/box.height*100))});const up=()=>{window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up)};window.addEventListener('pointermove',move);window.addEventListener('pointerup',up)};
  const loadGeoApi=async()=>{if(!geoKey.trim())return setError('Cole temporariamente sua chave da GeoAPI. Ela não será salva no projeto.');setBusy(true);setError('');try{const r=await fetch(draft.geoApiPath||'https://geoapi.com.br/geo/states/RS',{headers:{Authorization:`Bearer ${geoKey.trim()}`}});const data=await r.json();if(!r.ok)throw new Error(data?.message||`GeoAPI ${r.status}`);patch({mapGeoJson:JSON.stringify(data,null,2)});}catch(e:any){setError(e?.message||'Não foi possível consultar a GeoAPI. Você também pode colar o GeoJSON manualmente.')}finally{setBusy(false)}};
  const generateAi=async()=>{if(!draft.aiPrompt?.trim())return setError('Diga à IA o que você quer descobrir ou comunicar.');setBusy(true);setError('');try{const s=await ensureTursoSession().catch(()=>null);const r=await fetch('/api/mediators/think',{method:'POST',headers:{'Content-Type':'application/json',...(s?.token?{Authorization:`Bearer ${s.token}`}:{})},body:JSON.stringify({mode:'data-story',prompt:draft.aiPrompt,goal:draft.goal,chartType:draft.chartType,columns,rows:rows.slice(0,80),questions:draft.questions})});const data=await r.json().catch(()=>({}));if(!r.ok||!data.dataStory)throw new Error(data.error||'A IA não conseguiu estruturar a narrativa.');const a=data.dataStory;const nextType=CHARTS.some(c=>c.id===a.recommendedChart)?a.recommendedChart:draft.chartType;patch({chartType:nextType,insight:a.insight||draft.insight,aiNotes:[a.headline,a.why,...(a.questions||[]),...(a.annotations||[])].filter(Boolean)});if(a.headline||a.insight){const additions:DataStoryElement[]=[];if(a.headline)additions.push({id:uid('el'),kind:'text',x:7,y:6,w:86,h:10,text:a.headline,fontSize:28,color:'#111'});if(a.insight)additions.push({id:uid('el'),kind:'text',x:7,y:17,w:86,h:10,text:a.insight,fontSize:14,color:'#444'});additions.push({id:uid('el'),kind:'chart',x:7,y:30,w:86,h:34,chartType:nextType});patch({infographicElements:[...draft.infographicElements,...additions],chartType:nextType,insight:a.insight||draft.insight,aiNotes:[a.headline,a.why,...(a.questions||[]),...(a.annotations||[])].filter(Boolean)});}}catch(e:any){setError(e?.message||'Falha ao gerar narrativa com IA.')}finally{setBusy(false)}};
  const selected=draft.infographicElements.find(el=>el.id===selectedEl);

  return <div className="fixed inset-0 z-[128] bg-[#EEEDE9] flex flex-col canvas-control atelier-studio" onPointerDown={e=>e.stopPropagation()}>
    <header className="shrink-0 bg-white border-b px-3 sm:px-5 pt-[max(.35rem,env(safe-area-inset-top))] pb-2">
      <div className="flex items-center gap-2"><button onClick={onClose} className="h-11 w-11 rounded-xl grid place-items-center"><X size={20}/></button><div className="min-w-0 flex-1"><b className="block truncate">{title}</b><div className="text-[9px] font-mono text-neutral-500 uppercase">dados · perguntas · gráficos · mapas · infográficos · IA</div></div><button onClick={()=>setTipsOpen(true)} className="h-11 w-11 rounded-xl border grid place-items-center" title="Dicas de visualização"><Info size={18}/></button><button disabled={!canEdit} onClick={()=>onSave({...draft,updatedAt:new Date().toISOString()})} className="h-11 px-4 rounded-xl bg-black text-white text-xs font-bold flex items-center gap-2"><Save size={15}/> SALVAR</button></div>
      <div className="mt-2 grid grid-cols-5 gap-1">{([['data','DADOS'],['charts','GRÁFICOS'],['maps','MAPAS'],['infographic','INFO'],['ai','+ IA']] as [Tab,string][]).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={`h-9 min-w-0 rounded-xl border text-[8px] sm:text-[9px] font-bold ${tab===id?'bg-black text-white':'bg-white'}`}>{label}</button>)}</div>
    </header>

    <StudioWorkspace tools={<div className="p-4 space-y-4">
      {tab==='data'&&<>
        <div className="rounded-2xl border bg-white p-4"><b>1. Pergunta antes do gráfico</b><textarea value={draft.goal} onChange={e=>patch({goal:e.target.value})} className="mt-2 min-h-24 w-full rounded-xl border p-3 text-sm"/><div className="mt-3 space-y-2">{draft.questions.map(q=><div key={q.id} className="rounded-xl border p-3"><input value={q.prompt} onChange={e=>patch({questions:draft.questions.map(x=>x.id===q.id?{...x,prompt:e.target.value}:x)})} className="w-full font-semibold text-xs outline-none"/><textarea value={q.answer||''} onChange={e=>patch({questions:draft.questions.map(x=>x.id===q.id?{...x,answer:e.target.value}:x)})} placeholder="Anote sua resposta ou hipótese..." className="mt-2 min-h-14 w-full rounded-lg bg-neutral-50 p-2 text-xs"/></div>)}</div><button onClick={addQuestion} className="mt-2 h-9 px-3 rounded-xl border text-xs"><Plus size={13} className="inline mr-1"/> PERGUNTA</button></div>
        <div className="rounded-2xl border bg-white p-4"><b>2. Dados</b><p className="text-[10px] text-neutral-500 mt-1">Cole CSV, TSV ou JSON. O preview é gerado localmente.</p><textarea value={draft.rawData} onChange={e=>patch({rawData:e.target.value})} className="mt-2 min-h-56 w-full rounded-xl border p-3 font-mono text-xs"/><div className="mt-2 text-[9px] text-neutral-500">{rows.length} linhas · {columns.length} colunas</div></div>
      </>}
      {tab==='charts'&&<>
        <div className="rounded-2xl border bg-white p-4"><b>Escolha pelo argumento</b><div className="mt-3 grid grid-cols-2 gap-2">{CHARTS.map(c=><button key={c.id} onClick={()=>patch({chartType:c.id})} className={`rounded-xl border p-3 text-left ${draft.chartType===c.id?'ring-2 ring-black bg-neutral-50':''}`}><b className="block text-xs">{c.label}</b><span className="text-[9px] text-neutral-500">{c.when}</span></button>)}</div></div>
        <div className="rounded-2xl border bg-white p-4 space-y-3"><b>Mapeamento dos campos</b><label className="block text-[9px] font-mono uppercase">Categoria / eixo X<select value={draft.xField||''} onChange={e=>patch({xField:e.target.value})} className="mt-1 h-10 w-full rounded-xl border px-3 bg-white">{columns.map(c=><option key={c}>{c}</option>)}</select></label><label className="block text-[9px] font-mono uppercase">Valor / eixo Y<select value={draft.yField||''} onChange={e=>patch({yField:e.target.value})} className="mt-1 h-10 w-full rounded-xl border px-3 bg-white">{numericColumns.map(c=><option key={c}>{c}</option>)}</select></label><div><div className="text-[9px] font-mono uppercase">Paleta</div><div className="mt-2 flex flex-wrap gap-2">{draft.palette.map((c,i)=><input key={i} type="color" value={c} onChange={e=>patch({palette:draft.palette.map((x,j)=>j===i?e.target.value:x)})} className="h-9 w-9 rounded-lg border bg-white"/>)}</div></div></div>
      </>}
      {tab==='maps'&&<>
        <div className="rounded-2xl border bg-white p-4"><div className="flex items-center gap-2"><Map size={16}/><b>GeoAPI · teste visual</b></div><p className="mt-1 text-[10px] text-neutral-500">A chave é usada apenas nesta sessão do navegador e não é salva no projeto.</p><input value={draft.geoApiPath||''} onChange={e=>patch({geoApiPath:e.target.value})} className="mt-3 h-10 w-full rounded-xl border px-3 text-xs" placeholder="https://geoapi.com.br/geo/states/RS"/><input type="password" value={geoKey} onChange={e=>setGeoKey(e.target.value)} className="mt-2 h-10 w-full rounded-xl border px-3 text-xs" placeholder="Bearer API key temporária"/><button disabled={busy} onClick={loadGeoApi} className="mt-2 h-10 w-full rounded-xl bg-black text-white text-xs font-bold">{busy?'CARREGANDO...':'BUSCAR GEOJSON'}</button></div>
        <div className="rounded-2xl border bg-white p-4"><b>GeoJSON editável</b><textarea value={draft.mapGeoJson||''} onChange={e=>patch({mapGeoJson:e.target.value})} className="mt-2 min-h-52 w-full rounded-xl border p-3 font-mono text-[10px]" placeholder='{"type":"FeatureCollection","features":[]}'/><label className="mt-2 block text-[9px] font-mono uppercase">Propriedade numérica para cor<input value={draft.mapValueProperty||''} onChange={e=>patch({mapValueProperty:e.target.value})} className="mt-1 h-10 w-full rounded-xl border px-3" placeholder="population, valor, taxa..."/></label></div>
        <div className="rounded-2xl border bg-white p-4"><b>Metabase · incorporar painel</b><p className="mt-1 text-[10px] text-neutral-500">Cole uma URL pública/embutível da sua instância. Painéis privados podem exigir configuração de embedding/autenticação no Metabase.</p><input value={draft.metabaseUrl||''} onChange={e=>patch({metabaseUrl:e.target.value})} className="mt-2 h-10 w-full rounded-xl border px-3 text-xs" placeholder="https://seu-metabase/..."/></div>
      </>}
      {tab==='infographic'&&<>
        <div className="rounded-2xl border bg-white p-4"><b>Formato livre</b><div className="mt-3 grid grid-cols-2 gap-2">{([['vertical','Infográfico 9:16'],['social','Post 4:5'],['square','Quadrado'],['slide','Slide 16:9']] as [DataInfographicFormat,string][]).map(([id,label])=><button key={id} onClick={()=>patch({infographicFormat:id})} className={`h-10 rounded-xl border text-xs ${draft.infographicFormat===id?'bg-black text-white':''}`}>{label}</button>)}</div></div>
        <div className="rounded-2xl border bg-white p-4"><b>Adicionar ao espaço</b><div className="mt-3 grid grid-cols-2 gap-2"><button onClick={()=>addElement('text')} className="h-10 rounded-xl border text-xs"><Type size={13} className="inline mr-1"/>TEXTO</button><button onClick={()=>addElement('stat')} className="h-10 rounded-xl border text-xs"># NÚMERO</button><button onClick={()=>addElement('chart')} className="h-10 rounded-xl border text-xs"><Database size={13} className="inline mr-1"/>GRÁFICO</button><button onClick={()=>addElement('shape')} className="h-10 rounded-xl border text-xs">FORMA</button><button onClick={()=>addElement('divider')} className="h-10 rounded-xl border text-xs">LINHA</button></div></div>
        {selected&&<div className="rounded-2xl border bg-white p-4 space-y-2"><div className="flex justify-between"><b>Elemento selecionado</b><button onClick={()=>removeEl(selected.id)} className="text-red-600"><Trash2 size={15}/></button></div>{selected.kind!=='chart'&&selected.kind!=='shape'&&selected.kind!=='divider'&&<textarea value={selected.text||''} onChange={e=>patchEl(selected.id,{text:e.target.value})} className="w-full rounded-xl border p-2 text-xs"/>}<label className="block text-[9px] font-mono uppercase">Largura {Math.round(selected.w)}<input type="range" min="8" max="100" value={selected.w} onChange={e=>patchEl(selected.id,{w:Number(e.target.value)})} className="w-full"/></label><label className="block text-[9px] font-mono uppercase">Altura {Math.round(selected.h)}<input type="range" min="3" max="70" value={selected.h} onChange={e=>patchEl(selected.id,{h:Number(e.target.value)})} className="w-full"/></label>{selected.kind==='chart'&&<select value={selected.chartType||draft.chartType} onChange={e=>patchEl(selected.id,{chartType:e.target.value as DataChartType})} className="h-10 w-full rounded-xl border px-2">{CHARTS.map(c=><option key={c.id} value={c.id}>{c.label}</option>)}</select>}</div>}
      </>}
      {tab==='ai'&&<div className="rounded-2xl border-2 border-black bg-white p-4 space-y-3"><div className="flex items-center gap-2"><Sparkles size={17}/><b>IA para perguntar, não decorar</b></div><p className="text-xs text-neutral-600">A IA recebe uma amostra dos dados e sugere pergunta, argumento, visualização e sequência narrativa. O resultado continua editável.</p><div className="flex gap-2"><textarea value={draft.aiPrompt||''} onChange={e=>patch({aiPrompt:e.target.value})} className="min-h-32 flex-1 rounded-xl border p-3 text-sm" placeholder="Ex.: encontre a principal mudança, questione possíveis vieses e proponha uma narrativa de 4 blocos para um infográfico..."/><VoiceDictationButton onText={t=>patch({aiPrompt:`${draft.aiPrompt||''}${draft.aiPrompt?' ':''}${t}`})}/></div><button disabled={busy} onClick={generateAi} className="h-12 w-full rounded-xl bg-black text-white font-bold text-xs flex items-center justify-center gap-2">{busy?<Loader2 size={14} className="animate-spin"/>:<Sparkles size={14}/>} GERAR DIREÇÃO DE DADOS</button>{draft.aiNotes?.length?<div className="rounded-xl bg-neutral-50 p-3 space-y-1">{draft.aiNotes.map((n,i)=><div key={i} className="text-[10px]">• {n}</div>)}</div>:null}</div>}
      {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
    </div>}>
      <main className="h-full min-h-[60vh] overflow-auto p-4 sm:p-6">
        {tab==='maps'?<div className="mx-auto max-w-5xl space-y-4"><div className="rounded-3xl border bg-white overflow-hidden min-h-[420px]"><GeoPreview raw={draft.mapGeoJson||''} palette={draft.palette} valueProperty={draft.mapValueProperty}/></div>{draft.metabaseUrl&&<div className="rounded-3xl border bg-white overflow-hidden h-[520px]"><iframe src={draft.metabaseUrl} title="Metabase" className="w-full h-full border-0"/></div>}</div>:tab==='infographic'?<div className="mx-auto max-w-5xl"><div ref={artboardRef} className="relative mx-auto bg-white border shadow-sm overflow-hidden" style={{aspectRatio:formatRatio(draft.infographicFormat),width:draft.infographicFormat==='slide'?'min(100%,900px)':'min(100%,560px)'}} onPointerDown={()=>setSelectedEl(null)}>{draft.infographicElements.length===0&&<div className="absolute inset-0 grid place-items-center p-8 text-center text-neutral-400"><div><Layers3 size={34} className="mx-auto mb-3"/><b className="block text-neutral-500">Espaço livre</b><span className="text-xs">Adicione texto, números, gráficos e formas; arraste para compor.</span></div></div>}{draft.infographicElements.map(el=><div key={el.id} onPointerDown={e=>startDrag(e,el.id)} className={`absolute overflow-hidden ${selectedEl===el.id?'ring-2 ring-black ring-offset-2':''}`} style={{left:`${el.x}%`,top:`${el.y}%`,width:`${el.w}%`,height:`${el.h}%`,touchAction:'none',cursor:'move'}}><div className="absolute right-1 top-1 z-10 rounded bg-white/80 p-1"><MoveDiagonal2 size={11}/></div>{miniElement(el,rows,draft.palette,draft.xField,draft.yField)}</div>)}</div></div>:<div className="mx-auto max-w-5xl"><div className="rounded-3xl border bg-white p-3 sm:p-5 min-h-[460px]"><ChartSvg rows={rows} type={draft.chartType} xField={draft.xField} yField={draft.yField} palette={draft.palette}/></div>{draft.insight&&<div className="mt-4 rounded-2xl bg-black text-white p-5"><div className="text-[9px] font-mono uppercase text-white/60">INSIGHT / ARGUMENTO</div><div className="mt-2 text-xl font-semibold">{draft.insight}</div></div>}</div>}
      </main>
    </StudioWorkspace>

    {tipsOpen&&<div className="fixed inset-0 z-[140] bg-black/50 p-3 sm:p-8 grid place-items-center" onClick={()=>setTipsOpen(false)}><div className="w-full max-w-3xl max-h-[88vh] overflow-y-auto rounded-3xl bg-white p-5 sm:p-7" onClick={e=>e.stopPropagation()}><div className="flex justify-between gap-3"><div><div className="text-[9px] font-mono uppercase text-neutral-500">GUIA RÁPIDO</div><h2 className="text-2xl font-bold">Qual visualização usar?</h2></div><button onClick={()=>setTipsOpen(false)} className="h-10 w-10 rounded-xl border grid place-items-center"><X size={18}/></button></div><div className="mt-5 grid sm:grid-cols-2 gap-3">{CHARTS.map(c=><div key={c.id} className="rounded-2xl border p-4"><b>{c.label}</b><div className="text-xs text-neutral-600 mt-1">Use para {c.when}.</div></div>)}</div><div className="mt-4 rounded-2xl bg-neutral-100 p-4 text-sm space-y-2"><b>Antes de desenhar</b><p>Mostre unidade, fonte, período e denominador. Destaque incerteza e não use área/volume para exagerar diferenças.</p><p><b>Mapas:</b> coropléticos funcionam melhor com taxas/percentuais; valores absolutos costumam pedir símbolos proporcionais.</p><p><b>Storytelling:</b> organize uma sequência: pergunta → evidência → comparação → exceção → implicação. Não obrigue o dado a provar uma hipótese.</p><p className="text-xs text-neutral-500">Referências úteis: Edward Tufte, Alberto Cairo, Cole Nussbaumer Knaflic e Giorgia Lupi.</p></div></div></div>}
  </div>
}
