import { pageMetadata } from "../page-metadata";
import { SiteFooter, SiteHeader } from "../site-shell";
import CheckerClient from "./checker-client";

export const metadata = pageMetadata({
  title: "Check a suspicious request",
  description: "A private, no-account first check for suspicious messages, links, phone numbers, screenshots and QR destinations.",
  path: "/check",
});

export default function CheckPage() {
  return <><SiteHeader /><main className="checker-page" id="main-content" tabIndex={-1}>
    <section className="checker-intro">
      <p className="eyebrow"><span /> No account required · Content stays in your browser</p>
      <h1>Check before pressure decides for you.</h1>
      <p>Use this free first check to identify visible warning patterns. PauseSure provides decision support—not a guarantee, identity proof, or live reputation verdict.</p>
    </section>
    <CheckerClient />
    <section className="checker-boundary" aria-label="Checker limitations">
      <div><strong>What this can do</strong><p>Explain visible language and link-structure signals, decode supported QR images locally, and give safer next steps.</p></div>
      <div><strong>What this cannot do</strong><p>Prove a sender’s identity, guarantee safety, recover money automatically, or replace your bank, carrier, police, or emergency services.</p></div>
      <div><strong>If money or access moved</strong><p>Contact the relevant institution immediately using an official number or app you locate independently.</p></div>
    </section>
  </main><SiteFooter /></>;
}
