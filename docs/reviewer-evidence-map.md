# Review Guide - Dream Interpretation Pages

Updated: 2026-05-30

Use this page as the short path through the repository. It keeps the review grounded in the code, docs, commands, and boundaries that are already present.

## Summary

| Field | Notes |
|---|---|
| Lane | B2C consumer AI and ads funnel |
| Core idea | Cloudflare Pages app with safe fallback, lightweight personalization, and monetizable content paths. |
| Primary reader | Consumer AI users, content communities, and SEO-driven entertainment/reflection traffic. |
| Stack | TypeScript/JavaScript, Cloudflare |

## Open First

1. Start with the README fast path and architecture section.
2. Open `docs/monetization-playbook.md` only when reviewing the product or service angle.
3. Check the commands below before making claims about quality.
4. Skim the CI workflows and fixture data before deeper implementation review.
5. Read the boundaries section before presenting the project externally.

## Checks

| Purpose | Command |
|---|---|
| Full local gate | `npm run verify` |
| Production build | `npm run build` |

## CI

- .github/workflows/architecture-blueprint.yml
- .github/workflows/ci.yml
- .github/workflows/dependency-review.yml
- .github/workflows/repository-health.yml
- .github/workflows/repository-surface.yml
- .github/workflows/secret-scan.yml

## Evidence

- package scripts and web/runtime checks
- edge deployment configuration
- npm run verify passes
- Fallback works without keys
- Abuse controls are reviewable

## Commercial Notes

| Possible offer | Working price assumption |
|---|---|
| Ad-supported content site | Ads + affiliate |
| Paid interpretation packs | $3-$9 paid pack |
| Theme/history sync subscription | $4-$8/month sync |

## Boundaries

- Entertainment only
- Privacy and abuse controls needed
- AdSense requires original content depth

## Useful Metrics

- Organic visits
- Interpretation completion
- Pack conversion
