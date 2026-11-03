
'use server';

export type TickerItem = {
  id: string;
  type: 'sport' | 'news';
  data: Match | NewsArticle;
};

export type Match = {
  id: string;
  teamA: string;
  teamALogo: string;
  teamB: string;
  teamBLogo: string;
  scoreA: number | null;
  scoreB: number | null;
  status: string;
  elapsed: number | null;
  league: string;
  leagueLogo: string;
  timestamp: number;
};

export type NewsArticle = {
  title: string;
  url: string;
  source: string;
};

const FALLBACK_TICKER_NEWS: NewsArticle[] = [
  {
    title: "Discover 10,000+ active WhatsApp groups and community channels worldwide",
    url: "/",
    source: "WhatsUpLink",
  },
  {
    title: "Submit your WhatsApp group link today for free to get discovered by thousands",
    url: "/submit",
    source: "Community",
  },
  {
    title: "Trending: PUBG, Free Fire, and mobile gaming community groups now open",
    url: "/category/gaming",
    source: "Trending",
  },
  {
    title: "Join active entertainment, movie fans, and music discussion groups",
    url: "/category/entertainment",
    source: "Popular",
  },
  {
    title: "Safety Tip: Never share personal passwords or one-time codes in public groups",
    url: "/blog/5-tips-for-safely-joining-public-whatsapp-groups",
    source: "Safety Guide",
  },
];

const getNews = async (): Promise<NewsArticle[]> => {
    const apiKey = process.env.NEWS_API_KEY;
    if (!apiKey) {
      return [];
    }

    const sources = 'techcrunch,the-verge,wired,ars-technica';
    const url = `https://newsapi.org/v2/top-headlines?sources=${sources}&apiKey=${apiKey}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            return [];
        }

        const data = await response.json();
        if (!data.articles || data.articles.length === 0) {
            return [];
        }

        return data.articles.slice(0, 15).map((article: any) => ({
            title: article.title,
            url: article.url,
            source: article.source.name,
        }));

    } catch (error) {
        console.warn('Notice: Could not fetch news from NewsAPI:', error);
        return [];
    }
}

const getSportsFixtures = async (): Promise<Match[]> => {
    const apiKey = process.env.RAPIDAPI_KEY;
    if (!apiKey) {
      return [];
    }
    
    const fetchFixtures = async (params: string) => {
        try {
            const response = await fetch(
                `https://api-football-v1.p.rapidapi.com/v3/fixtures?${params}`,
                {
                    headers: {
                        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com',
                        'x-rapidapi-key': apiKey,
                    },
                }
            );

            if (!response.ok) {
                return [];
            }

            const data = await response.json();
            
            if (!data.response || data.response.length === 0) {
                return [];
            }
            
            return data.response.map((item: any) => ({
                id: String(item.fixture.id),
                teamA: item.teams.home.name,
                teamALogo: item.teams.home.logo,
                teamB: item.teams.away.name,
                teamBLogo: item.teams.away.logo,
                scoreA: item.goals.home,
                scoreB: item.goals.away,
                status: item.fixture.status.short,
                elapsed: item.fixture.status.elapsed,
                league: item.league.name,
                leagueLogo: item.league.logo,
                timestamp: item.fixture.timestamp
            }));

        } catch (error) {
            console.warn(`Notice: Could not fetch sports fixtures for params "${params}":`, error);
            return [];
        }
    }

    // 1. Try to get live matches first
    const liveMatches = await fetchFixtures('live=all');
    if (liveMatches.length > 0) {
        return liveMatches;
    }

    // 2. If no live matches, get today's upcoming matches
    const today = new Date().toISOString().split('T')[0];
    const upcomingMatches = await fetchFixtures(`date=${today}&status=NS`);
    if (upcomingMatches.length > 0) {
        return upcomingMatches.sort((a: Match, b: Match) => a.timestamp - b.timestamp); // Sort by soonest first
    }
    
    // 3. If no live or upcoming, return empty
    return [];
}


// In-memory cache to avoid hitting third-party APIs repeatedly without crashing on serverless Workers
let tickerMemoryCache: { items: TickerItem[]; expiresAt: number } | null = null;

export async function getTickerData(): Promise<TickerItem[]> {
  const now = Date.now();
  if (tickerMemoryCache && tickerMemoryCache.expiresAt > now) {
    return tickerMemoryCache.items;
  }

  try {
    const sportsData = await getSportsFixtures();
    if (sportsData.length > 0) {
        const items: TickerItem[] = sportsData.map(match => ({
            id: match.id,
            type: 'sport' as const,
            data: match,
        }));
        tickerMemoryCache = { items, expiresAt: now + 10 * 60 * 1000 };
        return items;
    }
    
    const newsData = await getNews();
    if (newsData.length > 0) {
        const items: TickerItem[] = newsData.map((article, index) => ({
            id: `news-${index}`,
            type: 'news' as const,
            data: article,
        }));
        tickerMemoryCache = { items, expiresAt: now + 10 * 60 * 1000 };
        return items;
    }

    // Fallback announcements when external keys are not configured
    const fallbackItems: TickerItem[] = FALLBACK_TICKER_NEWS.map((article, index) => ({
      id: `notice-${index}`,
      type: 'news' as const,
      data: article,
    }));
    tickerMemoryCache = { items: fallbackItems, expiresAt: now + 10 * 60 * 1000 };
    return fallbackItems;
  } catch (error) {
    console.warn('Notice: Error resolving ticker data, using fallback announcements:', error);
  }

  return FALLBACK_TICKER_NEWS.map((article, index) => ({
    id: `notice-${index}`,
    type: 'news' as const,
    data: article,
  }));
}

