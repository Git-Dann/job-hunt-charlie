import { rateLimited } from "@/lib/server/rate-limit";
import { parseAdzunaHistogram, parseSalary, salaryStats, statsFromHistogram } from "@/lib/salary";
import { parseReed } from "@/lib/sources/apis";
import { safeJson } from "@/lib/sources/safe-fetch";
import { withSiteKeys } from "@/lib/server/site-keys";
import type { SourceKeys } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * What does this job pay? Real figures from live UK adverts: Adzuna's salary data (most reliable)
 * or salaries in Reed adverts. Uses the keys set on the site, or her own from Settings.
 */

const enc = encodeURIComponent;

export async function POST(req: Request) {
    if (rateLimited(req, 20)) return Response.json({ error: "Too many requests — wait a moment." }, { status: 429 });
    const body = (await req.json().catch(() => ({}))) as { what?: string; where?: string; keys?: Partial<SourceKeys> };
    const what = (body.what ?? "").trim().slice(0, 120);
    const where = (body.where ?? "").trim().slice(0, 80);
    if (!what) return Response.json({ error: "Type a job title." }, { status: 400 });
    const keys = withSiteKeys(body.keys);
    const notes: string[] = [];

    if (keys.adzunaAppId && keys.adzunaAppKey) {
        const country = (keys.adzunaCountry || "gb").toLowerCase();
        const base = `https://api.adzuna.com/v1/api/jobs/${enc(country)}`;
        const auth = `app_id=${enc(keys.adzunaAppId)}&app_key=${enc(keys.adzunaAppKey)}`;
        const place = where ? `&where=${enc(where)}` : "";
        try {
            const [hist, search] = await Promise.all([
                safeJson(`${base}/histogram?${auth}&what=${enc(what)}${place}&content-type=application/json`),
                safeJson<{ mean?: number; count?: number }>(`${base}/search/1?${auth}&what=${enc(what)}${place}&results_per_page=1&content-type=application/json`),
            ]);
            const bands = parseAdzunaHistogram(hist);
            const stats = statsFromHistogram(bands);
            if (stats) {
                return Response.json({
                    source: "Adzuna",
                    sourceNote: `Based on ${search.count?.toLocaleString("en-GB") ?? "current"} live adverts that show a salary.`,
                    stats,
                    mean: search.mean ? Math.round(search.mean) : undefined,
                    bands,
                });
            }
            notes.push("Adzuna has too few adverts with salaries for that search.");
        } catch (e) {
            notes.push(`Adzuna: ${e instanceof Error ? e.message : "didn't answer"}`);
        }
    }

    if (keys.reedApiKey) {
        try {
            const data = await safeJson(`https://www.reed.co.uk/api/1.0/search?keywords=${enc(what)}&locationName=${enc(where)}&resultsToTake=100`, {
                authorization: `Basic ${Buffer.from(`${keys.reedApiKey}:`).toString("base64")}`,
            });
            const ranges = parseReed(data)
                .map((j) => parseSalary(j.salary))
                .filter((r): r is { min: number; max: number } => r !== null);
            const stats = salaryStats(ranges);
            if (stats) return Response.json({ source: "Reed", sourceNote: `Based on ${stats.count} current Reed adverts that show a salary.`, stats });
            notes.push("Reed has too few adverts with salaries for that search.");
        } catch (e) {
            notes.push(`Reed: ${e instanceof Error ? e.message : "didn't answer"}`);
        }
    }

    if (!keys.adzunaAppKey && !keys.reedApiKey)
        return Response.json({ error: "Salary data needs a free Adzuna or Reed key (see Settings).", needsKey: true }, { status: 400 });
    return Response.json({ error: notes.join(" ") || "No salary data found. Try a broader job title or leave the location blank." }, { status: 404 });
}
