# Job Working Calculator

## Current State
- Flexibles module has AL/CU labour rates: AL 6mm=₹120, 10mm=₹125, 12mm=₹130, 12.7mm=₹135; CU 6mm=₹210, 10mm=₹220, 12mm=₹230, 12.7mm=₹235
- SS Fabrication Job Calculator has Material Line Items, then Welding section
- No machining operations section exists in Job Calculator
- Formulas page has welding rates and labour settings but no drilling/machining rates

## Requested Changes (Diff)

### Add
- **Machining Operations section** in JobCalculator.tsx, placed BEFORE the Welding section
  - Supports operation types: Drilling, Tapping, Counter-sinking, Milling/Slotting, Other
  - Each row: operation type dropdown, type-specific inputs, grade (SS304/SS310), qty, calculated cost, delete button
  - **Drilling**: inputs = Drill Dia (mm), Material Thickness (mm), Grade, Qty
    - Formula: `Cost per hole = BaseDrillRate × (Dia/10) × (Thickness/10) × GradeMultiplier`
    - BaseDrillRate = ₹15 (SS304, 10mm dia, 10mm thk), SS310 = 2× SS304 rate
    - Material weight removed per hole = π × (Dia/2)² × Thickness × 7.93e-6 kg, deducted from total job weight
  - **Tapping**: inputs = Tap Size (M6/M8/M10/M12/M16/M20), Grade, Qty; rate per size, editable
  - **Counter-sinking**: inputs = Hole Dia (mm), Qty; flat rate per hole, editable
  - **Milling/Slotting**: inputs = Slot Length (mm), Slot Width (mm), Qty; rate per mm, editable
  - **Other**: inputs = Description, Cost per unit, Qty; manual entry
  - Total machining cost is added to the labor line in the job summary
  - Total weight removed by drilling is subtracted from total product weight
- **Machining Rates section** in Formulas.tsx
  - Base Drill Rate SS304 (₹/unit at 10mm dia, 10mm thk): default 15
  - Drill Grade Multiplier SS310: default 2
  - Tapping rates per tap size (M6 through M20): editable table
  - Counter-sinking rate per hole: default 20
  - Milling rate per mm: default 2

### Modify
- **Flexibles.tsx**: Reduce all AL and CU labour rates by 10
  - AL: 6mm=₹110, 10mm=₹115, 12mm=₹120, 12.7mm=₹125
  - CU: 6mm=₹200, 10mm=₹210, 12mm=₹220, 12.7mm=₹225
  - Also update defaults in Formulas page for Flexibles labour
- **JobCalculator.tsx**: 
  - Add MachiningRow interface and state array
  - Add machining cost to summary totals (added to labor)
  - Subtract drilling weight removal from totalProductWeight
  - Build machining section UI before Welding card
  - Machining rows are not saved to backend separately — total cost is folded into the totals

### Remove
- Nothing removed

## Implementation Plan
1. Update Flexibles default labour rates (reduce by 10 each)
2. Add MachinингRow type and state to JobCalculator
3. Add machinig calculation logic (per-row cost + weight removed)
4. Add Machining Operations card UI (before Welding card) with operation-type-specific input rows
5. Integrate machining totals into summary (cost → labor, weight removed → subtract from product weight)
6. Add machining rates to Formulas page (drill base rate, grade multiplier, tapping rates table, counter-sink rate, milling rate)
7. Load machining rates from formula settings in JobCalculator
