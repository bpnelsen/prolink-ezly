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
  '/crm',
]

// Hitting crm.useezly.com? Every request is rewritten to /crm/* so the
// /crm route tree serves it — EXCEPT for these prefixes, which must keep
// resolving at the root of the app (auth flows + framework internals).
const CRM_HOST_REWRITE_BYPASS = [
  '/login', '/signup', '/forgot-password', '/auth',
  '/api', '/_next', '/favicon',
]

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}

function isCrmHost(host: string): boolean {
  const h = host.toLowerCase().split(':')[0]
  return h === 'crm.useezly.com'
}

function shouldRewriteForCrmHost(pathname: string): boolean {
  if (pathname.startsWith('/crm')) return false
  return !CRM_HOST_REWRITE_BYPASS.some(
    p => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p),
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
  const host = req.headers.get('host') || ''

  const { pathname, search } = req.nextUrl

  // Resolve the path the user would land on AFTER the optional CRM-host
  // rewrite, so the protection check stays consistent across hosts.
  const crmHost = isCrmHost(host)
  const effectivePath = crmHost && shouldRewriteForCrmHost(pathname)
    ? `/crm${pathname === '/' ? '' : pathname}`
    : pathname

  if (isProtected(effectivePath) && !hasSupabaseAuthCookie(req)) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(pathname + search)}`
    return NextResponse.redirect(url)
  }

  let res: NextResponse
  if (effectivePath !== pathname) {
    const url = req.nextUrl.clone()
    url.pathname = effectivePath
    res = NextResponse.rewrite(url)
  } else {
    res = NextResponse.next()
  }

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
