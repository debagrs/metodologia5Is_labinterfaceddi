import React, { useMemo, useRef, useState } from 'react';
import { Download, ExternalLink, Film, Loader2, Play, Save, Upload, WandSparkles, X } from 'lucide-react';
import { DesignSystemDocument, VideoDocument, VideoFormatPreset } from '../types';
import { ensureTursoSession } from '../lib/turso';

interface VideoStudioProps {
  document: VideoDocument;
  designSystem?: DesignSystemDocument;
  title?: string;
  canEdit?: boolean;
  onSave: (document: VideoDocument) => void;
  onClose: () => void;
}

const FORMATS: Array<{ id: VideoFormatPreset; label: string; hint: string; width: number; height: number }> = [
  { id: 'reel', label: 'Reels / Shorts', hint: 'Instagram · YouTube', width: 1080, height: 1920 },
  { id: 'tiktok', label: 'TikTok', hint: 'vertical 9:16', width: 1080, height: 1920 },
  { id: 'story', label: 'Stories', hint: 'Instagram · Facebook · Snapchat', width: 1080, height: 1920 },
  { id: 'feed', label: 'Feed 4:5', hint: 'Instagram · LinkedIn', width: 1080, height: 1350 },
  { id: 'square', label: 'Quadrado', hint: 'cards sociais', width: 1080, height: 1080 },
  { id: 'youtube', label: 'YouTube', hint: 'horizontal 16:9', width: 1920, height: 1080 },
  { id: 'facebook', label: 'Facebook', hint: 'landscape', width: 1200, height: 630 },
  { id: 'linkedin', label: 'LinkedIn', hint: 'post visual', width: 1200, height: 1200 },
];

export const blankVideo = (designSystem?: DesignSystemDocument): VideoDocument => ({
  title: 'Vídeo do projeto',
  subtitle: 'Uma ideia pode ganhar tempo, movimento e circulação.',
  format: 'reel',
  width: 1080,
  height: 1920,
  duration: 6,
  background: designSystem?.colors.find((item)=>item.role==='brand')?.value || '#111111',
  accent: designSystem?.colors.find((item)=>item.role==='accent')?.value || '#FF13F0',
  prompt: '',
});

const safeScale = (width: number, height: number, maxW = 520, maxH = 620) => Math.min(maxW / width, maxH / height, 1);

export function VideoPreview({ document, className = '' }: { document: VideoDocument; className?: string }) {
  const url = document.generatedUrl || document.sourceUrl;
  if (url) return <video src={url} controls playsInline className={`bg-black object-contain ${className}`} />;
  return (
    <div className={`flex items-center justify-center text-white p-4 ${className}`} style={{background:document.background}}>
      <div className="text-center max-w-[85%]"><div className="text-xl font-bold">{document.title}</div><div className="mt-2 text-xs opacity-70">{document.subtitle}</div><div className="mt-4 h-1 w-16 mx-auto rounded-full" style={{background:document.accent}}/></div>
    </div>
  );
}

export default function VideoStudio({ document, designSystem, title = 'Vídeo', canEdit = true, onSave, onClose }: VideoStudioProps) {
  const [draft, setDraft] = useState<VideoDocument>(()=>JSON.parse(JSON.stringify(document)));
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewScale = useMemo(()=>safeScale(draft.width,draft.height),[draft.width,draft.height]);

  const chooseFormat = (id: VideoFormatPreset) => {
    const format = FORMATS.find((item)=>item.id===id);
    if (!format) return;
    setDraft((current)=>({...current,format:id,width:format.width,height:format.height}));
  };

  const uploadBlob = async (blob: Blob, name: string) => {
    const session = await ensureTursoSession();
    const response = await fetch('/api/upload', { method:'POST', headers:{ 'Content-Type':blob.type || 'video/webm','X-File-Name':encodeURIComponent(name), ...(session?.token?{Authorization:`Bearer ${session.token}`}:{}) }, body:blob });
    const data = await response.json().catch(()=>({}));
    if (!response.ok || !data.url) throw new Error(data.error || 'Não foi possível salvar o vídeo.');
    return data.url as string;
  };

  const uploadVideo = async (file: File) => {
    if (!canEdit) return;
    if (!file.type.startsWith('video/')) { setError('Escolha um arquivo de vídeo.'); return; }
    setIsUploading(true); setError('');
    try {
      const url = await uploadBlob(file, file.name);
      setDraft((current)=>({...current,sourceUrl:url,sourceName:file.name,generatedUrl:undefined}));
    } catch (err:any) { setError(err?.message || 'Falha no upload.'); }
    finally { setIsUploading(false); if(fileRef.current) fileRef.current.value=''; }
  };

  const generateMotionVideo = async () => {
    if (!canEdit) return;
    const canvas = canvasRef.current;
    if (!canvas || typeof MediaRecorder === 'undefined' || !(canvas as any).captureStream) {
      setError('Este navegador não oferece geração local de vídeo WebM. Tente Chrome/Edge desktop ou Android atualizado.');
      return;
    }
    setIsGenerating(true); setError('');
    try {
      const outW = draft.width >= draft.height ? 960 : 540;
      const outH = Math.round(outW * draft.height / draft.width);
      canvas.width = outW; canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas de vídeo indisponível.');
      const stream = (canvas as any).captureStream(30);
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      const recorder = new MediaRecorder(stream, { mimeType:mime, videoBitsPerSecond:2_500_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (event)=>{ if(event.data.size) chunks.push(event.data); };
      const stopped = new Promise<void>((resolve,reject)=>{ recorder.onstop=()=>resolve(); recorder.onerror=()=>reject(new Error('Falha ao gravar o motion.')); });
      recorder.start(250);
      const durationMs = Math.max(2,Math.min(12,draft.duration || 6))*1000;
      const started = performance.now();
      const family = designSystem?.primaryFont || 'Inter';
      const draw = (now:number) => {
        const t = Math.min(1,(now-started)/durationMs);
        ctx.fillStyle=draft.background; ctx.fillRect(0,0,outW,outH);
        const pulse = 0.5 + 0.5*Math.sin(t*Math.PI*4);
        const cx=outW*.5, cy=outH*.52;
        for(let i=0;i<18;i++){
          const angle=(Math.PI*2*i/18)+t*Math.PI*.8;
          const radius=Math.min(outW,outH)*(.18+.055*Math.sin(t*Math.PI*2+i));
          const x=cx+Math.cos(angle)*radius, y=cy+Math.sin(angle)*radius;
          ctx.globalAlpha=.12+.18*pulse; ctx.fillStyle=draft.accent; ctx.beginPath(); ctx.arc(x,y,6+(i%3)*4,0,Math.PI*2); ctx.fill();
        }
        ctx.globalAlpha=1;
        const enter=Math.min(1,t/.22); const exit=Math.min(1,(1-t)/.16); const alpha=Math.min(enter,exit);
        ctx.globalAlpha=alpha; ctx.fillStyle='#FFFFFF'; ctx.textAlign='center';
        ctx.font=`700 ${Math.round(outW*.075)}px ${family}, Arial, sans-serif`; wrapText(ctx,draft.title,cx,cy-outH*.05,outW*.78,outW*.085);
        ctx.font=`400 ${Math.round(outW*.032)}px ${family}, Arial, sans-serif`; ctx.globalAlpha=alpha*.75; wrapText(ctx,draft.subtitle||'',cx,cy+outH*.10,outW*.72,outW*.045);
        ctx.globalAlpha=1; ctx.fillStyle=draft.accent; ctx.fillRect(cx-outW*.12,cy+outH*.18,outW*.24,Math.max(5,outH*.004));
        if(t<1) requestAnimationFrame(draw); else recorder.stop();
      };
      requestAnimationFrame(draw);
      await stopped;
      const blob = new Blob(chunks,{type:'video/webm'});
      const url = await uploadBlob(blob,`motion-${Date.now()}.webm`);
      setDraft((current)=>({...current,generatedUrl:url,sourceName:'motion gerado no Ateliê'}));
    } catch (err:any) { setError(err?.message || 'Não foi possível gerar o vídeo.'); }
    finally { setIsGenerating(false); }
  };

  const downloadGenerated = () => {
    const url = draft.generatedUrl || draft.sourceUrl;
    if (!url) return;
    const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.download='video-5is.webm'; document.body.appendChild(a); a.click(); a.remove();
  };

  return (
    <div className="fixed inset-0 z-[125] bg-[#EEEDE9] flex flex-col canvas-control" onPointerDown={(event)=>event.stopPropagation()}>
      <header className="shrink-0 min-h-16 bg-white border-b border-black/10 px-3 sm:px-5 flex items-center gap-3" style={{paddingTop:'max(.35rem, env(safe-area-inset-top))'}}>
        <button type="button" onClick={onClose} className="h-11 w-11 rounded-xl hover:bg-black/5 flex items-center justify-center" aria-label="Fechar Vídeo"><X size={19}/></button>
        <div className="min-w-0 flex-1"><div className="font-bold truncate">{title}</div><div className="text-[10px] font-mono text-neutral-500 uppercase">vídeo · motion · formatos sociais · publicação</div></div>
        <button type="button" disabled={!canEdit} onClick={()=>onSave(draft)} className="h-11 px-4 rounded-xl bg-black text-white flex items-center gap-2 text-xs font-bold disabled:opacity-40"><Save size={15}/> SALVAR</button>
      </header>
      <main className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[420px_minmax(0,1fr)]">
        <section className="min-h-0 overflow-y-auto bg-white border-b xl:border-b-0 xl:border-r border-black/10 p-4 sm:p-5 space-y-5">
          <div><div className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Formato de saída</div><div className="mt-2 grid grid-cols-2 gap-2">{FORMATS.map((format)=><button key={format.id} type="button" onClick={()=>chooseFormat(format.id)} className={`rounded-xl border p-3 text-left ${draft.format===format.id?'bg-black text-white border-black':'border-black/10'}`}><div className="text-[11px] font-bold">{format.label}</div><div className={`text-[9px] mt-1 ${draft.format===format.id?'text-white/60':'text-neutral-400'}`}>{format.hint} · {format.width}×{format.height}</div></button>)}</div></div>
          <div className="rounded-2xl border border-black/10 p-4 space-y-3"><div className="text-sm font-bold">Conteúdo do motion</div><label className="block text-[9px] font-mono text-neutral-500">TÍTULO<input value={draft.title} onChange={(e)=>setDraft({...draft,title:e.target.value})} className="mt-1 h-11 w-full rounded-xl border border-black/10 px-3 text-black"/></label><label className="block text-[9px] font-mono text-neutral-500">SUBTÍTULO<textarea value={draft.subtitle||''} onChange={(e)=>setDraft({...draft,subtitle:e.target.value})} className="mt-1 min-h-20 w-full rounded-xl border border-black/10 p-3 text-black"/></label><div className="grid grid-cols-2 gap-2"><label className="text-[9px] font-mono text-neutral-500">FUNDO<input type="color" value={draft.background} onChange={(e)=>setDraft({...draft,background:e.target.value})} className="mt-1 h-11 w-full"/></label><label className="text-[9px] font-mono text-neutral-500">DESTAQUE<input type="color" value={draft.accent} onChange={(e)=>setDraft({...draft,accent:e.target.value})} className="mt-1 h-11 w-full"/></label></div><label className="block text-[9px] font-mono text-neutral-500">DURAÇÃO · {draft.duration}s<input type="range" min={2} max={12} value={draft.duration} onChange={(e)=>setDraft({...draft,duration:Number(e.target.value)})} className="mt-1 w-full h-8"/></label></div>
          <div className="rounded-2xl border border-black/10 p-4"><div className="text-sm font-bold flex items-center gap-2"><Film size={16}/> Inserir vídeo existente</div><input ref={fileRef} type="file" accept="video/*" className="hidden" onChange={(e)=>{const f=e.target.files?.[0];if(f)void uploadVideo(f)}}/><button type="button" disabled={isUploading} onClick={()=>fileRef.current?.click()} className="mt-3 w-full h-11 rounded-xl border border-black flex items-center justify-center gap-2 text-[10px] font-mono font-bold disabled:opacity-50">{isUploading?<Loader2 size={15} className="animate-spin"/>:<Upload size={15}/>} UPLOAD</button><div className="mt-2 text-[9px] text-neutral-500">Uploads grandes podem depender do limite do provedor. Para vídeos pesados, use uma URL pública e deixe o projeto referenciá-la.</div><input value={draft.sourceUrl||''} onChange={(e)=>setDraft({...draft,sourceUrl:e.target.value})} placeholder="https://.../video.mp4" className="mt-3 h-10 w-full rounded-xl border border-black/10 px-3 text-xs"/></div>
          <div className="rounded-2xl border-2 border-black p-4"><div className="text-sm font-bold flex items-center gap-2"><WandSparkles size={16}/> Gerar motion dentro do Ateliê</div><div className="mt-1 text-[10px] leading-relaxed text-neutral-500">Gera localmente um vídeo WebM curto com o formato, cores e conteúdo acima. Não depende de uma API externa de vídeo.</div><button type="button" disabled={isGenerating} onClick={()=>void generateMotionVideo()} className="mt-3 w-full min-h-12 rounded-xl bg-black text-white flex items-center justify-center gap-2 text-[11px] font-bold disabled:opacity-50">{isGenerating?<Loader2 size={16} className="animate-spin"/>:<Play size={16}/>} {isGenerating?'GERANDO E ENVIANDO…':'GERAR VÍDEO EXPERIMENTAL'}</button>{(draft.generatedUrl||draft.sourceUrl)&&<button type="button" onClick={downloadGenerated} className="mt-2 w-full h-10 rounded-xl border border-black flex items-center justify-center gap-2 text-[10px] font-mono"><Download size={14}/> ABRIR / BAIXAR</button>}</div>
          <label className="block"><span className="text-[9px] font-mono font-bold uppercase tracking-widest text-neutral-500">Prompt / roteiro para geradores externos</span><textarea value={draft.prompt||''} onChange={(e)=>setDraft({...draft,prompt:e.target.value})} placeholder="Ex.: vídeo vertical de 8 segundos, câmera aproxima lentamente..." className="mt-2 min-h-28 w-full rounded-xl border border-black/10 p-3 text-sm"/></label>
          {error&&<div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}
        </section>
        <section className="min-h-[50vh] xl:min-h-0 overflow-auto p-4 sm:p-7 flex flex-col items-center justify-center gap-4">
          <div className="text-[9px] font-mono text-neutral-500">PRÉVIA · {draft.width}×{draft.height}</div>
          <div className="overflow-hidden rounded-2xl border border-black/10 shadow-2xl bg-black" style={{width:draft.width*previewScale,height:draft.height*previewScale,maxWidth:'92vw'}}><VideoPreview document={draft} className="w-full h-full"/></div>
          {(draft.generatedUrl||draft.sourceUrl)&&<a href={draft.generatedUrl||draft.sourceUrl} target="_blank" rel="noreferrer" className="h-10 px-3 rounded-xl bg-white border border-black/10 flex items-center gap-2 text-[10px] font-mono"><ExternalLink size={14}/> ABRIR VÍDEO</a>}
          <canvas ref={canvasRef} className="hidden"/>
        </section>
      </main>
    </div>
  );
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words=String(text||'').split(/\s+/); const lines:string[]=[]; let line='';
  for(const word of words){const test=line?`${line} ${word}`:word;if(ctx.measureText(test).width>maxWidth&&line){lines.push(line);line=word}else line=test} if(line)lines.push(line);
  const start=y-((lines.length-1)*lineHeight)/2; lines.slice(0,4).forEach((value,index)=>ctx.fillText(value,x,start+index*lineHeight));
}
