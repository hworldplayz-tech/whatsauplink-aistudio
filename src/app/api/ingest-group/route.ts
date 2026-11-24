import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { getLinkPreview } from 'link-preview-js';
import { revalidatePath } from 'next/cache';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
  setDoc,
  addDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { DEFAULT_CATEGORIES, DEFAULT_COUNTRIES, DEFAULT_LANGUAGES } from '@/lib/constants';

function getFirestoreInstance() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

// Constant-time secret check using SHA-256 digests so lengths always match
function isAuthorizedRequest(req: NextRequest, expectedSecret: string): boolean {
  const authHeader = req.headers.get('authorization') || '';
  const apiKeyHeader = req.headers.get('x-api-key') || '';

  let providedToken = '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    providedToken = authHeader.slice(7).trim();
  } else if (apiKeyHeader) {
    providedToken = apiKeyHeader.trim();
  }

  if (!providedToken) return false;

  const expectedHash = crypto.createHash('sha256').update(expectedSecret).digest();
  const providedHash = crypto.createHash('sha256').update(providedToken).digest();
  return crypto.timingSafeEqual(expectedHash, providedHash);
}

// Strict SSRF-safe WhatsApp invite link validation & normalization
function normalizeAndValidateWhatsAppUrl(rawLink: string): {
  valid: boolean;
  normalizedUrl: string;
  typeHint: 'group' | 'channel';
} {
  try {
    const parsed = new URL(rawLink.trim());
    if (parsed.protocol !== 'https:') {
      return { valid: false, normalizedUrl: '', typeHint: 'group' };
    }

    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.replace(/\/+$/, '');

    if (host === 'chat.whatsapp.com') {
      // Accepts both /<CODE> and /invite/<CODE>
      const segments = path.split('/').filter(Boolean);
      const code = segments[0]?.toLowerCase() === 'invite' ? segments[1] : segments[0];
      if (!code || path.includes('..') || !/^[A-Za-z0-9_-]{8,64}$/.test(code)) {
        return { valid: false, normalizedUrl: '', typeHint: 'group' };
      }
      return {
        valid: true,
        normalizedUrl: `https://chat.whatsapp.com/${code}`,
        typeHint: 'group',
      };
    }

    if (host === 'www.whatsapp.com' || host === 'whatsapp.com') {
      if (!path.startsWith('/channel/')) {
        return { valid: false, normalizedUrl: '', typeHint: 'channel' };
      }
      const channelId = path.replace('/channel/', '').split('/').filter(Boolean)[0];
      if (!channelId || !/^[A-Za-z0-9_-]{8,80}$/.test(channelId)) {
        return { valid: false, normalizedUrl: '', typeHint: 'channel' };
      }
      return {
        valid: true,
        normalizedUrl: `https://www.whatsapp.com/channel/${channelId}`,
        typeHint: 'channel',
      };
    }

    return { valid: false, normalizedUrl: '', typeHint: 'group' };
  } catch {
    return { valid: false, normalizedUrl: '', typeHint: 'group' };
  }
}

function isSafeHttpsImageUrl(url: string | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return '';
  } catch {
    return '';
  }
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

function toTitleLabel(input: string): string {
  return input
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .slice(0, 48);
}

const CATEGORY_ALIASES: Record<string, { value: string; label: string }> = {
  adult: { value: 'adult-18-plus', label: 'Adult/18+' },
  'adult-18': { value: 'adult-18-plus', label: 'Adult/18+' },
  '18-plus': { value: 'adult-18-plus', label: 'Adult/18+' },
  'adult-and-18': { value: 'adult-18-plus', label: 'Adult/18+' },
  'art-and-design': { value: 'art-design', label: 'Art & Design' },
  art: { value: 'art-design', label: 'Art & Design' },
  business: { value: 'business', label: 'Business' },
  community: { value: 'community', label: 'Community' },
  crypto: { value: 'crypto-trading', label: 'Crypto & Forex Trading' },
  'crypto-trading': { value: 'crypto-trading', label: 'Crypto & Forex Trading' },
  forex: { value: 'crypto-trading', label: 'Crypto & Forex Trading' },
  dating: { value: 'dating-friendship', label: 'Friendship & Dating' },
  friendship: { value: 'dating-friendship', label: 'Friendship & Dating' },
  'chatting-dating': { value: 'dating-friendship', label: 'Friendship & Dating' },
  'friendship-and-dating': { value: 'dating-friendship', label: 'Friendship & Dating' },
  deals: { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  shopping: { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  'deals-and-offers': { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  dramas: { value: 'dramas-series', label: 'Dramas & Series' },
  education: { value: 'education', label: 'Education' },
  'education-school': { value: 'education', label: 'Education' },
  school: { value: 'education', label: 'Education' },
  study: { value: 'education', label: 'Education' },
  food: { value: 'food-cooking', label: 'Food & Cooking' },
  cooking: { value: 'food-cooking', label: 'Food & Cooking' },
  earning: { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  'online-earning': { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  freelance: { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  freelancing: { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  funny: { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  memes: { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  'funny-and-memes': { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  jokes: { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  gaming: { value: 'gaming', label: 'Gaming' },
  games: { value: 'gaming', label: 'Gaming' },
  health: { value: 'health-fitness', label: 'Health & Fitness' },
  fitness: { value: 'health-fitness', label: 'Health & Fitness' },
  jobs: { value: 'jobs-career', label: 'Jobs & Career' },
  career: { value: 'jobs-career', label: 'Jobs & Career' },
  'jobs-and-career': { value: 'jobs-career', label: 'Jobs & Career' },
  lifestyle: { value: 'lifestyle', label: 'Lifestyle' },
  movies: { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
  'movies-and-tv': { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
  music: { value: 'music-audio', label: 'Music & Audio' },
  news: { value: 'news-media', label: 'News & Media' },
  'news-and-media': { value: 'news-media', label: 'News & Media' },
  politics: { value: 'politics', label: 'Politics' },
  pubg: { value: 'pubg-gaming', label: 'PUBG & BGMI Gaming' },
  bgmi: { value: 'pubg-gaming', label: 'PUBG & BGMI Gaming' },
  'free-fire': { value: 'gaming', label: 'Gaming' },
  science: { value: 'science', label: 'Science' },
  stocks: { value: 'share-market', label: 'Stock Market & Trading' },
  'share-market': { value: 'share-market', label: 'Stock Market & Trading' },
  trading: { value: 'share-market', label: 'Stock Market & Trading' },
  sports: { value: 'sports', label: 'Sports' },
  cricket: { value: 'sports', label: 'Sports' },
  status: { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  'status-videos': { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  reels: { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  tech: { value: 'technology', label: 'Technology' },
  technology: { value: 'technology', label: 'Technology' },
  travel: { value: 'travel-tourism', label: 'Travel & Tourism' },
};

const COUNTRY_NAME_TO_CODE: Record<string, { value: string; label: string }> = {
  australia: { value: 'au', label: 'Australia' },
  au: { value: 'au', label: 'Australia' },
  bangladesh: { value: 'bd', label: 'Bangladesh' },
  bd: { value: 'bd', label: 'Bangladesh' },
  canada: { value: 'ca', label: 'Canada' },
  ca: { value: 'ca', label: 'Canada' },
  india: { value: 'in', label: 'India' },
  in: { value: 'in', label: 'India' },
  indonesia: { value: 'id', label: 'Indonesia' },
  id: { value: 'id', label: 'Indonesia' },
  malaysia: { value: 'my', label: 'Malaysia' },
  my: { value: 'my', label: 'Malaysia' },
  pakistan: { value: 'pk', label: 'Pakistan' },
  pk: { value: 'pk', label: 'Pakistan' },
  philippines: { value: 'ph', label: 'Philippines' },
  ph: { value: 'ph', label: 'Philippines' },
  singapore: { value: 'sg', label: 'Singapore' },
  sg: { value: 'sg', label: 'Singapore' },
  uae: { value: 'ae', label: 'UAE' },
  ae: { value: 'ae', label: 'UAE' },
  'united-arab-emirates': { value: 'ae', label: 'UAE' },
  'united-kingdom': { value: 'gb', label: 'United Kingdom' },
  uk: { value: 'gb', label: 'United Kingdom' },
  gb: { value: 'gb', label: 'United Kingdom' },
  'united-states': { value: 'us', label: 'United States' },
  usa: { value: 'us', label: 'United States' },
  us: { value: 'us', label: 'United States' },
  international: { value: 'other', label: 'Other Countries' },
  global: { value: 'other', label: 'Other Countries' },
  worldwide: { value: 'other', label: 'Other Countries' },
  any: { value: 'other', label: 'Other Countries' },
  other: { value: 'other', label: 'Other Countries' },
};

const LANGUAGE_ALIASES: Record<string, string> = {
  english: 'en',
  en: 'en',
  hindi: 'hi',
  hi: 'hi',
  spanish: 'es',
  es: 'es',
  urdu: 'ur',
  ur: 'ur',
  arabic: 'ar',
  ar: 'ar',
  portuguese: 'pt',
  pt: 'pt',
  bengali: 'bn',
  bangla: 'bn',
  bn: 'bn',
  tamil: 'ta',
  ta: 'ta',
  telugu: 'te',
  te: 'te',
  indonesian: 'id',
  bahasa: 'id',
  id: 'id',
  german: 'de',
  de: 'de',
  french: 'fr',
  fr: 'fr',
  russian: 'ru',
  ru: 'ru',
};

function sanitizeTags(tagsInput: string[] | string | undefined, extras: string[]): string[] {
  const combined: string[] = [];
  if (Array.isArray(tagsInput)) {
    combined.push(...tagsInput);
  } else if (typeof tagsInput === 'string') {
    combined.push(...tagsInput.split(','));
  }
  combined.push(...extras);

  const cleaned = combined
    .map((tag) =>
      String(tag || '')
        .trim()
        .replace(/[^a-zA-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 30)
    )
    .filter((tag) => tag.length > 1);

  const seen = new Set<string>();
  const unique: string[] = [];
  for (const t of cleaned) {
    const lower = t.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      unique.push(t);
    }
    if (unique.length >= 10) break;
  }
  return unique;
}

async function ensureCategoryExists(
  db: ReturnType<typeof getFirestoreInstance>,
  rawCategory: string
): Promise<{ value: string; label: string; created: boolean }> {
  const rawSlug = slugify(rawCategory) || 'other';
  const alias = CATEGORY_ALIASES[rawSlug];
  const defaultMatch = DEFAULT_CATEGORIES.find(
    (c) => c.value === rawSlug || slugify(c.label) === rawSlug
  );

  const resolvedValue = alias?.value || defaultMatch?.value || rawSlug;
  const resolvedLabel =
    alias?.label ||
    defaultMatch?.label ||
    (rawCategory.trim().length >= 2 ? rawCategory.trim().slice(0, 48) : toTitleLabel(resolvedValue));

  const catCollection = collection(db, 'categories');
  const existingSnapshot = await getDocs(query(catCollection, limit(1)));

  // If categories collection is empty in Firestore, seed defaults first so the dropdown never shrinks
  if (existingSnapshot.empty) {
    const batch = writeBatch(db);
    DEFAULT_CATEGORIES.forEach((cat) => {
      batch.set(doc(db, 'categories', cat.value), { label: cat.label, value: cat.value });
    });
    await batch.commit();
  }

  const targetRef = doc(db, 'categories', resolvedValue);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) {
    await setDoc(targetRef, { label: resolvedLabel, value: resolvedValue });
    return { value: resolvedValue, label: resolvedLabel, created: true };
  }

  const data = targetSnap.data();
  return {
    value: resolvedValue,
    label: (data?.label as string) || resolvedLabel,
    created: false,
  };
}

async function ensureCountryExists(
  db: ReturnType<typeof getFirestoreInstance>,
  rawCountry: string
): Promise<{ value: string; label: string; created: boolean }> {
  const rawSlug = slugify(rawCountry) || 'other';
  const alias = COUNTRY_NAME_TO_CODE[rawSlug];
  const defaultMatch = DEFAULT_COUNTRIES.find(
    (c) => c.value === rawSlug || slugify(c.label) === rawSlug
  );

  const resolvedValue = alias?.value || defaultMatch?.value || rawSlug;
  const resolvedLabel =
    alias?.label ||
    defaultMatch?.label ||
    (rawCountry.trim().length >= 2 ? rawCountry.trim().slice(0, 48) : toTitleLabel(resolvedValue));

  const countryCollection = collection(db, 'countries');
  const existingSnapshot = await getDocs(query(countryCollection, limit(1)));

  if (existingSnapshot.empty) {
    const batch = writeBatch(db);
    DEFAULT_COUNTRIES.forEach((c) => {
      batch.set(doc(db, 'countries', c.value), { label: c.label, value: c.value });
    });
    await batch.commit();
  }

  const targetRef = doc(db, 'countries', resolvedValue);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) {
    await setDoc(targetRef, { label: resolvedLabel, value: resolvedValue });
    return { value: resolvedValue, label: resolvedLabel, created: true };
  }

  const data = targetSnap.data();
  return {
    value: resolvedValue,
    label: (data?.label as string) || resolvedLabel,
    created: false,
  };
}

const ingestSchema = z.object({
  link: z.string().min(10).max(300),
  title: z.string().max(200).optional(),
  description: z.string().max(2000).optional(),
  category: z.string().min(1).max(80).optional(),
  country: z.string().min(1).max(80).optional(),
  language: z.string().max(40).optional(),
  type: z.enum(['group', 'channel', 'community']).optional(),
  tags: z.union([z.string().max(500), z.array(z.string().max(40)).max(15)]).optional(),
  imageUrl: z.string().max(1000).optional(),
  fetchWhatsAppMeta: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const secret = process.env.INGEST_API_SECRET;
  if (!secret || secret.trim().length < 16) {
    return NextResponse.json(
      { success: false, message: 'Ingestion endpoint is not configured (INGEST_API_SECRET missing).' },
      { status: 503 }
    );
  }

  if (!isAuthorizedRequest(req, secret.trim())) {
    return NextResponse.json(
      { success: false, message: 'Unauthorized.' },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Invalid JSON payload.' }, { status: 400 });
  }

  const parsed = ingestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: 'Validation failed.', errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const linkCheck = normalizeAndValidateWhatsAppUrl(input.link);
  if (!linkCheck.valid) {
    return NextResponse.json(
      { success: false, message: 'Link must be a valid https://chat.whatsapp.com/... or https://www.whatsapp.com/channel/... URL.' },
      { status: 400 }
    );
  }

  try {
    const db = getFirestoreInstance();
    const groupsRef = collection(db, 'groups');

    // Duplicate check by normalized WhatsApp link
    const existingSnap = await getDocs(query(groupsRef, where('link', '==', linkCheck.normalizedUrl), limit(1)));
    if (!existingSnap.empty) {
      return NextResponse.json({
        success: true,
        status: 'skipped',
        reason: 'already_exists',
        groupId: existingSnap.docs[0].id,
      });
    }

    // Fetch live WhatsApp metadata (safe because linkCheck.normalizedUrl is strictly WhatsApp host)
    let waTitle = '';
    let waDescription = '';
    let waImageUrl = '';

    if (input.fetchWhatsAppMeta !== false) {
      try {
        const preview = await getLinkPreview(linkCheck.normalizedUrl, {
          followRedirects: 'follow',
          timeout: 8000,
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        if (preview && 'title' in preview && typeof preview.title === 'string') {
          const rawTitle = preview.title.trim();
          const lower = rawTitle.toLowerCase();
          if (
            rawTitle &&
            !lower.includes('whatsapp group invite') &&
            !lower.includes('share on whatsapp') &&
            !lower.includes('couldn\'t find')
          ) {
            waTitle = rawTitle;
          }
        }
        if (preview && 'description' in preview && typeof preview.description === 'string') {
          const rawDesc = preview.description.trim();
          if (rawDesc && !rawDesc.toLowerCase().includes('whatsapp group invite')) {
            waDescription = rawDesc;
          }
        }
        if (preview && 'images' in preview && Array.isArray(preview.images) && preview.images[0]) {
          waImageUrl = isSafeHttpsImageUrl(String(preview.images[0]));
        }
      } catch (metaErr) {
        console.warn('WhatsApp preview fetch fallback to crawled data:', metaErr);
      }
    }

    const fallbackImageUrl = isSafeHttpsImageUrl(input.imageUrl);
    const finalTitle = (waTitle || input.title || '').trim().slice(0, 150);
    if (finalTitle.length < 3) {
      return NextResponse.json(
        { success: false, message: 'Could not resolve a valid group title from WhatsApp or crawler payload.' },
        { status: 422 }
      );
    }

    const finalDescription = (
      waDescription ||
      input.description ||
      `Join ${finalTitle} active WhatsApp ${linkCheck.typeHint} on Groupsor. Connect with members and stay updated.`
    )
      .trim()
      .slice(0, 1200);

    const finalImageUrl =
      waImageUrl ||
      fallbackImageUrl ||
      '/groupsor_logo.png';

    const categoryResult = await ensureCategoryExists(db, input.category || 'community');
    const countryResult = await ensureCountryExists(db, input.country || 'other');

    const rawLang = slugify(input.language || 'en');
    const validLangValues = new Set(DEFAULT_LANGUAGES.map((l) => l.value));
    const finalLanguage =
      LANGUAGE_ALIASES[rawLang] || (validLangValues.has(rawLang) ? rawLang : 'en');

    const finalTags = sanitizeTags(input.tags, [
      categoryResult.label,
      countryResult.label !== 'Other Countries' ? countryResult.label : '',
    ]);

    const imageHint = finalTitle
      .split(/\s+/)
      .slice(0, 2)
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

    const newGroup = {
      title: finalTitle,
      description: finalDescription,
      link: linkCheck.normalizedUrl,
      imageUrl: finalImageUrl,
      imageHint: imageHint || 'whatsapp group',
      category: categoryResult.value,
      country: countryResult.value,
      language: finalLanguage,
      type: input.type || linkCheck.typeHint,
      tags: finalTags,
      featured: false,
      clicks: 0,
      submissionCount: 1,
      totalRating: 0,
      ratingCount: 0,
      isVerified: Boolean(waTitle || waImageUrl),
      status: 'active',
      createdAt: serverTimestamp(),
      lastSubmittedAt: serverTimestamp(),
    };

    const docRef = await addDoc(groupsRef, newGroup);

    revalidatePath('/');
    revalidatePath(`/category/${categoryResult.value}`);
    revalidatePath(`/country/${countryResult.value}`);
    revalidatePath(`/group/invite/${docRef.id}`);
    revalidatePath('/sitemap.xml');

    return NextResponse.json({
      success: true,
      status: 'created',
      groupId: docRef.id,
      title: finalTitle,
      category: categoryResult,
      country: countryResult,
      usedWhatsAppMeta: Boolean(waTitle || waImageUrl),
    });
  } catch (error: any) {
    console.error('Error in /api/ingest-group:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to ingest group.' },
      { status: 500 }
    );
  }
}
