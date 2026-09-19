import type { Phase } from '../types';

export interface MethodologyTechnique {
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
export const PHASE_TECHNIQUES: Record<Phase, MethodologyTechnique[]> = {
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
