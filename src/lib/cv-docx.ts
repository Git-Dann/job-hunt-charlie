import { AlignmentType, BorderStyle, Document, Packer, Paragraph, TabStopPosition, TabStopType, TextRun } from "docx";
import type { ResolvedCv } from "./cv";
import type { CvVersion } from "./types";

/**
 * A real Word document of the CV — many UK agencies ask for .docx. Built from the same data as the
 * printed CV, single column with real headings and bullets so applicant tracking systems read it well.
 */
export function buildCvDocx(cv: ResolvedCv, template: CvVersion["template"]): Document {
    const font = template === "classic" ? "Georgia" : "Calibri";
    const accent = template === "modern" ? "6941C6" : "101828";
    const size = template === "compact" ? 20 : 21; // half-points
    const centred = template === "classic";

    const heading = (text: string) =>
        new Paragraph({
            spacing: { before: 220, after: 80 },
            border: { bottom: { style: BorderStyle.SINGLE, size: template === "modern" ? 12 : 4, color: template === "modern" ? accent : "D0D5DD", space: 2 } },
            children: [new TextRun({ text: text.toUpperCase(), bold: true, color: accent, size: size + 2, font, characterSpacing: 20 })],
        });
    const body = (text: string, opts: { bold?: boolean; color?: string } = {}) => new TextRun({ text, size, font, ...opts });
    const roleLine = (left: TextRun[], right: string) =>
        new Paragraph({
            spacing: { before: 120, after: 40 },
            tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
            children: [...left, new TextRun({ text: `\t${right}`, size, font, color: "475467" })],
        });
    const bullet = (text: string) => new Paragraph({ bullet: { level: 0 }, spacing: { after: 30 }, children: [body(text)] });

    const children: Paragraph[] = [
        new Paragraph({
            alignment: centred ? AlignmentType.CENTER : AlignmentType.LEFT,
            children: [new TextRun({ text: cv.name || "Your name", bold: true, size: template === "compact" ? 36 : 44, font, color: template === "modern" ? accent : "101828" })],
        }),
    ];
    if (cv.headline) children.push(new Paragraph({ alignment: centred ? AlignmentType.CENTER : AlignmentType.LEFT, children: [body(cv.headline, { color: "344054" })] }));
    if (cv.contact.length) children.push(new Paragraph({ alignment: centred ? AlignmentType.CENTER : AlignmentType.LEFT, spacing: { after: 80 }, children: [body(cv.contact.join("  ·  "), { color: "475467" })] }));
    if (cv.summary) children.push(heading("Profile"), new Paragraph({ children: [body(cv.summary)] }));
    if (cv.skills.length) children.push(heading("Key skills"), new Paragraph({ children: [body(cv.skills.join("  •  "))] }));
    if (cv.experience.length) {
        children.push(heading("Experience"));
        for (const e of cv.experience) {
            children.push(
                roleLine(
                    [body(e.role, { bold: true }), ...(e.company ? [body(` — ${e.company}`)] : []), ...(e.location ? [body(`, ${e.location}`, { color: "475467" })] : [])],
                    [e.start, e.end].filter(Boolean).join(" – "),
                ),
            );
            e.bullets.filter((b) => b.trim()).forEach((b) => children.push(bullet(b)));
        }
    }
    if (cv.education.length) {
        children.push(heading("Education"));
        for (const e of cv.education) {
            children.push(
                roleLine(
                    [body(e.qualification, { bold: true }), ...(e.institution ? [body(` — ${e.institution}`)] : []), ...(e.detail ? [body(`. ${e.detail}`, { color: "475467" })] : [])],
                    [e.start, e.end].filter(Boolean).join(" – "),
                ),
            );
        }
    }
    const certs = cv.certifications.filter((c) => c.trim());
    if (certs.length) {
        children.push(heading("Certifications"));
        certs.forEach((c) => children.push(bullet(c)));
    }
    if (cv.extras.trim() && !cv.extras.includes("--- Imported CV")) {
        children.push(heading("Additional"));
        cv.extras
            .trim()
            .split("\n")
            .forEach((l) => children.push(new Paragraph({ children: [body(l)] })));
    }

    return new Document({
        creator: cv.name || "CV",
        title: `${cv.name || "CV"} — CV`,
        styles: { default: { document: { run: { font, size } } } },
        sections: [{ properties: { page: { margin: { top: 850, bottom: 850, left: 900, right: 900 } } }, children }],
    });
}

export const cvDocxBlob = (cv: ResolvedCv, template: CvVersion["template"]) => Packer.toBlob(buildCvDocx(cv, template));
