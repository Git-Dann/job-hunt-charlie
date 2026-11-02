"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { addInterview } from "@/lib/interview-actions";
import { FORMATS } from "@/lib/interviews";
import { useAppData } from "@/lib/store";
import type { Interview } from "@/lib/types";
import { AppDialog } from "./app-dialog";

const ROUNDS = ["Phone screen", "1st interview", "2nd interview", "Final interview", "Assessment centre", "Informal chat"];

export const AddInterviewDialog = ({ children, jobId: fixedJob }: { children: React.ReactNode; jobId?: string }) => {
    const { jobs } = useAppData();
    const router = useRouter();
    const [jobId, setJobId] = useState(fixedJob ?? "");
    const [round, setRound] = useState(ROUNDS[1]);
    const [when, setWhen] = useState("");
    const [duration, setDuration] = useState("45");
    const [format, setFormat] = useState<Interview["format"]>("video");
    const [where, setWhere] = useState("");
    const [interviewers, setInterviewers] = useState("");
    const job = fixedJob ?? jobId;

    return (
        <AppDialog
            trigger={children}
            icon={CalendarPlus01}
            title="Add an interview"
            description="You'll get a prep pack built from the advert and your answer bank, a checklist, and a calendar invite."
            footer={(close) => (
                <>
                    <Button color="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        isDisabled={!job || !when}
                        onClick={() => {
                            const id = addInterview({ jobId: job, round, when, durationMins: Number(duration) || 45, format, where: where.trim(), interviewers: interviewers.trim() });
                            close();
                            router.push(`/interviews/${id}`);
                        }}
                    >
                        Add interview
                    </Button>
                </>
            )}
        >
            {jobs.length === 0 ? (
                <p className="text-sm text-tertiary">Save or add the job first, then add the interview to it.</p>
            ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {!fixedJob && (
                        <NativeSelect
                            className="sm:col-span-2"
                            label="Which job?"
                            value={jobId}
                            onChange={(e) => setJobId(e.target.value)}
                            options={[{ value: "", label: "Choose a job…" }, ...jobs.map((j) => ({ value: j.id, label: `${j.title}${j.company ? ` — ${j.company}` : ""}` }))]}
                        />
                    )}
                    <NativeSelect label="Stage" value={round} onChange={(e) => setRound(e.target.value)} options={ROUNDS.map((r) => ({ value: r, label: r }))} />
                    <NativeSelect label="Format" value={format} onChange={(e) => setFormat(e.target.value as Interview["format"])} options={FORMATS.map((f) => ({ value: f.id, label: f.label }))} />
                    <Input label="Date and time" type="datetime-local" isRequired value={when} onChange={setWhen} />
                    <NativeSelect
                        label="Length"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        options={["15", "30", "45", "60", "90", "120", "180"].map((m) => ({ value: m, label: Number(m) >= 60 ? `${Number(m) / 60} hour${m === "60" ? "" : "s"}` : `${m} minutes` }))}
                    />
                    <Input className="sm:col-span-2" label={format === "video" ? "Video link" : format === "phone" ? "Who's calling whom / number" : "Address"} value={where} onChange={setWhere} />
                    <Input className="sm:col-span-2" label="Who you're meeting" placeholder="e.g. Sam Patel (Head of Events), HR" value={interviewers} onChange={setInterviewers} />
                </div>
            )}
        </AppDialog>
    );
};
