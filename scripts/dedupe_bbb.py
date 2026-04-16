import re

known_data = """
Jemza Roofing SLC, Inc. | (385) 261-2942
Pro-West, LLC | (801) 301-1404
BluSky Restoration Contractors, LLC | (801) 782-1800
Superior Home Improvement, Inc. | (801) 638-3700
JR Roofing & Construction | (801) 706-1677
S & S Handyman Service | (801) 954-0046
J & N Roofing Maintenance, LLC | (801) 969-5759
Maximum Roofing Solutions | (435) 328-1384
Advanced Window Products | (801) 438-3515
Shingle Pro Roofing | (801) 567-9093
Reimagine Roofing & Construction, LLC | (480) 900-7663
Aspen Contracting, Inc. | (877) 784-7663
ACW Construction, LLC | (435) 640-8375
Titan Roofing, Inc. | (801) 833-2190
Premier Roofing, Inc. | (801) 949-0939
"""

raw_scraped = """
Olympus Roofing Co
4.9(77)
(801) 449-9753
S & S Roofing, Inc.
4.6(139)
(801) 272-7000
Heaton Bros. Roofing Co. Inc.
BBB Rating: A+
(385) 340-3901
American Roofing Company
BBB Rating: A+
(801) 269-1276
The Roof Doctor, LLC
(801) 512-3614
Vertex Roofing
(801) 618-3307
DaBella
(844) 322-3552
Utah Roofing Pros
(801) 688-3853
RoofTek
(801) 826-4820
Beehive Roof and Window, LLC
(801) 969-5759
Brady Roofing, Inc.
(801) 487-5151
R&R Partner Roofing
(801) 577-4296
Your Home Improvement Company, LLC
(801) 919-8229
"""

def parse_input(text):
    data = []
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        name = lines[i]
        phone = None
        for j in range(1, 4):
            if i+j < len(lines):
                match = re.search(r'\(\d{3}\)\s*\d{3}-\d{4}', lines[i+j])
                if match:
                    phone = match.group(0)
                    break
        if phone:
            data.append({"name": name, "phone": phone})
            i += 3
        else:
            i += 1
    return data

known = set(line.split('|')[1].strip() for line in known_data.strip().split('\n') if '|' in line)
items = parse_input(raw_scraped)

print("--- NEW ENTRIES ---")
for item in items:
    if item['phone'] and item['phone'] not in known:
        print(f"{item['name']} | {item['phone']}")
