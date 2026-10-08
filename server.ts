import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import {
  createAnonymousSession,
  ensureDatabase,
} from "./src/server/turso.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT || 3000);
  app.use(express.json({ limit: "4mb" }));

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
  // Alias local legado: nao cria uma funcao Serverless adicional na Vercel.
  app.post("/api/upload-client", (req, res) => {
    req.url = "/api/upload?client=1";
    return uploadHandler(req, res);
  });

  // Use the same character, video and chat handler in development and Vercel.
  const thinkHandler = (await import("./api/mediators/think.js")).default;
  app.post("/api/mediators/think", thinkHandler);
  const generateImageHandler = (await import("./api/generate-image.js")).default;
  app.post("/api/generate-image", generateImageHandler);

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
