---
status: published
version: v2
last-updated: 2026-05-11
counsel-approved: true
counsel-approval-date: 2026-05-11
applies-to: v1.9.0+
provider: REDLAND PTE. LTD. (Singapore UEN 202304648K), trading as Lore Context
governing-law: Singapore
---

# Terms of Service

_Effective 2026-05-11. Applies to Lore Cloud hosted SaaS at v1.9.0 and later._

## 1. Acceptance

By signing up for or using the Lore Cloud hosted service ("Service"),
operated by REDLAND PTE. LTD. (Singapore UEN 202304648K), trading as Lore
Context ("we", "us", "Lore"), you ("Customer", "you") agree to these Terms of
Service ("Terms"). If you disagree, do not use the Service.

You must be at least 18 years old, or the age of majority in your jurisdiction
if higher, and have authority to enter into these Terms for yourself or the
organisation you represent.

These Terms govern only the hosted service. Use of the open-source software
at `github.com/Lore-Context/lore-context` is governed by the
Apache License 2.0 (`LICENSE` in that repository).

## 2. The Service

Lore Cloud is an AI-agent memory and context control plane. It allows you
to capture, store, search, and re-use information ("memories") across
multiple AI assistants and applications. The Service includes:

- **Free** tier: limited memory storage and recall throughput; intended for
  evaluation.
- **Go**, **Plus**, **Pro** tiers: paid subscriptions with progressively
  higher quotas and feature access.

Tier definitions and pricing are at <https://lorecontext.com/pricing>. We
may revise tier features or pricing on 30 days' written notice. Existing
paid subscriptions are honored at the rate quoted at sign-up for at least
the current billing period.

## 3. Acceptable use

You will not:

- Use the Service to store, transmit, or process content that is unlawful,
  defamatory, infringing, or contains malware.
- Attempt to circumvent tier limits, abuse-detection systems, or account
  isolation.
- Use the Service, Service outputs, telemetry, APIs, or non-public Service
  behaviour to train, evaluate, or improve a competing memory or AI model
  without written permission (the "no-train" clause). This restriction does not
  stop you from exporting and using your own memory content outside Lore.
- Reverse-engineer, scrape, or systematically extract Service internals.
- Resell the Service or sub-license access without a written reseller
  agreement.
- Use the Service for storage of regulated data categories (PHI under HIPAA,
  payment card data, government-classified data) — Lore Cloud is not
  certified for these categories at v1.9.

We may suspend or terminate accounts found in violation. We will notify the
account owner before suspension where reasonable, except in cases of
imminent abuse or security threat.

## 4. Payment terms

- **Billing**: monthly in advance. The first day of your subscription is
  charged at sign-up; subsequent months are charged on the same calendar
  day each month (or the last day of the month for short months). Paid plans
  automatically renew monthly until cancelled.
- **Currency**: USD. We use Stripe Tax to compute applicable sales tax,
  VAT, GST per jurisdiction; the displayed total at Checkout includes tax
  unless otherwise indicated.
- **Failed payments**: if a charge fails, we provide a 3-day grace period
  during which the Service continues. After grace, the Service degrades to
  read-only for 4 days. After 7 days total, the Service is suspended
  pending payment. Suspended accounts retain data for 30 days and can be
  reactivated by paying the outstanding balance. We will not charge a separate
  reactivation fee unless it was disclosed before payment; after 30 days,
  suspended accounts may be deleted.
- **Refunds**: subscription fees are non-refundable except where required
  by law. We may issue pro-rated refunds at our discretion for service
  outages affecting the customer's tier ("Service-level credits", §6).
- **Plan changes**: upgrades take effect immediately and are pro-rated.
  Downgrades take effect at the end of the current billing period; no
  refunds for unused time on the higher tier.
- **Cancellation**: you may cancel at any time via the customer portal.
  Cancellation takes effect at the end of the current billing period; you
  retain Service access until then.

Nothing in these Terms limits any mandatory consumer cancellation, refund,
cooling-off, or statutory guarantee rights that apply in your jurisdiction.

## 5. Subscription tiers and features

Tier feature sets are documented at <https://lorecontext.com/pricing> and
in `docs/v1.9-feature-gating-matrix.md` (which we incorporate by
reference). We may add features to existing tiers without price increase
but we will not remove material features without 90 days' written notice
and an option to downgrade or cancel without penalty.

## 6. Service-level commitment (paid tiers only)

**Target uptime**: 99.5% per calendar month for paid tiers. Single-region
deployment at v1.9 means certain events (entire AWS ap-southeast-1 region
outage) may exceed this target.

If we miss the target in any given month, you may request Service-level
credits up to 25% of that month's subscription fee. Credits are applied to
future invoices.

The 99.5% target may be revised upward in v2.x when multi-region failover
ships. We will not lower the target without 90 days' notice.

## 7. Intellectual property

- **Your data**: you retain all rights to memories, captures, and content
  you store in the Service. We process this data only to provide the
  Service per the [Privacy Policy](./privacy-policy-v2.md).
- **Our software**: the hosted Service contains both Apache-2.0-licensed
  components (open at `github.com/Lore-Context/lore-context`) and
  proprietary components. Subscription does not grant any license beyond
  use of the Service.
- **Trademarks**: "Lore", "Lore Context", and the Lore logo are trademarks
  used by REDLAND PTE. LTD. Apache 2.0 license does not grant trademark rights.
- **Feedback**: feedback you provide is non-confidential and we may use it
  freely.

## 8. Confidentiality

We treat your memory content as confidential. We do not sell, rent, or
share it with third parties except as listed in §4 sub-processors of the
[Privacy Policy](./privacy-policy-v2.md) or required by law (court order, subpoena
— we will challenge unreasonable requests).

## 9. Warranties and disclaimers

The Service is provided "AS IS" and "AS AVAILABLE". We do not warrant
that the Service will be uninterrupted, error-free, or fit for any
particular purpose. We do not warrant that AI-augmented features (such as
the dreaming butler or LLM-based contradiction detection) will produce
factually accurate or complete output — these are best-effort
machine-learning outputs and you are responsible for verifying any
critical decisions you make based on them.

## 10. Liability cap

To the maximum extent permitted by Singapore law and any mandatory consumer law
that applies to you, our aggregate liability
for any claim arising from these Terms or your use of the Service is
limited to the **greater of (a) the amount you paid us in the 12 months
preceding the claim, or (b) US$100**.

We are not liable for indirect, incidental, special, consequential, or
punitive damages, including lost profits, lost data, business
interruption, or loss of goodwill, even if advised of the possibility.

These limits do not apply to: (i) gross negligence or willful misconduct;
(ii) breach of confidentiality; (iii) indemnification obligations; (iv)
violations of intellectual property; (v) anything not limitable under law.

## 11. Indemnification

You agree to indemnify and hold us harmless from claims arising out of
your violation of these Terms, your unlawful use of the Service, or your
infringement of third-party rights through your data or use of the
Service.

## 12. Termination

- You may cancel at any time via the customer portal.
- We may terminate for material breach with 30 days' written notice and
  opportunity to cure (or immediately for §3 acceptable use violations or
  payment default).
- Upon termination, your data is retained per the retention schedule in
  the [Privacy Policy](./privacy-policy-v2.md) and you may export it via
  `/v1/vault/export` during the grace period.

## 13. Changes to terms

We may modify these Terms with 30 days' written notice (email + dashboard
banner). Continued use after the effective date constitutes acceptance.
If you disagree, you may cancel before the effective date with no
penalty.

## 14. Governing law and dispute resolution

These Terms are governed by Singapore law. Any dispute is first attempted
to be resolved by good-faith negotiation; failing that, exclusive
jurisdiction is the courts of Singapore. The Singapore International
Arbitration Centre (SIAC) is available for international parties on
mutual agreement.

## 15. Miscellaneous

- **Entire agreement**: these Terms + Privacy Policy + any signed Data
  Processing Agreement or other written addendum constitute the entire
  agreement.
- **Severability**: if a provision is unenforceable, the remainder
  continues in effect.
- **Assignment**: you may not assign these Terms; we may assign in
  connection with a merger, acquisition, or sale of substantially all
  assets.
- **No waiver**: failure to enforce any provision is not a waiver.
- **Force majeure**: neither party is liable for delays caused by events
  outside their reasonable control (natural disaster, war, pandemic,
  third-party infrastructure outage).

## 16. Contact

- General questions: `redland2024@gmail.com`
- Legal notices: `redland2024@gmail.com`
- Mailing address: REDLAND PTE. LTD., 1 North Bridge Road, #11-02, High Street
  Centre, Singapore 179094

## Document history

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-02 | Initial pre-billing terms. |
| v2 (this) | pending | Refresh for paid SaaS billing. **Awaiting counsel approval before publication.** |

## Counsel review

(awaits REDLAND PTE. LTD. legal counsel sign-off; until then, frontmatter
`counsel-approved` remains `false` and this document does not replace the v1
ToS on the live website)
