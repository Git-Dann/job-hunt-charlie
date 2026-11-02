import { extractKeywords, mentions, rankByRelevance } from "./keywords";
import type { CvVersion, Experience, Profile } from "./types";

/** A CV version resolved against the profile: what actually gets printed. */
export interface ResolvedCv {
    name: string;
    headline: string;
    contact: string[];
    summary: string;
    skills: string[];
    experience: Experience[];
    education: Profile["education"];
    certifications: string[];
    extras: string;
}

export function contactLine(p: Profile): string[] {
    return [p.location, p.email, p.phone, p.linkedin, p.website].map((s) => s.trim()).filter(Boolean);
}

/** The whole profile as a plain-text CV (for prompts, copying, or "use everything"). */
export function profileToText(p: Profile): string {
    return resolvedToText(resolveCv(p, null));
}

export function resolveCv(p: Profile, v: CvVersion | null): ResolvedCv {
    const byId = new Map(p.experience.map((e) => [e.id, e]));
    const experience = v
        ? v.experience
              .filter((x) => x.include && byId.has(x.id))
              .map((x) => ({ ...byId.get(x.id)!, bullets: x.bullets.filter((b) => b.trim()) }))
        : p.experience;
    return {
        name: p.name,
        headline: v?.headline ?? p.headline,
        contact: contactLine(p),
        summary: v?.summary ?? p.summary,
        skills: v?.skills ?? p.skills,
        experience,
        education: p.education,
        certifications: p.certifications,
        extras: p.extras,
    };
}

export function resolvedToText(cv: ResolvedCv): string {
    const out: string[] = [];
    if (cv.name) out.push(cv.name.toUpperCase());
    if (cv.headline) out.push(cv.headline);
    if (cv.contact.length) out.push(cv.contact.join(" | "));
    if (cv.summary) out.push("", "PROFILE", cv.summary);
    if (cv.skills.length) out.push("", "KEY SKILLS", cv.skills.join(", "));
    if (cv.experience.length) {
        out.push("", "EXPERIENCE");
        for (const e of cv.experience) {
            out.push("", `${e.role} — ${e.company}${e.location ? `, ${e.location}` : ""} (${[e.start, e.end].filter(Boolean).join(" – ")})`);
            e.bullets.filter(Boolean).forEach((b) => out.push(`• ${b}`));
        }
    }
    if (cv.education.length) {
        out.push("", "EDUCATION");
        cv.education.forEach((e) =>
            out.push(`${e.qualification} — ${e.institution}${e.end ? ` (${[e.start, e.end].filter(Boolean).join(" – ")})` : ""}${e.detail ? `. ${e.detail}` : ""}`),
        );
    }
    if (cv.certifications.length) out.push("", "CERTIFICATIONS", ...cv.certifications.map((c) => `• ${c}`));
    if (cv.extras.trim()) out.push("", "ADDITIONAL", cv.extras.trim());
    return out.join("\n").trim();
}

export function newCvFromProfile(p: Profile, name: string, id: string, now: string): CvVersion {
    return {
        id,
        name,
        headline: p.headline,
        summary: p.summary,
        skills: [...p.skills],
        experience: p.experience.map((e) => ({ id: e.id, include: true, bullets: [...e.bullets] })),
        template: "classic",
        createdAt: now,
        updatedAt: now,
    };
}

export interface TailorResult {
    version: CvVersion;
    /** Advert keywords the profile never mentions: things to add if they're true. */
    gaps: string[];
    /** Skills promoted to the front because the advert asks for them. */
    promoted: string[];
}

/**
 * Tailor without AI: put the skills the advert asks for first, lead each role with its most
 * relevant bullets, and list the advert's language the profile doesn't cover yet.
 * Nothing is invented — only reordered.
 */
export function tailorCv(p: Profile, jobText: string, base: CvVersion): TailorResult {
    const keywords = extractKeywords(jobText, 30);
    const skills = rankByRelevance(base.skills, keywords);
    const promoted = skills.filter((s) => keywords.some((k) => mentions(s, k.term) || mentions(k.term, s)));
    const byId = new Map(p.experience.map((e) => [e.id, e]));
    const experience = base.experience.map((x) => ({
        ...x,
        bullets: rankByRelevance(x.bullets.length ? x.bullets : (byId.get(x.id)?.bullets ?? []), keywords),
    }));
    const profileText = profileToText(p);
    const gaps = keywords.filter((k) => !mentions(profileText, k.term)).map((k) => k.term);
    return {
        version: { ...base, skills, experience, jobDescription: jobText },
        gaps: gaps.slice(0, 15),
        promoted,
    };
}

/** Percentage of profile fields filled, to nudge her to finish it. */
export function profileCompleteness(p: Profile): { percent: number; missing: string[] } {
    const checks: [string, boolean][] = [
        ["Name", !!p.name.trim()],
        ["Headline", !!p.headline.trim()],
        ["Email", !!p.email.trim()],
        ["Location", !!p.location.trim()],
        ["Summary", p.summary.trim().length > 40],
        ["At least 6 skills", p.skills.length >= 6],
        ["Work experience", p.experience.length > 0],
        ["Achievements under each role", p.experience.length > 0 && p.experience.every((e) => e.bullets.filter(Boolean).length >= 2)],
        ["Education", p.education.length > 0],
        ["Target roles", !!p.targetRoles.trim()],
    ];
    const done = checks.filter(([, ok]) => ok).length;
    return { percent: Math.round((done / checks.length) * 100), missing: checks.filter(([, ok]) => !ok).map(([l]) => l) };
}

const ROLE_LINE = /^(.+?)\s+[—–-]\s+(.+?)(?:,\s*([^()]+?))?\s*\(([^()]+?)\s*[–—-]\s*([^()]+?)\)\s*$/;
const EDU_LINE = /^(.+?)\s+[—–-]\s+(.+?)(?:\s*\(([^()]+?)(?:\s*[–—-]\s*([^()]+?))?\))?\s*(?:\.\s*(.*))?$/;
const BULLET = /^\s*[-•*▪●]\s*/;

/**
 * Best-effort import of a pasted CV: picks out contact details, splits the text into sections by
 * common headings, and reads roles written as "Job title — Company, Place (Start – End)" with
 * bullet points (the format our "write my CV" prompt asks the AI for). She reviews it all after.
 */
export function parseCvText(text: string, makeId: () => string = () => Math.random().toString(36).slice(2)): Partial<Profile> {
    const lines = text.split(/\r?\n/).map((l) => l.trim());
    const out: Partial<Profile> = {};
    const email = text.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
    if (email) out.email = email[0];
    const phone = text.match(/(\+44\s?7\d{3}|\(?07\d{3}\)?)\s?\d{3}\s?\d{3}/) ?? text.match(/\+?\d[\d\s()-]{8,}\d/);
    if (phone) out.phone = phone[0].trim();
    const linkedin = text.match(/(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?/i);
    if (linkedin) out.linkedin = linkedin[0];

    const headings: Record<string, RegExp> = {
        summary: /^(profile|summary|personal (statement|profile)|about( me)?|professional (summary|profile))$/i,
        skills: /^((key|core) )?(skills|competencies)( (and|&) .+)?$/i,
        experience: /^((work|professional|employment|relevant) )?(experience|history)$|^employment$|^career history$/i,
        education: /^education( (and|&) (training|qualifications))?$|^qualifications$/i,
        certifications: /^certifications?( (and|&) .+)?$|^courses$|^training$/i,
        other: /^(additional( information)?|interests|hobbies|references|achievements|volunteering|languages)$/i,
    };
    const sections: Record<string, string[]> = { head: [], summary: [], skills: [], experience: [], education: [], certifications: [], other: [] };
    let current = "head";
    for (const line of lines) {
        const bare = line.replace(/[:\-–—]+$/, "").replace(/^#+\s*/, "").replace(/\*+/g, "").trim();
        const hit = bare.length < 45 ? Object.entries(headings).find(([, re]) => re.test(bare)) : undefined;
        if (hit) {
            current = hit[0];
            continue;
        }
        if (line) sections[current].push(line.replace(/\*\*/g, ""));
    }

    const head = sections.head.filter((l) => !l.includes("@") && !/\d{5,}/.test(l.replace(/\s/g, "")) && !/linkedin\.com/i.test(l));
    const name = head.find((l) => l.split(" ").length <= 4 && /^[A-Za-z'’ -]+$/.test(l));
    if (name) out.name = name.replace(/\b([A-Z])([A-Z]+)\b/g, (_, a, b) => a + b.toLowerCase());
    const headline = head.find((l) => l !== name && l.length < 90 && !l.includes("|"));
    if (headline) out.headline = headline;
    const location = sections.head.join(" | ").split("|").map((s) => s.trim()).find((s) => s && !s.includes("@") && !/\d{6,}/.test(s.replace(/\s/g, "")) && !/linkedin|http/i.test(s) && s !== name && s !== headline && s.length < 40);
    if (location) out.location = location;

    if (sections.summary.length) out.summary = sections.summary.join(" ");
    if (sections.skills.length)
        out.skills = [
            ...new Set(
                sections.skills
                    .join(",")
                    .split(/[,•·|;]/)
                    .map((s) => s.replace(BULLET, "").trim())
                    .filter((s) => s && s.length < 50),
            ),
        ];

    const experience: Experience[] = [];
    for (const line of sections.experience) {
        const m = line.replace(BULLET, "").match(ROLE_LINE);
        if (m && !BULLET.test(line)) {
            experience.push({ id: makeId(), role: m[1].trim(), company: m[2].trim(), location: m[3]?.trim() || undefined, start: m[4].trim(), end: m[5].trim(), bullets: [] });
        } else if (experience.length) {
            experience[experience.length - 1].bullets.push(line.replace(BULLET, ""));
        }
    }
    if (experience.length) out.experience = experience;

    const education: Profile["education"] = [];
    for (const line of sections.education) {
        const m = line.replace(BULLET, "").match(EDU_LINE);
        if (m) education.push({ id: makeId(), qualification: m[1].trim(), institution: m[2].trim(), start: m[4] ? m[3]?.trim() : undefined, end: (m[4] ?? m[3])?.trim(), detail: m[5]?.trim() || undefined });
        else if (education.length) education[education.length - 1].detail = [education[education.length - 1].detail, line.replace(BULLET, "")].filter(Boolean).join(" ");
        else education.push({ id: makeId(), qualification: line.replace(BULLET, ""), institution: "" });
    }
    if (education.length) out.education = education;

    if (sections.certifications.length) out.certifications = sections.certifications.map((l) => l.replace(BULLET, "")).filter(Boolean);
    if (sections.other.length) out.extras = sections.other.join("\n");
    return out;
}
