
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

// Helper function to initialize Firebase on the server
function getFirestoreInstance() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

export default async function Home() {
  // Fetch settings and taxonomies on the server safely.
  const [settings, categories, countries, layoutSettings, adSettings] = await Promise.all([
    getModerationSettings(),
    getCategories(),
    getCountries(),
    getLayoutSettings(),
    getAdSettings(),
  ]);

  // Seed initial data if necessary (non-blocking)
  seedInitialData().catch(err => console.warn('Background seed notice:', err));

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
    console.error('Notice: Could not load groups from Firestore during SSR, returning empty list:', error);
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
      </Suspense>
    </>
  );
}
