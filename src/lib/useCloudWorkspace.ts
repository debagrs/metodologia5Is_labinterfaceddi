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

type HydrationStage = 'waiting' | 'loading' | 'settling' | 'ready';

function normalizeSnapshot(snapshot: WorkspaceSnapshot): WorkspaceSnapshot {
  return {
    activeProfile: snapshot.activeProfile ?? null,
    classrooms: Array.isArray(snapshot.classrooms) ? snapshot.classrooms : [],
    students: Array.isArray(snapshot.students) ? snapshot.students : [],
    soloProject: snapshot.soloProject ?? null,
    soloNodes: Array.isArray(snapshot.soloNodes) ? snapshot.soloNodes : [],
    projectWorkspaces: Array.isArray(snapshot.projectWorkspaces) ? snapshot.projectWorkspaces : [],
    activeProjectId: snapshot.activeProjectId ?? null,
  };
}

function serializeSnapshot(snapshot: WorkspaceSnapshot): string {
  return JSON.stringify(normalizeSnapshot(snapshot));
}

export function useCloudWorkspace(options: Options): CloudState {
  const [state, setState] = useState<CloudState>(
    isTursoConfigured ? 'connecting' : 'disabled',
  );
  const [hydrationStage, setHydrationStage] =
    useState<HydrationStage>('waiting');

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestSnapshot = useRef<WorkspaceSnapshot>({
    activeProfile: options.activeProfile,
    classrooms: options.classrooms,
    students: options.students,
    soloProject: options.soloProject,
    soloNodes: options.soloNodes,
    projectWorkspaces: options.projectWorkspaces,
    activeProjectId: options.activeProjectId,
  });
  const lastSavedSerialized = useRef<string | null>(null);
  const hydrationStarted = useRef(false);
  const saveInFlight = useRef(false);
  const pendingSave = useRef(false);

  const currentSnapshot = useMemo<WorkspaceSnapshot>(
    () => ({
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

  useEffect(() => {
    latestSnapshot.current = currentSnapshot;
  }, [currentSnapshot]);

  useEffect(() => {
    if (
      !isTursoConfigured ||
      !options.localLoaded ||
      hydrationStarted.current
    ) {
      return;
    }

    hydrationStarted.current = true;
    setHydrationStage('loading');
    setState('connecting');

    let cancelled = false;

    (async () => {
      try {
        const session = await ensureTursoSession();
        if (cancelled) return;

        const remotePayload = await readWorkspace(session.token);
        if (cancelled) return;

        if (remotePayload) {
          const normalizedRemote = normalizeSnapshot(
            remotePayload as WorkspaceSnapshot,
          );

          lastSavedSerialized.current =
            serializeSnapshot(normalizedRemote);

          options.applySnapshot(normalizedRemote);

          setHydrationStage('settling');
          window.requestAnimationFrame(() => {
            if (!cancelled) {
              setHydrationStage('ready');
              setState('synced');
            }
          });
        } else {
          lastSavedSerialized.current = null;
          setHydrationStage('ready');
          setState('synced');
        }
      } catch (error) {
        console.error('[Turso] Falha ao carregar:', error);
        if (!cancelled) {
          setHydrationStage('ready');
          setState('error');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [options.localLoaded, options.applySnapshot]);

  const persistLatest = async () => {
    if (saveInFlight.current) {
      pendingSave.current = true;
      return;
    }

    const snapshot = normalizeSnapshot(latestSnapshot.current);
    const serialized = serializeSnapshot(snapshot);

    if (serialized === lastSavedSerialized.current) {
      setState('synced');
      return;
    }

    saveInFlight.current = true;
    pendingSave.current = false;

    try {
      const session = await ensureTursoSession();
      await saveWorkspace(session.token, snapshot);
      lastSavedSerialized.current = serialized;
      setState('synced');
    } catch (error) {
      console.error('[Turso] Falha ao salvar:', error);
      setState('error');
    } finally {
      saveInFlight.current = false;

      if (pendingSave.current) {
        pendingSave.current = false;
        void persistLatest();
      }
    }
  };

  useEffect(() => {
    if (
      !isTursoConfigured ||
      !options.localLoaded ||
      hydrationStage !== 'ready'
    ) {
      return;
    }

    if (currentSerialized === lastSavedSerialized.current) {
      setState('synced');
      return;
    }

    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    setState('local');

    saveTimer.current = setTimeout(() => {
      void persistLatest();
    }, 700);

    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, [
    currentSerialized,
    hydrationStage,
    options.localLoaded,
  ]);

  useEffect(() => {
    if (!isTursoConfigured) return;

    const flush = () => {
      if (
        hydrationStage === 'ready' &&
        serializeSnapshot(latestSnapshot.current) !==
          lastSavedSerialized.current
      ) {
        void persistLatest();
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flush();
      }
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener(
      'visibilitychange',
      onVisibilityChange,
    );

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener(
        'visibilitychange',
        onVisibilityChange,
      );
    };
  }, [hydrationStage]);

  return state;
}
