'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import {
  getCricketFirestore,
  fetchCricketOverviewFromRest,
  normalizeCricketOverview,
  parseMatchTeamsAndScores,
  type CricketMatch,
  type CricketOverview,
} from '@/lib/cricket-feed';
import { useToast } from '@/hooks/use-toast';

const CACHE_KEY = 'groupsor_cricket_overview_v1';
const WATCHED_KEY = 'groupsor_cricket_watched_v1';

interface CricketContextValue {
  overview: CricketOverview | null;
  isLoading: boolean;
  error: string | null;
  watchedMatchIds: string[];
  isMatchWatched: (matchId: string) => boolean;
  toggleWatchMatch: (match: CricketMatch) => Promise<void>;
}

const CricketContext = createContext<CricketContextValue>({
  overview: null,
  isLoading: true,
  error: null,
  watchedMatchIds: [],
  isMatchWatched: () => false,
  toggleWatchMatch: async () => {},
});

export function useCricketFeed() {
  return useContext(CricketContext);
}

function buildMatchNotificationPayload(match: CricketMatch) {
  const [team1, team2] = parseMatchTeamsAndScores(match);
  const title = `${team1.shortname} vs ${team2.shortname}${match.matchEnded ? ' (Final)' : ' • LIVE'}`;
  const line1 = `${team1.shortname}: ${team1.scoreText}${team1.isBatting ? ' *' : ''}`;
  const line2 = `${team2.shortname}: ${team2.scoreText}${team2.isBatting ? ' *' : ''}`;
  const body = `${line1}  |  ${line2}\n${match.status || ''}`.trim();
  const signature = `${line1}|${line2}|${match.status}|${match.matchEnded}`;
  return { title, body, signature };
}

async function sendCricketNotification(
  match: CricketMatch,
  options: { silent: boolean }
): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const { title, body } = buildMatchNotificationPayload(match);
  const tag = `cricket-live-${match.id}`;

  const notifOptions: NotificationOptions & { renotify?: boolean } = {
    body,
    tag,
    icon: '/icon.png',
    badge: '/icon.png',
    silent: options.silent,
    renotify: !options.silent,
    data: { url: '/cricket', matchId: match.id },
  };

  try {
    if ('serviceWorker' in navigator) {
      const existingReg = await navigator.serviceWorker.getRegistration('/cricket-sw.js');
      const reg = existingReg || (await navigator.serviceWorker.register('/cricket-sw.js'));
      if (reg && typeof reg.showNotification === 'function') {
        await navigator.serviceWorker.ready.catch(() => reg);
        await reg.showNotification(title, notifOptions);
        return true;
      }
    }
  } catch (swErr) {
    console.warn('ServiceWorker notification fallback to Notification API:', swErr);
  }

  try {
    const n = new Notification(title, notifOptions);
    n.onclick = () => {
      window.focus();
      window.location.href = '/cricket';
    };
    return true;
  } catch (err) {
    console.warn('Notification error:', err);
    return false;
  }
}

export function CricketProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [overview, setOverview] = useState<CricketOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [watchedMatchIds, setWatchedMatchIds] = useState<string[]>([]);

  // Track last notified signature per matchId to detect score/status deltas cleanly
  const lastSignatureMapRef = useRef<Record<string, string>>({});
  const lastEndedMapRef = useRef<Record<string, boolean>>({});
  const watchedRef = useRef<string[]>([]);

  useEffect(() => {
    watchedRef.current = watchedMatchIds;
  }, [watchedMatchIds]);

  // Load initial watched IDs and cached overview from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedWatched = localStorage.getItem(WATCHED_KEY);
      if (savedWatched) {
        const parsed = JSON.parse(savedWatched);
        if (Array.isArray(parsed)) {
          setWatchedMatchIds(parsed);
          watchedRef.current = parsed;
        }
      }
    } catch {
      // ignore storage errors
    }

    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && typeof parsed === 'object') {
          setOverview(normalizeCricketOverview(parsed));
          setIsLoading(false);
        }
      }
    } catch {
      // ignore cache errors
    }
  }, []);

  // Process real-time updates for watched matches
  const processWatchedUpdates = useCallback((nextOverview: CricketOverview) => {
    const activeWatched = watchedRef.current;
    if (!activeWatched.length) return;

    const allMatches = [...nextOverview.live, ...nextOverview.recent, ...nextOverview.upcoming];

    for (const matchId of activeWatched) {
      const match = allMatches.find((m) => m.id === matchId);
      if (!match) continue;

      const { signature } = buildMatchNotificationPayload(match);
      const prevSig = lastSignatureMapRef.current[matchId];
      const prevEnded = lastEndedMapRef.current[matchId];

      // Only trigger update if we already have a baseline or if score/status changed
      if (prevSig !== undefined && prevSig !== signature) {
        const becameFinal = Boolean(match.matchEnded && !prevEnded);
        // Audible alert on final result, silent in-place update on score ticks
        void sendCricketNotification(match, { silent: !becameFinal });
      }

      lastSignatureMapRef.current[matchId] = signature;
      lastEndedMapRef.current[matchId] = Boolean(match.matchEnded);
    }
  }, []);

  // Subscribe to secondary read-only Firestore document `cricket/overview`
  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const applyOverview = (data: CricketOverview) => {
      if (!isMounted) return;
      setOverview(data);
      setIsLoading(false);
      setError(null);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      } catch {
        // ignore quota errors
      }
      processWatchedUpdates(data);
    };

    try {
      const db = getCricketFirestore();
      const docRef = doc(db, 'cricket', 'overview');

      unsubscribe = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const normalized = normalizeCricketOverview(snapshot.data());
            applyOverview(normalized);
          } else {
            // Fallback to REST if snapshot empty
            fetchCricketOverviewFromRest().then((restData) => {
              if (restData) applyOverview(restData);
              else if (isMounted) setIsLoading(false);
            });
          }
        },
        (err) => {
          console.warn('Cricket feed onSnapshot error, falling back to REST/cache:', err);
          fetchCricketOverviewFromRest().then((restData) => {
            if (restData) {
              applyOverview(restData);
            } else if (isMounted) {
              setError('Unable to reach live cricket feed.');
              setIsLoading(false);
            }
          });
        }
      );
    } catch (err) {
      console.warn('Cricket feed init error, using REST fallback:', err);
      fetchCricketOverviewFromRest().then((restData) => {
        if (restData) {
          applyOverview(restData);
        } else if (isMounted) {
          setError('Unable to initialize live cricket feed.');
          setIsLoading(false);
        }
      });
    }

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [processWatchedUpdates]);

  const isMatchWatched = useCallback(
    (matchId: string) => watchedMatchIds.includes(matchId),
    [watchedMatchIds]
  );

  const toggleWatchMatch = useCallback(
    async (match: CricketMatch) => {
      const currentlyWatched = watchedRef.current.includes(match.id);

      if (currentlyWatched) {
        const updated = watchedRef.current.filter((id) => id !== match.id);
        setWatchedMatchIds(updated);
        watchedRef.current = updated;
        delete lastSignatureMapRef.current[match.id];
        delete lastEndedMapRef.current[match.id];
        try {
          localStorage.setItem(WATCHED_KEY, JSON.stringify(updated));
        } catch {}

        toast({
          title: 'Notifications paused',
          description: `Stopped live score updates for ${match.teams.join(' vs ')}.`,
        });
        return;
      }

      if (typeof window === 'undefined' || !('Notification' in window)) {
        toast({
          title: 'Notifications not supported',
          description: 'Your browser does not support desktop/mobile push notifications.',
          variant: 'destructive',
        });
        return;
      }

      let permission = Notification.permission;
      if (permission === 'default') {
        permission = await Notification.requestPermission();
      }

      if (permission !== 'granted') {
        toast({
          title: 'Permission required',
          description: 'Please allow browser notifications to pin live score alerts.',
          variant: 'destructive',
        });
        return;
      }

      // Register Service Worker
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('/cricket-sw.js');
        } catch (err) {
          console.warn('Failed to register /cricket-sw.js:', err);
        }
      }

      const updated = Array.from(new Set([...watchedRef.current, match.id]));
      setWatchedMatchIds(updated);
      watchedRef.current = updated;
      try {
        localStorage.setItem(WATCHED_KEY, JSON.stringify(updated));
      } catch {}

      const { signature } = buildMatchNotificationPayload(match);
      lastSignatureMapRef.current[match.id] = signature;
      lastEndedMapRef.current[match.id] = Boolean(match.matchEnded);

      // Fire audible initial notification immediately
      await sendCricketNotification(match, { silent: false });

      toast({
        title: 'Live Score Alert Pinned',
        description: `Real-time score updates enabled for ${match.teams.join(' vs ')}.`,
      });
    },
    [toast]
  );

  return (
    <CricketContext.Provider
      value={{
        overview,
        isLoading,
        error,
        watchedMatchIds,
        isMatchWatched,
        toggleWatchMatch,
      }}
    >
      {children}
    </CricketContext.Provider>
  );
}
