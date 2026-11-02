/* eslint-disable @typescript-eslint/no-explicit-any */

/** Companies House (UK public register). Parsers are pure so they're tested with fixtures. */

export interface CompanyMatch {
    number: string;
    name: string;
    status: string;
    created?: string;
    address?: string;
    type?: string;
}

export interface CompanyProfile extends CompanyMatch {
    sicCodes: string[];
    accountsType?: string;
    sizeHint?: string;
    accountsOverdue: boolean;
    confirmationOverdue: boolean;
    insolvencyHistory: boolean;
    activeOfficers?: number;
    url: string;
    ageYears?: number;
}

export const parseCompanySearch = (d: any): CompanyMatch[] =>
    (d?.items ?? []).map((i: any) => ({
        number: i.company_number,
        name: i.title,
        status: i.company_status ?? "unknown",
        created: i.date_of_creation,
        address: i.address_snippet,
        type: i.company_type,
    }));

/** What the type of accounts filed says about size (Companies Act thresholds). */
export function sizeFromAccounts(type?: string): string | undefined {
    switch (type) {
        case "micro-entity":
            return "Micro business (roughly up to 10 staff)";
        case "small":
        case "total-exemption-small":
        case "total-exemption-full":
        case "abridged":
            return "Small business (roughly up to 50 staff)";
        case "medium":
            return "Medium business (roughly up to 250 staff)";
        case "full":
        case "group":
            return "Larger company or group (files full accounts)";
        case "dormant":
            return "Dormant — not trading";
        default:
            return undefined;
    }
}

export function parseCompanyProfile(d: any, officers: any, now: Date): CompanyProfile {
    const created = d?.date_of_creation as string | undefined;
    const accountsType = d?.accounts?.last_accounts?.type;
    return {
        number: d.company_number,
        name: d.company_name,
        status: d.company_status ?? "unknown",
        created,
        address: [d?.registered_office_address?.address_line_1, d?.registered_office_address?.locality, d?.registered_office_address?.postal_code].filter(Boolean).join(", "),
        type: d.type,
        sicCodes: d.sic_codes ?? [],
        accountsType,
        sizeHint: sizeFromAccounts(accountsType),
        accountsOverdue: Boolean(d?.accounts?.overdue),
        confirmationOverdue: Boolean(d?.confirmation_statement?.overdue),
        insolvencyHistory: Boolean(d?.has_insolvency_history),
        activeOfficers: typeof officers?.active_count === "number" ? officers.active_count : undefined,
        url: `https://find-and-update.company-information.service.gov.uk/company/${d.company_number}`,
        ageYears: created ? Math.floor((now.getTime() - new Date(created).getTime()) / (365.25 * 86_400_000)) : undefined,
    };
}

/** Plain-English things worth knowing before applying. */
export function companyFlags(p: CompanyProfile): { tone: "good" | "warn" | "bad"; text: string }[] {
    const out: { tone: "good" | "warn" | "bad"; text: string }[] = [];
    if (p.status === "active") out.push({ tone: "good", text: "Active company" });
    else out.push({ tone: "bad", text: `Status: ${p.status.replace(/-/g, " ")}` });
    if (p.ageYears !== undefined) out.push({ tone: p.ageYears < 2 ? "warn" : "good", text: p.ageYears < 1 ? "Set up less than a year ago" : `${p.ageYears} year${p.ageYears === 1 ? "" : "s"} old` });
    if (p.accountsOverdue) out.push({ tone: "bad", text: "Accounts are overdue" });
    if (p.confirmationOverdue) out.push({ tone: "warn", text: "Confirmation statement is overdue" });
    if (p.insolvencyHistory) out.push({ tone: "bad", text: "Has insolvency history" });
    return out;
}
