# TEC-8: AI-Native Notion Operating System — Architecture Document

**Date:** 2026-05-21
**Author:** CEO Agent

---

## 1. System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    Paperclip Control Plane                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Agent     │  │    Board    │  │   AI-Native Notion  │  │
│  │  Adapters   │  │     UI      │  │   Operating System  │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                    │             │
│         └────────────────┴────────────────────┘             │
│                          │                                  │
│                   ┌──────┴──────┐                          │
│                   │  REST API   │                          │
│                   │  /api/...   │                          │
│                   └──────┬──────┘                          │
│                          │                                  │
│                   ┌──────┴──────┐                          │
│                   │   Drizzle   │                          │
│                   │   PGlite    │                          │
│                   └─────────────┘                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Module Breakdown

### 2.1 Database Layer (`packages/db`)

New tables (company-scoped):

```typescript
// workspaces.ts
export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// projects.ts
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  workspaceId: uuid("workspace_id").references(() => workspaces.id),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// goals.ts (roadmap items)
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  description: text("description"),
  targetDate: timestamp("target_date", { withTimezone: true }),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// sprints.ts
export const sprints = pgTable("sprints", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  name: text("name").notNull(),
  startDate: timestamp("start_date", { withTimezone: true }).notNull(),
  endDate: timestamp("end_date", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("planning"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// sprint_issues.ts (junction)
export const sprintIssues = pgTable("sprint_issues", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  sprintId: uuid("sprint_id").notNull().references(() => sprints.id),
  issueId: uuid("issue_id").notNull().references(() => issues.id),
  addedAt: timestamp("added_at", { withTimezone: true }).defaultNow(),
});

// memory_entries.ts (engineering memory)
export const memoryEntries = pgTable("memory_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  projectId: uuid("project_id").references(() => projects.id),
  issueId: uuid("issue_id").references(() => issues.id),
  type: text("type").notNull(), // "adr", "postmortem", "learning", "decision"
  title: text("title").notNull(),
  content: text("content").notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// documents.ts (wiki pages)
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").notNull().references(() => companies.id),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  content: text("content").notNull(),
  parentId: uuid("parent_id").references(() => documents.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
```

### 2.2 Issue Table Extensions

Extend existing `issues` table with:

```typescript
// Add to existing issues schema:
projectId: uuid("project_id").references(() => projects.id),
goalId: uuid("goal_id").references(() => goals.id),
type: text("type").notNull().default("task"), // task, bug, story, epic, adr
estimatedHours: integer("estimated_hours"),
actualHours: integer("actual_hours"),
dueDate: timestamp("due_date", { withTimezone: true }),
```

---

## 3. API Layer (`server/`)

### 3.1 Route Structure

```
server/src/routes/notion-os/
├── index.ts           # route registration
├── workspaces.ts      # /api/companies/:cid/workspaces
├── projects.ts        # /api/companies/:cid/projects
├── goals.ts           # /api/companies/:cid/goals
├── sprints.ts         # /api/companies/:cid/sprints
├── memory.ts          # /api/companies/:cid/memory
├── documents.ts       # /api/companies/:cid/documents
└── summaries.ts       # /api/companies/:cid/summaries
```

### 3.2 Middleware

- `requireCompanyAccess` — verify actor belongs to company
- `requireAgentOrBoard` — allow both agent API keys and board sessions
- `logActivity` — write to activity_logs table on mutations

### 3.3 Service Layer

```
server/src/services/notion-os/
├── workspaceService.ts
├── projectService.ts
├── goalService.ts
├── sprintService.ts
├── memoryService.ts
├── documentService.ts
└── summaryService.ts   # AI summary generation
```

---

## 4. UI Layer (`ui/`)

### 4.1 Route Structure

```
ui/src/pages/notion-os/
├── BoardPage.tsx       # /notion-os/board — Kanban view
├── RoadmapPage.tsx     # /notion-os/roadmap — Gantt timeline
├── SprintPage.tsx      # /notion-os/sprints — Sprint management
├── MemoryPage.tsx      # /notion-os/memory — Knowledge base
├── DocumentPage.tsx    # /notion-os/docs — Wiki editor
└── SummaryPage.tsx     # /notion-os/summaries — AI reports
```

### 4.2 Components

```
ui/src/components/notion-os/
├── KanbanBoard.tsx
├── KanbanCard.tsx
├── GanttChart.tsx
├── SprintHeader.tsx
├── BurndownChart.tsx
├── MemorySearch.tsx
├── MarkdownEditor.tsx
├── IssueTypeBadge.tsx
└── PriorityBadge.tsx
```

### 4.3 Navigation

Add "Notion OS" section to sidebar with:
- Board
- Roadmap
- Sprints
- Memory
- Docs
- Summaries

---

## 5. AI Summary Service

### 5.1 Standup Summary

```typescript
async function generateStandupSummary(companyId: string, date: Date) {
  // 1. Fetch all issues updated in last 24h
  // 2. Group by assignee
  // 3. For each assignee:
  //    - List completed items
  //    - List in-progress items
  //    - Identify blockers
  // 4. Return structured summary
}
```

### 5.2 Memory Suggestion

```typescript
async function suggestMemoryEntries(issueId: string) {
  // 1. Read issue title, description, comments
  // 2. Extract key decisions, learnings, pitfalls
  // 3. Check for similar existing memory entries
  // 4. Propose new memory entries with confidence scores
}
```

### 5.3 Roadmap Forecast

```typescript
async function forecastGoalCompletion(goalId: string) {
  // 1. Fetch all issues under goal
  // 2. Calculate average velocity from closed sprints
  // 3. Estimate completion date based on remaining work
  // 4. Identify risks (blockers, overdue items)
}
```

---

## 6. Security & Permissions

1. **Company Scoping:** All queries filter by `company_id`
2. **Agent Isolation:** Agents can only access their own company's data
3. **Activity Logging:** All mutations logged with actor and timestamp
4. **No Cross-Company Leakage:** Enforced at DB query level, not just route level

---

## 7. Performance

1. **Indexes:**
   - `issues(company_id, status)`
   - `issues(company_id, assignee_agent_id)`
   - `issues(company_id, sprint_id)`
   - `issues(company_id, goal_id)`
   - `memory_entries(company_id, type)`
   - `documents(company_id, project_id, slug)`

2. **Caching:**
   - AI summaries cached for 1 hour
   - Board state cached for 5 minutes
   - Memory search results cached for 10 minutes

3. **Pagination:**
   - All list endpoints paginated (default 50, max 200)
   - Cursor-based for real-time feeds

---

## 8. Migration Strategy

1. **Phase 1:** Add new columns to existing `issues` table (nullable, no breaking change)
2. **Phase 2:** Create new tables (workspaces, projects, goals, sprints, memory, documents)
3. **Phase 3:** Backfill existing issues with default project/workspace if needed
4. **Phase 4:** Update UI to use new schema
5. **Phase 5:** Deprecate old flat issue-only views

---

## 9. Testing Strategy

1. **Unit:** Service layer functions with mocked DB
2. **Integration:** API endpoints with test database
3. **E2E:** Board drag-and-drop, sprint creation, memory search
4. **AI:** Summary generation quality evaluated against human-written summaries

---

## 10. Files Created

- `/home/parth/paperclip/server/projects/tec-8-notion-os/DESIGN.md` — Product design
- `/home/parth/paperclip/server/projects/tec-8-notion-os/ARCHITECTURE.md` — Technical architecture
