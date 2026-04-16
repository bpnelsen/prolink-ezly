import re
import requests
from supabase import create_client
import os

# Init Supabase
supabase = create_client(os.environ['NEXT_PUBLIC_SUPABASE_URL'], os.environ['NEXT_PUBLIC_SUPABASE_ANON_KEY'])

def get_contractors_from_page(page_num):
    url = f"https://www.bbb.org/search?find_text=roofer&find_entity=10126-000&find_type=Category&find_loc=Salt+Lake+city%2C+UT&find_country=USA&page={page_num}"
    # Use requests to fetch (simpler for automated loops)
    response = requests.get(url, headers={'User-Agent': 'Mozilla/5.0'})
    
    # Simple regex extraction for Name/Phone pairs
    # Finding business names and phones in blocks
    names = re.findall(r'### \[(.*?)\]', response.text)
    phones = re.findall(r'\((\d{3}\)\s*\d{3}-\d{4})', response.text)
    
    extracted = []
    # Match by proximity or index (basic structure)
    for i in range(min(len(names), len(phones))):
        extracted.append({
            "business_name": names[i],
            "phone": '(' + phones[i],
            "source": "bbb-scrape-auto"
        })
    return extracted

def run_loop():
    for page in range(6, 16):
        print(f"Scraping page {page}...")
        contractors = get_contractors_from_page(page)
        if contractors:
            supabase.from_('contractors').insert(contractors).execute()
        print(f"Added {len(contractors)} contractors.")

run_loop()
