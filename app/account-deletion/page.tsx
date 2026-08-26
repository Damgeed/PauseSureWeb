import LegalShell from "../legal-shell";
import { pageMetadata } from "../page-metadata";

export const metadata = pageMetadata({ title: "Account Deletion", description: "How to request deletion of a PauseSure account and what deletion covers.", path: "/account-deletion" });

export default function AccountDeletion() {
  return <LegalShell title="Delete your PauseSure account." intro="Account deletion should be easy to start, clear about what it covers, and confirmed when complete.">
    <p className="legal-date">Account deletion · Updated 26 August 2026</p>
    <div className="legal-notice">If you use a connected PauseSure account, start deletion from the in-app account controls. The browser checker has no account and does not upload the content you check.</div>
    <h2>Delete an account in the app</h2><ol><li>Open PauseSure and go to Settings → Account.</li><li>Select Delete account.</li><li>Review what will be removed and confirm the request.</li><li>Complete any safe reauthentication step shown by the app.</li></ol>
    <h2>Request assistance</h2><p>If the in-app control cannot be completed, start from the <a href="/support">PauseSure Support page</a> and use only a contact route verified on pausesure.com. Do not send passwords, Apple credentials, identity tokens, payment details, or one-time codes. PauseSure may require proportionate reauthentication before acting on account-linked data.</p>
    <h2>What deletion covers</h2><p>A completed deletion request covers the account record and account-linked service data that PauseSure is not legally required to retain. The confirmation process identifies any records kept on the device or exports that must be removed separately.</p>
    <h2>Retention exceptions</h2><p>Limited records may remain temporarily when needed for security, fraud prevention, backup integrity, dispute handling, or a legal obligation. The applicable service explains those retention boundaries. Data that has been irreversibly de-identified cannot be linked back to an account-deletion request.</p>
    <h2>Confirmation</h2><p>PauseSure will confirm when the account request has been completed or explain what additional action is required.</p>
  </LegalShell>;
}
