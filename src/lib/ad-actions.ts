'use server';

import { revalidatePath } from 'next/cache';
import { AdSettings, DEFAULT_AD_SETTINGS, DEFAULT_AD_SLOTS } from './ad-types';
import { getCachedValue, invalidateCachedKey } from '@/lib/settings-cache';
import { readSiteSetting, writeSiteSetting } from '@/lib/firebase-settings-store';

export async function getAdSettings(): Promise<AdSettings> {
  return getCachedValue<AdSettings>(
    'settings:ads',
    async () => {
      const data = (await readSiteSetting('ads')) as Partial<AdSettings> | null;

      if (data) {
        const mergedSlots = { ...DEFAULT_AD_SLOTS };
        if (data.slots) {
          Object.keys(DEFAULT_AD_SLOTS).forEach((key) => {
            if (data.slots?.[key]) {
              mergedSlots[key] = {
                ...DEFAULT_AD_SLOTS[key],
                ...data.slots[key],
              };
            }
          });
        }

        return {
          globalEnabled: data.globalEnabled ?? DEFAULT_AD_SETTINGS.globalEnabled,
          slots: mergedSlots,
        };
      }
      return DEFAULT_AD_SETTINGS;
    },
    DEFAULT_AD_SETTINGS
  );
}

export async function saveAdSettings(
  adSettings: AdSettings
): Promise<{ success: boolean; message: string }> {
  try {
    await writeSiteSetting('ads', adSettings as unknown as Record<string, unknown>);
    invalidateCachedKey('settings:ads');

    revalidatePath('/', 'layout');

    return {
      success: true,
      message: 'Ad settings updated and applied site-wide successfully!',
    };
  } catch (error: any) {
    console.error('Error saving ad settings:', error);
    return {
      success: false,
      message: error?.message || 'Failed to save ad settings.',
    };
  }
}
