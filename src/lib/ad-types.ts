export type AdType = 'code' | 'banner';

export type AdSlotConfig = {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: AdType;
  code: string;
  bannerUrl: string;
  bannerLink: string;
  bannerAlt: string;
  showLabel: boolean;
  popupDelaySeconds?: number;
  inFeedInterval?: number;
};

export type AdSettings = {
  globalEnabled: boolean;
  slots: Record<string, AdSlotConfig>;
};

export const DEFAULT_AD_SLOTS: Record<string, AdSlotConfig> = {
  header_top: {
    id: 'header_top',
    name: 'Header Top Leaderboard',
    description: 'Appears at the top of the website directly below or above the main header bar.',
    enabled: true,
    type: 'banner',
    code: '<!-- Paste AdSense / Ad Network Script Here -->\n<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"></script>',
    bannerUrl: 'https://picsum.photos/seed/headerad/728/90',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Promote your WhatsApp Group or Channel here',
    showLabel: true,
  },
  home_above_list: {
    id: 'home_above_list',
    name: 'Above Groups List',
    description: 'Appears on the homepage, category, and country pages right above the group listings grid.',
    enabled: true,
    type: 'banner',
    code: '',
    bannerUrl: 'https://picsum.photos/seed/abovelist/970/90',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Feature your group at the top of the list',
    showLabel: true,
  },
  home_in_feed: {
    id: 'home_in_feed',
    name: 'In-Feed Grid Native Ad',
    description: 'Appears seamlessly inside the group grid listing (e.g. as a sponsored card every N items).',
    enabled: true,
    type: 'banner',
    code: '',
    bannerUrl: 'https://picsum.photos/seed/infeedad/400/250',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Sponsored Group Placement',
    showLabel: true,
    inFeedInterval: 6,
  },
  group_detail_top: {
    id: 'group_detail_top',
    name: 'Group Detail Top Banner',
    description: 'Appears at the top of individual group/channel details view.',
    enabled: true,
    type: 'banner',
    code: '',
    bannerUrl: 'https://picsum.photos/seed/detailtop/728/90',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Promote your channel to targeted visitors',
    showLabel: true,
  },
  group_detail_bottom: {
    id: 'group_detail_bottom',
    name: 'Group Detail Above Join Button',
    description: 'High converting position directly above or below the "Join WhatsApp Group" button.',
    enabled: true,
    type: 'banner',
    code: '',
    bannerUrl: 'https://picsum.photos/seed/detailbottom/728/90',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Advertise your WhatsApp group link',
    showLabel: true,
  },
  sidebar: {
    id: 'sidebar',
    name: 'Sidebar Widget Banner',
    description: 'Appears in the desktop sidebar area on category, country, and group detail pages.',
    enabled: true,
    type: 'banner',
    code: '',
    bannerUrl: 'https://picsum.photos/seed/sidebarad/300/250',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Sidebar Banner Ad',
    showLabel: true,
  },
  footer_top: {
    id: 'footer_top',
    name: 'Above Footer Banner',
    description: 'Appears directly above the website footer section across all pages.',
    enabled: true,
    type: 'banner',
    code: '',
    bannerUrl: 'https://picsum.photos/seed/footerad/728/90',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Advertise on WhatsUpLink',
    showLabel: true,
  },
  sticky_bottom: {
    id: 'sticky_bottom',
    name: 'Sticky Floating Bottom Banner',
    description: 'Fixed floating banner at the bottom of screen with a close button.',
    enabled: false,
    type: 'banner',
    code: '',
    bannerUrl: 'https://picsum.photos/seed/stickybottom/728/90',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Promote your group now',
    showLabel: true,
  },
  popup_modal: {
    id: 'popup_modal',
    name: 'Pop-Up / Interstitial Overlay Ad',
    description: 'Floating modal ad or popup script code that opens after a user stays on page for X seconds.',
    enabled: false,
    type: 'code',
    code: '<!-- Popup / Popunder Ad Code or Custom Script -->\n<div class="p-6 text-center">\n  <h3 class="text-lg font-bold text-emerald-600 mb-2">Grow Your WhatsApp Community!</h3>\n  <p class="text-sm text-gray-600 mb-4">Submit your group link today to get thousands of active members instantly.</p>\n  <a href="/submit" class="inline-block bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-emerald-700 transition-colors">Submit Group Now</a>\n</div>',
    bannerUrl: 'https://picsum.photos/seed/popupad/500/300',
    bannerLink: 'https://whatsuplink.online/submit',
    bannerAlt: 'Special Offer',
    showLabel: true,
    popupDelaySeconds: 5,
  },
};

export const DEFAULT_AD_SETTINGS: AdSettings = {
  globalEnabled: true,
  slots: DEFAULT_AD_SLOTS,
};
