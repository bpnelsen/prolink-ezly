import { NextResponse } from 'next/server';
import { supabase } from '../../../../../../src/lib/supabase-client';

export async function POST(req: Request, { params }: { params: { jobId: string } }) {
  const { jobId } = params;

  try {
    const { data, error } = await supabase
      .from('tasks')
      .update({ status: 'review' })
      .eq('id', jobId);

    if (error) throw error;

    return NextResponse.json({ success: true, status: 'review' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
