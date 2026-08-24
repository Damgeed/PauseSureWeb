import type { Metadata } from "next";
import Link from "next/link";
import { Arrow, SiteFooter, SiteHeader } from "../site-shell";

export const metadata: Metadata = { title: "Scam-Safety Resources", description: "Practical scam-safety guidance, verification habits, and official reporting resources from PauseSure.", alternates: { canonical: "/resources" } };

const guides = [
  ["Urgent bank call", "End the call. Open the official banking app or use the number printed on your card."],
  ["Unexpected payment request", "Do not use the supplied account or link. Confirm the request through a known contact method."],
  ["Account security alert", "Navigate to the service yourself. Do not share one-time codes or approve an unexpected login."],
  ["Family emergency message", "Pause before sending money. Call the person—or another relative—on a number you already know."],
  ["Government impersonator", "Government agencies do not demand immediate payment by gift card, crypto, wire, or payment app."],
  ["Investment opportunity", "Step away from private groups and pressure. Check registration and independently research the firm."],
];

export default function ResourcesPage() {
  return <><SiteHeader /><main className="inner-main" id="main-content" tabIndex={-1}>
    <section className="page-hero compact-page-hero resource-hero"><div className="page-hero-copy"><p className="eyebrow"><span /> Resources</p><h1>Practical guidance before—and after—a scam.</h1><p>Use these habits whether or not PauseSure is open. The safest verification route is usually one you find independently, away from the incoming message or caller.</p></div><div className="resource-emergency"><small>If money just moved</small><strong>Contact the bank or payment provider immediately.</strong><p>Use an official number or app. Ask about stopping or recalling the transaction, then secure affected accounts and preserve evidence.</p></div></section>
    <section className="section page-section"><div className="section-heading"><p className="section-kicker">Common situations</p><h2>Start with the safest next action.</h2></div><div className="guide-grid">{guides.map(([title, body], index)=><article key={title}><span>{String(index+1).padStart(2,"0")}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="official-help"><div><p className="section-kicker light">Official reporting</p><h2>Use primary sources, not search ads.</h2><p>These links go directly to U.S. government reporting resources. If you are elsewhere, use your national cybercrime, consumer protection, or police reporting channel.</p></div><div className="official-links"><a href="https://reportfraud.ftc.gov/" target="_blank" rel="noreferrer"><strong>FTC ReportFraud</strong><span>Report fraud, scams, and bad business practices ↗</span></a><a href="https://www.ic3.gov/" target="_blank" rel="noreferrer"><strong>FBI Internet Crime Complaint Center</strong><span>Report internet-enabled crime ↗</span></a><a href="https://www.identitytheft.gov/" target="_blank" rel="noreferrer"><strong>IdentityTheft.gov</strong><span>Create an identity-theft recovery plan ↗</span></a></div></section>
    <section className="section recovery-panel"><div><p className="section-kicker">Recovery order</p><h2>Move quickly without losing the evidence.</h2></div><ol><li><span>01</span>Contact the bank, card issuer, platform, or payment provider.</li><li><span>02</span>Secure email and financial accounts; change reused passwords.</li><li><span>03</span>Save messages, receipts, phone numbers, usernames, and transaction details.</li><li><span>04</span>Report through official channels and keep case numbers.</li></ol><Link className="text-link" href="/support">PauseSure support boundaries <Arrow /></Link></section>
    </main><SiteFooter /></>;
}
