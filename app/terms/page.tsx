import LegalShell from "../legal-shell";
import { pageMetadata } from "../page-metadata";

export const metadata = pageMetadata({ title: "Website Terms", description: "Terms governing use of the PauseSure website and informational resources.", path: "/terms" });

export default function Terms() {
  return <LegalShell title="Website terms" intro="These terms govern your use of the PauseSure website and its informational resources. Separate app or service terms will apply when those services become publicly available.">
    <p className="legal-date">Website terms · Effective 25 August 2026</p>
    <div className="legal-notice">This website provides decision-support information and scam-safety education. The iPhone app is not yet publicly listed, and nothing on this website guarantees protection, detection, recovery, or a particular outcome.</div>
    <h2>Informational use</h2><p>You may use this website for personal, lawful informational purposes. You are responsible for evaluating the information in your situation and for using independently verified official channels.</p>
    <h2>No safety guarantee</h2><p>Scam detection is uncertain. PauseSure cannot guarantee that any communication, identity, link, payment, or transaction is safe or fraudulent. Do not rely on this website as your only basis for a financial, legal, security, or emergency decision.</p>
    <h2>Use official help</h2><p>If you believe money, credentials, an account, or personal safety is at risk, stop interacting with the suspicious party. Contact your bank, the affected service, police, or emergency services through contact information you find independently.</p>
    <h2>Acceptable use</h2><p>Do not misuse this website to interfere with its operation, attempt unauthorized access, distribute malicious content, impersonate PauseSure, or violate another person&apos;s rights. Security research should follow the responsible-disclosure instructions on the Security page.</p>
    <h2>Intellectual property</h2><p>The PauseSure name, logo, visual identity, original website content, and software are protected by applicable intellectual-property laws. Third-party marks belong to their respective owners.</p>
    <h2>External sources</h2><p>Links to government, platform, and research sources are provided for context. PauseSure does not control their content or availability.</p>
    <h2>Changes and service-specific terms</h2><p>The effective date will change when these terms are materially updated. Any app, account, subscription, eligibility, or service-specific terms will be shown before you use the applicable service.</p>
    <h2>Questions</h2><p>The verified legal contact will be published with any public app or service-specific terms. Do not send legal, identity, payment, or account information to an address that is not listed on pausesure.com.</p>
  </LegalShell>;
}
