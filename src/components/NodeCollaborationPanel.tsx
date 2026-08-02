import React, { useRef, useState } from "react";
import {
  ExternalLink,
  Image,
  Loader2,
  Send,
  Trash2,
  Video,
  X,
} from "lucide-react";
import type {
  NodeAttachment,
  NodeComment,
  ThoughtNode,
  UserProfile,
} from "../types";
import { readStoredTursoSession } from "../lib/turso";

interface Props {
  node: ThoughtNode;
  user: UserProfile;
  onClose: () => void;
  onChange: (node: ThoughtNode) => void;
}

async function readApiResponse(response: Response) {
  const rawText = await response.text();

  if (!rawText) {
    return {};
  }

  try {
    return JSON.parse(rawText);
  } catch {
    return {
      error: rawText,
    };
  }
}

export default function NodeCollaborationPanel({
  node,
  user,
  onClose,
  onChange,
}: Props) {
  const [text, setText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const comments = node.comments || [];
  const attachments = node.attachments || [];

  function addComment() {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    const comment: NodeComment = {
      id: `comment-${Date.now()}`,
      authorId: user.id,
      authorName: user.name,
      authorRole: user.role,
      text: cleanText,
      createdAt: new Date().toISOString(),
    };

    onChange({
      ...node,
      comments: [...comments, comment],
    });
    setText("");
  }

  function removeComment(id: string) {
    onChange({
      ...node,
      comments: comments.filter((comment) => comment.id !== id),
    });
  }

  async function upload(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      setError("Escolha um arquivo de até 4 MB.");
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError("Escolha somente uma imagem ou um vídeo.");
      return;
    }

    setUploading(true);
    setError("");

    try {
      const session = readStoredTursoSession();

      if (!session?.token) {
        throw new Error("Sua sessão expirou. Saia e entre novamente.");
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });

      const data = await readApiResponse(response);

      if (!response.ok || !data.url) {
        throw new Error(
          data.error || `O upload falhou na Vercel (HTTP ${response.status}).`,
        );
      }

      const attachment: NodeAttachment = {
        id: `attachment-${Date.now()}`,
        url: data.url,
        name: data.name || file.name,
        type: file.type.startsWith("video/") ? "video" : "image",
        contentType: data.contentType || file.type,
        authorId: user.id,
        authorName: user.name,
        createdAt: new Date().toISOString(),
      };

      onChange({
        ...node,
        attachments: [...attachments, attachment],
      });
    } catch (uploadError: any) {
      setError(uploadError?.message || "Não foi possível enviar o arquivo.");
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  }

  function removeAttachment(id: string) {
    onChange({
      ...node,
      attachments: attachments.filter((attachment) => attachment.id !== id),
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/30"
      onClick={onClose}
    >
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between border-b p-5">
          <div>
            <span className="font-mono text-[10px] uppercase text-neutral-400">
              Colaboração no card
            </span>
            <h2 className="mt-1 text-lg font-bold">
              {node.title || "Bloco de notas"}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-2 hover:bg-black/5"
            aria-label="Fechar painel"
          >
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 space-y-7 overflow-y-auto p-5">
          <section>
            <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider">
              Imagens e vídeos
            </h3>

            <input
              ref={fileRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void upload(file);
                }
              }}
            />

            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-4 text-xs font-bold disabled:cursor-wait disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="animate-spin" size={16} />
              ) : (
                <>
                  <Image size={16} />
                  <Video size={16} />
                </>
              )}
              {uploading ? "Enviando..." : "Adicionar imagem ou vídeo"}
            </button>

            <p className="mt-2 text-[10px] leading-relaxed text-neutral-400">
              Imagens e vídeos de até 4 MB. O arquivo será armazenado no Vercel
              Blob.
            </p>

            {error && (
              <p
                role="alert"
                className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-relaxed text-red-700"
              >
                {error}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-3">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="overflow-hidden rounded-xl border bg-[#F7F7F5]"
                >
                  {attachment.type === "image" ? (
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="h-28 w-full object-cover"
                    />
                  ) : (
                    <video
                      src={attachment.url}
                      controls
                      className="h-28 w-full object-cover"
                    />
                  )}

                  <div className="flex items-center justify-between gap-2 p-2">
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 items-center gap-1 truncate text-[10px]"
                    >
                      <ExternalLink size={10} />
                      <span className="truncate">{attachment.name}</span>
                    </a>

                    {attachment.authorId === user.id && (
                      <button
                        type="button"
                        onClick={() => removeAttachment(attachment.id)}
                        className="cursor-pointer text-red-500"
                        aria-label="Remover anexo"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="mb-3 font-mono text-xs font-bold uppercase tracking-wider">
              Comentários ({comments.length})
            </h3>

            <div className="space-y-3">
              {comments.map((comment) => (
                <article
                  key={comment.id}
                  className="rounded-2xl bg-[#F7F7F5] p-3"
                >
                  <div className="flex justify-between gap-2">
                    <div>
                      <strong className="text-xs">{comment.authorName}</strong>
                      <span className="ml-2 font-mono text-[9px] uppercase text-neutral-400">
                        {comment.authorRole === "advisor"
                          ? "Professora"
                          : comment.authorRole}
                      </span>
                    </div>

                    {comment.authorId === user.id && (
                      <button
                        type="button"
                        onClick={() => removeComment(comment.id)}
                        className="cursor-pointer text-red-500"
                        aria-label="Excluir comentário"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="mt-2 whitespace-pre-wrap text-sm">
                    {comment.text}
                  </p>

                  <time className="mt-2 block text-[9px] text-neutral-400">
                    {new Date(comment.createdAt).toLocaleString("pt-BR")}
                  </time>
                </article>
              ))}

              {comments.length === 0 && (
                <p className="text-xs text-neutral-400">
                  Ainda não há comentários neste card.
                </p>
              )}
            </div>
          </section>
        </div>

        <footer className="border-t p-4">
          <div className="flex gap-2">
            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={2}
              placeholder="Escreva uma orientação ou comentário..."
              className="flex-1 resize-none rounded-xl border p-3 text-sm outline-none focus:border-black"
            />

            <button
              type="button"
              onClick={addComment}
              disabled={!text.trim()}
              className="flex w-12 cursor-pointer items-center justify-center rounded-xl bg-black text-white disabled:opacity-30"
              aria-label="Enviar comentário"
            >
              <Send size={17} />
            </button>
          </div>
        </footer>
      </aside>
    </div>
  );
}
