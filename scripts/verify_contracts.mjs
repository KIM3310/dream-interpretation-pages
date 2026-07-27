import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

const files = {
  index: readFileSync(join(root, 'index.html'), 'utf8'),
  about: readFileSync(join(root, 'about.html'), 'utf8'),
  privacy: readFileSync(join(root, 'privacy.html'), 'utf8'),
  contact: readFileSync(join(root, 'contact.html'), 'utf8'),
  symbols: readFileSync(join(root, 'symbols.html'), 'utf8'),
  siteIndex: readFileSync(join(root, 'site/index.html'), 'utf8'),
  publicAdsTxt: readFileSync(join(root, 'public/ads.txt'), 'utf8'),
  siteAdsTxt: readFileSync(join(root, 'site/ads.txt'), 'utf8'),
  revenueReadiness: readFileSync(join(root, 'docs/REVENUE_READINESS.md'), 'utf8'),
  docsServiceOffer: readFileSync(join(root, 'docs/service-offer.json'), 'utf8'),
  publicServiceOffer: readFileSync(join(root, 'public/service-offer.json'), 'utf8'),
  consentLogoSvg: readFileSync(join(root, 'public/consent-logo.svg'), 'utf8'),
  consentLogoPng: readFileSync(join(root, 'public/consent-logo.png')),
  interpret: readFileSync(join(root, 'functions/api/interpret.ts'), 'utf8'),
  architecturePack: readFileSync(join(root, 'functions/api/architecture-pack.ts'), 'utf8'),
  main: readFileSync(join(root, 'src/main.ts'), 'utf8'),
}

const adsenseClient = 'ca-pub-4973160293737562'
const adsensePublisher = 'pub-4973160293737562'
const adsenseScript = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClient}`
const adsTxtRecord = `google.com, ${adsensePublisher}, DIRECT, f08c47fec0942fa0`
const canonicalUrl = 'https://dream-interpretation-pages.pages.dev/'

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

function assertEquals(name, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${name} mismatch.\nExpected: ${expected}\nActual: ${actual}`)
  }
}

function assertNotIncludes(name, text, marker) {
  if (text.includes(marker)) {
    throw new Error(`${name} must not include: ${marker}`)
  }
}

const docsServiceOffer = JSON.parse(files.docsServiceOffer)
const publicServiceOffer = JSON.parse(files.publicServiceOffer)

assertEquals('service-offer copies', JSON.stringify(publicServiceOffer), JSON.stringify(docsServiceOffer))
assertEquals('service-offer canonical URL', docsServiceOffer.canonical_url, canonicalUrl)
assertEquals('structured-data canonical URL', docsServiceOffer.structured_data.url, canonicalUrl)
assertEquals('free structured-data offer price', docsServiceOffer.structured_data.offers[0].price, '0')
assertIncludes('AdSense consent logo', files.consentLogoSvg, 'viewBox="0 0 500 100"')
assertEquals('AdSense consent logo PNG signature', files.consentLogoPng.subarray(1, 4).toString(), 'PNG')
if (files.consentLogoPng.length > 150 * 1024) {
  throw new Error(`AdSense consent logo exceeds 150 KB: ${files.consentLogoPng.length} bytes`)
}
assertEquals('AdSense eligibility', docsServiceOffer.commerce.advertising.eligible, true)
assertEquals(
  'AdSense activation status',
  docsServiceOffer.commerce.advertising.status,
  'site-review-pending',
)

assertAll('index SEO', files.index, [
  '<title>달빛해몽소 | AI 꿈 해석과 감정 기록</title>',
  `<link rel="canonical" href="${canonicalUrl}" />`,
  `"url": "${canonicalUrl}"`,
  '"isAccessibleForFree": true',
])
assertNotIncludes('index SEO', files.index, '<meta name="keywords"')
assertAll('technical site page', files.siteIndex, [
  '<meta name="robots" content="noindex,follow" />',
  `<link rel="canonical" href="${canonicalUrl}" />`,
])

for (const [name, text] of Object.entries({
  'index.html': files.index,
  'about.html': files.about,
  'privacy.html': files.privacy,
  'contact.html': files.contact,
  'symbols.html': files.symbols,
  'site/index.html': files.siteIndex,
  'docs/service-offer.json': files.docsServiceOffer,
  'public/service-offer.json': files.publicServiceOffer,
})) {
  assertNotIncludes(name, text, 'https://kim3310.github.io/dream-interpretation-pages/')
  assertNotIncludes(name, text, 'limited daily AI interpretations')
  assertNotIncludes(name, text, 'premium depth modes')
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

assertAll('architecture pack route', files.architecturePack, [
  'readiness_contract: "dream-architecture-pack-v1"',
  'public_fail_closed',
  'architecture_sequence',
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

for (const [name, text] of Object.entries({
  'index.html': files.index,
  'about.html': files.about,
  'symbols.html': files.symbols,
})) {
  assertAll(name, text, [
    adsenseScript,
    'crossorigin="anonymous"',
    'AdSense Auto Ads readiness: public publisher/client ID only, no ad slot IDs before approval.',
  ])
  assertNotIncludes(name, text, 'data-ad-slot=')
}

for (const [name, text] of Object.entries({
  'privacy.html': files.privacy,
  'contact.html': files.contact,
  'site/index.html': files.siteIndex,
})) {
  assertNotIncludes(name, text, adsenseScript)
  assertNotIncludes(name, text, 'adsbygoogle')
  assertNotIncludes(
    name,
    text,
    'AdSense Auto Ads readiness: public publisher/client ID only, no ad slot IDs before approval.',
  )
}

assertEquals('public/ads.txt', files.publicAdsTxt.trim(), adsTxtRecord)
assertEquals('site/ads.txt', files.siteAdsTxt.trim(), adsTxtRecord)

assertAll('privacy page', files.privacy, [
  'Google AdSense',
  '개인화 광고',
  '비개인화 광고',
  'Google을 포함한 제3자 광고 파트너',
  'Privacy &amp; Messaging',
  'EEA, 영국, 스위스',
  '운영 주체: KIM3310',
  'privacy_data_request.yml',
  'https://myadcenter.google.com/',
])

assertAll('contact page', files.contact, [
  '문의 유형 선택',
  '개인정보 요청 접수',
  'privacy_data_request.yml',
  '운영 주체: KIM3310',
])

for (const placeholder of [
  'replace-me@your-domain.com',
  'support@your-domain.com',
  '공개 전에는 연락 채널을',
  '이 문서는 MVP 초안입니다.',
  '실제 운영',
  '서비스처럼 보이려면',
  '실서비스처럼',
  '실서비스형',
  '실서비스 수준',
  '서비스 감각으로',
  '다시 쓰고 싶은 서비스',
  '실제 서비스처럼',
  '검색 유입용',
  '저품질 자동 문서',
  '마이크로서비스 프로토타입',
  '운영 전에',
]) {
  assertNotIncludes(
    'public product and policy pages',
    `${files.about}\n${files.symbols}\n${files.main}\n${files.privacy}\n${files.contact}`,
    placeholder,
  )
}

assertAll('revenue readiness doc', files.revenueReadiness, [
  adsensePublisher,
  adsenseClient,
  'not secrets',
  adsTxtRecord,
  'Privacy & Messaging',
  'Do not add manual ad units or invented ad slot IDs before approval.',
])

console.log('dream interpretation contracts ok')
