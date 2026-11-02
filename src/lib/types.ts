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
}

export interface AppData {
    version: 1;
    profile: Profile;
    jobs: TrackedJob[];
    cvs: CvVersion[];
    searches: SavedSearch[];
    ai: AiSettings;
    keys: SourceKeys;
    onboarded: boolean;
}
