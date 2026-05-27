// ─────────────────────────────────────────────────────────────
// Multi-Agent Coordination Framework — File-based Storage
// ─────────────────────────────────────────────────────────────

import * as fs from 'fs';
import * as path from 'path';
import { Agent, Task, Message, MemoryEntry } from './types';

export interface StorageConfig {
  baseDir: string;
}

export class Storage {
  private baseDir: string;
  private agentsFile: string;
  private tasksFile: string;
  private messagesFile: string;
  private memoryFile: string;

  constructor(config: StorageConfig) {
    this.baseDir = config.baseDir;
    this.agentsFile = path.join(this.baseDir, 'agents.json');
    this.tasksFile = path.join(this.baseDir, 'tasks.json');
    this.messagesFile = path.join(this.baseDir, 'messages.json');
    this.memoryFile = path.join(this.baseDir, 'memory.json');
    this.ensureStorage();
  }

  private ensureStorage(): void {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
    const files = [this.agentsFile, this.tasksFile, this.messagesFile, this.memoryFile];
    for (const file of files) {
      if (!fs.existsSync(file)) {
        fs.writeFileSync(file, JSON.stringify([], null, 2));
      }
    }
  }

  // ─── Agents ───

  getAgents(): Agent[] {
    return JSON.parse(fs.readFileSync(this.agentsFile, 'utf-8'));
  }

  saveAgents(agents: Agent[]): void {
    fs.writeFileSync(this.agentsFile, JSON.stringify(agents, null, 2));
  }

  getAgentById(id: string): Agent | undefined {
    return this.getAgents().find((a) => a.id === id);
  }

  // ─── Tasks ───

  getTasks(): Task[] {
    return JSON.parse(fs.readFileSync(this.tasksFile, 'utf-8'));
  }

  saveTasks(tasks: Task[]): void {
    fs.writeFileSync(this.tasksFile, JSON.stringify(tasks, null, 2));
  }

  getTaskById(id: string): Task | undefined {
    return this.getTasks().find((t) => t.id === id);
  }

  // ─── Messages ───

  getMessages(): Message[] {
    return JSON.parse(fs.readFileSync(this.messagesFile, 'utf-8'));
  }

  saveMessages(messages: Message[]): void {
    fs.writeFileSync(this.messagesFile, JSON.stringify(messages, null, 2));
  }

  // ─── Memory ───

  getMemory(): MemoryEntry[] {
    return JSON.parse(fs.readFileSync(this.memoryFile, 'utf-8'));
  }

  saveMemory(entries: MemoryEntry[]): void {
    fs.writeFileSync(this.memoryFile, JSON.stringify(entries, null, 2));
  }

  // ─── Utility ───

  clearAll(): void {
    this.saveAgents([]);
    this.saveTasks([]);
    this.saveMessages([]);
    this.saveMemory([]);
  }
}
