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

export const DEFAULT_CATEGORIES = [
  { label: 'Adult 18+', value: 'adult-18' },
  { label: 'Art & Photography', value: 'art-photography' },
  { label: 'Business, Advertising & Marketing', value: 'business-advertising-marketing' },
  { label: 'Comedy & Funny', value: 'comedy-funny' },
  { label: 'Community', value: 'community' },
  { label: 'Crypto & Trading', value: 'crypto-trading' },
  { label: 'Education', value: 'education' },
  { label: 'Entertainment', value: 'entertainment' },
  { label: 'Family & Relationships', value: 'family-relationships' },
  { label: 'Fan Clubs', value: 'fan-clubs' },
  { label: 'Fashion, Style & Clothing', value: 'fashion-style-clothing' },
  { label: 'Food & Cooking', value: 'food-cooking' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Health & Fitness', value: 'health-fitness' },
  { label: 'Jobs & Career', value: 'jobs-career' },
  { label: 'Money & Earning', value: 'money-earning' },
  { label: 'Movies & TV', value: 'movies-tv' },
  { label: 'Music', value: 'music' },
  { label: 'News & Politics', value: 'news-politics' },
  { label: 'Quotes & Shayari', value: 'quotes-shayari' },
  { label: 'Shopping, Buy & Sell', value: 'shopping-buy-sell' },
  { label: 'Social, Friendship & Community', value: 'social-friendship-community' },
  { label: 'Sports & Games', value: 'sports-games' },
  { label: 'Status & Video', value: 'status-video' },
  { label: 'Technology', value: 'technology' },
  { label: 'Travel', value: 'travel' },
];

export const DEFAULT_COUNTRIES = [
  { label: 'International', value: 'intl' },
  { label: 'India', value: 'in' },
  { label: 'Pakistan', value: 'pk' },
  { label: 'United States', value: 'us' },
  { label: 'United Kingdom', value: 'uk' },
  { label: 'Canada', value: 'ca' },
  { label: 'Australia', value: 'au' },
  { label: 'United Arab Emirates', value: 'ae' },
  { label: 'Saudi Arabia', value: 'sa' },
  { label: 'Qatar', value: 'qa' },
  { label: 'Kuwait', value: 'kw' },
  { label: 'Oman', value: 'om' },
  { label: 'Bahrain', value: 'bh' },
  { label: 'Bangladesh', value: 'bd' },
  { label: 'Nepal', value: 'np' },
  { label: 'Sri Lanka', value: 'lk' },
  { label: 'Indonesia', value: 'id' },
  { label: 'Malaysia', value: 'my' },
  { label: 'Philippines', value: 'ph' },
  { label: 'Singapore', value: 'sg' },
  { label: 'Nigeria', value: 'ng' },
  { label: 'South Africa', value: 'za' },
  { label: 'Kenya', value: 'ke' },
  { label: 'Ghana', value: 'gh' },
  { label: 'Egypt', value: 'eg' },
  { label: 'Morocco', value: 'ma' },
  { label: 'Germany', value: 'de' },
  { label: 'France', value: 'fr' },
  { label: 'Italy', value: 'it' },
  { label: 'Spain', value: 'es' },
  { label: 'Netherlands', value: 'nl' },
  { label: 'Brazil', value: 'br' },
  { label: 'Mexico', value: 'mx' },
  { label: 'Argentina', value: 'ar' },
  { label: 'Turkey', value: 'tr' },
  { label: 'Russia', value: 'ru' },
  { label: 'Other Countries', value: 'other' },
];

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
