import type { HeartbeatRun, Agent, Issue } from "@paperclipai/shared";
import { api } from "./client";
import { heartbeatsApi } from "./heartbeats";
import { agentsApi } from "./agents";
import { issuesApi } from "./issues";
import { costsApi } from "./costs";

export interface AgentPerformanceMetrics {
  agentId: string;
  agentName: string;
  agentStatus: string;
  adapterType: string;
  tasksCompleted: number;
  tasksFailed: number;
  tasksInProgress: number;
  tasksBlocked: number;
  tasksTodo: number;
  avgTaskTimeMs: number | null;
  successRate: number;
  failureRate: number;
  totalRuns: number;
  costCents: number;
  inputTokens: number;
  outputTokens: number;
  lastActiveAt: string | null;
}

export interface DailyAgentActivity {
  date: string;
  agentId: string;
  agentName: string;
  runs: number;
  succeeded: number;
  failed: number;
  costCents: number;
}

export interface AgentAnalyticsSummary {
  agents: AgentPerformanceMetrics[];
  dailyActivity: DailyAgentActivity[];
  companyTotals: {
    totalRuns: number;
    totalTasksCompleted: number;
    totalCostCents: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    overallSuccessRate: number;
  };
}

function getLast30Days(): string[] {
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (29 - i));
    return d.toISOString().slice(0, 10);
  });
}

function formatDateKey(date: string | Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export const analyticsApi = {
  summary: async (companyId: string, from?: string, to?: string): Promise<AgentAnalyticsSummary> => {
    const [agents, runs, issues, costs] = await Promise.all([
      agentsApi.list(companyId),
      heartbeatsApi.list(companyId, undefined, 1000),
      issuesApi.list(companyId, { status: undefined, limit: 1000 }),
      costsApi.byAgent(companyId, from, to),
    ]);

    const agentMap = new Map<string, Agent>();
    for (const a of agents) agentMap.set(a.id, a);

    const costMap = new Map<string, typeof costs[0]>();
    for (const c of costs) costMap.set(c.agentId, c);

    // Group issues by assignee agent
    const agentIssues = new Map<string, Issue[]>();
    for (const i of issues) {
      if (i.assigneeAgentId) {
        const list = agentIssues.get(i.assigneeAgentId) ?? [];
        list.push(i);
        agentIssues.set(i.assigneeAgentId, list);
      }
    }

    // Group runs by agent
    const agentRuns = new Map<string, HeartbeatRun[]>();
    for (const r of runs) {
      const list = agentRuns.get(r.agentId) ?? [];
      list.push(r);
      agentRuns.set(r.agentId, list);
    }

    // Build per-agent metrics
    const performanceMetrics: AgentPerformanceMetrics[] = agents.map((agent) => {
      const runsForAgent = agentRuns.get(agent.id) ?? [];
      const issuesForAgent = agentIssues.get(agent.id) ?? [];
      const costForAgent = costMap.get(agent.id);

      const completedIssues = issuesForAgent.filter((i) => i.status === "done").length;
      const failedIssues = issuesForAgent.filter((i) => i.status === "cancelled").length;
      const inProgressIssues = issuesForAgent.filter((i) => i.status === "in_progress").length;
      const blockedIssues = issuesForAgent.filter((i) => i.status === "blocked").length;
      const todoIssues = issuesForAgent.filter((i) => i.status === "todo").length;

      const succeededRuns = runsForAgent.filter((r) => r.status === "succeeded").length;
      const failedRuns = runsForAgent.filter((r) => r.status === "failed" || r.status === "timed_out").length;
      const totalRuns = runsForAgent.length;
      const successRate = totalRuns > 0 ? succeededRuns / totalRuns : 0;
      const failureRate = totalRuns > 0 ? failedRuns / totalRuns : 0;

      // Calculate average task time from runs with startedAt and finishedAt
      const completedRuns = runsForAgent.filter((r) => r.startedAt && r.finishedAt);
      const avgTaskTimeMs =
        completedRuns.length > 0
          ? completedRuns.reduce((sum, r) => {
              const start = new Date(r.startedAt!).getTime();
              const end = new Date(r.finishedAt!).getTime();
              return sum + (end - start);
            }, 0) / completedRuns.length
          : null;

      const lastActiveAt =
        runsForAgent.length > 0
          ? runsForAgent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]!.createdAt
          : null;

      return {
        agentId: agent.id,
        agentName: agent.name,
        agentStatus: agent.status,
        adapterType: agent.adapterType,
        tasksCompleted: completedIssues,
        tasksFailed: failedIssues,
        tasksInProgress: inProgressIssues,
        tasksBlocked: blockedIssues,
        tasksTodo: todoIssues,
        avgTaskTimeMs,
        successRate,
        failureRate,
        totalRuns,
        costCents: costForAgent?.costCents ?? 0,
        inputTokens: costForAgent?.inputTokens ?? 0,
        outputTokens: costForAgent?.outputTokens ?? 0,
        lastActiveAt: lastActiveAt ? new Date(lastActiveAt).toISOString() : null,
      };
    });

    // Build daily activity
    const days = getLast30Days();
    const dailyActivity: DailyAgentActivity[] = [];

    for (const day of days) {
      for (const agent of agents) {
        const runsForAgent = agentRuns.get(agent.id) ?? [];
        const dayRuns = runsForAgent.filter((r) => formatDateKey(r.createdAt) === day);
        const succeeded = dayRuns.filter((r) => r.status === "succeeded").length;
        const failed = dayRuns.filter((r) => r.status === "failed" || r.status === "timed_out").length;

        // Cost attribution: approximate by dividing agent's total cost evenly across days with runs
        const costForAgent = costMap.get(agent.id);
        const dayCost =
          costForAgent && dayRuns.length > 0
            ? Math.round(costForAgent.costCents / Math.max(runsForAgent.length, 1) * dayRuns.length)
            : 0;

        dailyActivity.push({
          date: day,
          agentId: agent.id,
          agentName: agent.name,
          runs: dayRuns.length,
          succeeded,
          failed,
          costCents: dayCost,
        });
      }
    }

    const companyTotals = {
      totalRuns: runs.length,
      totalTasksCompleted: issues.filter((i) => i.status === "done").length,
      totalCostCents: costs.reduce((sum, c) => sum + c.costCents, 0),
      totalInputTokens: costs.reduce((sum, c) => sum + c.inputTokens, 0),
      totalOutputTokens: costs.reduce((sum, c) => sum + c.outputTokens, 0),
      overallSuccessRate: runs.length > 0 ? runs.filter((r) => r.status === "succeeded").length / runs.length : 0,
    };

    return {
      agents: performanceMetrics,
      dailyActivity,
      companyTotals,
    };
  },
};
