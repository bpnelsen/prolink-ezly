import re

text = """
The Roofing Contractor
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
Closed · Opens 12 AM Mon · (801) 923-6128
Best Quality Roofing & Constructions services LLC
5.0(1)
Roofing contractor · 2672 Clydesdale Cir
Closed · Opens 6:30 AM Mon · (801) 696-1482
Pro Roofing Ut
5.0(40)
Roofing contractor · 10868 N 6000 W
Closed · Opens 8 AM Mon · (801) 512-9969
Signature Roofing Utah
5.0(68)
Roofing contractor · 1641 W 1320 N
Open 24 hours · (801) 420-1911
South Jordan's Best Roofing
4.8(16)
Roofing contractor ·  · 1098 UT-151 #110
Closed · Opens 7 AM Mon · (385) 247-1091
Roofing
4.5(13)
Roofing contractor ·  · 3400 N 1200 W
Closed · Opens 7 AM Mon
Go Pro Roofing
5.0(59)
Roofing contractor · 5291 W Ted Wy
Open 24 hours · (801) 232-5823
Pierce Roofing & Siding
5.0(7)
Roofing contractor · 3450 Triumph Blvd Suite #102
Closed · Opens 8 AM Mon · (385) 304-4764
Big West Roofing
5.0(64)
Roofing contractor · 2455 S Cottage Cove
Closed · Opens 7 AM Mon · (801) 336-4840
Elite Commercial Roofing LLC
5.0(20)
Roofing contractor · 4196 Farm Rd
Open 24 hours · (385) 273-5295
Olympus Roofing
4.8(286)
Roofing contractor · 60 E Burton Ave
Closed · Opens 9 AM Mon · (801) 754-6773
Roof-It, Inc.
4.9(198)
Roofing contractor · 3424 W 2400 S Suite B
Closed · Opens 8 AM Mon · (801) 809-7663
Whitaker Roofing Services
5.0(350)
Roofing contractor · 452 E 3900 S
Closed · Opens 8 AM Mon · (801) 758-7916
Jordan River Roofing
4.9(40)
Roofing contractor ·  · 1278 Kimman Ln
Closed · Opens 8 AM Mon · (801) 857-1417
West Jordan Roofing Solutions
4.5(17)
Roofing contractor · 7733 S Redwood Rd
Open 24 hours · (877) 684-0078
Integrity Roofing
5.0(6)
Roofing contractor · 13229 South Akagi Ln
(801) 318-4117
American Roofing Company
4.7(240)
Roofing contractor · 3637 S 300 W
Closed · Opens 8 AM Mon · (801) 758-7130
Rooftek
5.0(26)
Roofing contractor · 21 E 100 N #201
Closed · Opens 12 AM Mon · (801) 980-7110
The Roof Doctor
4.8(320)
Roofing contractor · 2854 S Redwood Rd C4
Closed · Opens 8 AM Mon
UT Roofs
4.5(17)
Roofing contractor · 11560 S State St
Closed · Opens 8 AM Mon · (801) 486-3300
V3 Roofing & Renovation
4.9(27)
Roofing contractor · 6104 W 9860 S
Closed · Opens 8 AM Mon · (385) 900-4618
Prestige Roofing and Exteriors
5.0(33)
Roofing contractor ·  · 420 W Main St
Closed · Opens 8 AM Mon · (801) 876-7663
Master Roofing
4.9(317)
Roofing contractor · 1279 W 300 S St #4
Closed · Opens 9 AM Mon · (385) 438-0250
MTM Roofing
4.4(83)
Roofing contractor ·  · 525 S 850 E suite 5
Closed · Opens 9 AM Mon · (435) 422-4167
Vertex Roofing
4.9(400)
Roofing contractor ·  · 3809 S 300 W
Closed · Opens 8 AM Mon · (801) 618-3154
Revive Roofing & Construction
5.0(52)
Roofing contractor · 9980 S 300 W #200
Closed · Opens 8 AM Mon · (385) 446-8252
R1 Roofing & Exteriors – Utah
4.9(108)
Roofing contractor · 1325 S 500 E #307
Closed · Opens 9 AM Mon · (385) 417-4105
Snowbird Roofing and Siding LLC
4.8(103)
Roofing contractor ·  · 1145 S 800 E Suite 147
Closed · Opens 6 AM Mon · (385) 438-7663
Preferred Roofing and Exteriors
4.8(24)
Roofing contractor ·  · 3450 W 8600 S
Closed · Opens 8 AM Mon · (801) 930-9835
Collins Roofing
4.5(22)
Roofing contractor ·  · 3 E State St
Closed · Opens 8 AM Mon · (801) 341-8071
Elkstone Roofing and Construction
5.0(16)
Contractor · 859 South Jordan Pkwy # 101
Closed · Opens 8 AM Mon · (801) 822-2399
Brady Roofing
4.8(77)
Roofing contractor · 2729 Andrew Avenue
Closed · Opens 8 AM Mon · (801) 208-5619
West Desert Roofing
4.9(57)
Roofing contractor · 777 Automall Drive
Closed · Opens 7 AM Mon · (385) 204-5846
Definitive Construction
4.9(126)
Roofing contractor ·  · 901 Baxter Dr
Closed · Opens 8 AM Mon · (801) 210-9798
Avalanche Roofing Services LLC
4.9(93)
Roofing contractor · 3755 W Rancho Vista Ln
Closed · Opens 7:30 AM Mon · (801) 599-1805
King Roofing
4.6(213)
Roofing contractor ·  · 707 Technology Ave Suite E11-B
Closed · Opens 8 AM Mon · (385) 450-5464
High Peak Roofing & Exterior
5.0(37)
Roofing contractor · 4292 N Poplar St
Closed · Opens 7:30 AM Mon · (385) 542-1115
Chipman Roofing
4.8(44)
Roofing contractor · 7065 Commerce Park Dr
Closed · Opens 9 AM Mon · (801) 664-2906
On Call Roofers Inc
No reviews
Roofing contractor · 209 Hollow Bend Dr
Open 24 hours · (385) 529-1032
Red Peaks Roofing
5.0(1)
Roofing contractor ·  · 429 W 1560 N
(385) 482-9707
S&S Roofing, Inc.
4.6(133)
Roofing contractor · 2331 S Redwood Rd
Closed · Opens 8 AM Mon · (801) 272-7000
Raven Roofing and Contracting
4.8(46)
Roofing contractor · 767 S Auto Mall Dr
Closed · Opens 7 AM Mon · (801) 367-7554
Leatherneck Roofing
5.0(49)
Roofing contractor · 1749 E Fall St
Closed · Opens 8 AM Mon · (801) 941-9942
Royal Roofers
5.0(16)
Roofing contractor · 1002 W 360 S
Closed · Opens 9 AM Mon · (801) 641-0332
IKON Roofing
4.9(85)
Roofing contractor · 1871 W 7800 S
Closed · Opens 8 AM Mon · (801) 573-6010
Cascade Roofing Services, Inc.
4.9(48)
Roofing contractor · 644 S 1325 W St
Closed · Opens 8 AM Mon · (801) 831-4428
Herriman Roofing
5.0(14)
Roofing contractor · 11953 Herriman Main St #235
Closed · Opens 9 AM Mon · (385) 206-5749
All Star Roofing LLC
4.9(149)
Roofing contractor · 321 w 1185 n
Closed · Opens 8 AM Mon · (801) 876-7781
Louis & Sons Roofers
4.9(23)
Roofing contractor · 883 S Orem Blvd #7820
Open 24 hours
Kimball Roofing & Siding
4.8(60)
Roofing contractor · 2650 S 300 W
Open 24 hours · (435) 657-9991
Sentinel Roofers
4.7(12)
Roofing contractor · 3450 Triumph Blvd Suite #102
Closed · Opens 9 AM Mon · (855) 834-9766
Smart Roofing & Skylights
5.0(2)
Contractor · 6076 W 12900 S
Closed · Opens 6 AM Mon
Blue Collar Roofing
5.0(1)
Contractor · 4096 Juniper Hills Dr
Closed · Opens 6 AM Mon · (435) 817-3077"""

def count_contractors(text):
    count = 0
    lines = [l.strip() for l in text.strip().split('\n') if l.strip()]
    for line in lines:
        if "Roofing contractor" in line or "Contractor ·" in line:
            count += 1
    return count

print(f"Total contractors found: {count_contractors(raw_data)}")
