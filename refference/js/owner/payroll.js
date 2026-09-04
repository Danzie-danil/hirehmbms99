import { supabase as supabaseClient } from '../supabase.js';
import { state } from '../state.js';
import { dbBranches } from '../db.js';
import { fmt, renderPremiumLoader, showToast, confirmModal, renderModuleOfflineState } from '../utils.js';

export async function renderPayrollModule() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return;

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.remove('overflow-hidden', '!p-0');
    container.innerHTML = renderPremiumLoader('Loading payroll records...');
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = await dbBranches.fetchAll(ownerId);

        const { data: records, error } = await supabaseClient
            .from('payroll')
            .select('*, branches(name)')
            .eq('owner_id', ownerId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const currentPeriod = new Date().toISOString().slice(0, 7);
        const totalPending = (records || []).filter(r => r.status === 'pending').reduce((s, r) => s + Number(r.amount || 0), 0);
        const totalPaid = (records || []).filter(r => r.status === 'paid').reduce((s, r) => s + Number(r.amount || 0), 0);
        const currentMonthRecords = (records || []).filter(r => r.period === currentPeriod);

        const savedBranchFilter = state._payrollBranchFilter || 'all';
        const savedPeriodFilter = state._payrollPeriodFilter || currentPeriod;

        const periods = [...new Set((records || []).map(r => r.period))].filter(Boolean).sort().reverse();
        if (!periods.includes(currentPeriod)) periods.unshift(currentPeriod);

        container.innerHTML = `
        <div class="space-y-5 slide-in max-w-7xl mx-auto pb-8">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <i data-lucide="wallet" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">${window.t('payroll_management', 'Payroll & Salary Management')}</h2>
                            <span class="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                                ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Track, schedule, and disburse staff salaries across all active branches</p>
                    </div>
                </div>
                <div class="flex items-center gap-2.5 shrink-0">
                    <button onclick="renderAddPayrollView()" class="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer">
                        <i data-lucide="plus-circle" class="w-4 h-4"></i>
                        <span>${window.t('add_payroll_entry', 'Add Payroll Entry')}</span>
                    </button>
                </div>
            </div>

            <!-- Stats Metric Cards -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                <div class="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-800 relative overflow-hidden flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-indigo-300">${window.t('pending_payroll', 'Pending Payroll')}</span>
                        <span class="p-1.5 rounded-lg bg-white/10 text-amber-300">
                            <i data-lucide="clock" class="w-4 h-4"></i>
                        </span>
                    </div>
                    <div class="mt-3">
                        <p class="text-2xl sm:text-3xl font-black text-amber-400">${fmt.currency(totalPending)}</p>
                        <p class="text-[11px] text-indigo-200/70 mt-1">Awaiting disbursement approval</p>
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">${window.t('total_paid', 'Total Paid (All Time)')}</span>
                        <span class="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400">
                            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                        </span>
                    </div>
                    <div class="mt-3">
                        <p class="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">${fmt.currency(totalPaid)}</p>
                        <p class="text-[11px] text-gray-400 mt-1">Successfully completed transactions</p>
                    </div>
                </div>

                <div class="bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs flex flex-col justify-between sm:col-span-2 lg:col-span-1">
                    <div class="flex items-center justify-between">
                        <span class="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">${window.t('this_month', 'This Month Entries')}</span>
                        <span class="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            <i data-lucide="calendar" class="w-4 h-4"></i>
                        </span>
                    </div>
                    <div class="mt-3">
                        <p class="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">${currentMonthRecords.length} <span class="text-xs font-bold text-gray-400">staff records</span></p>
                        <p class="text-[11px] text-gray-400 mt-1">Scheduled for period: ${currentPeriod}</p>
                    </div>
                </div>
            </div>

            <!-- Payroll Records Table Container -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs overflow-hidden">
                <div class="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-50/50 dark:bg-gray-900/50">
                    <div>
                        <h3 class="font-bold text-sm text-gray-900 dark:text-white">${window.t('payroll_records', 'Payroll Registry')}</h3>
                        <p class="text-[11px] text-gray-400">Filter records by branch location or calendar month</p>
                    </div>
                    <div class="flex items-center gap-2 flex-wrap">
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'payrollBranchFilter',
                            selectedValue: savedBranchFilter,
                            searchable: false,
                            classes: 'w-40 text-xs',
                            options: [
                                { value: 'all', label: window.t('all_branches', 'All Branches'), icon: 'layers' },
                                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                            ]
                        }) : ''}
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'payrollPeriodFilter',
                            selectedValue: savedPeriodFilter,
                            searchable: false,
                            classes: 'w-36 text-xs',
                            options: [
                                { value: 'all', label: window.t('all_periods', 'All Periods'), icon: 'calendar' },
                                ...periods.map(p => ({ value: p, label: p, icon: 'clock' }))
                            ]
                        }) : ''}
                    </div>
                </div>

                <!-- Desktop Table View -->
                <div class="overflow-x-auto hidden md:block">
                    <table class="w-full text-left text-xs">
                        <thead class="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th class="px-5 py-3.5">${window.t('staff_member', 'Staff')}</th>
                                <th class="px-5 py-3.5">${window.t('location_branch', 'Branch')}</th>
                                <th class="px-5 py-3.5">${window.t('period', 'Period')}</th>
                                <th class="px-5 py-3.5 text-right">${window.t('amount', 'Amount')}</th>
                                <th class="px-5 py-3.5 text-center">${window.t('status', 'Status')}</th>
                                <th class="px-5 py-3.5 text-right">${window.t('actions', 'Actions')}</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                            ${renderPayrollRows(records, branches, savedBranchFilter, savedPeriodFilter)}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile Card List View -->
                <div class="md:hidden divide-y divide-gray-100 dark:divide-gray-800">
                    ${renderMobilePayrollCards(records, branches, savedBranchFilter, savedPeriodFilter)}
                </div>

                ${(records || []).length === 0 ? `
                <div class="py-16 text-center text-gray-400">
                    <div class="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center mx-auto mb-3 text-gray-300 dark:text-gray-600">
                        <i data-lucide="wallet" class="w-6 h-6"></i>
                    </div>
                    <p class="text-sm font-bold text-gray-700 dark:text-gray-300">No payroll entries found</p>
                    <p class="text-xs text-gray-400 mt-0.5">Click "Add Payroll Entry" to record employee salaries</p>
                </div>` : ''}
            </div>
        </div>`;

        if (window.lucide) window.lucide.createIcons();

        document.getElementById('payrollBranchFilter')?.addEventListener('change', (e) => {
            state._payrollBranchFilter = e.target.value;
            renderPayrollModule();
        });
        document.getElementById('payrollPeriodFilter')?.addEventListener('change', (e) => {
            state._payrollPeriodFilter = e.target.value;
            renderPayrollModule();
        });

    } catch (err) {
        console.error('[OwnerPayroll] Error loading payroll:', err);
        if (container) {
            container.innerHTML = renderModuleOfflineState({
                viewId: 'payroll',
                title: 'Staff Payroll',
                entityName: 'Staff Payroll Records',
                retryAction: 'window.renderPayrollModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

function renderPayrollRows(records, branches, branchFilter, periodFilter) {
    let filtered = records || [];
    if (branchFilter && branchFilter !== 'all') filtered = filtered.filter(r => r.branch_id === branchFilter);
    if (periodFilter && periodFilter !== 'all') filtered = filtered.filter(r => r.period === periodFilter);

    window.currentFilteredPayroll = filtered;

    if (filtered.length === 0) {
        return `<tr><td colspan="6" class="py-10 text-center text-gray-400 text-xs">No payroll entries match current filter criteria</td></tr>`;
    }

    return filtered.map(r => `
    <tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
        <td class="px-5 py-3.5">
            <p class="font-bold text-gray-900 dark:text-white">${r.staff_name || 'Staff'}</p>
            <p class="text-[11px] text-gray-400">${r.role || 'Employee'}</p>
        </td>
        <td class="px-5 py-3.5 text-gray-600 dark:text-gray-300">${r.branches?.name || '—'}</td>
        <td class="px-5 py-3.5 text-gray-600 dark:text-gray-300 font-medium">${r.period}</td>
        <td class="px-5 py-3.5 text-right font-black text-gray-900 dark:text-white">${fmt.currency(r.amount)}</td>
        <td class="px-5 py-3.5 text-center">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                r.status === 'paid'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }">
                <span class="w-1.5 h-1.5 rounded-full ${r.status === 'paid' ? 'bg-emerald-500' : 'bg-amber-500'}"></span>
                ${r.status === 'paid' ? 'Paid' : 'Pending'}
            </span>
        </td>
        <td class="px-5 py-3.5 text-right">
            <div class="flex items-center justify-end gap-1.5">
                ${r.status === 'pending' ? `
                <button onclick="markPayrollPaid('${r.id}')" class="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg transition-colors" title="Mark as Paid">
                    <i data-lucide="check-circle" class="w-3.5 h-3.5"></i>
                </button>` : ''}
                <button onclick="deletePayrollEntry('${r.id}')" class="p-1.5 bg-red-50 dark:bg-red-950/30 text-red-500 hover:bg-red-100 rounded-lg transition-colors" title="Delete">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </td>
    </tr>`).join('');
}

function renderMobilePayrollCards(records, branches, branchFilter, periodFilter) {
    let filtered = records || [];
    if (branchFilter && branchFilter !== 'all') filtered = filtered.filter(r => r.branch_id === branchFilter);
    if (periodFilter && periodFilter !== 'all') filtered = filtered.filter(r => r.period === periodFilter);

    if (filtered.length === 0) {
        return `<div class="py-8 text-center text-gray-400 text-xs">No payroll records found for this filter</div>`;
    }

    return filtered.map(r => `
    <div class="p-4 space-y-2.5">
        <div class="flex items-start justify-between gap-2">
            <div>
                <p class="font-black text-xs text-gray-900 dark:text-white">${r.staff_name || 'Staff'}</p>
                <p class="text-[11px] text-gray-400">${r.role || 'Employee'} • ${r.branches?.name || '—'}</p>
            </div>
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                r.status === 'paid'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }">
                ${r.status === 'paid' ? 'Paid' : 'Pending'}
            </span>
        </div>
        <div class="flex items-center justify-between pt-2 border-t border-gray-50 dark:border-gray-800/60">
            <div>
                <p class="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Month: ${r.period}</p>
                <p class="text-sm font-black text-indigo-600 dark:text-indigo-400 mt-0.5">${fmt.currency(r.amount)}</p>
            </div>
            <div class="flex items-center gap-1.5">
                ${r.status === 'pending' ? `
                <button onclick="markPayrollPaid('${r.id}')" class="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-xs">
                    <i data-lucide="check" class="w-3 h-3"></i> Pay
                </button>` : ''}
                <button onclick="deletePayrollEntry('${r.id}')" class="p-1.5 bg-red-50 dark:bg-red-950/30 text-red-500 rounded-xl hover:bg-red-100 transition-colors">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
    </div>`).join('');
}

// ── STANDARD MODAL/PAGE VIEW CONTAINER MATCHING ASSIGN NEW TASK ────────────────
export async function renderAddPayrollView() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.add('overflow-hidden', '!p-0');

    const branches = state.branches || (await dbBranches.fetchAll(state.ownerId)) || [];
    const currentPeriod = new Date().toISOString().slice(0, 7);

    let allStaff = [];
    try {
        if (window.currentAllStaff && window.currentAllStaff.length > 0) {
            allStaff = window.currentAllStaff;
        } else {
            const branchMap = new Map(branches.map(b => [b.id, b.name]));
            try {
                allStaff = await dbStaff.fetchAllByOwner(state.ownerId);
            } catch (e) {
                console.warn('[Payroll] fetchAllByOwner failed, trying parallel branch fetch:', e);
            }

            if (!allStaff || allStaff.length === 0) {
                const sLists = await Promise.all(
                    branches.map(async b => {
                        try {
                            const sList = await dbStaff.fetchAll(b.id);
                            return (sList || []).map(s => ({ ...s, _branchName: b.name, _branchId: b.id }));
                        } catch (e) {
                            return [];
                        }
                    })
                );
                allStaff = sLists.flat();
            } else {
                allStaff = allStaff.map(s => ({
                    ...s,
                    _branchName: branchMap.get(s.branch_id) || 'Branch',
                    _branchId: s.branch_id
                }));
            }
            window.currentAllStaff = allStaff;
        }
    } catch (e) {
        console.warn('[Payroll] Error fetching staff for selector:', e);
    }

    const staffSelectOptions = [
        { value: '', label: 'Select Staff Member (Auto-fill)', icon: 'user-check' },
        ...allStaff.map(s => ({
            value: s.id,
            label: `${s.name} (${s._branchName || 'Branch'} — ${s.role || 'Staff'})`,
            icon: 'user'
        })),
        { value: 'custom', label: 'Custom / Unlisted Staff Member', icon: 'edit-3' }
    ];

    window.allStaffForPayroll = allStaff;

    window.handlePayrollStaffSelect = function(staffId) {
        if (!staffId || staffId === 'custom') {
            const staffIdEl = document.getElementById('payStaffId');
            if (staffIdEl) staffIdEl.value = '';
            return;
        }

        const selectedStaff = (window.allStaffForPayroll || []).find(s => s.id === staffId);
        if (!selectedStaff) return;

        const staffIdEl = document.getElementById('payStaffId');
        if (staffIdEl) staffIdEl.value = selectedStaff.id;

        const nameEl = document.getElementById('payStaffName');
        if (nameEl) nameEl.value = selectedStaff.name || '';

        const roleEl = document.getElementById('payRole');
        if (roleEl) roleEl.value = selectedStaff.role || 'Staff';

        const amountEl = document.getElementById('payAmount');
        if (amountEl) {
            const sal = selectedStaff.salary || 0;
            amountEl.value = window.fmt ? window.fmt.number(sal) : sal;
        }

        const branchId = selectedStaff._branchId || selectedStaff.branch_id;
        if (branchId && window.selectPremiumOption) {
            const branchObj = branches.find(b => b.id === branchId);
            if (branchObj) {
                window.selectPremiumOption('payBranch', branchObj.id, branchObj.name);
            }
        }
    };

    container.innerHTML = `
    <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderPayrollModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('btn_close', 'Close')}</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-base shrink-0 border border-gray-200/80 dark:border-gray-700">
                <i data-lucide="wallet" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">${window.t('add_payroll_entry', 'Add Payroll Entry')}</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Record salary & payment details for an employee</p>
            </div>
        </div>

        <!-- Form Body Container -->
        <form onsubmit="event.preventDefault(); submitPayrollEntry();" class="flex flex-col flex-1 overflow-hidden">
            <input type="hidden" id="payStaffId" value="">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    
                    ${allStaff.length > 0 ? `
                    <div>
                        <label for="payStaffPicker" class="block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                            <i data-lucide="users" class="w-3.5 h-3.5"></i> Pick System Staff Member
                        </label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'payStaffPicker',
                            selectedValue: '',
                            searchable: allStaff.length > 3,
                            onChange: 'window.handlePayrollStaffSelect(this.value)',
                            options: staffSelectOptions
                        }) : ''}
                    </div>` : ''}

                    <div>
                        <label for="payBranch" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('branch', 'Branch Location')} *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'payBranch',
                            selectedValue: branches[0]?.id || '',
                            searchable: branches.length > 4,
                            options: [
                                { value: '', label: 'Select Branch', icon: 'building-2' },
                                ...branches.map(b => ({ value: b.id, label: b.name, icon: 'map-pin' }))
                            ]
                        }) : ''}
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="payStaffName" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('staff_name', 'Staff Name')} *</label>
                            <input type="text" id="payStaffName" required class="form-input w-full" placeholder="e.g. John Doe">
                        </div>
                        <div>
                            <label for="payRole" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('role', 'Role / Title')}</label>
                            <input type="text" id="payRole" class="form-input w-full" placeholder="e.g. Store Manager">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label for="payAmount" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('amount', 'Salary Amount (TZS)')} *</label>
                            <input type="text" id="payAmount" required class="form-input w-full font-black text-emerald-600 dark:text-emerald-400" placeholder="0.00" oninput="this.value = window.fmt ? window.fmt.number(this.value.replace(/[^0-9.]/g, '')) : this.value">
                        </div>
                        <div>
                            <label for="payPeriod" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('payroll_period', 'Payroll Month')} *</label>
                            <input type="month" id="payPeriod" required class="form-input w-full" value="${currentPeriod}">
                        </div>
                    </div>

                    <div>
                        <label for="payStatus" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('status', 'Payment Status')} *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'payStatus',
                            selectedValue: 'pending',
                            searchable: false,
                            options: [
                                { value: 'pending', label: 'Pending Payment', icon: 'clock' },
                                { value: 'paid', label: 'Paid', icon: 'check-circle' }
                            ]
                        }) : ''}
                    </div>

                    <div>
                        <label for="payNotes" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('notes', 'Notes / Remarks (Optional)')}</label>
                        <textarea id="payNotes" rows="3" class="form-input w-full" placeholder="Add payment remarks..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="renderPayrollModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    ${window.t('btn_cancel', 'Cancel')}
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>${window.t('save_entry', 'Save Entry')}</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

window.renderPayrollModule = renderPayrollModule;
window.renderAddPayrollView = renderAddPayrollView;
window.openPayrollModal = renderAddPayrollView;

window.submitPayrollEntry = async function () {
    const staffId = document.getElementById('payStaffId')?.value || null;
    const staffName = document.getElementById('payStaffName')?.value?.trim();
    const role = document.getElementById('payRole')?.value?.trim();
    const branchId = document.getElementById('payBranch')?.value;
    const amount = parseFloat(document.getElementById('payAmount')?.value?.replace(/,/g, '') || '0');
    const period = document.getElementById('payPeriod')?.value;
    const notes = document.getElementById('payNotes')?.value?.trim();
    const status = document.getElementById('payStatus')?.value || 'pending';

    if (!staffName || !branchId || !amount || !period) {
        showToast('Please fill in staff name, branch, salary amount, and period', 'error');
        return;
    }

    try {
        const payload = {
            owner_id: state.ownerId,
            branch_id: branchId,
            staff_name: staffName,
            role: role || 'Staff',
            amount,
            period,
            notes,
            status
        };
        if (staffId) {
            payload.staff_id = staffId;
        }

        const { error } = await supabaseClient.from('payroll').insert(payload);
        if (error) throw error;

        showToast('Payroll entry successfully created!', 'success');
        renderPayrollModule();
    } catch (err) {
        showToast('Failed to add payroll: ' + err.message, 'error');
    }
};

window.markPayrollPaid = async function (id) {
    const confirmed = await confirmModal('Mark as Paid', 'Confirm this payroll entry has been paid to the employee?', 'Mark Paid', 'Cancel', 'bg-emerald-600 hover:bg-emerald-700');
    if (!confirmed) return;

    try {
        await supabaseClient.from('payroll').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id);
        showToast('Payroll marked as paid!', 'success');
        renderPayrollModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.deletePayrollEntry = async function (id) {
    const confirmed = await confirmModal('Delete Entry', 'Are you sure you want to delete this payroll record?', 'Delete', 'Cancel');
    if (!confirmed) return;

    try {
        await supabaseClient.from('payroll').delete().eq('id', id);
        showToast('Payroll entry deleted', 'info');
        renderPayrollModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};
