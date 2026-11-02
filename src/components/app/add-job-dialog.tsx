"use client";

import { useState } from "react";
import { Plus } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { NativeSelect } from "@/components/base/select/select-native";
import { TextArea } from "@/components/base/textarea/textarea";
import { saveJob } from "@/lib/jobs";
import { uid } from "@/lib/store";
import { JOB_STATUSES, type JobStatus } from "@/lib/types";
import { AppDialog } from "./app-dialog";

export const AddJobDialog = ({ children }: { children: React.ReactNode }) => {
    const [title, setTitle] = useState("");
    const [company, setCompany] = useState("");
    const [url, setUrl] = useState("");
    const [location, setLocation] = useState("");
    const [salary, setSalary] = useState("");
    const [description, setDescription] = useState("");
    const [status, setStatus] = useState<JobStatus>("saved");

    const reset = () => {
        setTitle("");
        setCompany("");
        setUrl("");
        setLocation("");
        setSalary("");
        setDescription("");
        setStatus("saved");
    };

    return (
        <AppDialog
            trigger={children}
            icon={Plus}
            title="Add a job"
            description="Found a role somewhere else? Add it here to track it and use it with your CV and prompts."
            footer={(close) => (
                <>
                    <Button color="secondary" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        isDisabled={!title.trim()}
                        onClick={() => {
                            const link = url.trim() ? (/^https?:\/\//.test(url.trim()) ? url.trim() : `https://${url.trim()}`) : "";
                            saveJob(
                                {
                                    id: `m${uid().slice(0, 8)}`,
                                    title: title.trim(),
                                    company: company.trim(),
                                    url: link,
                                    location: location.trim() || undefined,
                                    salary: salary.trim() || undefined,
                                    description: description.trim() || undefined,
                                    source: "Added by me",
                                },
                                status,
                            );
                            reset();
                            close();
                        }}
                    >
                        Add job
                    </Button>
                </>
            )}
        >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input label="Job title" isRequired value={title} onChange={setTitle} placeholder="e.g. Events Manager" />
                <Input label="Company" value={company} onChange={setCompany} />
                <Input label="Link to the advert" value={url} onChange={setUrl} placeholder="https://" inputMode="url" />
                <Input label="Location" value={location} onChange={setLocation} />
                <Input label="Salary" value={salary} onChange={setSalary} placeholder="e.g. £35,000" />
                <NativeSelect label="Stage" value={status} onChange={(e) => setStatus(e.target.value as JobStatus)} options={JOB_STATUSES.map((s) => ({ value: s.id, label: s.label }))} />
                <TextArea
                    className="sm:col-span-2"
                    label="Job description"
                    rows={6}
                    value={description}
                    onChange={setDescription}
                    hint="Paste the full advert. It powers the CV match and the AI prompts."
                />
            </div>
        </AppDialog>
    );
};
