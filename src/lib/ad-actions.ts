'use server';

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { revalidatePath } from 'next/cache';
import { AdSettings, DEFAULT_AD_SETTINGS, DEFAULT_AD_SLOTS } from './ad-types';

function getFirestoreInstance() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

export async function getAdSettings(): Promise<AdSettings> {
    try {
        const db = getFirestoreInstance();
        const docRef = doc(db, 'settings', 'ads');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data() as Partial<AdSettings>;
            
            // Merge slots carefully with defaults to guarantee all slot keys exist
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
        } else {
            // Document doesn't exist, seed with default settings
            await setDoc(docRef, DEFAULT_AD_SETTINGS);
            return DEFAULT_AD_SETTINGS;
        }
    } catch (error) {
        console.error('Error fetching ad settings:', error);
        return DEFAULT_AD_SETTINGS;
    }
}

export async function saveAdSettings(adSettings: AdSettings): Promise<{ success: boolean; message: string }> {
    try {
        const db = getFirestoreInstance();
        const docRef = doc(db, 'settings', 'ads');
        
        await setDoc(docRef, adSettings, { merge: true });

        // Revalidate all pages so ads update site-wide immediately
        revalidatePath('/', 'layout');

        return { success: true, message: 'Ad settings updated and applied site-wide successfully!' };
    } catch (error: any) {
        console.error('Error saving ad settings:', error);
        return { success: false, message: error?.message || 'Failed to save ad settings.' };
    }
}
