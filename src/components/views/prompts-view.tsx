"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ChevronRight, Copy01, LinkExternal01, MessageChatCircle, SearchLg, Stars02, Zap } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { CopyButton } from "@/components/app/copy-button";
import { Card, Page, PageHeader } from "@/components/app/page-header";
import { profileToText, resolveCv, resolvedToText } from "@/lib/cv";
import { CHAT_HOME, PROMPTS, PROMPT_CATEGORIES, type PromptTemplate, chatLinks, getPrompt } from "@/lib/prompts";
import { useAppData, useHydrated } from "@/lib/store";
import { useRunAi } from "@/lib/use-ai";
import { useClipboard } from "@/hooks/use-clipboard";
import { cx } from "@/utils/cx";

export const PromptsView = () => {
    const params = useSearchParams();
    const router = useRouter();
    const selectedId = params.get("p");
    const selected = selectedId ? getPrompt(selectedId) : undefined;
    const [query, setQuery] = useState("");

    const select = (id: string | null) => {
        const next = new URLSearchParams(params.toString());
        if (id) next.set("p", id);
        else next.delete("p");
        router.push(`/prompts?${next}`, { scroll: false });
        if (id && window.innerWidth < 1024) window.scrollTo({ top: 0 });
    };

    const groups = useMemo(() => {
        const q = query.trim().toLowerCase();
        return PROMPT_CATEGORIES.map((c) => ({
            ...c,
            items: PROMPTS.filter((p) => p.category === c.id && (!q || `${p.title} ${p.description}`.toLowerCase().includes(q))),
        })).filter((g) => g.items.length);
    }, [query]);

    return (
        <Page>
            <div className={cx(selected && "max-lg:hidden")}>
                <PageHeader
                    title="AI prompts"
                    description="Expert prompts filled in with your CV and the job. Copy into ChatGPT, Claude or Gemini — free accounts work fine."
                />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
                <nav aria-label="Prompts" className={cx("flex flex-col gap-5", selected && "max-lg:hidden")}>
                    <Input aria-label="Search prompts" placeholder="Search prompts" icon={SearchLg} value={query} onChange={setQuery} size="sm" />
                    {groups.map((g) => (
                        <div key={g.id}>
                            <p className="mb-1 px-2 text-xs font-semibold tracking-wide text-quaternary uppercase">{g.label}</p>
                            <ul className="flex flex-col gap-0.5">
                                {g.items.map((p) => (
                                    <li key={p.id}>
                                        <button
                                            type="button"
                                            onClick={() => select(p.id)}
                                            aria-current={selected?.id === p.id ? "true" : undefined}
                                            className={cx(
                                                "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left outline-focus-ring focus-visible:outline-2",
                                                selected?.id === p.id ? "bg-secondary" : "hover:bg-primary_hover",
                                            )}
                                        >
                                            <span className="min-w-0 flex-1">
                                                <span className="block text-sm font-semibold text-secondary">{p.title}</span>
                                                <span className="block text-sm text-tertiary lg:truncate">{p.description}</span>
                                            </span>
                                            <ChevronRight className="size-4 shrink-0 text-fg-quaternary" aria-hidden />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                    {groups.length === 0 && <p className="px-2 text-sm text-tertiary">No prompts match &ldquo;{query}&rdquo;.</p>}
                </nav>

                <div className={cx("min-w-0", !selected && "max-lg:hidden")}>
                    {selected ? (
                        <PromptBuilder key={selected.id} prompt={selected} onBack={() => select(null)} />
                    ) : (
                        <Card className="flex flex-col items-center p-10 text-center">
                            <FeaturedIcon icon={Stars02} color="brand" theme="light" size="xl" />
                            <h2 className="mt-4 text-lg font-semibold text-primary">Pick a prompt</h2>
                            <p className="mt-1 max-w-md text-sm text-tertiary">
                                Each one is written like an expert brief and fills itself in with your CV and the job you choose. You just copy it into an AI chat.
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </Page>
    );
};

const PromptBuilder = ({ prompt, onBack }: { prompt: PromptTemplate; onBack: () => void }) => {
    const params = useSearchParams();
    const data = useAppData();
    const hydrated = useHydrated();
    const { profile, jobs, cvs, ai } = data;
    const [jobId, setJobId] = useState(params.get("job") ?? "");
    const [cvId, setCvId] = useState(params.get("cv") ?? "");
    const [pasted, setPasted] = useState({ title: "", company: "", description: "" });
    const [fields, setFields] = useState<Record<string, string>>({});
    const [showFull, setShowFull] = useState(false);
    const aiRun = useRunAi();
    const { copied, copy } = useClipboard();

    // Default to the CV tailored for the chosen job, if there is one.
    useEffect(() => {
        if (!hydrated || params.get("cv")) return;
        const tailored = cvs.find((c) => c.jobId && c.jobId === jobId);
        setCvId(tailored?.id ?? "");
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId, hydrated]);

    const job = jobs.find((j) => j.id === jobId);
    const cvVersion = cvs.find((c) => c.id === cvId) ?? null;
    const cvText = cvVersion ? resolvedToText(resolveCv(profile, cvVersion)) : profileToText(profile);
    const hasCv = profile.experience.length > 0 || profile.summary.trim().length > 0;

    const text = prompt.build({
        cv: hasCv ? cvText : "",
        name: profile.name,
        targetRoles: profile.targetRoles,
        targetLocation: profile.targetLocation,
        workPreference: profile.workPreference,
        salaryExpectation: profile.salaryExpectation,
        job: prompt.needsJob
            ? job
                ? { title: job.title, company: job.company, description: job.description ?? "", url: job.url, location: job.location }
                : pasted.description.trim() || pasted.title.trim()
                  ? pasted
                  : undefined
            : undefined,
        fields,
    });

    const links = chatLinks(text);
    const openChat = async (id: string, href: string | null) => {
        if (href) {
            window.open(href, "_blank", "noopener");
            return;
        }
        await copy(text, id);
        window.open(CHAT_HOME[id], "_blank", "noopener");
    };

    return (
        <div className="flex flex-col gap-5">
            <Button size="sm" color="link-gray" iconLeading={ArrowLeft} onClick={onBack} className="self-start lg:hidden">
                All prompts
            </Button>
            <div>
                <div className="flex flex-wrap items-center gap-2">
                    <Badge size="sm" color="brand">
                        {PROMPT_CATEGORIES.find((c) => c.id === prompt.category)?.label}
                    </Badge>
                    {prompt.conversational && (
                        <Badge size="sm" color="gray">
                            Conversation
                        </Badge>
                    )}
                </div>
                <h2 className="mt-2 text-display-xs font-semibold text-primary">{prompt.title}</h2>
                <p className="mt-1 text-md text-tertiary">{prompt.description}</p>
            </div>

            {hydrated && !hasCv && (
                <div className="rounded-xl border border-utility-yellow-200 bg-warning-primary p-4 text-sm text-warning-primary">
                    Your CV isn&rsquo;t added yet, so the prompt will ask the AI to request it.{" "}
                    <a href="/cv" className="font-semibold underline">
                        Add your CV
                    </a>{" "}
                    for much better answers.
                </div>
            )}

            <Card className="p-4 md:p-6">
                <p className="text-sm font-semibold text-primary">Fill it in</p>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {prompt.needsJob && (
                        <NativeSelect
                            className="sm:col-span-2"
                            label="Which job?"
                            value={jobId}
                            onChange={(e) => setJobId(e.target.value)}
                            options={[{ value: "", label: "Paste an advert instead" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title}${j.company ? ` — ${j.company}` : ""}` }))]}
                        />
                    )}
                    {prompt.needsJob && !job && (
                        <>
                            <Input label="Job title" value={pasted.title} onChange={(v) => setPasted((p) => ({ ...p, title: v }))} />
                            <Input label="Company" value={pasted.company} onChange={(v) => setPasted((p) => ({ ...p, company: v }))} />
                            <TextArea
                                className="sm:col-span-2"
                                label="Job advert"
                                rows={6}
                                value={pasted.description}
                                onChange={(v) => setPasted((p) => ({ ...p, description: v }))}
                                placeholder="Paste the full job advert"
                            />
                        </>
                    )}
                    {prompt.needsJob && job && !job.description?.trim() && (
                        <p className="text-sm text-warning-primary sm:col-span-2">
                            This saved job has no description yet.{" "}
                            <a href={`/jobs/${job.id}`} className="font-semibold underline">
                                Paste the advert into it
                            </a>{" "}
                            for a much better result.
                        </p>
                    )}
                    {cvs.length > 0 && (
                        <NativeSelect
                            className="sm:col-span-2"
                            label="Which CV?"
                            value={cvId}
                            onChange={(e) => setCvId(e.target.value)}
                            options={[{ value: "", label: "All my details" }, ...cvs.map((c) => ({ value: c.id, label: c.name }))]}
                        />
                    )}
                    {prompt.fields?.map((f) =>
                        f.multiline ? (
                            <TextArea
                                key={f.id}
                                className="sm:col-span-2"
                                label={f.label}
                                placeholder={f.placeholder}
                                rows={5}
                                value={fields[f.id] ?? ""}
                                onChange={(v) => setFields((x) => ({ ...x, [f.id]: v }))}
                            />
                        ) : (
                            <Input
                                key={f.id}
                                className="sm:col-span-2"
                                label={f.label}
                                placeholder={f.placeholder}
                                value={fields[f.id] ?? ""}
                                onChange={(v) => setFields((x) => ({ ...x, [f.id]: v }))}
                            />
                        ),
                    )}
                    {!prompt.needsJob && !prompt.fields?.length && cvs.length === 0 && (
                        <p className="text-sm text-tertiary sm:col-span-2">Nothing to fill in — this one uses your CV and goals.</p>
                    )}
                </div>
            </Card>

            <Card>
                <div className="flex flex-col gap-3 border-b border-secondary px-4 py-4 sm:flex-row sm:items-center sm:justify-between md:px-6">
                    <div>
                        <p className="text-sm font-semibold text-primary">Your prompt</p>
                        <p className="text-xs text-tertiary">{text.length.toLocaleString("en-GB")} characters · ready to paste</p>
                    </div>
                    <Button size="sm" color="link-gray" onClick={() => setShowFull((s) => !s)}>
                        {showFull ? "Show less" : "Show all"}
                    </Button>
                </div>
                <pre
                    className={cx(
                        "overflow-auto px-4 py-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-secondary md:px-6",
                        showFull ? "max-h-[70dvh]" : "max-h-64",
                    )}
                >
                    {text}
                </pre>
                <div className="flex flex-col gap-3 border-t border-secondary px-4 py-4 md:px-6">
                    <Button size="lg" iconLeading={Copy01} onClick={() => copy(text, "main")}>
                        {copied === "main" ? "Copied — now paste it into your AI chat" : "Copy prompt"}
                    </Button>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {links.map((l) => (
                            <Button key={l.id} size="sm" color="secondary" iconTrailing={LinkExternal01} onClick={() => openChat(l.id, l.href)}>
                                {copied === l.id ? "Copied ✓" : l.label}
                            </Button>
                        ))}
                    </div>
                    <p className="text-xs text-quaternary">
                        ChatGPT and Claude open with the prompt filled in. For Gemini and Copilot it&rsquo;s copied first — just paste.
                        {prompt.conversational && " This one is a conversation: paste it, then answer the AI's questions."}
                    </p>
                </div>
            </Card>

            <Card className="p-4 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <FeaturedIcon icon={ai.provider ? Zap : MessageChatCircle} color={ai.provider ? "brand" : "gray"} theme="light" size="md" />
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-primary">{ai.provider ? "Run it here" : "Want answers right here?"}</p>
                        <p className="text-sm text-tertiary">
                            {ai.provider ? "Uses your own connected AI account." : "Connect your own AI account in Settings to run prompts without leaving the app. Optional."}
                        </p>
                    </div>
                    {ai.provider ? (
                        <Button iconLeading={Stars02} isLoading={aiRun.loading} onClick={() => aiRun.run(text)} isDisabled={prompt.conversational}>
                            {prompt.conversational ? "Use a chat app for this one" : "Run with my AI"}
                        </Button>
                    ) : (
                        <Button color="secondary" href="/settings#ai">
                            Connect AI
                        </Button>
                    )}
                </div>
                {aiRun.error && (
                    <p role="alert" className="mt-4 rounded-lg bg-error-primary p-3 text-sm text-error-primary">
                        {aiRun.error}
                    </p>
                )}
                {aiRun.output && (
                    <div className="mt-4">
                        <div className="max-h-[70dvh] overflow-auto rounded-lg border border-secondary bg-secondary p-4 text-sm whitespace-pre-wrap text-secondary">{aiRun.output}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <CopyButton text={aiRun.output} label="Copy answer" />
                            <Button size="sm" color="tertiary" onClick={() => aiRun.run(text)}>
                                Try again
                            </Button>
                        </div>
                    </div>
                )}
            </Card>
        </div>
    );
};
