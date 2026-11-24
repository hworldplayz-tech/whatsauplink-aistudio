'use client';

import React, { useState } from 'react';
import { getTeamBadgeColor } from '@/lib/cricket-feed';

interface TeamAvatarProps {
  name: string;
  shortname: string;
  img?: string;
  size?: 'sm' | 'md';
}

export function TeamAvatar({ name, shortname, img, size = 'md' }: TeamAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const dims = size === 'sm' ? 'h-6 w-6 text-[9px]' : 'h-8 w-8 text-[10px]';
  const badgeColor = getTeamBadgeColor(name || shortname);

  if (img && !imgError) {
    return (
      <div
        className={`${dims} rounded-full overflow-hidden border border-border/70 bg-muted flex items-center justify-center shrink-0`}
      >
        <img
          src={img}
          alt={name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dims} ${badgeColor} rounded-full font-bold tracking-tight flex items-center justify-center shrink-0 shadow-xs select-none`}
      title={name}
    >
      {shortname.slice(0, 3)}
    </div>
  );
}
