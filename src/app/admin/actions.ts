
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { doc, deleteDoc, updateDoc, serverTimestamp, writeBatch, collection, getDocs, setDoc, getDoc, query, orderBy, limit, startAfter, endBefore, limitToLast, type DocumentSnapshot,getCountFromServer } from 'firebase/firestore';
import type { GroupLink, ModerationSettings, Category, Country, LayoutSettings, NavLink, Report } from '@/lib/data';
import { mapDocToGroupLink, mapDocToCategory, mapDocToCountry, mapDocToReport } from '@/lib/data';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { DEFAULT_CATEGORIES, DEFAULT_COUNTRIES } from '@/lib/constants';
import type { FormState } from '@/lib/types';
import { saveModerationSettings as saveModSettings } from './settings-actions';

// Helper function to initialize Firebase on the server
function getFirestoreInstance() {
    if (!getApps().length) {
        initializeApp(firebaseConfig);
    }
    return getFirestore(getApp());
}

export async function deleteGroup(groupId: string): Promise<{ success: boolean; message: string }> {
  if (!groupId) {
    return { success: false, message: 'Group ID is required.' };
  }

  try {
    const db = getFirestoreInstance();
    const groupDocRef = doc(db, 'groups', groupId);
    await deleteDoc(groupDocRef);
    
    revalidatePath('/admin');
    revalidatePath('/');

    return { success: true, message: 'Group deleted successfully.' };
  } catch (error) {
    console.error('Error deleting group:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to delete group: ${errorMessage}` };
  }
}

export async function toggleFeaturedStatus(groupId: string, currentStatus: boolean): Promise<{ success: boolean; message: string }> {
  if (!groupId) {
    return { success: false, message: 'Group ID is required.' };
  }

  try {
    const db = getFirestoreInstance();
    const groupDocRef = doc(db, 'groups', groupId);
    await updateDoc(groupDocRef, { featured: !currentStatus });
    
    revalidatePath('/admin');
    revalidatePath('/');

    return { success: true, message: `Group marked as ${!currentStatus ? 'featured' : 'not featured'}.` };
  } catch (error) {
    console.error('Error toggling featured status:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, message: `Failed to update group: ${errorMessage}` };
  }
}

export async function deleteMultipleGroups(groupIds: string[]): Promise<{ success: boolean, message: string }> {
    if (!groupIds || groupIds.length === 0) {
        return { success: false, message: 'No group IDs provided.' };
    }

    try {
        const db = getFirestoreInstance();
        const batch = writeBatch(db);

        groupIds.forEach(id => {
            const groupDocRef = doc(db, 'groups', id);
            batch.delete(groupDocRef);
        });

        await batch.commit();

        revalidatePath('/admin');
        revalidatePath('/');

        return { success: true, message: `${groupIds.length} groups deleted successfully.` };
    } catch (error) {
        console.error('Error deleting multiple groups:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to delete groups: ${errorMessage}` };
    }
}

export async function bulkSetFeaturedStatus(groupIds: string[], featured: boolean): Promise<{ success: boolean, message: string }> {
    if (!groupIds || groupIds.length === 0) {
        return { success: false, message: 'No group IDs provided.' };
    }

    try {
        const db = getFirestoreInstance();
        const batch = writeBatch(db);

        groupIds.forEach(id => {
            const groupDocRef = doc(db, 'groups', id);
            batch.update(groupDocRef, { featured });
        });

        await batch.commit();

        revalidatePath('/admin');
        revalidatePath('/');

        const actionText = featured ? 'marked as featured' : 'removed from featured';
        return { success: true, message: `${groupIds.length} group(s) ${actionText}.` };
    } catch (error) {
        console.error('Error bulk setting featured status:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to update groups: ${errorMessage}` };
    }
}

export async function toggleShowClicks(show: boolean): Promise<{ success: boolean; message: string }> {
  try {
    const db = getFirestoreInstance();
    
    // Update the global setting ONLY. This is much more efficient.
    const settingsDocRef = doc(db, 'settings', 'moderation');
    await setDoc(settingsDocRef, { showClicks: show }, { merge: true });

    revalidatePath('/admin');
    revalidatePath('/');

    return { success: true, message: `Click visibility set to ${show ? 'ON' : 'OFF'} globally.` };
  } catch (error) {
    console.error('Error toggling click visibility:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    // The error message from Firestore now gets propagated to the UI.
    return { success: false, message: `Failed to update visibility: ${errorMessage}` };
  }
}

// Re-exporting the settings action from its new location
export async function saveModerationSettings(formData: FormData): Promise<{ success: boolean; message: string }> {
    return saveModSettings(formData);
}


export async function getPaginatedGroups(
    page: number,
    rowsPerPage: number,
): Promise<{ groups: GroupLink[], totalGroups: number, totalPages: number }> {
    try {
        const db = getFirestoreInstance();
        const groupsCollection = collection(db, 'groups');
        
        // First, get the total count of documents
        let totalGroups = 0;
        try {
            const countSnapshot = await getCountFromServer(groupsCollection);
            totalGroups = countSnapshot.data().count;
        } catch (countErr) {
            console.warn('Could not get group count from server (using fallback):', countErr);
        }

        const totalPages = Math.max(1, Math.ceil((totalGroups || 0) / rowsPerPage));

        // Then, fetch the documents for the current page
        let q;
        if (page === 1) {
            q = query(groupsCollection, orderBy('lastSubmittedAt', 'desc'), limit(rowsPerPage));
        } else {
            try {
                // To get to a specific page, we need a cursor from the last doc of the previous page
                const prevPageEndQuery = query(groupsCollection, orderBy('lastSubmittedAt', 'desc'), limit((page - 1) * rowsPerPage));
                const prevPageDocs = await getDocs(prevPageEndQuery);
                const lastVisible = prevPageDocs.docs[prevPageDocs.docs.length - 1];
                
                if (!lastVisible) {
                    return { groups: [], totalGroups, totalPages };
                }

                q = query(groupsCollection, orderBy('lastSubmittedAt', 'desc'), startAfter(lastVisible), limit(rowsPerPage));
            } catch (cursorErr) {
                console.warn('Cursor pagination failed, falling back to simple query:', cursorErr);
                q = query(groupsCollection, limit(rowsPerPage));
            }
        }
        
        const querySnapshot = await getDocs(q);
        const groups = querySnapshot.docs.map(mapDocToGroupLink);
        
        return { groups, totalGroups: totalGroups || groups.length, totalPages };
    } catch (error) {
        console.error('Notice: Error in getPaginatedGroups (graceful fallback):', error);
        return { groups: [], totalGroups: 0, totalPages: 1 };
    }
}

// ----- Categories & Countries Management Actions -----

const FALLBACK_CATEGORIES: Category[] = DEFAULT_CATEGORIES.map(c => ({ id: c.value, label: c.label, value: c.value }));
const FALLBACK_COUNTRIES: Country[] = DEFAULT_COUNTRIES.map(c => ({ id: c.value, label: c.label, value: c.value }));

export async function getCategories(): Promise<Category[]> {
    try {
        const db = getFirestoreInstance();
        const catCollection = collection(db, 'categories');
        const q = query(catCollection, orderBy('label'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return FALLBACK_CATEGORIES;
        const mapped = snapshot.docs.map(mapDocToCategory);
        return mapped.length > 0 ? mapped : FALLBACK_CATEGORIES;
    } catch (error) {
        console.error('Error fetching categories from Firestore, using defaults:', error);
        return FALLBACK_CATEGORIES;
    }
}

export async function getCountries(): Promise<Country[]> {
    try {
        const db = getFirestoreInstance();
        const countryCollection = collection(db, 'countries');
        const q = query(countryCollection, orderBy('label'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return FALLBACK_COUNTRIES;
        const mapped = snapshot.docs.map(mapDocToCountry);
        return mapped.length > 0 ? mapped : FALLBACK_COUNTRIES;
    } catch (error) {
        console.error('Error fetching countries from Firestore, using defaults:', error);
        return FALLBACK_COUNTRIES;
    }
}

const taxonomySchema = z.object({
  label: z.string().min(2, 'Label must be at least 2 characters.'),
  value: z.string().min(2, 'Value must be at least 2 characters. Use lowercase and hyphens (e.g., "my-value").').regex(/^[a-z0-9-]+$/, 'Value can only contain lowercase letters, numbers, and hyphens.'),
});

export async function saveTaxonomyItem(
    type: 'category' | 'country',
    isEditing: boolean,
    formData: FormData
): Promise<{ success: boolean; message: string }> {
    const validatedFields = taxonomySchema.safeParse({
        label: formData.get('label'),
        value: formData.get('value'),
    });

    if (!validatedFields.success) {
        const errorMsg = validatedFields.error.flatten().fieldErrors;
        return { success: false, message: errorMsg.label?.[0] || errorMsg.value?.[0] || 'Invalid data.' };
    }

    const { label, value } = validatedFields.data;
    const collectionName = type === 'category' ? 'categories' : 'countries';

    try {
        const db = getFirestoreInstance();
        const docRef = doc(db, collectionName, value);

        if (!isEditing) {
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { success: false, message: `A ${type} with the value "${value}" already exists.` };
            }
        }

        await setDoc(docRef, { label, value }, { merge: isEditing });
        
        revalidatePath('/admin');
        revalidatePath('/'); // Revalidate homepage for filters

        return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} saved successfully!` };
    } catch (error) {
        console.error(`Error saving ${type}:`, error);
        return { success: false, message: `Failed to save ${type}.` };
    }
}


export async function deleteTaxonomyItem(type: 'category' | 'country', value: string): Promise<{ success: boolean; message: string }> {
    if (!value) {
        return { success: false, message: 'Value is required.' };
    }
    
    // Prevent deletion of 'all'
    if (value === 'all') {
        return { success: false, message: 'Cannot delete the "all" value.' };
    }

    const collectionName = type === 'category' ? 'categories' : 'countries';

    try {
        const db = getFirestoreInstance();
        await deleteDoc(doc(db, collectionName, value));
        
        revalidatePath('/admin');
        revalidatePath('/');

        return { success: true, message: `${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.` };
    } catch (error) {
        console.error(`Error deleting ${type}:`, error);
        return { success: false, message: `Failed to delete ${type}.` };
    }
}

// One-time seeding guard
let hasSeededInitialData = false;

export async function seedInitialData() {
    if (hasSeededInitialData) return;
    try {
        const db = getFirestoreInstance();
        const categoriesRef = collection(db, 'categories');
        const countriesRef = collection(db, 'countries');

        const catSnapshot = await getDocs(query(categoriesRef, limit(1)));
        const countrySnapshot = await getDocs(query(countriesRef, limit(1)));

        const batch = writeBatch(db);
        let writes = 0;

        if (catSnapshot.empty) {
            console.log('Seeding initial categories...');
            DEFAULT_CATEGORIES.forEach(cat => {
                if (cat.value !== 'all') { // Do not write 'all' to db
                    const docRef = doc(db, 'categories', cat.value);
                    batch.set(docRef, { label: cat.label, value: cat.value });
                    writes++;
                }
            });
        }

        if (countrySnapshot.empty) {
            console.log('Seeding initial countries...');
            DEFAULT_COUNTRIES.forEach(country => {
                 if (country.value !== 'all') { // Do not write 'all' to db
                    const docRef = doc(db, 'countries', country.value);
                    batch.set(docRef, { label: country.label, value: country.value });
                    writes++;
                 }
            });
        }

        if (writes > 0) {
            await batch.commit();
            console.log('Initial data seeding complete.');
        }
        hasSeededInitialData = true;
    } catch (error) {
        console.warn('Notice: seedInitialData skipped or deferred:', error);
    }
}

// ------ Layout Settings Actions ------

const defaultLayoutSettings: LayoutSettings = {
    logoUrl: '/groupsor_logo.png',
    navLinks: [
        { id: '1', label: 'Home', href: '/' },
        { id: '2', label: 'Submit Group', href: '/submit' },
        { id: '7', label: 'Blog', href: '/blog' },
        { id: '3', label: 'About', href: '/about' },
        { id: '4', label: 'Contact', href: '/contact' },
        { id: '5', label: 'Privacy', href: '/privacy' },
        { id: '6', label: 'Terms', href: '/terms' },
    ],
    footerContent: {
        heading: 'Groupsor',
        paragraph: 'The largest Collection of Whatsapp groups and channels from around the world.',
        copyrightText: '© 2026 | Groupsor',
    },
    backgroundSettings: {
        bgImageEnabled: true,
        bgImageUrl: '/whatsapp_background_official_image.png',
    },
    homepageSeoContent: {
        enabled: true,
        heading: 'The largest Collection of Whatsapp groups and channels',
        content: `Welcome to Groupsor, the largest and most up-to-date collection of active WhatsApp groups and channels on the internet. If you're searching for the best WhatsApp groups to join, you've come to the right place. Our platform is dedicated to providing a comprehensive collection of genuine and active group links, making it easy for you to discover communities that match your interests. Whether you are looking for UK or USA WhatsApp group links, entertainment groups, or specific hobby communities, Groupsor is your number one resource.

We continuously update our database to ensure you find only the most relevant and active WhatsApp links. Forget dead links and inactive groups; we focus on quality. You can easily find active groups for everything from gaming, technology, business networking, family groups, and education. Every link is a gateway to a new community.

Our mission is to be the best source for discovering and sharing WhatsApp group links and channels. Join thousands of users who trust Groupsor to find active and engaging WhatsApp groups. Start exploring our vast collection of active links today and connect with people from all over the world. Submit your own WhatsApp group or channel link to grow your community and become part of our ever-expanding network of active groups.`
    },
    seoSettings: {
        siteTitle: "Groupsor - The largest Collection of Whatsapp groups and channels",
        metaDescription: "The largest Collection of Whatsapp groups and channels. Discover and join active groups for community, gaming, business, and more. Share your own WhatsApp group link today!",
        metaKeywords: "whatsapp group links, whatsapp groups, whatsapp channels, groupsor, active whatsapp groups"
    }
};

export async function getLayoutSettings(): Promise<LayoutSettings> {
    try {
        const db = getFirestoreInstance();
        const settingsDocRef = doc(db, 'settings', 'layout');
        const docSnap = await getDoc(settingsDocRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            // Merge with defaults to ensure all fields are present
            return {
                ...defaultLayoutSettings,
                ...data,
                footerContent: {
                    ...defaultLayoutSettings.footerContent,
                    ...data.footerContent,
                },
                backgroundSettings: {
                    ...defaultLayoutSettings.backgroundSettings,
                    ...data.backgroundSettings,
                },
                homepageSeoContent: {
                    ...defaultLayoutSettings.homepageSeoContent,
                    ...data.homepageSeoContent,
                },
                seoSettings: {
                    ...defaultLayoutSettings.seoSettings,
                    ...data.seoSettings,
                }
            };
        } else {
            return defaultLayoutSettings;
        }
    } catch (error) {
        console.error('Error fetching layout settings:', error);
        // On error, return defaults to prevent site crash
        return defaultLayoutSettings;
    }
}

const layoutSettingsSchema = z.object({
  logoUrl: z.string().optional(),
  navLinks: z.string().transform(val => JSON.parse(val) as NavLink[]),
  footerHeading: z.string(),
  footerParagraph: z.string(),
  footerCopyright: z.string(),
  bgImageEnabled: z.enum(['on', 'off']).transform(val => val === 'on'),
  bgImageUrl: z.string().optional(),
  seoEnabled: z.enum(['on', 'off']).transform(val => val === 'on'),
  seoHeading: z.string(),
  seoContent: z.string(),
  siteTitle: z.string().min(5, "Site title must be at least 5 characters."),
  metaDescription: z.string().min(20, "Meta description must be at least 20 characters."),
  metaKeywords: z.string().optional(),
});

export async function saveLayoutSettings(formData: FormData): Promise<{ success: boolean; message: string }> {
    const validatedFields = layoutSettingsSchema.safeParse({
        logoUrl: formData.get('logoUrl'),
        navLinks: formData.get('navLinks'),
        footerHeading: formData.get('footerHeading'),
        footerParagraph: formData.get('footerParagraph'),
        footerCopyright: formData.get('footerCopyright'),
        bgImageEnabled: formData.get('bgImageEnabled'),
        bgImageUrl: formData.get('bgImageUrl'),
        seoEnabled: formData.get('seoEnabled'),
        seoHeading: formData.get('seoHeading'),
        seoContent: formData.get('seoContent'),
        siteTitle: formData.get('siteTitle'),
        metaDescription: formData.get('metaDescription'),
        metaKeywords: formData.get('metaKeywords'),
    });

    if (!validatedFields.success) {
        console.log(validatedFields.error.flatten());
        return { success: false, message: 'Invalid data format.' };
    }

    try {
        const { 
            navLinks, footerHeading, footerParagraph, footerCopyright, 
            logoUrl, bgImageEnabled, bgImageUrl, seoEnabled, seoHeading, seoContent,
            siteTitle, metaDescription, metaKeywords
        } = validatedFields.data;
        
        const settingsToSave: Partial<LayoutSettings> = {
            logoUrl: logoUrl || '',
            navLinks: navLinks,
            footerContent: {
                heading: footerHeading,
                paragraph: footerParagraph,
                copyrightText: footerCopyright,
            },
            backgroundSettings: {
                bgImageEnabled,
                bgImageUrl: bgImageUrl || '',
            },
            homepageSeoContent: {
                enabled: seoEnabled,
                heading: seoHeading,
                content: seoContent,
            },
            seoSettings: {
                siteTitle,
                metaDescription,
                metaKeywords: metaKeywords || '',
            }
        };

        const db = getFirestoreInstance();
        const settingsDocRef = doc(db, 'settings', 'layout');
        await setDoc(settingsDocRef, settingsToSave, { merge: true });

        // Revalidate all paths since header and footer are on every page
        revalidatePath('/', 'layout');

        return { success: true, message: 'Layout settings saved successfully.' };
    } catch (error) {
        console.error('Error saving layout settings:', error);
        return { success: false, message: 'Failed to save layout settings.' };
    }
}

// ------ Report Management Actions ------

export async function getReports(): Promise<Report[]> {
    try {
        const db = getFirestoreInstance();
        const reportsCollection = collection(db, 'reports');
        const q = query(reportsCollection, orderBy('createdAt', 'desc'), limit(50));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return [];
        return snapshot.docs.map(mapDocToReport);
    } catch (error) {
        console.error('Notice: Could not fetch reports (graceful fallback):', error);
        return [];
    }
}

export async function deleteReport(reportId: string): Promise<{ success: boolean; message: string }> {
    if (!reportId) {
        return { success: false, message: 'Report ID is required.' };
    }

    try {
        const db = getFirestoreInstance();
        await deleteDoc(doc(db, 'reports', reportId));
        revalidatePath('/admin');
        return { success: true, message: 'Report deleted successfully.' };
    } catch (error) {
        console.error('Error deleting report:', error);
        return { success: false, message: 'Failed to delete report.' };
    }
}
