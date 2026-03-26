interface Env {
  GEMINI_API_KEY?: string
  GEMINI_MODEL?: string
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

interface GeminiGenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
      }>
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

const fallbackSymbolCatalog = [
  { match: ['물', '바다', '강', '비'], symbol: '물', meaning: '감정의 흐름과 피로 누적, 컨디션 변화를 함께 비추는 상징', weight: 'high' as const },
  { match: ['시험', '면접', '발표', '평가'], symbol: '평가 장면', meaning: '성과 압박, 준비 불안, 실수에 대한 민감함을 보여주는 상징', weight: 'high' as const },
  { match: ['떨어', '추락', '미끄러'], symbol: '낙하', meaning: '통제감이 흔들리거나 기반이 불안정하다고 느끼는 상태를 반영하는 상징', weight: 'high' as const },
  { match: ['이빨', '치아'], symbol: '이빨', meaning: '체면, 관계 긴장, 말실수에 대한 불안을 드러내는 상징', weight: 'medium' as const },
  { match: ['돈', '지갑', '카드', '결제'], symbol: '돈/결제', meaning: '안정감, 기회, 손실 회피 심리가 동시에 얽힌 장면을 뜻하는 상징', weight: 'medium' as const },
  { match: ['회사', '상사', '출근', '퇴사', '이직'], symbol: '일터', meaning: '역할 부담, 책임감, 진로 방향에 대한 압박을 보여주는 상징', weight: 'medium' as const },
  { match: ['가족', '친구', '연인', '엄마', '아빠'], symbol: '관계 인물', meaning: '관계에서 미처 정리하지 못한 감정과 기대를 드러내는 상징', weight: 'medium' as const },
]

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

  const hasOpenAiKey = Boolean(env.OPENAI_API_KEY)

  if (hasOpenAiKey && requiresDurableAbuseProtection(env)) {
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
  const geminiModel = env.GEMINI_MODEL ?? 'gemini-2.5-flash'
  const siteName = env.SITE_NAME ?? '달빛해몽소'

  if (!hasOpenAiKey && !env.GEMINI_API_KEY) {
    return json(
      buildFallbackInterpretation({
        analysisMode,
        dream,
        emotion,
        focusArea,
        siteName,
        sleepContext,
      }),
      200,
    )
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 12000)

  let upstreamResponse: Response

  try {
    upstreamResponse = hasOpenAiKey
      ? await fetch('https://api.openai.com/v1/chat/completions', {
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
      : await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-goog-api-key': String(env.GEMINI_API_KEY),
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: [
                        `너는 ${siteName}의 한국어 꿈해몽 에디터다.`,
                        '길몽/흉몽으로 단정하지 말고 상징, 감정, 현실 맥락을 연결해서 설명한다.',
                        '의료, 투자, 법률 조언처럼 들리지 않게 하고, 참고용이라는 점을 유지한다.',
                        '반드시 JSON만 출력한다.',
                        '',
                        `꿈 내용: ${dream}`,
                        `최근 감정: ${emotion}`,
                        `꿈 직전 상황: ${sleepContext}`,
                        `해석 깊이: ${analysisModeLabels[analysisMode]}`,
                        `가장 보고 싶은 관점: ${focusAreaLabels[focusArea]}`,
                        '해석은 실서비스형 도구처럼 구조적이고 재사용 가능하게 써라.',
                        '관심 관점에 맞는 연결 요약과 다음에 스스로 적어볼 질문을 반드시 포함해라.',
                        '추천 키워드는 검색/재방문용 짧은 표현 2~4개로 만들어라.',
                        '다음 JSON 키를 반드시 모두 채워라: headline, overallMeaning, emotionalTheme, focusSummary, reflectionQuestion, keySymbols, lifeAreas, recommendedKeywords, actionTip, cautionNote, shareSnippet, disclaimer',
                      ].join('\n'),
                    },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.8,
                responseMimeType: 'application/json',
              },
            }),
            signal: controller.signal,
          },
        )
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return json({ error: '해석 생성 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.' }, 504)
    }

    return json({ error: 'OpenAI 서버와 통신하지 못했습니다. 잠시 후 다시 시도해 주세요.' }, 502)
  } finally {
    clearTimeout(timeoutId)
  }

  let data: ChatCompletionResponse | GeminiGenerateContentResponse

  try {
    data = hasOpenAiKey
      ? await parseJsonResponse<ChatCompletionResponse>(upstreamResponse)
      : await parseJsonResponse<GeminiGenerateContentResponse>(upstreamResponse)
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

  const refusal =
    hasOpenAiKey && 'choices' in data ? data.choices?.[0]?.message?.refusal : undefined

  if (refusal) {
    return json({ error: `모델이 요청을 처리하지 않았습니다: ${refusal}` }, 502)
  }

  const content =
    hasOpenAiKey && 'choices' in data
      ? data.choices?.[0]?.message?.content
      : 'candidates' in data
        ? data.candidates?.[0]?.content?.parts
            ?.map((part: { text?: string }) => part.text ?? '')
            .join('\n')
        : undefined

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

function buildFallbackInterpretation(input: {
  analysisMode: string
  dream: string
  emotion: string
  focusArea: string
  siteName: string
  sleepContext: string
}): DreamInterpretation {
  const symbols = fallbackSymbolCatalog
    .filter((entry) => entry.match.some((token) => input.dream.includes(token)))
    .slice(0, 3)
    .map(({ symbol, meaning, weight }) => ({ symbol, meaning, weight }))

  if (symbols.length === 0) {
    symbols.push({
      symbol: '반복 장면',
      meaning: '아직 정리되지 않은 감정과 현실 고민이 꿈 장면으로 재배치된 것으로 읽을 수 있습니다.',
      weight: 'medium',
    })
  }

  const lifeAreas =
    input.focusArea === 'career'
      ? ['일과 진로', '성과 압박', '자기효능감']
      : input.focusArea === 'relationship'
        ? ['관계', '대화', '경계 설정']
        : input.focusArea === 'money'
          ? ['돈과 기회', '안정감', '의사결정']
          : input.focusArea === 'recovery'
            ? ['회복', '수면 리듬', '정서 안정']
            : ['감정 흐름', '일상 스트레스', '현재 우선순위']

  const keywords = Array.from(
    new Set(
      [
        symbols[0]?.symbol,
        focusAreaLabels[input.focusArea] ?? '전체 흐름',
        input.emotion,
        input.sleepContext,
      ].filter((value): value is string => Boolean(value)),
    ),
  ).slice(0, 4)

  const focusLabel = focusAreaLabels[input.focusArea] ?? '전체 흐름'
  const depthLabel = analysisModeLabels[input.analysisMode] ?? '균형 해석'
  const symbolSummary = symbols.map((item) => item.symbol).join(', ')

  return {
    headline: `${focusLabel} 관점에서 읽는 꿈의 핵심`,
    overallMeaning: `${input.siteName} 기준으로 이 꿈은 '${symbolSummary}' 같은 상징을 통해 현재 스트레스와 기대가 동시에 드러나는 장면으로 읽힙니다. 좋은/나쁜 꿈으로 단정하기보다 지금 가장 신경 쓰이는 현실 과제가 꿈에서 압축된 것으로 보는 편이 자연스럽습니다.`,
    emotionalTheme: `최근 감정이 '${input.emotion}'이고 꿈 직전 맥락이 '${input.sleepContext}'인 점을 보면, 마음이 완전히 정리되기 전 단계에서 경계심과 기대가 함께 올라와 있는 흐름으로 볼 수 있습니다.`,
    focusSummary: `${depthLabel} 기준으로 보면, 이 꿈은 '${focusLabel}' 영역에서 통제감과 안정감을 다시 확보하고 싶은 마음이 두드러집니다. 특히 ${symbols[0]?.symbol ?? '반복 장면'}이 그 욕구를 가장 직접적으로 드러냅니다.`,
    reflectionQuestion: `${focusLabel} 영역에서 지금 가장 먼저 정리해야 하는 현실 이슈 하나를 꼽는다면 무엇인가요? 그리고 그 이슈를 오늘 안에 10분만이라도 가볍게 손댈 수 있을까요?`,
    keySymbols: symbols,
    lifeAreas,
    recommendedKeywords: keywords,
    actionTip: '꿈을 곧바로 예언처럼 해석하기보다, 지금 마음을 가장 많이 잡아끄는 현실 과제 하나와 연결해서 메모해 보세요.',
    cautionNote: '이 해석은 자동 fallback 요약입니다. 실제 API 키가 연결되면 더 풍부한 문장형 해석으로 확장됩니다.',
    shareSnippet: `${focusLabel} 관점에서 보면, 이 꿈은 ${symbols[0]?.symbol ?? '반복 장면'}을 통해 지금 마음이 붙잡고 있는 과제를 보여줍니다.`,
    disclaimer: '참고용 해석이며 의료·법률·투자·진로 결정을 대신하지 않습니다.',
  }
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
