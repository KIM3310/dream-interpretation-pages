import './style.css'

type SymbolWeight = 'high' | 'medium' | 'low'
type FocusValue = 'general' | 'relationship' | 'career' | 'money' | 'recovery'
type DepthValue = 'quick' | 'balanced' | 'deep'

interface SymbolInsight {
  symbol: string
  meaning: string
  weight: SymbolWeight
}

interface DreamInterpretation {
  headline: string
  overallMeaning: string
  emotionalTheme: string
  focusSummary: string
  reflectionQuestion: string
  keySymbols: SymbolInsight[]
  lifeAreas: string[]
  recommendedKeywords: string[]
  actionTip: string
  cautionNote: string
  shareSnippet: string
  disclaimer: string
}

interface HistoryItem {
  id: string
  createdAt: string
  dream: string
  emotion: string
  sleepContext: string
  focusArea: FocusValue
  responseDepth: DepthValue
  result: DreamInterpretation
}

const HISTORY_STORAGE_KEY = 'dream-interpretation-history-v2'
const DRAFT_STORAGE_KEY = 'dream-interpretation-draft-v1'
const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()

const focusModes = [
  {
    value: 'general',
    label: '전체 흐름',
    description: '상징과 감정의 전체 결을 균형 있게 읽습니다.',
  },
  {
    value: 'relationship',
    label: '관계',
    description: '가족, 연인, 친구, 직장 관계에 더 집중합니다.',
  },
  {
    value: 'career',
    label: '일/진로',
    description: '성과 압박, 방향성, 결정 스트레스를 더 봅니다.',
  },
  {
    value: 'money',
    label: '돈/기회',
    description: '불안, 손실 감각, 기회 인식에 초점을 둡니다.',
  },
  {
    value: 'recovery',
    label: '내면 회복',
    description: '피로, 감정 과부하, 회복 신호를 우선 해석합니다.',
  },
] as const satisfies ReadonlyArray<{
  value: FocusValue
  label: string
  description: string
}>

const depthModes = [
  {
    value: 'quick',
    label: '빠르게',
    description: '핵심 요약과 한 줄 행동 팁 중심',
  },
  {
    value: 'balanced',
    label: '균형 있게',
    description: '현재 상황과 상징을 함께 정리',
  },
  {
    value: 'deep',
    label: '깊게',
    description: '감정 패턴과 반추 질문까지 확장',
  },
] as const satisfies ReadonlyArray<{
  value: DepthValue
  label: string
  description: string
}>

const popularDreams = [
  {
    title: '이빨 빠지는 꿈',
    description: '체면, 관계 긴장, 말실수 불안처럼 자존감이 흔들릴 때 자주 연결됩니다.',
  },
  {
    title: '시험 보는 꿈',
    description: '평가받는 상황, 준비 압박, 결과를 통제하고 싶은 마음과 맞닿아 있습니다.',
  },
  {
    title: '하늘을 나는 꿈',
    description: '통제감 회복, 기대감 상승, 혹은 현실 도피 욕구로 갈릴 수 있습니다.',
  },
  {
    title: '물에 빠지는 꿈',
    description: '감정 과부하, 체력 저하, 일상 리듬 붕괴를 점검하라는 신호일 수 있습니다.',
  },
] as const

const useCases = [
  {
    title: '중요한 일정 전날',
    description: '불안이 꿈에서 어떤 상징으로 바뀌는지 보면서 현실 스트레스를 분리해 읽습니다.',
  },
  {
    title: '관계가 계속 걸릴 때',
    description: '꿈속 인물과 장면을 통해 감정의 방향과 미뤄둔 대화를 짚어봅니다.',
  },
  {
    title: '계속 비슷한 꿈을 꿀 때',
    description: '최근 리딩을 저장해두고 패턴이 반복되는지 비교할 수 있게 만듭니다.',
  },
] as const

const faqItems = [
  {
    question: '결과를 그대로 믿고 결정해도 되나요?',
    answer:
      '아니요. 이 사이트는 상징을 정리해주는 참고 도구입니다. 의료, 투자, 법률, 진로 결정을 대신하지 않습니다.',
  },
  {
    question: '왜 최근 리딩을 저장하나요?',
    answer:
      '비슷한 꿈이 반복되는지 비교해야 실서비스처럼 다시 찾아볼 이유가 생기기 때문입니다. 저장은 브라우저 로컬에서만 이뤄집니다.',
  },
  {
    question: '광고를 붙이려면 무엇이 더 필요하나요?',
    answer:
      '폼 하나만으로는 부족합니다. 운영자 소개, 자체 해설 문서, 문의 채널, 정책 페이지를 함께 유지해야 합니다.',
  },
] as const

const loadingTimeline = [
  '꿈의 장면과 상징을 분리하는 중',
  '감정과 현실 맥락을 연결하는 중',
  '행동 가능한 문장으로 정리하는 중',
] as const

const validFocusValues = new Set<FocusValue>(focusModes.map((mode) => mode.value))
const validDepthValues = new Set<DepthValue>(depthModes.map((mode) => mode.value))

const app = document.querySelector<HTMLDivElement>('#app')

if (!app) {
  throw new Error('App container not found')
}

app.innerHTML = `
  <div class="site-shell">
    <header class="topbar reveal">
      <a class="brand" href="/">
        <span class="brand-mark">月</span>
        <span>
          <strong>달빛해몽소</strong>
          <small>Dream Reading Console</small>
        </span>
      </a>
      <nav class="nav-links" aria-label="주요 메뉴">
        <a href="#analyzer">해몽하기</a>
        <a href="#history-board">최근 리딩</a>
        <a href="/symbols">상징 모음</a>
        <a href="/about">소개</a>
        <a href="/privacy">개인정보</a>
        <a href="/contact">문의</a>
      </nav>
    </header>

    <main>
      <section class="hero reveal">
        <div class="hero-copy">
          <p class="eyebrow">Dream Reading Console</p>
          <h1>꿈의 장면을 적고,<br />어떤 관점으로 읽을지 선택하세요.</h1>
          <p class="hero-text">
            단순 길몽/흉몽 카드가 아니라, 입력 품질 가이드, 최근 리딩 저장, 결과 재사용까지
            갖춘 실서비스형 꿈해몽 도구로 구조를 끌어올렸습니다.
          </p>
          <div class="hero-actions">
            <a class="button-primary" href="#analyzer">지금 해몽하기</a>
            <a class="button-secondary" href="#history-board">최근 리딩 보기</a>
          </div>
          <div class="hero-metrics" aria-label="서비스 지표">
            <article class="metric-card">
              <strong id="saved-count">0</strong>
              <span>브라우저에 저장된 리딩</span>
            </article>
            <article class="metric-card">
              <strong id="active-focus-label">전체 흐름</strong>
              <span>현재 해석 포커스</span>
            </article>
            <article class="metric-card">
              <strong>${turnstileSiteKey ? '보호 모드 가능' : '기본 보호 모드'}</strong>
              <span>레이트리밋 + 선택형 Turnstile</span>
            </article>
          </div>
        </div>

        <aside class="hero-panel">
          <div class="panel panel-feature">
            <p class="panel-label">서비스 감각으로 바꾼 포인트</p>
            <ul class="check-list">
              <li>입력 품질 점수와 체크리스트</li>
              <li>관계/일/돈/회복 같은 해석 모드</li>
              <li>최근 리딩 저장과 재호출</li>
              <li>요약 복사와 결과 재사용 액션</li>
            </ul>
          </div>
          <div class="panel service-note">
            <span>운영 메모</span>
            <strong>광고보다 재방문 이유가 먼저입니다.</strong>
            <p>저장된 리딩, 자체 상징 문서, 신뢰 페이지가 있어야 “한 번 보고 끝”나는 도구에서 벗어납니다.</p>
          </div>
        </aside>
      </section>

      <section class="service-strip reveal" aria-label="서비스 특징">
        <article class="signal-card">
          <span>Local state</span>
          <strong>리딩 저장</strong>
          <p>DB 없이 브라우저 로컬에 최근 해석을 저장해서 다시 불러올 수 있습니다.</p>
        </article>
        <article class="signal-card">
          <span>Guided input</span>
          <strong>입력 품질 가이드</strong>
          <p>글자 수, 맥락 밀도, 감정 표현 유무를 실시간으로 보여줘 결과 품질을 끌어올립니다.</p>
        </article>
        <article class="signal-card">
          <span>Service-grade result</span>
          <strong>복사/재사용</strong>
          <p>결과를 바로 복사하고, 이전 입력을 불러와 다시 읽을 수 있게 만들었습니다.</p>
        </article>
      </section>

      <section class="insight-board reveal" aria-label="누적 인사이트">
        <article class="insight-card">
          <span>Archive</span>
          <strong id="dashboard-total">0회</strong>
          <p>이 브라우저에 쌓인 누적 리딩 수</p>
        </article>
        <article class="insight-card">
          <span>Dominant Focus</span>
          <strong id="dashboard-focus">아직 없음</strong>
          <p>가장 자주 선택한 해석 포커스</p>
        </article>
        <article class="insight-card">
          <span>Recurring Symbol</span>
          <strong id="dashboard-symbol">기록 대기 중</strong>
          <p>최근 리딩에서 가장 자주 나온 상징</p>
        </article>
        <article class="insight-card">
          <span>Rhythm</span>
          <strong id="dashboard-rhythm">첫 리딩 준비</strong>
          <p>최근 사용 흐름과 재방문 감각</p>
        </article>
      </section>

      <section id="analyzer" class="analyzer-section reveal">
        <div class="section-heading">
          <p class="eyebrow">Dream Analyzer</p>
          <h2>입력부터 결과까지 “다시 쓰고 싶은 서비스”처럼 설계한 해몽 흐름</h2>
          <p>꿈 장면, 감정, 해석 관점을 함께 받도록 바꿔서 결과가 더 도구답게 나오도록 했습니다.</p>
        </div>

        <div class="analyzer-grid analyzer-grid-upgraded">
          <form id="dream-form" class="panel analyzer-form analyzer-form-upgraded">
            <div class="composer-head">
              <div>
                <span class="section-kicker">입력 품질</span>
                <strong id="quality-score">62점</strong>
              </div>
              <div class="score-meta">
                <span id="char-counter">0 / 1200</span>
                <span id="quality-caption">장면과 감정을 조금 더 적으면 좋아집니다.</span>
              </div>
            </div>
            <div class="score-bar">
              <div id="score-fill" class="score-fill" style="width: 0%"></div>
            </div>

            <label class="field">
              <div class="field-head">
                <span>꿈 내용을 적어주세요</span>
                <small>장소, 인물, 반복된 사물, 마지막 감정을 같이 적는 편이 좋습니다.</small>
              </div>
              <textarea
                id="dream-input"
                name="dream"
                rows="8"
                minlength="20"
                maxlength="1200"
                placeholder="예: 낯선 학교에서 시험을 보는데 문제지가 젖어 있었고, 마지막에는 친구가 웃고 있었습니다. 저는 계속 초조했고 시간이 모자랐습니다."
                required
              ></textarea>
            </label>

            <div class="input-checklist" id="input-checklist">
              <div class="check-item" id="check-length" data-complete="false">80자 이상으로 맥락이 보이게 적기</div>
              <div class="check-item" id="check-detail" data-complete="false">장소/인물/행동 중 2개 이상 드러내기</div>
              <div class="check-item" id="check-emotion" data-complete="false">꿈속 감정과 최근 감정 연결하기</div>
              <div class="check-item" id="check-focus" data-complete="true">해석 포커스 선택 완료</div>
            </div>

            <div class="choice-section">
              <div class="field-head">
                <span>어떤 관점으로 읽을까요?</span>
                <small>결과의 무게 중심을 정합니다.</small>
              </div>
              <div class="choice-grid choice-grid-wide">
                ${focusModes
                  .map(
                    (mode, index) => `
                      <label class="choice-card">
                        <input type="radio" name="focusArea" value="${mode.value}" ${index === 0 ? 'checked' : ''} />
                        <span class="choice-body">
                          <strong>${mode.label}</strong>
                          <small>${mode.description}</small>
                        </span>
                      </label>
                    `,
                  )
                  .join('')}
              </div>
            </div>

            <div class="choice-section">
              <div class="field-head">
                <span>결과 깊이</span>
                <small>짧게 볼지, 조금 더 깊게 볼지 선택합니다.</small>
              </div>
              <div class="choice-grid">
                ${depthModes
                  .map(
                    (mode, index) => `
                      <label class="choice-card choice-card-compact">
                        <input type="radio" name="responseDepth" value="${mode.value}" ${index === 1 ? 'checked' : ''} />
                        <span class="choice-body">
                          <strong>${mode.label}</strong>
                          <small>${mode.description}</small>
                        </span>
                      </label>
                    `,
                  )
                  .join('')}
              </div>
            </div>

            <div class="field-grid">
              <label class="field">
                <span>최근 감정 상태</span>
                <select id="emotion-input" name="emotion">
                  <option value="평온">평온</option>
                  <option value="긴장" selected>긴장</option>
                  <option value="지침">지침</option>
                  <option value="기대">기대</option>
                  <option value="혼란">혼란</option>
                </select>
              </label>

              <label class="field">
                <span>꿈 직전 상황</span>
                <select id="context-input" name="sleepContext">
                  <option value="특별한 일 없음" selected>특별한 일 없음</option>
                  <option value="중요한 일정 앞둠">중요한 일정 앞둠</option>
                  <option value="대인관계 스트레스">대인관계 스트레스</option>
                  <option value="이직·진로 고민">이직·진로 고민</option>
                  <option value="수면 부족">수면 부족</option>
                </select>
              </label>
            </div>

            <div class="quick-examples quick-examples-upgraded">
              <span>빠른 예시</span>
              <button type="button" class="chip-button" data-dream-example="시험을 보는데 시간이 너무 빨리 지나가고 감독관이 계속 저를 쳐다봤습니다. 저는 답을 알고 있는데도 손이 굳는 느낌이었습니다.">시험 꿈</button>
              <button type="button" class="chip-button" data-dream-example="바다가 갑자기 높아지면서 저를 덮쳤고, 숨을 쉬려고 발버둥 쳤습니다. 너무 차갑고 무서웠습니다.">물 꿈</button>
              <button type="button" class="chip-button" data-dream-example="하늘을 천천히 날아가는데 아래 풍경이 아주 선명했고 편안했습니다. 오랜만에 마음이 가벼웠습니다.">비행 꿈</button>
            </div>

            <div class="composer-utility">
              <span id="draft-status" class="draft-status">입력 초안은 이 브라우저에 자동 저장됩니다.</span>
              <button id="clear-draft-button" class="ghost-button" type="button">초안 비우기</button>
            </div>

            <button id="submit-button" class="button-primary submit-button" type="submit">해몽 결과 받기</button>
            ${
              turnstileSiteKey
                ? `
                  <div class="turnstile-wrap">
                    <span>자동 호출 남용 방지</span>
                    <div class="cf-turnstile" data-sitekey="${turnstileSiteKey}" data-theme="light"></div>
                  </div>
                `
                : ''
            }
            <p class="microcopy">입력 내용은 답변 생성을 위해 OpenAI API로 전달됩니다. 민감한 개인정보, 실명, 계정 정보는 적지 마세요.</p>
          </form>

          <div class="results-column results-column-upgraded">
            <div class="panel status-box status-box-upgraded" id="status-box" data-state="idle">
              <strong>대기 중</strong>
              <p>입력 품질이 올라갈수록 결과 품질도 좋아집니다. 폼을 채우면 바로 이 영역에서 진행 상태를 보여줍니다.</p>
            </div>

            <div class="panel pipeline-panel">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Live Pipeline</p>
                  <h3>지금 어떤 단계인지</h3>
                </div>
              </div>
              <ol class="pipeline-list" id="pipeline-list">
                ${loadingTimeline
                  .map(
                    (step, index) => `
                      <li class="pipeline-item" data-step-index="${index}" data-state="${index === 0 ? 'active' : 'idle'}">
                        <span class="pipeline-dot"></span>
                        <div>
                          <strong>STEP ${index + 1}</strong>
                          <p>${step}</p>
                        </div>
                      </li>
                    `,
                  )
                  .join('')}
              </ol>
            </div>

            <section id="result-section" class="panel result-section result-section-upgraded" hidden aria-live="polite">
              <div class="result-header">
                <div>
                  <p class="eyebrow">AI Interpretation</p>
                  <h3 id="result-headline">해석 결과</h3>
                </div>
                <div class="result-meta-block">
                  <span id="result-meta">방금 생성됨</span>
                </div>
              </div>
              <div class="result-toolbar">
                <button id="copy-result-button" class="ghost-button" type="button">요약 복사</button>
                <button id="share-result-button" class="ghost-button" type="button">공유</button>
                <button id="download-result-button" class="ghost-button" type="button">텍스트 저장</button>
                <button id="reuse-result-button" class="ghost-button" type="button">입력 다시 쓰기</button>
              </div>
              <div id="result-body" class="result-body"></div>
            </section>

            <section id="history-board" class="panel history-panel">
              <div class="panel-header">
                <div>
                  <p class="eyebrow">Recent Readings</p>
                  <h3>최근 저장한 리딩</h3>
                </div>
                <div class="history-panel-actions">
                  <button id="export-history-button" class="ghost-button" type="button">기록 저장</button>
                  <button id="clear-history-button" class="ghost-button" type="button">기록 비우기</button>
                </div>
              </div>
              <div class="history-toolbar">
                <label class="history-search">
                  <span>기록 검색</span>
                  <input id="history-search-input" type="search" placeholder="제목, 요약, 키워드 검색" />
                </label>
                <div class="history-filter-row" role="tablist" aria-label="기록 필터">
                  <button type="button" class="history-filter-chip is-active" data-history-filter="all">전체</button>
                  ${focusModes
                    .map(
                      (mode) => `
                        <button type="button" class="history-filter-chip" data-history-filter="${mode.value}">${mode.label}</button>
                      `,
                    )
                    .join('')}
                </div>
              </div>
              <div id="history-list" class="history-list"></div>
            </section>
          </div>
        </div>
      </section>

      <section class="content-band reveal">
        <div class="section-heading narrow">
          <p class="eyebrow">Use Cases</p>
          <h2>실제 서비스처럼 다시 들어오게 만드는 사용 맥락</h2>
        </div>
        <div class="use-grid">
          ${useCases
            .map(
              (item) => `
                <article class="content-card use-card">
                  <h3>${item.title}</h3>
                  <p>${item.description}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="content-band reveal">
        <div class="section-heading narrow">
          <p class="eyebrow">Popular Dreams</p>
          <h2>검색 유입용이면서도 실제로 도움이 되는 기본 상징 콘텐츠</h2>
        </div>
        <div class="card-grid">
          ${popularDreams
            .map(
              (item) => `
                <article class="content-card">
                  <h3>${item.title}</h3>
                  <p>${item.description}</p>
                </article>
              `,
            )
            .join('')}
        </div>
      </section>

      <section class="trust-section reveal">
        <div class="section-heading narrow">
          <p class="eyebrow">Trust Layer</p>
          <h2>실서비스처럼 보이게 만드는 운영 신호</h2>
        </div>
        <div class="trust-grid">
          <article class="panel trust-card">
            <h3>서버측 OpenAI 호출</h3>
            <p>키는 클라이언트에 노출되지 않고, Pages Functions에서만 호출됩니다.</p>
          </article>
          <article class="panel trust-card">
            <h3>로컬 저장 기반 재방문</h3>
            <p>DB 없이도 최근 리딩을 다시 불러와 비교할 수 있게 했습니다.</p>
          </article>
          <article class="panel trust-card">
            <h3>광고보다 신뢰 우선</h3>
            <p>광고 위치는 남겨두되, 실제 운영자 정보와 정책 페이지를 먼저 깔아둡니다.</p>
          </article>
        </div>
      </section>

      <section class="faq-section reveal">
        <div class="section-heading narrow">
          <p class="eyebrow">FAQ</p>
          <h2>운영 전에 자주 막히는 지점</h2>
        </div>
        <div class="faq-list">
          ${faqItems
            .map(
              (item) => `
                <details class="faq-item">
                  <summary>${item.question}</summary>
                  <p>${item.answer}</p>
                </details>
              `,
            )
            .join('')}
        </div>
      </section>
    </main>

    <footer class="site-footer reveal">
      <div>
        <strong>달빛해몽소</strong>
        <p>입력 품질 가이드, 최근 리딩 저장, 보안 기본값까지 넣은 꿈해몽 마이크로서비스 프로토타입.</p>
      </div>
      <nav class="footer-links" aria-label="바닥글 메뉴">
        <a href="/about">소개</a>
        <a href="/symbols">상징 모음</a>
        <a href="/privacy">개인정보 처리방침</a>
        <a href="/contact">문의</a>
      </nav>
    </footer>
  </div>
`

const form = document.querySelector<HTMLFormElement>('#dream-form')
const dreamInput = document.querySelector<HTMLTextAreaElement>('#dream-input')
const emotionInput = document.querySelector<HTMLSelectElement>('#emotion-input')
const contextInput = document.querySelector<HTMLSelectElement>('#context-input')
const submitButton = document.querySelector<HTMLButtonElement>('#submit-button')
const statusBox = document.querySelector<HTMLDivElement>('#status-box')
const resultSection = document.querySelector<HTMLElement>('#result-section')
const resultHeadline = document.querySelector<HTMLHeadingElement>('#result-headline')
const resultBody = document.querySelector<HTMLDivElement>('#result-body')
const resultMeta = document.querySelector<HTMLSpanElement>('#result-meta')
const copyResultButton = document.querySelector<HTMLButtonElement>('#copy-result-button')
const shareResultButton = document.querySelector<HTMLButtonElement>('#share-result-button')
const downloadResultButton = document.querySelector<HTMLButtonElement>('#download-result-button')
const reuseResultButton = document.querySelector<HTMLButtonElement>('#reuse-result-button')
const charCounter = document.querySelector<HTMLSpanElement>('#char-counter')
const qualityScore = document.querySelector<HTMLSpanElement>('#quality-score')
const qualityCaption = document.querySelector<HTMLSpanElement>('#quality-caption')
const scoreFill = document.querySelector<HTMLDivElement>('#score-fill')
const historyList = document.querySelector<HTMLDivElement>('#history-list')
const clearHistoryButton = document.querySelector<HTMLButtonElement>('#clear-history-button')
const exportHistoryButton = document.querySelector<HTMLButtonElement>('#export-history-button')
const clearDraftButton = document.querySelector<HTMLButtonElement>('#clear-draft-button')
const draftStatus = document.querySelector<HTMLSpanElement>('#draft-status')
const historySearchInput = document.querySelector<HTMLInputElement>('#history-search-input')
const savedCount = document.querySelector<HTMLSpanElement>('#saved-count')
const activeFocusLabel = document.querySelector<HTMLSpanElement>('#active-focus-label')
const dashboardTotal = document.querySelector<HTMLSpanElement>('#dashboard-total')
const dashboardFocus = document.querySelector<HTMLSpanElement>('#dashboard-focus')
const dashboardSymbol = document.querySelector<HTMLSpanElement>('#dashboard-symbol')
const dashboardRhythm = document.querySelector<HTMLSpanElement>('#dashboard-rhythm')
const quickButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-dream-example]'))
const historyFilterButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-history-filter]'))
const pipelineItems = Array.from(document.querySelectorAll<HTMLElement>('.pipeline-item'))
const checklistLength = document.querySelector<HTMLDivElement>('#check-length')
const checklistDetail = document.querySelector<HTMLDivElement>('#check-detail')
const checklistEmotion = document.querySelector<HTMLDivElement>('#check-emotion')
const checklistFocus = document.querySelector<HTMLDivElement>('#check-focus')

if (
  !form ||
  !dreamInput ||
  !emotionInput ||
  !contextInput ||
  !submitButton ||
  !statusBox ||
  !resultSection ||
  !resultHeadline ||
  !resultBody ||
  !resultMeta ||
  !copyResultButton ||
  !shareResultButton ||
  !downloadResultButton ||
  !reuseResultButton ||
  !charCounter ||
  !qualityScore ||
  !qualityCaption ||
  !scoreFill ||
  !historyList ||
  !clearHistoryButton ||
  !exportHistoryButton ||
  !clearDraftButton ||
  !draftStatus ||
  !historySearchInput ||
  !savedCount ||
  !activeFocusLabel ||
  !dashboardTotal ||
  !dashboardFocus ||
  !dashboardSymbol ||
  !dashboardRhythm ||
  !checklistLength ||
  !checklistDetail ||
  !checklistEmotion ||
  !checklistFocus
) {
  throw new Error('Required UI elements are missing')
}

const ui = {
  form,
  dreamInput,
  emotionInput,
  contextInput,
  submitButton,
  statusBox,
  resultSection,
  resultHeadline,
  resultBody,
  resultMeta,
  copyResultButton,
  shareResultButton,
  downloadResultButton,
  reuseResultButton,
  charCounter,
  qualityScore,
  qualityCaption,
  scoreFill,
  historyList,
  clearHistoryButton,
  exportHistoryButton,
  clearDraftButton,
  draftStatus,
  historySearchInput,
  savedCount,
  activeFocusLabel,
  dashboardTotal,
  dashboardFocus,
  dashboardSymbol,
  dashboardRhythm,
  checklistLength,
  checklistDetail,
  checklistEmotion,
  checklistFocus,
} as const

let historyItems = loadHistory()
let loadingTickerId: number | null = null
let currentSnapshot: HistoryItem | null = null
let activeHistoryFilter: FocusValue | 'all' = 'all'
let historySearchTerm = ''
let skipNextDraftPersist = false

restoreDraft()

quickButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const example = button.dataset.dreamExample

    if (!example) {
      return
    }

    ui.dreamInput.value = example
    ui.dreamInput.focus()
    updateComposerState()
  })
})

if (turnstileSiteKey) {
  const script = document.createElement('script')
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
  script.async = true
  script.defer = true
  document.head.append(script)
}

ui.dreamInput.addEventListener('input', updateComposerState)
ui.emotionInput.addEventListener('change', updateComposerState)
ui.contextInput.addEventListener('change', updateComposerState)
ui.dreamInput.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
    event.preventDefault()
    ui.form.requestSubmit()
  }
})

Array.from(ui.form.querySelectorAll<HTMLInputElement>('input[name="focusArea"], input[name="responseDepth"]')).forEach((input) => {
  input.addEventListener('change', updateComposerState)
})

ui.historySearchInput.addEventListener('input', () => {
  historySearchTerm = ui.historySearchInput.value.trim().toLowerCase()
  renderHistory()
})

historyFilterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    activeHistoryFilter = (button.dataset.historyFilter as FocusValue | 'all' | undefined) ?? 'all'
    syncHistoryFilterButtons()
    renderHistory()
  })
})

ui.copyResultButton.addEventListener('click', () => {
  void copyCurrentResult()
})

ui.shareResultButton.addEventListener('click', () => {
  void shareCurrentResult()
})

ui.downloadResultButton.addEventListener('click', () => {
  downloadCurrentResult()
})

ui.reuseResultButton.addEventListener('click', () => {
  ui.dreamInput.focus()
  ui.dreamInput.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

ui.historyList.addEventListener('click', (event) => {
  const target = event.target

  if (!(target instanceof HTMLElement)) {
    return
  }

  const actionButton = target.closest<HTMLButtonElement>('[data-history-action]')

  if (!actionButton) {
    return
  }

  const itemId = actionButton.dataset.historyId

  if (!itemId) {
    return
  }

  if (actionButton.dataset.historyAction === 'load') {
    restoreHistoryItem(itemId)
    return
  }

  if (actionButton.dataset.historyAction === 'copy') {
    void copyHistoryItem(itemId)
    return
  }

  if (actionButton.dataset.historyAction === 'delete') {
    deleteHistoryItem(itemId)
  }
})

ui.clearHistoryButton.addEventListener('click', () => {
  historyItems = []
  historySearchTerm = ''
  activeHistoryFilter = 'all'
  ui.historySearchInput.value = ''
  persistHistory(historyItems)
  syncHistoryFilterButtons()
  renderHistory()
  syncServiceMetrics()
  updateStatus('idle', '저장된 리딩을 비웠습니다.')
})

ui.exportHistoryButton.addEventListener('click', () => {
  exportHistory()
})

ui.clearDraftButton.addEventListener('click', () => {
  clearDraft()
  updateStatus('idle', '입력 초안을 비웠습니다.')
})

ui.form.addEventListener('submit', async (event) => {
  event.preventDefault()

  const dream = ui.dreamInput.value.trim()
  const emotion = ui.emotionInput.value
  const sleepContext = ui.contextInput.value
  const focusArea = getSelectedFocus()
  const responseDepth = getSelectedDepth()
  const turnstileToken = ui.form.querySelector<HTMLInputElement>('input[name="cf-turnstile-response"]')?.value?.trim()

  if (dream.length < 20) {
    updateStatus('error', '입력 길이가 너무 짧습니다. 장면과 감정을 조금 더 적어주세요.')
    return
  }

  if (turnstileSiteKey && !turnstileToken) {
    updateStatus('error', '자동 호출 방지 확인이 끝난 뒤 다시 시도해 주세요.')
    return
  }

  ui.submitButton.disabled = true
  ui.submitButton.textContent = '해석 중...'
  ui.resultSection.hidden = true
  updateStatus('loading', loadingTimeline[0])
  startLoadingTimeline()

  try {
    const response = await fetch('/api/interpret', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        dream,
        emotion,
        sleepContext,
        focusArea,
        responseDepth,
        turnstileToken,
      }),
    })

    const payload = (await response.json()) as DreamInterpretation | { error?: string }

    if (!response.ok) {
      const message = 'error' in payload ? payload.error : undefined
      throw new Error(message ?? '해석 요청에 실패했습니다.')
    }

    const snapshot: HistoryItem = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      dream,
      emotion,
      sleepContext,
      focusArea,
      responseDepth,
      result: payload as DreamInterpretation,
    }

    currentSnapshot = snapshot
    saveHistoryItem(snapshot)
    renderResult(snapshot)
    updateStatus('success', '해석이 완료되었습니다. 아래 결과를 저장된 리딩처럼 다시 불러올 수도 있습니다.')
    finishLoadingTimeline('success')
  } catch (error) {
    finishLoadingTimeline('error')
    const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
    updateStatus('error', message)
  } finally {
    ui.submitButton.disabled = false
    ui.submitButton.textContent = '해몽 결과 받기'
  }
})

updateComposerState()
renderHistory()
syncServiceMetrics()
syncHistoryFilterButtons()
resetPipelineState()

function updateComposerState() {
  const dream = ui.dreamInput.value.trim()
  const emotion = ui.emotionInput.value
  const focusLabel = focusLabelFor(getSelectedFocus())
  const score = calculateComposerScore(dream)
  const hasLength = dream.length >= 80
  const hasDetail = hasRichDetail(dream)
  const hasEmotion = emotion.length > 0 && /(불안|긴장|초조|무섭|편안|기쁘|슬프|답답|가벼|압박|지침|기대|혼란)/.test(`${dream} ${emotion}`)

  ui.charCounter.textContent = `${dream.length} / 1200`
  ui.qualityScore.textContent = `${score}점`
  ui.scoreFill.style.width = `${score}%`
  ui.qualityCaption.textContent =
    score >= 80 ? '실서비스 수준으로 입력이 잘 잡혔습니다.' : score >= 55 ? '맥락은 보이지만 장면과 감정을 조금 더 보강해보세요.' : '장소, 인물, 마지막 감정을 조금 더 구체적으로 적는 편이 좋습니다.'
  ui.activeFocusLabel.textContent = focusLabel

  updateChecklistItem(ui.checklistLength, hasLength)
  updateChecklistItem(ui.checklistDetail, hasDetail)
  updateChecklistItem(ui.checklistEmotion, hasEmotion)
  updateChecklistItem(ui.checklistFocus, true)

  if (skipNextDraftPersist) {
    skipNextDraftPersist = false
    return
  }

  persistDraft()
}

function updateChecklistItem(element: HTMLElement, complete: boolean) {
  element.dataset.complete = complete ? 'true' : 'false'
}

function calculateComposerScore(dream: string) {
  let score = 18

  score += Math.min(42, Math.floor(dream.length / 4))

  if (hasRichDetail(dream)) {
    score += 18
  }

  if (dream.length >= 160) {
    score += 10
  }

  if (/[,.!?]|그리고|갑자기|마지막|그런데/.test(dream)) {
    score += 12
  }

  return Math.min(100, score)
}

function hasRichDetail(dream: string) {
  const placeOrObject = /(학교|집|방|바다|길|회사|하늘|교실|산|시장|차|문|시험|물|계단|건물|방문|창문|엘리베이터)/
  const personOrAction = /(엄마|아빠|친구|가족|선생|동료|연인|아이|낯선 사람|뛰|도망|울|웃|날|빠지|찾|말했|쫓)/ 
  return placeOrObject.test(dream) && personOrAction.test(dream)
}

function startLoadingTimeline() {
  stopLoadingTimeline()
  setPipelineState(0, 'active')
  let currentIndex = 0

  loadingTickerId = window.setInterval(() => {
    currentIndex = (currentIndex + 1) % loadingTimeline.length
    setPipelineState(currentIndex, 'active')
    updateStatus('loading', loadingTimeline[currentIndex])
  }, 950)
}

function stopLoadingTimeline() {
  if (loadingTickerId !== null) {
    window.clearInterval(loadingTickerId)
    loadingTickerId = null
  }
}

function finishLoadingTimeline(state: 'success' | 'error') {
  stopLoadingTimeline()

  pipelineItems.forEach((item, index) => {
    item.dataset.state = state === 'success' ? 'done' : index === 0 ? 'error' : 'idle'
  })
}

function resetPipelineState() {
  pipelineItems.forEach((item) => {
    item.dataset.state = 'idle'
  })
}

function setPipelineState(activeIndex: number, state: 'active') {
  pipelineItems.forEach((item, index) => {
    if (index < activeIndex) {
      item.dataset.state = 'done'
      return
    }

    item.dataset.state = index === activeIndex ? state : 'idle'
  })
}

function updateStatus(state: 'idle' | 'loading' | 'success' | 'error', message: string) {
  const titles = {
    idle: '대기 중',
    loading: '해석 중',
    success: '완료',
    error: '오류',
  } as const

  ui.statusBox.dataset.state = state
  ui.statusBox.innerHTML = `
    <strong>${titles[state]}</strong>
    <p>${escapeHtml(message)}</p>
  `
}

function renderResult(snapshot: HistoryItem) {
  currentSnapshot = snapshot
  const previousSnapshot = historyItems.find((item) => item.id !== snapshot.id)
  ui.resultHeadline.textContent = snapshot.result.headline
  ui.resultMeta.textContent = `${formatDate(snapshot.createdAt)} · ${focusLabelFor(snapshot.focusArea)} · ${depthLabelFor(snapshot.responseDepth)}`
  ui.resultBody.innerHTML = `
    <div class="result-grid result-grid-dense">
      <article class="result-card">
        <h4>전체 해석</h4>
        <p>${escapeHtml(snapshot.result.overallMeaning)}</p>
      </article>
      <article class="result-card">
        <h4>핵심 감정</h4>
        <p>${escapeHtml(snapshot.result.emotionalTheme)}</p>
      </article>
      <article class="result-card">
        <h4>선택한 포커스 연결</h4>
        <p>${escapeHtml(snapshot.result.focusSummary)}</p>
      </article>
      <article class="result-card">
        <h4>지금 연결되는 영역</h4>
        <div class="tag-row">
          ${snapshot.result.lifeAreas.map((area) => `<span class="tag">${escapeHtml(area)}</span>`).join('')}
        </div>
      </article>
    </div>

    <article class="result-card result-card-wide">
      <h4>상징 해석</h4>
      <div class="symbol-list">
        ${snapshot.result.keySymbols
          .map(
            (item) => `
              <div class="symbol-item">
                <div>
                  <strong>${escapeHtml(item.symbol)}</strong>
                  <p>${escapeHtml(item.meaning)}</p>
                </div>
                <span class="weight-badge" data-weight="${item.weight}">${weightLabel(item.weight)}</span>
              </div>
            `,
          )
          .join('')}
      </div>
    </article>

    <div class="result-grid result-grid-dense">
      <article class="result-card">
        <h4>추천 키워드</h4>
        <div class="keyword-row">
          ${snapshot.result.recommendedKeywords.map((keyword) => `<span class="keyword-chip">${escapeHtml(keyword)}</span>`).join('')}
        </div>
      </article>
      <article class="result-card">
        <h4>다음에 적어볼 질문</h4>
        <p>${escapeHtml(snapshot.result.reflectionQuestion)}</p>
      </article>
    </div>

    <article class="result-card result-card-wide">
      <h4>현실 행동 팁</h4>
      <p>${escapeHtml(snapshot.result.actionTip)}</p>
      <blockquote>${escapeHtml(snapshot.result.shareSnippet)}</blockquote>
      <small>${escapeHtml(snapshot.result.cautionNote)}</small>
      <small>${escapeHtml(snapshot.result.disclaimer)}</small>
    </article>

    ${buildComparisonCard(snapshot, previousSnapshot)}
  `

  ui.resultSection.hidden = false
  ui.resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function buildComparisonCard(current: HistoryItem, previous?: HistoryItem) {
  if (!previous) {
    return `
      <article class="result-card result-card-wide comparison-card">
        <h4>이전 리딩과의 비교</h4>
        <p>첫 리딩이기 때문에 비교 데이터가 아직 없습니다. 다음 해석부터는 포커스 변화와 반복 상징을 같이 보여줍니다.</p>
      </article>
    `
  }

  const sharedSymbols = current.result.keySymbols
    .map((item) => item.symbol)
    .filter((symbol) => previous.result.keySymbols.some((entry) => entry.symbol === symbol))

  const sharedKeywords = current.result.recommendedKeywords.filter((keyword) =>
    previous.result.recommendedKeywords.includes(keyword),
  )

  return `
    <article class="result-card result-card-wide comparison-card">
      <h4>이전 리딩과의 비교</h4>
      <div class="comparison-grid">
        <div class="comparison-cell">
          <strong>이전 포커스</strong>
          <p>${escapeHtml(focusLabelFor(previous.focusArea))} · ${escapeHtml(depthLabelFor(previous.responseDepth))}</p>
        </div>
        <div class="comparison-cell">
          <strong>이번 포커스</strong>
          <p>${escapeHtml(focusLabelFor(current.focusArea))} · ${escapeHtml(depthLabelFor(current.responseDepth))}</p>
        </div>
        <div class="comparison-cell">
          <strong>겹치는 상징</strong>
          <p>${sharedSymbols.length > 0 ? escapeHtml(sharedSymbols.join(', ')) : '직접 겹치는 상징은 아직 없습니다.'}</p>
        </div>
        <div class="comparison-cell">
          <strong>반복 키워드</strong>
          <p>${sharedKeywords.length > 0 ? escapeHtml(sharedKeywords.join(', ')) : '반복 키워드는 아직 적습니다.'}</p>
        </div>
      </div>
    </article>
  `
}

async function copyCurrentResult() {
  if (!currentSnapshot) {
    return
  }

  try {
    await writeClipboard(buildShareText(currentSnapshot))
    updateStatus('success', '요약을 클립보드에 복사했습니다.')
  } catch {
    updateStatus('error', '클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
  }
}

async function shareCurrentResult() {
  if (!currentSnapshot) {
    return
  }

  const shareText = buildShareText(currentSnapshot)
  const nav = navigator as Navigator & {
    share?: (data: ShareData) => Promise<void>
    clipboard?: Clipboard
  }

  if (typeof nav.share === 'function') {
    try {
      await nav.share({
        title: currentSnapshot.result.headline,
        text: shareText,
      })
      updateStatus('success', '해석 결과를 공유했습니다.')
      return
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        updateStatus('idle', '공유를 취소했습니다.')
        return
      }

      updateStatus('error', '공유 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.')
      return
    }
  }

  try {
    await writeClipboard(shareText)
    updateStatus('success', '공유 기능이 없어 대신 결과를 복사했습니다.')
  } catch {
    updateStatus('error', '공유나 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
  }
}

async function copyHistoryItem(itemId: string) {
  const item = historyItems.find((entry) => entry.id === itemId)

  if (!item) {
    return
  }

  try {
    await writeClipboard(buildShareText(item))
    updateStatus('success', '저장된 리딩 요약을 복사했습니다.')
  } catch {
    updateStatus('error', '클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.')
  }
}

function downloadCurrentResult() {
  if (!currentSnapshot) {
    return
  }

  const blob = new Blob([buildShareText(currentSnapshot)], {
    type: 'text/plain;charset=utf-8',
  })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const timestamp = currentSnapshot.createdAt.replaceAll(':', '-')
  anchor.href = href
  anchor.download = `dream-reading-${timestamp}.txt`
  anchor.click()
  URL.revokeObjectURL(href)
  updateStatus('success', '해석 결과를 텍스트 파일로 저장했습니다.')
}

function saveHistoryItem(snapshot: HistoryItem) {
  historyItems = [snapshot, ...historyItems.filter((item) => item.id !== snapshot.id)].slice(0, 6)
  persistHistory(historyItems)
  renderHistory()
  syncServiceMetrics()
}

function deleteHistoryItem(itemId: string) {
  const nextItems = historyItems.filter((item) => item.id !== itemId)

  if (nextItems.length === historyItems.length) {
    return
  }

  historyItems = nextItems
  persistHistory(historyItems)
  renderHistory()
  syncServiceMetrics()
  updateStatus('success', '선택한 리딩을 저장 목록에서 제거했습니다.')
}

function exportHistory() {
  if (historyItems.length === 0) {
    updateStatus('idle', '내보낼 저장 리딩이 아직 없습니다.')
    return
  }

  const blob = new Blob([JSON.stringify(historyItems, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const timestamp = new Date().toISOString().replaceAll(':', '-')
  anchor.href = href
  anchor.download = `dream-readings-${timestamp}.json`
  anchor.click()
  URL.revokeObjectURL(href)
  updateStatus('success', '저장된 리딩을 JSON 파일로 내보냈습니다.')
}

function restoreHistoryItem(itemId: string) {
  const item = historyItems.find((entry) => entry.id === itemId)

  if (!item) {
    return
  }

  ui.dreamInput.value = item.dream
  ui.emotionInput.value = item.emotion
  ui.contextInput.value = item.sleepContext
  setCheckedRadio('focusArea', item.focusArea)
  setCheckedRadio('responseDepth', item.responseDepth)
  updateComposerState()
  renderResult(item)
  updateStatus('success', '저장된 리딩을 불러왔습니다. 입력도 함께 복원했습니다.')
}

function renderHistory() {
  const visibleItems = filterHistoryItems(historyItems)

  if (historyItems.length === 0) {
    ui.historyList.innerHTML = `
      <div class="empty-history">
        <strong>아직 저장된 리딩이 없습니다.</strong>
        <p>첫 해석을 생성하면 여기에 최근 리딩이 쌓이고, 다시 불러와 비교할 수 있습니다.</p>
      </div>
    `
    return
  }

  if (visibleItems.length === 0) {
    ui.historyList.innerHTML = `
      <div class="empty-history">
        <strong>필터에 맞는 리딩이 없습니다.</strong>
        <p>검색어를 지우거나 다른 포커스를 선택해 보세요.</p>
      </div>
    `
    return
  }

  ui.historyList.innerHTML = visibleItems
    .map(
      (item) => `
        <article class="history-card">
          <div class="history-card-head">
            <strong>${escapeHtml(item.result.headline)}</strong>
            <span>${formatDate(item.createdAt)}</span>
          </div>
          <p>${escapeHtml(item.result.shareSnippet)}</p>
          <div class="history-meta">
            <span>${escapeHtml(focusLabelFor(item.focusArea))}</span>
            <span>${escapeHtml(depthLabelFor(item.responseDepth))}</span>
          </div>
          <div class="history-actions">
            <button type="button" class="ghost-button" data-history-action="load" data-history-id="${item.id}">다시 보기</button>
            <button type="button" class="ghost-button" data-history-action="copy" data-history-id="${item.id}">복사</button>
            <button type="button" class="ghost-button" data-history-action="delete" data-history-id="${item.id}">삭제</button>
          </div>
        </article>
      `,
    )
    .join('')
}

function syncServiceMetrics() {
  ui.savedCount.textContent = String(historyItems.length)
  const stats = computeHistoryStats(historyItems)
  ui.dashboardTotal.textContent = `${historyItems.length}회`
  ui.dashboardFocus.textContent = stats.focus
  ui.dashboardSymbol.textContent = stats.symbol
  ui.dashboardRhythm.textContent = stats.rhythm
}

function syncHistoryFilterButtons() {
  historyFilterButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.historyFilter === activeHistoryFilter)
  })
}

function filterHistoryItems(items: HistoryItem[]) {
  return items.filter((item) => {
    const matchesFilter = activeHistoryFilter === 'all' || item.focusArea === activeHistoryFilter

    if (!matchesFilter) {
      return false
    }

    if (!historySearchTerm) {
      return true
    }

    const haystack = [
      item.result.headline,
      item.result.shareSnippet,
      item.result.overallMeaning,
      item.result.recommendedKeywords.join(' '),
      item.result.keySymbols.map((symbol) => symbol.symbol).join(' '),
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(historySearchTerm)
  })
}

function computeHistoryStats(items: HistoryItem[]) {
  if (items.length === 0) {
    return {
      focus: '아직 없음',
      symbol: '기록 대기 중',
      rhythm: '첫 리딩 준비',
    }
  }

  const focusCounts = new Map<FocusValue, number>()
  const symbolCounts = new Map<string, number>()

  items.forEach((item) => {
    focusCounts.set(item.focusArea, (focusCounts.get(item.focusArea) ?? 0) + 1)
    item.result.keySymbols.forEach((symbol) => {
      symbolCounts.set(symbol.symbol, (symbolCounts.get(symbol.symbol) ?? 0) + 1)
    })
  })

  const dominantFocus =
    [...focusCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'general'
  const dominantSymbol =
    [...symbolCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '기록 대기 중'
  const mostRecent = items[0]
  const rhythm =
    items.length >= 4
      ? `최근 ${items.length}회 리딩 축적`
      : `${formatDate(mostRecent.createdAt)} 이후 이어지는 흐름`

  return {
    focus: focusLabelFor(dominantFocus),
    symbol: dominantSymbol,
    rhythm,
  }
}

function restoreDraft() {
  const draft = loadDraft()

  if (!draft) {
    return
  }

  ui.dreamInput.value = draft.dream
  ui.emotionInput.value = draft.emotion
  ui.contextInput.value = draft.sleepContext
  setCheckedRadio('focusArea', draft.focusArea)
  setCheckedRadio('responseDepth', draft.responseDepth)
  ui.draftStatus.textContent = `이전 초안을 복원했습니다 · ${formatTime(draft.savedAt)}`
  skipNextDraftPersist = true
}

function loadHistory() {
  try {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY)

    if (!raw) {
      return [] as HistoryItem[]
    }

    const parsed = JSON.parse(raw) as unknown

    if (!Array.isArray(parsed)) {
      return [] as HistoryItem[]
    }

    return parsed
      .map((item) => sanitizeHistoryItem(item))
      .filter((item): item is HistoryItem => item !== null)
  } catch {
    return [] as HistoryItem[]
  }
}

function loadDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY)

    if (!raw) {
      return null
    }

    return sanitizeDraft(JSON.parse(raw))
  } catch {
    return null
  }
}

function persistHistory(items: HistoryItem[]) {
  try {
    window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(items))
  } catch {
    updateStatus('error', '브라우저 저장 공간을 사용하지 못해 최근 리딩을 저장하지 못했습니다.')
  }
}

function persistDraft() {
  const draft = {
    dream: ui.dreamInput.value,
    emotion: ui.emotionInput.value,
    sleepContext: ui.contextInput.value,
    focusArea: getSelectedFocus(),
    responseDepth: getSelectedDepth(),
    savedAt: new Date().toISOString(),
  }

  try {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft))
    ui.draftStatus.textContent =
      draft.dream.trim().length > 0 ? `자동 저장됨 · ${formatTime(draft.savedAt)}` : '입력 초안은 이 브라우저에 자동 저장됩니다.'
  } catch {
    ui.draftStatus.textContent = '이 브라우저에서는 초안 자동 저장을 사용할 수 없습니다.'
  }
}

function clearDraft() {
  try {
    window.localStorage.removeItem(DRAFT_STORAGE_KEY)
  } catch {
    // Ignore storage cleanup failures and still reset the form.
  }

  ui.dreamInput.value = ''
  ui.emotionInput.value = '긴장'
  ui.contextInput.value = '특별한 일 없음'
  setCheckedRadio('focusArea', 'general')
  setCheckedRadio('responseDepth', 'balanced')
  ui.draftStatus.textContent = '입력 초안을 비웠습니다.'
  skipNextDraftPersist = true
  updateComposerState()
}

function getSelectedFocus() {
  return (ui.form.querySelector<HTMLInputElement>('input[name="focusArea"]:checked')?.value ?? 'general') as FocusValue
}

function getSelectedDepth() {
  return (ui.form.querySelector<HTMLInputElement>('input[name="responseDepth"]:checked')?.value ?? 'balanced') as DepthValue
}

function setCheckedRadio(name: 'focusArea' | 'responseDepth', value: string) {
  const target = ui.form.querySelector<HTMLInputElement>(`input[name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`)
  if (target) {
    target.checked = true
  }
}

function focusLabelFor(value: FocusValue) {
  return focusModes.find((mode) => mode.value === value)?.label ?? '전체 흐름'
}

function depthLabelFor(value: DepthValue) {
  return depthModes.find((mode) => mode.value === value)?.label ?? '균형 있게'
}

function weightLabel(weight: SymbolWeight) {
  if (weight === 'high') {
    return '강함'
  }

  if (weight === 'medium') {
    return '보통'
  }

  return '약함'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

async function writeClipboard(text: string) {
  if (!navigator.clipboard) {
    throw new Error('Clipboard API is unavailable')
  }

  await navigator.clipboard.writeText(text)
}

function buildShareText(snapshot: HistoryItem) {
  return [
    `[${snapshot.result.headline}]`,
    `포커스: ${focusLabelFor(snapshot.focusArea)} / 깊이: ${depthLabelFor(snapshot.responseDepth)}`,
    `요약: ${snapshot.result.overallMeaning}`,
    `행동 팁: ${snapshot.result.actionTip}`,
    `한 줄: ${snapshot.result.shareSnippet}`,
  ].join('\n')
}

function sanitizeHistoryItem(value: unknown): HistoryItem | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const item = value as Partial<HistoryItem>
  const result = item.result as Partial<DreamInterpretation> | undefined

  if (
    typeof item.id !== 'string' ||
    typeof item.createdAt !== 'string' ||
    typeof item.dream !== 'string' ||
    typeof item.emotion !== 'string' ||
    typeof item.sleepContext !== 'string' ||
    !validFocusValues.has(item.focusArea as FocusValue) ||
    !validDepthValues.has(item.responseDepth as DepthValue) ||
    !result ||
    typeof result.headline !== 'string' ||
    typeof result.overallMeaning !== 'string' ||
    typeof result.emotionalTheme !== 'string' ||
    typeof result.focusSummary !== 'string' ||
    typeof result.reflectionQuestion !== 'string' ||
    !Array.isArray(result.keySymbols) ||
    !Array.isArray(result.lifeAreas) ||
    !Array.isArray(result.recommendedKeywords) ||
    typeof result.actionTip !== 'string' ||
    typeof result.cautionNote !== 'string' ||
    typeof result.shareSnippet !== 'string' ||
    typeof result.disclaimer !== 'string'
  ) {
    return null
  }

  const keySymbols = result.keySymbols
    .filter((symbol): symbol is SymbolInsight => {
      if (!symbol || typeof symbol !== 'object') {
        return false
      }

      const candidate = symbol as Partial<SymbolInsight>

      return (
        typeof candidate.symbol === 'string' &&
        typeof candidate.meaning === 'string' &&
        (candidate.weight === 'high' || candidate.weight === 'medium' || candidate.weight === 'low')
      )
    })
    .slice(0, 4)

  if (keySymbols.length === 0) {
    return null
  }

  return {
    id: item.id,
    createdAt: item.createdAt,
    dream: item.dream,
    emotion: item.emotion,
    sleepContext: item.sleepContext,
    focusArea: item.focusArea as FocusValue,
    responseDepth: item.responseDepth as DepthValue,
    result: {
      headline: result.headline,
      overallMeaning: result.overallMeaning,
      emotionalTheme: result.emotionalTheme,
      focusSummary: result.focusSummary,
      reflectionQuestion: result.reflectionQuestion,
      keySymbols,
      lifeAreas: result.lifeAreas.filter((entry): entry is string => typeof entry === 'string').slice(0, 4),
      recommendedKeywords: result.recommendedKeywords.filter((entry): entry is string => typeof entry === 'string').slice(0, 4),
      actionTip: result.actionTip,
      cautionNote: result.cautionNote,
      shareSnippet: result.shareSnippet,
      disclaimer: result.disclaimer,
    },
  }
}

function sanitizeDraft(value: unknown) {
  if (!value || typeof value !== 'object') {
    return null
  }

  const draft = value as Partial<{
    dream: string
    emotion: string
    sleepContext: string
    focusArea: FocusValue
    responseDepth: DepthValue
    savedAt: string
  }>

  if (
    typeof draft.dream !== 'string' ||
    typeof draft.emotion !== 'string' ||
    typeof draft.sleepContext !== 'string' ||
    !validFocusValues.has(draft.focusArea as FocusValue) ||
    !validDepthValues.has(draft.responseDepth as DepthValue) ||
    typeof draft.savedAt !== 'string'
  ) {
    return null
  }

  return {
    dream: draft.dream,
    emotion: draft.emotion,
    sleepContext: draft.sleepContext,
    focusArea: draft.focusArea as FocusValue,
    responseDepth: draft.responseDepth as DepthValue,
    savedAt: draft.savedAt,
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}
