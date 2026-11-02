/** A complete brief she can hand to an AI app builder to make her own version of this tool. */
export const BUILD_YOUR_OWN_PROMPT = `I want to build my own personal job-hunting web app. Please build it for me step by step, explaining what you're doing in plain English as if I'm not a developer.

## What it's for
I'm job hunting in the UK. I want one place to: find jobs across lots of sites, keep track of what I've applied for, tailor my CV to each job, and get AI help with cover letters and interview prep.

## Must-have features
1. **Job search**
   - I type keywords (e.g. "marketing manager"), a location and a "remote only" toggle.
   - One-tap buttons open that search on LinkedIn, Indeed UK, Reed, Totaljobs, CV-Library, Guardian Jobs, Civil Service Jobs, NHS Jobs, CharityJob, Glassdoor and Google Jobs.
   - A "live results" list pulled from free job APIs that don't need a key (Remotive, Arbeitnow, The Muse, Jobicy, Himalayas, RemoteOK), plus Reed and Adzuna if I add my own free API keys.
   - A "check a careers page" box: I paste company careers page links and it lists their open roles. Use the public job APIs behind Greenhouse, Lever, Ashby, Workable and SmartRecruiters pages, and fall back to reading schema.org JobPosting data on any other page.
   - Filter results by my keywords, and save any job to my tracker with one tap.
2. **Job tracker** — columns for Saved, Applied, Interviewing, Offer and Closed. Each job has notes, a next step with a date, a contact name and the full advert.
3. **CV builder**
   - A form for my details, summary, skills, each job with bullet points, education and certifications. Let me paste my existing CV to fill it in.
   - Save different versions of my CV for different jobs.
   - "Tailor to a job": paste the advert and it reorders my skills and bullet points so the most relevant come first, shows a keyword match score, and lists keywords from the advert that my CV is missing. It must never make things up — only reorder what I've written.
   - A clean, ATS-friendly CV I can print or save as a PDF from the browser, with 2–3 simple template styles.
4. **AI prompt library (most important)** — ready-made prompts that automatically include my CV and the job advert, for: tailoring my CV, cover letters, application questions, fit checks, interview prep, mock interviews, LinkedIn messages, follow-ups, salary negotiation and a weekly plan. Each has a Copy button and "Open in ChatGPT / Claude" buttons, so I can use them without paying for anything.
5. **Optional AI connection** — in Settings I can paste my own API key (Anthropic, OpenAI or Google Gemini) to run prompts inside the app. The key is stored only in my browser and never saved on a server.
6. **My data** — everything saves in my browser (no login). Export and import a backup file.

## Design
- Mobile-first: I'll use it mostly on my phone. Bottom tab bar on mobile, sidebar on desktop. Big, easy tap targets. No sideways scrolling.
- Clean and calm, like Untitled UI: lots of white space, simple cards, one accent colour, light and dark mode.
- Plain, friendly wording throughout. Helpful empty states that tell me what to do next.

## Tech (suggested — choose something simpler if you think it's better)
- Next.js (App Router) + TypeScript + Tailwind CSS, deployed free on Vercel.
- Untitled UI React components and @untitledui/icons.
- Server routes for fetching job sites (browsers can't fetch other sites directly). Add a timeout, a size limit, and block private/local addresses for safety.
- No database: browser localStorage.

## How to work with me
- Start by showing me the plan and the main screens, then build one feature at a time.
- After each step, tell me how to try it.
- At the end, give me step-by-step instructions to put it online with Vercel, assuming I've never done it before.`;
