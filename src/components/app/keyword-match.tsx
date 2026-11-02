"use client";

import { Badge } from "@/components/base/badges/badges";
import { ProgressBar } from "@/components/base/progress-indicators/progress-indicators";
import type { MatchResult } from "@/lib/keywords";

export const KeywordMatch = ({ result, compact }: { result: MatchResult; compact?: boolean }) => {
    const tone = result.score >= 60 ? "Strong match" : result.score >= 35 ? "Partial match" : "Weak match";
    return (
        <div>
            <div className="flex items-baseline justify-between gap-3">
                <p className="text-display-xs font-semibold text-primary">{result.score}%</p>
                <p className="text-sm font-medium text-tertiary">{tone}</p>
            </div>
            <ProgressBar value={result.score} className="mt-2" />
            <p className="mt-2 text-xs text-quaternary">How much of the advert&rsquo;s key language your CV already uses. Aim for 60%+ before you apply.</p>
            {result.missing.length > 0 && (
                <div className="mt-4">
                    <p className="text-sm font-semibold text-secondary">Missing from your CV</p>
                    <p className="mb-2 text-xs text-tertiary">Only add these if they&rsquo;re true for you.</p>
                    <div className="flex flex-wrap gap-1.5">
                        {result.missing.slice(0, compact ? 10 : 20).map((k) => (
                            <Badge key={k.term} size="sm" color="warning">
                                {k.term}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
            {result.matched.length > 0 && (
                <div className="mt-4">
                    <p className="mb-2 text-sm font-semibold text-secondary">Already covered</p>
                    <div className="flex flex-wrap gap-1.5">
                        {result.matched.slice(0, compact ? 10 : 20).map((k) => (
                            <Badge key={k.term} size="sm" color="success">
                                {k.term}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
