import type { MetadataRoute } from "next";

/** Makes the site installable, and puts "Charlie's Jobs" in the Android share menu. */
export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Charlie's Job Platform",
        short_name: "Charlie's Jobs",
        description: "Find jobs, track applications, tailor your CV and prepare for interviews.",
        start_url: "/",
        display: "standalone",
        background_color: "#ffffff",
        theme_color: "#7f56d9",
        icons: [{ src: "/icon.png", sizes: "512x512", type: "image/png" }],
        share_target: { action: "/add-job", method: "GET", params: { title: "title", text: "text", url: "url" } },
    } as MetadataRoute.Manifest;
}
