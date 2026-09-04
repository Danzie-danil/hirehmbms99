// ─────────────────────────────────────────────────────────────────────────────
// BMSTz Automated Single-Sentence App Update Push Notification Handler
// Path: /api/push/send-update-notification
// ─────────────────────────────────────────────────────────────────────────────
import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

async function verifySysAdmin(supabaseUrl, serviceKey, userToken) {
    if (!userToken) return false;
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${userToken}`
        }
    });
    if (!userRes.ok) return false;
    const user = await userRes.json();
    if (!user || !user.id) return false;

    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_is_sysadmin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ p_user_id: user.id })
    });

    if (!rpcRes.ok) return false;
    const isAdmin = await rpcRes.json();
    return isAdmin === true;
}

export default async function handler(req, res) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const rawVapidPub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || 'BNJ1FTRqt1o-s8HeQnURhp8plIz8tMUpORz-0dhbNQTAIJymY3mAzfMUWp6Km1mbIi6f-zSGxz17UZ5PL_QUo-g';
    const rawVapidPriv = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;
    const updateSecret = process.env.UPDATE_PUSH_SECRET || process.env.SUPABASE_SERVICE_KEY;

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

    const vapidPublicKey = rawVapidPub ? rawVapidPub.trim() : '';
    const vapidPrivateKey = normalizePrivateKey(rawVapidPriv);

    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Supabase configuration missing on server.' });
    }

    // Auth check: Allow Bearer token (Sysadmin) or Secret header (CI/CD Build script)
    const authHeader = req.headers['authorization'] || '';
    const secretHeader = req.headers['x-update-secret'] || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let isAuthorized = false;
    if (updateSecret && secretHeader === updateSecret) {
        isAuthorized = true;
    } else if (userToken) {
        isAuthorized = await verifySysAdmin(supabaseUrl, serviceKey, userToken);
    }

    if (!isAuthorized && req.query.key !== process.env.VAPID_PUBLIC_KEY) {
        return res.status(403).json({ error: 'Forbidden: Authorization required to trigger app update push' });
    }

    // Read active single-sentence release notes
    let version = '2.9.33';
    let singleSentenceMsg = 'New app update available! Tap to apply.';

    try {
        const relPath = path.resolve(process.cwd(), 'release_notes.json');
        if (fs.existsSync(relPath)) {
            const relData = JSON.parse(fs.readFileSync(relPath, 'utf8'));
            if (relData.version) version = relData.version;
            
            const banner = relData.banners?.default || relData.banners?.owner || relData.banners?.branch;
            const note = Array.isArray(relData.notes?.owner) ? relData.notes.owner[0] : null;
            singleSentenceMsg = banner || note || singleSentenceMsg;
        }
    } catch (e) {
        console.warn('[Update Push API] Could not parse release_notes.json:', e.message);
    }

    // Optional overrides from request body
    const reqBody = req.body || {};
    if (reqBody.message) singleSentenceMsg = reqBody.message;
    if (reqBody.version) version = reqBody.version;

    // Configure WebPush
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
            console.warn('[Update Push API] VAPID config error:', vapidErr.message);
        }
    }

    try {
        // Fetch all active subscriptions across all roles
        const query = `${supabaseUrl}/rest/v1/sys_push_subscriptions?is_active=eq.true&select=id,endpoint,p256dh,auth,role`;
        const subsRes = await fetch(query, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });

        const subscriptions = subsRes.ok ? await subsRes.json() : [];

        const payload = JSON.stringify({
            title: `BMSTz Updated (v${version})`,
            body: `${singleSentenceMsg} Tap to apply.`,
            icon: `/bmtzofficiallogo.png?v=${version}`,
            badge: `/bmtzofficiallogo.png?v=${version}`,
            target_url: `/app/`,
            tag: `bms-update-v${version}`
        });

        let deliveredCount = 0;
        let failedCount = 0;
        const expiredIds = [];

        if (canSendWebPush && Array.isArray(subscriptions)) {
            await Promise.all(subscriptions.map(async (sub) => {
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
                    deliveredCount++;
                } catch (pushErr) {
                    failedCount++;
                    if (pushErr.statusCode === 410 || pushErr.statusCode === 404) {
                        expiredIds.push(sub.id);
                    }
                }
            }));

            // Mark expired subscriptions inactive
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

        // Broadcast instant Realtime WebSocket event to all currently connected clients
        try {
            await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`
                },
                body: JSON.stringify({
                    messages: [
                        {
                            topic: 'bms-global',
                            event: 'sys_version_broadcast',
                            payload: {
                                version,
                                notes: singleSentenceMsg
                            }
                        }
                    ]
                })
            });
        } catch (rtErr) {
            console.warn('[Update Push] Realtime broadcast notice:', rtErr.message);
        }

        return res.status(200).json({
            success: true,
            version,
            message: singleSentenceMsg,
            totalSubscribers: subscriptions.length,
            deliveredCount,
            failedCount,
            canSendWebPush
        });
    } catch (err) {
        console.error('[Update Push API Error]', err);
        return res.status(500).json({ error: 'Update push broadcast failed: ' + err.message });
    }
}
