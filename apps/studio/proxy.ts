import { NextResponse, type NextRequest } from 'next/server'

import { IS_PLATFORM } from '@/lib/constants'
import { LOCAL_CONNECTION_COOKIE } from '@/lib/local-connection-constants'

export const config = {
  matcher: ['/api/:function*', '/((?!_next/static|_next/image|favicon.ico|fonts|img).*)'],
}

// [Joshen] Return 404 for all next.js API endpoints EXCEPT the ones we use in hosted:
const HOSTED_SUPPORTED_API_URLS = [
  '/ai/sql/generate-v4',
  '/ai/sql/policy',
  '/ai/feedback/rate',
  '/ai/code/complete',
  '/ai/sql/cron-v2',
  '/ai/sql/title-v2',
  '/ai/sql/filter-v1',
  '/ai/onboarding/design',
  '/ai/feedback/classify',
  '/ai/docs',
  '/get-ip-address',
  '/get-utc-time',
  '/get-deployment-commit',
  '/check-cname',
  '/edge-functions/test',
  '/edge-functions/body',
  '/generate-attachment-url',
  '/incident-status',
  '/incident-banner',
  '/status-override',
  '/api/integrations/stripe-sync',
  '/content/graphql',
]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname.startsWith('/api')) {
    if (
      IS_PLATFORM &&
      !HOSTED_SUPPORTED_API_URLS.some((url) => pathname.endsWith(url))
    ) {
      return Response.json(
        { success: false, message: 'Endpoint not supported on hosted' },
        { status: 404 }
      )
    }
    return
  }

  if (IS_PLATFORM) return
  if (pathname.startsWith('/local-connect')) return
  if (pathname.includes('.')) return

  const hasCookie = Boolean(request.cookies.get(LOCAL_CONNECTION_COOKIE)?.value)
  if (!hasCookie) {
    const url = request.nextUrl.clone()
    url.pathname = '/local-connect'
    url.search = ''
    return NextResponse.redirect(url)
  }
}
