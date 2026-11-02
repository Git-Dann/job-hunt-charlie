import { describe, expect, it } from "vitest";
import { stampChanges } from "../store";
import { emptyData } from "../store-normalise";

describe("change stamps", () => {
    it("stamps only the items that changed", () => {
        const a = { id: "a", title: "A", company: "", url: "", source: "", status: "saved" as const, savedAt: "" };
        const b = { ...a, id: "b" };
        const prev = { ...emptyData(), jobs: [a, b] };
        const next = stampChanges(prev, { ...prev, jobs: [a, { ...b, notes: "hi" }] }, "NOW");
        expect(next.jobs[0].updatedAt).toBeUndefined();
        expect(next.jobs[1].updatedAt).toBe("NOW");
        expect(next.profile.updatedAt).toBeUndefined();
    });
});
