'use server';

import { doc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import type { ModerationSettings } from '@/lib/data';
import { getCachedValue } from '@/lib/settings-cache';

function getFirestoreInstance() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

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
      const db = getFirestoreInstance();
      const settingsDocRef = doc(db, 'settings', 'moderation');
      const docSnap = await getDoc(settingsDocRef);
      if (docSnap.exists()) {
        return {
          ...DEFAULT_MODERATION_SETTINGS,
          ...(docSnap.data() as Partial<ModerationSettings>),
        };
      }
      return DEFAULT_MODERATION_SETTINGS;
    },
    DEFAULT_MODERATION_SETTINGS
  );
}
