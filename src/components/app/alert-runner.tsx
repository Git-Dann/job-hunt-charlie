"use client";

import { useEffect } from "react";
import { checkAlerts } from "@/lib/alert-runner";

/** Checks due job alerts shortly after the app opens, and again when she comes back to the tab. */
export const AlertRunner = () => {
    useEffect(() => {
        // Give cloud sync a moment to bring in searches saved on another device first.
        const t = setTimeout(() => void checkAlerts(), 4000);
        const onVisible = () => document.visibilityState === "visible" && void checkAlerts();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            clearTimeout(t);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, []);
    return null;
};
