import { debounce } from './utils.js';
import { syncLogger } from './utils/syncLogger.js';

(function () {
    'use strict';

    const BRANCH_TABLE_VIEWS = {
        sales: { view: 'sales', fn: () => window.renderSalesModule?.() },
        expenses: { view: 'expenses', fn: () => window.renderExpensesModule?.() },
        inventory: { view: 'inventory', fn: () => { window._cachedBranchInventory = null; window.renderInventoryModule?.(); } },
        _sales_inventory: { view: 'sales', fn: () => { window._cachedBranchInventory = null; window.renderSalesModule?.(); } },
        _dashboard_inventory: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        central_inventory: { view: 'inventory', fn: () => { window._cachedBranchInventory = null; window.renderInventoryModule?.(); } },
        _sales_central_inventory: { view: 'sales', fn: () => { window._cachedBranchInventory = null; window.renderSalesModule?.(); } },
        inventory_purchases: { view: 'inventory', fn: () => window.renderInventoryModule?.() },
        customers: { view: 'customers', fn: () => { window._cachedCustomers = null; window.renderCustomersModule?.(); } },
        _sales_customers: { view: 'sales', fn: () => { window._cachedCustomers = null; } },
        tasks: { view: 'tasks', fn: () => window.renderBranchTasks?.() },
        task_comments: { view: 'tasks', fn: () => window.renderBranchTasks?.() },
        notes: { view: 'notes', fn: () => window.renderNotesModule?.() },
        loans: { view: 'loans', fn: () => window.renderLoansModule?.() },
        requests: { view: 'requests', fn: () => window.renderBranchRequestsList?.() },
        _dashboard_requests: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        staff: { view: 'staff', fn: () => { window.currentAllStaff = null; window.renderBranchStaffModule?.(); } },
        payroll: { view: 'payroll', fn: () => window.renderBranchPayroll?.() },
        quotations: { view: 'quotations', fn: () => window.renderBranchQuotations?.() },
        invoices: { view: 'invoices', fn: () => window.renderBranchInvoices?.() },
        attendance: { view: 'attendance', fn: () => window.renderBranchAttendance?.() },
        cash_drawer_sessions: { view: 'cash_drawer', fn: () => window.renderBranchCashDrawer?.() },
        cash_drawer: { view: 'cash_drawer', fn: () => window.renderBranchCashDrawer?.() },
        loyalty_programs: { view: 'loyalty', fn: () => window.renderBranchLoyalty?.() },
        stock_transfers: { view: 'stock_transfers', fn: () => window.renderBranchStockTransfers?.() },
        stock_movements: { view: 'inventory', fn: () => { window._cachedBranchInventory = null; window.renderInventoryModule?.(); } },
        _shifts_stock_movements: { view: 'shift_summary', fn: () => window.renderBranchShiftSummary?.() },
        product_returns: { view: 'returns', fn: () => window.renderBranchReturns?.() },
        returns: { view: 'returns', fn: () => window.renderBranchReturns?.() },
        shifts: { view: 'shift_summary', fn: () => window.renderBranchShiftSummary?.() },
        purchase_orders: { view: 'inventory', fn: () => window.renderInventoryModule?.() },
        chat: { view: 'chat', fn: () => window.renderChatModule?.() },

        _dashboard_sales: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        _dashboard_expenses: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        _dashboard_tasks: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
    };

    const OWNER_TABLE_VIEWS = {
        requests: { view: 'requests', fn: () => window.renderRequestsList?.() },
        _overview_requests: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        access_requests: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        branches: { view: 'branches', fn: () => window.renderBranchesManagement?.() },
        tasks: { view: 'tasks', fn: () => window.renderTasksManagement?.() },
        task_comments: { view: 'tasks', fn: () => window.renderTasksManagement?.() },
        _overview_tasks: { view: 'overview', fn: () => window.renderOwnerOverview?.() },

        central_inventory: { view: 'central_inventory', fn: () => { window._cachedCentralItems = null; window.renderOwnerInventoryModule?.(); } },
        _overview_central_inv: { view: 'overview', fn: () => { window._cachedCentralItems = null; window.renderOwnerOverview?.(); } },
        inventory: { view: 'central_inventory', fn: () => { window._cachedCentralItems = null; window.renderOwnerInventoryModule?.(); } },
        _overview_inventory: { view: 'overview', fn: () => { window._cachedCentralItems = null; window.renderOwnerOverview?.(); } },
        _branches_inventory: { view: 'branches', fn: () => { if (window.renderBranchDetailsTable) window.renderBranchDetailsTable(); if (window.renderBranchesManagement) window.renderBranchesManagement(); } },

        staff: { view: 'staff', fn: () => { window.currentAllStaff = null; window.renderOwnerStaffModule?.(); } },
        attendance: { view: 'staff', fn: () => { window.currentAllStaff = null; window.renderOwnerStaffModule?.(); } },
        payroll: { view: 'payroll', fn: () => window.renderPayrollModule?.() },
        quotations: { view: 'quotations', fn: () => window.renderQuotationsModule?.() },
        suppliers: { view: 'suppliers', fn: () => window.renderSuppliersModule?.() },
        purchase_orders: { view: 'suppliers', fn: () => window.renderSuppliersModule?.() },
        sys_custom_roles: { view: 'staff', fn: () => { window.currentAllStaff = null; window.renderOwnerStaffModule?.(); } },

        sales: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        expenses: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        capital_accounts: { view: 'capital', fn: () => window.renderOwnerCapitalModule?.() },
        capital_transactions: { view: 'capital', fn: () => window.renderOwnerCapitalModule?.() },
        _overview_capital: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        business_assets: { view: 'assets', fn: () => window.renderOwnerAssetsModule?.() },
        assets: { view: 'assets', fn: () => window.renderOwnerAssetsModule?.() },
        _overview_assets: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        business_loans: { view: 'loans', fn: () => window.renderOwnerLoansModule?.() },
        loans: { view: 'loans', fn: () => window.renderOwnerLoansModule?.() },
        _overview_loans: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        business_goals: { view: 'goals', fn: () => window.renderGoalsModule?.() },
        goals: { view: 'goals', fn: () => window.renderGoalsModule?.() },
        shifts: { view: 'shifts', fn: () => window.renderShiftsModule?.() },
        announcements: { view: 'announcements', fn: () => window.renderAnnouncementsModule?.() },
        promotions: { view: 'promotions', fn: () => window.renderPromotionsModule?.() },
        stock_movements: { view: 'stock_movements', fn: () => window.renderStockMovementsModule?.() },
        _overview_stock_movements: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        _central_inv_stock_movements: { view: 'central_inventory', fn: () => { window._cachedCentralItems = null; window.renderOwnerInventoryModule?.(); } },
        product_returns: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        stock_transfers: { view: 'stock_movements', fn: () => window.renderStockMovementsModule?.() },
        _overview_branches: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        _overview_staff: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        _analytics_sales: { view: 'analytics', fn: () => window.renderAnalytics?.() },
        _analytics_expenses: { view: 'analytics', fn: () => window.renderAnalytics?.() },
        chat: { view: 'chat', fn: () => window.renderChatModule?.() },
    };

    const SYSADMIN_TABLE_VIEWS = {
        profiles: { view: 'sysadmin-users', fn: () => window.renderSysadminView?.('sysadmin-users') },
        _dashboard_profiles: { view: 'sysadmin-dashboard', fn: () => window.renderSysadminView?.('sysadmin-dashboard') },
        branches: { view: 'sysadmin-health', fn: () => window.renderSysadminView?.('sysadmin-health') },
        _dashboard_branches: { view: 'sysadmin-dashboard', fn: () => window.renderSysadminView?.('sysadmin-dashboard') },
        sys_settings: { view: 'sysadmin-controls', fn: () => window.renderSysadminView?.('sysadmin-controls') },
        sys_banners: { view: 'sysadmin-communications', fn: () => window.renderSysadminView?.('sysadmin-communications') },
        sys_scheduled_toasts: { view: 'sysadmin-communications', fn: () => window.renderSysadminView?.('sysadmin-communications') },
        sys_popups: { view: 'sysadmin-communications', fn: () => window.renderSysadminView?.('sysadmin-communications') },
        sales: { view: 'sysadmin-dashboard', fn: () => window.renderSysadminView?.('sysadmin-dashboard') },
        _revenue_sales: { view: 'sysadmin-revenue', fn: () => window.renderSysadminView?.('sysadmin-revenue') },
        expenses: { view: 'sysadmin-dashboard', fn: () => window.renderSysadminView?.('sysadmin-dashboard') },
        sys_pricing_plans: { view: 'sysadmin-pricing', fn: () => window.renderSysadminView?.('sysadmin-pricing') },
    };

    const SUBSCRIPTIONS = [
        ['central_inventory', 'central_inventory', 'central_inventory'],
        ['sales', 'sales', 'sales'],
        ['expenses', 'expenses', 'expenses'],
        ['inventory', 'inventory', 'inventory'],
        ['inventory_purchases', 'inventory_purchases', 'inventory_purchases'],
        ['customers', 'customers', null],
        ['tasks', 'tasks', 'tasks'],
        ['notes', 'notes', null],
        ['loans', 'loans', 'loans'],
        ['requests', 'requests', 'requests'],
        ['access_requests', null, 'access_requests'],
        ['branches', 'branches', 'branches'],
        ['staff', 'staff', 'staff'],
        ['payroll', 'payroll', 'payroll'],
        ['quotations', 'quotations', 'quotations'],
        ['invoices', 'invoices', null],
        ['suppliers', 'suppliers', 'suppliers'],
        ['purchase_orders', 'inventory', 'suppliers'],
        ['sys_custom_roles', 'staff', 'staff'],
        ['messages', 'chat', 'chat'],
        ['chat_groups', 'chat', 'chat'],
        ['group_members', 'chat', 'chat'],
        ['pinned_messages', 'chat', 'chat'],
        ['task_comments', 'tasks', 'tasks'],
        ['announcements', 'announcements', 'announcements'],
        ['product_returns', 'returns', 'returns'],
        ['stock_transfers', 'stock_transfers', 'stock_transfers'],
        ['stock_movements', 'stock_transfers', 'stock_movements'],
        ['capital_accounts', null, 'capital'],
        ['capital_transactions', null, 'capital'],
        ['business_assets', null, 'assets'],
        ['business_loans', null, 'loans'],
        ['business_goals', null, 'goals'],
        ['shifts', 'shift_summary', 'shifts'],
        ['promotions', null, 'promotions'],
        ['cash_drawer_sessions', 'cash_drawer', null],
        ['attendance', 'attendance', 'staff'],
        ['notifications', 'notifications', 'notifications'],
        ['profiles', 'settings', 'settings'],
    ];

    let _channel = null;
    let _globalChannel = null;
    let _lastInitTime = 0;
    let _lastPresenceKey = null;
    let _reconnectTimer = null;
    let _reconnectAttempts = 0;
    let _authListenerAttached = false;
    let _isTeardownInProgress = false;
    const INIT_THROTTLE_MS = 1500;

    function getActiveView() {
        if (!window.state) return null;
        if (state.role === 'owner') return localStorage.getItem('lastOwnerView') || 'overview';
        if (state.role === 'branch') return localStorage.getItem('lastBranchView') || 'dashboard';
        if (state.role === 'sysadmin') return localStorage.getItem('lastSysadminView') || 'sysadmin-dashboard';
        return null;
    }

    /**
     * Strict Tenant Ownership Verification Guard
     * Ensures events and records strictly belong to the currently logged in owner or branch.
     */
    function isRecordForCurrentTenant(record, table, payload = {}) {
        if (!window.state || !window.state.role) return false;
        if (window.state.role === 'sysadmin') return true;

        // Global / system broadcast tables are universal
        if (['sys_settings', 'sys_banners', 'sys_scheduled_toasts', 'sys_surveys', 'pricing_plans', 'notifications'].includes(table)) {
            return true;
        }

        if (!record || typeof record !== 'object') return false;

        const currentOwnerId = window.state.ownerId || window.state.profile?.id;
        const currentBranchId = window.state.branchId || window.state.branchProfile?.id;
        const branchOwnerId = window.state.branchProfile?.owner_id || window.state.ownerId;
        const ownedBranchIds = (window.state.branches || []).map(b => b.id).filter(Boolean);

        const recBranchId = record.branch_id || payload?.branch_id;
        const recOwnerId = record.owner_id || payload?.owner_id;

        if (window.state.role === 'branch') {
            if (recBranchId && currentBranchId) {
                return String(recBranchId).toLowerCase() === String(currentBranchId).toLowerCase();
            }
            if (table === 'branches' && record.id && currentBranchId) {
                return String(record.id).toLowerCase() === String(currentBranchId).toLowerCase();
            }
            if (recOwnerId && branchOwnerId) {
                return String(recOwnerId).toLowerCase() === String(branchOwnerId).toLowerCase();
            }
            return false;
        }

        if (window.state.role === 'owner') {
            if (recOwnerId && currentOwnerId) {
                return String(recOwnerId).toLowerCase() === String(currentOwnerId).toLowerCase();
            }
            if (recBranchId && ownedBranchIds.length > 0) {
                return ownedBranchIds.some(id => String(id).toLowerCase() === String(recBranchId).toLowerCase());
            }
            if (table === 'profiles' && record.id && currentOwnerId) {
                return String(record.id).toLowerCase() === String(currentOwnerId).toLowerCase();
            }
            if (table === 'branches' && record.id) {
                return ownedBranchIds.some(id => String(id).toLowerCase() === String(record.id).toLowerCase());
            }
            return false;
        }

        return false;
    }

    function scheduleReconnect(delayMs = null) {
        if (_reconnectTimer) clearTimeout(_reconnectTimer);
        _reconnectAttempts++;

        // Exponential backoff: 1s, 2s, 4s, 8s, max 16s with +/- 20% jitter
        const base = Math.min(16000, Math.pow(2, _reconnectAttempts - 1) * 1000);
        const jitter = (Math.random() * 0.4 - 0.2) * base;
        const actualDelay = delayMs !== null ? delayMs : Math.max(1000, Math.round(base + jitter));

        syncLogger.warn('realtime', `Scheduling automatic channel reconnect in ${actualDelay}ms (attempt #${_reconnectAttempts})`);
        _reconnectTimer = setTimeout(() => {
            if (navigator.onLine && (state.role === 'sysadmin' || state.profile || state.branchProfile)) {
                window.initRealtimeSync(true);
            }
        }, actualDelay);
    }

    function handleChange(table, payload) {
        if (!window.state) return;
        const record = payload?.new || payload?.old;

        // Air-tight multi-tenant isolation guard: drop foreign events immediately
        if (!isRecordForCurrentTenant(record, table, payload)) {
            return;
        }

        syncLogger.log('realtime', `handleChange: ${table} [${payload?.eventType}]`, record);

        // ── Incremental Live Dashboard Recalculation ──────────────────────────
        try {
            if (state.role === 'owner' && state.ownerId && record) {
                window.patchOwnerDashboardWithLiveRecord?.(state.ownerId, table, payload.eventType, record);
            } else if (state.role === 'branch' && state.branchId && record) {
                window.patchBranchDashboardWithLiveRecord?.(state.branchId, table, payload.eventType, record);
            }
        } catch (patchErr) {
            syncLogger.warn('realtime', 'Live patch error:', patchErr);
        }

        if (table === 'sys_settings' && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            if (payload.new?.key === 'disabled_modules') {
                try {
                    const list = JSON.parse(payload.new?.value || '[]');
                    state.disabledModules = new Set(Array.isArray(list) ? list : []);
                    if (typeof window.applyModuleRestrictions === 'function') {
                        window.applyModuleRestrictions();
                    }
                } catch (err) {
                    syncLogger.warn('realtime', 'Failed to sync disabled_modules:', err);
                }
            }

            if (payload.new?.key === 'enable_modal_ai_assistant' && window.sysSettings) {
                window.sysSettings.enable_modal_ai_assistant = payload.new.value;
            }

            if (payload.new?.key === 'enable_ai_assistant' && window.sysSettings) {
                window.sysSettings.enable_ai_assistant = payload.new.value;
                if (typeof window.syncAiWidgetVisibility === 'function') {
                    window.syncAiWidgetVisibility();
                }
            }

            const isMaintenance = payload.new?.key === 'maintenance_mode' && payload.new?.value === 'true';
            const isNormal = payload.new?.key === 'maintenance_mode' && payload.new?.value === 'false';
            const isRegEnabled = payload.new?.key === 'allow_registrations' && payload.new?.value === 'true';
            const isRegDisabled = payload.new?.key === 'allow_registrations' && payload.new?.value === 'false';

            if (isMaintenance && state.role !== 'sysadmin') {
                window.showMaintenanceScreen?.();
                return;
            } else if (isNormal && state.role !== 'sysadmin') {
                const maintenanceOverlay = document.getElementById('maintenance-screen') || document.getElementById('maintenanceModal');
                if (maintenanceOverlay) {
                    window.hideMaintenanceScreen?.();
                    window.location.reload(true);
                }
                return;
            }

            if (isRegEnabled) {
                const regToggle = document.getElementById('regToggle');
                if (regToggle) regToggle.classList.remove('hidden');
            } else if (isRegDisabled) {
                const regToggle = document.getElementById('regToggle');
                if (regToggle) regToggle.classList.add('hidden');
            }
        }

        if (table === 'sys_banners') {
            debounce('global-banners', () => {
                window.showActiveSystemBanners?.();
            }, 100);
        }

        if (table === 'sys_scheduled_toasts' && (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE')) {
            const toast = payload.new;
            if (toast) {
                const now = new Date();
                const sched = new Date(toast.scheduled_at);
                const exp = toast.expires_at ? new Date(toast.expires_at) : new Date(now.getTime() + 24 * 60 * 60000);

                if (now >= sched && now <= exp) {
                    window.showToast?.(toast.message, toast.type || 'info', 8000);
                }
            }
        }

        if (table === 'sys_surveys') {
            const survey = payload.new;
            if (survey && survey.status === 'active') {
                window.handleIncomingSurvey?.(survey);
            } else if (survey && survey.status !== 'active') {
                window.closeSurveyModal?.();
            }
        }

        if (!state.role) return;
        if (state.role === 'owner' && !state.profile) return;
        if (state.role === 'branch' && !state.branchProfile) return;

        // ── Auto Patch IndexedDB Local Cache Instantly (Tenant Verified) ───────
        if (window.localDb && window.localDb[table]) {
            try {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    if (payload.new && payload.new.id) {
                        window.localDb[table].put(payload.new).catch(() => {});
                    }
                } else if (payload.eventType === 'DELETE') {
                    const idToDelete = payload.old?.id;
                    if (idToDelete) {
                        window.localDb[table].delete(idToDelete).catch(() => {});
                    }
                }
            } catch (cacheErr) {
                syncLogger.warn('realtime', `IndexedDB auto-patch warning for ${table}:`, cacheErr);
            }
        }

        const activeView = getActiveView();
        const routeMap = state.role === 'owner' ? OWNER_TABLE_VIEWS : (state.role === 'sysadmin' ? SYSADMIN_TABLE_VIEWS : BRANCH_TABLE_VIEWS);

        if ((table === 'profiles' || table === 'branches') && payload.eventType === 'UPDATE') {
            const isMyProfile = (table === 'profiles' && state.ownerId && String(payload.new?.id).toLowerCase() === String(state.ownerId).toLowerCase());
            const isMyBranch = (table === 'branches' && state.branchId && String(payload.new?.id).toLowerCase() === String(state.branchId).toLowerCase());
            const isMyOwnerBranch = (table === 'branches' && state.role === 'owner');

            if (isMyProfile || isMyBranch || isMyOwnerBranch) {
                const newTheme = payload.new?.theme;
                const currentStoredTheme = (isMyProfile ? state.profile?.theme : state.branchProfile?.theme);
                if (newTheme && newTheme !== currentStoredTheme) {
                    window.initTheme?.(newTheme);
                    if (isMyProfile && state.profile) state.profile.theme = newTheme;
                    if (isMyBranch && state.branchProfile) state.branchProfile.theme = newTheme;
                }

                if (isMyProfile && state.profile) {
                    const prevPlan = state.profile.plan;
                    const prevCycle = state.profile.billing_cycle;
                    Object.assign(state.profile, payload.new);

                    // If plan or subscription details changed, revalidate server entitlements live
                    if (payload.new.plan !== prevPlan || payload.new.billing_cycle !== prevCycle || payload.new.subscription_expires_at) {
                        syncLogger.log('realtime', 'Profile plan update detected from cloud:', payload.new.plan);
                        if (typeof window.revalidateSessionAndEntitlements === 'function') {
                            window.revalidateSessionAndEntitlements(true);
                        } else if (typeof window.updateSubscriptionBadge === 'function') {
                            window.updateSubscriptionBadge();
                        }
                    }
                }

                let existingState = null;
                if (table === 'branches' && state.role === 'owner' && state.branches) {
                    existingState = state.branches.find(b => String(b.id).toLowerCase() === String(payload.new?.id).toLowerCase());
                } else if (table === 'branches' && state.role === 'branch' && state.branchProfile) {
                    existingState = state.branchProfile;
                }

                if (existingState && payload.new) {
                    Object.assign(existingState, payload.new);
                }

                // Live reactive allowlist synchronization for active forms and toggle modals
                if (table === 'branches' && payload.new?.preferences) {
                    if (typeof window.updateActiveModalAllowlistUI === 'function') {
                        window.updateActiveModalAllowlistUI(payload.new.preferences, payload.new.id);
                    }
                }
            }
        }

        const matchingEntries = Object.entries(routeMap).filter(([key, val]) => {
            const baseTable = key.replace(/^_[^_]+_/, '');
            return baseTable === table || key === table;
        });

        if (table === 'staff' || table === 'sys_custom_roles') {
            window.currentAllStaff = null;
        }
        if (table === 'payroll') {
            window.currentPayrollList = null;
        }
        if (table === 'suppliers') {
            window.currentSuppliersList = null;
        }
        if (table === 'quotations') {
            window.currentQuotationsList = null;
        }

        if (table === 'central_inventory' || table === 'inventory') {
            window._cachedCentralItems = null;
            window._cachedBranchInventory = null;
            if (payload?.eventType === 'DELETE') {
                const deletedId = payload.old?.id || payload.old?.central_item_id;
                if (deletedId) {
                    window.vanishInventoryRows?.(deletedId);
                }
            }
        }

        matchingEntries.forEach(([key, entry]) => {
            if (entry.view === activeView) {
                debounce(`${state.role}-${entry.view}`, () => {
                    try { entry.fn(); } catch (e) {  }
                }, 350);
            }
        });

        const alertTables = ['requests', 'access_requests', 'messages', 'task_comments', 'announcements', 'tasks', 'product_returns', 'stock_transfers', 'notifications', 'profiles', 'branches'];
        if (alertTables.includes(table)) {
            debounce('global-notifications', () => {
                window.checkNotifications?.(false);
            }, 500);

            const notifOverlay = document.getElementById('notifOverlay');
            if (notifOverlay && !notifOverlay.classList.contains('hidden')) {
                debounce('silent-notif-refresh', () => {
                    window.showNotifications?.();
                }, 600);
            }
        }

        // ─── Live Notification Toast Dispatches ─────────────────────────────
        try {
            if (state.role === 'owner') {
                if (table === 'requests' && payload?.eventType === 'INSERT') {
                    const req = payload.new || {};
                    const bName = req.branch_name || 'Branch';
                    window.showToast?.(`New Request: ${req.subject || 'Requisition'} from ${bName}`, 'info', 7000);
                } else if (table === 'access_requests' && payload?.eventType === 'INSERT') {
                    const req = payload.new || {};
                    window.showToast?.(`New Login Access Request from ${req.branch_name || 'Branch'} (${req.phone || ''})`, 'warning', 8000);
                } else if (table === 'task_comments' && payload?.eventType === 'INSERT' && payload.new?.sender_role === 'branch') {
                    const comm = payload.new || {};
                    window.showToast?.(`Branch commented on task: "${comm.message || ''}"`, 'info', 6000);
                } else if (table === 'product_returns' && payload?.eventType === 'INSERT') {
                    const ret = payload.new || {};
                    window.showToast?.(`Customer return submitted: ${ret.product_name || 'Item'} (${ret.reason || ''})`, 'info', 6000);
                } else if (table === 'notifications' && payload?.eventType === 'INSERT') {
                    const notif = payload.new || {};
                    if (!notif.target_role || notif.target_role === 'owner') {
                        window.showToast?.(`${notif.title || 'Notification'}: ${notif.message || notif.body || ''}`, 'info', 7000);
                    }
                }
            } else if (state.role === 'branch') {
                if (table === 'requests' && payload?.eventType === 'UPDATE') {
                    const req = payload.new || {};
                    const isApproved = req.status === 'approved';
                    const isRejected = req.status === 'rejected';
                    if (isApproved || isRejected || req.admin_response) {
                        const statusBadge = isApproved ? 'APPROVED' : isRejected ? 'REJECTED' : 'UPDATED';
                        const note = req.admin_response ? ` - Response: "${req.admin_response}"` : '';
                        window.showToast?.(`Request ${statusBadge}: ${req.subject || 'Request'}${note}`, isApproved ? 'success' : isRejected ? 'warning' : 'info', 8000);
                    }
                } else if (table === 'tasks' && payload?.eventType === 'INSERT') {
                    const t = payload.new || {};
                    window.showToast?.(`New Task Assigned: ${t.title || 'Check task list'}`, 'info', 7000);
                } else if (table === 'task_comments' && payload?.eventType === 'INSERT' && payload.new?.sender_role === 'owner') {
                    const comm = payload.new || {};
                    window.showToast?.(`Owner commented on task: "${comm.message || ''}"`, 'info', 6000);
                } else if (table === 'announcements' && payload?.eventType === 'INSERT') {
                    const ann = payload.new || {};
                    window.showToast?.(`New Announcement: ${ann.title || 'Notice from management'}`, 'info', 8000);
                } else if (table === 'branches' && payload?.eventType === 'UPDATE' && payload.new?.target !== undefined) {
                    const oldTarget = payload.old?.target;
                    const newTarget = payload.new?.target;
                    if (oldTarget !== undefined && String(oldTarget) !== String(newTarget)) {
                        window.showToast?.(`Sales target updated to ${window.fmt.currency(newTarget)}`, 'info', 6000);
                    }
                } else if (table === 'notifications' && payload?.eventType === 'INSERT') {
                    const notif = payload.new || {};
                    if (!notif.target_role || notif.target_role === 'branch') {
                        window.showToast?.(`${notif.title || 'Notification'}: ${notif.message || notif.body || ''}`, 'info', 7000);
                    }
                }
            }
        } catch (e) {
            syncLogger.warn('realtime', 'Toast dispatch error:', e);
        }

        const activityTables = ['sales', 'expenses', 'tasks', 'inventory'];
        if (activityTables.includes(table)) {
            const notifOverlay = document.getElementById('notifOverlay');
            if (notifOverlay && !notifOverlay.classList.contains('hidden')) {
                debounce('silent-notif-refresh', () => {
                    window.showNotifications?.();
                }, 800);
            }
        }

        const chatTables = ['messages', 'branches', 'chat_groups', 'group_members'];
        if (chatTables.includes(table)) {
            debounce('global-chat-sidebar', () => {
                window.updateBranchList?.();
                window.updateGroupList?.();
            }, 500);
        }

        if (table === 'profiles') {
            debounce('global-profile', () => {
                if (state.role === 'owner' && payload.new?.id === (state.profile?.id || state.ownerId)) {
                    state.profile = { ...state.profile, ...payload.new };
                }
            }, 500);
        }

        if (table === 'branches') {
            debounce('global-branch-profile', () => {
                if (state.role === 'branch' && payload.new?.id === state.branchId) {
                    state.branchProfile = { ...state.branchProfile, ...payload.new };
                }
            }, 500);
        }

        if (table === 'messages') {
            window.refreshChat?.(payload);
        }
    }

    /**
     * Initialize or Re-establish Realtime Subscriptions
     */
    window.initRealtimeSync = function (forceReconnect = false) {
        syncLogger.log('realtime', `initRealtimeSync called. forceReconnect=${forceReconnect}, role=${state?.role}`);
        if (!window.supabaseClient) return;
        if (state.role !== 'sysadmin' && !window.state?.profile && !window.state?.branchProfile) return;

        const now = Date.now();
        let presenceKeyRaw;
        
        if (state.role === 'sysadmin') {
            presenceKeyRaw = 'sysadmin';
        } else if (state.role === 'owner') {
            presenceKeyRaw = state.ownerId;
        } else {
            presenceKeyRaw = state.branchId;
        }
        
        const presenceKey = presenceKeyRaw ? String(presenceKeyRaw).toLowerCase() : 'user_' + (state.role || 'guest');

        // Scoped tenant channel topic
        const tenantTopic = state.role === 'sysadmin'
            ? 'bms-sysadmin'
            : (state.role === 'owner'
                ? `bms-tenant-${state.ownerId}`
                : `bms-tenant-${state.branchProfile?.owner_id || state.ownerId || state.branchId}`);

        // If channel is already joined and healthy, skip unless forced
        if (_channel && _channel.state === 'joined' && presenceKey === _lastPresenceKey && !forceReconnect) {
            return;
        }

        // Throttle rapid reconnect spam
        if (now - _lastInitTime < INIT_THROTTLE_MS && !forceReconnect) {
            return;
        }

        _lastInitTime = now;
        _lastPresenceKey = presenceKey;

        // Clear existing reconnect timers
        if (_reconnectTimer) {
            clearTimeout(_reconnectTimer);
            _reconnectTimer = null;
        }

        // Clean teardown before recreation
        _isTeardownInProgress = true;
        if (_channel) {
            const oldChannel = _channel;
            _channel = null;
            try {
                supabaseClient.removeChannel(oldChannel);
            } catch (e) {}
        }
        if (_globalChannel) {
            const oldGlobalChannel = _globalChannel;
            _globalChannel = null;
            try {
                supabaseClient.removeChannel(oldGlobalChannel);
            } catch (e) {}
        }
        _isTeardownInProgress = false;

        // Hook up Supabase Auth listener once to ensure token refreshes sync seamlessly
        if (!_authListenerAttached && supabaseClient.auth) {
            _authListenerAttached = true;
            supabaseClient.auth.onAuthStateChange(async (event, session) => {
                syncLogger.log('auth', `Supabase onAuthStateChange: ${event}`);
                if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
                    if (session?.access_token) {
                        try {
                            if (typeof supabaseClient.realtime?.setAuth === 'function') {
                                await supabaseClient.realtime.setAuth(session.access_token);
                                syncLogger.log('auth', 'Realtime socket auth token refreshed successfully.');
                            }
                        } catch (e) {
                            syncLogger.warn('auth', 'Realtime setAuth warning:', e);
                        }
                    }
                    if (!_channel || (_channel.state !== 'joined' && _channel.state !== 'joining')) {
                        window.initRealtimeSync(true);
                    }
                } else if (event === 'SIGNED_OUT') {
                    window.destroyRealtimeSync();
                }
            });
        }

        // 1. Tenant-Isolated Operational Channel (Extended 30s timeout for CDC handshake resilience)
        _channel = supabaseClient.channel(tenantTopic, {
            config: {
                broadcast: { self: true },
                presence: { key: presenceKey },
                timeout: 30000
            }
        });

        _channel.on('presence', { event: 'sync' }, () => {
            const newState = _channel.presenceState();
            window.onlineUsers = {};

            if (Object.keys(newState).length > 0) {
                Object.keys(newState).forEach(key => {
                    window.onlineUsers[key.toLowerCase()] = newState[key][0];
                });
            }

            if (localStorage.getItem('lastOwnerView') === 'chat' || localStorage.getItem('lastBranchView') === 'chat') {
                window.updateChatPresenceUI?.();
                window.updateBranchList?.();
            }
        });

        _channel.on('presence', { event: 'join' }, ({ key, newPresences }) => {});
        _channel.on('presence', { event: 'leave' }, ({ key, leftPresences }) => {});

        window.vanishInventoryRows = function (ids) {
            if (!ids) return;
            const idList = (Array.isArray(ids) ? ids : [ids]).map(id => String(id));
            idList.forEach(id => {
                if (!id) return;
                const rows = document.querySelectorAll(`[data-central-id="${id}"], [data-item-id="${id}"], #central-item-row-${id}`);
                rows.forEach(row => {
                    row.style.transition = 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)';
                    row.style.opacity = '0';
                    row.style.transform = 'scale(0.96)';
                    setTimeout(() => {
                        try { row.remove(); } catch(e) {}
                    }, 360);
                });
            });
        };

        // ─── Tenant Broadcast Listeners ─────────────────────────────────────────
        _channel.on('broadcast', { event: 'data_mutation' }, (msg) => {
            const payload = msg?.payload || msg;
            if (payload && payload.table) {
                syncLogger.log('realtime', `Broadcast data_mutation: ${payload.table} (${payload.eventType})`);
                handleChange(payload.table, payload);
            }
        });

        _channel.on('broadcast', { event: 'inventory_delete' }, (msg) => {
            const payload = msg?.payload || msg;
            if (payload?.ids) {
                window.vanishInventoryRows?.(payload.ids);
                window._cachedCentralItems = null;
                window._cachedBranchInventory = null;
                debounce('realtime-inv-vanish-refresh', () => {
                    const currentView = getActiveView();
                    if (currentView === 'central_inventory') {
                        window.renderOwnerInventoryModule?.();
                    } else if (currentView === 'inventory') {
                        window.renderInventoryModule?.();
                    }
                }, 400);
            }
        });

        _channel.on('broadcast', { event: 'sync' }, (msg) => {
            const payload = msg?.payload || msg;
            if (payload.table === 'messages') {
                window.refreshChat?.({ ...payload, eventType: payload.eventType || 'BROADCAST' });
            }
        });

        _channel.on('broadcast', { event: 'typing' }, (event) => {
            if (window.handleTypingIndicator) window.handleTypingIndicator(event);
        });

        // ─── Database Postgres Changes Subscription (Scoped by Tenant) ───────────
        SUBSCRIPTIONS.forEach(([table, branchKey, ownerKey]) => {
            const isRelevant = state.role === 'owner' ? ownerKey !== null : (state.role === 'sysadmin' ? true : branchKey !== null);
            if (!isRelevant) return;

            let filter = null;
            if (state.role === 'branch') {
                if (table === 'branches') {
                    filter = `id=eq.${state.branchId}`;
                } else if (['sales', 'expenses', 'inventory', 'inventory_purchases', 'customers', 'tasks', 'notes', 'loans', 'requests', 'messages', 'task_comments'].includes(table)) {
                    filter = `branch_id=eq.${state.branchId}`;
                }
            } else if (state.role === 'owner') {
                if (table === 'profiles') {
                    filter = `id=eq.${state.ownerId}`;
                } else if (['branches', 'access_requests', 'requests', 'central_inventory', 'staff', 'capital_accounts', 'business_assets', 'stock_movements', 'suppliers'].includes(table)) {
                    filter = `owner_id=eq.${state.ownerId}`;
                }
            }

            const opts = { event: '*', schema: 'public', table };
            if (filter) {
                opts.filter = filter;
            }

            _channel.on('postgres_changes', opts, (payload) => {
                handleChange(table, payload);
            });
        });

        const currentTenantChannel = _channel;
        _channel.subscribe(async (status) => {
            // Ignore events for stale, replaced, or destroyed channel instances
            if (_channel !== currentTenantChannel) {
                return;
            }

            syncLogger.log('realtime', `Tenant channel (${tenantTopic}) status: ${status} (role: ${state?.role})`);
            if (status === 'SUBSCRIBED') {
                window.realtimeChannel = _channel;
                _reconnectAttempts = 0; // Reset backoff upon successful subscription

                if (presenceKey) {
                    try {
                        await currentTenantChannel.track({
                            id: presenceKey,
                            name: state.currentUser || state.role,
                            role: state.role,
                            online_at: new Date().toISOString()
                        });
                    } catch (e) {}
                }

                // Immediately trigger incremental cloud reconciliation to fetch any missed updates
                if (window.syncManager && typeof window.syncManager.reconcile === 'function') {
                    window.syncManager.reconcile(false, 'realtime_subscribed');
                }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                syncLogger.warn('realtime', `Tenant channel failure status: ${status}`);
                if (_channel === currentTenantChannel && !_isTeardownInProgress) {
                    scheduleReconnect();
                }
            } else if (status === 'CLOSED') {
                syncLogger.log('realtime', 'Tenant channel closed.');
                if (_channel === currentTenantChannel && !_isTeardownInProgress) {
                    scheduleReconnect();
                }
            }
        });

        // 2. Global Broadcast Channel (System Notifications, Banners, Controls)
        _globalChannel = supabaseClient.channel('bms-global', {
            config: {
                broadcast: { self: true },
                timeout: 30000
            }
        });

        _globalChannel.on('broadcast', { event: 'sys_settings_update' }, (msg) => {
            const payload = msg?.payload || msg;
            syncLogger.log('realtime', 'Broadcast: sys_settings_update', payload);
            if (payload?.key) {
                handleChange('sys_settings', {
                    eventType: 'UPDATE',
                    new: { key: payload.key, value: String(payload.value) }
                });
            }
        });

        _globalChannel.on('broadcast', { event: 'sys_banners_update' }, (msg) => {
            const payload = msg?.payload || msg;
            syncLogger.log('realtime', 'Broadcast: sys_banners_update', payload);
            debounce('global-banners', () => {
                if (typeof window.showActiveSystemBanners === 'function') {
                    window.showActiveSystemBanners();
                }
            }, 50);
            if (state.role === 'sysadmin') {
                if (typeof window.renderSiteControls === 'function') {
                    window.renderSiteControls();
                }
                if (typeof window.renderAdminCommunications === 'function') {
                    window.renderAdminCommunications();
                }
            }
        });

        _globalChannel.on('broadcast', { event: 'sys_toast_broadcast' }, (msg) => {
            const payload = msg?.payload || msg;
            syncLogger.log('realtime', 'Broadcast: sys_toast_broadcast', payload);
            if (payload?.message) {
                window.showToast?.(payload.message, payload.type || 'info', payload.duration || 8000);
            }
        });

        _globalChannel.on('broadcast', { event: 'sys_survey_broadcast' }, (msg) => {
            const payload = msg?.payload || msg;
            syncLogger.log('realtime', 'Broadcast: sys_survey_broadcast', payload);
            if (payload?.action === 'active' && payload.survey) {
                window.handleIncomingSurvey?.(payload.survey);
            } else if (payload?.action === 'closed' || payload?.action === 'deleted') {
                window.closeSurveyModal?.();
            } else {
                window.checkAndShowActiveSurveys?.();
            }
        });

        _globalChannel.on('broadcast', { event: 'sys_version_broadcast' }, (msg) => {
            const payload = msg?.payload || msg;
            syncLogger.log('realtime', 'Broadcast: sys_version_broadcast', payload);
            if (window.showAppUpdateBanner) {
                window.showAppUpdateBanner(payload.version, payload.notes);
            } else if (window.showActiveSystemBanners) {
                window.showActiveSystemBanners();
            }
        });

        _globalChannel.on('broadcast', { event: 'sys_push_broadcast' }, async (msg) => {
            const payload = msg?.payload || msg;
            syncLogger.log('realtime', 'Broadcast: sys_push_broadcast', payload);
            if (payload && payload.title) {
                if (typeof window.handleIncomingPushPayload === 'function') {
                    await window.handleIncomingPushPayload(payload);
                }
            }
        });

        // Global PostgreSQL Database CDC Listeners on _globalChannel (Only valid, existing tables)
        const GLOBAL_TABLES = ['sys_settings', 'sys_banners', 'sys_scheduled_toasts', 'sys_popups', 'sys_pricing_plans'];
        GLOBAL_TABLES.forEach(table => {
            _globalChannel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
                syncLogger.log('realtime', `Global postgres_changes: table=${table} event=${payload?.eventType}`, payload?.new || payload?.old);
                handleChange(table, payload);
            });
        });

        const currentGlobalChannel = _globalChannel;
        _globalChannel.subscribe((status) => {
            if (_globalChannel !== currentGlobalChannel) return;
            syncLogger.log('realtime', `Global channel (bms-global) status: ${status}`);
        });
    };

    window.broadcastSystemEvent = async function (event, payload) {
        try {
            syncLogger.log('realtime', `Dispatching broadcast: ${event}`, payload);

            const isGlobalEvent = ['sys_settings_update', 'sys_banners_update', 'sys_toast_broadcast', 'sys_survey_broadcast', 'sys_version_broadcast', 'sys_push_broadcast'].includes(event);

            if (isGlobalEvent) {
                if (_globalChannel && _globalChannel.state === 'joined') {
                    await _globalChannel.send({
                        type: 'broadcast',
                        event: event,
                        payload: payload
                    });
                } else {
                    const client = window.supabaseClient || window.supabase;
                    if (client) {
                        const gCh = client.channel('bms-global');
                        await gCh.send({
                            type: 'broadcast',
                            event: event,
                            payload: payload
                        });
                    }
                }
            }

            if (_channel && _channel.state === 'joined') {
                await _channel.send({
                    type: 'broadcast',
                    event: event,
                    payload: payload
                });
            }
            return true;
        } catch (err) {
            syncLogger.warn('realtime', 'broadcastSystemEvent failed:', err);
            return false;
        }
    };

    window.broadcastDataMutation = async function (table, eventType, record) {
        if (!table || !record) return;
        const payload = {
            table,
            eventType: eventType || 'INSERT',
            new: (eventType === 'DELETE' ? null : record),
            old: (eventType === 'DELETE' ? record : null),
            owner_id: window.state?.ownerId || (window.state?.profile && window.state.profile.id) || null,
            branch_id: window.state?.branchId || (record && record.branch_id) || null,
            sender_role: window.state?.role || null,
            timestamp: Date.now()
        };
        return window.broadcastSystemEvent('data_mutation', payload);
    };

    window.destroyRealtimeSync = function () {
        _isTeardownInProgress = true;
        if (_reconnectTimer) {
            clearTimeout(_reconnectTimer);
            _reconnectTimer = null;
        }
        if (_channel) {
            const oldChannel = _channel;
            _channel = null;
            try {
                supabaseClient.removeChannel(oldChannel);
            } catch (e) {}
        }
        if (_globalChannel) {
            const oldGlobalChannel = _globalChannel;
            _globalChannel = null;
            try {
                supabaseClient.removeChannel(oldGlobalChannel);
            } catch (e) {}
        }
        _isTeardownInProgress = false;
        window.realtimeChannel = null;
        _lastPresenceKey = null;
    };

    window.addEventListener('beforeunload', () => {
        window.destroyRealtimeSync();
    });

    window.addEventListener('online', () => {
        if (!_channel || _channel.state !== 'joined') {
            syncLogger.log('realtime', 'Online detected. Restoring Realtime subscription...');
            window.initRealtimeSync(true);
        }
    });

    window.addEventListener('offline', () => {
        syncLogger.log('realtime', 'Network offline detected.');
    });

})();
