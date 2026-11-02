import type { Metadata } from "next";
import { Suspense } from "react";
import { JobsView } from "@/components/views/jobs-view";

export const metadata: Metadata = { title: "My applications" };

export default function Page() {
    return (
        <Suspense>
            <JobsView />
        </Suspense>
    );
}
