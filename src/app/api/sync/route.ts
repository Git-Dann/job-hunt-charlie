import { createHash, randomBytes } from "node:crypto";
import { isDbConfigured, query } from "@/lib/server/db";
import { rateLimited } from "@/lib/server/rate-limit";
import { normaliseData } from "@/lib/store-normalise";
import { MAX_SYNC_BYTES, forCloud, makeSyncCode, normaliseSyncCode } from "@/lib/sync-shared";

export const runtime = "nodejs";

/**
 * Cloud copy of her data, so it follows her between phone and laptop.
 * No accounts: a private sync code identifies the copy. Only a hash of the code is stored,
 * and API keys are stripped before anything is saved.
 *
 *   GET    /api/sync            → { configured } (no code) or { data, version, updatedAt }
 *   POST   /api/sync            → create a copy, returns { code, version }
 *   PUT    /api/sync            → save; 409 with the cloud copy if another device saved first
 *   DELETE /api/sync            → delete the cloud copy
 * The code travels in the `x-sync-code` header, never in the URL (URLs end up in logs).
 */

interface Row {
    data: unknown;
    version: number;
    updated_at: string;
}

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

function codeFrom(req: Request): string | null {
    return normaliseSyncCode(req.headers.get("x-sync-code") ?? "");
}

function notConfigured() {
    return json({ error: "No database is connected yet. Add Neon in your Vercel project (Storage → Neon), then redeploy." }, 503);
}

function dbError(e: unknown) {
    console.error("sync: database error", e instanceof Error ? e.message : e);
    return json({ error: "The database didn't answer. Your data is safe on this device — try again shortly." }, 503);
}

async function readBody(req: Request): Promise<Record<string, unknown> | Response> {
    const text = await req.text();
    if (text.length > MAX_SYNC_BYTES) return json({ error: "Your data is too large to sync (over 2 MB)." }, 413);
    try {
        return JSON.parse(text) as Record<string, unknown>;
    } catch {
        return json({ error: "That wasn't valid data." }, 400);
    }
}

export async function GET(req: Request) {
    if (!req.headers.get("x-sync-code")) return json({ configured: isDbConfigured() });
    if (rateLimited(req, 60)) return json({ error: "Too many requests — wait a moment." }, 429);
    if (!isDbConfigured()) return notConfigured();
    const code = codeFrom(req);
    if (!code) return json({ error: "That sync code isn't valid." }, 400);
    try {
        const [row] = await query<Row>("SELECT data, version, updated_at FROM job_hunt_workspaces WHERE code_hash = $1", [hashCode(code)]);
        if (!row) return json({ error: "No data found for that sync code." }, 404);
        return json({ data: row.data, version: row.version, updatedAt: row.updated_at });
    } catch (e) {
        return dbError(e);
    }
}

export async function POST(req: Request) {
    if (rateLimited(req, 10)) return json({ error: "Too many requests — wait a moment." }, 429);
    if (!isDbConfigured()) return notConfigured();
    const body = await readBody(req);
    if (body instanceof Response) return body;
    const data = forCloud(normaliseData(body.data));
    const code = makeSyncCode((n) => randomBytes(n));
    try {
        const [row] = await query<Row>("INSERT INTO job_hunt_workspaces (code_hash, data) VALUES ($1, $2) RETURNING version, updated_at", [hashCode(code), JSON.stringify(data)]);
        return json({ code, version: row.version, updatedAt: row.updated_at }, 201);
    } catch (e) {
        return dbError(e);
    }
}

export async function PUT(req: Request) {
    if (rateLimited(req, 60)) return json({ error: "Too many requests — wait a moment." }, 429);
    if (!isDbConfigured()) return notConfigured();
    const code = codeFrom(req);
    if (!code) return json({ error: "That sync code isn't valid." }, 400);
    const body = await readBody(req);
    if (body instanceof Response) return body;
    const baseVersion = Number(body.baseVersion);
    if (!Number.isInteger(baseVersion) || baseVersion < 1) return json({ error: "Missing baseVersion." }, 400);
    const data = forCloud(normaliseData(body.data));
    try {
        // Only saves if nobody else has saved since this device last synced.
        const [saved] = await query<Row>(
            "UPDATE job_hunt_workspaces SET data = $2, version = version + 1, updated_at = now() WHERE code_hash = $1 AND version = $3 RETURNING version, updated_at",
            [hashCode(code), JSON.stringify(data), baseVersion],
        );
        if (saved) return json({ version: saved.version, updatedAt: saved.updated_at });
        const [current] = await query<Row>("SELECT data, version, updated_at FROM job_hunt_workspaces WHERE code_hash = $1", [hashCode(code)]);
        if (!current) return json({ error: "No data found for that sync code. It may have been deleted." }, 404);
        return json({ conflict: true, data: current.data, version: current.version, updatedAt: current.updated_at }, 409);
    } catch (e) {
        return dbError(e);
    }
}

export async function DELETE(req: Request) {
    if (rateLimited(req, 10)) return json({ error: "Too many requests — wait a moment." }, 429);
    if (!isDbConfigured()) return notConfigured();
    const code = codeFrom(req);
    if (!code) return json({ error: "That sync code isn't valid." }, 400);
    try {
        const rows = await query<{ code_hash: string }>("DELETE FROM job_hunt_workspaces WHERE code_hash = $1 RETURNING code_hash", [hashCode(code)]);
        return json({ deleted: rows.length > 0 });
    } catch (e) {
        return dbError(e);
    }
}
