# Implementation Plan: Fix Realtime Tenant Channel TIMED_OUT & Invalid CDC Subscriptions (#193)

## Problem Overview
The browser console repeatedly logs:
```
[REALTIME] Tenant channel failure status: TIMED_OUT
[REALTIME] Scheduling automatic channel reconnect in 15899ms (attempt #314)
```

### Root Causes:
1. **Invalid/Non-Existent CDC Table Subscriptions in Global & Tenant Channels:**
   - In [`js/realtime.js`](file:///d:/V2BmstzOfficial/js/realtime.js) (line 894), `GLOBAL_TABLES` included non-existent table names: `'pricing_plans'` (correct table is `sys_pricing_plans`) and `'sys_surveys'`.
   - When the Supabase Realtime server attempts to register Postgres Change Data Capture (CDC) filters for non-existent database relations, the server-side handshake hangs and triggers `TIMED_OUT` (default 10s timeout).
2. **Channel Subscription Timeout Threshold & Redundant Re-init on Token Refresh:**
   - Supabase client channel configurations lacked a resilient socket timeout (`config: { timeout: 30000 }`), causing slow network connections or heavy CDC subscriptions to abort at 10s.
   - On background token refresh and window focus/visibility changes (`auth.js`), `initRealtimeSync(true)` was tearing down connecting channels mid-handshake, causing infinite reconnect loops.

---

## Proposed Changes:
1. **Sanitize CDC Table Names in [`js/realtime.js`](file:///d:/V2BmstzOfficial/js/realtime.js):**
   - Replace non-existent `pricing_plans` and `sys_surveys` with valid operational tables: `sys_settings`, `sys_banners`, `sys_scheduled_toasts`, `sys_popups`, `sys_pricing_plans`.
2. **Extend Realtime Handshake Timeout & Prevent Mid-Handshake Teardown:**
   - Set `timeout: 30000` (30 seconds) in channel configurations to accommodate initial CDC replication setup.
   - Prevent tearing down channels that are actively in the `joining` / `connecting` state.
