import { afterEach, describe, expect, it, vi } from "vitest";
import { siteKeyStatus, withSiteKeys } from "../server/site-keys";

afterEach(() => vi.unstubAllEnvs());

describe("keys set on the site", () => {
    it("uses the site's keys when she hasn't added her own", () => {
        vi.stubEnv("REED_API_KEY", "site-reed");
        vi.stubEnv("ADZUNA_APP_ID", "site-id");
        vi.stubEnv("ADZUNA_APP_KEY", "site-key");
        expect(withSiteKeys({ reedApiKey: "", adzunaAppId: "" })).toEqual({ reedApiKey: "site-reed", adzunaAppId: "site-id", adzunaAppKey: "site-key", adzunaCountry: "gb" });
        expect(siteKeyStatus()).toEqual({ reed: true, adzuna: true });
    });
    it("lets a key typed into Settings win", () => {
        vi.stubEnv("REED_API_KEY", "site-reed");
        expect(withSiteKeys({ reedApiKey: " mine " }).reedApiKey).toBe("mine");
    });
    it("reports nothing set when there are no keys", () => {
        vi.stubEnv("REED_API_KEY", "");
        vi.stubEnv("ADZUNA_APP_ID", "");
        vi.stubEnv("ADZUNA_APP_KEY", "");
        expect(siteKeyStatus()).toEqual({ reed: false, adzuna: false });
    });
});
