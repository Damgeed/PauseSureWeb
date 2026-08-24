import LegalShell from "../legal-shell";
import { pageMetadata } from "../page-metadata";

export const metadata = pageMetadata({ title: "Account Deletion", description: "How to request deletion of a PauseSure account and what deletion covers.", path: "/account-deletion" });

export default function AccountDeletion() {
  return <LegalShell title="Delete your PauseSure account." intro="Account deletion should be easy to start, clear about what it covers, and confirmed when complete.">
    <p className="legal-date">Account deletion · Updated 25 August 2026</p>
    <div className="legal-notice">PauseSure does not currently offer general public accounts. Authorized testers can use the in-app control when available or request assistance through the privacy contact below.</div>
    <h2>Delete an account in the app</h2><ol><li>Open PauseSure and go to Settings → Account.</li><li>Select Delete account.</li><li>Review what will be removed and confirm the request.</li><li>Complete any safe reauthentication step shown by the app.</li></ol>
    <h2>Request assistance</h2><p>If the app is unavailable or the in-app control cannot be completed, authorized testers should use the verified private support route supplied with their access. Do not send passwords, Apple credentials, identity tokens, payment details, or one-time codes. PauseSure may need a proportionate verification step and will communicate the expected completion date after verification.</p>
    <h2>What deletion covers</h2><p>A completed deletion request covers the account record and account-linked service data that PauseSure is not legally required to retain. The confirmation process identifies any device-local records or exports that must be removed separately.</p>
    <h2>Retention exceptions</h2><p>Limited records may remain temporarily when needed for security, fraud prevention, backup integrity, dispute handling, or a legal obligation. Applicable retention and deletion behavior must be documented for the released service. Data that has been irreversibly de-identified cannot be linked back to an account-deletion request.</p>
    <h2>Confirmation</h2><p>PauseSure will confirm when the account request has been completed or explain what additional action is required.</p>
  </LegalShell>;
}
