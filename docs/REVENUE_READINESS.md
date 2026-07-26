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
- The site uses the AdSense Auto Ads script consistently on every HTML entry point. Auto Ads should be enabled from the AdSense dashboard after Google approves the site.
- Do not add manual ad units or invented ad slot IDs before approval.
- `ads.txt` must contain exactly: `google.com, pub-4973160293737562, DIRECT, f08c47fec0942fa0`.
- For EEA, UK, and Swiss traffic, enable Google AdSense **Privacy & Messaging** in the AdSense dashboard and publish the Google CMP consent message before serving personalized ads.
- content publishing cadence
