const { createClient } = require('@supabase/supabase-js');
const { chromium } = require('playwright');
const fs = require('fs');

const envContent = fs.readFileSync('/data/.openclaw/workspace/prolink-ezly/.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key) acc[key.trim()] = value ? value.trim() : '';
    return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function enrichContractors() {
    const { data: contractors } = await supabase
        .from('contractors')
        .select('id, business_name, website')
        .or('email.is.null,address.is.null')
        .not('website', 'eq', 'N/A')
        .limit(5);

    if (!contractors || contractors.length === 0) {
        console.log('No contractors need enrichment.');
        return;
    }

    const browser = await chromium.launch({ headless: true });
    
    for (const c of contractors) {
        console.log('Enriching ' + c.business_name + ': ' + c.website);
        try {
            const page = await browser.newPage();
            let url = c.website.startsWith('http') ? c.website : 'https://' + c.website;
            await page.goto(url, { timeout: 30000 });
            
            const bodyText = await page.innerText('body');
            
            const emailMatch = bodyText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const email = emailMatch ? emailMatch[0] : null;

            const addressMatch = bodyText.match(/\d+\s+[A-Za-z0-9\s.,#-]+(?:UT|Utah)\s+\d{5}/i);
            const address = addressMatch ? addressMatch[0] : null;

            const updateObj = {};
            if (email) updateObj.email = email;
            if (address) updateObj.address = address;

            if (Object.keys(updateObj).length > 0) {
                await supabase.from('contractors').update(updateObj).eq('id', c.id);
                console.log('  Updated fields for ' + c.business_name);
            }
            await page.close();
        } catch (e) {
            console.error('  Failed to enrich ' + c.business_name + ': ' + e.message);
        }
    }
    await browser.close();
}

enrichContractors();
