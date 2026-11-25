import crypto from 'crypto';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { doc, getDoc, getFirestore, setDoc } from 'firebase/firestore';
import { firebaseConfig } from '@/firebase/config';
import { isVpsDbEnabled, vpsGetSetting, vpsSaveSetting } from '@/lib/vps-db';

export type SiteSettingKey = 'moderation' | 'ads' | 'layout';

type CachedOAuthToken = {
  accessToken: string;
  expiresAtMs: number;
};

let cachedToken: CachedOAuthToken | null = null;

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

export function hasFirebaseServiceAccount(): boolean {
  const { projectId, clientEmail, privateKey } = getServiceAccountConfig();
  return Boolean(
    projectId &&
      clientEmail.includes('@') &&
      privateKey.includes('BEGIN') &&
      privateKey.includes('PRIVATE KEY')
  );
}

async function getAdminAccessToken(): Promise<string> {
  const nowMs = Date.now();
  if (cachedToken && cachedToken.expiresAtMs - 300_000 > nowMs) {
    return cachedToken.accessToken;
  }

  const { clientEmail, privateKey } = getServiceAccountConfig();
  if (!clientEmail || !privateKey) {
    throw new Error('Firebase service account credentials are not configured.');
  }

  const iat = Math.floor(nowMs / 1000);
  const exp = iat + 3600;
  const headerB64 = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claimB64 = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: 'https://www.googleapis.com/auth/datastore',
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

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${signingInput}.${signature}`,
    }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`OAuth token failed (${res.status}): ${errText.slice(0, 200)}`);
  }

  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) {
    throw new Error('Missing access_token in OAuth response.');
  }

  cachedToken = {
    accessToken: data.access_token,
    expiresAtMs: nowMs + (data.expires_in || 3600) * 1000,
  };
  return data.access_token;
}

function decodeFirestoreValue(val: unknown): unknown {
  if (!val || typeof val !== 'object') return undefined;
  const v = val as Record<string, unknown>;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('nullValue' in v) return null;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) {
    const arr = (v.arrayValue as { values?: unknown[] })?.values || [];
    return arr.map(decodeFirestoreValue);
  }
  if ('mapValue' in v) {
    const fields = (v.mapValue as { fields?: Record<string, unknown> })?.fields || {};
    const out: Record<string, unknown> = {};
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(fv);
    }
    return out;
  }
  return undefined;
}

function encodeFirestoreValue(val: unknown): Record<string, unknown> {
  if (val === null || val === undefined) return { nullValue: null };
  if (typeof val === 'boolean') return { booleanValue: val };
  if (typeof val === 'number') {
    if (!Number.isFinite(val)) return { integerValue: '0' };
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val };
  }
  if (typeof val === 'string') return { stringValue: val };
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.filter((item) => item !== undefined).map(encodeFirestoreValue),
      },
    };
  }
  if (typeof val === 'object') {
    const fields: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(val as Record<string, unknown>)) {
      if (v !== undefined) {
        fields[k] = encodeFirestoreValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

function getClientFirestore() {
  if (!getApps().length) {
    initializeApp(firebaseConfig);
  }
  return getFirestore(getApp());
}

async function readSettingViaAdminRest(key: SiteSettingKey): Promise<Record<string, unknown> | null> {
  const { projectId } = getServiceAccountConfig();
  const accessToken = await getAdminAccessToken();
  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/settings/${key}`;

  const res = await fetch(docUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Firestore REST GET failed (${res.status}): ${txt.slice(0, 200)}`);
  }

  const json = (await res.json()) as { fields?: Record<string, unknown> };
  if (!json.fields) return null;

  const decoded: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(json.fields)) {
    decoded[k] = decodeFirestoreValue(v);
  }
  return decoded;
}

async function writeSettingViaAdminRest(
  key: SiteSettingKey,
  data: Record<string, unknown>
): Promise<void> {
  const { projectId } = getServiceAccountConfig();
  const accessToken = await getAdminAccessToken();

  const existing = await readSettingViaAdminRest(key).catch(() => null);
  const merged = { ...(existing || {}), ...data };

  const fields: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined) {
      fields[k] = encodeFirestoreValue(v);
    }
  }

  const docUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
    projectId
  )}/databases/(default)/documents/settings/${key}`;

  const res = await fetch(docUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`Firestore REST PATCH failed (${res.status}): ${txt.slice(0, 200)}`);
  }
}

export async function readSiteSetting(
  key: SiteSettingKey
): Promise<Record<string, unknown> | null> {
  // 1. Prefer VPS settings store when enabled for zero Firestore quota burn & instant reads
  if (isVpsDbEnabled()) {
    const vpsData = await vpsGetSetting<Record<string, unknown>>(key);
    if (vpsData && Object.keys(vpsData).length > 0) {
      return vpsData;
    }
  }

  // 2. Try Firebase Service Account REST API
  if (hasFirebaseServiceAccount()) {
    try {
      const restData = await readSettingViaAdminRest(key);
      if (restData) {
        if (isVpsDbEnabled()) {
          vpsSaveSetting(key, restData).catch(() => {});
        }
        return restData;
      }
    } catch {
      // Fall through to client SDK
    }
  }

  // 3. Fallback to public Firestore read
  try {
    const db = getClientFirestore();
    const docSnap = await getDoc(doc(db, 'settings', key));
    if (docSnap.exists()) {
      const data = docSnap.data() as Record<string, unknown>;
      if (isVpsDbEnabled()) {
        vpsSaveSetting(key, data).catch(() => {});
      }
      return data;
    }
  } catch {
    // Graceful fallback handled by caller defaults
  }

  return null;
}

export async function writeSiteSetting(
  key: SiteSettingKey,
  partialOrFullData: Record<string, unknown>
): Promise<{ ok: boolean; via: string }> {
  let currentData: Record<string, unknown> = {};
  if (isVpsDbEnabled()) {
    const existingVps = await vpsGetSetting<Record<string, unknown>>(key);
    if (existingVps) currentData = { ...existingVps };
  }
  const mergedPayload = { ...currentData, ...partialOrFullData };

  let savedToFirebase = false;
  let savedToVps = false;

  // 1. Save to Firebase using Admin Service Account (bypasses firestore.rules PERMISSION_DENIED)
  if (hasFirebaseServiceAccount()) {
    try {
      await writeSettingViaAdminRest(key, mergedPayload);
      savedToFirebase = true;
    } catch (err) {
      console.warn(`Admin REST save failed for settings/${key}:`, err);
    }
  }

  // 2. Save/mirror to VPS SQLite settings table when enabled
  if (isVpsDbEnabled()) {
    savedToVps = await vpsSaveSetting(key, mergedPayload);
  }

  if (savedToFirebase || savedToVps) {
    return {
      ok: true,
      via: savedToFirebase ? (savedToVps ? 'firebase+vps' : 'firebase') : 'vps',
    };
  }

  // 3. Final fallback (only if neither Firebase service account nor VPS settings endpoint succeeded)
  const db = getClientFirestore();
  await setDoc(doc(db, 'settings', key), mergedPayload, { merge: true });
  return { ok: true, via: 'firestore-client' };
}
