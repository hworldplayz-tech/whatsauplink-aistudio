'use server';

import type { ModerationSettings } from '@/lib/data';
import { getCachedValue } from '@/lib/settings-cache';
import { readSiteSetting } from '@/lib/firebase-settings-store';

const DEFAULT_MODERATION_SETTINGS: ModerationSettings = {
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
  enableCricketWidget: true,
  cricketWidgetMajorOnly: true,
  cricketPinnedMatchId: '',
};

export async function getModerationSettings(): Promise<ModerationSettings> {
  return getCachedValue<ModerationSettings>(
    'settings:moderation',
    async () => {
      const data = await readSiteSetting('moderation');
      if (data) {
        return {
          ...DEFAULT_MODERATION_SETTINGS,
          ...(data as Partial<ModerationSettings>),
        };
      }
      return DEFAULT_MODERATION_SETTINGS;
    },
    DEFAULT_MODERATION_SETTINGS
  );
}
