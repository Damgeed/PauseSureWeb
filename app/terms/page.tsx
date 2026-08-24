import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = { title: "Terms", description: "Development-stage terms for PauseSure website use." };

export default function Terms() {
  return <LegalShell title="Website terms" intro="These interim terms cover this pre-release website. Final product terms will be published before the app is offered to consumers.">
    <p className="legal-date">Development terms · 24 August 2026</p>
    <div className="legal-notice">PauseSure is in development. This website is informational and does not offer a released security service, paid subscription, or guarantee of protection.</div>
    <h2>Informational use</h2><p>You may use this website for personal, lawful information. Content may change as the product, research, legal review, and security controls mature.</p>
    <h2>No safety guarantee</h2><p>Scam detection is uncertain. PauseSure cannot guarantee that any communication, identity, link, payment, or transaction is safe or fraudulent. Do not rely on this website as your only basis for a financial, legal, security, or emergency decision.</p>
    <h2>Use official help</h2><p>If you believe money, credentials, an account, or personal safety is at risk, stop interacting with the suspicious party. Contact your bank, the affected service, police, or emergency services through contact information you find independently.</p>
    <h2>Intellectual property</h2><p>The PauseSure name, logo, visual identity, original website content, and software are protected by applicable intellectual-property laws. Third-party marks belong to their respective owners.</p>
    <h2>External sources</h2><p>Links to government, platform, and research sources are provided for context. PauseSure does not control their content or availability.</p>
    <h2>Contact</h2><p>Questions about these interim terms may be sent to <a href="mailto:legal@pausesure.com">legal@pausesure.com</a>. A full governing-law, dispute, subscription, eligibility, and acceptable-use framework will be added before consumer release.</p>
  </LegalShell>;
}
