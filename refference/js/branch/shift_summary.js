
export async function renderShiftSummaryModule() {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader('Loading shift summary...');
    lucide.createIcons();

    try {
        const today = new Date().toISOString().slice(0, 10);

        const [salesRes, expRes, attRes, drawerRes] = await Promise.all([
            supabaseClient.from('sales').select('amount, payment').eq('branch_id', state.branchId).gte('created_at', today),
            supabaseClient.from('expenses').select('amount, category').eq('branch_id', state.branchId).gte('created_at', today),
            supabaseClient.from('attendance').select('staff_name, status, clock_in, clock_out').eq('branch_id', state.branchId).eq('date', today),
            supabaseClient.from('cash_drawer').select('opening_float, closing_cash, expected_cash, status').eq('branch_id', state.branchId).eq('date', today).limit(1)
        ]);

        const sales = salesRes.data || [];
        const expenses = expRes.data || [];
        const attendance = attRes.data || [];
        const drawer = (drawerRes.data || [])[0];

        const totalSales = sales.reduce((s, r) => s + Number(r.amount), 0);
        const totalExpenses = expenses.reduce((s, r) => s + Number(r.amount), 0);
        const netCash = totalSales - totalExpenses;

        const cashSales = sales.filter(s => (s.payment || s.payment_method) === 'cash').reduce((s, r) => s + Number(r.amount), 0);
        const cardSales = sales.filter(s => (s.payment || s.payment_method) === 'card').reduce((s, r) => s + Number(r.amount), 0);
        const mobileSales = sales.filter(s => (s.payment || s.payment_method) === 'mobile').reduce((s, r) => s + Number(r.amount), 0);

        const presentStaff = attendance.filter(a => a.status !== 'absent');

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2 bg-white border border-gray-200 shadow-sm rounded-2xl p-1 pr-5">
                    <div class="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider">${window.t('shift_summary_title', 'Shift Summary')}</div>
                    <span class="text-xs text-gray-400 font-medium">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
                </div>
                <button onclick="submitShiftSummary()" class="flex items-center gap-2 px-5 py-2.5 bg-[#475B6E] hover:bg-[#394958] text-white rounded-xl text-sm font-bold shadow-lg transition-all">
                    <i data-lucide="send" class="w-4 h-4"></i> ${window.t('btn_send_summary_owner', 'Send Summary to Owner')}
                </button>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-2">
                <div class="relative bg-gradient-to-br from-emerald-500 to-green-600 px-4 py-3 rounded-2xl text-white shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-900 text-emerald-300 border border-slate-700 shadow-xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-emerald-100 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_sales_shift', 'Total Sales')}</p>
                    <p class="text-xl sm:text-2xl font-black mt-1 leading-tight">${fmt.number(totalSales)}</p>
                    <p class="text-xs text-emerald-200 mt-0.5">${sales.length} transactions</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('expenses_shift', 'Expenses')}</p>
                    <p class="text-2xl font-black text-red-600 dark:text-red-400 mt-1 leading-tight">${fmt.number(totalExpenses)}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${expenses.length} items</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('net_cash_shift', 'Net Cash')}</p>
                    <p class="text-2xl font-black mt-1 leading-tight ${netCash >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-red-600 dark:text-red-400'}">${fmt.number(netCash)}</p>
                </div>
                <div class="bg-white dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('staff_present_shift', 'Staff Present')}</p>
                    <p class="text-2xl font-black text-gray-900 dark:text-white mt-1">${presentStaff.length}</p>
                    <p class="text-xs text-gray-400 mt-0.5">${attendance.length} total marked</p>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <!-- Payment Breakdown -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 class="font-bold text-gray-900 mb-4">${window.t('payment_breakdown_title', 'Payment Breakdown')}</h3>
                    <div class="space-y-3">
                        ${[
                { label: window.t('cash_sales', 'Cash'), value: cashSales, icon: 'banknote', color: 'bg-emerald-500' },
                { label: window.t('digital_sales', 'Card'), value: cardSales, icon: 'credit-card', color: 'bg-blue-500' },
                { label: 'Mobile', value: mobileSales, icon: 'smartphone', color: 'bg-violet-500' }
            ].map(p => {
                const pct = totalSales > 0 ? Math.round(p.value / totalSales * 100) : 0;
                return `
                            <div>
                                <div class="flex items-center justify-between mb-1.5">
                                    <span class="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
                                        <i data-lucide="${p.icon}" class="w-4 h-4 text-gray-500"></i>
                                        <span>${p.label}</span>
                                    </span>
                                    <span class="text-sm font-black text-gray-900">${fmt.currency(p.value)}</span>
                                </div>
                                <div class="w-full bg-gray-100 rounded-full h-2">
                                    <div class="${p.color} h-2 rounded-full" style="width:${pct}%"></div>
                                </div>
                                <p class="text-xs text-gray-400 text-right mt-0.5">${pct}%</p>
                            </div>`;
            }).join('')}
                    </div>
                </div>

                <!-- Cash Drawer Status -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                    <h3 class="font-bold text-gray-900 mb-4">${window.t('cash_drawer_title', 'Cash Drawer')}</h3>
                    ${drawer ? `
                    <div class="space-y-3">
                        <div class="flex justify-between items-center py-2 border-b border-gray-50">
                            <span class="text-sm text-gray-500">${window.t('opening_float', 'Opening Float')}</span>
                            <span class="font-bold text-gray-900">${fmt.currency(drawer.opening_float || 0)}</span>
                        </div>
                        ${drawer.status === 'closed' ? `
                        <div class="flex justify-between items-center py-2 border-b border-gray-50">
                            <span class="text-sm text-gray-500">${window.t('expected_cash', 'Expected')}</span>
                            <span class="font-bold text-gray-900">${fmt.currency(drawer.expected_cash || 0)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2 border-b border-gray-50">
                            <span class="text-sm text-gray-500">${window.t('counted_cash', 'Counted')}</span>
                            <span class="font-bold text-gray-900">${fmt.currency(drawer.closing_cash || 0)}</span>
                        </div>
                        <div class="flex justify-between items-center py-2">
                            <span class="text-sm font-bold ${(drawer.closing_cash - drawer.expected_cash) >= 0 ? 'text-emerald-600' : 'text-red-600'}">${window.t('cash_variance', 'Variance')}</span>
                            <span class="font-black text-lg ${(drawer.closing_cash - drawer.expected_cash) >= 0 ? 'text-emerald-600' : 'text-red-600'}">${drawer.closing_cash >= drawer.expected_cash ? '+' : ''}${fmt.currency(drawer.closing_cash - drawer.expected_cash)}</span>
                        </div>` : `
                        <div class="py-4 text-center">
                            <div class="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                <i data-lucide="alert-triangle" class="w-5 h-5 text-amber-600"></i>
                            </div>
                            <p class="text-sm font-semibold text-gray-700">${window.t('drawer_still_open', 'Drawer still open')}</p>
                            <p class="text-xs text-gray-400 mt-1">Close the drawer before sending summary</p>
                        </div>`}
                    </div>` : `
                    <div class="py-8 text-center text-gray-400">
                        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 opacity-30"></i>
                        <p class="text-sm font-medium">No drawer session today</p>
                        <p class="text-xs mt-1">Open the Cash Drawer module to start tracking</p>
                    </div>`}
                </div>

                <!-- Staff on Duty -->
                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
                    <h3 class="font-bold text-gray-900 mb-4">${window.t('staff_on_duty', 'Staff on Duty Today')}</h3>
                    ${attendance.length === 0 ? `
                    <div class="py-6 text-center text-gray-400">
                        <i data-lucide="users" class="w-8 h-8 mx-auto mb-2 opacity-20"></i>
                        <p class="text-sm font-medium">No attendance records for today</p>
                    </div>` : `
                    <div class="flex flex-wrap gap-2">
                        ${attendance.map(a => `
                        <div class="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm ${a.status === 'absent' ? 'bg-red-50 border-red-100 text-red-700' : a.status === 'late' ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-emerald-50 border-emerald-100 text-emerald-700'}">
                            <span class="font-black text-xs">${a.staff_name.charAt(0).toUpperCase()}</span>
                            <span class="font-medium">${a.staff_name}</span>
                            <span class="text-[10px] font-bold opacity-70 uppercase">${a.status}</span>
                        </div>`).join('')}
                    </div>`}
                </div>
            </div>

            <!-- Summary Notes -->
            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 class="font-bold text-gray-900 mb-3">${window.t('shift_notes', 'Shift Notes')}</h3>
                <textarea id="shiftNoteText" class="form-input w-full" rows="3"
                    placeholder="${window.t('shift_notes_placeholder', 'Any notes, issues, highlights from today\'s shift...')}">${state._shiftNote || ''}</textarea>
                <p class="text-xs text-gray-400 mt-2">These notes will be included when you send the summary to the owner.</p>
            </div>
        </div>`;
        lucide.createIcons();
    } catch (err) {
        document.getElementById('mainContent').innerHTML = `<div class="py-20 text-center text-red-500">Failed: ${err.message}</div>`;
    }
};

window.submitShiftSummary = async function () {
    const notes = document.getElementById('shiftNoteText')?.value?.trim();
    state._shiftNote = notes;

    const ok = await confirmModal('Send Shift Summary', 'Send today\'s shift summary to the owner via a request message?', 'Send Summary', 'Cancel', 'bg-indigo-600 hover:bg-indigo-700');
    if (!ok) return;

    try {
        const branch = state.branches?.find(b => b.id === state.branchId);
        const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        const [sRes, eRes] = await Promise.all([
            supabaseClient.from('sales').select('amount').eq('branch_id', state.branchId).gte('created_at', new Date().toISOString().slice(0, 10)),
            supabaseClient.from('expenses').select('amount').eq('branch_id', state.branchId).gte('created_at', new Date().toISOString().slice(0, 10))
        ]);
        const totalSales = (sRes.data || []).reduce((s, r) => s + Number(r.amount), 0);
        const totalExpenses = (eRes.data || []).reduce((s, r) => s + Number(r.amount), 0);

        const message = `Shift Summary — ${today}\n\nBranch: ${branch?.name || 'Branch'}\nTotal Sales: ${fmt.currency(totalSales)}\nTotal Expenses: ${fmt.currency(totalExpenses)}\nNet: ${fmt.currency(totalSales - totalExpenses)}\n\nNotes: ${notes || '(none)'}`;

        const { error } = await supabaseClient.from('requests').insert({
            branch_id: state.branchId,
            owner_id: state.ownerId || state.ownerIdForBranch,
            subject: `Shift Summary — ${today}`,
            message,
            type: 'shift_summary',
            status: 'pending'
        });
        if (error) throw error;
        showToast('Shift summary sent to owner!', 'success');
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};
