
let expensesSelection = new Set();
window.expensesSelection = expensesSelection;
let expensesPageState = {
    page: 1,
    pageSize: 5,
    totalCount: 0
};
window.expensesPageState = expensesPageState;

export function changeExpensesPage(delta) {
    const newPage = expensesPageState.page + delta;
    const maxPage = Math.ceil(expensesPageState.totalCount / expensesPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    expensesPageState.page = newPage;
    renderExpensesModule();
};

export function toggleExpenseSelection(id) {
    if (expensesSelection.has(id)) {
        expensesSelection.delete(id);
    } else {
        expensesSelection.add(id);
    }
    updateExpenseBulkActionBar();
};

export function toggleSelectAllExpenses(checked) {
    const checkboxes = document.querySelectorAll('.expense-checkbox');
    expensesSelection.clear();
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) expensesSelection.add(cb.value);
    });
    updateExpenseBulkActionBar();
};

export function updateExpenseBulkActionBar() {
    const count = expensesSelection.size;
    const countSpan = document.getElementById('expensesSelectedCount');
    if (countSpan) countSpan.textContent = `${count} selected`;

    const deleteBtn = document.getElementById('btnBulkDeleteExpenses');
    if (deleteBtn) deleteBtn.disabled = count === 0;

    const tagBtn = document.getElementById('btnBulkTagExpenses');
    if (tagBtn) tagBtn.disabled = count === 0;

    const selectAll = document.getElementById('selectAllExpenses');
    const checkboxes = document.querySelectorAll('.expense-checkbox');
    if (selectAll && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
};

export async function bulkDeleteSelectedExpenses() {
    const count = expensesSelection.size;
    if (count === 0) return;
    const confirmed = await window.confirmModal('Confirm Deletion', 'Are you sure you want to delete the selected items?', 'Yes, Delete', 'Cancel');
    if (!confirmed) return;

    try {
        const ids = Array.from(expensesSelection);
        await dbExpenses.bulkDelete(ids);
        expensesSelection.clear();
        showToast(`Deleted ${count} expenses`, 'success');
        renderExpensesModule();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

export async function openExpensesTagModal(expenseId, isBulk = false) {
    document.querySelectorAll('.tags-modal-overlay').forEach(el => el.remove());
    const title = isBulk ? `Tag ${expensesSelection.size} Expenses` : 'Manage Expense Tags';

    let currentTags = [];
    if (!isBulk && expenseId) {
        try {
            const allTags = await dbExpenseTags.fetchAll(state.branchId);
            currentTags = allTags.filter(t => t.expense_id === expenseId);
        } catch (err) { console.error(err); }
    }

    const overlay = document.createElement('div');
    overlay.className = 'tags-modal-overlay fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm transition-opacity duration-200';
    overlay.style.opacity = '0';

    overlay.innerHTML = `
        <div class="bg-white rounded-3xl shadow-xl w-full max-w-sm overflow-hidden transform scale-95 transition-transform duration-200">
            <div class="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 class="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <i data-lucide="tag" class="w-5 h-5 text-rose-500"></i> ${title}
                </h3>
                <button type="button" class="close-tags-btn p-2 text-gray-400 hover:bg-gray-200 hover:text-gray-700 rounded-xl transition-colors">
                    <i data-lucide="x" class="w-5 h-5"></i>
                </button>
            </div>

            <div class="p-6">
                <div class="flex gap-2 mb-6">
                    <input type="text" id="newExpenseTagName" placeholder="New tag name..." class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all">
                    <button id="submitExpenseTagBtn" class="bg-rose-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-rose-700 transition-colors">Add</button>
                </div>

                ${!isBulk ? `
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Current Tags</p>
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${currentTags.length ? currentTags.map(t => `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-lg text-xs font-semibold">
                                # ${t.tag}
                                <i data-lucide="x" onclick="removeExpenseTagModal('${t.id}', '${expenseId}')" class="w-3.5 h-3.5 cursor-pointer hover:text-red-600"></i>
                            </span>
                        `).join('') : '<p class="text-xs text-gray-400 italic">No tags applied yet</p>'}
                    </div>
                ` : ''}

                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suggestions</p>
                <div class="flex flex-wrap gap-2">
                    ${['Office', 'Bills', 'Stock', 'Travel', 'Repair'].map(t => `
                        <button onclick="quickAddExpenseTag('${t}', '${expenseId}', ${isBulk})" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-rose-500 hover:text-rose-500 hover:bg-rose-50/30 transition-all uppercase tracking-tight">
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
        renderExpensesModule();
    };

    overlay.querySelectorAll('.close-tags-btn').forEach(btn => btn.addEventListener('click', closeTagsModal));

    const submitBtn = overlay.querySelector('#submitExpenseTagBtn');
    const input = overlay.querySelector('#newExpenseTagName');

    const handleAdd = async () => {
        const tagName = input.value.trim();
        if (!tagName) return;
        submitBtn.disabled = true;
        try {
            if (isBulk) {
                const ids = Array.from(expensesSelection);
                await Promise.all(ids.map(id => dbExpenseTags.add(state.branchId, id, tagName)));
                expensesSelection.clear();
                showToast(`Tagged ${ids.length} items`, 'success');
                closeTagsModal();
            } else {
                await dbExpenseTags.add(state.branchId, expenseId, tagName);
                openExpensesTagModal(expenseId, false);
            }
        } catch (err) { showToast('Error adding tag', 'error'); }
        finally { submitBtn.disabled = false; }
    };

    submitBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });

    window.removeExpenseTagModal = async (tagId, expenseId) => {
        try {
            await dbExpenseTags.delete(tagId);
            openExpensesTagModal(expenseId, false);
        } catch (err) { showToast('Error', 'error'); }
    };

    window.quickAddExpenseTag = async (tagName, expenseId, isBulk) => {
        input.value = tagName;
        handleAdd();
    };
};

export function renderExpensesModule() {
    expensesSelection.clear();
    const container = document.getElementById('mainContent');

    window.importExpensesCSV = function () {
        triggerCSVUpload(async (data) => {
            if (!data || data.length === 0) {
                showToast('CSV is empty or invalid', 'error');
                return;
            }

            const records = data.map(row => ({
                branch_id: state.branchId,
                category: row.category || 'other',
                description: row.description || 'Unnamed Expense',
                amount: fmt.parseNumber(row.amount || 0)
            })).filter(r => r.description !== 'Unnamed Expense');

            if (records.length === 0) {
                showToast('No valid records found in CSV', 'error');
                return;
            }

            const confirmed = await window.confirmModal('Confirm Import', `Are you sure you want to import ${records.length} expenses?`, 'Yes, Import', 'Cancel');
            if (!confirmed) return;

            try {
                await dbExpenses.bulkAdd(records);
                showToast(`Successfully imported ${records.length} expenses`, 'success');
                renderExpensesModule();
            } catch (err) {
                showToast('Import failed: ' + err.message, 'error');
            }
        });
    };

    window.downloadExpensesCSVTemplate = function () {
        const headers = ['category', 'description', 'amount'];
        downloadCSVTemplate('expenses_template.csv', headers);
    };
    const categoryColors = {
        supplies: 'bg-blue-100 text-blue-700',
        utilities: 'bg-amber-100 text-amber-700',
        salary: 'bg-violet-100 text-violet-700',
        rent: 'bg-red-100 text-red-700',
        maintenance: 'bg-orange-100 text-orange-700',
        marketing: 'bg-pink-100 text-pink-700',
        other: 'bg-gray-100 text-gray-700'
    };

    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">Expense Management</div>
            </div>
            <div class="flex gap-1.5 sm:gap-2">
                <button onclick="openModal('importExpensesInfo')" title="Import CSV" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5">
                    <i data-lucide="upload" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>Import CSV</span>
                </button>
                <button onclick="openModal('addExpense')" class="btn-primary btn-danger text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span class="hidden sm:inline-block">Add Expense</span><span class="inline-block sm:hidden">Add</span>
                </button>
            </div>
        </div>
        ${renderPremiumLoader('Loading expenses…')}
    </div>`;
    lucide.createIcons();

    Promise.all([
        dbExpenses.fetchAll(state.branchId, {
            page: expensesPageState.page,
            pageSize: expensesPageState.pageSize
        }),
        dbExpenseTags.fetchAll(state.branchId)
    ]).then(([expensesRes, tags]) => {
        const expenses = expensesRes.items;
        expensesPageState.totalCount = expensesRes.count;
        const totalPages = Math.ceil(expensesPageState.totalCount / expensesPageState.pageSize) || 1;
        const total = expenses.reduce((s, e) => s + Number(e.amount), 0);

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('expense_tracker', 'Expense Management')}</div>
                </div>
                <div class="flex gap-1.5 sm:gap-2">
                    <button onclick="openModal('importExpensesInfo')" data-tooltip="Import expenses in bulk from CSV spreadsheet" data-tooltip-title="Import CSV" data-tooltip-position="bottom" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer">
                        <i data-lucide="upload" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>${window.t('import_csv', 'Import CSV')}</span>
                    </button>
                    <button onclick="openModal('addExpense')" data-tooltip="Log a new operating expense, utility bill, or maintenance cost" data-tooltip-title="Record Expense" data-tooltip-variant="rose" data-tooltip-position="bottom" class="btn-primary btn-danger text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer">
                        <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span class="hidden sm:inline-block">${window.t('record_expense', 'Add Expense')}</span><span class="inline-block sm:hidden">${window.t('add_expense', 'Add')}</span>
                    </button>
                </div>
            </div>

            <!-- Stats Row -->
            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-2">
                <div data-tooltip="Sum total of all expenses logged on this page" data-tooltip-title="Total Spent" data-tooltip-variant="rose" class="relative px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total_expenses', 'Total Spent')}</p>
                    <p class="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 truncate my-1" title="${fmt.currency(total)}">${fmt.number(total)}</p>
                </div>
                <div data-tooltip="Total number of expense entries recorded" data-tooltip-title="Entry Count" class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('transactions', 'Transactions')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1">${expensesPageState.totalCount}</p>
                </div>
                <div data-tooltip="Highest single expense amount recorded in this period" data-tooltip-title="Peak Outflow" class="relative px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between col-span-2 lg:col-span-1">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('largest_expense', 'Largest Expense')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1" title="${expenses.length ? fmt.currency(Math.max(...expenses.map(e => e.amount))) : fmt.currency(0)}">${fmt.number(expenses.length ? Math.max(...expenses.map(e => e.amount)) : 0)}</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('expense_tracker', 'Recent Expenses')}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 font-medium">Page ${expensesPageState.page} of ${totalPages}</span>
                    </div>
                </div>

                <!-- Search & Filters -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-rose-500"></i>
                    </div>
                    <input type="text" placeholder="${window.t('search_expenses', 'Search expenses...')}" oninput="filterList('expensesList', this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-2 mb-3 gap-2">
                    <div class="flex items-center gap-2.5 pl-1.5">
                        <input type="checkbox" id="selectAllExpenses" onchange="toggleSelectAllExpenses(this.checked)" class="rounded w-4 h-4 text-rose-600 border-gray-300 focus:ring-rose-500 cursor-pointer">
                        <span class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="expensesSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkDeleteExpenses" disabled onclick="bulkDeleteSelectedExpenses()" data-tooltip="Permanently remove checked expenses" data-tooltip-title="Bulk Delete" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagExpenses" disabled onclick="openExpensesTagModal(null, true)" data-tooltip="Attach organizational tags to checked expenses" data-tooltip-title="Bulk Tag" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-rose-500"></i> <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <div class="space-y-4" id="expensesList">
                    ${expenses.length === 0 ? `
                        <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <i data-lucide="credit-card" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                            <p class="text-gray-400 text-sm">No expenses history found for this page</p>
                        </div>
                    ` : expenses.map(exp => `
                        <div onclick="openDetailsModal('expense', '${exp.id}')" data-search="${exp.description.toLowerCase()} ${(exp.category || '').toLowerCase()}" class="bg-white border border-gray-200 border-l-[4px] border-l-rose-500 rounded-2xl p-5 md:p-6 flex gap-4 hover:shadow-md transition-all group relative cursor-pointer">
                            <div class="pt-1" onclick="event.stopPropagation()">
                                <input type="checkbox" value="${exp.id}" onchange="toggleExpenseSelection('${exp.id}')" class="expense-checkbox rounded w-5 h-5 text-rose-600 border-gray-300 focus:ring-rose-500 cursor-pointer" ${expensesSelection.has(exp.id) ? 'checked' : ''}>
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3 mb-1">
                                    <h4 class="font-bold text-gray-900 text-sm sm:text-base truncate">${exp.description}</h4>
                                    <div class="text-right">
                                        <p class="text-[10px] uppercase font-bold text-gray-400 leading-none">${fmt.dateTime(exp.created_at)}</p>
                                    </div>
                                </div>
                                <div class="flex items-end justify-between gap-3">
                                    <div class="flex flex-wrap gap-1.5 overflow-hidden pt-1">
                                        <span class="bg-gray-100 text-gray-600 text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0 hidden sm:inline-block">${exp.category}</span>
                                        ${tags.filter(t => t.expense_id === exp.id).map(t => `<span class="bg-rose-50 text-rose-700 border border-rose-100 text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">#${t.tag}</span>`).join('')}
                                    </div>
                                    <span class="text-sm sm:text-lg font-black text-rose-600 whitespace-nowrap">${fmt.currency(exp.amount)}</span>
                                </div>
                            </div>
                        </div>`).join('')}
                </div>

                <!--Pagination Footer-->
    <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
        <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${expenses.length}</span> of <span class="font-bold text-gray-900">${expensesPageState.totalCount}</span> expenses</p>
        <div class="flex items-center gap-2">
            <button onclick="changeExpensesPage(-1)" ${expensesPageState.page === 1 ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
            </button>
            <div class="flex items-center gap-1">
                ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return `<button onclick="expensesPageState.page = ${p}; renderExpensesModule()" class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${expensesPageState.page === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}">${p}</button>`;
        }).join('')}
            </div>
            <button onclick="changeExpensesPage(1)" ${expensesPageState.page === totalPages ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
            </button>
        </div>
    </div>
            </div>
        </div>`;
        lucide.createIcons();
    }).catch(err => {
        console.error('[BranchExpenses] Error loading expenses:', err);
        if (typeof window.renderModuleOfflineState === 'function') {
            container.innerHTML = window.renderModuleOfflineState({
                viewId: 'expenses',
                title: 'Branch Expenses',
                entityName: 'Branch Expense Records',
                retryAction: 'window.renderExpensesModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            container.innerHTML = `<div class="py-20 text-center text-gray-500 font-bold">Couldn't load expenses while offline.</div>`;
        }
    });

    return '';
};
