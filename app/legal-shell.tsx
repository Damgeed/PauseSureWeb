import { SiteFooter, SiteHeader } from "./site-shell";

export default function LegalShell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="legal-page">
      <SiteHeader />
      <section className="legal-hero"><h1>{title}</h1><p>{intro}</p></section>
      <article className="legal-shell">{children}</article>
      <SiteFooter />
    </main>
  );
}
