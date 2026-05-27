# TEC-8: AI-Native Notion Operating System — Implementation Plan

**Date:** 2026-05-21
**Author:** CEO Agent

---

## Phase 1: Foundation (Database + Core API)

### Week 1, Day 1-2: Schema Extensions
- [ ] Add `projectId`, `goalId`, `type`, `estimatedHours`, `actualHours`, `dueDate` to `issues` table
- [ ] Create `workspaces`, `projects`, `goals`, `sprints`, `sprintIssues`, `memoryEntries`, `documents` tables
- [ ] Export new tables from `packages/db/src/schema/index.ts`
- [ ] Generate migration: `pnpm db:generate`
- [ ] Run typecheck: `pnpm -r typecheck`

### Week 1, Day 3-4: API Routes
- [ ] Implement `workspaces.ts` routes (CRUD)
- [ ] Implement `projects.ts` routes (CRUD)
- [ ] Implement `goals.ts` routes (CRUD)
- [ ] Implement `sprints.ts` routes (CRUD + add/remove issues)
- [ ] Implement `memory.ts` routes (CRUD + search)
- [ ] Implement `documents.ts` routes (CRUD + revisions)
- [ ] Add company access middleware to all routes
- [ ] Add activity logging on mutations

### Week 1, Day 5: Testing
- [ ] Write integration tests for new routes
- [ ] Verify company scoping enforcement
- [ ] Run `pnpm test:run`

---

## Phase 2: Intelligence (AI Summaries + Memory)

### Week 2, Day 1-2: Summary Service
- [ ] Implement `summaryService.ts` with standup generation
- [ ] Add `/api/companies/:cid/summaries/standup` endpoint
- [ ] Add `/api/companies/:cid/summaries/weekly` endpoint
- [ ] Cache summaries for 1 hour

### Week 2, Day 3-4: Memory Intelligence
- [ ] Implement semantic search over memory entries (start with Postgres text search)
- [ ] Add `/api/companies/:cid/memory/search?q=` endpoint
- [ ] Implement memory suggestion from closed issues
- [ ] Link memory entries to issues in UI

### Week 2, Day 5: Testing
- [ ] Test summary generation with sample data
- [ ] Test memory search accuracy
- [ ] Run `pnpm test:run`

---

## Phase 3: UI (Board + Roadmap + Sprints)

### Week 3, Day 1-2: Board View
- [ ] Create `BoardPage.tsx` with Kanban layout
- [ ] Implement `KanbanBoard.tsx` and `KanbanCard.tsx`
- [ ] Add drag-and-drop for status changes
- [ ] Add filters (assignee, sprint, priority, label)

### Week 3, Day 3: Roadmap View
- [ ] Create `RoadmapPage.tsx` with timeline
- [ ] Implement `GanttChart.tsx` component
- [ ] Show goals as groups, issues as bars
- [ ] Display dependency arrows

### Week 3, Day 4: Sprint View
- [ ] Create `SprintPage.tsx`
- [ ] Implement `SprintHeader.tsx` with dates and velocity
- [ ] Add `BurndownChart.tsx` component
- [ ] Show capacity per assignee

### Week 3, Day 5: Memory + Docs Views
- [ ] Create `MemoryPage.tsx` with search
- [ ] Create `DocumentPage.tsx` with Markdown editor
- [ ] Add navigation sidebar entries

---

## Phase 4: Polish + Integration

### Week 4, Day 1-2: Dark/Light Mode
- [ ] Implement theme toggle (TEC-10)
- [ ] Ensure all Notion OS components respect theme
- [ ] Test contrast ratios

### Week 4, Day 3: Analytics
- [ ] Create analytics dashboard (TEC-11)
- [ ] Agent performance metrics
- [ ] Velocity trends
- [ ] Issue resolution time histograms

### Week 4, Day 4: Multi-Agent Coordination
- [ ] Integrate with TEC-9 multi-agent framework
- [ ] Agents can create/update issues via API
- [ ] Agent assignments shown in board

### Week 4, Day 5: Final Testing
- [ ] Full typecheck: `pnpm -r typecheck`
- [ ] Full test suite: `pnpm test:run`
- [ ] Build verification: `pnpm build`
- [ ] Update documentation

---

## Deliverables

1. **Database Schema:** Extended `issues` table + 7 new tables
2. **API:** 30+ new endpoints under `/api/companies/:cid/`
3. **UI:** 6 new pages with 10+ components
4. **AI Service:** Standup, weekly, and risk summaries
5. **Documentation:** DESIGN.md, ARCHITECTURE.md, API docs

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration breaks existing issues | High | Add nullable columns only; no renames |
| AI summaries are low quality | Medium | Start with rule-based; enhance with LLM |
| UI performance with many issues | Medium | Pagination, virtualization, caching |
| Scope creep | High | Strict phase gates; defer non-essential features |

---

## Success Criteria

- [ ] All new routes return correct data with company scoping
- [ ] Board view renders 100+ issues without lag
- [ ] Standup summary generated in < 5 seconds
- [ ] Memory search returns relevant results in < 2 seconds
- [ ] All tests pass
- [ ] Build succeeds
