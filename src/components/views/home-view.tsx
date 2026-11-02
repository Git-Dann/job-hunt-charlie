"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase01, CalendarCheck01, CheckCircle, Code02, File06, MarkerPin01, SearchLg, Stars02 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { BuildYourOwnDialog } from "@/components/app/build-your-own-dialog";
import { Card, CardHeader, Page } from "@/components/app/page-header";
import { profileCompleteness } from "@/lib/cv";
import { formatDate } from "@/lib/jobs";
import { useAppData, useHydrated } from "@/lib/store";
import { JOB_STATUSES } from "@/lib/types";
import { cx } from "@/utils/cx";

const QUICK_PROMPTS = [
    { id: "role-ideas", title: "What roles suit me?" },
    { id: "boolean", title: "Build my search strings" },
    { id: "linkedin-profile", title: "Rewrite my LinkedIn profile" },
    { id: "weekly-plan", title: "My weekly job search plan" },
];

export const HomeView = () => {
    const data = useAppData();
    const hydrated = useHydrated();
    const router = useRouter();
    const { profile, jobs } = data;
    const [keywords, setKeywords] = useState("");
    const [location, setLocation] = useState("");
    const completeness = profileCompleteness(profile);
    const firstName = profile.name.trim().split(" ")[0];

    const counts = Object.fromEntries(JOB_STATUSES.map((s) => [s.id, jobs.filter((j) => j.status === s.id).length]));
    const upcoming = jobs
        .filter((j) => j.nextStep && j.status !== "rejected")
        .sort((a, b) => (a.nextStepDate ?? "9999").localeCompare(b.nextStepDate ?? "9999"))
        .slice(0, 5);

    const steps = [
        { done: completeness.percent >= 60, title: "Add your CV", body: "Paste your current CV or fill in your details. Everything else builds on this.", href: "/cv", cta: "Add my CV" },
        { done: jobs.length > 0, title: "Find and save a job", body: "Search every big board at once, or check a company's careers page.", href: "/search", cta: "Find jobs" },
        { done: data.cvs.length > 0, title: "Tailor your CV to a job", body: "See which keywords you're missing and reorder your CV to match.", href: "/cv", cta: "Tailor a CV" },
        { done: false, title: "Use an AI prompt", body: "Cover letters, interview prep and more — built from your CV, ready to paste into ChatGPT or Claude.", href: "/prompts", cta: "Open prompts" },
    ];
    const showSteps = hydrated && steps.filter((s) => s.done).length < 3;

    const search = (e: React.FormEvent) => {
        e.preventDefault();
        const params = new URLSearchParams();
        if (keywords.trim()) params.set("q", keywords.trim());
        if (location.trim()) params.set("l", location.trim());
        router.push(`/search?${params}`);
    };

    return (
        <Page>
            <div className="flex flex-col gap-1">
                <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{hydrated && firstName ? `Hi ${firstName} 👋` : "Welcome 👋"}</h1>
                <p className="text-md text-tertiary">Everything for your job hunt in one place. It all saves on this device.</p>
            </div>

            <form onSubmit={search} className="mt-6 rounded-xl border border-secondary bg-secondary p-4 md:p-5">
                <p className="mb-3 text-sm font-semibold text-secondary">Start a search</p>
                <div className="flex flex-col gap-3 md:flex-row">
                    <Input
                        aria-label="Job title or keywords"
                        placeholder={profile.targetRoles || "Job title or keywords"}
                        icon={SearchLg}
                        value={keywords}
                        onChange={setKeywords}
                        size="md"
                        className="flex-1"
                    />
                    <Input
                        aria-label="Location"
                        placeholder={profile.targetLocation || "Location or Remote"}
                        icon={MarkerPin01}
                        value={location}
                        onChange={setLocation}
                        size="md"
                        className="md:w-60"
                    />
                    <Button type="submit" size="lg" iconTrailing={ArrowRight}>
                        Search
                    </Button>
                </div>
            </form>

            <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {JOB_STATUSES.slice(0, 4).map((s) => (
                    <a
                        key={s.id}
                        href={`/jobs?status=${s.id}`}
                        className="rounded-xl border border-secondary bg-primary p-4 shadow-xs outline-focus-ring transition hover:bg-primary_hover focus-visible:outline-2"
                    >
                        <p className="text-sm font-medium text-tertiary">{s.label}</p>
                        <p className="mt-1 text-display-sm font-semibold text-primary">{hydrated ? counts[s.id] : "–"}</p>
                    </a>
                ))}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                    {showSteps && (
                        <Card>
                            <CardHeader title="Get set up" description="Four quick steps to get the most out of this." />
                            <ol className="divide-y divide-secondary">
                                {steps.map((s, i) => (
                                    <li key={s.title} className="flex gap-4 px-4 py-4 md:px-6">
                                        <span
                                            className={cx(
                                                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                                                s.done ? "bg-success-solid text-white" : "bg-secondary text-tertiary ring-1 ring-secondary ring-inset",
                                            )}
                                        >
                                            {s.done ? <CheckCircle className="size-5" /> : i + 1}
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className={cx("text-sm font-semibold", s.done ? "text-tertiary line-through" : "text-primary")}>{s.title}</p>
                                            <p className="mt-0.5 text-sm text-tertiary">{s.body}</p>
                                        </div>
                                        {!s.done && (
                                            <Button size="sm" color="secondary" href={s.href} className="shrink-0 self-center max-sm:hidden">
                                                {s.cta}
                                            </Button>
                                        )}
                                    </li>
                                ))}
                            </ol>
                        </Card>
                    )}

                    <Card>
                        <CardHeader
                            title="Coming up"
                            description="Next steps you've set on your applications."
                            actions={
                                <Button size="sm" color="link-color" href="/jobs" iconTrailing={ArrowRight}>
                                    All applications
                                </Button>
                            }
                        />
                        {hydrated && upcoming.length ? (
                            <ul className="divide-y divide-secondary">
                                {upcoming.map((j) => (
                                    <li key={j.id}>
                                        <a href={`/jobs/${j.id}`} className="flex items-center gap-3 px-4 py-3 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 md:px-6">
                                            <FeaturedIcon icon={CalendarCheck01} color="gray" theme="modern" size="md" />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-semibold text-primary">{j.nextStep}</p>
                                                <p className="truncate text-sm text-tertiary">
                                                    {j.title} · {j.company}
                                                </p>
                                            </div>
                                            {j.nextStepDate && (
                                                <Badge size="sm" color="brand">
                                                    {formatDate(j.nextStepDate, { weekday: "short", day: "numeric", month: "short" })}
                                                </Badge>
                                            )}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="px-4 py-6 text-sm text-tertiary md:px-6">
                                Nothing scheduled. Open a saved job and add a next step — like &ldquo;Follow up&rdquo; or &ldquo;Interview&rdquo; — to see it here.
                            </p>
                        )}
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <Card className="p-4 md:p-5">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={File06} color="brand" theme="light" size="md" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-primary">Your CV</p>
                                <p className="text-sm text-tertiary">{hydrated ? `${completeness.percent}% complete` : " "}</p>
                            </div>
                        </div>
                        <ProgressBar value={hydrated ? completeness.percent : 0} className="mt-4" />
                        {hydrated && completeness.missing.length > 0 && (
                            <p className="mt-3 text-sm text-tertiary">Still to add: {completeness.missing.slice(0, 3).join(", ")}.</p>
                        )}
                        <Button size="sm" color="secondary" href="/cv" className="mt-4 w-full">
                            {completeness.percent > 0 ? "Edit my CV" : "Add my CV"}
                        </Button>
                    </Card>

                    <Card>
                        <CardHeader title="Quick AI prompts" description="Built from your CV. Copy into any AI chat." />
                        <ul className="p-2">
                            {QUICK_PROMPTS.map((p) => (
                                <li key={p.id}>
                                    <a
                                        href={`/prompts?p=${p.id}`}
                                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-secondary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2"
                                    >
                                        <Stars02 className="size-5 text-fg-brand-primary" aria-hidden />
                                        <span className="flex-1">{p.title}</span>
                                        <ArrowRight className="size-4 text-fg-quaternary" aria-hidden />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card className="p-4 md:p-5">
                        <div className="flex items-start gap-3">
                            <FeaturedIcon icon={Code02} color="gray" theme="modern" size="md" />
                            <div>
                                <p className="text-sm font-semibold text-primary">Build your own</p>
                                <p className="mt-0.5 text-sm text-tertiary">Prefer your own version? Get a prompt that builds this whole tool with an AI app builder.</p>
                            </div>
                        </div>
                        <BuildYourOwnDialog>
                            <Button size="sm" color="secondary" className="mt-4 w-full">
                                View the prompt
                            </Button>
                        </BuildYourOwnDialog>
                    </Card>

                    <div className="flex items-center gap-2 rounded-lg px-1 text-xs text-quaternary">
                        <Briefcase01 className="size-4" aria-hidden />
                        {hydrated ? `${jobs.length} job${jobs.length === 1 ? "" : "s"} tracked` : ""}
                    </div>
                </div>
            </div>
        </Page>
    );
};
