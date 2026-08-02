// @ts-nocheck
import crypto from "node:crypto";
import { put } from "@vercel/blob";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_FILE_SIZE = 4 * 1024 * 1024;

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

async function readRequestBody(req: any) {
  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalSize += buffer.length;

    if (totalSize > MAX_FILE_SIZE) {
      throw new Error("O arquivo ultrapassa o limite de 4 MB.");
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

export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Método não permitido.",
    });
  }

  try {
    const ownerId = validateSession(req.headers.authorization);

    if (!ownerId) {
      return res.status(401).json({
        error: "Sua sessão expirou. Saia e entre novamente.",
      });
    }

    const contentType = String(
      req.headers["content-type"] || "application/octet-stream",
    );

    if (
      !contentType.startsWith("image/") &&
      !contentType.startsWith("video/")
    ) {
      return res.status(400).json({
        error: "Escolha somente uma imagem ou um vídeo.",
      });
    }

    const originalFilename = decodeURIComponent(
      String(req.headers["x-file-name"] || "arquivo"),
    );
    const safeFilename = sanitizeFilename(originalFilename);
    const body = await readRequestBody(req);

    if (body.length === 0) {
      return res.status(400).json({
        error: "O arquivo selecionado está vazio.",
      });
    }

    // O SDK lê BLOB_READ_WRITE_TOKEN diretamente no ambiente da Vercel.
    // O token nunca é enviado ao navegador.
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
  } catch (error: any) {
    console.error("[5I API /api/upload]", error);

    const message = String(error?.message || "Falha no upload.");
    const missingBlobToken =
      message.includes("BLOB_READ_WRITE_TOKEN") ||
      message.toLowerCase().includes("token");

    return res.status(500).json({
      error: missingBlobToken
        ? "O Blob está conectado, mas este deployment ainda não recebeu a credencial. Faça um novo deploy na Vercel."
        : message,
    });
  }
}
