# TEC-9: Multi-Agent Coordination Framework — Implementation Plan

**Date:** 2026-05-21
**Author:** CEO Agent

---

## Phase 1: Foundation (Database + Agent Management)

### Week 1, Day 1-2: Schema
- [ ] Create `agent_profiles` table with role, skills, capacity, status
- [ ] Create `agent_messages` table with message types
- [ ] Create `coordination_events` table for audit trail
- [ ] Create `agent_metrics` table for performance tracking
- [ ] Export from `packages/db/src/schema/index.ts`
- [ ] Generate migration: `pnpm db:generate`
- [ ] Run typecheck

### Week 1, Day 3-4: API Routes
- [ ] `GET/POST /api/companies/:cid/agents`
- [ ] `GET/PATCH/DELETE /api/companies/:cid/agents/:aid`
- [ ] `GET /api/companies/:cid/agents/:aid/messages`
- [ ] `POST /api/companies/:cid/agents/:aid/messages`
- [ ] Company access middleware on all routes
- [ ] Activity logging on mutations

### Week 1, Day 5: Testing
- [ ] Integration tests for agent CRUD
- [ ] Verify company scoping
- [ ] Run `pnpm test:run`

---

## Phase 2: Communication (Messaging + Notifications)

### Week 2, Day 1-2: Message System
- [ ] Implement message creation and retrieval
- [ ] Read receipts (`PATCH /messages/:mid/read`)
- [ ] Unread count endpoint
- [ ] Broadcast channel support (`toAgentId: null`)

### Week 2, Day 3-4: Notifications
- [ ] Blocker alerts → immediate CEO notification
- [ ] Daily digest generation
- [ ] Email/Slack webhook integration (future)
- [ ] Notification preferences per agent

### Week 2, Day 5: UI
- [ ] `MessagesPage.tsx` — agent inbox
- [ ] `MessageThread.tsx` — conversation view
- [ ] Real-time polling for new messages

---

## Phase 3: Intelligence (Delegation + Planning)

### Week 3, Day 1-2: Delegation Service
- [ ] Implement `DelegationService.findBestAgent()`
- [ ] Skill matching algorithm
- [ ] Workload scoring
- [ ] Past success rate weighting
- [ ] `POST /api/companies/:cid/delegate` endpoint

### Week 3, Day 3: Sprint Auto-Planning
- [ ] `SprintPlanner.planSprint()`
- [ ] Backlog prioritization
- [ ] Dependency resolution
- [ ] Capacity-based selection
- [ ] `POST /api/companies/:cid/coordination/sprint-plan`

### Week 3, Day 4: Duplicate Detection
- [ ] Text similarity on issue titles
- [ ] Memory entry cross-reference
- [ ] Flag potential duplicates before creation
- [ ] `POST /api/companies/:cid/coordination/duplicate-check`

### Week 3, Day 5: Failure Handling
- [ ] Retry with exponential backoff
- [ ] Escalation to CEO agent
- [ ] Circuit breaker pattern
- [ ] Delegation loop detection

---

## Phase 4: Observability (Metrics + Reports)

### Week 4, Day 1-2: Metrics Collection
- [ ] Hourly background job for agent metrics
- [ ] Issues completed, resolution time, rework rate
- [ ] `GET /api/companies/:cid/agents/:aid/metrics`
- [ ] Metrics aggregation by sprint

### Week 4, Day 3: Health Dashboard
- [ ] `CoordinationPage.tsx` with health indicators
- [ ] Agent online/offline status
- [ ] Queue depth visualization
- [ ] Error rate charts

### Week 4, Day 4: Execution Reports
- [ ] Daily report generation
- [ ] `GET /api/companies/:cid/coordination/report?date=`
- [ ] `ReportsPage.tsx`
- [ ] Export to PDF/Markdown

### Week 4, Day 5: Final Testing
- [ ] Full typecheck
- [ ] Full test suite
- [ ] Build verification
- [ ] Update documentation

---

## Deliverables

1. **Database:** 4 new tables (agent_profiles, agent_messages, coordination_events, agent_metrics)
2. **API:** 15+ new endpoints
3. **UI:** 6 new pages with 7+ components
4. **Services:** Delegation, SprintPlanner, MessageRouter, MetricsCollector
5. **Documentation:** DESIGN.md, ARCHITECTURE.md, API docs

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Agent loops | High | Max delegation depth 3, cycle detection |
| Message spam | Medium | Rate limiting, digest mode |
| Poor delegation | Medium | Confidence threshold, CEO override |
| Metrics overhead | Low | Hourly batch collection, not real-time |

---

## Success Criteria

- [ ] 5+ agent roles configurable
- [ ] Auto-assignment confidence >80%
- [ ] Duplicate detection before creation
- [ ] Structured agent messaging
- [ ] Daily reports auto-generated
- [ ] Human notified for critical events only
- [ ] Full audit trail of coordination
