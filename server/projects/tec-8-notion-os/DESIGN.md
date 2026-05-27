# TEC-8: AI-Native Notion Operating System — Design Document

**Date:** 2026-05-21
**Author:** CEO Agent
**Status:** In Progress

---

## 1. Vision

Build an AI-assisted Notion-like operating system for engineering teams that lives inside the Paperclip ecosystem. It reduces context switching, improves operational visibility, and supports asynchronous workflows by combining structured data (tasks, roadmaps, bugs) with AI-generated insights and summaries.

---

## 2. Core Modules

### 2.1 Task Tracking
- Issues as first-class entities (already exist in Paperclip)
- Enhanced with tags, estimates, dependencies, and time tracking
- Kanban board view with swimlanes

### 2.2 Roadmap Management
- Timeline/Gantt view of issues grouped by goals/milestones
- Dependency chains visualized
- Progress bars and forecasting

### 2.3 Bug Tracking
- Dedicated bug issue type with severity/priority matrix
- Reproduction steps template
- Linked test cases and regression tracking

### 2.4 Engineering Memory
- Persistent knowledge base of decisions, ADRs, and learnings
- Auto-linked to issues and code changes
- Searchable via semantic/vector search

### 2.5 Documentation Workflows
- Wiki-style pages with Markdown support
- Auto-generated docs from code comments
- Change notifications and review workflows

### 2.6 Sprint Management
- Sprint creation, planning, and retrospectives
- Velocity tracking and burndown charts
- Capacity planning per team member

### 2.7 AI-Generated Summaries
- Daily standup summaries from issue activity
- Weekly progress reports
- Risk and blocker detection
- Action item extraction from discussions

---

## 3. Data Schema

### 3.1 Core Entities

```
Workspace (company-scoped)
  └── Project
       ├── Goal (roadmap item)
       │    └── Milestone
       ├── Issue (task/bug/story)
       │    ├── Comment
       │    ├── TimeEntry
       │    └── Attachment
       ├── Sprint
       │    └── SprintIssue
       ├── Document (wiki page)
       │    └── DocumentRevision
       └── MemoryEntry (engineering memory)
```

### 3.2 Issue Types
- `task` — general work item
- `bug` — defect tracking
- `story` — user-facing feature
- `epic` — large initiative (parent of stories/tasks)
- `adr` — architecture decision record

### 3.3 Issue Fields
- `identifier` — human-readable ID (e.g., TEC-8)
- `title`, `description`
- `status` — backlog, todo, in_progress, in_review, done, cancelled
- `priority` — low, medium, high, critical
- `type` — task, bug, story, epic, adr
- `assigneeAgentId` / `assigneeUserId`
- `sprintId`, `goalId`, `parentId`
- `estimatedHours`, `actualHours`
- `labels` — array of strings
- `blockedBy` / `blocks` — dependency graph
- `dueDate`, `startedAt`, `completedAt`

---

## 4. Workflows

### 4.1 Issue Lifecycle
```
backlog → todo → in_progress → in_review → done
   ↑___________↓______________↓____________↓
   (can move to cancelled from any state)
```

### 4.2 Sprint Planning
1. Create sprint with start/end dates
2. Pull issues from backlog into sprint
3. Assign owners and estimates
4. Lock sprint — track velocity

### 4.3 Daily Standup (AI-Assisted)
1. Collect all issue updates from last 24h
2. Group by assignee
3. Identify blockers and risks
4. Generate summary post to team channel

### 4.4 Engineering Memory Capture
1. When issue closed, prompt for key learnings
2. Auto-extract decisions from ADR issues
3. Index into searchable knowledge base
4. Surface relevant memory on new issue creation

---

## 5. API Design

### 5.1 Endpoints (company-scoped)

```
GET    /api/companies/{cid}/workspaces
POST   /api/companies/{cid}/workspaces
GET    /api/companies/{cid}/workspaces/{wid}/projects
POST   /api/companies/{cid}/workspaces/{wid}/projects

GET    /api/companies/{cid}/projects/{pid}/issues
POST   /api/companies/{cid}/projects/{pid}/issues
GET    /api/companies/{cid}/issues/{id}
PATCH  /api/companies/{cid}/issues/{id}

GET    /api/companies/{cid}/projects/{pid}/sprints
POST   /api/companies/{cid}/projects/{pid}/sprints
POST   /api/companies/{cid}/sprints/{sid}/issues

GET    /api/companies/{cid}/projects/{pid}/documents
POST   /api/companies/{cid}/projects/{pid}/documents

GET    /api/companies/{cid}/memory
POST   /api/companies/{cid}/memory
GET    /api/companies/{cid}/memory/search?q={query}

POST   /api/companies/{cid}/summaries/standup
POST   /api/companies/{cid}/summaries/weekly
```

### 5.2 AI Summary Endpoints

```
POST /api/companies/{cid}/ai/summarize-issues
  Body: { issueIds: string[], format: "standup" | "weekly" | "risk" }

POST /api/companies/{cid}/ai/suggest-memory
  Body: { issueId: string }

POST /api/companies/{cid}/ai/roadmap-forecast
  Body: { goalId: string }
```

---

## 6. UI Views

### 6.1 Board View (Kanban)
- Columns by status
- Cards show issue identifier, title, assignee, priority, labels
- Drag-and-drop to change status
- Filter by assignee, sprint, label, priority

### 6.2 Roadmap View (Gantt)
- Timeline with goals as groups
- Issues as bars with duration
- Dependency arrows
- Progress shading

### 6.3 Sprint View
- Sprint header with dates, velocity, burndown
- Issue list with estimates vs actuals
- Capacity bar per assignee

### 6.4 Memory View
- Searchable knowledge base
- Categories: ADRs, Post-mortems, Learnings, Decisions
- Auto-suggested related memory when viewing issues

### 6.5 Document View
- Markdown editor with preview
- Version history sidebar
- Comment threads on sections

---

## 7. Integration Points

### 7.1 Paperclip Native
- Reuse existing issue system (TEC-8 builds on top)
- Agent assignments already supported
- Activity logging already exists
- Company scoping already enforced

### 7.2 External (Future)
- Notion API import/export
- GitHub Issues sync
- Slack notifications for summaries
- Calendar integration for sprint dates

---

## 8. Scalability Considerations

1. **Database:** Use existing Drizzle/PGlite setup. Add indexes on `status`, `assigneeAgentId`, `sprintId`, `goalId`.
2. **AI Summaries:** Cache generated summaries for 1 hour. Use background jobs for heavy generation.
3. **Search:** Start with Postgres text search, migrate to vector/semantic search when memory entries grow.
4. **Realtime:** Use Server-Sent Events or polling for board updates (WebSocket overkill for V1).

---

## 9. Implementation Phases

### Phase 1 — Foundation (Week 1)
- [ ] Extend issue schema with type, sprintId, goalId, estimatedHours, actualHours, dueDate
- [ ] Add Sprint and Goal tables
- [ ] API endpoints for CRUD
- [ ] Basic Kanban board UI

### Phase 2 — Intelligence (Week 2)
- [ ] AI summary generation endpoints
- [ ] Standup summary workflow
- [ ] Memory entry table and API
- [ ] Basic memory search

### Phase 3 — Polish (Week 3)
- [ ] Roadmap/Gantt view
- [ ] Sprint burndown charts
- [ ] Document/wiki system
- [ ] Dark/light mode (TEC-10)

### Phase 4 — Integration (Week 4)
- [ ] External integrations (Notion, GitHub)
- [ ] Advanced analytics (TEC-11)
- [ ] Performance optimizations

---

## 10. Open Questions

1. Should we reuse existing Paperclip issues table or create a new one?
2. What is the target UI framework — extend existing React UI or new module?
3. Do we need real-time collaboration or polling sufficient?
4. Should AI summaries be triggered automatically or on-demand?

---

## 11. Related Issues

- TEC-6 / TEC-12 — Engineering Memory System (overlaps with 2.4)
- TEC-7 — AI Standup + Productivity OS (overlaps with 2.7, 4.3)
- TEC-9 — Multi-Agent Coordination Framework (agents use this OS)
- TEC-10 — Dark/Light Mode Polish (UI requirement)
- TEC-11 — Agent Performance Analytics Page (reporting)
- TEC-15 / TEC-16 — AI Router API (routing to this OS)
