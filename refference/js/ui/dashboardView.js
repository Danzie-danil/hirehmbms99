import { state, subscribe } from '../state.js';
import { switchView } from '../app.js';
import { supabase } from '../supabase.js';
import { getPlan } from '../plan.js';

async function showActiveSystemBanners() {
    if (state.role === 'sysadmin') {
        const container = document.getElementById('system-banner-container');
        if (container) {
            container.innerHTML = '';
            container.classList.add('hidden');
        }
        return;
    }

    let banners = [];
    try {
        const rpcRes = await supabase.rpc('get_active_sys_banners');
        if (!rpcRes.error && Array.isArray(rpcRes.data)) {
            banners = rpcRes.data;
        } else {
            const { data, error } = await supabase.from('sys_banners').select('*').eq('active', true);
            if (error) {
                console.warn('[Banners] Error fetching banners:', error.message);
            } else if (data) {
                banners = data;
            }
        }
    } catch (e) {
        console.error('[Banners] Failed fetching active banners from Supabase:', e);
    }

    const container = document.getElementById('system-banner-container');
    if (!container) return;

    // Target data-banner-row elements to avoid wiping codebase update banner if present
    const existingUpdateBanner = container.querySelector('#bms-codebase-update-banner');

    if (banners.length === 0) {
        container.querySelectorAll('[data-banner-row]').forEach(el => el.remove());
        if (!existingUpdateBanner && container.children.length === 0) {
            container.classList.add('hidden');
        }
        return;
    }

    container.classList.remove('hidden');
    container.querySelectorAll('[data-banner-row]').forEach(el => el.remove());

    const sysBannersHtml = banners.map(b => {
        const bgClass = b.type === 'warning'
            ? 'bg-amber-500 text-white'
            : b.type === 'success'
            ? 'bg-emerald-500 text-white'
            : 'bg-indigo-600 text-white';
        const iconName = b.type === 'warning' ? 'alert-triangle' : b.type === 'success' ? 'check-circle' : 'info';
        const ctaIcon = b.cta_action === 'refresh' ? 'rotate-cw' : b.cta_action === 'url' ? 'external-link' : 'arrow-right';

        return `
        <div class="flex items-center px-3 sm:px-4 py-2 border-b border-white/10 ${bgClass} text-xs font-bold shadow-sm select-none overflow-hidden gap-2 sm:gap-3 shrink-0" data-banner-row data-banner-id="${b.id}">
            <div class="flex items-center gap-1.5 flex-shrink-0 pr-2 sm:pr-3 border-r border-white/20">
                <i data-lucide="${iconName}" class="w-4 h-4 flex-shrink-0 animate-bounce"></i>
            </div>
            <div class="banner-text-wrap flex-1 overflow-hidden flex items-center">
                <div class="banner-text-inner inline-flex whitespace-nowrap">
                    <span class="banner-text-content pr-16">${b.message}</span>
                    <span class="banner-text-content pr-16 hidden" data-marquee-duplicate>${b.message}</span>
                </div>
            </div>
            ${(b.cta_enabled && b.cta_label) ? `
            <div class="flex-shrink-0 pl-1">
                <button type="button" onclick="window.handleBannerCtaAction('${b.cta_action || 'refresh'}', '${(b.cta_target || '').replace(/'/g, "\\'")}', '${b.id}')" class="px-2.5 sm:px-3 py-1 rounded-lg bg-white/20 hover:bg-white text-white hover:text-gray-900 text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 shadow-xs cursor-pointer border border-white/30 hover:shadow-md">
                    <i data-lucide="${ctaIcon}" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                    <span>${b.cta_label}</span>
                </button>
            </div>
            ` : ''}
        </div>
        `;
    }).join('');

    container.insertAdjacentHTML('beforeend', sysBannersHtml);

    if (window.lucide) lucide.createIcons();

    // Smart seamless marquee: only scroll if text overflows container, otherwise center it
    requestAnimationFrame(() => {
        container.querySelectorAll('[data-banner-row]').forEach(row => {
            const wrap = row.querySelector('.banner-text-wrap');
            const inner = row.querySelector('.banner-text-inner');
            if (!wrap || !inner) return;

            const applyLayout = () => {
                const wrapW = wrap.offsetWidth;
                const contentSpan = inner.querySelector('.banner-text-content');
                const duplicateSpan = inner.querySelector('[data-marquee-duplicate]');
                if (!contentSpan || !duplicateSpan) return;

                // Measure content width using the single text span
                duplicateSpan.classList.add('hidden');
                inner.style.animation = 'none';
                const textW = contentSpan.offsetWidth;

                if (textW > wrapW) {
                    // Show duplicate span to allow seamless looping
                    duplicateSpan.classList.remove('hidden');
                    wrap.classList.remove('justify-center');
                    
                    // Slow down speed to 30px per second for mobile legibility
                    const distance = textW; 
                    const speed = 30; // px/sec
                    const duration = Math.max(12, distance / speed);
                    inner.style.animation = `ticker-marquee ${duration}s linear infinite`;
                } else {
                    // Center and keep static
                    duplicateSpan.classList.add('hidden');
                    wrap.classList.add('justify-center');
                    inner.style.animation = 'none';
                }
            };

            applyLayout();
            if (window.ResizeObserver) {
                new ResizeObserver(applyLayout).observe(wrap);
            }
        });
    });

}
window.showActiveSystemBanners = showActiveSystemBanners;

window.handleBannerCtaAction = function(action, target, bannerId) {
    if (bannerId) {
        // Immediately dismiss row with smooth transition
        const row = document.querySelector(`[data-banner-id="${bannerId}"]`);
        if (row) {
            row.style.opacity = '0';
            row.style.transform = 'translateY(-6px)';
            row.style.transition = 'all 0.18s ease';
            setTimeout(() => {
                row.remove();
                const remaining = document.querySelectorAll('[data-banner-row]');
                if (remaining.length === 0) {
                    const container = document.getElementById('system-banner-container');
                    if (container) container.classList.add('hidden');
                }
            }, 180);
        }

        // Server-side compute: persist user click in PostgreSQL sys_banner_interactions
        supabase.rpc('record_banner_cta_click', { p_banner_id: bannerId }).then(({ error }) => {
            if (error) {
                console.warn('[Banners] Error recording CTA click on Supabase:', error.message);
            }
        }).catch(err => console.error('[Banners] Failed to record CTA click:', err));
    }

    if (action === 'refresh') {
        if (typeof window.executeAppUpdate === 'function') {
            window.executeAppUpdate();
        } else {
            if (window.showToast) window.showToast('Applying latest application updates...', 'info');
            sessionStorage.setItem('bms_just_updated', 'true');
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(registrations => {
                    for (let reg of registrations) {
                        reg.update();
                        if (reg.waiting) {
                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                        }
                    }
                }).catch(() => {});
            }
            setTimeout(() => {
                window.location.reload(true);
            }, 350);
        }
    } else if (action === 'navigate') {
        if (!target) return;
        if (window.switchView) {
            window.switchView(target);
        } else {
            window.location.hash = target;
        }
    } else if (action === 'url') {
        if (target) {
            window.open(target, '_blank', 'noopener,noreferrer');
        }
    }
};

export function ensureSidebarNavVisible(role) {
    const ownerNav = document.getElementById('ownerNav');
    const branchNav = document.getElementById('branchNav');
    const sysadminNav = document.getElementById('sysadminNav');
    const appEl = document.getElementById('app');
    const loginEl = document.getElementById('loginScreen');

    if (appEl && appEl.classList.contains('hidden') && (state.role || role)) {
        appEl.classList.remove('hidden');
        if (loginEl) loginEl.classList.add('hidden');
    }

    if (window.isSysadminImpersonationMode) {
        if (ownerNav) ownerNav.classList.remove('hidden');
        if (branchNav) branchNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');
        return;
    }

    const targetRole = role || state.role || localStorage.getItem('bms_last_role') || localStorage.getItem('bms_last_active_role');
    if (!targetRole) return;

    if (targetRole === 'sysadmin') {
        if (ownerNav) ownerNav.classList.add('hidden');
        if (branchNav) branchNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.remove('hidden');
    } else if (targetRole === 'owner') {
        if (ownerNav) ownerNav.classList.remove('hidden');
        if (branchNav) branchNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');
    } else if (targetRole === 'branch') {
        if (ownerNav) ownerNav.classList.add('hidden');
        if (branchNav) branchNav.classList.remove('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');
    }
}
window.ensureSidebarNavVisible = ensureSidebarNavVisible;

export function applyDashboardRole(role) {
    if (!role) return;
    if (window.isSysadminImpersonationMode) {
        ensureSidebarNavVisible('owner');
        const elUserRole = document.getElementById('userRole');
        if (elUserRole) elUserRole.textContent = 'BSO (Inspecting)';
        return;
    }
    ensureSidebarNavVisible(role);
    const elUserRole = document.getElementById('userRole');
    const ownerNav = document.getElementById('ownerNav');
    const branchNav = document.getElementById('branchNav');
    const sysadminNav = document.getElementById('sysadminNav');

    // Show banners after a short delay to ensure Supabase session is ready
    setTimeout(() => showActiveSystemBanners(), 800);

    if (role === 'sysadmin') {
        if (elUserRole) elUserRole.textContent = 'System Admin';
        if (ownerNav) ownerNav.classList.add('hidden');
        if (branchNav) branchNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.remove('hidden');

        const lastView = localStorage.getItem('lastSysadminView') || 'sysadmin-dashboard';
        switchView(lastView);
    } else if (role === 'owner') {
        if (elUserRole) elUserRole.textContent = 'BSO';
        if (ownerNav) ownerNav.classList.remove('hidden');
        if (branchNav) branchNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');

        const lastView = localStorage.getItem('lastOwnerView') || 'overview';
        switchView(lastView);

        if (window.checkNotifications) window.checkNotifications();
        if (window.updateNavAnalyticsAiBadge) window.updateNavAnalyticsAiBadge();
    } else if (role === 'branch') {
        if (elUserRole) elUserRole.textContent = 'BR';
        if (ownerNav) ownerNav.classList.add('hidden');
        if (branchNav) branchNav.classList.remove('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');

        if (typeof updateSubscriptionBadge === 'function') updateSubscriptionBadge();

        const lastView = localStorage.getItem('lastBranchView') || 'dashboard';
        switchView(lastView);
    }

    if (typeof window.syncAiWidgetVisibility === 'function') {
        window.syncAiWidgetVisibility();
    }
}
window.applyDashboardRole = applyDashboardRole;

export function initDashboardView() {
    subscribe((property, value, previousValue) => {

        switch (property) {
            case 'currentUser': {
                const elCurrentUser = document.getElementById('currentUser');
                if (elCurrentUser) {
                    if (value) {
                        elCurrentUser.textContent = value;
                    } else {
                        // Fallback: check cached session before blanking
                        const activeUserId = localStorage.getItem('bms_last_active_user');
                        const lastRole = localStorage.getItem('bms_last_role') || state.role;
                        const cachedRaw = lastRole && activeUserId ? localStorage.getItem(`bms_session_${lastRole}_${activeUserId}`) : null;
                        if (cachedRaw) {
                            try {
                                const parsed = JSON.parse(cachedRaw);
                                if (parsed?.currentUser) {
                                    elCurrentUser.textContent = parsed.currentUser;
                                    state.currentUser = parsed.currentUser;
                                }
                            } catch (e) {}
                        }
                    }
                }
                break;
            }

            case 'role': {
                if (value && value !== previousValue) {
                    applyDashboardRole(value);
                }
                break;
            }

            case 'branchProfile': {
                if (state.role === 'branch') {
                    const elUserRole = document.getElementById('userRole');
                    if (elUserRole) {
                        elUserRole.textContent = 'BR';
                    }
                    if (typeof updateSubscriptionBadge === 'function') updateSubscriptionBadge();
                }
                break;
            }

            case 'branchId': {
                const elCurrentBranch = document.getElementById('currentBranch');
                if (elCurrentBranch && state.role !== 'owner') {
                    const branchName = state.branches.find(b => b.id === value)?.name || 'Branch';
                    elCurrentBranch.textContent = branchName;
                }
                break;
            }
        }

        if (['role', 'currentUser', 'branchProfile', 'profile', 'ownerId', 'branchId', 'lang'].includes(property)) {
            if (window.updateSidebarAvatar) window.updateSidebarAvatar();
            if (window.lucide) window.lucide.createIcons();
            window.initRealtimeSync?.();

            window.updateChatPresenceUI?.();
            updateSubscriptionBadge();
        }

        // Restore language preference from DB profile on page refresh
        if (property === 'profile' && value) {
            if (window.restoreLanguageFromProfile) {
                window.restoreLanguageFromProfile(value);
            }
            // Also reload banners now that we're fully authenticated
            if (state.role !== 'sysadmin') {
                showActiveSystemBanners();
            }
            updateSubscriptionBadge();

            // Once the real profile arrives, check if the plan is expired.
            // If it IS expired, inject the paywall directly (no full re-render/spinner needed).
            // Paid/active users are unaffected — their view keeps rendering normally.
            if (state.role === 'owner' && typeof window.checkPlanAccess === 'function') {
                const plan = window.checkPlanAccess();
                const currentView = localStorage.getItem('lastOwnerView') || 'overview';
                if (plan.isExpired && currentView !== 'settings' && currentView !== 'billing') {
                    const mainContent = document.getElementById('mainContent');
                    if (mainContent && typeof window.renderOwnerPaywall === 'function') {
                        mainContent.innerHTML = window.renderOwnerPaywall();
                        if (window.lucide) window.lucide.createIcons();
                    }
                }
            }
        }
    });
}

/**
 * Renders and updates the subscription plan badge next to the user role badge.
 * Supports live localization when language toggles.
 */
export function updateSubscriptionBadge() {
    const badge = document.getElementById('subscriptionTag');
    if (!badge) return;

    if (!state.role || state.role === 'sysadmin') {
        badge.classList.add('hidden');
        return;
    }

    const plan = getPlan();

    let labelText = '';
    let iconHtml = `<i data-lucide="award" class="w-5 h-5"></i>`;

    if (plan.isTrial) {
        if (plan.isExpired) {
            labelText = window.t('expired_trial_badge', 'Expired Trial');
            badge.className = "inline-flex items-center justify-center cursor-help select-none transition-transform hover:scale-110 active:scale-95";
            iconHtml = `<i data-lucide="alert-triangle" class="w-6 h-6 text-red-500"></i>`;
        } else {
            labelText = window.t('trial_badge', 'Trial: {days}d left').replace('{days}', plan.daysLeft);
            badge.className = "inline-flex items-center justify-center cursor-help select-none transition-transform hover:scale-110 active:scale-95 animate-pulse";
            iconHtml = `<i data-lucide="clock" class="w-6 h-6 text-blue-500"></i>`;
        }
    } else {
        const planId = (plan.id || '').toLowerCase();
        if (planId === 'starter') {
            labelText = window.t('starter_plan_badge', 'Starter');
            badge.className = "inline-flex items-center justify-center cursor-help select-none transition-transform hover:scale-110 active:scale-95";
            iconHtml = `<i data-lucide="shield-check" class="w-6 h-6 text-emerald-500"></i>`;
        } else if (planId === 'enterprise') {
            labelText = window.t('enterprise_plan_badge', 'Enterprise');
            badge.className = "inline-flex items-center justify-center cursor-help select-none transition-transform hover:scale-110 active:scale-95";
            iconHtml = `<img src="/enterpriseimage.png" onerror="if(window.ENTERPRISE_DIAMOND_DATA){this.src=window.ENTERPRISE_DIAMOND_DATA;}else{this.src='enterpriseimage.png';}" class="w-7 h-7 md:w-8 md:h-8 object-contain" alt="Enterprise">`;
        } else if (planId === 'exclusive') {
            labelText = window.t('exclusive_plan_badge', 'Exclusive VIP');
            badge.className = "inline-flex items-center justify-center cursor-help select-none transition-transform hover:scale-110 active:scale-95";
            iconHtml = `<img src="/exclusiveimage.png" onerror="if(window.EXCLUSIVE_DIAMOND_DATA){this.src=window.EXCLUSIVE_DIAMOND_DATA;}else{this.src='exclusiveimage.png';}" class="w-7 h-7 md:w-8 md:h-8 object-contain" alt="Exclusive VIP">`;
        } else {
            labelText = planId.toUpperCase();
            badge.className = "inline-flex items-center justify-center cursor-help select-none transition-transform hover:scale-110 active:scale-95";
        }

        if (plan.isExpired) {
            labelText += ` (${window.t('expired_badge', 'Expired')})`;
            badge.className = "p-1 md:p-1.5 rounded-xl shadow-xs select-none border border-red-300 bg-red-50 text-red-600 dark:bg-red-950/30 dark:border-red-900/50 flex items-center justify-center cursor-help transition-transform hover:scale-105";
            iconHtml = `<i data-lucide="alert-circle" class="w-5 h-5 text-red-600"></i>`;
        }
    }

    badge.innerHTML = iconHtml;
    badge.title = labelText;
    badge.classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}
window.updateSubscriptionBadge = updateSubscriptionBadge;
