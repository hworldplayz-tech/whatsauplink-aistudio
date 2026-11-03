
import { HomePage } from '@/components/groups/home-page';
import { Suspense } from 'react';
import { getModerationSettings } from '@/lib/admin-settings';
import { getCategories, getCountries, getLayoutSettings } from '@/app/admin/actions';
import { getAdSettings } from '@/lib/ad-actions';
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { mapDocToGroupLink } from '@/lib/data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { BreadcrumbItem } from '@/components/layout/breadcrumbs';

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
    const allCountries = await getCountries();
    const countryInfo = allCountries.find(c => c.value === resolvedParams.country);
    const countryLabel = countryInfo ? countryInfo.label : (resolvedParams.country || '').toUpperCase();

    const title = `${countryLabel} WhatsApp Group Links | WhatsUpLink`;
    const description = `Find and join ${countryLabel} WhatsApp group links. The best directory for WhatsApp groups and channels from ${countryLabel}.`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
      },
    };
  } catch (e) {
    return {
      title: 'WhatsApp Group Links | WhatsUpLink',
      description: 'Discover active WhatsApp groups and channels.',
    };
  }
}

export default async function CountryPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const country = resolvedParams?.country;
  if (!country) notFound();

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
    // Remove orderby from query to avoid needing a composite index
    const groupsQuery = query(
      collection(db, 'groups'), 
      where('country', '==', country)
    );
    const groupSnapshot = await getDocs(groupsQuery);
    allGroups = groupSnapshot.docs.map(g => {
      const group = mapDocToGroupLink(g);
      group.showClicks = settings.showClicks; // Ensure global setting is applied
      return group;
    }).sort((a, b) => {
      // Sort manually after fetching
      const dateA = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0;
      const dateB = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (err) {
    console.error('Error fetching country groups:', err);
    allGroups = [];
  }

  const countryLabel = countries.find(c => c.value === country)?.label || country;
  const combinedSettings = { ...settings, layout: layoutSettings };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: countryLabel }
  ];

  // Dynamic SEO Content
  const seoTitle = `Top Active WhatsApp Group Links in ${countryLabel}`;
  const seoContent = `Looking for active WhatsApp group links from ${countryLabel}? You've found the ultimate resource. WhatsUpLink offers the largest, most up-to-date list of active group links for ${countryLabel}. Whether you're searching for local community groups, business networking, or entertainment, our active WhatsApp link directory is your best bet. All links are verified to ensure you're joining active and relevant groups from ${countryLabel}. Explore the best active WhatsApp group links today!`;

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
