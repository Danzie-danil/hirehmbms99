
let staffPageState = {
    page: 1,
    pageSize: 10,
    totalCount: 0
};
window.staffPageState = staffPageState;

export function changeStaffPage(delta) {
    const newPage = staffPageState.page + delta;
    const maxPage = Math.ceil(staffPageState.totalCount / staffPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    staffPageState.page = newPage;
    renderStaffModule();
};

window.openBranchStaffDetailModal = function (id) {
    const records = window._cachedBranchStaffList || [];
    const s = records.find(item => item.id === id);
    if (!s) return;

    const isActive = s.status === 'active' || !s.status;
    const statusBadge = isActive
        ? `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><i data-lucide="check-circle" class="w-3 h-3"></i> ${window.t('active', 'Active')}</span>`
        : `<span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"><i data-lucide="x-circle" class="w-3 h-3"></i> ${window.t('inactive_status', 'Inactive')}</span>`;

    const modalHtml = `
        <div class="p-5 flex flex-col overflow-hidden max-w-lg mx-auto w-full">
            <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 mb-4">
                <div class="flex items-center gap-2.5">
                    <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <i data-lucide="user" class="w-4 h-4"></i>
                    </div>
                    <h3 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                        ${window.t('staff_details', 'Staff Profile Details')}
                    </h3>
                </div>
                <button onclick="closeModal()" class="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            
            <div class="space-y-4">
                <!-- Profile Header Card -->
                <div class="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div class="flex items-center gap-3">
                        <div class="w-11 h-11 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-base uppercase shadow-xs">
                            ${(s.name || 'S')[0]}
                        </div>
                        <div>
                            <h4 class="font-black text-gray-900 dark:text-white text-base leading-tight">${s.name || 'Unnamed Staff'}</h4>
                            <p class="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-0.5">${s.role || 'Staff Member'}</p>
                        </div>
                    </div>
                    ${statusBadge}
                </div>

                <!-- Info Table Card -->
                <div class="bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 space-y-2.5 text-xs">
                    <div class="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700/60">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px]">${window.t('role', 'Assigned Role')}</span>
                        <span class="font-bold text-gray-900 dark:text-white">${s.role || 'Employee'}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700/60">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px]">${window.t('base_salary', 'Base Salary')}</span>
                        <span class="font-black text-gray-900 dark:text-white">${fmt.currency(s.salary || 0)}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700/60">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px]">${window.t('phone', 'Phone Number')}</span>
                        <span class="font-bold text-gray-900 dark:text-white font-mono">${s.phone || '—'}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700/60">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px]">${window.t('email', 'Email Address')}</span>
                        <span class="font-bold text-gray-900 dark:text-white select-all">${s.email || '—'}</span>
                    </div>
                    <div class="flex justify-between items-center py-1">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[10px]">Date Registered</span>
                        <span class="font-bold text-gray-700 dark:text-gray-300">${s.created_at ? fmt.dateTime(s.created_at) : '—'}</span>
                    </div>
                </div>
            </div>

            <div class="border-t border-gray-100 dark:border-gray-800 pt-3.5 mt-4 flex items-center justify-end gap-2">
                <button onclick="closeModal()" class="px-5 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer">
                    ${window.t('close', 'Close')}
                </button>
            </div>
        </div>
    `;

    openModal(modalHtml);
    if (window.lucide) window.lucide.createIcons();
};

export function renderStaffModule() {
    const container = document.getElementById('mainContent');

    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('nav_staff', 'Staff & HR Management')}</div>
            </div>
            <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Owner Assigned Roster
            </div>
        </div>
        ${renderPremiumLoader(window.t('loading_staff_data', 'Loading staff data…'))}
    </div>`;
    lucide.createIcons();

    dbStaff.fetchAll(state.branchId).then((records) => {
        window._cachedBranchStaffList = records;
        staffPageState.totalCount = records.length;

        const startIdx = (staffPageState.page - 1) * staffPageState.pageSize;
        const pagedRecords = records.slice(startIdx, startIdx + staffPageState.pageSize);
        const totalPages = Math.ceil(staffPageState.totalCount / staffPageState.pageSize) || 1;

        const activeCount = records.filter(r => r.status === 'active' || !r.status).length;
        const totalPayroll = records.filter(r => r.status === 'active' || !r.status).reduce((s, r) => s + Number(r.salary || 0), 0);

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                    <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('nav_staff', 'Staff & HR Management')}</div>
                </div>
                <div class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shadow-2xs">
                    <i data-lucide="shield-check" class="w-3.5 h-3.5"></i> Owner Assigned Roster
                </div>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                <div class="bg-white px-3 py-2 rounded-2xl border border-gray-100 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <p class="text-[11px] sm:text-xs text-gray-500 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('total_staff_active', 'Total Staff / Active')}</p>
                    <div class="flex items-end gap-2 mt-auto">
                        <p class="text-dynamic-lg font-black text-gray-900 truncate leading-none pb-1">${records.length}</p>
                        <p class="text-sm font-bold text-emerald-600 pb-2">/ ${activeCount}</p>
                    </div>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('total_payroll', 'Total Est. Monthly Payroll')}</p>
                    <p class="text-dynamic-lg font-black text-indigo-600 dark:text-indigo-400 truncate leading-none my-auto py-1" title="${fmt.currency(totalPayroll)}">${fmt.number(totalPayroll)}</p>
                </div>
                <div class="bg-white px-3 py-2 rounded-2xl border border-gray-100 shadow-sm stat-card min-w-0 flex flex-col h-full col-span-2 lg:col-span-1 border-l-4 border-emerald-500 cursor-pointer hover:bg-emerald-50 transition-colors" onclick="window.openAttendanceModal ? window.openAttendanceModal() : openModal('markAttendance')">
                    <div class="flex items-center justify-between h-full">
                        <div>
                            <p class="text-[11px] sm:text-xs text-emerald-700 uppercase tracking-tight whitespace-normal font-bold leading-tight">${window.t('quick_action', 'Quick Action')}</p>
                            <p class="text-lg font-black text-emerald-800 truncate leading-none mt-1">${window.t('record_attendance', 'Record Attendance')}</p>
                        </div>
                        <div class="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                            <i data-lucide="calendar-check" class="w-5 h-5"></i>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('personnel_roster', 'Personnel Roster')}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 font-medium">Page ${staffPageState.page} of ${totalPages}</span>
                    </div>
                </div>

                <!-- Search -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                    </div>
                    <input type="text" placeholder="${window.t('search_staff', 'Search staff members...')}" oninput="filterList('staffList', this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
                </div>

                <div class="space-y-3" id="staffList">
                    ${pagedRecords.length === 0 ? `
                        <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <i data-lucide="users" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                            <p class="text-gray-400 text-sm">${window.t('no_staff_records', 'No staff records found')}</p>
                        </div>
                    ` : pagedRecords.map(rec => {
            const isActive = rec.status === 'active' || !rec.status;
            return `
                        <div onclick="window.openBranchStaffDetailModal('${rec.id}')" data-search="${(rec.name || '').toLowerCase()} ${(rec.role || '').toLowerCase()}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${isActive ? 'border-l-indigo-500' : 'border-l-gray-400'} rounded-2xl p-4 sm:p-5 flex items-center gap-3.5 hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-800 transition-all group relative cursor-pointer">
                            <div class="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm uppercase">
                                ${(rec.name || 'S')[0]}
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3 mb-1">
                                    <div class="flex items-center gap-2 max-w-[70%]">
                                        <h4 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base truncate">${rec.name || 'Unknown'}</h4>
                                        ${isActive ? `<span class="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded font-bold uppercase">${window.t('active', 'Active')}</span>` : `<span class="bg-gray-100 dark:bg-gray-700 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase">${window.t('inactive_status', 'Inactive')}</span>`}
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p class="text-[10px] uppercase font-bold text-gray-400 leading-none pb-1">${window.t('role_label', 'Role')}</p>
                                        <p class="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400">${rec.role || 'Staff'}</p>
                                    </div>
                                </div>
                                <div class="flex items-end justify-between gap-3 mt-2">
                                    <div class="flex flex-col gap-0.5">
                                        ${rec.phone ? `<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><i data-lucide="phone" class="w-3 h-3 text-gray-400"></i> ${rec.phone}</div>` : ''}
                                        ${rec.email ? `<div class="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400"><i data-lucide="mail" class="w-3 h-3 text-gray-400"></i> ${rec.email}</div>` : ''}
                                    </div>
                                    <div class="text-right shrink-0">
                                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-bold flex items-center gap-1">
                                            <span>View Details</span> <i data-lucide="chevron-right" class="w-3.5 h-3.5"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>`;
        }).join('')}
                </div>

                <!-- Pagination Footer -->
                <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                    <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${pagedRecords.length}</span> of <span class="font-bold text-gray-900">${staffPageState.totalCount}</span> records</p>
                    <div class="flex items-center gap-2">
                        <button onclick="changeStaffPage(-1)" ${staffPageState.page === 1 ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        </button>
                        <div class="flex items-center gap-1">
                            ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return `<button onclick="staffPageState.page = ${p}; renderStaffModule()" class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${staffPageState.page === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}">${p}</button>`;
        }).join('')}
                        </div>
                        <button onclick="changeStaffPage(1)" ${staffPageState.page === totalPages ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        lucide.createIcons();
    }).catch(err => {
        console.error('[BranchStaff] Error loading staff records:', err);
        if (typeof window.renderModuleOfflineState === 'function') {
            container.innerHTML = window.renderModuleOfflineState({
                viewId: 'staff',
                title: 'Branch Staff',
                entityName: 'Staff & Team Information',
                retryAction: 'window.renderStaffModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            container.innerHTML = `<div class="py-20 text-center text-gray-500 font-bold">Couldn't load staff records while offline.</div>`;
        }
    });
};
