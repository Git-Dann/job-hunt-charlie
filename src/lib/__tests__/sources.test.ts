import { describe, expect, it } from "vitest";
import { listingInLocation, listingMatches } from "../search-filter";
import { parseAdzuna, parseRemoteOk, parseRemotive, parseReed } from "../sources/apis";
import { detectPage, findEmbeddedBoard, parseAshby, parseFeed, parseGreenhouse, parseJobLinks, parseJsonLd, parseLever } from "../sources/pages";
import { assertPublicUrl } from "../sources/safe-fetch";
import { htmlToText, toIsoDate } from "../sources/text";

describe("job API parsers", () => {
    it("Reed", () => {
        const [j] = parseReed({ results: [{ jobId: 1, employerName: "Acme", jobTitle: "Events Manager", locationName: "Manchester", minimumSalary: 32000, maximumSalary: 38000, date: "14/10/2026", jobDescription: "Run &amp; plan events", jobUrl: "https://www.reed.co.uk/jobs/1" }] });
        expect(j).toMatchObject({ title: "Events Manager", company: "Acme", salary: "£32k–£38k", description: "Run & plan events", source: "Reed" });
        expect(j.postedAt).toBe("2026-10-14T00:00:00.000Z");
    });
    it("Adzuna", () => {
        const [j] = parseAdzuna({ results: [{ title: "<strong>Marketing</strong> Exec", company: { display_name: "Beta" }, location: { display_name: "Leeds" }, redirect_url: "https://adzuna.co.uk/x", salary_min: 28000, created: "2026-10-01T00:00:00Z", description: "d" }] });
        expect(j).toMatchObject({ title: "Marketing Exec", company: "Beta", location: "Leeds", salary: "£28k" });
    });
    it("Remotive", () => {
        const [j] = parseRemotive({ jobs: [{ url: "https://remotive.com/1", title: "Copywriter", company_name: "Gamma", candidate_required_location: "UK", publication_date: "2026-10-02T10:00:00", description: "<p>Hi</p><ul><li>Write</li></ul>" }] });
        expect(j.remote).toBe(true);
        expect(j.description).toBe("Hi\n• Write");
    });
    it("RemoteOK skips the legal notice row", () => {
        const jobs = parseRemoteOk([{ legal: "terms" }, { position: "Designer", company: "D", url: "https://remoteok.com/1", date: "2026-10-01" }]);
        expect(jobs).toHaveLength(1);
    });
});

describe("careers pages", () => {
    it("detects applicant tracking systems from a link", () => {
        expect(detectPage("https://boards.greenhouse.io/monzo")).toEqual({ kind: "greenhouse", slug: "monzo" });
        expect(detectPage("https://job-boards.greenhouse.io/monzo/jobs/123")).toEqual({ kind: "greenhouse", slug: "monzo" });
        expect(detectPage("https://boards.greenhouse.io/embed/job_board?for=acme")).toEqual({ kind: "greenhouse", slug: "acme" });
        expect(detectPage("https://jobs.eu.lever.co/kraken/abc")).toEqual({ kind: "lever", slug: "kraken", eu: true });
        expect(detectPage("https://jobs.ashbyhq.com/deliveroo")).toEqual({ kind: "ashby", slug: "deliveroo" });
        expect(detectPage("https://apply.workable.com/acme/")).toEqual({ kind: "workable", slug: "acme" });
        expect(detectPage("https://acme.recruitee.com/o/x")).toEqual({ kind: "recruitee", slug: "acme" });
        expect(detectPage("https://example.com/careers").kind).toBe("generic");
    });

    it("finds a board embedded in a company's own careers page", () => {
        expect(findEmbeddedBoard(`<script src="https://boards.greenhouse.io/embed/job_board/js?for=acme"></script>`)).toContain("greenhouse");
        expect(findEmbeddedBoard(`<a href="https://jobs.lever.co/acme">Jobs</a>`)).toBe("https://jobs.lever.co/acme");
        expect(findEmbeddedBoard("<p>no board</p>")).toBeNull();
    });

    it("parses Greenhouse (escaped HTML), Lever and Ashby", () => {
        const gh = parseGreenhouse({ jobs: [{ title: "PM", absolute_url: "https://x/1", location: { name: "London" }, content: "&lt;p&gt;Hello &amp;amp; welcome&lt;/p&gt;", updated_at: "2026-10-01T00:00:00Z" }] }, "acme");
        expect(gh[0].description).toBe("Hello & welcome");
        const lv = parseLever([{ text: "Designer", hostedUrl: "https://jobs.lever.co/a/1", categories: { location: "Remote, UK", team: "Brand" }, createdAt: 1790000000000, descriptionPlain: "Design" }], "a");
        expect(lv[0]).toMatchObject({ title: "Designer", remote: true, tags: ["Brand"] });
        const ab = parseAshby({ jobs: [{ title: "Ops", jobUrl: "https://jobs.ashbyhq.com/a/1", location: "Manchester", isListed: true, isRemote: false }, { title: "Hidden", jobUrl: "u", isListed: false }] }, "a");
        expect(ab).toHaveLength(1);
    });

    it("reads schema.org JobPosting from a page, including @graph", () => {
        const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"X"},{"@type":"JobPosting","title":"Events Lead","url":"/jobs/7","hiringOrganization":{"name":"Acme"},"jobLocation":{"address":{"addressLocality":"Leeds","addressCountry":"GB"}},"baseSalary":{"currency":"GBP","value":{"minValue":30000,"maxValue":35000,"unitText":"YEAR"}},"datePosted":"2026-10-01","description":"<p>Run events</p>"}]}</script>`;
        const [j] = parseJsonLd(html, "https://acme.com/careers");
        expect(j).toMatchObject({ title: "Events Lead", company: "Acme", location: "Leeds, GB", url: "https://acme.com/jobs/7", salary: "£30000–£35000 per year" });
    });

    it("reads RSS feeds", () => {
        const xml = `<?xml version="1.0"?><rss><channel><item><title>Admin Officer</title><link>https://council.gov.uk/j/1</link><description>&lt;p&gt;Hi&lt;/p&gt;</description><pubDate>Wed, 01 Oct 2026 09:00:00 GMT</pubDate></item></channel></rss>`;
        const [j] = parseFeed(xml, "https://council.gov.uk/feed");
        expect(j).toMatchObject({ title: "Admin Officer", url: "https://council.gov.uk/j/1", description: "Hi" });
    });

    it("falls back to job-looking links and ignores navigation", () => {
        const html = `<a href="/about">About</a><a href="/jobs">Jobs</a><a href="/jobs/events-manager-123">Events Manager</a><a href="/vacancies/42">Finance Assistant (Part time)</a><a href="#top">Apply now</a>`;
        const jobs = parseJobLinks(html, "https://acme.org/careers");
        expect(jobs.map((j) => j.title)).toEqual(["Events Manager", "Finance Assistant (Part time)"]);
        expect(jobs[0].url).toBe("https://acme.org/jobs/events-manager-123");
    });
});

describe("filtering", () => {
    const job = { id: "1", title: "Senior Events Manager", company: "A", url: "u", source: "s", location: "Manchester, UK", description: "You'll lead our social media strategy." };
    it("matches title words, comma alternatives and description phrases", () => {
        expect(listingMatches(job, "events manager")).toBe(true);
        expect(listingMatches(job, "marketing, events")).toBe(true);
        expect(listingMatches(job, "social media")).toBe(true);
        expect(listingMatches(job, "accountant")).toBe(false);
        // A lone word buried in the description must not match: "lead" would match every advert.
        expect(listingMatches(job, "lead")).toBe(false);
    });
    it("keeps local, UK-wide and unknown locations", () => {
        expect(listingInLocation(job, "Manchester")).toBe(true);
        expect(listingInLocation({ ...job, location: "London" }, "Manchester")).toBe(false);
        expect(listingInLocation({ ...job, location: "United Kingdom" }, "Manchester")).toBe(true);
        expect(listingInLocation({ ...job, location: undefined }, "Manchester")).toBe(true);
    });
});

describe("safety", () => {
    it("refuses private and local addresses", async () => {
        for (const u of ["http://127.0.0.1/", "http://localhost:3000", "http://10.0.0.5/", "http://169.254.169.254/latest", "http://[::1]/", "file:///etc/passwd", "http://user:pw@example.com"]) {
            await expect(assertPublicUrl(u)).rejects.toThrow();
        }
    });
});

describe("text helpers", () => {
    it("turns HTML into readable text", () => {
        expect(htmlToText("<h2>Role</h2><p>Do&nbsp;things</p><script>x()</script>")).toBe("Role\nDo things");
    });
    it("reads UK dates and unix seconds", () => {
        expect(toIsoDate("01/02/2026")).toBe("2026-02-01T00:00:00.000Z");
        expect(toIsoDate(1790000000)).toBe(new Date(1790000000 * 1000).toISOString());
    });
});
