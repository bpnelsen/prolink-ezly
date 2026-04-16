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
  { business_name: 'Jemza Roofing SLC, Inc.', phone: '(385) 261-2942', source: 'bbb-scrape' },
  { business_name: 'Pro-West, LLC', phone: '(801) 301-1404', source: 'bbb-scrape' },
  { business_name: 'BluSky Restoration Contractors, LLC', phone: '(801) 782-1800', source: 'bbb-scrape' },
  { business_name: 'Superior Home Improvement, Inc.', phone: '(801) 638-3700', source: 'bbb-scrape' },
  { business_name: 'JR Roofing & Construction', phone: '(801) 706-1677', source: 'bbb-scrape' },
  { business_name: 'S & S Handyman Service', phone: '(801) 954-0046', source: 'bbb-scrape' },
  { business_name: 'J & N Roofing Maintenance, LLC', phone: '(801) 969-5759', source: 'bbb-scrape' },
  { business_name: 'Maximum Roofing Solutions', phone: '(435) 328-1384', source: 'bbb-scrape' },
  { business_name: 'Advanced Window Products', phone: '(801) 438-3515', source: 'bbb-scrape' },
  { business_name: 'Shingle Pro Roofing', phone: '(801) 567-9093', source: 'bbb-scrape' },
  { business_name: 'Reimagine Roofing & Construction, LLC', phone: '(480) 900-7663', source: 'bbb-scrape' },
  { business_name: 'Aspen Contracting, Inc.', phone: '(877) 784-7663', source: 'bbb-scrape' },
  { business_name: 'ACW Construction, LLC', phone: '(435) 640-8375', source: 'bbb-scrape' },
  { business_name: 'Titan Roofing, Inc.', phone: '(801) 833-2190', source: 'bbb-scrape' },
  { business_name: 'Premier Roofing, Inc.', phone: '(801) 949-0939', source: 'bbb-scrape' }
];

async function insert() {
    const { error } = await supabase.from('contractors').insert(newContractors);
    if (error) console.error('Error:', error.message);
    else console.log('Successfully inserted BBB batch.');
}
insert();
