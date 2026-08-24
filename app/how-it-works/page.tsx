import Link from "next/link";
import { pageMetadata } from "../page-metadata";
import { Arrow, SiteFooter, SiteHeader } from "../site-shell";

export const metadata = pageMetadata({ title: "How It Works", description: "See the PauseSure five-step protection flow from pressure interruption to independent verification and recovery.", path: "/how-it-works" });

const steps = [
  ["Pause", "Break contact with the pressure before replying, clicking, paying, or sharing."],
  ["Check", "Bring in only the message, link, screenshot, QR code, or audio you deliberately choose."],
  ["Understand", "See the specific signals behind the concern, alongside uncertainty and important limitations."],
  ["Verify", "Leave the incoming channel. Find the organization through its official app, card, statement, or known website."],
  ["Decide", "Continue only after independent confirmation—or involve a trusted person and start recovery steps."],
];

export default function HowItWorksPage() {
  return <><SiteHeader /><main className="inner-main" id="main-content" tabIndex={-1}>
    <section className="page-hero compact-page-hero"><div className="page-hero-copy"><p className="eyebrow"><span /> How it works</p><h1>Replace urgency with a repeatable process.</h1><p>PauseSure does not ask you to trust a score. It helps you create enough distance to verify the situation through a source the requester does not control.</p></div><div className="hero-principle"><small>The PauseSure principle</small><strong>The person creating urgency should never control how you verify the story.</strong></div></section>
    <section className="section process-section"><div className="process-rail" aria-hidden="true" />{steps.map(([title, body], index) => <article className="process-step" key={title}><div className="process-number">{String(index + 1).padStart(2, "0")}</div><div><p className="section-kicker">Step {index + 1}</p><h2>{title}</h2><p>{body}</p></div><span className="process-state">{index === 0 ? "Interrupt" : index === 4 ? "Act" : "Evaluate"}</span></article>)}</section>
    <section className="scenario-section"><div className="scenario-copy"><p className="section-kicker light">Example walkthrough</p><h2>A caller says your bank account is under attack.</h2><p>They know your name, create a deadline, and tell you not to speak to anyone. PauseSure turns those details into actions rather than a vague alarm.</p></div><div className="scenario-board"><div><span>Signal</span><strong>Secrecy + urgency + money movement</strong></div><div><span>Do not</span><strong>Transfer funds or call a number they provide</strong></div><div className="scenario-highlight"><span>Verify</span><strong>Open the bank&apos;s official app or use the number printed on your card</strong></div></div></section>
    <section className="section decision-cta"><div><p className="section-kicker">Designed for clear next steps</p><h2>See the product behind the process.</h2></div><Link className="button button-primary" href="/product">Explore PauseSure <Arrow /></Link></section>
    </main><SiteFooter /></>;
}
