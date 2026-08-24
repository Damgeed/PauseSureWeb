import LegalShell from "../legal-shell";
import { pageMetadata } from "../page-metadata";
import { releaseMessaging } from "../release";

export const metadata = pageMetadata({ title: "Support", description: "PauseSure support, availability information, and official scam-response resources.", path: "/support" });

export default function Support() {
  return <LegalShell title="Get the right help." intro="Find official scam-response resources, PauseSure support boundaries, and the correct contact route without exposing sensitive information.">
    <p className="legal-date">Support information · Updated 25 August 2026</p>
    <div className="legal-notice"><strong>Immediate danger?</strong> Contact your local emergency services. If money moved, call your bank using the number on your card or official website. Do not continue a suspicious call while finding the number.</div>
    <div className="support-cards"><div className="support-card"><h3>Product and availability</h3><p>Use the <a href="/company#availability">official availability status</a> for the verified iPhone release path.</p></div><div className="support-card"><h3>Privacy and account controls</h3><p>Review the <a href="/privacy">Privacy Notice</a> and <a href="/account-deletion">account-deletion guidance</a>.</p></div><div className="support-card"><h3>Security reports</h3><p>Use the <a href="/security">Security page</a> for the current responsible-disclosure route and reporting boundaries.</p></div></div>
    <h2>Before you send us anything</h2><p>Do not email passwords, one-time codes, government identifiers, bank or card numbers, recovery phrases, private keys, full account statements, or unredacted scam evidence. PauseSure will never ask you to move money to “protect” it.</p>
    <h2>If you suspect a scam</h2><ol><li>Stop replying, clicking, calling, or paying.</li><li>Preserve the message and transaction details without forwarding secrets.</li><li>Open the organization&apos;s official app or type its known address yourself.</li><li>Contact your bank immediately if any money or credentials were shared.</li><li>Report the incident through your country&apos;s official fraud-reporting service.</li></ol>
    <h2>Official availability</h2><p>{releaseMessaging.availability} Avoid download links in messages or ads that do not lead to the verified listing published here.</p>
  </LegalShell>;
}
