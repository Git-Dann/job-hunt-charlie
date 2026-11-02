"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowUp, File06, Plus, Stars02, Trash01, Upload01 } from "@untitledui/icons";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { AppDialog } from "@/components/app/app-dialog";
import { Card, CardHeader, Page, PageHeader } from "@/components/app/page-header";
import { ImportCvDialog } from "@/components/cv/import-cv-dialog";
import { SkillEditor, linesToList, listToLines } from "@/components/cv/skill-editor";
import { profileCompleteness } from "@/lib/cv";
import { createCv } from "@/lib/cv-actions";
import { formatDate } from "@/lib/jobs";
import { setData, uid, useAppData, useHydrated } from "@/lib/store";
import type { Education, Experience, Profile } from "@/lib/types";

const setProfile = (patch: Partial<Profile>) => setData((d) => ({ ...d, profile: { ...d.profile, ...patch } }));

export const CvView = () => {
    const params = useSearchParams();
    const { cvs } = useAppData();
    const hydrated = useHydrated();
    const [tab, setTab] = useState<string>(params.get("tab") ?? "details");

    return (
        <Page>
            <PageHeader
                title="CV builder"
                description="Write your details once, then make a tailored CV for every job in seconds."
                actions={
                    <>
                        <ImportCvDialog>
                            <Button color="secondary" iconLeading={Upload01}>
                                Paste my CV
                            </Button>
                        </ImportCvDialog>
                        <NewCvDialog>
                            <Button iconLeading={Plus}>New CV</Button>
                        </NewCvDialog>
                    </>
                }
            />
            <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))} className="mt-6">
                <Tabs.List type="button-border" size="sm" className="w-full sm:w-max" fullWidth>
                    <Tabs.Item id="details" label="My details" />
                    <Tabs.Item id="versions" label="My CVs" badge={hydrated ? cvs.length || undefined : undefined} />
                </Tabs.List>
                <Tabs.Panel id="details" className="mt-6">
                    {hydrated && <ProfileEditor />}
                </Tabs.Panel>
                <Tabs.Panel id="versions" className="mt-6">
                    {hydrated && <VersionList />}
                </Tabs.Panel>
            </Tabs>
        </Page>
    );
};

const ProfileEditor = () => {
    const { profile: p } = useAppData();
    const completeness = profileCompleteness(p);

    return (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="flex min-w-0 flex-col gap-6">
                <Card>
                    <CardHeader title="About you" description="Your name and contact details sit at the top of every CV." />
                    <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 md:px-6">
                        <Input label="Full name" value={p.name} onChange={(v) => setProfile({ name: v })} autoComplete="name" />
                        <Input label="Headline" placeholder="e.g. Events & Marketing Manager" value={p.headline} onChange={(v) => setProfile({ headline: v })} />
                        <Input label="Email" type="email" value={p.email} onChange={(v) => setProfile({ email: v })} autoComplete="email" />
                        <Input label="Phone" type="tel" value={p.phone} onChange={(v) => setProfile({ phone: v })} autoComplete="tel" />
                        <Input label="Location" placeholder="e.g. Manchester" value={p.location} onChange={(v) => setProfile({ location: v })} />
                        <Input label="LinkedIn" placeholder="linkedin.com/in/…" value={p.linkedin} onChange={(v) => setProfile({ linkedin: v })} />
                        <Input className="sm:col-span-2" label="Website or portfolio (optional)" value={p.website} onChange={(v) => setProfile({ website: v })} />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="What you're looking for" description="Used to pre-fill searches and to make the AI prompts more useful." />
                    <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 md:px-6">
                        <Input
                            className="sm:col-span-2"
                            label="Roles you want"
                            placeholder="e.g. events manager, marketing manager"
                            hint="Separate with commas."
                            value={p.targetRoles}
                            onChange={(v) => setProfile({ targetRoles: v })}
                        />
                        <Input label="Where" placeholder="e.g. Manchester or Remote" value={p.targetLocation} onChange={(v) => setProfile({ targetLocation: v })} />
                        <Input label="Salary you're aiming for" placeholder="e.g. £35–40k" value={p.salaryExpectation} onChange={(v) => setProfile({ salaryExpectation: v })} />
                        <NativeSelect
                            label="Working pattern"
                            value={p.workPreference}
                            onChange={(e) => setProfile({ workPreference: e.target.value as Profile["workPreference"] })}
                            options={[
                                { value: "any", label: "Open to anything" },
                                { value: "remote", label: "Remote" },
                                { value: "hybrid", label: "Hybrid" },
                                { value: "office", label: "In the office" },
                            ]}
                        />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Profile summary" description="3–4 lines: who you are, what you're great at, and what you want next." />
                    <div className="px-4 py-4 md:px-6">
                        <TextArea aria-label="Profile summary" rows={5} value={p.summary} onChange={(v) => setProfile({ summary: v })} hint={`${p.summary.trim().split(/\s+/).filter(Boolean).length} words — aim for 50–90.`} />
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Key skills" description="The order here is the order on your CV. Tailored CVs reorder them for each job automatically." />
                    <div className="px-4 py-4 md:px-6">
                        <SkillEditor skills={p.skills} onChange={(skills) => setProfile({ skills })} />
                    </div>
                </Card>

                <ExperienceEditor items={p.experience} />
                <EducationEditor items={p.education} />

                <Card>
                    <CardHeader title="Certifications, courses & extras" />
                    <div className="grid grid-cols-1 gap-4 px-4 py-4 md:px-6">
                        <TextArea label="Certifications and courses" rows={3} hint="One per line." value={listToLines(p.certifications)} onChange={(v) => setProfile({ certifications: linesToList(v) })} />
                        <TextArea label="Additional (languages, driving licence, volunteering, interests)" rows={4} value={p.extras} onChange={(v) => setProfile({ extras: v })} />
                    </div>
                </Card>
            </div>

            <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
                <Card className="p-4">
                    <p className="text-sm font-semibold text-primary">{completeness.percent}% complete</p>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-quaternary">
                        <div className="h-full rounded-full bg-brand-solid transition-all" style={{ width: `${completeness.percent}%` }} />
                    </div>
                    {completeness.missing.length > 0 ? (
                        <ul className="mt-3 flex flex-col gap-1 text-sm text-tertiary">
                            {completeness.missing.map((m) => (
                                <li key={m}>• {m}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="mt-3 text-sm text-tertiary">Looking great. Make a tailored CV for your next application.</p>
                    )}
                    <p className="mt-3 text-xs text-quaternary">Saves automatically on this device.</p>
                </Card>
                <Card className="p-4">
                    <FeaturedIcon icon={Stars02} color="brand" theme="light" size="md" />
                    <p className="mt-3 text-sm font-semibold text-primary">Stuck on wording?</p>
                    <p className="mt-1 text-sm text-tertiary">Use an AI prompt to turn duties into achievements, or to write your CV from scratch.</p>
                    <div className="mt-3 flex flex-col gap-2">
                        <Button size="sm" color="secondary" href="/prompts?p=bullets">
                            Make my achievements stronger
                        </Button>
                        <Button size="sm" color="secondary" href="/prompts?p=cv-from-scratch">
                            Write my CV from scratch
                        </Button>
                    </div>
                </Card>
            </aside>
        </div>
    );
};

const ExperienceEditor = ({ items }: { items: Experience[] }) => {
    const set = (experience: Experience[]) => setProfile({ experience });
    const patch = (id: string, x: Partial<Experience>) => set(items.map((e) => (e.id === id ? { ...e, ...x } : e)));
    const move = (i: number, by: number) => {
        const next = [...items];
        const [x] = next.splice(i, 1);
        next.splice(i + by, 0, x);
        set(next);
    };
    return (
        <Card>
            <CardHeader
                title="Work experience"
                description="Most recent first. Write achievements, not just duties — numbers help."
                actions={
                    <Button size="sm" color="secondary" iconLeading={Plus} onClick={() => set([{ id: uid(), role: "", company: "", start: "", end: "Present", bullets: [] }, ...items])}>
                        Add a role
                    </Button>
                }
            />
            {items.length === 0 && <p className="px-4 py-6 text-sm text-tertiary md:px-6">No roles yet. Add your most recent job first.</p>}
            <ol className="divide-y divide-secondary">
                {items.map((e, i) => (
                    <li key={e.id} className="px-4 py-5 md:px-6">
                        <div className="mb-3 flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-secondary">{e.role || "New role"}</p>
                            <div className="flex shrink-0 gap-1">
                                <Button size="sm" color="tertiary" iconLeading={ArrowUp} aria-label="Move up" isDisabled={i === 0} onClick={() => move(i, -1)} />
                                <Button size="sm" color="tertiary" iconLeading={ArrowDown} aria-label="Move down" isDisabled={i === items.length - 1} onClick={() => move(i, 1)} />
                                <Button
                                    size="sm"
                                    color="tertiary-destructive"
                                    iconLeading={Trash01}
                                    aria-label="Delete role"
                                    onClick={() => window.confirm(`Delete ${e.role || "this role"}?`) && set(items.filter((x) => x.id !== e.id))}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <Input label="Job title" value={e.role} onChange={(v) => patch(e.id, { role: v })} />
                            <Input label="Company" value={e.company} onChange={(v) => patch(e.id, { company: v })} />
                            <Input label="Location" value={e.location ?? ""} onChange={(v) => patch(e.id, { location: v })} />
                            <div className="grid grid-cols-2 gap-3">
                                <Input label="From" placeholder="Mar 2021" value={e.start} onChange={(v) => patch(e.id, { start: v })} />
                                <Input label="To" placeholder="Present" value={e.end} onChange={(v) => patch(e.id, { end: v })} />
                            </div>
                            <TextArea
                                className="sm:col-span-2"
                                label="Achievements"
                                rows={5}
                                hint="One per line. Start with a verb: Led, Grew, Delivered, Cut…"
                                placeholder={"Delivered 40+ corporate events a year with budgets up to £80k\nGrew Instagram following from 2k to 15k in 12 months"}
                                value={listToLines(e.bullets)}
                                onChange={(v) => patch(e.id, { bullets: linesToList(v) })}
                            />
                        </div>
                    </li>
                ))}
            </ol>
        </Card>
    );
};

const EducationEditor = ({ items }: { items: Education[] }) => {
    const set = (education: Education[]) => setProfile({ education });
    const patch = (id: string, x: Partial<Education>) => set(items.map((e) => (e.id === id ? { ...e, ...x } : e)));
    return (
        <Card>
            <CardHeader
                title="Education"
                actions={
                    <Button size="sm" color="secondary" iconLeading={Plus} onClick={() => set([...items, { id: uid(), qualification: "", institution: "" }])}>
                        Add
                    </Button>
                }
            />
            {items.length === 0 && <p className="px-4 py-6 text-sm text-tertiary md:px-6">Add degrees, A-levels or other qualifications.</p>}
            <ol className="divide-y divide-secondary">
                {items.map((e) => (
                    <li key={e.id} className="grid grid-cols-1 gap-4 px-4 py-5 sm:grid-cols-2 md:px-6">
                        <Input label="Qualification" placeholder="BA (Hons) Marketing, 2:1" value={e.qualification} onChange={(v) => patch(e.id, { qualification: v })} />
                        <Input label="Where" value={e.institution} onChange={(v) => patch(e.id, { institution: v })} />
                        <div className="grid grid-cols-2 gap-3">
                            <Input label="From" value={e.start ?? ""} onChange={(v) => patch(e.id, { start: v })} />
                            <Input label="To" value={e.end ?? ""} onChange={(v) => patch(e.id, { end: v })} />
                        </div>
                        <div className="flex items-end gap-2">
                            <Input className="flex-1" label="Detail (optional)" value={e.detail ?? ""} onChange={(v) => patch(e.id, { detail: v })} />
                            <Button color="tertiary-destructive" iconLeading={Trash01} aria-label="Delete" onClick={() => set(items.filter((x) => x.id !== e.id))} />
                        </div>
                    </li>
                ))}
            </ol>
        </Card>
    );
};

const VersionList = () => {
    const { cvs, jobs } = useAppData();
    if (!cvs.length)
        return (
            <div className="flex flex-col items-center py-10 text-center">
                <FeaturedIcon icon={File06} color="gray" theme="modern" size="xl" />
                <h2 className="mt-4 text-lg font-semibold text-primary">No tailored CVs yet</h2>
                <p className="mt-1 max-w-sm text-sm text-tertiary">Make one for each job: paste the advert and your skills and achievements are reordered to match.</p>
                <NewCvDialog>
                    <Button className="mt-6" iconLeading={Plus}>
                        New CV
                    </Button>
                </NewCvDialog>
            </div>
        );
    return (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cvs.map((c) => {
                const job = jobs.find((j) => j.id === c.jobId);
                return (
                    <li key={c.id}>
                        <a href={`/cv/${c.id}`} className="flex h-full flex-col rounded-xl border border-secondary bg-primary p-4 shadow-xs outline-focus-ring hover:bg-primary_hover focus-visible:outline-2">
                            <FeaturedIcon icon={File06} color="brand" theme="light" size="md" />
                            <p className="mt-3 text-sm font-semibold break-words text-primary">{c.name}</p>
                            <p className="mt-1 text-sm text-tertiary">{job ? `For ${job.title}` : c.jobDescription ? "Tailored to an advert" : "General CV"}</p>
                            <div className="mt-3 flex items-center gap-2">
                                <Badge size="sm" color="gray">
                                    {c.template}
                                </Badge>
                                <span className="text-xs text-quaternary">Edited {formatDate(c.updatedAt)}</span>
                            </div>
                        </a>
                    </li>
                );
            })}
        </ul>
    );
};

export const NewCvDialog = ({ children }: { children: React.ReactNode }) => {
    const { jobs, profile } = useAppData();
    const router = useRouter();
    const [name, setName] = useState("");
    const [jobId, setJobId] = useState("");
    const [advert, setAdvert] = useState("");
    const empty = profile.experience.length === 0 && !profile.summary.trim() && profile.skills.length === 0;

    return (
        <AppDialog
            trigger={children}
            icon={File06}
            title="New CV"
            description="Starts from your details. Pick a job or paste an advert and it's tailored straight away."
            footer={(close) => (
                <>
                    <Button color="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        isDisabled={empty}
                        onClick={() => {
                            const id = createCv({ name: name.trim() || undefined, jobId: jobId || undefined, jobText: !jobId && advert.trim() ? advert : undefined });
                            close();
                            router.push(`/cv/${id}`);
                        }}
                    >
                        Create CV
                    </Button>
                </>
            )}
        >
            {empty && <p className="mb-4 rounded-lg bg-warning-primary p-3 text-sm text-warning-primary">Add your details first (or paste your current CV) — a new CV starts from them.</p>}
            <div className="flex flex-col gap-4">
                <Input label="Name (for you)" placeholder="e.g. Marketing roles" value={name} onChange={setName} />
                {jobs.length > 0 && (
                    <NativeSelect
                        label="Tailor to a saved job"
                        value={jobId}
                        onChange={(e) => setJobId(e.target.value)}
                        options={[{ value: "", label: "No — general CV or paste an advert" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title}${j.company ? ` — ${j.company}` : ""}` }))]}
                    />
                )}
                {!jobId && <TextArea label="Or paste a job advert" rows={6} value={advert} onChange={setAdvert} hint="Optional. You can add or change this later." />}
            </div>
        </AppDialog>
    );
};
