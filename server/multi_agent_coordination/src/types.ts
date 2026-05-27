// ─────────────────────────────────────────────────────────────
// Multi-Agent Coordination Framework — Core Types
// ─────────────────────────────────────────────────────────────

export type AgentRole =
  | 'planner'
  | 'documenter'
  | 'qa'
  | 'researcher'
  | 'reviewer'
  | 'executor'
  | 'coordinator';

export type AgentStatus = 'idle' | 'busy' | 'offline' | 'error';

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'in_progress'
  | 'blocked'
  | 'completed'
  | 'failed';

export type Priority = 'low' | 'medium' | 'high' | 'critical';

export type MessageType =
  | 'task_request'
  | 'task_accept'
  | 'task_reject'
  | 'task_complete'
  | 'heartbeat'
  | 'broadcast'
  | 'direct'
  | 'error';

export type MemoryScope = 'global' | 'project' | 'task' | 'agent';

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  capabilities: string[];
  status: AgentStatus;
  currentTaskId: string | null;
  heartbeatAt: string; // ISO timestamp
  metadata: Record<string, any>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: Priority;
  assigneeAgentId: string | null;
  createdByAgentId: string;
  parentTaskId: string | null;
  dependencies: string[];
  tags: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  deliverables: Deliverable[];
  notes: Note[];
}

export interface Deliverable {
  id: string;
  type: 'file' | 'url' | 'text' | 'code' | 'report';
  description: string;
  content: string;
  createdAt: string;
}

export interface Note {
  id: string;
  agentId: string;
  text: string;
  timestamp: string;
}

export interface Message {
  id: string;
  type: MessageType;
  fromAgentId: string;
  toAgentId: string | null; // null = broadcast
  taskId: string | null;
  payload: any;
  timestamp: string;
}

export interface MemoryEntry {
  id: string;
  key: string;
  value: any;
  scope: MemoryScope;
  scopeId: string | null;
  createdByAgentId: string;
  createdAt: string;
  updatedAt: string;
  ttl: number | null; // seconds, null = forever
}

export interface FailureEvent {
  id: string;
  taskId: string;
  agentId: string;
  error: string;
  errorType: 'timeout' | 'crash' | 'dependency_failure' | 'unknown';
  recoverable: boolean;
  recoveryStrategy: string | null;
  retryCount: number;
  maxRetries: number;
  timestamp: string;
}

export interface CoordinationReport {
  generatedAt: string;
  period: { start: string; end: string };
  agentStats: AgentStat[];
  taskStats: TaskStat;
  messagesExchanged: number;
  topBlockers: string[];
}

export interface AgentStat {
  agentId: string;
  agentName: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksFailed: number;
  avgCompletionTimeMinutes: number | null;
  currentStatus: AgentStatus;
}

export interface TaskStat {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  failed: number;
  blocked: number;
  avgTimeToCompleteMinutes: number | null;
}
