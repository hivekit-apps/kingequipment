#!/usr/bin/env python3
"""
V6 site.json rewrite: invert equipment (mini visible, CAT hidden), flip hero,
carry V5 pricing to mini, rewrite shortDescription/trustPoints/FAQ/city
localContexts to be mini-only (no CAT 259B3 mentions), rewrite the delivery
FAQ to use async/form language (F5 phone-path hide).

Per V6 wall: F1+F5 config-level changes. Pricing carries over per owner
directive ($249.99/$1,049.93/$2,999.70 = whatever machine Kiril rents).
"""
import json
import re
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "config" / "site.json"
data = json.loads(SITE.read_text())

# ---- business.shortDescription ----
data["business"]["shortDescription"] = (
    "Local skid-steer rental, owner-operated. Mini stand-on track loader that "
    "fits through a standard 36-inch gate — ideal for backyards, tight-access "
    "jobs, residential landscaping, and small demolition. Daily, weekly, and "
    "monthly rates. Free delivery within King Township; flat-rate delivery "
    "across the GTA."
)

# ---- heroPhoto: switch to mini-loading-bin-residential (the V4 hero) ----
data["heroPhoto"] = {
    "src": "/images/mini-loading-bin-residential.webp",
    "alt": "Our mini stand-on track loader loading bricks into a disposal bin on a residential GTA street — fits through a standard 36-inch gate.",
    "width": 960,
    "height": 1280,
}

# ---- equipment: invert visibility + carry pricing to mini ----
for item in data["equipment"]:
    if item["id"] == "cat-259b3":
        item["visible"] = False
        item["bookable"] = False
    elif item["id"] == "mini-stand-on":
        item["visible"] = True
        item["bookable"] = True
        item["displayRate"] = "$249.99 / day"

# ---- trustPoints ----
data["trustPoints"] = [
    "Local owner-operator — not a national chain",
    "Mini stand-on track loader — fits through 36-inch gates, owner-maintained",
    "Free delivery within King Township; flat-rate across the GTA",
    "Backed by 10+ years construction industry experience",
]

# ---- FAQ: rewrite for mini + async-only (F5 hides phone path) ----
data["faq"] = [
    {
        "q": "How much does the mini stand-on loader cost to rent?",
        "a": "$249.99 per day, $1,049.93 per week, or $2,999.70 per month. Pricing is final after we confirm dates and delivery. Request a booking right from this site.",
    },
    {
        "q": "How does delivery work?",
        "a": "Free pickup at our King Township location. Free delivery within King Township. $99 flat delivery fee for the Greater Toronto Area. For other locations in Southern Ontario, please request via the form and we'll quote delivery before we book.",
    },
    {
        "q": "Do you deliver to Aurora, Newmarket, or Richmond Hill?",
        "a": "Yes — these are all part of our GTA flat-rate delivery zone. We serve the full north GTA halo including Aurora, Newmarket, Richmond Hill, Vaughan, north Toronto, and Bradford.",
    },
    {
        "q": "How many days can I rent for?",
        "a": "Anywhere from a single day to multi-week or multi-month rentals. Rates are tiered: daily for short rentals, weekly when you cross 7 days, monthly when you cross 30 days.",
    },
    {
        "q": "Does the rental come with an operator?",
        "a": "No — the renter operates. Stand-on platform with a lighter learning curve than a full-size loader; experienced operator still recommended. If you need a trained operator, mention it in your request and we can refer one.",
    },
    {
        "q": "What attachments are included?",
        "a": "The mini stand-on loader comes with a standard bucket. If you need a specific attachment, mention it in your booking request.",
    },
    {
        "q": "How do I book?",
        "a": "Use the booking form on this site to pick your dates, delivery option, and contact details. We confirm dates and delivery via email within a few hours during business hours.",
    },
]

# ---- city localContexts: rewrite to mini-only, no CAT mentions ----
# Each city had a context comparing CAT vs mini; rewrite to a mini-first
# narrative that respects the city's lot character. Per F-CT-1, the scaffold
# is the customer's mental model of WHICH machine — Kiril rents the mini,
# so all city contexts speak about the mini.
CITY_CONTEXTS = {
    "king-city": (
        "King City is our home base. Most of our King City work runs on a mix "
        "of village lots, estates, and rural residential along Dufferin and "
        "Bathurst. The mini stand-on loader fits through standard 36-inch "
        "gates and handles backyard build-outs, driveway prep, and grading "
        "without tearing up access points. Same-day delivery on most King "
        "City jobs."
    ),
    "aurora": (
        "Aurora is the heart of our core service area. We deliver across "
        "Aurora — from the older lots in Aurora Village to the newer Bayview "
        "Wellington and St. Andrew sub-divisions. The mini stand-on loader "
        "fits through almost every Aurora backyard gate (most are built to "
        "the standard 36-inch spec) and is the right pick for the typical "
        "backyard landscaping, foundation, and grading work in Aurora."
    ),
    "newmarket": (
        "Newmarket has a mix of older town-centre lots and newer suburban "
        "developments — the mini stand-on loader fits the older streets "
        "where lot lines are tight and works just as well on the newer "
        "Stonehaven and Summerhill builds. We deliver across Newmarket "
        "including the south end near Davis Drive."
    ),
    "richmond-hill": (
        "Richmond Hill jobs range from estate properties up in Oak Ridges to "
        "denser lots around Mill Pond and Bayview Hill. The mini stand-on "
        "loader fits through most Richmond Hill gates and handles backyard "
        "build-outs, foundation prep, and grading on a typical Richmond Hill "
        "lot. We deliver across Richmond Hill."
    ),
    "vaughan": (
        "Vaughan is one of the busiest parts of our service area — a wide "
        "mix of new developments (Vellore, Maple) and older established "
        "neighbourhoods (Thornhill, Woodbridge, Kleinburg). The mini "
        "stand-on loader covers backyard landscaping, foundation prep, and "
        "the typical residential build-out across all of these areas."
    ),
    "bradford": (
        "Bradford and the Holland Marsh corridor are on our regular route. "
        "The mini stand-on loader handles the in-town sub-divisions, "
        "backyard work, and smaller rural-property jobs around Bond Head "
        "and Bradford West Gwillimbury. We're familiar with the Holland "
        "Marsh soil — bring boards if you're crossing soft ground."
    ),
    "toronto": (
        "Toronto jobs are almost always tight-access — older lots with "
        "mature trees, narrow side yards, and standard backyard gates. The "
        "mini stand-on loader is the workhorse here; it fits through 36-inch "
        "gates that bigger machines can't approach. For downtown jobs, "
        "mention parking, unloading, and any street-occupancy permit notes "
        "in your request. Delivery fee applies on Toronto jobs (we'll quote "
        "up-front)."
    ),
    "north-york": (
        "North York is mostly older established neighbourhoods with deep "
        "lots — the mini stand-on loader is the right fit for the tight "
        "access typical along Yonge, Bayview, and Leslie. Backyard "
        "build-outs and foundation prep on Willowdale and Bayview Village "
        "additions are routine work for us. We deliver across North York."
    ),
    "scarborough": (
        "Scarborough has a wide mix of lot sizes — from the tighter older "
        "streets near Kingston Road to the larger newer builds out past "
        "Markham Road. The mini stand-on loader covers most residential "
        "landscaping, grading, and foundation work across Scarborough. "
        "Delivery fee applies — quoted before we book."
    ),
    "etobicoke": (
        "Etobicoke is mostly older established residential — narrower lots "
        "near the lake (Mimico, Long Branch) and wider mature lots in the "
        "Kingsway. The mini stand-on loader is the right call for most "
        "Etobicoke backyards and fits through the standard 36-inch gates "
        "typical here. We deliver across Etobicoke; delivery fee applies."
    ),
    "mississauga": (
        "Mississauga has a wide range — from estate properties in Lorne "
        "Park to denser modern sub-divisions in Erin Mills and Meadowvale. "
        "The mini stand-on loader handles backyard build-outs, landscaping, "
        "and grading on the typical Mississauga residential lot. Delivery "
        "fee applies — quoted up-front."
    ),
    "brampton": (
        "Brampton is mostly newer sub-divisions with standard 36-inch "
        "gates — the mini stand-on loader fits through almost every "
        "Brampton backyard. Backyard build-outs behind the typical "
        "two-storey detached, driveway prep, and foundation digging on new "
        "builds are routine work. Delivery fee applies — quoted up-front."
    ),
    "caledon": (
        "Caledon is mostly large rural and estate lots. The mini stand-on "
        "loader handles the in-town jobs around Bolton and Caledon East and "
        "the more manageable rural property work where access is "
        "controlled. We're comfortable on the gravel roads up past "
        "Highway 9. Delivery fee applies."
    ),
    "markham": (
        "Markham is a mix of modern sub-divisions (Cornell, Cathedraltown, "
        "Box Grove) and older village cores (Unionville, Thornhill, Markham "
        "village). The mini stand-on loader is the right pick for the older "
        "village backyards and the typical modern-lot backyard build-out. "
        "We deliver across Markham."
    ),
    "stouffville": (
        "Stouffville has a strong mix of old-village in-town lots and newer "
        "estate-style builds north along Highway 48. The mini stand-on "
        "loader fits the older streets and the newer Ballantrae and "
        "Wheler's Mill backyards. We're on the route regularly."
    ),
    "uxbridge": (
        "Uxbridge is rural and semi-rural — long driveways, larger "
        "residential lots, and a fair amount of equestrian property. The "
        "mini stand-on loader handles in-village jobs and smaller "
        "rural-property work where access is controlled. We're comfortable "
        "with the gravel and rolling terrain typical north of the village."
    ),
    "ajax": (
        "Ajax is mostly newer sub-divisions with standard gate widths — the "
        "mini stand-on loader fits through almost every Ajax backyard. "
        "Backyard build-outs behind the typical two-storey, foundation prep "
        "on additions, and grading for patio and pool installs are routine. "
        "Delivery fee applies on Ajax jobs — quoted before we book."
    ),
    "pickering": (
        "Pickering covers a wide area from the lake-side neighbourhoods "
        "(Bay Ridges, West Shore) through to the newer Seaton developments. "
        "The mini stand-on loader is the workhorse for most residential "
        "landscaping and grading work across Pickering. Delivery fee "
        "applies — quoted before we book."
    ),
    "whitby": (
        "Whitby has a wide spread — older lots in Pringle Creek and "
        "downtown, newer sub-divisions in Brooklin and Rolling Acres. The "
        "mini stand-on loader handles backyard build-outs, foundation prep, "
        "and grading on the typical Whitby residential lot. Delivery fee "
        "applies on Whitby jobs."
    ),
    "oshawa": (
        "Oshawa runs from the older lake-side neighbourhoods through the "
        "newer Windfields and Taunton developments. The mini stand-on "
        "loader covers most residential backyard work, foundation prep on "
        "additions, and grading across Oshawa. Delivery fee applies — "
        "quoted before we book."
    ),
    "bowmanville": (
        "Bowmanville is mostly newer Northglen and Aspen Springs "
        "sub-divisions plus the older heritage core downtown. The mini "
        "stand-on loader handles backyard work behind newer two-storeys "
        "and the typical residential landscape install. Delivery fee "
        "applies on Bowmanville jobs."
    ),
    "clarington": (
        "Clarington is mostly rural and semi-rural across Courtice, "
        "Newcastle, and Orono. The mini stand-on loader handles in-town "
        "jobs and the more manageable rural-property work. We'll travel "
        "for Clarington jobs — delivery fee applies and is quoted up-front."
    ),
    "oakville": (
        "Oakville is a mix of older established lots (Old Oakville, "
        "Bronte) and larger estate-style modern builds (Glen Abbey, "
        "Joshua Creek). The mini stand-on loader is the right fit for the "
        "tight access typical in Old Oakville and handles backyard work on "
        "the larger lots further north. Delivery fee applies — quoted "
        "before we book."
    ),
    "burlington": (
        "Burlington runs from older lake-side neighbourhoods (Aldershot, "
        "Roseland) up through newer Alton Village. The mini stand-on "
        "loader handles backyard landscaping, foundation prep, and "
        "material-handling work on a typical Burlington residential lot. "
        "Delivery fee applies on Burlington jobs."
    ),
    "milton": (
        "Milton is mostly newer sub-divisions (Hawthorne Village, Beaty, "
        "Scott) with standard gate widths — the mini stand-on loader fits "
        "through almost every Milton backyard. Backyard build-outs, "
        "foundation prep on residential builds, and grading for landscape "
        "installs are routine. Delivery fee applies."
    ),
}

for city in data["cityPages"]["cities"]:
    slug = city["slug"]
    if slug in CITY_CONTEXTS:
        city["localContext"] = CITY_CONTEXTS[slug]
    else:
        # Fallback: scrub CAT references via regex (shouldn't trigger if all
        # 25 slugs are covered above, but safety net per F-CT-4 openness).
        ctx = city["localContext"]
        ctx = re.sub(r"\bCAT 259B3\b", "mini stand-on loader", ctx)
        city["localContext"] = ctx

# ---- Write back with stable formatting ----
SITE.write_text(json.dumps(data, indent=2) + "\n")
print(f"site.json rewritten: {SITE}")
print(f"  equipment cat-259b3 visible={data['equipment'][0]['visible']}")
print(f"  equipment mini-stand-on visible={data['equipment'][1]['visible']}")
print(f"  mini displayRate={data['equipment'][1]['displayRate']}")
print(f"  hero={data['heroPhoto']['src']}")
print(f"  cities rewritten={len(CITY_CONTEXTS)}/{len(data['cityPages']['cities'])}")
