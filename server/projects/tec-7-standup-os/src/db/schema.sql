-- Standup responses table
CREATE TABLE IF NOT EXISTS standups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    yesterday TEXT,
    today TEXT,
    blockers TEXT,
    mood TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table (planned vs completed)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    standup_id INTEGER,
    description TEXT NOT NULL,
    status TEXT CHECK(status IN ('planned', 'completed', 'blocked', 'cancelled')) DEFAULT 'planned',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    FOREIGN KEY (standup_id) REFERENCES standups(id)
);

-- Blockers table
CREATE TABLE IF NOT EXISTS blockers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    standup_id INTEGER,
    description TEXT NOT NULL,
    category TEXT,
    resolved BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    FOREIGN KEY (standup_id) REFERENCES standups(id)
);

-- Weekly summaries table
CREATE TABLE IF NOT EXISTS summaries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    week_end TEXT NOT NULL,
    total_tasks INTEGER DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    blocked_tasks INTEGER DEFAULT 0,
    recurring_blockers TEXT,
    highlights TEXT,
    generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_standups_date ON standups(date);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_blockers_resolved ON blockers(resolved);
