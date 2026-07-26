# Deployment Activation

Generated: 2026-06-26

This document records the approved deployment path for `KIM3310/dream-interpretation-pages` without storing secrets or forcing a production launch.

## Safe deployment order

1. Run the repository verification command from README/package/CI docs.
2. Review redacted secret-pattern audit findings before publishing.
3. Confirm privacy policy, terms/refund language, and support channel are ready.
4. Deploy a preview or staging build first.
5. Approve production traffic, custom domain/DNS, analytics, email capture, and rollback owner.

## Static hosting references

- Cloudflare Pages docs: https://developers.cloudflare.com/pages/
- Cloudflare Pages Direct Upload: https://developers.cloudflare.com/pages/get-started/direct-upload/
- GitHub Pages publishing source: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Secrets rule

Do not put API keys, payment secrets, database credentials, customer data, or private logs in static bundles or public repositories. Use environment variables and provider dashboards.

The AdSense publisher ID `pub-4973160293737562` and client ID `ca-pub-4973160293737562` are public identifiers for site verification and ad loading. They are intentionally committed in HTML and `ads.txt`; do not store them in `.env` as secrets.

## AdSense activation order

1. Deploy the site with the AdSense Auto Ads script and exact `ads.txt`.
2. Confirm `https://<domain>/ads.txt` returns `google.com, pub-4973160293737562, DIRECT, f08c47fec0942fa0`.
3. In Google AdSense, connect the domain and wait for site approval.
4. After approval, enable Auto Ads in the AdSense dashboard. Do not create manual ad slots in code unless real slot IDs are issued later.
5. For EEA, UK, and Swiss visitors, open AdSense **Privacy & Messaging**, create the GDPR consent message with Google's CMP, select this site, and publish it before serving personalized ads.
6. Keep Auto Ads allowlisted to `/`, `/about`, and `/symbols`. The loader is intentionally absent from `/privacy`, `/contact`, and the GitHub Pages architecture demo.
