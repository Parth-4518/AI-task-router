/**
 * Workflow automation definitions.
 * Each workflow is a pure function that operates on stores and optionally triggers side effects (Notion sync, AI summaries).
 */

import { TaskStore } from '../modules/tasks';
import { SprintStore } from '../modules/sprints';
import { RoadmapStore } from '../modules/roadmap';
import { BugStore } from '../modules/bugs';
import { MemoryStore } from '../modules/memory';
import { DocStore } from '../modules/docs';
import { AISummarizer } from '../ai';
import { NotionClient } from '../integrations';

export interface WorkflowContext {
  tasks: TaskStore;
  sprints: SprintStore;
  roadmap: RoadmapStore;
  bugs: BugStore;
  memory: MemoryStore;
  docs: DocStore;
  ai: AISummarizer;
  notion?: NotionClient;
}

/** When a sprint is started, move all linked todo tasks to in_progress. */
export function startSprintWorkflow(ctx: WorkflowContext, sprintId: string): number {
  const sprint = ctx.sprints.get(sprintId);
  if (!sprint) return 0;
  ctx.sprints.update(sprintId, { status: 'active' });
  let moved = 0;
  for (const taskId of sprint.taskIds) {
    const task = ctx.tasks.get(taskId);
    if (task && task.status === 'todo') {
      ctx.tasks.update(taskId, { status: 'in_progress' });
      moved++;
    }
  }
  return moved;
}

/** When a task is marked done, update roadmap progress and generate a summary. */
export async function completeTaskWorkflow(ctx: WorkflowContext, taskId: string): Promise<{ summaryId?: string; roadmapUpdated: boolean }> {
  const task = ctx.tasks.get(taskId);
  if (!task) return { roadmapUpdated: false };

  ctx.tasks.update(taskId, { status: 'done' });

  // Update roadmap progress if linked
  let roadmapUpdated = false;
  if (task.roadmapItemId) {
    const roadmapItem = ctx.roadmap.get(task.roadmapItemId);
    if (roadmapItem) {
      const linkedTasks = ctx.tasks.list({}).filter(t => t.roadmapItemId === task.roadmapItemId);
      const doneCount = linkedTasks.filter(t => t.status === 'done').length;
      const progress = linkedTasks.length > 0 ? Math.round((doneCount / linkedTasks.length) * 100) : 0;
      ctx.roadmap.update(task.roadmapItemId, { progressPercent: progress });
      roadmapUpdated = true;
    }
  }

  // Generate AI summary
  const summary = await ctx.ai.summarizeTask(task);
  return { summaryId: summary.id, roadmapUpdated };
}

/** Daily standup: summarize active sprint + open critical bugs. */
export async function dailyStandupWorkflow(ctx: WorkflowContext): Promise<{ sprintSummaryId?: string; criticalBugCount: number }> {
  const activeSprint = ctx.sprints.active();
  let sprintSummaryId: string | undefined;
  if (activeSprint) {
    const sprintTasks = ctx.tasks.list({ sprintId: activeSprint.id });
    const summary = await ctx.ai.summarizeSprint(activeSprint, sprintTasks);
    sprintSummaryId = summary.id;
  }
  const criticalBugs = ctx.bugs.criticalOpen();
  return { sprintSummaryId, criticalBugCount: criticalBugs.length };
}

/** Archive a sprint and move unfinished tasks back to backlog. */
export function closeSprintWorkflow(ctx: WorkflowContext, sprintId: string): number {
  const sprint = ctx.sprints.get(sprintId);
  if (!sprint) return 0;
  ctx.sprints.update(sprintId, { status: 'closed' });
  let moved = 0;
  for (const taskId of sprint.taskIds) {
    const task = ctx.tasks.get(taskId);
    if (task && task.status !== 'done' && task.status !== 'cancelled') {
      ctx.tasks.update(taskId, { status: 'backlog', sprintId: undefined });
      moved++;
    }
  }
  return moved;
}
