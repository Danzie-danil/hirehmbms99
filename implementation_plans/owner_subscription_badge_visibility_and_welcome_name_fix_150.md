# Owner Subscription Badge Visibility & Welcome Name Fix

## Overview
When logged in as a Business Owner (BSO), two UI issues are currently observed:
1. **Subscription Badge Not Visible**: The `#subscriptionTag` element next to the `BSO` role chip only renders an isolated icon (with no background pill, border, or visible plan label text), giving the appearance that the subscription badge is missing.
2. **Welcome Message Displays "Admin"**: The overview header displays "Welcome back, Admin" instead of the owner's actual full name, business name, or personalized username derived from their account/email, due to legacy fallback strings (`'Admin'`) stored during profile creation/upsert.

---

## User Review Required
> [!NOTE]
> - The `#subscriptionTag` will be converted into an interactive pill badge matching the `#userRole` (`BSO`) styling, displaying the tier name (e.g., **`Trial · 14d`**, **`Starter`**, **`Enterprise`**, **`Exclusive VIP`**) with 1-click navigation directly to Security & Billing settings for the owner.
> - `getOwnerDisplayName()` will intelligently filter out generic `'Admin'` / `'Administrator'` placeholders and resolve the owner's real name from profile, user metadata, business name, or email prefix.

---

## Proposed Changes

### 1. Subscription Badge Rendering & Styling

#### [MODIFY] [dashboardView.js](file:///D:/v2%20BMS%20OFFICIAL/js/ui/dashboardView.js)
- Update `updateSubscriptionBadge()` to render a styled, colored pill badge (icon + plan name label):
  - **Trial (Active)**: Blue badge with clock icon + `Trial · {days}d`.
  - **Trial (Expired)**: Red badge with alert icon + `Trial Expired`.
  - **Starter**: Emerald badge with shield icon + `Starter`.
  - **Enterprise**: Purple badge with diamond asset + `Enterprise`.
  - **Exclusive VIP**: Gold/Amber badge with diamond asset + `Exclusive VIP`.
  - **Expired (Paid Plan)**: Red badge with warning icon + `[PLAN] (Expired)`.
- Make the badge clickable for business owners to open Security & Billing settings directly.
- In `stateListener` for `property === 'profile'`, update `ownerOverviewWelcomeHeading` dynamically upon async profile resolution.

#### [MODIFY] [css/index.css](file:///D:/v2%20BMS%20OFFICIAL/css/index.css)
- Adjust `header #subscriptionTag` styles to align with `header #userRole` (padding, font size, border radius, icon size).

#### [MODIFY] [i18n.js](file:///D:/v2%20BMS%20OFFICIAL/js/i18n.js)
- Add `trial_badge_short` and ensure `welcome_back` is localized in English and Swahili.

---

### 2. Personalized Owner Name Resolution

#### [MODIFY] [overview.js](file:///D:/v2%20BMS%20OFFICIAL/js/owner/overview.js)
- Update `getOwnerDisplayName()`:
  - Filter out generic `'Admin'`, `'Administrator'`, `'sysadmin'` placeholder values.
  - Resolve in order: verified `profile.full_name` (non-admin) → `profile.name` → user metadata (`full_name`/`first_name`) → `profile.business_name` → formatted email prefix (e.g., `daniel455518dec@gmail.com` → `Daniel455518dec`) → `Owner`.

#### [MODIFY] [auth.js](file:///D:/v2%20BMS%20OFFICIAL/js/auth.js)
- Replace `'Admin'` fallbacks during registration, profile upserts, and login notifications with personalized name fallbacks (business name, user metadata, or email prefix).

---

### 3. Version Bump & Chat History

#### [MODIFY] [release_notes.json](file:///D:/v2%20BMS%20OFFICIAL/release_notes.json) & [public/release_notes.json](file:///D:/v2%20BMS%20OFFICIAL/public/release_notes.json)
- Increment version to `v3.9.78` with simple user-facing release notes.

#### [MODIFY] [updateChecker.js](file:///D:/v2%20BMS%20OFFICIAL/js/updateChecker.js) & [public/sw.js](file:///D:/v2%20BMS%20OFFICIAL/public/sw.js)
- Sync version string.

#### [MODIFY] [Chat_History/chat_history.txt](file:///D:/v2%20BMS%20OFFICIAL/Chat_History/chat_history.txt)
- Log all file modifications, line numbers, and task summaries.

---

## Verification Plan

### Automated Build & Lint Check
- Run `npm run build` to verify clean compilation with 0 errors across all JS/CSS bundles and PWA service worker.

### Manual Verification
- Log in / view owner dashboard:
  - Verify subscription badge displays clearly next to `BSO` chip with color theme and visible text label (e.g. `Trial · 14d`).
  - Verify welcome greeting displays owner's name instead of "Welcome back, Admin".
  - Test clicking the subscription badge opens Security & Billing settings.
