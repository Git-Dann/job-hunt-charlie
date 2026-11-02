# Charlie's Job Platform

A personal job-hunting portal, built mobile-first on [Untitled UI React](https://www.untitledui.com/react) (MIT) and `@untitledui/icons`.

**Works without AI.** AI is an optional extra: every AI feature is also a ready-made prompt to paste into ChatGPT, Claude or Gemini.

## What's in it

| Page | What it does |
|---|---|
| **Home** | Quick search, application counts, upcoming next steps, CV completeness, setup checklist |
| **Find jobs** | One-tap searches on 13 job boards (LinkedIn, Indeed, Reed, Totaljobs, CV-Library, Civil Service, NHS, CharityJob…). **Live results** from free job APIs (Reed and Adzuna with a free key; Remotive, Jobicy, Himalayas, RemoteOK, The Muse and Arbeitnow need no key). **Careers pages**: paste company jobs pages and their open roles are listed. This reads the public feeds behind Greenhouse, Lever, Ashby, Workable, SmartRecruiters and Recruitee, schema.org job data, RSS feeds, and job-looking links. Saved searches. |
| **Job alerts** | Saved searches (plus any careers pages saved with them) re-run while she uses the app, at most every 6 hours or on "Check now", and show only jobs she hasn't seen. The new count shows on Home and on the Find tab. Runs in the browser with no AI and no server schedule; a failed check is reported, never treated as "nothing new". |
| **Answer bank** | Saved answers to the questions application forms keep asking, with the 14 most common UK ones as starters. Paste a new question and it finds the closest saved answer by what the question is really asking (e.g. "what attracts you to this role" matches "why do you want to work for us"). Fills in `{company}` and `{role}`, checks the form's word limit, and copies in one tap. No AI. |
| **My applications** | Tracker (Saved, Applied, Interviewing, Offer, Closed) with next steps, notes and contacts. CSV export. Per-job CV match score and job-specific AI prompts. |
| **CV builder** | Your details, entered once (or paste your current CV). Tailored versions per job: paste the advert, and skills and achievements are reordered to match it. It shows a keyword match score and the keywords you're missing. Nothing is invented. 3 print styles, saved as PDF from the browser. Includes a no-AI cover letter drafter. |
| **AI prompts** | 22 expert prompts (fit check, tailor CV, cover letter, application questions, interview prep, mock interview, outreach, negotiation…), filled in with your CV and the chosen job. Copy, or open ChatGPT or Claude with the prompt already filled in. |
| **Settings** | Sync across devices (Neon). Optional: connect your own Anthropic, OpenAI or Gemini key to run prompts in the app. Free Reed and Adzuna keys. Backup and restore. Light and dark mode. |
| **Build your own** | A complete brief for an AI app builder to make your own version (top bar, sidebar, Home, Settings). |

## Privacy

There's no account. Everything is stored in the browser's `localStorage`. API keys stay in the browser. They're sent only with the request that uses them, and are never stored or logged on the server. Backups leave the keys out.

## Server routes

- `POST /api/search`: runs the live job sources in parallel. Each source reports its own result or error.
- `POST /api/scrape`: reads up to 10 careers pages. Requests go through `safe-fetch.ts`, which allows only http(s) and blocks private and local addresses (checked again on every redirect). It also applies a 12s timeout and a 4 MB cap.
- `POST /api/ai`: runs one prompt with the user's own key (Anthropic through the official SDK).
- All three are rate-limited per IP.

## Develop

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

## Deploy to Vercel

1. Import the repo in Vercel and deploy. The app works straight away, with data saved in the browser.
2. **Optional but recommended: sync across devices.** In the Vercel project, open **Storage → Create Database → Neon** (free) and connect it to the project. That sets `DATABASE_URL`. **Redeploy.** The table is created automatically the first time it's used.
3. On her phone or laptop: **Settings → Sync across your devices → Turn on sync**. She'll get a private code; she enters it on her other device.

Sync details: there are no accounts. The private code identifies her data, and the database stores only a hash of it. API keys are removed before anything is saved. Saves are conflict-safe: if two devices change things at once, both changes are kept and the newer copy of each item wins.

## Live source check

`.github/workflows/check-sources.yml` runs the real job feeds and careers-page readers through the app's own code on every push and every Monday. If a site changes its format, it shows up there. Add `REED_API_KEY`, `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` as repository secrets to include those sources too.
