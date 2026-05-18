import { NextRequest, NextResponse } from 'next/server'
import { detectRegime } from '@/lib/regions'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'],
}

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/customers',
  '/dispatch',
  '/settings',
  '/new-job',
  '/contractor',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

// Supabase sets cookies named "sb-<project-ref>-auth-token" (sometimes
// chunked as .0/.1). Presence at the edge is enough to let the request
// reach the page; the page re-verifies the session and RLS is the real
// enforcement on every DB query.
function hasSupabaseAuthCookie(req: NextRequest): boolean {
  for (const c of req.cookies.getAll()) {
    if (/^sb-.*-auth-token(\.\d+)?$/.test(c.name) && c.value) return true
  }
  return false
}

export function middleware(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') || ''
  const region = req.headers.get('x-vercel-ip-country-region') || ''
  const regime = detectRegime(country, region)

  const { pathname, search } = req.nextUrl
  if (isProtected(pathname) && !hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  const res = NextResponse.next()
  res.cookies.set('__consent_region', regime, {
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24,
  })
  res.cookies.set('__consent_country', country, {
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24,
  })
  res.cookies.set('__consent_region_code', region, {
    path: '/',
    sameSite: 'lax',
    secure: true,
    maxAge: 60 * 60 * 24,
  })
  return res
}
