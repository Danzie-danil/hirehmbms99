import { supabase } from '../supabase.js';
import { state } from '../state.js';
import { showToast } from '../utils.js';

let ownerHandshakeChannel = null;
let isOwnerSyncPaused = false;

export function initOwnerHandshakeListener() {
    if (!state.profile || state.role !== 'owner' || !state.ownerId) return;

    if (ownerHandshakeChannel) {
        supabase.removeChannel(ownerHandshakeChannel);
    }

    ownerHandshakeChannel = supabase.channel(`bms-handshake-${state.ownerId}`, {
        config: { broadcast: { self: false } }
    });

    ownerHandshakeChannel
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'sysadmin_handshake_requests',
                filter: `tenant_id=eq.${state.ownerId}`
            },
            (payload) => {
                const req = payload.new;
                if (req && req.status === 'pending') {
                    renderOwnerHandshakePromptModal({
                        sysadmin_email: req.sysadmin_email,
                        sysadmin_id: req.sysadmin_id,
                        request_token: req.request_token,
                        verified_by_supabase: true
                    });
                }
            }
        )
        .on('broadcast', { event: 'HANDSHAKE_REQUEST' }, ({ payload }) => {
            // Only render broadcast request if verified or if modal isn't already open
            if (payload && payload.verified_by_supabase) {
                renderOwnerHandshakePromptModal(payload);
            }
        })
        .on('broadcast', { event: 'HANDSHAKE_SYNC_ACTION' }, ({ payload }) => {
            handleReceivedSyncAction(payload);
        })
        .on('broadcast', { event: 'HANDSHAKE_TERMINATE' }, () => {
            showToast('Sysadmin ended the live support session.', 'info');
            exitOwnerHandshakeSession(false);
        })
        .subscribe();
}

function renderOwnerHandshakePromptModal(requestPayload) {
    let modal = document.getElementById('ownerHandshakePromptModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'ownerHandshakePromptModal';
        document.body.appendChild(modal);
    }

    const supportLabel = 'BMS Official System Support';

    modal.className = 'fixed inset-0 bg-black/60 dark:bg-slate-950/80 backdrop-blur-xl z-[999999] flex items-center justify-center p-4 animate-fade-in select-none';
    modal.innerHTML = `
        <div class="bg-white/95 dark:bg-slate-900/95 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-200 dark:border-indigo-500/50 space-y-6 animate-scale-up text-gray-900 dark:text-white relative overflow-hidden">
            <!-- Background Ambient Glow -->
            <div class="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

            <div class="flex items-center gap-3.5 border-b border-gray-100 dark:border-slate-800 pb-4 relative z-10">
                <div class="w-12 h-12 rounded-2xl bg-indigo-600 dark:bg-gradient-to-br dark:from-indigo-500 dark:to-purple-600 text-white flex items-center justify-center font-black shrink-0 shadow-md shadow-indigo-500/30 animate-pulse">
                    <i data-lucide="radio-tower" class="w-6 h-6"></i>
                </div>
                <div>
                    <h3 class="text-lg font-black text-gray-900 dark:text-white">Sysadmin Live Support Request</h3>
                    <p class="text-xs text-indigo-600 dark:text-indigo-400 font-bold">${escapeHtml(supportLabel)}</p>
                </div>
            </div>

            <div class="p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/80 border border-gray-200 dark:border-slate-700/80 space-y-2 text-xs text-gray-600 dark:text-slate-300 leading-relaxed relative z-10">
                <p class="font-bold text-gray-900 dark:text-white">What happens when you Grant Access?</p>
                <ul class="list-disc pl-4 space-y-1 text-gray-500 dark:text-slate-400">
                    <li>The system admin can view & help troubleshoot your operational screens in real time.</li>
                    <li>Navigation view switches and scrolling will sync live on your screen.</li>
                    <li>You maintain full control and can <strong>Pause Sync</strong> or <strong>Revoke Access</strong> at any moment.</li>
                </ul>
            </div>

            <div class="flex items-center justify-end gap-3 pt-2 relative z-10">
                <button onclick="window.respondToHandshakeRequest(false)" class="px-5 py-2.5 bg-gray-100 dark:bg-slate-800 hover:bg-gray-200 dark:hover:bg-slate-700 text-gray-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer">
                    Decline
                </button>
                <button onclick="window.respondToHandshakeRequest(true)" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 active:scale-95 cursor-pointer">
                    <i data-lucide="check-circle" class="w-4 h-4"></i>
                    Grant Live Access
                </button>
            </div>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.respondToHandshakeRequest = function(isApproved) {
    const modal = document.getElementById('ownerHandshakePromptModal');
    if (modal) modal.remove();

    if (!ownerHandshakeChannel) return;

    ownerHandshakeChannel.send({
        type: 'broadcast',
        event: 'HANDSHAKE_RESPONSE',
        payload: {
            status: isApproved ? 'approved' : 'declined',
            tenant_id: state.ownerId,
            timestamp: new Date().toISOString()
        }
    });

    if (isApproved) {
        window.isOwnerHandshakeActive = true;
        isOwnerSyncPaused = false;
        renderOwnerHandshakeControlBar();
        showToast('Live Support Access Granted to Sysadmin.', 'success');
    } else {
        showToast('Support Access Request Declined.', 'info');
    }
};

function renderOwnerHandshakeControlBar() {
    let bar = document.getElementById('ownerHandshakeControlBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'ownerHandshakeControlBar';
        document.body.prepend(bar);
    }

    bar.className = 'w-full sticky top-0 left-0 right-0 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white font-bold text-xs py-2 sm:py-2.5 px-2.5 sm:px-4 z-[999999] flex items-center justify-between gap-2 shadow-lg backdrop-blur-md animate-slide-down select-none border-b border-white/20 overflow-x-auto scrollbar-hide';
    bar.innerHTML = `
        <div class="flex items-center gap-2.5 min-w-0">
            <span class="px-2.5 py-1 bg-black/30 rounded-md text-[11px] font-black uppercase tracking-wider border border-white/30 shrink-0 flex items-center gap-2">
                <span class="w-2 h-2 rounded-full bg-emerald-300 animate-ping"></span>
                LIVE SUPPORT ACTIVE SESSION
            </span>
        </div>

        <div class="flex items-center gap-2 shrink-0">
            <button onclick="window.toggleOwnerBarMinimize(true)" title="Minimize Banner to Glimmering Bubble" class="p-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg border border-white/30 transition-all cursor-pointer">
                <i data-lucide="minus" class="w-3.5 h-3.5"></i>
            </button>
            <button onclick="window.toggleOwnerSyncPause()" id="btnPauseOwnerSync" class="px-3 py-1 bg-white/20 hover:bg-white/30 text-white font-bold text-[11px] rounded-lg border border-white/30 transition-all cursor-pointer">
                ${isOwnerSyncPaused ? 'Resume Sync' : 'Pause Sync'}
            </button>
            <button onclick="window.revokeOwnerHandshakeSession()" class="px-3 py-1 bg-rose-700 hover:bg-rose-800 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer">
                Revoke Access & End Session
            </button>
        </div>
    `;

    if (window.lucide) window.lucide.createIcons();
}

window.toggleOwnerBarMinimize = function(forceMinimize) {
    const bar = document.getElementById('ownerHandshakeControlBar');
    let bubble = document.getElementById('ownerHandshakeBubble');

    const shouldMinimize = forceMinimize !== undefined ? forceMinimize : (bar && !bar.classList.contains('hidden'));

    if (shouldMinimize) {
        if (bar) bar.classList.add('hidden');
        if (!bubble) {
            bubble = document.createElement('div');
            bubble.id = 'ownerHandshakeBubble';
            document.body.appendChild(bubble);
        }
        bubble.className = 'fixed bottom-6 right-6 z-[999999] bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 text-white p-3 rounded-full shadow-2xl border-2 border-emerald-300 animate-bounce cursor-pointer flex items-center gap-2 select-none group hover:scale-105 transition-all';
        bubble.onclick = () => window.toggleOwnerBarMinimize(false);
        bubble.innerHTML = `
            <span class="w-3 h-3 rounded-full bg-emerald-300 animate-ping"></span>
            <span class="text-xs font-black tracking-wider pr-1">SYSADMIN SUPPORT</span>
            <i data-lucide="maximize-2" class="w-4 h-4 text-emerald-200 group-hover:text-white"></i>
        `;
        if (window.lucide) window.lucide.createIcons();
    } else {
        if (bar) bar.classList.remove('hidden');
        if (bubble) bubble.remove();
    }
};

window.toggleOwnerSyncPause = function() {
    isOwnerSyncPaused = !isOwnerSyncPaused;
    const btn = document.getElementById('btnPauseOwnerSync');
    if (btn) btn.textContent = isOwnerSyncPaused ? 'Resume Sync' : 'Pause Sync';
    showToast(isOwnerSyncPaused ? 'Live action sync paused.' : 'Live action sync resumed.', 'info');
};

function handleReceivedSyncAction(payload) {
    if (!window.isOwnerHandshakeActive || isOwnerSyncPaused) return;

    if (payload.actionType === 'navigate' && payload.viewId) {
        if (typeof window.switchView === 'function' && state.activeView !== payload.viewId) {
            window.switchView(payload.viewId, payload.extraData);
        }
    } else if (payload.actionType === 'sidebar_state' && typeof payload.isOpen === 'boolean') {
        if (typeof window.toggleSidebar === 'function') {
            window.toggleSidebar(payload.isOpen);
        }
    } else if (payload.actionType === 'scroll') {
        if (typeof payload.scrollY === 'number') {
            window.scrollTo({ top: payload.scrollY, behavior: 'auto' });
            document.documentElement.scrollTop = payload.scrollY;
            document.body.scrollTop = payload.scrollY;
        }

        if (payload.targetId) {
            const targetEl = document.getElementById(payload.targetId);
            if (targetEl) {
                if (typeof payload.scrollPct === 'number') {
                    targetEl.scrollTop = payload.scrollPct * (targetEl.scrollHeight - targetEl.clientHeight);
                } else if (typeof payload.scrollY === 'number') {
                    targetEl.scrollTop = payload.scrollY;
                }
            }
        }

        const scrollContainers = document.querySelectorAll('main, #app-content, #appViewContainer, .overflow-y-auto');
        scrollContainers.forEach(container => {
            if (container.scrollHeight > container.clientHeight) {
                if (typeof payload.scrollPct === 'number') {
                    container.scrollTop = payload.scrollPct * (container.scrollHeight - container.clientHeight);
                } else if (typeof payload.scrollY === 'number') {
                    container.scrollTop = payload.scrollY;
                }
            }
        });
    } else if (payload.actionType === 'input_change' && payload.targetSelector) {
        try {
            const inputEl = document.querySelector(payload.targetSelector);
            if (inputEl) {
                inputEl.value = payload.value;
                inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        } catch (e) {}
    } else if (payload.actionType === 'mobile_tap') {
        renderMobileTouchRipple(payload.xPct, payload.yPct);
        triggerTargetClick(payload);
    } else if (payload.actionType === 'mobile_swipe') {
        renderMobileSwipeIndicator(payload.xPct, payload.yPct, payload.direction);
        
        if (payload.direction === 'up' || payload.direction === 'down') {
            const scrollAmount = (payload.direction === 'down' ? -1 : 1) * (Math.abs(payload.deltaY) || 140);
            window.scrollBy({ top: scrollAmount, behavior: 'smooth' });

            const scrollContainers = document.querySelectorAll('main, #app-content, #appViewContainer, .overflow-y-auto');
            scrollContainers.forEach(container => {
                if (container.scrollHeight > container.clientHeight) {
                    container.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
            });
        } else if (payload.direction === 'left' || payload.direction === 'right') {
            const horizontalContainers = document.querySelectorAll('.overflow-x-auto, nav, .flex-nowrap');
            const scrollAmount = (payload.direction === 'right' ? -1 : 1) * (Math.abs(payload.deltaX) || 140);
            horizontalContainers.forEach(container => {
                if (container.scrollWidth > container.clientWidth) {
                    container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                }
            });
        }
    } else if (payload.actionType === 'mouse_move') {
        updateRemoteCursor(payload.xPct, payload.yPct);
    } else if (payload.actionType === 'mouse_click') {
        renderClickRipple(payload.xPct, payload.yPct);
        triggerTargetClick(payload);
    }
}

function renderMobileTouchRipple(xPct, yPct) {
    const x = xPct * window.innerWidth;
    const y = yPct * window.innerHeight;

    const ripple = document.createElement('div');
    ripple.className = 'fixed pointer-events-none z-[9999999] rounded-full border-2 border-emerald-400 bg-emerald-400/30 animate-ping shadow-lg';
    ripple.style.width = '36px';
    ripple.style.height = '36px';
    ripple.style.left = `${x - 18}px`;
    ripple.style.top = `${y - 18}px`;

    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
}

function renderMobileSwipeIndicator(xPct, yPct, direction) {
    const startX = xPct * window.innerWidth;
    const startY = yPct * window.innerHeight;

    const indicator = document.createElement('div');
    indicator.className = 'fixed pointer-events-none z-[9999999] px-3 py-1.5 rounded-full bg-emerald-600/90 text-white font-black text-xs shadow-xl backdrop-blur-sm border border-emerald-300 flex items-center gap-1.5 transition-all duration-500 ease-out select-none';
    
    let icon = 'arrow-down';
    if (direction === 'up') icon = 'arrow-up';
    if (direction === 'left') icon = 'arrow-left';
    if (direction === 'right') icon = 'arrow-right';

    indicator.style.left = `${Math.max(10, Math.min(window.innerWidth - 130, startX - 40))}px`;
    indicator.style.top = `${Math.max(10, Math.min(window.innerHeight - 60, startY - 20))}px`;
    indicator.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 text-emerald-200"></i> <span class="uppercase tracking-wider text-[10px]">Swipe ${direction}</span>`;

    document.body.appendChild(indicator);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = direction === 'up' ? 'translateY(-30px)' : direction === 'down' ? 'translateY(30px)' : direction === 'left' ? 'translateX(-30px)' : 'translateX(30px)';
    }, 50);

    setTimeout(() => indicator.remove(), 600);
}

function updateRemoteCursor(xPct, yPct) {
    let cursor = document.getElementById('sysadminRemoteCursor');
    if (!cursor) {
        cursor = document.createElement('div');
        cursor.id = 'sysadminRemoteCursor';
        document.body.appendChild(cursor);
    }

    const x = xPct * window.innerWidth;
    const y = yPct * window.innerHeight;

    cursor.className = 'fixed z-[9999999] pointer-events-none transition-all duration-75 ease-out flex items-center gap-1.5 select-none';
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
    cursor.style.transform = 'translate(-4px, -4px)';
    cursor.innerHTML = `
        <div class="w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-lg animate-pulse flex items-center justify-center">
            <div class="w-1.5 h-1.5 rounded-full bg-white"></div>
        </div>
        <span class="px-2 py-0.5 rounded-md bg-slate-900/90 text-white font-black text-[10px] shadow-md border border-emerald-400/50 whitespace-nowrap">
            Sysadmin
        </span>
    `;
}

function renderClickRipple(xPct, yPct) {
    const x = xPct * window.innerWidth;
    const y = yPct * window.innerHeight;

    const ripple = document.createElement('div');
    ripple.className = 'fixed z-[9999999] pointer-events-none w-8 h-8 rounded-full bg-emerald-400/60 border-2 border-emerald-300 animate-ping shadow-lg';
    ripple.style.left = `${x - 16}px`;
    ripple.style.top = `${y - 16}px`;
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 800);
}

function triggerTargetClick(payload) {
    // Ignore sidebar toggles because sidebar_state action syncs sidebar explicitly
    if (payload.onclickAttr && payload.onclickAttr.includes('toggleSidebar')) return;
    if (payload.targetSelector && (payload.targetSelector.includes('toggleSidebar') || payload.targetSelector.includes('btnToggleSidebar'))) return;

    if (payload.targetSelector) {
        try {
            const el = document.querySelector(payload.targetSelector);
            if (el && typeof el.click === 'function') {
                el.click();
                return;
            }
        } catch {}
    }

    if (payload.onclickAttr) {
        try {
            const el = document.querySelector(`[onclick="${payload.onclickAttr.replace(/"/g, '\\"')}"]`);
            if (el && typeof el.click === 'function') {
                el.click();
            }
        } catch {}
    }
}

export function revokeOwnerHandshakeSession() {
    exitOwnerHandshakeSession(true);
}

function exitOwnerHandshakeSession(shouldBroadcastTerminate = true) {
    window.isOwnerHandshakeActive = false;
    isOwnerSyncPaused = false;

    const bar = document.getElementById('ownerHandshakeControlBar');
    if (bar) bar.remove();

    const bubble = document.getElementById('ownerHandshakeBubble');
    if (bubble) bubble.remove();

    const cursor = document.getElementById('sysadminRemoteCursor');
    if (cursor) cursor.remove();

    const modal = document.getElementById('ownerHandshakePromptModal');
    if (modal) modal.remove();

    if (shouldBroadcastTerminate && ownerHandshakeChannel) {
        ownerHandshakeChannel.send({
            type: 'broadcast',
            event: 'HANDSHAKE_TERMINATE',
            payload: { terminated_by: 'owner', timestamp: new Date().toISOString() }
        }).catch(() => {});
    }

    showToast('Sysadmin Live Support Session Terminated.', 'info');
}

function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

window.initOwnerHandshakeListener = initOwnerHandshakeListener;
window.revokeOwnerHandshakeSession = revokeOwnerHandshakeSession;
