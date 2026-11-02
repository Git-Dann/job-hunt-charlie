import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { AppShell } from "@/components/app/app-shell";
import { RouteProvider } from "@/providers/router-provider";
import { Theme } from "@/providers/theme";
import "@/styles/globals.css";
import { cx } from "@/utils/cx";

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

export const metadata: Metadata = {
    title: { default: "Charlie's Job Platform", template: "%s · Charlie's Job Platform" },
    description: "Find jobs across every board, track applications, tailor your CV and get AI help — with or without an AI account.",
    robots: { index: false, follow: false },
    appleWebApp: { capable: true, title: "Charlie's Jobs", statusBarStyle: "default" },
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "#ffffff" },
        { media: "(prefers-color-scheme: dark)", color: "#0c111d" },
    ],
    colorScheme: "light dark",
    viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en-GB" suppressHydrationWarning>
            <body className={cx(inter.variable, "bg-primary antialiased")}>
                <RouteProvider>
                    <Theme>
                        <AppShell>{children}</AppShell>
                    </Theme>
                </RouteProvider>
            </body>
        </html>
    );
}
