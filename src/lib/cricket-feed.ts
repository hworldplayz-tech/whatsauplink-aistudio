import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

export const CRICKET_FEED_CONFIG = {
  apiKey: 'AIzaSyAwBkF0J3sovAUWX8iOQEd7iw_ZCgyXdgU',
  authDomain: 'studio-1792624608-e9ad0.firebaseapp.com',
  projectId: 'studio-1792624608-e9ad0',
  appId: '1:604236803881:web:8dc346a36bf635d3075138',
};

export const CRICKET_DATABASE_ID = 'ai-studio-99a734f5-421e-4cdd-b378-d9788348f3f4';
export const CRICKET_REST_ENDPOINT = `https://firestore.googleapis.com/v1/projects/${CRICKET_FEED_CONFIG.projectId}/databases/${CRICKET_DATABASE_ID}/documents/cricket/overview`;

export interface CricketTeamInfo {
  name: string;
  shortname: string;
  img?: string;
}

export interface CricketScore {
  inning: string;
  runs: number;
  wickets: number;
  overs: number | string;
}

export interface CricketMatch {
  id: string;
  name: string;
  series?: string;
  matchType: string;
  status: string;
  venue?: string;
  date?: string;
  dateTimeGMT?: string;
  teams: string[];
  teamInfo?: CricketTeamInfo[];
  score?: CricketScore[];
  rawSummary?: string;
  matchStarted: boolean;
  matchEnded: boolean;
  isMajor: boolean;
  source: 'cricketdata' | 'cricinfo_rss';
  link?: string;
}

export interface CricketOverview {
  live: CricketMatch[];
  upcoming: CricketMatch[];
  recent: CricketMatch[];
  source: 'cricketdata' | 'cricinfo_rss' | 'hybrid';
  updatedAt: string;
  hitsUsedToday?: number;
  hitsLimit?: number;
}

export interface ParsedTeamRow {
  name: string;
  shortname: string;
  img?: string;
  scoreText: string;
  isBatting: boolean;
}

export function getCricketFirestore(): Firestore {
  const existingApp: FirebaseApp | undefined = getApps().find((a) => a.name === 'cricket-feed');
  const app = existingApp || initializeApp(CRICKET_FEED_CONFIG, 'cricket-feed');
  return getFirestore(app, CRICKET_DATABASE_ID);
}

// Convert Firestore REST Value to plain JS object (used for SSR / fallback)
function decodeFirestoreValue(val: any): any {
  if (!val || typeof val !== 'object') return undefined;
  if ('stringValue' in val) return val.stringValue;
  if ('integerValue' in val) return Number(val.integerValue);
  if ('doubleValue' in val) return Number(val.doubleValue);
  if ('booleanValue' in val) return Boolean(val.booleanValue);
  if ('nullValue' in val) return null;
  if ('arrayValue' in val) {
    return (val.arrayValue?.values || []).map(decodeFirestoreValue);
  }
  if ('mapValue' in val) {
    const out: Record<string, any> = {};
    const fields = val.mapValue?.fields || {};
    for (const [k, v] of Object.entries(fields)) {
      out[k] = decodeFirestoreValue(v);
    }
    return out;
  }
  return undefined;
}

export async function fetchCricketOverviewFromRest(): Promise<CricketOverview | null> {
  try {
    const res = await fetch(CRICKET_REST_ENDPOINT, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.fields) return null;
    const parsed: Record<string, any> = {};
    for (const [k, v] of Object.entries(json.fields)) {
      parsed[k] = decodeFirestoreValue(v);
    }
    return normalizeCricketOverview(parsed);
  } catch {
    return null;
  }
}

export function normalizeCricketOverview(raw: any): CricketOverview {
  return {
    live: Array.isArray(raw?.live) ? raw.live : [],
    upcoming: Array.isArray(raw?.upcoming) ? raw.upcoming : [],
    recent: Array.isArray(raw?.recent) ? raw.recent : [],
    source: raw?.source || 'hybrid',
    updatedAt: raw?.updatedAt || new Date().toISOString(),
    hitsUsedToday: raw?.hitsUsedToday,
    hitsLimit: raw?.hitsLimit,
  };
}

export function getShortname(name: string, provided?: string): string {
  if (provided && provided.trim()) return provided.trim().toUpperCase().slice(0, 5);
  const cleaned = (name || 'TBD').replace(/[^a-zA-Z0-9\s]/g, '').trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return (words[0].slice(0, 2) + words[1].slice(0, 1)).toUpperCase();
  }
  return (cleaned.slice(0, 3) || 'TBD').toUpperCase();
}

export function getTeamBadgeColor(name: string): string {
  const palette = [
    'bg-emerald-600 text-white',
    'bg-teal-600 text-white',
    'bg-sky-600 text-white',
    'bg-indigo-600 text-white',
    'bg-amber-600 text-white',
    'bg-rose-600 text-white',
    'bg-violet-600 text-white',
    'bg-cyan-700 text-white',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return palette[Math.abs(hash) % palette.length];
}

function matchInningToTeam(inningLabel: string, teamName: string, shortname: string): boolean {
  const cleanInning = inningLabel
    .toLowerCase()
    .replace(/\binning\s*\d*\b/gi, '')
    .replace(/\b1st\b|\b2nd\b/gi, '')
    .trim();
  const cleanTeam = teamName.toLowerCase().trim();
  const cleanShort = shortname.toLowerCase().trim();

  if (!cleanInning || !cleanTeam) return false;
  if (cleanInning === cleanTeam) return true;
  if (cleanInning.includes(cleanTeam) || cleanTeam.includes(cleanInning)) return true;
  if (cleanShort && (cleanInning === cleanShort || cleanInning.startsWith(`${cleanShort} `))) return true;
  return false;
}

function extractRawSummaryScores(rawSummary: string | undefined, team1: string, team2: string) {
  if (!rawSummary) return null;
  const parts = rawSummary.split(/\s+v\s+/i);
  if (parts.length < 2) return null;

  const parseSegment = (seg: string) => {
    const isBatting = seg.includes('*');
    const cleaned = seg.replace(/\*/g, '').trim();
    const scoreMatch = cleaned.match(/(\d+(?:\/\d+)?(?:\s*&\s*\d+(?:\/\d+)?)?(?:\s*\([^)]+\))?)$/);
    return {
      text: cleaned,
      score: scoreMatch ? scoreMatch[1].trim() : '',
      isBatting,
    };
  };

  const p1 = parseSegment(parts[0]);
  const p2 = parseSegment(parts[1]);

  const t1Lower = team1.toLowerCase();
  const t2Lower = team2.toLowerCase();
  const p1Lower = p1.text.toLowerCase();
  const p2Lower = p2.text.toLowerCase();

  // Check if parts align directly or swapped
  if (p1Lower.includes(t2Lower) && p2Lower.includes(t1Lower)) {
    return { team1: p2, team2: p1 };
  }
  return { team1: p1, team2: p2 };
}

export function parseMatchTeamsAndScores(match: CricketMatch): [ParsedTeamRow, ParsedTeamRow] {
  const teamNames = Array.isArray(match.teams) && match.teams.length >= 2
    ? [match.teams[0], match.teams[1]]
    : Array.isArray(match.teamInfo) && match.teamInfo.length >= 2
      ? [match.teamInfo[0].name, match.teamInfo[1].name]
      : ['Team A', 'Team B'];

  const findInfo = (name: string): CricketTeamInfo | undefined => {
    if (!Array.isArray(match.teamInfo)) return undefined;
    const lower = name.toLowerCase().trim();
    return match.teamInfo.find(
      (ti) =>
        ti.name?.toLowerCase().trim() === lower ||
        ti.name?.toLowerCase().includes(lower) ||
        lower.includes(ti.name?.toLowerCase() || '')
    );
  };

  const t1Info = findInfo(teamNames[0]);
  const t2Info = findInfo(teamNames[1]);

  const t1Short = getShortname(teamNames[0], t1Info?.shortname);
  const t2Short = getShortname(teamNames[1], t2Info?.shortname);

  const scoresArray = Array.isArray(match.score) ? match.score : [];
  const rawSummaryParsed = extractRawSummaryScores(match.rawSummary, teamNames[0], teamNames[1]);

  const defaultIdleScore = match.matchStarted ? 'Yet to bat' : 'Upcoming';

  if (scoresArray.length > 0) {
    const t1Innings = scoresArray.filter((s) => matchInningToTeam(s.inning || '', teamNames[0], t1Short));
    const t2Innings = scoresArray.filter((s) => matchInningToTeam(s.inning || '', teamNames[1], t2Short));

    const formatInnings = (list: CricketScore[]) =>
      list.map((s) => `${s.runs}/${s.wickets} (${s.overs})`).join(' & ');

    const t1Score = t1Innings.length > 0 ? formatInnings(t1Innings) : defaultIdleScore;
    const t2Score = t2Innings.length > 0 ? formatInnings(t2Innings) : defaultIdleScore;

    // Determine batting indicator for live matches
    let t1Batting = false;
    let t2Batting = false;
    if (match.matchStarted && !match.matchEnded) {
      if (rawSummaryParsed) {
        t1Batting = rawSummaryParsed.team1.isBatting;
        t2Batting = rawSummaryParsed.team2.isBatting;
      } else {
        const lastInning = scoresArray[scoresArray.length - 1];
        if (lastInning) {
          if (matchInningToTeam(lastInning.inning || '', teamNames[0], t1Short)) {
            t1Batting = true;
          } else if (matchInningToTeam(lastInning.inning || '', teamNames[1], t2Short)) {
            t2Batting = true;
          }
        }
      }
    }

    return [
      {
        name: teamNames[0],
        shortname: t1Short,
        img: t1Info?.img,
        scoreText: t1Score,
        isBatting: t1Batting,
      },
      {
        name: teamNames[1],
        shortname: t2Short,
        img: t2Info?.img,
        scoreText: t2Score,
        isBatting: t2Batting,
      },
    ];
  }

  if (rawSummaryParsed) {
    return [
      {
        name: teamNames[0],
        shortname: t1Short,
        img: t1Info?.img,
        scoreText: rawSummaryParsed.team1.score || defaultIdleScore,
        isBatting: Boolean(match.matchStarted && !match.matchEnded && rawSummaryParsed.team1.isBatting),
      },
      {
        name: teamNames[1],
        shortname: t2Short,
        img: t2Info?.img,
        scoreText: rawSummaryParsed.team2.score || defaultIdleScore,
        isBatting: Boolean(match.matchStarted && !match.matchEnded && rawSummaryParsed.team2.isBatting),
      },
    ];
  }

  return [
    {
      name: teamNames[0],
      shortname: t1Short,
      img: t1Info?.img,
      scoreText: defaultIdleScore,
      isBatting: false,
    },
    {
      name: teamNames[1],
      shortname: t2Short,
      img: t2Info?.img,
      scoreText: defaultIdleScore,
      isBatting: false,
    },
  ];
}

export function getMatchTypeLabel(match: CricketMatch): string {
  const mt = (match.matchType || '').toLowerCase().trim();
  if (mt === 'test' || (mt === 'cricket' && /\btest\b/i.test(match.name || ''))) {
    return 'TEST';
  }
  if (mt === 'odi' || /\bodi\b/i.test(match.name || '')) return 'ODI';
  if (mt === 't20' || mt === 't20i' || /\bt20/i.test(match.name || '')) return 'T20';
  return (mt || 'CRICKET').toUpperCase();
}

export function getSeriesLabel(match: CricketMatch): string {
  if (match.series && match.series.trim()) return match.series.trim();
  const parts = (match.name || '').split(',');
  if (parts.length > 1) {
    return parts.slice(1).join(',').trim();
  }
  return match.venue || 'International & Domestic Cricket';
}

export function parseGmtDate(dateTimeGMT?: string, fallbackDate?: string): Date | null {
  if (dateTimeGMT) {
    const normalized =
      !dateTimeGMT.endsWith('Z') && !dateTimeGMT.includes('+')
        ? `${dateTimeGMT}Z`
        : dateTimeGMT;
    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;
  }
  if (fallbackDate) {
    const d = new Date(fallbackDate);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

export function formatUpcomingCountdown(dateTimeGMT?: string, fallbackDate?: string, nowMs?: number): string {
  const target = parseGmtDate(dateTimeGMT, fallbackDate);
  if (!target) return 'Scheduled';
  const diffMs = target.getTime() - (nowMs ?? Date.now());
  if (diffMs <= 0) return 'Starting soon';
  const totalMins = Math.floor(diffMs / 60000);
  const days = Math.floor(totalMins / (60 * 24));
  const hours = Math.floor((totalMins % (60 * 24)) / 60);
  const mins = totalMins % 60;
  if (days > 0) return `In ${days}d ${hours}h`;
  if (hours > 0) return `In ${hours}h ${mins}m`;
  return `In ${mins}m`;
}

export function formatUpdatedAgo(updatedAt?: string, nowMs?: number): string {
  if (!updatedAt) return 'Syncing...';
  const updated = new Date(updatedAt);
  if (isNaN(updated.getTime())) return 'Syncing...';
  const diffSec = Math.max(0, Math.floor(((nowMs ?? Date.now()) - updated.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  const mins = Math.floor(diffSec / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
