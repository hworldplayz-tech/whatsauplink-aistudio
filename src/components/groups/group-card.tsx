
'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ExternalLink, 
  Tag, 
  Share2, 
  Users, 
  Clock, 
  RadioTower, 
  Eye, 
  Star, 
  CheckCircle2, 
  AlertTriangle,
  QrCode,
  MessageCircle
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { GroupLink } from '@/lib/data';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNow } from 'date-fns';
import { MessagesSquare } from 'lucide-react';
import { SharePopover } from './share-popover';
import { GroupQrDialog } from './group-qr-dialog';
import { getWhatsAppShareUrl } from '@/lib/whatsapp-intent';
import NProgress from 'nprogress';
import { StarRating } from './star-rating';

type GroupCardProps = {
  group: GroupLink;
  view: 'grid' | 'list';
  onTagClick: (tag: string) => void;
  showClicks: boolean;
  showRatings: boolean;
};

export function GroupCard({ group, view, onTagClick, showClicks, showRatings }: GroupCardProps) {
  const router = useRouter();
  const [isQrOpen, setIsQrOpen] = useState(false);
  const whatsappShareUrl = getWhatsAppShareUrl(group.title, group.id);
  
  // Use the last submitted date if available, otherwise use creation date
  const relevantDate = group.lastSubmittedAt || group.createdAt;
  const timeAgo = relevantDate
    ? formatDistanceToNow(new Date(relevantDate), { addSuffix: true }).replace('about ', '')
    : 'recently';

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
  
  const typeIcon = group.type === 'channel' 
    ? <RadioTower className="h-3 w-3" /> 
    : group.type === 'community'
    ? <Users className="h-3 w-3" />
    : <MessagesSquare className="h-3 w-3" />;

  const detailUrl = `/group/invite/${group.id}`;

  const handlePrefetch = () => {
    router.prefetch(detailUrl);
  };
  
  const handleCardClick = () => {
    sessionStorage.setItem('scrollPosition', window.scrollY.toString());
    NProgress.start();
  };

  const handleLocalTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    e.preventDefault();
    onTagClick(tag);
  }
  
  const averageRating = (group.ratingCount ?? 0) > 0 ? (group.totalRating ?? 0) / (group.ratingCount ?? 0) : 0;

  if (view === 'grid') {
    return (
      <Card 
        className="h-full flex flex-col items-center justify-center p-4 text-center relative transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-card group"
        onMouseEnter={handlePrefetch}
        onTouchStart={handlePrefetch}
      >
        <Link href={detailUrl} prefetch={true} className="block absolute inset-0 z-0" onClick={handleCardClick} />
        <Badge className="absolute top-2 left-2 text-xs capitalize bg-primary text-primary-foreground hover:bg-primary/80 z-10">{group.country}</Badge>
        <Badge className="absolute top-2 right-2 text-xs bg-accent text-accent-foreground hover:bg-accent/80 z-10">{group.category}</Badge>
        <Avatar className="h-24 w-24 text-primary border-2 border-primary/20">
            <AvatarImage src={group.imageUrl} alt={`Preview for ${group.title}`} />
            <AvatarFallback>
                <MessagesSquare className="h-10 w-10"/>
            </AvatarFallback>
        </Avatar>
        <h3 className="font-semibold text-sm line-clamp-2 mt-3">{group.title}</h3>
        
        {/* Link Quality & Trust Status Badges */}
        <div className="mt-1 flex items-center justify-center" suppressHydrationWarning>
          {isBroken ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 text-[10px] font-semibold">
              <AlertTriangle className="h-2.5 w-2.5" /> Link Issue
            </span>
          ) : isFull ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 text-[10px] font-semibold">
              <Users className="h-2.5 w-2.5" /> Group Full
            </span>
          ) : group.isVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
              <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Verified Link
            </span>
          ) : isRecentlyActive ? (
            <span suppressHydrationWarning className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Today
            </span>
          ) : null}
        </div>
        
        {showRatings && averageRating > 0 && (
            <div className="mt-2 flex items-center gap-1">
                <StarRating rating={averageRating} size={16} readOnly />
                <span className="text-xs text-muted-foreground ml-1">({group.ratingCount ?? 0})</span>
            </div>
        )}
        
        <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-2 flex-wrap">
            <span suppressHydrationWarning className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {timeAgo}
            </span>
            <Badge 
                variant={group.type === 'channel' ? 'default' : group.type === 'community' ? 'destructive' : 'secondary'} 
                className={`capitalize text-[11px] px-2 py-0.2 font-medium ${
                  group.type === 'channel' ? 'bg-sky-600 hover:bg-sky-700 text-white' :
                  group.type === 'community' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                  'bg-muted text-muted-foreground'
                }`}
            >
                {group.type === 'channel' ? '📢 Channel' : group.type === 'community' ? '👥 Community' : '💬 Group'}
            </Badge>
            {group.language && group.language !== 'en' && group.language !== 'all' && (
              <Badge variant="outline" className="text-[10px] uppercase font-bold px-1.5 py-0 border-muted-foreground/30">
                🌐 {group.language}
              </Badge>
            )}
        </div>

        {showClicks && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                <Eye className="h-3 w-3" />
                <span>{group.clicks ?? 0} views</span>
            </div>
        )}

        <div className="mt-3 flex items-center justify-between w-full pt-2 border-t border-border/40 gap-1 z-10 relative">
            <a
                href={whatsappShareUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Share to WhatsApp"
                className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg bg-[#25D366]/15 hover:bg-[#25D366] text-[#25D366] hover:text-white transition-all text-xs font-semibold gap-1"
            >
                <MessageCircle className="h-3.5 w-3.5 fill-current" />
                <span>Share</span>
            </a>

            <div className="flex items-center gap-1">
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsQrOpen(true);
                    }}
                    title="Scan QR Code to join on phone"
                    className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
                >
                    <QrCode className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>QR</span>
                </Button>
                <SharePopover title={group.title} url={detailUrl}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={(e) => e.stopPropagation()}>
                        <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="sr-only">Share</span>
                    </Button>
                </SharePopover>
            </div>
        </div>

        <GroupQrDialog group={group} isOpen={isQrOpen} onOpenChange={setIsQrOpen} />
      </Card>
    );
  }

  // List View
  return (
    <Card 
        className="transition-all duration-300 hover:shadow-xl overflow-hidden flex flex-col sm:flex-row"
        onMouseEnter={handlePrefetch}
        onTouchStart={handlePrefetch}
    >
      <div className="p-4 sm:p-6 flex items-center sm:border-r">
          <Avatar className="h-16 w-16 text-primary">
            <AvatarImage src={group.imageUrl} alt={`Preview for ${group.title}`} />
            <AvatarFallback>
              <MessagesSquare className="h-8 w-8"/>
            </AvatarFallback>
          </Avatar>
      </div>
      <div className="flex flex-1 flex-col justify-between">
        <CardHeader className="pt-0 sm:pt-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap" suppressHydrationWarning>
                <CardTitle className="text-lg font-semibold">{group.title}</CardTitle>
                {isBroken ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900 px-2 py-0.5 text-[10px] font-semibold">
                    <AlertTriangle className="h-2.5 w-2.5" /> Link Issue
                  </span>
                ) : isFull ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900 px-2 py-0.5 text-[10px] font-semibold">
                    <Users className="h-2.5 w-2.5" /> Group Full
                  </span>
                ) : group.isVerified ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                    <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" /> Verified Link
                  </span>
                ) : isRecentlyActive ? (
                  <span suppressHydrationWarning className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active Today
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                {showRatings && averageRating > 0 && (
                    <div className="flex items-center gap-1">
                        <StarRating rating={averageRating} size={16} readOnly />
                        <span className="text-xs text-muted-foreground">({group.ratingCount ?? 0})</span>
                    </div>
                )}
                <Badge variant="secondary" className="whitespace-nowrap">{group.category}</Badge>
            </div>
          </div>
          <CardDescription className="pt-2 line-clamp-3">{group.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {group.tags && group.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
                <Tag className="h-4 w-4 text-muted-foreground" />
                {group.tags.map(tag => (
                    <Link key={tag} href={`/tag/${encodeURIComponent(tag)}`} onClick={(e) => handleLocalTagClick(e, tag)} className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-full z-10">
                        <Badge variant="default" className="cursor-pointer bg-primary hover:bg-primary/80">{tag}</Badge>
                    </Link>
                ))}
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span suppressHydrationWarning className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Submitted {timeAgo}
            </span>
            <Badge 
                variant={group.type === 'channel' ? 'default' : group.type === 'community' ? 'destructive' : 'secondary'} 
                className={`capitalize text-xs px-2 py-0.5 font-medium ${
                  group.type === 'channel' ? 'bg-sky-600 hover:bg-sky-700 text-white' :
                  group.type === 'community' ? 'bg-purple-600 hover:bg-purple-700 text-white' :
                  'bg-muted text-muted-foreground'
                }`}
            >
                {group.type === 'channel' ? '📢 Channel' : group.type === 'community' ? '👥 Community' : '💬 Group'}
            </Badge>
            {group.language && group.language !== 'en' && group.language !== 'all' && (
              <Badge variant="outline" className="text-[10px] uppercase font-bold px-1.5 py-0 border-muted-foreground/30">
                🌐 {group.language}
              </Badge>
            )}
            {showClicks && (
                <span className="flex items-center gap-1.5">
                    <Eye className="h-3 w-3" />
                    {group.clicks ?? 0}
                </span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap">
            <Button
                asChild
                size="sm"
                className="h-10 px-3.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-medium gap-1.5 z-10"
            >
                <a
                    href={whatsappShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                >
                    <MessageCircle className="h-4 w-4 fill-white" />
                    <span>Share to WhatsApp</span>
                </a>
            </Button>

            <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsQrOpen(true);
                }}
                className="h-10 px-3 gap-1.5 z-10 text-xs font-medium"
                title="Scan QR to join on mobile"
            >
                <QrCode className="h-4 w-4 text-[#25D366]" />
                <span>Scan QR</span>
            </Button>

            <SharePopover title={group.title} url={detailUrl}>
                <Button variant="outline" size="icon" className="h-10 w-10 z-10" onClick={(e) => e.stopPropagation()}>
                    <Share2 className="h-4 w-4" />
                    <span className="sr-only">Share</span>
                </Button>
            </SharePopover>
            <Button asChild className="w-full sm:w-auto z-10" variant="secondary" onClick={handleCardClick}>
                <Link href={detailUrl} prefetch={true}>
                View Details
                <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </div>
        </CardFooter>
      </div>

      <GroupQrDialog group={group} isOpen={isQrOpen} onOpenChange={setIsQrOpen} />
    </Card>
  );
}
