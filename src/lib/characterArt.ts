import { characterStyle, styledAppearance, styleCharacterMarkup } from './characterStyles';
import { metric, normalizeAppearance, characterAccessories } from './characterControls';
import type {
  CharacterAppearance,
  CharacterSpriteDocument,
  CharacterView,
  CharacterExpression,
  CharacterPoseKind,
} from "../types";
type P = { x: number; y: number };
const pt = (x: number, y: number): P => ({ x, y });
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const color = (hex: string | undefined, fallback: string) =>
  /^#[0-9a-f]{6}$/i.test(hex || "") ? hex! : fallback;
const tint = (hex: string, amount: number) =>
  "#" +
  [1, 3, 5]
    .map((i) =>
      Math.round(clamp(parseInt(hex.slice(i, i + 2), 16) + amount, 0, 255))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
const ellipse = (
  x: number,
  y: number,
  rx: number,
  ry: number,
  fill: string,
  extra = "",
) =>
  `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
function around(markup:string,x:number,y:number,sx=1,sy=sx,rotation=0,dy=0){return `<g transform="translate(${x} ${y+dy}) rotate(${rotation}) scale(${sx} ${sy}) translate(${-x} ${-y})">${markup}</g>`;}
function accessories(a:CharacterAppearance,place:'head'|'body-back'|'body-front',wrists?:P[]) {
 return characterAccessories(a).map(item=>{
 const f=color(item.color,'#6D5B79');let art='',x=180,y=110;
 if(place==='head'){
 if(item.kind==='glasses' || item.kind==='sunglasses')art=`<g stroke="${f}" stroke-width="2.5" fill="${item.kind==='sunglasses'?tint(f,-28):'none'}"><rect x="139" y="98" width="35" height="27" rx="10"/><rect x="186" y="98" width="35" height="27" rx="10"/><path d="M174 108Q180 104 186 108M133 105h6m82 0h6"/></g>`;
 if(item.kind==='hat')art=`<path d="M121 74Q180 65 239 74L231 86Q180 80 129 86ZM145 73L151 33Q180 26 209 33L215 73Z" fill="${f}"/><path d="M148 64Q180 69 212 64" stroke="${tint(f,-35)}" stroke-width="6"/>`;
 if(item.kind==='cap')art=`<path d="M132 78Q135 36 180 37Q225 36 228 78Z" fill="${f}"/><path d="M169 77Q206 69 241 80Q237 92 171 87Z" fill="${tint(f,-20)}"/>`;
 if(item.kind==='beanie')art=`<path d="M129 86Q126 32 179 31Q234 32 231 86Z" fill="${f}"/><path d="M128 73H232V91Q180 84 128 91Z" fill="${tint(f,20)}"/><path d="M148 65V47m15 16V40m17 23V37m17 26V40m15 25V48" opacity=".25"/>`;
 if(item.kind==='headphones')art=`<path d="M125 114V87Q127 44 180 43Q233 44 235 87V114" fill="none" stroke="${f}" stroke-width="7"/><rect x="121" y="103" width="14" height="31" rx="6" fill="${f}"/><rect x="225" y="103" width="14" height="31" rx="6" fill="${f}"/>`;
 if(item.kind==='earrings')art=`<g stroke="${f}" fill="none" stroke-width="3"><ellipse cx="131" cy="139" rx="6" ry="9"/><ellipse cx="229" cy="139" rx="6" ry="9"/></g>`;
 if(item.kind==='bow')art=`<path d="M181 62Q149 35 149 55Q146 78 180 66Q214 79 211 55Q211 35 181 62Z" fill="${f}"/><circle cx="181" cy="64" r="6" fill="${tint(f,-20)}"/>`;
 if(item.kind==='crown')art=`<path d="M137 75L132 45L155 59L180 34L205 59L229 45L223 75Z" fill="${f}"/><path d="M142 68H218" stroke="${tint(f,-30)}"/>`;
 } else if(place==='body-back' && item.kind==='backpack'){x=180;y=235;art=`<path d="M139 205Q139 177 180 177Q221 177 221 205V285Q180 301 139 285Z" fill="${f}"/><path d="M152 211V273Q180 287 208 273V211" fill="none" stroke="${tint(f,-25)}" stroke-width="3"/>`;}
 else if(place==='body-front'){
 if(item.kind==='scarf'){y=190;art=`<path d="M158 183Q180 198 202 183L200 201Q180 214 160 201L151 249L170 254L179 205Z" fill="${f}"/><path d="M160 193Q180 205 199 193" fill="none" stroke="${tint(f,-24)}"/>`;}
 if(item.kind==='necklace'){y=210;art=`<path d="M157 190Q159 231 180 236Q201 231 203 190" stroke="${f}" stroke-width="2.5" fill="none"/><path d="M180 231l-6 8 6 8 6-8Z" fill="${f}"/>`;}
 if(item.kind==='belt'){y=282;art=`<path d="M151 277Q180 287 209 277V286Q180 296 151 286Z" fill="${f}"/><rect x="175" y="281" width="10" height="9" rx="2" fill="#D4B378"/>`;}
 if(item.kind==='bracelet'){y=298;art=(wrists || [pt(134,295),pt(225,292)]).map(w=>`<path d="M${w.x-7} ${w.y-4}l14 0" stroke="${f}" stroke-width="5"/>`).join('');}
 }
 return art?around(art,x,y,clamp(item.scale||1,.5,1.5),clamp(item.scale||1,.5,1.5),0,item.y||0).replace('translate('+x+' ', 'translate('+(x+(item.x||0))+' '):'';
 }).join('');
}
function link(a: P, b: P, c: P, w: number, fill: string, line: string) {
  const offset = (p: P, q: P, r: number) => {
    const l = Math.hypot(q.x - p.x, q.y - p.y) || 1;
    return pt(((q.y - p.y) / l) * r, (-(q.x - p.x) / l) * r);
  };
  const n = offset(a, b, w / 2),
    m = offset(b, c, w * 0.38),
    z = offset(b, c, w * 0.26);
  return `<path d="M ${a.x + n.x} ${a.y + n.y} Q ${b.x + n.x} ${b.y + n.y} ${b.x + m.x} ${b.y + m.y} L ${c.x + z.x} ${c.y + z.y} Q ${c.x} ${c.y + w * 0.25} ${c.x - z.x} ${c.y - z.y} L ${b.x - m.x} ${b.y - m.y} Q ${b.x - n.x} ${b.y - n.y} ${a.x - n.x} ${a.y - n.y} Z" fill="${fill}" stroke="${line}" stroke-width="1.8"/>`;
}
function joint(origin: P, length: number, angle: number): P {
  const r = (angle * Math.PI) / 180;
  return pt(origin.x + Math.sin(r) * length, origin.y + Math.cos(r) * length);
}
export function characterRig(pose: CharacterPoseKind, phase: number) {
  const wave = Math.sin(phase * Math.PI * 2),
    cross = Math.cos(phase * Math.PI * 2);
  let al = -8,
    ar = 8,
    el = -8,
    er = 8,
    ll = -3,
    lr = 3,
    kl = 0,
    kr = 0,
    lift = 0,
    lean = 0;
  if (pose === "wave") {
    ar = 145;
    er = 150 + wave * 10;
    al = -10;
  }
  if (pose === "walk") {
    ll = wave * 26;
    lr = -wave * 26;
    kl = Math.max(0, -wave) * 36;
    kr = Math.max(0, wave) * 36;
    al = -wave * 24;
    ar = wave * 24;
    el = al - 15;
    er = ar + 15;
    lift = -Math.abs(cross) * 3;
  }
  if (pose === "run") {
    ll = wave * 54;
    lr = -wave * 54;
    kl = 35 + Math.max(0, -wave) * 65;
    kr = 35 + Math.max(0, wave) * 65;
    al = -wave * 55;
    ar = wave * 55;
    el = al - 75;
    er = ar + 75;
    lift = -10 - Math.abs(cross) * 7;
    lean = -9;
  }
  if (pose === "jump") {
    const t = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    ar = 20 + t * 140;
    al = -ar;
    er = ar - 10;
    el = -er;
    ll = -8 - t * 16;
    lr = -ll;
    kl = 10 + t * 35;
    kr = -kl;
    lift = -55 * t;
  }
  if (pose === "sit") {
    ll = -80;
    lr = 80;
    kl = 80;
    kr = -80;
    al = -15;
    ar = 15;
    el = -70;
    er = 70;
    lift = 14;
  }
  if (pose === "action") {
    al = -65;
    el = -110;
    ar = 90;
    er = 100;
    ll = -30;
    lr = 25;
    kl = 20;
    kr = -10;
    lean = -8 + wave * 9;
    ar += wave * 35;
    er += wave * 35;
  }
  if (pose === "neutral") {
    lift = wave * 1.5;
  }
  return { al, ar, el, er, ll, lr, kl, kr, lift, lean };
}
function hair(a: CharacterAppearance, back: boolean) {
  const h = color(a.hairColor, "#604136"),
    light = tint(h, 30);
  if (a.hairStyle === "none") return "";
  if (back) {
    if (a.hairStyle === "long")
      return `<path d="M132 118C121 56 143 37 180 37C224 35 241 72 230 123C229 158 249 169 239 196C224 183 219 192 212 198C198 184 177 196 165 192C141 199 128 188 119 199C128 159 126 144 132 118Z" fill="${h}"/>`;
    if (a.hairStyle === "bob")
      return `<path d="M129 130C119 51 150 33 182 36C226 34 244 75 231 173Q178 196 128 174Z" fill="${h}"/>`;
    if (a.hairStyle === "curly")
      return Array.from({ length: 11 }, (_, i) => {
        let t = Math.PI + (i * Math.PI) / 10;
        return ellipse(
          180 + Math.cos(t) * 50,
          115 + Math.sin(t) * 69,
          19,
          23,
          h,
        );
      }).join("");
    if (a.hairStyle === "bun") return ellipse(210, 35, 24, 22, h);
    return `<path d="M133 115Q120 38 180 37Q240 38 227 115L216 94Q180 74 144 94Z" fill="${h}"/>`;
  }
  let d =
    "M134 103C125 66 146 35 181 39C220 36 242 67 226 107C211 96 209 82 204 70C189 86 164 94 134 103Z";
  if (a.hairStyle === "short")
    d =
      "M134 103L127 77Q132 44 166 42Q210 22 226 60L230 104Q215 84 207 70Q178 95 147 86Z";
  if (a.hairStyle === "spiky")
    d =
      "M132 101L126 68L139 71L138 44L159 56L172 30L185 49L204 31L210 52L231 47L224 69L237 79L226 108Q213 84 207 72Q170 94 132 101Z";
  if (a.hairStyle === "bun")
    d = "M133 113Q118 48 175 39Q234 26 229 113L215 92Q179 65 145 96Z";
  if (a.hairStyle === "curly")
    d =
      "M132 105Q120 81 136 66Q135 47 153 47Q168 28 180 42Q200 31 211 49Q236 52 224 77Q238 90 225 109Q211 94 204 76Q181 92 166 83Q147 104 132 105Z";
  return `<path d="${d}" fill="${h}" stroke-width="2.3"/><path d="M147 62Q170 44 196 52M149 73Q167 61 182 63" stroke="${light}" stroke-width="2" opacity=".6" fill="none"/>`;
}
function eyes(a: CharacterAppearance, expression: string) {
  const style = a.eyeStyle as string,
    iris = color(a.eyeColor, "#664839");

  return [-1, 1]
    .map((side) => {
      let x = 180 + side * 23 * metric(a,"eyeSpacing"),
        y = 111 + metric(a,"eyeHeight",0),
        rx = style === "large" ? 15 : style === "round" ? 12 : 14,
        ry =
          style === "narrow" || style === "hooded"
            ? 5
            : style === "monolid"
              ? 6
              : style === "large"
                ? 13
                : 9;
      const wink = expression === "winking" && side === 1;
      if (expression === "calm")
        return `<path d="M${x - rx} ${y}Q${x} ${y + 7} ${x + rx} ${y}" fill="none" stroke-width="2.4"/>`;
      if (wink || expression === "laughing")
        return `<path d="M${x - rx} ${y + 2}Q${x} ${y - 9} ${x + rx} ${y + 2}" fill="none" stroke-width="3"/>`;
      if (style === "dot") return ellipse(x, y, 4, 5, iris);
      const tilt = style === "upturned" ? -4 : style === "downturned" ? 4 : 0;
      const top =
        expression === "angry" || expression === "determined" ? ry * 0.5 : ry;
      const detailed = ['illustrated','anime','storybook','watercolor'].includes(characterStyle(a).id);
      const irisRx = ry * .71 * metric(a,'irisScale'), irisRy = ry * .89 * metric(a,'irisScale');
      const fibers = detailed ? Array.from({length:24},(_,i)=>{
        const t=i*Math.PI/12;
        return `<path d="M${x+Math.cos(t)*irisRx*.57} ${y+Math.sin(t)*irisRy*.57}L${x+Math.cos(t)*irisRx*.9} ${y+Math.sin(t)*irisRy*.9}" stroke="${tint(iris,i%2?35:-30)}" stroke-width=".35" opacity=".7"/>`;
      }).join('') : '';
      const eyelid = detailed ? `<path d="M${x-rx*.85} ${y-top*1.4}Q${x} ${y-top*2} ${x+rx*.85} ${y-top*1.3}" fill="none" stroke="${tint(color(a.skinColor,'#EBC2A7'),-40)}" stroke-width=".7" opacity=".65"/><ellipse cx="${x}" cy="${y}" rx="${irisRx}" ry="${irisRy}" fill="none" stroke="${tint(iris,-50)}" stroke-width=".65"/>` : '';
      return `<g transform="rotate(${side * tilt * 2} ${x} ${y})"><path d="M${x - rx} ${y}C${x - rx * 0.7} ${y - top * 1.7} ${x + rx * 0.7} ${y - top * 1.5} ${x + rx} ${y}C${x + rx * 0.5} ${y + ry * 1.3} ${x - rx * 0.6} ${y + ry * 1.3} ${x - rx} ${y}Z" fill="#fff" stroke-width="1.1"/><ellipse cx="${x}" cy="${y}" rx="${ry * 0.71 * metric(a,"irisScale")}" ry="${ry * 0.89 * metric(a,"irisScale")}" fill="${iris}" stroke="none"/>${fibers}${eyelid}<ellipse cx="${x}" cy="${y + 1}" rx="${ry * 0.37}" ry="${ry * 0.57}" fill="#211b23" stroke="none"/>${ellipse(x - ry * 0.25, y - ry * 0.25, ry * 0.22, ry * 0.27, "#fff", 'stroke="none"')}${ellipse(x + ry * 0.29, y + ry * 0.4, ry * 0.1, ry * 0.12, "#fff", 'stroke="none"')}<path d="M${x - rx} ${y}C${x - rx * 0.7} ${y - top * 1.7} ${x + rx * 0.7} ${y - top * 1.5} ${x + rx} ${y}" stroke-width="2.5" fill="none"/>${style === "almond" || style === "upturned" ? `<path d="M${x + side * rx} ${y}l${side * 4} -4" fill="none" stroke-width="1.5"/>` : ""}</g>`;
    })
    .map((markup, i)=>around(markup,180+(i?1:-1)*23*metric(a,"eyeSpacing"),111+metric(a,"eyeHeight",0),metric(a,"eyeSize")))
    .join("");
}
function face(a: CharacterAppearance, expression: string, animal = false) {
  const line = color(a.lineColor, "#382a29"),
    skin = color(a.surfaceColor || a.skinColor, "#EAC3A9");
  let jaw =
    "M135 100C133 151 151 180 180 182C207 179 225 151 225 100C226 36 134 36 135 100Z";
  if (a.headShape === "round")
    jaw =
      "M135 108C130 151 149 179 180 180C212 179 230 151 225 108C226 32 134 32 135 108Z";
  if (a.headShape === "square")
    jaw =
      "M135 100L138 158Q141 178 157 179L203 179Q221 178 224 155L225 100C226 35 134 35 135 100Z";
  if (a.headShape === "heart")
    jaw =
      "M133 105C129 147 161 166 180 183C198 166 233 148 227 105C226 37 134 37 133 105Z";
  if (a.headShape === "wide")
    jaw =
      "M128 100C125 149 143 179 180 181C216 180 236 150 232 100C234 36 126 36 128 100Z";
  if (a.headShape === "triangle")
    jaw = "M128 98C126 32 234 32 232 98L209 152Q185 183 180 183Q170 182 151 152Z";
  const faceWidth =
    a.faceShape === "wide" ? 1.1 : a.faceShape === "long" ? 0.9 : 1;
  let browY = 89 + metric(a,"browHeight",0),
    arch = a.browStyle === "arched" ? -10 : a.browStyle === "straight" ? 0 : -5;
  if (expression === "sad" || expression === "worried") arch = 6;
  if (expression === "angry" || expression === "determined") arch = 0;
  let brows =
    a.browStyle === "none"
      ? ""
      : `<path d="M145 ${browY}Q157 ${browY + arch} 169 ${browY + (expression === "angry" ? 6 : 0)}M191 ${browY + (expression === "angry" ? 6 : 0)}Q203 ${browY + arch} 215 ${browY}" stroke="${color(a.hairColor, line)}" stroke-width="${(a.browStyle === "bold" ? 5 : 3)*metric(a,"browSize")}" fill="none"/>`;
  let nose =
    a.noseStyle === "none"
      ? ""
      : `<path d="M178 117Q175 126 173 132Q180 138 188 132" fill="none" stroke="${tint(skin, -38)}" stroke-width="1.8"/>`;
  if (a.noseStyle === "wide")
    nose =
      '<path d="M174 117Q161 139 171 138Q180 142 191 136" fill="none" stroke="' +
      tint(skin, -38) +
      '" stroke-width="1.8"/>';
  if (a.noseStyle === "straight")
    nose =
      '<path d="M180 116L179 136L187 134" fill="none" stroke="' +
      tint(skin, -38) +
      '" stroke-width="1.8"/>';
  let mouth =
    '<path d="M167 151Q180 157 193 151" fill="none" stroke-width="1.5"/>';
  if (a.mouthStyle === "line")
    mouth =
      '<path d="M169 153Q180 155 191 153" fill="none" stroke-width="1.5"/>';
  if (a.mouthStyle === "small")
    mouth =
      '<path d="M174 153Q180 155 186 153" fill="none" stroke-width="1.3"/>';
  if (a.mouthStyle === "full")
    mouth =
      '<path d="M165 151Q174 146 180 149Q186 146 195 151Q180 166 165 151Z" fill="#C9767E" stroke-width=".8"/>';
  if (
    expression === "happy" ||
    expression === "laughing" ||
    a.mouthStyle === "smile"
  )
    mouth =
      '<path d="M164 148Q180 154 196 148Q195 166 180 167Q165 166 164 148Z" fill="#793744" stroke-width="1.3"/><path d="M166 150Q180 155 194 150L191 156H169Z" fill="#fff" stroke="none"/>';
  if (expression === "sad" || expression === "worried")
    mouth =
      '<path d="M168 158Q180 149 192 158" fill="none" stroke-width="1.8"/>';
  if (expression === "surprised")
    mouth = ellipse(180, 155, 7, 10, "#733746", 'stroke-width="1.3"');
  let muzzle = "";
  const ms = a.muzzleStyle || "none";
  if (ms.startsWith("beak"))
    muzzle = '<path d="M170 129L194 135L180 150Z" fill="#E9B459"/>';
  else if (ms !== "none")
    muzzle =
      ellipse(
        180,
        143,
        ms === "long" ? 23 : 18,
        12,
        tint(skin, 18),
        'stroke-width="1.1"',
      ) +
      `<path d="M173 134Q180 132 187 134Q180 146 173 134Z" fill="${line}" stroke="none"/>`;
  if (a.speciesPreset === "elephant")
    muzzle = `<path d="M171 128C164 154 167 186 188 187Q207 184 198 169Q195 181 186 177L188 131Z" fill="${skin}"/><path d="M174 147h10m-9 9h10m-8 9h10" stroke-width="1" opacity=".4"/>`;
  if(ms.startsWith("beak")){
    nose="";mouth="";
    const beak=color(a.noseColor,"#E9B459");
    muzzle=ms==='beak-long'?`<path d="M168 129L220 141L179 150Z" fill="${beak}"/><path d="M172 139L213 141" stroke="${tint(beak,-40)}"/>`:ms==='beak-hooked'?`<path d="M168 129Q204 122 196 151Q188 164 179 158L182 143Q170 144 168 129Z" fill="${beak}"/>`:`<path d="M168 129Q181 124 194 135L180 151Z" fill="${beak}"/><path d="M170 136L190 137" stroke="${tint(beak,-40)}"/>`;
  }
  if(a.noseColor && nose)nose=nose.replaceAll(tint(skin,-38),color(a.noseColor,tint(skin,-38)));
  mouth=mouth.replaceAll('#C9767E',color(a.mouthColor,'#C9767E'));
  nose=around(nose,180,130,metric(a,'noseSize'),metric(a,'noseSize'),0,metric(a,'noseHeight',0));
  mouth=around(mouth,180,153,metric(a,'mouthSize'),metric(a,'mouthSize'),0,metric(a,'mouthHeight',0));
  muzzle=around(muzzle,180,139,metric(a,'muzzleSize'),metric(a,'muzzleSize'),0,metric(a,'muzzleHeight',0));
  let ears = "";
  if (a.earStyle === "pointed")
    ears =
      '<path d="M139 88L134 45L157 78M203 78L226 45L222 89" fill="' +
      skin +
      '"/>';
  else if (a.earStyle === "long")
    ears = ellipse(152, 53, 11, 35, skin) + ellipse(208, 53, 11, 35, skin);
  else if (a.earStyle === "floppy")
    ears =
      '<path d="M138 85Q113 77 118 136Q122 153 132 136L141 105M219 85Q245 77 242 136Q238 153 228 136L219 105" fill="' +
      skin +
      '"/>';
  else if (a.earStyle !== "none")
    ears =
      ellipse(
        133,
        117,
        a.earStyle === "large" ? 20 : 9,
        a.earStyle === "large" ? 30 : 15,
        skin,
      ) +
      ellipse(
        227,
        117,
        a.earStyle === "large" ? 20 : 9,
        a.earStyle === "large" ? 30 : 15,
        skin,
      );
  const freckles = (a as any).freckles
    ? '<g fill="#AD7457" stroke="none">' +
      [149, 155, 162, 198, 205, 211]
        .map((x, i) => ellipse(x, 132 + (i % 2) * 3, 1.2, 1.2, "#AD7457"))
        .join("") +
      "</g>"
    : "";
  const shadow =
    '<path d="M141 135Q152 172 180 174Q208 172 220 133Q216 174 180 181Q146 177 141 135Z" fill="' +
    tint(skin, -20) +
    '" stroke="none" opacity=".45"/>';
  const modeling = !animal && ['illustrated','watercolor','storybook'].includes(characterStyle(a).id)
    ? `<path d="M143 119Q144 150 165 163Q145 150 143 119ZM217 117Q218 151 199 163Q222 150 217 117Z" fill="${tint(skin,-30)}" opacity=".18" stroke="none"/><path d="M166 168Q180 174 195 168" stroke="${tint(skin,25)}" stroke-width="2.5" fill="none" opacity=".6"/>`
    : '';
  const horns =
    a.hornStyle === "none" || !a.hornStyle
      ? ""
      : a.hornStyle === "antennae"
        ? '<path d="M151 76Q143 43 127 39M209 76Q217 43 233 39" fill="none"/>'
        : `<path d="M146 81Q132 53 148 30L159 77M201 77L213 30Q228 53 214 81" fill="${tint(skin, 30)}"/>`;
  const mane =
    a.speciesPreset === "lion"
      ? ellipse(180, 123, 70, 77, color(a.hairColor, "#94622F"))
      : "";
  return `<g transform="translate(180 0) scale(${faceWidth} 1) translate(-180 0)">${mane}${around(horns,180,77,metric(a,"hornSize")).replaceAll(tint(skin,30),color(a.hornColor,tint(skin,30)))}${animal ? "" : around(hair(a, true),180,90,metric(a,"hairVolume"))}${around(ears,180,103,metric(a,'earSize'),metric(a,'earSize'),metric(a,'earAngle',0)).replaceAll(skin,color(a.earColor,skin))}<path d="${jaw}" fill="${skin}"/>${shadow}${modeling}${ellipse(151, 134, 10, 5, "#DB908A", 'stroke="none" opacity=".22"')}${ellipse(210, 134, 10, 5, "#DB908A", 'stroke="none" opacity=".22"')}${eyes(a, expression)}${brows}${nose}${muzzle}${mouth}${freckles}${a.whiskers ? around('<path d="M156 143l-20 -4m20 9l-23 5m71-10l20-4m-20 9l23 5" fill="none" stroke-width="1.1"/>',180,143,metric(a,'whiskerLength'),1) : ""}${animal ? "" : around(hair(a, false),180,90,metric(a,"hairVolume"))}${accessories(a,"head")}</g>`;
}
function wings(a: CharacterAppearance, x: number, y: number) {
  const fill = color(a.wingColor || a.surfaceColor || a.skinColor, "#EAC3A9"),
    line = color(a.lineColor, "#382a29");
  if (!a.wingStyle || a.wingStyle === "none") return "";
  return [-1, 1]
    .map(
      (k) =>
        `<g transform="translate(${x} ${y}) scale(${k*metric(a,"wingSize")} ${metric(a,"wingSize")})"><path d="M24 4Q89-91 139-45Q161-26 135 28L112 12L89 45L67 30L39 59Z" fill="${fill}" stroke="${line}"/>${a.wingStyle === "feather" ? '<path d="M48 21Q82-41 128-36M58 30Q103-19 137-19M69 33Q115 4 132 4" fill="none" stroke-width="1.3"/>' : '<path d="M24 4L139-45M24 4L112 12M24 4L89 45" fill="none" stroke-width="1.2"/>'}</g>`,
    )
    .join("");
}
function tail(a: CharacterAppearance, x: number, y: number) {
  if (!a.tailStyle || a.tailStyle === "none") return "";
  const f = color(a.tailColor || a.surfaceColor || a.skinColor, "#EAC3A9");
  return around(a.tailStyle === "fluffy"
    ? `<path d="M${x} ${y}Q${x + 38} ${y - 65} ${x + 84} ${y - 42}Q${x + 88} ${y + 12} ${x + 14} ${y + 12}Z" fill="${f}"/>`
    : `<path d="M${x} ${y}Q${x + 75} ${y + 15} ${x + 64} ${y - 65}" stroke="${f}" stroke-width="${a.tailStyle === "reptile" ? 18 : 10}" fill="none"/>`,x,y,metric(a,"tailSize"));
}
function biped(
  a: CharacterAppearance,
  view: CharacterView,
  expression: string,
  pose: CharacterPoseKind,
  phase: number,
  adjustments: Record<string,number>={},
) {
  const skin = color(a.surfaceColor || a.skinColor, "#EAC3A9"),
    line = color(a.lineColor, "#382a29"),
    shirt = color(a.outfitPrimary, "#3D8C8C"),
    pants = color(a.outfitSecondary, "#465D75");
  const r = characterRig(pose, phase);
  for(const key of Object.keys(r) as Array<keyof typeof r>)r[key]+=(adjustments[key] || 0);
  const stock =
    a.bodyShape === "stocky" ? 1.25 : a.bodyShape === "slim" ? 0.85 : 1;
  const width = stock * (a.bodyWidth || 1);
  const shoulder = 38 * width * (a.shoulderWidth || 1);
  const limb = (a.limbLength || 1)*metric(a,"armLength");
  const legLength =
    (a.limbLength || 1) * metric(a,"legLength") *
    (a.legStyle === "long" ? 1.13 : a.legStyle === "short" ? 0.78 : 1);
  const hipY = 310,
    sl = pt(180 - shoulder, 207),
    sr = pt(180 + shoulder, 207),
    hl = pt(162, hipY),
    hr = pt(198, hipY);
  const el = joint(sl, 51 * limb, r.al),
    er = joint(sr, 51 * limb, r.ar),
    wl = joint(el, 48 * limb, r.el),
    wr = joint(er, 48 * limb, r.er),
    kl = joint(hl, 78 * legLength, r.ll),
    kr = joint(hr, 78 * legLength, r.lr),
    fl = joint(kl, 76 * legLength, r.ll + r.kl),
    fr = joint(kr, 76 * legLength, r.lr + r.kr);
  const shoe = (p: P, k: number) =>
    `<g transform="translate(${p.x} ${p.y}) scale(${metric(a,"footSize")})"><path d="M-9-7H8L12 0Q${k * 23} 3 ${k * 22} 11H-10Q-14 5-9-7Z" fill="${line}"/><path d="M-9 8H${k * 19}" stroke="#8C939E" stroke-width="2"/><path d="M-3 1h9m-8 3h10" stroke="#CCD0D5" stroke-width="1"/></g>`;
  const hand = (p: P, k: number) =>
    `<g transform="translate(${p.x} ${p.y}) scale(${metric(a,"handSize")})"><path d="M-6-5Q-12-2-10 4L-8 11Q-6 16-1 15Q5 15 6 9L7 3Q${k * 13}-5 6-6Q3-9 1-3Z" fill="${skin}" stroke-width="1.3"/>${a.handStyle === "defined" ? '<path d="M-5 8v4m4-4v5m4-5v4" stroke="' + tint(skin, -45) + '" stroke-width=".7"/>' : ""}</g>`;
  const sleeve = (origin: P, angle: number) =>
    `<g transform="translate(${origin.x} ${origin.y}) rotate(${-angle})"><path d="M-12-11Q0-18 12-8L13 23Q0 28-13 23Z" fill="${shirt}"/><path d="M-11 22Q0 26 11 22" stroke="${tint(shirt, -32)}" fill="none" stroke-width="1"/></g>`;
  const sleeves =
    a.outfitStyle === "none" ? "" : sleeve(sl, r.al) + sleeve(sr, r.ar);

  const waist = metric(a,"waistWidth") * (
    a.torsoShape === "triangle"
      ? 1.24
      : a.torsoShape === "trapezoid"
        ? 0.78
        : a.torsoShape === "round"
          ? 1.18
          : 1);
  const torso = `<path d="M${180 - shoulder + 5} 195Q158 183 166 179L194 179Q205 185 ${180 + shoulder - 5} 195C${180 + shoulder + 3} 229 ${180 + 29 * width * waist} 259 ${180 + 28 * width * waist} 280Q208 306 180 306Q152 306 ${180 - 28 * width * waist} 280C${180 - 29 * width * waist} 259 ${180 - shoulder - 3} 229 ${180 - shoulder + 5} 195Z" fill="${a.outfitStyle === "none" ? skin : shirt}"/>`;
  const lower = `<path d="M${180 - 28 * width * waist} 281Q180 292 ${180 + 28 * width * waist} 281L214 320Q198 330 180 318Q160 329 146 320Z" fill="${a.outfitStyle === "none" ? skin : pants}"/>`;
  const neck =
    '<path d="M166 164V184Q180 198 194 184V164Z" fill="' + skin + '"/>';
  const details =
    a.outfitStyle === "fantasy"
      ? '<path d="M148 200Q180 216 212 200L205 269Q180 284 155 269Z" fill="' +
        pants +
        '"/><path d="M180 213V271M152 242H208" stroke="#DEC28D" stroke-width="3"/>'
      : a.outfitStyle === "tech"
        ? '<path d="M154 210V259L180 278L206 259V210" fill="none" stroke="' +
          pants +
          '" stroke-width="5"/><circle cx="180" cy="225" r="7" fill="#BCEFEA"/>'
        : a.outfitStyle === "formal"
          ? '<path d="M165 187L180 209L195 187" fill="#fff"/><path d="M180 198L174 216L180 256L186 216Z" fill="#553D50"/>'
          : a.outfitStyle === "sport"
            ? '<path d="M150 205V270M210 205V270" stroke="#fff" stroke-width="5" fill="none"/>'
            : a.outfitStyle === "street"
              ? '<path d="M160 250Q180 245 200 250V271H160Z" fill="#fff" opacity=".3"/>'
              : "";
  const body = `${wings(a, 180, 220)}${tail(a, 210, 275)}${link(sl, el, wl, (a.armStyle === "strong" ? 23 : a.armStyle === "thin" ? 14 : 18)*metric(a,"armWidth"), skin, line)}${link(sr, er, wr, (a.armStyle === "strong" ? 23 : a.armStyle === "thin" ? 14 : 18)*metric(a,"armWidth"), skin, line)}${link(hl, kl, fl, 28*metric(a,"legWidth"), a.outfitStyle === "none" ? skin : pants, line)}${link(hr, kr, fr, 28*metric(a,"legWidth"), a.outfitStyle === "none" ? skin : pants, line)}${shoe(fl, -1)}${shoe(fr, 1)}${lower}${sleeves}${torso}${neck}${details}<path d="M${180 - shoulder + 9} 215Q${180 - shoulder + 3} 252 ${180 - 24 * width} 279Q180 294 ${180 + 27 * width} 279" fill="none" stroke="${tint(shirt, -25)}" stroke-width="4" opacity=".35"/><path d="M166 181Q180 192 194 181" stroke="${tint(shirt, -45)}" fill="none"/>${hand(wl, -1)}${hand(wr, 1)}`;
  const headScale = clamp(
    (a.bodyShape === "chibi" ? 5.5 : 4.8) / (a.headToBodyRatio || 4.8),
    0.72,
    1.28,
  );
  const profile = `<path d="M153 80Q188 65 211 94L212 114L227 132Q224 140 211 141L209 161Q201 178 179 179L154 162Q139 113 153 80Z" fill="${skin}"/><path d="M201 109Q209 103 216 110" fill="none" stroke-width="2"/>${ellipse(209, 111, 3, 4, color(a.eyeColor, line))}<path d="M198 150L210 151" fill="none"/>${ellipse(156, 118, 9, 15, skin)}${hair(a, false)}`;
  const headRaw =
    view === "side"
      ? profile
      : view === "back"
        ? `<path d="M135 100Q133 173 180 182Q227 173 225 100Z" fill="${skin}"/><path d="M133 112Q119 37 180 37Q241 37 227 112L218 143Q180 156 142 143Z" fill="${color(a.hairColor, "#604136")}"/>`
        : face(a, expression);
  const head = `<g transform="rotate(${adjustments.headTilt||0} 180 177)"><g transform="translate(180 177) scale(${headScale*metric(a,'headWidth')} ${headScale*metric(a,'headHeight')}) translate(-180 -177)">${headRaw}${view==='front' || view==='three-quarter'?'':accessories(a,'head')}</g></g>`;
  const viewX = view === "side" ? 0.62 : view === "three-quarter" ? 0.88 : 1;
  return `<g transform="translate(180 ${r.lift}) rotate(${r.lean} 0 275) scale(${viewX} 1) translate(-180 0)">${accessories(a,'body-back')}${body}${accessories(a,'body-front',[wl,wr])}${head}</g>`;
}
function surfaceAccent(a: CharacterAppearance): string {
  const style = a.surfaceStyle;
  if (!style || style === "skin") return "";
  const line = color(a.lineColor, "#382a29");
  const marks = Array.from({length: 20}, (_, i) => {
    const x = 156 + (i % 4) * 15, y = 278 + Math.floor(i / 4) * 15;
    return style === "scales" ? `<path d="M${x-5} ${y}q5 8 10 0"/>` : style === "feathers" ? `<path d="M${x-4} ${y}q4 14 8 0m-4 1v8"/>` : style === "shell" || style === "chitin" ? `<path d="M${x-5} ${y}h10"/>` : `<path d="M${x-2} ${y}l3 -5m0 7l3 -5"/>`;
  }).join("");
  return `<g stroke="${line}" stroke-width=".8" opacity=".22" fill="none">${marks}</g>`;
}

function animal(
  a: CharacterAppearance,
  view: CharacterView,
  expression: string,
  pose: CharacterPoseKind,
  phase: number,
  adjustments:Record<string,number>={},
) {
  const fill = color(a.surfaceColor || a.skinColor, "#D4AD80"),
    line = color(a.lineColor, "#382a29");
  const wave = Math.sin(phase * Math.PI * 2),
    r = characterRig(pose, phase);
  if(a.bodyPlan==='quadruped' && (view==='side' || view==='three-quarter')){
   const running=pose==='run',gait=running || pose==='walk',standing=pose!=='sit';
   const torsoX=192,torsoY=pose==='sit'?326:300,torsoW=68*(a.bodyWidth || 1)*metric(a,'waistWidth'),torsoH=42,limb=(a.limbLength || 1)*metric(a,'legLength');
   const legs=[0,1,2,3].map(i=>{const near=i%2===1,front=i<2,origin=pt(torsoX+(front?-45:43),torsoY+20+(near?5:-6)),angle=gait?Math.sin(phase*Math.PI*2+(i===0||i===3?0:Math.PI))*(running?45:26):pose==='sit'&&!front?65:0;const length=(a.limbLength || 1)*metric(a,front?'armLength':'legLength');const knee=joint(origin,39*length,angle+(adjustments[front?(near?'ar':'al'):(near?'lr':'ll')]||0));const foot=joint(knee,38*length,angle+(standing?Math.max(0,-angle)*1.2:-60)+(adjustments[front?(near?'er':'el'):(near?'kr':'kl')]||0));const fillLeg=near?fill:tint(fill,-25);return `<g>${link(origin,knee,foot,18*metric(a,front?'armWidth':'legWidth'),fillLeg,line)}${ellipse(foot.x-3,foot.y+3,13*metric(a,front?'handSize':'footSize'),7,fillLeg)}</g>`;});
   const neck=`<path d="M${torsoX-49} ${torsoY-7}Q109 284 109 239L142 240Q149 267 ${torsoX-18} ${torsoY-30}Z" fill="${fill}"/>`;
   const head=around(face({...a,hairStyle:'none'},expression,true),180,165,.74*metric(a,'headWidth'),.74*metric(a,'headHeight'),adjustments.headTilt||0);
   return `<g transform="translate(0 ${r.lift}) rotate(${r.lean+(adjustments.lean||0)} 180 310)">${legs.filter((_,i)=>i%2===0).join('')}${tail(a,torsoX+torsoW-8,torsoY)}${ellipse(torsoX,torsoY,torsoW,torsoH,fill)}${neck}${wings(a,torsoX,torsoY-12)}${legs.filter((_,i)=>i%2===1).join('')}<g transform="translate(-63 85) scale(${view==='side'?.84:1} 1)">${head}</g>${accessories(a,'body-front')}</g>`;
  }
  let body = "";
  if (a.bodyPlan === "avian")
    body = `<path d="M143 254Q111 353 141 382Q179 407 219 380Q248 348 216 256Z" fill="${fill}"/><path d="M145 287Q115 310 144 356Q169 337 162 298M215 287Q245 310 216 356Q191 337 198 298" fill="${tint(fill, -22)}"/><path d="M161 382V420m38-38v38m-38-2l-12 8m12-8l12 8m26-8l-12 8m12-8l12 8" stroke-width="4" fill="none"/>`;
  else if (a.bodyPlan === "serpentine")
    body = `<path d="M165 254C80 292 98 391 194 353C264 327 260 432 143 443" fill="none" stroke="${line}" stroke-width="48"/><path d="M165 254C80 292 98 391 194 353C264 327 260 432 143 443" fill="none" stroke="${fill}" stroke-width="44"/>`;
  else if (a.bodyPlan === "aquatic")
    body = `<path d="M79 279C100 219 202 218 239 268L311 225L300 283L311 339L239 299C194 356 104 347 79 279Z" fill="${fill}"/>`;
  else {
    const long = a.footStyle === "hooves";
    const len = (long ? 96 : 62)*(a.limbLength || 1);
    const cy = 304;
    const gait = pose === "walk" || pose === "run";
    body =
      tail(a, 232, 310) +
      [-1, 1, -1, 1]
        .map((k, i) => {
          const origin = pt(180 + k * (i < 2 ? 36 : 24), i < 2 ? 325 : 317),
            knee = pt(
              origin.x + (gait ? Math.sin(phase*Math.PI*2+(i===0 || i===3?0:Math.PI)) * (pose==="run"?38:22) : 0),
              pose==="wave" && i===1?294:325 + len * metric(a,i<2?'armLength':'legLength') * (pose==="sit"?.3:.5),
            ),
            end = pt(
              knee.x + (gait ? -Math.sin(phase*Math.PI*2+(i===0 || i===3?0:Math.PI)) * 16 : 0),
              pose==="wave" && i===1?269:325 + len * metric(a,i<2?'armLength':'legLength') * (pose==="sit"?.48:1),
            );
          return (
            link(origin, knee, end, (long ? 16 : 27)*metric(a,i<2?'armWidth':'legWidth'), fill, line) +
            ellipse(end.x, end.y + 3, (long ? 10 : 16)*metric(a,i<2?"handSize":"footSize"), 8*metric(a,"footSize"), tint(fill, -8))
          );
        })
        .join("") +
      `<path d="M143 248C108 274 118 335 135 356Q178 381 225 353C248 329 249 279 213 246Q180 222 143 248Z" fill="${fill}"/><path d="M160 253Q153 291 160 332Q180 351 199 331Q207 292 201 255Z" fill="${tint(fill, 18)}" stroke="none"/>`;
    if (a.bodyPlan === "six-limbed" || a.bodyPlan === "eight-limbed")
      body += Array.from(
        { length: a.bodyPlan === "eight-limbed" ? 8 : 6 },
        (_, i) => {
          let side = i % 2 ? 1 : -1;
          return `<path d="M${180 + side * 30} ${275 + Math.floor(i / 2) * 18}L${180 + side * 74} ${256 + Math.floor(i / 2) * 34}L${180 + side * 100} ${283 + Math.floor(i / 2) * 30}" fill="none" stroke-width="5"/>`;
        },
      ).join("");
  }
  if (a.speciesPreset === "tiger")
    body +=
      '<path d="M128 277l23 8m-27 9l24 8m-19 10l22 7m69-42l-23 8m27 9l-24 8m19 10l-22 7" fill="none" stroke-width="6" opacity=".5"/>';
  if (a.speciesPreset === "deer")
    body +=
      '<g opacity=".4">' +
      [135, 154, 207, 225]
        .map((x, i) => ellipse(x, 284 + (i % 2) * 36, 5, 7, tint(fill, -55)))
        .join("") +
      "</g>";
  body += surfaceAccent(a);
  const scaledHead = `<g transform="translate(180 287) rotate(${adjustments.headTilt||0}) scale(${metric(a,"headWidth")} ${metric(a,"headHeight")}) translate(-180 -177)">${view === "back" ? ellipse(180, 122, 46, 59, fill) : face({ ...a, hairStyle: "none" }, expression, true)}</g>`;
  return `<g transform="translate(180 ${r.lift}) rotate(${r.lean+(adjustments.lean||0)} 0 310) scale(${a.bodyWidth || 1} 1) translate(-180 0)">${accessories(a,"body-back")}${wings(a, 180, 280)}${body}${scaledHead}${accessories(a,"body-front")}</g>`;
}
export function illustrateCharacter(
  document: CharacterSpriteDocument,
  view: CharacterView = "front",
  expression: CharacterExpression = "neutral",
  pose: CharacterPoseKind = "neutral",
  phase = 0,
  portrait = false,
): string {
  const a = styledAppearance(normalizeAppearance(document.appearance!));
  const line = color(a.lineColor, "#382a29");
  const fit = Math.min(
    1,
    1 /
      Math.max(
        1,
        (a.limbLength || 1) * (a.legStyle === "long" ? 1.13 : 1) * 0.88,
      ),
  );
  const body =
    a.bodyPlan === "biped" || a.bodyPlan === "custom" || !a.bodyPlan
      ? biped(a, view, expression, pose, phase,document.poseAdjustments?.[pose] as Record<string,number>)
      : animal(a, view, expression, pose, phase,document.poseAdjustments?.[pose] as Record<string,number>);
  const styled = styleCharacterMarkup(body, a);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="360" height="520" viewBox="${portrait ? (a.artStyle === "chibi" ? "50 -35 260 240" : "85 20 190 185") : "0 0 360 520"}">${styled.defs}<g stroke="${line}" stroke-width="${metric(a,"strokeWidth",1.8)}" stroke-linecap="round" stroke-linejoin="round"><g transform="translate(180 260) scale(${portrait ? 1 : fit}) translate(-180 -260)">${styled.markup}</g></g></svg>`;
}
