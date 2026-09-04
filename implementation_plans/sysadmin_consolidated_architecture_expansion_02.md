# BMS System Administrator — Consolidated Architecture & Feature Expansion Plan

## Executive Summary
This architectural plan establishes a modular, deep, and scalable control plane for the **BMS System Administrator** across its **13 canonical navigation modules**. In strict accordance with the primary architectural rule, **no new top-level sidebar modules will be introduced**. Instead, each domain will be deepened through consistent secondary sub-navigation tabs, segmented controls, contextual detail drawers, forensic inspectors, and modal dialogs.

---

## Architectural Principles & Boundaries

1. **Zero Sidebar Sprawl:** The 13 established top-level sidebar items remain constant. Every new feature is routed into its natural domain owner.
2. **Strict Workspace Isolation:** No owner (`js/owner/*`) or branch (`js/branch/*`) files, layouts, or stylesheets will be altered.
3. **Strict Server-Side RPC Architecture & Supabase Auth:**
   - The frontend NEVER contains elevated business logic or raw database operations.
   - All data fetching, diagnostic runs, mutations, and inspections are delegated to `SECURITY DEFINER` RPC functions in Supabase that strictly enforce `is_sys_admin()`.
   - The frontend acts strictly as a secure client caller via `supabase.rpc()`.
4. **Mobile-First & Desktop Layout Accessibility:**
   - Touch targets >= 44x44px across all controls.
   - Horizontal scrolling sub-tabs with `no-scrollbar overflow-x-auto whitespace-nowrap`.
   - Responsive multi-column grids (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`).
   - Overflow-safe data tables (`overflow-x-auto min-w-[640px]`).
5. **Defense-in-Depth Security:** The browser frontend is treated strictly as an untrusted presentation layer. All privileged actions, diagnostics, exports, and status modifications are guarded by:
   - Server-side PostgreSQL Row-Level Security (RLS).
   - `SECURITY DEFINER` RPCs enforcing `is_sys_admin()`.
   - Native AAL2 MFA & Step-Up Reauthentication (`sys_step_up_sessions`).
   - Proxy-safe client IP resolution (`extract_trusted_client_ip()`).
   - Append-only immutable audit logging (`sys_audit_logs`).
4. **Performance & Scalability:** Server-side pagination, database index utilization, query limits, debounced search filters, and targeted real-time subscriptions prevent full-table client dumping.

---

## 13-Module Architecture & Feature Placement Matrix

```text
SYSTEM ADMIN PORTAL (13 Primary Domains)
├── 1. Dashboard (sysadmin-dashboard)
│   ├── [Tab: Overview] High-Level KPIs & Trendlines
│   ├── [Tab: Health Summary] Aggregated DB, Auth, Realtime, Storage & Function status
│   ├── [Tab: Active Incident & Alert Stream] Live critical system warnings
│   └── [Tab: Recent Audit Activity] Latest administrative mutations
│
├── 2. Site Controls (sysadmin-controls)
│   ├── [Tab: Global Switches] Registration, Maintenance Mode, AI Assistants
│   ├── [Tab: Announcements] Top-bar persistent banners & dismissals
│   ├── [Tab: Instant Broadcasts] Live WebSocket popups / urgent toasts
│   ├── [Tab: Scheduled Alerts] Time-delayed announcement pipeline
│   ├── [Tab: Platform Config] Storage, Email, AI & Realtime parameters
│   ├── [Tab: Quotas & Rate Limits] Global tenant rate limits and request ceilings
│   └── [Tab: Alert Rules Engine] Latency, login failure, and error threshold alerts
│
├── 3. User Maintenance (sysadmin-users)
│   ├── [Tab: Businesses] Searchable tenant registry with status toggles
│   ├── [Tab: Users & Owners] Unified platform user ledger
│   ├── [Tab: Branch Fleet] Global branch network mapping
│   ├── [Tab: Tenant 360°] Deep single-tenant inspection (Identity, Ops, Billing, Security, Support, Sync)
│   └── [Tab: Privileged Support Access] Audited, step-up-verified temporary impersonation session
│
├── 4. Newsletters (sysadmin-newsletter)
│   ├── [Tab: Campaign Composer] Rich email editor with CTA and banner attachments
│   ├── [Tab: Drafts & Templates] Saved broadcast communication assets
│   ├── [Tab: Campaign Analytics] Open rates, delivery counts, bounce statistics
│   └── [Tab: Audience Segmentation] Tenant tier, activity, and registration date filters
│
├── 5. Support Tickets (sysadmin-tickets)
│   ├── [Tab: Ticket Queue] Status filtering (New / In Progress / Resolved / Archived)
│   ├── [Tab: Platform Incidents] Severity matrix (P1–P4), status workflow, incident timeline
│   └── [Tab: Tenant Error Diagnostics] Realtime error log triage per tenant
│
├── 6. Communications (sysadmin-communications)
│   ├── [Tab: Broadcast Center] Centralized dispatch metrics (Delivered, Active, Seen)
│   ├── [Tab: Historical Ledger] Immutable audit of all platform broadcasts
│   ├── [Tab: Automated Triggers] Event-driven lifecycle notifications
│   └── [Tab: Communication Analytics] Delivery breakdown and failure analysis
│
├── 7. Security & Lockout (sysadmin-security)
│   ├── [Tab: Threat Detection] Brute-force logins, IP anomalies, rate-limit trips
│   ├── [Tab: Active Sessions] Platform-wide session inspector with instant revoke
│   ├── [Tab: Admin Access & RBAC] SysAdmin role matrix and granular permissions
│   ├── [Tab: Security Posture] RLS table audit, SECURITY DEFINER inspector, public RPC check
│   └── [Tab: Security Diagnostics] Interactive automated security tests suite
│
├── 8. Revenue Analytics (sysadmin-revenue)
│   ├── [Tab: Financial Overview] MRR, ARR, ARPU, Lifetime Value metrics
│   ├── [Tab: Subscriptions] Tier distribution (Starter, Enterprise, Exclusive)
│   ├── [Tab: Billing & Transactions] Payment logs, refunds, and adjustments
│   ├── [Tab: Churn & Retention] Cohort retention (7-day, 30-day, 90-day) and trial conversions
│   └── [Tab: Tenant Intelligence] Top-performing businesses by GMV and transaction volume
│
├── 9. Infrastructure & Operations (sysadmin-health)
│   ├── [Tab: Platform Health] DB connection pool, Realtime channel health, Edge latency
│   ├── [Tab: Tenant Ping Diagnostics] Multi-tenant connectivity and sync latency test
│   ├── [Tab: Interactive Diagnostics Suite] Safe automated component tests (Pass/Warn/Fail)
│   ├── [Tab: Background Jobs Engine] Async queue monitoring (Email, Sync, Backups) with safe retry
│   └── [Tab: Storage & Asset Metrics] Bucket utilization, file distribution, orphaned file audit
│
├── 10. Feature Flags (sysadmin-flags)
│   ├── [Tab: Global Toggles] Platform-wide feature rollout switches
│   ├── [Tab: Tenant Overrides] Beta access and custom feature permissions per business
│   ├── [Tab: Gradual Rollouts] Percentage-based phased deployments
│   └── [Tab: AI Governance] LLM model enablement, temperature/token limits, tier quotas
│
├── 11. Compliance Vault (sysadmin-vault)
│   ├── [Tab: Data Retention Policies] Archival schedules and automated retention rules
│   ├── [Tab: Audited Data Exports] Secure tenant and financial data reporting
│   ├── [Tab: Account Purge & GDPR] Cryptographically safe tenant wiping workflow
│   ├── [Tab: Backup Status] Snapshot verification and disaster recovery verification
│   └── [Tab: Migration Ledger] Read-only audit of applied database schema migrations
│
├── 12. Pricing & Plans (sysadmin-pricing)
│   ├── [Tab: Plan Matrix] Pricing configuration for Starter, Enterprise, Exclusive
│   ├── [Tab: Entitlements & Quotas] Branch limits, user caps, storage ceilings, AI tokens
│   ├── [Tab: Discounts & Promo Rules] Subscription coupon and discount engine
│   └── [Tab: Subscription Rules] Grace periods, renewal behavior, auto-lock policies
│
└── 13. Audit Logs (sysadmin-audit)
    ├── [Tab: Master Stream] Comprehensive append-only administrative event log
    ├── [Tab: Category Filters] Admin, Security, Financial, Config, Data Purge, Exports
    └── [Forensic Inspector] JSON mutation payload viewer with timestamp and proxy-verified IP
```

---

## Detailed Component Specifications

### 1. Unified Sub-Navigation Architecture
Each of the 13 modules will render a standardized, accessible, and responsive secondary sub-navigation tab bar at the top of its view container:
```html
<div class="flex items-center gap-1.5 p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-2xl overflow-x-auto no-scrollbar border border-gray-200/50 dark:border-gray-700/50">
    <button class="subnav-tab active px-4 py-2 rounded-xl text-xs font-bold transition-all ...">Overview</button>
    <button class="subnav-tab px-4 py-2 rounded-xl text-xs font-medium text-gray-500 hover:text-gray-900 transition-all ...">Configuration</button>
</div>
```

### 2. Tenant 360° Deep Inspection Engine (`sysadmin-users`)
Clicking any tenant row will open the **Tenant 360° Drawer / Modal**, consolidating 6 key vectors:
- **Identity:** Legal business name, owner email/phone, tenant UUID, registration timestamp, account state.
- **Operations:** Branch fleet breakdown, active staff counts, last 24h transaction volume, central inventory size.
- **Subscription:** Current plan tier, trial validity, invoice ledger, quota utilization.
- **Security:** Failed login history, active browser sessions, lockout status.
- **Support:** Past ticket history and open incident logs.
- **Infrastructure:** Real-time sync connection status, sync errors, and offline queuing state.

### 3. Privileged Support Access Engine
- Initiated exclusively via Step-Up Reauthentication (`promptStepUpReauth()`).
- Requires a mandatory justification text field.
- Creates a time-bounded support token in `sys_step_up_sessions` with 30-minute auto-expiry.
- Injects a high-visibility, persistent red support banner across the top of the application:
  `SUPPORT SESSION ACTIVE | Admin: [Name] | Tenant: [Business] | Expires in: 28m | [End Session]`.
- Immutably records `SUPPORT_SESSION_START` and `SUPPORT_SESSION_END` in `sys_audit_logs`.

### 4. Global Admin Search Palette (`Ctrl+K`)
Integrated into the top navigation bar of the admin layout:
- Instant client-debounced search querying `businesses`, `profiles`, `tickets`, `incidents`, and `audit_logs`.
- Grouped results with direct routing to the exact sub-tab or modal.

### 5. Automated Platform Diagnostics Engine (`sysadmin-health`)
A one-click safe diagnostic runner testing:
- Database connectivity & pool latency.
- RLS policy integrity and unauthorized tenant access prevention.
- Privileged RPC execution boundaries.
- WebSocket realtime heartbeat responsiveness.
- Storage bucket read/write permissions.
- Email delivery gateway connectivity.

---

## Database Migration & Backend Schema Extensions (`0018_sysadmin_feature_expansion.sql`)

To support these enterprise capabilities safely, an idempotent SQL migration file will be prepared with the following schemas and RLS protections:

1. `sys_incidents`: Platform incident tracking table (P1–P4 severity, root cause, timeline).
2. `sys_alert_rules`: Deterministic operational alert conditions (latency, errors, failed auth thresholds).
3. `sys_feature_overrides`: Granular tenant-specific and tier-specific feature overrides.
4. `sys_background_jobs`: Operational queue ledger for tracking and retrying async jobs.
5. `sys_plan_entitlements`: Quotas and capability limits per subscription tier.
6. `sys_support_sessions`: Active and historical privileged support access logs.
7. RPC Functions:
   - `get_tenant_360_details(p_owner_id UUID)`
   - `run_platform_health_diagnostics()`
   - `start_privileged_support_session(p_tenant_id UUID, p_reason TEXT)`
   - `end_privileged_support_session(p_session_id UUID)`

---

## Phased Implementation Roadmap

### Phase 1: Database Migration & Schema Foundations
- Author and validate `supabase/migrations/0018_sysadmin_feature_expansion.sql`.
- Establish RLS policies restricting write/delete operations exclusively to `is_sys_admin()`.

### Phase 2: Core Sub-Navigation Framework & Dashboard Polish
- Implement `renderAdminSubnav(activeTab, tabs, onTabChange)` helper in `js/admin/dashboard.js`.
- Update `renderDashboard()` with the 4 core sub-tabs (Executive Overview, Health Summary, Alerts Stream, Recent Activity).

### Phase 3: High-Priority Operational Domains
- Expand `renderSiteControls()` with 7 dedicated sub-sections (Global Controls, Banners, Instant Toasts, Scheduled Alerts, Platform Config, Quotas, Alert Rules).
- Expand `renderUserMaintenance()` with Tenant 360° modal and Privileged Support Access flow.
- Expand `renderSupportTickets()` to include Platform Incident Management (P1–P4).

### Phase 4: Security Operations & Infrastructure Diagnostics
- Expand `renderSecurityLockoutManager()` with Threat Stream, Session Revocation, and Security Posture Inspector.
- Expand `renderTenantHealth()` into **Infrastructure & Operations** (`sysadmin-health`) with Interactive Diagnostics Suite and Background Job monitor.

### Phase 5: Business Intelligence, Governance & Global Search
- Expand `renderRevenueAnalytics()` with Churn & Cohort Retention analytics.
- Expand `renderComplianceVault()` with Audited Data Exports and Migration History viewer.
- Expand `renderPricingPlans()` with Entitlement Limits and Rule Engines.
- Implement Global Admin Search Palette (`Ctrl+K`).

---

## Verification & Quality Assurance Plan

### 1. Automated Build & Linter Check
- Run `npm run build` after each phase to ensure 0 module errors and strict type safety.

### 2. Tenant Isolation & Security Boundary Testing
- Verify that non-admin authenticated users (`owner`, `branch_manager`, `cashier`, `anon`) receive `Access denied: System Administrator only` for all new RPCs and tables.
- Confirm that privileged support sessions trigger step-up MFA and append immutable audit records to `sys_audit_logs`.

### 3. Responsive Design Verification
- Verify sub-navigation bar scrolling and touch targets on mobile (375px–430px) and wide desktop screens (1080p, 1440p).
- Confirm zero regression on Owner and Branch interfaces.
