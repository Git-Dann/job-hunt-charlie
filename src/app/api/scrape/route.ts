import { readPage } from "@/lib/sources/pages";
import { dedupe } from "@/lib/search-filter";
import { rateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
    if (rateLimited(req, 20)) return Response.json({ error: "Too many checks in a minute — wait a moment and try again." }, { status: 429 });
    const body = (await req.json().catch(() => ({}))) as { urls?: string[] };
    const urls = [...new Set((body.urls ?? []).map((u) => u.trim()).filter(Boolean))]
        .map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`))
        .slice(0, 10);
    if (!urls.length) return Response.json({ error: "Add at least one link." }, { status: 400 });
    const pages = await Promise.all(urls.map((u) => readPage(u)));
    return Response.json({
        jobs: dedupe(pages.flatMap((p) => p.jobs)),
        pages: pages.map(({ jobs, ...rest }) => ({ ...rest, count: jobs.length })),
    });
}
