import type { CharacterAppearance, CharacterExpression, CharacterPoseKind, CharacterSpriteDocument, CharacterView } from '../types';
import { selectedStyleVariant, styledAppearance } from './characterStyles';

const esc = (value: string) => String(value || '').replace(/[&<>"']/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char] || char));
const hex = (value: string | undefined, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(value || '')) ? String(value) : fallback;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function shade(value: string, amount: number) {
  const base = hex(value, '#777777');
  const channels = [1,3,5].map((index) => clamp(parseInt(base.slice(index,index+2),16) + amount, 0, 255));
  return `#${channels.map(v => Math.round(v).toString(16).padStart(2,'0')).join('')}`;
}

function pixelFace(a: CharacterAppearance, expression: CharacterExpression, x: number, y: number, scale = 1) {
  const skin = hex(a.skinColor || a.surfaceColor, '#D5A27C');
  const eye = hex(a.eyeColor, '#2D251F');
  const line = a.strokeEnabled === false ? 'none' : hex(a.lineColor, '#171717');
  const hair = hex(a.hairColor, '#2B211C');
  const variant = selectedStyleVariant(a);
  const low = variant.id === 'pixel-art-16' || (a.pixelResolution || 32) <= 16;
  const high = variant.id === 'pixel-art-64' || (a.pixelResolution || 32) >= 64;
  const eyeY = y + 18 * scale;
  const happy = expression === 'happy' || expression === 'laughing';
  const sad = expression === 'sad' || expression === 'worried';
  const animal = (a.species || 'human') !== 'human' && (a.species || '') !== 'anthropomorphic';
  const radius = low ? 0 : high ? 2 * scale : 1 * scale;
  let out = `<rect x="${x}" y="${y}" width="${40*scale}" height="${42*scale}" rx="${radius}" fill="${skin}"${(a.pixelOutline === false || a.strokeEnabled === false) ? '' : ` stroke="${line}" stroke-width="${Math.max(1, scale)}"`}/>`;
  if (!animal && a.hairStyle !== 'none') {
    out += `<rect x="${x}" y="${y}" width="${40*scale}" height="${10*scale}" fill="${hair}"/>`;
    out += `<rect x="${x}" y="${y+8*scale}" width="${8*scale}" height="${12*scale}" fill="${hair}"/>`;
  }
  if (animal && (a.earStyle || 'none') !== 'none') {
    const ear = hex(a.earColor || a.surfaceColor || a.skinColor, skin);
    out += `<rect x="${x-4*scale}" y="${y+6*scale}" width="${8*scale}" height="${12*scale}" fill="${ear}"/><rect x="${x+36*scale}" y="${y+6*scale}" width="${8*scale}" height="${12*scale}" fill="${ear}"/>`;
  }
  const eyeW = low ? 4*scale : a.eyeStyle === 'large' ? 8*scale : high ? 6*scale : 5*scale;
  const eyeH = low ? 4*scale : high ? 6*scale : 5*scale;
  out += `<rect x="${x+8*scale}" y="${eyeY}" width="${eyeW}" height="${eyeH}" fill="${eye}"/><rect x="${x+27*scale}" y="${eyeY}" width="${eyeW}" height="${eyeH}" fill="${eye}"/>`;
  if (high) out += `<rect x="${x+9*scale}" y="${eyeY+scale}" width="${Math.max(scale,2)}" height="${Math.max(scale,2)}" fill="#fff"/><rect x="${x+28*scale}" y="${eyeY+scale}" width="${Math.max(scale,2)}" height="${Math.max(scale,2)}" fill="#fff"/>`;
  if ((a.muzzleStyle || 'none') !== 'none' && animal) {
    const muzzle = hex(a.noseColor || a.surfaceColor, shade(skin,-20));
    out += `<rect x="${x+14*scale}" y="${y+24*scale}" width="${16*scale}" height="${9*scale}" fill="${muzzle}"/>`;
  } else if (!low) {
    out += `<rect x="${x+19*scale}" y="${y+24*scale}" width="${high ? 4*scale : 3*scale}" height="${high ? 6*scale : 5*scale}" fill="${shade(skin,-35)}"/>`;
  }
  const mouthY = y + 34 * scale;
  const mouthW = happy ? 12 : sad ? 8 : 9;
  out += `<rect x="${x+(40-mouthW)*scale/2}" y="${mouthY}" width="${mouthW*scale}" height="${sad?2:3}*${scale}" fill="${hex(a.mouthColor,line)}"/>`.replace(`height="${sad?2:3}*${scale}"`, `height="${(sad?2:3)*scale}"`);
  if ((a.accessory === 'glasses' || a.visionAid === 'dark-glasses')) {
    out += `<rect x="${x+5*scale}" y="${y+14*scale}" width="${14*scale}" height="${11*scale}" fill="none" stroke="${line}" stroke-width="${2*scale}"/><rect x="${x+22*scale}" y="${y+14*scale}" width="${14*scale}" height="${11*scale}" fill="none" stroke="${line}" stroke-width="${2*scale}"/><rect x="${x+18*scale}" y="${y+18*scale}" width="${5*scale}" height="${2*scale}" fill="${line}"/>`;
  }
  return out;
}

function pixelBiped(document: CharacterSpriteDocument, expression: CharacterExpression, pose: CharacterPoseKind) {
  const a = document.appearance!;
  const skin = hex(a.skinColor || a.surfaceColor, '#D5A27C');
  const shirt = hex(a.outfitPrimary, '#2A877E');
  const pants = hex(a.outfitSecondary, '#303B4B');
  const line = a.strokeEnabled === false ? 'none' : hex(a.lineColor, '#171717');
  const age = a.ageGroup || 'adult';
  const ageHeadScale = age === 'baby' ? 1.28 : age === 'child' ? 1.16 : age === 'teen' ? 1.06 : age === 'older-adult' ? .99 : 1;
  const ageBodyScale = age === 'baby' ? .66 : age === 'child' ? .8 : age === 'teen' ? .92 : age === 'older-adult' ? .96 : 1;
  const headScale = ageHeadScale * clamp(5.2 / Math.max(2.8, a.headToBodyRatio || 5.7), .86, 1.18);
  const headW = 40 * headScale;
  const x = 80 - headW / 2;
  const headY = 18;
  const torsoY = headY + 43 * headScale + 4;
  const torsoH = 48 * ageBodyScale;
  const armH = 42 * Math.max(.64, ageBodyScale * (a.limbLength || 1));
  const legH = 58 * Math.max(.56, ageBodyScale * (a.limbLength || 1));
  const legY = torsoY + torsoH;
  const footY = legY + legH - 2;
  const bodyWidth = clamp(34 * (a.bodyWidth || 1) * (age === 'baby' ? .9 : 1), 22, 50);
  const shoulder = clamp(12 * (a.shoulderWidth || 1), 7, 19);
  const legShift = pose === 'walk' || pose === 'run' ? 7 : 0;
  const armShift = pose === 'wave' ? 18 : pose === 'run' ? 7 : 0;
  let out = pixelFace(a, expression, x, headY, headScale);
  out += `<rect x="${80-bodyWidth/2}" y="${torsoY}" width="${bodyWidth}" height="${torsoH}" fill="${a.outfitStyle === 'none' ? skin : shirt}"/>`;
  out += `<rect x="${80-bodyWidth/2-8}" y="${torsoY+4-armShift}" width="8" height="${armH}" fill="${skin}"/><rect x="${80+bodyWidth/2}" y="${torsoY+4+armShift*.25}" width="8" height="${armH}" fill="${skin}"/>`;
  out += `<rect x="${80-bodyWidth/2-10}" y="${torsoY}" width="${10+shoulder/2}" height="${Math.max(11,16*ageBodyScale)}" fill="${shirt}"/><rect x="${80+bodyWidth/2-shoulder/2}" y="${torsoY}" width="${10+shoulder/2}" height="${Math.max(11,16*ageBodyScale)}" fill="${shirt}"/>`;
  out += `<rect x="${62-legShift}" y="${legY}" width="13" height="${legH}" fill="${pants}"/><rect x="${85+legShift}" y="${legY}" width="13" height="${legH}" fill="${pants}"/>`;
  out += `<rect x="${58-legShift}" y="${footY}" width="20" height="9" fill="${line}"/><rect x="${83+legShift}" y="${footY}" width="20" height="9" fill="${line}"/>`;
  if (age === 'older-adult') out += `<rect x="${x+7*headScale}" y="${headY+29*headScale}" width="${6*headScale}" height="1" fill="${shade(skin,-40)}" opacity=".65"/><rect x="${x+27*headScale}" y="${headY+29*headScale}" width="${6*headScale}" height="1" fill="${shade(skin,-40)}" opacity=".65"/>`;
  if (a.mobilityAid === 'wheelchair') {
    const frame = hex(a.wheelchairColor, '#4C5968');
    const wheelY = Math.min(166, Math.max(139, legY + legH * .58));
    out += `<circle cx="43" cy="${wheelY}" r="31" fill="none" stroke="${line}" stroke-width="6"/><circle cx="117" cy="${wheelY}" r="31" fill="none" stroke="${line}" stroke-width="6"/><rect x="50" y="${wheelY-35}" width="60" height="8" fill="${frame}"/><rect x="54" y="${wheelY-59}" width="8" height="31" fill="${frame}"/><rect x="98" y="${wheelY-59}" width="8" height="31" fill="${frame}"/><rect x="60" y="${wheelY+9}" width="40" height="6" fill="${frame}"/>`;
  }
  return out;
}

function pixelAnimal(document: CharacterSpriteDocument, expression: CharacterExpression) {
  const a = document.appearance!;
  const fill = hex(a.surfaceColor || a.skinColor, '#C9976D');
  const dark = shade(fill,-25);
  const line = a.strokeEnabled === false ? 'none' : hex(a.lineColor,'#1B1B1B');
  const plan = a.bodyPlan || 'quadruped';
  if (plan === 'aquatic') {
    return `<rect x="42" y="76" width="70" height="48" fill="${fill}"/><rect x="112" y="84" width="20" height="32" fill="${dark}"/><rect x="132" y="76" width="12" height="16" fill="${dark}"/><rect x="132" y="108" width="12" height="16" fill="${dark}"/><rect x="53" y="88" width="8" height="8" fill="${line}"/><rect x="39" y="96" width="10" height="8" fill="${shade(fill,-15)}"/>`;
  }
  if (plan === 'avian') {
    return `<rect x="60" y="54" width="40" height="42" fill="${fill}"/>${pixelFace(a,expression,60,20,.9)}<rect x="34" y="62" width="28" height="18" fill="${dark}"/><rect x="98" y="62" width="28" height="18" fill="${dark}"/><rect x="69" y="96" width="7" height="34" fill="${line}"/><rect x="86" y="96" width="7" height="34" fill="${line}"/>`;
  }
  if (plan === 'serpentine') {
    return `${pixelFace(a,expression,60,20,.9)}<rect x="70" y="58" width="24" height="35" fill="${fill}"/><rect x="82" y="88" width="34" height="20" fill="${fill}"/><rect x="106" y="102" width="28" height="20" fill="${fill}"/><rect x="122" y="116" width="18" height="18" fill="${fill}"/>`;
  }
  return `<rect x="44" y="74" width="72" height="45" fill="${fill}"/>${pixelFace(a,expression,88,42,.72)}<rect x="50" y="116" width="10" height="40" fill="${dark}"/><rect x="70" y="116" width="10" height="40" fill="${dark}"/><rect x="95" y="116" width="10" height="40" fill="${dark}"/><rect x="110" y="116" width="10" height="40" fill="${dark}"/><rect x="116" y="82" width="24" height="8" fill="${dark}"/>`;
}

export function renderPixelCharacterSvg(document: CharacterSpriteDocument, view: CharacterView = 'front', expression: CharacterExpression = 'neutral', pose: CharacterPoseKind = 'neutral') {
  const a = styledAppearance(document.appearance || ({} as CharacterAppearance));
  const styledDocument = { ...document, appearance: a };
  const resolution = a.pixelResolution || 32;
  const scale = resolution <= 16 ? 1.36 : resolution <= 24 ? 1.24 : resolution <= 32 ? 1.12 : resolution <= 48 ? 1.02 : .94;
  const content = (a.bodyPlan || 'biped') === 'biped' ? pixelBiped(styledDocument, expression, pose) : pixelAnimal(styledDocument, expression);
  const flip = view === 'side' ? `translate(18 0) scale(.78 1)` : view === 'three-quarter' ? `translate(9 0) scale(.9 1)` : view === 'back' ? `translate(160 0) scale(-1 1)` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 200" width="${document.width || 360}" height="${document.height || 520}" shape-rendering="crispEdges"><title>${esc(document.characterName)}</title><g transform="translate(80 100) scale(${scale}) translate(-80 -100)"><g transform="${flip}">${content}</g></g></svg>`;
}

type V3 = [number, number, number];
type Projected = {x:number; y:number; z:number};
type Face = {points:string; z:number; fill:string; stroke:string};

function project([x,y,z]: V3, yaw: number, pitch: number, scale: number): Projected {
  const yr = yaw * Math.PI / 180;
  const pr = pitch * Math.PI / 180;
  const x1 = x * Math.cos(yr) - z * Math.sin(yr);
  const z1 = x * Math.sin(yr) + z * Math.cos(yr);
  const y1 = y * Math.cos(pr) - z1 * Math.sin(pr);
  const z2 = y * Math.sin(pr) + z1 * Math.cos(pr);
  return { x: 210 + x1 * scale, y: 408 - y1 * scale, z: z2 };
}

function cubeFaces(cx:number, cy:number, cz:number, w:number, h:number, d:number, fill:string, yaw:number, pitch:number, scale:number, stroke='#171717'): Face[] {
  const x0=cx-w/2, x1=cx+w/2, y0=cy-h/2, y1=cy+h/2, z0=cz-d/2, z1=cz+d/2;
  const pts: V3[] = [[x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[x0,y0,z1],[x1,y0,z1],[x1,y1,z1],[x0,y1,z1]];
  const p=pts.map(v=>project(v,yaw,pitch,scale));
  const faceIndices = [[0,1,2,3],[4,5,6,7],[0,4,7,3],[1,5,6,2],[3,2,6,7],[0,1,5,4]];
  const shadeAmounts=[-22,8,-12,-34,18,-6];
  return faceIndices.map((indices,i)=>({
    points: indices.map(idx=>`${p[idx].x.toFixed(1)},${p[idx].y.toFixed(1)}`).join(' '),
    z: indices.reduce((sum,idx)=>sum+p[idx].z,0)/indices.length,
    fill: shade(fill,shadeAmounts[i]), stroke,
  }));
}

function voxelBipedParts(a: CharacterAppearance) {
  const skin=hex(a.skinColor || a.surfaceColor,'#D5A27C'), hair=hex(a.hairColor,'#2B211C'), shirt=hex(a.outfitPrimary,'#2A877E'), pants=hex(a.outfitSecondary,'#303B4B');
  const width=clamp(a.bodyWidth || 1,.65,1.45);
  const limb=clamp(a.limbLength || 1,.65,1.45);
  const ratio=clamp(a.headToBodyRatio || 4.8,2.6,7);
  const variant=selectedStyleVariant(a);
  const age=a.ageGroup || 'adult';
  const ageHead=age==='baby'?1.22:age==='child'?1.14:age==='teen'?1.06:age==='older-adult'? .99:1;
  const ageBody=age==='baby'? .68:age==='child'? .82:age==='teen'? .94:age==='older-adult'? .97:1;
  const headFactor=(variant.id === 'voxel-chibi' ? 1.42 : variant.id === 'voxel-slim' ? .9 : clamp(5.2/ratio,.82,1.28))*ageHead;
  const headSize=44*headFactor;
  const torsoHeight=(variant.id === 'voxel-chibi' ? 52 : variant.id === 'voxel-slim' ? 70 : 62)*ageBody;
  const torsoDepth=variant.id === 'voxel-slim' ? 20 : 25;
  const parts:Array<[number,number,number,number,number,number,string,string]> = [];
  parts.push([0,170+(headSize-44)*.18,0,headSize,headSize,headSize,skin,'head']);
  if(a.hairStyle !== 'none') parts.push([0,191+(headSize-44)*.28,0,headSize+2,10,headSize+2,hair,'hair']);
  parts.push([0,116,0,44*width,torsoHeight,torsoDepth,shirt,'torso']);
  parts.push([-31*width,117,0,14,58*limb*ageBody,16,skin,'arm']);
  parts.push([31*width,117,0,14,58*limb*ageBody,16,skin,'arm']);
  parts.push([-13,54,0,18,67*limb*ageBody,20,pants,'leg']);
  parts.push([13,54,0,18,67*limb*ageBody,20,pants,'leg']);
  parts.push([-13,17,4,20,12,30,hex(a.lineColor,'#171717'),'shoe']);
  parts.push([13,17,4,20,12,30,hex(a.lineColor,'#171717'),'shoe']);
  return parts;
}

function voxelAnimalParts(a: CharacterAppearance) {
  const fill=hex(a.surfaceColor || a.skinColor,'#C9976D'), accent=shade(fill,-18);
  const plan=a.bodyPlan || 'quadruped';
  const parts:Array<[number,number,number,number,number,number,string,string]> = [];
  if(plan==='aquatic') {
    parts.push([0,105,0,88,44,32,fill,'body']); parts.push([-48,105,0,20,24,26,fill,'head']); parts.push([53,105,0,18,45,12,accent,'tail']);
  } else if(plan==='avian') {
    parts.push([0,104,0,42,54,28,fill,'body']); parts.push([0,153,0,34,34,34,fill,'head']); parts.push([-42,110,0,48,12,26,accent,'wing']); parts.push([42,110,0,48,12,26,accent,'wing']);
  } else if(plan==='serpentine') {
    [[0,135],[18,111],[4,87],[-18,63],[-4,39],[20,18]].forEach(([x,y],i)=>parts.push([x,y,0,30-i*2,30-i*2,30-i*2,fill,'segment']));
    parts.push([0,169,0,40,38,38,fill,'head']);
  } else {
    parts.push([0,105,0,78,42,34,fill,'body']); parts.push([-52,118,0,36,38,36,fill,'head']);
    [-26,26].forEach(x=>[-13,13].forEach(z=>parts.push([x,67,z,15,60,15,accent,'leg'])));
  }
  return parts;
}

type VoxelPart = [number,number,number,number,number,number,string,string];

/** Geometry shared by thumbnails, the live canvas and SVG exports. */
function customizeVoxelParts(a: CharacterAppearance, parts: VoxelPart[]): VoxelPart[] {
  const animal = (a.bodyPlan || 'biped') !== 'biped' || !['human','anthropomorphic'].includes(a.species || 'human');
  const skin = hex(animal ? a.surfaceColor || a.skinColor : a.skinColor, '#C9976D');
  const head = parts.find(p=>p[7]==='head')!;
  const torso = parts.find(p=>['torso','body','segment'].includes(p[7]))!;
  const factor = (n:number|undefined) => clamp(n ?? 1,.25,2.5);
  head[3] *= factor(a.headWidth) * (animal ? factor(a.animalHeadScale):1);
  head[4] *= factor(a.headHeight) * (animal ? factor(a.animalHeadScale):1);
  head[5] *= factor(a.voxelVolume);
  if(animal) {torso[3] *= factor(a.bodyWidth);torso[4] *= factor(a.voxelTorsoHeight);}
  else torso[4] *= factor(a.voxelTorsoHeight);
  parts.forEach(p=>{
    if(p[7]==='arm'){p[3]*=factor(a.armWidth);p[4]*=factor(a.armLength);p[0]*=factor(a.shoulderWidth);}
    if(p[7]==='leg'){p[3]*=factor(a.legWidth);p[4]*=factor(a.legLength)*(animal?factor(a.limbLength):1);}
    if(p[7]==='shoe'){p[3]*=factor(a.footSize);p[5]*=factor(a.footSize);}
    if(p[7]==='torso' && a.outfitStyle==='none')p[6]=skin;
    p[5]*=factor(a.voxelVolume);
  });
  // Replace the generic cap with a silhouette matching the selected hairstyle.
  parts=parts.filter(p=>p[7]!=='hair' && p[7]!=='wing' && p[7]!=='tail');
  const add=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,tag='detail')=>parts.push([x,y,z,Math.max(1,w),Math.max(1,h),Math.max(1,d),hex(color,skin),tag]);
  const [hx,hy,hz,hw,hh,hd]=head;
  const front=hz+hd/2;
  const hair=hex(a.hairColor,'#30251E');
  if(a.hairStyle && a.hairStyle!=='none' && !animal){
    const volume=factor(a.hairVolume);
    add(hx,hy+hh/2,hz,hw+4,10*volume,hd+4,hair,'hair');
    const long=/long|lob|braid|locs|wavy/.test(a.hairStyle), bob=/bob|blunt/.test(a.hairStyle);
    if(long||bob)for(const side of [-1,1])add(hx+side*hw/2,hy-(long?12:2),hz-3,9*volume,long?hh*1.6:hh,hd+4,hair,'hair');
    if(/afro|curly|coily/.test(a.hairStyle))for(let i=0;i<7;i++)add(hx+(i-3)*hw/6,hy+hh/2+4+(i%2)*5,hz,hw/4,18*volume,hd+10,hair,'hair');
    if(/bun|ponytail|pigtail/.test(a.hairStyle))add(hx,hy+hh/2+12,hz-hd/2,20*volume,24*volume,20,hair,'hair');
    if(a.hairStyle==='spiky')for(let i=-2;i<=2;i++)add(hx+i*hw/5,hy+hh/2+10+(i%2)*4,hz,7,22,hd,hair,'hair');
  }
  // Facial features are actual volumes, so they disappear correctly behind the head.
  const eye=hex(a.eyeColor,'#202020'), eyeSize=factor(a.eyeSize)*factor(a.animalEyeScale)*(a.eyeStyle==='large'?1.5:a.eyeStyle==='dot'?.65:1);
  for(const side of [-1,1]){
    const x=hx+side*hw*.23*factor(a.eyeSpacing), y=hy+hh*.12+(factor(a.eyeHeight)-1)*10;
    add(x,y,front+1,5*eyeSize,(a.eyeStyle==='narrow'?2:6)*eyeSize,2,eye,'eye');
    if(a.browStyle && a.browStyle!=='none')add(x,y+8*factor(a.browHeight),front+1,8*factor(a.browSize),a.browStyle==='bold'?4:2,2,hair,'brow');
  }
  if(a.noseStyle!=='none')add(hx,hy-3,front+3,5*factor(a.noseSize),6*factor(a.noseSize),5,hex(a.noseColor,shade(skin,-18)),'nose');
  add(hx,hy-hh*.26,front+1,(a.mouthStyle==='wide'?17:a.mouthStyle==='small'?6:11)*factor(a.mouthSize),a.mouthStyle==='full'?4:2,2,hex(a.mouthColor,'#653E35'),'mouth');
  if(a.earStyle && a.earStyle!=='none')for(const side of [-1,1]){
    const size=factor(a.earSize), tall=['long','pointed'].includes(a.earStyle), floppy=a.earStyle==='floppy';
    add(hx+side*(hw/2+3),hy+(tall?hh*.55:floppy?-hh*.25:hh*.1),hz, (a.earStyle==='large'?17:9)*size,(tall?30:floppy?32:15)*size,9,hex(a.earColor,skin),'ear');
    if(a.earStyle==='pointed')add(hx+side*(hw/2+3),hy+hh*.55+18*size,hz,4*size,9*size,6,skin,'ear');
  }
  if(a.muzzleStyle && a.muzzleStyle!=='none'){
    const beak=a.muzzleStyle.startsWith('beak'), long=/long|hooked/.test(a.muzzleStyle), size=factor(a.muzzleSize);
    add(hx,hy-hh*.2,front+(long?14:7)*size,(beak?10:19)*size,(beak?7:12)*size,(long?30:15)*size,hex(a.noseColor,beak?'#DCA73B':shade(skin,16)),'muzzle');
  }
  if(a.hornStyle && a.hornStyle!=='none')for(const side of [-1,1]){
    const size=factor(a.hornSize), height=(a.hornStyle==='short'?14:a.hornStyle==='long'?36:28)*size, color=hex(a.hornColor,'#BCAA80');
    add(hx+side*hw*.3,hy+hh/2+height/2,hz,6*size,height,6*size,color,'horn');
    if(a.hornStyle==='antlers')for(let i=0;i<3;i++)add(hx+side*(hw*.3+6),hy+hh/2+i*9+8,hz,17,4,5,color,'horn');
    if(a.hornStyle==='antennae')add(hx+side*hw*.3,hy+hh/2+height,hz,10,7,9,color,'horn');
  }
  const [tx,ty,tz,tw,th,td]=torso;
  if(a.tailStyle && a.tailStyle!=='none'){
    const size=factor(a.tailSize), count=a.tailStyle==='short'?2:a.tailStyle==='long'?7:5, color=hex(a.tailColor,skin);
    for(let i=0;i<count;i++)add(tx,ty-th*.3+(a.tailStyle==='curled'?Math.sin(i*.8)*20:-i*2),tz-td/2-i*9*size, (a.tailStyle==='fluffy'?18:Math.max(3,10-i))*size,10*size,12*size,color,'tail');
    if(a.tailStyle==='fish')add(tx,ty-th*.3-8,tz-td/2-count*9*size,34*size,5,18*size,color,'tail');
  }
  if(a.wingStyle && a.wingStyle!=='none')for(const side of [-1,1]){
    const size=factor(a.wingSize), color=hex(a.wingColor,shade(skin,-20));
    for(let i=0;i<5;i++)add(tx+side*(tw/2+(i+1)*10*size),ty+th*.2-i*4,tz-td*.3,13*size,(a.wingStyle==='fin'?12:a.wingStyle==='bat'?32:22-i*2)*size,6,color,'wing');
  }
  if(a.surfaceStyle && a.surfaceStyle!=='skin'){
    const style=a.surfaceStyle;
    if(style==='shell'||style==='chitin')add(tx,ty+th*.2,tz-td*.3,tw*1.1,th*.85,td*1.3,shade(skin,-24),'surface');
    else for(let i=0;i<6;i++)for(let j=0;j<3;j++)add(tx+(i-2.5)*tw/6,ty+(j-1)*th/3,tz+td/2+2,style==='fur-long'?6:4,style==='fur-long'?13:style==='feathers'?9:4,style==='scales'?2:5,shade(skin,(i+j)%2?18:-18),'surface');
  }
  if(a.whiskers)for(const side of [-1,1])for(let i=0;i<3;i++)add(hx+side*hw*.6,hy-hh*.2+i*4,front+8,24*factor(a.whiskerLength),1,1,'#555555','whisker');
  if(a.bodyPlan==='six-limbed'||a.bodyPlan==='eight-limbed'){
    parts=parts.filter(p=>p[7]!=='leg');const count=a.bodyPlan==='six-limbed'?3:4;
    for(let i=0;i<count;i++)for(const side of [-1,1])add(tx+(i-(count-1)/2)*tw/count,ty-th/2-18,side*(td/2+12),9,42*factor(a.limbLength),9,skin,'leg');
  }
  if(!animal && a.outfitStyle && a.outfitStyle!=='none'){
    const primary=hex(a.outfitPrimary,'#2A877E'), secondary=hex(a.outfitSecondary,'#303B4B'), z=tz+td/2+2;
    if(['formal','elegant','school','historical'].includes(a.outfitStyle)){
      add(tx,ty+th*.25,z,12,th*.45,3,'#F2EFE5','collar');add(tx,ty+th*.08,z+2,5,th*.45,3,secondary,'tie');
    }else if(['tech','scifi','steampunk','workwear','adventure'].includes(a.outfitStyle)){
      for(const side of [-1,1])add(tx+side*tw*.25,ty,z,tw*.3,18,5,secondary,'pocket');
      add(tx,ty+th*.15,z+3,3,th*.7,3,a.outfitStyle==='steampunk'?'#B88D45':'#BCEEE8','zip');
    }else if(['fantasy','kawaii'].includes(a.outfitStyle)){
      add(tx,ty-th*.45,tz,tw*1.3,th*.35,td+8,primary,'tunic');add(tx,ty,z+2,10,10,4,secondary,'emblem');
    }else if(['sport','street','punk'].includes(a.outfitStyle)){
      for(let i=0;i<3;i++)add(tx,ty+(i-1)*12,z,tw*.8,4,3,secondary,'stripe');
    }else if(a.outfitStyle==='casual')add(tx+tw*.25,ty+6,z,12,13,3,secondary,'pocket');
  }
  const accessories = a.accessories?.length ? a.accessories : a.accessory && a.accessory!=='none' ? [{kind:a.accessory,color:'#343B48',scale:1,x:0,y:0}] : [];
  for(const item of accessories){
    const size=factor(item.scale), color=hex(item.color,'#343B48'), x=hx+(item.x||0)*.3, y=hy-(item.y||0)*.3;
    const piece=(dx:number,dy:number,z:number,w:number,h:number,d:number)=>add(x+dx*size,y+dy*size,z,w*size,h*size,d*size,color,'accessory');
    if(['glasses','sunglasses','goggles','monocle'].includes(item.kind)){
      for(const side of (item.kind==='monocle'?[1]:[-1,1])){
        piece(side*hw*.23,hh*.12,front+4,13,2,3);piece(side*hw*.23,hh*.12-9,front+4,13,2,3);
        for(const edge of [-1,1])piece(side*hw*.23+edge*6,hh*.12-4,front+4,2,10,3);
        if(item.kind==='sunglasses')piece(side*hw*.23,hh*.12-4,front+3,11,8,2);
      }piece(0,hh*.12-2,front+4,8,2,3);
    }else if(['hat','cap','beanie','hood','crown','tiara','bandana','headband'].includes(item.kind)){
      piece(0,hh/2+5,hz,hw+8,9,hd+8);
      if(['crown','tiara'].includes(item.kind))for(let i=-2;i<=2;i++)piece(i*hw/5,hh/2+13,hz+hd/2,5,14,5);
      else if(item.kind==='hat'||item.kind==='cap')piece(0,hh/2+13,hz,hw*.8,18,hd*.8);
    }else if(item.kind==='headphones'||item.kind==='earrings'){
      for(const side of [-1,1])piece(side*(hw/2+5),0,hz,9,item.kind==='earrings'?17:22,14);
      if(item.kind==='headphones')piece(0,hh/2+5,hz,hw+16,5,7);
    }else if(['scarf','necklace','bow','mask'].includes(item.kind)){
      piece(0,item.kind==='mask'?-hh*.2:-hh*.5,front+5,hw*.8,item.kind==='mask'?16:8,6);
      if(item.kind==='scarf')piece(hw*.25,-hh*.8,front+5,9,28,6);
    }else if(['backpack','cape','satchel'].includes(item.kind)){
      add(tx+(item.x||0)*.3,ty-(item.y||0)*.3,tz-td/2-8,tw*size,item.kind==='cape'?th*1.6:th*.7,14*size,color,'accessory');
    }else if(['belt','pouch','bracelet','watch','shoulderpad'].includes(item.kind)){
      add(tx+(item.kind==='watch'||item.kind==='bracelet'?tw*.8:0)+(item.x||0)*.3,ty-th*.3-(item.y||0)*.3,tz+td/2+4,item.kind==='belt'?tw:12*size,8*size,8,color,'accessory');
    }else piece(hw*.3,hh*.4,front+4,13,13,5);
  }
  return parts;
}
export function renderVoxelCharacterSvg(document: CharacterSpriteDocument) {
  const a=styledAppearance(document.appearance || ({} as CharacterAppearance));
  const yaw=clamp(a.voxelYaw ?? 28,-180,180), pitch=clamp(a.voxelPitch ?? 18,-45,45), scale=1.3;
  const line=a.strokeEnabled === false ? 'none' : hex(a.lineColor,'#171717');
  const parts=customizeVoxelParts(a,(a.bodyPlan || 'biped')==='biped' ? voxelBipedParts(a) : voxelAnimalParts(a));
  const faces:Face[]=[];
  parts.forEach(([cx,cy,cz,w,h,d,fill])=>faces.push(...cubeFaces(cx,cy,cz,w,h,d,fill,yaw,pitch,scale,line)));
  faces.sort((a,b)=>a.z-b.z);
  let extra='';
  if((a.bodyPlan || 'biped')==='biped') {
    if(a.mobilityAid==='wheelchair') {
      const frame=hex(a.wheelchairColor,'#4C5968');
      const wheelL=project([-47,58,2],yaw,pitch,scale), wheelR=project([47,58,2],yaw,pitch,scale);
      extra += `<circle cx="${wheelL.x}" cy="${wheelL.y}" r="43" fill="none" stroke="${line}" stroke-width="8"/><circle cx="${wheelR.x}" cy="${wheelR.y}" r="43" fill="none" stroke="${line}" stroke-width="8"/><path d="M${wheelL.x} ${wheelL.y-23}L${wheelR.x} ${wheelR.y-23}" stroke="${frame}" stroke-width="9"/>`;
    }
  }
  const coords=faces.flatMap(f=>f.points.split(' ').map(p=>p.split(',').map(Number)));
  const xs=coords.map(p=>p[0]), ys=coords.map(p=>p[1]);
  const zoom=clamp(a.voxelDepth ?? 1,.7,1.45);
  const width=(Math.max(...xs)-Math.min(...xs)+64)/zoom, height=(Math.max(...ys)-Math.min(...ys)+64)/zoom;
  const left=(Math.min(...xs)+Math.max(...xs)-width)/2, top=(Math.min(...ys)+Math.max(...ys)-height)/2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${document.width || 360}" height="${document.height || 520}"><title>${esc(document.characterName)}</title><g stroke-linejoin="round">${faces.map(face=>`<polygon points="${face.points}" fill="${face.fill}" stroke="${face.stroke}" stroke-width="${clamp(a.strokeWidth ?? 1.4,0,6)}"/>`).join('')}${extra}</g></svg>`;
}

