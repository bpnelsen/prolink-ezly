import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured — missing env vars' }, { status: 500 })
  }

  const authHeader = request.headers.get('Authorization')
  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // profiles: upsert (INSERT OR REPLACE equivalent via ON CONFLICT)
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
    { id: user.id, email: user.email },
    { onConflict: 'id' }
  )

  // pl_contractors: upsert to handle re-logins gracefully
  const { error: contractorError } = await supabaseAdmin.from('pl_contractors').upsert(
    { id: user.id },
    { onConflict: 'id' }
  )

  if (profileError || contractorError) {
    return NextResponse.json({
      error: 'Bootstrap failed',
      details: profileError?.message || contractorError?.message,
    }, { status: 500 })
  }

  return NextResponse.json({ ok: true, userId: user.id })
}
