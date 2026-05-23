# Building Code Integration — Research

Research doc for `P4.2` in `TODO.md`. Goal: figure out how the Prolink "foreman" AI agent could reference building codes (IRC, IBC, plumbing, etc.) without exposing Prolink to copyright liability.

---

## TL;DR

**Recommended path:** Combine three sources in a layered architecture:
1. **ICC Code Connect API** (licensed) — primary source for I-Codes content. Annual subscription, pricing by vendor employee count and number of titles. Returns JSON, caching permitted under license.
2. **Public state/local amendments** — scraped from official `.gov` sources where adopted as law (these amendments are public domain).
3. **Curated Prolink knowledge base** — original, plain-language guides written by Prolink (or contributors) that *reference* code section numbers without reproducing code text.

**Do not build a knowledge base by scraping ICC content or by relying on a blanket "codes adopted as law are public" theory.** That legal argument exists (Veeck, 2002) but is contested, jurisdictionally limited, and not a defensible basis for a commercial SaaS feature.

**Defer until P0–P2 ship.** This is a P4 feature. Validate that contractors actually want code references in-app before paying for API access.

---

## The IP problem in one paragraph

The ICC (International Code Council) holds copyright on the I-Codes (IRC, IBC, IPC, IMC, IECC, etc.). These are "model codes" — privately authored, then adopted by state and local governments. ICC's business model is selling licensed access to those codes. The legal question of whether codes lose copyright protection once enacted as law is contested:

- **Veeck v. SBCCI** (5th Cir. 2002, en banc, 9–6): held that model codes enter the public domain *once adopted as law*. Persuasive but jurisdictionally limited and decided by a narrow majority.
- **ICC v. UpCodes** (SDNY, ongoing/settled at various stages): ICC has actively sued startups for redistributing code content. UpCodes operates on a Veeck-style theory and has been a moving legal target.
- **2026 status:** No Supreme Court ruling. ICC continues to enforce. *Free Law Project, Public.Resource.Org, and others are pushing for broader public access, but the legal landscape remains contested.*

For a small SaaS targeting contractors, the calculus is simple: **don't pick a fight with ICC's legal team**. License what you need, or stay clear of redistributing copyrighted text.

---

## Path 1 — License the ICC Code Connect API

### What it is
ICC's official API. Returns JSON. Authenticates via OAuth2 (client ID + secret). Provides individual sections up to entire chapters in one request. License allows local caching, including in mobile/offline apps.

### Pricing model
- Annual subscription (3-year option available, paid annually).
- Vendor/company tier is **based on employee count and quantity of titles**.
- Prices are not published — sales-led, contact `solutions.iccsafe.org/codeconnect`.
- For reference: consumer-facing Digital Codes Premium starts ~$66/year for an ICC participating member; API access is higher and bundled per title.

### Pros
- Authoritative, current content with version history.
- Licensed — no copyright exposure.
- Caching permitted, so latency and offline use are solvable.
- JSON makes ingestion into a RAG layer straightforward.

### Cons
- Cost is meaningful and recurring; needs to be modeled into pricing (an extra $5–15/month/contractor seat is plausible at small scale).
- Requires a sales-cycle conversation before pricing is known.
- Per-title licensing means Prolink picks a subset (likely IRC + IBC + IPC + IMC for residential/light commercial).
- Locks Prolink into the ICC commercial relationship.

### Verdict
**Best primary source if Prolink's foreman feature is genuinely valuable.** Engage ICC sales early to get a real quote before committing engineering. Don't build against this until at least P2 (templates/contracts) is done and the contractor cohort has validated demand.

---

## Path 2 — Public state amendments and free official tiers

### What's actually free and reproducible

- **State and local amendments to model codes**: when a state legislature amends adopted model codes (e.g., Utah's amendments to IRC 2021), those *amendments themselves* are state law and freely reproducible. Each state publishes them on its `.gov` rules website.
- **Free read-only views on Digital Codes** (codes.iccsafe.org): ICC publishes most I-Codes for *read-only* viewing without subscription. Cannot be scraped or redistributed, but Prolink can link out to specific sections.
- **Public.Resource.Org**: hosts adopted-as-law versions of many codes under a Veeck-based theory. Useful as a *reference for Prolink's research*, not as a redistribution source.

### What Prolink can do safely

- **Deep-link to ICC's free viewer** for specific sections. ICC URLs include section identifiers, e.g., `codes.iccsafe.org/content/IRC2021P2/chapter-3...`.
- **Scrape and re-host state amendments** from official state code databases — these are public law and not copyrighted by ICC.
- **Maintain a citation index** (section numbers and titles only, not body text) that the foreman can use to *point users at* the right code section.

### Pros
- $0 in licensing fees.
- Defensible legal posture.
- Sufficient for the v0 foreman: "this question relates to IRC §R310 (Emergency Escape and Rescue Openings) — here's a deep link to the ICC viewer."

### Cons
- Foreman can't actually quote code content inline — only point at it.
- Quality of state-amendment scraping varies by state; Utah's amendments are in a structured `.gov` source, but many states are PDFs.
- Section numbers change between IRC editions (2018 → 2021 → 2024), so the citation index needs maintenance.

### Verdict
**Best free starting point**. A "code citation pointer" foreman is genuinely useful and ships without licensing costs. Upgrade to Path 1 once the feature has shown traction.

---

## Path 3 — Original Prolink knowledge base

### What it is
Prolink (or hired SMEs / contractor contributors) writes original, plain-language explainers of common code requirements: "What's required for stair rise/run in residential?" "When does a deck need a permit?" Each entry cites the relevant code section by number but doesn't reproduce code text.

### Pros
- Pure Prolink IP — fully under Prolink's control.
- Differentiated content (most code text is hard for non-pros to parse — plain-language guides are valuable).
- Improves over time with user feedback / contributor contributions.
- Pairs naturally with Paths 1 and 2 (the KB *links to* official codes for the source-of-truth lookup).

### Cons
- Expensive to build. Needs hours of subject-matter-expert authoring.
- Liability concern: if Prolink's plain-language summary is wrong, contractors making decisions on it could come back to Prolink. Mitigate with strong disclaimers and an "always confirm with the AHJ" prompt.
- Slow to scale to cover the breadth of the codes.

### Verdict
**Use as a complement, not the primary source.** Start with the 30–50 most common questions contractors ask, expand from there.

---

## Recommended architecture

```
Foreman query
   │
   ▼
Intent classifier  ──── "code question" branch
   │
   ▼
Hybrid retrieval:
   ├─ Prolink KB (original explainers) ───── for common Q's, fast, free
   ├─ State amendment index (free)      ───── for jurisdiction-specific overrides
   └─ ICC Code Connect API (licensed)    ───── for authoritative source text (Phase 2+)
   │
   ▼
Compose answer with:
   ├─ Plain-language summary (from Prolink KB)
   ├─ Citation (section number + edition + jurisdiction)
   ├─ Deep link to ICC viewer or state source
   └─ Disclaimer: "Confirm with your AHJ. Codes vary by jurisdiction."
```

Phase 1 (free): KB + state amendments + deep links to ICC's free viewer.
Phase 2 (licensed): add ICC Code Connect API for inline authoritative text.

---

## Do-not-do list

- **Do not scrape `codes.iccsafe.org`.** ICC actively monitors. Their free read-only viewer is for end-user reading, not republishing.
- **Do not assume Veeck applies to your jurisdiction.** Veeck is 5th Circuit and contested. Don't build a redistribution strategy on it without sign-off from a lawyer who has actually read the cases.
- **Do not republish IRC/IBC text from third-party "free" mirrors** (UpCodes, etc.) — they're operating in a gray zone, not yours to inherit.
- **Do not use AI generation to "rewrite" code text into Prolink's voice.** This is a derivative-work argument waiting to happen. Original plain-language explanations need to be written from scratch by humans, with code-section citations rather than reformulations.
- **Do not market the feature as "official building code in-app."** Until Path 1 (licensed API) is integrated, call it "code reference and lookup."

---

## Open questions

1. **Demand validation.** Before committing to Path 1 licensing fees, survey 20–30 contractors in the early-access cohort: would they pay an extra $5–10/seat for in-app code lookup?
2. **AHJ scope.** Which jurisdictions does Prolink need to cover first? Likely Utah + a handful of major target metros for the initial cohort.
3. **Editions.** IRC 2021 is the current adopted edition in most of Utah; check each target city/county. Older editions (2018, 2015) are still in force in some jurisdictions.
4. **Liability disclaimers.** Need clear terms for the foreman feature: "advisory only, not a substitute for the authority having jurisdiction (AHJ) or a licensed design professional."

---

## Next action

This is a P4 task — **do not start engineering work yet**. Park this doc in `docs/building-codes.md`. After P0–P2 ship and Prolink has paying users, revisit:

1. Email ICC at `solutions.iccsafe.org/codeconnect` to get a real Code Connect API quote sized for Prolink.
2. Survey early-access contractors on code-lookup demand and willingness to pay.
3. If green light: start with Path 2 (free deep-link foreman), upgrade to Path 1 once usage justifies the spend.

---

## References

- ICC Code Connect API overview: https://solutions.iccsafe.org/codeconnect
- ICC Digital Codes (free read-only): https://codes.iccsafe.org
- Veeck v. SBCCI, 293 F.3d 791 (5th Cir. 2002, en banc): https://en.wikipedia.org/wiki/Veeck_v._Southern_Building_Code_Congress_Int%27l
- ICC v. UpCodes coverage: https://www.constructiondive.com/news/icc-v-upcodes-can-a-private-organization-copyright-the-law/558723/
- Public.Resource.Org: https://public.resource.org
