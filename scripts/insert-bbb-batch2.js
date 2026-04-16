const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const envContent = fs.readFileSync('/data/.openclaw/workspace/prolink-ezly/.env', 'utf8');
const env = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key) acc[key.trim()] = value ? value.trim() : '';
    return acc;
}, {});
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const newContractors = [
  { business_name: 'Sky Bridge Roofing', phone: '(435) 659-4915', source: 'bbb-scrape' },
  { business_name: 'FX Remodeling & Exterior - Salt Lake City', phone: '(801) 829-9556', source: 'bbb-scrape' },
  { business_name: 'Salty Peaks Construction Inc', phone: '(385) 242-9799', source: 'bbb-scrape' },
  { business_name: 'Solution Builders LLC', phone: '(801) 610-1907', source: 'bbb-scrape' },
  { business_name: 'Nomad Roofing', phone: '(435) 841-7787', source: 'bbb-scrape' },
  { business_name: 'CMR Construction & Roofing, LLC', phone: '(855) 766-3267', source: 'bbb-scrape' },
  { business_name: 'Big M Construction, Inc.', phone: '(801) 521-8449', source: 'bbb-scrape' },
  { business_name: 'New Horizonte Roofing', phone: '(801) 879-3365', source: 'bbb-scrape' },
  { business_name: 'High Point Roofing, LLC', phone: '(385) 216-1425', source: 'bbb-scrape' },
  { business_name: 'Foss Roofing Company', phone: '(801) 486-6823', source: 'bbb-scrape' },
  { business_name: 'Superior Roofing And Sheet Metal, Inc.', phone: '(801) 266-1473', source: 'bbb-scrape' },
  { business_name: 'Roger Vandersteen Roofing', phone: '(801) 243-6419', source: 'bbb-scrape' },
  { business_name: 'Affordable Carpentry Inc.', phone: '(801) 793-3014', source: 'bbb-scrape' },
  { business_name: 'GM Roofers', phone: '(801) 657-1457', source: 'bbb-scrape' },
  { business_name: 'Northwest Roofing, L.L.C.', phone: '(801) 320-9793', source: 'bbb-scrape' }
];

async function insert() {
    const { data, error } = await supabase.from('contractors').insert(newContractors);
    if (error) console.error('Error:', error.message);
    else console.log('Successfully inserted BBB batch.');
}
insert();
