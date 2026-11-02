"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Briefcase01, Building07, CalendarCheck01, Download01, Link01, Plus, SearchLg } from "@untitledui/icons";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { AddJobDialog } from "@/components/app/add-job-dialog";
import { JobsSubnav } from "@/components/app/jobs-subnav";
import { Page, PageHeader } from "@/components/app/page-header";
import { formatDate, timeAgo, updateJob } from "@/lib/jobs";
import { useAppData, useHydrated } from "@/lib/store";
import { JOB_STATUSES, type JobStatus, type TrackedJob } from "@/lib/types";

const toCsv = (jobs: TrackedJob[]) => {
    const cols = ["title", "company", "location", "salary", "status", "savedAt", "appliedAt", "nextStep", "nextStepDate", "contact", "url", "notes"] as const;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    return [cols.join(","), ...jobs.map((j) => cols.map((c) => esc(j[c])).join(","))].join("\n");
};

export const JobsView = () => {
    const { jobs } = useAppData();
    const hydrated = useHydrated();
    const params = useSearchParams();
    const [tab, setTab] = useState<string>(params.get("status") ?? "all");
    const [filter, setFilter] = useState("");

    const counts = useMemo(() => Object.fromEntries(JOB_STATUSES.map((s) => [s.id, jobs.filter((j) => j.status === s.id).length])), [jobs]);
    const shown = useMemo(() => {
        const f = filter.trim().toLowerCase();
        return jobs
            .filter((j) => tab === "all" || j.status === tab)
            .filter((j) => !f || `${j.title} ${j.company} ${j.notes ?? ""}`.toLowerCase().includes(f));
    }, [jobs, tab, filter]);

    const exportCsv = () => {
        const blob = new Blob([toCsv(jobs)], { type: "text/csv" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `job-applications-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    return (
        <Page>
            <JobsSubnav />
            <PageHeader
                title="My applications"
                description="Every job you've saved, where it's up to, and what to do next."
                actions={
                    <>
                        {jobs.length > 0 && (
                            <Button color="secondary" iconLeading={Download01} onClick={exportCsv}>
                                Export
                            </Button>
                        )}
                        <Button color="secondary" iconLeading={Link01} href="/add-job">
                            Save from a link
                        </Button>
                        <AddJobDialog>
                            <Button iconLeading={Plus}>Add a job</Button>
                        </AddJobDialog>
                    </>
                }
            />

            <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))} className="mt-6">
                <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                    <Tabs.List type="underline" size="sm" className="w-max min-w-full">
                        <Tabs.Item id="all" label="All" badge={hydrated ? jobs.length || undefined : undefined} />
                        {JOB_STATUSES.map((s) => (
                            <Tabs.Item key={s.id} id={s.id} label={s.label} badge={hydrated ? counts[s.id] || undefined : undefined} />
                        ))}
                    </Tabs.List>
                </div>
            </Tabs>

            {hydrated && jobs.length > 0 && (
                <Input aria-label="Filter" placeholder="Filter by title, company or notes" icon={SearchLg} value={filter} onChange={setFilter} size="sm" className="mt-4 sm:max-w-sm" />
            )}

            {hydrated && jobs.length === 0 ? (
                <div className="mt-10 flex flex-col items-center text-center">
                    <FeaturedIcon icon={Briefcase01} color="gray" theme="modern" size="xl" />
                    <h2 className="mt-4 text-lg font-semibold text-primary">No jobs saved yet</h2>
                    <p className="mt-1 max-w-sm text-sm text-tertiary">Save jobs from a search, or add one you found elsewhere. They&rsquo;ll appear here so you can track every application.</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                        <Button href="/search" iconLeading={SearchLg}>
                            Find jobs
                        </Button>
                        <AddJobDialog>
                            <Button color="secondary" iconLeading={Plus}>
                                Add a job
                            </Button>
                        </AddJobDialog>
                    </div>
                </div>
            ) : (
                <ul className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
                    {shown.map((j) => (
                        <TrackedJobRow key={j.id} job={j} />
                    ))}
                    {hydrated && shown.length === 0 && (
                        <li className="rounded-xl border border-dashed border-primary p-8 text-center text-sm text-tertiary lg:col-span-2">Nothing here yet.</li>
                    )}
                </ul>
            )}
        </Page>
    );
};

const TrackedJobRow = ({ job }: { job: TrackedJob }) => {
    const status = JOB_STATUSES.find((s) => s.id === job.status)!;
    return (
        <li className="flex flex-col rounded-xl border border-secondary bg-primary shadow-xs">
            <a href={`/jobs/${job.id}`} className="flex flex-1 flex-col gap-2 rounded-t-xl p-4 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 md:p-5">
                <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 text-md font-semibold break-words text-primary">{job.title}</p>
                    <Badge size="sm" color={status.color}>
                        {status.label}
                    </Badge>
                </div>
                <p className="flex items-center gap-1.5 text-sm text-tertiary">
                    <Building07 className="size-4 shrink-0 text-fg-quaternary" aria-hidden />
                    <span className="truncate">{[job.company, job.location].filter(Boolean).join(" · ") || "No company added"}</span>
                </p>
                {job.nextStep && (
                    <p className="flex items-center gap-1.5 text-sm font-medium text-brand-secondary">
                        <CalendarCheck01 className="size-4 shrink-0" aria-hidden />
                        <span className="truncate">
                            {job.nextStep}
                            {job.nextStepDate ? ` · ${formatDate(job.nextStepDate, { weekday: "short", day: "numeric", month: "short" })}` : ""}
                        </span>
                    </p>
                )}
            </a>
            <div className="flex items-center justify-between gap-3 border-t border-secondary px-4 py-3 md:px-5">
                <span className="text-xs text-quaternary">{job.appliedAt ? `Applied ${timeAgo(job.appliedAt).toLowerCase()}` : `Saved ${timeAgo(job.savedAt).toLowerCase()}`}</span>
                <NativeSelect
                    aria-label={`Stage for ${job.title}`}
                    size="sm"
                    className="w-40"
                    value={job.status}
                    onChange={(e) => updateJob(job.id, { status: e.target.value as JobStatus })}
                    options={JOB_STATUSES.map((s) => ({ value: s.id, label: s.label }))}
                />
            </div>
        </li>
    );
};
