import db from '../db/connection';
import { getStandupsInRange } from './standup';
import { getCompletionRate } from './tracker';
import { getBlockerStats, getRecurringBlockers } from './blocker';

export interface WeeklySummary {
    weekStart: string;
    weekEnd: string;
    totalTasks: number;
    completedTasks: number;
    completionRate: number;
    totalBlockers: number;
    resolvedBlockers: number;
    unresolvedBlockers: number;
    recurringBlockers: { description: string; count: number }[];
    highlights: string[];
    standupCount: number;
}

export function getWeekRange(date: Date = new Date()): { start: string; end: string } {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(d.setDate(diff));
    const sunday = new Date(d.setDate(monday.getDate() + 6));
    
    return {
        start: monday.toISOString().split('T')[0],
        end: sunday.toISOString().split('T')[0]
    };
}

export function generateWeeklySummary(date?: Date): WeeklySummary {
    const { start, end } = getWeekRange(date);
    
    const standups = getStandupsInRange(start, end);
    const completion = getCompletionRate(start, end);
    const blockerStats = getBlockerStats(start, end);
    const recurring = getRecurringBlockers(30);
    
    // Generate highlights
    const highlights: string[] = [];
    
    if (completion.rate >= 80) {
        highlights.push(`Excellent completion rate: ${completion.rate}%`);
    } else if (completion.rate >= 50) {
        highlights.push(`Good progress with ${completion.rate}% completion rate`);
    } else {
        highlights.push(`Completion rate at ${completion.rate}% - consider reviewing task scope`);
    }
    
    if (blockerStats.unresolved > 0) {
        highlights.push(`${blockerStats.unresolved} unresolved blockers need attention`);
    }
    
    if (recurring.length > 0) {
        highlights.push(`Recurring blocker: "${recurring[0].description}" (${recurring[0].count}x)`);
    }
    
    if (standups.length >= 5) {
        highlights.push('Perfect standup attendance!');
    } else if (standups.length < 3) {
        highlights.push(`Only ${standups.length} standups recorded this week`);
    }
    
    return {
        weekStart: start,
        weekEnd: end,
        totalTasks: completion.total,
        completedTasks: completion.completed,
        completionRate: completion.rate,
        totalBlockers: blockerStats.total,
        resolvedBlockers: blockerStats.resolved,
        unresolvedBlockers: blockerStats.unresolved,
        recurringBlockers: recurring,
        highlights,
        standupCount: standups.length
    };
}

export function saveSummary(summary: WeeklySummary): void {
    const stmt = db.prepare(`
        INSERT INTO summaries (week_start, week_end, total_tasks, completed_tasks, blocked_tasks, recurring_blockers, highlights)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT DO NOTHING
    `);
    
    stmt.run(
        summary.weekStart,
        summary.weekEnd,
        summary.totalTasks,
        summary.completedTasks,
        summary.unresolvedBlockers,
        JSON.stringify(summary.recurringBlockers),
        JSON.stringify(summary.highlights)
    );
}

export function formatSummary(summary: WeeklySummary): string {
    const lines = [
        `📊 Weekly Summary (${summary.weekStart} to ${summary.weekEnd})`,
        '',
        '🎯 Tasks:',
        `  Total: ${summary.totalTasks}`,
        `  Completed: ${summary.completedTasks}`,
        `  Completion Rate: ${summary.completionRate}%`,
        '',
        '🚧 Blockers:',
        `  Total: ${summary.totalBlockers}`,
        `  Resolved: ${summary.resolvedBlockers}`,
        `  Unresolved: ${summary.unresolvedBlockers}`,
        '',
        '📌 Highlights:'
    ];
    
    summary.highlights.forEach(h => lines.push(`  • ${h}`));
    
    if (summary.recurringBlockers.length > 0) {
        lines.push('', '🔁 Recurring Blockers:');
        summary.recurringBlockers.forEach(b => lines.push(`  • "${b.description}" (${b.count}x)`));
    }
    
    lines.push('', `📝 Standups recorded: ${summary.standupCount}/7`);
    
    return lines.join('\n');
}
