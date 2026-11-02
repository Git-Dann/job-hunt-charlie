"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Bookmark, Link01, RefreshCw01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { Card, Page, PageHeader } from "@/components/app/page-header";
import { saveJob } from "@/lib/jobs";
import { type SavePayload, decodePayload, payloadFromShare, payloadToListing } from "@/lib/save-job";
import { uid, useAppData, useHydrated } from "@/lib/store";
import { JOB_STATUSES, type JobListing, type JobStatus } from "@/lib/types";

const normaliseUrl = (u: string) => (u.trim() && !/^https?:\/\//i.test(u.trim()) ? `https://${u.trim()}` : u.trim());

/** Where saved-from-anywhere jobs land: the bookmark button, the Android share sheet, or a pasted link. */
export const AddJobView = () => {
    const params = useSearchParams();
    const router = useRouter();
    const hydrated = useHydrated();
    const { jobs } = useAppData();
    const [form, setForm] = useState<JobListing>(() => payloadToListing({}, ""));
    const [status, setStatus] = useState<JobStatus>("saved");
    const [reading, setReading] = useState(false);
    const [note, setNote] = useState("");
    const started = useRef(false);
    const set = (patch: Partial<JobListing>) => setForm((f) => ({ ...f, ...patch }));

    const readLink = async (url: string, keep: Partial<JobListing> = {}) => {
        if (!url) return;
        setReading(true);
        setNote("");
        try {
            const res = await fetch("/api/scrape", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls: [url] }) });
            const body = await res.json();
            const page = body.pages?.[0];
            // A single job page gives exactly one job; a listings page gives many (then don't guess).
            const one: JobListing | undefined = body.jobs?.length === 1 ? body.jobs[0] : undefined;
            if (one) {
                setForm((f) => ({ ...f, ...one, id: f.id, url, ...Object.fromEntries(Object.entries(keep).filter(([, v]) => v)) }));
                setNote("Details read from the page — check them below.");
            } else if (body.jobs?.length > 1) {
                setNote(`That page lists ${body.jobs.length} jobs. Open the specific job and use its link, or fill in the details below.`);
            } else {
                setNote(page?.error ? `Couldn't read the details automatically (${page.error.replace(/ Use the .*$/, "")}). Fill them in below — pasting the description is enough.` : "Couldn't read the details automatically. Fill them in below.");
            }
        } catch {
            setNote("Couldn't read the details automatically. Fill them in below.");
        } finally {
            setReading(false);
        }
    };

    useEffect(() => {
        if (started.current) return;
        started.current = true;
        const payload: SavePayload | null = decodePayload(params.get("d")) ?? (params.get("url") || params.get("text") || params.get("title") ? payloadFromShare({ url: params.get("url"), title: params.get("title"), text: params.get("text") }) : null);
        if (!payload) return;
        const listing = payloadToListing(payload, `m${uid().slice(0, 10)}`);
        setForm(listing);
        // Shared from a phone: usually just a link. Fetch the details for her.
        if (listing.url && (!listing.description || listing.description.length < 200)) void readLink(listing.url, { title: payload.title ? listing.title : "" });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const duplicate = hydrated && form.url ? jobs.find((j) => j.url && j.url.replace(/[?#].*$/, "") === form.url.replace(/[?#].*$/, "")) : undefined;

    const save = () => {
        const id = form.id || `m${uid().slice(0, 10)}`;
        saveJob({ ...form, id, url: normaliseUrl(form.url), title: form.title.trim() || "Untitled job" }, status);
        router.push(`/jobs/${id}`);
    };

    return (
        <Page>
            <PageHeader title="Save a job" description="Paste a link from any job site, or use the Save button from your browser or phone's share menu." />
            <Card className="mt-6 max-w-3xl p-4 md:p-6">
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <Input className="flex-1" label="Link to the job" icon={Link01} placeholder="https://…" inputMode="url" value={form.url} onChange={(v) => set({ url: v })} />
                        <Button color="secondary" iconLeading={RefreshCw01} isLoading={reading} isDisabled={!form.url.trim()} onClick={() => readLink(normaliseUrl(form.url))}>
                            Read details
                        </Button>
                    </div>
                    {note && (
                        <p role="status" className="rounded-lg bg-secondary p-3 text-sm text-secondary">
                            {note}
                        </p>
                    )}
                    {duplicate && (
                        <p className="rounded-lg bg-warning-primary p-3 text-sm text-warning-primary">
                            You&rsquo;ve already saved this job.{" "}
                            <a href={`/jobs/${duplicate.id}`} className="font-semibold underline">
                                Open it
                            </a>
                        </p>
                    )}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Input label="Job title" isRequired value={form.title === "Untitled job" ? "" : form.title} onChange={(v) => set({ title: v })} />
                        <Input label="Company" value={form.company} onChange={(v) => set({ company: v })} />
                        <Input label="Location" value={form.location ?? ""} onChange={(v) => set({ location: v })} />
                        <Input label="Salary" value={form.salary ?? ""} onChange={(v) => set({ salary: v })} />
                        <NativeSelect label="Stage" value={status} onChange={(e) => setStatus(e.target.value as JobStatus)} options={JOB_STATUSES.map((s) => ({ value: s.id, label: s.label }))} />
                    </div>
                    <TextArea label="Job description" rows={10} value={form.description ?? ""} onChange={(v) => set({ description: v })} hint="Paste the full advert if it wasn't read automatically: it powers the CV match, interview prep and prompts." />
                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <Button color="secondary" href="/jobs">
                            Cancel
                        </Button>
                        <Button iconLeading={Bookmark} onClick={save} isDisabled={!form.title.trim() || form.title === "Untitled job"}>
                            Save job
                        </Button>
                    </div>
                </div>
            </Card>
        </Page>
    );
};
