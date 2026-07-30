import { useEffect, useRef, useState } from 'react';
import { ensureSupabaseSession, isSupabaseConfigured, readWorkspace, saveWorkspace } from './supabase';
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
  const [state, setState] = useState<CloudState>(isSupabaseConfigured ? 'connecting' : 'disabled');
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isSupabaseConfigured || !options.localLoaded || hydrated.current) return;
    let cancelled = false;

    (async () => {
      try {
        const session = await ensureSupabaseSession();
        if (!session || cancelled) return;
        const payload = await readWorkspace(session.user.id, session.access_token);
        if (payload) options.applySnapshot(payload as WorkspaceSnapshot);
        hydrated.current = true;
        setState('synced');
      } catch (error) {
        console.error('[Supabase] Falha ao carregar:', error);
        hydrated.current = true;
        setState('error');
      }
    })();

    return () => { cancelled = true; };
  }, [options.localLoaded]);

  useEffect(() => {
    if (!isSupabaseConfigured || !hydrated.current || !options.localLoaded) return;
    if (timer.current) clearTimeout(timer.current);
    setState('local');

    timer.current = setTimeout(async () => {
      try {
        const session = await ensureSupabaseSession();
        if (!session) return;
        const payload: WorkspaceSnapshot = {
          activeProfile: options.activeProfile,
          classrooms: options.classrooms,
          students: options.students,
          soloProject: options.soloProject,
          soloNodes: options.soloNodes
        };
        await saveWorkspace(session.user.id, session.access_token, payload);
        setState('synced');
      } catch (error) {
        console.error('[Supabase] Falha ao salvar:', error);
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
    options.localLoaded
  ]);

  return state;
}
