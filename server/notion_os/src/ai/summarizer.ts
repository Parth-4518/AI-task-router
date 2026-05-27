import { Task, Sprint, RoadmapItem, AISummary } from '../schema';

/**
 * AI Summarizer interface.
 * Production implementation calls an LLM API (OpenAI, Anthropic, etc.).
 * This stub returns deterministic placeholders for scaffolding.
 */
export interface SummarizerConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
}

export class AISummarizer {
  private config: SummarizerConfig;

  constructor(config: SummarizerConfig) {
    this.config = config;
  }

  private now(): string {
    return new Date().toISOString();
  }

  private makeId(): string {
    return `summary-${Date.now()}`;
  }

  /** Summarize a single task. */
  async summarizeTask(task: Task): Promise<AISummary> {
    return {
      id: this.makeId(),
      scope: 'task',
      scopeId: task.id,
      summaryText: `Task "${task.title}" is ${task.status} with ${task.priority} priority.`,
      keyInsights: [`Status: ${task.status}`, `Priority: ${task.priority}`],
      risks: task.status === 'backlog' && task.priority === 'high' ? ['High-priority item not started'] : [],
      recommendations: task.status === 'backlog' ? ['Consider scheduling in next sprint'] : [],
      generatedBy: this.config.model ?? 'stub-model',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
  }

  /** Summarize a sprint. */
  async summarizeSprint(sprint: Sprint, tasks: Task[]): Promise<AISummary> {
    const doneCount = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;
    return {
      id: this.makeId(),
      scope: 'sprint',
      scopeId: sprint.id,
      summaryText: `Sprint "${sprint.name}" is ${progress}% complete (${doneCount}/${total} tasks).`,
      keyInsights: [`${doneCount} of ${total} tasks completed`, `Goal: ${sprint.goal}`],
      risks: progress < 50 && sprint.status === 'active' ? ['Sprint may not complete on time'] : [],
      recommendations: progress < 50 ? ['Re-prioritize remaining tasks', 'Consider scope reduction'] : [],
      generatedBy: this.config.model ?? 'stub-model',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
  }

  /** Summarize a roadmap item. */
  async summarizeRoadmap(item: RoadmapItem): Promise<AISummary> {
    return {
      id: this.makeId(),
      scope: 'roadmap',
      scopeId: item.id,
      summaryText: `Roadmap item "${item.title}" is ${item.progressPercent}% complete, targeting ${item.targetDate}.`,
      keyInsights: [`Progress: ${item.progressPercent}%`, `Timeframe: ${item.timeframe}`],
      risks: item.progressPercent < 30 && new Date(item.targetDate) < new Date(Date.now() + 7 * 86400000)
        ? ['At risk of missing target date']
        : [],
      recommendations: item.progressPercent < 30 ? ['Increase allocation or extend timeline'] : [],
      generatedBy: this.config.model ?? 'stub-model',
      createdAt: this.now(),
      updatedAt: this.now(),
    };
  }
}
