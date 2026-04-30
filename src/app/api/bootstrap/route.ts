import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  // Extract user's auth token from the request (set by Supabase client cookies)
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create admin client with the user's token so we know WHO is calling
  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Validate the user's session server-side using their token
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Upsert both records using service role (bypasses RLS)
  await supabaseAdmin.from('profiles').upsert({ id: user.id })
  await supabaseAdmin.from('pl_contractors').upsert({ id: user.id })

  return NextResponse.json({ ok: true, userId: user.id })
}
