import { DEFAULT_CATEGORIES, DEFAULT_COUNTRIES, resolveCountryCode } from '@/lib/constants';

export interface SimpleTaxonomyItem {
  value: string;
  label: string;
}

const STOP_WORDS = new Set([
  'and',
  'or',
  'the',
  'of',
  'for',
  'in',
  'on',
  'to',
  'by',
  'with',
  'from',
  'all',
  'plus',
  'whatsapp',
  'group',
  'groups',
  'channel',
  'channels',
  'link',
  'links',
  'chat',
  'best',
  'new',
  'top',
  'free',
  'latest',
  'active',
  'official',
  'club',
  'hub',
  'zone',
  'world',
  'daily',
  'tips',
  'guide',
  'other',
  'misc',
]);

const WORD_ROOT_MAP: Record<string, string> = {
  // Adult
  adult: 'adult',
  adults: 'adult',
  '18': 'adult',
  '18+': 'adult',
  nsfw: 'adult',
  // Art & Design
  art: 'art',
  arts: 'art',
  design: 'art',
  designer: 'art',
  photography: 'art',
  photo: 'art',
  photos: 'art',
  drawing: 'art',
  // Business
  business: 'business',
  businesses: 'business',
  marketing: 'business',
  advertising: 'business',
  startup: 'business',
  entrepreneur: 'business',
  // Community
  community: 'community',
  communities: 'community',
  social: 'community',
  // Crypto
  crypto: 'crypto',
  cryptocurrency: 'crypto',
  bitcoin: 'crypto',
  btc: 'crypto',
  forex: 'crypto',
  binance: 'crypto',
  // Friendship & Dating
  dating: 'friendship',
  friendship: 'friendship',
  friend: 'friendship',
  friends: 'friendship',
  relationship: 'friendship',
  relationships: 'friendship',
  family: 'friendship',
  love: 'friendship',
  singles: 'friendship',
  chatting: 'friendship',
  // Shopping & Deals
  shop: 'shopping',
  shopping: 'shopping',
  deal: 'shopping',
  deals: 'shopping',
  discount: 'shopping',
  discounts: 'shopping',
  offer: 'shopping',
  offers: 'shopping',
  buy: 'shopping',
  sell: 'shopping',
  ecommerce: 'shopping',
  // Dramas & Series
  drama: 'drama',
  dramas: 'drama',
  series: 'drama',
  serial: 'drama',
  // Education
  education: 'education',
  educational: 'education',
  study: 'education',
  school: 'education',
  college: 'education',
  exam: 'education',
  exams: 'education',
  learning: 'education',
  learn: 'education',
  students: 'education',
  student: 'education',
  upsc: 'education',
  // Food
  food: 'food',
  cooking: 'food',
  cook: 'food',
  recipe: 'food',
  recipes: 'food',
  kitchen: 'food',
  // Earning & Freelance
  earn: 'earning',
  earning: 'earning',
  earnings: 'earning',
  money: 'earning',
  freelance: 'earning',
  freelancing: 'earning',
  income: 'earning',
  online: 'online',
  // Funny & Memes
  funny: 'funny',
  comedy: 'funny',
  meme: 'funny',
  memes: 'funny',
  joke: 'funny',
  jokes: 'funny',
  humor: 'funny',
  // Gaming
  game: 'gaming',
  games: 'gaming',
  gaming: 'gaming',
  gamer: 'gaming',
  gamers: 'gaming',
  esports: 'gaming',
  freefire: 'gaming',
  // PUBG specific
  pubg: 'pubg',
  bgmi: 'pubg',
  // Health & Fitness
  health: 'health',
  fitness: 'health',
  gym: 'health',
  workout: 'health',
  yoga: 'health',
  medical: 'health',
  // Jobs & Career
  job: 'jobs',
  jobs: 'jobs',
  career: 'jobs',
  hiring: 'jobs',
  vacancy: 'jobs',
  vacancies: 'jobs',
  recruitment: 'jobs',
  // Lifestyle
  lifestyle: 'lifestyle',
  fashion: 'lifestyle',
  style: 'lifestyle',
  clothing: 'lifestyle',
  beauty: 'lifestyle',
  // Movies & TV
  movie: 'movies',
  movies: 'movies',
  film: 'movies',
  films: 'movies',
  cinema: 'movies',
  tv: 'movies',
  shows: 'movies',
  bollywood: 'movies',
  hollywood: 'movies',
  // Music
  music: 'music',
  song: 'music',
  songs: 'music',
  audio: 'music',
  // News & Media
  news: 'news',
  media: 'news',
  newspaper: 'news',
  breaking: 'news',
  // Politics
  politics: 'politics',
  political: 'politics',
  // Quotes & Shayari
  quote: 'quotes',
  quotes: 'quotes',
  shayari: 'quotes',
  poetry: 'quotes',
  poem: 'quotes',
  // Science
  science: 'science',
  // Stock market & Trading
  stock: 'stocks',
  stocks: 'stocks',
  share: 'stocks',
  shares: 'stocks',
  market: 'stocks',
  nifty: 'stocks',
  trading: 'trading',
  trade: 'trading',
  // Sports
  sport: 'sports',
  sports: 'sports',
  cricket: 'sports',
  football: 'sports',
  soccer: 'sports',
  ipl: 'sports',
  // Status & Reels
  status: 'status',
  reel: 'status',
  reels: 'status',
  video: 'status',
  videos: 'status',
  shorts: 'status',
  // Technology
  tech: 'technology',
  technology: 'technology',
  software: 'technology',
  coding: 'technology',
  programming: 'technology',
  ai: 'technology',
  // Travel
  travel: 'travel',
  tourism: 'travel',
  tour: 'travel',
  trips: 'travel',
};

export const CATEGORY_ALIASES: Record<string, SimpleTaxonomyItem> = {
  adult: { value: 'adult-18-plus', label: 'Adult/18+' },
  'adult-18': { value: 'adult-18-plus', label: 'Adult/18+' },
  'adult-18-plus': { value: 'adult-18-plus', label: 'Adult/18+' },
  '18-plus': { value: 'adult-18-plus', label: 'Adult/18+' },
  'adult-and-18': { value: 'adult-18-plus', label: 'Adult/18+' },
  'art-design': { value: 'art-design', label: 'Art & Design' },
  'art-and-design': { value: 'art-design', label: 'Art & Design' },
  'art-photography': { value: 'art-design', label: 'Art & Design' },
  'art-design-photography': { value: 'art-design', label: 'Art & Design' },
  art: { value: 'art-design', label: 'Art & Design' },
  business: { value: 'business', label: 'Business' },
  'business-advertising-marketing': { value: 'business', label: 'Business' },
  community: { value: 'community', label: 'Community' },
  'social-friendship-community': { value: 'community', label: 'Community' },
  crypto: { value: 'crypto-trading', label: 'Crypto & Forex Trading' },
  'crypto-trading': { value: 'crypto-trading', label: 'Crypto & Forex Trading' },
  forex: { value: 'crypto-trading', label: 'Crypto & Forex Trading' },
  dating: { value: 'dating-friendship', label: 'Friendship & Dating' },
  friendship: { value: 'dating-friendship', label: 'Friendship & Dating' },
  'dating-friendship': { value: 'dating-friendship', label: 'Friendship & Dating' },
  'family-relationships': { value: 'dating-friendship', label: 'Friendship & Dating' },
  'chatting-dating': { value: 'dating-friendship', label: 'Friendship & Dating' },
  'friendship-and-dating': { value: 'dating-friendship', label: 'Friendship & Dating' },
  deals: { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  'deals-discounts': { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  shopping: { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  'shopping-buy-sell': { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  'deals-and-offers': { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  dramas: { value: 'dramas-series', label: 'Dramas & Series' },
  'dramas-series': { value: 'dramas-series', label: 'Dramas & Series' },
  education: { value: 'education', label: 'Education' },
  'education-school': { value: 'education', label: 'Education' },
  school: { value: 'education', label: 'Education' },
  study: { value: 'education', label: 'Education' },
  food: { value: 'food-cooking', label: 'Food & Cooking' },
  cooking: { value: 'food-cooking', label: 'Food & Cooking' },
  'food-cooking': { value: 'food-cooking', label: 'Food & Cooking' },
  earning: { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  'money-earning': { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  'online-earning': { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  freelance: { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  freelancing: { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  'freelancing-earning': { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  funny: { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  'comedy-funny': { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  memes: { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  'funny-memes': { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  'funny-and-memes': { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  jokes: { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  gaming: { value: 'gaming', label: 'Gaming' },
  games: { value: 'gaming', label: 'Gaming' },
  'free-fire': { value: 'gaming', label: 'Gaming' },
  health: { value: 'health-fitness', label: 'Health & Fitness' },
  fitness: { value: 'health-fitness', label: 'Health & Fitness' },
  'health-fitness': { value: 'health-fitness', label: 'Health & Fitness' },
  jobs: { value: 'jobs-career', label: 'Jobs & Career' },
  career: { value: 'jobs-career', label: 'Jobs & Career' },
  'jobs-career': { value: 'jobs-career', label: 'Jobs & Career' },
  'jobs-and-career': { value: 'jobs-career', label: 'Jobs & Career' },
  lifestyle: { value: 'lifestyle', label: 'Lifestyle' },
  'fashion-style-clothing': { value: 'lifestyle', label: 'Lifestyle' },
  movies: { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
  'movies-tv': { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
  'movies-tv-shows': { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
  'movies-and-tv': { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
  music: { value: 'music-audio', label: 'Music & Audio' },
  'music-audio': { value: 'music-audio', label: 'Music & Audio' },
  news: { value: 'news-media', label: 'News & Media' },
  'news-media': { value: 'news-media', label: 'News & Media' },
  'news-politics': { value: 'news-media', label: 'News & Media' },
  'news-and-media': { value: 'news-media', label: 'News & Media' },
  politics: { value: 'politics', label: 'Politics' },
  pubg: { value: 'pubg-gaming', label: 'PUBG & BGMI Gaming' },
  bgmi: { value: 'pubg-gaming', label: 'PUBG & BGMI Gaming' },
  'pubg-gaming': { value: 'pubg-gaming', label: 'PUBG & BGMI Gaming' },
  quotes: { value: 'quotes-shayari', label: 'Quotes & Shayari' },
  shayari: { value: 'quotes-shayari', label: 'Quotes & Shayari' },
  'quotes-shayari': { value: 'quotes-shayari', label: 'Quotes & Shayari' },
  science: { value: 'science', label: 'Science' },
  stocks: { value: 'share-market', label: 'Stock Market & Trading' },
  'share-market': { value: 'share-market', label: 'Stock Market & Trading' },
  'stock-market': { value: 'share-market', label: 'Stock Market & Trading' },
  sports: { value: 'sports', label: 'Sports' },
  'sports-games': { value: 'sports', label: 'Sports' },
  cricket: { value: 'sports', label: 'Sports' },
  status: { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  'status-video': { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  'status-videos': { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  reels: { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  tech: { value: 'technology', label: 'Technology' },
  technology: { value: 'technology', label: 'Technology' },
  travel: { value: 'travel-tourism', label: 'Travel & Tourism' },
  'travel-tourism': { value: 'travel-tourism', label: 'Travel & Tourism' },
  entertainment: { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
};

export function slugifyTaxonomy(input: string): string {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/&/g, ' and ')
    .replace(/[\/_|+]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
}

export function toCleanTaxonomyLabel(input: string): string {
  return String(input || '')
    .replace(/[\/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .slice(0, 48);
}

function tokenizeWords(input: string): string[] {
  const parts = String(input || '')
    .toLowerCase()
    .replace(/[\/&,+_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const roots = new Set<string>();
  for (const w of parts) {
    if (w === 'online' && parts.length > 1) {
      // keep specific token rather than letting "online" cross-match unrelated labels
      continue;
    }
    const mapped = WORD_ROOT_MAP[w] || (w.length > 4 && w.endsWith('s') ? WORD_ROOT_MAP[w.slice(0, -1)] || w.slice(0, -1) : w);
    if (mapped.length >= 3 || mapped === '18' || mapped === 'ai') {
      roots.add(mapped);
    }
  }
  return Array.from(roots);
}

/**
 * Resolves any incoming category string to a canonical or word-matched existing category.
 * Prevents duplicate categories like "Business" vs "Business/Advertising/Marketing"
 * or "Art & Design" vs "Art/Design/Photography".
 */
export function resolveCategoryMatch(
  rawCategory: string,
  existingCategories: SimpleTaxonomyItem[] = []
): SimpleTaxonomyItem {
  const cleanRaw = String(rawCategory || '').trim();
  if (!cleanRaw || cleanRaw.toLowerCase() === 'all') {
    return { value: 'community', label: 'Community' };
  }

  const rawSlug = slugifyTaxonomy(cleanRaw);
  const compactSlug = rawSlug.replace(/-and-/g, '-');

  // 1. Direct alias match
  const aliasHit = CATEGORY_ALIASES[rawSlug] || CATEGORY_ALIASES[compactSlug];
  if (aliasHit) {
    return aliasHit;
  }

  // 2. Exact match in canonical defaults
  const defaultExact = DEFAULT_CATEGORIES.find(
    (c) =>
      c.value === rawSlug ||
      c.value === compactSlug ||
      slugifyTaxonomy(c.label) === rawSlug ||
      c.label.toLowerCase() === cleanRaw.toLowerCase()
  );
  if (defaultExact) {
    return { value: defaultExact.value, label: defaultExact.label };
  }

  // 3. Exact match in existing database categories
  const existingExact = existingCategories.find(
    (c) =>
      c.value === rawSlug ||
      c.value === compactSlug ||
      slugifyTaxonomy(c.label) === rawSlug ||
      c.label.toLowerCase() === cleanRaw.toLowerCase()
  );
  if (existingExact) {
    return {
      value: existingExact.value,
      label: existingExact.label || toCleanTaxonomyLabel(existingExact.value),
    };
  }

  // 4. Word-overlap match against canonical defaults + existing categories
  const inputTokens = tokenizeWords(cleanRaw);
  if (inputTokens.length > 0) {
    // Prefer canonical categories first on ties, then cleaner existing categories
    const candidates: Array<{ item: SimpleTaxonomyItem; isCanonical: boolean }> = [
      ...DEFAULT_CATEGORIES.filter((c) => c.value !== 'other').map((c) => ({
        item: { value: c.value, label: c.label },
        isCanonical: true,
      })),
      ...existingCategories
        .filter((c) => c.value !== 'all' && c.value !== 'other')
        .map((c) => ({
          item: { value: c.value, label: c.label || toCleanTaxonomyLabel(c.value) },
          isCanonical: false,
        })),
    ];

    let bestScore = 0;
    let bestCandidate: { item: SimpleTaxonomyItem; isCanonical: boolean } | null = null;

    for (const candidate of candidates) {
      const targetTokens = new Set([
        ...tokenizeWords(candidate.item.label),
        ...tokenizeWords(candidate.item.value),
      ]);
      let overlap = 0;
      for (const tok of inputTokens) {
        if (targetTokens.has(tok)) overlap += 1;
      }
      if (overlap === 0) continue;

      if (
        overlap > bestScore ||
        (overlap === bestScore && bestCandidate && !bestCandidate.isCanonical && candidate.isCanonical) ||
        (overlap === bestScore &&
          bestCandidate &&
          bestCandidate.isCanonical === candidate.isCanonical &&
          candidate.item.label.length < bestCandidate.item.label.length)
      ) {
        bestScore = overlap;
        bestCandidate = candidate;
      }
    }

    if (bestCandidate && bestScore >= 1) {
      return bestCandidate.item;
    }
  }

  // 5. Truly brand-new topic: produce clean slug and Title Case label
  const finalValue = rawSlug || 'other';
  const finalLabel = cleanRaw.includes('/') || cleanRaw === cleanRaw.toLowerCase()
    ? toCleanTaxonomyLabel(cleanRaw)
    : cleanRaw.slice(0, 48);

  return {
    value: finalValue,
    label: finalLabel || toCleanTaxonomyLabel(finalValue) || 'Other',
  };
}

export function resolveCountryMatch(
  rawCountry: string,
  existingCountries: SimpleTaxonomyItem[] = []
): SimpleTaxonomyItem {
  const cleanRaw = String(rawCountry || '').trim();
  if (!cleanRaw || cleanRaw.toLowerCase() === 'all') {
    return { value: 'other', label: 'Other Countries' };
  }

  const lower = cleanRaw.toLowerCase();
  const slug = slugifyTaxonomy(cleanRaw);
  const resolvedCode = resolveCountryCode(lower) !== lower
    ? resolveCountryCode(lower)
    : resolveCountryCode(slug);

  const defaultMatch = DEFAULT_COUNTRIES.find(
    (c) => c.value === resolvedCode || c.value === slug || slugifyTaxonomy(c.label) === slug
  );
  if (defaultMatch) {
    return { value: defaultMatch.value, label: defaultMatch.label };
  }

  const existingMatch = existingCountries.find(
    (c) => c.value === resolvedCode || c.value === slug || c.label.toLowerCase() === lower
  );
  if (existingMatch) {
    return {
      value: existingMatch.value,
      label: existingMatch.label || toCleanTaxonomyLabel(existingMatch.value),
    };
  }

  return {
    value: resolvedCode || slug || 'other',
    label: toCleanTaxonomyLabel(cleanRaw) || 'Other Countries',
  };
}

export function getDisplayCategoryLabel(rawCategory: string): string {
  if (!rawCategory) return 'Community';
  const resolved = resolveCategoryMatch(rawCategory);
  return resolved.label;
}

export function getDisplayCountryLabel(rawCountry: string): string {
  if (!rawCountry) return 'Global';
  const resolved = resolveCountryMatch(rawCountry);
  if (resolved.value === 'us') return 'USA';
  if (resolved.value === 'gb') return 'UK';
  if (resolved.value === 'ae') return 'UAE';
  if (resolved.value === 'other') return 'Global';
  return resolved.label;
}
