"use client";

import { useRef, useState } from "react";
import { CheckCircle, Code02, Download01, Key01, LinkExternal01, Lock01, Trash01, Upload01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { BuildYourOwnDialog } from "@/components/app/build-your-own-dialog";
import { Card, CardHeader, Page, PageHeader } from "@/components/app/page-header";
import { SaveAnywhereCard } from "@/components/app/save-anywhere-card";
import { SyncCard } from "@/components/app/sync-card";
import { ThemeSwitch } from "@/components/app/theme-switch";
import { AI_PROVIDERS, defaultModel } from "@/lib/ai-models";
import { STORAGE_KEY, emptyData, normaliseData, replaceData, setData, useAppData, useHydrated } from "@/lib/store";
import type { AiProvider, SourceKeys } from "@/lib/types";
import { useRunAi } from "@/lib/use-ai";

const setKeys = (patch: Partial<SourceKeys>) => setData((d) => ({ ...d, keys: { ...d.keys, ...patch } }));

export const SettingsView = () => {
    const data = useAppData();
    const hydrated = useHydrated();
    const { ai, keys } = data;
    const test = useRunAi();
    const fileRef = useRef<HTMLInputElement>(null);
    const [importMsg, setImportMsg] = useState("");
    const provider = AI_PROVIDERS.find((p) => p.id === ai.provider);

    const exportData = () => {
        // Keys stay out of the backup: it's the file most likely to be shared or emailed.
        const safe = { ...data, ai: { ...data.ai, apiKey: "" }, keys: { ...data.keys, reedApiKey: "", adzunaAppKey: "", companiesHouseKey: "" } };
        const blob = new Blob([JSON.stringify(safe, null, 2)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `charlies-job-platform-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    const importData = async (file: File) => {
        try {
            const parsed = JSON.parse(await file.text());
            if (!parsed || typeof parsed !== "object" || !("profile" in parsed)) throw new Error();
            const next = normaliseData(parsed);
            // Keep keys already on this device; backups don't carry them.
            next.ai = { ...next.ai, apiKey: next.ai.apiKey || data.ai.apiKey };
            next.keys = { ...next.keys, reedApiKey: next.keys.reedApiKey || data.keys.reedApiKey, adzunaAppKey: next.keys.adzunaAppKey || data.keys.adzunaAppKey };
            replaceData(next);
            setImportMsg(`Restored ${next.jobs.length} jobs and ${next.cvs.length} CVs.`);
        } catch {
            setImportMsg("That file isn't a backup from Charlie's Job Platform.");
        }
    };

    if (!hydrated) return <Page>{null}</Page>;

    return (
        <Page>
            <PageHeader title="Settings" description="Connections, backups and appearance. Everything is stored on this device only." />
            <div className="mt-6 flex max-w-3xl flex-col gap-6">
                <SyncCard />

                <SaveAnywhereCard />

                <Card>
                    <div id="ai" className="scroll-mt-20" />
                    <CardHeader
                        title="Connect your own AI (optional)"
                        description="Run prompts inside the app instead of copying them. You pay the AI company directly — usually pennies per prompt."
                        actions={ai.provider ? <Badge color="success">Connected</Badge> : <Badge color="gray">Not connected</Badge>}
                    />
                    <div className="flex flex-col gap-4 px-4 py-4 md:px-6">
                        <NativeSelect
                            label="AI service"
                            value={ai.provider ?? ""}
                            onChange={(e) => {
                                const p = (e.target.value || null) as AiProvider | null;
                                setData((d) => ({ ...d, ai: { provider: p, apiKey: p === d.ai.provider ? d.ai.apiKey : "", model: p ? defaultModel(p) : "" } }));
                                test.reset();
                            }}
                            options={[{ value: "", label: "None — I'll copy prompts into a chat app" }, ...AI_PROVIDERS.map((p) => ({ value: p.id, label: p.label }))]}
                        />
                        {provider && (
                            <>
                                <Input
                                    label="API key"
                                    type="password"
                                    icon={Key01}
                                    value={ai.apiKey}
                                    onChange={(v) => setData((d) => ({ ...d, ai: { ...d.ai, apiKey: v.trim() } }))}
                                    placeholder={provider.keyHint}
                                    autoComplete="off"
                                    hint={
                                        <>
                                            Get one at{" "}
                                            <a href={provider.keyUrl} target="_blank" rel="noreferrer" className="font-semibold text-brand-secondary underline">
                                                {new URL(provider.keyUrl).hostname}
                                            </a>
                                            . It&rsquo;s kept in this browser and only sent when you run a prompt.
                                        </>
                                    }
                                />
                                <NativeSelect
                                    label="Model"
                                    value={ai.model}
                                    onChange={(e) => setData((d) => ({ ...d, ai: { ...d.ai, model: e.target.value } }))}
                                    options={provider.models.map((m) => ({ value: m.id, label: m.label }))}
                                />
                                <div className="flex flex-wrap items-center gap-3">
                                    <Button color="secondary" isLoading={test.loading} isDisabled={!ai.apiKey} onClick={() => test.run("Reply with exactly: Connected and working.")}>
                                        Test connection
                                    </Button>
                                    {test.output && (
                                        <span className="flex items-center gap-1.5 text-sm font-medium text-success-primary">
                                            <CheckCircle className="size-4" /> Working
                                        </span>
                                    )}
                                </div>
                                {test.error && (
                                    <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">
                                        {test.error}
                                    </p>
                                )}
                            </>
                        )}
                        <p className="flex gap-2 text-xs text-quaternary">
                            <Lock01 className="size-4 shrink-0" aria-hidden />
                            Your key never gets saved on a server. Don&rsquo;t connect on a shared or public computer.
                        </p>
                    </div>
                </Card>

                <Card>
                    <div id="sources" className="scroll-mt-20" />
                    <CardHeader title="Free data keys" description="Free keys that unlock more UK job listings, real salary data and company checks. Each takes a couple of minutes to get." />
                    <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-primary">
                                    Reed <span className="font-normal text-tertiary">— UK jobs and salaries</span>
                                </p>
                                <Button size="sm" color="link-color" href="https://www.reed.co.uk/developers/jobseeker" target="_blank" rel="noreferrer" iconTrailing={LinkExternal01}>
                                    Get a free key
                                </Button>
                            </div>
                            <Input aria-label="Reed API key" type="password" placeholder="Reed API key" value={keys.reedApiKey} onChange={(v) => setKeys({ reedApiKey: v.trim() })} autoComplete="off" />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-primary">
                                    Companies House <span className="font-normal text-tertiary">— company checks</span>
                                </p>
                                <Button size="sm" color="link-color" href="https://developer.company-information.service.gov.uk/get-started" target="_blank" rel="noreferrer" iconTrailing={LinkExternal01}>
                                    Get a free key
                                </Button>
                            </div>
                            <Input
                                aria-label="Companies House API key"
                                type="password"
                                placeholder="Companies House API key (REST)"
                                value={keys.companiesHouseKey ?? ""}
                                onChange={(v) => setKeys({ companiesHouseKey: v.trim() })}
                                autoComplete="off"
                                hint="Register, create an application, then add a REST API key. Not needed if the site owner has set one."
                            />
                        </div>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-primary">
                                    Adzuna <span className="font-normal text-tertiary">— jobs and salary data</span>
                                </p>
                                <Button size="sm" color="link-color" href="https://developer.adzuna.com/signup" target="_blank" rel="noreferrer" iconTrailing={LinkExternal01}>
                                    Get a free key
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
                                <Input aria-label="Adzuna app ID" placeholder="App ID" value={keys.adzunaAppId} onChange={(v) => setKeys({ adzunaAppId: v.trim() })} autoComplete="off" />
                                <Input aria-label="Adzuna app key" type="password" placeholder="App key" value={keys.adzunaAppKey} onChange={(v) => setKeys({ adzunaAppKey: v.trim() })} autoComplete="off" />
                                <NativeSelect
                                    aria-label="Adzuna country"
                                    value={keys.adzunaCountry}
                                    onChange={(e) => setKeys({ adzunaCountry: e.target.value })}
                                    options={[
                                        { value: "gb", label: "UK" },
                                        { value: "ie", label: "Ireland" },
                                        { value: "us", label: "USA" },
                                        { value: "au", label: "Australia" },
                                        { value: "ca", label: "Canada" },
                                        { value: "de", label: "Germany" },
                                        { value: "fr", label: "France" },
                                        { value: "nl", label: "Netherlands" },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>
                </Card>

                <Card>
                    <CardHeader title="Your data" description="Nothing leaves this device unless you export it. Back up now and then, especially before clearing your browser." />
                    <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap md:px-6">
                        <Button color="secondary" iconLeading={Download01} onClick={exportData}>
                            Download backup
                        </Button>
                        <Button color="secondary" iconLeading={Upload01} onClick={() => fileRef.current?.click()}>
                            Restore a backup
                        </Button>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="application/json,.json"
                            className="hidden"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) importData(f);
                                e.target.value = "";
                            }}
                        />
                        <Button
                            color="secondary-destructive"
                            iconLeading={Trash01}
                            onClick={() => {
                                if (window.confirm("Delete everything — your CV, saved jobs and settings — from this device? Download a backup first if you might want it.")) {
                                    replaceData(emptyData());
                                    window.localStorage.removeItem(STORAGE_KEY);
                                }
                            }}
                        >
                            Delete everything
                        </Button>
                    </div>
                    {importMsg && (
                        <p role="status" className="px-4 pb-4 text-sm text-secondary md:px-6">
                            {importMsg}
                        </p>
                    )}
                    <p className="px-4 pb-4 text-xs text-quaternary md:px-6">Backups don&rsquo;t include your API keys.</p>
                </Card>

                <Card>
                    <CardHeader title="Appearance" />
                    <div className="px-4 py-4 md:px-6">
                        <ThemeSwitch className="max-w-sm" />
                    </div>
                </Card>

                <Card className="p-4 md:p-6">
                    <p className="text-sm font-semibold text-primary">Build your own version</p>
                    <p className="mt-1 text-sm text-tertiary">A complete brief for an AI app builder (Claude, Lovable, Bolt, v0) to make your own copy of this tool.</p>
                    <BuildYourOwnDialog>
                        <Button className="mt-4" color="secondary" iconLeading={Code02}>
                            View the prompt
                        </Button>
                    </BuildYourOwnDialog>
                </Card>
            </div>
        </Page>
    );
};
