# TEC-9: Multi-Agent Coordination Framework — Architecture Document

**Date:** 2026-05-21
**Author:** CEO Agent

---

## 1. System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    Paperclip Control Plane                   │
│                                                              │
│  ┌─────────────┐    ┌─────────────────────────────────────┐  │
│  │   Human     │    │      Multi-Agent Coordination       │  │
│  │   Board     │◄──►│           Framework                  │  │
│  └─────────────┘    └─────────────────────────────────────┘  │
│                              │                               │
│         ┌────────────────────┼────────────────────┐          │
│         ▼                    ▼                    ▼          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │   Planner   │    │     QA      │    │    Docs     │     │
│  │   Agent     │    │   Agent     │    │   Agent     │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Research   │    │   Review    │    │    CEO      │     │
│  │   Agent     │    │   Agent     │    │  (Orchestr) │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Notion OS (TEC-8) — Shared Layer            ││
│  │   Issues · Sprints · Memory · Documents · Summaries      ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│                   ┌─────────────┐                            │
│                   │   REST API  │                            │
│                   │  /api/...   │                            │
│                   └──────┬──────┘                            │
│                          │                                   │
│                   ┌──────┴──────┐                            │
│                   │   Drizzle   │                            │
│                   │   PGlite    │                            │
│                   └─────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Database Layer

### 2.1 Agent Profiles

```typescript
// packages/db/src/schema/agentProfiles.ts
export const agentProfiles = pgTable("agent_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  role: text("role").notNull(), // planner, docs, qa, research, review, ceo
  skills: jsonb("skills").$type<string[]>().notNull().default([]),
  capacity: integer("capacity").notNull().default(5),
  status: text("status").notNull().default("active"), // active, paused, error
  adapterType: text("adapter_type"), // claude, codex, cursor, hermes
  modelProfile: jsonb("model_profile").$type<Record<string, any>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

### 2.2 Agent Messages

```typescript
// packages/db/src/schema/agentMessages.ts
export const agentMessages = pgTable("agent_messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  fromAgentId: uuid("from_agent_id").references(() => agentProfiles.id),
  toAgentId: uuid("to_agent_id").references(() => agentProfiles.id),
  issueId: uuid("issue_id").references(() => issues.id),
  messageType: text("message_type").notNull(), // delegate, question, update, blocker, handoff
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

### 2.3 Coordination Events

```typescript
// packages/db/src/schema/coordinationEvents.ts
export const coordinationEvents = pgTable("coordination_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  eventType: text("event_type").notNull(), // delegation, escalation, reassignment, sprint_plan, duplicate_detected
  fromAgentId: uuid("from_agent_id").references(() => agentProfiles.id),
  toAgentId: uuid("to_agent_id").references(() => agentProfiles.id),
  issueId: uuid("issue_id").references(() => issues.id),
  details: jsonb("details").$type<Record<string, any>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
```

### 2.4 Agent Performance Metrics

```typescript
// packages/db/src/schema/agentMetrics.ts
export const agentMetrics = pgTable("agent_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  agentId: uuid("agent_id").notNull().references(() => agentProfiles.id),
  sprintId: uuid("sprint_id").references(() => sprints.id),
  metricType: text("metric_type").notNull(), // issues_completed, avg_resolution_time, rework_rate, blocker_count
  value: integer("value").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow(),
});
```

---

## 3. API Layer

### 3.1 Route Structure

```
server/src/routes/multi-agent/
├── index.ts              # route registration
├── agents.ts             # /api/companies/:cid/agents
├── messages.ts           # /api/companies/:cid/messages
├── delegate.ts           # /api/companies/:cid/delegate
├── coordination.ts       # /api/companies/:cid/coordination
└── reports.ts            # /api/companies/:cid/reports
```

### 3.2 Agent CRUD

```typescript
// GET /api/companies/:cid/agents
// POST /api/companies/:cid/agents
// GET /api/companies/:cid/agents/:aid
// PATCH /api/companies/:cid/agents/:aid
// DELETE /api/companies/:cid/agents/:aid
```

### 3.3 Delegation Endpoint

```typescript
// POST /api/companies/:cid/delegate
interface DelegateRequest {
  issueId: string;
  preferredAgentRole?: string;
  excludeAgentIds?: string[];
}

interface DelegateResponse {
  assignedAgentId: string;
  confidence: number; // 0-1
  reasoning: string;
  alternativeAgents: { agentId: string; confidence: number }[];
}
```

### 3.4 Messaging

```typescript
// GET /api/companies/:cid/agents/:aid/messages?unreadOnly=true
// POST /api/companies/:cid/agents/:aid/messages
// PATCH /api/companies/:cid/messages/:mid/read
```

### 3.5 Coordination

```typescript
// POST /api/companies/:cid/coordination/sprint-plan
// POST /api/companies/:cid/coordination/rebalance
// GET /api/companies/:cid/coordination/health
// GET /api/companies/:cid/coordination/report?date=YYYY-MM-DD
```

---

## 4. Service Layer

### 4.1 Delegation Service

```typescript
class DelegationService {
  async findBestAgent(issue: Issue, options: DelegateOptions): Promise<AgentMatch> {
    // 1. Load all active agents for company
    const agents = await this.agentRepo.findActive(issue.companyId);
    
    // 2. Filter by role preference
    const candidates = options.preferredAgentRole
      ? agents.filter(a => a.role === options.preferredAgentRole)
      : agents;
    
    // 3. Filter by capacity
    const available = await this.filterByCapacity(candidates);
    
    // 4. Score each candidate
    const scored = await Promise.all(
      available.map(async agent => ({
        agent,
        score: await this.scoreAgent(agent, issue),
      }))
    );
    
    // 5. Return best match + alternatives
    scored.sort((a, b) => b.score - a.score);
    return {
      assignedAgentId: scored[0].agent.id,
      confidence: scored[0].score,
      reasoning: this.explainScore(scored[0]),
      alternativeAgents: scored.slice(1, 4).map(s => ({
        agentId: s.agent.id,
        confidence: s.score,
      })),
    };
  }
  
  private async scoreAgent(agent: AgentProfile, issue: Issue): Promise<number> {
    let score = 0;
    
    // Skill match (0-40 points)
    const skillOverlap = agent.skills.filter(s => 
      issue.title.toLowerCase().includes(s.toLowerCase()) ||
      issue.description.toLowerCase().includes(s.toLowerCase())
    ).length;
    score += Math.min(skillOverlap * 10, 40);
    
    // Workload (0-30 points) — lower workload = higher score
    const openIssues = await this.issueRepo.countOpenForAgent(agent.id);
    score += Math.max(30 - openIssues * 6, 0);
    
    // Past success rate (0-20 points)
    const successRate = await this.metricsRepo.getSuccessRate(agent.id);
    score += successRate * 20;
    
    // Recency bonus (0-10 points) — avoid cold starts
    const lastActive = await this.metricsRepo.getLastActive(agent.id);
    const hoursSince = (Date.now() - lastActive.getTime()) / 3600000;
    score += Math.max(10 - hoursSince * 0.5, 0);
    
    return Math.min(score / 100, 1);
  }
}
```

### 4.2 Message Router

```typescript
class MessageRouter {
  async route(message: AgentMessage): Promise<void> {
    // Store message
    await this.messageRepo.create(message);
    
    // If urgent, notify immediately
    if (message.messageType === 'blocker') {
      await this.notifyCEO(message);
    }
    
    // If delegation, trigger assignment flow
    if (message.messageType === 'delegate') {
      await this.delegationService.assign(message.issueId, message.toAgentId);
    }
    
    // Update unread count for recipient
    await this.updateUnreadCount(message.toAgentId);
  }
}
```

### 4.3 Sprint Planner

```typescript
class SprintPlanner {
  async planSprint(companyId: string, projectId: string): Promise<SprintPlan> {
    // 1. Fetch backlog
    const backlog = await this.issueRepo.findBacklog(companyId, projectId);
    
    // 2. Filter by priority
    const prioritized = backlog.sort((a, b) => 
      this.priorityWeight(b.priority) - this.priorityWeight(a.priority)
    );
    
    // 3. Respect dependencies
    const resolvable = this.filterResolvable(prioritized);
    
    // 4. Respect capacity
    const agents = await this.agentRepo.findActive(companyId);
    const totalCapacity = agents.reduce((sum, a) => sum + a.capacity, 0);
    
    // 5. Select issues fitting capacity
    const selected: Issue[] = [];
    let usedCapacity = 0;
    for (const issue of resolvable) {
      const estimate = issue.estimatedHours || 8;
      if (usedCapacity + estimate <= totalCapacity * 40) { // 40h per capacity unit
        selected.push(issue);
        usedCapacity += estimate;
      }
    }
    
    // 6. Assign owners
    const assignments = await Promise.all(
      selected.map(issue => this.delegationService.findBestAgent(issue))
    );
    
    return { sprintName: `Sprint ${new Date().toISOString().slice(0, 10)}`, issues: selected, assignments };
  }
}
```

---

## 5. UI Layer

### 5.1 Pages

```
ui/src/pages/multi-agent/
├── AgentsPage.tsx        # List and manage agents
├── AgentDetailPage.tsx   # Agent profile, skills, metrics
├── MessagesPage.tsx      # Inbox for agent messages
├── DelegationPage.tsx    # Manual delegation interface
├── CoordinationPage.tsx  # Health dashboard, rebalance
└── ReportsPage.tsx       # Execution reports, metrics
```

### 5.2 Components

```
ui/src/components/multi-agent/
├── AgentCard.tsx
├── AgentHealthIndicator.tsx
├── MessageThread.tsx
├── DelegationPanel.tsx
├── SprintPlanPreview.tsx
├── MetricsChart.tsx
└── CoordinationLog.tsx
```

---

## 6. Failure Handling

### 6.1 Agent Error Recovery

```
Agent fails on issue
  ├── Retry 1: immediate
  ├── Retry 2: after 30s
  ├── Retry 3: after 2min
  └── Still failing:
      ├── Escalate to CEO Agent
      ├── CEO decides: reassign / split / human / cancel
      └── Log coordination event
```

### 6.2 Loop Detection

```typescript
function detectDelegationLoop(issueId: string, history: string[]): boolean {
  // Max delegation depth: 3
  if (history.length > 3) return true;
  
  // Detect cycles
  const seen = new Set(history);
  if (seen.size < history.length) return true;
  
  return false;
}
```

### 6.3 Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private threshold = 5;
  private timeout = 300000; // 5min
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.failures >= this.threshold) {
      throw new Error('Circuit breaker open');
    }
    try {
      const result = await fn();
      this.failures = 0;
      return result;
    } catch (e) {
      this.failures++;
      throw e;
    }
  }
}
```

---

## 7. Observability

### 7.1 Metrics Collection

```typescript
// Background job runs every hour
async function collectMetrics(companyId: string) {
  const agents = await agentRepo.findActive(companyId);
  
  for (const agent of agents) {
    const completed = await issueRepo.countCompleted(agent.id, '24h');
    const avgTime = await issueRepo.avgResolutionTime(agent.id, '7d');
    const reopened = await issueRepo.countReopened(agent.id, '7d');
    
    await metricsRepo.insert({
      companyId,
      agentId: agent.id,
      metricType: 'issues_completed',
      value: completed,
    });
    
    await metricsRepo.insert({
      companyId,
      agentId: agent.id,
      metricType: 'avg_resolution_hours',
      value: avgTime,
    });
    
    await metricsRepo.insert({
      companyId,
      agentId: agent.id,
      metricType: 'rework_rate',
      value: reopened / Math.max(completed, 1),
    });
  }
}
```

### 7.2 Health Dashboard

- Agent online/offline status
- Queue depth per agent
- Error rate sparklines
- Delegation success rate
- Message backlog

---

## 8. Security

1. **Company Isolation:** All queries filter by `company_id`
2. **Agent Authentication:** Agents use API keys (existing `agent_api_keys` table)
3. **Message Privacy:** Agents can only read messages addressed to them (or broadcast)
4. **Delegation Approval:** High-confidence auto-assign; low-confidence requires CEO approval
5. **Audit Trail:** All coordination events logged immutably

---

## 9. Files Created

- `/home/parth/paperclip/server/projects/tec-9-multi-agent/DESIGN.md` — Product design
- `/home/parth/paperclip/server/projects/tec-9-multi-agent/ARCHITECTURE.md` — Technical architecture
