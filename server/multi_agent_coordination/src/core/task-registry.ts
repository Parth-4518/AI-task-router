import type { Task, TaskStatus } from '../types.js';

export class TaskRegistry {
  private tasks = new Map<string, Task>();
  private tasksByStatus = new Map<TaskStatus, Set<string>>();
  private tasksByAgent = new Map<string, Set<string>>();
  private tasksByParent = new Map<string, Set<string>>();

  register(task: Task): void {
    if (this.tasks.has(task.id)) {
      throw new Error(`Task ${task.id} already registered`);
    }
    this.tasks.set(task.id, task);
    this.addToIndex(task);
  }

  private addToIndex(task: Task): void {
    // Status index
    const statusSet = this.tasksByStatus.get(task.status) ?? new Set<string>();
    statusSet.add(task.id);
    this.tasksByStatus.set(task.status, statusSet);

    // Agent index
    if (task.assigneeAgentId) {
      const agentSet = this.tasksByAgent.get(task.assigneeAgentId) ?? new Set<string>();
      agentSet.add(task.id);
      this.tasksByAgent.set(task.assigneeAgentId, agentSet);
    }

    // Parent index
    if (task.parentTaskId) {
      const parentSet = this.tasksByParent.get(task.parentTaskId) ?? new Set<string>();
      parentSet.add(task.id);
      this.tasksByParent.set(task.parentTaskId, parentSet);
    }
  }

  private removeFromIndex(task: Task): void {
    this.tasksByStatus.get(task.status)?.delete(task.id);
    if (task.assigneeAgentId) {
      this.tasksByAgent.get(task.assigneeAgentId)?.delete(task.id);
    }
    if (task.parentTaskId) {
      this.tasksByParent.get(task.parentTaskId)?.delete(task.id);
    }
  }

  updateStatus(taskId: string, newStatus: TaskStatus): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    this.removeFromIndex(task);
    task.status = newStatus;
    if (newStatus === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date().toISOString();
    }
    if (newStatus === 'completed' || newStatus === 'failed') {
      task.completedAt = new Date().toISOString();
    }
    this.addToIndex(task);
  }

  assign(taskId: string, agentId: string | null): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    this.removeFromIndex(task);
    task.assigneeAgentId = agentId;
    if (agentId) {
      task.status = 'assigned';
    } else {
      task.status = 'pending';
    }
    this.addToIndex(task);
  }

  get(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAll(): Task[] {
    return Array.from(this.tasks.values());
  }

  getByStatus(status: TaskStatus): Task[] {
    const ids = this.tasksByStatus.get(status);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.tasks.get(id))
      .filter((t): t is Task => t !== undefined);
  }

  getByAgent(agentId: string): Task[] {
    const ids = this.tasksByAgent.get(agentId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.tasks.get(id))
      .filter((t): t is Task => t !== undefined);
  }

  getSubtasks(parentTaskId: string): Task[] {
    const ids = this.tasksByParent.get(parentTaskId);
    if (!ids) return [];
    return Array.from(ids)
      .map((id) => this.tasks.get(id))
      .filter((t): t is Task => t !== undefined);
  }

  getReadyTasks(): Task[] {
    return this.getByStatus('pending').filter((task) => {
      // All dependencies must be completed
      return task.dependencies.every((depId) => {
        const dep = this.tasks.get(depId);
        return dep?.status === 'completed';
      });
    });
  }

  getBlockedTasks(): Task[] {
    return this.getByStatus('pending').filter((task) => {
      return task.dependencies.some((depId) => {
        const dep = this.tasks.get(depId);
        return dep?.status === 'failed' || dep?.status === 'blocked';
      });
    });
  }

  delete(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;
    this.removeFromIndex(task);
    this.tasks.delete(taskId);
    return true;
  }
}
