
import { state } from '../state.js';
import { supabase as supabaseClient } from '../supabase.js';
import { dbBranches, dbSales, dbExpenses, dbCapital, dbAssets, dbAssetMaintenance } from '../db.js';
import { renderPremiumLoader, fmt, renderModuleOfflineState } from '../utils.js';

export async function renderAnalytics() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.remove('overflow-hidden', '!p-0');
    container.classList.add('overflow-y-auto');

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    container.innerHTML = `
        ${renderPremiumLoader('Loading analytics...')}
    `;
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = await dbBranches.fetchAll(ownerId);
        state.branches = branches || [];
        const branchIds = branches.map(b => b.id);

        await Promise.all(branches.map(async b => {
            b.todaySales = await dbSales.todayTotal(b.id).catch(() => 0);
        }));

        const allExpenses = branchIds.length 
            ? (await supabaseClient.from('expenses').select('*').in('branch_id', branchIds)).data || [] 
            : [];
        state.expenses = allExpenses;

        const allTasks = branchIds.length ? (await supabaseClient.from('tasks').select('*').in('branch_id', branchIds)).data || [] : [];
        state.tasks = allTasks;

        const allSales = branchIds.length ? (await supabaseClient.from('sales').select('amount, created_at').in('branch_id', branchIds)).data || [] : [];
        const avgTxValue = allSales.length ? allSales.reduce((s, x) => s + Number(x.amount || 0), 0) / allSales.length : 0;

        const allInventory = branchIds.length ? (await supabaseClient.from('inventory').select('price, quantity').in('branch_id', branchIds)).data || [] : [];
        const inventoryValue = allInventory.reduce((s, x) => s + (Number(x.price || 0) * Number(x.quantity || 0)), 0);

        const allCustomers = branchIds.length ? (await supabaseClient.from('customers').select('loyalty_points').in('branch_id', branchIds)).data || [] : [];
        const avgLoyalty = allCustomers.length ? Math.round(allCustomers.reduce((s, c) => s + Number(c.loyalty_points || 0), 0) / allCustomers.length) : 0;

        const [capAccounts, assetsList, maintenanceList] = await Promise.all([
            dbCapital.fetchAccounts(ownerId).catch(() => []),
            dbAssets.fetchAll(ownerId).catch(() => []),
            dbAssetMaintenance.fetchAll(ownerId).catch(() => [])
        ]);
        const totalLiquidCapital = capAccounts.reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
        const totalAssetValuation = assetsList.reduce((sum, a) => sum + Number(a.current_book_value || a.purchase_cost || 0), 0);
        const totalMaintenanceCost = maintenanceList.reduce((sum, m) => sum + Number(m.cost || 0), 0);

        const totalSales = state.branches.reduce((s, b) => s + (b.todaySales || 0), 0);
        const totalExpenses = state.expenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalTarget = state.branches.reduce((s, b) => s + (Number(b.target) || 0), 0);

        const turnover = inventoryValue > 0 ? (totalSales / inventoryValue).toFixed(1) + '×' : 'N/A';
        const productivity = totalTarget > 0 ? Math.min(Math.round((totalSales / totalTarget) * 100), 100) + '%' : 'N/A';
        const tasksPct = allTasks.length ? Math.round(allTasks.filter(t => t.status === 'completed').length / allTasks.length * 100) : 0;

        const isExclusivePlan = typeof window.hasFeature === 'function' && window.hasFeature('advanced_analytics');

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                <div class="flex items-center gap-3">
                    <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                        <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('analytics_dashboard', 'Analytics Dashboard')}</div>
                    </div>
                    ${isExclusivePlan ? `
                    <button type="button" onclick="window.openAiAnalyticsPage()"
                        class="px-3.5 py-2 bg-[#475B6E] hover:bg-[#3b4b5b] text-white rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-all active:scale-95 cursor-pointer flex items-center gap-2">
                        <i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i>
                        <span>${window.t('get_ai_analytics', 'Get AI Analytics')}</span>
                    </button>
                    ` : `
                    <button type="button" onclick="window.openAiAnalyticsPage()"
                        class="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold shadow-xs transition-all active:scale-95 cursor-pointer flex items-center gap-2">
                        <img src="/exclusiveimage.png" onerror="if(window.EXCLUSIVE_DIAMOND_DATA){this.src=window.EXCLUSIVE_DIAMOND_DATA;}else{this.src='exclusiveimage.png';}" class="w-3.5 h-3.5 object-contain inline-block" alt="Exclusive">
                        <span>AI Analytics (Exclusive)</span>
                    </button>
                    `}
                </div>

                <!-- Branch Filter -->
                <div class="flex items-center gap-2 bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                    <span class="text-xs text-gray-500 font-medium ml-2">${window.t('filter', 'Filter')}</span>
                    ${window.renderPremiumSelect({
            id: 'analyticsBranchFilter',
            selectedValue: state.analyticsBranchId || 'all',
            onchange: 'renderAnalytics()',
            options: [
                { value: 'all', label: window.t('all_branches', 'All Branches'), icon: 'layers' },
                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
            ],
            classes: 'w-48'
        })}
                </div>
            </div>

            <!-- Top Stats -->
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4 pt-2">
                <div class="relative px-3 py-2 rounded-2xl text-white shadow-sm stat-card min-w-0 flex flex-col h-full" style="background-color: #475B6E !important; border-color: #475B6E !important;">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-amber-300 border border-slate-700 shadow-xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-indigo-100 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('total_revenue', 'Total Revenue')}</p>
                    <p class="text-dynamic-lg font-black truncate leading-none my-auto py-1" title="${fmt.currency(totalSales)}">${fmt.number(totalSales)}</p>
                    <p class="text-[11px] sm:text-xs text-indigo-200 truncate font-bold leading-none">${window.t('today', 'Today')}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('total_expenses', 'Total Expenses')}</p>
                    <p class="text-dynamic-lg font-black text-red-600 dark:text-red-400 truncate leading-none my-auto py-1" title="${fmt.currency(totalExpenses)}">${fmt.number(totalExpenses)}</p>
                    <p class="text-[11px] sm:text-xs text-red-500 truncate font-bold leading-none">${window.t('all_branches', 'All branches')}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('net_profit', 'Net Profit')}</p>
                    <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-none my-auto py-1" title="${fmt.currency(totalSales - totalExpenses)}">${fmt.number(totalSales - totalExpenses)}</p>
                    <p class="text-[11px] sm:text-xs text-gray-400 truncate font-bold leading-none">${window.t('revenue_minus_expenses', 'Revenue − Expenses')}</p>
                </div>
                <div onclick="window.switchView('capital')" data-tooltip="Total liquid business capital available across all bank accounts, mobile money tills, and cash drawers." data-tooltip-title="Total Business Capital" class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full cursor-pointer hover:-translate-y-1 transition-transform">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('total_available_capital', 'Total Available Capital')}</p>
                    <p class="text-dynamic-lg font-black text-indigo-600 dark:text-indigo-400 truncate leading-none my-auto py-1" title="${fmt.currency(totalLiquidCapital)}">${fmt.number(totalLiquidCapital)}</p>
                    <p class="text-[11px] sm:text-xs text-gray-400 truncate font-bold leading-none">${capAccounts.length} ${window.t('capital_accounts_count', 'accounts & tills')}</p>
                </div>
                <div onclick="window.switchView('assets')" data-tooltip="Total net book value of all company machinery, vehicles, properties, and equipment." data-tooltip-title="Fixed Asset Valuation" class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full cursor-pointer hover:-translate-y-1 transition-transform">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('fixed_assets_valuation', 'Fixed Asset Valuation')}</p>
                    <p class="text-dynamic-lg font-black text-blue-600 dark:text-blue-400 truncate leading-none my-auto py-1" title="${fmt.currency(totalAssetValuation)}">${fmt.number(totalAssetValuation)}</p>
                    <p class="text-[11px] sm:text-xs text-gray-400 truncate font-bold leading-none">${assetsList.length} ${window.t('active_assets_count', 'active assets')}</p>
                </div>
                <div onclick="window.switchView('assets')" data-tooltip="Cumulative cost spent on asset repairs, servicing, and maintenance." data-tooltip-title="Maintenance Cost" class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full cursor-pointer hover:-translate-y-1 transition-transform">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('asset_maintenance_cost', 'Asset Maintenance')}</p>
                    <p class="text-dynamic-lg font-black text-rose-600 dark:text-rose-400 truncate leading-none my-auto py-1" title="${fmt.currency(totalMaintenanceCost)}">${fmt.number(totalMaintenanceCost)}</p>
                    <p class="text-[11px] sm:text-xs text-gray-400 truncate font-bold leading-none">${maintenanceList.length} ${window.t('service_logs_count', 'service logs')}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('avg_branch', 'Avg / Branch')}</p>
                    <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-none my-auto py-1" title="${fmt.currency(state.branches.length ? totalSales / state.branches.length : 0)}">${fmt.number(state.branches.length ? totalSales / state.branches.length : 0)}</p>
                    <p class="text-[11px] sm:text-xs text-gray-400 truncate font-bold leading-none">${window.t('revenue_per_branch', 'Revenue per branch')}</p>
                </div>
            </div>

            ${window.hasFeature('advanced_analytics') ? `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="font-semibold text-gray-900 mb-4">Revenue by Branch</h3>
                    <canvas id="revenueChart" height="220"></canvas>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="font-semibold text-gray-900 mb-4">Sales Trend (7 Days)</h3>
                    <canvas id="trendChart" height="220"></canvas>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="font-semibold text-gray-900 mb-4">Expense Categories</h3>
                    <div id="expenseChartWrap" class="relative min-h-[220px] flex items-center justify-center">
                        <canvas id="expenseChart" height="220"></canvas>
                    </div>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 class="font-semibold text-gray-900 mb-4">Sales vs Target</h3>
                    <canvas id="targetChart" height="220"></canvas>
                </div>
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1 lg:col-span-2">
                    <h3 class="font-semibold text-gray-900 mb-4">${window.t('key_metrics_summary', 'Key Metrics Summary')}</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                        ${[
                [window.t('avg_transaction_value', 'Avg Transaction Value'), fmt.currency(avgTxValue), 'text-gray-900'],
                [window.t('avg_loyalty_points', 'Avg Loyalty Points'), `${avgLoyalty} pts`, 'text-emerald-600'],
                [window.t('inventory_turnover', 'Inventory Turnover'), turnover, 'text-gray-900'],
                ['Target Hit Rate (Productivity)', productivity, 'text-indigo-600'],
                ['Tasks Completion Rate', `${tasksPct}%`, 'text-amber-600']
            ].map(([label, value, cls]) => `
                        <div class="flex justify-between items-center p-2.5 px-3.5 bg-gray-50 rounded-xl">
                            <span class="text-xs sm:text-sm text-gray-600">${label}</span>
                            <span class="text-xs sm:text-sm font-bold ${cls}">${value}</span>
                        </div>`).join('')}
                    </div>
                </div>
            </div>` : `
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div class="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 col-span-1">
                    <h3 class="font-semibold text-gray-900 mb-4">${window.t('key_metrics_summary', 'Key Metrics Summary')}</h3>
                    <div class="space-y-3">
                        ${[
                [window.t('avg_transaction_value', 'Avg Transaction Value'), fmt.currency(avgTxValue), 'text-gray-900'],
                [window.t('avg_loyalty_points', 'Avg Loyalty Points'), `${avgLoyalty} pts`, 'text-emerald-600'],
                [window.t('inventory_turnover', 'Inventory Turnover'), turnover, 'text-gray-900'],
                ['Target Hit Rate', productivity, 'text-indigo-600'],
                ['Tasks Completion', `${tasksPct}%`, 'text-amber-600']
            ].map(([label, value, cls]) => `
                        <div class="flex justify-between items-center p-2.5 px-3.5 bg-gray-50 rounded-xl">
                            <span class="text-xs sm:text-sm text-gray-600">${label}</span>
                            <span class="text-xs sm:text-sm font-bold ${cls}">${value}</span>
                        </div>`).join('')}
                    </div>
                </div>
                <div class="col-span-1 lg:col-span-2">
                    ${window.renderFeatureLock('Advanced Charts & 7-Day Trend Visualizations', 'Enterprise')}
                </div>
            </div>`}
                      ${renderAiAnalyticsHeroCardHTML()}
        </div>`;

        lucide.createIcons();

        if (window.hasFeature('advanced_analytics')) {
            const filterId = document.getElementById('analyticsBranchFilter')?.value || 'all';
            state.analyticsBranchId = filterId;
            const targetIds = filterId === 'all' ? branches.map(b => b.id) : [filterId];

            const history = await dbSales.fetchHistory(targetIds, 7);
            initAnalyticsCharts(history, filterId);
        }

    } catch (err) {
        console.error('Analytics load error:', err);
        container.innerHTML = renderModuleOfflineState({
            viewId: 'analytics',
            title: 'Business Analytics',
            entityName: 'Analytics & Revenue Data',
            retryAction: 'window.renderAnalytics()'
        });
        if (window.lucide) window.lucide.createIcons();
    }

    return '';
};

export function openAiAnalyticsPage(tabId = null) {
    if (tabId && typeof tabId === 'string') {
        state.aiAnalyticsActiveTab = tabId;
    }
    if (typeof window.switchView === 'function') {
        window.switchView('ai_analytics', tabId);
    }
}
window.openAiAnalyticsPage = openAiAnalyticsPage;

function renderAiAnalyticsHeroCardHTML() {
    const isExclusivePlan = typeof window.hasFeature === 'function' && window.hasFeature('advanced_analytics');
    const isAiEnabled = window.sysSettings?.enable_modal_ai_assistant !== 'false';

    if (!isExclusivePlan) {
        return `
        <div id="ai-analytics-hero-card" class="mt-8 p-6 md:p-7 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm relative overflow-hidden">
            <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                <div class="space-y-2 max-w-2xl">
                    <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50">
                        <img src="/exclusiveimage.png" onerror="if(window.EXCLUSIVE_DIAMOND_DATA){this.src=window.EXCLUSIVE_DIAMOND_DATA;}else{this.src='exclusiveimage.png';}" class="w-4 h-4 object-contain inline-block drop-shadow-sm" alt="Exclusive">
                        Exclusive AI Strategic Intelligence
                    </div>
                    <h3 class="text-lg md:text-xl font-bold tracking-tight text-gray-900 dark:text-white">AI-Powered Business Analysis & Strategic Recommendations</h3>
                    <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        Unlock automated deep-dives across branch performances, inventory turnover risks, financial margins, and 30-day profit improvement strategies in a dedicated workspace.
                    </p>
                </div>
                <button type="button" onclick="switchView('settings'); setTimeout(() => { if(typeof switchSettingsTab==='function') switchSettingsTab('security'); }, 150);"
                    class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all active:scale-95 whitespace-nowrap flex-shrink-0 flex items-center gap-2 cursor-pointer">
                    <i data-lucide="crown" class="w-4 h-4 text-amber-300"></i> Upgrade to Exclusive Plan
                </button>
            </div>
        </div>`;
    }

    if (!isAiEnabled) return '';

    return `
    <div id="ai-analytics-hero-card" class="mt-8 p-6 md:p-7 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm relative overflow-hidden">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div class="space-y-2 max-w-2xl">
                <div class="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-900/50">
                    <img src="/exclusiveimage.png" onerror="if(window.EXCLUSIVE_DIAMOND_DATA){this.src=window.EXCLUSIVE_DIAMOND_DATA;}else{this.src='exclusiveimage.png';}" class="w-4 h-4 object-contain inline-block drop-shadow-sm" alt="Exclusive">
                    Exclusive AI Strategic Intelligence
                </div>
                <h3 class="text-lg md:text-xl font-bold tracking-tight text-gray-900 dark:text-white">AI-Powered Business Analysis & Strategic Recommendations</h3>
                <p class="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                    Access automated audits on branch performance, stock health valuation, financial margins, and 30-day profitability plans inside a dedicated AI workspace.
                </p>
            </div>
            <button type="button" onclick="window.openAiAnalyticsPage()"
                class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs sm:text-sm shadow-sm transition-all active:scale-95 whitespace-nowrap flex-shrink-0 flex items-center gap-2 cursor-pointer">
                <i data-lucide="sparkles" class="w-4 h-4 text-amber-300"></i>
                <span>Get AI Analytics</span>
            </button>
        </div>
    </div>`;
}

export async function renderAiAnalyticsPageView(extraData = null) {
    const container = document.getElementById('mainContent');
    if (!container) return;

    // Set page container mode: fixed full-height page with sticky top-nav, scrollable body, and fixed bottom-nav
    container.classList.add('overflow-hidden', '!p-0');
    container.classList.remove('overflow-y-auto');

    if (extraData && typeof extraData === 'string') {
        state.aiAnalyticsActiveTab = extraData;
    }

    const currentTab = state.aiAnalyticsActiveTab || 'branch_performance';
    const isExclusivePlan = typeof window.hasFeature === 'function' && window.hasFeature('advanced_analytics');
    const isAiEnabled = window.sysSettings?.enable_modal_ai_assistant !== 'false';

    if (!isExclusivePlan) {
        container.innerHTML = `
        <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
            <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
                <button type="button" onclick="window.switchView('analytics')" data-close-text="Back" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>Back</span>
                </button>
            </div>
            <div class="modal-main-content p-6 flex items-center justify-center min-h-[60vh]">
                ${renderAiAnalyticsHeroCardHTML()}
            </div>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    const tabs = [
        { id: 'branch_performance', label: 'Branch Performance', icon: 'store', desc: 'Breakdown of revenue targets, branch ranking, and manager execution' },
        { id: 'inventory_stock', label: 'Inventory & Stock', icon: 'boxes', desc: 'Valuation, turnover rate, stockout alerts, and slow-moving items' },
        { id: 'financial_reports', label: 'Financial Reports', icon: 'file-text', desc: 'Net profit margins, cost-to-revenue ratio, and expense audits' },
        { id: 'strategic_improvements', label: 'Strategic Improvements', icon: 'trending-up', desc: '30-day prioritized action plan to maximize business profitability' }
    ];

    const activeTabObj = tabs.find(t => t.id === currentTab) || tabs[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `ai_analytics_cache_${state.ownerId}_${currentTab}_${todayStr}`;
    const cachedData = localStorage.getItem(cacheKey);

    container.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col font-['Inter',sans-serif]">
        <!-- Fixed Top Navigation Header -->
        <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
            <div class="flex items-center gap-2.5 min-w-0">
                <button type="button" onclick="window.switchView('analytics')" data-close-text="Back" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>Back</span>
                </button>
                <div class="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                    <i data-lucide="sparkles" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <div class="flex items-center gap-2">
                        <h2 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">BMSTz AI Strategic Intelligence</h2>
                        <span class="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase rounded-md border border-indigo-100 dark:border-indigo-900/40">
                            <img src="/exclusiveimage.png" onerror="if(window.EXCLUSIVE_DIAMOND_DATA){this.src=window.EXCLUSIVE_DIAMOND_DATA;}else{this.src='exclusiveimage.png';}" class="w-3 h-3 object-contain inline-block" alt="Exclusive"> Exclusive
                        </span>
                    </div>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">Executive performance breakdown, targets evaluation & 30-day profit plans</p>
                </div>
            </div>

            <!-- Top Actions -->
            <div class="flex items-center gap-2 shrink-0">
                <button type="button" onclick="window.runAiAnalyticsReport('${currentTab}', true)"
                    class="px-4 py-1.5 bg-[#475B6E] hover:bg-[#3b4b5b] text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer">
                    <i data-lucide="${cachedData ? 'rotate-cw' : 'sparkles'}" class="w-3.5 h-3.5 text-amber-300"></i>
                    <span>${cachedData ? 'Re-analyze' : 'Analyze Now'}</span>
                </button>
            </div>
        </div>

        <!-- Scrollable Content Body -->
        <div class="modal-main-content p-4 sm:p-6 space-y-4 scroller-custom" id="aiAnalyticsScrollBody">
            <!-- Focus Tabs Bar -->
            <div class="flex-none bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs space-y-3">
                <div class="flex items-center gap-2 overflow-x-auto scroller-none pb-1">
                    ${tabs.map(t => `
                        <button type="button" onclick="window.switchAiAnalyticsTab('${t.id}')"
                            class="px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${t.id === currentTab ? 'bg-[#475B6E] text-white shadow-sm ring-2 ring-[#475B6E]/30' : 'bg-gray-50 dark:bg-gray-900/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}">
                            <i data-lucide="${t.icon}" class="w-3.5 h-3.5"></i>
                            <span>${t.label}</span>
                        </button>
                    `).join('')}
                </div>

                <div class="px-4 py-2.5 bg-gray-50 dark:bg-gray-900/40 rounded-xl border border-gray-150 dark:border-gray-700/40 text-xs text-gray-600 dark:text-gray-400 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <span class="inline-flex items-center gap-1.5"><i data-lucide="info" class="w-3.5 h-3.5 text-[#475B6E] dark:text-[#a0b4c4]"></i><strong>Audit Scope:</strong> ${activeTabObj.desc}</span>
                    ${cachedData ? `<span class="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold shrink-0 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40"><i data-lucide="check" class="w-3 h-3"></i> Real-Time Cached</span>` : ''}
                </div>
            </div>

            <!-- Analysis Output Container -->
            <div id="ai-analytics-output" class="space-y-4 min-h-[250px]">
                ${cachedData ? renderFormattedAiReportHTML(cachedData, currentTab) : renderDefaultAiPromptStateHTML(activeTabObj)}
            </div>
        </div>

        <!-- Fixed Bottom Navigation Bar (Footer) -->
        <div class="modal-bottom-nav flex-none flex items-center justify-center gap-2.5 sm:gap-3 px-4 py-3 sm:py-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20" id="aiAnalyticsBottomNav">
            ${renderAiAnalyticsFooterButtonsHTML(currentTab, Boolean(cachedData))}
        </div>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}
window.renderAiAnalyticsPageView = renderAiAnalyticsPageView;

function renderAiAnalyticsFooterButtonsHTML(currentTab, hasReport) {
    if (!hasReport) {
        return `
            <button type="button" onclick="window.runAiAnalyticsReport('${currentTab}', true)"
                class="px-5 py-2 bg-[#475B6E] hover:bg-[#3b4b5b] text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer">
                <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>Analyze Now</span>
            </button>
            <button type="button" onclick="window.askAiAnalyticsFollowUp('${currentTab}')"
                class="px-5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-800/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
                <i data-lucide="message-square" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
                <span>Ask Assistant</span>
            </button>
        `;
    }
    return `
        <button type="button" onclick="window.exportAiReportPdf('${currentTab}')"
            class="px-5 py-2 bg-[#475B6E] hover:bg-[#3b4b5b] text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer">
            <i data-lucide="file-down" class="w-3.5 h-3.5 text-rose-300"></i>
            <span>Download PDF</span>
        </button>
        <button type="button" onclick="window.exportAiReportCsv('${currentTab}')"
            class="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer">
            <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5 text-emerald-200"></i>
            <span>Export CSV / Excel</span>
        </button>
        <button type="button" onclick="window.askAiAnalyticsFollowUp('${currentTab}')"
            class="px-5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-800/60 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer">
            <i data-lucide="message-square" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
            <span>Ask Assistant Follow-up</span>
        </button>
    `;
}

export function initAnalyticsCharts(history, filterId) {
    const safeDestroyChart = (canvas) => {
        if (!canvas) return;
        try {
            if (typeof Chart !== 'undefined' && typeof Chart.getChart === 'function') {
                const existing = Chart.getChart(canvas);
                if (existing) existing.destroy();
            }
        } catch (e) {}
    };

    const rev = document.getElementById('revenueChart');
    if (rev) {
        safeDestroyChart(rev);
        let labels, data;
        if (filterId === 'all') {
            labels = state.branches.map(b => b.name.split(' ')[0]);
            data = state.branches.map(b => b.todaySales);
        } else {
            const b = state.branches.find(x => x.id === filterId);
            labels = [b?.name || 'Branch'];
            data = [b?.todaySales || 0];
        }

        new Chart(rev.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{ label: 'Today Revenue', data: data, backgroundColor: ['#6366f1', '#8b5cf6', '#a78bfa', '#f59e0b', '#10b981'], borderRadius: 8 }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
        });
    }

    const trend = document.getElementById('trendChart');
    if (trend) {
        safeDestroyChart(trend);
        const groups = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().split('T')[0];
            groups[key] = 0;
        }

        history.forEach(s => {
            const key = s.created_at.split('T')[0];
            if (groups[key] !== undefined) groups[key] += Number(s.amount);
        });

        const labels = Object.keys(groups).map(k => {
            const d = new Date(k);
            return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
        });
        const data = Object.values(groups);

        new Chart(trend.getContext('2d'), {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Revenue',
                    data: data,
                    borderColor: '#6366f1',
                    tension: 0.3,
                    fill: true,
                    backgroundColor: 'rgba(99, 102, 241, 0.05)',
                    pointBackgroundColor: '#fff',
                    pointBorderColor: '#6366f1',
                    pointBorderWidth: 2
                }]
            },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }
        });
    }

    const expWrap = document.getElementById('expenseChartWrap');
    const exp = document.getElementById('expenseChart');
    if (exp) {
        safeDestroyChart(exp);
        const relevantExpenses = (filterId === 'all' ? state.expenses : state.expenses?.filter(e => e.branch_id === filterId)) || [];
        const categories = [...new Set(relevantExpenses.map(e => e.category || 'Other'))].filter(Boolean);
        const catData = categories.map(c => relevantExpenses.filter(e => e.category === c).reduce((s, x) => s + Number(x.amount || 0), 0));
        const totalExp = catData.reduce((s, a) => s + a, 0);

        if (!relevantExpenses.length || totalExp === 0 || !categories.length) {
            if (expWrap) {
                expWrap.innerHTML = `
                    <div class="flex flex-col items-center justify-center h-[220px] text-center p-4">
                        <div class="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-gray-400 flex items-center justify-center mb-2.5 shadow-2xs">
                            <i data-lucide="receipt" class="w-6 h-6 text-gray-400"></i>
                        </div>
                        <p class="text-xs font-bold text-gray-700 dark:text-gray-300">No Expenses Recorded</p>
                        <p class="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">Recorded branch expenses will automatically be categorized here</p>
                    </div>
                `;
                if (window.lucide) lucide.createIcons();
            }
        } else {
            new Chart(exp.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: categories,
                    datasets: [{
                        data: catData,
                        backgroundColor: ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'],
                        borderWidth: 2,
                        borderColor: '#ffffff'
                    }]
                },
                options: {
                    cutout: '75%',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { usePointStyle: true, padding: 15, font: { size: 11, weight: 'bold' } }
                        }
                    }
                }
            });
        }
    }

    const targetCtx = document.getElementById('targetChart');
    if (targetCtx) {
        safeDestroyChart(targetCtx);
        let labels, salesData, targetData;
        if (filterId === 'all') {
            labels = state.branches.map(b => b.name.split(' ')[0]);
            salesData = state.branches.map(b => b.todaySales);
            targetData = state.branches.map(b => Number(b.target) || 0);
        } else {
            const b = state.branches.find(x => x.id === filterId);
            labels = [b?.name || 'Branch'];
            salesData = [b?.todaySales || 0];
            targetData = [Number(b?.target) || 0];
        }

        new Chart(targetCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: 'Sales', data: salesData, backgroundColor: '#6366f1', borderRadius: 6 },
                    { label: 'Target', data: targetData, backgroundColor: '#e2e8f0', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, boxWidth: 6 } } },
                scales: { y: { beginAtZero: true }, x: { grid: { display: false } } }
            }
        });
    }
};

function renderDefaultAiPromptStateHTML(activeTabObj) {
    return `
    <div class="p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700/60 space-y-4 flex flex-col items-center justify-center min-h-[260px] shadow-xs">
        <div class="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <i data-lucide="cpu" class="w-6 h-6"></i>
        </div>
        <div class="max-w-md space-y-1">
            <h4 class="text-sm font-bold text-gray-900 dark:text-white">Ready for On-Demand Analysis</h4>
            <p class="text-xs text-gray-500 dark:text-gray-400">
                Click <strong>"Analyze Now"</strong> above to trigger real-time AI evaluation for <strong>${activeTabObj.label}</strong>.
            </p>
        </div>
    </div>`;
}

function formatMarkdownHTML(text) {
    if (!text) return '';

    const normalizedRaw = typeof window.normalizeReportText === 'function' ? window.normalizeReportText(text) : text;
    const rawLines = normalizedRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let html = '';
    let inList = false;
    let inTable = false;
    let tableHeaderDone = false;
    let tableAlignments = [];

    const formatInline = (str) => {
        if (!str) return '';
        const norm = typeof window.normalizeReportText === 'function' ? window.normalizeReportText(str) : str;
        return norm
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-gray-900 dark:text-white">$1</strong>')
            .replace(/\*(.*?)\*/g, '<em class="italic text-gray-800 dark:text-gray-200">$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono text-xs text-rose-500">$1</code>');
    };

    const parseCells = (line) => {
        let trimmed = line.trim();
        if (trimmed.startsWith('|')) trimmed = trimmed.substring(1);
        if (trimmed.endsWith('|')) trimmed = trimmed.substring(0, trimmed.length - 1);
        return trimmed.split('|').map(c => c.trim());
    };

    const isSeparatorRow = (line) => {
        const trimmed = line.trim();
        return /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(trimmed);
    };

    const isTableRow = (line) => {
        const trimmed = line.trim();
        return trimmed.length > 2 && trimmed.includes('|') && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('&gt;') && !trimmed.startsWith('- [') && !trimmed.startsWith('* [');
    };

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();

        if (!line) {
            if (inTable) {
                let nextHasTableRow = false;
                for (let j = i + 1; j < rawLines.length; j++) {
                    const nextTrimmed = rawLines[j].trim();
                    if (!nextTrimmed) continue;
                    if (isTableRow(nextTrimmed)) {
                        nextHasTableRow = true;
                    }
                    break;
                }
                if (nextHasTableRow) continue;

                html += (tableHeaderDone ? '</tbody>' : '</thead>') + '</table></div>';
                inTable = false;
                tableHeaderDone = false;
                tableAlignments = [];
            }
            if (inList) {
                html += '</ul>';
                inList = false;
            }
            continue;
        }

        // Markdown Table Row Processing
        if (isTableRow(line)) {
            if (inList) { html += '</ul>'; inList = false; }

            if (isSeparatorRow(line)) {
                if (inTable && !tableHeaderDone) {
                    const sepCells = parseCells(line);
                    tableAlignments = sepCells.map(s => {
                        if (s.startsWith(':') && s.endsWith(':')) return 'text-center';
                        if (s.endsWith(':')) return 'text-right';
                        return 'text-left';
                    });
                    html += '</thead><tbody class="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800/60">';
                    tableHeaderDone = true;
                }
                continue;
            }

            if (!inTable) {
                let isRealTable = false;
                for (let j = i + 1; j < rawLines.length; j++) {
                    const nextTrimmed = rawLines[j].trim();
                    if (!nextTrimmed) continue;
                    if (isSeparatorRow(nextTrimmed) || isTableRow(nextTrimmed)) {
                        isRealTable = true;
                    }
                    break;
                }

                if (isRealTable) {
                    inTable = true;
                    tableHeaderDone = false;
                    tableAlignments = [];
                    const cells = parseCells(line);
                    html += `<div class="overflow-x-auto my-3.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-xs">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs text-left font-['Inter',sans-serif]">
                            <thead class="bg-gray-100/90 dark:bg-gray-800 font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wider text-[10.5px]">
                                <tr>${cells.map(c => `<th scope="col" class="px-3.5 py-2.5 font-extrabold whitespace-nowrap">${formatInline(c)}</th>`).join('')}</tr>`;
                    continue;
                }
            } else {
                const cells = parseCells(line);
                if (!tableHeaderDone) {
                    html += '</thead><tbody class="divide-y divide-gray-100 dark:divide-gray-700/60 bg-white dark:bg-gray-800/60">';
                    tableHeaderDone = true;
                }
                html += `<tr class="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors">
                    ${cells.map((c, cellIdx) => {
                        const alignClass = tableAlignments[cellIdx] || 'text-left';
                        return `<td class="px-3.5 py-2.5 whitespace-nowrap text-gray-800 dark:text-gray-200 font-medium ${alignClass}">${formatInline(c)}</td>`;
                    }).join('')}
                </tr>`;
                continue;
            }
        } else if (inTable) {
            html += (tableHeaderDone ? '</tbody>' : '</thead>') + '</table></div>';
            inTable = false;
            tableHeaderDone = false;
            tableAlignments = [];
        }

        // Inline formatting: bold, italic, code
        let formattedLine = formatInline(line);

        // Headers
        if (/^####\s+(.*)/.test(line)) {
            if (inList) { html += '</ul>'; inList = false; }
            const txt = formattedLine.replace(/^####\s+/, '');
            html += `<h5 class="font-black text-gray-900 dark:text-white text-xs uppercase tracking-wider mt-4 mb-2 flex items-center gap-2 font-['Inter',sans-serif]"><span class="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>${txt}</h5>`;
        } else if (/^###\s+(.*)/.test(line)) {
            if (inList) { html += '</ul>'; inList = false; }
            const txt = formattedLine.replace(/^###\s+/, '');
            html += `<h4 class="font-black text-gray-900 dark:text-white text-sm mt-5 mb-2 font-['Inter',sans-serif]">${txt}</h4>`;
        } else if (/^##\s+(.*)/.test(line)) {
            if (inList) { html += '</ul>'; inList = false; }
            const txt = formattedLine.replace(/^##\s+/, '');
            html += `<h3 class="font-black text-gray-900 dark:text-white text-base mt-6 mb-2 border-b border-gray-150 dark:border-gray-700/50 pb-1 font-['Inter',sans-serif]">${txt}</h3>`;
        } else if (/^#\s+(.*)/.test(line)) {
            if (inList) { html += '</ul>'; inList = false; }
            const txt = formattedLine.replace(/^#\s+/, '');
            html += `<h2 class="font-black text-gray-900 dark:text-white text-lg mt-6 mb-3 font-['Inter',sans-serif]">${txt}</h2>`;
        }
        // Unordered List Items (- or * or •)
        else if (/^[\*\-\•]\s+(.*)/.test(line)) {
            if (!inList) {
                html += '<ul class="space-y-2 my-2 ml-1 font-[\'Inter\',sans-serif]">';
                inList = true;
            }
            const txt = formattedLine.replace(/^[\*\-\•]\s+/, '');
            html += `<li class="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300"><span class="text-[#475B6E] dark:text-[#a0b4c4] font-bold select-none">•</span><div class="leading-relaxed flex-1">${txt}</div></li>`;
        }
        // Ordered List Items (1. 2. etc)
        else if (/^\d+\.\s+(.*)/.test(line)) {
            if (inList) { html += '</ul>'; inList = false; }
            const num = line.match(/^(\d+)\./)[1];
            const txt = formattedLine.replace(/^\d+\.\s+/, '');
            html += `<div class="flex items-start gap-2 text-xs text-gray-700 dark:text-gray-300 my-1.5 font-['Inter',sans-serif]"><span class="w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-black flex items-center justify-center shrink-0 mt-0.5">${num}</span><div class="leading-relaxed flex-1">${txt}</div></div>`;
        }
        // Blockquotes / Alerts (> text)
        else if (/^&gt;\s+(.*)/.test(line) || /^>\s+(.*)/.test(line)) {
            if (inList) { html += '</ul>'; inList = false; }
            const txt = formattedLine.replace(/^(?:&gt;|>)\s+/, '');
            html += `<blockquote class="p-3 my-2 bg-indigo-50/60 dark:bg-indigo-950/30 border-l-4 border-indigo-500 rounded-r-xl text-xs text-indigo-900 dark:text-indigo-200 font-medium font-['Inter',sans-serif]">${txt}</blockquote>`;
        }
        // Normal paragraph
        else {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<p class="text-xs text-gray-700 dark:text-gray-300 leading-relaxed my-1.5 font-['Inter',sans-serif]">${formattedLine}</p>`;
        }
    }

    if (inTable) {
        html += (tableHeaderDone ? '</tbody>' : '</thead>') + '</table></div>';
    }
    if (inList) html += '</ul>';
    return html;
}

function renderFormattedAiReportHTML(rawReport, currentTab) {
    const formattedBody = formatMarkdownHTML(rawReport);

    return `
    <div class="space-y-4 font-['Inter',sans-serif]">
        <!-- Top Status Banner -->
        <div class="flex items-center justify-between gap-3 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
            <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span class="text-xs font-bold text-gray-800 dark:text-gray-100">AI Strategic Report Generated</span>
            </div>
            <span class="text-[10px] text-gray-400 font-medium">Use fixed footer buttons to export</span>
        </div>

        <!-- Main Report Body Card -->
        <div class="p-5 sm:p-7 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs leading-relaxed text-xs space-y-3">
            ${formattedBody}
        </div>
    </div>`;
}

window.exportAiReportPdf = async function(tabId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `ai_analytics_cache_${state.ownerId}_${tabId}_${todayStr}`;
    let rawReport = localStorage.getItem(cacheKey);

    if (!rawReport) {
        if (typeof showToast === 'function') showToast('Please generate the AI analysis before exporting', 'warning');
        return;
    }

    if (typeof window.ensurePdfLibraries === 'function') {
        await window.ensurePdfLibraries();
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        if (typeof showToast === 'function') showToast('PDF library failed to load', 'error');
        return;
    }

    if (typeof showToast === 'function') showToast('Generating AI Strategic Report PDF...', 'info');

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const pw = doc.internal.pageSize.width;
    const ph = doc.internal.pageSize.height;
    const m = 14;

    // Load only Inter font into jsPDF
    let fontName = 'Inter';
    if (typeof window.ensureInterFont === 'function') {
        const hasInter = await window.ensureInterFont(doc);
        if (!hasInter) fontName = 'helvetica';
    } else {
        fontName = 'helvetica';
    }

    const tabLabels = {
        'branch_performance': 'Branch Performance & Targets',
        'inventory_stock': 'Inventory Valuation & Stock Health',
        'financial_reports': 'Financial Audit & Margin Intelligence',
        'strategic_improvements': '30-Day Strategic Profitability Plan'
    };
    const tabTitle = tabLabels[tabId] || 'Strategic Business Intelligence';

    const profile = state?.profile || {};
    const enterpriseName = (state?.enterpriseName || profile.company_name || 'BMS Enterprise').toUpperCase();
    const phone = profile.phone || '—';
    const email = profile.email || '—';
    const tin = profile.tax_id || '—';
    const regNo = profile.business_reg_no || '—';
    const location = profile.address || profile.location || 'Enterprise Operations';

    // 1. Enterprise Hero Header
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 0, pw, 38, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(0, 38, pw, 38);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(15);
    doc.setTextColor(30, 41, 59);
    doc.text(enterpriseName, m, 14);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(71, 91, 110);
    doc.text(`AI STRATEGIC REPORT: ${tabTitle.toUpperCase()}`, m, 22);

    doc.setFont(fontName, 'bold');
    doc.setFontSize(8);
    doc.setTextColor(79, 70, 229);
    doc.text(`BMSTZ AI INTELLIGENCE  |  EXECUTIVE AUDIT`, m, 30);

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`TIN: ${tin}  |  Reg BL: ${regNo}`, pw - m, 12, { align: 'right' });
    doc.text(`${location}  |  ${phone}`, pw - m, 18, { align: 'right' });
    doc.text(`${email}`, pw - m, 24, { align: 'right' });
    doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pw - m, 30, { align: 'right' });

    let currentY = 46;

    // Sub-banner with audit metadata
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(m, currentY, pw - (m * 2), 11, 2, 2, 'FD');

    doc.setFont(fontName, 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 91, 110);
    doc.text(`Audit Focus: ${tabTitle}`, m + 4, currentY + 7);
    doc.text(`Status: Evaluated Real-Time AI Analysis  |  Date: ${todayStr}`, pw - m - 4, currentY + 7, { align: 'right' });

    currentY += 18;

    // Normalize entire report text before parsing
    const normReport = typeof window.normalizeReportText === 'function' ? window.normalizeReportText(rawReport) : rawReport;
    const rawLines = normReport.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let inTable = false;
    let tableLines = [];

    const isTableRow = (line) => {
        const trimmed = line.trim();
        return trimmed.length > 2 && trimmed.includes('|') && !trimmed.startsWith('#') && !trimmed.startsWith('>') && !trimmed.startsWith('&gt;');
    };

    const flushTable = () => {
        if (tableLines.length === 0) return;
        const parsedRows = [];
        let headers = [];
        for (let t = 0; t < tableLines.length; t++) {
            const tLine = tableLines[t].trim();
            if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(tLine)) continue;
            let cells = tLine;
            if (cells.startsWith('|')) cells = cells.substring(1);
            if (cells.endsWith('|')) cells = cells.substring(0, cells.length - 1);
            const rowCells = cells.split('|').map(c => {
                const stripped = c.trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1');
                return typeof window.normalizeReportText === 'function' ? window.normalizeReportText(stripped) : stripped;
            });
            if (headers.length === 0) {
                headers = rowCells;
            } else {
                parsedRows.push(rowCells);
            }
        }

        if (headers.length > 0 && typeof doc.autoTable === 'function') {
            doc.autoTable({
                head: [headers],
                body: parsedRows,
                startY: currentY,
                margin: { left: m, right: m },
                styles: { font: fontName, fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
                headStyles: { font: fontName, fillColor: [71, 91, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                tableLineColor: [226, 232, 240],
                tableLineWidth: 0.3
            });
            currentY = doc.lastAutoTable.finalY + 6;
        }
        tableLines = [];
    };

    const checkPageBreak = (neededHeight = 8) => {
        if (currentY + neededHeight > ph - 16) {
            doc.addPage();
            currentY = 16;
        }
    };

    for (let i = 0; i < rawLines.length; i++) {
        let line = rawLines[i].trim();

        if (isTableRow(line)) {
            inTable = true;
            tableLines.push(line);
            continue;
        } else if (inTable) {
            flushTable();
            inTable = false;
        }

        if (!line) {
            currentY += 2;
            continue;
        }

        const rawClean = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');
        const cleanText = typeof window.normalizeReportText === 'function' ? window.normalizeReportText(rawClean) : rawClean;

        if (/^#+\s+/.test(line)) {
            checkPageBreak(12);
            const headingText = cleanText.replace(/^#+\s+/, '');
            doc.setFont(fontName, 'bold');
            doc.setFontSize(10);
            doc.setTextColor(30, 41, 59);
            doc.text(headingText, m, currentY);
            currentY += 5.5;
        } else if (/^[\*\-\•]\s+/.test(line)) {
            checkPageBreak(8);
            const bulletText = cleanText.replace(/^[\*\-\•]\s+/, '');
            doc.setFont(fontName, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            doc.text('•', m + 2, currentY);
            const splitLines = doc.splitTextToSize(bulletText, pw - (m * 2) - 8);
            doc.text(splitLines, m + 6, currentY);
            currentY += splitLines.length * 4 + 1.5;
        } else if (/^\d+\.\s+/.test(line)) {
            checkPageBreak(8);
            const match = line.match(/^(\d+)\.\s+(.*)/);
            const num = match ? match[1] : '1';
            const numRaw = match ? match[2].replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1') : cleanText;
            const numText = typeof window.normalizeReportText === 'function' ? window.normalizeReportText(numRaw) : numRaw;
            doc.setFont(fontName, 'bold');
            doc.setFontSize(8);
            doc.setTextColor(79, 70, 229);
            doc.text(`${num}.`, m + 2, currentY);
            doc.setFont(fontName, 'normal');
            doc.setTextColor(51, 65, 85);
            const splitLines = doc.splitTextToSize(numText, pw - (m * 2) - 8);
            doc.text(splitLines, m + 7, currentY);
            currentY += splitLines.length * 4 + 1.5;
        } else if (/^(?:&gt;|>)\s+/.test(line)) {
            checkPageBreak(10);
            const quoteText = cleanText.replace(/^(?:&gt;|>)\s+/, '');
            doc.setFillColor(243, 244, 246);
            doc.setDrawColor(79, 70, 229);
            doc.setLineWidth(0.8);
            const splitLines = doc.splitTextToSize(quoteText, pw - (m * 2) - 8);
            const boxH = splitLines.length * 4 + 4;
            doc.rect(m, currentY - 3, pw - (m * 2), boxH, 'F');
            doc.line(m, currentY - 3, m, currentY - 3 + boxH);
            doc.setFont(fontName, 'italic');
            doc.setFontSize(8);
            doc.setTextColor(30, 41, 59);
            doc.text(splitLines, m + 4, currentY + 1);
            currentY += boxH + 3;
        } else {
            checkPageBreak(7);
            doc.setFont(fontName, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(51, 65, 85);
            const splitLines = doc.splitTextToSize(cleanText, pw - (m * 2));
            doc.text(splitLines, m, currentY);
            currentY += splitLines.length * 4 + 2;
        }
    }

    if (inTable) {
        flushTable();
    }

    // Dynamic Multi-Page Footer
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        doc.setPage(p);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(m, ph - 12, pw - m, ph - 12);

        doc.setFont(fontName, 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184);
        doc.text('BMSTz AI Strategic Intelligence  |  Confidential Business Audit', m, ph - 7);
        doc.text(`Page ${p} of ${pageCount}`, pw - m, ph - 7, { align: 'right' });
    }

    const filename = `bmstz_ai_analysis_${tabId}_${todayStr}.pdf`;
    doc.save(filename);
    if (typeof showToast === 'function') showToast('AI Report PDF downloaded successfully', 'success');
};

window.exportAiReportCsv = function(tabId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `ai_analytics_cache_${state.ownerId}_${tabId}_${todayStr}`;
    let rawReport = localStorage.getItem(cacheKey);

    if (!rawReport) {
        if (typeof showToast === 'function') showToast('Please generate the AI analysis before exporting', 'warning');
        return;
    }

    const tabLabels = {
        'branch_performance': 'Branch Performance & Targets',
        'inventory_stock': 'Inventory Valuation & Stock Health',
        'financial_reports': 'Financial Audit & Margin Intelligence',
        'strategic_improvements': '30-Day Strategic Profitability Plan'
    };
    const tabTitle = tabLabels[tabId] || 'Strategic Business Intelligence';

    const profile = state?.profile || {};
    const enterpriseName = state?.enterpriseName || profile.company_name || 'BMS Enterprise';

    const csvRows = [];
    const pushRow = (...cols) => {
        csvRows.push(cols.map(c => {
            const val = typeof window.normalizeReportText === 'function' ? window.normalizeReportText(String(c || '')) : String(c || '');
            return `"${val.replace(/"/g, '""')}"`;
        }).join(','));
    };

    // Header Block
    pushRow('BMSTz AI STRATEGIC INTELLIGENCE REPORT');
    pushRow('Enterprise', enterpriseName);
    pushRow('Audit Focus', tabTitle);
    pushRow('TIN', profile.tax_id || 'N/A');
    pushRow('Registration BL', profile.business_reg_no || 'N/A');
    pushRow('Phone', profile.phone || 'N/A');
    pushRow('Email', profile.email || 'N/A');
    pushRow('Date Generated', `${todayStr} ${new Date().toLocaleTimeString('en-GB')}`);
    pushRow('');

    // Process Report Lines
    const normReport = typeof window.normalizeReportText === 'function' ? window.normalizeReportText(rawReport) : rawReport;
    const rawLines = normReport.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    let inTable = false;

    for (let i = 0; i < rawLines.length; i++) {
        const line = rawLines[i].trim();
        if (!line) {
            if (!inTable) pushRow('');
            continue;
        }

        // Table Row Check
        if (line.includes('|') && line.length > 2 && !line.startsWith('#') && !line.startsWith('>') && !line.startsWith('&gt;')) {
            inTable = true;
            if (/^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?$/.test(line)) continue;
            let cells = line;
            if (cells.startsWith('|')) cells = cells.substring(1);
            if (cells.endsWith('|')) cells = cells.substring(0, cells.length - 1);
            const rowCells = cells.split('|').map(c => c.trim().replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1'));
            pushRow(...rowCells);
            continue;
        } else if (inTable) {
            inTable = false;
            pushRow('');
        }

        const cleanText = line.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').replace(/`(.*?)`/g, '$1');

        if (/^#+\s+/.test(line)) {
            pushRow(cleanText.replace(/^#+\s+/, '').toUpperCase());
        } else if (/^[\*\-\•]\s+/.test(line)) {
            pushRow('• ' + cleanText.replace(/^[\*\-\•]\s+/, ''));
        } else if (/^\d+\.\s+/.test(line)) {
            pushRow(cleanText);
        } else {
            pushRow(cleanText);
        }
    }

    pushRow('');
    pushRow('Confidential Business Report generated by BMSTz Enterprise Platform');

    const csvContent = '\uFEFF' + csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `bmstz_ai_analysis_${tabId}_${todayStr}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    if (typeof showToast === 'function') showToast('AI Report exported as CSV/Excel successfully', 'success');
};


window.switchAiAnalyticsTab = function(tabId) {
    state.aiAnalyticsActiveTab = tabId;
    if (document.getElementById('aiAnalyticsScrollBody') || state.activeView === 'ai_analytics') {
        renderAiAnalyticsPageView(tabId);
    } else {
        renderAnalytics();
    }
};

window.runAiAnalyticsReport = async function(tabId, forceRefresh = false) {
    const isExclusivePlan = typeof window.hasFeature === 'function' && window.hasFeature('advanced_analytics');
    if (!isExclusivePlan) {
        if (typeof window.showToast === 'function') {
            window.showToast('AI Strategic Intelligence & Analytics is an Exclusive-only feature. Please upgrade your plan.', 'warning');
        }
        if (typeof window.openAiAnalyticsPage === 'function') {
            window.openAiAnalyticsPage(tabId);
        }
        return;
    }

    const container = document.getElementById('ai-analytics-output');
    if (!container) return;

    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `ai_analytics_cache_${state.ownerId}_${tabId}_${todayStr}`;
    
    if (!forceRefresh) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            container.innerHTML = renderFormattedAiReportHTML(cached, tabId);
            lucide.createIcons({ scope: container });
            return;
        }
    }

    container.innerHTML = `
    <div class="p-8 text-center bg-gray-50/60 dark:bg-gray-900/30 rounded-2xl border border-gray-150 dark:border-gray-700/50 space-y-3">
        <div class="w-10 h-10 rounded-2xl bg-[#475B6E]/10 flex items-center justify-center text-[#475B6E] dark:text-[#a0b4c4] mx-auto">
            <i data-lucide="sparkles" class="w-5 h-5 animate-pulse text-indigo-500"></i>
        </div>
        <div class="space-y-1 max-w-sm mx-auto">
            <h4 class="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">Analyzing Business Performance</h4>
            <p class="text-[11px] sm:text-xs text-gray-400">Evaluating real-time sales, expenses, and inventory data to build your strategic AI report...</p>
        </div>
        <div class="w-32 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mx-auto overflow-hidden">
            <div class="w-full h-full bg-[#475B6E] animate-pulse"></div>
        </div>
    </div>`;
    if (window.lucide) lucide.createIcons({ scope: container });

    try {
        const branches = state.branches || [];
        const totalSales = branches.reduce((s, b) => s + (b.todaySales || 0), 0);
        const totalExpenses = (state.expenses || []).reduce((s, e) => s + (e.amount || 0), 0);
        const totalTarget = branches.reduce((s, b) => s + (Number(b.target) || 0), 0);
        const taskList = state.tasks || [];
        const completedTasks = taskList.filter(t => t.status === 'completed').length;

        const summaryText = `
Business Metrics Summary:
• Active Branches: ${branches.length}
• Today Total Sales: ${fmt.currency(totalSales)}
• Total Expenses: ${fmt.currency(totalExpenses)}
• Net Profit Today: ${fmt.currency(totalSales - totalExpenses)}
• Total Sales Target: ${fmt.currency(totalTarget)}
• Tasks: ${taskList.length} total (${completedTasks} completed)
• Branch Breakdown: ${branches.length > 0 ? branches.map(b => `${b.name} (Sales: ${fmt.currency(b.todaySales || 0)}, Target: ${fmt.currency(b.target || 0)})`).join('; ') : 'No operational branches registered'}
`.trim();

        const lang = localStorage.getItem('ai_lang') || window.state?.currentLanguage || 'en';
        
        let promptText = '';
        if (tabId === 'branch_performance') {
            promptText = `Provide a structured analysis of branch performance based on this data:\n${summaryText}\nIdentify top and underperforming branches, evaluate target hit rates, and suggest operational improvements for branch managers.`;
        } else if (tabId === 'inventory_stock') {
            promptText = `Provide an inventory and stock analysis based on this data:\n${summaryText}\nDiscuss stock turnover risks, inventory capital allocation, and restocking strategy.`;
        } else if (tabId === 'financial_reports') {
            promptText = `Provide a financial and profitability report based on this data:\n${summaryText}\nAnalyze net profit margin, expense ratios, and pinpoint cost reduction opportunities.`;
        } else if (tabId === 'strategic_improvements') {
            promptText = `Provide 3 prioritized strategic improvement suggestions for the business owner for the next 30 days based on this data:\n${summaryText}\nOutline concrete steps to increase sales and profitability.`;
        }

        const { data: { session } } = await supabaseClient.auth.getSession();
        const token = session?.access_token || '';
        const isMobile = window.innerWidth < 768 || /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                message: promptText,
                device_type: isMobile ? 'mobile' : 'desktop'
            })
        });

        if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || 'API server error ' + res.statusText);
        }
        const data = await res.json();
        const report = data.reply || 'No report generated.';

        localStorage.setItem(cacheKey, report);
        container.innerHTML = renderFormattedAiReportHTML(report, tabId);
        lucide.createIcons({ scope: container });

        const bNav = document.getElementById('aiAnalyticsBottomNav');
        if (bNav) {
            bNav.innerHTML = renderAiAnalyticsFooterButtonsHTML(tabId, true);
            if (window.lucide) lucide.createIcons({ scope: bNav });
        }
    } catch (err) {
        console.error('AI Analytics Report failed:', err);
        container.innerHTML = `<div class="p-4 bg-red-50 text-red-600 rounded-xl text-xs font-bold text-center">Failed to generate AI report: ${err.message}</div>`;
    }
};

window.askAiAnalyticsFollowUp = function(tabId) {
    const todayStr = new Date().toISOString().split('T')[0];
    const cacheKey = `ai_analytics_cache_${state.ownerId}_${tabId}_${todayStr}`;
    const cachedReport = localStorage.getItem(cacheKey) || '';

    const lang = localStorage.getItem('ai_lang') || 'en';
    const followUpPrompt = lang === 'sw'
        ? `Kuhusu ripoti ya uchambuzi wa AI ya ${tabId.replace('_', ' ')} kwa biashara yangu: Nina swali la ziada...`
        : `Regarding the recent AI ${tabId.replace('_', ' ')} analysis report for my business: I have a follow-up question...`;

    document.body.classList.add('ai-modal-context-active');
    if (typeof window.toggleAiChat === 'function') {
        window.toggleAiChat();
    }
    
    const widget = document.getElementById('ai-assistant-widget');
    if (widget) {
        widget.style.zIndex = '999999';
        document.body.appendChild(widget);
    }

    setTimeout(() => {
        const input = document.getElementById('ai-chat-input');
        if (input) {
            input.value = followUpPrompt;
            input.focus();
        }
    }, 280);
};

window.scrollToAiAnalyticsSection = function() {
    window.openAiAnalyticsPage();
};
