interface Env {
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  OPENROUTER_API_KEY?: string
  OPENROUTER_MODEL?: string
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
  const hasOpenRouterKey = Boolean(env.OPENROUTER_API_KEY?.trim())
  const hasOpenAiKey = Boolean(env.OPENAI_API_KEY?.trim())
  const hasGeminiKey = Boolean(env.GEMINI_API_KEY?.trim())
  const hasApiKey = hasOpenRouterKey || hasOpenAiKey || hasGeminiKey
  const hasTurnstile = Boolean(env.TURNSTILE_SECRET_KEY)
  const hasRateLimiter = Boolean(env.RATE_LIMITER)

  return json({
    status: hasApiKey ? "ok" : "degraded",
    service: "dream-interpretation-pages",
    generated_at: new Date().toISOString(),
    readiness_contract: "dream-architecture-pack-v1",
    headline:
      "Architecture brief for the Cloudflare Pages dream interpreter: abuse posture, model contract, and content boundary in one route.",
    proof_bundle: {
      interpret_route: "/api/interpret",
      model: hasOpenRouterKey
        ? env.OPENROUTER_MODEL ?? "mistralai/mistral-small-2603"
        : hasOpenAiKey
          ? env.OPENAI_MODEL ?? "gpt-5.2"
          : env.GEMINI_MODEL ?? "gemini-2.5-flash",
      site_name: env.SITE_NAME ?? "달빛해몽소",
      llm_gateway: hasOpenRouterKey
        ? "openrouter"
        : hasOpenAiKey
          ? "openai-compatible"
          : hasGeminiKey
            ? "gemini"
            : "fallback-only",
      gemini_configured: hasGeminiKey,
      openai_configured: hasOpenAiKey,
      openrouter_configured: hasOpenRouterKey,
      turnstile_enabled: hasTurnstile,
      kv_rate_limiter_enabled: hasRateLimiter,
      public_fail_closed: !hasTurnstile && !hasRateLimiter,
    },
    trust_boundary: [
      "LLM providers are called only from Pages Functions and never from the browser.",
      "OpenRouter, OpenAI-compatible, and Gemini keys remain inside the server-only function boundary.",
      "Public deployments fail closed when neither Turnstile nor KV-backed rate limiting is configured.",
      "Interpretations are reference content and must not read like medical, legal, or investment advice.",
    ],
    architecture_sequence: [
      "Read /api/architecture-pack before claiming the AI endpoint is public-ready.",
      "Verify abuse posture, then inspect /api/interpret with representative Korean input.",
      "Review content disclaimers and symbolic framing before any service launch or public promotion.",
    ],
    links: {
      architecture_pack: "/api/architecture-pack",
      interpret: "/api/interpret",
    },
  })
}
