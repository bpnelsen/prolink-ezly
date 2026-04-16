const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('/data/.openclaw/workspace/prolink-ezly/.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key) acc[key.trim()] = value ? value.trim() : '';
    return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function list() {
    const { data, error } = await supabase.from('contractors').select('business_name, phone, specialties');
    if (error) {
        console.error('Error:', error.message);
    } else {
        data.forEach(c => console.log(`${c.business_name} | ${c.phone}`));
    }
}
list();
