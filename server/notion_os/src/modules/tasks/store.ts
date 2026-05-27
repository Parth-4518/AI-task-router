import { Task, Status, Priority } from '../../schema';

/**
 * In-memory task store with CRUD operations.
 * Production: swap for Notion-backed or DB-backed store.
 */
export class TaskStore {
  private tasks = new Map<string, Task>();
  private counter = 0;

  private makeId(): string {
    return `task-${++this.counter}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  create(partial: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'identifier'> & { identifier?: string }): Task {
    const id = this.makeId();
    const task: Task = {
      ...partial,
      id,
      identifier: partial.identifier ?? `TEC-${id.split('-')[1]}`,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.tasks.set(id, task);
    return task;
  }

  get(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  getByIdentifier(identifier: string): Task | undefined {
    return Array.from(this.tasks.values()).find(t => t.identifier === identifier);
  }

  list(filter?: { status?: Status; priority?: Priority; assigneeId?: string; sprintId?: string }): Task[] {
    let results = Array.from(this.tasks.values());
    if (filter?.status) results = results.filter(t => t.status === filter.status);
    if (filter?.priority) results = results.filter(t => t.priority === filter.priority);
    if (filter?.assigneeId) results = results.filter(t => t.assigneeId === filter.assigneeId);
    if (filter?.sprintId) results = results.filter(t => t.sprintId === filter.sprintId);
    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  update(id: string, changes: Partial<Omit<Task, 'id' | 'createdAt'>>): Task | undefined {
    const existing = this.tasks.get(id);
    if (!existing) return undefined;
    const updated: Task = { ...existing, ...changes, updatedAt: this.now() };
    this.tasks.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.tasks.delete(id);
  }
}
