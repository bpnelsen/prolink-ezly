import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkColumns() {
  console.log('Checking profiles table columns...');
  
  // Try inserting a test row to see what columns exist
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .limit(0);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('Query succeeded. Trying to detect columns via insert...');
  }

  // Test specific columns
  const columns = ['id', 'full_name', 'email', 'role', 'business_name', 'trade', 'phone', 'address', 'avatar_url', 'plan', 'created_at', 'updated_at'];
  
  for (const col of columns) {
    const { error } = await supabase
      .from('profiles')
      .select(col)
      .limit(0);
    
    if (error) {
      console.log(`  ❌ ${col} — ${error.message}`);
    } else {
      console.log(`  ✅ ${col}`);
    }
  }
}

checkColumns();
