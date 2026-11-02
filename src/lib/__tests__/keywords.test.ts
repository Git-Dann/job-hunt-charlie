import { describe, expect, it } from "vitest";
import { extractKeywords, matchKeywords, mentions, rankByRelevance, stem } from "../keywords";

const ADVERT = `Events Manager. We're looking for an experienced Events Manager to deliver our corporate events programme.
You'll own budget management, supplier negotiation and stakeholder management. Strong project management skills essential.
Experience with Salesforce and HubSpot desirable. You will manage events end to end, from planning to post-event reporting.`;

describe("keywords", () => {
    it("finds the phrases an advert leans on", () => {
        const terms = extractKeywords(ADVERT).map((k) => k.term);
        expect(terms).toEqual(expect.arrayContaining(["stakeholder management", "project management", "budget management", "salesforce", "hubspot"]));
        expect(terms).not.toContain("the");
        expect(terms).not.toContain("experience");
    });

    it("matches word endings", () => {
        expect(stem("managing")).toBe(stem("managed"));
        expect(mentions("I managed a team of five", "managing")).toBe(true);
        expect(mentions("I ran events", "salesforce")).toBe(false);
    });

    it("does not match inside other words", () => {
        expect(mentions("I like spreadsheets", "excel")).toBe(false);
        expect(mentions("Advanced Excel user", "excel")).toBe(true);
    });

    it("scores a CV against an advert, both directions", () => {
        const strong = matchKeywords(ADVERT, "Events manager. Project management, stakeholder management, budget management. Salesforce, HubSpot. Corporate events planning and reporting.");
        const weak = matchKeywords(ADVERT, "Barista. Coffee, latte art, customer service.");
        expect(strong.score).toBeGreaterThan(60);
        expect(weak.score).toBeLessThan(20);
        expect(weak.missing.length).toBeGreaterThan(strong.missing.length);
    });

    it("ranks relevant bullets first and keeps the order of ties", () => {
        const kws = extractKeywords(ADVERT);
        const ranked = rankByRelevance(["Made coffee", "Ran supplier negotiation for 30 events", "Trained staff", "Led stakeholder management"], kws);
        expect(ranked.slice(0, 2)).toEqual(expect.arrayContaining(["Ran supplier negotiation for 30 events", "Led stakeholder management"]));
        expect(ranked.slice(2)).toEqual(["Made coffee", "Trained staff"]);
    });
});
