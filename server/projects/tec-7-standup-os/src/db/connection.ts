import Database = require('better-sqlite3');
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = process.env.STANDUP_DB_PATH || path.join(process.cwd(), 'data', 'standup.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
const schemaPath = path.join(__dirname, 'schema.sql');
const schema = fs.readFileSync(schemaPath, 'utf-8');
db.exec(schema);

export default db;
