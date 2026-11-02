import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Fetch a URL someone typed in, safely: http(s) only, no private or local addresses (so the
 * server can't be pointed at itself), redirects re-checked, a timeout, and a size cap.
 */

const MAX_BYTES = 4_000_000;
const TIMEOUT_MS = 12_000;
const UA = "Mozilla/5.0 (compatible; JobHuntPortal/1.0; personal job search)";

export class FetchError extends Error {
    constructor(
        message: string,
        public status?: number,
    ) {
        super(message);
    }
}

function isPrivateIp(ip: string): boolean {
    if (isIP(ip) === 6) {
        const v = ip.toLowerCase();
        if (v === "::1" || v === "::" || v.startsWith("fe80") || v.startsWith("fc") || v.startsWith("fd")) return true;
        const mapped = v.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/);
        return mapped ? isPrivateIp(mapped[1]) : false;
    }
    const [a, b] = ip.split(".").map(Number);
    return (
        a === 10 ||
        a === 127 ||
        a === 0 ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        (a === 100 && b >= 64 && b <= 127) ||
        a >= 224
    );
}

export async function assertPublicUrl(raw: string): Promise<URL> {
    let url: URL;
    try {
        url = new URL(raw);
    } catch {
        throw new FetchError("That doesn't look like a web address.");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new FetchError("Only http and https links can be checked.");
    if (url.username || url.password) throw new FetchError("Links with a username or password can't be checked.");
    const host = url.hostname.replace(/^\[|\]$/g, "");
    if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) throw new FetchError("That address isn't public.");
    const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
    if (!addresses.length) throw new FetchError(`Couldn't find ${host}. Check the link is right.`);
    if (addresses.some((a) => isPrivateIp(a.address))) throw new FetchError("That address isn't public.");
    return url;
}

export async function safeFetch(raw: string, init: { accept?: string; headers?: Record<string, string> } = {}): Promise<{ url: string; text: string; contentType: string }> {
    let current = raw;
    for (let hop = 0; hop < 5; hop++) {
        const url = await assertPublicUrl(current);
        const res = await fetch(url, {
            redirect: "manual",
            signal: AbortSignal.timeout(TIMEOUT_MS),
            headers: { "user-agent": UA, accept: init.accept ?? "text/html,application/json,application/xml;q=0.9,*/*;q=0.8", "accept-language": "en-GB,en;q=0.9", ...init.headers },
        }).catch((e: unknown) => {
            const timedOut = e instanceof Error && e.name === "TimeoutError";
            throw new FetchError(timedOut ? "The site took too long to answer." : "Couldn't reach the site.");
        });
        if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
            current = new URL(res.headers.get("location")!, url).toString();
            continue;
        }
        if (res.status === 401 || res.status === 403) throw new FetchError("The site blocked automatic reading. Use the 'Pull jobs out of a page' prompt instead.", res.status);
        if (res.status === 404) throw new FetchError("The page wasn't found (404).", 404);
        if (res.status === 429) throw new FetchError("The site is rate-limiting requests. Try again in a few minutes.", 429);
        if (!res.ok) throw new FetchError(`The site answered with an error (${res.status}).`, res.status);
        const reader = res.body?.getReader();
        if (!reader) return { url: url.toString(), text: "", contentType: res.headers.get("content-type") ?? "" };
        const chunks: Uint8Array[] = [];
        let size = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.byteLength;
            if (size > MAX_BYTES) {
                await reader.cancel();
                break;
            }
            chunks.push(value);
        }
        const buf = new Uint8Array(size > MAX_BYTES ? MAX_BYTES : size);
        let off = 0;
        for (const c of chunks) {
            buf.set(c.subarray(0, Math.min(c.byteLength, buf.length - off)), off);
            off += c.byteLength;
            if (off >= buf.length) break;
        }
        return { url: url.toString(), text: new TextDecoder().decode(buf), contentType: res.headers.get("content-type") ?? "" };
    }
    throw new FetchError("Too many redirects.");
}

export async function safeJson<T>(raw: string, headers?: Record<string, string>): Promise<T> {
    const { text } = await safeFetch(raw, { accept: "application/json", headers });
    try {
        return JSON.parse(text) as T;
    } catch {
        throw new FetchError("The site didn't send readable data.");
    }
}
