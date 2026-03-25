# Job Working Calculator

## Current State
Flexibles module has a basic calculator with only Sheet Bunch Width, Thickness (for labor rate lookup), and Number of Bars as inputs. Material weight/cost, cutting cost, folding cost, and drilling are not implemented.

## Requested Changes (Diff)

### Add
- New inputs: Center Length, Sheet Count, Sheet Thickness (per sheet), Bars Supplied toggle (default OFF), Bar Length/Width/Thickness (only if bars supplied), Number of Drills (0 = no drilling), Number of Folds
- Material weight calculations: Sheet Stack Weight, Bar Weights, Strip Weight, Total Material Weight
- Material Cost = Total Material Used × 1.2 × Material Rate
- Sheet Cutting Cost = (No. of Sheets + 4) × 2.5
- Folding cost = numberOfFolds × ₹15 (configurable rate)
- Chamfering cost = ₹80 always (fixed, both bars always chamfered)
- Drilling charge = ₹15 per drill (only if drills > 0)
- Total Weld Length = (SHEET BUNCH WIDTH + SHEET BUNCH THK) × 4
- Welding cost = (SHEET BUNCH WIDTH / 25) × labour charge (existing)
- Overhead 5%, Profit 10% on all costs
- New settings: AL density (2.7), CU density (8.96), AL material rate (Rs/kg), CU material rate (Rs/kg), folding cost per fold (15), drilling cost per hole (15)
- Material rate per kg with date history (in settings)

### Modify
- FlexibleJob backend type: add centerLength, sheetCount, barsSupplied, barLength, barWidth, barThickness, numberOfDrills, numberOfFolds, sheetStackWeight, stripWeight, bar1Weight, bar2Weight, totalMaterialWeight, materialCost, cuttingCost, foldingCost, drillingCost, totalWeldLength
- saveFlexibleJob backend function: accept new parameters
- useFormulaSettings: add flexAlDensity, flexCuDensity, flexAlMaterialRate, flexCuMaterialRate, flexFoldingCostPerFold, flexDrillingCostPerHole
- Chamfering: always ₹80 (fixed), remove numBars selector
- Flexibles.tsx: full rewrite with new inputs and full cost breakdown
- Formulas.tsx: add new Flexibles material settings section

### Remove
- Number of Bars selector (chamfering is always ₹80 for both bars)

## Implementation Plan
1. Update backend main.mo - new FlexibleJob type and saveFlexibleJob signature
2. Update backend.d.ts - sync TypeScript types
3. Update useFormulaSettings - add new settings
4. Update useQueries.ts - update useSaveFlexibleJob mutation
5. Rewrite Flexibles.tsx - new inputs, formulas, breakdown display
6. Update Formulas.tsx - add AL/CU density and material rate settings
