
import { state } from '../state.js';
import { fmt, showToast, renderPremiumLoader } from '../utils.js';

export async function renderCashDrawerModule() {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader(window.t('loading', 'Loading till & cash data...'));
    lucide.createIcons();

    try {
        const today = new Date().toISOString().slice(0, 10);

        const { data: drawerArr, error } = await supabaseClient
            .from('cash_drawer')
            .select('*')
            .eq('branch_id', state.branchId)
            .eq('date', today)
            .order('created_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        const drawer = (drawerArr || [])[0] || null;

        const [salesRes, cashSalesRes] = await Promise.all([
            supabaseClient.from('sales').select('amount, payment_method').eq('branch_id', state.branchId).gte('created_at', today),
            supabaseClient.from('expenses').select('amount').eq('branch_id', state.branchId).gte('created_at', today)
        ]);

        const allSales = salesRes.data || [];
        const dailySales = allSales.reduce((s, r) => s + Number(r.amount), 0);
        const cashSales = allSales.filter(r => (r.payment_method || r.payment) === 'cash').reduce((s, r) => s + Number(r.amount), 0);
        const dailyExpenses = (cashSalesRes.data || []).reduce((s, r) => s + Number(r.amount), 0);

        let cashTx = [];
        if (drawer) {
            const { data: txData } = await supabaseClient
                .from('cash_transactions')
                .select('*')
                .eq('drawer_id', drawer.id)
                .order('created_at', { ascending: true });
            cashTx = txData || [];
        }

        const cashIn = cashTx.filter(t => t.type === 'in').reduce((s, t) => s + Number(t.amount), 0);
        const cashOut = cashTx.filter(t => t.type === 'out').reduce((s, t) => s + Number(t.amount), 0);
        const openingFloat = drawer ? Number(drawer.opening_float) : 0;
        const expectedCash = drawer ? (openingFloat + cashSales + cashIn - cashOut) : 0;

        const isOpen = drawer && drawer.status === 'open';
        const isClosed = drawer && drawer.status === 'closed';
        const variance = drawer?.closing_cash != null ? (Number(drawer.closing_cash) - expectedCash) : null;

        const variantClass = variance === null ? '' : variance === 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : variance > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

        const variantBg = variance === null ? 'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700'
            : variance === 0 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/40'
            : variance > 0 ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/40'
            : 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/40';

        container.innerHTML = `
        <div class="space-y-4 slide-in" id="cashDrawerShell">

            <!-- Header -->
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-1 pr-5">
                    <div class="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <i data-lucide="banknote" class="w-4 h-4"></i>
                        ${window.t('till_reconciliation_title', 'End-of-Day Till Reconciliation')}
                    </div>
                    <span class="text-xs font-bold ${isOpen ? 'text-emerald-600 dark:text-emerald-400' : isClosed ? 'text-gray-400' : 'text-gray-400'}">
                        ${isOpen ? '● ' + window.t('drawer_status_open', 'Till Open') : isClosed ? '● ' + window.t('drawer_status_closed', 'Till Closed') : '● ' + window.t('till_not_open', 'Not Opened')}
                    </span>
                </div>

                <div class="flex items-center gap-2">
                    ${!drawer ? `
                    <button onclick="openDrawerSession()" class="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm">
                        <i data-lucide="lock-open" class="w-4 h-4"></i>
                        ${window.t('reopen_drawer', 'Open Till')}
                    </button>` : isOpen ? `
                    <button onclick="openCashTxModal('in')" class="flex items-center gap-2 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
                        <i data-lucide="plus-circle" class="w-4 h-4"></i> Cash In
                    </button>
                    <button onclick="openCashTxModal('out')" class="flex items-center gap-2 px-3 py-2 bg-rose-600 text-white rounded-xl text-sm font-bold hover:bg-rose-700 transition-all">
                        <i data-lucide="minus-circle" class="w-4 h-4"></i> Cash Out
                    </button>
                    <button onclick="renderTillReconciliationView('${drawer.id}', ${expectedCash})" class="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-100 dark:text-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 dark:hover:bg-white transition-all shadow-sm">
                        <i data-lucide="calculator" class="w-4 h-4"></i>
                        ${window.t('close_till', 'Close Till & Reconcile')}
                    </button>` : ``}
                </div>
            </div>

            <!-- KPI Summary Grid -->
            <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
                <div class="relative bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('opening_float', 'Opening Float')}</p>
                    <p class="text-xl font-black text-gray-900 dark:text-white mt-1 leading-tight">${fmt.number(openingFloat)}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('cash_sales_today', 'Cash Sales Today')}</p>
                    <p class="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 leading-tight">${fmt.number(cashSales)}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-4 py-3.5 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('expected_cash', 'Expected Cash')}</p>
                    <p class="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 leading-tight">${fmt.number(expectedCash)}</p>
                </div>
                <div class="relative px-4 py-3.5 rounded-2xl border shadow-sm stat-card ${variantBg} min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs uppercase tracking-tight font-bold whitespace-normal break-words leading-tight ${variantClass || 'text-gray-400 dark:text-gray-500'}">${window.t('variance_label', 'Variance')}</p>
                    <p class="text-xl font-black mt-1 leading-tight ${variantClass || 'text-gray-300 dark:text-gray-600'}">
                        ${variance !== null ? `${variance >= 0 ? '+' : ''}${fmt.number(variance)}` : '—'}
                    </p>
                    ${isClosed && variance !== null ? `<p class="text-[10px] font-bold mt-0.5 ${variantClass}">
                        ${variance === 0 ? window.t('no_discrepancy', 'Balanced') : variance > 0 ? window.t('over_by', 'Over by') + ' ' + fmt.currency(Math.abs(variance)) : window.t('short_by', 'Short by') + ' ' + fmt.currency(Math.abs(variance))}
                    </p>` : ''}
                </div>
            </div>

            ${isClosed && drawer?.closing_cash != null ? `
            <!-- Closed Till Summary Banner -->
            <div class="bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-5">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                        <i data-lucide="lock" class="w-5 h-5 text-gray-500 dark:text-gray-400"></i>
                    </div>
                    <div>
                        <h3 class="font-black text-gray-900 dark:text-white text-sm">${window.t('till_close_report', 'Till Close Report')}</h3>
                        <p class="text-xs text-gray-500 dark:text-gray-400">${window.t('till_already_closed', "Today's till is already closed.")}</p>
                    </div>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('opening_float', 'Opening Float')}</p>
                        <p class="font-black text-gray-900 dark:text-white">${fmt.currency(openingFloat)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('expected_cash', 'Expected')}</p>
                        <p class="font-black text-indigo-600 dark:text-indigo-400">${fmt.currency(expectedCash)}</p>
                    </div>
                    <div class="bg-white dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
                        <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('closing_count', 'Counted')}</p>
                        <p class="font-black text-gray-900 dark:text-white">${fmt.currency(drawer.closing_cash)}</p>
                    </div>
                </div>
                ${drawer.discrepancy_note ? `
                <div class="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-xl">
                    <p class="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">${window.t('discrepancy_note', 'Discrepancy Note')}</p>
                    <p class="text-sm text-amber-900 dark:text-amber-300 italic">${drawer.discrepancy_note}</p>
                </div>` : ''}
            </div>` : ''}

            <!-- Cash Movements Ledger -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                    <h3 class="font-bold text-gray-900 dark:text-white text-sm">${window.t('payment_history', 'Cash Movements')}</h3>
                    <span class="text-xs text-gray-400 font-medium">${cashTx.length} ${window.t('txns', 'transactions')}</span>
                </div>
                ${cashTx.length === 0 ? `
                <div class="py-12 text-center text-gray-400">
                    <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-30"></i>
                    <p class="text-sm font-medium">${drawer ? window.t('no_payments_yet', 'No cash movements yet') : window.t('till_not_open', 'Open the till to start tracking')}</p>
                </div>` : `
                <div class="divide-y divide-gray-50 dark:divide-gray-700/50">
                    ${cashTx.map(t => `
                    <div class="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <div class="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${t.type === 'in' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30'}">
                            <i data-lucide="${t.type === 'in' ? 'arrow-down-left' : 'arrow-up-right'}" class="w-4 h-4 ${t.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}"></i>
                        </div>
                        <div class="flex-1 min-w-0">
                            <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">${t.reason || (t.type === 'in' ? 'Cash In' : 'Cash Out')}</p>
                            <p class="text-xs text-gray-400">${fmt.dateTime(t.created_at)}</p>
                        </div>
                        <span class="font-black text-sm ${t.type === 'in' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">${t.type === 'in' ? '+' : '-'}${fmt.currency(t.amount)}</span>
                    </div>`).join('')}
                </div>`}
            </div>
        </div>`;
        lucide.createIcons();
    } catch (err) {
        document.getElementById('mainContent').innerHTML = `<div class="py-20 text-center text-red-500">Failed: ${err.message}</div>`;
    }
}

// ─── Reconciliation Full Page View ────────────────────────────────────────────

window.renderTillReconciliationView = function (drawerId, expectedCash) {
    const container = document.getElementById('mainContent');
    const formula = `${window.t('opening_float', 'Opening Float')} + ${window.t('cash_sales_today', 'Cash Sales')} + Cash In − Cash Out`;

    container.innerHTML = `
    <div class="space-y-5 slide-in" id="tillReconcileView">

        <!-- Back Header -->
        <div class="flex items-center gap-3">
            <button onclick="renderCashDrawerModule()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                <i data-lucide="arrow-left" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
            </button>
            <div>
                <h2 class="text-base font-black text-gray-900 dark:text-white">${window.t('close_till', 'Close Till & Reconcile')}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">${window.t('till_reconciliation_sub', 'Count physical cash and close today\'s shift.')}</p>
            </div>
        </div>

        <!-- Expected Cash Formula Card -->
        <div class="bg-indigo-600 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200 dark:shadow-indigo-900/30">
            <p class="text-xs text-indigo-200 font-bold uppercase tracking-wider mb-1">${window.t('expected_cash', 'Expected Cash in Drawer')}</p>
            <p class="text-3xl font-black">${fmt.currency(expectedCash)}</p>
            <p class="text-xs text-indigo-200 mt-2 font-medium">${formula}</p>
        </div>

        <!-- Physical Count Input -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <h3 class="font-bold text-gray-900 dark:text-white text-sm">${window.t('closing_count', 'Physical Cash Count')}</h3>

            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('closing_count', 'Cash Counted in Drawer')}</label>
                <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">TZS</span>
                    <input type="number" id="tillClosingAmount" min="0" step="0.01"
                        placeholder="${window.t('closing_count_placeholder', 'Enter total cash in drawer...')}"
                        oninput="window.updateTillVariancePreview(${expectedCash})"
                        class="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white text-gray-900 transition-all">
                </div>
            </div>

            <!-- Live Variance Preview -->
            <div id="variancePreview" class="hidden p-4 rounded-xl border transition-all">
                <div class="flex items-center justify-between">
                    <p class="text-xs font-bold uppercase tracking-wider" id="variancePreviewLabel">${window.t('variance_label', 'Variance')}</p>
                    <p class="text-lg font-black" id="variancePreviewValue">—</p>
                </div>
                <p class="text-xs mt-1" id="variancePreviewMsg"></p>
            </div>

            <!-- Discrepancy Note -->
            <div id="discrepancyNoteSection" class="hidden">
                <label class="block text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1.5">
                    <i data-lucide="alert-triangle" class="w-3.5 h-3.5 inline mr-1"></i>
                    ${window.t('discrepancy_note', 'Discrepancy Explanation')} <span class="text-red-500">*</span>
                </label>
                <textarea id="tillDiscrepancyNote" rows="3"
                    placeholder="${window.t('discrepancy_placeholder', 'Explain the cash variance (required when over/short)...')}"
                    class="w-full px-4 py-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/40 rounded-xl text-sm font-medium focus:ring-2 focus:ring-red-500 outline-none dark:text-white text-gray-900 resize-none transition-all"></textarea>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pb-6">
            <button onclick="renderCashDrawerModule()" class="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                ${window.t('cancel', 'Cancel')}
            </button>
            <button onclick="window.submitTillClose('${drawerId}', ${expectedCash})"
                class="flex-1 py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl text-sm font-bold hover:bg-gray-700 dark:hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-sm">
                <i data-lucide="lock" class="w-4 h-4"></i>
                ${window.t('close_till', 'Close Till & Reconcile')}
            </button>
        </div>
    </div>`;
    lucide.createIcons();
};

// ─── Live Variance Preview ─────────────────────────────────────────────────────

window.updateTillVariancePreview = function (expectedCash) {
    const input = document.getElementById('tillClosingAmount');
    const preview = document.getElementById('variancePreview');
    const valEl = document.getElementById('variancePreviewValue');
    const labelEl = document.getElementById('variancePreviewLabel');
    const msgEl = document.getElementById('variancePreviewMsg');
    const discrepancySection = document.getElementById('discrepancyNoteSection');

    const counted = parseFloat(input?.value || '0') || 0;
    if (!input?.value) { preview?.classList.add('hidden'); return; }

    const variance = counted - expectedCash;
    const absVar = Math.abs(variance);

    preview?.classList.remove('hidden');

    if (variance === 0) {
        preview.className = 'p-4 rounded-xl border transition-all bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900/30';
        labelEl.className = 'text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400';
        valEl.className = 'text-lg font-black text-emerald-600 dark:text-emerald-400';
        valEl.textContent = window.t('no_discrepancy', 'Balanced');
        msgEl.textContent = '';
        discrepancySection?.classList.add('hidden');
    } else if (variance > 0) {
        preview.className = 'p-4 rounded-xl border transition-all bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30';
        labelEl.className = 'text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400';
        valEl.className = 'text-lg font-black text-blue-600 dark:text-blue-400';
        valEl.textContent = '+' + fmt.currency(absVar);
        msgEl.className = 'text-xs mt-1 text-blue-500 dark:text-blue-400 font-medium';
        msgEl.textContent = window.t('over_by', 'Over by') + ' ' + fmt.currency(absVar);
        discrepancySection?.classList.remove('hidden');
    } else {
        preview.className = 'p-4 rounded-xl border transition-all bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30';
        labelEl.className = 'text-xs font-bold uppercase tracking-wider text-red-600 dark:text-red-400';
        valEl.className = 'text-lg font-black text-red-600 dark:text-red-400';
        valEl.textContent = '-' + fmt.currency(absVar);
        msgEl.className = 'text-xs mt-1 text-red-500 dark:text-red-400 font-medium';
        msgEl.textContent = window.t('short_by', 'Short by') + ' ' + fmt.currency(absVar);
        discrepancySection?.classList.remove('hidden');
    }

    if (window.lucide) lucide.createIcons();
};

// ─── Submit Till Close ─────────────────────────────────────────────────────────

window.submitTillClose = async function (drawerId, expectedCash) {
    const countedRaw = document.getElementById('tillClosingAmount')?.value?.trim();
    if (!countedRaw) { showToast(window.t('closing_count_placeholder', 'Enter the physical cash count first.'), 'error'); return; }

    const closingCash = parseFloat(countedRaw) || 0;
    const variance = closingCash - expectedCash;

    if (variance !== 0) {
        const note = document.getElementById('tillDiscrepancyNote')?.value?.trim();
        if (!note) {
            showToast(window.t('discrepancy_placeholder', 'Discrepancy explanation is required.'), 'error');
            document.getElementById('tillDiscrepancyNote')?.focus();
            return;
        }
    }

    const discrepancyNote = document.getElementById('tillDiscrepancyNote')?.value?.trim() || null;

    try {
        // 1. Update cash_drawer record
        const { error: drawerErr } = await supabaseClient.from('cash_drawer').update({
            status: 'closed',
            closing_cash: closingCash,
            expected_cash: expectedCash,
            discrepancy_note: discrepancyNote,
            closed_at: new Date().toISOString()
        }).eq('id', drawerId);

        if (drawerErr) throw drawerErr;

        // 2. Send till close summary to owner via requests table
        const branch = state.branches?.find(b => b.id === state.branchId);
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        const varianceText = variance === 0
            ? window.t('no_discrepancy', 'Balanced — no discrepancy')
            : variance > 0 ? `${window.t('over_by', 'Over by')} ${fmt.currency(Math.abs(variance))}`
            : `${window.t('short_by', 'Short by')} ${fmt.currency(Math.abs(variance))}`;

        const summaryMsg = `${window.t('till_close_report', 'Till Close Report')} — ${today}\n\n` +
            `${window.t('branch', 'Branch')}: ${branch?.name || 'Branch'}\n` +
            `${window.t('expected_cash', 'Expected Cash')}: ${fmt.currency(expectedCash)}\n` +
            `${window.t('closing_count', 'Physical Count')}: ${fmt.currency(closingCash)}\n` +
            `${window.t('variance_label', 'Variance')}: ${varianceText}\n` +
            (discrepancyNote ? `\n${window.t('discrepancy_note', 'Explanation')}: ${discrepancyNote}` : '');

        await supabaseClient.from('requests').insert({
            branch_id: state.branchId,
            owner_id: state.ownerId || state.ownerIdForBranch,
            subject: `${window.t('till_close_report', 'Till Close Report')} — ${today}`,
            message: summaryMsg,
            type: 'till_close_summary',
            status: 'pending',
            metadata: {
                expected_cash: expectedCash,
                closing_cash: closingCash,
                variance,
                discrepancy_note: discrepancyNote
            }
        });

        showToast(window.t('till_close_success', 'Till closed. Summary sent to owner.'), 'success');
        renderCashDrawerModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ─── Open Drawer Session ───────────────────────────────────────────────────────

window.openDrawerSession = async function () {
    const float = await promptModal(
        window.t('reopen_drawer', 'Open Till'),
        window.t('opening_float', 'Enter opening float (cash to start with):'),
        window.t('eg_amount', '0.00')
    );
    if (float === null) return;
    const amount = parseFloat(float) || 0;
    if (!amount || amount <= 0) {
        showToast('Opening float amount must be greater than 0 to open till.', 'warning');
        return;
    }
    try {
        const { error } = await supabaseClient.from('cash_drawer').insert({
            branch_id: state.branchId,
            date: new Date().toISOString().slice(0, 10),
            opening_float: amount,
            status: 'open'
        });
        if (error) throw error;
        showToast(`${window.t('drawer_status_open', 'Till opened with')} ${fmt.currency(amount)}`, 'success');
        renderCashDrawerModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ─── Cash In / Out Modal ───────────────────────────────────────────────────────

window.openCashTxModal = function (type) {
    const isIn = type === 'in';
    const mainContent = document.getElementById('mainContent');

    mainContent.innerHTML = `
    <div class="space-y-5 slide-in">
        <!-- Back Header -->
        <div class="flex items-center gap-3">
            <button onclick="renderCashDrawerModule()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 transition-all shadow-sm">
                <i data-lucide="arrow-left" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
            </button>
            <h2 class="text-base font-black text-gray-900 dark:text-white">${isIn ? 'Cash In' : 'Cash Out'}</h2>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('payment_amount', 'Amount')} *</label>
                <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">TZS</span>
                    <input type="number" id="txAmount" class="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" placeholder="${window.t('eg_amount', '0.00')}" min="0.01">
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('restock_reason', 'Reason')} *</label>
                ${window.renderPremiumSelect({
                    id: 'txReason',
                    selectedValue: isIn ? 'owner_deposit' : 'operating_expense',
                    searchable: false,
                    options: isIn ? [
                        { value: 'owner_deposit', label: 'Owner Deposit', icon: 'user' },
                        { value: 'loan_repayment', label: 'Loan Repayment', icon: 'banknote' },
                        { value: 'refund', label: 'Refund Received', icon: 'undo' },
                        { value: 'other', label: window.t('other', 'Other'), icon: 'more-horizontal' }
                    ] : [
                        { value: 'operating_expense', label: 'Operating Expense', icon: 'receipt' },
                        { value: 'petty_cash', label: 'Petty Cash', icon: 'coins' },
                        { value: 'supplier_payment', label: 'Supplier Payment', icon: 'truck' },
                        { value: 'other', label: window.t('other', 'Other'), icon: 'more-horizontal' }
                    ]
                })}
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('notes', 'Note')} <span class="font-normal text-gray-400 lowercase">(${window.t('description_optional', 'optional')})</span></label>
                <input type="text" id="txNote" class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white" placeholder="${window.t('optional_notes', 'Optional description...')}">
            </div>
        </div>

        <div class="flex gap-3 pb-6">
            <button onclick="renderCashDrawerModule()" class="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                ${window.t('cancel', 'Cancel')}
            </button>
            <button onclick="submitCashTransaction('${type}')" class="flex-1 py-3 ${isIn ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'} text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all">
                <i data-lucide="${isIn ? 'plus-circle' : 'minus-circle'}" class="w-4 h-4"></i>
                ${window.t('save', 'Record')}
            </button>
        </div>
    </div>`;
    lucide.createIcons();
};

window.submitCashTransaction = async function (type) {
    const amount = parseFloat(document.getElementById('txAmount')?.value || '0');
    const reason = document.getElementById('txReason')?.value;
    const note = document.getElementById('txNote')?.value?.trim();
    if (!amount || amount <= 0) { showToast(window.t('payment_amount_placeholder', 'Enter a valid amount'), 'error'); return; }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const { data: drawerArr } = await supabaseClient.from('cash_drawer').select('id').eq('branch_id', state.branchId).eq('date', today).eq('status', 'open').limit(1);
        const drawerId = drawerArr?.[0]?.id;
        if (!drawerId) { showToast(window.t('till_not_open', 'No open till session found'), 'error'); return; }

        const { error } = await supabaseClient.from('cash_transactions').insert({
            drawer_id: drawerId, branch_id: state.branchId, type, amount, reason: note || reason
        });
        if (error) throw error;
        showToast(`${type === 'in' ? 'Cash In' : 'Cash Out'}: ${fmt.currency(amount)}`, 'success');
        renderCashDrawerModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ─── Quick Open Till Modal & Auto Login Check ──────────────────────────────

window.openQuickTillModal = function () {
    const existing = document.getElementById('quickTillModalOverlay');
    if (existing) existing.remove();

    const todayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const branchName = state.branchProfile?.name || 'Branch';

    const html = `
    <div id="quickTillModalOverlay" class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md fade-in">
        <div class="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-md overflow-hidden transform transition-all animate-in zoom-in-95 duration-200">
            <!-- Header Accent Bar -->
            <div class="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>

            <div class="p-6 sm:p-7">
                <!-- Header Icon & Title -->
                <div class="flex items-start justify-between gap-4 mb-5">
                    <div class="flex items-center gap-3">
                        <div class="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/50 shadow-xs">
                            <i data-lucide="banknote" class="w-6 h-6"></i>
                        </div>
                        <div>
                            <h3 class="text-lg font-black text-gray-900 dark:text-white leading-tight">Start Shift & Open Till</h3>
                            <p class="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">${todayStr} • ${branchName}</p>
                        </div>
                    </div>
                    <button type="button" onclick="closeQuickTillModal()" class="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-4 mb-5 flex items-start gap-3">
                    <i data-lucide="info" class="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5"></i>
                    <p class="text-xs text-emerald-900 dark:text-emerald-300/90 font-medium leading-relaxed">
                        Enter your starting cash float in the drawer to begin today's shift. All cash sales will be tracked against this opening balance.
                    </p>
                </div>

                <!-- Cash Float Input -->
                <div class="space-y-3 mb-6">
                    <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Opening Float Amount (TZS)
                    </label>
                    <div class="relative">
                        <span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm">TZS</span>
                        <input type="number" id="quickTillFloatInput" autofocus min="0" step="1000" placeholder="0.00"
                            class="w-full pl-16 pr-4 py-3.5 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded-2xl text-base font-black text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all shadow-xs">
                    </div>

                    <!-- Quick Preset Amount Pills -->
                    <div class="flex items-center gap-2 flex-wrap pt-1">
                        <button type="button" onclick="setQuickTillFloat('clear')" class="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">Clear</button>
                        <button type="button" onclick="setQuickTillFloat(10000)" class="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">+10,000</button>
                        <button type="button" onclick="setQuickTillFloat(50000)" class="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">+50,000</button>
                        <button type="button" onclick="setQuickTillFloat(100000)" class="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-600 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 transition-colors">+100,000</button>
                    </div>
                </div>

                <!-- Action Buttons -->
                <div class="flex items-center gap-3">
                    <button type="button" onclick="closeQuickTillModal()" class="w-1/3 py-3.5 px-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl text-xs font-extrabold transition-all text-center">
                        Skip for Now
                    </button>
                    <button type="button" onclick="submitQuickOpenTill()" class="w-2/3 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-extrabold transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 active:scale-98">
                        <i data-lucide="lock-open" class="w-4 h-4"></i>
                        Open Till & Start Shift
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    if (window.lucide) window.lucide.createIcons();
};

window.closeQuickTillModal = function () {
    const el = document.getElementById('quickTillModalOverlay');
    if (el) el.remove();
};

window.setQuickTillFloat = function (val) {
    const input = document.getElementById('quickTillFloatInput');
    if (!input) return;
    if (val === 'clear') {
        input.value = '';
    } else {
        const cur = parseFloat(input.value || '0');
        input.value = (cur + val).toString();
    }
    input.classList.remove('border-red-500', 'ring-2', 'ring-red-400');
};

window.submitQuickOpenTill = async function () {
    const input = document.getElementById('quickTillFloatInput');
    const amount = parseFloat(input?.value || '0') || 0;
    const branchId = state.branchId || (state.branchProfile && state.branchProfile.id);

    if (!amount || amount <= 0) {
        showToast('Opening float amount must be greater than 0 to open till.', 'warning');
        if (input) {
            input.focus();
            input.classList.add('border-red-500', 'ring-2', 'ring-red-400');
        }
        return;
    }

    if (!branchId) {
        showToast('Branch profile not loaded.', 'error');
        return;
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const { error } = await window.supabaseClient.from('cash_drawer').insert({
            branch_id: branchId,
            date: today,
            opening_float: amount,
            status: 'open'
        });

        if (error) throw error;

        closeQuickTillModal();
        showToast(`Till opened with ${fmt.currency(amount)}! Shift started.`, 'success');

        if (state.activeView === 'cash_drawer' && typeof window.renderCashDrawerModule === 'function') {
            window.renderCashDrawerModule();
        } else if (typeof window.renderBranchDashboard === 'function') {
            window.renderBranchDashboard();
        }
    } catch (err) {
        showToast('Failed to open till: ' + err.message, 'error');
    }
};

window.checkAndShowQuickOpenTillModal = async function (force = false) {
    if (state.role !== 'branch') return;
    const branchId = state.branchId || (state.branchProfile && state.branchProfile.id);
    if (!branchId) return;

    const today = new Date().toISOString().slice(0, 10);
    const sessionKey = `bms_till_checked_${today}_${branchId}`;

    if (!force && sessionStorage.getItem(sessionKey)) {
        return;
    }

    sessionStorage.setItem(sessionKey, 'true');

    try {
        const { data } = await window.supabaseClient
            .from('cash_drawer')
            .select('id, status')
            .eq('branch_id', branchId)
            .eq('date', today)
            .eq('status', 'open')
            .limit(1);

        if (!data || data.length === 0) {
            setTimeout(() => {
                window.openQuickTillModal();
            }, 400);
        }
    } catch (err) {
        console.warn('[Till Check Error]:', err);
    }
};

window.triggerOpenTillAction = async function () {
    const branchId = state.branchId || (state.branchProfile && state.branchProfile.id);
    if (!branchId) {
        window.openQuickTillModal();
        return;
    }

    try {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await window.supabaseClient
            .from('cash_drawer')
            .select('id, status')
            .eq('branch_id', branchId)
            .eq('date', today)
            .eq('status', 'open')
            .limit(1);

        if (data && data.length > 0) {
            showToast('Till is currently open for today.', 'info');
            if (typeof window.switchView === 'function') {
                window.switchView('cash_drawer');
            }
        } else {
            window.openQuickTillModal();
        }
    } catch (err) {
        window.openQuickTillModal();
    }
};
