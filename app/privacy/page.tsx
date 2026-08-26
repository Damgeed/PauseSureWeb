import LegalShell from "../legal-shell";
import { pageMetadata } from "../page-metadata";

export const metadata = pageMetadata({ title: "Privacy Notice", description: "How PauseSure handles personal data across its website, browser checker, and connected iPhone features.", path: "/privacy" });

export default function Privacy() {
  return <LegalShell title="Privacy should feel understandable." intro="This Privacy Notice explains how PauseSure handles personal data across the website, browser checker, and iPhone app features you choose to use.">
    <p className="legal-date">Privacy Notice · Effective 26 August 2026</p>
    <div className="legal-notice">The public checker processes messages, phone numbers, screenshots, and QR images in your browser. For a valid web address submitted directly, found in a message, or decoded from a QR image, PauseSure removes the fragment, embedded credentials, and complete query string before sending only the scheme, host, port, and path to Google Web Risk. The surrounding message and image are not sent for the URL lookup, and the checker does not open the destination. PauseSure does not run behavioral advertising or sell personal data.</div>
    <h2>Website information</h2>
    <p>When you visit pausesure.com, the systems that deliver and protect the website may process standard request information such as IP address, browser and device details, requested pages, timestamps, and security diagnostics. Edge abuse controls may use the request address transiently to limit automated traffic; it is not written to the checker&apos;s aggregate analytics table. The hosting security layer may set an essential bot-management cookie to distinguish legitimate traffic and protect the service. PauseSure does not add third-party advertising pixels or use that cookie for behavioral advertising.</p>
    <h2>When you contact us</h2>
    <p>If you email PauseSure, we receive the address, message, and attachments you choose to send. Use the published product, privacy, legal, or security address for the relevant request. Do not email passwords, verification codes, payment details, government identifiers, or unredacted scam evidence.</p>
    <h2>Optional content-free analytics</h2>
    <p>The public checker offers an optional, off-by-default control to share aggregate product events. If you enable it, PauseSure stores counts such as the type of check completed, broad result category, and next-action category. The analytics event does not contain the entry you checked, URLs, phone numbers, images, contact information, account or session identifiers, device identifiers, IP addresses, or free-form text. Daily aggregate rows are retained for up to 180 days. You can turn this choice off from the checker at any time.</p>
    <h2>URL threat intelligence</h2>
    <p>For URL threat checks, PauseSure sends each bounded minimized web address to the PauseSure reputation gateway without sending the surrounding message or image. The gateway keeps the Google credential on the server, does not write the submitted address to the application database or request logs, and caches results under a SHA-256 key until expiry. Google receives the minimized address to compare it with Web Risk threat lists. A no-known-match response is evidence about those lists at that time, not proof that the destination is safe.</p>
    <h2>Our core commitments</h2>
    <ul><li>Collect only what is needed for a feature you deliberately use.</li><li>Use the narrowest practical processing route for each feature.</li><li>Do not sell personal data or use it for behavioral advertising.</li><li>Ask before sharing content with another person or service.</li><li>Show retention and deletion controls in plain language.</li></ul>
    <h2>Product processing</h2>
    <p>In the iPhone app, selected evidence extraction and rule-based warning-signal analysis are designed to occur on the device. Features you deliberately connect may use PauseSure services for account sessions, notification delivery, encrypted Trusted Circle routing, encrypted backup, content-free analytics, and configured reputation lookups. These paths may process account identifiers, hashed session records, encrypted notification tokens, ciphertext, routing metadata, and narrowly scoped security events. A connected feature is not permission to collect unrelated device content.</p>
    <h2>Connected-content boundaries</h2>
    <p>Trusted Circle request content and cloud backup content are encrypted on the device before upload. The service still needs limited routing metadata, such as account identifiers, sender and recipient relationships, request status, timestamps, expiry, and encrypted payload size. A provider outage, missing feed, or failed lookup is reported as unavailable or unverified—not converted into a reassuring result.</p>
    <h2>What we do not do</h2>
    <p>PauseSure does not sell personal information, build behavioral advertising profiles from checks, silently turn private evidence into marketing data, or treat a failed reputation lookup as proof of safety.</p>
    <h2>Retention and deletion</h2>
    <p>Website and contact information is kept only as long as needed to deliver the site, answer the request, protect the service, and meet applicable obligations. In-app and connected-service controls identify the records a person can delete, leave, replace, or export. Account deletion guidance is available on the <a href="/account-deletion">Account deletion page</a>.</p>
    <h2>Your choices</h2>
    <p>You may choose not to contact us, keep optional analytics off, decline optional app permissions, change iOS permission choices, and use in-app controls for connected relationships, records, export, sign-out, and deletion. Some protection states remain manual because iOS does not expose whether every extension is enabled or pinned.</p>
    <h2>Service providers and external links</h2>
    <p>PauseSure uses service providers for website hosting, security, email delivery, and URL threat intelligence. Google Cloud processes minimized link indicators for Web Risk lookups under its applicable terms and safeguards. Links to banks, government agencies, reporting services, and other websites are governed by those organizations&apos; notices.</p>
    <h2>Updates to this notice</h2>
    <p>Material changes are reflected by the effective date on this page. Product disclosures, App Store privacy answers, service-provider use, and actual network behavior are reviewed together.</p>
    <h2>Contact</h2>
    <p>Start from the <a href="/support">PauseSure Support page</a> for the current verified help routes. Do not send passwords, codes, payment details, identity tokens, or sensitive scam evidence through an unverified route.</p>
  </LegalShell>;
}
