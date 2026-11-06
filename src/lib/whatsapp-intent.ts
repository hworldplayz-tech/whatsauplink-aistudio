/**
 * Smart WhatsApp Device Join Intent & Sharing Utilities
 */

export interface WhatsAppIntentInfo {
  code: string | null;
  isChannel: boolean;
  mobileAppUrl: string;
  webUrl: string;
  directUrl: string;
}

/**
 * Detects whether the current client is a mobile device (iOS/Android).
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /android|iphone|ipad|ipod|windows phone|iemobile|mobile/i.test(ua);
}

/**
 * Parses a WhatsApp invite link and extracts smart intent URLs.
 */
export function getWhatsAppIntentInfo(link: string): WhatsAppIntentInfo {
  const cleanLink = (link || '').trim();
  
  // Check for channel
  const channelMatch = cleanLink.match(/whatsapp\.com\/channel\/([A-Za-z0-9_-]+)/i);
  if (channelMatch) {
    const code = channelMatch[1];
    return {
      code,
      isChannel: true,
      mobileAppUrl: `whatsapp://channel/${code}`,
      webUrl: `https://web.whatsapp.com/channel/${code}`,
      directUrl: cleanLink,
    };
  }

  // Check for group invite code
  const groupMatch = cleanLink.match(/chat\.whatsapp\.com\/([A-Za-z0-9_-]+)/i);
  if (groupMatch) {
    const code = groupMatch[1];
    return {
      code,
      isChannel: false,
      mobileAppUrl: `whatsapp://chat?code=${code}`,
      webUrl: `https://web.whatsapp.com/accept?code=${code}`,
      directUrl: `https://chat.whatsapp.com/${code}`,
    };
  }

  // Fallback for custom or direct links
  return {
    code: null,
    isChannel: false,
    mobileAppUrl: cleanLink,
    webUrl: cleanLink,
    directUrl: cleanLink,
  };
}

/**
 * Creates the viral 1-Click WhatsApp Share link with pre-filled text.
 */
export function getWhatsAppShareUrl(groupTitle: string, groupId: string): string {
  const siteUrl = 'https://groupsor.co.uk';
  const detailUrl = `${siteUrl}/group/invite/${groupId}`;
  const message = `Hey, found this active WhatsApp group on Groupsor:\n*${groupTitle}*\n\n👉 Join here: ${detailUrl}`;
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
}

/**
 * Intelligently triggers joining WhatsApp based on user device.
 */
export function openSmartWhatsAppJoin(link: string, onTracking?: () => void) {
  if (onTracking) onTracking();

  const intent = getWhatsAppIntentInfo(link);
  const isMobile = isMobileDevice();

  if (isMobile && intent.code) {
    // Attempt native app intent on mobile with fallback
    const start = Date.now();
    window.location.href = intent.mobileAppUrl;
    setTimeout(() => {
      // If user is still on page after 1.5s, app might not be installed, fall back to browser link
      if (Date.now() - start < 2000) {
        window.open(intent.directUrl, '_blank', 'noopener,noreferrer');
      }
    }, 1200);
  } else {
    // On desktop, open direct link which prompts WhatsApp Web / Desktop client
    window.open(intent.directUrl, '_blank', 'noopener,noreferrer');
  }
}
