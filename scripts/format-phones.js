const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('/data/.openclaw/workspace/prolink-ezly/.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key) acc[key.trim()] = value ? value.trim() : '';
    return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function formatPhone(phone) {
    if (!phone || phone === 'N/A') return null;
    // Strip everything except digits
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    // If it's 11 digits and starts with 1, strip it
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
        cleaned = cleaned.slice(1);
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone; // Return as-is if doesn't match standard patterns
}

async function updatePhones() {
    // Audit phone numbers that don't match the standard (xxx) xxx-xxxx format
    const { data: contractors } = await supabase
        .from('contractors')
        .select('id, phone')
        .not('phone', 'eq', 'N/A');

    let updatedCount = 0;
    for (const c of contractors) {
        const formatted = formatPhone(c.phone);
        if (formatted !== c.phone) {
            await supabase.from('contractors').update({ phone: formatted }).eq('id', c.id);
            updatedCount++;
        }
    }
    console.log('Successfully normalized ' + updatedCount + ' phone numbers.');
}
updatePhones();
