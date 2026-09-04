import { dbSales, dbExpenses, dbTasks, dbCustomers, dbInventory, dbLoans } from '../db.js';
import { fetchReportData, exportReportPdf, exportReportCsv } from '../owner/report_pdf_engine.js';
import { openDownloadReportsModal } from '../owner/financial_reports.js';

let _branchReportCategory = 'financial_pl';
let _branchReportFrom = null;
let _branchReportTo = null;

export async function renderReportsModule() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    const branch = (window.state?.branches && window.state.branches.find(b => b.id === window.state.branchId)) || window.state?.branchProfile;

    if (!branch) {
        container.innerHTML = '<div class="py-20 text-center text-red-500 font-bold">Branch data not found.</div>';
        return;
    }

    branch.target = Number(branch.target) || 10000;

    const now = new Date();
    const defaultFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const defaultTo = now.toISOString().slice(0, 10);

    if (!_branchReportFrom) _branchReportFrom = defaultFrom;
    if (!_branchReportTo) _branchReportTo = defaultTo;

    // Set page container mode: fixed full-height page with sticky top-nav, scrollable body, and fixed bottom-nav
    container.classList.add('overflow-hidden', '!p-0');
    container.classList.remove('overflow-y-auto');

    // Hide AI chatbot floating widget while inside reports view
    const aiWidget = document.getElementById('ai-assistant-widget');
    if (aiWidget) aiWidget.classList.add('!hidden');

    container.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
        <!-- Fixed Top Navigation Header -->
        <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
            <div class="flex items-center gap-2.5 min-w-0">
                <button type="button" onclick="window.switchView('dashboard')" data-close-text="${window.t('back', 'Back')}" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                    <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h2 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('branch_reports', 'Branch Reports')}</h2>
                    <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">${branch.name} · Operations & P&L</p>
                </div>
            </div>

            <!-- Action Buttons (Desktop) -->
            <div class="hidden sm:flex items-center gap-2 shrink-0">
                <button type="button" onclick="window.openDownloadBranchSpecificReports()" class="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                    <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                    <span>${window.t('download_specific_reports', 'Select Reports')}</span>
                </button>
                <button type="button" onclick="window.triggerBranchPdfExport()" class="px-4 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                    <span>${window.t('download_pdf', 'Download PDF')}</span>
                </button>
                <button type="button" onclick="window.triggerBranchCsvExport()" class="px-3.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                    <i data-lucide="sheet" class="w-3.5 h-3.5"></i>
                    <span>${window.t('export_csv', 'Export CSV')}</span>
                </button>
            </div>
        </div>

        <!-- Scrollable Content Body with modal-main-content class for smooth flex scrolling -->
        <div class="modal-main-content p-3.5 sm:p-5 space-y-3.5 scroller-custom" id="branchReportsScrollBody">
            <!-- Filters Bar -->
            <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-3.5">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Report Category</label>
                        ${window.renderPremiumSelect({
                            id: 'branchReportCategoryFilter',
                            selectedValue: _branchReportCategory,
                            searchable: false,
                            classes: 'w-full text-xs sm:text-sm rounded-full',
                            onChange: 'window.updateBranchReportCategory(this.value)',
                            options: [
                                { value: 'financial_pl', label: 'Financial Performance & P&L', icon: 'trending-up' },
                                { value: 'stock_flow', label: 'Stock & Dispatches Received', icon: 'boxes' },
                                { value: 'sales_invoices', label: 'Sales & Transactions Audit', icon: 'receipt' },
                                { value: 'staff_productivity', label: 'Staff Shifts & Cashier Output', icon: 'users' },
                                { value: 'consolidated_full', label: 'Complete Branch Audit Dossier', icon: 'file-text' }
                            ]
                        })}
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Timeframe Preset</label>
                        ${window.renderPremiumSelect({
                            id: 'branchReportTimeframePreset',
                            selectedValue: 'this_month',
                            searchable: false,
                            classes: 'w-full text-xs sm:text-sm rounded-full',
                            onChange: 'window.applyBranchTimeframePreset(this.value)',
                            options: [
                                { value: 'today', label: 'Today', icon: 'clock' },
                                { value: 'this_week', label: 'This Week', icon: 'calendar' },
                                { value: 'this_month', label: 'This Month', icon: 'calendar-days' },
                                { value: 'this_year', label: 'This Year', icon: 'calendar-range' },
                                { value: 'custom', label: 'Custom Date Range', icon: 'calendar-plus' }
                            ]
                        })}
                    </div>
                        <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Date Range</label>
                        <div class="grid grid-cols-2 gap-2.5 items-center">
                            ${window.renderPremiumDatePicker({
                                id: 'branchReportFrom',
                                selectedValue: _branchReportFrom,
                                onChange: 'window.updateBranchReportDate("from", this.value)'
                            })}
                            ${window.renderPremiumDatePicker({
                                id: 'branchReportTo',
                                selectedValue: _branchReportTo,
                                onChange: 'window.updateBranchReportDate("to", this.value)'
                            })}
                        </div>
                </div>
            </div>

            <!-- First-Glance Hero Card with Branch Founding Metadata -->
            <div id="branchReportHeroSection">
                <div class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse space-y-2">
                    <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                    <div class="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3"></div>
                </div>
            </div>

            <!-- Clean KPI Cards Grid -->
            <div id="branchReportStatsSection" class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                ${[1, 2, 3, 4].map(() => `
                    <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse space-y-2">
                        <div class="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                        <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                    </div>
                `).join('')}
            </div>

            <!-- Dynamic Category Content Area -->
            <div id="branchReportContentArea" class="space-y-4">
                <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse h-56"></div>
            </div>
        </div>

        <!-- Fixed Bottom Navigation Footer with Full Pill Rounded Action Buttons -->
        <div class="modal-bottom-nav flex-none p-2.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 z-20">
            <button type="button" onclick="window.openDownloadBranchSpecificReports()" class="flex-1 min-w-0 py-2 sm:py-2.5 px-3 sm:px-4 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer truncate">
                <i data-lucide="layers" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                <span class="truncate">${window.t('download_specific_reports', 'Select Reports')}</span>
            </button>
            <button type="button" onclick="window.triggerBranchPdfExport()" class="flex-1 min-w-0 py-2 sm:py-2.5 px-3 sm:px-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer truncate">
                <i data-lucide="download" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                <span class="truncate">${window.t('download_pdf', 'Download PDF')}</span>
            </button>
            <button type="button" onclick="window.triggerBranchCsvExport()" class="py-2 sm:py-2.5 px-3 sm:px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0">
                <i data-lucide="sheet" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                <span>${window.t('export_csv', 'CSV')}</span>
            </button>
        </div>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    await refreshBranchReportsData(branch);
}

async function refreshBranchReportsData(branch) {
    const heroSection = document.getElementById('branchReportHeroSection');
    const statsSection = document.getElementById('branchReportStatsSection');
    const contentArea = document.getElementById('branchReportContentArea');

    // Display Partial Loading Skeletons
    if (heroSection) {
        heroSection.innerHTML = `
            <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse space-y-2">
                <div class="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
                <div class="h-3 bg-gray-100 dark:bg-gray-800 rounded w-2/3"></div>
            </div>`;
    }
    if (statsSection) {
        statsSection.innerHTML = [1, 2, 3, 4].map(() => `
            <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse space-y-2">
                <div class="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
        `).join('');
    }
    if (contentArea) {
        contentArea.innerHTML = `<div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse h-56"></div>`;
    }

    try {
        const [reportData, todaySalesAmount] = await Promise.all([
            fetchReportData({
                scope: 'branch',
                branchId: window.state?.branchId,
                startDate: _branchReportFrom,
                endDate: _branchReportTo
            }),
            dbSales.todayTotal(window.state?.branchId)
        ]);

        const todaySales = Number(todaySalesAmount) || 0;
        const progress = branch.target > 0 ? Math.min(Math.round((todaySales / branch.target) * 100), 100) : 0;

        // 1. Render First-Glance Hero Card
        if (heroSection) {
            heroSection.innerHTML = `
                <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2">
                            <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-gray-600">
                                <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-500"></i>
                                <span>${branch.name}</span>
                            </span>
                            <span class="text-xs text-gray-400 font-medium">Period: ${formatDate(_branchReportFrom)} to ${formatDate(_branchReportTo)}</span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            Opened on ${formatDate(branch.created_at)} (${formatAge(branch.created_at)}) · ${branch.location || branch.address || 'Standard Location'}
                        </p>
                    </div>

                    <!-- Target Progress Pill -->
                    <div class="bg-slate-50 dark:bg-gray-900/60 p-3 rounded-2xl border border-gray-100 dark:border-gray-700 min-w-[220px]">
                        <div class="flex justify-between text-xs text-gray-600 dark:text-gray-300 font-medium mb-1">
                            <span>Today's Target (${progress}%)</span>
                            <span class="font-bold text-gray-900 dark:text-white">${window.fmt.currency(todaySales)} / ${window.fmt.currency(branch.target)}</span>
                        </div>
                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                            <div class="bg-slate-700 dark:bg-slate-300 h-1.5 rounded-full transition-all duration-300" style="width: ${progress}%"></div>
                        </div>
                    </div>
                </div>`;
        }

        // 2. Render Clean KPI Cards
        if (statsSection) {
            statsSection.innerHTML = `
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Branch Revenue</p>
                    <p class="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1">${window.fmt.currency(reportData.totalSales)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.sales.length} transactions</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Branch Expenses</p>
                    <p class="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1">${window.fmt.currency(reportData.totalExpenses)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.expenses.length} records</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Net Profit / Margin</p>
                    <p class="text-base sm:text-xl font-black ${reportData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} mt-1">${window.fmt.currency(reportData.netProfit)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.profitMargin}% margin</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Stock on Hand Value</p>
                    <p class="text-base sm:text-xl font-black text-slate-700 dark:text-slate-200 mt-1">${window.fmt.currency(reportData.branchStockValuation)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.branchInventory.length} product lines</p>
                </div>`;
        }

        // 3. Render Categorized Content Tables
        if (contentArea) {
            contentArea.innerHTML = renderBranchCategoryPreviewHtml(_branchReportCategory, reportData);
            if (window.lucide) window.lucide.createIcons();
        }

    } catch (err) {
        console.error('[BranchReports] Error loading branch reports:', err);
        if (contentArea) {
            if (typeof window.renderModuleOfflineState === 'function') {
                contentArea.innerHTML = window.renderModuleOfflineState({
                    viewId: 'reports',
                    title: 'Branch Reports',
                    entityName: 'Branch Performance Reports',
                    retryAction: 'window.refreshBranchReportsView()'
                });
                if (window.lucide) window.lucide.createIcons();
            } else {
                contentArea.innerHTML = `<div class="py-12 text-center text-gray-500 font-bold">Couldn't load branch reports while offline.</div>`;
            }
        }
    }
}

function renderBranchCategoryPreviewHtml(category, data) {
    if (category === 'financial_pl' || category === 'consolidated_full') {
        const catMap = {};
        data.expenses.forEach(e => { catMap[e.category || 'General'] = (catMap[e.category || 'General'] || 0) + Number(e.amount || 0); });
        const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

        return `
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm">Revenue by Payment Channel</h3>
                    </div>
                    <div class="p-4 divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
                        ${Object.entries(data.paymentMethods).map(([pm, amt]) => {
                            const pct = data.totalSales > 0 ? Math.round((amt / data.totalSales) * 100) : 0;
                            return `
                                <div class="py-2.5 flex items-center justify-between">
                                    <span class="font-semibold text-gray-700 dark:text-gray-300 capitalize">${pm}</span>
                                    <div class="text-right">
                                        <p class="font-bold text-gray-900 dark:text-white">${window.fmt.currency(amt)}</p>
                                        <p class="text-[10px] text-gray-400 font-medium">${pct}% of revenue</p>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm">Expense Categories</h3>
                    </div>
                    <div class="p-4 divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
                        ${topCats.length === 0 ? `<div class="py-6 text-center text-gray-400">No expenses recorded</div>` :
                        topCats.map(([cat, amt]) => {
                            const pct = data.totalExpenses > 0 ? Math.round((amt / data.totalExpenses) * 100) : 0;
                            return `
                                <div class="py-2.5 flex items-center justify-between">
                                    <span class="font-semibold text-gray-700 dark:text-gray-300 capitalize">${cat}</span>
                                    <div class="text-right">
                                        <p class="font-bold text-gray-900 dark:text-white">${window.fmt.currency(amt)}</p>
                                        <p class="text-[10px] text-gray-400 font-medium">${pct}% of expenses</p>
                                    </div>
                                </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    }

    if (category === 'stock_flow') {
        return `
            <div class="space-y-4">
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm">Top 5 Best-Selling Products (This Branch)</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3">Product Name</th>
                                    <th class="px-4 py-3 text-center">SKU</th>
                                    <th class="px-4 py-3 text-center">Units Sold</th>
                                    <th class="px-4 py-3 text-right">Revenue</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${data.bestSellers.slice(0, 5).map((s, idx) => `
                                    <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40">
                                        <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${idx + 1}. ${s.name}</td>
                                        <td class="px-4 py-3 text-center text-gray-400 font-mono">${s.sku}</td>
                                        <td class="px-4 py-3 text-center font-bold text-gray-800 dark:text-gray-200">${s.quantitySold} units</td>
                                        <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(s.revenue)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm">Dispatches Received from Central Main Store</h3>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3 text-center">Date</th>
                                    <th class="px-4 py-3">Product Name</th>
                                    <th class="px-4 py-3 text-center">Qty Received</th>
                                    <th class="px-4 py-3 text-right">Retail Value</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${data.dispatchesList.length === 0 ? `<tr><td colspan="4" class="py-8 text-center text-gray-400">No central dispatches received in this period</td></tr>` :
                                data.dispatchesList.slice(0, 10).map(d => `
                                    <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40">
                                        <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">${formatDate(d.created_at)}</td>
                                        <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${d.item_name}</td>
                                        <td class="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-200">${d.quantity}</td>
                                        <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(d.total_selling || ((d.retail_price || 0) * (d.quantity || 0)))}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    if (category === 'sales_invoices') {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h3 class="font-bold text-gray-900 dark:text-white text-sm">Recent Sales Transactions (This Branch)</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            <tr>
                                <th class="px-4 py-3 text-center">Date</th>
                                <th class="px-4 py-3">Customer</th>
                                <th class="px-4 py-3 text-center">Channel</th>
                                <th class="px-4 py-3 text-center">Status</th>
                                <th class="px-4 py-3 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                            ${data.sales.slice(0, 15).map(s => `
                                <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40">
                                    <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">${formatDate(s.created_at)}</td>
                                    <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${s.customer_name || 'Walk-in Customer'}</td>
                                    <td class="px-4 py-3 text-center"><span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 uppercase">${s.payment_method || s.payment || 'Cash'}</span></td>
                                    <td class="px-4 py-3 text-center text-gray-500 capitalize">${s.status || 'Completed'}</td>
                                    <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(s.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }

    if (category === 'staff_productivity') {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60">
                    <h3 class="font-bold text-gray-900 dark:text-white text-sm">Branch Staff & Cashier Output</h3>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            <tr>
                                <th class="px-4 py-3">Staff Member</th>
                                <th class="px-4 py-3 text-center">Transactions</th>
                                <th class="px-4 py-3 text-right">Total Volume</th>
                                <th class="px-4 py-3 text-right">Average Sale</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                            ${data.staffPerformance.length === 0 ? `<tr><td colspan="4" class="py-8 text-center text-gray-400">No staff sales recorded</td></tr>` :
                            data.staffPerformance.map((st, idx) => `
                                <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40">
                                    <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${idx + 1}. ${st.name}</td>
                                    <td class="px-4 py-3 text-center font-bold text-gray-800 dark:text-gray-200">${st.transactions}</td>
                                    <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(st.totalSales)}</td>
                                    <td class="px-4 py-3 text-right font-semibold text-gray-700 dark:text-gray-300">${window.fmt.currency(st.transactions > 0 ? st.totalSales / st.transactions : 0)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }

    return '';
}

window.openDownloadBranchSpecificReports = function() {
    openDownloadReportsModal(window.state?.branchId);
};

// Global Branch Reporting Callbacks
window.updateBranchReportCategory = function(val) {
    _branchReportCategory = val;
    renderReportsModule();
};

window.updateBranchReportDate = function(field, val) {
    if (field === 'from') _branchReportFrom = val;
    if (field === 'to') _branchReportTo = val;
    renderReportsModule();
};

window.applyBranchTimeframePreset = function(preset) {
    const now = new Date();
    if (preset === 'today') {
        const todayStr = now.toISOString().slice(0, 10);
        _branchReportFrom = todayStr;
        _branchReportTo = todayStr;
    } else if (preset === 'this_week') {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        _branchReportFrom = monday.toISOString().slice(0, 10);
        _branchReportTo = now.toISOString().slice(0, 10);
    } else if (preset === 'this_month') {
        _branchReportFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        _branchReportTo = now.toISOString().slice(0, 10);
    } else if (preset === 'this_year') {
        _branchReportFrom = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
        _branchReportTo = now.toISOString().slice(0, 10);
    }

    const fromInput = document.getElementById('branchReportFrom');
    const toInput = document.getElementById('branchReportTo');
    if (fromInput) fromInput.value = _branchReportFrom;
    if (toInput) toInput.value = _branchReportTo;

    renderReportsModule();
};

window.triggerBranchPdfExport = async function() {
    try {
        window.showLoader?.('Preparing clean Branch PDF report...');
        const filename = await exportReportPdf(_branchReportCategory, {
            scope: 'branch',
            branchId: window.state?.branchId,
            startDate: _branchReportFrom,
            endDate: _branchReportTo
        });
        window.hideLoader?.();
        window.showToast?.(`Report "${filename}" exported successfully!`, 'success');
    } catch (err) {
        window.hideLoader?.();
        window.showToast?.('Failed to generate PDF: ' + err.message, 'error');
    }
};

window.triggerBranchCsvExport = async function() {
    try {
        await exportReportCsv(_branchReportCategory, {
            scope: 'branch',
            branchId: window.state?.branchId,
            startDate: _branchReportFrom,
            endDate: _branchReportTo
        });
        window.showToast?.('Branch CSV exported successfully!', 'success');
    } catch (err) {
        window.showToast?.('Branch CSV export failed: ' + err.message, 'error');
    }
};

function formatDate(dateStr) {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function formatAge(createdDateStr) {
    if (!createdDateStr) return '';
    try {
        const start = new Date(createdDateStr);
        const now = new Date();
        const diffMonths = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
        if (diffMonths < 1) {
            const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24));
            return `${diffDays} days active`;
        }
        const yrs = Math.floor(diffMonths / 12);
        const mos = diffMonths % 12;
        if (yrs > 0) {
            return `${yrs} yr${yrs > 1 ? 's' : ''} ${mos > 0 ? `${mos} mo` : ''} active`;
        }
        return `${mos} month${mos > 1 ? 's' : ''} active`;
    } catch {
        return '';
    }
}

window.renderReportsModule = renderReportsModule;
window.refreshBranchReportsView = () => renderReportsModule();

