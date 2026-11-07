
import { ContactForm } from '@/components/contact/contact-form';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/layout/breadcrumbs';

export default async function ContactPage() {
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: 'Contact' },
  ];

  return (
    <>
      <Breadcrumbs items={breadcrumbItems} />
      <main className="flex-1">
        <div className="container mx-auto py-12 md:py-24 px-4 sm:px-6">
          <div className="mx-auto max-w-xl space-y-8">
            <div className="space-y-4 text-center">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">Contact Us</h1>
              <p className="text-lg text-muted-foreground">
                Have questions or feedback about our directory of WhatsApp group links? We&apos;d love to hear from you.
              </p>
              <p className="text-sm text-muted-foreground">
                You can also reach us directly at <a href="mailto:contact@groupsor.co.uk" className="text-primary underline">contact@groupsor.co.uk</a>.
              </p>
            </div>
            <ContactForm />
          </div>
        </div>
      </main>
    </>
  );
}
