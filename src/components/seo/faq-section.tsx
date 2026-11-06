import React from 'react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle } from 'lucide-react';

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  title?: string;
  description?: string;
  items: FaqItem[];
  className?: string;
}

export function FaqSection({
  title = 'Frequently Asked Questions',
  description = 'Everything you need to know about joining and sharing active WhatsApp group links.',
  items,
  className = '',
}: FaqSectionProps) {
  if (!items || items.length === 0) return null;

  // Schema.org FAQPage structured data
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <section className={`container py-12 md:py-16 ${className}`}>
      {/* Schema.org FAQPage Structured Data Injection for Google Rich Snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <div className="mx-auto max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <HelpCircle className="h-4 w-4" />
            <span>Got Questions? We Have Answers</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
            {title}
          </h2>
          {description && (
            <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
              {description}
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-4 md:p-8 shadow-sm">
          <Accordion type="single" collapsible defaultValue="faq-0" className="w-full">
            {items.map((item, index) => (
              <AccordionItem key={index} value={`faq-${index}`} className="border-b last:border-b-0 py-1">
                <AccordionTrigger className="text-left font-semibold text-base md:text-lg hover:text-primary transition-colors py-4">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm md:text-base text-muted-foreground leading-relaxed pt-1 pb-4">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}

export function getCategoryFaqs(categoryName: string): FaqItem[] {
  return [
    {
      question: `How do I join ${categoryName} WhatsApp group links?`,
      answer: `Joining is simple and free! Click on any active ${categoryName} group card on Groupsor, review the description and community guidelines, and press the "Join WhatsApp Group" button. On mobile devices, WhatsApp will open directly with an invite preview. On desktop or laptop, you can join instantly via WhatsApp Web or scan the on-screen QR code with your phone camera.`,
    },
    {
      question: `Are these ${categoryName} WhatsApp group links verified and working?`,
      answer: `Yes. Groupsor continuously monitors and audits submitted invite links. Each card features real-time community trust votes ("Yes, Works" vs "Broken / Full") and an "Active Today" verification badge so you only spend time joining genuine, active communities.`,
    },
    {
      question: `What should I do if a ${categoryName} WhatsApp group is full or revoked?`,
      answer: `WhatsApp groups have an official limit of 1024 members. If you encounter a group that has reached capacity or whose invite link has been revoked by the admin, click the "Report" button on the group page. Our automated moderation will flag and archive full links and prompt administrators to update their invite URL.`,
    },
    {
      question: `Can I share my own ${categoryName} WhatsApp group or channel on Groupsor?`,
      answer: `Absolutely! Click "Submit Group" in the top navigation bar, paste your official WhatsApp invite link (chat.whatsapp.com/...), choose "${categoryName}", and add relevant tags. Once approved by our automated filters, your group will be discovered by thousands of active members worldwide.`,
    },
    {
      question: `Is my phone number safe when joining WhatsApp groups?`,
      answer: `When joining any standard WhatsApp group, other participants in the same group may be able to view your WhatsApp profile name and phone number. If you prefer higher privacy, look for WhatsApp Channels or Communities on Groupsor, where individual member phone numbers remain hidden.`,
    },
  ];
}

export function getCountryFaqs(countryName: string, cityName?: string): FaqItem[] {
  const location = cityName ? `${cityName}, ${countryName}` : countryName;
  return [
    {
      question: `How can I find active WhatsApp groups in ${location}?`,
      answer: `Groupsor features the largest verified directory of WhatsApp groups and channels from ${location}. You can browse through our verified listings, filter by categories such as jobs, business, entertainment, or education, and sort by "Highest Trust" or "Recently Added".`,
    },
    {
      question: `Are ${location} WhatsApp group links on Groupsor free to join?`,
      answer: `Yes, 100% free. Groupsor never charges members to discover or join communities. All invite links are direct links to official WhatsApp groups, channels, and communities.`,
    },
    {
      question: `How do I join a ${location} WhatsApp group from a computer?`,
      answer: `Every group page on Groupsor provides both a WhatsApp Web direct link and a high-resolution QR code. Simply point your smartphone camera or WhatsApp scanner at the QR code on your monitor to instantly join the group without needing to type or copy invite links.`,
    },
    {
      question: `Can I submit my local WhatsApp group for ${location}?`,
      answer: `Yes! Local business owners, students, hobbyists, and event organizers in ${location} can submit their group for free by clicking the "Submit Group" button. Adding accurate location tags helps local members find and join your group rapidly.`,
    },
    {
      question: `What are the community rules for WhatsApp groups in ${location}?`,
      answer: `Each group administrator sets specific guidelines. Common rules include respecting fellow members, avoiding spam or unsolicited promotions, and not sharing offensive or copyrighted content. Always check the pinned message or group description upon joining.`,
    },
  ];
}

export function getHomeFaqs(): FaqItem[] {
  return [
    {
      question: 'What is Groupsor and how does it work?',
      answer: 'Groupsor is the leading global directory for active WhatsApp group links, channels, and communities. Users and community administrators share verified invite links across diverse categories including jobs, education, technology, gaming, entertainment, and local cities. Members can join instantly with one click or scan a QR code from desktop.',
    },
    {
      question: 'Are all WhatsApp group links on Groupsor free and active?',
      answer: 'Yes! Discovering and joining groups on Groupsor is completely free. We actively monitor link health with community trust votes ("Yes, Works" vs "Broken / Full") and automatically archive expired or full groups so you only join active groups.',
    },
    {
      question: 'How do I join a WhatsApp group from my computer or laptop?',
      answer: 'Every group page features a "Scan QR to Join" card. Simply open your phone camera or WhatsApp scanner to jump straight into the group. Alternatively, click "Join WhatsApp Group" to launch WhatsApp Web directly in your browser.',
    },
    {
      question: 'Can I submit my own WhatsApp group or channel?',
      answer: 'Yes, absolutely! Anyone can submit a WhatsApp group, channel, or community for free by clicking the "Submit Group" button. Adding descriptive tags and choosing the right category and country helps interested members find your community quickly.',
    },
    {
      question: 'What should I do if a group link is full or broken?',
      answer: 'WhatsApp groups currently hold a maximum of 1024 members. If a group is full or the invite has been revoked, click "Report" on the group page to let our moderation team know. This updates the status in real time and prompts the admin for a new link.',
    },
  ];
}

