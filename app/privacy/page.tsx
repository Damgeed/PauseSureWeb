import LegalShell from "../legal-shell";
import { pageMetadata } from "../page-metadata";

export const metadata = pageMetadata({ title: "Privacy Notice", description: "How PauseSure handles personal data on its website and during authorized product testing.", path: "/privacy" });

export default function Privacy() {
  return <LegalShell title="Privacy should feel understandable." intro="This Privacy Notice explains how PauseSure handles personal data on this website and during authorized testing of the iPhone app.">
    <p className="legal-date">Privacy Notice · Effective 25 August 2026</p>
    <div className="legal-notice">The PauseSure iPhone app is not yet listed on the App Store. The public checker processes the text, link, phone number, screenshot, or QR image you choose inside your browser and does not upload that content. This website does not provide account registration, run behavioral advertising, or sell personal data. App-specific disclosures will be updated before a public download link is posted and must match the released build.</div>
    <h2>Website information</h2>
    <p>When you visit pausesure.com, the systems that deliver and protect the website may process standard request information such as IP address, browser and device details, requested pages, timestamps, and security diagnostics. The hosting security layer may set an essential bot-management cookie to distinguish legitimate traffic and protect the service. PauseSure does not add third-party advertising pixels or use that cookie for behavioral advertising.</p>
    <h2>When you contact us</h2>
    <p>If you email PauseSure, we receive the address, message, and attachments you choose to send. Use the published product, privacy, legal, or security address for the relevant request. Do not email passwords, verification codes, payment details, government identifiers, or unredacted scam evidence.</p>
    <h2>Optional content-free analytics</h2>
    <p>The public checker offers an optional, off-by-default control to share aggregate product events. If you enable it, PauseSure stores counts such as the type of check completed, broad result category, and next-action category. The analytics event does not contain the entry you checked, URLs, phone numbers, images, contact information, account or session identifiers, device identifiers, IP addresses, or free-form text. Daily aggregate rows are retained for up to 180 days. You can turn this choice off from the checker at any time.</p>
    <h2>Our core commitments</h2>
    <ul><li>Collect only what is needed for a feature you deliberately use.</li><li>Use the narrowest practical processing route for each feature.</li><li>Do not sell personal data or use it for behavioral advertising.</li><li>Ask before sharing content with another person or service.</li><li>Show retention and deletion controls in plain language.</li></ul>
    <h2>Product processing</h2>
    <p>Depending on the feature a tester chooses, processing may occur on the device or through a service provider needed to complete that feature. Connected features may require account identifiers, session records, notification tokens, encrypted records, and security events. The product must explain the relevant access and processing before use; a connected feature is not permission to collect unrelated content.</p>
    <h2>What we do not do</h2>
    <p>PauseSure does not sell personal information, build behavioral advertising profiles from checks, silently turn private evidence into marketing data, or treat a failed reputation lookup as proof of safety.</p>
    <h2>Retention and deletion</h2>
    <p>Website and contact information is kept only as long as needed to deliver the site, answer the request, protect the service, and meet applicable obligations. Feature-specific retention periods and deletion behavior must be documented in the app and release disclosures before public availability. Account deletion guidance is available on the <a href="/account-deletion">Account deletion page</a>.</p>
    <h2>Your choices</h2>
    <p>You may choose not to email us, decline optional app permissions, change iOS permission choices, and use available in-app controls for connected relationships, records, export, sign-out, and deletion. Availability depends on the feature and release you use.</p>
    <h2>Service providers and external links</h2>
    <p>PauseSure uses service providers for website hosting, security, and email delivery. They may process information only to provide those services under their applicable terms and safeguards. Links to banks, government agencies, reporting services, and other websites are governed by those organizations&apos; notices.</p>
    <h2>Updates to this notice</h2>
    <p>Material changes will be reflected by the effective date on this page. Product disclosures, App Store privacy answers, and actual release behavior are reviewed together before public distribution.</p>
    <h2>Contact</h2>
    <p>Authorized testers should use the verified private support channel supplied with their access. The public privacy contact will be activated and published on this page before public accounts are offered. Do not send passwords, codes, payment details, or sensitive scam evidence through an unverified route.</p>
  </LegalShell>;
}
