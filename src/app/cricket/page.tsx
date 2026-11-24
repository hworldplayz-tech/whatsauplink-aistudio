import type { Metadata } from 'next';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/layout/breadcrumbs';
import { CricketScoreboard } from '@/components/cricket/cricket-scoreboard';
import { fetchCricketOverviewFromRest } from '@/lib/cricket-feed';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Live Cricket Scores, Match Schedule & Recent Results',
  description:
    'Follow real-time live cricket scores, upcoming international & T20 fixtures, and recent match results with instant live alerts on Groupsor.',
  alternates: {
    canonical: 'https://groupsor.co.uk/cricket',
  },
  openGraph: {
    title: 'Live Cricket Scores & Match Schedule | Groupsor',
    description:
      'Follow real-time live cricket scores, upcoming fixtures, and recent match results on Groupsor.',
    url: 'https://groupsor.co.uk/cricket',
    siteName: 'Groupsor',
    type: 'website',
  },
};

export default async function CricketPage() {
  const initialOverview = await fetchCricketOverviewFromRest();

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Cricket Live Scores' },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <CricketScoreboard initialOverview={initialOverview} />
    </>
  );
}
