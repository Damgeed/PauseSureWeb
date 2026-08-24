import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pausesure.com"),
  applicationName: "PauseSure",
  title: { default: "PauseSure — Pause before pressure becomes a payment", template: "%s | PauseSure" },
  description: "Calm, privacy-conscious decision support for suspicious messages, links, calls, and requests.",
  keywords: ["scam protection", "fraud prevention", "family safety", "phishing checker", "iPhone safety"],
  openGraph: {
    title: "PauseSure — Pause before pressure becomes a payment",
    description: "A calm second opinion for suspicious messages, links, calls, and requests.",
    url: "https://pausesure.com",
    siteName: "PauseSure",
    images: [{ url: "/brand/pausesure-logo.png", width: 1254, height: 1254, alt: "PauseSure" }],
    locale: "en_US",
    type: "website",
  },
  twitter: { card: "summary", title: "PauseSure", description: "Pause before pressure becomes a payment.", images: ["/brand/pausesure-logo.png"] },
  robots: { index: true, follow: true },
  alternates: { canonical: "https://pausesure.com" },
  category: "technology",
  other: { "theme-color": "#031B49" },
  icons: { icon: "/brand/pausesure-logo.png", apple: "/brand/pausesure-logo.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "PauseSure",
    url: "https://pausesure.com",
    logo: "https://pausesure.com/brand/pausesure-logo.png",
    email: "hello@pausesure.com",
    description: "Decision-support technology for suspicious messages, links, calls, and requests.",
  };
  return <html lang="en"><body>{children}<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} /></body></html>;
}
