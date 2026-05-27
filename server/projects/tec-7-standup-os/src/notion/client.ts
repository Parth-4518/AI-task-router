import { Client } from '@notionhq/client';
import { WeeklySummary } from '../core/summary';
import { StandupRecord } from '../core/standup';

let notion: Client | null = null;

function getClient(): Client {
    if (!notion) {
        const token = process.env.NOTION_TOKEN;
        if (!token) {
            throw new Error('NOTION_TOKEN environment variable is required');
        }
        notion = new Client({ auth: token });
    }
    return notion;
}

export async function syncStandupToNotion(standup: StandupRecord, databaseId?: string): Promise<string> {
    const dbId = databaseId || process.env.NOTION_STANDUP_DB_ID;
    if (!dbId) {
        throw new Error('Notion database ID not provided');
    }

    const client = getClient();
    const response = await client.pages.create({
        parent: { database_id: dbId },
        properties: {
            Name: {
                title: [{ text: { content: `Standup - ${standup.date}` } }]
            },
            Date: {
                date: { start: standup.date }
            },
            Yesterday: {
                rich_text: [{ text: { content: standup.yesterday } }]
            },
            Today: {
                rich_text: [{ text: { content: standup.today } }]
            },
            Blockers: {
                rich_text: [{ text: { content: standup.blockers || 'None' } }]
            },
            Mood: {
                select: { name: standup.mood || 'Neutral' }
            }
        }
    });

    return response.id;
}

export async function syncSummaryToNotion(summary: WeeklySummary, databaseId?: string): Promise<string> {
    const dbId = databaseId || process.env.NOTION_SUMMARY_DB_ID;
    if (!dbId) {
        throw new Error('Notion database ID not provided');
    }

    const client = getClient();
    const response = await client.pages.create({
        parent: { database_id: dbId },
        properties: {
            Name: {
                title: [{ text: { content: `Weekly Summary - ${summary.weekStart}` } }]
            },
            'Week Start': {
                date: { start: summary.weekStart }
            },
            'Week End': {
                date: { start: summary.weekEnd }
            },
            'Completion Rate': {
                number: summary.completionRate
            },
            'Total Tasks': {
                number: summary.totalTasks
            },
            'Completed Tasks': {
                number: summary.completedTasks
            },
            'Unresolved Blockers': {
                number: summary.unresolvedBlockers
            },
            Highlights: {
                rich_text: [{ text: { content: summary.highlights.join('\n') } }]
            }
        }
    });

    return response.id;
}

export async function testConnection(): Promise<boolean> {
    try {
        const client = getClient();
        await client.users.me({});
        return true;
    } catch {
        return false;
    }
}
