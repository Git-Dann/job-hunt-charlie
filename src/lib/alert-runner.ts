"use client";

import { useSyncExternalStore } from "react";
import { applyCheck, isDue } from "./alerts";
import { listingMatches } from "./search-filter";
import { getData, setData } from "./store";
import type { JobListing, SavedSearch } from "./types";

/**
 * Runs job alerts in the browser: no server schedule, no AI. When she opens the app (or taps
 * Check now), each saved search with alerts on is re-run if it hasn't been for 6 hours.
 */

let running = false;
const listeners = new Set<() => void>();
let checking: string | null = null;
const emit = () => listeners.forEach((l) => l());

export function useCheckingAlert(): string | null {
    return useSyncExternalStore(
        (l) => (listeners.add(l), () => listeners.delete(l)),
        () => checking,
        () => null,
    );
}

async function post(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error ?? "The check failed.");
    return json;
}

async function runOne(s: SavedSearch): Promise<void> {
    checking = s.id;
    emit();
    const found: JobListing[] = [];
    const problems: string[] = [];
    try {
        if (s.keywords.trim()) {
            const r = await post("/api/search", { keywords: s.keywords, location: s.location, remoteOnly: s.remoteOnly, keys: getData().keys });
            found.push(...r.jobs);
            if (r.sources.every((x: { ok: boolean }) => !x.ok)) problems.push("No job sites answered.");
        }
        if (s.urls.length) {
            const r = await post("/api/scrape", { urls: s.urls });
            found.push(...r.jobs.filter((j: JobListing) => !s.keywords.trim() || listingMatches(j, s.keywords)));
            for (const p of r.pages) if (!p.ok) problems.push(`${p.url.replace(/^https?:\/\//, "")}: ${p.error}`);
        }
    } catch (e) {
        problems.push(e instanceof Error ? e.message : "The check failed.");
    }
    const failedCompletely = !found.length && problems.length > 0;
    setData((d) => ({
        ...d,
        searches: d.searches.map((x) => {
            if (x.id !== s.id) return x;
            // A failed check isn't "nothing new": keep the old time so it's retried next visit.
            if (failedCompletely) return { ...x, lastError: problems.join(" ") };
            return { ...applyCheck(x, found, new Date().toISOString()), lastError: problems.length ? problems.join(" ") : undefined };
        }),
    }));
}

/** Check due alerts (or just the given one, regardless of timing). One at a time, to be gentle on the job sites. */
export async function checkAlerts(onlyId?: string): Promise<void> {
    if (running) return;
    running = true;
    try {
        const now = Date.now();
        const todo = getData().searches.filter((s) => (onlyId ? s.id === onlyId : isDue(s, now)));
        for (const s of todo) await runOne(s);
    } finally {
        running = false;
        checking = null;
        emit();
    }
}
