const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Load environment from .env file directly since dotenv config failed
const envContent = fs.readFileSync('/data/.openclaw/workspace/prolink-ezly/.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key) acc[key.trim()] = value ? value.trim() : '';
    return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function getAdmins() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'admin');

  if (error) {
    console.error('Error fetching admins:', error.message);
  } else {
    console.log('Admins found:', data);
  }
}
getAdmins();
