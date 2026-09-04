
let customersSelection = new Set();
window.customersSelection = customersSelection;
let customersPageState = {
    page: 1,
    pageSize: 5,
    totalCount: 0
};
window.customersPageState = customersPageState;

export function changeCustomersPage(delta) {
    const newPage = customersPageState.page + delta;
    const maxPage = Math.ceil(customersPageState.totalCount / customersPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    customersPageState.page = newPage;
    renderCustomersModule();
};

export function toggleCustomerSelection(id) {
    if (customersSelection.has(id)) {
        customersSelection.delete(id);
    } else {
        customersSelection.add(id);
    }
    updateCustomerBulkActionBar();
};

export function toggleSelectAllCustomers(checked) {
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    customersSelection.clear();
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) customersSelection.add(cb.value);
    });
    updateCustomerBulkActionBar();
};

export function updateCustomerBulkActionBar() {
    const count = customersSelection.size;
    const countSpan = document.getElementById('customersSelectedCount');
    if (countSpan) countSpan.textContent = `${count} selected`;

    const deleteBtn = document.getElementById('btnBulkDeleteCustomers');
    if (deleteBtn) deleteBtn.disabled = count === 0;

    const tagBtn = document.getElementById('btnBulkTagCustomers');
    if (tagBtn) tagBtn.disabled = count === 0;

    const selectAll = document.getElementById('selectAllCustomers');
    const checkboxes = document.querySelectorAll('.customer-checkbox');
    if (selectAll && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
};

export async function bulkDeleteSelectedCustomers() {
    const count = customersSelection.size;
    if (count === 0) return;
    const confirmed = await window.confirmModal('Confirm Deletion', 'Are you sure you want to delete the selected items?', 'Yes, Delete', 'Cancel');
    if (!confirmed) return;

    try {
        const ids = Array.from(customersSelection);
        await dbCustomers.bulkDelete(ids);
        customersSelection.clear();
        showToast(`Deleted ${count} customers`, 'success');
        renderCustomersModule();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

export async function openCustomerTagModal(customerId, isBulk = false) {
    document.querySelectorAll('.tags-modal-overlay').forEach(el => el.remove());
    const title = isBulk ? `Tag ${customersSelection.size} Customers` : 'Manage Customer Tags';

    let currentTags = [];
    if (!isBulk && customerId) {
        try {
            const allTags = await dbCustomerTags.fetchAll(state.branchId);
            currentTags = allTags.filter(t => t.customer_id === customerId);
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
                    <input type="text" id="newCustTagName" placeholder="New tag name..." class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <button id="submitCustTagBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">Add</button>
                </div>

                ${!isBulk ? `
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Current Tags</p>
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${currentTags.length ? currentTags.map(t => `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                                # ${t.tag}
                                <i data-lucide="x" onclick="removeCustTagModal('${t.id}', '${customerId}')" class="w-3.5 h-3.5 cursor-pointer hover:text-red-600"></i>
                            </span>
                        `).join('') : '<p class="text-xs text-gray-400 italic">No tags applied yet</p>'}
                    </div>
                ` : ''}

                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suggestions</p>
                <div class="flex flex-wrap gap-2">
                    ${['VIP', 'Regular', 'Wholesale', 'Blocked', 'New'].map(t => `
                        <button onclick="quickAddCustTag('${t}', '${customerId}', ${isBulk})" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all uppercase tracking-tight">
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
        renderCustomersModule();
    };

    overlay.querySelectorAll('.close-tags-btn').forEach(btn => btn.addEventListener('click', closeTagsModal));

    const submitBtn = overlay.querySelector('#submitCustTagBtn');
    const input = overlay.querySelector('#newCustTagName');

    const handleAdd = async () => {
        const tagName = input.value.trim();
        if (!tagName) return;
        submitBtn.disabled = true;
        try {
            if (isBulk) {
                const ids = Array.from(customersSelection);
                await Promise.all(ids.map(id => dbCustomerTags.add(state.branchId, id, tagName)));
                customersSelection.clear();
                showToast(`Tagged ${ids.length} customers`, 'success');
                closeTagsModal();
            } else {
                await dbCustomerTags.add(state.branchId, customerId, tagName);
                openCustomerTagModal(customerId, false);
            }
        } catch (err) { showToast('Error adding tag', 'error'); }
        finally { submitBtn.disabled = false; }
    };

    submitBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });

    window.removeCustTagModal = async (tagId, customerId) => {
        try {
            await dbCustomerTags.delete(tagId);
            openCustomerTagModal(customerId, false);
        } catch (err) { showToast('Error', 'error'); }
    };

    window.quickAddCustTag = async (tagName, customerId, isBulk) => {
        input.value = tagName;
        handleAdd();
    };
};

export function renderCustomersModule() {
    customersSelection.clear();
    const container = document.getElementById('mainContent');

    window.importCustomersCSV = function () {
        triggerCSVUpload(async (data) => {
            if (!data || data.length === 0) {
                showToast('CSV is empty or invalid', 'error');
                return;
            }

            const records = data.map(row => ({
                branch_id: state.branchId,
                name: row.name || 'Unnamed Customer',
                phone: row.phone || '',
                email: row.email || ''
            })).filter(r => r.name !== 'Unnamed Customer');

            if (records.length === 0) {
                showToast('No valid records found in CSV', 'error');
                return;
            }

            const confirmed = await window.confirmModal('Confirm Import', `Are you sure you want to import ${records.length} customers?`, 'Yes, Import', 'Cancel');
            if (!confirmed) return;

            try {
                await dbCustomers.bulkAdd(records);
                showToast(`Successfully imported ${records.length} customers`, 'success');
                renderCustomersModule();
            } catch (err) {
                showToast('Import failed: ' + err.message, 'error');
            }
        });
    };

    window.downloadCustomersCSVTemplate = function () {
        const headers = ['name', 'phone', 'email'];
        downloadCSVTemplate('customers_template.csv', headers);
    };
    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">Customer Directory</div>
            </div>
            <div class="flex gap-1.5 sm:gap-2">
                <button onclick="openModal('importCustomersInfo')" title="Import CSV" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5">
                    <i data-lucide="upload" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>Import CSV</span>
                </button>
                <button onclick="openModal('addCustomer')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5">
                    <i data-lucide="user-plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span class="hidden sm:inline-block">Add Customer</span><span class="inline-block sm:hidden">Add</span>
                </button>
            </div>
        </div>
        ${renderPremiumLoader('Loading customer data…')}
    </div>`;
    lucide.createIcons();

    Promise.all([
        dbCustomers.fetchAll(state.branchId, {
            page: customersPageState.page,
            pageSize: customersPageState.pageSize
        }),
        dbCustomerTags.fetchAll(state.branchId)
    ]).then(([res, tags]) => {
        const customers = res.items;
        customersPageState.totalCount = res.count;
        const totalPages = Math.ceil(customersPageState.totalCount / customersPageState.pageSize) || 1;

        container.innerHTML = `
        <div class="space-y-4 slide-in">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('customer_directory', 'Customer Directory')}</div>
                </div>
                <div class="flex gap-1.5 sm:gap-2">
                    <button onclick="openModal('importCustomersInfo')" data-tooltip="Import customer list from CSV spreadsheet" data-tooltip-title="Import CSV" data-tooltip-position="bottom" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer">
                        <i data-lucide="upload" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>${window.t('import_csv', 'Import CSV')}</span>
                    </button>
                    <button onclick="openModal('addCustomer')" data-tooltip="Register a new customer profile with contact information and credit terms" data-tooltip-title="New Customer" data-tooltip-variant="indigo" data-tooltip-position="bottom" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer">
                        <i data-lucide="user-plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span class="hidden sm:inline-block">${window.t('add_new_customer', 'Add Customer')}</span><span class="inline-block sm:hidden">${window.t('add_customer', 'Add')}</span>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2 md:gap-3">
                <div data-tooltip="Total registered customer directory size for this branch" data-tooltip-title="Total Customers" class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('total_customers', 'Total Customers')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1">${customersPageState.totalCount}</p>
                </div>
                <div data-tooltip="Number of customer records shown in current page view" data-tooltip-title="Page View Count" data-tooltip-variant="indigo" class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold">${window.t('items_on_page', 'Customers on Page')}</p>
                    <p class="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 truncate my-1">${customers.length}</p>
                </div>
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('customer_directory', 'Customer List')}</h3>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-400 font-medium">Page ${customersPageState.page} of ${totalPages}</span>
                    </div>
                </div>

                <!-- Search & Filters -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                    </div>
                    <input type="text" placeholder="${window.t('search_customers', 'Search customers...')}" oninput="filterList('customersList', this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-2 mb-3 gap-2">
                    <div class="flex items-center gap-2.5 pl-1.5">
                        <input type="checkbox" id="selectAllCustomers" onchange="toggleSelectAllCustomers(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                        <span class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="customersSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkDeleteCustomers" disabled onclick="bulkDeleteSelectedCustomers()" data-tooltip="Delete selected customer profiles" data-tooltip-title="Bulk Delete" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagCustomers" disabled onclick="openCustomerTagModal(null, true)" data-tooltip="Apply segment tags (e.g. VIP, Wholesale) to selected customer accounts" data-tooltip-title="Bulk Tag" data-tooltip-variant="indigo" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-500"></i> <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <div class="space-y-2.5" id="customersList">
                    ${customers.length === 0 ? `
                        <div class="py-6 sm:py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                            <i data-lucide="users" class="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5"></i>
                            <p class="text-gray-400 text-xs font-medium">${window.t('no_pending_requests', 'No customers found for this page')}</p>
                        </div>
                    ` : customers.map(c => {
                        const hasDebt = Number(c.credit_balance || 0) > 0;
                        return `
                        <div onclick="openDetailsModal('customer', '${c.id}')" data-search="${c.name.toLowerCase()} ${(c.phone || '').toLowerCase()} ${(c.email || '').toLowerCase()}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${hasDebt ? 'border-l-red-500' : 'border-l-indigo-500'} rounded-xl p-3.5 sm:p-4 flex gap-3 hover:shadow-md transition-all group relative cursor-pointer">
                            <div class="pt-0.5" onclick="event.stopPropagation()">
                                <input type="checkbox" value="${c.id}" onchange="toggleCustomerSelection('${c.id}')" class="customer-checkbox rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${customersSelection.has(c.id) ? 'checked' : ''}>
                            </div>

                            <div class="flex-1 min-w-0">
                                <div class="flex items-start justify-between gap-3 mb-1">
                                    <div class="flex items-center gap-2 flex-1 min-w-0 overflow-hidden">
                                        <div class="hidden sm:flex w-7 h-7 rounded-full ${hasDebt ? 'bg-red-100 dark:bg-red-900/30' : 'bg-indigo-100 dark:bg-indigo-950'} items-center justify-center flex-shrink-0">
                                            <span class="text-xs font-bold ${hasDebt ? 'text-red-600 dark:text-red-400' : 'text-indigo-600 dark:text-indigo-300'}">${c.name.charAt(0).toUpperCase()}</span>
                                        </div>
                                        <h4 class="font-bold text-gray-900 dark:text-white text-xs sm:text-sm truncate max-w-[50%]">${c.name}</h4>
                                        ${hasDebt ? `<span class="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] px-1.5 py-0.5 rounded font-bold whitespace-nowrap flex-shrink-0">${window.t('customer_debt', 'Debt')}: ${fmt.currency(c.credit_balance)}</span>` : ''}
                                    </div>
                                    <div class="text-right">
                                        <p class="text-[10px] uppercase font-bold text-gray-400 leading-none">${c.phone || window.t('phone', 'No phone')}</p>
                                    </div>
                                </div>
                                <div class="flex items-end justify-between gap-3">
                                    <div class="flex flex-wrap gap-1.5 overflow-hidden pt-1">
                                        <span class="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] px-2 py-0.5 rounded font-bold whitespace-nowrap flex-shrink-0">${c.loyalty_points} pts</span>
                                        ${tags.filter(t => t.customer_id === c.id).map(t => `<span class="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900 text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap flex-shrink-0">#${t.tag}</span>`).join('')}
                                    </div>
                                    <span class="text-[10px] text-gray-400 whitespace-nowrap">${fmt.dateTime(c.created_at)}</span>
                                </div>
                                ${hasDebt ? `
                                <div class="mt-2.5 pt-2.5 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between gap-2" onclick="event.stopPropagation()">
                                    <p class="text-[10px] text-red-500 dark:text-red-400 font-bold">${window.t('customer_debt', 'Outstanding')}: ${fmt.currency(c.credit_balance)}</p>
                                    <div class="flex items-center gap-1.5">
                                        ${c.phone ? `
                                        <button onclick="shareWhatsAppReceiptByCustomerId('${c.id}')"
                                            class="flex items-center gap-1 px-2 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg text-[10px] font-bold transition-all hover:bg-green-100 dark:hover:bg-green-900/40">
                                            <i data-lucide="message-circle" class="w-3 h-3"></i> WhatsApp
                                        </button>` : ''}
                                        <button onclick="openPartialPaymentView('${c.id}')"
                                            class="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black transition-all shadow-sm">
                                            <i data-lucide="credit-card" class="w-3 h-3"></i>
                                            ${window.t('record_payment', 'Record Payment')}
                                        </button>
                                    </div>
                                </div>` : ''}
                            </div>
                        </div>`;
                    }).join('')}
                </div>

                <!-- Pagination Footer -->
                <div class="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p class="text-xs text-gray-500 dark:text-gray-400">Showing <span class="font-bold text-gray-900 dark:text-white">${customers.length}</span> of <span class="font-bold text-gray-900 dark:text-white">${customersPageState.totalCount}</span> customers</p>
                    <div class="flex items-center gap-1.5">
                        <button onclick="changeCustomersPage(-1)" ${customersPageState.page === 1 ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-left" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                        </button>
                        <div class="flex items-center gap-1">
                            ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = i + 1;
            return `<button onclick="customersPageState.page = ${p}; renderCustomersModule()" class="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${customersPageState.page === p ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}">${p}</button>`;
        }).join('')}
                        </div>
                        <button onclick="changeCustomersPage(1)" ${customersPageState.page === totalPages ? 'disabled' : ''} class="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <i data-lucide="chevron-right" class="w-3.5 h-3.5 text-gray-600 dark:text-gray-300"></i>
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
        lucide.createIcons();
    }).catch(err => {
        console.error('[BranchCustomers] Error loading customers:', err);
        if (typeof window.renderModuleOfflineState === 'function') {
            container.innerHTML = window.renderModuleOfflineState({
                viewId: 'customers',
                title: 'Customers',
                entityName: 'Customer Directory & Profiles',
                retryAction: 'window.renderCustomersModule()'
            });
            if (window.lucide) window.lucide.createIcons();
        } else {
            container.innerHTML = `<div class="py-20 text-center text-gray-500 font-bold">Couldn't load customers while offline.</div>`;
        }
    });

    return '';
};

// ─── F4: Partial Payment Page View ─────────────────────────────────────────────

window.openPartialPaymentView = async function (customerId) {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader(window.t('loading', 'Loading customer details...'));

    let c = null;
    try {
        c = await dbCustomers.fetchOne(customerId);
    } catch (e) {}

    if (!c) {
        showToast('Customer not found', 'error');
        renderCustomersModule();
        return;
    }

    const customerName = c.name;
    const currentDebt = Number(c.credit_balance || 0);
    const phone = c.phone || '';
    const email = c.email || '';

    window._currentCustomerPayment = { id: customerId, name: customerName, debt: currentDebt, phone, email };

    const formatted = fmt.currency(currentDebt);

    container.innerHTML = `
    <div class="space-y-5 slide-in">
        <div class="flex items-center gap-3">
            <button onclick="renderCustomersModule()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                <i data-lucide="arrow-left" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
            </button>
            <div>
                <h2 class="text-base font-black text-gray-900 dark:text-white">${window.t('record_payment', 'Record Payment')}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">${window.t('customer_name', 'Customer')}: <span class="font-bold text-gray-700 dark:text-gray-300">${customerName}</span></p>
            </div>
        </div>

        <div class="bg-red-600 rounded-2xl p-5 text-white shadow-lg shadow-red-200 dark:shadow-red-900/30">
            <p class="text-xs text-red-200 font-bold uppercase tracking-wider mb-1">${window.t('customer_debt', 'Outstanding Balance')}</p>
            <p class="text-3xl font-black">${formatted}</p>
            ${phone ? `<p class="inline-flex items-center gap-1 text-xs text-red-200 mt-2"><i data-lucide="phone" class="w-3.5 h-3.5"></i> ${phone}</p>` : ''}
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('payment_amount', 'Payment Amount')} *</label>
                <div class="relative">
                    <span class="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">TZS</span>
                    <input type="number" id="paymentAmountInput" min="0.01" max="${currentDebt}" step="0.01"
                        placeholder="${window.t('payment_amount_placeholder', 'Enter amount received...')}"
                        oninput="window.updatePaymentPreview(${currentDebt})"
                        class="w-full pl-14 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white text-gray-900 transition-all">
                </div>
            </div>
            <div id="paymentBalancePreview" class="hidden p-4 rounded-xl border bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30">
                <div class="flex justify-between items-center">
                    <p class="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">${window.t('remaining_balance', 'Remaining Balance')}</p>
                    <p class="text-lg font-black text-indigo-700 dark:text-indigo-300" id="remainingBalanceValue">—</p>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('payment_note', 'Payment Note')} <span class="font-normal text-gray-400 lowercase">(${window.t('description_optional', 'optional')})</span></label>
                <input type="text" id="paymentNoteInput"
                    placeholder="${window.t('payment_note_placeholder', 'e.g. Paid via M-Pesa, ref #123...')}"
                    class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none dark:text-white text-gray-900 transition-all">
            </div>
        </div>

        <div class="flex gap-3">
            <button onclick="renderCustomersModule()" class="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                ${window.t('cancel', 'Cancel')}
            </button>
            <button onclick="submitPartialPayment()"
                class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                <i data-lucide="check-circle" class="w-4 h-4"></i>
                ${window.t('record_payment', 'Record Payment')}
            </button>
        </div>

        ${phone ? `
        <button onclick="shareWhatsAppReceipt(null)"
            class="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2">
            <i data-lucide="message-circle" class="w-4 h-4"></i>
            ${window.t('share_receipt_whatsapp', 'Share Debt Reminder via WhatsApp')}
        </button>` : ''}
    </div>`;
    lucide.createIcons();
};

window.updatePaymentPreview = function (currentDebt) {
    const input = document.getElementById('paymentAmountInput');
    const preview = document.getElementById('paymentBalancePreview');
    const remainEl = document.getElementById('remainingBalanceValue');
    const amount = parseFloat(input?.value || '0') || 0;
    if (!input?.value) { preview?.classList.add('hidden'); return; }
    const remaining = Math.max(0, currentDebt - amount);
    preview?.classList.remove('hidden');
    remainEl.textContent = remaining === 0 ? window.t('debt_cleared', 'Debt fully cleared!') : fmt.currency(remaining);
    remainEl.className = remaining === 0 ? 'text-lg font-black text-emerald-600 dark:text-emerald-400' : 'text-lg font-black text-indigo-700 dark:text-indigo-300';
};

window.submitPartialPayment = async function () {
    const cData = window._currentCustomerPayment || {};
    const customerId = cData.id;
    const customerName = cData.name || 'Customer';
    const currentDebt = cData.debt || 0;
    const phone = cData.phone || '';

    const amount = parseFloat(document.getElementById('paymentAmountInput')?.value || '0');
    const note = document.getElementById('paymentNoteInput')?.value?.trim();
    if (!amount || amount <= 0) { showToast(window.t('payment_amount_placeholder', 'Enter a valid amount'), 'error'); return; }
    if (amount > currentDebt) { showToast(window.t('remaining_balance', 'Amount exceeds outstanding balance'), 'error'); return; }

    const newBalance = Math.max(0, currentDebt - amount);
    const isFullyClear = newBalance === 0;

    try {
        const { error } = await supabaseClient.from('customers')
            .update({ credit_balance: newBalance, updated_at: new Date().toISOString() })
            .eq('id', customerId);
        if (error) throw error;

        // Best-effort log to customer_payments
        await supabaseClient.from('customer_payments').insert({
            branch_id: state.branchId,
            customer_id: customerId,
            amount,
            note: note || null
        }).then(() => {}).catch(() => {});

        showToast(isFullyClear ? window.t('debt_cleared', 'Debt fully cleared!') : window.t('payment_recorded', 'Payment recorded.'), 'success');

        if (phone) {
            const share = await window.confirmModal(
                window.t('share_receipt_whatsapp', 'Share Receipt via WhatsApp'),
                `${window.t('payment_amount', 'Payment')}: ${fmt.currency(amount)}\n${window.t('remaining_balance', 'Remaining')}: ${fmt.currency(newBalance)}`,
                window.t('share_receipt_whatsapp', 'Share on WhatsApp'),
                window.t('cancel', 'Skip'),
                'bg-green-600 hover:bg-green-700'
            );
            if (share) shareWhatsAppReceipt(amount);
        }

        renderCustomersModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.shareWhatsAppReceiptByCustomerId = async function(customerId) {
    try {
        const c = await dbCustomers.fetchOne(customerId);
        if (c && c.phone) {
            window._currentCustomerPayment = { id: c.id, name: c.name, debt: Number(c.credit_balance || 0), phone: c.phone, email: c.email || '' };
            shareWhatsAppReceipt(null);
        }
    } catch (e) {
        showToast('Failed to load customer for WhatsApp', 'error');
    }
};

window.shareWhatsAppReceipt = function (amountPaid) {
    const cData = window._currentCustomerPayment || {};
    const phone = cData.phone || '';
    const customerName = cData.name || 'Customer';
    const totalDebt = cData.debt || 0;

    if (!phone) {
        showToast(window.t('phone_required', 'Phone number required'), 'error');
        return;
    }

    const cleanPhone = String(phone).replace(/[^0-9]/g, '');
    const branch = state.branches?.find(b => b.id === state.branchId);
    const branchName = branch?.name || 'Our Branch';
    const today = new Date().toLocaleDateString();

    let text;
    if (amountPaid) {
        const remaining = Math.max(0, totalDebt - amountPaid);
        text = `*${window.t('receipt_text_header', 'Payment Receipt')}*\n——————————————\n${window.t('customer_name', 'Customer')}: ${customerName}\n${window.t('payment_amount', 'Amount Paid')}: ${fmt.currency(amountPaid)}\n${window.t('remaining_balance', 'Balance Remaining')}: ${fmt.currency(remaining)}\n${window.t('status', 'Date')}: ${today}\n——————————————\n_${branchName}_`;
    } else {
        text = `*${window.t('customer_debt', 'Outstanding Balance Reminder')}*\n——————————————\n${window.t('customer_name', 'Customer')}: ${customerName}\n${window.t('customer_debt', 'Outstanding Balance')}: ${fmt.currency(totalDebt)}\n${window.t('status', 'Date')}: ${today}\n——————————————\n_${branchName}_`;
    }

    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
};
