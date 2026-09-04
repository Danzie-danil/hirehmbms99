// ─────────────────────────────────────────────────────────────────────────────
// Automated Single-Sentence App Update Push Dispatcher
// Run: node scripts/push_update_notification.cjs
// ─────────────────────────────────────────────────────────────────────────────
const fs = require('fs');
const path = require('path');
const https = require('https');

function dispatchUpdateNotification() {
    const relPath = path.resolve(__dirname, '..', 'release_notes.json');
    if (!fs.existsSync(relPath)) {
        console.error('[ERROR] release_notes.json not found!');
        process.exit(1);
    }

    const relData = JSON.parse(fs.readFileSync(relPath, 'utf8'));
    const version = relData.version || '2.9.33';
    const singleSentence = relData.banners?.default || relData.banners?.owner || (relData.notes?.owner && relData.notes.owner[0]) || 'New app update available!';

    console.log(`\n[UPDATE] Preparing Automated Single-Sentence Push Notification for BMSTz v${version}...`);
    console.log(`[MESSAGE] "${singleSentence}"\n`);

    const payload = JSON.stringify({
        version,
        message: singleSentence
    });

    const targetUrl = process.env.PRODUCTION_URL || 'https://www.bmstz.com/api/push/send-update-notification';
    console.log(`[ENDPOINT] ${targetUrl}`);

    try {
        const urlObj = new URL(targetUrl);
        const reqOpts = {
            hostname: urlObj.hostname,
            path: urlObj.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(payload),
                'x-update-secret': process.env.SUPABASE_SERVICE_KEY || process.env.UPDATE_PUSH_SECRET || ''
            }
        };

        const req = https.request(reqOpts, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`[RESPONSE] Server Response (${res.statusCode}):`, data);
                if (res.statusCode === 200) {
                    console.log(`[SUCCESS] Single-sentence push notification successfully dispatched for v${version}!\n`);
                } else {
                    console.warn(`[WARNING] Dispatch notice: Check VAPID keys and server authentication.\n`);
                }
            });
        });

        req.on('error', (e) => {
            console.error(`[ERROR] Request error:`, e.message);
        });

        req.write(payload);
        req.end();
    } catch (e) {
        console.error('[ERROR] Notification trigger failed:', e.message);
    }
}

dispatchUpdateNotification();
