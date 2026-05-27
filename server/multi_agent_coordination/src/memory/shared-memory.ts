import type { MemoryEntry, MemoryScope } from '../types.js';

export class SharedMemory {
  private entries = new Map<string, MemoryEntry[]>();
  private sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  write(
    key: string,
    value: unknown,
    scope: MemoryScope,
    scopeId: string | null,
    agentId: string,
    ttl: number | null = null
  ): MemoryEntry {
    const now = new Date().toISOString();
    const existing = this.getAllEntries(key, scope, scopeId);
    const version = existing.length + 1;

    const entry: MemoryEntry = {
      id: crypto.randomUUID(),
      key,
      value,
      scope,
      scopeId,
      createdByAgentId: agentId,
      createdAt: now,
      updatedAt: now,
      ttl,
    };

    const compositeKey = this.compositeKey(key, scope, scopeId);
    const list = this.entries.get(compositeKey) ?? [];
    list.push(entry);
    this.entries.set(compositeKey, list);

    return entry;
  }

  read(key: string, scope: MemoryScope, scopeId: string | null): unknown | undefined {
    const compositeKey = this.compositeKey(key, scope, scopeId);
    const list = this.entries.get(compositeKey) ?? [];
    const valid = this.filterValid(list);
    return valid[valid.length - 1]?.value;
  }

  readHistory(key: string, scope: MemoryScope, scopeId: string | null): MemoryEntry[] {
    const compositeKey = this.compositeKey(key, scope, scopeId);
    const list = this.entries.get(compositeKey) ?? [];
    return this.filterValid(list);
  }

  queryByScope(scope: MemoryScope, scopeId: string | null): MemoryEntry[] {
    const results: MemoryEntry[] = [];
    for (const [key, list] of Array.from(this.entries.entries())) {
      if (key.startsWith(`${scope}:`)) {
        const parts = key.split(':');
        const entryScopeId = parts.slice(2).join(':') || null;
        if (entryScopeId === scopeId) {
          results.push(...this.filterValid(list));
        }
      }
    }
    return results;
  }

  delete(key: string, scope: MemoryScope, scopeId: string | null): boolean {
    const compositeKey = this.compositeKey(key, scope, scopeId);
    return this.entries.delete(compositeKey);
  }

  private compositeKey(key: string, scope: MemoryScope, scopeId: string | null): string {
    return `${scope}:${scopeId ?? '_global_'}:${key}`;
  }

  private filterValid(entries: MemoryEntry[]): MemoryEntry[] {
    const now = Date.now();
    return entries.filter((e) => {
      if (e.ttl === null) return true;
      const created = new Date(e.createdAt).getTime();
      return now - created < e.ttl * 1000;
    });
  }

  private getAllEntries(key: string, scope: MemoryScope, scopeId: string | null): MemoryEntry[] {
    const compositeKey = this.compositeKey(key, scope, scopeId);
    return this.entries.get(compositeKey) ?? [];
  }
}
