"use client";

import { useSyncExternalStore } from "react";
import { emptyData, normaliseData } from "./store-normalise";
import type { AppData } from "./types";

export const STORAGE_KEY = "jobhunt.data.v1";

export { emptyData, emptyProfile, normaliseData } from "./store-normalise";

let cache: AppData | null = null;
const listeners = new Set<() => void>();
const changeListeners = new Set<(fromSync: boolean) => void>();

/** Called after every change, so cloud sync can save it. `fromSync` marks changes that came from the cloud. */
export function onDataChange(listener: (fromSync: boolean) => void) {
    changeListeners.add(listener);
    return () => changeListeners.delete(listener);
}

function read(): AppData {
    if (cache) return cache;
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        cache = normaliseData(stored ? JSON.parse(stored) : null);
    } catch {
        cache = emptyData();
    }
    return cache;
}

const SERVER_SNAPSHOT = emptyData();

export function getData(): AppData {
    return typeof window === "undefined" ? SERVER_SNAPSHOT : read();
}

/**
 * Stamp `updatedAt` on whatever this change touched. Updates are immutable, so a changed item is
 * simply a new object. Sync uses the stamps to keep the newer copy when two devices disagree.
 */
export function stampChanges(prev: AppData, next: AppData, now: string): AppData {
    const stamp = <T extends { id: string; updatedAt?: string }>(before: T[], after: T[]): T[] => {
        const old = new Map(before.map((x) => [x.id, x]));
        return after.map((x) => (old.get(x.id) === x ? x : { ...x, updatedAt: now }));
    };
    return {
        ...next,
        jobs: next.jobs === prev.jobs ? next.jobs : stamp(prev.jobs, next.jobs),
        cvs: next.cvs === prev.cvs ? next.cvs : stamp(prev.cvs, next.cvs),
        searches: next.searches === prev.searches ? next.searches : stamp(prev.searches, next.searches),
        answers: next.answers === prev.answers ? next.answers : stamp(prev.answers, next.answers),
        interviews: next.interviews === prev.interviews ? next.interviews : stamp(prev.interviews, next.interviews),
        profile: next.profile === prev.profile ? next.profile : { ...next.profile, updatedAt: now },
    };
}

export function setData(update: (d: AppData) => AppData, opts: { fromSync?: boolean } = {}) {
    const prev = read();
    const changed = update(prev);
    const next = opts.fromSync ? changed : stampChanges(prev, changed, new Date().toISOString());
    cache = next;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage full or blocked: keep working in memory for this visit.
    }
    listeners.forEach((l) => l());
    changeListeners.forEach((l) => l(Boolean(opts.fromSync)));
}

export function replaceData(data: AppData) {
    setData(() => normaliseData(data));
}

function subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) {
            cache = null;
            listener();
        }
    };
    window.addEventListener("storage", onStorage);
    return () => {
        listeners.delete(listener);
        window.removeEventListener("storage", onStorage);
    };
}

export function useAppData(): AppData {
    return useSyncExternalStore(subscribe, getData, () => SERVER_SNAPSHOT);
}

/** True once the browser store has been read (avoids flashing empty states on first paint). */
export function useHydrated(): boolean {
    return useSyncExternalStore(
        () => () => {},
        () => true,
        () => false,
    );
}

export const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));
