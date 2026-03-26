interface Env {
  OPENAI_API_KEY?: string
  OPENAI_MODEL?: string
  SITE_NAME?: string
  TURNSTILE_SECRET_KEY?: string
  RATE_LIMITER?: KVNamespaceLike
  CF_PAGES_BRANCH?: string
}

interface RequestPayload {
  dream: string
  emotion?: string
  sleepContext?: string
  analysisMode?: string
  responseDepth?: string
  focusArea?: string
  turnstileToken?: string
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string
      refusal?: string
    }
  }>
  error?: {
    message?: string
  }
}

interface TurnstileVerificationResponse {
  success?: boolean
}

interface DreamInterpretation {
  headline: string
  overallMeaning: string
  emotionalTheme: string
  focusSummary: string
  reflectionQuestion: string
  keySymbols: Array<{
    symbol: string
    meaning: string
    weight: 'high' | 'medium' | 'low'
  }>
  lifeAreas: string[]
  recommendedKeywords: string[]
  actionTip: string
  cautionNote: string
  shareSnippet: string
  disclaimer: string
}

interface PagesContext {
  request: Request
  env: Env
}

interface KVNamespaceLike {
  get(key: string): Promise<string | null>
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>
}

class UpstreamJsonParseError extends Error {}

const MAX_REQUESTS_PER_MINUTE = 6
const RATE_LIMIT_WINDOW_SECONDS = 60
const localRateLimitStore = new Map<string, { count: number; resetAt: number }>()
const allowedEmotions = new Set(['평온', '긴장', '지침', '기대', '혼란'])
const allowedContexts = new Set([
  '특별한 일 없음',
  '중요한 일정 앞둠',
  '대인관계 스트레스',
  '이직·진로 고민',
  '수면 부족',
])
const allowedAnalysisModes = new Set(['quick', 'balanced', 'deep'])
const allowedFocusAreas = new Set(['general', 'relationship', 'career', 'money', 'recovery'])
const analysisModeLabels: Record<string, string> = {
  quick: '빠른 요약',
  balanced: '균형 해석',
  deep: '깊은 해석',
}
const focusAreaLabels: Record<string, string> = {
  general: '전체 흐름',
  relationship: '관계',
  career: '일과 진로',
  money: '돈과 기회',
  recovery: '내면 회복',
}

export const onRequestPost = async ({ request, env }: PagesContext) => {
  const rateLimitResult = await enforceRateLimit(request, env)

  if (!rateLimitResult.allowed) {
    return json(
      {
        error: `요청이 너무 많습니다. ${rateLimitResult.retryAfterSeconds}초 후 다시 시도해 주세요.`,
      },
      429,
      {
        'Retry-After': String(rateLimitResult.retryAfterSeconds),
      },
    )
  }

  if (!env.OPENAI_API_KEY) {
    return json(
      {
        error: 'OPENAI_API_KEY가 설정되지 않았습니다. Cloudflare Pages 환경변수를 먼저 등록하세요.',
      },
      500,
    )
  }

  if (requiresDurableAbuseProtection(env)) {
    return json(
      {
        error: '공개 배포에서는 TURNSTILE_SECRET_KEY 또는 RATE_LIMITER 설정이 필요합니다.',
      },
      503,
    )
  }

  let payload: RequestPayload

  try {
    payload = (await request.json()) as RequestPayload
  } catch {
    return json({ error: 'JSON 본문을 읽지 못했습니다.' }, 400)
  }

  const dream = payload.dream?.trim()
  const emotion = normalizeChoice(payload.emotion, allowedEmotions, '평온')
  const sleepContext = normalizeChoice(payload.sleepContext, allowedContexts, '특별한 일 없음')
  const analysisMode = normalizeChoice(payload.responseDepth ?? payload.analysisMode, allowedAnalysisModes, 'balanced')
  const focusArea = normalizeChoice(payload.focusArea, allowedFocusAreas, 'general')
  const turnstileToken = payload.turnstileToken?.trim()

  if (!dream || dream.length < 20) {
    return json({ error: '꿈 내용은 최소 20자 이상 입력해 주세요.' }, 400)
  }

  if (dream.length > 1200) {
    return json({ error: '꿈 내용은 1200자 이하로 입력해 주세요.' }, 400)
  }

  if (env.TURNSTILE_SECRET_KEY) {
    if (!turnstileToken) {
      return json({ error: '자동 호출 방지 검증이 필요합니다.' }, 400)
    }

    const verification = await verifyTurnstile({
      secret: env.TURNSTILE_SECRET_KEY,
      token: turnstileToken,
      remoteIp: request.headers.get('CF-Connecting-IP') ?? undefined,
    })

    if (!verification.success) {
      return json({ error: '자동 호출 방지 검증에 실패했습니다.' }, 403)
    }
  }

  const model = env.OPENAI_MODEL ?? 'gpt-5.2'
  const siteName = env.SITE_NAME ?? '달빛해몽소'

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  let upstreamResponse: Response

  try {
    upstreamResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.8,
        messages: [
          {
            role: 'system',
            content: [
              `너는 ${siteName}의 한국어 꿈해몽 에디터다.`,
              '길몽/흉몽으로 단정하지 말고 상징, 감정, 현실 맥락을 연결해서 설명한다.',
              '의료, 투자, 법률 조언처럼 들리지 않게 하고, 참고용이라는 점을 유지한다.',
              '반드시 JSON만 출력한다.',
            ].join(' '),
          },
          {
            role: 'user',
            content: [
              `꿈 내용: ${dream}`,
              `최근 감정: ${emotion}`,
              `꿈 직전 상황: ${sleepContext}`,
              `해석 깊이: ${analysisModeLabels[analysisMode]}`,
              `가장 보고 싶은 관점: ${focusAreaLabels[focusArea]}`,
              '해석은 실서비스형 도구처럼 구조적이고 재사용 가능하게 써라.',
              '관심 관점에 맞는 연결 요약과 다음에 스스로 적어볼 질문을 반드시 포함해라.',
              '추천 키워드는 검색/재방문용 짧은 표현 2~4개로 만들어라.',
              '아래 스키마에 맞춰 해석해라.',
            ].join('\n'),
          },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'dream_interpretation',
            strict: true,
            schema: {
              type: 'object',
              additionalProperties: false,
              properties: {
                headline: { type: 'string' },
                overallMeaning: { type: 'string' },
                emotionalTheme: { type: 'string' },
                focusSummary: { type: 'string' },
                reflectionQuestion: { type: 'string' },
                keySymbols: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 4,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      symbol: { type: 'string' },
                      meaning: { type: 'string' },
                      weight: {
                        type: 'string',
                        enum: ['high', 'medium', 'low'],
                      },
                    },
                    required: ['symbol', 'meaning', 'weight'],
                  },
                },
                lifeAreas: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 4,
                  items: { type: 'string' },
                },
                recommendedKeywords: {
                  type: 'array',
                  minItems: 2,
                  maxItems: 4,
                  items: { type: 'string' },
                },
                actionTip: { type: 'string' },
                cautionNote: { type: 'string' },
                shareSnippet: { type: 'string' },
                disclaimer: { type: 'string' },
              },
              required: [
                'headline',
                'overallMeaning',
                'emotionalTheme',
                'focusSummary',
                'reflectionQuestion',
                'keySymbols',
                'lifeAreas',
                'recommendedKeywords',
                'actionTip',
                'cautionNote',
                'shareSnippet',
                'disclaimer',
              ],
            },
          },
        },
      }),
      signal: controller.signal,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return json({ error: '해석 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.' }, 504)
    }

    return json({ error: 'OpenAI 서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 502)
  } finally {
    clearTimeout(timeoutId)
  }

  let data: ChatCompletionResponse

  try {
    data = await parseJsonResponse<ChatCompletionResponse>(upstreamResponse)
  } catch (error) {
    if (error instanceof UpstreamJsonParseError) {
      return json({ error: 'OpenAI 응답 형식을 해석하지 못했습니다.' }, 502)
    }

    return json({ error: 'OpenAI 응답 처리 중 오류가 발생했습니다.' }, 502)
  }

  if (!upstreamResponse.ok) {
    return json(
      {
        error: data.error?.message ?? 'OpenAI 응답 생성에 실패했습니다.',
      },
      upstreamResponse.status,
    )
  }

  const refusal = data.choices?.[0]?.message?.refusal

  if (refusal) {
    return json({ error: `모델이 요청을 처리하지 않았습니다: ${refusal}` }, 502)
  }

  const content = data.choices?.[0]?.message?.content

  if (!content) {
    return json({ error: 'OpenAI 응답 본문이 비어 있습니다.' }, 502)
  }

  let interpretation: DreamInterpretation

  try {
    interpretation = JSON.parse(content) as DreamInterpretation
  } catch {
    return json({ error: 'OpenAI JSON 응답을 해석하지 못했습니다.' }, 502)
  }

  return json(interpretation, 200)
}

function normalizeChoice(value: string | undefined, choices: Set<string>, fallback: string) {
  const normalized = value?.trim() ?? ''

  if (!normalized) {
    return fallback
  }

  if (normalized.length > 40) {
    return fallback
  }

  return choices.has(normalized) ? normalized : fallback
}

async function enforceRateLimit(request: Request, env: Env) {
  const ip = request.headers.get('CF-Connecting-IP') ?? 'local'
  const bucket = Math.floor(Date.now() / (RATE_LIMIT_WINDOW_SECONDS * 1000))
  const retryAfterSeconds = RATE_LIMIT_WINDOW_SECONDS

  if (env.RATE_LIMITER) {
    const key = `rate:${ip}:${bucket}`
    const current = Number((await env.RATE_LIMITER.get(key)) ?? '0')

    if (current >= MAX_REQUESTS_PER_MINUTE) {
      return { allowed: false, retryAfterSeconds }
    }

    await env.RATE_LIMITER.put(key, String(current + 1), {
      expirationTtl: RATE_LIMIT_WINDOW_SECONDS,
    })

    return { allowed: true, retryAfterSeconds }
  }

  const now = Date.now()
  const stored = localRateLimitStore.get(ip)

  if (!stored || stored.resetAt <= now) {
    localRateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_SECONDS * 1000,
    })
    return { allowed: true, retryAfterSeconds }
  }

  if (stored.count >= MAX_REQUESTS_PER_MINUTE) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((stored.resetAt - now) / 1000)),
    }
  }

  stored.count += 1
  localRateLimitStore.set(ip, stored)
  return { allowed: true, retryAfterSeconds }
}

function json(
  body: Record<string, unknown> | DreamInterpretation,
  status: number,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
  })
}

async function verifyTurnstile({
  secret,
  token,
  remoteIp,
}: {
  secret: string
  token: string
  remoteIp?: string
}) {
  const body = new URLSearchParams({
    secret,
    response: token,
  })

  if (remoteIp) {
    body.set('remoteip', remoteIp)
  }

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    })

    if (!response.ok) {
      return { success: false }
    }

    return (await response.json()) as TurnstileVerificationResponse
  } catch {
    return { success: false }
  }
}

async function parseJsonResponse<T>(response: Response) {
  const text = await response.text()

  try {
    return JSON.parse(text) as T
  } catch {
    throw new UpstreamJsonParseError('Failed to parse upstream JSON')
  }
}

function requiresDurableAbuseProtection(env: Env) {
  const isLocalPreview = env.CF_PAGES_BRANCH === 'local'

  if (isLocalPreview) {
    return false
  }

  return !env.TURNSTILE_SECRET_KEY && !env.RATE_LIMITER
}
