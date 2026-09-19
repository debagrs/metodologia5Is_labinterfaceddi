import React, { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Compass, Activity, Heart, UserCheck, Layout, BookOpen, 
  ChevronRight, ArrowLeft, Loader2, PlayCircle, Globe, Milestone, Check, RefreshCw,
  Menu, X, ShieldCheck, Code2, MessageCircle, Trash2, Users, Orbit, Bot, ExternalLink, Mic, Square as StopSquare, FileText
} from 'lucide-react';
import { Project, Phase, ThoughtNode, Mediator, UserProfile, CollaborationPermission, DrawingDocument } from '../types';
import InfiniteCanvas, { InfiniteCanvasHandle } from './InfiniteCanvas';
import { drawingToSvgString } from './DrawingStudio';
import MediatorSticker from './MediatorSticker';
import BrandMark from './BrandMark';
import AllCommentsPanel from './AllCommentsPanel';
import AgentChatPanel from './AgentChatPanel';
import ProjectCollaboratorsPanel from './ProjectCollaboratorsPanel';
import { ensureTursoSession } from '../lib/turso';

interface MethodologyTechnique {
  id: string;
  code: string | null;
  name: string;
  description: string;
  depth: number;
  parent: string | null;
}

/**
 * Técnicas e subitens da Metodologia 5I’s.
 * As descrições reproduzem o material-base fornecido para a metodologia.
 */
const PHASE_TECHNIQUES: Record<Phase, MethodologyTechnique[]> = {
  "Ideação": [
    {
      "id": "ideacao-1",
      "code": "1.1",
      "name": "Briefing",
      "description": "O Briefing estrutura o problema inicial do projeto e procura esclarecer o que será projetado, como, por quê, para quem, por quem e em que contexto ou lugar a interface será utilizada.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-2",
      "code": null,
      "name": "O quê?",
      "description": "Identifica o produto, serviço, sistema ou experiência que se pretende projetar.",
      "depth": 2,
      "parent": "1.1 Briefing"
    },
    {
      "id": "ideacao-3",
      "code": null,
      "name": "Como?",
      "description": "Define inicialmente de que maneira a solução poderá responder ao problema identificado.",
      "depth": 2,
      "parent": "1.1 Briefing"
    },
    {
      "id": "ideacao-4",
      "code": null,
      "name": "Por quê?",
      "description": "Explicita as razões, necessidades e motivações que justificam a existência do projeto.",
      "depth": 2,
      "parent": "1.1 Briefing"
    },
    {
      "id": "ideacao-5",
      "code": null,
      "name": "Para quem?",
      "description": "Identifica os públicos e usuários para os quais a interface será projetada.",
      "depth": 2,
      "parent": "1.1 Briefing"
    },
    {
      "id": "ideacao-6",
      "code": null,
      "name": "Por quem?",
      "description": "Introduz o caráter ativista da metodologia ao questionar em benefício de quem, de qual causa ou de quais transformações o projeto está sendo desenvolvido.",
      "depth": 2,
      "parent": "1.1 Briefing"
    },
    {
      "id": "ideacao-7",
      "code": null,
      "name": "Em que lugar?",
      "description": "Investiga os contextos, ambientes e situações em que o usuário poderá entrar em contato com a interface.",
      "depth": 2,
      "parent": "1.1 Briefing"
    },
    {
      "id": "ideacao-8",
      "code": "1.2",
      "name": "Brainstorming",
      "description": "O Brainstorming é uma técnica de geração livre de ideias, palavras, conceitos e possibilidades que amplia as alternativas para a concepção do projeto antes de sua seleção e refinamento.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-9",
      "code": "1.3",
      "name": "Mapas Mentais",
      "description": "Os Mapas Mentais organizam visualmente as ideias e associações geradas no projeto, conectando conceitos e começando a indicar possíveis tarefas, conteúdos, requisitos e funcionalidades.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-10",
      "code": "1.4",
      "name": "Busca ou Pesquisa por Referências",
      "description": "A Pesquisa por Referências investiga interfaces, produtos, experiências, imagens e soluções relacionadas ou transversalmente conectadas ao projeto para construir repertório e apoiar decisões posteriores.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-11",
      "code": "1.5",
      "name": "Atlas Mnemosyne",
      "description": "O Atlas Mnemosyne é uma técnica de organização e aproximação de imagens inspirada em Aby Warburg que procura identificar recorrências, sobrevivências e relações entre formas, cores e elementos visuais capazes de orientar conceitualmente o projeto.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-12",
      "code": "1.6",
      "name": "Pesquisa com Usuários",
      "description": "A Pesquisa com Usuários aproxima o projetista das pessoas para quem a interface será desenvolvida, permitindo compreender suas necessidades, conhecimentos, hábitos, comportamentos, dificuldades, expectativas e contextos de uso.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-13",
      "code": "1.7",
      "name": "Personas",
      "description": "Personas são representações de perfis de usuários construídas a partir de pesquisas e conhecimentos sobre o público, utilizadas para manter as necessidades das pessoas presentes durante as decisões de projeto.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-14",
      "code": null,
      "name": "Proto-personas",
      "description": "Proto-personas são representações preliminares dos usuários elaboradas com o conhecimento inicial da equipe e que devem ser posteriormente confrontadas, aprofundadas ou validadas por pesquisas com usuários reais.",
      "depth": 2,
      "parent": "1.7 Personas"
    },
    {
      "id": "ideacao-15",
      "code": null,
      "name": "Persona com requisitos de acessibilidade",
      "description": "A inclusão de necessidades de acessibilidade nas personas ajuda a considerar desde o início diferentes capacidades e condições de interação que precisam ser atendidas pelo projeto.",
      "depth": 2,
      "parent": "1.7 Personas"
    },
    {
      "id": "ideacao-16",
      "code": "1.8",
      "name": "Pontos de Contato com a Interface",
      "description": "Os Pontos de Contato representam as situações, lugares e circunstâncias em que os usuários encontrarão, acessarão ou utilizarão a interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-17",
      "code": "1.9",
      "name": "Golden Moments",
      "description": "Golden Moments são os momentos-chave de encontro entre usuário e interface, representando ocasiões especialmente relevantes da experiência de uso.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-18",
      "code": "1.10",
      "name": "Dados de Mercado",
      "description": "A Pesquisa de Dados de Mercado investiga informações sobre produtos, serviços, concorrentes, públicos e contextos competitivos que possam influenciar o posicionamento e as decisões do projeto.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-19",
      "code": "1.11",
      "name": "GDD — Game Design Document",
      "description": "O GDD é um documento de planejamento utilizado quando o projeto envolve jogos, reunindo e estruturando informações necessárias para orientar sua concepção e desenvolvimento.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-20",
      "code": "1.12",
      "name": "Estratégias Gamificadas",
      "description": "Estratégias Gamificadas incorporam princípios e elementos derivados dos jogos a interfaces que não necessariamente são jogos, visando estimular participação, envolvimento e continuidade da experiência.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "ideacao-21",
      "code": null,
      "name": "Estratégias de Engajamento",
      "description": "Estratégias de Engajamento planejam recursos e experiências que incentivem o usuário a participar, interagir e retornar à interface.",
      "depth": 2,
      "parent": "1.12 Estratégias Gamificadas"
    },
    {
      "id": "ideacao-22",
      "code": null,
      "name": "Sistemas de Recompensa",
      "description": "Sistemas de Recompensa oferecem retornos, conquistas ou benefícios associados às ações realizadas pelo usuário.",
      "depth": 2,
      "parent": "1.12 Estratégias Gamificadas"
    },
    {
      "id": "ideacao-23",
      "code": null,
      "name": "Sistemas de Pontuação",
      "description": "Sistemas de Pontuação atribuem valores às ações ou conquistas do usuário, permitindo acompanhar desempenho, avanço ou participação.",
      "depth": 2,
      "parent": "1.12 Estratégias Gamificadas"
    }
  ],
  "Inambulação": [
    {
      "id": "inambulacao-1",
      "code": "2.1",
      "name": "Requisitos de Usuário",
      "description": "Os Requisitos de Usuário descrevem aquilo de que os usuários necessitam para que suas necessidades, objetivos e condições de uso sejam atendidos pela interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inambulacao-2",
      "code": "2.2",
      "name": "Funcionalidades ou Requisitos Funcionais",
      "description": "As Funcionalidades descrevem aquilo que a interface ou sistema precisa possuir ou realizar tecnicamente para atender aos requisitos dos usuários.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inambulacao-3",
      "code": "2.3",
      "name": "Análise de Referências",
      "description": "A Análise de Referências investiga de forma aprofundada interfaces concorrentes, similares ou que possuam funcionalidades relacionadas ao projeto, identificando soluções, problemas, padrões e oportunidades.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inambulacao-4",
      "code": "2.4",
      "name": "Análises Heurísticas",
      "description": "A Análise Heurística examina sistematicamente interfaces concorrentes, similares ou relacionadas segundo princípios de usabilidade, permitindo identificar boas e más práticas que poderão orientar o projeto.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inambulacao-5",
      "code": "2.4.1",
      "name": "Feedback",
      "description": "Feedback verifica se o sistema responde de maneira clara às ações do usuário e comunica adequadamente o que está acontecendo na interface.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-6",
      "code": "2.4.2",
      "name": "Falar a linguagem do usuário",
      "description": "Falar a linguagem do usuário verifica se palavras, rótulos, símbolos e informações da interface são compreensíveis para o público e correspondem ao seu repertório.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-7",
      "code": "2.4.3",
      "name": "Liberdade e controle do usuário",
      "description": "Liberdade e Controle verifica se o usuário consegue tomar decisões, navegar, voltar atrás, cancelar ou corrigir ações sem ficar preso a caminhos impostos pelo sistema.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-8",
      "code": "2.4.4",
      "name": "Consistência",
      "description": "Consistência verifica se elementos, comportamentos, padrões visuais e formas de interação mantêm coerência ao longo de toda a interface.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-9",
      "code": "2.4.5",
      "name": "Prevenir erros",
      "description": "Prevenir Erros verifica se a interface antecipa possíveis enganos e organiza suas interações de maneira a reduzir a possibilidade de o usuário cometer erros.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-10",
      "code": "2.4.6",
      "name": "Reconhecer ao invés de lembrar",
      "description": "Reconhecer ao Invés de Lembrar verifica se opções, conteúdos e ações importantes permanecem visíveis ou reconhecíveis, reduzindo a necessidade de o usuário memorizar informações.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-11",
      "code": "2.4.7",
      "name": "Oferecer atalhos",
      "description": "Oferecer Atalhos verifica se a interface possibilita formas mais rápidas ou eficientes de realizar tarefas, especialmente para usuários mais experientes ou recorrentes.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-12",
      "code": "2.4.8",
      "name": "Diálogos naturais e simples",
      "description": "Diálogos Naturais e Simples verifica se a interface apresenta apenas informações relevantes e organiza visualmente o conteúdo com clareza, simplicidade e economia de elementos.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-13",
      "code": "2.4.9",
      "name": "Boas mensagens de erro",
      "description": "Boas Mensagens de Erro verifica se os problemas são comunicados de maneira compreensível e se a interface ajuda o usuário a reconhecer o erro e encontrar uma forma de resolvê-lo.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-14",
      "code": "2.4.10",
      "name": "Ajuda na documentação",
      "description": "Ajuda na Documentação verifica se o usuário encontra orientações e informações de apoio quando necessita compreender uma função, procedimento ou tarefa.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-15",
      "code": "2.4.11",
      "name": "Acessibilidade",
      "description": "Acessibilidade verifica se a interface considera diferentes capacidades, necessidades e formas de acesso, buscando possibilitar sua utilização pelo maior número possível de pessoas.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-16",
      "code": "2.4.12",
      "name": "Impacto social e ambiental",
      "description": "Impacto Social e Ambiental questiona quais consequências sociais e ambientais podem ser produzidas pela solução projetada, ampliando a avaliação para além da eficiência técnica da interface.",
      "depth": 2,
      "parent": "2.4 Análises Heurísticas"
    },
    {
      "id": "inambulacao-17",
      "code": "2.5",
      "name": "Análises Gráficas",
      "description": "As Análises Gráficas sistematizam os aspectos visuais e de interface dos produtos analisados, observando tipografias, cores, malhas gráficas, elementos de UI, padrões de interação, ilustrações, ícones e outros recursos pertinentes.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inambulacao-18",
      "code": "2.5.1",
      "name": "Paleta ou Sistema de Cores",
      "description": "A análise da Paleta de Cores identifica as cores empregadas pela interface, suas combinações, contrastes, hierarquias, consistência e funções na comunicação e na interação.",
      "depth": 2,
      "parent": "2.5 Análises Gráficas"
    },
    {
      "id": "inambulacao-19",
      "code": "2.5.2",
      "name": "Grids ou Malhas Gráficas",
      "description": "A análise de Grids observa a estrutura utilizada para organizar e alinhar conteúdos, considerando especialmente como a malha se adapta a diferentes tamanhos de tela.",
      "depth": 2,
      "parent": "2.5 Análises Gráficas"
    },
    {
      "id": "inambulacao-20",
      "code": "2.5.3",
      "name": "Tipografia",
      "description": "A análise tipográfica observa famílias, pesos, tamanhos, hierarquias, legibilidade e modos de utilização dos textos na interface.",
      "depth": 2,
      "parent": "2.5 Análises Gráficas"
    },
    {
      "id": "inambulacao-21",
      "code": "2.5.4",
      "name": "Elementos Gráficos",
      "description": "A análise de Elementos Gráficos observa recursos como formas, imagens, ilustrações, ícones, gráficos, cards, menus e demais componentes que constroem visualmente a interface.",
      "depth": 2,
      "parent": "2.5 Análises Gráficas"
    },
    {
      "id": "inambulacao-22",
      "code": "2.5.5",
      "name": "Padrões de Interação",
      "description": "A análise de Padrões de Interação investiga como botões, menus, gestos, controles, navegação e outros componentes respondem às ações do usuário.",
      "depth": 2,
      "parent": "2.5 Análises Gráficas"
    },
    {
      "id": "inambulacao-23",
      "code": "2.5.6",
      "name": "Estratégias Gamificadas",
      "description": "Quando pertinente, a análise observa como outras interfaces utilizam recompensas, pontuações, progressão, desafios e outros elementos de gamificação.",
      "depth": 2,
      "parent": "2.5 Análises Gráficas"
    },
    {
      "id": "inambulacao-24",
      "code": "2.5.7",
      "name": "Jogabilidade",
      "description": "Em projetos relacionados a games, a análise de jogabilidade observa como regras, comandos, desafios, respostas e ações estruturam a experiência do jogador.",
      "depth": 2,
      "parent": "2.5 Análises Gráficas"
    },
    {
      "id": "inambulacao-25",
      "code": "2.6",
      "name": "Escolha das Tecnologias",
      "description": "A Escolha das Tecnologias define quais recursos e plataformas serão utilizados para prototipar e implementar a solução, considerando conteúdo, funcionalidades, usuários, contexto, tempo e condições de desenvolvimento.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inambulacao-26",
      "code": null,
      "name": "Tecnologias de Prototipagem",
      "description": "São ferramentas utilizadas para representar, simular e testar a interface antes ou durante seu desenvolvimento técnico.",
      "depth": 2,
      "parent": "2.6 Escolha das Tecnologias"
    },
    {
      "id": "inambulacao-27",
      "code": null,
      "name": "Tecnologias de Implementação",
      "description": "São linguagens, frameworks, plataformas, sistemas e demais recursos técnicos utilizados para transformar o projeto em um produto funcional.",
      "depth": 2,
      "parent": "2.6 Escolha das Tecnologias"
    }
  ],
  "Instauração": [
    {
      "id": "instauracao-1",
      "code": "3.1",
      "name": "Arquitetura de Informação",
      "description": "A Arquitetura de Informação organiza conteúdos, espaços, categorias, relações e hierarquias da interface para que o usuário consiga compreender onde está, encontrar aquilo que procura e realizar suas tarefas.",
      "depth": 0,
      "parent": null
    },
    {
      "id": "instauracao-2",
      "code": "3.1.1",
      "name": "Sitemap",
      "description": "O Sitemap organiza e representa a estrutura das telas, páginas, seções, menus e rótulos necessários à interface, evidenciando as relações entre seus conteúdos.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-3",
      "code": "3.1.2",
      "name": "Rabiscoframes",
      "description": "Rabiscoframes são desenhos rápidos e exploratórios, normalmente feitos à mão, utilizados para experimentar como conteúdos e elementos poderão ser distribuídos nas telas antes do refinamento digital.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-4",
      "code": "3.1.3",
      "name": "Card Sorting",
      "description": "Card Sorting envolve usuários na organização, agrupamento ou rotulagem de conteúdos, ajudando a verificar se menus, categorias e estruturas de navegação correspondem à lógica das pessoas que utilizarão a interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-5",
      "code": "3.1.4",
      "name": "Wireframes",
      "description": "Wireframes representam de forma estruturada e ainda pouco detalhada a disposição de menus, botões, imagens, textos e demais elementos de uma tela antes do acabamento visual de alta fidelidade.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-6",
      "code": "3.1.5",
      "name": "Protótipo de Papel",
      "description": "O Protótipo de Papel transforma telas e fluxos em representações físicas simples que podem ser manipuladas e testadas rapidamente com usuários antes da construção digital.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-7",
      "code": "3.1.6",
      "name": "Protótipo Interativo",
      "description": "O Protótipo Interativo simula telas, fluxos e comportamentos da interface, permitindo que usuários executem tarefas e que o projetista avalie a interação antes do desenvolvimento técnico final.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-8",
      "code": "3.1.7",
      "name": "Design de Navegação",
      "description": "O Design de Navegação organiza os caminhos pelos quais o usuário se desloca entre páginas, telas, conteúdos e funcionalidades da interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-9",
      "code": "3.1.8",
      "name": "Ergodesign",
      "description": "Na estrutura da metodologia, o Ergodesign integra preocupações ergonômicas ao projeto da interface, buscando adequar a interação, os controles, a informação e a experiência às características e capacidades dos usuários.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-10",
      "code": "3.2",
      "name": "Design de Interação",
      "description": "O Design de Interação planeja como o usuário age sobre a interface e como a interface responde a essas ações, estruturando comportamentos, fluxos, controles e estados de interação.",
      "depth": 0,
      "parent": null
    },
    {
      "id": "instauracao-11",
      "code": "3.2.1",
      "name": "Fluxo / Jornada do Usuário",
      "description": "O Fluxo ou Jornada do Usuário representa a sequência de passos, decisões e interações realizadas para alcançar determinado objetivo na interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-12",
      "code": "3.2.2",
      "name": "Botões de Ação",
      "description": "Botões de Ação são componentes interativos projetados para comunicar claramente quais ações estão disponíveis e oferecer respostas perceptíveis quando utilizados.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-13",
      "code": "3.2.3",
      "name": "Estados de Interação",
      "description": "Estados de Interação representam condições como normal, hover, foco, ativo ou selecionado, permitindo que o usuário perceba visualmente como um elemento está respondendo à sua ação.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-14",
      "code": "3.2.4",
      "name": "Formulários",
      "description": "Formulários organizam a entrada e o envio de dados pelo usuário, devendo apresentar campos, rótulos, instruções e retornos compreensíveis para facilitar o preenchimento.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-15",
      "code": "3.2.5",
      "name": "Mensagens de Erro",
      "description": "Mensagens de Erro informam que determinada ação não ocorreu como esperado e devem ajudar o usuário a compreender o problema e encontrar meios de corrigi-lo.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-16",
      "code": "3.2.6",
      "name": "Instruções Complementares",
      "description": "Instruções Complementares oferecem orientações adicionais quando a própria organização da interface não é suficiente para explicar uma tarefa, função ou interação.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-17",
      "code": "3.3",
      "name": "Design de Informação",
      "description": "O Design de Informação organiza e hierarquiza conteúdos e elementos comunicacionais para tornar informações complexas mais claras, acessíveis, compreensíveis e utilizáveis pelo público.",
      "depth": 0,
      "parent": null
    },
    {
      "id": "instauracao-18",
      "code": "3.3.1",
      "name": "Identidade Visual",
      "description": "A Identidade Visual estabelece elementos gráficos capazes de identificar e diferenciar o projeto, criando unidade entre marca, tipografia, cores, formas e demais manifestações visuais da interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-19",
      "code": "3.3.2",
      "name": "Ilustrações",
      "description": "As Ilustrações são recursos visuais autorais ou selecionados para comunicar conceitos, complementar conteúdos, orientar a experiência ou constituir a linguagem visual particular do projeto.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-20",
      "code": "3.3.3",
      "name": "Ícones",
      "description": "Ícones sintetizam visualmente ações, conteúdos, categorias ou informações e devem ser suficientemente claros e consistentes para apoiar reconhecimento e navegação.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-21",
      "code": "3.3.4",
      "name": "Gráficos e Visualização de Dados",
      "description": "Gráficos organizam dados em representações visuais capazes de facilitar comparações, leituras, interpretações e compreensão de informações quantitativas ou relacionais.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-22",
      "code": "3.3.5",
      "name": "Personagens e Chatbots",
      "description": "A exploração de personagens para chatbots investiga representações visuais e comunicacionais capazes de orientar o usuário, personalizar o diálogo e auxiliar na compreensão de conteúdos ou tarefas.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-23",
      "code": "3.4",
      "name": "Design Sensorial",
      "description": "O Design Sensorial trabalha a dimensão perceptiva da interface e articula formas, cores, tipografia, imagens, movimento e demais recursos para construir a experiência sensorial e a expressão visual do projeto.",
      "depth": 0,
      "parent": null
    },
    {
      "id": "instauracao-24",
      "code": "3.4.1",
      "name": "Escolha do Estilo Gráfico",
      "description": "A Escolha do Estilo Gráfico define a linguagem visual predominante do projeto a partir dos conceitos, requisitos, referências e sensações que se deseja comunicar ao usuário.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-25",
      "code": "3.4.2",
      "name": "Paleta de Cores",
      "description": "A Paleta de Cores estabelece o sistema cromático do projeto, considerando identidade, contraste, hierarquia, consistência, legibilidade, acessibilidade e funções de cada cor na interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-26",
      "code": "3.4.3",
      "name": "Grids",
      "description": "Os Grids estruturam a disposição e o alinhamento dos elementos da interface e contribuem para que o conteúdo se adapte de maneira organizada a diferentes tamanhos de tela.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-27",
      "code": "3.4.4",
      "name": "Responsividade",
      "description": "Responsividade é a capacidade da interface de reorganizar conteúdos e componentes de modo adequado diante de diferentes dimensões e formatos de tela sem comprometer a experiência de uso.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-28",
      "code": "3.4.5",
      "name": "Tipografia",
      "description": "A Tipografia estabelece famílias, pesos, tamanhos, espaçamentos e hierarquias de texto capazes de sustentar identidade, legibilidade, leiturabilidade e organização das informações.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "instauracao-29",
      "code": "3.4.6",
      "name": "Motion Design e Microinterações",
      "description": "Motion Design e Microinterações utilizam movimentos e pequenas respostas animadas para acrescentar dinamismo, comunicar estados e tornar determinadas mudanças da interface perceptíveis ao usuário.",
      "depth": 1,
      "parent": null
    }
  ],
  "Inspeção": [
    {
      "id": "inspecao-1",
      "code": "4.1",
      "name": "Teste A/B",
      "description": "O Teste A/B compara duas alternativas de uma mesma solução para observar como diferentes versões respondem às necessidades, comportamentos ou preferências dos usuários.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inspecao-2",
      "code": "4.2",
      "name": "Testes com Usuários",
      "description": "Testes com Usuários colocam pessoas representativas do público em contato com a interface para observar como elas compreendem, percorrem e utilizam a solução proposta.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inspecao-3",
      "code": "4.3",
      "name": "Testes de Usabilidade",
      "description": "Testes de Usabilidade solicitam ao usuário a realização de tarefas na interface e observam dificuldades, erros, caminhos, compreensão e eficiência durante a interação.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inspecao-4",
      "code": "4.4",
      "name": "Testes de Acessibilidade",
      "description": "Testes de Acessibilidade investigam se pessoas com diferentes necessidades e capacidades conseguem acessar, compreender e operar a interface.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inspecao-5",
      "code": "4.5",
      "name": "Análises Heurísticas da Interface Projetada",
      "description": "Nesta fase, a Análise Heurística deixa de olhar prioritariamente para concorrentes e referências e passa a avaliar a própria interface projetada segundo critérios de usabilidade, acessibilidade e impacto.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inspecao-6",
      "code": null,
      "name": "Feedback",
      "description": "Verifica se a interface responde adequadamente às ações do usuário.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-7",
      "code": null,
      "name": "Falar a linguagem do usuário",
      "description": "Verifica se textos, termos, símbolos e conteúdos são compreensíveis para o público.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-8",
      "code": null,
      "name": "Liberdade e controle do usuário",
      "description": "Verifica se o usuário possui autonomia para navegar, escolher, retornar, cancelar e corrigir ações.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-9",
      "code": null,
      "name": "Consistência",
      "description": "Verifica se padrões visuais, comportamentos e interações permanecem coerentes em toda a interface.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-10",
      "code": null,
      "name": "Prevenir erros",
      "description": "Verifica se o projeto evita ou reduz situações que levem o usuário a cometer erros.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-11",
      "code": null,
      "name": "Reconhecer ao invés de lembrar",
      "description": "Verifica se informações e ações necessárias permanecem perceptíveis sem exigir memorização excessiva.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-12",
      "code": null,
      "name": "Oferecer atalhos",
      "description": "Verifica se existem alternativas eficientes para acelerar tarefas recorrentes ou realizadas por usuários experientes.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-13",
      "code": null,
      "name": "Diálogos naturais e simples",
      "description": "Verifica se a interface evita excesso de informação e apresenta apenas elementos pertinentes à tarefa e ao contexto.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-14",
      "code": null,
      "name": "Boas mensagens de erro",
      "description": "Verifica se os erros são apresentados claramente e acompanhados de informações que ajudem o usuário a resolvê-los.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-15",
      "code": null,
      "name": "Ajuda na documentação",
      "description": "Verifica se existem informações e orientações adequadas quando o usuário necessita de auxílio.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-16",
      "code": null,
      "name": "Acessibilidade",
      "description": "Verifica se a interface pode ser utilizada por pessoas com diferentes condições e necessidades de acesso.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-17",
      "code": null,
      "name": "Impacto social e ambiental",
      "description": "Verifica os possíveis efeitos sociais e ambientais associados ao projeto, ao produto e às suas formas de utilização.",
      "depth": 2,
      "parent": "4.5 Análises Heurísticas da Interface Projetada"
    },
    {
      "id": "inspecao-18",
      "code": "4.6",
      "name": "Avaliação",
      "description": "A Avaliação reúne e interpreta os dados obtidos nas inspeções para determinar quais aspectos devem ser mantidos, corrigidos, substituídos ou novamente testados.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "inspecao-19",
      "code": "4.7",
      "name": "Iteração",
      "description": "A Iteração é o retorno a etapas anteriores para modificar o projeto a partir dos resultados das avaliações, repetindo ciclos de prototipação, teste e melhoria.",
      "depth": 1,
      "parent": null
    }
  ],
  "Implementação": [
    {
      "id": "implementacao-1",
      "code": "5.1",
      "name": "Desenvolvimento Técnico",
      "description": "O Desenvolvimento Técnico transforma as especificações, protótipos, interações e componentes definidos pelo design em uma interface funcional por meio das tecnologias escolhidas para o projeto.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "implementacao-2",
      "code": "5.2",
      "name": "Checklists para o Desenvolvimento",
      "description": "Checklists sistematizam elementos, pendências, requisitos e alterações que precisam ser acompanhados durante a implementação para manter alinhamento entre design, conteúdo e desenvolvimento.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "implementacao-3",
      "code": "5.3",
      "name": "Produto Final",
      "description": "O Produto Final é a versão implementada e utilizável da interface que resulta das decisões, protótipos, testes e iterações realizadas durante o processo.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "implementacao-4",
      "code": "5.4",
      "name": "Novas Inspeções",
      "description": "Novas Inspeções avaliam o produto já implementado ou em processo de desenvolvimento para identificar problemas que só se tornam perceptíveis em condições mais próximas do uso real.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "implementacao-5",
      "code": "5.5",
      "name": "Substituições",
      "description": "Substituições correspondem à troca ou reformulação de conteúdos, componentes, interações ou soluções que não atenderam adequadamente aos requisitos identificados durante as inspeções.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "implementacao-6",
      "code": "5.6",
      "name": "Atualizações",
      "description": "Atualizações são modificações realizadas após ou durante a implementação para corrigir problemas, incorporar melhorias e manter a interface coerente com novas necessidades, conteúdos ou tecnologias.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "implementacao-7",
      "code": "5.7",
      "name": "Guia de Estilos / Manual de Estilos",
      "description": "O Guia de Estilos documenta padrões visuais e de interface, como cores, tipografia, grids, ícones e componentes, para facilitar a manutenção da consistência entre o projeto e sua implementação.",
      "depth": 1,
      "parent": null
    },
    {
      "id": "implementacao-8",
      "code": "5.8",
      "name": "Design System do Projeto",
      "description": "O Design System organiza de maneira sistemática princípios, estilos, componentes, padrões e regras reutilizáveis do projeto para manter consistência durante o desenvolvimento, evolução e manutenção da interface.",
      "depth": 1,
      "parent": null
    }
  ]
};

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
    id: 'agent-mago',
    name: 'Mago',
    role: 'Ideação, cenários futuros e design especulativo',
    phase: 'Ideação',
    description: 'Projeta cenários futuros para tensionar o presente e transformar sinais, incertezas e desejos em possibilidades de projeto.',
    bio: 'Agente de Ideação dedicado a futuros. Parte do design estratégico a partir do futuro, distinguindo futuros prováveis, possíveis e desejáveis e trabalhando com perguntas, tendências, sinais, contratendências, visões, territórios de oportunidade, conceitos e experimentos. Dialoga com André Coutinho e Anderson Penha, com a leitura de Patricia Hartmann, e com o design especulativo de Anthony Dunne e Fiona Raby. Também incorpora narrativas de futuros, everyday things, time travelling, participatory futures e create your own narrative, mantendo a lente ética do laboratório com Sasha Costanza-Chock, Mike Monteiro, Critical Design Lab e Guto Requena. Não prevê o futuro como certeza: constrói cenários contrastantes, explicita incertezas, pergunta quem ganha e quem perde, cria artefatos/props especulativos e faz backcasting do futuro desejável para decisões do presente.',
    iconName: 'Sparkles',
    themeColor: 'amber',
    greeting: 'Se este projeto chegasse até nós vindo de 2035, que futuro ele tornaria provável, possível ou desejável — e para quem?'
  },
  {
    id: 'agent-passeio',
    name: 'Passeio',
    role: 'Inambulação, campo e escuta',
    phase: 'Inambulação',
    description: 'Faz o projeto caminhar no território, nas pessoas e nas interfaces existentes.',
    bio: 'Agente de Inambulação. Convoca observação, escuta, cartografia, benchmarking crítico, pesquisa participante e contato com o ecossistema real. Dialoga com Latour, Costanza-Chock e métodos de pesquisa em design.',
    iconName: 'Compass',
    themeColor: 'sky',
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
    themeColor: 'sky',
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
    themeColor: 'emerald',
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
    themeColor: 'violet',
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
    themeColor: 'rose',
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
    themeColor: 'rose',
    greeting: 'Como esta decisão será preservada, testada e revisada quando virar sistema funcional?'
  },
  {
    id: 'agent-forja',
    name: 'Forja',
    role: 'Implementação full stack e tradução do projeto em sistema',
    phase: 'Implementação',
    description: 'Lê o projeto inteiro e o converte em engenharia de prompt ou em uma implementação full stack pronta para versionar e publicar.',
    bio: 'Agente construtor da fase de Implementação. Lê cards, referências, requisitos, relações, imagens e conversas do projeto antes de propor arquitetura. Pode entregar um superprompt técnico autocontido ou gerar um pacote React + Vite + TypeScript com Supabase e documentação para GitHub/Vercel. Mantém rastreabilidade com a Metodologia 5I’s, responsividade, acessibilidade, segurança e políticas RLS, sem expor segredos no front-end.',
    iconName: 'Code2',
    themeColor: 'rose',
    greeting: 'Você quer transformar esta documentação em um prompt técnico para outra IA ou já quer forjar a implementação full stack do projeto?'
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

type ForgeMode = 'prompt' | 'implementation';

type ForgeFile = { path: string; content: string };

const safeProjectSlug = (value: string) => String(value || 'projeto-5is')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'projeto-5is';

const downloadText = (name: string, content: string, type = 'text/markdown;charset=utf-8') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1200);
};

const crc32Table = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (bytes: Uint8Array) => {
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) crc = crc32Table[(crc ^ byte) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
};

const zipPath = (value: string) => String(value || 'arquivo.txt')
  .replace(/\\/g, '/')
  .replace(/^\/+/, '')
  .split('/')
  .filter((part) => part && part !== '.' && part !== '..')
  .join('/') || 'arquivo.txt';

const createTextZip = (files: ForgeFile[]) => {
  const encoder = new TextEncoder();
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const name = encoder.encode(zipPath(file.path));
    const data = encoder.encode(String(file.content ?? ''));
    const crc = crc32(data);

    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0x0800, true);
    lv.setUint16(8, 0, true);
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, name.length, true);
    lv.setUint16(28, 0, true);
    local.set(name, 30);
    localChunks.push(local, data);

    const central = new Uint8Array(46 + name.length);
    const cv = new DataView(central.buffer);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0x0800, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, name.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    central.set(name, 46);
    centralChunks.push(central);
    offset += local.length + data.length;
  }

  const centralSize = centralChunks.reduce((sum, item) => sum + item.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  return new Blob([...localChunks, ...centralChunks, end], { type: 'application/zip' });
};

const deploymentGuide = (projectName: string, assumptions: string[] = [], checks: string[] = []) => `# Implantação — ${projectName}\n\nEste pacote foi gerado pelo agente Forja a partir dos registros da Metodologia 5I’s. Antes de publicar, revise código, conteúdo, acessibilidade, políticas de dados e as hipóteses abaixo.\n\n## 1. Rodar localmente\n\n1. Descompacte o ZIP.\n2. Abra a pasta no terminal.\n3. Execute \`npm install\`.\n4. Copie \`.env.example\` para \`.env.local\`.\n5. Execute \`npm run dev\`.\n\n## 2. Supabase\n\n1. Crie um projeto em Supabase.\n2. Abra **SQL Editor** e execute \`supabase/schema.sql\` caso esse arquivo exista.\n3. Em **Project Settings → API**, copie a Project URL e a chave pública/anon.\n4. Preencha \`VITE_SUPABASE_URL\` e \`VITE_SUPABASE_ANON_KEY\` em \`.env.local\`.\n5. Confira as políticas RLS antes de inserir dados reais. Nunca coloque a service role key no navegador.\n\n## 3. GitHub\n\n\`\`\`bash\ngit init\ngit add .\ngit commit -m "Implementação inicial — Metodologia 5I's"\ngit branch -M main\ngit remote add origin SEU_REPOSITORIO_GITHUB\ngit push -u origin main\n\`\`\`\n\n## 4. Vercel\n\n1. Importe o repositório GitHub na Vercel.\n2. Framework: **Vite**.\n3. Adicione as mesmas variáveis de ambiente usadas localmente.\n4. Faça o deploy.\n5. Teste desktop e mobile e revise rotas, autenticação, storage e banco.\n\n## Hipóteses a validar\n${assumptions.length ? assumptions.map((item) => `- ${item}`).join('\n') : '- Nenhuma hipótese adicional foi declarada pelo gerador.'}\n\n## Checagens recomendadas após a geração\n${checks.length ? checks.map((item) => `- ${item}`).join('\n') : '- Execute npm install e npm run build antes de publicar.\n- Revise RLS, acessibilidade, responsividade, conteúdo e tratamento de erros.'}\n`;

const downloadForgeZip = (projectName: string, files: ForgeFile[], assumptions: string[] = [], checks: string[] = []) => {
  const normalized = new Map<string, string>();
  for (const file of files) normalized.set(zipPath(file.path), String(file.content ?? ''));
  normalized.set('README_5IS_DEPLOY.md', deploymentGuide(projectName, assumptions, checks));
  if (!normalized.has('.env.example')) {
    normalized.set('.env.example', 'VITE_SUPABASE_URL=\nVITE_SUPABASE_ANON_KEY=\n');
  }
  const blob = createTextZip([...normalized.entries()].map(([path, content]) => ({ path, content })));
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${safeProjectSlug(projectName)}-forja-implementacao.zip`;
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
  const [forgeMode, setForgeMode] = useState<ForgeMode>('prompt');
  const [isForging, setIsForging] = useState(false);
  const [forgeError, setForgeError] = useState('');
  const [forgeStatus, setForgeStatus] = useState('');
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

  const handleForgeProject = async () => {
    setIsForging(true);
    setForgeError('');
    setForgeStatus(forgeMode === 'prompt' ? 'Lendo o projeto e estruturando o superprompt…' : 'Lendo o projeto e arquitetando a implementação…');
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
          mode: forgeMode === 'prompt' ? 'implementation-prompt' : 'implementation-package',
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
          phase: 'Implementação',
          existingThoughts: nodes.map((node) => ({
            id: node.id,
            type: node.type,
            title: node.title,
            content: node.content,
            phase: node.phase,
            scientificContext: node.scientificContext || '',
            provocations: node.provocations || [],
            connections: (node.connections || []).map((id) => nodeById.get(id)?.title || id),
            imageUrl: node.imageUrl || '',
            imageName: node.imageName || '',
            drawingName: node.drawingName || '',
            drawing: node.drawing || undefined,
            interactiveName: node.interactiveName || '',
            interactive: node.interactive ? {
              engine: node.interactive.engine,
              title: node.interactive.title,
              prompt: node.interactive.prompt,
              code: node.interactive.code,
            } : undefined,
            attachments: (node.attachments || []).map((attachment) => ({
              name: attachment.name,
              type: attachment.type,
              url: attachment.url,
            }))
          })),
          conversations
        })
      });

      const raw = await response.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`A Forja devolveu uma resposta inválida (HTTP ${response.status}).`); }
      if (!response.ok) throw new Error(data.error || `A Forja não conseguiu concluir a tarefa (HTTP ${response.status}).`);

      if (forgeMode === 'prompt') {
        if (!data.promptEngineering) throw new Error('A Forja não devolveu o superprompt.');
        const markdown = `# Engenharia de Prompt — ${project.name}\n\n## Arquitetura sugerida\n${data.architectureSummary || 'A arquitetura está descrita no prompt abaixo.'}\n\n## Stack\n${Array.isArray(data.stack) ? data.stack.map((item: string) => `- ${item}`).join('\n') : ''}\n\n## Hipóteses a validar\n${Array.isArray(data.assumptions) && data.assumptions.length ? data.assumptions.map((item: string) => `- ${item}`).join('\n') : '- Nenhuma hipótese adicional declarada.'}\n\n## Critérios de aceite\n${Array.isArray(data.acceptanceCriteria) ? data.acceptanceCriteria.map((item: string) => `- ${item}`).join('\n') : ''}\n\n---\n\n## SUPERPROMPT\n\n${data.promptEngineering}\n`;
        downloadText(`${safeProjectSlug(project.name)}-engenharia-de-prompt.md`, markdown);
        setForgeStatus('Engenharia de prompt gerada e baixada.');
      } else {
        const pack = data.package;
        if (!pack?.files?.length) throw new Error('A Forja não devolveu arquivos de implementação.');
        setForgeStatus('Montando ZIP para GitHub + Supabase + Vercel…');
        downloadForgeZip(pack.projectName || project.name, pack.files, pack.assumptions || [], pack.postGenerationChecks || []);
        setForgeStatus('ZIP gerado. Revise e execute o passo a passo incluído.');
      }
    } catch (error: any) {
      console.error(error);
      setForgeError(error?.message || 'Não foi possível gerar a implementação.');
      setForgeStatus('');
    } finally {
      setIsForging(false);
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
            
            {(genError || publicationError || forgeError) && (
              <p className="text-[10px] font-mono text-red-600 bg-red-50 p-2.5 rounded border border-red-200">
                {forgeError || publicationError || genError}
              </p>
            )}
            {activeMediator.id === 'agent-publica' && publicationStatus && !publicationError && (
              <p className="text-[10px] font-mono text-neutral-600 bg-[#F5F5F3] p-2.5 rounded border border-[#E0E0DE]">{publicationStatus}</p>
            )}
            {activeMediator.id === 'agent-forja' && forgeStatus && !forgeError && (
              <p className="text-[10px] font-mono text-neutral-600 bg-[#FFF1F2] p-2.5 rounded border border-[#EE9BA4]">{forgeStatus}</p>
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
            ) : activeMediator.id === 'agent-forja' ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-[#F2F1ED] p-1">
                  <button type="button" onClick={() => setForgeMode('prompt')} className={`min-h-10 rounded-lg px-2 text-[9px] font-mono font-bold uppercase tracking-wide cursor-pointer ${forgeMode === 'prompt' ? 'bg-white shadow-sm text-black' : 'text-neutral-500'}`}>Engenharia de prompt</button>
                  <button type="button" onClick={() => setForgeMode('implementation')} className={`min-h-10 rounded-lg px-2 text-[9px] font-mono font-bold uppercase tracking-wide cursor-pointer ${forgeMode === 'implementation' ? 'bg-white shadow-sm text-black' : 'text-neutral-500'}`}>Implementação</button>
                </div>
                <motion.button
                  onClick={handleForgeProject}
                  disabled={isForging}
                  whileHover={{ scale: isForging ? 1 : 1.02 }}
                  whileTap={{ scale: isForging ? 1 : 0.98 }}
                  className="w-full bg-black text-white hover:bg-neutral-800 disabled:bg-neutral-400 transition-colors py-4 px-4 rounded-full flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.11em] cursor-pointer shadow-lg"
                >
                  {isForging ? <><Loader2 size={14} className="animate-spin" /><span>FORJANDO…</span></> : <><Code2 size={15} /><span>{forgeMode === 'prompt' ? 'GERAR SUPERPROMPT .MD' : 'GERAR PROJETO .ZIP'}</span></>}
                </motion.button>
                <p className="text-[9px] leading-relaxed text-neutral-500 text-center">{forgeMode === 'prompt' ? 'Entrega a especificação técnica autocontida para usar em outra IA.' : 'Gera código + .env.example + guia GitHub/Supabase/Vercel.'}</p>
              </div>
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
