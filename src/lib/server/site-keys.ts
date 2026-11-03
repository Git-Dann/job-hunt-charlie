import type { SourceKeys } from "@/lib/types";

/**
 * Reed and Adzuna keys set once on the site (Vercel env vars), so Charlie never has to add them.
 * A key typed into Settings on a device still wins; otherwise the site's key is used.
 */
export function withSiteKeys(own: Partial<SourceKeys> = {}): SourceKeys {
    const env = process.env;
    return {
        reedApiKey: own.reedApiKey?.trim() || env.REED_API_KEY?.trim() || "",
        adzunaAppId: own.adzunaAppId?.trim() || env.ADZUNA_APP_ID?.trim() || "",
        adzunaAppKey: own.adzunaAppKey?.trim() || env.ADZUNA_APP_KEY?.trim() || "",
        adzunaCountry: own.adzunaCountry?.trim() || env.ADZUNA_COUNTRY?.trim() || "gb",
    };
}

/** Which keys the site already has. Never returns the keys themselves. */
export function siteKeyStatus() {
    const k = withSiteKeys();
    return { reed: Boolean(k.reedApiKey), adzuna: Boolean(k.adzunaAppId && k.adzunaAppKey) };
}
