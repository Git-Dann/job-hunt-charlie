"use client";

import { useSyncExternalStore } from "react";
import { getData, onDataChange, setData } from "./store";
import { normaliseData } from "./store-normalise";
import { forCloud, fromCloud, mergeData, normaliseSyncCode } from "./sync-shared";
import type { AppData } from "./types";

/**
 * Keeps this device's data in step with the cloud copy. The device copy is always the one the
 * app reads, so it works offline; the cloud copy catches up a moment after each change.
 */

const KEY = "jobhunt.sync.v1";
const PUSH_DELAY_MS = 1500;
const PULL_THROTTLE_MS = 15_000;

interface Saved {
    code: string;
    version: number;
    /** Changes made here that the cloud doesn't have yet. */
    dirty: boolean;
    lastSyncedAt?: string;
}

export type SyncState = "off" | "idle" | "syncing" | "error" | "offline";
export interface SyncStatus {
    state: SyncState;
    code: string | null;
    message?: string;
    lastSyncedAt?: string;
}

// ── persisted settings ──
function load(): Saved | null {
    try {
        const raw = localStorage.getItem(KEY);
        const s = raw ? (JSON.parse(raw) as Saved) : null;
        return s && normaliseSyncCode(s.code) ? s : null;
    } catch {
        return null;
    }
}
function save(s: Saved | null) {
    try {
        if (s) localStorage.setItem(KEY, JSON.stringify(s));
        else localStorage.removeItem(KEY);
    } catch {
        /* storage blocked: sync just won't remember between visits */
    }
}

// ── status for the UI ──
let status: SyncStatus = { state: "off", code: null };
const listeners = new Set<() => void>();
function setStatus(next: Partial<SyncStatus>) {
    status = { ...status, ...next };
    listeners.forEach((l) => l());
}
const OFF: SyncStatus = { state: "off", code: null };
export function useSyncStatus(): SyncStatus {
    return useSyncExternalStore(
        (l) => (listeners.add(l), () => listeners.delete(l)),
        () => status,
        () => OFF,
    );
}

// ── talking to the server ──
async function api(method: string, code: string | null, body?: unknown, keepalive = false) {
    const res = await fetch("/api/sync", {
        method,
        keepalive,
        headers: { "content-type": "application/json", ...(code ? { "x-sync-code": code } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, json };
}

const describe = (e: unknown) =>
    typeof navigator !== "undefined" && !navigator.onLine ? "You're offline — changes will sync when you're back online." : e instanceof Error ? e.message : "Sync failed.";

let busy: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let lastPull = 0;

/** Run one sync step at a time, so a pull and a push never race each other. */
function exclusive(fn: () => Promise<void>): Promise<void> {
    const run = (busy ?? Promise.resolve()).then(fn, fn);
    busy = run.finally(() => {
        if (busy === run) busy = null;
    });
    return run;
}

function applyCloud(cloud: unknown, mode: "replace" | "merge") {
    const local = getData();
    const incoming = fromCloud(normaliseData(cloud), local);
    const next = mode === "merge" ? mergeData(local, incoming) : incoming;
    setData(() => next, { fromSync: true });
    return next;
}

async function pushNow(attempt = 0): Promise<void> {
    const s = load();
    if (!s || !s.dirty) return;
    if (!navigator.onLine) return setStatus({ state: "offline", message: describe(null) });
    setStatus({ state: "syncing", message: undefined });
    const sentAt = changeSeq;
    const { ok, status: code, json } = await api("PUT", s.code, { data: forCloud(getData()), baseVersion: s.version });
    if (ok) {
        // Something changed while the save was in flight: keep it marked for the next save.
        const stillDirty = changeSeq !== sentAt;
        save({ ...s, version: json.version, dirty: stillDirty, lastSyncedAt: new Date().toISOString() });
        setStatus({ state: "idle", lastSyncedAt: new Date().toISOString() });
        if (stillDirty) schedulePush();
        return;
    }
    if (code === 409 && attempt < 3) {
        // Another device saved first: combine both, then save the combination.
        applyCloud(json.data, "merge");
        save({ ...s, version: json.version, dirty: true });
        return pushNow(attempt + 1);
    }
    if (code === 404) {
        save(null);
        return setStatus({ state: "error", code: null, message: "The cloud copy no longer exists, so sync was turned off on this device." });
    }
    throw new Error(json.error ?? "Sync failed.");
}

/** Counts local changes, so a save knows whether anything changed while it was being sent. */
let changeSeq = 0;

function schedulePush() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
        timer = null;
        exclusive(() => pushNow()).catch((e) => setStatus({ state: navigator.onLine ? "error" : "offline", message: describe(e) }));
    }, PUSH_DELAY_MS);
}

/** Fetch the cloud copy and bring this device up to date (merging if both sides changed). */
export function pull(force = false): Promise<void> {
    const s = load();
    if (!s) return Promise.resolve();
    if (!force && Date.now() - lastPull < PULL_THROTTLE_MS) return Promise.resolve();
    lastPull = Date.now();
    return exclusive(async () => {
        const cur = load();
        if (!cur) return;
        if (!navigator.onLine) return setStatus({ state: "offline", message: describe(null) });
        setStatus({ state: "syncing", message: undefined });
        const { ok, status: code, json } = await api("GET", cur.code);
        if (code === 404) {
            save(null);
            return setStatus({ state: "error", code: null, message: "The cloud copy no longer exists, so sync was turned off on this device." });
        }
        if (!ok) throw new Error(json.error ?? "Sync failed.");
        // Re-read: she may have edited something while the request was in flight.
        const now = load();
        if (!now) return;
        if (json.version > now.version) {
            applyCloud(json.data, now.dirty ? "merge" : "replace");
            save({ ...load()!, version: json.version });
        }
        if (load()?.dirty) await pushNow();
        else {
            save({ ...load()!, lastSyncedAt: new Date().toISOString() });
            setStatus({ state: "idle", lastSyncedAt: new Date().toISOString() });
        }
    }).catch((e) => setStatus({ state: navigator.onLine ? "error" : "offline", message: describe(e) }));
}

/** Turn sync on for the first time: uploads this device's data and returns the new code. */
export async function enableSync(): Promise<string> {
    const { ok, json } = await api("POST", null, { data: forCloud(getData()) });
    if (!ok) throw new Error(json.error ?? "Couldn't turn on sync.");
    save({ code: json.code, version: json.version, dirty: false, lastSyncedAt: new Date().toISOString() });
    setStatus({ state: "idle", code: json.code, message: undefined, lastSyncedAt: new Date().toISOString() });
    return json.code;
}

/** Link this device to an existing cloud copy. Anything already on this device is kept and merged in. */
export async function joinSync(input: string): Promise<void> {
    const code = normaliseSyncCode(input);
    if (!code) throw new Error("That doesn't look like a sync code. It's 20 letters and numbers, like ABCD-EFGH-…");
    const { ok, json } = await api("GET", code);
    if (!ok) throw new Error(json.error ?? "Couldn't find that sync code.");
    const local = getData();
    const hasLocal = local.jobs.length > 0 || local.cvs.length > 0 || local.profile.name.trim() !== "" || local.profile.experience.length > 0;
    applyCloud(json.data, hasLocal ? "merge" : "replace");
    save({ code, version: json.version, dirty: hasLocal, lastSyncedAt: new Date().toISOString() });
    setStatus({ state: "idle", code, message: undefined, lastSyncedAt: new Date().toISOString() });
    if (hasLocal) await exclusive(() => pushNow());
}

/** Stop syncing on this device. The cloud copy stays, so other devices keep working. */
export function disableSync() {
    save(null);
    setStatus({ state: "off", code: null, message: undefined });
}

export async function deleteCloudCopy(): Promise<void> {
    const s = load();
    if (!s) return;
    const { ok, json } = await api("DELETE", s.code);
    if (!ok) throw new Error(json.error ?? "Couldn't delete the cloud copy.");
    disableSync();
}

export async function serverHasDatabase(): Promise<boolean> {
    try {
        const { json } = await api("GET", null);
        return Boolean(json.configured);
    } catch {
        return false;
    }
}

let started = false;
/** Wire sync into the app. Called once from the app shell. */
export function startSync(): () => void {
    if (started) return () => {};
    started = true;
    const s = load();
    setStatus(s ? { state: "idle", code: s.code, lastSyncedAt: s.lastSyncedAt } : OFF);

    const offChange = onDataChange((fromSync) => {
        const cur = load();
        if (!cur || fromSync) return;
        changeSeq++;
        save({ ...cur, dirty: true });
        schedulePush();
    });
    const onVisible = () => document.visibilityState === "visible" && pull();
    const onOnline = () => pull(true);
    // Leaving the page with unsaved changes: send them now rather than wait for the timer.
    const onHide = () => {
        const cur = load();
        if (cur?.dirty && document.visibilityState === "hidden" && !busy) {
            if (timer) clearTimeout(timer);
            timer = null;
            const sentAt = changeSeq;
            api("PUT", cur.code, { data: forCloud(getData()), baseVersion: cur.version }, true)
                .then(({ ok, json }) => ok && save({ ...cur, version: json.version, dirty: changeSeq !== sentAt, lastSyncedAt: new Date().toISOString() }))
                .catch(() => {});
        }
    };
    document.addEventListener("visibilitychange", onVisible);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("online", onOnline);
    window.addEventListener("focus", onVisible);
    void pull(true);

    return () => {
        started = false;
        offChange();
        document.removeEventListener("visibilitychange", onVisible);
        document.removeEventListener("visibilitychange", onHide);
        window.removeEventListener("online", onOnline);
        window.removeEventListener("focus", onVisible);
    };
}

export type { AppData };
