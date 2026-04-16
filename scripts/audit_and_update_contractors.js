const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('/data/.openclaw/workspace/prolink-ezly/.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key) acc[key.trim()] = value ? value.trim() : '';
    return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function getSpecialty(name) {
    const n = name.toLowerCase();
    if (n.includes('roof')) return ['Roofing'];
    if (n.includes('electric')) return ['Electrical'];
    if (n.includes('plumb')) return ['Plumbing'];
    if (n.includes('hvac') || n.includes('heating')) return ['HVAC'];
    if (n.includes('handyman')) return ['Handyman'];
    return ['General Contractor'];
}

async function audit() {
    const { data: contractors } = await supabase
        .from('contractors')
        .select('id, business_name')
        .or('specialties.is.null,specialties.eq.{}'); // Matches null or empty array

    if (!contractors) return;

    for (const c of contractors) {
        const specialty = getSpecialty(c.business_name);
        await supabase.from('contractors').update({ specialties: specialty }).eq('id', c.id);
        console.log(`Updated ${c.business_name} -> ${specialty}`);
    }
}
audit();
