"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Code02 } from "@untitledui/icons";
import { Link as AriaLink } from "react-aria-components";
import { NavItemBase } from "@/components/application/app-navigation/base-components/nav-item";
import { Button } from "@/components/base/buttons/button";
import { ThemeSwitch } from "@/components/app/theme-switch";
import { cx } from "@/utils/cx";
import { BuildYourOwnDialog } from "./build-your-own-dialog";
import { AppLogo } from "./logo";
import { NAV, SETTINGS_NAV, isActive } from "./nav";

export const AppShell = ({ children }: { children: ReactNode }) => {
    const pathname = usePathname();

    return (
        <div className="flex min-h-dvh flex-col bg-primary lg:flex-row">
            {/* Desktop sidebar (Untitled UI sidebar pattern) */}
            <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-secondary bg-primary lg:flex">
                <div className="px-5 pt-6 pb-5">
                    <AriaLink href="/" aria-label="Home" className="rounded-md outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-2">
                        <AppLogo />
                    </AriaLink>
                </div>
                <nav aria-label="Main" className="flex-1 overflow-y-auto px-4">
                    <ul className="flex flex-col gap-0.5">
                        {NAV.map((item) => (
                            <li key={item.href}>
                                <NavItemBase type="link" href={item.href} icon={item.icon} current={isActive(pathname, item.href)}>
                                    {item.label}
                                </NavItemBase>
                            </li>
                        ))}
                    </ul>
                </nav>
                <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
                    <div className="rounded-xl bg-secondary p-4">
                        <p className="text-sm font-semibold text-primary">Want your own version?</p>
                        <p className="mt-1 text-sm text-tertiary">Get a ready-made prompt that builds this whole tool with any AI app builder.</p>
                        <BuildYourOwnDialog>
                            <Button size="sm" color="secondary" iconLeading={Code02} className="mt-3 w-full">
                                Build your own
                            </Button>
                        </BuildYourOwnDialog>
                    </div>
                    <ul className="flex flex-col gap-0.5">
                        <li>
                            <NavItemBase type="link" href={SETTINGS_NAV.href} icon={SETTINGS_NAV.icon} current={isActive(pathname, SETTINGS_NAV.href)}>
                                {SETTINGS_NAV.label}
                            </NavItemBase>
                        </li>
                    </ul>
                    <ThemeSwitch />
                </div>
            </aside>

            {/* Mobile top bar */}
            <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-secondary bg-primary/95 px-4 backdrop-blur pt-[env(safe-area-inset-top)] box-content lg:hidden">
                <AriaLink href="/" aria-label="Home" className="rounded-md outline-focus-ring focus-visible:outline-2">
                    <AppLogo />
                </AriaLink>
                <div className="flex items-center gap-1">
                    <BuildYourOwnDialog>
                        <Button size="sm" color="tertiary" iconLeading={Code02} aria-label="Build your own">
                            <span className="max-[380px]:sr-only">Build your own</span>
                        </Button>
                    </BuildYourOwnDialog>
                    <AriaLink
                        href={SETTINGS_NAV.href}
                        aria-label="Settings"
                        className={cx(
                            "flex size-10 items-center justify-center rounded-lg text-fg-quaternary outline-focus-ring hover:bg-primary_hover focus-visible:outline-2",
                            isActive(pathname, SETTINGS_NAV.href) && "bg-secondary text-fg-secondary",
                        )}
                    >
                        <SETTINGS_NAV.icon className="size-5" />
                    </AriaLink>
                </div>
            </header>

            <main className="min-w-0 flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</main>

            {/* Mobile bottom tab bar */}
            <nav
                aria-label="Main"
                className="fixed inset-x-0 bottom-0 z-30 border-t border-secondary bg-primary/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
            >
                <ul className="mx-auto grid max-w-lg grid-cols-5">
                    {NAV.map((item) => {
                        const active = isActive(pathname, item.href);
                        return (
                            <li key={item.href}>
                                <AriaLink
                                    href={item.href}
                                    aria-current={active ? "page" : undefined}
                                    className={cx(
                                        "flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
                                        active ? "text-brand-secondary" : "text-quaternary",
                                    )}
                                >
                                    <span className={cx("flex h-7 w-12 items-center justify-center rounded-full transition", active && "bg-brand-primary")}>
                                        <item.icon className={cx("size-5", active ? "text-fg-brand-primary" : "text-fg-quaternary")} />
                                    </span>
                                    {item.short}
                                </AriaLink>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
};
