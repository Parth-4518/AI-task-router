#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────
// Multi-Agent Coordination Framework — CLI
// ─────────────────────────────────────────────────────────────

import { Orchestrator } from './core/orchestrator.js';
import type { Agent, Task } from './types.js';

const sessionId = process.env.MACF_SESSION || `session-${Date.now()}`;
const orch = new Orchestrator(sessionId, {
  maxConcurrentTasksPerAgent: 2,
  defaultTaskTimeoutMs: 300_000,
  enableDuplicatePrevention: true,
});

function printHelp(): void {
  console.log(`
Multi-Agent Coordination Framework (macf)

Usage:
  macf <command> [args]

Commands:
  start                    Start the orchestrator loop
  stop                     Stop the orchestrator loop
  agent add <name> <role>  Register a new agent
  agent list               List all registered agents
  agent remove <id>        Remove an agent
  task add <title> [desc]  Create a new task
  task list                List all tasks
  task assign <taskId> <agentId>  Assign a task
  task complete <taskId>   Mark a task as completed
  report                   Generate coordination report
  help                     Show this help

Examples:
  macf agent add "Planner-1" planner
  macf task add "Design API" "Create REST API for v2"
  macf start
`);
}

function main(): void {
  const args = process.argv.slice(2);
  const cmd = args[0];

  switch (cmd) {
    case 'start':
      orch.start();
      console.log(`[macf] Orchestrator started (session: ${sessionId})`);
      // Keep alive
      setInterval(() => {
        const report = orch.generateReport();
        console.log(`[macf] ${report.taskStats.completed}/${report.taskStats.total} tasks completed`);
      }, 30_000);
      break;

    case 'stop':
      orch.stop();
      console.log('[macf] Orchestrator stopped');
      process.exit(0);

    case 'agent': {
      const sub = args[1];
      if (sub === 'add') {
        const name = args[2];
        const role = args[3] as Agent['role'];
        if (!name || !role) {
          console.error('Usage: macf agent add <name> <role>');
          process.exit(1);
        }
        const agent: Agent = {
          id: crypto.randomUUID(),
          name,
          role,
          capabilities: [role, 'general'],
          status: 'idle',
          currentTaskId: null,
          heartbeatAt: new Date().toISOString(),
          metadata: {},
        };
        orch.registerAgent(agent);
        console.log(`[macf] Agent registered: ${agent.id} (${name} / ${role})`);
      } else if (sub === 'list') {
        const agents = orch.agents.getAll();
        console.table(agents.map((a) => ({
          id: a.id.slice(0, 8),
          name: a.name,
          role: a.role,
          status: a.status,
          tasks: orch.tasks.getByAgent(a.id).length,
        })));
      } else if (sub === 'remove') {
        const id = args[2];
        if (!id) {
          console.error('Usage: macf agent remove <id>');
          process.exit(1);
        }
        orch.agents.unregister(id);
        console.log(`[macf] Agent removed: ${id}`);
      }
      break;
    }

    case 'task': {
      const sub = args[1];
      if (sub === 'add') {
        const title = args[2];
        const description = args[3] || title;
        if (!title) {
          console.error('Usage: macf task add <title> [description]');
          process.exit(1);
        }
        const task: Task = {
          id: crypto.randomUUID(),
          title,
          description,
          status: 'pending',
          priority: 'medium',
          assigneeAgentId: null,
          createdByAgentId: 'cli',
          parentTaskId: null,
          dependencies: [],
          tags: [],
          createdAt: new Date().toISOString(),
          startedAt: null,
          completedAt: null,
          deliverables: [],
          notes: [],
        };
        orch.createTask(task);
        console.log(`[macf] Task created: ${task.id} (${title})`);
      } else if (sub === 'list') {
        const tasks = orch.tasks.getAll();
        console.table(tasks.map((t) => ({
          id: t.id.slice(0, 8),
          title: t.title.slice(0, 40),
          status: t.status,
          assignee: t.assigneeAgentId ? t.assigneeAgentId.slice(0, 8) : '-',
        })));
      } else if (sub === 'assign') {
        const taskId = args[2];
        const agentId = args[3];
        orch.tasks.assign(taskId, agentId);
        console.log(`[macf] Task ${taskId} assigned to ${agentId}`);
      } else if (sub === 'complete') {
        const taskId = args[2];
        orch.tasks.updateStatus(taskId, 'completed');
        console.log(`[macf] Task ${taskId} marked as completed`);
      }
      break;
    }

    case 'report': {
      const report = orch.generateReport();
      console.log('\n=== Coordination Report ===');
      console.log(`Generated: ${report.generatedAt}`);
      console.log(`\nTasks: ${report.taskStats.total} total`);
      console.log(`  Pending: ${report.taskStats.pending}`);
      console.log(`  In Progress: ${report.taskStats.inProgress}`);
      console.log(`  Completed: ${report.taskStats.completed}`);
      console.log(`  Failed: ${report.taskStats.failed}`);
      console.log(`  Blocked: ${report.taskStats.blocked}`);
      console.log(`\nMessages exchanged: ${report.messagesExchanged}`);
      if (report.agentStats.length > 0) {
        console.log('\nAgent Performance:');
        console.table(report.agentStats.map((s) => ({
          agent: s.agentName,
          assigned: s.tasksAssigned,
          completed: s.tasksCompleted,
          failed: s.tasksFailed,
          avgMin: s.avgCompletionTimeMinutes?.toFixed(1) ?? '-',
          status: s.currentStatus,
        })));
      }
      break;
    }

    case 'help':
    default:
      printHelp();
      break;
  }
}

main();
