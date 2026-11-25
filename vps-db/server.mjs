import http from 'node:http';
import crypto from 'node:crypto';
import {
  db,
  dbEngine,
  resolvedAbsDbPath,
  generateId,
  mapRowToGroup,
} from './db.mjs';

const PORT = Math.max(1, Number(process.env.PORT || 4000));
const HOST = process.env.HOST || '127.0.0.1';
const VPS_DB_SECRET = (process.env.VPS_DB_SECRET || '').trim();
const MAX_BODY_BYTES = 1024 * 1024; // 1 MB

function sendJson(res, status, data, extraHeaders = {}) {
  const payload = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders,
  });
  res.end(payload);
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let bytes = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      bytes += chunk.length;
      if (bytes > MAX_BODY_BYTES) {
        reject(new Error('PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new Error('INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!VPS_DB_SECRET) return false;
  const authHeader = String(req.headers.authorization || '');
  const altHeader = String(req.headers['x-vps-db-secret'] || '');

  let candidate = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    candidate = authHeader.slice(7).trim();
  } else if (altHeader) {
    candidate = altHeader.trim();
  }

  if (!candidate) return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(VPS_DB_SECRET).digest();
  return crypto.timingSafeEqual(a, b);
}

function sanitizeSlug(raw) {
  return String(raw || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function toIsoOrNow(val) {
  if (typeof val === 'string' && val.trim()) {
    const d = new Date(val);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return new Date().toISOString();
}

function computeTrendingScore(group, nowMs) {
  const dateStr = group.lastSubmittedAt || group.createdAt;
  const hours = dateStr
    ? Math.max(1, (nowMs - new Date(dateStr).getTime()) / 3600000)
    : 1000;
  return (
    ((group.clicks || 0) +
      (group.workingVotes || 0) * 4 +
      (group.isVerified ? 30 : 0)) /
    Math.pow(hours + 2, 1.2)
  );
}

function getAllCategories() {
  return db
    .prepare('SELECT value AS id, label, value FROM categories ORDER BY label ASC')
    .all();
}

function getAllCountries() {
  return db
    .prepare('SELECT value AS id, label, value FROM countries ORDER BY label ASC')
    .all();
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const pathname = url.pathname.replace(/\/+$/, '') || '/';
    const method = (req.method || 'GET').toUpperCase();

    if (method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-vps-db-secret',
      });
      res.end();
      return;
    }

    // 1. Health Check
    if (method === 'GET' && pathname === '/health') {
      const cnt = db.prepare('SELECT COUNT(*) AS cnt FROM groups').get();
      return sendJson(res, 200, {
        ok: true,
        engine: dbEngine,
        dbPath: resolvedAbsDbPath,
        groups: Number(cnt?.cnt || 0),
        authConfigured: Boolean(VPS_DB_SECRET),
      });
    }

    // 2. Categories & Countries
    if (method === 'GET' && pathname === '/categories') {
      return sendJson(res, 200, { success: true, categories: getAllCategories() });
    }

    if (method === 'POST' && pathname === '/categories') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const value = sanitizeSlug(body.value || body.label);
      const label = String(body.label || body.value || '').trim().slice(0, 80);
      if (!value || value.length < 2 || !label || label.length < 2) {
        return sendJson(res, 400, { success: false, message: 'Valid value and label required.' });
      }
      db.prepare(
        'INSERT INTO categories (value, label) VALUES (?, ?) ON CONFLICT(value) DO UPDATE SET label = excluded.label'
      ).run(value, label);
      return sendJson(res, 200, { success: true, category: { id: value, label, value } });
    }

    if (method === 'DELETE' && pathname.startsWith('/categories/')) {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const value = sanitizeSlug(decodeURIComponent(pathname.slice('/categories/'.length)));
      if (!value || value === 'all') {
        return sendJson(res, 400, { success: false, message: 'Invalid category value.' });
      }
      db.prepare('DELETE FROM categories WHERE value = ?').run(value);
      return sendJson(res, 200, { success: true });
    }

    if (method === 'GET' && pathname === '/countries') {
      return sendJson(res, 200, { success: true, countries: getAllCountries() });
    }

    if (method === 'POST' && pathname === '/countries') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const value = sanitizeSlug(body.value || body.label);
      const label = String(body.label || body.value || '').trim().slice(0, 80);
      if (!value || value.length < 2 || !label || label.length < 2) {
        return sendJson(res, 400, { success: false, message: 'Valid value and label required.' });
      }
      db.prepare(
        'INSERT INTO countries (value, label) VALUES (?, ?) ON CONFLICT(value) DO UPDATE SET label = excluded.label'
      ).run(value, label);
      return sendJson(res, 200, { success: true, country: { id: value, label, value } });
    }

    if (method === 'DELETE' && pathname.startsWith('/countries/')) {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const value = sanitizeSlug(decodeURIComponent(pathname.slice('/countries/'.length)));
      if (!value || value === 'all') {
        return sendJson(res, 400, { success: false, message: 'Invalid country value.' });
      }
      db.prepare('DELETE FROM countries WHERE value = ?').run(value);
      return sendJson(res, 200, { success: true });
    }

    // 3. Groups lookup by link
    if (method === 'GET' && pathname === '/groups/by-link') {
      const link = String(url.searchParams.get('link') || '').trim();
      if (!link) return sendJson(res, 400, { success: false, message: 'Missing link param.' });
      const row = db.prepare('SELECT * FROM groups WHERE link = ? LIMIT 1').get(link);
      return sendJson(res, 200, { success: true, group: mapRowToGroup(row) });
    }

    // 4. Bulk group operations (Protected)
    if (method === 'POST' && pathname === '/groups/bulk-delete') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const ids = Array.isArray(body.ids)
        ? body.ids.filter((id) => typeof id === 'string' && id.trim())
        : [];
      if (ids.length === 0) {
        return sendJson(res, 400, { success: false, message: 'No IDs provided.' });
      }
      const delStmt = db.prepare('DELETE FROM groups WHERE id = ?');
      db.exec('BEGIN');
      try {
        for (const id of ids) delStmt.run(id.trim());
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return sendJson(res, 200, { success: true, deleted: ids.length });
    }

    if (method === 'POST' && pathname === '/groups/bulk-featured') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const ids = Array.isArray(body.ids)
        ? body.ids.filter((id) => typeof id === 'string' && id.trim())
        : [];
      const featured = body.featured ? 1 : 0;
      if (ids.length === 0) {
        return sendJson(res, 400, { success: false, message: 'No IDs provided.' });
      }
      const updStmt = db.prepare('UPDATE groups SET featured = ? WHERE id = ?');
      db.exec('BEGIN');
      try {
        for (const id of ids) updStmt.run(featured, id.trim());
        db.exec('COMMIT');
      } catch (e) {
        db.exec('ROLLBACK');
        throw e;
      }
      return sendJson(res, 200, { success: true, updated: ids.length });
    }

    // 5. List / Search / Paginate Groups
    if (method === 'GET' && pathname === '/groups') {
      const category = sanitizeSlug(url.searchParams.get('category'));
      const country = sanitizeSlug(url.searchParams.get('country'));
      const language = sanitizeSlug(url.searchParams.get('language'));
      const type = sanitizeSlug(url.searchParams.get('type'));
      const tagParam = String(url.searchParams.get('tag') || '').trim().toLowerCase();
      const q = String(url.searchParams.get('q') || '').trim().toLowerCase();
      const featured = url.searchParams.get('featured');
      const sort = sanitizeSlug(url.searchParams.get('sort') || 'newest');

      const rawPage = Number(url.searchParams.get('page') || 1);
      const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
      const rawLimit = Number(url.searchParams.get('limit') || 50);
      const limitCount = Number.isFinite(rawLimit)
        ? Math.max(1, Math.min(5000, Math.floor(rawLimit)))
        : 50;

      const conditions = [];
      const params = [];

      if (category && category !== 'all') {
        conditions.push('LOWER(category) = ?');
        params.push(category);
      }
      if (country && country !== 'all') {
        conditions.push('LOWER(country) = ?');
        params.push(country);
      }
      if (language && language !== 'all') {
        conditions.push('LOWER(language) = ?');
        params.push(language);
      }
      if (type && ['group', 'channel', 'community'].includes(type)) {
        conditions.push('LOWER(type) = ?');
        params.push(type);
      }
      if (featured === 'true' || featured === '1') {
        conditions.push('featured = 1');
      }
      if (q) {
        const like = `%${q}%`;
        conditions.push(
          '(LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(tags) LIKE ? OR LOWER(category) LIKE ? OR LOWER(country) LIKE ?)'
        );
        params.push(like, like, like, like, like);
      }

      const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // If filtering by multi-tag or sorting by complex formulas (trending/rating/trust), compute cleanly
      const needsInMemoryFilterOrSort =
        Boolean(tagParam) || ['trending', 'rating', 'trust'].includes(sort);

      let mapped = [];
      let total = 0;

      if (needsInMemoryFilterOrSort) {
        const rows = db
          .prepare(`SELECT * FROM groups ${whereSql} ORDER BY last_submitted_at DESC`)
          .all(...params);
        let items = rows.map(mapRowToGroup);

        if (tagParam) {
          const requiredTags = tagParam
            .split('+')
            .map((t) => decodeURIComponent(t).trim().toLowerCase())
            .filter(Boolean);
          if (requiredTags.length > 0) {
            items = items.filter((g) => {
              const lowerTags = (g.tags || []).map((t) => t.toLowerCase());
              return requiredTags.every((rt) => lowerTags.includes(rt));
            });
          }
        }

        if (sort === 'trending') {
          const nowMs = Date.now();
          items.sort((a, b) => computeTrendingScore(b, nowMs) - computeTrendingScore(a, nowMs));
        } else if (sort === 'rating') {
          items.sort((a, b) => {
            const avgA = a.ratingCount > 0 ? a.totalRating / a.ratingCount : 0;
            const avgB = b.ratingCount > 0 ? b.totalRating / b.ratingCount : 0;
            if (avgB !== avgA) return avgB - avgA;
            return (b.ratingCount || 0) - (a.ratingCount || 0);
          });
        } else if (sort === 'trust') {
          items.sort((a, b) => {
            const tA = (a.workingVotes || 0) - (a.brokenVotes || 0) + (a.isVerified ? 20 : 0);
            const tB = (b.workingVotes || 0) - (b.brokenVotes || 0) + (b.isVerified ? 20 : 0);
            return tB - tA;
          });
        }

        total = items.length;
        const offset = (page - 1) * limitCount;
        mapped = items.slice(offset, offset + limitCount);
      } else {
        const orderSql =
          sort === 'popular'
            ? 'ORDER BY clicks DESC, last_submitted_at DESC'
            : 'ORDER BY last_submitted_at DESC';
        const countRow = db
          .prepare(`SELECT COUNT(*) AS cnt FROM groups ${whereSql}`)
          .get(...params);
        total = Number(countRow?.cnt || 0);

        const offset = (page - 1) * limitCount;
        const rows = db
          .prepare(`SELECT * FROM groups ${whereSql} ${orderSql} LIMIT ? OFFSET ?`)
          .all(...params, limitCount, offset);
        mapped = rows.map(mapRowToGroup);
      }

      const hasMore = page * limitCount < total;
      return sendJson(res, 200, {
        success: true,
        page,
        limit: limitCount,
        total,
        totalPages: Math.max(1, Math.ceil(total / limitCount)),
        hasMore,
        groups: mapped,
      });
    }

    // 6. Create / Upsert Group (Protected)
    if (method === 'POST' && pathname === '/groups') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);

      const link = String(body.link || '').trim();
      const title = String(body.title || '').trim();
      if (!link || !title) {
        return sendJson(res, 400, { success: false, message: 'link and title are required.' });
      }

      const id =
        typeof body.id === 'string' && body.id.trim()
          ? body.id.trim().replace(/[^a-zA-Z0-9_-]/g, '')
          : generateId();
      const nowIso = new Date().toISOString();
      const createdAt = body.createdAt ? toIsoOrNow(body.createdAt) : nowIso;
      const lastSubmittedAt = body.lastSubmittedAt ? toIsoOrNow(body.lastSubmittedAt) : nowIso;
      const category = sanitizeSlug(body.category) || 'community';
      const country = sanitizeSlug(body.country) || 'other';
      const language = sanitizeSlug(body.language) || 'en';
      const type = ['group', 'channel', 'community'].includes(body.type) ? body.type : 'group';
      const tagsJson = JSON.stringify(
        Array.isArray(body.tags)
          ? body.tags.filter((t) => typeof t === 'string' && t.trim()).slice(0, 10)
          : []
      );

      db.prepare(`
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
          category = excluded.category,
          country = excluded.country,
          language = excluded.language,
          type = excluded.type,
          tags = excluded.tags,
          featured = MAX(groups.featured, excluded.featured),
          clicks = MAX(groups.clicks, excluded.clicks),
          submission_count = MAX(groups.submission_count, excluded.submission_count),
          total_rating = MAX(groups.total_rating, excluded.total_rating),
          rating_count = MAX(groups.rating_count, excluded.rating_count),
          is_verified = MAX(groups.is_verified, excluded.is_verified),
          working_votes = MAX(groups.working_votes, excluded.working_votes),
          broken_votes = MAX(groups.broken_votes, excluded.broken_votes),
          last_submitted_at = excluded.last_submitted_at
      `).run(
        id,
        title,
        String(body.description || ''),
        link,
        String(body.imageUrl || '/groupsor_logo.png'),
        String(body.imageHint || ''),
        category,
        country,
        language,
        type,
        tagsJson,
        body.featured ? 1 : 0,
        Math.max(0, Number(body.clicks || 0)),
        body.showClicks === false ? 0 : 1,
        Math.max(1, Number(body.submissionCount || 1)),
        Math.max(0, Number(body.totalRating || 0)),
        Math.max(0, Number(body.ratingCount || 0)),
        body.isVerified ? 1 : 0,
        String(body.status || 'active'),
        Math.max(0, Number(body.reportCount || 0)),
        Math.max(0, Number(body.workingVotes || 0)),
        Math.max(0, Number(body.brokenVotes || 0)),
        body.lastVerifiedAt ? toIsoOrNow(body.lastVerifiedAt) : null,
        body.lastReportedAt ? toIsoOrNow(body.lastReportedAt) : null,
        createdAt,
        lastSubmittedAt
      );

      const savedRow = db.prepare('SELECT * FROM groups WHERE link = ? LIMIT 1').get(link);
      return sendJson(res, 200, { success: true, group: mapRowToGroup(savedRow) });
    }

    // 7. Single-Group Subroutes (/groups/:id/...)
    const groupActionMatch = pathname.match(/^\/groups\/([A-Za-z0-9_-]+)\/(related|click|vote|rate)$/);
    if (groupActionMatch) {
      const groupId = groupActionMatch[1];
      const action = groupActionMatch[2];

      if (method === 'GET' && action === 'related') {
        const current = db.prepare('SELECT * FROM groups WHERE id = ? LIMIT 1').get(groupId);
        if (!current) return sendJson(res, 200, { success: true, groups: [] });

        const catRows = db
          .prepare(
            'SELECT * FROM groups WHERE category = ? AND id != ? ORDER BY last_submitted_at DESC LIMIT 6'
          )
          .all(current.category, groupId);
        const related = catRows.map(mapRowToGroup);
        if (related.length < 4) {
          const seenIds = new Set([groupId, ...related.map((r) => r.id)]);
          const countryRows = db
            .prepare(
              'SELECT * FROM groups WHERE country = ? AND id != ? ORDER BY last_submitted_at DESC LIMIT 10'
            )
            .all(current.country, groupId);
          for (const cr of countryRows) {
            if (!seenIds.has(cr.id) && related.length < 6) {
              seenIds.add(cr.id);
              related.push(mapRowToGroup(cr));
            }
          }
        }
        return sendJson(res, 200, { success: true, groups: related });
      }

      if (method === 'POST' && action === 'click') {
        if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        const info = db
          .prepare('UPDATE groups SET clicks = clicks + 1 WHERE id = ?')
          .run(groupId);
        return sendJson(res, 200, { success: true, updated: info.changes > 0 });
      }

      if (method === 'POST' && action === 'vote') {
        if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        const body = await readJsonBody(req);
        const isWorking = Boolean(body.isWorking);
        if (isWorking) {
          db.prepare(
            'UPDATE groups SET working_votes = working_votes + 1, last_verified_at = ? WHERE id = ?'
          ).run(new Date().toISOString(), groupId);
        } else {
          db.prepare(
            'UPDATE groups SET broken_votes = broken_votes + 1, report_count = report_count + 1 WHERE id = ?'
          ).run(groupId);
        }
        return sendJson(res, 200, { success: true });
      }

      if (method === 'POST' && action === 'rate') {
        if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        const body = await readJsonBody(req);
        const rating = Number(body.rating);
        if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
          return sendJson(res, 400, { success: false, message: 'Rating must be between 1 and 5.' });
        }
        const existing = db.prepare('SELECT total_rating, rating_count FROM groups WHERE id = ?').get(groupId);
        if (!existing) {
          return sendJson(res, 404, { success: false, message: 'Group not found!' });
        }
        const newTotal = Number(existing.total_rating || 0) + rating;
        const newCount = Number(existing.rating_count || 0) + 1;
        db.prepare('UPDATE groups SET total_rating = ?, rating_count = ? WHERE id = ?').run(
          newTotal,
          newCount,
          groupId
        );
        return sendJson(res, 200, { success: true, newAverage: newTotal / newCount });
      }
    }

    // 8. Single Group GET / PATCH / DELETE
    const groupMatch = pathname.match(/^\/groups\/([A-Za-z0-9_-]+)$/);
    if (groupMatch) {
      const groupId = groupMatch[1];

      if (method === 'GET') {
        const row = db.prepare('SELECT * FROM groups WHERE id = ? LIMIT 1').get(groupId);
        if (!row) return sendJson(res, 404, { success: false, message: 'Group not found' });
        return sendJson(res, 200, { success: true, group: mapRowToGroup(row) });
      }

      if (method === 'PATCH') {
        if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        const existing = db.prepare('SELECT * FROM groups WHERE id = ? LIMIT 1').get(groupId);
        if (!existing) return sendJson(res, 404, { success: false, message: 'Group not found' });

        const body = await readJsonBody(req);
        const nextTitle = body.title !== undefined ? String(body.title).trim() : existing.title;
        const nextDesc = body.description !== undefined ? String(body.description) : existing.description;
        const nextLink = body.link !== undefined ? String(body.link).trim() : existing.link;
        const nextImageUrl = body.imageUrl !== undefined ? String(body.imageUrl) : existing.image_url;
        const nextImageHint = body.imageHint !== undefined ? String(body.imageHint) : existing.image_hint;
        const nextCategory = body.category !== undefined ? sanitizeSlug(body.category) || existing.category : existing.category;
        const nextCountry = body.country !== undefined ? sanitizeSlug(body.country) || existing.country : existing.country;
        const nextLanguage = body.language !== undefined ? sanitizeSlug(body.language) || existing.language : existing.language;
        const nextType = body.type !== undefined && ['group', 'channel', 'community'].includes(body.type) ? body.type : existing.type;
        const nextTags =
          body.tags !== undefined
            ? JSON.stringify(Array.isArray(body.tags) ? body.tags.slice(0, 10) : [])
            : existing.tags;
        const nextFeatured = body.featured !== undefined ? (body.featured ? 1 : 0) : existing.featured;
        const nextStatus = body.status !== undefined ? String(body.status) : existing.status;
        const nextSubmissionCount = body.bumpSubmissionCount
          ? Number(existing.submission_count || 1) + 1
          : existing.submission_count;
        const nextLastSubmittedAt = body.bumpLastSubmittedAt
          ? new Date().toISOString()
          : body.lastSubmittedAt
            ? toIsoOrNow(body.lastSubmittedAt)
            : existing.last_submitted_at;

        db.prepare(`
          UPDATE groups SET
            title = ?, description = ?, link = ?, image_url = ?, image_hint = ?,
            category = ?, country = ?, language = ?, type = ?, tags = ?,
            featured = ?, status = ?, submission_count = ?, last_submitted_at = ?
          WHERE id = ?
        `).run(
          nextTitle,
          nextDesc,
          nextLink,
          nextImageUrl,
          nextImageHint,
          nextCategory,
          nextCountry,
          nextLanguage,
          nextType,
          nextTags,
          nextFeatured,
          nextStatus,
          nextSubmissionCount,
          nextLastSubmittedAt,
          groupId
        );

        const updated = db.prepare('SELECT * FROM groups WHERE id = ? LIMIT 1').get(groupId);
        return sendJson(res, 200, { success: true, group: mapRowToGroup(updated) });
      }

      if (method === 'DELETE') {
        if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
        const info = db.prepare('DELETE FROM groups WHERE id = ?').run(groupId);
        return sendJson(res, 200, { success: true, deleted: info.changes > 0 });
      }
    }

    // 9. Reports
    if (method === 'GET' && pathname === '/reports') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const rows = db.prepare('SELECT * FROM reports ORDER BY created_at DESC LIMIT 100').all();
      const reports = rows.map((r) => ({
        id: r.id,
        groupId: r.group_id,
        groupTitle: r.group_title,
        reason: r.reason,
        status: r.status || 'pending',
        createdAt: r.created_at,
      }));
      return sendJson(res, 200, { success: true, reports });
    }

    if (method === 'POST' && pathname === '/reports') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const id =
        typeof body.id === 'string' && body.id.trim()
          ? body.id.trim().replace(/[^a-zA-Z0-9_-]/g, '')
          : generateId();
      const groupId = String(body.groupId || '').trim();
      const groupTitle = String(body.groupTitle || 'Unknown Group').trim();
      const reason = String(body.reason || 'No reason given').trim();
      const createdAt = body.createdAt ? toIsoOrNow(body.createdAt) : new Date().toISOString();

      if (!groupId) {
        return sendJson(res, 400, { success: false, message: 'groupId is required.' });
      }

      db.prepare(
        'INSERT OR IGNORE INTO reports (id, group_id, group_title, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, groupId, groupTitle, reason, String(body.status || 'pending'), createdAt);

      if (!body.skipGroupCounterUpdate) {
        const isBroken = reason.includes('Revoked') || reason.includes('Broken');
        const isFull = reason.includes('Full');
        const nextStatus = isBroken ? 'revoked' : isFull ? 'full' : null;
        if (nextStatus) {
          db.prepare(
            'UPDATE groups SET report_count = report_count + 1, last_reported_at = ?, status = ? WHERE id = ?'
          ).run(createdAt, nextStatus, groupId);
        } else {
          db.prepare(
            'UPDATE groups SET report_count = report_count + 1, last_reported_at = ? WHERE id = ?'
          ).run(createdAt, groupId);
        }
      }

      return sendJson(res, 200, { success: true, id });
    }

    if (method === 'DELETE' && pathname.startsWith('/reports/')) {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const reportId = decodeURIComponent(pathname.slice('/reports/'.length)).trim();
      db.prepare('DELETE FROM reports WHERE id = ?').run(reportId);
      return sendJson(res, 200, { success: true });
    }

    // 10. Push Subscriptions (FCM tokens stored safely on VPS, zero Firestore quota)
    if (method === 'GET' && pathname === '/push/subscriptions') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const rows = db
        .prepare('SELECT id, token, updated_at FROM push_subscriptions ORDER BY updated_at DESC LIMIT 3000')
        .all();
      return sendJson(res, 200, { success: true, subscriptions: rows });
    }

    if (method === 'POST' && pathname === '/push/subscribe') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const token = String(body.token || '').trim();
      if (!token || token.length < 50 || token.length > 4096) {
        return sendJson(res, 400, { success: false, message: 'Invalid token.' });
      }
      const id = crypto.createHash('sha256').update(token).digest('hex').slice(0, 40);
      const updatedAt = body.updatedAt ? toIsoOrNow(body.updatedAt) : new Date().toISOString();
      db.prepare(
        'INSERT INTO push_subscriptions (id, token, updated_at) VALUES (?, ?, ?) ON CONFLICT(token) DO UPDATE SET updated_at = excluded.updated_at'
      ).run(id, token, updatedAt);
      return sendJson(res, 200, { success: true, id });
    }

    if (method === 'DELETE' && pathname === '/push/subscribe') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const token = String(body.token || '').trim();
      if (token) {
        db.prepare('DELETE FROM push_subscriptions WHERE token = ?').run(token);
      }
      return sendJson(res, 200, { success: true });
    }

    if (method === 'POST' && pathname === '/push/prune') {
      if (!isAuthorized(req)) return sendJson(res, 401, { success: false, message: 'Unauthorized' });
      const body = await readJsonBody(req);
      const tokens = Array.isArray(body.tokens)
        ? body.tokens.filter((t) => typeof t === 'string' && t.trim())
        : [];
      const del = db.prepare('DELETE FROM push_subscriptions WHERE token = ?');
      for (const tok of tokens) del.run(tok.trim());
      return sendJson(res, 200, { success: true, pruned: tokens.length });
    }

    return sendJson(res, 404, { success: false, message: 'Not Found' });
  } catch (err) {
    if (err?.message === 'PAYLOAD_TOO_LARGE') {
      return sendJson(res, 413, { success: false, message: 'Payload too large.' });
    }
    if (err?.message === 'INVALID_JSON') {
      return sendJson(res, 400, { success: false, message: 'Invalid JSON body.' });
    }
    console.error('VPS DB API error:', err);
    return sendJson(res, 500, { success: false, message: 'Internal server error.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(
    `[groupsor-vps-db] Listening on http://${HOST}:${PORT} | engine=${dbEngine} | db=${resolvedAbsDbPath}`
  );
});
