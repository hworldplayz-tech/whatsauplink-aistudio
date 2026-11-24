'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minus,
  X,
} from 'lucide-react';
import { useCricketFeed } from './cricket-provider';
import { TeamAvatar } from './team-avatar';
import {
  getMatchTypeLabel,
  getSeriesLabel,
  parseMatchTeamsAndScores,
  type CricketMatch,
} from '@/lib/cricket-feed';

interface PinnedCricketWidgetProps {
  enabled?: boolean;
  majorOnly?: boolean;
  pinnedMatchId?: string;
}

export function PinnedCricketWidget({
  enabled = true,
  majorOnly = true,
  pinnedMatchId = '',
}: PinnedCricketWidgetProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { overview, isMatchWatched, toggleWatchMatch } = useCricketFeed();

  // React state ONLY (never saved to localStorage so reload restores it)
  const [isClosed, setIsClosed] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Draggable viewport position (null until user starts dragging or window resizes after drag)
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    movedDistance: number;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    movedDistance: 0,
  });

  // Hide on /cricket and /admin routes
  const isHiddenRoute =
    !pathname || pathname.startsWith('/cricket') || pathname.startsWith('/admin');

  const eligibleMatches = useMemo<CricketMatch[]>(() => {
    const live = overview?.live || [];
    if (live.length === 0) return [];

    let list = majorOnly ? live.filter((m) => m.isMajor) : [...live];

    // If admin specified a pinnedMatchId and it is currently live, ensure it is first
    if (pinnedMatchId && pinnedMatchId.trim()) {
      const targetId = pinnedMatchId.trim();
      const targetMatch = live.find((m) => m.id === targetId);
      if (targetMatch) {
        list = [targetMatch, ...list.filter((m) => m.id !== targetId)];
      }
    }

    return list;
  }, [overview?.live, majorOnly, pinnedMatchId]);

  // Keep activeIndex in bounds when live list updates
  useEffect(() => {
    if (activeIndex >= eligibleMatches.length && eligibleMatches.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, eligibleMatches.length]);

  // Clamp dragged position on window resize
  useEffect(() => {
    if (!position) return;
    const handleResize = () => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const maxX = Math.max(8, window.innerWidth - rect.width - 8);
      const maxY = Math.max(8, window.innerHeight - rect.height - 8);
      setPosition((prev) =>
        prev
          ? {
              x: Math.min(Math.max(8, prev.x), maxX),
              y: Math.min(Math.max(8, prev.y), maxY),
            }
          : null
      );
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [position]);

  // Pointer drag listeners
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      const ds = dragStateRef.current;
      if (!ds.active) return;

      const dx = e.clientX - ds.startX;
      const dy = e.clientY - ds.startY;
      ds.movedDistance = Math.max(ds.movedDistance, Math.hypot(dx, dy));

      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const maxX = Math.max(8, window.innerWidth - rect.width - 8);
      const maxY = Math.max(8, window.innerHeight - rect.height - 8);

      const nextX = Math.min(Math.max(8, ds.origX + dx), maxX);
      const nextY = Math.min(Math.max(8, ds.origY + dy), maxY);

      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      if (dragStateRef.current.active) {
        dragStateRef.current.active = false;
        dragStateRef.current.pointerId = null;
        setIsDragging(false);
      }
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
    };
  }, []);

  if (!enabled || isHiddenRoute || isClosed || eligibleMatches.length === 0) {
    return null;
  }

  const currentMatch = eligibleMatches[activeIndex] || eligibleMatches[0];
  if (!currentMatch) return null;

  const [team1, team2] = parseMatchTeamsAndScores(currentMatch);
  const isWatched = isMatchWatched(currentMatch.id);
  const matchTypeLabel = getMatchTypeLabel(currentMatch);
  const seriesLabel = getSeriesLabel(currentMatch);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Allow interactive buttons inside widget to click cleanly without initiating drag
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();

    dragStateRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      movedDistance: 0,
    };
    setIsDragging(true);
  };

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    // Prevent accidental navigation if dragged > 5px
    if (dragStateRef.current.movedDistance > 5) {
      dragStateRef.current.movedDistance = 0;
      return;
    }
    router.push('/cricket');
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + eligibleMatches.length) % eligibleMatches.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % eligibleMatches.length);
  };

  const handleToggleBell = (e: React.MouseEvent) => {
    e.stopPropagation();
    void toggleWatchMatch(currentMatch);
  };

  const positionStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : {};

  const defaultPlacementClass = position
    ? ''
    : 'bottom-20 right-3 md:bottom-5 md:right-5';

  // Compact score string for minimized pill
  const compactScore1 = team1.scoreText === 'Yet to bat' ? '' : ` ${team1.scoreText}`;
  const compactScore2 = team2.scoreText === 'Yet to bat' ? '' : ` ${team2.scoreText}`;

  if (isMinimized) {
    return (
      <div
        ref={cardRef}
        style={positionStyle}
        onPointerDown={handlePointerDown}
        onClick={handleCardClick}
        className={`fixed ${defaultPlacementClass} z-50 flex items-center gap-2 rounded-full border border-primary/30 bg-card/95 backdrop-blur-md px-3 py-1.5 shadow-xl cursor-pointer select-none touch-none max-w-[calc(100vw-24px)] ${
          isDragging ? 'ring-2 ring-primary/40 shadow-2xl' : 'hover:border-primary/60'
        }`}
      >
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400 shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
          LIVE
        </span>

        <div className="text-xs font-semibold text-foreground truncate tabular-nums">
          <span>{team1.shortname}</span>
          {compactScore1 && <span className="text-muted-foreground font-medium">{compactScore1}</span>}
          <span className="mx-1.5 text-muted-foreground">•</span>
          <span>{team2.shortname}</span>
          {compactScore2 && <span className="text-muted-foreground font-medium">{compactScore2}</span>}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleBell}
            title={isWatched ? 'Disable live notifications' : 'Notify me of live score updates'}
            aria-label={isWatched ? 'Disable live notifications' : 'Enable live notifications'}
            className={`p-1.5 rounded-full transition-colors ${
              isWatched
                ? 'bg-[#25D366]/15 text-[#25D366]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {isWatched ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(false);
            }}
            title="Expand scoreboard"
            aria-label="Expand scoreboard"
            className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsClosed(true);
            }}
            title="Close widget"
            aria-label="Close widget"
            className="p-1.5 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={cardRef}
      style={positionStyle}
      onPointerDown={handlePointerDown}
      onClick={handleCardClick}
      className={`fixed ${defaultPlacementClass} z-50 w-[305px] sm:w-[325px] rounded-2xl border border-border/90 bg-card/95 backdrop-blur-md shadow-2xl cursor-pointer select-none touch-none transition-shadow ${
        isDragging ? 'ring-2 ring-primary/50' : 'hover:border-primary/50'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-border/60 bg-muted/40 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-red-600 dark:text-red-400 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
            {matchTypeLabel}
          </span>
          <span className="text-[11px] text-muted-foreground truncate" title={seriesLabel}>
            • {seriesLabel}
          </span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <button
            type="button"
            onClick={handleToggleBell}
            title={isWatched ? 'Disable live score alerts' : 'Notify me of live score updates'}
            aria-label={isWatched ? 'Disable live score alerts' : 'Enable live score alerts'}
            className={`p-1.5 rounded-lg transition-colors ${
              isWatched
                ? 'bg-[#25D366]/15 text-[#25D366]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {isWatched ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMinimized(true);
            }}
            title="Minimize"
            aria-label="Minimize widget"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsClosed(true);
            }}
            title="Close"
            aria-label="Close widget"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Team Rows */}
      <div className="px-3.5 py-3 space-y-2.5">
        {[team1, team2].map((team, idx) => (
          <div key={idx} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <TeamAvatar name={team.name} shortname={team.shortname} img={team.img} size="sm" />
              <span
                className={`text-sm truncate ${
                  team.isBatting
                    ? 'font-bold text-foreground'
                    : 'font-medium text-foreground/90'
                }`}
              >
                {team.shortname}
              </span>
              {team.isBatting && (
                <span className="text-xs font-bold text-[#25D366]" title="Batting">
                  *
                </span>
              )}
            </div>
            <span
              className={`text-sm tabular-nums whitespace-nowrap ${
                team.scoreText === 'Yet to bat' || team.scoreText === 'Upcoming'
                  ? 'text-xs text-muted-foreground font-normal'
                  : 'font-bold text-foreground'
              }`}
            >
              {team.scoreText}
            </span>
          </div>
        ))}
      </div>

      {/* Status + Multi-Match Switcher Footer */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-border/60 bg-muted/20 rounded-b-2xl">
        <p className="text-[11px] font-medium text-[#128C7E] dark:text-[#25D366] truncate">
          {currentMatch.status || 'Match in progress'}
        </p>

        {eligibleMatches.length > 1 && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handlePrev}
              aria-label="Previous live match"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[11px] font-mono tabular-nums text-muted-foreground">
              {activeIndex + 1}/{eligibleMatches.length}
            </span>
            <button
              type="button"
              onClick={handleNext}
              aria-label="Next live match"
              className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
