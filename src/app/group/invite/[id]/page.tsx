
import { notFound } from 'next/navigation';
import { getGroupById, getRelatedGroups } from '@/lib/data';
import { GroupDetailView } from '@/components/groups/group-detail-view';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';
import { getFirestore } from 'firebase/firestore';
import { getCategories, getCountries } from '@/app/admin/actions';
import { getAdSettings } from '@/lib/ad-actions';
import type { Metadata } from 'next';

type Props = {
  params: Promise<{ id: string }>;
};

function getDb() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const resolvedParams = await Promise.resolve(params);
    const db = getDb();
    const group = await getGroupById(db, resolvedParams.id);

    if (!group) {
      return {
        title: 'Group Link Not Found | WhatsUpLink',
        description: 'The WhatsApp group link you are looking for could not be found.',
      };
    }

    const title = `Join ${group.title} WhatsApp Group Link | WhatsUpLink`;
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
      title: 'WhatsApp Group Link | WhatsUpLink',
      description: 'Join active WhatsApp group links.',
    };
  }
}

export default async function GroupDetailPage({ params }: Props) {
  const resolvedParams = await Promise.resolve(params);
  const db = getDb();
  
  let group = null;
  try {
    group = await getGroupById(db, resolvedParams.id);
  } catch (e) {
    console.error('Error fetching group by ID:', e);
  }
  
  if (!group) {
    notFound();
  }

  let relatedGroups: any[] = [];
  let categories: any[] = [];
  let countries: any[] = [];
  let adSettings: any = { globalEnabled: false, slots: {} };

  try {
    const results = await Promise.allSettled([
      getRelatedGroups(db, group),
      getCategories(),
      getCountries(),
      getAdSettings(),
    ]);

    relatedGroups = results[0].status === 'fulfilled' ? results[0].value : [];
    categories = results[1].status === 'fulfilled' ? results[1].value : [];
    countries = results[2].status === 'fulfilled' ? results[2].value : [];
    adSettings = results[3].status === 'fulfilled' ? results[3].value : { globalEnabled: false, slots: {} };
  } catch (err) {
    console.error('Failed to load related data for group:', err);
  }

  return (
    <GroupDetailView 
      group={group} 
      relatedGroups={relatedGroups} 
      categories={categories}
      countries={countries}
      adSettings={adSettings as any}
    />
  );
}
