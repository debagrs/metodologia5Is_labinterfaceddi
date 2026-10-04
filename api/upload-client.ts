import crypto from "node:crypto";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
export default async function handler(req: any, res: any) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST")
    return res.status(405).json({ error: "Use POST." });
  try {
    const result = await handleUpload({
      request: req,
      body: req.body as HandleUploadBody,
      onBeforeGenerateToken: async (pathname) => {
        const secret = process.env.SESSION_SECRET || "";
        const raw = String(req.headers.authorization || "");
        if (secret.length < 24 || !raw.startsWith("Bearer "))
          throw Error("Sessão inválida.");
        const token = raw.slice(7),
          separator = token.lastIndexOf(".");
        if (separator < 1) throw Error("Sessão inválida.");
        const owner = token.slice(0, separator),
          signature = Buffer.from(token.slice(separator + 1));
        const expected = Buffer.from(
          crypto.createHmac("sha256", secret).update(owner).digest("base64url"),
        );
        if (
          signature.length !== expected.length ||
          !crypto.timingSafeEqual(signature, expected)
        )
          throw Error("Sessão inválida.");
        if (
          !pathname.startsWith(`5is/${owner}/`) ||
          pathname.includes("..") ||
          pathname.length > 300
        )
          throw Error("Destino de upload inválido.");
        return {
          allowedContentTypes: ["image/*", "video/*", "audio/*"],
          maximumSizeInBytes: 100 * 1024 * 1024,
          addRandomSuffix: true,
          allowOverwrite: false,
          validUntil: Date.now() + 15 * 60 * 1000,
          tokenPayload: JSON.stringify({ ownerId: owner }),
        };
      },
      onUploadCompleted: async () => {},
    });
    return res.status(200).json(result);
  } catch (error: any) {
    return res
      .status(400)
      .json({
        error: error?.message || "Não foi possível autorizar o upload.",
      });
  }
}
