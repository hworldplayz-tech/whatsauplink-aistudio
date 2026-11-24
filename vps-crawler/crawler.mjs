import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_FILE = path.join(__dirname, '.env');
const STATE_FILE = path.join(__dirname, 'state.json');

// Built-in .env loader (no external dotenv package required)
if (fs.existsSync(ENV_FILE)) {
  const envRaw = fs.readFileSync(ENV_FILE, 'utf8');
  for (const line of envRaw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

const TARGET_URL = (process.env.TARGET_URL || 'https://groupsor.link').replace(/\/+$/, '');
const INGEST_URL = process.env.GROUPSOR_INGEST_URL || 'https://www.groupsor.co.uk/api/ingest-group';
const INGEST_SECRET = (process.env.INGEST_API_SECRET || '').trim();
const MAX_LATEST = Math.max(1, Math.min(25, Number(process.env.MAX_LATEST || 10)));
const POLL_INTERVAL_MINUTES = Math.max(1, Number(process.env.POLL_INTERVAL_MINUTES || 5));
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const RUN_ONCE = process.argv.includes('--once');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function log(msg, ...args) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`, ...args);
}

async function loadState() {
  try {
    const raw = await fsp.readFile(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      seenKeys: Array.isArray(parsed.seenKeys) ? parsed.seenKeys : [],
      lastRunAt: parsed.lastRunAt || null,
    };
  } catch {
    return { seenKeys: [], lastRunAt: null };
  }
}

async function saveState(state) {
  const trimmed = {
    seenKeys: state.seenKeys.slice(-500),
    lastRunAt: new Date().toISOString(),
  };
  await fsp.writeFile(STATE_FILE, JSON.stringify(trimmed, null, 2), 'utf8');
}

async function waitForCloudflareAndContent(page, timeoutMs = 25000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = await page
      .evaluate(() => {
        const title = (document.title || '').toLowerCase();
        const bodyText = (document.body?.innerText || '').toLowerCase();
        const isChallenge =
          title.includes('just a moment') ||
          title.includes('attention required') ||
          bodyText.includes('verify you are human') ||
          bodyText.includes('checking your browser') ||
          Boolean(document.querySelector('#challenge-running, #challenge-stage, .cf-browser-verification'));
        const linkCount = document.querySelectorAll('a, button').length;
        return { isChallenge, linkCount };
      })
      .catch(() => ({ isChallenge: true, linkCount: 0 }));

    if (!info.isChallenge && info.linkCount > 2) {
      return true;
    }
    await sleep(700);
  }
  return false;
}

async function scrapeLatestList(page) {
  await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const ok = await waitForCloudflareAndContent(page, 25000);
  if (!ok) {
    const title = await page.title().catch(() => '');
    throw new Error(`Timed out waiting for Cloudflare/content (page title: "${title}").`);
  }

  await sleep(800);

  const items = await page.evaluate((baseOrigin) => {
    const results = [];
    const seenInviteIds = new Set();

    const anchors = Array.from(document.querySelectorAll('a[href]'));
    for (const a of anchors) {
      const rawHref = a.getAttribute('href') || '';
      if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('javascript:')) continue;

      let absUrl = '';
      try {
        absUrl = new URL(rawHref, baseOrigin).toString().split('#')[0];
      } catch {
        continue;
      }

      // Extract the trailing WhatsApp invite ID from /group/invite/<ID>, /group/join/<ID>, or /group/rules/<ID>
      const match = absUrl.match(/\/group\/(?:invite|join|rules)\/([A-Za-z0-9_-]{10,64})/i);
      if (!absUrl.startsWith(baseOrigin) || !match || !match[1]) continue;

      const inviteId = match[1];
      if (seenInviteIds.has(inviteId)) continue;
      seenInviteIds.add(inviteId);

      const card =
        a.closest('.maindiv, .card, .group-card, .post, article, .col, .item, li, .border') ||
        a.parentElement?.parentElement ||
        a.parentElement;

      const cardLinks = card ? Array.from(card.querySelectorAll('a[href]')) : [];

      let cardCategory = '';
      let cardCountry = '';
      let cardLanguage = '';
      const cardTags = [];

      for (const cl of cardLinks) {
        const ch = (cl.getAttribute('href') || '').toLowerCase();
        const txt = (cl.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt) continue;
        if (ch.includes('/category') && !cardCategory) {
          cardCategory = txt;
        } else if (ch.includes('/country') && !cardCountry) {
          cardCountry = txt;
        } else if ((ch.includes('/language') || ch.includes('/lang')) && !cardLanguage) {
          cardLanguage = txt;
        } else if (ch.includes('/tag')) {
          cardTags.push(txt.replace(/^#/, ''));
        }
      }

      const tagSpans = card
        ? Array.from(card.querySelectorAll('.tag, .tags a, .tags span, .badge, a[href*="tag"]'))
        : [];
      for (const el of tagSpans) {
        const t = (el.textContent || '').replace(/\s+/g, ' ').trim().replace(/^#/, '');
        if (t && t.length > 1 && t.length <= 30 && !t.toLowerCase().includes('join')) {
          cardTags.push(t);
        }
      }

      const imgEl = card?.querySelector('img');
      const cardImage = imgEl?.getAttribute('src') || imgEl?.getAttribute('data-src') || '';

      const headingEl = card?.querySelector('h1, h2, h3, h4, .title, .group-title, b, strong');
      let cardTitle = (headingEl?.textContent || '').replace(/\s+/g, ' ').trim();
      if (!cardTitle || /join group|continue reading/i.test(cardTitle)) {
        const titleAnchor = cardLinks.find((cl) => {
          const txt = (cl.textContent || '').trim();
          return txt.length > 2 && !/join group|continue reading|share/i.test(txt);
        });
        cardTitle = (titleAnchor?.textContent || '').replace(/\s+/g, ' ').trim();
      }

      const descEl = card?.querySelector('p, .desc, .description, .group-desc');
      const cardDesc = (descEl?.textContent || '')
        .replace(/continue reading/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

      results.push({
        key: inviteId,
        inviteUrl: `${baseOrigin}/group/invite/${inviteId}`,
        whatsappLink: `https://chat.whatsapp.com/${inviteId}`,
        cardTitle,
        cardDesc,
        cardCategory,
        cardCountry,
        cardLanguage,
        cardTags: Array.from(new Set(cardTags)),
        cardImage: cardImage ? new URL(cardImage, baseOrigin).toString() : '',
      });
    }

    return results;
  }, TARGET_URL);

  return items.slice(0, MAX_LATEST);
}

async function scrapeGroupMetadata(page, candidate) {
  const result = {
    link: candidate.whatsappLink,
    title: candidate.cardTitle || '',
    description: candidate.cardDesc || '',
    category: candidate.cardCategory || '',
    country: candidate.cardCountry || '',
    language: candidate.cardLanguage || '',
    tags: candidate.cardTags || [],
    imageUrl: candidate.cardImage || '',
  };

  try {
    await page.goto(candidate.inviteUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await waitForCloudflareAndContent(page, 15000);
    await sleep(400);

    const detail = await page.evaluate((baseOrigin) => {
      const allLinks = Array.from(document.querySelectorAll('a[href]')).map((a) => ({
        rawHref: a.getAttribute('href') || '',
        text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
      }));

      let category = '';
      let country = '';
      let language = '';
      const tags = [];

      for (const l of allLinks) {
        const raw = l.rawHref.toLowerCase();
        if (!l.text) continue;
        if (raw.includes('/category') && !category) {
          category = l.text;
        } else if (raw.includes('/country') && !country) {
          country = l.text;
        } else if ((raw.includes('/language') || raw.includes('/lang')) && !language) {
          language = l.text;
        } else if (raw.includes('/tag')) {
          tags.push(l.text.replace(/^#/, ''));
        }
      }

      const titleEl = document.querySelector('h1, h2, h3, .group-title, .title, center b, center strong');
      const title = (titleEl?.textContent || '').replace(/\s+/g, ' ').trim();

      const knownCountries = [
        'united states', 'usa', 'india', 'pakistan', 'united kingdom', 'uk',
        'bangladesh', 'indonesia', 'malaysia', 'philippines', 'singapore',
        'uae', 'united arab emirates', 'canada', 'australia', 'international',
        'nigeria', 'kenya', 'saudi arabia', 'south africa', 'germany', 'france',
        'brazil', 'turkey', 'egypt', 'nepal', 'sri lanka', 'uganda', 'ghana'
      ];
      const knownLanguages = [
        'english', 'hindi', 'urdu', 'arabic', 'spanish', 'portuguese',
        'bengali', 'bangla', 'tamil', 'telugu', 'indonesian', 'bahasa',
        'german', 'french', 'russian', 'punjabi', 'persian', 'turkish', 'malay'
      ];

      const metaCandidates = Array.from(
        document.querySelectorAll('.meta, .group-meta, .category, .country, .language, center p, center div, .info, .details, .details span, .details a, h1 + div, h1 + p, h2 + div, h2 + p')
      );
      for (const el of metaCandidates) {
        const txt = (el.textContent || '').replace(/\s+/g, ' ').trim();
        if (!txt || txt.length > 140) continue;

        const lowerTxt = txt.toLowerCase();
        if (!country) {
          const matchedCountry = knownCountries.find((c) => lowerTxt.includes(c));
          if (matchedCountry) {
            const idx = lowerTxt.indexOf(matchedCountry);
            country = txt.slice(idx, idx + matchedCountry.length).trim();
          }
        }
        if (!language) {
          const matchedLang = knownLanguages.find((l) => lowerTxt.includes(l));
          if (matchedLang) {
            const idx = lowerTxt.indexOf(matchedLang);
            language = txt.slice(idx, idx + matchedLang.length).trim();
          }
        }
        if (!category) {
          let cleaned = txt;
          if (country) cleaned = cleaned.replace(new RegExp(country, 'i'), '|');
          if (language) cleaned = cleaned.replace(new RegExp(language, 'i'), '|');
          const firstChunk = cleaned.split('|')[0]?.trim();
          if (firstChunk && firstChunk.length >= 3 && firstChunk.length <= 55 && !/^\d{4}-\d{2}-\d{2}/.test(firstChunk)) {
            category = firstChunk;
          }
        }
      }

      const textareaVal = document.querySelector('textarea')?.value?.trim() || '';
      const descBox = document.querySelector('.description, .group-desc, .desc, .box, pre');
      const boxText = (descBox?.textContent || '').replace(/\s+/g, ' ').trim();
      const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
      const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') || '';
      const ogImg = document.querySelector('meta[property="og:image"]')?.getAttribute('content') || '';

      const imgs = Array.from(document.querySelectorAll('img')).map((img) => ({
        src: img.getAttribute('src') || '',
      }));
      const groupImg = imgs.find(
        (i) =>
          i.src &&
          !i.src.toLowerCase().includes('logo') &&
          !i.src.toLowerCase().includes('whatsapp') &&
          !i.src.toLowerCase().includes('twitter') &&
          !i.src.startsWith('data:')
      );

      return {
        title: (title || ogTitle || '').replace(/\s*[-|]\s*groupsor.*$/i, '').trim(),
        description: textareaVal || boxText || metaDesc || '',
        category,
        country,
        language,
        tags,
        imageUrl: groupImg ? new URL(groupImg.src, baseOrigin).toString() : ogImg,
      };
    }, TARGET_URL);

    result.title = detail.title || result.title;
    result.description = detail.description || result.description;
    result.category = detail.category || result.category || 'community';
    result.country = detail.country || result.country || 'other';
    result.language = detail.language || result.language || 'en';
    result.tags = Array.from(new Set([...(result.tags || []), ...(detail.tags || [])]));
    result.imageUrl = detail.imageUrl || result.imageUrl;
  } catch (err) {
    log(`Notice: Metadata page fallback for ${candidate.key}:`, err.message);
    result.category = result.category || 'community';
    result.country = result.country || 'other';
    result.language = result.language || 'en';
  }

  return result;
}

async function postToGroupsor(payload) {
  if (DRY_RUN) {
    log('[DRY_RUN] Would ingest:', JSON.stringify(payload));
    return { success: true, status: 'dry_run' };
  }

  if (!INGEST_SECRET) {
    throw new Error('INGEST_API_SECRET is missing in .env');
  }

  const res = await fetch(INGEST_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${INGEST_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Ingest API HTTP ${res.status}: ${data.message || res.statusText}`);
  }
  return data;
}

let isCycleRunning = false;

async function runCrawlCycle() {
  if (isCycleRunning) {
    log('Previous crawl cycle still active, skipping tick.');
    return;
  }
  isCycleRunning = true;

  let browser;
  try {
    const state = await loadState();
    const seenSet = new Set(state.seenKeys);

    log(`Starting crawl cycle against ${TARGET_URL} (tracking latest ${MAX_LATEST} groups)...`);

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      locale: 'en-US',
      timezoneId: 'UTC',
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    });

    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
      window.chrome = { runtime: {} };
    });

    await context.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      if (resourceType === 'image' || resourceType === 'media' || resourceType === 'font') {
        return route.abort();
      }
      return route.continue();
    });

    const page = await context.newPage();

    const latestCandidates = await scrapeLatestList(page);
    log(`Found ${latestCandidates.length} unique group(s) in top ${MAX_LATEST}.`);

    const newCandidates = latestCandidates.filter((item) => !seenSet.has(item.key));
    if (newCandidates.length === 0) {
      log('No new groups found in the latest 10.');
      await saveState(state);
      return;
    }

    log(`Detected ${newCandidates.length} new group(s). Posting oldest-first so newest lands on top...`);

    const orderedToProcess = [...newCandidates].reverse();

    for (const candidate of orderedToProcess) {
      try {
        await sleep(500 + Math.floor(Math.random() * 400));
        const groupData = await scrapeGroupMetadata(page, candidate);

        const ingestPayload = {
          link: groupData.link,
          title: groupData.title,
          description: groupData.description,
          category: groupData.category,
          country: groupData.country,
          language: groupData.language,
          tags: groupData.tags,
          imageUrl: groupData.imageUrl,
          type: 'group',
          fetchWhatsAppMeta: true,
        };

        const response = await postToGroupsor(ingestPayload);
        log(
          `Processed "${response.title || groupData.title || groupData.link}" -> status=${response.status || 'ok'}, category=${response.category?.value || groupData.category}, country=${response.country?.value || groupData.country}`
        );

        state.seenKeys.push(candidate.key);
        seenSet.add(candidate.key);
        await saveState(state);
      } catch (itemErr) {
        log(`Error processing ${candidate.key}:`, itemErr.message);
      }
    }
  } catch (err) {
    log('Crawl cycle error:', err.message);
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
    isCycleRunning = false;
  }
}

async function main() {
  log(`Groupsor VPS Crawler booted. Poll interval: ${POLL_INTERVAL_MINUTES} min | Max latest: ${MAX_LATEST}`);
  await runCrawlCycle();

  if (RUN_ONCE) {
    log('Single-run mode (--once) completed. Exiting.');
    process.exit(0);
  }

  setInterval(() => {
    runCrawlCycle().catch((err) => log('Scheduled run error:', err.message));
  }, POLL_INTERVAL_MINUTES * 60 * 1000);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
EOF
