import { Bug, BugSeverity, BugEnvironment, Status } from '../../schema';

export class BugStore {
  private bugs = new Map<string, Bug>();
  private counter = 0;

  private makeId(): string {
    return `bug-${++this.counter}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  create(partial: Omit<Bug, 'id' | 'createdAt' | 'updatedAt' | 'identifier'> & { identifier?: string }): Bug {
    const id = this.makeId();
    const bug: Bug = {
      ...partial,
      id,
      identifier: partial.identifier ?? `BUG-${id.split('-')[1]}`,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.bugs.set(id, bug);
    return bug;
  }

  get(id: string): Bug | undefined {
    return this.bugs.get(id);
  }

  getByIdentifier(identifier: string): Bug | undefined {
    return Array.from(this.bugs.values()).find(b => b.identifier === identifier);
  }

  list(filter?: { status?: Status; severity?: BugSeverity; environment?: BugEnvironment; assigneeId?: string }): Bug[] {
    let results = Array.from(this.bugs.values());
    if (filter?.status) results = results.filter(b => b.status === filter.status);
    if (filter?.severity) results = results.filter(b => b.severity === filter.severity);
    if (filter?.environment) results = results.filter(b => b.environment === filter.environment);
    if (filter?.assigneeId) results = results.filter(b => b.assigneeId === filter.assigneeId);
    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  update(id: string, changes: Partial<Omit<Bug, 'id' | 'createdAt'>>): Bug | undefined {
    const existing = this.bugs.get(id);
    if (!existing) return undefined;
    const updated: Bug = { ...existing, ...changes, updatedAt: this.now() };
    this.bugs.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.bugs.delete(id);
  }

  /** Return critical/blocker bugs not yet done. */
  criticalOpen(): Bug[] {
    return Array.from(this.bugs.values()).filter(
      b => b.status !== 'done' && b.status !== 'cancelled' && (b.severity === 'critical' || b.severity === 'blocker')
    );
  }
}
