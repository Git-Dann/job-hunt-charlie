"use client";

import { useState } from "react";
import { BellRinging03, ChevronDown, RefreshCw01, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Toggle } from "@/components/base/toggle/toggle";
import { JobCard } from "@/components/app/job-card";
import { Card, CardHeader } from "@/components/app/page-header";
import { checkAlerts, useCheckingAlert } from "@/lib/alert-runner";
import { markSeen, newCount } from "@/lib/alerts";
import { timeAgo } from "@/lib/jobs";
import { setData, useAppData } from "@/lib/store";
import type { SavedSearch } from "@/lib/types";
import { cx } from "@/utils/cx";

const updateSearch = (id: string, f: (s: SavedSearch) => SavedSearch) => setData((d) => ({ ...d, searches: d.searches.map((s) => (s.id === id ? f(s) : s)) }));

export const AlertsCard = ({ onLoad }: { onLoad: (s: SavedSearch) => void }) => {
    const { searches } = useAppData();
    const checking = useCheckingAlert();
    const [open, setOpen] = useState<string | null>(null);
    if (!searches.length) return null;
    const total = newCount(searches);

    return (
        <Card className="mt-6">
            <div id="alerts" className="scroll-mt-20" />
            <CardHeader
                title="Saved searches & job alerts"
                description="Alerts re-check your searches every few hours while you use the app, and show only jobs you haven't seen."
                actions={total > 0 ? <Badge color="brand">{total} new</Badge> : undefined}
            />
            <ul className="divide-y divide-secondary">
                {searches.map((s) => {
                    const count = s.newJobs?.length ?? 0;
                    const isOpen = open === s.id;
                    return (
                        <li key={s.id}>
                            <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center md:px-6">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button type="button" onClick={() => onLoad(s)} className="truncate text-left text-sm font-semibold text-primary outline-focus-ring hover:underline focus-visible:outline-2 max-sm:min-h-10">
                                            {s.name}
                                        </button>
                                        {s.alerts && count > 0 && (
                                            <Badge size="sm" color="brand">
                                                {count} new
                                            </Badge>
                                        )}
                                    </div>
                                    <p className={cx("mt-0.5 text-xs", s.alerts && s.lastError ? "text-error-primary" : "text-tertiary")}>
                                        {!s.alerts
                                            ? "Alerts off — tap the name to load this search"
                                            : checking === s.id
                                              ? "Checking now…"
                                              : s.lastError
                                                ? `Last check had a problem: ${s.lastError}`
                                                : s.lastCheckedAt
                                                  ? `Checked ${timeAgo(s.lastCheckedAt).toLowerCase()}${s.urls.length ? ` · includes ${s.urls.length} careers page${s.urls.length === 1 ? "" : "s"}` : ""}`
                                                  : "First check happens shortly"}
                                    </p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Toggle size="sm" label="Alerts" isSelected={!!s.alerts} onChange={(on) => updateSearch(s.id, (x) => ({ ...x, alerts: on }))} />
                                    {s.alerts && (
                                        <Button size="sm" color="secondary" iconLeading={RefreshCw01} isLoading={checking === s.id} isDisabled={!!checking && checking !== s.id} onClick={() => checkAlerts(s.id)}>
                                            Check now
                                        </Button>
                                    )}
                                    {s.alerts && count > 0 && (
                                        <Button size="sm" iconTrailing={ChevronDown} onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                                            {isOpen ? "Hide" : "View"}
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        color="tertiary-destructive"
                                        iconLeading={Trash01}
                                        aria-label={`Delete saved search ${s.name}`}
                                        onClick={() => window.confirm(`Delete the saved search "${s.name}"?`) && setData((d) => ({ ...d, searches: d.searches.filter((x) => x.id !== s.id) }))}
                                    />
                                </div>
                            </div>
                            {isOpen && (
                                <div className="bg-secondary px-4 py-4 md:px-6">
                                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                                        <p className="text-sm font-semibold text-secondary">
                                            {count} new job{count === 1 ? "" : "s"} for &ldquo;{s.name}&rdquo;
                                        </p>
                                        <Button
                                            size="sm"
                                            color="secondary"
                                            onClick={() => {
                                                updateSearch(s.id, markSeen);
                                                setOpen(null);
                                            }}
                                        >
                                            Mark all as seen
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                                        {s.newJobs!.map((j) => (
                                            <JobCard key={j.id} job={j} />
                                        ))}
                                    </div>
                                </div>
                            )}
                        </li>
                    );
                })}
            </ul>
            {!searches.some((s) => s.alerts) && (
                <p className="flex gap-2 px-4 pb-4 text-sm text-tertiary md:px-6">
                    <BellRinging03 className="size-4 shrink-0" aria-hidden /> Switch on Alerts for a search to hear about new jobs.
                </p>
            )}
        </Card>
    );
};
