"use client";

import { CalendarCheck01, CalendarPlus01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { AddInterviewDialog } from "@/components/app/add-interview-dialog";
import { JobsSubnav } from "@/components/app/jobs-subnav";
import { Page, PageHeader } from "@/components/app/page-header";
import { formatWhen } from "@/lib/interview-actions";
import { OUTCOMES } from "@/lib/interviews";
import { useAppData, useHydrated } from "@/lib/store";
import type { Interview } from "@/lib/types";

export const InterviewsView = () => {
    const { interviews, jobs } = useAppData();
    const hydrated = useHydrated();
    const now = Date.now();
    const upcoming = interviews.filter((i) => new Date(i.when).getTime() >= now - 3 * 3_600_000).sort((a, b) => a.when.localeCompare(b.when));
    const past = interviews.filter((i) => !upcoming.includes(i)).sort((a, b) => b.when.localeCompare(a.when));

    const Row = ({ iv }: { iv: Interview }) => {
        const job = jobs.find((j) => j.id === iv.jobId);
        const outcome = OUTCOMES.find((o) => o.id === iv.outcome)!;
        const done = iv.checklist.filter((c) => c.done).length;
        return (
            <li>
                <a href={`/interviews/${iv.id}`} className="flex items-center gap-3 rounded-xl border border-secondary bg-primary p-4 shadow-xs outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
                    <FeaturedIcon icon={CalendarCheck01} color="brand" theme="light" size="md" />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-primary">{job ? `${job.title}${job.company ? ` — ${job.company}` : ""}` : "Job removed"}</p>
                        <p className="truncate text-sm text-tertiary">
                            {iv.round} · {formatWhen(iv.when)}
                        </p>
                        {iv.outcome === "upcoming" && iv.checklist.length > 0 && (
                            <p className="mt-0.5 text-xs text-quaternary">
                                Prep {done}/{iv.checklist.length} done
                            </p>
                        )}
                    </div>
                    <Badge size="sm" color={outcome.color}>
                        {outcome.label}
                    </Badge>
                </a>
            </li>
        );
    };

    return (
        <Page>
            <JobsSubnav />
            <PageHeader
                title="Interviews"
                description="Every interview with its prep pack, checklist and calendar invite."
                actions={
                    <AddInterviewDialog>
                        <Button iconLeading={CalendarPlus01}>Add an interview</Button>
                    </AddInterviewDialog>
                }
            />
            {hydrated && interviews.length === 0 ? (
                <div className="mt-10 flex flex-col items-center text-center">
                    <FeaturedIcon icon={CalendarCheck01} color="gray" theme="modern" size="xl" />
                    <h2 className="mt-4 text-lg font-semibold text-primary">No interviews yet</h2>
                    <p className="mt-1 max-w-sm text-sm text-tertiary">When you get one, add it here: you&rsquo;ll get likely questions from the advert, your best answers lined up, a checklist and a calendar invite.</p>
                </div>
            ) : (
                <div className="mt-6 flex flex-col gap-8">
                    {upcoming.length > 0 && (
                        <section>
                            <h2 className="mb-3 text-sm font-semibold text-tertiary">Coming up</h2>
                            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {upcoming.map((iv) => (
                                    <Row key={iv.id} iv={iv} />
                                ))}
                            </ul>
                        </section>
                    )}
                    {past.length > 0 && (
                        <section>
                            <h2 className="mb-3 text-sm font-semibold text-tertiary">Past</h2>
                            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {past.map((iv) => (
                                    <Row key={iv.id} iv={iv} />
                                ))}
                            </ul>
                        </section>
                    )}
                </div>
            )}
        </Page>
    );
};
