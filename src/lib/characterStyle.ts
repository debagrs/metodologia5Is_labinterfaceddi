import type { CharacterAppearance } from '../types';

export const CHARACTER_STYLES = [
  { id: 'illustrated', label: 'Realismo ilustrado', description: 'Volumes suaves, íris detalhadas e contorno delicado.', eyes: 1, head: 1, line: .7, shading: 'soft' },
  { id: 'cartoon', label: 'Cartoon', description: 'Silhueta expressiva, olhos amplos e cores limpas.', eyes: 1.15, head: 1.08, line: 1.35, shading: 'flat' },
  { id: 'anime', label: 'Anime', description: 'Olhos alongados, reflexos marcados e sombra em células.', eyes: 1.2, head: 1, line: .8, shading: 'cel' },
  { id: 'manga', label: 'Mangá', description: 'Tinta monocromática e retícula gráfica.', eyes: 1.18, head: 1, line: 1, shading: 'dots' },
  { id: 'comic', label: 'Quadrinhos', description: 'Contornos firmes e volumes de alto contraste.', eyes: .95, head: 1, line: 1.5, shading: 'cel' },
  { id: 'storybook', label: 'Livro ilustrado', description: 'Paleta suave e textura de papel.', eyes: 1.05, head: 1.05, line: .85, shading: 'paper' },
  { id: 'watercolor', label: 'Aquarela', description: 'Pigmento translúcido, bordas delicadas e granulação.', eyes: 1, head: 1, line: .45, shading: 'paper' },
  { id: 'pencil', label: 'Lápis', description: 'Grafite, hachuras e irregularidade sutil do traço.', eyes: 1, head: 1, line: .65, shading: 'hatch' },
  { id: 'ink', label: 'Nanquin', description: 'Desenho manual em tinta e preenchimentos claros.', eyes: 1, head: 1, line: 1.1, shading: 'ink' },
  { id: 'chibi', label: 'Chibi', description: 'Cabeça ampliada e proporções compactas.', eyes: 1.3, head: 1.3, line: 1.1, shading: 'flat' },
] as const;

export function characterStyle(a: CharacterAppearance) {
  return CHARACTER_STYLES.find(s => s.id === a.artStyle) || CHARACTER_STYLES[0];
}

// Style multipliers operate on a copy: changing style preserves every saved slider.
export function styledAppearance(a: CharacterAppearance): CharacterAppearance {
  const s = characterStyle(a);
  return { ...a, eyeSize: (a.eyeSize ?? 1) * s.eyes,
    headWidth: (a.headWidth ?? 1) * s.head, headHeight: (a.headHeight ?? 1) * s.head,
    strokeWidth: (a.strokeWidth ?? 1.8) * s.line,
    ...(s.id === 'chibi' ? { legLength: (a.legLength ?? 1) * .72, armLength: (a.armLength ?? 1) * .8 } : {}) };
}

function shift(hex: string, n: number) {
  return '#' + [1,3,5].map(i => Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
}

export function styleCharacterMarkup(markup: string, a: CharacterAppearance) {
  const s = characterStyle(a);
  const monochrome = ['manga','pencil','ink'].includes(s.id);
  const colors = [...new Set([...markup.matchAll(/fill="(#[a-f\d]{6})"/gi)].map(m=>m[1]))];
  let defs = '';
  colors.forEach((c,i) => {
    const id = `cs-${i}`;
    if (s.shading === 'soft' || s.shading === 'paper') {
      defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".7"><stop stop-color="${shift(c,22)}"/><stop offset=".45" stop-color="${c}"/><stop offset="1" stop-color="${shift(c,-28)}"/></linearGradient>`;
    } else if (s.shading === 'cel') {
      defs += `<linearGradient id="${id}" x1="0" x2="1"><stop offset=".65" stop-color="${c}"/><stop offset=".65" stop-color="${shift(c,-42)}"/></linearGradient>`;
    } else if (monochrome) {
      const lum = .2126*parseInt(c.slice(1,3),16)+.7152*parseInt(c.slice(3,5),16)+.0722*parseInt(c.slice(5,7),16);
      const bg = lum < 65 ? '#3d3935' : '#faf7ef';
      defs += `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${bg}"/>${s.shading==='dots' ? '<circle cx="2" cy="2" r=".65" fill="#71675c"/>' : s.shading==='hatch' ? '<path d="M0 5L5 0" stroke="#8a8175" stroke-width=".45"/>' : ''}</pattern>`;
    } else return;
    markup = markup.split(`fill="${c}"`).join(`fill="url(#${id})"`);
  });
  if (monochrome) markup = markup.replace(/stroke="#[a-f\d]{6}"/gi,'stroke="#403a34"');
  if (['paper','hatch','ink'].includes(s.shading)) {
    defs += '<filter id="cs-paper" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".07" numOctaves="2" seed="17" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale=".75" xChannelSelector="R" yChannelSelector="G"/></filter>';
    markup = `<g filter="url(#cs-paper)">${markup}</g>`;
  }
  return { defs: `<defs>${defs}</defs>`, markup };
}

