import { Briefcase02 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

export const AppLogo = ({ className }: { className?: string }) => (
    <div className={cx("flex min-w-0 items-center gap-2.5", className)}>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-solid text-white shadow-xs">
            <Briefcase02 className="size-4.5" aria-hidden />
        </span>
        <span className="truncate text-md font-semibold text-primary">Charlie&rsquo;s Job Platform</span>
    </div>
);
