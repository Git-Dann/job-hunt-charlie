import { matchAnswers } from "./answers";
import { extractKeywords, mentions } from "./keywords";
import type { ChecklistItem, Interview, InterviewOutcome, SavedAnswer, TrackedJob } from "./types";

/** Interview prep without AI: built from the advert's own language and her answer bank. */

export const OUTCOMES: { id: InterviewOutcome; label: string; color: "gray" | "brand" | "warning" | "success" | "error" }[] = [
    { id: "upcoming", label: "Upcoming", color: "brand" },
    { id: "waiting", label: "Waiting to hear", color: "warning" },
    { id: "next-round", label: "Through to next round", color: "success" },
    { id: "offer", label: "Offer", color: "success" },
    { id: "rejected", label: "Not this time", color: "error" },
];

export const FORMATS: { id: Interview["format"]; label: string }[] = [
    { id: "video", label: "Video call" },
    { id: "phone", label: "Phone call" },
    { id: "in-person", label: "In person" },
    { id: "assessment", label: "Assessment centre / test" },
];

export function defaultChecklist(format: Interview["format"], makeId: () => string): ChecklistItem[] {
    const common = [
        "Re-read the job advert and highlight the top 3 requirements",
        "Research the company: website, recent news, values",
        "Look up the interviewers on LinkedIn",
        "Prepare 3–5 stories for the likely questions",
        "Practise 'Tell me about yourself' out loud (60–90 seconds)",
        "Choose 3 questions to ask them",
        "Have your CV and the advert open or printed",
    ];
    const extra: Record<Interview["format"], string[]> = {
        video: ["Test the video link, camera and microphone", "Check lighting and background; close other apps", "Charge laptop / phone and have a backup plan"],
        phone: ["Find a quiet spot with good signal", "Have notes in front of you (they can't see them)"],
        "in-person": ["Plan the route and arrive 10 minutes early", "Bring ID if asked, a pen and a printed CV", "Plan what to wear the night before"],
        assessment: ["Check what the assessment involves (tests, group task, presentation)", "Practise any test type they've mentioned", "Prepare and time any presentation"],
    };
    return [...common, ...extra[format]].map((text) => ({ id: makeId(), text, done: false }));
}

/** Questions keyed to words in the advert. Each fires only if the advert mentions one of its triggers. */
const TOPIC_QUESTIONS: { triggers: string[]; question: string }[] = [
    { triggers: ["stakeholder", "stakeholders", "stakeholder management"], question: "Tell me about a time you managed competing stakeholder priorities." },
    { triggers: ["budget", "budgets", "budget management", "cost", "costs"], question: "Tell me about a budget you managed. How did you keep it on track?" },
    { triggers: ["project", "projects", "project management", "deliver", "delivery"], question: "Walk me through a project you delivered from start to finish." },
    { triggers: ["team", "teams", "collaborate", "collaboration", "cross-functional"], question: "Tell me about a time you worked as part of a team to achieve something difficult." },
    { triggers: ["lead", "leadership", "manage a team", "line management", "people management", "mentor"], question: "Tell me about a time you led or developed other people." },
    { triggers: ["customer", "customers", "client", "clients", "customer service"], question: "Tell me about a time you dealt with a difficult customer or client." },
    { triggers: ["deadline", "deadlines", "pressure", "prioritise", "priorities", "fast-paced"], question: "Tell me about a time you had several urgent priorities. How did you decide what to do first?" },
    { triggers: ["data", "analysis", "analytics", "reporting", "insight", "insights", "excel"], question: "Tell me about a time you used data to make a decision or change something." },
    { triggers: ["negotiation", "negotiate", "supplier", "suppliers", "procurement"], question: "Tell me about a negotiation you led. What was the outcome?" },
    { triggers: ["social media", "content", "marketing", "campaign", "campaigns", "brand"], question: "Talk me through a campaign you're proud of. How did you measure success?" },
    { triggers: ["event", "events", "event management", "event planning"], question: "Tell me about an event that didn't go to plan. What did you do?" },
    { triggers: ["sales", "targets", "revenue", "business development", "pipeline"], question: "Tell me about how you've met or exceeded a target." },
    { triggers: ["process", "processes", "improve", "improvement", "efficiency"], question: "Tell me about a process you improved. What changed as a result?" },
    { triggers: ["communication", "communicate", "presentation", "present", "writing"], question: "Tell me about a time you had to explain something complex to a non-expert audience." },
    { triggers: ["change", "change management", "transformation"], question: "Tell me about a time you helped people through a change." },
    { triggers: ["problem", "problem solving", "solutions", "initiative"], question: "Tell me about a problem you solved on your own initiative." },
    { triggers: ["compliance", "regulation", "gdpr", "health and safety", "safeguarding", "policy"], question: "Tell me about a time you made sure something was done correctly and compliantly under pressure." },
    { triggers: ["relationship", "relationships", "partnerships", "partners", "account management"], question: "How do you build and keep strong working relationships? Give an example." },
];

const CORE_QUESTIONS = [
    "Tell me about yourself.",
    "Why do you want this role?",
    "Why do you want to work for {company}?",
    "What do you know about us?",
    "What are your main strengths for this role?",
    "What's an area you're working to improve?",
    "Why are you leaving your current role?",
    "Where do you see yourself in a few years?",
];

export interface PrepQuestion {
    question: string;
    /** Why this question is likely (the advert wording that triggered it). */
    because?: string;
    answer?: SavedAnswer;
}

export function likelyQuestions(job: Pick<TrackedJob, "title" | "company" | "description">, bank: SavedAnswer[]): PrepQuestion[] {
    const text = `${job.title}\n${job.description ?? ""}`;
    const topical = TOPIC_QUESTIONS.map((t) => ({ t, hit: t.triggers.find((w) => mentions(text, w)) }))
        .filter((x) => x.hit)
        .slice(0, 8)
        .map(({ t, hit }) => ({ question: t.question, because: `The advert mentions "${hit}"` }));
    const core = CORE_QUESTIONS.map((q) => ({ question: q.replace("{company}", job.company || "us") }));
    return [...core, ...topical].map((q) => ({ ...q, answer: matchAnswers(q.question, bank, 1)[0]?.answer }));
}

/** What the advert keeps coming back to: the things they'll probe. */
export function focusAreas(job: Pick<TrackedJob, "title" | "description">): string[] {
    return extractKeywords(`${job.title}\n${job.description ?? ""}`, 12)
        .map((k) => k.term)
        .slice(0, 8);
}

export const QUESTIONS_TO_ASK = [
    "What would success look like in the first 3–6 months?",
    "What are the biggest challenges the team is facing right now?",
    "Why is this role open?",
    "How would you describe the team and how it works together?",
    "How do you support people to develop and progress?",
    "Is there anything about my background that gives you doubts I can address now?",
    "What are the next steps, and when can I expect to hear?",
];

const pad = (n: number) => String(n).padStart(2, "0");
const icsDate = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/[,;]/g, (m) => `\\${m}`);

/** A calendar file her phone or laptop calendar can open. `when` is read as her local time. */
export function interviewIcs(iv: Interview, job: Pick<TrackedJob, "title" | "company" | "url">, nowIso: string): string {
    const start = new Date(iv.when);
    const end = new Date(start.getTime() + (iv.durationMins || 60) * 60_000);
    const summary = `Interview: ${job.title}${job.company ? ` — ${job.company}` : ""}${iv.round ? ` (${iv.round})` : ""}`;
    const description = [iv.interviewers && `With: ${iv.interviewers}`, iv.where && `Where/link: ${iv.where}`, job.url && `Advert: ${job.url}`].filter(Boolean).join("\n");
    const lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Charlie's Job Platform//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        `UID:${iv.id}@charlies-job-platform`,
        `DTSTAMP:${icsDate(new Date(nowIso))}`,
        `DTSTART:${icsDate(start)}`,
        `DTEND:${icsDate(end)}`,
        `SUMMARY:${icsText(summary)}`,
        description && `DESCRIPTION:${icsText(description)}`,
        iv.where && `LOCATION:${icsText(iv.where)}`,
        "BEGIN:VALARM",
        "TRIGGER:-PT1H",
        "ACTION:DISPLAY",
        "DESCRIPTION:Interview in 1 hour",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ].filter(Boolean);
    return lines.join("\r\n");
}
