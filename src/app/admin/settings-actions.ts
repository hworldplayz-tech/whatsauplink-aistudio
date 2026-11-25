
'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { invalidateCachedKey } from '@/lib/settings-cache';
import { writeSiteSetting } from '@/lib/firebase-settings-store';

const moderationSettingsSchema = z.object({
    cooldownEnabled: z.enum(['on', 'off']).transform(val => val === 'on'),
    cooldownValue: z.coerce.number().min(1, 'Value must be at least 1'),
    cooldownUnit: z.enum(['hours', 'days', 'months']),
    groupsPerPage: z.coerce.number().min(1, 'Must be at least 1').max(100, 'Cannot exceed 100'),
    showFeatured: z.enum(['on', 'off']).transform(val => val === 'on'),
    featuredGroupsDisplay: z.enum(['slider', 'grid', 'list']),
    showNewsletter: z.enum(['on', 'off']).transform(val => val === 'on'),
    showDynamicSeoContent: z.enum(['on', 'off']).transform(val => val === 'on'),
    showRatings: z.enum(['on', 'off']).transform(val => val === 'on'),
    showClicks: z.enum(['on', 'off']).transform(val => val === 'on'),
    showTicker: z.enum(['on', 'off']).transform(val => val === 'on'),
    tickerSpeed: z.coerce.number().min(5).max(100),
    enableCricketWidget: z.enum(['on', 'off']).optional().transform(val => val !== 'off'),
    cricketWidgetMajorOnly: z.enum(['on', 'off']).optional().transform(val => val !== 'off'),
    cricketPinnedMatchId: z.string().optional().default(''),
});

export async function saveModerationSettings(formData: FormData): Promise<{ success: boolean; message: string }> {
    const validatedFields = moderationSettingsSchema.safeParse({
        cooldownEnabled: formData.get('cooldownEnabled'),
        cooldownValue: formData.get('cooldownValue'),
        cooldownUnit: formData.get('cooldownUnit'),
        groupsPerPage: formData.get('groupsPerPage'),
        showFeatured: formData.get('showFeatured'),
        featuredGroupsDisplay: formData.get('featuredGroupsDisplay'),
        showNewsletter: formData.get('showNewsletter'),
        showDynamicSeoContent: formData.get('showDynamicSeoContent'),
        showRatings: formData.get('showRatings'),
        showClicks: formData.get('showClicks'),
        showTicker: formData.get('showTicker'),
        tickerSpeed: formData.get('tickerSpeed'),
        enableCricketWidget: formData.get('enableCricketWidget') || 'on',
        cricketWidgetMajorOnly: formData.get('cricketWidgetMajorOnly') || 'on',
        cricketPinnedMatchId: formData.get('cricketPinnedMatchId') || '',
    });
    
    if (!validatedFields.success) {
        const errorMsg = validatedFields.error.flatten().fieldErrors;
        console.error("Validation errors:", errorMsg);
        return { success: false, message: 'Invalid settings provided.' };
    }

    try {
        await writeSiteSetting('moderation', validatedFields.data as Record<string, unknown>);
        invalidateCachedKey('settings:moderation');

        revalidatePath('/admin');
        revalidatePath('/');
        
        return { success: true, message: 'Global settings saved successfully.' };
    } catch (error) {
        console.error('Error saving moderation settings:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return { success: false, message: `Failed to save settings: ${errorMessage}` };
    }
}
