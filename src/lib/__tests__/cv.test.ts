import { describe, expect, it } from "vitest";
import { newCvFromProfile, parseCvText, profileCompleteness, resolveCv, tailorCv } from "../cv";
import { emptyProfile } from "../store";
import type { Profile } from "../types";

// The exact format our "write my CV from scratch" prompt asks the AI to use.
const AI_CV = `JANE SMITH
Events & Marketing Manager
Manchester | jane.smith@example.com | 07700 900123 | linkedin.com/in/janesmith

PROFILE
Organised events manager with six years' experience.

KEY SKILLS
Event planning, Budget management, Stakeholder management, Canva

EXPERIENCE

Events Manager — Northern Arts Trust, Manchester (Mar 2021 – Present)
• Delivered 40+ events a year with budgets up to £80k
• Grew attendance by 35%

Marketing Assistant — Bloom Agency (Jun 2018 – Feb 2021)
• Ran social media for 6 clients

EDUCATION
BA (Hons) Marketing — University of Leeds (2015 – 2018). 2:1

CERTIFICATIONS
• Google Analytics Certification`;

const profile = (): Profile => ({
    ...emptyProfile(),
    name: "Jane",
    skills: ["Canva", "Budget management", "Stakeholder management", "Photography"],
    experience: [{ id: "e1", role: "Events Manager", company: "NAT", start: "2021", end: "Present", bullets: ["Took photos", "Led stakeholder management for 12 partners", "Managed budget management of £80k"] }],
});

describe("parseCvText", () => {
    it("reads the AI CV format fully", () => {
        let n = 0;
        const p = parseCvText(AI_CV, () => `id${n++}`);
        expect(p.name).toBe("Jane Smith");
        expect(p.headline).toBe("Events & Marketing Manager");
        expect(p.email).toBe("jane.smith@example.com");
        expect(p.phone).toBe("07700 900123");
        expect(p.location).toBe("Manchester");
        expect(p.skills).toEqual(["Event planning", "Budget management", "Stakeholder management", "Canva"]);
        expect(p.experience).toHaveLength(2);
        expect(p.experience![0]).toMatchObject({ role: "Events Manager", company: "Northern Arts Trust", location: "Manchester", start: "Mar 2021", end: "Present" });
        expect(p.experience![0].bullets).toEqual(["Delivered 40+ events a year with budgets up to £80k", "Grew attendance by 35%"]);
        expect(p.experience![1]).toMatchObject({ role: "Marketing Assistant", company: "Bloom Agency", end: "Feb 2021" });
        expect(p.education![0]).toMatchObject({ qualification: "BA (Hons) Marketing", institution: "University of Leeds", start: "2015", end: "2018", detail: "2:1" });
        expect(p.certifications).toEqual(["Google Analytics Certification"]);
    });

    it("leaves job history empty rather than guessing on a free-form CV", () => {
        const p = parseCvText("Sam Lee\nsam@example.com\n\nWork history\nI worked at a shop for ages and did lots of things.");
        expect(p.experience).toBeUndefined();
        expect(p.email).toBe("sam@example.com");
    });
});

describe("tailorCv", () => {
    it("reorders skills and bullets towards the advert, inventing nothing", () => {
        const p = profile();
        const base = newCvFromProfile(p, "x", "v1", "2026-01-01");
        const res = tailorCv(p, "We need stakeholder management and budget management. Salesforce essential.", base);
        expect(res.version.skills.slice(0, 2).sort()).toEqual(["Budget management", "Stakeholder management"]);
        expect(res.version.skills.sort()).toEqual([...p.skills].sort());
        expect(res.version.experience[0].bullets[2]).toBe("Took photos");
        expect(res.version.experience[0].bullets.sort()).toEqual([...p.experience[0].bullets].sort());
        expect(res.gaps).toContain("salesforce");
    });

    it("resolves only included roles", () => {
        const p = profile();
        const v = { ...newCvFromProfile(p, "x", "v1", "2026-01-01"), experience: [{ id: "e1", include: false, bullets: [] }] };
        expect(resolveCv(p, v).experience).toHaveLength(0);
    });
});

describe("profileCompleteness", () => {
    it("is 0 for an empty profile and lists what's missing", () => {
        const c = profileCompleteness(emptyProfile());
        expect(c.percent).toBe(0);
        expect(c.missing).toContain("Name");
    });
});
