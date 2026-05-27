// ─────────────────────────────────────────────────────────────
// Multi-Agent Coordination Framework — Utilities
// ─────────────────────────────────────────────────────────────

import * as crypto from 'crypto';

export function generateId(): string {
  return crypto.randomUUID();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function minutesBetween(start: string, end: string): number {
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return Math.round((e - s) / 60000);
}
