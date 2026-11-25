import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, loadLocalEnv } from './db.mjs';

loadLocalEnv();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const FIREBASE_PROJECT_ID =
  (process.env.FIREBASE_PROJECT_ID || 'moovie-35706').trim();

const FIREBASE_CLIENT_CONFIG = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ||
    'AIzaSyAXA-mRInS2LqWzxU43eKNbVl_l-WQZang',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    'moovie-35706.firebaseapp.com',
  projectId: FIREBASE_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    'moovie-35706.appspot.com',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '1046379679363',
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ||
    '1:1046379679363:web:f37ebc4a08008f58d695b6',
};

function getServiceAccountCredentials() {
  // Check local service-account.json first if present
  const jsonPath = path.join(__dirname, 'service-account.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
      if (parsed.client_email && parsed.private_key) {
        return {
          projectId: parsed.project_id || FIREBASE_PROJECT_ID,
          clientEmail: parsed.client_email,
          privateKey: parsed.private_key,
        };
      }
    } catch {
      // Ignore malformed file
    }
  }

  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();

  if (clientEmail && privateKey.includes('BEGIN')) {
    return { projectId: FIREBASE_PROJECT_ID, clientEmail, privateKey };
  }
  return null;
}

async function getAdminAccessToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: creds.clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    })
  ).toString('base64url');

  const input = `${header}.${claim}`;
  const sig = crypto.createSign('RSA-SHA256').update(input).sign(creds.privateKey, 'base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${input}.${sig}`,
    }),
  });

  if (!res.ok) {
    throw new Error(`Service account OAuth failed (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

function decodeFirestoreValue(val) {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('timestampValue' in val) return val.timestampValue;
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const out = {};
    for (const [k, v] of Object.entries(val.mapValue?.fields || {})) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

async function fetchCollectionViaRest(collectionName, projectId, accessToken) {
  const docs = [];
  let pageToken = '';

  while (true) {
    const params = new URLSearchParams({ pageSize: '300' });
    if (pageToken) params.set('pageToken', pageToken);
    const url = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${collectionName}?${params.toString()}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (res.status === 404) break;
    if (!res.ok) {
      throw new Error(`Firestore REST fetch "${collectionName}" failed (${res.status}): ${await res.text()}`);
    }

    const json = await res.json();
    for (const item of json.documents || []) {
      const id = String(item.name || '').split('/').pop() || '';
      const data = {};
      for (const [k, v] of Object.entries(item.fields || {})) {
        data[k] = decodeFirestoreValue(v);
      }
      docs.push({ id, data });
    }

    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
  }

  return docs;
}

function normalizeTs(ts, fallbackIso) {
  if (!ts) return fallbackIso;
  if (typeof ts?.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? fallbackIso : d.toISOString();
  }
  if (typeof ts === 'object' && ts.seconds !== undefined) {
    return new Date(Number(ts.seconds) * 1000).toISOString();
  }
  return fallbackIso;
}

async function fetchAllFromFirebase() {
  const creds = getServiceAccountCredentials();
  if (creds) {
    console.log(`[migrate] Using Firebase Service Account REST API (${creds.clientEmail})...`);
    const token = await getAdminAccessToken(creds);
    const [categories, countries, groups, reports, pushSubs] = await Promise.all([
      fetchCollectionViaRest('categories', creds.projectId, token),
      fetchCollectionViaRest('countries', creds.projectId, token),
      fetchCollectionViaRest('groups', creds.projectId, token),
      fetchCollectionViaRest('reports', creds.projectId, token),
      fetchCollectionViaRest('push_subscriptions', creds.projectId, token).catch(() => []),
    ]);
    return { categories, countries, groups, reports, pushSubs };
  }

  console.log('[migrate] Using Firebase Client SDK (project moovie-35706)...');
  const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CLIENT_CONFIG);
  const firestore = getFirestore(app);

  const [catSnap, countrySnap, groupSnap, reportSnap] = await Promise.all([
    getDocs(collection(firestore, 'categories')),
    getDocs(collection(firestore, 'countries')),
    getDocs(query(collection(firestore, 'groups'), orderBy('lastSubmittedAt', 'desc'))),
    getDocs(collection(firestore, 'reports')).catch(() => ({ docs: [] })),
  ]);

  return {
    categories: catSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
    countries: countrySnap.docs.map((d) => ({ id: d.id, data: d.data() })),
    groups: groupSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
    reports: reportSnap.docs.map((d) => ({ id: d.id, data: d.data() })),
    pushSubs: [],
  };
}

async function runMigration() {
  const { categories, countries, groups, reports, pushSubs } = await fetchAllFromFirebase();
  const nowIso = new Date().toISOString();

  console.log(
    `[migrate] Fetched from Firebase -> categories=${categories.length}, countries=${countries.length}, groups=${groups.length}, reports=${reports.length}, push_subscriptions=${pushSubs.length}`
  );

  db.exec('BEGIN');
  try {
    const upsertCat = db.prepare(
      'INSERT INTO categories (value, label) VALUES (?, ?) ON CONFLICT(value) DO UPDATE SET label = excluded.label'
    );
    for (const c of categories) {
      const value = String(c.data.value || c.id || '').trim();
      const label = String(c.data.label || value).trim();
      if (value && value !== 'all') upsertCat.run(value, label);
    }

    const upsertCountry = db.prepare(
      'INSERT INTO countries (value, label) VALUES (?, ?) ON CONFLICT(value) DO UPDATE SET label = excluded.label'
    );
    for (const c of countries) {
      const value = String(c.data.value || c.id || '').trim();
      const label = String(c.data.label || value).trim();
      if (value && value !== 'all') upsertCountry.run(value, label);
    }

    const upsertGroup = db.prepare(`
      INSERT INTO groups (
        id, title, description, link, image_url, image_hint, category, country,
        language, type, tags, featured, clicks, show_clicks, submission_count,
        total_rating, rating_count, is_verified, status, report_count,
        working_votes, broken_votes, last_verified_at, last_reported_at,
        created_at, last_submitted_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
      ON CONFLICT(link) DO UPDATE SET
        title = excluded.title,
        description = CASE WHEN excluded.description != '' THEN excluded.description ELSE groups.description END,
        image_url = CASE WHEN excluded.image_url != '' THEN excluded.image_url ELSE groups.image_url END,
        featured = MAX(groups.featured, excluded.featured),
        clicks = MAX(groups.clicks, excluded.clicks),
        submission_count = MAX(groups.submission_count, excluded.submission_count),
        total_rating = MAX(groups.total_rating, excluded.total_rating),
        rating_count = MAX(groups.rating_count, excluded.rating_count),
        is_verified = MAX(groups.is_verified, excluded.is_verified),
        working_votes = MAX(groups.working_votes, excluded.working_votes),
        broken_votes = MAX(groups.broken_votes, excluded.broken_votes),
        last_submitted_at = excluded.last_submitted_at
    `);

    let migratedGroups = 0;
    for (const g of groups) {
      const d = g.data || {};
      const link = String(d.link || '').trim();
      if (!link) continue;

      const createdAt = normalizeTs(d.createdAt, nowIso);
      const lastSubmittedAt = normalizeTs(d.lastSubmittedAt, createdAt);
      const tags = Array.isArray(d.tags)
        ? d.tags.filter((t) => typeof t === 'string')
        : [];

      upsertGroup.run(
        g.id,
        String(d.title || 'Untitled'),
        String(d.description || ''),
        link,
        String(d.imageUrl || '/groupsor_logo.png'),
        String(d.imageHint || ''),
        String(d.category || 'community'),
        String(d.country || 'other'),
        String(d.language || 'en'),
        String(d.type || 'group'),
        JSON.stringify(tags),
        d.featured ? 1 : 0,
        Number(d.clicks || 0),
        typeof d.showClicks === 'boolean' ? (d.showClicks ? 1 : 0) : 1,
        Number(d.submissionCount || 1),
        Number(d.totalRating || 0),
        Number(d.ratingCount || 0),
        d.isVerified ? 1 : 0,
        String(d.status || 'active'),
        Number(d.reportCount || 0),
        Number(d.workingVotes || 0),
        Number(d.brokenVotes || 0),
        d.lastVerifiedAt ? normalizeTs(d.lastVerifiedAt, nowIso) : null,
        d.lastReportedAt ? normalizeTs(d.lastReportedAt, nowIso) : null,
        createdAt,
        lastSubmittedAt
      );
      migratedGroups++;
    }

    const upsertReport = db.prepare(
      'INSERT OR IGNORE INTO reports (id, group_id, group_title, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    for (const r of reports) {
      const d = r.data || {};
      upsertReport.run(
        r.id,
        String(d.groupId || ''),
        String(d.groupTitle || 'Unknown Group'),
        String(d.reason || 'No reason given'),
        String(d.status || 'pending'),
        normalizeTs(d.createdAt, nowIso)
      );
    }

    const upsertPush = db.prepare(
      'INSERT OR IGNORE INTO push_subscriptions (id, token, updated_at) VALUES (?, ?, ?)'
    );
    for (const p of pushSubs) {
      const d = p.data || {};
      if (typeof d.token === 'string' && d.token.length >= 50) {
        upsertPush.run(p.id, d.token, normalizeTs(d.updatedAt, nowIso));
      }
    }

    db.exec('COMMIT');
    console.log(`[migrate] Success! Migrated ${migratedGroups} group(s) cleanly into groups.db.`);
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

runMigration().catch((err) => {
  console.error('[migrate] Error:', err.message || err);
  console.error(
    '[migrate] Tip: If Firestore Client SDK failed due to permissions or quota, place your Firebase service-account.json in ~/groupsor-db/service-account.json (or set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY in .env) and re-run.'
  );
  process.exit(1);
});
