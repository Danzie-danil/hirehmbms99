# BMSTz — COMPLETE SUPABASE → CONVEX MIGRATION INSTRUCTION

## ROLE

You are the senior backend/database migration engineer responsible for migrating the existing **BMSTz Multi-Tenant Business Management & POS System** from **Supabase/PostgreSQL** to **Convex**.

This is a production application.

You must treat the existing BMSTz application, its current Supabase database, its RLS policies, RPCs, triggers, realtime behavior, offline synchronization logic, authentication behavior, and existing business logic as authoritative.

The objective is:

> Migrate BMSTz from Supabase/PostgreSQL to Convex without losing data, functionality, security, multi-tenant isolation, transactional integrity, offline capabilities, or existing user-facing behavior.

DO NOT perform a simplistic table-for-table conversion.

DO NOT delete or modify the production Supabase database during development.

DO NOT replace working application functionality merely because Convex provides a different way of doing it.

DO NOT make assumptions where the existing source code or database does not provide enough information.

If something is unclear, inspect the actual codebase before deciding.

---

# 1. CURRENT BMSTz ARCHITECTURE

The existing system is a multi-tenant hierarchical business management and POS system.

The security hierarchy is:

```text
Global Cloud
│
├── SysAdmin
│     └── Global platform administration
│
├── Business Owner / Enterprise
│     │
│     ├── Branch 1
│     │     ├── Manager
│     │     └── Staff / Cashiers
│     │
│     ├── Branch 2
│     │     ├── Manager
│     │     └── Staff / Cashiers
│     │
│     └── Branch N
│
└── System-wide auditing / maintenance
```

The existing authorization model has three primary scopes:

```text
SYSADMIN
    ↓
GLOBAL ACCESS

OWNER
    ↓
OWN BUSINESS
    ↓
ALL OWNED BRANCHES

BRANCH
    ↓
ASSIGNED BRANCH ONLY
```

The existing system explicitly requires strict tenant isolation.

An owner must never see another owner's data.

A branch manager/staff member must never gain access to another branch merely by manipulating frontend state, query parameters, IDs, or local storage.

SysAdmin is the only global administrative scope.

The existing documentation states that authorization is server authoritative and must never rely on hardcoded frontend email checks.

Preserve this security philosophy in Convex.

---

# 2. IMPORTANT MIGRATION PRINCIPLE

Supabase currently performs several jobs simultaneously:

```text
Supabase
├── PostgreSQL database
├── Authentication
├── Row-Level Security
├── RPC / stored procedures
├── triggers
├── realtime CDC
├── storage
└── database-side integrity
```

Convex will replace the database/backend portions:

```text
Convex
├── Database
├── Queries
├── Mutations
├── Server-side authorization
├── Transactional business logic
├── Reactive queries
├── Scheduled functions
└── Convex file storage where appropriate
```

Authentication must be evaluated separately.

The existing application uses an authenticated identity model and must preserve user identity.

If Clerk is already the application's authentication provider, retain Clerk unless the codebase proves otherwise.

Do NOT migrate authentication merely for the sake of changing databases.

---

# 3. DO NOT START BY MODIFYING THE APPLICATION

Before writing migration code:

1. Inspect the entire repository.
2. Identify the React/Vite architecture.
3. Identify every Supabase import.
4. Identify every Supabase query.
5. Identify every Supabase mutation.
6. Identify every RPC call.
7. Identify every realtime subscription.
8. Identify every storage operation.
9. Identify every authentication operation.
10. Identify every IndexedDB/Dexie operation.
11. Identify the sync manager.
12. Identify every offline mutation.
13. Identify all dashboard/KPI calculations.
14. Identify all role/permission checks.
15. Identify all database IDs and foreign-key assumptions.
16. Identify all code that assumes PostgreSQL behavior.

Create:

```text
migration/
```

with:

```text
migration/
├── README.md
├── audit/
├── schema/
├── export/
├── transform/
├── import/
├── validation/
├── rollback/
├── reports/
└── scripts/
```

Do not put migration scripts randomly throughout the application.

---

# 4. REQUIRED BACKUP / SAFETY RULE

Before migration:

```text
SUPABASE PRODUCTION
        │
        ├── FULL BACKUP
        ├── DATA EXPORT
        ├── RLS EXPORT
        ├── FUNCTIONS EXPORT
        ├── TRIGGERS EXPORT
        ├── STORAGE METADATA
        └── AUTHENTICATION MAPPING
```

The original Supabase project must remain available as the rollback source.

NEVER:

```text
Convex migration
    ↓
delete Supabase
```

Instead:

```text
Supabase Production
        │
        │ read/export only
        ▼
Migration pipeline
        │
        ▼
Convex Development
        │
        ▼
Validation
        │
        ▼
Convex Production
```

Supabase should only be retired after successful production validation and a defined rollback period.

---

# 5. EXISTING IDENTITY MODEL

The current authentication model includes:

## auth.users

Fields include:

```text
id
email
encrypted_password
email_confirmed_at
raw_app_meta_data
raw_user_meta_data
created_at
updated_at
```

`auth.users.id` is the primary global identity UID.

The public profile model maps business owners to their authenticated user identity.

---

# 6. profiles

Current business-owner profile entity contains:

```text
id
email
full_name
business_name
avatar_url
logo_url
mobile_number
address
street_address
city
zip_code
tax_id
industry
brand_color
theme
language
preferred_language
timezone
currency
base_currency
plan
current_plan
billing_cycle
status
is_suspended
has_seen_tour
opted_out_trial
newsletter_subscribed
two_factor
pin_expiry_days
session_duration_hrs
default_target
receipt_text
operating_hours
invoice_settings
notifications
snippe_customer_id
snippe_subscription_id
trial_ends_at
subscription_expires_at
last_notif_check
updated_at
```

Preserve all meaningful fields.

Do not silently discard subscription, notification, invoice, branding, timezone, currency, or security settings.

---

# 7. sys_admins

Migrate the SysAdmin registry:

```text
email
user_id
mfa_enabled
created_at
added_by
```

SysAdmin authorization must remain server-side.

Do not implement:

```js
if (email === "admin@example.com")
```

or anything equivalent in the client.

SysAdmin authorization must be verified by Convex server functions.

---

# 8. sys_step_up_sessions

Migrate:

```text
id
user_id
action
verified_at
expires_at
ip_address
user_agent
```

The existing system supports temporary step-up authorization with approximately a 15-minute lifetime.

Preserve this behavior.

Critical actions must not be executable merely because the user is a SysAdmin.

Where step-up verification is required, require:

```text
authenticated user
        +
SysAdmin authorization
        +
valid step-up authorization
        +
unexpired challenge
```

---

# 9. STAFF

Migrate:

```text
id
owner_id
branch_id
full_name
email
phone
role
salary
status
created_at
updated_at
```

Preserve:

```text
Cashier
Sales Clerk
Inventory Manager
Staff
```

and existing employment states:

```text
active
on_leave
terminated
```

Branch assignments must remain tenant-isolated.

---

# 10. BRANCHES

Migrate the complete branch entity:

```text
id
owner_id
owner_email
name
branch_code
branch_reg_no
branch_tin
manager_id
manager
manager_email
email
phone
pin
pin_updated_at
location
address
avatar_url
currency
target
tax_rate
theme
status
has_seen_branch_tour
low_stock_notifications
opening_time
closing_time
invoice_settings
preferences
last_notif_check
created_at
```

Branch manager access must be verified server-side.

A user must not be able to simply provide:

```text
branch_id = another_branch
```

and gain access.

---

# 11. MULTI-TENANT MODEL IN CONVEX

Every tenant-sensitive entity must have an authoritative tenant relationship.

Use the equivalent of:

```text
ownerId
branchId
```

where appropriate.

Recommended conceptual model:

```text
User
 │
 ├── owner/business identity
 │
 └── branch membership
        │
        └── branch
```

For entities that belong to a business:

```text
ownerId
```

must identify the business owner/tenant.

For entities belonging to a branch:

```text
ownerId
branchId
```

must be available where needed.

Do not depend on the client to supply the correct owner ID.

Whenever possible, derive authorization from the authenticated identity and authoritative database relationships.

---

# 12. PRICING PLANS

Migrate:

```text
sys_pricing_plans
```

Fields:

```text
id
name
title
price_monthly
price_annual
max_branches
max_users
features
is_popular
created_at
```

Plan codes include:

```text
free_trial
pro
enterprise
exclusive
```

Branch creation limits must remain authoritative.

The client must never be able to bypass:

```text
max_branches
max_users
```

---

# 13. SAAS AUDIT LOGS

Migrate:

```text
saas_audit_logs
```

with:

```text
id
owner_id
event_type
previous_plan
new_plan
mrr_change
created_at
```

Preserve subscription-related auditing.

---

# 14. CENTRAL INVENTORY

Migrate:

```text
central_inventory
```

Fields:

```text
id
owner_id
name
sku
barcode
category
quantity
min_threshold
cost_price
price
retail_price
wholesale_price
item_type
deleted_at
created_at
updated_at
```

This represents the enterprise/master product repository.

Do not confuse this with branch inventory.

---

# 15. BRANCH INVENTORY

Migrate:

```text
inventory
```

Fields:

```text
id
branch_id
central_item_id
name
sku
barcode
category
quantity
min_threshold
cost_price
price
retail_price
wholesale_price
is_from_main_store
is_isolated
isolation_status
deleted_at
created_at
updated_at
```

Preserve the distinction between:

```text
central product
        ↓
branch inventory
```

and:

```text
branch-isolated product
```

Isolation states:

```text
none
pending
approved
```

---

# 16. SERVICES

Migrate:

```text
services
```

Fields:

```text
id
branch_id
owner_id
name
category
price
cost_price
is_active
created_at
updated_at
deleted_at
```

Services do not consume physical inventory.

---

# 17. CATEGORIES

Migrate:

```text
categories
```

Fields:

```text
id
owner_id
name
type
description
created_at
updated_at
```

Types:

```text
product
service
all
```

---

# 18. STOCK MOVEMENTS

This is an IMPORTANT audit table.

Migrate:

```text
stock_movements
```

Fields:

```text
id
owner_id
branch_id
inventory_id
movement_type
quantity
previous_quantity
new_quantity
reference_id
notes
created_at
```

Movement types:

```text
sale
purchase
transfer_in
transfer_out
adjustment
return
```

This table is intended to be immutable.

Therefore:

```text
CREATE = allowed
READ = authorized
UPDATE = NEVER
DELETE = NEVER
```

Implement this as a server-enforced rule.

Do not rely on UI restrictions.

---

# 19. STOCK TRANSFERS

Migrate:

```text
stock_transfers
```

Fields:

```text
id
owner_id
from_branch_id
to_branch_id
item_name
quantity
status
notes
requested_at
resolved_at
created_at
```

Existing status values:

```text
pending
approved
in_transit
received
rejected
```

Note that the existing source schema uses text IDs for:

```text
from_branch_id
to_branch_id
```

and `from_branch_id` can contain:

```text
central
```

Do not blindly convert this into a Convex branch reference without preserving the existing semantics.

If the application code confirms that these are truly branch IDs plus the special `central` value, model this safely as an explicit source type/reference.

---

# 20. SALES

Migrate:

```text
sales
```

Fields:

```text
id
branch_id
product_id
client_tx_id
customer
customer_name
items
quantity
amount
cost_amount
gross_profit
profit
payment
payment_method
price_type
item_type
item_name
created_at
```

Payment methods:

```text
cash
mobile_money
card
credit
split
```

Price types:

```text
retail
wholesale
```

Item types:

```text
product
service
mixed
```

The existing schema contains legacy aliases:

```text
customer
customer_name

payment
payment_method

gross_profit
profit
```

Do not blindly carry duplicate aliases forever.

FIRST inspect the application and determine which fields are actually still used.

During migration, preserve compatibility if necessary.

If the frontend still depends on both fields, retain both until the application has been safely refactored.

---

# 21. OFFLINE POS IDEMPOTENCY

`client_tx_id` is critical.

It exists to prevent duplicate sales when an offline transaction is replayed.

The Convex implementation MUST preserve idempotency.

Example conceptual flow:

```text
Offline device
      ↓
client_tx_id = UUID
      ↓
local pending transaction
      ↓
network returns
      ↓
Convex mutation
      ↓
check client_tx_id
      │
      ├── already processed → return existing sale
      │
      └── not processed → process transaction
```

A reconnecting device must NEVER create two sales from the same offline transaction.

This is a hard requirement.

---

# 22. CREATE SALE MUST BECOME A SERVER TRANSACTION

The existing:

```text
public.create_sale(...)
```

is not merely a CRUD insert.

It is the transactional POS checkout engine.

Its existing workflow is:

1. Validate authorization.
2. Validate branch permission.
3. Determine item type.
4. If product:

   * verify stock;
   * decrement stock atomically;
   * create stock movement.
5. If service:

   * do not touch inventory.
6. Calculate profit.
7. Synchronize legacy sales aliases where necessary.
8. Insert sale.
9. If cash:

   * update active cash drawer.
10. Return the created sale.

Reimplement this as a **single authoritative Convex mutation**.

Do NOT split the checkout into:

```text
frontend:
  decrement stock

frontend:
  create sale

frontend:
  update drawer
```

That would create race conditions.

Instead:

```text
Convex mutation:
    authorize
    ↓
    validate
    ↓
    verify idempotency
    ↓
    validate stock
    ↓
    update stock
    ↓
    create movement
    ↓
    create sale
    ↓
    update cash drawer
    ↓
    return result
```

---

# 23. STOCK TRANSFER TRANSACTION

The existing:

```text
transfer_branch_to_branch_stock(...)
```

is also transactional.

It currently:

1. Locks source inventory.
2. Checks available quantity.
3. Decrements source.
4. Searches destination inventory.
5. Updates destination if found.
6. Creates destination item if necessary.
7. Creates source transfer-out movement.
8. Creates destination transfer-in movement.
9. Marks transfer received.

Implement equivalent atomic behavior in Convex.

The system must not produce:

```text
source decreased
destination missing
```

or:

```text
destination increased
source not decreased
```

due to partial execution.

---

# 24. CASH DRAWER

Migrate:

```text
cash_drawer
```

Fields:

```text
id
branch_id
opening_balance
closing_balance
expected_balance
difference
status
opened_by
closed_by
opened_at
closed_at
notes
```

Statuses:

```text
open
closed
```

Expected balance is based on:

```text
opening balance
+
cash sales
+
cash in
-
cash out
```

Preserve drawer reconciliation.

---

# 25. CASH TRANSACTIONS

Migrate:

```text
cash_transactions
```

Fields:

```text
id
drawer_id
branch_id
type
amount
reason
performed_by
created_at
```

Types:

```text
cash_in
cash_out
drop
```

Cash operations must be authorized by branch access.

---

# 26. CUSTOMERS

Migrate:

```text
customers
```

Fields:

```text
id
branch_id
owner_id
name
phone
email
address
credit_limit
current_balance
loyalty_points
notes
status
created_at
```

Statuses:

```text
active
blacklisted
inactive
```

Preserve credit and loyalty information.

---

# 27. CUSTOMER PAYMENTS

Migrate:

```text
customer_payments
```

Fields:

```text
id
branch_id
owner_id
customer_id
document_id
amount
payment_method
reference_no
payment_date
notes
created_at
```

Methods:

```text
cash
bank
mobile_money
```

The existing schema references `documents`.

If the actual repository contains a `documents` implementation, inspect it and migrate it.

Do not invent a new document model without inspecting the existing code/database.

---

# 28. CUSTOMER LOANS

Migrate:

```text
loans
```

Fields:

```text
id
branch_id
owner_id
borrower_name
principal_amount
interest_rate
total_payable
total_paid
balance
status
start_date
due_date
notes
created_at
```

Statuses:

```text
active
cleared
defaulted
```

Preserve the existing calculations.

---

# 29. CAPITAL ACCOUNTS

Migrate:

```text
capital_accounts
```

Fields:

```text
id
owner_id
branch_id
account_name
account_type
balance
currency
account_number
bank_name
notes
created_at
updated_at
```

Types:

```text
bank
cash
mobile_money
petty_cash
```

Do not expose account data across tenants.

---

# 30. CAPITAL TRANSACTIONS

The RLS documentation references:

```text
capital_transactions
```

Inspect the actual database/code to determine its complete schema.

Do not invent columns.

Migrate it once its actual structure is confirmed.

Its existing access rule is owner/SysAdmin scoped.

---

# 31. BUSINESS ASSETS

Migrate:

```text
business_assets
```

Fields:

```text
id
owner_id
branch_id
asset_name
category
purchase_cost
purchase_date
salvage_value
useful_life_years
depreciation_method
current_book_value
status
serial_number
supplier_name
created_at
updated_at
```

Categories:

```text
vehicle
machinery
it_hardware
furniture
property
tools
```

Depreciation methods:

```text
straight_line
declining_balance
```

Statuses:

```text
active
under_maintenance
disposed
written_off
```

Preserve financial precision.

Do not convert financial numbers into floating-point arithmetic in a way that introduces monetary rounding errors.

---

# 32. BUSINESS LOANS

Migrate:

```text
business_loans
```

Fields:

```text
id
owner_id
lender_name
loan_type
principal_amount
interest_rate_annual
start_date
due_date
remaining_balance
monthly_installment
status
created_at
updated_at
```

Loan types:

```text
bank_loan
supplier_credit
owner_loan
```

Statuses:

```text
active
fully_paid
defaulted
```

---

# 33. EXPENSES

Migrate:

```text
expenses
```

Fields:

```text
id
branch_id
owner_id
category
amount
description
payment_method
receipt_url
expense_date
created_by
created_at
```

Preserve receipt attachment references.

Do not break existing receipt URLs during migration.

---

# 34. PAYROLL

Migrate:

```text
payroll
```

Fields:

```text
id
owner_id
branch_id
staff_id
staff_name
role
period
amount
status
paid_at
created_at
```

Statuses:

```text
paid
pending
processing
```

---

# 35. MESSAGES

Migrate:

```text
messages
```

Fields:

```text
id
sender_id
sender_name
sender_role
group_id
parent_id
branch_id
content
is_group
is_delivered
is_read
metadata
reactions
deleted_for
created_at
```

Roles:

```text
owner
branch
staff
sysadmin
```

Preserve:

* conversations
* group conversations
* threading
* read receipts
* delivery status
* reactions
* attachment metadata
* deleted-for-user behavior

Messaging is realtime functionality and should use Convex reactive queries/mutations rather than rebuilding a custom polling architecture unless the existing application requires something specific.

---

# 36. REQUESTS

Migrate:

```text
requests
```

Fields:

```text
id
owner_id
branch_id
subject
message
type
status
priority
admin_response
created_at
updated_at
```

Types:

```text
stock
expense
service
general
```

Statuses:

```text
pending
approved
rejected
```

Priorities:

```text
low
medium
urgent
```

---

# 37. SYSTEM SECURITY EVENTS

Migrate:

```text
sys_security_events
```

Fields:

```text
id
event_type
severity
user_id
owner_id
email
ip_address
metadata
created_at
```

Event types include:

```text
failed_login
mfa_challenge
rate_limit_exceeded
step_up_success
```

Severities:

```text
info
warning
critical
```

These records should be protected from normal tenant users.

---

# 38. SYSTEM SETTINGS

Migrate:

```text
sys_settings
```

Fields:

```text
key
value
updated_at
```

Examples:

```text
app_version
maintenance_mode
allow_signups
```

Only authorized system administration functions should be able to mutate these.

---

# 39. ADMIN MODAL MESSAGES

Migrate:

```text
admin_modal_messages
```

This is a SysAdmin broadcast system.

It contains concepts including:

```text
title
body
type
target_audience
CTA buttons
date ranges
active state
```

Types:

```text
announcement
feature
warning
urgent
```

Target audiences:

```text
all
owners
branches
```

Only SysAdmins can create/manage broadcasts.

Users can read only broadcasts applicable to them.

---

# 40. USER SEEN MODAL MESSAGES

Migrate:

```text
user_seen_modal_messages
```

The current system uses a uniqueness rule around:

```text
user_id
modal_message_id
```

to prevent the same modal from repeatedly appearing.

Preserve this behavior.

The user should be able to dismiss/acknowledge a modal and not repeatedly receive it.

---

# 41. RLS → CONVEX AUTHORIZATION

The current Supabase system uses these important authorization helpers:

```text
is_sys_admin()
user_has_branch_access(branch_id)
is_branch_manager(user_id)
get_current_tenant_id()
```

Reimplement their behavior in Convex server-side authorization utilities.

Create something conceptually similar to:

```text
convex/
├── auth/
│   ├── identity.ts
│   ├── permissions.ts
│   ├── tenant.ts
│   └── sysAdmin.ts
```

Possible internal helpers:

```text
getCurrentUser()
requireAuthenticated()
requireSysAdmin()
requireOwner()
requireBranchAccess(branchId)
requireOwnerOrSysAdmin()
requireBranchUserOrSysAdmin()
getCurrentTenantId()
requireStepUp(action)
```

Do not duplicate authorization logic in every function.

Centralize it.

---

# 42. CURRENT RLS RULES THAT MUST BE PRESERVED

The following behavior is authoritative.

## profiles

User can access their own profile.

SysAdmin can access profiles globally.

## sys_admins

Users can inspect only their own SysAdmin status.

Normal users cannot insert/update/delete SysAdmin records.

## branches

Allowed:

```text
owner
branch manager
sysadmin
```

## central_inventory

Allowed:

```text
owner
sysadmin
```

## inventory

Allowed:

```text
branch-access user
sysadmin
```

## services

Allowed:

```text
owner
branch-access user
sysadmin
```

## categories

Owner-controlled.

Branch users may have read access according to the existing manager relationship.

## sales

Allowed:

```text
branch-access user
sysadmin
```

## cash_drawer

Allowed:

```text
branch-access user
```

## cash_transactions

Allowed:

```text
branch-access user
```

## customers

Allowed:

```text
branch-access user
owner
sysadmin
```

## customer_payments

Branch scoped.

## capital_accounts

Owner/SysAdmin.

## capital_transactions

Owner/SysAdmin.

## business_assets

Owner/SysAdmin.

## business_loans

Owner/SysAdmin.

## expenses

Allowed:

```text
branch-access
owner
sysadmin
```

## payroll

Allowed:

```text
branch-access
owner
sysadmin
```

## stock_transfers

User must have access to the source or destination branch.

## stock_movements

Read access according to branch/owner/SysAdmin scope.

Mutation is prohibited.

## messages

Current RLS is permissive and application-level recipient filtering is used.

When migrating, improve this carefully so that recipient visibility is actually enforced server-side without breaking existing messaging behavior.

## requests

Branch/owner/SysAdmin scoped.

## tasks

Branch/SysAdmin scoped.

## admin_modal_messages

SysAdmin management.

Users only receive appropriate active broadcasts.

## user_seen_modal_messages

User can mutate their own seen records.

---

# 43. TRIGGERS MUST BECOME SERVER-SIDE LOGIC

The current system has important database triggers.

Do NOT simply discard them.

Convert their behavior to authoritative Convex mutations/functions.

---

# 44. SALES ALIAS SYNCHRONIZATION

Current trigger:

```text
trg_sync_sales_column_aliases
```

keeps:

```text
customer ↔ customer_name
payment ↔ payment_method
gross_profit ↔ profit
```

consistent.

Determine whether the aliases are still required by the frontend.

If required, preserve them.

If they can be removed, perform a controlled application refactor before deleting them.

Never break old data.

---

# 45. BRANCH LIMIT ENFORCEMENT

Current trigger:

```text
trg_enforce_branch_limit
```

checks:

```text
active subscription plan
        ↓
max_branches
        ↓
current active branch count
        ↓
allow/reject
```

This must become server-enforced Convex logic.

A malicious client must not be able to bypass it.

---

# 46. SUBSCRIPTION FIELD PROTECTION

Current trigger protects:

```text
plan
trial_ends_at
subscription_expires_at
is_suspended
```

A normal client must not be able to change these.

Only authorized server-side billing/SysAdmin logic may mutate them.

Never trust:

```text
client → update profile → plan = enterprise
```

---

# 47. STOCK MOVEMENT IMMUTABILITY

Current trigger prevents UPDATE/DELETE of stock movements.

Maintain:

```text
append-only ledger
```

If a correction is required:

```text
incorrect movement
       ↓
new compensating movement
```

Never silently rewrite history.

---

# 48. REALTIME MIGRATION

The current realtime publication includes:

```text
inventory
services
sales
branches
requests
messages
tasks
notifications
admin_modal_messages
capital_accounts
```

These were registered with realtime CDC.

Do not reproduce Supabase realtime subscriptions mechanically.

Instead, identify which UI components actually depend on live updates.

Use Convex reactive queries for those components.

Examples:

```text
Branch inventory changes
        ↓
Convex mutation
        ↓
reactive query invalidation/update
        ↓
Owner dashboard + branch dashboard
```

and:

```text
New message
        ↓
Convex mutation
        ↓
recipient query updates
        ↓
message appears
```

The user must not need to manually refresh the page to see legitimate realtime changes.

---

# 49. IMPORTANT: FIX THE OLD STALE-DATA ARCHITECTURE

The current application has an offline Dexie/IndexedDB layer.

Its schema includes:

```text
sales
inventory
services
categories
customers
cash_drawer
expenses
branches
capital_accounts
business_assets
business_loans
admin_modal_messages
user_seen_modal_messages
form_drafts
sync_queue
sync_metadata
```

The old architecture is:

```text
Supabase
    ↕
SyncManager
    ↕
IndexedDB
    ↕
React UI
```

The migration MUST NOT simply replace:

```text
Supabase
```

with:

```text
Convex
```

while keeping a poorly designed duplicate source of truth.

Redesign the synchronization architecture deliberately.

---

# 50. NEW OFFLINE ARCHITECTURE

Separate:

```text
SERVER SOURCE OF TRUTH
```

from:

```text
LOCAL OFFLINE CACHE
```

Convex should be authoritative when online.

Local storage should exist to support offline operation.

Do not allow random local mutations to silently become authoritative business records.

---

# 51. OFFLINE SALES

Offline POS must continue to work.

Conceptually:

```text
Cashier
   ↓
POS
   ↓
offline?
   ├── NO
   │    ↓
   │ Convex mutation
   │
   └── YES
        ↓
   local pending sale
        ↓
   client_tx_id
        ↓
   sync queue
        ↓
   network restored
        ↓
   Convex mutation
        ↓
   idempotency check
        ↓
   commit
```

The receipt should still be available to the cashier offline if the existing application supports offline printing.

---

# 52. OFFLINE SYNC QUEUE

The current sync queue includes:

```text
operation_id
operation_type
entity_type
entity_id
created_at
status
```

Preserve the concept.

Possible statuses:

```text
pending
processing
synced
failed
```

Do not allow permanent silent failures.

Failed operations must be observable and retryable.

---

# 53. SYNC METADATA

The current system stores:

```text
entity
last_synced_at
last_server_cursor
sync_status
```

Do not automatically retain the old cursor mechanism if Convex's reactive model makes it unnecessary.

Instead determine what local metadata is actually required.

---

# 54. FORM DRAFTS

Preserve:

```text
form_id
user_id
updated_at
```

for local form recovery.

Do not migrate form drafts as business database records unless the existing application actually syncs them to the server.

---

# 55. INDEXEDDB STRATEGY

Do NOT immediately remove Dexie.

First determine:

1. Which records must work offline.
2. Which records can be reactive Convex queries.
3. Which mutations must queue offline.
4. Which local records are only UI cache.
5. Which records are temporary.
6. Which records are drafts.
7. Which records must never be treated as authoritative locally.

Then redesign.

The goal is:

```text
Convex = authoritative server state
Dexie = offline cache/queue
React = UI state
```

not:

```text
Convex + Dexie = two competing databases
```

---

# 56. FINANCIAL DATA

Financial values must be handled safely.

Pay special attention to:

```text
amount
cost_amount
gross_profit
profit
balance
opening_balance
closing_balance
expected_balance
difference
principal_amount
total_payable
total_paid
purchase_cost
salvage_value
current_book_value
remaining_balance
monthly_installment
salary
```

Do not introduce floating-point rounding errors.

Inspect the existing application's numeric handling and preserve monetary precision.

---

# 57. STORAGE

Current buckets include:

```text
business_logos
receipt_attachments
exports
```

Current rules:

```text
business_logos
    public read
    authenticated write/update
    image files
    5 MB limit

receipt_attachments
    private
    images/PDF
    10 MB limit
    owner/branch scoped

exports
    private
    CSV/JSON/PDF
    50 MB limit
    owner/SysAdmin scoped
```

Determine whether each should move to:

```text
Convex Storage
```

or remain on another object-storage system.

Do not migrate files merely because they exist in Supabase.

Preserve existing URLs/references or create a controlled mapping.

---

# 58. CLOUDFLARE R2

The application already uses Cloudflare R2 for downloadable application files.

Do NOT move these into Convex unless there is a specific technical reason.

Keep:

```text
BMSTz.apk
BMSTz-Setup.msi
BMSTz-Setup.exe
```

on their existing download infrastructure.

The database migration must not break the application's download links.

---

# 59. MISSING / PARTIALLY DOCUMENTED TABLES

The schema document references entities such as:

```text
documents
tasks
notifications
capital_transactions
```

and possibly other implementation details.

Do not assume their schema.

Inspect:

```text
actual Supabase schema
actual application source
queries
hooks
API functions
RPC calls
```

and create a complete inventory.

The attached architecture specification is authoritative for documented behavior, but the actual repository must be used to resolve any schema elements that are referenced without full column definitions.

---

# 60. CONVEX PROJECT STRUCTURE

Create a clean backend architecture such as:

```text
convex/
├── schema.ts
│
├── auth/
│   ├── identity.ts
│   ├── permissions.ts
│   ├── tenant.ts
│   ├── sysAdmin.ts
│   └── stepUp.ts
│
├── profiles.ts
├── staff.ts
├── branches.ts
│
├── pricingPlans.ts
├── saasAuditLogs.ts
│
├── centralInventory.ts
├── inventory.ts
├── services.ts
├── categories.ts
├── stockMovements.ts
├── stockTransfers.ts
│
├── sales.ts
├── cashDrawer.ts
├── cashTransactions.ts
│
├── customers.ts
├── customerPayments.ts
├── loans.ts
│
├── capitalAccounts.ts
├── capitalTransactions.ts
├── businessAssets.ts
├── businessLoans.ts
├── expenses.ts
├── payroll.ts
│
├── messages.ts
├── requests.ts
├── tasks.ts
├── notifications.ts
│
├── securityEvents.ts
├── settings.ts
├── adminModalMessages.ts
├── userSeenModalMessages.ts
│
├── documents.ts
│
├── migrations/
│
└── crons.ts
```

Adjust names if the existing project has a better established naming convention.

---

# 61. SCHEMA DESIGN

Create a proper:

```text
convex/schema.ts
```

Do NOT simply paste the PostgreSQL schema into Convex.

Use Convex-native types and relationships.

Where appropriate, use:

```text
v.string()
v.number()
v.boolean()
v.optional(...)
v.id("tableName")
v.array(...)
v.object(...)
```

However, preserve the semantics of the existing data.

Do not introduce destructive normalization merely for elegance.

---

# 62. INDEXES

Design indexes around actual application queries.

At minimum investigate indexes for:

```text
ownerId
branchId
ownerId + branchId
SKU
barcode
clientTxId
customerId
createdAt
status
userId
groupId
drawerId
inventoryId
centralItemId
```

Do not create every possible index blindly.

Inspect actual queries and optimize around them.

---

# 63. QUERY DESIGN

Create dedicated server-side queries for:

```text
owner dashboard
branch dashboard
inventory
central inventory
sales
customers
expenses
cash drawer
capital accounts
assets
loans
payroll
messages
requests
notifications
tasks
reports
```

Queries must enforce authorization.

Never rely on:

```text
frontend filtering
```

for security.

---

# 64. DASHBOARD/KPI LOGIC

Identify every current dashboard calculation.

Do not accidentally change business calculations during migration.

Validate:

```text
daily sales
monthly sales
profit
gross profit
expenses
stock values
branch performance
cash balance
customer debt
loan balance
capital balances
payroll
```

against the existing system.

If calculations currently happen in Supabase RPCs, migrate their exact business semantics into Convex functions.

---

# 65. MIGRATION ORDER

Do not import data randomly.

Use dependency order.

Recommended:

```text
1. Authentication identity mapping
2. profiles
3. sys_admins
4. pricing plans
5. branches
6. staff
7. categories
8. central inventory
9. inventory
10. services
11. customers
12. capital accounts
13. business assets
14. business loans
15. expenses
16. payroll
17. sales
18. cash drawer
19. cash transactions
20. customer payments
21. loans
22. stock movements
23. stock transfers
24. capital transactions
25. messages
26. requests
27. tasks
28. notifications
29. modal messages
30. user seen messages
31. security events
32. settings
33. documents
34. any remaining tables
```

Modify the order if actual foreign-key/data dependencies require it.

---

# 66. ID MIGRATION STRATEGY

Do not blindly replace every UUID with a new random ID.

Create a migration mapping.

For example:

```text
migration_id_map
```

with conceptual mapping:

```text
entity_type
old_supabase_id
new_convex_id
```

Preserve old Supabase IDs where possible if doing so simplifies compatibility.

If Convex IDs must be used, maintain:

```text
legacySupabaseId
```

where useful.

Every relationship must be validated.

---

# 67. DATA TRANSFORMATION

Create transformation scripts.

Example:

```text
Supabase JSON/SQL
       ↓
normalization
       ↓
ID mapping
       ↓
field transformation
       ↓
validation
       ↓
Convex import
```

Do not modify production data during transformation.

Transform copies only.

---

# 68. LEGACY DATA

Never silently delete:

```text
legacy columns
legacy IDs
legacy aliases
legacy statuses
```

until application usage has been verified.

If a field is obsolete:

```text
mark as compatibility field
```

and remove it only during a separate controlled cleanup phase.

---

# 69. VALIDATION REQUIREMENTS

After import, compare Supabase and Convex.

For every table:

```text
Supabase row count
=
Convex row count
```

unless there is a documented transformation.

Generate:

```text
migration/reports/table-counts.json
migration/reports/table-counts.md
```

Also compare:

```text
NULL counts
IDs
relationships
timestamps
status distributions
financial totals
```

---

# 70. FINANCIAL VALIDATION

For sales:

```text
SUM(amount)
SUM(cost_amount)
SUM(gross_profit)
```

must match.

For expenses:

```text
SUM(amount)
```

must match.

For capital accounts:

```text
balances
```

must match.

For business loans:

```text
principal
remaining balance
```

must match.

For customer credit:

```text
current_balance
```

must match.

For stock:

```text
central quantity
branch quantity
```

must match.

Any difference must be reported.

Never silently "fix" differences.

---

# 71. RELATIONSHIP VALIDATION

Verify:

```text
staff → owner
staff → branch

branch → owner
branch → manager

inventory → branch
inventory → central item

sales → branch
sales → inventory/service

customer payment → customer
customer payment → document

cash transaction → drawer
cash drawer → branch

expense → branch
expense → owner

payroll → staff
payroll → branch

stock movement → inventory
stock transfer → source branch
stock transfer → destination branch
```

No orphan records should be introduced.

---

# 72. SECURITY TESTING

Create automated tests for:

## Test 1

Owner A attempts to read Owner B data.

Expected:

```text
DENIED
```

## Test 2

Branch A attempts to read Branch B inventory.

Expected:

```text
DENIED
```

## Test 3

Branch A attempts to create a sale for Branch B.

Expected:

```text
DENIED
```

## Test 4

Branch A submits another branch ID manually.

Expected:

```text
DENIED
```

## Test 5

Normal user attempts to mutate subscription plan.

Expected:

```text
DENIED
```

## Test 6

Normal user attempts to modify SysAdmin records.

Expected:

```text
DENIED
```

## Test 7

User attempts to update stock movement.

Expected:

```text
DENIED
```

## Test 8

Same `client_tx_id` submitted twice.

Expected:

```text
ONE SALE ONLY
```

## Test 9

Insufficient stock during checkout.

Expected:

```text
TRANSACTION REJECTED
NO PARTIAL MUTATION
```

## Test 10

Two simultaneous purchases attempt to consume the same limited stock.

Expected:

```text
NO NEGATIVE STOCK
NO DOUBLE ALLOCATION
```

---

# 73. REALTIME TESTING

Open multiple sessions:

```text
Owner browser
Branch A browser
Branch B browser
```

Test:

```text
sale created
stock changed
branch updated
message sent
request submitted
task changed
notification created
capital account changed
```

Verify appropriate clients update automatically.

Do not require page refresh.

Also verify that unauthorized clients do NOT receive data merely because a realtime event occurred.

---

# 74. OFFLINE TESTING

Test:

```text
Online
    ↓
load application
    ↓
disconnect network
    ↓
create sale
    ↓
print/show receipt
    ↓
close/reopen application
    ↓
restore network
    ↓
sync
```

Verify:

```text
sale appears exactly once
stock reconciles
cash drawer reconciles
stock movement exists
client_tx_id remains idempotent
```

---

# 75. HIBERNATION / SLEEP-WAKE TEST

The existing system specifically attempts to recover from:

```text
tab inactivity
device sleep
network reconnection
WebSocket/subscription interruption
```

Test:

```text
open application
wait/inactivate
modify data from another device
return to original device
```

The original device must eventually reflect the authoritative server state.

Do not resurrect the old stale-cache problem.

---

# 76. FRONTEND MIGRATION

After Convex backend functionality is proven:

Replace Supabase data access with Convex.

Search the entire project for:

```text
supabase
createClient
.from(
.rpc(
.channel(
.on(
.subscribe(
auth.
storage.
```

Create a migration checklist.

No production Supabase dependency should remain accidentally.

---

# 77. DO NOT MASS-REWRITE THE FRONTEND

Do not rewrite React components unnecessarily.

Prefer:

```text
old Supabase hook
        ↓
new Convex hook
```

while preserving:

```text
component API
UI
routing
styling
business workflows
```

unless a redesign is technically necessary.

---

# 78. AUTHENTICATION MIGRATION

Determine the current authentication provider from the actual application.

If Clerk is already authoritative:

```text
Clerk
  ↓
Convex identity
```

If Supabase Auth is still authoritative:

do NOT blindly delete it.

Create a controlled authentication migration plan.

Existing users must retain their identity and access.

Passwords must never be exported or exposed insecurely.

Do not attempt to extract plaintext passwords.

---

# 79. ENVIRONMENT SEPARATION

Create separate environments:

```text
development
staging
production
```

Never point development at production Convex data accidentally.

Use environment variables.

Never commit secrets.

Do not overwrite existing production keys.

---

# 80. SUPABASE SHOULD REMAIN AVAILABLE DURING MIGRATION

For the first migration phases:

```text
Supabase = production source of truth
Convex = migration/testing target
```

After successful testing:

```text
Convex = production
Supabase = rollback/archive
```

Only later:

```text
Supabase = retired
```

---

# 81. CUTOVER PLAN

Prepare a documented cutover procedure.

Example:

```text
1. Announce maintenance window
2. Stop writes temporarily if required
3. Perform final Supabase export
4. Import final delta into Convex
5. Validate row counts
6. Validate financial totals
7. Validate critical relationships
8. Validate user/tenant mappings
9. Enable Convex production
10. Deploy frontend
11. Test owner login
12. Test branch login
13. Test POS sale
14. Test inventory
15. Test realtime
16. Test reports
17. Test offline queue
18. Monitor
```

---

# 82. ROLLBACK PLAN

If anything critical fails:

```text
Convex
   ↓
disable production writes
   ↓
restore frontend/backend routing
   ↓
Supabase
   ↓
resume production
```

Do not improvise rollback.

Create:

```text
migration/rollback/ROLLBACK.md
```

with exact instructions.

---

# 83. REQUIRED MIGRATION DELIVERABLES

The agent must produce:

```text
convex/schema.ts

convex/auth/*
convex/*.ts

migration/schema/*
migration/export/*
migration/transform/*
migration/import/*
migration/validation/*
migration/reports/*
migration/rollback/*
```

and documentation:

```text
migration/README.md
migration/MIGRATION_PLAN.md
migration/DATA_MAPPING.md
migration/SECURITY_MAPPING.md
migration/OFFLINE_ARCHITECTURE.md
migration/CUTOVER.md
migration/ROLLBACK.md
```

---

# 84. REQUIRED DATA MAPPING DOCUMENT

Create a table like:

```text
Supabase Table
→ Convex Table
→ Transformation
→ ID Strategy
→ Authorization
→ Indexes
→ Migration Status
```

For example:

```text
profiles
→ profiles
→ minimal transformation
→ preserve legacy UUID mapping
→ owner/sysadmin
→ userId index
→ COMPLETE
```

Do this for every table.

---

# 85. REQUIRED RPC MAPPING

Create:

```text
migration/RPC_MAPPING.md
```

with:

```text
Supabase RPC
→ Convex mutation/query/action
→ Existing behavior
→ New implementation
→ Security requirements
→ Tests
```

At minimum:

```text
create_sale
transfer_branch_to_branch_stock
sys_create_step_up_challenge
sys_verify_step_up
check_rate_limit
```

---

# 86. REQUIRED TRIGGER MAPPING

Create:

```text
migration/TRIGGER_MAPPING.md
```

Map:

```text
trg_sync_sales_column_aliases
→ Convex sale mutation

trg_enforce_branch_limit
→ Convex branch creation mutation

trg_protect_profile_subscription_fields
→ protected profile mutation

guard_stock_movements_integrity
→ immutable mutation API
```

---

# 87. REQUIRED RLS MAPPING

Create:

```text
migration/RLS_MAPPING.md
```

For every existing RLS policy document:

```text
Supabase RLS rule
→ Convex authorization rule
→ affected query/mutation
→ test
```

Do not simply state "Convex handles auth."

Show exactly how every important existing security boundary is preserved.

---

# 88. REQUIRED OFFLINE MAPPING

Create:

```text
migration/OFFLINE_MAPPING.md
```

Map:

```text
Dexie store
→ new local purpose
→ Convex equivalent
→ retained/removed
→ offline behavior
```

For example:

```text
sales
→ offline POS queue/cache
→ Convex sales
→ RETAIN LOCAL CACHE
```

and:

```text
sync_queue
→ offline mutation queue
→ Convex mutations
→ RETAIN
```

---

# 89. NO FUNCTIONAL REGRESSIONS

The following must continue working:

```text
authentication
business profile
business settings
subscription plans
branch management
branch limits
staff management
inventory
central inventory
services
categories
sales
POS
cash drawer
cash transactions
customers
customer credit
customer payments
loans
capital accounts
capital transactions
business assets
business loans
expenses
payroll
stock movements
stock transfers
messages
requests
tasks
notifications
SysAdmin
security events
step-up authorization
admin broadcasts
offline mode
sync
realtime updates
reports
dashboard KPIs
file attachments
```

If any of these are not currently implemented in the repository despite appearing in the schema document, document that fact rather than inventing functionality.

---

# 90. IMPORTANT: PRESERVE USER EXPERIENCE

The migration is backend-focused.

Do not unnecessarily change:

```text
UI
navigation
routes
forms
buttons
dashboard layout
POS workflow
receipt design
branding
theme
language
```

The user should feel that BMSTz is the same application, only with a more reliable backend.

---

# 91. PERFORMANCE GOALS

The new architecture should reduce dependence on:

```text
manual refresh
polling
stale IndexedDB state
fragile realtime reconnect logic
large repeated queries
client-side security filtering
```

Use Convex's reactive query model appropriately.

Avoid loading entire tables when only a branch/tenant subset is required.

Use pagination for large historical datasets.

---

# 92. IMPORTANT: DO NOT OVER-NORMALIZE

Convex is not PostgreSQL.

Do not automatically normalize every JSON field into multiple tables.

For example:

```text
invoice_settings
notifications
preferences
metadata
reactions
```

may legitimately remain structured objects if the application accesses them as cohesive settings/data.

At the same time, do not put critical relational business data into arbitrary JSON merely because Convex permits it.

Use judgment based on actual application access patterns.

---

# 93. MIGRATION SCRIPT REQUIREMENTS

Migration scripts must be:

```text
repeatable
idempotent
logged
resumable
safe
```

If a migration stops at:

```text
table 17 / 40
```

it should be possible to resume without duplicating records.

---

# 94. MIGRATION LOGGING

Every migration should record:

```text
start time
end time
table
source rows
processed rows
successful rows
failed rows
skipped rows
errors
```

Produce a summary.

Example:

```text
TABLE              SOURCE   TARGET   STATUS
------------------------------------------------
profiles           125      125      PASS
branches           42       42       PASS
inventory          8,430    8,430    PASS
sales              91,220   91,220   PASS
...
```

---

# 95. DO NOT HIDE ERRORS

If:

```text
1,000 records
```

are expected and:

```text
998 imported
```

do not report:

```text
SUCCESS
```

Report:

```text
FAILED VALIDATION
```

and identify the missing two.

---

# 96. FINAL SECURITY AUDIT

Before production cutover, verify:

```text
[ ] owner isolation
[ ] branch isolation
[ ] SysAdmin isolation
[ ] subscription protection
[ ] step-up protection
[ ] immutable stock movements
[ ] sale idempotency
[ ] atomic stock deduction
[ ] atomic branch transfers
[ ] cash drawer integrity
[ ] offline queue security
[ ] storage permissions
[ ] attachment permissions
[ ] rate limiting
[ ] secrets
[ ] production environment variables
```

---

# 97. FINAL DATA AUDIT

Verify:

```text
[ ] all tenants
[ ] all owners
[ ] all branches
[ ] all staff
[ ] all products
[ ] all inventory
[ ] all services
[ ] all customers
[ ] all sales
[ ] all expenses
[ ] all payroll
[ ] all capital accounts
[ ] all assets
[ ] all loans
[ ] all payments
[ ] all stock movements
[ ] all stock transfers
[ ] all messages
[ ] all requests
[ ] all tasks
[ ] all notifications
[ ] all modal messages
[ ] all security events
```

---

# 98. FINAL ACCEPTANCE TEST

The migration is NOT complete until the following scenario passes:

```text
OWNER
  ↓
logs in
  ↓
sees correct business
  ↓
sees all own branches
  ↓
sees correct consolidated dashboard
  ↓
creates product
  ↓
assigns/replenishes branch stock
  ↓
BRANCH MANAGER
  ↓
logs in
  ↓
sees ONLY assigned branch
  ↓
opens POS
  ↓
makes sale
  ↓
stock decreases
  ↓
stock movement created
  ↓
cash drawer updates
  ↓
owner dashboard updates
  ↓
OWNER
  ↓
sees sale in realtime
  ↓
SECOND DEVICE
  ↓
also sees correct update
  ↓
DEVICE GOES OFFLINE
  ↓
cashier makes sale
  ↓
receipt works
  ↓
device reconnects
  ↓
sale syncs exactly once
  ↓
owner sees synced sale
```

Then test:

```text
BRANCH A
attempts Branch B access
        ↓
DENIED
```

Then:

```text
NORMAL USER
attempts subscription manipulation
        ↓
DENIED
```

Then:

```text
NORMAL USER
attempts stock movement modification
        ↓
DENIED
```

---

# 99. IMPORTANT DEVELOPMENT RULE

Do not say:

> "Migration complete"

until:

1. The Convex schema exists.
2. Data has been imported.
3. Relationships have been validated.
4. Authorization has been tested.
5. RPCs have been replaced.
6. Triggers have been replaced.
7. Realtime behavior has been replaced.
8. Offline behavior has been tested.
9. Financial totals match.
10. Frontend no longer depends on Supabase for migrated functionality.
11. Production cutover has been tested.
12. Rollback is documented.

---

# 100. FIRST TASK — DO NOT MIGRATE YET

Your FIRST job is an audit.

Do NOT immediately modify production.

Do NOT immediately import data.

Do NOT immediately rewrite the frontend.

Perform:

```text
PHASE 0 — DISCOVERY
```

Inspect:

```text
repository
Supabase usage
authentication
database queries
RPCs
realtime
storage
Dexie
IndexedDB
sync manager
dashboard calculations
roles
permissions
offline behavior
```

Then create:

```text
migration/AUDIT_REPORT.md
```

The report must contain:

```text
1. Current architecture
2. Every Supabase dependency
3. Every table used by frontend
4. Every RPC used
5. Every realtime subscription
6. Every storage operation
7. Every auth dependency
8. Every Dexie store
9. Every offline mutation
10. Every security check
11. Every dashboard calculation
12. Every table missing from the written schema
13. Proposed Convex architecture
14. Migration risks
15. Data migration order
16. Recommended cutover strategy
```

STOP after the audit if the project owner has not authorized actual migration.

Do not make destructive changes.

---

# 101. FINAL PRINCIPLE

The objective is NOT:

```text
Supabase tables → Convex tables
```

The objective is:

```text
CURRENT BMSTz BUSINESS SYSTEM
             ↓
UNDERSTAND
             ↓
PRESERVE BUSINESS RULES
             ↓
PRESERVE DATA
             ↓
PRESERVE SECURITY
             ↓
PRESERVE OFFLINE POS
             ↓
PRESERVE REALTIME BEHAVIOR
             ↓
REDESIGN BACKEND APPROPRIATELY
             ↓
CONVEX
             ↓
VALIDATE
             ↓
CUT OVER
```

Treat the migration as a **backend architecture migration**, not a database export/import.

The existing BMSTz application must continue behaving as the same product after migration.

No production data may be lost.

No tenant may gain access to another tenant.

No branch may gain access to another branch.

No sale may be duplicated.

No inventory transaction may become partially committed.

No financial totals may silently change.

No offline sale may disappear.

No critical audit history may become mutable.

No production secrets may be exposed.

No production Supabase data may be deleted until the migration has been independently validated and the rollback period has ended.

**Begin with PHASE 0 — DISCOVERY and produce the audit report before performing the migration.**
