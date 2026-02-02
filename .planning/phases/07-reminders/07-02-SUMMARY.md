---
phase: 07-reminders
plan: 02
subsystem: notifications
status: complete
tags: [react, tanstack-query, ui, admin-dashboard, submission-tracking]

requires:
  - 02-01 # Database auth schema (profiles, businesses)
  - 03-01 # Data requests table structure
  - 05-02 # Portfolio page infrastructure
  - 07-01 # send-reminders Edge Function

provides:
  - useSubmissionStatus hook for React Query
  - SubmissionStatusPanel component
  - Manual reminder trigger UI on portfolio dashboard

affects:
  - Portfolio dashboard (adds submission tracking visibility)

tech-stack:
  added: []
  patterns:
    - TanStack Query for submission status fetching
    - Two-column layout for submitted vs pending lists
    - Real-time status updates via React Query

key-files:
  created:
    - src/hooks/use-submission-status.ts
    - src/components/submission-status-panel.tsx
  modified:
    - src/pages/portfolio.tsx

decisions:
  - id: remind-ui-01
    title: Two-column submitted/pending layout
    choice: Split submitted and pending businesses into side-by-side columns
    rationale: Clear visual separation, easy to scan, color-coded badges for quick status
    alternatives: [Single list with mixed status, accordion sections]

  - id: remind-ui-02
    title: Manual send button placement
    choice: Place "Send Reminders" button in card header
    rationale: Always visible, disabled when no pending businesses, clear call to action
    alternatives: [Footer button, separate action bar, hover action]

  - id: remind-ui-03
    title: Month filter integration
    choice: Panel responds to portfolio page month filter
    rationale: Consistent filtering across all dashboard elements, uses existing selectedMonth state
    alternatives: [Separate month picker, always show current month]

metrics:
  duration: 6 minutes
  completed: 2026-02-02
---

# Phase 7 Plan 02: Submission Status UI Summary

**One-liner:** Admin dashboard panel showing submitted vs pending businesses with manual reminder trigger

## What Was Built

Added submission status visibility and manual reminder control to the portfolio dashboard:

**useSubmissionStatus Hook:**
- Fetches all businesses from database
- Queries data_requests table for submitted entries matching target month
- Returns array of BusinessSubmissionStatus with id, name, submitted boolean
- Uses TanStack Query for caching and automatic refetching

**SubmissionStatusPanel Component:**
- Two-column layout: Submitted (green) and Pending (amber)
- Visual indicators: CheckCircle for submitted, Clock for pending
- Badge counters showing count for each section
- "Send Reminders" button in header:
  - Disabled when no pending businesses
  - Shows loading spinner during API call
  - Toasts success/error feedback
- Month label formatted for display (e.g., "Feb 2026")
- Empty states: "All businesses submitted!" when none pending

**Portfolio Page Integration:**
- Import SubmissionStatusPanel component
- Calculate displayMonth from selectedMonth state or current date
- Add panel between meeting summary and anomaly sections
- Panel automatically responds to month filter changes
- Full-width card matching other analysis cards

## Technical Implementation

### Hook Pattern

```typescript
export function useSubmissionStatus(month: string) {
  return useQuery({
    queryKey: ['submission-status', month],
    queryFn: async () => {
      // 1. Fetch all businesses
      const { data: businesses } = await supabase
        .from('businesses')
        .select('id, name')

      // 2. Fetch submitted data_requests for month
      const { data: dataRequests } = await supabase
        .from('data_requests')
        .select('business_id')
        .eq('month', month)
        .eq('status', 'submitted')

      // 3. Create Set for O(1) lookup
      const submittedIds = new Set(dataRequests?.map(dr => dr.business_id))

      // 4. Map to submission status
      return businesses.map(b => ({
        id: b.id,
        name: b.name,
        submitted: submittedIds.has(b.id)
      }))
    }
  })
}
```

### Component Structure

```tsx
<Card>
  <CardHeader>
    <CardTitle>Submission Status</CardTitle>
    <Button onClick={handleSendReminders}>Send Reminders</Button>
  </CardHeader>
  <CardContent>
    <div className="grid md:grid-cols-2">
      {/* Submitted column */}
      <div>
        <CheckCircle /> Submitted <Badge>{submitted.length}</Badge>
        {submitted.map(b => <li>{b.name}</li>)}
      </div>

      {/* Pending column */}
      <div>
        <Clock /> Pending <Badge>{pending.length}</Badge>
        {pending.map(b => <li>{b.name}</li>)}
      </div>
    </div>
  </CardContent>
</Card>
```

### Manual Reminder Trigger

```typescript
const handleSendReminders = async () => {
  const { data, error } = await supabase.functions.invoke('send-reminders')

  if (data?.success) {
    toast.success(`Sent ${data.sent} reminder email(s)`)
  }
}
```

### Key Links Verified

| From | To | Via | Pattern |
|------|----|----|---------|
| useSubmissionStatus | businesses table | Supabase client | `.from('businesses')` |
| useSubmissionStatus | data_requests table | Supabase client | `.eq('status', 'submitted')` |
| SubmissionStatusPanel | send-reminders Edge Function | supabase.functions.invoke | `invoke('send-reminders')` |
| portfolio.tsx | displayMonth | useMemo | selectedMonth or current date |

## Decisions Made

### Two-Column Layout for Submitted vs Pending

**Context:** How to visually organize businesses by submission status

**Decision:** Split into side-by-side columns with clear color-coding

**Rationale:**
- Easy to scan both lists at once
- Color-coded icons and badges (green for submitted, amber for pending)
- Counts visible in badges for quick assessment
- Responsive grid collapses to single column on mobile

**Alternative considered:** Single list with mixed status (rejected - harder to get overview)

### Send Button in Card Header

**Context:** Where to place manual reminder trigger

**Decision:** Button in card header next to title

**Rationale:**
- Always visible (not hidden in collapsed section)
- Disabled state when no pending businesses (clear affordance)
- Consistent with other action buttons in dashboard cards

**Alternative considered:** Footer button below lists (rejected - requires scrolling to access)

### Month Filter Integration

**Context:** Should panel have its own month picker or use portfolio filter?

**Decision:** Respond to portfolio page's existing month filter

**Rationale:**
- Consistent filtering across all dashboard elements
- No duplicate UI controls
- Single source of truth (selectedMonth state)
- Automatic updates when filter changes

**Alternative considered:** Separate month picker (rejected - confusing to have two filters)

## Testing & Verification

### Build Verification
- TypeScript compilation: PASSED
- All imports resolved: PASSED
- No type errors: PASSED

### Code Review
- Hook exports useSubmissionStatus: PASSED
- Component imports useSubmissionStatus: PASSED
- supabase.functions.invoke('send-reminders'): PASSED
- Month prop passed to panel: PASSED
- displayMonth calculation: PASSED (selectedMonth ?? current month)

### Manual Testing Required (Post-Deployment)

1. **Start dev server:**
   ```bash
   npm run dev
   ```

2. **Navigate to portfolio page:**
   - Log in as admin user
   - Go to /portfolio

3. **Verify submission status panel:**
   - Panel appears below meeting summary section
   - Shows "Submission Status" title
   - Displays current month (e.g., "Feb 2026")
   - Two sections: Submitted and Pending

4. **Test with data:**
   - Create test businesses in database
   - Create data_requests with status='submitted' for some businesses
   - Verify submitted businesses appear in Submitted column
   - Verify businesses without submissions appear in Pending column
   - Check badge counts match list lengths

5. **Test month filter:**
   - Change month filter dropdown
   - Verify panel updates to show submission status for selected month

6. **Test Send Reminders button:**
   - Click "Send Reminders" button
   - Should see loading spinner
   - Should see success toast (if Edge Function deployed and RESEND_API_KEY set)
   - Or 500 error (if not yet deployed - expected until deployment)

7. **Test empty states:**
   - If all businesses submitted: Should show "All businesses submitted!"
   - If no businesses: Should show "No businesses found"

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Phase 7 Status:**
- Plan 01: COMPLETE ✓ (Edge Function infrastructure)
- Plan 02: COMPLETE ✓ (Admin UI)

**Phase 7 COMPLETE:** All reminder system features delivered

**Integration Requirements:**
1. Edge Function must be deployed: `npx supabase functions deploy send-reminders`
2. RESEND_API_KEY must be set in Edge Function secrets
3. Resend domain verification for velocitygrowth.co.uk
4. (Optional) pg_cron setup for daily automation

**No technical blockers** - All code complete and ready for production

## Production Deployment Checklist

- [ ] Apply migrations: `supabase db push`
- [ ] Deploy Edge Function: `npx supabase functions deploy send-reminders`
- [ ] Set RESEND_API_KEY in Supabase Dashboard
- [ ] Verify velocitygrowth.co.uk domain in Resend Dashboard
- [ ] Create test businesses and data_requests
- [ ] Test submission status panel visibility
- [ ] Test manual reminder sending
- [ ] (Optional) Setup pg_cron for daily automation

## Files Changed

| File | Type | Changes | Lines |
|------|------|---------|-------|
| src/hooks/use-submission-status.ts | created | TanStack Query hook for submission status | 48 |
| src/components/submission-status-panel.tsx | created | Card component with submitted/pending lists | 175 |
| src/pages/portfolio.tsx | modified | Added panel integration + displayMonth calculation | 13 |

**Total:** 2 files created, 1 file modified, 236 lines added

## Commit History

| Commit | Message | Files |
|--------|---------|-------|
| 40aa93b | feat(07-02): create submission status hook and panel component | use-submission-status.ts, submission-status-panel.tsx |
| 56b7959 | feat(07-02): integrate submission status panel into portfolio page | portfolio.tsx |

## Knowledge for Future Sessions

### How Submission Status Works

1. **Query:** Hook fetches all businesses + submitted data_requests for month
2. **Compute:** Creates Set of submitted business IDs for O(1) lookup
3. **Return:** Array of { id, name, submitted } for each business
4. **Display:** Component splits into submitted/pending and renders lists
5. **Trigger:** Button calls `supabase.functions.invoke('send-reminders')`

### UI Integration Pattern

The panel follows the portfolio dashboard card pattern:
- Full-width Card component
- Placed in main flow (not in tabs)
- Responds to month filter changes
- Consistent spacing with mb-6

### Manual Reminder Flow

```
User clicks "Send Reminders"
  → Button disabled + spinner shown
  → supabase.functions.invoke('send-reminders')
  → Edge Function runs (see 07-01-SUMMARY.md)
  → Returns { success, sent, results }
  → Toast shows success/error
  → Button re-enabled
```

### Extending the Panel

To add business-specific actions:

```tsx
// In SubmissionStatusPanel.tsx
<Button
  size="sm"
  onClick={() => sendReminderTo(business.id)}
>
  Send to {business.name}
</Button>
```

To change month format:

```typescript
// In SubmissionStatusPanel.tsx
const monthLabel = new Date(`${month}-01`).toLocaleDateString('en-GB', {
  month: 'long', // "February" instead of "Feb"
  year: 'numeric'
})
```

To add filtering by sector:

```typescript
// Add to hook
export function useSubmissionStatus(month: string, sectorId?: string) {
  // Filter businesses by sectorId before mapping
}
```

---

**Phase 7 Plan 02 Complete** ✓

Ready for deployment and testing with real submission data.
