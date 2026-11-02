"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { ResolvedCv } from "@/lib/cv";
import type { CvVersion } from "@/lib/types";

/**
 * The printed CV. Colours are fixed (it's paper), fonts are system fonts so the PDF looks the
 * same everywhere, and the layout is single-column so applicant tracking systems read it cleanly.
 */
export const CvDocument = ({ cv, template }: { cv: ResolvedCv; template: CvVersion["template"] }) => {
    const accent = template === "modern" ? "#6941C6" : "#101828";
    const dense = template === "compact";
    const H = ({ children }: { children: React.ReactNode }) => (
        <h2
            style={{
                color: accent,
                fontSize: dense ? 11 : 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                borderBottom: template === "modern" ? `2px solid ${accent}` : "1px solid #D0D5DD",
                paddingBottom: 3,
                margin: `${dense ? 12 : 16}px 0 ${dense ? 6 : 8}px`,
            }}
        >
            {children}
        </h2>
    );

    return (
        <article
            style={{
                background: "#fff",
                color: "#101828",
                fontFamily: template === "classic" ? "Georgia, 'Times New Roman', serif" : "Inter, Arial, Helvetica, sans-serif",
                fontSize: dense ? 10 : 10.5,
                lineHeight: dense ? 1.35 : 1.45,
                padding: dense ? "28px 32px" : "36px 40px",
            }}
        >
            <header style={{ textAlign: template === "classic" ? "center" : "left" }}>
                <h1 style={{ fontSize: dense ? 20 : 24, fontWeight: 700, margin: 0, color: template === "modern" ? accent : "#101828" }}>{cv.name || "Your name"}</h1>
                {cv.headline && <p style={{ fontSize: dense ? 11.5 : 12.5, margin: "2px 0 0", color: "#344054" }}>{cv.headline}</p>}
                {cv.contact.length > 0 && <p style={{ margin: "6px 0 0", color: "#475467", fontSize: dense ? 9.5 : 10 }}>{cv.contact.join("  ·  ")}</p>}
            </header>

            {cv.summary && (
                <>
                    <H>Profile</H>
                    <p style={{ margin: 0 }}>{cv.summary}</p>
                </>
            )}

            {cv.skills.length > 0 && (
                <>
                    <H>Key skills</H>
                    <p style={{ margin: 0 }}>{cv.skills.join("  •  ")}</p>
                </>
            )}

            {cv.experience.length > 0 && (
                <>
                    <H>Experience</H>
                    {cv.experience.map((e) => (
                        <section key={e.id} style={{ marginBottom: dense ? 8 : 12, breakInside: "avoid" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                <p style={{ margin: 0, fontWeight: 700 }}>
                                    {e.role}
                                    {e.company && <span style={{ fontWeight: 400 }}> — {e.company}</span>}
                                    {e.location && <span style={{ fontWeight: 400, color: "#475467" }}>, {e.location}</span>}
                                </p>
                                <p style={{ margin: 0, color: "#475467", whiteSpace: "nowrap" }}>{[e.start, e.end].filter(Boolean).join(" – ")}</p>
                            </div>
                            {e.bullets.filter(Boolean).length > 0 && (
                                <ul style={{ margin: "4px 0 0", paddingLeft: 16 }}>
                                    {e.bullets.filter(Boolean).map((b, i) => (
                                        <li key={i} style={{ marginBottom: 2 }}>
                                            {b}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </section>
                    ))}
                </>
            )}

            {cv.education.length > 0 && (
                <>
                    <H>Education</H>
                    {cv.education.map((e) => (
                        <div key={e.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 4 }}>
                            <p style={{ margin: 0 }}>
                                <strong>{e.qualification}</strong>
                                {e.institution && ` — ${e.institution}`}
                                {e.detail && <span style={{ color: "#475467" }}>. {e.detail}</span>}
                            </p>
                            <p style={{ margin: 0, color: "#475467", whiteSpace: "nowrap" }}>{[e.start, e.end].filter(Boolean).join(" – ")}</p>
                        </div>
                    ))}
                </>
            )}

            {cv.certifications.filter(Boolean).length > 0 && (
                <>
                    <H>Certifications</H>
                    <ul style={{ margin: 0, paddingLeft: 16 }}>
                        {cv.certifications.filter(Boolean).map((c, i) => (
                            <li key={i}>{c}</li>
                        ))}
                    </ul>
                </>
            )}

            {cv.extras.trim() && !cv.extras.includes("--- Imported CV") && (
                <>
                    <H>Additional</H>
                    <p style={{ margin: 0, whiteSpace: "pre-line" }}>{cv.extras.trim()}</p>
                </>
            )}
        </article>
    );
};

/** A copy of the CV attached straight to <body>, shown only when printing (see globals.css). */
export const PrintableCv = (props: { cv: ResolvedCv; template: CvVersion["template"] }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;
    return createPortal(
        <div className="print-root">
            <CvDocument {...props} />
        </div>,
        document.body,
    );
};
