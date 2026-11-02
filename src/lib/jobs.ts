"use client";

import { setData } from "./store";
import type { JobListing, JobStatus, TrackedJob } from "./types";

export function saveJob(job: JobListing, status: JobStatus = "saved") {
    setData((d) => {
        if (d.jobs.some((j) => j.id === job.id)) return d;
        const tracked: TrackedJob = { ...job, status, savedAt: new Date().toISOString(), ...(status === "applied" ? { appliedAt: new Date().toISOString() } : {}) };
        return { ...d, jobs: [tracked, ...d.jobs] };
    });
}

export function updateJob(id: string, patch: Partial<TrackedJob>) {
    setData((d) => ({
        ...d,
        jobs: d.jobs.map((j) => {
            if (j.id !== id) return j;
            const next = { ...j, ...patch };
            if (patch.status === "applied" && !j.appliedAt) next.appliedAt = new Date().toISOString();
            return next;
        }),
    }));
}

export function removeJob(id: string) {
    setData((d) => ({ ...d, jobs: d.jobs.filter((j) => j.id !== id) }));
}

export function formatDate(iso?: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }): string {
    if (!iso) return "";
    const d = new Date(iso);
    return isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-GB", opts);
}

export function timeAgo(iso?: string): string {
    if (!iso) return "";
    const ms = Date.now() - new Date(iso).getTime();
    if (isNaN(ms)) return "";
    const days = Math.floor(ms / 86_400_000);
    if (days <= 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} wk ago`;
    if (days < 365) return `${Math.floor(days / 30)} mo ago`;
    return "Over a year ago";
}
