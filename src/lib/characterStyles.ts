import type { CharacterAppearance } from '../types';

type ShadingMode = 'soft' | 'flat' | 'cel' | 'dots' | 'paper' | 'hatch' | 'ink' | 'engrave' | 'ornament' | 'outline' | 'realism' | 'psychedelic' | 'metal' | 'pixel' | 'voxel';

export type CharacterStyleFamily = {
  id: NonNullable<CharacterAppearance['artStyle']>;
  label: string;
  description: string;
  market: string;
  defaultVariant: string;
};

export type CharacterStyleVariant = {
  id: string;
  family: CharacterStyleFamily['id'];
  label: string;
  description: string;
  tags: string[];
  eyes: number;
  head: number;
  line: number;
  shading: ShadingMode;
  monochrome?: boolean;
  patch: Partial<CharacterAppearance>;
  recommendedOutfits?: CharacterAppearance['outfitStyle'][];
};

export const CHARACTER_STYLE_FAMILIES: CharacterStyleFamily[] = [
  { id: 'manga', label: 'Mangá', description: 'Linguagem japonesa de linha, expressão, ritmo visual e síntese anatômica.', market: 'quadrinhos, editorial, animação, games', defaultVariant: 'manga-shounen' },
  { id: 'engraving', label: 'Hachura & gravura', description: 'Volume construído por linhas, cruzamentos, densidade e textura de impressão.', market: 'rótulos, editorial, embalagem, pôster', defaultVariant: 'engraving-copper' },
  { id: 'lineart', label: 'Linha detalhada', description: 'Contorno com variação de peso, padrões internos e ornamentação minuciosa.', market: 'capas, tatuagem, pôster, identidade', defaultVariant: 'lineart-ornamental' },
  { id: 'minimal-lineart', label: 'Line Art Minimalista', description: 'Traço simples e contínuo, foco no gesto e na essência da forma, com pouquíssimos detalhes.', market: 'identidade, editorial, tattoo, pôster, boho', defaultVariant: 'minimal-lineart-continuous' },
  { id: 'pixel-art', label: 'Pixel Art 2D', description: 'Personagem construído em grade de pixels, com leitura por silhueta, paleta limitada e sprites animáveis.', market: 'games 2D, sprites, interfaces lúdicas, ícones', defaultVariant: 'pixel-art-32' },
  { id: 'voxel', label: 'Voxel / blocos 3D', description: 'Personagem tridimensional modular feito por volumes cúbicos e texturas simples, com rotação e leitura low-poly.', market: 'games 3D, protótipos, mundos em blocos, experiências web', defaultVariant: 'voxel-blocky' },
  { id: 'realism', label: 'Realismo', description: 'Anatomia, materiais, iluminação e volume com maior fidelidade física.', market: 'concept art, científico, publicidade', defaultVariant: 'realism-editorial' },
  { id: 'psychedelic', label: 'Psicodélico', description: 'Maximalismo, distorção, cor intensa, formas fluidas e composição densa.', market: 'festivais, estamparia, música, pôster', defaultVariant: 'psychedelic-70s' },
  { id: 'steampunk', label: 'Steampunk / dieselpunk', description: 'Retrofuturismo com metal, couro, mecanismos, rebites e acessórios técnicos.', market: 'worldbuilding, games, cinema, fantasia', defaultVariant: 'steampunk-victorian' },
  { id: 'comic', label: 'Quadrinhos', description: 'Contorno forte, contraste, narrativa sequencial e acabamento editorial.', market: 'HQ, editorial, pôster', defaultVariant: 'comic-western' },
  { id: 'storybook', label: 'Livro ilustrado', description: 'Textura, materialidade e acabamento narrativo voltado à ilustração editorial.', market: 'infantil, editorial, educação', defaultVariant: 'storybook-gouache' },
  { id: 'anime', label: 'Anime', description: 'Cel shading, desenho limpo e expressividade voltada à animação.', market: 'animação, games, mascotes', defaultVariant: 'anime-modern' },
  { id: 'cartoon', label: 'Cartoon', description: 'Silhueta forte, exagero controlado e leitura rápida.', market: 'animação, publicidade, mascotes', defaultVariant: 'cartoon-editorial' },
  { id: 'illustrated', label: 'Ilustração editorial', description: 'Base versátil com volume suave e leitura clara.', market: 'editorial, institucional, publicidade', defaultVariant: 'illustrated-soft' },
  { id: 'watercolor', label: 'Aquarela', description: 'Pigmento translúcido, bordas delicadas e aparência artesanal.', market: 'editorial, moda, papelaria', defaultVariant: 'watercolor-soft' },
  { id: 'pencil', label: 'Lápis', description: 'Grafite, hachura, textura e variação manual de linha.', market: 'concept, editorial, estudos', defaultVariant: 'pencil-graphite' },
  { id: 'ink', label: 'Nanquim', description: 'Linha de tinta, massas de preto e gesto gráfico.', market: 'editorial, tattoo, quadrinhos', defaultVariant: 'ink-brush' },
  { id: 'chibi', label: 'Chibi', description: 'Cabeça ampliada, corpo compacto e expressões de alta legibilidade.', market: 'stickers, mascotes, games', defaultVariant: 'chibi-kawaii' },
];

export const CHARACTER_STYLE_VARIANTS: CharacterStyleVariant[] = [
  { id:'manga-shounen', family:'manga', label:'Shounen clássico', description:'Linhas limpas, cabelo marcado, ação e expressões de impacto.', tags:['ação','dinâmico','linha limpa'], eyes:1.18, head:1.02, line:.9, shading:'cel', monochrome:true, patch:{ eyeStyle:'almond', browStyle:'bold', hairStyle:'spiky', faceShape:'angular', bodyShape:'athletic', torsoShape:'trapezoid', headToBodyRatio:5.2, lineColor:'#161616', outfitStyle:'street' }, recommendedOutfits:['street','sport','school','adventure'] },
  { id:'manga-shoujo', family:'manga', label:'Shoujo expressivo', description:'Olhos amplos, linhas fluidas, delicadeza ornamental e forte expressão emocional.', tags:['expressivo','olhos grandes','decorativo'], eyes:1.38, head:1.06, line:.72, shading:'dots', monochrome:true, patch:{ eyeStyle:'large', browStyle:'soft', hairStyle:'long', faceShape:'soft', bodyShape:'slim', torsoShape:'rectangle', headToBodyRatio:4.5, lineColor:'#202020', outfitStyle:'elegant' }, recommendedOutfits:['school','elegant','kawaii','formal'] },
  { id:'manga-seinen', family:'manga', label:'Seinen realista', description:'Anatomia mais precisa, hachura, expressão contida e sombras densas.', tags:['realista','hachura','adulto'], eyes:.92, head:.96, line:.78, shading:'hatch', monochrome:true, patch:{ eyeStyle:'narrow', browStyle:'straight', hairStyle:'short', faceShape:'angular', bodyShape:'average', headToBodyRatio:6.1, lineColor:'#171717', outfitStyle:'casual' }, recommendedOutfits:['casual','formal','workwear','historical'] },
  { id:'manga-chibi', family:'manga', label:'Mangá chibi', description:'Cabeça muito ampliada, membros curtos e expressão simplificada.', tags:['fofo','compacto','sticker'], eyes:1.45, head:1.34, line:1.08, shading:'flat', monochrome:false, patch:{ eyeStyle:'large', browStyle:'soft', bodyShape:'chibi', headToBodyRatio:2.9, limbLength:.78, hairStyle:'bob', outfitStyle:'kawaii' }, recommendedOutfits:['kawaii','school','fantasy','basic'] },
  { id:'manga-fashion', family:'manga', label:'Mangá fashion/editorial', description:'Figura alongada, cabelo e vestuário como elementos centrais da composição.', tags:['moda','editorial','elegante'], eyes:1.08, head:.96, line:.7, shading:'cel', monochrome:false, patch:{ eyeStyle:'almond', faceShape:'long', bodyShape:'slim', legStyle:'long', limbLength:1.18, headToBodyRatio:6.6, outfitStyle:'elegant' }, recommendedOutfits:['elegant','street','formal','historical'] },

  { id:'engraving-copper', family:'engraving', label:'Gravura em metal', description:'Linhas finas, hachura cruzada e densidade controlada.', tags:['clássico','linhas finas','premium'], eyes:1, head:1, line:.62, shading:'engrave', monochrome:true, patch:{ lineColor:'#211d1a', outfitStyle:'historical' }, recommendedOutfits:['historical','formal','steampunk'] },
  { id:'engraving-woodcut', family:'engraving', label:'Xilogravura', description:'Cortes mais grossos, contraste forte e textura artesanal.', tags:['xilogravura','alto contraste','artesanal'], eyes:.96, head:1, line:1.35, shading:'ink', monochrome:true, patch:{ lineColor:'#161412', outfitStyle:'historical' }, recommendedOutfits:['historical','workwear','adventure'] },
  { id:'engraving-lino', family:'engraving', label:'Linóleo', description:'Massas gráficas, cortes fluidos e áreas de preto mais largas.', tags:['linóleo','gestual','massas'], eyes:1, head:1.02, line:1.18, shading:'hatch', monochrome:true, patch:{ lineColor:'#1c1a18', outfitStyle:'casual' }, recommendedOutfits:['casual','workwear','adventure'] },

  { id:'lineart-ornamental', family:'lineart', label:'Ornamental', description:'Linha precisa, arabescos e padrões internos decorativos.', tags:['ornamento','detalhado','decorativo'], eyes:1.05, head:1, line:.72, shading:'ornament', patch:{ lineColor:'#342d2d', outfitStyle:'elegant' }, recommendedOutfits:['elegant','fantasy','historical'] },
  { id:'lineart-botanical', family:'lineart', label:'Botânico', description:'Ritmo orgânico e detalhes inspirados em folhas, flores e anatomias naturais.', tags:['orgânico','botânico','editorial'], eyes:1, head:1, line:.66, shading:'hatch', patch:{ lineColor:'#334039', outfitStyle:'casual' }, recommendedOutfits:['casual','elegant','fantasy'] },
  { id:'lineart-tattoo', family:'lineart', label:'Tattoo / flash', description:'Peso de linha alto, leitura instantânea e contraste pensado para reprodução.', tags:['tattoo','bold line','flash'], eyes:1.02, head:1, line:1.4, shading:'ink', patch:{ lineColor:'#111111', outfitStyle:'punk' }, recommendedOutfits:['punk','street','fantasy'] },

  { id:'minimal-lineart-continuous', family:'minimal-lineart', label:'Traço contínuo', description:'One line art: linha fina, gesto dominante e redução radical de detalhes.', tags:['one line','contínuo','essencial'], eyes:.96, head:1, line:.56, shading:'outline', monochrome:true, patch:{ lineColor:'#171717', browStyle:'none', outfitStyle:'none', hairStyle:'none', headToBodyRatio:5.7 }, recommendedOutfits:['none','basic'] },
  { id:'minimal-lineart-editorial', family:'minimal-lineart', label:'Editorial minimal', description:'Contorno limpo e elegante, poucos sinais internos e ótima reprodução em marca e editorial.', tags:['editorial','marca','limpo'], eyes:.98, head:1, line:.68, shading:'outline', monochrome:true, patch:{ lineColor:'#202020', browStyle:'soft', outfitStyle:'basic', headToBodyRatio:5.9 }, recommendedOutfits:['basic','casual','elegant'] },
  { id:'minimal-lineart-boho', family:'minimal-lineart', label:'Boho / orgânico', description:'Linha delicada, curvas orgânicas e aparência leve para pôster, decoração e identidade.', tags:['boho','orgânico','delicado'], eyes:1, head:1.02, line:.52, shading:'outline', monochrome:true, patch:{ lineColor:'#3B352F', browStyle:'soft', outfitStyle:'none', hairStyle:'wavy' }, recommendedOutfits:['none','elegant'] },

  { id:'pixel-art-16', family:'pixel-art', label:'16-bit compacto', description:'Silhueta muito sintética, pixels grandes e paleta curta para leitura imediata.', tags:['16-bit','compacto','sprite'], eyes:1.02, head:1.08, line:1, shading:'pixel', patch:{ pixelResolution:16, pixelPaletteSize:8, pixelOutline:true, headToBodyRatio:4.4, bodyShape:'average', eyeStyle:'dot', outfitStyle:'basic' }, recommendedOutfits:['basic','sport','street'] },
  { id:'pixel-art-32', family:'pixel-art', label:'32 px clássico', description:'Equilíbrio entre detalhe, legibilidade e animação para sprites de personagens.', tags:['32 px','game','sprite'], eyes:1.05, head:1.05, line:1, shading:'pixel', patch:{ pixelResolution:32, pixelPaletteSize:16, pixelOutline:true, headToBodyRatio:4.9, bodyShape:'average', eyeStyle:'round', outfitStyle:'casual' }, recommendedOutfits:['casual','street','fantasy'] },
  { id:'pixel-art-64', family:'pixel-art', label:'64 px detalhado', description:'Mais detalhes faciais, roupa e acessórios mantendo bordas duras e linguagem pixel.', tags:['64 px','detalhado','sprite'], eyes:1.08, head:1.02, line:1, shading:'pixel', patch:{ pixelResolution:64, pixelPaletteSize:24, pixelOutline:true, headToBodyRatio:5.3, bodyShape:'average', eyeStyle:'almond', outfitStyle:'elegant' }, recommendedOutfits:['elegant','scifi','adventure'] },

  { id:'voxel-blocky', family:'voxel', label:'Blocos clássico', description:'Volumes cúbicos marcados, cabeça e membros modulares e leitura 3D robusta.', tags:['blocos','voxel','3D'], eyes:1, head:1.08, line:.8, shading:'voxel', patch:{ voxelYaw:28, voxelPitch:18, voxelDepth:1, voxelBevel:0, headToBodyRatio:4.5, bodyWidth:1, bodyShape:'average', outfitStyle:'basic' }, recommendedOutfits:['basic','street','adventure'] },
  { id:'voxel-slim', family:'voxel', label:'Voxel esguio', description:'Volumes mais estreitos e alongados para avatares editoriais e protótipos de jogos.', tags:['esguio','low-poly','avatar'], eyes:.96, head:.98, line:.72, shading:'voxel', patch:{ voxelYaw:32, voxelPitch:16, voxelDepth:.92, voxelBevel:0, headToBodyRatio:5.4, bodyWidth:.82, bodyShape:'slim', limbLength:1.1, outfitStyle:'street' }, recommendedOutfits:['street','tech','scifi'] },
  { id:'voxel-chibi', family:'voxel', label:'Voxel chibi', description:'Cabeça cúbica ampliada, corpo compacto e leitura de mascote em blocos.', tags:['chibi','mascote','blocos'], eyes:1.15, head:1.3, line:.82, shading:'voxel', patch:{ voxelYaw:24, voxelPitch:20, voxelDepth:1.08, voxelBevel:0, headToBodyRatio:2.9, bodyWidth:1.08, bodyShape:'chibi', limbLength:.78, outfitStyle:'kawaii' }, recommendedOutfits:['kawaii','fantasy','school'] },

  { id:'realism-editorial', family:'realism', label:'Realismo editorial', description:'Volume suave, proporções menos caricatas e acabamento limpo.', tags:['editorial','volume','preciso'], eyes:.92, head:.95, line:.52, shading:'realism', patch:{ eyeStyle:'almond', faceShape:'soft', bodyShape:'average', headToBodyRatio:6.3, handStyle:'defined', lineColor:'#4c403b', outfitStyle:'casual' }, recommendedOutfits:['casual','formal','workwear','elegant'] },
  { id:'realism-concept', family:'realism', label:'Concept art', description:'Volume dramático, silhueta funcional, materiais e equipamento bem definidos.', tags:['games','cinema','materiais'], eyes:.9, head:.94, line:.45, shading:'realism', patch:{ eyeStyle:'narrow', faceShape:'angular', bodyShape:'athletic', torsoShape:'trapezoid', headToBodyRatio:6.5, outfitStyle:'adventure' }, recommendedOutfits:['adventure','scifi','fantasy','steampunk'] },
  { id:'realism-scientific', family:'realism', label:'Científico/anatômico', description:'Proporção neutra, leitura anatômica e mínima estilização decorativa.', tags:['científico','anatômico','didático'], eyes:.88, head:.93, line:.48, shading:'soft', patch:{ eyeStyle:'almond', browStyle:'soft', bodyShape:'average', headToBodyRatio:6.8, outfitStyle:'none' }, recommendedOutfits:['none','workwear'] },

  { id:'psychedelic-70s', family:'psychedelic', label:'Psicodélico 60/70', description:'Curvas fluidas, cor vibrante e sensação gráfica expansiva.', tags:['70s','fluido','vibrante'], eyes:1.16, head:1.08, line:1.16, shading:'psychedelic', patch:{ eyeStyle:'large', hairStyle:'curly', faceShape:'soft', lineColor:'#35104f', outfitStyle:'street', outfitPrimary:'#f15a8a', outfitSecondary:'#f5c542' }, recommendedOutfits:['street','kawaii','fantasy'] },
  { id:'psychedelic-neon', family:'psychedelic', label:'Neon maximalista', description:'Contrastes elétricos, contornos fortes e paleta sintética.', tags:['neon','maximalista','festival'], eyes:1.2, head:1.06, line:1.25, shading:'psychedelic', patch:{ eyeStyle:'large', hairStyle:'spiky', lineColor:'#24102e', outfitStyle:'tech', outfitPrimary:'#15d5d0', outfitSecondary:'#ff4fa3' }, recommendedOutfits:['tech','street','scifi'] },
  { id:'psychedelic-surreal', family:'psychedelic', label:'Surreal gráfico', description:'Distorção controlada, assimetria e detalhe ornamental.', tags:['surreal','experimental','autor'], eyes:1.25, head:1.12, line:.9, shading:'ornament', patch:{ eyeStyle:'upturned', headShape:'heart', hairStyle:'curly', outfitStyle:'fantasy' }, recommendedOutfits:['fantasy','elegant','street'] },

  { id:'steampunk-victorian', family:'steampunk', label:'Steampunk vitoriano', description:'Couro, bronze, relógios, goggles e alfaiataria retrofuturista.', tags:['cobre','couro','vitoriano'], eyes:.98, head:1, line:.9, shading:'metal', patch:{ lineColor:'#4b3528', outfitStyle:'steampunk', outfitPrimary:'#6f4b32', outfitSecondary:'#b98a4a' }, recommendedOutfits:['steampunk','historical','formal'] },
  { id:'steampunk-diesel', family:'steampunk', label:'Dieselpunk industrial', description:'Geometria robusta, metal escuro, utilitarismo e tecnologia pesada.', tags:['industrial','metal','utilitário'], eyes:.92, head:.98, line:1.05, shading:'metal', patch:{ faceShape:'angular', bodyShape:'athletic', outfitStyle:'workwear', outfitPrimary:'#4a4c47', outfitSecondary:'#9c754b' }, recommendedOutfits:['workwear','steampunk','adventure'] },
  { id:'steampunk-clockwork', family:'steampunk', label:'Clockwork fantástico', description:'Engrenagens aparentes, detalhes ornamentais e acabamento de coleção.', tags:['engrenagens','ornamental','fantasia'], eyes:1.08, head:1.02, line:.86, shading:'metal', patch:{ eyeStyle:'round', outfitStyle:'steampunk', outfitPrimary:'#704d32', outfitSecondary:'#d0a15b' }, recommendedOutfits:['steampunk','fantasy','elegant'] },

  { id:'comic-western', family:'comic', label:'HQ ocidental', description:'Contorno firme, sombra gráfica e proporções de narrativa sequencial.', tags:['hq','ação','contraste'], eyes:.98, head:1, line:1.42, shading:'cel', patch:{ faceShape:'angular', browStyle:'bold', bodyShape:'athletic', outfitStyle:'street' }, recommendedOutfits:['street','adventure','scifi'] },
  { id:'comic-noir', family:'comic', label:'Noir', description:'Preto dominante, recortes de luz e atmosfera dramática.', tags:['noir','alto contraste','dramático'], eyes:.92, head:1, line:1.55, shading:'ink', monochrome:true, patch:{ eyeStyle:'narrow', lineColor:'#101010', outfitStyle:'formal' }, recommendedOutfits:['formal','historical','workwear'] },
  { id:'comic-indie', family:'comic', label:'Indie/autoral', description:'Linha mais irregular, simplificação consciente e personalidade gráfica.', tags:['indie','autoral','gestual'], eyes:1.06, head:1.06, line:1.05, shading:'paper', patch:{ eyeStyle:'round', hairStyle:'bob', outfitStyle:'casual' }, recommendedOutfits:['casual','street','punk'] },

  { id:'storybook-gouache', family:'storybook', label:'Guache', description:'Massas opacas, textura de papel e paleta editorial.', tags:['guache','papel','editorial'], eyes:1.08, head:1.06, line:.65, shading:'paper', patch:{ faceShape:'soft', outfitStyle:'casual' }, recommendedOutfits:['casual','kawaii','historical'] },
  { id:'storybook-pencil', family:'storybook', label:'Lápis de cor', description:'Textura de pigmento, linha suave e acabamento artesanal.', tags:['lápis de cor','infantil','textura'], eyes:1.1, head:1.08, line:.58, shading:'hatch', patch:{ eyeStyle:'round', bodyShape:'average', outfitStyle:'basic' }, recommendedOutfits:['basic','school','kawaii'] },
  { id:'storybook-paper', family:'storybook', label:'Recorte de papel', description:'Planos de cor, bordas recortadas e composição lúdica.', tags:['paper cut','camadas','lúdico'], eyes:1.12, head:1.1, line:.82, shading:'flat', patch:{ eyeStyle:'dot', bodyShape:'chibi', outfitStyle:'kawaii' }, recommendedOutfits:['kawaii','basic','fantasy'] },

  { id:'anime-modern', family:'anime', label:'Anime moderno', description:'Cel shading limpo, olhos expressivos e acabamento de animação.', tags:['anime','cel shading','limpo'], eyes:1.24, head:1.03, line:.78, shading:'cel', patch:{ eyeStyle:'large', hairStyle:'spiky', headToBodyRatio:5.1, outfitStyle:'school' }, recommendedOutfits:['school','street','fantasy','scifi'] },
  { id:'anime-soft', family:'anime', label:'Anime soft', description:'Paleta suave, contorno leve e expressão delicada.', tags:['soft','pastel','emocional'], eyes:1.3, head:1.06, line:.62, shading:'soft', patch:{ eyeStyle:'large', faceShape:'soft', hairStyle:'long', outfitStyle:'elegant' }, recommendedOutfits:['elegant','school','kawaii'] },

  { id:'cartoon-editorial', family:'cartoon', label:'Cartoon editorial', description:'Exagero moderado, volumes simples e leitura imediata.', tags:['cartoon','editorial','expressivo'], eyes:1.18, head:1.12, line:1.32, shading:'flat', patch:{ eyeStyle:'round', bodyShape:'average', headToBodyRatio:4.2, outfitStyle:'casual' }, recommendedOutfits:['casual','street','sport'] },
  { id:'cartoon-rubber', family:'cartoon', label:'Rubber hose', description:'Membros flexíveis, desenho vintage e formas arredondadas.', tags:['vintage','rubber hose','animação'], eyes:1.08, head:1.18, line:1.45, shading:'ink', monochrome:true, patch:{ eyeStyle:'dot', bodyShape:'chibi', armStyle:'thin', legStyle:'long', outfitStyle:'basic' }, recommendedOutfits:['basic','historical'] },

  { id:'illustrated-soft', family:'illustrated', label:'Editorial suave', description:'Volume leve, íris detalhadas e acabamento contemporâneo.', tags:['editorial','versátil','suave'], eyes:1, head:1, line:.7, shading:'soft', patch:{ outfitStyle:'casual' }, recommendedOutfits:['casual','formal','street'] },
  { id:'watercolor-soft', family:'watercolor', label:'Aquarela suave', description:'Pigmento claro, bordas delicadas e granulação simulada.', tags:['aquarela','leve','papel'], eyes:1.02, head:1.02, line:.45, shading:'paper', patch:{ lineColor:'#675951', outfitStyle:'elegant' }, recommendedOutfits:['elegant','casual','historical'] },
  { id:'pencil-graphite', family:'pencil', label:'Grafite detalhado', description:'Hachura de grafite e variação sutil de pressão.', tags:['grafite','estudo','hachura'], eyes:1, head:1, line:.62, shading:'hatch', monochrome:true, patch:{ lineColor:'#49443f', outfitStyle:'casual' }, recommendedOutfits:['casual','workwear','historical'] },
  { id:'ink-brush', family:'ink', label:'Pincel e nanquim', description:'Linha gestual e massas de preto com variação de espessura.', tags:['nanquim','gestual','alto contraste'], eyes:1.02, head:1, line:1.12, shading:'ink', monochrome:true, patch:{ lineColor:'#171717', outfitStyle:'casual' }, recommendedOutfits:['casual','historical','punk'] },
  { id:'chibi-kawaii', family:'chibi', label:'Chibi kawaii', description:'Proporção superdeformada e acabamento de mascote/sticker.', tags:['kawaii','sticker','mascote'], eyes:1.45, head:1.36, line:1.08, shading:'flat', patch:{ eyeStyle:'large', bodyShape:'chibi', headToBodyRatio:2.8, limbLength:.74, outfitStyle:'kawaii' }, recommendedOutfits:['kawaii','school','fantasy'] },
];

export const CHARACTER_STYLES = CHARACTER_STYLE_FAMILIES;

export function styleVariantsForFamily(family: CharacterAppearance['artStyle']) {
  return CHARACTER_STYLE_VARIANTS.filter((variant) => variant.family === family);
}

export function defaultStyleVariant(family: CharacterAppearance['artStyle']) {
  const familyDef = CHARACTER_STYLE_FAMILIES.find((item) => item.id === family) || CHARACTER_STYLE_FAMILIES[0];
  return CHARACTER_STYLE_VARIANTS.find((variant) => variant.id === familyDef.defaultVariant)
    || CHARACTER_STYLE_VARIANTS.find((variant) => variant.family === familyDef.id)
    || CHARACTER_STYLE_VARIANTS.find((variant) => variant.family === 'illustrated')
    || CHARACTER_STYLE_VARIANTS[0];
}

export function selectedStyleVariant(a: CharacterAppearance): CharacterStyleVariant {
  return CHARACTER_STYLE_VARIANTS.find((variant) => variant.id === a.styleVariant && variant.family === a.artStyle)
    || defaultStyleVariant(a.artStyle || 'illustrated');
}

export function characterStyle(a: CharacterAppearance) {
  const variant = selectedStyleVariant(a);
  return { ...variant, id: variant.family, variantId: variant.id };
}

export function applyStyleVariant(a: CharacterAppearance, variantId: string): CharacterAppearance {
  const variant = CHARACTER_STYLE_VARIANTS.find((item) => item.id === variantId) || CHARACTER_STYLE_VARIANTS[0];
  const canDress = (a.bodyPlan || 'biped') === 'biped' || (a.species || 'human') === 'human' || (a.species || '') === 'anthropomorphic';
  const patch = { ...variant.patch };
  if (!canDress) delete patch.outfitStyle;
  return { ...a, ...patch, artStyle: variant.family, styleVariant: variant.id };
}

// Multiplicadores visuais operam sobre cópia; sliders continuam editáveis.
export function styledAppearance(a: CharacterAppearance): CharacterAppearance {
  const s = selectedStyleVariant(a);
  const base = {
    ...a,
    eyeSize: (a.eyeSize ?? 1) * s.eyes,
    headWidth: (a.headWidth ?? 1) * s.head,
    headHeight: (a.headHeight ?? 1) * s.head,
    strokeWidth: (a.strokeWidth ?? 1.8) * s.line,
    ...((s.family === 'chibi' || s.id === 'manga-chibi') ? { legLength: (a.legLength ?? 1) * .72, armLength: (a.armLength ?? 1) * .8 } : {}),
  };
  if (s.family === 'realism') {
    return {
      ...base,
      headWidth: (base.headWidth ?? 1) * .94,
      headHeight: (base.headHeight ?? 1) * .96,
      eyeSize: (base.eyeSize ?? 1) * .9,
      mouthSize: (a.mouthSize ?? 1) * .95,
      noseSize: (a.noseSize ?? 1) * 1.05,
      strokeWidth: Math.max(.75, (base.strokeWidth ?? 1.2) * .9),
      bodyWidth: Math.max(.94, a.bodyWidth ?? 1),
    };
  }
  if (s.family === 'psychedelic') {
    return {
      ...base,
      headWidth: (base.headWidth ?? 1) * 1.05,
      eyeSize: (base.eyeSize ?? 1) * 1.08,
      hairVolume: (a.hairVolume ?? 1) * 1.12,
      strokeWidth: (base.strokeWidth ?? 1.8) * 1.08,
    };
  }
  if (s.family === 'minimal-lineart') {
    return {
      ...base,
      strokeWidth: Math.max(.42, (base.strokeWidth ?? 1.1) * .52),
      eyeSize: (base.eyeSize ?? 1) * .88,
      irisScale: .62,
      hairVolume: (a.hairVolume ?? 1) * .84,
    };
  }
  if (s.family === 'pixel-art') {
    return { ...base, pixelResolution: a.pixelResolution || 32, pixelPaletteSize: a.pixelPaletteSize || 16, pixelOutline: a.pixelOutline ?? true };
  }
  if (s.family === 'voxel') {
    return { ...base, voxelYaw: a.voxelYaw ?? 28, voxelPitch: a.voxelPitch ?? 18, voxelDepth: a.voxelDepth ?? 1, voxelBevel: a.voxelBevel ?? 0 };
  }
  return base;
}

function shift(hex: string, n: number) {
  return '#' + [1,3,5].map(i => Math.max(0,Math.min(255,parseInt(hex.slice(i,i+2),16)+n)).toString(16).padStart(2,'0')).join('');
}

export function styleCharacterMarkup(markup: string, a: CharacterAppearance) {
  const s = selectedStyleVariant(a);
  const monochrome = Boolean(s.monochrome || ['manga','pencil','ink','engraving','minimal-lineart'].includes(s.family));
  if (s.family === 'minimal-lineart') {
    const ink = a.lineColor || '#252525';
    const simplified = markup
      .replace(/fill="url\(#[^"]+\)"/gi, 'fill="none"')
      .replace(/fill="#[a-f\d]{6}"/gi, 'fill="none"')
      .replace(/fill="white"/gi, 'fill="none"')
      .replace(/fill="#fff"/gi, 'fill="none"')
      .replace(/stroke="#[a-f\d]{6}"/gi, `stroke="${ink}"`)
      .replace(/stroke-width="([0-9.]+)"/gi, (_m, raw) => `stroke-width="${Math.max(.35, Math.min(1.65, Number(raw) * .36)).toFixed(2)}"`)
      .replace(/opacity="\.?\d+"/gi, 'opacity=".88"');
    return { defs: '', markup: `<g fill="none" stroke="${ink}" stroke-linecap="round" stroke-linejoin="round" stroke-width="${Math.max(.42,(a.strokeWidth || 1.2)*.5)}" opacity=".92">${simplified}</g>` };
  }
  const colors = [...new Set([...markup.matchAll(/fill="(#[a-f\d]{6})"/gi)].map(m => m[1]))];
  let defs = '';

  colors.forEach((c, i) => {
    const id = `cs-${i}`;
    if (s.shading === 'soft' || s.shading === 'paper' || s.shading === 'realism') {
      const dark = s.shading === 'realism' ? -52 : -28;
      const light = s.shading === 'realism' ? 35 : 22;
      defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2=".8"><stop stop-color="${shift(c,light)}"/><stop offset=".42" stop-color="${c}"/><stop offset="1" stop-color="${shift(c,dark)}"/></linearGradient>`;
    } else if (s.shading === 'cel') {
      defs += `<linearGradient id="${id}" x1="0" x2="1"><stop offset=".64" stop-color="${c}"/><stop offset=".64" stop-color="${shift(c,-44)}"/></linearGradient>`;
    } else if (s.shading === 'metal') {
      defs += `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${shift(c,35)}"/><stop offset=".28" stop-color="${c}"/><stop offset=".56" stop-color="${shift(c,-38)}"/><stop offset=".72" stop-color="${shift(c,12)}"/><stop offset="1" stop-color="${shift(c,-48)}"/></linearGradient>`;
    } else if (s.shading === 'psychedelic') {
      const a1 = shift(c,48), a2 = shift(c,-28), a3 = shift(c,82);
      defs += `<radialGradient id="${id}" cx=".35" cy=".3" r=".9"><stop stop-color="${a3}"/><stop offset=".32" stop-color="${a1}"/><stop offset=".68" stop-color="${c}"/><stop offset="1" stop-color="${a2}"/></radialGradient>`;
    } else if (s.shading === 'dots') {
      defs += `<pattern id="${id}" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="${shift(c,28)}"/><circle cx="1.3" cy="1.3" r=".8" fill="${shift(c,-18)}"/><circle cx="4.3" cy="4.3" r=".8" fill="${shift(c,-22)}"/></pattern>`;
    } else if (monochrome || ['hatch','ink','engrave','ornament'].includes(s.shading)) {
      const lum = .2126*parseInt(c.slice(1,3),16)+.7152*parseInt(c.slice(3,5),16)+.0722*parseInt(c.slice(5,7),16);
      const bg = lum < 65 ? '#2b2927' : '#fbf8ef';
      const motif = s.shading === 'engrave'
        ? '<path d="M-2 7L7-2M1 8L8 1" stroke="#6a625b" stroke-width=".42"/>'
        : s.shading === 'ornament'
          ? '<path d="M0 5Q2.5 0 5 5M0 0Q2.5 5 5 0" stroke="#82776d" stroke-width=".35" fill="none"/>'
          : s.shading === 'hatch'
            ? '<path d="M0 5L5 0" stroke="#81786e" stroke-width=".45"/>'
            : '<path d="M0 0L5 5" stroke="#514c48" stroke-width=".7"/>';
      defs += `<pattern id="${id}" width="5" height="5" patternUnits="userSpaceOnUse"><rect width="5" height="5" fill="${bg}"/>${motif}</pattern>`;
    } else {
      return;
    }
    markup = markup.split(`fill="${c}"`).join(`fill="url(#${id})"`);
  });

  defs += '<filter id="cs-paper" x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".065" numOctaves="2" seed="17" result="grain"/><feDisplacementMap in="SourceGraphic" in2="grain" scale=".72" xChannelSelector="R" yChannelSelector="G"/></filter>';
  defs += '<filter id="cs-realism" x="-10%" y="-10%" width="130%" height="130%"><feDropShadow dx="0" dy="3" stdDeviation="3" flood-color="#000" flood-opacity=".16"/><feGaussianBlur stdDeviation=".25"/></filter>';
  defs += '<filter id="cs-psy" x="-12%" y="-12%" width="140%" height="140%"><feTurbulence type="turbulence" baseFrequency=".012 .03" numOctaves="2" seed="9" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="7"/><feDropShadow dx="0" dy="0" stdDeviation="1.1" flood-color="#ff3db8" flood-opacity=".45"/></filter>';

  if (monochrome) markup = markup.replace(/stroke="#[a-f\d]{6}"/gi, 'stroke="#302c29"');
  if (['paper','hatch','ink','engrave'].includes(s.shading)) {
    markup = `<g filter="url(#cs-paper)">${markup}</g>`;
  }
  if (s.family === 'realism') {
    markup = `<g filter="url(#cs-realism)">${markup}</g>`;
  }
  if (s.family === 'psychedelic') {
    defs += '<pattern id="cs-psy-stripe" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M0 18Q9 0 18 18" fill="none" stroke="#ffef6b" stroke-width="2" opacity=".55"/></pattern>';
    markup = `<g filter="url(#cs-psy)">${markup}</g><path d="M108 78Q181 34 252 78" fill="none" stroke="#ff48b0" stroke-width="5" opacity=".35"/><path d="M118 102Q180 65 242 102" fill="none" stroke="#19d6ff" stroke-width="4" opacity=".32"/><ellipse cx="180" cy="255" rx="94" ry="155" fill="url(#cs-psy-stripe)" opacity=".14"/>`;
  }

  return { defs: `<defs>${defs}</defs>`, markup };
}
