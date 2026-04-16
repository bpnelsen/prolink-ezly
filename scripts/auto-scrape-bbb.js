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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getRandomDelay = () => Math.floor(Math.random() * (15000 - 5000 + 1) + 5000);

function fetchPage(page) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'www.bbb.org',
            path: '/search?find_text=roofer&find_entity=10126-000&find_type=Category&find_loc=Salt+Lake+city%2C+UT&find_country=USA&page=' + page,
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.google.com/'
            }
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', (d) => data += d);
            res.on('end', () => resolve(data));
        }).on('error', (e) => resolve(''));
    });
}

function parse(html) {
    const contractors = [];
    const nameMatches = [...html.matchAll(/<h3><a.*?>(.*?)<\/a><\/h3>/gi)];
    const phoneMatches = [...html.matchAll(/\((\d{3})\)\s*(\d{3}-\d{4})/g)];
    
    for (let i = 0; i < Math.min(nameMatches.length, phoneMatches.length); i++) {
        contractors.push({
            business_name: nameMatches[i][1].replace(/<[^>]*>/g, '').trim(),
            phone: '(' + phoneMatches[i][1] + ') ' + phoneMatches[i][2],
            source: 'bbb-scrape-humanized'
        });
    }
    return contractors;
}

async function run() {
    for (let page = 6; page <= 15; page++) {
        console.log('--- Scraping page ' + page + ' with human mimicry ---');
        await sleep(getRandomDelay());
        const html = await fetchPage(page);
        const contractors = parse(html);
        if (contractors.length > 0) {
            await supabase.from('contractors').insert(contractors);
        }
        console.log('Inserted ' + contractors.length + ' contractors.');
    }
}
run();
