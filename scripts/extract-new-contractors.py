import re

known_phones = [
    '(801) 738-0736', '(801) 253-7799', '(801) 201-2685', '(801) 495-3939', '(385) 355-4778',
    '(801) 760-7631', '(801) 866-9756', '(435) 222-3066', '(801) 900-3296', '(385) 235-3988',
    '(702) 249-9217', '(385) 207-9667', '(801) 810-4937', '(385) 766-3464', '(801) 630-7444',
    '(385) 316-7026', '(801) 448-0017', '(385) 462-0289', '(801) 645-1647', '(385) 482-6069',
    '(801) 252-4885', '(801) 509-6464', '(801) 576-8447', '(801) 232-5690', '(801) 923-6128'
]

raw_scraped = """
Sky Bridge Roofing | (435) 659-4915
FX Remodeling & Exterior - Salt Lake City | (801) 829-9556
Salty Peaks Construction Inc | (385) 242-9799
Solution Builders LLC | (801) 610-1907
Nomad Roofing | (435) 841-7787
CMR Construction & Roofing, LLC | (855) 766-3267
Big M Construction, Inc. | (801) 521-8449
New Horizonte Roofing | (801) 879-3365
High Point Roofing, LLC | (385) 216-1425
Foss Roofing Company | (801) 486-6823
Superior Roofing And Sheet Metal, Inc. | (801) 266-1473
Roger Vandersteen Roofing | (801) 243-6419
Affordable Carpentry Inc. | (801) 793-3014
GM Roofers | (801) 657-1457
Northwest Roofing, L.L.C. | (801) 320-9793
"""

lines = [line.strip() for line in raw_scraped.strip().split('\n') if line.strip()]
new_data = []

for line in lines:
    parts = line.split('|')
    if len(parts) == 2:
        name = parts[0].strip()
        phone = parts[1].strip()
        if phone not in known_phones:
            new_data.append({"business_name": name, "phone": phone, "source": "bbb-scrape"})

print(new_data)
