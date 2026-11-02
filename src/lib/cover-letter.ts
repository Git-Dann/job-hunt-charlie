import { extractKeywords, mentions, rankByRelevance } from "./keywords";
import type { Profile } from "./types";

/**
 * A no-AI cover letter: a sound structure filled with her own words, choosing the
 * achievements and skills that best match the advert. Gaps are left as [brackets].
 */
export function draftCoverLetter(p: Profile, job: { title: string; company: string; description: string }, opts: { hiringManager?: string; why?: string } = {}): string {
    const keywords = extractKeywords(`${job.title}\n${job.description}`, 25);
    const role = job.title.trim() || "[role]";
    const company = job.company.trim() || "[company]";
    const latest = p.experience[0];
    const bullets = rankByRelevance(
        p.experience.flatMap((e) => e.bullets.filter(Boolean)),
        keywords,
    ).slice(0, 3);
    const skills = p.skills.filter((s) => keywords.some((k) => mentions(s, k.term) || mentions(k.term, s))).slice(0, 4);
    const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
    const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

    const parts = [
        `Dear ${opts.hiringManager?.trim() || "Hiring Manager"},`,
        `I'm excited to apply for the ${role} role at ${company}. ${opts.why?.trim() ? `${opts.why.trim().replace(/\.?$/, ".")} ` : `[One sentence on why this company or role appeals to you — something specific from their website or the advert.] `}${latest ? `I'm currently ${/present|now|current/i.test(latest.end) ? "working as" : "most recently worked as"} ${/^[aeiou]/i.test(latest.role) ? "an" : "a"} ${latest.role} at ${latest.company}, and I believe my experience is a strong match for what you're looking for.` : ""}`,
        bullets.length
            ? `In my career so far, I have ${list(bullets.map(lower))}. [Add one sentence on the result or what you learnt.]`
            : `[Two or three of your strongest, most relevant achievements — with numbers where you can.]`,
        skills.length
            ? `Your advert asks for ${list(skills.map((s) => s.toLowerCase()))}, which are at the heart of what I do. [Give a short example of one of these in action.]`
            : `[Pick two or three skills the advert asks for and show where you've used them.]`,
        `I'd love the chance to talk about how I could help ${company}. Thank you for considering my application — I look forward to hearing from you.`,
        `Kind regards,\n${p.name || "[Your name]"}${p.phone ? `\n${p.phone}` : ""}${p.email ? `\n${p.email}` : ""}`,
    ];
    return parts.join("\n\n");
}
