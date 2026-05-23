# Mobile Audit — Prolink

Use this to systematically walk every authenticated route at 375×667 (iPhone SE) and 393×851 (Pixel 5). Fill out a section per route. Issues get categorized so the fix pass in P0.2 has clear priorities.

**How to run this:**
1. Run `pnpm dev` (or `npm run dev`).
2. Open Chrome DevTools → toggle device toolbar → iPhone SE.
3. Walk every authenticated route. Click into every interactive element. Fill in the table below.
4. Repeat at Pixel 5 dimensions (catches a different set of issues — Pixel is taller).
5. Save the populated file as `MOBILE_AUDIT.md` at the repo root.

## Severity definitions

- **Critical** — Page is unusable: content cut off, controls untappable, forms can't be submitted, horizontal scroll on body, login/signup broken.
- **Medium** — Page works but is awkward: small touch targets (<44px), text too small to read (<14px body), overlapping elements, hidden state on small viewports.
- **Cosmetic** — Visual polish: misaligned padding, font weight inconsistency, animations stuttering, breakpoint transitions look ugly.

---

## Route audit

For each route, fill in the table. Add new routes as needed.

### `/login`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/signup`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/dashboard`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/jobs`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/jobs/[id]`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/jobs/new`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/estimates`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/estimates/new`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/customers`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/customers/[id]`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/schedule`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/settings`
| Severity | Issue | Notes |
|---|---|---|
| | | |

### `/messages`
| Severity | Issue | Notes |
|---|---|---|
| | | |

_Add more routes as needed._

---

## Things to look for at every route

Copy this checklist mentally per page:

- [ ] No horizontal scroll on `body` at 375px width.
- [ ] All buttons and tap targets ≥ 44×44px.
- [ ] Body text ≥ 14px, ideally 16px (prevents iOS zoom-on-focus for inputs).
- [ ] Form inputs have `inputMode` set correctly (`numeric`, `decimal`, `email`, `tel`).
- [ ] Modals fit on screen and can be dismissed.
- [ ] Sticky elements (nav, action bars) don't cover form fields when keyboard opens.
- [ ] Tables either collapse to cards or scroll horizontally with a visible affordance.
- [ ] Long content (job description, notes) wraps and doesn't blow out the layout.
- [ ] Image-heavy pages don't make the user scroll forever — collapse or paginate.
- [ ] Date pickers and dropdowns use native controls on mobile where possible.

---

## Grep your repo for common Tailwind mobile anti-patterns

Run these from the repo root. Each one surfaces a pattern that often breaks at small viewports. Drop the output into the audit notes.

```bash
# 1. Fixed pixel widths (often blow out 375px viewports)
rg -n 'w-\[[0-9]{3,}px\]|max-w-\[[0-9]{4,}px\]' --type ts --type tsx

# 2. min-w that exceeds 375px
rg -n 'min-w-\[[4-9][0-9]{2}px\]|min-w-\[[0-9]{4,}px\]' --type ts --type tsx

# 3. Multi-column grids without responsive prefixes (these don't collapse on mobile)
rg -n 'grid-cols-[3-9]\b' --type ts --type tsx | rg -v 'md:|lg:|sm:'

# 4. Flex rows without wrap or responsive direction
rg -n 'flex-row\b' --type ts --type tsx | rg -v 'flex-wrap|md:flex-row|lg:flex-row'

# 5. Text smaller than text-sm without responsive bump-up
rg -n 'text-xs\b' --type ts --type tsx | rg -v 'sm:text-|md:text-'

# 6. Hidden on mobile (might be hiding critical content)
rg -n '\bhidden md:' --type ts --type tsx

# 7. Tables — likely candidates for mobile collapse
rg -n '<table\b' --type ts --type tsx

# 8. Fixed heights on content containers
rg -n 'h-\[[0-9]{3,}px\]' --type ts --type tsx

# 9. Padding/margin that won't fit on 375px
rg -n '\b(p|m|px|mx|pl|pr|ml|mr)-(1[6-9]|[2-9][0-9])\b' --type ts --type tsx

# 10. Modals / dialogs without responsive width handling
rg -n 'fixed.*\bw-\[[0-9]{3,}px\]' --type ts --type tsx
```

Each result is a candidate. Not all are real issues — context matters. Use this to seed the route-by-route audit, not as a replacement for clicking through every page.

---

## Fix pattern reference

For P0.2, the playbook for each issue type:

**Fixed width → responsive width**

```tsx
// Before
<div className="w-[600px] p-8">

// After  
<div className="w-full max-w-2xl p-4 md:p-8">
```

**Multi-column grid → stack on mobile**

```tsx
// Before
<div className="grid grid-cols-3 gap-4">

// After
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
```

**Touch target too small**

```tsx
// Before
<button className="p-1 text-xs">

// After (min 44px hit area)
<button className="min-h-[44px] min-w-[44px] p-2 text-sm">
```

**Table → card on mobile**

```tsx
// Before: <table> on all viewports

// After: hide table on mobile, render card list instead
<div className="md:hidden space-y-2">
  {rows.map(row => <Card key={row.id} {...row} />)}
</div>
<table className="hidden md:table">
  {/* existing table */}
</table>
```

**Modal too wide**

```tsx
// Before
<Dialog.Content className="w-[500px]">

// After
<Dialog.Content className="w-[calc(100vw-2rem)] max-w-md sm:w-full">
```

**Form input zoom-on-focus (iOS)**

```tsx
// iOS zooms when input font-size < 16px. Force 16px on inputs even if visually smaller elsewhere.
<input className="text-base" /> // text-base = 16px
```

---

## Output

When this audit is done, the populated `MOBILE_AUDIT.md` becomes the input to P0.2. Sort issues by severity (all Criticals first, then Mediums, then Cosmetics), and tackle them route-by-route, not issue-by-issue. Finishing a route end-to-end is more motivating than playing whack-a-mole.
