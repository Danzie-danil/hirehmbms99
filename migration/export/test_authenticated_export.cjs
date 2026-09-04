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

const credPath = path.resolve(__dirname, '../../sysadmin_credentials.txt');
let email = '';
let password = '';

if (fs.existsSync(credPath)) {
    const credContent = fs.readFileSync(credPath, 'utf8');
    credContent.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed.toLowerCase().startsWith('email:')) {
            email = trimmed.split(':')[1].trim();
        }
        if (trimmed.toLowerCase().startsWith('password:')) {
            password = trimmed.split(':')[1].trim();
        }
    });
}

console.log('Testing authenticated extraction with account:', email);

const supabase = createClient(url, key);

async function testAuth() {
    if (!email || !password) {
        console.log('No credentials found in sysadmin_credentials.txt');
        return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (authError) {
        console.error('Sign in failed:', authError.message);
        return;
    }

    console.log('Authentication successful! User ID:', authData.user.id);

    const tables = ['inventory', 'sales', 'branches', 'expenses', 'central_inventory', 'staff', 'customers'];

    for (const t of tables) {
        const { data, count, error } = await supabase
            .from(t)
            .select('*', { count: 'exact', head: false })
            .limit(5);

        if (error) {
            console.log(`- ${t}: Error: ${error.message}`);
        } else {
            console.log(`- ${t}: Found ${data ? data.length : 0} rows.`);
        }
    }
}

testAuth();
