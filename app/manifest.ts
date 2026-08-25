import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PauseSure",
    short_name: "PauseSure",
    description: "Calm decision support for suspicious messages, links, calls, and requests.",
    start_url: "/",
    display: "standalone",
    background_color: "#fbfbf8",
    theme_color: "#031b49",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
