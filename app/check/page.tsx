import { pageMetadata } from "../page-metadata";
import { SiteFooter, SiteHeader } from "../site-shell";
import CheckerClient from "./checker-client";

export const metadata = pageMetadata({
  title: "Check a suspicious request",
  description: "A no-account check for suspicious messages, links, phone numbers, screenshots and QR destinations using PauseSure's shared analysis engine.",
  path: "/check",
});

export default function CheckPage() {
  return <><SiteHeader /><main className="checker-page" id="main-content" tabIndex={-1}>
    <section className="checker-intro">
      <p className="eyebrow"><span /> No account required · Production analysis engine</p>
      <h1>Check before pressure decides for you.</h1>
      <p>Use this free check to review suspicious requests with PauseSure’s shared fraud-analysis engine and configured destination intelligence.</p>
    </section>
    <CheckerClient />
    <section className="checker-boundary" aria-label="Checker limitations">
      <div><strong>What this covers</strong><p>Recognize screenshot text through protected server OCR, explain language and link-structure signals through the shared PauseSure engine, decode supported QR images, check bounded valid addresses through Google Web Risk, and give practical next steps.</p></div>
      <div><strong>Decision boundary</strong><p>A missing warning or threat-list match does not prove safety. The threat-list lookup does not open the submitted site or determine whether it currently responds, has been deactivated, or later returns. Verify identity and high-impact requests through an official route you locate independently.</p></div>
      <div><strong>If money or access moved</strong><p>Contact the relevant institution immediately using an official number or app you locate independently.</p></div>
    </section>
  </main><SiteFooter /></>;
}
