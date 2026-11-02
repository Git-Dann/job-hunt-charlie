import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/views/search-view";

export const metadata: Metadata = { title: "Find jobs" };

export default function Page() {
    return (
        <Suspense>
            <SearchView />
        </Suspense>
    );
}
