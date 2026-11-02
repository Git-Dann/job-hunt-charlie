import Anthropic from "@anthropic-ai/sdk";
import { rateLimited } from "@/lib/server/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Runs one prompt with HER OWN key. The key arrives with the request and is used once —
 * never logged or stored. This route exists only because some providers block calls
 * straight from a browser.
 */

interface Body {
    provider?: "anthropic" | "openai" | "gemini";
    apiKey?: string;
    model?: string;
    prompt?: string;
}

const fail = (error: string, status = 400) => Response.json({ error }, { status });

async function runAnthropic(apiKey: string, model: string, prompt: string): Promise<string> {
    const client = new Anthropic({ apiKey, maxRetries: 1 });
    // Haiku has no server-side refusal fallback; the others route a refused request to a fallback model.
    const withFallback = model !== "claude-haiku-5-5";
    try {
        const stream = client.beta.messages.stream({
            model,
            max_tokens: 16000,
            output_config: { effort: "medium" },
            messages: [{ role: "user", content: prompt }],
            ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
        });
        const msg = await stream.finalMessage();
        if (msg.stop_reason === "refusal") throw new Error("The AI declined this request. Try rewording it.");
        const text = msg.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n").trim();
        if (!text) throw new Error("The AI returned an empty answer. Try again.");
        return text;
    } catch (e) {
        if (e instanceof Anthropic.AuthenticationError) throw new Error("Anthropic didn't accept that API key. Check it in Settings.");
        if (e instanceof Anthropic.PermissionDeniedError) throw new Error("This key can't use that model. Try another model in Settings.");
        if (e instanceof Anthropic.RateLimitError) throw new Error("You've hit your Anthropic rate limit or run out of credit.");
        if (e instanceof Anthropic.NotFoundError) throw new Error(`Anthropic doesn't recognise the model "${model}".`);
        if (e instanceof Anthropic.APIConnectionError) throw new Error("Couldn't reach Anthropic. Try again in a moment.");
        if (e instanceof Anthropic.APIError) throw new Error(`Anthropic error (${e.status ?? "unknown"}): ${e.message}`);
        throw e;
    }
}

async function runOpenAi(apiKey: string, model: string, prompt: string): Promise<string> {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
        body: JSON.stringify({ model, messages: [{ role: "user", content: prompt }] }),
        signal: AbortSignal.timeout(280_000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) throw new Error("OpenAI didn't accept that API key. Check it in Settings.");
    if (res.status === 429) throw new Error("You've hit your OpenAI rate limit or run out of credit.");
    if (!res.ok) throw new Error(`OpenAI error (${res.status}): ${data?.error?.message ?? "unknown"}`);
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (!text) throw new Error("OpenAI returned an empty answer.");
    return text;
}

async function runGemini(apiKey: string, model: string, prompt: string): Promise<string> {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(280_000),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 400 && /API key/i.test(JSON.stringify(data))) throw new Error("Google didn't accept that API key. Check it in Settings.");
    if (res.status === 429) throw new Error("You've hit your Gemini rate limit. The free tier allows a few requests a minute.");
    if (!res.ok) throw new Error(`Gemini error (${res.status}): ${data?.error?.message ?? "unknown"}`);
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((p: { text?: string }) => p.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned an empty answer (it may have been blocked by its safety filter).");
    return text;
}

export async function POST(req: Request) {
    if (rateLimited(req, 15)) return fail("Too many requests in a minute — wait a moment.", 429);
    const body = (await req.json().catch(() => ({}))) as Body;
    const apiKey = body.apiKey?.trim();
    const model = body.model?.trim();
    const prompt = body.prompt?.trim();
    if (!body.provider || !apiKey) return fail("Connect an AI service in Settings first.");
    if (!model) return fail("Choose a model in Settings.");
    if (!prompt) return fail("The prompt is empty.");
    if (prompt.length > 200_000) return fail("That prompt is too long. Trim the job advert or CV.");
    try {
        const run = body.provider === "anthropic" ? runAnthropic : body.provider === "openai" ? runOpenAi : body.provider === "gemini" ? runGemini : null;
        if (!run) return fail("Unknown AI service.");
        return Response.json({ text: await run(apiKey, model, prompt) });
    } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        const timedOut = e instanceof Error && e.name === "TimeoutError";
        return fail(timedOut ? "The AI took too long to answer. Try again." : msg, 502);
    }
}
