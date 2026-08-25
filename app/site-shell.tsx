import Link from "next/link";
import { MobileNavigation } from "./mobile-navigation";
import { releaseAction, releaseMessaging } from "./release";

const primaryNavigation = [
  ["Check now", "/check"],
  ["Product", "/product"],
  ["How it works", "/how-it-works"],
  ["Safety & privacy", "/safety"],
  ["Resources", "/resources"],
  ["Company", "/company"],
] as const;

export function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" /></svg>;
}

export function StaticImage({ src, width, height, alt, eager = false }: { src: string; width: number; height: number; alt: string; eager?: boolean }) {
  // These are versioned, same-origin brand assets. Direct URLs avoid relying on
  // an edge image service for critical logos and launch artwork.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} width={width} height={height} alt={alt} loading={eager ? "eager" : "lazy"} decoding="async" />;
}

export function ReleaseLink({ className }: { className: string }) {
  return <a className={className} href={releaseAction.href}>{releaseAction.label} <Arrow /></a>;
}

export function ReleaseBanner() {
  return (
    <section className="launch-section" id="availability" aria-labelledby="availability-title">
      <div className="launch-logo"><StaticImage src="/brand/pausesure-logo.png" width={92} height={92} alt="PauseSure logo" /></div>
      <p className="section-kicker light">{releaseMessaging.eyebrow}</p>
      <h2 id="availability-title">{releaseMessaging.headline}</h2>
      <p>{releaseMessaging.summary}</p>
      <ReleaseLink className="button button-white" />
      <small>Download PauseSure only from the verified link on pausesure.com. Never share passwords, verification codes, payment details, or sensitive case evidence through an unverified contact route.</small>
    </section>
  );
}

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <header className={`site-header${overlay ? " site-header-overlay" : ""}`}>
        <div className="nav-shell">
          <Link className="wordmark" href="/" aria-label="PauseSure home">
            <StaticImage src="/brand/pausesure-logo.png" width={48} height={48} alt="" eager />
            <span>PauseSure</span>
          </Link>
          <nav className="desktop-nav" aria-label="Primary navigation">
            {primaryNavigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          </nav>
          <ReleaseLink className="nav-cta desktop-cta" />
          <MobileNavigation navigation={primaryNavigation} releaseAction={releaseAction} />
        </div>
      </header>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-main">
        <div>
          <Link className="wordmark footer-wordmark" href="/">
            <StaticImage src="/brand/pausesure-logo.png" width={48} height={48} alt="" />
            <span>PauseSure</span>
          </Link>
          <p>Calm decision support for suspicious requests.</p>
        </div>
        <div className="footer-column"><strong>Product</strong><Link href="/check">Check now</Link><Link href="/product">Overview</Link><Link href="/how-it-works">How it works</Link><Link href="/safety">Safety & privacy</Link></div>
        <div className="footer-column"><strong>Learn</strong><Link href="/resources">Resources</Link><Link href="/security">Security</Link><Link href="/support">Support</Link></div>
        <div className="footer-column"><strong>Company</strong><Link href="/company">About</Link><Link href="/company#contact">Contact</Link><Link href="/account-deletion">Account deletion</Link></div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} PauseSure. {releaseMessaging.footer}</p>
        <nav aria-label="Legal navigation"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/security">Security</Link></nav>
      </div>
    </footer>
  );
}
