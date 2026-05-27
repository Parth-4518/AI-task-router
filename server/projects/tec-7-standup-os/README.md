# AI Standup + Productivity OS

A developer productivity system that automates daily standups, tracks work completion, and generates insights.

## Features

- **Daily Standup Bot**: Asks structured standup questions and records responses
- **Work Tracking**: Compares planned vs completed tasks
- **Weekly Summaries**: Auto-generates productivity reports
- **Blocker Detection**: Identifies recurring obstacles
- **Historical Data**: SQLite-backed storage for trends
- **Notion Integration**: Syncs standups and summaries to Notion

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Standup CLI    │────▶│  Standup Core    │────▶│  SQLite DB  │
│  (daily entry)  │     │  (business logic)│     │  (storage)  │
└─────────────────┘     └──────────────────┘     └─────────────┘
                               │
                               ▼
                        ┌─────────────┐
                        │  Notion API │
                        │  (sync)     │
                        └─────────────┘
```

## Tech Stack

- **Runtime**: Node.js 18+ with TypeScript
- **Database**: SQLite (local, zero-config)
- **Notion SDK**: `@notionhq/client`
- **CLI**: Custom interactive prompts
- **Scheduler**: `node-cron` for automated reminders

## Project Structure

```
tec-7-standup-os/
├── src/
│   ├── core/
│   │   ├── standup.ts      # Standup session logic
│   │   ├── tracker.ts      # Work tracking
│   │   ├── summary.ts      # Weekly summary generation
│   │   └── blocker.ts      # Blocker detection
│   ├── db/
│   │   ├── schema.sql      # Database schema
│   │   └── connection.ts   # SQLite wrapper
│   ├── notion/
│   │   └── client.ts       # Notion integration
│   ├── cli/
│   │   └── commands.ts     # CLI commands
│   └── index.ts            # Entry point
├── dist/                   # Compiled output
├── package.json
├── tsconfig.json
└── README.md
```

## Quick Start

```bash
npm install
npm run build
npm run standup    # Run daily standup
npm run summary    # Generate weekly summary
npm run sync       # Sync to Notion
```

## Database Schema

- `standups`: Daily standup responses
- `tasks`: Tracked tasks (planned/completed)
- `blockers`: Recorded blockers
- `summaries`: Generated weekly summaries

## Notion Setup

1. Create a Notion integration at https://www.notion.so/my-integrations
2. Copy the integration token to `.env`
3. Share your database pages with the integration
4. Run `npm run sync` to push data

## Environment Variables

```
NOTION_TOKEN=secret_xxx
NOTION_STANDUP_DB_ID=xxx
NOTION_SUMMARY_DB_ID=xxx
```
