"use client";

import { useEffect, useState } from "react";
import { Bookmark, Link01, Phone01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { CopyButton } from "@/components/app/copy-button";
import { Card, CardHeader } from "@/components/app/page-header";
import { bookmarkletSource } from "@/lib/save-job";

/** How to save a job from any website, on every kind of device. */
export const SaveAnywhereCard = () => {
    const [origin, setOrigin] = useState("");
    useEffect(() => setOrigin(window.location.origin), []);
    const bookmarklet = origin ? bookmarkletSource(origin) : "#";

    return (
        <Card>
            <div id="save-anywhere" className="scroll-mt-20" />
            <CardHeader title="Save jobs from any website" description="Reading a job on LinkedIn, Indeed or a company site? Save it here in one tap." />
            <div className="flex flex-col gap-6 px-4 py-4 md:px-6">
                <section>
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Bookmark className="size-4" aria-hidden /> On a laptop: the Save button
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-tertiary">
                        <li>Show your bookmarks bar (Chrome/Edge: Ctrl+Shift+B, Mac ⌘+Shift+B; Safari: View → Show Favourites Bar).</li>
                        <li>Drag the purple button below onto the bookmarks bar.</li>
                        <li>On any job advert, click it. The job opens here with the details filled in — tip: select the description text first if a site hides it.</li>
                    </ol>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                        {/* A bookmarklet must be a real <a href="javascript:…">; React would block it, so it's set directly. */}
                        <a
                            ref={(el) => {
                                if (el && origin) el.setAttribute("href", bookmarklet);
                            }}
                            onClick={(e) => e.preventDefault()}
                            draggable
                            className="inline-flex cursor-grab items-center gap-2 rounded-lg bg-brand-solid px-4 py-2.5 text-sm font-semibold text-white shadow-xs active:cursor-grabbing"
                            title="Drag me to your bookmarks bar"
                        >
                            <Bookmark className="size-4" aria-hidden /> Save to Charlie&rsquo;s Jobs
                        </a>
                        <span className="text-xs text-quaternary">← drag, don&rsquo;t click</span>
                    </div>
                    <details className="mt-3 text-sm text-tertiary">
                        <summary className="cursor-pointer font-medium text-secondary">Can&rsquo;t drag? Add it by hand</summary>
                        <p className="mt-2">Create a new bookmark called &ldquo;Save to Charlie&rsquo;s Jobs&rdquo; and paste this as its address:</p>
                        <div className="mt-2">
                            <CopyButton text={bookmarklet} label="Copy bookmark address" />
                        </div>
                    </details>
                </section>

                <section>
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Phone01 className="size-4" aria-hidden /> On Android
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-tertiary">
                        <li>Open this site in Chrome, tap ⋮ → <strong>Add to Home screen</strong> (or Install app).</li>
                        <li>In any job app or website, tap <strong>Share</strong> → <strong>Charlie&rsquo;s Jobs</strong>.</li>
                    </ol>
                </section>

                <section>
                    <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                        <Link01 className="size-4" aria-hidden /> On iPhone (or anywhere)
                    </p>
                    <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-tertiary">
                        <li>In the job app or website, tap Share → <strong>Copy</strong> (or Copy link).</li>
                        <li>Open this site and tap <strong>Save a job</strong>, then paste the link. The details are read for you where the site allows.</li>
                        <li>Tip: in Safari tap Share → <strong>Add to Home Screen</strong> so it opens like an app.</li>
                    </ol>
                    <Button className="mt-3" size="sm" color="secondary" href="/add-job" iconLeading={Link01}>
                        Save a job from a link
                    </Button>
                </section>
            </div>
        </Card>
    );
};
