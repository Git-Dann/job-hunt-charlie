/**
 * Runs the real /api/sync handlers against a real Postgres. Skipped unless TEST_DATABASE_URL is set,
 * e.g. TEST_DATABASE_URL=postgresql://postgres@localhost:55432/postgres npm test
 */
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("sync API against Postgres", () => {
    let route: typeof import("@/app/api/sync/route");
    const req = (method: string, code?: string, body?: unknown) =>
        new Request("http://test/api/sync", {
            method,
            headers: { "content-type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}`, ...(code ? { "x-sync-code": code } : {}) },
            body: body === undefined ? undefined : JSON.stringify(body),
        });

    beforeAll(async () => {
        process.env.DATABASE_URL = url;
        route = await import("@/app/api/sync/route");
    });
    afterAll(async () => {
        await globalThis.__jobHuntPool?.end();
    });

    it("reports that a database is configured", async () => {
        expect(await (await route.GET(req("GET"))).json()).toEqual({ configured: true });
    });

    it("creates, reads, saves, detects a second device's conflict, and deletes", async () => {
        const created = await route.POST(req("POST", undefined, { data: { profile: { name: "Charlie" }, ai: { provider: "anthropic", apiKey: "sk-ant-SECRET", model: "x" } } }));
        expect(created.status).toBe(201);
        const { code, version } = await created.json();
        expect(version).toBe(1);

        // The key never reaches the database, and only a hash of the code is stored.
        const pool = new Pool({ connectionString: url });
        const raw = await pool.query("SELECT code_hash, data::text FROM job_hunt_workspaces");
        await pool.end();
        expect(JSON.stringify(raw.rows)).not.toContain("sk-ant-SECRET");
        expect(JSON.stringify(raw.rows)).not.toContain(code);

        const got = await (await route.GET(req("GET", code.toLowerCase().replace(/-/g, " ")))).json();
        expect(got.data.profile.name).toBe("Charlie");

        // Phone saves first (version 1 → 2)…
        const phone = await route.PUT(req("PUT", code, { baseVersion: 1, data: { profile: { name: "Charlie P" } } }));
        expect(phone.status).toBe(200);
        expect((await phone.json()).version).toBe(2);
        // …then the laptop, which last saw version 1, is told about the conflict and given the phone's copy.
        const laptop = await route.PUT(req("PUT", code, { baseVersion: 1, data: { profile: { name: "Charlie L" } } }));
        expect(laptop.status).toBe(409);
        const conflict = await laptop.json();
        expect(conflict.version).toBe(2);
        expect(conflict.data.profile.name).toBe("Charlie P");

        expect((await route.DELETE(req("DELETE", code))).status).toBe(200);
        expect((await route.GET(req("GET", code))).status).toBe(404);
    });

    it("rejects bad codes and unknown codes", async () => {
        expect((await route.GET(req("GET", "nope"))).status).toBe(400);
        expect((await route.GET(req("GET", "ABCD-EFGH-JKLM-NPQR-STUV"))).status).toBe(404);
        expect((await route.PUT(req("PUT", "ABCD-EFGH-JKLM-NPQR-STUV", { baseVersion: 1, data: {} }))).status).toBe(404);
    });

    it("refuses oversized data", async () => {
        const res = await route.POST(req("POST", undefined, { data: { profile: { extras: "x".repeat(2_100_000) } } }));
        expect(res.status).toBe(413);
    });
});
