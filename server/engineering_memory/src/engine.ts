import { MemoryDatabase, Session, Todo, Activity, Snapshot } from './database';
import { getGitStatus, getRecentCommits, getFilesTouched, getCommitCountSince } from './git';
import * as crypto from 'crypto';
import * as path from 'path';

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

export interface UnfinishedWork {
  hasUnfinishedWork: boolean;
  openSessions: Session[];
  activeTodos: Todo[];
  uncommittedFiles: string[];
  unpushedCommits: number;
  suggestions: string[];
}

export class EngineeringMemory {
  private db: MemoryDatabase;
  private projectPath: string;

  constructor(projectPath: string) {
    this.projectPath = path.resolve(projectPath);
    this.db = new MemoryDatabase(this.projectPath);
  }

  init() {
    return { initialized: true, path: path.join(this.projectPath, '.emm') };
  }

  startSession(): Session {
    const active = this.db.getActiveSession(this.projectPath);
    if (active) {
      throw new Error(`Session already active: ${active.id} (started ${active.startedAt})`);
    }

    const git = getGitStatus(this.projectPath);
    const session: Session = {
      id: generateId(),
      startedAt: now(),
      endedAt: null,
      projectPath: this.projectPath,
      gitBranch: git.branch,
      commitHash: git.commitHash,
    };

    this.db.createSession(session);

    if (git.isRepo) {
      this.db.addActivity({
        id: generateId(),
        sessionId: session.id,
        type: 'git_op',
        description: `Started on branch: ${git.branch}`,
        timestamp: now(),
      });
    }

    return session;
  }

  endSession(): Session | null {
    const active = this.db.getActiveSession(this.projectPath);
    if (!active) {
      return null;
    }

    const endedAt = now();
    const git = getGitStatus(this.projectPath);

    const activeTodos = this.db.getActiveTodos(active.id);
    const snapshot: Snapshot = {
      id: generateId(),
      sessionId: active.id,
      gitBranch: git.branch,
      uncommittedFiles: JSON.stringify(git.uncommittedFiles),
      todoSummary: activeTodos.map(t => `[${t.status}] ${t.content}`).join('\n'),
      timestamp: endedAt,
    };
    this.db.createSnapshot(snapshot);

    this.db.endSession(active.id, endedAt);
    return this.db.getSession(active.id)!;
  }

  addTodo(content: string): Todo {
    const active = this.db.getActiveSession(this.projectPath);
    if (!active) {
      throw new Error('No active session. Run `emm start` first.');
    }

    const todo: Todo = {
      id: generateId(),
      sessionId: active.id,
      content,
      status: 'active',
      createdAt: now(),
      completedAt: null,
    };
    return this.db.addTodo(todo);
  }

  completeTodo(todoId: string): void {
    this.db.updateTodoStatus(todoId, 'done', now());
  }

  cancelTodo(todoId: string): void {
    this.db.updateTodoStatus(todoId, 'dropped', now());
  }

  addActivity(type: Activity['type'], description: string): Activity {
    const active = this.db.getActiveSession(this.projectPath);
    if (!active) {
      throw new Error('No active session. Run `emm start` first.');
    }

    const activity: Activity = {
      id: generateId(),
      sessionId: active.id,
      type,
      description,
      timestamp: now(),
    };
    return this.db.addActivity(activity);
  }

  getStatus(): { session: Session | null; todos: Todo[]; gitBranch: string | null; uncommitted: string[] } {
    const session = this.db.getActiveSession(this.projectPath) || null;
    const git = getGitStatus(this.projectPath);
    const todos = session ? this.db.getActiveTodos(session.id) : [];
    return { session, todos, gitBranch: git.branch, uncommitted: git.uncommittedFiles };
  }

  getSessionSummary(sessionId?: string): string {
    const session = sessionId
      ? this.db.getSession(sessionId)
      : this.db.getActiveSession(this.projectPath) || this.db.listSessions(1)[0];

    if (!session) {
      return 'No sessions found.';
    }

    const todos = this.db.getTodos(session.id);
    const activities = this.db.getActivities(session.id);
    const duration = session.endedAt
      ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 60000)
      : Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000);

    const lines = [
      `Session: ${session.id.slice(0, 8)}`,
      `Started: ${session.startedAt}`,
      session.endedAt ? `Ended: ${session.endedAt}` : `Active for ${duration} minutes`,
      `Branch: ${session.gitBranch || 'n/a'}`,
      '',
      `Todos (${todos.length}):`,
      ...todos.map(t => `  [${t.status}] ${t.content}`),
      '',
      `Activities (${activities.length}):`,
      ...activities.slice(0, 10).map(a => `  [${a.type}] ${a.description}`),
    ];

    return lines.join('\n');
  }

  getResumeSummary(): string {
    const sessions = this.db.listSessions(3);
    if (sessions.length === 0) {
      return 'No previous sessions found. Start one with `emm start`.';
    }

    const latest = sessions[0];
    const todos = this.db.getTodos(latest.id);
    const activeTodos = todos.filter(t => t.status === 'active');
    const git = getGitStatus(this.projectPath);
    const recentCommits = getRecentCommits(this.projectPath, 3);

    const lines = [
      '=== Resume from here ===',
      '',
      `Last session: ${latest.id.slice(0, 8)} (${latest.startedAt})`,
      `Branch: ${latest.gitBranch || 'n/a'}`,
      '',
      `Active TODOs (${activeTodos.length}):`,
      ...activeTodos.map(t => `  - ${t.content}`),
      '',
      `Uncommitted changes: ${git.uncommittedFiles.length > 0 ? git.uncommittedFiles.join(', ') : 'None'}`,
      '',
      `Recent commits:`,
      ...recentCommits.map(c => `  ${c.hash.slice(0, 7)} ${c.message} (${c.date.slice(0, 10)})`),
      '',
      'Run `emm start` to begin a new session.',
    ];

    return lines.join('\n');
  }

  detectUnfinishedWork(): UnfinishedWork {
    const git = getGitStatus(this.projectPath);
    const openSessions = this.db.listSessions(100).filter(s => s.endedAt === null);
    const allTodos = openSessions.flatMap(s => this.db.getActiveTodos(s.id));
    const uncommittedFiles = git.uncommittedFiles;
    const unpushedCommits = git.ahead;

    const suggestions: string[] = [];

    if (openSessions.length > 0) {
      suggestions.push(`You have ${openSessions.length} open session(s). Consider ending them with 'emm stop'.`);
    }
    if (allTodos.length > 0) {
      suggestions.push(`You have ${allTodos.length} active TODO(s). Review them with 'emm status'.`);
    }
    if (uncommittedFiles.length > 0) {
      suggestions.push(`You have ${uncommittedFiles.length} uncommitted file(s). Consider committing or stashing them.`);
    }
    if (unpushedCommits > 0) {
      suggestions.push(`You have ${unpushedCommits} unpushed commit(s) on branch '${git.branch}'.`);
    }
    if (suggestions.length === 0) {
      suggestions.push('No unfinished work detected. You are all caught up!');
    }

    return {
      hasUnfinishedWork: openSessions.length > 0 || allTodos.length > 0 || uncommittedFiles.length > 0 || unpushedCommits > 0,
      openSessions,
      activeTodos: allTodos,
      uncommittedFiles,
      unpushedCommits,
      suggestions,
    };
  }

  listAllTodos(): Todo[] {
    return this.db.listAllTodos();
  }

  close() {
    this.db.close();
  }
}
