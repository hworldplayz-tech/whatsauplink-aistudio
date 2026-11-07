
'use client';

import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  MegaphoneOff,
  Eye,
  Info,
  Users,
  Share2,
  RadioTower,
  Flag,
  Tag,
  Repeat,
  Star,
  Loader2,
  Home,
  ThumbsUp,
  ThumbsDown,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  MessageCircle,
  Smartphone,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { GroupQrDialog } from './group-qr-dialog';
import { getWhatsAppShareUrl, openSmartWhatsAppJoin, isMobileDevice } from '@/lib/whatsapp-intent';
import type { GroupLink, Category, Country, ModerationSettings } from '@/lib/data';
import type { AdSettings } from '@/lib/ad-types';
import { AdSlot } from '@/components/ads/ad-slot';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GroupCard } from '@/components/groups/group-card';
import { Separator } from '@/components/ui/separator';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { SharePopover } from './share-popover';
import { useEffect, useState, useTransition, useMemo } from 'react';
import { useFirestore } from '@/firebase/provider';
import { doc, increment, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { GroupReportDialog } from './group-report-dialog';
import { StarRating } from './star-rating';
import { submitRating, voteLinkWorking } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { getModerationSettings } from '@/lib/admin-settings';
import { Breadcrumbs, type BreadcrumbItem } from '../layout/breadcrumbs';

type GroupDetailViewProps = {
  group: GroupLink;
  relatedGroups: GroupLink[];
  categories: Category[];
  countries: Country[];
  adSettings?: AdSettings;
  initialSettings?: ModerationSettings | null;
};

export function GroupDetailView({ 
  group: initialGroup, 
  relatedGroups, 
  categories, 
  countries, 
  adSettings,
  initialSettings,
}: GroupDetailViewProps) {
  const [group, setGroup] = useState(initialGroup);
  const [detailUrl, setDetailUrl] = useState('');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [initialReportReason, setInitialReportReason] = useState<string>('');
  const [settings, setSettings] = useState<ModerationSettings | null>(initialSettings || null);
  const { firestore } = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isRating, startRatingTransition] = useTransition();

  const [selectedRating, setSelectedRating] = useState<number>(0);
  const [hasRated, setHasRated] = useState(false);

  // Link quality & trust states
  const [workingVotes, setWorkingVotes] = useState<number>(initialGroup.workingVotes || 0);
  const [brokenVotes, setBrokenVotes] = useState<number>(initialGroup.brokenVotes || 0);
  const [hasVoted, setHasVoted] = useState<boolean>(false);

  const relevantDate = group.lastSubmittedAt || group.createdAt;
  const isRecentlyActive = useMemo(() => {
    if (!relevantDate) return false;
    try {
      const diffMs = Date.now() - new Date(relevantDate).getTime();
      return diffMs < 48 * 60 * 60 * 1000 && diffMs > -60000;
    } catch {
      return false;
    }
  }, [relevantDate]);

  const isBroken = group.status === 'revoked' || (group.reportCount ?? 0) >= 2;
  const isFull = group.status === 'full';

  // Mobile vs desktop intent & QR Code modal state
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Ensure this runs only on the client
    setDetailUrl(window.location.href);
    setIsMobile(isMobileDevice());
    
    // Check if user already voted on this link in current session
    if (typeof window !== 'undefined' && group.id) {
      const voted = sessionStorage.getItem(`voted_group_${group.id}`);
      if (voted) setHasVoted(true);
    }
    
    // Fetch moderation settings on client only if not passed from server
    if (!initialSettings) {
      getModerationSettings().then(fetched => {
        if (fetched) setSettings(fetched);
      }).catch(err => console.warn('Could not fetch settings:', err));
    }
  }, [group.id, initialSettings]);
  
  useEffect(() => {
    setGroup(initialGroup);
    setWorkingVotes(initialGroup.workingVotes || 0);
    setBrokenVotes(initialGroup.brokenVotes || 0);
  }, [initialGroup]);

  const handleVote = async (isWorking: boolean) => {
    if (hasVoted) return;

    if (!isWorking) {
      // Prompt report dialog directly with 'Invite Link Revoked / Expired'
      setInitialReportReason('Invite Link Revoked / Expired');
      setIsReportOpen(true);
    }

    try {
      setHasVoted(true);
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`voted_group_${group.id}`, 'true');
      }

      if (isWorking) {
        setWorkingVotes(prev => prev + 1);
      } else {
        setBrokenVotes(prev => prev + 1);
      }

      const res = await voteLinkWorking(group.id, isWorking);
      toast({
        title: isWorking ? 'Thank You!' : 'Feedback Recorded',
        description: res.message,
      });
    } catch (err) {
      console.error('Failed to submit link vote:', err);
    }
  };

  const handleJoinClick = () => {
    if (firestore && group.id) {
      const groupRef = doc(firestore, 'groups', group.id);
      updateDoc(groupRef, {
        clicks: increment(1),
      }).catch(err => console.error("Failed to increment click count", err));
    }
  };

  const handleSmartJoin = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    openSmartWhatsAppJoin(group.link, handleJoinClick);
  };
  
  const handleTagClick = (tag: string) => {
    router.push(`/tag/${encodeURIComponent(tag)}`);
  };

  const handleRatingSubmit = () => {
    if (selectedRating === 0) return;

    startRatingTransition(async () => {
      const formData = new FormData();
      formData.append('groupId', group.id);
      formData.append('rating', String(selectedRating));
      
      const result = await submitRating(formData);

      toast({
        title: result.success ? 'Rating Submitted!' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      
      if (result.success && result.newAverage !== undefined) {
        setGroup(prev => ({
            ...prev,
            totalRating: (prev.totalRating ?? 0) + selectedRating,
            ratingCount: (prev.ratingCount ?? 0) + 1,
        }));
        setHasRated(true); // Mark as rated to hide submission UI
        setSelectedRating(0);
      } else if (result.message.includes('already rated')) {
        setHasRated(true); // Also hide if user has already rated from another session
      }
    });
  };

  const rules = [
    {
      icon: ShieldCheck,
      title: 'Be Respectful',
      description:
        'Treat all members with respect. Harassment, hate speech, and bullying are not tolerated.',
    },
    {
      icon: MegaphoneOff,
      title: 'No Spam',
      description:
        'Avoid posting unsolicited advertisements or spamming the group with irrelevant messages.',
    },
    {
      icon: Eye,
      title: 'Mind Your Privacy',
      description:
        'Your phone number will be visible to all members. Do not share sensitive personal information.',
    },
    {
      icon: Users,
      title: 'Follow Admin Rules',
      description:
        'The group admin may have additional specific rules. Please read and adhere to them upon joining.',
    },
  ];
  
  const typeIcon = group.type === 'channel' ? <RadioTower className="h-4 w-4" /> : <Users className="h-4 w-4" />;

  const categoryLabel = categories.find(c => c.value === group.category)?.label || group.category;
  const countryLabel = countries.find(c => c.value === group.country)?.label || group.country;

  const averageRating = (group.ratingCount ?? 0) > 0 ? (group.totalRating ?? 0) / (group.ratingCount ?? 0) : 0;
  
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Home', href: '/' },
    { label: categoryLabel, href: `/category/${group.category}` },
    { label: group.title },
  ];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: `Join ${group.title} - WhatsApp Group Link`,
    description: group.description,
    url: detailUrl,
    image: group.imageUrl,
    mainEntity: {
      '@type': 'SocialMediaPosting',
      headline: `WhatsApp Group Link for ${group.title}`,
      text: group.description,
      sharedContent: {
        '@type': 'WebPage',
        headline: `Join ${group.title} on WhatsApp`,
        url: group.link,
      },
      author: {
        '@type': 'Organization',
        name: 'Groupsor',
      },
      // Use lastSubmittedAt for more accurate date, fallback to createdAt
      datePublished: group.lastSubmittedAt || group.createdAt,
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: averageRating.toFixed(1),
        ratingCount: group.ratingCount ?? 0,
      },
    },
  };

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Breadcrumbs items={breadcrumbItems} />
      <main className="flex-1">
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <div className="container mx-auto py-8 md:py-12">
          {/* Top Banner Ad for Group Detail */}
          <AdSlot placement="group_detail_top" adSettings={adSettings} className="mb-6" />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
            <div className="lg:col-span-2">
              <Card className="overflow-hidden">
                <CardHeader className="p-0">
                  <div className="relative w-full h-48 sm:h-64">
                    <Image
                      src={group.imageUrl}
                      alt={`Banner for ${group.title} WhatsApp group`}
                      fill
                      className="object-cover"
                      data-ai-hint={group.imageHint}
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6">
                      <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                        {group.title} WhatsApp Group
                      </h1>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-4 mb-4">
                    <Badge variant="secondary">{categoryLabel}</Badge>
                    <Badge variant="outline" className="capitalize">
                      {countryLabel}
                    </Badge>
                     <Badge 
                        variant={group.type === 'channel' ? 'default' : 'secondary'} 
                        className="capitalize text-sm px-3 py-1"
                    >
                        <div className='flex items-center gap-2'>
                            {typeIcon}
                            <span>{group.type}</span>
                        </div>
                    </Badge>
                     {(group.submissionCount ?? 1) > 1 && (
                        <Badge variant="destructive" className="text-sm px-3 py-1">
                            <div className='flex items-center gap-2'>
                                <Repeat className="h-4 w-4" />
                                <span>Re-submitted</span>
                            </div>
                        </Badge>
                     )}
                    {settings?.showClicks && (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Eye className="h-4 w-4" />
                            <span>{group.clicks ?? 0} views</span>
                        </div>
                    )}
                  </div>

                  {settings?.showRatings && (
                     <div className="flex flex-col items-center gap-4 my-4 rounded-lg border p-4 bg-muted/50">
                        <div className='flex flex-col sm:flex-row items-center justify-between w-full'>
                            <div className='flex-shrink-0 text-center sm:text-left'>
                                <h4 className="font-semibold">Rate this group</h4>
                                <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
                                    <Star className="h-5 w-5 text-yellow-400" />
                                    <span className="text-lg font-bold">{averageRating.toFixed(1)}</span>
                                    <span className="text-sm text-muted-foreground">({group.ratingCount ?? 0} ratings)</span>
                                </div>
                            </div>
                             <div className="flex-1 w-full flex items-center justify-center mt-4 sm:mt-0">
                               <StarRating 
                                    rating={selectedRating} 
                                    onRatingChange={setSelectedRating}
                                    size={32}
                                    disabled={isRating || hasRated}
                                />
                            </div>
                        </div>
                        {selectedRating > 0 && !hasRated && (
                            <div className="mt-2 w-full flex justify-center">
                                <Button onClick={handleRatingSubmit} disabled={isRating} size="sm">
                                    {isRating ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                                    ) : (
                                        `Submit ${selectedRating} Star Rating`
                                    )}
                                </Button>
                            </div>
                        )}
                        {hasRated && <p className='text-sm text-muted-foreground mt-2'>Thank you for your rating!</p>}
                    </div>
                  )}




                  <p className="text-base text-foreground/80 whitespace-pre-wrap mt-6">
                    {group.description}
                  </p>
                  
                  {group.tags && group.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 items-center mt-6">
                        <Tag className="h-4 w-4 text-muted-foreground" />
                        {group.tags.map(tag => (
                            <Link key={tag} href={`/tag/${encodeURIComponent(tag)}`} onClick={() => handleTagClick(tag)} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full">
                                <Badge variant="default" className="cursor-pointer bg-primary/90 hover:bg-primary/80">{tag}</Badge>
                            </Link>
                        ))}
                    </div>
                  )}

                  {/* In-Card Ad before Join Button */}
                  <AdSlot placement="group_detail_bottom" adSettings={adSettings} className="mt-6" />
                </CardContent>
                <CardFooter className="flex-col gap-4 items-stretch">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                    <Button 
                      type="button"
                      onClick={handleSmartJoin} 
                      className="w-full text-lg py-6 flex-1 sm:w-auto bg-[#25D366] hover:bg-[#20ba59] text-white font-bold shadow-md gap-2"
                    >
                      <MessageCircle className="h-5 w-5 fill-white" />
                      <span>{isMobile ? 'Open in WhatsApp App' : `Join WhatsApp ${group.type === 'channel' ? 'Channel' : 'Group'}`}</span>
                      <ExternalLink className="h-4 w-4" />
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="w-full text-base py-6 sm:w-auto gap-2 border-emerald-500/30 hover:border-[#25D366] hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      onClick={() => setIsQrOpen(true)}
                    >
                      <QrCode className="h-5 w-5 text-[#25D366]" />
                      <span>Scan QR to Join</span>
                    </Button>

                    <Button
                      asChild
                      className="w-full text-base py-6 sm:w-auto bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white border border-[#25D366]/30 gap-2 font-medium"
                    >
                      <a
                        href={getWhatsAppShareUrl(group.title, group.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="h-5 w-5 fill-current" />
                        <span>Share to WhatsApp</span>
                      </a>
                    </Button>

                    <div className="flex gap-2 w-full sm:w-auto">
                      {detailUrl && (
                          <SharePopover title={group.title} url={detailUrl}>
                          <Button variant="outline" className="w-full text-base py-6 sm:w-auto">
                              <Share2 className="mr-2 h-5 w-5" />
                              Share
                          </Button>
                          </SharePopover>
                      )}
                       <Button 
                        variant="destructive" 
                        className="w-full text-base py-6 sm:w-auto" 
                        onClick={() => {
                          setInitialReportReason('');
                          setIsReportOpen(true);
                        }}
                      >
                          <Flag className="mr-2 h-5 w-5" />
                          Report
                      </Button>
                    </div>
                  </div>

                  {/* Community Trust & Link Working Feedback */}
                  <div className="rounded-lg bg-muted/60 p-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Did this WhatsApp invite link work for you?</span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(true)}
                        disabled={hasVoted}
                        className="h-8 gap-1.5 text-xs hover:text-emerald-600 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Yes, Works ({workingVotes})</span>
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(false)}
                        disabled={hasVoted}
                        className="h-8 gap-1.5 text-xs hover:text-destructive hover:border-destructive hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <ThumbsDown className="h-3.5 w-3.5 text-red-500" />
                        <span>Broken / Full ({brokenVotes})</span>
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </Card>

              <div className="mt-12">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <Info className="h-5 w-5" />
                      Before You Join This Group...
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div>
                      <h3 className="font-semibold mb-2">How to Join a WhatsApp Group Link</h3>
                      <p className="text-sm text-muted-foreground">
                        Clicking the &quot;Join Group Link&quot; button will redirect
                        you to WhatsApp to confirm joining the group. Make sure
                        you have WhatsApp installed on your device.
                      </p>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-3">Group Etiquette</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {rules.map(rule => (
                          <div key={rule.title} className="flex items-start gap-3">
                            <rule.icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                            <div>
                              <h4 className="font-medium text-sm">
                                {rule.title}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {rule.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                     <Alert variant="destructive">
                      <ShieldCheck className="h-4 w-4" />
                      <AlertTitle>Privacy & Safety</AlertTitle>
                      <AlertDescription>
                        By joining this WhatsApp group, you agree to the group&apos;s rules and WhatsApp&apos;s terms of service. Admins may remove any member for violating guidelines. Your public profile and phone number will be visible to all members of the group.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>
              </div>
            </div>

            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Desktop Instant Scan QR to Join Card */}
              <Card className="hidden lg:block overflow-hidden border-2 border-emerald-500/20 bg-card">
                <CardHeader className="bg-emerald-50/60 dark:bg-emerald-950/40 pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <QrCode className="h-5 w-5 text-[#25D366]" />
                    <span>Scan with Phone to Join</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-5 flex flex-col items-center text-center">
                  <div 
                    onClick={() => setIsQrOpen(true)}
                    className="p-3 bg-white rounded-2xl shadow-sm border border-emerald-500/30 cursor-pointer hover:scale-105 transition-transform"
                    title="Click to expand or download QR Code"
                  >
                    <QRCodeSVG
                      value={group.link}
                      size={165}
                      level="H"
                      fgColor="#075E54"
                      bgColor="#ffffff"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-medium">
                    <Smartphone className="h-4 w-4 text-[#25D366]" />
                    <span>Point your phone camera to join instantly</span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsQrOpen(true)}
                    className="mt-2 text-xs text-[#25D366] hover:text-[#20ba59] gap-1"
                  >
                    <span>Enlarge &amp; Save QR</span>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>

              {/* Sidebar Ad Slot */}
              <AdSlot placement="sidebar" adSettings={adSettings} className="mt-2" />
            </div>
          </div>

          {/* "Related Groups" Carousel on Detail Pages */}
          {relatedGroups.length > 0 && (
            <div className="mt-14 pt-8 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#25D366] uppercase tracking-wider mb-1">
                    <Users className="h-3.5 w-3.5" />
                    <span>Recommended Communities</span>
                  </div>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground">
                    Related WhatsApp Groups &amp; Channels
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Explore 4–6 active communities related to {categoryLabel} to connect and chat
                  </p>
                </div>
              </div>

              <div className="relative px-2 sm:px-6">
                <Carousel
                  opts={{
                    align: 'start',
                    loop: true,
                  }}
                  className="w-full"
                >
                  <CarouselContent className="-ml-3 sm:-ml-4">
                    {relatedGroups.map((relatedGroup) => (
                      <CarouselItem
                        key={relatedGroup.id}
                        className="pl-3 sm:pl-4 basis-full sm:basis-1/2 md:basis-1/3 lg:basis-1/4"
                      >
                        <div className="h-full">
                          <GroupCard
                            group={relatedGroup}
                            view="grid"
                            onTagClick={handleTagClick}
                            showClicks={settings?.showClicks ?? true}
                            showRatings={settings?.showRatings ?? true}
                          />
                        </div>
                      </CarouselItem>
                    ))}
                  </CarouselContent>
                  <CarouselPrevious className="hidden sm:flex -left-4 bg-card/95 hover:bg-card shadow border" />
                  <CarouselNext className="hidden sm:flex -right-4 bg-card/95 hover:bg-card shadow border" />
                </Carousel>
              </div>
            </div>
          )}

          <Separator className="my-12" />
        </div>
      </main>
      <GroupReportDialog
        group={group}
        isOpen={isReportOpen}
        onOpenChange={setIsReportOpen}
        initialReason={initialReportReason}
      />
      <GroupQrDialog
        group={group}
        isOpen={isQrOpen}
        onOpenChange={setIsQrOpen}
        onJoinClick={handleJoinClick}
      />
    </div>
  );
}
