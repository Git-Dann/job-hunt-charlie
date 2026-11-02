"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Edit05, Eye, File06 as FileDocx, Mail01, Printer, RefreshCw01, Stars02, Trash01 } from "@untitledui/icons";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { AppDialog } from "@/components/app/app-dialog";
import { CopyButton } from "@/components/app/copy-button";
import { KeywordMatch } from "@/components/app/keyword-match";
import { Card, CardHeader, Page } from "@/components/app/page-header";
import { CvDocument, PrintableCv } from "@/components/cv/cv-document";
import { SkillEditor, linesToList, listToLines } from "@/components/cv/skill-editor";
import { draftCoverLetter } from "@/lib/cover-letter";
import { resolveCv, resolvedToText, tailorCv } from "@/lib/cv";
import { deleteCv, updateCv } from "@/lib/cv-actions";
import { matchKeywords, mentions } from "@/lib/keywords";
import { useAppData, useHydrated } from "@/lib/store";
import type { CvVersion } from "@/lib/types";

export const CvVersionView = ({ id }: { id: string }) => {
    const { cvs, profile, jobs } = useAppData();
    const hydrated = useHydrated();
    const router = useRouter();
    const [mobileTab, setMobileTab] = useState<string>("edit");
    const [notice, setNotice] = useState("");
    const cv = cvs.find((c) => c.id === id);
    const job = jobs.find((j) => j.id === cv?.jobId);
    const advert = cv?.jobDescription ?? (job ? `${job.title}\n${job.description ?? ""}` : "");

    const resolved = useMemo(() => (cv ? resolveCv(profile, cv) : null), [cv, profile]);
    const cvText = useMemo(() => (resolved ? resolvedToText(resolved) : ""), [resolved]);
    const match = useMemo(() => (advert.trim().length > 40 ? matchKeywords(advert, cvText) : null), [advert, cvText]);

    if (!hydrated) return <Page>{null}</Page>;
    if (!cv || !resolved)
        return (
            <Page>
                <p className="text-md text-tertiary">This CV doesn&rsquo;t exist any more.</p>
                <Button className="mt-4" href="/cv?tab=versions" color="secondary" iconLeading={ArrowLeft}>
                    Back to my CVs
                </Button>
            </Page>
        );

    const set = (patch: Partial<CvVersion>) => updateCv(cv.id, patch);

    // Roles added to her details after this CV was made appear too, switched off.
    const known = new Set(cv.experience.map((x) => x.id));
    const rows = [
        ...cv.experience.filter((x) => profile.experience.some((e) => e.id === x.id)),
        ...profile.experience.filter((e) => !known.has(e.id)).map((e) => ({ id: e.id, include: false, bullets: e.bullets })),
    ];
    const setRow = (rowId: string, patch: Partial<{ include: boolean; bullets: string[] }>) =>
        set({ experience: rows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)) });

    const retailor = () => {
        if (!advert.trim()) return;
        const res = tailorCv(profile, advert, { ...cv, experience: rows });
        set(res.version);
        setNotice(
            res.promoted.length
                ? `Moved ${res.promoted.length} matching skill${res.promoted.length === 1 ? "" : "s"} to the top and put your most relevant achievements first.`
                : "Put your most relevant achievements first. None of your skills mention the advert's keywords yet — see what's missing below.",
        );
    };

    const editor = (
        <div className="flex flex-col gap-6">
            <Card>
                <CardHeader title="Tailor to a job" description="Paste the advert, then tap Tailor. Nothing is made up — your own words are just reordered." />
                <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
                    {jobs.length > 0 && (
                        <NativeSelect
                            label="Saved job"
                            value={cv.jobId ?? ""}
                            onChange={(e) => {
                                const j = jobs.find((x) => x.id === e.target.value);
                                set({ jobId: j?.id, jobDescription: j ? `${j.title}\n${j.description ?? ""}` : cv.jobDescription });
                            }}
                            options={[{ value: "", label: "None — paste an advert below" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title}${j.company ? ` — ${j.company}` : ""}` }))]}
                        />
                    )}
                    <TextArea label="Job advert" rows={6} value={cv.jobDescription ?? ""} onChange={(v) => set({ jobDescription: v })} placeholder="Paste the full job advert…" />
                    <div className="flex flex-wrap gap-2">
                        <Button iconLeading={RefreshCw01} onClick={retailor} isDisabled={!advert.trim()}>
                            Tailor now
                        </Button>
                        <Button color="secondary" iconLeading={Stars02} href={`/prompts?p=tailor-cv&cv=${cv.id}${cv.jobId ? `&job=${cv.jobId}` : ""}`}>
                            Rewrite with AI
                        </Button>
                    </div>
                    {notice && (
                        <p role="status" className="rounded-lg bg-success-primary p-3 text-sm text-success-primary">
                            {notice}
                        </p>
                    )}
                    {match && <KeywordMatch result={match} />}
                </div>
            </Card>

            <Card>
                <CardHeader title="Top of the CV" />
                <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
                    <Input label="Headline" value={cv.headline} onChange={(v) => set({ headline: v })} />
                    <TextArea label="Profile summary" rows={5} value={cv.summary} onChange={(v) => set({ summary: v })} hint="Tip: echo two or three words from the advert, if they're true for you." />
                </div>
            </Card>

            <Card>
                <CardHeader title="Key skills" description={match ? "Green skills appear in the advert." : "Move the most relevant to the top."} />
                <div className="px-4 py-4 md:px-6">
                    <SkillEditor skills={cv.skills} onChange={(skills) => set({ skills })} highlight={match ? (s) => match.matched.some((k) => mentions(s, k.term) || mentions(k.term, s)) : undefined} />
                </div>
            </Card>

            <Card>
                <CardHeader title="Experience" description="Untick roles that aren't relevant. Edit or reorder achievements for this CV only." />
                <ol className="divide-y divide-secondary">
                    {rows.map((r) => {
                        const e = profile.experience.find((x) => x.id === r.id)!;
                        return (
                            <li key={r.id} className="px-4 py-4 md:px-6">
                                <Checkbox
                                    label={`${e.role || "Untitled role"}${e.company ? ` — ${e.company}` : ""}`}
                                    hint={[e.start, e.end].filter(Boolean).join(" – ")}
                                    isSelected={r.include}
                                    onChange={(include) => setRow(r.id, { include })}
                                />
                                {r.include && (
                                    <TextArea
                                        className="mt-3"
                                        aria-label={`Achievements for ${e.role}`}
                                        rows={4}
                                        value={listToLines(r.bullets)}
                                        onChange={(v) => setRow(r.id, { bullets: linesToList(v) })}
                                        hint="One per line, most relevant first."
                                    />
                                )}
                            </li>
                        );
                    })}
                    {rows.length === 0 && (
                        <li className="px-4 py-4 text-sm text-tertiary md:px-6">
                            Add your work experience in{" "}
                            <a href="/cv" className="font-semibold text-brand-secondary hover:underline">
                                My details
                            </a>
                            .
                        </li>
                    )}
                </ol>
            </Card>
        </div>
    );

    const preview = (
        <div className="overflow-hidden rounded-xl border border-secondary shadow-lg">
            <CvDocument cv={resolved} template={cv.template} />
        </div>
    );

    return (
        <Page>
            <PrintableCv cv={resolved} template={cv.template} />
            <Button size="sm" color="link-gray" href="/cv?tab=versions" iconLeading={ArrowLeft}>
                My CVs
            </Button>
            <div className="mt-4 flex flex-col gap-4 border-b border-secondary pb-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end">
                    <Input label="CV name" value={cv.name} onChange={(v) => set({ name: v })} className="sm:w-80" />
                    <NativeSelect
                        label="Style"
                        className="sm:w-40"
                        value={cv.template}
                        onChange={(e) => set({ template: e.target.value as CvVersion["template"] })}
                        options={[
                            { value: "classic", label: "Classic" },
                            { value: "modern", label: "Modern" },
                            { value: "compact", label: "Compact" },
                        ]}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button iconLeading={Printer} onClick={() => window.print()}>
                        Print / save PDF
                    </Button>
                    <Button
                        color="secondary"
                        iconLeading={FileDocx}
                        onClick={async () => {
                            const { cvDocxBlob } = await import("@/lib/cv-docx");
                            const blob = await cvDocxBlob(resolved, cv.template);
                            const a = document.createElement("a");
                            a.href = URL.createObjectURL(blob);
                            a.download = `${(profile.name || "CV").replace(/[^a-z0-9]+/gi, "-")}-CV.docx`;
                            a.click();
                            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
                        }}
                    >
                        Download Word
                    </Button>
                    <CopyButton text={cvText} label="Copy as text" size="md" />
                    <CoverLetterDialog cv={cv} />
                    <Button
                        color="tertiary-destructive"
                        iconLeading={Trash01}
                        aria-label="Delete this CV"
                        onClick={() => {
                            if (window.confirm(`Delete "${cv.name}"? Your details are not affected.`)) {
                                deleteCv(cv.id);
                                router.push("/cv?tab=versions");
                            }
                        }}
                    />
                </div>
            </div>
            {match && (
                <div className="mt-4 flex items-center gap-2 lg:hidden">
                    <Badge color={match.score >= 60 ? "success" : match.score >= 35 ? "warning" : "gray"}>{match.score}% match</Badge>
                    <span className="text-sm text-tertiary">to the advert</span>
                </div>
            )}

            {/* Phones: switch between editing and the preview. */}
            <div className="mt-6 lg:hidden">
                <Tabs selectedKey={mobileTab} onSelectionChange={(k) => setMobileTab(String(k))}>
                    <Tabs.List type="button-border" size="sm" fullWidth className="w-full">
                        <Tabs.Item id="edit" label="Edit" icon={Edit05} />
                        <Tabs.Item id="preview" label="Preview" icon={Eye} />
                    </Tabs.List>
                    <Tabs.Panel id="edit" className="mt-4">
                        {editor}
                    </Tabs.Panel>
                    <Tabs.Panel id="preview" className="mt-4">
                        {preview}
                        <p className="mt-3 text-center text-xs text-quaternary">Tip: on iPhone, Print → pinch out on the preview → Share → Save to Files to get a PDF.</p>
                    </Tabs.Panel>
                </Tabs>
            </div>

            <div className="mt-6 hidden gap-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {editor}
                <div className="sticky top-6 max-h-[calc(100dvh-3rem)] self-start overflow-y-auto">{preview}</div>
            </div>
        </Page>
    );
};

const CoverLetterDialog = ({ cv }: { cv: CvVersion }) => {
    const { profile, jobs } = useAppData();
    const job = jobs.find((j) => j.id === cv.jobId);
    const [title, setTitle] = useState(job?.title ?? "");
    const [company, setCompany] = useState(job?.company ?? "");
    const [manager, setManager] = useState("");
    const [why, setWhy] = useState("");
    const [letter, setLetter] = useState("");
    const build = () => setLetter(draftCoverLetter(profile, { title, company, description: cv.jobDescription ?? job?.description ?? "" }, { hiringManager: manager, why }));

    return (
        <AppDialog
            trigger={
                <Button color="secondary" iconLeading={Mail01}>
                    Cover letter
                </Button>
            }
            icon={Mail01}
            width="lg"
            title="Cover letter"
            description="A quick draft built from your CV and the advert. Fill in the [brackets] and make it sound like you."
            footer={(close) => (
                <>
                    <Button color="secondary" href={`/prompts?p=cover-letter${cv.jobId ? `&job=${cv.jobId}` : ""}`} iconLeading={Stars02} onClick={close}>
                        Write it with AI instead
                    </Button>
                    <CopyButton text={letter} label="Copy letter" color="primary" size="md" />
                </>
            )}
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Role" value={title} onChange={setTitle} />
                <Input label="Company" value={company} onChange={setCompany} />
                <Input label="Hiring manager (if known)" value={manager} onChange={setManager} placeholder="e.g. Ms Patel" />
                <Input label="Why this job? (one line)" value={why} onChange={setWhy} placeholder="e.g. I've followed your festivals for years" />
            </div>
            <Button className="mt-4" color="secondary" iconLeading={RefreshCw01} onClick={build}>
                {letter ? "Rebuild draft" : "Build draft"}
            </Button>
            {letter && <TextArea className="mt-4" aria-label="Cover letter" rows={16} value={letter} onChange={setLetter} />}
        </AppDialog>
    );
};
