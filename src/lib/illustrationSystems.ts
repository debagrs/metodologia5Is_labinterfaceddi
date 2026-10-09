import type { CharacterAppearance, IllustrationGenre, IllustrationTechnique } from '../types';

export type IllustrationTechniqueProfile = {
  id: IllustrationTechnique;
  label: string;
  period: 'traditional' | 'modern';
  description: string;
  graphicDNA: string[];
  bestFor: string;
  lineScale: number;
  headScale?: number;
  eyeScale?: number;
};

export type IllustrationGenreProfile = {
  id: IllustrationGenre;
  label: string;
  description: string;
  graphicDNA: string[];
  bestFor: string;
  headScale: number;
  eyeScale: number;
  lineScale: number;
  limbScale: number;
  bodyScale: number;
};

/**
 * Repertório material baseado na distinção entre técnica de ilustração e gênero/uso.
 * A técnica controla COMO a imagem parece ter sido produzida; o gênero controla COMO
 * a linguagem organiza legibilidade, proporção e ênfase. Os dois eixos são independentes.
 */
export const ILLUSTRATION_TECHNIQUES: IllustrationTechniqueProfile[] = [
  {
    id: 'woodcut', label: 'Xilogravura', period: 'traditional',
    description: 'Leitura por cortes, alto contraste, massas escuras e textura de impressão.',
    graphicDNA: ['contraste claro × escuro', 'cortes grossos e irregulares', 'textura de matriz', 'paleta reduzida'],
    bestFor: 'editorial, cartaz, identidade, narrativas populares', lineScale: 1.38,
  },
  {
    id: 'metal-etching', label: 'Gravura em metal', period: 'traditional',
    description: 'Linha fina, hachura cruzada e construção tonal por densidade de traços.',
    graphicDNA: ['linhas finas', 'hachura e cross-hatching', 'papel claro', 'volume por densidade'],
    bestFor: 'editorial, rótulos, fantasia, ilustração histórica', lineScale: .72,
  },
  {
    id: 'pencil', label: 'Lápis', period: 'traditional',
    description: 'Grafite com variação de pressão, linhas de busca, sombras macias e hachura.',
    graphicDNA: ['grafite', 'pressão variável', 'hachura', 'bordas suaves', 'gesto de esboço'],
    bestFor: 'concept art, estudos, editorial, personagem', lineScale: .82,
  },
  {
    id: 'charcoal', label: 'Carvão', period: 'traditional',
    description: 'Traço mais espesso e escuro, manchas, esfumaçado e sombra de alta materialidade.',
    graphicDNA: ['massa escura', 'esfumaçado', 'traço macio e grosso', 'textura por fricção'],
    bestFor: 'retrato, atmosfera, estudos gestuais, narrativa dramática', lineScale: 1.28,
  },
  {
    id: 'lithography', label: 'Litografia', period: 'traditional',
    description: 'Impressão de aparência suave, tons lavados e transições de baixa agressividade.',
    graphicDNA: ['suavidade', 'cor lavada', 'grão de impressão', 'baixo contraste relativo'],
    bestFor: 'editorial, pôster, retrato, publicação', lineScale: .88,
  },
  {
    id: 'watercolor', label: 'Aquarela', period: 'traditional',
    description: 'Pigmento translúcido, transparências sobrepostas, bordas aquosas e mistura de cor.',
    graphicDNA: ['transparência', 'lavados', 'bordas aquosas', 'pigmento granulado', 'profundidade por camadas'],
    bestFor: 'infantil, editorial, moda, culinária, natureza', lineScale: .62,
  },
  {
    id: 'gouache', label: 'Guache', period: 'traditional',
    description: 'Cor opaca e mate, massas compactas, sobreposição e textura de tinta sobre papel.',
    graphicDNA: ['opacidade', 'massa cromática', 'acabamento mate', 'textura de papel', 'recorte firme'],
    bestFor: 'livro ilustrado, pôster, quadrinhos, editorial', lineScale: .82,
  },
  {
    id: 'acrylic', label: 'Acrílica', period: 'traditional',
    description: 'Pigmento opaco e versátil, cor intensa, pincelada e possibilidade de camadas espessas.',
    graphicDNA: ['cor saturada', 'pincelada', 'camadas opacas', 'contraste de matéria', 'acabamento versátil'],
    bestFor: 'pôster, publicidade, retrato, editorial', lineScale: .9,
  },
  {
    id: 'collage', label: 'Colagem', period: 'traditional',
    description: 'Assemblagem de planos, recortes, materiais e sombras entre camadas.',
    graphicDNA: ['recorte', 'sobreposição', 'camadas', 'sombras entre papéis', 'mistura de materiais'],
    bestFor: 'editorial, capa, publicidade, livro, experimentação', lineScale: .9,
  },
  {
    id: 'pen-ink', label: 'Bico de pena / nanquim', period: 'traditional',
    description: 'Tinta de alto contraste, linha expressiva, pontos e traços para criar valor.',
    graphicDNA: ['alto contraste', 'linha de tinta', 'pontilhado', 'hachura', 'massa preta'],
    bestFor: 'quadrinhos, editorial, tattoo, ilustração narrativa', lineScale: 1.08,
  },
  {
    id: 'digital-freehand', label: 'Digital à mão livre', period: 'modern',
    description: 'Pintura raster com transições suaves, detalhe fino e luz/sombra contínuas.',
    graphicDNA: ['gradientes suaves', 'detalhe fino', 'pincéis digitais', 'luz contínua', 'acabamento raster'],
    bestFor: 'concept art, games, publicidade, editorial', lineScale: .82,
  },
  {
    id: 'vector', label: 'Vetorial', period: 'modern',
    description: 'Formas nítidas, contornos precisos, áreas limpas e escalabilidade sem perda.',
    graphicDNA: ['formas limpas', 'contornos nítidos', 'áreas planas', 'geometria controlada', 'alta legibilidade'],
    bestFor: 'web, mascotes, branding, infografia, interface', lineScale: 1,
  },
];

export const ILLUSTRATION_GENRES: IllustrationGenreProfile[] = [
  {
    id: 'concept-art', label: 'Concept art',
    description: 'Explora alternativas de um mesmo tema, priorizando silhueta, função, materiais e desenvolvimento do personagem.',
    graphicDNA: ['variações de conceito', 'silhueta funcional', 'materiais legíveis', 'processo visível'],
    bestFor: 'games, animação, fantasia, cinema, worldbuilding', headScale: .97, eyeScale: .96, lineScale: .94, limbScale: 1.04, bodyScale: 1.01,
  },
  {
    id: 'children', label: 'Ilustração infantil',
    description: 'Narrativa visual clara, personagens amigáveis, ação legível e possibilidade de simplificação ou detalhe conforme a idade.',
    graphicDNA: ['narração visual', 'formas amigáveis', 'cor ativa', 'gesto claro', 'leitura imediata'],
    bestFor: 'livros, educação, jogos infantis, materiais pedagógicos', headScale: 1.08, eyeScale: 1.12, lineScale: 1.02, limbScale: .94, bodyScale: .98,
  },
  {
    id: 'comics', label: 'HQ / graphic novel',
    description: 'Imagem pensada para sequência, ritmo, leitura de painel, expressão e contraste narrativo.',
    graphicDNA: ['contorno narrativo', 'contraste', 'expressão', 'ritmo', 'leitura em sequência'],
    bestFor: 'HQ, webcomic, graphic novel, storyboard', headScale: 1, eyeScale: 1.02, lineScale: 1.14, limbScale: 1.02, bodyScale: 1,
  },
  {
    id: 'editorial', label: 'Livro / editorial',
    description: 'A imagem apoia ou expande uma ideia textual sem perder clareza, hierarquia e relação com a página.',
    graphicDNA: ['síntese', 'relação texto × imagem', 'hierarquia', 'metáfora visual', 'boa reprodução'],
    bestFor: 'livros, revistas, artigos, capas, publicações', headScale: 1, eyeScale: 1, lineScale: .94, limbScale: 1, bodyScale: 1,
  },
  {
    id: 'advertising', label: 'Publicidade',
    description: 'Uma ideia dominante, leitura rápida e memorável, com contraste suficiente para disputar atenção.',
    graphicDNA: ['foco único', 'impacto', 'contraste', 'memorabilidade', 'mensagem instantânea'],
    bestFor: 'campanhas, social, cartaz, lançamento, institucional', headScale: 1.03, eyeScale: 1.05, lineScale: 1.06, limbScale: 1, bodyScale: 1.01,
  },
  {
    id: 'packaging', label: 'Embalagem',
    description: 'Personagem pensado como parte de um sistema de superfície, repetição, diferenciação e leitura em escala de prateleira.',
    graphicDNA: ['silhueta forte', 'sistema decorativo', 'repetição', 'recorte limpo', 'leitura à distância'],
    bestFor: 'rótulos, embalagens, séries de produto, food design', headScale: 1.04, eyeScale: 1.03, lineScale: 1.07, limbScale: .98, bodyScale: 1,
  },
  {
    id: 'branding', label: 'Branding / mascote',
    description: 'Reduz detalhes para manter reconhecimento em tamanhos pequenos e preservar consistência entre aplicações.',
    graphicDNA: ['simplificação', 'silhueta memorável', 'consistência', 'boa redução', 'detalhe controlado'],
    bestFor: 'mascote, marca, avatar, identidade, sinalização', headScale: 1.06, eyeScale: 1.04, lineScale: 1.15, limbScale: .96, bodyScale: 1,
  },
];

export const illustrationTechniqueById = (id?: CharacterAppearance['illustrationTechnique']) =>
  ILLUSTRATION_TECHNIQUES.find((item) => item.id === id);

export const illustrationGenreById = (id?: CharacterAppearance['illustrationGenre']) =>
  ILLUSTRATION_GENRES.find((item) => item.id === id);

/** Sugestão apenas para exibição: não muda documentos antigos nem força um material novo. */
export function suggestedTechniqueForAppearance(a: CharacterAppearance): IllustrationTechnique {
  if (a.illustrationTechnique) return a.illustrationTechnique;
  const variant = String(a.styleVariant || '');
  if (variant.includes('woodcut')) return 'woodcut';
  if (variant.includes('copper') || a.artStyle === 'engraving') return 'metal-etching';
  if (variant.includes('pencil') || a.artStyle === 'pencil') return 'pencil';
  if (a.artStyle === 'watercolor') return 'watercolor';
  if (variant.includes('gouache')) return 'gouache';
  if (variant.includes('paper')) return 'collage';
  if (a.artStyle === 'ink' || a.artStyle === 'lineart' || a.artStyle === 'minimal-lineart') return 'pen-ink';
  return 'digital-freehand';
}

/** Sugestão apenas para exibição: a camada de gênero só altera o render quando explicitamente escolhida. */
export function suggestedGenreForAppearance(a: CharacterAppearance): IllustrationGenre {
  if (a.illustrationGenre) return a.illustrationGenre;
  if (a.artStyle === 'comic' || a.artStyle === 'manga') return 'comics';
  if (a.artStyle === 'storybook' || a.artStyle === 'chibi') return 'children';
  if (String(a.styleVariant || '').includes('concept')) return 'concept-art';
  return 'editorial';
}
