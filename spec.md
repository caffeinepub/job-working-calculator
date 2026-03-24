# Job Working Calculator

## Current State
- RawMaterial backend type has: id, grade, materialType, size, weightPerMeter, currentRate, createdAt
- updateMaterial overwrites rate with no history tracking
- Jobs are saved and editable but carry no snapshot of the rates used
- JobHistory page shows saved jobs; clicking a job opens it in the calculator for editing

## Requested Changes (Diff)

### Add
- `RateHistoryEntry` type in backend: `{ rate: Float; changedAt: Int }`
- `rateHistory` field (array of RateHistoryEntry) on RawMaterial
- Backend function `deleteRateHistoryEntry(materialId, index)` to remove a single entry
- In `updateMaterial`: when rate changes, push old rate + timestamp to rateHistory before overwriting
- "History" expandable row section in RawMaterials page showing past rates with date and delete button
- "Check & Update Rates" button inside job edit/view dialog on JobHistory page
  - When clicked: shows a table of each raw material used in the job with current rate vs. job-saved rate
  - Each row has an editable rate field (pre-filled with current material rate)
  - User can change the rate for any material in that table
  - "Apply Updates" button: updates each changed material's rate in the backend (which auto-creates rate history), then recalculates the job costs with the new rates

### Modify
- `getMaterials` / `getMaterial` return type now includes `rateHistory`
- `updateMaterial`: auto-records old rate to history when rate changes
- RawMaterials page: each row gets a "History" toggle button; expanding shows rate history inline
- JobHistory/job edit dialog: adds rate checker panel

### Remove
- Nothing removed

## Implementation Plan
1. Update Motoko backend: add RateHistoryEntry type, add rateHistory to RawMaterial, update updateMaterial to push old rate when changed, add deleteRateHistoryEntry function
2. Regenerate backend bindings (backend.d.ts)
3. Update useQueries.ts: add useDeleteRateHistoryEntry hook, update useUpdateMaterial to pass through
4. Update RawMaterials.tsx: add History expand toggle per row showing rate history list with delete buttons
5. Update JobHistory.tsx (or job detail dialog): add "Check & Update Rates" button that opens a rate comparison panel with editable rate fields and apply button
