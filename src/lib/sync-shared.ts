import type { AppData } from "./types";

/**
 * Rules shared by the browser and the server for syncing. Pure, so they're unit-tested.
 */

/** Strip anything secret before data leaves the device: API keys stay on each device. */
export function forCloud(d: AppData): AppData {
    return {
        ...d,
        ai: { ...d.ai, apiKey: "" },
        keys: { ...d.keys, reedApiKey: "", adzunaAppKey: "" },
    };
}

/** Bring cloud data onto this device, keeping this device's own secrets. */
export function fromCloud(cloud: AppData, local: AppData): AppData {
    return {
        ...cloud,
        ai: { ...cloud.ai, apiKey: local.ai.apiKey, ...(cloud.ai.provider ? {} : { provider: local.ai.provider, model: local.ai.model }) },
        keys: { ...cloud.keys, reedApiKey: local.keys.reedApiKey, adzunaAppKey: local.keys.adzunaAppKey },
    };
}

type Stamped = { id: string; updatedAt?: string };

const newer = (a?: string, b?: string) => (a ?? "") >= (b ?? "");

/** Items from both sides; where both have one, the more recently changed copy wins (ties: this device). */
function mergeById<T extends Stamped>(mine: T[], theirs: T[]): T[] {
    const cloud = new Map(theirs.map((x) => [x.id, x]));
    const ids = new Set(mine.map((x) => x.id));
    return [...mine.map((x) => (cloud.has(x.id) && !newer(x.updatedAt, cloud.get(x.id)!.updatedAt) ? cloud.get(x.id)! : x)), ...theirs.filter((x) => !ids.has(x.id))];
}

const isFilled = (v: unknown) => (Array.isArray(v) ? v.length > 0 : String(v ?? "").trim() !== "");

/**
 * Two devices both changed things since they last synced. Nothing is dropped: items on either
 * device are kept, and where the same item changed on both, the newer change wins.
 * (A job deleted on one device while edited on the other comes back — losing work is worse.)
 */
export function mergeData(local: AppData, cloud: AppData): AppData {
    const localNewer = newer(local.profile.updatedAt, cloud.profile.updatedAt);
    const [winner, other] = localNewer ? [local.profile, cloud.profile] : [cloud.profile, local.profile];
    return {
        ...local,
        jobs: mergeById(local.jobs, cloud.jobs),
        cvs: mergeById(local.cvs, cloud.cvs),
        searches: mergeById(local.searches, cloud.searches),
        profile: {
            // The newer profile wins field by field, with gaps filled from the other copy.
            ...other,
            ...Object.fromEntries(Object.entries(winner).filter(([, v]) => isFilled(v))),
            experience: mergeById(winner.experience, other.experience),
            education: mergeById(winner.education, other.education),
        } as AppData["profile"],
        onboarded: local.onboarded || cloud.onboarded,
    };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O, 1/I: easy to type on a phone

/** A sync code: 20 random characters (100 bits) in groups of four. Possession is the password. */
export function makeSyncCode(random: (n: number) => Uint8Array): string {
    const bytes = random(20);
    const chars = [...bytes].map((b) => ALPHABET[b % 32]).join("");
    return chars.match(/.{4}/g)!.join("-");
}

/** Accept a code typed any way (lower case, spaces, missing dashes). Null if it can't be one of ours. */
export function normaliseSyncCode(input: string): string | null {
    const raw = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (raw.length !== 20 || [...raw].some((c) => !ALPHABET.includes(c))) return null;
    return raw.match(/.{4}/g)!.join("-");
}

export const MAX_SYNC_BYTES = 2_000_000;
