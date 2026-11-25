import type { Category, Country, GroupLink, Report } from '@/lib/data';

function getVpsDbConfig() {
  const baseUrl = (process.env.VPS_DB_URL || '').trim().replace(/\/+$/, '');
  const secret = (process.env.VPS_DB_SECRET || '').trim();
  return { baseUrl, secret };
}

export function isVpsDbEnabled(): boolean {
  const { baseUrl } = getVpsDbConfig();
  return baseUrl.startsWith('http://') || baseUrl.startsWith('https://');
}

async function vpsRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    requireAuth?: boolean;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const { baseUrl, secret } = getVpsDbConfig();
  if (!baseUrl) {
    throw new Error('VPS_DB_URL is not configured.');
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  } else if (options.requireAuth) {
    throw new Error('VPS_DB_SECRET is not configured.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 8000);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: controller.signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data as { message?: string })?.message || res.statusText || 'VPS DB request failed';
      throw new Error(`VPS DB HTTP ${res.status}: ${msg}`);
    }
    return data as T;
  } finally {
    clearTimeout(timer);
  }
}

export async function vpsGetGroups(params: {
  category?: string;
  country?: string;
  language?: string;
  type?: string;
  tag?: string;
  q?: string;
  featured?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
} = {}): Promise<{
  groups: GroupLink[];
  total: number;
  totalPages: number;
  page: number;
  limit: number;
  hasMore: boolean;
}> {
  const qs = new URLSearchParams();
  if (params.category) qs.set('category', params.category);
  if (params.country) qs.set('country', params.country);
  if (params.language) qs.set('language', params.language);
  if (params.type) qs.set('type', params.type);
  if (params.tag) qs.set('tag', params.tag);
  if (params.q) qs.set('q', params.q);
  if (params.featured) qs.set('featured', 'true');
  if (params.sort) qs.set('sort', params.sort);
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));

  const queryStr = qs.toString();
  const data = await vpsRequest<{
    groups: GroupLink[];
    total: number;
    totalPages: number;
    page: number;
    limit: number;
    hasMore: boolean;
  }>(`/groups${queryStr ? `?${queryStr}` : ''}`);

  return {
    groups: Array.isArray(data.groups) ? data.groups : [],
    total: Number(data.total || 0),
    totalPages: Number(data.totalPages || 1),
    page: Number(data.page || 1),
    limit: Number(data.limit || 50),
    hasMore: Boolean(data.hasMore),
  };
}

export async function vpsGetGroupById(id: string): Promise<GroupLink | null> {
  if (!id) return null;
  try {
    const data = await vpsRequest<{ group?: GroupLink }>(`/groups/${encodeURIComponent(id)}`);
    return data.group || null;
  } catch (err) {
    if (err instanceof Error && err.message.includes('HTTP 404')) {
      return null;
    }
    throw err;
  }
}

export async function vpsGetRelatedGroups(id: string): Promise<GroupLink[]> {
  if (!id) return [];
  const data = await vpsRequest<{ groups?: GroupLink[] }>(
    `/groups/${encodeURIComponent(id)}/related`
  );
  return Array.isArray(data.groups) ? data.groups : [];
}

export async function vpsGetGroupByLink(link: string): Promise<GroupLink | null> {
  if (!link) return null;
  const data = await vpsRequest<{ group?: GroupLink | null }>(
    `/groups/by-link?link=${encodeURIComponent(link)}`
  );
  return data.group || null;
}

export async function vpsCreateOrUpsertGroup(payload: Record<string, unknown>): Promise<GroupLink> {
  const data = await vpsRequest<{ group: GroupLink }>('/groups', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
  return data.group;
}

export async function vpsUpdateGroup(
  id: string,
  payload: Record<string, unknown>
): Promise<GroupLink> {
  const data = await vpsRequest<{ group: GroupLink }>(`/groups/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: payload,
    requireAuth: true,
  });
  return data.group;
}

export async function vpsDeleteGroup(id: string): Promise<void> {
  await vpsRequest(`/groups/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function vpsBulkDeleteGroups(ids: string[]): Promise<void> {
  await vpsRequest('/groups/bulk-delete', {
    method: 'POST',
    body: { ids },
    requireAuth: true,
  });
}

export async function vpsBulkSetFeatured(ids: string[], featured: boolean): Promise<void> {
  await vpsRequest('/groups/bulk-featured', {
    method: 'POST',
    body: { ids, featured },
    requireAuth: true,
  });
}

export async function vpsIncrementClick(id: string): Promise<void> {
  await vpsRequest(`/groups/${encodeURIComponent(id)}/click`, {
    method: 'POST',
    body: {},
    requireAuth: true,
  });
}

export async function vpsVoteWorking(id: string, isWorking: boolean): Promise<void> {
  await vpsRequest(`/groups/${encodeURIComponent(id)}/vote`, {
    method: 'POST',
    body: { isWorking },
    requireAuth: true,
  });
}

export async function vpsSubmitRating(id: string, rating: number): Promise<number> {
  const data = await vpsRequest<{ newAverage: number }>(`/groups/${encodeURIComponent(id)}/rate`, {
    method: 'POST',
    body: { rating },
    requireAuth: true,
  });
  return Number(data.newAverage || rating);
}

export async function vpsGetCategories(): Promise<Category[]> {
  const data = await vpsRequest<{ categories?: Category[] }>('/categories');
  return Array.isArray(data.categories) ? data.categories : [];
}

export async function vpsSaveCategory(value: string, label: string): Promise<Category> {
  const data = await vpsRequest<{ category: Category }>('/categories', {
    method: 'POST',
    body: { value, label },
    requireAuth: true,
  });
  return data.category;
}

export async function vpsDeleteCategory(value: string): Promise<void> {
  await vpsRequest(`/categories/${encodeURIComponent(value)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function vpsGetCountries(): Promise<Country[]> {
  const data = await vpsRequest<{ countries?: Country[] }>('/countries');
  return Array.isArray(data.countries) ? data.countries : [];
}

export async function vpsSaveCountry(value: string, label: string): Promise<Country> {
  const data = await vpsRequest<{ country: Country }>('/countries', {
    method: 'POST',
    body: { value, label },
    requireAuth: true,
  });
  return data.country;
}

export async function vpsDeleteCountry(value: string): Promise<void> {
  await vpsRequest(`/countries/${encodeURIComponent(value)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function vpsGetReports(): Promise<Report[]> {
  const data = await vpsRequest<{ reports?: Report[] }>('/reports', {
    requireAuth: true,
  });
  return Array.isArray(data.reports) ? data.reports : [];
}

export async function vpsCreateReport(payload: {
  groupId: string;
  groupTitle: string;
  reason: string;
}): Promise<void> {
  await vpsRequest('/reports', {
    method: 'POST',
    body: payload,
    requireAuth: true,
  });
}

export async function vpsDeleteReport(reportId: string): Promise<void> {
  await vpsRequest(`/reports/${encodeURIComponent(reportId)}`, {
    method: 'DELETE',
    requireAuth: true,
  });
}

export async function vpsListPushSubscriptions(): Promise<Array<{ id: string; token: string }>> {
  const data = await vpsRequest<{ subscriptions?: Array<{ id: string; token: string }> }>(
    '/push/subscriptions',
    { requireAuth: true }
  );
  return Array.isArray(data.subscriptions) ? data.subscriptions : [];
}

export async function vpsRegisterPushToken(token: string): Promise<void> {
  await vpsRequest('/push/subscribe', {
    method: 'POST',
    body: { token },
    requireAuth: true,
  });
}

export async function vpsUnregisterPushToken(token: string): Promise<void> {
  await vpsRequest('/push/subscribe', {
    method: 'DELETE',
    body: { token },
    requireAuth: true,
  });
}

export async function vpsPrunePushTokens(tokens: string[]): Promise<void> {
  if (!tokens.length) return;
  await vpsRequest('/push/prune', {
    method: 'POST',
    body: { tokens },
    requireAuth: true,
  });
}
