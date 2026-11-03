import { siteKeyStatus } from "@/lib/server/site-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
    return Response.json(siteKeyStatus());
}
