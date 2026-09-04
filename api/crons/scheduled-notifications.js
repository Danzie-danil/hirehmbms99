// ─────────────────────────────────────────────────────────────────────────────
// Vercel Cron Job: Multi-Role Scheduled Push Notification Dispatcher
// Path: /api/crons/scheduled-notifications
// Enforces Admin Global Toggles (sys_settings) & User Preferences (sys_push_subscriptions.preferences)
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
            console.warn('[Scheduled Cron] VAPID config error:', vapidErr.message);
        }
    }

    // Determine slot from query parameter or map by current UTC hour
    const currentUtcHour = new Date().getUTCHours();
    let slot = req.query?.slot || req.query?.type;

    if (!slot) {
        if (currentUtcHour >= 3 && currentUtcHour < 6) {
            slot = 'morning';
        } else if (currentUtcHour >= 6 && currentUtcHour < 9) {
            slot = 'branch_tasks_check';
        } else if (currentUtcHour >= 9 && currentUtcHour < 14) {
            slot = 'afternoon';
        } else if (currentUtcHour >= 14 && currentUtcHour < 18) {
            slot = 'branch_shift_close';
        } else {
            slot = 'evening';
        }
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
                if (masterCronFlags && masterCronFlags[slot] === false) {
                    console.log(`[Scheduled Cron] Slot '${slot}' is disabled globally by administrator.`);
                    return res.status(200).json({
                        success: true,
                        slot,
                        skipped: true,
                        reason: 'Disabled globally by administrator'
                    });
                }
            }
        }
    } catch (e) {
        console.warn('[Scheduled Cron] Master settings check warning:', e.message);
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Notification slot configurations
    const slotConfigs = {
        // --- Branch Staff & Cashiers ---
        branch_shift_open: {
            roles: ['branch'],
            title: 'Shift & Till Opening ☀️',
            body: 'Good morning! Time to open your daily shift and verify your opening cash drawer balance.',
            targetUrl: '/app/#view=cash_drawer',
            tag: `bms-branch-open-${todayStr}`
        },
        branch_tasks_check: {
            roles: ['branch'],
            title: 'Daily Tasks & Objectives 📋',
            body: "Review today's assigned tasks and performance targets set by business management.",
            targetUrl: '/app/#view=tasks',
            tag: `bms-branch-tasks-${todayStr}`
        },
        branch_midday_restock: {
            roles: ['branch'],
            title: 'Midday Stock & Restock Pulse 📦',
            body: 'Midday check: Inspect fast-moving inventory and submit branch restock requests if stock is low.',
            targetUrl: '/app/#view=requests',
            tag: `bms-branch-restock-${todayStr}`
        },
        branch_shift_close: {
            roles: ['branch'],
            title: 'Shift Closing & Till Reconciliation 🔔',
            body: 'End of trade: Count cash drawer, reconcile sales payments, and close your daily shift.',
            targetUrl: '/app/#view=cash_drawer',
            tag: `bms-branch-close-${todayStr}`
        },
        branch_daily_report: {
            roles: ['branch'],
            title: 'Daily Work Handover 📝',
            body: 'Please confirm all recorded expenses, sales transactions, and shift summaries are submitted.',
            targetUrl: '/app/#view=shift_summary',
            tag: `bms-branch-report-${todayStr}`
        },
        unclosed_shift_check: {
            roles: ['branch'],
            title: 'Open Shift Reminder ⚠️',
            body: 'You have an active shift that has not been closed yet. Tap to reconcile and close shift.',
            targetUrl: '/app/#view=cash_drawer',
            tag: `bms-unclosed-shift-${todayStr}`
        },

        // --- Business Owners ---
        owner_morning: {
            roles: ['owner'],
            title: 'Morning Operations Briefing ☀️',
            body: 'Opening readiness: Check branch status, staff attendance, and pending requests.',
            targetUrl: '/app/#view=overview',
            tag: `bms-owner-morning-${todayStr}`
        },
        owner_credit_followup: {
            roles: ['owner'],
            title: 'Credit & Debtor Follow-up 💰',
            body: 'Review overdue customer credit balances and scheduled loan collections for today.',
            targetUrl: '/app/#view=customers',
            tag: `bms-owner-credit-${todayStr}`
        },
        owner_midday: {
            roles: ['owner'],
            title: 'Midday Business Pulse 📊',
            body: 'Midday check: Track live gross sales, branch revenue rankings, and cashier transactions.',
            targetUrl: '/app/#view=sales',
            tag: `bms-owner-midday-${todayStr}`
        },
        owner_transfers_check: {
            roles: ['owner'],
            title: 'Restock & Transfer Approvals 🚚',
            body: 'Pending approvals: Review branch stock requests and central warehouse dispatches.',
            targetUrl: '/app/#view=requests',
            tag: `bms-owner-transfers-${todayStr}`
        },
        owner_evening: {
            roles: ['owner'],
            title: 'Daily Revenue & Settlement 🌙',
            body: "Review today's consolidated revenue, gross profit, and reconciled shift drawers.",
            targetUrl: '/app/#view=financial_reports',
            tag: `bms-owner-evening-${todayStr}`
        },

        // --- Universal Combined Aliases ---
        morning: {
            roles: ['owner', 'branch'],
            title: 'BMSTz Morning Briefing ☀️',
            body: 'Good morning! All branches are ready for trade. Tap to review your daily operations.',
            targetUrl: '/app/#view=overview',
            tag: `bms-morning-${todayStr}`
        },
        afternoon: {
            roles: ['owner', 'branch'],
            title: 'BMSTz Midday Check-in 📊',
            body: 'Midday Pulse: Track active branch sales, cash balances, and fast-moving inventory.',
            targetUrl: '/app/#view=sales',
            tag: `bms-afternoon-${todayStr}`
        },
        evening: {
            roles: ['owner', 'branch'],
            title: 'BMSTz Daily Summary 🌙',
            body: "Evening Settlement: Review today's closing revenue, reconciled shifts & restock orders.",
            targetUrl: '/app/#view=financial_reports',
            tag: `bms-evening-${todayStr}`
        }
    };

    const activeConfig = slotConfigs[slot] || slotConfigs.morning;
    const targetRoles = activeConfig.roles || ['owner', 'branch'];

    try {
        console.log(`[Scheduled Cron] Executing slot '${slot}' for roles: [${targetRoles.join(', ')}]...`);

        // Fetch subscriptions matching target roles
        const roleFilter = targetRoles.map(r => `role.eq.${r}`).join(',');
        const query = `${supabaseUrl}/rest/v1/sys_push_subscriptions?is_active=eq.true&or=(${roleFilter})&select=id,endpoint,p256dh,auth,role,branch_id,owner_id,preferences`;

        const subsRes = await fetch(query, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });

        const allSubscriptions = subsRes.ok ? await subsRes.json() : [];

        // 3. User Granular Opt-in / Opt-out Filtering
        const eligibleSubs = allSubscriptions.filter(sub => {
            const userPrefs = typeof sub.preferences === 'string' 
                ? JSON.parse(sub.preferences) 
                : (sub.preferences || {});
            // Enabled by default unless explicitly opted out with false
            return userPrefs[slot] !== false;
        });

        const payload = JSON.stringify({
            title: activeConfig.title,
            body: activeConfig.body,
            icon: '/bmtzofficiallogo.png',
            badge: '/bmtzofficiallogo.png',
            target_url: activeConfig.targetUrl,
            tag: activeConfig.tag
        });

        let deliveredCount = 0;
        let failedCount = 0;
        const expiredIds = [];

        if (canSendWebPush && Array.isArray(eligibleSubs)) {
            await Promise.all(eligibleSubs.map(async (sub) => {
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

            // Invalidate dead tokens
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
            slot,
            targetRoles,
            title: activeConfig.title,
            body: activeConfig.body,
            targetUrl: activeConfig.targetUrl,
            totalSubscribers: allSubscriptions.length,
            eligibleSubscribers: eligibleSubs.length,
            deliveredCount,
            failedCount,
            canSendWebPush,
            executedAt: new Date().toISOString()
        });

    } catch (err) {
        console.error('[Scheduled Push Error]', err);
        return res.status(500).json({ error: 'Scheduled push execution error: ' + err.message });
    }
}
