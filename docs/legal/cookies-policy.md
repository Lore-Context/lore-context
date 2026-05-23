---
status: published
last-updated: 2026-05-11
counsel-approved: true
counsel-approval-date: 2026-05-11
applies-to: v1.9.0+
---

# Cookie Policy

This page describes the cookies and similar technologies used by Lore
Cloud (`lorecontext.com` and `dashboard.lorecontext.com`).

Essential cookies are used because they are necessary to provide the Services.
We use non-essential cookies only with your explicit consent (the cookie banner
captures this consent and your choice persists for 365 days).

## Essential cookies (always set; cannot be disabled)

These cookies are required for the Services to function. Disabling them
will break sign-in and core features.

| Name | Purpose | Domain | Lifetime | Type |
|---|---|---|---|---|
| `lore_session` | Authenticated session token | `dashboard.lorecontext.com` | 7 days (sliding) | First-party, HttpOnly, Secure, SameSite=Lax |
| `lore_csrf` | CSRF protection on form submissions | `dashboard.lorecontext.com` | session | First-party, Secure, SameSite=Strict |
| `lore_consent` | Records your cookie consent choice | `lorecontext.com` | 365 days | First-party, Secure, SameSite=Lax |
| `cf_chl_*` | Cloudflare bot/abuse detection | All | session to 30 minutes | Third-party, Secure |

## Functional cookies (set with consent)

These improve your experience but are not strictly required.

| Name | Purpose | Domain | Lifetime | Type |
|---|---|---|---|---|
| `lore_locale` | Remembers your language preference | `lorecontext.com` | 365 days | First-party |
| `lore_theme` | Remembers your theme choice (light/dark) | `dashboard.lorecontext.com` | 365 days | First-party |

## Analytics cookies (set with consent)

We run first-party analytics on our own infrastructure. No third-party
tracking libraries (no Google Analytics, no Mixpanel, no Amplitude on the
public website at v1.9).

| Name | Purpose | Domain | Lifetime | Type |
|---|---|---|---|---|
| `lore_anon_id` | Anonymous visitor identifier for first-party page-view counting | `lorecontext.com` | 30 days | First-party |

## Third-party cookies (set only when you sign in via third-party identity provider)

When you choose to sign in via Auth0 or Google, the identity provider may
set its own cookies on its domain (e.g., `accounts.google.com`,
`auth0.com`). Those are governed by the identity provider's own policies.

## How to manage cookies

- **Banner**: when you first visit our site, a cookie consent banner asks
  you to accept all, reject all, or customize. Your choice persists 365
  days; you can change it later through the cookie banner or dashboard cookie
  settings when available.
- **Browser settings**: you can block cookies in your browser settings.
  Doing so may break sign-in.
- **Do Not Track / Global Privacy Control**: we respect GPC headers; we
  treat GPC as opt-out of all non-essential cookies.

## EU / UK ePrivacy compliance

For visitors in the EU, UK, or other jurisdictions with ePrivacy-style
consent rules:

- We require explicit consent before setting any non-essential cookie.
- The banner has equally prominent "Accept" and "Reject" options (no
  dark patterns).
- Consent is freely revocable from the banner manage link.

## Changes to this policy

We will update this page when we add, remove, or change a cookie. The
`last-updated` field at top reflects the most recent change. Material
changes are communicated via email to active customers.

## Contact

- Email: `redland2024@gmail.com`
- Subject line: "Cookie inquiry"
