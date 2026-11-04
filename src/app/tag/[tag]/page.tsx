
import { HomePage } from '@/components/groups/home-page';
import { Suspense } from 'react';
import { getModerationSettings } from '@/lib/admin-settings';
import { getCategories, getCountries, getLayoutSettings } from '@/app/admin/actions';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { mapDocToGroupLink } from '@/lib/data';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { BreadcrumbItem } from '@/components/layout/breadcrumbs';

type Props = {
  params: Promise<{ tag: string }>;
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
    const tags = (resolvedParams?.tag || '').split('+').map(t => decodeURIComponent(t));
    const tagTitle = tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' ');

    const title = `Active ${tagTitle} WhatsApp Group Links | Groupsor`;
    const description = `Find and join the best ${tagTitle} WhatsApp groups. The largest collection of active communities related to ${tagTitle}.`;

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
      title: 'WhatsApp Group Links | Groupsor',
      description: 'Discover active WhatsApp groups and channels.',
    };
  }
}


export default async function TagPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const tag = resolvedParams?.tag;
  if (!tag) notFound();

  const tags = tag.split('+').map(t => decodeURIComponent(t).toLowerCase());
  const firstTag = tags[0];

  let settings: any = { showClicks: true, showTicker: true, tickerSpeed: 40 };
  let categories: any[] = [];
  let countries: any[] = [];
  let layoutSettings: any = {};

  try {
    const results = await Promise.allSettled([
      getModerationSettings(),
      getCategories(),
      getCountries(),
      getLayoutSettings()
    ]);

    if (results[0].status === 'fulfilled') settings = results[0].value;
    if (results[1].status === 'fulfilled') categories = results[1].value;
    if (results[2].status === 'fulfilled') countries = results[2].value;
    if (results[3].status === 'fulfilled') layoutSettings = results[3].value;
  } catch (err) {
    console.warn('Notice: Error loading tag settings:', err);
  }

  const db = getFirestoreInstance();
  let allGroups: any[] = [];
  try {
    const groupsQuery = query(
      collection(db, 'groups'), 
      where('tags', 'array-contains', firstTag)
    );

    const groupSnapshot = await getDocs(groupsQuery);
    
    // Filter for any additional tags in memory.
    allGroups = groupSnapshot.docs.map(g => {
      const group = mapDocToGroupLink(g);
      group.showClicks = settings.showClicks; // Ensure global setting is applied
      return group;
    }).filter(group => {
      // If there's more than one tag, ensure the group has all of them.
      if (tags.length > 1) {
        const groupTagsLower = group.tags.map(t => t.toLowerCase());
        return tags.every(t => groupTagsLower.includes(t));
      }
      return true; // If only one tag, it's already filtered by the query.
    }).sort((a, b) => {
      // Sort manually after fetching
      const dateA = a.lastSubmittedAt ? new Date(a.lastSubmittedAt).getTime() : 0;
      const dateB = b.lastSubmittedAt ? new Date(b.lastSubmittedAt).getTime() : 0;
      return dateB - dateA;
    });
  } catch (err) {
    console.error('Error fetching tag groups:', err);
    allGroups = [];
  }

  const tagTitle = tags.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' & ');
  const combinedSettings = { ...settings, layout: layoutSettings };

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Tags' },
    { label: tagTitle },
  ];

  // Dynamic SEO Content
  const seoTitle = `Best WhatsApp Group Links for ${tagTitle}`;
  const seoContent = `Explore our curated collection of active WhatsApp group links for interests in ${tagTitle}. Groupsor is your top destination for discovering engaging communities. Whether you're searching for ${tagTitle} discussions, hobby groups, or more, find the most up-to-date and active links right here.`;


  return (
    <Suspense fallback={<div className="container py-12 text-center text-muted-foreground">Loading groups...</div>}>
      <HomePage 
        initialSettings={combinedSettings}
        allGroups={allGroups}
        initialCategories={categories}
        initialCountries={countries}
        pageTitle={`Groups Tagged '${tagTitle}'`}
        breadcrumbItems={breadcrumbItems}
        seoTitle={seoTitle}
        seoContent={seoContent}
      />
    </Suspense>
  );
}
