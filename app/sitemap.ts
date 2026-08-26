import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const primary = ["", "/check", "/product", "/how-it-works", "/safety", "/resources", "/company"];
  const support = ["/privacy", "/security", "/terms", "/support", "/account-deletion"];
  return [...primary, ...support].map((route) => ({
    url: `https://pausesure.com${route}`,
    lastModified: new Date("2026-08-26"),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : primary.includes(route) ? 0.85 : 0.6,
  }));
}
