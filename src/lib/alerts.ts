import type { JobListing, SavedSearch } from "./types";

/** Job alerts: pure rules, so they're tested without a browser or network. */

export const ALERT_INTERVAL_MS = 6 * 60 * 60 * 1000;
const MAX_SEEN = 3000;
const MAX_NEW = 60;
const MAX_DESCRIPTION = 1500;

export function isDue(s: SavedSearch, now: number): boolean {
    if (!s.alerts) return false;
    if (!s.lastCheckedAt) return true;
    return now - new Date(s.lastCheckedAt).getTime() >= ALERT_INTERVAL_MS;
}

/** Same advert seen via another source still counts as seen. */
const titleKey = (j: JobListing) => `t:${j.title}|${j.company}`.toLowerCase().replace(/[^a-z0-9|:]/g, "");

/**
 * Fold one check's results into a saved search. Anything not seen before becomes "new"; everything
 * found is then remembered as seen, so a job is only ever announced once.
 */
export function applyCheck(s: SavedSearch, found: JobListing[], nowIso: string): SavedSearch {
    const seen = new Set(s.seenIds ?? []);
    const already = new Set((s.newJobs ?? []).map((j) => j.id));
    const fresh = found.filter((j) => !seen.has(j.id) && !seen.has(titleKey(j)) && !already.has(j.id));
    const trimmed = fresh.map((j) => ({ ...j, description: j.description?.slice(0, MAX_DESCRIPTION) }));
    const newJobs = [...trimmed, ...(s.newJobs ?? [])].slice(0, MAX_NEW);
    const seenIds = [...found.flatMap((j) => [j.id, titleKey(j)]), ...(s.seenIds ?? [])];
    return {
        ...s,
        lastCheckedAt: nowIso,
        lastError: undefined,
        newJobs,
        seenIds: [...new Set(seenIds)].slice(0, MAX_SEEN),
    };
}

/** She's looked: clear the "new" list (the jobs stay remembered as seen). */
export function markSeen(s: SavedSearch): SavedSearch {
    return { ...s, newJobs: [] };
}

export function newCount(searches: SavedSearch[]): number {
    return searches.reduce((n, s) => n + (s.alerts ? (s.newJobs?.length ?? 0) : 0), 0);
}
