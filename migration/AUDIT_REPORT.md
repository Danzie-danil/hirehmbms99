# BMSTz — Phase 0 Discovery & Audit Report

**Date:** September 4, 2026  
**Target Convex Deployment:**  
- Cloud URL: `https://lovely-rhinoceros-87.convex.cloud`  
- HTTP Actions URL: `https://lovely-rhinoceros-87.convex.site`  
**Current Application Version:** v3.9.258  
**Author:** Senior Backend Migration Engineer  

---

## Executive Summary

This audit report documents Phase 0 of the migration of the **BMSTz Multi-Tenant Business Management & POS System** from **Supabase/PostgreSQL** to **Convex**, in strict accordance with the rules established in `migration_to_convex.md`.

Phase 0 is non-destructive. No production databases or live client files were deleted or destabilized. The purpose of this report is to catalog every dependency, query, procedure, cache store, and security boundary to guarantee zero data loss, zero permission leaks, zero financial discrepancies, and seamless offline POS continuity.

---

## 1. Current Architecture

BMSTz is a multi-platform, offline-first, multi-tenant enterprise and retail management system deployed across:
1. **Web PWA:** Served via Vite + Vanilla JS / React 19 hybrid components (`public/sw.js`, `index.html`, `js/app.js`).
2. **Android Mobile App:** Built with Capacitor 8 (`android/app`).
3. **Windows Desktop App:** Native packaging with Tauri CLI (`src-tauri/`).

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                             CLIENT LAYER                                    │
│  Web PWA / Android Capacitor / Windows Tauri / Service Worker Offline Cache │
└───────────────────────┬─────────────────────────────┬───────────────────────┘
                        │                             │
                        ▼                             ▼
┌───────────────────────────────────┐     ┌───────────────────────────────────┐
│     LOCAL OFFLINE ENGINE          │     │     DATA SYNCHRONIZATION          │
│  - Dexie IndexedDB (52 stores)    │◄───►│  - js/data/syncManager.js         │
│  - js/offline_queue.js            │     │  - Resilient Delta Reconciliation │
│  - POS Local Idempotency Cache    │     │  - Inactivity & Wake Lifecycle    │
└───────────────────────────────────┘     └─────────────────┬─────────────────┘
                                                            │
                                                            ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE CLOUD LAYER                              │
│  - GoTrue Auth (auth.users, JWT, Step-up MFA, PIN verification)             │
│  - PostgreSQL 15 (84 tables, Row-Level Security, triggers, foreign keys)    │
│  - 57 Stored Procedures / RPCs (create_sale, stock transfer, tenant admin)  │
│  - Realtime CDC Publication (39 subscribed tables, WebSocket multiplexing)  │
│  - Supabase Storage (chat-attachments, business logos, receipts, exports)   │
└─────────────────────────────────────────────────────────────────────────────┘
```

The system enforces a 3-tier hierarchical security model:
- **SysAdmin:** Global platform management, health diagnostics, billing override, tenant lifecycle.
- **Owner (Enterprise):** Tenant-isolated management over central inventory, capital accounts, business assets, loans, branches, and staff.
- **Branch (POS & Operations):** Strictly scoped access to local inventory, cash drawers, POS checkout, staff shifts, local expenses, and local customer payments.

---

## 2. Every Supabase Dependency

### Core Client Libraries
- `@supabase/supabase-js: ^2.98.0` imported in `js/supabase.js`.
- In-memory client initialized as `window.supabaseClient` and wrapped in `js/db.js` as `_db`.

### Key Codebase Entry Points
| File | Purpose | Supabase Methods Used |
|---|---|---|
| `js/supabase.js` | Client singleton, token refresh race guard | `createClient`, `auth.getSession`, `auth.onAuthStateChange` |
| `js/db.js` | Centralized data adapter (5,074 lines) | `.from()`, `.select()`, `.insert()`, `.update()`, `.delete()`, `.rpc()`, `.storage` |
| `js/auth.js` | Authentication & session manager | `auth.signInWithPassword`, `auth.signUp`, `auth.signOut`, `auth.getUser`, `.rpc('validate_admin_portal_access')` |
| `js/realtime.js` | Live WebSocket CDC listener | `client.channel()`, `.on('postgres_changes')`, `.subscribe()` |
| `js/data/syncManager.js` | Offline reconciliation engine | `.from().select().gt('updated_at')`, batch `.upsert()` |
| `js/admin/dashboard.js` | SysAdmin operations portal | Heavy `.rpc()` calls for platform health, tenant controls |
| `js/admin/communications.js` | Broadcast push & notifications | `.rpc('sysadmin_dispatch_push_broadcast')`, `.from('sys_banners')` |
| `api/push/send-update-notification.js` | Serverless update dispatcher | `.channel('bms-global').send()` |

**Scan Metrics:**
- Total `.from()` query calls: **502**
- Total `.rpc()` procedure calls: **69**

---

## 3. Every Table Used by Frontend

The audit identified **84 unique tables** referenced across frontend modules and migration scripts:

### Enterprise & Tenant Core (10 tables)
1. `profiles` — Owner business configuration, branding, trial & subscription settings
2. `branches` — Branch metadata, address, manager assignment, POS preferences, PINs
3. `staff` — Branch & enterprise employees, roles, salaries, employment status
4. `sys_custom_roles` — Custom user roles and permission sets
5. `categories` — Product and service categories (global & tenant specific)
6. `suppliers` — External vendors and suppliers
7. `announcements` — Enterprise-wide broadcasts to branches
8. `saas_audit_logs` — Subscription, plan changes, MRR event ledger
9. `access_requests` — Branch manager access challenges
10. `requests` — Internal branch requisitions (stock, services, expenses)

### Inventory & Supply Chain (11 tables)
11. `central_inventory` — Enterprise master product catalog
12. `inventory` — Branch-specific stock items with isolation flags
13. `branch_inventory` — Compatibility view / legacy alias for inventory
14. `services` — Branch & owner service offerings (zero physical stock)
15. `products` — Master item catalog reference
16. `inventory_purchases` — Supplier restock records
17. `purchase_orders` — Formal purchase orders to suppliers
18. `po_items` — Itemized lines on purchase orders
19. `stock_movements` — Append-only immutable stock transaction ledger
20. `stock_transfers` — Branch-to-branch and central-to-branch transfer workflow
21. `product_returns` — Customer return records with stock restock link

### Sales & Point of Sale (9 tables)
22. `sales` — Core transaction table with batch items JSONB, customer, profits
23. `sale_tags` — Analytical tags attached to completed sales
24. `cash_drawer` — Physical till drawer open/close records
25. `cash_drawers` — Legacy schema alias
26. `cash_transactions` — Drawer adjustments (cash in, cash out, safe drop)
27. `shifts` — Cashier shift records and till reconciliations
28. `quotations` — Estimates and customer proforma quotes
29. `quotation_items` — Itemized line items on quotations
30. `invoices` — Final formal customer billing invoices

### Financial & Accounting (12 tables)
31. `expenses` — Operating expenses, category, receipt image link, creator
32. `expense_tags` — Categorical expense tracking tags
33. `capital_accounts` — Bank, mobile money, petty cash accounts
34. `capital_transactions` — Deposits, withdrawals, and capital injections
35. `business_assets` — Fixed enterprise assets, depreciation, valuation
36. `asset_maintenance_logs` — Asset service and maintenance history
37. `business_loans` — Commercial liability borrowings and repayment tracking
38. `customers` — Customer ledger, credit limits, balances, loyalty points
39. `customer_payments` — Debt settlements against accounts
40. `customer_tags` — Customer segmentation tags
41. `loans` — Credit extended to retail customers
42. `loan_repayments` — Itemized loan settlements

### Operations, HR & Tasks (9 tables)
43. `payroll` — Salary runs, disbursements, period tracking
44. `attendance` — Clock-in / clock-out staff daily attendance
45. `tasks` — Assigned operational duties and deadlines
46. `task_comments` — Discussion threads on tasks
47. `task_tags` — Priority and category tags for tasks
48. `notes` — Operational scratchpads and memos
49. `note_tags` — Categorical note tagging
50. `loyalty_transactions` — Customer reward point redemptions
51. `promotions` — Marketing coupon codes and discounts

### Messaging & Collaboration (7 tables)
52. `messages` — Realtime messaging between users and branches
53. `chat_groups` — Group channel definitions
54. `group_members` — Membership mapping for groups
55. `pinned_messages` — Pinned announcements in chat channels
56. `starred_messages` — User-flagged favorite messages
57. `archived_conversations` — Archived chat histories
58. `chat-attachments` — Attachment metadata bucket

### SysAdmin & Security (18 tables)
59. `sys_admins` — Authoritative sysadmin user registry
60. `sys_active_sessions` — Realtime tracking of active user sessions
61. `sys_step_up_sessions` — 15-minute high-privilege challenge authorizations
62. `sys_security_events` — Audit logs of failed logins, rate limit hits, MFA
63. `sys_settings` — Platform-wide settings (maintenance mode, minimum app version)
64. `sys_pricing_plans` — SaaS subscription plans and branch/user limits
65. `sys_banners` — Global in-app announcement banners
66. `sys_popups` — Modal broadcasts dispatched to target audiences
67. `sys_scheduled_toasts` — Timed notification popups
68. `sys_broadcasts` — Unified broadcast distribution log
69. `sys_push_notifications` — Native WebPush broadcast history
70. `sys_push_subscriptions` — VAPID push token device registry
71. `sys_push_templates` — Reusable push message templates
72. `sys_surveys` — In-app feedback forms
73. `sys_survey_responses` — User submitted survey answers
74. `sys_tickets` — Support and helpdesk tickets
75. `sys_ai_prompts` — Dynamic AI assistant configuration
76. `sys_ai_chat_messages` — In-app assistant interaction logs

### Local & Client Synchronizers (8 tables)
77. `dashboard_snapshots` — Local zero-latency dashboard cache
78. `sync_queue` — Offline transaction staging queue
79. `sync_metadata` — Entity timestamp watermarks
80. `subscription_snapshot` — Offline cached entitlement flags
81. `admin_modal_messages` — Active broadcast announcements
82. `user_seen_modal_messages` — Acknowledged modal IDs per user
83. `notifications` — In-app notification inbox
84. `documents` — Exported PDFs and financial attachments

---

## 4. Every RPC Used

The codebase contains **57 unique RPC stored procedures**. These are categorized below with their migration targets:

### Core POS & Transactions (Critical Priority)
1. `create_sale` — Atomically decrements stock, creates sale record, records `stock_movements`, updates active `cash_drawer`, enforces offline `client_tx_id` idempotency.  
   *Target: Convex mutation `sales:createSale`*
2. `transfer_branch_to_branch_stock` — Atomic multi-branch inventory transfer with locking and movement ledgering.  
   *Target: Convex mutation `inventory:transferBranchToBranchStock`*
3. `dispatch_central_stock` — Allocates master stock to branch inventory.  
   *Target: Convex mutation `centralInventory:dispatchCentralStock`*
4. `return_stock_to_main_store` — Returns branch inventory back to enterprise central store.  
   *Target: Convex mutation `inventory:returnStockToMainStore`*
5. `create_branch_item` — Registers branch-specific isolated or central-linked product.  
   *Target: Convex mutation `inventory:createBranchItem`*
6. `create_central_item` — Adds new item to master enterprise inventory.  
   *Target: Convex mutation `centralInventory:createCentralItem`*
7. `delete_central_item` / `bulk_delete_central_items` — Cascading product archive.  
   *Target: Convex mutation `centralInventory:deleteCentralItems`*
8. `create_expense` — Records expense and updates cash drawer if cash.  
   *Target: Convex mutation `expenses:createExpense`*
9. `create_purchase_order` — Initiates restock requisition.  
   *Target: Convex mutation `suppliers:createPurchaseOrder`*

### Tenant & Branch Lifecycle
10. `create_branch_manager` — Authoritative branch user provisioner.  
    *Target: Convex mutation `branches:createBranchManager`*
11. `reset_branch_manager_password` — PIN/password reset for branch staff.  
    *Target: Convex mutation `branches:resetBranchManagerPassword`*
12. `delete_branch_cascade` — Cascading branch deletion with audit logging.  
    *Target: Convex mutation `branches:deleteBranchCascade`*
13. `update_branch_preferences` — Safe JSONB preference patching.  
    *Target: Convex mutation `branches:updateBranchPreferences`*
14. `get_branch_sales_summary` — Aggregated daily sales and transaction counts.  
    *Target: Convex query `reports:getBranchSalesSummary`*
15. `get_branch_profit_stats` — Daily gross profit and net margin computation.  
    *Target: Convex query `reports:getBranchProfitStats`*

### Authentication, Security & Step-Up
16. `is_sys_admin` — Server-side verification of SysAdmin role.  
    *Target: Convex internal helper `auth/sysAdmin:isSysAdmin`*
17. `verify_sys_admin` — Secondary challenge verification.  
    *Target: Convex mutation `auth/stepUp:verifySysAdmin`*
18. `verify_step_up_reauth` — Validates 15-minute step-up elevation.  
    *Target: Convex mutation `auth/stepUp:verifyStepUpReauth`*
19. `validate_admin_portal_access` — Multi-layered gate for SysAdmin dashboard.  
    *Target: Convex query `auth/sysAdmin:validateAdminPortalAccess`*
20. `validate_admin_portal_passcode` — Secure passcode verification.  
    *Target: Convex mutation `auth/sysAdmin:validateAdminPasscode`*
21. `validate_user_login_role` — Post-auth role mapping guard.  
    *Target: Convex query `auth/identity:validateUserLoginRole`*
22. `get_user_effective_entitlements` — Authoritative feature/limit resolution.  
    *Target: Convex query `profiles:getEffectiveEntitlements`*
23. `register_sysadmin_session` — Audited elevation session logger.  
    *Target: Convex mutation `securityEvents:registerSysadminSession`*

### SysAdmin Platform Operations
24. `get_admin_dashboard_summary` — Consolidated platform KPI aggregator.  
    *Target: Convex query `sysadmin/dashboard:getAdminSummary`*
25. `get_tenant_360_data` — Full tenant diagnostic overview.  
    *Target: Convex query `sysadmin/tenants:getTenant360Data`*
26. `sysadmin_update_subscription` — Manual subscription and plan override.  
    *Target: Convex mutation `sysadmin/billing:updateSubscription`*
27. `sysadmin_purge_tenant_permanently` — GDPR/Tenant deletion purge.  
    *Target: Convex mutation `sysadmin/tenants:purgeTenantPermanently`*
28. `sysadmin_cancel_tenant_deletion` / `sysadmin_extend_deletion_grace` / `sysadmin_toggle_deletion_freeze`  
    *Target: Convex mutations `sysadmin/tenants:*`*
29. `run_platform_health_diagnostics` — System-wide latency, integrity and error check.  
    *Target: Convex query `sysadmin/health:runDiagnostics`*
30. `log_admin_action` / `log_sys_admin_action` — Platform audit logging.  
    *Target: Convex mutation `securityEvents:logAdminAction`*
31. `publish_codebase_update_release` — Triggers global app version increment and broadcast.  
    *Target: Convex mutation `settings:publishRelease`*

### Communications & Broadcasts
32. `create_sys_banner` / `delete_sys_banner` / `get_active_sys_banners` — Active announcement banners.  
    *Target: Convex functions in `adminModalMessages.ts`*
33. `record_banner_cta_click` — Banner CTA telemetry.  
    *Target: Convex mutation `adminModalMessages:recordCtaClick`*
34. `create_sys_broadcast` — Dispatches notifications across accounts.  
    *Target: Convex mutation `adminModalMessages:createBroadcast`*
35. `sysadmin_dispatch_push_broadcast` — WebPush notification broadcast dispatcher.  
    *Target: Convex action `pushNotifications:dispatchBroadcast`*
36. `save_admin_push_draft` / `get_admin_push_draft` — Push notification drafts.  
    *Target: Convex functions `pushNotifications:*`*
37. `sysadmin_get_push_subscribers_overview` — Device token telemetry.  
    *Target: Convex query `pushNotifications:getSubscribersOverview`*
38. `register_push_subscription` / `update_device_push_preferences` — Client token enrollment.  
    *Target: Convex mutations `pushNotifications:*`*
39. `submit_sys_survey_response` / `get_sys_survey_analytics` / `get_sys_survey_kpi_summary` / `clear_sys_survey_responses`  
    *Target: Convex functions in `surveys.ts`*
40. `start_privileged_support_session` / `end_privileged_support_session` / `request_sysadmin_handshake`  
    *Target: Convex functions in `supportSessions.ts`*
41. `request_account_deletion` / `cancel_account_deletion`  
    *Target: Convex functions in `profiles.ts`*
42. `record_device_app_update` — Client installation version telemetry.  
    *Target: Convex mutation `settings:recordDeviceUpdate`*
43. `activate_user_subscription` — Billing webhook activation handler.  
    *Target: Convex httpAction `billing:activateSubscription`*

---

## 5. Every Realtime Subscription

The existing client in `js/realtime.js` registers **39 subscription channels** using PostgreSQL Change Data Capture (CDC):

```text
Table                 Branch View Affected        Owner View Affected
--------------------------------------------------------------------------------
sales                 sales, dashboard            overview, analytics
expenses              expenses, dashboard         overview, analytics
inventory             inventory, sales, dashboard central_inventory, overview, branches
central_inventory     inventory, sales            central_inventory, overview
inventory_purchases   inventory                   central_inventory
customers             customers, sales            overview
tasks                 tasks, dashboard            tasks, overview
task_comments         tasks                       tasks
notes                 notes                       —
loans                 loans                       loans, overview
requests              requests, dashboard         requests, overview
access_requests       —                           overview
branches              branches                    branches, overview
staff                 staff                       staff, overview
payroll               payroll                     payroll
quotations            quotations                  quotations
invoices              invoices                    —
suppliers             —                           suppliers
purchase_orders       inventory                   suppliers
sys_custom_roles      staff                       staff
messages              chat                        chat
chat_groups           chat                        chat
group_members         chat                        chat
pinned_messages       chat                        chat
announcements         announcements               announcements
product_returns       returns                     overview
stock_transfers       stock_transfers             stock_movements
stock_movements       inventory, shift_summary    stock_movements, central_inv, overview
capital_accounts      —                           capital, overview
capital_transactions  —                           capital, overview
business_assets       —                           assets, overview
business_loans        —                           loans, overview
business_goals        —                           goals
shifts                shift_summary               shifts
promotions            —                           promotions
cash_drawer_sessions  cash_drawer                 —
attendance            attendance                  staff
notifications         notifications               notifications
profiles              settings                    settings
```

In Convex, rather than maintaining fragile WebSocket subscriptions and reconnect listeners, **reactive queries** (`useQuery` / reactive client subscriptions) will automatically update the UI whenever underlying data mutations occur.

---

## 6. Every Storage Operation

Supabase Storage is utilized in `js/db.js` (lines 3242-3262):
- **Bucket `chat-attachments`:**
  - Files uploaded: images, documents, audio clips
  - Method: `_db.storage.from('chat-attachments').upload(filePath, file)`
  - Retrieval: `_db.storage.from('chat-attachments').getPublicUrl(filePath)`
- **Bucket `business_logos` (referenced in documentation & profiles):**
  - Stored in `profiles.logo_url` and `branches.avatar_url`.
- **Cloudflare R2 downloads (Preserved):**
  - Installer binaries (`BMSTz.apk`, `BMSTz-Setup.msi`, `BMSTz-Setup.exe`) are hosted on external R2 storage and will NOT be moved into Convex.

**Convex Strategy:**
Convex native File Storage (`ctx.storage.generateUploadUrl`, `ctx.storage.getUrl`) will replace `chat-attachments` and logo uploads cleanly.

---

## 7. Every Auth Dependency

The existing authentication architecture relies on Supabase GoTrue Auth:
1. **Credentials Login:** `supabase.auth.signInWithPassword({ email, password })`.
2. **Registration:** `supabase.auth.signUp(...)` followed by profile bootstrap.
3. **Session Persistence:** Stored in localStorage under `sb-<project-ref>-auth-token`.
4. **Token Refresh Guard:** Custom mutex in `js/auth.js` (lines 388-409) preventing refresh deadlock.
5. **Role Resolution:** Authoritative database lookup against `profiles` and `sys_admins`.
6. **Step-Up MFA Challenge:** 15-minute validity window recorded in `sys_step_up_sessions`.
7. **Branch Manager PIN Login:** Custom credential verification via branch PIN hash.

**Convex Auth Transition:**
Convex auth can integrate with Clerk or standard JWT authentication. In accordance with Section 78 of `migration_to_convex.md`, authentication must be migrated safely without exposing or losing existing user identities.

---

## 8. Every Dexie Store

`js/data/db.js` defines schema version 12 with **52 IndexedDB stores**:

```text
1. dashboard_snapshots     14. tasks               27. attendance           40. group_members
2. sales                   15. task_comments       28. payroll              41. pinned_messages
3. inventory               16. notes               29. shifts               42. inventory_purchases
4. categories              17. loans               30. cash_drawer          43. custom_roles
5. customers               18. business_loans      31. promotions           44. form_drafts
6. expenses                19. capital_accounts    32. goals                45. admin_modal_messages
7. purchases               20. capital_txs         33. purchase_orders      46. user_seen_modal_messages
8. central_inventory       21. business_assets     34. sale_tags            47. notifications
9. quotations              22. asset_maintenance   35. messages             48. users
10. invoices               23. requests            36. chat_groups          49. profiles
11. staff                  24. access_requests     37. sync_queue           50. sync_metadata
12. branches               25. documents           38. subscription_snap    51. is_isolated (inv index)
13. suppliers              26. announcements       39. stock_transfers      52. stock_movements
```

**Dexie Role Post-Migration:**
Dexie will NOT be discarded. It will be refocused strictly as a **local offline cache and offline mutation staging queue**, while Convex acts as the authoritative cloud source of truth when online.

---

## 9. Every Offline Mutation

Managed in `js/offline_queue.js` and reconciled by `js/data/syncManager.js`:
1. `CREATE_SALE`: Queued when device is offline during checkout. Includes `client_tx_id`, items, cash drawer delta.
2. `CREATE_EXPENSE`: Staged offline expenses with temporary local IDs.
3. `ADD_CUSTOMER`: New customer records created offline.
4. `RECORD_CASH_TRANSACTION`: Offline cash drawer in/out adjustments.
5. `FORM_DRAFTS`: Unfinished modal inputs saved locally in `localDb.form_drafts`.

**Idempotency Protection:**
Replay of `CREATE_SALE` is guaranteed idempotent through `client_tx_id` checking on the server. If `client_tx_id` has already been recorded, Convex returns the existing sale record rather than creating a duplicate.

---

## 10. Every Security Check & Tenant Isolation

Authoritative RLS helpers in PostgreSQL to be migrated into Convex server functions:
- `is_sys_admin()`: Confirms caller is in `sys_admins` registry.
- `user_has_branch_access(branch_id)`: Confirms branch assignment or business ownership.
- `is_branch_manager(user_id)`: Validates branch management privileges.
- `get_current_tenant_id()`: Derives tenant owner ID from auth identity.
- `trg_enforce_branch_limit`: Blocks branch creation exceeding active SaaS plan quota (`max_branches`).
- `trg_protect_profile_subscription_fields`: Prevents normal clients from mutating their own subscription plan, expiry, or suspension status.
- `guard_stock_movements_integrity`: Prohibits UPDATE or DELETE on stock audit ledger.

All checks will be implemented in `convex/auth/` server-side authorization guards.

---

## 11. Every Dashboard & Financial Calculation

Key calculations verified in `js/owner/dashboard.js`, `js/branch/dashboard.js`, and `js/data/repositories/dashboardRepository.js`:
- **Daily Sales Total:** `SUM(amount)` where `created_at` matches today's date.
- **Gross Profit:** `SUM(amount - cost_amount)` across completed sales.
- **Stock Valuation:** `SUM(quantity * cost_price)` and `SUM(quantity * retail_price)`.
- **Expected Cash Balance:** `opening_balance + cash_sales + cash_in - cash_out`.
- **Remaining Loan Balances:** `principal_amount + interest - total_paid`.
- **Operating Margin:** `(total_gross_profit - total_expenses) / total_sales * 100`.

Convex query functions must use identical financial rounding algorithms (monetary units in cents or BigInt/Fixed-point decimals) to guarantee exact parity with PostgreSQL.

---

## 12. Tables Missing or Implicit in Current Written Schema

The audit discovered the following tables actively referenced in code that were only partially covered in legacy documentation:
1. `asset_maintenance_logs` (tracked in Dexie and DB adapter)
2. `sys_custom_roles` (enterprise RBAC permission matrices)
3. `loan_repayments` (granular repayment audit history)
4. `loyalty_transactions` (point issuance and redemption ledger)
5. `sys_ai_chat_messages` / `sys_ai_prompts` (in-app AI assistant configuration)
6. `sys_push_subscriptions` / `sys_push_templates` (WebPush device tokens)
7. `notification_reads` (user-specific notification receipt watermarks)

All 7 tables have been added to the Convex migration schema inventory.

---

## 13. Proposed Convex Architecture

```text
convex/
├── _generated/               # Convex generated code & type definitions
├── schema.ts                 # Full authoritative schema with types & indexes
│
├── auth/                     # Centralized server-side authorization
│   ├── identity.ts           # User resolution & session identity
│   ├── permissions.ts        # Role & capability checks
│   ├── tenant.ts             # Tenant isolation & ownership verification
│   ├── sysAdmin.ts           # SysAdmin global privileges
│   └── stepUp.ts             # 15-minute challenge verification
│
├── profiles.ts               # Tenant profile management & subscription limits
├── branches.ts               # Branch provisioning, limits, PIN management
├── staff.ts                  # Employee roster and role mapping
├── pricingPlans.ts           # SaaS plan specifications & quotas
├── saasAuditLogs.ts          # Subscription event ledger
│
├── centralInventory.ts       # Master enterprise catalog & bulk operations
├── inventory.ts              # Branch stock, isolation flags, threshold alerts
├── services.ts               # Non-physical service catalog
├── categories.ts             # Global & tenant category classification
├── stockMovements.ts         # Append-only immutable stock transaction ledger
├── stockTransfers.ts         # Multi-branch atomic transfers
│
├── sales.ts                  # POS checkout mutation, batch sales, idempotency
├── cashDrawer.ts             # Till session open/close & reconciliation
├── cashTransactions.ts       # Cash in/out & safe drops
├── quotations.ts             # Estimates and formal quotes
├── invoices.ts               # Billing invoices
│
├── customers.ts              # Customer directory, credit limits, balances
├── customerPayments.ts       # Debt repayments
├── loans.ts                  # Customer micro-credit
├── capitalAccounts.ts        # Financial accounts & petty cash
├── capitalTransactions.ts    # Account fund movements
├── businessAssets.ts         # Fixed assets & straight-line depreciation
├── businessLoans.ts          # Commercial borrowings & installments
├── expenses.ts               # Operating expenditures & receipt uploads
├── payroll.ts                # Staff salary disbursement cycles
│
├── messages.ts               # Realtime multi-tenant messaging
├── requests.ts               # Branch stock and expense requisitions
├── tasks.ts                  # Operational task manager & comment threads
├── notifications.ts          # In-app notification dispatcher
│
├── securityEvents.ts         # Audit logs for logins, rate limits, elevation
├── settings.ts               # System-wide app configuration & release tracking
├── adminModalMessages.ts     # SysAdmin broadcast popups & banner CTA tracking
├── pushNotifications.ts      # WebPush dispatch actions & token registry
├── surveys.ts                # In-app user feedback collection
├── supportSessions.ts        # Privileged admin support access
└── crons.ts                  # Automated background maintenance jobs
```

---

## 14. Migration Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| **ID Format Incompatibility** (Postgres UUID vs Convex Id) | High | Maintain `legacyId: v.optional(v.string())` on all Convex tables and build a bidirectional `migration_id_map`. |
| **Offline Sale Duplication** | Critical | Enforce strict uniqueness index on `clientTxId` in Convex and verify existence before committing `createSale`. |
| **Partial Stock Transfer Commit** | High | Wrap branch transfers in a single atomic Convex mutation. Partial commits are physically impossible in Convex. |
| **Financial Rounding Drift** | High | Execute comparative sum scripts (`migration/validation/verify_financial_totals.cjs`) asserting 0.00 difference. |
| **Premature Production Disruption** | Critical | Supabase remains active throughout. Zero destructive operations on Supabase during development. |

---

## 15. Data Migration Order (Dependency Graph)

Data will be extracted, transformed, and imported in strict foreign-key dependency order:

```text
Phase 1: Identity & Foundation
  1. auth_identities (User UIDs)
  2. sys_admins
  3. sys_pricing_plans
  4. profiles (Tenant owners)
  5. branches
  6. staff & sys_custom_roles
  7. categories

Phase 2: Product & Inventory Master
  8. central_inventory
  9. suppliers
  10. inventory (Branch items)
  11. services

Phase 3: Financial & Customer Directories
  12. customers
  13. capital_accounts
  14. business_assets
  15. business_loans

Phase 4: Operational History & POS
  16. expenses
  17. payroll
  18. cash_drawer
  19. sales (Batched in chunks of 500)
  20. cash_transactions
  21. customer_payments
  22. loans & loan_repayments
  23. stock_movements (Immutable replay)
  24. stock_transfers
  25. purchase_orders & po_items
  26. quotations & quotation_items

Phase 5: Messaging, Tasks & Admin Hub
  27. messages, chat_groups, group_members
  28. requests
  29. tasks & task_comments
  30. notifications
  31. announcements
  32. admin_modal_messages & user_seen_modal_messages
  33. sys_settings, sys_security_events, saas_audit_logs
```

---

## 16. Recommended Cutover Strategy

1. **Dual Run / Shadow Validation:** Deploy Convex backend alongside Supabase. Run validation suites comparing row counts and financial sums.
2. **Maintenance Freeze Window:** Announce a 30-minute low-traffic maintenance window. Freeze writes on Supabase.
3. **Delta Sync:** Extract and import records modified during the last 24 hours.
4. **Parity Check:** Automatically run `node migration/validation/run_all_parity_checks.cjs`. Must return 100% PASS.
5. **Frontend Switch:** Flip `VITE_BACKEND_PROVIDER=convex` in deployment configuration.
6. **Live Verification:** Execute test POS checkout, inventory transfer, and owner report generation.
7. **Rollback Availability:** Maintain Supabase in read-only standby mode for 30 days prior to retirement.

---

## Conclusion & Next Step

Phase 0 Discovery & Audit is complete. The application architecture, all 84 tables, 57 RPCs, 39 realtime subscriptions, and offline sync mechanics are thoroughly cataloged.

**Awaiting user authorization to proceed to Phase 1: Convex Schema & Backend Implementation.**
