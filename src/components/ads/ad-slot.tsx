'use client';

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { AdSettings, AdSlotConfig } from '@/lib/ad-types';

type AdSlotProps = {
  placement: string;
  adSettings?: AdSettings | null;
  className?: string;
};

export function AdSlot({ placement, adSettings, className = '' }: AdSlotProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (!adSettings || !adSettings.globalEnabled) {
    return null;
  }

  const slot: AdSlotConfig | undefined = adSettings.slots?.[placement];

  if (!slot || !slot.enabled) {
    return null;
  }

  const { type, code, bannerUrl, bannerLink, bannerAlt, showLabel } = slot;

  // Handle script execution for 'code' ad type
  useEffect(() => {
    if (type !== 'code' || !code || !containerRef.current) return;

    const container = containerRef.current;
    container.innerHTML = ''; // Clear container

    // Create a temporary div to parse HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = code;

    // Append child nodes
    Array.from(tempDiv.childNodes).forEach((node) => {
      if (node.nodeName === 'SCRIPT') {
        const oldScript = node as HTMLScriptElement;
        const newScript = document.createElement('script');

        Array.from(oldScript.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });

        if (oldScript.innerHTML) {
          newScript.innerHTML = oldScript.innerHTML;
        }

        container.appendChild(newScript);
      } else {
        container.appendChild(node.cloneNode(true));
      }
    });
  }, [type, code]);

  if (type === 'banner') {
    if (!bannerUrl) return null;

    return (
      <div className={`my-4 flex flex-col items-center justify-center w-full ${className}`}>
        {showLabel && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-1 font-mono">
            Advertisement
          </span>
        )}
        <a
          href={bannerLink || '#'}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative block overflow-hidden rounded-lg border border-border/60 bg-muted/20 shadow-sm transition-all hover:shadow-md hover:border-emerald-500/50 max-w-full"
        >
          <img
            src={bannerUrl}
            alt={bannerAlt || 'Advertisement'}
            className="h-auto max-h-[180px] w-auto max-w-full object-contain mx-auto transition-transform duration-300 group-hover:scale-[1.01]"
            loading="lazy"
          />
        </a>
      </div>
    );
  }

  if (type === 'code') {
    if (!code || !code.trim()) return null;

    return (
      <div className={`my-4 flex flex-col items-center justify-center w-full ${className}`}>
        {showLabel && (
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/80 mb-1 font-mono">
            Advertisement
          </span>
        )}
        <div
          ref={containerRef}
          className="w-full flex flex-col items-center justify-center overflow-hidden min-h-[50px]"
        />
      </div>
    );
  }

  return null;
}
