'use client';

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { AdSlot } from './ad-slot';
import type { AdSettings } from '@/lib/ad-types';

type PopupAdProps = {
  adSettings?: AdSettings | null;
};

export function PopupAdModal({ adSettings }: PopupAdProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!adSettings || !adSettings.globalEnabled) return;

    const popupSlot = adSettings.slots?.popup_modal;
    if (!popupSlot || !popupSlot.enabled) return;

    // Check session storage to see if user already dismissed popup this session
    const dismissed = sessionStorage.getItem('whatsuplink_popup_dismissed');
    if (dismissed) return;

    const delayMs = (popupSlot.popupDelaySeconds || 5) * 1000;
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [adSettings]);

  if (!isOpen || !adSettings) return null;

  const handleClose = () => {
    setIsOpen(false);
    sessionStorage.setItem('whatsuplink_popup_dismissed', 'true');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="relative w-full max-w-lg rounded-xl border border-emerald-500/30 bg-card p-6 shadow-2xl transition-all">
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 rounded-full bg-muted p-1.5 text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
          aria-label="Close Ad"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pt-2">
          <AdSlot placement="popup_modal" adSettings={adSettings} />
        </div>
      </div>
    </div>
  );
}

export function StickyBottomAdBar({ adSettings }: PopupAdProps) {
  const [isDismissed, setIsDismissed] = useState(false);

  if (!adSettings || !adSettings.globalEnabled || isDismissed) return null;

  const stickySlot = adSettings.slots?.sticky_bottom;
  if (!stickySlot || !stickySlot.enabled) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center bg-background/95 backdrop-blur border-t border-border p-2 shadow-lg transition-transform animate-in slide-in-from-bottom duration-300">
      <div className="relative flex w-full max-w-4xl items-center justify-center px-8">
        <AdSlot placement="sticky_bottom" adSettings={adSettings} className="my-0" />

        <button
          onClick={() => setIsDismissed(true)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-muted/80 p-1 text-muted-foreground transition-colors hover:bg-destructive hover:text-white"
          aria-label="Close Sticky Ad"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
