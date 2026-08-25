import LegalShell from "../legal-shell";
import { pageMetadata } from "../page-metadata";

export const metadata = pageMetadata({ title: "Security", description: "PauseSure security practices, assurance boundaries, and vulnerability reporting.", path: "/security" });

export default function Security() {
  return <LegalShell title="Security at PauseSure." intro="PauseSure uses least privilege, protected storage, secure connected-data handling, strict validation, and explicit product limits as release requirements.">
    <p className="legal-date">Security overview · Updated 25 August 2026</p>
    <div className="legal-notice">This public overview describes PauseSure&apos;s security approach and assurance process. It is not a certification or a guarantee, and it intentionally omits details that could make systems or users less safe.</div>
    <h2>Protection model</h2>
    <ul><li>Request only the permissions and content needed for the feature a person chooses.</li><li>Protect locally saved records with platform security controls and clear export boundaries.</li><li>Use authenticated, encrypted connections for network features and protect sensitive service credentials.</li><li>Validate request shape and size, limit abuse, separate environments, and keep secrets out of source code.</li><li>Redact credentials and private case content from operational logs.</li><li>Treat account deletion, retention, backups, and recovery as security controls—not administrative afterthoughts.</li></ul>
    <h2>Data boundaries</h2>
    <p>A feature should not receive unrelated device content simply because another permission was granted. Connected services are reviewed for narrow access, encryption, retention, notification privacy, and deletion. Public disclosures must match the network behavior of the released build.</p>
    <h2>Release assurance</h2>
    <ol><li>Threat-model identity, Trusted Circle, backup, recovery, and payment-adjacent flows.</li><li>Run dependency, secret, static-analysis, migration, retention, and account-deletion checks.</li><li>Review production secrets, backup and restore, monitoring, alerting, and incident response.</li><li>Reconcile the Apple privacy manifest, App Store privacy answers, website policies, vendors, and actual network behavior.</li><li>Use independent mobile and API security testing as part of the release assurance process.</li></ol>
    <h2>Responsible disclosure</h2>
    <p>Please do not post exploit details or personal data publicly. Authorized testers should use the verified private reporting channel supplied with their access. A public private-reporting route and response target will be published here before general app distribution. Include the affected surface, reproduction steps, and impact without attaching credentials or personal case evidence.</p>
    <h2>Safety boundary</h2>
    <p>PauseSure is decision support and cannot guarantee that a person, message, link, or transaction is safe. If money or credentials may be at risk, stop contact and reach the relevant organization through an official channel you locate independently.</p>
  </LegalShell>;
}
