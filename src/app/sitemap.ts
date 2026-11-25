import type { MetadataRoute } from 'next';
import { getCategories, getCountries } from '@/app/admin/actions';
import { DEFAULT_CATEGORIES, DEFAULT_COUNTRIES, POPULAR_CITIES_BY_COUNTRY } from '@/lib/constants';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query, orderBy } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { isVpsDbEnabled, vpsGetGroups } from '@/lib/vps-db';

function getFirestoreInstance() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://groupsor.co.uk';
  const now = new Date();

  // Static core pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/cricket`,
      lastModified: now,
      changeFrequency: 'always',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/submit`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/embed`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ];

  // Categories
  let categories = DEFAULT_CATEGORIES;
  try {
    const fetched = await getCategories();
    if (fetched && fetched.length > 0) {
      categories = fetched;
    }
  } catch (e) {
    console.warn('Notice: Using default categories for sitemap');
  }

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((cat) => ({
    url: `${baseUrl}/category/${cat.value}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.85,
  }));

  // Countries
  let countries = DEFAULT_COUNTRIES;
  try {
    const fetched = await getCountries();
    if (fetched && fetched.length > 0) {
      countries = fetched;
    }
  } catch (e) {
    console.warn('Notice: Using default countries for sitemap');
  }

  const countryRoutes: MetadataRoute.Sitemap = countries
    .filter((c) => c.value !== 'other')
    .map((c) => ({
      url: `${baseUrl}/country/${c.value}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.85,
    }));

  // City sub-pages
  const cityRoutes: MetadataRoute.Sitemap = [];
  for (const [countryCode, cities] of Object.entries(POPULAR_CITIES_BY_COUNTRY)) {
    for (const city of cities) {
      cityRoutes.push({
        url: `${baseUrl}/country/${countryCode}/${city.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  // Groups from VPS DB (primary) or Firestore (fallback)
  let groupRoutes: MetadataRoute.Sitemap = [];
  try {
    if (isVpsDbEnabled()) {
      const res = await vpsGetGroups({ limit: 1000, sort: 'newest' });
      groupRoutes = res.groups.map((g) => {
        const lastModStr = g.lastSubmittedAt || g.createdAt;
        const parsedDate = lastModStr ? new Date(lastModStr) : now;
        return {
          url: `${baseUrl}/group/invite/${g.id}`,
          lastModified: Number.isNaN(parsedDate.getTime()) ? now : parsedDate,
          changeFrequency: 'weekly',
          priority: 0.75,
        };
      });
    } else {
      const db = getFirestoreInstance();
      const groupsSnap = await getDocs(query(collection(db, 'groups'), limit(500)));
      groupRoutes = groupsSnap.docs.map((doc) => {
        const data = doc.data();
        let lastMod = now;
        if (data.lastSubmittedAt) {
          lastMod = new Date(data.lastSubmittedAt);
        } else if (data.createdAt?.toDate) {
          lastMod = data.createdAt.toDate();
        }

        return {
          url: `${baseUrl}/group/invite/${doc.id}`,
          lastModified: isNaN(lastMod.getTime()) ? now : lastMod,
          changeFrequency: 'weekly',
          priority: 0.75,
        };
      });
    }
  } catch (err) {
    console.warn('Notice: Could not fetch groups for sitemap, using core routes:', err instanceof Error ? err.message : err);
  }

  return [...staticRoutes, ...categoryRoutes, ...countryRoutes, ...cityRoutes, ...groupRoutes];
}
