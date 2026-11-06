import { notFound } from 'next/navigation';
import { cache } from 'react';
import { getGroupById, getRelatedGroups } from '@/lib/data';
import { GroupDetailView } from '@/components/groups/group-detail-view';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { getFirestore } from 'firebase/firestore';
import { getCategories, getCountries } from '@/app/admin/actions';
import { getModerationSettings } from '@/lib/admin-settings';
import { getAdSettings } from '@/lib/ad-actions';
import { DEFAULT_CATEGORIES, DEFAULT_COUNTRIES } from '@/lib/constants';
import type { Metadata } from 'next';

export const revalidate = 60; // Cache detail page response for 60 seconds for rapid instant loading

type Props = {
  params: Promise<{ id: string }>;
};

function getDb() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

// React cache() deduplicates fetch across generateMetadata and the page component
const getCachedGroup = cache(async (id: string) => {
  if (!id) return null;
  const db = getDb();
  try {
    return await getGroupById(db, id);
  } catch (e) {
    console.error('Error fetching cached group:', e);
    return null;
  }
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await params;
    const group = await getCachedGroup(resolvedParams.id);

    if (!group) {
      return {
        title: 'Group Link Not Found | Groupsor',
        description: 'The WhatsApp group link you are looking for could not be found.',
      };
    }

    const title = `Join ${group.title} WhatsApp Group Link | Groupsor`;
    const description = `Find and join the ${group.title} WhatsApp group link. ${group.description?.substring(0, 120)}...`;

    return {
      title: title,
      description: description,
      openGraph: {
        title: title,
        description: group.description,
        images: group.imageUrl ? [{ url: group.imageUrl, width: 512, height: 512 }] : [],
        type: 'website',
      },
    };
  } catch (e) {
    return {
      title: 'WhatsApp Group Link | Groupsor',
      description: 'Join active WhatsApp group links.',
    };
  }
}

export default async function GroupDetailPage({ params }: Props) {
  const resolvedParams = await params;
  const group = await getCachedGroup(resolvedParams.id);

  if (!group) {
    notFound();
  }

  const db = getDb();
  let relatedGroups: any[] = [];
  let categories: any[] = [...DEFAULT_CATEGORIES];
  let countries: any[] = [...DEFAULT_COUNTRIES];
  let adSettings: any = { globalEnabled: false, slots: {} };
  let moderationSettings: any = null;

  try {
    const results = await Promise.allSettled([
      getRelatedGroups(db, group),
      getCategories(),
      getCountries(),
      getAdSettings(),
      getModerationSettings(),
    ]);

    if (results[0].status === 'fulfilled') relatedGroups = results[0].value;
    if (results[1].status === 'fulfilled' && results[1].value?.length) categories = results[1].value;
    if (results[2].status === 'fulfilled' && results[2].value?.length) countries = results[2].value;
    if (results[3].status === 'fulfilled') adSettings = results[3].value;
    if (results[4].status === 'fulfilled') moderationSettings = results[4].value;
  } catch (err) {
    console.error('Notice: Error loading supplementary data for group:', err);
  }

  return (
    <GroupDetailView 
      group={group} 
      relatedGroups={relatedGroups} 
      categories={categories}
      countries={countries}
      adSettings={adSettings as any}
      initialSettings={moderationSettings}
    />
  );
}
