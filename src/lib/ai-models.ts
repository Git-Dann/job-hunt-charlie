import type { AiProvider } from "./types";

export const AI_PROVIDERS: { id: AiProvider; label: string; keyUrl: string; keyHint: string; models: { id: string; label: string }[] }[] = [
    {
        id: "anthropic",
        label: "Anthropic (Claude)",
        keyUrl: "https://console.anthropic.com/settings/keys",
        keyHint: "Starts with sk-ant-",
        models: [
            { id: "claude-opus-5-5", label: "Claude Opus 5.5 — best writing" },
            { id: "claude-sonnet-5-5", label: "Claude Sonnet 5.5 — fast, great value" },
            { id: "claude-haiku-5-5", label: "Claude Haiku 5.5 — cheapest" },
        ],
    },
    {
        id: "openai",
        label: "OpenAI (ChatGPT)",
        keyUrl: "https://platform.openai.com/api-keys",
        keyHint: "Starts with sk-",
        models: [
            { id: "gpt-4.1", label: "GPT-4.1" },
            { id: "gpt-4.1-mini", label: "GPT-4.1 mini — cheaper" },
        ],
    },
    {
        id: "gemini",
        label: "Google (Gemini)",
        keyUrl: "https://aistudio.google.com/app/apikey",
        keyHint: "From Google AI Studio",
        models: [
            { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
            { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash — has a free tier" },
        ],
    },
];

export const defaultModel = (p: AiProvider) => AI_PROVIDERS.find((x) => x.id === p)!.models[0].id;
