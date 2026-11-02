"use client";

import { useState } from "react";
import { AlertCircle, Building07, CheckCircle, LinkExternal01, SearchLg, Stars02 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Card, CardHeader } from "@/components/app/page-header";
import { type CompanyMatch, type CompanyProfile, companyFlags } from "@/lib/sources/companies-house";
import { getData } from "@/lib/store";
import { cx } from "@/utils/cx";

const call = async (qs: string) => {
    const res = await fetch(`/api/company?${qs}`, { headers: { "x-ch-key": getData().keys.companiesHouseKey ?? "" } });
    const body = await res.json();
    if (!res.ok) throw Object.assign(new Error(body.error), { needsKey: body.needsKey });
    return body;
};

/** A live check on the UK public register: is the company real, active, how big and how old? */
export const CompanyCard = ({ company = "", jobId }: { company?: string; jobId?: string }) => {
    const [q, setQ] = useState(company);
    const [matches, setMatches] = useState<CompanyMatch[] | null>(null);
    const [profile, setProfile] = useState<CompanyProfile | null>(null);
    const [error, setError] = useState("");
    const [needsKey, setNeedsKey] = useState(false);
    const [loading, setLoading] = useState(false);

    const run = async (fn: () => Promise<void>) => {
        setLoading(true);
        setError("");
        try {
            await fn();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Companies House didn't answer.");
            setNeedsKey(Boolean((e as { needsKey?: boolean }).needsKey));
        } finally {
            setLoading(false);
        }
    };
    const search = () =>
        run(async () => {
            setProfile(null);
            const body = await call(`q=${encodeURIComponent(q)}`);
            setMatches(body.matches);
        });
    const open = (number: string) =>
        run(async () => {
            const body = await call(`number=${number}`);
            setProfile(body.profile);
        });

    const publicSearch = `https://find-and-update.company-information.service.gov.uk/search/companies?q=${encodeURIComponent(q)}`;

    return (
        <Card>
            <CardHeader title="Company check" description="The official UK register: status, age, size and accounts." />
            <div className="flex flex-col gap-3 px-4 py-4 md:px-6">
                <form
                    className="flex gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (q.trim()) search();
                    }}
                >
                    <Input aria-label="Company name" placeholder="Company name" icon={Building07} value={q} onChange={setQ} size="sm" className="flex-1" />
                    <Button type="submit" size="sm" color="secondary" iconLeading={SearchLg} isLoading={loading && !profile} isDisabled={!q.trim()} aria-label="Search Companies House" />
                </form>
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
                {needsKey && (
                    <Button size="sm" color="link-color" href={publicSearch} target="_blank" rel="noreferrer" iconTrailing={LinkExternal01} className="self-start">
                        Or look it up on Companies House
                    </Button>
                )}
                {matches && !profile && (
                    <ul className="flex flex-col gap-1">
                        {matches.length === 0 && <li className="text-sm text-tertiary">No matching companies. Try the company&rsquo;s legal name (often ends in &ldquo;Ltd&rdquo;).</li>}
                        {matches.map((m) => (
                            <li key={m.number}>
                                <button type="button" onClick={() => open(m.number)} className="w-full rounded-lg px-2 py-2 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
                                    <span className="block text-sm font-semibold text-secondary">{m.name}</span>
                                    <span className="block truncate text-xs text-tertiary">
                                        {m.status} · {m.number}
                                        {m.address ? ` · ${m.address}` : ""}
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                {profile && (
                    <div className="flex flex-col gap-3">
                        <div>
                            <p className="text-sm font-semibold text-primary">{profile.name}</p>
                            <p className="text-xs text-tertiary">
                                Company number {profile.number}
                                {profile.address ? ` · ${profile.address}` : ""}
                            </p>
                        </div>
                        <ul className="flex flex-col gap-1.5">
                            {companyFlags(profile).map((f) => (
                                <li key={f.text} className={cx("flex items-center gap-2 text-sm", f.tone === "good" ? "text-secondary" : f.tone === "warn" ? "text-warning-primary" : "text-error-primary")}>
                                    {f.tone === "good" ? <CheckCircle className="size-4 shrink-0 text-fg-success-primary" /> : <AlertCircle className="size-4 shrink-0" />}
                                    {f.text}
                                </li>
                            ))}
                            {profile.sizeHint && <li className="text-sm text-secondary">• {profile.sizeHint}</li>}
                            {profile.activeOfficers !== undefined && <li className="text-sm text-secondary">• {profile.activeOfficers} current director{profile.activeOfficers === 1 ? "" : "s"} or officers</li>}
                            {profile.sicCodes.length > 0 && <li className="text-sm text-secondary">• Industry codes (SIC): {profile.sicCodes.join(", ")}</li>}
                        </ul>
                        <div className="flex flex-wrap gap-2">
                            <Button size="sm" color="secondary" href={profile.url} target="_blank" rel="noreferrer" iconTrailing={LinkExternal01}>
                                Full record
                            </Button>
                            <Button size="sm" color="tertiary" onClick={() => setProfile(null)}>
                                Back to results
                            </Button>
                        </div>
                    </div>
                )}
                {jobId && (
                    <Button size="sm" color="link-color" className="self-start" iconLeading={Stars02} href={`/prompts?p=company-research&job=${jobId}`}>
                        Research the company with AI
                    </Button>
                )}
            </div>
        </Card>
    );
};
