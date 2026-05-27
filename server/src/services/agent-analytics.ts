import { and, eq, gte, sql, inArray } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { agents, heartbeatRuns, issues, costEvents } from "@paperclipai/db";

export interface AgentPerformance {
  agentId: string;
  agentName: string;
  agentRole: string | null;
  adapterType: string;
  status: string;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksBlocked: number;
  tasksTotal: number;
  avgTaskDurationMinutes: number | null;
  runsTotal: number;
  runsSucceeded: number;
  runsFailed: number;
  runsTimedOut: number;
  successRatePercent: number;
  costCents: number;
  lastHeartbeatAt: string | null;
}

export interface AgentDailyActivity {
  date: string;
  succeeded: number;
  failed: number;
  timedOut: number;
  other: number;
  total: number;
}

export interface AgentTrendPoint {
  date: string;
  tasksCompleted: number;
  tasksCreated: number;
  runsTotal: number;
  costCents: number;
}

export interface AgentDetailAnalytics {
  agentId: string;
  agentName: string;
  agentRole: string | null;
  adapterType: string;
  status: string;
  dailyActivity: AgentDailyActivity[];
  trend: AgentTrendPoint[];
  tasksByStatus: Record<string, number>;
  tasksByPriority: Record<string, number>;
}

export interface AgentAnalyticsSummary {
  companyId: string;
  dateRange: { from: string; to: string };
  agents: AgentPerformance[];
  agentDetails: AgentDetailAnalytics[];
  aggregate: {
    totalTasksCompleted: number;
    totalTasksInProgress: number;
    totalTasksBlocked: number;
    totalRuns: number;
    overallSuccessRatePercent: number;
    totalCostCents: number;
  };
}

function getRecentUtcDateKeys(endDate: Date, days: number): string[] {
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate.getTime() - i * 24 * 60 * 60 * 1000);
    keys.push(d.toISOString().slice(0, 10));
  }
  return keys;
}

export function agentAnalyticsService(db: Db) {
  return {
    summary: async (companyId: string, from?: Date, to?: Date): Promise<AgentAnalyticsSummary> => {
      const now = to ? new Date(to) : new Date();
      const start = from ? new Date(from) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const agentRows = await db
        .select()
        .from(agents)
        .where(eq(agents.companyId, companyId));

      const agentIds = agentRows.map((a) => a.id);
      if (agentIds.length === 0) {
        return {
          companyId,
          dateRange: { from: start.toISOString(), to: now.toISOString() },
          agents: [],
          agentDetails: [],
          aggregate: {
            totalTasksCompleted: 0,
            totalTasksInProgress: 0,
            totalTasksBlocked: 0,
            totalRuns: 0,
            overallSuccessRatePercent: 0,
            totalCostCents: 0,
          },
        };
      }

      // Issue stats per agent
      const issueRows = await db
        .select({
          assigneeAgentId: issues.assigneeAgentId,
          status: issues.status,
          count: sql<number>`count(*)::int`,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, companyId),
            inArray(issues.assigneeAgentId, agentIds),
          ),
        )
        .groupBy(issues.assigneeAgentId, issues.status);

      // Heartbeat runs per agent in date range
      const runRows = await db
        .select({
          agentId: heartbeatRuns.agentId,
          status: heartbeatRuns.status,
          count: sql<number>`count(*)::int`,
        })
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            inArray(heartbeatRuns.agentId, agentIds),
            gte(heartbeatRuns.createdAt, start),
          ),
        )
        .groupBy(heartbeatRuns.agentId, heartbeatRuns.status);

      // Cost per agent in date range
      const costRows = await db
        .select({
          agentId: costEvents.agentId,
          totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int`,
        })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.companyId, companyId),
            inArray(costEvents.agentId, agentIds),
            gte(costEvents.occurredAt, start),
          ),
        )
        .groupBy(costEvents.agentId);

      // Average task duration for completed tasks
      const durationRows = await db
        .select({
          assigneeAgentId: issues.assigneeAgentId,
          avgMinutes: sql<number>`coalesce(avg(extract(epoch from (${issues.completedAt} - ${issues.startedAt})) / 60), 0)::int`,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, companyId),
            inArray(issues.assigneeAgentId, agentIds),
            eq(issues.status, "done"),
            sql`${issues.startedAt} is not null and ${issues.completedAt} is not null`,
          ),
        )
        .groupBy(issues.assigneeAgentId);

      // Build maps
      const issueMap = new Map<string, Map<string, number>>();
      for (const row of issueRows) {
        if (!row.assigneeAgentId) continue;
        if (!issueMap.has(row.assigneeAgentId)) issueMap.set(row.assigneeAgentId, new Map());
        issueMap.get(row.assigneeAgentId)!.set(row.status, Number(row.count));
      }

      const runMap = new Map<string, Map<string, number>>();
      for (const row of runRows) {
        if (!runMap.has(row.agentId)) runMap.set(row.agentId, new Map());
        runMap.get(row.agentId)!.set(row.status, Number(row.count));
      }

      const costMap = new Map<string, number>();
      for (const row of costRows) {
        costMap.set(row.agentId!, Number(row.totalCents));
      }

      const durationMap = new Map<string, number | null>();
      for (const row of durationRows) {
        if (!row.assigneeAgentId) continue;
        durationMap.set(row.assigneeAgentId, Number(row.avgMinutes) || null);
      }

      let totalTasksCompleted = 0;
      let totalTasksInProgress = 0;
      let totalTasksBlocked = 0;
      let totalRuns = 0;
      let totalSucceeded = 0;
      let totalCostCents = 0;

      const agentPerformances: AgentPerformance[] = agentRows.map((agent) => {
        const iMap = issueMap.get(agent.id) ?? new Map();
        const rMap = runMap.get(agent.id) ?? new Map();
        const completed = iMap.get("done") ?? 0;
        const inProgress = iMap.get("in_progress") ?? 0;
        const blocked = iMap.get("blocked") ?? 0;
        const totalTasks = Array.from(iMap.values()).reduce((a, b) => a + b, 0);

        const runsSucceeded = rMap.get("succeeded") ?? 0;
        const runsFailed = rMap.get("failed") ?? 0;
        const runsTimedOut = rMap.get("timed_out") ?? 0;
        const runsTotal = Array.from(rMap.values()).reduce((a, b) => a + b, 0);
        const successRate = runsTotal > 0 ? Math.round((runsSucceeded / runsTotal) * 100) : 0;

        const cost = costMap.get(agent.id) ?? 0;

        totalTasksCompleted += completed;
        totalTasksInProgress += inProgress;
        totalTasksBlocked += blocked;
        totalRuns += runsTotal;
        totalSucceeded += runsSucceeded;
        totalCostCents += cost;

        return {
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.role,
          adapterType: agent.adapterType,
          status: agent.status,
          tasksCompleted: completed,
          tasksInProgress: inProgress,
          tasksBlocked: blocked,
          tasksTotal: totalTasks,
          avgTaskDurationMinutes: durationMap.get(agent.id) ?? null,
          runsTotal,
          runsSucceeded,
          runsFailed,
          runsTimedOut,
          successRatePercent: successRate,
          costCents: cost,
          lastHeartbeatAt: agent.lastHeartbeatAt ? new Date(agent.lastHeartbeatAt).toISOString() : null,
        };
      });

      // Build per-agent time-series data
      const dayKeys = getRecentUtcDateKeys(now, 14);
      const runActivityDayExpr = sql<string>`to_char(${heartbeatRuns.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
      const runActivityRows = await db
        .select({
          agentId: heartbeatRuns.agentId,
          date: runActivityDayExpr,
          status: heartbeatRuns.status,
          count: sql<number>`count(*)::int`,
        })
        .from(heartbeatRuns)
        .where(
          and(
            eq(heartbeatRuns.companyId, companyId),
            inArray(heartbeatRuns.agentId, agentIds),
            gte(heartbeatRuns.createdAt, start),
          ),
        )
        .groupBy(heartbeatRuns.agentId, runActivityDayExpr, heartbeatRuns.status);

      const costDayExpr = sql<string>`to_char(${costEvents.occurredAt} at time zone 'UTC', 'YYYY-MM-DD')`;
      const costActivityRows = await db
        .select({
          agentId: costEvents.agentId,
          date: costDayExpr,
          totalCents: sql<number>`coalesce(sum(${costEvents.costCents}), 0)::int`,
        })
        .from(costEvents)
        .where(
          and(
            eq(costEvents.companyId, companyId),
            inArray(costEvents.agentId, agentIds),
            gte(costEvents.occurredAt, start),
          ),
        )
        .groupBy(costEvents.agentId, costDayExpr);

      const issueCreatedDayExpr = sql<string>`to_char(${issues.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
      const issueCreatedRows = await db
        .select({
          assigneeAgentId: issues.assigneeAgentId,
          date: issueCreatedDayExpr,
          count: sql<number>`count(*)::int`,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, companyId),
            inArray(issues.assigneeAgentId, agentIds),
            gte(issues.createdAt, start),
          ),
        )
        .groupBy(issues.assigneeAgentId, issueCreatedDayExpr);

      const issueCompletedDayExpr = sql<string>`to_char(${issues.completedAt} at time zone 'UTC', 'YYYY-MM-DD')`;
      const issueCompletedRows = await db
        .select({
          assigneeAgentId: issues.assigneeAgentId,
          date: issueCompletedDayExpr,
          count: sql<number>`count(*)::int`,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, companyId),
            inArray(issues.assigneeAgentId, agentIds),
            eq(issues.status, "done"),
            gte(issues.completedAt, start),
            sql`${issues.completedAt} is not null`,
          ),
        )
        .groupBy(issues.assigneeAgentId, issueCompletedDayExpr);

      // Build maps for time-series
      const runActivityMap = new Map<string, Map<string, Map<string, number>>>();
      for (const row of runActivityRows) {
        if (!runActivityMap.has(row.agentId)) runActivityMap.set(row.agentId, new Map());
        const dateMap = runActivityMap.get(row.agentId)!;
        if (!dateMap.has(row.date)) dateMap.set(row.date, new Map());
        dateMap.get(row.date)!.set(row.status, Number(row.count));
      }

      const costActivityMap = new Map<string, Map<string, number>>();
      for (const row of costActivityRows) {
        if (!costActivityMap.has(row.agentId)) costActivityMap.set(row.agentId, new Map());
        costActivityMap.get(row.agentId)!.set(row.date, Number(row.totalCents));
      }

      const issueCreatedMap = new Map<string, Map<string, number>>();
      for (const row of issueCreatedRows) {
        if (!row.assigneeAgentId) continue;
        if (!issueCreatedMap.has(row.assigneeAgentId)) issueCreatedMap.set(row.assigneeAgentId, new Map());
        issueCreatedMap.get(row.assigneeAgentId)!.set(row.date, Number(row.count));
      }

      const issueCompletedMap = new Map<string, Map<string, number>>();
      for (const row of issueCompletedRows) {
        if (!row.assigneeAgentId) continue;
        if (!issueCompletedMap.has(row.assigneeAgentId)) issueCompletedMap.set(row.assigneeAgentId, new Map());
        issueCompletedMap.get(row.assigneeAgentId)!.set(row.date, Number(row.count));
      }

      const agentDetails: AgentDetailAnalytics[] = agentRows.map((agent) => {
        const raMap = runActivityMap.get(agent.id) ?? new Map();
        const cMap = costActivityMap.get(agent.id) ?? new Map();
        const icMap = issueCreatedMap.get(agent.id) ?? new Map();
        const icdMap = issueCompletedMap.get(agent.id) ?? new Map();
        const iMap = issueMap.get(agent.id) ?? new Map();

        // Tasks by status and priority for this agent
        const tasksByStatus: Record<string, number> = {};
        for (const [status, count] of iMap) {
          tasksByStatus[status] = count;
        }

        const dailyActivity: AgentDailyActivity[] = dayKeys.map((date) => {
          const statusMap = raMap.get(date) ?? new Map<string, number>();
          const succeeded = statusMap.get("succeeded") ?? 0;
          const failed = statusMap.get("failed") ?? 0;
          const timedOut = statusMap.get("timed_out") ?? 0;
          const other = Array.from(statusMap.entries())
            .filter(([s, _c]) => s !== "succeeded" && s !== "failed" && s !== "timed_out")
            .reduce((a, [_s, c]) => a + c, 0);
          return {
            date,
            succeeded,
            failed,
            timedOut,
            other,
            total: succeeded + failed + timedOut + other,
          };
        });

        const trend: AgentTrendPoint[] = dayKeys.map((date) => ({
          date,
          tasksCompleted: icdMap.get(date) ?? 0,
          tasksCreated: icMap.get(date) ?? 0,
          runsTotal: (raMap.get(date) ?? new Map<string, number>()).get("total") ??
            Array.from((raMap.get(date) ?? new Map<string, number>()).values()).reduce((a, b) => a + b, 0),
          costCents: cMap.get(date) ?? 0,
        }));

        return {
          agentId: agent.id,
          agentName: agent.name,
          agentRole: agent.role,
          adapterType: agent.adapterType,
          status: agent.status,
          dailyActivity,
          trend,
          tasksByStatus,
          tasksByPriority: {}, // Will be populated below
        };
      });

      // Tasks by priority per agent
      const priorityRows = await db
        .select({
          assigneeAgentId: issues.assigneeAgentId,
          priority: issues.priority,
          count: sql<number>`count(*)::int`,
        })
        .from(issues)
        .where(
          and(
            eq(issues.companyId, companyId),
            inArray(issues.assigneeAgentId, agentIds),
          ),
        )
        .groupBy(issues.assigneeAgentId, issues.priority);

      const priorityMap = new Map<string, Map<string, number>>();
      for (const row of priorityRows) {
        if (!row.assigneeAgentId) continue;
        if (!priorityMap.has(row.assigneeAgentId)) priorityMap.set(row.assigneeAgentId, new Map());
        priorityMap.get(row.assigneeAgentId)!.set(row.priority, Number(row.count));
      }

      for (const detail of agentDetails) {
        const pMap = priorityMap.get(detail.agentId) ?? new Map();
        const tasksByPriority: Record<string, number> = {};
        for (const [priority, count] of pMap) {
          tasksByPriority[priority] = count;
        }
        detail.tasksByPriority = tasksByPriority;
      }

      const overallSuccessRate = totalRuns > 0 ? Math.round((totalSucceeded / totalRuns) * 100) : 0;

      return {
        companyId,
        dateRange: { from: start.toISOString(), to: now.toISOString() },
        agents: agentPerformances,
        agentDetails,
        aggregate: {
          totalTasksCompleted,
          totalTasksInProgress,
          totalTasksBlocked,
          totalRuns,
          overallSuccessRatePercent: overallSuccessRate,
          totalCostCents,
        },
      };
    },
  };
}
