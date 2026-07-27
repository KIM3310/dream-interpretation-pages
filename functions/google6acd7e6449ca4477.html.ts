const VERIFICATION = "google-site-verification: google6acd7e6449ca4477.html"

const verificationResponse = (body: string | null): Response =>
  new Response(body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Type": "text/plain; charset=utf-8",
    },
  })

export const onRequestGet = (): Response => verificationResponse(`${VERIFICATION}\n`)

export const onRequestHead = (): Response => verificationResponse(null)
