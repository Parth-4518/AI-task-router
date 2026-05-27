import { Sprint, Status } from '../../schema';

export class SprintStore {
  private sprints = new Map<string, Sprint>();
  private counter = 0;

  private makeId(): string {
    return `sprint-${++this.counter}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  create(partial: Omit<Sprint, 'id' | 'createdAt' | 'updatedAt'>): Sprint {
    const id = this.makeId();
    const sprint: Sprint = {
      ...partial,
      id,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.sprints.set(id, sprint);
    return sprint;
  }

  get(id: string): Sprint | undefined {
    return this.sprints.get(id);
  }

  list(filter?: { status?: Sprint['status'] }): Sprint[] {
    let results = Array.from(this.sprints.values());
    if (filter?.status) results = results.filter(s => s.status === filter.status);
    return results.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  update(id: string, changes: Partial<Omit<Sprint, 'id' | 'createdAt'>>): Sprint | undefined {
    const existing = this.sprints.get(id);
    if (!existing) return undefined;
    const updated: Sprint = { ...existing, ...changes, updatedAt: this.now() };
    this.sprints.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.sprints.delete(id);
  }

  /** Return the currently active sprint, if any. */
  active(): Sprint | undefined {
    return Array.from(this.sprints.values()).find(s => s.status === 'active');
  }
}
