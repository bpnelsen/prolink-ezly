from supabase import create_client
import json
import os

# Initialize Supabase
url = os.environ.get('NEXT_PUBLIC_SUPABASE_URL')
key = os.environ.get('NEXT_PUBLIC_SUPABASE_ANON_KEY')
supabase = create_client(url, key)

def get_specialty_from_business_name(name):
    name_lower = name.lower()
    if 'roof' in name_lower: return ['Roofing']
    if 'electric' in name_lower: return ['Electrical']
    if 'plumb' in name_lower: return ['Plumbing']
    if 'hvac' in name_lower or 'heating' in name_lower or 'air' in name_lower: return ['HVAC']
    if 'handyman' in name_lower: return ['Handyman']
    return ['General Contractor']

def run_audit():
    # Fetch all with empty specialties
    response = supabase.from_('contractors').select('id, business_name, specialties').is_('specialties', 'null').execute()
    contractors = response.data
    
    print(f"Auditing {len(contractors)} contractors...")
    
    for c in contractors:
        new_specialty = get_specialty_from_business_name(c['business_name'])
        supabase.from_('contractors').update({'specialties': new_specialty}).eq('id', c['id']).execute()
        print(f"Updated {c['business_name']} to {new_specialty}")

run_audit()
