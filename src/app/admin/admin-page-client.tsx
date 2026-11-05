
'use client';

import { useState, useEffect } from 'react';
import type { Category, Country, GroupLink, ModerationSettings, LayoutSettings, Report } from '@/lib/data';
import type { AdSettings } from '@/lib/ad-types';
import { AdminLogin } from '@/components/admin/admin-login';
import { AdminDashboard } from '@/components/admin/admin-dashboard';

type AdminPageClientProps = {
  initialGroups?: GroupLink[];
  allGroupsForStats?: GroupLink[];
  initialTotalPages?: number;
  initialTotalGroups?: number;
  initialModerationSettings?: ModerationSettings;
  initialCategories?: Category[];
  initialCountries?: Country[];
  initialLayoutSettings?: LayoutSettings;
  initialReports?: Report[];
  initialAdSettings?: AdSettings;
  quotaWarning?: boolean;
};

const FALLBACK_MODERATION: ModerationSettings = {
  cooldownEnabled: true,
  cooldownValue: 6,
  cooldownUnit: 'hours',
  showClicks: true,
  groupsPerPage: 20,
  showFeatured: true,
  featuredGroupsDisplay: 'slider',
  showNewsletter: false,
  showDynamicSeoContent: true,
  showRatings: true,
  showTicker: true,
  tickerSpeed: 40,
};

const FALLBACK_LAYOUT: LayoutSettings = {
  logoUrl: '/whatsuplink_logo_and_favicon_without_background.png',
  navLinks: [],
  footerContent: {
    heading: 'The largest Collection of Whatsapp groups and channels',
    paragraph: 'Discover and join active WhatsApp groups and channels from around the world on Groupsor.',
    copyrightText: '© 2026 | Groupsor',
  },
  backgroundSettings: { bgImageEnabled: false, bgImageUrl: '' },
  homepageSeoContent: {
    enabled: true,
    heading: 'The largest Collection of Whatsapp groups and channels',
    content: 'Welcome to Groupsor, the largest directory of active WhatsApp groups.',
  },
  seoSettings: {
    siteTitle: 'Groupsor - The largest Collection of Whatsapp groups and channels',
    metaDescription: 'Discover and join active groups for community, gaming, business, and more.',
    metaKeywords: 'whatsapp groups, groupsor, active groups',
  },
};

const FALLBACK_ADS: AdSettings = {
  globalEnabled: false,
  slots: {} as any,
};

export function AdminPageClient({
  initialGroups = [],
  allGroupsForStats = [],
  initialTotalPages = 1,
  initialTotalGroups = 0,
  initialModerationSettings,
  initialCategories = [],
  initialCountries = [],
  initialLayoutSettings,
  initialReports = [],
  initialAdSettings,
  quotaWarning = false,
}: AdminPageClientProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('admin_authenticated');
      if (stored === 'true') {
        setIsAuthenticated(true);
      }
    }
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/20">
        <div className="text-sm text-muted-foreground animate-pulse">Loading Admin Panel...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const moderationSettings = initialModerationSettings || FALLBACK_MODERATION;
  const layoutSettings = initialLayoutSettings || FALLBACK_LAYOUT;
  const adSettings = initialAdSettings || FALLBACK_ADS;

  return (
    <div className="w-full">
      {quotaWarning && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-center text-xs text-amber-800 dark:text-amber-300 font-medium">
          ⚠️ Notice: Firebase Firestore daily read limit is currently reached. Existing cached data is displayed, and full capabilities will automatically reset with your daily quota.
        </div>
      )}
      <AdminDashboard
        initialGroups={initialGroups}
        allGroupsForStats={allGroupsForStats}
        initialTotalPages={initialTotalPages}
        initialTotalGroups={initialTotalGroups}
        initialModerationSettings={moderationSettings}
        initialCategories={initialCategories}
        initialCountries={initialCountries}
        initialLayoutSettings={layoutSettings}
        initialReports={initialReports}
        initialAdSettings={adSettings}
      />
    </div>
  );
}

    