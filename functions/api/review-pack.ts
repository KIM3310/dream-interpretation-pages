interface Env {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  SITE_NAME?: string
  TURNSTILE_SECRET_KEY?: string
  RATE_LIMITER?: unknown
}

interface PagesContext {
  request: Request
  env: Env
}

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  })
}

export const onRequestGet = async ({ env }: PagesContext) => {
  const hasApiKey = Boolean(env.OPENAI_API_KEY)
  const hasTurnstile = Boolean(env.TURNSTILE_SECRET_KEY)
  const hasRateLimiter = Boolean(env.RATE_LIMITER)

  return json({
    status: hasApiKey ? "ok" : "degraded",
    service: "dream-interpretation-pages",
    generated_at: new Date().toISOString(),
    readiness_contract: "dream-review-pack-v1",
    headline:
      "Reviewer pack for the Cloudflare Pages dream interpreter: abuse posture, model contract, and content boundary in one route.",
    proof_bundle: {
      interpret_route: "/api/interpret",
      model: env.OPENAI_MODEL ?? "gpt-5.2",
      site_name: env.SITE_NAME ?? "달빛해몽소",
      openai_configured: hasApiKey,
      turnstile_enabled: hasTurnstile,
      kv_rate_limiter_enabled: hasRateLimiter,
      public_fail_closed: !hasTurnstile && !hasRateLimiter,
    },
    trust_boundary: [
      "OpenAI is called only from Pages Functions and never from the browser.",
      "Public deployments fail closed when neither Turnstile nor KV-backed rate limiting is configured.",
      "Interpretations are reference content and must not read like medical, legal, or investment advice.",
    ],
    review_sequence: [
      "Read /api/review-pack before claiming the AI endpoint is public-ready.",
      "Verify abuse posture, then inspect /api/interpret with representative Korean input.",
      "Review content disclaimers and symbolic framing before any monetization or public promotion.",
    ],
    links: {
      review_pack: "/api/review-pack",
      interpret: "/api/interpret",
    },
  })
}
