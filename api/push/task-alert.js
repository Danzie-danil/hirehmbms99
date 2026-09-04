// ─────────────────────────────────────────────────────────────────────────────
// BMSTz Task Assignment Event-Driven Push Notification API
// Path: /api/push/task-alert
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
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const rawVapidPub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY || 'BNJ1FTRqt1o-s8HeQnURhp8plIz8tMUpORz-0dhbNQTAIJymY3mAzfMUWp6Km1mbIi6f-zSGxz17UZ5PL_QUo-g';
    const rawVapidPriv = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;

    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Database configuration missing' });
    }

    const { branchId, taskId, title, description, priority = 'Medium', deadline = 'Today' } = req.body || {};

    if (!title) {
        return res.status(400).json({ error: 'Task title is required' });
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
            console.warn('[Task Alert API] VAPID config error:', vapidErr.message);
        }
    }

    try {
        // Query subscriptions: Target branch staff / manager or all branch tokens
        let query = `${supabaseUrl}/rest/v1/sys_push_subscriptions?is_active=eq.true&select=id,endpoint,p256dh,auth,role,branch_id`;
        if (branchId) {
            query += `&or=(branch_id.eq.${branchId},role.eq.branch,role.eq.owner)`;
        } else {
            query += `&role=in.(branch,owner)`;
        }

        const subsRes = await fetch(query, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });

        const subscriptions = subsRes.ok ? await subsRes.json() : [];

        const payload = JSON.stringify({
            title: `📋 New Task: ${title}`,
            body: `Priority: ${priority} • Due: ${deadline}. Tap to view task details.`,
            icon: '/bmtzofficiallogo.png',
            badge: '/bmtzofficiallogo.png',
            target_url: '/app/#view=tasks',
            tag: `bms-task-${taskId || Date.now()}`
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
            title,
            deliveredCount,
            failedCount,
            totalSubscribers: subscriptions.length,
            canSendWebPush
        });

    } catch (err) {
        console.error('[Task Alert API Error]', err);
        return res.status(500).json({ error: 'Task alert dispatch error: ' + err.message });
    }
}
