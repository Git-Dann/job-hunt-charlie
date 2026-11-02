import type { JobListing } from "./types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#\s]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Does a listing fit what she typed? Comma or "OR" separates alternatives ("events, marketing").
 * Each alternative must appear in the title or tags word for word, or as a whole phrase in the
 * description — matching single words in a long description would let "manager" match everything.
 */
export function listingMatches(job: JobListing, query: string): boolean {
    const alts = query
        .split(/,|\s+OR\s+/i)
        .map((t) => norm(t))
        .filter(Boolean);
    if (!alts.length) return true;
    const head = ` ${norm(`${job.title} ${(job.tags ?? []).join(" ")}`)} `;
    const body = ` ${norm(job.description ?? "")} `;
    return alts.some((alt) => {
        const words = alt.split(" ");
        if (words.every((w) => head.includes(w))) return true;
        // Only a phrase counts in the description: a single word like "lead" appears in almost every advert.
        return words.length > 1 && body.includes(` ${alt} `);
    });
}

const UK_WORDS = ["uk", "united kingdom", "england", "scotland", "wales", "northern ireland", "gb", "great britain"];

export function listingInLocation(job: JobListing, location: string): boolean {
    const where = norm(location);
    if (!where) return true;
    const loc = ` ${norm(job.location ?? "")} `;
    if (!loc.trim()) return true; // unknown location: keep rather than hide
    if (job.remote && /remote|anywhere|worldwide/.test(loc) && !/\b(us|usa|united states|americas|canada)\b only/.test(loc)) return true;
    const words = where.split(" ").filter((w) => w.length > 2);
    if (words.some((w) => loc.includes(` ${w} `) || loc.includes(w))) return true;
    // A UK town search should still keep UK-wide or "Remote · UK" roles.
    return UK_WORDS.some((w) => loc.includes(` ${w} `));
}

export function dedupe(jobs: JobListing[]): JobListing[] {
    const seen = new Set<string>();
    const out: JobListing[] = [];
    for (const j of jobs) {
        const key = `${norm(j.title)}|${norm(j.company)}`;
        if (seen.has(j.id) || seen.has(key)) continue;
        seen.add(j.id);
        seen.add(key);
        out.push(j);
    }
    return out;
}

export function sortByDate(jobs: JobListing[]): JobListing[] {
    return [...jobs].sort((a, b) => (b.postedAt ?? "").localeCompare(a.postedAt ?? ""));
}
