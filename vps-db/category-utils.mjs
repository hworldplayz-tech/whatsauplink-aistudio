export const DEFAULT_COUNTRIES = [
  { label: 'Australia', value: 'au' },
  { label: 'Bangladesh', value: 'bd' },
  { label: 'Brazil', value: 'br' },
  { label: 'Canada', value: 'ca' },
  { label: 'Egypt', value: 'eg' },
  { label: 'France', value: 'fr' },
  { label: 'Germany', value: 'de' },
  { label: 'Ghana', value: 'gh' },
  { label: 'India', value: 'in' },
  { label: 'Indonesia', value: 'id' },
  { label: 'Kenya', value: 'ke' },
  { label: 'Malaysia', value: 'my' },
  { label: 'Nepal', value: 'np' },
  { label: 'Nigeria', value: 'ng' },
  { label: 'Pakistan', value: 'pk' },
  { label: 'Philippines', value: 'ph' },
  { label: 'Saudi Arabia', value: 'sa' },
  { label: 'Singapore', value: 'sg' },
  { label: 'South Africa', value: 'za' },
  { label: 'Sri Lanka', value: 'lk' },
  { label: 'Turkey', value: 'tr' },
  { label: 'UAE', value: 'ae' },
  { label: 'Uganda', value: 'ug' },
  { label: 'United Kingdom', value: 'gb' },
  { label: 'United States', value: 'us' },
  { label: 'Other Countries', value: 'other' },
];

export const DEFAULT_CATEGORIES = [
  { label: 'Adult/18+', value: 'adult-18-plus' },
  { label: 'Art & Design', value: 'art-design' },
  { label: 'Business', value: 'business' },
  { label: 'Community', value: 'community' },
  { label: 'Crypto & Forex Trading', value: 'crypto-trading' },
  { label: 'Friendship & Dating', value: 'dating-friendship' },
  { label: 'Shopping Deals & Offers', value: 'deals-discounts' },
  { label: 'Dramas & Series', value: 'dramas-series' },
  { label: 'Education', value: 'education' },
  { label: 'Food & Cooking', value: 'food-cooking' },
  { label: 'Online Earning & Freelance', value: 'freelancing-earning' },
  { label: 'Funny Memes & Jokes', value: 'funny-memes' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Health & Fitness', value: 'health-fitness' },
  { label: 'Jobs & Career', value: 'jobs-career' },
  { label: 'Lifestyle', value: 'lifestyle' },
  { label: 'Movies & TV Shows', value: 'movies-tv-shows' },
  { label: 'Music & Audio', value: 'music-audio' },
  { label: 'News & Media', value: 'news-media' },
  { label: 'Politics', value: 'politics' },
  { label: 'PUBG & BGMI Gaming', value: 'pubg-gaming' },
  { label: 'Quotes & Shayari', value: 'quotes-shayari' },
  { label: 'Science', value: 'science' },
  { label: 'Stock Market & Trading', value: 'share-market' },
  { label: 'Sports', value: 'sports' },
  { label: 'WhatsApp Status & Reels', value: 'status-videos' },
  { label: 'Technology', value: 'technology' },
  { label: 'Travel & Tourism', value: 'travel-tourism' },
  { label: 'Other', value: 'other' },
];

const STOP_WORDS = new Set([
  'and', 'or', 'the', 'of', 'for', 'in', 'on', 'to', 'by', 'with', 'from',
  'all', 'plus', 'whatsapp', 'group', 'groups', 'channel', 'channels',
  'link', 'links', 'chat', 'best', 'new', 'top', 'free', 'latest', 'active',
  'official', 'club', 'hub', 'zone', 'world', 'daily', 'tips', 'guide',
  'other', 'misc',
]);

const WORD_ROOT_MAP = {
  adult: 'adult', adults: 'adult', '18': 'adult', '18+': 'adult', nsfw: 'adult',
  art: 'art', arts: 'art', design: 'art', designer: 'art', photography: 'art',
  photo: 'art', photos: 'art', drawing: 'art',
  business: 'business', businesses: 'business', marketing: 'business',
  advertising: 'business', startup: 'business', entrepreneur: 'business',
  community: 'community', communities: 'community', social: 'community',
  crypto: 'crypto', cryptocurrency: 'crypto', bitcoin: 'crypto', btc: 'crypto',
  forex: 'crypto', binance: 'crypto',
  dating: 'friendship', friendship: 'friendship', friend: 'friendship',
  friends: 'friendship', relationship: 'friendship', relationships: 'friendship',
  family: 'friendship', love: 'friendship', singles: 'friendship', chatting: 'friendship',
  shop: 'shopping', shopping: 'shopping', deal: 'shopping', deals: 'shopping',
  discount: 'shopping', discounts: 'shopping', offer: 'shopping', offers: 'shopping',
  buy: 'shopping', sell: 'shopping', ecommerce: 'shopping',
  drama: 'drama', dramas: 'drama', series: 'drama', serial: 'drama',
  education: 'education', educational: 'education', study: 'education',
  school: 'education', college: 'education', exam: 'education', exams: 'education',
  learning: 'education', learn: 'education', students: 'education', student: 'education',
  food: 'food', cooking: 'food', cook: 'food', recipe: 'food', recipes: 'food',
  earn: 'earning', earning: 'earning', earnings: 'earning', money: 'earning',
  freelance: 'earning', freelancing: 'earning', income: 'earning', online: 'online',
  funny: 'funny', comedy: 'funny', meme: 'funny', memes: 'funny',
  joke: 'funny', jokes: 'funny', humor: 'funny',
  game: 'gaming', games: 'gaming', gaming: 'gaming', gamer: 'gaming',
  gamers: 'gaming', esports: 'gaming', freefire: 'gaming',
  pubg: 'pubg', bgmi: 'pubg',
  health: 'health', fitness: 'health', gym: 'health', workout: 'health',
  yoga: 'health', medical: 'health',
  job: 'jobs', jobs: 'jobs', career: 'jobs', hiring: 'jobs',
  vacancy: 'jobs', vacancies: 'jobs', recruitment: 'jobs',
  lifestyle: 'lifestyle', fashion: 'lifestyle', style: 'lifestyle',
  clothing: 'lifestyle', beauty: 'lifestyle',
  movie: 'movies', movies: 'movies', film: 'movies', films: 'movies',
  cinema: 'movies', tv: 'movies', shows: 'movies', bollywood: 'movies', hollywood: 'movies',
  music: 'music', song: 'music', songs: 'music', audio: 'music',
  news: 'news', media: 'news', newspaper: 'news', breaking: 'news',
  politics: 'politics', political: 'politics',
  quote: 'quotes', quotes: 'quotes', shayari: 'quotes', poetry: 'quotes', poem: 'quotes',
  science: 'science',
  stock: 'stocks', stocks: 'stocks', share: 'stocks', shares: 'stocks',
  market: 'stocks', nifty: 'stocks', trading: 'trading', trade: 'trading',
  sport: 'sports', sports: 'sports', cricket: 'sports', football: 'sports',
  soccer: 'sports', ipl: 'sports',
  status: 'status', reel: 'status', reels: 'status', video: 'status',
  videos: 'status', shorts: 'status',
  tech: 'technology', technology: 'technology', software: 'technology',
  coding: 'technology', programming: 'technology', ai: 'technology',
  travel: 'travel', tourism: 'travel', tour: 'travel', trips: 'travel',
};

const CATEGORY_ALIASES = {
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

const COUNTRY_SLUG_TO_CODE = {
  in: 'in', india: 'in',
  us: 'us', usa: 'us', 'united-states': 'us', 'united states': 'us',
  pk: 'pk', pakistan: 'pk',
  gb: 'gb', uk: 'gb', 'united-kingdom': 'gb', 'united kingdom': 'gb',
  ae: 'ae', uae: 'ae', 'united-arab-emirates': 'ae', 'united arab emirates': 'ae',
  ca: 'ca', canada: 'ca',
  au: 'au', australia: 'au',
  bd: 'bd', bangladesh: 'bd',
  id: 'id', indonesia: 'id',
  my: 'my', malaysia: 'my',
  ph: 'ph', philippines: 'ph',
  sg: 'sg', singapore: 'sg',
  ng: 'ng', nigeria: 'ng',
  ke: 'ke', kenya: 'ke',
  sa: 'sa', 'saudi-arabia': 'sa', 'saudi arabia': 'sa',
  za: 'za', 'south-africa': 'za', 'south africa': 'za',
  np: 'np', nepal: 'np',
  lk: 'lk', 'sri-lanka': 'lk', 'sri lanka': 'lk',
  ug: 'ug', uganda: 'ug',
  gh: 'gh', ghana: 'gh',
  eg: 'eg', egypt: 'eg',
  tr: 'tr', turkey: 'tr',
  de: 'de', germany: 'de',
  fr: 'fr', france: 'fr',
  br: 'br', brazil: 'br',
  mx: 'mx', mexico: 'mx',
  ar: 'ar', argentina: 'ar',
  ru: 'ru', russia: 'ru',
  ma: 'ma', morocco: 'ma',
  it: 'it', italy: 'it',
  es: 'es', spain: 'es',
  nl: 'nl', netherlands: 'nl',
  international: 'other', global: 'other', worldwide: 'other',
  any: 'other', other: 'other', 'other-countries': 'other',
};

export function slugifyTaxonomy(input) {
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

export function toCleanTaxonomyLabel(input) {
  return String(input || '')
    .replace(/[\/_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .slice(0, 48);
}

function tokenizeWords(input) {
  const parts = String(input || '')
    .toLowerCase()
    .replace(/[\/&,+_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !STOP_WORDS.has(w));

  const roots = new Set();
  for (const w of parts) {
    if (w === 'online' && parts.length > 1) continue;
    const mapped =
      WORD_ROOT_MAP[w] ||
      (w.length > 4 && w.endsWith('s') ? WORD_ROOT_MAP[w.slice(0, -1)] || w.slice(0, -1) : w);
    if (mapped.length >= 3 || mapped === '18' || mapped === 'ai') {
      roots.add(mapped);
    }
  }
  return Array.from(roots);
}

export function resolveCategoryMatch(rawCategory, existingCategories = []) {
  const cleanRaw = String(rawCategory || '').trim();
  if (!cleanRaw || cleanRaw.toLowerCase() === 'all') {
    return { value: 'community', label: 'Community' };
  }

  const rawSlug = slugifyTaxonomy(cleanRaw);
  const compactSlug = rawSlug.replace(/-and-/g, '-');

  const aliasHit = CATEGORY_ALIASES[rawSlug] || CATEGORY_ALIASES[compactSlug];
  if (aliasHit) return aliasHit;

  const defaultExact = DEFAULT_CATEGORIES.find(
    (c) =>
      c.value === rawSlug ||
      c.value === compactSlug ||
      slugifyTaxonomy(c.label) === rawSlug ||
      c.label.toLowerCase() === cleanRaw.toLowerCase()
  );
  if (defaultExact) return { value: defaultExact.value, label: defaultExact.label };

  const existingExact = existingCategories.find(
    (c) =>
      c.value === rawSlug ||
      c.value === compactSlug ||
      slugifyTaxonomy(c.label) === rawSlug ||
      String(c.label || '').toLowerCase() === cleanRaw.toLowerCase()
  );
  if (existingExact) {
    return {
      value: existingExact.value,
      label: existingExact.label || toCleanTaxonomyLabel(existingExact.value),
    };
  }

  const inputTokens = tokenizeWords(cleanRaw);
  if (inputTokens.length > 0) {
    const candidates = [
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
    let bestCandidate = null;

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

  const finalValue = rawSlug || 'other';
  const finalLabel =
    cleanRaw.includes('/') || cleanRaw === cleanRaw.toLowerCase()
      ? toCleanTaxonomyLabel(cleanRaw)
      : cleanRaw.slice(0, 48);

  return {
    value: finalValue,
    label: finalLabel || toCleanTaxonomyLabel(finalValue) || 'Other',
  };
}

export function resolveCountryMatch(rawCountry, existingCountries = []) {
  const cleanRaw = String(rawCountry || '').trim();
  if (!cleanRaw || cleanRaw.toLowerCase() === 'all') {
    return { value: 'other', label: 'Other Countries' };
  }

  const lower = cleanRaw.toLowerCase();
  const slug = slugifyTaxonomy(cleanRaw);
  const resolvedCode = COUNTRY_SLUG_TO_CODE[lower] || COUNTRY_SLUG_TO_CODE[slug] || slug;

  const defaultMatch = DEFAULT_COUNTRIES.find(
    (c) => c.value === resolvedCode || c.value === slug || slugifyTaxonomy(c.label) === slug
  );
  if (defaultMatch) return { value: defaultMatch.value, label: defaultMatch.label };

  const existingMatch = existingCountries.find(
    (c) =>
      c.value === resolvedCode ||
      c.value === slug ||
      String(c.label || '').toLowerCase() === lower
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

/**
 * Cleans up duplicate/word-overlapping categories and unnormalized countries
 * across both taxonomy tables and existing group rows in SQLite.
 */
export function normalizeAllTaxonomiesAndGroups(db) {
  const existingCats = db.prepare('SELECT value, label FROM categories').all();
  const existingCountries = db.prepare('SELECT value, label FROM countries').all();
  const distinctGroupCats = db.prepare('SELECT DISTINCT category FROM groups').all();
  const distinctGroupCountries = db.prepare('SELECT DISTINCT country FROM groups').all();

  const catInputs = new Map();
  for (const row of existingCats) {
    catInputs.set(row.value, row.label || row.value);
  }
  for (const row of distinctGroupCats) {
    if (row.category && !catInputs.has(row.category)) {
      catInputs.set(row.category, row.category);
    }
  }

  const countryInputs = new Map();
  for (const row of existingCountries) {
    countryInputs.set(row.value, row.label || row.value);
  }
  for (const row of distinctGroupCountries) {
    if (row.country && !countryInputs.has(row.country)) {
      countryInputs.set(row.country, row.country);
    }
  }

  const keptCategories = new Map();
  for (const def of DEFAULT_CATEGORIES) {
    keptCategories.set(def.value, def.label);
  }

  const categoryRedirects = [];
  for (const [oldVal, oldLabel] of catInputs.entries()) {
    const resolvedByValue = resolveCategoryMatch(oldVal, DEFAULT_CATEGORIES);
    const resolvedByLabel = resolveCategoryMatch(oldLabel, DEFAULT_CATEGORIES);
    const preferred =
      DEFAULT_CATEGORIES.some((d) => d.value === resolvedByValue.value)
        ? resolvedByValue
        : resolvedByLabel;

    if (!keptCategories.has(preferred.value)) {
      keptCategories.set(preferred.value, preferred.label);
    }
    if (oldVal !== preferred.value) {
      categoryRedirects.push({ from: oldVal, to: preferred.value });
    }
  }

  const keptCountries = new Map();
  for (const def of DEFAULT_COUNTRIES) {
    keptCountries.set(def.value, def.label);
  }

  const countryRedirects = [];
  for (const [oldVal, oldLabel] of countryInputs.entries()) {
    const resolved = resolveCountryMatch(oldVal, DEFAULT_COUNTRIES);
    const resolvedByLabel =
      resolved.value === oldVal && !DEFAULT_COUNTRIES.some((d) => d.value === resolved.value)
        ? resolveCountryMatch(oldLabel, DEFAULT_COUNTRIES)
        : resolved;

    if (!keptCountries.has(resolvedByLabel.value)) {
      keptCountries.set(resolvedByLabel.value, resolvedByLabel.label);
    }
    if (oldVal !== resolvedByLabel.value) {
      countryRedirects.push({ from: oldVal, to: resolvedByLabel.value });
    }
  }

  let updatedGroups = 0;
  let mergedCategories = 0;
  let mergedCountries = 0;

  db.exec('BEGIN');
  try {
    const updGroupCat = db.prepare('UPDATE groups SET category = ? WHERE category = ?');
    const delOldCat = db.prepare('DELETE FROM categories WHERE value = ?');
    const upsertCat = db.prepare(
      'INSERT INTO categories (value, label) VALUES (?, ?) ON CONFLICT(value) DO UPDATE SET label = excluded.label'
    );

    for (const [val, label] of keptCategories.entries()) {
      upsertCat.run(val, label);
    }
    for (const r of categoryRedirects) {
      const info = updGroupCat.run(r.to, r.from);
      updatedGroups += Number(info.changes || 0);
      delOldCat.run(r.from);
      mergedCategories += 1;
    }

    const updGroupCountry = db.prepare('UPDATE groups SET country = ? WHERE country = ?');
    const delOldCountry = db.prepare('DELETE FROM countries WHERE value = ?');
    const upsertCountry = db.prepare(
      'INSERT INTO countries (value, label) VALUES (?, ?) ON CONFLICT(value) DO UPDATE SET label = excluded.label'
    );

    for (const [val, label] of keptCountries.entries()) {
      upsertCountry.run(val, label);
    }
    for (const r of countryRedirects) {
      const info = updGroupCountry.run(r.to, r.from);
      updatedGroups += Number(info.changes || 0);
      delOldCountry.run(r.from);
      mergedCountries += 1;
    }

    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }

  return {
    mergedCategories,
    mergedCountries,
    updatedGroups,
    totalCategories: keptCategories.size,
    totalCountries: keptCountries.size,
  };
}
