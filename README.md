# Plataforma 5I’s — versão hospedada com custo obrigatório zero

Esta versão usa Groq como provedor principal, OpenRouter como contingência opcional, Gemini como contingência opcional e um roteiro pedagógico offline quando nenhuma API responde. O Supabase guarda os trabalhos e limita o consumo diário por usuário.

## Ordem de implantação

1. Crie um projeto gratuito no Supabase.
2. Ative Authentication > Providers > Anonymous Sign-Ins.
3. Cole todo o arquivo `supabase/01_setup.sql` no SQL Editor e execute.
4. Copie Project URL e a chave pública/anon. Nunca use service_role no frontend.
5. Crie uma chave gratuita em Groq Console. Não cadastre cartão.
6. Suba este projeto no GitHub e importe no Vercel.
7. No Vercel, configure as variáveis do `.env.example`. As únicas obrigatórias são `GROQ_API_KEY`, `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
8. Use `AI_PROVIDER=groq` e `AI_FALLBACK_ORDER=groq,offline` para uma implantação totalmente gratuita e sem depender de outros cadastros.
9. Faça o deploy.

## Modelos atuais configurados

- rápido: `openai/gpt-oss-20b`;
- aprofundado: `qwen/qwen3.6-27b`;
- fallback OpenRouter: `openrouter/free`;
- fallback final: roteiros pedagógicos locais, sem chamada de IA.

## Proteção de cota

`AI_DAILY_LIMIT=20` limita cada identidade anônima a 20 mediações por dia. A função SQL é atômica e protegida pelo JWT do Supabase. Você pode alterar para 10, 15 ou 20 sem mudar código.

## Variáveis mínimas no Vercel

```env
AI_PROVIDER=groq
AI_FALLBACK_ORDER=groq,offline
GROQ_API_KEY=SUA_CHAVE
GROQ_FAST_MODEL=openai/gpt-oss-20b
GROQ_DEEP_MODEL=qwen/qwen3.6-27b
VITE_SUPABASE_URL=SUA_URL
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
AI_DAILY_LIMIT=20
APP_URL=https://SEU-PROJETO.vercel.app
```

## Segurança

As chaves de IA permanecem somente nas Functions do Vercel. A chave pública do Supabase pode estar no frontend porque o acesso é protegido por RLS. Não envie `.env.local` ao GitHub.

## Stickers e microinterações dos agentes

A interface inclui uma família autoral de stickers vetoriais para os oito mediadores. Eles são desenhados integralmente com React, CSS e ícones Lucide, sem imagens externas, licenças adicionais ou custos. Cada personagem possui cor, forma e símbolo próprios, além de estados de repouso, seleção, processamento, alerta e celebração. As animações respeitam automaticamente `prefers-reduced-motion`.

Arquivos principais:

- `src/components/MediatorSticker.tsx`
- `src/components/Workspace.tsx`
- `src/components/InfiniteCanvas.tsx`
- `src/index.css`

