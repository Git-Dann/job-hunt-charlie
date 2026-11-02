import { rateLimited } from "@/lib/server/rate-limit";
import { parseCompanyProfile, parseCompanySearch } from "@/lib/sources/companies-house";
import { FetchError, safeJson } from "@/lib/sources/safe-fetch";

export const runtime = "nodejs";

/**
 * Live UK company record from Companies House (the official public register).
 * Key: her own (x-ch-key header, from Settings) or the site owner's COMPANIES_HOUSE_API_KEY.
 *   GET /api/company?q=acme          → matches
 *   GET /api/company?number=01234567 → profile
 */

const API = "https://api.company-information.service.gov.uk";

export async function GET(req: Request) {
    if (rateLimited(req, 30)) return Response.json({ error: "Too many requests — wait a moment." }, { status: 429 });
    const key = req.headers.get("x-ch-key")?.trim() || process.env.COMPANIES_HOUSE_API_KEY || "";
    if (!key) return Response.json({ error: "Add a free Companies House key in Settings to check companies.", needsKey: true }, { status: 400 });
    const headers = { authorization: `Basic ${Buffer.from(`${key}:`).toString("base64")}` };
    const url = new URL(req.url);
    const q = url.searchParams.get("q")?.trim().slice(0, 100);
    const number = url.searchParams.get("number")?.trim().toUpperCase();
    try {
        if (number) {
            if (!/^[A-Z0-9]{8}$/.test(number)) return Response.json({ error: "That isn't a valid company number." }, { status: 400 });
            const [profile, officers] = await Promise.all([
                safeJson(`${API}/company/${number}`, headers),
                safeJson(`${API}/company/${number}/officers?items_per_page=1`, headers).catch(() => null),
            ]);
            return Response.json({ profile: parseCompanyProfile(profile, officers, new Date()) });
        }
        if (!q) return Response.json({ error: "Type a company name." }, { status: 400 });
        const res = await safeJson(`${API}/search/companies?q=${encodeURIComponent(q)}&items_per_page=8`, headers);
        return Response.json({ matches: parseCompanySearch(res) });
    } catch (e) {
        const status = e instanceof FetchError ? e.status : undefined;
        if (status === 401 || status === 403) return Response.json({ error: "Companies House didn't accept that key. Check it in Settings." }, { status: 400 });
        if (status === 404) return Response.json({ error: "Companies House has no record with that number." }, { status: 404 });
        return Response.json({ error: e instanceof Error ? e.message : "Companies House didn't answer." }, { status: 502 });
    }
}
