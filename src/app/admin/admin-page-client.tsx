
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

  return (
    <AdminDashboard
      initialGroups={initialGroups}
      allGroupsForStats={allGroupsForStats}
      initialTotalPages={initialTotalPages}
      initialTotalGroups={initialTotalGroups}
      initialModerationSettings={initialModerationSettings!}
      initialCategories={initialCategories}
      initialCountries={initialCountries}
      initialLayoutSettings={initialLayoutSettings!}
      initialReports={initialReports}
      initialAdSettings={initialAdSettings!}
    />
  );
}

    