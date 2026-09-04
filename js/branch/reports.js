import { dbSales, dbExpenses, dbTasks, dbCustomers, dbInventory, dbLoans } from '../db.js';
import { fetchReportData, exportReportPdf, exportReportCsv } from '../owner/report_pdf_engine.js';
import { openDownloadReportsModal } from '../owner/financial_reports.js';

function toLocalIsoDateString(d) {
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

let _branchReportCategory = 'sales_invoices';
let _branchReportPreset = 'today';
let _branchReportFrom = null;
let _branchReportTo = null;
let _branchReportNotes = '';

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
    const todayStr = toLocalIsoDateString(now);

    if (!_branchReportFrom) _branchReportFrom = todayStr;
    if (!_branchReportTo) _branchReportTo = todayStr;

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
                <button type="button" onclick="window.downloadBranchDailyReport()" class="px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                    <i data-lucide="calendar-check" class="w-3.5 h-3.5"></i>
                    <span>Daily Sales Report</span>
                </button>
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
            <!-- Filters Bar (Equally Divided 4-Column Responsive Grid) -->
            <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs">
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5 items-end">
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Report Category</label>
                        ${window.renderPremiumSelect({
                            id: 'branchReportCategoryFilter',
                            selectedValue: _branchReportCategory,
                            searchable: false,
                            classes: 'w-full text-xs sm:text-sm rounded-full',
                            onChange: 'window.updateBranchReportCategory(this.value)',
                            options: [
                                { value: 'sales_invoices', label: 'Sales Report', icon: 'receipt' },
                                { value: 'financial_pl', label: 'Financial Performance & P&L', icon: 'trending-up' },
                                { value: 'expenses', label: 'Expenses Report', icon: 'wallet' },
                                { value: 'low_stock', label: 'Low Stock & Depletion Report', icon: 'alert-triangle' },
                                { value: 'stock_flow', label: 'Stock & Dispatches Received', icon: 'boxes' },
                                { value: 'staff_productivity', label: 'Staff Shifts & Cashier Output', icon: 'users' },
                                { value: 'consolidated_full', label: 'Complete Branch Audit Dossier', icon: 'file-text' }
                            ]
                        })}
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Timeframe Preset</label>
                        ${window.renderPremiumSelect({
                            id: 'branchReportTimeframePreset',
                            selectedValue: _branchReportPreset || 'today',
                            searchable: false,
                            classes: 'w-full text-xs sm:text-sm rounded-full',
                            onChange: 'window.applyBranchTimeframePreset(this.value)',
                            options: [
                                { value: 'today', label: 'Daily (Today)', icon: 'clock' },
                                { value: 'this_week', label: 'Weekly (This Week)', icon: 'calendar' },
                                { value: 'this_month', label: 'Monthly (This Month)', icon: 'calendar-days' },
                                { value: 'last_month', label: 'Last Month', icon: 'calendar-days' },
                                { value: 'this_year', label: 'This Year', icon: 'calendar-range' },
                                { value: 'custom', label: 'Custom Date Range', icon: 'calendar-plus' }
                            ]
                        })}
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">From Date</label>
                        ${window.renderPremiumDatePicker({
                            id: 'branchReportFrom',
                            selectedValue: _branchReportFrom,
                            classes: 'w-full text-xs sm:text-sm rounded-full',
                            onChange: 'window.updateBranchReportDate("from", this.value)'
                        })}
                    </div>
                    <div>
                        <label class="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">To Date</label>
                        ${window.renderPremiumDatePicker({
                            id: 'branchReportTo',
                            selectedValue: _branchReportTo,
                            classes: 'w-full text-xs sm:text-sm rounded-full',
                            onChange: 'window.updateBranchReportDate("to", this.value)'
                        })}
                    </div>
                </div>
            </div>

            <!-- Branch Manager Remarks & Daily Description Input -->
            <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs space-y-2">
                <div class="flex items-center justify-between">
                    <label class="flex items-center gap-1.5 text-xs font-bold text-gray-800 dark:text-gray-200">
                        <i data-lucide="file-edit" class="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400"></i>
                        <span>Manager Remarks & Report Description</span>
                    </label>
                    <span class="text-[10px] text-gray-400 font-medium">Included in exported PDF report summary</span>
                </div>
                <textarea id="branchReportManagerNotes" rows="2" 
                    oninput="window.updateBranchReportNotes(this.value)"
                    placeholder="Enter daily sales summary, cash reconciliation notes, customer traffic remarks, or shift highlights..."
                    class="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all resize-none shadow-2xs">${_branchReportNotes || ''}</textarea>
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
            <button type="button" onclick="window.downloadBranchDailyReport()" class="py-2 sm:py-2.5 px-3 sm:px-4 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 rounded-full text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer truncate">
                <i data-lucide="calendar-check" class="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0"></i>
                <span class="truncate">Daily Sales</span>
            </button>
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
            const isDaily = _branchReportFrom === _branchReportTo;
            const periodLabel = isDaily ? `Daily: ${formatDate(_branchReportFrom)}` : `Period: ${formatDate(_branchReportFrom)} to ${formatDate(_branchReportTo)}`;

            heroSection.innerHTML = `
                <div class="bg-white dark:bg-gray-800 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-gray-600">
                                <i data-lucide="building-2" class="w-3.5 h-3.5 text-slate-500"></i>
                                <span>${branch.name}</span>
                            </span>
                            <span class="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">${periodLabel}</span>
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
            const currencySymbol = window.fmt ? window.fmt.getSymbol() : 'TSh';
            statsSection.innerHTML = `
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Gross Revenue</p>
                    <p class="text-base sm:text-xl font-black text-gray-900 dark:text-white mt-1" title="${window.fmt.currency(reportData.totalSales)}">${window.fmt.number(reportData.totalSales)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.sales.length} transactions</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Cost of Goods (COGS)</p>
                    <p class="text-base sm:text-xl font-black text-amber-600 dark:text-amber-400 mt-1" title="${window.fmt.currency(reportData.totalCogs || 0)}">${window.fmt.number(reportData.totalCogs || 0)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${(reportData.totalUnitsSold || 0).toLocaleString()} units used / sold</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Total Expenses</p>
                    <p class="text-base sm:text-xl font-black text-red-600 dark:text-red-400 mt-1" title="${window.fmt.currency(reportData.totalExpenses)}">${window.fmt.number(reportData.totalExpenses)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.expenses.length} records</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/60 shadow-xs flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                    <p class="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Net Operating Margin</p>
                    <p class="text-base sm:text-xl font-black ${reportData.netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'} mt-1" title="${window.fmt.currency(reportData.netProfit)}">${window.fmt.number(reportData.netProfit)}</p>
                    <p class="text-[10px] text-gray-400 font-medium mt-0.5">${reportData.profitMargin}% margin</p>
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
    if (category === 'low_stock') {
        const items = data.lowStockItems || [];
        return `
            <div class="space-y-4">
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <div class="flex items-center gap-2">
                                <h3 class="font-bold text-gray-900 dark:text-white text-sm">Low Stock & Reorder Deficit Audit</h3>
                                <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800">${items.length} Depleted Items</span>
                            </div>
                            <p class="text-[11px] text-gray-400 font-medium mt-0.5">Physical items below minimum safety threshold with shortage deficits and required restocking capital</p>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="window.openLowStockReportModal()" class="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                                <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
                                <span>Dispatch & Share</span>
                            </button>
                        </div>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3">Product Name</th>
                                    <th class="px-4 py-3">Category</th>
                                    <th class="px-4 py-3 text-center">On-Hand</th>
                                    <th class="px-4 py-3 text-center">Min Level</th>
                                    <th class="px-4 py-3 text-center">Deficit to Order</th>
                                    <th class="px-4 py-3 text-right">Cost / Unit</th>
                                    <th class="px-4 py-3 text-right">Est. Restock Cost</th>
                                    <th class="px-4 py-3 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${items.length === 0 ? `<tr><td colspan="8" class="py-8 text-center text-gray-400 font-medium">All catalog inventory items are healthy and above minimum safety thresholds.</td></tr>` :
                                items.map(it => `
                                    <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                        <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                            <div>${it.name || 'Unnamed Product'}</div>
                                            <div class="text-[10px] text-gray-400 font-mono">${it.sku || 'No SKU'}</div>
                                        </td>
                                        <td class="px-4 py-3 text-gray-600 dark:text-gray-300 font-medium">
                                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200">${it.category || 'General'}</span>
                                        </td>
                                        <td class="px-4 py-3 text-center font-black ${it.currentQty <= 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}">
                                            ${it.currentQty.toLocaleString()}
                                        </td>
                                        <td class="px-4 py-3 text-center font-bold text-gray-500 dark:text-gray-400">
                                            ${it.threshold.toLocaleString()}
                                        </td>
                                        <td class="px-4 py-3 text-center font-black text-red-600 dark:text-red-400">
                                            +${it.deficit.toLocaleString()}
                                        </td>
                                        <td class="px-4 py-3 text-right font-medium text-gray-700 dark:text-gray-300">
                                            ${window.fmt.currency(it.costPrice)}
                                        </td>
                                        <td class="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                                            ${window.fmt.currency(it.estRestockCost)}
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${it.currentQty <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}">
                                                ${it.currentQty <= 0 ? 'Out of Stock' : 'Low Stock'}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                            ${items.length > 0 ? `
                            <tfoot class="bg-slate-100/90 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 font-black text-gray-900 dark:text-white">
                                <tr>
                                    <td class="px-4 py-3 uppercase tracking-wider text-[11px] text-gray-500 dark:text-gray-400 font-extrabold">Total Deficit</td>
                                    <td class="px-4 py-3 text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-center text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-center text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-center font-black text-red-600 dark:text-red-400">+${(data.totalDeficitUnits || 0).toLocaleString()}</td>
                                    <td class="px-4 py-3 text-right text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">${window.fmt.currency(data.totalRestockCost || 0)}</td>
                                    <td class="px-4 py-3 text-center text-gray-400 font-normal">—</td>
                                </tr>
                            </tfoot>` : ''}
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
                <!-- 1. Itemized Sales Audit Log -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Customer Sales & Transactions Audit</h3>
                            <p class="text-[11px] text-gray-400 font-medium">Itemized sales transactions, products sold, in-stock remaining, and revenue collected</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">${data.sales.length} transactions</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3 text-center">Date & Time</th>
                                    <th class="px-4 py-3">Customer</th>
                                    <th class="px-4 py-3">Items / Products Sold</th>
                                    <th class="px-4 py-3 text-center">In stock</th>
                                    <th class="px-4 py-3 text-center">Qty</th>
                                    <th class="px-4 py-3 text-right">Unit Price</th>
                                    <th class="px-4 py-3 text-right">Total Selling Price</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${data.sales.length === 0 ? `<tr><td colspan="7" class="py-8 text-center text-gray-400">No transactions recorded in this timeframe</td></tr>` :
                                data.sales.flatMap(s => {
                                    const lineItems = s._unpackedLineItems || (window.extractSaleLineItems ? window.extractSaleLineItems(s, data.branchInventory || []) : [{ name: s.items || 'Product', qty: Number(s.quantity) || 1, unit_price: Number(s.amount), total_price: Number(s.amount), inStock: s._inStockText || '—' }]);
                                    const timeStr = s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                                    const receiptStr = s.receipt_number || s.invoice_number ? `#${s.receipt_number || s.invoice_number}` : '';
                                    const customerDisplay = s.customer_name || s.customer || 'Walk-in Customer';
                                    const payMethod = s.payment_method || s.payment || 'Cash';

                                    return lineItems.map(item => {
                                        const pType = (item.price_type || s.price_type || 'retail').toLowerCase();
                                        const inStockText = item.isService ? '—' : (typeof item.inStock === 'number' ? `${item.inStock} units` : (item.inStock || s._inStockText || '—'));

                                        return `
                                        <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                            <td class="px-4 py-3 text-center whitespace-nowrap text-gray-500 dark:text-gray-400">
                                                <div class="font-bold text-gray-900 dark:text-white">${formatDate(s.created_at)}</div>
                                                <div class="text-[10px] text-gray-400">${timeStr} ${receiptStr}</div>
                                            </td>
                                            <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white">
                                                <div>${customerDisplay}</div>
                                                <div class="text-[10px] text-gray-400 capitalize">${payMethod}</div>
                                            </td>
                                            <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                                <div class="font-semibold text-gray-900 dark:text-white">${item.name}</div>
                                                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black ${pType === 'wholesale' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : pType === 'custom' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'} uppercase tracking-wider">${pType === 'wholesale' ? 'Wholesale' : pType === 'custom' ? 'Custom' : 'Retail'}</span>
                                            </td>
                                            <td class="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                                                <span class="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-gray-700/80 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-gray-600/80">${inStockText}</span>
                                            </td>
                                            <td class="px-4 py-3 text-center font-bold text-slate-700 dark:text-slate-300">
                                                ${item.qty.toLocaleString()}
                                            </td>
                                            <td class="px-4 py-3 text-right">
                                                <div class="font-bold text-gray-900 dark:text-white">${window.fmt.currency(item.unit_price)}</div>
                                                <span class="text-[10px] text-gray-400 font-bold uppercase">[${pType}]</span>
                                            </td>
                                            <td class="px-4 py-3 text-right font-black text-gray-900 dark:text-white">
                                                ${window.fmt.currency(item.total_price)}
                                            </td>
                                        </tr>
                                    `;
                                    });
                                }).join('')}
                            </tbody>
                            ${data.sales.length > 0 ? `
                            <tfoot class="bg-slate-100/90 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 font-black text-gray-900 dark:text-white">
                                <tr>
                                    <td class="px-4 py-3 text-center uppercase tracking-wider text-[11px] text-gray-500 dark:text-gray-400 font-extrabold">Total</td>
                                    <td class="px-4 py-3 font-bold text-gray-800 dark:text-gray-200">${data.sales.length} transactions</td>
                                    <td class="px-4 py-3 text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-center text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-center font-black text-indigo-600 dark:text-indigo-400">${data.sales.reduce((acc, s) => {
                                        let items = Array.isArray(s.items) ? s.items : [];
                                        if (!items.length && typeof s.items === 'string') {
                                            try { items = JSON.parse(s.items); } catch {}
                                        }
                                        const q = Array.isArray(items) && items.length ? items.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0) : (Number(s.quantity) || 1);
                                        return acc + q;
                                    }, 0)}</td>
                                    <td class="px-4 py-3 text-right text-gray-400 font-normal">—</td>
                                    <td class="px-4 py-3 text-right text-sm font-black text-emerald-600 dark:text-emerald-400">${window.fmt.currency(data.totalSales)}</td>
                                </tr>
                            </tfoot>` : ''}
                        </table>
                    </div>
                </div>

                <!-- 2. Mini Stock Analysis for Items Sold in Period -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Mini Stock Analysis (Items Sold in Period)</h3>
                            <p class="text-[11px] text-gray-400 font-medium">Sold inventory volume & sales value alongside live on-hand stock and asset valuation</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">${(data.miniStockAnalysis || []).length} products</span>
                    </div>
                    <div class="overflow-x-auto">
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

                <!-- 2. Cost of Goods Sold (COGS) & Used Stock Breakdown -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Cost of Goods Sold (COGS) & Stock Usage Analysis</h3>
                            <p class="text-[11px] text-gray-400 font-medium">Breakdown of inventory unit costs, stock depletion value, and gross margin per product</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">Total COGS: ${window.fmt.currency(data.totalCogs || 0)}</span>
                    </div>
                    <div class="overflow-x-auto">
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
                                cogsBreakdown.map(c => `
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
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Operational Expenses Breakdown</h3>
                            <p class="text-[11px] text-gray-400 font-medium">Spend allocation across categories for this timeframe</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">${window.fmt.currency(data.totalExpenses)} Total</span>
                    </div>
                    <div class="p-4 divide-y divide-gray-100 dark:divide-gray-700/60 text-xs">
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
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <h3 class="font-bold text-gray-900 dark:text-white text-sm">Revenue by Payment Channel</h3>
                        <span class="text-xs text-gray-400 font-medium">Total: ${window.fmt.currency(data.totalSales)}</span>
                    </div>
                    <div class="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
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

    if (category === 'expenses') {
        const catMap = {};
        data.expenses.forEach(e => { catMap[e.category || 'General'] = (catMap[e.category || 'General'] || 0) + Number(e.amount || 0); });
        const topCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);

        return `
            <div class="space-y-4">
                <!-- Expense Categories Summary Cards -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Expenses by Category</h3>
                            <p class="text-[11px] text-gray-400 font-medium">Breakdown of operational spend across expense buckets</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">${window.fmt.currency(data.totalExpenses)} Total</span>
                    </div>
                    <div class="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                        ${topCats.length === 0 ? `<div class="col-span-full py-4 text-center text-gray-400">No expenses recorded in this timeframe</div>` :
                        topCats.map(([cat, amt]) => {
                            const pct = data.totalExpenses > 0 ? Math.round((amt / data.totalExpenses) * 100) : 0;
                            return `
                                <div class="p-3 bg-slate-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-700 flex items-center justify-between">
                                    <div>
                                        <p class="font-bold text-gray-900 dark:text-white capitalize">${cat}</p>
                                        <p class="text-[10px] text-gray-400 font-medium">${pct}% of expenses</p>
                                    </div>
                                    <p class="font-black text-gray-900 dark:text-white">${window.fmt.currency(amt)}</p>
                                </div>`;
                        }).join('')}
                    </div>
                </div>

                <!-- Itemized Expense Records Table -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/60 overflow-hidden">
                    <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white text-sm">Expenses Report</h3>
                            <p class="text-[11px] text-gray-400 font-medium">Itemized operational expenses and voucher records for this branch</p>
                        </div>
                        <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-gray-600">${data.expenses.length} records</span>
                    </div>
                    <div class="overflow-x-auto">
                        <table class="w-full text-xs text-left">
                            <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-100 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                <tr>
                                    <th class="px-4 py-3 text-center">Date</th>
                                    <th class="px-4 py-3">Category</th>
                                    <th class="px-4 py-3">Description / Details</th>
                                    <th class="px-4 py-3 text-right">Amount Spent</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60">
                                ${data.expenses.length === 0 ? `<tr><td colspan="4" class="py-8 text-center text-gray-400">No expense records found for this timeframe</td></tr>` :
                                data.expenses.map(e => `
                                    <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors">
                                        <td class="px-4 py-3 text-center whitespace-nowrap text-gray-500 dark:text-gray-400">${formatDate(e.created_at)}</td>
                                        <td class="px-4 py-3 font-semibold text-gray-900 dark:text-white capitalize">
                                            <span class="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60">${e.category || 'General'}</span>
                                        </td>
                                        <td class="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">${e.description || e.notes || 'Operational expense'}</td>
                                        <td class="px-4 py-3 text-right font-black text-gray-900 dark:text-white">${window.fmt.currency(e.amount)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
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

window.updateBranchReportNotes = function(val) {
    _branchReportNotes = val;
};

window.updateBranchReportDate = function(field, val) {
    if (field === 'from') _branchReportFrom = val;
    if (field === 'to') _branchReportTo = val;
    _branchReportPreset = 'custom';
    renderReportsModule();
};

window.applyBranchTimeframePreset = function(preset) {
    _branchReportPreset = preset;
    const now = new Date();
    if (preset === 'today') {
        const todayStr = toLocalIsoDateString(now);
        _branchReportFrom = todayStr;
        _branchReportTo = todayStr;
    } else if (preset === 'this_week') {
        const d = new Date(now);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.getFullYear(), now.getMonth(), diff);
        _branchReportFrom = toLocalIsoDateString(monday);
        _branchReportTo = toLocalIsoDateString(now);
    } else if (preset === 'this_month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        _branchReportFrom = toLocalIsoDateString(firstDay);
        _branchReportTo = toLocalIsoDateString(now);
    } else if (preset === 'last_month') {
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        _branchReportFrom = toLocalIsoDateString(firstDayLastMonth);
        _branchReportTo = toLocalIsoDateString(lastDayLastMonth);
    } else if (preset === 'this_year') {
        const firstDayYear = new Date(now.getFullYear(), 0, 1);
        _branchReportFrom = toLocalIsoDateString(firstDayYear);
        _branchReportTo = toLocalIsoDateString(now);
    }

    renderReportsModule();
};

window.downloadBranchDailyReport = async function() {
    try {
        const todayStr = toLocalIsoDateString(new Date());
        window.showLoader?.('Generating Daily Sales Report...');
        const filename = await exportReportPdf('sales_invoices', {
            scope: 'branch',
            branchId: window.state?.branchId,
            startDate: todayStr,
            endDate: todayStr,
            managerNotes: _branchReportNotes
        });
        window.hideLoader?.();
        window.showToast?.(`Daily Report "${filename}" exported successfully!`, 'success');
    } catch (err) {
        window.hideLoader?.();
        window.showToast?.('Failed to generate daily report: ' + err.message, 'error');
    }
};

window.triggerBranchPdfExport = async function() {
    try {
        window.showLoader?.('Preparing clean Branch PDF report...');
        const filename = await exportReportPdf(_branchReportCategory, {
            scope: 'branch',
            branchId: window.state?.branchId,
            startDate: _branchReportFrom,
            endDate: _branchReportTo,
            managerNotes: _branchReportNotes
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
            endDate: _branchReportTo,
            managerNotes: _branchReportNotes
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
