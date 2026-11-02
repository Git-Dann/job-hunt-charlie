"use client";

import { Check, Copy01 } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { useClipboard } from "@/hooks/use-clipboard";

export const CopyButton = ({
    text,
    label = "Copy",
    copiedLabel = "Copied",
    color = "secondary",
    size = "sm",
    className,
}: {
    text: string;
    label?: string;
    copiedLabel?: string;
    color?: "primary" | "secondary" | "tertiary";
    size?: "sm" | "md" | "lg";
    className?: string;
}) => {
    const { copied, copy } = useClipboard();
    return (
        <Button size={size} color={color} iconLeading={copied ? Check : Copy01} onClick={() => copy(text)} className={className}>
            {copied ? copiedLabel : label}
        </Button>
    );
};
