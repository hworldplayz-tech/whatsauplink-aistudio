'use client';

import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  QrCode, 
  Copy, 
  Check, 
  Download, 
  Smartphone, 
  ExternalLink, 
  Share2,
  Sparkles,
  MessagesSquare
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { GroupLink } from '@/lib/data';
import { openSmartWhatsAppJoin, getWhatsAppShareUrl } from '@/lib/whatsapp-intent';
import { useToast } from '@/hooks/use-toast';

type GroupQrDialogProps = {
  group: GroupLink;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinClick?: () => void;
};

export function GroupQrDialog({
  group,
  isOpen,
  onOpenChange,
  onJoinClick,
}: GroupQrDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(group.link);
      setCopied(true);
      toast({
        title: 'Link Copied!',
        description: 'WhatsApp invite link copied to your clipboard.',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Could not copy',
        description: 'Please copy the link manually.',
        variant: 'destructive',
      });
    }
  };

  const handleDownloadQr = () => {
    try {
      if (!qrRef.current) return;
      const svgElement = qrRef.current.querySelector('svg');
      if (!svgElement) return;

      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      canvas.width = 512;
      canvas.height = 512;

      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL('image/png');
          const downloadLink = document.createElement('a');
          downloadLink.href = pngUrl;
          downloadLink.download = `groupsor-${group.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}-qr.png`;
          downloadLink.click();
          toast({
            title: 'QR Code Downloaded',
            description: 'Saved as high-resolution PNG image.',
          });
        }
      };

      img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
    } catch (err) {
      console.error('Failed to download QR code:', err);
      toast({
        title: 'Download failed',
        description: 'Could not generate image file.',
        variant: 'destructive',
      });
    }
  };

  const handleSmartJoin = () => {
    openSmartWhatsAppJoin(group.link, onJoinClick);
  };

  const shareUrl = getWhatsAppShareUrl(group.title, group.id);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-6 overflow-hidden">
        <DialogHeader className="text-center sm:text-center pb-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-[#25D366] mb-2">
            <QrCode className="h-6 w-6" />
          </div>
          <DialogTitle className="text-xl font-bold text-center">
            Scan QR Code to Join
          </DialogTitle>
          <DialogDescription className="text-center text-xs text-muted-foreground">
            Point your mobile phone camera or WhatsApp camera to join instantly
          </DialogDescription>
        </DialogHeader>

        {/* Group Info Summary */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
          <Avatar className="h-10 w-10 flex-shrink-0 border">
            <AvatarImage src={group.imageUrl} alt={group.title} />
            <AvatarFallback>
              <MessagesSquare className="h-5 w-5" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold truncate text-foreground">{group.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                {group.category}
              </Badge>
              <span className="text-[11px] text-muted-foreground uppercase">{group.country}</span>
            </div>
          </div>
        </div>

        {/* Crisp High-Res QR Code Display */}
        <div className="my-2 flex flex-col items-center justify-center">
          <div 
            ref={qrRef}
            className="p-4 bg-white rounded-2xl shadow-md border-2 border-[#25D366]/30 inline-block transition-transform hover:scale-[1.02]"
          >
            <QRCodeSVG
              value={group.link}
              size={210}
              level="H"
              includeMargin={false}
              fgColor="#075E54"
              bgColor="#ffffff"
            />
          </div>

          <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground font-medium">
            <Smartphone className="h-4 w-4 text-[#25D366]" />
            <span>Works with iOS Camera, Android &amp; WhatsApp scanner</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs h-9"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadQr}
              className="gap-1.5 text-xs h-9"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Save QR Image</span>
            </Button>
          </div>

          {/* 1-Click WhatsApp Direct Actions */}
          <div className="grid grid-cols-2 gap-2 mt-1">
            <Button
              type="button"
              onClick={handleSmartJoin}
              className="bg-[#25D366] hover:bg-[#20ba59] text-white text-xs h-10 gap-1.5 font-medium"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Join Now</span>
            </Button>

            <Button
              asChild
              variant="secondary"
              className="text-xs h-10 gap-1.5 font-medium border"
            >
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Share2 className="h-3.5 w-3.5 text-[#25D366]" />
                <span>Share to WhatsApp</span>
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
