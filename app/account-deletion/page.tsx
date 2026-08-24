import type { Metadata } from "next";
import LegalShell from "../legal-shell";

export const metadata: Metadata = { title: "Account deletion", description: "How PauseSure account deletion is designed to work." };

export default function AccountDeletion() {
  return <LegalShell title="Delete your PauseSure account." intro="PauseSure is pre-release. This page documents the deletion control being built for connected accounts and will provide a live request path before launch.">
    <p className="legal-date">Development process · 24 August 2026</p>
    <div className="legal-notice">There are currently no general-release consumer accounts. If you are an authorized tester, use the in-app account deletion control first.</div>
    <h2>Planned in-app process</h2><ol><li>Open PauseSure and go to Settings → Account.</li><li>Select Delete account.</li><li>Reauthenticate with Apple and confirm deletion.</li><li>The service revokes the connected Apple authorization before deleting account-linked server records.</li></ol>
    <h2>What deletion covers</h2><p>Account-linked sessions, device registrations, encrypted backup, Circle relationships, invitations, requests, responses, and stored authorization material are designed to be removed by database cascade. Local records may require deleting them in the app or removing the app from the device.</p>
    <h2>If the app is unavailable</h2><p>Authorized testers may email <a href="mailto:privacy@pausesure.com?subject=Account%20deletion">privacy@pausesure.com</a> from the address associated with their test access. Do not send identity tokens, passwords, or one-time codes. We may need a safe verification step before acting.</p>
    <h2>Important limitation</h2><p>Backup and security logs may be retained only for the short period required by the documented retention and restore policy, then expire. Aggregated data that cannot identify an account may not be capable of being tied back to a deletion request.</p>
  </LegalShell>;
}
