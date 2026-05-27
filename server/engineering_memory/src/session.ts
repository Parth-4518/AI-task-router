/** Session management for Engineering Memory */

import { Session, Todo } from './types';
import { saveSession, getActiveSession, listSessions } from './storage';
import { getCurrentBranch, getGitStatus, getFilesTouched, getCommitCountSince } from './git';
import { nanoid } from './util';

export function startSession(projectPath: string): Session {
  const existing = getActiveSession(projectPath);
  if (existing) {
    console.log(`Session already active (started ${existing.startedAt}). End it first with: emm session end`);
    return existing;
  }

  const branch = getCurrentBranch(projectPath);
  const session: Session = {
    id: nanoid(),
    projectPath,
    branch,
    startedAt: new Date().toISOString(),
    todosCreated: [],
    todosCompleted: [],
    filesTouched: [],
    commitCount: 0,
  };

  saveSession(session);
  console.log(`Session started on branch "${branch}"`);
  return session;
}

export function endSession(projectPath: string): Session | null {
  const session = getActiveSession(projectPath);
  if (!session) {
    console.log('No active session found.');
    return null;
  }

  session.endedAt = new Date().toISOString();
  session.filesTouched = getFilesTouched(projectPath);
  session.commitCount = getCommitCountSince(projectPath, session.startedAt);

  const durationMs = new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime();
  const durationMin = Math.round(durationMs / 60000);

  session.summary = `Worked on ${session.branch} for ${durationMin}min, ${session.commitCount} commits, ${session.filesTouched.length} files touched.`;

  saveSession(session);
  console.log(`Session ended. ${session.summary}`);
  return session;
}

export function sessionStatus(projectPath: string): void {
  const session = getActiveSession(projectPath);
  if (!session) {
    const sessions = listSessions(projectPath);
    if (sessions.length === 0) {
      console.log('No sessions recorded for this project.');
      return;
    }
    const last = sessions[0];
    console.log(`No active session. Last session: ${last.startedAt} on ${last.branch}`);
    if (last.summary) console.log(`  ${last.summary}`);
    return;
  }

  const durationMs = Date.now() - new Date(session.startedAt).getTime();
  const durationMin = Math.round(durationMs / 60000);

  console.log(`Active session: ${session.id}`);
  console.log(`  Branch: ${session.branch}`);
  console.log(`  Started: ${session.startedAt}`);
  console.log(`  Duration: ${durationMin} minutes`);
  console.log(`  Todos created: ${session.todosCreated.length}`);
  console.log(`  Todos completed: ${session.todosCompleted.length}`);
}
