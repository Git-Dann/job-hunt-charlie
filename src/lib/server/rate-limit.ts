/** A small per-IP limiter so the public endpoints can't be used to hammer other sites. */
const hits = new Map<string, number[]>();

export function rateLimited(req: Request, limit = 30, windowMs = 60_000): boolean {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
    const now = Date.now();
    const recent = (hits.get(ip) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > limit;
}
