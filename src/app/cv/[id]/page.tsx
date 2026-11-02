import { CvVersionView } from "@/components/views/cv-version-view";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    return <CvVersionView id={id} />;
}
