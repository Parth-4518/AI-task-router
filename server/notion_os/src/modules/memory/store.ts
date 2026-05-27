import { EngineeringMemory, MemoryKind } from '../../schema';

export class MemoryStore {
  private memories = new Map<string, EngineeringMemory>();
  private counter = 0;

  private makeId(): string {
    return `mem-${++this.counter}`;
  }

  private now(): string {
    return new Date().toISOString();
  }

  create(partial: Omit<EngineeringMemory, 'id' | 'createdAt' | 'updatedAt'>): EngineeringMemory {
    const id = this.makeId();
    const mem: EngineeringMemory = {
      ...partial,
      id,
      createdAt: this.now(),
      updatedAt: this.now(),
    };
    this.memories.set(id, mem);
    return mem;
  }

  get(id: string): EngineeringMemory | undefined {
    return this.memories.get(id);
  }

  list(filter?: { kind?: MemoryKind; tags?: string[]; relatedTaskId?: string }): EngineeringMemory[] {
    let results = Array.from(this.memories.values());
    if (filter?.kind) results = results.filter(m => m.kind === filter.kind);
    if (filter?.tags) results = results.filter(m => filter.tags!.some(t => m.tags.includes(t)));
    if (filter?.relatedTaskId) results = results.filter(m => m.relatedTaskIds.includes(filter.relatedTaskId!));
    return results.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  update(id: string, changes: Partial<Omit<EngineeringMemory, 'id' | 'createdAt'>>): EngineeringMemory | undefined {
    const existing = this.memories.get(id);
    if (!existing) return undefined;
    const updated: EngineeringMemory = { ...existing, ...changes, updatedAt: this.now() };
    this.memories.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.memories.delete(id);
  }

  /** Simple keyword search across title, context, and decision fields. */
  search(query: string): EngineeringMemory[] {
    const q = query.toLowerCase();
    return Array.from(this.memories.values()).filter(
      m =>
        m.title.toLowerCase().includes(q) ||
        m.context.toLowerCase().includes(q) ||
        m.decision.toLowerCase().includes(q)
    );
  }
}
