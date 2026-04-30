import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Missing Supabase env vars')}`)
  }

  // Use service role key to bypass RLS for initial profile setup
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data, error } = await supabaseAdmin.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'auth_exchange_failed')}`)
  }

  const userId = data.session.user.id
  const email = data.session.user.email

  // Upsert profiles row (uses service role — bypasses RLS)
  await supabaseAdmin.from('profiles').upsert({
    id: userId,
    email: email,
    role: 'contractor',
    full_name: email?.split('@')[0] || 'Contractor',
  })

  // Upsert pl_contractors row
  await supabaseAdmin.from('pl_contractors').upsert({
    id: userId,
  })

  // Look up role for redirect decision
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single()

  const role = profile?.role || 'contractor'

  if (role === 'admin') return NextResponse.redirect(`${origin}/dashboard/admin`)
  if (role === 'homeowner') return NextResponse.redirect(`${origin}/dashboard/homeowner`)
  return NextResponse.redirect(`${origin}/dashboard`)
}
