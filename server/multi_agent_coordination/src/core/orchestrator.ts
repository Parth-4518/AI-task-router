import type { Agent, AgentRole, Task, Message, CoordinationReport } from '../types.js';
import { AgentRegistry } from './agent-registry.js';
import { TaskRegistry } from './task-registry.js';
import { MessageBus } from '../communication/message-bus.js';
import { SharedMemory } from '../memory/shared-memory.js';
import { FailureHandler } from './failure-handler.js';

export interface OrchestratorOptions {
  maxConcurrentTasksPerAgent?: number;
  defaultTaskTimeoutMs?: number;
  enableDuplicatePrevention?: boolean;
}

export class Orchestrator {
  public agents: AgentRegistry;
  public tasks: TaskRegistry;
  public messages: MessageBus;
  public memory: SharedMemory;
  public failures: FailureHandler;

  private options: Required<OrchestratorOptions>;
  private active = false;
  private coordinationLoopId: ReturnType<typeof setInterval> | null = null;
  private sessionId: string;

  constructor(sessionId: string, options: OrchestratorOptions = {}) {
    this.sessionId = sessionId;
    this.agents = new AgentRegistry();
    this.tasks = new TaskRegistry();
    this.messages = new MessageBus();
    this.memory = new SharedMemory(sessionId);
    this.failures = new FailureHandler();

    this.options = {
      maxConcurrentTasksPerAgent: 1,
      defaultTaskTimeoutMs: 300_000, // 5 min
      enableDuplicatePrevention: true,
      ...options,
    };
  }

  start(): void {
    this.active = true;
    this.coordinationLoopId = setInterval(() => this.coordinationTick(), 2000);
  }

  stop(): void {
    this.active = false;
    if (this.coordinationLoopId) {
      clearInterval(this.coordinationLoopId);
      this.coordinationLoopId = null;
    }
  }

  registerAgent(agent: Agent): void {
    this.agents.register(agent);
    this.memory.write('agent:registered', {
      agentId: agent.id,
      role: agent.role,
      capabilities: agent.capabilities,
    }, 'global', null, agent.id);
  }

  createTask(task: Task): void {
    this.tasks.register(task);
    this.memory.write(`task:${task.id}:created`, task, 'task', task.id, task.createdByAgentId);
  }

  private coordinationTick(): void {
    if (!this.active) return;

    // 1. Assign ready tasks to idle agents
    const readyTasks = this.tasks.getReadyTasks();
    for (const task of readyTasks) {
      if (task.assigneeAgentId) continue;

      const candidate = this.findBestAgent(task);
      if (candidate) {
        this.assignTask(task.id, candidate.id);
      }
    }

    // 2. Detect and resolve blockers
    const blockedTasks = this.tasks.getBlockedTasks();
    for (const task of blockedTasks) {
      if (task.status !== 'blocked') {
        this.tasks.updateStatus(task.id, 'blocked');
        this.messages.broadcast({
          id: crypto.randomUUID(),
          type: 'broadcast',
          fromAgentId: 'orchestrator',
          taskId: task.id,
          payload: { event: 'task_blocked', reason: 'dependency_failure' },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // 3. Check for stuck tasks
    this.detectStuckTasks();

    // 4. Prevent duplicate work
    if (this.options.enableDuplicatePrevention) {
      this.preventDuplicates();
    }
  }

  private findBestAgent(task: Task): Agent | null {
    // Prefer agents whose capabilities match task tags
    const candidates = this.agents.getAvailable();
    if (candidates.length === 0) return null;

    const scored = candidates.map((agent) => {
      let score = 0;
      // Capability match
      for (const tag of task.tags) {
        if (agent.capabilities.includes(tag)) score += 2;
      }
      // Prefer idle agents
      if (agent.status === 'idle') score += 1;
      // Prefer agents with fewer current tasks
      const currentTasks = this.tasks.getByAgent(agent.id).length;
      score -= currentTasks;
      return { agent, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored[0]?.agent ?? null;
  }

  private assignTask(taskId: string, agentId: string): void {
    this.tasks.assign(taskId, agentId);
    this.agents.updateStatus(agentId, 'busy');

    const task = this.tasks.get(taskId)!;
    const msg: Message = {
      id: crypto.randomUUID(),
      type: 'task_request',
      fromAgentId: 'orchestrator',
      toAgentId: agentId,
      taskId,
      payload: {
        title: task.title,
        description: task.description,
        context: task,
      },
      timestamp: new Date().toISOString(),
    };
    this.messages.send(msg);
  }

  private detectStuckTasks(): void {
    const inProgress = this.tasks.getByStatus('in_progress');
    const now = Date.now();
    for (const task of inProgress) {
      const started = task.startedAt ? new Date(task.startedAt).getTime() : 0;
      if (now - started > this.options.defaultTaskTimeoutMs) {
        this.failures.handleTimeout(task.id, task.assigneeAgentId!);
        this.tasks.updateStatus(task.id, 'failed');
        if (task.assigneeAgentId) {
          this.agents.updateStatus(task.assigneeAgentId, 'idle');
        }
      }
    }
  }

  private preventDuplicates(): void {
    const pending = this.tasks.getByStatus('pending');
    const assigned = this.tasks.getByStatus('assigned');
    const inProgress = this.tasks.getByStatus('in_progress');

    const allActive = [...pending, ...assigned, ...inProgress];
    const seenTitles = new Map<string, string>();

    for (const task of allActive) {
      const normalized = task.title.toLowerCase().trim();
      if (seenTitles.has(normalized)) {
        const existingId = seenTitles.get(normalized)!;
        // Mark as potential duplicate in memory
        this.memory.write(`duplicate:${task.id}`, {
          originalTaskId: existingId,
          duplicateTaskId: task.id,
          title: task.title,
        }, 'global', null, 'orchestrator');
      } else {
        seenTitles.set(normalized, task.id);
      }
    }
  }

  generateReport(): CoordinationReport {
    const allTasks = this.tasks.getAll();
    const allAgents = this.agents.getAll();
    const now = new Date().toISOString();

    const completedTasks = allTasks.filter((t) => t.status === 'completed');
    const failedTasks = allTasks.filter((t) => t.status === 'failed');

    const agentStats = allAgents.map((agent) => {
      const agentTasks = this.tasks.getByAgent(agent.id);
      const agentCompleted = agentTasks.filter((t) => t.status === 'completed');
      const times = agentCompleted
        .map((t) =>
          t.startedAt && t.completedAt
            ? (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 60000
            : null
        )
        .filter((t): t is number => t !== null);

      return {
        agentId: agent.id,
        agentName: agent.name,
        tasksAssigned: agentTasks.length,
        tasksCompleted: agentCompleted.length,
        tasksFailed: agentTasks.filter((t) => t.status === 'failed').length,
        avgCompletionTimeMinutes: times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : null,
        currentStatus: agent.status,
      };
    });

    const completionTimes = completedTasks
      .map((t) =>
        t.startedAt && t.completedAt
          ? (new Date(t.completedAt).getTime() - new Date(t.startedAt).getTime()) / 60000
          : null
      )
      .filter((t): t is number => t !== null);

    return {
      generatedAt: now,
      period: { start: now, end: now },
      agentStats,
      taskStats: {
        total: allTasks.length,
        pending: allTasks.filter((t) => t.status === 'pending').length,
        inProgress: allTasks.filter((t) => t.status === 'in_progress').length,
        completed: completedTasks.length,
        failed: failedTasks.length,
        blocked: allTasks.filter((t) => t.status === 'blocked').length,
        avgTimeToCompleteMinutes: completionTimes.length > 0 ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length : null,
      },
      messagesExchanged: this.messages.getMessageCount(),
      topBlockers: this.failures.getTopBlockers(5),
    };
  }
}
