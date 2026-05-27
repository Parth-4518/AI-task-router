import Database from 'better-sqlite3';
import type { Session, Todo, ProjectSnapshot, ResumeSummary } from './types.js';
import * as fs from 'fs';
import * as path from 'path';

export class MemoryStore {
  private db: Database.Database;
  private dataDir: string;
  private dbPath: string;

  constructor(dataDir: string = path.join(process.env.HOME || '.', '.engineering-memory')) {
    this.dataDir = dataDir;
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'memory.db');
    this.db = new (Database as any)(this.dbPath);
    this.initSchema();
  }

  private initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_path TEXT NOT NULL,
        branch TEXT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        todos_created TEXT, -- JSON array
        todos_completed TEXT, -- JSON array
        files_touched TEXT, -- JSON array
        commit_count INTEGER DEFAULT 0,
        summary TEXT
      );

      CREATE TABLE IF NOT EXISTS todos (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at TEXT NOT NULL,
        completed_at TEXT,
        session_id TEXT,
        tags TEXT -- JSON array
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_ended ON sessions(ended_at);
      CREATE INDEX IF NOT EXISTS idx_todos_status ON todos(status);
      CREATE INDEX IF NOT EXISTS idx_todos_session ON todos(session_id);
    `);
  }

  createSession(session: Session): void {
    const stmt = this.db.prepare(`
      INSERT INTO sessions (id, project_path, branch, started_at, ended_at, todos_created, todos_completed, files_touched, commit_count, summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      session.id,
      session.projectPath,
      session.branch,
      session.startedAt,
      session.endedAt,
      JSON.stringify(session.todosCreated),
      JSON.stringify(session.todosCompleted),
      JSON.stringify(session.filesTouched),
      session.commitCount,
      session.summary
    );
  }

  updateSession(id: string, updates: Partial<Session>): void {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.endedAt) { sets.push('ended_at = ?'); values.push(updates.endedAt); }
    if (updates.summary) { sets.push('summary = ?'); values.push(updates.summary); }
    if (updates.filesTouched) { sets.push('files_touched = ?'); values.push(JSON.stringify(updates.filesTouched)); }
    if (updates.commitCount !== undefined) { sets.push('commit_count = ?'); values.push(updates.commitCount); }
    if (updates.todosCreated) { sets.push('todos_created = ?'); values.push(JSON.stringify(updates.todosCreated)); }
    if (updates.todosCompleted) { sets.push('todos_completed = ?'); values.push(JSON.stringify(updates.todosCompleted)); }

    values.push(id);
    this.db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  getSession(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as any;
    if (!row) return null;
    return this.rowToSession(row);
  }

  getLastSession(projectPath?: string): Session | null {
    const query = projectPath
      ? 'SELECT * FROM sessions WHERE project_path = ? ORDER BY started_at DESC LIMIT 1'
      : 'SELECT * FROM sessions ORDER BY started_at DESC LIMIT 1';
    const row = this.db.prepare(query).get(...(projectPath ? [projectPath] : [])) as any;
    if (!row) return null;
    return this.rowToSession(row);
  }

  getActiveSession(projectPath?: string): Session | null {
    const query = projectPath
      ? "SELECT * FROM sessions WHERE project_path = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1"
      : "SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY started_at DESC LIMIT 1";
    const row = this.db.prepare(query).get(...(projectPath ? [projectPath] : [])) as any;
    if (!row) return null;
    return this.rowToSession(row);
  }

  createTodo(todo: Todo): void {
    this.db.prepare(`
      INSERT INTO todos (id, text, status, created_at, completed_at, session_id, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(todo.id, todo.text, todo.status, todo.createdAt, todo.completedAt, todo.sessionId, JSON.stringify(todo.tags));
  }

  updateTodo(id: string, updates: Partial<Todo>): void {
    const sets: string[] = [];
    const values: any[] = [];

    if (updates.status) { sets.push('status = ?'); values.push(updates.status); }
    if (updates.text) { sets.push('text = ?'); values.push(updates.text); }
    if (updates.completedAt !== undefined) { sets.push('completed_at = ?'); values.push(updates.completedAt); }

    values.push(id);
    this.db.prepare(`UPDATE todos SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  }

  getTodos(sessionId?: string): Todo[] {
    const query = sessionId
      ? 'SELECT * FROM todos WHERE session_id = ? ORDER BY created_at DESC'
      : 'SELECT * FROM todos ORDER BY created_at DESC';
    const rows = this.db.prepare(query).all(...(sessionId ? [sessionId] : [])) as any[];
    return rows.map(r => this.rowToTodo(r));
  }

  getActiveTodos(): Todo[] {
    return this.db.prepare("SELECT * FROM todos WHERE status = 'active' ORDER BY created_at DESC").all() as any[];
  }

  generateResume(projectPath?: string): ResumeSummary {
    const lastSession = this.getLastSession(projectPath);
    const activeTodos = this.getActiveTodos();
    const currentSession = this.getActiveSession(projectPath);

    const suggestions: string[] = [];

    if (currentSession) {
      suggestions.push(`Resume active session started at ${currentSession.startedAt}`);
    }

    if (lastSession) {
      if (lastSession.filesTouched.length > 0) {
        suggestions.push(`Last worked on files: ${lastSession.filesTouched.slice(0, 5).join(', ')}`);
      }
      if (lastSession.commitCount > 0) {
        suggestions.push(`Made ${lastSession.commitCount} commits in last session`);
      }
    }

    if (activeTodos.length > 0) {
      suggestions.push(`${activeTodos.length} active todos remaining`);
      suggestions.push(`Next: ${activeTodos[0].text}`);
    }

    if (suggestions.length === 0) {
      suggestions.push('No previous context found. Start fresh!');
    }

    return {
      lastSession,
      activeTodos,
      currentBranch: lastSession?.branch || '',
      uncommittedFiles: [], // Would need git integration
      suggestions
    };
  }

  private rowToSession(row: any): Session {
    return {
      id: row.id,
      projectPath: row.project_path,
      branch: row.branch,
      startedAt: row.started_at,
      endedAt: row.ended_at,
      todosCreated: JSON.parse(row.todos_created || '[]'),
      todosCompleted: JSON.parse(row.todos_completed || '[]'),
      filesTouched: JSON.parse(row.files_touched || '[]'),
      commitCount: row.commit_count,
      summary: row.summary
    };
  }

  private rowToTodo(row: any): Todo {
    return {
      id: row.id,
      text: row.text,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      sessionId: row.session_id,
      tags: JSON.parse(row.tags || '[]')
    };
  }

  close(): void {
    this.db.close();
  }
}
