"use client";

import { useState } from "react";
import { CurrencyPound, LinkExternal01, Stars02 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Card, CardHeader } from "@/components/app/page-header";
import { formatGbp, parseSalary, type SalaryStats } from "@/lib/salary";
import { getData } from "@/lib/store";

interface Result {
    source: string;
    sourceNote: string;
    stats: SalaryStats;
    mean?: number;
    bands?: { from: number; count: number }[];
}

/** What does this role pay? Live UK adverts via her own free Adzuna or Reed key. */
export const SalaryCard = ({ title = "", location = "", advertised, jobId }: { title?: string; location?: string; advertised?: string; jobId?: string }) => {
    const [what, setWhat] = useState(title);
    const [where, setWhere] = useState(location.replace(/\bremote\b.*$/i, "").trim());
    const [result, setResult] = useState<Result | null>(null);
    const [error, setError] = useState("");
    const [needsKey, setNeedsKey] = useState(false);
    const [loading, setLoading] = useState(false);
    const offer = parseSalary(advertised);

    const run = async () => {
        setLoading(true);
        setError("");
        setResult(null);
        try {
            const res = await fetch("/api/salary", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ what, where, keys: getData().keys }) });
            const body = await res.json();
            if (!res.ok) {
                setNeedsKey(Boolean(body.needsKey));
                throw new Error(body.error);
            }
            setResult(body);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Couldn't get salary data.");
        } finally {
            setLoading(false);
        }
    };

    const s = result?.stats;
    const offerMid = offer ? (offer.min + offer.max) / 2 : null;
    const verdict = s && offerMid ? (offerMid < s.p25 ? "below the typical range" : offerMid > s.p75 ? "above the typical range" : "within the typical range") : null;
    const peak = Math.max(...(result?.bands?.map((b) => b.count) ?? [1]));

    return (
        <Card>
            <CardHeader title="What does it pay?" description="Real figures from current UK job adverts." />
            <div className="flex flex-col gap-3 px-4 py-4 md:px-6">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Input aria-label="Job title" placeholder="Job title" icon={CurrencyPound} value={what} onChange={setWhat} size="sm" />
                    <Input aria-label="Location" placeholder="Location (optional)" value={where} onChange={setWhere} size="sm" />
                </div>
                <Button color="secondary" isLoading={loading} isDisabled={!what.trim()} onClick={run}>
                    Check salaries
                </Button>
                {error && (
                    <Button
                        size="sm"
                        color="link-color"
                        className="self-start"
                        href={`https://www.google.com/search?q=${encodeURIComponent(`${what} salary ${where} UK`)}`}
                        target="_blank"
                        rel="noreferrer"
                        iconTrailing={LinkExternal01}
                    >
                        Search salaries online instead
                    </Button>
                )}
                {error && (
                    <p role="alert" className="text-sm text-tertiary">
                        {error}{" "}
                        {needsKey && (
                            <a href="/settings#sources" className="font-semibold text-brand-secondary underline">
                                Add a key
                            </a>
                        )}
                    </p>
                )}
                {s && (
                    <div>
                        <p className="text-sm text-tertiary">Typical salary (median)</p>
                        <p className="text-display-xs font-semibold text-primary">{formatGbp(s.median)}</p>
                        <p className="text-sm text-secondary">
                            Most adverts: {formatGbp(s.p25)} – {formatGbp(s.p75)}
                        </p>
                        {result?.bands && result.bands.length > 1 && (
                            <div className="mt-3 flex h-16 items-end gap-1" role="img" aria-label="Spread of advertised salaries">
                                {result.bands.map((b) => (
                                    <div key={b.from} className="flex-1 rounded-t bg-brand-solid/70" style={{ height: `${Math.max((b.count / peak) * 100, 4)}%` }} title={`${formatGbp(b.from)}+: ${b.count} adverts`} />
                                ))}
                            </div>
                        )}
                        {verdict && (
                            <p className="mt-3 rounded-lg bg-secondary p-3 text-sm text-secondary">
                                This job advertises {advertised}, which is <strong>{verdict}</strong>.
                            </p>
                        )}
                        <p className="mt-2 text-xs text-quaternary">
                            {result!.sourceNote} Source: {result!.source}.
                        </p>
                        {jobId && (
                            <Button size="sm" color="link-color" className="mt-2" iconLeading={Stars02} href={`/prompts?p=negotiate&job=${jobId}`}>
                                Plan a salary negotiation with AI
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </Card>
    );
};
