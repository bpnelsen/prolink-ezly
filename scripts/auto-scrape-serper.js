const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const https = require('https');

const envContent = fs.readFileSync('/data/.openclaw/workspace/prolink-ezly/.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key) acc[key.trim()] = value ? value.trim() : '';
    return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const SERPER_API_KEY = env.SERPER_API_KEY;

async function searchAndImport() {
    const trades = ["Electricians", "Plumbers", "HVAC", "Roofers", "Remodeling", "Landscaper", "Painting", "Carpentry"];
    const locations = ["Salt Lake County, Utah", "Utah County, Utah", "Davis County, Utah"];

    for (const trade of trades) {
        for (const loc of locations) {
            console.log('Searching for ' + trade + ' in ' + loc + '...');
            
            const results = await callSerper(trade, loc);
            if (results && results.length > 0) {
                const batch = results.map(r => ({
                    business_name: r.title,
                    phone: r.phone || 'N/A',
                    address: r.address || 'N/A',
                    website: r.website || 'N/A',
                    specialties: [trade],
                    source: 'serper-api-enriched'
                }));
                const { error } = await supabase.from('contractors').insert(batch);
                if (error) console.error('Import Error for ' + trade + ':', error.message);
                else console.log('Inserted ' + batch.length + ' contractors.');
            }
        }
    }
}

function callSerper(query, location) {
    return new Promise((resolve) => {
        const body = JSON.stringify({ q: query, location: location });
        const options = {
            hostname: 'google.serper.dev',
            path: '/places',
            method: 'POST',
            headers: {
                'X-API-KEY': SERPER_API_KEY,
                'Content-Type': 'application/json',
                'Content-Length': body.length
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (d) => body += d);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    resolve(json.places || []);
                } catch { resolve([]); }
            });
        });
        req.write(body);
        req.end();
    });
}

searchAndImport();
