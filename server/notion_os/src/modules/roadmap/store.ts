import { RoadmapItem, RoadmapTimeframe, Status, Priority } from '../../schema';

export class RoadmapStore {
  private items = new Map<string, RoadmapItem>();
  private counter = 0;

  private makeId(): string {
    return `roadmap-${++this.counter}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  create(partial: Omit<RoadmapItem, 'id' | 'createdAt' | 'updatedAt'>): RoadmapItem {
    const id = this.makeId();
    const item: RoadmapItem = {
      ...partial,
      id,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.items.set(id, item);
    return item;
  }

  get(id: string): RoadmapItem | undefined {
    return this.items.get(id);
  }

  list(filter?: { timeframe?: RoadmapTimeframe; status?: Status; priority?: Priority }): RoadmapItem[] {
    let results = Array.from(this.items.values());
    if (filter?.timeframe) results = results.filter(r => r.timeframe === filter.timeframe);
    if (filter?.status) results = results.filter(r => r.status === filter.status);
    if (filter?.priority) results = results.filter(r => r.priority === filter.priority);
    return results.sort((a, b) => new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime());
  }

  update(id: string, changes: Partial<Omit<RoadmapItem, 'id' | 'createdAt'>>): RoadmapItem | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated: RoadmapItem = { ...existing, ...changes, updatedAt: this.now() };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }

  /** Return items blocked by unresolved dependencies. */
  blockedItems(): RoadmapItem[] {
    return Array.from(this.items.values()).filter(item =>
      item.dependencies.some(depId => {
        const dep = this.items.get(depId);
        return dep ? dep.status !== 'done' : true;
      })
    );
  }
}
