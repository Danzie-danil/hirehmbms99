# Global Desktop "Go To" Navigator & Command Palette (Triggered via '/' Key & Top Nav)

## Overview
Introduce a global spotlight navigator / command palette on desktop triggered either by clicking the top nav "Go To" search bar or pressing the `/` shortcut key (as well as `Ctrl+K` / `Cmd+K`). The navigator provides instant, deeply scoped, role-aware navigation and quick-action triggers tailored specifically to the logged-in role (`owner`, `branch`, `sysadmin`).

---

## Key Capabilities & Scope

### 1. Top Navigation "Go To" Desktop Bar
- Pinned in the top header bar for desktop users (`hidden md:flex`).
- Displays a search bar trigger: Search icon, *"Go to page or action..."*, and a keyboard shortcut badge `<kbd>/</kbd>`.
- Responsive and unobtrusive, perfectly balanced next to existing system status and utility toggles.

### 2. Global Keyboard Listener (`/` and `Ctrl+K` / `Cmd+K`)
- Pressing `/` opens the command palette immediately.
- Built-in input safeguard: If the user is currently typing in an `<input>`, `<textarea>`, `<select>`, or content-editable element, the `/` keystroke behaves normally as text input.
- Pressing `Escape` or clicking outside dismisses the palette immediately.

### 3. Role-Aware Deep-Scope Navigation Index
- **Owner Role**:
  - *Main Pages*: Overview, Branches, Analytics, Central Inventory, Financial Reports, Capital & Balance Sheet, Fixed Assets, Liabilities & Loans, Approval Queue, Staff & HR, Suppliers & POs, Quotations, Stock Ledger, Payroll, Promotions, Goals & KPIs, Shift Schedule, Announcements, Audit Logs, Settings, Messages, Help & Support.
  - *Deep Sub-Actions*:
    - Add New Branch (switches to branches & triggers branch creation modal)
    - Billing & Subscriptions (opens Settings > Security & Billing tab)
    - Security & Password Reset (opens Settings > Security tab)
    - Backup Suite & Cloud Snapshot (triggers Backup Suite modal)
    - Add New Staff Member (switches to Staff & opens HR modal)
    - Create Quotation (switches to Quotations & opens creation flow)
    - Record Capital / Equity (switches to Capital & opens entry modal)
    - Add Fixed Asset (switches to Fixed Assets & opens asset form)
    - Add Business Loan / Debt (switches to Loans & opens liability form)
    - Create Discount / Promotion (switches to Promotions & opens modal)
    - Schedule New Shift (switches to Shifts)
    - Export Data / Full Business Archive (triggers full business report export)
- **Branch / Cashier Role**:
  - *Main Pages*: Dashboard, Sales / POS, Expenses, Inventory, Customers, Staff, Suppliers, Cash Drawer, Shifts, Returns, Quotations, Loyalty, Tasks, Notes, Announcements, Requests, Settings.
  - *Deep Sub-Actions*:
    - New Sale / POS Checkout (switches to Sales)
    - Record Expense (switches to Expenses & opens Add Expense form)
    - Register New Customer (switches to Customers & opens Add Customer form)
    - Add New Inventory Item / Scan (switches to Inventory)
    - Transfer Stock / Restock Request (switches to Requests)
    - Cash Drawer Reconciliation / Shift Summary (switches to Cash Drawer)
- **SysAdmin Role**:
  - *All Admin Modules*: Dashboard, Site Controls, User Maintenance, Support Tickets, Communications Hub, Feedback & Surveys, Security & Lockout, Revenue Analytics, Tenant Health, Feature Flags, Compliance Vault, Pricing & Plans, Audit Logs.

### 4. Interactive Spotlight Interface
- Search input with real-time fuzzy/keyword filtering.
- Grouped sections: *Core Pages*, *Quick Actions & Create*, *System & Settings*.
- Keyboard navigation with `Up` / `Down` arrow keys, `Enter` to execute, and hover selection.
- High-contrast visual cues with Lucide icons, role badges, and clean dark/light mode styling.

---

## File Changes & Architecture
1. **[NEW] `js/ui/globalNavigator.js`**:
   - Houses the command palette state, search index generator based on current role & permissions, keyboard event listeners, rendering loop, and action dispatchers.
2. **[MODIFY] `app/index.html`**:
   - Add the desktop "Go To" search trigger button in the top navigation `<header>`.
3. **[MODIFY] `js/app.js`**:
   - Initialize `initGlobalNavigator()` upon user authentication / role resolution.

---

## Verification Plan
- Test pressing `/` on dashboard -> opens Go To modal.
- Test pressing `/` while typing in a text field -> types `/` without opening modal.
- Test searching keywords e.g. "branch", "billing", "loan", "sale", "password", "pdf".
- Test executing a deep action (e.g. Add Branch or Billing) -> navigates and opens targeted modal.
- Verify role isolation: Owner items never appear for Cashier/Branch, and Sysadmin items only appear for Sysadmin.
- Run `npm run build` to verify 0 errors.
