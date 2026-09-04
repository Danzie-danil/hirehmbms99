// ─────────────────────────────────────────────────────────────────────────────
// BMSTZ AI Chat API — Serverless Shell Proxy
//
// ARCHITECTURE & SECURITY:
//   - 100% of prompt assembly, role boundaries, plan feature gating, and admin
//     intent checks are compiled authoritatively inside Supabase Postgres via the
//     `get_compiled_ai_system_prompt(userId, message)` RPC.
//   - Flexible Auth: Automatically uses verified 3-part JWT tokens for PostgREST.
//   - Resilient Fallback: Built-in failover prompt and multi-model failover.
// ─────────────────────────────────────────────────────────────────────────────

function isJwt(token) {
    return typeof token === 'string' && token.split('.').length === 3;
}

async function callRpc(supabaseUrl, anonKey, userToken, serviceKey, rpcName, params) {
    const bearer = isJwt(serviceKey) ? serviceKey : (isJwt(userToken) ? userToken : anonKey);
    const apikey = isJwt(anonKey) ? anonKey : (isJwt(serviceKey) ? serviceKey : bearer);

    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': apikey,
            'Authorization': `Bearer ${bearer}`
        },
        body: JSON.stringify(params)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(`RPC ${rpcName} failed: ${JSON.stringify(data)}`);
    return data;
}

async function verifyJwt(supabaseUrl, anonKey, serviceKey, token) {
    if (!token || !isJwt(token)) return null;
    const apikey = isJwt(anonKey) ? anonKey : (isJwt(serviceKey) ? serviceKey : token);
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
            'apikey': apikey,
            'Authorization': `Bearer ${token}`
        }
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id || null;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const groqApiKey   = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY;
    const supabaseUrl  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const anonKey      = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const serviceKey   = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY;

    if (!groqApiKey)  return res.status(500).json({ error: 'GROQ_API_KEY is not configured in environment variables.' });
    if (!supabaseUrl) return res.status(500).json({ error: 'SUPABASE_URL is not configured in environment variables.' });
    if (!anonKey && !serviceKey) return res.status(500).json({ error: 'SUPABASE_ANON_KEY is not configured in environment variables.' });

    try {
        // ── 1. Authenticate user session JWT ──────────────────────────────────
        const authHeader = req.headers['authorization'] || '';
        const userToken  = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;

        if (!userToken) {
            return res.status(401).json({ error: 'Authentication required. Please sign in.' });
        }

        const userId = await verifyJwt(supabaseUrl, anonKey, serviceKey, userToken);
        if (!userId) {
            return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
        }

        // ── 1b. Enforce Server-Side Rate Limiting ─────────────────────────────
        try {
            const isWithinLimit = await callRpc(supabaseUrl, anonKey, userToken, serviceKey, 'check_rate_limit', {
                p_identifier: userId,
                p_action: 'chatbot_request',
                p_limit: 30,
                p_window_seconds: 60
            });
            if (isWithinLimit === false) {
                return res.status(429).json({ error: 'Chatbot rate limit exceeded. Please wait a moment before sending more messages.' });
            }
        } catch (rlErr) {
            console.warn('[AI] Rate limit check notice (non-fatal):', rlErr.message);
        }

        // ── 2. Parse request payload ─────────────────────────────────────────
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
        const { message, prompt, device_type, telemetry } = body || {};
        const userMessage = message || prompt;

        if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
            return res.status(400).json({ error: 'Message is required.' });
        }
        if (userMessage.length > 8000) {
            return res.status(400).json({ error: 'Message is too long. Please shorten your question.' });
        }

        const deviceType = device_type || (req.headers['user-agent'] && /mobile|android|iphone|ipad/i.test(req.headers['user-agent']) ? 'mobile' : 'desktop');
        const isMobile = deviceType === 'mobile';

        // ── 3. Fetch authoritatively compiled system prompt & history from RPC ──
        let systemPrompt = '';
        let historyContext = [];
        let rpcRole = 'owner';
        let rpcPlan = 'exclusive';
        let rpcScope = 'analytics';

        try {
            const compiled = await callRpc(supabaseUrl, anonKey, userToken, serviceKey, 'get_compiled_ai_system_prompt', {
                p_user_id: userId,
                p_message: userMessage,
                p_device: deviceType
            });

            if (compiled) {
                if (!compiled.ai_access) {
                    const reason = compiled.reason || 'unknown';
                    let msg = 'The AI Assistant & Strategic Analytics is an Exclusive plan feature. Please upgrade your subscription to access it.';
                    if (reason === 'ai_security_lockout') {
                        msg = 'Your AI Assistant access has been suspended for 3 days due to security policy violations (unauthorized admin operation attempt).';
                    } else if (reason === 'subscription_inactive') {
                        msg = 'Your subscription is inactive. Please renew your plan to use the AI Assistant.';
                    } else if (reason === 'plan_insufficient_enterprise' || reason === 'plan_insufficient_starter') {
                        msg = 'The AI Assistant & Strategic Analytics is an Exclusive plan feature. Please upgrade your plan to access it.';
                    }
                    return res.status(403).json({ error: msg, lockout: reason === 'ai_security_lockout', blocked_until: compiled.blocked_until });
                }

                systemPrompt = compiled.system_prompt || '';
                historyContext = Array.isArray(compiled.history_context) ? compiled.history_context : [];
                rpcRole = compiled.role || 'owner';
                rpcPlan = compiled.plan || 'exclusive';
                rpcScope = compiled.scope || 'analytics';
            }
        } catch (rpcErr) {
            console.warn('[AI] Server prompt compilation notice (using resilient fallback):', rpcErr.message);
        }

        // Resilient fallback prompt if RPC was bypassed or network fallback occurred
        if (!systemPrompt) {
            systemPrompt = `You are the BMSTz AI Strategic Intelligence Business Analyst embedded inside the BMSTz platform.
Current User: Authenticated Business User (Owner / Branch Manager).
Device Layout: ${isMobile ? 'MOBILE (Smartphone)' : 'DESKTOP (Computer)'}.

STRICT TENANT PRIVACY & BOUNDARY RULES:
1. You are strictly bound to the authenticated user's business data only.
2. NEVER discuss, reference, fabricate, or disclose other businesses' data or platform administrative controls.
3. Provide sharp, insightful, professional business analysis, inventory guidance, and financial summaries using real-time figures.
4. If answering analytics queries, format with clean Markdown headings (### or ####), tables (| Column |), and bullet points (- ).
5. NEVER use database column names, JSON brackets, or raw code variables in responses.
6. TABLE DESIGN: Keep tables compact (3-4 columns maximum). Do not use extra-wide unbroken single-line strings; write natural descriptions that wrap comfortably across lines within the table.
7. If the prompt is in Swahili, respond fluently in Swahili (Kiswahili). If in English, respond in English.`;
        }

        // Append validated client telemetry if provided (e.g. from AI Analytics module - combining cloud and local data)
        if (telemetry && typeof telemetry === 'string' && telemetry.length < 15000) {
            // Remove any older/empty Postgres telemetry block to prevent prompt conflicts
            if (systemPrompt.includes('CURRENT LIVE BUSINESS TELEMETRY') || systemPrompt.includes('CURRENT LIVE BRANCH TELEMETRY')) {
                systemPrompt = systemPrompt.replace(/CURRENT LIVE (BUSINESS|BRANCH) TELEMETRY[\s\S]*?(?=\n\n|\n[A-Z0-9_]+:|$)/gi, '').trim();
            }
            systemPrompt += `\n\n═══════════════════════════════════════════════════════════════════════════════\nVERIFIED REAL-TIME BUSINESS TELEMETRY (COMBINED CLOUD + LOCAL STORAGE):\n${telemetry}\n═══════════════════════════════════════════════════════════════════════════════\nCRITICAL INSTRUCTION: You MUST base your analysis, numbers, and recommendations on the verified telemetry above. Do NOT state that there are no branches, no data, or zero sales when branches and figures are provided in the telemetry dossier.`;
        }

        // ── 4. Forward compiled prompt & conversation history to Groq with model failover ──
        let finalUserMessage = userMessage;
        if (telemetry && typeof telemetry === 'string' && telemetry.length > 30) {
            finalUserMessage = `REAL-TIME TELEMETRY DATA (CLOUD + LOCAL COMBINED):\n${telemetry}\n\nUSER PROMPT:\n${userMessage}`;
        }

        const candidateModels = [
            'groq/compound-mini',
            'openai/gpt-oss-120b',
            'groq/compound',
            'openai/gpt-oss-20b',
            'qwen/qwen3.6-27b'
        ];
        let reply = '';
        let lastGroqError = null;

        for (const model of candidateModels) {
            try {
                const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${groqApiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            ...historyContext,
                            { role: 'user',   content: finalUserMessage }
                        ],
                        temperature: 0.2,
                        max_tokens: 1500
                    })
                });

                if (groqResponse.ok) {
                    const groqData = await groqResponse.json();
                    let rawContent = groqData.choices?.[0]?.message?.content || '';
                    if (rawContent.includes('</think>')) {
                        rawContent = rawContent.split('</think>')[1].trim();
                    } else if (rawContent.startsWith('<think>')) {
                        rawContent = '';
                    }
                    if (rawContent && rawContent.trim()) {
                        reply = rawContent.trim();
                        break;
                    }
                } else {
                    const errText = await groqResponse.text();
                    lastGroqError = `Model ${model} returned ${groqResponse.status}: ${errText}`;
                    console.warn('[AI] Groq attempt warning:', lastGroqError);
                }
            } catch (fetchErr) {
                lastGroqError = fetchErr.message;
                console.warn(`[AI] Groq fetch error on ${model}:`, fetchErr.message);
            }
        }

        if (!reply || !reply.trim()) {
            console.error('[AI] All Groq models failed:', lastGroqError);
            return res.status(503).json({ error: 'AI service is temporarily busy. Please try again in a few seconds.' });
        }

        // ── 5. Asynchronously log request to audit ledger in Supabase ─────────
        callRpc(supabaseUrl, anonKey, userToken, serviceKey, 'log_ai_request', {
            p_user_id:      userId,
            p_role:         rpcRole,
            p_plan:         rpcPlan,
            p_scope:        rpcScope,
            p_msg_length:   userMessage.length,
            p_admin_intent: false
        }).catch(e => console.warn('[AI] Audit log notice (non-fatal):', e.message));

        return res.status(200).json({ reply });

    } catch (err) {
        console.error('[AI Handler Error]', err);
        return res.status(500).json({ error: 'Failed to communicate with AI server: ' + err.message });
    }
}
