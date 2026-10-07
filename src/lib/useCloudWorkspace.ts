import {recordLocalVersion} from './workspaceHistory';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureTursoSession,
  isTursoConfigured,
  readWorkspace,
  saveWorkspace,
} from './turso';
import type {
  Classroom,
  Project,
  ProjectWorkspace,
  StudentProfile,
  ThoughtNode,
  UserProfile,
} from '../types';

export interface WorkspaceSnapshot {
  activeProfile: UserProfile | null;
  classrooms: Classroom[];
  students: StudentProfile[];
  soloProject: Project | null;
  soloNodes: ThoughtNode[];
  projectWorkspaces: ProjectWorkspace[];
  activeProjectId: string | null;
}

interface Options extends WorkspaceSnapshot {
  localLoaded: boolean;
  applySnapshot: (snapshot: WorkspaceSnapshot) => void;
}

export type CloudState =
  | 'disabled'
  | 'connecting'
  | 'synced'
  | 'local'
  | 'error';

function normalizeSnapshot(
  snapshot: Partial<WorkspaceSnapshot> | null | undefined,
): WorkspaceSnapshot {
  return {
    activeProfile: snapshot?.activeProfile ?? null,
    classrooms: Array.isArray(snapshot?.classrooms)
      ? snapshot!.classrooms!
      : [],
    students: Array.isArray(snapshot?.students)
      ? snapshot!.students!
      : [],
    soloProject: snapshot?.soloProject ?? null,
    soloNodes: Array.isArray(snapshot?.soloNodes)
      ? snapshot!.soloNodes!
      : [],
    projectWorkspaces: Array.isArray(snapshot?.projectWorkspaces)
      ? snapshot!.projectWorkspaces!
      : [],
    activeProjectId: snapshot?.activeProjectId ?? null,
  };
}

function serializeSnapshot(snapshot: Partial<WorkspaceSnapshot>) {
  return JSON.stringify(normalizeSnapshot(snapshot));
}

export function useCloudWorkspace(options: Options): CloudState {
  const [state, setState] = useState<CloudState>(
    isTursoConfigured ? 'connecting' : 'disabled',
  );
  const [hydratedOwnerId, setHydratedOwnerId] = useState<string | null>(null);

  const applySnapshotRef = useRef(options.applySnapshot);
  const latestSnapshotRef = useRef<WorkspaceSnapshot>(
    normalizeSnapshot(options),
  );
  const lastSavedSerializedRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestGenerationRef = useRef(0);
  const saveInFlightRef = useRef(false);
  const saveAgainRef = useRef(false);

  const previousHistoryRef=useRef<WorkspaceSnapshot|null>(null);
  const historyAtRef=useRef(0);
  const accountId = options.activeProfile?.id || null;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('5is:cloud-state', { detail: { state, ownerId: accountId } }));
  }, [state, accountId]);

  const currentSnapshot = useMemo(
    () =>
      normalizeSnapshot({
        activeProfile: options.activeProfile,
        classrooms: options.classrooms,
        students: options.students,
        soloProject: options.soloProject,
        soloNodes: options.soloNodes,
        projectWorkspaces: options.projectWorkspaces,
        activeProjectId: options.activeProjectId,
      }),
    [
      options.activeProfile,
      options.classrooms,
      options.students,
      options.soloProject,
      options.soloNodes,
      options.projectWorkspaces,
      options.activeProjectId,
    ],
  );

  const currentSerialized = useMemo(
    () => serializeSnapshot(currentSnapshot),
    [currentSnapshot],
  );

  useEffect(()=>{const publish=()=>window.dispatchEvent(new CustomEvent('5is-history-state',{detail:currentSnapshot}));publish();const restore=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.ownerId===accountId && detail.snapshot){applySnapshotRef.current({...normalizeSnapshot(detail.snapshot),activeProfile:currentSnapshot.activeProfile,classrooms:currentSnapshot.classrooms,students:currentSnapshot.students});previousHistoryRef.current=null;}};window.addEventListener('5is-history-request',publish);window.addEventListener('5is-history-restore',restore);return()=>{window.removeEventListener('5is-history-request',publish);window.removeEventListener('5is-history-restore',restore)}},[currentSnapshot,accountId]);
  useEffect(()=>{
    if(!accountId || (isTursoConfigured && hydratedOwnerId!==accountId))return;
    const previous=previousHistoryRef.current;
    const ids=(s:WorkspaceSnapshot)=>new Set([...s.projectWorkspaces.flatMap(w=>[w.project.id,...w.nodes.map(n=>n.id)]),s.soloProject?.id,...s.soloNodes.map(n=>n.id)].filter(Boolean));
    if(previous?.activeProfile?.id===accountId && JSON.stringify(previous)!==currentSerialized){const oldIds=ids(previous),newIds=ids(currentSnapshot);const removed=[...oldIds].some(id=>!newIds.has(id));if(removed||Date.now()-historyAtRef.current>30000){historyAtRef.current=Date.now();void recordLocalVersion(accountId,previous).catch(e=>console.error('[Histórico local]',e));}}
    previousHistoryRef.current=currentSnapshot;
  },[accountId,hydratedOwnerId,currentSerialized]);

  useEffect(() => {
    applySnapshotRef.current = options.applySnapshot;
  }, [options.applySnapshot]);

  useEffect(() => {
    latestSnapshotRef.current = currentSnapshot;
  }, [currentSnapshot]);

  /*
   * Recarrega sempre que a conta autenticada muda.
   * Antes, a hidratação acontecia uma única vez por aba; assim uma conta
   * nova herdava o estado da conta anterior e parecia não ter projetos.
   */
  useEffect(() => {
    if (!isTursoConfigured || !options.localLoaded || !accountId) {
      if (!accountId && options.localLoaded) {
        setHydratedOwnerId(null);
        setState('synced');
      }
      return;
    }

    const generation = ++requestGenerationRef.current;
    setHydratedOwnerId(null);
    setState('connecting');
    lastSavedSerializedRef.current = null;

    (async () => {
      try {
        const session = await ensureTursoSession();
        if (generation !== requestGenerationRef.current) return;

        const remotePayload = await readWorkspace(session.token);
        if (generation !== requestGenerationRef.current) return;

        const normalizedRemote = normalizeSnapshot(
          remotePayload as Partial<WorkspaceSnapshot> | null,
        );

        /*
         * Compatibilidade com o formato antigo de apenas um projeto.
         */
        if (
          normalizedRemote.projectWorkspaces.length === 0 &&
          normalizedRemote.soloProject
        ) {
          normalizedRemote.projectWorkspaces = [
            {
              project: normalizedRemote.soloProject,
              nodes: normalizedRemote.soloNodes,
              updatedAt:
                normalizedRemote.soloProject.createdAt ||
                new Date().toISOString(),
            },
          ];
        }

        /*
         * Sempre entra pelo dashboard. activeProjectId é navegação local,
         * não precisa reabrir automaticamente o último canvas.
         */
        normalizedRemote.activeProjectId = null;

        lastSavedSerializedRef.current =
          serializeSnapshot(normalizedRemote);
        applySnapshotRef.current(normalizedRemote);
        setHydratedOwnerId(accountId);
        setState('synced');
      } catch (error) {
        console.error('[Turso] Falha ao carregar workspace:', error);
        if (generation === requestGenerationRef.current) {
          setHydratedOwnerId(accountId);
          setState('error');
        }
      }
    })();

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [accountId, options.localLoaded]);

  const persistLatest = async () => {
    if (!accountId || hydratedOwnerId !== accountId) return;

    if (saveInFlightRef.current) {
      saveAgainRef.current = true;
      return;
    }

    const snapshot = normalizeSnapshot(latestSnapshotRef.current);
    const serialized = serializeSnapshot(snapshot);

    if (serialized === lastSavedSerializedRef.current) {
      setState('synced');
      return;
    }

    saveInFlightRef.current = true;
    saveAgainRef.current = false;

    try {
      const session = await ensureTursoSession();
      await saveWorkspace(session.token, snapshot);
      lastSavedSerializedRef.current = serialized;
      setState('synced');
    } catch (error) {
      console.error('[Turso] Falha ao salvar workspace:', error);
      setState('error');
    } finally {
      saveInFlightRef.current = false;
      if (saveAgainRef.current) {
        saveAgainRef.current = false;
        void persistLatest();
      }
    }
  };

  /*
   * Salva apenas depois que o workspace da MESMA conta terminou de carregar.
   */
  useEffect(() => {
    if (
      !isTursoConfigured ||
      !accountId ||
      hydratedOwnerId !== accountId
    ) {
      return;
    }

    if (currentSerialized === lastSavedSerializedRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    setState('local');
    saveTimerRef.current = setTimeout(() => {
      void persistLatest();
    }, 500);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [accountId, hydratedOwnerId, currentSerialized]);

  useEffect(() => {
    const flush = () => {
      if (
        accountId &&
        hydratedOwnerId === accountId &&
        serializeSnapshot(latestSnapshotRef.current) !==
          lastSavedSerializedRef.current
      ) {
        void persistLatest();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      );
    };
  }, [accountId, hydratedOwnerId]);

  return state;
}
