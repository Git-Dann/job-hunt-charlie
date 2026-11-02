import * as cheerio from "cheerio";
import type { JobListing } from "../types";
import { safeFetch, safeJson } from "./safe-fetch";
import { htmlToText, jobId, toIsoDate } from "./text";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Read open roles from a careers page. Most company careers pages run on an applicant tracking
 * system with a public jobs API, which is far more reliable than reading the page itself.
 */

export type PageKind = "greenhouse" | "lever" | "ashby" | "workable" | "smartrecruiters" | "recruitee" | "generic";

export interface PageTarget {
    kind: PageKind;
    /** The board / company slug for ATS kinds. */
    slug?: string;
    eu?: boolean;
}

export function detectPage(raw: string): PageTarget {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        return { kind: "generic" };
    }
    const host = url.hostname.toLowerCase();
    const seg = url.pathname.split("/").filter(Boolean);
    if (/(^|\.)greenhouse\.io$/.test(host)) {
        const forParam = url.searchParams.get("for");
        if (forParam) return { kind: "greenhouse", slug: forParam };
        const slug = seg[0] === "embed" ? undefined : seg[0];
        if (slug) return { kind: "greenhouse", slug };
    }
    if (host === "jobs.lever.co" && seg[0]) return { kind: "lever", slug: seg[0] };
    if (host === "jobs.eu.lever.co" && seg[0]) return { kind: "lever", slug: seg[0], eu: true };
    if (host === "jobs.ashbyhq.com" && seg[0]) return { kind: "ashby", slug: seg[0] };
    if (host === "apply.workable.com" && seg[0] && seg[0] !== "api") return { kind: "workable", slug: seg[0] };
    if ((host === "careers.smartrecruiters.com" || host === "jobs.smartrecruiters.com") && seg[0]) return { kind: "smartrecruiters", slug: seg[0] };
    const recruitee = host.match(/^([a-z0-9-]+)\.recruitee\.com$/);
    if (recruitee) return { kind: "recruitee", slug: recruitee[1] };
    return { kind: "generic" };
}

// ── ATS parsers (pure) ──────────────────────────────────────────────────────

export const parseGreenhouse = (d: any, company: string): JobListing[] =>
    (d?.jobs ?? []).map((j: any) => ({
        id: jobId("greenhouse", j.absolute_url),
        title: j.title,
        company: j.company_name || company,
        location: j.location?.name,
        url: j.absolute_url,
        source: "Greenhouse",
        description: htmlToText(j.content),
        postedAt: toIsoDate(j.first_published || j.updated_at),
        remote: /remote/i.test(j.location?.name ?? ""),
        tags: (j.departments ?? []).map((x: any) => x.name).filter(Boolean),
    }));

export const parseLever = (d: any, company: string): JobListing[] =>
    (Array.isArray(d) ? d : []).map((j: any) => ({
        id: jobId("lever", j.hostedUrl),
        title: j.text,
        company,
        location: j.categories?.location ?? (j.categories?.allLocations ?? []).join(", "),
        url: j.hostedUrl,
        source: "Lever",
        description: [j.descriptionPlain, ...(j.lists ?? []).map((l: any) => `${l.text}\n${htmlToText(l.content)}`), j.additionalPlain].filter(Boolean).join("\n\n"),
        salary: j.salaryRange ? `${j.salaryRange.currency ?? ""} ${j.salaryRange.min}–${j.salaryRange.max}`.trim() : undefined,
        postedAt: toIsoDate(j.createdAt),
        remote: j.workplaceType === "remote" || /remote/i.test(j.categories?.location ?? ""),
        tags: [j.categories?.team, j.categories?.commitment].filter(Boolean),
    }));

export const parseAshby = (d: any, company: string): JobListing[] =>
    (d?.jobs ?? [])
        .filter((j: any) => j.isListed !== false)
        .map((j: any) => ({
            id: jobId("ashby", j.jobUrl),
            title: j.title,
            company,
            location: [j.location, ...(j.secondaryLocations ?? []).map((l: any) => l.location)].filter(Boolean).join(", "),
            url: j.jobUrl,
            source: "Ashby",
            description: j.descriptionPlain || htmlToText(j.descriptionHtml),
            salary: j.compensation?.compensationTierSummary || undefined,
            postedAt: toIsoDate(j.publishedAt),
            remote: Boolean(j.isRemote),
            tags: [j.department, j.employmentType].filter(Boolean),
        }));

export const parseWorkable = (d: any, slug: string): JobListing[] =>
    (d?.jobs ?? []).map((j: any) => {
        const url = j.url || j.shortlink || `https://apply.workable.com/${slug}/j/${j.shortcode}/`;
        return {
            id: jobId("workable", url),
            title: j.title,
            company: d?.name || slug,
            location: [j.city, j.state, j.country].filter(Boolean).join(", ") || undefined,
            url,
            source: "Workable",
            description: htmlToText(j.description),
            postedAt: toIsoDate(j.published_on || j.created_at),
            remote: Boolean(j.telecommuting),
            tags: [j.department, j.employment_type].filter(Boolean),
        };
    });

export const parseSmartRecruiters = (d: any, slug: string): JobListing[] =>
    (d?.content ?? []).map((j: any) => {
        const url = `https://jobs.smartrecruiters.com/${slug}/${j.id}`;
        return {
            id: jobId("smartrecruiters", url),
            title: j.name,
            company: j.company?.name || slug,
            location: [j.location?.city, j.location?.country?.toUpperCase()].filter(Boolean).join(", ") || undefined,
            url,
            source: "SmartRecruiters",
            postedAt: toIsoDate(j.releasedDate),
            remote: Boolean(j.location?.remote),
            tags: [j.department?.label, j.typeOfEmployment?.label].filter(Boolean),
        };
    });

export const parseRecruitee = (d: any, slug: string): JobListing[] =>
    (d?.offers ?? []).map((j: any) => ({
        id: jobId("recruitee", j.careers_url),
        title: j.title,
        company: j.company_name || slug,
        location: j.location || [j.city, j.country].filter(Boolean).join(", "),
        url: j.careers_url,
        source: "Recruitee",
        description: htmlToText([j.description, j.requirements].filter(Boolean).join("\n")),
        postedAt: toIsoDate(j.published_at || j.created_at),
        remote: Boolean(j.remote),
        tags: [j.department, j.employment_type_code].filter(Boolean),
    }));

// ── Generic pages ───────────────────────────────────────────────────────────

function flattenLd(node: any): any[] {
    if (!node) return [];
    if (Array.isArray(node)) return node.flatMap(flattenLd);
    if (typeof node !== "object") return [];
    const out = [node];
    if (node["@graph"]) out.push(...flattenLd(node["@graph"]));
    if (node.itemListElement) out.push(...flattenLd(node.itemListElement.map((i: any) => i.item ?? i)));
    return out;
}

const isJobPosting = (n: any) => {
    const t = n?.["@type"];
    return t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
};

function ldLocation(n: any): string | undefined {
    const locs = Array.isArray(n.jobLocation) ? n.jobLocation : n.jobLocation ? [n.jobLocation] : [];
    const names = locs
        .map((l: any) => {
            const a = l?.address ?? {};
            return typeof a === "string" ? a : [a.addressLocality, a.addressRegion, a.addressCountry?.name ?? a.addressCountry].filter(Boolean).join(", ");
        })
        .filter(Boolean);
    if (n.jobLocationType === "TELECOMMUTE") names.unshift("Remote");
    return names.join(" · ") || undefined;
}

function ldSalary(n: any): string | undefined {
    const b = n.baseSalary;
    if (!b) return undefined;
    const v = b.value ?? {};
    const cur = b.currency === "GBP" ? "£" : b.currency === "EUR" ? "€" : b.currency === "USD" ? "$" : (b.currency ?? "");
    const unit = v.unitText ? ` per ${String(v.unitText).toLowerCase()}` : "";
    if (v.minValue && v.maxValue) return `${cur}${v.minValue}–${cur}${v.maxValue}${unit}`;
    if (v.value) return `${cur}${v.value}${unit}`;
    return undefined;
}

/** schema.org JobPosting data, which Google requires for Google Jobs, so most job pages carry it. */
export function parseJsonLd(html: string, pageUrl: string): JobListing[] {
    const $ = cheerio.load(html);
    const out: JobListing[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
        let data: any;
        try {
            data = JSON.parse($(el).text().trim());
        } catch {
            return;
        }
        for (const n of flattenLd(data).filter(isJobPosting)) {
            const url = n.url || n.mainEntityOfPage?.["@id"] || pageUrl;
            out.push({
                id: jobId("page", `${url}#${n.title}`),
                title: htmlToText(n.title),
                company: n.hiringOrganization?.name ?? (typeof n.hiringOrganization === "string" ? n.hiringOrganization : ""),
                location: ldLocation(n),
                url: new URL(url, pageUrl).toString(),
                source: new URL(pageUrl).hostname.replace(/^www\./, ""),
                description: htmlToText(n.description),
                salary: ldSalary(n),
                postedAt: toIsoDate(n.datePosted),
                remote: n.jobLocationType === "TELECOMMUTE",
                tags: [n.employmentType].flat().filter(Boolean),
            });
        }
    });
    return out;
}

/** RSS or Atom job feeds (many councils, charities and job boards publish these). */
export function parseFeed(xml: string, feedUrl: string): JobListing[] {
    const $ = cheerio.load(xml, { xmlMode: true });
    const source = new URL(feedUrl).hostname.replace(/^www\./, "");
    const items = $("item").length ? $("item") : $("entry");
    return items
        .map((_, el) => {
            const $el = $(el);
            const link = $el.find("link").first().attr("href") || $el.find("link").first().text().trim() || $el.find("guid").text().trim();
            const title = htmlToText($el.find("title").first().text());
            if (!title || !link) return null;
            return {
                id: jobId("feed", link),
                title,
                company: htmlToText($el.find("author name, author, dc\\:creator").first().text()) || source,
                url: new URL(link, feedUrl).toString(),
                source,
                description: htmlToText($el.find("description, summary, content").first().text()),
                postedAt: toIsoDate($el.find("pubDate, published, updated").first().text().trim()),
            } satisfies JobListing;
        })
        .get()
        .filter(Boolean) as JobListing[];
}

const JOB_HREF = /\/(job|jobs|vacanc(y|ies)|careers?|positions?|openings?|roles?|opportunit(y|ies))\b|[?&](job|vacancy|jid)=|\/j\/[a-z0-9]/i;
const NOT_A_JOB = /^(apply|apply now|view all|see all|all jobs|jobs|careers|search|next|previous|more|read more|learn more|login|sign in|register|home|about|contact|privacy|cookies?)$/i;
const TITLE_HINT =
    /\b(manager|assistant|executive|officer|coordinator|co-ordinator|director|lead|head|analyst|specialist|advisor|adviser|consultant|designer|developer|engineer|administrator|associate|intern|apprentice|representative|supervisor|technician|planner|producer|editor|writer|buyer|accountant|recruiter|nurse|teacher|worker|operative|clerk|agent)\b/i;

/** Last resort: links on the page that look like individual job ads. */
export function parseJobLinks(html: string, pageUrl: string): JobListing[] {
    const $ = cheerio.load(html);
    const base = new URL(pageUrl);
    const seen = new Set<string>();
    const out: JobListing[] = [];
    $("a[href]").each((_, el) => {
        const $a = $(el);
        const text = $a.text().replace(/\s+/g, " ").trim();
        const href = $a.attr("href") ?? "";
        if (!text || text.length < 4 || text.length > 120 || NOT_A_JOB.test(text) || href.startsWith("#") || href.startsWith("mailto:")) return;
        let abs: URL;
        try {
            abs = new URL(href, base);
        } catch {
            return;
        }
        if (abs.toString() === base.toString()) return;
        if (!JOB_HREF.test(abs.pathname + abs.search) && !TITLE_HINT.test(text)) return;
        if (!TITLE_HINT.test(text) && text.split(" ").length < 2) return;
        const key = abs.toString().replace(/#.*$/, "");
        if (seen.has(key)) return;
        seen.add(key);
        const context = $a.closest("li, article, tr, .job, [class*=job], [class*=vacanc]").text().replace(/\s+/g, " ").trim();
        out.push({
            id: jobId("link", key),
            title: text,
            company: base.hostname.replace(/^www\./, ""),
            url: key,
            source: base.hostname.replace(/^www\./, ""),
            description: context && context !== text ? context.slice(0, 400) : undefined,
        });
    });
    return out.slice(0, 150);
}

/** Look for an ATS board embedded in a company's own careers page, so we can use its API. */
export function findEmbeddedBoard(html: string): string | null {
    const patterns = [
        /https?:\/\/(?:job-)?boards\.greenhouse\.io\/(?:embed\/job_board(?:\/js)?\?for=)?[a-z0-9_-]+/i,
        /https?:\/\/jobs\.(?:eu\.)?lever\.co\/[a-z0-9_-]+/i,
        /https?:\/\/jobs\.ashbyhq\.com\/[a-z0-9_.-]+/i,
        /https?:\/\/apply\.workable\.com\/[a-z0-9_-]+/i,
        /https?:\/\/[a-z0-9-]+\.recruitee\.com/i,
        /https?:\/\/(?:careers|jobs)\.smartrecruiters\.com\/[a-z0-9_-]+/i,
    ];
    for (const p of patterns) {
        const m = html.match(p);
        if (m && detectPage(m[0]).kind !== "generic") return m[0];
    }
    return null;
}

export interface PageResult {
    url: string;
    ok: boolean;
    method: string;
    jobs: JobListing[];
    error?: string;
}

async function readAts(target: PageTarget, url: string): Promise<{ method: string; jobs: JobListing[] }> {
    const slug = target.slug!;
    switch (target.kind) {
        case "greenhouse":
            return { method: "Greenhouse API", jobs: parseGreenhouse(await safeJson(`https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`), slug) };
        case "lever":
            return { method: "Lever API", jobs: parseLever(await safeJson(`https://api.${target.eu ? "eu." : ""}lever.co/v0/postings/${slug}?mode=json`), slug) };
        case "ashby":
            return { method: "Ashby API", jobs: parseAshby(await safeJson(`https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`), slug) };
        case "workable":
            return { method: "Workable API", jobs: parseWorkable(await safeJson(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`), slug) };
        case "smartrecruiters":
            return { method: "SmartRecruiters API", jobs: parseSmartRecruiters(await safeJson(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=100`), slug) };
        case "recruitee":
            return { method: "Recruitee API", jobs: parseRecruitee(await safeJson(`https://${slug}.recruitee.com/api/offers/`), slug) };
        default:
            throw new Error(`No reader for ${url}`);
    }
}

export async function readPage(url: string): Promise<PageResult> {
    try {
        const target = detectPage(url);
        if (target.kind !== "generic") return { url, ok: true, ...(await readAts(target, url)) };

        const page = await safeFetch(url);
        if (/xml|rss|atom/i.test(page.contentType) || /^\s*<\?xml|<rss[\s>]|<feed[\s>]/i.test(page.text.slice(0, 500))) {
            return { url, ok: true, method: "RSS feed", jobs: parseFeed(page.text, page.url) };
        }
        const ld = parseJsonLd(page.text, page.url);
        if (ld.length) return { url, ok: true, method: "Job data on the page", jobs: ld };

        const embedded = findEmbeddedBoard(page.text);
        if (embedded) {
            const res = await readAts(detectPage(embedded), embedded);
            return { url, ok: true, method: `${res.method} (found on the page)`, jobs: res.jobs };
        }

        const links = parseJobLinks(page.text, page.url);
        if (links.length) return { url, ok: true, method: "Links on the page", jobs: links };
        return {
            url,
            ok: false,
            method: "—",
            jobs: [],
            error: "No jobs found. The page may load its jobs with JavaScript — try the 'Pull jobs out of a page' prompt, or find the careers site it links to.",
        };
    } catch (e) {
        return { url, ok: false, method: "—", jobs: [], error: e instanceof Error ? e.message : "Couldn't read the page." };
    }
}
