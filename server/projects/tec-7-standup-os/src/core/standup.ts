import db from '../db/connection';

export interface StandupInput {
    yesterday: string;
    today: string;
    blockers: string;
    mood: string;
}

export interface StandupRecord {
    id: number;
    date: string;
    yesterday: string;
    today: string;
    blockers: string;
    mood: string;
    created_at: string;
}

export function createStandup(input: StandupInput): StandupRecord {
    const date = new Date().toISOString().split('T')[0];
    
    const stmt = db.prepare(`
        INSERT INTO standups (date, yesterday, today, blockers, mood)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(date) DO UPDATE SET
            yesterday = excluded.yesterday,
            today = excluded.today,
            blockers = excluded.blockers,
            mood = excluded.mood
        RETURNING *
    `);
    
    return stmt.get(date, input.yesterday, input.today, input.blockers, input.mood) as StandupRecord;
}

export function getStandupByDate(date: string): StandupRecord | undefined {
    const stmt = db.prepare('SELECT * FROM standups WHERE date = ?');
    return stmt.get(date) as StandupRecord | undefined;
}

export function getRecentStandups(limit: number = 7): StandupRecord[] {
    const stmt = db.prepare('SELECT * FROM standups ORDER BY date DESC LIMIT ?');
    return stmt.all(limit) as StandupRecord[];
}

export function getStandupsInRange(startDate: string, endDate: string): StandupRecord[] {
    const stmt = db.prepare('SELECT * FROM standups WHERE date BETWEEN ? AND ? ORDER BY date');
    return stmt.all(startDate, endDate) as StandupRecord[];
}
