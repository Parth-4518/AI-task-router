export interface Session {
  id: string;
  projectPath: string;
  branch: string;
  startedAt: string;
  endedAt?: string;
  todosCreated: string[];
  todosCompleted: string[];
  filesTouched: string[];
  commitCount: number;
  summary?: string;
}

export interface Todo {
  id: string;
  text: string;
  status: 'active' | 'done' | 'dropped';
  createdAt: string;
  completedAt?: string;
  sessionId: string;
  tags: string[];
}

export interface ProjectSnapshot {
  path: string;
  lastSessionAt: string;
  currentBranch: string;
  uncommittedFiles: string[];
  activeTodos: Todo[];
  recentCommits: { hash: string; message: string; date: string }[];
}

export interface Config {
  version: string;
  autoTrack: boolean;
  sessionTimeoutMinutes: number;
  defaultTags: string[];
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  commitHash: string;
  isRepo: boolean;
  uncommittedFiles: string[];
}

export interface ResumeSummary {
  lastSession: Session | null;
  activeTodos: Todo[];
  currentBranch: string;
  uncommittedFiles: string[];
  suggestions: string[];
}
