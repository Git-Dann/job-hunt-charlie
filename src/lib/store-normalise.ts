import type { AppData, Profile } from "./types";

/** Defaults and validation for stored data. Pure: used by the browser store and the sync API. */

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
    answers: [],
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
        answers: Array.isArray(r.answers) ? r.answers : [],
        ai: { ...base.ai, ...(r.ai ?? {}) },
        keys: { ...base.keys, ...(r.keys ?? {}) },
        onboarded: Boolean(r.onboarded),
    };
}
