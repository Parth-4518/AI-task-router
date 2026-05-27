import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { Session, Todo, ProjectSnapshot, Config } from './types';

const GLOBAL_DIR = path.join(os.homedir(), '.engineering-memory');
const SESSIONS_DIR = path.join(GLOBAL_DIR, 'sessions');
const PROJECTS_DIR = path.join(GLOBAL_DIR, 'projects');
const CONFIG_FILE = path.join(GLOBAL_DIR, 'config.json');

function ensureDirs() {
  [GLOBAL_DIR, SESSIONS_DIR, PROJECTS_DIR].forEach(d => {
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  });
}

function getSessionFile(id: string, date: Date): string {
  const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  const dir = path.join(SESSIONS_DIR, ym);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `session_${id}.json`);
}

function getProjectFile(projectPath: string): string {
  const hash = Buffer.from(projectPath).toString('base64').replace(/[/+=]/g, '_');
  return path.join(PROJECTS_DIR, `${hash}.json`);
}

export function loadConfig(): Config {
  ensureDirs();
  if (!fs.existsSync(CONFIG_FILE)) {
    const defaults: Config = {
      version: '0.1.0',
      autoTrack: true,
      sessionTimeoutMinutes: 30,
      defaultTags: []
    };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
}

export function getActiveSession(projectPath?: string): Session | null {
  const sessions = listSessions(projectPath);
  return sessions.find(s => !s.endedAt) || null;
}

export function saveSession(session: Session): void {
  ensureDirs();
  const file = getSessionFile(session.id, new Date(session.startedAt));
  fs.writeFileSync(file, JSON.stringify(session, null, 2));
}

export function loadSession(id: string): Session | null {
  // Search all month dirs
  const months = fs.readdirSync(SESSIONS_DIR);
  for (const month of months) {
    const file = path.join(SESSIONS_DIR, month, `session_${id}.json`);
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf-8'));
  }
  return null;
}

export function listSessions(projectPath?: string): Session[] {
  ensureDirs();
  const sessions: Session[] = [];
  const months = fs.readdirSync(SESSIONS_DIR);
  for (const month of months) {
    const dir = path.join(SESSIONS_DIR, month);
    const files = fs.readdirSync(dir).filter(f => f.startsWith('session_') && f.endsWith('.json'));
    for (const file of files) {
      const s: Session = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf-8'));
      if (!projectPath || s.projectPath === projectPath) sessions.push(s);
    }
  }
  return sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

export function saveProjectSnapshot(snapshot: ProjectSnapshot): void {
  ensureDirs();
  const file = getProjectFile(snapshot.path);
  fs.writeFileSync(file, JSON.stringify(snapshot, null, 2));
}

export function loadProjectSnapshot(projectPath: string): ProjectSnapshot | null {
  ensureDirs();
  const file = getProjectFile(projectPath);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

export function saveTodos(projectPath: string, todos: Todo[]): void {
  const localDir = path.join(projectPath, '.memory');
  if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
  fs.writeFileSync(path.join(localDir, 'todos.json'), JSON.stringify(todos, null, 2));
}

export function loadTodos(projectPath: string): Todo[] {
  const file = path.join(projectPath, '.memory', 'todos.json');
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}
