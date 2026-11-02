"use client";

import { useSyncExternalStore } from "react";
import type { AppData, Profile } from "./types";

export const STORAGE_KEY = "jobhunt.data.v1";

export const emptyProfile = (): Profile => ({
    name: "",
    headline: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    website: "",
    summary: "",
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    extras: "",
    targetRoles: "",
    targetLocation: "",
    salaryExpectation: "",
    workPreference: "any",
});

export const emptyData = (): AppData => ({
    version: 1,
    profile: emptyProfile(),
    jobs: [],
    cvs: [],
    searches: [],
    ai: { provider: null, apiKey: "", model: "" },
    keys: { reedApiKey: "", adzunaAppId: "", adzunaAppKey: "", adzunaCountry: "gb" },
    onboarded: false,
});

/** Fill in anything missing from older or hand-edited data, so the app never reads `undefined`. */
export function normaliseData(raw: unknown): AppData {
    const base = emptyData();
    if (!raw || typeof raw !== "object") return base;
    const r = raw as Partial<AppData>;
    return {
        version: 1,
        profile: { ...base.profile, ...(r.profile ?? {}) },
        jobs: Array.isArray(r.jobs) ? r.jobs : [],
        cvs: Array.isArray(r.cvs) ? r.cvs : [],
        searches: Array.isArray(r.searches) ? r.searches : [],
        ai: { ...base.ai, ...(r.ai ?? {}) },
        keys: { ...base.keys, ...(r.keys ?? {}) },
        onboarded: Boolean(r.onboarded),
    };
}

let cache: AppData | null = null;
const listeners = new Set<() => void>();

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

export function setData(update: (d: AppData) => AppData) {
    const next = update(read());
    cache = next;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
        // Storage full or blocked: keep working in memory for this visit.
    }
    listeners.forEach((l) => l());
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
