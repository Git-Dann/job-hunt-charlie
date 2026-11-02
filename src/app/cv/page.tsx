import type { Metadata } from "next";
import { Suspense } from "react";
import { CvView } from "@/components/views/cv-view";

export const metadata: Metadata = { title: "CV builder" };

export default function Page() {
    return (
        <Suspense>
            <CvView />
        </Suspense>
    );
}
