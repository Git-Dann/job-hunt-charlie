"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle, CloudOff, RefreshCw01 } from "@untitledui/icons";
import { timeAgo } from "@/lib/jobs";
import { startSync, useSyncStatus } from "@/lib/sync";
import { cx } from "@/utils/cx";

/** Starts cloud sync once for the whole app. Renders nothing. */
export const SyncManager = () => {
    useEffect(() => startSync(), []);
    return null;
};

/** One quiet line: is her data backed up? Hidden while sync is off. */
export const SyncIndicator = ({ className }: { className?: string }) => {
    const s = useSyncStatus();
    if (s.state === "off" && !s.message) return null;
    const view = {
        idle: { icon: CheckCircle, text: s.lastSyncedAt ? `Synced ${timeAgo(s.lastSyncedAt).toLowerCase()}` : "Synced", tone: "text-tertiary" },
        syncing: { icon: RefreshCw01, text: "Syncing…", tone: "text-tertiary" },
        offline: { icon: CloudOff, text: "Offline — saved on this device", tone: "text-warning-primary" },
        error: { icon: AlertCircle, text: "Sync problem — see Settings", tone: "text-error-primary" },
        off: { icon: AlertCircle, text: "Sync turned off — see Settings", tone: "text-warning-primary" },
    }[s.state];
    return (
        <a
            href="/settings#sync"
            title={s.message}
            className={cx("flex items-center gap-2 rounded-md text-xs font-medium outline-focus-ring hover:underline focus-visible:outline-2", view.tone, className)}
        >
            <view.icon className={cx("size-4 shrink-0", s.state === "syncing" && "animate-spin")} aria-hidden />
            {view.text}
        </a>
    );
};
