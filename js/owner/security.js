import { state } from '../state.js';
import { dbProfile, dbSecurity } from '../db.js';
import { showToast, promptModal } from '../utils.js';


export function renderSecurity() {
    setTimeout(() => {
        loadSecurityAccessLogs();
    }, 50);

    return `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('security_management', 'Security Management')}</div>
            </div>
        </div>

        <div class="grid grid-cols-1 gap-6">
            <!-- Access Logs -->
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80">
                <h3 class="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i data-lucide="shield" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i> ${window.t('access_logs', 'Access Logs')}
                </h3>
                <div id="securityAccessLogsContainer" class="space-y-2 max-h-72 overflow-auto pr-1 scroller-custom">
                    <div class="flex items-center justify-center py-6 text-xs text-gray-400 font-medium">
                        <i data-lucide="loader-2" class="w-4 h-4 animate-spin mr-2"></i> ${window.t('loading', 'Loading access logs...')}
                    </div>
                </div>
            </div>

            <!-- General Security Settings -->
            <div class="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-xs border border-gray-200/80 dark:border-gray-700/80">
                <h3 class="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <i data-lucide="settings" class="w-5 h-5 text-indigo-600 dark:text-indigo-400"></i> ${window.t('security_policies', 'Security Policies')}
                </h3>
                <div class="grid grid-cols-1 gap-4">
                    <div onclick="editSessionDuration()" class="p-4 border border-gray-200/80 dark:border-gray-700/80 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 cursor-pointer transition-all group">
                        <div class="flex items-center justify-between mb-1">
                            <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide font-bold">${window.t('session_duration', 'Session Duration')}</p>
                            <i data-lucide="edit-2" class="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500"></i>
                        </div>
                        <p class="text-lg font-extrabold text-indigo-600 dark:text-indigo-400">${state.profile?.session_duration_hrs || 8} ${window.t('hours', 'hours')}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${window.t('force_logout_desc', 'Force logout idle sessions to protect data.')}</p>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

export async function loadSecurityAccessLogs() {
    const container = document.getElementById('securityAccessLogsContainer');
    if (!container) return;

    try {
        const ownerId = state.ownerId || state.currentUserUuid || state.profile?.id;
        const logs = await dbSecurity.fetchSecurityLogs(ownerId);


        if (!logs || logs.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center py-8 text-center text-gray-400 dark:text-gray-500">
                    <i data-lucide="shield-check" class="w-10 h-10 text-emerald-500/80 mb-2"></i>
                    <p class="text-sm font-bold text-gray-700 dark:text-gray-300">${window.t('no_access_logs', 'No Access Logs Found')}</p>
                    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${window.t('no_access_logs_desc', 'Security events and user access logs will be recorded here in real-time.')}</p>
                </div>`;
            if (window.lucide) window.lucide.createIcons();
            return;
        }

        container.innerHTML = logs.map(log => {
            const isSuccess = !log.severity || log.severity === 'info' || log.severity === 'low';
            const dotColor = isSuccess ? 'bg-emerald-500' : 'bg-rose-500';
            const title = log.event_type || log.action || log.message || 'Security Event';
            const sub = `${log.email || log.user_id || 'System'} · ${new Date(log.created_at).toLocaleString()}`;
            return `
                <div class="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-100 dark:border-gray-700/50">
                    <div class="w-2.5 h-2.5 rounded-full ${dotColor} flex-shrink-0"></div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${title}</p>
                        <p class="text-xs text-gray-500 dark:text-gray-400 truncate">${sub}</p>
                    </div>
                </div>`;
        }).join('');

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.warn('Failed to fetch security logs:', err);
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center text-gray-400 dark:text-gray-500">
                <i data-lucide="shield-check" class="w-10 h-10 text-emerald-500/80 mb-2"></i>
                <p class="text-sm font-bold text-gray-700 dark:text-gray-300">${window.t('no_access_logs', 'No Access Logs Found')}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">${window.t('no_access_logs_desc', 'Security events and user access logs will be recorded here in real-time.')}</p>
            </div>`;
        if (window.lucide) window.lucide.createIcons();
    }
}

export async function editSessionDuration() {
    if (!state.profile || !state.profile.id) return showToast('Profile not loaded', 'error');

    const current = state.profile?.session_duration_hrs || 8;
    const val = await promptModal('Session Duration', 'Enter session length in hours (auto-logout):', 'e.g. 8, 12, 24...', current);
    if (val === null || val == current) return;

    const hrs = parseInt(val);
    if (isNaN(hrs) || hrs < 1) return showToast('Please enter a valid number of hours', 'error');

    dbProfile.updateSecurity(state.profile.id, {
        pin_expiry_days: state.profile?.pin_expiry_days || 90,
        session_duration_hrs: hrs
    }).then(() => {
        state.profile.session_duration_hrs = hrs;
        showToast('Session Duration policy updated');
        switchView('security');
    }).catch(err => showToast(err.message, 'error'));
}
