# Job Working Calculator

## Current State
App has ExportData page with download-only backup. Raw material type order is: Round Bar, Flat Bar, Square Bar, Pipe, Angle, Channel, I-Beam, Plate, Sheet, Wire Mesh, Machined. All pages use the same neutral card/background styling with no visual distinction between sections.

## Requested Changes (Diff)

### Add
- Backup restore section on ExportData page: file upload input that accepts a `.json` backup file, parses it, and calls backend to restore materials, customers, and jobs. Show a confirmation dialog before restoring (warns it will overwrite current data). Show success/error toast.

### Modify
- `src/frontend/src/utils/weightCalculator.ts`: Reorder MATERIAL_TYPES array to: Pipe, Wire Mesh, Sheet, Plate, Round Bar, Flat Bar, Square Bar, Angle, Channel (ISMC), I-Beam (ISMB), Machined.
- Page visual distinction: each major page gets a distinct accent color for its header/title area so users can immediately tell which section they're in.
  - Dashboard: default blue (current primary)
  - SS Fabrication: amber/orange accent
  - Labour: green accent
  - Flexibles: violet/purple accent
  - Customers: rose/pink accent
  - Formulas & Settings: slate/gray accent
  - Export & Backup: emerald accent

### Remove
- Nothing removed

## Implementation Plan
1. Reorder MATERIAL_TYPES in weightCalculator.ts
2. Add restore functionality to ExportData.tsx:
   - New "Restore" tab (5th tab)
   - File input for JSON backup upload
   - Parse and validate the backup file structure
   - Confirmation dialog before restore
   - Call backend addMaterial/saveCustomer/saveJob for each item after clearing existing data
   - Toast on success/error
3. Add page-specific accent color headers to Dashboard, SSFabrication, Labour, Flexibles, Customers, Formulas, ExportData pages -- a colored top border or header band using Tailwind color classes
