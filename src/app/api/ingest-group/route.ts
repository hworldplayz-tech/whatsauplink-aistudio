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
import { sendNewGroupPushNotification } from '@/lib/fcm-server';
import {
  isVpsDbEnabled,
  vpsCreateOrUpsertGroup,
  vpsGetCategories,
  vpsGetCountries,
  vpsGetGroupByLink,
  vpsSaveCategory,
  vpsSaveCountry,
} from '@/lib/vps-db';
import { invalidateCachedKey } from '@/lib/settings-cache';
import {
  resolveCategoryMatch,
  resolveCountryMatch,
  slugifyTaxonomy,
} from '@/lib/taxonomy-normalizer';

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
  return slugifyTaxonomy(input);
}

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
  const catCollection = collection(db, 'categories');
  const existingSnapshot = await getDocs(catCollection);

  if (existingSnapshot.empty) {
    const batch = writeBatch(db);
    DEFAULT_CATEGORIES.forEach((cat) => {
      batch.set(doc(db, 'categories', cat.value), { label: cat.label, value: cat.value });
    });
    await batch.commit();
  }

  const existingList = existingSnapshot.docs.map((d) => ({
    value: String(d.data()?.value || d.id),
    label: String(d.data()?.label || d.id),
  }));

  const resolved = resolveCategoryMatch(rawCategory, existingList);
  const targetRef = doc(db, 'categories', resolved.value);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) {
    await setDoc(targetRef, { label: resolved.label, value: resolved.value });
    return { value: resolved.value, label: resolved.label, created: true };
  }

  const data = targetSnap.data();
  return {
    value: resolved.value,
    label: (data?.label as string) || resolved.label,
    created: false,
  };
}

async function ensureCountryExists(
  db: ReturnType<typeof getFirestoreInstance>,
  rawCountry: string
): Promise<{ value: string; label: string; created: boolean }> {
  const countryCollection = collection(db, 'countries');
  const existingSnapshot = await getDocs(countryCollection);

  if (existingSnapshot.empty) {
    const batch = writeBatch(db);
    DEFAULT_COUNTRIES.forEach((c) => {
      batch.set(doc(db, 'countries', c.value), { label: c.label, value: c.value });
    });
    await batch.commit();
  }

  const existingList = existingSnapshot.docs.map((d) => ({
    value: String(d.data()?.value || d.id),
    label: String(d.data()?.label || d.id),
  }));

  const resolved = resolveCountryMatch(rawCountry, existingList);
  const targetRef = doc(db, 'countries', resolved.value);
  const targetSnap = await getDoc(targetRef);
  if (!targetSnap.exists()) {
    await setDoc(targetRef, { label: resolved.label, value: resolved.value });
    return { value: resolved.value, label: resolved.label, created: true };
  }

  const data = targetSnap.data();
  return {
    value: resolved.value,
    label: (data?.label as string) || resolved.label,
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
    const useVpsDb = isVpsDbEnabled();

    if (useVpsDb) {
      const existing = await vpsGetGroupByLink(linkCheck.normalizedUrl);
      if (existing) {
        return NextResponse.json({
          success: true,
          status: 'skipped',
          reason: 'already_exists',
          groupId: existing.id,
        });
      }
    } else {
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

    let categoryResult: { value: string; label: string; created: boolean };
    let countryResult: { value: string; label: string; created: boolean };

    if (useVpsDb) {
      const existingCats = await vpsGetCategories();
      const resolvedCat = resolveCategoryMatch(input.category || 'community', existingCats);
      const existingCat = existingCats.find((c) => c.value === resolvedCat.value);
      if (!existingCat) {
        await vpsSaveCategory(resolvedCat.value, resolvedCat.label);
        invalidateCachedKey('vps:categories');
        categoryResult = { value: resolvedCat.value, label: resolvedCat.label, created: true };
      } else {
        categoryResult = {
          value: resolvedCat.value,
          label: existingCat.label || resolvedCat.label,
          created: false,
        };
      }

      const existingCountries = await vpsGetCountries();
      const resolvedCountry = resolveCountryMatch(input.country || 'other', existingCountries);
      const existingCountry = existingCountries.find((c) => c.value === resolvedCountry.value);
      if (!existingCountry) {
        await vpsSaveCountry(resolvedCountry.value, resolvedCountry.label);
        invalidateCachedKey('vps:countries');
        countryResult = { value: resolvedCountry.value, label: resolvedCountry.label, created: true };
      } else {
        countryResult = {
          value: resolvedCountry.value,
          label: existingCountry.label || resolvedCountry.label,
          created: false,
        };
      }
    } else {
      const db = getFirestoreInstance();
      categoryResult = await ensureCategoryExists(db, input.category || 'community');
      countryResult = await ensureCountryExists(db, input.country || 'other');
    }

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

    let createdId = '';
    const finalType = input.type || linkCheck.typeHint;

    if (useVpsDb) {
      const created = await vpsCreateOrUpsertGroup({
        title: finalTitle,
        description: finalDescription,
        link: linkCheck.normalizedUrl,
        imageUrl: finalImageUrl,
        imageHint: imageHint || 'whatsapp group',
        category: categoryResult.value,
        country: countryResult.value,
        language: finalLanguage,
        type: finalType,
        tags: finalTags,
        featured: false,
        clicks: 0,
        submissionCount: 1,
        totalRating: 0,
        ratingCount: 0,
        isVerified: Boolean(waTitle || waImageUrl),
        status: 'active',
      });
      createdId = created.id;
    } else {
      const db = getFirestoreInstance();
      const groupsRef = collection(db, 'groups');
      const newGroup = {
        title: finalTitle,
        description: finalDescription,
        link: linkCheck.normalizedUrl,
        imageUrl: finalImageUrl,
        imageHint: imageHint || 'whatsapp group',
        category: categoryResult.value,
        country: countryResult.value,
        language: finalLanguage,
        type: finalType,
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
      createdId = docRef.id;
    }

    await sendNewGroupPushNotification({
      groupId: createdId,
      title: finalTitle,
      type: finalType,
      imageUrl: finalImageUrl,
    }).catch((err) => {
      console.error('Background push send error (ingest):', err);
    });

    revalidatePath('/');
    revalidatePath(`/category/${categoryResult.value}`);
    revalidatePath(`/country/${countryResult.value}`);
    revalidatePath(`/group/invite/${createdId}`);
    revalidatePath('/sitemap.xml');

    return NextResponse.json({
      success: true,
      status: 'created',
      groupId: createdId,
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
