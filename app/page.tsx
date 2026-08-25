import Link from "next/link";
import { releaseMessaging } from "./release";
import { Arrow, ReleaseBanner, ReleaseLink, SiteFooter, SiteHeader, StaticImage } from "./site-shell";

const SignalIcon = ({ name }: { name: "pause" | "check" | "verify" | "circle" | "recover" }) => {
  const paths = {
    pause: <><rect x="7" y="5" width="3" height="14" rx="1.5"/><rect x="14" y="5" width="3" height="14" rx="1.5"/></>,
    check: <><path d="M5 12.5 9.2 17 19 7"/><path d="M12 3.5a8.5 8.5 0 1 0 8.2 6.3"/></>,
    verify: <><path d="M12 3 4.5 6v5.7c0 4.2 3.2 7.8 7.5 9.3 4.3-1.5 7.5-5.1 7.5-9.3V6L12 3Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></>,
    circle: <><circle cx="9" cy="9" r="3"/><circle cx="17" cy="10" r="2.2"/><path d="M3.5 20c.5-4 2.4-6 5.5-6s5 2 5.5 6"/><path d="M14 15c3.7-.7 5.8 1 6.5 4"/></>,
    recover: <><path d="M4 8V4h4"/><path d="M5 5a8.5 8.5 0 1 1-1 11"/><path d="m8.5 12 2.3 2.3 4.8-5.1"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[name]}</svg>;
};

export default function Home() {
  return (
    <>
      <SiteHeader overlay />
      <main id="main-content" tabIndex={-1}>
      <div>
        <section className="hero">
          <div className="hero-glow hero-glow-one" />
          <div className="hero-glow hero-glow-two" />
          <div className="hero-shell">
            <div className="hero-copy">
              <div className="eyebrow"><span /> PauseSure for iPhone · Clear decisions under pressure</div>
              <h1>Pause before pressure becomes a payment.</h1>
              <p className="hero-lede">
                PauseSure helps you slow down, inspect suspicious requests, verify them independently,
                and involve someone you trust—before money or information leaves your hands.
              </p>
              <div className="hero-actions">
                <Link className="button button-primary" href="/check">Check something now <Arrow /></Link>
                <ReleaseLink className="button button-secondary" />
              </div>
              <div className="hero-assurances" aria-label="Product principles">
                <span><i>✓</i> Calm, explainable guidance</span>
                <span><i>✓</i> No advertising or data selling</span>
                <span><i>✓</i> User-controlled sharing</span>
              </div>
            </div>

            <div className="product-stage" aria-label="Illustration of the PauseSure review experience">
              <div className="trust-orbit orbit-one"><span>Take a breath</span></div>
              <div className="trust-orbit orbit-two"><span>Verify elsewhere</span></div>
              <div className="phone-frame">
                <div className="phone-bar"><span>9:41</span><span className="phone-island"/><span>● ●</span></div>
                <div className="phone-content">
                  <div className="phone-brand">
                    <StaticImage src="/brand/pausesure-logo.png" width={52} height={52} alt="PauseSure logo" />
                    <span>PauseSure</span>
                  </div>
                  <p className="phone-label">Suspicious request</p>
                  <h2>Before you act, let&apos;s check what&apos;s happening.</h2>
                  <div className="pressure-card">
                    <span>Pressure detected</span>
                    <strong>“Act now or your account will close”</strong>
                  </div>
                  <div className="phone-step"><span>1</span><p><strong>Do not use their link</strong>Open the company&apos;s official app instead.</p></div>
                  <div className="phone-step"><span>2</span><p><strong>Keep money where it is</strong>A real organization can wait while you verify.</p></div>
                  <div className="phone-button">Pause and verify</div>
                  <p className="phone-footnote">A warning—not a guarantee or a “safe” score.</p>
                </div>
              </div>
              <div className="floating-proof">
                <span className="proof-icon"><SignalIcon name="verify" /></span>
                <p><strong>Independent verification</strong>Leave the incoming channel first</p>
              </div>
            </div>
          </div>
        </section>

        <section className="evidence-strip" aria-label="Why this matters">
          <div>
            <p className="evidence-kicker">The pressure is real</p>
            <p className="evidence-context">Reported fraud losses continue to rise, while scams now travel through every familiar channel.</p>
          </div>
          <a href="https://www.ftc.gov/news-events/news/press-releases/2026/06/ftc-data-show-people-reported-losing-3-point-5-billion-imposter-scams-2025" target="_blank" rel="noreferrer">
            <strong>$3.5B</strong><span>reported lost to imposter scams in 2025 <u>FTC ↗<span className="sr-only"> (opens in a new tab)</span></u></span>
          </a>
          <a href="https://www.ic3.gov/AnnualReport/Reports/2025_IC3Report.pdf" target="_blank" rel="noreferrer">
            <strong>$7.7B</strong><span>reported losses among people 60+ <u>FBI IC3 ↗<span className="sr-only"> (opens in a new tab)</span></u></span>
          </a>
        </section>

        <section className="section demo-section" aria-labelledby="product-film-title">
          <div className="demo-copy">
            <p className="section-kicker">The product in 15 seconds</p>
            <h2 id="product-film-title">A pause that leads somewhere.</h2>
            <p>
              The most useful protection products are fast to reach, easy to understand, and clear about what to do next.
              PauseSure brings those strengths into one respectful flow—from the first uneasy feeling through verification,
              trusted help, and recovery.
            </p>
            <ul className="demo-points">
              <li><span>01</span><strong>Check the format you already have</strong><small>Message, link, screenshot, QR code, or supported audio.</small></li>
              <li><span>02</span><strong>See the reasons and the limits</strong><small>Plain-language evidence without pretending uncertainty is certainty.</small></li>
              <li><span>03</span><strong>Take a safer next step</strong><small>Verify elsewhere, ask someone you trust, or start a recovery plan.</small></li>
            </ul>
            <Link className="text-link" href="/product">Explore the product <Arrow /></Link>
          </div>
          <figure className="demo-film">
            <video controls playsInline preload="metadata" poster="/pausesure-intro-poster.jpg" aria-label="PauseSure product introduction">
              <source src="/pausesure-intro.mp4" type="video/mp4" />
              Your browser does not support embedded video.
            </video>
            <figcaption>A 15-second look at the PauseSure decision flow. Official iPhone availability is verified on pausesure.com.</figcaption>
            <details className="video-transcript">
              <summary>Read the video description</summary>
              <p>The film introduces the PauseSure mark, shows a suspicious request moving through a calm review, highlights explainable warning signals, and ends with the Pause, Check, Verify, Involve, and Recover decision flow.</p>
            </details>
          </figure>
        </section>

        <section className="section" id="how-it-works">
          <div className="section-heading centered">
            <p className="section-kicker">A safer decision process</p>
            <h2>Not just a verdict. A way forward.</h2>
            <p>Scammers manufacture urgency. PauseSure interrupts the pressure and guides the next safest action—with uncertainty shown honestly.</p>
          </div>
          <div className="flow-grid">
            {[
              ["pause", "01", "Pause", "Break the pressure loop before you reply, click, pay, or share."],
              ["check", "02", "Check", "Inspect the words, link, screenshot, or request for recognizable warning patterns."],
              ["verify", "03", "Verify", "Leave the incoming channel and confirm through an official source you find yourself."],
              ["circle", "04", "Involve", "Share only what you choose with a trusted person when a second human view matters."],
              ["recover", "05", "Recover", "If something happened, follow a calm evidence, account, bank, and reporting checklist."],
            ].map(([icon, number, title, body]) => (
              <article className="flow-card" key={title}>
                <div className="flow-top"><span className="flow-icon"><SignalIcon name={icon as "pause" | "check" | "verify" | "circle" | "recover"} /></span><span>{number}</span></div>
                <h3>{title}</h3><p>{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section split-section" id="families">
          <div className="family-visual">
            <div className="family-card family-card-one">
              <StaticImage src="/brand/protect-myself.png" width={430} height={516} alt="A woman checking a message on her phone" />
              <div><span>For me</span><strong>Stay in control</strong></div>
            </div>
            <div className="family-card family-card-two">
              <StaticImage src="/brand/help-someone.png" width={520} height={346} alt="A daughter helping an older family member review a message" />
              <div><span>For someone I trust</span><strong>Help without taking over</strong></div>
            </div>
          </div>
          <div className="family-copy">
            <p className="section-kicker">Protection with dignity</p>
            <h2>Built for independence—and a trusted second opinion.</h2>
            <p>PauseSure is built for people who want to protect themselves and for families who want to help without surveillance, panic, or shame.</p>
            <ul className="feature-list">
              <li><span>01</span><div><strong>Selective sharing</strong><p>You choose the person and the information. Nothing is silently sent to a family dashboard.</p></div></li>
              <li><span>02</span><div><strong>Plain-language context</strong><p>See the warning signals and the safest next steps—not a mysterious confidence percentage.</p></div></li>
              <li><span>03</span><div><strong>Respectful support</strong><p>Trusted Circle preserves the person&apos;s agency through clear permissions and the ability to leave.</p></div></li>
            </ul>
          </div>
        </section>

        <section className="trust-section" id="trust">
          <div className="trust-shell">
            <div className="trust-intro">
              <p className="section-kicker light">Trust is a product feature</p>
              <h2>Designed to know less—not collect more.</h2>
              <p>Scam protection can touch highly sensitive moments. Our architecture and policies prioritize data minimization, explicit action, limited retention, and honest limits.</p>
              <Link className="text-link light-link" href="/safety">Explore safety and privacy <Arrow /></Link>
            </div>
            <div className="trust-grid">
              <article><span>01</span><h3>Minimized processing</h3><p>Each supported feature uses the narrowest practical processing route and only the information needed for the action you choose.</p></article>
              <article><span>02</span><h3>Share by choice</h3><p>PauseSure reviews items you deliberately select or share. Access is limited to the permissions each feature needs.</p></article>
              <article><span>03</span><h3>Protected records</h3><p>Release reviews cover storage protection, connected-data encryption, retention, access control, and deletion as one system.</p></article>
              <article><span>04</span><h3>No false certainty</h3><p>A failed lookup never means “safe.” We explain evidence and limitations and direct high-risk cases to official help.</p></article>
            </div>
          </div>
        </section>

        <section className="section difference-section">
          <div className="section-heading">
            <p className="section-kicker">Why PauseSure</p>
            <h2>The moment that matters is the decision.</h2>
          </div>
          <div className="difference-grid">
            <div className="comparison-card muted-card">
              <p className="comparison-label">A basic scam checker</p>
              <ul><li>Returns a score or label</li><li>Stops when the scan ends</li><li>Can invite dangerous overconfidence</li></ul>
            </div>
            <div className="comparison-arrow"><Arrow /></div>
            <div className="comparison-card active-card">
              <p className="comparison-label">The PauseSure approach</p>
              <ul><li>Explains the pressure signals</li><li>Builds an independent verification route</li><li>Brings in trusted help and recovery when needed</li></ul>
            </div>
          </div>
        </section>

        <section className="section faq-section" id="faq">
          <div className="faq-heading"><p className="section-kicker">Clear answers</p><h2>Questions deserve straight answers.</h2></div>
          <div className="faq-list">
            <details open><summary>Can PauseSure guarantee that something is safe?<span>+</span></summary><p>No. No tool can reliably guarantee that a person, message, link, or transaction is safe. PauseSure is decision support: it surfaces warning signals and helps you verify independently.</p></details>
            <details><summary>Does PauseSure replace my bank, police, or emergency services?<span>+</span></summary><p>No. If money has moved, an account may be compromised, or anyone is in immediate danger, contact the relevant bank, platform, police, or emergency service directly using an official channel.</p></details>
            <details><summary>Will my checks be used for advertising or sold?<span>+</span></summary><p>No. PauseSure does not use checks for behavioral advertising, cross-app tracking, or selling personal data. Read the current Privacy Notice for the website and authorized testing boundaries.</p></details>
            <details><summary>Where can I download PauseSure?<span>+</span></summary><p>{releaseMessaging.availability}</p></details>
          </div>
        </section>

        <ReleaseBanner />
      </div>
      </main>
      <SiteFooter />
    </>
  );
}
