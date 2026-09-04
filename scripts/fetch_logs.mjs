import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '..', '.env') });

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY // or service role if needed, but we'll try anon key for now, wait anon key might not have access to sys_audit_logs.
);

async function main() {
    const { data, error } = await supabase
        .from('sys_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching logs:", error);
    } else {
        console.log("Latest logs:");
        data.forEach(log => {
            console.log(`[${log.created_at}] ${log.action}`);
            console.log(log.details);
            console.log('---');
        });
    }
}

main();
