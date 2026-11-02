import { describe, expect, it } from "vitest";
import { applyCheck, isDue, markSeen, newCount } from "../alerts";
import { fillAnswer, intentsOf, matchAnswers, parseLimit, parseQaPairs, wordCount } from "../answers";
import type { JobListing, SavedAnswer, SavedSearch } from "../types";

const job = (id: string, title = `Job ${id}`, company = "Acme"): JobListing => ({ id, title, company, url: `https://x/${id}`, source: "Reed" });
const search = (p: Partial<SavedSearch> = {}): SavedSearch => ({ id: "s", name: "s", keywords: "events", location: "", remoteOnly: false, urls: [], alerts: true, ...p });

describe("job alerts", () => {
    it("is due when never checked, or 6 hours after the last check", () => {
        const now = Date.parse("2026-11-02T12:00:00Z");
        expect(isDue(search(), now)).toBe(true);
        expect(isDue(search({ lastCheckedAt: "2026-11-02T08:00:00Z" }), now)).toBe(false);
        expect(isDue(search({ lastCheckedAt: "2026-11-02T05:00:00Z" }), now)).toBe(true);
        expect(isDue(search({ alerts: false }), now)).toBe(false);
    });

    it("announces each job once, then only genuinely new ones", () => {
        let s = applyCheck(search(), [job("a"), job("b")], "t1");
        expect(s.newJobs!.map((j) => j.id)).toEqual(["a", "b"]);
        s = markSeen(s);
        s = applyCheck(s, [job("a"), job("b"), job("c")], "t2");
        expect(s.newJobs!.map((j) => j.id)).toEqual(["c"]);
        s = applyCheck(s, [job("a"), job("c")], "t3");
        expect(s.newJobs!.map((j) => j.id)).toEqual(["c"]); // not duplicated while still unread
    });

    it("treats the same advert from another source as already seen", () => {
        let s = markSeen(applyCheck(search(), [job("reed-1", "Events Manager", "Acme")], "t1"));
        s = applyCheck(s, [job("adzuna-9", "Events Manager", "Acme")], "t2");
        expect(s.newJobs).toEqual([]);
    });

    it("counts only searches with alerts on", () => {
        expect(newCount([search({ newJobs: [job("a")] }), search({ alerts: false, newJobs: [job("b")] })])).toBe(1);
    });
});

const bank: SavedAnswer[] = [
    { id: "1", question: "Why do you want to work for {company}?", answer: "I love what {company} does." },
    { id: "2", question: "Tell us about a time you worked as part of a team", answer: "At NAT I led…" },
    { id: "3", question: "What is your notice period?", answer: "One month." },
    { id: "4", question: "What are your salary expectations?", answer: "£35–38k." },
    { id: "5", question: "Empty one", answer: "" },
];

describe("answer bank", () => {
    it("matches differently worded questions by what they ask", () => {
        expect(matchAnswers("What attracts you to this role at our organisation?", bank)[0].answer.id).toBe("1");
        expect(matchAnswers("Please give an example of successful collaboration with colleagues", bank)[0].answer.id).toBe("2");
        expect(matchAnswers("When could you start?", bank)[0].answer.id).toBe("3");
        expect(matchAnswers("What remuneration are you looking for?", bank)[0].answer.id).toBe("4");
    });

    it("explains why, and suggests nothing for unrelated questions", () => {
        expect(matchAnswers("Why are you interested in this role?", bank)[0].reason).toMatch(/why this role/i);
        expect(matchAnswers("Do you hold a forklift certificate?", bank)).toEqual([]);
    });

    it("never suggests an empty answer", () => {
        expect(matchAnswers("Empty one", bank)).toEqual([]);
    });

    it("fills the company and role", () => {
        expect(fillAnswer("I love {company} and the {role} role", { company: "Acme", title: "Events Lead" })).toBe("I love Acme and the Events Lead role");
        expect(fillAnswer("I love {company}")).toBe("I love {company}");
    });

    it("reads limits and counts words", () => {
        expect(parseLimit("Why us? (max 250 words)")).toEqual({ n: 250, unit: "words" });
        expect(parseLimit("1,500 characters")).toEqual({ n: 1500, unit: "characters" });
        expect(wordCount(" one two  three ")).toBe(3);
        expect(intentsOf("Do you require sponsorship?")).toContain("rightToWork");
    });
});

describe("importing AI-written answers", () => {
    it("reads Q/A pairs, including multi-line answers and markdown", () => {
        const text = `Q: Why do you want to work for {company}?
A: I've followed {company} for years.
It's the work I love.

**Q:** Do you have a full UK driving licence?
**A:** Yes.

Q: Empty one
A:
`;
        expect(parseQaPairs(text)).toEqual([
            { question: "Why do you want to work for {company}?", answer: "I've followed {company} for years.\nIt's the work I love." },
            { question: "Do you have a full UK driving licence?", answer: "Yes." },
        ]);
    });
});
