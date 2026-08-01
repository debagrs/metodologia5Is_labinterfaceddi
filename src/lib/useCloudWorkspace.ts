import { useEffect, useRef, useState } from 'react';
import { ensureTursoSession, isTursoConfigured, readWorkspace, saveWorkspace } from './turso';
import type { Classroom, Project, StudentProfile, ThoughtNode, UserProfile } from '../types';

export interface WorkspaceSnapshot {
  activeProfile: UserProfile | null;
  classrooms: Classroom[];
  students: StudentProfile[];
  soloProject: Project | null;
  soloNodes: ThoughtNode[];
}

interface Options extends WorkspaceSnapshot {
  localLoaded: boolean;
  applySnapshot: (snapshot: WorkspaceSnapshot) => void;
}

export type CloudState = 'disabled' | 'connecting' | 'synced' | 'local' | 'error';

export function useCloudWorkspace(options: Options): CloudState {
  const [state, setState] = useState<CloudState>(isTursoConfigured ? 'connecting' : 'disabled');
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isTursoConfigured || !options.localLoaded || hydrated.current) return;
    let cancelled = false;

    (async () => {
      try {
        const session = await ensureTursoSession();
        if (cancelled) return;
        const payload = await readWorkspace(session.token);
        if (payload) options.applySnapshot(payload as WorkspaceSnapshot);
        hydrated.current = true;
        setState('synced');
      } catch (error) {
        console.error('[Turso] Falha ao carregar:', error);
        hydrated.current = true;
        setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [options.localLoaded]);

  useEffect(() => {
    if (!isTursoConfigured || !hydrated.current || !options.localLoaded) return;
    if (timer.current) clearTimeout(timer.current);
    setState('local');

    timer.current = setTimeout(async () => {
      try {
        const session = await ensureTursoSession();
        const payload: WorkspaceSnapshot = {
          activeProfile: options.activeProfile,
          classrooms: options.classrooms,
          students: options.students,
          soloProject: options.soloProject,
          soloNodes: options.soloNodes,
        };
        await saveWorkspace(session.token, payload);
        setState('synced');
      } catch (error) {
        console.error('[Turso] Falha ao salvar:', error);
        setState('error');
      }
    }, 900);

    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [
    options.activeProfile,
    options.classrooms,
    options.students,
    options.soloProject,
    options.soloNodes,
    options.localLoaded,
  ]);

  return state;
}
