
let inventorySelection = new Set();
window.inventorySelection = inventorySelection;
let inventoryPageState = {
    page: 1,
    pageSize: 5,
    totalCount: 0,
    filterLowStock: false
};
window.inventoryPageState = inventoryPageState;

let invSearchTimer = null;
window.handleInventorySearchInput = function(val) {
    clearTimeout(invSearchTimer);
    invSearchTimer = setTimeout(() => {
        inventoryPageState.search = val;
        inventoryPageState.page = 1;
        refreshInventoryModuleData();
    }, 300);
};

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

    // Check if user was viewing a subview (e.g. product details or restock request) before tab switch / hibernation
    try {
        const savedSubViewRaw = sessionStorage.getItem('bms_branch_active_subview');
        if (savedSubViewRaw) {
            const savedSubView = JSON.parse(savedSubViewRaw);
            if (savedSubView && savedSubView.subview === 'product_details' && savedSubView.itemId) {
                window.openBranchProductDetailsView(savedSubView.itemId);
                return;
            } else if (savedSubView && savedSubView.subview === 'restock_request' && savedSubView.itemId) {
                window.openRestockRequestView(savedSubView.itemId);
                return;
            } else if (savedSubView && savedSubView.subview === 'low_stock_report') {
                window.openLowStockReportView();
                return;
            }
        }
    } catch (e) {}

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
            const instructions = [
                "INSTRUCTIONS: Enter added restock quantity under 'added_quantity'.",
                "Update 'new_price' if selling price has changed.",
                "DO NOT MODIFY the 'id' column."
            ];
            const rows = items.map(i => [i.id, i.name, i.sku || '', i.quantity, '0', i.price]);
            downloadCSVTemplate(`inventory_restock_${new Date().toISOString().split('T')[0]}.csv`, headers, instructions, rows);
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
    const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === state.branchId)) || { name: 'Branch' };

    if (!shell) {
        container.innerHTML = `
        <div class="space-y-4 sm:space-y-5 slide-in" id="inventoryShell">
            <!-- Bento Top Header Strip -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div class="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                    <div class="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400">
                        <i data-lucide="package" class="w-4 h-4 sm:w-6 sm:h-6"></i>
                    </div>
                    <div class="min-w-0 flex-1">
                        <h2 class="text-sm sm:text-lg font-black text-gray-900 dark:text-white tracking-tight truncate">${window.t('inventory_management', 'Inventory & Services')}</h2>
                        <p class="text-[11px] sm:text-xs text-gray-500 dark:text-gray-400 font-medium flex items-center gap-1.5 mt-0.5 truncate">
                            <i data-lucide="calendar" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-gray-400 shrink-0"></i>
                            <span class="truncate">${new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <button type="button" onclick="window.openLowStockReportView()" id="btnHeaderLowStockReport" data-tooltip="Generate and dispatch low stock reorder report" data-tooltip-title="Low Stock Report" data-tooltip-variant="red" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/80 rounded-xl text-[11px] sm:text-xs font-bold text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <i data-lucide="alert-triangle" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-red-500"></i>
                        <span>Low Stock<span class="hidden sm:inline"> Report</span></span>
                        <span id="lowStockHeaderBadge" class="hidden px-1.5 py-0.2 rounded-full text-[9px] font-black bg-red-600 text-white">0</span>
                    </button>
                    <button onclick="openStocktakingModal()" data-tooltip="Generate physical stock count sheets" data-tooltip-title="Stock Audit" class="flex-1 sm:flex-initial px-2.5 sm:px-3 py-1.5 sm:py-2 bg-gray-50 dark:bg-gray-700/60 border border-gray-200 dark:border-gray-700 rounded-xl text-[11px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 hover:text-indigo-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap">
                        <i data-lucide="clipboard-check" class="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-500"></i>
                        <span>${window.t('stock_sheets_audit', 'Stock Audit')}</span>
                    </button>
                    <button onclick="openModal('addInventoryItem')" data-tooltip="Add product or service" data-tooltip-title="New Item" data-tooltip-variant="indigo" class="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-[11px] sm:text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-xs whitespace-nowrap">
                        <i data-lucide="plus" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i>
                        <span>${window.t('add_item', 'Add Item')}</span>
                    </button>
                </div>
            </div>

            <!-- Bento Stats Row with Inline SVG Sparklines -->
            <div class="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5" id="inventoryStatsGrid">
                ${[1, 2, 3, 4].map(() => `<div class="px-4 py-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-16"></div>`).join('')}
            </div>

            <!-- Main Inventory Container -->
            <div class="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
                <div class="flex items-center justify-between mb-3.5">
                    <div class="flex items-center gap-2.5">
                        <h3 class="text-xs sm:text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">${window.t('product_list', 'Product & Service Catalog')}</h3>
                        <div id="invFilterActiveBadge"></div>
                    </div>
                    <span id="invPageInfoText" class="text-xs text-gray-400 font-medium">Loading...</span>
                </div>

                <!-- Instant Search Input -->
                <div class="relative mb-3">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10">
                        <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
                    </div>
                    <input type="text" id="inventorySearchInput" placeholder="${window.t('search_products_placeholder', 'Search items by name, category, or barcode SKU...')}" value="${inventoryPageState.search || ''}" oninput="window.handleInventorySearchInput(this.value)" class="w-full pl-10 pr-3.5 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder-gray-400" style="padding-left: 2.75rem !important;">
                </div>

                <!-- Select All Action Bar -->
                <div class="flex flex-wrap items-center justify-between bg-gray-50/70 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-xl p-2.5 mb-3.5 gap-2">
                    <div class="flex items-center gap-2.5 pl-1">
                        <input type="checkbox" id="selectAllInventory" onchange="toggleSelectAllInventory(this.checked)" class="rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer">
                        <span class="text-xs font-bold text-gray-800 dark:text-gray-200">${window.t('select_all', 'Select All')} <span id="inventorySelectedCount" class="font-normal text-xs text-gray-400 ml-1 hidden sm:inline-block">0 selected</span></span>
                    </div>
                    <div class="flex flex-wrap items-center gap-1.5">
                        <button id="btnBulkTagInventory" disabled onclick="openInventoryTagModal(null, true)" data-tooltip="Attach tags to selected items" data-tooltip-title="Bulk Tag" data-tooltip-variant="indigo" class="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                            <i data-lucide="tag" class="w-3.5 h-3.5 text-indigo-500"></i>
                            <span class="hidden sm:inline-block">${window.t('apply_tag', 'Apply Tag')}</span>
                        </button>
                    </div>
                </div>

                <!-- Products Grid -->
                <div class="space-y-2.5" id="inventoryList">
                    ${[1, 2, 3].map(() => `<div class="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-20"></div>`).join('')}
                </div>

                <div id="inventoryPaginationFooter"></div>
            </div>
        </div>`;
        if (window.lucide) lucide.createIcons();
    }

    refreshInventoryModuleData();
    return '';
}

function _buildInventoryStatsHtml(totalCount, totalLowStock, totalValue, currencySymbol) {
    return `
        <!-- Total Catalog SKUs -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('total_skus', 'Total SKUs')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight">${totalCount}</p>
                <p class="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 truncate">Catalog total</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5 h-3 text-indigo-400 opacity-75" viewBox="0 0 36 24" fill="currentColor">
                <rect x="2" y="8" width="4.5" height="16" rx="1.5"/>
                <rect x="9" y="12" width="4.5" height="12" rx="1.5"/>
                <rect x="16" y="5" width="4.5" height="19" rx="1.5"/>
                <rect x="23" y="9" width="4.5" height="15" rx="1.5"/>
                <rect x="30" y="3" width="4.5" height="21" rx="1.5"/>
            </svg>
        </div>

        <!-- Stock Valuation -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="absolute -top-2.5 right-3.5 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-2xs z-10">${currencySymbol}</div>
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('total_stock_value', 'Stock Value')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-emerald-600 dark:text-emerald-400 truncate leading-tight" title="${window.fmt ? window.fmt.currency(totalValue) : totalValue}">${window.fmt ? window.fmt.number(totalValue) : totalValue}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Valuation</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 16 L10 10 L18 14 L26 6 L38 3" stroke="#10B981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="3" r="2.5" fill="#10B981"/>
            </svg>
        </div>

        <!-- Items on Page -->
        <div class="relative bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 stat-card flex flex-col justify-between h-full min-w-0">
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate block">${window.t('items_on_page', 'Items on Page')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black text-gray-900 dark:text-white truncate leading-tight">${totalCount}</p>
                <p class="text-[10px] text-gray-400 font-semibold mt-0.5 truncate">Total</p>
            </div>
            <svg class="absolute bottom-2 right-2 w-5.5 h-3.5 opacity-75" viewBox="0 0 40 24" fill="none">
                <path d="M2 18 L10 12 L18 16 L26 8 L38 4" stroke="#3B86F7" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="38" cy="4" r="2.5" fill="#3B86F7"/>
            </svg>
        </div>

        <!-- Low Stock Alert / Filter Card -->
        <div onclick="inventoryPageState.filterLowStock = !inventoryPageState.filterLowStock; inventoryPageState.page = 1; renderInventoryModule()"
             class="relative cursor-pointer ${inventoryPageState.filterLowStock ? 'bg-red-50 dark:bg-red-950/40 border-red-500' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-400'} p-3 sm:p-4 rounded-2xl border stat-card flex flex-col justify-between h-full transition-colors group min-w-0">
            <div class="flex items-center justify-between mb-1.5 pr-10">
                <span class="${inventoryPageState.filterLowStock ? 'text-red-700 dark:text-red-300' : 'text-gray-500 dark:text-gray-400'} text-[11px] uppercase tracking-tight font-bold truncate block">${window.t('total_low_stock', 'Low Stock Alert')}</span>
            </div>
            <div class="min-w-0 mt-auto pr-9">
                <p class="text-dynamic-lg font-black ${totalLowStock > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'} truncate leading-tight">${totalLowStock}</p>
                <div class="flex items-center gap-1 mt-0.5">
                    <span class="text-[10px] text-gray-400 font-semibold truncate">Click to filter</span>
                    <span class="text-gray-300 dark:text-gray-600">•</span>
                    <button type="button" onclick="event.stopPropagation(); window.openLowStockReportView()" class="text-[10px] font-bold text-red-600 dark:text-red-400 hover:underline flex items-center gap-0.5 cursor-pointer">
                        <span>Report</span>
                        <i data-lucide="arrow-up-right" class="w-2.5 h-2.5"></i>
                    </button>
                </div>
            </div>
            <div class="absolute bottom-2 right-2 w-5.5 h-5.5 rounded-full ${totalLowStock > 0 ? 'bg-red-50 dark:bg-red-950/60 text-red-600 border border-red-200 dark:border-red-800' : 'bg-gray-50 text-gray-400'} flex items-center justify-center text-[10px] font-black shadow-2xs">
                <i data-lucide="filter" class="w-3 h-3"></i>
            </div>
        </div>
    `;
}

function _buildInventoryItemsHtml(items, tags = []) {
    if (!items || items.length === 0) {
        return `
            <div class="py-6 sm:py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                <i data-lucide="package" class="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5"></i>
                <p class="text-gray-400 text-xs font-medium">No products history found for this page</p>
            </div>
        `;
    }
    return items.map(item => {
        const isService = item.item_type === 'service' || (item.category && String(item.category).toLowerCase().includes('service')) || (item.unit && String(item.unit).toLowerCase() === 'service');
        const isLow = !isService && item.quantity <= item.min_threshold;
        const borderClass = isService ? 'border-l-purple-500' : (isLow ? 'border-l-red-500 dark:border-l-red-400' : 'border-l-indigo-500');

        return `
        <div onclick="openBranchProductDetailsView('${item.id}')" data-search="${(item.name || '').toLowerCase()} ${(item.category || '').toLowerCase()} ${(item.sku || '').toLowerCase()}" class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${borderClass} rounded-2xl p-3.5 sm:p-4 hover:shadow-md transition-all group relative cursor-pointer space-y-2">
            <!-- Top Row: Checkbox, Product Name & Date -->
            <div class="flex items-center justify-between gap-2.5 min-w-0">
                <div class="flex items-center gap-2.5 min-w-0 flex-1">
                    <div onclick="event.stopPropagation()" class="shrink-0 flex items-center">
                        <input type="checkbox" value="${item.id}" onchange="toggleInventorySelection('${item.id}')" class="inventory-checkbox rounded w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500 cursor-pointer" ${inventorySelection.has(item.id) ? 'checked' : ''}>
                    </div>
                    <h4 class="font-bold text-gray-900 dark:text-white text-sm sm:text-base break-words min-w-0 flex-1 leading-snug" style="word-break: break-word; overflow-wrap: anywhere;" title="${(item.name || '').replace(/"/g, '&quot;')}">${item.name || 'Unnamed Item'}</h4>
                    <span class="text-[11px] font-semibold shrink-0 hidden sm:inline-block ${isService ? 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60' : 'text-gray-400 bg-gray-50 dark:bg-gray-700/50'} px-2 py-0.5 rounded-md">
                        ${isService ? '🛠️ Service' : (item.category || 'General')}
                    </span>
                    ${(tags || []).filter(t => t.inventory_id === item.id).map(t => `<span class="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800 text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0">#${t.tag}</span>`).join('')}
                </div>
                <p class="text-[10px] uppercase font-bold text-gray-400 shrink-0 whitespace-nowrap">${fmt.dateTime(item.created_at)}</p>
            </div>

            <!-- Middle Row: Stock Count or Service Indicator -->
            <div class="flex items-center gap-1.5 min-w-0 pt-0.5 flex-nowrap overflow-x-auto no-scrollbar">
                ${isService ? `
                <div class="flex items-center gap-1.5 shrink-0">
                    <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/50">
                        <i data-lucide="wrench" class="w-3.5 h-3.5"></i> Service Offering
                    </span>
                    <span class="text-[11px] text-gray-400 font-medium italic">Unlimited (Always available to bill)</span>
                </div>
                ` : `
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
                `}
            </div>

            <!-- Bottom Row: Price Badges -->
            <div class="flex items-center gap-1.5 shrink-0 flex-wrap pt-1 border-t border-gray-100/80 dark:border-gray-700/50">
                ${isService ? `
                <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-900/50 shrink-0 whitespace-nowrap" title="Direct Service Expenses / Consumable Cost">
                    Service Cost: ${fmt.currency(item.cost_price || 0)}
                </span>
                <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200/60 dark:border-purple-900/50 shrink-0 whitespace-nowrap" title="Service Fee Charged to Customer">
                    Service Price: ${fmt.currency(item.retail_price ?? item.price ?? 0)}
                </span>
                ` : `
                <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50 shrink-0 whitespace-nowrap" title="Bei ya Jumla / Wholesale">
                    JML: ${fmt.currency(item.wholesale_price ?? item.price ?? 0)}
                </span>
                <span class="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50 shrink-0 whitespace-nowrap" title="Bei ya Rejareja / Retail">
                    RTL: ${fmt.currency(item.retail_price ?? item.price ?? 0)}
                </span>
                `}
            </div>
        </div>`;
    }).join('');
}

async function refreshInventoryModuleData() {
    const listEl = document.getElementById('inventoryList');
    const branchId = state.branchId || state.branchProfile?.id;
    if (!branchId) return;

    // Fast-fail safe timeout wrapper ensuring no child query hangs indefinitely
    const safeTimeout = (p, ms, fallback) => Promise.race([
        p,
        new Promise(resolve => setTimeout(() => resolve(fallback), ms))
    ]).catch(() => fallback);

    // 1. FAST PATH: Optimistically load & render local IndexedDB cache in < 5ms
    let localItems = [];
    try {
        if (window.localDb && window.localDb.inventory) {
            localItems = await window.localDb.inventory.where('branch_id').equals(branchId).toArray();
            if (localItems && localItems.length > 0) {
                const lowStockCount = localItems.filter(i => i.item_type !== 'service' && (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0)).length;
                const totalStockVal = localItems.filter(i => i.item_type !== 'service').reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0);
                const currSymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';

                const statsGrid = document.getElementById('inventoryStatsGrid');
                if (statsGrid) statsGrid.innerHTML = _buildInventoryStatsHtml(localItems.length, lowStockCount, totalStockVal, currSymbol);

                if (listEl) listEl.innerHTML = _buildInventoryItemsHtml(localItems.slice(0, inventoryPageState.pageSize), []);
                if (window.lucide) window.lucide.createIcons();
            }
        }
    } catch (e) {
        console.warn('[Inventory] Local optimistic render notice:', e);
    }

    // If local cache is empty, display subtle pulse skeletons during initial fetch
    if ((!localItems || localItems.length === 0) && listEl) {
        listEl.innerHTML = [1, 2, 3].map(() => `<div class="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-200 dark:border-gray-700 animate-pulse h-20"></div>`).join('');
    }

    // 2. Fetch fresh data concurrently with resilient 5s limits
    try {
        const [itemsRes, totalLowStock, totalValue, tags] = await Promise.all([
            safeTimeout(dbInventory.fetchAll(branchId, {
                page: inventoryPageState.page,
                pageSize: inventoryPageState.pageSize,
                lowStockOnly: inventoryPageState.filterLowStock,
                search: inventoryPageState.search || ''
            }), 5000, { items: [], count: 0 }),
            safeTimeout(typeof dbInventory.fetchLowStockCount === 'function' ? dbInventory.fetchLowStockCount(branchId) : Promise.resolve(0), 4000, 0),
            safeTimeout(typeof dbInventory.fetchTotalValue === 'function' ? dbInventory.fetchTotalValue(branchId) : Promise.resolve(0), 4000, 0),
            safeTimeout(dbInventoryTags?.fetchAll ? dbInventoryTags.fetchAll(branchId) : Promise.resolve([]), 3000, [])
        ]);

        const remoteItems = itemsRes?.items || [];
        const remoteCount = itemsRes?.count ?? remoteItems.length;

        // Use remote items if available; otherwise retain local cache
        const finalItems = (remoteItems.length > 0) ? remoteItems : (localItems.length > 0 ? localItems.slice(0, inventoryPageState.pageSize) : []);
        const finalCount = (remoteItems.length > 0) ? remoteCount : (localItems.length > 0 ? localItems.length : 0);

        inventoryPageState.totalCount = finalCount;
        const totalPages = Math.ceil(finalCount / inventoryPageState.pageSize) || 1;
        const currencySymbol = (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh';

        const finalLowStock = totalLowStock || (localItems.length > 0 ? localItems.filter(i => i.item_type !== 'service' && (Number(i.quantity) || 0) <= (Number(i.min_threshold) || 0)).length : 0);
        const finalTotalVal = totalValue || (localItems.length > 0 ? localItems.filter(i => i.item_type !== 'service').reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.price) || 0)), 0) : 0);

        const pageInfoText = document.getElementById('invPageInfoText');
        if (pageInfoText) pageInfoText.textContent = `Page ${inventoryPageState.page} of ${totalPages}`;

        const lowStockBadge = document.getElementById('lowStockHeaderBadge');
        if (lowStockBadge) {
            if (finalLowStock > 0) {
                lowStockBadge.textContent = finalLowStock;
                lowStockBadge.classList.remove('hidden');
            } else {
                lowStockBadge.classList.add('hidden');
            }
        }

        const badgeEl = document.getElementById('invFilterActiveBadge');
        if (badgeEl) {
            badgeEl.innerHTML = inventoryPageState.filterLowStock ? `
                <button onclick="inventoryPageState.filterLowStock = false; inventoryPageState.page = 1; renderInventoryModule()"
                        class="bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 hover:bg-red-100 transition-colors cursor-pointer">
                    <i data-lucide="x" class="w-3 h-3"></i> Filter Active
                </button>
            ` : '';
        }

        const statsGrid = document.getElementById('inventoryStatsGrid');
        if (statsGrid) {
            statsGrid.innerHTML = _buildInventoryStatsHtml(finalCount, finalLowStock, finalTotalVal, currencySymbol);
        }

        if (listEl) {
            listEl.innerHTML = _buildInventoryItemsHtml(finalItems, tags || []);
        }

        const searchInput = document.getElementById('inventorySearchInput');
        if (searchInput && searchInput.value) {
            filterList('inventoryList', searchInput.value);
        }

        const paginationEl = document.getElementById('inventoryPaginationFooter');
        if (paginationEl) {
            paginationEl.innerHTML = !inventoryPageState.filterLowStock ? `
            <div class="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
                <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${finalItems.length}</span> of <span class="font-bold text-gray-900">${inventoryPageState.totalCount}</span> products</p>
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
                <p class="text-xs text-gray-500">Showing <span class="font-bold text-gray-900">${finalItems.length}</span> low stock items</p>
            </div>`;
        }

        if (window.lucide) window.lucide.createIcons();
    } catch (err) {
        console.error('[BranchInventory] Error loading inventory:', err);
        if (listEl) {
            if (localItems && localItems.length > 0) {
                listEl.innerHTML = _buildInventoryItemsHtml(localItems.slice(0, inventoryPageState.pageSize), []);
            } else {
                listEl.innerHTML = `
                    <div class="py-6 sm:py-8 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                        <i data-lucide="package" class="w-7 h-7 text-gray-300 dark:text-gray-600 mx-auto mb-1.5"></i>
                        <p class="text-gray-400 text-xs font-medium">No products history found for this page</p>
                    </div>
                `;
            }
            const statsGrid = document.getElementById('inventoryStatsGrid');
            if (statsGrid) {
                statsGrid.innerHTML = _buildInventoryStatsHtml(localItems.length, 0, 0, (window.fmt && window.fmt.getSymbol) ? window.fmt.getSymbol() : 'TSh');
            }
            if (window.lucide) window.lucide.createIcons();
        }
    }
}

// ─── Branch Product Details: Full Page View ──────────────────────────────────

window.closeBranchProductDetailsView = function () {
    try {
        sessionStorage.removeItem('bms_branch_active_subview');
    } catch (e) {}
    const container = document.getElementById('mainContent');
    if (container) {
        container.classList.remove('!p-0', 'overflow-hidden');
        container.classList.add('overflow-y-auto');
    }
    renderInventoryModule();
};

window.openBranchProductDetailsView = async function (itemId) {
    if (!itemId) return;

    try {
        sessionStorage.setItem('bms_branch_active_subview', JSON.stringify({ subview: 'product_details', itemId }));
    } catch (e) {}

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.add('!p-0', 'overflow-hidden');
    container.classList.remove('overflow-y-auto');
    container.innerHTML = renderPremiumLoader(window.t('loading', 'Loading product details...'));

    let item = null;
    let tags = [];
    let recentSales = [];
    let monthlySoldQty = 0;
    let monthlyRevenue = 0;

    try {
        const [itemData, allTags] = await Promise.all([
            dbInventory.fetchOne(itemId),
            dbInventoryTags.fetchAll(state.branchId).catch(() => [])
        ]);
        item = itemData;
        tags = (allTags || []).filter(t => t.inventory_id === itemId);

        // Fetch recent sales activity for this product from dbSales
        const salesRes = await (window.dbSales ? window.dbSales.fetchAll(state.branchId, { pageSize: 100 }).catch(() => ({ items: [] })) : { items: [] });
        const salesList = Array.isArray(salesRes) ? salesRes : (salesRes.items || []);

        if (salesList && salesList.length > 0) {

            const itemSales = salesList.filter(s => {
                if (s.inventory_id === itemId || s.product_id === itemId) return true;
                if (Array.isArray(s.items)) {
                    return s.items.some(i => (i.id === itemId || i.inventory_id === itemId || i.product_id === itemId || i.productId === itemId));
                }
                if (typeof s.items === 'string') {
                    return s.items.toLowerCase().includes((item.name || '').toLowerCase());
                }
                if (s.item_name) {
                    return s.item_name.toLowerCase().includes((item.name || '').toLowerCase());
                }
                return false;
            });

            recentSales = itemSales.slice(0, 15);
            const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
            const monthlyItems = itemSales.filter(s => (s.created_at || '') >= since30);
            monthlySoldQty = monthlyItems.reduce((acc, s) => {
                let q = Number(s.quantity || s.qty || 1);
                if (Array.isArray(s.items)) {
                    const line = s.items.find(i => (i.id === itemId || i.inventory_id === itemId || i.product_id === itemId || i.productId === itemId));
                    if (line) q = Number(line.quantity || line.qty || 1);
                }
                return acc + q;
            }, 0);
            monthlyRevenue = monthlyItems.reduce((acc, s) => acc + Number(s.amount || 0), 0);
        }
    } catch (err) {
        console.error('[BranchProductDetails] Error loading item:', err);
    }

    if (!item) {
        showToast('Product not found', 'error');
        window.closeBranchProductDetailsView();
        return;
    }

    const isService = item.item_type === 'service' || (item.category && String(item.category).toLowerCase().includes('service')) || (item.unit && String(item.unit).toLowerCase() === 'service');
    const currentQty = Number(item.quantity || 0);
    const minThreshold = Number(item.min_threshold || 5);
    const isLow = !isService && currentQty <= minThreshold;
    const isOut = !isService && currentQty === 0;
    const retailPrice = Number(item.retail_price ?? item.price ?? 0);
    const wholesalePrice = Number(item.wholesale_price ?? item.price ?? 0);
    const costPrice = Number(item.cost_price || 0);
    const stockValuation = !isService ? (currentQty * retailPrice) : 0;
    const profitPerUnit = retailPrice > costPrice && costPrice > 0 ? (retailPrice - costPrice) : 0;
    const marginPct = costPrice > 0 ? Math.round(((retailPrice - costPrice) / retailPrice) * 100) : 0;

    let healthStatusBadge = '';
    if (isService) {
        healthStatusBadge = `<span class="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800"><i data-lucide="wrench" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i> <span class="hidden sm:inline">Service</span></span>`;
    } else if (isOut) {
        healthStatusBadge = `<span class="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 animate-pulse"><i data-lucide="alert-circle" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i> <span class="hidden sm:inline">${window.t('out_of_stock', 'Out of Stock')}</span></span>`;
    } else if (isLow) {
        healthStatusBadge = `<span class="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"><i data-lucide="alert-triangle" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i> <span class="hidden sm:inline">${window.t('low_stock', 'Low Stock')}</span></span>`;
    } else {
        healthStatusBadge = `<span class="inline-flex items-center gap-1 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"><i data-lucide="check-circle" class="w-3 h-3 sm:w-3.5 sm:h-3.5"></i> <span class="hidden sm:inline">${window.t('in_stock', 'Healthy')}</span></span>`;
    }

    container.innerHTML = `
    <div class="page-container w-full h-full bg-white dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
        <!-- TOP NAV / HEADER -->
        <div class="modal-top-nav flex-none p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-between gap-3.5 z-20">
            <div class="flex items-center gap-3 min-w-0">
                <button type="button" onclick="closeBranchProductDetailsView()" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>${window.t('back', 'Back')}</span>
                </button>
                <div class="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold shrink-0">
                    <i data-lucide="package" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0">
                    <h3 class="text-base font-black text-gray-900 dark:text-white truncate">${item.name}</h3>
                    <p class="text-[11px] font-bold text-gray-500 truncate">
                        ${item.category || 'General'} • SKU: <span class="font-mono font-bold text-cyan-600 dark:text-cyan-400">${item.sku || 'N/A'}</span>
                    </p>
                </div>
            </div>
            <div class="shrink-0 flex items-center gap-2">
                ${healthStatusBadge}
            </div>
        </div>

        <!-- MAIN CONTENTS (SCROLLABLE AREA) -->
        <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4">
            <!-- 4-Bento KPI Metrics Row -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <!-- Metric 1: Physical Stock Level -->
                <div class="bg-gray-50/80 dark:bg-gray-800/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate">${window.t('current_stock', 'Current Stock')}</span>
                    </div>
                    <div class="mt-1">
                        <p class="text-lg sm:text-2xl font-black ${isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'} leading-none">${isService ? '∞' : currentQty} <span class="text-[10px] sm:text-xs font-semibold text-gray-400">${isService ? 'Service' : (item.unit || 'units')}</span></p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">${isService ? 'Unlimited' : `Min alert: <strong class="text-gray-600 dark:text-gray-300">${minThreshold}</strong>`}</p>
                    </div>
                </div>

                <!-- Metric 2: Selling Price / Customer Fee -->
                <div class="bg-gray-50/80 dark:bg-gray-800/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate">${isService ? 'Service Price' : window.t('retail_price', 'Retail Price')}</span>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.2 ${isService ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400' : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'} rounded">${isService ? 'Fee' : 'Selling'}</span>
                    </div>
                    <div class="mt-1">
                        <p class="text-sm sm:text-xl font-black ${isService ? 'text-purple-600 dark:text-purple-400' : 'text-emerald-600 dark:text-emerald-400'} leading-none">${fmt.currency(retailPrice)}</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">${isService ? 'Customer charge' : `Val: <strong class="text-gray-700 dark:text-gray-300">${fmt.currency(stockValuation)}</strong>`}</p>
                    </div>
                </div>

                <!-- Metric 3: Service Direct Cost / Wholesale Rate -->
                <div class="bg-gray-50/80 dark:bg-gray-800/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate">${isService ? 'Service Direct Cost' : window.t('wholesale_price', 'Wholesale Rate')}</span>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.2 ${isService ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400'} rounded">${isService ? 'Cost' : 'Bulk'}</span>
                    </div>
                    <div class="mt-1">
                        <p class="text-sm sm:text-xl font-black ${isService ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'} leading-none">${isService ? fmt.currency(costPrice) : fmt.currency(wholesalePrice)}</p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">${costPrice > 0 ? `Net Margin: <strong class="text-emerald-600">+${marginPct}%</strong>` : (isService ? 'Operating expenses' : 'Bulk rate')}</p>
                    </div>
                </div>

                <!-- Metric 4: 30-Day Sales Velocity -->
                <div class="bg-gray-50/80 dark:bg-gray-800/60 p-3.5 sm:p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-[10px] sm:text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight truncate">${window.t('sales_velocity_30d', '30-Day Sales')}</span>
                        <span class="text-[9px] font-black uppercase px-1.5 py-0.2 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded">Velocity</span>
                    </div>
                    <div class="mt-1">
                        <p class="text-lg sm:text-2xl font-black text-blue-600 dark:text-blue-400 leading-none">${monthlySoldQty} <span class="text-[10px] sm:text-xs font-semibold text-gray-400">units</span></p>
                        <p class="text-[10px] sm:text-[11px] text-gray-400 mt-1 truncate">Rev: <strong class="text-gray-700 dark:text-gray-300">${fmt.currency(monthlyRevenue)}</strong></p>
                    </div>
                </div>
            </div>

            <!-- 2-Column Responsive Body Layout -->
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
                <!-- Left Column (5 Cols): Product Profile & Barcode Studio -->
                <div class="lg:col-span-5 space-y-4">
                    <!-- Barcode & Identification Studio -->
                    <div class="bg-white dark:bg-gray-800/90 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs space-y-3.5">
                        <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2.5">
                            <h3 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                <i data-lucide="scan-barcode" class="w-4 h-4 text-cyan-600"></i>
                                <span>${window.t('barcode_sku_studio', 'Barcode & Label Studio')}</span>
                            </h3>
                            <span class="text-[11px] sm:text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400 px-2 py-0.5 bg-cyan-50 dark:bg-cyan-950/50 rounded-md">${item.sku || 'NO SKU'}</span>
                        </div>

                        <!-- Barcode Render Canvas -->
                        <div class="bg-gray-50 dark:bg-gray-900/60 p-3 sm:p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center">
                            <svg id="barcode-details-${item.id}" class="max-w-full h-12 sm:h-16"></svg>
                            <div class="flex flex-wrap items-center justify-center gap-2 mt-2.5 sm:mt-3 w-full">
                                <button type="button" onclick="window.downloadBarcodeImage('${item.sku || ''}', '${(item.name || '').replace(/'/g, "\\'")}')" class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer">
                                    <i data-lucide="download" class="w-3.5 h-3.5"></i>
                                    <span>${window.t('download_png', 'Download PNG')}</span>
                                </button>
                                <button type="button" onclick="window.printBarcodeLabel ? window.printBarcodeLabel('${item.sku || ''}', '${(item.name || '').replace(/'/g, "\\'")}', ${retailPrice}) : window.downloadBarcodeImage('${item.sku || ''}', '${(item.name || '').replace(/'/g, "\\'")}')" class="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-95 cursor-pointer">
                                    <i data-lucide="printer" class="w-3.5 h-3.5"></i>
                                    <span>${window.t('print_label', 'Print Label')}</span>
                                </button>
                            </div>
                        </div>

                        <!-- Technical Specifications Table -->
                        <div class="space-y-1.5 sm:space-y-2 pt-1 text-xs">
                            <div class="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700/60">
                                <span class="text-gray-400 font-medium">Category</span>
                                <span class="font-bold text-gray-800 dark:text-gray-200">${item.category || 'General'}</span>
                            </div>
                            <div class="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700/60">
                                <span class="text-gray-400 font-medium">Type</span>
                                <span class="font-bold text-gray-800 dark:text-gray-200 capitalize">${isService ? 'Service Offering' : 'Physical Inventory'}</span>
                            </div>
                            <div class="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700/60">
                                <span class="text-gray-400 font-medium">Unit of Measure</span>
                                <span class="font-bold text-gray-800 dark:text-gray-200">${item.unit || 'pcs / units'}</span>
                            </div>
                            <div class="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700/60">
                                <span class="text-gray-400 font-medium">Retail Unit Price</span>
                                <span class="font-black text-emerald-600 dark:text-emerald-400">${fmt.currency(retailPrice)}</span>
                            </div>
                            <div class="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700/60">
                                <span class="text-gray-400 font-medium">Wholesale Unit Price</span>
                                <span class="font-bold text-cyan-600 dark:text-cyan-400">${fmt.currency(wholesalePrice)}</span>
                            </div>
                            ${costPrice > 0 ? `
                            <div class="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700/60">
                                <span class="text-gray-400 font-medium">Cost Price</span>
                                <span class="font-bold text-gray-600 dark:text-gray-300">${fmt.currency(costPrice)}</span>
                            </div>` : ''}
                            <div class="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-700/60">
                                <span class="text-gray-400 font-medium">Min Threshold</span>
                                <span class="font-bold text-gray-800 dark:text-gray-200">${minThreshold} units</span>
                            </div>
                            <div class="flex justify-between py-1.5 sm:py-2">
                                <span class="text-gray-400 font-medium">Date Registered</span>
                                <span class="font-bold text-gray-800 dark:text-gray-200">${fmt.dateTime(item.created_at)}</span>
                            </div>
                        </div>

                        <!-- Associated Tags -->
                        <div class="pt-2.5 border-t border-gray-100 dark:border-gray-700">
                            <div class="flex items-center justify-between mb-2">
                                <span class="text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-tight">Assigned Tags</span>
                                <button type="button" onclick="openInventoryTagModal('${item.id}', false)" class="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 hover:underline cursor-pointer">+ Manage Tags</button>
                            </div>
                            <div class="flex flex-wrap gap-1.5">
                                ${tags.length > 0 ? tags.map(t => `<span class="bg-cyan-50 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-300 border border-cyan-100 dark:border-cyan-800 text-xs px-2 py-0.5 rounded-lg font-bold">#${t.tag}</span>`).join('') : '<span class="text-xs text-gray-400 italic">No tags assigned yet.</span>'}
                            </div>
                        </div>
                    </div>

                    <!-- Additional Item Actions Card -->
                    <div class="bg-white dark:bg-gray-800/90 p-4 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs flex items-center justify-between gap-2">
                        <span class="text-xs font-bold text-gray-600 dark:text-gray-300">Catalog Assistance</span>
                        <div class="flex items-center gap-1.5">
                            <button type="button" onclick="openRequestModal('inventory', '${item.id}', 'Item: ${item.name} (SKU: ${item.sku || 'N/A'})')" class="px-3 py-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5" title="Request Attention">
                                <i data-lucide="message-square" class="w-3.5 h-3.5"></i>
                                <span>Message Owner</span>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Right Column (7 Cols): Sales History & Transaction Log -->
                <div class="lg:col-span-7 space-y-4">
                    <div class="bg-white dark:bg-gray-800/90 p-4 sm:p-5 rounded-2xl border border-gray-200/80 dark:border-gray-700/80 shadow-xs">
                        <div class="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2.5 mb-2.5">
                            <div>
                                <h3 class="text-xs sm:text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                    <i data-lucide="history" class="w-4 h-4 text-blue-500"></i>
                                    <span>${window.t('sales_history', 'Recent Sales & Movements')}</span>
                                </h3>
                                <p class="text-[11px] sm:text-xs text-gray-400 mt-0.5">Live transactional records for this item at this branch</p>
                            </div>
                            <span class="text-[11px] sm:text-xs font-bold text-gray-500 dark:text-gray-400">${recentSales.length} records</span>
                        </div>

                        <!-- Sales Table / Timeline -->
                        ${recentSales.length === 0 ? `
                        <div class="py-8 sm:py-12 text-center border-2 border-dashed border-gray-100 dark:border-gray-700 rounded-2xl">
                            <i data-lucide="receipt" class="w-7 h-7 sm:w-8 sm:h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2"></i>
                            <p class="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-300">No Sales Recorded Yet</p>
                            <p class="text-[11px] text-gray-400 mt-1 max-w-xs mx-auto">This product has not been billed in POS yet.</p>
                            <button type="button" onclick="switchView('sales')" class="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 sm:px-4 sm:py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer">
                                <i data-lucide="shopping-cart" class="w-3.5 h-3.5"></i>
                                <span>Open POS Billing</span>
                            </button>
                        </div>
                        ` : `
                        <div class="divide-y divide-gray-100 dark:divide-gray-700/60 max-h-[350px] overflow-y-auto">
                            ${recentSales.map(sale => {
                                let qty = Number(sale.qty || sale.quantity || 1);
                                if (Array.isArray(sale.items)) {
                                    const line = sale.items.find(i => (i.id === itemId || i.inventory_id === itemId || i.product_id === itemId || i.productId === itemId));
                                    if (line) qty = Number(line.quantity || line.qty || 1);
                                }
                                const total = Number(sale.amount || (qty * (retailPrice || 0)));
                                const dateStr = fmt.dateTime(sale.created_at);
                                const customer = sale.customer || sale.customer_name || 'Walk-in Customer';
                                const payMethod = (sale.payment_method || 'cash').toUpperCase();
                                const unitP = qty > 0 ? (total / qty) : retailPrice;

                                return `
                                <div class="py-2.5 sm:py-3 flex items-center justify-between gap-2.5">
                                    <div class="flex items-center gap-2.5 min-w-0">
                                        <div class="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center shrink-0 font-black text-[11px] sm:text-xs">
                                            ${qty}x
                                        </div>
                                        <div class="min-w-0">
                                            <p class="text-xs font-bold text-gray-900 dark:text-white truncate">${customer}</p>
                                            <div class="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-gray-400 mt-0.5">
                                                <span>${dateStr}</span>
                                                <span>•</span>
                                                <span class="font-bold text-gray-600 dark:text-gray-300">${payMethod}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="text-right shrink-0">
                                        <p class="text-xs sm:text-sm font-black text-gray-900 dark:text-white">${fmt.currency(total)}</p>
                                        <p class="text-[9px] sm:text-[10px] text-gray-400">${fmt.currency(unitP)}/ea</p>
                                    </div>
                                </div>`;
                            }).join('')}
                        </div>
                        `}
                    </div>
                </div>
            </div>
        </div>

        <!-- BOTTOM NAV / FOOTER -->
        <div class="modal-bottom-nav flex-none p-4 border-t border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center gap-3 z-20">
            <button type="button" onclick="closeBranchProductDetailsView()" class="px-5 py-2.5 rounded-xl font-bold text-xs bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all border-none cursor-pointer">
                ${window.t('btn_cancel', 'Close')}
            </button>
            ${!isService ? `
            <button type="button" onclick="openRestockRequestView('${item.id}')" class="px-6 py-2.5 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md transition-all cursor-pointer flex items-center gap-1.5">
                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                <span>${window.t('request_restock', 'Request Restock')}</span>
            </button>` : ''}
        </div>
    </div>`;

    if (window.lucide) window.lucide.createIcons();

    // Render Barcode via JsBarcode
    setTimeout(() => {
        if (typeof JsBarcode !== 'undefined' && item.sku) {
            try {
                JsBarcode(`#barcode-details-${item.id}`, item.sku, {
                    format: "CODE128",
                    lineColor: document.documentElement.classList.contains('dark') ? "#f8fafc" : "#0f172a",
                    width: 2,
                    height: 50,
                    displayValue: true,
                    fontSize: 12,
                    font: "Inter, sans-serif",
                    background: "transparent"
                });
            } catch (e) {
                console.warn('[Barcode] Rendering error:', e);
            }
        }
    }, 60);
};

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

    if (item.item_type === 'service' || (item.category && String(item.category).toLowerCase().includes('service')) || (item.unit && String(item.unit).toLowerCase() === 'service')) {
        showToast('Services do not track physical stock replenishment.', 'info');
        renderInventoryModule();
        return;
    }

    const itemName = item.name;
    const currentQty = item.quantity || 0;
    const minThreshold = item.min_threshold || 5;

    // Calculate 7-day sales velocity for this item from sales table
    let suggestedQty = minThreshold * 2;
    try {
        const salesRes = await (window.dbSales ? window.dbSales.fetchAll(state.branchId, { pageSize: 100 }).catch(() => ({ items: [] })) : { items: [] });
        const salesList = Array.isArray(salesRes) ? salesRes : (salesRes.items || []);
        if (salesList && salesList.length > 0) {
            const itemSales = salesList.filter(s => {

                if (s.inventory_id === itemId || s.product_id === itemId) return true;
                if (Array.isArray(s.items)) {
                    return s.items.some(i => (i.id === itemId || i.inventory_id === itemId || i.product_id === itemId || i.productId === itemId));
                }
                if (typeof s.items === 'string') {
                    return s.items.toLowerCase().includes((item.name || '').toLowerCase());
                }
                return false;
            });
            const total7 = itemSales.reduce((sum, s) => {
                let q = Number(s.quantity || s.qty || 1);
                if (Array.isArray(s.items)) {
                    const line = s.items.find(i => (i.id === itemId || i.inventory_id === itemId || i.product_id === itemId || i.productId === itemId));
                    if (line) q = Number(line.quantity || line.qty || 1);
                }
                return sum + q;
            }, 0);
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

        const payload = {
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
        };

        if (window.dbRequests && typeof window.dbRequests.add === 'function') {
            await window.dbRequests.add(payload);
        }

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
        const invRes = await (window.dbInventory ? window.dbInventory.fetchAll(state.branchId, { pageSize: 1000 }).catch(() => ({ items: [] })) : { items: [] });
        items = Array.isArray(invRes) ? invRes : (invRes.items || []);
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
        const payload = {
            branch_id: state.branchId,
            owner_id: state.ownerId || state.ownerIdForBranch,
            subject: `${window.t('stock_take', 'Stock Take Report')} — ${today}`,
            message: `${window.t('items_counted', 'Items Counted')}: ${counted.length}\n${window.t('items_with_variance', 'With Variance')}: ${withVariance.length}\n\n${withVariance.map(i => `${i.name}: system=${i.system_qty} physical=${i.physical_qty} (${i.variance >= 0 ? '+' : ''}${i.variance})`).join('\n')}`,
            type: 'stock_take',
            status: 'pending',
            metadata: { items: counted, total_counted: counted.length, items_with_variance: withVariance.length, date: new Date().toISOString() }
        };

        if (window.dbRequests && typeof window.dbRequests.add === 'function') {
            await window.dbRequests.add(payload);
        }

        showToast(window.t('stock_take_submitted', 'Stock take report submitted to owner.'), 'success');
        renderInventoryModule();
    } catch (err) {
        showToast('Failed: ' + err.message, 'error');
    }
};

window.closeLowStockReportView = function () {
    try {
        sessionStorage.removeItem('bms_branch_active_subview');
    } catch (e) {}
    const container = document.getElementById('mainContent');
    if (container) {
        container.classList.remove('!p-0', 'overflow-hidden');
        container.classList.add('overflow-y-auto');
    }
    renderInventoryModule();
};

window.openLowStockReportView = async function () {
    try {
        sessionStorage.setItem('bms_branch_active_subview', JSON.stringify({ subview: 'low_stock_report' }));
    } catch (e) {}

    const container = document.getElementById('mainContent');
    if (!container) return;

    container.classList.add('!p-0', 'overflow-hidden');
    container.classList.remove('overflow-y-auto');
    container.innerHTML = renderPremiumLoader('Loading Low Stock Report...');

    const branchId = state.branchId || state.branchProfile?.id || (state.branches && state.branches[0]?.id);
    const branch = state.branchProfile || (state.branches && state.branches.find(b => b.id === branchId)) || { name: 'Branch' };

    let allItems = [];
    if (window.localDb?.inventory) {
        allItems = await window.localDb.inventory.where('branch_id').equals(branchId).toArray().catch(() => []);
    }
    if (!allItems || allItems.length === 0) {
        const res = await dbInventory.fetchAll(branchId, { pageSize: 1000 }).catch(() => ({ items: [] }));
        allItems = res.items || [];
    }

    const lowStockItems = (allItems || [])
        .filter(i => {
            const isSvc = i.item_type === 'service' || (i.category && String(i.category).toLowerCase().includes('service')) || (i.unit && String(i.unit).toLowerCase() === 'service');
            if (isSvc) return false;
            const q = Number(i.quantity) || 0;
            const thresh = Number(i.min_threshold) || Number(i.min_stock) || 5;
            return q <= thresh;
        })
        .map(i => {
            const q = Number(i.quantity) || 0;
            const thresh = Number(i.min_threshold) || Number(i.min_stock) || 5;
            const deficit = Math.max(0, thresh - q);
            const costPrice = Number(i.cost_price || i.buying_price || (Number(i.retail_price || i.price || 0) * 0.7));
            const estRestockCost = deficit * costPrice;
            return {
                ...i,
                currentQty: q,
                threshold: thresh,
                deficit,
                costPrice,
                estRestockCost,
                isOutOfStock: q <= 0
            };
        })
        .sort((a, b) => (a.currentQty - b.currentQty) || (b.deficit - a.deficit));

    const totalDepleted = lowStockItems.length;
    const totalOutOfStock = lowStockItems.filter(i => i.isOutOfStock).length;
    const totalDeficitUnits = lowStockItems.reduce((sum, i) => sum + i.deficit, 0);
    const totalRestockInvestment = lowStockItems.reduce((sum, i) => sum + i.estRestockCost, 0);

    window._activeLowStockReportData = {
        branch,
        branchId,
        lowStockItems,
        totalDepleted,
        totalOutOfStock,
        totalDeficitUnits,
        totalRestockInvestment,
        generatedAt: new Date()
    };

    const existingOverlay = document.getElementById('lowStockModalOverlay');
    if (existingOverlay) existingOverlay.remove();

    container.innerHTML = `
    <div class="page-container w-full h-full bg-white dark:bg-gray-900 rounded-none border-0 shadow-none overflow-hidden flex flex-col">
        <!-- Page Top Nav Header -->
        <div class="modal-top-nav flex-none p-3.5 sm:px-6 sm:py-3.5 border-b border-gray-100 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-20 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:justify-between sm:gap-3">
            <div class="flex items-center gap-2.5 sm:gap-3 min-w-0">
                <button type="button" onclick="closeLowStockReportView()" class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-all shadow-xs shrink-0 cursor-pointer border border-gray-200/60 dark:border-gray-700/60">
                    <i data-lucide="chevron-left" class="w-4 h-4"></i>
                    <span>Back</span>
                </button>
                <div class="hidden sm:flex w-9 h-9 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 items-center justify-center shrink-0 border border-red-100 dark:border-red-900/50">
                    <i data-lucide="alert-triangle" class="w-5 h-5"></i>
                </div>
                <div class="min-w-0 flex-1">
                    <h3 class="text-sm sm:text-base font-black text-gray-900 dark:text-white leading-tight truncate">Low Stock & Reorder Report</h3>
                    <div class="flex items-center gap-1.5 text-[10px] sm:text-[11px] text-gray-500 dark:text-gray-400 font-medium truncate mt-0.5">
                        <span class="truncate">${branch.name} · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        <span>•</span>
                        <span class="px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 shrink-0">${totalDepleted} Items</span>
                    </div>
                </div>
            </div>

            <div class="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto sm:ml-auto">
                <button type="button" onclick="window.downloadLowStockPdf()" class="flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap">
                    <i data-lucide="file-text" class="w-3.5 h-3.5 text-red-400"></i>
                    <span><span class="hidden sm:inline-block">Download </span>PDF</span>
                </button>
                <button type="button" onclick="window.downloadLowStockCsv()" class="flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 bg-white dark:bg-gray-800 hover:bg-gray-50 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap">
                    <i data-lucide="sheet" class="w-3.5 h-3.5 text-emerald-500"></i>
                    <span><span class="hidden sm:inline-block">Export </span>CSV</span>
                </button>
                <button type="button" onclick="window.sendLowStockWhatsApp()" class="flex-1 sm:flex-initial px-3 sm:px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer whitespace-nowrap">
                    <i data-lucide="share-2" class="w-3.5 h-3.5"></i>
                    <span>Dispatch & Share</span>
                </button>
            </div>
        </div>

        <!-- Page Scrollable Body -->
        <div class="modal-main-content flex-1 overflow-y-auto min-h-0 p-4 sm:p-6 space-y-4 scroller-custom bg-slate-50/50 dark:bg-gray-900/60">
            <!-- 4 KPI Summary Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Depleted SKUs</span>
                    <p class="text-xl sm:text-2xl font-black text-red-600 dark:text-red-400 mt-0.5 leading-tight">${totalDepleted}</p>
                    <p class="text-[10px] text-gray-400 mt-0.5">At or below safety min</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Out of Stock</span>
                    <p class="text-xl sm:text-2xl font-black text-gray-900 dark:text-white mt-0.5 leading-tight">${totalOutOfStock}</p>
                    <p class="text-[10px] text-red-500 font-semibold mt-0.5">Zero physical units</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Deficit to Restock</span>
                    <p class="text-xl sm:text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5 leading-tight">+${totalDeficitUnits.toLocaleString()}</p>
                    <p class="text-[10px] text-gray-400 mt-0.5">Units required</p>
                </div>
                <div class="bg-white dark:bg-gray-800 p-3.5 sm:p-4 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xs">
                    <span class="text-[10px] font-bold text-gray-400 uppercase tracking-tight block">Est. Restock Capital</span>
                    <p class="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 leading-tight" title="${fmt.currency(totalRestockInvestment)}">${fmt.number(totalRestockInvestment)}</p>
                    <p class="text-[10px] text-gray-400 mt-0.5">Estimated procurement cost</p>
                </div>
            </div>

            <!-- Instant Filter & Search Bar Inside Page -->
            <div class="flex items-center gap-2">
                <div class="relative flex-1">
                    <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <i data-lucide="search" class="w-4 h-4 text-gray-400"></i>
                    </div>
                    <input type="text" id="lowStockModalSearchInput" oninput="window.filterLowStockModalTable(this.value)" placeholder="Search depleted items by name, SKU or category..." class="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all placeholder-gray-400 shadow-2xs" style="padding-left: 2.75rem !important;">
                </div>
                <button type="button" onclick="window.copyLowStockReportText()" data-tooltip="Copy report text summary to clipboard" data-tooltip-title="Copy Summary" class="px-3.5 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/60 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5 shadow-2xs transition-colors shrink-0 cursor-pointer">
                    <i data-lucide="copy" class="w-4 h-4 text-indigo-500"></i>
                    <span class="hidden sm:inline-block">Copy Text</span>
                </button>
            </div>

            <!-- DESKTOP VIEW (sm:block): Full Width, Fit-to-screen table with 0 ScrollX -->
            <div class="hidden sm:block bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-2xs w-full">
                <table class="w-full text-xs text-left table-fixed" id="lowStockItemsTable">
                    <thead class="bg-slate-50 dark:bg-gray-900/60 border-b border-gray-200/80 dark:border-gray-700/60 text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                        <tr>
                            <th class="px-3.5 py-3 w-[32%]">Product & Category</th>
                            <th class="px-2 py-3 text-center w-[10%]">On-Hand</th>
                            <th class="px-2 py-3 text-center w-[10%]">Safety Min</th>
                            <th class="px-2.5 py-3 text-center w-[12%]">Deficit</th>
                            <th class="px-3 py-3 text-right w-[12%]">Cost / Unit</th>
                            <th class="px-3 py-3 text-right w-[14%]">Est. Restock Cost</th>
                            <th class="px-2 py-3 text-center w-[10%]">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-700/60" id="lowStockTableBody">
                        ${lowStockItems.length === 0 ? `
                            <tr>
                                <td colspan="7" class="py-12 text-center text-gray-400 font-medium">
                                    <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                                        <i data-lucide="check" class="w-5 h-5"></i>
                                    </div>
                                    All catalog inventory items are healthy and above minimum safety thresholds.
                                </td>
                            </tr>
                        ` : lowStockItems.map(it => `
                            <tr class="hover:bg-gray-50/70 dark:hover:bg-gray-700/40 transition-colors low-stock-row" data-search="${(it.name || '').toLowerCase()} ${(it.category || '').toLowerCase()} ${(it.sku || '').toLowerCase()}">
                                <td class="px-3.5 py-2.5 font-semibold text-gray-900 dark:text-white min-w-0">
                                    <div class="text-xs sm:text-sm font-bold truncate" title="${it.name || 'Unnamed Product'}">${it.name || 'Unnamed Product'}</div>
                                    <div class="flex items-center gap-1.5 mt-0.5 min-w-0">
                                        <span class="text-[10px] text-gray-400 font-mono truncate">${it.sku || 'No SKU'}</span>
                                        <span class="text-gray-300 dark:text-gray-600">•</span>
                                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 truncate">${it.category || 'General'}</span>
                                    </div>
                                </td>
                                <td class="px-2 py-2.5 text-center font-black ${it.currentQty <= 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'} text-xs sm:text-sm">
                                    ${it.currentQty.toLocaleString()}
                                </td>
                                <td class="px-2 py-2.5 text-center font-bold text-gray-500 dark:text-gray-400">
                                    ${it.threshold.toLocaleString()}
                                </td>
                                <td class="px-2.5 py-2.5 text-center font-black text-red-600 dark:text-red-400 text-xs sm:text-sm">
                                    +${it.deficit.toLocaleString()}
                                </td>
                                <td class="px-3 py-2.5 text-right font-medium text-gray-700 dark:text-gray-300 truncate">
                                    ${fmt.currency(it.costPrice)}
                                </td>
                                <td class="px-3 py-2.5 text-right font-black text-gray-900 dark:text-white text-xs sm:text-sm truncate">
                                    ${fmt.currency(it.estRestockCost)}
                                </td>
                                <td class="px-2 py-2.5 text-center">
                                    <span class="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${it.currentQty <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}">
                                        ${it.currentQty <= 0 ? 'Out of Stock' : 'Low Stock'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    ${lowStockItems.length > 0 ? `
                    <tfoot class="bg-slate-100/90 dark:bg-gray-900 border-t-2 border-gray-200 dark:border-gray-700 font-black text-gray-900 dark:text-white">
                        <tr>
                            <td class="px-3.5 py-3 uppercase tracking-wider text-[11px] text-gray-500 dark:text-gray-400 font-extrabold">Total Deficit</td>
                            <td class="px-2 py-3 text-center text-gray-400 font-normal">—</td>
                            <td class="px-2 py-3 text-center text-gray-400 font-normal">—</td>
                            <td class="px-2.5 py-3 text-center font-black text-red-600 dark:text-red-400 text-xs sm:text-sm">+${totalDeficitUnits.toLocaleString()}</td>
                            <td class="px-3 py-3 text-right text-gray-400 font-normal">—</td>
                            <td class="px-3 py-3 text-right text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 truncate">${fmt.currency(totalRestockInvestment)}</td>
                            <td class="px-2 py-3 text-center text-gray-400 font-normal">—</td>
                        </tr>
                    </tfoot>` : ''}
                </table>
            </div>

            <!-- MOBILE VIEW (sm:hidden): Responsive Cards matching Branch Inventory Mobile Design -->
            <div class="block sm:hidden space-y-2.5" id="lowStockMobileList">
                ${lowStockItems.length === 0 ? `
                    <div class="py-12 text-center text-gray-400 font-medium bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-2xs">
                        <div class="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mx-auto mb-2 flex items-center justify-center border border-emerald-200 dark:border-emerald-800">
                            <i data-lucide="check" class="w-5 h-5"></i>
                        </div>
                        All catalog inventory items are healthy and above minimum safety thresholds.
                    </div>
                ` : lowStockItems.map(it => {
                    const borderClass = it.currentQty <= 0 ? 'border-l-red-500 dark:border-l-red-400' : 'border-l-amber-500 dark:border-l-amber-400';
                    return `
                    <div data-search="${(it.name || '').toLowerCase()} ${(it.category || '').toLowerCase()} ${(it.sku || '').toLowerCase()}" class="low-stock-row bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 border-l-[4px] ${borderClass} rounded-2xl p-3.5 hover:shadow-md transition-all space-y-2.5 shadow-2xs">
                        <!-- Top Row: Product Name, SKU, Category & Status Badge -->
                        <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0 flex-1">
                                <h4 class="font-bold text-gray-900 dark:text-white text-sm leading-snug break-words">${it.name || 'Unnamed Product'}</h4>
                                <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span class="text-[10px] text-gray-400 font-mono">${it.sku || 'No SKU'}</span>
                                    <span class="text-gray-300 dark:text-gray-600">•</span>
                                    <span class="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-gray-700/60 text-slate-700 dark:text-slate-200">${it.category || 'General'}</span>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 ${it.currentQty <= 0 ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800'}">
                                ${it.currentQty <= 0 ? 'Out of Stock' : 'Low Stock'}
                            </span>
                        </div>

                        <!-- Middle Row: Stock Level & Deficit -->
                        <div class="flex items-center justify-between gap-2 pt-0.5">
                            <div class="flex items-baseline gap-1">
                                <span class="text-xs text-gray-500 dark:text-gray-400 font-medium">On-Hand:</span>
                                <span class="text-sm font-black ${it.currentQty <= 0 ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}">${it.currentQty.toLocaleString()}</span>
                                <span class="text-[10px] text-gray-400 font-medium">units</span>
                                <span class="text-[10px] text-gray-400 font-semibold ml-1">(min: ${it.threshold.toLocaleString()})</span>
                            </div>
                            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-black bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 shrink-0">
                                Deficit: +${it.deficit.toLocaleString()}
                            </span>
                        </div>

                        <!-- Bottom Row: Unit Cost & Total Reorder Cost -->
                        <div class="flex items-center justify-between gap-2 pt-2 border-t border-gray-100/80 dark:border-gray-700/50 text-[11px]">
                            <span class="text-gray-500 dark:text-gray-400">
                                Cost: <strong class="text-gray-700 dark:text-gray-200 font-bold">${fmt.currency(it.costPrice)}</strong>
                            </span>
                            <span class="font-black text-emerald-600 dark:text-emerald-400">
                                Reorder: ${fmt.currency(it.estRestockCost)}
                            </span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>

        <!-- Sticky Bottom Footer: .modal-bottom-nav -->
        <div class="modal-bottom-nav flex-none flex items-center justify-center px-4 sm:px-6 py-3.5 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 gap-2.5 z-20">
            <button type="button" onclick="closeLowStockReportView()" class="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">
                Back to Inventory
            </button>
            <button type="button" onclick="window.sendLowStockWhatsApp()" class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer">
                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                <span>Send to Owner</span>
            </button>
        </div>
    </div>`;

    if (window.lucide) lucide.createIcons();
};

window.openLowStockReportModal = window.openLowStockReportView;

window.filterLowStockModalTable = function (query) {
    const q = (query || '').toLowerCase().trim();
    const rows = document.querySelectorAll('.low-stock-row');
    rows.forEach(r => {
        const search = r.getAttribute('data-search') || '';
        if (!q || search.includes(q)) {
            r.classList.remove('hidden');
        } else {
            r.classList.add('hidden');
        }
    });
};

window.downloadLowStockPdf = async function () {
    const branchId = state.branchId || state.branchProfile?.id || (state.branches && state.branches[0]?.id);
    if (window.exportReportPdf) {
        showToast('Generating Low Stock PDF report...', 'info');
        await window.exportReportPdf({ category: 'low_stock', branchId });
    } else {
        showToast('PDF export engine not loaded', 'error');
    }
};

window.downloadLowStockCsv = async function () {
    const branchId = state.branchId || state.branchProfile?.id || (state.branches && state.branches[0]?.id);
    if (window.exportReportCsv) {
        showToast('Exporting Low Stock CSV...', 'info');
        await window.exportReportCsv({ category: 'low_stock', branchId });
    } else {
        showToast('CSV export engine not loaded', 'error');
    }
};

window.generateLowStockReportText = function () {
    const data = window._activeLowStockReportData;
    if (!data) return '';
    const branchName = data.branch?.name || 'Branch';
    const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    let text = `📋 *BMSTZ - LOW STOCK & REORDER REPORT*\n`;
    text += `🏪 *Branch:* ${branchName}\n`;
    text += `📅 *Date:* ${dateStr} at ${timeStr}\n`;
    text += `⚠️ *Depleted SKUs:* ${data.totalDepleted} items\n`;
    text += `🚫 *Out of Stock:* ${data.totalOutOfStock} items\n`;
    text += `📦 *Total Units Needed:* +${data.totalDeficitUnits.toLocaleString()} units\n`;
    text += `💰 *Est. Restock Capital:* ${window.fmt ? window.fmt.currency(data.totalRestockInvestment) : 'TSh ' + data.totalRestockInvestment}\n\n`;
    text += `*ITEMIZED RESTOCK LIST:*\n`;

    data.lowStockItems.slice(0, 30).forEach((it, idx) => {
        const status = it.currentQty <= 0 ? '🔴 OUT OF STOCK' : '🟡 LOW STOCK';
        text += `${idx + 1}. *${it.name}*\n`;
        text += `   • On-Hand: ${it.currentQty} (Min: ${it.threshold})\n`;
        text += `   • Order Deficit: *+${it.deficit} units*\n`;
        text += `   • Est. Cost: ${window.fmt ? window.fmt.currency(it.estRestockCost) : 'TSh ' + it.estRestockCost} (${status})\n`;
    });

    if (data.lowStockItems.length > 30) {
        text += `\n...and ${data.lowStockItems.length - 30} more depleted items.\n`;
    }

    text += `\n_Generated via BMSTZ Enterprise POS_`;
    return text;
};

window.sendLowStockWhatsApp = function () {
    const text = window.generateLowStockReportText();
    if (!text) {
        showToast('No low stock data to share', 'error');
        return;
    }

    if (navigator.share) {
        navigator.share({
            title: 'Low Stock Reorder Report',
            text: text
        }).catch(() => {
            const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
            window.open(url, '_blank');
        });
    } else {
        const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    navigator.clipboard?.writeText(text).then(() => {
        showToast('Report copied to clipboard & share opened!', 'success');
    }).catch(() => {
        showToast('Share opened!', 'info');
    });
};

window.copyLowStockReportText = function () {
    const text = window.generateLowStockReportText();
    if (!text) {
        showToast('No low stock data available', 'error');
        return;
    }
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('Low stock report copied to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
        });
    } else {
        showToast('Clipboard not supported', 'error');
    }
};

