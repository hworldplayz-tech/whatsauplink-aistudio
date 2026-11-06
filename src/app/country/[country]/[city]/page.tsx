import { HomePage } from '@/components/groups/home-page';
import { Suspense } from 'react';
import { getModerationSettings } from '@/lib/admin-settings';
import { getCategories, getCountries, getLayoutSettings } from '@/app/admin/actions';
import { getAdSettings } from '@/lib/ad-actions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { mapDocToGroupLink, type GroupLink } from '@/lib/data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { BreadcrumbItem } from '@/components/layout/breadcrumbs';
import { FaqSection, getCountryFaqs } from '@/components/seo/faq-section';
import {
  resolveCountryCode,
  POPULAR_CITIES_BY_COUNTRY,
  getCitiesForCountry,
  DEFAULT_COUNTRIES,
} from '@/lib/constants';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

type Props = {
  params: Promise<{ country: string; city: string }>;
};

// Helper function to initialize Firebase on the server
function getFirestoreInstance() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

function formatSlugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawCountry = resolvedParams.country;
    const countryCode = resolveCountryCode(rawCountry);
    const citySlug = resolvedParams.city.toLowerCase();

    const allCountries = await getCountries();
    const countryInfo = allCountries.find(
      (c) => c.value.toLowerCase() === countryCode.toLowerCase()
    );
    const countryName = countryInfo ? countryInfo.label : formatSlugToName(rawCountry);

    const cityList = getCitiesForCountry(countryCode);
    const cityInfo = cityList.find((c) => c.slug.toLowerCase() === citySlug);
    const cityName = cityInfo ? cityInfo.name : formatSlugToName(citySlug);

    const title = `Active ${cityName} WhatsApp Group Links (${countryName}) | Groupsor`;
    const description = `Discover and join active ${cityName} WhatsApp group links in ${countryName}. Verified links for ${cityName} jobs, students, business, buy & sell, and local communities.`;
    const canonical = `https://groupsor.co.uk/country/${rawCountry}/${citySlug}`;

    return {
      title,
      description,
      alternates: {
        canonical,
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: 'Groupsor',
        type: 'website',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  } catch (e) {
    return {
      title: 'City WhatsApp Group Links | Groupsor',
      description: 'Discover active city WhatsApp groups and channels.',
    };
  }
}

export default async function CityCountryPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const rawCountry = resolvedParams?.country;
  const citySlug = resolvedParams?.city?.toLowerCase();

  if (!rawCountry || !citySlug) notFound();

  const countryCode = resolveCountryCode(rawCountry);

  let settings: any = { showClicks: true, showTicker: true, tickerSpeed: 40, showDynamicSeoContent: true };
  let categories: any[] = [];
  let countries: any[] = [];
  let layoutSettings: any = {};
  let adSettings: any = { globalEnabled: false, slots: {} };

  try {
    const results = await Promise.allSettled([
      getModerationSettings(),
      getCategories(),
      getCountries(),
      getLayoutSettings(),
      getAdSettings(),
    ]);

    if (results[0].status === 'fulfilled') settings = results[0].value;
    if (results[1].status === 'fulfilled') categories = results[1].value;
    if (results[2].status === 'fulfilled') countries = results[2].value;
    if (results[3].status === 'fulfilled') layoutSettings = results[3].value;
    if (results[4].status === 'fulfilled') adSettings = results[4].value;
  } catch (err) {
    console.warn('Notice: Error loading city settings:', err);
  }

  const countryInfo = countries.find(
    (c) => c.value.toLowerCase() === countryCode.toLowerCase()
  );
  const countryName = countryInfo ? countryInfo.label : formatSlugToName(rawCountry);

  const cityList = getCitiesForCountry(countryCode);
  const cityInfo = cityList.find((c) => c.slug.toLowerCase() === citySlug);
  const cityName = cityInfo ? cityInfo.name : formatSlugToName(citySlug);

  let allGroups: GroupLink[] = [];
  try {
    const db = getFirestoreInstance();
    // Fetch groups belonging to this country code
    const groupsQuery = query(
      collection(db, 'groups'),
      where('country', '==', countryCode)
    );
    const groupSnapshot = await getDocs(groupsQuery);
    const countryGroups: GroupLink[] = groupSnapshot.docs
      .map((g) => {
        const group = mapDocToGroupLink(g);
        group.showClicks = settings.showClicks;
        return group;
      })
      .sort((a, b) => {
        const dateA = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0;
        const dateB = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0;
        return dateB - dateA;
      });

    // Check for city keyword matches
    const cityLower = cityName.toLowerCase();
    const citySlugLower = citySlug.replace(/-/g, ' ');

    const cityMatched = countryGroups.filter((g) => {
      const title = (g.title || '').toLowerCase();
      const desc = (g.description || '').toLowerCase();
      const tags = (g.tags || []).map((t) => t.toLowerCase());
      return (
        title.includes(cityLower) ||
        title.includes(citySlugLower) ||
        desc.includes(cityLower) ||
        desc.includes(citySlugLower) ||
        tags.some((t) => t.includes(cityLower) || t.includes(citySlugLower))
      );
    });

    // If matches found, prioritize them, followed by other active groups from that country
    if (cityMatched.length > 0) {
      const rest = countryGroups.filter((g) => !cityMatched.some((m) => m.id === g.id));
      allGroups = [...cityMatched, ...rest];
    } else {
      allGroups = countryGroups;
    }
  } catch (err) {
    console.error('Error fetching city groups:', err);
    allGroups = [];
  }

  const combinedSettings = { ...settings, layout: layoutSettings };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: countryName, href: `/country/${rawCountry}` },
    { label: cityName },
  ];

  const seoTitle = `Top Verified WhatsApp Group Links in ${cityName}, ${countryName}`;
  const seoContent = `Looking to join active WhatsApp groups in ${cityName}? Groupsor offers a dedicated directory of verified WhatsApp group links for ${cityName}, ${countryName}. Whether you are a student looking for study groups, a job seeker looking for local vacancies in ${cityName}, a business professional networking with local entrepreneurs, or someone seeking local buy-and-sell deals and social discussions, you'll find the best active links right here. All invite links are regularly verified to ensure you join active communities with real members.`;

  const faqs = getCountryFaqs(countryName, cityName);
  const siblingCities = cityList.filter((c) => c.slug.toLowerCase() !== citySlug);

  return (
    <Suspense
      fallback={
        <div className="container py-12 text-center text-muted-foreground">
          Loading {cityName} groups...
        </div>
      }
    >
      <HomePage
        initialSettings={combinedSettings}
        allGroups={allGroups}
        initialCategories={categories}
        initialCountries={countries}
        pageTitle={`${cityName} WhatsApp Group Links`}
        breadcrumbItems={breadcrumbItems}
        seoTitle={seoTitle}
        seoContent={seoContent}
        adSettings={adSettings}
      />

      {/* Sibling City Navigation for SEO and Internal Linking */}
      {siblingCities.length > 0 && (
        <section className="container py-8 border-t bg-muted/20">
          <div className="mx-auto max-w-5xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Explore More Cities in {countryName}</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {siblingCities.map((city) => (
                <Link
                  key={city.slug}
                  href={`/country/${rawCountry}/${city.slug}`}
                  className="px-3 py-1.5 rounded-lg border bg-card text-xs md:text-sm font-medium hover:border-primary hover:text-primary transition-colors"
                >
                  {city.name} WhatsApp Groups
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Schema.org FAQSection with Accordion */}
      <FaqSection
        title={`Frequently Asked Questions about ${cityName} WhatsApp Groups`}
        description={`Common questions and helpful tips for finding, joining, and participating in ${cityName} WhatsApp communities.`}
        items={faqs}
      />
    </Suspense>
  );
}

// Generate static routes for the most popular cities to boost SEO indexation
export async function generateStaticParams() {
  const params: Array<{ country: string; city: string }> = [];

  for (const [countryCode, cities] of Object.entries(POPULAR_CITIES_BY_COUNTRY)) {
    for (const city of cities.slice(0, 5)) {
      params.push({
        country: countryCode,
        city: city.slug,
      });
    }
  }

  return params;
}
