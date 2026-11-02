export type JobStatus = "saved" | "applied" | "interview" | "offer" | "rejected";

export const JOB_STATUSES: { id: JobStatus; label: string; color: "gray" | "brand" | "warning" | "success" | "error" }[] = [
    { id: "saved", label: "Saved", color: "gray" },
    { id: "applied", label: "Applied", color: "brand" },
    { id: "interview", label: "Interviewing", color: "warning" },
    { id: "offer", label: "Offer", color: "success" },
    { id: "rejected", label: "Closed", color: "error" },
];

/** A job as found by a search or a scrape. */
export interface JobListing {
    /** Stable id derived from the source + url, so the same job found twice is recognised. */
    id: string;
    title: string;
    company: string;
    location?: string;
    url: string;
    source: string;
    description?: string;
    salary?: string;
    postedAt?: string;
    remote?: boolean;
    tags?: string[];
}

/** A job she has saved to her tracker. */
export interface TrackedJob extends JobListing {
    status: JobStatus;
    savedAt: string;
    appliedAt?: string;
    notes?: string;
    contact?: string;
    nextStep?: string;
    nextStepDate?: string;
    /** Set automatically on every change; lets sync keep the newer copy. */
    updatedAt?: string;
}

export interface Experience {
    id: string;
    role: string;
    company: string;
    location?: string;
    start: string;
    end: string;
    bullets: string[];
}

export interface Education {
    id: string;
    qualification: string;
    institution: string;
    start?: string;
    end?: string;
    detail?: string;
}

export interface Profile {
    name: string;
    headline: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    summary: string;
    skills: string[];
    experience: Experience[];
    education: Education[];
    certifications: string[];
    extras: string;
    /** What she's looking for — feeds prompts and search defaults. */
    targetRoles: string;
    targetLocation: string;
    salaryExpectation: string;
    workPreference: "any" | "remote" | "hybrid" | "office";
    updatedAt?: string;
}

/** A CV tailored to a role: which bits of the profile to use and how to order them. */
export interface CvVersion {
    id: string;
    name: string;
    jobId?: string;
    jobDescription?: string;
    headline: string;
    summary: string;
    skills: string[];
    /** Experience ids in display order; bullets per experience in display order. */
    experience: { id: string; include: boolean; bullets: string[] }[];
    template: "classic" | "modern" | "compact";
    createdAt: string;
    updatedAt: string;
}

export interface SavedSearch {
    id: string;
    name: string;
    keywords: string;
    location: string;
    remoteOnly: boolean;
    urls: string[];
    updatedAt?: string;
    /** Job alerts: re-run in the background and flag jobs she hasn't seen. */
    alerts?: boolean;
    lastCheckedAt?: string;
    /** Ids of every job this search has already shown her (capped). */
    seenIds?: string[];
    /** Jobs found since she last looked. */
    newJobs?: JobListing[];
    lastError?: string;
}

/** A saved answer to a question application forms keep asking. */
export interface SavedAnswer {
    id: string;
    question: string;
    answer: string;
    updatedAt?: string;
}

export type AiProvider = "anthropic" | "openai" | "gemini";

export interface AiSettings {
    provider: AiProvider | null;
    apiKey: string;
    model: string;
}

export interface SourceKeys {
    reedApiKey: string;
    adzunaAppId: string;
    adzunaAppKey: string;
    adzunaCountry: string;
    /** Free key from the Companies House developer hub (optional if the site owner set one). */
    companiesHouseKey?: string;
}

export type InterviewOutcome = "upcoming" | "waiting" | "next-round" | "offer" | "rejected";

export interface ChecklistItem {
    id: string;
    text: string;
    done: boolean;
}

export interface Interview {
    id: string;
    jobId: string;
    round: string;
    /** Local date-time, e.g. "2026-11-12T14:30". */
    when: string;
    durationMins: number;
    format: "video" | "phone" | "in-person" | "assessment";
    where: string;
    interviewers: string;
    notes: string;
    questionsToAsk: string;
    checklist: ChecklistItem[];
    outcome: InterviewOutcome;
    feedback: string;
    updatedAt?: string;
}

export interface Goals {
    weeklyApplications: number;
}

export interface AppData {
    version: 1;
    profile: Profile;
    jobs: TrackedJob[];
    cvs: CvVersion[];
    searches: SavedSearch[];
    answers: SavedAnswer[];
    interviews: Interview[];
    goals: Goals;
    ai: AiSettings;
    keys: SourceKeys;
    onboarded: boolean;
}
