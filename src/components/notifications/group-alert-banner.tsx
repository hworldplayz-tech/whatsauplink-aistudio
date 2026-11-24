'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, X } from 'lucide-react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { useFirestore } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

const DISMISSED_KEY = 'groupsor_alerts_prompt_dismissed';
const ENABLED_KEY = 'groupsor_alerts_enabled';
const FCM_TOKEN_KEY = 'groupsor_fcm_token';
const FCM_SYNCED_AT_KEY = 'groupsor_fcm_synced_at';
const FCM_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SW_PATH = '/groups-sw.js';
const SW_SCOPE = '/alerts/';
const VAPID_KEY = (process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '').trim();

function isValidImageUrl(url: unknown): string {
  if (typeof url !== 'string') return '/icon.png';
  const trimmed = url.trim();
  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return '/icon.png';
}

function getSafeGroupPath(id: string): string {
  const cleaned = id.replace(/[^a-zA-Z0-9_-]/g, '');
  return cleaned ? `/group/invite/${cleaned}` : '/';
}

export function GroupAlertBanner() {
  const pathname = usePathname();
  const { app, firestore } = useFirestore();
  const { toast } = useToast();

  const [showBanner, setShowBanner] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const swRegRef = useRef<ServiceWorkerRegistration | null>(null);
  const initializedRef = useRef(false);
  const seenIdsRef = useRef<Set<string>>(new Set());

  const isAdminRoute = Boolean(pathname?.startsWith('/admin'));

  const ensureSwRegistration = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }
    if (swRegRef.current) return swRegRef.current;

    try {
      const existing = await navigator.serviceWorker.getRegistration(SW_SCOPE);
      if (existing) {
        swRegRef.current = existing;
        return existing;
      }
      const reg = await navigator.serviceWorker.register(SW_PATH, {
        scope: SW_SCOPE,
      });
      swRegRef.current = reg;
      return reg;
    } catch {
      return null;
    }
  }, []);

  const syncFcmBackgroundSubscription = useCallback(
    async (force = false) => {
      if (typeof window === 'undefined' || !VAPID_KEY) return;
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      if (!app || typeof (app as { name?: unknown }).name !== 'string') return;

      try {
        const supported = await isSupported();
        if (!supported) return;

        const reg = await ensureSwRegistration();
        if (!reg) return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, {
          vapidKey: VAPID_KEY,
          serviceWorkerRegistration: reg,
        });
        if (!token) return;

        const lastToken = window.localStorage.getItem(FCM_TOKEN_KEY) || '';
        const lastSyncedAt = Number(
          window.localStorage.getItem(FCM_SYNCED_AT_KEY) || '0'
        );
        const isFresh =
          !force &&
          lastToken === token &&
          Date.now() - lastSyncedAt < FCM_SYNC_INTERVAL_MS;

        if (isFresh) return;

        const res = await fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (res.ok) {
          window.localStorage.setItem(FCM_TOKEN_KEY, token);
          window.localStorage.setItem(FCM_SYNCED_AT_KEY, String(Date.now()));
        }
      } catch {
        // Gracefully ignore when browser blocks PushManager or VAPID key isn't active yet
      }
    },
    [app, ensureSwRegistration]
  );

  const showBrowserNotification = useCallback(
    async ({
      title,
      body,
      url,
      icon,
      tag,
    }: {
      title: string;
      body: string;
      url: string;
      icon: string;
      tag: string;
    }) => {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission !== 'granted') return;

      const reg = await ensureSwRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        try {
          await reg.showNotification(title, {
            body,
            icon,
            badge: '/icon.png',
            tag,
            data: { url },
          });
          return;
        } catch {
          // Fall back to standard Notification API below
        }
      }

      try {
        const n = new Notification(title, {
          body,
          icon,
          tag,
        });
        n.onclick = () => {
          window.focus();
          window.location.href = url;
          n.close();
        };
      } catch {
        // Browser may require active Service Worker on some mobile platforms
      }
    },
    [ensureSwRegistration]
  );

  // Sync notification state & prompt visibility cleanly after client mount
  useEffect(() => {
    if (isAdminRoute) {
      setShowBanner(false);
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    const permission = Notification.permission;
    if (permission === 'granted') {
      setAlertsEnabled(true);
      setShowBanner(false);
      try {
        window.localStorage.setItem(ENABLED_KEY, 'true');
      } catch {
        // Ignore storage restrictions
      }
      void ensureSwRegistration().then(() => syncFcmBackgroundSubscription(false));
      return;
    }

    if (permission === 'default') {
      try {
        const dismissed = window.localStorage.getItem(DISMISSED_KEY) === 'true';
        setShowBanner(!dismissed);
      } catch {
        setShowBanner(true);
      }
      return;
    }

    setShowBanner(false);
  }, [ensureSwRegistration, isAdminRoute, syncFcmBackgroundSubscription]);

  // Listen in real time for newly added WhatsApp groups & channels when allowed
  useEffect(() => {
    if (!alertsEnabled || isAdminRoute) return;
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const hasValidFirestore =
      firestore && typeof (firestore as { type?: unknown }).type === 'string';
    if (!hasValidFirestore) return;

    initializedRef.current = false;
    seenIdsRef.current = new Set();

    const groupsQuery = query(
      collection(firestore, 'groups'),
      orderBy('lastSubmittedAt', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(
      groupsQuery,
      (snapshot) => {
        if (!initializedRef.current) {
          snapshot.docs.forEach((docSnap) => {
            seenIdsRef.current.add(docSnap.id);
          });
          initializedRef.current = true;
          return;
        }

        const freshDocs = snapshot
          .docChanges()
          .filter(
            (change) =>
              change.type === 'added' && !seenIdsRef.current.has(change.doc.id)
          );

        snapshot.docs.forEach((docSnap) => {
          seenIdsRef.current.add(docSnap.id);
        });

        // Cap notifications per batch to prevent burst spam on reconnect
        freshDocs.slice(0, 2).forEach((change) => {
          const data = change.doc.data() as {
            title?: unknown;
            type?: unknown;
            imageUrl?: unknown;
          };
          const rawTitle =
            typeof data.title === 'string' && data.title.trim()
              ? data.title.trim()
              : '';
          const isChannel = data.type === 'channel';

          const heading = isChannel
            ? 'New Channel Added in Groupsor! Join Fast'
            : 'New Group Added in Groupsor! Join Fast';
          const body = rawTitle
            ? `${rawTitle} — Tap to view & join now`
            : isChannel
              ? 'A fresh WhatsApp channel just went live. Tap to join!'
              : 'A fresh WhatsApp group just went live. Tap to join!';

          void showBrowserNotification({
            title: heading,
            body,
            url: getSafeGroupPath(change.doc.id),
            icon: isValidImageUrl(data.imageUrl),
            tag: `groupsor-new-${change.doc.id}`,
          });
        });
      },
      () => {
        // Silently ignore transient listener errors
      }
    );

    return () => {
      unsubscribe();
    };
  }, [alertsEnabled, firestore, isAdminRoute, showBrowserNotification]);

  const handleAllow = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    setIsRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        try {
          window.localStorage.setItem(ENABLED_KEY, 'true');
          window.localStorage.removeItem(DISMISSED_KEY);
        } catch {
          // Ignore storage restrictions
        }
        setAlertsEnabled(true);
        setShowBanner(false);
        await ensureSwRegistration();
        await syncFcmBackgroundSubscription(true);

        await showBrowserNotification({
          title: 'Groupsor Alerts Enabled!',
          body: 'You will get instant alerts whenever new WhatsApp groups or channels arrive.',
          url: '/',
          icon: '/icon.png',
          tag: 'groupsor-alerts-welcome',
        });

        toast({
          title: 'Notifications Allowed',
          description:
            'You will be notified immediately when new groups or channels are added.',
        });
      } else if (permission === 'denied') {
        try {
          window.localStorage.setItem(DISMISSED_KEY, 'true');
        } catch {
          // Ignore storage restrictions
        }
        setShowBanner(false);
        toast({
          title: 'Notifications Blocked',
          description:
            'You can turn notifications back on anytime from your browser site settings.',
        });
      } else {
        setShowBanner(false);
      }
    } catch {
      setShowBanner(false);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleDismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage restrictions
    }
    setShowBanner(false);
  };

  if (!showBanner || isAdminRoute) return null;

  return (
    <div
      role="region"
      aria-label="New group notification prompt"
      className="relative z-50 w-full bg-emerald-700 text-white border-b border-emerald-800/50"
    >
      <div className="container mx-auto max-w-7xl px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15">
            <Bell className="h-3.5 w-3.5 text-emerald-100" />
          </span>
          <p className="font-medium leading-snug text-white">
            Get instant notifications when new WhatsApp groups &amp; channels are added!
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleAllow}
            disabled={isRequesting}
            className="inline-flex items-center justify-center rounded-md bg-white px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm transition-colors hover:bg-emerald-50 disabled:opacity-60 cursor-pointer"
          >
            {isRequesting ? 'Enabling...' : 'Allow'}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-emerald-100 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
          >
            Not Now
            <X className="h-3.5 w-3.5 sm:hidden" />
          </button>
        </div>
      </div>
    </div>
  );
}
