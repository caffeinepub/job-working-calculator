# Job Working Calculator

## Current State
Flexibles page has AL/CU calculator tabs with cost breakdown, save/delete jobs. Saved jobs table shows date, description, width, sheet count, material cost, total. No discount/before-discount stored in backend. No updateFlexibleJob backend function. Customer field present. All saved jobs mixed in same calculator tab.

## Requested Changes (Diff)

### Add
- `discountPct` and `quotedPrice` fields to FlexibleJob backend type (for displaying before-discount, discount %, final price in saved list)
- `updateFlexibleJob` backend function (for editing saved jobs)
- "Saved Jobs" tab within Flexibles page (separate from AL/CU calculator), with AL/CU sub-tabs inside it
- Cost snapshot history in localStorage (keyed by job id) when auto-update recalculates a job
- Auto-update all saved Flexible jobs of same materialTab when AL/CU rate changes, saving old cost snapshot before updating
- Duplicate description check on save -- if same description exists, prompt user to overwrite or save as new
- Edit saved job functionality (load into calculator form, update on re-save)

### Modify
- Saved jobs table: only show Date, Description, Before Discount, Discount %, Final Price (and delete button)
- Remove customer dropdown from Flexibles calculator
- Backend: FlexibleJob V3 with discountPct + quotedPrice fields, migrate V2 jobs with defaults (discountPct=0, quotedPrice=totalCost)
- saveFlexibleJob: add discountPct and quotedPrice parameters

### Remove
- Customer selector in Flexibles calculator
- customerId/customerName handling in Flexibles save (but keep in backend for compatibility, just don't use in UI)

## Implementation Plan
1. Backend: add discountPct, quotedPrice to FlexibleJob; add updateFlexibleJob function; migrate V2→V3
2. Frontend: remove customer dropdown from calculator
3. Frontend: update handleSave to pass discountPct and quotedPrice; add duplicate check
4. Frontend: restructure Flexibles page to have 3 tabs: Aluminium (calculator), Copper (calculator), Saved Jobs (with AL/CU sub-tabs)
5. Frontend: saved jobs sub-view shows only Date, Description, Before Discount, Discount %, Final Price, delete/edit actions
6. Frontend: auto-update saved jobs when rate changes -- when handleRateEditConfirm fires, recalculate all tabJobs using stored dimensions and new rate, store old cost snapshot in localStorage, then call updateFlexibleJob for each
7. Frontend: edit saved job -- load its dimensions back into calculator form and set editingJobId state; re-save calls updateFlexibleJob
