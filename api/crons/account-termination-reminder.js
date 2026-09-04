// ─────────────────────────────────────────────────────────────────────────────
// Vercel Cron Job / Serverless Function: Account Termination 3-Day Warning Alert
// Path: /api/crons/account-termination-reminder
// Description: Automatically detects business accounts scheduled for deletion within
//              3 days, sends an urgent reminder email & push notification with options
//              to keep/reactivate the account or proceed with termination.
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

function generateReminderEmailHTML(profile, scheduledDateFormatted, daysLeft, appUrl) {
    const businessName = profile.business_name || 'Business Account';
    const fullName = profile.full_name || 'Business Owner';

    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Account Termination Warning</title>
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; }
            .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); }
            .header { padding: 32px 32px 24px; text-align: center; background: linear-gradient(180deg, #fff7ed 0%, #ffffff 100%); border-bottom: 1px solid #fed7aa; }
            .badge { display: inline-block; padding: 6px 14px; background-color: #ea580c; color: #ffffff; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; border-radius: 100px; margin-bottom: 16px; }
            .title { font-size: 22px; font-weight: 800; color: #9a3412; margin: 0; line-height: 1.3; }
            .content { padding: 32px; font-size: 14px; line-height: 1.6; color: #475569; }
            .alert-box { background-color: #fff7ed; border: 1px solid #ffedd5; border-left: 4px solid #ea580c; padding: 16px 20px; border-radius: 12px; margin: 20px 0; }
            .alert-box strong { color: #9a3412; display: block; margin-bottom: 4px; font-size: 15px; }
            .choice-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin-bottom: 16px; }
            .choice-title { font-weight: 700; font-size: 15px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
            .btn-reactivate { display: inline-block; padding: 12px 24px; background-color: #059669; color: #ffffff !important; text-decoration: none; font-weight: 700; font-size: 14px; border-radius: 12px; box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25); margin-top: 8px; }
            .footer { padding: 24px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <span class="badge">Urgent Notice &bull; ${daysLeft} Days Left</span>
                <h1 class="title">Your BMSTz Account is Scheduled for Permanent Deletion</h1>
            </div>
            <div class="content">
                <p>Hello <strong>${fullName}</strong>,</p>
                <p>This is an automated reminder regarding your BMSTz business account for <strong>${businessName}</strong>.</p>
                
                <div class="alert-box">
                    <strong>Scheduled Purge Date: ${scheduledDateFormatted}</strong>
                    In <strong>${daysLeft} days</strong>, your account, including all branches, staff records, sales history, and inventory ledgers, will be permanently deleted from our servers.
                </div>

                <h3 style="font-size: 16px; font-weight: 800; color: #1e293b; margin: 24px 0 12px;">What would you like to do?</h3>

                <div class="choice-card" style="border-color: #a7f3d0; background-color: #f0fdf4;">
                    <div class="choice-title" style="color: #065f46;">
                        Option 1: Keep Account & Restore All Branches (Recommended)
                    </div>
                    <p style="margin: 0 0 12px; font-size: 13px; color: #047857;">
                        Changed your mind or want to resume business? Simply log in to your owner account and click <strong>Reactivate Account</strong>. All your branches and data will be restored immediately.
                    </p>
                    <a href="${appUrl}" class="btn-reactivate" target="_blank">Keep My Account / Reactivate</a>
                </div>

                <div class="choice-card">
                    <div class="choice-title" style="color: #64748b;">
                        Option 2: Proceed with Permanent Deletion
                    </div>
                    <p style="margin: 0; font-size: 13px; color: #64748b;">
                        If you still wish to permanently delete your account, <strong>no action is needed</strong>. Your data will be automatically and securely wiped on ${scheduledDateFormatted}.
                    </p>
                </div>

                <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">
                    Have questions or need assistance? Contact our team at <a href="mailto:support@bmstz.com" style="color: #4f46e5;">support@bmstz.com</a>.
                </p>
            </div>
            <div class="footer">
                &copy; ${new Date().getFullYear()} BMSTz Enterprise Platform &bull; All Rights Reserved
            </div>
        </div>
    </body>
    </html>
    `;
}

export default async function handler(req, res) {
    // 1. Verify Vercel Cron or manual authorization
    const authHeader = req.headers['authorization'];
    const vercelCronHeader = req.headers['x-vercel-cron'];
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}` && !vercelCronHeader && req.method !== 'GET') {
        return res.status(401).json({ error: 'Unauthorized: Invalid CRON_SECRET or Vercel Cron signature' });
    }

    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const rawVapidPub = process.env.VITE_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
    const rawVapidPriv = process.env.VAPID_PRIVATE_KEY || process.env.VITE_VAPID_PRIVATE_KEY;
    const appUrl = process.env.APP_URL || process.env.VITE_APP_URL || 'https://app.bmstz.com';

    if (!supabaseUrl || !serviceKey) {
        return res.status(500).json({ error: 'Database environment variables missing' });
    }

    // Configure Web Push if keys available
    let canSendWebPush = false;
    if (rawVapidPub && rawVapidPriv) {
        try {
            webpush.setVapidDetails(
                process.env.VAPID_SUBJECT || 'mailto:support@bmstz.com',
                rawVapidPub.trim(),
                normalizePrivateKey(rawVapidPriv)
            );
            canSendWebPush = true;
        } catch (e) {
            console.warn('[Termination Cron] VAPID init error:', e.message);
        }
    }

    try {
        // 2. Fetch profiles scheduled for deletion within 3 days (and not already warned)
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const fetchUrl = `${supabaseUrl}/rest/v1/profiles?status=eq.deletion_requested&deletion_scheduled_for=lte.${threeDaysFromNow.toISOString()}&deletion_scheduled_for=gt.${now.toISOString()}&select=id,full_name,email,business_name,deletion_scheduled_for,deletion_requested_at,deletion_warning_sent_at`;
        
        const profilesRes = await fetch(fetchUrl, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });

        if (!profilesRes.ok) {
            const errText = await profilesRes.text();
            throw new Error(`Failed to query profiles: ${errText}`);
        }

        const candidateProfiles = await profilesRes.json();

        // Filter out those who already received a warning for this deletion request
        const profilesToWarn = candidateProfiles.filter(p => {
            if (!p.deletion_warning_sent_at) return true;
            if (p.deletion_requested_at && new Date(p.deletion_warning_sent_at) < new Date(p.deletion_requested_at)) return true;
            return false;
        });

        if (!profilesToWarn || profilesToWarn.length === 0) {
            return res.status(200).json({
                success: true,
                message: 'No accounts due for 3-day deletion warning at this time.',
                count: 0
            });
        }

        const results = [];

        // 3. Process each candidate profile
        for (const profile of profilesToWarn) {
            const scheduledDate = new Date(profile.deletion_scheduled_for);
            const daysLeft = Math.max(1, Math.ceil((scheduledDate - now) / (1000 * 60 * 60 * 24)));
            const formattedDate = scheduledDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

            const recipientEmail = profile.email;
            let emailSent = false;
            let pushSent = false;

            // A. Dispatch Email via Resend if API key present
            if (resendApiKey && recipientEmail) {
                try {
                    const emailHtml = generateReminderEmailHTML(profile, formattedDate, daysLeft, appUrl);
                    const emailRes = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${resendApiKey}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: process.env.EMAIL_FROM || 'BMSTz Security <security@bmstz.com>',
                            to: [recipientEmail],
                            subject: `⚠️ Action Required: Your BMSTz Account will be permanently deleted in ${daysLeft} days`,
                            html: emailHtml
                        })
                    });
                    if (emailRes.ok) {
                        emailSent = true;
                    } else {
                        console.warn(`[Termination Cron] Resend API error for ${recipientEmail}:`, await emailRes.text());
                    }
                } catch (emailErr) {
                    console.warn(`[Termination Cron] Email sending failed for ${recipientEmail}:`, emailErr.message);
                }
            }

            // B. Dispatch High-Priority Web Push Notification if subscribed
            if (canSendWebPush) {
                try {
                    const subRes = await fetch(`${supabaseUrl}/rest/v1/sys_push_subscriptions?user_id=eq.${profile.id}&select=subscription`, {
                        headers: {
                            'apikey': serviceKey,
                            'Authorization': `Bearer ${serviceKey}`
                        }
                    });
                    if (subRes.ok) {
                        const subs = await subRes.json();
                        for (const s of subs) {
                            if (s.subscription) {
                                try {
                                    const subPayload = typeof s.subscription === 'string' ? JSON.parse(s.subscription) : s.subscription;
                                    await webpush.sendNotification(
                                        subPayload,
                                        JSON.stringify({
                                            title: `⚠️ Account Deletion in ${daysLeft} Days`,
                                            body: `Your BMSTz business account is scheduled for permanent purge on ${formattedDate}. Tap to keep or reactivate your account.`,
                                            icon: '/bmstzlogo.png',
                                            badge: '/badge.png',
                                            tag: 'account-termination-warning',
                                            data: { url: '/app/index.html' }
                                        })
                                    );
                                    pushSent = true;
                                } catch (pushErr) {}
                            }
                        }
                    }
                } catch (pushFetchErr) {}
            }

            // C. Insert In-App Notification Record
            try {
                await fetch(`${supabaseUrl}/rest/v1/notifications`, {
                    method: 'POST',
                    headers: {
                        'apikey': serviceKey,
                        'Authorization': `Bearer ${serviceKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({
                        user_id: profile.id,
                        title: `⚠️ Account Deletion in ${daysLeft} Days`,
                        message: `Your account will be permanently purged on ${formattedDate}. Log in before this date to reactivate your account and keep your data.`,
                        type: 'warning',
                        created_at: new Date().toISOString()
                    })
                });
            } catch (notifErr) {}

            // D. Stamp deletion_warning_sent_at on profile so warning is sent only once
            await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${profile.id}`, {
                method: 'PATCH',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    deletion_warning_sent_at: new Date().toISOString()
                })
            });

            // E. Audit Log
            await fetch(`${supabaseUrl}/rest/v1/sys_audit_logs`, {
                method: 'POST',
                headers: {
                    'apikey': serviceKey,
                    'Authorization': `Bearer ${serviceKey}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({
                    user_id: profile.id,
                    action: 'TERMINATION_WARNING_DISPATCHED',
                    entity_type: 'profiles',
                    entity_id: String(profile.id),
                    details: {
                        days_left: daysLeft,
                        scheduled_for: profile.deletion_scheduled_for,
                        email_sent: emailSent,
                        push_sent: pushSent
                    },
                    created_at: new Date().toISOString()
                })
            });

            results.push({
                profile_id: profile.id,
                email: recipientEmail,
                days_left: daysLeft,
                email_sent: emailSent,
                push_sent: pushSent
            });
        }

        return res.status(200).json({
            success: true,
            message: `Dispatched 3-day deletion warnings to ${results.length} account(s).`,
            dispatched: results
        });

    } catch (err) {
        console.error('[Termination Cron] Fatal error:', err);
        return res.status(500).json({ error: err.message });
    }
}
