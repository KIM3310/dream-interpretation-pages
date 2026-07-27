# Revenue Strategy

This document records the commercial assumptions for this repository. They are planning recommendations, not revenue guarantees; update them after material product or market changes.

## Commercial position

- Commercial role: **audience-growth experiment**
- Primary monetization path: **content SEO / ads-affiliate candidate**
- Secondary positioning: **public product demonstration**
- Technology profile: node, python, static-web

## Next revenue action

Clarify the buyer problem, package the demo, and add one clear contact or pilot CTA.

## Resource/account needs

- SEO metadata
- analytics
- ad/affiliate account

## AdSense readiness contract

- Public publisher ID: `pub-4973160293737562`.
- Public AdSense client ID: `ca-pub-4973160293737562`.
- These IDs are public account identifiers for site verification and ad script loading; they are not secrets and must not be moved into `.env` files.
- `dream-interpretation-pages.pages.dev` is connected, ownership verification passed, and Google site review is pending.
- The AdSense loader is restricted to `/`, `/about`, and `/symbols`. Auto Ads should be enabled from the AdSense dashboard only after Google approves the site.
- Do not add manual ad units or invented ad slot IDs before approval.
- `ads.txt` must contain exactly: `google.com, pub-4973160293737562, DIRECT, f08c47fec0942fa0`.
- The Google AdSense **Privacy & Messaging** CMP for EEA, UK, and Swiss traffic is published with consent, refusal, and preference-management choices.
- The US state opt-out message targets all current and future supported states and is saved as a draft. Publish it after uploading `public/consent-logo.png` as the AdSense site logo.
- AdSense has not exposed a payment-method form at the current zero balance. Add the payout bank account in the dashboard when Google unlocks that step.
- The Google Search Console URL-prefix property uses `public/google6acd7e6449ca4477.html` for persistent ownership verification.
