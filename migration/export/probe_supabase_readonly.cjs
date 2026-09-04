const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read environment variables directly from .env (read-only)
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

console.log(`Testing read-only connection to Supabase at: ${url}`);

const supabase = createClient(url, key);

async function probe() {
    const testTables = ['sys_pricing_plans', 'branches', 'categories', 'profiles'];
    for (const table of testTables) {
        try {
            const { data, count, error } = await supabase
                .from(table)
                .select('*', { count: 'exact', head: false })
                .limit(3);

            if (error) {
                console.log(`- Table ${table}: Error (${error.message})`);
            } else {
                console.log(`- Table ${table}: Read successful! Found ${data ? data.length : 0} sample rows.`);
            }
        } catch (err) {
            console.log(`- Table ${table}: Exception (${err.message})`);
        }
    }
}

probe();
