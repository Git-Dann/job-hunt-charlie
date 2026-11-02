"use client";

import type { ReactNode } from "react";
import { Code02, LinkExternal01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { BUILD_YOUR_OWN_PROMPT } from "@/lib/build-your-own";
import { AppDialog } from "./app-dialog";
import { CopyButton } from "./copy-button";

const BUILDERS = [
    { label: "Claude", href: "https://claude.ai/new" },
    { label: "Lovable", href: "https://lovable.dev/" },
    { label: "Bolt", href: "https://bolt.new/" },
    { label: "v0", href: "https://v0.app/" },
];

export const BuildYourOwnDialog = ({ children }: { children: ReactNode }) => (
    <AppDialog
        trigger={children}
        icon={Code02}
        width="lg"
        title="Build your own job hunt tool"
        description="Copy this prompt into an AI app builder and it will build a version of this tool that's entirely yours. No coding needed."
        footer={(close) => (
            <>
                <Button color="secondary" onClick={close}>
                    Close
                </Button>
                <CopyButton text={BUILD_YOUR_OWN_PROMPT} label="Copy prompt" copiedLabel="Prompt copied" color="primary" size="md" />
            </>
        )}
    >
        <ol className="mb-4 grid grid-cols-1 gap-2 text-sm text-secondary sm:grid-cols-3">
            {["Copy the prompt below", "Paste it into an app builder", "Follow its steps to publish"].map((s, i) => (
                <li key={s} className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-solid text-xs font-semibold text-white">{i + 1}</span>
                    {s}
                </li>
            ))}
        </ol>
        <div className="mb-4 flex flex-wrap gap-2">
            {BUILDERS.map((b) => (
                <Button key={b.label} size="sm" color="secondary" href={b.href} target="_blank" rel="noreferrer" iconTrailing={LinkExternal01}>
                    {b.label}
                </Button>
            ))}
        </div>
        <pre className="max-h-[50dvh] overflow-auto rounded-lg border border-secondary bg-secondary p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-secondary">
            {BUILD_YOUR_OWN_PROMPT}
        </pre>
    </AppDialog>
);
