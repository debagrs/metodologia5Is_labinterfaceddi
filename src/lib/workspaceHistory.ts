import type { WorkspaceSnapshot } from "./useCloudWorkspace";
export interface WorkspaceVersion {
  id: string;
  createdAt: string;
  projects: Array<{ id: string; name: string; nodes: number }>;
  bytes?: number;
  local?: boolean;
}
const db = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("5is-workspace-history", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("versions", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
async function records(ownerId: string) {
  const database = await db();
  try {
    return await new Promise<any[]>((resolve, reject) => {
      const r = database
        .transaction("versions")
        .objectStore("versions")
        .getAll();
      r.onsuccess = () =>
        resolve(
          r.result
            .filter((x) => x.ownerId === ownerId)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      r.onerror = () => reject(r.error);
    });
  } finally {
    database.close();
  }
}
let localQueue = Promise.resolve();
export function recordLocalVersion(
  ownerId: string,
  snapshot: WorkspaceSnapshot,
) {
  const task = localQueue.then(() => writeLocalVersion(ownerId, snapshot));
  localQueue = task.catch(() => {});
  return task;
}
async function writeLocalVersion(ownerId: string, snapshot: WorkspaceSnapshot) {
  const all = await records(ownerId);
  const data = JSON.stringify(snapshot);
  const dataBytes = new TextEncoder().encode(data).length;
  if (dataBytes > 20 * 1024 * 1024)
    throw Error("O backup local excedeu 20 MB.");
  if (all[0]?.serialized === data) return;
  const projects = snapshot.projectWorkspaces.map((w) => ({
    id: w.project.id,
    name: w.project.name,
    nodes: w.nodes.length,
  }));
  if (
    snapshot.soloProject &&
    !projects.some((p) => p.id === snapshot.soloProject!.id)
  )
    projects.push({
      id: snapshot.soloProject.id,
      name: snapshot.soloProject.name,
      nodes: snapshot.soloNodes.length,
    });
  const database = await db();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction("versions", "readwrite");
      const store = transaction.objectStore("versions");
      store.put({
        id: `local-${crypto.randomUUID()}`,
        ownerId,
        createdAt: new Date().toISOString(),
        projects,
        serialized: data,
        local: true,
      });
      let bytes = dataBytes;
      for (const [index, item] of all.entries()) {
        bytes += new TextEncoder().encode(item.serialized).length;
        if (index >= 49 || bytes > 20 * 1024 * 1024) store.delete(item.id);
      }
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}
export async function localVersions(
  ownerId: string,
): Promise<WorkspaceVersion[]> {
  return (await records(ownerId)).map(
    ({ serialized, ownerId, ...meta }) => meta,
  );
}
export async function localVersion(
  ownerId: string,
  id: string,
): Promise<WorkspaceSnapshot> {
  const item = (await records(ownerId)).find((x) => x.id === id);
  if (!item) throw Error("Versão local não encontrada.");
  return JSON.parse(item.serialized);
}
export function restoreProject(
  current: WorkspaceSnapshot,
  past: WorkspaceSnapshot,
  projectId: string,
): WorkspaceSnapshot {
  const workspace =
    past.projectWorkspaces?.find((w) => w.project.id === projectId) ||
    (past.soloProject?.id === projectId
      ? {
          project: past.soloProject,
          nodes: past.soloNodes || [],
          updatedAt: new Date().toISOString(),
        }
      : null);
  if (!workspace) throw Error("Esse projeto não está presente na versão.");
  const restored = { ...workspace, updatedAt: new Date().toISOString() };
  const list = current.projectWorkspaces.some((w) => w.project.id === projectId)
    ? current.projectWorkspaces.map((w) =>
        w.project.id === projectId ? restored : w,
      )
    : [...current.projectWorkspaces, restored];
  return {
    ...current,
    projectWorkspaces: list,
    soloProject:
      current.soloProject?.id === projectId
        ? restored.project
        : current.soloProject,
    soloNodes:
      current.soloProject?.id === projectId
        ? restored.nodes
        : current.soloNodes,
    activeProjectId: null,
  };
}
