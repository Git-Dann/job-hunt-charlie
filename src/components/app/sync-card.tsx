"use client";

import { useEffect, useState } from "react";
import { Cloud01, Database01, LinkExternal01, Phone01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { CopyButton } from "@/components/app/copy-button";
import { Card, CardHeader } from "@/components/app/page-header";
import { timeAgo } from "@/lib/jobs";
import { deleteCloudCopy, disableSync, enableSync, joinSync, pull, serverHasDatabase, useSyncStatus } from "@/lib/sync";

export const SyncCard = () => {
    const s = useSyncStatus();
    const [dbReady, setDbReady] = useState<boolean | null>(null);
    const [joinCode, setJoinCode] = useState("");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [justCreated, setJustCreated] = useState(false);

    useEffect(() => {
        serverHasDatabase().then(setDbReady);
    }, []);

    const act = async (name: string, fn: () => Promise<unknown>) => {
        setBusy(name);
        setError("");
        try {
            await fn();
        } catch (e) {
            setError(e instanceof Error ? e.message : "Something went wrong.");
        } finally {
            setBusy(null);
        }
    };

    const on = s.code !== null;

    return (
        <Card>
            <div id="sync" className="scroll-mt-20" />
            <CardHeader
                title="Sync across your devices"
                description="Keep your CV, jobs and notes in step between your phone and laptop, with a backup in the cloud."
                actions={on ? <Badge color={s.state === "error" ? "error" : "success"}>{s.state === "error" ? "Problem" : "On"}</Badge> : <Badge color="gray">Off</Badge>}
            />
            <div className="flex flex-col gap-5 px-4 py-4 md:px-6">
                {dbReady === false && !on && (
                    <div className="flex gap-3 rounded-lg bg-secondary p-4">
                        <FeaturedIcon icon={Database01} color="gray" theme="modern" size="md" />
                        <div className="min-w-0 text-sm">
                            <p className="font-semibold text-primary">No database connected yet</p>
                            <p className="mt-1 text-tertiary">
                                Whoever runs this site needs to add a free Neon database in Vercel: open the project → <strong>Storage</strong> → <strong>Create</strong> →{" "}
                                <strong>Neon</strong>, connect it, then redeploy. Everything still works on this device in the meantime.
                            </p>
                        </div>
                    </div>
                )}

                {on ? (
                    <>
                        <div className="rounded-lg border border-secondary bg-secondary p-4">
                            <p className="text-sm font-semibold text-primary">Your sync code</p>
                            <p className="mt-1 text-sm text-tertiary">
                                {justCreated ? "Save this somewhere safe (a password manager is ideal). " : ""}Enter it on another device to see the same data. Anyone with this code can see your data,
                                so keep it private.
                            </p>
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                                <code className="rounded-md bg-primary px-3 py-2 font-mono text-md font-semibold tracking-wider break-all text-primary ring-1 ring-secondary ring-inset">
                                    {s.code}
                                </code>
                                <CopyButton text={s.code!} label="Copy code" />
                            </div>
                        </div>
                        <p className="text-sm text-tertiary">
                            {s.state === "syncing"
                                ? "Syncing…"
                                : s.state === "offline"
                                  ? "You're offline. Changes are saved on this device and will sync when you're back."
                                  : s.lastSyncedAt
                                    ? `Last synced ${timeAgo(s.lastSyncedAt).toLowerCase()}.`
                                    : "Not synced yet."}
                            {s.state === "error" && s.message ? ` ${s.message}` : ""}
                        </p>
                        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                            <Button color="secondary" isLoading={busy === "pull"} onClick={() => act("pull", () => pull(true))}>
                                Sync now
                            </Button>
                            <Button
                                color="secondary"
                                onClick={() => {
                                    if (window.confirm("Stop syncing on this device? Your data stays here and in the cloud; you can turn it back on with your code.")) disableSync();
                                }}
                            >
                                Turn off on this device
                            </Button>
                            <Button
                                color="secondary-destructive"
                                isLoading={busy === "delete"}
                                onClick={() => {
                                    if (window.confirm("Delete the cloud copy? Data on this device stays, but other devices will stop syncing.")) act("delete", deleteCloudCopy);
                                }}
                            >
                                Delete cloud copy
                            </Button>
                        </div>
                    </>
                ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="flex flex-col rounded-lg border border-secondary p-4">
                            <FeaturedIcon icon={Cloud01} color="brand" theme="light" size="md" />
                            <p className="mt-3 text-sm font-semibold text-primary">First device</p>
                            <p className="mt-1 flex-1 text-sm text-tertiary">Turn on sync here. You&rsquo;ll get a private code to use on your other devices.</p>
                            <Button className="mt-4" isLoading={busy === "enable"} isDisabled={dbReady === false} onClick={() => act("enable", async () => (await enableSync(), setJustCreated(true)))}>
                                Turn on sync
                            </Button>
                        </div>
                        <div className="flex flex-col rounded-lg border border-secondary p-4">
                            <FeaturedIcon icon={Phone01} color="gray" theme="modern" size="md" />
                            <p className="mt-3 text-sm font-semibold text-primary">Already set up elsewhere?</p>
                            <p className="mt-1 text-sm text-tertiary">Enter your code. Anything already on this device is kept and combined.</p>
                            <Input
                                className="mt-3"
                                aria-label="Sync code"
                                placeholder="ABCD-EFGH-JKLM-NPQR-STUV"
                                value={joinCode}
                                onChange={setJoinCode}
                                autoComplete="off"
                            />
                            <Button className="mt-3" color="secondary" isLoading={busy === "join"} isDisabled={!joinCode.trim() || dbReady === false} onClick={() => act("join", () => joinSync(joinCode))}>
                                Connect this device
                            </Button>
                        </div>
                    </div>
                )}

                {(error || (s.state === "error" && !on && s.message)) && (
                    <p role="alert" className="rounded-lg bg-error-primary p-3 text-sm text-error-primary">
                        {error || s.message}
                    </p>
                )}
                <p className="text-xs text-quaternary">
                    API keys are never synced — add them on each device. Stored in your project&rsquo;s own database.{" "}
                    <a href="https://neon.com/docs/introduction" target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
                        About Neon <LinkExternal01 className="size-3" />
                    </a>
                </p>
            </div>
        </Card>
    );
};
