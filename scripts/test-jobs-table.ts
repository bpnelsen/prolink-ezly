import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function testJobsTable() {
  console.log("Testing simplified 'jobs' fetch...");
  
  // Try querying with Homeowner_ID and Job_ID
  const { data, error } = await supabase
    .from('jobs')
    .select('*')
    .limit(1);

  if (error) {
    console.error("Test failed:", error.message);
  } else {
    console.log("Structure successful, records found:", data);
  }
}

testJobsTable();
