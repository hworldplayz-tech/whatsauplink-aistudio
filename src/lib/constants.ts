

export const DEFAULT_COUNTRIES = [
  { value: 'au', label: 'Australia' },
  { value: 'bd', label: 'Bangladesh' },
  { value: 'ca', label: 'Canada' },
  { value: 'in', label: 'India' },
  { value: 'id', label: 'Indonesia' },
  { value: 'my', label: 'Malaysia' },
  { value: 'pk', label: 'Pakistan' },
  { value: 'ph', label: 'Philippines' },
  { value: 'sg', label: 'Singapore' },
  { value: 'ae', label: 'UAE' },
  { value: 'gb', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'other', label: 'Other Countries' },
];

export const DEFAULT_CATEGORIES = [
  { value: 'adult-18-plus', label: 'Adult/18+' },
  { value: 'art-design', label: 'Art & Design' },
  { value: 'business', label: 'Business' },
  { value: 'community', label: 'Community' },
  { value: 'crypto-trading', label: 'Crypto & Forex Trading' },
  { value: 'dating-friendship', label: 'Friendship & Dating' },
  { value: 'deals-discounts', label: 'Shopping Deals & Offers' },
  { value: 'dramas-series', label: 'Dramas & Series' },
  { value: 'education', label: 'Education' },
  { value: 'food-cooking', label: 'Food & Cooking' },
  { value: 'freelancing-earning', label: 'Online Earning & Freelance' },
  { value: 'funny-memes', label: 'Funny Memes & Jokes' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'health-fitness', label: 'Health & Fitness' },
  { value: 'jobs-career', label: 'Jobs & Career' },
  { value: 'lifestyle', label: 'Lifestyle' },
  { value: 'movies-tv-shows', label: 'Movies & TV Shows' },
  { value: 'music-audio', label: 'Music & Audio' },
  { value: 'news-media', label: 'News & Media' },
  { value: 'politics', label: 'Politics' },
  { value: 'pubg-gaming', label: 'PUBG & BGMI Gaming' },
  { value: 'science', label: 'Science' },
  { value: 'share-market', label: 'Stock Market & Trading' },
  { value: 'sports', label: 'Sports' },
  { value: 'status-videos', label: 'WhatsApp Status & Reels' },
  { value: 'technology', label: 'Technology' },
  { value: 'travel-tourism', label: 'Travel & Tourism' },
  { value: 'other', label: 'Other' },
];

export const GROUP_TYPES = [
  { value: 'all', label: 'All Types' },
  { value: 'group', label: 'Groups' },
  { value: 'channel', label: 'Channels' },
  { value: 'community', label: 'Communities' },
];

export const DEFAULT_LANGUAGES = [
  { value: 'all', label: 'All Languages' },
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'Hindi (हिंदी)' },
  { value: 'es', label: 'Spanish (Español)' },
  { value: 'ur', label: 'Urdu (اردو)' },
  { value: 'ar', label: 'Arabic (العربية)' },
  { value: 'pt', label: 'Portuguese (Português)' },
  { value: 'bn', label: 'Bengali (বাংলা)' },
  { value: 'ta', label: 'Tamil (தமிழ்)' },
  { value: 'te', label: 'Telugu (తెలుగు)' },
  { value: 'id', label: 'Indonesian (Bahasa)' },
  { value: 'de', label: 'German (Deutsch)' },
  { value: 'fr', label: 'French (Français)' },
  { value: 'ru', label: 'Russian (Русский)' },
  { value: 'other', label: 'Other Language' },
];

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Recently Added' },
  { value: 'popular', label: 'Most Popular (Views)' },
  { value: 'trending', label: 'Trending Today' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'trust', label: 'Highest Trust (Working)' },
];

export interface CityItem {
  slug: string;
  name: string;
  countryCode: string;
}

export const POPULAR_CITIES_BY_COUNTRY: Record<string, CityItem[]> = {
  in: [
    { slug: 'mumbai', name: 'Mumbai', countryCode: 'in' },
    { slug: 'delhi', name: 'Delhi', countryCode: 'in' },
    { slug: 'bangalore', name: 'Bangalore', countryCode: 'in' },
    { slug: 'hyderabad', name: 'Hyderabad', countryCode: 'in' },
    { slug: 'chennai', name: 'Chennai', countryCode: 'in' },
    { slug: 'kolkata', name: 'Kolkata', countryCode: 'in' },
    { slug: 'pune', name: 'Pune', countryCode: 'in' },
    { slug: 'ahmedabad', name: 'Ahmedabad', countryCode: 'in' },
    { slug: 'jaipur', name: 'Jaipur', countryCode: 'in' },
    { slug: 'lucknow', name: 'Lucknow', countryCode: 'in' },
    { slug: 'patna', name: 'Patna', countryCode: 'in' },
    { slug: 'surat', name: 'Surat', countryCode: 'in' },
  ],
  us: [
    { slug: 'new-york', name: 'New York', countryCode: 'us' },
    { slug: 'los-angeles', name: 'Los Angeles', countryCode: 'us' },
    { slug: 'chicago', name: 'Chicago', countryCode: 'us' },
    { slug: 'houston', name: 'Houston', countryCode: 'us' },
    { slug: 'miami', name: 'Miami', countryCode: 'us' },
    { slug: 'dallas', name: 'Dallas', countryCode: 'us' },
    { slug: 'california', name: 'California', countryCode: 'us' },
    { slug: 'texas', name: 'Texas', countryCode: 'us' },
    { slug: 'florida', name: 'Florida', countryCode: 'us' },
    { slug: 'atlanta', name: 'Atlanta', countryCode: 'us' },
  ],
  pk: [
    { slug: 'karachi', name: 'Karachi', countryCode: 'pk' },
    { slug: 'lahore', name: 'Lahore', countryCode: 'pk' },
    { slug: 'islamabad', name: 'Islamabad', countryCode: 'pk' },
    { slug: 'rawalpindi', name: 'Rawalpindi', countryCode: 'pk' },
    { slug: 'faisalabad', name: 'Faisalabad', countryCode: 'pk' },
    { slug: 'multan', name: 'Multan', countryCode: 'pk' },
    { slug: 'peshawar', name: 'Peshawar', countryCode: 'pk' },
  ],
  gb: [
    { slug: 'london', name: 'London', countryCode: 'gb' },
    { slug: 'manchester', name: 'Manchester', countryCode: 'gb' },
    { slug: 'birmingham', name: 'Birmingham', countryCode: 'gb' },
    { slug: 'leeds', name: 'Leeds', countryCode: 'gb' },
    { slug: 'glasgow', name: 'Glasgow', countryCode: 'gb' },
    { slug: 'liverpool', name: 'Liverpool', countryCode: 'gb' },
  ],
  ae: [
    { slug: 'dubai', name: 'Dubai', countryCode: 'ae' },
    { slug: 'abu-dhabi', name: 'Abu Dhabi', countryCode: 'ae' },
    { slug: 'sharjah', name: 'Sharjah', countryCode: 'ae' },
    { slug: 'ajman', name: 'Ajman', countryCode: 'ae' },
  ],
  ca: [
    { slug: 'toronto', name: 'Toronto', countryCode: 'ca' },
    { slug: 'vancouver', name: 'Vancouver', countryCode: 'ca' },
    { slug: 'montreal', name: 'Montreal', countryCode: 'ca' },
    { slug: 'calgary', name: 'Calgary', countryCode: 'ca' },
    { slug: 'ottawa', name: 'Ottawa', countryCode: 'ca' },
  ],
  au: [
    { slug: 'sydney', name: 'Sydney', countryCode: 'au' },
    { slug: 'melbourne', name: 'Melbourne', countryCode: 'au' },
    { slug: 'brisbane', name: 'Brisbane', countryCode: 'au' },
    { slug: 'perth', name: 'Perth', countryCode: 'au' },
  ],
  bd: [
    { slug: 'dhaka', name: 'Dhaka', countryCode: 'bd' },
    { slug: 'chittagong', name: 'Chittagong', countryCode: 'bd' },
    { slug: 'sylhet', name: 'Sylhet', countryCode: 'bd' },
  ],
  id: [
    { slug: 'jakarta', name: 'Jakarta', countryCode: 'id' },
    { slug: 'surabaya', name: 'Surabaya', countryCode: 'id' },
    { slug: 'bandung', name: 'Bandung', countryCode: 'id' },
  ],
};

// Aliases mapping country slugs (e.g. 'india' -> 'in', 'usa' -> 'us', etc.)
export const COUNTRY_SLUG_TO_CODE: Record<string, string> = {
  in: 'in',
  india: 'in',
  us: 'us',
  usa: 'us',
  'united-states': 'us',
  pk: 'pk',
  pakistan: 'pk',
  gb: 'gb',
  uk: 'gb',
  'united-kingdom': 'gb',
  ae: 'ae',
  uae: 'ae',
  ca: 'ca',
  canada: 'ca',
  au: 'au',
  australia: 'au',
  bd: 'bd',
  bangladesh: 'bd',
  id: 'id',
  indonesia: 'id',
  my: 'my',
  malaysia: 'my',
  ph: 'ph',
  philippines: 'ph',
  sg: 'sg',
  singapore: 'sg',
};

export function resolveCountryCode(slug: string): string {
  const normalized = (slug || '').toLowerCase().trim();
  return COUNTRY_SLUG_TO_CODE[normalized] || normalized;
}

export function getCitiesForCountry(countryCodeOrSlug: string): CityItem[] {
  const code = resolveCountryCode(countryCodeOrSlug);
  return POPULAR_CITIES_BY_COUNTRY[code] || [];
}

