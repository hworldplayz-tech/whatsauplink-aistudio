import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export function loadLocalEnv() {
  const envFile = path.join(__dirname, '.env');
  if (!fs.existsSync(envFile)) return;
  const raw = fs.readFileSync(envFile, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadLocalEnv();

import {
  DEFAULT_CATEGORIES as CANONICAL_CATEGORIES,
  DEFAULT_COUNTRIES as CANONICAL_COUNTRIES,
} from './category-utils.mjs';

export const DEFAULT_CATEGORIES = CANONICAL_CATEGORIES;
export const DEFAULT_COUNTRIES = CANONICAL_COUNTRIES;

function openSqlite(dbPath) {
  const absPath = path.isAbsolute(dbPath) ? dbPath : path.resolve(__dirname, dbPath);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });

  let db = null;
  let engine = '';

  try {
    const nodeSqlite = require('node:sqlite');
    if (nodeSqlite && typeof nodeSqlite.DatabaseSync === 'function') {
      db = new nodeSqlite.DatabaseSync(absPath);
      engine = 'node:sqlite';
    }
  } catch {
    // Fall back to better-sqlite3 on older Node versions
  }

  if (!db) {
    const BetterSqlite3 = require('better-sqlite3');
    db = new BetterSqlite3(absPath);
    engine = 'better-sqlite3';
  }

  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = OFF;
  `);

  return { db, engine, dbPath: absPath };
}

const resolvedDbPath = process.env.DB_PATH || './data/groups.db';
export const { db, engine: dbEngine, dbPath: resolvedAbsDbPath } = openSqlite(resolvedDbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    link TEXT NOT NULL UNIQUE,
    image_url TEXT NOT NULL DEFAULT '/groupsor_logo.png',
    image_hint TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'community',
    country TEXT NOT NULL DEFAULT 'other',
    language TEXT NOT NULL DEFAULT 'en',
    type TEXT NOT NULL DEFAULT 'group',
    tags TEXT NOT NULL DEFAULT '[]',
    featured INTEGER NOT NULL DEFAULT 0,
    clicks INTEGER NOT NULL DEFAULT 0,
    show_clicks INTEGER NOT NULL DEFAULT 1,
    submission_count INTEGER NOT NULL DEFAULT 1,
    total_rating INTEGER NOT NULL DEFAULT 0,
    rating_count INTEGER NOT NULL DEFAULT 0,
    is_verified INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    report_count INTEGER NOT NULL DEFAULT 0,
    working_votes INTEGER NOT NULL DEFAULT 0,
    broken_votes INTEGER NOT NULL DEFAULT 0,
    last_verified_at TEXT,
    last_reported_at TEXT,
    created_at TEXT NOT NULL,
    last_submitted_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_groups_last_submitted ON groups(last_submitted_at DESC);
  CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category);
  CREATE INDEX IF NOT EXISTS idx_groups_country ON groups(country);
  CREATE INDEX IF NOT EXISTS idx_groups_type ON groups(type);
  CREATE INDEX IF NOT EXISTS idx_groups_featured ON groups(featured);
  CREATE INDEX IF NOT EXISTS idx_groups_clicks ON groups(clicks DESC);

  CREATE TABLE IF NOT EXISTS categories (
    value TEXT PRIMARY KEY,
    label TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS countries (
    value TEXT PRIMARY KEY,
    label TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    group_id TEXT NOT NULL,
    group_title TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id TEXT PRIMARY KEY,
    token TEXT NOT NULL UNIQUE,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Seed default taxonomies if empty
const catCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM categories').get();
if (Number(catCountRow?.cnt || 0) === 0) {
  const insertCat = db.prepare('INSERT OR IGNORE INTO categories (value, label) VALUES (?, ?)');
  for (const cat of DEFAULT_CATEGORIES) {
    insertCat.run(cat.value, cat.label);
  }
}

const countryCountRow = db.prepare('SELECT COUNT(*) AS cnt FROM countries').get();
if (Number(countryCountRow?.cnt || 0) === 0) {
  const insertCountry = db.prepare('INSERT OR IGNORE INTO countries (value, label) VALUES (?, ?)');
  for (const country of DEFAULT_COUNTRIES) {
    insertCountry.run(country.value, country.label);
  }
}

export function generateId() {
  return crypto.randomBytes(10).toString('base64url');
}

export function mapRowToGroup(row) {
  if (!row) return null;
  let parsedTags = [];
  try {
    const raw = JSON.parse(row.tags || '[]');
    if (Array.isArray(raw)) {
      parsedTags = raw.filter((t) => typeof t === 'string');
    }
  } catch {
    parsedTags = [];
  }

  return {
    id: row.id,
    title: row.title || 'Untitled',
    description: row.description || '',
    link: row.link || '',
    imageUrl: row.image_url || '/groupsor_logo.png',
    imageHint: row.image_hint || '',
    category: row.category || 'community',
    country: row.country || 'other',
    language: row.language || 'en',
    type: row.type || 'group',
    tags: parsedTags,
    featured: Boolean(row.featured),
    clicks: Number(row.clicks || 0),
    showClicks: Boolean(row.show_clicks),
    submissionCount: Number(row.submission_count || 1),
    totalRating: Number(row.total_rating || 0),
    ratingCount: Number(row.rating_count || 0),
    isVerified: Boolean(row.is_verified),
    status: row.status || 'active',
    reportCount: Number(row.report_count || 0),
    workingVotes: Number(row.working_votes || 0),
    brokenVotes: Number(row.broken_votes || 0),
    lastVerifiedAt: row.last_verified_at || null,
    createdAt: row.created_at || null,
    lastSubmittedAt: row.last_submitted_at || row.created_at || null,
  };
}
