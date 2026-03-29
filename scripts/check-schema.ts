import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkSchema() {
  console.log("Checking Supabase schema for 'jobs' table...");
  
  // Query information_schema for column details
  const { data, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'jobs');

  if (error) {
    // If not found in information_schema, sometimes direct metadata helps
    console.error("Error fetching schema:", error.message);
  } else {
    console.log("Structure of 'jobs' table:", data);
  }
}

checkSchema();
