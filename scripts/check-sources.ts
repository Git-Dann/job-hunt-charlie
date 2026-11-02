/**
 * Calls every real job source with the app's own code and prints what comes back.
 * Run: npx tsx scripts/check-sources.ts   (needs normal internet access)
 * Exits non-zero if a source that needs no key returns nothing or errors.
 */
import { SOURCES } from "../src/lib/sources/apis";
import { safeJson } from "../src/lib/sources/safe-fetch";
import { readPage } from "../src/lib/sources/pages";
import type { SourceKeys } from "../src/lib/types";

const keys: SourceKeys = {
    reedApiKey: process.env.REED_API_KEY ?? "",
    adzunaAppId: process.env.ADZUNA_APP_ID ?? "",
    adzunaAppKey: process.env.ADZUNA_APP_KEY ?? "",
    adzunaCountry: "gb",
};

const RAW: Record<string, string> = {
    remotive: "https://remotive.com/api/remote-jobs?search=marketing&limit=2",
    jobicy: "https://jobicy.com/api/v2/remote-jobs?count=2&tag=marketing",
    himalayas: "https://himalayas.app/jobs/api/search?q=marketing&sort=recent",
    "himalayas-list": "https://himalayas.app/jobs/api?limit=2",
    remoteok: "https://remoteok.com/api?tag=marketing",
    arbeitnow: "https://www.arbeitnow.com/api/job-board-api?page=1",
    themuse: "https://www.themuse.com/api/public/jobs?page=0&descending=true",
};

/** Several real companies per system: any one returning jobs proves the reader works. */
const PAGES: Record<string, string[]> = {
    Greenhouse: ["https://boards.greenhouse.io/gitlab", "https://boards.greenhouse.io/monzo", "https://job-boards.greenhouse.io/deliveroo"],
    Lever: ["https://jobs.lever.co/spotify", "https://jobs.lever.co/plaid", "https://jobs.lever.co/palantir", "https://jobs.eu.lever.co/octoenergy", "https://jobs.lever.co/attentive"],
    Ashby: ["https://jobs.ashbyhq.com/linear", "https://jobs.ashbyhq.com/openai"],
    Workable: ["https://apply.workable.com/huggingface/", "https://apply.workable.com/taxfix/", "https://apply.workable.com/bolt/"],
    SmartRecruiters: ["https://careers.smartrecruiters.com/Bosch", "https://careers.smartrecruiters.com/IKEA", "https://careers.smartrecruiters.com/Equinox", "https://careers.smartrecruiters.com/SmartRecruiters"],
    Recruitee: ["https://bunq.recruitee.com", "https://mollie.recruitee.com", "https://personio.recruitee.com"],
    "Plain careers page": ["https://www.civilservicejobs.service.gov.uk/csr/index.cgi", "https://www.nhsjobs.com/"],
};

/* eslint-disable @typescript-eslint/no-explicit-any */
function shape(v: any, depth = 0): any {
    if (Array.isArray(v)) return v.length ? [shape(v.find((x) => x && typeof x === "object" && !("legal" in x)) ?? v[0], depth + 1), `…${v.length}`] : [];
    if (v && typeof v === "object") {
        if (depth > 2) return "{…}";
        return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, depth + 1)]));
    }
    if (typeof v === "string") return v.length > 50 ? `${v.slice(0, 50)}…` : v;
    return v;
}

let failures = 0;
async function main() {
    console.log("\n===== RAW RESPONSE SHAPES =====");
    for (const [name, url] of Object.entries(RAW)) {
        try {
            const data = await safeJson<any>(url);
            const sample = Array.isArray(data) ? data : (data.jobs ?? data.data ?? data.results ?? data);
            console.log(`\n--- ${name}: top-level ${Array.isArray(data) ? "array" : `keys=${Object.keys(data).join(",")}`}`);
            console.log(JSON.stringify(shape(Array.isArray(sample) ? sample.slice(0, 2) : sample), null, 1).slice(0, 2500));
        } catch (e) {
            console.log(`\n--- ${name}: ERROR ${e instanceof Error ? e.message : e}`);
        }
    }

    console.log("\n===== APP SEARCH SOURCES (query: 'marketing') =====");
    for (const s of SOURCES) {
        if (s.needsKey && !keys[s.needsKey]) {
            console.log(`SKIP ${s.id} (no key)`);
            continue;
        }
        try {
            const jobs = await s.run({ keywords: "marketing", location: "London", remoteOnly: false }, keys);
            const ok = jobs.filter((j) => j.title && j.url && /^https?:\/\//.test(j.url));
            console.log(`${ok.length ? "OK  " : "FAIL"} ${s.id}: ${jobs.length} jobs, ${ok.length} with title+url. e.g. ${JSON.stringify(jobs[0] ? { ...jobs[0], description: jobs[0].description?.slice(0, 80) } : null)}`);
            if (!ok.length) failures++;
        } catch (e) {
            console.log(`FAIL ${s.id}: ${e instanceof Error ? e.message : e}`);
            failures++;
        }
    }

    console.log("\n===== CAREERS PAGES =====");
    for (const [system, urls] of Object.entries(PAGES)) {
        let proven = false;
        for (const url of urls) {
            const r = await readPage(url);
            const ok = r.ok && r.jobs.length > 0;
            proven ||= ok;
            console.log(`${ok ? "OK  " : "--  "} [${system}] ${url} via ${r.method}: ${r.jobs.length} jobs ${r.error ?? ""}${ok ? ` e.g. ${JSON.stringify({ ...r.jobs[0], description: r.jobs[0].description?.slice(0, 60) })}` : ""}`);
        }
        console.log(`${proven ? "PROVEN" : "NOT PROVEN"}: ${system} reader`);
        if (!proven && system !== "Plain careers page") failures++;
    }
    console.log(`\n${failures} keyless source(s) failed.`);
    process.exit(failures ? 1 : 0);
}
main();
