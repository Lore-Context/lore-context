---
status: published
version: v2
last-updated: 2026-05-11
counsel-approved: true
counsel-approval-date: 2026-05-11
applies-to: v1.9.0+
controller: REDLAND PTE. LTD. (Singapore UEN 202304648K), trading as Lore Context
controller-address: 1 North Bridge Road, #11-02, High Street Centre, Singapore 179094
contact-email: redland2024@gmail.com
---

# Privacy Policy

_Effective 2026-05-11. Applies to Lore Cloud hosted SaaS at v1.9.0 and later._

## 1. Who we are

REDLAND PTE. LTD. (Singapore UEN 202304648K), trading as Lore Context, is an
exempt private company limited by shares registered in Singapore (the "data
controller", "we", "us", or "Lore"). We operate Lore Context, an AI-agent
memory and context control plane available as a hosted SaaS at
`lorecontext.com` and as open-source software at
`github.com/Lore-Context/lore-context` under Apache License 2.0.

This Privacy Policy describes how we collect, use, share, and protect personal
data when you use the **hosted SaaS service**. The open-source software you
self-host on your own infrastructure is governed by Apache License 2.0 and is
not covered by this policy — you are the controller of any data you store in
your self-hosted instance.

## 2. What data we collect

When you sign up for and use the Lore Cloud hosted SaaS, we process:

- **Account data**: email address, name, authentication identifier (Google
  account ID, Auth0 user ID, or both), preferred locale, sign-up timestamp.
- **Subscription data**: subscription tier (Free / Go / Plus / Pro), Stripe
  customer ID, subscription status, billing history, payment method last-4
  digits (never full card numbers — those go directly to Stripe).
- **Memory and capture data**: the content you intentionally save into your
  Lore vault, plus metadata (source application, timestamp, retrieval scores).
  Content of your memories is encrypted at rest.
- **Usage telemetry**: API call counts, retrieval latencies, feature usage
  pattern (anonymized after 90 days), error logs scoped to your account.
- **Audit log**: every read or write to your vault is recorded for security
  forensics. Audit log is retained for 12 months on Pro tier, 90 days on Plus
  tier, 30 days on Go tier, and 7 days on Free tier.

Lore Cloud is not designed for regulated or highly sensitive records. Please do
not intentionally upload payment card numbers, government-issued ID numbers,
health records, biometric identifiers, children's data, or other data that
requires a regulatory compliance framework we do not offer at v1.9.

## 3. Why we process this data

We process personal data for purposes that a reasonable person would consider
appropriate for operating a paid SaaS service, including:

- **Providing the Service**: account creation, authentication, vault storage,
  search, retrieval, support, billing, and subscription administration.
- **Security and abuse prevention**: detecting carding, spam signup, malware,
  account takeover, quota abuse, and service misuse.
- **Service improvement**: measuring reliability, performance, and feature
  usage, with telemetry anonymized after 90 days where feasible.
- **Legal and accounting compliance**: retaining invoices, tax records, and
  payment records where required by Singapore law or Stripe's regulatory
  obligations.
- **Consent-based uses**: non-essential cookies and email marketing, where you
  may withdraw consent at any time through dashboard settings or unsubscribe
  controls.

For GDPR purposes, the corresponding lawful bases are contract performance,
legitimate interests, legal obligations, and consent. For Singapore PDPA
purposes, we rely on notification and consent where required, and on applicable
statutory exceptions such as legitimate interests or business improvement where
available and documented.

## 4. Sub-processors

We share specific data with the following sub-processors under written
commercial, security, and data processing terms appropriate to the data flow:

| Sub-processor | Purpose | Data shared | Region |
|---|---|---|---|
| Amazon Web Services (AWS) | Hosting, storage, compute | Encrypted memory data, account data | ap-southeast-1 (Singapore) |
| Cloudflare | CDN, DNS, DDoS protection | Request metadata, IP addresses | Global |
| Stripe | Payment processing | Email, customer ID, subscription state, payment method (Stripe holds card data; we do not) | Stripe regions |
| Auth0 (Okta) | Authentication | Email, authentication identifier | Auth0 regions |
| Anthropic | LLM inference (when AI features triggered) | Memory content excerpts | Anthropic regions |
| OpenRouter | LLM gateway routing | Memory content excerpts | OpenRouter regions |
| Cohere | Reranker model inference | Search query and candidate snippets | Cohere regions |

The current list is also published at <https://lorecontext.com/legal/sub-processors>
and is updated within 30 days of any change. You can request change notices by
emailing `redland2024@gmail.com` with the subject line "Sub-processor
notices".

## 5. Data retention

- **Account data**: retained while your account is active and for 30 days after
  cancellation, then deleted (except where law requires longer retention,
  e.g., billing records: 7 years).
- **Memory data**: retained while your account is active. Upon vault deletion
  request, we mark the vault `pending_deletion` and hard-delete after a 30-day
  grace period (you can cancel the deletion within those 30 days).
- **Audit log**: retained per tier (see §2 above). Older entries are
  irreversibly deleted on schedule.
- **Payment data**: retained 7 years for tax/audit purposes.

## 6. Your rights (GDPR / PDPA / CCPA)

You have the right to:

- **Access** the personal data we hold about you (via dashboard self-serve
  export at `/v1/vault/export`).
- **Rectify** inaccurate personal data (via dashboard settings).
- **Erase or delete** your data where required by law or through our vault
  deletion workflow (via `/v1/vault/delete-request`), subject to billing,
  security, and legal-retention exceptions.
- **Restrict** processing in specific scenarios (contact `redland2024@gmail.com`).
- **Data portability** — export your memory data in MIF (Memory Interchange
  Format) for migration to a competitor or self-hosted instance.
- **Object** to processing based on legitimate interest.
- **Withdraw consent** for non-essential processing.
- **Opt out of sale or sharing** under the CCPA. We do not sell personal
  information or share it for cross-context behavioural advertising.
- **Non-discrimination** for exercising CCPA rights.
- **Lodge a complaint** with Singapore PDPC, your EU member state DPA, or the
  UK ICO.

We respond to verified rights requests within 30 days.

## 7. International transfers

If you are located outside Singapore, your data is transferred to and
processed in Singapore (where AWS ap-southeast-1 is hosted). EU/UK data is
transferred under Standard Contractual Clauses (SCCs), the UK international
data transfer addendum or equivalent safeguards where required. Other overseas
transfers are handled under Singapore PDPA's Transfer Limitation Obligation,
including contractual or other legally recognized measures intended to provide
comparable protection.

## 8. Security

- Encryption in transit (TLS 1.3+) and at rest (AES-256).
- Multi-tenant isolation enforced at the database level (every query is
  vault-scoped).
- Authentication via OAuth 2.0 / OIDC (Google + Auth0).
- Audit log of every memory read/write.
- Data breach assessment and notification procedures for PDPC, EU/UK
  supervisory authorities, California residents, and affected individuals where
  legally required.
- Annual security review (target: SOC 2 Type 1 in v2.x cycle; not yet
  certified at v1.9 ship).

## 9. Children

Lore Cloud is not intended for users under 16. We do not knowingly collect
data from children under 16, and it is not directed to children under 13. If
you believe we have collected children's data, contact `redland2024@gmail.com`
and we will delete it where required.

## 10. Cookies

See our [Cookie Policy](./cookies-policy.md) for the list of cookies we set and
how to control them.

## 11. Changes to this policy

We will notify users of material changes via email at least 30 days before
they take effect. The current version is always available at
`lorecontext.com/legal/privacy`.

## 12. Contact

- General privacy questions: `redland2024@gmail.com`
- Data Protection Officer contact: `redland2024@gmail.com` (subject line
  "DPO")
- Data subject rights: `redland2024@gmail.com` (subject line
  "Data Subject Request")
- Security disclosures: see [SECURITY.md](https://github.com/Lore-Context/lore-context/blob/main/SECURITY.md)

## Document history

| Version | Date | Notes |
|---|---|---|
| v1 | 2026-02 | Initial open-source-only policy. |
| v2 (this) | pending | Refresh for paid SaaS context. **Awaiting counsel approval before publication.** |

## Counsel review

(awaits REDLAND PTE. LTD. legal counsel sign-off; until then, frontmatter
`counsel-approved` remains `false` and this document does not replace the v1
policy on the live website)
