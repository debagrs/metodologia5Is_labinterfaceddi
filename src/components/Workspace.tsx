import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Compass, Activity, Heart, UserCheck, Layout, BookOpen, 
  ChevronRight, ArrowLeft, Loader2, PlayCircle, Globe, Milestone, Check, RefreshCw,
  Menu, X, ShieldCheck, Code2, MessageCircle, Trash2, Users, Orbit, Bot, ExternalLink, Mic, Square as StopSquare, FileText
} from 'lucide-react';
import { Project, Phase, ThoughtNode, Mediator, UserProfile, CollaborationPermission, DrawingDocument } from '../types';
import { PHASE_TECHNIQUES, type MethodologyTechnique } from '../data/methodologyTechniques';
import InfiniteCanvas, { InfiniteCanvasHandle } from './InfiniteCanvas';
import { drawingToSvgString } from './DrawingStudio';
import MediatorSticker from './MediatorSticker';
import BrandMark from './BrandMark';
import AllCommentsPanel from './AllCommentsPanel';
import AgentChatPanel from './AgentChatPanel';
import ProjectCollaboratorsPanel from './ProjectCollaboratorsPanel';
import { ensureTursoSession } from '../lib/turso';

interface WorkspaceProps {
  project: Project;
  nodes: ThoughtNode[];
  onUpdateNodeCoords: (id: string, x: number, y: number) => void;
  onAddCustomThought: (x: number, y: number) => void;
  onUpdateNodeContent: (id: string, text: string, completed?: boolean) => void;
  onDeleteNode: (id: string) => void;
  onUpdateNode: (node: ThoughtNode) => void;
  onUpdateNodes: (nodes: ThoughtNode[]) => void;
  onAddNode: (node: Omit<ThoughtNode, 'id' | 'createdAt'>) => void;
  onUpdatePhase: (phase: Phase) => void;
  onExit: () => void;
  onClearAll: () => void;
  currentUser?: UserProfile | null;
  studentName?: string;
  collaborationPermission?: CollaborationPermission | null;
  canManageCollaborators?: boolean;
}

const MEDIATORS: Mediator[] = [
  {
    id: 'agent-idea',
    name: 'Idea',
    role: 'Ideação, repertório e conexões',
    phase: 'Ideação',
    description: 'Abre possibilidades sem transformar o problema em solução pronta.',
    bio: 'Agente de Ideação da Metodologia 5I’s. Organiza repertórios, mapas mentais, hipóteses, perguntas e relações latentes. Trabalha com Gasparetto, Santaella, Manovich e Flusser para ampliar imaginação sem apagar autoria, contexto ou diferença.',
    iconName: 'Sparkles',
    themeColor: 'amber',
    greeting: 'Que relações ainda não foram percebidas porque o problema foi nomeado cedo demais?'
  },
  {
    id: 'agent-passeio',
    name: 'Passeio',
    role: 'Inambulação, campo e escuta',
    phase: 'Inambulação',
    description: 'Faz o projeto caminhar no território, nas pessoas e nas interfaces existentes.',
    bio: 'Agente de Inambulação. Convoca observação, escuta, cartografia, benchmarking crítico, pesquisa participante e contato com o ecossistema real. Dialoga com Latour, Costanza-Chock e métodos de pesquisa em design.',
    iconName: 'Compass',
    themeColor: 'emerald',
    greeting: 'O que muda quando saímos da tela e caminhamos com quem vive o problema?'
  },
  {
    id: 'agent-cosmos',
    name: 'Cosmos',
    role: 'Inambulação, cosmotécnica e repertórios hi-low',
    phase: 'Inambulação',
    description: 'Expande o repertório tecnológico da velha técnica às tecnologias emergentes, sempre em relação ao contexto.',
    bio: 'Agente de Inambulação orientado por Gilbert Simondon e Yuk Hui. Investiga individuação técnica, concretização, tecnodiversidade e cosmotécnica. Propõe possibilidades disruptivas em chave hi-low: pode cruzar técnicas vernaculares, analógicas, reaproveitadas, low-tech, infraestrutura contemporânea, fabricação digital e tecnologias emergentes, perguntando sempre que relação entre técnica, cultura, ambiente e valores cada escolha produz.',
    iconName: 'Orbit',
    themeColor: 'indigo',
    greeting: 'Que tecnologia faz sentido neste mundo específico — e que outras técnicas, antigas ou emergentes, revelam uma cosmotécnica diferente para o projeto?'
  },
  {
    id: 'agent-instaura',
    name: 'Instaura',
    role: 'Instauração, forma e prototipação',
    phase: 'Instauração',
    description: 'Transforma pesquisa em arquitetura, fluxos, rabiscoframes e experiências testáveis.',
    bio: 'Agente de Instauração. Ajuda a materializar relações em arquitetura da informação, jornadas, wireframes, protótipos, linguagem visual e sistemas de componentes. Usa Norman, Preece, Rogers e Sharp, Gestalt, Heller e semiótica sem cair no figmarismo.',
    iconName: 'Layout',
    themeColor: 'violet',
    greeting: 'Que estrutura torna visível a lógica do projeto sem aprisioná-la em um template?'
  },
  {
    id: 'agent-inspetor',
    name: 'Inspetor',
    role: 'Inspeção, usabilidade e evidências',
    phase: 'Inspeção',
    description: 'Procura fricções, erros, exclusões e diferenças entre intenção e uso real.',
    bio: 'Agente de Inspeção contínua. Cruza heurísticas de Nielsen, princípios de Norman, ergonomia cognitiva, acessibilidade, testes e evidências comportamentais. Não aprova por gosto: pede critérios, participantes e registros observáveis.',
    iconName: 'ShieldCheck',
    themeColor: 'indigo',
    greeting: 'Que evidência mostra que a experiência funciona para além da nossa própria familiaridade?'
  },
  {
    id: 'agent-rede',
    name: 'Rede',
    role: 'Implementação, relações sociotécnicas e ecossistemas',
    phase: 'Implementação',
    description: 'Mapeia atores humanos, não humanos, plataformas, infraestruturas e dependências.',
    bio: 'Agente de Implementação sociotécnica inspirado em Latour, Simondon e Haraway. Ajuda a ver o projeto como rede híbrida: pessoas, códigos, instituições, dados, animais, ambientes, dispositivos e disputas de poder.',
    iconName: 'Activity',
    themeColor: 'sky',
    greeting: 'Quem e o que sustenta esta solução — e quem fica invisível quando a rede é simplificada?'
  },
  {
    id: 'agent-ativista',
    name: 'Ativista',
    role: 'Bioética, justiça de design e participação',
    phase: 'Transversal',
    description: 'Tensiona poder, exclusão, sustentabilidade e consequências humanas e não humanas.',
    bio: 'Agente de bioética e design justice. Trabalha com Potter, Haraway, Costanza-Chock, Zuboff e educação humanitária. Questiona dark patterns, colonialidade, extração de dados, impacto ambiental e participação real.',
    iconName: 'Heart',
    themeColor: 'rose',
    greeting: 'Quem recebe os benefícios, quem assume os riscos e quem teve poder para decidir?'
  },
  {
    id: 'agent-responsa',
    name: 'Responsa',
    role: 'Acessibilidade, privacidade e responsabilidade',
    phase: 'Transversal',
    description: 'Transforma valores em salvaguardas, requisitos e critérios verificáveis.',
    bio: 'Agente transversal de responsabilidade projetual. Relaciona WCAG, e-MAG, desenho universal, linguagem simples, LGPD, segurança, transparência algorítmica e sustentabilidade computacional.',
    iconName: 'UserCheck',
    themeColor: 'emerald',
    greeting: 'Que requisito verificável garante acesso, autonomia, privacidade e possibilidade de recusa?'
  },
  {
    id: 'agent-implementa',
    name: 'Implementa',
    role: 'Implementação, documentação e continuidade',
    phase: 'Implementação',
    description: 'Leva o pensamento ao código sem perder decisões, contexto e critérios.',
    bio: 'Agente de Implementação da Metodologia 5I’s. Organiza design systems, tokens, componentes, critérios de aceite, testes, documentação, handoff, publicação e manutenção. Trata o MVP como experimento vivo, não como encerramento.',
    iconName: 'Code2',
    themeColor: 'sky',
    greeting: 'Como esta decisão será preservada, testada e revisada quando virar sistema funcional?'
  },
  {
    id: 'agent-publica',
    name: 'Publica',
    role: 'Publicação científica, síntese e documentação integral',
    phase: 'Transversal',
    description: 'Transforma o percurso do projeto em relato científico rastreável, preservando evidências, imagens, notas e conversas.',
    bio: 'Agente editorial da Metodologia 5I’s. Lê o conjunto do projeto — cards, relações, notas, registros por fase e conversas dos agentes — e organiza esse material como relato científico de projeto. Escreve sem inventar dados, resultados ou referências; explicita lacunas quando faltam evidências e preserva a autoria humana. Também monta um documento completo com o artigo e os anexos documentais do processo.',
    iconName: 'FileText',
    themeColor: 'violet',
    greeting: 'Que argumento científico emerge quando o processo inteiro é lido como documentação de projeto, e não como uma coleção de fragmentos?'
  }
];

const PHASES_METADATA: { phase: Phase; description: string; scientificContext: string }[] = [
  { 
    phase: 'Ideação', 
    description: 'Definição do escopo conceitual e tempestade de conexões.',
    scientificContext: 'Mapeamento Semântico & Conexões Latentes'
  },
  { 
    phase: 'Inambulação', 
    description: 'Caminhar no contexto. Imersão profunda no ambiente social.',
    scientificContext: 'Etnografia de Interfaces & Empatia Vernacular'
  },
  { 
    phase: 'Instauração', 
    description: 'Estabelecer os pilares, layout e grids estruturais.',
    scientificContext: 'Semiótica Aplicada & Modularidade Espacial'
  },
  { 
    phase: 'Inspeção', 
    description: 'Avaliação crítica baseada em usabilidade e bioética.',
    scientificContext: 'Carga Cognitiva & Heurísticas Adaptadas'
  },
  { 
    phase: 'Implementação', 
    description: 'Preparação sistêmica para tradução tecnológica.',
    scientificContext: 'Tokenização Semântica & Handoff Científico'
  },
];

type PublicationConversation = {
  mediatorId: string;
  mediatorName: string;
  messages: Array<{ role: 'user' | 'assistant'; text: string; createdAt?: string }>;
};

type PublicationArticle = {
  title: string;
  subtitle?: string;
  abstract: string;
  keywords: string[];
  sections: Array<{ heading: string; body: string }>;
  references?: string[];
  editorialNotes?: string[];
};

type PublicationVisual = {
  title: string;
  phase: string;
  source: string;
  src: string;
};

const escapeHtml = (value: string) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const richTextToHtml = (value: string) => {
  const blocks = String(value || '').trim().split(/\n\s*\n/).filter(Boolean);
  if (!blocks.length) return '<p>—</p>';
  return blocks.map((block) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((line) => /^[-*•]\s+/.test(line))) {
      return `<ul>${lines.map((line) => `<li>${escapeHtml(line.replace(/^[-*•]\s+/, ''))}</li>`).join('')}</ul>`;
    }
    return `<p>${lines.map(escapeHtml).join('<br/>')}</p>`;
  }).join('');
};

const publicationFileName = (name: string) => `${name || 'projeto-5is'}`
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'projeto-5is';

const collectProjectConversations = (projectId: string): PublicationConversation[] => {
  if (typeof window === 'undefined') return [];
  return MEDIATORS.map((mediator) => {
    const key = `5is_agent_chat_${projectId}_${mediator.id}`;
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || '[]');
      const messages = Array.isArray(parsed)
        ? parsed
            .filter((item: any) => item && (item.role === 'user' || item.role === 'assistant') && String(item.text || '').trim())
            .map((item: any) => ({ role: item.role, text: String(item.text), createdAt: item.createdAt ? String(item.createdAt) : undefined }))
        : [];
      return { mediatorId: mediator.id, mediatorName: mediator.name, messages } as PublicationConversation;
    } catch {
      return { mediatorId: mediator.id, mediatorName: mediator.name, messages: [] } as PublicationConversation;
    }
  }).filter((item) => item.messages.length > 0);
};

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(reader.error || new Error('Não foi possível ler a imagem.'));
  reader.readAsDataURL(blob);
});

const fetchImageAsDataUrl = async (url: string) => {
  if (!url) return '';
  if (url.startsWith('data:')) return url;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Imagem indisponível (${response.status}).`);
  return blobToDataUrl(await response.blob());
};

const drawingToPngDataUrl = async (drawing: DrawingDocument) => {
  const svg = drawingToSvgString(drawing);
  const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Não foi possível rasterizar a folha de desenho.'));
      element.src = blobUrl;
    });
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / Math.max(1, drawing.width));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(drawing.width * scale));
    canvas.height = Math.max(1, Math.round(drawing.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas de documentação indisponível.');
    context.fillStyle = drawing.background || '#FFFFFF';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
};

const collectProjectVisuals = async (nodes: ThoughtNode[]): Promise<PublicationVisual[]> => {
  const visuals: PublicationVisual[] = [];
  const seen = new Set<string>();
  const addUrl = async (url: string, title: string, phase: string, source: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    try {
      visuals.push({ title, phase, source, src: await fetchImageAsDataUrl(url) });
    } catch {
      visuals.push({ title, phase, source, src: url });
    }
  };

  for (const node of nodes) {
    if (node.type === 'canvas-image' && node.imageUrl) {
      await addUrl(node.imageUrl, node.imageName || node.title || 'Imagem do canvas', node.phase, 'Imagem livre no canvas');
    }
    for (const attachment of node.attachments || []) {
      if (attachment.type === 'image' && attachment.url) {
        await addUrl(attachment.url, attachment.name || node.title || 'Imagem anexada', node.phase, `Anexo do card “${node.title}”`);
      }
    }
    if (node.type === 'drawing-sheet' && node.drawing) {
      try {
        visuals.push({
          title: node.drawingName || node.title || 'Folha de desenho',
          phase: node.phase,
          source: 'Folha de desenho vetorial do canvas',
          src: await drawingToPngDataUrl(node.drawing)
        });
      } catch {
        // A documentação textual do desenho permanece nos cards mesmo se a rasterização falhar.
      }
    }
  }
  return visuals;
};

const downloadPublicationDoc = (
  project: Project,
  authorName: string,
  article: PublicationArticle,
  nodes: ThoughtNode[],
  conversations: PublicationConversation[],
  visuals: PublicationVisual[]
) => {
  const phaseOrder: Phase[] = ['Ideação', 'Inambulação', 'Instauração', 'Inspeção', 'Implementação'];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const articleSections = (article.sections || []).map((section) => `
    <h2>${escapeHtml(section.heading)}</h2>
    ${richTextToHtml(section.body)}
  `).join('');

  const references = article.references?.length
    ? `<h2>Referências</h2><ol>${article.references.map((reference) => `<li>${escapeHtml(reference)}</li>`).join('')}</ol>`
    : '';

  const editorialNotes = article.editorialNotes?.length
    ? `<div class="editorial"><h3>Notas editoriais antes da submissão</h3><ul>${article.editorialNotes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul></div>`
    : '';

  const visualsHtml = visuals.length
    ? visuals.map((visual, index) => `<figure>
        <img src="${escapeHtml(visual.src)}" alt="${escapeHtml(visual.title)}" />
        <figcaption>Figura ${index + 1} — ${escapeHtml(visual.title)}. ${escapeHtml(visual.source)} · ${escapeHtml(visual.phase)}.</figcaption>
      </figure>`).join('')
    : '<p>Nenhuma imagem pôde ser incorporada automaticamente nesta exportação.</p>';

  const cardsHtml = phaseOrder.map((phase) => {
    const phaseNodes = nodes.filter((node) => node.phase === phase);
    if (!phaseNodes.length) return '';
    return `<h3>${escapeHtml(phase)}</h3>${phaseNodes.map((node, index) => `
      <div class="record">
        <p class="meta">${index + 1}. ${escapeHtml(node.type)}${node.mediatorId ? ` · ${escapeHtml(node.mediatorId)}` : ''}</p>
        <h4>${escapeHtml(node.title || 'Sem título')}</h4>
        ${richTextToHtml(node.content || '')}
        ${node.scientificContext ? `<p><strong>Contexto científico:</strong> ${escapeHtml(node.scientificContext)}</p>` : ''}
        ${node.provocations?.length ? `<p><strong>Provocações:</strong></p><ul>${node.provocations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : ''}
        ${node.connections?.length ? `<p class="meta"><strong>Conexões no mapa:</strong> ${node.connections.map((id) => escapeHtml(nodeById.get(id)?.title || id)).join('; ')}</p>` : ''}
        ${node.attachments?.length ? `<p class="meta">Anexos: ${node.attachments.map((item) => escapeHtml(item.name)).join('; ')}</p>` : ''}
        <p class="meta">Registro criado em: ${escapeHtml(new Date(node.createdAt).toLocaleString('pt-BR'))}</p>
      </div>`).join('')}`;
  }).join('');

  const conversationHtml = conversations.length
    ? conversations.map((conversation) => `<h3>${escapeHtml(conversation.mediatorName)}</h3>${conversation.messages.map((message) => `
      <div class="conversation ${message.role}">
        <p class="meta">${message.role === 'assistant' ? escapeHtml(conversation.mediatorName) : 'Estudante'}${message.createdAt ? ` · ${escapeHtml(new Date(message.createdAt).toLocaleString('pt-BR'))}` : ''}</p>
        ${richTextToHtml(message.text)}
      </div>`).join('')}`).join('')
    : '<p>Não há conversas salvas com agentes neste navegador para este projeto.</p>';

  const html = `<!DOCTYPE html>
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(article.title || project.name)}</title>
    <style>
      @page { size: A4; margin: 2.5cm 2.2cm; }
      body { font-family: Arial, sans-serif; color:#111; line-height:1.55; font-size:11pt; }
      h1 { font-size:20pt; line-height:1.2; margin:0 0 8pt; }
      h2 { font-size:15pt; margin:22pt 0 8pt; page-break-after:avoid; }
      h3 { font-size:12pt; margin:18pt 0 6pt; page-break-after:avoid; }
      h4 { font-size:11pt; margin:8pt 0 4pt; }
      p { margin:0 0 9pt; text-align:justify; }
      ul, ol { margin:0 0 10pt 20pt; }
      .subtitle { font-size:12pt; color:#444; margin-bottom:16pt; }
      .meta { font-size:9pt; color:#666; text-align:left; }
      .abstract { border-top:1px solid #bbb; border-bottom:1px solid #bbb; padding:10pt 0; margin:16pt 0; }
      .page-break { page-break-before:always; }
      figure { margin:16pt 0 22pt; page-break-inside:avoid; }
      figure img { display:block; max-width:100%; max-height:650px; margin:0 auto; }
      figcaption { font-size:9pt; color:#555; margin-top:6pt; text-align:center; }
      .record { border-left:3px solid #111; padding:8pt 12pt; margin:0 0 12pt; background:#fafafa; page-break-inside:avoid; }
      .conversation { padding:8pt 10pt; margin:0 0 9pt; border:1px solid #ddd; }
      .conversation.assistant { background:#f7f7f7; }
      .editorial { border:1px solid #c7a900; background:#fffbea; padding:10pt 12pt; margin-top:18pt; }
    </style>
  </head>
  <body>
    <h1>${escapeHtml(article.title || project.name)}</h1>
    ${article.subtitle ? `<div class="subtitle">${escapeHtml(article.subtitle)}</div>` : ''}
    <p class="meta"><strong>Projeto:</strong> ${escapeHtml(project.name)} · <strong>Autoria:</strong> ${escapeHtml(authorName || 'A preencher')} · <strong>Metodologia:</strong> 5I’s</p>
    <div class="abstract"><p><strong>Resumo.</strong> ${escapeHtml(article.abstract || '')}</p><p><strong>Palavras-chave:</strong> ${(article.keywords || []).map(escapeHtml).join('; ')}.</p></div>
    ${articleSections}
    ${references}
    ${editorialNotes}

    <div class="page-break"></div>
    <h1>Documentação integral do projeto</h1>
    <p>Este apêndice preserva os registros utilizados pelo agente Publica para construir o relato científico, mantendo rastreabilidade entre texto final e processo projetual.</p>
    <h2>Dados do projeto</h2>
    <p><strong>Nome:</strong> ${escapeHtml(project.name)}</p>
    <p><strong>Tipo:</strong> ${escapeHtml(project.projectType)}</p>
    <p><strong>Problema:</strong> ${escapeHtml(project.problem)}</p>
    <p><strong>Comunidade:</strong> ${escapeHtml(project.community)}</p>
    <p><strong>ODS:</strong> ${escapeHtml(project.ods)}</p>

    <h2>Documentação visual</h2>
    ${visualsHtml}

    <div class="page-break"></div>
    <h2>Cards, notas e registros do canvas</h2>
    ${cardsHtml || '<p>Não há cards registrados.</p>'}

    <div class="page-break"></div>
    <h2>Conversas completas com os agentes</h2>
    ${conversationHtml}
  </body></html>`;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${publicationFileName(project.name)}-relato-cientifico-5is.doc`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};

export default function Workspace({
  project,
  nodes,
  onUpdateNodeCoords,
  onAddCustomThought,
  onUpdateNodeContent,
  onDeleteNode,
  onUpdateNode,
  onUpdateNodes,
  onAddNode,
  onUpdatePhase,
  onExit,
  onClearAll,
  currentUser,
  studentName,
  collaborationPermission = null,
  canManageCollaborators = false
}: WorkspaceProps) {
  const [selectedMediatorId, setSelectedMediatorId] = useState<string>('agent-idea');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genError, setGenError] = useState<string>('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [publicationError, setPublicationError] = useState('');
  const [publicationStatus, setPublicationStatus] = useState('');
  const desktopPanelsInitiallyOpen = () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches;
  const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState<boolean>(desktopPanelsInitiallyOpen);
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState<boolean>(desktopPanelsInitiallyOpen);
  const [isCommentsOpen, setIsCommentsOpen] = useState<boolean>(false);
  const [isAgentChatOpen, setIsAgentChatOpen] = useState<boolean>(false);
  const [isCollaboratorsOpen, setIsCollaboratorsOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceError, setVoiceError] = useState('');
  const [expandedTechniquesPhase, setExpandedTechniquesPhase] = useState<Phase | null>(null);
  const speechRecognitionRef = useRef<any>(null);
  const canvasRef = useRef<InfiniteCanvasHandle>(null);

  const activeMediator = MEDIATORS.find(m => m.id === selectedMediatorId) || MEDIATORS[0];
  const totalComments = nodes.reduce((sum, node) => sum + (node.comments?.length || 0), 0);
  const canEditCanvas = !collaborationPermission || collaborationPermission === 'edit';

  const addTechniqueNote = (phase: Phase, technique: MethodologyTechnique) => {
    if (!canEditCanvas) return;

    if (project.activePhase !== phase) onUpdatePhase(phase);

    const coreNode = nodes.find((node) => node.type === 'core');
    const position = canvasRef.current?.getCenteredCardPosition(360, 260) || {
      x: (coreNode?.x ?? 1000) + 420,
      y: coreNode?.y ?? 1000
    };

    const noteTitle = technique.code
      ? `${technique.code} ${technique.name}`
      : technique.parent
        ? `${technique.parent} · ${technique.name}`
        : technique.name;

    onAddNode({
      type: 'user-thought',
      title: noteTitle,
      content: technique.description,
      phase,
      x: position.x,
      y: position.y,
      connections: coreNode ? [coreNode.id] : [],
      isCompleted: false,
      scientificContext: `Técnica da Metodologia 5I’s · fase ${phase}.`
    });

    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsLeftSidebarOpen(false);
    }
  };

  // Helper to resolve icon React node
  const getMediatorIcon = (iconName: string, size = 16, className = "") => {
    switch(iconName) {
      case 'Compass': return <Compass size={size} className={className} />;
      case 'Activity': return <Activity size={size} className={className} />;
      case 'Heart': return <Heart size={size} className={className} />;
      case 'UserCheck': return <UserCheck size={size} className={className} />;
      case 'Layout': return <Layout size={size} className={className} />;
      case 'BookOpen': return <BookOpen size={size} className={className} />;
      case 'ShieldCheck': return <ShieldCheck size={size} className={className} />;
      case 'Code2': return <Code2 size={size} className={className} />;
      case 'Sparkles': return <Sparkles size={size} className={className} />;
      case 'Orbit': return <Orbit size={size} className={className} />;
      case 'FileText': return <FileText size={size} className={className} />;
      default: return <Compass size={size} className={className} />;
    }
  };

  const getMediatorColorClass = (color: string) => {
    switch(color) {
      case 'amber': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'emerald': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      case 'rose': return 'text-rose-600 bg-rose-50 border-rose-200';
      case 'indigo': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
      case 'violet': return 'text-violet-600 bg-violet-50 border-violet-200';
      case 'sky': return 'text-sky-600 bg-sky-50 border-sky-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const stopVoiceRecognition = () => {
    try { speechRecognitionRef.current?.stop?.(); } catch { /* recognition may already be stopped */ }
    setIsListening(false);
  };

  const startVoiceRecognition = () => {
    setVoiceError('');
    const SpeechRecognitionCtor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setVoiceError('Este navegador não oferece transcrição de voz nativa. No Android, use o Chrome atualizado.');
      return;
    }
    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'pt-BR';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const text = event.results[index][0]?.transcript || '';
          if (event.results[index].isFinal) finalText += `${text} `;
          else interimText += text;
        }
        if (finalText) setVoiceTranscript((previous) => `${previous}${previous && !previous.endsWith(' ') ? ' ' : ''}${finalText}`.trimStart());
        if (interimText) recognition.__interim = interimText;
      };
      recognition.onerror = (event: any) => {
        setVoiceError(event?.error === 'not-allowed' ? 'Permita o uso do microfone no navegador para transcrever.' : `Não foi possível transcrever (${event?.error || 'erro de voz'}).`);
        setIsListening(false);
      };
      recognition.onend = () => setIsListening(false);
      speechRecognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
    } catch (error: any) {
      setVoiceError(error?.message || 'Não foi possível iniciar o microfone.');
      setIsListening(false);
    }
  };

  const addVoiceNoteToCanvas = () => {
    const text = voiceTranscript.trim();
    if (!text) return;
    const position = canvasRef.current?.getCenteredCardPosition(340, 260) || { x: 1000, y: 1000 };
    onAddNode({
      type: 'user-thought',
      title: 'Nota por voz',
      content: text,
      phase: project.activePhase,
      x: position.x,
      y: position.y,
      connections: [],
      isCompleted: false,
      scientificContext: 'Transcrição de voz registrada diretamente no canvas.'
    });
    setVoiceTranscript('');
    setIsVoiceOpen(false);
    stopVoiceRecognition();
  };

  const handleGeneratePublication = async () => {
    setIsPublishing(true);
    setPublicationError('');
    setPublicationStatus('Lendo cards, notas e conversas…');

    try {
      const conversations = collectProjectConversations(project.id);
      const nodeById = new Map(nodes.map((node) => [node.id, node]));
      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({
          mode: 'publication',
          project: {
            name: project.name,
            projectType: project.projectType,
            problem: project.problem,
            community: project.community,
            ods: project.ods
          },
          mediator: {
            id: activeMediator.id,
            name: activeMediator.name,
            role: activeMediator.role,
            bio: activeMediator.bio
          },
          phase: project.activePhase,
          existingThoughts: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            content: node.content,
            phase: node.phase,
            scientificContext: node.scientificContext || '',
            provocations: node.provocations || [],
            connections: (node.connections || []).map((id) => nodeById.get(id)?.title || id),
            imageName: node.imageName || '',
            drawingName: node.drawingName || '',
            attachments: (node.attachments || []).map((attachment) => ({ name: attachment.name, type: attachment.type }))
          })),
          conversations
        })
      });

      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`O Publica devolveu uma resposta inválida (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(data.error || `Não foi possível gerar o relato (HTTP ${response.status}).`);
      if (!data.article?.title || !data.article?.abstract || !Array.isArray(data.article?.sections)) {
        throw new Error('O Publica devolveu um artigo incompleto. Tente novamente.');
      }

      setPublicationStatus('Incorporando imagens e folhas de desenho…');
      const visuals = await collectProjectVisuals(nodes);
      setPublicationStatus('Montando o documento Word…');
      downloadPublicationDoc(
        project,
        studentName || currentUser?.name || '',
        data.article as PublicationArticle,
        nodes,
        conversations,
        visuals
      );
      setPublicationStatus('Documento gerado.');
    } catch (error: any) {
      console.error(error);
      setPublicationError(error?.message || 'Não foi possível gerar a publicação.');
      setPublicationStatus('');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleTriggerMediator = async () => {
    setIsGenerating(true);
    setGenError('');

    try {
      const coreNode = nodes.find(n => n.type === 'core');
      const coreNodeId = coreNode ? coreNode.id : 'node-core';

      // O novo questionamento nasce no centro da área do canvas que a pessoa
      // está vendo agora, respeitando pan e zoom. Antes, ele era calculado em
      // torno da âncora central e podia aparecer muito abaixo ou fora da tela.
      const centeredPosition = canvasRef.current?.getCenteredCardPosition(360, 460);
      const spawnX = centeredPosition?.x ?? coreNode?.x ?? 1000;
      const spawnY = centeredPosition?.y ?? coreNode?.y ?? 1000;

      const session = await ensureTursoSession().catch(() => null);
      const response = await fetch('/api/mediators/think', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {})
        },
        body: JSON.stringify({
          project: {
            name: project.name,
            projectType: project.projectType,
            problem: project.problem,
            community: project.community,
            ods: project.ods
          },
          mediator: {
            id: activeMediator.id,
            name: activeMediator.name,
            role: activeMediator.role,
            bio: activeMediator.bio
          },
          phase: project.activePhase,
          existingThoughts: nodes.map(n => ({
            type: n.type,
            title: n.title,
            content: n.content,
            phase: n.phase
          }))
        })
      });

      const rawResponse = await response.text();
      let insight: any = {};

      try {
        insight = rawResponse ? JSON.parse(rawResponse) : {};
      } catch {
        throw new Error(
          response.ok
            ? 'A IA devolveu uma resposta em formato inválido.'
            : `A função de IA falhou na Vercel (HTTP ${response.status}). Consulte os logs do deploy.`
        );
      }

      if (!response.ok) {
        throw new Error(insight.error || `Falha ao buscar insights do Mediador (HTTP ${response.status}).`);
      }

      if (!insight.question || !Array.isArray(insight.provocations)) {
        throw new Error('A resposta da IA veio incompleta. Tente novamente.');
      }

      // Add the generated thought node to the infinite canvas
      onAddNode({
        type: 'question',
        title: activeMediator.name,
        content: insight.question,
        phase: project.activePhase,
        x: spawnX,
        y: spawnY,
        mediatorId: activeMediator.id,
        scientificContext: insight.scientificContext,
        provocations: insight.provocations,
        connections: [coreNodeId], // automatic link to project central anchor
        isCompleted: false
      });

    } catch (err: any) {
      console.error(err);
      setGenError(err.message || 'Erro inesperado na Inteligência de Mediação.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div id="project-workspace" className="h-[100dvh] flex flex-col bg-brand-beige font-sans select-none overflow-hidden">
      
      {/* Role Banner notifications */}
      {collaborationPermission && (
        <div className="bg-emerald-950 text-white text-xs py-2 px-4 flex items-center justify-between font-mono gap-2 shrink-0 z-30 shadow-sm">
          <span className="flex items-center gap-1.5 truncate"><Users size={13}/><span className="truncate">Projeto compartilhado — <strong>{collaborationPermission === 'edit' ? 'pode editar e comentar' : collaborationPermission === 'comment' ? 'pode comentar' : 'somente visualização'}</strong></span></span>
          <span className="text-[9px] uppercase tracking-wider bg-white/15 px-2 py-1 rounded-full hidden sm:inline">Colaboração</span>
        </div>
      )}
      {currentUser && currentUser.role === 'advisor' && (
        <div className="bg-neutral-900 text-white text-xs py-2 px-4 flex items-center justify-between font-mono gap-2 shrink-0 z-30 shadow-sm border-b border-black">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="truncate">Modo Orientador(a) — Visualizando mesa de: <strong>{studentName || 'Estudante'}</strong></span>
          </span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 hidden sm:inline">Visualização & Feedback</span>
        </div>
      )}

      {currentUser && currentUser.role === 'partner' && (
        <div className="bg-black text-white text-xs py-2 px-4 flex items-center justify-between font-mono gap-2 shrink-0 z-30 shadow-sm border-b border-neutral-900">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
            <span className="truncate">Parceiro(a) do Território — Ator: <strong>{currentUser.name}</strong> ({currentUser.partnerType ? currentUser.partnerType.toUpperCase() : 'Stakeholder'})</span>
          </span>
          <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider shrink-0 hidden sm:inline">{currentUser.institution || 'Ecossistema'}</span>
        </div>
      )}

      {currentUser && currentUser.role === 'student' && (
        <div className="bg-[#F5F5F3] text-neutral-800 text-[11px] py-1.5 px-4 flex items-center justify-between font-mono gap-2 border-b border-[#E0E0DE] shrink-0 z-30">
          <span className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">Estudante: <strong>{currentUser.name}</strong></span>
          </span>
          {studentName && (
            <span className="text-[10px] font-semibold text-neutral-500 bg-[#E0E0DE]/50 px-2 py-0.5 rounded shrink-0">
              Turma: {studentName}
            </span>
          )}
        </div>
      )}

      {/* Top Bar Navigation & Status */}
      <header id="workspace-top-bar" className="min-h-16 bg-[#FDFDFB]/90 backdrop-blur-md border-b border-[#F0F0EE] px-2 sm:px-5 py-2 flex items-center justify-between gap-2 z-30 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-4 min-w-0">
          <button 
            onClick={onExit}
            className="p-2 rounded-xl hover:bg-black/5 text-neutral-500 hover:text-black transition-colors cursor-pointer flex items-center gap-1.5"
            title="Voltar ao início"
          >
            <ArrowLeft size={15} />
            <span className="text-[12px] font-mono font-bold tracking-wider uppercase hidden sm:inline">SAIR</span>
          </button>
          
          <div className="h-4 w-[1px] bg-[#E0E0DE]" />
          
          <div className="flex items-center gap-2.5 sm:gap-3">
            <BrandMark compact priority className="w-[38px] h-[33px] flex-shrink-0 hidden min-[390px]:block" />
            <div className="h-4 w-[1px] bg-[#E0E0DE] hidden sm:block" />
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-bold uppercase tracking-widest text-black/40 hidden sm:block">Laboratório de Inteligência Projetual</span>
              <span className="text-sm font-semibold text-neutral-900 leading-tight truncate max-w-[64px] min-[390px]:max-w-[88px] sm:max-w-[200px]">{project.name}</span>
            </div>
          </div>
        </div>

        {/* Mid bar sustainability badge */}
        <div id="workspace-sustainability-indicator" className="hidden lg:flex items-center gap-2 bg-[#F5F5F3] border border-[#E0E0DE] px-3 py-1 rounded-full text-[12px] font-mono text-[#70706E]">
          <Globe size={11} className="text-neutral-500" />
          <span className="font-semibold uppercase tracking-wide opacity-60">Regido por:</span>
          <span className="truncate max-w-xs font-medium">{project.ods || 'A definir'}</span>
        </div>

        {/* Current status telemetry & Mobile Panel toggles */}
        <div className="flex min-w-0 items-center gap-1 sm:gap-2">
          {canManageCollaborators && (
            <button
              onClick={() => setIsCollaboratorsOpen(true)}
              className="p-2 rounded-xl border border-[#E0E0DE] bg-white hover:border-black transition-all flex items-center gap-1.5 cursor-pointer"
              title="Convidar colaboradores"
            >
              <Users size={15} />
              <span className="hidden md:inline text-[12px] font-mono font-bold uppercase tracking-wider">Colaboradores</span>
            </button>
          )}
          <button
            onClick={() => setIsCommentsOpen(true)}
            className="relative p-2 rounded-xl border border-[#E0E0DE] bg-white hover:border-black transition-all flex items-center gap-1.5 cursor-pointer"
            title="Ver todos os comentários"
          >
            <MessageCircle size={15} />
            <span className="hidden sm:inline text-[11px] font-mono font-bold uppercase">Comentários</span>
            {totalComments > 0 && <span className="absolute -top-2 -right-2 min-w-5 h-5 px-1 rounded-full bg-black text-white text-[9px] font-bold flex items-center justify-center">{totalComments}</span>}
          </button>
          <button
            onClick={() => {
              const first = window.confirm('Apagar todo o conteúdo do canvas? A âncora central do projeto será mantida vazia.');
              if (first && window.confirm('Tem certeza? Esta ação não pode ser desfeita.')) onClearAll();
            }}
            className="p-2 rounded-xl border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-all flex items-center gap-1.5 cursor-pointer"
            title="Apagar todo o conteúdo do canvas"
          >
            <Trash2 size={15} />
            <span className="hidden xl:inline text-[11px] font-mono font-bold uppercase">Limpar canvas</span>
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setIsLeftSidebarOpen(!isLeftSidebarOpen);
                setIsRightSidebarOpen(false);
              }}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                isLeftSidebarOpen 
                  ? 'bg-black text-white border-black shadow-sm' 
                  : 'bg-[#F5F5F3] text-neutral-600 border-[#E0E0DE] hover:bg-neutral-100'
              }`}
              title="Metodologia 5I’s"
            >
              <Compass size={14} />
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase hidden xl:inline">Fases</span>
            </button>
            
            <button
              onClick={() => {
                setIsRightSidebarOpen(!isRightSidebarOpen);
                setIsLeftSidebarOpen(false);
              }}
              className={`p-2 rounded-xl border transition-all flex items-center gap-1 cursor-pointer ${
                isRightSidebarOpen 
                  ? 'bg-black text-white border-black shadow-sm' 
                  : 'bg-[#F5F5F3] text-neutral-600 border-[#E0E0DE] hover:bg-neutral-100'
              }`}
              title="Agentes 5I’s"
            >
              <Sparkles size={14} />
              <span className="text-[9px] font-mono font-bold tracking-wider uppercase hidden xl:inline">Agentes</span>
            </button>
          </div>

          <span className="text-[11px] font-mono text-[#70706E] bg-[#F5F5F3] border border-[#E0E0DE] rounded-full px-3 py-1 font-semibold uppercase tracking-wider hidden md:block">
            Draft: {project.projectType}
          </span>
        </div>
      </header>

      {isCollaboratorsOpen && canManageCollaborators && (
        <ProjectCollaboratorsPanel project={project} onClose={() => setIsCollaboratorsOpen(false)} />
      )}

      {isCommentsOpen && (
        <AllCommentsPanel
          nodes={nodes}
          onClose={() => setIsCommentsOpen(false)}
          onOpenNode={(nodeId) => {
            setIsCommentsOpen(false);
            window.setTimeout(() => canvasRef.current?.focusNode(nodeId, true), 80);
          }}
        />
      )}
      {isVoiceOpen && (
        <div className="fixed inset-0 z-[120] bg-black/35 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => { stopVoiceRecognition(); setIsVoiceOpen(false); }}>
          <section className="w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl bg-white border border-black/10 shadow-2xl p-5" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <span className={`h-12 w-12 rounded-full border-2 border-black flex items-center justify-center shrink-0 ${isListening ? 'bg-red-100 animate-pulse' : 'bg-[#E9F7F2]'}`}><Mic size={21} /></span>
              <div className="min-w-0 flex-1">
                <div className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">Agente de registro</div>
                <h3 className="font-bold text-base">Voz → nova nota</h3>
                <p className="text-[11px] text-neutral-600 mt-1">Fale livremente. A transcrição pode ser revisada antes de virar um bloco no canvas.</p>
              </div>
              <button type="button" className="h-10 w-10 rounded-xl hover:bg-black/5 flex items-center justify-center" onClick={() => { stopVoiceRecognition(); setIsVoiceOpen(false); }}><X size={18} /></button>
            </div>
            <textarea
              value={voiceTranscript}
              onChange={(event) => setVoiceTranscript(event.target.value)}
              rows={7}
              placeholder="Sua fala aparecerá aqui…"
              className="w-full resize-none rounded-2xl border-2 border-black px-4 py-3 text-sm leading-relaxed outline-none focus:ring-2 focus:ring-black/10"
            />
            {voiceError && <p className="mt-2 text-[10px] font-mono text-red-700 bg-red-50 border border-red-200 rounded-xl p-2">{voiceError}</p>}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" onClick={isListening ? stopVoiceRecognition : startVoiceRecognition} className={`h-12 rounded-full border-2 border-black flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider ${isListening ? 'bg-red-50 text-red-700' : 'bg-white text-black'}`}>
                {isListening ? <><StopSquare size={16} /> Parar</> : <><Mic size={16} /> Gravar</>}
              </button>
              <button type="button" disabled={!voiceTranscript.trim()} onClick={addVoiceNoteToCanvas} className="h-12 rounded-full bg-black text-white disabled:opacity-30 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider">
                <Sparkles size={15} /> Criar nota
              </button>
            </div>
          </section>
        </div>
      )}

      {isAgentChatOpen && (
        <AgentChatPanel
          project={project}
          nodes={nodes}
          mediator={activeMediator}
          onClose={() => setIsAgentChatOpen(false)}
          onAddToCanvas={(message) => {
            const coreNode = nodes.find((node) => node.type === 'core');
            const centered = canvasRef.current?.getCenteredCardPosition(360, 430);
            onAddNode({
              type: 'insight',
              title: `${activeMediator.name} — conversa`,
              content: message,
              phase: project.activePhase,
              x: centered?.x ?? coreNode?.x ?? 1000,
              y: centered?.y ?? coreNode?.y ?? 1000,
              mediatorId: activeMediator.id,
              scientificContext: `Conversa com o agente ${activeMediator.name}, vinculada à fase ${project.activePhase}.`,
              provocations: [],
              connections: coreNode ? [coreNode.id] : [],
              isCompleted: false
            });
          }}
        />
      )}


      {/* Main workspace layout content splits */}
      <div id="workspace-body" className="flex-1 flex relative overflow-hidden">
        
        {/* Backdrops for mobile drawers */}
        {isLeftSidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/30 z-30 lg:hidden" 
            onClick={() => setIsLeftSidebarOpen(false)}
          />
        )}
        {isRightSidebarOpen && (
          <div 
            className="absolute inset-0 bg-black/30 z-30 lg:hidden" 
            onClick={() => setIsRightSidebarOpen(false)}
          />
        )}

        {/* Left Sidebar: Metodologia 5I’s organism tracker */}
        <aside 
          id="left-sidebar-methodology" 
          className={`absolute lg:relative top-0 left-0 h-full w-72 max-w-[88vw] shrink-0 bg-white border-r border-[#F0F0EE] flex flex-col justify-between z-40 lg:z-20 transition-transform duration-300 ${
            isLeftSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:hidden'
          }`}
        >
          {/* Mobile close button inside Left Sidebar header */}
          <button 
            onClick={() => setIsLeftSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-black/5 text-neutral-500 hover:text-black absolute top-4 right-4 z-50 cursor-pointer"
            title="Fechar menu"
          >
            <X size={15} />
          </button>
          
          {/* Header section */}
          <div className="p-5 border-b border-[#F0F0EE]">
            <span className="text-[11px] font-mono font-bold tracking-widest text-[#70706E] uppercase block mb-1">
              METODOLOGIA INTEGRADA
            </span>
            <h3 className="text-base font-semibold text-[#1A1A1A]">Metodologia 5I’s</h3>
            <p className="text-[13px] text-[#70706E] mt-1 font-light leading-relaxed">
              Selecione uma fase para abrir suas técnicas. Ao escolher uma técnica, uma nota explicativa é criada automaticamente no canvas.
            </p>
          </div>

          {/* Phase living map (list) - Beautiful Organic Connection Line & Dot Grid */}
          <div id="phases-living-list" className="flex-1 py-6 overflow-y-auto px-6 relative flex flex-col gap-6">
            {/* The Organic Connection Line */}
            <div className="absolute left-[38px] top-10 bottom-10 w-[1px] bg-gradient-to-b from-black via-[#E0E0DE] to-[#F0F0EE]" />

            {PHASES_METADATA.map((meta) => {
              const isActive = project.activePhase === meta.phase;
              const isExpanded = expandedTechniquesPhase === meta.phase;
              const techniques = PHASE_TECHNIQUES[meta.phase] || [];
              const completedNodesOfPhase = nodes.filter(n => n.phase === meta.phase && n.isCompleted).length;
              const totalNodesOfPhase = nodes.filter(n => n.phase === meta.phase).length;

              return (
                <div key={meta.phase} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePhase(meta.phase);
                      setExpandedTechniquesPhase((current) => current === meta.phase ? null : meta.phase);
                    }}
                    className={`w-full text-left flex items-start gap-4 transition-all duration-200 relative group cursor-pointer outline-none ${
                      isActive || isExpanded ? 'opacity-100' : 'opacity-40 hover:opacity-100'
                    }`}
                    aria-expanded={isExpanded}
                    aria-controls={`techniques-${meta.phase}`}
                  >
                    <div className="relative z-10 flex-shrink-0 mt-1">
                      {isActive ? (
                        <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center border-4 border-white shadow-md transition-all scale-110">
                          <div className="w-1.5 h-1.5 bg-white rounded-full" />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[#E0E0DE] flex items-center justify-center border-4 border-white transition-all">
                          <div className="w-1.5 h-1.5 bg-[#80807E] rounded-full" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[14px] tracking-tight uppercase font-bold text-[#1A1A1A]">
                          {meta.phase}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-black/50 bg-[#F5F5F3] border border-[#E0E0DE] px-1.5 py-0.5 rounded-full">
                            {completedNodesOfPhase}/{totalNodesOfPhase}
                          </span>
                          <ChevronRight
                            size={15}
                            className={`text-black/45 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                          />
                        </div>
                      </div>
                      <span className="text-[12px] text-black/40 font-medium leading-tight">
                        {meta.description}
                      </span>
                      <span className="text-[11px] font-mono text-[#70706E] tracking-tighter mt-1 italic block truncate max-w-[170px]">
                        {meta.scientificContext}
                      </span>
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        id={`techniques-${meta.phase}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden ml-11 mt-3"
                      >
                        <div className="rounded-2xl border border-[#E0E0DE] bg-[#FAFAF8] p-2.5 shadow-sm">
                          <div className="px-1.5 pb-2 mb-1 border-b border-black/5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-black/55">
                                Técnicas
                              </span>
                              <span className="text-[9px] font-mono text-black/35">
                                {techniques.length}
                              </span>
                            </div>
                            <p className="text-[10px] leading-snug text-black/45 mt-1">
                              Toque em uma técnica para criar automaticamente uma nota no centro visível do canvas.
                            </p>
                          </div>

                          <div className="flex flex-col gap-1.5 pt-1">
                            {techniques.map((technique) => (
                              <button
                                key={technique.id}
                                type="button"
                                disabled={!canEditCanvas}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  addTechniqueNote(meta.phase, technique);
                                }}
                                className={`w-full text-left rounded-xl border border-transparent px-2.5 py-2 transition-all group/tech ${
                                  canEditCanvas
                                    ? 'hover:bg-white hover:border-black/10 hover:shadow-sm active:scale-[0.99]'
                                    : 'opacity-40 cursor-not-allowed'
                                } ${technique.depth >= 2 ? 'ml-1 w-[calc(100%-0.25rem)]' : ''}`}
                                title={canEditCanvas ? `Criar nota: ${technique.name}` : 'Este projeto está em modo somente leitura.'}
                              >
                                <div className="flex items-start gap-2">
                                  <span className={`mt-0.5 shrink-0 font-mono text-[9px] font-bold ${
                                    technique.code ? 'text-black/60' : 'text-black/30'
                                  }`}>
                                    {technique.code || '↳'}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-start justify-between gap-2">
                                      <span className="text-[11px] leading-tight font-semibold text-[#1A1A1A]">
                                        {technique.name}
                                      </span>
                                      <span className="shrink-0 w-5 h-5 rounded-full border border-black/10 bg-white text-black/50 flex items-center justify-center text-[13px] leading-none group-hover/tech:bg-black group-hover/tech:text-white group-hover/tech:border-black transition-colors">
                                        +
                                      </span>
                                    </div>
                                    <span
                                      className="block text-[10px] leading-[1.35] text-black/45 mt-1"
                                      style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden'
                                      }}
                                    >
                                      {technique.description}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Core metadata footer summary with Poetic Quote Box */}
          <div className="p-5 border-t border-[#F0F0EE] bg-white space-y-4">
            <div className="p-4 rounded-2xl bg-[#F5F5F3] border border-[#E0E0DE]">
              <p className="text-[12px] leading-relaxed text-[#70706E] italic">
                "A forma segue o pensamento, mas o projeto segue a vida."
              </p>
            </div>
            
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 font-bold uppercase tracking-wider">
                <span>Estado Ecossistema:</span>
                <span className="text-neutral-700 font-bold flex items-center gap-1">
                  {Math.round((nodes.filter(n => n.isCompleted).length / Math.max(nodes.filter(n => n.type === 'question').length, 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-[#F0F0EE] rounded-full h-1 mt-1.5 overflow-hidden">
                <div 
                  className="bg-black h-full transition-all duration-300" 
                  style={{ width: `${Math.min(100, Math.round((nodes.filter(n => n.isCompleted).length / Math.max(nodes.filter(n => n.type === 'question').length, 1)) * 100))}%` }}
                />
              </div>
            </div>
          </div>

        </aside>

        {/* Center Section: Infinite Canvas Board */}
        <InfiniteCanvas
          ref={canvasRef}
          project={project}
          nodes={nodes}
          activePhase={project.activePhase}
          onUpdateNodeCoords={onUpdateNodeCoords}
          onAddCustomThought={onAddCustomThought}
          onUpdateNodeContent={onUpdateNodeContent}
          onDeleteNode={onDeleteNode}
          onUpdateNode={onUpdateNode}
          onUpdateNodes={onUpdateNodes}
          onAddNode={onAddNode}
          currentUser={currentUser!}
          collaborationPermission={collaborationPermission}
        />

        {/* Right Sidebar: Intelligent Mediators Panel */}
        <aside 
          id="right-sidebar-mediators" 
          className={`absolute lg:relative top-0 right-0 h-full w-[330px] max-w-[88vw] shrink-0 bg-white border-l border-[#F0F0EE] flex flex-col justify-between z-40 lg:z-20 transition-transform duration-300 ${
            isRightSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:hidden'
          }`}
        >
          {/* Mobile close button inside Right Sidebar header */}
          <button 
            onClick={() => setIsRightSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-black/5 text-neutral-500 hover:text-black absolute top-4 right-4 z-50 cursor-pointer"
            title="Fechar menu"
          >
            <X size={15} />
          </button>
          
          {/* Top section: selection of mediators */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-5 border-b border-[#F0F0EE]">
              <span className="text-[9px] font-mono font-bold tracking-widest text-[#70706E] uppercase block mb-1">
                INTELIGÊNCIA PROJETUAL
              </span>
              <h3 className="text-sm font-semibold text-[#1A1A1A]">Agentes 5I’s</h3>
              <p className="text-[11px] text-[#70706E] mt-1 font-light leading-relaxed">
                Agentes artificiais com linguagem da Metodologia 5I’s. Converse, questione e transforme a conversa em registro no canvas.
              </p>
            </div>

            {/* Micro grid select of Mediators */}
            <div className="p-4 border-b border-[#F0F0EE]">
              <span className="text-[9px] font-mono text-[#70706E] uppercase tracking-wider block mb-3 font-semibold">CONVOCAR AGENTE</span>
              <div className="grid grid-cols-3 gap-1.5">
                {MEDIATORS.map((m) => {
                  const isSelected = m.id === selectedMediatorId;
                  const colorStyle = getMediatorColorClass(m.themeColor);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedMediatorId(m.id)}
                      className={`mediator-picker py-2.5 px-1 rounded-2xl border transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer text-center group ${
                        isSelected 
                          ? 'border-black bg-white text-black shadow-[0_7px_0_#1A1A1A] -translate-y-1' 
                          : 'border-[#F0F0EE] hover:border-[#1A1A1A] bg-[#FDFDFB] text-[#1A1A1A]/70'
                      }`}
                      title={`${m.name} - ${m.role}`}
                    >
                      <MediatorSticker
                        mediatorId={m.id}
                        size={42}
                        state={isSelected ? 'selected' : 'idle'}
                        label={`Sticker de ${m.name}`}
                      />
                      <span className="text-[9px] font-mono font-bold truncate max-w-[85px]">{m.name}</span>
                      <span className={`h-1 w-1 rounded-full transition-all ${isSelected ? 'bg-black scale-100' : 'bg-transparent scale-0'}`} />
                    </button>
                  );
                })}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <a
                  href="https://chatgpt.com/g/g-ij5S5dmha-robo-da-metodologia-5i-s-de-design-de-interfaces"
                  target="_blank"
                  rel="noreferrer"
                  className="min-h-[76px] rounded-2xl border border-[#F0F0EE] bg-[#FDFDFB] hover:border-black px-2 py-2.5 flex flex-col items-center justify-center gap-1 text-center"
                  title="Abrir o Robô da Metodologia 5I’s em nova aba"
                >
                  <span className="h-9 w-9 rounded-full border-2 border-black bg-white flex items-center justify-center"><Bot size={18} /></span>
                  <span className="text-[9px] font-mono font-bold">ROBÔ 5I’s</span>
                  <span className="text-[8px] text-neutral-500 flex items-center gap-1">passo a passo <ExternalLink size={9} /></span>
                </a>
                <button
                  type="button"
                  onClick={() => { setIsVoiceOpen(true); setVoiceError(''); }}
                  className="min-h-[76px] rounded-2xl border border-[#F0F0EE] bg-[#FDFDFB] hover:border-black px-2 py-2.5 flex flex-col items-center justify-center gap-1 text-center"
                  title="Falar e criar uma nota transcrita no canvas"
                >
                  <span className="h-9 w-9 rounded-full border-2 border-black bg-[#E9F7F2] flex items-center justify-center"><Mic size={18} /></span>
                  <span className="text-[9px] font-mono font-bold">VOZ → NOTA</span>
                  <span className="text-[8px] text-neutral-500">transcrever no canvas</span>
                </button>
              </div>
            </div>

            {/* Active Selected Mediator Details Card */}
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <MediatorSticker
                  mediatorId={activeMediator.id}
                  size={68}
                  state={isGenerating ? 'thinking' : 'selected'}
                  label={`Agente ativo: ${activeMediator.name}`}
                />
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono font-bold text-[#70706E] uppercase">AGENTE ATIVO</span>
                  <h4 className="text-sm font-bold text-neutral-900 leading-snug">{activeMediator.name}</h4>
                  <span className="text-[10px] text-black font-mono tracking-wider font-semibold leading-none mt-0.5">{activeMediator.role}</span>
                </div>
              </div>

              {/* Bio description */}
              <div className="bg-[#F9F9F8] rounded-2xl p-4 border border-[#F0F0EE] flex flex-col gap-3">
                <p className="text-[11px] text-[#50504E] leading-relaxed font-light">
                  {activeMediator.bio}
                </p>
                <div className="w-full h-px bg-[#F0F0EE]" />
                
                {/* Embedded Dialectic Greeting */}
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-mono text-[#70706E] uppercase tracking-wider font-semibold">Tópico de Dialética</span>
                  <p className="text-xs text-neutral-900 font-medium italic leading-relaxed">
                    "{activeMediator.greeting}"
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer: Button to trigger generator on canvas */}
          <div className="p-4 bg-[#FDFDFB] border-t border-[#F0F0EE] space-y-3">
            
            {(genError || publicationError) && (
              <p className="text-[10px] font-mono text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {publicationError || genError}
              </p>
            )}
            {activeMediator.id === 'agent-publica' && publicationStatus && !publicationError && (
              <p className="text-[10px] font-mono text-neutral-600 bg-[#F5F5F3] p-2.5 rounded border border-[#E0E0DE]">{publicationStatus}</p>
            )}

            <button
              onClick={() => setIsAgentChatOpen(true)}
              className="w-full bg-white text-black border-2 border-black hover:bg-[#F5F5F3] transition-colors py-3.5 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.13em] cursor-pointer"
            >
              <MessageCircle size={15} />
              <span>CONVERSAR COM {activeMediator.name}</span>
            </button>

            {activeMediator.id === 'agent-publica' ? (
              <motion.button
                onClick={handleGeneratePublication}
                disabled={isPublishing}
                whileHover={{ scale: isPublishing ? 1 : 1.02 }}
                whileTap={{ scale: isPublishing ? 1 : 0.98 }}
                className="w-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors py-4 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.12em] cursor-pointer shadow-lg"
              >
                {isPublishing ? (
                  <><Loader2 size={14} className="animate-spin text-white" /><span className="font-mono text-[10px] tracking-wider uppercase">Documentando…</span></>
                ) : (
                  <><FileText size={15} /><span>GERAR ARTIGO + DOCUMENTAÇÃO .DOC</span></>
                )}
              </motion.button>
            ) : (
              <motion.button
                onClick={handleTriggerMediator}
                disabled={isGenerating}
                whileHover={{ scale: isGenerating ? 1 : 1.02 }}
                whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                className="w-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors py-4 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.15em] cursor-pointer shadow-lg"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span className="font-mono text-[10px] tracking-wider uppercase">Sintetizando...</span>
                  </>
                ) : (
                  <>
                    <span>PROVOCAR DIALÉTICA</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                  </>
                )}
              </motion.button>
            )}
            
            <div className="text-center">
              <span className="text-[9px] font-mono text-gray-400 uppercase tracking-widest block">
                A conversa pode ser transformada em card no canvas
              </span>
            </div>
          </div>

        </aside>

      </div>

    </div>
  );
}
