/** Salary figures from real job adverts. No AI: parsing and simple statistics. */

const HOURS_PER_YEAR = 37.5 * 52;
const DAYS_PER_YEAR = 230;

/** "£32k–£38k", "£30,000 - £35,000 per annum", "£15.50 per hour", "£250/day" → annual range in £. */
export function parseSalary(text: string | undefined): { min: number; max: number } | null {
    if (!text) return null;
    const s = text.toLowerCase().replace(/,/g, "");
    if (!/£|gbp|\d{2}/.test(s)) return null;
    const nums = [...s.matchAll(/(\d+(?:\.\d+)?)\s*(k)?/g)].map((m) => Number(m[1]) * (m[2] ? 1000 : 1)).filter((n) => n > 0);
    if (!nums.length) return null;
    let mult = 1;
    if (/hour|hr|p\/h|ph\b/.test(s)) mult = HOURS_PER_YEAR;
    else if (/day|daily|p\/d/.test(s)) mult = DAYS_PER_YEAR;
    else if (/month|pcm|p\/m/.test(s)) mult = 12;
    const vals = nums.slice(0, 2).map((n) => n * mult);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min < 8000 || max > 500_000) return null; // not a plausible UK annual salary
    return { min, max };
}

export interface SalaryStats {
    count: number;
    p25: number;
    median: number;
    p75: number;
    min: number;
    max: number;
}

const quantile = (sorted: number[], q: number) => {
    const i = (sorted.length - 1) * q;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return Math.round(sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo));
};

/** Stats over each advert's midpoint. Null when there are too few adverts to say anything. */
export function salaryStats(ranges: { min: number; max: number }[]): SalaryStats | null {
    const mids = ranges.map((r) => (r.min + r.max) / 2).sort((a, b) => a - b);
    if (mids.length < 3) return null;
    return { count: mids.length, p25: quantile(mids, 0.25), median: quantile(mids, 0.5), p75: quantile(mids, 0.75), min: Math.round(mids[0]), max: Math.round(mids[mids.length - 1]) };
}

/** Adzuna's histogram: { histogram: { "20000": 12, "30000": 40, … } } → bands. */
export function parseAdzunaHistogram(d: unknown): { from: number; count: number }[] {
    const h = (d as { histogram?: Record<string, number> })?.histogram ?? {};
    return Object.entries(h)
        .map(([k, v]) => ({ from: Number(k), count: Number(v) }))
        .filter((b) => Number.isFinite(b.from) && b.count > 0)
        .sort((a, b) => a.from - b.from);
}

/** Median and quartiles from histogram bands (each band treated as its midpoint). */
export function statsFromHistogram(bands: { from: number; count: number }[]): SalaryStats | null {
    if (!bands.length) return null;
    const width = bands.length > 1 ? bands[1].from - bands[0].from : 10_000;
    const values: number[] = [];
    for (const b of bands) for (let i = 0; i < Math.min(b.count, 5000); i++) values.push(b.from + width / 2);
    return salaryStats(values.map((v) => ({ min: v, max: v })));
}

/** £32,400 → "£32.5k"; rounds to the nearest £500. */
export function formatGbp(n: number): string {
    const k = Math.round(n / 500) / 2;
    return `£${Number.isInteger(k) ? k : k.toFixed(1)}k`;
}
