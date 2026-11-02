/**
 * Pulls the words and phrases a job advert keeps asking for, and checks which of them a CV
 * already covers. No AI: frequency, position and a list of common skill phrases.
 */

const STOP = new Set(
    `a about above after again against all also am an and any are as at be because been before being below between both but by can could did do does doing down during each etc few for from further had has have having he her here hers him his how i if in into is it its itself just let me more most must my no nor not of off on once only or other our ours out over own per please same she should so some such than that the their theirs them then there these they this those through to too under until up very was we were what when where which while who whom why will with within without would you your yours yourself role roles job jobs team teams work working company candidate candidates ideal looking opportunity apply application including include includes across ensure ability able strong excellent good great new well within year years experience experienced day days week weeks time full part plus based join us join our you'll we're we'll you're it's who'll looking great etc e.g i.e like make making help helping support supporting provide providing using use used get getting take taking within want wants need needs required requirements requirement desirable essential preferred responsibilities responsibility key skills skill knowledge understanding level high highly relevant related similar various range other others one two three salary benefits benefit holiday pension bonus hours location remote hybrid office uk london end start own owning deliver delivering manage managing lead leading strong senior junior mid graduate entry`.split(
        /\s+/,
    ),
);

/** Multi-word skills worth recognising as one phrase. Lower case. */
export const KNOWN_PHRASES = [
    "project management", "stakeholder management", "account management", "customer service", "customer success",
    "social media", "content marketing", "digital marketing", "email marketing", "event management", "data analysis",
    "data entry", "microsoft office", "microsoft excel", "google analytics", "google ads", "power bi", "product management",
    "business development", "relationship management", "time management", "problem solving", "attention to detail",
    "written communication", "verbal communication", "team leadership", "people management", "line management",
    "budget management", "change management", "risk management", "supply chain", "public relations", "copy writing",
    "copywriting", "user research", "user experience", "graphic design", "adobe creative", "human resources",
    "recruitment", "talent acquisition", "sales pipeline", "lead generation", "crm", "salesforce", "hubspot", "seo",
    "ppc", "excel", "sql", "python", "figma", "canva", "agile", "scrum", "jira", "notion", "budgeting", "forecasting",
    "negotiation", "presentation skills", "report writing", "safeguarding", "first aid", "driving licence",
    "full driving licence", "cscs", "health and safety", "compliance", "gdpr", "bookkeeping", "xero", "sage",
    "payroll", "accounts payable", "accounts receivable", "event planning", "operations management", "logistics",
    "procurement", "merchandising", "visual merchandising", "retail", "hospitality", "teaching", "coaching", "mentoring",
];

const normalise = (s: string) =>
    s
        .toLowerCase()
        .replace(/[’']/g, "")
        .replace(/[^a-z0-9+#.\s/-]/g, " ")
        // A full stop ends a sentence unless it sits inside a word (node.js, e.g.).
        .replace(/\.(?=\s|$)/g, " ")
        .replace(/(^|\s)[-/]+(?=\s|$)/g, " ")
        .replace(/\s+/g, " ")
        .trim();

/** Light stemming so "managing", "managed" and "manages" all match "manage". */
export function stem(word: string): string {
    let w = word.toLowerCase();
    for (const suffix of ["ingly", "ings", "ing", "edly", "ed", "ies", "es", "s"]) {
        if (w.length > suffix.length + 3 && w.endsWith(suffix)) {
            w = w.slice(0, -suffix.length);
            if (suffix === "ies") w += "y";
            break;
        }
    }
    return w;
}

export interface Keyword {
    term: string;
    weight: number;
}

/** The terms an advert leans on most, strongest first. */
export function extractKeywords(text: string, limit = 30): Keyword[] {
    const clean = normalise(text);
    if (!clean) return [];
    const scores = new Map<string, number>();
    const bump = (term: string, by: number) => scores.set(term, (scores.get(term) ?? 0) + by);

    for (const phrase of KNOWN_PHRASES) {
        const re = new RegExp(`(^|\\s)${phrase.replace(/[.+#]/g, "\\$&")}(?=\\s|$)`, "g");
        const hits = clean.match(re)?.length ?? 0;
        if (hits) bump(phrase, 3 + hits * 2);
    }

    const words = clean.split(" ").filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w));
    words.forEach((w) => bump(w, 1));
    for (let i = 0; i < words.length - 1; i++) {
        const pair = `${words[i]} ${words[i + 1]}`;
        bump(pair, 0.6);
    }

    // Capitalised tools and names in the original text ("Salesforce", "HubSpot") get a nudge.
    for (const m of text.matchAll(/\b[A-Z][a-zA-Z0-9+#]{2,}\b/g)) {
        const w = m[0].toLowerCase();
        if (!STOP.has(w)) bump(w, 0.5);
    }

    const ranked = [...scores.entries()]
        .filter(([term, score]) => (term.includes(" ") ? score >= 1.8 : score >= 2))
        .sort((a, b) => b[1] - a[1]);

    // Drop a single word if a stronger phrase already contains it.
    const picked: Keyword[] = [];
    for (const [term, weight] of ranked) {
        if (picked.length >= limit) break;
        if (!term.includes(" ") && picked.some((p) => p.term.includes(" ") && p.term.split(" ").includes(term))) continue;
        picked.push({ term, weight: Math.round(weight * 10) / 10 });
    }
    return picked;
}

/** Does `text` mention `term`, allowing for simple word-ending differences? */
export function mentions(text: string, term: string): boolean {
    const hay = ` ${normalise(text).split(" ").map(stem).join(" ")} `;
    const needle = normalise(term).split(" ").map(stem).join(" ");
    return needle.length > 0 && hay.includes(` ${needle} `);
}

export interface MatchResult {
    score: number;
    matched: Keyword[];
    missing: Keyword[];
}

/** How much of the advert's language a CV already covers, weighted by how hard the advert leans on it. */
export function matchKeywords(jobText: string, cvText: string, limit = 25): MatchResult {
    const keywords = extractKeywords(jobText, limit);
    const matched: Keyword[] = [];
    const missing: Keyword[] = [];
    for (const k of keywords) (mentions(cvText, k.term) ? matched : missing).push(k);
    const total = keywords.reduce((s, k) => s + k.weight, 0);
    const got = matched.reduce((s, k) => s + k.weight, 0);
    return { score: total ? Math.round((got / total) * 100) : 0, matched, missing };
}

/** Order items so the ones mentioning the advert's keywords come first (stable for ties). */
export function rankByRelevance(items: string[], keywords: Keyword[]): string[] {
    const scoreOf = (item: string) => keywords.reduce((s, k) => (mentions(item, k.term) ? s + k.weight : s), 0);
    return items
        .map((item, i) => ({ item, i, s: scoreOf(item) }))
        .sort((a, b) => b.s - a.s || a.i - b.i)
        .map((x) => x.item);
}

/** Does a listing match every keyword someone typed? Used to filter scraped results. */
export function matchesQuery(text: string, query: string): boolean {
    const terms = query
        .split(/,|\s+OR\s+/i)
        .map((t) => t.trim())
        .filter(Boolean);
    if (!terms.length) return true;
    const hay = normalise(text);
    // Comma or OR separated: any one of them is enough.
    return terms.some((t) => {
        const words = normalise(t).split(" ").filter(Boolean);
        return words.every((w) => hay.includes(w));
    });
}
