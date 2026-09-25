import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const onAzure = !!process.env.WEBSITE_SITE_NAME;
const dbPath = process.env.DATABASE_PATH || (onAzure ? '/home/data/prospecthunter.db' : './data/prospecthunter.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user',
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL,
  avg_deal_size REAL,
  drip_daily_cap INTEGER NOT NULL DEFAULT 50,
  briefing_enabled INTEGER NOT NULL DEFAULT 0,
  briefing_hour INTEGER NOT NULL DEFAULT 7,
  briefing_timezone TEXT NOT NULL DEFAULT 'Europe/Dublin',
  morning_hunt_zip TEXT,
  morning_hunt_radius REAL NOT NULL DEFAULT 15,
  morning_hunt_facility_types TEXT NOT NULL DEFAULT '[]',
  telegram_chat_id TEXT,
  business_name TEXT,
  business_industry TEXT,
  business_niche TEXT,
  business_description TEXT,
  sender_name TEXT,
  email_signature TEXT,
  target_categories TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS gmail_connections (
  user_id TEXT PRIMARY KEY,
  email TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_date TEXT NOT NULL,
  updated_date TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS oauth_states (
  state TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
`);
