import Dexie from 'dexie';
import { syncLogger } from '../utils/syncLogger.js';

/**
 * BMSTZ Persistent Local Database Engine (IndexedDB via Dexie)
 * Platform-independent, fast (< 15ms), schema-versioned local data store.
 * 
 * INDEXEDDB_ENABLED: Master toggle to enable/disable IndexedDB operations across the app.
 * When false, the database structure and schemas remain completely intact, but all reads/writes
 * safely bypass local IndexedDB, forcing the app to rely 100% on Supabase cloud operations.
 */
export const INDEXEDDB_ENABLED = true; // [STATE: ENABLED] IndexedDB active

function createMockQuery() {
    const mockQuery = {
        equals: () => mockQuery,
        above: () => mockQuery,
        below: () => mockQuery,
        between: () => mockQuery,
        anyOf: () => mockQuery,
        noneOf: () => mockQuery,
        startsWith: () => mockQuery,
        toArray: () => Promise.resolve([]),
        first: () => Promise.resolve(null),
        last: () => Promise.resolve(null),
        count: () => Promise.resolve(0),
        delete: () => Promise.resolve(0),
        modify: () => Promise.resolve(0),
        filter: () => mockQuery,
        limit: () => mockQuery,
        offset: () => mockQuery,
        reverse: () => mockQuery,
        sortBy: () => Promise.resolve([]),
    };
    return mockQuery;
}

function createMockTable(tableName) {
    return {
        name: tableName,
        get: () => Promise.resolve(null),
        put: () => Promise.resolve(),
        add: () => Promise.resolve(),
        update: () => Promise.resolve(0),
        delete: () => Promise.resolve(),
        bulkPut: () => Promise.resolve(),
        bulkAdd: () => Promise.resolve(),
        bulkDelete: () => Promise.resolve(),
        clear: () => Promise.resolve(),
        count: () => Promise.resolve(0),
        toArray: () => Promise.resolve([]),
        first: () => Promise.resolve(null),
        last: () => Promise.resolve(null),
        where: () => createMockQuery(),
        orderBy: () => createMockQuery(),
        filter: () => createMockQuery(),
        limit: () => createMockQuery(),
        offset: () => createMockQuery(),
    };
}

const rawLocalDb = new Dexie('BMSTZ_LocalDB');

export const localDb = new Proxy(rawLocalDb, {
    get(target, prop, receiver) {
        if (prop === 'INDEXEDDB_ENABLED' || prop === 'isEnabled') {
            return INDEXEDDB_ENABLED;
        }
        if (prop === 'raw' || prop === '_rawDb') {
            return target;
        }
        if (prop === 'version' || prop === 'stores') {
            return target[prop].bind(target);
        }
        if (!INDEXEDDB_ENABLED) {
            if (typeof prop === 'string') {
                if (prop === 'isOpen') return () => false;
                if (prop === 'open') return () => Promise.resolve();
                if (prop === 'close') return () => {};
                if (prop === 'delete') return () => Promise.resolve();
                if (prop === 'tables') return [];
                if (prop === 'table') return (name) => createMockTable(name);
                if (prop === 'transaction') return async (mode, tables, scope) => {
                    if (typeof scope === 'function') return scope();
                    return Promise.resolve();
                };
                // Table properties such as sync_queue, dashboard_snapshots, sales, inventory, etc.
                return createMockTable(prop);
            }
        }
        const val = Reflect.get(target, prop, receiver);
        if (typeof val === 'function') {
            return val.bind(target);
        }
        return val;
    }
});

// Schema Definition Version 1 (Initial release)
rawLocalDb.version(1).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, sync_status',
    inventory: 'id, branch_id, name, sku, updated_at',
    customers: 'id, branch_id, name, phone, updated_at',
    expenses: 'id, branch_id, category, created_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 3 (Comprehensive indexing for all entities across sysadmin, owner, and branch)
localDb.version(3).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, updated_at',
    customers: 'id, branch_id, name, phone, updated_at',
    expenses: 'id, branch_id, category, created_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at',
    central_inventory: 'id, owner_id, name, sku, category, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, updated_at',
    branches: 'id, owner_id, name, updated_at',
    suppliers: 'id, owner_id, enterprise_id, name, phone, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, updated_at',
    notes: 'id, branch_id, updated_at',
    loans: 'id, branch_id, customer_id, status, updated_at',
    requests: 'id, branch_id, owner_id, status, updated_at',
    documents: 'id, branch_id, type, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at',
    product_returns: 'id, branch_id, sale_id, created_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 4 (Optimized incremental sync indexing, delta cursors, and tombstone tracking)
localDb.version(4).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, updated_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, created_at, updated_at',
    customers: 'id, branch_id, name, phone, created_at, updated_at',
    expenses: 'id, branch_id, category, created_at, updated_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at, updated_at',
    central_inventory: 'id, owner_id, name, sku, category, created_at, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at, updated_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, created_at, updated_at',
    branches: 'id, owner_id, name, created_at, updated_at, status',
    suppliers: 'id, owner_id, enterprise_id, name, phone, created_at, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, created_at, updated_at',
    notes: 'id, branch_id, created_at, updated_at',
    loans: 'id, branch_id, customer_id, status, created_at, updated_at',
    requests: 'id, branch_id, owner_id, status, created_at, updated_at',
    documents: 'id, branch_id, type, created_at, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at, updated_at',
    product_returns: 'id, branch_id, sale_id, created_at, updated_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at, updated_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, last_server_cursor, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 5 (Complete offline indexing for capital, business loans, and enterprise assets)
localDb.version(5).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, updated_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, created_at, updated_at',
    customers: 'id, branch_id, name, phone, created_at, updated_at',
    expenses: 'id, branch_id, category, created_at, updated_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at, updated_at',
    central_inventory: 'id, owner_id, name, sku, category, created_at, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at, updated_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, created_at, updated_at',
    branches: 'id, owner_id, name, created_at, updated_at, status',
    suppliers: 'id, owner_id, enterprise_id, name, phone, created_at, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, created_at, updated_at',
    notes: 'id, branch_id, created_at, updated_at',
    loans: 'id, branch_id, customer_id, status, created_at, updated_at',
    business_loans: 'id, owner_id, lender_name, status, created_at, updated_at',
    capital_accounts: 'id, owner_id, account_name, account_type, created_at, updated_at',
    business_assets: 'id, owner_id, asset_name, category, created_at, updated_at',
    requests: 'id, branch_id, owner_id, status, created_at, updated_at',
    documents: 'id, branch_id, type, created_at, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at, updated_at',
    product_returns: 'id, branch_id, sale_id, created_at, updated_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at, updated_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, last_server_cursor, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 6 (Universal offline mirroring for attendance, shifts, payroll, promotions, goals, movements, maintenance, POs, and messages)
localDb.version(6).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, updated_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, created_at, updated_at',
    customers: 'id, branch_id, name, phone, created_at, updated_at',
    expenses: 'id, branch_id, category, created_at, updated_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at, updated_at',
    central_inventory: 'id, owner_id, name, sku, category, created_at, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at, updated_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, created_at, updated_at',
    branches: 'id, owner_id, name, created_at, updated_at, status',
    suppliers: 'id, owner_id, enterprise_id, name, phone, created_at, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, created_at, updated_at',
    notes: 'id, branch_id, created_at, updated_at',
    loans: 'id, branch_id, customer_id, status, created_at, updated_at',
    business_loans: 'id, owner_id, lender_name, status, created_at, updated_at',
    capital_accounts: 'id, owner_id, account_name, account_type, created_at, updated_at',
    business_assets: 'id, owner_id, asset_name, category, created_at, updated_at',
    asset_maintenance: 'id, asset_id, maintenance_date, created_at, updated_at',
    requests: 'id, branch_id, owner_id, status, created_at, updated_at',
    documents: 'id, branch_id, type, created_at, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at, updated_at',
    product_returns: 'id, branch_id, sale_id, created_at, updated_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at, updated_at',
    stock_movements: 'id, owner_id, branch_id, inventory_id, movement_type, created_at, updated_at',
    attendance: 'id, owner_id, branch_id, staff_id, date, status, created_at, updated_at',
    payroll: 'id, owner_id, branch_id, staff_id, period_start, period_end, status, created_at, updated_at',
    shifts: 'id, branch_id, cashier_id, status, start_time, end_time, created_at, updated_at',
    promotions: 'id, owner_id, branch_id, code, is_active, created_at, updated_at',
    goals: 'id, owner_id, branch_id, status, target_period, created_at, updated_at',
    purchase_orders: 'id, owner_id, supplier_id, status, created_at, updated_at',
    messages: 'id, sender_id, receiver_id, branch_id, created_at',
    inventory_purchases: 'id, branch_id, inventory_id, request_id, purchase_date, created_at',
    custom_roles: 'id, owner_id, name, created_at, updated_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, last_server_cursor, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 7 (Local Form Drafts Auto-Save Engine)
localDb.version(7).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, updated_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, created_at, updated_at',
    customers: 'id, branch_id, name, phone, created_at, updated_at',
    expenses: 'id, branch_id, category, created_at, updated_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at, updated_at',
    central_inventory: 'id, owner_id, name, sku, category, created_at, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at, updated_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, created_at, updated_at',
    branches: 'id, owner_id, name, created_at, updated_at, status',
    suppliers: 'id, owner_id, enterprise_id, name, phone, created_at, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, created_at, updated_at',
    notes: 'id, branch_id, created_at, updated_at',
    loans: 'id, branch_id, customer_id, status, created_at, updated_at',
    business_loans: 'id, owner_id, lender_name, status, created_at, updated_at',
    capital_accounts: 'id, owner_id, account_name, account_type, created_at, updated_at',
    business_assets: 'id, owner_id, asset_name, category, created_at, updated_at',
    asset_maintenance: 'id, asset_id, maintenance_date, created_at, updated_at',
    requests: 'id, branch_id, owner_id, status, created_at, updated_at',
    documents: 'id, branch_id, type, created_at, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at, updated_at',
    product_returns: 'id, branch_id, sale_id, created_at, updated_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at, updated_at',
    stock_movements: 'id, owner_id, branch_id, inventory_id, movement_type, created_at, updated_at',
    attendance: 'id, owner_id, branch_id, staff_id, date, status, created_at, updated_at',
    payroll: 'id, owner_id, branch_id, staff_id, period_start, period_end, status, created_at, updated_at',
    shifts: 'id, branch_id, cashier_id, status, start_time, end_time, created_at, updated_at',
    promotions: 'id, owner_id, branch_id, code, is_active, created_at, updated_at',
    goals: 'id, owner_id, branch_id, status, target_period, created_at, updated_at',
    purchase_orders: 'id, owner_id, supplier_id, status, created_at, updated_at',
    messages: 'id, sender_id, receiver_id, branch_id, created_at',
    inventory_purchases: 'id, branch_id, inventory_id, request_id, purchase_date, created_at',
    form_drafts: 'form_id, user_id, updated_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, last_server_cursor, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 8 (Authoritative Item and Service Categories)
localDb.version(8).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, updated_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, created_at, updated_at',
    categories: 'id, owner_id, name, type, created_at, updated_at',
    customers: 'id, branch_id, name, phone, created_at, updated_at',
    expenses: 'id, branch_id, category, created_at, updated_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at, updated_at',
    central_inventory: 'id, owner_id, name, sku, category, created_at, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at, updated_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, created_at, updated_at',
    branches: 'id, owner_id, name, created_at, updated_at, status',
    suppliers: 'id, owner_id, enterprise_id, name, phone, created_at, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, created_at, updated_at',
    notes: 'id, branch_id, created_at, updated_at',
    loans: 'id, branch_id, customer_id, status, created_at, updated_at',
    business_loans: 'id, owner_id, lender_name, status, created_at, updated_at',
    capital_accounts: 'id, owner_id, account_name, account_type, created_at, updated_at',
    business_assets: 'id, owner_id, asset_name, category, created_at, updated_at',
    asset_maintenance: 'id, asset_id, maintenance_date, created_at, updated_at',
    requests: 'id, branch_id, owner_id, status, created_at, updated_at',
    documents: 'id, branch_id, type, created_at, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at, updated_at',
    product_returns: 'id, branch_id, sale_id, created_at, updated_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at, updated_at',
    stock_movements: 'id, owner_id, branch_id, inventory_id, movement_type, created_at, updated_at',
    attendance: 'id, owner_id, branch_id, staff_id, date, status, created_at, updated_at',
    payroll: 'id, owner_id, branch_id, staff_id, period_start, period_end, status, created_at, updated_at',
    shifts: 'id, branch_id, cashier_id, status, start_time, end_time, created_at, updated_at',
    promotions: 'id, owner_id, branch_id, code, is_active, created_at, updated_at',
    goals: 'id, owner_id, branch_id, status, target_period, created_at, updated_at',
    purchase_orders: 'id, owner_id, supplier_id, status, created_at, updated_at',
    messages: 'id, sender_id, receiver_id, branch_id, created_at',
    inventory_purchases: 'id, branch_id, inventory_id, request_id, purchase_date, created_at',
    custom_roles: 'id, owner_id, name, created_at, updated_at',
    form_drafts: 'form_id, user_id, updated_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, last_server_cursor, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 9 (Sysadmin Popup Modal Messages & User Seen Tracking Engine)
localDb.version(9).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, updated_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, created_at, updated_at',
    categories: 'id, owner_id, name, type, created_at, updated_at',
    customers: 'id, branch_id, name, phone, created_at, updated_at',
    expenses: 'id, branch_id, category, created_at, updated_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at, updated_at',
    central_inventory: 'id, owner_id, name, sku, category, created_at, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at, updated_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, created_at, updated_at',
    branches: 'id, owner_id, name, created_at, updated_at, status',
    suppliers: 'id, owner_id, enterprise_id, name, phone, created_at, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, created_at, updated_at',
    notes: 'id, branch_id, created_at, updated_at',
    loans: 'id, branch_id, customer_id, status, created_at, updated_at',
    business_loans: 'id, owner_id, lender_name, status, created_at, updated_at',
    capital_accounts: 'id, owner_id, account_name, account_type, created_at, updated_at',
    business_assets: 'id, owner_id, asset_name, category, created_at, updated_at',
    asset_maintenance: 'id, asset_id, maintenance_date, created_at, updated_at',
    requests: 'id, branch_id, owner_id, status, created_at, updated_at',
    documents: 'id, branch_id, type, created_at, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at, updated_at',
    product_returns: 'id, branch_id, sale_id, created_at, updated_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at, updated_at',
    stock_movements: 'id, owner_id, branch_id, inventory_id, movement_type, created_at, updated_at',
    attendance: 'id, owner_id, branch_id, staff_id, date, status, created_at, updated_at',
    payroll: 'id, owner_id, branch_id, staff_id, period_start, period_end, status, created_at, updated_at',
    shifts: 'id, branch_id, cashier_id, status, start_time, end_time, created_at, updated_at',
    promotions: 'id, owner_id, branch_id, code, is_active, created_at, updated_at',
    goals: 'id, owner_id, branch_id, status, target_period, created_at, updated_at',
    purchase_orders: 'id, owner_id, supplier_id, status, created_at, updated_at',
    messages: 'id, sender_id, receiver_id, branch_id, created_at',
    inventory_purchases: 'id, branch_id, inventory_id, request_id, purchase_date, created_at',
    custom_roles: 'id, owner_id, name, created_at, updated_at',
    form_drafts: 'form_id, user_id, updated_at',
    admin_modal_messages: 'id, type, target_audience, is_active, created_at, updated_at',
    user_seen_modal_messages: 'id, user_id, modal_message_id, seen_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, last_server_cursor, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 11 (Full Cloud-to-Local Schema Mirroring & Table Alignment)
localDb.version(11).stores({
    dashboard_snapshots: 'key, role, target_id, updated_at',
    sales: 'id, branch_id, client_tx_id, customer_id, created_at, updated_at, sync_status',
    inventory: 'id, branch_id, name, sku, category, created_at, updated_at',
    categories: 'id, owner_id, name, type, created_at, updated_at',
    customers: 'id, branch_id, name, phone, created_at, updated_at',
    expenses: 'id, branch_id, category, created_at, updated_at, sync_status',
    purchases: 'id, owner_id, supplier_id, created_at, updated_at',
    central_inventory: 'id, owner_id, name, sku, category, created_at, updated_at',
    quotations: 'id, owner_id, branch_id, quote_number, customer_name, status, created_at, updated_at',
    invoices: 'id, owner_id, branch_id, invoice_number, customer_id, status, created_at, updated_at',
    staff: 'id, owner_id, branch_id, full_name, email, role, created_at, updated_at',
    branches: 'id, owner_id, name, created_at, updated_at, status',
    suppliers: 'id, owner_id, enterprise_id, name, phone, created_at, updated_at',
    tasks: 'id, branch_id, owner_id, status, priority, deadline, created_at, updated_at',
    task_comments: 'id, task_id, user_id, created_at',
    notes: 'id, branch_id, created_at, updated_at',
    loans: 'id, branch_id, customer_id, status, created_at, updated_at',
    business_loans: 'id, owner_id, lender_name, status, created_at, updated_at',
    capital_accounts: 'id, owner_id, account_name, account_type, created_at, updated_at',
    capital_transactions: 'id, account_id, type, amount, created_at, updated_at',
    business_assets: 'id, owner_id, asset_name, category, created_at, updated_at',
    asset_maintenance: 'id, asset_id, maintenance_date, created_at, updated_at',
    requests: 'id, branch_id, owner_id, status, created_at, updated_at',
    access_requests: 'id, user_id, branch_id, status, created_at',
    documents: 'id, branch_id, type, created_at, updated_at',
    announcements: 'id, owner_id, branch_id, title, created_at, updated_at',
    product_returns: 'id, branch_id, sale_id, created_at, updated_at',
    stock_transfers: 'id, owner_id, from_branch_id, to_branch_id, status, created_at, updated_at',
    stock_movements: 'id, owner_id, branch_id, inventory_id, movement_type, created_at, updated_at',
    attendance: 'id, owner_id, branch_id, staff_id, date, status, created_at, updated_at',
    payroll: 'id, owner_id, branch_id, staff_id, period_start, period_end, status, created_at, updated_at',
    shifts: 'id, branch_id, cashier_id, status, start_time, end_time, created_at, updated_at',
    cash_drawer: 'id, branch_id, status, date, opened_at, closed_at, created_at',
    promotions: 'id, owner_id, branch_id, code, is_active, created_at, updated_at',
    goals: 'id, owner_id, branch_id, status, target_period, created_at, updated_at',
    purchase_orders: 'id, owner_id, supplier_id, status, created_at, updated_at',
    sale_tags: 'id, branch_id, sale_id, tag',
    messages: 'id, sender_id, receiver_id, branch_id, created_at',
    chat_groups: 'id, name, created_by, branch_id, created_at',
    group_members: 'id, group_id, user_id, joined_at',
    pinned_messages: 'id, group_id, message_id, pinned_at',
    inventory_purchases: 'id, branch_id, inventory_id, request_id, purchase_date, created_at',
    custom_roles: 'id, owner_id, name, created_at, updated_at',
    form_drafts: 'form_id, user_id, updated_at',
    admin_modal_messages: 'id, type, target_audience, is_active, created_at, updated_at',
    user_seen_modal_messages: 'id, user_id, modal_message_id, seen_at',
    notifications: 'id, user_id, read, created_at',
    users: 'id, email, role, updated_at',
    profiles: 'id, email, full_name, role, updated_at',
    sync_queue: '++id, operation_id, operation_type, entity_type, entity_id, created_at, status',
    sync_metadata: 'entity, last_synced_at, last_server_cursor, sync_status',
    subscription_snapshot: 'user_id, plan, status, verified_at'
});

// Schema Definition Version 12 (Branch inventory registration & isolation metadata mirroring)
localDb.version(12).stores({
    inventory: 'id, branch_id, name, sku, category, central_item_id, is_isolated, isolation_status, created_at, updated_at'
});

/**
 * Save form field input draft to local IndexedDB
 */
export async function saveFormDraft(formId, data) {
    if (!INDEXEDDB_ENABLED || !formId || !data) return;
    try {
        await localDb.form_drafts.put({
            form_id: formId,
            data,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        console.warn(`[LocalDB] Failed to save form draft for ${formId}:`, err);
    }
}

/**
 * Retrieve form field input draft from local IndexedDB
 */
export async function getFormDraft(formId) {
    if (!INDEXEDDB_ENABLED || !formId) return null;
    try {
        const record = await localDb.form_drafts.get(formId);
        return record?.data || null;
    } catch (err) {
        console.warn(`[LocalDB] Failed to get form draft for ${formId}:`, err);
        return null;
    }
}

/**
 * Clear form field input draft from local IndexedDB
 */
export async function clearFormDraft(formId) {
    if (!INDEXEDDB_ENABLED || !formId) return;
    try {
        await localDb.form_drafts.delete(formId);
    } catch (err) {
        console.warn(`[LocalDB] Failed to clear form draft for ${formId}:`, err);
    }
}

if (typeof window !== 'undefined') {
    window.saveFormDraft = saveFormDraft;
    window.getFormDraft = getFormDraft;
    window.clearFormDraft = clearFormDraft;
}



/**
 * Helper to safely get snapshot from local DB
 */
export async function getLocalSnapshot(key) {
    if (!INDEXEDDB_ENABLED) return null;
    try {
        const item = await localDb.dashboard_snapshots.get(key);
        return item || null;
    } catch (err) {
        syncLogger.warn('localdb', `getSnapshot error on key ${key}`, err);
        return null;
    }
}

/**
 * Helper to safely save snapshot to local DB with non-destructive cache integrity protection.
 * Prevents transient query timeouts or errors from wiping existing valid snapshot data.
 */
export async function saveLocalSnapshot(key, role, targetId, data) {
    if (!INDEXEDDB_ENABLED || !key || !data || typeof data !== 'object') return;
    try {
        const existing = await localDb.dashboard_snapshots.get(key);
        const existingData = existing && existing.data && typeof existing.data === 'object' ? existing.data : null;

        // Sanitize incoming payload to guarantee pure arrays, never error objects
        const sanitized = {};
        for (const [prop, val] of Object.entries(data)) {
            if (Array.isArray(val)) {
                sanitized[prop] = val;
            } else if (val && typeof val === 'object' && Array.isArray(val.data)) {
                sanitized[prop] = val.data;
            } else if (val && typeof val === 'object' && Array.isArray(val.items)) {
                sanitized[prop] = val.items;
            } else if (val && typeof val === 'object' && val.error) {
                // Supabase error object: preserve existing cache for this property if available
                sanitized[prop] = (existingData && Array.isArray(existingData[prop])) ? existingData[prop] : [];
            } else {
                sanitized[prop] = val;
            }
        }

        // Cache Integrity Guard: if incoming critical arrays are empty due to timeout/failure,
        // retain existing cache to protect against transient mobile refresh race conditions.
        // BUT if cloud sync was successful (data._isAuthoritativeCloudSync === true), trust the cloud!
        if (existingData && data._isAuthoritativeCloudSync !== true && data._hasQueryFailures === true) {
            const criticalProps = ['sales', 'inventory', 'expenses', 'tasks', 'branches', 'profiles', 'requests', 'activities', 'stockMovements'];
            for (const prop of criticalProps) {
                const incomingArr = sanitized[prop];
                const existingArr = existingData[prop];
                if (Array.isArray(existingArr) && existingArr.length > 0) {
                    if (!Array.isArray(incomingArr) || incomingArr.length === 0) {
                        if (data._isExplicitClear !== true) {
                            sanitized[prop] = existingArr;
                        }
                    }
                }
            }
        }

        await localDb.dashboard_snapshots.put({
            key,
            role: role || 'owner',
            target_id: targetId || 'all',
            data: sanitized,
            updated_at: new Date().toISOString()
        });
    } catch (err) {
        syncLogger.warn('localdb', `saveSnapshot error on key ${key}`, err);
    }
}

/**
 * Bulk cache items into a specific localDb table safely
 */
export async function cacheLocalItems(tableName, items) {
    if (!INDEXEDDB_ENABLED || !items || !Array.isArray(items) || items.length === 0) return;
    try {
        if (localDb[tableName]) {
            // Clean items to ensure they have an id
            const validItems = items.filter(item => item && item.id);
            if (validItems.length > 0) {
                await localDb[tableName].bulkPut(validItems);
            }
        }
    } catch (err) {
        syncLogger.warn('localdb', `cacheLocalItems error on table ${tableName}:`, err);
    }
}

/**
 * Query items from a local table with optional filtering and sorting
 */
export async function getLocalItems(tableName, filterFn = null, sortField = null, ascending = true) {
    if (!INDEXEDDB_ENABLED) return [];
    try {
        if (!localDb[tableName]) return [];
        let items = await localDb[tableName].toArray();
        if (typeof filterFn === 'function') {
            items = items.filter(filterFn);
        }
        if (sortField) {
            items.sort((a, b) => {
                const valA = a[sortField] ?? '';
                const valB = b[sortField] ?? '';
                if (valA < valB) return ascending ? -1 : 1;
                if (valA > valB) return ascending ? 1 : -1;
                return 0;
            });
        }
        return items;
    } catch (err) {
        syncLogger.warn('localdb', `getLocalItems error on table ${tableName}:`, err);
        return [];
    }
}

/**
 * Upsert a single item into localDb
 */
export async function upsertLocalItem(tableName, item) {
    if (!INDEXEDDB_ENABLED || !item || !item.id) return;
    try {
        if (localDb[tableName]) {
            await localDb[tableName].put(item);
        }
    } catch (err) {
        syncLogger.warn('localdb', `upsertLocalItem error on table ${tableName}:`, err);
    }
}

/**
 * Delete an item from localDb
 */
export async function deleteLocalItem(tableName, id) {
    if (!INDEXEDDB_ENABLED || !id) return;
    try {
        if (localDb[tableName]) {
            await localDb[tableName].delete(id);
        }
    } catch (err) {
        syncLogger.warn('localdb', `deleteLocalItem error on table ${tableName}:`, err);
    }
}

/**
 * Bulk delete items from localDb
 */
export async function bulkDeleteLocalItems(tableName, ids) {
    if (!INDEXEDDB_ENABLED || !ids || !Array.isArray(ids) || ids.length === 0) return;
    try {
        if (localDb[tableName]) {
            await localDb[tableName].bulkDelete(ids);
        }
    } catch (err) {
        syncLogger.warn('localdb', `bulkDeleteLocalItems error on table ${tableName}:`, err);
    }
}

/**
 * Update entity synchronization metadata & checkpoint
 */
export async function setSyncMetadata(entity, status, error = null, cursor = null) {
    if (!INDEXEDDB_ENABLED) return;
    try {
        const payload = {
            entity,
            last_synced_at: new Date().toISOString(),
            sync_status: status,
            last_error: error ? (error.message || String(error)) : null
        };
        if (cursor) {
            payload.last_server_cursor = cursor;
        }
        await localDb.sync_metadata.put(payload);
    } catch (err) {
        syncLogger.warn('localdb', `setSyncMetadata error on ${entity}:`, err);
    }
}

/**
 * Get sync metadata for a given entity
 */
export async function getSyncMetadata(entity) {
    if (!INDEXEDDB_ENABLED) return null;
    try {
        return await localDb.sync_metadata.get(entity);
    } catch (err) {
        return null;
    }
}

/**
 * Save verified server entitlements to IndexedDB
 */
export async function saveEntitlementsToIndexedDB(userId, entitlements) {
    if (!INDEXEDDB_ENABLED || !userId || !entitlements || typeof entitlements !== 'object') return;
    try {
        await localDb.subscription_snapshot.put({
            user_id: userId,
            plan: entitlements.plan_id || 'free_trial',
            status: entitlements.is_active ? 'active' : 'inactive',
            entitlements: entitlements,
            verified_at: new Date().toISOString()
        });
    } catch (err) {
        syncLogger.warn('localdb', 'Entitlements save warning:', err);
    }
}

/**
 * Get verified server entitlements from IndexedDB
 */
export async function getEntitlementsFromIndexedDB(userId) {
    if (!INDEXEDDB_ENABLED || !userId) return null;
    try {
        const item = await localDb.subscription_snapshot.get(userId);
        return item && item.entitlements ? item.entitlements : null;
    } catch (err) {
        syncLogger.warn('localdb', 'Entitlements read warning:', err);
        return null;
    }
}

/**
 * Scans and purges any records in IndexedDB that do not belong to the current authenticated tenant
 */
export async function scrubForeignTenantIndexedDBData() {
    if (!INDEXEDDB_ENABLED) return;
    const appState = (typeof window !== 'undefined' && window.state) ? window.state : (typeof state !== 'undefined' ? state : null);
    if (!appState) return;
    const role = appState.role;
    if (!role || role === 'sysadmin') return;

    const currentOwnerId = appState.ownerId || appState.profile?.id;
    const currentBranchId = appState.branchId || appState.branchProfile?.id;
    const branchOwnerId = appState.branchProfile?.owner_id;
    const ownedBranchIds = (appState.branches || []).map(b => b.id).filter(Boolean);

    const tablesToScrub = [
        'central_inventory', 'inventory', 'sales', 'expenses', 'tasks',
        'customers', 'loans', 'business_loans', 'requests', 'branches', 'staff',
        'stock_movements', 'capital_accounts', 'business_assets', 'asset_maintenance',
        'attendance', 'payroll', 'shifts', 'promotions', 'goals', 'purchase_orders',
        'quotations', 'documents', 'announcements', 'product_returns', 'stock_transfers'
    ];


    for (const table of tablesToScrub) {
        if (!localDb[table]) continue;
        try {
            const allRecords = await localDb[table].toArray();
            const foreignIds = [];

            for (const record of allRecords) {
                if (role === 'owner' && currentOwnerId) {
                    if (record.owner_id && String(record.owner_id).toLowerCase() !== String(currentOwnerId).toLowerCase()) {
                        foreignIds.push(record.id);
                    } else if (record.branch_id && ownedBranchIds.length > 0 && !ownedBranchIds.some(id => String(id).toLowerCase() === String(record.branch_id).toLowerCase())) {
                        foreignIds.push(record.id);
                    }
                } else if (role === 'branch' && currentBranchId) {
                    if (record.branch_id && String(record.branch_id).toLowerCase() !== String(currentBranchId).toLowerCase()) {
                        foreignIds.push(record.id);
                    } else if (record.owner_id && branchOwnerId && String(record.owner_id).toLowerCase() !== String(branchOwnerId).toLowerCase()) {
                        foreignIds.push(record.id);
                    }
                }
            }

            if (foreignIds.length > 0) {
                syncLogger.log('localdb', `Purged ${foreignIds.length} foreign records from local ${table}`);
                await localDb[table].bulkDelete(foreignIds);
            }
        } catch (e) {
            syncLogger.warn('localdb', `Error scrubbing ${table}:`, e);
        }
    }
}

export default localDb;

if (typeof window !== 'undefined') {
    window.localDb = localDb;
    window.saveEntitlementsToIndexedDB = saveEntitlementsToIndexedDB;
    window.getEntitlementsFromIndexedDB = getEntitlementsFromIndexedDB;
    window.bulkDeleteLocalItems = bulkDeleteLocalItems;
    window.scrubForeignTenantIndexedDBData = scrubForeignTenantIndexedDBData;
}
