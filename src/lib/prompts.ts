/**
 * The prompt library. Every prompt is built from her own profile and (where relevant) a job,
 * so she can paste it into any AI chat — no account with us, no API key needed.
 */

export type PromptCategory = "find" | "apply" | "interview" | "network" | "offer" | "plan";

export const PROMPT_CATEGORIES: { id: PromptCategory; label: string }[] = [
    { id: "find", label: "Find roles" },
    { id: "apply", label: "Apply" },
    { id: "interview", label: "Interviews" },
    { id: "network", label: "Networking" },
    { id: "offer", label: "Offers & follow-up" },
    { id: "plan", label: "Plan & strategy" },
];

export interface PromptField {
    id: string;
    label: string;
    placeholder?: string;
    multiline?: boolean;
}

export interface PromptContext {
    cv: string;
    name: string;
    targetRoles: string;
    targetLocation: string;
    workPreference: string;
    salaryExpectation: string;
    job?: { title: string; company: string; description: string; url?: string; location?: string };
    fields: Record<string, string>;
}

export interface PromptTemplate {
    id: string;
    title: string;
    category: PromptCategory;
    description: string;
    /** "job" prompts need a job advert; they still work with a pasted description. */
    needsJob: boolean;
    fields?: PromptField[];
    /** Opens as a back-and-forth conversation rather than a one-shot answer. */
    conversational?: boolean;
    build: (c: PromptContext) => string;
}

const HOUSE_RULES = `Ground rules:
- Use UK English and a warm, professional, plain tone. No clichés ("dynamic", "passionate", "go-getter", "synergy").
- Only use facts from my CV and what I tell you. Never invent employers, dates, qualifications, numbers or achievements.
- Where a number or detail would make something stronger but you don't have it, write [ADD: what's needed] so I can fill it in.
- If something important is missing or unclear, ask me before guessing.`;

const cvBlock = (c: PromptContext) =>
    c.cv.trim() ? `<my_cv>\n${c.cv.trim()}\n</my_cv>` : `<my_cv>\n(I haven't added my CV yet — ask me for it first.)\n</my_cv>`;

const jobBlock = (c: PromptContext) =>
    c.job
        ? `<job_advert>\nRole: ${c.job.title || "(not given)"}\nCompany: ${c.job.company || "(not given)"}${c.job.location ? `\nLocation: ${c.job.location}` : ""}${c.job.url ? `\nLink: ${c.job.url}` : ""}\n\n${c.job.description.trim() || "(No description pasted — ask me to paste the full advert.)"}\n</job_advert>`
        : `<job_advert>\n(Paste the full job advert here.)\n</job_advert>`;

const goalsBlock = (c: PromptContext) => {
    const lines = [
        c.targetRoles && `Roles I'm targeting: ${c.targetRoles}`,
        c.targetLocation && `Where: ${c.targetLocation}`,
        c.workPreference && c.workPreference !== "any" && `Working pattern: ${c.workPreference}`,
        c.salaryExpectation && `Salary I'm aiming for: ${c.salaryExpectation}`,
    ].filter(Boolean);
    return lines.length ? `<my_goals>\n${lines.join("\n")}\n</my_goals>` : "";
};

const f = (c: PromptContext, id: string, fallback = "") => (c.fields[id] ?? "").trim() || fallback;
const roleAt = (c: PromptContext) => (c.job ? `${c.job.title || "this role"}${c.job.company ? ` at ${c.job.company}` : ""}` : "this role");

export const PROMPTS: PromptTemplate[] = [
    // ── Find roles ────────────────────────────────────────────────────────────
    {
        id: "role-ideas",
        title: "What roles suit me?",
        category: "find",
        description: "Job titles that fit your experience, including ones you might not have considered.",
        needsJob: false,
        build: (c) => `You are an experienced UK careers coach and recruiter. I'm job hunting and want to make sure I'm searching for the right things.

${cvBlock(c)}
${goalsBlock(c)}

Please:
1. List 12 job titles I'm a realistic fit for right now, grouped as "Obvious fits", "Adjacent moves" and "Stretch roles". For each, one line on why, and the typical UK salary range (say it's an estimate).
2. For each group, the exact search keywords I should type into LinkedIn and Indeed, including the alternative titles employers use for the same job.
3. The 3 sectors or company types where my background is most valued, and why.
4. Anything in my CV that is holding me back from the stretch roles, and the quickest way to close that gap.

${HOUSE_RULES}`,
    },
    {
        id: "boolean",
        title: "Build my search strings",
        category: "find",
        description: "Boolean searches for LinkedIn, Indeed and Google that catch every variation of your role.",
        needsJob: false,
        fields: [{ id: "roles", label: "Roles to search for", placeholder: "e.g. marketing manager, brand manager" }],
        build: (c) => `You are an expert recruiter who sources candidates and jobs with Boolean search.

Roles I want: ${f(c, "roles", c.targetRoles || "(see my CV)")}
Location: ${c.targetLocation || "UK"}${c.workPreference !== "any" ? ` (${c.workPreference})` : ""}

${cvBlock(c)}

Write me:
1. A LinkedIn Jobs keyword string (LinkedIn supports AND, OR, NOT, quotes and brackets).
2. An Indeed string (Indeed supports quotes, OR, and a minus sign to exclude).
3. A Google search that finds these roles directly on company careers sites: use site: for boards.greenhouse.io, jobs.lever.co, jobs.ashbyhq.com, apply.workable.com and careers.smartrecruiters.com.
4. Words to EXCLUDE so I don't see roles that are too junior, too senior or the wrong field.
5. A short explanation of how to save each as an alert.

Put each search string in its own code block so I can copy it.`,
    },
    {
        id: "extract-jobs",
        title: "Pull jobs out of a page",
        category: "find",
        description: "For sites that block scraping: paste the page text and get a clean list of roles.",
        needsJob: false,
        fields: [
            { id: "page", label: "Paste the page text (select all, copy)", multiline: true },
            { id: "filter", label: "Only keep roles about…", placeholder: "e.g. marketing, events" },
        ],
        build: (c) => `Below is the text copied from a jobs page. Extract every job listing from it.

<page_text>
${f(c, "page", "(paste the page text here)")}
</page_text>

${f(c, "filter") ? `Only include roles relevant to: ${f(c, "filter")}.\n` : ""}
Return a table with the columns: Job title | Company | Location | Salary (if shown) | Closing date (if shown) | Link (if shown).
Then list the 3 that best fit my CV and say why in one line each.

${cvBlock(c)}

Don't invent any details that aren't in the page text — leave a cell blank instead.`,
    },

    // ── Apply ─────────────────────────────────────────────────────────────────
    {
        id: "fit-check",
        title: "How well do I fit this job?",
        category: "apply",
        description: "An honest read on your chances, the gaps, and whether it's worth applying.",
        needsJob: true,
        build: (c) => `You are a blunt but kind UK recruiter who has screened thousands of CVs for roles like this.

${jobBlock(c)}

${cvBlock(c)}

Assess my fit for ${roleAt(c)}:
1. A fit score out of 10, and one sentence on why.
2. The must-have requirements in the advert, each marked ✅ (clearly shown in my CV), ⚠️ (I probably have it but my CV doesn't show it) or ❌ (missing).
3. The 3 strongest points to lead with in my application.
4. The biggest risk a recruiter would see, and how to address it.
5. Should I apply? Yes / Yes with changes / Probably not — and why.

${HOUSE_RULES}`,
    },
    {
        id: "tailor-cv",
        title: "Tailor my CV to this job",
        category: "apply",
        description: "Rewrites your summary and bullets to match the advert, without inventing anything.",
        needsJob: true,
        build: (c) => `You are an expert UK CV writer who understands applicant tracking systems (ATS).

${jobBlock(c)}

${cvBlock(c)}

Tailor my CV for ${roleAt(c)}:
1. A new 3–4 line profile/summary aimed squarely at this role.
2. A "Key skills" line of 8–12 skills, ordered by what this advert values most, using the advert's own wording where it's true for me.
3. For each of my roles, rewrite the bullets so the most relevant come first. Start each with a strong verb and show the result or impact. Keep 3–6 bullets per recent role, fewer for older ones.
4. A list of keywords from the advert that my CV still doesn't cover, so I can decide whether they apply to me.

Format the CV in plain text with clear headings so I can paste it straight into a document. Keep it to two pages.

${HOUSE_RULES}`,
    },
    {
        id: "bullets",
        title: "Make my achievements stronger",
        category: "apply",
        description: "Turns duties into results-focused bullet points.",
        needsJob: false,
        fields: [{ id: "bullets", label: "Bullets to improve (one per line)", multiline: true }],
        build: (c) => `You are an expert CV writer. Rewrite these CV bullet points so they show impact, not just duties.

<bullets>
${f(c, "bullets", "(use the bullets in my CV below)")}
</bullets>

${cvBlock(c)}

For each bullet give me:
- A rewritten version: strong verb + what I did + the result (numbers, time saved, money, people, quality).
- If a number would help but I haven't given one, add [ADD: e.g. how many / how much] rather than making one up.
- One question that would help me make it even stronger.

${HOUSE_RULES}`,
    },
    {
        id: "cover-letter",
        title: "Write my cover letter",
        category: "apply",
        description: "A short, specific letter that sounds like you, not a template.",
        needsJob: true,
        fields: [
            { id: "why", label: "Why do you want this job? (a few words is fine)", placeholder: "e.g. love their brand, want to move into events" },
            { id: "hiringManager", label: "Hiring manager's name (if known)" },
        ],
        build: (c) => `You are an expert UK cover letter writer. Write my cover letter for ${roleAt(c)}.

${jobBlock(c)}

${cvBlock(c)}

Why I want this role: ${f(c, "why", "(ask me)")}
Address it to: ${f(c, "hiringManager", "Dear Hiring Manager")}

Requirements:
- 250–350 words, 4 short paragraphs.
- Open with something specific about the company or role — never "I am writing to apply for…".
- Middle: 2–3 concrete examples from my CV that prove I can do the things this advert asks for most.
- Close confidently and briefly, with a line about availability for a conversation.
- Sound like a real person. No clichés.
- Sign off with my name: ${c.name || "[my name]"}.

After the letter, give me 2 alternative opening lines to choose from.

${HOUSE_RULES}`,
    },
    {
        id: "application-question",
        title: "Answer an application question",
        category: "apply",
        description: "For those 'Tell us why…' boxes on application forms.",
        needsJob: true,
        fields: [
            { id: "question", label: "The question", multiline: true },
            { id: "limit", label: "Word or character limit", placeholder: "e.g. 250 words" },
        ],
        build: (c) => `Help me answer this question on my application for ${roleAt(c)}.

Question: ${f(c, "question", "(paste the question)")}
Limit: ${f(c, "limit", "about 250 words")}

${jobBlock(c)}

${cvBlock(c)}

If it's a competency question, use the STAR structure (Situation, Task, Action, Result) with a real example from my CV. Write it in the first person, stay under the limit, and tell me the final word count. Then give me one alternative example I could use instead.

${HOUSE_RULES}`,
    },
    {
        id: "company-research",
        title: "Research this company",
        category: "apply",
        description: "A briefing to make your application and interview specific.",
        needsJob: true,
        build: (c) => `Act as a research assistant preparing me to apply to and interview with ${c.job?.company || "this company"}.

${jobBlock(c)}

If you can browse the web, use it and cite your sources. If you can't, say so and tell me exactly what to look up.

Give me:
1. What the company does, who its customers are, and how it makes money — in plain English.
2. Recent news, launches or changes from the last 12 months.
3. Their values or culture, in their own words where possible.
4. Likely challenges this team is facing that this role exists to solve.
5. 3 specific things I could mention to show I've done my homework.
6. Any red flags worth checking (reviews, layoffs, high turnover).`,
    },

    // ── Interviews ────────────────────────────────────────────────────────────
    {
        id: "interview-prep",
        title: "Prepare me for the interview",
        category: "interview",
        description: "Likely questions with answers built from your real experience.",
        needsJob: true,
        fields: [{ id: "format", label: "Interview format (if known)", placeholder: "e.g. 45 min video call with hiring manager" }],
        build: (c) => `You are an experienced interview coach. I have an interview for ${roleAt(c)}.
Format: ${f(c, "format", "not known yet")}

${jobBlock(c)}

${cvBlock(c)}

Prepare me:
1. The 12 questions I'm most likely to be asked, mixing competency, motivation and role-specific ones.
2. For each, a suggested answer outline using a real example from my CV (STAR for competency questions). Keep each to bullet points I can remember, not a script.
3. The "Tell me about yourself" answer as a 60–90 second spoken script.
4. The 2 hardest questions they might ask about gaps or weaker areas in my CV, and how to handle them honestly.
5. A one-page cheat sheet of my 5 best stories and which questions each one answers.

${HOUSE_RULES}`,
    },
    {
        id: "mock-interview",
        title: "Mock interview (practice live)",
        category: "interview",
        description: "The AI interviews you one question at a time and gives feedback.",
        needsJob: true,
        conversational: true,
        build: (c) => `Let's do a realistic mock interview. You are the hiring manager for ${roleAt(c)}.

${jobBlock(c)}

${cvBlock(c)}

Rules:
- Ask me ONE question at a time and wait for my answer.
- After each answer, give me short feedback: what worked, what to improve, and a score out of 5. Then ask the next question.
- Mix warm-up, competency, role-specific and one curveball question. Ask follow-up questions when my answer is vague, like a real interviewer would.
- After 8 questions, give me overall feedback, my strongest and weakest answers, and three things to practise.

Start now with your first question.`,
    },
    {
        id: "questions-to-ask",
        title: "Questions to ask them",
        category: "interview",
        description: "Smart questions for the end of the interview.",
        needsJob: true,
        build: (c) => `I'm interviewing for ${roleAt(c)}. Give me 10 thoughtful questions to ask at the end of the interview.

${jobBlock(c)}

Group them by who I'm speaking to: the hiring manager, someone from the team, and HR/recruiter. Make them specific to this role and company — avoid generic questions whose answers are on their website. Mark the 3 I should prioritise if there's only time for a few, and include one that politely uncovers any concerns they have about me.`,
    },
    {
        id: "star-stories",
        title: "Build my STAR stories",
        category: "interview",
        description: "Turn your experience into a bank of reusable interview stories.",
        needsJob: false,
        build: (c) => `You are an interview coach. Help me build a bank of STAR stories (Situation, Task, Action, Result) from my experience.

${cvBlock(c)}
${goalsBlock(c)}

1. Identify 8 strong stories in my CV covering: leadership, teamwork, conflict, a mistake I learnt from, going above and beyond, working under pressure, problem solving, and influencing others.
2. For each, draft the STAR outline using what's in my CV and mark anything you need from me as [ADD: …].
3. Then ask me questions, one at a time, to fill in the gaps and make each story specific.

${HOUSE_RULES}`,
        conversational: true,
    },

    // ── Networking ────────────────────────────────────────────────────────────
    {
        id: "linkedin-profile",
        title: "Rewrite my LinkedIn profile",
        category: "network",
        description: "Headline and About section that recruiters actually find.",
        needsJob: false,
        build: (c) => `You are a LinkedIn profile expert who knows how recruiters search.

${cvBlock(c)}
${goalsBlock(c)}

Write:
1. 5 headline options (under 220 characters), packed with the keywords recruiters search for my target roles.
2. An About section (around 200 words) in the first person: who I am, what I'm great at, proof, and what I'm looking for. Warm, specific, no clichés.
3. The top 10 skills to add to my profile, in priority order.
4. 3 quick changes that would make my profile more visible to recruiters.

${HOUSE_RULES}`,
    },
    {
        id: "outreach",
        title: "Message a recruiter or hiring manager",
        category: "network",
        description: "Short LinkedIn messages and emails that get replies.",
        needsJob: true,
        fields: [{ id: "who", label: "Who are you messaging?", placeholder: "e.g. Head of Marketing, recruiter at agency" }],
        build: (c) => `Write a short outreach message about ${roleAt(c)} to: ${f(c, "who", "the hiring manager")}.

${jobBlock(c)}

${cvBlock(c)}

Give me three versions:
1. A LinkedIn connection request note (under 300 characters).
2. A LinkedIn message for after they accept (under 120 words).
3. A short email (subject line + under 150 words).

Each should mention one specific, relevant thing from my background, ask for something small (a quick chat or who to speak to), and never sound desperate or salesy.`,
    },
    {
        id: "networking-plan",
        title: "Who should I be talking to?",
        category: "network",
        description: "A plan to find the hidden jobs that are never advertised.",
        needsJob: false,
        build: (c) => `You are a career coach who specialises in the hidden job market.

${cvBlock(c)}
${goalsBlock(c)}

Help me network my way into a role:
1. The types of people I should be connecting with, and how to find them on LinkedIn (include search terms).
2. 15 specific UK companies or organisations worth targeting for my goals, and why each fits.
3. A message template to ask former colleagues for introductions.
4. A simple weekly routine (30 minutes a day) for networking without it taking over my life.`,
    },

    // ── Offers & follow-up ────────────────────────────────────────────────────
    {
        id: "follow-up",
        title: "Chase an application",
        category: "offer",
        description: "A polite follow-up when you've heard nothing back.",
        needsJob: true,
        fields: [{ id: "when", label: "When did you apply / interview?", placeholder: "e.g. applied 2 weeks ago" }],
        build: (c) => `Write a short, polite follow-up email about my application for ${roleAt(c)}. Context: ${f(c, "when", "I applied about two weeks ago and haven't heard back")}.

Keep it under 100 words, restate my interest with one specific reason I'm a good fit (from my CV below), and make it easy for them to reply. Include a subject line. Then give me a shorter LinkedIn version.

${cvBlock(c)}`,
    },
    {
        id: "thank-you",
        title: "Thank-you after an interview",
        category: "offer",
        description: "Send within 24 hours to stay front of mind.",
        needsJob: true,
        fields: [{ id: "notes", label: "Something you discussed in the interview", multiline: true }],
        build: (c) => `Write a thank-you email to send after my interview for ${roleAt(c)}.

What we talked about: ${f(c, "notes", "(ask me)")}

Under 150 words. Thank them, refer to something specific from the conversation, briefly reinforce why I'm a strong fit, and close warmly. Include a subject line.`,
    },
    {
        id: "negotiate",
        title: "Negotiate my offer",
        category: "offer",
        description: "Know your worth and what to say on the call.",
        needsJob: true,
        fields: [{ id: "offer", label: "The offer details", multiline: true, placeholder: "Salary, holiday, pension, hybrid days, start date…" }],
        build: (c) => `You are a salary negotiation coach in the UK. I've been offered ${roleAt(c)}.

Offer: ${f(c, "offer", "(paste the offer)")}
What I was hoping for: ${c.salaryExpectation || "(ask me)"}

${jobBlock(c)}

${cvBlock(c)}

Help me:
1. Estimate the market rate for this role in this location (say clearly it's an estimate and how to check it — e.g. Glassdoor, Reed salary checker, Adzuna).
2. Decide what to ask for, including non-salary items worth negotiating (holiday, flexibility, training budget, start date, job title).
3. Write a short phone script and an email version for asking — confident, appreciative, not aggressive.
4. How to respond if they say no, or "this is our final offer".`,
    },
    {
        id: "rejection",
        title: "Reply to a rejection",
        category: "offer",
        description: "Keep the door open and ask for useful feedback.",
        needsJob: true,
        build: (c) => `I've been turned down for ${roleAt(c)}. Write a short, gracious reply (under 100 words) that thanks them, asks for one or two pieces of specific feedback, and asks to be considered for future roles. Then give me 3 honest questions I could ask myself to learn from this one.`,
    },

    // ── Plan & strategy ───────────────────────────────────────────────────────
    {
        id: "weekly-plan",
        title: "My weekly job search plan",
        category: "plan",
        description: "A realistic routine so the search doesn't take over.",
        needsJob: false,
        fields: [{ id: "hours", label: "Hours per week you can give it", placeholder: "e.g. 8" }],
        build: (c) => `You are a supportive career coach. Build me a realistic weekly job search plan.

Time available: ${f(c, "hours", "about 8")} hours a week.
${goalsBlock(c)}

${cvBlock(c)}

Include: daily tasks split across the week, how many applications to aim for (quality over quantity), time for networking and skills, how to track progress, and how to look after my wellbeing so I don't burn out. Keep it encouraging and practical. End with the 3 things I should do first today.`,
    },
    {
        id: "career-change",
        title: "Explain a gap or career change",
        category: "plan",
        description: "Turn a gap, a move or a change of direction into a positive story.",
        needsJob: false,
        fields: [{ id: "situation", label: "What do you need to explain?", multiline: true }],
        build: (c) => `Help me explain this honestly and positively on my CV and in interviews:

${f(c, "situation", "(describe the gap or change)")}

${cvBlock(c)}
${goalsBlock(c)}

Give me: a one-line version for my CV, a 30-second spoken answer for interviews, how to handle follow-up questions, and the transferable skills I should emphasise. Honest, confident, no over-explaining.`,
    },
    {
        id: "cv-from-scratch",
        title: "Help me write my CV from scratch",
        category: "plan",
        description: "The AI interviews you and builds a CV you can paste in here.",
        needsJob: false,
        conversational: true,
        build: (c) => `You are an expert UK CV writer. Help me build my CV from scratch by interviewing me.

${goalsBlock(c) || "I'm job hunting and need a strong CV."}
${c.cv.trim() ? `\nHere's what I have so far — use it, and ask about anything that's thin or missing:\n${cvBlock(c)}\n` : ""}
Ask me questions ONE at a time — contact details, the roles I'm aiming for, each job I've had (most recent first), what I achieved in each, education, and skills. Push me gently for specific results and numbers.

When you have enough, write the full CV in plain text with these headings, in this order: name, a one-line headline, contact details, PROFILE, KEY SKILLS, EXPERIENCE (each role as "Job title — Company, Location (Start – End)" followed by bullet points), EDUCATION, CERTIFICATIONS, ADDITIONAL.

${HOUSE_RULES}

Start with your first question.`,
    },
];

export function getPrompt(id: string): PromptTemplate | undefined {
    return PROMPTS.find((p) => p.id === id);
}

/** Links that open a new chat with the prompt already filled in (where the service supports it). */
export function chatLinks(prompt: string): { id: string; label: string; href: string | null }[] {
    const q = encodeURIComponent(prompt);
    // Browsers and servers cap URLs; past ~6,000 characters copy-and-paste is the reliable route.
    const fits = q.length < 6000;
    return [
        { id: "chatgpt", label: "ChatGPT", href: fits ? `https://chatgpt.com/?q=${q}` : null },
        { id: "claude", label: "Claude", href: fits ? `https://claude.ai/new?q=${q}` : null },
        { id: "gemini", label: "Gemini", href: null },
        { id: "copilot", label: "Copilot", href: null },
    ];
}

export const CHAT_HOME: Record<string, string> = {
    chatgpt: "https://chatgpt.com/",
    claude: "https://claude.ai/new",
    gemini: "https://gemini.google.com/app",
    copilot: "https://copilot.microsoft.com/",
};
