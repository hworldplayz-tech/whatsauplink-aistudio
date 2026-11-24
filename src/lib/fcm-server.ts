import crypto from 'crypto';
import { firebaseConfig } from '@/firebase/config';

const COLLECTION_NAME = 'push_subscriptions';
const TOKEN_REGEX = /^[A-Za-z0-9_:-]{50,4096}$/;
const BATCH_SIZE = 25;
const MAX_FETCH_PAGES = 10;

type CachedOAuthToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedOAuthToken: CachedOAuthToken | null = null;

function getServiceAccountConfig() {
  const projectId = (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    firebaseConfig.projectId ||
    ''
  ).trim();

  const clientEmail = (process.env.FIREBASE_CLIENT_EMAIL || '').trim();
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/\\n/g, '\n')
    .trim();

  return { projectId, clientEmail, privateKey };
}

export function isFcmConfigured(): boolean {
  const { projectId, clientEmail, privateKey } = getServiceAccountConfig();
  return Boolean(
    projectId &&
      clientEmail.includes('@') &&
      privateKey.includes('BEGIN') &&
      privateKey.includes('PRIVATE KEY')
  );
}

export function isValidFcmToken(token: unknown): token is string {
  return typeof token === 'string' && TOKEN_REGEX.test(token.trim());
}

function getTokenDocId(token: string): string {
  return crypto.createHash('sha256').update(token.trim()).digest('hex').slice(0, 40);
}

async function getGoogleAccessToken(): Promise<string> {
  const nowMs = Date.now();
  if (cachedOAuthToken && cachedOAuthToken.expiresAtMs - 300_000 > nowMs) {
    return cachedOAuthToken.accessToken;
  }

  const { clientEmail, privateKey } = getServiceAccountConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Firebase service account credentials are not configured.');
  }

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + 3600;

  const headerB64 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString(
    'base64url'
  );
  const claimB64 = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope:
        'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/datastore',
      aud: 'https://oauth2.googleapis.com/token',
      exp,
      iat,
    })
  ).toString('base64url');

  const signingInput = `${headerB64}.${claimB64}`;
  const signature = crypto
    .createSign('RSA-SHA256')
    .update(signingInput)
    .sign(privateKey, 'base64url');

  const assertion = `${signingInput}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Google OAuth token exchange failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('Google OAuth response did not include access_token.');
  }

  cachedOAuthToken = {
    accessToken: data.access_token,
    expiresAtMs: nowMs + (data.expires_in || 3600) * 1000,
  };

  return data.access_token;
}

export async function registerPushToken(token: string): Promise<void> {
  if (!isFcmConfigured()) return;
  const cleanToken = token.trim();
  if (!isValidFcmToken(cleanToken)) {
    throw new Error('Invalid FCM token format.');
  }

  const { projectId } = getServiceAccountConfig();
  const accessToken = await getGoogleAccessToken();
  const docId = getTokenDocId(cleanToken);
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/${COLLECTION_NAME}/${docId}`;

  const res = await fetch(docUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        token: { stringValue: cleanToken },
        updatedAt: { timestampValue: new Date().toISOString() },
      },
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Failed to store push subscription (${res.status}): ${errText.slice(0, 200)}`);
  }
}

export async function unregisterPushToken(token: string): Promise<void> {
  if (!isFcmConfigured()) return;
  const cleanToken = token.trim();
  if (!isValidFcmToken(cleanToken)) return;

  const { projectId } = getServiceAccountConfig();
  const accessToken = await getGoogleAccessToken();
  const docId = getTokenDocId(cleanToken);
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/${COLLECTION_NAME}/${docId}`;

  await fetch(docUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  }).catch(() => {});
}

async function listPushSubscriptions(
  projectId: string,
  accessToken: string
): Promise<Array<{ docName: string; token: string }>> {
  const results: Array<{ docName: string; token: string }> = [];
  let pageToken = '';

  for (let page = 0; page < MAX_FETCH_PAGES; page++) {
    const params = new URLSearchParams({ pageSize: '300' });
    if (pageToken) params.set('pageToken', pageToken);

    const listUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
      projectId
    )}/databases/(default)/documents/${COLLECTION_NAME}?${params.toString()}`;

    const res = await fetch(listUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store',
    });

    if (!res.ok) {
      if (res.status === 404) break;
      const errText = await res.text().catch(() => '');
      throw new Error(`Failed to list push subscriptions (${res.status}): ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as {
      documents?: Array<{
        name?: string;
        fields?: { token?: { stringValue?: string } };
      }>;
      nextPageToken?: string;
    };

    for (const docItem of data.documents || []) {
      const docName = docItem.name || '';
      const tokenVal = docItem.fields?.token?.stringValue || '';
      if (docName && isValidFcmToken(tokenVal)) {
        results.push({ docName, token: tokenVal });
      }
    }

    if (!data.nextPageToken) break;
    pageToken = data.nextPageToken;
  }

  return results;
}

function getSafeNotificationIcon(imageUrl: unknown): string {
  if (typeof imageUrl === 'string' && imageUrl.trim().startsWith('https://')) {
    return imageUrl.trim();
  }
  return 'https://www.groupsor.co.uk/icon.png';
}

export async function sendNewGroupPushNotification(input: {
  groupId: string;
  title?: string;
  type?: string;
  imageUrl?: string;
}): Promise<{ sent: number; failed: number; pruned: number; skipped?: boolean }> {
  if (!isFcmConfigured()) {
    return { sent: 0, failed: 0, pruned: 0, skipped: true };
  }

  const safeGroupId = input.groupId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (!safeGroupId) {
    return { sent: 0, failed: 0, pruned: 0, skipped: true };
  }

  const { projectId } = getServiceAccountConfig();
  const accessToken = await getGoogleAccessToken();
  const subscribers = await listPushSubscriptions(projectId, accessToken);

  if (subscribers.length === 0) {
    return { sent: 0, failed: 0, pruned: 0 };
  }

  const isChannel = input.type === 'channel';
  const cleanTitle = (input.title || '').trim();
  const heading = isChannel
    ? 'New Channel Added in Groupsor! Join Fast'
    : 'New Group Added in Groupsor! Join Fast';
  const body = cleanTitle
    ? `${cleanTitle} — Tap to view & join now`
    : isChannel
      ? 'A fresh WhatsApp channel just went live. Tap to join!'
      : 'A fresh WhatsApp group just went live. Tap to join!';

  const targetUrl = `/group/invite/${safeGroupId}`;
  const safeIcon = getSafeNotificationIcon(input.imageUrl);
  const tag = `groupsor-new-${safeGroupId}`;
  const fcmEndpoint = `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/messages:send`;

  let sent = 0;
  let failed = 0;
  const staleDocNames: string[] = [];

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const chunk = subscribers.slice(i, i + BATCH_SIZE);
    await Promise.allSettled(
      chunk.map(async (sub) => {
        const res = await fetch(fcmEndpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: sub.token,
              data: {
                title: heading,
                body,
                url: targetUrl,
                icon: safeIcon,
                tag,
                groupId: safeGroupId,
              },
              webpush: {
                headers: {
                  Urgency: 'high',
                  TTL: '86400',
                },
                fcm_options: {
                  link: targetUrl,
                },
              },
            },
          }),
          cache: 'no-store',
        });

        if (res.ok) {
          sent += 1;
          return;
        }

        failed += 1;
        const errBody = await res.text().catch(() => '');
        if (
          res.status === 404 ||
          errBody.includes('UNREGISTERED') ||
          errBody.includes('not a valid FCM registration token')
        ) {
          staleDocNames.push(sub.docName);
        }
      })
    );
  }

  if (staleDocNames.length > 0) {
    await Promise.allSettled(
      staleDocNames.map((docName) =>
        fetch(`https://firestore.googleapis.com/v1/${docName}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: 'no-store',
        })
      )
    );
  }

  return { sent, failed, pruned: staleDocNames.length };
}
