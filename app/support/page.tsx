import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = { title: "Support", description: "PauseSure help and official next steps." };

export default function Support() {
  return <LegalShell title="Get the right help." intro="PauseSure is still in development. These routes help you reach the right official service now and contact the product team without exposing sensitive information.">
    <p className="legal-date">Pre-launch support · 24 August 2026</p>
    <div className="legal-notice"><strong>Immediate danger?</strong> Contact your local emergency services. If money moved, call your bank using the number on your card or official website. Do not continue a suspicious call while finding the number.</div>
    <div className="support-cards"><div className="support-card"><h3>Product questions</h3><p>Email <a href="mailto:hello@pausesure.com">hello@pausesure.com</a> for launch and product questions.</p></div><div className="support-card"><h3>Security reports</h3><p>Email <a href="mailto:security@pausesure.com">security@pausesure.com</a> or use private vulnerability reporting.</p></div></div>
    <h2>Before you send us anything</h2><p>Do not email passwords, one-time codes, government identifiers, bank or card numbers, recovery phrases, private keys, full account statements, or unredacted scam evidence. PauseSure will never ask you to move money to “protect” it.</p>
    <h2>If you suspect a scam</h2><ol><li>Stop replying, clicking, calling, or paying.</li><li>Preserve the message and transaction details without forwarding secrets.</li><li>Open the organization&apos;s official app or type its known address yourself.</li><li>Contact your bank immediately if any money or credentials were shared.</li><li>Report the incident through your country&apos;s official fraud-reporting service.</li></ol>
    <h2>Availability</h2><p>The iPhone app is in active development and testing. This website will be updated with verified App Store availability when the privacy, security, and operational release gates are complete.</p>
  </LegalShell>;
}
