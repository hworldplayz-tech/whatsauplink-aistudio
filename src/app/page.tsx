
import { HomePage } from '@/components/groups/home-page';
import { getModerationSettings } from '@/lib/admin-settings';
import { getCategories, getCountries, seedInitialData, getLayoutSettings } from '@/app/admin/actions';
import { getAdSettings } from '@/lib/ad-actions';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { mapDocToGroupLink } from '@/lib/data';
import { Ticker } from '@/components/sports/ticker';
import { Suspense } from 'react';
import { FaqSection, getHomeFaqs } from '@/components/seo/faq-section';

import { DEFAULT_CATEGORIES, DEFAULT_COUNTRIES } from '@/lib/constants';

// Helper function to initialize Firebase on the server
function getFirestoreInstance() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

const DEFAULT_LAYOUT_FALLBACK = {
  logoUrl: '/groupsor_logo.png',
  footerContent: {
    heading: 'Groupsor',
    paragraph: 'The largest Collection of Whatsapp groups and channels from around the world.',
    copyrightText: '© 2026 | Groupsor',
  },
  backgroundSettings: {
    bgImageEnabled: true,
    bgImageUrl: '/whatsapp_background_official_image.png',
  },
  homepageSeoContent: {
    enabled: true,
    heading: 'The largest Collection of Whatsapp groups and channels',
    content: 'Welcome to Groupsor, the largest collection of active WhatsApp group links and channels.',
  },
  seoSettings: {
    siteTitle: "Groupsor - The largest Collection of Whatsapp groups and channels",
    metaDescription: "The largest Collection of Whatsapp groups and channels.",
    metaKeywords: "whatsapp group links, whatsapp groups, whatsapp channels, groupsor"
  }
};

export default async function Home() {
  let settings: any = { showClicks: true, showTicker: true, tickerSpeed: 40 };
  let categories: any[] = [...DEFAULT_CATEGORIES];
  let countries: any[] = [...DEFAULT_COUNTRIES];
  let layoutSettings: any = { ...DEFAULT_LAYOUT_FALLBACK };
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
    if (results[3].status === 'fulfilled' && results[3].value) {
      layoutSettings = { 
        ...DEFAULT_LAYOUT_FALLBACK, 
        ...results[3].value,
        homepageSeoContent: { ...DEFAULT_LAYOUT_FALLBACK.homepageSeoContent, ...(results[3].value.homepageSeoContent || {}) },
      };
    }
    if (results[4].status === 'fulfilled') adSettings = results[4].value;
  } catch (err) {
    console.error('Notice: Error loading home settings:', err);
  }

  // Fetch all groups on the server safely with try/catch fallback
  let allGroups: any[] = [];
  try {
    const db = getFirestoreInstance();
    const groupsQuery = query(collection(db, 'groups'), orderBy('lastSubmittedAt', 'desc'));
    const groupSnapshot = await getDocs(groupsQuery);
    allGroups = groupSnapshot.docs.map(g => {
      const group = mapDocToGroupLink(g);
      group.showClicks = settings.showClicks; // Ensure global setting is applied
      return group;
    });
  } catch (error) {
    console.warn('Notice: Could not load groups from Firestore during SSR, returning empty list for client hydration:', error);
    allGroups = [];
  }

  const combinedSettings = { ...settings, layout: layoutSettings };

  // Pass the server-fetched data to the client component.
  // HomePage uses useSearchParams, so wrap it in Suspense for Next.js SSR compliance.
  return (
    <>
       {settings.showTicker && (
        <Suspense fallback={<div className="h-12 bg-muted border-y" />}>
            <Ticker />
        </Suspense>
       )}
      <Suspense fallback={<div className="container py-12 text-center text-muted-foreground">Loading groups...</div>}>
        <HomePage 
          initialSettings={combinedSettings}
          allGroups={allGroups}
          initialCategories={categories}
          initialCountries={countries}
          adSettings={adSettings}
        />
        <FaqSection
          title="Frequently Asked Questions about Groupsor"
          description="Everything you need to know about joining and submitting active WhatsApp groups and channels."
          items={getHomeFaqs()}
        />
      </Suspense>
    </>
  );
}
