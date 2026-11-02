"use client";

import { Monitor01, Moon01, Sun } from "@untitledui/icons";
import { useTheme } from "next-themes";
import { useHydrated } from "@/lib/store";
import { cx } from "@/utils/cx";

const OPTIONS = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon01 },
    { id: "system", label: "Auto", icon: Monitor01 },
];

export const ThemeSwitch = ({ className }: { className?: string }) => {
    const { theme, setTheme } = useTheme();
    const hydrated = useHydrated();
    return (
        <div role="radiogroup" aria-label="Appearance" className={cx("grid grid-cols-3 gap-1 rounded-lg bg-secondary p-1", className)}>
            {OPTIONS.map((o) => {
                const on = hydrated && theme === o.id;
                return (
                    <button
                        key={o.id}
                        type="button"
                        role="radio"
                        aria-checked={on}
                        onClick={() => setTheme(o.id)}
                        className={cx(
                            "flex h-8 items-center justify-center gap-1.5 rounded-md text-xs font-semibold outline-focus-ring focus-visible:outline-2",
                            on ? "bg-primary text-secondary shadow-xs" : "text-quaternary hover:text-tertiary",
                        )}
                    >
                        <o.icon className="size-4" aria-hidden />
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
};
