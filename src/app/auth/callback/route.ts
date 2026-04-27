import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  // Look up role from profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.session.user.id)
    .single()

  const role = profile?.role || 'contractor'

  if (role === 'admin') return NextResponse.redirect(`${origin}/dashboard/admin`)
  if (role === 'homeowner') return NextResponse.redirect(`${origin}/dashboard/homeowner`)
  return NextResponse.redirect(`${origin}/dashboard`)
}
