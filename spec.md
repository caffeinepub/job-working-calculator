# Job Working Calculator

## Current State
New project. No existing application files.

## Requested Changes (Diff)

### Add
- Raw Material database with fields: Grade, Type, Size, Weight Per Meter (auto-calculated), Current Rate
- CRUD operations: add, edit, delete raw material entries
- Auto-calculation of Weight Per Meter based on Type + Size using standard engineering formulas:
  - Round Bar: π/4 × d² × 7.85 (kg/m, density of steel)
  - Flat Bar: width × thickness × 7.85 / 1000
  - Square Bar: side² × 7.85 / 1000
  - Pipe: π/4 × (OD² - ID²) × 7.85
  - Angle: (2 × leg - thickness) × thickness × 7.85 / 1000
  - Channel: complex formula based on web + flanges
  - I-Beam/H-Beam: formula based on section dimensions
- Manual override for Weight Per Meter
- Sortable table display
- Modular dashboard layout with sidebar navigation for future modules

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan
1. Backend (Motoko): RawMaterial type with id, grade, type, size, weightPerMeter, currentRate. CRUD endpoints: addMaterial, updateMaterial, deleteMaterial, getMaterials.
2. Frontend: Dashboard layout with sidebar (Raw Materials active, placeholders for Job Costing, Labor, Overhead).
3. Raw Materials page: sortable table with all columns, add/edit modal form, delete confirmation.
4. Auto-calculation logic in frontend based on type and size input.
5. Manual override toggle for Weight Per Meter.
