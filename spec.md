# Job Working Calculator

## Current State
- App uses `h-screen` for the outer layout container, which causes iOS Safari scroll issues because `100vh` doesn't account for the dynamic browser chrome (address bar showing/hiding). Top and bottom content gets cut off or unreachable.
- `main.tsx` still wraps the app with `InternetIdentityProvider` (from auth that was supposed to be fully removed) and a duplicate `QueryClientProvider`. This is dead code that initializes AuthClient on every load, potentially interfering with stable operation.
- `useActor.ts` still imports `useInternetIdentity` and calls `_initializeAccessControlWithSecret` on the backend, though it's not directly called by pages. The backend `main.mo` imports AccessControl but doesn't use it in any public function.
- Pages use `getActor()` from `actorSingleton.ts` directly (correct path). But any residual auth initialization can cause timing/state issues.

## Requested Changes (Diff)

### Add
- Add `-webkit-overflow-scrolling: touch` to the scrollable main content area for smooth inertia scrolling on iOS
- Add `scroll-smooth` behavior globally
- Add bottom safe area padding so content isn't hidden behind iOS home indicator

### Modify
- `App.tsx`: Change outer container from `h-screen` to `h-[100dvh]` to use dynamic viewport height (adjusts when browser UI shows/hides on mobile)
- `main.tsx`: Remove `InternetIdentityProvider` wrapper and the redundant outer `QueryClientProvider` (App.tsx already provides its own)
- `main.tsx`: Render App directly without any auth or query wrappers
- `index.css`: Ensure `html, body` fill full height properly and don't have double scroll containers

### Remove
- Remove `InternetIdentityProvider` import and usage from `main.tsx`
- Remove redundant `QueryClientProvider` from `main.tsx`

## Implementation Plan
1. Fix `main.tsx` to render App with no wrappers (App.tsx already has its own QueryClientProvider)
2. Fix `App.tsx` outer div to use `h-[100dvh]` instead of `h-screen`
3. Add `overscroll-contain` to the main scroll area to prevent scroll chaining on mobile
4. Add iOS-specific scroll fix in `index.css`: ensure `html` and `body` are `height: 100%` not `100vh`, prevent double scroll
5. Add bottom padding (`pb-safe` equivalent) to `<main>` to account for iOS home indicator
