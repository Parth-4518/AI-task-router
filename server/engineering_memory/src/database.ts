import Database = require('better-sqlite3');
import * as fs from 'fs';
import * as path from 'path';

export interface Session {
  id: string;
  startedAt: string;
  endedAt: string | null;
  projectPath: string;
  gitBranch: string | null;
  commitHash: string | null;
}

export interface Todo {
  id: string;
  sessionId: string;
  content: string;
  status: 'active' | 'done' | 'dropped';
  createdAt: string;
  completedAt: string | null;
}

export interface Activity {
  id: string;
  sessionId: string;
  type: 'file_change' | 'command' | 'git_op' | 'note';
  description: string;
  timestamp: string;
}

export interface Snapshot {
  id: string;
  sessionId: string;
  gitBranch: string | null;
  uncommittedFiles: string;
  todoSummary: string;
  timestamp: string;
}

export class MemoryDatabase {
  private db: Database.Database;
  private dbPath: string;

  constructor(projectPath: string) {
    const emmDir = path.join(projectPath, '.emm');
    if (!fs.existsSync(emmDir)) {
      fs.mkdirSync(emmDir, { recursive: true });
    }
    this.dbPath = path.join(emmDir, 'memory.db');
    this.db = new (Database as any)(this.dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        startedAt TEXT NOT NULL,
        endedAt TEXT,
        projectPath TEXT NOT NULL,
        gitBranch TEXT,
        commitHash TEXT
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        content TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        createdAt TEXT NOT NULL,
        completedAt TEXT,
        FOREIGN KEY (sessionId) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(id)
      );

      CREATE TABLE IF NOT EXISTS snapshots (
        id TEXT PRIMARY KEY,
        sessionId TEXT NOT NULL,
        gitBranch TEXT,
        uncommittedFiles TEXT,
        todoSummary TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (sessionId) REFERENCES sessions(id)
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_startedAt ON sessions(startedAt);
      CREATE INDEX IF NOT EXISTS idx_activities_session ON activities(sessionId);
      CREATE INDEX IF NOT EXISTS idx_todos_session ON todos(sessionId);
    `);
  }

  createSession(session: Session) {
    const stmt = this.db.prepare(
      'INSERT INTO sessions (id, startedAt, endedAt, projectPath, gitBranch, commitHash) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(session.id, session.startedAt, session.endedAt, session.projectPath, session.gitBranch, session.commitHash);
    return session;
  }

  getActiveSession(projectPath: string): Session | undefined {
    const stmt = this.db.prepare(
      'SELECT * FROM sessions WHERE projectPath = ? AND endedAt IS NULL ORDER BY startedAt DESC LIMIT 1'
    );
    return stmt.get(projectPath) as Session | undefined;
  }

  endSession(sessionId: string, endedAt: string) {
    const stmt = this.db.prepare('UPDATE sessions SET endedAt = ? WHERE id = ?');
    stmt.run(endedAt, sessionId);
  }

  getSession(id: string): Session | undefined {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    return stmt.get(id) as Session | undefined;
  }

  listSessions(limit: number = 10): Session[] {
    const stmt = this.db.prepare('SELECT * FROM sessions ORDER BY startedAt DESC LIMIT ?');
    return stmt.all(limit) as Session[];
  }

  addTodo(todo: Todo) {
    const stmt = this.db.prepare(
      'INSERT INTO todos (id, sessionId, content, status, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(todo.id, todo.sessionId, todo.content, todo.status, todo.createdAt, todo.completedAt);
    return todo;
  }

  updateTodoStatus(id: string, status: Todo['status'], completedAt: string | null) {
    const stmt = this.db.prepare('UPDATE todos SET status = ?, completedAt = ? WHERE id = ?');
    stmt.run(status, completedAt, id);
  }

  getTodos(sessionId: string): Todo[] {
    const stmt = this.db.prepare('SELECT * FROM todos WHERE sessionId = ? ORDER BY createdAt DESC');
    return stmt.all(sessionId) as Todo[];
  }

  getActiveTodos(sessionId: string): Todo[] {
    const stmt = this.db.prepare("SELECT * FROM todos WHERE sessionId = ? AND status = 'active' ORDER BY createdAt DESC");
    return stmt.all(sessionId) as Todo[];
  }

  addActivity(activity: Activity) {
    const stmt = this.db.prepare(
      'INSERT INTO activities (id, sessionId, type, description, timestamp) VALUES (?, ?, ?, ?, ?)'
    );
    stmt.run(activity.id, activity.sessionId, activity.type, activity.description, activity.timestamp);
    return activity;
  }

  getActivities(sessionId: string): Activity[] {
    const stmt = this.db.prepare('SELECT * FROM activities WHERE sessionId = ? ORDER BY timestamp DESC');
    return stmt.all(sessionId) as Activity[];
  }

  createSnapshot(snapshot: Snapshot) {
    const stmt = this.db.prepare(
      'INSERT INTO snapshots (id, sessionId, gitBranch, uncommittedFiles, todoSummary, timestamp) VALUES (?, ?, ?, ?, ?, ?)'
    );
    stmt.run(snapshot.id, snapshot.sessionId, snapshot.gitBranch, snapshot.uncommittedFiles, snapshot.todoSummary, snapshot.timestamp);
    return snapshot;
  }

  getLatestSnapshot(sessionId: string): Snapshot | undefined {
    const stmt = this.db.prepare('SELECT * FROM snapshots WHERE sessionId = ? ORDER BY timestamp DESC LIMIT 1');
    return stmt.get(sessionId) as Snapshot | undefined;
  }

  listAllTodos(): Todo[] {
    const stmt = this.db.prepare('SELECT * FROM todos ORDER BY createdAt DESC');
    return stmt.all() as Todo[];
  }

  close() {
    this.db.close();
  }
}
