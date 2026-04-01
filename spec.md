# Job Working Calculator

## Current State
Full-stack job costing app with SS Fabrication, Flexibles, and Labour modules. Data stored on ICP backend canister. Production site was failing to save while drafts worked fine.

## Requested Changes (Diff)

### Add
- `preupgrade`/`postupgrade` system hooks in `main.mo` so all data persists through canister upgrades (raw materials, customers, jobs, labour jobs, flexible jobs, al welding jobs all serialized to stable arrays)
- Error toasts on all mutation `onError` handlers in `useQueries.ts` so save failures are visible
- `useFlexibleJobs`, `useLabourJobs`, `useAlWeldingJobs` query hooks for backup

### Modify
- `main.mo`: all data maps now have corresponding `stable var` arrays + preupgrade/postupgrade hooks
- `useInternetIdentity.ts`: replaced with permanent no-op (no AuthClient.create(), no network calls)
- `ExportData.tsx`: backup now reads from ICP (all 6 data types), restore writes back to ICP
- `useQueries.ts`: error toasts added to all mutations; missing FlexibleJob/LabourJob/AlWeldingJob hooks added

### Remove
- `localStorageDB` import from `ExportData.tsx`
- Dead `_initializeAccessControlWithSecret` call from `useActor.ts`

## Implementation Plan
1. Write stable storage Motoko backend with preupgrade/postupgrade
2. Replace useInternetIdentity.ts with no-op
3. Fix ExportData.tsx backup/restore to use ICP
4. Add error toasts and missing hooks to useQueries.ts
