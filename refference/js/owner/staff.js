import { state } from '../state.js';
import { dbBranches, dbStaff } from '../db.js';
import { renderPremiumLoader, showToast, confirmModal, renderModuleOfflineState } from '../utils.js';
import { renderCustomRoleMatrix } from './custom_roles.js';

export async function renderOwnerStaffModule() {
    const area = document.getElementById('mainContent');
    if (!area) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    area.innerHTML = renderPremiumLoader('Loading staff across all branches…');
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = state.branches || (await dbBranches.fetchAll(ownerId)) || [];
        const branchMap = new Map(branches.map(b => [b.id, b.name]));
        let allStaff = [];

        try {
            allStaff = await dbStaff.fetchAllByOwner(ownerId);
        } catch (e) {
            console.warn('[StaffModule] fetchAllByOwner failed, trying parallel branch fetch:', e);
        }

        if (!allStaff || allStaff.length === 0) {
            const staffLists = await Promise.all(
                branches.map(async b => {
                    try {
                        const list = await dbStaff.fetchAll(b.id);
                        return (list || []).map(s => ({ ...s, _branchName: b.name, _branchId: b.id }));
                    } catch (e) {
                        return [];
                    }
                })
            );
            allStaff = staffLists.flat();
        } else {
            allStaff = allStaff.map(s => ({
                ...s,
                _branchName: branchMap.get(s.branch_id) || 'Unassigned Branch',
                _branchId: s.branch_id
            }));
        }

        window.currentAllStaff = allStaff;
        window.renderCustomRoleMatrix = renderCustomRoleMatrix;

        const total = allStaff.length;
        const active = allStaff.filter(s => s.status === 'active' || !s.status).length;
        const suspended = allStaff.filter(s => s.status === 'suspended').length;
        const terminated = allStaff.filter(s => s.status === 'terminated').length;
        const laidOff = allStaff.filter(s => s.status === 'laid_off').length;

        window.filterOwnerStaff = function(statusFilter) {
            window._staffStatusFilter = statusFilter;
            const container = document.getElementById('ownerStaffContainer');
            if (!container) return;
            const items = window.currentAllStaff || [];
            const filtered = statusFilter === 'all' 
                ? items 
                : items.filter(s => (s.status || 'active') === statusFilter);

            container.innerHTML = window.renderOwnerStaffListHtml(filtered);
            if (window.lucide) window.lucide.createIcons();

            // Update tab styles
            document.querySelectorAll('.staff-filter-btn').forEach(btn => {
                const isMatch = btn.getAttribute('data-status') === statusFilter;
                btn.className = `staff-filter-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    isMatch 
                    ? 'bg-indigo-600 text-white shadow-xs' 
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/70 dark:border-gray-700'
                }`;
            });
        };

        area.innerHTML = `
        <div class="max-w-6xl mx-auto space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                    <h2 class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">${window.t('staff_hr_monitor', 'Staff & HR Monitor')}</h2>
                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-medium">${window.t('staff_sub', 'Manage employees, promotions, suspensions & HR lifecycle')}</p>
                </div>
                <div class="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                    <button onclick="window.openOwnerAddStaffModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer">
                        <i data-lucide="user-plus" class="w-4 h-4"></i> ${window.t('add_staff', 'Add Staff')}
                    </button>
                    <button onclick="window.renderCustomRoleMatrix()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer border border-gray-200/80 dark:border-gray-700">
                        <i data-lucide="shield-check" class="w-4 h-4 text-indigo-500"></i> Role Matrix
                    </button>
                </div>
            </div>

            <!-- Stats Bar -->
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total_staff', 'Total Staff')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1">${total}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('active', 'Active')}</p>
                    <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate my-1">${active}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Suspended</p>
                    <p class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 truncate my-1">${suspended}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">Terminated / Laid Off</p>
                    <p class="text-xl sm:text-2xl font-black text-red-500 dark:text-red-400 truncate my-1">${terminated + laidOff}</p>
                </div>
            </div>

            <!-- Filter Pills -->
            <div class="flex items-center gap-2 overflow-x-auto pb-1 scroller-custom">
                <button onclick="window.filterOwnerStaff('all')" data-status="all" class="staff-filter-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer bg-indigo-600 text-white shadow-xs">
                    All (${total})
                </button>
                <button onclick="window.filterOwnerStaff('active')" data-status="active" class="staff-filter-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/70 dark:border-gray-700">
                    Active (${active})
                </button>
                <button onclick="window.filterOwnerStaff('suspended')" data-status="suspended" class="staff-filter-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/70 dark:border-gray-700">
                    Suspended (${suspended})
                </button>
                <button onclick="window.filterOwnerStaff('laid_off')" data-status="laid_off" class="staff-filter-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/70 dark:border-gray-700">
                    Laid Off (${laidOff})
                </button>
                <button onclick="window.filterOwnerStaff('terminated')" data-status="terminated" class="staff-filter-btn px-3 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/70 dark:border-gray-700">
                    Terminated (${terminated})
                </button>
            </div>

            <!-- Staff List Container -->
            <div id="ownerStaffContainer" class="space-y-3">
                ${window.renderOwnerStaffListHtml(allStaff)}
            </div>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('[OwnerStaff] Error loading staff data:', err);
        area.innerHTML = renderModuleOfflineState({
            viewId: 'staff',
            title: 'Staff & HR Information',
            entityName: 'Staff & HR Information',
            retryAction: 'window.renderOwnerStaffModule()'
        });
        if (window.lucide) window.lucide.createIcons();
    }
}

window.getStaffStatusBadgeHtml = function(status) {
    const s = (status || 'active').toLowerCase();
    if (s === 'active') {
        return `<span class="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase border border-emerald-100 dark:border-emerald-900/50 flex items-center gap-1"><i data-lucide="check-circle-2" class="w-3 h-3 text-emerald-500"></i> ${window.t('active', 'Active')}</span>`;
    }
    if (s === 'suspended') {
        return `<span class="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase border border-amber-200 dark:border-amber-900/50 flex items-center gap-1"><i data-lucide="pause-circle" class="w-3 h-3 text-amber-500"></i> Suspended</span>`;
    }
    if (s === 'laid_off') {
        return `<span class="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase border border-purple-200 dark:border-purple-900/50 flex items-center gap-1"><i data-lucide="archive" class="w-3 h-3 text-purple-500"></i> Laid Off</span>`;
    }
    if (s === 'terminated') {
        return `<span class="bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase border border-red-200 dark:border-red-900/50 flex items-center gap-1"><i data-lucide="user-x" class="w-3 h-3 text-red-500"></i> Terminated</span>`;
    }
    return `<span class="bg-gray-105 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] px-2.5 py-0.5 rounded-lg font-black uppercase border border-gray-200 dark:border-gray-700">${status || 'Inactive'}</span>`;
};

window.renderOwnerStaffListHtml = function(staffList) {
    if (!staffList || staffList.length === 0) {
        return `
            <div class="py-16 text-center border-2 border-dashed border-gray-150 dark:border-gray-700 rounded-2xl bg-white dark:bg-gray-800/40">
                <i data-lucide="user-check" class="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3"></i>
                <p class="text-gray-400 dark:text-gray-500 text-sm font-medium">${window.t('no_staff_records', 'No staff records found')}</p>
                <button onclick="window.openOwnerAddStaffModal()" class="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 mx-auto cursor-pointer">
                    <i data-lucide="plus" class="w-4 h-4"></i> ${window.t('add_staff', 'Add Staff Member')}
                </button>
            </div>`;
    }

    return staffList.map(s => `
        <div class="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-750/70 rounded-2xl p-4 sm:p-5 hover:border-indigo-300 dark:hover:border-indigo-800 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div class="flex items-center justify-between sm:justify-start gap-4 flex-1 min-w-0">
                <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                        <h4 class="font-bold text-gray-952 dark:text-white text-xs sm:text-sm leading-tight truncate">${s.name || 'Unnamed'}</h4>
                        ${window.getStaffStatusBadgeHtml(s.status)}
                    </div>
                    <div class="flex items-center gap-2 mt-1 flex-wrap">
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-bold">${s._branchName || 'Branch'}</span>
                        <span class="text-gray-300 dark:text-gray-600">•</span>
                        <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">${s.role || 'Staff'}</span>
                        <span class="text-gray-300 dark:text-gray-600">•</span>
                        <span class="text-xs text-emerald-600 dark:text-emerald-400 font-bold">${window.fmt.currency(s.salary || 0)}</span>
                    </div>
                </div>
            </div>
            <div class="flex sm:justify-end items-center gap-2 shrink-0 w-full sm:w-auto flex-wrap">
                <button onclick="window.openHRActionModal('${s.id}')" class="px-3 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs border border-amber-200/60 dark:border-amber-900/60 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                    <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-amber-600"></i> HR Actions
                </button>
                <button onclick="window.openOwnerAddStaffModal('${s.id}')" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                    <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit
                </button>
                <button onclick="window.showStaffDetailModal('${s.id}')" class="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs border border-indigo-100/50 dark:border-indigo-950/50 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                    <i data-lucide="eye" class="w-4 h-4 text-indigo-600 dark:text-indigo-400"></i> Details
                </button>
            </div>
        </div>`).join('');
};

window.openOwnerAddStaffModal = async function(staffId = null) {
    const branches = state.branches || [];
    if (branches.length === 0) {
        showToast('Please create at least one branch before adding staff.', 'warning');
        return;
    }

    let staff = null;
    if (staffId && window.currentAllStaff) {
        staff = window.currentAllStaff.find(s => s.id === staffId);
    }

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    let customRoles = [];
    try {
        const { data } = await supabase.from('sys_custom_roles').select('*').eq('owner_id', ownerId);
        if (data && data.length > 0) customRoles = data;
    } catch (e) {
        console.warn('[StaffModal] Fetch custom roles warning:', e);
    }

    const isEdit = !!staff;
    const title = isEdit ? 'Edit Staff Member' : 'Add New Staff Member';
    const initialBranchId = staff ? (staff._branchId || staff.branch_id) : (branches[0]?.id || '');
    const currentRole = staff ? (staff.role || 'Sales Associate') : 'Sales Associate';

    const baseRoleOptions = [
        { value: 'Sales Associate', label: 'Sales Associate', icon: 'shopping-bag' },
        { value: 'Store Manager', label: 'Store Manager', icon: 'briefcase' },
        { value: 'Cashier', label: 'Cashier', icon: 'receipt' },
        { value: 'Accountant / Finance Officer', label: 'Accountant / Finance Officer', icon: 'calculator' },
        { value: 'Inventory Specialist', label: 'Inventory Specialist', icon: 'package' },
        { value: 'Branch Supervisor', label: 'Branch Supervisor', icon: 'user-check' },
        { value: 'General Staff', label: 'General Staff', icon: 'user' }
    ];

    const customRoleOptions = customRoles.map(cr => ({
        value: cr.role_name,
        label: cr.role_name,
        icon: 'shield-check',
        badge: 'Custom Role'
    }));

    let allRoleOptions = [...baseRoleOptions, ...customRoleOptions];

    const isRoleKnown = allRoleOptions.some(r => r.value.toLowerCase() === currentRole.toLowerCase());
    if (currentRole && !isRoleKnown && currentRole !== '__custom__') {
        allRoleOptions.push({ value: currentRole, label: currentRole, icon: 'badge-check' });
    }
    allRoleOptions.push({ value: '__custom__', label: 'Other / Enter Custom Title...', icon: 'edit-3' });

    window.toggleStaffCustomRoleInput = function(selectedRoleVal) {
        const container = document.getElementById('ownerStaffRoleCustomContainer');
        if (container) {
            if (selectedRoleVal === '__custom__') {
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        }
    };

    const modalHtml = `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
            <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                        <i data-lucide="${isEdit ? 'user-cog' : 'user-plus'}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">${title}</h3>
                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Assign staff member to a branch location</p>
                    </div>
                </div>
                <button type="button" onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <form onsubmit="event.preventDefault(); window.handleSaveOwnerStaff(event, '${staffId || ''}');" class="flex flex-col flex-1 overflow-hidden">
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                    <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        <div>
                            <label for="ownerStaffBranch" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Assigned Branch Location *</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'ownerStaffBranch',
                                selectedValue: initialBranchId,
                                searchable: branches.length > 4,
                                options: branches.map(b => ({ value: b.id, label: b.name, icon: 'building-2' }))
                            }) : ''}
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="ownerStaffName" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Full Name *</label>
                                <input type="text" id="ownerStaffName" required value="${staff ? (staff.name || '') : ''}" class="form-input w-full capitalize" placeholder="e.g. Alex Johnson" oninput="this.value = window.toTitleCase ? window.toTitleCase(this.value) : this.value">
                            </div>
                            <div>
                                <label for="ownerStaffRole" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Role / Position Title *</label>
                                ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                    id: 'ownerStaffRole',
                                    selectedValue: currentRole,
                                    searchable: allRoleOptions.length > 4,
                                    onChange: 'window.toggleStaffCustomRoleInput(this.value)',
                                    options: allRoleOptions
                                }) : ''}
                                <div id="ownerStaffRoleCustomContainer" class="mt-2 ${currentRole === '__custom__' ? '' : 'hidden'}">
                                    <input type="text" id="ownerStaffRoleCustom" class="form-input w-full text-xs" placeholder="Enter custom position title..." value="${currentRole !== '__custom__' && !isRoleKnown ? currentRole : ''}">
                                </div>
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="ownerStaffSalary" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Monthly Salary / Pay Rate</label>
                                <input type="text" id="ownerStaffSalary" value="${staff ? (staff.salary || '') : ''}" class="form-input w-full font-black text-emerald-600 dark:text-emerald-400" placeholder="0.00" oninput="this.value = window.fmt ? window.fmt.number(this.value.replace(/[^0-9.]/g, '')) : this.value">
                            </div>
                            <div>
                                <label for="ownerStaffStatus" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Status *</label>
                                ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                    id: 'ownerStaffStatus',
                                    selectedValue: staff ? staff.status || 'active' : 'active',
                                    searchable: false,
                                    options: [
                                        { value: 'active', label: 'Active', icon: 'check-circle' },
                                        { value: 'inactive', label: 'Inactive', icon: 'x-circle' }
                                    ]
                                }) : ''}
                            </div>
                        </div>

                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label for="ownerStaffPhone" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Phone Number</label>
                                <input type="tel" id="ownerStaffPhone" value="${staff ? (staff.phone || '') : ''}" class="form-input w-full font-mono" placeholder="e.g. +255 700 000 000" oninput="this.value = window.formatPhoneTZ ? window.formatPhoneTZ(this.value) : this.value">
                            </div>
                            <div>
                                <label for="ownerStaffEmail" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Email Address</label>
                                <input type="email" id="ownerStaffEmail" value="${staff ? (staff.email || '') : ''}" class="form-input w-full lowercase" placeholder="staff@example.com" oninput="this.value = this.value.toLowerCase().trim()">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-6 py-2 rounded-full font-bold text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all cursor-pointer">
                        ${window.t('btn_cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                        <i data-lucide="check" class="w-4 h-4"></i>
                        <span>${isEdit ? 'Save Changes' : 'Create Staff Member'}</span>
                    </button>
                </div>
            </form>
        </div>
    `;

    openModal(modalHtml);
    if (window.lucide) window.lucide.createIcons();
};

window.handleSaveOwnerStaff = async function(event, staffId = null) {
    const branchId = document.getElementById('ownerStaffBranch')?.value;
    let rawName = document.getElementById('ownerStaffName')?.value?.trim();
    const name = window.toTitleCase ? window.toTitleCase(rawName) : rawName;

    const selectedRoleVal = document.getElementById('ownerStaffRole')?.value;
    let role = selectedRoleVal;
    if (selectedRoleVal === '__custom__') {
        role = document.getElementById('ownerStaffRoleCustom')?.value?.trim() || 'Staff';
    }
    if (!role) role = 'Staff';

    const salaryVal = document.getElementById('ownerStaffSalary')?.value?.replace(/,/g, '');
    const salary = parseFloat(salaryVal || '0');
    const status = document.getElementById('ownerStaffStatus')?.value || 'active';

    let rawPhone = document.getElementById('ownerStaffPhone')?.value?.trim() || '';
    const phone = window.formatPhoneTZ ? window.formatPhoneTZ(rawPhone) : rawPhone;

    const email = document.getElementById('ownerStaffEmail')?.value?.trim()?.toLowerCase() || '';

    if (!branchId || !name) {
        showToast('Please select a branch and enter the staff full name.', 'error');
        return;
    }

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const payload = {
        branch_id: branchId,
        owner_id: ownerId,
        name,
        role,
        salary,
        status,
        phone,
        email
    };

    try {
        if (staffId) {
            await dbStaff.update(staffId, payload);
            showToast('Staff member details updated successfully!', 'success');
        } else {
            await dbStaff.add(payload);
            showToast('New staff member added successfully!', 'success');
        }
        closeModal();
        renderOwnerStaffModule();
    } catch (err) {
        console.error('[SaveOwnerStaff] Error saving staff member:', err);
        showToast('Failed to save staff record: ' + err.message, 'error');
    }
};

window.showStaffDetailModal = function(id) {
    if (!window.currentAllStaff) return;

    const s = window.currentAllStaff.find(item => item.id === id);
    if (!s) return;

    const statusBadge = window.getStaffStatusBadgeHtml(s.status);
    let hrHistory = s.hr_history || [];
    if (typeof hrHistory === 'string') {
        try { hrHistory = JSON.parse(hrHistory); } catch (e) { hrHistory = []; }
    }

    const modalHtml = `
        <div class="p-5 flex flex-col overflow-hidden max-w-lg mx-auto w-full">
            <div class="flex items-center justify-between border-b border-gray-105 dark:border-gray-800 pb-3 mb-4">
                <div>
                    <h3 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="user" class="w-4 h-4 text-indigo-500"></i> ${window.t('staff_details', 'Staff Details')} & HR History
                    </h3>
                </div>
                <button onclick="window.closeStaffDetailModal()" class="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto space-y-4 pr-0.5 scrollbar-custom max-h-[75vh]">
                <!-- Profile Header Card -->
                <div class="bg-indigo-50/40 dark:bg-indigo-950/15 border border-indigo-100/40 dark:border-indigo-950/40 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div>
                        <h4 class="font-bold text-gray-955 dark:text-white text-sm sm:text-base leading-tight">${s.name || 'Unnamed'}</h4>
                        <p class="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">${s._branchName}</p>
                    </div>
                    ${statusBadge}
                </div>

                <!-- Fields Stack -->
                <div class="bg-gray-50/50 dark:bg-gray-800/20 border border-gray-150 dark:border-gray-750/50 rounded-2xl p-4 space-y-3">
                    <div class="flex justify-between items-center py-1">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('role', 'Role')}</span>
                        <span class="font-bold text-gray-900 dark:text-white text-xs">${s.role || 'Employee'}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-t border-gray-100 dark:border-gray-800/60">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('salary', 'Salary')}</span>
                        <span class="font-extrabold text-emerald-600 dark:text-emerald-400 text-xs">${window.fmt.currency(s.salary || 0)}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-t border-gray-100 dark:border-gray-800/60">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('phone', 'Phone')}</span>
                        <span class="font-bold text-gray-900 dark:text-white text-xs font-mono">${s.phone || '—'}</span>
                    </div>
                    <div class="flex justify-between items-center py-1 border-t border-gray-100 dark:border-gray-800/60">
                        <span class="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider text-[9px]">${window.t('email', 'Email')}</span>
                        <span class="font-bold text-gray-900 dark:text-white text-xs select-all text-right max-w-[200px] truncate">${s.email || '—'}</span>
                    </div>
                </div>

                <!-- HR Lifecycle History Timeline -->
                <div class="bg-white dark:bg-gray-800/40 border border-gray-200 dark:border-gray-750 p-4 rounded-2xl space-y-3">
                    <h5 class="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                        <i data-lucide="history" class="w-3.5 h-3.5 text-indigo-500"></i> HR Lifecycle Audit History
                    </h5>
                    ${hrHistory.length === 0 ? `
                        <div class="text-center py-4 text-xs text-gray-400 font-medium italic">
                            No recorded HR actions or status changes yet.
                        </div>` : `
                        <div class="space-y-2.5 border-l-2 border-indigo-200 dark:border-indigo-800 pl-3 ml-1">
                            ${hrHistory.slice().reverse().map(h => `
                                <div class="relative text-xs space-y-1 bg-gray-50 dark:bg-gray-800/60 p-2.5 rounded-xl border border-gray-150 dark:border-gray-750">
                                    <div class="flex items-center justify-between font-bold text-gray-900 dark:text-white">
                                        <span class="capitalize text-indigo-600 dark:text-indigo-400">${h.action.replace('_', ' ')}</span>
                                        <span class="text-[10px] text-gray-400 font-mono">${h.date || h.created_at?.slice(0, 10) || ''}</span>
                                    </div>
                                    ${h.old_role || h.new_role ? `<div class="text-[11px] text-gray-600 dark:text-gray-300">Role: <span class="line-through text-gray-400">${h.old_role || '—'}</span> ➔ <span class="font-bold text-indigo-600 dark:text-indigo-300">${h.new_role || '—'}</span></div>` : ''}
                                    ${h.old_salary || h.new_salary ? `<div class="text-[11px] text-gray-600 dark:text-gray-300">Salary: <span class="line-through text-gray-400">${window.fmt.currency(h.old_salary || 0)}</span> ➔ <span class="font-bold text-emerald-600 dark:text-emerald-300">${window.fmt.currency(h.new_salary || 0)}</span></div>` : ''}
                                    ${h.reason ? `<div class="text-[11px] text-gray-500 dark:text-gray-400 italic">" ${h.reason} "</div>` : ''}
                                </div>`).join('')}
                        </div>`}
                </div>
            </div>
            <div class="border-t border-gray-150 dark:border-gray-800 pt-3 mt-4 flex items-center justify-between gap-2 flex-wrap">
                <button onclick="window.closeStaffDetailModal(); window.openHRActionModal('${s.id}');" class="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                    <i data-lucide="shield-alert" class="w-3.5 h-3.5 text-amber-600"></i> Take HR Action
                </button>
                <div class="flex items-center gap-2">
                    <button onclick="window.closeStaffDetailModal(); window.openOwnerAddStaffModal('${s.id}');" class="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer">
                        <i data-lucide="edit-3" class="w-3.5 h-3.5"></i> Edit Staff
                    </button>
                    <button onclick="window.closeStaffDetailModal()" class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-xs transition-all cursor-pointer">
                        ${window.t('close', 'Close')}
                    </button>
                </div>
            </div>
        </div>
    `;

    openModal(modalHtml);
    if (window.lucide) window.lucide.createIcons();
};

window.closeStaffDetailModal = function() {
    closeModal();
};

window.openHRActionModal = function(staffId) {
    if (!window.currentAllStaff) return;
    const s = window.currentAllStaff.find(item => item.id === staffId);
    if (!s) return;

    const todayStr = new Date().toISOString().slice(0, 10);
    const currentStatus = s.status || 'active';

    const actionOptions = [
        { value: '', label: '-- Choose HR Action --', icon: 'shield-alert' },
        { value: 'promotion', label: 'Promote Employee (Role & Salary Upgrade)', icon: 'trending-up' },
        { value: 'demotion', label: 'Demote Employee (Role Change & Salary Adjustment)', icon: 'trending-down' },
        { value: 'salary_reduction', label: 'Salary Reduction', icon: 'dollar-sign' },
        { value: 'suspension', label: 'Suspend Employee', icon: 'pause-circle' },
        { value: 'layoff', label: 'Layoff Employee', icon: 'archive' },
        { value: 'termination', label: 'Terminate Employee', icon: 'user-x' }
    ];
    if (currentStatus !== 'active') {
        actionOptions.push({ value: 'reinstate', label: 'Reinstate Employee (Reactivate)', icon: 'user-check' });
    }

    const modalHtml = `
        <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden max-w-lg mx-auto w-full">
            <div class="modal-top-nav flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
                <div class="flex items-center gap-2.5">
                    <div class="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <i data-lucide="shield-alert" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-base sm:text-lg font-black text-gray-900 dark:text-white leading-tight">HR Lifecycle Action</h3>
                        <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">${s.name} (${s.role || 'Staff'})</p>
                    </div>
                </div>
                <button type="button" onclick="closeModal()" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <form onsubmit="event.preventDefault(); window.handleExecuteHRAction(event, '${staffId}');" class="flex flex-col flex-1 overflow-hidden">
                <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 scroller-custom">
                    <div class="bg-white dark:bg-gray-800/90 p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                        
                        <div>
                            <label for="hrActionType" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Select HR Action *</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'hrActionType',
                                selectedValue: '',
                                placeholder: '-- Choose HR Action --',
                                searchable: false,
                                onChange: 'window.toggleHRActionFields(this.value)',
                                options: actionOptions
                            }) : ''}
                        </div>

                        <!-- Promotion / Demotion Role Field -->
                        <div id="hrRoleField" class="hidden space-y-1.5">
                            <label for="hrNewRole" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">New Job Title / Role *</label>
                            <input type="text" id="hrNewRole" class="form-input w-full font-bold" placeholder="e.g. Senior Store Manager" value="${s.role || ''}">
                        </div>

                        <!-- Salary Field -->
                        <div id="hrSalaryField" class="hidden space-y-1.5">
                            <label for="hrNewSalary" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">New Base Salary (TZS) *</label>
                            <input type="number" id="hrNewSalary" class="form-input w-full font-bold text-emerald-600 dark:text-emerald-400" placeholder="e.g. 650000" value="${s.salary || 0}">
                            <p class="text-[11px] text-gray-400">Current Salary: ${window.fmt.currency(s.salary || 0)}</p>
                        </div>

                        <!-- Effective Date -->
                        <div>
                            <label for="hrEffectiveDate" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Effective Date *</label>
                            <input type="date" id="hrEffectiveDate" required class="form-input w-full font-bold" value="${todayStr}">
                        </div>

                        <!-- Action Reason & Audit Remarks -->
                        <div>
                            <label for="hrReasonNotes" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Reason & Official HR Remarks *</label>
                            <textarea id="hrReasonNotes" rows="3" required class="form-input w-full text-xs" placeholder="Describe rationale, performance metrics, disciplinary reason, or severance details..."></textarea>
                        </div>
                    </div>
                </div>

                <div class="modal-bottom-nav flex-none p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-end gap-3 z-20">
                    <button type="button" onclick="closeModal()" class="px-5 py-2 rounded-xl font-bold text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-all cursor-pointer">
                        ${window.t('btn_cancel', 'Cancel')}
                    </button>
                    <button type="submit" class="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5">
                        <i data-lucide="check-circle" class="w-4 h-4"></i>
                        <span>Apply HR Action</span>
                    </button>
                </div>
            </form>
        </div>`;

    window.toggleHRActionFields = function(actionVal) {
        const roleField = document.getElementById('hrRoleField');
        const salaryField = document.getElementById('hrSalaryField');
        if (!roleField || !salaryField) return;

        if (actionVal === 'promotion' || actionVal === 'demotion') {
            roleField.classList.remove('hidden');
            salaryField.classList.remove('hidden');
        } else if (actionVal === 'salary_reduction') {
            roleField.classList.add('hidden');
            salaryField.classList.remove('hidden');
        } else {
            roleField.classList.add('hidden');
            salaryField.classList.add('hidden');
        }
    };

    openModal(modalHtml);
    if (window.lucide) window.lucide.createIcons();
};

window.handleExecuteHRAction = async function(event, staffId) {
    if (!window.currentAllStaff) return;
    const s = window.currentAllStaff.find(item => item.id === staffId);
    if (!s) return;

    const actionType = document.getElementById('hrActionType')?.value;
    const newRole = document.getElementById('hrNewRole')?.value?.trim();
    const newSalaryVal = document.getElementById('hrNewSalary')?.value;
    const newSalary = parseFloat(newSalaryVal || s.salary || '0');
    const effectiveDate = document.getElementById('hrEffectiveDate')?.value;
    const reasonNotes = document.getElementById('hrReasonNotes')?.value?.trim();

    if (!actionType || !effectiveDate || !reasonNotes) {
        showToast('Please select an action type, date, and enter reason remarks.', 'error');
        return;
    }

    let newStatus = s.status || 'active';
    let roleToUpdate = s.role;
    let salaryToUpdate = s.salary;

    if (actionType === 'promotion' || actionType === 'demotion') {
        if (!newRole) {
            showToast('Please enter the new job role/title.', 'error');
            return;
        }
        roleToUpdate = newRole;
        salaryToUpdate = newSalary;
        newStatus = 'active';
    } else if (actionType === 'salary_reduction') {
        salaryToUpdate = newSalary;
        newStatus = 'active';
    } else if (actionType === 'suspension') {
        newStatus = 'suspended';
    } else if (actionType === 'layoff') {
        newStatus = 'laid_off';
    } else if (actionType === 'termination') {
        newStatus = 'terminated';
    } else if (actionType === 'reinstate') {
        newStatus = 'active';
    }

    let existingHistory = s.hr_history || [];
    if (typeof existingHistory === 'string') {
        try { existingHistory = JSON.parse(existingHistory); } catch (e) { existingHistory = []; }
    }

    const logEntry = {
        id: 'hr_' + Date.now(),
        action: actionType,
        date: effectiveDate,
        old_role: s.role,
        new_role: roleToUpdate,
        old_salary: s.salary,
        new_salary: salaryToUpdate,
        old_status: s.status || 'active',
        new_status: newStatus,
        reason: reasonNotes,
        created_at: new Date().toISOString()
    };

    const updatedHistory = [...existingHistory, logEntry];

    const payload = {
        role: roleToUpdate,
        salary: salaryToUpdate,
        status: newStatus,
        hr_history: updatedHistory
    };

    try {
        await dbStaff.update(staffId, payload);
        if (window.showToast) window.showToast(`HR Action recorded successfully!`, 'success');
        closeModal();
        if (window.renderOwnerStaffModule) window.renderOwnerStaffModule();
    } catch (err) {
        console.error('[ExecuteHRAction] Error recording HR action:', err);
        if (window.showToast) window.showToast('Failed to record HR action: ' + err.message, 'error');
    }
};
