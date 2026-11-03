import { SOURCES, type SourceResult } from "@/lib/sources/apis";
import { dedupe, listingInLocation, listingMatches, sortByDate } from "@/lib/search-filter";
import { rateLimited } from "@/lib/server/rate-limit";
import { withSiteKeys } from "@/lib/server/site-keys";
import type { SourceKeys } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

interface Body {
    keywords?: string;
    location?: string;
    remoteOnly?: boolean;
    sources?: string[];
    keys?: Partial<SourceKeys>;
}

export async function POST(req: Request) {
    if (rateLimited(req, 20)) return Response.json({ error: "Too many searches in a minute — wait a moment and try again." }, { status: 429 });
    const body = (await req.json().catch(() => ({}))) as Body;
    const keywords = (body.keywords ?? "").trim().slice(0, 200);
    if (!keywords) return Response.json({ error: "Type what you're looking for first." }, { status: 400 });
    const q = { keywords, location: (body.location ?? "").trim().slice(0, 100), remoteOnly: Boolean(body.remoteOnly) };
    // Her own key from Settings if she added one, otherwise the key set on the site.
    const keys = withSiteKeys(body.keys);
    const wanted = new Set(body.sources?.length ? body.sources : SOURCES.map((s) => s.id));

    const results: SourceResult[] = await Promise.all(
        SOURCES.filter((s) => wanted.has(s.id)).map(async (s): Promise<SourceResult> => {
            if (s.needsKey && !keys[s.needsKey]) return { source: s.id, label: s.label, ok: true, jobs: [], skipped: "Needs a free API key (see Settings)." };
            if (s.id === "adzuna" && !keys.adzunaAppId) return { source: s.id, label: s.label, ok: true, jobs: [], skipped: "Needs an Adzuna app ID (see Settings)." };
            try {
                let jobs = (await s.run(q, keys)).filter((j) => j.title && j.url);
                jobs = jobs.filter((j) => listingMatches(j, q.keywords));
                if (q.remoteOnly) jobs = jobs.filter((j) => j.remote || /remote/i.test(j.location ?? ""));
                else if (q.location && !s.remoteOnly) jobs = jobs.filter((j) => listingInLocation(j, q.location));
                return { source: s.id, label: s.label, ok: true, jobs: jobs.slice(0, 60) };
            } catch (e) {
                return { source: s.id, label: s.label, ok: false, jobs: [], error: e instanceof Error ? e.message : "Couldn't reach this source." };
            }
        }),
    );

    const jobs = sortByDate(dedupe(results.flatMap((r) => r.jobs)));
    return Response.json({
        jobs,
        sources: results.map(({ jobs: j, ...rest }) => ({ ...rest, count: j.length })),
    });
}
