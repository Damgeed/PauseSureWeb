import { pageMetadata } from "../page-metadata";
import { SiteFooter, SiteHeader } from "../site-shell";
import CheckerClient from "./checker-client";

export const metadata = pageMetadata({
  title: "Check a suspicious request",
  description: "A private, no-account check for suspicious messages, links, phone numbers, screenshots and QR destinations.",
  path: "/check",
});

export default function CheckPage() {
  return <><SiteHeader /><main className="checker-page" id="main-content" tabIndex={-1}>
    <section className="checker-intro">
      <p className="eyebrow"><span /> No account required · Live URL intelligence</p>
      <h1>Check before pressure decides for you.</h1>
      <p>Use this free check to combine explainable warning patterns with Google Web Risk intelligence for web addresses submitted directly, found in messages, or decoded from QR images.</p>
    </section>
    <CheckerClient />
    <section className="checker-boundary" aria-label="Checker limitations">
      <div><strong>What this covers</strong><p>Explain language and link-structure signals, decode supported QR images in your browser, check each bounded valid address against Google Web Risk, and give practical next steps.</p></div>
      <div><strong>Decision boundary</strong><p>Likely safe is not a guarantee. Verify identity and high-impact requests through an official route you locate independently.</p></div>
      <div><strong>If money or access moved</strong><p>Contact the relevant institution immediately using an official number or app you locate independently.</p></div>
    </section>
  </main><SiteFooter /></>;
}
