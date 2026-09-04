
let suppliersSelection = new Set();
window.suppliersSelection = suppliersSelection;
let suppliersActiveTab = 'suppliers';
window.suppliersActiveTab = suppliersActiveTab;

let suppliersPageState = {
    page: 1,
    pageSize: 10,
    totalCount: 0
};
window.suppliersPageState = suppliersPageState;

let poPageState = {
    page: 1,
    pageSize: 10,
    totalCount: 0
};
window.poPageState = poPageState;

export function switchSuppliersTab(tab) {
    suppliersActiveTab = tab;
    renderSuppliersModule();
};

export function changeSuppliersPage(delta) {
    const state = suppliersActiveTab === 'suppliers' ? suppliersPageState : poPageState;
    const newPage = state.page + delta;
    const maxPage = Math.ceil(state.totalCount / state.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    state.page = newPage;
    renderSuppliersModule();
};

export function toggleSupplierSelection(id) {
    if (suppliersSelection.has(id)) {
        suppliersSelection.delete(id);
    } else {
        suppliersSelection.add(id);
    }
    updateSupplierBulkActionBar();
};

export function toggleSelectAllSuppliers(checked) {
    const checkboxes = document.querySelectorAll('.supplier-checkbox');
    suppliersSelection.clear();
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) suppliersSelection.add(cb.value);
    });
    updateSupplierBulkActionBar();
};

export function updateSupplierBulkActionBar() {
    const count = suppliersSelection.size;
    const countSpan = document.getElementById('supplierSelectedCount');
    if (countSpan) countSpan.textContent = `${count} selected`;

    const deleteBtn = document.getElementById('btnBulkDeleteSupplier');
    if (deleteBtn) deleteBtn.disabled = count === 0;

    const selectAll = document.getElementById('selectAllSuppliers');
    const checkboxes = document.querySelectorAll('.supplier-checkbox');
    if (selectAll && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
};

export async function bulkDeleteSelectedSuppliers() {
    const count = suppliersSelection.size;
    if (count === 0) return;
    const confirmed = await window.confirmModal('Confirm Deletion', 'Are you sure you want to delete the selected items?', 'Yes, Delete', 'Cancel');
    if (!confirmed) return;

    try {
        const ids = Array.from(suppliersSelection);
        if (suppliersActiveTab === 'suppliers') {
            await Promise.all(ids.map(id => dbSuppliers.delete(id)));

            window._currentSuppliersList = null;
            showToast(`Deleted ${count} suppliers`, 'success');
        } else {
            await Promise.all(ids.map(id => dbPurchaseOrders.delete(id)));
            showToast(`Deleted ${count} purchase orders`, 'success');
        }
        suppliersSelection.clear();

        if (state.role === 'owner' && window.renderOwnerSuppliersModule) renderOwnerSuppliersModule();
        else renderSuppliersModule();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

export async function renderSuppliersModule() {
    suppliersSelection.clear();
    const container = document.getElementById('mainContent');

    container.innerHTML = `
    <div class="space-y-4 slide-in">
        <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
            <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('nav_suppliers', 'Suppliers & POs')}</div>
            </div>
            <div class="flex gap-2">
                ${suppliersActiveTab === 'suppliers' ?
            `<button onclick="openModal('addSupplier')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('add_supplier', 'Add Supplier')}
                </button>` :
            `<button onclick="openModal('addPO')" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold bg-emerald-600 hover:bg-emerald-700">
                    <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> ${window.t('new_po', 'New PO')}
                </button>`}
            </div>
        </div>

        <div class="flex items-center gap-2 p-1.5 bg-gray-100 rounded-xl w-fit">
            <button onclick="switchSuppliersTab('suppliers')" class="px-5 py-2 rounded-lg text-sm font-bold transition-all ${suppliersActiveTab === 'suppliers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">${window.t('tab_suppliers', 'Suppliers')}</button>
            <button onclick="switchSuppliersTab('pos')" class="px-5 py-2 rounded-lg text-sm font-bold transition-all ${suppliersActiveTab === 'pos' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}">${window.t('tab_purchase_orders', 'Purchase Orders')}</button>
        </div>

        <div id="suppliersContentArea" class="pt-2 min-h-[300px]">
            ${renderPremiumLoader(window.t('loading_suppliers_pos', 'Loading suppliers & POs…'))}
        </div>
    </div>`;
    lucide.createIcons();

    if (suppliersActiveTab === 'suppliers') {
        renderSuppliersList();
    } else {
        renderPOsList();
    }
};

async function renderSuppliersList() {
    const area = document.getElementById('suppliersContentArea');
    try {
        const records = await dbSuppliers.fetchAll(state.ownerId);
        suppliersPageState.totalCount = records.length;

        const startIdx = (suppliersPageState.page - 1) * suppliersPageState.pageSize;
        const pagedRecords = records.slice(startIdx, startIdx + suppliersPageState.pageSize);
        const totalPages = Math.ceil(suppliersPageState.totalCount / suppliersPageState.pageSize) || 1;

        let html = `
        <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 md:p-6 mb-20 md:mb-0">
            <div class="flex items-center justify-between mb-5">
                <h3 class="text-xl font-bold text-gray-900">${window.t('supplier_directory', 'Supplier Directory')}</h3>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-medium">Page ${suppliersPageState.page} of ${totalPages}</span>
                </div>
            </div>

            <div class="relative mb-4">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                </div>
                <input type="text" placeholder="${window.t('search_suppliers', 'Search suppliers...')}" oninput="filterList('supplierList', this.value)" class="w-full pl-11 pr-4 py-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all">
            </div>

            <div class="flex flex-wrap items-center justify-between bg-gray-50/70 border border-gray-100 rounded-xl p-2.5 md:p-3 mb-5 gap-3">
                <div class="flex items-center gap-3 pl-2">
                    <input type="checkbox" id="selectAllSuppliers" onchange="toggleSelectAllSuppliers(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                    <span class="text-sm font-semibold text-gray-800">${window.t('select_all', 'Select All')} <span id="supplierSelectedCount" class="font-normal text-xs text-gray-400 ml-1.5 hidden sm:inline-block">0 selected</span></span>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                    <button id="btnBulkDeleteSupplier" disabled onclick="bulkDeleteSelectedSuppliers()" class="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 shadow-sm rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete')}</span>
                    </button>
                </div>
            </div>

            <div class="space-y-4" id="supplierList">
                ${pagedRecords.length === 0 ? `
                    <div class="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                        <i data-lucide="truck" class="w-10 h-10 text-gray-300 mx-auto mb-3"></i>
                        <p class="text-gray-400 text-sm">${window.t('no_suppliers_found', 'No suppliers found')}</p>
                    </div>
                ` : pagedRecords.map(rec => `
                    <div onclick="openEditModal('editSupplier', '${rec.id}')" data-search="${(rec.name || '').toLowerCase()} ${(rec.contact_person || '').toLowerCase()}" class="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 flex gap-4 hover:border-indigo-300 hover:shadow-md transition-all group relative cursor-pointer">
                        <div class="pt-1" onclick="event.stopPropagation()">
                            <input type="checkbox" value="${rec.id}" onchange="toggleSupplierSelection('${rec.id}')" class="supplier-checkbox rounded w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${suppliersSelection.has(rec.id) ? 'checked' : ''}>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between gap-3 mb-1">
                                <h4 class="font-bold text-gray-900 text-sm sm:text-base truncate">${rec.name || 'Unnamed Supplier'}</h4>
                                ${rec.status === 'active' ?
                '<span class="bg-emerald-50 text-emerald-600 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-emerald-100">Active</span>' :
                `<span class="bg-gray-100 text-gray-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-gray-200">${window.t('inactive_status', 'Inactive')}</span>`}
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                <div class="flex flex-col gap-1">
                                    ${rec.contact_person ? `<p class="text-xs text-gray-600 font-medium"><i data-lucide="user" class="w-3 h-3 inline mr-1 text-gray-400"></i>${rec.contact_person}</p>` : ''}
                                    ${rec.phone ? `<p class="text-xs text-gray-600 font-medium"><i data-lucide="phone" class="w-3 h-3 inline mr-1 text-gray-400"></i>${rec.phone}</p>` : ''}
                                    ${rec.email ? `<p class="text-xs text-gray-600 font-medium"><i data-lucide="mail" class="w-3 h-3 inline mr-1 text-gray-400"></i>${rec.email}</p>` : ''}
                                </div>
                                <div class="flex flex-col gap-1 sm:items-end">
                                    ${rec.address ? `<p class="text-xs text-gray-500 truncate mt-1 w-full sm:text-right"><i data-lucide="map-pin" class="w-3 h-3 inline mr-1 text-gray-400"></i>${rec.address}</p>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>

            <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                <!-- Pagination Footer -->
                <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${pagedRecords.length}</span> of <span class="font-bold text-gray-900">${suppliersPageState.totalCount}</span></p>
                <div class="flex items-center gap-2">
                    <button onclick="changeSuppliersPage(-1)" ${suppliersPageState.page === 1 ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                    <span class="text-xs font-bold text-gray-600 mx-2">${suppliersPageState.page} / ${totalPages}</span>
                    <button onclick="changeSuppliersPage(1)" ${suppliersPageState.page === totalPages ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>`;
        area.innerHTML = html;
        lucide.createIcons();
    } catch (err) {
        area.innerHTML = `<div class="py-10 text-center text-red-500">Error: ${err.message}</div>`;
    }
}

async function renderPOsList() {
    const area = document.getElementById('suppliersContentArea');
    try {
        const records = await dbPurchaseOrders.fetchAll(state.branchId);
        poPageState.totalCount = records.length;

        const startIdx = (poPageState.page - 1) * poPageState.pageSize;
        const pagedRecords = records.slice(startIdx, startIdx + poPageState.pageSize);
        const totalPages = Math.ceil(poPageState.totalCount / poPageState.pageSize) || 1;

        const getStatusStyles = (s) => {
            switch (s) {
                case 'draft': return 'bg-gray-100 text-gray-600 border-gray-200';
                case 'sent': return 'bg-blue-50 text-blue-600 border-blue-200';
                case 'received': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
                case 'cancelled': return 'bg-red-50 text-red-600 border-red-200';
                default: return 'bg-gray-100 text-gray-600 border-gray-200';
            }
        };

        let html = `
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
            <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('tab_purchase_orders', 'Purchase Orders')}</h3>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-400 font-medium">Page ${poPageState.page} of ${totalPages}</span>
                </div>
            </div>

            <div class="relative mb-3">
                <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                    <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                </div>
                <input type="text" placeholder="${window.t('search_pos', 'Search POs by reference...')}" oninput="filterList('poList', this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
            </div>

            <div class="flex flex-wrap items-center justify-between bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-2 mb-3 gap-2">
                <div class="flex items-center gap-2.5 pl-1.5">
                    <input type="checkbox" id="selectAllSuppliers" onchange="toggleSelectAllSuppliers(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                    <span class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="supplierSelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                </div>
                <div class="flex flex-wrap items-center gap-1.5">
                    <button id="btnBulkDeleteSupplier" disabled onclick="bulkDeleteSelectedSuppliers()" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete')}</span>
                    </button>
                </div>
            </div>

            <div class="space-y-2.5" id="poList">
                ${pagedRecords.length === 0 ? `
                    <div class="py-6 sm:py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                        <i data-lucide="file-text" class="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5"></i>
                        <p class="text-gray-400 text-xs font-medium">${window.t('no_pos_found', 'No purchase orders found')}</p>
                    </div>
                ` : pagedRecords.map(rec => `
                    <div onclick="openEditModal('viewPO', '${rec.id}')" data-search="${(rec.po_number || '').toLowerCase()} ${(rec.supplier_name || '').toLowerCase()}" class="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 flex gap-4 hover:border-indigo-300 hover:shadow-md transition-all group relative cursor-pointer">
                        <div class="pt-1" onclick="event.stopPropagation()">
                            <input type="checkbox" value="${rec.id}" onchange="toggleSupplierSelection('${rec.id}')" class="supplier-checkbox rounded w-5 h-5 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${suppliersSelection.has(rec.id) ? 'checked' : ''}>
                        </div>
                        <div class="flex-1 min-w-0">
                            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
                                <div class="flex items-center gap-3">
                                    <h4 class="font-black text-gray-900 text-sm sm:text-base">${rec.po_number || 'Draft PO'}</h4>
                                    <span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${getStatusStyles(rec.status)}">${rec.status}</span>
                                </div>
                                <div class="text-left sm:text-right">
                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">${window.t('total_po_amount', 'Total Amount')}</p>
                                    <span class="text-base sm:text-lg font-black text-emerald-600">${fmt.currency(rec.total_amount)}</span>
                                </div>
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-50">
                                <div>
                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">${window.t('supplier_name', 'Supplier')}</p>
                                    <p class="text-sm font-bold text-gray-700">${rec.supplier_name || 'Deleted Supplier'}</p>
                                </div>
                                <div class="sm:text-right flex flex-col sm:items-end">
                                    <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">${window.t('expected_date', 'Expected Date')}</p>
                                    <p class="text-sm font-bold text-gray-700">${fmt.date(rec.expected_date) || 'TBD'}</p>
                                </div>
                            </div>
                        </div>
                    </div>`).join('')}
            </div>

            <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                <!-- Pagination Footer -->
                <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${pagedRecords.length}</span> of <span class="font-bold text-gray-900">${poPageState.totalCount}</span></p>
                <div class="flex items-center gap-2">
                    <button onclick="changeSuppliersPage(-1)" ${poPageState.page === 1 ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><i data-lucide="chevron-left" class="w-4 h-4"></i></button>
                    <span class="text-xs font-bold text-gray-600 mx-2">${poPageState.page} / ${totalPages}</span>
                    <button onclick="changeSuppliersPage(1)" ${poPageState.page === totalPages ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><i data-lucide="chevron-right" class="w-4 h-4"></i></button>
                </div>
            </div>
        </div>`;
        area.innerHTML = html;
        lucide.createIcons();
    } catch (err) {
        area.innerHTML = `<div class="py-10 text-center text-red-500">Error: ${err.message}</div>`;
    }
}
