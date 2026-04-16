import requests
import json
import os
from supabase import create_client

# Load environment
env_file = '/data/.openclaw/workspace/prolink-ezly/.env'
env = {}
with open(env_file, 'r') as f:
    for line in f:
        if '=' in line:
            name, value = line.split('=', 1)
            env[name.strip()] = value.strip()

supabase = create_client(env['NEXT_PUBLIC_SUPABASE_URL'], env['NEXT_PUBLIC_SUPABASE_ANON_KEY'])
SERPER_API_KEY = env['SERPER_API_KEY']

def search_serper(query, location):
    url = "https://google.serper.dev/places"
    payload = json.dumps({"q": query, "location": location})
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }
    response = requests.request("POST", url, headers=headers, data=payload)
    return response.json().get('places', [])

def import_batch(batch):
    supabase.from_('contractors').insert(batch).execute()

# Trades and locations
trades = ["Electricians", "Plumbers", "HVAC", "Roofers", "Remodeling", "Landscaper", "Painting", "Carpentry"]
locations = ["Salt Lake County, Utah", "Utah County, Utah", "Davis County, Utah"]

for trade in trades:
    for loc in locations:
        print(f"Searching for {trade} in {loc}...")
        results = search_serper(trade, loc)
        
        batch = []
        for res in results:
            batch.append({
                "business_name": res.get("title"),
                "phone": res.get("phone", "N/A"),
                "specialties": [trade],
                "source": "serper-api"
            })
        
        if batch:
            import_batch(batch)
            print(f"Imported {len(batch)} contractors.")
        time.sleep(2)
EOF
# I'll let you know when this scraping loop is fully underway!
