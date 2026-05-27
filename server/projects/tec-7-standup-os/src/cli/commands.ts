import { Command } from 'commander';
import inquirer from 'inquirer';
import { createStandup, getRecentStandups } from '../core/standup';
import { addTask, completeTask, getTasksByStandup } from '../core/tracker';
import { addBlocker, getUnresolvedBlockers, resolveBlocker } from '../core/blocker';
import { generateWeeklySummary, formatSummary, saveSummary } from '../core/summary';
import { syncStandupToNotion, syncSummaryToNotion, testConnection } from '../notion/client';
import * as dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
    .name('standup-os')
    .description('AI Standup + Productivity OS')
    .version('1.0.0');

// Daily standup command
program
    .command('standup')
    .description('Run daily standup')
    .action(async () => {
        console.log('🌅 Daily Standup\n');

        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'yesterday',
                message: 'What did you work on yesterday?'
            },
            {
                type: 'input',
                name: 'today',
                message: 'What are you working on today?'
            },
            {
                type: 'input',
                name: 'blockers',
                message: 'Any blockers? (press Enter if none)',
                default: ''
            },
            {
                type: 'list',
                name: 'mood',
                message: 'How are you feeling?',
                choices: ['Great', 'Good', 'Neutral', 'Tired', 'Stressed'],
                default: 'Good'
            }
        ]);

        const standup = createStandup(answers);
        console.log('\n✅ Standup recorded!');

        // Ask about tasks
        const { addTasks } = await inquirer.prompt([{
            type: 'confirm',
            name: 'addTasks',
            message: 'Add tasks for today?',
            default: true
        }]);

        if (addTasks) {
            let moreTasks = true;
            while (moreTasks) {
                const { task } = await inquirer.prompt([{
                    type: 'input',
                    name: 'task',
                    message: 'Task description (or press Enter to finish):'
                }]);

                if (!task) {
                    moreTasks = false;
                    break;
                }

                addTask({ standup_id: standup.id, description: task });
                console.log('  ✓ Task added');
            }
        }

        // Ask about blockers
        if (answers.blockers) {
            const { trackBlocker } = await inquirer.prompt([{
                type: 'confirm',
                name: 'trackBlocker',
                message: 'Track this as a formal blocker?',
                default: true
            }]);

            if (trackBlocker) {
                addBlocker({ standup_id: standup.id, description: answers.blockers });
                console.log('  ✓ Blocker tracked');
            }
        }

        // Sync to Notion if configured
        if (process.env.NOTION_TOKEN && process.env.NOTION_STANDUP_DB_ID) {
            try {
                const notionId = await syncStandupToNotion(standup);
                console.log(`  ✓ Synced to Notion: ${notionId}`);
            } catch (err) {
                console.log('  ⚠ Notion sync failed:', (err as Error).message);
            }
        }

        console.log('\n🎉 Standup complete!');
    });

// Weekly summary command
program
    .command('summary')
    .description('Generate weekly summary')
    .option('-d, --date <date>', 'Date for week calculation (YYYY-MM-DD)')
    .action(async (options) => {
        const date = options.date ? new Date(options.date) : new Date();
        const summary = generateWeeklySummary(date);
        
        console.log(formatSummary(summary));
        
        const { save } = await inquirer.prompt([{
            type: 'confirm',
            name: 'save',
            message: 'Save summary to database?',
            default: true
        }]);

        if (save) {
            saveSummary(summary);
            console.log('\n✅ Summary saved');
        }

        // Sync to Notion if configured
        if (process.env.NOTION_TOKEN && process.env.NOTION_SUMMARY_DB_ID) {
            try {
                const notionId = await syncSummaryToNotion(summary);
                console.log(`✓ Synced to Notion: ${notionId}`);
            } catch (err) {
                console.log('⚠ Notion sync failed:', (err as Error).message);
            }
        }
    });

// Sync command
program
    .command('sync')
    .description('Sync recent data to Notion')
    .action(async () => {
        if (!process.env.NOTION_TOKEN) {
            console.error('❌ NOTION_TOKEN not set');
            process.exit(1);
        }

        const connected = await testConnection();
        if (!connected) {
            console.error('❌ Could not connect to Notion');
            process.exit(1);
        }

        console.log('✅ Connected to Notion');

        // Sync recent standups
        const standups = getRecentStandups(7);
        console.log(`\nSyncing ${standups.length} recent standups...`);
        
        for (const standup of standups) {
            try {
                await syncStandupToNotion(standup);
                console.log(`  ✓ ${standup.date}`);
            } catch (err) {
                console.log(`  ✗ ${standup.date}:`, (err as Error).message);
            }
        }

        console.log('\n🎉 Sync complete!');
    });

// Blockers command
program
    .command('blockers')
    .description('Show and manage blockers')
    .option('-r, --resolve <id>', 'Resolve a blocker by ID')
    .action(async (options) => {
        if (options.resolve) {
            resolveBlocker(parseInt(options.resolve));
            console.log('✅ Blocker resolved');
            return;
        }

        const blockers = getUnresolvedBlockers();
        
        if (blockers.length === 0) {
            console.log('🎉 No unresolved blockers!');
            return;
        }

        console.log(`🚧 ${blockers.length} Unresolved Blocker(s):\n`);
        blockers.forEach(b => {
            console.log(`  [${b.id}] ${b.description}`);
            console.log(`      Created: ${b.created_at}`);
            if (b.category) console.log(`      Category: ${b.category}`);
            console.log('');
        });
    });

// Tasks command
program
    .command('tasks')
    .description('Show recent tasks')
    .option('-c, --complete <id>', 'Mark task as complete')
    .action(async (options) => {
        if (options.complete) {
            completeTask(parseInt(options.complete));
            console.log('✅ Task marked complete');
            return;
        }

        const standups = getRecentStandups(7);
        console.log('📋 Recent Tasks:\n');

        for (const standup of standups) {
            const tasks = getTasksByStandup(standup.id);
            if (tasks.length > 0) {
                console.log(`${standup.date}:`);
                tasks.forEach(t => {
                    const status = t.status === 'completed' ? '✅' : '⏳';
                    console.log(`  [${t.id}] ${status} ${t.description}`);
                });
                console.log('');
            }
        }
    });

program.parse();
