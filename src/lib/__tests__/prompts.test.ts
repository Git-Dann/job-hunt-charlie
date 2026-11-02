import { describe, expect, it } from "vitest";
import { PROMPTS, chatLinks } from "../prompts";

const ctx = {
    cv: "JANE SMITH\nEvents Manager",
    name: "Jane Smith",
    targetRoles: "events manager",
    targetLocation: "Manchester",
    workPreference: "hybrid",
    salaryExpectation: "£40k",
    job: { title: "Events Lead", company: "Acme", description: "Run events." },
    fields: {},
};

describe("prompt library", () => {
    it("has unique ids", () => {
        expect(new Set(PROMPTS.map((p) => p.id)).size).toBe(PROMPTS.length);
    });

    it("every prompt includes the CV, and job prompts include the advert", () => {
        for (const p of PROMPTS) {
            const text = p.build(ctx);
            if (!["rejection", "extract-jobs"].includes(p.id) && p.id !== "negotiate-x") expect(text, p.id).toContain("JANE SMITH");
            if (p.needsJob) expect(text, p.id).toMatch(/Acme/);
            expect(text, p.id).not.toMatch(/undefined|\[object Object\]/);
        }
    });

    it("asks for the CV rather than inventing one when it's missing", () => {
        const text = PROMPTS.find((p) => p.id === "tailor-cv")!.build({ ...ctx, cv: "" });
        expect(text).toContain("Ask me to paste it before doing anything else");
        expect(text).toContain("NEVER invent");
    });

    it("only offers pre-filled chat links when the prompt fits in a URL", () => {
        expect(chatLinks("short").find((l) => l.id === "chatgpt")!.href).toContain("chatgpt.com/?q=short");
        expect(chatLinks("x".repeat(9000)).every((l) => l.href === null)).toBe(true);
    });
});

describe("prompt depth", () => {
    it("every prompt has a role, honesty rules and a defined output", () => {
        for (const p of PROMPTS) {
            const text = p.build(ctx);
            expect(text, p.id).toContain("<role>");
            expect(text, p.id).toMatch(/<output>|<rules>/);
            expect(text.length, p.id).toBeGreaterThan(700);
        }
    });
});
