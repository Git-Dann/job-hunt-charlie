"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChevronDown, MessageTextSquare02, Plus, SearchLg, Stars02, Trash01, Upload01 } from "@untitledui/icons";
import { AppDialog } from "@/components/app/app-dialog";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { CopyButton } from "@/components/app/copy-button";
import { Card, CardHeader, Page, PageHeader } from "@/components/app/page-header";
import { STARTER_QUESTIONS, fillAnswer, intentsOf, matchAnswers, parseLimit, parseQaPairs, wordCount } from "@/lib/answers";
import { setData, uid, useAppData, useHydrated } from "@/lib/store";
import type { SavedAnswer } from "@/lib/types";
import { cx } from "@/utils/cx";

const tipFor = (question: string) => {
    const intents = new Set(intentsOf(question));
    return STARTER_QUESTIONS.find((s) => s.question === question || intentsOf(s.question).some((i) => intents.has(i)))?.tip;
};

/** Adds questions to the top of the bank; returns the id of the first one. */
const addAnswers = (items: { question: string; answer?: string }[]): string => {
    const created = items.map((x) => ({ id: uid(), question: x.question, answer: x.answer ?? "" }));
    setData((d) => ({ ...d, answers: [...created, ...d.answers] }));
    return created[0]?.id ?? "";
};

export const AnswersView = () => {
    const params = useSearchParams();
    const { answers, jobs } = useAppData();
    const hydrated = useHydrated();
    const [question, setQuestion] = useState("");
    const [jobId, setJobId] = useState(params.get("job") ?? "");
    const [limitText, setLimitText] = useState("");
    const [openId, setOpenId] = useState<string | null>(null);
    const [filter, setFilter] = useState("");

    const job = jobs.find((j) => j.id === jobId);
    const limit = parseLimit(limitText) ?? parseLimit(question);
    const matches = useMemo(() => (question.trim().length > 8 ? matchAnswers(question, answers) : []), [question, answers]);
    const filled = answers.filter((a) => a.answer.trim()).length;
    const missingStarters = STARTER_QUESTIONS.filter((s) => !answers.some((a) => a.question === s.question));
    const shown = answers.filter((a) => !filter.trim() || `${a.question} ${a.answer}`.toLowerCase().includes(filter.trim().toLowerCase()));

    const openAnswer = (id: string) => {
        setOpenId(id);
        setFilter("");
        setTimeout(() => document.getElementById(`answer-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    };

    return (
        <Page>
            <PageHeader
                title="Answer bank"
                description="Write your answers to the questions application forms keep asking — once. Next time, paste the question and your best answer is ready to copy."
                actions={
                    <>
                        <Button color="secondary" iconLeading={Stars02} href="/prompts?p=answer-bank-builder">
                            Draft them with AI
                        </Button>
                        <ImportAnswersDialog />
                    </>
                }
            />

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Card className="self-start">
                    <CardHeader title="Answer a question" description="Paste a question from an application form." />
                    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
                        <TextArea label="The question" rows={3} value={question} onChange={setQuestion} placeholder="e.g. What attracts you to this role? (max 250 words)" />
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {jobs.length > 0 && (
                                <NativeSelect
                                    label="For which job?"
                                    value={jobId}
                                    onChange={(e) => setJobId(e.target.value)}
                                    hint="Fills in {company} and {role}."
                                    options={[{ value: "", label: "Not for a saved job" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title}${j.company ? ` — ${j.company}` : ""}` }))]}
                                />
                            )}
                            <Input label="Word or character limit" placeholder="e.g. 250 words" value={limitText} onChange={setLimitText} hint={limit && !limitText ? `Found in the question: ${limit.n} ${limit.unit}` : undefined} />
                        </div>

                        {question.trim().length > 8 &&
                            (matches.length ? (
                                <div className="flex flex-col gap-3">
                                    {matches.map((m, i) => {
                                        const text = fillAnswer(m.answer.answer, job);
                                        const size = limit?.unit === "characters" ? text.length : wordCount(text);
                                        const over = limit ? size > limit.n : false;
                                        const unfilled = /\{(company|role)\}/i.test(text);
                                        return (
                                            <div key={m.answer.id} className={cx("rounded-xl border p-4", i === 0 ? "border-brand bg-brand-primary_alt" : "border-secondary")}>
                                                <div className="flex flex-wrap items-center gap-2">
                                                    {i === 0 && (
                                                        <Badge size="sm" color="brand">
                                                            Best match
                                                        </Badge>
                                                    )}
                                                    <span className="text-xs text-tertiary">{m.reason}</span>
                                                </div>
                                                <p className="mt-2 text-sm font-semibold text-secondary">{m.answer.question}</p>
                                                <p className="mt-2 text-sm whitespace-pre-wrap text-secondary">{text}</p>
                                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                                    <CopyButton text={text} label="Copy answer" color={i === 0 ? "primary" : "secondary"} />
                                                    <Button size="sm" color="tertiary" onClick={() => openAnswer(m.answer.id)}>
                                                        Edit
                                                    </Button>
                                                    <Badge size="sm" color={over ? "error" : "gray"}>
                                                        {size} {limit?.unit ?? "words"}
                                                        {limit ? ` / ${limit.n}` : ""}
                                                    </Badge>
                                                </div>
                                                {over && <p className="mt-2 text-xs text-error-primary">Over the limit by {size - limit!.n} — trim it before pasting.</p>}
                                                {unfilled && <p className="mt-2 text-xs text-warning-primary">Pick the job above to fill in {"{company}"} and {"{role}"}.</p>}
                                            </div>
                                        );
                                    })}
                                    <Button size="sm" color="link-color" className="self-start" onClick={() => openAnswer(addAnswers([{ question: question.trim() }]))}>
                                        None of these fit? Save this as a new question
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-xl border border-dashed border-primary p-4">
                                    <p className="text-sm font-semibold text-secondary">No saved answer for this yet</p>
                                    {tipFor(question) && <p className="mt-1 text-sm text-tertiary">Tip: {tipFor(question)}</p>}
                                    <Button
                                        size="sm"
                                        className="mt-3"
                                        iconLeading={Plus}
                                        onClick={() => openAnswer(addAnswers([{ question: question.trim() }]))}
                                    >
                                        Save the question and answer it
                                    </Button>
                                </div>
                            ))}
                    </div>
                </Card>

                <div>
                    <Card>
                        <CardHeader
                            title="Your answers"
                            description={hydrated ? `${filled} of ${answers.length} answered. Use {company} and {role} and they fill themselves in.` : undefined}
                            actions={
                                <Button size="sm" color="secondary" iconLeading={Plus} onClick={() => openAnswer(addAnswers([{ question: "" }]))}>
                                    Add
                                </Button>
                            }
                        />
                        {hydrated && answers.length === 0 ? (
                            <div className="flex flex-col items-center px-4 py-8 text-center md:px-6">
                                <FeaturedIcon icon={MessageTextSquare02} color="brand" theme="light" size="lg" />
                                <p className="mt-3 text-sm font-semibold text-primary">Start with the questions almost every form asks</p>
                                <p className="mt-1 max-w-sm text-sm text-tertiary">Why us, tell us about yourself, teamwork, notice period, salary… Answer each once and you&rsquo;re set.</p>
                                <Button className="mt-4" onClick={() => addAnswers(STARTER_QUESTIONS.map((s) => ({ question: s.question })))}>
                                    Add the {STARTER_QUESTIONS.length} common questions
                                </Button>
                            </div>
                        ) : (
                            <>
                                {answers.length > 5 && (
                                    <div className="px-4 pt-4 md:px-6">
                                        <Input aria-label="Search your answers" placeholder="Search your answers" icon={SearchLg} size="sm" value={filter} onChange={setFilter} />
                                    </div>
                                )}
                                <ul className="divide-y divide-secondary">
                                    {shown.map((a) => (
                                        <AnswerRow key={a.id} a={a} open={openId === a.id} onToggle={() => setOpenId(openId === a.id ? null : a.id)} />
                                    ))}
                                </ul>
                                {missingStarters.length > 0 && (
                                    <div className="border-t border-secondary px-4 py-4 md:px-6">
                                        <Button size="sm" color="link-color" onClick={() => addAnswers(missingStarters.map((s) => ({ question: s.question })))}>
                                            Add {missingStarters.length} more common question{missingStarters.length === 1 ? "" : "s"}
                                        </Button>
                                    </div>
                                )}
                            </>
                        )}
                    </Card>
                </div>
            </div>
        </Page>
    );
};

const AnswerRow = ({ a, open, onToggle }: { a: SavedAnswer; open: boolean; onToggle: () => void }) => {
    const set = (patch: Partial<SavedAnswer>) => setData((d) => ({ ...d, answers: d.answers.map((x) => (x.id === a.id ? { ...x, ...patch } : x)) }));
    const tip = tipFor(a.question);
    return (
        <li id={`answer-${a.id}`} className="scroll-mt-20">
            <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-4 py-3 text-left outline-focus-ring hover:bg-primary_hover focus-visible:outline-2 md:px-6">
                <span className={cx("size-2 shrink-0 rounded-full", a.answer.trim() ? "bg-success-solid" : "bg-quaternary")} aria-hidden />
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-secondary">{a.question || "New question"}</span>
                    <span className="block truncate text-sm text-tertiary">{a.answer.trim() ? a.answer : "Not answered yet"}</span>
                </span>
                <ChevronDown className={cx("size-4 shrink-0 text-fg-quaternary transition", open && "rotate-180")} aria-hidden />
            </button>
            {open && (
                <div className="flex flex-col gap-3 px-4 pb-4 md:px-6">
                    <Input label="Question" value={a.question} onChange={(v) => set({ question: v })} />
                    <TextArea label="Your answer" rows={7} value={a.answer} onChange={(v) => set({ answer: v })} hint={`${wordCount(a.answer)} words${tip ? ` · Tip: ${tip}` : ""}`} />
                    <div className="flex flex-wrap gap-2">
                        {a.answer.trim() && <CopyButton text={a.answer} label="Copy" />}
                        <Button
                            size="sm"
                            color="tertiary-destructive"
                            iconLeading={Trash01}
                            onClick={() => (!a.answer.trim() || window.confirm("Delete this answer?")) && setData((d) => ({ ...d, answers: d.answers.filter((x) => x.id !== a.id) }))}
                        >
                            Delete
                        </Button>
                    </div>
                </div>
            )}
        </li>
    );
};

/** Paste the "Fill my answer bank" prompt's output (Q:/A: pairs). Existing questions are updated, new ones added. */
const ImportAnswersDialog = () => {
    const [text, setText] = useState("");
    const pairs = parseQaPairs(text);
    return (
        <AppDialog
            trigger={
                <Button color="secondary" iconLeading={Upload01}>
                    Import answers
                </Button>
            }
            icon={Upload01}
            width="lg"
            title="Import answers"
            description={'Paste answers written as "Q: …" and "A: …" — exactly what the "Fill my answer bank" prompt gives you.'}
            footer={(close) => (
                <>
                    <Button color="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        isDisabled={!pairs.length}
                        onClick={() => {
                            setData((d) => {
                                const byQuestion = new Map(d.answers.map((a) => [a.question.trim().toLowerCase(), a]));
                                const updated = d.answers.map((a) => {
                                    const hit = pairs.find((p) => p.question.trim().toLowerCase() === a.question.trim().toLowerCase());
                                    return hit ? { ...a, answer: hit.answer } : a;
                                });
                                const added = pairs.filter((p) => !byQuestion.has(p.question.trim().toLowerCase())).map((p) => ({ id: uid(), ...p }));
                                return { ...d, answers: [...added, ...updated] };
                            });
                            setText("");
                            close();
                        }}
                    >
                        {pairs.length ? `Import ${pairs.length} answer${pairs.length === 1 ? "" : "s"}` : "Import"}
                    </Button>
                </>
            )}
        >
            <TextArea aria-label="Answers to import" rows={14} value={text} onChange={setText} placeholder={"Q: Why do you want to work for {company}?\nA: …\n\nQ: What is your notice period?\nA: …"} />
            <p className="mt-3 text-sm text-tertiary">
                {pairs.length ? `Found ${pairs.length} answer${pairs.length === 1 ? "" : "s"}. Questions you already have are updated; new ones are added.` : "Nothing recognised yet."}
            </p>
        </AppDialog>
    );
};
