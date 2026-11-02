import { BarChart10, Briefcase01, CalendarCheck01, File06, Home03, MessageTextSquare02, SearchLg, Settings01, Stars02 } from "@untitledui/icons";
import type { FC } from "react";

export interface AppNavItem {
    href: string;
    label: string;
    short: string;
    icon: FC<{ className?: string }>;
    /** On phones these live inside the Jobs area's switch, to keep the tab bar to 6. */
    desktopOnly?: boolean;
}

export const NAV: AppNavItem[] = [
    { href: "/", label: "Home", short: "Home", icon: Home03 },
    { href: "/search", label: "Find jobs", short: "Find", icon: SearchLg },
    { href: "/jobs", label: "My applications", short: "Jobs", icon: Briefcase01 },
    { href: "/interviews", label: "Interviews", short: "Interviews", icon: CalendarCheck01, desktopOnly: true },
    { href: "/progress", label: "Progress", short: "Progress", icon: BarChart10, desktopOnly: true },
    { href: "/cv", label: "CV builder", short: "CV", icon: File06 },
    { href: "/answers", label: "Answer bank", short: "Answers", icon: MessageTextSquare02 },
    { href: "/prompts", label: "AI prompts", short: "Prompts", icon: Stars02 },
];

export const SETTINGS_NAV: AppNavItem = { href: "/settings", label: "Settings", short: "Settings", icon: Settings01 };

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

/** On phones the Jobs tab stays lit for interviews and progress too. */
export const isActiveMobile = (pathname: string, href: string) =>
    isActive(pathname, href) || (href === "/jobs" && (isActive(pathname, "/interviews") || isActive(pathname, "/progress") || pathname === "/add-job"));
