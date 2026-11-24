import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, orderBy, limit as fsLimit } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { mapDocToGroupLink } from '@/lib/data';

function getFirestoreInstance() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function sanitizeSlug(raw: string | null): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .slice(0, 60);
}

function toSafeHttpsUrl(raw: string | undefined, fallback: string): string {
  if (!raw) return fallback;
  try {
    if (raw.startsWith('/')) {
      return `https://www.groupsor.co.uk${raw}`;
    }
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = sanitizeSlug(searchParams.get('category'));
    const country = sanitizeSlug(searchParams.get('country'));
    const typeParam = sanitizeSlug(searchParams.get('type'));
    const searchQ = (searchParams.get('q') || '').trim().toLowerCase().slice(0, 60);
    const rawLimit = Number(searchParams.get('limit') || 6);
    const limitCount = Number.isFinite(rawLimit) ? Math.max(1, Math.min(20, Math.floor(rawLimit))) : 6;
    const rawPage = Number(searchParams.get('page') || 1);
    const page = Number.isFinite(rawPage) ? Math.max(1, Math.min(50, Math.floor(rawPage))) : 1;

    const db = getFirestoreInstance();
    const groupsCol = collection(db, 'groups');

    const constraints: any[] = [];
    if (category && category !== 'all') {
      constraints.push(where('category', '==', category));
    }
    if (country && country !== 'all') {
      constraints.push(where('country', '==', country));
    }
    if (typeParam && (typeParam === 'group' || typeParam === 'channel' || typeParam === 'community')) {
      constraints.push(where('type', '==', typeParam));
    }

    const fetchWindow = Math.min(300, Math.max(80, page * limitCount + 25));

    let snapshot;
    if (constraints.length === 0) {
      snapshot = await getDocs(query(groupsCol, orderBy('lastSubmittedAt', 'desc'), fsLimit(fetchWindow)));
    } else {
      // Avoid composite index errors by filtering in Firestore and sorting in memory
      snapshot = await getDocs(query(groupsCol, ...constraints, fsLimit(fetchWindow)));
    }

    let items = snapshot.docs.map(mapDocToGroupLink);

    // Sort newest first
    items.sort((a, b) => {
      const tA = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0;
      const tB = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0;
      return tB - tA;
    });

    // Optional keyword search
    if (searchQ) {
      items = items.filter((g) => {
        const hay = `${g.title} ${g.description} ${(g.tags || []).join(' ')} ${g.category}`.toLowerCase();
        return hay.includes(searchQ);
      });
    }

    const startIndex = (page - 1) * limitCount;
    const pagedItems = items.slice(startIndex, startIndex + limitCount);
    const hasMore = items.length > startIndex + limitCount;

    // Strip internal moderation fields & project strictly public widget fields
    const publicGroups = pagedItems.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description.length > 140 ? `${g.description.slice(0, 137)}...` : g.description,
      category: g.category,
      country: g.country,
      type: g.type,
      imageUrl: toSafeHttpsUrl(g.imageUrl, 'https://www.groupsor.co.uk/groupsor_logo.png'),
      tags: (g.tags || []).slice(0, 3),
      isVerified: Boolean(g.isVerified),
      createdAt: g.createdAt,
      groupsorUrl: `https://www.groupsor.co.uk/group/invite/${encodeURIComponent(g.id)}`,
      joinUrl: toSafeHttpsUrl(g.link, `https://www.groupsor.co.uk/group/invite/${encodeURIComponent(g.id)}`),
    }));

    return NextResponse.json(
      {
        success: true,
        source: 'Groupsor',
        website: 'https://www.groupsor.co.uk',
        page,
        limit: limitCount,
        hasMore,
        count: publicGroups.length,
        groups: publicGroups,
      },
      {
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        },
      }
    );
  } catch (error) {
    console.error('Error in /api/public/groups:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to load public groups.' },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
