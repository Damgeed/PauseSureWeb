import Image from "next/image";
import Link from "next/link";

const primaryNavigation = [
  ["Product", "/product"],
  ["How it works", "/how-it-works"],
  ["Safety & privacy", "/safety"],
  ["Resources", "/resources"],
  ["Company", "/company"],
] as const;

export function Arrow() {
  return <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 6l4 4-4 4" /></svg>;
}

export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={`site-header${overlay ? " site-header-overlay" : ""}`}>
      <div className="nav-shell">
        <Link className="wordmark" href="/" aria-label="PauseSure home">
          <Image src="/brand/pausesure-logo.png" width={48} height={48} alt="" priority />
          <span>PauseSure</span>
        </Link>
        <nav className="desktop-nav" aria-label="Primary navigation">
          {primaryNavigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
        </nav>
        <Link className="nav-cta desktop-cta" href="/company#contact">Contact <Arrow /></Link>
        <details className="mobile-nav">
          <summary aria-label="Open navigation"><span /><span /><span /></summary>
          <nav aria-label="Mobile navigation">
            {primaryNavigation.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
            <Link className="mobile-contact" href="/company#contact">Contact PauseSure</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="footer-main">
        <div>
          <Link className="wordmark footer-wordmark" href="/">
            <Image src="/brand/pausesure-logo.png" width={48} height={48} alt="" />
            <span>PauseSure</span>
          </Link>
          <p>Calm decision support for suspicious requests.</p>
        </div>
        <div className="footer-column"><strong>Product</strong><Link href="/product">Overview</Link><Link href="/how-it-works">How it works</Link><Link href="/safety">Safety & privacy</Link></div>
        <div className="footer-column"><strong>Learn</strong><Link href="/resources">Resources</Link><Link href="/security">Security</Link><Link href="/support">Support</Link></div>
        <div className="footer-column"><strong>Company</strong><Link href="/company">About</Link><Link href="/company#contact">Contact</Link><Link href="/account-deletion">Account deletion</Link></div>
      </div>
      <div className="footer-bottom">
        <p>© {new Date().getFullYear()} PauseSure. Product in development.</p>
        <nav aria-label="Legal navigation"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/security">Security</Link></nav>
      </div>
    </footer>
  );
}
