import { state } from '../state.js';
import { dbCapital, dbBranches } from '../db.js';
import { renderPremiumLoader, showToast, renderModuleOfflineState } from '../utils.js';

let realtimeChannel = null;

window._batchCapitalAccountsList = [];

function parseCleanNumber(val) {
    if (val === null || val === undefined || val === '') return 0;
    const cleanStr = String(val).replace(/,/g, '').trim();
    const num = parseFloat(cleanStr);
    return isNaN(num) ? 0 : num;
}

function renderCapitalFilterPillsHTML(accounts = [], branches = []) {
    const activeFilter = state._capitalListFilter || 'all';
    return `
        <button onclick="window.setCapitalListFilter('all')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'all' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            <i data-lucide="layers" class="w-3.5 h-3.5"></i>
            <span>All Accounts (${accounts.length})</span>
        </button>
        <button onclick="window.setCapitalListFilter('bank')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'bank' ? 'bg-blue-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            <i data-lucide="building-2" class="w-3.5 h-3.5"></i>
            <span>Bank Accounts (${accounts.filter(a => a.account_type === 'bank').length})</span>
        </button>
        <button onclick="window.setCapitalListFilter('mobile_money')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'mobile_money' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            <i data-lucide="smartphone" class="w-3.5 h-3.5"></i>
            <span>Mobile Money (${accounts.filter(a => a.account_type === 'mobile_money').length})</span>
        </button>
        <button onclick="window.setCapitalListFilter('cash')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === 'cash' ? 'bg-amber-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
            <i data-lucide="banknote" class="w-3.5 h-3.5"></i>
            <span>Cash Drawers (${accounts.filter(a => ['cash', 'petty_cash'].includes(a.account_type)).length})</span>
        </button>
        ${branches.map(b => `
            <button onclick="window.setCapitalListFilter('branch_${b.id}')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold text-xs transition-all whitespace-nowrap cursor-pointer ${activeFilter === ('branch_' + b.id) ? 'bg-purple-600 text-white shadow-xs' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'}">
                <i data-lucide="map-pin" class="w-3.5 h-3.5"></i>
                <span>${b.name} (${accounts.filter(a => a.branch_id === b.id).length})</span>
            </button>
        `).join('')}
    `;
}

function renderCapitalAccountsGridHTML(accounts = [], branchMap = new Map()) {
    const activeFilter = state._capitalListFilter || 'all';
    const searchQuery = (state._capitalListSearch || '').toLowerCase().trim();

    const filteredAccounts = accounts.filter(a => {
        if (activeFilter === 'bank' && a.account_type !== 'bank') return false;
        if (activeFilter === 'mobile_money' && a.account_type !== 'mobile_money') return false;
        if (activeFilter === 'cash' && !['cash', 'petty_cash'].includes(a.account_type)) return false;
        if (activeFilter.startsWith('branch_')) {
            const bId = activeFilter.replace('branch_', '');
            if (a.branch_id !== bId) return false;
        }
        if (searchQuery) {
            const name = (a.account_name || '').toLowerCase();
            const num = (a.account_number || '').toLowerCase();
            const bank = (a.bank_name || '').toLowerCase();
            if (!name.includes(searchQuery) && !num.includes(searchQuery) && !bank.includes(searchQuery)) return false;
        }
        return true;
    });

    if (filteredAccounts.length === 0) {
        return `
            <div class="col-span-full py-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl">
                <i data-lucide="filter" class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-2"></i>
                <p class="text-gray-400 text-sm font-medium">No accounts match the selected custom filter list.</p>
                <button onclick="window.setCapitalListFilter('all')" class="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold text-xs cursor-pointer">Clear Custom Filter</button>
            </div>
        `;
    }

    return filteredAccounts.map(a => `
        <div class="border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-3.5 sm:p-4 bg-slate-50/50 dark:bg-gray-900/40 hover:border-indigo-300 transition-all flex flex-col justify-between space-y-2.5">
            <div>
                <div class="flex items-center justify-between mb-1.5">
                    <span class="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${a.account_type === 'bank' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900' : a.account_type === 'mobile_money' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900' : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900'}">
                        ${a.account_type.replace('_', ' ')}
                    </span>
                    <span class="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold">${a.branch_id ? (branchMap.get(a.branch_id) || 'Branch') : 'Global'}</span>
                </div>
                <h4 class="font-bold text-gray-900 dark:text-white text-sm leading-snug">${a.account_name}</h4>
                ${a.account_number ? `<p class="text-[11px] text-gray-400 font-mono mt-0.5">${a.bank_name ? a.bank_name + ' • ' : ''}${a.account_number}</p>` : ''}
            </div>
            <div class="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-gray-750">
                <div>
                    <p class="text-[10px] uppercase font-bold text-gray-400">Current Balance</p>
                    <p class="text-sm sm:text-base font-black text-gray-900 dark:text-white">${window.fmt.currency(a.balance || 0)}</p>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="window.renderAddCapitalAccountView('${a.id}')" title="Edit Account Details" class="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button onclick="window.deleteCapitalAccount('${a.id}')" title="Delete Account" class="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

export async function renderOwnerCapitalModule() {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId) {
        area.innerHTML = renderModuleOfflineState({
            viewId: 'capital',
            title: 'Capital & Balance Sheet',
            entityName: 'Capital Accounts',
            retryAction: 'window.renderOwnerCapitalModule()'
        });
        return;
    }

    area.innerHTML = renderPremiumLoader('Calculating real-time business capital & liquidity...');
    if (window.lucide) window.lucide.createIcons();

    setupRealtimeCapitalSubscription(ownerId);

    try {
        const [accounts, transactions, branches] = await Promise.race([
            Promise.all([
                dbCapital.fetchAccounts(ownerId).catch(() => []),
                dbCapital.fetchTransactions(ownerId).catch(() => []),
                state.branches || dbBranches.fetchAll(ownerId).catch(() => [])
            ]),
            new Promise(resolve => setTimeout(() => resolve([
                // If lifecycle.js cleared _rawCapitalAccounts on wake, fall back to localStorage cache
                window._rawCapitalAccounts || (() => {
                    try { const c = localStorage.getItem(`bms_cap_accs_${ownerId}`); return c ? JSON.parse(c) : []; } catch(e) { return []; }
                })(),
                window._rawCapitalTransactions || [],
            ]), 12000))
        ]);


        window._rawCapitalAccounts = accounts;
        window._rawCapitalTransactions = transactions;
        window._rawBranches = branches;

        const branchMap = new Map((branches || []).map(b => [b.id, b.name]));
        const accountMap = new Map((accounts || []).map(a => [a.id, a.account_name]));

        let totalCash = 0;
        let totalBank = 0;
        let totalMobileMoney = 0;

        accounts.forEach(a => {
            const val = parseCleanNumber(a.balance);
            if (a.account_type === 'bank') totalBank += val;
            else if (a.account_type === 'mobile_money') totalMobileMoney += val;
            else totalCash += val;
        });

        const totalLiquidCapital = totalCash + totalBank + totalMobileMoney;

        // Active Custom List Filter & Search State
        const activeFilter = state._capitalListFilter || 'all';
        const searchKeyword = (state._capitalListSearch || '').toLowerCase().trim();

        // Apply Custom List Filtering
        const filteredAccounts = accounts.filter(a => {
            if (activeFilter === 'bank' && a.account_type !== 'bank') return false;
            if (activeFilter === 'mobile_money' && a.account_type !== 'mobile_money') return false;
            if (activeFilter === 'cash' && !['cash', 'petty_cash'].includes(a.account_type)) return false;
            if (activeFilter.startsWith('branch_') && a.branch_id !== activeFilter.replace('branch_', '')) return false;

            if (searchKeyword) {
                const matchName = (a.account_name || '').toLowerCase().includes(searchKeyword);
                const matchNum = (a.account_number || '').toLowerCase().includes(searchKeyword);
                const matchBank = (a.bank_name || '').toLowerCase().includes(searchKeyword);
                if (!matchName && !matchNum && !matchBank) return false;
            }
            return true;
        });

        const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';

        area.innerHTML = `
            <div class="space-y-4 sm:space-y-5 slide-in">
                <!-- Bento Top Header Strip -->
                <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                        <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                            <i data-lucide="wallet" class="w-4 h-4 sm:w-6 sm:h-6"></i>
                        </div>
                        <div class="min-w-0 flex-1">
                            <h2 class="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">Business Capital & Liquidity</h2>
                            <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                                <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0"></i>
                                <span class="truncate">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                            </p>
                        </div>
                    </div>

                    <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                        <button onclick="window.renderAddCapitalAccountView()" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                            <i data-lucide="plus" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                            <span>Add Account</span>
                        </button>
                        <button onclick="window.renderAddCapitalTransactionView()" class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all cursor-pointer shadow-xs whitespace-nowrap">
                            <i data-lucide="arrow-up-down" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                            <span>Deposit / Withdrawal</span>
                        </button>
                    </div>
                </div>

                <!-- Bento Stats Row with Inline SVG Sparklines -->
                <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                    <!-- Total Available Capital -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-tight truncate block">Available Capital</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-indigo-600 dark:text-indigo-400 truncate leading-tight" title="${window.fmt.currency(totalLiquidCapital)}">${window.fmt.number(totalLiquidCapital)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Total Liquidity</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                            <path d="M2 18 L10 12 L18 16 L26 8 L38 4" stroke="#3B86F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="38" cy="4" r="2.5" fill="#3B86F7"/>
                        </svg>
                    </div>

                    <!-- Bank Balance -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">Bank Balance</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-blue-600 dark:text-blue-400 truncate leading-tight" title="${window.fmt.currency(totalBank)}">${window.fmt.number(totalBank)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Commercial Banks</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5 h-3 text-blue-400 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                            <rect x="2" y="10" width="4.5" height="14" rx="1.5"/>
                            <rect x="9" y="6" width="4.5" height="18" rx="1.5"/>
                            <rect x="16" y="12" width="4.5" height="12" rx="1.5"/>
                            <rect x="23" y="4" width="4.5" height="20" rx="1.5"/>
                            <rect x="30" y="8" width="4.5" height="16" rx="1.5"/>
                        </svg>
                    </div>

                    <!-- Mobile Money -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">Mobile Money</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight" title="${window.fmt.currency(totalMobileMoney)}">${window.fmt.number(totalMobileMoney)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">M-Pesa / Tills</p>
                        </div>
                        <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                            <path d="M2 16 L10 10 L18 14 L26 6 L38 3" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                            <circle cx="38" cy="3" r="2.5" fill="#10B981"/>
                        </svg>
                    </div>

                    <!-- Cash Balance -->
                    <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
                        <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${currencySymbol}</div>
                        <div class="flex items-center justify-between mb-1.5 pr-10">
                            <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">Cash Balance</span>
                        </div>
                        <div class="min-w-0 mt-auto pr-9">
                            <p class="text-dynamic-lg font-black text-amber-600 dark:text-amber-400 truncate leading-tight" title="${window.fmt.currency(totalCash)}">${window.fmt.number(totalCash)}</p>
                            <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Till / Petty Cash</p>
                        </div>
                        <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 text-[10px] font-black shadow-2xs">
                            <i data-lucide="banknote" class="w-3 h-3"></i>
                        </div>
                    </div>
                </div>

                <!-- Custom Lists & Filter Bar -->
                <div class="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                            <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Capital Accounts Directory</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Filter liquid accounts by category, till type & location</p>
                        </div>
                        <!-- Search Box -->
                        <div class="relative w-full sm:w-64">
                            <i data-lucide="search" class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></i>
                            <input type="text" value="${state._capitalListSearch || ''}" oninput="window.setCapitalSearch(this.value)" placeholder="Search account name or number..." class="w-full pl-9 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400">
                        </div>
                    </div>

                    <!-- Custom Filter Pills -->
                    <div id="capitalFilterPillsContainer" class="flex items-center gap-2 overflow-x-auto pb-1 scroller-custom">
                        ${renderCapitalFilterPillsHTML(accounts, branches)}
                    </div>

                    <!-- Accounts Grid -->
                    <div id="capitalAccountsGridContainer" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        ${renderCapitalAccountsGridHTML(accounts, branchMap)}
                    </div>
                </div>

                <!-- Capital Deposits & Withdrawals History -->
                <div class="bg-white dark:bg-gray-800/90 border border-gray-200/80 dark:border-gray-700/80 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Capital Deposits & Withdrawals Log</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400">Recent capital deposits & withdrawal movements</p>
                        </div>
                    </div>

                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs">
                            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase text-[10px] font-bold tracking-wider border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th class="p-2.5 sm:p-3">Date</th>
                                    <th class="p-2.5 sm:p-3">Type</th>
                                    <th class="p-2.5 sm:p-3">Capital Account</th>
                                    <th class="p-2.5 sm:p-3">Amount</th>
                                    <th class="p-2.5 sm:p-3">Reference / Notes</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                                ${transactions.length > 0 ? transactions.map(t => {
                                    const isDep = ['deposit', 'injection', 'inflow'].includes(t.transaction_type);
                                    return `
                                    <tr class="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td class="p-2.5 sm:p-3 font-medium text-gray-900 dark:text-white text-xs">${t.transaction_date}</td>
                                        <td class="p-2.5 sm:p-3 text-xs">
                                            <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${isDep ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300'}">
                                                ${isDep ? '📥 Deposit' : '📤 Withdrawal'}
                                            </span>
                                        </td>
                                        <td class="p-2.5 sm:p-3 font-bold text-gray-800 dark:text-gray-200 text-xs">${t.account_id ? (accountMap.get(t.account_id) || 'Capital Account') : 'General Capital'}</td>
                                        <td class="p-2.5 sm:p-3 font-bold text-xs ${isDep ? 'text-emerald-600' : 'text-red-600'}">${window.fmt.currency(t.amount || 0)}</td>
                                        <td class="p-2.5 sm:p-3 text-gray-500 dark:text-gray-400 text-xs">${t.notes || t.reference_no || '-'}</td>
                                    </tr>
                                `;}).join('') : `
                                    <tr>
                                        <td colspan="5" class="py-8 text-center text-gray-400">No capital transactions recorded yet.</td>
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
        console.error('[OwnerCapital] Error loading capital data:', err);
        area.innerHTML = renderModuleOfflineState({
            viewId: 'capital',
            title: 'Capital & Balance Sheet',
            entityName: 'Capital Accounts',
            retryAction: 'window.renderOwnerCapitalModule()'
        });
        if (window.lucide) window.lucide.createIcons();
    }
}

window.setCapitalListFilter = function(filterKey) {
    state._capitalListFilter = filterKey;

    const pillsContainer = document.getElementById('capitalFilterPillsContainer');
    const gridContainer = document.getElementById('capitalAccountsGridContainer');

    if (pillsContainer && gridContainer && window._rawCapitalAccounts) {
        const accounts = window._rawCapitalAccounts || [];
        const branches = window._rawBranches || [];
        const branchMap = new Map(branches.map(b => [b.id, b.name]));

        pillsContainer.innerHTML = renderCapitalFilterPillsHTML(accounts, branches);
        gridContainer.innerHTML = renderCapitalAccountsGridHTML(accounts, branchMap);

        if (window.lucide) window.lucide.createIcons();
    } else {
        window.renderOwnerCapitalModule();
    }
};

window.setCapitalSearch = function(val) {
    state._capitalListSearch = val;

    const gridContainer = document.getElementById('capitalAccountsGridContainer');
    if (gridContainer && window._rawCapitalAccounts) {
        const accounts = window._rawCapitalAccounts || [];
        const branches = window._rawBranches || [];
        const branchMap = new Map(branches.map(b => [b.id, b.name]));

        gridContainer.innerHTML = renderCapitalAccountsGridHTML(accounts, branchMap);

        if (window.lucide) window.lucide.createIcons();
    } else {
        window.renderOwnerCapitalModule();
    }
};

function setupRealtimeCapitalSubscription(ownerId) {
    if (realtimeChannel) return;
    try {
        const handleMutation = (e) => {
            const table = e.detail?.table;
            if (table === 'capital_accounts' || table === 'capital_transactions') {
                if (document.getElementById('mainContent')?.querySelector('[data-view="capital"]') || window.location.hash.includes('capital')) {
                    window.renderOwnerCapitalModule();
                }
            }
        };
        window.addEventListener('bms_data_mutation', handleMutation);
        realtimeChannel = true;
    } catch (e) {
        console.warn('[OwnerCapital] Realtime listener error:', e);
    }
}


export function renderAddCapitalAccountView(editAccountId = null) {
    const area = document.getElementById('mainContent');
    if (!area) return;
    const branches = state.branches || [];
    window._batchCapitalAccountsList = window._batchCapitalAccountsList || [];

    let editAccount = null;
    if (editAccountId) {
        editAccount = (window._rawCapitalAccounts || []).find(a => a.id === editAccountId);
    }

    area.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col font-['Inter',sans-serif]">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <div class="flex items-center gap-3">
                <button type="button" onclick="renderOwnerCapitalModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>Close</span>
                </button>
                <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-base shrink-0 border border-indigo-100 dark:border-indigo-900">
                    <i data-lucide="${editAccount ? 'edit-2' : 'wallet'}" class="w-4 h-4"></i>
                </div>
                <div>
                    <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">
                        ${editAccount ? `Edit Capital Account: ${editAccount.account_name}` : 'Add Capital Account / Till (Single / Batch)'}
                    </h3>
                    <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Configure bank accounts, cash drawers, or mobile money tills</p>
                </div>
            </div>
            ${!editAccount ? `
                <div id="batchCapBadgeCount" class="px-3 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full font-extrabold text-xs">
                    Batch Accounts: ${window._batchCapitalAccountsList.length}
                </div>
            ` : ''}
        </div>

        <!-- Form Body -->
        <form onsubmit="event.preventDefault(); window.handleSaveCapitalAccountBatch('${editAccountId || ''}');" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-6 scroller-custom">
                
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-750 pb-3">
                        <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                            <i data-lucide="${editAccount ? 'edit-3' : 'plus-circle'}" class="w-4 h-4 text-indigo-500"></i> Account Details Entry
                        </h4>
                        ${!editAccount ? `
                            <button type="button" onclick="window.addItemToCapitalBatch()" class="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer border border-indigo-200 dark:border-indigo-900">
                                <i data-lucide="plus" class="w-4 h-4"></i> Add Account to Batch List
                            </button>
                        ` : ''}
                    </div>

                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Account Name *</label>
                        <input type="text" id="capAccName" value="${editAccount ? editAccount.account_name || '' : ''}" class="form-input w-full font-bold" placeholder="e.g. CRDB Main Account, Shop Till 1">
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Account Type *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'capAccType',
                            selectedValue: editAccount ? editAccount.account_type : 'bank',
                            searchable: false,
                            options: [
                                { value: 'bank', label: 'Bank Account', icon: 'building-2' },
                                { value: 'mobile_money', label: 'Mobile Money (M-Pesa / Tigo / Airtel)', icon: 'smartphone' },
                                { value: 'cash', label: 'Cash Till / Drawer', icon: 'banknote' },
                                { value: 'petty_cash', label: 'Petty Cash', icon: 'coins' }
                            ]
                        }) : ''}
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Branch Location (Optional)</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'capAccBranch',
                            selectedValue: editAccount ? (editAccount.branch_id || '') : '',
                            searchable: branches.length > 4,
                            options: [
                                { value: '', label: 'Global (All Branches)', icon: 'globe' },
                                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                            ]
                        }) : ''}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Current Balance (TZS)</label>
                            <input type="text" inputmode="decimal" id="capAccBalance" value="${editAccount && editAccount.balance != null ? editAccount.balance : ''}" class="form-input w-full font-bold" placeholder="e.g. 5000000">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Account Number / Phone / Details (Optional)</label>
                            <input type="text" id="capAccNumber" value="${editAccount ? editAccount.account_number || '' : ''}" class="form-input w-full font-mono" placeholder="e.g. 0745861993, 015024419200">
                        </div>
                    </div>
                </div>

                <!-- Staged Batch Accounts List (Hidden when editing) -->
                ${!editAccount ? `
                    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div class="flex items-center justify-between">
                            <div>
                                <h4 class="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                                    <i data-lucide="layers" class="w-4 h-4 text-indigo-500"></i> Staged Capital Accounts List
                                </h4>
                                <p class="text-xs text-gray-500 dark:text-gray-400">Review accounts in your batch queue before saving</p>
                            </div>
                            ${window._batchCapitalAccountsList.length > 0 ? `
                                <button type="button" onclick="window.clearCapitalBatchList()" class="text-xs text-red-500 font-bold hover:underline">
                                    Clear Batch
                                </button>
                            ` : ''}
                        </div>

                        <div id="batchCapTableContainer" class="overflow-x-auto">
                            ${renderBatchCapitalTableHtml()}
                        </div>
                    </div>
                ` : ''}
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between px-6 z-20">
                <button type="button" onclick="renderOwnerCapitalModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    Cancel
                </button>
                <div class="flex items-center gap-3">
                    ${!editAccount ? `
                        <button type="button" onclick="window.addItemToCapitalBatch()" class="px-5 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full font-bold text-xs hover:bg-gray-200 transition-all cursor-pointer flex items-center gap-1.5">
                            <i data-lucide="plus" class="w-4 h-4"></i> Add to Batch List
                        </button>
                    ` : ''}
                    <button type="submit" id="btnSubmitCapBatch" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                        <span>${editAccount ? 'Update Account Details' : window._batchCapitalAccountsList.length > 0 ? `Save All ${window._batchCapitalAccountsList.length} Accounts` : 'Save Account'}</span>
                    </button>
                </div>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    if (!editAccountId) {
        setTimeout(() => {
            if (window.hydrateFormDraft) window.hydrateFormDraft('ownerCapitalAccountDraft', area);
            if (window.attachFormDraftAutoSave) window.attachFormDraftAutoSave('ownerCapitalAccountDraft', area);
        }, 50);
    }
}

function renderBatchCapitalTableHtml() {
    const list = window._batchCapitalAccountsList || [];
    const branches = state.branches || [];
    const branchMap = new Map(branches.map(b => [b.id, b.name]));

    if (list.length === 0) {
        return `
            <div class="py-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl">
                <i data-lucide="wallet" class="w-8 h-8 text-gray-300 mx-auto mb-1"></i>
                <p class="text-xs text-gray-400 font-medium">No accounts added to batch yet. Fill details above and click "+ Add Account to Batch List"</p>
            </div>
        `;
    }

    let totalOpening = 0;
    list.forEach(i => totalOpening += parseCleanNumber(i.balance));

    return `
        <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-gray-50 dark:bg-gray-900/50 text-gray-500 uppercase text-[10px] font-bold">
                <tr>
                    <th class="p-2.5">#</th>
                    <th class="p-2.5">Account Name</th>
                    <th class="p-2.5">Type</th>
                    <th class="p-2.5">Branch</th>
                    <th class="p-2.5">Opening Balance</th>
                    <th class="p-2.5 text-right">Action</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                ${list.map((item, idx) => `
                    <tr class="hover:bg-gray-50/50">
                        <td class="p-2.5 font-bold text-gray-400">${idx + 1}</td>
                        <td class="p-2.5 font-bold text-gray-900 dark:text-white">${item.account_name}</td>
                        <td class="p-2.5 text-indigo-600 font-bold uppercase">${item.account_type.replace('_', ' ')}</td>
                        <td class="p-2.5 text-gray-500">${item.branch_id ? (branchMap.get(item.branch_id) || 'Branch') : 'Global'}</td>
                        <td class="p-2.5 font-bold text-emerald-600">${window.fmt.currency(item.balance)}</td>
                        <td class="p-2.5 text-right">
                            <button type="button" onclick="window.removeCapitalAccountFromBatch(${idx})" class="p-1 text-red-500 hover:bg-red-50 rounded-lg">
                                <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
            <tfoot class="border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 font-bold text-xs">
                <tr>
                    <td colspan="4" class="p-2.5 text-gray-700 dark:text-gray-300">Total Batch (${list.length} Accounts):</td>
                    <td colspan="2" class="p-2.5 text-emerald-600 font-black">${window.fmt.currency(totalOpening)}</td>
                </tr>
            </tfoot>
        </table>
    `;
}

window.addItemToCapitalBatch = function() {
    const name = document.getElementById('capAccName')?.value?.trim();
    const type = document.getElementById('capAccType')?.value;
    const branchId = document.getElementById('capAccBranch')?.value || null;
    const balance = parseCleanNumber(document.getElementById('capAccBalance')?.value);
    const accNum = document.getElementById('capAccNumber')?.value?.trim();

    if (!name || !type) {
        if (window.showToast) window.showToast('Please enter account name and type before adding to batch list', 'error');
        return;
    }

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    window._batchCapitalAccountsList = window._batchCapitalAccountsList || [];
    window._batchCapitalAccountsList.push({
        owner_id: ownerId,
        branch_id: branchId,
        account_name: name,
        account_type: type,
        balance: balance,
        account_number: accNum
    });

    if (document.getElementById('capAccName')) document.getElementById('capAccName').value = '';
    if (document.getElementById('capAccBalance')) document.getElementById('capAccBalance').value = '';
    if (document.getElementById('capAccNumber')) document.getElementById('capAccNumber').value = '';

    if (window.showToast) window.showToast(`Added "${name}" to batch list!`, 'success');
    window.updateBatchCapitalUI();
};

window.removeCapitalAccountFromBatch = function(index) {
    if (!window._batchCapitalAccountsList) return;
    window._batchCapitalAccountsList.splice(index, 1);
    window.updateBatchCapitalUI();
};

window.clearCapitalBatchList = function() {
    window._batchCapitalAccountsList = [];
    window.updateBatchCapitalUI();
};

window.updateBatchCapitalUI = function() {
    const container = document.getElementById('batchCapTableContainer');
    if (container) container.innerHTML = renderBatchCapitalTableHtml();
    const badge = document.getElementById('batchCapBadgeCount');
    if (badge) badge.innerText = `Batch Accounts: ${(window._batchCapitalAccountsList || []).length}`;
    const btnSubmit = document.getElementById('btnSubmitCapBatch');
    if (btnSubmit) {
        const count = (window._batchCapitalAccountsList || []).length;
        btnSubmit.innerHTML = `<span>${count > 0 ? `Save All ${count} Accounts` : 'Save Account'}</span>`;
    }
    if (window.lucide) window.lucide.createIcons();
};

window.handleSaveCapitalAccountBatch = async function(editAccountId = null) {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const name = document.getElementById('capAccName')?.value?.trim();
    const type = document.getElementById('capAccType')?.value;
    const branchId = document.getElementById('capAccBranch')?.value || null;
    const balance = parseCleanNumber(document.getElementById('capAccBalance')?.value);
    const accNum = document.getElementById('capAccNumber')?.value?.trim();

    if (editAccountId) {
        if (!name || !type) {
            if (window.showToast) window.showToast('Account name and type are required', 'error');
            return;
        }
        try {
            await dbCapital.updateAccount(editAccountId, {
                account_name: name,
                account_type: type,
                branch_id: branchId,
                balance: balance,
                account_number: accNum
            });
            if (window.showToast) window.showToast(`Successfully updated capital account details!`, 'success');
            window.renderOwnerCapitalModule();
        } catch (err) {
            console.error('[UpdateCapitalAccount] Error:', err);
            if (window.showToast) window.showToast('Failed to update account: ' + err.message, 'error');
        }
        return;
    }

    if (name && type) {
        window._batchCapitalAccountsList = window._batchCapitalAccountsList || [];
        window._batchCapitalAccountsList.push({
            owner_id: ownerId,
            branch_id: branchId,
            account_name: name,
            account_type: type,
            balance: balance,
            account_number: accNum
        });
    }

    const items = window._batchCapitalAccountsList || [];
    if (items.length === 0) {
        if (window.showToast) window.showToast('Please enter account details or add items to batch list first', 'error');
        return;
    }

    try {
        for (const item of items) {
            await dbCapital.addAccount(item);
        }
        if (window.showToast) window.showToast(`Successfully saved ${items.length} capital account(s)!`, 'success');
        window._batchCapitalAccountsList = [];
        if (window.clearFormDraft) window.clearFormDraft('ownerCapitalAccountDraft');
        window.renderOwnerCapitalModule();
    } catch (err) {
        console.error('[SaveCapitalAccountBatch] Error:', err);
        if (window.showToast) window.showToast('Failed to save capital accounts: ' + err.message, 'error');
    }
};

export async function renderAddCapitalTransactionView() {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    let accounts = window._rawCapitalAccounts || [];
    if (!accounts || accounts.length === 0) {
        accounts = await dbCapital.fetchAccounts(ownerId).catch(() => []);
        window._rawCapitalAccounts = accounts;
    }

    area.innerHTML = `
    <div class="page-container w-full h-full bg-slate-50/50 dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col font-['Inter',sans-serif]">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderOwnerCapitalModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>Close</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0 border border-emerald-100 dark:border-emerald-900">
                <i data-lucide="arrow-up-down" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">Record Capital Deposit / Withdrawal</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Select target capital account & record deposits or withdrawals</p>
            </div>
        </div>

        <!-- Form Body -->
        <form onsubmit="event.preventDefault(); window.handleSaveCapitalTransaction();" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-3xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Transaction Type *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'capTxType',
                            selectedValue: '',
                            searchable: false,
                            options: [
                                { value: '', label: '-- Select Transaction Type --', icon: 'help-circle' },
                                { value: 'deposit', label: 'Capital Deposit (Owner Depositing Funds into Account)', icon: 'trending-up' },
                                { value: 'withdrawal', label: 'Owner Withdrawal (Owner Withdrawing Funds from Account)', icon: 'arrow-down-right' }
                            ]
                        }) : ''}
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Select Capital Account *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'capTxAccountId',
                            selectedValue: '',
                            searchable: true,
                            options: [
                                { value: '', label: '-- Select Capital Account --', icon: 'wallet' },
                                ...accounts.map(a => ({
                                    value: a.id,
                                    label: `${a.account_name} (${(a.account_type || '').replace('_', ' ').toUpperCase()}) - ${window.fmt.currency(a.balance || 0)}`,
                                    icon: a.account_type === 'bank' ? 'building-2' : a.account_type === 'mobile_money' ? 'smartphone' : 'banknote'
                                }))
                            ]
                        }) : `
                            <select id="capTxAccountId" required class="form-input w-full font-bold">
                                <option value="">-- Select Capital Account --</option>
                                ${accounts.map(a => `<option value="${a.id}">${a.account_name} (${(a.account_type || '').replace('_', ' ').toUpperCase()}) - ${window.fmt.currency(a.balance || 0)}</option>`).join('')}
                            </select>
                        `}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Amount (TZS) *</label>
                            <input type="text" inputmode="decimal" id="capTxAmount" required class="form-input w-full font-black text-indigo-600 dark:text-indigo-400" placeholder="e.g. 5000000">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Transaction Date *</label>
                            <input type="date" id="capTxDate" required class="form-input w-full font-bold" value="${new Date().toISOString().slice(0, 10)}">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1.5">Reference / Remarks</label>
                        <textarea id="capTxNotes" rows="3" class="form-input w-full" placeholder="e.g. Capital deposit from owner equity, profit withdrawal..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="renderOwnerCapitalModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    Cancel
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>Record Transaction</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        if (window.hydrateFormDraft) window.hydrateFormDraft('ownerCapitalTransactionDraft', area);
        if (window.attachFormDraftAutoSave) window.attachFormDraftAutoSave('ownerCapitalTransactionDraft', area);
    }, 50);
}

window.deleteCapitalAccount = async function(id) {
    if (!confirm('Are you sure you want to delete this capital account?')) return;
    try {
        await dbCapital.deleteAccount(id);
        if (window.showToast) window.showToast('Capital account deleted.', 'success');
        window.renderOwnerCapitalModule();
    } catch (e) {
        if (window.showToast) window.showToast('Error deleting account: ' + e.message, 'error');
    }
};

window.handleSaveCapitalTransaction = async function() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const type = document.getElementById('capTxType')?.value;
    const accountId = document.getElementById('capTxAccountId')?.value;
    const amount = parseCleanNumber(document.getElementById('capTxAmount')?.value);
    const date = document.getElementById('capTxDate')?.value;
    const notes = document.getElementById('capTxNotes')?.value?.trim();

    if (!type) {
        if (window.showToast) window.showToast('Please select a transaction type (Deposit or Withdrawal)', 'error');
        return;
    }

    if (!accountId) {
        if (window.showToast) window.showToast('Please select a target capital account', 'error');
        return;
    }

    if (!amount || amount <= 0) {
        if (window.showToast) window.showToast('Please enter a valid transaction amount', 'error');
        return;
    }

    if (!date) {
        if (window.showToast) window.showToast('Please select a transaction date', 'error');
        return;
    }

    try {
        const isDeposit = ['deposit', 'injection', 'inflow'].includes(type);
        const dbTxType = isDeposit ? 'injection' : 'drawing';
        const amountDelta = isDeposit ? amount : -amount;

        // Record transaction using DB constraint valid enum value
        await dbCapital.addTransaction({
            owner_id: ownerId,
            account_id: accountId,
            transaction_type: dbTxType,
            amount: amount,
            transaction_date: date,
            notes: notes
        });

        // Automatically update account balance
        await dbCapital.adjustBalance(accountId, amountDelta);

        if (window.clearFormDraft) window.clearFormDraft('ownerCapitalTransactionDraft');
        if (window.showToast) window.showToast(`Capital ${isDeposit ? 'deposit' : 'withdrawal'} of ${window.fmt.currency(amount)} recorded & account balance updated!`, 'success');
        window.renderOwnerCapitalModule();
    } catch (err) {
        console.error('[SaveCapitalTransaction] Error:', err);
        if (window.showToast) window.showToast('Failed to record transaction: ' + err.message, 'error');
    }
};

window.openAddCapitalAccountModal = renderAddCapitalAccountView;
window.renderAddCapitalAccountView = renderAddCapitalAccountView;
window.openAddCapitalTransactionModal = renderAddCapitalTransactionView;
window.renderAddCapitalTransactionView = renderAddCapitalTransactionView;
window.renderOwnerCapitalModule = renderOwnerCapitalModule;
