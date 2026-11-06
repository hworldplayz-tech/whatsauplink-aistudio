
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
import { DEFAULT_CATEGORIES, DEFAULT_COUNTRIES } from '@/lib/constants';
import Link from 'next/link';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap', // Improves font loading performance
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const layoutSettings = await getLayoutSettings();
    const seoSettings = layoutSettings?.seoSettings || {
      siteTitle: "Groupsor - The largest Collection of Whatsapp groups and channels",
      metaDescription: "The largest Collection of Whatsapp groups and channels. Discover and join active groups for family, friends, USA communities, entertainment, gaming, and more. Share your own WhatsApp group link today!",
      metaKeywords: "whatsapp group links, whatsapp groups, whatsapp channels, groupsor, active whatsapp groups"
    };
    const logoUrl = layoutSettings?.logoUrl || '/groupsor_logo.png';

    const title = seoSettings.siteTitle || "Groupsor - The largest Collection of Whatsapp groups and channels";
    const description = seoSettings.metaDescription || "The largest Collection of Whatsapp groups and channels.";

    return {
      metadataBase: new URL('https://groupsor.co.uk'),
      title: {
        default: title,
        template: '%s - Groupsor',
      },
      description: description,
      openGraph: {
        title: title,
        description: description,
        url: 'https://groupsor.co.uk',
        siteName: 'Groupsor',
        locale: 'en_US',
        type: 'website',
        images: [logoUrl],
      },
      keywords: seoSettings.metaKeywords,
      icons: {
        icon: '/favicon.ico',
        apple: '/apple-touch-icon.png',
      },
      alternates: {
        canonical: 'https://groupsor.co.uk',
      },
      verification: {
        google: 'google-site-verification-token',
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
      metadataBase: new URL('https://groupsor.co.uk'),
      title: 'Groupsor - The largest Collection of Whatsapp groups and channels',
      description: 'The largest Collection of Whatsapp groups and channels.',
    };
  }
}


export const viewport: Viewport = {
  themeColor: '#25D366',
};


const DEFAULT_LAYOUT_FALLBACK = {
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
    content: 'Welcome to Groupsor, the largest collection of active WhatsApp group links and channels.',
  },
  seoSettings: {
    siteTitle: "Groupsor - The largest Collection of Whatsapp groups and channels",
    metaDescription: "The largest Collection of Whatsapp groups and channels.",
    metaKeywords: "whatsapp group links, whatsapp groups, whatsapp channels, groupsor"
  }
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let moderationSettings: any = { tickerSpeed: 40 };
  let layoutSettings: any = { ...DEFAULT_LAYOUT_FALLBACK };
  let categories: any[] = [...DEFAULT_CATEGORIES];
  let countries: any[] = [...DEFAULT_COUNTRIES];
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
    if (results[1].status === 'fulfilled' && results[1].value) {
      layoutSettings = { 
        ...DEFAULT_LAYOUT_FALLBACK, 
        ...results[1].value,
        footerContent: { ...DEFAULT_LAYOUT_FALLBACK.footerContent, ...(results[1].value.footerContent || {}) },
        backgroundSettings: { ...DEFAULT_LAYOUT_FALLBACK.backgroundSettings, ...(results[1].value.backgroundSettings || {}) },
      };
    }
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
        {/* Schema.org WebSite & SearchAction structured data for Google SERP rich presence */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Groupsor',
              alternateName: ['Groupsor UK', 'Groupsor WhatsApp Directory'],
              url: 'https://groupsor.co.uk',
              description: 'The largest collection of active WhatsApp groups and channels.',
              potentialAction: {
                '@type': 'SearchAction',
                target: {
                  '@type': 'EntryPoint',
                  urlTemplate: 'https://groupsor.co.uk/?search={search_term_string}',
                },
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
        {/* The AdSense script is handled via the next/script component */}
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-8130991342525434"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body className={`${inter.variable} font-body antialiased`} style={bodyStyle} suppressHydrationWarning>
        <Suspense>
          <TopProgressBar />
        </Suspense>
        <div className="flex flex-col min-h-screen">
          <Providers>
            <Suspense fallback={<header className="h-16 border-b bg-card" />}>
              <Header 
                navLinks={layoutSettings?.navLinks || DEFAULT_LAYOUT_FALLBACK.navLinks} 
                logoUrl={layoutSettings?.logoUrl || DEFAULT_LAYOUT_FALLBACK.logoUrl}
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
                <div className={`flex flex-col md:flex-row items-center gap-12 ${moderationSettings?.showNewsletter ? 'justify-between' : 'justify-center'}`}>
                  <div className={`flex flex-col items-center ${moderationSettings?.showNewsletter ? 'md:items-start text-center md:text-left' : 'text-center md:items-center md:text-center'}`}>
                      <h3 className="text-xl font-bold">
                        {layoutSettings?.footerContent?.heading && layoutSettings.footerContent.heading !== 'WhatsUpLink'
                          ? layoutSettings.footerContent.heading
                          : 'Groupsor'}
                      </h3>
                      <p className="text-muted-foreground mt-2 max-w-md">
                        {layoutSettings?.footerContent?.paragraph && !layoutSettings.footerContent.paragraph.includes('WhatsUpLink')
                          ? layoutSettings.footerContent.paragraph
                          : 'The largest Collection of Whatsapp groups and channels from around the world.'}
                      </p>
                       <p className="text-sm text-muted-foreground mt-8">
                          © 2026 |{' '}
                          <Link href="/" className="hover:underline font-medium text-foreground">
                            Groupsor
                          </Link>
                        </p>
                  </div>
                  {moderationSettings?.showNewsletter && (
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
