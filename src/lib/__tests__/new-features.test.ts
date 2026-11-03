import { inflateRawSync } from "node:zlib";
import { Packer } from "docx";
import { describe, expect, it } from "vitest";
import { resolveCv } from "../cv";
import { buildCvDocx } from "../cv-docx";
import { defaultChecklist, focusAreas, interviewIcs, likelyQuestions } from "../interviews";
import { funnel, nudge, streak, weekStart, weeklyApplications } from "../progress";
import { formatGbp, parseAdzunaHistogram, parseSalary, salaryStats, statsFromHistogram } from "../salary";
import { decodePayload, encodePayload, payloadFromShare, payloadToListing, splitPageTitle } from "../save-job";
import { emptyProfile } from "../store-normalise";
import type { Interview, TrackedJob } from "../types";

let n = 0;
const id = () => `id${n++}`;
const job = (p: Partial<TrackedJob> = {}): TrackedJob => ({ id: id(), title: "Events Manager", company: "Acme", url: "https://x", source: "Reed", status: "saved", savedAt: "2026-10-01T10:00:00Z", ...p });

describe("interviews", () => {
    const j = job({ description: "You'll lead stakeholder management, manage event budgets and deliver projects to tight deadlines." });
    it("predicts questions from the advert and says why", () => {
        const qs = likelyQuestions(j, []);
        expect(qs[0].question).toBe("Tell me about yourself.");
        const topical = qs.filter((q) => q.because);
        expect(topical.map((q) => q.question)).toEqual(expect.arrayContaining([expect.stringMatching(/stakeholder/), expect.stringMatching(/budget/), expect.stringMatching(/priorities/)]));
        expect(qs.some((q) => q.question.includes("Acme"))).toBe(true);
    });
    it("matches her saved answers to the likely questions", () => {
        const qs = likelyQuestions(j, [{ id: "a", question: "Why do you want to work for {company}?", answer: "Because…" }]);
        expect(qs.find((q) => q.question.includes("work for Acme"))!.answer?.id).toBe("a");
    });
    it("builds a format-specific checklist", () => {
        expect(defaultChecklist("video", id).some((c) => /video link/.test(c.text))).toBe(true);
        expect(defaultChecklist("in-person", id).some((c) => /route/.test(c.text))).toBe(true);
    });
    it("lists focus areas from the advert", () => {
        expect(focusAreas(j)).toEqual(expect.arrayContaining(["stakeholder management"]));
    });
    it("writes a valid calendar event with a reminder", () => {
        const iv: Interview = { id: "iv1", jobId: j.id, round: "1st interview", when: "2026-11-12T14:30", durationMins: 45, format: "video", where: "https://meet.example.com/x", interviewers: "Sam, Priya", notes: "", questionsToAsk: "", checklist: [], outcome: "upcoming", feedback: "" };
        const ics = interviewIcs(iv, j, "2026-11-02T10:00:00Z");
        expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/);
        expect(ics).toContain("SUMMARY:Interview: Events Manager — Acme (1st interview)");
        expect(ics).toContain("DESCRIPTION:With: Sam\\, Priya\\nWhere/link: https://meet.example.com/x");
        const start = ics.match(/DTSTART:(\d{8}T\d{6}Z)/)![1];
        const end = ics.match(/DTEND:(\d{8}T\d{6}Z)/)![1];
        const t = (x: string) => Date.UTC(+x.slice(0, 4), +x.slice(4, 6) - 1, +x.slice(6, 8), +x.slice(9, 11), +x.slice(11, 13));
        expect((t(end) - t(start)) / 60_000).toBe(45);
        expect(new Date(t(start)).getTime()).toBe(new Date("2026-11-12T14:30").getTime()); // her local time, stored as UTC
        expect(ics).toContain("TRIGGER:-PT1H");
    });
});

describe("progress", () => {
    const now = new Date("2026-11-05T12:00:00"); // a Thursday
    it("weeks start on Monday", () => {
        expect(weekStart(now).getDay()).toBe(1);
        expect(weekStart(now).getDate()).toBe(2);
    });
    it("counts applications per week, streak and funnel", () => {
        const jobs = [
            job({ status: "applied", appliedAt: "2026-11-03T10:00:00" }),
            job({ status: "applied", appliedAt: "2026-11-04T10:00:00" }),
            job({ status: "interview", appliedAt: "2026-10-28T10:00:00" }),
            job({ status: "applied", appliedAt: "2026-10-29T10:00:00" }),
            job({ status: "offer", appliedAt: "2026-10-20T10:00:00" }),
            job({ status: "applied", appliedAt: "2026-10-21T10:00:00" }),
            job(),
        ];
        const weeks = weeklyApplications(jobs, now, 4);
        expect(weeks.map((w) => w.count)).toEqual([0, 2, 2, 2]);
        expect(streak(weeks, 2)).toBe(3);
        expect(streak(weeks, 3)).toBe(0);
        const f = funnel(jobs, []);
        expect(f).toMatchObject({ saved: 7, applied: 6, interviewed: 2, offers: 1, interviewRate: 33 });
        expect(nudge(f, 2, 5)).toMatch(/3 more applications/);
    });
    it("doesn't show rates on too little data", () => {
        expect(funnel([job({ status: "applied", appliedAt: "2026-11-01" })], []).interviewRate).toBeNull();
    });
});

describe("salary", () => {
    it("reads UK salary formats as annual figures", () => {
        expect(parseSalary("£32k–£38k")).toEqual({ min: 32000, max: 38000 });
        expect(parseSalary("£30,000 - £35,000 per annum")).toEqual({ min: 30000, max: 35000 });
        expect(parseSalary("£15 per hour")).toEqual({ min: 29250, max: 29250 });
        expect(parseSalary("£250 per day")).toEqual({ min: 57500, max: 57500 });
        expect(parseSalary("Competitive")).toBeNull();
        expect(parseSalary("£5 bonus")).toBeNull();
    });
    it("summarises adverts and Adzuna's histogram", () => {
        const st = salaryStats([30000, 32000, 35000, 38000, 40000].map((v) => ({ min: v, max: v })))!;
        expect(st).toMatchObject({ count: 5, median: 35000, p25: 32000, p75: 38000 });
        expect(salaryStats([{ min: 1, max: 1 }])).toBeNull();
        const bands = parseAdzunaHistogram({ histogram: { "20000": 10, "30000": 30, "40000": 10, "50000": 0 } });
        expect(bands).toHaveLength(3);
        expect(statsFromHistogram(bands)!.median).toBe(35000);
        expect(formatGbp(32400)).toBe("£32.5k");
        expect(formatGbp(35000)).toBe("£35k");
    });
});

describe("saving a job from anywhere", () => {
    it("round-trips a payload through a URL-safe string, including emoji and £", () => {
        const p = { url: "https://acme.com/jobs/1", title: "Events Manager 🎉", description: "£35k, Leeds" };
        const enc = encodePayload(p);
        expect(enc).toMatch(/^[A-Za-z0-9_-]+$/);
        expect(decodePayload(enc)).toEqual(p);
        expect(decodePayload("not base64!!")).toBeNull();
    });
    it("reads Android share text and page titles", () => {
        expect(payloadFromShare({ text: "Look at this job https://uk.indeed.com/viewjob?jk=1" })).toEqual({ url: "https://uk.indeed.com/viewjob?jk=1", title: undefined, description: "Look at this job" });
        expect(splitPageTitle("Events Manager - Acme | LinkedIn")).toEqual({ title: "Events Manager", company: "Acme" });
        expect(payloadToListing({ url: "https://www.reed.co.uk/jobs/1", title: "Events Manager at Acme" }, "z")).toMatchObject({ title: "Events Manager", company: "Acme", source: "reed.co.uk" });
    });
});

describe("Word CV", () => {
    it("produces a real .docx containing her CV", async () => {
        const cv = resolveCv({ ...emptyProfile(), name: "Charlie Lindsay", headline: "Events Manager", skills: ["Budgets"], experience: [{ id: "e", role: "Events Manager", company: "NAT", start: "2021", end: "Present", bullets: ["Ran 40 events a year"] }] }, null);
        const buf = await Packer.toBuffer(buildCvDocx(cv, "modern"));
        expect(buf.subarray(0, 2).toString()).toBe("PK"); // a zip, as every .docx is
        const xml = readZipEntry(buf, "word/document.xml");
        expect(xml).toContain("Charlie Lindsay");
        expect(xml).toContain("Ran 40 events a year");
        expect(xml).toContain("EXPERIENCE");
    });
});

/** Read one file out of a zip (enough of the format for a test). */
function readZipEntry(buf: Buffer, name: string): string {
    let i = 0;
    while ((i = buf.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]), i)) !== -1) {
        const method = buf.readUInt16LE(i + 8);
        const size = buf.readUInt32LE(i + 18);
        const nameLen = buf.readUInt16LE(i + 26);
        const extraLen = buf.readUInt16LE(i + 28);
        const entry = buf.subarray(i + 30, i + 30 + nameLen).toString();
        const start = i + 30 + nameLen + extraLen;
        if (entry === name) {
            const data = buf.subarray(start, start + size);
            return (method === 8 ? inflateRawSync(data) : data).toString("utf8");
        }
        i = start;
    }
    throw new Error(`${name} not in zip`);
}
