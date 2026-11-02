/** Turn job-ad HTML into readable plain text, keeping paragraph and bullet breaks. */
export function htmlToText(html: string | undefined | null): string {
    if (!html) return "";
    let s = html;
    // Some APIs (Greenhouse) send the HTML itself entity-escaped.
    if (/&lt;\/?[a-z]/i.test(s) && !/<\/?[a-z][^>]*>/i.test(s)) s = decodeEntities(s);
    s = s
        .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, "")
        .replace(/<li[^>]*>/gi, "\n• ")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|h[1-6]|li|ul|ol|tr|section)>/gi, "\n")
        .replace(/<[^>]+>/g, "");
    return decodeEntities(s)
        .replace(/[ \t ]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/\n\n•/g, "\n•")
        .trim();
}

export function decodeEntities(s: string): string {
    return s
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&#x27;|&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
        .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

/** Short, stable id for a job from its url (and source), so a job found twice is the same job. */
export function jobId(source: string, url: string): string {
    const key = `${source}|${url.replace(/[?#].*$/, "").replace(/\/$/, "")}`;
    let h = 2166136261;
    for (let i = 0; i < key.length; i++) {
        h ^= key.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return `j${(h >>> 0).toString(36)}`;
}

export function salaryRange(min?: number | null, max?: number | null, currency = "£", period = ""): string | undefined {
    const fmt = (n: number) => (n >= 1000 ? `${currency}${Math.round(n / 1000)}k` : `${currency}${n}`);
    if (min && max && min !== max) return `${fmt(min)}–${fmt(max)}${period}`;
    if (min || max) return `${fmt((min || max)!)}${period}`;
    return undefined;
}

export function toIsoDate(v: unknown): string | undefined {
    if (v === null || v === undefined || v === "") return undefined;
    if (typeof v === "number") return new Date(v < 1e12 ? v * 1000 : v).toISOString();
    const s = String(v);
    const uk = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (uk) return new Date(`${uk[3]}-${uk[2]}-${uk[1]}T00:00:00Z`).toISOString();
    const d = new Date(s);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
}
