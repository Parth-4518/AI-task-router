# Multi-Agent Coordination Framework — Architecture

## Overview
A lightweight, extensible coordination system that enables specialized AI agents to collaborate on engineering workflows. Designed for the Paperclip platform, it provides task delegation, progress tracking, duplicate-work prevention, shared memory, and execution reporting.

## Design Decisions

### 1. Storage: JSON File-based + In-Memory Cache
- **Why**: Zero external dependencies, human-readable, easy to debug, works with Paperclip's file-based workflow
- **Trade-off**: Not distributed; designed for single-node deployments
- **Location**: `~/.multi_agent_coordination/` for global state, `.coordination/` for project-local state

### 2. Language: TypeScript/Node.js
- **Why**: Aligns with Paperclip server stack, excellent async support, strong typing
- **Alternative considered**: Python (rejected — keep stack consistent with existing codebase)

### 3. Communication Pattern: Message Bus + Direct RPC
- **Message Bus**: Async broadcast for events (task.created, task.completed, agent.heartbeat)
- **Direct RPC**: Synchronous request/response for task delegation
- **Why**: Flexible; supports both fire-and-forget and blocking patterns

### 4. Orchestration Model: Hierarchical with Flat Fallback
- **Hierarchical**: CEO agent delegates to specialized agents
- **Flat Fallback**: Agents can communicate peer-to-peer for efficiency
- **Why**: Prevents CEO bottleneck while maintaining oversight

## Core Concepts

### Agent
```typescript
interface Agent {
  id: string;                    // UUID
  name: string;                  // Human-readable name
  role: AgentRole;               // planner | documenter | qa | researcher | reviewer | executor
  capabilities: string[];        // What this agent can do
  status: AgentStatus;           // idle | busy | offline | error
  currentTaskId: string | null;  // Active task
  heartbeatAt: string;           // ISO timestamp
  metadata: Record<string, any>; // Extensible attributes
}
```

### Task
```typescript
interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;        // pending | assigned | in_progress | blocked | completed | failed
  priority: Priority;        // low | medium | high | critical
  assigneeAgentId: string | null;
  createdByAgentId: string;
  parentTaskId: string | null;
  dependencies: string[];    // Task IDs that must complete first
  tags: string[];
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  deliverables: Deliverable[];
  notes: Note[];
}
```

### Message
```typescript
interface Message {
  id: string;
  type: MessageType;         // task_request | task_accept | task_reject | task_complete | heartbeat | broadcast | direct
  fromAgentId: string;
  toAgentId: string | null;  // null = broadcast
  taskId: string | null;
  payload: any;
  timestamp: string;
}
```

### Shared Memory Entry
```typescript
interface MemoryEntry {
  id: string;
  key: string;
  value: any;
  scope: MemoryScope;        // global | project | task | agent
  scopeId: string | null;
  createdByAgentId: string;
  createdAt: string;
  updatedAt: string;
  ttl: number | null;        // Seconds until expiry, null = forever
}
```

## Agent Roles

| Role | Responsibility | Key Capabilities |
|------|---------------|------------------|
| **Planner** | Break down work, create tasks, estimate effort | planning, estimation, dependency-analysis |
| **Documenter** | Write docs, update READMEs, maintain specs | technical-writing, markdown, api-docs |
| **QA** | Test code, find bugs, verify requirements | testing, bug-reporting, regression-analysis |
| **Researcher** | Investigate technologies, compare options | tech-evaluation, prototyping, benchmarking |
| **Reviewer** | Code review, architecture review, sign-off | code-review, security-review, performance-review |
| **Executor** | Implement features, fix bugs, ship code | coding, debugging, deployment |

## Workflows

### Task Delegation
1. Planner creates task breakdown
2. Coordinator (CEO) assigns tasks to appropriate agents
3. Agent receives task, accepts or rejects with reason
4. On accept: agent updates status to `in_progress`
5. On complete: agent submits deliverables, status → `completed`
6. Coordinator verifies and marks done

### Duplicate Work Prevention
- Before creating a task: check shared memory for similar pending/in-progress tasks
- Hash task titles + descriptions for similarity detection
- Agents query "is anyone working on X?" before starting

### Failure Handling
- Task timeout: auto-reassign after threshold
- Agent offline: redistribute tasks to available agents
- Repeated failure: escalate to CEO with error log
- Circuit breaker: disable flaky agents after N failures

### Observability
- Heartbeat: every agent reports status every 30s
- Event log: all messages persisted for audit
- Metrics: tasks created/assigned/completed per agent, avg completion time
- Report generation: daily/weekly summary

## Implementation Milestones

1. **MVP Core** (this session):
   - Agent registry and heartbeat
   - Task CRUD + assignment
   - Message bus
   - Shared memory
   - Basic CLI

2. **Phase 2** (future):
   - Duplicate detection
   - Failure recovery
   - Metrics dashboard
   - Paperclip integration hooks

3. **Phase 3** (future):
   - Agent specialization templates
   - Auto-scaling agent pools
   - Cross-project coordination
