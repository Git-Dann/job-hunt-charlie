"use client";

import { useState } from "react";
import { getData } from "./store";

/** Run a prompt with her own connected AI. Returns null if nothing is connected. */
export function useRunAi() {
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");
    const [error, setError] = useState("");

    const run = async (prompt: string) => {
        const { ai } = getData();
        if (!ai.provider || !ai.apiKey) {
            setError("Connect an AI service in Settings first.");
            return;
        }
        setLoading(true);
        setError("");
        setOutput("");
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ provider: ai.provider, apiKey: ai.apiKey, model: ai.model, prompt }),
            });
            const body = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(body.error ?? "The AI request failed.");
            setOutput(body.text);
        } catch (e) {
            setError(e instanceof Error ? e.message : "The AI request failed.");
        } finally {
            setLoading(false);
        }
    };

    return { run, loading, output, error, reset: () => (setOutput(""), setError("")) };
}
