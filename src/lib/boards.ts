/** One-tap searches on the big job boards. Nothing is scraped: these open the board's own search. */

export interface BoardSearch {
    keywords: string;
    location: string;
    remoteOnly: boolean;
}

export interface Board {
    id: string;
    name: string;
    /** Used on the button: "Search Indeed". */
    short: string;
    region: "UK" | "Global" | "Remote";
    /** The site's jobs page, used when nothing has been typed yet. */
    home: string;
    note: string;
    build: (s: BoardSearch) => string;
}

const q = encodeURIComponent;

export const BOARDS: Board[] = [
    {
        id: "linkedin",
        name: "LinkedIn Jobs",
        short: "LinkedIn",
        home: "https://www.linkedin.com/jobs/",
        region: "Global",
        note: "Biggest network. Turn on job alerts once a search looks right.",
        build: (s) =>
            `https://www.linkedin.com/jobs/search/?keywords=${q(s.keywords)}&location=${q(s.location || "United Kingdom")}${s.remoteOnly ? "&f_WT=2" : ""}&sortBy=DD`,
    },
    {
        id: "indeed",
        name: "Indeed UK",
        short: "Indeed",
        home: "https://uk.indeed.com/",
        region: "UK",
        note: "Huge volume, lots of direct employer ads.",
        build: (s) => `https://uk.indeed.com/jobs?q=${q(s.keywords + (s.remoteOnly ? " remote" : ""))}&l=${q(s.location)}&sort=date`,
    },
    {
        id: "reed",
        name: "Reed",
        short: "Reed",
        home: "https://www.reed.co.uk/jobs",
        region: "UK",
        note: "UK's largest job site, strong for agency roles.",
        build: (s) => `https://www.reed.co.uk/jobs/${q(s.keywords.trim().replace(/\s+/g, "-") || "jobs")}-jobs${s.location ? `-in-${q(s.location.trim().replace(/\s+/g, "-"))}` : ""}?sortBy=publicationDate${s.remoteOnly ? "&remoteOnly=true" : ""}`,
    },
    {
        id: "totaljobs",
        name: "Totaljobs",
        short: "Totaljobs",
        home: "https://www.totaljobs.com/",
        region: "UK",
        note: "Broad UK coverage across most sectors.",
        build: (s) => `https://www.totaljobs.com/jobs/${q(s.keywords.trim().replace(/\s+/g, "-") || "jobs")}${s.location ? `/in-${q(s.location.trim().replace(/\s+/g, "-"))}` : ""}?sort=2`,
    },
    {
        id: "cvlibrary",
        name: "CV-Library",
        short: "CV-Library",
        home: "https://www.cv-library.co.uk/",
        region: "UK",
        note: "Good for mid-level roles outside London.",
        build: (s) => `https://www.cv-library.co.uk/search-jobs?q=${q(s.keywords)}&geo=${q(s.location)}${s.remoteOnly ? "&remote=1" : ""}&order-by=date`,
    },
    {
        id: "guardian",
        name: "Guardian Jobs",
        short: "Guardian Jobs",
        home: "https://jobs.theguardian.com/",
        region: "UK",
        note: "Charity, public sector, media and education.",
        build: (s) => `https://jobs.theguardian.com/searchjobs/?Keywords=${q(s.keywords)}&LocationId=&RadialLocation=${q(s.location)}`,
    },
    {
        id: "civilservice",
        name: "Civil Service Jobs",
        short: "Civil Service",
        home: "https://www.civilservicejobs.service.gov.uk/",
        region: "UK",
        note: "Every UK government department.",
        build: (s) => `https://www.civilservicejobs.service.gov.uk/csr/index.cgi?SID=&pageaction=searchbyquery&query=${q(s.keywords)}&location=${q(s.location)}`,
    },
    {
        id: "nhs",
        name: "NHS Jobs",
        short: "NHS Jobs",
        home: "https://www.jobs.nhs.uk/",
        region: "UK",
        note: "NHS and health roles, clinical and non-clinical.",
        build: (s) => `https://www.jobs.nhs.uk/candidate/search/results?keyword=${q(s.keywords)}&location=${q(s.location)}`,
    },
    {
        id: "charityjob",
        name: "CharityJob",
        short: "CharityJob",
        home: "https://www.charityjob.co.uk/jobs",
        region: "UK",
        note: "The main board for charity roles.",
        build: (s) => `https://www.charityjob.co.uk/jobs?keywords=${q(s.keywords)}&location=${q(s.location)}`,
    },
    {
        id: "glassdoor",
        name: "Glassdoor",
        short: "Glassdoor",
        home: "https://www.glassdoor.co.uk/Job/index.htm",
        region: "Global",
        note: "Read company reviews and salaries alongside the ads.",
        build: (s) => `https://www.glassdoor.co.uk/Job/jobs.htm?sc.keyword=${q(s.keywords)}&locKeyword=${q(s.location)}${s.remoteOnly ? "&remoteWorkType=1" : ""}`,
    },
    {
        id: "google",
        name: "Google Jobs",
        short: "Google Jobs",
        home: "https://www.google.com/search?q=jobs+near+me&ibp=htl;jobs",
        region: "Global",
        note: "Pulls ads from almost every board into one list.",
        build: (s) => `https://www.google.com/search?q=${q(`${s.keywords} jobs ${s.remoteOnly ? "remote" : s.location}`)}&ibp=htl;jobs`,
    },
    {
        id: "workinstartups",
        name: "Work In Startups",
        short: "Work In Startups",
        home: "https://workinstartups.com/job-board/",
        region: "UK",
        note: "UK startup roles, often unadvertised elsewhere.",
        build: (s) => `https://workinstartups.com/job-board/jobs/?keywords=${q(s.keywords)}`,
    },
    {
        id: "otta",
        name: "Welcome to the Jungle (Otta)",
        short: "Welcome to the Jungle",
        home: "https://www.welcometothejungle.com/en/jobs",
        region: "Global",
        note: "Curated tech and startup roles with salaries shown.",
        build: (s) => `https://www.welcometothejungle.com/en/jobs?query=${q(s.keywords)}`,
    },
    {
        id: "remotive",
        name: "Remotive",
        short: "Remotive",
        home: "https://remotive.com/remote-jobs",
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

/** Always a real link: the search for what she typed, or the site's jobs page if nothing yet. */
export function boardUrl(b: Board, s: BoardSearch): string {
    return s.keywords.trim() ? b.build(s) : b.home;
}

export const CAREERS_SITES_HOME = "https://www.google.com/search?q=site%3Aboards.greenhouse.io+OR+site%3Ajobs.lever.co+OR+site%3Ajobs.ashbyhq.com&tbs=qdr:w";
