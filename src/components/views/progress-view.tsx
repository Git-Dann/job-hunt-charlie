"use client";

import { ArrowRight, Stars02, Trophy01 } from "@untitledui/icons";
import { NativeSelect } from "@/components/base/select/select-native";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { JobsSubnav } from "@/components/app/jobs-subnav";
import { Card, CardHeader, Page, PageHeader } from "@/components/app/page-header";
import { funnel, nudge, streak, weeklyApplications } from "@/lib/progress";
import { setData, useAppData, useHydrated } from "@/lib/store";
import { cx } from "@/utils/cx";

export const ProgressView = () => {
    const { jobs, interviews, goals } = useAppData();
    const hydrated = useHydrated();
    if (!hydrated) return <Page>{null}</Page>;
    const target = goals.weeklyApplications;
    const weeks = weeklyApplications(jobs, new Date(), 8);
    const thisWeek = weeks[weeks.length - 1].count;
    const run = streak(weeks, target);
    const f = funnel(jobs, interviews);
    const peak = Math.max(target, ...weeks.map((w) => w.count), 1);

    const stages = [
        { label: "Saved", value: f.saved },
        { label: "Applied", value: f.applied },
        { label: "Interviews", value: f.interviewed },
        { label: "Offers", value: f.offers },
    ];

    return (
        <Page>
            <JobsSubnav />
            <PageHeader title="Progress" description="How your search is going, worked out from what you're already tracking." />

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <Card className="p-4 md:p-6 lg:col-span-2">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div>
                            <p className="text-sm font-medium text-tertiary">This week</p>
                            <p className="mt-1 text-display-sm font-semibold text-primary">
                                {thisWeek} <span className="text-lg font-medium text-tertiary">of {target} applications</span>
                            </p>
                        </div>
                        <NativeSelect
                            label="Weekly target"
                            size="sm"
                            className="sm:w-40"
                            value={String(target)}
                            onChange={(e) => setData((d) => ({ ...d, goals: { ...d.goals, weeklyApplications: Number(e.target.value) } }))}
                            options={[1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20].map((n) => ({ value: String(n), label: `${n} a week` }))}
                        />
                    </div>
                    <ProgressBar value={Math.min(thisWeek, target)} max={target} className="mt-4" />
                    <p className="mt-4 rounded-lg bg-secondary p-3 text-sm text-secondary">{nudge(f, thisWeek, target)}</p>

                    <p className="mt-6 text-sm font-semibold text-secondary">Applications per week</p>
                    <div className="mt-3 flex h-40 items-end gap-2" role="img" aria-label={`Applications per week for the last 8 weeks: ${weeks.map((w) => w.count).join(", ")}`}>
                        {weeks.map((w, i) => (
                            <div key={i} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                                <span className="text-xs font-semibold text-secondary">{w.count || ""}</span>
                                <div
                                    className={cx("w-full rounded-t-md", w.count >= target ? "bg-brand-solid" : "bg-quaternary", i === weeks.length - 1 && "ring-2 ring-brand ring-offset-1 ring-offset-bg-primary")}
                                    style={{ height: `${Math.max((w.count / peak) * 100, 3)}%` }}
                                />
                                <span className="text-[11px] text-quaternary">{w.start.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</span>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-quaternary">Weeks start on Monday. Purple bars hit your target.</p>
                </Card>

                <div className="flex flex-col gap-6">
                    <Card className="p-4 md:p-6">
                        <FeaturedIcon icon={Trophy01} color={run > 0 ? "brand" : "gray"} theme="light" size="md" />
                        <p className="mt-3 text-display-xs font-semibold text-primary">
                            {run} week{run === 1 ? "" : "s"}
                        </p>
                        <p className="text-sm text-tertiary">{run > 0 ? "in a row hitting your target. Keep it going!" : "streak. Hit your target this week to start one."}</p>
                    </Card>
                    <Card>
                        <CardHeader title="Need a plan?" description="Optional AI help, built from your goals and CV." />
                        <ul className="p-2">
                            {[
                                { id: "weekly-plan", t: "My weekly job search plan" },
                                { id: "role-ideas", t: "Am I targeting the right roles?" },
                                { id: "networking-plan", t: "Find unadvertised jobs" },
                            ].map((p) => (
                                <li key={p.id}>
                                    <a href={`/prompts?p=${p.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-secondary hover:bg-primary_hover">
                                        <Stars02 className="size-5 text-fg-brand-primary" aria-hidden />
                                        <span className="flex-1">{p.t}</span>
                                        <ArrowRight className="size-4 text-fg-quaternary" aria-hidden />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Card>
                </div>

                <Card className="lg:col-span-3">
                    <CardHeader title="Your funnel" description="From saving a job to getting an offer. Rates appear once there's enough to go on." />
                    <div className="grid grid-cols-2 gap-px bg-border-secondary sm:grid-cols-4">
                        {stages.map((s, i) => (
                            <div key={s.label} className="bg-primary p-4 md:p-6">
                                <p className="text-sm font-medium text-tertiary">{s.label}</p>
                                <p className="mt-1 text-display-xs font-semibold text-primary">{s.value}</p>
                                {i === 2 && <p className="mt-1 text-xs text-tertiary">{f.interviewRate !== null ? `${f.interviewRate}% of applications` : "Rate after 5 applications"}</p>}
                                {i === 3 && <p className="mt-1 text-xs text-tertiary">{f.offerRate !== null ? `${f.offerRate}% of interviews` : "Rate after 3 interviews"}</p>}
                            </div>
                        ))}
                    </div>
                    <p className="px-4 py-3 text-xs text-quaternary md:px-6">
                        For context: many UK job seekers hear back from somewhere around 1 in 10 to 1 in 5 applications. Tailored applications usually do better than that.
                    </p>
                </Card>
            </div>
        </Page>
    );
};
