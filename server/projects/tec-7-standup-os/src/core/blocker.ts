import db from '../db/connection';

export interface BlockerInput {
    standup_id: number;
    description: string;
    category?: string;
}

export interface BlockerRecord {
    id: number;
    standup_id: number;
    description: string;
    category: string | null;
    resolved: boolean;
    created_at: string;
    resolved_at: string | null;
}

export function addBlocker(input: BlockerInput): BlockerRecord {
    const stmt = db.prepare(`
        INSERT INTO blockers (standup_id, description, category)
        VALUES (?, ?, ?)
        RETURNING *
    `);
    return stmt.get(input.standup_id, input.description, input.category || null) as BlockerRecord;
}

export function resolveBlocker(blockerId: number): void {
    const stmt = db.prepare(`
        UPDATE blockers 
        SET resolved = 1, resolved_at = CURRENT_TIMESTAMP 
        WHERE id = ?
    `);
    stmt.run(blockerId);
}

export function getUnresolvedBlockers(): BlockerRecord[] {
    const stmt = db.prepare('SELECT * FROM blockers WHERE resolved = 0 ORDER BY created_at DESC');
    return stmt.all() as BlockerRecord[];
}

export function getRecurringBlockers(days: number = 30): { description: string; count: number }[] {
    const stmt = db.prepare(`
        SELECT description, COUNT(*) as count
        FROM blockers
        WHERE created_at >= datetime('now', ?)
        GROUP BY description
        HAVING count > 1
        ORDER BY count DESC
    `);
    return stmt.all(`-${days} days`) as { description: string; count: number }[];
}

export function getBlockerStats(startDate: string, endDate: string): { total: number; resolved: number; unresolved: number } {
    const stmt = db.prepare(`
        SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN resolved = 1 THEN 1 ELSE 0 END) as resolved,
            SUM(CASE WHEN resolved = 0 THEN 1 ELSE 0 END) as unresolved
        FROM blockers b
        JOIN standups s ON b.standup_id = s.id
        WHERE s.date BETWEEN ? AND ?
    `);
    return stmt.get(startDate, endDate) as { total: number; resolved: number; unresolved: number };
}
