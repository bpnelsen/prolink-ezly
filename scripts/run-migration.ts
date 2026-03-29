import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Testing profiles table access...');
  
  // Check if table already exists by querying it
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (error && error.message.includes('does not exist')) {
    console.log('❌ Profiles table does not exist yet.');
    console.log('');
    console.log('To create it, run the following SQL in your Supabase Dashboard:');
    console.log('Dashboard → SQL Editor → New Query → Paste contents of:');
    console.log('  supabase/migrations/001_profiles.sql');
    console.log('');
    console.log('URL: https://supabase.com/dashboard/project/rrpkokhjomvlumreknuq/sql');
  } else if (error) {
    console.log('⚠️  Table may exist but returned error:', error.message);
    console.log('This might be an RLS policy issue. The migration SQL should fix it.');
  } else {
    console.log('✅ Profiles table exists! Records found:', data.length);
  }
}

runMigration();
