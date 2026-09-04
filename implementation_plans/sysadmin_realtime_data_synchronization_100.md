# Implementation Plan: System Admin Realtime Data Synchronization (100)

## Goal Description
Extend the dual-layer instant real-time data synchronization engine to the System Admin portal (`#sysadmin`) so that user registrations, branch creations, tenant operations, system banners, surveys, support tickets, audit logs, and global database mutations propagate live to the sysadmin dashboard in real time without page reloads, while strictly preserving owner and branch portals.

---

## Proposed Changes

### 1. [js/realtime.js](file:///d:/v2%20BMS%20OFFICIAL/js/realtime.js)
- Add `SYSADMIN_TABLE_VIEWS` mapping all relevant system tables (`profiles`, `branches`, `sys_settings`, `sys_banners`, `sys_scheduled_toasts`, `sys_surveys`, `sales`, `expenses`, `support_tickets`, `audit_logs`, etc.) to active sysadmin view renderers.
- Update `getActiveView()` to support `sysadmin` (retrieving `lastSysadminView` or defaulting to `sysadmin-dashboard`).
- Update `SUBSCRIPTIONS` relevance logic so `sysadmin` subscribes to global un-filtered Postgres changes across all system tables.
- Update `routeMap` in `handleChange` to route to `SYSADMIN_TABLE_VIEWS` when `state.role === 'sysadmin'`.

### 2. [js/admin/dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)
- Expose `window.renderSysadminView` globally.
- Support live incremental in-memory cache patching for sysadmin global state (`adminProfiles`, `adminBranches`, `adminBanners`, `adminSettings`, `adminPricingPlans`).

---

## Verification Plan
1. Test sysadmin live updates upon tenant user signup, branch creation, or banner updates.
2. Ensure owner and branch realtime synchronization remains 100% intact and functional.
3. Run `npm run build` to verify clean compilation.
