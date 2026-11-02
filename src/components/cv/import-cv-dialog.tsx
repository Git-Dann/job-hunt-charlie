"use client";

import { useState } from "react";
import { Upload01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { AppDialog } from "@/components/app/app-dialog";
import { parseCvText } from "@/lib/cv";
import { setData, uid } from "@/lib/store";
import type { Profile } from "@/lib/types";

const FIELD_LABELS: Partial<Record<keyof Profile, string>> = {
    name: "Name",
    email: "Email",
    phone: "Phone",
    linkedin: "LinkedIn",
    headline: "Headline",
    location: "Location",
    summary: "Summary",
    experience: "Jobs",
    education: "Education",
    certifications: "Certifications",
    skills: "Skills",
    extras: "Additional",
};

export const ImportCvDialog = ({ children }: { children: React.ReactNode }) => {
    const [text, setText] = useState("");
    const parsed = text.trim().length > 40 ? parseCvText(text, uid) : {};
    const found = Object.entries(parsed).filter(([, v]) => (Array.isArray(v) ? v.length : v));

    return (
        <AppDialog
            trigger={children}
            icon={Upload01}
            width="lg"
            title="Paste your current CV"
            description="Open your CV, select all, copy, and paste it here. We'll fill in what we can — you check the rest."
            footer={(close) => (
                <>
                    <Button color="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        isDisabled={!found.length}
                        onClick={() => {
                            setData((d) => {
                                const p = { ...d.profile };
                                // Only fill empty fields: never overwrite what she's already written.
                                for (const [k, v] of Object.entries(parsed) as [keyof Profile, never][]) {
                                    const cur = p[k] as unknown;
                                    if (Array.isArray(cur) ? cur.length === 0 : !String(cur ?? "").trim()) (p[k] as unknown) = v;
                                }
                                // Couldn't read the job history: keep the original text handy to copy from.
                                if (!parsed.experience?.length)
                                    p.extras = [p.extras, `--- Imported CV (copy anything useful into the sections above, then delete this) ---\n${text.trim()}`].filter(Boolean).join("\n\n");
                                return { ...d, profile: p };
                            });
                            setText("");
                            close();
                        }}
                    >
                        Fill in my details
                    </Button>
                </>
            )}
        >
            <TextArea aria-label="Your CV text" rows={12} value={text} onChange={setText} placeholder="Paste your whole CV here…" />
            {found.length > 0 && (
                <div className="mt-4 rounded-lg bg-secondary p-3 text-sm">
                    <p className="font-semibold text-secondary">Found:</p>
                    <ul className="mt-1 list-disc pl-5 text-tertiary">
                        {found.map(([k, v]) => (
                            <li key={k}>
                                {FIELD_LABELS[k as keyof Profile] ?? k}: {Array.isArray(v) ? `${v.length} items` : String(v).slice(0, 60)}
                                {String(v).length > 60 ? "…" : ""}
                            </li>
                        ))}
                    </ul>
                    {!parsed.experience?.length && (
                        <p className="mt-2 text-xs text-quaternary">
                            Couldn&rsquo;t read your job history automatically, so the full text will be kept under &ldquo;Additional&rdquo; to copy from. Tip: the &ldquo;Help me write my CV&rdquo; AI prompt
                            rewrites any CV in a format this reads perfectly.
                        </p>
                    )}
                </div>
            )}
        </AppDialog>
    );
};
