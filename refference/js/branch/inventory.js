
let inventorySelection = new Set();
window.inventorySelection = inventorySelection;
let inventoryPageState = {
    page: 1,
    pageSize: 5,
    totalCount: 0,
    filterLowStock: false
};
window.inventoryPageState = inventoryPageState;

export function changeInventoryPage(delta) {
    const newPage = inventoryPageState.page + delta;
    const maxPage = Math.ceil(inventoryPageState.totalCount / inventoryPageState.pageSize) || 1;
    if (newPage < 1 || newPage > maxPage) return;
    inventoryPageState.page = newPage;
    renderInventoryModule();
};

export function toggleInventorySelection(id) {
    if (inventorySelection.has(id)) {
        inventorySelection.delete(id);
    } else {
        inventorySelection.add(id);
    }
    updateInventoryBulkActionBar();
};

export function toggleSelectAllInventory(checked) {
    const checkboxes = document.querySelectorAll('.inventory-checkbox');
    inventorySelection.clear();
    checkboxes.forEach(cb => {
        cb.checked = checked;
        if (checked) inventorySelection.add(cb.value);
    });
    updateInventoryBulkActionBar();
};

export function updateInventoryBulkActionBar() {
    const count = inventorySelection.size;
    const countSpan = document.getElementById('inventorySelectedCount');
    if (countSpan) countSpan.textContent = `${count} selected`;

    const deleteBtn = document.getElementById('btnBulkDeleteInventory');
    if (deleteBtn) deleteBtn.disabled = count === 0;

    const selectAll = document.getElementById('selectAllInventory');
    const checkboxes = document.querySelectorAll('.inventory-checkbox');
    if (selectAll && checkboxes.length > 0) {
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    }
};

export async function bulkDeleteSelectedInventory() {
    const count = inventorySelection.size;
    if (count === 0) return;
    const confirmed = await window.confirmModal('Confirm Deletion', 'Are you sure you want to delete the selected items?', 'Yes, Delete', 'Cancel');
    if (!confirmed) return;

    try {
        const ids = Array.from(inventorySelection);
        await dbInventory.bulkDelete(ids);
        inventorySelection.clear();
        showToast(`Deleted ${count} items`, 'success');
        renderInventoryModule();
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    }
};

export async function openInventoryTagModal(itemId, isBulk = false) {
    document.querySelectorAll('.tags-modal-overlay').forEach(el => el.remove());
    const title = isBulk ? `Tag ${inventorySelection.size} Items` : 'Manage Product Tags';

    let currentTags = [];
    if (!isBulk && itemId) {
        try {
            const allTags = await dbInventoryTags.fetchAll(state.branchId);
            currentTags = allTags.filter(t => t.inventory_id === itemId);
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
                    <input type="text" id="newInvTagName" placeholder="New tag name..." class="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all">
                    <button id="submitInvTagBtn" class="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors">Add</button>
                </div>

                ${!isBulk ? `
                    <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Current Tags</p>
                    <div class="flex flex-wrap gap-2 mb-6">
                        ${currentTags.length ? currentTags.map(t => `
                            <span class="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold">
                                # ${t.tag}
                                <i data-lucide="x" onclick="removeInvTagModal('${t.id}', '${itemId}')" class="w-3.5 h-3.5 cursor-pointer hover:text-red-600"></i>
                            </span>
                        `).join('') : '<p class="text-xs text-gray-400 italic">No tags yet</p>'}
                    </div>
                ` : ''}

                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Suggestions</p>
                <div class="flex flex-wrap gap-2">
                    ${['Fast Moving', 'Fragile', 'Premium', 'New Out', 'Bulk'].map(t => `
                        <button onclick="quickAddInvTag('${t}', '${itemId}', ${isBulk})" class="px-4 py-2 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 hover:border-indigo-500 hover:text-indigo-500 hover:bg-indigo-50/30 transition-all uppercase tracking-tight">
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
        renderInventoryModule();
    };

    overlay.querySelectorAll('.close-tags-btn').forEach(btn => btn.addEventListener('click', closeTagsModal));

    const submitBtn = overlay.querySelector('#submitInvTagBtn');
    const input = overlay.querySelector('#newInvTagName');

    const handleAdd = async () => {
        const tagName = input.value.trim();
        if (!tagName) return;
        submitBtn.disabled = true;
        try {
            if (isBulk) {
                const ids = Array.from(inventorySelection);
                await Promise.all(ids.map(id => dbInventoryTags.add(state.branchId, id, tagName)));
                inventorySelection.clear();
                showToast(`Tagged ${ids.length} items`, 'success');
                closeTagsModal();
            } else {
                await dbInventoryTags.add(state.branchId, itemId, tagName);
                openInventoryTagModal(itemId, false);
            }
        } catch (err) { showToast('Error adding tag', 'error'); }
        finally { submitBtn.disabled = false; }
    };

    submitBtn.addEventListener('click', handleAdd);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleAdd(); });

    window.removeInvTagModal = async (tagId, itemId) => {
        try {
            await dbInventoryTags.delete(tagId);
            openInventoryTagModal(itemId, false);
        } catch (err) { showToast('Error', 'error'); }
    };

    window.quickAddInvTag = async (tagName, itemId, isBulk) => {
        input.value = tagName;
        handleAdd();
    };
};

export function renderInventoryModule() {
    inventorySelection.clear();
    const container = document.getElementById('mainContent');

    window.importInventoryCSV = function () {
        triggerCSVUpload(async (data) => {
            if (!data || data.length === 0) {
                showToast('CSV is empty or invalid', 'error');
                return;
            }
            const records = data.map(row => {
                const getVal = (...keys) => {
                    for (const k of keys) {
                        const targetKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const foundKey = Object.keys(row).find(rk => rk.toLowerCase().replace(/[^a-z0-9]/g, '') === targetKey);
                        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null && String(row[foundKey]).trim() !== '') {
                            return String(row[foundKey]).trim();
                        }
                    }
                    return null;
                };

                const name = getVal('name', 'itemname', 'productname', 'item_name') || 'Unnamed Item';
                const sku = getVal('sku', 'code', 'barcode', 'sku_code') || '';
                const category = getVal('category', 'cat') || 'General';
                const quantity = fmt.parseNumber(getVal('quantity', 'qty', 'stock') || 0);
                const minThreshold = fmt.parseNumber(getVal('min_threshold', 'minthreshold', 'min', 'lowstockthreshold') || 5);
                const retailPrice = fmt.parseNumber(getVal('retail_price', 'retailprice', 'price', 'sellingprice') || 0);
                const wholesalePrice = fmt.parseNumber(getVal('wholesale_price', 'wholesaleprice', 'wholesale') || retailPrice || 0);
                const costPrice = fmt.parseNumber(getVal('cost_price', 'costprice', 'cost', 'purchaseprice') || 0);
                const unit = getVal('unit', 'uom', 'unitofmeasure') || null;

                return {
                    branch_id: state.branchId,
                    name,
                    sku,
                    category,
                    quantity,
                    min_threshold: minThreshold,
                    price: retailPrice,
                    retail_price: retailPrice,
                    wholesale_price: wholesalePrice,
                    cost_price: costPrice,
                    unit
                };
            }).filter(r => r.name !== 'Unnamed Item');

            if (records.length === 0) {
                showToast('No valid item records found in CSV', 'error');
                return;
            }

            const confirmed = await window.confirmModal(
                'Confirm Stock Import',
                `Import ${records.length} inventory items into current branch stock?`,
                'Yes, Import',
                'Cancel'
            );
            if (!confirmed) return;

            try {
                await dbInventory.bulkAdd(records);
                showToast(`Successfully imported ${records.length} items`, 'success');
                renderInventoryModule();
            } catch (err) {
                showToast('Import failed: ' + err.message, 'error');
            }
        });
    };

    window.downloadInventoryCSVTemplate = function () {
        const headers = [
            'name',
            'sku',
            'category',
            'retail_price',
            'wholesale_price',
            'cost_price',
            'quantity',
            'min_threshold',
            'unit'
        ];

        const instructions = [
            "INSTRUCTIONS: Fill in your inventory details into the main columns on the LEFT.",
            "REQUIRED FIELD: 'name'. All other columns (sku, category, prices, qty...) are optional.",
            "DO NOT DELETE OR MODIFY THE HEADER NAMES OR THIS RIGHT-HAND INSTRUCTION COLUMN.",
            "The system automatically parses your product data on the left and ignores this right column.",
            "COLUMN GUIDE:",
            "• name: Product / Item Name (e.g. Sugar 1kg, Soda 500ml)",
            "• sku: Barcode / SKU / Item Code",
            "• category: Category Name (e.g. Groceries, Beverages)",
            "• retail_price: Retail Selling Price / Bei ya Rejareja (e.g. 1500)",
            "• wholesale_price: Wholesale Selling Price / Bei ya Jumla (e.g. 1200)",
            "• cost_price: Buying Cost Price / Bei ya Kununulia (e.g. 1000)",
            "• quantity: Stock Quantity (e.g. 50)",
            "• min_threshold: Low Stock Alert Level (default: 5)",
            "• unit: Unit of measure (pcs, kg, box, bottle)"
        ];

        const sampleRows = [
            ['Sample Sugar 1kg', 'SKU-1001', 'Groceries', '1500', '1200', '1000', '50', '5', 'pcs'],
            ['Sample Soda 500ml', 'SKU-1002', 'Beverages', '1000', '800', '700', '100', '10', 'bottle']
        ];

        downloadCSVTemplate('inventory_stock_import_template.csv', headers, instructions, sampleRows);
    };

    window.downloadRestockCSVTemplate = async function () {
        try {
            const res = await dbInventory.fetchAll(state.branchId, { pageSize: 1000, lowStockOnly: true });
            const items = res.items || [];
            if (items.length === 0) {
                showToast('No low stock items found to restock.', 'info');
                return;
            }
            const headers = ['id', 'name', 'sku', 'current_quantity', 'added_quantity', 'new_price'];
            const rows = items.map(i => [i.id, i.name, i.sku || '', i.quantity, '0', i.price]);
            const csvContent = [headers, ...rows].map(row => row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", `inventory_restock_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            showToast('Error generating template: ' + err.message, 'error');
        }
    };

    window.importRestockCSV = function () {
        triggerCSVUpload(async (data) => {
            if (!data || data.length === 0) {
                showToast('CSV is empty or invalid', 'error');
                return;
            }
            const updates = [];
            for (const row of data) {
                const getVal = (prefix) => {
                    const key = Object.keys(row).find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === prefix.toLowerCase().replace(/[^a-z0-9]/g, ''));
                    return key ? row[key] : null;
                };
                const id = getVal('id');
                const addedQty = fmt.parseNumber(getVal('added_quantity') || getVal('addedquantity') || 0);
                const currentQty = fmt.parseNumber(getVal('current_quantity') || getVal('currentquantity') || 0);
                const newPrice = fmt.parseNumber(getVal('new_price') || getVal('newprice') || 0);
                if (id && addedQty > 0) {
                    updates.push({ id, quantity: currentQty + addedQty, price: newPrice });
                }
            }
            if (updates.length === 0) {
                showToast('No items to restock (check added_quantity values)', 'warning');
                return;
            }
            const confirmed = await window.confirmModal('Confirm Restock', `Update ${updates.length} items?`, 'Yes, Restock', 'Cancel');
            if (!confirmed) return;
            try {
                await dbInventory.bulkRestock(updates);
                showToast(`Successfully restocked ${updates.length} items`, 'success');
                renderInventoryModule();
            } catch (err) {
                showToast('Restock failed: ' + err.message, 'error');
            }
        });
    };

    let shell = document.getElementById('inventoryShell');
    if (!shell) {
        container.innerHTML = `
        <div class="space-y-4 slide-in" id="inventoryShell">
            <div class="flex flex-nowrap items-center gap-2 sm:gap-3 justify-between">
                <div class="inline-flex items-center gap-2 sm:gap-3 bg-white border border-gray-200 shadow-sm rounded-xl sm:rounded-2xl p-1 sm:p-1.5 pr-3 sm:pr-5 cursor-default hover:shadow-md transition-shadow overflow-hidden">
                    <div class="bg-indigo-50 text-indigo-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[10px] sm:text-sm font-bold uppercase tracking-wider truncate">${window.t('inventory_management', 'Inventory Management')}</div>
                </div>
                <div class="flex gap-1.5 sm:gap-2">
                    <button onclick="openStocktakingModal()" data-tooltip="Generate physical stock count sheets (blind count) or audit discrepancies" data-tooltip-title="Stock Sheets & Audit" data-tooltip-variant="indigo" data-tooltip-position="bottom" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:text-purple-700 dark:hover:text-purple-400 flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 transition-all cursor-pointer">
                        <i data-lucide="clipboard-check" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span class="hidden sm:inline-block">${window.t('stock_sheets_audit', 'Stock Sheets & Audit')}</span><span class="inline-block sm:hidden">${window.t('stock_take', 'Audit')}</span>
                    </button>
                    <button onclick="openModal('importInventoryInfo')" data-tooltip="Bulk import product list or restock adjustments from CSV" data-tooltip-title="Import Spreadsheet" data-tooltip-position="bottom" class="px-2.5 sm:px-4 py-1.5 sm:py-2 bg-white border border-gray-200 rounded-lg text-xs sm:text-sm font-semibold text-gray-700 hover:bg-gray-50 flex-shrink-0 flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer">
                        <i data-lucide="upload" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span>${window.t('import_csv', 'Import CSV')}</span>
                    </button>
                    <button onclick="openModal('addInventoryItem')" data-tooltip="Register new stock item with buying cost and retail selling price" data-tooltip-title="Add New Item" data-tooltip-variant="indigo" data-tooltip-position="bottom" class="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 whitespace-nowrap flex-shrink-0 font-bold flex items-center justify-center gap-1 sm:gap-1.5 cursor-pointer">
                        <i data-lucide="plus" class="w-3.5 h-3.5 sm:w-4 sm:h-4"></i> <span class="hidden sm:inline-block">${window.t('add_item', 'Add Item')}</span><span class="inline-block sm:hidden">${window.t('add_item', 'Add')}</span>
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 md:gap-4" id="inventoryStatsGrid">
                ${[1, 2, 3, 4].map(() => `<div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse h-20"></div>`).join('')}
            </div>

            <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-3.5 sm:p-5 mb-6">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center gap-3">
                        <h3 class="text-sm sm:text-base font-bold text-gray-900 dark:text-white uppercase tracking-wide">${window.t('product_list', 'Product List')}</h3>
                        <div id="invFilterActiveBadge"></div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span id="invPageInfoText" class="text-xs text-gray-400 font-medium">Loading...</span>
                    </div>
                </div>

let invSearchTimer = null;
window.handleInventorySearchInput = function(val) {
    clearTimeout(invSearchTimer);
    invSearchTimer = setTimeout(() => {
        inventoryPageState.search = val;
        inventoryPageState.page = 1;
        refreshInventoryModuleData();
    }, 300);
};

                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-indigo-500"></i>
                    </div>
                    <input type="text" id="inventorySearchInput" placeholder="${window.t('search_products_placeholder', 'Search products...')}" value="${inventoryPageState.search || ''}" oninput="window.handleInventorySearchInput(this.value)" class="w-full pl-11 pr-3.5 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.85rem !important;">
                </div>

                <div class="flex flex-wrap items-center justify-between bg-gray-50/60 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-xl p-2 mb-3 gap-2">
                    <div class="flex items-center gap-2.5 pl-1.5">
                        <input type="checkbox" id="selectAllInventory" onchange="toggleSelectAllInventory(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                        <span class="text-xs sm:text-sm font-semibold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="inventorySelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkDeleteInventory" disabled onclick="bulkDeleteSelectedInventory()" data-tooltip="Permanently delete checked inventory items" data-tooltip-title="Bulk Delete" data-tooltip-variant="rose" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="trash-2" class="w-3.5 h-3.5 text-gray-400"></i> <span class="hidden sm:inline-block">${window.t('delete_selected', 'Delete Selected')}</span>
                        </button>
                        <button id="btnBulkTagInventory" disabled onclick="openInventoryTagModal(null, true)" data-tooltip="Attach organizational tags (e.g. Fast-Selling, Fragile) to selected items" data-tooltip-title="Bulk Tag" data-tooltip-variant="indigo" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xs rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-500"></i> <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <div class="space-y-2.5" id="inventoryList">
                    ${[1, 2, 3].map(() => `<div class="bg-white p-6 rounded-2xl animate-pulse h-24"></div>`).join('')}
                </div>

                <div id="inventoryPaginationFooter"></div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    refreshInventoryModuleData();
    return '';
}

function refreshInventoryModuleData() {
    const listEl = document.getElementById('inventoryList');
    if (listEl) {
        listEl.innerHTML = [1, 2, 3].map(() => `<div class="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 animate-pulse h-20"></div>`).join('');
    }

    Promise.all([
        dbInventory.fetchAll(state.branchId, {
            page: inventoryPageState.page,
            pageSize: inventoryPageState.pageSize,
            lowStockOnly: inventoryPageState.filterLowStock,
            search: inventoryPageState.search || ''
        }),
        dbInventory.fetchLowStockCount(state.branchId),
        dbInventory.fetchTotalValue(state.branchId),
        dbInventoryTags.fetchAll(state.branchId)
    ]).then(([itemsRes, totalLowStock, totalValue, tags]) => {
        const items = itemsRes.items;
        inventoryPageState.totalCount = itemsRes.count;
        const totalPages = Math.ceil(inventoryPageState.totalCount / inventoryPageState.pageSize) || 1;

        const pageInfoText = document.getElementById('invPageInfoText');
        if (pageInfoText) pageInfoText.textContent = `Page ${inventoryPageState.page} of ${totalPages}`;

        const badgeEl = document.getElementById('invFilterActiveBadge');
        if (badgeEl) {
            badgeEl.innerHTML = inventoryPageState.filterLowStock ? `
                <button onclick="inventoryPageState.filterLowStock = false; inventoryPageState.page = 1; renderInventoryModule()"
                        class="bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-red-200 transition-colors shadow-xs">
                    <i data-lucide="filter-x" class="w-3 h-3"></i> Filter Active
                </button>
            ` : '';
        }

        const statsGrid = document.getElementById('inventoryStatsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = `
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_skus', 'Total SKUs')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1 leading-tight">${inventoryPageState.totalCount}</p>
                </div>
                <div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('items_on_page', 'Items on Page')}</p>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white truncate my-1 leading-tight">${items.length}</p>
                </div>
                <div class="relative px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm stat-card min-w-0 flex flex-col justify-between h-full">
                    <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${fmt.getSymbol ? fmt.getSymbol() : 'TSh'}</div>
                    <p class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-tight font-bold whitespace-normal break-words leading-tight">${window.t('total_stock_value', 'Total Stock Value')}</p>
                    <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 truncate my-1 leading-tight" title="${fmt.currency(totalValue)}">${fmt.number(totalValue)}</p>
                </div>
                <div onclick="inventoryPageState.filterLowStock = !inventoryPageState.filterLowStock; inventoryPageState.page = 1; renderInventoryModule()"
                     class="cursor-pointer ${inventoryPageState.filterLowStock ? 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-red-400'} px-4 py-3 rounded-2xl border shadow-sm stat-card min-w-0 flex flex-col justify-between h-full transition-all group">
                    <p class="${inventoryPageState.filterLowStock ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'} text-xs uppercase tracking-tight font-bold whitespace-normal break-words leading-tight flex items-center justify-between">
                        <span>${window.t('total_low_stock', 'Total Low Stock')}</span>
                        <i data-lucide="filter" class="w-3.5 h-3.5 ${inventoryPageState.filterLowStock ? 'text-red-500' : 'text-gray-400 group-hover:text-red-400'}"></i>
                    </p>
                    <p class="text-xl sm:text-2xl font-black ${totalLowStock > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'} truncate my-1">${totalLowStock}</p>
                </div>`;
        }

        if (listEl) {
            listEl.innerHTML = items.length === 0 ? `
                <div class="py-6 sm:py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                    <i data-lucide="package" class="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5"></i>
                    <p class="text-gray-400 text-xs font-medium">No products history found for this page</p>
                </div>
            ` : items.map(item => {
                const isLow = item.quantity <= item.min_threshold;
                return `
                <div onclick="openDetailsModal('inventory', '${item.id}')" data-search="${item.name.toLowerCase()} ${(item.category || '').toLowerCase()} ${(item.sku || '').toLowerCase()}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${isLow ? 'border-l-red-500 dark:border-l-red-400' : 'border-l-indigo-500'} rounded-2xl p-3.5 sm:p-4 hover:shadow-md transition-all group relative cursor-pointer space-y-2">
                    <!-- Top Row: Checkbox, Product Name & Date -->
                    <div class="flex items-center justify-between gap-2.5 min-w-0">
                        <div class="flex items-center gap-2.5 min-w-0 flex-1">
                            <div onclick="event.stopPropagation()" class="shrink-0 flex items-center">
                                <input type="checkbox" value="${item.id}" onchange="toggleInventorySelection('${item.id}')" class="inventory-checkbox rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${inventorySelection.has(item.id) ? 'checked' : ''}>
                            </div>
                            <h4 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base break-words min-w-0 flex-1 leading-snug" style="word-break: break-word; overflow-wrap: anywhere;" title="${item.name.replace(/"/g, '&quot;')}">${item.name}</h4>
                            <span class="text-[11px] text-gray-400 font-semibold shrink-0 hidden sm:inline-block bg-gray-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-md">${item.category || 'General'}</span>
                            ${tags.filter(t => t.inventory_id === item.id).map(t => `<span class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">#${t.tag}</span>`).join('')}
                        </div>
                        <p class="text-[10px] uppercase font-bold text-gray-400 shrink-0 whitespace-nowrap">${fmt.dateTime(item.created_at)}</p>
                    </div>

                    <!-- Middle Row: Stock Count, Out of Stock Badge, and Request Restock Button (Single Line) -->
                    <div class="flex items-center gap-1.5 min-w-0 pt-0.5 flex-nowrap overflow-x-auto no-scrollbar">
                        <div class="flex items-baseline gap-1 shrink-0">
                            <span class="text-sm sm:text-base font-black ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}">${item.quantity}</span>
                            <span class="text-xs text-gray-400 font-medium">units</span>
                            ${isLow ? `<span class="text-[10px] text-gray-400 font-semibold ml-0.5">(min: ${item.min_threshold})</span>` : ''}
                        </div>

                        ${isLow ? `<span class="bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/50 text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 whitespace-nowrap">${item.quantity === 0 ? window.t('out_of_stock', 'Out of Stock') : window.t('low_stock_alert', 'Low Stock')}</span>` : ''}

                        ${isLow ? `
                        <button onclick="event.stopPropagation(); openRestockRequestView('${item.id}')" class="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 rounded-md font-bold shrink-0 whitespace-nowrap active:scale-95 cursor-pointer border-0 leading-normal">
                            ${window.t('request_restock_btn', 'Restock +')}
                        </button>` : ''}
                    </div>

                    <!-- Bottom Row: Price Badges -->
                    <div class="flex items-center gap-1.5 shrink-0 flex-wrap pt-1 border-t border-gray-100/80 dark:border-gray-700/50">
                        <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 shrink-0 whitespace-nowrap" title="Bei ya Jumla / Wholesale">
                            JML: ${fmt.currency(item.wholesale_price ?? item.price ?? 0)}
                        </span>
                        <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 shrink-0 whitespace-nowrap" title="Bei ya Rejareja / Retail">
                            RTL: ${fmt.currency(item.retail_price ?? item.price ?? 0)}
                        </span>
                    </div>
                </div>`;
            }).join('');
        }

        const searchInput = document.getElementById('inventorySearchInput');
        if (searchInput && searchInput.value) {
            filterList('inventoryList', searchInput.value);
        }

        const paginationEl = document.getElementById('inventoryPaginationFooter');
        if (paginationEl) {
            paginationEl.innerHTML = !inventoryPageState.filterLowStock ? `
            <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${items.length}</span> of <span class="font-bold text-gray-900">${inventoryPageState.totalCount}</span> products</p>
                <div class="flex items-center gap-2">
                    <button onclick="changeInventoryPage(-1)" ${inventoryPageState.page === 1 ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    </button>
                    <div class="flex items-center gap-1">
                        ${Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = i + 1;
                return `<button onclick="inventoryPageState.page = ${p}; renderInventoryModule()" class="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${inventoryPageState.page === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'text-gray-500 hover:bg-gray-50'}">${p}</button>`;
            }).join('')}
                    </div>
                    <button onclick="changeInventoryPage(1)" ${inventoryPageState.page === totalPages ? 'disabled' : ''} class="p-2 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        <i data-lucide="chevron-right" class="w-4 h-4"></i>
                    </button>
                </div>
            </div>
            ` : `
            <div class="mt-8 pt-6 border-t border-gray-100">
                <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${items.length}</span> low stock items</p>
            </div>`;
        }

        if (window.lucide) window.lucide.createIcons();
    }).catch(err => {
        console.error('[BranchInventory] Error loading inventory:', err);
        if (listEl) {
            if (typeof window.renderModuleOfflineState === 'function') {
                listEl.innerHTML = window.renderModuleOfflineState({
                    viewId: 'inventory',
                    title: 'Branch Inventory',
                    entityName: 'Inventory & Stock Information',
                    retryAction: 'window.renderInventoryModule()'
                });
                if (window.lucide) window.lucide.createIcons();
            } else {
                listEl.innerHTML = `<div class="py-12 text-center text-gray-500 font-bold">Couldn't load inventory while offline.</div>`;
            }
        }
    });
}
// ─── Restock Request: Full Page View ──────────────────────────────────────────

window.openRestockRequestView = async function (itemId) {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader(window.t('loading', 'Loading item details...'));

    let item = null;
    try {
        item = await dbInventory.fetchOne(itemId);
    } catch (e) {}

    if (!item) {
        showToast('Item not found', 'error');
        renderInventoryModule();
        return;
    }

    const itemName = item.name;
    const currentQty = item.quantity || 0;
    const minThreshold = item.min_threshold || 5;

    // Calculate 7-day sales velocity for this item
    let suggestedQty = minThreshold * 2;
    try {
        const since7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: salesData } = await supabaseClient
            .from('sale_items')
            .select('quantity')
            .eq('inventory_id', itemId)
            .gte('created_at', since7);
        if (salesData && salesData.length > 0) {
            const total7 = salesData.reduce((s, r) => s + Number(r.quantity || 1), 0);
            suggestedQty = Math.max(Math.ceil(total7 * 1.5), minThreshold * 2);
        }
    } catch (e) { /* use fallback */ }

    window._currentRestockItem = { id: itemId, name: itemName, quantity: currentQty, min_threshold: minThreshold, suggested_qty: suggestedQty };

    container.innerHTML = `
    <div class="space-y-5 slide-in">
        <!-- Back Header -->
        <div class="flex items-center gap-3">
            <button onclick="renderInventoryModule()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                <i data-lucide="arrow-left" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
            </button>
            <div>
                <h2 class="text-base font-black text-gray-900 dark:text-white">${window.t('restock_request_title', 'Request Stock Replenishment')}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">${window.t('restock_item', 'Item')}: <span class="font-bold text-gray-700 dark:text-gray-300">${itemName}</span></p>
            </div>
        </div>

        <!-- Stock Status Card -->
        <div class="grid grid-cols-3 gap-3">
            <div class="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl px-4 py-3">
                <p class="text-[10px] font-bold uppercase text-red-600 dark:text-red-400">${window.t('current_stock', 'Current Stock')}</p>
                <p class="text-2xl font-black text-red-700 dark:text-red-300">${currentQty}</p>
                <p class="text-[10px] text-red-500 dark:text-red-400">units</p>
            </div>
            <div class="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl px-4 py-3">
                <p class="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">${window.t('suggested_qty', 'Suggested Qty')}</p>
                <p class="text-2xl font-black text-indigo-700 dark:text-indigo-300">${suggestedQty}</p>
                <p class="text-[10px] text-indigo-500 dark:text-indigo-400">${window.t('based_on_velocity', 'Based on 7-day sales')}</p>
            </div>
            <div class="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl px-4 py-3">
                <p class="text-[10px] font-bold uppercase text-gray-500 dark:text-gray-400">Min Threshold</p>
                <p class="text-2xl font-black text-gray-900 dark:text-white">${minThreshold}</p>
                <p class="text-[10px] text-gray-400">units</p>
            </div>
        </div>

        <!-- Request Form -->
        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('requested_qty', 'Quantity to Request')} *</label>
                <div class="relative">
                    <input type="number" id="restockQtyInput" min="1" value="${suggestedQty}"
                        class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none dark:text-white text-gray-900 transition-all">
                    <span class="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">units</span>
                </div>
            </div>
            <div>
                <label class="block text-xs font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider mb-1.5">${window.t('restock_reason', 'Reason / Notes')} *</label>
                <textarea id="restockReasonInput" rows="3"
                    placeholder="${window.t('restock_reason_placeholder', 'e.g. Running very low, peak season demand...')}"
                    class="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-amber-500 outline-none dark:text-white text-gray-900 resize-none transition-all"></textarea>
            </div>
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-3 pb-6">
            <button onclick="renderInventoryModule()" class="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                ${window.t('cancel', 'Cancel')}
            </button>
            <button onclick="submitRestockRequest()"
                class="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                <i data-lucide="send" class="w-4 h-4"></i>
                ${window.t('request_restock', 'Submit Request')}
            </button>
        </div>
    </div>`;
    lucide.createIcons();
};

window.submitRestockRequest = async function () {
    const itemData = window._currentRestockItem || {};
    const itemId = itemData.id;
    const itemName = itemData.name || 'Item';
    const currentQty = itemData.quantity || 0;
    const suggestedQty = itemData.suggested_qty || 0;

    const requestedQty = parseInt(document.getElementById('restockQtyInput')?.value || '0');
    const reason = document.getElementById('restockReasonInput')?.value?.trim();

    if (!requestedQty || requestedQty <= 0) {
        showToast(window.t('requested_qty', 'Enter a valid quantity'), 'error'); return;
    }
    if (!reason) {
        showToast(window.t('restock_reason', 'Please provide a reason'), 'error'); return;
    }

    try {
        const branch = state.branches?.find(b => b.id === state.branchId);
        const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });

        await supabaseClient.from('requests').insert({
            branch_id: state.branchId,
            owner_id: state.ownerId || state.ownerIdForBranch,
            subject: `${window.t('request_restock', 'Restock Request')}: ${itemName} — ${today}`,
            message: `${window.t('request_restock_btn', 'Restock Request')}: ${itemName}\n${window.t('current_stock', 'Current Stock')}: ${currentQty} units\n${window.t('requested_qty', 'Requested')}: ${requestedQty} units\n\n${window.t('restock_reason', 'Notes')}: ${reason}`,
            type: 'restock_request',
            status: 'pending',
            metadata: {
                inventory_id: itemId,
                item_name: itemName,
                current_qty: currentQty,
                requested_qty: requestedQty,
                suggested_qty: suggestedQty,
                reason
            }
        });

        showToast(window.t('restock_submitted', 'Restock request submitted to owner.'), 'success');
        renderInventoryModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

// ─── F5: Physical Stock Take Page View ────────────────────────────────────────

window.renderStockTakeView = async function () {
    const container = document.getElementById('mainContent');
    container.innerHTML = renderPremiumLoader(window.t('loading', 'Loading inventory for stock take...'));

    let items = [];
    try {
        const { data, error } = await supabaseClient
            .from('inventory')
            .select('id, name, quantity, category, sku')
            .eq('branch_id', state.branchId)
            .order('name');
        if (error) throw error;
        items = data || [];
    } catch (err) {
        container.innerHTML = `<div class="py-20 text-center text-red-500 font-bold">Failed: ${err.message}</div>`;
        return;
    }

    container.innerHTML = `
    <div class="space-y-5 slide-in" id="stockTakeView">
        <div class="flex items-center gap-3">
            <button onclick="renderInventoryModule()" class="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm">
                <i data-lucide="arrow-left" class="w-4 h-4 text-gray-600 dark:text-gray-300"></i>
            </button>
            <div>
                <h2 class="text-base font-black text-gray-900 dark:text-white">${window.t('stock_take_title', 'Physical Stock Count & Variance Audit')}</h2>
                <p class="text-xs text-gray-500 dark:text-gray-400">${window.t('stock_take_sub', 'Enter physical counts. Discrepancies will be reported to the owner.')}</p>
            </div>
        </div>

        <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
            <div class="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <h3 class="font-bold text-gray-900 dark:text-white text-sm">${window.t('items_counted', 'Items')} (${items.length})</h3>
                <div class="relative">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400"></i>
                    <input type="text" placeholder="${window.t('search', 'Filter items...')}"
                        oninput="filterList('stockTakeList', this.value)"
                        class="pl-11 pr-3 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs focus:ring-2 focus:ring-purple-500 outline-none dark:text-white transition-all w-36 sm:w-48" style="padding-left: 2.85rem !important;">
                </div>
            </div>
            <div class="divide-y divide-gray-50 dark:divide-gray-700/50" id="stockTakeList">
                ${items.map(item => `
                <div data-search="${item.name.toLowerCase()} ${(item.category || '').toLowerCase()}" class="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold text-gray-900 dark:text-white truncate">${item.name}</p>
                        <p class="text-[10px] text-gray-400 font-medium">${item.category || 'General'}${item.sku ? ' · ' + item.sku : ''}</p>
                    </div>
                    <div class="flex items-center gap-3 flex-shrink-0">
                        <div class="text-right">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('system_count', 'System')}</p>
                            <p class="font-black text-sm text-indigo-600 dark:text-indigo-400">${item.quantity}</p>
                        </div>
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold uppercase mb-1">${window.t('physical_count', 'Physical')}</p>
                            <input type="number" min="0"
                                id="stk_${item.id}"
                                data-system="${item.quantity}"
                                data-name="${item.name.replace(/"/g, '&quot;')}"
                                oninput="window.updateStockTakeVariance('${item.id}', ${item.quantity})"
                                class="w-20 px-2 py-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-purple-500 outline-none dark:text-white transition-all">
                        </div>
                        <div id="stk_var_${item.id}" class="w-16 text-right">
                            <p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('variance', 'Var.')}</p>
                            <p class="font-black text-sm text-gray-300 dark:text-gray-600">—</p>
                        </div>
                    </div>
                </div>`).join('')}
            </div>
        </div>

        <div class="flex gap-3 pb-6">
            <button onclick="renderInventoryModule()" class="flex-1 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all">
                ${window.t('cancel_stock_take', 'Cancel Stock Take')}
            </button>
            <button onclick="window.submitStockTake()"
                class="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm">
                <i data-lucide="send" class="w-4 h-4"></i>
                ${window.t('submit_stock_take', 'Submit Stock Take Report')}
            </button>
        </div>
    </div>`;
    lucide.createIcons();
};

window.updateStockTakeVariance = function (itemId, systemQty) {
    const input = document.getElementById(`stk_${itemId}`);
    const varEl = document.getElementById(`stk_var_${itemId}`);
    if (!input || !varEl) return;
    const physical = parseInt(input.value || '');
    if (isNaN(physical)) {
        varEl.innerHTML = `<p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('variance', 'Var.')}</p><p class="font-black text-sm text-gray-300 dark:text-gray-600">—</p>`;
        return;
    }
    const variance = physical - systemQty;
    const col = variance === 0 ? 'text-emerald-600 dark:text-emerald-400'
        : variance > 0 ? 'text-blue-600 dark:text-blue-400'
        : 'text-red-600 dark:text-red-400';
    varEl.innerHTML = `<p class="text-[10px] text-gray-400 font-bold uppercase">${window.t('variance', 'Var.')}</p><p class="font-black text-sm ${col}">${variance >= 0 ? '+' : ''}${variance}</p>`;
};

window.submitStockTake = async function () {
    const allInputs = document.querySelectorAll('[id^="stk_"][type="number"]');
    const counted = [];
    let countedAny = false;

    allInputs.forEach(input => {
        const itemId = input.id.replace('stk_', '');
        const systemQty = parseInt(input.dataset.system || '0');
        const physicalStr = input.value;
        if (physicalStr === '' || physicalStr === null) return;
        countedAny = true;
        const physicalQty = parseInt(physicalStr);
        const variance = physicalQty - systemQty;
        counted.push({ id: itemId, name: input.dataset.name || itemId, system_qty: systemQty, physical_qty: physicalQty, variance });
    });

    if (!countedAny) { showToast(window.t('stock_take_sub', 'Enter at least one physical count'), 'error'); return; }

    const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const withVariance = counted.filter(i => i.variance !== 0);

    try {
        await supabaseClient.from('requests').insert({
            branch_id: state.branchId,
            owner_id: state.ownerId || state.ownerIdForBranch,
            subject: `${window.t('stock_take', 'Stock Take Report')} — ${today}`,
            message: `${window.t('items_counted', 'Items Counted')}: ${counted.length}\n${window.t('items_with_variance', 'With Variance')}: ${withVariance.length}\n\n${withVariance.map(i => `${i.name}: system=${i.system_qty} physical=${i.physical_qty} (${i.variance >= 0 ? '+' : ''}${i.variance})`).join('\n')}`,
            type: 'stock_take',
            status: 'pending',
            metadata: { items: counted, total_counted: counted.length, items_with_variance: withVariance.length, date: new Date().toISOString() }
        });
        showToast(window.t('stock_take_submitted', 'Stock take report submitted to owner.'), 'success');
        renderInventoryModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};
