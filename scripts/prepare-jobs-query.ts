import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// This query is prepared for the JobDetailHub.
// We expect columns like: id, job_name, client_name, address, amount, status
async function prepareJobsQuery() {
  console.log("Preparing Jobs query...");
  
  const { data, error } = await supabase
    .from('jobs')
    .select('id, name, address, client_name, total_amount, status, planned_date, created_at')
    .limit(1);

  if (error) {
    if (error.code === 'PGRST301') {
      console.log("Query returned 0 results (empty table), but the table 'jobs' exists. Structure is ready.");
    } else {
      console.error("Query test failed (check your RLS policies):", error.message);
    }
  } else {
    console.log("Query test successful, returned data:", data);
  }
}

prepareJobsQuery();
