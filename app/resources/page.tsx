import Link from "next/link";
import { pageMetadata } from "../page-metadata";
import { Arrow, SiteFooter, SiteHeader } from "../site-shell";

export const metadata = pageMetadata({ title: "Scam-Safety Resources", description: "Practical scam-safety guidance, verification habits, and official reporting resources from PauseSure.", path: "/resources" });

const guides = [
  ["Urgent bank call", "End the call. Open the official banking app or use the number printed on your card."],
  ["Unexpected payment request", "Do not use the supplied account or link. Confirm the request through a known contact method."],
  ["Account security alert", "Navigate to the service yourself. Do not share one-time codes or approve an unexpected login."],
  ["Family emergency message", "Pause before sending money. Call the person—or another relative—on a number you already know."],
  ["Government impersonator", "Government agencies do not demand immediate payment by gift card, crypto, wire, or payment app."],
  ["Investment opportunity", "Step away from private groups and pressure. Check registration and independently research the firm."],
];

const officialResources = [
  {
    name: "United States — FTC ReportFraud",
    description: "Report fraud, scams, and bad business practices",
    href: "https://reportfraud.ftc.gov/",
  },
  {
    name: "United States — FBI IC3",
    description: "Report internet-enabled crime and cyber fraud",
    href: "https://www.ic3.gov/",
  },
  {
    name: "United States — IdentityTheft.gov",
    description: "Create an identity-theft recovery plan",
    href: "https://www.identitytheft.gov/",
  },
  {
    name: "Singapore — ScamShield check",
    description: "Check suspicious messages, links, or numbers and find the 24/7 1799 helpline",
    href: "https://www.scamshield.gov.sg/check-for-scams/",
  },
  {
    name: "Singapore — ScamShield report",
    description: "Submit a suspected scam encounter for authority review",
    href: "https://www.scamshield.gov.sg/about-scamshield/scamshield-app/submit-a-scam-report/",
  },
  {
    name: "Singapore — I’ve been scammed",
    description: "Official steps for contacting banks, police, platforms, and securing accounts",
    href: "https://www.scamshield.gov.sg/i-have-been-scammed/",
  },
  {
    name: "UK — Report Fraud",
    description: "Report cyber crime and fraud in England, Wales, or Northern Ireland",
    href: "https://www.reportfraud.police.uk/reporting-a-fraud/",
  },
  {
    name: "Canada — Canadian Anti-Fraud Centre",
    description: "Report fraud and cybercrime to Canada’s national anti-fraud service",
    href: "https://antifraudcentre-centreantifraude.ca/report-signalez-eng.htm",
  },
  {
    name: "Canada — Victim recovery guidance",
    description: "Official steps after fraud, including banks, police, identity protection, and reporting",
    href: "https://antifraudcentre-centreantifraude.ca/scams-fraudes/victim-victime-eng.htm",
  },
  {
    name: "Australia — Scamwatch",
    description: "Report suspicious contact, activity, websites, and emerging scams",
    href: "https://www.scamwatch.gov.au/report-a-scam",
  },
];

export default function ResourcesPage() {
  return <><SiteHeader /><main className="inner-main" id="main-content" tabIndex={-1}>
    <section className="page-hero compact-page-hero resource-hero"><div className="page-hero-copy"><p className="eyebrow"><span /> Resources</p><h1>Practical guidance before—and after—a scam.</h1><p>Use these habits with or without PauseSure. The safest verification route is usually one you find independently, away from the incoming message or caller.</p></div><div className="resource-emergency"><small>If money just moved</small><strong>Contact the bank or payment provider immediately.</strong><p>Use an official number or app. Ask about stopping or recalling the transaction, then secure affected accounts and preserve evidence.</p></div></section>
    <section className="section page-section"><div className="section-heading"><p className="section-kicker">Common situations</p><h2>Start with the safest next action.</h2></div><div className="guide-grid">{guides.map(([title, body], index)=><article key={title}><span>{String(index+1).padStart(2,"0")}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
    <section className="official-help"><div><p className="section-kicker light">Official reporting</p><h2>Use primary sources, not search ads.</h2><p>These links go directly to national government or law-enforcement-backed scam, fraud, cybercrime, and recovery services. They are not an exhaustive list for every country; where your country is not listed, use your national police, cybercrime, consumer-protection, or financial-regulator website that you navigate to independently.</p><p>In Scotland, report fraud through Police Scotland on 101. If anyone is in immediate physical danger, use the emergency number for your location.</p></div><div className="official-links">{officialResources.map((resource)=><a key={resource.href} href={resource.href} target="_blank" rel="noreferrer"><strong>{resource.name}</strong><span>{resource.description} ↗<span className="sr-only"> (opens in a new tab)</span></span></a>)}</div></section>
    <section className="section recovery-panel"><div><p className="section-kicker">Recovery order</p><h2>Move quickly without losing the evidence.</h2></div><ol><li><span>01</span>Contact the bank, card issuer, platform, or payment provider.</li><li><span>02</span>Secure email and financial accounts; change reused passwords.</li><li><span>03</span>Save messages, receipts, phone numbers, usernames, and transaction details.</li><li><span>04</span>Report through official channels and keep case numbers.</li></ol><Link className="text-link" href="/support">PauseSure support boundaries <Arrow /></Link></section>
    </main><SiteFooter /></>;
}
