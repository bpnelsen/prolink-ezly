import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Lazy-init to avoid build-time crash when env vars aren't available
function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // If not building, or if env vars are missing during build, warn but don't crash
  if (!url || !key) {
    console.warn('Supabase env vars not set, skipping initialization.');
    return null;
  }
  return createClient(url, key);
}

export async function POST(req: Request) {
  try {
    const supabase = getSupabase();
    if (!supabase) return NextResponse.json({ error: 'Database service unavailable' }, { status: 503 });
    const body = await req.json();
    const { task_id, requested_at, reason } = body;

    if (!task_id || !requested_at) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('reschedule_requests')
      .insert([
        {
          task_id,
          requested_at,
          reason,
          status: 'pending'
        }
      ])
      .select();

    if (error) {
      console.error('Database insertion error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    console.error('API route error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
