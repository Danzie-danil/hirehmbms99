
let tasksSelection = new Set();
window.tasksSelection = tasksSelection;
let tasksPageState = {
    page: 1,
    pageSize: 5,
    totalCount: 0,
    statusFilter: 'all'
};
window.tasksPageState = tasksPageState;

export function setTasksStatusFilter(status) {
    tasksPageState.statusFilter = status;
    tasksPageState.page = 1;
    renderBranchTasks();
};

export function changeTasksPage(delta) {
    const newPage = tasksPageState.page + delta;
    const maxPage = Math.ceil(tasksPageState.totalCount / tasksPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    tasksPageState.page = newPage;
    renderBranchTasks();
};

export function toggleTaskSelection(id) {
    if (tasksSelection.has(id)) {
        tasksSelection.delete(id);
    } else {
        tasksSelection.add(id);
    }
    updateTaskBulkActionBar();
};

export function toggleSelectAllTasks(checked) {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    tasksSelection.clear();
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) tasksSelection.add(cb.value);
    });
    updateTaskBulkActionBar();
};

export function updateTaskBulkActionBar() {
    const count = tasksSelection.size;
    const countSpan = document.getElementById('tasksSelectedCount');
    if (countSpan) countSpan.textContent = `${count} selected`;

    const deleteBtn = document.getElementById('btnBulkDeleteTasks');
    if (deleteBtn) deleteBtn.disabled = count === 0;

    const tagBtn = document.getElementById('btnBulkTagTasks');
    if (tagBtn) tagBtn.disabled = count === 0;

    const selectAll = document.getElementById('selectAllTasks');
    const checkboxes = document.querySelectorAll('.task-checkbox');
    if (selectAll && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
};

export async function bulkDeleteSelectedTasks() {
    const count = tasksSelection.size;
    if (count === 0) return;
    const confirmed = await window.confirmModal('Confirm Deletion', 'Are you sure you want to delete the selected items?', 'Yes, Delete', 'Cancel');
    if (!confirmed) return;

    try {
        const ids = Array.from(tasksSelection);
        await dbTasks.bulkDelete(ids);
        tasksSelection.clear();
        showToast(`Deleted ${count} tasks`, 'success');
        renderBranchTasks();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

export async function openTaskTagModal(taskId, isBulk = false) {
    document.querySelectorAll('.tags-modal-overlay').forEach(el => el.remove());
    const title = isBulk ? `Tag ${tasksSelection.size} Tasks` : 'Manage Task Tags';

    let currentTags = [];
    if (!isBulk && taskId) {
        try {
            const allTags = await dbTaskTags.fetchAll(state.branchId);
            currentTags = allTags.filter(t => t.task_id === taskId);
        } catch (err) { console.error(err); }
    }

    const overlay = document.createElement('div');
    overlay.className = 'tags-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-200';
    overlay.style.opacity = '0';

    overlay.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-200">
            <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <i data-lucide="tag" class="w-5 h-5 text-indigo-500"></i> ${title}
                </h3>
                <button type="button" class="close-tags-btn p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-xl transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="p-6">
                <div class="flex gap-2 mb-6">
                    <input type="text" id="newTaskTagName" placeholder="New tag name..." class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <button id="submitTaskTagBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">Add</button>
                </div>

                ${!isBulk ? `
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Current Tags</p>
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${currentTags.length ? currentTags.map(t => `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                                # ${t.tag}
                                <i data-lucide="x" onclick="removeTaskTagModal('${t.id}', '${taskId}')" class="w-3.5 h-3.5 cursor-pointer hover:text-red-600"></i>
                            </span>
                        `).join('') : '<p class="text-xs text-gray-400 italic">No tags applied yet</p>'}
                    </div>
                ` : ''}

                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suggestions</p>
                <div class="flex flex-wrap gap-2">
                    ${['Operations', 'Sales', 'Admin', 'Maintenance', 'Urgent'].map(t => `
                        <button onclick="quickAddTaskTag('${t}', '${taskId}', ${isBulk})" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all uppercase tracking-tight">
                            + ${t}
                        </button>
                    `).join('')}
                </div>
            </div>

            <div class="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                <button class="bg-gray-900 text-white px-6 py-2 rounded-xl text-sm font-bold hover:bg-gray-800 transition-colors close-tags-btn">Done</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    lucide.createIcons();
    requestAnimationFrame(() => {
        overlay.style.opacity = '1';
        overlay.querySelector('.transform').classList.replace('scale-95', 'scale-100');
    });

    const closeTagsModal = () => {
        overlay.style.opacity = '0';
        overlay.querySelector('.transform').classList.replace('scale-100', 'scale-95');
        setTimeout(() => overlay.remove(), 200);
        renderBranchTasks();
    };

    overlay.querySelectorAll('.close-tags-btn').forEach(btn => btn.addEventListener('click', closeTagsModal));

    const submitBtn = overlay.querySelector('#submitTaskTagBtn');
    const input = overlay.querySelector('#newTaskTagName');

    const handleAdd = async () => {
        const tagName = input.value.trim();
        if (!tagName) return;
        submitBtn.disabled = true;
        try {
            if (isBulk) {
                const ids = Array.from(tasksSelection);
                await Promise.all(ids.map(id => dbTaskTags.add(state.branchId, id, tagName)));
                tasksSelection.clear();
                showToast(`Tagged ${ids.length} tasks`, 'success');
                closeTagsModal();
            } else {
                await dbTaskTags.add(state.branchId, taskId, tagName);
                openTaskTagModal(taskId, false);
            }
        } catch (err) { showToast('Error adding tag', 'error'); }
        finally { submitBtn.disabled = false; }
    };

    submitBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });

    window.removeTaskTagModal = async (tagId, taskId) => {
        try {
            await dbTaskTags.delete(tagId);
            openTaskTagModal(taskId, false);
        } catch (err) { showToast('Error', 'error'); }
    };

    window.quickAddTaskTag = async (tagName, taskId, isBulk) => {
        input.value = tagName;
        handleAdd();
    };
};

export function renderBranchTasks() {
    tasksSelection.clear();
    const container = document.getElementById('mainContent');

    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('branch_tasks', 'Branch Tasks')}</div>
            </div>
            <div class="flex items-center gap-1.5 sm:gap-2 text-gray-400 mr-2">
                <i data-lucide="clipboard-list" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i>
                <span class="text-[10px] sm:text-xs font-medium">${window.t('assigned_to_you', 'Assigned to you')}</span>
            </div>
        </div>
        ${renderPremiumLoader(window.t('loading_tasks', 'Loading tasks…'))}
    </div>`;
    lucide.createIcons();

    Promise.all([
        (window.dbTasks ? window.dbTasks.fetchAll(state.branchId, {
            page: tasksPageState.page,
            pageSize: tasksPageState.pageSize,
            statusFilter: tasksPageState.statusFilter
        }) : Promise.resolve({ items: [], count: 0 })),
        (window.dbTaskTags ? window.dbTaskTags.fetchAll(state.branchId).catch(() => []) : Promise.resolve([])),
        (window.dbStaff ? window.dbStaff.fetchAll(state.branchId).catch(() => []) : Promise.resolve([]))
    ]).then(([res, tags]) => {
        const tasks = res.items;
        tasksPageState.totalCount = res.count;
        const totalPages = Math.ceil(tasksPageState.totalCount / tasksPageState.pageSize) || 1;

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                    <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('branch_tasks', 'Branch Tasks')}</div>
                </div>
                <div class="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-100 rounded-xl shadow-sm">
                    <span class="text-xs text-gray-400 font-medium">Page ${tasksPageState.page} of ${totalPages}</span>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('tasks_list', 'Tasks List')}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 font-medium">Page ${tasksPageState.page} of ${totalPages}</span>
                    </div>
                </div>

                <!-- Search & Filters -->
                <div class="flex flex-col sm:flex-row gap-2 mb-3">
                    <div class="relative flex-1 min-w-[200px]">
                        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                            <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                        </div>
                        <input type="text" placeholder="${window.t('search_tasks', 'Search tasks...')}" oninput="filterList('tasksList', this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
                    </div>
                    ${window.renderPremiumSelect({
            id: 'branchTaskFilter',
            selectedValue: tasksPageState.statusFilter || 'all',
            onchange: 'setTasksStatusFilter(this.value)',
            options: [
                { value: 'all', label: window.t('filter_all_status', 'All Status'), icon: 'list-todo' },
                { value: 'pending', label: window.t('filter_pending', 'Pending'), icon: 'clock' },
                { value: 'in_progress', label: window.t('filter_ongoing', 'Ongoing'), icon: 'play-circle' },
                { value: 'completed', label: window.t('filter_completed', 'Completed'), icon: 'check-circle' },
                { value: 'deleted', label: window.t('filter_deleted', 'Deleted'), icon: 'trash-2' }
            ],
            classes: 'w-full sm:w-44'
        })}
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-2 mb-3 gap-2">
                    <div class="flex items-center gap-2.5 pl-1.5">
                        <input type="checkbox" id="selectAllTasks" onchange="toggleSelectAllTasks(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                        <span class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="tasksSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkDeleteTasks" disabled onclick="bulkDeleteSelectedTasks()" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagTasks" disabled onclick="openTaskTagModal(null, true)" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-500"></i> <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <div class="space-y-4" id="tasksList">
                    ${tasks.length === 0 ? `
                        <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <i data-lucide="list-todo" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                            <p class="text-gray-400 text-sm">${window.t('no_tasks_found', 'No tasks history found for this page')}</p>
                        </div>
                    ` : tasks.map(task => `
                        <div onclick="openDetailsModal('task', '${task.id}')" data-search="${task.title.toLowerCase()} ${(task.description || '').toLowerCase()} ${task.priority} ${task.status}" class="bg-white border border-gray-200 border-l-[4px] ${task.status === 'completed' ? 'border-l-emerald-500 bg-emerald-50/10 opacity-75' : 'border-l-indigo-500'} rounded-2xl p-5 md:p-6 flex gap-4 hover:shadow-md transition-all group relative cursor-pointer">
                            <div class="pt-1" onclick="event.stopPropagation()">
                                <input type="checkbox" value="${task.id}" onchange="toggleTaskSelection('${task.id}')" class="task-checkbox rounded w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${tasksSelection.has(task.id) ? 'checked' : ''}>
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3 mb-1">
                                    <h4 class="font-bold text-gray-900 text-sm sm:text-base ${task.status === 'completed' ? 'line-through text-gray-400' : ''} truncate max-w-[70%]" title="${task.description || task.title}">${task.title}</h4>
                                    <div class="text-right">
                                        <p class="text-[10px] uppercase font-bold text-gray-400 leading-none">${task.deadline ? fmt.dateTime(task.deadline) : window.t('no_deadline', 'No deadline')}</p>
                                    </div>
                                </div>
                                <div class="flex items-end justify-between gap-3">
                                    <div class="flex flex-wrap gap-1.5 overflow-hidden pt-1">
                                        <div class="flex items-center gap-1.5 flex-shrink-0 scale-95 origin-left">
                                            ${priorityBadge(task.priority)}
                                            ${statusBadge(task.status)}
                                        </div>
                                        ${tags.filter(t => t.task_id === task.id).map(t => `<span class="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">#${t.tag}</span>`).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>`).join('')}
                </div>

                <!-- Pagination Footer -->
                <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                    <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${tasks.length}</span> of <span class="font-bold text-gray-900">${tasksPageState.totalCount}</span> tasks</p>
                    <div class="flex items-center gap-2">
                        <button onclick="changeTasksPage(-1)" ${tasksPageState.page === 1 ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        </button>
                        <div class="flex items-center gap-1">
                            ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return `<button onclick="tasksPageState.page = ${p}; renderBranchTasks()" class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${tasksPageState.page === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}">${p}</button>`;
        }).join('')}
                        </div>
                        <button onclick="changeTasksPage(1)" ${tasksPageState.page === totalPages ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        lucide.createIcons();
    }).catch(err => {
        console.error('[BranchTasks] Error loading tasks:', err);
        if (typeof window.renderModuleOfflineState === 'function') {
            container.innerHTML = window.renderModuleOfflineState({
                viewId: 'tasks',
                title: 'Branch Tasks',
                entityName: 'Branch Tasks & Assignments',
                retryAction: 'window.renderBranchTasks()'
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            container.innerHTML = `<div class="py-20 text-center text-gray-500 font-bold">Couldn't load tasks while offline.</div>`;
        }
    });

    return '';
};

export async function advanceTask(taskId, currentStatus) {
    const nextStatus = currentStatus === 'pending' ? 'in_progress' : 'completed';
    try {
        await dbTasks.updateStatus(taskId, nextStatus);

        const statusText = nextStatus === 'completed' ? 'Completed' : 'In Progress';
        const msg = `Task status updated to: ${statusText}`;
        await dbTaskComments.add(taskId, 'branch', 'Branch System', msg);

        if (nextStatus === 'completed') {
            const branch = state.branches.find(b => b.id === state.branchId) || { name: 'Branch' };
            addActivity('task_completed', `Task completed`, branch.name);
            showToast('Task completed successfully', 'success');
        } else {
            showToast('Task started!', 'info');
        }

        if (typeof checkNotifications === 'function') checkNotifications(true);
        switchView('tasks');
    } catch (err) {
        showToast('Failed to update task: ' + err.message, 'error');
    }
};
