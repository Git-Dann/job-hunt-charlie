"use client";

import { defaultChecklist } from "./interviews";
import { setData, uid } from "./store";
import type { Interview } from "./types";

export function addInterview(input: Omit<Interview, "id" | "checklist" | "outcome" | "feedback" | "notes" | "questionsToAsk">): string {
    const id = uid();
    const iv: Interview = { ...input, id, checklist: defaultChecklist(input.format, uid), outcome: "upcoming", feedback: "", notes: "", questionsToAsk: "" };
    setData((d) => ({
        ...d,
        interviews: [iv, ...d.interviews],
        // An interview means the application has moved on.
        jobs: d.jobs.map((j) => (j.id === input.jobId && (j.status === "saved" || j.status === "applied") ? { ...j, status: "interview" } : j)),
    }));
    return id;
}

export function updateInterview(id: string, patch: Partial<Interview>) {
    setData((d) => ({ ...d, interviews: d.interviews.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
}

export function deleteInterview(id: string) {
    setData((d) => ({ ...d, interviews: d.interviews.filter((i) => i.id !== id) }));
}

export const formatWhen = (when: string) => {
    const d = new Date(when);
    return isNaN(d.getTime()) ? "No date set" : d.toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
};

export function downloadFile(name: string, content: BlobPart, type: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([content], { type }));
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
