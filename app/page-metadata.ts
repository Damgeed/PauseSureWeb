import type { Metadata } from "next";

const origin = "https://pausesure.com";

export function pageMetadata({ title, description, path }: { title: string; description: string; path: `/${string}` }): Metadata {
  const canonical = `${origin}${path}`;
  const socialTitle = `${title} | PauseSure`;

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: socialTitle,
      description,
      url: canonical,
      siteName: "PauseSure",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "PauseSure — Pause before pressure becomes a payment" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description,
      images: ["/og.png"],
    },
  };
}
