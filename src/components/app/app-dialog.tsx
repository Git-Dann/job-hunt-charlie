"use client";

import type { FC, ReactNode } from "react";
import { XClose } from "@untitledui/icons";
import { Heading as AriaHeading } from "react-aria-components";
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { FeaturedIcon } from "@/components/foundations/featured-icon/featured-icon";
import { cx } from "@/utils/cx";

interface AppDialogProps {
    /** The element that opens the dialog. Omit and use isOpen for a controlled dialog. */
    trigger?: ReactNode;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
    title: string;
    description?: ReactNode;
    icon?: FC<{ className?: string }>;
    width?: "sm" | "md" | "lg" | "xl";
    children: ReactNode | ((close: () => void) => ReactNode);
    footer?: (close: () => void) => ReactNode;
}

const WIDTHS = { sm: "sm:max-w-md", md: "sm:max-w-xl", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

/** The Untitled UI modal layout: icon + title header, scrolling body, pinned footer. Slides up from the bottom on phones. */
export const AppDialog = ({ trigger, isOpen, onOpenChange, title, description, icon, width = "md", children, footer }: AppDialogProps) => {
    const body = (
        <ModalOverlay isDismissable isOpen={isOpen} onOpenChange={onOpenChange}>
            <Modal className={cx("flex max-h-[min(92dvh,var(--visual-viewport-height))] flex-col overflow-hidden", WIDTHS[width])}>
                <Dialog className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    {({ close }) => (
                        <>
                            <div className="relative flex shrink-0 gap-4 px-4 pt-5 pb-4 sm:px-6 sm:pt-6">
                                {icon && <FeaturedIcon icon={icon} color="brand" theme="light" size="lg" className="max-sm:hidden" />}
                                <div className="min-w-0 flex-1 pr-8">
                                    <AriaHeading slot="title" className="text-lg font-semibold text-primary">
                                        {title}
                                    </AriaHeading>
                                    {description && <div className="mt-1 text-sm text-tertiary">{description}</div>}
                                </div>
                                <button
                                    type="button"
                                    onClick={close}
                                    aria-label="Close"
                                    className="absolute top-3 right-3 flex size-10 items-center justify-center rounded-lg text-fg-quaternary outline-focus-ring hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2"
                                >
                                    <XClose className="size-6" />
                                </button>
                            </div>
                            <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-6">{typeof children === "function" ? children(close) : children}</div>
                            {footer && (
                                <div className="flex shrink-0 flex-col-reverse gap-3 border-t border-secondary px-4 py-4 sm:flex-row sm:justify-end sm:px-6">{footer(close)}</div>
                            )}
                        </>
                    )}
                </Dialog>
            </Modal>
        </ModalOverlay>
    );
    if (trigger === undefined) return body;
    return (
        <DialogTrigger>
            {trigger}
            {body}
        </DialogTrigger>
    );
};
