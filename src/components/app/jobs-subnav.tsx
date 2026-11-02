"use client";

import { usePathname } from "next/navigation";
import { Link as AriaLink } from "react-aria-components";
import { cx } from "@/utils/cx";

const ITEMS = [
    { href: "/jobs", label: "Applications" },
    { href: "/interviews", label: "Interviews" },
    { href: "/progress", label: "Progress" },
];

/** Applications, interviews and progress are one area: a switch between them, so phones don't need more tabs. */
export const JobsSubnav = () => {
    const pathname = usePathname();
    return (
        <nav aria-label="Applications area" className="mb-6 grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1 sm:inline-grid sm:w-auto">
            {ITEMS.map((i) => {
                const on = pathname === i.href || (i.href !== "/jobs" && pathname.startsWith(i.href));
                return (
                    <AriaLink
                        key={i.href}
                        href={i.href}
                        aria-current={on ? "page" : undefined}
                        className={cx(
                            "flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold outline-focus-ring focus-visible:outline-2",
                            on ? "bg-primary text-secondary shadow-xs" : "text-quaternary hover:text-tertiary",
                        )}
                    >
                        {i.label}
                    </AriaLink>
                );
            })}
        </nav>
    );
};
