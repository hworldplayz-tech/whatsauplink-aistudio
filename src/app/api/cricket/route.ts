import { NextResponse } from 'next/server';
import { fetchCricketOverviewFromRest } from '@/lib/cricket-feed';
import { getCachedValue } from '@/lib/settings-cache';

export async function GET() {
  const data = await getCachedValue(
    'cricket:overview',
    async () => {
      const overview = await fetchCricketOverviewFromRest();
      if (!overview) {
        throw new Error('Cricket feed unavailable');
      }
      return overview;
    },
    null,
    45_000 // 45s cache on server so 1,000 visitors = ~1-2 upstream requests instead of 1,000 Firestore reads
  );

  if (!data) {
    return NextResponse.json(
      { success: false, message: 'Live cricket feed temporarily unavailable.' },
      { status: 200, headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } }
    );
  }

  return NextResponse.json(
    { success: true, overview: data },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    }
  );
}
