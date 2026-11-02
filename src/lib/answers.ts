import { stem } from "./keywords";
import type { SavedAnswer } from "./types";

/**
 * Answer bank matching. No AI: a question is matched on what it's really asking (its "intent",
 * from phrases recruiters use) and on the words it shares with saved questions.
 */

export interface Intent {
    id: string;
    label: string;
    patterns: RegExp[];
}

export const INTENTS: Intent[] = [
    { id: "motivation", label: "Why this role or company", patterns: [/why (do|would) you (want|like)/, /why (are you|you're) (interested|applying)/, /why (this|our) (role|company|organi[sz]ation|team)/, /attract(s|ed) you/, /motivat/, /interest(s|ed)? you (in|about)/, /why do you want to work/] },
    { id: "about", label: "About you", patterns: [/tell (us|me) about yourself/, /introduce yourself/, /personal statement/, /describe yourself/, /about you\b/, /supporting statement/, /cover letter/] },
    { id: "strengths", label: "Strengths", patterns: [/strength/, /what (are you|you're) (good|great) at/, /what makes you (a good|the right|suitable)/, /why should we (hire|choose|appoint)/, /what (would|will) you bring/, /suitab/] },
    { id: "weakness", label: "Weaknesses", patterns: [/weakness/, /development area/, /area(s)? (for|of) (improvement|development)/, /improve on/] },
    { id: "achievement", label: "Proudest achievement", patterns: [/achievement/, /proud/, /accomplish/, /success(es)? you/] },
    { id: "teamwork", label: "Teamwork", patterns: [/team ?work/, /work(ed|ing)? (in|as part of|with) (a )?team/, /collaborat/] },
    { id: "conflict", label: "Conflict", patterns: [/conflict/, /disagree/, /difficult (person|colleague|customer|client|stakeholder)/, /challenging (person|colleague|customer|client|stakeholder)/] },
    { id: "pressure", label: "Pressure & deadlines", patterns: [/pressure/, /deadline/, /prioriti[sz]/, /multiple tasks/, /busy/] },
    { id: "leadership", label: "Leadership", patterns: [/\blead(ership|ing)?\b/, /manag(ed|ing) (a )?(team|people|staff)/, /motivate (a|your) team/] },
    { id: "problem", label: "Problem solving", patterns: [/problem/, /solv/, /initiative/, /improv(ed|e) (a )?process/] },
    { id: "customer", label: "Customer service", patterns: [/customer/, /client service/, /complain/] },
    { id: "future", label: "Career goals", patterns: [/five years/, /5 years/, /career (goals|plans|aspirations)/, /where do you see yourself/] },
    { id: "salary", label: "Salary", patterns: [/salary/, /\bpay\b/, /remuneration/, /expected (rate|compensation)/, /compensation/] },
    { id: "notice", label: "Notice period & start date", patterns: [/notice period/, /start date/, /when (can|could) you start/, /availab(le|ility) to start/] },
    { id: "rightToWork", label: "Right to work", patterns: [/right to work/, /eligib(le|ility) to work/, /visa/, /sponsor/, /work permit/] },
    { id: "interviewAvailability", label: "Interview availability", patterns: [/availab(le|ility) for (an )?interview/, /interview dates/] },
    { id: "adjustments", label: "Reasonable adjustments", patterns: [/reasonable adjustment/, /adjustments/, /disabilit/, /access needs/] },
    { id: "driving", label: "Driving licence", patterns: [/driving licen[cs]e/, /\bdrive\b/, /own (car|transport|vehicle)/] },
    { id: "gap", label: "Career gap", patterns: [/\bgap\b/, /career break/, /time out/] },
    { id: "leaving", label: "Why you're leaving", patterns: [/why (are you|did you|you're) leav/, /reason for leaving/, /why (are you )?looking (to move|for a new)/] },
];

const STOP = new Set("a an the and or of to in on for with your you are is do did was were be been we our us me my i what why how when which who please describe give example tell about this that it as at by from can could would should have has had will".split(" "));

const words = (s: string) =>
    s
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w.length > 2 && !STOP.has(w))
        .map(stem);

export function intentsOf(question: string): string[] {
    const q = question.toLowerCase().replace(/[’']/g, "'");
    return INTENTS.filter((i) => i.patterns.some((p) => p.test(q))).map((i) => i.id);
}

export interface AnswerMatch {
    answer: SavedAnswer;
    score: number;
    /** Plain-English reason it was suggested. */
    reason: string;
}

/** Saved answers ranked against a new question. Only reasonable matches are returned. */
export function matchAnswers(question: string, bank: SavedAnswer[], limit = 3): AnswerMatch[] {
    const qIntents = new Set(intentsOf(question));
    const qWords = new Set(words(question));
    if (!qWords.size && !qIntents.size) return [];
    return bank
        .filter((a) => a.answer.trim())
        .map((a) => {
            const aIntents = intentsOf(a.question);
            const shared = aIntents.filter((i) => qIntents.has(i));
            const aWords = new Set(words(a.question));
            const overlap = [...qWords].filter((w) => aWords.has(w)).length;
            const union = new Set([...qWords, ...aWords]).size || 1;
            const score = shared.length * 0.6 + overlap / union;
            const label = shared.length ? INTENTS.find((i) => i.id === shared[0])!.label : "";
            return { answer: a, score, reason: label ? `Both ask about: ${label.toLowerCase()}` : `Similar wording` };
        })
        .filter((m) => m.score >= 0.25)
        .sort((x, y) => y.score - x.score)
        .slice(0, limit);
}

/** Fill {company} and {role} so a saved answer reads as written for this job. */
export function fillAnswer(text: string, job?: { company?: string; title?: string }): string {
    return text.replace(/\{company\}/gi, job?.company?.trim() || "{company}").replace(/\{role\}/gi, job?.title?.trim() || "{role}");
}

export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Parse a form's limit ("250 words", "1500 characters") from the question or a typed limit. */
export function parseLimit(text: string): { n: number; unit: "words" | "characters" } | null {
    const m = text.toLowerCase().match(/(\d[\d,]*)\s*(words?|characters?|chars?)/);
    if (!m) return null;
    return { n: Number(m[1].replace(/,/g, "")), unit: m[2].startsWith("w") ? "words" : "characters" };
}

/** Questions almost every UK application asks, with a tip — she fills in her own answer once. */
export const STARTER_QUESTIONS: { question: string; tip: string }[] = [
    { question: "Why do you want to work for {company}?", tip: "Something specific about them (a product, value or project) + how it links to what you want to do. Use {company} so it fills itself in." },
    { question: "Tell us about yourself / supporting statement", tip: "3–5 sentences: who you are, your strongest experience, and what you want next." },
    { question: "Why are you a good fit for this role?", tip: "Pick 2–3 strengths that show up in most adverts you apply for, each with a quick example." },
    { question: "Tell us about a time you worked as part of a team", tip: "STAR: Situation, Task, Action (what YOU did), Result — with a number if you can." },
    { question: "Describe a time you dealt with a difficult customer or colleague", tip: "Show calm, listening, and a good outcome. STAR again." },
    { question: "Tell us about a time you worked under pressure or to a tight deadline", tip: "How you prioritised, what you delivered, and by when." },
    { question: "What is your greatest achievement?", tip: "Ideally work-related, with a clear result." },
    { question: "What are your salary expectations?", tip: "A range based on research, e.g. '£35,000–£38,000, depending on the full package'." },
    { question: "What is your notice period / when could you start?", tip: "e.g. 'One month's notice — I could start from [date].'" },
    { question: "Do you have the right to work in the UK?", tip: "A simple yes/no plus any visa detail they might need." },
    { question: "Do you need any reasonable adjustments for interview?", tip: "It's fine to say 'No, thank you' — or note anything that would help." },
    { question: "Do you have a full UK driving licence?", tip: "Yes/no, plus whether you have access to a car if roles mention travel." },
    { question: "Why are you leaving your current role?", tip: "Keep it positive and forward-looking: what you're moving towards, not away from." },
    { question: "Where do you see yourself in five years?", tip: "Show ambition that fits the kind of role you're applying for." },
];

/**
 * Read "Q: … / A: …" pairs, the format the "Fill my answer bank" prompt asks the AI for.
 * Copes with markdown bold, numbering, "Question:/Answer:" labels and answers over several lines.
 */
export function parseQaPairs(text: string): { question: string; answer: string }[] {
    const out: { question: string; answer: string }[] = [];
    let cur: { question: string; answer: string } | null = null;
    let mode: "q" | "a" | null = null;
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.replace(/\*\*/g, "").replace(/^\s*(\d+[.)]\s*)/, "");
        const q = line.match(/^\s*(?:Q|Question)\s*[:.-]\s*(.*)$/i);
        const a = line.match(/^\s*(?:A|Answer)\s*[:.-]\s*(.*)$/i);
        if (q) {
            if (cur && cur.question && cur.answer.trim()) out.push(cur);
            cur = { question: q[1].trim(), answer: "" };
            mode = "q";
        } else if (a && cur) {
            cur.answer = a[1];
            mode = "a";
        } else if (cur && mode === "a") {
            cur.answer += `\n${line}`;
        } else if (cur && mode === "q" && line.trim()) {
            cur.question += ` ${line.trim()}`;
        }
    }
    if (cur && cur.question && cur.answer.trim()) out.push(cur);
    return out.map((x) => ({ question: x.question.trim(), answer: x.answer.trim().replace(/\n{3,}/g, "\n\n") }));
}
