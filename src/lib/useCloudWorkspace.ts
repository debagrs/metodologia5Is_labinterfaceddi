import { useEffect, useRef, useState } from 'react';
import {
  clearLegacyTursoSession,
  ensureTursoSession,
  isTursoConfigured,
  readAuthenticatedTursoSession,
  readLegacyTursoSession,
  readWorkspace,
  saveWorkspace,
} from './turso';
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

function hasProjectContent(snapshot: Partial<WorkspaceSnapshot> | null | undefined) {
  if (!snapshot) return false;
  if (snapshot.soloProject) return true;
  if (Array.isArray(snapshot.soloNodes) && snapshot.soloNodes.length > 0) return true;
  if (
    Array.isArray(snapshot.students) &&
    snapshot.students.some((student) => student?.project || (Array.isArray(student?.nodes) && student.nodes.length > 0))
  ) {
    return true;
  }
  return false;
}

export function useCloudWorkspace(options: Options): CloudState {
  const [state, setState] = useState<CloudState>(isTursoConfigured ? 'connecting' : 'disabled');
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isTursoConfigured || !options.localLoaded || hydrated.current) return;
    let cancelled = false;

    (async () => {
      try {
        const authenticated = readAuthenticatedTursoSession();
        const activeSession = authenticated || (await ensureTursoSession());
        if (cancelled) return;

        let accountPayload = await readWorkspace(activeSession.token);

        // Migração automática: canvas criado antes do login.
        // Só acontece quando existe uma conta autenticada e o workspace dela ainda está vazio.
        if (authenticated && !hasProjectContent(accountPayload)) {
          const legacy = readLegacyTursoSession();
          if (legacy) {
            try {
              const legacyPayload = await readWorkspace(legacy.token);
              if (hasProjectContent(legacyPayload)) {
                const migratedPayload: WorkspaceSnapshot = {
                  ...(legacyPayload as WorkspaceSnapshot),
                  activeProfile: options.activeProfile,
                };
                await saveWorkspace(authenticated.token, migratedPayload);
                accountPayload = migratedPayload;
                clearLegacyTursoSession();
              }
            } catch (migrationError) {
              console.warn('[Turso] Não foi possível migrar a sessão antiga:', migrationError);
            }
          }
        }

        // Se a nuvem da conta está vazia, preserve e envie o conteúdo local atual.
        if (!hasProjectContent(accountPayload)) {
          const localPayload: WorkspaceSnapshot = {
            activeProfile: options.activeProfile,
            classrooms: options.classrooms,
            students: options.students,
            soloProject: options.soloProject,
            soloNodes: options.soloNodes,
          };

          if (hasProjectContent(localPayload)) {
            await saveWorkspace(activeSession.token, localPayload);
            accountPayload = localPayload;
          }
        }

        if (accountPayload) {
          options.applySnapshot(accountPayload as WorkspaceSnapshot);
        }

        hydrated.current = true;
        setState('synced');
      } catch (error) {
        console.error('[Turso] Falha ao carregar:', error);
        hydrated.current = true;
        setState('error');
      }
    })();

    return () => {
      cancelled = true;
    };
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

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
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
