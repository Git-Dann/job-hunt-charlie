import { Pool } from "pg";

/**
 * Postgres connection. On Vercel, connecting Neon (Storage → Neon) sets DATABASE_URL for you.
 * Uses the plain `pg` driver, which works with Neon's pooled connection string and with any
 * other Postgres (Supabase, Railway, a local one).
 */

/**
 * Vercel's Neon integration names the variable DATABASE_URL, POSTGRES_URL, or — if a custom prefix was
 * chosen when connecting — e.g. STORAGE_DATABASE_URL. Accept any of them, preferring the pooled ones.
 */
export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
    const direct = env.DATABASE_URL || env.POSTGRES_URL;
    if (direct) return direct;
    const key = Object.keys(env)
        .filter((k) => /(^|_)(DATABASE_URL|POSTGRES_URL)$/.test(k) && env[k])
        .sort()[0];
    return key ? env[key]! : "";
}
export const isDbConfigured = () => Boolean(databaseUrl());

declare global {
    var __jobHuntPool: Pool | undefined;
    var __jobHuntSchema: Promise<void> | undefined;
}

function pool(): Pool {
    if (!globalThis.__jobHuntPool) {
        const url = databaseUrl();
        if (!url) throw new Error("No database is connected.");
        const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url);
        globalThis.__jobHuntPool = new Pool({
            connectionString: url,
            max: 3,
            idleTimeoutMillis: 10_000,
            connectionTimeoutMillis: 8_000,
            ssl: local || /sslmode=disable/.test(url) ? undefined : { rejectUnauthorized: true },
        });
    }
    return globalThis.__jobHuntPool;
}

/** Creates the one table on first use, so there's no migration step to run. */
function ensureSchema(): Promise<void> {
    globalThis.__jobHuntSchema ??= pool()
        .query(
            `CREATE TABLE IF NOT EXISTS job_hunt_workspaces (
                code_hash  text PRIMARY KEY,
                data       jsonb NOT NULL,
                version    integer NOT NULL DEFAULT 1,
                created_at timestamptz NOT NULL DEFAULT now(),
                updated_at timestamptz NOT NULL DEFAULT now()
            )`,
        )
        .then(() => undefined)
        .catch((e) => {
            globalThis.__jobHuntSchema = undefined;
            throw e;
        });
    return globalThis.__jobHuntSchema;
}

export async function query<T extends object>(sql: string, params: unknown[] = []): Promise<T[]> {
    await ensureSchema();
    const res = await pool().query(sql, params);
    return res.rows as T[];
}
