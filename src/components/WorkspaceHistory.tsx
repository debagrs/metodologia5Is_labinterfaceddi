import { useEffect, useState, useRef } from "react";
import { History, Loader2, RotateCcw, X, Download } from "lucide-react";
import { ensureTursoSession } from "../lib/turso";
import {
  localVersions,
  localVersion,
  restoreProject,
  recordLocalVersion,
  type WorkspaceVersion,
} from "../lib/workspaceHistory";
import type { WorkspaceSnapshot } from "../lib/useCloudWorkspace";
export default function WorkspaceHistory() {
  const [current, setCurrent] = useState<WorkspaceSnapshot | null>(null),
    [open, setOpen] = useState(false),
    [versions, setVersions] = useState<WorkspaceVersion[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const receive = (e: Event) => setCurrent((e as CustomEvent).detail);
    window.addEventListener("5is-history-state", receive);
    window.dispatchEvent(new Event("5is-history-request"));
    return () => window.removeEventListener("5is-history-state", receive);
  }, []);
  const owner = current?.activeProfile?.id;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  useEffect(() => {
    setOpen(false);
    setVersions([]);
    setError("");
    setNotice("");
    setBusy(false);
  }, [owner]);
  const load = async () => {
    if (!owner) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const local = await localVersions(owner).catch(() => []);
      if (ownerRef.current !== owner) return;
      setVersions(local);
      try {
        const session = await ensureTursoSession();
        const response = await fetch(
          `/api/workspace?history=1&ownerId=${encodeURIComponent(owner)}`,
          { headers: { Authorization: `Bearer ${session.token}` } },
        );
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        if (ownerRef.current !== owner) return;
        setVersions(
          [...data.versions, ...local].sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          ),
        );
      } catch (e: any) {
        if (ownerRef.current !== owner) return;
        setNotice(
          `Histórico deste dispositivo disponível. Nuvem: ${e.message}`,
        );
      }
    } finally {
      if (ownerRef.current === owner) setBusy(false);
    }
  };
  const restore = async (v: WorkspaceVersion, projectId: string) => {
    if (!current || !owner) return;
    setBusy(true);
    setError("");
    try {
      let past: WorkspaceSnapshot;
      if (v.local) past = await localVersion(owner, v.id);
      else {
        const session = await ensureTursoSession();
        const r = await fetch(
          `/api/workspace?ownerId=${encodeURIComponent(owner)}&version=${encodeURIComponent(v.id)}`,
          { headers: { Authorization: `Bearer ${session.token}` } },
        );
        const d = await r.json();
        if (!r.ok) throw Error(d.error);
        past = d.payload;
      }
      if (ownerRef.current !== owner) return;
      await recordLocalVersion(owner, current);
      const next = restoreProject(current, past, projectId);
      window.dispatchEvent(
        new CustomEvent("5is-history-restore", {
          detail: { ownerId: owner, snapshot: next },
        }),
      );
      setNotice(
        "Projeto restaurado. A edição anterior foi guardada no histórico local.",
      );
    } catch (e: any) {
      if (ownerRef.current === owner) setError(e.message);
    } finally {
      if (ownerRef.current === owner) setBusy(false);
    }
  };
  if (!owner) return null;
  return (
    <>
      <button
        type="button"
        className="workspace-history-launch"
        title="Histórico e versões"
        aria-label="Histórico e versões"
        onClick={() => {
          setOpen(true);
          void load();
        }}
      >
        <History size={18} />
        <span>Versões</span>
      </button>
      {open && (
        <div
          className="workspace-history-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Histórico e versões"
        >
          <header>
            <div>
              <strong>Histórico e versões</strong>
              <p>
                Recupere um projeto inteiro, incluindo itens excluídos. Cada
                restauração preserva os demais projetos.
              </p>
            </div>
            <button
              aria-label="Fechar histórico"
              onClick={() => setOpen(false)}
            >
              <X />
            </button>
          </header>
          <div className="workspace-history-body">
            <button disabled={busy} onClick={() => void load()}>
              Atualizar histórico
            </button>
            <button
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob([JSON.stringify(current, null, 2)], {
                    type: "application/json",
                  }),
                );
                const a = document.createElement("a");
                a.href = url;
                a.download = "5is-backup.json";
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
              }}
            >
              <Download size={16} /> Baixar backup atual
            </button>
            {busy && (
              <p>
                <Loader2 className="animate-spin" /> Carregando…
              </p>
            )}
            {error && (
              <p role="alert" className="text-red-700">
                {error}
              </p>
            )}
            {notice && <p role="status">{notice}</p>}
            {!busy && !versions.length && (
              <p>
                As versões começam a ser guardadas após suas próximas
                alterações.
              </p>
            )}
            {versions.map((v) => (
              <article key={v.id}>
                <div>
                  <strong>
                    {new Date(v.createdAt).toLocaleString("pt-BR")}
                  </strong>
                  <small>{v.local ? "Neste dispositivo" : "Na nuvem"}</small>
                </div>
                {v.projects.map((p) => (
                  <div key={p.id} className="workspace-history-project">
                    <span>
                      {p.name}
                      <small>{p.nodes} itens</small>
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => void restore(v, p.id)}
                    >
                      <RotateCcw size={16} /> Restaurar
                    </button>
                  </div>
                ))}
              </article>
            ))}
            <p>
              Até 50 versões na nuvem e 50 neste dispositivo, com limite de 20
              MB em cada histórico. Mídias continuam fora do banco; mantenha os
              arquivos para versões antigas.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
