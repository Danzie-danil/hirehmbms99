
let expensesSelection = new Set();
window.expensesSelection = expensesSelection;
let expensesPageState = {
    page: 1,
    pageSize: 10,
    totalCount: 0,
    filterMode: 'today', // 'today' | 'history'
    historyRange: 'all', // 'all' | 'yesterday' | '7d' | '30d'
    searchQuery: ''
};
window.expensesPageState = expensesPageState;

export function changeExpensesPage(delta) {
    const newPage = expensesPageState.page + delta;
    const maxPage = Math.ceil(expensesPageState.totalCount / expensesPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    expensesPageState.page = newPage;
    expensesSelection.clear();
    refreshExpensesModuleData();
}
window.changeExpensesPage = changeExpensesPage;

export function changeExpensesPageTo(page) {
    const maxPage = Math.ceil(expensesPageState.totalCount / expensesPageState.pageSize) || 1;
    if (page < 1 || page > maxPage || page === expensesPageState.page) return;
    expensesPageState.page = page;
    expensesSelection.clear();
    refreshExpensesModuleData();
}
window.changeExpensesPageTo = changeExpensesPageTo;

export function changeExpensesPageSize(size) {
    expensesPageState.pageSize = parseInt(size, 10) || 10;
    expensesPageState.page = 1;
    expensesSelection.clear();
    const labelDesktop = document.getElementById('label-expensesPageSizeSelect');
    if (labelDesktop) labelDesktop.textContent = `${expensesPageState.pageSize} / page`;
    const labelMobile = document.getElementById('label-expensesPageSizeSelectMobile');
    if (labelMobile) labelMobile.textContent = `${expensesPageState.pageSize} / page`;
    refreshExpensesModuleData();
}
window.changeExpensesPageSize = changeExpensesPageSize;

export function renderExpensesPageSizeDroplist(id = 'expensesPageSizeSelect', isMobile = false) {
    const options = [
        { value: '10', label: '10 / page' },
        { value: '25', label: '25 / page' },
        { value: '50', label: '50 / page' }
    ];
    if (typeof window.renderPremiumSelect === 'function') {
        return window.renderPremiumSelect({
            id,
            options,
            selectedValue: String(expensesPageState.pageSize),
            placeholder: `${expensesPageState.pageSize} / page`,
            searchable: false,
            classes: `!h-8 !py-1 !px-2.5 !text-xs !rounded-xl !bg-gray-50 dark:!bg-gray-900 !border !border-gray-200 dark:!border-gray-700 !font-bold !text-gray-800 dark:!text-gray-200 !shadow-2xs !pr-7 ${isMobile ? 'w-24' : 'w-28'}`,
            onChange: 'changeExpensesPageSize(this.value)'
        });
    }

    return `
        <select onchange="changeExpensesPageSize(this.value)" class="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-xs font-semibold text-gray-700 dark:text-gray-300 focus:outline-none cursor-pointer">
            <option value="10" ${expensesPageState.pageSize === 10 ? 'selected' : ''}>10 / page</option>
            <option value="25" ${expensesPageState.pageSize === 25 ? 'selected' : ''}>25 / page</option>
            <option value="50" ${expensesPageState.pageSize === 50 ? 'selected' : ''}>50 / page</option>
        </select>
    `;
}
window.renderExpensesPageSizeDroplist = renderExpensesPageSizeDroplist;

export function setExpensesFilterMode(mode) {
    if (expensesPageState.filterMode === mode) return;
    expensesPageState.filterMode = mode;
    expensesPageState.page = 1;
    expensesSelection.clear();
    updateExpensesFilterUI();
    refreshExpensesModuleData();
}
window.setExpensesFilterMode = setExpensesFilterMode;

export function setExpensesHistoryRange(range) {
    if (expensesPageState.historyRange === range) return;
    expensesPageState.historyRange = range;
    expensesPageState.page = 1;
    expensesSelection.clear();
    updateExpensesFilterUI();
    refreshExpensesModuleData();
}
window.setExpensesHistoryRange = setExpensesHistoryRange;

let _expensesSearchDebounce = null;
export function handleExpensesSearchInput(value) {
    expensesPageState.searchQuery = (value || '').trim();
    clearTimeout(_expensesSearchDebounce);
    _expensesSearchDebounce = setTimeout(() => {
        expensesPageState.page = 1;
        expensesSelection.clear();
        refreshExpensesModuleData();
    }, 300);
}
window.handleExpensesSearchInput = handleExpensesSearchInput;

export function updateExpensesFilterUI() {
    const todayBtn = document.getElementById('btnFilterTodayExpenses');
    const historyBtn = document.getElementById('btnFilterHistoryExpenses');
    const historyPills = document.getElementById('expensesHistoryRangePills');
    const searchInput = document.getElementById('expensesSearchInput');
    const modeBadge = document.getElementById('expensesFilterModeBadge');
    const ledgerTitle = document.getElementById('expensesLedgerTitle');

    if (ledgerTitle) {
        ledgerTitle.textContent = expensesPageState.filterMode === 'today' ? window.t('todays_expenses', "Today's Expenses") : window.t('expenses_history', 'Expense History');
    }

    if (todayBtn && historyBtn) {
        if (expensesPageState.filterMode === 'today') {
            todayBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-rose-600 text-white shadow-sm';
            const dot = todayBtn.querySelector('.today-dot');
            if (dot) {
                dot.className = 'today-dot w-2 h-2 rounded-full bg-white animate-pulse';
            }

            historyBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50';
            if (historyPills) {
                historyPills.classList.add('hidden');
                historyPills.classList.remove('flex');
            }
            if (searchInput) searchInput.placeholder = window.t('search_today_expenses', "Search today's expenses by description or category...");
            if (modeBadge) {
                modeBadge.textContent = "Today's Payouts";
                modeBadge.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
            }
        } else {
            todayBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50';
            const dot = todayBtn.querySelector('.today-dot');
            if (dot) {
                dot.className = 'today-dot w-2 h-2 rounded-full bg-gray-400';
            }

            historyBtn.className = 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 bg-indigo-600 text-white shadow-sm';
            if (historyPills) {
                historyPills.classList.remove('hidden');
                historyPills.classList.add('flex');
                historyPills.querySelectorAll('button[data-range]').forEach(btn => {
                    const r = btn.getAttribute('data-range');
                    if (r === expensesPageState.historyRange) {
                        btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
                    } else {
                        btn.className = 'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700';
                    }
                });
            }
            if (searchInput) searchInput.placeholder = window.t('search_all_expenses', 'Search expense history by description or category...');
            if (modeBadge) {
                const label = expensesPageState.historyRange === 'yesterday' ? "Yesterday" : (expensesPageState.historyRange === '7d' ? "Last 7 Days" : (expensesPageState.historyRange === '30d' ? "Last 30 Days" : "All History"));
                modeBadge.textContent = label;
                modeBadge.className = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800';
            }
        }
    }
}
window.updateExpensesFilterUI = updateExpensesFilterUI;

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

async function fetchBranchExpensesServer(branchId, { page = 1, pageSize = 10, dateFilterStart = null, dateFilterEnd = null, searchQuery = '' } = {}) {
    if (!branchId) return { items: [], count: 0 };
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    const cleanSearch = (searchQuery || '').trim();

    const client = window.supabaseClient || window.supabase;
    if (client && typeof client.from === 'function') {
        try {
            let query = client
                .from('expenses')
                .select('*', { count: 'exact' })
                .eq('branch_id', branchId);

            if (dateFilterStart) {
                query = query.gte('created_at', dateFilterStart);
            }
            if (dateFilterEnd) {
                query = query.lt('created_at', dateFilterEnd);
            }
            if (cleanSearch) {
                query = query.or(`description.ilike.%${cleanSearch}%,category.ilike.%${cleanSearch}%`);
            }

            const { data, count, error } = await query.order('created_at', { ascending: false }).range(from, to);
            if (!error && Array.isArray(data)) {
                return { items: data, count: count !== null && count !== undefined ? count : data.length };
            }
            if (error) {
                console.warn('[BranchExpenses] Supabase query error:', error.message);
            }
        } catch (err) {
            console.warn('[BranchExpenses] Supabase fetch error, fallback to local:', err);
        }
    }

    // Fallback to local Dexie
    if (window.localDb?.expenses) {
        try {
            const allLocal = await window.localDb.expenses.where('branch_id').equals(branchId).reverse().sortBy('created_at');
            let filtered = allLocal;
            if (dateFilterStart) filtered = filtered.filter(e => (e.created_at || '') >= dateFilterStart);
            if (dateFilterEnd) filtered = filtered.filter(e => (e.created_at || '') < dateFilterEnd);
            if (cleanSearch) {
                const kw = cleanSearch.toLowerCase();
                filtered = filtered.filter(e =>
                    (e.description || '').toLowerCase().includes(kw) ||
                    (e.category || '').toLowerCase().includes(kw)
                );
            }
            return { items: filtered.slice(from, from + pageSize), count: filtered.length };
        } catch (dexieErr) {
            console.warn('[BranchExpenses] Local Dexie fallback error:', dexieErr);
        }
    }

    return dbExpenses.fetchAll(branchId, { page, pageSize });
}

function renderExpensesStatsDOM(summary, peakExpense, totalCount) {
    const statsContainer = document.getElementById('expensesStatsGrid');
    if (!statsContainer) return;

    const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';
    const totalSpent = Number(summary?.total || summary?.today_total || summary?.total_expenses || 0);
    const count = typeof totalCount === 'number' ? totalCount : Number(summary?.count || summary?.today_count || summary?.total_count || 0);
    const peak = Number(peakExpense || 0);

    statsContainer.innerHTML = `
        <!-- Total Spent -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${expensesPageState.filterMode === 'today' ? window.t('today_expenses', "Today's Spent") : window.t('total_expenses', 'Total Spent')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-red-600 dark:text-red-400 truncate leading-tight" title="${fmt.currency(totalSpent)}">${fmt.number(totalSpent)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">${count} entries recorded</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5 h-3 text-red-500 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                <rect x="2" y="4" width="4.5" height="20" rx="1.5"/>
                <rect x="9" y="10" width="4.5" height="14" rx="1.5"/>
                <rect x="16" y="7" width="4.5" height="17" rx="1.5"/>
                <rect x="23" y="14" width="4.5" height="10" rx="1.5"/>
                <rect x="30" y="18" width="4.5" height="6" rx="1.5"/>
            </svg>
        </div>

        <!-- Total Count -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('transactions', 'Records')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight">${count}</p>
                <p class="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 truncate">${expensesPageState.filterMode === 'today' ? "Today's logs" : "Total logs"}</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 14 L10 18 L18 10 L26 12 L38 5" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="5" r="2.5" fill="#F59E0B"/>
            </svg>
        </div>

        <!-- Largest Single Expense -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full col-span-2 sm:col-span-1 min-w-0">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-gray-600 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('largest_expense', 'Peak Expense')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight" title="${fmt.currency(peak)}">${fmt.number(peak)}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Single peak payout</p>
            </div>
            <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 flex items-center justify-center text-red-600 text-[10px] font-black shadow-2xs">
                <i data-lucide="trending-down" class="w-3 h-3"></i>
            </div>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
}

function _renderExpensesItemsToDOM(expenses, tags, totalCount) {
    const listEl = document.getElementById('expensesList');
    if (!listEl) return;

    expensesPageState.totalCount = typeof totalCount === 'number' ? totalCount : expenses.length;
    const totalPages = Math.ceil(expensesPageState.totalCount / expensesPageState.pageSize) || 1;

    const pageInfoText = document.getElementById('expensesPageInfoText');
    if (pageInfoText) {
        const modeLabel = expensesPageState.filterMode === 'today' ? "Today" : (expensesPageState.historyRange === 'yesterday' ? "Yesterday" : (expensesPageState.historyRange === '7d' ? "Last 7 Days" : (expensesPageState.historyRange === '30d' ? "Last 30 Days" : "All History")));
        pageInfoText.textContent = `Page ${expensesPageState.page} of ${totalPages} • ${modeLabel}`;
    }

    if (expenses.length === 0) {
        const isToday = expensesPageState.filterMode === 'today';
        const hasSearch = Boolean(expensesPageState.searchQuery);
        listEl.innerHTML = `
            <div class="py-10 px-4 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl bg-gray-50/40 dark:bg-gray-800/40">
                <div class="w-12 h-12 rounded-2xl ${isToday ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400' : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'} mx-auto mb-3 flex items-center justify-center border border-gray-200/80 dark:border-gray-700">
                    <i data-lucide="${hasSearch ? 'search-x' : (isToday ? 'credit-card' : 'history')}" class="w-6 h-6"></i>
                </div>
                <h4 class="text-sm font-bold text-gray-900 dark:text-white mb-1">
                    ${hasSearch ? 'No matching expenses found' : (isToday ? 'No expenses recorded yet today' : 'No expense history found')}
                </h4>
                <p class="text-xs text-gray-400 max-w-sm mx-auto mb-4 font-medium">
                    ${hasSearch 
                        ? `No expenses match "${expensesPageState.searchQuery}". Try clearing your search keyword.`
                        : (isToday 
                            ? 'Ready to record your first operational payout of the day, or view past records from history.'
                            : 'No past expense records were found for the selected time range.')}
                </p>
                <div class="flex flex-wrap items-center justify-center gap-2">
                    ${hasSearch ? `
                        <button onclick="document.getElementById('expensesSearchInput').value=''; handleExpensesSearchInput('');" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-xs">
                            <i data-lucide="x" class="w-3.5 h-3.5"></i>
                            <span>Clear Search</span>
                        </button>
                    ` : (isToday ? `
                        <button onclick="openModal('addExpense')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer shadow-xs">
                            <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                            <span>Add Expense</span>
                        </button>
                        <button onclick="setExpensesFilterMode('history')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors cursor-pointer">
                            <i data-lucide="history" class="w-3.5 h-3.5"></i>
                            <span>Fetch Expense History</span>
                        </button>
                    ` : `
                        <button onclick="setExpensesFilterMode('today')" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors cursor-pointer">
                            <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                            <span>Back to Today's Expenses</span>
                        </button>
                    `)}
                </div>
            </div>
        `;
    } else {
        const tagList = Array.isArray(tags) ? tags : [];
        listEl.innerHTML = expenses.map(exp => `
            <div onclick="openDetailsModal('expense', '${exp.id}')" data-search="${(exp.description || '').toLowerCase()} ${(exp.category || '').toLowerCase()}" class="bg-gray-50/70 dark:bg-gray-900/50 hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 sm:p-4 flex items-center justify-between gap-3 transition-colors group relative cursor-pointer">
                <div class="flex items-center gap-3 min-w-0" onclick="event.stopPropagation()">
                    <input type="checkbox" value="${exp.id}" onchange="toggleExpenseSelection('${exp.id}')" class="expense-checkbox rounded w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 cursor-pointer" ${expensesSelection.has(exp.id) ? 'checked' : ''}>
                    <div class="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center flex-shrink-0 border border-red-100 dark:border-red-900/50">
                        <i data-lucide="minus" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                        <div class="flex items-center gap-1.5 flex-wrap">
                            <h4 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate">${exp.description || 'Expense'}</h4>
                            <span class="bg-gray-200/70 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">${exp.category || 'Other'}</span>
                        </div>
                        <p class="text-[10px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                            <span>${fmt.dateTime(exp.created_at)}</span>
                            ${tagList.filter(t => t.expense_id === exp.id).map(t => `<span class="text-red-600 dark:text-red-400 font-semibold">#${t.tag}</span>`).join(' ')}
                        </p>
                    </div>
                </div>

                <div class="text-right flex-shrink-0">
                    <span class="text-xs sm:text-sm font-black text-red-600 dark:text-red-400">${fmt.currency(exp.amount)}</span>
                </div>
            </div>`).join('');
    }

    // Pagination Footer Update
    const paginationEl = document.getElementById('expensesPaginationFooter');
    if (paginationEl) {
        const fromItem = expensesPageState.totalCount === 0 ? 0 : (expensesPageState.page - 1) * expensesPageState.pageSize + 1;
        const toItem = Math.min(expensesPageState.page * expensesPageState.pageSize, expensesPageState.totalCount);

        paginationEl.innerHTML = `
        <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 dark:border-gray-700 pt-3">
            <div class="flex items-center gap-2.5 text-xs text-gray-500 dark:text-gray-400">
                <p>Showing <span class="font-bold text-gray-900 dark:text-white">${fromItem}-${toItem}</span> of <span class="font-bold text-gray-900 dark:text-white">${expensesPageState.totalCount}</span> ${expensesPageState.filterMode === 'today' ? "today's expenses" : "expenses"}</p>
                <div class="sm:hidden flex items-center gap-1">
                    ${renderExpensesPageSizeDroplist('expensesPageSizeSelectMobile', true)}
                </div>
            </div>

            <div class="flex items-center gap-1.5">
                <button onclick="changeExpensesPage(-1)" ${expensesPageState.page === 1 ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Previous Page">
                    <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                </button>
                <div class="flex items-center gap-1">
                    ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let p = i + 1;
                        if (totalPages > 5 && expensesPageState.page > 3) {
                            p = expensesPageState.page - 2 + i;
                            if (p > totalPages) p = totalPages - (4 - i);
                        }
                        return `<button onclick="changeExpensesPageTo(${p})" class="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${expensesPageState.page === p ? 'bg-red-600 text-white shadow-xs' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}">${p}</button>`;
                    }).join('')}
                </div>
                <button onclick="changeExpensesPage(1)" ${expensesPageState.page >= totalPages ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors" title="Next Page">
                    <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                </button>
            </div>
        </div>`;
    }

    if (window.lucide) lucide.createIcons();
}

function refreshExpensesModuleData() {
    const listEl = document.getElementById('expensesList');
    const branchId = state.branchId || state.branchProfile?.id || (state.branches && state.branches[0]?.id);

    // Compute active date boundaries based on filterMode and historyRange
    let dateFilterStart = null;
    let dateFilterEnd = null;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    if (expensesPageState.filterMode === 'today') {
        dateFilterStart = todayStart.toISOString();
        dateFilterEnd = null;
    } else if (expensesPageState.filterMode === 'history') {
        if (expensesPageState.historyRange === 'yesterday') {
            const yesterdayStart = new Date(todayStart);
            yesterdayStart.setDate(yesterdayStart.getDate() - 1);
            dateFilterStart = yesterdayStart.toISOString();
            dateFilterEnd = todayStart.toISOString(); // Strictly yesterday only (< todayStart)
        } else if (expensesPageState.historyRange === '7d') {
            const d7 = new Date(todayStart);
            d7.setDate(d7.getDate() - 7);
            dateFilterStart = d7.toISOString();
            dateFilterEnd = null; // Includes today
        } else if (expensesPageState.historyRange === '30d') {
            const d30 = new Date(todayStart);
            d30.setDate(d30.getDate() - 30);
            dateFilterStart = d30.toISOString();
            dateFilterEnd = null; // Includes today
        } else {
            // All History: all expenses including today
            dateFilterStart = null;
            dateFilterEnd = null;
        }
    }

    // 1. FAST PATH: Immediately query and hydrate local IndexedDB expenses in < 10ms
    if (window.localDb?.expenses && branchId) {
        window.localDb.expenses.where('branch_id').equals(branchId).reverse().sortBy('created_at').then(localItems => {
            if (Array.isArray(localItems) && localItems.length > 0) {
                let filteredLocal = localItems;
                if (dateFilterStart) {
                    filteredLocal = filteredLocal.filter(e => (e.created_at || '') >= dateFilterStart);
                }
                if (dateFilterEnd) {
                    filteredLocal = filteredLocal.filter(e => (e.created_at || '') < dateFilterEnd);
                }
                if (expensesPageState.searchQuery) {
                    const q = expensesPageState.searchQuery.toLowerCase();
                    filteredLocal = filteredLocal.filter(e =>
                        (e.description || '').toLowerCase().includes(q) ||
                        (e.category || '').toLowerCase().includes(q)
                    );
                }

                const localTotal = filteredLocal.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
                const localCount = filteredLocal.length;
                const localPeak = filteredLocal.length ? Math.max(...filteredLocal.map(e => Number(e.amount) || 0)) : 0;

                renderExpensesStatsDOM({ total: localTotal, count: localCount }, localPeak, localCount);

                const from = (expensesPageState.page - 1) * expensesPageState.pageSize;
                const pagedLocal = filteredLocal.slice(from, from + expensesPageState.pageSize);
                _renderExpensesItemsToDOM(pagedLocal, [], filteredLocal.length);
            }
        }).catch(() => {});
    }

    // 2. RESILIENT CLOUD FETCH: Server-side pagination with exact date boundaries and search query
    const remoteDataPromise = Promise.all([
        fetchBranchExpensesServer(branchId, {
            page: expensesPageState.page,
            pageSize: expensesPageState.pageSize,
            dateFilterStart,
            dateFilterEnd,
            searchQuery: expensesPageState.searchQuery
        }),
        dbExpenses.fetchSummary(branchId).catch(() => ({ today_total: 0, count: 0, total_expenses: 0 })),
        dbExpenseTags ? dbExpenseTags.fetchAll(branchId).catch(() => []) : Promise.resolve([])
    ]);

    const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('expenses_fetch_timeout')), 5500)
    );

    Promise.race([remoteDataPromise, timeoutPromise]).then(([expensesRes, summary, tags]) => {
        const expenses = expensesRes?.items || [];
        const totalCount = expensesRes?.count ?? expenses.length;
        
        let displayTotal = 0;
        let peakExpense = expenses.length ? Math.max(...expenses.map(e => Number(e.amount) || 0)) : 0;
        if (expensesPageState.filterMode === 'today') {
            displayTotal = Number(summary?.today_total || 0) || expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        } else {
            displayTotal = Number(summary?.total_expenses || 0) || expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
        }

        renderExpensesStatsDOM({ total: displayTotal, count: totalCount }, peakExpense, totalCount);
        _renderExpensesItemsToDOM(expenses, tags, totalCount);
    }).catch(err => {
        console.warn('[BranchExpenses] Remote fetch failed or timed out:', err);
    });
}
window.refreshExpensesModuleData = refreshExpensesModuleData;

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
                refreshExpensesModuleData();
            } catch (err) {
                showToast('Import failed: ' + err.message, 'error');
            }
        });
    };

    window.downloadExpensesCSVTemplate = function () {
        const headers = ['category', 'description', 'amount'];
        downloadCSVTemplate('expenses_template.csv', headers);
    };

    const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === state.branchId)) || { name: 'Branch' };

    let shell = document.getElementById('expensesShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-4 sm:space-y-5 slide-in" id="expensesShell">
            <!-- Bento Top Header Strip -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-100 dark:border-red-900/50 flex items-center justify-center flex-shrink-0 text-red-600 dark:text-red-400">
                        <i data-lucide="minus-circle" class="w-4 h-4 sm:w-6 sm:h-6"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">${window.t('expense_tracker', 'Expense Tracker')}</h2>
                        <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0"></i>
                            <span class="truncate">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <button onclick="openModal('importExpensesInfo')" data-tooltip="Import expenses from CSV" data-tooltip-title="Import CSV" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <i data-lucide="upload" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-500"></i>
                        <span>${window.t('import_csv', 'Import CSV')}</span>
                    </button>
                    <button onclick="openModal('addExpense')" data-tooltip="Log operational expense" data-tooltip-title="Add Expense" data-tooltip-variant="rose" class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all cursor-pointer shadow-xs whitespace-nowrap">
                        <i data-lucide="plus" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                        <span>${window.t('add_expense', 'Add Expense')}</span>
                    </button>
                </div>
            </div>

            <!-- Bento Stats Row with Inline SVG Sparklines -->
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5" id="expensesStatsGrid">
                ${[1, 2, 3].map(() => `<div class="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-16"></div>`).join('')}
            </div>

            <!-- Expense Ledger Bento Container -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div class="flex items-center justify-between mb-3.5">
                    <div>
                        <div class="flex items-center gap-2">
                            <h3 id="expensesLedgerTitle" class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">${expensesPageState.filterMode === 'today' ? window.t('todays_expenses', "Today's Expenses") : window.t('expenses_history', 'Expense History')}</h3>
                            <span id="expensesFilterModeBadge" class="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                                ${expensesPageState.filterMode === 'today' ? "Today's Payouts" : (expensesPageState.historyRange === 'yesterday' ? "Yesterday" : (expensesPageState.historyRange === '7d' ? "Last 7 Days" : (expensesPageState.historyRange === '30d' ? "Last 30 Days" : "All History")))}
                            </span>
                        </div>
                        <p class="text-[11px] text-gray-400 font-medium">${window.t('operational_payouts', 'Logged branch operating costs and supplies')}</p>
                    </div>
                    <span id="expensesPageInfoText" class="text-xs text-gray-400 font-medium">Loading...</span>
                </div>

                <!-- Scope Filter & History Range Controls -->
                <div class="flex flex-wrap items-center justify-between gap-2.5 pb-3 border-b border-gray-100 dark:border-gray-700/60 mb-3">
                    <!-- Segmented Scope Toggle: Today vs History -->
                    <div class="inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-inner text-xs">
                        <button type="button" id="btnFilterTodayExpenses" onclick="setExpensesFilterMode('today')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${expensesPageState.filterMode === 'today' ? 'bg-rose-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                            <span class="today-dot w-2 h-2 rounded-full ${expensesPageState.filterMode === 'today' ? 'bg-white animate-pulse' : 'bg-gray-400'}"></span>
                            <span>${window.t('todays_expenses', "Today's Expenses")}</span>
                        </button>
                        <button type="button" id="btnFilterHistoryExpenses" onclick="setExpensesFilterMode('history')" class="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${expensesPageState.filterMode === 'history' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200/50 dark:hover:bg-gray-700/50'}">
                            <i data-lucide="history" class="w-3.5 h-3.5"></i>
                            <span>${window.t('expenses_history', 'Expense History')}</span>
                        </button>
                    </div>

                    <!-- On-Demand History Range Filter Pills -->
                    <div id="expensesHistoryRangePills" class="${expensesPageState.filterMode === 'history' ? 'flex' : 'hidden'} items-center gap-1.5 flex-wrap">
                        <button type="button" data-range="all" onclick="setExpensesHistoryRange('all')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${expensesPageState.historyRange === 'all' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('all_history', 'All History')}</button>
                        <button type="button" data-range="yesterday" onclick="setExpensesHistoryRange('yesterday')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${expensesPageState.historyRange === 'yesterday' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('yesterday', 'Yesterday')}</button>
                        <button type="button" data-range="7d" onclick="setExpensesHistoryRange('7d')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${expensesPageState.historyRange === '7d' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('last_7_days', 'Last 7 Days')}</button>
                        <button type="button" data-range="30d" onclick="setExpensesHistoryRange('30d')" class="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all shrink-0 ${expensesPageState.historyRange === '30d' ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800' : 'bg-gray-50 dark:bg-gray-800/60 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700'}">${window.t('last_30_days', 'Last 30 Days')}</button>
                    </div>

                    <!-- Items Per Page Selector (Premium Droplist) -->
                    <div class="hidden sm:flex items-center gap-1.5 text-xs text-gray-400">
                        <span>Show:</span>
                        ${renderExpensesPageSizeDroplist('expensesPageSizeSelect')}
                    </div>
                </div>

                <!-- Instant Search Input (Server-Side Debounced) -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
                    </div>
                    <input type="text" id="expensesSearchInput" value="${expensesPageState.searchQuery || ''}" placeholder="${expensesPageState.filterMode === 'today' ? window.t('search_today_expenses', "Search today's expenses by description or category...") : window.t('search_all_expenses', 'Search expense history by description or category...')}" oninput="handleExpensesSearchInput(this.value)" class="w-full pl-10 pr-3.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.75rem !important;">
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/70 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 mb-3.5 gap-2">
                    <div class="flex items-center gap-2.5 pl-1">
                        <input type="checkbox" id="selectAllExpenses" onchange="toggleSelectAllExpenses(this.checked)" class="rounded w-4 h-4 text-rose-600 border-gray-300 focus:ring-rose-500 cursor-pointer">
                        <span class="text-xs font-bold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="expensesSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkDeleteExpenses" disabled onclick="bulkDeleteSelectedExpenses()" data-tooltip="Permanently remove checked expenses" data-tooltip-title="Bulk Delete" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i>
                            <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagExpenses" disabled onclick="openExpensesTagModal(null, true)" data-tooltip="Attach tags to checked expenses" data-tooltip-title="Bulk Tag" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-rose-500"></i>
                            <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <!-- Expenses List Container -->
                <div class="space-y-2.5" id="expensesList">
                    ${[1, 2, 3].map(() => `<div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-20"></div>`).join('')}
                </div>

                <!-- Pagination Footer Container -->
                <div id="expensesPaginationFooter"></div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    updateExpensesFilterUI();
    refreshExpensesModuleData();
    return '';
}
window.renderExpensesModule = renderExpensesModule;
