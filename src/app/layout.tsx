
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Inter } from 'next/font/google';
import { ScrollToTop } from '@/components/layout/scroll-to-top';
import { NewsletterSignup } from '@/components/layout/newsletter-signup';
import { getModerationSettings } from '@/lib/admin-settings';
import { getLayoutSettings, getCategories, getCountries } from './admin/actions';
import { getAdSettings } from '@/lib/ad-actions';
import { Header } from '@/components/layout/header';
import { TopProgressBar } from '@/components/layout/top-progress-bar';
import { Suspense } from 'react';
import { Providers } from './providers';
import Script from 'next/script';
import { AdSlot } from '@/components/ads/ad-slot';
import { PopupAdModal, StickyBottomAdBar } from '@/components/ads/popup-ad';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap', // Improves font loading performance
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const layoutSettings = await getLayoutSettings();
    const seoSettings = layoutSettings?.seoSettings || {
      siteTitle: "Join active whatsapp group links | submit your group - Whatuplink",
      metaDescription: "The ultimate directory for WhatsApp group links. Discover and join groups for family, friends, USA communities, entertainment, PUBG, Freefire, adult topics, and more. Share your own WhatsApp group link today!",
      metaKeywords: "whatsapp group links, whatsapp groups, usa whatsapp group, family whatsapp group link, adult whatsapp group links"
    };
    const logoUrl = layoutSettings?.logoUrl || '/whatsuplink_logo_and_favicon_without_background.png';

    const title = seoSettings.siteTitle || "Join active whatsapp group links | submit your group - Whatuplink";
    const description = seoSettings.metaDescription || "The ultimate directory for WhatsApp group links.";

    return {
      metadataBase: new URL('https://whatsuplink.online'),
      title: {
        default: title,
        template: '%s - Whatsuplink',
      },
      description: description,
      openGraph: {
        title: title,
        description: description,
        url: 'https://whatsuplink.online',
        siteName: 'WhatsUpLink',
        locale: 'en_US',
        type: 'website',
        images: [logoUrl],
      },
      keywords: seoSettings.metaKeywords,
      icons: {
        icon: '/favicon.ico',
        apple: '/apple-touch-icon.png',
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          'max-video-preview': -1,
          'max-image-preview': 'large',
          'max-snippet': -1,
        },
      },
    };
  } catch (error) {
    console.error('Notice: Error in generateMetadata, using fallback:', error);
    return {
      metadataBase: new URL('https://whatsuplink.online'),
      title: 'Join active whatsapp group links | submit your group - Whatuplink',
      description: 'The ultimate directory for WhatsApp group links.',
    };
  }
}


export const viewport: Viewport = {
  themeColor: '#25D366',
};


export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let moderationSettings: any = { tickerSpeed: 40 };
  let layoutSettings: any = { backgroundSettings: { bgImageEnabled: false } };
  let categories: any[] = [];
  let countries: any[] = [];
  let adSettings: any = { globalEnabled: false, slots: {} };

  try {
    const results = await Promise.allSettled([
      getModerationSettings(),
      getLayoutSettings(),
      getCategories(),
      getCountries(),
      getAdSettings(),
    ]);
    
    if (results[0].status === 'fulfilled') moderationSettings = results[0].value;
    if (results[1].status === 'fulfilled') layoutSettings = results[1].value;
    if (results[2].status === 'fulfilled') categories = results[2].value;
    if (results[3].status === 'fulfilled') countries = results[3].value;
    if (results[4].status === 'fulfilled') adSettings = results[4].value;
  } catch (err) {
    console.error('Notice: Error resolving settings in RootLayout:', err);
  }
  
  const bodyStyle: React.CSSProperties & Record<string, string> = {
    '--ticker-speed': `${moderationSettings?.tickerSpeed ?? 40}s`
  };

  const bgSettings = layoutSettings?.backgroundSettings;
  if (bgSettings?.bgImageEnabled && bgSettings?.bgImageUrl) {
    bodyStyle['--background-image'] = `url(${bgSettings.bgImageUrl})`;
  } else {
    bodyStyle['--background-image'] = 'none';
  }


  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* The AdSense script is now handled via the next/script component below */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8130991342525434"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
        <style>
          {`
            @keyframes marquee {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .animate-marquee {
              animation: marquee var(--ticker-speed, 40s) linear infinite;
            }
            .animate-marquee:hover {
              animation-play-state: paused;
            }
          `}
        </style>
      </head>
      <body className={`${inter.variable} font-body antialiased`} style={bodyStyle}>
        <Suspense>
          <TopProgressBar />
        </Suspense>
        <div className="flex flex-col min-h-screen">
          <Providers>
            <Suspense fallback={<header className="h-16 border-b bg-card" />}>
              <Header 
                navLinks={layoutSettings.navLinks} 
                logoUrl={layoutSettings.logoUrl}
                categories={categories}
                countries={countries}
              />
            </Suspense>
            
            {/* Header Top Leaderboard Ad */}
            <AdSlot placement="header_top" adSettings={adSettings} className="container max-w-7xl px-4 my-2" />

            <main className="flex-1 relative z-10">
              {children}
            </main>

            {/* Above Footer Banner Ad */}
            <AdSlot placement="footer_top" adSettings={adSettings} className="container max-w-7xl px-4 my-6" />

            {/* Popups & Sticky Ads */}
            <PopupAdModal adSettings={adSettings} />
            <StickyBottomAdBar adSettings={adSettings} />

            <ScrollToTop />
            <Toaster />
            <footer className="border-t bg-card">
              <div className="container py-12">
                <div className={`flex flex-col md:flex-row items-center gap-12 ${moderationSettings.showNewsletter ? 'justify-between' : 'justify-center'}`}>
                  <div className={`flex flex-col items-center ${moderationSettings.showNewsletter ? 'md:items-start text-center md:text-left' : 'text-center md:items-center md:text-center'}`}>
                      <h3 className="text-xl font-bold">{layoutSettings.footerContent.heading}</h3>
                      <p className="text-muted-foreground mt-2 max-w-md">
                        {layoutSettings.footerContent.paragraph}
                      </p>
                       <p className="text-sm text-muted-foreground mt-8">
                          {layoutSettings.footerContent.copyrightText}
                        </p>
                  </div>
                  {moderationSettings.showNewsletter && (
                    <div className="flex-shrink-0 w-full md:w-auto">
                        <NewsletterSignup />
                    </div>
                  )}
                </div>
              </div>
            </footer>
          </Providers>
        </div>
      </body>
    </html>
  );
}
