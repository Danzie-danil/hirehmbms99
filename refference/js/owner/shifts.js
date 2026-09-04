import { supabase as supabaseClient } from '../supabase.js';
import { state } from '../state.js';
import { dbBranches, dbStaff, dbCustomers } from '../db.js';
import { renderPremiumLoader, showToast, confirmModal, renderModuleOfflineState } from '../utils.js';

export async function renderShiftsModule() {
    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    if (!ownerId || ownerId === 'null' || ownerId === 'undefined') return;

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.remove('overflow-hidden', '!p-0');
    container.innerHTML = renderPremiumLoader('Loading staff shift schedules...');
    if (window.lucide) window.lucide.createIcons();

    try {
        const branches = await dbBranches.fetchAll(ownerId);
        const today = new Date();
        const DAYS = 7;
        const dates = Array.from({ length: DAYS }, (_, i) => {
            const d = new Date(today);
            d.setDate(today.getDate() + i);
            return d.toISOString().slice(0, 10);
        });

        const { data: shifts, error } = await supabaseClient
            .from('shifts')
            .select('*, branches(name)')
            .eq('owner_id', ownerId)
            .in('date', dates)
            .order('date', { ascending: true });

        if (error) throw error;

        const shiftsByDateBranch = {};
        (shifts || []).forEach(s => {
            const key = `${s.date}_${s.branch_id}_${s.shift_type}`;
            shiftsByDateBranch[key] = s;
        });

        const dayNames = dates.map(d => {
            const date = new Date(d);
            return {
                date: d,
                label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
            };
        });

        const shiftTypeColors = {
            morning: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300',
            evening: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300',
            night: 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
        };

        window.currentShiftsData = {
            branches,
            dayNames,
            shiftsByDateBranch,
            shiftTypeColors
        };

        container.innerHTML = `
        <div class="space-y-5 slide-in max-w-7xl mx-auto pb-8">
            <!-- Header Section -->
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-4 sm:p-5 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-xs">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold shrink-0 shadow-xs">
                        <i data-lucide="calendar" class="w-5 h-5 sm:w-6 sm:h-6"></i>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <h2 class="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">Shift Roster & Timetable</h2>
                            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-100 dark:border-blue-800/50">
                                7-Day Matrix
                            </span>
                        </div>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Organize morning, evening, and night work rotations across branch personnel</p>
                    </div>
                </div>
                <button onclick="renderAddShiftView()" class="w-full sm:w-auto px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0">
                    <i data-lucide="plus-circle" class="w-4 h-4"></i>
                    <span>Schedule Shift</span>
                </button>
            </div>

            <!-- Shift Schedule Card -->
            <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-xs border border-gray-100 dark:border-gray-800 overflow-hidden">
                <!-- Desktop Table Matrix View -->
                <div class="overflow-x-auto hidden md:block">
                    <table class="w-full text-xs min-w-[750px]">
                        <thead class="bg-gray-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                            <tr>
                                <th class="text-left px-4 py-3.5 w-32">${window.t('location_branch', 'Branch')}</th>
                                ${dayNames.map(d => `
                                <th class="text-center px-2 py-3.5">
                                    <div class="text-[10px] text-gray-400 font-bold">${d.label.split(' ')[0]}</div>
                                    <div class="font-black text-gray-800 dark:text-gray-200 text-xs">${d.label.split(', ')[1] || d.label.slice(4)}</div>
                                </th>`).join('')}
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                            ${(branches || []).map(b => `<tr class="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors">
                                <td class="px-4 py-3.5 font-bold text-gray-900 dark:text-white text-xs truncate max-w-[130px]">${b.name}</td>
                                ${dayNames.map(d => {
                                    const shiftCells = ['morning', 'evening', 'night'].map(type => {
                                        const s = shiftsByDateBranch[`${d.date}_${b.id}_${type}`];
                                        if (!s) return '';
                                        const iconName = type === 'morning' ? 'sunrise' : (type === 'evening' ? 'sunset' : 'moon');
                                        return `<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${shiftTypeColors[type]} mb-0.5">
                                            <i data-lucide="${iconName}" class="w-3 h-3"></i>
                                            <span>${s.staff_count || 1}</span>
                                            <button onclick="deleteShift('${s.id}')" class="ml-0.5 opacity-60 hover:opacity-100 text-red-500 hover:scale-110 transition-all" title="Remove Shift">
                                                <i data-lucide="x" class="w-2.5 h-2.5"></i>
                                            </button>
                                        </div>`;
                                    }).join('');
                                    return `<td class="px-2 py-2 text-center align-middle">
                                        <div class="flex flex-col items-center justify-center gap-0.5 min-h-[36px]">
                                            ${shiftCells || '<span class="text-gray-300 dark:text-gray-700 text-xs">—</span>'}
                                        </div>
                                    </td>`;
                                }).join('')}
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>

                <!-- Mobile Card List View -->
                <div class="md:hidden divide-y divide-gray-100 dark:divide-gray-800 p-4 space-y-3">
                    ${(branches || []).map(b => {
                        return `
                        <div class="bg-gray-50/70 dark:bg-gray-800/40 p-3.5 rounded-2xl border border-gray-150 dark:border-gray-800 space-y-2.5">
                            <h4 class="font-extrabold text-indigo-600 dark:text-indigo-400 text-xs uppercase tracking-wider pb-1 border-b border-gray-200/60 dark:border-gray-700/60 flex items-center justify-between">
                                <span>${b.name}</span>
                                <span class="text-[10px] text-gray-400 font-bold lowercase">7 days</span>
                            </h4>
                            <div class="space-y-1.5">
                                ${dayNames.map(d => {
                                    const shiftCells = ['morning', 'evening', 'night'].map(type => {
                                        const s = shiftsByDateBranch[`${d.date}_${b.id}_${type}`];
                                        if (!s) return '';
                                        const iconName = type === 'morning' ? 'sunrise' : (type === 'evening' ? 'sunset' : 'moon');
                                        return `<div class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold ${shiftTypeColors[type]}">
                                            <i data-lucide="${iconName}" class="w-3 h-3"></i>
                                            <span>${s.staff_count || 1} staff</span>
                                            <button onclick="deleteShift('${s.id}')" class="ml-0.5 text-red-500">
                                                <i data-lucide="x" class="w-2.5 h-2.5"></i>
                                            </button>
                                        </div>`;
                                    }).filter(Boolean).join(' ');

                                    return `
                                    <div class="flex items-center justify-between py-1 text-xs">
                                        <span class="text-gray-500 dark:text-gray-400 text-[11px] font-semibold">${d.label}</span>
                                        <div class="flex items-center gap-1 flex-wrap justify-end">
                                            ${shiftCells || '<span class="text-gray-300 dark:text-gray-700 text-xs">—</span>'}
                                        </div>
                                    </div>`;
                                }).join('')}
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Footer Legend -->
                <div class="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 flex-wrap text-xs text-gray-500 dark:text-gray-400 bg-gray-50/40 dark:bg-gray-900/40">
                    <div class="flex items-center gap-1.5 font-medium">
                        <span class="w-4 h-4 rounded-md border ${shiftTypeColors.morning} flex items-center justify-center text-amber-600"><i data-lucide="sunrise" class="w-2.5 h-2.5"></i></span> Morning (6am–2pm)
                    </div>
                    <div class="flex items-center gap-1.5 font-medium">
                        <span class="w-4 h-4 rounded-md border ${shiftTypeColors.evening} flex items-center justify-center text-orange-600"><i data-lucide="sunset" class="w-2.5 h-2.5"></i></span> Evening (2pm–10pm)
                    </div>
                    <div class="flex items-center gap-1.5 font-medium">
                        <span class="w-4 h-4 rounded-md border ${shiftTypeColors.night} flex items-center justify-center text-indigo-600"><i data-lucide="moon" class="w-2.5 h-2.5"></i></span> Night (10pm–6am)
                    </div>
                    <span class="text-[11px] text-gray-400 ml-auto font-medium">Badges show assigned staff count per shift</span>
                </div>
            </div>
        </div>`;

        if (window.lucide) window.lucide.createIcons();

    } catch (err) {
        console.error('[OwnerShifts] Error loading shifts:', err);
        if (container) {
            container.innerHTML = renderModuleOfflineState({
                viewId: 'shifts',
                title: 'Staff Shift Schedules',
                entityName: 'Staff Shift Schedules',
                retryAction: 'window.renderShiftsModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

// ── STANDARD MODAL/PAGE VIEW CONTAINER MATCHING ASSIGN NEW TASK ────────────────
export async function renderAddShiftView() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.add('overflow-hidden', '!p-0');

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);
    const branches = state.branches || (await dbBranches.fetchAll(ownerId)) || [];
    const todayDate = new Date().toISOString().slice(0, 10);

    let allStaff = [];
    let allCustomers = [];
    try {
        const staffRes = await dbStaff.fetchAllByOwner(ownerId);
        allStaff = Array.isArray(staffRes) ? staffRes : (staffRes?.items || []);
    } catch (e) {
        console.warn('[AddShiftView] Fetch staff warning:', e);
    }

    try {
        const branchIds = (branches || []).map(b => b.id);
        if (branchIds.length > 0) {
            const customerLists = await Promise.all(
                branchIds.map(bId => dbCustomers.fetchAllList(bId).catch(() => []))
            );
            const flatCust = customerLists.flat().filter(Boolean);
            allCustomers = flatCust.filter((c, idx, arr) => arr.findIndex(x => x.name === c.name) === idx);
        }
    } catch (e) {
        console.warn('[AddShiftView] Fetch customers warning:', e);
    }

    if (!Array.isArray(allStaff)) allStaff = [];
    if (!Array.isArray(allCustomers)) allCustomers = [];

    const branchMap = new Map((branches || []).map(b => [b.id, b.name]));
    const personnelOptions = [
        ...allStaff.map(st => ({
            value: st.name,
            label: st.name,
            subtitle: `${st.role || 'Staff'} • ${branchMap.get(st.branch_id) || 'Branch'}`,
            icon: 'user-check'
        })),
        ...allCustomers.map(cust => ({
            value: cust.name,
            label: cust.name,
            subtitle: `Customer ${cust.phone ? '• ' + cust.phone : ''}`,
            icon: 'user'
        }))
    ];

    container.innerHTML = `
    <div class="flex flex-col h-full bg-slate-50/50 dark:bg-gray-900 overflow-hidden">
        <!-- Top Nav Header -->
        <div class="modal-top-nav flex items-center gap-3 px-6 py-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex-none">
            <button type="button" onclick="renderShiftsModule()" class="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200 dark:border-gray-700">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('btn_close', 'Close')}</span>
            </button>
            <div class="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 flex items-center justify-center font-bold text-base shrink-0 border border-gray-200/80 dark:border-gray-700">
                <i data-lucide="calendar" class="w-4 h-4"></i>
            </div>
            <div>
                <h3 class="text-lg sm:text-xl font-black text-gray-900 dark:text-white leading-tight">Schedule Work Shift</h3>
                <p class="text-xs font-semibold text-gray-500 dark:text-gray-400">Assign staff counts and work rotation shifts</p>
            </div>
        </div>

        <!-- Form Body Container -->
        <form onsubmit="event.preventDefault(); submitShift();" class="flex flex-col flex-1 overflow-hidden">
            <div class="flex-1 overflow-y-auto p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 scroller-custom">
                <div class="bg-white dark:bg-gray-800/90 p-5 sm:p-6 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-4">
                    <div>
                        <label for="shiftBranch" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">${window.t('assign_to_branch', 'Branch Location')} *</label>
                        ${window.renderPremiumSelect ? window.renderPremiumSelect({
                            id: 'shiftBranch',
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
                            <label for="shiftDate" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Shift Date *</label>
                            ${window.renderPremiumDatePicker ? window.renderPremiumDatePicker({
                                id: 'shiftDate',
                                selectedValue: todayDate,
                                min: todayDate,
                                required: true,
                                classes: 'w-full'
                            }) : `<input type="date" id="shiftDate" required class="form-input w-full" value="${todayDate}" min="${todayDate}">`}
                        </div>
                        <div>
                            <label for="shiftType" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Shift Type *</label>
                            ${window.renderPremiumSelect ? window.renderPremiumSelect({
                                id: 'shiftType',
                                selectedValue: 'morning',
                                searchable: false,
                                options: [
                                    { value: 'morning', label: 'Morning (6am–2pm)', icon: 'sunrise' },
                                    { value: 'evening', label: 'Evening (2pm–10pm)', icon: 'sunset' },
                                    { value: 'night', label: 'Night (10pm–6am)', icon: 'moon' }
                                ]
                            }) : ''}
                        </div>
                    </div>

                    <div>
                        <label for="shiftStaff" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Assigned Personnel & Staff Names</label>
                        ${window.renderPremiumMultiSelect ? window.renderPremiumMultiSelect({
                            id: 'shiftStaff',
                            placeholder: 'Select assigned staff members or customers...',
                            selectedValues: [],
                            options: personnelOptions
                        }) : '<input type="text" id="shiftStaff" class="form-input w-full font-bold" placeholder="Type staff names...">'}
                    </div>

                    <div>
                        <label for="shiftStaffCount" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Total Staff Count (Auto-Calculated)</label>
                        <input type="number" id="shiftStaffCount" readonly tabindex="-1" required class="form-input w-full font-black text-indigo-600 dark:text-indigo-400 bg-gray-50 dark:bg-gray-800/60 cursor-not-allowed select-none" value="0" min="0" max="100">
                        <p class="text-[11px] text-gray-400 font-medium mt-1">Automatically computed based on selected personnel above</p>
                    </div>

                    <div>
                        <label for="shiftNotes" class="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1.5">Handover Notes / Instructions (Optional)</label>
                        <textarea id="shiftNotes" rows="3" class="form-input w-full" placeholder="Add specific task requirements or handover remarks..."></textarea>
                    </div>
                </div>
            </div>

            <!-- Bottom Action Nav Footer -->
            <div class="modal-bottom-nav flex-none p-3.5 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
                <button type="button" onclick="renderShiftsModule()" class="px-6 py-2 rounded-full font-bold text-xs bg-red-600 hover:bg-red-700 text-white shadow-sm transition-all cursor-pointer">
                    ${window.t('btn_cancel', 'Cancel')}
                </button>
                <button type="submit" class="px-6 py-2 bg-[#2c3e50] hover:bg-[#1a252f] text-white rounded-full font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2">
                    <span>Schedule Shift</span>
                </button>
            </div>
        </form>
    </div>`;

    if (window.lucide) window.lucide.createIcons();
}

window.renderShiftsModule = renderShiftsModule;
window.renderAddShiftView = renderAddShiftView;
window.openShiftModal = renderAddShiftView;

window.submitShift = async function () {
    const branchId = document.getElementById('shiftBranch')?.value;
    const date = document.getElementById('shiftDate')?.value;
    const shiftType = document.getElementById('shiftType')?.value;
    const staffMembers = document.getElementById('shiftStaff')?.value?.trim();
    const staffCount = parseInt(document.getElementById('shiftStaffCount')?.value || '1');
    const notes = document.getElementById('shiftNotes')?.value?.trim();

    if (!branchId || !date || !shiftType) {
        showToast('Branch location, date, and shift type are required', 'error');
        return;
    }

    try {
        const { error } = await supabaseClient.from('shifts').insert({
            owner_id: state.ownerId,
            branch_id: branchId,
            date,
            shift_type: shiftType,
            staff_members: staffMembers,
            staff_count: staffCount,
            notes
        });
        if (error) throw error;

        showToast('Shift rotation successfully scheduled!', 'success');
        renderShiftsModule();
    } catch (err) {
        showToast('Failed to schedule shift: ' + err.message, 'error');
    }
};

window.deleteShift = async function (id) {
    const ok = await confirmModal('Remove Shift', 'Are you sure you want to remove this scheduled shift?', 'Remove', 'Cancel');
    if (!ok) return;

    try {
        await supabaseClient.from('shifts').delete().eq('id', id);
        showToast('Shift removed', 'info');
        renderShiftsModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};
