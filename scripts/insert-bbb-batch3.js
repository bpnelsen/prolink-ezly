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
  { business_name: 'Olympus Roofing Co', phone: '(801) 449-9753', source: 'bbb-scrape' },
  { business_name: 'Heaton Bros. Roofing Co. Inc.', phone: '(385) 340-3901', source: 'bbb-scrape' },
  { business_name: 'American Roofing Company', phone: '(801) 269-1276', source: 'bbb-scrape' },
  { business_name: 'The Roof Doctor, LLC', phone: '(801) 512-3614', source: 'bbb-scrape' },
  { business_name: 'Vertex Roofing', phone: '(801) 618-3307', source: 'bbb-scrape' },
  { business_name: 'DaBella', phone: '(844) 322-3552', source: 'bbb-scrape' },
  { business_name: 'Utah Roofing Pros', phone: '(801) 688-3853', source: 'bbb-scrape' },
  { business_name: 'RoofTek', phone: '(801) 826-4820', source: 'bbb-scrape' },
  { business_name: 'Brady Roofing, Inc.', phone: '(801) 487-5151', source: 'bbb-scrape' },
  { business_name: 'R&R Partner Roofing', phone: '(801) 577-4296', source: 'bbb-scrape' },
  { business_name: 'Your Home Improvement Company, LLC', phone: '(801) 919-8229', source: 'bbb-scrape' },
  { business_name: 'X-Siding, Inc.', phone: '(801) 944-9636', source: 'bbb-scrape' },
  { business_name: 'Bartlett Roofing', phone: '(208) 286-4187', source: 'bbb-scrape' },
  { business_name: 'Zaim Roofing', phone: '(801) 644-7300', source: 'bbb-scrape' },
  { business_name: 'Full Force Roofing & Exteriors', phone: '(801) 828-7340', source: 'bbb-scrape' },
  { business_name: 'Riverfront Roofing', phone: '(801) 941-7350', source: 'bbb-scrape' },
  { business_name: 'Xperience Roofing, LLC', phone: '(801) 502-5522', source: 'bbb-scrape' },
  { business_name: 'Avalanche Roofing Services, LLC', phone: '(801) 599-1805', source: 'bbb-scrape' },
  { business_name: 'Go Pro Roofing', phone: '(801) 232-5823', source: 'bbb-scrape' },
  { business_name: 'EAVE®', phone: '(385) 396-4241', source: 'bbb-scrape' },
  { business_name: 'Scenic Exteriors, LLC', phone: '(385) 272-8358', source: 'bbb-scrape' },
  { business_name: 'Salazar Construction and Roofing', phone: '(801) 214-8130', source: 'bbb-scrape' },
  { business_name: 'Top-Grade Roofing, LLC', phone: '(801) 662-9497', source: 'bbb-scrape' },
  { business_name: 'Erie Home', phone: '(801) 215-9991', source: 'bbb-scrape' }
];

async function insert() {
    const { error } = await supabase.from('contractors').insert(newContractors);
    if (error) console.error('Error:', error.message);
    else console.log('Successfully inserted BBB batch.');
}
insert();
