import db from '../db/connection';

export interface TaskInput {
    standup_id: number;
    description: string;
    status?: 'planned' | 'completed' | 'blocked' | 'cancelled';
}

export interface TaskRecord {
    id: number;
    standup_id: number;
    description: string;
    status: string;
    created_at: string;
    completed_at: string | null;
}

export function addTask(input: TaskInput): TaskRecord {
    const stmt = db.prepare(`
        INSERT INTO tasks (standup_id, description, status)
        VALUES (?, ?, ?)
        RETURNING *
    `);
    return stmt.get(input.standup_id, input.description, input.status || 'planned') as TaskRecord;
}

export function completeTask(taskId: number): void {
    const stmt = db.prepare(`
        UPDATE tasks 
        SET status = 'completed', completed_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `);
    stmt.run(taskId);
}

export function getTasksByStandup(standupId: number): TaskRecord[] {
    const stmt = db.prepare('SELECT * FROM tasks WHERE standup_id = ?');
    return stmt.all(standupId) as TaskRecord[];
}

export function getTasksByDateRange(startDate: string, endDate: string): TaskRecord[] {
    const stmt = db.prepare(`
        SELECT t.* FROM tasks t
        JOIN standups s ON t.standup_id = s.id
        WHERE s.date BETWEEN ? AND ?
    `);
    return stmt.all(startDate, endDate) as TaskRecord[];
}

export function getCompletionRate(startDate: string, endDate: string): { total: number; completed: number; rate: number } {
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
        FROM tasks t
        JOIN standups s ON t.standup_id = s.id
        WHERE s.date BETWEEN ? AND ?
    `);
    const result = stmt.get(startDate, endDate) as { total: number; completed: number };
    return {
        total: result.total,
        completed: result.completed,
        rate: result.total > 0 ? Math.round((result.completed / result.total) * 100) : 0
    };
}
