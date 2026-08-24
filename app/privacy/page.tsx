import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = { title: "Privacy", description: "How PauseSure is designed to handle personal data." };

export default function Privacy() {
  return <LegalShell title="Privacy should feel understandable." intro="This development-stage notice explains the privacy direction of PauseSure. It will be reconciled with the shipped app and App Store disclosures before release.">
    <p className="legal-date">Development notice · 24 August 2026</p>
    <div className="legal-notice">PauseSure is not yet generally available. Features, service providers, and data practices may change before release. We will publish a final, jurisdiction-appropriate privacy policy before collecting production user data.</div>
    <h2>Our core commitments</h2>
    <ul><li>Collect only what is needed for a feature you deliberately use.</li><li>Favor on-device processing where practical.</li><li>Do not sell personal data or use it for behavioral advertising.</li><li>Ask before sharing content with another person or service.</li><li>Show retention and deletion controls in plain language.</li></ul>
    <h2>Data handled on your device</h2>
    <p>The current product direction performs text and link rules, QR interpretation, screenshot text recognition, and supported speech transcription on the device. Saved checks, trusted contacts, and recovery progress are intended to remain locally protected unless you explicitly enable a connected feature.</p>
    <h2>Connected account and Circle data</h2>
    <p>If connected features ship, the service may process account identifiers, session records, device notification tokens, and end-to-end encrypted Circle or backup envelopes. The server is designed not to hold plaintext Circle messages or evidence. Exact categories and purposes will be listed before launch.</p>
    <h2>What we do not intend to do</h2>
    <p>We do not intend to sell personal information, build advertising profiles, silently upload your check content, or treat a failed reputation lookup as proof of safety.</p>
    <h2>Retention and deletion</h2>
    <p>Our engineering standard sets short expiry windows for sessions, invitations, Circle requests, disabled notification tokens, and security logs. Account deletion is designed to revoke authorization and remove linked server records. Final retention periods will be listed here and in the app.</p>
    <h2>Your choices</h2>
    <p>You will be able to decline optional access, remove trusted relationships, delete connected backups, export supported records, sign out, and request account deletion. Permission choices can also be changed in iOS Settings.</p>
    <h2>Contact</h2>
    <p>For privacy questions, email <a href="mailto:privacy@pausesure.com">privacy@pausesure.com</a>. Do not include passwords, codes, payment details, or sensitive scam evidence.</p>
  </LegalShell>;
}
