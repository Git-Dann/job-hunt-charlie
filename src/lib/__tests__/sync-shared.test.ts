import { describe, expect, it } from "vitest";
import { emptyData } from "../store-normalise";
import { forCloud, fromCloud, makeSyncCode, mergeData, normaliseSyncCode } from "../sync-shared";
import type { AppData, TrackedJob } from "../types";

const job = (id: string, title = id): TrackedJob => ({ id, title, company: "", url: "", source: "x", status: "saved", savedAt: "2026-01-01" });
const withSecrets = (): AppData => ({ ...emptyData(), ai: { provider: "anthropic", apiKey: "sk-ant-secret", model: "m" }, keys: { reedApiKey: "reed", adzunaAppId: "id", adzunaAppKey: "az", adzunaCountry: "gb" } });

describe("secrets never leave the device", () => {
    it("strips keys before upload", () => {
        const c = forCloud(withSecrets());
        expect(JSON.stringify(c)).not.toMatch(/sk-ant-secret|"reed"|"az"/);
        expect(c.ai.provider).toBe("anthropic");
    });
    it("keeps this device's keys when cloud data arrives", () => {
        const merged = fromCloud(forCloud(withSecrets()), withSecrets());
        expect(merged.ai.apiKey).toBe("sk-ant-secret");
        expect(merged.keys.reedApiKey).toBe("reed");
    });
});

describe("merging two devices", () => {
    it("keeps items from both sides", () => {
        const m = mergeData({ ...emptyData(), jobs: [job("a"), job("b")] }, { ...emptyData(), jobs: [job("a"), job("c")] });
        expect(m.jobs.map((j) => j.id)).toEqual(["a", "b", "c"]);
    });
    it("keeps the newer copy of an item, whichever device has it", () => {
        // Laptop edited job x; the phone still has the old copy and edited job y.
        const old = { ...job("x", "old"), updatedAt: "2026-11-01T10:00:00Z" };
        const laptopEdit = { ...job("x", "laptop edit"), updatedAt: "2026-11-02T10:00:00Z" };
        const phoneEdit = { ...job("y", "phone edit"), updatedAt: "2026-11-02T10:00:05Z" };
        const phone = { ...emptyData(), jobs: [old, phoneEdit] };
        const cloud = { ...emptyData(), jobs: [laptopEdit, { ...job("y", "old y"), updatedAt: "2026-11-01T10:00:00Z" }] };
        const m = mergeData(phone, cloud);
        expect(m.jobs.find((j) => j.id === "x")!.title).toBe("laptop edit");
        expect(m.jobs.find((j) => j.id === "y")!.title).toBe("phone edit");
    });
    it("uses the newer profile and fills its gaps from the older one", () => {
        const local = { ...emptyData(), profile: { ...emptyData().profile, name: "Charlie", updatedAt: "2026-11-02" } };
        const cloud = { ...emptyData(), profile: { ...emptyData().profile, name: "Old", email: "c@example.com", updatedAt: "2026-11-01" } };
        const m = mergeData(local, cloud);
        expect(m.profile.name).toBe("Charlie");
        expect(m.profile.email).toBe("c@example.com");
    });
});

describe("sync codes", () => {
    it("are 20 unambiguous characters in groups of four", () => {
        const code = makeSyncCode((n) => new Uint8Array(n).map((_, i) => i * 37));
        expect(code).toMatch(/^[A-Z2-9]{4}(-[A-Z2-9]{4}){4}$/);
        expect(code).not.toMatch(/[01OI]/);
    });
    it("accept sloppy typing and reject junk", () => {
        expect(normaliseSyncCode("abcd efgh-jklm npqr stuv")).toBe("ABCD-EFGH-JKLM-NPQR-STUV");
        expect(normaliseSyncCode("ABCD-EFGH")).toBeNull();
        expect(normaliseSyncCode("0BCD-EFGH-JKLM-NPQR-STUV")).toBeNull();
    });
});
