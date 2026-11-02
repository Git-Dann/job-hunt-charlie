// Calls the running app's own API routes over HTTP, with real internet access (run in CI).
// Usage: node scripts/smoke-api.mjs http://localhost:3000
const B = process.argv[2] ?? "http://localhost:3000";
let failed = 0;
const post = (path, body) => fetch(B + path, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).then(async (r) => ({ status: r.status, json: await r.json() }));
const check = (name, ok, detail) => {
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
    if (!ok) failed++;
};

const search = await post("/api/search", { keywords: "marketing", location: "", remoteOnly: true });
check("/api/search returns live jobs", search.status === 200 && search.json.jobs.length > 0, `${search.json.jobs?.length} jobs from ${search.json.sources?.filter((s) => s.count).map((s) => s.label).join(", ")}`);
const uk = await post("/api/search", { keywords: "events manager", location: "Manchester", remoteOnly: false });
check("/api/search with a UK location answers", uk.status === 200, `${uk.json.jobs?.length} jobs; ${uk.json.sources?.map((s) => `${s.label}:${s.skipped ? "needs key" : s.ok ? s.count : "error"}`).join(" ")}`);
const scrape = await post("/api/scrape", { urls: ["https://boards.greenhouse.io/gitlab"] });
check("/api/scrape reads a careers page", scrape.status === 200 && scrape.json.jobs.length > 0, `${scrape.json.jobs?.length} jobs via ${scrape.json.pages?.[0]?.method}`);
const ssrf = await post("/api/scrape", { urls: ["http://169.254.169.254/latest/meta-data/"] });
check("/api/scrape refuses private addresses", ssrf.json.pages?.[0]?.ok === false && /public/.test(ssrf.json.pages[0].error), ssrf.json.pages?.[0]?.error);
const salary = await post("/api/salary", { what: "events manager", where: "", keys: {} });
check("/api/salary explains it needs a key", salary.status === 400 && salary.json.needsKey === true);
const company = await fetch(`${B}/api/company?q=monzo`).then(async (r) => ({ status: r.status, json: await r.json() }));
check("/api/company answers", company.status === 200 ? company.json.matches?.length > 0 : company.json.needsKey === true, company.status === 200 ? `${company.json.matches.length} matches` : "needs a key (none configured)");
const ai = await post("/api/ai", { provider: "anthropic", apiKey: "sk-ant-invalid", model: "claude-haiku-5-5", prompt: "hi" });
check("/api/ai reaches Anthropic and reports a bad key clearly", ai.status === 502 && /didn't accept/.test(ai.json.error), ai.json.error);
const sync = await fetch(`${B}/api/sync`).then((r) => r.json());
check("/api/sync reports whether a database is configured", typeof sync.configured === "boolean", JSON.stringify(sync));
for (const page of ["/", "/search", "/jobs", "/interviews", "/progress", "/add-job", "/cv", "/answers", "/prompts", "/settings", "/manifest.webmanifest"]) {
    const r = await fetch(B + page);
    check(`page ${page} loads`, r.status === 200, String(r.status));
}
console.log(`\n${failed} failed`);
process.exit(failed ? 1 : 0);
