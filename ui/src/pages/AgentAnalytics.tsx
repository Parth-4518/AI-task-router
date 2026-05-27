import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { analyticsApi, type AgentPerformanceMetrics } from "../api/analytics";
import { useCompany } from "../context/CompanyContext";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { queryKeys } from "../lib/queryKeys";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { ChartCard } from "../components/ActivityCharts";
import { formatCents, formatTokens, cn } from "../lib/utils";
import { timeAgo } from "../lib/timeAgo";
import { BarChart3, TrendingUp, Clock, DollarSign, Activity, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

function durationLabel(ms: number | null): string {
  if (ms === null) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}

function MetricTile({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "success" | "danger" | "warning";
}) {
  const toneClasses = {
    default: "text-foreground",
    success: "text-emerald-600",
    danger: "text-red-600",
    warning: "text-amber-600",
  };
  return (
    <div className="border border-border rounded-lg p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={cn("text-2xl font-semibold", toneClasses[tone])}>{value}</div>
    </div>
  );
}

function AgentCard({ agent }: { agent: AgentPerformanceMetrics }) {
  const statusColors: Record<string, string> = {
    idle: "bg-emerald-500",
    running: "bg-blue-500",
    paused: "bg-amber-500",
    error: "bg-red-500",
    terminated: "bg-neutral-500",
  };

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("h-2 w-2 rounded-full", statusColors[agent.agentStatus] ?? "bg-neutral-500")} />
          <h3 className="font-medium text-sm">{agent.agentName}</h3>
          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
            {agent.adapterType}
          </span>
        </div>
        <span className="text-xs text-muted-foreground">
          {agent.lastActiveAt ? timeAgo(agent.lastActiveAt) : "Never active"}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Tasks</div>
          <div className="text-sm font-medium">
            {agent.tasksCompleted} done · {agent.tasksInProgress} active
          </div>
          <div className="text-xs text-muted-foreground">
            {agent.tasksBlocked} blocked · {agent.tasksTodo} todo
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Success Rate</div>
          <div className={cn(
            "text-sm font-medium",
            agent.successRate >= 0.8 ? "text-emerald-600" : agent.successRate >= 0.5 ? "text-amber-600" : "text-red-600"
          )}>
            {agent.totalRuns > 0 ? `${Math.round(agent.successRate * 100)}%` : "—"}
          </div>
          <div className="text-xs text-muted-foreground">{agent.totalRuns} runs</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Avg Time</div>
          <div className="text-sm font-medium">{durationLabel(agent.avgTaskTimeMs)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Cost</div>
          <div className="text-sm font-medium">{formatCents(agent.costCents)}</div>
          <div className="text-xs text-muted-foreground">
            {formatTokens(agent.inputTokens + agent.outputTokens)} tokens
          </div>
        </div>
      </div>

      {/* Mini success/failure bar */}
      {agent.totalRuns > 0 && (
        <div className="flex h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-emerald-500"
            style={{ width: `${agent.successRate * 100}%` }}
          />
          <div
            className="bg-red-500"
            style={{ width: `${agent.failureRate * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}

function ActivityHeatmap({ dailyActivity }: { dailyActivity: { date: string; agentName: string; runs: number }[] }) {
  const agents = useMemo(() => {
    return [...new Set(dailyActivity.map((d) => d.agentName))];
  }, [dailyActivity]);

  const days = useMemo(() => {
    return [...new Set(dailyActivity.map((d) => d.date))].sort();
  }, [dailyActivity]);

  const maxRuns = useMemo(() => {
    return Math.max(...dailyActivity.map((d) => d.runs), 1);
  }, [dailyActivity]);

  const dataMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of dailyActivity) {
      map.set(`${d.date}|${d.agentName}`, d.runs);
    }
    return map;
  }, [dailyActivity]);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {days.map((day) => (
          <div key={day} className="flex-1 text-center">
            <span className="text-[9px] text-muted-foreground">
              {new Date(day + "T12:00:00").getMonth() + 1}/{new Date(day + "T12:00:00").getDate()}
            </span>
          </div>
        ))}
      </div>
      {agents.map((agent) => (
        <div key={agent} className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground w-20 truncate shrink-0">{agent}</span>
          {days.map((day) => {
            const runs = dataMap.get(`${day}|${agent}`) ?? 0;
            const intensity = runs / maxRuns;
            return (
              <div
                key={day}
                className="flex-1 aspect-square rounded-sm"
                style={{
                  backgroundColor: runs > 0
                    ? `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`
                    : "var(--shadow-tint-subtle)",
                }}
                title={`${agent} · ${day}: ${runs} runs`}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

function TrendChart({ dailyActivity }: { dailyActivity: { date: string; runs: number; succeeded: number; failed: number }[] }) {
  const days = useMemo(() => {
    return [...new Set(dailyActivity.map((d) => d.date))].sort();
  }, [dailyActivity]);

  const dayMap = useMemo(() => {
    const map = new Map<string, { runs: number; succeeded: number; failed: number }>();
    for (const d of dailyActivity) {
      const existing = map.get(d.date) ?? { runs: 0, succeeded: 0, failed: 0 };
      existing.runs += d.runs;
      existing.succeeded += d.succeeded;
      existing.failed += d.failed;
      map.set(d.date, existing);
    }
    return map;
  }, [dailyActivity]);

  const maxRuns = useMemo(() => {
    return Math.max(...Array.from(dayMap.values()).map((v) => v.runs), 1);
  }, [dayMap]);

  return (
    <div>
      <div className="flex items-end gap-[3px] h-20">
        {days.map((day) => {
          const entry = dayMap.get(day) ?? { runs: 0, succeeded: 0, failed: 0 };
          const heightPct = (entry.runs / maxRuns) * 100;
          return (
            <div key={day} className="flex-1 h-full flex flex-col justify-end" title={`${day}: ${entry.runs} runs`}>
              {entry.runs > 0 ? (
                <div className="flex flex-col-reverse gap-px overflow-hidden" style={{ height: `${heightPct}%`, minHeight: 2 }}>
                  {entry.succeeded > 0 && <div className="bg-emerald-500" style={{ flex: entry.succeeded }} />}
                  {entry.failed > 0 && <div className="bg-red-500" style={{ flex: entry.failed }} />}
                </div>
              ) : (
                <div className="bg-muted/30 rounded-sm" style={{ height: 2 }} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {days.map((day, i) => (
          <div key={day} className="flex-1 text-center">
            {(i === 0 || i === Math.floor(days.length / 2) || i === days.length - 1) ? (
              <span className="text-[9px] text-muted-foreground tabular-nums">
                {new Date(day + "T12:00:00").getMonth() + 1}/{new Date(day + "T12:00:00").getDate()}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

const DATE_RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "14", label: "Last 14 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

export function AgentAnalytics() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [dateRange, setDateRange] = useState("30");
  const [sortBy, setSortBy] = useState<"tasks" | "success" | "cost" | "runs">("tasks");

  useEffect(() => {
    setBreadcrumbs([{ label: "Agent Analytics" }]);
  }, [setBreadcrumbs]);

  const days = parseInt(dateRange, 10);
  const from = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString();
  }, [days]);

  const { data, isLoading, error } = useQuery({
    queryKey: [...queryKeys.analytics(selectedCompanyId!), { from, to: new Date().toISOString() }],
    queryFn: () => analyticsApi.summary(selectedCompanyId!, from),
    enabled: !!selectedCompanyId,
  });

  const sortedAgents = useMemo(() => {
    if (!data) return [];
    const agents = [...data.agents];
    switch (sortBy) {
      case "tasks":
        return agents.sort((a, b) => b.tasksCompleted - a.tasksCompleted);
      case "success":
        return agents.sort((a, b) => b.successRate - a.successRate);
      case "cost":
        return agents.sort((a, b) => b.costCents - a.costCents);
      case "runs":
        return agents.sort((a, b) => b.totalRuns - a.totalRuns);
      default:
        return agents;
    }
  }, [data, sortBy]);

  if (!selectedCompanyId) {
    return <EmptyState icon={BarChart3} message="Select a company to view agent analytics." />;
  }

  if (isLoading) {
    return <PageSkeleton variant="cards" />;
  }

  if (error) {
    return (
      <div className="p-4">
        <p className="text-sm text-destructive">Failed to load analytics: {error.message}</p>
      </div>
    );
  }

  if (!data || data.agents.length === 0) {
    return <EmptyState icon={BarChart3} message="No agent data available yet." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Agent Performance Analytics</h1>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="tasks">Tasks completed</SelectItem>
              <SelectItem value="success">Success rate</SelectItem>
              <SelectItem value="cost">Cost</SelectItem>
              <SelectItem value="runs">Total runs</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {DATE_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <MetricTile
          label="Total Runs"
          value={String(data.companyTotals.totalRuns)}
          icon={Activity}
        />
        <MetricTile
          label="Tasks Completed"
          value={String(data.companyTotals.totalTasksCompleted)}
          icon={CheckCircle}
          tone="success"
        />
        <MetricTile
          label="Success Rate"
          value={`${Math.round(data.companyTotals.overallSuccessRate * 100)}%`}
          icon={TrendingUp}
          tone={data.companyTotals.overallSuccessRate >= 0.8 ? "success" : data.companyTotals.overallSuccessRate >= 0.5 ? "warning" : "danger"}
        />
        <MetricTile
          label="Total Cost"
          value={formatCents(data.companyTotals.totalCostCents)}
          icon={DollarSign}
        />
        <MetricTile
          label="Input Tokens"
          value={formatTokens(data.companyTotals.totalInputTokens)}
          icon={BarChart3}
        />
        <MetricTile
          label="Output Tokens"
          value={formatTokens(data.companyTotals.totalOutputTokens)}
          icon={BarChart3}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Activity Trend" subtitle="Runs per day across all agents">
          <TrendChart dailyActivity={data.dailyActivity} />
        </ChartCard>
        <ChartCard title="Activity Heatmap" subtitle="Runs per agent per day">
          <ActivityHeatmap dailyActivity={data.dailyActivity} />
        </ChartCard>
      </div>

      {/* Agent cards */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Per-Agent Breakdown</h2>
        {sortedAgents.map((agent) => (
          <AgentCard key={agent.agentId} agent={agent} />
        ))}
      </div>
    </div>
  );
}
