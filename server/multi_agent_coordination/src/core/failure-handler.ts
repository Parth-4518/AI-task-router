import type { Task, FailureEvent } from '../types.js';

export class FailureHandler {
  private failures: FailureEvent[] = [];
  private recoveryStrategies = new Map<string, (event: FailureEvent) => boolean>();

  record(event: FailureEvent): void {
    this.failures.push(event);
  }

  handleTimeout(taskId: string, agentId: string): void {
    const event: FailureEvent = {
      id: crypto.randomUUID(),
      taskId,
      agentId,
      error: `Task ${taskId} timed out on agent ${agentId}`,
      errorType: 'timeout',
      recoverable: true,
      recoveryStrategy: 'reassign',
      retryCount: this.getRetryCount(taskId),
      maxRetries: 3,
      timestamp: new Date().toISOString(),
    };
    this.record(event);
    this.attemptRecovery(event);
  }

  handleCrash(taskId: string, agentId: string, error: string): void {
    const event: FailureEvent = {
      id: crypto.randomUUID(),
      taskId,
      agentId,
      error,
      errorType: 'crash',
      recoverable: true,
      recoveryStrategy: 'restart_agent',
      retryCount: this.getRetryCount(taskId),
      maxRetries: 2,
      timestamp: new Date().toISOString(),
    };
    this.record(event);
    this.attemptRecovery(event);
  }

  handleDependencyFailure(taskId: string, failedDependencyId: string): void {
    const event: FailureEvent = {
      id: crypto.randomUUID(),
      taskId,
      agentId: 'orchestrator',
      error: `Dependency ${failedDependencyId} failed for task ${taskId}`,
      errorType: 'dependency_failure',
      recoverable: false,
      recoveryStrategy: null,
      retryCount: 0,
      maxRetries: 0,
      timestamp: new Date().toISOString(),
    };
    this.record(event);
  }

  registerRecoveryStrategy(
    name: string,
    strategy: (event: FailureEvent) => boolean
  ): void {
    this.recoveryStrategies.set(name, strategy);
  }

  attemptRecovery(event: FailureEvent): boolean {
    if (!event.recoverable) return false;
    if (event.retryCount >= event.maxRetries) return false;

    const strategy = event.recoveryStrategy
      ? this.recoveryStrategies.get(event.recoveryStrategy)
      : null;

    if (strategy) {
      return strategy(event);
    }

    return false;
  }

  getFailuresForTask(taskId: string): FailureEvent[] {
    return this.failures.filter((f) => f.taskId === taskId);
  }

  getTopBlockers(limit: number): string[] {
    const blockerCounts = new Map<string, number>();
    for (const f of this.failures) {
      const key = `${f.errorType}: ${f.error}`;
      blockerCounts.set(key, (blockerCounts.get(key) ?? 0) + 1);
    }
    return Array.from(blockerCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([key]) => key);
  }

  private getRetryCount(taskId: string): number {
    return this.failures.filter((f) => f.taskId === taskId).length;
  }
}
