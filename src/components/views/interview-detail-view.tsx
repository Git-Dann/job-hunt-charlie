"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarPlus01, CheckCircle, Plus, Stars02, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { CopyButton } from "@/components/app/copy-button";
import { Card, CardHeader, Page } from "@/components/app/page-header";
import { fillAnswer } from "@/lib/answers";
import { deleteInterview, downloadFile, formatWhen, updateInterview } from "@/lib/interview-actions";
import { FORMATS, OUTCOMES, QUESTIONS_TO_ASK, focusAreas, interviewIcs, likelyQuestions } from "@/lib/interviews";
import { setData, uid, useAppData, useHydrated } from "@/lib/store";
import type { Interview } from "@/lib/types";

export const InterviewDetailView = ({ id }: { id: string }) => {
    const { interviews, jobs, answers } = useAppData();
    const hydrated = useHydrated();
    const router = useRouter();
    const iv = interviews.find((i) => i.id === id);
    const job = jobs.find((j) => j.id === iv?.jobId);
    const questions = useMemo(() => (job ? likelyQuestions(job, answers) : []), [job, answers]);
    const focus = useMemo(() => (job ? focusAreas(job) : []), [job]);
    const [newItem, setNewItem] = useState("");

    if (!hydrated) return <Page>{null}</Page>;
    if (!iv)
        return (
            <Page>
                <p className="text-tertiary">This interview doesn&rsquo;t exist any more.</p>
                <Button className="mt-4" color="secondary" href="/interviews" iconLeading={ArrowLeft}>
                    Interviews
                </Button>
            </Page>
        );

    const set = (patch: Partial<Interview>) => updateInterview(iv.id, patch);
    const done = iv.checklist.filter((c) => c.done).length;
    const answered = questions.filter((q) => q.answer).length;

    return (
        <Page>
            <Button size="sm" color="link-gray" href="/interviews" iconLeading={ArrowLeft}>
                Interviews
            </Button>
            <div className="mt-4 flex flex-col gap-4 border-b border-secondary pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-brand-secondary">{iv.round}</p>
                    <h1 className="mt-1 text-display-xs font-semibold break-words text-primary">{job ? job.title : "Job removed"}</h1>
                    <p className="mt-1 text-md text-tertiary">
                        {[job?.company, formatWhen(iv.when), FORMATS.find((f) => f.id === iv.format)?.label].filter(Boolean).join(" · ")}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        iconLeading={CalendarPlus01}
                        isDisabled={!job || !iv.when}
                        onClick={() => job && downloadFile(`interview-${(job.company || job.title).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.ics`, interviewIcs(iv, job, new Date().toISOString()), "text/calendar")}
                    >
                        Add to calendar
                    </Button>
                    <NativeSelect
                        aria-label="Outcome"
                        className="w-52"
                        value={iv.outcome}
                        onChange={(e) => {
                            const outcome = e.target.value as Interview["outcome"];
                            set({ outcome });
                            if (job && (outcome === "offer" || outcome === "rejected"))
                                setData((d) => ({ ...d, jobs: d.jobs.map((j) => (j.id === job.id ? { ...j, status: outcome === "offer" ? "offer" : "rejected" } : j)) }));
                        }}
                        options={OUTCOMES.map((o) => ({ value: o.id, label: o.label }))}
                    />
                </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="flex flex-col gap-6 lg:col-span-2">
                    <Card>
                        <CardHeader
                            title="Likely questions"
                            description={`Built from the advert. ${answered} of ${questions.length} have a matching answer in your answer bank.`}
                            actions={
                                <Button size="sm" color="secondary" href={`/answers${job ? `?job=${job.id}` : ""}`}>
                                    Answer bank
                                </Button>
                            }
                        />
                        <ul className="divide-y divide-secondary">
                            {questions.map((q) => (
                                <li key={q.question} className="px-4 py-4 md:px-6">
                                    <div className="flex items-start gap-3">
                                        {q.answer ? (
                                            <CheckCircle className="mt-0.5 size-5 shrink-0 text-fg-success-primary" aria-label="You have an answer" />
                                        ) : (
                                            <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-quaternary" aria-label="No answer yet" />
                                        )}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-semibold text-primary">{q.question}</p>
                                            {q.because && <p className="text-xs text-tertiary">{q.because}</p>}
                                            {q.answer ? (
                                                <details className="mt-2">
                                                    <summary className="cursor-pointer text-sm font-medium text-brand-secondary">Your answer</summary>
                                                    <p className="mt-2 rounded-lg bg-secondary p-3 text-sm whitespace-pre-wrap text-secondary">{fillAnswer(q.answer.answer, job)}</p>
                                                </details>
                                            ) : (
                                                <a href="/answers" className="mt-1 inline-block text-sm font-medium text-brand-secondary hover:underline">
                                                    Prepare an answer →
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    <Card>
                        <CardHeader title="Notes" description="Research, the stories you'll use, and how it went afterwards." />
                        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 md:px-6">
                            <Input label="Date and time" type="datetime-local" value={iv.when} onChange={(v) => set({ when: v })} />
                            <Input label="Who you're meeting" value={iv.interviewers} onChange={(v) => set({ interviewers: v })} />
                            <Input className="sm:col-span-2" label="Link or address" value={iv.where} onChange={(v) => set({ where: v })} />
                            <TextArea className="sm:col-span-2" label="Prep notes" rows={5} value={iv.notes} onChange={(v) => set({ notes: v })} placeholder="What you learnt about the company, your 3 key messages, stories to use…" />
                            <TextArea
                                className="sm:col-span-2"
                                label="Afterwards: how did it go?"
                                rows={4}
                                value={iv.feedback}
                                onChange={(v) => set({ feedback: v })}
                                placeholder="Questions they asked, what went well, what to improve, any feedback."
                            />
                        </div>
                    </Card>
                </div>

                <div className="flex flex-col gap-6">
                    <Card>
                        <CardHeader title="Checklist" description={`${done} of ${iv.checklist.length} done`} />
                        <ul className="flex flex-col gap-3 px-4 py-4 md:px-6">
                            {iv.checklist.map((c) => (
                                <li key={c.id} className="flex items-start gap-2">
                                    <Checkbox
                                        className="flex-1"
                                        label={c.text}
                                        isSelected={c.done}
                                        onChange={(v) => set({ checklist: iv.checklist.map((x) => (x.id === c.id ? { ...x, done: v } : x)) })}
                                    />
                                    <button type="button" aria-label={`Remove "${c.text}"`} className="text-fg-quaternary hover:text-fg-quaternary_hover" onClick={() => set({ checklist: iv.checklist.filter((x) => x.id !== c.id) })}>
                                        <Trash01 className="size-4" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <form
                            className="flex gap-2 border-t border-secondary px-4 py-3 md:px-6"
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!newItem.trim()) return;
                                set({ checklist: [...iv.checklist, { id: uid(), text: newItem.trim(), done: false }] });
                                setNewItem("");
                            }}
                        >
                            <Input aria-label="Add to checklist" placeholder="Add something…" size="sm" value={newItem} onChange={setNewItem} className="flex-1" />
                            <Button type="submit" size="sm" color="secondary" iconLeading={Plus} aria-label="Add" />
                        </form>
                    </Card>

                    {focus.length > 0 && (
                        <Card>
                            <CardHeader title="What they'll probe" description="The words this advert keeps coming back to." />
                            <div className="flex flex-wrap gap-1.5 px-4 py-4 md:px-6">
                                {focus.map((f) => (
                                    <Badge key={f} size="sm" color="gray">
                                        {f}
                                    </Badge>
                                ))}
                            </div>
                        </Card>
                    )}

                    <Card>
                        <CardHeader title="Questions to ask them" actions={<CopyButton text={iv.questionsToAsk || QUESTIONS_TO_ASK.join("\n")} label="Copy" />} />
                        <div className="px-4 py-4 md:px-6">
                            <TextArea aria-label="Questions to ask" rows={8} value={iv.questionsToAsk || QUESTIONS_TO_ASK.join("\n")} onChange={(v) => set({ questionsToAsk: v })} hint="Edit to make them yours." />
                        </div>
                    </Card>

                    {job && (
                        <Card>
                            <CardHeader title="Go deeper with AI" description="Optional. Filled in with this job and your CV." />
                            <ul className="p-2">
                                {[
                                    { id: "interview-prep", t: "Full interview prep pack" },
                                    { id: "mock-interview", t: "Practise with a mock interview" },
                                    { id: "company-research", t: "Research the company" },
                                    { id: "thank-you", t: "Thank-you email afterwards" },
                                ].map((p) => (
                                    <li key={p.id}>
                                        <a href={`/prompts?p=${p.id}&job=${job.id}`} className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm font-medium text-secondary hover:bg-primary_hover">
                                            <Stars02 className="size-5 text-fg-brand-primary" aria-hidden />
                                            <span className="flex-1">{p.t}</span>
                                            <ArrowRight className="size-4 text-fg-quaternary" aria-hidden />
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    )}

                    <div className="flex flex-col gap-2">
                        {job && (
                            <Button color="secondary" href={`/jobs/${job.id}`}>
                                Open the job
                            </Button>
                        )}
                        <Button
                            color="tertiary-destructive"
                            iconLeading={Trash01}
                            onClick={() => {
                                if (window.confirm("Delete this interview?")) {
                                    deleteInterview(iv.id);
                                    router.push("/interviews");
                                }
                            }}
                        >
                            Delete interview
                        </Button>
                    </div>
                </div>
            </div>
        </Page>
    );
};
