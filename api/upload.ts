// @ts-nocheck
import crypto from "node:crypto";
import { put } from "@vercel/blob";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export const config = {
  api: {
    // Mantemos o body parser desligado porque este mesmo endpoint recebe
    // tanto arquivos binarios pequenos quanto o protocolo JSON do client upload.
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const MAX_CLIENT_REQUEST_SIZE = 1024 * 1024;
const MAX_CLIENT_UPLOAD_SIZE = 100 * 1024 * 1024;

function validateSession(rawHeader: string | undefined) {
  const sessionSecret = process.env.SESSION_SECRET || "";

  if (!rawHeader?.startsWith("Bearer ") || sessionSecret.length < 24) {
    return null;
  }

  const token = rawHeader.slice(7).trim();
  const separatorIndex = token.lastIndexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const ownerId = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expectedSignature = crypto
    .createHmac("sha256", sessionSecret)
    .update(ownerId)
    .digest("base64url");

  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (receivedBuffer.length !== expectedBuffer.length) {
    return null;
  }

  return crypto.timingSafeEqual(receivedBuffer, expectedBuffer)
    ? ownerId
    : null;
}

async function readRequestBody(req: any, maxSize = MAX_FILE_SIZE) {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalSize += buffer.length;

    if (totalSize > maxSize) {
      throw new Error("A requisicao ultrapassa o limite permitido.");
    }

    chunks.push(buffer);
  }

  return Buffer.concat(chunks);
}

function sanitizeFilename(filename: string) {
  const sanitized = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "arquivo";
}

function isClientUploadRequest(req: any) {
  const queryValue = Array.isArray(req?.query?.client)
    ? req.query.client[0]
    : req?.query?.client;
  if (String(queryValue || "") === "1") return true;

  try {
    const parsed = new URL(String(req?.url || ""), "http://localhost");
    return parsed.searchParams.get("client") === "1";
  } catch {
    return false;
  }
}

async function parseClientUploadBody(req: any): Promise<HandleUploadBody> {
  // No servidor Express local o express.json() ja pode ter preenchido req.body.
  if (req?.body && typeof req.body === "object" && !Buffer.isBuffer(req.body)) {
    return req.body as HandleUploadBody;
  }

  const raw = await readRequestBody(req, MAX_CLIENT_REQUEST_SIZE);
  if (!raw.length) throw new Error("Requisicao de upload vazia.");

  try {
    return JSON.parse(raw.toString("utf8")) as HandleUploadBody;
  } catch {
    throw new Error("Requisicao de upload invalida.");
  }
}

async function handleClientBlobUpload(req: any, res: any) {
  const body = await parseClientUploadBody(req);

  const result = await handleUpload({
    request: req,
    body,
    onBeforeGenerateToken: async (pathname) => {
      const ownerId = validateSession(req.headers.authorization);
      if (!ownerId) throw new Error("Sessao invalida.");

      if (
        !pathname.startsWith(`5is/${ownerId}/`) ||
        pathname.includes("..") ||
        pathname.length > 300
      ) {
        throw new Error("Destino de upload invalido.");
      }

      return {
        allowedContentTypes: ["image/*", "video/*", "audio/*"],
        maximumSizeInBytes: MAX_CLIENT_UPLOAD_SIZE,
        addRandomSuffix: true,
        allowOverwrite: false,
        validUntil: Date.now() + 15 * 60 * 1000,
        tokenPayload: JSON.stringify({ ownerId }),
      };
    },
    onUploadCompleted: async () => {},
  });

  return res.status(200).json(result);
}

async function handleDirectUpload(req: any, res: any) {
  const ownerId = validateSession(req.headers.authorization);

  if (!ownerId) {
    return res.status(401).json({
      error: "Sua sessao expirou. Saia e entre novamente.",
    });
  }

  const contentType = String(
    req.headers["content-type"] || "application/octet-stream",
  );

  if (
    !contentType.startsWith("image/") &&
    !contentType.startsWith("video/") &&
    !contentType.startsWith("audio/")
  ) {
    return res.status(400).json({
      error: "Escolha somente uma imagem, um video ou um audio.",
    });
  }

  const originalFilename = decodeURIComponent(
    String(req.headers["x-file-name"] || "arquivo"),
  );
  const safeFilename = sanitizeFilename(originalFilename);
  const body = await readRequestBody(req, MAX_FILE_SIZE);

  if (body.length === 0) {
    return res.status(400).json({
      error: "O arquivo selecionado esta vazio.",
    });
  }

  // O SDK le BLOB_READ_WRITE_TOKEN diretamente no ambiente da Vercel.
  // O token nunca e enviado ao navegador.
  const blob = await put(
    `5is/${ownerId}/${Date.now()}-${safeFilename}`,
    body,
    {
      access: "public",
      contentType,
      addRandomSuffix: true,
    },
  );

  return res.status(201).json({
    success: true,
    url: blob.url,
    downloadUrl: blob.downloadUrl,
    pathname: blob.pathname,
    contentType,
    name: originalFilename,
    size: body.length,
  });
}

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Metodo nao permitido." });
  }

  try {
    if (isClientUploadRequest(req)) {
      return await handleClientBlobUpload(req, res);
    }

    return await handleDirectUpload(req, res);
  } catch (error: any) {
    console.error("[5I API /api/upload]", error);

    const message = String(error?.message || "Falha no upload.");
    const missingBlobToken =
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.toLowerCase().includes("blob token");

    return res.status(isClientUploadRequest(req) ? 400 : 500).json({
      error: missingBlobToken
        ? "O Blob esta conectado, mas este deployment ainda nao recebeu a credencial. Faca um novo deploy na Vercel."
        : message,
    });
  }
}
