import { JobDetailView } from "@/components/views/job-detail-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <JobDetailView id={id} />;
}
