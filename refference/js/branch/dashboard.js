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

    const branchId = state.branchId || (state.branchProfile && state.branchProfile.id);
    const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === state.branchId)) || { name: 'My Branch', manager: '', target: 0 };

    let shell = document.getElementById('branchDashboardShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-4 slide-in" id="branchDashboardShell">
            <!-- Header -->
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden w-fit">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('branch_dashboard', 'Branch Dashboard')}</div>
                <div class="flex items-center gap-1.5 sm:gap-2 text-gray-400">
                    <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0"></i>
                    <span class="text-[10px] sm:text-xs font-bold whitespace-nowrap">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
            </div>

            <!-- KPI Cards -->
            <div id="dashKPIs" class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
                ${renderPremiumLoader(window.t('loading_kpi_data', 'Loading KPI data…'))}
            </div>

            <!-- Quick Actions -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 sm:p-6">
                <h3 class="font-bold text-gray-900 dark:text-white mb-4 text-sm sm:text-base">${window.t('quick_actions', 'Quick Actions')}</h3>
                <div class="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4 md:gap-5">
                    <button onclick="window.handleQuickOpenTillClick()" data-tooltip="Open till drawer session & enter starting cash float" data-tooltip-title="Open Till" data-tooltip-variant="emerald" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="banknote" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 mx-auto mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5 uppercase">${window.t('reopen_drawer', 'Open Till')}</span>
                    </button>
                    <button onclick="window.handleQuickNewSaleClick()" data-tooltip="Open POS checkout modal to ring up a new customer sale" data-tooltip-title="Record Sale" data-tooltip-variant="emerald" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="plus-circle" class="w-4 h-4 text-emerald-500 mx-auto mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5 uppercase">${window.t('new_sale', 'New Sale')}</span>
                    </button>
                    <button onclick="openModal('addExpense')" data-tooltip="Log operational expenses (rent, utilities, petty cash, supplies)" data-tooltip-title="Record Expense" data-tooltip-variant="rose" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="minus-circle" class="w-4 h-4 text-red-500 mx-auto mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5 uppercase">${window.t('add_expense', 'Add Expense')}</span>
                    </button>
                    <button onclick="openModal('addCustomer')" data-tooltip="Create new customer profile with phone, address, and credit line" data-tooltip-title="Register Customer" data-tooltip-variant="indigo" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="user-plus" class="w-4 h-4 text-blue-500 mx-auto mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5 uppercase">${window.t('add_customer', 'Add Customer')}</span>
                    </button>
                    <button onclick="openModal('addNote')" data-tooltip="Write shift handover memo, daily reminder, or branch announcement" data-tooltip-title="Add Note" data-tooltip-variant="amber" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all text-center group cursor-pointer">
                        <i data-lucide="edit-3" class="w-4 h-4 text-amber-500 mx-auto mb-1 group-hover:scale-110 transition-transform shrink-0"></i>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5 uppercase">${window.t('add_note', 'Add Note')}</span>
                    </button>
                    <button onclick="switchView('chat',null)" id="dashMsgBtn" data-tooltip="Real-time internal chat with owner and other branch managers" data-tooltip-title="Branch Messages" data-tooltip-variant="indigo" data-tooltip-position="bottom" style="border-radius: 0.75rem !important;" class="relative flex flex-col items-center justify-center min-w-0 py-1.5 px-1 h-[64px] sm:h-[70px] border border-gray-200 dark:border-gray-700 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all text-center group cursor-pointer">
                        <div class="relative inline-block mb-1 shrink-0">
                            <i data-lucide="message-square" class="w-4 h-4 text-indigo-500 mx-auto group-hover:scale-110 transition-transform"></i>
                            <span id="dashMsgBadge" class="chat-unread-badge hidden absolute -top-1.5 -right-2.5 bg-red-500 text-white text-[9px] font-black w-4 h-4 flex items-center justify-center rounded-full shadow">0</span>
                        </div>
                        <span class="text-[9px] xs:text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 block leading-tight tracking-tight whitespace-normal break-words w-full px-0.5 uppercase">${window.t('nav_messages', 'Messages')}</span>
                    </button>
                </div>
            </div>

            <div id="dashApprovals"></div>
            <div id="dashTargetProgress"></div>
            <div id="dashTasksSection"></div>
            <div id="dashInventoryAlerts"></div>
        </div>`;
    if (window.lucide) lucide.createIcons();

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
        const { data: snapshot, isCached, cachedAt } = await getBranchDashboardData(state.branchId);
        if (snapshot) {
            _populateBranchDashboardDOM(branch, snapshot);
        }
    } catch (err) {
        console.error('[Branch Dashboard Hydration Error]:', err);
    }

    if (typeof window.checkAndShowQuickOpenTillModal === 'function') {
        window.checkAndShowQuickOpenTillModal();
    }
}

function _populateBranchDashboardDOM(branch, payload) {
    const currentBranch = payload.branch || state.branchProfile || branch || {};
    const rawSales = payload.sales || [];
    const rawExpenses = payload.expenses || [];
    const tasks = payload.tasks || [];
    const items = payload.inventory || [];
    const requests = payload.requests || [];

    const sales = rawSales.filter(r => isCreatedToday(r));
    const expenses = rawExpenses.filter(e => isCreatedToday(e));

    const todaySalesTotal = sales.reduce((s, r) => s + Number(r.amount || 0), 0);
    const todayExpenses = expenses.reduce((s, e) => s + Number(e.amount || 0), 0);
    const target = Number(currentBranch.target) || 0;

    const kpiEl = document.getElementById('dashKPIs');
    if (kpiEl) {
        const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';
        kpiEl.innerHTML = `
        <div data-tooltip="Total sales revenue collected at this branch today" data-tooltip-title="Daily Sales" data-tooltip-variant="emerald" class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
            <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal leading-tight">${window.t('todays_sales', "Today's Sales")}</p>
            <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-none my-auto py-1">${fmt.number(todaySalesTotal)}</p>
        </div>
        <div data-tooltip="Number of customer checkout orders completed today" data-tooltip-title="Order Count" class="bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
            <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal leading-tight">${window.t('transactions', 'Transactions')}</p>
            <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-none my-auto py-1">${sales.length}</p>
        </div>
        <div data-tooltip="Combined operational costs and payouts recorded today" data-tooltip-title="Daily Expenses" data-tooltip-variant="rose" class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${currencySymbol}</div>
            <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal leading-tight">${window.t('total_expenses', 'Total Expenses')}</p>
            <p class="text-dynamic-lg font-black text-red-600 dark:text-red-400 truncate leading-none my-auto py-1">${fmt.number(todayExpenses)}</p>
        </div>
        <div data-tooltip="Pending tasks and restock reminders requiring attention" data-tooltip-title="Open Tasks" class="bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
            <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal leading-tight">${window.t('nav_my_tasks', 'Open Tasks')}</p>
            <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-none my-auto py-1">${tasks.filter(t => t.status !== 'completed').length}</p>
        </div>
        <div data-tooltip="Target sales revenue goal set for today" data-tooltip-title="Daily Goal" data-tooltip-variant="indigo" class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 bg-indigo-50/20 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-800/30 flex flex-col h-full">
            <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
            <p class="text-[11px] sm:text-xs text-indigo-600 dark:text-indigo-400 uppercase tracking-tight font-bold whitespace-normal leading-tight">${window.t('nav_goals', 'Sales Target')}</p>
            <p class="text-dynamic-lg font-black text-indigo-700 dark:text-indigo-300 truncate leading-none my-auto py-1">${fmt.number(target)}</p>
        </div>`;
    }

    const pendingTasks = tasks.filter(t => t.status !== 'completed').slice(0, 3);

    // Daily Target Progress Bar
    const targetSection = document.getElementById('dashTargetProgress');
    if (targetSection) {
        if (target > 0) {
            const pct = Math.min(100, Math.round((todaySalesTotal / target) * 100));
            const remaining = Math.max(0, target - todaySalesTotal);
            const isHit = pct >= 100;
            const isGreat = pct >= 60;
            const barColor = isHit ? 'from-emerald-500 to-green-400'
                : isGreat ? 'from-amber-500 to-yellow-400'
                : 'from-red-500 to-rose-400';
            const labelColor = isHit ? 'text-emerald-600 dark:text-emerald-400'
                : isGreat ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400';
            const motivational = isHit ? window.t('target_hit', 'Target hit! Outstanding work!')
                : isGreat ? window.t('great_progress', 'Great progress!')
                : window.t('keep_pushing', 'Keep pushing!');

            const saleCounts = {};
            sales.forEach(s => {
                const name = s.product_name || s.item_name || 'Unknown';
                saleCounts[name] = (saleCounts[name] || 0) + 1;
            });
            const topSellers = Object.entries(saleCounts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3)
                .map(([name]) => name);

            targetSection.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-bold text-gray-900 dark:text-white text-sm">${window.t('daily_target_progress', 'Daily Sales Target Progress')}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-lg font-black ${labelColor}">${pct}%</span>
                        ${isHit ? '<i data-lucide="award" class="w-5 h-5 text-amber-500"></i>' : ''}
                    </div>
                </div>

                <div class="relative w-full bg-gray-100 dark:bg-gray-700 rounded-full h-4 overflow-hidden mb-2">
                    <div class="h-4 rounded-full bg-gradient-to-r ${barColor} transition-all duration-700 ease-out relative overflow-hidden"
                        style="width: ${pct}%; transition: width 1s ease-out;">
                        <div class="absolute inset-0 bg-white/20 animate-pulse rounded-full"></div>
                    </div>
                </div>

                <div class="flex items-center justify-between text-xs mb-4">
                    <span class="text-gray-500 dark:text-gray-400 font-medium">${window.t('todays_performance', 'Today')}: <span class="font-black text-gray-900 dark:text-white">${fmt.currency(todaySalesTotal)}</span></span>
                    <span class="text-gray-500 dark:text-gray-400 font-medium">${window.t('target_remaining', 'Target')}: <span class="font-black text-gray-900 dark:text-white">${fmt.currency(target)}</span></span>
                </div>

                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-1.5">
                        <i data-lucide="trending-up" class="w-3.5 h-3.5 ${labelColor}"></i>
                        <span class="text-xs ${labelColor} font-bold">${motivational}</span>
                    </div>
                    ${!isHit ? `<span class="text-[10px] text-gray-400 dark:text-gray-500">${fmt.currency(remaining)} ${window.t('target_remaining', 'remaining')}</span>` : ''}
                </div>

                ${topSellers.length > 0 ? `
                <div class="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <p class="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-2">${window.t('top_sellers_today', 'Top Sellers Today')}</p>
                    <div class="flex flex-wrap gap-2">
                        ${topSellers.map((name, i) => `
                        <span class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800">
                            <span class="font-black text-[10px] text-indigo-400">${i + 1}.</span> ${name}
                        </span>`).join('')}
                    </div>
                </div>` : ''}
            </div>`;
        } else {
            targetSection.innerHTML = `
            <div class="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl p-4 flex items-center gap-3">
                <i data-lucide="target" class="w-5 h-5 text-indigo-400"></i>
                <p class="text-sm text-indigo-700 dark:text-indigo-400 font-medium">${window.t('no_target_set', 'No daily target set for this branch.')}</p>
            </div>`;
        }
    }

    if (pendingTasks.length > 0) {
        const taskSec = document.getElementById('dashTasksSection');
        if (taskSec) {
            taskSec.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div class="flex items-center justify-between mb-4">
                    <h3 class="font-semibold text-gray-900 dark:text-white">My Tasks</h3>
                    <button onclick="switchView('tasks',null)" class="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">View all →</button>
                </div>
                <div class="space-y-2">
                    ${pendingTasks.map(t => `
                    <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                        <div class="w-3 h-3 rounded-full ${t.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}"></div>
                        <p class="flex-1 text-sm text-gray-900 dark:text-white">${t.title}</p>
                        ${priorityBadge(t.priority)}
                    </div>`).join('')}
                </div>
            </div>`;
        }
    }

    const approvals = (requests || []).filter(r => r.status !== 'pending' && r.admin_response);
    if (approvals.length > 0) {
        const seenApprovals = JSON.parse(localStorage.getItem(`seen_approvals_${state.branchId}`) || '[]');
        const newApprovals = approvals.filter(r => !seenApprovals.includes(r.id));

        if (newApprovals.length > 0) {
            const container = document.getElementById('dashApprovals');
            if (container) {
                container.innerHTML = `
                <div class="space-y-3 mb-6">
                    ${newApprovals.map(req => `
                    <div id="dash-notif-${req.id}" class="${req.status === 'approved' ? 'bg-[#475B6E]' : 'bg-gradient-to-r from-rose-600 to-pink-500'} rounded-2xl shadow-lg p-5 text-white relative overflow-hidden group slide-in">
                        <div class="flex items-start gap-4 relative z-10">
                            <div class="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                                <i data-lucide="${req.status === 'approved' ? 'check-circle' : 'x-circle'}" class="w-6 h-6 text-white"></i>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-black uppercase tracking-widest text-[10px] text-white/70 mb-1">Status Update</h4>
                                <p class="text-sm font-bold mb-2">${req.subject}</p>
                                <div class="bg-black/10 rounded-xl p-3 border border-white/10">
                                    <p class="text-xs italic leading-relaxed opacity-90">${req.admin_response}</p>
                                </div>
                            </div>
                            <button onclick="dismissDashboardNotice('${req.id}')" class="p-2 hover:bg-white/10 rounded-lg transition-colors">
                                <i data-lucide="x" class="w-4 h-4"></i>
                            </button>
                        </div>
                        <div class="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl group-hover:bg-white/10 transition-colors"></div>
                    </div>`).join('')}
                </div>`;

                const updatedSeen = [...new Set([...seenApprovals, ...newApprovals.map(r => r.id)])];
                localStorage.setItem(`seen_approvals_${state.branchId}`, JSON.stringify(updatedSeen));
            }
        }
    }

    const lowStock = items.filter(i => Number(i.quantity) <= Number(i.min_threshold));
    const alertContainer = document.getElementById('dashInventoryAlerts');
    if (alertContainer) {
        if (lowStock.length > 0) {
            alertContainer.innerHTML = `
            <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-6 mt-6 flex items-start gap-4">
                <div class="w-10 h-10 bg-amber-100 dark:bg-amber-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                    <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600 dark:text-amber-500"></i>
                </div>
                <div>
                    <h4 class="text-sm font-bold text-amber-900 dark:text-amber-400 mb-1">${lowStock.length} Low Stock Alert(s)</h4>
                    <p class="text-xs text-amber-700 dark:text-amber-500/80 mb-3">${lowStock.map(i => i.name).slice(0, 3).join(', ')}${lowStock.length > 3 ? '...' : ''} are below minimum levels.</p>
                    <button onclick="switchView('inventory')" class="text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-200 dark:bg-amber-800 hover:bg-amber-300 dark:hover:bg-amber-700 py-1.5 px-3 rounded-lg transition-colors">
                        Manage Inventory
                    </button>
                </div>
            </div>`;
        } else {
            alertContainer.innerHTML = '';
        }
    }

    if (window.lucide) lucide.createIcons();
}
}
