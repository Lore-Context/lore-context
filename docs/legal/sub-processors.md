---
status: published
last-updated: 2026-05-11
counsel-approved: true
counsel-approval-date: 2026-05-11
applies-to: v1.9.0+
---

# Sub-processors

This page lists every third-party sub-processor that Lore Cloud uses to
deliver the hosted Service. We update this list within 30 days of any
material change. Customers who want to receive change notifications can email
`redland2024@gmail.com` with the subject line "Sub-processor notices".

This list supports GDPR Article 28 sub-processor authorisation and Singapore
PDPA accountability obligations. The corresponding Data Processing Agreement or
other data processing terms between REDLAND PTE. LTD. and each sub-processor
are available on request to paid customers under NDA where the vendor makes
them available.

## Active sub-processors as of 2026-05-11

| Sub-processor | Service | Categories of data | Region(s) | DPA reference |
|---|---|---|---|---|
| **Amazon Web Services, Inc.** | Hosting (EC2, RDS, S3, ElastiCache, Secrets Manager, SQS) | Account data, encrypted memory data, audit logs, system telemetry | ap-southeast-1 (Singapore) | AWS Customer Agreement + AWS GDPR Addendum |
| **Cloudflare, Inc.** | CDN, DNS, DDoS protection, WAF | Request metadata, IP addresses, browser fingerprints (limited) | Global edge network | Cloudflare DPA |
| **Stripe, Inc.** | Payment processing, subscription billing, tax calculation | Email, name, customer ID, subscription state, payment method (Stripe holds card data; we never do), invoice records | Stripe global processing regions | Stripe DPA |
| **Auth0 (Okta, Inc.)** | OIDC authentication for users who choose Auth0 sign-in | Email, authentication identifier, IP at login | Auth0 regions per tenant | Okta DPA |
| **Anthropic PBC** | LLM inference for AI-augmented features (dreaming butler consolidation, conflict detection) | Memory content excerpts (only when AI features are triggered) | Anthropic-operated regions | Anthropic DPA |
| **OpenRouter, Inc.** | Multi-model LLM gateway routing | Memory content excerpts (only when AI features are triggered) | OpenRouter regions | OpenRouter Terms of Service |
| **Cohere, Inc.** | Reranker model inference (`rerank-multilingual-v3.0`) | Search queries, candidate document snippets (no memory content beyond search response) | Cohere regions | Cohere DPA |

## Optional sub-processors (only when you opt in)

| Sub-processor | Service | When | DPA reference |
|---|---|---|---|
| **Google LLC** | OIDC authentication for users who choose Google sign-in (alternative to Auth0) | Only if you sign in via Google | Google Cloud Customer DPA |

## Sub-processors NOT used at v1.9

For transparency, we do **not** currently use the following categories of
sub-processor:

- Advertising / retargeting / analytics (no third-party trackers; we run
  first-party analytics in our own AWS account).
- Email service providers other than AWS SES (no SendGrid / Mailchimp /
  Postmark; we will update this list if we add a fallback in v1.9.1).
- Customer support platforms (no Zendesk / Intercom / Front; support is
  handled via direct email).
- Sales / CRM platforms (no Salesforce / HubSpot for Service operation).

## How we evaluate sub-processors

Before engaging a sub-processor, we verify:

1. The sub-processor offers a written DPA compatible with GDPR Art. 28
   and Singapore PDPA.
2. The sub-processor's security posture is industry-standard (we look for
   SOC 2 Type 2 or equivalent).
3. Data residency aligns with our customer commitments.
4. We document the data flow and retention.

## Notification of changes

We notify customers of new sub-processors **30 days before** they begin
processing personal data. Notifications go via:

- Email to the account owner.
- Banner in the dashboard.
- Update to this page (with `last-updated` timestamp).

If you object to a new sub-processor, you may terminate your subscription
without penalty per our Terms of Service §13.

## Contact

For data processing questions:
- Email: `redland2024@gmail.com`
- Subject line: "Sub-processor inquiry"

## Change log

| Date | Change |
|---|---|
| 2026-05-10 | Initial v1.9 sub-processor list (Lane S-A5 v1.9 ralph draft). |
