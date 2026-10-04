import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { generateMediatorInsight } from "./src/server/mediatorEngine.js";
import {
  consumeAiQuota,
  createAnonymousSession,
  ensureDatabase,
  readWorkspace,
  saveWorkspace,
  validateSessionToken,
} from "./src/server/turso.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  app.use(express.json({ limit: "2mb" }));

  app.post("/api/session", async (_req, res) => {
    try {
      await ensureDatabase();
      return res.status(201).json(createAnonymousSession());
    } catch (error: any) {
      return res
        .status(500)
        .json({ error: error?.message || "Erro ao criar sessão." });
    }
  });

  const workspaceHandler = (await import("./api/workspace.js")).default;
  app.all("/api/workspace", workspaceHandler);
  const fontsHandler = (await import("./api/google-fonts.js")).default;
  app.get("/api/google-fonts", fontsHandler);
  const uploadHandler = (await import("./api/upload.js")).default;
  app.post("/api/upload", uploadHandler);
  const clientUploadHandler = (await import("./api/upload-client.js")).default;
  app.post("/api/upload-client", clientUploadHandler);

  app.post("/api/mediators/think", async (req, res) => {
    const ownerId = validateSessionToken(req.headers.authorization);
    if (!ownerId)
      return res.status(401).json({ error: "Sessão inválida ou ausente." });
    try {
      const remainingToday = await consumeAiQuota(
        ownerId,
        Number(process.env.AI_DAILY_LIMIT || 20),
      );
      const insight = await generateMediatorInsight(req.body);
      return res.json({ ...insight, remainingToday });
    } catch (error: any) {
      console.error("[5I API]", error);
      const status = /Limite diário/i.test(error?.message || "") ? 429 : 500;
      return res
        .status(status)
        .json({ error: error?.message || "Erro interno na mediação." });
    }
  });

  if (process.env.NODE_ENV === "production") {
    const dist = path.resolve("dist");
    app.use(express.static(dist));
    app.get("*", (_req, res) => res.sendFile(path.join(dist, "index.html")));
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(port, "0.0.0.0", () =>
    console.log(`[5I's] http://localhost:${port}`),
  );
}

startServer();
