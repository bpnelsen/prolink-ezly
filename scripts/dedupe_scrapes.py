import re

raw_data = """The Roofing Contractor
4.9(80)
Roofing contractor · 781 W 14600 S
Open 24 hours · (801) 738-0736
Far West Roofing
4.6(139)
Roofing contractor · 14528 S Camp Williams Rd Suite C
Closed · Opens 8 AM Mon · (801) 253-7799
Rocky Mountain Roofing UT, LLC
5.0(90)
Roofing contractor ·  · 1733 Auburn Ridge Ln
Open 24 hours · (801) 201-2685
Layton Roofing Company Inc
4.2(13)
Roofing contractor ·  · 14851 Heritage Crest Way # D
(801) 495-3939
Lasting Impressions Roofing & Improvements
5.0(78)
Roofing contractor · 15158 S Wild Horse Wy
Closed · Opens 8:30 AM Mon · (385) 355-4778
Patriot Roofing & Construction
4.8(180)
Roofing contractor · 13894 S Bangerter Pkwy Ste 200
Closed · Opens 9 AM Mon · (801) 760-7631
Mountain Valley Roofing
5.0(59)
Roofing contractor · 1262 W 12700 S C
Closed · Opens 9 AM Mon · (801) 866-9756
Mountain Roofers
4.9(56)
Roofing contractor · 371 S 960 W
Open 24 hours · (435) 222-3066
MAD Roofing
4.8(309)
Roofing contractor ·  · 12577 S 265 W
Closed · Opens 9 AM Mon · (801) 900-3296
Pride Roofing & Contracting, LLC
4.9(44)
Roofing contractor · 12390 S 800 E
Open 24 hours · (385) 235-3988
Roofing & Restoration by Romney
5.0(10)
Roofing contractor · 4318 W Rex Peak Wy
Open 24 hours · (702) 249-9217
Utah Roofing Company
4.8(16)
Roofing contractor · 1072 W 3020 N
Closed · Opens 12 AM Mon · (385) 207-9667
The Roofing Center
5.0(237)
Roofing contractor ·  · 208 Cottage Ave
Open 24 hours · (801) 810-4937
Utah Roofing Experts
4.9(47)
Roofing contractor · 3300 Triumph Blvd Suite 200 #265
Closed · Opens 12 AM Mon · (385) 766-3464
Aesthetic Roofing
4.8(320)
Roofing contractor ·  · 10653 S River Front Pkwy Ste 250
Closed · Opens 9 AM Mon · (801) 630-7444
Salt Lake Roofing
3.0(1)
Roofing contractor · 14528 S Camp Williams Rd Suite C
Closed · Opens 9 AM Mon · (385) 316-7026
Dynamite Roofing
4.9(243)
Roofing contractor ·  · 3300 Triumph Blvd Suite 100
Closed · Opens 7 AM Mon · (801) 448-0017
Nexgen Roofing | Roofing, Siding & Gutters
5.0(53)
Roofing contractor ·  · 10421 S Jordan Gateway #600
Closed · Opens 7 AM Mon · (385) 462-0289
JLB Roofing Utah
4.8(41)
Roofing contractor · 10575 S 420 E
Closed · Opens 6 AM Mon · (801) 645-1647
Bigfoot Roofing & Gutters
5.0(415)
Roofing contractor · 6621 N Desert Peak St
Closed · Opens 9 AM Mon · (385) 482-6069
Capstone Roofing & Siding LLC
5.0(11)
Roofing contractor ·  · 2120 W 12600 S suite c
Closed · Opens 10 AM Mon · (801) 252-4885
Bartlett Roofing
4.6(520)
Roofing contractor ·  · 1935 E Vine St #240
Open 24 hours · (801) 509-6464
Heritage Roofing
3.7(3)
Roofing contractor · 14720 Heritage Crest Way
Closed · Opens 9 AM Mon · (801) 576-8447
Intermountain West Contractors
4.9(514)
Roofing contractor ·  · 3680 W 9000 S
Closed · Opens 9 AM Mon · (801) 232-5690
Ensign Roofing Utah
5.0(23)
Roofing contractor · 2701 N Thanksgiving Way #100
Closed · Opens 12 AM Mon · (801) 923-6128"""

def extract_contractors(text):
    contractors = []
    # More robust line-by-line parsing
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    i = 0
    while i < len(lines):
        line = lines[i]
        # Skip ratings and contractor descriptive lines
        if re.match(r'^\d+(\.\d+)?\(\d+\)', line) or "Roofing contractor" in line:
            i += 1
            continue
        
        # This line is likely the business name
        name = line
        
        # Check next few lines for phone
        phone = None
        for j in range(1, 4):
            if i+j < len(lines):
                match = re.search(r'\(\d{3}\)\s*\d{3}-\d{4}', lines[i+j])
                if match:
                    phone = match.group(0)
                    break
        
        if phone:
            contractors.append({"name": name, "phone": phone})
            i += 1
        else:
            i += 1
    return contractors

data = extract_contractors(raw_data)
for item in data:
    print(f"{item['name']} | {item['phone']}")
