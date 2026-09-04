import { state } from '../state.js';
import { supabase } from '../supabase.js';
import { dbTasks, dbBranches, dbActivities, dbRequests, dbStockMovements, dbMessages, dbCapital, dbAssets, dbAssetMaintenance } from '../db.js';
import { promptModal, showToast, fmt, openModal, closeModal, isCreatedToday } from '../utils.js';
import { getOwnerDashboardData, onDashboardUpdated } from '../data/repositories/dashboardRepository.js';

let _dashboardSubUnsubscribe = null;

export async function notifyBranchStock(branchId, itemName) {
    const msg = await promptModal('Restock Reminder', `Send a restock reminder for "${itemName}":`, 'e.g. Please check supplier and restock by tomorrow...');
    if (msg === null) return;

    try {
        await dbTasks.add(branchId, {
            title: `RESTOCK: ${itemName}`,
            description: `Admin Comment: ${msg}`,
            priority: 'high',
            deadline: new Date().toISOString().split('T')[0]
        });
        showToast('Reminder sent to branch as a high-priority task.');
    } catch (err) {
        showToast('Failed to send reminder: ' + err.message, 'error');
    }
}

export async function renderOwnerOverview() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return;
    const container = document.getElementById('mainContent');
    if (!container) return;

    const branches = state.branches || [];
    const activeBranchFilter = state._overviewBranchFilter || 'all';
    
    const branchOptions = [
        { value: 'all', label: window.t('all_branches', 'All Branches Consolidated') },
        ...branches.map(b => ({ value: b.id, label: b.name }))
    ];

    let shell = document.getElementById('overviewShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-6 slide-in" id="overviewShell">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div class="flex items-center gap-3">
                    <div class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">${window.t('business_overview', 'Business Overview')}</div>
                    <span class="bg-[#475B6E] text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-sm hidden md:inline-block">
                        ${window.t('plan_label', 'Plan')}: ${(state.profile?.plan || 'Free Trial').toUpperCase().replace('_', ' ')}
                    </span>
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400 flex items-center gap-1.5 whitespace-nowrap">
                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                        ${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                    </span>
                </div>

                <!-- Branch Filter -->
                <div class="flex items-center gap-2">
                    <label class="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">${window.t('location_label', 'Location')}:</label>
                    ${window.renderPremiumSelect({
                        id: 'overviewBranchSelect',
                        options: branchOptions,
                        selectedValue: activeBranchFilter,
                        onChange: 'window.state._overviewBranchFilter = this.value; window.renderOwnerOverview()'
                    })}
                </div>
            </div>

            <!-- KPI Summary Cards -->
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4" id="overviewKPIs">
                ${[1, 2, 3, 4, 5].map(() => `
                <div class="stat-card bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
                    <div class="h-3 bg-gray-100 dark:bg-gray-700 rounded mb-4 w-24"></div>
                    <div class="h-8 bg-gray-100 dark:bg-gray-700 rounded w-32"></div>
                </div>`).join('')}
            </div>

            <!-- Daily & Monthly Business Summary Widget -->
            <div id="overviewBusinessSummary" class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <h3 class="font-black text-gray-900 dark:text-white text-sm sm:text-base">${window.t('summary_title', "Today's & Monthly Business Summary")}</h3>
                    <span class="w-fit text-[9.5px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full">${window.t('automated_aggregation', 'Automated Financial Aggregation')}</span>
                </div>
                <div id="businessSummaryContent" class="animate-pulse py-8 text-center text-gray-400 text-xs">Computing aggregated branch figures...</div>
            </div>

            <div id="pendingApprovals" class="hidden"></div>

            <!-- Two-Column Section: Branch Performance & Activity Feed -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Branch Performance Progress (2 cols on desktop) -->
                <div class="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="font-black text-gray-900 dark:text-white text-sm sm:text-base">${window.t('branch_progress_title', 'Branch Target Progress & Revenue Today')}</h3>
                        <span class="text-xs text-gray-400 font-medium">${window.t('live_tracking', 'Live Tracking')}</span>
                    </div>
                    <div class="space-y-3" id="branchPerformance">
                        ${[1, 2, 3].map(() => `
                        <div class="p-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl animate-pulse">
                            <div class="h-2.5 bg-gray-100 dark:bg-gray-700 rounded mb-2 w-24"></div>
                            <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1"></div>
                        </div>`).join('')}
                    </div>
                </div>

                <!-- Live Activity Feed (1 col on desktop) -->
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
                    <div class="flex items-center justify-between">
                        <h3 class="font-black text-gray-900 dark:text-white text-sm sm:text-base">${window.t('recent_activities', 'Recent Activities')}</h3>
                        <span class="text-xs text-gray-400 font-medium">${window.t('today', 'Today')}</span>
                    </div>
                    <div class="space-y-2.5 max-h-[380px] overflow-y-auto pr-1" id="activityFeed">
                        <div class="animate-pulse space-y-2">
                            ${[1, 2, 3].map(() => `<div class="h-10 bg-gray-100 dark:bg-gray-700 rounded-xl"></div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Quick Action Shortcuts -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
                <h3 class="font-bold text-gray-900 dark:text-white mb-4 text-sm sm:text-base">${window.t('quick_actions', 'Quick Actions')}</h3>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                    <button onclick="openModal('addBranch')" data-tooltip="Create a new physical store or warehouse branch location" data-tooltip-title="Create Branch" data-tooltip-variant="indigo" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="relative flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="plus-circle" class="w-4 h-4 text-indigo-600 mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5">${window.t('quick_new_branch', 'Add Branch')}</span>
                    </button>
                    <button onclick="openModal('addStock')" data-tooltip="Register new stock inventory into the central catalog or warehouse" data-tooltip-title="Stock Inward" data-tooltip-variant="emerald" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="relative flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="package-plus" class="w-4 h-4 text-emerald-600 mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5">${window.t('quick_add_stock', 'Add Stock')}</span>
                    </button>
                    <button onclick="openModal('addStaff')" data-tooltip="Register a new employee, manager, or cashier with role permissions" data-tooltip-title="Onboard Staff" data-tooltip-variant="blue" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="relative flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="user-plus" class="w-4 h-4 text-blue-600 mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5">${window.t('quick_add_staff', 'Add Staff')}</span>
                    </button>
                    <button onclick="openModal('addSupplier')" data-tooltip="Record vendor contacts, payment terms, and supply categories" data-tooltip-title="New Supplier" data-tooltip-variant="amber" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="relative flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="truck" class="w-4 h-4 text-amber-600 mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5">${window.t('quick_new_supplier', 'New Supplier')}</span>
                    </button>
                    <button onclick="openModal('addAnnouncementModal')" data-tooltip="Broadcast a message or policy update to all branch staff dashboards" data-tooltip-title="Broadcast" data-tooltip-variant="purple" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="relative flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="megaphone" class="w-4 h-4 text-purple-600 mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5">${window.t('nav_announcements', 'Broadcast')}</span>
                    </button>
                    <button onclick="switchView('chat',null)" id="ownerDashMsgBtn" data-tooltip="Real-time encrypted messaging with branch managers and staff" data-tooltip-title="Internal Chat" data-tooltip-position="bottom" data-tooltip-variant="indigo" style="border-radius: 0.75rem !important;" class="relative flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/30 transition-all text-center group cursor-pointer">
                        <div class="relative inline-block mb-1 flex-shrink-0">
                            <i data-lucide="message-square" class="w-4 h-4 text-pink-500 mx-auto group-hover:scale-110 transition-transform"></i>
                            <span id="ownerDashMsgBadge" class="hidden absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">0</span>
                        </div>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5">${window.t('nav_messages', 'Messages')}</span>
                    </button>
                </div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    try {
        dbMessages.getUnreadCount(null, state.role).then(count => {
            const badge = document.getElementById('ownerDashMsgBadge');
            if (badge && count > 0) {
                badge.textContent = count > 9 ? '9+' : count;
                badge.classList.remove('hidden');
            }
        }).catch(() => { });
    } catch (e) {}

    const snapshotKey = `owner_${ownerId}_${activeBranchFilter}`;

    // Subscribe to live background updates
    if (_dashboardSubUnsubscribe) _dashboardSubUnsubscribe();
    _dashboardSubUnsubscribe = onDashboardUpdated((key, freshPayload) => {
        if (key === snapshotKey) {
            _populateOverviewDOM(freshPayload, false);
        }
    });

    try {
        // Cache-First Instant Read (< 20ms)
        const { data: snapshot, isCached, cachedAt } = await getOwnerDashboardData(ownerId, activeBranchFilter, state.branches);

        if (snapshot) {
            _populateOverviewDOM(snapshot, isCached, cachedAt);
        }
    } catch (err) {
        console.error('[Overview Hydration Error]:', err);
        const summaryContainer = document.getElementById('businessSummaryContent');
        if (summaryContainer) {
            summaryContainer.classList.remove('animate-pulse', 'py-8');
            summaryContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-4 text-center">
                <p class="text-xs text-gray-500 mb-2">Metrics summary couldn't load in time.</p>
                <button type="button" onclick="renderOwnerOverview()" class="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-lg transition-colors cursor-pointer">
                    Refresh Metrics
                </button>
            </div>`;
        }
        const perf = document.getElementById('branchPerformance');
        if (perf) perf.classList.remove('animate-pulse');
    }
}

async function _populateOverviewDOM(payload, isCached = false, cachedAt = null) {
    if (!payload || typeof payload !== 'object') return;
    const branches = Array.isArray(payload.branches) ? payload.branches : (state.branches || []);
    const rawSalesList = Array.isArray(payload.sales) ? payload.sales : (Array.isArray(payload.sales?.items) ? payload.sales.items : (Array.isArray(payload.sales?.data) ? payload.sales.data : []));
    const todaySalesList = rawSalesList.filter(s => isCreatedToday(s));
    const inventoryItems = Array.isArray(payload.inventory) ? payload.inventory : (Array.isArray(payload.inventory?.items) ? payload.inventory.items : (Array.isArray(payload.inventory?.data) ? payload.inventory.data : []));
    const recentActivities = Array.isArray(payload.activities) ? payload.activities : (Array.isArray(payload.activities?.items) ? payload.activities.items : []);
    const pendingRequests = Array.isArray(payload.requests) ? payload.requests : (Array.isArray(payload.requests?.items) ? payload.requests.items : []);

    state.activities = Array.isArray(recentActivities) ? recentActivities : [];

    const totalSalesToday = todaySalesList.reduce((s, r) => s + Number(r.amount || 0), 0);
    const totalCogsToday = todaySalesList.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
    const totalProfitToday = todaySalesList.reduce((s, r) => s + Number(r.gross_profit || (r.amount - r.cost_amount)), 0);

    const inventoryCostValue = inventoryItems.reduce((s, i) => s + (Number(i.cost_price || 0) * Number(i.quantity || 0)), 0);
    const inventoryExpectedRevenue = inventoryItems.reduce((s, i) => s + (Number(i.price || 0) * Number(i.quantity || 0)), 0);

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    let totalLiquidCapital = 0;
    let capitalAccountsCount = 0;
    try {
        const capAccounts = await dbCapital.fetchAccounts(ownerId).catch(() => []);
        totalLiquidCapital = capAccounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
        capitalAccountsCount = capAccounts.length;
    } catch (e) {}

    const kpiContainer = document.getElementById('overviewKPIs');
    if (kpiContainer) {
        const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';
        kpiContainer.innerHTML = `
        <div onclick="switchView('sales')" data-tooltip="Total gross revenue generated across all branches today. Click to inspect live sales." data-tooltip-title="Today's Revenue" data-tooltip-position="top" class="relative px-4 py-3 rounded-2xl text-white shadow-sm stat-card min-w-0 cursor-pointer hover:-translate-y-1 transition-transform flex flex-col justify-between h-full" style="background-color: #475B6E !important; border-color: #475B6E !important;">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-amber-300 border border-slate-700 shadow-xs z-10">${currencySymbol}</div>
            <p class="text-xs text-indigo-100 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('kpi_sales_today', 'Sales Today')}</p>
            <p class="text-xl sm:text-2xl font-black truncate my-1 leading-tight">${fmt.number(totalSalesToday)}</p>
            <p class="text-[10px] text-indigo-200">${todaySalesList.length} ${window.t('txns_recorded', 'transactions recorded')}</p>
        </div>
        <div onclick="switchView('sales')" data-tooltip="Gross profit after subtracting cost of goods sold (COGS) from today's revenue." data-tooltip-title="Net Profitability" data-tooltip-position="top" data-tooltip-variant="emerald" class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 cursor-pointer hover:-translate-y-1 transition-transform flex flex-col justify-between h-full">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('kpi_profit_today', 'Gross Profit Today')}</p>
            <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate my-1 leading-tight">${fmt.number(totalProfitToday)}</p>
            <p class="text-[10px] text-amber-600 dark:text-amber-400 font-bold">${window.t('cogs', 'COGS')}: ${fmt.currency(totalCogsToday)}</p>
        </div>
        <div onclick="switchView('capital')" data-tooltip="Total liquid business capital available across all bank accounts, mobile money tills, and cash drawers. Click to open Balance Sheet." data-tooltip-title="Total Business Capital" data-tooltip-position="top" data-tooltip-variant="indigo" class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 cursor-pointer hover:-translate-y-1 transition-transform flex flex-col justify-between h-full">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_available_capital', 'Total Available Capital')}</p>
            <p class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate my-1 leading-tight">${fmt.number(totalLiquidCapital)}</p>
            <p class="text-[10px] text-gray-400 truncate">${capitalAccountsCount} ${window.t('capital_accounts_count', 'capital accounts & tills')}</p>
        </div>
        <div onclick="switchView('central_inventory')" data-tooltip="Total acquisition cost of all merchandise currently held in branch inventories." data-tooltip-title="Inventory Valuation" data-tooltip-position="top" data-tooltip-variant="amber" class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 cursor-pointer hover:-translate-y-1 transition-transform flex flex-col justify-between h-full">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('kpi_inventory_cost', 'Branch Inventory Cost')}</p>
            <p class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate my-1 leading-tight">${fmt.number(inventoryCostValue)}</p>
            <p class="text-[10px] text-gray-400 truncate">${inventoryItems.length} ${window.t('branch_stock_items', 'branch stock items')}</p>
        </div>
        <div onclick="switchView('stock_movements')" data-tooltip="Expected retail revenue upon selling all current branch stock at regular prices." data-tooltip-title="Potential Revenue" data-tooltip-position="top" data-tooltip-variant="indigo" class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 cursor-pointer hover:-translate-y-1 transition-transform flex flex-col justify-between h-full">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${currencySymbol}</div>
            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('kpi_expected_sales', 'Branch Expected Sales')}</p>
            <p class="text-xl sm:text-2xl font-black text-purple-600 dark:text-purple-400 truncate my-1 leading-tight">${fmt.number(inventoryExpectedRevenue)}</p>
            <p class="text-[10px] text-indigo-500 font-bold">${window.t('potential_profit', 'Potential Profit')}: ${fmt.currency(inventoryExpectedRevenue - inventoryCostValue)}</p>
        </div>`;
    }

    const summaryContainer = document.getElementById('businessSummaryContent');
    if (summaryContainer) {
        const branchBreakdown = (branches || []).map(b => {
            const bSales = todaySalesList.filter(s => s.branch_id === b.id);
            const bRevenue = bSales.reduce((s, r) => s + Number(r.amount || 0), 0);
            const bCogs = bSales.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
            const bProfit = bSales.reduce((s, r) => s + Number(r.gross_profit || (r.amount - r.cost_amount)), 0);
            return { branch: b, revenue: bRevenue, cogs: bCogs, profit: bProfit, count: bSales.length };
        });

        window.currentBranchBreakdown = branchBreakdown;

        summaryContainer.classList.remove('animate-pulse', 'py-8');
        summaryContainer.innerHTML = `
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div class="p-2 sm:p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                <p class="text-[8px] sm:text-[10px] text-gray-500 uppercase font-bold tracking-tight leading-tight">${window.t('kpi_sales_today', 'Today Total Sales')}</p>
                <p class="text-xs sm:text-base font-black text-gray-900 dark:text-white mt-0.5 truncate">${fmt.currency(totalSalesToday)}</p>
            </div>
            <div class="p-2 sm:p-3 bg-amber-50/70 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-900/50 shadow-xs">
                <p class="text-[8px] sm:text-[10px] text-amber-700 dark:text-amber-400 uppercase font-bold tracking-tight leading-tight">${window.t('cogs', 'Cost of Goods Sold (COGS)')}</p>
                <p class="text-xs sm:text-base font-black text-amber-700 dark:text-amber-400 mt-0.5 truncate">${fmt.currency(totalCogsToday)}</p>
            </div>
            <div class="p-2 sm:p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-900/50 shadow-xs">
                <p class="text-[8px] sm:text-[10px] text-emerald-700 dark:text-emerald-400 uppercase font-bold tracking-tight leading-tight">${window.t('kpi_profit_today', 'Today Gross Profit')}</p>
                <p class="text-xs sm:text-base font-black text-emerald-700 dark:text-emerald-400 mt-0.5 truncate">${fmt.currency(totalProfitToday)}</p>
            </div>
            <div class="p-2 sm:p-3 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-900/50 shadow-xs">
                <p class="text-[8px] sm:text-[10px] text-indigo-700 dark:text-indigo-400 uppercase font-bold tracking-tight leading-tight">${window.t('txns_active_shops', 'Transactions & Active Shops')}</p>
                <p class="text-xs sm:text-base font-black text-indigo-700 dark:text-indigo-400 mt-0.5 truncate">${todaySalesList.length} ${window.t('txns', 'txns')} / ${(branches || []).length} ${window.t('branches_count', 'branches')}</p>
            </div>
        </div>

        <!-- Mobile Summary Button -->
        <div class="sm:hidden mt-3.5">
            <button onclick="switchView('daily_summary')" class="w-full flex items-center justify-center gap-1.5 py-2.5 px-4 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-full text-xs border border-indigo-100/50 dark:border-indigo-950/50 shadow-xs transition-all cursor-pointer">
                <i data-lucide="bar-chart-2" class="w-4 h-4"></i> ${window.t('click_see_daily_summary', 'Click to See Daily Summary')}
            </button>
        </div>

        <!-- Desktop Summary Table -->
        <div class="overflow-x-auto pt-2 hidden sm:block">
            <table class="w-full text-xs">
                <thead class="bg-gray-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-800">
                    <tr>
                        <th class="text-left px-4 py-2.5 font-bold text-gray-500 uppercase">${window.t('branch_name', 'Branch Name')}</th>
                        <th class="text-right px-4 py-2.5 font-bold text-gray-500 uppercase">${window.t('today_revenue', 'Today Revenue')}</th>
                        <th class="text-right px-4 py-2.5 font-bold text-gray-500 uppercase">${window.t('cogs', 'COGS')}</th>
                        <th class="text-right px-4 py-2.5 font-bold text-gray-500 uppercase">${window.t('kpi_profit_today', 'Gross Profit')}</th>
                        <th class="text-right px-4 py-2.5 font-bold text-gray-500 uppercase">${window.t('sales_count', 'Sales Count')}</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-gray-50 dark:divide-gray-800">
                    ${branchBreakdown.map(b => `
                    <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-900/30">
                        <td class="px-4 py-2.5 font-bold text-gray-900 dark:text-white">${b.branch.name}</td>
                        <td class="px-4 py-2.5 text-right font-black text-gray-900 dark:text-white">${fmt.currency(b.revenue)}</td>
                        <td class="px-4 py-2.5 text-right font-bold text-amber-600 dark:text-amber-400">${fmt.currency(b.cogs)}</td>
                        <td class="px-4 py-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">${fmt.currency(b.profit)}</td>
                        <td class="px-4 py-2.5 text-right font-bold text-gray-700 dark:text-gray-300">${b.count}</td>
                    </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;
    }

    const perfContainer = document.getElementById('branchPerformance');
    if (perfContainer) {
        perfContainer.classList.remove('animate-pulse');
        const withSales = (branches || []).map(b => {
            const bSales = todaySalesList.filter(s => s.branch_id === b.id);
            const bRevenue = bSales.reduce((s, r) => s + Number(r.amount || 0), 0);
            return { ...b, todaySales: bRevenue };
        });

        if (withSales.length === 0) {
            perfContainer.innerHTML = `<p class="text-xs text-gray-400 text-center py-4 font-medium">No branch performance targets set.</p>`;
        } else {
            perfContainer.innerHTML = withSales.map(branch => {
                const target = Number(branch.target || 0);
                const pct = target > 0 ? Math.min(Math.round((branch.todaySales / target) * 100), 100) : 0;
                let color = 'bg-indigo-600';
                let textColor = 'text-indigo-600 dark:text-indigo-400';
                if (pct >= 80) { color = 'bg-emerald-500'; textColor = 'text-emerald-600 dark:text-emerald-400'; }
                else if (pct >= 40) { color = 'bg-amber-500'; textColor = 'text-amber-600 dark:text-amber-400'; }
                else if (pct > 0) { color = 'bg-rose-500'; textColor = 'text-rose-600 dark:text-rose-400'; }

                return `
                <div class="p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                    <div class="flex justify-between items-center mb-1.5">
                        <div class="min-w-0 pr-2">
                            <p class="font-extrabold text-xs text-gray-900 dark:text-white uppercase tracking-tight truncate">${branch.name}</p>
                            <p class="text-[10px] text-gray-500 dark:text-gray-400 font-medium">${fmt.currency(branch.todaySales)} / ${fmt.currency(branch.target)}</p>
                        </div>
                        <span class="text-xs font-black ${textColor} shrink-0">${pct}%</span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                        <div class="${color} h-1 rounded-full progress-bar" style="width:${Math.min(pct, 100)}%"></div>
                    </div>
                </div>`;
            }).join('');
        }
    }

    const feedContainer = document.getElementById('activityFeed');
    if (feedContainer) feedContainer.innerHTML = renderActivities();

    const currentQueue = document.getElementById('pendingApprovals');
    const reqList = Array.isArray(pendingRequests) ? pendingRequests : [];
    const pendingQueue = reqList.filter(r => r.status === 'pending');
    if (currentQueue) {
        if (pendingQueue.length === 0) {
            currentQueue.innerHTML = '';
            currentQueue.classList.add('hidden');
        } else {
            currentQueue.classList.remove('hidden');
            currentQueue.innerHTML = `
            <div class="bg-indigo-600 rounded-xl shadow-md border border-indigo-500 overflow-hidden mb-4">
                <div class="px-3 py-2 flex items-center justify-between border-b border-indigo-500/50 bg-indigo-700/40">
                    <div class="flex items-center gap-2 text-white text-xs">
                        <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                        <span class="font-bold tracking-tight">Approval Queue</span>
                    </div>
                    <span class="text-[9px] font-black uppercase text-indigo-100/80">${pendingQueue.length} Pending</span>
                </div>
                <div class="p-1">
                    ${pendingQueue.slice(0, 1).map(req => `
                        <div onclick="switchView('requests', '${req.id}')" class="flex items-center gap-2.5 p-2 hover:bg-white/5 rounded-lg cursor-pointer transition-all group">
                            <div class="w-7 h-7 bg-white/10 text-white rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform flex-shrink-0">
                                <i data-lucide="${req.type?.includes('inventory') ? 'package' : 'message-square'}" class="w-3.5 h-3.5"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="text-[11px] font-bold text-white truncate">${req.subject}</p>
                                <p class="text-[9px] text-indigo-200/70 truncate">${req.branches?.name || 'Unknown'}</p>
                            </div>
                            <i data-lucide="chevron-right" class="w-3 h-3 text-white/20"></i>
                        </div>
                    `).join('')}
                </div>
                <button onclick="switchView('requests')" class="w-full py-1.5 text-[9px] font-black uppercase text-indigo-200/80 hover:bg-indigo-700/50 transition-colors tracking-widest border-t border-indigo-500/20">
                    Manage All →
                </button>
            </div>`;
        }
    }

    if (window.lucide) lucide.createIcons();
}

export async function renderDailySummaryView(passedBreakdown = null) {
    const container = document.getElementById('mainContent');
    if (!container) return;

    let breakdown = passedBreakdown || window.currentBranchBreakdown;

    // Self-recovering data fetch if navigated directly without prior overview render
    if (!breakdown || breakdown.length === 0) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center min-h-[50vh] w-full opacity-75">
                <div class="premium-spinner mb-4"></div>
                <p class="text-sm font-medium text-gray-500 dark:text-gray-400 animate-pulse">${typeof window.t === 'function' ? window.t('loading', 'Loading daily performance metrics...') : 'Loading daily performance metrics...'}</p>
            </div>`;
        try {
            const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
            const branches = state.branches && state.branches.length > 0 ? state.branches : await dbBranches.fetchAll(ownerId);
            state.branches = branches || [];
            
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0).toISOString();
            const { data: salesData } = await supabase
                .from('sales')
                .select('id, branch_id, amount, cost_amount, gross_profit, created_at')
                .gte('created_at', startOfDay);

            const todaySalesList = (salesData || []).filter(s => isCreatedToday(s));
            breakdown = (branches || []).map(b => {
                const bSales = todaySalesList.filter(s => s.branch_id === b.id);
                const bRevenue = bSales.reduce((s, r) => s + Number(r.amount || 0), 0);
                const bCogs = bSales.reduce((s, r) => s + Number(r.cost_amount || 0), 0);
                const bProfit = bSales.reduce((s, r) => s + Number(r.gross_profit || (r.amount - r.cost_amount)), 0);
                return { branch: b, revenue: bRevenue, cogs: bCogs, profit: bProfit, count: bSales.length };
            });
            window.currentBranchBreakdown = breakdown;
        } catch (err) {
            console.error('[DailySummaryView] Error loading fresh metrics:', err);
            breakdown = window.currentBranchBreakdown || [];
        }
    }

    const totalRev = (breakdown || []).reduce((s, b) => s + (b.revenue || 0), 0);
    const totalCogs = (breakdown || []).reduce((s, b) => s + (b.cogs || 0), 0);
    const totalProfit = (breakdown || []).reduce((s, b) => s + (b.profit || 0), 0);
    const totalCount = (breakdown || []).reduce((s, b) => s + (b.count || 0), 0);
    const overallMargin = totalRev > 0 ? Math.round((totalProfit / totalRev) * 100) : 0;
    const totalProfitClass = totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
    const activeBranchesCount = (breakdown || []).filter(b => (b.revenue || 0) > 0).length;
    const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const currencyStr = (state.profile && state.profile.currency) || 'TZS';

    const tableRowsHtml = (breakdown || []).map(b => {
        const margin = b.revenue > 0 ? Math.round((b.profit / b.revenue) * 100) : 0;
        const profitClass = b.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        const branchName = b.branch ? (b.branch.name || b.branch) : 'Branch';
        return `
        <tr class="hover:bg-slate-50/70 dark:hover:bg-gray-800/50 transition-colors">
            <td class="px-4 py-3 font-bold text-gray-900 dark:text-white">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full ${b.revenue > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'}"></span>
                    <span class="truncate">${branchName}</span>
                </div>
            </td>
            <td class="px-4 py-3 text-right font-black text-slate-900 dark:text-white">${fmt.currency(b.revenue)}</td>
            <td class="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">${fmt.currency(b.cogs)}</td>
            <td class="px-4 py-3 text-right font-black ${profitClass}">${fmt.currency(b.profit)}</td>
            <td class="px-4 py-3 text-right font-bold text-slate-500 dark:text-gray-400">${margin}%</td>
            <td class="px-4 py-3 text-right font-bold text-slate-600 dark:text-gray-300">${b.count}</td>
        </tr>`;
    }).join('');

    const cardsHtml = (breakdown || []).map(b => {
        const margin = b.revenue > 0 ? Math.round((b.profit / b.revenue) * 100) : 0;
        const profitClass = b.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
        const progressPct = Math.min(100, Math.max(0, margin));
        const branchName = b.branch ? (b.branch.name || b.branch) : 'Branch';
        return `
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-slate-200/80 dark:border-gray-700/80 shadow-xs space-y-3.5">
            <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5 min-w-0">
                    <span class="w-2.5 h-2.5 rounded-full ${b.revenue > 0 ? 'bg-emerald-500 ring-4 ring-emerald-500/20' : 'bg-slate-300 dark:bg-gray-600'}"></span>
                    <h4 class="font-extrabold text-sm sm:text-base text-gray-900 dark:text-white truncate">${branchName}</h4>
                </div>
                <span class="px-2.5 py-1 rounded-full text-[10px] font-black bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-gray-600/60">${b.count} ${window.t('txns', 'txns')}</span>
            </div>
            <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-gray-700/60 text-center">
                <div>
                    <p class="text-[9px] font-bold uppercase tracking-wider text-slate-400">${window.t('revenue', 'Revenue')}</p>
                    <p class="text-xs sm:text-sm font-black text-slate-900 dark:text-white truncate mt-0.5">${fmt.currency(b.revenue)}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">${window.t('cogs', 'COGS')}</p>
                    <p class="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate mt-0.5">${fmt.currency(b.cogs)}</p>
                </div>
                <div>
                    <p class="text-[9px] font-bold uppercase tracking-wider ${profitClass}">${window.t('profit', 'Profit')} (${margin}%)</p>
                    <p class="text-xs sm:text-sm font-black ${profitClass} truncate mt-0.5">${fmt.currency(b.profit)}</p>
                </div>
            </div>
            <div class="w-full bg-slate-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div class="h-1.5 rounded-full ${b.profit >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}" style="width: ${progressPct}%"></div>
            </div>
        </div>`;
    }).join('');

    container.classList.add('overflow-hidden', '!p-0');
    container.classList.remove('overflow-y-auto');

    container.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
        <!-- Fixed Top Navigation Header -->
        <div class="modal-top-nav flex-none flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
            <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button type="button" onclick="switchView('overview')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back_to_overview', 'Back to Overview')}</span>
                </button>
                <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">${window.t('daily_branch_summary', 'Daily Branch Summary')}</h3>
                    <p class="text-[10px] sm:text-xs text-slate-400 font-medium truncate">${todayLabel} · ${window.t('performance_breakdown', 'Performance Breakdown')}</p>
                </div>
            </div>
            <div class="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <span class="px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-gray-600">
                    ${(breakdown || []).length} ${window.t('branches_count', 'Branches')}
                </span>
                <span class="hidden sm:inline-flex px-2.5 sm:px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                    ${totalCount} ${window.t('txns', 'Transactions')}
                </span>
            </div>
        </div>

        <!-- Scrollable Middle Body -->
        <div class="modal-main-content flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-6 space-y-4 sm:space-y-6 scroller-custom max-w-7xl mx-auto w-full">
            <!-- 4 KPI Summary Strip -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-2">
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400">${window.t('total_revenue', 'Total Revenue')}</p>
                    <p class="text-sm sm:text-2xl font-black text-slate-900 dark:text-white truncate mt-1">${fmt.number(totalRev)}</p>
                    <p class="text-[10px] text-slate-400 font-medium mt-0.5">${totalCount} ${window.t('txns_recorded', 'transactions recorded')}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">${window.t('cogs', 'Cost of Goods Sold (COGS)')}</p>
                    <p class="text-sm sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate mt-1">${fmt.number(totalCogs)}</p>
                    <p class="text-[10px] text-amber-500/80 font-medium mt-0.5">${window.t('merchandise_cost', 'Merchandise Cost Basis')}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${totalProfitClass}">${window.t('kpi_profit_today', 'Gross Profit')} (${overallMargin}%)</p>
                    <p class="text-sm sm:text-2xl font-black ${totalProfitClass} truncate mt-1">${fmt.number(totalProfit)}</p>
                    <p class="text-[10px] ${totalProfitClass} font-medium mt-0.5">${overallMargin}% ${window.t('gross_margin', 'Gross Margin')}</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs">
                    <p class="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">${window.t('active_branches', 'Active Branches')}</p>
                    <p class="text-sm sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate mt-1">${activeBranchesCount} / ${(breakdown || []).length}</p>
                    <p class="text-[10px] text-indigo-500/80 font-medium mt-0.5">${window.t('locations_reporting', 'Locations Reporting Sales')}</p>
                </div>
            </div>

            <!-- Desktop Matrix Table (Hidden on Mobile) -->
            <div class="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 shadow-xs overflow-hidden">
                <div class="px-5 py-3.5 border-b border-slate-100 dark:border-gray-700/80 flex items-center justify-between">
                    <h4 class="font-extrabold text-xs text-slate-800 dark:text-white uppercase tracking-wider">${window.t('branch_financial_matrix', 'Branch Financial Matrix')}</h4>
                    <span class="text-[10px] font-bold text-slate-400">${window.t('currency_label', 'All amounts in')} ${currencyStr}</span>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs">
                        <thead class="bg-slate-50/80 dark:bg-gray-900/60 border-b border-slate-200/80 dark:border-gray-700/80">
                            <tr>
                                <th class="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('branch', 'Branch')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('today_revenue', 'Today Revenue')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('cogs', 'COGS')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('gross_profit', 'Gross Profit')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('margin', 'Margin')}</th>
                                <th class="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">${window.t('sales', 'Sales')}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 dark:divide-gray-700/60">
                            ${tableRowsHtml}
                        </tbody>
                        <tfoot class="bg-slate-100/60 dark:bg-gray-900/80 font-black border-t-2 border-slate-200 dark:border-gray-700">
                            <tr>
                                <td class="px-4 py-3.5 text-slate-900 dark:text-white uppercase tracking-wider">${window.t('consolidated_total', 'Consolidated Total')}</td>
                                <td class="px-4 py-3.5 text-right text-slate-900 dark:text-white">${fmt.currency(totalRev)}</td>
                                <td class="px-4 py-3.5 text-right text-amber-600 dark:text-amber-400">${fmt.currency(totalCogs)}</td>
                                <td class="px-4 py-3.5 text-right ${totalProfitClass}">${fmt.currency(totalProfit)}</td>
                                <td class="px-4 py-3.5 text-right text-slate-600 dark:text-gray-300">${overallMargin}%</td>
                                <td class="px-4 py-3.5 text-right text-slate-900 dark:text-white">${totalCount}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            <!-- Mobile Branch Cards (Visible only on Mobile) -->
            <div class="sm:hidden space-y-3">
                ${cardsHtml}
            </div>
        </div>

        <!-- Fixed Bottom Action Nav / Footer -->
        <div class="modal-bottom-nav flex-none flex items-center justify-center gap-3 px-4 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-20">
            <button type="button" onclick="switchView('overview')" class="w-full sm:w-auto px-8 py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-gray-700 dark:hover:bg-gray-600 text-white font-extrabold text-xs sm:text-sm rounded-full shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer">
                <i data-lucide="arrow-left" class="w-4 h-4"></i>
                <span>${window.t('back_to_overview', 'Back to Overview')}</span>
            </button>
        </div>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

window.showDailySummaryModal = function() {
    if (typeof window.switchView === 'function') {
        window.switchView('daily_summary');
    } else {
        renderDailySummaryView();
    }
};

window.renderDailySummaryView = renderDailySummaryView;

window.renderActivities = function () {
    const todayStr = new Date().toDateString();
    const todayActivities = (state.activities || []).filter(a => {
        if (!a.created_at) return true;
        return new Date(a.created_at).toDateString() === todayStr;
    });

    if (todayActivities.length === 0) {
        return `<p class="text-gray-400 text-center py-8 text-xs font-medium">${window.t('no_activities_today', 'No activities recorded today')}</p>`;
    }
    const typeMap = {
        sale: { bg: 'bg-emerald-100 dark:bg-emerald-950/40', icon: 'shopping-cart', ic: 'text-emerald-600 dark:text-emerald-400', amt: 'text-emerald-600 dark:text-emerald-400', sign: '+' },
        expense: { bg: 'bg-red-100 dark:bg-red-950/40', icon: 'credit-card', ic: 'text-red-600 dark:text-red-400', amt: 'text-red-600 dark:text-red-400', sign: '-' },
        task_completed: { bg: 'bg-blue-100 dark:bg-blue-950/40', icon: 'check-circle', ic: 'text-blue-600 dark:text-blue-400', amt: null, sign: '' },
        task_assigned: { bg: 'bg-amber-100 dark:bg-amber-950/40', icon: 'clipboard-list', ic: 'text-amber-600 dark:text-amber-400', amt: null, sign: '' }
    };
    const todayLabel = window.t('today', 'Today');
    return todayActivities.slice(0, 20).map(a => {
        const t = typeMap[a.type] || typeMap.task_completed;
        return `
        <div class="flex items-center gap-2.5 p-2 sm:p-2.5 bg-gray-50 dark:bg-gray-800/50 rounded-xl transition-all">
            <div class="w-6.5 h-6.5 sm:w-7 sm:h-7 rounded-full ${t.bg} flex items-center justify-center shrink-0">
                <i data-lucide="${t.icon}" class="w-3.5 h-3.5 ${t.ic}"></i>
            </div>
            <div class="flex-1 min-w-0">
                <p class="text-xs font-semibold text-gray-900 dark:text-white leading-snug truncate">${a.message}</p>
                <p class="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 font-medium truncate">${a.branch} · <span class="text-indigo-600 dark:text-indigo-400 font-bold">${todayLabel}</span> ${a.time}</p>
            </div>
            ${a.amount ? `<span class="text-xs font-extrabold ${t.amt} shrink-0">${t.sign}${fmt.currency(a.amount)}</span>` : ''}
        </div>`;
    }).join('');
};

window.renderOwnerOverview = renderOwnerOverview;
window.notifyBranchStock = notifyBranchStock;
