import type { Interview, TrackedJob } from "./types";

/** Job search progress, worked out from what she's already tracking. No extra logging needed. */

/** Monday 00:00 (local) of the week containing `d`. */
export function weekStart(d: Date): Date {
    const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x;
}

/** When did she apply? The recorded date, or — for jobs marked applied without one — when she saved it. */
export const appliedDate = (j: TrackedJob): string | undefined => j.appliedAt ?? (j.status !== "saved" ? j.savedAt : undefined);

export interface WeekCount {
    start: Date;
    count: number;
}

export function weeklyApplications(jobs: TrackedJob[], now: Date, weeks = 8): WeekCount[] {
    const thisWeek = weekStart(now).getTime();
    const out: WeekCount[] = Array.from({ length: weeks }, (_, i) => ({ start: new Date(thisWeek - (weeks - 1 - i) * 7 * 86_400_000), count: 0 }));
    for (const j of jobs) {
        const at = appliedDate(j);
        if (!at) continue;
        const ws = weekStart(new Date(at)).getTime();
        const slot = out.find((w) => Math.abs(w.start.getTime() - ws) < 2 * 3_600_000); // tolerate a clock change
        if (slot) slot.count++;
    }
    return out;
}

/** Consecutive weeks (ending with last week, or this week if already hit) that met the target. */
export function streak(weeks: WeekCount[], target: number): number {
    if (target <= 0) return 0;
    let n = 0;
    const last = weeks.length - 1;
    const startAt = weeks[last].count >= target ? last : last - 1;
    for (let i = startAt; i >= 0 && weeks[i].count >= target; i--) n++;
    return n;
}

export interface Funnel {
    saved: number;
    applied: number;
    interviewed: number;
    offers: number;
    /** % of applications that led to an interview. Null until there are enough to mean anything. */
    interviewRate: number | null;
    offerRate: number | null;
}

export function funnel(jobs: TrackedJob[], interviews: Interview[]): Funnel {
    const interviewedIds = new Set(interviews.map((i) => i.jobId));
    const applied = jobs.filter((j) => appliedDate(j)).length;
    const interviewed = jobs.filter((j) => interviewedIds.has(j.id) || j.status === "interview" || j.status === "offer").length;
    const offers = jobs.filter((j) => j.status === "offer" || interviews.some((i) => i.jobId === j.id && i.outcome === "offer")).length;
    return {
        saved: jobs.length,
        applied,
        interviewed,
        offers,
        interviewRate: applied >= 5 ? Math.round((interviewed / applied) * 100) : null,
        offerRate: interviewed >= 3 ? Math.round((offers / interviewed) * 100) : null,
    };
}

/** One honest, specific nudge based on the numbers. */
export function nudge(f: Funnel, thisWeek: number, target: number): string {
    if (f.applied === 0) return "Your first application is the hardest. Pick one saved job and tailor your CV to it today.";
    if (thisWeek < target) return `${target - thisWeek} more application${target - thisWeek === 1 ? "" : "s"} to hit this week's target.`;
    if (f.interviewRate !== null && f.interviewRate < 10) return "Lots of applications but few interviews: tailoring your CV to each job usually makes the biggest difference. Try the fit check prompt on your next one.";
    if (f.interviewed > 0 && f.offers === 0 && f.interviewed >= 3) return "You're getting interviews, which means your CV is working. Focus practice on interviews: try a mock interview.";
    return "Target hit this week. Nice work — keep the momentum going.";
}
