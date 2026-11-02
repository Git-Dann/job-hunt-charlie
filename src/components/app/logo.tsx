import { Briefcase02 } from "@untitledui/icons";
import { cx } from "@/utils/cx";

export const AppLogo = ({ className }: { className?: string }) => (
    <div className={cx("flex items-center gap-2.5", className)}>
        <span className="flex size-8 items-center justify-center rounded-lg bg-brand-solid text-white shadow-xs">
            <Briefcase02 className="size-4.5" aria-hidden />
        </span>
        <span className="text-md font-semibold text-primary">Job Hunt</span>
    </div>
);
