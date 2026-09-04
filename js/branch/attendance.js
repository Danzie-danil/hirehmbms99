
import { dbStaff, dbAttendance } from '../db.js';

export async function renderAttendanceModule() {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader('Loading attendance...');
    lucide.createIcons();

    try {
        const today = new Date().toISOString().slice(0, 10);
        const savedDate = state._attendanceDate || today;

        const records = await dbAttendance.fetchByBranchAndDate(state.branchId, savedDate);


        const present = (records || []).filter(r => r.status === 'present' || r.status === 'late');
        const absent = (records || []).filter(r => r.status === 'absent');
        const halfDay = (records || []).filter(r => r.status === 'half_day');

        const statusStyles = {
            present: { badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
            late: { badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
            absent: { badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
            half_day: { badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' }
        };

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="inline-flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm rounded-2xl p-1 pr-2">
                    <div class="bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0"><i data-lucide="clock" class="w-3.5 h-3.5"></i> ${window.t('attendance_title', 'Attendance')}</div>
                    ${window.renderPremiumDatePicker({
                        id: 'attendanceDatePicker',
                        selectedValue: savedDate,
                        max: today,
                        classes: '!h-8 !py-1 !px-2.5 !border-0 shadow-none text-xs',
                        onChange: 'state._attendanceDate = this.value; renderAttendanceModule()'
                    })}
                </div>
                <button onclick="openAttendanceModal()" class="btn-primary gap-2 text-sm px-4 py-2 rounded-xl">
                    <i data-lucide="plus" class="w-4 h-4"></i> ${window.t('btn_mark_attendance', 'Mark Attendance')}
                </button>
            </div>

            <div class="grid grid-cols-3 gap-3">
                <div class="bg-emerald-50 border border-emerald-100 px-4 py-3 rounded-2xl stat-card">
                    <p class="text-xs text-emerald-600 uppercase tracking-tight font-bold">${window.t('stat_present', 'Present')}</p>
                    <p class="text-3xl font-black text-emerald-700 mt-1">${present.length}</p>
                </div>
                <div class="bg-red-50 border border-red-100 px-4 py-3 rounded-2xl stat-card">
                    <p class="text-xs text-red-500 uppercase tracking-tight font-bold">${window.t('stat_absent', 'Absent')}</p>
                    <p class="text-3xl font-black text-red-600 mt-1">${absent.length}</p>
                </div>
                <div class="bg-blue-50 border border-blue-100 px-4 py-3 rounded-2xl stat-card">
                    <p class="text-xs text-blue-500 uppercase tracking-tight font-bold">${window.t('stat_half_day', 'Half Day')}</p>
                    <p class="text-3xl font-black text-blue-600 mt-1">${halfDay.length}</p>
                </div>
            </div>

            <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 class="font-bold text-gray-900">${window.t('todays_log', 'Today\'s Log')}</h3>
                    <span class="text-xs text-gray-400">${(records || []).length} records</span>
                </div>
                ${(records || []).length === 0 ? `
                <div class="py-16 text-center text-gray-400">
                    <i data-lucide="users" class="w-10 h-10 mx-auto mb-3 opacity-20"></i>
                    <p class="text-sm font-medium">${window.t('no_attendance_records', 'No attendance records for this date')}</p>
                    <p class="text-xs mt-1">Click "${window.t('btn_mark_attendance', 'Mark Attendance')}" to add records</p>
                </div>` : `
                <div class="divide-y divide-gray-50">
                    ${(records || []).map(r => {
            const style = statusStyles[r.status] || statusStyles.present;
            const clockIn = r.clock_in ? new Date(r.clock_in).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
            const clockOut = r.clock_out ? new Date(r.clock_out).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—';
            const hours = r.clock_in && r.clock_out
                ? ((new Date(r.clock_out) - new Date(r.clock_in)) / 3600000).toFixed(1) + 'h'
                : r.clock_in ? 'In progress' : '—';
            return `
                        <div class="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                            <div class="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center flex-shrink-0">
                                <span class="font-black text-sm text-indigo-600">${r.staff_name.charAt(0).toUpperCase()}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <p class="font-semibold text-gray-900">${r.staff_name}</p>
                                <div class="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                                    <span>In: <strong class="text-gray-700">${clockIn}</strong></span>
                                    <span>Out: <strong class="text-gray-700">${clockOut}</strong></span>
                                    <span>${hours}</span>
                                </div>
                                ${r.notes ? `<p class="text-xs text-gray-400 italic mt-0.5">${r.notes}</p>` : ''}
                            </div>
                            <div class="flex items-center gap-2">
                                <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${style.badge}">
                                    <span class="w-1.5 h-1.5 rounded-full ${style.dot}"></span>
                                    ${r.status.replace('_', ' ')}
                                </span>
                                ${!r.clock_out && r.status !== 'absent' ? `
                                <button onclick="clockOutStaff('${r.id}')" class="px-2.5 py-1 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors">
                                    ${window.t('btn_clock_out', 'Clock Out')}
                                </button>` : ''}
                                <button onclick="deleteAttendance('${r.id}')" class="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                                </button>
                            </div>
                        </div>`;
        }).join('')}
                </div>`}
            </div>
        </div>`;
        lucide.createIcons();
    } catch (err) {
        document.getElementById('mainContent').innerHTML = `<div class="py-20 text-center text-red-500">Failed: ${err.message}</div>`;
    }
};

window.openAttendanceModal = async function () {
    const today = new Date().toISOString().slice(0, 10);

    const now = new Date();
    const roundedMin = Math.floor(now.getMinutes() / 15) * 15;
    const nowSlot = `${String(now.getHours()).padStart(2, '0')}:${String(roundedMin).padStart(2, '0')}`;

    let staffList = window._cachedBranchStaffList || [];
    if (!staffList || staffList.length === 0) {
        try {
            staffList = (await dbStaff.fetchAll(state.branchId)) || [];
            window._cachedBranchStaffList = staffList;
        } catch (e) {
            console.warn('[attendance] failed to fetch staff list:', e);
            staffList = [];
        }
    }

    const staffOptions = (staffList || []).map(s => ({
        value: s.name,
        label: `${s.name} (${s.role || 'Staff'})`,
        icon: 'user'
    }));

    const modalHtml = `
    <form onsubmit="event.preventDefault(); submitAttendance();" class="flex flex-col h-full min-h-0 overflow-hidden">
        <!-- TOP NAV / HEADER -->
        <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center gap-3.5 justify-start z-20">
            <button type="button" onclick="closeModal()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
                <span>${window.t('back', 'Back')}</span>
            </button>
            <div class="flex items-center gap-3 min-w-0">
                <div class="w-9 h-9 rounded-xl bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                    <i data-lucide="calendar-check" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${window.t('btn_mark_attendance', 'Mark Attendance')}</h3>
                    <p class="text-[11px] font-bold text-gray-500 dark:text-gray-400 truncate">Record staff daily attendance and clock hours</p>
                </div>
            </div>
        </div>

        <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
        <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label for="attStaff" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Staff Member *</label>
                    ${staffOptions.length > 0 ? window.renderPremiumSelect({
                        id: 'attStaff',
                        selectedValue: staffOptions[0]?.value || '',
                        placeholder: 'Select staff member...',
                        searchable: true,
                        required: true,
                        options: staffOptions
                    }) : `
                    <input type="text" id="attStaff" required class="form-input w-full" placeholder="e.g. Jane Smith">
                    <p class="text-[10px] text-amber-500 mt-1">No staff records found. Type name manually.</p>
                    `}
                </div>
                <div>
                    <label for="attDate" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Date</label>
                    ${window.renderPremiumDatePicker({
                        id: 'attDate',
                        selectedValue: today,
                        max: today,
                        required: true,
                        classes: 'w-full'
                    })}
                </div>
            </div>
            <div>
                <label for="attStatus" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status *</label>
                ${window.renderPremiumSelect({
                    id: 'attStatus',
                    selectedValue: 'present',
                    searchable: false,
                    options: [
                        { value: 'present', label: window.t('stat_present', 'Present'), icon: 'check-circle' },
                        { value: 'late', label: 'Late', icon: 'clock' },
                        { value: 'half_day', label: window.t('stat_half_day', 'Half Day'), icon: 'sun' },
                        { value: 'absent', label: window.t('stat_absent', 'Absent'), icon: 'x-circle' }
                    ]
                })}
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                        <i data-lucide="log-in" class="w-3.5 h-3.5 text-gray-400"></i> ${window.t('clock_in_label', 'Clock In')}
                    </label>
                    ${window.renderPremiumTimeSelect({ id: 'attClockIn', selectedValue: nowSlot, classes: 'w-full text-sm', startHour: 5 })}
                </div>
                <div>
                    <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 flex items-center gap-1.5">
                        <i data-lucide="log-out" class="w-3.5 h-3.5 text-gray-400"></i> ${window.t('clock_out_label', 'Clock Out')}
                    </label>
                    ${window.renderPremiumTimeSelect({ id: 'attClockOut', selectedValue: '', placeholder: 'Not yet', classes: 'w-full text-sm', startHour: 5 })}
                </div>
            </div>
            <div>
                <label for="attNotes" class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
                <input type="text" id="attNotes" class="form-input w-full" placeholder="e.g. Sick leave, Emergency...">
            </div>
        </div>

        <!-- BOTTOM NAV / FOOTER -->
        <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
            <button type="button" onclick="closeModal()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none">
                ${window.t('btn_cancel', 'Cancel')}
            </button>
            <button type="submit" class="px-6 py-2.5 rounded-xl font-black text-xs bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all">
                ${window.t('btn_save', 'Save Attendance')}
            </button>
        </div>
    </form>`;
    openModal(modalHtml);
};

window.submitAttendance = async function () {
    const staffName = document.getElementById('attStaff')?.value?.trim();
    const date = document.getElementById('attDate')?.value;
    const status = document.getElementById('attStatus')?.value;

    const clockInTime = document.getElementById('attClockIn')?.value;
    const clockOutTime = document.getElementById('attClockOut')?.value;
    const notes = document.getElementById('attNotes')?.value?.trim();

    if (!staffName || !date || !status) { showToast('Staff name, date and status are required', 'error'); return; }

    const clockIn = clockInTime ? `${date}T${clockInTime}:00` : null;
    const clockOut = clockOutTime ? `${date}T${clockOutTime}:00` : null;

    const submitBtn = document.querySelector('.modal-bottom-nav button[type="submit"]');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
    }

    try {
        await dbAttendance.create({
            branch_id: state.branchId, staff_name: staffName, date, status, clock_in: clockIn, clock_out: clockOut, notes
        });
        showToast('Attendance recorded!', 'success');
        closeModal();
        renderAttendanceModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = window.t('btn_save', 'Save Attendance');
        }
    }
};

window.clockOutStaff = async function (id) {
    try {
        await dbAttendance.clockOut(id);
        showToast('Clocked out!', 'success');
        renderAttendanceModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.deleteAttendance = async function (id) {
    const ok = await confirmModal('Delete Record', 'Remove this attendance record?', 'Delete', 'Cancel');
    if (!ok) return;
    try {
        await dbAttendance.delete(id);
        showToast('Deleted', 'info');
        renderAttendanceModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

