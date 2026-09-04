// ─────────────────────────────────────────────────────────────────────────────
// BMSTZ WebPush Broadcast API — Serverless Dispatcher
// Path: /api/push/broadcast
// ─────────────────────────────────────────────────────────────────────────────
import webpush from 'web-push';

async function verifySysAdmin(supabaseUrl, serviceKey, userToken) {
    const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${userToken}`
        }
    });
    if (!userRes.ok) return false;
    const user = await userRes.json();
    if (!user || !user.id) return false;

    // Check sysadmin
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/check_is_sysadmin`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`
        },
        body: JSON.stringify({ p_user_id: user.id })
    });

    if (!rpcRes.ok) {
        return false;
    }
    const isAdmin = await rpcRes.json();
    return isAdmin === true;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const rawVapidPub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || 'BNJ1FTRqt1o-s8HeQnURhp8plIz8tMUpORz-0dhbNQTAIJymY3mAzfMUWp6Km1mbIi6f-zSGxz17UZ5PL_QUo-g';
    const rawVapidPriv = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;

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

    // 1. Verify Sysadmin authentication
    const authHeader = req.headers['authorization'] || '';
    const userToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!userToken) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const isSysAdmin = await verifySysAdmin(supabaseUrl, serviceKey, userToken);
    if (!isSysAdmin) {
        return res.status(403).json({ error: 'Forbidden: Sysadmin permissions required' });
    }

    const { title, body, target_audience = 'all', target_url = '/app/#view=overview', image_url = null, icon = '/bmtzofficiallogo.png' } = req.body || {};

    if (!title || !body) {
        return res.status(400).json({ error: 'Title and body are required.' });
    }

    // Configure WebPush with VAPID keys if provided
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
            console.warn('[Push API] VAPID config error:', vapidErr.message);
        }
    }

    try {
        // Fetch active subscriptions
        let query = `${supabaseUrl}/rest/v1/sys_push_subscriptions?is_active=eq.true&select=id,endpoint,p256dh,auth,role`;
        if (target_audience === 'owners') {
            query += '&role=eq.owner';
        } else if (target_audience === 'managers') {
            query += '&role=eq.branch';
        } else if (target_audience === 'sysadmins') {
            query += '&role=eq.sysadmin';
        }

        const subsRes = await fetch(query, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });

        const subscriptions = subsRes.ok ? await subsRes.json() : [];

        const payload = JSON.stringify({
            title,
            body,
            icon,
            badge: '/bmtzofficiallogo.png',
            image_url,
            target_url,
            tag: 'bms-broadcast-' + Date.now()
        });

        let deliveredCount = 0;
        let failedCount = 0;
        const expiredIds = [];

        if (canSendWebPush && Array.isArray(subscriptions)) {
            await Promise.all(subscriptions.map(async (sub) => {
                if (!sub.endpoint || !sub.p256dh || !sub.auth || sub.endpoint.startsWith('https://bms.internal')) {
                    // Non-WebPush or fallback token
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
                    // If subscription has expired / unsubscribed (410 Gone or 404 Not Found)
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

        return res.status(200).json({
            success: true,
            totalSubscribers: subscriptions.length,
            deliveredCount,
            failedCount,
            canSendWebPush
        });
    } catch (err) {
        console.error('[Push API Error]', err);
        return res.status(500).json({ error: 'Push broadcast failed: ' + err.message });
    }
}
