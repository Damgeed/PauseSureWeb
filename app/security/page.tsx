import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = { title: "Security", description: "PauseSure security architecture, limits, and vulnerability reporting." };

export default function Security() {
  return <LegalShell title="Security is a release gate." intro="PauseSure is being built around least privilege, protected local storage, encrypted connected data, strict validation, and honest product limits.">
    <p className="legal-date">Security overview · Updated 24 August 2026</p>
    <div className="legal-notice">This page describes the current engineering direction—not a certification or guarantee. Independent testing and production configuration reviews are required before general release.</div>
    <h2>Current protection model</h2>
    <ul><li>On-device analysis for current text, link, QR, screenshot OCR, and supported audio flows.</li><li>Complete iOS file protection for saved local records and exports.</li><li>Narrow Apple pickers and share surfaces instead of broad collection where possible.</li><li>Server request schemas, size limits, rate limiting, security headers, and redacted authorization logs.</li><li>Opaque session and invitation tokens stored as cryptographic hashes.</li><li>AES-256-GCM protection for Apple and notification credentials at rest.</li><li>Versioned Curve25519/ChaChaPoly envelopes for connected Circle payloads.</li></ul>
    <h2>What the server should not see</h2>
    <p>Connected Circle messages and evidence are designed to be encrypted before upload. Push notifications carry a generic event notice rather than user-supplied content. Application logs must not contain bearer credentials, personal case content, raw links, phone numbers, or provider payloads.</p>
    <h2>Operational controls before release</h2>
    <ol><li>Threat-model identity, Circle, backup, recovery, and payment-adjacent flows.</li><li>Complete automated dependency, secret, static-analysis, migration, retention, and account-deletion checks.</li><li>Use protected production secrets, database backups, restore drills, monitoring, and incident response.</li><li>Reconcile the Apple privacy manifest, App Store privacy disclosure, this website, and the actual network behavior.</li><li>Commission independent mobile/API penetration testing for the production build.</li></ol>
    <h2>Responsible disclosure</h2>
    <p>Please do not post exploit details or personal data publicly. Report a potential vulnerability through the repository&apos;s private vulnerability reporting channel or email <a href="mailto:security@pausesure.com">security@pausesure.com</a>. We will publish a response target once the monitored mailbox is operational.</p>
    <h2>Safety boundary</h2>
    <p>PauseSure is decision support and cannot guarantee that a person, message, link, or transaction is safe. If money or credentials may be at risk, stop contact and reach the relevant organization through an official channel you locate independently.</p>
  </LegalShell>;
}
