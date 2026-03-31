# Job Working Calculator

## Current State
Full-stack job costing app with SS Fabrication, Flexibles, and Labour modules. Backend is Motoko on ICP; frontend is React/TypeScript. After a thorough audit, 17 confirmed bugs were found ranging from critical save failures to UI inconsistencies.

## Requested Changes (Diff)

### Add
- `AlWeldingJob` interface and runtime class methods (`saveAlWeldingJob`, `getAlWeldingJobs`, `deleteAlWeldingJob`) to `backend.ts` -- they exist in `main.mo` and `backend.d.ts` but are missing from the runtime IDL class entirely
- `updateFlexibleJob` method to `backend.ts` class -- exists in `main.mo` but missing from runtime class

### Modify
- `backend.ts`: Add AlWelding and updateFlexibleJob methods to both the interface and the class implementation
- `hooks/useQueries.ts`:
  - Remove all three `(actor as any)` casts for AlWelding -- use typed `actor` calls once methods are in backend.ts
  - Fix `useUpdateFlexibleJob` to call `actor.updateFlexibleJob(id, ...)` instead of delete+re-insert (preserves createdAt and ID)
- `main.tsx`: Make `InternetIdentityProvider` a true no-op passthrough that never calls `AuthClient.create()` -- override by providing a mock implementation inline or wrapping with an early-return guard
- `App.tsx`: Remove `initAdmin()` call and `import { getAuthActor }` -- login is localStorage-based, this ICP call is unnecessary on every startup
- `pages/Formulas.tsx`: Remove dead `import { getAuthActor }` (changePassword uses AuthContext, not authActor)
- `hooks/useMaterialOptions.ts`: Fix `BUILT_IN_TYPES` order to: Wire Mesh, Round Bar, Flat Bar, Square Bar, Pipe, Sheet, Plate, Angle, Channel (ISMC), I-Beam (ISMB)
- `components/MaterialModal.tsx`: Fix `selectableTypes` filter -- change `|| true` to `!== 'Machined'` so Machined type is excluded from the Add Material dropdown
- `pages/Flexibles.tsx`:
  - Remove unused `Select/SelectContent/SelectItem/SelectTrigger/SelectValue` imports
  - Fix `saveCostSnapshot` to use `job.quotedPrice` directly instead of recomputing from scratch
  - Fix auto-update rate recalculation to use stored `job.bar1Weight` and `job.bar2Weight` directly (instead of recalculating bar2 from bar1 dimensions)
  - Fix "Before Disc." column: when `discountPct === 0`, show `totalCost` for both columns is correct but label the column "Quoted Price" to avoid confusion; when discount > 0, show `quotedPrice`
  - Fix stored overhead/profit: save the post-markup (displayed) values to backend, not pre-markup

### Remove
- Dead `initAdmin()` ICP call from `App.tsx` startup
- Dead `getAuthActor` imports from `App.tsx` and `Formulas.tsx`
- Unused `Select` component imports from `Flexibles.tsx`

## Implementation Plan
1. Add `AlWeldingJob` TypeScript interface to `backend.ts` exports
2. Import `AlWeldingJob as _AlWeldingJob` from declarations in `backend.ts`
3. Add `saveAlWeldingJob`, `getAlWeldingJobs`, `deleteAlWeldingJob` to the `backendInterface` class in `backend.ts` -- model after `saveLabourJob`/`getLabourJobs`/`deleteLabourJob` patterns
4. Add `updateFlexibleJob` to `backend.ts` class -- same signature as `saveFlexibleJob` but takes `id` as first param, no `customerId` param (backend preserves existing)
5. Fix `useQueries.ts`: replace `(actor as any)` with typed actor calls; fix `useUpdateFlexibleJob` to call `actor.updateFlexibleJob(data.id, ...rest)`
6. Fix `main.tsx` InternetIdentityProvider: override the component so it renders children immediately without running `AuthClient.create()`
7. Remove `initAdmin()` and `getAuthActor` imports from `App.tsx` and `Formulas.tsx`
8. Fix `BUILT_IN_TYPES` order in `useMaterialOptions.ts`
9. Fix `MaterialModal.tsx` filter to exclude `Machined`
10. Fix `Flexibles.tsx`: snapshot fix, auto-update bar weight fix, column display fix, remove unused imports
