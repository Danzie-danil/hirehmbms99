import { dbBranches, dbCapital, dbAssets, dbAssetMaintenance } from '../db.js';
import { fetchReportData, exportReportPdf, exportReportCsv, AVAILABLE_REPORT_TYPES } from './report_pdf_engine.js';
import { renderModuleOfflineState } from '../utils.js';

export function formatReportDisplayDate(dateStr) {
    if (!dateStr) return 'Select Date';
    try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
            const year = parts[0];
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            if (months[month - 1]) {
                return `${months[month - 1]} ${day}, ${year}`;
            }
        }
    } catch (e) {}
    return dateStr;
}
window.formatReportDisplayDate = formatReportDisplayDate;

export function triggerReportDatePicker(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    try {
        if (typeof input.showPicker === 'function') {
            input.showPicker();
        } else {
            input.focus();
            input.click();
        }
    } catch (e) {
        input.focus();
        input.click();
    }
}
export function toLocalIsoDateString(d) {
    if (!d) d = new Date();
    if (typeof d === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        d = new Date(d);
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
window.toLocalIsoDateString = toLocalIsoDateString;

let _reportCategory = 'sales_invoices';
let _reportBranch = 'all';
let _reportFrom = null;
let _reportTo = null;
let _reportCachedData = null;

export async function renderFinancialReports() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    const now = new Date();
    const defaultFrom = toLocalIsoDateString(new Date(now.getFullYear(), now.getMonth(), 1));
    const defaultTo = toLocalIsoDateString(now);

    if (!_reportFrom) _reportFrom = defaultFrom;
    if (!_reportTo) _reportTo = defaultTo;

    // Set page container mode: fixed full-height page with sticky top-nav, scrollable body, and fixed bottom-nav
    container.classList.add('overflow-hidden', '!p-0');
    container.classList.remove('overflow-y-auto');

    // Hide AI chatbot floating widget while inside reports view
    const aiWidget = document.getElementById('ai-assistant-widget');
    if (aiWidget) aiWidget.classList.add('!hidden');

    try {
        const ownerId = window.state?.ownerId || window.state?.currentUserUuid || (window.state?.profile && window.state.profile.id);
        const branches = await dbBranches.fetchAll(ownerId);

        container.innerHTML = `
        <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
            <!-- Fixed Top Navigation Header -->
            <div class="modal-top-nav flex-none flex items-center justify-between px-4 sm:px-6 py-3 sm:py-3.5 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 z-20">
                <div class="flex items-center gap-2.5 min-w-0">
                    <button type="button" onclick="window.switchView('overview')" data-close-text="${window.t('back', 'Back')}" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('back', 'Back')}</span>
                    </button>
                    <div class="w-9 h-9 sm:w-10 sm:h-10 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
                        <i data-lucide="file-bar-chart" class="w-5 h-5"></i>
                    </div>
                    <div class="min-w-0">
                        <h2 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">${window.t('business_reports_hub', 'Reports Hub')}</h2>
                        <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate">Multi-branch performance, P&L & analytics</p>
                    </div>
                </div>

                <!-- Header Action Buttons (Desktop) -->
                <div class="hidden sm:flex items-center gap-2 shrink-0">
                    <button type="button" onclick="window.openDownloadReportsModal()" class="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                        <i data-lucide="layers" class="w-3.5 h-3.5"></i>
                        <span>${window.t('download_specific_reports', 'Select Reports')}</span>
                    </button>
                    <button type="button" onclick="window.triggerOwnerPdfExport()" class="px-4 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                        <span>${window.t('download_pdf', 'Download PDF')}</span>
                    </button>
                    <button type="button" onclick="window.triggerOwnerCsvExport()" class="px-3.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                        <i data-lucide="sheet" class="w-3.5 h-3.5"></i>
                        <span>${window.t('export_csv', 'Export CSV')}</span>
                    </button>
                </div>
            </div>

            <!-- Scrollable Content Body with modal-main-content class for smooth scrolling -->
            <div class="modal-main-content p-3.5 sm:p-5 space-y-3.5 scroller-custom" id="ownerReportsScrollBody">
                <!-- Filter Controls Bar -->
                <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs space-y-3.5">
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 sm:gap-3.5">
                        <!-- Branch Scope Selector -->
                        <div class="lg:col-span-3">
                            <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Branch Location</label>
                            ${window.renderPremiumSelect({
                                id: 'ownerReportBranchFilter',
                                selectedValue: _reportBranch,
                                searchable: branches.length > 3,
                                classes: 'w-full text-xs font-semibold rounded-xl !h-10 !py-2 !px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-2xs',
                                onChange: 'window.updateReportFilter("branch", this.value)',
                                options: [
                                    { value: 'all', label: 'All Branches', icon: 'layers' },
                                    ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                                ]
                            })}
                        </div>

                        <!-- Report Category Selector -->
                        <div class="lg:col-span-3">
                            <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Report Type</label>
                            ${window.renderPremiumSelect({
                                id: 'ownerReportCategoryFilter',
                                selectedValue: _reportCategory,
                                searchable: false,
                                classes: 'w-full text-xs font-semibold rounded-xl !h-10 !py-2 !px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-2xs',
                                onChange: 'window.updateReportFilter("category", this.value)',
                                options: [
                                    { value: 'sales_invoices', label: 'Sales Report', icon: 'receipt' },
                                    { value: 'financial_pl', label: 'Financial Performance & P&L', icon: 'trending-up' },
                                    { value: 'expenses', label: 'Expenses Report', icon: 'wallet' },
                                    { value: 'branch_performance', label: 'Branch Operations', icon: 'store' },
                                    { value: 'stock_flow', label: 'Stock & Supply Flow', icon: 'boxes' },
                                    { value: 'staff_productivity', label: 'Staff Productivity', icon: 'users' },
                                    { value: 'consolidated_full', label: 'Full Business Dossier', icon: 'file-text' }
                                ]
                            })}
                        </div>

                        <!-- Quick Timeframe Preset -->
                        <div class="lg:col-span-2">
                            <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Timeframe Preset</label>
                            ${window.renderPremiumSelect({
                                id: 'ownerReportTimeframePreset',
                                selectedValue: 'this_month',
                                searchable: false,
                                classes: 'w-full text-xs font-semibold rounded-xl !h-10 !py-2 !px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white shadow-2xs',
                                onChange: 'window.applyTimeframePreset(this.value)',
                                options: [
                                    { value: 'today', label: 'Today', icon: 'clock' },
                                    { value: 'this_week', label: 'This Week', icon: 'calendar' },
                                    { value: 'this_month', label: 'This Month', icon: 'calendar-days' },
                                    { value: 'last_month', label: 'Last Month', icon: 'calendar-days' },
                                    { value: 'this_quarter', label: 'This Quarter', icon: 'pie-chart' },
                                    { value: 'this_year', label: 'This Year', icon: 'calendar-range' },
                                    { value: 'custom', label: 'Custom Date Range', icon: 'calendar-plus' }
                                ]
                            })}
                        </div>

                        <!-- From Date -->
                        <div class="lg:col-span-2">
                            <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">From Date</label>
                            ${window.renderPremiumDatePicker({
                                id: 'ownerReportFrom',
                                selectedValue: _reportFrom,
                                onChange: 'window.updateReportFilter("from", this.value)'
                            })}
                        </div>

                        <!-- To Date -->
                        <div class="lg:col-span-2">
                            <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">To Date</label>
                            ${window.renderPremiumDatePicker({
                                id: 'ownerReportTo',
                                selectedValue: _reportTo,
                                onChange: 'window.updateReportFilter("to", this.value)'
                            })}
                        </div>
                    </div>
                </div>


                <!-- KPI Metric Cards Container -->
                <div id="ownerReportsStatsContainer" class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5 sm:gap-4">
                    ${[1, 2, 3, 4, 5, 6, 7].map(() => `
                        <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse space-y-2">
                            <div class="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                            <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                        </div>
                    `).join('')}
                </div>

                <!-- Main Dynamic Preview Area -->
                <div id="ownerReportsPreviewArea" class="space-y-4">
                    <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse h-56"></div>
                </div>
            </div>

            <!-- Fixed Bottom Navigation Footer with Full Pill Rounded Action Buttons -->
            <div class="modal-bottom-nav flex-none p-2.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between gap-2 sm:gap-3 z-20">
                <button type="button" onclick="window.openDownloadReportsModal()" class="flex-1 min-w-0 py-2 sm:py-2.5 px-3 sm:px-4 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer truncate">
                    <i data-lucide="layers" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                    <span class="truncate">${window.t('download_specific_reports', 'Select Reports')}</span>
                </button>
                <button type="button" onclick="window.triggerOwnerPdfExport()" class="flex-1 min-w-0 py-2 sm:py-2.5 px-3 sm:px-4 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer truncate">
                    <i data-lucide="download" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                    <span class="truncate">${window.t('download_pdf', 'Download PDF')}</span>
                </button>
                <button type="button" onclick="window.triggerOwnerCsvExport()" class="py-2 sm:py-2.5 px-3 sm:px-4 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0">
                    <i data-lucide="sheet" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                    <span>${window.t('export_csv', 'CSV')}</span>
                </button>
            </div>
        </div>`;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error('[OwnerFinancialReports] Error loading reports hub:', err);
        container.innerHTML = renderModuleOfflineState({
            viewId: 'financial_reports',
            title: 'Reports & Statements',
            entityName: 'Financial & Business Reports',
            retryAction: 'window.renderFinancialReports()'
        });
        if (window.lucide) window.lucide.createIcons();
        return;
    }

    await refreshOwnerReportsView();
}

/**
 * Re-fetch data and render the active report preview with partial loading state
 */
async function refreshOwnerReportsView() {
    const statsContainer = document.getElementById('ownerReportsStatsContainer');
    const previewArea = document.getElementById('ownerReportsPreviewArea');

    // Display Partial Loading Skeletons
    if (statsContainer) {
        statsContainer.innerHTML = [1, 2, 3, 4, 5, 6, 7].map(() => `
            <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse space-y-2">
                <div class="h-2.5 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                <div class="h-5 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
            </div>
        `).join('');
    }
    if (previewArea) {
        previewArea.innerHTML = `<div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 animate-pulse h-56"></div>`;
    }

    try {
        const reportData = await fetchReportData({
            scope: 'owner',
            ownerId: window.state?.ownerId,
            branchId: _reportBranch,
            startDate: _reportFrom,
            endDate: _reportTo
        });

        _reportCachedData = reportData;

        const profile = window.state?.profile || {};
        const isSingleBranch = _reportBranch !== 'all' && reportData.selectedBranch;

        // 1. Render Clean Non-Aggressive KPI Cards
        if (statsContainer) {
            const ownerId = window.state?.ownerId || window.state?.currentUserUuid || (window.state?.profile && window.state.profile.id);
            let totalLiquidCapital = 0;
            let capitalAccountsCount = 0;
            let totalAssetValuation = 0;
            let activeAssetsCount = 0;
            let totalMaintenanceCost = 0;
            let maintenanceLogsCount = 0;
            try {
                const _withTimeout = (p, ms = 12000) => Promise.race([p, new Promise(r => setTimeout(() => r([]), ms))]);
                const [capAccounts, assetsList, maintenanceList] = await Promise.all([
                    _withTimeout(dbCapital.fetchAccounts(ownerId).catch(() => [])),
                    _withTimeout(dbAssets.fetchAll(ownerId).catch(() => [])),
                    _withTimeout(dbAssetMaintenance.fetchAll(ownerId).catch(() => []))
                ]);
                totalLiquidCapital = (capAccounts || []).reduce((sum, a) => sum + parseFloat(a.balance || 0), 0);
                capitalAccountsCount = (capAccounts || []).length;

                totalAssetValuation = assetsList.reduce((sum, a) => sum + Number(a.current_book_value || a.purchase_cost || 0), 0);
                activeAssetsCount = assetsList.filter(a => a.status === 'active').length;

                totalMaintenanceCost = maintenanceList.reduce((sum, m) => sum + Number(m.cost || 0), 0);
                maintenanceLogsCount = maintenanceList.length;
            } catch (e) {}

            const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';
            statsContainer.innerHTML = `
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">Total Gross Revenue</p>
                    <p class="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 leading-tight">${window.fmt.number(reportData.totalSales)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.sales.length} transactions</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">Operating Expenses</p>
                    <p class="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1 leading-tight">${window.fmt.number(reportData.totalExpenses)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.expenses.length} records</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">Net Profit / Margin</p>
                    <p class="text-base sm:text-xl font-black ${reportData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} mt-1 leading-tight">${window.fmt.number(reportData.netProfit)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.profitMargin}% profit margin</p>
                </div>
                <div onclick="window.switchView('capital')" data-tooltip="Total liquid business capital available across all bank accounts, mobile money tills, and cash drawers." data-tooltip-title="Total Business Capital" class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-w-0 flex flex-col justify-between h-full cursor-pointer hover:-translate-y-0.5 transition-all">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">Total Available Capital</p>
                    <p class="text-base sm:text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 leading-tight">${window.fmt.number(totalLiquidCapital)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${capitalAccountsCount} accounts & tills</p>
                </div>
                <div onclick="window.switchView('assets')" data-tooltip="Total net book value of all company machinery, vehicles, properties, and equipment." data-tooltip-title="Fixed Asset Valuation" class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-w-0 flex flex-col justify-between h-full cursor-pointer hover:-translate-y-0.5 transition-all">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">Fixed Asset Valuation</p>
                    <p class="text-base sm:text-xl font-black text-blue-600 dark:text-blue-400 mt-1 leading-tight">${window.fmt.number(totalAssetValuation)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${activeAssetsCount} active assets</p>
                </div>
                <div onclick="window.switchView('assets')" data-tooltip="Cumulative cost spent on asset repairs, servicing, and maintenance." data-tooltip-title="Maintenance Cost" class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-w-0 flex flex-col justify-between h-full cursor-pointer hover:-translate-y-0.5 transition-all">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">Asset Maintenance</p>
                    <p class="text-base sm:text-xl font-black text-rose-600 dark:text-rose-400 mt-1 leading-tight">${window.fmt.number(totalMaintenanceCost)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${maintenanceLogsCount} service logs</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">Total Stock Valuation</p>
                    <p class="text-base sm:text-xl font-black text-slate-700 dark:text-slate-200 mt-1 leading-tight">${window.fmt.number(reportData.totalInventoryValuation)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">Main Store + Branches</p>
                </div>`;
        }

        // 3. Render Categorized Interactive Tables in Preview Area
        if (previewArea) {
            previewArea.innerHTML = renderCategoryPreviewHtml(_reportCategory, reportData);
            if (window.lucide) window.lucide.createIcons();
        }

    } catch (err) {
        console.error('[OwnerFinancialReports] Error refreshing reports:', err);
        if (previewArea) {
            previewArea.innerHTML = renderModuleOfflineState({
                viewId: 'financial_reports',
                title: 'Reports & Statements',
                entityName: 'Financial & Business Reports',
                retryAction: 'window.refreshOwnerReportsView()'
            });
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

/**
 * Generate clean HTML for the selected report category preview
 */
function renderCategoryPreviewHtml(category, data) {
    if (category === 'financial_pl' || category === 'consolidated_full') {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Branch-by-Branch Financial Performance (P&L)</h3>
                        <p class="text-xs text-gray-400 font-medium mt-0.5">Breakdown of gross revenue, operational expenses, net profit, and profit share</p>
                    </div>
                </div>
                <div class="overflow-x-auto px-6 sm:px-8 py-4">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            <tr>
                                <th class="px-4 py-3.5 text-left">Branch Name</th>
                                <th class="px-4 py-3.5 text-center">Opened Date</th>
                                <th class="px-4 py-3.5 text-right">Gross Revenue</th>
                                <th class="px-4 py-3.5 text-right">Expenses</th>
                                <th class="px-4 py-3.5 text-right">Net Profit</th>
                                <th class="px-4 py-3.5 text-center">Margin</th>
                                <th class="px-4 py-3.5 text-center">Share</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                            ${data.branchPerformance.length === 0 ? `<tr><td colspan="7" class="py-8 text-center text-gray-400">No transactions recorded in this period</td></tr>` :
                            data.branchPerformance.map(b => `
                                <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                    <td class="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">${b.name}</td>
                                    <td class="px-4 py-3.5 text-center text-gray-500 dark:text-gray-400">${b.openingDateFormatted}</td>
                                    <td class="px-4 py-3.5 text-right font-semibold text-gray-800 dark:text-gray-200">${window.fmt.currency(b.revenue)}</td>
                                    <td class="px-4 py-3.5 text-right text-gray-600 dark:text-gray-400">${window.fmt.currency(b.expenses)}</td>
                                    <td class="px-4 py-3.5 text-right font-bold ${b.profit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">${window.fmt.currency(b.profit)}</td>
                                    <td class="px-4 py-3.5 text-center font-medium text-gray-700 dark:text-gray-300">${b.profitMargin}%</td>
                                    <td class="px-4 py-3.5 text-center"><span class="px-2.5 py-0.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold rounded-full text-[10px]">${b.profitContribution}%</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot class="bg-slate-50 dark:bg-gray-900/80 font-bold border-t border-gray-200 dark:border-gray-700">
                            <tr>
                                <td class="px-4 py-3.5 text-gray-900 dark:text-white uppercase tracking-wider">Consolidated Total</td>
                                <td class="px-4 py-3.5 text-center text-gray-400">—</td>
                                <td class="px-4 py-3.5 text-right text-gray-900 dark:text-white">${window.fmt.currency(data.totalSales)}</td>
                                <td class="px-4 py-3.5 text-right text-gray-700 dark:text-gray-300">${window.fmt.currency(data.totalExpenses)}</td>
                                <td class="px-4 py-3.5 text-right ${data.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">${window.fmt.currency(data.netProfit)}</td>
                                <td class="px-4 py-3.5 text-center text-gray-700 dark:text-gray-300">${data.profitMargin}%</td>
                                <td class="px-4 py-3.5 text-center text-gray-500">100.0%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>`;
    }

    if (category === 'branch_performance') {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60">
                    <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Branch Operations, Operating Age & Manager Performance</h3>
                    <p class="text-xs text-gray-400 font-medium mt-0.5">Tracking branch launch dates, manager productivity, average ticket sizes, and task execution</p>
                </div>
                <div class="overflow-x-auto px-6 sm:px-8 py-4">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            <tr>
                                <th class="px-4 py-3">Branch Location</th>
                                <th class="px-4 py-3 text-center">Operating Age</th>
                                <th class="px-4 py-3">Branch Manager</th>
                                <th class="px-4 py-3 text-center">Transactions</th>
                                <th class="px-4 py-3 text-right">Avg Ticket</th>
                                <th class="px-4 py-3 text-center">Tasks Completed</th>
                                <th class="px-4 py-3 text-right">Total Revenue</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                            ${data.branchPerformance.map(b => `
                                <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                    <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${b.name}</td>
                                    <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">${b.operatingAge || b.openingDateFormatted}</td>
                                    <td class="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">${b.managerName}</td>
                                    <td class="px-4 py-3 text-center font-bold text-gray-800 dark:text-gray-200">${b.transactionsCount}</td>
                                    <td class="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200">${window.fmt.currency(b.avgTicket)}</td>
                                    <td class="px-4 py-3 text-center"><span class="px-2.5 py-0.5 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold rounded-full text-[10px]">${b.completedTasks}/${b.totalTasks} (${b.taskCompletionRate}%)</span></td>
                                    <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(b.revenue)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>`;
    }

    if (category === 'stock_flow') {
        return `
            <div class="space-y-4">
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Top Performing Products (Volume & Revenue Drivers)</h3>
                        <p class="text-xs text-gray-400 font-medium mt-0.5">Top stock items generating the highest turnover across all branches</p>
                    </div>
                    <div class="overflow-x-auto px-6 sm:px-8 py-4">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3">Product Name</th>
                                    <th class="px-4 py-3 text-center">SKU Code</th>
                                    <th class="px-4 py-3 text-center">Units Sold</th>
                                    <th class="px-4 py-3 text-right">Revenue Generated</th>
                                    <th class="px-4 py-3 text-right">Estimated Gross Margin</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${data.bestSellers.length === 0 ? `<tr><td colspan="5" class="py-8 text-center text-gray-400">No product sales in this timeframe</td></tr>` :
                                data.bestSellers.slice(0, 10).map((s, idx) => `
                                    <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                        <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${idx + 1}. ${s.name}</td>
                                        <td class="px-4 py-3 text-center text-gray-400 font-mono">${s.sku || '—'}</td>
                                        <td class="px-4 py-3 text-center font-bold text-gray-800 dark:text-gray-200">${s.quantitySold.toLocaleString()} units</td>
                                        <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(s.revenue)}</td>
                                        <td class="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">${window.fmt.currency(s.revenue - s.cost)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Stock Dispatches (Central Warehouse → Branch Flow)</h3>
                        <p class="text-xs text-gray-400 font-medium mt-0.5">Complete record of stock movement dispatched to branch inventories</p>
                    </div>
                    <div class="overflow-x-auto px-6 sm:px-8 py-4">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3 text-center">Date</th>
                                    <th class="px-4 py-3">Product Name</th>
                                    <th class="px-4 py-3">Dispatch Route</th>
                                    <th class="px-4 py-3 text-center">Qty Dispatched</th>
                                    <th class="px-4 py-3 text-right">Retail Unit Price</th>
                                    <th class="px-4 py-3 text-right">Expected Sales Value</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${data.dispatchesList.length === 0 ? `<tr><td colspan="6" class="py-8 text-center text-gray-400">No stock dispatches recorded in this period</td></tr>` :
                                data.dispatchesList.slice(0, 15).map(d => {
                                    const destBranch = data.branchMap.get(d.destination_branch_id || d.branch_id)?.name || 'Branch';
                                    return `
                                        <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                            <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">${formatDate(d.created_at)}</td>
                                            <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${d.item_name || 'Dispatched Item'}</td>
                                            <td class="px-4 py-3 text-gray-600 dark:text-gray-300">Main Store → <span class="font-bold text-slate-800 dark:text-slate-200">${destBranch}</span></td>
                                            <td class="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-200">${Number(d.quantity || 0).toLocaleString()}</td>
                                            <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-300">${window.fmt.currency(d.retail_price || d.price)}</td>
                                            <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(d.total_selling || ((d.retail_price || 0) * (d.quantity || 0)))}</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>`;
    }

    if (category === 'sales_invoices' || category === 'sales') {
        const cogsBreakdown = data.cogsProductBreakdown || [];
        const expenseBreakdown = data.expenseCategoryBreakdown || [];
        const remainingStock = (data.physicalInv || data.branchInventory || []);

        return `
            <div class="space-y-4">
                <!-- 1. Customer Sales & Transactions Audit -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Customer Sales & Transactions Audit</h3>
                            <p class="text-xs text-gray-400 font-medium mt-0.5">Chronological record of sales transactions across selected branches</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">${data.sales.length} transactions</span>
                    </div>
                    <div class="overflow-x-auto px-6 sm:px-8 py-4">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3 text-center">Date</th>
                                    <th class="px-4 py-3">Branch Location</th>
                                    <th class="px-4 py-3">Customer</th>
                                    <th class="px-4 py-3 text-center">Method & Price Type</th>
                                    <th class="px-4 py-3 text-center">Status</th>
                                    <th class="px-4 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${data.sales.length === 0 ? `<tr><td colspan="6" class="py-8 text-center text-gray-400">No transactions recorded</td></tr>` :
                                data.sales.slice(0, 30).flatMap(s => {
                                    const lineItems = s._unpackedLineItems || (window.extractSaleLineItems ? window.extractSaleLineItems(s, data.branchInventory || [], data.centralItems || []) : [{ name: s.items || 'Product', qty: Number(s.quantity) || 1, unit_price: Number(s.amount), total_price: Number(s.amount) }]);
                                    const bName = data.branchMap.get(s.branch_id)?.name || 'Store';
                                    const customerDisplay = s.customer_name || s.customer || 'Walk-in Customer';
                                    const payMethod = s.payment_method || s.payment || 'Cash';

                                    return lineItems.map(item => {
                                        const pType = (item.price_type || s.price_type || 'retail').toLowerCase();
                                        return `
                                        <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                            <td class="px-4 py-3 text-center text-gray-500 dark:text-gray-400">${formatDate(s.created_at)}</td>
                                            <td class="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">${bName}</td>
                                            <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                                <div>${customerDisplay}</div>
                                                <div class="text-[10px] text-gray-400 font-normal">${item.name} (${item.qty}x)</div>
                                            </td>
                                            <td class="px-4 py-3 text-center">
                                                <div class="flex items-center justify-center gap-1">
                                                    <span class="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 uppercase">${payMethod}</span>
                                                    <span class="px-1.5 py-0.5 rounded text-[9px] font-black ${pType === 'wholesale' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : pType === 'custom' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'} uppercase">${pType}</span>
                                                </div>
                                            </td>
                                            <td class="px-4 py-3 text-center text-gray-500 capitalize">${s.status || 'Completed'}</td>
                                            <td class="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">${window.fmt.currency(item.total_price)}</td>
                                        </tr>
                                        `;
                                    });
                                }).join('')}
                            </tbody>
                            ${data.sales.length > 0 ? `
                            <tfoot class="bg-slate-100/90 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 font-black text-gray-900 dark:text-white">
                                <tr>
                                    <td class="px-4 py-3 text-center uppercase tracking-wider text-[11px] text-gray-500 dark:text-gray-400 font-extrabold">Total</td>
                                    <td class="px-4 py-3 font-bold text-gray-800 dark:text-gray-200">All Stores</td>
                                    <td class="px-4 py-3 font-bold text-gray-800 dark:text-gray-200">${data.sales.length} transactions</td>
                                    <td class="px-4 py-3 text-center text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-center text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">${window.fmt.currency(data.totalSales)}</td>
                                </tr>
                            </tfoot>` : ''}
                        </table>
                    </div>
                </div>

                <!-- 2. Mini Stock Analysis for Items Sold in Period -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Mini Stock Analysis (Items Sold in Period)</h3>
                            <p class="text-xs text-gray-400 font-medium mt-0.5">Sold inventory volume & sales value alongside live on-hand stock and asset valuation</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">${(data.miniStockAnalysis || []).length} products</span>
                    </div>
                    <div class="overflow-x-auto px-6 sm:px-8 py-4">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3">Product Name</th>
                                    <th class="px-4 py-3 text-center">Sold Item Count</th>
                                    <th class="px-4 py-3 text-right">Sold Stock Value</th>
                                    <th class="px-4 py-3 text-center">Current Item Count</th>
                                    <th class="px-4 py-3 text-right">Current Stock Value</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${(data.miniStockAnalysis || []).length === 0 ? `<tr><td colspan="5" class="py-6 text-center text-gray-400">No stock products sold in this period</td></tr>` :
                                (data.miniStockAnalysis || []).map(m => `
                                    <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                        <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                            <div>${m.name}</div>
                                            ${m.sku && m.sku !== '—' ? `<span class="text-[10px] text-gray-400 font-mono">SKU: ${m.sku}</span>` : ''}
                                        </td>
                                        <td class="px-4 py-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                                            ${m.soldCount.toLocaleString()} units
                                        </td>
                                        <td class="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                                            ${window.fmt.currency(m.soldStockValue)}
                                        </td>
                                        <td class="px-4 py-3 text-center font-bold ${m.isService ? 'text-gray-400' : (m.currentCount <= 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300')}">
                                            ${m.isService ? '<span class="text-[10px] text-gray-400 font-medium">— (Service)</span>' : `${m.currentCount.toLocaleString()} units`}
                                        </td>
                                        <td class="px-4 py-3 text-right font-bold ${m.isService ? 'text-gray-400' : 'text-emerald-600 dark:text-emerald-400'}">
                                            ${m.isService ? '—' : window.fmt.currency(m.currentStockValue)}
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            ${(data.miniStockAnalysis || []).length > 0 ? `
                            <tfoot class="bg-slate-100/90 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 font-black text-gray-900 dark:text-white">
                                <tr>
                                    <td class="px-4 py-3 uppercase tracking-wider text-[11px] text-gray-500 dark:text-gray-400 font-extrabold">Total</td>
                                    <td class="px-4 py-3 text-center font-black text-indigo-600 dark:text-indigo-400">${(data.miniStockTotals?.totalSoldCount || 0).toLocaleString()} units</td>
                                    <td class="px-4 py-3 text-right font-black text-gray-900 dark:text-white">${window.fmt.currency(data.miniStockTotals?.totalSoldStockValue || 0)}</td>
                                    <td class="px-4 py-3 text-center font-black text-slate-800 dark:text-slate-200">${(data.miniStockTotals?.totalCurrentCount || 0).toLocaleString()} units</td>
                                    <td class="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">${window.fmt.currency(data.miniStockTotals?.totalCurrentStockValue || 0)}</td>
                                </tr>
                            </tfoot>` : ''}
                        </table>
                    </div>
                </div>

                <!-- 3. Cost of Goods Sold (COGS) & Stock Usage Analysis -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Cost of Goods Sold (COGS) & Stock Usage Analysis</h3>
                            <p class="text-xs text-gray-400 font-medium mt-0.5">Inventory cost depletion, product sales volumes, and gross profit margins</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Total COGS: ${window.fmt.currency(data.totalCogs || 0)}</span>
                    </div>
                    <div class="overflow-x-auto px-6 sm:px-8 py-4">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3">Product / Stock Item</th>
                                    <th class="px-4 py-3 text-center">SKU</th>
                                    <th class="px-4 py-3 text-center">Units Sold</th>
                                    <th class="px-4 py-3 text-right">Unit Cost</th>
                                    <th class="px-4 py-3 text-right">Total COGS</th>
                                    <th class="px-4 py-3 text-right">Sales Revenue</th>
                                    <th class="px-4 py-3 text-right">Gross Margin</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${cogsBreakdown.length === 0 ? `<tr><td colspan="7" class="py-6 text-center text-gray-400">No stock products sold in this period</td></tr>` :
                                cogsBreakdown.slice(0, 20).map(c => `
                                    <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                        <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${c.name}</td>
                                        <td class="px-4 py-3 text-center font-mono text-[10px] text-gray-400">${c.sku || '—'}</td>
                                        <td class="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">${c.unitsSold.toLocaleString()}</td>
                                        <td class="px-4 py-3 text-right text-gray-600 dark:text-gray-400">${window.fmt.currency(c.costPrice || 0)}</td>
                                        <td class="px-4 py-3 text-right font-bold text-amber-600 dark:text-amber-400">${window.fmt.currency(c.totalCogs)}</td>
                                        <td class="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">${window.fmt.currency(c.revenue)}</td>
                                        <td class="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400">${window.fmt.currency(c.grossProfit)} <span class="text-[10px] text-gray-400 font-normal">(${c.marginPct}%)</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            ${cogsBreakdown.length > 0 ? `
                            <tfoot class="bg-slate-100/90 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 font-black text-gray-900 dark:text-white">
                                <tr>
                                    <td class="px-4 py-3 uppercase tracking-wider text-[11px] text-gray-500 dark:text-gray-400 font-extrabold">Total COGS / Used Stock</td>
                                    <td class="px-4 py-3 text-center text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-center font-black text-indigo-600 dark:text-indigo-400">${(data.totalUnitsSold || 0).toLocaleString()}</td>
                                    <td class="px-4 py-3 text-right text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-right font-black text-amber-600 dark:text-amber-400">${window.fmt.currency(data.totalCogs || 0)}</td>
                                    <td class="px-4 py-3 text-right font-black text-gray-900 dark:text-white">${window.fmt.currency(data.totalSales)}</td>
                                    <td class="px-4 py-3 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">${window.fmt.currency(data.grossProfit)}</td>
                                </tr>
                            </tfoot>` : ''}
                        </table>
                    </div>
                </div>

                <!-- 4. Operational Expense Breakdown -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Operational Expenses Breakdown</h3>
                            <p class="text-xs text-gray-400 font-medium mt-0.5">Spend allocation across categories for this timeframe</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">${window.fmt.currency(data.totalExpenses)} Total</span>
                    </div>
                    <div class="p-6 divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
                        ${expenseBreakdown.length === 0 ? `<div class="py-6 text-center text-gray-400">No operational expenses recorded</div>` :
                        expenseBreakdown.map(e => `
                            <div class="py-2.5 flex items-center justify-between">
                                <div>
                                    <span class="font-semibold text-gray-800 dark:text-gray-200 capitalize">${e.category}</span>
                                    <span class="text-[10px] text-gray-400 block">${e.count} vouchers</span>
                                </div>
                                <div class="text-right">
                                    <p class="font-bold text-gray-900 dark:text-white">${window.fmt.currency(e.totalSpent)}</p>
                                    <p class="text-[10px] text-gray-400 font-medium">${e.sharePct}% of expenses</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- 4. Revenue by Payment Channel -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Revenue by Payment Channel</h3>
                        <span class="text-xs text-gray-400 font-medium">Total: ${window.fmt.currency(data.totalSales)}</span>
                    </div>
                    <div class="p-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        ${Object.entries(data.paymentMethods).map(([pm, amt]) => {
                            const pct = data.totalSales > 0 ? Math.round((amt / data.totalSales) * 100) : 0;
                            return `
                                <div class="p-3 bg-slate-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                    <div>
                                        <span class="font-bold text-gray-800 dark:text-gray-200 uppercase">${pm}</span>
                                        <p class="text-[10px] text-gray-400 font-medium">${pct}% of revenue</p>
                                    </div>
                                    <p class="font-black text-gray-900 dark:text-white">${window.fmt.currency(amt)}</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>`;
    }

    if (category === 'staff_productivity') {
        return `
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                <div class="px-6 sm:px-8 py-5 border-b border-gray-100 dark:border-gray-700/60">
                    <h3 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Staff Productivity & Cashier Sales Performance</h3>
                    <p class="text-xs text-gray-400 font-medium mt-0.5">Tracking sales volume and transaction count handled per staff member</p>
                </div>
                <div class="overflow-x-auto px-6 sm:px-8 py-4">
                    <table class="w-full text-xs text-left">
                        <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                            <tr>
                                <th class="px-4 py-3">Staff / Cashier Name</th>
                                <th class="px-4 py-3">Assigned Branch</th>
                                <th class="px-4 py-3 text-center">Transactions</th>
                                <th class="px-4 py-3 text-right">Total Sales Handled</th>
                                <th class="px-4 py-3 text-right">Average Transaction</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                            ${data.staffPerformance.length === 0 ? `<tr><td colspan="5" class="py-8 text-center text-gray-400">No staff sales records found</td></tr>` :
                            data.staffPerformance.map((st, idx) => `
                                <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                    <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">${idx + 1}. ${st.name}</td>
                                    <td class="px-4 py-3 text-gray-600 dark:text-gray-400">${st.branchName}</td>
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

/**
 * Universal Modal: Download Specific Reports Catalog
 */
export async function openDownloadReportsModal(customBranchId = null) {
    const targetBranch = customBranchId || _reportBranch;
    const isBranchRole = window.state?.role === 'branch' || !!customBranchId;
    const branches = await dbBranches.fetchAll(window.state?.ownerId || window.state?.branchProfile?.owner_id);
    const branchName = targetBranch === 'all' 
        ? 'All Branches (Consolidated)' 
        : (branches.find(b => b.id === targetBranch)?.name || window.state?.branchProfile?.name || 'Selected Branch');
    const specificReportsList = AVAILABLE_REPORT_TYPES.filter(r => r.id !== 'consolidated_full');

    const fromDate = isBranchRole ? (document.getElementById('branchReportFrom')?.value || new Date().toISOString().slice(0, 10)) : _reportFrom;
    const toDate = isBranchRole ? (document.getElementById('branchReportTo')?.value || new Date().toISOString().slice(0, 10)) : _reportTo;

    const modalHtml = `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <!-- Compact Thin Top Navigation Header -->
            <div class="modal-top-nav flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                <div class="flex items-center gap-2.5 min-w-0">
                    <button type="button" onclick="window.closeModal()" data-close-text="${window.t('exit', 'Exit')}" class="inline-flex items-center gap-1 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        <span>${window.t('exit', 'Exit')}</span>
                    </button>
                    <div class="min-w-0">
                        <h3 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">Download Specific Reports</h3>
                    </div>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button type="button" onclick="window.closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>
            </div>

            <!-- Ultra-Thin Scope & Date Summary Bar -->
            <div class="bg-white dark:bg-gray-800 px-4 py-2 border-b border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between gap-2 text-xs flex-none">
                <div class="flex items-center gap-2 min-w-0 overflow-hidden">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 text-[11px] truncate shrink-0">
                        <i data-lucide="building-2" class="w-3 h-3 text-slate-500"></i>
                        <span>${branchName}</span>
                    </span>
                    <span class="inline-flex items-center gap-1 text-gray-500 dark:text-gray-400 text-[11px] font-medium whitespace-nowrap truncate">
                        <i data-lucide="calendar" class="w-3 h-3 text-gray-400"></i>
                        <span>${formatDate(fromDate)} – ${formatDate(toDate)}</span>
                    </span>
                </div>
                <span class="text-[10px] text-gray-400 font-bold uppercase tracking-wider shrink-0">${specificReportsList.length} Report Types Available</span>
            </div>

            <!-- Scrollable Report Cards Grid -->
            <div class="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-5 max-w-5xl mx-auto w-full space-y-3 scroller-custom">
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3.5">
                    ${specificReportsList.map(rpt => `
                        <div class="bg-white dark:bg-gray-800 p-4 sm:p-4.5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between space-y-3">
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between gap-2">
                                    <div class="flex items-center gap-2 min-w-0">
                                        <div class="w-8 h-8 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                                            <i data-lucide="${rpt.icon}" class="w-4 h-4"></i>
                                        </div>
                                        <h4 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm leading-snug truncate">${rpt.name}</h4>
                                    </div>
                                    <span class="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-gray-700/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-gray-600 shrink-0">${rpt.badge}</span>
                                </div>
                                <p class="text-[11px] text-gray-500 dark:text-gray-400 font-medium leading-normal pl-10">${rpt.description}</p>
                            </div>

                            <div class="pt-2.5 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-end gap-2">
                                <button type="button" onclick="window.downloadSpecificReportCsv('${rpt.id}', '${targetBranch}')" class="px-3.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer">
                                    <i data-lucide="sheet" class="w-3.5 h-3.5"></i>
                                    <span>CSV</span>
                                </button>
                                <button type="button" onclick="window.downloadSpecificReport('${rpt.id}', '${targetBranch}')" class="px-4 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 text-white rounded-full text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                    <span>Download PDF</span>
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>

            <!-- Compact Modal Bottom Footer with Full Pill Rounded Button -->
            <div class="modal-bottom-nav flex-none px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-2 z-20">
                <button type="button" onclick="window.closeModal()" class="px-8 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-full text-xs transition-all cursor-pointer">
                    Close
                </button>
            </div>
        </div>
    `;

    window.openModal(modalHtml);
    if (window.lucide) window.lucide.createIcons();
}

window.openDownloadReportsModal = openDownloadReportsModal;

window.downloadSpecificReport = async function(reportId, branchId) {
    try {
        const isBranchRole = window.state?.role === 'branch' || (branchId && branchId !== 'all');
        const startDate = isBranchRole ? (document.getElementById('branchReportFrom')?.value || new Date().toISOString().slice(0, 10)) : _reportFrom;
        const endDate = isBranchRole ? (document.getElementById('branchReportTo')?.value || new Date().toISOString().slice(0, 10)) : _reportTo;
        const managerNotes = document.getElementById('branchReportManagerNotes')?.value || '';

        window.showLoader?.('Generating ' + reportId + ' PDF...');
        const filename = await exportReportPdf(reportId, {
            scope: isBranchRole ? 'branch' : 'owner',
            ownerId: window.state?.ownerId || window.state?.branchProfile?.owner_id,
            branchId: branchId || _reportBranch,
            startDate: startDate,
            endDate: endDate,
            managerNotes: managerNotes
        });
        window.hideLoader?.();
        window.showToast?.(`Report "${filename}" exported successfully!`, 'success');
    } catch (err) {
        window.hideLoader?.();
        window.showToast?.('Export failed: ' + err.message, 'error');
    }
};

window.downloadSpecificReportCsv = async function(reportId, branchId) {
    try {
        const isBranchRole = window.state?.role === 'branch' || (branchId && branchId !== 'all');
        const startDate = isBranchRole ? (document.getElementById('branchReportFrom')?.value || new Date().toISOString().slice(0, 10)) : _reportFrom;
        const endDate = isBranchRole ? (document.getElementById('branchReportTo')?.value || new Date().toISOString().slice(0, 10)) : _reportTo;
        const managerNotes = document.getElementById('branchReportManagerNotes')?.value || '';

        await exportReportCsv(reportId, {
            scope: isBranchRole ? 'branch' : 'owner',
            ownerId: window.state?.ownerId || window.state?.branchProfile?.owner_id,
            branchId: branchId || _reportBranch,
            startDate: startDate,
            endDate: endDate,
            managerNotes: managerNotes
        });
        window.showToast?.('CSV downloaded successfully!', 'success');
    } catch (err) {
        window.showToast?.('CSV export failed: ' + err.message, 'error');
    }
};

// Global Filter Callbacks (With partial loading states)
window.updateReportFilter = function(field, value) {
    if (field === 'branch') _reportBranch = value;
    if (field === 'category') _reportCategory = value;
    if (field === 'from') _reportFrom = value;
    if (field === 'to') _reportTo = value;
    refreshOwnerReportsView();
};

window.applyTimeframePreset = function(preset) {
    const now = new Date();
    if (preset === 'today') {
        const todayStr = toLocalIsoDateString(now);
        _reportFrom = todayStr;
        _reportTo = todayStr;
    } else if (preset === 'this_week') {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.getFullYear(), now.getMonth(), diff);
        _reportFrom = toLocalIsoDateString(monday);
        _reportTo = toLocalIsoDateString(now);
    } else if (preset === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        _reportFrom = toLocalIsoDateString(firstDay);
        _reportTo = toLocalIsoDateString(now);
    } else if (preset === 'last_month') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        _reportFrom = toLocalIsoDateString(firstDayLastMonth);
        _reportTo = toLocalIsoDateString(lastDayLastMonth);
    } else if (preset === 'this_quarter') {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        const firstDayQuarter = new Date(now.getFullYear(), quarterMonth, 1);
        _reportFrom = toLocalIsoDateString(firstDayQuarter);
        _reportTo = toLocalIsoDateString(now);
    } else if (preset === 'this_year') {
        const firstDayYear = new Date(now.getFullYear(), 0, 1);
        _reportFrom = toLocalIsoDateString(firstDayYear);
        _reportTo = toLocalIsoDateString(now);
    }

    const fromInput = document.getElementById('ownerReportFrom');
    const toInput = document.getElementById('ownerReportTo');
    if (fromInput) fromInput.value = _reportFrom;
    if (toInput) toInput.value = _reportTo;

    refreshOwnerReportsView();
};

window.triggerOwnerPdfExport = async function() {
    try {
        window.showLoader?.('Preparing clean PDF report...');
        const filename = await exportReportPdf(_reportCategory, {
            scope: 'owner',
            ownerId: window.state?.ownerId,
            branchId: _reportBranch,
            startDate: _reportFrom,
            endDate: _reportTo
        });
        window.hideLoader?.();
        window.showToast?.(`Report "${filename}" generated successfully!`, 'success');
    } catch (err) {
        window.hideLoader?.();
        window.showToast?.('Failed to generate PDF: ' + err.message, 'error');
    }
};

window.triggerOwnerCsvExport = async function() {
    try {
        await exportReportCsv(_reportCategory, {
            scope: 'owner',
            ownerId: window.state?.ownerId,
            branchId: _reportBranch,
            startDate: _reportFrom,
            endDate: _reportTo
        });
        window.showToast?.('CSV exported successfully!', 'success');
    } catch (err) {
        window.showToast?.('CSV export failed: ' + err.message, 'error');
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
