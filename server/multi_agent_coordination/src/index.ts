// ─────────────────────────────────────────────────────────────
// Multi-Agent Coordination Framework — Main Export
// ─────────────────────────────────────────────────────────────

export { Orchestrator } from './core/orchestrator.js';
export { AgentRegistry } from './core/agent-registry.js';
export { TaskRegistry } from './core/task-registry.js';
export { FailureHandler } from './core/failure-handler.js';
export { MessageBus } from './communication/message-bus.js';
export { SharedMemory } from './memory/shared-memory.js';
export { Storage } from './storage.js';

export type {
  Agent,
  AgentRole,
  AgentStatus,
  Task,
  TaskStatus,
  Priority,
  Message,
  MessageType,
  MemoryEntry,
  MemoryScope,
  FailureEvent,
  CoordinationReport,
  AgentStat,
  TaskStat,
  Deliverable,
  Note,
} from './types.js';

export { generateId, nowIso, minutesBetween } from './utils.js';
