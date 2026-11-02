import type { Metadata } from "next";
import { Suspense } from "react";
import { AnswersView } from "@/components/views/answers-view";

export const metadata: Metadata = { title: "Answer bank" };

export default function Page() {
    return (
        <Suspense>
            <AnswersView />
        </Suspense>
    );
}
