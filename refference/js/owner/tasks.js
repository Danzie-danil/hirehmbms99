
import { state } from '../state.js';
import { supabase as supabaseClient } from '../supabase.js';
import { renderPremiumLoader, priorityBadge, statusBadge, fmt, openModal, openDetailsModal, filterList, renderModuleOfflineState } from '../utils.js';

import { dbBranches, dbTasks } from '../db.js';

export function setOwnerTasksStatusFilter(status) {
    ownerTasksStatusFilter = status;
    window.ownerTasksStatusFilter = status;

    const listContainer = document.getElementById('ownerTasksList');
    if (listContainer && window._rawOwnerTasks) {
        const activeFilter = window.ownerTasksStatusFilter || 'all';
        const filteredTasks = activeFilter === 'deleted' ? [] : window._rawOwnerTasks.filter(t => activeFilter === 'all' || t.status === activeFilter);
        listContainer.innerHTML = renderOwnerTasksListHTML(filteredTasks);
        if (window.lucide) window.lucide.createIcons();
    } else {
        renderTasksManagement();
    }
}

function renderOwnerTasksListHTML(tasks) {
    if (!tasks || tasks.length === 0) {
        return `
            <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                <i data-lucide="clipboard-list" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                <p class="text-gray-400 text-sm">${window.t('no_tasks_found', 'No tasks found.')}</p>
            </div>
        `;
    }

    return tasks.map(task => `
        <div onclick="openDetailsModal('task', '${task.id}')" data-search="${task.title.toLowerCase()} ${task.status}" class="bg-white border border-gray-200 border-l-[4px] ${task.status === 'completed' ? 'border-l-emerald-500 bg-emerald-50/10 opacity-75' : 'border-l-indigo-500'} rounded-2xl p-5 md:p-6 flex gap-4 hover:shadow-md transition-all group relative cursor-pointer">
            <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-3">
                    <div class="flex items-center gap-2.5 flex-1 min-w-0">
                        <h4 class="font-bold text-gray-900 text-sm sm:text-base ${task.status === 'completed' ? 'line-through text-gray-400' : ''} truncate">${task.title}</h4>
                        <span class="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg font-bold whitespace-nowrap">${task.branch?.name || '—'}</span>
                    </div>
                    <div class="flex items-center gap-2 flex-shrink-0 scale-95 origin-right">
                        ${priorityBadge(task.priority)}
                        ${statusBadge(task.status)}
                    </div>
                </div>
                <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <div class="flex items-center gap-1.5">
                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                        <span>${task.deadline ? fmt.date(task.deadline) : 'No deadline'}</span>
                    </div>
                    <span class="group-hover:text-indigo-600 font-bold transition-colors">${window.t('view_details', 'View Details')} <i data-lucide="chevron-right" class="w-3.5 h-3.5 inline"></i></span>
                </div>
            </div>
        </div>
    `).join('');
}

export async function renderTasksManagement() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    const ownerId = state.ownerId || state.currentUserUuid || (state.profile && state.profile.id);

    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('tasks_objectives', 'Tasks & Objectives')}</div>
            </div>
            <button onclick="openModal('assignTask')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0">
                <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('new_task', 'New Task')}
            </button>
        </div>
        ${renderPremiumLoader('Loading tasks…')}
    </div>`;
    if (window.lucide) window.lucide.createIcons();

    let myTasks = [];
    try {
        let branches = state.branches || [];
        if (!branches.length && ownerId) {
            try {
                branches = await dbBranches.fetchAll(ownerId);
                if (Array.isArray(branches)) state.branches = branches;
            } catch (e) {}
        }
        const branchMap = new Map((branches || []).map(b => [b.id, b.name]));
        const branchIds = (branches || []).map(b => b.id);

        if (branchIds.length > 0) {
            const { data: tasks, error } = await supabaseClient
                .from('tasks')
                .select('*')
                .in('branch_id', branchIds)
                .order('created_at', { ascending: false });

            if (!error && Array.isArray(tasks)) {
                myTasks = tasks.map(t => ({
                    ...t,
                    branch: { name: branchMap.get(t.branch_id) || 'Branch' }
                }));
            } else {
                myTasks = await dbTasks.fetchByOwner(ownerId);
            }
        } else {
            myTasks = await dbTasks.fetchByOwner(ownerId);
        }
    } catch (err) {
        console.warn('[OwnerTasks] Remote fetch error, falling back to localDb:', err);
        try {
            myTasks = await dbTasks.fetchByOwner(ownerId);
        } catch (dbErr) {
            myTasks = [];
        }
    }

    window._rawOwnerTasks = myTasks;

    try {
        const activeFilter = window.ownerTasksStatusFilter || 'all';
        const initialFilteredTasks = activeFilter === 'deleted' ? [] : myTasks.filter(t => activeFilter === 'all' || t.status === activeFilter);

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                    <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('tasks_objectives', 'Tasks & Objectives')}</div>
                </div>
                <button onclick="openModal('assignTask')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('new_task', 'New Task')}
                </button>
            </div>

            <!-- Status summary -->
            <div class="grid grid-cols-3 gap-4">
                ${[['pending', 'bg-gray-100 text-gray-700', window.t('pending', 'Pending')],
            ['in_progress', 'bg-blue-100 text-blue-700', window.t('in_progress', 'In Progress')],
            ['completed', 'bg-emerald-100 text-emerald-700', window.t('completed', 'Completed')]
            ].map(([s, cls, label]) => `
                <div class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
                    <span class="badge ${cls} mb-2">${label}</span>
                    <p class="text-2xl font-bold text-gray-900">${myTasks.filter(t => t.status === s).length}</p>
                </div>`).join('')}
            </div>

            <div class="space-y-4">
                <!-- Search & Filters -->
                <div class="flex flex-col sm:flex-row gap-2 mb-4">
                    <div class="relative flex-1 min-w-[200px]">
                        <div class="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                            <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                        </div>
                        <input type="text" placeholder="${window.t('search', 'Search')}..." oninput="filterList('ownerTasksList', this.value)" class="w-full pl-11 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" style="padding-left: 2.85rem !important;">
                    </div>
                    ${window.renderPremiumSelect({
                id: 'ownerTasksStatusFilter',
                selectedValue: window.ownerTasksStatusFilter || 'all',
                onchange: 'setOwnerTasksStatusFilter(this.value)',
                options: [
                    { value: 'all', label: window.t('all_status', 'All Status'), icon: 'list-todo' },
                    { value: 'pending', label: window.t('pending', 'Pending'), icon: 'clock' },
                    { value: 'in_progress', label: window.t('ongoing', 'Ongoing'), icon: 'play-circle' },
                    { value: 'completed', label: window.t('completed', 'Completed'), icon: 'check-circle' },
                    { value: 'deleted', label: window.t('delete', 'Deleted'), icon: 'trash-2' }
                ],
                classes: 'w-full sm:w-44'
            })}
                </div>
                <div id="ownerTasksList" class="space-y-4">
                    ${renderOwnerTasksListHTML(initialFilteredTasks)}
                </div>
            </div>
        </div>`;
        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('[OwnerTasks] Error rendering tasks view:', err);
        container.innerHTML = renderModuleOfflineState({
            viewId: 'tasks',
            title: 'Tasks & Projects',
            entityName: 'Task & Project Information',
            retryAction: 'window.renderTasksManagement()'
        });
        if (window.lucide) window.lucide.createIcons();
    }
}

window.renderTasksManagement = renderTasksManagement;
