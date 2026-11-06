import { HomePage } from '@/components/groups/home-page';
import { Suspense } from 'react';
import { getModerationSettings } from '@/lib/admin-settings';
import { getCategories, getCountries, getLayoutSettings } from '@/app/admin/actions';
import { getAdSettings } from '@/lib/ad-actions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { mapDocToGroupLink } from '@/lib/data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { BreadcrumbItem } from '@/components/layout/breadcrumbs';
import { FaqSection, getCountryFaqs } from '@/components/seo/faq-section';
import { resolveCountryCode, getCitiesForCountry } from '@/lib/constants';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

type Props = {
  params: Promise<{ country: string }>;
};

// Helper function to initialize Firebase on the server
function getFirestoreInstance() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const rawCountry = resolvedParams.country;
    const countryCode = resolveCountryCode(rawCountry);

    const allCountries = await getCountries();
    const countryInfo = allCountries.find(
      (c) => c.value.toLowerCase() === countryCode.toLowerCase()
    );
    const countryLabel = countryInfo ? countryInfo.label : (rawCountry || '').toUpperCase();

    const title = `${countryLabel} WhatsApp Group Links | Groupsor`;
    const description = `Find and join active ${countryLabel} WhatsApp group links. The best verified directory for WhatsApp groups, channels, and communities in ${countryLabel}.`;
    const canonical = `https://groupsor.co.uk/country/${rawCountry}`;

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
      title: 'WhatsApp Group Links | Groupsor',
      description: 'Discover active WhatsApp groups and channels.',
    };
  }
}

export default async function CountryPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const rawCountry = resolvedParams?.country;
  if (!rawCountry) notFound();

  const countryCode = resolveCountryCode(rawCountry);

  let settings: any = { showClicks: true, showTicker: true, tickerSpeed: 40 };
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
    console.warn('Notice: Error loading country settings:', err);
  }

  let allGroups: any[] = [];
  try {
    const db = getFirestoreInstance();
    // Query by resolved countryCode
    const groupsQuery = query(
      collection(db, 'groups'), 
      where('country', '==', countryCode)
    );
    const groupSnapshot = await getDocs(groupsQuery);
    allGroups = groupSnapshot.docs.map(g => {
      const group = mapDocToGroupLink(g);
      group.showClicks = settings.showClicks;
      return group;
    }).sort((a, b) => {
      const dateA = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0;
      const dateB = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (err) {
    console.error('Error fetching country groups:', err);
    allGroups = [];
  }

  const countryInfo = countries.find(
    (c) => c.value.toLowerCase() === countryCode.toLowerCase()
  );
  const countryLabel = countryInfo ? countryInfo.label : rawCountry.toUpperCase();
  const combinedSettings = { ...settings, layout: layoutSettings };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: countryLabel }
  ];

  // Dynamic SEO Content
  const seoTitle = `Top Active WhatsApp Group Links in ${countryLabel}`;
  const seoContent = `Looking for active WhatsApp group links from ${countryLabel}? You've found the ultimate resource. Groupsor offers the largest, most up-to-date list of active group links for ${countryLabel}. Whether you're searching for local community groups, business networking, students, or entertainment, our active WhatsApp link directory is your best bet. All links are verified to ensure you're joining active and relevant groups from ${countryLabel}. Explore the best active WhatsApp group links today!`;

  const faqs = getCountryFaqs(countryLabel);
  const cities = getCitiesForCountry(countryCode);

  return (
    <Suspense fallback={<div className="container py-12 text-center text-muted-foreground">Loading groups...</div>}>
      <HomePage 
        initialSettings={combinedSettings}
        allGroups={allGroups}
        initialCategories={categories}
        initialCountries={countries}
        pageTitle={`Groups in '${countryLabel}'`}
        breadcrumbItems={breadcrumbItems}
        seoTitle={seoTitle}
        seoContent={seoContent}
        adSettings={adSettings}
      />

      {/* Sub-city & Regional Exploration Links */}
      {cities.length > 0 && (
        <section className="container py-8 border-t bg-muted/20">
          <div className="mx-auto max-w-5xl">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4 text-foreground">
              <MapPin className="h-5 w-5 text-primary" />
              <span>Browse {countryLabel} Groups by City &amp; Region</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {cities.map((city) => (
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
        title={`Frequently Asked Questions about ${countryLabel} WhatsApp Groups`}
        description={`Everything you need to know about joining and discovering active communities from ${countryLabel}.`}
        items={faqs}
      />
    </Suspense>
  );
}

// Generate static pages for all existing countries for better SEO
export async function generateStaticParams() {
    const countries = await getCountries();
    return countries.map((country) => ({
        country: country.value,
    }));
}
