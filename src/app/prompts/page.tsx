import type { Metadata } from "next";
import { Suspense } from "react";
import { PromptsView } from "@/components/views/prompts-view";

export const metadata: Metadata = { title: "AI prompts" };

export default function Page() {
    return (
        <Suspense>
            <PromptsView />
        </Suspense>
    );
}
