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
Olympus Roofing Co | (801) 449-9753
Heaton Bros. Roofing Co. Inc. | (385) 340-3901
American Roofing Company | (801) 269-1276
The Roof Doctor, LLC | (801) 512-3614
Vertex Roofing | (801) 618-3307
DaBella | (844) 322-3552
Utah Roofing Pros | (801) 688-3853
RoofTek | (801) 826-4820
Beehive Roof and Window, LLC | (801) 969-5759
Brady Roofing, Inc. | (801) 487-5151
R&R Partner Roofing | (801) 577-4296
Your Home Improvement Company, LLC | (801) 919-8229
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

raw_scraped = """
Sky Bridge Roofing
(435) 659-4915
FX Remodeling & Exterior - Salt Lake City
(801) 829-9556
Salty Peaks Construction Inc
(385) 242-9799
Solution Builders LLC
(801) 610-1907
Nomad Roofing
(435) 841-7787
CMR Construction & Roofing, LLC
(855) 766-3267
Big M Construction, Inc.
(801) 521-8449
New Horizonte Roofing
(801) 879-3365
High Point Roofing, LLC
(385) 216-1425
Foss Roofing Company
(801) 486-6823
Superior Roofing And Sheet Metal, Inc.
(801) 266-1473
Roger Vandersteen Roofing
(801) 243-6419
Affordable Carpentry Inc.
(801) 793-3014
GM Roofers
(801) 657-1457
Northwest Roofing, L.L.C.
(801) 320-9793
Olympus Roofing Co
(801) 449-9753
S & S Roofing, Inc.
(801) 272-7000
Heaton Bros. Roofing Co. Inc.
(385) 340-3901
American Roofing Company
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
X-Siding, Inc.
(801) 944-9636
Bartlett Roofing
(208) 286-4187
Zaim Roofing
(801) 644-7300
Full Force Roofing & Exteriors
(801) 828-7340
Riverfront Roofing
(801) 941-7350
Xperience Roofing, LLC
(801) 502-5522
Avalanche Roofing Services, LLC
(801) 599-1805
Olympus Roofing Co
(801) 449-9753
Go Pro Roofing
(801) 232-5823
EAVE®
(385) 396-4241
Scenic Exteriors, LLC
(385) 272-8358
Salazar Construction and Roofing
(801) 214-8130
Utah Roofing Pros
(801) 688-3853
Top-Grade Roofing, LLC
(801) 662-9497
Erie Home
(801) 215-9991
"""

def parse(text):
    data = []
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        name = lines[i]
        phone = None
        if i+1 < len(lines):
            match = re.search(r'\(\d{3}\)\s*\d{3}-\d{4}', lines[i+1])
            if match:
                phone = match.group(0)
        
        if phone:
            data.append({"name": name, "phone": phone})
            i += 2
        else:
            i += 1
    return data

known = set(line.split('|')[1].strip() for line in known_data.strip().split('\n') if '|' in line)
items = parse(raw_scraped)

print("--- NEW UNIQUE ENTRIES ---")
for item in items:
    if item['phone'] and item['phone'] not in known:
        print(f"{item['name']} | {item['phone']}")
