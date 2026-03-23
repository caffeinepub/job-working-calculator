# Job Working Calculator

## Current State
The Job Calculator page has a simple checkbox to mark whether transport is included in a job's scope. The backend stores `transportIncluded: Bool` in the Job type, but no transport cost amount or dispatch quantity is persisted. Transport cost is not factored into the final price.

## Requested Changes (Diff)

### Add
- `dispatchQty` field (number) to the Job type in the backend — how many units/pieces are dispatched in one order
- `transportCost` field (Float) to the Job type in the backend — transport cost per order
- In the Job Calculator UI (Job Setup card), when the transport checkbox is enabled, show two new inputs:
  - "Dispatch Qty" — integer input for number of units per dispatch order
  - "Transport Cost (per order)" — numeric input in rupees for the transport charge
- Include transport cost in the final price summary total
- Show transport cost as a line in the Cost Breakdown section of the summary card
- Transport cost row in breakdown only visible when transport is included and cost > 0

### Modify
- `saveJob` and `updateJob` backend functions to accept `dispatchQty` and `transportCost` parameters
- `summary` calculation in JobCalculator frontend to add `transportCost` to `totalFinalPrice`
- `buildPayload` in frontend to include `dispatchQty` and `transportCost`
- Edit job loading logic to restore `dispatchQty` and `transportCost` from saved job
- `resetForm` to reset `dispatchQty` to 1 and `transportCost` to 0

### Remove
- Nothing removed

## Implementation Plan
1. Update Motoko backend: add `transportCost: Float` and `dispatchQty: Float` to Job type; update saveJob and updateJob signatures
2. Update JobCalculator.tsx:
   - Add `dispatchQty` (default 1) and `transportCost` (default 0) state
   - Render dispatch qty + transport cost inputs inside the transport section (only visible when transportIncluded = true)
   - Add transport cost to summary total calculation
   - Show transport line in Cost Breakdown
   - Include in buildPayload, resetForm, and edit loading
