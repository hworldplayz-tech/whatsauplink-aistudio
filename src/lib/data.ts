
import { getDoc, doc, collection, getDocs, query, where, limit, Timestamp, Firestore, DocumentData } from 'firebase/firestore';
import { getModerationSettings as getGlobalModerationSettings } from '@/lib/admin-settings';

export type GroupLink = {
  id: string;
  title: string;
  description: string;
  link: string;
  imageUrl: string;
  imageHint: string;
  category: string;
  country: string;
  tags: string[];
  featured: boolean;
  createdAt: string | null; // Always a string or null
  type: 'group' | 'channel' | 'community';
  language?: string;
  clicks?: number;
  showClicks?: boolean;
  submissionCount?: number;
  lastSubmittedAt?: string | null;
  totalRating?: number;
  ratingCount?: number;
  isVerified?: boolean;
  status?: 'active' | 'full' | 'revoked' | 'reported';
  reportCount?: number;
  workingVotes?: number;
  brokenVotes?: number;
  lastVerifiedAt?: string | null;
};

export type Report = {
    id: string;
    groupId: string;
    groupTitle: string;
    reason: string;
    status: 'pending' | 'resolved';
    createdAt: string | null;
}

export type ModerationSettings = {
    cooldownEnabled: boolean;
    cooldownValue: number;
    cooldownUnit: 'hours' | 'days' | 'months';
    showClicks: boolean;
    groupsPerPage: number;
    showFeatured: boolean;
    featuredGroupsDisplay: 'slider' | 'grid' | 'list';
    showNewsletter: boolean;
    showDynamicSeoContent: boolean;
    showRatings: boolean;
    showTicker: boolean;
    tickerSpeed: number;
};

export type Category = {
    id: string;
    label: string;
    value: string;
};

export type Country = {
    id: string;
    label: string;
    value: string;
};

export type NavLink = {
  id: string;
  label: string;
  href: string;
};

export type FooterContent = {
  heading: string;
  paragraph: string;
  copyrightText: string;
};

export type BackgroundSettings = {
  bgImageEnabled: boolean;
  bgImageUrl: string;
};

export type HomepageSeoContentSettings = {
    enabled: boolean;
    heading: string;
    content: string;
};

export type SeoSettings = {
    siteTitle: string;
    metaDescription: string;
    metaKeywords: string;
};

export type LayoutSettings = {
  logoUrl?: string;
  headerScripts?: string;
  navLinks: NavLink[];
  footerContent: FooterContent;
  backgroundSettings: BackgroundSettings;
  homepageSeoContent: HomepageSeoContentSettings;
  seoSettings: SeoSettings;
};

const formatTimestamp = (timestamp: any): string | null => {
    if (!timestamp) return null;
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toISOString();
    }
    // Handle cases where it might already be a string from a previous serialization
    if (typeof timestamp === 'string') {
        const date = new Date(timestamp);
        return !isNaN(date.getTime()) ? date.toISOString() : null;
    }
    // Handle Firestore server timestamp object before it's converted
    if (typeof timestamp === 'object' && timestamp.seconds !== undefined && timestamp.nanoseconds !== undefined) {
        return new Date(timestamp.seconds * 1000).toISOString();
    }
    return null;
}

// This function now robustly handles Timestamps from the server
// and ensures a serializable string is always returned.
export function mapDocToGroupLink(doc: DocumentData): GroupLink {
    const data = doc.data();
    
    return {
        id: doc.id,
        title: data.title || 'Untitled',
        description: data.description || 'No description',
        link: data.link || '',
        imageUrl: data.imageUrl || 'https://picsum.photos/seed/placeholder/512/512',
        imageHint: data.imageHint || '',
        category: data.category || 'uncategorized',
        country: data.country || 'unknown',
        tags: data.tags || [],
        featured: data.featured || false,
        createdAt: formatTimestamp(data.createdAt),
        type: data.type || 'group',
        language: data.language || 'en',
        clicks: data.clicks || 0,
        // If showClicks is not defined on the doc, default to true for backward compatibility.
        // This ensures old and new documents behave consistently.
        showClicks: typeof data.showClicks === 'boolean' ? data.showClicks : true,
        submissionCount: data.submissionCount || 1,
        lastSubmittedAt: formatTimestamp(data.lastSubmittedAt),
        totalRating: data.totalRating || 0,
        ratingCount: data.ratingCount || 0,
        isVerified: Boolean(data.isVerified),
        status: data.status || 'active',
        reportCount: data.reportCount || 0,
        workingVotes: data.workingVotes || 0,
        brokenVotes: data.brokenVotes || 0,
        lastVerifiedAt: formatTimestamp(data.lastVerifiedAt),
    };
}

export function mapDocToReport(doc: DocumentData): Report {
    const data = doc.data();
    return {
        id: doc.id,
        groupId: data.groupId || '',
        groupTitle: data.groupTitle || 'Unknown Group',
        reason: data.reason || 'No reason given',
        status: data.status || 'pending',
        createdAt: formatTimestamp(data.createdAt),
    };
}


export function mapDocToCategory(doc: DocumentData): Category {
    const data = doc.data();
    return {
        id: doc.id,
        label: data.label || 'No Label',
        value: data.value || doc.id,
    };
}

export function mapDocToCountry(doc: DocumentData): Country {
    const data = doc.data();
    return {
        id: doc.id,
        label: data.label || 'No Label',
        value: data.value || doc.id,
    };
}

// Fetch group by ID with safe error handling
export async function getGroupById(firestore: Firestore, id: string | undefined): Promise<GroupLink | undefined> {
    if (!id) return undefined;
    
    try {
        const [groupDocSnap, settings] = await Promise.all([
            getDoc(doc(firestore, 'groups', id)),
            getGlobalModerationSettings() // Fetch global settings
        ]);

        if (groupDocSnap.exists()) {
            const group = mapDocToGroupLink(groupDocSnap);
            // Override with the global setting
            group.showClicks = settings.showClicks;
            return group;
        } else {
            console.log("No such document!");
            return undefined;
        }
    } catch (error) {
        console.error("Error getting group by ID:", error);
        return undefined;
    }
}

// Fetch 4-6 related groups with fallback to country or general active groups
export async function getRelatedGroups(firestore: Firestore, currentGroup: GroupLink): Promise<GroupLink[]> {
    if (!currentGroup) return [];

    try {
        const [categorySnapshot, settings] = await Promise.all([
            getDocs(query(
                collection(firestore, 'groups'),
                where('category', '==', currentGroup.category),
                where('__name__', '!=', currentGroup.id),
                limit(6)
            )),
            getGlobalModerationSettings()
        ]);

        const related = categorySnapshot.docs.map(doc => {
            const group = mapDocToGroupLink(doc);
            group.showClicks = settings.showClicks;
            return group;
        });

        // If fewer than 4 related by category, backfill with same country or recent groups
        if (related.length < 4) {
            const existingIds = new Set([currentGroup.id, ...related.map(r => r.id)]);
            const fallbackSnapshot = await getDocs(query(
                collection(firestore, 'groups'),
                where('country', '==', currentGroup.country),
                limit(6)
            ));

            fallbackSnapshot.docs.forEach(doc => {
                if (!existingIds.has(doc.id) && related.length < 6) {
                    existingIds.add(doc.id);
                    const group = mapDocToGroupLink(doc);
                    group.showClicks = settings.showClicks;
                    related.push(group);
                }
            });
        }

        return related;

    } catch (error) {
        console.error("Error fetching related groups:", error);
        return [];
    }
}
