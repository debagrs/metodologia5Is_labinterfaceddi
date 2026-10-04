import React, { useEffect, useMemo, useRef, useState } from "react";
import { Download, Save, X, Loader2 } from "lucide-react";
const ORIGIN = "https://www.photopea.com";
export default function PhotopeaEditor({
  url,
  name = "imagem",
  onSave,
  onClose,
}: {
  url?: string;
  name?: string;
  onSave: (file: File) => Promise<void>;
  onClose: () => void;
}) {
  const frame = useRef<HTMLIFrameElement>(null),
    phase = useRef<"boot" | "opening" | "ready">("boot"),
    operation = useRef<"png" | "psd" | null>(null),
    lastProps = useRef({ onSave, name });
  lastProps.current = { onSave, name };
  const [ready, setReady] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [status, setStatus] = useState("Carregando editor…");
  const src = useMemo(
    () =>
      ORIGIN +
      "/#" +
      encodeURIComponent(
        JSON.stringify({
          environment: {
            theme: 2,
            customIO: { save: 'app.activeDocument.saveToOE("png");' },
          },
        }),
      ),
    [],
  );
  const send = (value: string | ArrayBuffer) =>
    frame.current?.contentWindow?.postMessage(value, ORIGIN);
  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      if (phase.current !== "ready")
        setError(
          "O editor ainda não carregou. Verifique sua conexão ou abra o Photopea em outra aba.",
        );
    }, 45000);
    const handle = async (event: MessageEvent) => {
      if (
        event.origin !== ORIGIN ||
        event.source !== frame.current?.contentWindow
      )
        return;
      if (event.data === "done") {
        if (phase.current === "boot") {
          phase.current = "opening";
          setStatus(url ? "Abrindo imagem…" : "Criando documento…");
          try {
            if (url) {
              const response = await fetch(url, { signal: controller.signal });
              if (!response.ok)
                throw new Error("A imagem não pôde ser aberta.");
              const buffer = await response.arrayBuffer();
              if (disposed) return;
              send(buffer);
            } else send('app.documents.add(1200,800,72,"Novo projeto");');
          } catch (error: any) {
            if (!disposed) {
              setError(
                "A fonte não permitiu abrir esta imagem. Use Arquivo → Abrir dentro do editor ou envie o arquivo original.",
              );
              phase.current = "ready";
              setReady(true);
              setStatus("Editor pronto.");
            }
          }
        } else {
          phase.current = "ready";
          setReady(true);
          setStatus(
            "Editor pronto. Use camadas, seleção, máscaras, pincéis, texto e filtros.",
          );
          clearTimeout(timeout);
        }
      } else if (event.data instanceof ArrayBuffer) {
        const format = operation.current || "png";
        operation.current = null;
        if (format === "psd") {
          const objectUrl = URL.createObjectURL(
            new Blob([event.data], { type: "image/vnd.adobe.photoshop" }),
          );
          const a = document.createElement("a");
          a.href = objectUrl;
          a.download = lastProps.current.name.replace(/\.[^.]+$/, "") + ".psd";
          a.click();
          setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
          setBusy(false);
          return;
        }
        setBusy(true);
        setStatus("Salvando imagem no projeto…");
        try {
          await lastProps.current.onSave(
            new File(
              [event.data],
              lastProps.current.name.replace(/\.[^.]+$/, "") + "-editada.png",
              { type: "image/png" },
            ),
          );
          if (!disposed) setStatus("Imagem editada salva no projeto.");
        } catch (error: any) {
          if (!disposed)
            setError(error.message || "Não foi possível salvar a edição.");
        } finally {
          if (!disposed) setBusy(false);
        }
      }
    };
    window.addEventListener("message", handle);
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timeout);
      window.removeEventListener("message", handle);
    };
  }, [url]);
  const exportFile = (format: "png" | "psd") => {
    if (!ready || busy) return;
    operation.current = format;
    setBusy(true);
    setError("");
    send(
      `if(app.documents.length){app.activeDocument.saveToOE("${format}");}else{app.echoToOE("no-document");}`,
    );
  };
  useEffect(() => {
    const handle = (event: MessageEvent) => {
      if (
        event.origin === ORIGIN &&
        event.source === frame.current?.contentWindow &&
        event.data === "no-document"
      ) {
        setBusy(false);
        operation.current = null;
        setError("Crie ou abra um documento no editor antes de salvar.");
      }
    };
    window.addEventListener("message", handle);
    return () => window.removeEventListener("message", handle);
  }, []);
  return (
    <section
      role="dialog"
      aria-modal="true"
      aria-label="Editor de imagem Photopea"
      className="photopea-dialog"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header>
        <button
          type="button"
          aria-label="Fechar editor de imagem"
          onClick={onClose}
        >
          <X />
        </button>
        <div>
          <b>Editor de imagem · Photopea</b>
          <span>{name}</span>
        </div>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => exportFile("psd")}
        >
          <Download />
          <span>PSD</span>
        </button>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={() => exportFile("png")}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Save />}
          <span>Salvar no projeto</span>
        </button>
      </header>
      <div className="photopea-status" role="status">
        {status}
        <a href="https://www.photopea.com/" target="_blank" rel="noreferrer">
          Abrir em outra aba ↗
        </a>
      </div>
      {error && (
        <p role="alert" className="open-image-error">
          {error}
        </p>
      )}
      <iframe
        ref={frame}
        title="Photopea: camadas, máscaras, seleção e filtros"
        src={src}
        allow="clipboard-read; clipboard-write"
      />
    </section>
  );
}

