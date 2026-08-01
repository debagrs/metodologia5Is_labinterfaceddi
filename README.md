# Metodologia 5I's — versão Turso

Esta versão usa Turso/libSQL para guardar os workspaces e controlar o limite diário das mediações de IA. O Supabase foi removido integralmente.

## 1. Criar o banco no Turso

1. Entre no painel do Turso e crie um banco.
2. Copie a URL do banco.
3. Crie e copie um token de autenticação do banco.
4. Não é necessário executar SQL manualmente: as tabelas são criadas automaticamente no primeiro acesso. O arquivo `turso/01_setup.sql` fica disponível apenas para conferência.

## 2. Variáveis no Vercel

Em **Vercel → projeto → Settings → Environment Variables**, adicione:

```env
TURSO_DATABASE_URL=libsql://SEU-BANCO-SUA-CONTA.turso.io
TURSO_AUTH_TOKEN=SEU_TOKEN_PRIVADO_DO_TURSO
SESSION_SECRET=UMA_FRASE_ALEATORIA_LONGA_COM_PELO_MENOS_24_CARACTERES
AI_DAILY_LIMIT=20
GROQ_API_KEY=SUA_CHAVE_GROQ
```

As variáveis `TURSO_AUTH_TOKEN`, `SESSION_SECRET` e as chaves de IA são privadas e nunca devem começar com `VITE_`.

Depois de salvar as variáveis, faça um novo deploy.

## 3. Como funciona

- O navegador recebe uma identidade anônima assinada pelo servidor.
- O token fica salvo no `localStorage` do mesmo navegador.
- O frontend chama apenas as rotas `/api/session`, `/api/workspace` e `/api/mediators/think`.
- A URL e o token privados do Turso permanecem somente nas Functions da Vercel.
- Cada navegador possui seu próprio workspace e sua própria cota diária.

A limpeza completa dos dados do navegador cria uma nova identidade. Isso é adequado para uso anônimo, mas não equivale a uma conta com login e recuperação por e-mail.

## 4. Desenvolvimento local

Copie `.env.example` para `.env.local`, preencha as variáveis e execute:

```bash
npm install
npm run dev
```

## 5. Provedores de IA

O padrão continua sendo Groq, com OpenRouter, Gemini e modo offline como contingências configuráveis:

```env
AI_PROVIDER=groq
AI_FALLBACK_ORDER=groq,openrouter,gemini,offline
```
