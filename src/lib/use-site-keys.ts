"use client";

import { useEffect, useState } from "react";

export interface SiteKeys {
    reed: boolean;
    adzuna: boolean;
}

let cached: Promise<SiteKeys> | null = null;

/** Which data keys are already set up on the site. null while loading. */
export function useSiteKeys(): SiteKeys | null {
    const [state, setState] = useState<SiteKeys | null>(null);
    useEffect(() => {
        cached ??= fetch("/api/site-keys")
            .then((r) => (r.ok ? r.json() : { reed: false, adzuna: false }))
            .catch(() => ({ reed: false, adzuna: false }));
        let live = true;
        cached.then((s) => live && setState(s));
        return () => {
            live = false;
        };
    }, []);
    return state;
}
