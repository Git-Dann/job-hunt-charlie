import { Briefcase01, File06, Home03, SearchLg, Settings01, Stars02 } from "@untitledui/icons";
import type { FC } from "react";

export interface AppNavItem {
    href: string;
    label: string;
    short: string;
    icon: FC<{ className?: string }>;
}

export const NAV: AppNavItem[] = [
    { href: "/", label: "Home", short: "Home", icon: Home03 },
    { href: "/search", label: "Find jobs", short: "Find", icon: SearchLg },
    { href: "/jobs", label: "My applications", short: "Jobs", icon: Briefcase01 },
    { href: "/cv", label: "CV builder", short: "CV", icon: File06 },
    { href: "/prompts", label: "AI prompts", short: "Prompts", icon: Stars02 },
];

export const SETTINGS_NAV: AppNavItem = { href: "/settings", label: "Settings", short: "Settings", icon: Settings01 };

export const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));
