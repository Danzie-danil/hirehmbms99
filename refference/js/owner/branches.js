
import { state } from '../state.js';
import { dbBranches, dbSales } from '../db.js';
import { renderPremiumLoader, confirmModal, showToast, fmt, openModal, renderModuleOfflineState } from '../utils.js';

export function renderBranchesManagement() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    const branchMgmtText = window.t('branches_management', 'Branch Management');
    const addBranchText = window.t('add_branch', 'Add Branch');

    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${branchMgmtText}</div>
            </div>
            <button onclick="openModal('addBranch')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0">
                <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${addBranchText}
            </button>
        </div>
        ${renderPremiumLoader('Loading branches…')}
    </div>`;
    if (window.lucide) window.lucide.createIcons();

    dbBranches.fetchAll(ownerId).then(async branches => {
        state.branches = branches || [];

        const salesTotals = await Promise.all(
            branches.map(b => dbSales.todayTotal(b.id).catch(() => 0))
        );

        const withSales = branches.map((b, i) => ({ ...b, todaySales: salesTotals[i] }));
        const combinedToday = withSales.reduce((s, b) => s + b.todaySales, 0);

        const maxBranches = typeof window.getPlanMaxBranches === 'function' ? window.getPlanMaxBranches() : 3;
        const isUnlimited = maxBranches === Infinity || maxBranches === null || maxBranches >= 9999;
        const isLimitReached = !isUnlimited && branches.length >= maxBranches;
        const usedText = window.t('used', 'Used');
        const unlimitedText = window.t('unlimited', 'Unlimited');
        const limitBadgeText = isUnlimited ? `${branches.length} / ${unlimitedText}` : `${branches.length} / ${maxBranches} ${usedText}`;
        const upgradeText = window.t('upgrade_to_add_branch', 'Upgrade Plan to Add Branch');

        const totalBranchesText = window.t('total_branches', 'Total Branches');
        const activeText = window.t('active', 'Active');
        const targetAttainedText = window.t('target_attained', 'Target Attained');
        const combinedTodayText = window.t('combined_today', 'Combined Today');
        const todaysSalesText = window.t('todays_sales', "Today's Sales");
        const managerText = window.t('manager', 'Manager');
        const achievementText = window.t('achievement', 'Achievement');
        const unassignedText = window.t('unassigned', 'Unassigned');

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                    <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${branchMgmtText}</div>
                    <span class="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full ${isLimitReached ? 'bg-amber-100 text-amber-700' : 'bg-indigo-50 text-indigo-600'}">
                        ${limitBadgeText}
                    </span>
                </div>
                <button onclick="${isLimitReached ? "showToast('Branch limit reached for your plan. Upgrade to add more.', 'error'); switchView('settings'); setTimeout(() => { if(typeof switchSettingsTab==='function') switchSettingsTab('security'); }, 150);" : "openModal('addBranch')"}"
                        data-tooltip="${isLimitReached ? 'Your current tier limit is reached. Click to view upgrade options.' : 'Create and provision a new retail location or warehouse.'}"
                        data-tooltip-title="${isLimitReached ? 'Branch Limit Reached' : 'New Branch Location'}"
                        data-tooltip-position="bottom"
                        class="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold cursor-pointer ${isLimitReached ? 'bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm' : 'btn-primary'}">
                    <i data-lucide="${isLimitReached ? 'lock' : 'plus'}" class="w-3.5 h-3.5 sm:w-4 sm:h-4 inline mr-1"></i> ${isLimitReached ? upgradeText : addBranchText}
                </button>
            </div>

            <!-- Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
                <div data-tooltip="Total number of registered branches under your business" data-tooltip-title="Branch Count" class="px-3 py-2.5 rounded-2xl text-white shadow-sm stat-card min-w-0 flex flex-col justify-between h-full" style="background-color: #475B6E !important; border-color: #475B6E !important;">
                    <p class="text-[11px] sm:text-xs text-indigo-100 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${totalBranchesText}">${totalBranchesText}</p>
                    <p class="text-dynamic-lg font-black text-white truncate leading-none my-auto py-1">${branches.length}</p>
                </div>
                <div data-tooltip="Branches currently operational and open for sales" data-tooltip-title="Active Locations" data-tooltip-variant="emerald" class="bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${activeText}">${activeText}</p>
                    <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-none my-auto py-1">${branches.filter(b => b.status === 'active').length}</p>
                </div>
                <div data-tooltip="Percentage of branches meeting or exceeding their daily sales quota" data-tooltip-title="Target Attainment" class="bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal break-words leading-tight" title="${targetAttainedText}">${targetAttainedText}</p>
                    <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-none my-auto py-1">${branches.length ? Math.round((withSales.filter(b => b.todaySales >= (b.target || 1000)).length / branches.length) * 100) : 0}%</p>
                </div>
                <div data-tooltip="Combined gross revenue earned across all branches today" data-tooltip-title="Fleet Total" data-tooltip-variant="indigo" class="relative bg-white dark:bg-gray-800 px-3 py-2.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal break-words font-bold leading-tight" title="${combinedTodayText}">${combinedTodayText}</p>
                    <p class="text-dynamic-lg font-black text-indigo-600 dark:text-indigo-400 truncate leading-none my-auto py-1">${fmt.number(combinedToday)}</p>
                </div>
            </div>

            ${branches.length === 0 ? `
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 py-16 text-center">
                <i data-lucide="git-branch" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                <p class="text-gray-400 text-sm font-medium">${window.t('no_branches_yet_sub', 'No branches yet. Create your first branch!')}</p>
                <button onclick="openModal('addBranch')" class="mt-4 btn-primary text-sm font-bold">${addBranchText}</button>
            </div>` : `
            <div class="space-y-3.5">
                ${withSales.map((branch, idx) => {
            const pct = fmt.percent(branch.todaySales, branch.target);
            const barColor = pct >= 100 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-red-500';
            const accentColors = ['border-l-indigo-500', 'border-l-emerald-500', 'border-l-blue-500', 'border-l-purple-500', 'border-l-rose-500', 'border-l-amber-500'];
            const accentColor = accentColors[idx % accentColors.length];

            const currCode = branch.currency || (state.profile && state.profile.currency) || 'USD';
            const fCurr = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: currCode }).format(val || 0);

            return `
                    <div onclick="openDetailsModal('branch', '${branch.id}')" data-tooltip="Click to view detailed branch analytics, inventory status, staff roster, and settings" data-tooltip-title="${branch.name}" data-tooltip-position="top" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${accentColor} rounded-xl p-3 md:p-4 flex items-center hover:shadow-md transition-all group relative cursor-pointer">
                        <!-- Main Content -->
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-3 mb-0.5">
                                <div>
                                    <h3 class="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">${branch.name}</h3>
                                    <div class="flex items-center gap-1.5 mt-0.5">
                                        <span class="w-1.5 h-1.5 rounded-full ${branch.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}"></span>
                                        <p class="text-[9px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest">${branch.status}</p>
                                    </div>
                                </div>
                                <div class="text-right">
                                    <p class="text-[8px] uppercase font-bold text-gray-400 dark:text-gray-500 leading-none mb-0.5">${todaysSalesText}</p>
                                    <span class="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap">${fCurr(branch.todaySales)}</span>
                                </div>
                            </div>

                            <div class="flex items-end justify-between gap-3 mt-1.5">
                                <div class="flex items-center gap-2">
                                    <div class="flex flex-col">
                                        <p class="text-[7px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest leading-none mb-0.5">${managerText}</p>
                                        <p class="text-[10px] font-bold text-gray-700 dark:text-gray-200 truncate max-w-[80px] sm:max-w-none">${branch.manager || unassignedText}</p>
                                    </div>
                                    <div class="h-4 w-px bg-gray-150 dark:bg-gray-700"></div>
                                    <div class="flex flex-col">
                                        <p class="text-[7px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest leading-none mb-0.5">${achievementText}</p>
                                        <p class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400">${pct}%</p>
                                    </div>
                                </div>

                                <div class="flex items-center gap-3">
                                    <div class="w-16 bg-gray-100 dark:bg-gray-700 rounded-full h-1 overflow-hidden hidden sm:block">
                                        <div class="${barColor} h-full transition-all duration-1000" style="width:${Math.min(pct, 100)}%"></div>
                                    </div>
                                    <div class="text-gray-300 dark:text-gray-600 group-hover:text-indigo-400 transition-colors">
                                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>`;
        }).join('')}
            </div>`}
        </div>`;
        lucide.createIcons();
    }).catch(err => {
        console.error('[OwnerBranches] Error loading branches:', err);
        container.innerHTML = renderModuleOfflineState({
            viewId: 'branches',
            title: 'Branch Management',
            entityName: 'Branch Information',
            retryAction: 'window.renderBranchesManagement()'
        });
        if (window.lucide) window.lucide.createIcons();
    });

    return '';
};

export async function deleteBranchRow(id, name) {
    const confirmed = await confirmModal(
        'Delete Branch',
        `Are you absolutely sure you want to delete the branch "${name}" ? This action cannot be undone and will delete all associated data(sales, expenses, etc.).`,
        'Delete Branch',
        'Cancel',
        'bg-red-600 hover:bg-red-700',
        name
    );
    if (!confirmed) return;

    try {
        await dbBranches.delete(id);

        state.branches = state.branches.filter(b => b.id !== id);

        showToast(`Branch "${name}" deleted successfully.`, 'success');

        switchView('branches');
    } catch (err) {
        showToast(`Failed to delete branch: ${err.message}`, 'error');
    }
};
