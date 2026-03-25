# Job Working Calculator

## Current State
- SS Fabrication, Labour, and all supporting modules are live and finalized.
- Backend has: raw materials, customers, SS fabrication jobs, labour jobs.
- useFormulaSettings stores labour rates (SS304, AL) in localStorage.
- Formulas page has tabs: Weight, Job Costing, Welding, Options, Labour.
- Sidebar has: Dashboard, Raw Materials, Job Calculator, Job History, Customers, Formulas, Export, Labour.
- No Flexibles page or backend support exists yet.

## Requested Changes (Diff)

### Add
- `FlexibleJob` type in Motoko backend with fields: id, description, materialTab (AL|CU), sheetBunchWidth, thickness, numBars, weldingCost, chamferingCost, overheadCost, profitCost, totalCost, customerId, customerName, createdAt
- `saveFlexibleJob` backend function
- `getFlexibleJobs` backend query
- `deleteFlexibleJob` backend function
- `Flexibles.tsx` page with two tabs: Aluminium and CU
- Flexible labour rates in useFormulaSettings: AL rates for 6mm/10mm/12mm/12.7mm, CU rates for same thicknesses
- Chamfering rate (default 40), Overhead % (default 5), Profit % (default 10) for Flexibles in settings (can share existing overheadPct/profitPct)
- New "Flexibles" tab in Formulas & Settings page showing the formula and all editable rates
- New "Flexibles" nav item in Sidebar and App.tsx routing

### Modify
- `useFormulaSettings` hook: add flexible-specific rate fields (flexAlRate6, flexAlRate10, flexAlRate12, flexAlRate127, flexCuRate6, flexCuRate10, flexCuRate12, flexCuRate127, flexChamferingRate)
- `Formulas.tsx`: add Flexibles tab
- `Sidebar.tsx`: add Flexibles nav item
- `App.tsx`: add Flexibles page routing

### Remove
- Nothing

## Implementation Plan

1. Generate Motoko backend with FlexibleJob type and CRUD functions (saveFlexibleJob, getFlexibleJobs, deleteFlexibleJob)
2. Update useFormulaSettings with flexible rate fields and defaults
3. Add useFlexibleJobs, useSaveFlexibleJob, useDeleteFlexibleJob to useQueries hook
4. Create Flexibles.tsx page:
   - Two tabs: Aluminium and Copper
   - Inputs: description, sheet bunch width (mm), thickness (mm), number of bars (1 or 2), customer
   - Labour rate looked up from settings by thickness with linear interpolation
   - Welding cost = (sheetBunchWidth / 25) × labourRate
   - Chamfering cost = numBars × chamferingRate
   - Overhead = (weldingCost + chamferingCost) × overheadPct%
   - Profit = (weldingCost + chamferingCost + overhead) × profitPct%
   - Total = welding + chamfering + overhead + profit
   - Live cost breakdown shown
   - Save to backend optional
   - Saved jobs table with delete
5. Add Flexibles tab to Formulas page with all rate fields editable
6. Wire Sidebar and App.tsx to show the new page
