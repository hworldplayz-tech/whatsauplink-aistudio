import type { Metadata } from 'next';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/layout/breadcrumbs';
import { getCategories, getCountries } from '@/app/admin/actions';
import { WidgetBuilder } from '@/components/embed/widget-builder';

export const metadata: Metadata = {
  title: 'Embed WhatsApp Groups Widget & Public API | Groupsor',
  description:
    'Add an auto-updating WhatsApp groups widget to your website, blog, or sports portal in 2 lines of HTML, or fetch live groups via our public JSON API.',
  alternates: {
    canonical: 'https://groupsor.co.uk/embed',
  },
};

export default async function EmbedPage() {
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Embed Widget' },
  ];

  const [categories, countries] = await Promise.all([
    getCategories().catch(() => []),
    getCountries().catch(() => []),
  ]);

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <main className="flex-1 bg-background">
        <div className="container mx-auto py-10 md:py-14 max-w-6xl">
          <div className="mx-auto max-w-3xl text-center space-y-3 mb-10">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Embed <span className="text-[#25D366]">WhatsApp Groups</span> Widget
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Display live, active WhatsApp groups &amp; channels on your cricket site, news blog, or community portal with zero maintenance.
            </p>
          </div>

          <WidgetBuilder categories={categories} countries={countries} />
        </div>
      </main>
    </>
  );
}
