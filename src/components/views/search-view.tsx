"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
    AlertCircle,
    BookmarkAdd,
    CheckCircle,
    Globe02,
    InfoCircle,
    LinkExternal01,
    MarkerPin01,
    RefreshCw01,
    SearchLg,
    Stars02,
    XClose,
    Zap,
} from "@untitledui/icons";
import { Tabs } from "@/components/application/tabs/tabs";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { Toggle } from "@/components/base/toggle/toggle";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { JobCard } from "@/components/app/job-card";
import { Card, CardHeader, Page, PageHeader } from "@/components/app/page-header";
import { BOARDS, atsGoogleSearch } from "@/lib/boards";
import { profileToText } from "@/lib/cv";
import { matchKeywords } from "@/lib/keywords";
import { listingMatches } from "@/lib/search-filter";
import { setData, uid, useAppData, useHydrated } from "@/lib/store";
import type { JobListing } from "@/lib/types";

const LIVE_SOURCES = [
    { id: "reed", label: "Reed", note: "UK · free key" },
    { id: "adzuna", label: "Adzuna", note: "UK · free key" },
    { id: "remotive", label: "Remotive", note: "Remote" },
    { id: "jobicy", label: "Jobicy", note: "Remote" },
    { id: "himalayas", label: "Himalayas", note: "Remote" },
    { id: "remoteok", label: "RemoteOK", note: "Remote" },
    { id: "themuse", label: "The Muse", note: "Global" },
    { id: "arbeitnow", label: "Arbeitnow", note: "Europe" },
];

interface SourceStatus {
    source: string;
    label: string;
    ok: boolean;
    count: number;
    error?: string;
    skipped?: string;
}
interface PageStatus {
    url: string;
    ok: boolean;
    method: string;
    count: number;
    error?: string;
}

const EXAMPLE_PAGES = ["https://boards.greenhouse.io/monzo", "https://jobs.lever.co/kraken123", "https://jobs.ashbyhq.com/deliveroo"];

export const SearchView = () => {
    const params = useSearchParams();
    const data = useAppData();
    const hydrated = useHydrated();
    const { profile, keys, searches } = data;

    const [keywords, setKeywords] = useState(params.get("q") ?? "");
    const [location, setLocation] = useState(params.get("l") ?? "");
    const [remoteOnly, setRemoteOnly] = useState(params.get("remote") === "1");
    const [tab, setTab] = useState<string>("boards");

    // Fill from her goals once the store has loaded, if nothing came in the URL.
    useEffect(() => {
        if (!hydrated) return;
        if (!params.get("q") && profile.targetRoles) setKeywords((k) => k || profile.targetRoles.split(",")[0].trim());
        if (!params.get("l") && profile.targetLocation) setLocation((l) => l || profile.targetLocation);
        if (profile.workPreference === "remote" && !params.get("l")) setRemoteOnly(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [hydrated]);

    const cvText = useMemo(() => profileToText(profile), [profile]);
    const scoreOf = (j: JobListing) => (cvText.length > 200 && j.description ? matchKeywords(`${j.title}\n${j.description}`, cvText, 20).score : undefined);

    // ── Live results ──
    const [enabled, setEnabled] = useState<Set<string>>(new Set(LIVE_SOURCES.map((s) => s.id)));
    const [live, setLive] = useState<JobListing[] | null>(null);
    const [liveStatus, setLiveStatus] = useState<SourceStatus[]>([]);
    const [liveLoading, setLiveLoading] = useState(false);
    const [liveError, setLiveError] = useState("");

    const runLive = async () => {
        if (!keywords.trim()) return setLiveError("Type a job title or keywords first.");
        setLiveLoading(true);
        setLiveError("");
        try {
            const res = await fetch("/api/search", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ keywords, location, remoteOnly, sources: [...enabled], keys }),
            });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error ?? "Search failed.");
            setLive(body.jobs);
            setLiveStatus(body.sources);
        } catch (e) {
            setLiveError(e instanceof Error ? e.message : "Search failed.");
        } finally {
            setLiveLoading(false);
        }
    };

    // ── Careers pages ──
    const [urlsText, setUrlsText] = useState("");
    const [pageJobs, setPageJobs] = useState<JobListing[] | null>(null);
    const [pageStatus, setPageStatus] = useState<PageStatus[]>([]);
    const [pageLoading, setPageLoading] = useState(false);
    const [pageError, setPageError] = useState("");
    const [onlyMatching, setOnlyMatching] = useState(true);

    const urls = urlsText
        .split(/[\n,\s]+/)
        .map((u) => u.trim())
        .filter((u) => /\.[a-z]{2,}/i.test(u));

    const runPages = async () => {
        if (!urls.length) return setPageError("Paste at least one careers page link.");
        setPageLoading(true);
        setPageError("");
        try {
            const res = await fetch("/api/scrape", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ urls }) });
            const body = await res.json();
            if (!res.ok) throw new Error(body.error ?? "Couldn't check those pages.");
            setPageJobs(body.jobs);
            setPageStatus(body.pages);
        } catch (e) {
            setPageError(e instanceof Error ? e.message : "Couldn't check those pages.");
        } finally {
            setPageLoading(false);
        }
    };

    const shownPageJobs = useMemo(
        () => (pageJobs ?? []).filter((j) => !onlyMatching || !keywords.trim() || listingMatches(j, keywords)),
        [pageJobs, onlyMatching, keywords],
    );

    // ── Saved searches ──
    const saveSearch = () => {
        const name = [keywords || "Any role", remoteOnly ? "Remote" : location].filter(Boolean).join(" · ");
        setData((d) => ({ ...d, searches: [{ id: uid(), name, keywords, location, remoteOnly, urls }, ...d.searches.filter((s) => s.name !== name)].slice(0, 20) }));
    };
    const loadSearch = (id: string) => {
        const s = searches.find((x) => x.id === id);
        if (!s) return;
        setKeywords(s.keywords);
        setLocation(s.location);
        setRemoteOnly(s.remoteOnly);
        if (s.urls.length) setUrlsText(s.urls.join("\n"));
    };

    const boardQuery = { keywords, location, remoteOnly };

    return (
        <Page>
            <PageHeader title="Find jobs" description="Search the big boards, pull live listings, or check company careers pages directly." />

            <div className="mt-6 rounded-xl border border-secondary bg-secondary p-4 md:p-5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_16rem]">
                    <Input
                        label="What"
                        placeholder="e.g. marketing manager, events"
                        icon={SearchLg}
                        value={keywords}
                        onChange={setKeywords}
                        hint="Separate alternatives with commas."
                    />
                    <Input label="Where" placeholder="e.g. Manchester" icon={MarkerPin01} value={location} onChange={setLocation} isDisabled={remoteOnly} />
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <Toggle label="Remote only" isSelected={remoteOnly} onChange={setRemoteOnly} />
                    <Button size="sm" color="tertiary" iconLeading={BookmarkAdd} onClick={saveSearch} isDisabled={!keywords.trim()}>
                        Save this search
                    </Button>
                </div>
                {hydrated && searches.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-secondary pt-4">
                        <span className="text-xs font-semibold text-tertiary">Saved:</span>
                        {searches.map((s) => (
                            <span key={s.id} className="inline-flex items-center overflow-hidden rounded-lg bg-primary text-sm font-medium text-secondary ring-1 ring-primary ring-inset">
                                <button type="button" className="px-2.5 py-1 outline-focus-ring hover:bg-primary_hover focus-visible:outline-2" onClick={() => loadSearch(s.id)}>
                                    {s.name}
                                </button>
                                <button
                                    type="button"
                                    aria-label={`Delete saved search ${s.name}`}
                                    className="flex h-full items-center border-l border-secondary px-1.5 py-1 text-fg-quaternary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2"
                                    onClick={() => setData((d) => ({ ...d, searches: d.searches.filter((x) => x.id !== s.id) }))}
                                >
                                    <XClose className="size-3.5" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(String(k))} className="mt-6">
                <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
                    <Tabs.List type="button-border" size="sm" className="w-max min-w-full sm:min-w-0">
                        <Tabs.Item id="boards" label="Job boards" icon={Globe02} />
                        <Tabs.Item id="live" label="Live results" icon={Zap} badge={live?.length || undefined} />
                        <Tabs.Item id="pages" label="Careers pages" icon={LinkExternal01} badge={pageJobs?.length || undefined} />
                    </Tabs.List>
                </div>

                {/* ── Job boards ── */}
                <Tabs.Panel id="boards" className="mt-5">
                    <p className="mb-4 text-sm text-tertiary">
                        One tap opens your search on each board. These are the boards&rsquo; own results, so they&rsquo;re always complete and up to date.
                    </p>
                    <div className="mb-4 rounded-xl border border-brand bg-brand-primary p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <FeaturedIcon icon={Stars02} color="brand" theme="light" size="md" />
                            <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-primary">Hidden gem: search company careers sites directly</p>
                                <p className="text-sm text-tertiary">Finds roles posted on companies&rsquo; own hiring pages from the last week — often before they hit the big boards.</p>
                            </div>
                            <Button size="sm" href={atsGoogleSearch(boardQuery)} target="_blank" rel="noreferrer" iconTrailing={LinkExternal01} isDisabled={!keywords.trim()}>
                                Search careers sites
                            </Button>
                        </div>
                    </div>
                    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {BOARDS.map((b) => (
                            <li key={b.id} className="flex flex-col rounded-xl border border-secondary bg-primary p-4 shadow-xs">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-semibold text-primary">{b.name}</p>
                                    <Badge size="sm" color={b.region === "UK" ? "brand" : b.region === "Remote" ? "blue" : "gray"}>
                                        {b.region}
                                    </Badge>
                                </div>
                                <p className="mt-1 flex-1 text-sm text-tertiary">{b.note}</p>
                                <Button
                                    size="sm"
                                    color="secondary"
                                    className="mt-3"
                                    href={b.build(boardQuery)}
                                    target="_blank"
                                    rel="noreferrer"
                                    iconTrailing={LinkExternal01}
                                    isDisabled={!keywords.trim()}
                                >
                                    Search {b.name.split(" ")[0]}
                                </Button>
                            </li>
                        ))}
                    </ul>
                </Tabs.Panel>

                {/* ── Live results ── */}
                <Tabs.Panel id="live" className="mt-5">
                    <Card>
                        <CardHeader
                            title="Live listings"
                            description="Pulled from free job APIs and shown here, so you can save them in one tap."
                            actions={
                                <Button iconLeading={liveLoading ? undefined : RefreshCw01} isLoading={liveLoading} onClick={runLive}>
                                    {live ? "Search again" : "Search now"}
                                </Button>
                            }
                        />
                        <div className="px-4 py-4 md:px-6">
                            <p className="mb-3 text-sm font-medium text-secondary">Sources</p>
                            <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 lg:grid-cols-4">
                                {LIVE_SOURCES.map((s) => (
                                    <Checkbox
                                        key={s.id}
                                        label={s.label}
                                        hint={s.note}
                                        isSelected={enabled.has(s.id)}
                                        onChange={(on) =>
                                            setEnabled((prev) => {
                                                const next = new Set(prev);
                                                if (on) next.add(s.id);
                                                else next.delete(s.id);
                                                return next;
                                            })
                                        }
                                    />
                                ))}
                            </div>
                            {hydrated && !keys.reedApiKey && (
                                <p className="mt-4 flex gap-2 text-sm text-tertiary">
                                    <InfoCircle className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden />
                                    <span>
                                        For the most UK jobs, add a free Reed or Adzuna key in{" "}
                                        <a href="/settings#sources" className="font-semibold text-brand-secondary underline-offset-2 hover:underline">
                                            Settings
                                        </a>
                                        . The other sources mostly list remote roles.
                                    </span>
                                </p>
                            )}
                        </div>
                    </Card>

                    {liveError && <Notice tone="error">{liveError}</Notice>}
                    {liveStatus.length > 0 && <StatusList items={liveStatus.map((s) => ({ key: s.source, label: s.label, ok: s.ok, count: s.count, error: s.error, note: s.skipped }))} />}

                    {live && (
                        <ResultList
                            jobs={live}
                            scoreOf={scoreOf}
                            empty="No matches from these sources. Try broader keywords, turn off Remote only, or use the Job boards tab."
                        />
                    )}
                </Tabs.Panel>

                {/* ── Careers pages ── */}
                <Tabs.Panel id="pages" className="mt-5">
                    <Card>
                        <CardHeader
                            title="Check careers pages"
                            description="Paste the jobs page of companies you'd love to work for. Up to 10 at a time."
                            actions={
                                <Button iconLeading={pageLoading ? undefined : SearchLg} isLoading={pageLoading} onClick={runPages}>
                                    Check pages
                                </Button>
                            }
                        />
                        <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
                            <TextArea
                                label="Links (one per line)"
                                rows={4}
                                placeholder={EXAMPLE_PAGES.join("\n")}
                                value={urlsText}
                                onChange={setUrlsText}
                                hint={`${urls.length} link${urls.length === 1 ? "" : "s"} ready`}
                            />
                            <Toggle label="Only show jobs matching my keywords" isSelected={onlyMatching} onChange={setOnlyMatching} />
                            <details className="rounded-lg bg-secondary p-3 text-sm text-tertiary">
                                <summary className="cursor-pointer font-semibold text-secondary">What works best?</summary>
                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                    <li>Careers sites run on Greenhouse, Lever, Ashby, Workable, SmartRecruiters or Recruitee are read straight from their job feed — the most reliable.</li>
                                    <li>Most other careers pages carry hidden job data for Google, which this reads too.</li>
                                    <li>RSS job feeds (councils, charities, universities) work as well.</li>
                                    <li>
                                        If a page blocks automatic reading, copy its text and use the{" "}
                                        <a href="/prompts?p=extract-jobs" className="font-semibold text-brand-secondary hover:underline">
                                            Pull jobs out of a page
                                        </a>{" "}
                                        prompt instead.
                                    </li>
                                </ul>
                            </details>
                        </div>
                    </Card>

                    {pageError && <Notice tone="error">{pageError}</Notice>}
                    {pageStatus.length > 0 && (
                        <StatusList items={pageStatus.map((p) => ({ key: p.url, label: p.url.replace(/^https?:\/\/(www\.)?/, ""), ok: p.ok, count: p.count, error: p.error, note: p.ok ? p.method : undefined }))} />
                    )}
                    {pageJobs && (
                        <ResultList
                            jobs={shownPageJobs}
                            scoreOf={scoreOf}
                            hiddenCount={pageJobs.length - shownPageJobs.length}
                            onShowAll={() => setOnlyMatching(false)}
                            empty="No jobs on these pages matched your keywords."
                        />
                    )}
                </Tabs.Panel>
            </Tabs>
        </Page>
    );
};

const Notice = ({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) => (
    <div
        role={tone === "error" ? "alert" : "status"}
        className={`mt-4 flex gap-3 rounded-xl border p-4 text-sm ${tone === "error" ? "border-error_subtle bg-error-primary text-error-primary" : "border-secondary bg-secondary text-secondary"}`}
    >
        <AlertCircle className="size-5 shrink-0" aria-hidden />
        <p>{children}</p>
    </div>
);

const StatusList = ({ items }: { items: { key: string; label: string; ok: boolean; count: number; error?: string; note?: string }[] }) => (
    <details className="mt-4 rounded-xl border border-secondary bg-primary" open={items.some((i) => !i.ok)}>
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-secondary md:px-6">
            Where these came from · {items.filter((i) => i.ok && !i.note?.startsWith("Add")).length} of {items.length} answered
        </summary>
        <ul className="divide-y divide-secondary border-t border-secondary">
            {items.map((i) => (
                <li key={i.key} className="flex items-start gap-3 px-4 py-3 text-sm md:px-6">
                    {i.ok ? (
                        <CheckCircle className="mt-0.5 size-4 shrink-0 text-fg-success-primary" aria-hidden />
                    ) : (
                        <AlertCircle className="mt-0.5 size-4 shrink-0 text-fg-error-primary" aria-hidden />
                    )}
                    <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-secondary">{i.label}</p>
                        {(i.error || i.note) && <p className="text-tertiary">{i.error ?? i.note}</p>}
                    </div>
                    {i.ok && (
                        <Badge size="sm" color={i.count ? "success" : "gray"}>
                            {i.count}
                        </Badge>
                    )}
                </li>
            ))}
        </ul>
    </details>
);

const ResultList = ({
    jobs,
    scoreOf,
    empty,
    hiddenCount = 0,
    onShowAll,
}: {
    jobs: JobListing[];
    scoreOf: (j: JobListing) => number | undefined;
    empty: string;
    hiddenCount?: number;
    onShowAll?: () => void;
}) => {
    const [filter, setFilter] = useState("");
    const [sort, setSort] = useState("newest");
    const [limit, setLimit] = useState(30);
    const scored = useMemo(() => jobs.map((j) => ({ j, s: scoreOf(j) })), [jobs, scoreOf]);
    const hasScores = scored.some((x) => x.s !== undefined);
    const shown = useMemo(() => {
        const f = filter.trim().toLowerCase();
        const list = scored.filter(({ j }) => !f || `${j.title} ${j.company} ${j.location ?? ""}`.toLowerCase().includes(f));
        if (sort === "match") list.sort((a, b) => (b.s ?? -1) - (a.s ?? -1));
        return list;
    }, [scored, filter, sort]);

    return (
        <div className="mt-6">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input aria-label="Filter results" placeholder="Filter by title, company or place" icon={SearchLg} value={filter} onChange={setFilter} size="sm" className="flex-1" />
                <NativeSelect
                    aria-label="Sort"
                    size="sm"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className="sm:w-52"
                    options={[
                        { value: "newest", label: "Newest first" },
                        { value: "match", label: hasScores ? "Best match to my CV" : "Best match (add your CV)", disabled: !hasScores },
                    ]}
                />
            </div>
            <p className="mb-3 text-sm text-tertiary">
                {shown.length} job{shown.length === 1 ? "" : "s"}
                {hiddenCount > 0 && (
                    <>
                        {" "}
                        · {hiddenCount} hidden by your keywords{" "}
                        {onShowAll && (
                            <button type="button" className="font-semibold text-brand-secondary hover:underline" onClick={onShowAll}>
                                show all
                            </button>
                        )}
                    </>
                )}
            </p>
            {shown.length === 0 ? (
                <div className="rounded-xl border border-dashed border-primary p-8 text-center text-sm text-tertiary">{empty}</div>
            ) : (
                <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
                    {shown.slice(0, limit).map(({ j, s }) => (
                        <JobCard key={j.id} job={j} score={s} />
                    ))}
                </div>
            )}
            {shown.length > limit && (
                <div className="mt-4 flex justify-center">
                    <Button color="secondary" onClick={() => setLimit((l) => l + 30)}>
                        Show more ({shown.length - limit} left)
                    </Button>
                </div>
            )}
        </div>
    );
};
