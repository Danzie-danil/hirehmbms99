import { state } from '../state.js';
import { dbBusinessLoans, dbCapital } from '../db.js';
import { renderPremiumLoader, showToast, renderModuleOfflineState } from '../utils.js';

let realtimeChannel = null;

window._batchLoansList = [];

function parseCleanNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const cleanStr = String(val).replace(/,/g, '').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
}

export async function renderOwnerLoansModule() {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId) {
        area.innerHTML = renderModuleOfflineState({
            viewId: 'loans',
            title: 'Liabilities & Loans Tracker',
            entityName: 'Business Loans',
            retryAction: 'window.renderOwnerLoansModule()'
        });
        return;
    }

    area.innerHTML = renderPremiumLoader('Loading business loans, credit lines & repayment history...');
    if (window.lucide) window.lucide.createIcons();

    setupRealtimeLoansSubscription(ownerId);

    try {
        const [loans, repayments] = await Promise.race([
            Promise.all([
                dbBusinessLoans.fetchAll(ownerId).catch(() => []),
                dbBusinessLoans.fetchRepayments(ownerId).catch(() => [])
            ]),
            new Promise(resolve => setTimeout(() => resolve([
                window._rawLoansList || [],
                window._rawLoanRepayments || []
            ]), 12000))
        ]);



        window._rawLoansList = loans;
        window._rawLoanRepayments = repayments;

        let totalPrincipal = 0;
        let totalRemaining = 0;
        let totalRepaid = 0;

        loans.forEach(l => {
            totalPrincipal += parseCleanNumber(l.principal_amount);
            totalRemaining += parseCleanNumber(l.remaining_balance);
        });

        repayments.forEach(r => {
            totalRepaid += parseCleanNumber(r.amount_paid);
        });

        const activeLoansCount = loans.filter(l => l.status === 'active').length;

        // Custom Lists Filter & Search State
        const activeFilter = state._loansListFilter || 'all';
        const searchKeyword = (state._loansListSearch || '').toLowerCase().trim();

        // Filter Loans
        const filteredLoans = loans.filter(l => {
            if (activeFilter === 'active' && l.status !== 'active') return false;
            if (activeFilter === 'fully_paid' && l.status !== 'fully_paid') return false;
            if (activeFilter === 'bank_loan' && l.loan_type !== 'bank_loan') return false;
            if (activeFilter === 'supplier_credit' && l.loan_type !== 'supplier_credit') return false;
            if (activeFilter === 'owner_loan' && l.loan_type !== 'owner_loan') return false;

            if (searchKeyword) {
                const matchLender = (l.lender_name || '').toLowerCase().includes(searchKeyword);
                const matchType = (l.loan_type || '').toLowerCase().includes(searchKeyword);
                const matchAcc = (l.account_number || '').toLowerCase().includes(searchKeyword);
                if (!matchLender && !matchType && !matchAcc) return false;
            }
            return true;
        });

        const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';

        area.innerHTML = `
            <div class="space-y-6">
                <!-- Clean Standard Header Banner -->
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
                            <i data-lucide="landmark" class="w-4 h-4"></i>
                            Liabilities & Debt Management Engine
                        </div>
                        <h2 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">Business Loans & Credit Lines</h2>
                        <p class="text-xs text-gray-500 dark:text-gray-400">Track commercial bank loans, supplier credit, owner debt & repayment amortization logs</p>
                    </div>
                    <div class="flex flex-col items-stretch sm:items-end gap-2 shrink-0 w-full sm:w-auto">
                        <button onclick="window.renderAddLoanView()" class="w-full sm:w-auto px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add Loan (Single / Batch)
                        </button>
                        <button onclick="window.renderAddLoanRepaymentView()" class="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                            <i data-lucide="receipt" class="w-4 h-4"></i> Record Repayment
                        </button>
                    </div>
                </div>

                <!-- KPI Metric Cards -->
                <div class="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Total Principal Borrowed</span>
                        </div>
                        <p class="text-dynamic-lg font-black text-gray-900 dark:text-white leading-tight my-1 pr-1 sm:pr-2 cursor-pointer select-none" data-tooltip="${window.fmt.currency(totalPrincipal)}" data-tooltip-title="Total Principal Borrowed" title="${window.fmt.currency(totalPrincipal)}">${window.fmt.number(totalPrincipal)}</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Cumulative original debt</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-slate-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 flex items-center justify-center shadow-2xs">
                            <i data-lucide="landmark" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Outstanding Debt Balance</span>
                        </div>
                        <p class="text-dynamic-lg font-black text-rose-600 dark:text-rose-400 leading-tight my-1 pr-1 sm:pr-2 cursor-pointer select-none" data-tooltip="${window.fmt.currency(totalRemaining)}" data-tooltip-title="Outstanding Debt Balance" title="${window.fmt.currency(totalRemaining)}">${window.fmt.number(totalRemaining)}</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Active liabilities remaining</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="trending-down" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Total Repaid to Date</span>
                        </div>
                        <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 leading-tight my-1 pr-1 sm:pr-2 cursor-pointer select-none" data-tooltip="${window.fmt.currency(totalRepaid)}" data-tooltip-title="Total Repaid to Date" title="${window.fmt.currency(totalRepaid)}">${window.fmt.number(totalRepaid)}</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Cleared debt & installments</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="check-circle-2" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>

                    <div class="relative bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-2.5 sm:p-3 shadow-xs flex flex-col justify-between h-full stat-card min-w-0">
                        <div class="text-gray-500 dark:text-gray-400 mb-1 pr-1 sm:pr-2 min-w-0">
                            <span class="text-[11px] sm:text-xs font-bold uppercase tracking-tight sm:tracking-wider block whitespace-normal break-words leading-tight">Active Credit Lines</span>
                        </div>
                        <p class="text-dynamic-lg font-black text-gray-900 dark:text-white leading-tight my-1 pr-1 sm:pr-2 cursor-pointer select-none" data-tooltip="${activeLoansCount} Active Credit Facilities" data-tooltip-title="Active Credit Lines">${activeLoansCount} Active</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 dark:text-gray-500 leading-tight mt-auto pr-6 truncate">Open bank & supplier facilities</p>
                        <div class="absolute bottom-1 right-1 w-4.5 h-4.5 rounded-[6px] bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-2xs">
                            <i data-lucide="credit-card" class="w-2.5 h-2.5"></i>
                        </div>
                    </div>
                </div>

                <!-- Custom Lists & Filter Bar -->
                <div class="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Business Liabilities Custom Lists</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Filter loan facilities by status, lender category & credit type</p>
                        </div>
                        <!-- Search Box -->
                        <div class="relative w-full sm:w-64">
                            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" value="${state._loansListSearch || ''}" oninput="window.setLoansSearch(this.value)" placeholder="Search lender name or ref..." class="form-input w-full pl-9 py-1.5 text-xs font-bold rounded-xl">
                        </div>
                    </div>

                    <!-- Custom Filter Pills -->
                    <div id="loansFilterPillsContainer" class="flex items-center gap-2 overflow-x-auto pb-1 scroller-custom">
                        ${renderLoansFilterPillsHTML(loans, activeFilter)}
                    </div>

                    <!-- Business Loans Grid -->
                    <div id="loansGridContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        ${renderLoansGridHTML(filteredLoans)}
                    </div>
                </div>

                <!-- Loan Repayments Audit Log -->
                <div class="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Loan Repayment History</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Installment payments & debt clearance records</p>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th class="p-3">Payment Date</th>
                                    <th class="p-3">Lender Name</th>
                                    <th class="p-3">Amount Paid</th>
                                    <th class="p-3">Method / Receipt</th>
                                    <th class="p-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                                ${repayments.length > 0 ? repayments.map(r => {
                                    const parentLoan = loans.find(l => l.id === r.loan_id);
                                    return `
                                    <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td class="p-3 font-medium text-gray-900 dark:text-white">${r.payment_date}</td>
                                        <td class="p-3 font-bold text-gray-900 dark:text-white">${parentLoan ? parentLoan.lender_name : 'Lender'}</td>
                                        <td class="p-3 font-bold text-emerald-600 dark:text-emerald-400">${window.fmt.currency(r.amount_paid || 0)}</td>
                                        <td class="p-3 text-gray-500 dark:text-gray-400">${r.payment_method ? r.payment_method + ' • ' : ''}${r.receipt_no || '-'}</td>
                                        <td class="p-3 text-gray-500 dark:text-gray-400">${r.notes || '-'}</td>
                                    </tr>
                                `;
                                }).join('') : `
                                    <tr>
                                        <td colspan="5" class="py-8 text-center text-gray-400">No repayment logs recorded yet.</td>
                                    </tr>
                                `}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('[OwnerLoans] Error loading loan data:', err);
        area.innerHTML = renderModuleOfflineState({
            viewId: 'loans',
            title: 'Liabilities & Loans Tracker',
            entityName: 'Business Loans',
            retryAction: 'window.renderOwnerLoansModule()'
        });
        if (window.lucide) window.lucide.createIcons();
    }
}

function renderLoansFilterPillsHTML(loans, activeFilter) {
    return `
        <button onclick="window.setLoansListFilter('all')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'all' ? 'bg-rose-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            All Facilities (${loans.length})
        </button>
        <button onclick="window.setLoansListFilter('active')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'active' ? 'bg-rose-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            🚨 Active Debt (${loans.filter(l => l.status === 'active').length})
        </button>
        <button onclick="window.setLoansListFilter('fully_paid')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'fully_paid' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            ✅ Fully Paid (${loans.filter(l => l.status === 'fully_paid').length})
        </button>
        <button onclick="window.setLoansListFilter('bank_loan')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'bank_loan' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            🏦 Bank Loans (${loans.filter(l => l.loan_type === 'bank_loan').length})
        </button>
        <button onclick="window.setLoansListFilter('supplier_credit')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'supplier_credit' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            🚚 Supplier Credit (${loans.filter(l => l.loan_type === 'supplier_credit').length})
        </button>
        <button onclick="window.setLoansListFilter('owner_loan')" class="px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'owner_loan' ? 'bg-purple-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            👤 Director Loans (${loans.filter(l => l.loan_type === 'owner_loan').length})
        </button>
    `;
}

function renderLoansGridHTML(filteredLoans) {
    if (!filteredLoans || filteredLoans.length === 0) {
        return `
            <div class="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <i data-lucide="filter" class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2"></i>
                <p class="text-gray-400 text-sm font-medium">No loan facilities match the selected custom list filter.</p>
                <button onclick="window.setLoansListFilter('all')" class="mt-3 px-4 py-2 bg-rose-600 text-white rounded-xl font-bold text-xs cursor-pointer">Clear Custom Filter</button>
            </div>
        `;
    }

    return filteredLoans.map(l => `
        <div class="border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3.5 sm:p-4 bg-slate-50/50 dark:bg-gray-900/40 hover:border-rose-300 transition-all flex flex-col justify-between space-y-2.5">
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${l.status === 'active' ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'}">
                        ${l.status.replace('_', ' ')}
                    </span>
                    <span class="text-[11px] text-gray-500 font-bold">${l.loan_type.replace('_', ' ').toUpperCase()}</span>
                </div>
                <h4 class="font-bold text-gray-900 dark:text-white text-sm leading-snug">${l.lender_name}</h4>
                ${l.account_number ? `<p class="text-[11px] text-gray-400 font-mono mt-0.5">Acc: ${l.account_number}</p>` : ''}
            </div>
            <div class="space-y-1.5 pt-2 border-t border-gray-200/60 dark:border-gray-750">
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">Principal:</span>
                    <span class="font-bold text-gray-900 dark:text-white">${window.fmt.currency(l.principal_amount || 0)}</span>
                </div>
                <div class="flex items-center justify-between text-xs">
                    <span class="text-gray-400">Remaining Balance:</span>
                    <span class="font-bold text-rose-600 dark:text-rose-400">${window.fmt.currency(l.remaining_balance || 0)}</span>
                </div>
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-750">
                <button onclick="window.renderAddLoanRepaymentView('${l.id}')" class="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 font-bold rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer">
                    <i data-lucide="receipt" class="w-3.5 h-3.5"></i> Pay Installment
                </button>
                <div class="flex items-center gap-1">
                    <button onclick="window.renderAddLoanView('${l.id}')" title="Edit Loan Facility" class="p-1.5 text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.deleteLoan('${l.id}')" title="Delete Loan" class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

window.setLoansListFilter = function(filterKey) {
    state._loansListFilter = filterKey;
    const pillsContainer = document.getElementById('loansFilterPillsContainer');
    const gridContainer = document.getElementById('loansGridContainer');
    
    if (pillsContainer && gridContainer && window._rawLoansList) {
        const activeFilter = state._loansListFilter || 'all';
        const searchKeyword = (state._loansListSearch || '').toLowerCase().trim();
        const filteredLoans = window._rawLoansList.filter(l => {
            if (activeFilter === 'active' && l.status !== 'active') return false;
            if (activeFilter === 'fully_paid' && l.status !== 'fully_paid') return false;
            if (activeFilter === 'bank_loan' && l.loan_type !== 'bank_loan') return false;
            if (activeFilter === 'supplier_credit' && l.loan_type !== 'supplier_credit') return false;
            if (activeFilter === 'owner_loan' && l.loan_type !== 'owner_loan') return false;
            if (searchKeyword) {
                const matchLender = (l.lender_name || '').toLowerCase().includes(searchKeyword);
                const matchType = (l.loan_type || '').toLowerCase().includes(searchKeyword);
                const matchAcc = (l.account_number || '').toLowerCase().includes(searchKeyword);
                if (!matchLender && !matchType && !matchAcc) return false;
            }
            return true;
        });
        pillsContainer.innerHTML = renderLoansFilterPillsHTML(window._rawLoansList, activeFilter);
        gridContainer.innerHTML = renderLoansGridHTML(filteredLoans);
        if (window.lucide) window.lucide.createIcons();
    } else {
        window.renderOwnerLoansModule();
    }
};

window.setLoansSearch = function(val) {
    state._loansListSearch = val;
    window.setLoansListFilter(state._loansListFilter || 'all');
};

function setupRealtimeLoansSubscription(ownerId) {
    if (realtimeChannel) return;
    try {
        const handleMutation = (e) => {
            const table = e.detail?.table;
            if (table === 'business_loans' || table === 'loan_repayments' || table === 'loans') {
                if (document.getElementById('mainContent')?.querySelector('[data-view="loans"]') || window.location.hash.includes('loans')) {
                    window.renderOwnerLoansModule();
                }
            }
        };
        window.addEventListener('bms_data_mutation', handleMutation);
        realtimeChannel = true;
    } catch (e) {
        console.warn('[OwnerLoans] Realtime listener error:', e);
    }
}


export function renderAddLoanView(editLoanId = null) {
    const area = document.getElementById('mainContent');
    if (!area) return;
    window._batchLoansList = window._batchLoansList || [];

    let editLoan = null;
    if (editLoanId) {
        editLoan = (window._rawLoansList || []).find(l => l.id === editLoanId);
    }

    area.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col font-['Inter',sans-serif]">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <div class="flex items-center gap-3">
                <button type="button" onclick="renderOwnerLoansModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>Close</span>
                </button>
                <div class="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-base shrink-0 border border-rose-100 dark:border-rose-900">
                    <i data-lucide="${editLoan ? 'edit-2' : 'landmark'}" class="w-4 h-4"></i>
                </div>
                <div>
                    <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                        ${editLoan ? `Edit Loan Facility: ${editLoan.lender_name}` : 'Register Business Loan / Facility (Single / Batch)'}
                    </h3>
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Track bank loans, supplier credit, owner debt & terms</p>
                </div>
            </div>
            ${!editLoan ? `
                <div id="batchLoanBadgeCount" class="px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full font-extrabold text-xs">
                    Batch Facilities: ${window._batchLoansList.length}
                </div>
            ` : ''}
        </div>

        <!-- Form Body -->
        <form onsubmit="event.preventDefault(); window.handleSaveLoanBatch('${editLoanId || ''}');" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 scroller-custom">
                
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-3">
                        <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <i data-lucide="${editLoan ? 'edit-3' : 'plus-circle'}" class="w-4 h-4 text-rose-500"></i> Loan Facility Details Entry
                        </h4>
                        ${!editLoan ? `
                            <button type="button" onclick="window.addItemToLoanBatch()" class="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-rose-200 dark:border-rose-900">
                                <i data-lucide="plus" class="w-4 h-4"></i> Add Loan to Batch List
                            </button>
                        ` : ''}
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Lender / Financial Institution *</label>
                        <input type="text" id="lonLender" value="${editLoan ? editLoan.lender_name || '' : ''}" class="form-input w-full font-bold" placeholder="e.g. CRDB Bank, Supplier Equipment Credit">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Loan Type *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'lonType',
                            selectedValue: editLoan ? editLoan.loan_type : 'bank_loan',
                            searchable: false,
                            options: [
                                { value: 'bank_loan', label: 'Commercial Bank Loan', icon: 'building-2' },
                                { value: 'supplier_credit', label: 'Supplier Credit Terms', icon: 'truck' },
                                { value: 'owner_loan', label: 'Director / Owner Loan', icon: 'user' },
                                { value: 'equipment_financing', label: 'Equipment Financing', icon: 'wrench' },
                                { value: 'microfinance', label: 'Microfinance', icon: 'coins' },
                                { value: 'other', label: 'Other Liabilities', icon: 'landmark' }
                            ]
                        }) : ''}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Principal Amount (TZS) *</label>
                            <input type="text" inputmode="decimal" id="lonPrincipal" value="${editLoan && editLoan.principal_amount != null ? editLoan.principal_amount : ''}" class="form-input w-full font-black text-rose-600" placeholder="e.g. 10000000">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Annual Interest Rate (%)</label>
                            <input type="text" inputmode="decimal" id="lonInterest" value="${editLoan && editLoan.interest_rate_annual != null ? editLoan.interest_rate_annual : ''}" class="form-input w-full font-bold" placeholder="e.g. 0.0">
                        </div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Start Date *</label>
                            <input type="date" id="lonStartDate" class="form-input w-full font-bold" value="${editLoan ? editLoan.start_date : new Date().toISOString().slice(0, 10)}">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Due Date</label>
                            <input type="date" id="lonDueDate" value="${editLoan ? editLoan.due_date || '' : ''}" class="form-input w-full font-bold">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Account / Agreement Ref</label>
                        <input type="text" id="lonAcc" value="${editLoan ? editLoan.account_number || '' : ''}" class="form-input w-full font-mono" placeholder="e.g. LN-994021">
                    </div>
                </div>

                <!-- Staged Batch Loans List (Hidden when editing) -->
                ${!editLoan ? `
                    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <i data-lucide="layers" class="w-4 h-4 text-indigo-500"></i> Staged Loan Facilities List
                                </h4>
                                <p class="text-xs text-gray-500 dark:text-gray-400">Review loans in your batch queue before saving</p>
                            </div>
                            ${window._batchLoansList.length > 0 ? `
                                <button type="button" onclick="window.clearLoanBatchList()" class="text-xs text-red-500 font-bold hover:underline">
                                    Clear Batch
                                </button>
                            ` : ''}
                        </div>

                        <div id="batchLoanTableContainer" class="overflow-x-auto">
                            ${renderBatchLoansTableHtml()}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <button type="button" onclick="renderOwnerLoansModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    Cancel
                </button>
                <div class="flex items-center gap-3">
                    ${!editLoan ? `
                        <button type="button" onclick="window.addItemToLoanBatch()" class="px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer flex items-center gap-1.5">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add to Batch List
                        </button>
                    ` : ''}
                    <button type="submit" id="btnSubmitLoanBatch" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                        <span>${editLoan ? 'Update Loan Details' : window._batchLoansList.length > 0 ? `Save All ${window._batchLoansList.length} Loans` : 'Save Loan'}</span>
                    </button>
                </div>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    if (!editLoanId) {
        setTimeout(() => {
            if (window.hydrateFormDraft) window.hydrateFormDraft('ownerLoanDraft', area);
            if (window.attachFormDraftAutoSave) window.attachFormDraftAutoSave('ownerLoanDraft', area);
        }, 50);
    }
}

function renderBatchLoansTableHtml() {
    const list = window._batchLoansList || [];

    if (list.length === 0) {
        return `
            <div class="py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <i data-lucide="landmark" class="w-8 h-8 text-gray-300 mx-auto mb-1"></i>
                <p class="text-xs text-gray-400 font-medium">No loans added to batch yet. Fill details above and click "+ Add Loan to Batch List"</p>
            </div>
        `;
    }

    let totalPrincipal = 0;
    list.forEach(i => totalPrincipal += parseCleanNumber(i.principal_amount));

    return `
        <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                    <th class="p-2.5">#</th>
                    <th class="p-2.5">Lender</th>
                    <th class="p-2.5">Type</th>
                    <th class="p-2.5">Principal (TZS)</th>
                    <th class="p-2.5">Start Date</th>
                    <th class="p-2.5 text-right">Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                ${list.map((item, idx) => `
                    <tr class="hover:bg-gray-50/50">
                        <td class="p-2.5 font-bold text-gray-400">${idx + 1}</td>
                        <td class="p-2.5 font-bold text-gray-900 dark:text-white">${item.lender_name}</td>
                        <td class="p-2.5 text-rose-600 font-bold uppercase">${item.loan_type.replace('_', ' ')}</td>
                        <td class="p-2.5 font-bold text-rose-600">${window.fmt.currency(item.principal_amount)}</td>
                        <td class="p-2.5 text-gray-500">${item.start_date}</td>
                        <td class="p-2.5 text-right">
                            <button type="button" onclick="window.removeLoanFromBatch(${idx})" class="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot class="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 font-bold text-xs">
                <tr>
                    <td colspan="3" class="p-2.5 text-gray-700 dark:text-gray-300">Total Batch Principal (${list.length} Facilities):</td>
                    <td colspan="3" class="p-2.5 text-rose-600 font-black">${window.fmt.currency(totalPrincipal)}</td>
                </tr>
            </tfoot>
        </table>
    `;
}

window.addItemToLoanBatch = function() {
    const lender = document.getElementById('lonLender')?.value?.trim();
    const type = document.getElementById('lonType')?.value;
    const principal = parseCleanNumber(document.getElementById('lonPrincipal')?.value);
    const interest = parseCleanNumber(document.getElementById('lonInterest')?.value);
    const startDate = document.getElementById('lonStartDate')?.value;
    const dueDate = document.getElementById('lonDueDate')?.value || null;
    const acc = document.getElementById('lonAcc')?.value?.trim();

    if (!lender || !principal || !startDate) {
        if (window.showToast) window.showToast('Please enter lender, principal amount and start date before adding to batch list', 'error');
        return;
    }

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    window._batchLoansList = window._batchLoansList || [];
    window._batchLoansList.push({
        owner_id: ownerId,
        lender_name: lender,
        loan_type: type,
        principal_amount: principal,
        remaining_balance: principal,
        interest_rate_annual: interest,
        start_date: startDate,
        due_date: dueDate,
        account_number: acc,
        status: 'active'
    });

    if (document.getElementById('lonLender')) document.getElementById('lonLender').value = '';
    if (document.getElementById('lonPrincipal')) document.getElementById('lonPrincipal').value = '';
    if (document.getElementById('lonAcc')) document.getElementById('lonAcc').value = '';

    if (window.showToast) window.showToast(`Added loan "${lender}" to batch list!`, 'success');
    window.updateBatchLoansUI();
};

window.removeLoanFromBatch = function(index) {
    if (!window._batchLoansList) return;
    window._batchLoansList.splice(index, 1);
    window.updateBatchLoansUI();
};

window.clearLoanBatchList = function() {
    window._batchLoansList = [];
    window.updateBatchLoansUI();
};

window.updateBatchLoansUI = function() {
    const container = document.getElementById('batchLoanTableContainer');
    if (container) container.innerHTML = renderBatchLoansTableHtml();
    const badge = document.getElementById('batchLoanBadgeCount');
    if (badge) badge.innerText = `Batch Facilities: ${(window._batchLoansList || []).length}`;
    const btnSubmit = document.getElementById('btnSubmitLoanBatch');
    if (btnSubmit) {
        const count = (window._batchLoansList || []).length;
        btnSubmit.innerHTML = `<span>${count > 0 ? `Save All ${count} Loans` : 'Save Loan'}</span>`;
    }
    if (window.lucide) window.lucide.createIcons();
};

window.handleSaveLoanBatch = async function(editLoanId = null) {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const lender = document.getElementById('lonLender')?.value?.trim();
    const type = document.getElementById('lonType')?.value;
    const principal = parseCleanNumber(document.getElementById('lonPrincipal')?.value);
    const interest = parseCleanNumber(document.getElementById('lonInterest')?.value);
    const startDate = document.getElementById('lonStartDate')?.value;
    const dueDate = document.getElementById('lonDueDate')?.value || null;
    const acc = document.getElementById('lonAcc')?.value?.trim();

    if (editLoanId) {
        if (!lender || !principal || !startDate) {
            if (window.showToast) window.showToast('Lender, principal amount and start date are required', 'error');
            return;
        }
        try {
            await dbBusinessLoans.update(editLoanId, {
                lender_name: lender,
                loan_type: type,
                principal_amount: principal,
                interest_rate_annual: interest,
                start_date: startDate,
                due_date: dueDate,
                account_number: acc
            });
            if (window.showToast) window.showToast(`Successfully updated loan facility details!`, 'success');
            window.renderOwnerLoansModule();
        } catch (err) {
            console.error('[UpdateLoan] Error:', err);
            if (window.showToast) window.showToast('Failed to update loan: ' + err.message, 'error');
        }
        return;
    }

    if (lender && principal && startDate) {
        window._batchLoansList = window._batchLoansList || [];
        window._batchLoansList.push({
            owner_id: ownerId,
            lender_name: lender,
            loan_type: type,
            principal_amount: principal,
            remaining_balance: principal,
            interest_rate_annual: interest,
            start_date: startDate,
            due_date: dueDate,
            account_number: acc,
            status: 'active'
        });
    }

    const items = window._batchLoansList || [];
    if (items.length === 0) {
        if (window.showToast) window.showToast('Please enter loan details or add items to batch list first', 'error');
        return;
    }

    try {
        await dbBusinessLoans.addBatch(items);
        if (window.showToast) window.showToast(`Successfully registered ${items.length} loan facility(ies)!`, 'success');
        window._batchLoansList = [];
        if (window.clearFormDraft) window.clearFormDraft('ownerLoanDraft');
        window.renderOwnerLoansModule();
    } catch (err) {
        console.error('[SaveLoanBatch] Error:', err);
        if (window.showToast) window.showToast('Failed to register loan batch: ' + err.message, 'error');
    }
};

export async function renderAddLoanRepaymentView(preselectLoanId = null) {
    const area = document.getElementById('mainContent');
    if (!area) return;
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const [loans, capitalAccounts] = await Promise.all([
        dbBusinessLoans.fetchAll(ownerId).catch(() => []),
        dbCapital.fetchAccounts(ownerId).catch(() => [])
    ]);

    area.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col font-['Inter',sans-serif]">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderOwnerLoansModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>Close</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-100 dark:border-emerald-900">
                <i data-lucide="receipt" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">Record Loan Repayment</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Record loan installment payments & clear outstanding balance</p>
            </div>
        </div>

        <!-- Form Body -->
        <form onsubmit="event.preventDefault(); window.handleSaveLoanRepayment();" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Select Loan Facility *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'rpmLoanId',
                            selectedValue: preselectLoanId || loans[0]?.id || '',
                            searchable: loans.length > 4,
                            options: loans.map(l => ({ value: l.id, label: `${l.lender_name} (Bal: ${window.fmt.currency(l.remaining_balance || 0)})`, icon: 'landmark' }))
                        }) : ''}
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Payment Source Capital Account (Deduction Source)</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'rpmCapitalSource',
                            selectedValue: '',
                            searchable: capitalAccounts.length > 4,
                            options: [
                                { value: '', label: 'Unlinked (No Capital Deduction)', icon: 'minus-circle' },
                                ...capitalAccounts.map(c => ({ value: c.id, label: `${c.account_name} (${window.fmt.currency(c.balance || 0)})`, icon: 'wallet' }))
                            ]
                        }) : ''}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Amount Paid (TZS) *</label>
                            <input type="text" inputmode="decimal" id="rpmAmount" required class="form-input w-full font-black text-emerald-600" placeholder="e.g. 500000">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Payment Date *</label>
                            <input type="date" id="rpmDate" required class="form-input w-full font-bold" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Payment Method / Receipt No</label>
                        <input type="text" id="rpmMethod" class="form-input w-full" placeholder="e.g. Bank Transfer Ref: TR-99401">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Notes</label>
                        <textarea id="rpmNotes" rows="3" class="form-input w-full" placeholder="Monthly installment repayment..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <button type="button" onclick="renderOwnerLoansModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>Record Repayment</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        if (window.hydrateFormDraft) window.hydrateFormDraft('ownerLoanRepaymentDraft', area);
        if (window.attachFormDraftAutoSave) window.attachFormDraftAutoSave('ownerLoanRepaymentDraft', area);
    }, 50);
}

window.deleteLoan = async function(id) {
    if (!confirm('Are you sure you want to delete this loan record?')) return;
    try {
        await dbBusinessLoans.delete(id);
        if (window.showToast) window.showToast('Loan record deleted.', 'success');
        window.renderOwnerLoansModule();
    } catch (e) {
        if (window.showToast) window.showToast('Error deleting loan: ' + e.message, 'error');
    }
};

window.handleSaveLoanRepayment = async function() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const loanId = document.getElementById('rpmLoanId')?.value;
    const amount = parseCleanNumber(document.getElementById('rpmAmount')?.value);
    const date = document.getElementById('rpmDate')?.value;
    const method = document.getElementById('rpmMethod')?.value?.trim();
    const notes = document.getElementById('rpmNotes')?.value?.trim();
    const capitalAccountId = document.getElementById('rpmCapitalSource')?.value || null;

    if (!loanId || !amount || !date) {
        if (window.showToast) window.showToast('Please select loan, amount and date', 'error');
        return;
    }

    try {
        const loans = await dbBusinessLoans.fetchAll(ownerId).catch(() => []);
        const targetLoan = loans.find(l => l.id === loanId);
        if (!targetLoan) throw new Error('Loan record not found');

        const newRemaining = Math.max(0, parseCleanNumber(targetLoan.remaining_balance) - amount);
        const newStatus = newRemaining === 0 ? 'fully_paid' : 'active';

        await dbBusinessLoans.addRepayment({
            loan_id: loanId,
            owner_id: ownerId,
            amount_paid: amount,
            payment_date: date,
            payment_method: method,
            notes: notes
        });

        await dbBusinessLoans.update(loanId, {
            remaining_balance: newRemaining,
            status: newStatus
        });

        if (capitalAccountId && amount > 0) {
            await dbCapital.adjustBalance(capitalAccountId, -amount, {
                notes: `Loan Installment Repayment: ${targetLoan.lender_name}`
            });
        }

        if (window.clearFormDraft) window.clearFormDraft('ownerLoanRepaymentDraft');
        if (window.showToast) window.showToast('Loan repayment recorded successfully!', 'success');
        window.renderOwnerLoansModule();
    } catch (err) {
        console.error('[SaveLoanRepayment] Error:', err);
        if (window.showToast) window.showToast('Failed to record repayment: ' + err.message, 'error');
    }
};

window.renderBatchLoansPreview = window.updateBatchLoansUI;
window.openAddLoanModal = renderAddLoanView;
window.renderAddLoanView = renderAddLoanView;
window.openAddLoanRepaymentModal = renderAddLoanRepaymentView;
window.renderAddLoanRepaymentView = renderAddLoanRepaymentView;
window.renderOwnerLoansModule = renderOwnerLoansModule;
