# Implementation Plan - Admin Features Comprehensive Review, Improvements & Additions

A thorough architectural review of both **Sysadmin (Platform Admin)** and **Owner (Business Admin)** feature suites in BMSTz. This document outlines current capabilities, identified friction points, proposed high-impact improvements to existing modules, and 5 brand-new, enterprise-grade administrative features to elevate platform control, security, and operational efficiency.

---

## User Review & Security Directives

> [!IMPORTANT]
> **Admin Security & Code Isolation Guard (User Directive)**: All Sysadmin features, including the Read-Only Tenant Impersonation & Session Inspector, MUST NOT expose markup, secret switches, or access controls in static frontend HTML (`index.html` / `app/index.html`). All sysadmin code must be strictly isolated in separate ES modules (`js/admin/impersonation.js`, `js/admin/watchdog.js`) and compiled by Vite into code-split production chunks (`dist/assets/`) loaded ONLY upon runtime role verification (`state.profile.role === 'sysadmin'`).

> [!IMPORTANT]
> **Admin Release Notes Rule Compliance**: In accordance with workspace rules, all administrative, sysadmin, and internal backend enhancements will NOT expose admin keywords in user-facing release notes (`release_notes.json`). They will be framed as general system fixes, stability enhancements, and performance optimizations.

---

## 1. Current Admin Architecture Overview

BMSTz has two distinct administrative tiers:
1. **Sysadmin (Platform Level)**: Governs tenant lifecycle, site controls, global push notifications, system banners, pricing plans, audit logs, feature flags, compliance vault, and tenant health monitoring.
2. **Owner (Business Level Admin)**: Governs multi-branch operations, staff PINs & roles, central warehouse stock, billing & subscriptions, custom branding, audit security, and financial reporting.

---

## 2. Identified Bottlenecks & High-Impact Improvements to Existing Modules

### A. Sysadmin Tenant Health Monitor (`sysadmin-health`)
- **Current State**: Static lists of active/inactive tenants and transaction counts.
- **Improvement**:
  - **At-Risk & Failsafe Tenant Detector**: 
    1. Flag tenants with 0 transactions in 7+ days or tenants exceeding 90% of their branch allocation.
    2. **AI Assistant 3-Day Security Lockout Integrator**: Include real-time badges for accounts flagged/locked out by the AI security failsafe (3-day lockouts).
  - Real-time DB storage estimate & table row counts per tenant.

### B. Sysadmin Support Ticket Desk (`sysadmin-tickets`)
- **Current State**: Basic ticket status tracking (`open`, `in_progress`, `resolved`).
- **Improvement**: 
  - Add SLA Priority Indicators (`Low`, `Normal`, `High`, `CRITICAL`).
  - Add Canned Quick-Replies (standard responses for common billing/setup questions).
  - Auto-trigger Push Notification & System Banner to tenant when Admin resolves or replies to their ticket.

### C. Sysadmin Audit Log Engine (`sysadmin-audit`)
- **Current State**: Flat list of recent audit entries.
- **Improvement**:
  - Add severity color tags (`INFO`, `WARN`, `CRITICAL_SECURITY`).
  - Filter by Date Range, Actor Role, and Action Category.
  - 1-click **Export Logs (CSV/JSON)** for compliance.

### D. Owner Staff & Security Controls (`js/owner/staff.js`, `js/owner/security.js`)
- **Current State**: Rigid role definitions (Owner, Manager, Cashier, Auditor).
- **Improvement**:
  - Add active session management: View all logged-in devices with IP address & device type, with a **Force Remote Logout** action.
  - Add PIN Security Policy (Enforce 6-digit PINs, auto-lock after 3 failed attempts).

---

## 3. Proposed 5 Brand-New Admin Features

### 🌟 Feature 1: Read-Only Tenant Impersonation & Session Inspector (Sysadmin Level - Code Split & Secured)
- **Goal**: Allow Sysadmins to inspect a tenant's exact dashboard view in read-only mode to diagnose user support issues instantly without asking for passwords.
- **Security & Code Bundling Architecture**:
  - ZERO static HTML footprint.
  - Dynamically imported module (`js/admin/impersonation.js`) bundled by Vite into production chunk files.
  - Prominent Read-Only Mode Banner (`SYSADMIN SUPPORT MODE (READ-ONLY)`).
  - All write/delete/mutate buttons automatically disabled during impersonation.
  - Full audit logging: Logs start time, sysadmin ID, target tenant ID, and session end time in `sys_audit_logs`.

### 🌟 Feature 2: Granular Custom Role & Permission Matrix Builder (Owner Level)
- **Goal**: Enable Owners to create custom business roles (e.g., "Senior Cashier", "Inventory Supervisor", "Accountant") with fine-grained permission checkboxes.
- **Permission Toggles**:
  - `can_view_cost_prices`
  - `can_apply_custom_discounts`
  - `can_approve_product_returns`
  - `can_edit_inventory_stock`
  - `can_export_financial_reports`
  - `can_manage_suppliers`

### 🌟 Feature 3: Platform Performance & Sync Watchdog (Sysadmin Level)
- **Goal**: Real-time diagnostic dashboard tracking Supabase REST API latencies, offline sync payload backlog across all tenants, and failing sync payloads.
- **Key Capabilities**:
  - Live metric widgets: API Response Time (ms), Failed Offline Payload Count, Active WebSockets Count.
  - 1-click **Reprocess Stuck Offline Payloads** & **Clear Corrupted Sync Buffer**.

### 🌟 Feature 4: Automated Retention & Trial Conversion Engine (Sysadmin Level)
- **Goal**: Increase platform conversion and reduce churn with automated lifecycle notifications.
- **Key Capabilities**:
  - Automated triggers for:
    1. **Trial Expiring in 3 Days**: Send high-priority upgrade banner & email.
    2. **Inactive Account (14 Days)**: Trigger re-engagement email with helpful onboarding tips.
    3. **High-Growth Starter Tenant**: Suggest Enterprise plan upgrade when branch count = 3.

### 🌟 Feature 5: Bulk Data Backup & Disaster Recovery Suite (Owner & Sysadmin Level)
- **Goal**: 1-click complete data archiving for business continuity and regulatory compliance.
- **Key Capabilities**:
  - Generates a zip/JSON archive containing:
    - Complete Sales History (`sales`, `sales_items`)
    - Inventory Catalog & Cost History (`products`, `stock_movements`)
    - Customer Database & Loyalty Points (`customers`)
    - Expense & Profit/Loss Logs (`expenses`)
    - Audit Trail (`audit_logs`)
  - Encryption option with user-defined backup password.

---

## 4. Proposed File Changes & Implementation

### [Sysadmin Component]

#### [MODIFY] [dashboard.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/dashboard.js)
- Integrate Support Ticket SLA tags, At-Risk + 3-Day Lockout Tenant Alerts, and Audit Log export filters.

#### [NEW] [impersonation.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/impersonation.js)
- Implement Sysadmin Read-Only Tenant Impersonation & Session Inspector module (Dynamically imported, zero frontend HTML footprint).

#### [NEW] [watchdog.js](file:///d:/v2%20BMS%20OFFICIAL/js/admin/watchdog.js)
- Implement Platform Performance & Offline Sync Watchdog module.

---

### [Owner Component]

#### [MODIFY] [staff.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/staff.js)
- Upgrade staff view to integrate the Granular Custom Role & Permission Matrix Builder.

#### [NEW] [custom_roles.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/custom_roles.js)
- Implement custom role definition editor and entitlement validator.

#### [NEW] [backup_suite.js](file:///d:/v2%20BMS%20OFFICIAL/js/owner/backup_suite.js)
- Implement 1-click full business backup generator and JSON archive exporter.

---

## Verification Plan

### Automated Verification
- Run `npm run build` to verify 100% clean production compilation across all new admin modules.
- Validate zero lint or syntax errors.

### Manual Verification
- Test Sysadmin view switching for new Watchdog, Impersonation Guard, 3-day lockout alerts, and Ticket SLA controls.
- Verify zero static HTML trace of impersonation UI in `index.html` and `app/index.html`.
- Test Owner custom role builder and permission checks on branch manager and cashier accounts.
