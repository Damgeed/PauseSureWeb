import { pageMetadata } from "../page-metadata";
import { SiteFooter, SiteHeader } from "../site-shell";
import CheckerClient from "./checker-client";

export const metadata = pageMetadata({
  title: "Check a suspicious request",
  description: "A no-account check for suspicious messages, links, phone numbers, screenshots, and QR destinations.",
  path: "/check",
});

export default function CheckPage() {
  return <><SiteHeader /><main className="checker-page" id="main-content" tabIndex={-1}>
    <section className="checker-intro">
      <p className="eyebrow"><span /> No account required · Secure check</p>
      <h1>Check before pressure decides for you.</h1>
      <p>Share only the details you choose. PauseSure explains warning signs and gives practical next steps without pretending uncertainty is proof of safety.</p>
    </section>
    <CheckerClient />
    <section className="checker-boundary" aria-label="Checker limitations">
      <div><strong>What this covers</strong><p>Read submitted screenshot text, review wording and web-address signals, decode supported QR images, compare valid addresses with Google Web Risk, and suggest safer next steps.</p></div>
      <div><strong>What it cannot prove</strong><p>A missing warning or threat-list match does not prove safety. The threat-list lookup does not open the submitted site or determine whether it currently responds, has been deactivated, or later returns. Verify identity and high-impact requests through an official route you locate independently.</p></div>
      <div><strong>If money or access moved</strong><p>Contact the relevant institution immediately using an official number or app you locate independently.</p></div>
    </section>
  </main><SiteFooter /></>;
}
