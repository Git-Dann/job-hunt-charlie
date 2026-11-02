"use client";

import { useState } from "react";
import { BookmarkCheck, Bookmark, Building07, ChevronDown, Clock, CurrencyPound, LinkExternal01, MarkerPin01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { saveJob, timeAgo } from "@/lib/jobs";
import { useAppData } from "@/lib/store";
import type { JobListing } from "@/lib/types";

export const JobCard = ({ job, score }: { job: JobListing; score?: number }) => {
    const { jobs } = useAppData();
    const saved = jobs.some((j) => j.id === job.id);
    const [open, setOpen] = useState(false);
    const meta = [
        job.company && { icon: Building07, text: job.company },
        job.location && { icon: MarkerPin01, text: job.location },
        job.salary && { icon: CurrencyPound, text: job.salary },
        job.postedAt && { icon: Clock, text: timeAgo(job.postedAt) },
    ].filter(Boolean) as { icon: typeof Clock; text: string }[];

    return (
        <article className="rounded-xl border border-secondary bg-primary p-4 shadow-xs md:p-5">
            <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge size="sm" color="gray" type="modern">
                            {job.source}
                        </Badge>
                        {job.remote && (
                            <Badge size="sm" color="blue">
                                Remote
                            </Badge>
                        )}
                        {score !== undefined && (
                            <Badge size="sm" color={score >= 60 ? "success" : score >= 35 ? "warning" : "gray"}>
                                {score}% match
                            </Badge>
                        )}
                    </div>
                    <h3 className="mt-2 text-md font-semibold break-words text-primary">
                        <a href={job.url} target="_blank" rel="noreferrer" className="outline-focus-ring hover:underline focus-visible:outline-2">
                            {job.title}
                        </a>
                    </h3>
                    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5">
                        {meta.map((m) => (
                            <li key={m.text} className="flex min-w-0 items-center gap-1.5 text-sm text-tertiary">
                                <m.icon className="size-4 shrink-0 text-fg-quaternary" aria-hidden />
                                <span className="truncate">{m.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
            {job.description && open && (
                <p className="mt-3 max-h-80 overflow-y-auto rounded-lg bg-secondary p-3 text-sm whitespace-pre-line text-secondary">{job.description}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" color={saved ? "secondary" : "primary"} iconLeading={saved ? BookmarkCheck : Bookmark} onClick={() => saveJob(job)} isDisabled={saved}>
                    {saved ? "Saved" : "Save"}
                </Button>
                <Button size="sm" color="secondary" href={job.url} target="_blank" rel="noreferrer" iconTrailing={LinkExternal01}>
                    View advert
                </Button>
                {job.description && (
                    <Button size="sm" color="tertiary" iconTrailing={ChevronDown} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
                        {open ? "Hide details" : "Details"}
                    </Button>
                )}
            </div>
        </article>
    );
};
