# Job Working Calculator

## Current State
The app has a flat navigation with 9 items: Dashboard, Job History, SS Fabrication (jobCalculator), Labour, Flexibles, Raw Materials, Customers, Formulas & Settings, Export & Backup.

Dashboard only shows SS Fabrication jobs (jobs this month, total jobs, recent jobs, top materials).

## Requested Changes (Diff)

### Add
- New `SSFabrication` page component that contains three tabs: "Raw Materials", "Job Calculator", "Job History" -- housing the existing RawMaterials, JobCalculator, and JobHistory page components.
- Dashboard stats for all three modules: SS Fabrication job count, Flexible job count (AL + CU), Labour job count, total raw materials count.
- Dashboard recent activity across all three modules (recent SS jobs, recent Flexibles, recent Labour jobs) with module badge labels.

### Modify
- `AppPage` type: remove `rawMaterials` and `jobHistory` as top-level pages, add `ssFabrication`.
- `Sidebar`: 7 items only: Dashboard, SS Fabrication, Labour, Flexibles, Customers, Formulas & Settings, Export & Backup.
- `App.tsx`: route `ssFabrication` to new SSFabrication tabbed page; remove top-level routes for `rawMaterials` and `jobHistory`.
- `Dashboard`: revamp to show stats for all modules (SS jobs this month, total SS jobs, total Flexible jobs, total Labour jobs, total raw materials). Recent jobs table shows entries from all three modules with a module type badge. Top Materials section retained.
- `PAGE_TITLES`: update to reflect new pages.
- Navigation from Dashboard "Create your first job" button should go to `ssFabrication`.
- `handleEditJob` in App.tsx navigates to `ssFabrication` (with tab pre-selected to Job Calculator).

### Remove
- `rawMaterials` and `jobHistory` as standalone top-level nav items.

## Implementation Plan
1. Create `src/pages/SSFabrication.tsx` -- tabbed page with three tabs: Raw Materials | Job Calculator | Job History. Accept `editJobOnMount` and `onEditConsumed` props, pass through to JobCalculator. Accept optional `initialTab` prop.
2. Update `AppPage` type in Sidebar.tsx: remove `rawMaterials`, `jobHistory`, add `ssFabrication`.
3. Update Sidebar navItems to 7 items.
4. Update App.tsx: add SSFabrication import, update PAGE_TITLES, add route for `ssFabrication`, remove routes for `rawMaterials`/`jobHistory`, update `handleEditJob` to navigate to `ssFabrication`.
5. Revamp Dashboard.tsx: add `useFlexibleJobs` and `useLabourJobs` query hooks, show 4 stat cards (SS jobs this month, total SS, total Flexibles, total Labour + raw materials count), recent activity from all modules with module badge, keep top materials panel.
