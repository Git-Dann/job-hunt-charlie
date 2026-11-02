import type { JobListing } from "./types";

/**
 * "Save to Charlie's Job Platform" from any site. A bookmark button (desktop), the Android share
 * sheet, or a pasted link all land on /add-job with whatever could be read from the page.
 */

export interface SavePayload {
    url?: string;
    title?: string;
    company?: string;
    location?: string;
    salary?: string;
    description?: string;
}

const MAX_DESCRIPTION = 4000;

export function encodePayload(p: SavePayload): string {
    const json = JSON.stringify({ ...p, description: p.description?.slice(0, MAX_DESCRIPTION) });
    return btoa(unescape(encodeURIComponent(json))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodePayload(s: string | null): SavePayload | null {
    if (!s) return null;
    try {
        const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
        const json = decodeURIComponent(escape(atob(b64 + "===".slice((b64.length + 3) % 4))));
        const p = JSON.parse(json);
        return p && typeof p === "object" ? (p as SavePayload) : null;
    } catch {
        return null;
    }
}

/** From the Android share sheet: often just text containing a link. */
export function payloadFromShare(params: { url?: string | null; title?: string | null; text?: string | null }): SavePayload {
    const fromText = params.text?.match(/https?:\/\/\S+/)?.[0];
    const url = params.url || fromText || undefined;
    const text = params.text?.replace(fromText ?? "", "").trim();
    return { url, title: params.title?.trim() || undefined, description: text || undefined };
}

/** A best guess at title and company from a page title like "Events Manager - Acme | LinkedIn". */
export function splitPageTitle(title: string): { title: string; company?: string } {
    const cleaned = title.replace(/\s*[|·]\s*(LinkedIn|Indeed.*|Reed\.co\.uk|Totaljobs|CV-Library|Glassdoor|Guardian Jobs)\s*$/i, "").trim();
    const m = cleaned.match(/^(.+?)\s+(?:-|–|—|at|\|)\s+(.+?)$/);
    return m ? { title: m[1].trim(), company: m[2].replace(/\s+(jobs?|careers?)$/i, "").trim() } : { title: cleaned };
}

/**
 * The bookmarklet. Runs on the job page itself, so it can read the page's own job data (the
 * schema.org JobPosting most job sites include) even on sites that block automatic reading.
 */
export function bookmarkletSource(origin: string): string {
    const code = `(()=>{const o=${JSON.stringify(origin)};let p={url:location.href,title:document.title};const s=window.getSelection&&String(window.getSelection()).trim();try{for(const el of document.querySelectorAll('script[type="application/ld+json"]')){let d=JSON.parse(el.textContent);const all=[].concat(d,d&&d['@graph']||[]);const j=all.find(x=>x&&(x['@type']==='JobPosting'||(Array.isArray(x['@type'])&&x['@type'].includes('JobPosting'))));if(j){const a=[].concat(j.jobLocation||[])[0];const ad=a&&a.address||{};const t=new DOMParser().parseFromString(String(j.description||''),'text/html').body;p={url:j.url||location.href,title:j.title,company:(j.hiringOrganization&&j.hiringOrganization.name)||'',location:[ad.addressLocality,ad.addressRegion].filter(Boolean).join(', '),description:(t.innerText||t.textContent||'').trim()};break}}}catch(e){}if(s)p.description=s;if(!p.description){const m=document.querySelector('main,article,[class*=description],[id*=description]');if(m)p.description=(m.innerText||'').trim()}p.description=(p.description||'').slice(0,4000);const b=btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');window.open(o+'/add-job?d='+b,'_blank')})()`;
    return `javascript:${encodeURIComponent(code)}`;
}

export function payloadToListing(p: SavePayload, id: string): JobListing {
    const guessed = p.title && !p.company ? splitPageTitle(p.title) : { title: p.title ?? "", company: p.company };
    let source = "Saved from the web";
    try {
        if (p.url) source = new URL(p.url).hostname.replace(/^www\./, "");
    } catch {
        /* keep default */
    }
    return {
        id,
        title: guessed.title || "Untitled job",
        company: p.company || guessed.company || "",
        location: p.location || undefined,
        salary: p.salary || undefined,
        url: p.url ?? "",
        source,
        description: p.description || undefined,
    };
}
