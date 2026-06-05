import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

const files = {
  interpret: readFileSync(join(root, 'functions/api/interpret.ts'), 'utf8'),
  reviewPack: readFileSync(join(root, 'functions/api/review-pack.ts'), 'utf8'),
  main: readFileSync(join(root, 'src/main.ts'), 'utf8'),
}

function assertIncludes(name, text, marker) {
  if (!text.includes(marker)) {
    throw new Error(`${name} is missing contract marker: ${marker}`)
  }
}

function assertAll(name, text, markers) {
  for (const marker of markers) {
    assertIncludes(name, text, marker)
  }
}

assertAll('interpret route', files.interpret, [
  'MAX_REQUESTS_PER_MINUTE = 6',
  'requiresDurableAbuseProtection',
  'buildFallbackInterpretation',
  'TURNSTILE_SECRET_KEY',
  'RATE_LIMITER',
  '공개 배포에서는 TURNSTILE_SECRET_KEY 또는 RATE_LIMITER 설정이 필요합니다.',
  '꿈 내용은 최소 20자 이상 입력해 주세요.',
])

assertAll('review pack route', files.reviewPack, [
  'readiness_contract: "dream-review-pack-v1"',
  'public_fail_closed',
  'review_sequence',
  'OpenAI is called only from Pages Functions',
  '/api/interpret',
])

assertAll('browser app', files.main, [
  "fetch('/api/interpret'",
  'turnstileToken',
  'calculateComposerScore',
  'HISTORY_STORAGE_KEY',
  'DRAFT_STORAGE_KEY',
  'exportHistory',
  'downloadCurrentResult',
])

console.log('dream interpretation contracts ok')
