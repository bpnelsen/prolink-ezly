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
  { business_name: 'The Roofing Contractor', phone: '(801) 738-0736', source: 'manual-scrape' },
  { business_name: 'Far West Roofing', phone: '(801) 253-7799', source: 'manual-scrape' },
  { business_name: 'Rocky Mountain Roofing UT, LLC', phone: '(801) 201-2685', source: 'manual-scrape' },
  { business_name: 'Layton Roofing Company Inc', phone: '(801) 495-3939', source: 'manual-scrape' },
  { business_name: 'Lasting Impressions Roofing & Improvements', phone: '(385) 355-4778', source: 'manual-scrape' },
  { business_name: 'Patriot Roofing & Construction', phone: '(801) 760-7631', source: 'manual-scrape' },
  { business_name: 'Mountain Valley Roofing', phone: '(801) 866-9756', source: 'manual-scrape' },
  { business_name: 'Mountain Roofers', phone: '(435) 222-3066', source: 'manual-scrape' },
  { business_name: 'MAD Roofing', phone: '(801) 900-3296', source: 'manual-scrape' },
  { business_name: 'Pride Roofing & Contracting, LLC', phone: '(385) 235-3988', source: 'manual-scrape' },
  { business_name: 'Roofing & Restoration by Romney', phone: '(702) 249-9217', source: 'manual-scrape' },
  { business_name: 'Utah Roofing Company', phone: '(385) 207-9667', source: 'manual-scrape' },
  { business_name: 'The Roofing Center', phone: '(801) 810-4937', source: 'manual-scrape' },
  { business_name: 'Utah Roofing Experts', phone: '(385) 766-3464', source: 'manual-scrape' },
  { business_name: 'Aesthetic Roofing', phone: '(801) 630-7444', source: 'manual-scrape' },
  { business_name: 'Salt Lake Roofing', phone: '(385) 316-7026', source: 'manual-scrape' },
  { business_name: 'Dynamite Roofing', phone: '(801) 448-0017', source: 'manual-scrape' },
  { business_name: 'Nexgen Roofing | Roofing, Siding & Gutters', phone: '(385) 462-0289', source: 'manual-scrape' },
  { business_name: 'JLB Roofing Utah', phone: '(801) 645-1647', source: 'manual-scrape' },
  { business_name: 'Bigfoot Roofing & Gutters', phone: '(385) 482-6069', source: 'manual-scrape' },
  { business_name: 'Capstone Roofing & Siding LLC', phone: '(801) 252-4885', source: 'manual-scrape' },
  { business_name: 'Bartlett Roofing', phone: '(801) 509-6464', source: 'manual-scrape' },
  { business_name: 'Heritage Roofing', phone: '(801) 576-8447', source: 'manual-scrape' },
  { business_name: 'Intermountain West Contractors', phone: '(801) 232-5690', source: 'manual-scrape' },
  { business_name: 'Ensign Roofing Utah', phone: '(801) 923-6128', source: 'manual-scrape' }
];

async function insert() {
    const { data, error } = await supabase.from('contractors').insert(newContractors);
    if (error) console.error('Error:', error.message);
    else console.log('Successfully inserted new contractors.');
}
insert();
