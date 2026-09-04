import { state } from '../state.js';
import { dbMessages } from '../db.js';
import { fmt, renderPremiumLoader, priorityBadge, isCreatedToday } from '../utils.js';
import { getBranchDashboardData, onDashboardUpdated } from '../data/repositories/dashboardRepository.js';

let _branchDashSubUnsubscribe = null;

export function dismissDashboardNotice(id) {
    const el = document.getElementById(`dash-notif-${id}`);
    if (el) {
        el.classList.add('opacity-0', 'scale-95');
        setTimeout(() => el.remove(), 300);
    }
}

window.handleQuickOpenTillClick = async function () {
    if (typeof window.triggerOpenTillAction !== 'function' && typeof window.openQuickTillModal !== 'function') {
        if (typeof window.ensureBmsViewModule === 'function') {
            await window.ensureBmsViewModule('branch', 'cash_drawer');
        }
    }
    if (typeof window.triggerOpenTillAction === 'function') {
        window.triggerOpenTillAction();
    } else if (typeof window.openQuickTillModal === 'function') {
        window.openQuickTillModal();
    }
};

window.handleQuickNewSaleClick = async function () {
    if (typeof window.openAddSaleModal !== 'function') {
        if (typeof window.ensureBmsViewModule === 'function') {
            await window.ensureBmsViewModule('branch', 'sales');
        }
    }
    if (typeof window.openAddSaleModal === 'function') {
        window.openAddSaleModal();
    }
};

export async function renderBranchDashboard() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    const branchId = state.branchId || (state.branchProfile && state.branchProfile.id) || localStorage.getItem('bms_last_branch_id') || 'branch';
    const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === branchId)) || { name: 'My Branch', manager: '', target: 0 };
    const branchDisplayName = branch.name || state.branchProfile?.name || state.branchName || 'Branch';

    let shell = document.getElementById('branchDashboardShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-2.5 sm:space-y-3 slide-in" id="branchDashboardShell">
            <!-- Bento Top Greeting & Control Strip -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-2.5 sm:p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div class="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                        <i data-lucide="store" class="w-4 h-4 sm:w-5 sm:h-5"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 id="branchDashboardWelcomeHeading" class="text-sm sm:text-base font-black text-gray-900 dark:text-white tracking-tight truncate">${window.t('welcome_back', 'Welcome back')}, ${branchDisplayName}</h2>
                        <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0"></i>
                            <span class="truncate">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <button onclick="window.handleQuickNewSaleClick()" data-tooltip="Open POS checkout to record a new sale" data-tooltip-title="New Sale" data-tooltip-variant="emerald" class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs whitespace-nowrap">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                        <span>${window.t('new_sale', 'New Sale')}</span>
                    </button>
                    <button onclick="switchView('chat',null)" id="dashMsgBtn" data-tooltip="Internal team chat" data-tooltip-title="Messages" data-tooltip-variant="indigo" class="relative p-1.5 sm:p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-gray-600 dark:text-gray-300 cursor-pointer hidden sm:block">
                        <i data-lucide="message-square" class="w-4 h-4 text-indigo-500"></i>
                        <span id="dashMsgBadge" class="chat-unread-badge hidden absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full">0</span>
                    </button>
                </div>
            </div>

            <!-- Bento Top KPI Summary Row -->
            <div id="dashKPIs" class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-2.5">
                ${renderPremiumLoader(window.t('loading_kpi_data', 'Loading KPI data…'))}
            </div>

            <div id="dashApprovals"></div>

            <!-- Bento Main Content: 3-Column Asymmetric Grid -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-2.5 sm:gap-3">
                
                <!-- Left Bento Column (lg: 4 cols): Quick Launchpad & Till Float -->
                <div class="lg:col-span-4 space-y-2.5 sm:space-y-3">
                    <!-- Quick Actions Bento Card -->
                    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5">
                        <div class="flex items-center justify-between mb-2.5">
                            <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('quick_actions', 'Quick Actions')}</h3>
                            <span class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-md">${window.t('pos_tools', 'POS Tools')}</span>
                        </div>
                        <div class="grid grid-cols-3 gap-2">
                            <button onclick="window.handleQuickOpenTillClick()" data-tooltip="Open till drawer & cash float" data-tooltip-title="Open Till" data-tooltip-variant="emerald" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="banknote" class="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('reopen_drawer', 'Open Till')}</span>
                            </button>
                            <button onclick="window.handleQuickNewSaleClick()" data-tooltip="Record new sale" data-tooltip-title="Add Sale" data-tooltip-variant="emerald" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="shopping-cart" class="w-3.5 h-3.5 text-emerald-500"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('new_sale', 'Add Sale')}</span>
                            </button>
                            <button onclick="openModal('addExpense')" data-tooltip="Log operational expense" data-tooltip-title="Add Expense" data-tooltip-variant="rose" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="minus-circle" class="w-3.5 h-3.5 text-red-500"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('add_expense', 'Expense')}</span>
                            </button>
                            <button onclick="openModal('addCustomer')" data-tooltip="Register new customer" data-tooltip-title="New Customer" data-tooltip-variant="indigo" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="user-plus" class="w-3.5 h-3.5 text-blue-500"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('add_customer', 'Customer')}</span>
                            </button>
                            <button onclick="openModal('addNote')" data-tooltip="Add handover memo" data-tooltip-title="New Note" data-tooltip-variant="amber" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="edit-3" class="w-3.5 h-3.5 text-amber-500"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('add_note', 'Memo')}</span>
                            </button>
                            <button onclick="switchView('inventory')" data-tooltip="Inspect branch stock" data-tooltip-title="Inventory" data-tooltip-variant="indigo" class="flex flex-col items-center justify-center p-2 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 transition-all text-center group cursor-pointer">
                                <div class="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                                    <i data-lucide="package" class="w-3.5 h-3.5 text-indigo-500"></i>
                                </div>
                                <span class="text-[10px] font-bold text-gray-700 dark:text-gray-300 leading-tight uppercase truncate w-full">${window.t('inventory', 'Inventory')}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Cash Till Status Bento Card -->
                    <div id="dashTillWidget"></div>
                </div>

                <!-- Center Bento Column (lg: 5 cols): Daily Target & Live Sales Stream -->
                <div class="lg:col-span-5 space-y-2.5 sm:space-y-3">
                    <!-- Daily Target Radial Card -->
                    <div id="dashTargetProgress"></div>

                    <!-- Live Today's Transactions Feed -->
                    <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3 sm:p-3.5">
                        <div class="flex items-center justify-between mb-2.5">
                            <div>
                                <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('recent_transactions', 'Recent Transactions')}</h3>
                                <p class="text-[10px] sm:text-[11px] text-gray-400 font-medium">${window.t('realtime_transactions', 'Real-time order checkout stream')}</p>
                            </div>
                            <button onclick="switchView('sales')" class="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                                <span>${window.t('view_all', 'View All')}</span>
                                <i data-lucide="arrow-right" class="w-3 h-3"></i>
                            </button>
                        </div>
                        <div id="dashLiveSalesList" class="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            <div class="py-6 text-center text-xs text-gray-400 font-medium animate-pulse">${window.t('loading_sales', 'Loading live transactions...')}</div>
                        </div>
                    </div>
                </div>

                <!-- Right Bento Column (lg: 3 cols): Top Sellers & Alerts -->
                <div class="lg:col-span-3 space-y-2.5 sm:space-y-3">
                    <!-- Top Sellers Card -->
                    <div id="dashTopSellersCard"></div>

                    <!-- Tasks & Alerts Card -->
                    <div id="dashTasksSection"></div>
                    <div id="dashInventoryAlerts"></div>
                </div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    dbMessages.getUnreadCount(state.branchId, state.role).then(count => {
        const badge = document.getElementById('dashMsgBadge');
        if (badge && count > 0) {
            badge.textContent = count > 9 ? '9+' : count;
            badge.classList.remove('hidden');
        }
    }).catch(() => { });

    const snapshotKey = `branch_${state.branchId}`;

    // Subscribe to live background updates
    if (_branchDashSubUnsubscribe) _branchDashSubUnsubscribe();
    _branchDashSubUnsubscribe = onDashboardUpdated((key, freshPayload) => {
        if (key === snapshotKey) {
            _populateBranchDashboardDOM(branch, freshPayload);
        }
    });

    try {
        // Cache-First Instant Read (< 20ms)
        const { data: snapshot } = await getBranchDashboardData(state.branchId);
        _populateBranchDashboardDOM(branch, snapshot || {});
    } catch (err) {
        console.error('[Branch Dashboard Hydration Error]:', err);
        _populateBranchDashboardDOM(branch, {});
    }

    if (typeof window.checkAndShowQuickOpenTillModal === 'function') {
        window.checkAndShowQuickOpenTillModal();
    }
}

function _populateBranchDashboardDOM(branch, payload) {
    const currentBranch = payload.branch || state.branchProfile || branch || {};
    const branchHeadingEl = document.getElementById('branchDashboardWelcomeHeading');
    if (branchHeadingEl) {
        const branchTitle = currentBranch.name || state.branchProfile?.name || state.branchName || 'Branch';
        branchHeadingEl.textContent = `${window.t('welcome_back', 'Welcome back')}, ${branchTitle}`;
    }
    const rawSales = payload.sales || [];
    const rawExpenses = payload.expenses || [];
    const tasks = payload.tasks || [];
    const items = payload.inventory || [];
    const requests = payload.requests || [];

    // Overall branch metrics for overview dashboard
    const overallSalesTotal = rawSales.reduce((s, r) => s + Number(r.amount || 0), 0);
    const overallExpensesTotal = rawExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const overallTxCount = rawSales.length;
    const completedOrders = rawSales.filter(s => s.status !== 'cancelled' && s.status !== 'voided').length;

    // Daily metrics preserved strictly for physical till drawer & shift status
    const salesToday = rawSales.filter(r => isCreatedToday(r));
    const expensesToday = rawExpenses.filter(e => isCreatedToday(e));
    const todaySalesTotal = salesToday.reduce((s, r) => s + Number(r.amount || 0), 0);
    const todayExpenses = expensesToday.reduce((s, e) => s + Number(e.amount || 0), 0);

    const target = Number(currentBranch.target) || 0;
    const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';

    // 1. Render Top Bento KPI Row with SVG Micro-Sparklines (Overall Metrics)
    const kpiEl = document.getElementById('dashKPIs');
    if (kpiEl) {
        kpiEl.innerHTML = `
        <!-- Total Sales KPI (Overall) -->
        <div onclick="switchView('sales')" data-tooltip="Total sales revenue collected across all time" data-tooltip-title="Total Sales" data-tooltip-variant="emerald" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('total_sales', "Total Sales")}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight" title="${fmt.currency(overallSalesTotal)}">${fmt.number(overallSalesTotal)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${overallTxCount} ${window.t('total_sales_count', 'total sales')}</p>
            </div>
            <!-- Inline SVG Sparkline Micro-Bars -->
            <svg class="absolute bottom-2 right-2 w-5 h-3 text-emerald-500 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                <rect x="2" y="14" width="4.5" height="10" rx="1.5"/>
                <rect x="9" y="8" width="4.5" height="16" rx="1.5"/>
                <rect x="16" y="11" width="4.5" height="13" rx="1.5"/>
                <rect x="23" y="5" width="4.5" height="19" rx="1.5"/>
                <rect x="30" y="2" width="4.5" height="22" rx="1.5"/>
            </svg>
        </div>

        <!-- Transactions KPI (Overall) -->
        <div onclick="switchView('sales')" data-tooltip="Total completed transactions across all time" data-tooltip-title="Transactions" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('transactions', 'Transactions')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight">${overallTxCount}</p>
                <p class="text-[10px] text-blue-600 dark:text-blue-400 font-semibold mt-0.5 truncate">${completedOrders > 0 ? `${completedOrders} ${window.t('completed', 'completed')}` : window.t('all_time_orders', 'All-time orders')}</p>
            </div>
            <!-- Inline SVG Sparkline Trend Line -->
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 18 L10 12 L18 16 L26 8 L38 4" stroke="#3B86F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="4" r="2.5" fill="#3B86F7"/>
            </svg>
        </div>

        <!-- Total Expenses KPI (Overall) -->
        <div onclick="switchView('expenses')" data-tooltip="Combined operational costs and payouts recorded across all time" data-tooltip-title="Total Expenses" data-tooltip-variant="rose" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('total_expenses', 'Total Expenses')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-red-600 dark:text-red-400 truncate leading-tight" title="${fmt.currency(overallExpensesTotal)}">${fmt.number(overallExpensesTotal)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${rawExpenses.length} ${window.t('entries', 'entries')}</p>
            </div>
            <!-- Inline SVG Sparkline Trend -->
            <svg class="absolute bottom-2 right-2 w-5 h-3 text-red-500 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                <rect x="2" y="4" width="4.5" height="20" rx="1.5"/>
                <rect x="9" y="10" width="4.5" height="14" rx="1.5"/>
                <rect x="16" y="7" width="4.5" height="17" rx="1.5"/>
                <rect x="23" y="14" width="4.5" height="10" rx="1.5"/>
                <rect x="30" y="18" width="4.5" height="6" rx="1.5"/>
            </svg>
        </div>

        <!-- Open Tasks KPI -->
        <div onclick="switchView('tasks')" data-tooltip="Pending tasks requiring action" data-tooltip-title="Open Tasks" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('nav_my_tasks', 'Open Tasks')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-amber-600 dark:text-amber-400 truncate leading-tight">${tasks.filter(t => t.status !== 'completed').length}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${window.t('pending_action', 'To complete')}</p>
            </div>
            <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 text-[10px] font-black shadow-2xs">
                ${tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length ? `<span class="text-[9px] font-bold">${tasks.filter(t => t.priority === 'high' && t.status !== 'completed').length}</span>` : `<i data-lucide="check-square" class="w-3 h-3"></i>`}
            </div>
        </div>

        <!-- Sales Target KPI (Overall) -->
        <div data-tooltip="Target sales revenue goal vs overall sales achieved" data-tooltip-title="Sales Target" data-tooltip-variant="indigo" class="relative bg-white dark:bg-gray-800 p-2.5 sm:p-3 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full col-span-2 sm:col-span-1 min-w-0">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1 pr-10">
                <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight truncate block">${window.t('nav_goals', 'Goals & Targets')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-indigo-700 dark:text-indigo-300 truncate leading-tight" title="${fmt.currency(target)}">${fmt.number(target)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${target > 0 ? Math.min(100, Math.round((overallSalesTotal / target) * 100)) + '% achieved' : 'No target set'}</p>
            </div>
            <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 font-black text-[10px] shadow-2xs">
                <i data-lucide="target" class="w-3 h-3"></i>
            </div>
        </div>`;
    }

    // 2. Cash Till & Shift Widget (Left Column)
    const tillEl = document.getElementById('dashTillWidget');
    if (tillEl) {
        tillEl.innerHTML = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                    <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('till_shift_status', 'Cash Drawer & Till')}</h3>
                </div>
                <button onclick="window.handleQuickOpenTillClick()" class="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline">
                    ${window.t('manage', 'Manage')} →
                </button>
            </div>
            <div class="p-3 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between">
                <div>
                    <p class="text-[10px] uppercase font-bold text-gray-400">${window.t('todays_collected', 'Collected Today')}</p>
                    <p class="text-sm font-black text-emerald-600 dark:text-emerald-400">${fmt.currency(todaySalesTotal)}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] uppercase font-bold text-gray-400">${window.t('net_flow', 'Net Flow')}</p>
                    <p class="text-sm font-black text-gray-900 dark:text-white">${fmt.currency(Math.max(0, todaySalesTotal - todayExpenses))}</p>
                </div>
            </div>
        </div>`;
    }

    // 3. Target Radial / Progress Card (Center Column - Overall)
    const targetSection = document.getElementById('dashTargetProgress');
    if (targetSection) {
        if (target > 0) {
            const pct = Math.min(100, Math.round((overallSalesTotal / target) * 100));
            const remaining = Math.max(0, target - overallSalesTotal);
            const isHit = pct >= 100;
            const isGreat = pct >= 60;
            const strokeColor = isHit ? '#10B981' : isGreat ? '#F59E0B' : '#3B86F7';
            const labelColor = isHit ? 'text-emerald-600 dark:text-emerald-400'
                : isGreat ? 'text-amber-600 dark:text-amber-400'
                : 'text-indigo-600 dark:text-indigo-400';
            const motivational = isHit ? window.t('target_hit', 'Target hit! Outstanding work!')
                : isGreat ? window.t('great_progress', 'Great progress toward the goal!')
                : window.t('keep_pushing', 'Keep pushing toward the goal!');

            // Circular progress calculation (r=38, circ=238.76)
            const circ = 2 * Math.PI * 38;
            const offset = circ - (pct / 100) * circ;

            targetSection.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('sales_target_goal', 'Sales Target Goal')}</h3>
                    <span class="text-xs font-black ${labelColor}">${pct}%</span>
                </div>

                <div class="flex items-center gap-4 py-1">
                    <!-- Concentric Radial Ring SVG -->
                    <div class="relative w-20 h-20 flex-shrink-0 flex items-center justify-center">
                        <svg class="w-20 h-20 -rotate-90 transform" viewBox="0 0 96 96">
                            <circle cx="48" cy="48" r="38" stroke="currentColor" stroke-width="8" class="text-gray-100 dark:text-gray-700" fill="none"/>
                            <circle cx="48" cy="48" r="38" stroke="${strokeColor}" stroke-width="8" stroke-dasharray="${circ}" stroke-dashoffset="${offset}" stroke-linecap="round" fill="none" class="transition-all duration-1000 ease-out"/>
                        </svg>
                        <div class="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <span class="text-xs font-black text-gray-900 dark:text-white">${pct}%</span>
                        </div>
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex items-center justify-between text-xs mb-1">
                            <span class="text-gray-400 font-medium">${window.t('total_sales', 'Achieved')}:</span>
                            <span class="font-black text-emerald-600 dark:text-emerald-400">${fmt.currency(overallSalesTotal)}</span>
                        </div>
                        <div class="flex items-center justify-between text-xs mb-2">
                            <span class="text-gray-400 font-medium">${window.t('target_goal', 'Goal')}:</span>
                            <span class="font-black text-gray-900 dark:text-white">${fmt.currency(target)}</span>
                        </div>
                        <div class="text-[11px] font-bold ${labelColor} flex items-center gap-1">
                            <i data-lucide="${isHit ? 'award' : 'trending-up'}" class="w-3.5 h-3.5 flex-shrink-0"></i>
                            <span class="truncate">${motivational}</span>
                        </div>
                    </div>
                </div>
            </div>`;
        } else {
            targetSection.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5 flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-500 flex-shrink-0">
                    <i data-lucide="target" class="w-5 h-5"></i>
                </div>
                <div>
                    <h4 class="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">${window.t('sales_target', 'Sales Target')}</h4>
                    <p class="text-xs text-gray-400 mt-0.5">${window.t('no_target_set', 'No sales target configured for this branch.')}</p>
                </div>
            </div>`;
        }
    }

    // 4. Recent Transactions Stream (Center Column)
    const salesFeedEl = document.getElementById('dashLiveSalesList');
    if (salesFeedEl) {
        if (rawSales.length > 0) {
            const recentSales = rawSales.slice(0, 6);
            salesFeedEl.innerHTML = recentSales.map(s => {
                const customerName = s.customer_name || s.customer || 'Walk-in Customer';
                const initials = customerName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'CU';
                const timeStr = s.created_at ? (isCreatedToday(s) ? new Date(s.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })) : 'Recent';
                const paymentMethod = s.payment_method || 'Cash';
                const itemsCount = (s.items && Array.isArray(s.items)) ? s.items.length : 1;

                return `
                <div class="flex items-center justify-between p-2.5 bg-gray-50/70 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 transition-colors">
                    <div class="flex items-center gap-2.5 min-w-0">
                        <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold text-[11px] flex items-center justify-center flex-shrink-0 border border-indigo-100 dark:border-indigo-800">
                            ${initials}
                        </div>
                        <div class="min-w-0">
                            <p class="text-xs font-bold text-gray-900 dark:text-white truncate">${customerName}</p>
                            <p class="text-[10px] text-gray-400 flex items-center gap-1.5">
                                <span>${itemsCount} item${itemsCount > 1 ? 's' : ''}</span>
                                <span>•</span>
                                <span class="uppercase font-semibold">${paymentMethod}</span>
                                <span>•</span>
                                <span>${timeStr}</span>
                            </p>
                        </div>
                    </div>
                    <div class="text-right flex-shrink-0 ml-2">
                        <span class="text-xs font-black text-emerald-600 dark:text-emerald-400">${fmt.currency(s.amount || 0)}</span>
                    </div>
                </div>`;
            }).join('');
        } else {
            salesFeedEl.innerHTML = `
            <div class="py-8 text-center text-xs text-gray-400 font-medium">
                <i data-lucide="shopping-bag" class="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-1.5"></i>
                <p>${window.t('no_sales_yet', 'No sales recorded yet.')}</p>
            </div>`;
        }
    }

    // 5. Top Sellers Leaderboard (Right Column - Overall)
    const topSellersEl = document.getElementById('dashTopSellersCard');
    if (topSellersEl) {
        const saleCounts = {};
        rawSales.forEach(s => {
            const name = s.product_name || s.item_name || (s.items && s.items[0]?.name) || 'General Item';
            saleCounts[name] = (saleCounts[name] || 0) + (Number(s.quantity) || 1);
        });
        const topSellers = Object.entries(saleCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);

        if (topSellers.length > 0) {
            const maxVal = topSellers[0][1] || 1;
            topSellersEl.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('top_sellers', 'Top Sellers')}</h3>
                    <span class="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md">Ranked</span>
                </div>
                <div class="space-y-2.5">
                    ${topSellers.map(([name, count], i) => {
                        const pct = Math.round((count / maxVal) * 100);
                        return `
                        <div class="space-y-1">
                            <div class="flex items-center justify-between text-xs">
                                <span class="font-bold text-gray-800 dark:text-gray-200 truncate flex-1 pr-2"><span class="text-indigo-500 font-black mr-1">#${i + 1}</span> ${name}</span>
                                <span class="font-black text-gray-900 dark:text-white text-[11px]">${count} sold</span>
                            </div>
                            <div class="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div class="h-1.5 rounded-full bg-indigo-500" style="width: ${pct}%;"></div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        } else {
            topSellersEl.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider mb-2">${window.t('top_sellers', 'Top Sellers')}</h3>
                <p class="text-xs text-gray-400">${window.t('top_sellers_desc', 'Best performing items will appear here.')}</p>
            </div>`;
        }
    }

    // 6. Tasks Section (Right Column)
    const pendingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 3);
    const taskSec = document.getElementById('dashTasksSection');
    if (taskSec) {
        if (pendingTasks.length > 0) {
            taskSec.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm uppercase tracking-wider">${window.t('my_tasks', 'Branch Tasks')}</h3>
                    <button onclick="switchView('tasks')" class="text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:underline">View all →</button>
                </div>
                <div class="space-y-2">
                    ${pendingTasks.map(t => `
                    <div class="flex items-center gap-2.5 p-2 bg-gray-50/70 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800">
                        <div class="w-2.5 h-2.5 rounded-full ${t.priority === 'high' ? 'bg-red-500' : 'bg-blue-500'} flex-shrink-0"></div>
                        <p class="flex-1 text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">${t.title}</p>
                    </div>`).join('')}
                </div>
            </div>`;
        } else {
            taskSec.innerHTML = '';
        }
    }

    // 7. Inventory Alerts Section
    const lowStock = items.filter(i => {
        if (i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service')) {
            return false;
        }
        const qty = Number(i.quantity != null ? i.quantity : (i.stock != null ? i.stock : 0));
        const threshold = i.min_threshold != null ? Number(i.min_threshold) : (i.minimum_stock_level != null ? Number(i.minimum_stock_level) : 5);
        return qty <= threshold;
    });
    const alertContainer = document.getElementById('dashInventoryAlerts');

    if (alertContainer) {
        if (lowStock.length > 0) {
            alertContainer.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-amber-200 dark:border-amber-900/50 p-4">
                <div class="flex items-center gap-2 mb-1.5 text-amber-600 dark:text-amber-400">
                    <i data-lucide="alert-triangle" class="w-4 h-4"></i>
                    <h4 class="text-xs font-bold uppercase tracking-wider">${lowStock.length} Low Stock Alert(s)</h4>
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-2.5 truncate">${lowStock.map(i => i.name).slice(0, 2).join(', ')}${lowStock.length > 2 ? '...' : ''}</p>
                <button onclick="switchView('inventory')" class="w-full py-1.5 px-3 rounded-lg text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 transition-colors text-center cursor-pointer">
                    Manage Inventory
                </button>
            </div>`;
        } else {
            alertContainer.innerHTML = '';
        }
    }

    // 8. Admin Response Notifications
    const approvals = (requests || []).filter(r => r.status !== 'pending' && r.admin_response);
    if (approvals.length > 0) {
        const seenApprovals = JSON.parse(localStorage.getItem(`seen_approvals_${state.branchId}`) || '[]');
        const newApprovals = approvals.filter(r => !seenApprovals.includes(r.id));

        if (newApprovals.length > 0) {
            const container = document.getElementById('dashApprovals');
            if (container) {
                container.innerHTML = `
                <div class="space-y-2.5 mb-4">
                    ${newApprovals.map(req => `
                    <div id="dash-notif-${req.id}" class="bg-white dark:bg-gray-800 rounded-2xl border border-indigo-200 dark:border-indigo-800 p-4 relative overflow-hidden slide-in">
                        <div class="flex items-start gap-3 relative z-10">
                            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center flex-shrink-0 text-indigo-600">
                                <i data-lucide="${req.status === 'approved' ? 'check-circle' : 'x-circle'}" class="w-4 h-4"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-bold text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-0.5">Status Update</h4>
                                <p class="text-xs font-bold text-gray-900 dark:text-white mb-1">${req.subject}</p>
                                <p class="text-xs text-gray-600 dark:text-gray-300 italic">${req.admin_response}</p>
                            </div>
                            <button onclick="dismissDashboardNotice('${req.id}')" class="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>`).join('')}
                </div>`;

                const updatedSeen = [...new Set([...seenApprovals, ...newApprovals.map(r => r.id)])];
                localStorage.setItem(`seen_approvals_${state.branchId}`, JSON.stringify(updatedSeen));
            }
        }
    }

    if (window.lucide) lucide.createIcons();
}
