/**
 * BMSTZ IndexedDB Toggle: Disable Script
 * Sets INDEXEDDB_ENABLED = false in js/data/db.js to put the app in pure Supabase mode.
 */
const fs = require('fs');
const path = require('path');

const dbPath = path.resolve(__dirname, '../js/data/db.js');

try {
    let content = fs.readFileSync(dbPath, 'utf8');
    if (!content.includes('export const INDEXEDDB_ENABLED =')) {
        console.error('ERROR: Could not find INDEXEDDB_ENABLED declaration in js/data/db.js');
        process.exit(1);
    }

    content = content.replace(
        /export const INDEXEDDB_ENABLED = (true|false);/,
        'export const INDEXEDDB_ENABLED = false;'
    );

    fs.writeFileSync(dbPath, content, 'utf8');
    console.log('[SUCCESS] IndexedDB has been DISABLED. The application is now running in Pure Supabase mode.');
    console.log('[INFO] Run "npm run build" to compile the distribution build.');
} catch (err) {
    console.error('[ERROR] Failed to disable IndexedDB:', err);
    process.exit(1);
}
