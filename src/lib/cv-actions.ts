"use client";

import { newCvFromProfile, tailorCv } from "./cv";
import { getData, setData, uid } from "./store";
import type { CvVersion } from "./types";

/** Make a new CV version from the profile; tailored to a job when one is given. Returns its id. */
export function createCv(opts: { name?: string; jobId?: string; jobText?: string } = {}): string {
    const d = getData();
    const now = new Date().toISOString();
    const job = opts.jobId ? d.jobs.find((j) => j.id === opts.jobId) : undefined;
    const name = opts.name || (job ? `${job.title}${job.company ? ` — ${job.company}` : ""}` : `My CV ${d.cvs.length + 1}`);
    let version = newCvFromProfile(d.profile, name, uid(), now);
    const text = opts.jobText ?? (job ? `${job.title}\n${job.description ?? ""}` : "");
    if (text.trim()) version = tailorCv(d.profile, text, version).version;
    version = { ...version, jobId: job?.id, jobDescription: text || undefined };
    setData((x) => ({ ...x, cvs: [version, ...x.cvs] }));
    return version.id;
}

export function updateCv(id: string, patch: Partial<CvVersion>) {
    setData((d) => ({ ...d, cvs: d.cvs.map((c) => (c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c)) }));
}

export function deleteCv(id: string) {
    setData((d) => ({ ...d, cvs: d.cvs.filter((c) => c.id !== id) }));
}
