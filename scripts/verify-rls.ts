import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function verify() {
  console.log('Verifying RLS migration...\n');

  // Check job_contractors table exists
  const { data: jc, error: jcErr } = await supabase.from('job_contractors').select('id').limit(0);
  console.log(jcErr ? `❌ job_contractors: ${jcErr.message}` : '✅ job_contractors table exists');

  // Check jobs has new columns
  for (const col of ['trade_type', 'created_by']) {
    const { error } = await supabase.from('jobs').select(col).limit(0);
    console.log(error ? `❌ jobs.${col}: ${error.message}` : `✅ jobs.${col}`);
  }

  // Check job_contractors columns
  for (const col of ['job_id', 'contractor_id', 'status', 'bid_amount', 'bid_note', 'invited_at', 'assigned_at', 'declined_at']) {
    const { error } = await supabase.from('job_contractors').select(col).limit(0);
    console.log(error ? `❌ job_contractors.${col}: ${error.message}` : `✅ job_contractors.${col}`);
  }

  // Check reschedule_requests.contractor_id
  const { error: rsErr } = await supabase.from('reschedule_requests').select('contractor_id').limit(0);
  console.log(rsErr ? `❌ reschedule_requests.contractor_id: ${rsErr.message}` : '✅ reschedule_requests.contractor_id');

  console.log('\n✅ Verification complete!');
}

verify();
