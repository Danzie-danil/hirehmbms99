import { debounce } from './utils.js';

(function () {
    'use strict';

    const BRANCH_TABLE_VIEWS = {
        sales: { view: 'sales', fn: () => window.renderSalesModule?.() },
        expenses: { view: 'expenses', fn: () => window.renderExpensesModule?.() },
        inventory: { view: 'inventory', fn: () => { window._cachedBranchInventory = null; window.renderInventoryModule?.(); } },
        central_inventory: { view: 'inventory', fn: () => { window._cachedBranchInventory = null; window.renderInventoryModule?.(); } },
        inventory_purchases: { view: 'inventory', fn: () => window.renderInventoryModule?.() },
        customers: { view: 'customers', fn: () => window.renderCustomersModule?.() },
        tasks: { view: 'tasks', fn: () => window.renderBranchTasks?.() },
        notes: { view: 'notes', fn: () => window.renderNotesModule?.() },
        loans: { view: 'loans', fn: () => window.renderLoansModule?.() },
        requests: { view: 'requests', fn: () => window.renderBranchRequestsList?.() },
        staff: { view: 'staff', fn: () => { window.currentAllStaff = null; window.renderBranchStaffModule?.(); } },
        payroll: { view: 'payroll', fn: () => window.renderBranchPayroll?.() },
        quotations: { view: 'quotations', fn: () => window.renderBranchQuotations?.() },
        chat: { view: 'chat', fn: () => window.renderChatModule?.() },

        _dashboard_sales: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        _dashboard_expenses: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        _dashboard_tasks: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        _dashboard_inventory: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
        _dashboard_requests: { view: 'dashboard', fn: () => window.renderBranchDashboard?.() },
    };

    const OWNER_TABLE_VIEWS = {
        requests: { view: 'requests', fn: () => window.renderRequestsList?.() },
        access_requests: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        branches: { view: 'branches', fn: () => window.renderBranchesManagement?.() },
        tasks: { view: 'tasks', fn: () => window.renderTasksManagement?.() },

        central_inventory: { view: 'central_inventory', fn: () => { window._cachedCentralItems = null; window.renderOwnerInventoryModule?.(); } },
        inventory: { view: 'central_inventory', fn: () => { window._cachedCentralItems = null; window.renderOwnerInventoryModule?.(); } },
        _overview_central_inv: { view: 'overview', fn: () => { window._cachedCentralItems = null; window.renderOwnerOverview?.(); } },

        staff: { view: 'staff', fn: () => { window.currentAllStaff = null; window.renderOwnerStaffModule?.(); } },
        payroll: { view: 'payroll', fn: () => window.renderPayrollModule?.() },
        quotations: { view: 'quotations', fn: () => window.renderQuotationsModule?.() },
        suppliers: { view: 'suppliers', fn: () => window.renderSuppliersModule?.() },
        sys_custom_roles: { view: 'staff', fn: () => { window.currentAllStaff = null; window.renderOwnerStaffModule?.(); } },

        sales: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        expenses: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        _overview_branches: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        _overview_staff: { view: 'overview', fn: () => window.renderOwnerOverview?.() },
        _analytics_sales: { view: 'analytics', fn: () => window.renderAnalytics?.() },
        _analytics_expenses: { view: 'analytics', fn: () => window.renderAnalytics?.() },
        chat: { view: 'chat', fn: () => window.renderChatModule?.() },
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
        ['loans', 'loans', null],
        ['requests', 'requests', 'requests'],
        ['access_requests', null, 'access_requests'],
        ['branches', 'branches', 'branches'],
        ['staff', 'staff', 'staff'],
        ['payroll', 'payroll', 'payroll'],
        ['quotations', 'quotations', 'quotations'],
        ['suppliers', 'suppliers', 'suppliers'],
        ['sys_custom_roles', 'staff', 'staff'],
        ['messages', 'chat', 'chat'],
        ['chat_groups', 'chat', 'chat'],
        ['group_members', 'chat', 'chat'],
        ['pinned_messages', 'chat', 'chat'],
        ['task_comments', 'tasks', 'tasks'],
        ['announcements', 'announcements', 'announcements'],
        ['product_returns', 'returns', 'returns'],
        ['stock_transfers', 'stock_transfers', 'stock_transfers'],
        ['notifications', 'notifications', 'notifications'],
        ['profiles', 'settings', 'settings'],
        ['sys_settings', 'settings', 'settings'],
        ['sys_banners', 'settings', 'settings'],
        ['sys_scheduled_toasts', 'settings', 'settings'],
    ];

    let _channel = null;
    let _lastInitTime = 0;
    let _lastPresenceKey = null;
    const INIT_THROTTLE_MS = 2000;

    function getActiveView() {
        if (!window.state) return null;
        if (state.role === 'owner') return localStorage.getItem('lastOwnerView') || 'overview';
        if (state.role === 'branch') return localStorage.getItem('lastBranchView') || 'dashboard';
        return null;
    }

    function handleChange(table, payload) {
        console.log('[Realtime] handleChange called:', table, payload?.eventType, payload?.new || payload?.old);
        if (!window.state) return;

        if (table === 'sys_settings' && (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT')) {
            if (payload.new?.key === 'disabled_modules') {
                try {
                    const list = JSON.parse(payload.new?.value || '[]');
                    state.disabledModules = new Set(Array.isArray(list) ? list : []);
                    if (typeof window.applyModuleRestrictions === 'function') {
                        window.applyModuleRestrictions();
                    }
                } catch (err) {
                    console.warn('[Realtime] Failed to sync disabled_modules:', err);
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

        // ── Auto Patch IndexedDB Local Cache Instantly ─────────────────────────
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
                console.warn(`[Realtime] IndexedDB auto-patch warning for ${table}:`, cacheErr);
            }
        }

        const activeView = getActiveView();
        const routeMap = state.role === 'owner' ? OWNER_TABLE_VIEWS : BRANCH_TABLE_VIEWS;

        if ((table === 'profiles' || table === 'branches') && payload.eventType === 'UPDATE') {
            const isMyProfile = (table === 'profiles' && state.ownerId && String(payload.new?.id).toLowerCase() === String(state.ownerId).toLowerCase());
            const isMyBranch = (table === 'branches' && state.branchId && String(payload.new?.id).toLowerCase() === String(state.branchId).toLowerCase());

            if (isMyProfile || isMyBranch) {
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
                        console.log('[Realtime] Profile plan update detected from cloud:', payload.new.plan);
                        if (typeof window.revalidateSessionAndEntitlements === 'function') {
                            window.revalidateSessionAndEntitlements(true);
                        } else if (typeof window.updateSubscriptionBadge === 'function') {
                            window.updateSubscriptionBadge();
                        }
                    }
                }

                let existingState = null;
                if (table === 'branches' && state.role === 'owner' && state.branches) {
                    existingState = state.branches.find(b => String(b.id).toLowerCase() === String(payload.new.id).toLowerCase());
                } else if (table === 'branches' && state.role === 'branch' && state.branchProfile) {
                    existingState = state.branchProfile;
                }

                if (existingState) {
                    Object.assign(existingState, payload.new);
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
            console.warn('[Realtime Toast Dispatch Warning]:', e);
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

    window.initRealtimeSync = function (forceReconnect = false) {
        console.log('[Realtime] initRealtimeSync called. role:', state?.role, 'profile:', !!state?.profile, 'branchProfile:', !!state?.branchProfile, 'supabaseClient:', !!window.supabaseClient);
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

        if (_channel && presenceKey === _lastPresenceKey && !forceReconnect) {
            return;
        }

        _lastInitTime = now;
        _lastPresenceKey = presenceKey;

        if (_channel) {
            try {
                supabaseClient.removeChannel(_channel);
            } catch (e) {}
            _channel = null;
        }

        _channel = supabaseClient.channel('bms-live', {
            config: {
                broadcast: { self: true },
                presence: { key: presenceKey }
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

        // ─── Dual-Layer Realtime Broadcast Listeners ─────────────────────────────
        _channel.on('broadcast', { event: 'sys_settings_update' }, (msg) => {
            const payload = msg?.payload || msg;
            console.log('[Realtime] Broadcast received: sys_settings_update', payload);
            if (payload?.key) {
                handleChange('sys_settings', {
                    eventType: 'UPDATE',
                    new: { key: payload.key, value: String(payload.value) }
                });
            }
        });

        _channel.on('broadcast', { event: 'sys_banners_update' }, (msg) => {
            const payload = msg?.payload || msg;
            console.log('[Realtime] Broadcast received: sys_banners_update', payload);
            debounce('global-banners', () => {
                window.showActiveSystemBanners?.();
            }, 50);
            if (state.role === 'sysadmin' && typeof window.renderSiteControls === 'function') {
                window.renderSiteControls();
            }
        });

        _channel.on('broadcast', { event: 'sys_toast_broadcast' }, (msg) => {
            const payload = msg?.payload || msg;
            console.log('[Realtime] Broadcast received: sys_toast_broadcast', payload);
            if (payload?.message) {
                window.showToast?.(payload.message, payload.type || 'info', payload.duration || 8000);
            }
        });

        _channel.on('broadcast', { event: 'sys_survey_broadcast' }, (msg) => {
            const payload = msg?.payload || msg;
            console.log('[Realtime] Broadcast received: sys_survey_broadcast', payload);
            if (payload?.action === 'active' && payload.survey) {
                window.handleIncomingSurvey?.(payload.survey);
            } else if (payload?.action === 'closed' || payload?.action === 'deleted') {
                window.closeSurveyModal?.();
            } else {
                window.checkAndShowActiveSurveys?.();
            }
        });

        _channel.on('broadcast', { event: 'sys_version_broadcast' }, (msg) => {
            const payload = msg?.payload || msg;
            console.log('[Realtime] Broadcast received: sys_version_broadcast', payload);
            if (window.showAppUpdateBanner) {
                window.showAppUpdateBanner(payload.version, payload.notes);
            } else if (window.showActiveSystemBanners) {
                window.showActiveSystemBanners();
            }
        });

        _channel.on('broadcast', { event: 'sys_push_broadcast' }, async (msg) => {
            const payload = msg?.payload || msg;
            console.log('[Realtime] Broadcast received: sys_push_broadcast', payload);
            if (payload && payload.title) {
                if (typeof window.handleIncomingPushPayload === 'function') {
                    await window.handleIncomingPushPayload(payload);
                }
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

        // ─── Database Postgres Changes Subscription ──────────────────────────────
        SUBSCRIPTIONS.forEach(([table, branchKey, ownerKey]) => {
            const isRelevant = state.role === 'owner' ? ownerKey !== null : branchKey !== null;
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
                } else if (['branches', 'access_requests', 'requests', 'central_inventory'].includes(table)) {
                    filter = `owner_id=eq.${state.ownerId}`;
                }
            }

            const opts = { event: '*', schema: 'public', table };
            if (filter) {
                opts.filter = filter;
            }

            _channel.on('postgres_changes', opts, (payload) => {
                console.log(`[Realtime] postgres_changes RECEIVED: table=${table} event=${payload?.eventType}`, payload?.new || payload?.old);
                handleChange(table, payload);
            });
        });

        _channel.subscribe(async (status) => {
            console.log(`[Realtime] Channel status changed: ${status} (presenceKey: ${presenceKey}, role: ${state?.role})`);
            if (status === 'SUBSCRIBED') {
                window.realtimeChannel = _channel;
                console.log('[Realtime] Channel SUBSCRIBED successfully. postgres_changes count:', _channel.bindings?.postgres_changes?.length);

                if (presenceKey) {
                    await _channel.track({
                        id: presenceKey,
                        name: state.currentUser || state.role,
                        role: state.role,
                        online_at: new Date().toISOString()
                    });
                }
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.warn('[Realtime] Channel error or timeout:', status);
            } else if (status === 'CLOSED') {
                console.log('[Realtime] Channel closed.');
            }
        });
    };

    window.broadcastSystemEvent = async function (event, payload) {
        try {
            console.log(`[Realtime] Dispatching broadcast: ${event}`, payload);
            if (_channel && _channel.state === 'joined') {
                await _channel.send({
                    type: 'broadcast',
                    event: event,
                    payload: payload
                });
                return true;
            }

            const client = window.supabaseClient || window.supabase;
            if (client) {
                const ch = _channel || client.channel('bms-live');
                await ch.send({
                    type: 'broadcast',
                    event: event,
                    payload: payload
                });
                return true;
            }
        } catch (err) {
            console.warn('[Realtime] broadcastSystemEvent failed:', err);
            return false;
        }
    };

    window.destroyRealtimeSync = function () {
        if (_channel) {
            try {
                supabaseClient.removeChannel(_channel);
            } catch (e) {}
            _channel = null;
        }
        _lastPresenceKey = null;
    };

    window.addEventListener('beforeunload', () => {
        window.destroyRealtimeSync();
    });

    window.addEventListener('storage', (e) => {
        if (e.key === 'bms_inv_sync') {
            window._cachedCentralItems = null;
            window._cachedBranchInventory = null;
            if (window.state?.role === 'owner' && window.state?.activeView === 'central_inventory' && typeof window.renderOwnerInventoryModule === 'function') {
                window.renderOwnerInventoryModule();
            } else if (window.state?.role === 'branch' && window.state?.activeView === 'inventory' && typeof window.renderInventoryModule === 'function') {
                window.renderInventoryModule();
            }
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            window._cachedCentralItems = null;
            window._cachedBranchInventory = null;
            if (window.state?.role === 'owner' && window.state?.activeView === 'central_inventory' && typeof window.renderOwnerInventoryModule === 'function') {
                window.renderOwnerInventoryModule();
            } else if (window.state?.role === 'branch' && window.state?.activeView === 'inventory' && typeof window.renderInventoryModule === 'function') {
                window.renderInventoryModule();
            }
        }
    });

    // ─── Polling fallback for critical system settings ───────────────────────
    let _lastKnownMaintenance = null;
    let _lastKnownBannerCount = null;
    let _lastKnownDisabledModules = null;
    let _pollIntervalId = null;

    async function _pollSystemSettings() {
        if (!window.supabaseClient) return;
        if (!window.state?.role) return;
        if (window.state.role === 'sysadmin') return;

        try {
            const { data: settings } = await window.supabaseClient
                .from('sys_settings')
                .select('key, value')
                .in('key', ['maintenance_mode', 'disabled_modules', 'allow_registrations']);

            if (settings) {
                const maintenanceSetting = settings.find(s => s.key === 'maintenance_mode');
                const isMaintenance = maintenanceSetting?.value === 'true';

                if (_lastKnownMaintenance === null) {
                    _lastKnownMaintenance = isMaintenance;
                } else if (_lastKnownMaintenance !== isMaintenance) {
                    console.log('[Realtime-Fallback] Detected maintenance_mode change via poll:', isMaintenance);
                    _lastKnownMaintenance = isMaintenance;
                    if (isMaintenance) {
                        window.showMaintenanceScreen?.();
                    } else {
                        const maintenanceOverlay = document.getElementById('maintenance-screen') || document.getElementById('maintenanceModal');
                        if (maintenanceOverlay) {
                            window.hideMaintenanceScreen?.();
                            window.location.reload(true);
                        }
                    }
                }

                const modulesSetting = settings.find(s => s.key === 'disabled_modules');
                if (modulesSetting && modulesSetting.value !== _lastKnownDisabledModules) {
                    _lastKnownDisabledModules = modulesSetting.value;
                    try {
                        const list = JSON.parse(modulesSetting.value || '[]');
                        state.disabledModules = new Set(Array.isArray(list) ? list : []);
                        window.applyModuleRestrictions?.();
                    } catch (e) {}
                }
            }

            const { data: banners } = await window.supabaseClient
                .from('sys_banners')
                .select('id, active');

            const activeBanners = (banners || []).filter(b => b.active);
            const bannerCount = activeBanners.length;
            if (_lastKnownBannerCount === null) {
                _lastKnownBannerCount = bannerCount;
            } else if (_lastKnownBannerCount !== bannerCount) {
                console.log('[Realtime-Fallback] Detected banner count change via poll:', bannerCount);
                _lastKnownBannerCount = bannerCount;
                window.showActiveSystemBanners?.();
            }

        } catch (e) {
            // Silently ignore poll errors
        }
    }

    window.startSysSettingsPoll = function() {
        if (_pollIntervalId) return;
        _lastKnownMaintenance = null;
        _lastKnownBannerCount = null;
        _lastKnownDisabledModules = null;
        _pollIntervalId = setInterval(_pollSystemSettings, 5000);
        _pollSystemSettings();
        console.log('[Realtime-Fallback] Polling started (5s interval)');
    };

    window.stopSysSettingsPoll = function() {
        if (_pollIntervalId) {
            clearInterval(_pollIntervalId);
            _pollIntervalId = null;
            console.log('[Realtime-Fallback] Polling stopped');
        }
    };

})();
