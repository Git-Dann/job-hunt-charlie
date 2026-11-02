/** One-tap searches on the big job boards. Nothing is scraped: these open the board's own search. */

export interface BoardSearch {
    keywords: string;
    location: string;
    remoteOnly: boolean;
}

export interface Board {
    id: string;
    name: string;
    region: "UK" | "Global" | "Remote";
    note: string;
    build: (s: BoardSearch) => string;
}

const q = encodeURIComponent;

export const BOARDS: Board[] = [
    {
        id: "linkedin",
        name: "LinkedIn Jobs",
        region: "Global",
        note: "Biggest network. Turn on job alerts once a search looks right.",
        build: (s) =>
            `https://www.linkedin.com/jobs/search/?keywords=${q(s.keywords)}&location=${q(s.location || "United Kingdom")}${s.remoteOnly ? "&f_WT=2" : ""}&sortBy=DD`,
    },
    {
        id: "indeed",
        name: "Indeed UK",
        region: "UK",
        note: "Huge volume, lots of direct employer ads.",
        build: (s) => `https://uk.indeed.com/jobs?q=${q(s.keywords + (s.remoteOnly ? " remote" : ""))}&l=${q(s.location)}&sort=date`,
    },
    {
        id: "reed",
        name: "Reed",
        region: "UK",
        note: "UK's largest job site, strong for agency roles.",
        build: (s) => `https://www.reed.co.uk/jobs/${q(s.keywords.trim().replace(/\s+/g, "-") || "jobs")}-jobs${s.location ? `-in-${q(s.location.trim().replace(/\s+/g, "-"))}` : ""}?sortBy=publicationDate${s.remoteOnly ? "&remoteOnly=true" : ""}`,
    },
    {
        id: "totaljobs",
        name: "Totaljobs",
        region: "UK",
        note: "Broad UK coverage across most sectors.",
        build: (s) => `https://www.totaljobs.com/jobs/${q(s.keywords.trim().replace(/\s+/g, "-") || "jobs")}${s.location ? `/in-${q(s.location.trim().replace(/\s+/g, "-"))}` : ""}?sort=2`,
    },
    {
        id: "cvlibrary",
        name: "CV-Library",
        region: "UK",
        note: "Good for mid-level roles outside London.",
        build: (s) => `https://www.cv-library.co.uk/search-jobs?q=${q(s.keywords)}&geo=${q(s.location)}${s.remoteOnly ? "&remote=1" : ""}&order-by=date`,
    },
    {
        id: "guardian",
        name: "Guardian Jobs",
        region: "UK",
        note: "Charity, public sector, media and education.",
        build: (s) => `https://jobs.theguardian.com/searchjobs/?Keywords=${q(s.keywords)}&LocationId=&RadialLocation=${q(s.location)}`,
    },
    {
        id: "civilservice",
        name: "Civil Service Jobs",
        region: "UK",
        note: "Every UK government department.",
        build: (s) => `https://www.civilservicejobs.service.gov.uk/csr/index.cgi?SID=&pageaction=searchbyquery&query=${q(s.keywords)}&location=${q(s.location)}`,
    },
    {
        id: "nhs",
        name: "NHS Jobs",
        region: "UK",
        note: "NHS and health roles, clinical and non-clinical.",
        build: (s) => `https://www.jobs.nhs.uk/candidate/search/results?keyword=${q(s.keywords)}&location=${q(s.location)}`,
    },
    {
        id: "charityjob",
        name: "CharityJob",
        region: "UK",
        note: "The main board for charity roles.",
        build: (s) => `https://www.charityjob.co.uk/jobs?keywords=${q(s.keywords)}&location=${q(s.location)}`,
    },
    {
        id: "glassdoor",
        name: "Glassdoor",
        region: "Global",
        note: "Read company reviews and salaries alongside the ads.",
        build: (s) => `https://www.glassdoor.co.uk/Job/jobs.htm?sc.keyword=${q(s.keywords)}&locKeyword=${q(s.location)}${s.remoteOnly ? "&remoteWorkType=1" : ""}`,
    },
    {
        id: "google",
        name: "Google Jobs",
        region: "Global",
        note: "Pulls ads from almost every board into one list.",
        build: (s) => `https://www.google.com/search?q=${q(`${s.keywords} jobs ${s.remoteOnly ? "remote" : s.location}`)}&ibp=htl;jobs`,
    },
    {
        id: "workinstartups",
        name: "Work In Startups",
        region: "UK",
        note: "UK startup roles, often unadvertised elsewhere.",
        build: (s) => `https://workinstartups.com/job-board/jobs/?keywords=${q(s.keywords)}`,
    },
    {
        id: "otta",
        name: "Welcome to the Jungle (Otta)",
        region: "Global",
        note: "Curated tech and startup roles with salaries shown.",
        build: (s) => `https://www.welcometothejungle.com/en/jobs?query=${q(s.keywords)}`,
    },
    {
        id: "remotive",
        name: "Remotive",
        region: "Remote",
        note: "Remote-only roles worldwide.",
        build: (s) => `https://remotive.com/remote-jobs?search=${q(s.keywords)}`,
    },
];

/**
 * A Google search that finds roles straight on company careers pages (Greenhouse, Lever, Ashby,
 * Workable): often posted there days before the big boards.
 */
export function atsGoogleSearch(s: BoardSearch): string {
    const sites = ["boards.greenhouse.io", "jobs.lever.co", "jobs.ashbyhq.com", "apply.workable.com", "careers.smartrecruiters.com"]
        .map((d) => `site:${d}`)
        .join(" OR ");
    const where = s.remoteOnly ? "remote" : s.location;
    return `https://www.google.com/search?q=${q(`(${sites}) "${s.keywords}"${where ? ` "${where}"` : ""}`)}&tbs=qdr:w`;
}

/** A LinkedIn people search for the hiring side of a role (recruiters, heads of team). */
export function linkedinPeopleSearch(company: string, role: string): string {
    return `https://www.linkedin.com/search/results/people/?keywords=${q(`${company} ${role} recruiter OR talent OR "head of"`)}`;
}
