const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../../.env');
const envContent = fs.readFileSync(envPath, 'utf8');

let url = '';
let key = '';

envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed.startsWith('VITE_SUPABASE_URL=')) {
        url = trimmed.replace('VITE_SUPABASE_URL=', '').trim();
    }
    if (trimmed.startsWith('VITE_SUPABASE_ANON_KEY=')) {
        key = trimmed.replace('VITE_SUPABASE_ANON_KEY=', '').trim();
    }
});

if (!url || !key) {
    console.error('Missing Supabase URL or Anon key in .env');
    process.exit(1);
}

const supabase = createClient(url, key);

const exportDir = path.resolve(__dirname, 'data');
if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
}

// Ordered list of tables to export (read-only)
const TABLES_TO_EXPORT = [
    'sys_pricing_plans',
    'sys_admins',
    'profiles',
    'branches',
    'staff',
    'categories',
    'suppliers',
    'central_inventory',
    'inventory',
    'services',
    'customers',
    'customer_payments',
    'loans',
    'capital_accounts',
    'capital_transactions',
    'business_assets',
    'business_loans',
    'expenses',
    'payroll',
    'shifts',
    'cash_drawer',
    'cash_transactions',
    'sales',
    'stock_movements',
    'stock_transfers',
    'purchase_orders',
    'quotations',
    'invoices',
    'product_returns',
    'attendance',
    'announcements',
    'messages',
    'chat_groups',
    'group_members',
    'requests',
    'tasks',
    'task_comments',
    'notifications',
    'admin_modal_messages',
    'user_seen_modal_messages',
    'sys_security_events',
    'sys_settings',
    'saas_audit_logs'
];

const BATCH_SIZE = 500;

async function exportTable(table) {
    console.log(`[EXPORT] Extracting table '${table}' (read-only)...`);
    const allRows = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .range(offset, offset + BATCH_SIZE - 1);

            if (error) {
                // Table might not exist in this database instance, record warning
                console.warn(`[EXPORT] Table '${table}' returned error: ${error.message}`);
                return { table, count: 0, status: 'SKIPPED', error: error.message };
            }

            if (!data || data.length === 0) {
                hasMore = false;
                break;
            }

            allRows.push(...data);
            offset += data.length;

            if (data.length < BATCH_SIZE) {
                hasMore = false;
            }
        } catch (err) {
            console.error(`[EXPORT] Exception extracting table '${table}': ${err.message}`);
            return { table, count: allRows.length, status: 'ERROR', error: err.message };
        }
    }

    const targetFile = path.join(exportDir, `${table}.json`);
    fs.writeFileSync(targetFile, JSON.stringify(allRows, null, 2), 'utf8');
    console.log(`[EXPORT] Table '${table}': Extracted ${allRows.length} rows -> ${targetFile}`);

    return { table, count: allRows.length, status: 'SUCCESS' };
}

async function run() {
    console.log('====================================================');
    console.log('STARTING READ-ONLY SUPABASE DATA EXTRACTION PIPELINE');
    console.log('Target URL:', url);
    console.log('Guarantee: ZERO writes/updates/deletes on Supabase');
    console.log('====================================================\n');

    const summary = [];

    for (const table of TABLES_TO_EXPORT) {
        const res = await exportTable(table);
        summary.push(res);
    }

    const summaryFile = path.resolve(__dirname, 'export_summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify({
        timestamp: new Date().toISOString(),
        supabaseUrl: url,
        tables: summary
    }, null, 2), 'utf8');

    console.log('\n====================================================');
    console.log('EXTRACTION COMPLETE');
    console.log(`Summary written to: ${summaryFile}`);
    console.log('====================================================');
}

run();
