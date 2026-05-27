# TEC-9: Multi-Agent Coordination Framework — Design Document

**Date:** 2026-05-21
**Author:** CEO Agent
**Status:** In Progress

---

## 1. Vision

Build a multi-agent coordination system where specialized AI agents collaborate on engineering workflows within the Paperclip ecosystem. The framework enables autonomous delegation, progress tracking, duplicate work prevention, shared memory, and execution reporting.

---

## 2. Agent Roles

### 2.1 Planner Agent
- Breaks epics into actionable issues
- Assigns priorities and estimates
- Creates sprint plans
- Identifies dependencies and blockers

### 2.2 Documentation Agent
- Writes and maintains technical docs
- Generates ADRs from decisions
- Updates wiki pages
- Creates onboarding guides

### 2.3 QA Agent
- Reviews code and test coverage
- Creates test plans
- Validates acceptance criteria
- Reports bugs with reproduction steps

### 2.4 Research Agent
- Investigates technical spikes
- Evaluates libraries and tools
- Produces comparison matrices
- Summarizes findings for team

### 2.5 Review Agent
- Performs code review
- Checks against style guides
- Validates PR descriptions
- Ensures checklist compliance

### 2.6 CEO Agent (Orchestrator)
- Monitors all agent activity
- Resolves conflicts
- Rebalances workload
- Reports to human stakeholders

---

## 3. Core Workflows

### 3.1 Task Delegation Flow

```
Human/Board creates Epic
    ↓
Planner Agent decomposes into Issues
    ↓
CEO Agent assigns Issues to specialized Agents
    ↓
Agent accepts → status: in_progress
    ↓
Agent works → posts updates → creates work products
    ↓
Agent marks done → Review Agent validates
    ↓
CEO Agent confirms completion → closes Issue
```

### 3.2 Duplicate Work Prevention

1. Before creating a new issue, search existing issues by title similarity
2. Check memory entries for related work
3. Use vector similarity on issue descriptions
4. Flag potential duplicates to CEO Agent for approval

### 3.3 Shared Memory Flow

```
Agent completes Issue
    ↓
System prompts: "What should other agents remember?"
    ↓
Agent extracts key learnings/decisions
    ↓
Memory Entry created (tagged: agent, project, issue)
    ↓
Indexed for semantic search
    ↓
Future agents query memory before starting work
```

### 3.4 Failure Handling Flow

```
Agent encounters error
    ↓
Retry with exponential backoff (max 3)
    ↓
Still failing → escalate to CEO Agent
    ↓
CEO Agent decides:
    - Reassign to different agent
    - Break into smaller sub-tasks
    - Escalate to human
    - Cancel and document
```

---

## 4. Communication Patterns

### 4.1 Agent-to-Agent Messages

Stored in `agent_messages` table:
- `fromAgentId`, `toAgentId`
- `issueId` (context)
- `messageType`: `delegate`, `question`, `update`, `blocker`, `handoff`
- `content`
- `readAt`, `createdAt`

### 4.2 Broadcast Channels

- `#general` — company-wide announcements
- `#project-{id}` — project-specific coordination
- `#sprint-{id}` — sprint daily updates
- `#alerts` — failures and blockers

### 4.3 Human Notification Rules

- Critical blocker → immediate notification
- Sprint completion → summary email
- Agent failure after retries → immediate notification
- Daily digest → async summary

---

## 5. Orchestration Logic

### 5.1 Workload Balancing

```typescript
function assignIssue(issue: Issue): Agent {
  // 1. Find agents with relevant skills
  const candidates = agents.filter(a => a.skills.includes(issue.type));
  
  // 2. Filter by availability (open issue count < capacity)
  const available = candidates.filter(a => a.openIssues < a.capacity);
  
  // 3. Score by:
  //    - Skill match depth (1-10)
  //    - Current workload (inverse)
  //    - Past success rate on similar issues
  //    - Recent activity (avoid cold starts)
  
  // 4. Return highest scored agent
}
```

### 5.2 Dependency Resolution

```
Issue A blocks Issue B
    ↓
B cannot start until A is done
    ↓
When A completes, auto-notify B's assignee
    ↓
If A is blocked, propagate blocker to all downstream
```

### 5.3 Sprint Auto-Planning

```
Planner Agent:
  1. Fetch all backlog issues
  2. Filter by priority (high first)
  3. Respect dependencies (blocked items excluded)
  4. Sum estimates, respect team capacity
  5. Create sprint with selected issues
  6. Assign owners based on workload balancing
```

---

## 6. Observability

### 6.1 Agent Performance Metrics

- Issues completed / sprint
- Average resolution time
- Rework rate (issues reopened)
- Blocker resolution time
- Memory contributions

### 6.2 System Health

- Agent heartbeat status
- Queue depth per agent
- Error rate by agent
- API latency
- Memory search performance

### 6.3 Execution Reports

Daily report includes:
- What each agent worked on
- Completed issues
- Blockers and resolutions
- Memory entries created
- Issues created for next sprint

---

## 7. Data Schema

### 7.1 New Tables

```sql
-- agent_profiles
id uuid primary key
company_id uuid references companies
name text not null
role text not null -- planner, docs, qa, research, review, ceo
skills text[] not null
capacity integer not null default 5 -- max concurrent issues
status text not null default 'active'
created_at timestamp

-- agent_messages
id uuid primary key
company_id uuid references companies
from_agent_id uuid references agents
to_agent_id uuid references agents
issue_id uuid references issues
message_type text not null
content text not null
read_at timestamp
created_at timestamp

-- agent_assignments (junction with metadata)
id uuid primary key
company_id uuid references companies
agent_id uuid references agents
issue_id uuid references issues
assigned_by text -- 'ceo', 'human', 'auto'
assigned_at timestamp
completed_at timestamp

-- coordination_events
id uuid primary key
company_id uuid references companies
event_type text not null -- 'delegation', 'escalation', 'reassignment', 'sprint_plan'
from_agent_id uuid
to_agent_id uuid
issue_id uuid
details jsonb
created_at timestamp
```

### 7.2 Issue Extensions

```sql
-- Add to issues table:
coordination_group_id uuid -- for related issues
estimated_complexity integer -- 1-10
created_by_agent_id uuid -- which agent created this
```

---

## 8. API Design

### 8.1 Agent Management

```
GET    /api/companies/{cid}/agents
POST   /api/companies/{cid}/agents
GET    /api/companies/{cid}/agents/{aid}
PATCH  /api/companies/{cid}/agents/{aid}
DELETE /api/companies/{cid}/agents/{aid}
```

### 8.2 Delegation

```
POST /api/companies/{cid}/delegate
  Body: { issueId: string, preferredAgentRole?: string }
  Response: { assignedAgentId: string, confidence: number }
```

### 8.3 Messaging

```
GET    /api/companies/{cid}/agents/{aid}/messages
POST   /api/companies/{cid}/agents/{aid}/messages
PATCH  /api/companies/{cid}/messages/{mid}/read
```

### 8.4 Coordination

```
POST /api/companies/{cid}/coordination/sprint-plan
POST /api/companies/{cid}/coordination/rebalance
GET  /api/companies/{cid}/coordination/report?date=
```

### 8.5 Memory (Shared)

```
GET  /api/companies/{cid}/memory?agentId=&projectId=
POST /api/companies/{cid}/memory
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `agent_profiles` table
- [ ] Create `agent_messages` table
- [ ] Create `coordination_events` table
- [ ] API routes for agent CRUD
- [ ] Basic delegation endpoint

### Phase 2: Communication (Week 2)
- [ ] Agent messaging system
- [ ] Broadcast channels
- [ ] Read receipts
- [ ] Email/notification integration

### Phase 3: Intelligence (Week 3)
- [ ] Workload balancing algorithm
- [ ] Duplicate detection
- [ ] Sprint auto-planning
- [ ] Dependency resolution

### Phase 4: Observability (Week 4)
- [ ] Performance metrics
- [ ] Execution reports
- [ ] Health dashboard
- [ ] Human notification rules

---

## 10. Integration with TEC-8 (Notion OS)

The Multi-Agent Framework is a consumer of the Notion OS:
- Agents create and update issues via Notion OS API
- Shared memory uses Notion OS memory entries
- Sprint planning uses Notion OS sprint data
- Execution reports are stored as Notion OS documents

---

## 11. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent loops (A delegates to B, B back to A) | High | Track delegation depth, max 3 levels |
| Runaway agent creation | High | Human approval for new agent creation |
| Message spam | Medium | Rate limiting, batching, digest mode |
| Skill mismatch | Medium | Confidence threshold before auto-assign |
| Shared memory pollution | Medium | Memory review by CEO agent before indexing |

---

## 12. Success Criteria

- [ ] 5 specialized agent roles defined and configurable
- [ ] Issues auto-assigned with >80% confidence
- [ ] Duplicate work detected before creation
- [ ] Agents communicate via structured messages
- [ ] Daily execution report generated automatically
- [ ] Human notified only for critical events
- [ ] All coordination logged and auditable
