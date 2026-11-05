
import { getCategories, getCountries, seedInitialData, getLayoutSettings, getReports, getPaginatedGroups } from './actions';
import { getModerationSettings } from '@/lib/admin-settings';
import { getAdSettings } from '@/lib/ad-actions';
import { AdminPageClient } from './admin-page-client';
import type { GroupLink } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  let isQuotaExceeded = false;

  // Try initial seed once without blocking or failing
  try {
    await seedInitialData();
  } catch (err) {
    console.warn('Notice: seedInitialData skipped:', err);
  }

  // Fetch all admin data using Promise.allSettled so NO SINGLE failure can crash or 404 the page
  const [
    modRes,
    catRes,
    countRes,
    layoutRes,
    repRes,
    pagRes,
    adRes,
  ] = await Promise.allSettled([
    getModerationSettings(),
    getCategories(),
    getCountries(),
    getLayoutSettings(),
    getReports(),
    getPaginatedGroups(1, 50),
    getAdSettings(),
  ]);

  const moderationSettings = modRes.status === 'fulfilled' ? modRes.value : undefined;
  const categories = catRes.status === 'fulfilled' ? catRes.value : [];
  const countries = countRes.status === 'fulfilled' ? countRes.value : [];
  const layoutSettings = layoutRes.status === 'fulfilled' ? layoutRes.value : undefined;
  const reports = repRes.status === 'fulfilled' ? repRes.value : [];
  const paginatedData = pagRes.status === 'fulfilled' 
    ? pagRes.value 
    : { groups: [] as GroupLink[], totalPages: 1, totalGroups: 0 };
  const adSettings = adRes.status === 'fulfilled' ? adRes.value : undefined;

  // Check if any rejected reason mentions quota
  [modRes, catRes, countRes, layoutRes, repRes, pagRes, adRes].forEach((r) => {
    if (r.status === 'rejected') {
      const msg = String(r.reason?.message || r.reason || '');
      if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Quota exceeded')) {
        isQuotaExceeded = true;
      }
      console.warn('Admin page query fallback:', msg);
    }
  });

  const { groups, totalPages, totalGroups } = paginatedData;
  const allGroupsForStats = groups;

  return (
    <AdminPageClient
      initialGroups={groups}
      allGroupsForStats={allGroupsForStats}
      initialTotalPages={totalPages}
      initialTotalGroups={totalGroups}
      initialModerationSettings={moderationSettings}
      initialCategories={categories}
      initialCountries={countries}
      initialLayoutSettings={layoutSettings}
      initialReports={reports}
      initialAdSettings={adSettings}
      quotaWarning={isQuotaExceeded}
    />
  );
}
