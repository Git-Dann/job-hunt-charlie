"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, XClose } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";

/** Add skills one at a time (Enter or comma), reorder, remove. Order matters: the first ones show first on the CV. */
export const SkillEditor = ({ skills, onChange, highlight }: { skills: string[]; onChange: (s: string[]) => void; highlight?: (s: string) => boolean }) => {
    const [draft, setDraft] = useState("");
    const add = () => {
        const parts = draft
            .split(/[,;\n]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .filter((s) => !skills.some((x) => x.toLowerCase() === s.toLowerCase()));
        if (parts.length) onChange([...skills, ...parts]);
        setDraft("");
    };
    const move = (i: number, by: number) => {
        const next = [...skills];
        const [x] = next.splice(i, 1);
        next.splice(Math.max(0, Math.min(next.length, i + by)), 0, x);
        onChange(next);
    };
    return (
        <div>
            <div className="flex gap-2">
                <Input
                    aria-label="Add a skill"
                    placeholder="Type a skill and press Enter"
                    value={draft}
                    onChange={(v) => (v.endsWith(",") ? (setDraft(v.slice(0, -1)), setTimeout(add)) : setDraft(v))}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault();
                            add();
                        }
                    }}
                    className="flex-1"
                />
                <Button color="secondary" iconLeading={Plus} onClick={add} isDisabled={!draft.trim()} aria-label="Add skill" />
            </div>
            {skills.length > 0 ? (
                <ol className="mt-3 flex flex-col gap-1.5">
                    {skills.map((s, i) => (
                        <li
                            key={`${s}-${i}`}
                            className={`flex items-center gap-2 rounded-lg py-1 pr-1 pl-3 text-sm ring-1 ring-inset ${highlight?.(s) ? "bg-success-primary text-success-primary ring-utility-green-200" : "bg-primary text-secondary ring-secondary"}`}
                        >
                            <span className="w-5 shrink-0 text-xs text-quaternary">{i + 1}</span>
                            <span className="min-w-0 flex-1 truncate font-medium">{s}</span>
                            <button type="button" aria-label={`Move ${s} up`} disabled={i === 0} onClick={() => move(i, -1)} className="flex size-8 items-center justify-center rounded-md text-fg-quaternary hover:bg-primary_hover disabled:opacity-30">
                                <ArrowUp className="size-4" />
                            </button>
                            <button type="button" aria-label={`Move ${s} down`} disabled={i === skills.length - 1} onClick={() => move(i, 1)} className="flex size-8 items-center justify-center rounded-md text-fg-quaternary hover:bg-primary_hover disabled:opacity-30">
                                <ArrowDown className="size-4" />
                            </button>
                            <button type="button" aria-label={`Remove ${s}`} onClick={() => onChange(skills.filter((_, j) => j !== i))} className="flex size-8 items-center justify-center rounded-md text-fg-quaternary hover:bg-primary_hover">
                                <XClose className="size-4" />
                            </button>
                        </li>
                    ))}
                </ol>
            ) : (
                <p className="mt-2 text-sm text-tertiary">Aim for 8–12. Mix hard skills (tools, software) with strengths (e.g. stakeholder management).</p>
            )}
        </div>
    );
};

/** One bullet per line in a textarea — the quickest way to edit lists on a phone. */
export const linesToList = (v: string) => v.split("\n").map((l) => l.replace(/^\s*[-•*]\s?/, ""));
export const listToLines = (l: string[]) => l.join("\n");
