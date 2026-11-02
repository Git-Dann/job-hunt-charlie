import { describe, expect, it } from "vitest";
import { databaseUrl } from "../server/db";

describe("finding the database", () => {
    it("reads the names Vercel's Neon integration uses", () => {
        expect(databaseUrl({ DATABASE_URL: "a" })).toBe("a");
        expect(databaseUrl({ POSTGRES_URL: "b" })).toBe("b");
        expect(databaseUrl({ STORAGE_DATABASE_URL: "c", STORAGE_DATABASE_URL_UNPOOLED: "d" })).toBe("c");
        expect(databaseUrl({ NEON_POSTGRES_URL: "e" })).toBe("e");
        expect(databaseUrl({ SOMETHING_ELSE: "x" })).toBe("");
    });
});
