# Future Work

## Immediate Release Tasks

- Set `OPENAI_API_KEY` in Cloudflare Pages secrets and verify a real successful interpretation flow.
- Configure at least one durable protection layer for the paid API path.
  Use `TURNSTILE_SECRET_KEY` or a KV binding named `RATE_LIMITER`.
- Replace placeholder operator emails in `contact.html`.
- Replace `public/ads.txt` with the real publisher line after AdSense approval.
- Run one live deployment smoke test on the production URL.

## Product Upgrades

- Add original long-form symbol articles so the site has more search-worthy content than the form itself.
- Add “save favorite reading” and “compare two readings” UI if a database is introduced later.
- Add an input wizard for users who do not know how to describe a dream clearly.
- Add multilingual support only after the Korean flow is stable.
- Tune prompts and result structure using real OpenAI responses instead of missing-key fallback checks.

## Engineering Improvements

- Add automated browser tests for:
  draft restore, history filter/search, compare card, copy/share/export flows.
- Add a small set of API contract tests for `/api/interpret`.
- Add deployment-time validation for required secrets and bindings.
- Consider moving repeated static content blocks into structured data or a tiny content module for maintainability.
- Remove unused starter assets in `src/assets/` if they are no longer needed.

## Operations

- Monitor OpenAI usage and rate-limit events after launch.
- Review CSP when adding external scripts such as AdSense or analytics.
- Keep Wrangler and related dev dependencies updated.
- Add basic uptime/error monitoring once a real domain is connected.
