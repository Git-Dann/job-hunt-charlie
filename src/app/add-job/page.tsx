import type { Metadata } from "next";
import { Suspense } from "react";
import { AddJobView } from "@/components/views/add-job-view";

export const metadata: Metadata = { title: "Save a job" };

export default function Page() {
    return (
        <Suspense>
            <AddJobView />
        </Suspense>
    );
}
