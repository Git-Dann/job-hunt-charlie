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
            if (!["rejection", "questions-to-ask", "company-research", "thank-you"].includes(p.id)) expect(text, p.id).toContain("JANE SMITH");
            if (p.needsJob) expect(text, p.id).toMatch(/Acme/);
            expect(text, p.id).not.toMatch(/undefined|\[object Object\]/);
        }
    });

    it("asks for the CV rather than inventing one when it's missing", () => {
        const text = PROMPTS.find((p) => p.id === "tailor-cv")!.build({ ...ctx, cv: "" });
        expect(text).toContain("ask me for it first");
        expect(text).toContain("Never invent");
    });

    it("only offers pre-filled chat links when the prompt fits in a URL", () => {
        expect(chatLinks("short").find((l) => l.id === "chatgpt")!.href).toContain("chatgpt.com/?q=short");
        expect(chatLinks("x".repeat(9000)).every((l) => l.href === null)).toBe(true);
    });
});
