"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, File06, LinkExternal01, Stars02, Trash01, Users01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { KeywordMatch } from "@/components/app/keyword-match";
import { Card, CardHeader, Page } from "@/components/app/page-header";
import { linkedinPeopleSearch } from "@/lib/boards";
import { profileToText } from "@/lib/cv";
import { createCv } from "@/lib/cv-actions";
import { formatDate, removeJob, updateJob } from "@/lib/jobs";
import { matchKeywords } from "@/lib/keywords";
import { useAppData, useHydrated } from "@/lib/store";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";

const JOB_PROMPTS = [
    { id: "fit-check", title: "How well do I fit this job?" },
    { id: "tailor-cv", title: "Tailor my CV to this job" },
    { id: "cover-letter", title: "Write my cover letter" },
    { id: "company-research", title: "Research this company" },
    { id: "interview-prep", title: "Prepare me for the interview" },
    { id: "outreach", title: "Message the hiring manager" },
];

export const JobDetailView = ({ id }: { id: string }) => {
    const { jobs, profile, cvs } = useAppData();
    const hydrated = useHydrated();
    const router = useRouter();
    const job = jobs.find((j) => j.id === id);
    const cvText = useMemo(() => profileToText(profile), [profile]);
    const match = useMemo(() => (job?.description && cvText.length > 100 ? matchKeywords(`${job.title}\n${job.description}`, cvText) : null), [job, cvText]);

    if (!hydrated) return <Page>{null}</Page>;
    if (!job)
        return (
            <Page>
                <p className="text-md text-tertiary">This job isn&rsquo;t in your list any more.</p>
                <Button className="mt-4" href="/jobs" iconLeading={ArrowLeft} color="secondary">
                    Back to my applications
                </Button>
            </Page>
        );

    const tailoredCvs = cvs.filter((c) => c.jobId === job.id);
    const set = (patch: Parameters<typeof updateJob>[1]) => updateJob(job.id, patch);

    return (
        <Page>
            <Button size="sm" color="link-gray" href="/jobs" iconLeading={ArrowLeft}>
                My applications
            </Button>
            <div className="mt-4 flex flex-col gap-4 border-b border-secondary pb-5 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                        <Badge size="sm" type="modern" color="gray">
                            {job.source}
                        </Badge>
                        {job.salary && (
                            <Badge size="sm" color="gray">
                                {job.salary}
                            </Badge>
                        )}
                    </div>
                    <h1 className="mt-2 text-display-xs font-semibold break-words text-primary">{job.title}</h1>
                    <p className="mt-1 text-md text-tertiary">{[job.company, job.location].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    {job.url && (
                        <Button color="secondary" href={job.url} target="_blank" rel="noreferrer" iconTrailing={LinkExternal01}>
                            View advert
                        </Button>
                    )}
                    <NativeSelect
                        aria-label="Stage"
                        className="w-44"
                        value={job.status}
                        onChange={(e) => set({ status: e.target.value as JobStatus })}
                        options={JOB_STATUSES.map((s) => ({ value: s.id, label: s.label }))}
                    />
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <Card>
                        <CardHeader title="Next step" description="Shows on your home screen so nothing slips." />
                        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 md:px-6">
                            <Input label="What's next?" placeholder="e.g. Follow up, Interview, Send portfolio" value={job.nextStep ?? ""} onChange={(v) => set({ nextStep: v })} />
                            <Input label="When" type="date" value={job.nextStepDate ?? ""} onChange={(v) => set({ nextStepDate: v })} />
                            <Input label="Contact" placeholder="Recruiter or hiring manager" value={job.contact ?? ""} onChange={(v) => set({ contact: v })} />
                            <Input label="Applied on" type="date" value={job.appliedAt?.slice(0, 10) ?? ""} onChange={(v) => set({ appliedAt: v ? new Date(v).toISOString() : undefined })} />
                            <TextArea className="sm:col-span-2" label="Notes" rows={4} value={job.notes ?? ""} onChange={(v) => set({ notes: v })} placeholder="Who you spoke to, questions they asked, how you felt…" />
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="Job description" description="Paste or tidy the full advert. Your CV match and AI prompts use it." />
                        <div className="px-4 py-4 md:px-6">
                            <TextArea aria-label="Job description" rows={14} value={job.description ?? ""} onChange={(v) => set({ description: v })} placeholder="Paste the full job advert here." />
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader title="CV match" />
                        <div className="px-4 py-4 md:px-6">
                            {match ? (
                                <KeywordMatch result={match} compact />
                            ) : (
                                <p className="text-sm text-tertiary">{cvText.length > 100 ? "Paste the job description to see how well your CV matches." : "Add your CV to see how well you match."}</p>
                            )}
                            <Button
                                className="mt-5 w-full"
                                iconLeading={File06}
                                onClick={() => router.push(`/cv/${createCv({ jobId: job.id })}`)}
                                isDisabled={profile.experience.length === 0 && !profile.summary}
                            >
                                Tailor a CV for this job
                            </Button>
                            {tailoredCvs.length > 0 && (
                                <ul className="mt-3 flex flex-col gap-1">
                                    {tailoredCvs.map((c) => (
                                        <li key={c.id}>
                                            <a href={`/cv/${c.id}`} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm font-medium text-secondary hover:bg-primary_hover">
                                                <span className="truncate">{c.name}</span>
                                                <span className="text-xs text-quaternary">{formatDate(c.updatedAt)}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </Card>

                    <Card>
                        <CardHeader title="AI help for this job" description="Prompts filled in with this advert and your CV." />
                        <ul className="p-2">
                            {JOB_PROMPTS.map((p) => (
                                <li key={p.id}>
                                    <a
                                        href={`/prompts?p=${p.id}&job=${job.id}`}
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

                    {job.company && (
                        <Button color="secondary" iconLeading={Users01} href={linkedinPeopleSearch(job.company, job.title)} target="_blank" rel="noreferrer">
                            Find people at {job.company}
                        </Button>
                    )}

                    <Button
                        color="tertiary-destructive"
                        iconLeading={Trash01}
                        onClick={() => {
                            if (window.confirm(`Remove "${job.title}" from your list?`)) {
                                removeJob(job.id);
                                router.push("/jobs");
                            }
                        }}
                    >
                        Remove this job
                    </Button>
                </div>
            </div>
        </Page>
    );
};
