# Implementation Plan: Align Realtime Channel CDC Tables & Timeout Resilience for Owner Accounts (#196)

## Problem Overview
In plan [#193](file:///d:/V2BmstzOfficial/implementation_plans/fix_realtime_channel_timeout_and_cdc_tables_193.md), we resolved channel timeouts on `_globalChannel` and branch connections by sanitizing non-existent table CDC listeners (`pricing_plans`, `sys_surveys`) and adding socket handshake timeout parameters. However, in the tenant-level `SUBSCRIPTIONS` list in [`js/realtime.js`](file:///d:/V2BmstzOfficial/js/realtime.js):
1. Non-existent relation `sys_surveys` still has `ownerKey: 'sysadmin-surveys'`, causing Owner accounts to register an invalid Postgres CDC subscription during channel join.
2. Legacy entries `pricing_plans`, `support_tickets`, `audit_logs`, and `security_lockouts` are present in `SUBSCRIPTIONS` with legacy keys.
3. System-level tables (`sys_settings`, `sys_banners`, `sys_scheduled_toasts`) are already subscribed on `_globalChannel` (`bms-global`), so subscribing to them a second time on the tenant channel is redundant.

---

## Proposed Changes:
1. **Clean up `SUBSCRIPTIONS` in [`js/realtime.js`](file:///d:/V2BmstzOfficial/js/realtime.js):**
   - Remove non-existent `sys_surveys` and `pricing_plans` CDC subscriptions from the tenant channel.
   - Ensure all owner tables mapped in `SUBSCRIPTIONS` match valid, active database tables in the Supabase schema.
2. **Owner-Scope CDC Filter Alignment:**
   - Verify that owner-level Postgres changes correctly scope to active tenant entities.
3. **Verify Channel Stability & Handshake:**
   - Ensure both Owner and Branch channels join with `timeout: 30000` and zero invalid table listeners.

---

## Strict Real-Time Protection Guard
> [!IMPORTANT]
> In accordance with the **Strict Real-Time & Data Sync Protection Guard**, changes to `js/realtime.js` require explicit double-confirmation before modifying any code.
