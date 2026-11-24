'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Clock,
  ExternalLink,
  MapPin,
  RefreshCw,
  Search,
  Trophy,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useCricketFeed } from './cricket-provider';
import { TeamAvatar } from './team-avatar';
import {
  formatUpcomingCountdown,
  formatUpdatedAgo,
  getMatchTypeLabel,
  getSeriesLabel,
  parseGmtDate,
  parseMatchTeamsAndScores,
  type CricketMatch,
  type CricketOverview,
} from '@/lib/cricket-feed';

type CricketTab = 'live' | 'upcoming' | 'recent';

interface CricketScoreboardProps {
  initialOverview?: CricketOverview | null;
}

function MatchCard({
  match,
  tab,
  nowMs,
  isWatched,
  onToggleWatch,
}: {
  match: CricketMatch;
  tab: CricketTab;
  nowMs: number | null;
  isWatched: boolean;
  onToggleWatch: (match: CricketMatch) => void;
}) {
  const [team1, team2] = parseMatchTeamsAndScores(match);
  const matchTypeLabel = getMatchTypeLabel(match);
  const seriesLabel = getSeriesLabel(match);

  const localStartTime = useMemo(() => {
    if (!nowMs) return match.date || '';
    const d = parseGmtDate(match.dateTimeGMT, match.date);
    if (!d) return match.date || '';
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, [match.dateTimeGMT, match.date, nowMs]);

  const upcomingCountdown =
    tab === 'upcoming'
      ? formatUpcomingCountdown(match.dateTimeGMT, match.date, nowMs ?? undefined)
      : '';

  return (
    <Card className="overflow-hidden border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between">
      {/* Top Bar */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60 bg-muted/30">
        <div className="flex items-center gap-2 min-w-0">
          {tab === 'live' ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 px-2.5 py-0.5 text-[11px] font-bold text-red-600 dark:text-red-400 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
              LIVE
            </span>
          ) : tab === 'upcoming' ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
              <Clock className="h-3 w-3" />
              <span>{upcomingCountdown}</span>
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-[#25D366]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#128C7E] dark:text-[#25D366] shrink-0">
              Result
            </span>
          )}

          <span className="text-xs font-medium text-muted-foreground truncate" title={seriesLabel}>
            {seriesLabel}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {tab === 'live' && (
            <button
              type="button"
              onClick={() => onToggleWatch(match)}
              title={isWatched ? 'Disable live score alerts' : 'Notify me on score updates'}
              aria-label={isWatched ? 'Disable live score alerts' : 'Enable live score alerts'}
              className={`inline-flex items-center justify-center h-7 w-7 rounded-lg border transition-colors ${
                isWatched
                  ? 'bg-[#25D366] border-[#25D366] text-white shadow-xs'
                  : 'border-border/80 bg-background text-muted-foreground hover:text-foreground hover:border-primary/40'
              }`}
            >
              {isWatched ? <BellRing className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
            </button>
          )}
          <span className="inline-flex items-center rounded-md border border-border/80 bg-background px-2 py-0.5 text-[10px] font-bold tracking-wide text-foreground">
            {matchTypeLabel}
          </span>
        </div>
      </div>

      {/* Team Rows */}
      <CardContent className="p-4 space-y-3 flex-1">
        {[team1, team2].map((team, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <TeamAvatar name={team.name} shortname={team.shortname} img={team.img} size="md" />
              <div className="min-w-0 flex items-center gap-1.5">
                <span
                  className={`text-sm sm:text-base truncate ${
                    team.isBatting
                      ? 'font-bold text-foreground'
                      : 'font-semibold text-foreground/90'
                  }`}
                  title={team.name}
                >
                  {team.name}
                </span>
                {team.isBatting && (
                  <span
                    className="inline-flex items-center text-sm font-bold text-[#25D366] shrink-0"
                    title="Currently Batting"
                  >
                    *
                  </span>
                )}
              </div>
            </div>

            <span
              className={`text-sm sm:text-base tabular-nums whitespace-nowrap shrink-0 ${
                team.scoreText === 'Yet to bat' || team.scoreText === 'Upcoming'
                  ? 'text-xs font-medium text-muted-foreground'
                  : 'font-bold text-foreground'
              }`}
            >
              {team.scoreText}
            </span>
          </div>
        ))}
      </CardContent>

      {/* Match Status & Venue Footer */}
      <div className="px-4 py-3 border-t border-border/60 bg-muted/20 flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-xs font-semibold line-clamp-1 ${
              tab === 'live'
                ? 'text-red-600 dark:text-red-400'
                : 'text-[#128C7E] dark:text-[#25D366]'
            }`}
          >
            {tab === 'upcoming' && localStartTime
              ? `${localStartTime}${match.status ? ` · ${match.status}` : ''}`
              : match.status || 'Match update pending'}
          </p>

          {match.link && (
            <a
              href={match.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
            >
              <span>Scorecard</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {match.venue && (
          <div className="flex items-center gap-1 text-[11px] text-muted-foreground truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{match.venue}</span>
          </div>
        )}
      </div>
    </Card>
  );
}

export function CricketScoreboard({ initialOverview = null }: CricketScoreboardProps) {
  const { overview: liveOverview, isLoading, error, isMatchWatched, toggleWatchMatch } =
    useCricketFeed();

  const data = liveOverview || initialOverview;

  const [activeTab, setActiveTab] = useState<CricketTab>('live');
  const [majorOnly, setMajorOnly] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [nowMs, setNowMs] = useState<number | null>(null);

  // Sync client clock after mount to prevent hydration mismatches on countdown & updatedAgo
  useEffect(() => {
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Auto-switch to upcoming if no live matches exist on first load
  useEffect(() => {
    if (data && data.live.length === 0 && activeTab === 'live') {
      if (data.upcoming.length > 0) setActiveTab('upcoming');
      else if (data.recent.length > 0) setActiveTab('recent');
    }
  }, [data?.live.length]);

  const filterList = (list: CricketMatch[] | undefined): CricketMatch[] => {
    if (!list) return [];
    const q = searchQuery.trim().toLowerCase();
    return list.filter((m) => {
      if (majorOnly && !m.isMajor) return false;
      if (!q) return true;
      const inName = (m.name || '').toLowerCase().includes(q);
      const inSeries = (m.series || '').toLowerCase().includes(q);
      const inVenue = (m.venue || '').toLowerCase().includes(q);
      const inTeams = (m.teams || []).some((t) => t.toLowerCase().includes(q));
      return inName || inSeries || inVenue || inTeams;
    });
  };

  const liveFiltered = useMemo(() => filterList(data?.live), [data?.live, majorOnly, searchQuery]);
  const upcomingFiltered = useMemo(
    () => filterList(data?.upcoming),
    [data?.upcoming, majorOnly, searchQuery]
  );
  const recentFiltered = useMemo(
    () => filterList(data?.recent),
    [data?.recent, majorOnly, searchQuery]
  );

  const displayedMatches =
    activeTab === 'live'
      ? liveFiltered
      : activeTab === 'upcoming'
        ? upcomingFiltered
        : recentFiltered;

  const updatedLabel = useMemo(
    () => (data?.updatedAt ? formatUpdatedAgo(data.updatedAt, nowMs ?? undefined) : 'Syncing...'),
    [data?.updatedAt, nowMs]
  );

  return (
    <div className="flex flex-col w-full">
      {/* Page Hero */}
      <section className="bg-card/60 border-b border-primary/20">
        <div className="container mx-auto py-8 md:py-12">
          <div className="mx-auto max-w-5xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#128C7E] dark:text-[#25D366] mb-2">
                <Trophy className="h-4 w-4" />
                <span>Real-Time Cricket Scoreboard</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
                Live Cricket Scores &amp; Match Schedule
              </h1>
              <p className="mt-2 text-sm md:text-base text-muted-foreground max-w-2xl">
                Follow live international and franchise matches in real time. Tap the notification bell on any live match for instant score updates.
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center rounded-xl border border-primary/30 bg-background/90 px-3.5 py-2 shadow-xs">
              <RefreshCw className="h-3.5 w-3.5 text-[#25D366]" />
              <span className="text-xs font-medium text-foreground tabular-nums" suppressHydrationWarning>
                Updated: {updatedLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Controls & Match Grid */}
      <section className="container mx-auto py-8 md:py-10">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Controls Toolbar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* 3 Tabs with Live Counts */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/80 dark:bg-muted/40 rounded-xl border border-border/70 overflow-x-auto">
              {[
                { id: 'live' as const, label: 'Live', count: liveFiltered.length, isLive: true },
                { id: 'upcoming' as const, label: 'Upcoming', count: upcomingFiltered.length, isLive: false },
                { id: 'recent' as const, label: 'Recent', count: recentFiltered.length, isLive: false },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#25D366] text-white shadow-sm font-semibold'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/80'
                    }`}
                  >
                    {tab.isLive && tab.count > 0 && (
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isActive ? 'bg-white animate-pulse' : 'bg-red-500 animate-pulse'
                        }`}
                      />
                    )}
                    <span>{tab.label}</span>
                    <span
                      className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-background/80 text-muted-foreground'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Major Matches vs All Matches Toggle */}
            <div className="flex items-center gap-1.5 p-1 bg-muted/80 dark:bg-muted/40 rounded-xl border border-border/70 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setMajorOnly(true)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  majorOnly
                    ? 'bg-card text-foreground shadow-sm font-semibold border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Major Matches
              </button>
              <button
                type="button"
                onClick={() => setMajorOnly(false)}
                className={`px-3.5 py-1.5 text-xs sm:text-sm font-medium rounded-lg transition-all whitespace-nowrap ${
                  !majorOnly
                    ? 'bg-card text-foreground shadow-sm font-semibold border border-border/60'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                All Matches
              </button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by team, tournament series, or stadium venue..."
              className="pl-10 pr-10 py-5 rounded-xl bg-card border-border/80 focus-visible:ring-2 focus-visible:ring-[#25D366]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Matches Content */}
          {!data && isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-44 rounded-xl" />
              ))}
            </div>
          ) : error && !data ? (
            <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
              <p className="text-base font-semibold text-foreground">{error}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Please check back in a moment for live match updates.
              </p>
            </div>
          ) : displayedMatches.length === 0 ? (
            <div className="rounded-2xl border border-dashed bg-card/60 p-10 text-center space-y-3">
              <Trophy className="h-8 w-8 mx-auto text-muted-foreground/70" />
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  No {activeTab} {majorOnly ? 'major ' : ''}matches found
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery
                    ? 'Try clearing your search query or switching to All Matches.'
                    : majorOnly
                      ? 'Switch to All Matches to view domestic and associate fixtures.'
                      : 'Check the other tabs for upcoming or recent results.'}
                </p>
              </div>
              {majorOnly && (
                <Button variant="outline" size="sm" onClick={() => setMajorOnly(false)}>
                  View All Matches
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {displayedMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  tab={activeTab}
                  nowMs={nowMs}
                  isWatched={isMatchWatched(match.id)}
                  onToggleWatch={toggleWatchMatch}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
