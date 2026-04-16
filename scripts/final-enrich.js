const { createClient } = require('/data/.openclaw/workspace/prolink-ezly/node_modules/@supabase/supabase-js');
const { chromium } = require('/data/.openclaw/workspace/prolink-ezly/node_modules/playwright');
const fs = require('fs');

// Use relative path for .env, reading it synchronously from the prolink-ezly folder
const envPath = '/data/.openclaw/workspace/prolink-ezly/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) acc[key.trim()] = value.trim();
    return acc;
}, {});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function enrich() {
    console.log("Start enrichment...");
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
        console.log("Processing: " + c.business_name);
        try {
            const page = await browser.newPage();
            let url = c.website.startsWith('http') ? c.website : 'https://' + c.website;
            await page.goto(url, { timeout: 15000 });
            
            const body = await page.innerText('body');
            
            const emailMatch = body.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            const addressMatch = body.match(/\d+\s+[A-Za-z0-9\s.,#-]+(?:UT|Utah)\s+\d{5}/i);

            const update = {};
            if (emailMatch) update.email = emailMatch[0];
            if (addressMatch) update.address = addressMatch[0];

            if (Object.keys(update).length > 0) {
                await supabase.from('contractors').update(update).eq('id', c.id);
                console.log("  ✅ Updated: " + c.business_name);
            }
            await page.close();
        } catch (e) {
            console.log("  ❌ Skip: " + c.business_name);
        }
    }
    await browser.close();
}
enrich();
