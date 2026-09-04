// ─────────────────────────────────────────────────────────────────────────────
// Vercel Cron Job: Low Stock & Reorder Push Notification Dispatcher
// Path: /api/crons/low-stock-alert
// Enforces Admin Master Flag ('low_stock_sentinel') & User Preferences
// ─────────────────────────────────────────────────────────────────────────────
import webpush from 'web-push';

function normalizePrivateKey(key) {
    if (!key) return '';
    const clean = key.trim();
    if (clean.length > 50 && clean.startsWith('MIGH')) {
        try {
            const buf = Buffer.from(clean, 'base64');
            const idx = buf.indexOf(Buffer.from([0x04, 0x20]));
            if (idx !== -1 && idx + 2 + 32 <= buf.length) {
                return buf.slice(idx + 2, idx + 2 + 32).toString('base64url');
            }
        } catch (e) {}
    }
    return clean;
}

export default async function handler(req, res) {
    // 1. Verify Vercel Cron authorization
    const authHeader = req.headers['authorization'];
    const vercelCronHeader = req.headers['x-vercel-cron'];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !vercelCronHeader) {
        return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET or Vercel Cron signature' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const rawVapidPub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || 'BNJ1FTRqt1o-s8HeQnURhp8plIz8tMUpORz-0dhbNQTAIJymY3mAzfMUWp6Km1mbIi6f-zSGxz17UZ5PL_QUo-g';
    const rawVapidPriv = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Database environment variables missing' });
    }

    // 2. Check Admin Master Cron Toggle from sys_settings
    try {
        const settingsRes = await fetch(`${supabaseUrl}/rest/v1/sys_settings?key=eq.cron_job_settings&select=value`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData && settingsData[0]?.value) {
                const masterCronFlags = typeof settingsData[0].value === 'string' 
                    ? JSON.parse(settingsData[0].value) 
                    : settingsData[0].value;
                if (masterCronFlags && masterCronFlags['low_stock_sentinel'] === false) {
                    console.log("[Low Stock Cron] 'low_stock_sentinel' is disabled globally by administrator.");
                    return res.status(200).json({
                        success: true,
                        skipped: true,
                        reason: 'Disabled globally by administrator'
                    });
                }
            }
        }
    } catch (e) {
        console.warn('[Low Stock Cron] Master settings check warning:', e.message);
    }

    const vapidPublicKey = rawVapidPub ? rawVapidPub.trim() : '';
    const vapidPrivateKey = normalizePrivateKey(rawVapidPriv);

    let canSendWebPush = false;
    if (vapidPublicKey && vapidPrivateKey) {
        try {
            webpush.setVapidDetails(
                process.env.VAPID_SUBJECT || 'mailto:support@bmstz.com',
                vapidPublicKey,
                vapidPrivateKey
            );
            canSendWebPush = true;
        } catch (vapidErr) {
            console.warn('[Low Stock Cron] VAPID config error:', vapidErr.message);
        }
    }

    try {
        console.log('[Low Stock Cron] Starting low-stock scan across all catalogs...');

        // Query items that are low or out of stock in central inventory
        let lowStockItems = [];
        try {
            const invRes = await fetch(`${supabaseUrl}/rest/v1/central_inventory?select=id,name,main_store_stock,min_threshold,owner_id&limit=25`, {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`
                }
            });
            if (invRes.ok) {
                const allItems = await invRes.json();
                lowStockItems = (allItems || []).filter(item => {
                    const threshold = item.min_threshold || 5;
                    const stock = Number(item.main_store_stock || 0);
                    return stock <= threshold;
                });
            }
        } catch (e) {
            console.warn('[Low Stock Cron] Query warning:', e.message);
        }

        let pushDelivered = 0;
        let pushFailed = 0;

        if (lowStockItems.length > 0 && canSendWebPush) {
            // Group low stock items by owner
            const ownerMap = new Map();
            lowStockItems.forEach(item => {
                const oId = item.owner_id || 'default';
                if (!ownerMap.has(oId)) ownerMap.set(oId, []);
                ownerMap.get(oId).push(item);
            });

            // Query active subscriptions for owners
            const subsRes = await fetch(`${supabaseUrl}/rest/v1/sys_push_subscriptions?is_active=eq.true&role=in.(owner,branch)&select=id,endpoint,p256dh,auth,role,owner_id,preferences`, {
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`
                }
            });

            const subscriptions = subsRes.ok ? await subsRes.json() : [];
            const expiredIds = [];

            for (const [ownerId, items] of ownerMap.entries()) {
                const count = items.length;
                const sampleName = items[0]?.name || 'Item';
                const notifTitle = `⚠️ Low Stock Alert (${count} ${count === 1 ? 'item' : 'items'})`;
                const notifBody = count === 1 
                    ? `"${sampleName}" has only ${items[0]?.main_store_stock || 0} units left in stock. Tap to reorder.`
                    : `"${sampleName}" and ${count - 1} other item(s) are low or out of stock. Tap to review.`;

                const payload = JSON.stringify({
                    title: notifTitle,
                    body: notifBody,
                    icon: '/bmtzofficiallogo.png',
                    badge: '/bmtzofficiallogo.png',
                    target_url: '/app/#view=central_inventory',
                    tag: `bms-low-stock-${ownerId}-${new Date().toISOString().split('T')[0]}`
                });

                // Target relevant subscribers and respect user opt-in preferences
                const targetSubs = subscriptions.filter(s => {
                    const isOwnerMatch = !s.owner_id || s.owner_id === ownerId || s.role === 'owner';
                    if (!isOwnerMatch) return false;
                    const userPrefs = typeof s.preferences === 'string' ? JSON.parse(s.preferences) : (s.preferences || {});
                    return userPrefs['low_stock_sentinel'] !== false;
                });

                await Promise.all(targetSubs.map(async (sub) => {
                    if (!sub.endpoint || !sub.p256dh || !sub.auth || sub.endpoint.startsWith('https://bms.internal')) {
                        return;
                    }

                    try {
                        await webpush.sendNotification({
                            endpoint: sub.endpoint,
                            keys: {
                                p256dh: sub.p256dh,
                                auth: sub.auth
                            }
                        }, payload);
                        pushDelivered++;
                    } catch (pushErr) {
                        pushFailed++;
                        if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                            expiredIds.push(sub.id);
                        }
                    }
                }));
            }

            if (expiredIds.length > 0) {
                try {
                    await fetch(`${supabaseUrl}/rest/v1/sys_push_subscriptions?id=in.(${expiredIds.join(',')})`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            'apikey': serviceKey,
                            'Authorization': `Bearer ${serviceKey}`
                        },
                        body: JSON.stringify({ is_active: false, updated_at: new Date().toISOString() })
                    });
                } catch (e) {}
            }
        }

        return res.status(200).json({
            success: true,
            lowStockCount: lowStockItems.length,
            pushDelivered,
            pushFailed,
            canSendWebPush,
            scannedAt: new Date().toISOString()
        });

    } catch (err) {
        console.error('[Low Stock Cron Error]', err);
        return res.status(500).json({ error: 'Low stock cron error: ' + err.message });
    }
}
