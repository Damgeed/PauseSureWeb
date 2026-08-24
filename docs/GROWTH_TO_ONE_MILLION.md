# PauseSure roadmap to one million users

Updated: August 24, 2026

This is an operating plan, not a forecast. The proposed target is **one million cumulative installs and at least 250,000 monthly active users within 36 months of public launch**, while maintaining a safety-first release bar.

## 1. Why this market is worth entering

The problem is large and worsening. The FTC reported **$3.5 billion in imposter-scam losses in 2025**, nearly one in three fraud reports, and about $16 billion in reported losses across all fraud categories. It also reported that almost 30% of people who lost money to a scam in 2025 said it began on social media, representing $2.1 billion in losses. Older adults face especially severe loss: reports from people 60 and over losing $10,000 or more to impersonation scams increased more than fourfold from 2020 to 2024. Sources: [FTC imposter-scam data](https://www.ftc.gov/news-events/news/press-releases/2026/06/ftc-data-show-people-reported-losing-3-point-5-billion-imposter-scams-2025), [FTC social-media scam data](https://www.ftc.gov/news-events/data-visualizations/data-spotlight/2026/04/reported-losses-scams-social-media-eight-times-higher-2020), and [FTC older-adult loss analysis](https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-data-show-more-four-fold-increase-reports-impersonation-scammers-stealing-tens-even-hundreds).

That demand does not guarantee adoption. Consumers already have call blocking, platform warnings, security suites, and free scan assistants. PauseSure must win on a distinct job: **help me make a safer decision during a high-pressure moment, without taking control away from me.**

## 2. Positioning and competitive wedge

### Category position

**PauseSure is calm decision support for suspicious requests.** It helps a person pause, inspect the evidence, verify independently, involve a chosen person, and recover if something already happened.

Avoid leading with “AI scam detector.” That description places PauseSure in a feature comparison against larger security vendors and can encourage false confidence. Lead with the outcome and human workflow.

### Competitive landscape

| Competitor/category | Publicly described strength | PauseSure response |
| --- | --- | --- |
| Truecaller | Caller identity, spam blocking, and an AI assistant that screens calls and shows live transcription. [Official description](https://corporate.truecaller.com/newsroom/press-release/9FD3C95B8290ECC2) | Do not compete only on caller ID. Connect calls to independent verification, a consistent decision flow, Trusted Circle, and recovery. |
| Norton Genie | Analyzes messages, email, social posts, websites, and screenshots, then offers next-step tips. Norton's privacy notice says some original submissions may be retained for 30 days and de-identified text for one year. [Official privacy notice](https://us.norton.com/privacy/products-privacy-notice) | Make retention and deletion plain at the decision point; minimize by default; prove the difference with public, testable policies. |
| Bitdefender Scam Protection / Scamio | Checks messages, links, ads, impersonation, screenshots, QR codes, and other interactions across its security suite. [Official product page](https://www.bitdefender.com/en-us/consumer/scam-protection) | Win on simplicity, family consent, evidence explanation, and a focused workflow—not feature-count claims. |
| McAfee Scam Detector | Adds QR checks and social-message protection inside broader consumer security plans. [Official announcement](https://www.mcafee.com/en-us/newsroom/press-releases/2026/mcafee-simplifies-safety-with-new-instant-qr-code-scam-checks-and-smarter-social-messaging-scam-protection.html) | Be the independent “pause layer” that works across scam channels and shows the official next place to verify. |
| Apple and carrier/platform defenses | Native warnings, message filtering, caller controls, privacy labels, and App Store trust. | Complement platform protection. Never imply native access or blocking capabilities the shipped app does not have. |

### The five-part moat

1. **One decision language:** the same pause → inspect → verify → involve → recover flow across text, screenshot, link, QR, call, and voicemail inputs.
2. **Independent verification:** direct people away from contact details supplied by the suspicious request and toward an official app, card, statement, or independently found website.
3. **Consent-based family support:** Trusted Circle assists without covert monitoring, hidden escalation, or loss of agency.
4. **Recovery built in:** containment and official reporting are first-class, not an afterthought.
5. **Evidence-backed trust:** publish limitations, data handling, security practices, and evaluation results; never promise “safe.”

## 3. Who to serve first

Do not launch to “everyone” at once. Start with two linked audiences:

- **Primary user:** an iPhone owner receiving bank, government, parcel, payment, investment, romance, job, or family-impersonation pressure.
- **Growth sponsor:** an adult child, caregiver, friend, financial institution, insurer, employer, or community organization that wants to help that person retain control.

Initial English-language launch focus:

1. U.S. adults 45+ who actively manage household finances.
2. Adult children and caregivers supporting an older parent or relative.
3. Members/customers reached through credit unions, regional banks, insurers, telcos, employers, libraries, and senior-serving organizations.

The B2C user creates trust and product evidence. B2B2C distribution creates scale.

## 4. Non-negotiable launch gates

Growth begins only after the product earns the right to be recommended.

### Product

- First meaningful check completed within two minutes of install.
- Keyboard and focus never block the primary “Check now” action.
- Every result distinguishes evidence, uncertainty, and recommended next action.
- Results never use an unconditional “safe” label; absence of detected signals is not proof of legitimacy.
- Official verification and urgent recovery work without a paid plan.
- Accessibility: VoiceOver labels, Dynamic Type, contrast, reduced motion, clear focus order, and large touch targets.
- Crash-free sessions ≥99.8% in the release candidate.

### Privacy and security

- Maintain a data-flow inventory for every input, third-party SDK, model/vendor, log, and retention period.
- Keep App Store privacy answers and the website accurate. Apple requires developers to disclose their own and third-party data practices and keep them current. [Apple app privacy guidance](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy/)
- Threat-model account takeover, malicious links/content, prompt injection, unsafe model output, authorization failures, keychain/token handling, extension isolation, abuse, and support impersonation.
- Run automated secret, dependency, static-analysis, and infrastructure checks on every release.
- Perform an independent mobile/API penetration test before general availability and after material auth/data-flow changes.
- Map controls to [OWASP MASVS](https://mas.owasp.org/news/2024/01/18/masvs-v210-release--masvs-privacy/) and the final [NIST SSDF 1.1](https://csrc.nist.gov/projects/ssdf); treat the draft SSDF 1.2 as input, not a final compliance claim.
- Publish a vulnerability-reporting path and incident-response runbook. Do not publish exploitable architecture or unresolved findings.

### Evidence

- Build a labeled, versioned evaluation set spanning scam types, languages, benign lookalikes, adversarial wording, and low-quality screenshots/audio.
- Measure recall, precision, abstention, false reassurance, unsafe advice, and performance by channel and demographic/language slice.
- Human-review every incident involving false reassurance or harmful next-step guidance; target **zero known unsafe reassurance incidents**.
- Collect consented beta stories without exposing the person or the scam evidence.

## 5. The growth model

Planning allocation for one million cumulative installs—not a prediction:

| Engine | Install target | What creates it |
| --- | ---: | --- |
| Partner distribution | 350,000 | Banks, credit unions, insurers, telcos, employers, senior/community organizations |
| Organic discovery | 250,000 | App Store search, web SEO, official-resource content, earned links, brand search |
| Trusted Circle/referrals | 200,000 | One-to-one family invites and shareable verification/recovery guidance |
| Paid acquisition | 150,000 | Apple Ads and narrowly targeted paid search/social after retention is proven |
| PR, creators, and community | 50,000 | Consumer advocates, scam educators, local media, libraries, community workshops |

### Built-in growth loops

- **Trusted Circle loop:** a user asks for help → trusted person installs → both understand permissions → trusted person can protect themselves or invite another person.
- **Official guide loop:** a useful, cited scam guide ranks or is shared → visitor gets immediate official next steps → app becomes the persistent protection tool.
- **Partner loop:** partner distributes to a defined member segment → activation and outcome report proves value → partner expands cohorts → case study attracts another partner.
- **Recovery loop:** a person gets clear containment steps in a crisis → they recommend the tool later because it was useful when stakes were high.

Do not add spammy contact uploads, dark-pattern invites, or fear-driven notifications. Trust is the growth asset.

## 6. Phase plan

### Phase 0 — readiness and private beta (0–10,000 installs)

Duration: months 0–3.

- Recruit 300–1,000 representative testers through TestFlight, then grow deliberately. Apple supports up to 10,000 external TestFlight testers and provides session, crash, and feedback metrics. [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview)
- Run moderated “scam pressure” usability sessions, especially with older adults and adult children.
- Establish activation, retention, decision-quality, privacy, accessibility, and support baselines.
- Resolve all P0/P1 safety, security, keyboard/focus, crash, and data-disclosure defects.
- Produce ten consented case studies and three institutional pilot proposals.
- Website: publish product truth, policies, official resources, status, support, and partnership contact. No fake testimonials or inflated numbers.

Exit criteria: ≥60% complete a first check, median time-to-first-check <2 minutes, ≥25% D30 retention among activated beta users, ≥99.8% crash-free sessions, and no unresolved critical/high security issue.

### Phase 1 — focused public launch (10,000–100,000)

Duration: months 4–9.

- Optimize App Store name, subtitle, keywords, screenshots, preview, and review prompts around the core job.
- After enough traffic, use Apple's product page optimization to test up to three icon/screenshot/preview treatments and keep only statistically credible winners. [Apple product page optimization](https://developer.apple.com/help/app-store-connect/create-product-page-optimization-tests/overview-of-product-page-optimization)
- Create distinct App Store messaging for “protect myself” and “help someone I trust”; use custom product pages where approved rather than a generic one-size-fits-all campaign.
- Publish two deeply useful, official-source-backed resource pages weekly around active scam patterns and recovery actions.
- Build a public launch kit: product screenshots, founder story, limitations, privacy summary, security contact, and expert-review briefing.
- Partner with 10–20 libraries, senior centers, caregiver groups, consumer educators, and credit unions for workshops and small pilots.
- Ask for an App Store rating only after a completed useful outcome—not after install or during distress.

Exit criteria: ≥30% D30 retention for activated users, ≥20% of weekly active users complete a second check, referral coefficient ≥0.15, organic installs ≥35% of new installs, and support response within one business day.

### Phase 2 — repeatable acquisition and partnerships (100,000–500,000)

Duration: months 10–20.

- Scale Apple Ads and high-intent search only when cohort contribution can cover acquisition cost; optimize to activated and retained users, not installs.
- Add localization based on fraud need, partner demand, and support readiness. Localize the product, evaluation set, safety guidance, policies, screenshots, support, and official resources together.
- Run 3–5 structured bank/credit-union/insurer/telco pilots with agreed cohort, onboarding channel, privacy boundaries, support, measurement, and expansion criteria.
- Offer sponsored consumer access or a co-branded education/onboarding layer without giving partners access to private checks by default.
- Use the American Bankers Association's participation scale—more than 2,500 banks have joined one or both of its scam-awareness campaigns—as evidence that banks already distribute consumer fraud education. [ABA campaign announcement](https://www.aba.com/about-us/press-room/press-releases/bnat-launch-2025)
- Build a partner portal only after the reporting/privacy contract is defined; begin with aggregate activation and outcomes.

Exit criteria: at least two expanded paid/sponsored partners, partner activation ≥35%, blended CAC within model, 50%+ of new installs from organic/referral/partners, and security/privacy review accepted by institutional prospects.

### Phase 3 — national scale (500,000–1,000,000+)

Duration: months 21–36.

- Convert successful pilots into multi-year national or multi-region distribution.
- Launch multilingual markets one at a time with local official resources and incident support.
- Build earned-media authority with a quarterly, privacy-preserving scam-pressure trends report; never expose user submissions or overstate sample representativeness.
- Explore Android or a limited public web checker only when iOS retention and economics prove demand and the new data/security surface is staffed.
- Establish an advisory council spanning fraud operations, older-adult advocacy, accessibility, security/privacy, behavioral science, and consumer protection.

Exit criteria: one million cumulative installs, ≥250,000 MAU, ≥55% of acquisition from non-paid engines, sustainable gross margin, and no deterioration in safety, retention, or support as cohorts scale.

## 7. Acquisition playbooks

### App Store

- Core screenshot story: “Pause” → “See the pressure signals” → “Verify elsewhere” → “Ask someone you trust” → “Recover quickly.”
- Test audience-specific creative, not cosmetic variations.
- Align ad promise, custom product page, onboarding choice, and first check.
- Review search terms weekly; add negatives aggressively; report cost per activated D30 user.

### Website and SEO

- Keep the multi-page company structure. It supports intent-specific search, credible policies, partnerships, and clearer analytics better than one long page.
- Create content clusters: bank/government impersonation, parcel/toll, investment, romance, job, marketplace, account takeover, gift card/crypto/wire, QR, and recovery.
- Each guide must show an update date, official sources, red flags, independent verification, recovery, and reporting.
- Add structured data only when the visible content supports it. Never manufacture ratings, FAQ claims, or expert endorsements.
- Build free utility carefully: a public resource navigator or shareable checklist can acquire users with less sensitive data than a public scanner.

### PR and creators

- Prioritize consumer reporters, local TV/radio scam segments, caregiver educators, cybersecurity educators, and financial-wellness creators.
- Give creators a demonstration protocol and approved claims; prohibit guarantees, fake rescues, paid testimonials without disclosure, and uploading a follower's private evidence.
- Use current public scam waves for timely education, not fear-based promotion.

### Partnerships

- First offer: 90-day, 1,000–10,000 member pilot with sponsored access, educational kit, strict privacy boundary, aggregate reporting, support SLA, and predefined expansion criteria.
- Buyer value: fewer preventable scam losses and escalations, differentiated member protection, measurable education activation, and family reach.
- Consumer promise: the partner does not see private checks or family activity unless the person knowingly chooses to share it.

## 8. Product and pricing

Keep the immediate safety path free:

- free: core checks, explanations, independent verification, urgent recovery, official reporting resources;
- premium individual/family: higher usage, Trusted Circle coordination, optional monitoring/alerts only where technically and legally supported, history/organization, enhanced support;
- sponsored B2B2C: institution-funded access for members, with privacy-preserving aggregate reporting;
- avoid: selling data, ad targeting based on scam submissions, paywalling urgent containment, or charging a distressed person for “recovery.”

Test willingness to pay only after retention. Pricing should fund support, evaluation, security, and inference costs—not create pressure during a crisis.

## 9. Measurement system

### North-star metric

**Protected decisions completed per week:** a user submits a concern, receives an explanation, and takes or records a safer next step.

### Funnel

Track, with privacy-minimized analytics:

1. qualified visitor / App Store impression;
2. install;
3. onboarding complete;
4. first check complete;
5. safer next step viewed or completed;
6. second active week;
7. Trusted Circle invite accepted or guide shared;
8. retained monthly active user.

### Scorecard

- Activation rate and median time to first value.
- D1, D7, D30, and D90 retention by acquisition source and user intent.
- Checks per active user per week and completion by input type.
- False reassurance, unsafe advice, abstention, and escalation incidents.
- Crash-free sessions, latency, keyboard/focus failures, and support contacts per 1,000 checks.
- Invite rate, invite acceptance, and referral coefficient.
- Website-to-store click rate, store conversion, cost per activated user, CAC, payback, and LTV.
- Partner enrollment, activation, retention, support load, renewal, and cohort expansion.

Never optimize an aggregate growth metric while safety or privacy guardrails worsen.

## 10. Budget and team

### Bootstrap: $0–$25,000

Spend on device coverage, moderated research, accessibility, legal/privacy review, security testing, TestFlight recruitment, App Store creative, and high-quality official-resource content. Founder-led outreach replaces broad paid acquisition.

### Prove repeatability: $25,000–$150,000

Add targeted Apple Ads/search tests, contractor design/content, customer support coverage, deeper external penetration testing, evaluation operations, and 2–5 partner pilots.

### Scale: $150,000+

Release spend only against retained cohorts and signed distribution. Staff partnerships, fraud/safety operations, lifecycle growth, support, security/privacy, localization, and data/evaluation. Keep at least 15–20% of growth-stage operating spend reserved for trust, safety, security, support, and evaluation.

Minimum accountable functions, even if one person holds several roles: product/engineering, safety/evaluation, security/privacy, support/operations, growth/content, and partnerships.

## 11. First 90 days

### Days 1–30

- Freeze the v1 promise and supported inputs.
- Fix all P0/P1 product defects, including keyboard/focus blocking primary actions.
- Complete data-flow inventory, threat model, App Store privacy draft, and public-policy reconciliation.
- Instrument the privacy-minimized funnel and safety incident logging.
- Recruit the first 100 representative TestFlight users.
- Publish the advanced multi-page website from `PauseSureWeb` after owner approval.

### Days 31–60

- Run weekly moderated usability and adversarial evaluation sessions.
- Reach 300–500 testers; publish a changelog and close the feedback loop.
- Produce App Store assets for the two primary intents.
- Publish 8–10 official-source resource articles/checklists.
- Approach 25 pilot prospects and secure 5 serious discovery conversations.
- Commission external security and accessibility reviews.

### Days 61–90

- Clear launch gates and submit the release candidate.
- Prepare support macros, incident response, status communication, and recovery escalation.
- Launch to a controlled audience; measure activation and D30 cohorts before paid scale.
- Begin 2–3 community pilots and one institutional pilot if privacy/security diligence is ready.
- Hold a weekly growth review and a separate safety review; safety has veto power over scaling.

## 12. Operating cadence

- Weekly: one onboarding/activation experiment, one retention/trust experiment, one resource update, funnel review, safety incident review.
- Monthly: app ↔ website claim/privacy sync, cohort and channel economics, accessibility regression, dependency/security review, partner pipeline.
- Quarterly: external evaluation refresh, threat-model review, recovery drill, content audit, positioning review, and board/advisor scorecard.

The governing rule is simple: **do not buy reach faster than PauseSure can safely support and retain it.** The path to one million is a trusted product with multiple compounding distribution loops—not a single viral campaign.
