import { describe, it, expect, beforeEach } from 'vitest';
import { Orchestrator } from '../src/core/orchestrator.js';
import type { Agent, Task } from '../src/types.js';

describe('Orchestrator', () => {
  let orch: Orchestrator;

  beforeEach(() => {
    orch = new Orchestrator('test-session', {
      maxConcurrentTasksPerAgent: 2,
      defaultTaskTimeoutMs: 60_000,
      enableDuplicatePrevention: true,
    });
  });

  it('registers agents', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: 'Planner',
      role: 'planner',
      capabilities: ['planning'],
      status: 'idle',
      currentTaskId: null,
      heartbeatAt: new Date().toISOString(),
      metadata: {},
    };
    orch.registerAgent(agent);
    expect(orch.agents.getAll()).toHaveLength(1);
    expect(orch.agents.get('agent-1')?.name).toBe('Planner');
  });

  it('creates tasks', () => {
    const task: Task = {
      id: 'task-1',
      title: 'Design API',
      description: 'Design REST API',
      status: 'pending',
      priority: 'high',
      assigneeAgentId: null,
      createdByAgentId: 'ceo',
      parentTaskId: null,
      dependencies: [],
      tags: ['planning'],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      deliverables: [],
      notes: [],
    };
    orch.createTask(task);
    expect(orch.tasks.getAll()).toHaveLength(1);
    expect(orch.tasks.get('task-1')?.title).toBe('Design API');
  });

  it('assigns ready tasks to idle agents', () => {
    const agent: Agent = {
      id: 'agent-1',
      name: 'Planner',
      role: 'planner',
      capabilities: ['planning'],
      status: 'idle',
      currentTaskId: null,
      heartbeatAt: new Date().toISOString(),
      metadata: {},
    };
    orch.registerAgent(agent);

    const task: Task = {
      id: 'task-1',
      title: 'Design API',
      description: 'Design REST API',
      status: 'pending',
      priority: 'high',
      assigneeAgentId: null,
      createdByAgentId: 'ceo',
      parentTaskId: null,
      dependencies: [],
      tags: ['planning'],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      deliverables: [],
      notes: [],
    };
    orch.createTask(task);

    // Manually trigger assignment
    const readyTasks = orch.tasks.getReadyTasks();
    expect(readyTasks).toHaveLength(1);

    // Simulate what the orchestrator tick does
    for (const t of readyTasks) {
      if (!t.assigneeAgentId) {
        const candidates = orch.agents.getAvailable();
        expect(candidates.length).toBeGreaterThan(0);
        if (candidates.length > 0) {
          orch.tasks.assign(t.id, candidates[0].id);
          orch.agents.updateStatus(candidates[0].id, 'busy');
        }
      }
    }

    const assigned = orch.tasks.getByStatus('assigned');
    expect(assigned).toHaveLength(1);
    expect(assigned[0].assigneeAgentId).toBe('agent-1');
    expect(orch.agents.get('agent-1')?.status).toBe('busy');
  });

  it('blocks tasks with failed dependencies', () => {
    const depTask: Task = {
      id: 'dep-1',
      title: 'Setup DB',
      description: 'Setup database',
      status: 'failed',
      priority: 'high',
      assigneeAgentId: null,
      createdByAgentId: 'ceo',
      parentTaskId: null,
      dependencies: [],
      tags: [],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      deliverables: [],
      notes: [],
    };

    const task: Task = {
      id: 'task-1',
      title: 'Build API',
      description: 'Build API',
      status: 'pending',
      priority: 'high',
      assigneeAgentId: null,
      createdByAgentId: 'ceo',
      parentTaskId: null,
      dependencies: ['dep-1'],
      tags: [],
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      deliverables: [],
      notes: [],
    };

    orch.createTask(depTask);
    orch.createTask(task);

    expect(orch.tasks.getBlockedTasks()).toHaveLength(1);
  });

  it('generates a report', () => {
    const report = orch.generateReport();
    expect(report.taskStats.total).toBe(0);
    expect(report.taskStats.pending).toBe(0);
    expect(report.taskStats.completed).toBe(0);
    expect(report.messagesExchanged).toBe(0);
  });
});
