
import { supabase, dbInventory, dbRequests, dbActivities, dbMessages } from './db.js';
import { state } from './state.js';
import { logout } from './auth.js';
import { renderFeedbackView } from './ui/feedbackView.js';
import { renderSurveyModal, initSurveyRealtimeListener } from './ui/surveyModal.js';
import { initPremiumTooltips } from './ui/tooltip.js';
import { initReleaseNotesCheck } from './ui/releaseNotesModal.js';
import { promptSignOut } from './ui/confirmSignOutModal.js';
import { initUpdateChecker } from './updateChecker.js';
import { initInactivityManager } from './inactivityManager.js';
import { initPushNotifications } from './pushNotifications.js';
import { initNetworkStatus } from './data/networkStatus.js';
import { syncManager } from './data/syncManager.js';
import { renderOfflineViewPlaceholder } from './utils.js';
import { initGlobalNavigator } from './ui/globalNavigator.js';
import './i18n.js';

// Initialize global desktop Go-To command palette
initGlobalNavigator();

window.scrollActiveTable = function(direction) {
    const containers = Array.from(document.querySelectorAll('.overflow-x-auto, .table-scroll-wrapper')).filter(el => {
        if (el.closest('.hidden') || el.offsetParent === null) return false;
        return el.querySelector('table') !== null;
    });
    const visibleContainer = containers.find(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
    }) || containers[0];

    if (visibleContainer) {
        if (typeof direction === 'number') {
            if (direction < 0) {
                visibleContainer.scrollTo({ left: 0, behavior: 'smooth' });
            } else {
                visibleContainer.scrollTo({ left: visibleContainer.scrollWidth, behavior: 'smooth' });
            }
        } else if (direction === 'left' || direction === 'start') {
            visibleContainer.scrollTo({ left: 0, behavior: 'smooth' });
        } else if (direction === 'right' || direction === 'end') {
            visibleContainer.scrollTo({ left: visibleContainer.scrollWidth, behavior: 'smooth' });
        }
    }
};

window.initMouseDragScroll = function() {
    document.addEventListener('mousedown', (e) => {
        const scrollContainer = e.target.closest('.overflow-x-auto');
        if (!scrollContainer) return;

        // Skip interactive form controls, buttons, links, or text selection
        if (e.target.closest('button, input, select, a, label, textarea, [contenteditable="true"]')) return;

        let isDown = true;
        let startX = e.pageX - scrollContainer.offsetLeft;
        let scrollLeft = scrollContainer.scrollLeft;
        let isDragging = false;

        const onMouseMove = (moveEvent) => {
            if (!isDown) return;
            const x = moveEvent.pageX - scrollContainer.offsetLeft;
            const walk = (x - startX) * 1.5;
            if (Math.abs(walk) > 4) {
                if (!isDragging) {
                    isDragging = true;
                    scrollContainer.style.cursor = 'grabbing';
                    scrollContainer.style.userSelect = 'none';
                }
                scrollContainer.scrollLeft = scrollLeft - walk;
            }
        };

        const onMouseUp = () => {
            isDown = false;
            scrollContainer.style.cursor = '';
            scrollContainer.style.removeProperty('user-select');
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);

            if (isDragging) {
                const preventClick = (clickEvent) => {
                    clickEvent.stopPropagation();
                    clickEvent.preventDefault();
                };
                scrollContainer.addEventListener('click', preventClick, { capture: true, once: true });
            }
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
};

window.initTouchpadWheelScroll = function() {
    const handleWheelScroll = (e) => {
        const dock = e.target.closest('#globalTableScrollDock');
        const scrollContainer = e.target.closest('.overflow-x-auto');

        if (dock) {
            const containers = Array.from(document.querySelectorAll('.overflow-x-auto'));
            const visibleContainer = containers.find(el => {
                const rect = el.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
            }) || containers[0];

            if (visibleContainer) {
                const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
                if (delta !== 0) {
                    e.preventDefault();
                    visibleContainer.scrollLeft += delta * 1.2;
                }
            }
        } else if (scrollContainer) {
            if (e.deltaX !== 0 || e.shiftKey) {
                const delta = e.deltaX !== 0 ? e.deltaX : e.deltaY;
                if (delta !== 0) {
                    e.preventDefault();
                    scrollContainer.scrollLeft += delta * 1.2;
                }
            }
        }
    };

    document.addEventListener('wheel', handleWheelScroll, { passive: false });
};

window.updateTableScrollDockVisibility = function() {
    const dock = document.getElementById('globalTableScrollDock');
    if (!dock) return;

    // Explicitly hide on the AI Strategic Intelligence / Analytics page
    if (state.currentView === 'ai_analytics' || document.getElementById('aiAnalyticsScrollBody') || document.getElementById('ai-analytics-output')) {
        dock.classList.add('hidden');
        dock.style.display = 'none';
        return;
    }

    // ONLY search for actual table scroll containers that are currently visible and contain a <table>
    const containers = Array.from(document.querySelectorAll('.overflow-x-auto, .table-scroll-wrapper')).filter(el => {
        if (el.closest('.hidden') || el.offsetParent === null) return false;
        return el.querySelector('table') !== null;
    });

    const activeContainer = containers.find(el => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && rect.top < window.innerHeight && rect.bottom > 0;
    });

    if (activeContainer && (activeContainer.scrollWidth > activeContainer.clientWidth + 2)) {
        dock.classList.remove('hidden');
        dock.style.display = 'flex';

        // Check if there is an active/visible bottom nav bar (modal-bottom-nav, mobile-bottom-nav, footer)
        const visibleBottomNav = Array.from(document.querySelectorAll('.modal-bottom-nav, .mobile-bottom-nav, footer.modal-bottom-nav, #aiAnalyticsBottomNav')).find(el => {
            const rect = el.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && rect.bottom >= window.innerHeight - 15 && rect.top < window.innerHeight;
        });

        if (visibleBottomNav) {
            const navHeight = visibleBottomNav.offsetHeight || 58;
            dock.style.bottom = `${navHeight + 12}px`;
        } else {
            dock.style.bottom = '16px';
        }
    } else {
        dock.classList.add('hidden');
        dock.style.display = 'none';
    }
};

window.initScrollDockVisibilityController = function() {
    const mainContent = document.getElementById('mainContent');
    
    const updateAllDocks = () => {
        window.updateTableScrollDockVisibility();
    };

    updateAllDocks();
    window.addEventListener('resize', updateAllDocks);
    window.addEventListener('scroll', updateAllDocks, { passive: true });
    
    if (mainContent) {
        mainContent.addEventListener('scroll', updateAllDocks, { passive: true });
    }

    setInterval(updateAllDocks, 400);
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.initMouseDragScroll();
        window.initTouchpadWheelScroll();
        window.initScrollDockVisibilityController();
    });
} else {
    window.initMouseDragScroll();
    window.initTouchpadWheelScroll();
    window.initScrollDockVisibilityController();
}

const loadedViewModules = new Map();
const registerModuleExports = (mod) => {
    for (const key in mod) {
        if (typeof mod[key] === 'function') {
            window[key] = mod[key];
        }
    }
};

const sharedViewLoaders = {
    chat: () => import('./chat.js'),
    feedback: () => import('./ui/feedbackView.js'),
    support: () => import('./ui/feedbackView.js')
};

const ownerViewLoaders = {
    overview: () => import('./owner/overview.js'),
    branches: () => import('./owner/branches.js'),
    tasks: () => import('./owner/tasks.js'),
    analytics: () => import('./owner/analytics.js'),
    billing: () => import('./owner/settings.js'),
    security: () => import('./owner/security.js'),
    settings: () => import('./owner/settings.js'),
    requests: () => import('./owner/requests.js'),
    staff: () => import('./owner/staff.js'),
    suppliers: () => import('./owner/suppliers.js'),
    quotations: () => import('./owner/quotations.js'),
    payroll: () => import('./owner/payroll.js'),
    goals: () => import('./owner/goals.js'),
    shifts: () => import('./owner/shifts.js'),
    announcements: () => import('./owner/announcements.js'),
    promotions: () => import('./owner/promotions.js'),
    audit: () => import('./owner/audit.js'),
    central_inventory: () => import('./owner/central_inventory.js'),
    central_dispatch: () => import('./owner/central_inventory.js'),
    stock_movements: () => import('./owner/stock_movements.js'),
    financial_reports: () => import('./owner/financial_reports.js'),
    daily_summary: () => import('./owner/overview.js'),
    ai_analytics: () => import('./owner/analytics.js'),
    capital: () => import('./owner/capital.js'),
    assets: () => import('./owner/assets.js'),
    loans: () => import('./owner/loans.js'),
    business_loans: () => import('./owner/loans.js')
};

const branchViewLoaders = {
    dashboard: () => import('./branch/dashboard.js'),
    sales: () => import('./branch/sales.js'),
    expenses: () => import('./branch/expenses.js'),
    inventory: () => import('./branch/inventory.js'),
    customers: () => import('./branch/customers.js'),
    tasks: () => import('./branch/tasks.js'),
    notes: () => import('./branch/notes.js'),
    loans: () => import('./branch/loans.js'),
    reports: () => import('./branch/reports.js'),
    staff: () => import('./branch/staff.js'),
    suppliers: () => import('./branch/suppliers.js'),
    quotations: () => import('./branch/quotations.js'),
    invoices: () => import('./branch/invoices.js'),
    requests: () => import('./branch/requests.js'),
    settings: () => import('./branch/settings.js'),
    attendance: () => import('./branch/attendance.js'),
    cash_drawer: () => import('./branch/cash_drawer.js'),
    loyalty: () => import('./branch/loyalty.js'),
    stock_transfers: () => import('./branch/stock_transfers.js'),
    returns: () => import('./branch/returns.js'),
    shift_summary: () => import('./branch/shift_summary.js')
};

const sysadminViewLoader = () => import('./admin/dashboard.js');

async function ensureViewModule(role, viewId) {
    const loader =
        role === 'sysadmin'
            ? sysadminViewLoader
            : sharedViewLoaders[viewId] || (role === 'owner' ? ownerViewLoaders[viewId] : branchViewLoaders[viewId]);

    if (!loader) return;

    const key = role === 'sysadmin' ? 'sysadmin' : `${role}:${viewId}`;
    let loading = loadedViewModules.get(key);
    if (!loading) {
        loading = loader()
            .then((mod) => {
                registerModuleExports(mod);
                return mod;
            })
            .catch((err) => {
                console.warn(`[Module Loader] Failed loading "${key}", evicting cached error for fresh retry:`, err.message);
                loadedViewModules.delete(key);
                throw err;
            });
        loadedViewModules.set(key, loading);
    }
    return loading;
}

export function clearViewModuleErrors() {
    loadedViewModules.clear();
}
window.clearViewModuleErrors = clearViewModuleErrors;

window.ensureBmsViewModule = ensureViewModule;
window.renderSurveyModal = renderSurveyModal;
window.initSurveyRealtimeListener = initSurveyRealtimeListener;
window.confirmSignOut = promptSignOut;
window.promptSignOut = promptSignOut;
initPremiumTooltips();
initBackNavigationGuard();
initUpdateChecker();
initInactivityManager();
initPushNotifications();
initNetworkStatus();
syncManager.init();

window.refreshCurrentViewLanguage = function() {
    if (window.updateStaticDomTranslations) {
        window.updateStaticDomTranslations();
    }
    const currentView = localStorage.getItem(
        state.role === 'owner' ? 'lastOwnerView' : (state.role === 'branch' ? 'lastBranchView' : 'lastSysadminView')
    ) || 'overview';

    if (typeof window.switchView === 'function') {
        window.switchView(currentView);
    }
};

export function toggleSidebar(forceState) {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    const isDesktop = window.innerWidth >= 768;

    if (typeof forceState === 'boolean') {
        if (forceState) {
            sidebar.classList.remove('-translate-x-full');
            if (overlay && !isDesktop) overlay.classList.remove('hidden');
        } else {
            if (!isDesktop) sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        }
    } else {
        if (isDesktop) {
            sidebar.classList.remove('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
        } else {
            sidebar.classList.toggle('-translate-x-full');
            if (sidebar.classList.contains('-translate-x-full')) {
                if (overlay) overlay.classList.add('hidden');
            } else {
                if (overlay) overlay.classList.remove('hidden');
            }
        }
    }

    const isOpen = !sidebar.classList.contains('-translate-x-full');
    if (window.isHandshakeActive && window.broadcastHandshakeAction) {
        window.broadcastHandshakeAction('sidebar_state', { isOpen });
    }
};

window.addEventListener('resize', () => {
    const sidebar = document.getElementById('mainSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar) return;

    if (window.innerWidth >= 768) {
        sidebar.classList.remove('-translate-x-full');
        if (overlay) overlay.classList.add('hidden');
    } else {
        if (overlay && overlay.classList.contains('hidden')) {
            sidebar.classList.add('-translate-x-full');
        }
    }
}, { passive: true });

export function showInlineSaveIndicator(inputElem, state) {
    if (!inputElem) return;
    let wrapper = inputElem.parentElement;
    if (!wrapper || wrapper.tagName === 'BODY') return;

    if (window.getComputedStyle(wrapper).position === 'static') {
        wrapper.classList.add('relative');
    }

    let indicator = wrapper.querySelector('.inline-input-save-indicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'inline-input-save-indicator absolute right-3 top-8 flex items-center justify-center pointer-events-none transition-all duration-300 opacity-0 z-10';
        wrapper.appendChild(indicator);
    }

    let clickToEdit = wrapper.querySelector('.click-to-edit-indicator');

    if (state === 'saving') {
        if (clickToEdit) clickToEdit.style.display = 'none';
        indicator.innerHTML = '<span class="text-[10px] font-bold text-indigo-500 bg-white/90 px-1.5 py-0.5 rounded shadow-sm animate-pulse">Saving...</span>';
        indicator.classList.remove('opacity-0');
        indicator.classList.add('opacity-100');
    } else if (state === 'saved') {
        indicator.innerHTML = '<span class="text-[10px] font-bold text-emerald-600 bg-white/90 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i>Saved</span>';
        indicator.classList.remove('opacity-0');
        indicator.classList.add('opacity-100');
        lucide.createIcons();
        setTimeout(() => {
            indicator.classList.remove('opacity-100');
            indicator.classList.add('opacity-0');
            if (clickToEdit) clickToEdit.style.display = '';
        }, 2000);
    } else if (state === 'error') {
        indicator.innerHTML = '<span class="text-[10px] font-bold text-red-600 bg-white/90 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1"><i data-lucide="x" class="w-3 h-3"></i>Failed</span>';
        indicator.classList.remove('opacity-0');
        indicator.classList.add('opacity-100');
        lucide.createIcons();
        setTimeout(() => {
            indicator.classList.remove('opacity-100');
            indicator.classList.add('opacity-0');
            if (clickToEdit) clickToEdit.style.display = '';
        }, 3000);
    }
};

export function attachClickToEditIndicators(container) {
    if (!container) return;

    const inputs = container.querySelectorAll('input.form-input, textarea.form-input, select.form-input');

    inputs.forEach(input => {

        if (input.disabled || input.readOnly) return;
        if (['checkbox', 'radio', 'file', 'color', 'hidden', 'time', 'date', 'datetime-local', 'month', 'week'].includes(input.type)) return;

        let wrapper = input.parentElement;
        if (!wrapper || wrapper.tagName === 'BODY' || wrapper.querySelector('.click-to-edit-indicator')) return;

        if (window.getComputedStyle(wrapper).position === 'static') {
            wrapper.classList.add('relative');
        }
        wrapper.classList.add('group');

        input.classList.add('pr-[70px]');

        const indicator = document.createElement('div');

        let topClass = 'top-8';
        if (input.tagName === 'TEXTAREA') topClass = 'top-9';
        if (!wrapper.querySelector('label')) topClass = 'top-1/2 -translate-y-1/2';

        indicator.className = `click-to-edit-indicator pointer-events-none absolute right-3 ${topClass} flex items-center gap-1 text-[10px] text-gray-400 font-medium opacity-70 transition-opacity z-0 bg-transparent px-1 rounded`;
        indicator.innerHTML = '<i data-lucide="edit-2" class="w-3 h-3"></i> Click to edit';
        wrapper.appendChild(indicator);

        input.addEventListener('focus', () => {
            indicator.classList.remove('opacity-70');
            indicator.classList.add('opacity-0');
        });
        input.addEventListener('blur', () => {
            indicator.classList.remove('opacity-0');
            indicator.classList.add('opacity-70');
        });
    });

    if (window.lucide) {
        window.lucide.createIcons();
    }
};

export async function switchView(viewId, context = null, isBackNavigation = false) {

    if (typeof checkSessionExpiry === 'function') checkSessionExpiry();

    if (typeof window.ensureSidebarNavVisible === 'function') {
        window.ensureSidebarNavVisible(state.role);
    }

    state.viewHistory = state.viewHistory || [];
    if (!isBackNavigation) {
        state._modalHistory = [];
        state._currentModalType = null;
        state._currentModalData = null;
        if (state.viewHistory[state.viewHistory.length - 1] !== viewId) {
            state.viewHistory.push(viewId);
        }
        try {
            history.pushState({ bmsApp: true, view: viewId }, '', '#view=' + viewId);
        } catch (e) {}
    } else {
        if (!state.viewHistory.includes(viewId)) {
            state.viewHistory.push(viewId);
        }
    }

    state.activeView = viewId;
    state.activeViewContext = context;

    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.classList.remove('overflow-hidden', '!p-0');
        mainContent.classList.add('overflow-y-auto');
    }

    // Immediately dismiss mobile sidebar upon selecting an option so view/loading animations are visible right away
    if (window.innerWidth < 768) {
        toggleSidebar(false);
    }

    // Close any open premium dropdowns that were portalled to body before the new page renders
    document.querySelectorAll('.dropdown-premium-list').forEach(el => {
        el.classList.add('hidden');
        if (el.parentNode === document.body) document.body.removeChild(el);
    });

    if (!sessionStorage.getItem('bms_checked_toasts') && state.profile) {
        sessionStorage.setItem('bms_checked_toasts', 'true');
        (async () => {
            const now = new Date().toISOString();
            const { data } = await supabase
                .from('sys_scheduled_toasts')
                .select('*')
                .lte('scheduled_at', now)
                .or(`expires_at.is.null,expires_at.gt.${now}`);

            if (data && data.length > 0) {

                const toast = data.sort((a,b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))[0];

                setTimeout(() => {
                    window.showToast?.(toast.message, toast.type || 'info', 10000);
                }, 2000);
            }
        })();
    }

    let btnElement = null;
    let extraData = null;

    if (context instanceof HTMLElement) {
        btnElement = context;
    } else {
        extraData = context;
        btnElement = document.querySelector(`.sidebar-item[onclick*="switchView('${viewId}'"]`);
    }

    // Clear any dangling spinners globally across all sidebar items
    document.querySelectorAll('.loader-spin').forEach(el => el.remove());

    document.querySelectorAll('.sidebar-item').forEach(el => {
        el.classList.remove('active', 'text-indigo-600', 'bg-indigo-50');
        el.classList.add('text-gray-700');
    });

    if (btnElement) {
        btnElement.classList.add('active', 'text-indigo-600', 'bg-indigo-50');
        btnElement.classList.remove('text-gray-700');
        // Add indicator spinner cleanly
        btnElement.insertAdjacentHTML('beforeend', `<span class="loader-spin inline-flex items-center ml-auto shrink-0"><svg class="animate-spin h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg></span>`);
    }

    if (mainContent && (!mainContent.children || mainContent.children.length === 0 || mainContent.innerText.trim() === '')) {
        mainContent.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[50vh] w-full opacity-75">
                <div class="premium-spinner mb-4"></div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">Loading view...</p>
            </div>
        `;
    }

    try {
        if (state.role !== 'sysadmin' && state.disabledModules && state.disabledModules.has(viewId)) {
            renderDisabledModuleNotice(viewId);
            return;
        }

        const renderTask = (async () => {
            if (window.isSysadminImpersonationMode || state.role === 'owner') {
                if (!window.isSysadminImpersonationMode) localStorage.setItem('lastOwnerView', viewId);
                await renderOwnerView(viewId, extraData);
            } else if (state.role === 'sysadmin') {
                localStorage.setItem('lastSysadminView', viewId);
                const sysadminModule = await ensureViewModule('sysadmin', viewId);
                await sysadminModule.renderSysadminView(viewId, extraData);
            } else {
                localStorage.setItem('lastBranchView', viewId);
                await renderBranchView(viewId, extraData);
            }

            if (window.isHandshakeActive && window.broadcastHandshakeAction) {
                window.broadcastHandshakeAction('navigate', { viewId, extraData });
            }
        })();

        // 16-second safety watchdog so cold start/wake-up network queries on sleeping TCP sockets never lock the page
        const watchdogLimit = extraData?._hasAutoRetried ? 10000 : 16000;
        const timeoutTask = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Network or view rendering took longer than expected.')), watchdogLimit)
        );

        try {
            await Promise.race([renderTask, timeoutTask]);
        } catch (raceErr) {
            console.warn(`[Watchdog Triggered on ${viewId}]:`, raceErr.message);
            // Automatic force retry once freshly with background auth re-check
            if (!extraData?._hasAutoRetried) {
                window._cachedCentralItems = null;
                window._cachedBranchInventory = null;
                if (navigator.onLine && supabase?.auth) {
                    supabase.auth.getSession().catch(() => {});
                }
                return switchView(viewId, { ...(extraData || {}), _hasAutoRetried: true });
            }
            throw raceErr;
        }
    } catch (err) {
        console.error(`[View Navigation Error] Failed to render "${viewId}":`, err);
        const activeRoleKey = window.isSysadminImpersonationMode ? 'owner' : state.role;
        const moduleKey = activeRoleKey === 'sysadmin' ? 'sysadmin' : `${activeRoleKey}:${viewId}`;
        loadedViewModules.delete(moduleKey);

        if (typeof window.ensureSidebarNavVisible === 'function') {
            window.ensureSidebarNavVisible(window.isSysadminImpersonationMode ? 'owner' : state.role);
        }

        // Only show offline placeholder if mainContent was left empty or failed completely
        if (mainContent && (!mainContent.children || mainContent.children.length === 0)) {
            mainContent.innerHTML = renderOfflineViewPlaceholder(viewId, state.role, !navigator.onLine, err.message);
            if (window.lucide) window.lucide.createIcons();
        } else if (window.showToast) {
            showToast('Cloud connection delayed. Showing cached data.', 'warning');
        }
    } finally {
        // ALWAYS purge all sidebar loading spinners cleanly
        document.querySelectorAll('.loader-spin').forEach(el => el.remove());

        if (typeof window.ensureSidebarNavVisible === 'function') {
            window.ensureSidebarNavVisible(window.isSysadminImpersonationMode ? 'owner' : state.role);
        }

        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Toggle AI Chatbot Widget visibility (hidden on reports views)
        const aiWidget = document.getElementById('ai-assistant-widget');
        if (aiWidget) {
            if (viewId === 'financial_reports' || viewId === 'reports') {
                aiWidget.classList.add('!hidden');
            } else {
                aiWidget.classList.remove('!hidden');
            }
        }
    }

    if (window.innerWidth < 768) {
        toggleSidebar(false);
    }
};

export async function renderOwnerView(view, extraData = null) {
    if (typeof window.checkPlanAccess === 'function' && state.profile?.id) {
        const plan = window.checkPlanAccess();
        if (plan.isExpired) {
            // Expired or skipped-trial users: ONLY allow access to settings (forced to security/billing tab)
            if (view !== 'settings' && view !== 'billing') {
                const mainContent = document.getElementById('mainContent');
                if (mainContent) {
                    mainContent.innerHTML = window.renderOwnerPaywall();
                    if (window.lucide) window.lucide.createIcons();
                }
                return;
            }
            // If they navigate to 'settings', force them to the security/billing tab
            if (view === 'settings' || view === 'billing') {
                await ensureViewModule('owner', 'settings');
                window.renderSettings();
                setTimeout(() => {
                    if (typeof window.switchSettingsTab === 'function') window.switchSettingsTab('security');
                }, 50);
                return;
            }
        }
    }

    // ── Feature Tier Gating (Starter vs Enterprise vs Exclusive) ──────────────
    if (typeof window.hasFeature === 'function') {
        const mainContent = document.getElementById('mainContent');
        if (view === 'central_inventory' && !window.hasFeature('central_inventory')) {
            if (mainContent) {
                mainContent.innerHTML = window.renderFeatureLock('Central Inventory Catalog', 'Enterprise');
                if (window.lucide) window.lucide.createIcons();
            }
            return;
        }
        if (view === 'central_dispatch' && !window.hasFeature('central_dispatch')) {
            if (mainContent) {
                mainContent.innerHTML = window.renderFeatureLock('Central Dispatch Hub', 'Enterprise');
                if (window.lucide) window.lucide.createIcons();
            }
            return;
        }
        if (view === 'stock_movements' && !window.hasFeature('central_inventory')) {
            if (mainContent) {
                mainContent.innerHTML = window.renderFeatureLock('Stock Movement Ledger', 'Enterprise');
                if (window.lucide) window.lucide.createIcons();
            }
            return;
        }
    }

    await ensureViewModule('owner', view);

    switch (view) {
        case 'daily_summary':
            await window.renderDailySummaryView?.(extraData);
            break;
        case 'overview':
            await window.renderOwnerOverview?.();
            break;
        case 'branches':
            await window.renderBranchesManagement?.();
            break;
        case 'tasks':
            await window.renderTasksManagement?.();
            break;
        case 'analytics': {
            await window.renderAnalytics?.();
            break;
        }
        case 'ai_analytics': {
            await window.renderAiAnalyticsPageView?.(extraData);
            break;
        }
        case 'billing': {
            await window.renderSettings?.();
            setTimeout(() => { if (typeof window.switchSettingsTab === 'function') window.switchSettingsTab('security'); }, 50);
            break;
        }
        case 'security': {
            const html = window.renderSecurity ? window.renderSecurity() : '';
            document.getElementById('mainContent').innerHTML = html;
            window.lucide?.createIcons();
            break;
        }
        case 'settings':
            await window.renderSettings?.();
            break;
        case 'requests':
            await window.renderRequestsModule?.(extraData);
            break;
        case 'chat':
            await window.renderChatModule?.();
            break;
        case 'staff':
            await window.renderOwnerStaffModule?.();
            break;
        case 'suppliers':
            await window.renderOwnerSuppliersModule?.();
            break;
        case 'quotations':
            await window.renderOwnerQuotationsModule?.();
            break;
        case 'payroll':
            await window.renderPayrollModule?.();
            break;
        case 'goals':
            await window.renderGoalsModule?.();
            break;
        case 'shifts':
            await window.renderShiftsModule?.();
            break;
        case 'announcements':
            await window.renderAnnouncementsModule?.();
            break;
        case 'promotions':
            await window.renderPromotionsModule?.();
            break;
        case 'audit':
            await window.renderAuditModule?.();
            break;
        case 'central_inventory':
            await window.renderOwnerInventoryModule?.();
            break;
        case 'central_dispatch':
            if (typeof window.openCentralDispatchView === 'function') {
                await window.openCentralDispatchView(extraData);
            }
            break;
        case 'stock_movements':
            await window.renderStockMovementsModule?.();
            break;
        case 'financial_reports':
            await window.renderFinancialReports?.();
            break;
        case 'capital':
            await window.renderOwnerCapitalModule?.();
            break;
        case 'assets':
            await window.renderOwnerAssetsModule?.();
            break;
        case 'business_loans':
        case 'loans':
            await window.renderOwnerLoansModule?.();
            break;
        case 'support':
        case 'feedback':
            renderFeedbackView();
            break;
        default:
            await ensureViewModule('owner', 'overview');
            await window.renderOwnerOverview?.();
    }
};

export async function renderBranchView(view, extraData = null) {
    if (typeof window.checkPlanAccess === 'function') {
        const plan = window.checkPlanAccess();
        if (plan.isExpired) {
            const mainContent = document.getElementById('mainContent');
            if (mainContent) {
                mainContent.innerHTML = window.renderBranchBillingRequired();
                if (window.lucide) window.lucide.createIcons();
            }
            return;
        }
    }

    await ensureViewModule('branch', view);

    switch (view) {
        case 'dashboard':
            await window.renderBranchDashboard?.();
            break;
        case 'sales':
            await window.renderSalesModule?.();
            break;
        case 'expenses':
            await window.renderExpensesModule?.();
            break;
        case 'inventory':
            await window.renderInventoryModule?.();
            break;
        case 'customers':
            await window.renderCustomersModule?.();
            break;
        case 'tasks':
            await window.renderBranchTasks?.();
            break;
        case 'notes':
            await window.renderNotesModule?.();
            break;
        case 'loans':
            await window.renderLoansModule?.();
            break;
        case 'reports':
            await window.renderReportsModule?.();
            break;
        case 'staff':
            await window.renderStaffModule?.();
            break;
        case 'suppliers':
            await window.renderSuppliersModule?.();
            break;
        case 'quotations':
            await window.renderQuotationsModule?.();
            break;
        case 'invoices':
            if (typeof window.renderInvoicesModule === 'function') await window.renderInvoicesModule();
            break;
        case 'settings':
            await window.renderBranchSettings?.();
            break;
        case 'requests':
            await window.renderBranchRequestsModule?.();
            break;
        case 'chat':
            await window.renderChatModule?.();
            break;
        case 'attendance':
            await window.renderAttendanceModule?.();
            break;
        case 'cash_drawer':
            await window.renderCashDrawerModule?.();
            break;
        case 'loyalty':
            await window.renderLoyaltyModule?.();
            break;
        case 'stock_transfers':
            await window.renderStockTransfersModule?.();
            break;
        case 'returns':
            await window.renderReturnsModule?.();
            break;
        case 'shift_summary':
            await window.renderShiftSummaryModule?.();
            break;
        case 'support':
        case 'feedback':
            renderFeedbackView();
            break;
        default:
            await ensureViewModule('branch', 'dashboard');
            await window.renderBranchDashboard?.();
    }
};

export async function checkNotifications(shush = false) {
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen && !loginScreen.classList.contains('hidden')) return;

    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session || !session.user) return;
    if (!state.profile && !state.branchProfile) return;

    await (window.loadNotifReads?.() || Promise.resolve());

    let hasNew = false;
    const oldRequestCount = state.pendingRequestCount || 0;
    let currentUnreadChat = 0;

    if (state.role === 'owner') {
        const [reqs, access, unreadChat, unreadCommentsRes, transfersRes, returnsRes, shiftsumRes] = await Promise.all([
            supabaseClient.from('requests').select('id').eq('owner_id', state.profile?.id || state.ownerId).eq('status', 'pending'),
            supabaseClient.from('access_requests').select('id').eq('owner_id', state.profile?.id || state.ownerId).eq('status', 'pending'),
            dbMessages.getUnreadCount(null, 'owner'),
            (state.branches && state.branches.length)
                ? supabaseClient.from('task_comments').select('id').eq('sender_role', 'branch').eq('is_read', false).in('task_id',
                    (await supabaseClient.from('tasks').select('id').in('branch_id', state.branches.map(b => b.id))).data?.map(t => t.id) || [])
                : Promise.resolve({ data: [] }),
            (state.branches && state.branches.length)
                ? supabaseClient.from('stock_transfers').select('id').in('to_branch_id', state.branches.map(b => b.id)).eq('status', 'pending')
                : Promise.resolve({ data: [] }),
            (state.branches && state.branches.length)
                ? supabaseClient.from('product_returns').select('id').in('branch_id', state.branches.map(b => b.id)).eq('status', 'pending')
                : Promise.resolve({ data: [] }),
            supabaseClient.from('requests').select('id').eq('owner_id', state.profile?.id || state.ownerId).eq('type', 'shift_summary').eq('status', 'pending')
        ]);

        currentUnreadChat = unreadChat || 0;

        const unreadAccess = (access.data || []).filter(r => !window.isNotifRead?.(`access:${r.id}`));
        const unreadReqs = (reqs.data || []).filter(r => !window.isNotifRead?.(`req:${r.id}`));
        const unreadComments = (unreadCommentsRes.data || []).filter(c => !window.isNotifRead?.(`comment:${c.id}`));
        const unreadTransfers = (transfersRes.data || []).filter(t => !window.isNotifRead?.(`transfer:${t.id}`));
        const unreadReturns = (returnsRes.data || []).filter(r => !window.isNotifRead?.(`return:${r.id}`));
        const unreadShiftSums = (shiftsumRes.data || []).filter(s => !window.isNotifRead?.(`shiftsummary:${s.id}`));

        const pendingActions = unreadAccess.length + unreadReqs.length;
        const totalPending = pendingActions + currentUnreadChat + unreadComments.length +
            unreadTransfers.length + unreadReturns.length + unreadShiftSums.length;
        state.pendingRequestCount = totalPending;

        const approvalBadge = document.getElementById('approvalBadge');
        if (approvalBadge) {
            if (pendingActions > 0) {
                approvalBadge.textContent = pendingActions > 99 ? '99+' : pendingActions;
                approvalBadge.classList.remove('hidden');
            } else {
                approvalBadge.classList.add('hidden');
            }
        }

        const ownerTasksBadge = document.getElementById('ownerTasksBadge');
        if (ownerTasksBadge) {
            if (unreadComments.length > 0) {
                ownerTasksBadge.textContent = unreadComments.length > 99 ? '99+' : unreadComments.length;
                ownerTasksBadge.classList.remove('hidden');
            } else {
                ownerTasksBadge.classList.add('hidden');
            }
        }

        if (window.updateNavAnalyticsAiBadge) window.updateNavAnalyticsAiBadge();

        if (totalPending > oldRequestCount) hasNew = true;
        document.getElementById('notifBadge')?.[totalPending > 0 ? 'classList' : 'classList']
        [totalPending > 0 ? 'remove' : 'add']('hidden');

    } else if (state.role === 'branch') {
        const [tasksRes, stockRes, reqsRes, unreadChat, unreadCommentsRes, shiftsRes, announcesRes, transfersRes, returnsRes] = await Promise.all([
            supabaseClient.from('tasks').select('id').eq('branch_id', state.branchId).neq('status', 'completed'),
            dbInventory.fetchAll(state.branchId),
            dbRequests.fetchByBranch(state.branchId),
            dbMessages.getUnreadCount(state.branchId, 'branch'),
            supabaseClient.from('task_comments').select('id').eq('sender_role', 'owner').eq('is_read', false)
                .in('task_id', (await supabaseClient.from('tasks').select('id').eq('branch_id', state.branchId)).data?.map(t => t.id) || []),
            supabaseClient.from('shifts').select('id, created_at').eq('branch_id', state.branchId).order('created_at', { ascending: false }).limit(10),
            supabaseClient.from('announcements').select('id').eq('branch_id', state.branchId).order('created_at', { ascending: false }).limit(10),
            supabaseClient.from('stock_transfers').select('id, status').eq('to_branch_id', state.branchId),
            supabaseClient.from('product_returns').select('id, status').eq('branch_id', state.branchId).neq('status', 'pending')
        ]);

        currentUnreadChat = unreadChat || 0;

        const lowStockItems = (stockRes.items || []).filter(i => i.quantity <= i.min_threshold);
        const unreadLowStock = lowStockItems.filter(i => !window.isNotifRead?.(`stock:${i.id}`));

        const respondedReqs = reqsRes.filter(r => (r.status === 'approved' || r.status === 'rejected' || r.admin_response) && !window.isNotifRead?.(`req:${r.id}`));
        const unreadComments = (unreadCommentsRes.data || []).filter(c => !window.isNotifRead?.(`comment:${c.id}`));
        const unreadTasks = (tasksRes.data || []).filter(t => !window.isNotifRead?.(`task:${t.id}`));
        const unreadShifts = (shiftsRes.data || []).filter(s => !window.isNotifRead?.(`shift:${s.id}`));
        const unreadAnnouncements = (announcesRes.data || []).filter(a => !window.isNotifRead?.(`announce:${a.id}`));
        const unreadTransfers = (transfersRes.data || []).filter(t => !window.isNotifRead?.(`transfer:${t.id}`));
        const unreadReturns = (returnsRes.data || []).filter(r => !window.isNotifRead?.(`return:${r.id}`));

        const totalUnread = unreadLowStock.length + respondedReqs.length + unreadComments.length +
            unreadTasks.length + unreadShifts.length + unreadAnnouncements.length +
            unreadTransfers.length + unreadReturns.length + currentUnreadChat;

        const branchTasksBadge = document.getElementById('branchTasksBadge');
        if (branchTasksBadge) {
            const taskBadgeCount = unreadTasks.length + unreadComments.length;
            if (taskBadgeCount > 0) {
                branchTasksBadge.textContent = taskBadgeCount > 99 ? '99+' : taskBadgeCount;
                branchTasksBadge.classList.remove('hidden');
            } else {
                branchTasksBadge.classList.add('hidden');
            }
        }

        if (totalUnread > oldRequestCount) hasNew = true;
        document.getElementById('notifBadge')?.[totalUnread > 0 ? 'classList' : 'classList']
        [totalUnread > 0 ? 'remove' : 'add']('hidden');
    }

    document.querySelectorAll('.chat-unread-badge').forEach(badge => {
        if (currentUnreadChat > 0) {
            badge.textContent = currentUnreadChat > 99 ? '99+' : currentUnreadChat;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    });

    if (hasNew && !shush) {
        showNotificationHint('New Notification');
        window.showToast?.('New notification received. Check your alerts panel.', 'info', 6000);
    }
};

export function showNotificationHint(message = 'New Notification') {
    const bell = document.querySelector('button[onclick="showNotifications()"]');
    if (!bell) return;

    const oldHint = document.getElementById('notifHint');
    if (oldHint) oldHint.remove();

    const hint = document.createElement('div');
    hint.id = 'notifHint';
    hint.className = 'fixed z-[60] bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest px-3 py-2 rounded-xl shadow-2xl animate-bounce-subtle pointer-events-none opacity-0 transition-opacity duration-300 flex items-center gap-2';
    hint.innerHTML = `<i data-lucide="sparkles" class="w-3 h-3"></i> ${message}`;

    const bellIcon = bell.querySelector('i[data-lucide="bell"], svg');
    if (bellIcon) {
        bellIcon.classList.remove('icon-bell-ring');
        void bellIcon.offsetWidth; // Force DOM reflow to restart animation
        bellIcon.classList.add('icon-bell-ring');
        setTimeout(() => bellIcon.classList.remove('icon-bell-ring'), 850);
    }

    const rect = bell.getBoundingClientRect();
    hint.style.top = (rect.bottom + 10) + 'px';
    hint.style.left = (rect.left - 40) + 'px';

    document.body.appendChild(hint);
    lucide.createIcons();
    playSound('notification');

    setTimeout(() => hint.classList.remove('opacity-0'), 10);

    setTimeout(() => {
        if (hint && hint.parentNode) {
            hint.classList.add('opacity-0');
            setTimeout(() => hint.remove(), 300);
        }
    }, 4000);
}

window.updateNavAnalyticsAiBadge = function() {
    const isExclusive = typeof window.hasFeature === 'function' && window.hasFeature('modal_ai_assistant');
    const badge = document.getElementById('navAnalyticsAiBadge');
    if (badge) {
        if (isExclusive && window.sysSettings?.enable_modal_ai_assistant !== 'false') {
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    if (typeof window.updateSubscriptionBadge === 'function') {
        window.updateSubscriptionBadge();
    }
};

setTimeout(() => {
    checkNotifications(true);
    if (window.promptAndroidPermissionsIfNeeded) {
        window.promptAndroidPermissionsIfNeeded();
    }
}, 600);

export async function showNotifications() {
    const overlay = document.getElementById('notifOverlay');
    const panel = document.getElementById('notifPanel');
    const content = document.getElementById('notifContent');

    overlay.classList.remove('hidden', 'opacity-0');
    panel.classList.remove('translate-x-full');

    content.innerHTML = `<div class="py-10 text-center text-gray-500 flex flex-col items-center">
        <span class="text-sm">Loading notifications...</span></div>`;

    try {
        await (window.loadNotifReads?.() || Promise.resolve());
        let uiItems = [];

        if (state.role === 'owner') {
            const branchIds = (state.branches || []).map(b => b.id);
            const taskIdsRes = branchIds.length ? await supabaseClient.from('tasks').select('id').in('branch_id', branchIds) : { data: [] };
            const taskIds = (taskIdsRes.data || []).map(t => t.id);

            const [accessReqs, allReqs, comments, transfers, returns, activities] = await Promise.all([
                supabaseClient.from('access_requests').select('*, branches(name)').eq('owner_id', state.profile?.id || state.ownerId).eq('status', 'pending').order('created_at', { ascending: false }),
                dbRequests.fetchAll(state.profile?.id || state.ownerId),
                taskIds.length ? supabaseClient.from('task_comments').select('*, tasks!inner(title, branch_id)').eq('sender_role', 'branch').eq('is_read', false).in('task_id', taskIds).order('created_at', { ascending: false }) : { data: [] },
                branchIds.length ? supabaseClient.from('stock_transfers').select('*, branches!from_branch_id(name)').in('from_branch_id', branchIds).eq('status', 'pending').order('created_at', { ascending: false }).limit(20) : { data: [] },
                branchIds.length ? supabaseClient.from('product_returns').select('*, branches(name)').in('branch_id', branchIds).eq('status', 'pending').order('created_at', { ascending: false }).limit(20) : { data: [] },
                dbActivities.fetchRecent(branchIds, 10)
            ]);

            const pendingReqs = (allReqs || []).filter(r => r.status === 'pending');

            (accessReqs.data || []).forEach(req => {
                const key = `access:${req.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'high', time: new Date(req.created_at).getTime(), inner: `
                <div onclick="switchView('security', '${req.id}'); closeNotifications();" class="notif-item p-4 bg-white dark:bg-white/5 border border-indigo-50 dark:border-indigo-900/40 shadow-sm relative overflow-hidden hover:bg-gray-50 cursor-pointer transition-colors rounded-xl">
                    <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                    <div class="flex items-center justify-between mb-1 ml-3">
                        <p class="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight">PIN Reset for ${req.branches?.name || 'Branch'}</p>
                        <span class="text-[9px] font-black text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded uppercase ml-2 flex-shrink-0">Access Request</span>
                    </div>
                    <p class="text-xs text-gray-400 ml-3 mb-2">Requested by branch manager</p>
                    <div class="flex gap-2 ml-3 mt-2">
                        <button onclick="event.stopPropagation(); approveReset('${req.id}', '${req.branch_id}');" class="flex-1 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg hover:bg-indigo-700 transition-colors">Approve</button>
                        <button onclick="event.stopPropagation(); denyReset('${req.id}');" class="flex-1 py-1.5 bg-gray-100 dark:bg-white/10 text-gray-600 text-[10px] font-black uppercase rounded-lg hover:bg-gray-200 transition-colors">Deny</button>
                    </div>
                </div>` });
            });

            pendingReqs.forEach(req => {
                const key = `req:${req.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'high', time: new Date(req.created_at).getTime(), inner: `
                <div onclick="switchView('requests', '${req.id}'); closeNotifications();" class="notif-item p-4 bg-white dark:bg-white/5 border border-indigo-50 dark:border-indigo-900/40 shadow-sm relative overflow-hidden hover:bg-gray-50 cursor-pointer transition-colors rounded-xl">
                    <div class="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
                    <div class="flex items-center justify-between mb-1 ml-3">
                        <p class="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight">${req.subject}</p>
                        <span class="text-[9px] font-black text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded uppercase ml-2 flex-shrink-0">Approval</span>
                    </div>
                    <p class="text-xs text-gray-400 ml-3">${req.branches?.name || 'Unknown Branch'}</p>
                    <p class="text-[10px] text-gray-500 italic truncate ml-3 mt-1">"${req.message || ''}"</p>
                </div>` });
            });

            (comments.data || []).forEach(c => {
                const key = `comment:${c.id}`;
                const isRead = window.isNotifRead?.(key);
                const branchName = (state.branches || []).find(b => b.id === c.tasks?.branch_id)?.name || 'Branch';
                uiItems.push({
                    key, isRead, urgency: 'normal', time: new Date(c.created_at).getTime(), inner: `
                <div onclick="openTaskCommentNotif('${c.id}', '${c.task_id}')" class="notif-item p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 shadow-sm relative overflow-hidden cursor-pointer hover:bg-indigo-50 transition-colors rounded-xl">
                    <div class="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl"></div>
                    <div class="flex items-center justify-between mb-1 ml-3">
                        <p class="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight">Reply on "${c.tasks?.title}"</p>
                        <span class="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded uppercase ml-2">Task Reply</span>
                    </div>
                    <p class="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-1 ml-3">${branchName} &bull; ${fmt.time(c.created_at)}</p>
                    <p class="text-xs text-gray-700 dark:text-gray-300 italic truncate border-l-2 border-indigo-200 pl-2 ml-3">"${c.message}"</p>
                </div>` });
            });

            (transfers.data || []).forEach(t => {
                const key = `transfer:${t.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'normal', time: new Date(t.created_at).getTime(), inner: `
                <div onclick="switchView('stock_transfers'); closeNotifications();" class="notif-item p-3 bg-white dark:bg-white/5 border border-amber-100 dark:border-amber-900/40 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-amber-50 transition-colors rounded-xl">
                    <div class="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="arrow-left-right" class="w-4 h-4 text-amber-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100">Transfer Request</p>
                        <p class="text-[10px] text-amber-600 font-black uppercase tracking-widest">${t.branches?.name || 'Branch'} &bull; ${fmt.time(t.created_at)}</p>
                    </div>
                    <span class="text-[9px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase">Pending</span>
                </div>` });
            });

            (returns.data || []).forEach(r => {
                const key = `return:${r.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'normal', time: new Date(r.created_at).getTime(), inner: `
                <div onclick="switchView('returns'); closeNotifications();" class="notif-item p-3 bg-white dark:bg-white/5 border border-red-100 dark:border-red-900/40 shadow-sm flex items-center gap-3 cursor-pointer hover:bg-red-50 transition-colors rounded-xl">
                    <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="rotate-ccw" class="w-4 h-4 text-red-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100">Return Filed: ${r.product_name || 'Item'}</p>
                        <p class="text-[10px] text-red-500 font-black uppercase tracking-widest">${r.branches?.name || 'Branch'} &bull; ${fmt.time(r.created_at)}</p>
                    </div>
                </div>` });
            });

            const uniqueActivities = [];
            const seenBranch = new Set();
            for (const a of (activities || [])) {
                if (!seenBranch.has(a.branch)) { uniqueActivities.push(a); seenBranch.add(a.branch); }
            }
            const typeMap = {
                sale: { bg: 'bg-emerald-100 dark:bg-emerald-500/20', icon: 'shopping-cart', ic: 'text-emerald-600', view: 'overview' },
                expense: { bg: 'bg-red-100 dark:bg-red-500/20', icon: 'credit-card', ic: 'text-red-600', view: 'overview' },
                task_completed: { bg: 'bg-blue-100 dark:bg-blue-500/20', icon: 'check-circle', ic: 'text-blue-600', view: 'tasks' },
                task_assigned: { bg: 'bg-amber-100 dark:bg-amber-500/20', icon: 'clipboard-list', ic: 'text-amber-600', view: 'tasks' }
            };
            uniqueActivities.forEach(a => {
                const t = typeMap[a.type] || typeMap.task_completed;
                uiItems.push({
                    key: null, isRead: false, urgency: 'low', time: new Date(a.created_at).getTime(), inner: `
                <div onclick="switchView('${t.view}'); closeNotifications();" class="notif-item flex items-start gap-3 p-3 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 shadow-sm hover:bg-gray-50 cursor-pointer transition-colors rounded-xl">
                    <div class="w-8 h-8 rounded-full ${t.bg} flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i data-lucide="${t.icon}" class="w-4 h-4 ${t.ic}"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">${a.message}</p>
                        <p class="text-[10px] text-gray-400 mt-0.5 uppercase font-bold">${a.branch} &bull; ${a.time}</p>
                    </div>
                    ${a.amount ? `<span class="text-xs font-black text-gray-700 dark:text-gray-300 mt-0.5">${fmt.currency(a.amount)}</span>` : ''}
                </div>` });
            });

        } else {

            const taskIdsRes = await supabaseClient.from('tasks').select('id').eq('branch_id', state.branchId);
            const taskIds = (taskIdsRes.data || []).map(t => t.id);

            const [tasksRes, stockRes, requests, comments, shiftsRes, announcesRes, transfersRes, returnsRes] = await Promise.all([
                supabaseClient.from('tasks').select('*').eq('branch_id', state.branchId).neq('status', 'completed').order('deadline', { ascending: true }),
                dbInventory.fetchAll(state.branchId),
                dbRequests.fetchByBranch(state.branchId),
                taskIds.length ? supabaseClient.from('task_comments').select('*, tasks!inner(title)').eq('sender_role', 'owner').eq('is_read', false).in('task_id', taskIds).order('created_at', { ascending: false }) : { data: [] },
                supabaseClient.from('shifts').select('*').eq('branch_id', state.branchId).order('created_at', { ascending: false }).limit(10),
                supabaseClient.from('announcements').select('*').eq('branch_id', state.branchId).order('created_at', { ascending: false }).limit(10),
                supabaseClient.from('stock_transfers').select('*').or(`from_branch_id.eq.${state.branchId},to_branch_id.eq.${state.branchId}`).order('created_at', { ascending: false }).limit(10),
                supabaseClient.from('product_returns').select('*').eq('branch_id', state.branchId).order('created_at', { ascending: false }).limit(10)
            ]);

            const allTasks = tasksRes.data || [];
            const lowStockItems = (stockRes.items || []).filter(i => i.quantity <= i.min_threshold);

            requests.filter(r => r.status === 'approved' || r.status === 'rejected' || r.admin_response).forEach(req => {
                const key = `req:${req.id}`;
                const isRead = window.isNotifRead?.(key);
                const statusColor = req.status === 'approved' ? 'bg-emerald-500' : req.status === 'rejected' ? 'bg-red-500' : 'bg-indigo-500';
                const badgeClass = req.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : req.status === 'rejected' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400';
                uiItems.push({
                    key, isRead, urgency: 'high', time: new Date(req.updated_at || req.created_at).getTime(), inner: `
                <div onclick="openResponseNotif('${req.id}')" class="notif-item p-4 bg-white dark:bg-white/5 border border-indigo-50 shadow-sm relative overflow-hidden hover:bg-gray-50 cursor-pointer transition-colors rounded-xl">
                    <div class="absolute top-0 left-0 w-1 h-full ${statusColor} rounded-l-xl"></div>
                    <div class="flex items-center justify-between mb-1.5 ml-3">
                        <p class="text-[9px] font-black uppercase text-gray-400 tracking-wider">Approval Response</p>
                        <span class="badge ${badgeClass} uppercase text-[9px] font-black">${req.status}</span>
                    </div>
                    <p class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight ml-3">${req.subject}</p>
                    ${req.admin_response ? `<p class="text-[11px] italic bg-indigo-500/10 p-2 rounded-lg border border-indigo-500/20 mt-2 ml-3 text-indigo-300">"${req.admin_response}"</p>` : ''}
                </div>` });
            });

            requests.filter(r => r.status === 'pending' && !r.admin_response).forEach(req => {
                const key = `req:${req.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'low', time: new Date(req.created_at).getTime(), inner: `
                <div onclick="switchView('requests', '${req.id}'); closeNotifications();" class="notif-item p-4 bg-white dark:bg-white/5 border border-gray-100 relative overflow-hidden opacity-80 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl">
                    <div class="absolute top-0 left-0 w-1 h-full bg-gray-300 dark:bg-gray-600 rounded-l-xl"></div>
                    <div class="flex items-center justify-between mb-1.5 ml-3">
                        <p class="text-[9px] font-black uppercase text-gray-400 tracking-wider">Pending Approval</p>
                        <span class="badge bg-gray-200/80 text-gray-500 uppercase text-[9px] font-black italic">Awaiting...</span>
                    </div>
                    <p class="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1 leading-tight ml-3">${req.subject}</p>
                </div>` });
            });

            lowStockItems.forEach(item => {
                const key = `stock:${item.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'high', time: Date.now() + 1000, inner: `
                <div onclick="switchView('inventory'); closeNotifications();" class="notif-item p-3 bg-white dark:bg-white/5 border border-orange-100 dark:border-orange-900/40 flex items-center gap-3 cursor-pointer hover:bg-orange-50 transition-colors rounded-xl">
                    <div class="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="alert-triangle" class="w-4 h-4 text-orange-600 dark:text-orange-400"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">${item.name}</p>
                        <p class="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-0.5">Low Stock — ${item.quantity} remaining</p>
                    </div>
                </div>` });
            });

            (comments.data || []).forEach(c => {
                const key = `comment:${c.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'high', time: new Date(c.created_at).getTime(), inner: `
                <div onclick="openTaskCommentNotif('${c.id}', '${c.task_id}')" class="notif-item p-4 bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 shadow-sm relative overflow-hidden cursor-pointer hover:bg-indigo-50 transition-colors rounded-xl">
                    <div class="absolute top-0 left-0 w-1 h-full bg-indigo-400 rounded-l-xl"></div>
                    <div class="flex items-center justify-between mb-1 ml-3">
                        <p class="font-bold text-sm text-gray-900 dark:text-gray-100 leading-tight">Task: ${c.tasks?.title}</p>
                        <span class="text-[9px] font-black text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded uppercase ml-2">Admin Reply</span>
                    </div>
                    <p class="text-xs text-gray-700 dark:text-gray-300 italic truncate border-l-2 border-indigo-200 pl-2 ml-3 mt-1">"${c.message}"</p>
                </div>` });
            });

            allTasks.forEach(task => {
                const key = `task:${task.id}`;
                const isRead = window.isNotifRead?.(key);
                const isOverdue = task.deadline && new Date(task.deadline) < new Date();
                uiItems.push({
                    key, isRead, urgency: isOverdue ? 'high' : 'normal', time: isOverdue ? Date.now() + 500 : new Date(task.created_at).getTime(), inner: `
                <div onclick="switchView('tasks'); closeNotifications();" class="notif-item p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/5 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl">
                    <div class="flex items-center gap-2 mb-1.5">
                        <span class="w-2 h-2 rounded-full ${isOverdue ? 'bg-red-500' : 'bg-indigo-500'} flex-shrink-0"></span>
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">${task.title}</p>
                    </div>
                    <p class="text-[11px] text-gray-500 line-clamp-1 font-medium ml-4">${task.description || 'No description'}</p>
                    ${task.deadline ? `<p class="text-[10px] font-black ${isOverdue ? 'text-red-500' : 'text-indigo-500'} uppercase tracking-tight flex items-center gap-1 mt-1 ml-4"><i data-lucide="calendar" class="w-3.5 h-3.5"></i> ${isOverdue ? 'OVERDUE' : 'Due'}: ${task.deadline}</p>` : ''}
                </div>` });
            });

            (shiftsRes.data || []).forEach(shift => {
                const key = `shift:${shift.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'normal', time: new Date(shift.created_at).getTime(), inner: `
                <div onclick="switchView('shift_summary'); closeNotifications();" class="notif-item p-3 bg-white dark:bg-white/5 border border-blue-100 dark:border-blue-900/40 flex items-center gap-3 cursor-pointer hover:bg-blue-50 transition-colors rounded-xl">
                    <div class="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="calendar-clock" class="w-4 h-4 text-blue-600 dark:text-blue-400"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100">New Shift Scheduled</p>
                        <p class="text-[10px] text-blue-500 font-black uppercase tracking-widest">${shift.date || ''} &bull; ${shift.shift_type || ''}</p>
                    </div>
                </div>` });
            });

            (announcesRes.data || []).forEach(a => {
                const key = `announce:${a.id}`;
                const isRead = window.isNotifRead?.(key);
                uiItems.push({
                    key, isRead, urgency: 'normal', time: new Date(a.created_at).getTime(), inner: `
                <div onclick="switchView('dashboard'); closeNotifications();" class="notif-item p-3 bg-white dark:bg-white/5 border border-violet-100 dark:border-violet-900/40 flex items-center gap-3 cursor-pointer hover:bg-violet-50 transition-colors rounded-xl">
                    <div class="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="megaphone" class="w-4 h-4 text-violet-600 dark:text-violet-400"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">${a.title || 'New Announcement'}</p>
                        <p class="text-[10px] text-violet-500 font-black uppercase tracking-widest">From Owner &bull; ${fmt.time(a.created_at)}</p>
                    </div>
                </div>` });
            });

            (transfersRes.data || []).forEach(t => {
                const key = `transfer:${t.id}`;
                const isRead = window.isNotifRead?.(key);
                const isIncoming = t.to_branch_id === state.branchId;
                const statusBg = t.status === 'approved' ? 'bg-emerald-500/20 text-emerald-600' : t.status === 'rejected' ? 'bg-red-500/20 text-red-600' : 'bg-amber-500/20 text-amber-600';
                uiItems.push({
                    key, isRead, urgency: t.status !== 'pending' ? 'high' : 'low', time: new Date(t.created_at).getTime(), inner: `
                <div onclick="switchView('stock_transfers'); closeNotifications();" class="notif-item p-3 bg-white dark:bg-white/5 border border-amber-100 dark:border-amber-900/40 flex items-center gap-3 cursor-pointer hover:bg-amber-50 transition-colors rounded-xl">
                    <div class="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="arrow-left-right" class="w-4 h-4 text-amber-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">${isIncoming ? 'Incoming Transfer' : 'Transfer Update'}: ${t.product_name || 'Item'}</p>
                        <p class="text-[10px] text-amber-600 font-black uppercase tracking-widest">${fmt.time(t.created_at)}</p>
                    </div>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${statusBg}">${t.status}</span>
                </div>` });
            });

            (returnsRes.data || []).forEach(r => {
                const key = `return:${r.id}`;
                const isRead = window.isNotifRead?.(key);
                const statusBg = r.status === 'approved' ? 'bg-emerald-500/20 text-emerald-600' : r.status === 'rejected' ? 'bg-red-500/20 text-red-600' : 'bg-gray-200 text-gray-600';
                uiItems.push({
                    key, isRead, urgency: r.status !== 'pending' ? 'high' : 'low', time: new Date(r.created_at).getTime(), inner: `
                <div onclick="switchView('returns'); closeNotifications();" class="notif-item p-3 bg-white dark:bg-white/5 border border-red-100 dark:border-red-900/40 flex items-center gap-3 cursor-pointer hover:bg-red-50 transition-colors rounded-xl">
                    <div class="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="rotate-ccw" class="w-4 h-4 text-red-600"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">Return: ${r.product_name || 'Item'}</p>
                        <p class="text-[10px] text-red-500 font-black uppercase tracking-widest">${fmt.time(r.created_at)}</p>
                    </div>
                    <span class="text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${statusBg}">${r.status}</span>
                </div>` });
            });
        }

        uiItems.sort((a, b) => {
            if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
            return b.time - a.time;
        });

        const unreadCount = uiItems.filter(i => !i.isRead && i.key).length;

        const notifPermBanner = ('Notification' in window && Notification.permission !== 'granted') ? `
        <div class="mb-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-3">
            <div class="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                <i data-lucide="bell-off" class="w-4 h-4 text-amber-600 shrink-0"></i>
                <span>Android notifications disabled</span>
            </div>
            <button type="button" onclick="window.requestNotificationPermission(true)" class="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-lg text-[11px] shadow-xs transition-colors shrink-0 cursor-pointer">
                Enable
            </button>
        </div>` : '';

        const headerHtml = `
        ${notifPermBanner}
        <div class="flex items-center justify-between mb-4 px-1">
            <div class="flex items-center gap-2">
                <span class="text-sm font-bold text-gray-700 dark:text-gray-200">Notifications</span>
                ${unreadCount > 0 ? `<span class="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full">${unreadCount} new</span>` : '<span class="text-[10px] text-gray-400 font-medium">All caught up</span>'}
            </div>
            ${unreadCount > 0 ? `<button onclick="window.markAllNotifsRead()" class="text-[10px] font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5">
                <i data-lucide="check-check" class="w-3 h-3"></i> Mark All Read
            </button>` : ''}
        </div>`;

        let bodyHtml = uiItems.length === 0
            ? `<div class="py-20 text-center text-gray-500 flex flex-col items-center">
                <div class="w-16 h-16 bg-gray-50 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="bell-off" class="w-8 h-8 text-gray-300"></i>
                </div>
                <p class="text-sm font-medium">No notifications yet</p>
                <p class="text-xs text-gray-400 mt-1">You're all caught up!</p>
            </div>`
            : uiItems.map(item => {
                if (!item.key) return `<div class="mb-2.5">${item.inner}</div>`;
                return window.buildNotifItem?.(item.key, item.inner, item.isRead, item.urgency) || item.inner;
            }).join('');

        content.innerHTML = headerHtml + bodyHtml;
        lucide.createIcons();
        window.addNotifInteractivity?.();
        window.checkNotifications?.(true);

    } catch (err) {
        content.innerHTML = `<div class="p-10 text-center text-red-500 text-sm"><i data-lucide="alert-circle" class="w-10 h-10 mx-auto mb-3 opacity-50"></i><br>Failed to load: ${err.message}</div>`;
        console.error('[showNotifications]', err);
    }
};

export function closeNotifications() {
    const overlay = document.getElementById('notifOverlay');
    const panel = document.getElementById('notifPanel');
    if (panel) panel.classList.add('translate-x-full');
    if (overlay) overlay.classList.add('opacity-0');
    setTimeout(() => {
        if (overlay) overlay.classList.add('hidden');
    }, 300);
};

export async function approveReset(reqId, branchId) {
    const newPin = await promptModal("Reset Branch PIN", "Enter new 6-digit PIN for this branch:", "e.g. 123456");
    if (newPin === null) return;
    if (!newPin || newPin.length !== 6) {
        showToast("Invalid PIN. It must be exactly 6 digits.", "error");
        return;
    }

    const { error: pinError } = await supabaseClient
        .from('branches')
        .update({ pin: newPin })
        .eq('id', branchId);

    if (pinError) {
        showToast('Failed to update PIN: ' + pinError.message, 'error');
        return;
    }

    await supabaseClient.from('access_requests').update({ status: 'approved' }).eq('id', reqId);

    showToast('PIN Updated Successfully', 'success');
    showNotifications();
};

export async function denyReset(reqId) {
    const confirmed = await confirmModal('Deny Request', 'Are you sure you want to deny this request?', 'Deny', 'Cancel');
    if (!confirmed) return;
    await supabaseClient.from('access_requests').update({ status: 'rejected' }).eq('id', reqId);
    showToast('Request Denied', 'info');
    showNotifications();
};

export function togglePasswordVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;

    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';

    btn.innerHTML = `<i data-lucide="${isPassword ? 'eye-off' : 'eye'}" class="w-4 h-4 text-gray-400"></i>`;
    lucide.createIcons();
};

export function checkSessionExpiry() {
    if (!state.profile) return;
    const sessionStart = localStorage.getItem('bms_session_start');
    if (!sessionStart) return;

    const maxHrs = state.profile.session_duration_hrs || 8;
    const ageMs = Date.now() - parseInt(sessionStart);

    if (ageMs > (maxHrs * 3600000)) {

        localStorage.removeItem('bms_session_start');
        alert('Your session has expired for security. You will be logged out.');
        if (typeof logout === 'function') logout();
    }
};

window.openTaskCommentNotif = async function (commentId, taskId) {
    try {
        await dbTaskComments.markAsRead(commentId);
        closeNotifications();

        checkNotifications(true);

        if (typeof openDetailsModal === 'function') {
            openDetailsModal('task', taskId);
        }
    } catch (err) {
        showToast('Error opening notification', 'error');
        console.error(err);
    }
};

window.openResponseNotif = function (reqId) {
    let dismissed = JSON.parse(localStorage.getItem('bms_dismissed_responses') || '[]');
    if (!dismissed.includes(reqId)) {
        dismissed.push(reqId);
        localStorage.setItem('bms_dismissed_responses', JSON.stringify(dismissed));
    }

    switchView('requests', reqId);
    closeNotifications();
    checkNotifications(true);
};

window.startSaaSTour = function (force = false) {
    if (!force) {

        if (localStorage.getItem('bms_has_seen_tour')) return;

        if (state.profile && state.profile.has_seen_tour) return;
    }

    const steps = [
        {
            title: "Welcome to BMS!",
            content: "Welcome to your trial. Let's walk through the key areas to get your business up to speed in minutes.",
            target: null
        },
        {
            title: "1. Add Your First Branch",
            content: "You need at least one active branch to process sales. Head over to Branches to set up your first location.",
            target: "button[onclick*=\"switchView('branches'\"]"
        },
        {
            title: "2. Add Your Team",
            content: "Need help managing your branches? Navigate to the Staff & HR section to invite your managers and assign them to a branch.",
            target: "button[onclick*=\"switchView('staff'\"]"
        },
        {
            title: "3. Build Your Catalog",
            content: "Before selling, you must stock your inventory. Go to the Inventory section to add or transfer products to your branches.",
            target: "button[onclick*=\"switchView('inventory'\"]"
        },
        {
            title: "4. Monitor Performance",
            content: "Back here on the Overview screen, you'll see a live feed of all branch activities, pending approvals, and low stock alerts.",
            target: "button[onclick*=\"switchView('overview'\"]"
        },
        {
            title: "5. Setup Your Subscription",
            content: "Your trial gives you access to the Pro plan. When you're ready, visit Settings to securely select your billing plan and keep business flowing smoothly.",
            target: "button[onclick*=\"switchView('settings')\"]"
        }
    ];

    let currentStep = 0;

    function renderTourStep() {
        const step = steps[currentStep];
        let targetEl = step.target ? document.querySelector(step.target) : null;

        let delay = 50;
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('mainSidebar');
            const isSidebarOpen = sidebar && !sidebar.classList.contains('-translate-x-full');
            const isSidebarTarget = step.target && (
                step.target.includes("switchView") || 
                (targetEl && document.getElementById('mainSidebar')?.contains(targetEl))
            );

            if (isSidebarTarget && !isSidebarOpen) {
                if (typeof toggleSidebar === 'function') toggleSidebar();
                delay = 350;
            } else if (!isSidebarTarget && isSidebarOpen) {
                if (typeof toggleSidebar === 'function') toggleSidebar();
                delay = 350;
            }
        }

        if (targetEl) {
            targetEl.scrollIntoView({ block: 'nearest' });
        }

        setTimeout(() => {
            if (step.target) targetEl = document.querySelector(step.target);

            let positionClass = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
            let inlineStyle = "";
            let cutoutHtml = "";

            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();

                if (window.innerWidth >= 768) {
                    let tooltipTop = Math.max(20, rect.top);
                    if (tooltipTop + 260 > window.innerHeight) {
                        tooltipTop = Math.max(20, window.innerHeight - 280);
                    }
                    positionClass = `fixed`;
                    inlineStyle = `style="top: ${tooltipTop}px; left: ${rect.right + 20}px;"`;
                    cutoutHtml = `<div class="absolute rounded-xl transition-all duration-300 pointer-events-none ring-4 ring-indigo-400" style="top: ${rect.top - 4}px; left: ${rect.left - 4}px; width: ${rect.width + 8}px; height: ${rect.height + 8}px; box-shadow: 0 0 0 9999px rgba(30, 27, 75, 0.75);"></div>`;
                } else {
                    positionClass = `fixed bottom-6 left-1/2 -translate-x-1/2`;
                    inlineStyle = `style="width: calc(100% - 2rem); max-width: 340px;"`;
                    cutoutHtml = `<div class="absolute rounded-xl transition-all duration-300 pointer-events-none ring-4 ring-indigo-400" style="top: ${rect.top - 4}px; left: ${rect.left - 4}px; width: ${rect.width + 8}px; height: ${rect.height + 8}px; box-shadow: 0 0 0 9999px rgba(30, 27, 75, 0.65);"></div>`;
                }
            } else {
                if (window.innerWidth < 768) {
                    positionClass = `fixed bottom-6 left-1/2 -translate-x-1/2`;
                    inlineStyle = `style="width: calc(100% - 2rem); max-width: 340px;"`;
                    cutoutHtml = `<div class="fixed inset-0 pointer-events-none" style="background-color: rgba(30, 27, 75, 0.65);"></div>`;
                } else {
                    cutoutHtml = `<div class="fixed inset-0 pointer-events-none backdrop-blur-sm" style="background-color: rgba(30, 27, 75, 0.75);"></div>`;
                }
            }

            const html = `
            <div id="tourOverlay" class="fixed inset-0 z-[100] overflow-hidden pointer-events-auto">${cutoutHtml}</div>
            <div id="tourTooltip" class="${positionClass} z-[110] w-[320px] bg-white rounded-2xl shadow-2xl border border-indigo-100 p-6 slide-in" ${inlineStyle}>
                <div class="mb-2 flex items-center gap-2">
                    <div class="w-8 h-8 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                        <i data-lucide="sparkles" class="w-4 h-4"></i>
                    </div>
                    <div class="text-[10px] font-black uppercase tracking-widest text-indigo-500">Step ${currentStep + 1} of ${steps.length}</div>
                </div>
                <h3 class="text-xl font-black text-gray-900 mb-2 leading-tight">${step.title}</h3>
                <p class="text-sm text-gray-600 font-medium mb-6">${step.content}</p>
                <div class="flex items-center justify-between">
                    <button id="tourSkipBtn" class="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider">Skip Tour</button>
                    <button id="tourNextBtn" class="btn-primary py-2 px-6 rounded-xl text-sm shadow-indigo-500/30">
                        ${currentStep === steps.length - 1 ? 'Finish' : 'Next <i data-lucide="arrow-right" class="w-4 h-4 ml-1 inline"></i>'}
                    </button>
                </div>
            </div>`;

            const oldOver = document.getElementById('tourOverlay');
            const oldTool = document.getElementById('tourTooltip');
            if (oldOver) oldOver.remove();
            if (oldTool) oldTool.remove();

            document.body.insertAdjacentHTML('beforeend', html);
            if (window.lucide) window.lucide.createIcons();

            document.getElementById('tourSkipBtn').onclick = () => endTour();
            document.getElementById('tourNextBtn').onclick = () => {
                currentStep++;
                if (currentStep >= steps.length) {
                    endTour();
                } else {
                    renderTourStep();
                }
            };
        }, delay);
    }

    async function endTour() {
        localStorage.setItem('bms_has_seen_tour', 'true');

        if (state.ownerId && state.profile && !state.profile.has_seen_tour) {
            try {
                const updated = await dbProfile.upsert(state.ownerId, { has_seen_tour: true });
                state.profile = updated;
            } catch (err) {
                console.error('Failed to sync tour status:', err);
            }
        }

        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('mainSidebar');
            const isSidebarOpen = sidebar && !sidebar.classList.contains('-translate-x-full');
            if (isSidebarOpen && typeof toggleSidebar === 'function') {
                toggleSidebar();
            }
        }

        const oldOver = document.getElementById('tourOverlay');
        const oldTool = document.getElementById('tourTooltip');
        if (oldOver) oldOver.remove();
        if (oldTool) oldTool.remove();
        showToast('You can replay the tour from settings later.', 'info');
    }

    setTimeout(() => renderTourStep(), 500);
};

window.startBranchTour = async function (force = false) {
    if (!force) {
        if (localStorage.getItem('bms_has_seen_branch_tour')) return;
        if (state.branchProfile && state.branchProfile.has_seen_branch_tour) return;

        const userId = state.currentUserUuid || state.branchId || state.ownerId || 'branch';
        try {
            if (window.supabaseClient) {
                const { data } = await window.supabaseClient.from('sys_settings').select('value').eq('key', `branch_tour_${userId}`).maybeSingle();
                if (data && data.value === 'true') {
                    localStorage.setItem('bms_has_seen_branch_tour', 'true');
                    return;
                }
            }
        } catch (e) {}
    }

    const steps = [
        {
            title: "Welcome to Branch Portal!",
            content: "Welcome to your active branch management console. Let's explore your essential daily POS, inventory, and shift workflows.",
            target: null
        },
        {
            title: "1. Point of Sale (POS)",
            content: "Process customer transactions, accept cash or mobile payments, apply item discounts, and generate instant sales receipts.",
            target: "button[onclick*=\"switchView('sales'\"]"
        },
        {
            title: "2. Branch Inventory & Stock",
            content: "Monitor product quantities, view low-stock warnings, and verify incoming inventory for this branch location.",
            target: "button[onclick*=\"switchView('inventory'\"]"
        },
        {
            title: "3. Stock Transfers & Requisitions",
            content: "Running out of items? Easily send stock replenishment requests to central warehouse or request transfers from partner branches.",
            target: "button[onclick*=\"switchView('requests'\"]"
        },
        {
            title: "4. Shifts & Cash Drawer",
            content: "Open and close daily shifts, perform cash drawer balancing, and view real-time sales shift totals.",
            target: "button[onclick*=\"switchView('shift_summary'\"]"
        },
        {
            title: "5. Attendance & Staff Roster",
            content: "Clock in/out for active shifts, check team attendance records, and track daily operational hours.",
            target: "button[onclick*=\"switchView('attendance'\"]"
        }
    ];

    let currentStep = 0;

    function renderTourStep() {
        const step = steps[currentStep];
        let targetEl = step.target ? document.querySelector(step.target) : null;

        let delay = 50;
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('mainSidebar');
            const isSidebarOpen = sidebar && !sidebar.classList.contains('-translate-x-full');
            const isSidebarTarget = step.target && (
                step.target.includes("switchView") || 
                (targetEl && document.getElementById('mainSidebar')?.contains(targetEl))
            );

            if (isSidebarTarget && !isSidebarOpen) {
                if (typeof toggleSidebar === 'function') toggleSidebar();
                delay = 350;
            } else if (!isSidebarTarget && isSidebarOpen) {
                if (typeof toggleSidebar === 'function') toggleSidebar();
                delay = 350;
            }
        }

        if (targetEl) {
            targetEl.scrollIntoView({ block: 'nearest' });
        }

        setTimeout(() => {
            if (step.target) targetEl = document.querySelector(step.target);

            let positionClass = "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
            let inlineStyle = "";
            let cutoutHtml = "";

            if (targetEl) {
                const rect = targetEl.getBoundingClientRect();

                if (window.innerWidth >= 768) {
                    let tooltipTop = Math.max(20, rect.top);
                    if (tooltipTop + 260 > window.innerHeight) {
                        tooltipTop = Math.max(20, window.innerHeight - 280);
                    }
                    positionClass = `fixed`;
                    inlineStyle = `style="top: ${tooltipTop}px; left: ${rect.right + 20}px;"`;
                    cutoutHtml = `<div class="absolute rounded-xl transition-all duration-300 pointer-events-none ring-4 ring-emerald-400" style="top: ${rect.top - 4}px; left: ${rect.left - 4}px; width: ${rect.width + 8}px; height: ${rect.height + 8}px; box-shadow: 0 0 0 9999px rgba(6, 78, 59, 0.75);"></div>`;
                } else {
                    positionClass = `fixed bottom-6 left-1/2 -translate-x-1/2`;
                    inlineStyle = `style="width: calc(100% - 2rem); max-w: 340px;"`;
                    cutoutHtml = `<div class="absolute rounded-xl transition-all duration-300 pointer-events-none ring-4 ring-emerald-400" style="top: ${rect.top - 4}px; left: ${rect.left - 4}px; width: ${rect.width + 8}px; height: ${rect.height + 8}px; box-shadow: 0 0 0 9999px rgba(6, 78, 59, 0.65);"></div>`;
                }
            } else {
                if (window.innerWidth < 768) {
                    positionClass = `fixed bottom-6 left-1/2 -translate-x-1/2`;
                    inlineStyle = `style="width: calc(100% - 2rem); max-w: 340px;"`;
                    cutoutHtml = `<div class="fixed inset-0 pointer-events-none" style="background-color: rgba(6, 78, 59, 0.65);"></div>`;
                } else {
                    cutoutHtml = `<div class="fixed inset-0 pointer-events-none backdrop-blur-sm" style="background-color: rgba(6, 78, 59, 0.75);"></div>`;
                }
            }

            const html = `
            <div id="branchTourOverlay" class="fixed inset-0 z-[100] overflow-hidden pointer-events-auto">${cutoutHtml}</div>
            <div id="branchTourTooltip" class="${positionClass} z-[110] w-[320px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-emerald-100 dark:border-emerald-800/40 p-6 slide-in" ${inlineStyle}>
                <div class="mb-2 flex items-center gap-2">
                    <div class="w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center">
                        <i data-lucide="compass" class="w-4 h-4"></i>
                    </div>
                    <div class="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Branch Guide ${currentStep + 1} of ${steps.length}</div>
                </div>
                <h3 class="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">${step.title}</h3>
                <p class="text-sm text-gray-600 dark:text-gray-300 font-medium mb-6">${step.content}</p>
                <div class="flex items-center justify-between">
                    <button id="branchTourSkipBtn" class="text-xs font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors uppercase tracking-wider">Skip Guide</button>
                    <button id="branchTourNextBtn" class="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-6 rounded-xl text-sm shadow-lg shadow-emerald-600/20">
                        ${currentStep === steps.length - 1 ? 'Finish' : 'Next <i data-lucide="arrow-right" class="w-4 h-4 ml-1 inline"></i>'}
                    </button>
                </div>
            </div>`;

            const oldOver = document.getElementById('branchTourOverlay');
            const oldTool = document.getElementById('branchTourTooltip');
            if (oldOver) oldOver.remove();
            if (oldTool) oldTool.remove();

            document.body.insertAdjacentHTML('beforeend', html);
            if (window.lucide) window.lucide.createIcons();

            const skipBtn = document.getElementById('branchTourSkipBtn');
            const nextBtn = document.getElementById('branchTourNextBtn');
            if (skipBtn) skipBtn.onclick = () => endBranchTour();
            if (nextBtn) nextBtn.onclick = () => {
                currentStep++;
                if (currentStep >= steps.length) {
                    endBranchTour();
                } else {
                    renderTourStep();
                }
            };
        }, delay);
    }

    async function endBranchTour() {
        localStorage.setItem('bms_has_seen_branch_tour', 'true');

        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('mainSidebar');
            const isSidebarOpen = sidebar && !sidebar.classList.contains('-translate-x-full');
            if (isSidebarOpen && typeof toggleSidebar === 'function') {
                toggleSidebar();
            }
        }

        const over = document.getElementById('branchTourOverlay');
        const tool = document.getElementById('branchTourTooltip');
        if (over) over.remove();
        if (tool) tool.remove();

        const userId = state.currentUserUuid || state.branchId || state.ownerId || 'branch';
        try {
            if (window.supabaseClient) {
                await window.supabaseClient.from('sys_settings').upsert({
                    key: `branch_tour_${userId}`,
                    value: 'true',
                    updated_at: new Date().toISOString()
                });
                if (state.branchId) {
                    await window.supabaseClient.from('branches').update({
                        has_seen_branch_tour: true
                    }).eq('id', state.branchId);
                }
            }
        } catch (e) {}

        if (state.branchProfile) state.branchProfile.has_seen_branch_tour = true;

        if (window.showToast) window.showToast('Branch tour completed!', 'success');
    }

    renderTourStep();
};

export function renderDisabledModuleNotice(viewId) {
    const mainContent = document.getElementById('mainContent');
    if (!mainContent) return;

    const moduleNames = {
        chat: 'Messages / Live Chat',
        quotations: 'Quotations (Kotesheni)',
        suppliers: 'Suppliers & POs',
        central_inventory: 'Central Inventory',
        stock_movements: 'Stock Ledger & Audit',
        payroll: 'Payroll',
        financial_reports: 'Financial Reports',
        promotions: 'Promotions',
        goals: 'Goals & KPIs',
        shifts: 'Shift Schedule',
        announcements: 'Announcements',
        audit: 'Audit Logs',
        returns: 'Product Returns',
        stock_transfers: 'Stock Transfers',
        loyalty: 'Customer Loyalty'
    };
    const modName = moduleNames[viewId] || viewId;

    const disabledTitle = window.t('feature_disabled_title', 'Feature Temporarily Disabled');
    const disabledMsg = window.t('feature_disabled_msg', `Access to the <strong>${modName}</strong> module has been temporarily disabled by the system administrator.`);
    const backBtnText = window.t('back_to_dashboard', 'Back to Dashboard');

    mainContent.innerHTML = `
    <div class="space-y-6 slide-in max-w-lg mx-auto py-16 px-4 text-center">
        <div class="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-100 dark:border-amber-900/50 shadow-sm">
            <i data-lucide="shield-alert" class="w-8 h-8"></i>
        </div>
        <div class="space-y-2">
            <h2 class="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">${disabledTitle}</h2>
            <p class="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed">${disabledMsg}</p>
        </div>
        <button onclick="window.switchView(state.role === 'owner' ? 'overview' : 'dashboard')" class="btn-primary text-xs sm:text-sm px-5 py-2.5 rounded-xl font-bold inline-flex items-center gap-2">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> ${backBtnText}
        </button>
    </div>`;
    if (window.lucide) window.lucide.createIcons();
}

window.loadDisabledModules = async function () {
    try {
        const { data, error } = await supabaseClient.from('sys_settings').select('value').eq('key', 'disabled_modules').maybeSingle();
        if (!error && data && data.value) {
            const list = JSON.parse(data.value);
            state.disabledModules = new Set(Array.isArray(list) ? list : []);
        } else {
            state.disabledModules = new Set();
        }
    } catch (e) {
        console.warn('[System] Failed to load disabled_modules:', e);
        state.disabledModules = new Set();
    }
    window.applyModuleRestrictions();
};

window.applyModuleRestrictions = function () {
    if (window.isSysadminImpersonationMode) {
        const ownerNav = document.getElementById('ownerNav');
        const branchNav = document.getElementById('branchNav');
        const sysadminNav = document.getElementById('sysadminNav');
        if (ownerNav) ownerNav.classList.remove('hidden');
        if (branchNav) branchNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');
        return;
    }
    if (typeof window.ensureSidebarNavVisible === 'function' && state.role) {
        window.ensureSidebarNavVisible(state.role);
    }
    if (state.role === 'sysadmin') return;
    const activeNavId = state.role === 'owner' ? 'ownerNav' : (state.role === 'branch' ? 'branchNav' : null);
    if (!activeNavId) return;

    const activeNav = document.getElementById(activeNavId);
    if (!activeNav) return;

    // Strictly enforce role container visibility isolation
    const ownerNav = document.getElementById('ownerNav');
    const branchNav = document.getElementById('branchNav');
    const sysadminNav = document.getElementById('sysadminNav');

    if (state.role === 'owner') {
        if (branchNav) branchNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');
        if (ownerNav) ownerNav.classList.remove('hidden');
    } else if (state.role === 'branch') {
        if (ownerNav) ownerNav.classList.add('hidden');
        if (sysadminNav) sysadminNav.classList.add('hidden');
        if (branchNav) branchNav.classList.remove('hidden');
    }

    const disabled = state.disabledModules || new Set();

    const navButtons = activeNav.querySelectorAll('button[onclick*="switchView"]');
    navButtons.forEach(btn => {
        const match = btn.getAttribute('onclick')?.match(/switchView\s*\(\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
            const route = match[1];
            if (disabled.has(route)) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
            }
        }
    });

    // Check section header containers inside activeNav only
    activeNav.querySelectorAll(':scope > div').forEach(sectionHeaderDiv => {
        let nextEl = sectionHeaderDiv.nextElementSibling;
        let hasVisibleBtn = false;
        while (nextEl && !nextEl.matches('div')) {
            if (nextEl.tagName === 'BUTTON' && !nextEl.classList.contains('hidden')) {
                hasVisibleBtn = true;
                break;
            }
            nextEl = nextEl.nextElementSibling;
        }
        if (hasVisibleBtn) {
            sectionHeaderDiv.classList.remove('hidden');
        } else {
            sectionHeaderDiv.classList.add('hidden');
        }
    });

    document.querySelectorAll('button[onclick*="switchView"]').forEach(btn => {
        if (btn.closest('#sidebarNav')) return;
        const match = btn.getAttribute('onclick')?.match(/switchView\s*\(\s*['"]([^'"]+)['"]/);
        if (match && match[1]) {
            const route = match[1];
            if (disabled.has(route)) {
                btn.classList.add('hidden');
            } else {
                btn.classList.remove('hidden');
            }
        }
    });
};

export function initBackNavigationGuard() {
    const loginScreen = document.getElementById('loginScreen');
    const isLoginVisible = loginScreen && !loginScreen.classList.contains('hidden');

    if (!state.role || isLoginVisible) {
        // When unauthenticated or on login screen, strip all view hashes so the URL is clean /app/
        try {
            if (window.location.hash && window.location.hash.includes('view=')) {
                history.replaceState(null, document.title, window.location.pathname);
            }
        } catch (e) {}
    } else {
        state.viewHistory = state.viewHistory || [];
        if (state.activeView && !state.viewHistory.includes(state.activeView)) {
            state.viewHistory.push(state.activeView);
        }

        // Seed initial history state ONLY when logged in so the device/browser back button stays trapped inside /app/
        try {
            if (!history.state || !history.state.bmsApp) {
                const initialView = state.activeView || 'overview';
                history.replaceState({ bmsApp: true, view: initialView, isRoot: true }, '', '#view=' + initialView);
                history.pushState({ bmsApp: true, view: initialView }, '', '#view=' + initialView);
            }
        } catch (e) {}
    }

    window.addEventListener('popstate', (e) => {
        const loginScreen = document.getElementById('loginScreen');
        const isLoginVisible = loginScreen && !loginScreen.classList.contains('hidden');
        if (!state.role || isLoginVisible) {
            try {
                if (window.location.hash && window.location.hash.includes('view=')) {
                    history.replaceState(null, document.title, window.location.pathname);
                }
            } catch (err) {}
            return;
        }

        // 1. Check if sign out confirmation modal itself is open -> close it and stay in app
        const signoutModal = document.getElementById('bms-signout-confirm-modal');
        if (signoutModal) {
            signoutModal.remove();
            try { history.pushState({ bmsApp: true, view: state.activeView || 'overview' }, '', '#view=' + (state.activeView || 'overview')); } catch (err) {}
            return;
        }

        // 2. Check if mobile sidebar is open -> close it
        const sidebar = document.getElementById('mainSidebar');
        const overlay = document.getElementById('sidebarOverlay');
        if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
            sidebar.classList.add('-translate-x-full');
            if (overlay) overlay.classList.add('hidden');
            try { history.pushState({ bmsApp: true, view: state.activeView || 'overview' }, '', '#view=' + (state.activeView || 'overview')); } catch (err) {}
            return;
        }

        // 3. Check if any modal or popup dialog is currently open -> close the topmost modal
        const openModals = Array.from(document.querySelectorAll(`
            #release-notes-modal-overlay,
            #bms-survey-modal-overlay,
            #bmsAiAssistantModal,
            .modal:not(.hidden),
            [id$="Modal"]:not(.hidden),
            [id$="-modal"]:not(.hidden),
            [id$="_modal"]:not(.hidden)
        `)).filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        });

        if (openModals.length > 0) {
            const topModal = openModals[openModals.length - 1];
            const closeBtn = topModal.querySelector('[id*="close"], [id*="Close"], [id*="cancel"], [id*="Cancel"], .close-modal, [onclick*="close"], [onclick*="Close"]') || topModal.querySelector('button');
            if (closeBtn) {
                closeBtn.click();
            } else {
                topModal.classList.add('hidden');
                topModal.remove?.();
            }
            try { history.pushState({ bmsApp: true, view: state.activeView || 'overview' }, '', '#view=' + (state.activeView || 'overview')); } catch (err) {}
            return;
        }

        // 4. In-App View Navigation: If we have multiple views in history stack, pop to previous view
        if (state.viewHistory && state.viewHistory.length > 1) {
            state.viewHistory.pop(); // Remove current view
            const prevView = state.viewHistory[state.viewHistory.length - 1];
            if (prevView && prevView !== state.activeView) {
                switchView(prevView, null, true);
                return;
            }
        }

        // 5. At root view with no remaining view history: prevent exit to landing page & prompt sign out confirmation
        try { history.pushState({ bmsApp: true, view: state.activeView || 'overview' }, '', '#view=' + (state.activeView || 'overview')); } catch (err) {}
        if (typeof window.confirmSignOut === 'function') {
            window.confirmSignOut();
        }
    });
}

// ── Service Worker Notification CTA Click Handler (Bust Stale Cache & Force Fresh Refresh) ──
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && (event.data.type === 'NOTIFICATION_CTA_NAVIGATE' || event.data.type === 'NOTIFICATION_NAVIGATE')) {
            const rawUrl = event.data.url || '';
            let targetView = null;
            try {
                const parsed = new URL(rawUrl, window.location.origin);
                targetView = parsed.searchParams.get('page') || parsed.searchParams.get('view') || (parsed.hash ? parsed.hash.replace('#', '').replace('view=', '') : null);
            } catch (e) {
                if (rawUrl.includes('page=')) targetView = rawUrl.split('page=')[1].split('&')[0];
            }

            // Invalidate all view data caches to prevent stale rendering
            window._cachedCentralItems = null;
            window._cachedBranchInventory = null;
            window._cachedOverview = null;

            if (targetView && typeof window.switchView === 'function') {
                window.switchView(targetView, { _forceFresh: true, _hasAutoRetried: true });
            } else if (typeof window.switchView === 'function' && window.state?.activeView) {
                window.switchView(window.state.activeView, { _forceFresh: true, _hasAutoRetried: true });
            }
        }
    });
}

// Signal clean app initialization and clear stale session flags
window.bmsAppInitialized = true;
try {
    sessionStorage.removeItem('bms_chunk_heal_attempt');
    sessionStorage.removeItem('bms_was_offline');
} catch (e) {}
