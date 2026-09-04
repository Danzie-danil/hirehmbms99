# Implementation Plan - Central Inventory Cache Resilience & Session Recovery

## Problem & Root Cause Analysis
1. **Supabase RLS Empty Return on Stale Token:** When Supabase session tokens expire or get out of sync during sleep/idle, RLS policies evaluate `auth.uid()` as NULL, returning HTTP 200 with an empty array `[]` instead of an explicit error.
2. **In-Memory Cache Overwrite:** The inventory module previously overwrote `window._cachedCentralItems` with `[]` whenever the query returned 0 items, clearing the screen.
3. **Recovery Difficulty:** Users were forced to clear their full browser storage and re-login to force a fresh token handshake and purge local stores.

---

## Proposed Changes

### 1. Central Inventory Module (`js/owner/central_inventory.js`)
- **Instant IndexedDB Hydration:** Hydrate the view immediately from local IndexedDB (`localDb.central_inventory`) on load while background network fetch completes.
- **Zero-Wipe Fallback Guard:** If Supabase returns `0` items but local IndexedDB or memory cache previously had items for this owner, preserve the cached items instead of wiping the catalog to 0.
- **Silent Auth Token Refresh & Auto-Retry:** If a fetch returns 0 items unexpectedly, attempt a silent `supabase.auth.refreshSession()` and re-query before finalizing state.
- **In-App Re-sync Control:** Provide an in-app "Refresh & Re-sync" button in empty states and error fallbacks to purge memory cache and refresh the token without needing to clear entire browser cache.

### 2. Auth Session Wake & Resume Proactivity (`js/auth.js`)
- **Focus & Visibility Session Refresh:** Add a debounced visibility/focus listener that validates and refreshes expiring/stale Supabase JWT tokens on tab resume.

---

## Verification Plan
1. Run syntax and lint check across codebase (`node scripts/lint_check.cjs`).
2. Run full production build (`npm run build`) to ensure zero errors.
3. Bump app version in `release_notes.json`, `public/release_notes.json`, and `js/updateChecker.js`.
4. Update `Chat_History/chat_history.txt` with detailed lines and file changes.
