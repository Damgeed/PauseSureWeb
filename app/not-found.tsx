import Link from "next/link";
import { Arrow, SiteFooter, SiteHeader } from "./site-shell";

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="inner-main" id="main-content" tabIndex={-1}>
        <section className="page-hero compact-page-hero">
          <div className="page-hero-copy">
            <p className="eyebrow"><span /> Page not found</p>
            <h1>This link does not lead to a PauseSure page.</h1>
            <p>If a message or advertisement sent you here, do not enter information or download anything. Return to a verified PauseSure route below.</p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/">Go to PauseSure <Arrow /></Link>
              <Link className="button button-secondary" href="/resources">Open scam-safety resources</Link>
            </div>
          </div>
          <div className="hero-principle">
            <small>Safer link habit</small>
            <strong>Type pausesure.com yourself when a download or urgent request feels uncertain.</strong>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
