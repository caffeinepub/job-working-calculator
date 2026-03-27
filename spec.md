# Job Working Calculator

## Current State
A full-stack job costing app with SS Fabrication, Flexibles, and Labour modules. Persistent data via ICP Motoko backend. Key issues:
- AlWeldingJob backend methods exist in Motoko but are NOT in the IDL factory (backend.did.js) — this silently breaks all AlWelding saves
- "Machined" material type appears in Raw Materials type dropdown (should only be in Operations section)
- Labour page has only 2 job types (Standard + AL Welding), needs 3 separate tabs
- SS304 product weight doesn't include welding rod/filler weight

## Requested Changes (Diff)

### Add
- AlWeldingJob IDL record + 3 methods (saveAlWeldingJob, getAlWeldingJobs, deleteAlWeldingJob) to backend.did.js — fixes all AlWelding save errors
- **Gutter Welding** tab in Labour (stored localStorage): inputs = No of Joints, No of Brackets, No of Dummy, Weld Length (mm), Labour Cost (editable on page with rate history via localStorage), Total Full Length. Breakdown: Total Weld Lines = J+B+D, Total Cost = Lines × Cost × (WeldLength/1000), Cost Per Full Length = Total / TotalFullLength. No description field.
- **Predefined Operations** hook + management in Formulas & Settings (new tab): user can define named operation templates (opType, name, default values), stored in localStorage. In JobCalculator Operations section, user can select from predefined templates to auto-fill an operation row.
- `gutterWeldRate` to FormulaSettings (default 800, editable on Gutter Welding page directly with localStorage rate history)

### Modify
- **Labour page**: Reorganize into 3 tabs — SS304 (weld length based), Aluminium (existing AL welding job type with joints/brackets/dummies), Gutter Welding (new)
- **useMaterialOptions.ts**: Remove "Machined" from BUILT_IN_TYPES so it no longer appears in Raw Materials type dropdown
- **JobCalculator.tsx**: Include welding rows weight (weldingRows sum of weightKg) in the SS304 Approx Weight / totalProductWeight calculation
- **useQueries.ts**: Remove `(actor as any)` casts for AlWelding methods once IDL is fixed
- **Formulas.tsx**: Add Predefined Operations tab

### Remove
- "Machined" from Raw Materials built-in type list

## Implementation Plan
1. Fix `src/frontend/src/declarations/backend.did.js` — add AlWeldingJob record to exports, idlService, and idlFactory (NO backend redeploy needed, functions already deployed)
2. Update `src/frontend/src/hooks/useMaterialOptions.ts` — remove "Machined" from BUILT_IN_TYPES
3. Update `src/frontend/src/hooks/useFormulaSettings.ts` — add gutterWeldRate
4. Create `src/frontend/src/hooks/usePredefinedOperations.ts` — localStorage CRUD for operation templates
5. Update `src/frontend/src/hooks/useQueries.ts` — remove `as any` casts
6. Rewrite `src/frontend/src/pages/Labour.tsx` — 3 tabs: SS304 / Aluminium / Gutter Welding
7. Update `src/frontend/src/pages/JobCalculator.tsx` — welding weight in product weight, predefined ops selector in Operations section
8. Update `src/frontend/src/pages/Formulas.tsx` — add Predefined Operations tab
