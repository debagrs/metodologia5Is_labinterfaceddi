import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { generateMediatorInsight } from './src/server/mediatorEngine.js';

dotenv.config({ path: '.env.local' });
dotenv.config();

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  app.use(express.json({ limit: '2mb' }));

  app.post('/api/mediators/think', async (req, res) => {
    try {
      return res.json(await generateMediatorInsight(req.body));
    } catch (error: any) {
      console.error('[5I API]', error);
      return res.status(500).json({ error: error?.message || 'Erro interno na mediação.' });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const dist = path.resolve('dist');
    app.use(express.static(dist));
    app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
  } else {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => console.log(`[5I's] http://localhost:${port}`));
}

startServer();
