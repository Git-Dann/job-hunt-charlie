import type { JobListing, SourceKeys } from "../types";
import { safeJson } from "./safe-fetch";
import { htmlToText, jobId, salaryRange, toIsoDate } from "./text";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface SearchQuery {
    keywords: string;
    location: string;
    remoteOnly: boolean;
}

export interface SourceResult {
    source: string;
    label: string;
    ok: boolean;
    jobs: JobListing[];
    error?: string;
    /** Why a source was skipped (e.g. no API key), shown as guidance rather than an error. */
    skipped?: string;
}

export interface SourceDef {
    id: string;
    label: string;
    remoteOnly: boolean;
    region: string;
    needsKey?: keyof SourceKeys;
    run: (q: SearchQuery, keys: SourceKeys) => Promise<JobListing[]>;
}

const enc = encodeURIComponent;

// ── Parsers (pure, tested with fixtures) ────────────────────────────────────

export const parseRemotive = (d: any): JobListing[] =>
    (d?.jobs ?? []).map((j: any) => ({
        id: jobId("remotive", j.url),
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || "Remote",
        url: j.url,
        source: "Remotive",
        description: htmlToText(j.description),
        salary: j.salary || undefined,
        postedAt: toIsoDate(j.publication_date),
        remote: true,
        tags: j.tags?.slice(0, 6),
    }));

export const parseArbeitnow = (d: any): JobListing[] =>
    (d?.data ?? []).map((j: any) => ({
        id: jobId("arbeitnow", j.url),
        title: j.title,
        company: j.company_name,
        location: j.remote ? `Remote${j.location ? ` · ${j.location}` : ""}` : j.location,
        url: j.url,
        source: "Arbeitnow",
        description: htmlToText(j.description),
        postedAt: toIsoDate(j.created_at),
        remote: Boolean(j.remote),
        tags: j.tags?.slice(0, 6),
    }));

export const parseMuse = (d: any): JobListing[] =>
    (d?.results ?? []).map((j: any) => {
        const location = (j.locations ?? []).map((l: any) => l.name).join(", ");
        return {
            id: jobId("themuse", j.refs?.landing_page ?? String(j.id)),
            title: j.name,
            company: j.company?.name ?? "",
            location,
            url: j.refs?.landing_page ?? "",
            source: "The Muse",
            description: htmlToText(j.contents),
            postedAt: toIsoDate(j.publication_date),
            remote: /remote|flexible/i.test(location),
            tags: (j.levels ?? []).map((l: any) => l.name),
        };
    });

export const parseJobicy = (d: any): JobListing[] =>
    (d?.jobs ?? []).map((j: any) => ({
        id: jobId("jobicy", j.url),
        title: htmlToText(j.jobTitle),
        company: j.companyName,
        location: j.jobGeo ? `Remote · ${j.jobGeo}` : "Remote",
        url: j.url,
        source: "Jobicy",
        description: htmlToText(j.jobDescription || j.jobExcerpt),
        salary: salaryRange(j.annualSalaryMin, j.annualSalaryMax, j.salaryCurrency === "GBP" ? "£" : j.salaryCurrency === "EUR" ? "€" : "$"),
        postedAt: toIsoDate(j.pubDate),
        remote: true,
        tags: Array.isArray(j.jobIndustry) ? j.jobIndustry.map((t: string) => htmlToText(t)) : undefined,
    }));

export const parseHimalayas = (d: any): JobListing[] =>
    (d?.jobs ?? []).map((j: any) => {
        const url = j.applicationLink || j.guid;
        const where = (j.locationRestrictions ?? []).join(", ");
        return {
            id: jobId("himalayas", url),
            title: j.title,
            company: j.companyName,
            location: where ? `Remote · ${where}` : "Remote",
            url,
            source: "Himalayas",
            description: htmlToText(j.description || j.excerpt),
            salary: salaryRange(
                j.minSalary,
                j.maxSalary,
                j.currency === "GBP" ? "£" : j.currency === "EUR" ? "€" : "$",
                j.salaryPeriod === "monthly" ? " a month" : j.salaryPeriod === "hourly" ? " an hour" : j.salaryPeriod === "weekly" ? " a week" : "",
            ),
            postedAt: toIsoDate(j.pubDate),
            remote: true,
            tags: j.categories?.slice(0, 6),
        };
    });

export const parseRemoteOk = (d: any): JobListing[] =>
    (Array.isArray(d) ? d : [])
        .filter((j: any) => j && j.position && j.url)
        .map((j: any) => ({
            id: jobId("remoteok", j.url),
            title: j.position,
            company: j.company,
            location: j.location ? `Remote · ${j.location}` : "Remote",
            url: j.url,
            source: "RemoteOK",
            description: htmlToText(j.description),
            salary: salaryRange(j.salary_min, j.salary_max, "$"),
            postedAt: toIsoDate(j.date),
            remote: true,
            tags: j.tags?.slice(0, 6),
        }));

export const parseReed = (d: any): JobListing[] =>
    (d?.results ?? []).map((j: any) => ({
        id: jobId("reed", j.jobUrl),
        title: j.jobTitle,
        company: j.employerName,
        location: j.locationName,
        url: j.jobUrl,
        source: "Reed",
        description: htmlToText(j.jobDescription),
        salary: salaryRange(j.minimumSalary, j.maximumSalary, "£"),
        postedAt: toIsoDate(j.date),
        remote: /remote/i.test(`${j.locationName} ${j.jobTitle}`),
    }));

export const parseAdzuna = (d: any, currency = "£"): JobListing[] =>
    (d?.results ?? []).map((j: any) => ({
        id: jobId("adzuna", j.redirect_url),
        title: htmlToText(j.title),
        company: j.company?.display_name ?? "",
        location: j.location?.display_name,
        url: j.redirect_url,
        source: "Adzuna",
        description: htmlToText(j.description),
        salary: salaryRange(j.salary_min, j.salary_max, currency),
        postedAt: toIsoDate(j.created),
        remote: /remote/i.test(`${j.title} ${j.description}`),
    }));

// ── Sources ─────────────────────────────────────────────────────────────────

export const SOURCES: SourceDef[] = [
    {
        id: "reed",
        label: "Reed",
        remoteOnly: false,
        region: "UK",
        needsKey: "reedApiKey",
        run: async (q, keys) =>
            parseReed(
                await safeJson(
                    `https://www.reed.co.uk/api/1.0/search?keywords=${enc(q.keywords)}&locationName=${enc(q.remoteOnly ? "" : q.location)}&resultsToTake=100`,
                    { authorization: `Basic ${Buffer.from(`${keys.reedApiKey}:`).toString("base64")}` },
                ),
            ),
    },
    {
        id: "adzuna",
        label: "Adzuna",
        remoteOnly: false,
        region: "UK + 15 countries",
        needsKey: "adzunaAppKey",
        run: async (q, keys) => {
            const country = (keys.adzunaCountry || "gb").toLowerCase();
            const what = q.remoteOnly ? `${q.keywords} remote` : q.keywords;
            return parseAdzuna(
                await safeJson(
                    `https://api.adzuna.com/v1/api/jobs/${enc(country)}/search/1?app_id=${enc(keys.adzunaAppId)}&app_key=${enc(keys.adzunaAppKey)}&results_per_page=50&what=${enc(what)}&where=${enc(q.remoteOnly ? "" : q.location)}&sort_by=date&content-type=application/json`,
                ),
                country === "gb" ? "£" : country === "us" ? "$" : "",
            );
        },
    },
    {
        id: "remotive",
        label: "Remotive",
        remoteOnly: true,
        region: "Remote",
        run: async (q) => parseRemotive(await safeJson(`https://remotive.com/api/remote-jobs?search=${enc(q.keywords)}&limit=100`)),
    },
    {
        id: "jobicy",
        label: "Jobicy",
        remoteOnly: true,
        region: "Remote",
        run: async (q) => {
            const tag = q.keywords.split(",")[0].trim();
            const geo = /uk|united kingdom|london|england|scotland|wales/i.test(q.location) ? "&geo=uk" : "";
            return parseJobicy(await safeJson(`https://jobicy.com/api/v2/remote-jobs?count=100${tag ? `&tag=${enc(tag)}` : ""}${geo}`));
        },
    },
    {
        id: "himalayas",
        label: "Himalayas",
        remoteOnly: true,
        region: "Remote",
        run: async (q) => parseHimalayas(await safeJson(`https://himalayas.app/jobs/api/search?q=${enc(q.keywords)}&sort=recent`)),
    },
    {
        id: "remoteok",
        label: "RemoteOK",
        remoteOnly: true,
        region: "Remote",
        run: async (q) => {
            const tag = q.keywords.trim().split(/\s+/)[0]?.toLowerCase();
            return parseRemoteOk(await safeJson(`https://remoteok.com/api${tag ? `?tag=${enc(tag)}` : ""}`));
        },
    },
    {
        id: "arbeitnow",
        label: "Arbeitnow",
        remoteOnly: false,
        region: "Europe",
        run: async () => {
            const pages = await Promise.all([1, 2, 3].map((p) => safeJson(`https://www.arbeitnow.com/api/job-board-api?page=${p}`).catch(() => null)));
            if (pages.every((p) => p === null)) throw new Error("Couldn't reach Arbeitnow.");
            return pages.flatMap((p) => parseArbeitnow(p));
        },
    },
    {
        id: "themuse",
        label: "The Muse",
        remoteOnly: false,
        region: "Global",
        run: async (q) => {
            const loc = q.remoteOnly ? "Flexible / Remote" : q.location;
            const pages = await Promise.all(
                [0, 1, 2, 3, 4].map((p) =>
                    safeJson(`https://www.themuse.com/api/public/jobs?page=${p}&descending=true${loc ? `&location=${enc(loc)}` : ""}`).catch(() => null),
                ),
            );
            if (pages.every((p) => p === null)) throw new Error("Couldn't reach The Muse.");
            return pages.flatMap((p) => parseMuse(p));
        },
    },
];
