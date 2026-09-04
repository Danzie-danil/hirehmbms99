import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { showToast, showLoader, hideLoader } from '../utils.js';
import { sysadminInspectTenant } from './impersonation.js';

let handshakeChannel = null;
let currentHandshakeTenant = null;

export function promptInspectionModeChoice(tenantId, passedName = null, passedEmail = null) {
    const adminProfiles = window.adminProfiles || [];
    let tenantProfile = adminProfiles.find(p => p.id === tenantId);

    if (!tenantProfile && window.adminBranches) {
        const branch = window.adminBranches.find(b => b.owner_id === tenantId);
        if (branch) {
            tenantProfile = {
                id: tenantId,
                business_name: branch.owner_business_name || branch.name || 'Business Tenant',
                email: branch.owner_email || 'Registered Tenant Email'
            };
        }
    }

    const businessName = passedName || tenantProfile?.business_name || tenantProfile?.full_name || 'Business Tenant';
    const email = (passedEmail && passedEmail !== 'N/A') ? passedEmail : (tenantProfile?.email && tenantProfile.email !== 'N/A' ? tenantProfile.email : 'Registered Tenant Email');

    currentHandshakeTenant = { id: tenantId, business_name: businessName, email };

    let modal = document.getElementById('handshakeChoiceModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'handshakeChoiceModal';
        document.body.appendChild(modal);
    }

    modal.className = 'fixed inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-xl z-[99999] flex items-center justify-center p-4 animate-fade-in select-none';
    modal.innerHTML = `
        <div class="bg-white/95 dark:bg-slate-900/95 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-slate-700/80 space-y-6 animate-scale-up text-gray-900 dark:text-white relative overflow-hidden">
            <!-- Background Ambient Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-24 -left-24 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

            <!-- Header -->
            <div class="flex items-center justify-between border-b border-gray-100 dark:border-slate-800 pb-4 relative z-10">
                <div class="flex items-center gap-3.5">
                    <div class="w-11 h-11 rounded-2xl bg-indigo-600 dark:bg-gradient-to-br dark:from-indigo-500 dark:to-purple-600 text-white flex items-center justify-center font-black shadow-md shadow-indigo-500/20 shrink-0">
                        <i data-lucide="shield-check" class="w-5.5 h-5.5"></i>
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-black tracking-tight text-gray-900 dark:text-white">Select Inspection Mode</h3>
                        <p class="text-xs text-gray-500 dark:text-slate-400 font-medium">Inspecting workspace: <span class="text-indigo-600 dark:text-indigo-400 font-bold">${escapeHtml(businessName)}</span></p>
                    </div>
                </div>
                <button onclick="document.getElementById('handshakeChoiceModal').remove()" class="p-2 text-gray-400 dark:text-slate-400 hover:text-gray-700 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer">
                    <i data-lucide="x" class="w-4.5 h-4.5"></i>
                </button>
            </div>

            <!-- Options Container with Horizontal Separators -->
            <div class="divide-y divide-gray-100 dark:divide-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700/80 overflow-hidden bg-gray-50/50 dark:bg-slate-800/40 relative z-10">
                <!-- Option 1: Direct Read-Only Access -->
                <button onclick="window.selectStealthInspection('${tenantId}')" class="w-full text-left p-5 hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-all group cursor-pointer space-y-2">
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 font-black text-sm text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors">
                            <div class="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                <i data-lucide="eye" class="w-4 h-4"></i>
                            </div>
                            <span>Direct Read-Only Access</span>
                        </div>
                        <span class="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-slate-700/80 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-600/50 shrink-0">
                            Silent / Read-Only
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed font-medium pl-11">
                        Access workspace metrics silently in read-only mode for audit & quick diagnostics. Does not interrupt the tenant owner.
                    </p>
                </button>

                <!-- Option 2: Live Handshake Assistance -->
                <button onclick="window.selectCollaborativeHandshake('${tenantId}')" class="w-full text-left p-5 hover:bg-amber-50/60 dark:hover:bg-amber-950/30 transition-all group cursor-pointer space-y-2">
                    <div class="flex items-center justify-between gap-3">
                        <div class="flex items-center gap-3 font-black text-sm text-gray-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors">
                            <div class="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <i data-lucide="radio-tower" class="w-4 h-4 animate-pulse"></i>
                            </div>
                            <span>Live Handshake Assistance</span>
                        </div>
                        <span class="text-[10px] font-black uppercase px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-500/40 shrink-0 flex items-center gap-1.5">
                            <span class="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                            Permission Required
                        </span>
                    </div>
                    <p class="text-xs text-gray-500 dark:text-slate-400 leading-relaxed font-medium pl-11">
                        Sends a live request to <span class="font-bold text-gray-800 dark:text-slate-200">${escapeHtml(email)}</span>. Once granted by the owner, live screen navigation and guided assistance begin in real time.
                    </p>
                </button>
            </div>

            <!-- Footer -->
            <div class="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-slate-800 relative z-10 text-xs text-gray-400 dark:text-slate-400">
                <span class="flex items-center gap-1.5 text-[11px]"><i data-lucide="lock" class="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400"></i> Encrypted Audit-Logged Session</span>
                <button onclick="document.getElementById('handshakeChoiceModal').remove()" class="px-4 py-2 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer">
                    Cancel
                </button>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.selectStealthInspection = function(tenantId) {
    const modal = document.getElementById('handshakeChoiceModal');
    if (modal) modal.remove();
    sysadminInspectTenant(tenantId);
};

window.selectCollaborativeHandshake = function(tenantId, passedName = null, passedEmail = null) {
    const modal = document.getElementById('handshakeChoiceModal');
    if (modal) modal.remove();
    initHandshakeRequest(tenantId, passedName, passedEmail);
};

export async function initHandshakeRequest(tenantId, passedName = null, passedEmail = null) {
    const adminProfiles = window.adminProfiles || [];
    let tenantProfile = adminProfiles.find(p => p.id === tenantId);

    if (!tenantProfile && window.adminBranches) {
        const branch = window.adminBranches.find(b => b.owner_id === tenantId);
        if (branch) {
            tenantProfile = {
                id: tenantId,
                business_name: branch.owner_business_name || branch.name || 'Business Tenant',
                email: branch.owner_email || 'Registered Tenant Email'
            };
        }
    }

    if (!tenantProfile) {
        tenantProfile = { id: tenantId, business_name: 'Business Tenant', email: 'Registered Tenant Email' };
    }

    if (passedName) tenantProfile.business_name = passedName;
    if (passedEmail) tenantProfile.email = passedEmail;

    currentHandshakeTenant = tenantProfile;
    const businessName = tenantProfile.business_name || tenantProfile.full_name || 'Business Tenant';

    showLoader(`Verifying Sysadmin Privileges & Requesting Handshake...`);

    // 1. Call Secure Supabase Database RPC to verify Sysadmin and insert authoritative request record
    let dbRecord = null;
    try {
        const { data, error } = await supabase.rpc('request_sysadmin_handshake', { p_tenant_id: tenantId });
        if (error) {
            console.warn('[Sysadmin RPC Verification Failed, falling back to direct auth check]:', error.message);
            // Fallback authorization check if database migration is pending
            const isAuthorized = state.role === 'sysadmin' || state.profile?.role === 'sysadmin';
            if (!isAuthorized) {
                hideLoader();
                showToast('Unauthorized: Verified Sysadmin privileges required.', 'error');
                return;
            }
        } else if (data) {
            dbRecord = Array.isArray(data) ? data[0] : data;
        }
    } catch (rpcErr) {
        console.warn('[RPC Exception]:', rpcErr);
    }

    // Clean up previous channel if any
    if (handshakeChannel) {
        supabase.removeChannel(handshakeChannel);
    }

    handshakeChannel = supabase.channel(`bms-handshake-${tenantId}`, {
        config: { broadcast: { self: false } }
    });

    handshakeChannel
        .on('broadcast', { event: 'HANDSHAKE_RESPONSE' }, ({ payload }) => {
            hideLoader();
            if (payload && payload.status === 'approved') {
                showToast(`Handshake Granted by ${businessName}! Starting Live Assistance Session.`, 'success');
                startLiveHandshakeSession(tenantProfile);
            } else {
                showToast(`Handshake Request Declined by ${businessName}.`, 'error');
                cleanupHandshakeChannel();
            }
        })
        .on('broadcast', { event: 'HANDSHAKE_TERMINATE' }, ({ payload }) => {
            showToast(`Live Support Session Terminated by Owner.`, 'warning');
            exitHandshakeSession();
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                // Send broadcast request to owner with verified request token
                handshakeChannel.send({
                    type: 'broadcast',
                    event: 'HANDSHAKE_REQUEST',
                    payload: {
                        sysadmin_id: state.profile?.id || 'sysadmin',
                        sysadmin_email: 'BMS Official System Support',
                        target_tenant_id: tenantId,
                        request_token: dbRecord?.request_token || 'verified_sysadmin_session',
                        verified_by_supabase: true,
                        timestamp: new Date().toISOString()
                    }
                });

                // Show awaiting dialog
                renderAwaitingHandshakeModal(tenantProfile);
            }
        });
}

function renderAwaitingHandshakeModal(tenant) {
    hideLoader();
    let modal = document.getElementById('awaitingHandshakeModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'awaitingHandshakeModal';
        document.body.appendChild(modal);
    }

    const businessName = tenant.business_name || tenant.full_name || 'Business Tenant';

    modal.className = 'fixed inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-xl z-[999999] flex items-center justify-center p-4 animate-fade-in select-none';
    modal.innerHTML = `
        <div class="bg-white/95 dark:bg-slate-900/95 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-amber-200 dark:border-amber-500/40 text-center space-y-5 animate-scale-up text-gray-900 dark:text-white">
            <div class="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-200 dark:border-amber-500/40 animate-pulse">
                <i data-lucide="radio-tower" class="w-8 h-8"></i>
            </div>
            
            <div class="space-y-1.5">
                <h3 class="text-lg font-black text-gray-900 dark:text-white">Awaiting Owner Approval</h3>
                <p class="text-xs text-gray-500 dark:text-slate-400">
                    Handshake request sent live to <span class="font-black text-amber-600 dark:text-amber-400">${escapeHtml(businessName)}</span> screen...
                </p>
            </div>

            <div class="p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 font-medium flex items-center justify-center gap-2">
                <div class="w-2 h-2 rounded-full bg-amber-500 animate-ping"></div>
                <span>Waiting for owner to click "Grant Live Access"</span>
            </div>

            <button onclick="window.cancelHandshakeRequest()" class="w-full py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer">
                Cancel Request
            </button>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.cancelHandshakeRequest = function() {
    const modal = document.getElementById('awaitingHandshakeModal');
    if (modal) modal.remove();
    cleanupHandshakeChannel();
    showToast('Handshake request cancelled.', 'info');
};

async function startLiveHandshakeSession(tenantProfile) {
    const modal = document.getElementById('awaitingHandshakeModal');
    if (modal) modal.remove();

    window.isHandshakeActive = true;
    window.handshakeTenantId = tenantProfile.id;

    // First initialize standard inspection context
    await sysadminInspectTenant(tenantProfile.id);

    // Render floating Live Assistance Control Bar
    renderSysadminHandshakeBar(tenantProfile);

    // Setup window scroll & interaction tracking
    window.removeEventListener('scroll', handleSysadminScrollBroadcast, true);
    window.addEventListener('scroll', handleSysadminScrollBroadcast, { passive: true, capture: true });

    setupSysadminInteractionTracking();
}

let mouseMoveThrottle = null;

function setupSysadminInteractionTracking() {
    window.removeEventListener('mousemove', handleSysadminMouseMove);
    window.addEventListener('mousemove', handleSysadminMouseMove, { passive: true });

    window.removeEventListener('click', handleSysadminClick, true);
    window.addEventListener('click', handleSysadminClick, true);

    window.removeEventListener('input', handleSysadminInput, true);
    window.addEventListener('input', handleSysadminInput, { passive: true, capture: true });

    window.removeEventListener('touchstart', handleSysadminTouchStart, true);
    window.addEventListener('touchstart', handleSysadminTouchStart, { passive: true, capture: true });

    window.removeEventListener('touchend', handleSysadminTouchEnd, true);
    window.addEventListener('touchend', handleSysadminTouchEnd, { passive: true, capture: true });
}

let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;

function handleSysadminTouchStart(e) {
    if (!window.isHandshakeActive) return;
    if (!e.touches || e.touches.length === 0) return;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();

    const xPct = touch.clientX / window.innerWidth;
    const yPct = touch.clientY / window.innerHeight;

    let targetSelector = null;
    if (e.target) {
        const targetEl = e.target.closest('button, a, [onclick], input, select, textarea, tr, .cursor-pointer');
        if (targetEl && targetEl.id) {
            targetSelector = '#' + targetEl.id;
        }
    }

    broadcastHandshakeAction('mobile_tap', {
        xPct,
        yPct,
        targetSelector,
        targetText: e.target ? (e.target.innerText || e.target.value || '').trim().slice(0, 40) : ''
    });
}

function handleSysadminTouchEnd(e) {
    if (!window.isHandshakeActive) return;
    if (!e.changedTouches || e.changedTouches.length === 0) return;
    const touch = e.changedTouches[0];
    const touchEndX = touch.clientX;
    const touchEndY = touch.clientY;
    const duration = Date.now() - touchStartTime;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if ((absX > 30 || absY > 30) && duration < 600) {
        let direction = 'down';
        if (absX > absY) {
            direction = deltaX > 0 ? 'right' : 'left';
        } else {
            direction = deltaY > 0 ? 'down' : 'up';
        }

        const startXPct = touchStartX / window.innerWidth;
        const startYPct = touchStartY / window.innerHeight;

        broadcastHandshakeAction('mobile_swipe', {
            direction,
            deltaX,
            deltaY,
            xPct: startXPct,
            yPct: startYPct
        });
    }
}

let typingDebounce = null;
function handleSysadminInput(e) {
    if (!window.isHandshakeActive) return;
    const target = e.target;
    if (!target) return;

    let targetSelector = null;
    if (target.id) {
        targetSelector = '#' + target.id;
    } else if (target.name) {
        targetSelector = `[name="${target.name}"]`;
    } else if (target.placeholder) {
        targetSelector = `[placeholder="${target.placeholder.replace(/"/g, '\\"')}"]`;
    }

    if (!targetSelector) return;

    clearTimeout(typingDebounce);
    typingDebounce = setTimeout(() => {
        broadcastHandshakeAction('input_change', {
            targetSelector,
            value: target.value
        });
    }, 40);
}

function handleSysadminMouseMove(e) {
    if (!window.isHandshakeActive) return;
    if (mouseMoveThrottle) return;
    mouseMoveThrottle = setTimeout(() => {
        mouseMoveThrottle = null;
        const xPct = e.clientX / window.innerWidth;
        const yPct = e.clientY / window.innerHeight;
        broadcastHandshakeAction('mouse_move', { xPct, yPct });
    }, 40);
}

function handleSysadminClick(e) {
    if (!window.isHandshakeActive) return;
    const xPct = e.clientX / window.innerWidth;
    const yPct = e.clientY / window.innerHeight;

    let targetSelector = null;
    let onclickAttr = null;
    if (e.target) {
        const targetEl = e.target.closest('button, a, [onclick], input, select, textarea, tr, .cursor-pointer');
        if (targetEl) {
            if (targetEl.id) {
                targetSelector = '#' + targetEl.id;
            }
            onclickAttr = targetEl.getAttribute('onclick');
        }
    }

    broadcastHandshakeAction('mouse_click', {
        xPct,
        yPct,
        targetSelector,
        onclickAttr,
        targetText: e.target ? (e.target.innerText || e.target.value || '').trim().slice(0, 40) : ''
    });
}

let scrollTimeout = null;
function handleSysadminScrollBroadcast(e) {
    if (!window.isHandshakeActive) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
        const target = e?.target && e.target !== document && e.target !== window ? e.target : null;
        const scrollY = target ? target.scrollTop : (window.scrollY || document.documentElement.scrollTop || 0);
        const maxScroll = target ? (target.scrollHeight - target.clientHeight) : (document.documentElement.scrollHeight - window.innerHeight);
        const scrollPct = maxScroll > 0 ? (scrollY / maxScroll) : 0;

        broadcastHandshakeAction('scroll', {
            scrollY,
            scrollPct,
            targetId: target ? target.id : null
        });
    }, 40);
}

export function broadcastHandshakeAction(actionType, payload) {
    if (!window.isHandshakeActive || !handshakeChannel) return;

    handshakeChannel.send({
        type: 'broadcast',
        event: 'HANDSHAKE_SYNC_ACTION',
        payload: {
            actionType,
            ...payload,
            timestamp: new Date().toISOString()
        }
    }).catch(err => console.warn('[Handshake Broadcast Error]', err));
}

function renderSysadminHandshakeBar(tenant) {
    let bar = document.getElementById('sysadminHandshakeBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'sysadminHandshakeBar';
        document.body.prepend(bar);
    }

    const businessName = tenant.business_name || tenant.full_name || 'Tenant';

    bar.className = 'w-full sticky top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white font-bold text-xs py-2 sm:py-2.5 px-2.5 sm:px-4 z-[999998] flex items-center justify-between gap-2 shadow-lg backdrop-blur-md animate-slide-down select-none border-b border-white/20 overflow-x-auto scrollbar-hide';
    bar.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
            <span class="px-2.5 py-1 bg-black/30 rounded-md text-[11px] font-black uppercase tracking-wider border border-white/30 shrink-0 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                LIVE SUPPORT ACTIVE SESSION
            </span>
            <span class="truncate font-black">Connected to <span class="underline decoration-emerald-300 underline-offset-2">${escapeHtml(businessName)}</span></span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
            <button onclick="window.toggleSysadminBarMinimize(true)" title="Minimize Banner to Glimmering Bubble" class="p-1.5 bg-black/30 hover:bg-black/50 text-white rounded-lg border border-white/30 transition-all cursor-pointer">
                <i data-lucide="minus" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.exitHandshakeSession()" class="px-3 py-1 bg-black/40 hover:bg-black/60 active:scale-95 text-white font-black text-xs rounded-xl border border-white/30 transition-all cursor-pointer">
                End Live Session
            </button>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.toggleSysadminBarMinimize = function(forceMinimize) {
    const bar = document.getElementById('sysadminHandshakeBar');
    let bubble = document.getElementById('sysadminHandshakeBubble');

    const shouldMinimize = forceMinimize !== undefined ? forceMinimize : (bar && !bar.classList.contains('hidden'));

    if (shouldMinimize) {
        if (bar) bar.classList.add('hidden');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.id = 'sysadminHandshakeBubble';
            document.body.appendChild(bubble);
        }
        bubble.className = 'fixed bottom-6 right-6 z-[999998] bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white p-3 rounded-full shadow-2xl border-2 border-emerald-300 animate-bounce cursor-pointer flex items-center gap-2 select-none group hover:scale-105 transition-all';
        bubble.onclick = () => window.toggleSysadminBarMinimize(false);
        bubble.innerHTML = `
            <span class="w-3 h-3 rounded-full bg-emerald-300 animate-ping"></span>
            <span class="text-xs font-black tracking-wider pr-1">LIVE SESSION</span>
            <i data-lucide="maximize-2" class="w-4 h-4 text-emerald-200 group-hover:text-white"></i>
        `;
        if (window.lucide) window.lucide.createIcons();
    } else {
        if (bar) bar.classList.remove('hidden');
        if (bubble) bubble.remove();
    }
};

export function exitHandshakeSession() {
    window.isHandshakeActive = false;
    window.handshakeTenantId = null;

    window.removeEventListener('scroll', handleSysadminScrollBroadcast);
    window.removeEventListener('mousemove', handleSysadminMouseMove);
    window.removeEventListener('click', handleSysadminClick, true);

    const bar = document.getElementById('sysadminHandshakeBar');
    if (bar) bar.remove();

    const bubble = document.getElementById('sysadminHandshakeBubble');
    if (bubble) bubble.remove();

    const modal = document.getElementById('awaitingHandshakeModal');
    if (modal) modal.remove();

    cleanupHandshakeChannel();

    if (typeof window.exitSysadminImpersonation === 'function') {
        window.exitSysadminImpersonation();
    }
}

function cleanupHandshakeChannel() {
    if (handshakeChannel) {
        supabase.removeChannel(handshakeChannel);
        handshakeChannel = null;
    }
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

window.exitHandshakeSession = exitHandshakeSession;
window.broadcastHandshakeAction = broadcastHandshakeAction;
window.exitHandshakeSession = exitHandshakeSession;
window.broadcastHandshakeAction = broadcastHandshakeAction;
window.promptInspectionModeChoice = promptInspectionModeChoice;
