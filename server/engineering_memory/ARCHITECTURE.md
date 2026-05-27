# Engineering Memory System — Architecture

## Overview

A lightweight, file-based context tracker that captures engineering activity across sessions and generates "resume from here" summaries. Designed for solo developers and small teams who lose context between coding sessions.

## Core Principles

1. **Zero config by default** — works out of the box in any git repo
2. **File-based storage** — human-readable, git-ignorable, portable
3. **Passive tracking** — minimal explicit commands, mostly automatic
4. **Fast summaries** — generate context in <1 second

## Components

```
┌─────────────────────────────────────────────────────────────┐
│                      CLI Interface                          │
│  em status  em todo  em session start|end  em resume        │
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Engine (TypeScript/Node)                 │
│  • SessionTracker  • GitWatcher  • TodoManager  • Summarizer│
└─────────────────────────────────────────────────────────────┘
                              │
┌─────────────────────────────────────────────────────────────┐
│                    Storage Layer                            │
│  ~/.engineering-memory/          (global config + history)  │
│  ./.memory/                      (per-project snapshots)    │
└─────────────────────────────────────────────────────────────┘
```

## Data Models

### Session
```typescript
interface Session {
  id: string;           // uuid
  projectPath: string;  // absolute path
  branch: string;       // git branch at session start
  startedAt: ISO8601;
  endedAt?: ISO8601;
  todosCreated: Todo[];
  todosCompleted: Todo[];
  filesTouched: string[];  // from git diff --name-only
  commitCount: number;
  summary?: string;     // auto-generated at session end
}
```

### Todo
```typescript
interface Todo {
  id: string;
  text: string;
  status: 'active' | 'done' | 'dropped';
  createdAt: ISO8601;
  completedAt?: ISO8601;
  sessionId: string;
  tags: string[];
}
```

### Project Snapshot
```typescript
interface ProjectSnapshot {
  path: string;
  lastSessionAt: ISO8601;
  currentBranch: string;
  uncommittedFiles: string[];
  activeTodos: Todo[];
  recentCommits: { hash: string; message: string; date: ISO8601 }[];
}
```

## Workflows

### 1. Session Tracking (Automatic)
- On first `em` command in a project: detect git repo, record branch, start session
- On session end (explicit `em session end` or 30min inactivity): capture git diff stats, generate summary
- Store session in `~/.engineering-memory/sessions/YYYY-MM/`

### 2. Git Branch Tracking (Automatic)
- Every `em` command checks current branch
- If branch changed since last command: log branch switch, mark previous context

### 3. TODO Persistence (Explicit + Automatic)
- `em todo "fix the race condition"` → creates active todo
- `em todo done <id>` → marks complete
- Auto-detect TODO/FIXME comments in changed files? (v2)

### 4. Resume Summary (On Demand)
- `em resume` → generates:
  - Last session summary
  - Active todos
  - Current branch + uncommitted changes
  - Suggested next steps based on pattern

## Storage Layout

```
~/.engineering-memory/
  config.json
  sessions/
    2026-05/
      session_<uuid>.json
      session_<uuid>.json
  projects/
    <path-hash>.json      // snapshot per project

cd <any-git-repo>
.memory/
  .gitignore              // ignore everything in here
  local-todos.json        // todos you want colocated
```

## Technology Choices

| Concern        | Choice           | Rationale                          |
|----------------|------------------|------------------------------------|
| Language       | TypeScript/Node  | Same stack as Paperclip server     |
| CLI framework  | Commander.js     | Standard, lightweight              |
| Storage        | JSON files       | Human-readable, zero deps          |
| Git access     | simple-git       | Mature, promise-based              |
| IDs            | nanoid           | Short, unique, sortable            |
| Config dir     | env-paths        | XDG-compliant paths                |

## Design Decisions

1. **File-based over SQLite** — easier to inspect, backup, and version control
2. **Global + local storage** — global for cross-project history, local for team-shared context
3. **Passive over active** — most tracking happens automatically; explicit commands only for todos and session boundaries
4. **No cloud sync by default** — privacy-first; can add sync layer later
5. **Branch-aware** — context is tied to git branches because that's how developers think

## Milestones

| Milestone | Deliverable | Effort |
|-----------|-------------|--------|
| M1 | CLI scaffold + config/storage layer | 1h |
| M2 | Session tracking (start/end/auto) | 1h |
| M3 | Todo CRUD + persistence | 1h |
| M4 | Git integration (branch, diff, commits) | 1h |
| M5 | Resume summary generator | 1h |
| M6 | Polish, docs, install script | 1h |
