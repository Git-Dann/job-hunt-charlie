import type { ReactNode } from "react";

export const PageHeader = ({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) => (
    <div className="flex flex-col gap-4 border-b border-secondary pb-5 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
            <h1 className="text-display-xs font-semibold text-primary md:text-display-sm">{title}</h1>
            {description && <p className="mt-1 text-md text-tertiary">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </div>
);

export const Page = ({ children }: { children: ReactNode }) => <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>;

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
    <section className={`rounded-xl border border-secondary bg-primary shadow-xs ${className}`}>{children}</section>
);

export const CardHeader = ({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) => (
    <div className="flex flex-col gap-3 border-b border-secondary px-4 py-4 sm:flex-row sm:items-start sm:justify-between md:px-6">
        <div className="min-w-0">
            <h2 className="text-lg font-semibold text-primary">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-tertiary">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
    </div>
);
