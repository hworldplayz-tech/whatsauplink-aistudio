
import { Breadcrumbs, type BreadcrumbItem } from '@/components/layout/breadcrumbs';

export default async function AboutPage() {
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'About' },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <main className="flex-1 bg-card">
        <div className="container py-12 md:py-24">
          <div className="mx-auto max-w-3xl space-y-8">
            <div className="space-y-4 text-center">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">About Groupsor</h1>
              <p className="text-lg text-muted-foreground">
                The largest Collection of Whatsapp groups and channels from around the world.
              </p>
            </div>
            <div className="space-y-6 text-lg">
              <p>
                Welcome to Groupsor! Our mission is to create a comprehensive and easy-to-use directory of WhatsApp group links and channels from around the world. Whether you're looking for a group to discuss your favorite hobbies, stay updated on news, connect with professionals in your field, or just find a fun community, we've got you covered. From global WhatsApp group links to communities for gaming, tech, and networking, our goal is to be the ultimate resource.
              </p>
              <p>
                Our platform allows users to easily submit new WhatsApp group links and channels, helping our directory grow and stay up-to-date. Each submission for a group link is reviewed to ensure quality and safety for our community. You can browse groups by category, country, or search for specific keywords to find exactly what you're looking for.
              </p>
              <p>
                We believe in the power of community and connection. Groupsor was built to bridge the gap and make it easier for people to find their tribes by sharing and joining the best WhatsApp group links and channels available. Thank you for being a part of our growing community!
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
