# Phase 1: Branding - Research

**Researched:** 2026-02-02
**Domain:** Visual identity transformation (UBT to Chester/Velocity)
**Confidence:** HIGH

## Summary

This phase is a straightforward text and asset replacement task. The codebase currently references "UBT" (Universal Business Team) branding in multiple locations. The transformation to Chester/Velocity branding requires:

1. Replacing the UBT logo with Velocity logo
2. Adding the strapline "Doing good by doing well"
3. Updating all text references from UBT to Chester

The existing codebase already uses "Chester Business Scorecard" in most user-facing text, making the rebrand simpler than expected. The main UBT references are in code comments and the logo image.

**Primary recommendation:** Extract Velocity logo from the PowerPoint file (`Docs/Chester 2026 Networking Slidedeck.pptx`), replace the base64-encoded logo in PDF generation, replace the logo file in `/public`, and update the few remaining UBT text references.

## Asset Inventory

### Existing Brand Assets

| Asset | Location | Current Branding | Needs Update |
|-------|----------|------------------|--------------|
| Logo PNG | `/dist/ubt-logo.png` | UBT | YES - Replace with Velocity |
| Logo reference | `/src/pages/charts.tsx:108` | UBT (`/ubt-logo.png`) | YES - Update path |
| Favicon SVG | `/public/favicon.svg` | Chester "C" | NO - Already Chester branded |
| PDF Logo (base64) | `/src/components/pdf/scorecard-pdf.tsx:14` | UBT (inline base64) | YES - Replace with Velocity base64 |

### Required New Assets

| Asset | Source | Format Needed |
|-------|--------|---------------|
| Velocity logo | `Docs/Chester 2026 Networking Slidedeck.pptx` | PNG (for web), PNG base64 (for PDF) |
| Strapline text | PowerPoint | "Doing good by doing well" |

### Asset Extraction Notes

The PowerPoint file exists at `c:\BrandedAI\2_CLIENTS\Chester\Docs\Chester 2026 Networking Slidedeck.pptx`. Logo extraction requires:
1. Open the PowerPoint
2. Right-click Velocity logo, save as PNG
3. Resize to appropriate dimensions (~400px wide for web, ~200px for PDF header)
4. Convert to base64 for PDF embedding

## Current Branding Locations

### User-Facing Text (Already Chester-Branded)

| File | Line | Current Text | Status |
|------|------|--------------|--------|
| `index.html` | 7 | "Chester Business Scorecard" | OK |
| `pages/home.tsx` | 86 | "Chester Business Scorecard" | OK |
| `pages/portfolio.tsx` | 126 | "Chester Portfolio Overview" | OK |
| `pages/company-submit.tsx` | 207 | "Chester Business Scorecard" | OK |
| `pages/company-submit.tsx` | 573 | "Chester business community" | OK |
| `components/pdf/scorecard-pdf.tsx` | 195 | "Chester Business Scorecard" | OK |

### Code Comments Referencing UBT

| File | Line | Text | Action |
|------|------|------|--------|
| `lib/chart-utils.ts` | 2 | "UBT Monthly Business Scorecard" | Update comment |
| `lib/pdf-data-mapper.ts` | 2 | "UBT Monthly Business Scorecard" | Update comment |
| `lib/scoring.ts` | 2 | "UBT Monthly Business Scorecard" | Update comment |
| `components/pdf/pdf-styles.ts` | 2 | "UBT Monthly Business Scorecard" | Update comment |

### Logo References

| File | Line | Reference | Action |
|------|------|-----------|--------|
| `pages/charts.tsx` | 108-109 | `<img src="/ubt-logo.png" alt="Universal Business Team">` | Change to Velocity logo |
| `components/pdf/scorecard-pdf.tsx` | 14-15 | `ubtLogoBase64` variable with base64 PNG | Replace with Velocity base64 |

## Page Structure

### Pages Requiring Branding Review

| Page | File | Has Logo | Has Title | Has Strapline | Notes |
|------|------|----------|-----------|---------------|-------|
| Home | `pages/home.tsx` | NO | YES (Chester) | NO | Add logo and strapline |
| Portfolio | `pages/portfolio.tsx` | NO | YES (Chester) | NO | Add logo and strapline |
| Charts | `pages/charts.tsx` | YES (UBT) | YES | NO | Replace logo, add strapline |
| Scorecard | `pages/scorecard.tsx` | NO | YES | NO | Consider adding logo |
| History | `pages/history.tsx` | NO | NO | NO | Consider adding header |
| Compare | `pages/compare.tsx` | NO | YES | NO | Consider adding logo |
| Company Submit | `pages/company-submit.tsx` | NO | YES (Chester) | NO | Add logo and strapline |
| Submission Success | `pages/submission-success.tsx` | NO | YES | NO | Add logo |

### Header Pattern

Currently there is no consistent header component across pages. Each page implements its own header inline. Options:

1. **Quick approach:** Add logo/strapline to each page individually
2. **Better approach:** Create a shared `<BrandHeader />` component

**Recommendation:** Create a simple `<BrandHeader />` component for consistency, but implement as individual page updates if time is critical.

## PDF Generation

### Current Implementation

PDF generation uses `@react-pdf/renderer` in `src/components/pdf/scorecard-pdf.tsx`.

**Logo handling:**
```typescript
// Line 14-15
const ubtLogoBase64 = 'iVBORw0KGgoAAA...' // ~2KB base64 string
const ubtLogo = { data: ubtLogoBase64, format: 'png' }

// Line 193 - Logo placement
<Image style={styles.headerLogo} src={ubtLogo} />
```

**Header layout:**
```typescript
// Lines 191-207
<View style={styles.header}>
  <Image style={styles.headerLogo} src={ubtLogo} />
  <View style={styles.headerLeft}>
    <Text style={styles.headerTitle}>Chester Business Scorecard</Text>
    <Text style={styles.headerSubtitle}>{data.businessName} - {data.month}</Text>
  </View>
  ...
</View>
```

### Required Changes

1. Replace `ubtLogoBase64` with Velocity logo base64
2. Rename variable to `velocityLogoBase64` for clarity
3. Add strapline below title in PDF header
4. Update styles if needed for strapline spacing

### Logo Style in PDF

Current logo style from `pdf-styles.ts`:
```typescript
headerLogo: {
  width: 80,
  height: 33,
  // ...
}
```

New Velocity logo may require different dimensions. Test after extraction.

## Key Files to Modify

### Priority 1: Core Brand Files

| File | Changes Required | Complexity |
|------|------------------|------------|
| `public/velocity-logo.png` | Add new file | Add asset |
| `src/components/pdf/scorecard-pdf.tsx` | Replace logo base64, add strapline | Low |
| `src/pages/charts.tsx` | Update logo src and alt text | Low |
| `src/lib/chart-utils.ts` | Update comment | Trivial |
| `src/lib/pdf-data-mapper.ts` | Update comment | Trivial |
| `src/lib/scoring.ts` | Update comment | Trivial |
| `src/components/pdf/pdf-styles.ts` | Update comment, maybe logo dimensions | Low |

### Priority 2: Add Branding to Pages

| File | Changes Required | Complexity |
|------|------------------|------------|
| `src/pages/home.tsx` | Add logo and strapline to header | Low |
| `src/pages/portfolio.tsx` | Add logo and strapline to header | Low |
| `src/pages/company-submit.tsx` | Add logo and strapline to header | Low |
| `src/pages/submission-success.tsx` | Add logo | Low |

### Priority 3: Optional Consistency

| File | Changes Required | Complexity |
|------|------------------|------------|
| `src/pages/scorecard.tsx` | Consider adding logo | Low |
| `src/pages/history.tsx` | Consider adding header with logo | Low |
| `src/pages/compare.tsx` | Consider adding logo | Low |

### File to Delete

| File | Reason |
|------|--------|
| `public/ubt-logo.png` | Replaced by Velocity logo |
| `dist/ubt-logo.png` | Build artifact, will regenerate |

## Recommendations

### Implementation Approach

**Phase 1A: Asset Preparation (Manual)**
1. Extract Velocity logo from PowerPoint
2. Save as PNG at web resolution (~400px wide)
3. Generate base64 string for PDF embedding
4. Confirm strapline text: "Doing good by doing well"

**Phase 1B: Core Updates**
1. Add `public/velocity-logo.png`
2. Update `scorecard-pdf.tsx` with new logo and strapline
3. Update `charts.tsx` logo reference
4. Update code comments in 4 files

**Phase 1C: Page Headers**
1. Add logo and strapline to `home.tsx`
2. Add logo and strapline to `portfolio.tsx`
3. Add logo and strapline to `company-submit.tsx`
4. Add logo to `submission-success.tsx`

### Strapline Placement

For consistency across pages:
```tsx
<div className="text-center">
  <img src="/velocity-logo.png" alt="Velocity" className="h-12 mx-auto" />
  <p className="text-sm text-muted-foreground mt-1">Doing good by doing well</p>
  <h1 className="text-2xl font-bold">Chester Business Scorecard</h1>
</div>
```

### Naming Convention

Use consistent naming:
- Logo file: `velocity-logo.png`
- Variable: `velocityLogo` or `velocityLogoBase64`
- Alt text: `Velocity` or `Velocity - Chester Brethren Business Group`

## Common Pitfalls

### Pitfall 1: PDF Logo Dimensions

**What goes wrong:** New logo has different aspect ratio, appears stretched or cropped in PDF
**Why it happens:** Base64 logo rendered at fixed dimensions
**How to avoid:** Match Velocity logo dimensions to UBT logo (~400x166) or adjust `pdf-styles.ts`
**Warning signs:** Logo looks distorted in PDF export

### Pitfall 2: Missing Logo on Build

**What goes wrong:** Logo works in dev but not in production
**Why it happens:** File not in `public/` folder or wrong path
**How to avoid:** Place in `public/`, reference as `/velocity-logo.png` (leading slash)
**Warning signs:** 404 errors in network tab

### Pitfall 3: Strapline Inconsistency

**What goes wrong:** Strapline appears differently on different pages
**Why it happens:** Copy-pasted code with variations
**How to avoid:** Consider shared component or exact copy of styling
**Warning signs:** Visual inspection shows differences

## Code Examples

### Logo in React Page

```tsx
// Standard logo placement in page header
<div className="flex flex-col items-center mb-4">
  <img
    src="/velocity-logo.png"
    alt="Velocity"
    className="h-10 mb-2"
  />
  <p className="text-sm text-muted-foreground">
    Doing good by doing well
  </p>
</div>
```

### Logo in PDF (react-pdf)

```tsx
// In scorecard-pdf.tsx
const velocityLogoBase64 = 'data:image/png;base64,...' // Full base64 string
const velocityLogo = { data: velocityLogoBase64, format: 'png' }

// In render
<Image style={styles.headerLogo} src={velocityLogo} />
<Text style={styles.strapline}>Doing good by doing well</Text>
```

### Base64 Conversion Command

```bash
# On macOS/Linux
base64 -i velocity-logo.png | tr -d '\n'

# On Windows PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("velocity-logo.png"))
```

## Open Questions

1. **Logo dimensions:** What are the exact dimensions of the Velocity logo from the PowerPoint? This affects PDF styling.
   - What we know: UBT logo is roughly 400x166 based on style settings
   - What's unclear: Velocity logo aspect ratio
   - Recommendation: Extract and measure, then adjust styles if needed

2. **Strapline in PDF:** Should the strapline appear in PDF exports?
   - What we know: Requirements say "PDF export includes Chester/Velocity header"
   - What's unclear: Whether strapline is part of header or separate
   - Recommendation: Include it for consistency

## Sources

### Primary (HIGH confidence)
- Codebase analysis via file reading
- `roadmap.md` and `requirements.md` for branding requirements
- Direct file inspection of existing logo references

### Secondary (MEDIUM confidence)
- PowerPoint exists at `Docs/Chester 2026 Networking Slidedeck.pptx` (not opened, but confirmed to exist)

## Metadata

**Confidence breakdown:**
- Asset inventory: HIGH - Direct file inspection
- Current branding locations: HIGH - Grep search and file reading
- PDF generation: HIGH - Direct code review
- Implementation approach: HIGH - Based on standard React/Vite patterns

**Research date:** 2026-02-02
**Valid until:** 2026-02-09 (asset locations stable, approach straightforward)
