# Job Working Calculator

## Current State

The app is a full-featured job costing system with 3 modules: SS Fabrication, Labour, and Flexibles. Version 66 migrated all data storage to localStorage to work around persistent ICP save failures caused by IDL factory mismatches, stale methods, and Candid encoding bugs. The app is functional but data is device-local only.

## Requested Changes (Diff)

### Add
- Clean ICP backend actor replacing localStorage for all persistent data
- A single `icpDB.ts` data layer that wraps the actor with correct Candid optional encoding (`[]` for null, never `null` or `undefined`)
- `useInternetIdentity.ts` permanent no-op that never calls `AuthClient.create()` regardless of what `main.tsx` does

### Modify
- `useQueries.ts` -- import from `icpDB.ts` instead of `localStorageDB.ts`
- `main.mo` -- stripped clean of all auth/user management code; only data types needed
- `backend.ts` -- fully regenerated in sync with new `main.mo` via `generate_motoko_code`

### Remove
- `localStorageDB.ts` -- replaced by `icpDB.ts`
- All AppUser/registration/approval code from backend (login is frontend-only fixed credentials)
- Dead code: `useActor.ts`, `authActor.ts`, `Register.tsx`, `UsersManagement.tsx`, `CustomerFlexibles.tsx`
- Legacy V1/V2 flexible job migration code from `main.mo`

## Implementation Plan

1. Call `generate_motoko_code` with clean data model requirements (no auth, no user management, just data)
2. Create `icpDB.ts` -- wraps generated actor, always uses `[]` for optional Candid fields, returns same TypeScript shapes as current code
3. Rewrite `useInternetIdentity.ts` as a permanent no-op (single export, no network calls)
4. Update `useQueries.ts` imports to use `icpDB.ts`
5. Remove dead files
6. Validate build

## Data Model (for backend generation)

### RawMaterial
- id, grade, materialType, size, weightPerMeter, currentRate, rateHistory[{rate, changedAt}], createdAt

### Customer
- id, name, phone, email, address, createdAt

### SavedJob (SS Fabrication)
- job: {id, name, laborRate, transportIncluded, transportCost, dispatchQty, customerId?: Text, createdAt}
- jobLineItems: [{materialId, lengthMeters, rawWeight, totalWeight, finalPrice}]
- weldingLineItems: [{grade, ratePerKg, weightKg, finalPrice}]
- totalFinalPrice, totalProductWeight, ratePerKg
- customerName?: Text

### LabourJob
- id, description, materialType, weldLength, laborRate, totalCost, createdAt

### FlexibleJob
- id, description, materialTab, centerLength, sheetBunchWidth, sheetThickness, sheetCount, barsSupplied, barLength, barWidth, barThickness, numberOfDrills, numberOfFolds
- sheetStackWeight, stripWeight, bar1Weight, bar2Weight, totalMaterialWeight
- materialCost, cuttingCost, foldingCost, drillingCost, weldingCost, chamferingCost, totalWeldLength
- overheadCost, profitCost, totalCost, discountPct, quotedPrice
- createdAt

### AlWeldingJob
- id, description, numJoints, numBrackets, numDummy, weldLengthEachMm, thickness, laborCostPer2mm, totalFullLength, totalWeldLines, adjustedLaborCost, totalCost, costPerFullLength, createdAt
