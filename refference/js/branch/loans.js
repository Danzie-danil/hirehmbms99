
let loansSelection = new Set();
window.loansSelection = loansSelection;
let loansPageState = {
    page: 1,
    pageSize: 5,
    totalCount: 0
};
window.loansPageState = loansPageState;

export function changeLoansPage(delta) {
    const newPage = loansPageState.page + delta;
    const maxPage = Math.ceil(loansPageState.totalCount / loansPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    loansPageState.page = newPage;
    renderLoansModule();
};

export function toggleLoanSelection(id) {
    if (loansSelection.has(id)) {
        loansSelection.delete(id);
    } else {
        loansSelection.add(id);
    }
    updateLoanBulkActionBar();
};

export function toggleSelectAllLoans(checked) {
    const checkboxes = document.querySelectorAll('.loan-checkbox');
    loansSelection.clear();
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) loansSelection.add(cb.value);
    });
    updateLoanBulkActionBar();
};

export function updateLoanBulkActionBar() {
    const count = loansSelection.size;
    const countSpan = document.getElementById('loansSelectedCount');
    if (countSpan) countSpan.textContent = `${count} selected`;

    const deleteBtn = document.getElementById('btnBulkDeleteLoans');
    if (deleteBtn) deleteBtn.disabled = count === 0;

    const tagBtn = document.getElementById('btnBulkTagLoans');
    if (tagBtn) tagBtn.disabled = count === 0;

    const selectAll = document.getElementById('selectAllLoans');
    const checkboxes = document.querySelectorAll('.loan-checkbox');
    if (selectAll && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
};

export async function bulkDeleteSelectedLoans() {
    const count = loansSelection.size;
    if (count === 0) return;
    const confirmed = await window.confirmModal('Confirm Deletion', 'Are you sure you want to delete the selected items?', 'Yes, Delete', 'Cancel');
    if (!confirmed) return;

    try {
        const ids = Array.from(loansSelection);
        await dbLoans.bulkDelete(ids);
        loansSelection.clear();
        showToast(`Deleted ${count} records`, 'success');
        renderLoansModule();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

export async function openLoansTagModal(loanId, isBulk = false) {
    document.querySelectorAll('.tags-modal-overlay').forEach(el => el.remove());
    const title = isBulk ? `Tag ${loansSelection.size} Records` : 'Manage Record Tags';

    let currentTags = [];
    if (!isBulk && loanId) {
        try {
            const allTags = await dbLoanTags.fetchAll(state.branchId);
            currentTags = allTags.filter(t => t.loan_id === loanId);
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
                    <input type="text" id="newLoanTagName" placeholder="New tag name..." class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <button id="submitLoanTagBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">Add</button>
                </div>

                ${!isBulk ? `
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Current Tags</p>
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${currentTags.length ? currentTags.map(t => `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                                # ${t.tag}
                                <i data-lucide="x" onclick="removeLoanTagModal('${t.id}', '${loanId}')" class="w-3.5 h-3.5 cursor-pointer hover:text-red-600"></i>
                            </span>
                        `).join('') : '<p class="text-xs text-gray-400 italic">No tags applied yet</p>'}
                    </div>
                ` : ''}

                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suggestions</p>
                <div class="flex flex-wrap gap-2">
                    ${['Personal', 'Business', 'Urgent', 'Cleared', 'Pending'].map(t => `
                        <button onclick="quickAddLoanTag('${t}', '${loanId}', ${isBulk})" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all uppercase tracking-tight">
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
        renderLoansModule();
    };

    overlay.querySelectorAll('.close-tags-btn').forEach(btn => btn.addEventListener('click', closeTagsModal));

    const submitBtn = overlay.querySelector('#submitLoanTagBtn');
    const input = overlay.querySelector('#newLoanTagName');

    const handleAdd = async () => {
        const tagName = input.value.trim();
        if (!tagName) return;
        submitBtn.disabled = true;
        try {
            if (isBulk) {
                const ids = Array.from(loansSelection);
                await Promise.all(ids.map(id => dbLoanTags.add(state.branchId, id, tagName)));
                loansSelection.clear();
                showToast(`Tagged ${ids.length} items`, 'success');
                closeTagsModal();
            } else {
                await dbLoanTags.add(state.branchId, loanId, tagName);
                openLoansTagModal(loanId, false);
            }
        } catch (err) { showToast('Error adding tag', 'error'); }
        finally { submitBtn.disabled = false; }
    };

    submitBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });

    window.removeLoanTagModal = async (tagId, loanId) => {
        try {
            await dbLoanTags.delete(tagId);
            openLoansTagModal(loanId, false);
        } catch (err) { showToast('Error', 'error'); }
    };

    window.quickAddLoanTag = async (tagName, loanId, isBulk) => {
        input.value = tagName;
        handleAdd();
    };
};

export function renderLoansModule() {
    loansSelection.clear();
    const container = document.getElementById('mainContent');

    const typeMap = {
        income: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: window.t('opt_other_income', 'Other Income'), isOut: false },
        loan_given: { bg: 'bg-red-100', text: 'text-red-700', label: window.t('opt_loan_given', 'Loan Given'), isOut: true },
        loan_received: { bg: 'bg-blue-100', text: 'text-blue-700', label: window.t('opt_loan_received', 'Loan Received'), isOut: false },
        repayment: { bg: 'bg-violet-100', text: 'text-violet-700', label: window.t('opt_repayment_received', 'Repayment Received'), isOut: false }
    };

    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('loans_income_title', 'Loans & Income')}</div>
            </div>
            <button onclick="openModal('addLoan')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0">
                <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('btn_add_loan_transaction', 'Add Transaction')}
            </button>
        </div>
        ${renderPremiumLoader('Loading financial data…')}
    </div>`;
    lucide.createIcons();

    Promise.all([
        dbLoans.fetchAll(state.branchId, {
            page: loansPageState.page,
            pageSize: loansPageState.pageSize
        }),
        dbLoanTags.fetchAll(state.branchId)
    ]).then(([res, tags]) => {
        const records = res.items;
        loansPageState.totalCount = res.count;
        const totalPages = Math.ceil(loansPageState.totalCount / loansPageState.pageSize) || 1;
        const totalIncome = records.filter(r => !typeMap[r.type]?.isOut).reduce((s, r) => s + Number(r.amount), 0);
        const totalOutgoing = records.filter(r => typeMap[r.type]?.isOut).reduce((s, r) => s + Number(r.amount), 0);

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                    <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('loans_income_title', 'Loans & Income')}</div>
                </div>
                <button onclick="openModal('addLoan')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('btn_add_loan_transaction', 'Add Transaction')}
                </button>
            </div>

            <div class="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 pt-2">
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight" title="Total Received">${window.t('received_page', 'Received (Page)')}</p>
                    <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-none my-auto py-1">${fmt.number(totalIncome)}</p>
                </div>
                <div class="relative bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <div class="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight" title="Total Outgoing">${window.t('outgoing_page', 'Outgoing (Page)')}</p>
                    <p class="text-dynamic-lg font-black text-red-600 dark:text-red-400 truncate leading-none my-auto py-1">${fmt.number(totalOutgoing)}</p>
                </div>
                <div class="bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col h-full">
                    <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight whitespace-normal font-bold leading-tight" title="Records">${window.t('total_expense_records', 'Total Records')}</p>
                    <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-none my-auto py-1">${loansPageState.totalCount}</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('financial_records_title', 'Financial Records')}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 font-medium">Page ${loansPageState.page} of ${totalPages}</span>
                    </div>
                </div>

                <!-- Search & Filters -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                    </div>
                    <input type="text" placeholder="${window.t('search_records', 'Search records...')}" oninput="filterList('loansList', this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-2 mb-3 gap-2">
                    <div class="flex items-center gap-2.5 pl-1.5">
                        <input type="checkbox" id="selectAllLoans" onchange="toggleSelectAllLoans(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                        <span class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="loansSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-2">
                        <button id="btnBulkDeleteLoans" disabled onclick="bulkDeleteSelectedLoans()" class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagLoans" disabled onclick="openLoansTagModal(null, true)" class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-500"></i> <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <div class="space-y-4" id="loansList">
                    ${records.length === 0 ? `
                        <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                            <i data-lucide="banknote" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                            <p class="text-gray-400 text-sm">No records history found for this page</p>
                        </div>
                    ` : records.map(rec => {
            const t = typeMap[rec.type] || typeMap.income;
            return `
                        <div onclick="openDetailsModal('loan', '${rec.id}')" data-search="${(rec.party || '').toLowerCase()} ${rec.type} ${(rec.notes || '').toLowerCase()}" class="bg-white border border-gray-200 border-l-[4px] ${t.isOut ? 'border-l-red-500 bg-red-50/10' : 'border-l-emerald-500 bg-emerald-50/10'} rounded-2xl p-5 md:p-6 flex gap-4 hover:shadow-md transition-all group relative cursor-pointer">
                            <div class="pt-1" onclick="event.stopPropagation()">
                                <input type="checkbox" value="${rec.id}" onchange="toggleLoanSelection('${rec.id}')" class="loan-checkbox rounded w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${loansSelection.has(rec.id) ? 'checked' : ''}>
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3 mb-1">
                                    <h4 class="font-bold text-gray-900 text-sm sm:text-base truncate max-w-[50%]">${rec.party || 'No Party Listed'}</h4>
                                    <div class="text-right">
                                        <p class="text-[10px] uppercase font-bold text-gray-400 leading-none">${fmt.dateTime(rec.created_at)}</p>
                                    </div>
                                </div>
                                <div class="flex items-end justify-between gap-3">
                                    <div class="flex flex-wrap gap-1.5 overflow-hidden pt-1">
                                        <span class="${t.bg} ${t.text} text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap flex-shrink-0">${t.label}</span>
                                        ${rec.notes ? `<span class="text-xs text-gray-500 whitespace-nowrap flex-shrink-0 hidden md:inline-block">- ${rec.notes}</span>` : ''}
                                        ${tags.filter(tg => tg.loan_id === rec.id).map(tg => `<span class="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">#${tg.tag}</span>`).join('')}
                                    </div>
                                    <span class="text-sm sm:text-lg font-black ${t.isOut ? 'text-red-600' : 'text-emerald-600'} whitespace-nowrap">${t.isOut ? '-' : '+'}${fmt.currency(rec.amount)}</span>
                                </div>
                            </div>
                        </div>`;
        }).join('')}
                </div>

                <!-- Pagination Footer -->
                <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                    <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${records.length}</span> of <span class="font-bold text-gray-900">${loansPageState.totalCount}</span> records</p>
                    <div class="flex items-center gap-2">
                        <button onclick="changeLoansPage(-1)" ${loansPageState.page === 1 ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-left" class="w-4 h-4"></i>
                        </button>
                        <div class="flex items-center gap-1">
                            ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return `<button onclick="loansPageState.page = ${p}; renderLoansModule()" class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${loansPageState.page === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}">${p}</button>`;
        }).join('')}
                        </div>
                        <button onclick="changeLoansPage(1)" ${loansPageState.page === totalPages ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-right" class="w-4 h-4"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        lucide.createIcons();
    }).catch(err => {
        console.error('[BranchLoans] Error loading records:', err);
        if (typeof window.renderModuleOfflineState === 'function') {
            container.innerHTML = window.renderModuleOfflineState({
                viewId: 'loans',
                title: 'Credit & Loans',
                entityName: 'Customer Credit & Loan Records',
                retryAction: 'window.renderLoansModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            container.innerHTML = `<div class="py-20 text-center text-gray-500 font-bold">Couldn't load loan records while offline.</div>`;
        }
    });

    return '';
};
