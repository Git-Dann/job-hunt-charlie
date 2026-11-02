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

/* ─────────────────────────────────────────────────────────────────────────────
 * Every prompt follows the same shape, because it's what gets the best out of
 * ChatGPT, Claude and Gemini alike:
 *   <role>        a specific expert, not "a helpful assistant"
 *   context       her CV, her goals, the job — clearly labelled
 *   <task>        the job to do
 *   <method>      the steps an expert would actually take
 *   <rules>       honesty and tone rules (never invent anything)
 *   <output>      the exact layout to return
 *   <first>       ask before guessing when something important is missing
 *   <next>        follow-ups she can ask for
 * ──────────────────────────────────────────────────────────────────────────── */

const HOUSE_RULES = `<rules>
1. Use UK English, UK conventions (CV not résumé, "Dear …", £, UK date order) and UK employment norms.
2. Only use facts from my CV, my goals and what I tell you. NEVER invent employers, dates, job titles, qualifications, numbers, tools or achievements. If a number would make something stronger but you don't have one, write [ADD: what's needed, e.g. "how many events a year"].
3. Write like a capable, warm human. No clichés or filler: never use "dynamic", "passionate", "go-getter", "results-driven", "synergy", "leverage", "thrive", "fast-paced", "I am writing to apply", "I believe I would be a great fit".
4. Prefer specific, concrete detail over adjectives. Show, don't claim.
5. Be honest. If something in my CV is weak or a poor fit, say so kindly and say how to fix it.
6. Keep formatting simple so it pastes cleanly into a form or document (plain headings, plain bullets, no tables unless asked).
</rules>`;

const ASK_FIRST = (what: string) => `<first>
Before you start: if anything essential is missing or unclear (${what}), ask me up to 3 short questions in one message and wait for my answers. If you have enough, go straight ahead.
</first>`;

const NEXT = (items: string[]) => `<next>
When you've finished, offer me these follow-ups as a short numbered list I can reply to with just a number:
${items.map((x, i) => `${i + 1}. ${x}`).join("\n")}
</next>`;

const cvBlock = (c: PromptContext) =>
    c.cv.trim()
        ? `<my_cv>\n${c.cv.trim()}\n</my_cv>`
        : `<my_cv>\n(I haven't added my CV yet. Ask me to paste it before doing anything else.)\n</my_cv>`;

const jobBlock = (c: PromptContext) =>
    c.job
        ? `<job_advert>\nRole: ${c.job.title || "(not given)"}\nCompany: ${c.job.company || "(not given)"}${c.job.location ? `\nLocation: ${c.job.location}` : ""}${c.job.url ? `\nLink: ${c.job.url}` : ""}\n\n${c.job.description.trim() || "(No description pasted. Ask me to paste the full advert before you start.)"}\n</job_advert>`
        : `<job_advert>\n(Ask me to paste the full job advert before you start.)\n</job_advert>`;

const goalsBlock = (c: PromptContext) => {
    const lines = [
        c.name && `My name: ${c.name}`,
        c.targetRoles && `Roles I'm targeting: ${c.targetRoles}`,
        c.targetLocation && `Where: ${c.targetLocation}`,
        c.workPreference && c.workPreference !== "any" && `Working pattern I want: ${c.workPreference}`,
        c.salaryExpectation && `Salary I'm aiming for: ${c.salaryExpectation}`,
    ].filter(Boolean);
    return lines.length ? `<my_goals>\n${lines.join("\n")}\n</my_goals>` : "";
};

const f = (c: PromptContext, id: string, fallback = "") => (c.fields[id] ?? "").trim() || fallback;
const roleAt = (c: PromptContext) => (c.job ? `${c.job.title || "this role"}${c.job.company ? ` at ${c.job.company}` : ""}` : "this role");
const join = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join("\n\n");

export const PROMPTS: PromptTemplate[] = [
    // ── Find roles ────────────────────────────────────────────────────────────
    {
        id: "role-ideas",
        title: "What roles suit me?",
        category: "find",
        description: "Job titles you're a real fit for, including ones you haven't thought of, with salaries and search terms.",
        needsJob: false,
        build: (c) =>
            join(
                `<role>You are a senior UK careers coach and former agency recruiter who has placed thousands of people. You're known for spotting transferable skills and adjacent roles people overlook, and for being honest about what's realistic.</role>`,
                cvBlock(c),
                goalsBlock(c),
                `<task>Help me work out exactly which jobs to search for, so I'm not missing roles I'd be great at or wasting time on ones I won't get.</task>`,
                `<method>
1. Read my CV and pull out: my core skills, my transferable skills, my seniority level (be realistic), the sectors I know, and my strongest evidence (achievements with numbers).
2. Identify the job families those skills map onto, including adjacent fields (e.g. events → partnerships, account management, operations, production).
3. For each suggestion, think about how a UK recruiter screening my CV would really see me: would I be shortlisted?
4. Check my goals and flag any tension (e.g. salary vs level, location vs the roles that exist).
</method>`,
                HOUSE_RULES,
                `<output>
## Snapshot
Two or three sentences: what I'm strongest at and the level I'm realistically at right now.

## Roles to target
Three groups — Strong fit (apply now), Adjacent moves (a small step sideways), Stretch roles (6–12 months away). 4–5 roles per group. For each:
- **Job title** (plus the other titles employers use for the same job)
- Why I fit, in one line, quoting my CV evidence
- Typical UK salary range for my level (label it clearly as an estimate and say whether London differs)
- Likelihood of being shortlisted today: High / Medium / Low

## Search terms
The exact keywords to type into LinkedIn, Indeed and Reed for each group, including variations.

## Sectors and employers
The 4 sectors where my background is most valued, and 3 example types of employer in each.

## Gaps for the stretch roles
The 3 most valuable things to close the gap (a course, a project, a type of experience), with roughly how long each would take.
</output>`,
                ASK_FIRST("e.g. whether I'm open to changing sector, or my minimum salary"),
                NEXT(["Build Boolean search strings for the Strong fit roles", "Rewrite my CV headline and summary for the role you'd pick for me", "Make a 4-week plan to get interviews"]),
            ),
    },
    {
        id: "boolean",
        title: "Build my search strings",
        category: "find",
        description: "Copy-paste Boolean searches for LinkedIn, Indeed and Google that catch every version of your job title.",
        needsJob: false,
        fields: [{ id: "roles", label: "Roles to search for", placeholder: "e.g. marketing manager, brand manager" }],
        build: (c) =>
            join(
                `<role>You are a specialist sourcing recruiter who builds Boolean searches for a living. You know every alternative job title employers use, and how each job site's search actually behaves.</role>`,
                `Roles I want: ${f(c, "roles", c.targetRoles || "(work them out from my CV)")}\nLocation: ${c.targetLocation || "UK"}${c.workPreference !== "any" ? ` (${c.workPreference})` : ""}`,
                cvBlock(c),
                `<task>Write search strings I can paste straight into job sites to find every relevant role and skip the irrelevant ones.</task>`,
                `<method>
1. List every title variant for my target roles (including abbreviations and seniority variants at my level).
2. Pick the seniority words to exclude so I don't drown in roles that are too junior or too senior for me.
3. Write each string in the syntax that site actually supports:
   - LinkedIn Jobs: AND, OR, NOT, "quotes", (brackets). Must be under 900 characters.
   - Indeed UK: "quotes", OR, and a minus sign to exclude (e.g. -intern). Brackets don't work reliably.
   - Google: site: searches for boards.greenhouse.io, jobs.lever.co, jobs.ashbyhq.com, apply.workable.com and careers.smartrecruiters.com, which finds roles on companies' own careers pages, often before the big boards.
4. Test your own strings mentally: would each one return a role I'd want? Remove anything that would cause junk results.
</method>`,
                HOUSE_RULES,
                `<output>
## Title variants
A compact list of every title you'll search for.

## LinkedIn
One string in a code block, then one line on how to save it as a daily alert.

## Indeed UK
One string in a code block.

## Google (company careers sites)
One string in a code block. Tell me to filter Google to "Past week".

## Words to exclude
The list, with one line on why.

## Narrower and broader versions
One tighter LinkedIn string for when I'm drowning in results, and one looser one for when I'm getting nothing.
</output>`,
                NEXT(["Make versions for a second job title", "Suggest 20 UK companies to follow on LinkedIn", "Explain which results to apply to first"]),
            ),
    },
    {
        id: "decode-advert",
        title: "Decode this job advert",
        category: "find",
        description: "What they really want, what's missing, the red flags, and the questions to ask before applying.",
        needsJob: true,
        build: (c) =>
            join(
                `<role>You are an experienced UK hiring manager and recruiter who has written and read thousands of job adverts. You can tell what's genuinely required, what's wishful thinking, and what an advert is quietly telling you.</role>`,
                jobBlock(c),
                cvBlock(c),
                `<task>Help me understand what this employer is really looking for and whether this job is worth my time.</task>`,
                `<method>
1. Separate true must-haves from nice-to-haves. Adverts often list 10 requirements when 3 really matter. Look for clues: what's repeated, what's listed first, what's in the job title and opening paragraph.
2. Infer the actual problem this hire solves. Why does this role exist right now?
3. Read between the lines on culture, workload and seniority (e.g. "wear many hats", "fast-paced", a huge responsibility list on a modest salary).
4. Note what's missing: salary, hybrid details, team size, who it reports to.
5. Compare with my CV only at a high level (the "How well do I fit" prompt does the detailed version).
</method>`,
                HOUSE_RULES,
                `<output>
## In one sentence
What they really want.

## The 3–4 things that actually matter
Each with the clue in the advert that tells you so.

## Nice-to-haves you can relax about

## What the role is really for
The problem they need solved, and how success would likely be judged at 6 months.

## Signals and red flags
Culture, workload, seniority and salary signals. Be balanced: note genuine positives too.

## What's not said
Missing information, and why it might matter.

## Questions to ask
5 questions to ask the recruiter or at interview to fill the gaps (salary, hybrid, why the role is open, team, success measures).

## Worth applying?
Yes / Maybe / Probably not, in two sentences, with the main reason.
</output>`,
                NEXT(["Do a detailed fit check against my CV", "Tailor my CV to this job", "Write a message to the recruiter asking the key questions"]),
            ),
    },
    {
        id: "extract-jobs",
        title: "Pull jobs out of a page",
        category: "find",
        description: "For sites that block automatic reading: paste the page text and get a clean, ranked list of roles.",
        needsJob: false,
        fields: [
            { id: "page", label: "Paste the page text (select all, copy)", multiline: true },
            { id: "filter", label: "Only keep roles about…", placeholder: "e.g. marketing, events" },
        ],
        build: (c) =>
            join(
                `<role>You are a meticulous research assistant who extracts structured data from messy web pages without ever inventing anything.</role>`,
                `<page_text>\n${f(c, "page", "(Ask me to paste the page text.)")}\n</page_text>`,
                f(c, "filter") ? `Only include roles relevant to: ${f(c, "filter")}.` : "",
                cvBlock(c),
                `<task>Extract every job listing from the page text, then tell me which ones are worth my time.</task>`,
                `<method>
1. Find every distinct job listing. Ignore navigation, cookie banners, footers and "similar jobs" adverts.
2. For each, extract only what's actually in the text. Leave a cell blank rather than guessing.
3. Rank the listings against my CV and goals.
</method>`,
                `<rules>Never invent a salary, location, date or link. If the page text looks incomplete (e.g. only the first few listings), say so.</rules>`,
                `<output>
## All listings
A table: Job title | Company | Location | Salary | Closing date | Link

## Best three for me
For each: why it fits (quote my CV) and one thing to check before applying.

## Anything odd
Duplicates, listings that look expired, or text that was cut off.
</output>`,
            ),
    },

    // ── Apply ─────────────────────────────────────────────────────────────────
    {
        id: "fit-check",
        title: "How well do I fit this job?",
        category: "apply",
        description: "An honest, requirement-by-requirement read on your chances, and exactly what to fix before applying.",
        needsJob: true,
        build: (c) =>
            join(
                `<role>You are a blunt but kind UK recruiter who screens hundreds of CVs a week for roles like this, and an expert in how applicant tracking systems (ATS) filter candidates. You tell people the truth because it saves them time.</role>`,
                jobBlock(c),
                cvBlock(c),
                goalsBlock(c),
                `<task>Assess honestly how likely my CV is to be shortlisted for ${roleAt(c)}, and exactly what would improve my chances.</task>`,
                `<method>
1. List every requirement in the advert and classify it: essential or desirable.
2. For each, look for evidence in my CV. Be strict: "managed budgets" is not evidence of "managed £500k budgets".
3. Simulate a 7-second human scan of my CV for this job: what would the recruiter notice first, and would they keep reading?
4. Simulate an ATS keyword check: which important terms from the advert are missing from my CV word for word?
5. Weigh it all up as a recruiter would.
</method>`,
                HOUSE_RULES,
                `<output>
## Verdict
Fit score out of 10, chance of shortlisting (High / Medium / Low), and one sentence on why.

## Requirement by requirement
A list. For each requirement: ✅ clearly shown, ⚠️ probably true but not shown well, ❌ missing. Quote the CV evidence or say what's absent.

## The 7-second scan
What a recruiter would notice first, good and bad.

## Missing keywords
Words and phrases from the advert my CV doesn't use, split into "add if true" and "don't fake".

## Fix before applying
The 3–5 highest-impact changes, in order, each with the exact wording to add or change.

## How to address the biggest gap
What to say in the cover letter or interview about my weakest area.

## Apply?
Yes / Yes, with the fixes above / Probably not, and why.
</output>`,
                NEXT(["Tailor my CV to this job using these fixes", "Write the cover letter", "Prepare me for the questions they'll ask about my gaps"]),
            ),
    },
    {
        id: "tailor-cv",
        title: "Tailor my CV to this job",
        category: "apply",
        description: "A rewritten, ATS-friendly CV aimed squarely at this job, with nothing made up.",
        needsJob: true,
        build: (c) =>
            join(
                `<role>You are an award-winning UK CV writer and former in-house recruiter. You understand applicant tracking systems (ATS) and know that UK recruiters spend seconds on a first read. Your CVs are specific, evidence-led and never exaggerate.</role>`,
                jobBlock(c),
                cvBlock(c),
                goalsBlock(c),
                `<task>Rewrite my CV so that it is clearly aimed at ${roleAt(c)}, gets through ATS keyword filters, and makes a recruiter want to call me — using only true information from my CV.</task>`,
                `<method>
1. Identify the 5–6 things this employer cares about most (from the advert's emphasis, not just its list).
2. Map each one to the strongest evidence in my CV. Note anything you can't evidence; don't paper over it.
3. Rewrite the profile so its first line answers "why this person for this job?".
4. Reorder and rewrite bullets with the CAR formula (Challenge, Action, Result): strong verb first, what I did, the result with a number where I have one. Most relevant first in each role.
5. Mirror the advert's exact wording where it's honestly true of me (ATS matches exact phrases).
6. Cut or shrink anything irrelevant to make room. Older roles get fewer bullets.
7. Check it against UK conventions: no photo, no date of birth, no marital status, 2 pages maximum, reverse chronological order.
8. Proofread as if you were the hiring manager.
</method>`,
                HOUSE_RULES,
                `<output>
## Tailored CV
The full CV in plain text, in this order: name, one-line headline, contact line, PROFILE (3–4 lines), KEY SKILLS (8–12, ordered by importance to this advert), EXPERIENCE (each role as "Job title — Company, Location (Start – End)" then bullets: 4–6 for recent roles, 1–3 for older ones), EDUCATION, CERTIFICATIONS, ADDITIONAL.
This exact format can be pasted straight back into my CV builder.

## What I changed and why
5–8 short bullets.

## Placeholders to fill
Every [ADD: …] you used, listed in one place.

## Keywords still missing
Advert keywords I genuinely can't claim, so I know where I'm weaker.
</output>`,
                ASK_FIRST("e.g. results or numbers for my most relevant role"),
                NEXT(["Write the matching cover letter", "Make it fit on one page", "Give me 3 alternative profile openings"]),
            ),
    },
    {
        id: "bullets",
        title: "Make my achievements stronger",
        category: "apply",
        description: "Turns duties into results-focused bullet points, and asks the questions that uncover your numbers.",
        needsJob: false,
        fields: [{ id: "bullets", label: "Bullets to improve (one per line, or leave blank to use your whole CV)", multiline: true }],
        build: (c) =>
            join(
                `<role>You are an expert UK CV writer who specialises in turning vague job duties into specific, measurable achievements, and in interviewing people to dig out the numbers they've forgotten.</role>`,
                `<bullets>\n${f(c, "bullets", "(Use every bullet in my CV below.)")}\n</bullets>`,
                cvBlock(c),
                goalsBlock(c),
                `<task>Rewrite these bullet points so each one shows impact, not just responsibility.</task>`,
                `<method>
1. For each bullet, decide whether it's a duty ("Responsible for social media") or an achievement ("Grew Instagram from 2k to 15k in a year").
2. Rewrite with the CAR formula: Challenge or context, Action (strong verb, what I personally did), Result (number, time, money, scale, quality, or who benefited).
3. Where there's no number, consider the scale (how many, how often, how big a budget, how many people), the outcome (faster, cheaper, more, fewer complaints, won), or the recognition (promoted, chosen to, asked to).
4. Never invent. Use [ADD: …] where a number is needed.
5. Vary the opening verbs; don't start every bullet with "Managed".
</method>`,
                HOUSE_RULES,
                `<output>
For each original bullet:
**Before:** the original
**After:** the rewrite (one line, ideally under 25 words)
**To make it stronger:** one specific question for me (e.g. "Roughly how many attendees did those events have?")

Then: **Power verbs** — a list of 20 strong verbs suited to my kind of work.
</output>`,
                NEXT(["Ask me the questions one at a time and finish the bullets", "Rewrite my whole Experience section with these", "Turn my best 3 bullets into interview stories"]),
            ),
    },
    {
        id: "cover-letter",
        title: "Write my cover letter",
        category: "apply",
        description: "A short, specific letter that sounds like you, not a template.",
        needsJob: true,
        fields: [
            { id: "why", label: "Why do you want this job? (a few words is fine)", placeholder: "e.g. love their festivals, want to move into partnerships" },
            { id: "hiringManager", label: "Hiring manager's name (if known)" },
        ],
        build: (c) =>
            join(
                `<role>You are an expert UK cover letter writer and former hiring manager. You know most cover letters are skimmed in seconds, so yours are short, specific and impossible to mistake for a template.</role>`,
                jobBlock(c),
                cvBlock(c),
                `Why I want this role: ${f(c, "why", "(ask me — this matters)")}\nAddress it to: ${f(c, "hiringManager", "the hiring manager by name if the advert gives one, otherwise 'Dear Hiring Manager'")}`,
                `<task>Write my cover letter for ${roleAt(c)}.</task>`,
                `<method>
1. Find the 2–3 things this employer most needs (from the advert's emphasis).
2. Pick my 2–3 strongest, most relevant pieces of evidence from my CV that prove I can deliver them.
3. Structure:
   - Opening (2–3 sentences): a specific hook about the company or role, plus who I am in one line. Never "I am writing to apply for…".
   - Proof (1–2 short paragraphs): the evidence, each linked explicitly to what they need, with results.
   - Fit (2–3 sentences): why this company and role, specifically, based on my reason above.
   - Close (1–2 sentences): confident and warm, inviting a conversation.
4. Mirror a few of the advert's key phrases naturally.
5. Read it back as the hiring manager. Cut anything generic.
</method>`,
                HOUSE_RULES,
                `<output>
## Cover letter
250–350 words. Signed off "Kind regards," then ${c.name || "my name"}. Plain text.

## Alternative openings
Two other opening lines to choose from: one bolder, one more formal.

## Placeholders
Anything marked [ADD: …].

## Short version
A 100-word version for application forms with a small text box.
</output>`,
                ASK_FIRST("especially why I want this specific job, if I haven't said"),
                NEXT(["Make it warmer and more personal", "Make it more formal", "Write the email I'd send it with"]),
            ),
    },
    {
        id: "application-question",
        title: "Answer an application question",
        category: "apply",
        description: "Strong, honest answers for those 'Tell us about a time…' boxes, within the word limit.",
        needsJob: true,
        fields: [
            { id: "question", label: "The question", multiline: true },
            { id: "limit", label: "Word or character limit", placeholder: "e.g. 250 words" },
        ],
        build: (c) =>
            join(
                `<role>You are an expert in UK application forms and competency-based recruitment (as used by the Civil Service, the NHS, charities, local government and large employers). You know exactly how these answers are marked.</role>`,
                `<question>\n${f(c, "question", "(ask me for the question)")}\n</question>\nLimit: ${f(c, "limit", "about 250 words")}`,
                jobBlock(c),
                cvBlock(c),
                `<task>Help me write the strongest honest answer to this question for ${roleAt(c)}.</task>`,
                `<method>
1. Work out what the question is really testing (the competency or quality behind it) and what a top-scoring answer would show. If it maps to a framework the employer uses (e.g. Civil Service Success Profiles behaviours, NHS values), name it.
2. Choose the best example from my CV. If two are plausible, say which you chose and why.
3. For competency questions use STAR: Situation (brief), Task (brief), Action (most of the words; what *I* did, using "I" not "we"), Result (with numbers), plus a one-line reflection on what I learnt. For motivation questions, use specific reasons linked to the employer.
4. Fit the limit exactly. Count the words.
</method>`,
                HOUSE_RULES,
                `<output>
## What they're looking for
One or two lines.

## Answer
In the first person, ready to paste. Then: "Word count: N".

## Why it scores well
3 bullets mapping the answer to what assessors look for.

## Alternative example
A one-paragraph outline using a different example from my CV, in case I prefer it.
</output>`,
                ASK_FIRST("e.g. details of the example you'd choose, like what I personally did and the result"),
                NEXT(["Make it shorter", "Use the alternative example instead", "Save a version I can reuse for similar questions"]),
            ),
    },
    {
        id: "answer-bank-builder",
        title: "Fill my answer bank",
        category: "apply",
        description: "Draft answers to the 14 questions most forms ask, in a format the Answer bank can import in one paste.",
        needsJob: false,
        build: (c) =>
            join(
                `<role>You are an expert UK careers coach who helps people build a reusable "answer bank" for application forms, so they never start from a blank box again.</role>`,
                cvBlock(c),
                goalsBlock(c),
                `<task>Draft strong, reusable answers to the questions UK application forms ask most often, based only on my CV.</task>`,
                `<questions>
1. Why do you want to work for {company}?
2. Tell us about yourself / supporting statement
3. Why are you a good fit for this role?
4. Tell us about a time you worked as part of a team
5. Describe a time you dealt with a difficult customer or colleague
6. Tell us about a time you worked under pressure or to a tight deadline
7. What is your greatest achievement?
8. What are your salary expectations?
9. What is your notice period / when could you start?
10. Do you have the right to work in the UK?
11. Do you need any reasonable adjustments for interview?
12. Do you have a full UK driving licence?
13. Why are you leaving your current role?
14. Where do you see yourself in five years?
</questions>`,
                `<method>
1. Write each answer to be reusable: where a company or role name belongs, write {company} or {role} literally — my app fills these in automatically.
2. Competency answers (4–7): use STAR with a real example from my CV, 150–220 words, using "I".
3. Motivation answers (1–3, 13, 14): 80–150 words, specific and positive.
4. Factual answers (8–12): one or two sentences. Where you don't know the fact (e.g. my notice period), write [ADD: …].
5. Use different examples for different questions where possible.
</method>`,
                HOUSE_RULES,
                `<output>
Return ONLY the answers, in exactly this format, so my app can import them in one paste:

Q: <the question, exactly as listed>
A: <the answer>

Q: <next question>
A: <next answer>

No headings, no commentary, no numbering, no markdown. Leave one blank line between each pair.
</output>`,
                NEXT(["Add 6 more questions common in my sector", "Make the competency answers shorter for 150-word limits", "Write versions for a different kind of role"]),
            ),
    },
    {
        id: "company-research",
        title: "Research this company",
        category: "apply",
        description: "A briefing that makes your application and interview specific, with sources.",
        needsJob: true,
        build: (c) =>
            join(
                `<role>You are a business research analyst preparing a candidate for a job application and interview. You separate verified facts from assumptions and always cite sources.</role>`,
                jobBlock(c),
                cvBlock(c),
                `<task>Brief me on ${c.job?.company || "this company"} so my application and interview are specific and informed.</task>`,
                `<method>
1. If you can browse the web, use it: the company's own site (About, News, Careers), recent news coverage, LinkedIn, Glassdoor or Indeed reviews and, for UK companies, Companies House. Cite every fact with its source and date.
2. If you can't browse, say so clearly up front, tell me exactly what to look up and where, and mark anything from your own knowledge as "unverified, may be out of date".
3. Connect what you find to this role and to my background.
</method>`,
                HOUSE_RULES,
                `<output>
## In plain English
What they do, who for, and how they make money (or are funded, for a charity or public body).

## Recent news (last 12 months)
3–6 items, each with source and date.

## Culture and values
In their own words where possible, plus what employee reviews suggest. Be balanced.

## What this team is probably dealing with
Likely challenges or goals that explain why this role exists.

## Links to my background
3 specific connections between my CV and what they're doing.

## Things to mention
3 specific, non-generic things I could reference in my cover letter or interview.

## Things to check
Any red flags (layoffs, poor reviews, funding issues, high turnover) and how to ask about them tactfully.

## Questions this research suggests
4 smart questions to ask at interview.
</output>`,
                NEXT(["Use this to write my cover letter", "Turn this into a one-page interview cheat sheet", "Find people at the company to contact"]),
            ),
    },

    // ── Interviews ────────────────────────────────────────────────────────────
    {
        id: "interview-prep",
        title: "Prepare me for the interview",
        category: "interview",
        description: "A full prep pack: likely questions, answers from your real experience, your pitch and a cheat sheet.",
        needsJob: true,
        fields: [
            { id: "format", label: "Interview format (if known)", placeholder: "e.g. 45 min video call with the hiring manager" },
            { id: "interviewers", label: "Who's interviewing you (if known)", placeholder: "e.g. Head of Events, HR partner" },
        ],
        build: (c) =>
            join(
                `<role>You are an experienced UK interview coach and former hiring manager. You've sat on hundreds of interview panels, including competency-based ones, and you know exactly what separates a good answer from a forgettable one.</role>`,
                jobBlock(c),
                cvBlock(c),
                `Format: ${f(c, "format", "not known yet")}\nInterviewers: ${f(c, "interviewers", "not known yet")}`,
                `<task>Prepare me thoroughly for my interview for ${roleAt(c)}.</task>`,
                `<method>
1. Work out what this interview will be testing: the advert's key requirements, the likely competencies or values, and any worries a hiring manager would have about my CV.
2. Predict the questions, weighted towards what's most likely for this role, level and format.
3. Build every answer from real examples in my CV. Use STAR for behavioural questions, with most of the time on Action and a clear Result.
4. Keep answers as memorable bullet points, not scripts (scripts sound rehearsed), except the opening pitch.
5. Prepare me for my weak spots honestly.
</method>`,
                HOUSE_RULES,
                `<output>
## What they're really assessing
3–5 bullets.

## Your 60–90 second opener
A spoken-style answer to "Tell me about yourself" for this role: present, past, why this job. Natural, not robotic.

## Likely questions and how to answer
12 questions grouped as Motivation, Competency/behavioural, Role-specific and Curveball. For each:
- Why they ask it
- Which example from my CV to use
- Answer outline in 3–5 bullets (STAR where relevant)

## Your weak spots
The 2–3 toughest questions about gaps in my CV, with honest, confident ways to answer.

## Your story bank
My 5 best stories, one line each, and which questions each one can answer.

## Questions to ask them
5 strong questions tailored to this role.

## The day before
A short checklist (logistics, what to bring or test, what to re-read).
</output>`,
                ASK_FIRST("e.g. the interview format or who I'm meeting, if it would change the prep"),
                NEXT(["Run a mock interview with me now", "Turn my weakest answer into a strong one", "Make a one-page cheat sheet to read before I go in"]),
            ),
    },
    {
        id: "mock-interview",
        title: "Mock interview (practice live)",
        category: "interview",
        description: "The AI interviews you one question at a time, pushes back like a real interviewer, and scores you.",
        needsJob: true,
        conversational: true,
        fields: [{ id: "style", label: "Interview style", placeholder: "e.g. friendly / tough / competency-based panel" }],
        build: (c) =>
            join(
                `<role>You are the hiring manager for ${roleAt(c)}, running a realistic interview. Style: ${f(c, "style", "professional and fair, but you probe vague answers")}. You are also, separately, my interview coach.</role>`,
                jobBlock(c),
                cvBlock(c),
                `<rules>
1. Ask exactly ONE question at a time, then stop and wait for my answer. Never answer for me.
2. Stay in character as the interviewer while asking. If an answer is vague, ask one realistic follow-up ("What did you personally do?", "What was the result?") before moving on, just as a real interviewer would.
3. After each of my answers (and any follow-up), step out of character briefly and give coaching in this format:
   Score: x/5
   Worked: one line
   Improve: one line
   Stronger version: a 2–3 sentence example using only facts from my CV
   Then step back into character and ask the next question.
4. Cover: a warm-up, 2 motivation questions, 3 competency questions (STAR), 2 role-specific questions and 1 curveball. 9 questions in total.
5. Use UK English. Never invent facts about me.
</rules>`,
                `<output>
After question 9, give me a debrief:
- Overall score out of 10 and whether you'd invite me to the next stage, with honest reasons
- My strongest answer and why
- My weakest answer, with a rewritten version
- Patterns you noticed (e.g. too much "we", rambling, no results)
- The 3 things to practise before the real interview
</output>`,
                `Start now: introduce yourself briefly as the interviewer and ask your first question.`,
            ),
    },
    {
        id: "star-stories",
        title: "Build my STAR stories",
        category: "interview",
        description: "Turn your experience into a bank of 8 interview stories you can reuse for almost any question.",
        needsJob: false,
        conversational: true,
        build: (c) =>
            join(
                `<role>You are an expert interview coach who helps people build a reusable bank of STAR stories. With 8 good stories you can answer almost any behavioural question.</role>`,
                cvBlock(c),
                goalsBlock(c),
                `<task>Help me build 8 strong STAR stories from my real experience, covering the themes UK interviewers ask about most: leadership or taking the lead; teamwork; conflict or a difficult person; a mistake or failure and what I learnt; going above and beyond; working under pressure or competing priorities; solving a problem or improving a process; influencing or persuading someone.</task>`,
                `<method>
1. Scan my CV and propose the best example for each theme, saying why it fits. Flag themes where my CV has no obvious example.
2. Then work through them ONE AT A TIME. For each story, ask me 2–4 short questions to get the details (what exactly happened, what I personally did, the result in numbers, what I learnt), and wait for my answers.
3. Write the finished story: Situation (1–2 sentences), Task (1 sentence), Action (3–5 sentences, "I" not "we"), Result (1–2 sentences, with numbers), Reflection (1 sentence). Aim for about 90 seconds spoken.
4. Note which other common questions each story could answer.
</method>`,
                HOUSE_RULES,
                `<output>
At the very end, give me all 8 stories together, each with a title, a one-line summary and "Also answers: …", so I can save them.
</output>`,
                `Start by proposing the 8 examples, then ask your first questions for story 1.`,
            ),
    },
    {
        id: "questions-to-ask",
        title: "Questions to ask them",
        category: "interview",
        description: "Smart questions for the end of the interview that show insight and get you the information you need.",
        needsJob: true,
        build: (c) =>
            join(
                `<role>You are an interview coach who knows the questions at the end of an interview are a chance to impress and to find out whether the job is right for the candidate.</role>`,
                jobBlock(c),
                cvBlock(c),
                `<task>Give me questions to ask at the end of my interview for ${roleAt(c)}.</task>`,
                `<method>
1. Avoid anything answered in the advert or on their website, and anything about holiday or pay in a first interview (unless they raise it).
2. Make questions specific to this role and company, showing I've thought about the job.
3. Include questions that get me real information about workload, culture, success and support.
4. Include one question that politely surfaces any doubts they have about me, so I can address them before I leave.
</method>`,
                `<output>
## Top 3 (if there's only time for a few)
Each with one line on why it's a good question.

## By interviewer
- Hiring manager: 4 questions
- Someone from the team: 3 questions
- HR or recruiter: 3 questions

## The closer
The question that surfaces their doubts, and how to respond to the most likely answers.

## Avoid
3 questions not to ask, and why.
</output>`,
            ),
    },
    {
        id: "phone-screen",
        title: "Prep for a recruiter call",
        category: "interview",
        description: "Ace the first 15-minute call: your pitch, salary, notice period and the questions to ask them.",
        needsJob: true,
        build: (c) =>
            join(
                `<role>You are a UK agency and in-house recruiter who does dozens of first-stage screening calls a week. You know exactly what gets someone through to the hiring manager and what quietly rules them out.</role>`,
                jobBlock(c),
                cvBlock(c),
                goalsBlock(c),
                `<task>Prepare me for a short screening call about ${roleAt(c)}.</task>`,
                `<method>
1. A screening call checks the basics: motivation, rough fit, salary, notice period, location or hybrid, right to work, and communication. Prepare me for each.
2. Help me handle the salary question without underselling myself or ruling myself out.
3. Help me find out what I need to know in the time available.
</method>`,
                HOUSE_RULES,
                `<output>
## 30-second pitch
Spoken-style, specific to this role.

## The 8 questions you'll almost certainly be asked
Each with a short suggested answer from my CV and goals (e.g. why are you looking, why this role, salary expectations, notice period, availability for interview, hybrid, right to work, other interviews).

## Handling salary
How to answer if asked first, with a script that gives a researched range, and what to say if their budget is lower.

## What to ask them
5 quick questions (salary band, interview process and timeline, why the role is open, team, hybrid).

## After the call
A 3-line follow-up message to send the same day.
</output>`,
                NEXT(["Do a quick practice call with me", "Research the salary range for this role", "Prepare me for the next stage"]),
            ),
    },

    // ── Networking ────────────────────────────────────────────────────────────
    {
        id: "linkedin-profile",
        title: "Rewrite my LinkedIn profile",
        category: "network",
        description: "A headline and About section recruiters actually find, plus the settings that get you seen.",
        needsJob: false,
        build: (c) =>
            join(
                `<role>You are a LinkedIn optimisation specialist who used to work in recruitment. You know how recruiters search LinkedIn (LinkedIn Recruiter filters on title, skills and keywords) and what makes them click on a profile.</role>`,
                cvBlock(c),
                goalsBlock(c),
                `<task>Rewrite my LinkedIn profile so recruiters hiring for my target roles find me and want to get in touch.</task>`,
                `<method>
1. Identify the exact keywords recruiters type when searching for my target roles.
2. Headline: lead with the role I want (or my current role, if it's the same), then 2–3 specialisms or proof points. Keywords near the start.
3. About: first person, conversational, scannable. A hook in the first two lines (that's all that shows before "see more"), then what I do and for whom, 2–3 proof points with numbers, what I'm looking for, and a light call to action.
4. Experience: rewrite my current role's description for LinkedIn (more conversational than a CV).
5. Recommend skills and settings.
</method>`,
                HOUSE_RULES,
                `<output>
## Headlines
5 options, each under 220 characters: from safe to bolder.

## About section
200–280 words, ready to paste.

## Current role description
80–120 words.

## Top skills
10 skills in priority order (LinkedIn lets you pin 3 — mark which).

## Settings and quick wins
- Open to Work: whether to use "recruiters only" vs the public banner, and which job titles and locations to enter
- 5 other quick changes (custom URL, photo and banner tips, featured section ideas)
</output>`,
                NEXT(["Write my first LinkedIn post announcing I'm looking", "Write messages to send to 5 old colleagues", "Make the About section more personal"]),
            ),
    },
    {
        id: "outreach",
        title: "Message a recruiter or hiring manager",
        category: "network",
        description: "Short LinkedIn messages and emails that actually get replies.",
        needsJob: true,
        fields: [{ id: "who", label: "Who are you messaging?", placeholder: "e.g. Head of Marketing, agency recruiter, former colleague" }],
        build: (c) =>
            join(
                `<role>You are an expert in professional outreach who knows busy people reply to messages that are short, specific, about them, and easy to say yes to.</role>`,
                jobBlock(c),
                cvBlock(c),
                `Who I'm messaging: ${f(c, "who", "the hiring manager")}`,
                `<task>Write outreach about ${roleAt(c)} that gets a reply.</task>`,
                `<method>
1. Pick the single most relevant thing about me for this person.
2. Make the ask small and specific (a 15-minute call, or who to speak to), never "can you get me a job".
3. Keep it human: no flattery, no CV dump, no "I hope this finds you well".
</method>`,
                HOUSE_RULES,
                `<output>
1. **LinkedIn connection note**: under 280 characters.
2. **LinkedIn message after they accept**: under 120 words.
3. **Email**: subject line + under 150 words.
4. **Follow-up**: if no reply after a week, under 60 words.
5. **How to find them**: the LinkedIn search to find the right person at the company, if I don't know who it is yet.
</output>`,
            ),
    },
    {
        id: "networking-plan",
        title: "Who should I be talking to?",
        category: "network",
        description: "A plan to find the jobs that are never advertised, without it feeling awkward.",
        needsJob: false,
        build: (c) =>
            join(
                `<role>You are a career coach who specialises in the hidden job market. Many UK roles are filled through referrals and direct approaches before they're ever advertised.</role>`,
                cvBlock(c),
                goalsBlock(c),
                `<task>Give me a practical networking plan to find unadvertised roles in my field, which works for someone who doesn't love "networking".</task>`,
                `<method>
1. Identify the people most likely to know about relevant roles (hiring managers, peers one level up, specialist recruiters, former colleagues, industry communities).
2. Name specific, real UK companies and organisations that fit my goals. If you're not certain a company is a good fit, say so.
3. Make every step concrete, small and low-pressure.
</method>`,
                HOUSE_RULES,
                `<output>
## Who to talk to
Types of people, and the LinkedIn search to find each.

## 20 target organisations
Grouped by type, each with one line on why it fits.

## Specialist recruiters
The kinds of UK recruitment agencies that cover my field, and how to approach them.

## Messages
Templates for: a former colleague, a friend of a friend, and someone I don't know.

## Communities and events
Where people in my field gather (online and in person), as types or real examples.

## 30 minutes a day
A simple weekly routine.
</output>`,
            ),
    },

    // ── Offers & follow-up ────────────────────────────────────────────────────
    {
        id: "follow-up",
        title: "Chase an application",
        category: "offer",
        description: "A polite, confident follow-up when you've heard nothing back.",
        needsJob: true,
        fields: [{ id: "when", label: "When did you apply or interview?", placeholder: "e.g. applied 2 weeks ago" }],
        build: (c) =>
            join(
                `<role>You are a recruiter who knows a well-timed, polite follow-up keeps a candidate front of mind without being pushy.</role>`,
                jobBlock(c),
                cvBlock(c),
                `Context: ${f(c, "when", "I applied about two weeks ago and haven't heard back")}`,
                `<task>Write a follow-up about my application for ${roleAt(c)}.</task>`,
                HOUSE_RULES,
                `<output>
1. **Email**: subject line + under 100 words. Restate interest, add one specific reason I fit (from my CV), and make it easy to reply.
2. **LinkedIn version**: under 60 words.
3. **Timing**: when to send it, and when to follow up again if there's still nothing (and when to let it go).
</output>`,
            ),
    },
    {
        id: "thank-you",
        title: "Thank-you after an interview",
        category: "offer",
        description: "Send within 24 hours to stay front of mind and reinforce your best point.",
        needsJob: true,
        fields: [{ id: "notes", label: "Something you discussed in the interview", multiline: true }],
        build: (c) =>
            join(
                `<role>You are an interview coach who knows a short, specific thank-you note can tip a close decision.</role>`,
                jobBlock(c),
                cvBlock(c),
                `What we talked about: ${f(c, "notes", "(ask me for one or two specifics from the interview)")}`,
                `<task>Write a thank-you email to send after my interview for ${roleAt(c)}.</task>`,
                HOUSE_RULES,
                `<output>
1. **Email**: subject line + under 150 words. Thank them, refer to something specific from the conversation, add one point that strengthens my case (or addresses something I wish I'd said better), and close warmly.
2. **Panel version**: how to adapt it if I met several people.
</output>`,
            ),
    },
    {
        id: "negotiate",
        title: "Negotiate my offer",
        category: "offer",
        description: "Know your worth, what to ask for, and exactly what to say.",
        needsJob: true,
        fields: [{ id: "offer", label: "The offer details", multiline: true, placeholder: "Salary, holiday, pension, bonus, hybrid days, start date…" }],
        build: (c) =>
            join(
                `<role>You are a UK salary negotiation coach. You know most UK employers expect some negotiation, that a polite, evidence-based ask rarely loses an offer, and that the whole package matters, not just salary.</role>`,
                `<offer>\n${f(c, "offer", "(ask me for the offer details)")}\n</offer>`,
                `What I was hoping for: ${c.salaryExpectation || "(ask me)"}`,
                jobBlock(c),
                cvBlock(c),
                `<task>Help me decide what to ask for and how to ask, for ${roleAt(c)}.</task>`,
                `<method>
1. Estimate the market rate for this role, level and location. If you can browse, check UK salary data (e.g. job adverts for similar roles, Glassdoor, Reed and Adzuna salary data) and cite it. If not, give a clearly-labelled estimate and tell me how to check it.
2. Value the full package: pension contribution, holiday, bonus, flexibility, training, notice period, job title.
3. Recommend a specific ask and a walk-away point, based on evidence (market rate, my experience, what they said they need).
4. Script it: appreciative, confident and collaborative.
</method>`,
                HOUSE_RULES,
                `<output>
## Is this a good offer?
Salary versus market, plus the full package, in plain words.

## What to ask for
Your recommended ask, with the reasoning and a fallback.

## Phone script
What to say, including the pause after asking.

## Email version
For if I'd rather write.

## If they say no
Responses to "this is our final offer" and "the budget is fixed", including non-salary asks.

## Before accepting
A checklist of what to get in writing.
</output>`,
            ),
    },
    {
        id: "rejection",
        title: "Reply to a rejection",
        category: "offer",
        description: "Keep the door open, get useful feedback, and learn from it.",
        needsJob: true,
        build: (c) =>
            join(
                `<role>You are a supportive career coach. Rejections sting, but a gracious reply often leads to feedback, future roles or referrals.</role>`,
                jobBlock(c),
                `<task>I've been turned down for ${roleAt(c)}. Help me respond well and learn from it.</task>`,
                HOUSE_RULES,
                `<output>
1. **Reply email**: under 100 words. Gracious, asks for one or two specific pieces of feedback, and asks to be considered for future roles.
2. **If I was interviewed**: an extra line asking to stay in touch with the hiring manager on LinkedIn.
3. **Reflection**: 4 honest questions to ask myself about this application, and how to use the answers next time.
4. **A kind word**: one or two sentences of genuine perspective. No toxic positivity.
</output>`,
            ),
    },

    // ── Plan & strategy ───────────────────────────────────────────────────────
    {
        id: "weekly-plan",
        title: "My weekly job search plan",
        category: "plan",
        description: "A realistic routine that gets results without taking over your life.",
        needsJob: false,
        fields: [{ id: "hours", label: "Hours per week you can give it", placeholder: "e.g. 8" }],
        build: (c) =>
            join(
                `<role>You are a supportive, practical career coach. You know job searching is a numbers game AND a quality game, and that burnout is the biggest risk.</role>`,
                `Time available: ${f(c, "hours", "about 8")} hours a week.`,
                goalsBlock(c),
                cvBlock(c),
                `<task>Build me a realistic weekly job search plan that maximises interviews for the time I have.</task>`,
                `<method>
1. Balance: high-quality tailored applications (most interviews come from these), quick applications, networking, and skills or profile work.
2. Set targets that are realistic for my hours.
3. Build in rest and a weekly review.
</method>`,
                HOUSE_RULES,
                `<output>
## Weekly targets
Applications (tailored vs quick), networking messages and learning time, with reasons.

## Day-by-day plan
A short plan for each working day, with times.

## Weekly review (15 minutes)
What to look at: which applications got responses, and what to change.

## When it's been a few weeks with no interviews
A troubleshooting checklist (CV, targeting, volume, approach).

## Looking after yourself
3 practical tips.

## Do these three things today
</output>`,
            ),
    },
    {
        id: "career-change",
        title: "Explain a gap or career change",
        category: "plan",
        description: "Turn a gap, a move or a change of direction into a confident, honest story.",
        needsJob: false,
        fields: [{ id: "situation", label: "What do you need to explain?", multiline: true }],
        build: (c) =>
            join(
                `<role>You are a UK career coach who specialises in career changers and people returning to work. You know employers worry less about gaps than candidates think, as long as the explanation is brief, honest and forward-looking.</role>`,
                `<situation>\n${f(c, "situation", "(ask me what I need to explain)")}\n</situation>`,
                cvBlock(c),
                goalsBlock(c),
                `<task>Help me explain this confidently and honestly on my CV and in interviews.</task>`,
                HOUSE_RULES,
                `<output>
## On my CV
A one-line entry (and where to put it), plus whether to mention it in my profile.

## In a cover letter
One or two sentences.

## In an interview
A 30-second spoken answer: brief, honest and pivoting to why I'm ready now.

## Likely follow-up questions
3 questions, with answers.

## Transferable skills to emphasise
Specific skills from my experience that carry over, with evidence.
</output>`,
            ),
    },
    {
        id: "cv-from-scratch",
        title: "Help me write my CV from scratch",
        category: "plan",
        description: "The AI interviews you and builds a CV in a format this app can import in one paste.",
        needsJob: false,
        conversational: true,
        build: (c) =>
            join(
                `<role>You are an expert UK CV writer. You build CVs by interviewing people, because most people undersell themselves and forget their best achievements.</role>`,
                goalsBlock(c) || "I'm job hunting and need a strong CV.",
                c.cv.trim() ? `Here's what I have so far. Use it, and ask about anything thin or missing:\n${cvBlock(c)}` : "",
                `<method>
1. Interview me ONE question at a time and wait for each answer. Cover: contact details, the roles I'm aiming for, each job (most recent first: title, employer, location, dates, what I did, what I achieved), education, skills, certifications, and anything extra (languages, driving licence, volunteering).
2. For every job, push gently for specifics: numbers, scale, results, recognition. Ask "roughly how many?" or "what changed because of you?".
3. Don't move to writing until you have enough for a strong CV, but don't ask more than about 15 questions in total.
</method>`,
                HOUSE_RULES,
                `<output>
When you're ready, write the full CV in plain text, in EXACTLY this format, so my app can import it in one paste:

FULL NAME
One-line headline
Location | email | phone | linkedin.com/in/…

PROFILE
3–4 lines.

KEY SKILLS
Skill, Skill, Skill (8–12, comma-separated)

EXPERIENCE

Job title — Company, Location (Mon YYYY – Mon YYYY or Present)
• Achievement
• Achievement

EDUCATION
Qualification — Institution (YYYY – YYYY). Detail

CERTIFICATIONS
• Certification

ADDITIONAL
Anything else.
</output>`,
                `Start with your first question.`,
            ),
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
