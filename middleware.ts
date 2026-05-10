import { NextRequest, NextResponse } from 'next/server'
import { detectRegime } from '@/lib/regions'

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)'],
}

export function middleware(req: NextRequest) {
  const country = req.headers.get('x-vercel-ip-country') || ''
  const region = req.headers.get('x-vercel-ip-country-region') || ''
  const regime = detectRegime(country, region)

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
