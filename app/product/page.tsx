import Link from "next/link";
import { pageMetadata } from "../page-metadata";
import { Arrow, ReleaseBanner, SiteFooter, SiteHeader, StaticImage } from "../site-shell";

export const metadata = pageMetadata({
  title: "Product",
  description: "Explore PauseSure's decision-support tools for suspicious messages, links, phone numbers, QR codes, screenshots, after-call evidence, protection setup, and trusted support.",
  path: "/product",
});

const inputs = [
  ["Message", "Paste a text or email, review pressure, impersonation, payment, and secrecy signals, and check each bounded web address without sending the surrounding message."],
  ["Link", "Inspect the address structure, check the bounded address against Google Web Risk, and verify high-impact requests through an official channel you find independently."],
  ["Phone number", "Check whether the format is complete and get a clear reminder that caller ID can be spoofed. PauseSure does not claim licensed caller reputation until that data source is connected."],
  ["Screenshot", "Select a supported screenshot for server text recognition, then run the extracted evidence through the same shared PauseSure fraud engine and Google Web Risk checks used for other inputs. Pasted wording remains available as a fallback."],
  ["QR code", "Read a code before following it, then separate the destination from the story around it."],
  ["Audio or voicemail", "In the iPhone app, import a supported file you select and review its transcript in the same calm workflow. PauseSure does not record live cellular calls."],
  ["Protection setup", "Review the iPhone settings and readiness states PauseSure can inspect, with manual checks clearly identified."],
  ["Trusted Circle", "Ask a chosen person for a second opinion without creating a surveillance dashboard."],
];

export default function ProductPage() {
  return (
    <>
      <SiteHeader />
      <main className="inner-main" id="main-content" tabIndex={-1}>
      <section className="page-hero product-page-hero">
        <div className="page-hero-copy">
          <p className="eyebrow"><span /> Product</p>
          <h1>One calm place to check what feels off.</h1>
          <p>PauseSure brings suspicious messages, links, phone numbers, screenshots, QR codes, selected after-call evidence, and trusted support into one decision process—without pretending uncertainty is certainty.</p>
          <div className="hero-actions"><Link className="button button-primary" href="/how-it-works">See how it works <Arrow /></Link><Link className="button button-secondary" href="/safety">Safety by design</Link></div>
        </div>
        <div className="decision-console" aria-label="Example PauseSure review">
          <div className="console-top"><span className="status-dot" /> PauseSure decision flow <small>Product example</small></div>
          <div className="console-message"><small>Suspicious request</small><strong>“Move your savings now to keep the account safe.”</strong></div>
          <div className="console-signal"><span>01</span><div><strong>High-pressure timing</strong><p>The request tries to remove your time to verify.</p></div></div>
          <div className="console-signal"><span>02</span><div><strong>Unusual money movement</strong><p>A legitimate fraud team should not ask you to move funds to a “safe” account.</p></div></div>
          <div className="console-next"><small>Safer next step</small><strong>End the conversation. Open the bank&apos;s official app or call the number on your card.</strong></div>
        </div>
      </section>

      <section className="metric-band">
        <div><strong>6</strong><span>check formats across web and iPhone</span></div><div><strong>1</strong><span>consistent action language</span></div><div><strong>0</strong><span>advertising or data selling</span></div><div><strong>You</strong><span>control what gets shared</span></div>
      </section>

      <section className="section page-section">
        <div className="section-heading"><p className="section-kicker">A connected toolkit</p><h2>Built around the moment a decision changes.</h2><p>Each tool feeds the same sequence: pause, inspect, verify elsewhere, involve someone if useful, and recover quickly if something happened.</p></div>
        <div className="capability-grid">
          {inputs.map(([title, body], index) => <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></article>)}
        </div>
      </section>

      <section className="section product-family-section">
        <div className="product-family-copy"><p className="section-kicker">Two ways to use PauseSure</p><h2>Protect yourself or support someone you trust.</h2><p>The same product can reinforce personal independence or make a second opinion easier. Permissions remain understandable, selective, and reversible.</p><Link className="text-link" href="/how-it-works">Follow the full protection flow <Arrow /></Link></div>
        <div className="product-family-images">
          <figure><StaticImage src="/brand/protect-myself.png" width={900} height={1080} alt="A woman reviewing a message on her phone" /><figcaption><strong>For me</strong><span>Stay in control</span></figcaption></figure>
          <figure><StaticImage src="/brand/help-someone.png" width={1200} height={800} alt="A woman helping an older family member review a phone" /><figcaption><strong>For someone I trust</strong><span>Help without taking over</span></figcaption></figure>
        </div>
      </section>
      <ReleaseBanner />
      </main>
      <SiteFooter />
    </>
  );
}
