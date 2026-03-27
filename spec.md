# Job Working Calculator

## Current State
- Full app with SS Fabrication, Flexibles, Labour, Customers, Formulas, Export pages
- No authentication -- app loads directly to dashboard
- Labour has SS304, Aluminium (joints/brackets formula), Gutter Welding tabs
- Dark mode not implemented
- No customer-facing pages or user management
- Backend is fully open, no auth checks

## Requested Changes (Diff)

### Add
- **Login page**: Username + password form. Unregistered users see a Register link.
- **Register page**: Username + password form. New users go into "pending approval" state.
- **Auth context**: Stores logged-in user (username, role, discountPct) in localStorage. Enforces page access by role.
- **Admin account**: Hardcoded initial admin (username: `admin`, password: `admin123`). Changeable from settings. Admin sees all pages.
- **Customer role**: Approved users with role=customer see only the Customer Flexibles page.
- **Pending state**: Registered but unapproved users see a "Waiting for approval" screen.
- **Users management page** (admin only): Table of all registered users with status (pending/approved/rejected), approve/reject buttons, discount % field per user, and ability to promote to admin.
- **Customer Flexibles page**: Simplified Flexibles calculator for customers. Inputs: Bunch Width, Bunch Thickness, Bunch Length, Sheet Thickness (0.28/0.3mm). Bar toggle: default = "I'm supplying the bars" (only center calc), option = "Include bars in quote" (activates bar dimension inputs + full calc). Discount applied invisibly (markup so customer sees final price = your cost after discount -- no markup visible). No save functionality for customers.
- **Dark mode toggle**: Button in header (sun/moon icon). Persisted in localStorage. Applies `dark` class to html root.
- **Backend: User management functions**: registerUser, loginUser (returns user or error), approveUser, rejectUser, updateUserDiscount, getUsers, initAdminIfNeeded.

### Modify
- **Labour Aluminium tab**: Replace joints/brackets/dummies formula with same formula as SS304 (weld length × rate per meter). Default rate: ₹900/m. Tabs made visually distinct (colored borders or background).
- **App routing**: Wrap entire app in AuthGuard. If not logged in → Login page. If pending → Waiting screen. If customer → Customer Flexibles only. If admin → all pages.
- **Header**: Add dark mode toggle button. Add logged-in user display + logout button.
- **Formulas & Settings**: Add tab to change admin password.

### Remove
- Old Aluminium Welding (joints/brackets formula) from Labour -- replaced with simple weld length formula
- Auth stub functions from backend (replace with real user management)

## Implementation Plan
1. Update backend Motoko: add AppUser type, user registration/login/approval/discount functions, initialize default admin
2. Update backend.d.ts with new user management types and functions
3. Create AuthContext (React context) with login/logout/user state, persisted in localStorage
4. Create Login page and Register page components
5. Create AuthGuard component that routes by role
6. Create CustomerFlexibles page with bar toggle logic and invisible discount
7. Update Labour page: Aluminium tab = SS304 formula, rate ₹900, visually distinct tabs
8. Add Users management page (admin approves/rejects, sets discount)
9. Add dark mode toggle to header, persist in localStorage
10. Add Change Password tab to Formulas & Settings
11. Wire everything into App.tsx routing
